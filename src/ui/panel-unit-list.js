import { ownedUnits, deploySlots, MAX_UNIT_LEVEL, getLevelUpCost, levelUpUnit, game, RARITY, UNIT_HP_MAX, UNIT_SPD_MAX } from '../game.js';
import { UNIT_CLASSES } from '../units.js';
import { updateHUD } from './ui.js';
import { saveGame } from '../save.js';

function getMeta(type) {
    return UNIT_CLASSES.find(C => C.name === type)?.meta;
}

const HP_MAX  = UNIT_HP_MAX;
const SPD_MAX = UNIT_SPD_MAX;

// 5레벨마다 변하는 패시브 스탯 — 새 유닛/스탯 추가 시 여기에 등록
// key:    meta에서 현재값을 읽을 키
// nextId: 다음값 강조 span의 id
// next:   현재 meta로부터 다음값 계산
const PASSIVE_STAT_KEYS = [
    { key: 'defense',   nextId: 'next-def',      next: m => m.defense   + m.defPlus                                                            },
    { key: 'dodgeProb', nextId: 'next-dodge',    next: m => parseFloat((m.dodgeProb + m.dodgePlus).toFixed(2))                                  },
    { key: 'time',      nextId: 'next-time',     next: m => parseFloat((m.time      + m.timePlus).toFixed(2))                                   },
    { key: 'decDamage', nextId: 'next-dec',      next: m => m.decDamage + m.decPlus                                                            },
    { key: 'heal',      nextId: 'next-heal',     next: m => m.heal      + m.healPlus                                                            },
    { key: 'returnHp',  nextId: 'next-returnhp', next: m => Math.min(100, m.returnHp + m.returnPlus)                                            },
    { key: 'splitNum',  nextId: 'next-splitnum', next: m => m.splitNum  + m.splitPlus                                                          },
    { key: 'dashTime',  nextId: 'next-dashtime', next: m => Math.max(0.1, parseFloat((m.dashTime - m.dashMinus).toFixed(2)))                    },
    { key: 'barrier',   nextId: 'next-barrier',  next: m => m.barrier + m.barPlus                                                                },
    { key: 'maxHpPlus', nextId: 'next-maxhpplus', next: m => m.maxHpPlus + m.maxPlus                                                              },
    { key: 'reduction', nextId: 'next-reduction', next: m => m.reduction + m.reductionPlus                                                         },
    { key: 'ignoreNum', nextId: 'next-ignorenum', next: m => m.ignoreNum + m.ignorePlus                                                            },
    { key: 'stopTime',  nextId: 'next-stoptime',  next: m => parseFloat((m.stopTime - m.stopMinus).toFixed(2))                                     },
];

const STAT_MARKER = '\x01STAT\x01';

// 단일 패시브 desc 렌더 — 5레벨 분기에서 다음값 강조 span 삽입
function renderPassiveDesc(m, isMax) {
    const desc = m.passiveDesc;
    if (typeof desc !== 'function') return desc ?? '';

    const stat = PASSIVE_STAT_KEYS.find(s => s.key in m);
    const cur  = stat ? m[stat.key] : 0;

    const willLevelUp = stat && !isMax && (m.level + 1) % 5 === 0;
    if (!willLevelUp) return desc(cur);

    const next = stat.next(m);
    return desc(STAT_MARKER).replace(
        STAT_MARKER,
        `${cur} <span class="ulist-next-val" id="${stat.nextId}">→ ${next}</span>`
    );
}

let selectedType = null;

export function renderUnitListPanel(container) {
    container.innerHTML = '';
    selectedType = null;

    const grid = document.createElement('div');
    grid.className = 'ulist-grid';
    grid.id = 'ulist-grid';
    container.appendChild(grid);

    const detail = document.createElement('div');
    detail.className = 'ulist-detail';
    detail.id = 'ulist-detail';
    container.appendChild(detail);

    renderGrid(grid, detail);
}

function renderGrid(grid, detail) {
    grid.innerHTML = '';

    UNIT_CLASSES.forEach(Cls => {
        const m     = Cls.meta;
        const owned = ownedUnits.find(u => u.type === Cls.name);
        const isKnown = owned && (owned.count > 0 || m.level > 1 || deploySlots.some(s => s?.type === Cls.name));

        const card = document.createElement('div');
        card.className = 'ulist-card' + (isKnown ? '' : ' unknown');
        if (selectedType === Cls.name && isKnown) card.classList.add('selected');

        if (isKnown) {
            const cost       = getLevelUpCost(m.level);
            const canLevelUp = m.level < MAX_UNIT_LEVEL && owned.count >= cost.units && game.gold >= cost.gold;
            card.innerHTML = `
                <div class="ulist-card-ico" style="background:${m.color};"></div>
                <div class="ulist-card-name">${m.name}</div>
                <div class="ulist-card-lv" style="color:${RARITY[m.rarity]?.color ?? '#4a4a4a'};">Lv.${m.level}</div>
                ${canLevelUp ? '<div class="ulist-card-lvup-badge"></div>' : ''}
            `;
            card.addEventListener('click', () => {
                selectedType = Cls.name;
                renderGrid(grid, detail);
                renderDetail(detail, owned, grid);
            });
        } else {
            card.innerHTML = `
                <div class="ulist-card-ico">?</div>
                <div class="ulist-card-name">???</div>
            `;
        }

        grid.appendChild(card);
    });
}

