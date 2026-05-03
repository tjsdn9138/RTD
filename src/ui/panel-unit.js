import { STATE, game, getSlotCost, buySlot, ownedUnits, deploySlots, MAX_SLOTS } from '../game.js';
import { UNIT_CLASSES } from '../units.js';
import { updateHUD } from './ui.js';

function getMeta(type) {
    return UNIT_CLASSES.find(C => C.name === type)?.meta;
}

const HP_MAX  = 2000;
const SPD_MAX = 1000;

function compactSlots() {
  const filled = deploySlots.filter(Boolean);
  deploySlots.fill(null);
  filled.forEach((u, i) => { deploySlots[i] = u; });
}

function showPreview(owned, m) {
  const p = document.getElementById('stat-preview');
  if (!p) return;
  p.style.display = 'flex';
  const ico = document.getElementById('prev-ico');
  ico.style.cssText = `background:${m.bg};color:${m.fg};width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-family:'NeoDunggeunmo',monospace;font-size:16px;`;
  ico.textContent = m.ico;
  document.getElementById('prev-name').textContent = owned.name;
  document.getElementById('prev-hp').style.width  = (m.hp    / HP_MAX  * 100) + '%';
  document.getElementById('prev-spd').style.width = (m.speed / SPD_MAX * 100) + '%';
  document.getElementById('prev-passive').innerHTML = m.passive
    ? `<div class="passive-tag">${m.passive}</div>` : '';
}

function hidePreview() {
  const p = document.getElementById('stat-preview');
  if (p) p.style.display = 'none';
}

function renderDeploySlots() {
  const grid = document.getElementById('deploy-grid');
  if (!grid) return;
  const unlocked = game.unitSlots;
  const isBattle = game.state === STATE.BATTLE;
  grid.innerHTML = '';
  grid.classList.toggle('battle-locked', isBattle);

  for (let i = 0; i < MAX_SLOTS; i++) {
    const div = document.createElement('div');
    div.className = 'deploy-slot';
    div.dataset.idx = i;

    if (i >= unlocked) {
      div.classList.add('empty-slot', 'locked');
      const cost = getSlotCost();
      div.innerHTML = `<div class="slot-lock">LOCK</div><div class="slot-cost">${cost}G</div>`;
      if (!isBattle) div.addEventListener('click', () => {
        if (buySlot()) { renderDeploySlots(); updateHUD(); }
      });
    }
    else if (deploySlots[i]) {
      const u = deploySlots[i];
      const m = getMeta(u.type);
      div.classList.add('filled');
      div.innerHTML = `
        <div class="slot-ico" style="background:${m.bg};color:${m.fg};">${m.ico}</div>
        <div class="slot-name">${u.name}</div>
        ${!isBattle ? '<div class="remove-hint">클릭해서 제거</div>' : ''}
      `;
      div.addEventListener('mouseover', () => showPreview(u, m));
      div.addEventListener('mouseout',  () => hidePreview());
      if (!isBattle) {
        div.draggable = true;
        div.addEventListener('click', () => {
          const owned = ownedUnits.find(o => o.type === u.type);
          if (owned) owned.count++;
          deploySlots[i] = null;
          compactSlots();
          renderDeploySlots();
          renderOwnedUnits();
          updateHUD();
        });
        div.addEventListener('dragstart', e => {
          e.dataTransfer.setData('text/plain', i);
          div.classList.add('dragging');
        });
        div.addEventListener('dragend', () => div.classList.remove('dragging'));
      }
    }
    else {
      div.classList.add('empty-slot');
      div.innerHTML = `<div class="slot-add">+</div>`;
    }

    if (i < unlocked && !isBattle) {
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
        <div class="owned-ico" style="background:${m.bg};color:${m.fg};">${m.ico}</div>
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
        });
      }
      div.addEventListener('mouseover', () => showPreview(owned, m));
      div.addEventListener('mouseout',  () => hidePreview());
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
      <div class="deploy-grid" id="deploy-grid"></div>
    </div>
    <div class="owned-area">
      <div class="panel-section-title">보유 유닛</div>
      <div class="owned-grid" id="owned-grid"></div>
      <div class="stat-preview" id="stat-preview" style="display:none;">
        <div class="preview-ico" id="prev-ico"></div>
        <div class="preview-info">
          <div class="preview-name" id="prev-name"></div>
          <div class="stat-row">
            <div class="stat-lbl">HP</div>
            <div class="stat-bg"><div class="stat-fill" id="prev-hp" style="background:#2a8a00;"></div></div>
          </div>
          <div class="stat-row">
            <div class="stat-lbl">SPD</div>
            <div class="stat-bg"><div class="stat-fill" id="prev-spd" style="background:#0a2aaa;"></div></div>
          </div>
          <div id="prev-passive"></div>
        </div>
      </div>
    </div>
  `;
  renderDeploySlots();
  renderOwnedUnits();
}