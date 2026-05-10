import { STATE, game, getSlotCost, buySlot, ownedUnits, deploySlots, MAX_SLOTS, UNIT_HP_MAX, UNIT_SPD_MAX } from '../game.js';
import { UNIT_CLASSES } from '../units.js';
import { updateHUD } from './ui.js';
import { saveGame } from '../save.js';

function getMeta(type) {
    return UNIT_CLASSES.find(C => C.name === type)?.meta;
}

const HP_MAX  = UNIT_HP_MAX;
const SPD_MAX = UNIT_SPD_MAX;

function compactSlots() {
  const filled = deploySlots.filter(Boolean);
  deploySlots.fill(null);
  filled.forEach((u, i) => { deploySlots[i] = u; });
}

// 툴팁 요소 — body에 한 번만 생성
let tooltip = null;
function getTooltip() {
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'unit-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

function showPreview(owned, m, anchor) {
    const tip = getTooltip();
    tip.innerHTML = `
        <div class="tooltip-header">
            <div class="preview-ico" style="background:${m.color};"></div>
            <div class="preview-name">${owned.name}</div>
        </div>
        <div class="stat-row">
            <div class="stat-lbl">HP</div>
            <div class="stat-bg"><div class="stat-fill" style="background:#2a8a00;width:${m.hp / HP_MAX * 100}%"></div></div>
        </div>
        <div class="stat-row">
            <div class="stat-lbl">SPD</div>
            <div class="stat-bg"><div class="stat-fill" style="background:#0a2aaa;width:${m.speed / SPD_MAX * 100}%"></div></div>
        </div>
        ${m.passive ? `<div class="passive-tag" style="margin-top:6px;">${m.passive}</div>` : ''}
    `;
    tip.style.display = 'block';

    const rect    = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap     = 8;

    // 기본: 카드 왼쪽에 표시, 공간 부족 시 오른쪽
    let left = rect.left - tipRect.width - gap;
    if (left < gap) left = rect.right + gap;

    // 세로 중앙 정렬, 화면 밖 클램프
    let top = rect.top + (rect.height - tipRect.height) / 2;
    top = Math.max(gap, Math.min(top, window.innerHeight - tipRect.height - gap));

    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
}

function hidePreview() {
    const tip = getTooltip();
    tip.style.display = 'none';
}

function renderDeploySlots() {
  const grid = document.getElementById('deploy-grid');
  if (!grid) return;
  const unlocked = game.unitSlots;
  const isBattle = game.state === STATE.BATTLE;
  grid.innerHTML = '';

  if (isBattle) {
    grid.classList.remove('battle-locked');

    const autoRow = document.getElementById('auto-spawn-row');
    const autoBtn = document.getElementById('auto-spawn-btn');
    if (autoRow && autoBtn) {
      autoRow.style.display = 'flex';
      const allSent = game.units.every(u => u.spawned);
      autoBtn.disabled = allSent;
      autoBtn.classList.toggle('auto-on', game.autoSpawn);
      autoBtn.textContent = game.autoSpawn ? '■  자동 출전 중지' : '▶▶  자동 출전';
      autoBtn.onclick = () => {
        game.autoSpawn = !game.autoSpawn;
        game.spawnTimer = 0;
        renderDeploySlots();
      };
    }
    game.units.forEach((unit, i) => {
      const m = unit.constructor.meta;
      const div = document.createElement('div');
      div.className = 'deploy-slot filled';
      div.dataset.idx = i;

      if (!unit.spawned) {
        div.classList.add('spawn-ready');
        div.innerHTML = `
          <div class="slot-ico" style="background:${m.color};"></div>
          <div class="slot-name">${m.name}</div>
          <div class="slot-spawn-btn">▶ 출전</div>
        `;
        div.addEventListener('mouseenter', () => showPreview({ name: m.name }, m, div));
        div.addEventListener('mouseleave', () => hidePreview());
        div.addEventListener('click', () => {
          document.dispatchEvent(new CustomEvent('spawnunit', { detail: { unit } }));
          renderDeploySlots();
        });
      } else {
        div.classList.add('spawn-sent');
        div.innerHTML = `
          <div class="slot-ico" style="background:${m.color};"></div>
          <div class="slot-name">${m.name}</div>
          <div class="slot-sent-label">출전됨</div>
        `;
      }
      grid.appendChild(div);
    });

    const sentCount = game.units.filter(u => u.spawned).length;
    const label = document.getElementById('deploy-count');
    if (label) label.textContent = `${sentCount} / ${game.units.length} 출전`;
    return;
  }

  grid.classList.remove('battle-locked');
  const autoRow = document.getElementById('auto-spawn-row');
  if (autoRow) autoRow.style.display = 'none';
  for (let i = 0; i < MAX_SLOTS; i++) {
    const div = document.createElement('div');
    div.className = 'deploy-slot';
    div.dataset.idx = i;

    if (i >= unlocked) {
      div.classList.add('empty-slot', 'locked');
      const cost = getSlotCost();
      div.innerHTML = `<div class="slot-lock">LOCK</div><div class="slot-cost">${cost}G</div>`;
      div.addEventListener('click', () => {
        if (buySlot()) { renderDeploySlots(); updateHUD(); saveGame(); }
      });
    }
    else if (deploySlots[i]) {
      const u = deploySlots[i];
      const m = getMeta(u.type);
      div.classList.add('filled');
      div.innerHTML = `
        <div class="slot-ico" style="background:${m.color};"></div>
        <div class="slot-name">${u.name}</div>
        <div class="remove-hint">클릭해서 제거</div>
      `;
      div.addEventListener('mouseenter', () => showPreview(u, m, div));
      div.addEventListener('mouseleave', () => hidePreview());
      div.draggable = true;
      div.addEventListener('click', () => {
        const owned = ownedUnits.find(o => o.type === u.type);
        if (owned) owned.count++;
        deploySlots[i] = null;
        compactSlots();
        renderDeploySlots();
        renderOwnedUnits();
        updateHUD();
        saveGame();
      });
      div.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', i);
        div.classList.add('dragging');
      });
      div.addEventListener('dragend', () => div.classList.remove('dragging'));
    }
    else {
      div.classList.add('empty-slot');
      div.innerHTML = `<div class="slot-add">+</div>`;
    }

    if (i < unlocked) {
      div.addEventListener('dragover', e => { e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
      div.addEventListener('drop', e => {
        e.preventDefault();
        div.classList.remove('drag-over');
        const from = parseInt(e.dataTransfer.getData('text/plain'));
        if (from === i) return;
        [deploySlots[from], deploySlots[i]] = [deploySlots[i], deploySlots[from]];
        compactSlots();
        renderDeploySlots();
        saveGame();
      });
    }

    grid.appendChild(div);
  }

  const count = deploySlots.filter(Boolean).length;
  const label = document.getElementById('deploy-count');
  if (label) label.textContent = `${count} / ${unlocked}`;
}

function renderOwnedUnits() {
  const grid = document.getElementById('owned-grid');
  if (!grid) return;
  const isBattle = game.state === STATE.BATTLE;
  grid.innerHTML = '';
  grid.classList.toggle('battle-locked', isBattle);

  ownedUnits
    .filter(owned => owned.count > 0)
    .forEach(owned => {
      const m = getMeta(owned.type);
      if (!m) return;
      const div = document.createElement('div');
      div.className = 'owned-card';
      div.innerHTML = `
        <div class="owned-ico" style="background:${m.color};"></div>
        <div class="owned-name">${owned.name}</div>
        <div class="owned-count">보유 <span>${owned.count}</span></div>
      `;
      if (!isBattle) {
        div.addEventListener('click', () => {
          const emptyIdx = deploySlots.findIndex((s, i) => s === null && i < game.unitSlots);
          if (emptyIdx === -1) return;
          deploySlots[emptyIdx] = { type: owned.type, name: owned.name };
          owned.count--;
          renderDeploySlots();
          renderOwnedUnits();
          updateHUD();
          saveGame();
        });
      }
      div.addEventListener('mouseenter', () => showPreview(owned, m, div));
      div.addEventListener('mouseleave', () => hidePreview());
      grid.appendChild(div);
    });
}

export function refreshUnitPanel() {
  renderDeploySlots();
  renderOwnedUnits();
}

export function renderUnitPanel(panel) {
  panel.innerHTML = `
    <div class="deploy-area">
      <div class="deploy-header">
        <div class="panel-section-title">출전 유닛</div>
        <span id="deploy-count" class="deploy-count"></span>
      </div>
      <div id="auto-spawn-row" style="display:none;">
        <button id="auto-spawn-btn"></button>
      </div>
      <div class="deploy-grid" id="deploy-grid"></div>
    </div>
    <div class="owned-area">
      <div class="panel-section-title">보유 유닛</div>
      <div class="owned-grid" id="owned-grid"></div>
    </div>
  `;
  renderDeploySlots();
  renderOwnedUnits();
}
