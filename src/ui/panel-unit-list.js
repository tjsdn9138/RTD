import { ownedUnits, deploySlots, MAX_UNIT_LEVEL, getLevelUpCost, levelUpUnit, game, RARITY, UNIT_HP_MAX, UNIT_SPD_MAX } from '../game.js';
import { UNIT_CLASSES } from '../units.js';
import { updateHUD } from './ui.js';

function getMeta(type) {
    return UNIT_CLASSES.find(C => C.name === type)?.meta;
}

const HP_MAX  = UNIT_HP_MAX;
const SPD_MAX = UNIT_SPD_MAX;

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
                <div class="ulist-card-ico" style="background:${m.bg};color:${m.fg};">${m.ico}</div>
                <div class="ulist-card-name">${m.name}</div>
                <div class="ulist-card-lv">Lv.${m.level}</div>
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
    const nextLevel = m.level + 1;
    const nextDef   = 'defense'   in m && nextLevel % 5 === 0
        ? m.defense + m.defPlus
        : null;
    const nextDodge = 'dodgeProb' in m && !isMax && nextLevel % 5 === 0
        ? parseFloat((m.dodgeProb + m.dodgePlus).toFixed(2))
        : null;
    const nextTime  = 'timePlus'  in m && nextLevel % 5 === 0
        ? parseFloat((m.time + m.timePlus).toFixed(2))
        : null;
    const nextDec   = 'decDamage' in m && nextLevel % 5 === 0
        ? m.decDamage + m.decPlus
        : null;
    const nextHeal  = 'heal' in m && nextLevel % 5 === 0
        ? m.heal + m.healPlus
        : null;

    detail.innerHTML = `
        <div class="ulist-detail-header">
            <div class="ulist-detail-ico" style="background:${m.bg};color:${m.fg};">${m.ico}</div>
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
            ${m.passive ? `
            <div class="ulist-passive-wrap">
                <div class="passive-tag">${m.passive}</div>
                <div class="ulist-passive-desc">${typeof m.passiveDesc === 'function'
                        ? nextDef !== null
                            ? m.passiveDesc(m.defense ?? m.time ?? m.dodgeProb ?? 0).replace(
                                String(m.defense),
                                `${m.defense} <span class="ulist-next-val" id="next-def">→ ${nextDef}</span>`
                            )
                            : nextDodge !== null
                                ? m.passiveDesc(m.dodgeProb).replace(
                                    String(m.dodgeProb),
                                    `${m.dodgeProb} <span class="ulist-next-val" id="next-dodge">→ ${nextDodge}</span>`
                                  )
                                : nextTime !== null
                                    ? m.passiveDesc(m.time).replace(
                                        String(m.time),
                                        `${m.time} <span class="ulist-next-val" id="next-time">→ ${nextTime}</span>`
                                      )
                                    : nextDec !== null
                                        ? m.passiveDesc(m.decDamage).replace(
                                            String(m.decDamage),
                                            `${m.decDamage} <span class="ulist-next-val" id="next-dec">→ ${nextDec}</span>`
                                          )
                                        : nextHeal !== null
                                            ? m.passiveDesc(m.heal).replace(
                                                String(m.heal),
                                                `${m.heal} <span class="ulist-next-val" id="next-heal">→ ${nextHeal}</span>`
                                              )
                                            : m.passiveDesc(m.defense ?? m.time ?? m.dodgeProb ?? m.decDamage ?? m.heal ?? 0)
                        : (m.passiveDesc ?? '')
                }</div>
            </div>` : ''}
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
        }
    });
}
