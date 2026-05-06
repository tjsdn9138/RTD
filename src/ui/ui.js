import { STATE, game, startWave, nextWave, retryWave, loseLife, gameWin, deploySlots, ownedUnits, getLevelUpCost, MAX_UNIT_LEVEL, MAX_WAVES } from '../game.js';
import { saveGame, deleteSave } from '../save.js';
import { UNIT_CLASS, UNIT_CLASSES } from '../units.js';
import { renderUnitPanel, refreshUnitPanel as refreshUnitPanelInner } from './panel-unit.js';
import { renderUnitListPanel } from './panel-unit-list.js';
import { renderTowerPanel } from './panel-tower.js';
import { renderBagPanel }  from './panel-bag.js';
import { renderShopPanel } from './panel-shop.js';


const elWaveNum  = document.getElementById('wave-number');
const elPhaseTag = document.getElementById('phase-tag');
const elGoldAmt  = document.getElementById('gold-amount');
const elLifeAmt  = document.getElementById('life-amount');
const elBtnStart = document.getElementById('btn-start');
const elBtnSpeed = document.getElementById('btn-speed');

const SPEEDS = [1, 2, 3];
elBtnSpeed.addEventListener('click', () => {
    const next = SPEEDS[(SPEEDS.indexOf(game.gameSpeed) + 1) % SPEEDS.length];
    game.gameSpeed = next;
    elBtnSpeed.textContent = `${next}×`;
});

function flashHUD(el, color) {
  el.style.color = color;
  el.style.transition = 'color 0.4s';
  setTimeout(() => { el.style.color = ''; }, 400);
}

function floatHUD(el, text, color) {
  const span = document.createElement('span');
  span.className = 'hud-float';
  span.textContent = text;
  span.style.color = color;
  const rect = el.getBoundingClientRect();
  span.style.left = `${rect.left}px`;
  span.style.top  = `${rect.top}px`;
  document.body.appendChild(span);
  span.addEventListener('animationend', () => span.remove());
}

const panels = {
  'unit':      document.getElementById('panel-unit'),
  'unit-list': document.getElementById('panel-unit-list'),
  'tower':     document.getElementById('panel-tower'),
  'bag':       document.getElementById('panel-bag'),
  'shop':      document.getElementById('panel-shop'),
};
const navBtns = document.querySelectorAll('.nav-btn');

// 오른쪽 메뉴 변경 시
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.panel;
    if (!panels[key]) return;
    navBtns.forEach(b => b.classList.remove('active'));
    Object.values(panels).forEach(p => { if (p) p.classList.remove('active'); });
    btn.classList.add('active');
    panels[key].classList.add('active');

    if (key === 'unit')      renderUnitPanel(panels.unit);
    if (key === 'unit-list') renderUnitListPanel(panels['unit-list']);
    if (key === 'tower')     renderTowerPanel(panels['tower']);
    if (key === 'bag')       renderBagPanel(panels.bag);
    if (key === 'shop')      renderShopPanel(panels['shop']);
  });
});

export function updateHUD() {
  elWaveNum.textContent = game.waveNumber;
  elGoldAmt.textContent = game.gold;
  elLifeAmt.textContent = game.lives ?? 3;

  const dot = document.getElementById('unit-lvup-dot');
  if (dot) {
    const canAny = UNIT_CLASSES.some(Cls => {
      const m     = Cls.meta;
      const owned = ownedUnits.find(u => u.type === Cls.name);
      if (!owned || m.level >= MAX_UNIT_LEVEL) return false;
      const cost = getLevelUpCost(m.level);
      return owned.count >= cost.units && game.gold >= cost.gold;
    });
    dot.style.display = canAny ? 'block' : 'none';
  }

  const progBar = document.getElementById('wave-prog-bar');
  if (progBar && progBar.children.length !== MAX_WAVES) {
    progBar.innerHTML = '';
    for (let i = 0; i < MAX_WAVES; i++) {
      const d = document.createElement('div');
      d.className = 'wp';
      progBar.appendChild(d);
    }
  }
  const bars = progBar ? progBar.querySelectorAll('.wp') : [];
  bars.forEach((bar, i) => {
    bar.className = 'wp';
    if (i + 1 < game.waveNumber)        bar.classList.add('done');
    else if (i + 1 === game.waveNumber) bar.classList.add('cur');
    else if ((i + 1) % 5 === 0)         bar.classList.add('boss');
  });

  if (game.state === STATE.READY) {
    elPhaseTag.textContent       = 'READY';
    elPhaseTag.style.color       = '#2a8a00';
    elPhaseTag.style.borderColor = '#2a8a00';
    elBtnStart.textContent       = '▶  WAVE START';
    elBtnStart.disabled          = false;
  }
  else if (game.state === STATE.BATTLE) {
    elPhaseTag.textContent       = 'BATTLE';
    elPhaseTag.style.color       = '#aa1800';
    elPhaseTag.style.borderColor = '#aa1800';
    elBtnStart.disabled          = true;
  }
  else if (game.state === STATE.RESULT) {
    const ok = game.waveResult === 'CLEAR';
    elPhaseTag.textContent       = ok ? 'CLEAR!' : 'FAILED';
    elPhaseTag.style.color       = ok ? '#0a2aaa' : '#aa1800';
    elPhaseTag.style.borderColor = ok ? '#0a2aaa' : '#aa1800';
    elBtnStart.textContent       = ok ? '▶  NEXT WAVE' : '▶  RETRY';
    elBtnStart.disabled          = false;
  }
  else if (game.state === STATE.GAMEOVER) {
    elPhaseTag.textContent       = 'GAME OVER';
    elPhaseTag.style.color       = '#aa1800';
    elPhaseTag.style.borderColor = '#aa1800';
    elBtnStart.textContent       = 'GAME OVER';
    elBtnStart.disabled          = true;
  }
  else if (game.state === STATE.GAMECLEAR) {
    elPhaseTag.textContent       = 'CLEAR!';
    elPhaseTag.style.color       = '#c87800';
    elPhaseTag.style.borderColor = '#c87800';
    elBtnStart.textContent       = 'GAME CLEAR';
    elBtnStart.disabled          = true;
  }
}