function renderDetail(detail, owned, grid) {
    const m = getMeta(owned.type);
    if (!m) return;

    const isMax    = m.level >= MAX_UNIT_LEVEL;
    const cost     = getLevelUpCost(m.level);
    const canUnit  = owned.count >= cost.units;
    const canGold  = game.gold >= cost.gold;
    const canLevelUp = canUnit && canGold;
    const fillPct  = Math.min(owned.count / cost.units, 1) * 100;

    const nextHp    = Math.floor(m.hp    + m.hpPlus);
    const nextSpeed = Math.floor(m.speed + m.speedPlus);

    detail.innerHTML = `
        <div class="ulist-detail-header">
            <div class="ulist-detail-ico" style="background:${m.color};"></div>
            <div>
                <div class="ulist-detail-name">${owned.name}</div>
                <div class="ulist-detail-lv" style="color:${RARITY[m.rarity]?.color ?? '#4a4a4a'};">
                    ${RARITY[m.rarity]?.name ?? ''} · Lv.${m.level} ${isMax ? '<span class="ulist-max">MAX</span>' : ''}
                </div>
            </div>
        </div>

        <div class="ulist-stats">
            <div class="ulist-stat-row">
                <div class="stat-lbl">HP</div>
                <div class="stat-bg">
                    <div class="stat-fill" style="background:#2a8a00;width:${(m.hp/HP_MAX)*100}%"></div>
                    ${!isMax ? `<div class="stat-fill-next" id="next-hp" style="width:${(nextHp/HP_MAX)*100}%"></div>` : ''}
                </div>
                <div class="ulist-stat-val">${m.hp}${!isMax ? ` <span class="ulist-next-val">→ ${nextHp}</span>` : ''}</div>
            </div>
            <div class="ulist-stat-row">
                <div class="stat-lbl">SPD</div>
                <div class="stat-bg">
                    <div class="stat-fill" style="background:#0a2aaa;width:${(m.speed/SPD_MAX)*100}%"></div>
                    ${!isMax ? `<div class="stat-fill-next" id="next-spd" style="width:${(nextSpeed/SPD_MAX)*100}%"></div>` : ''}
                </div>
                <div class="ulist-stat-val">${m.speed}${!isMax ? ` <span class="ulist-next-val">→ ${nextSpeed}</span>` : ''}</div>
            </div>
            ${m.passive ? (Array.isArray(m.passive)
                ? m.passive.map((p, i) => {
                    const d = Array.isArray(m.passiveDesc) ? m.passiveDesc[i] : m.passiveDesc;
                    const _stat = PASSIVE_STAT_KEYS.find(s => s.key in m);
                    const resolved = typeof d === 'function' ? d(_stat ? m[_stat.key] : 0) : (d ?? '');
                    return `<div class="ulist-passive-wrap">
                        <div class="passive-tag">${p}</div>
                        <div class="ulist-passive-desc">${resolved}</div>
                    </div>`;
                }).join('')
                : `<div class="ulist-passive-wrap">
                    <div class="passive-tag">${m.passive}</div>
                    <div class="ulist-passive-desc">${renderPassiveDesc(m, isMax)}</div>
                </div>`) : ''}
        </div>

        ${!isMax ? `
        <div class="ulist-levelup">
            <div class="ulist-cost-title">레벨업 비용</div>
            <div class="ulist-cost-row">
                <div class="ulist-unit-progress ${canUnit ? 'full' : ''}">
                    <div class="ulist-unit-fill" style="width:${fillPct}%"></div>
                    <span class="ulist-unit-text">유닛 ${owned.count} / ${cost.units} (${Math.floor(fillPct)}%)</span>
                </div>
                <button class="ulist-btn-gold ${canLevelUp ? '' : 'disabled'}" id="btn-lvup">
                    🪙 ${cost.gold}
                </button>
            </div>
        </div>` : `
        <div class="ulist-max-msg">최대 레벨 달성!</div>
        `}
    `;

    const btnLvUp   = detail.querySelector('#btn-lvup');
    const nextHpEl  = detail.querySelector('#next-hp');
    const nextSpdEl = detail.querySelector('#next-spd');

    function startBlink() {
        [nextHpEl, nextSpdEl].forEach(el => { if (el) el.classList.add('blinking'); });
        detail.querySelectorAll('.ulist-next-val').forEach(el => el.classList.add('blinking'));
    }
    function stopBlink() {
        [nextHpEl, nextSpdEl].forEach(el => { if (el) el.classList.remove('blinking'); });
        detail.querySelectorAll('.ulist-next-val').forEach(el => el.classList.remove('blinking'));
    }

    btnLvUp?.addEventListener('mouseenter', startBlink);
    btnLvUp?.addEventListener('mouseleave', stopBlink);
    btnLvUp?.addEventListener('click', () => {
        if (!canLevelUp) return;
        if (levelUpUnit(owned.type)) {
            updateHUD();
            renderGrid(grid, detail);
            renderDetail(detail, owned, grid);
            saveGame();
        }
    });
}
