import { game, RARITY } from '../game.js';
import { TOWER_CLASSES } from '../towers.js';

// TODO: 수치 조정
const DMG_MAX = 2000;
const RNG_MAX = 500;
const SPD_MAX = 5;

let selectedType = null;

export function renderTowerPanel(container) {
    container.innerHTML = '';
    selectedType = null;

    const grid = document.createElement('div');
    grid.className = 'ulist-grid';
    grid.id = 'tower-grid';
    container.appendChild(grid);

    const detail = document.createElement('div');
    detail.className = 'ulist-detail';
    detail.id = 'tower-detail';
    container.appendChild(detail);

    renderGrid(grid, detail);
}

function renderGrid(grid, detail) {
    grid.innerHTML = '';

    TOWER_CLASSES.forEach(Cls => {
        const meta    = Cls.meta;
        const rarity  = RARITY[meta.rarity];
        // 같은 클래스 중 최고 레벨 타워
        const tower   = game.towers
            .filter(t => t instanceof Cls)
            .sort((a, b) => b.level - a.level)[0];
        const isKnown = !!tower;

        const card = document.createElement('div');
        card.className = 'ulist-card' + (isKnown ? '' : ' unknown');
        if (selectedType === Cls.name && isKnown) card.classList.add('selected');

        if (isKnown) {
            card.innerHTML = `
                <div class="ulist-card-ico" style="background:${tower.color};"></div>
                <div class="ulist-card-name">${meta.name}</div>
                <div class="ulist-card-lv" style="color:${rarity?.color ?? '#4a4a4a'};">Lv.${tower.level}</div>
            `;
            card.addEventListener('click', () => {
                selectedType = Cls.name;
                renderGrid(grid, detail);
                renderDetail(detail, tower, grid);
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

function renderDetail(detail, tower, grid) {
    const meta   = tower.constructor.meta;
    const rarity = RARITY[meta.rarity];

    detail.innerHTML = `
        <div class="ulist-detail-header">
            <div class="tower-detail-ico" style="background:${tower.color};"></div>
            <div>
                <div class="ulist-detail-name">${meta.name}</div>
                <div class="ulist-detail-lv" style="color:${rarity?.color ?? '#4a4a4a'};">
                    ${rarity?.name ?? ''} · Lv.${tower.level}
                </div>
            </div>
        </div>

        <div class="ulist-stats">
            <div class="ulist-stat-row">
                <div class="stat-lbl">DMG</div>
                <div class="stat-bg">
                    <div class="stat-fill" style="background:#aa1800;width:${Math.min(tower.damage / DMG_MAX * 100, 100)}%"></div>
                </div>
            </div>
            <div class="ulist-stat-row">
                <div class="stat-lbl">SPD</div>
                <div class="stat-bg">
                    <div class="stat-fill" style="background:#2a8a00;width:${Math.min(tower.attackSpeed / SPD_MAX * 100, 100)}%"></div>
                </div>
            </div>
            <div class="ulist-stat-row">
                <div class="stat-lbl">RNG</div>
                <div class="stat-bg">
                    <div class="stat-fill" style="background:#0a2aaa;width:${Math.min(tower.range / RNG_MAX * 100, 100)}%"></div>
                </div>
            </div>
            ${meta.passive ? `
            <div class="ulist-passive-wrap">
                <div class="passive-tag">${meta.passive}</div>
                <div class="ulist-passive-desc">${
                    typeof meta.passiveDesc === 'function'
                        ? meta.passiveDesc(meta.skyMul)
                        : (meta.passiveDesc ?? '')
                }</div>
            </div>` : ''}
        </div>
    `;
}