export function getDeployedUnits() {
  return deploySlots
    .filter(Boolean)
    .map(slot => new UNIT_CLASS[slot.type]());
}

elBtnStart.addEventListener('click', () => {
  if (game.state === STATE.READY) {
    const units = getDeployedUnits();
    if (units.length === 0) {
      [elBtnStart, document.getElementById('deploy-grid')].forEach(el => {
        el.classList.remove('shake', 'slot-flash');
        void el.offsetWidth; // reflow로 애니메이션 재시작
        el.classList.add(el === elBtnStart ? 'shake' : 'slot-flash');
      });
      return;
    }
    elBtnStart.dispatchEvent(new CustomEvent('wavestart', { detail: { units }, bubbles: true }));
  }
  else if (game.state === STATE.RESULT) {
    if (game.waveResult === 'CLEAR') {
      if (game.waveNumber >= MAX_WAVES) {
        gameWin();
        deleteSave();
        updateHUD();
        refreshUnitPanelInner();
        return;
      }
      const prevGold = game.gold;
      nextWave();
      saveGame();
      document.querySelector('.bag-card.selected')?.classList.remove('selected');
      refreshBagPanel();
      const goldDiff = game.gold - prevGold;
      if (goldDiff > 0) {
        flashHUD(elGoldAmt, '#f59e0b');
        floatHUD(elGoldAmt, `+${goldDiff}G`, '#f59e0b');
      }
      elBtnStart.dispatchEvent(new CustomEvent('nextwavestart', { bubbles: true }));
      refreshUnitPanelInner();
    } else {
      const prevLives = game.lives;
      const prevGold  = game.gold;
      loseLife();
      const goldDiff  = game.gold - prevGold;

      if (game.lives < prevLives) {
        flashHUD(elLifeAmt, '#e74c3c');
        floatHUD(elLifeAmt, '-1', '#e74c3c');
      }
      if (goldDiff > 0) {
        flashHUD(elGoldAmt, '#f59e0b');
        floatHUD(elGoldAmt, `+${goldDiff}G`, '#f59e0b');
      }

      if (game.state === STATE.GAMEOVER) {
        deleteSave();
        showGameOver(game.waveNumber);
      } else {
        retryWave();
        document.querySelector('.bag-card.selected')?.classList.remove('selected');
        refreshBagPanel();
      }
    }
    updateHUD();
    refreshUnitPanelInner();
  }
});

function showGameOver(waveNumber) {
  document.getElementById('gameover-wave-num').textContent = waveNumber;
  document.getElementById('gameover-overlay').style.display = 'flex';
}

document.getElementById('btn-restart').addEventListener('click', () => {
  location.reload();
});

export function refreshUnitPanel() {
  refreshUnitPanelInner();
}

export function refreshBagPanel() {
  if (panels.bag?.classList.contains('active')) renderBagPanel(panels.bag);
}

export function initUI() {
  renderUnitPanel(panels.unit);
  updateHUD();
}

// 단축키
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;

  // Space: 웨이브 시작/다음/재시도
  if (e.code === 'Space') {
    e.preventDefault();
    if (!elBtnStart.disabled) elBtnStart.click();
    return;
  }

  // 위/아래 화살표: 배속 순환
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
    e.preventDefault();
    const dir  = e.code === 'ArrowUp' ? 1 : -1;
    const next = SPEEDS[(SPEEDS.indexOf(game.gameSpeed) + dir + SPEEDS.length) % SPEEDS.length];
    game.gameSpeed = next;
    elBtnSpeed.textContent = `${next}×`;
    return;
  }

  // A: 전투 중 자동 출전 토글
  if (e.code === 'KeyA' && game.state === STATE.BATTLE) {
    game.autoSpawn = !game.autoSpawn;
    game.spawnTimer = 0;
    refreshUnitPanelInner();
    return;
  }

  // 숫자키 1~9, 0: 전투 중 유닛 스폰 (0 = 10번째)
  if (game.state !== STATE.BATTLE) return;
  const digit = e.key === '0' ? 10 : parseInt(e.key);
  if (isNaN(digit) || digit < 1 || digit > 10) return;
  const unit = game.units[digit - 1];
  if (!unit || unit.spawned) return;
  e.preventDefault();
  document.dispatchEvent(new CustomEvent('spawnunit', { detail: { unit } }));
  refreshUnitPanelInner();
});