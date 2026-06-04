import { inventory, game, getLevelUpCost, RARITY } from '../game.js';
import { ITEM_CLASS } from '../items.js';
import { openTutorial } from './tutorial.js';
import { saveGame } from '../save.js';

// 가방 패널 랜더링
export function renderBagPanel(container) {
    container.innerHTML = '';

    const passiveItems = inventory.filter(i => i.kind === 'passive');
    const activeItems  = inventory.filter(i => i.kind === 'active');

    container.appendChild(makeSection('보유 아이템', passiveItems));
    container.appendChild(makeSection('소비 아이템', activeItems));
}

// 아이템 보유 / 미보유 섹션 만들기
function makeSection(title, items) {
    const section = document.createElement('div');
    section.className = 'bag-section';

    const h = document.createElement('h3');
    h.className = 'bag-section-title';
    h.textContent = title;
    section.appendChild(h);

    const owned = items.filter(i => i.kind === 'passive' ? (i.owned || i.count > 0) : i.count > 0);

    // 보유한 아이템이 없는 경우
    if (owned.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'bag-empty';
        empty.textContent = '보유 중인 아이템이 없습니다';
        section.appendChild(empty);
        return section;
    }

    const grid = document.createElement('div');
    grid.className = 'bag-grid';
    owned.forEach(itemData => grid.appendChild(makeCard(itemData)));
    section.appendChild(grid);

    return section;
}

// 아이템의 카드 만들기
function makeCard(itemData) {
    const isOff = itemData.kind === 'passive' && !itemData.enabled;
    const card = document.createElement('div');
    card.className = 'bag-card' + (itemData.count === 0 ? ' empty' : '') + (isOff ? ' off' : '');

    const Cls    = ITEM_CLASS[itemData.type];
    const meta   = Cls.meta;
    const rarity = RARITY[meta?.rarity];

    const rarityEl = document.createElement('div');
    rarityEl.className = 'bag-card-rarity';
    rarityEl.textContent = rarity?.name ?? '';
    rarityEl.style.color = rarity?.color ?? '#4a4a4a';
    card.appendChild(rarityEl);

    // 아이템 이름
    const name = document.createElement('div');
    name.className = 'bag-card-name';
    name.textContent = itemData.name;

    card.appendChild(name);

    if (itemData.kind === 'passive') {
        const required = getLevelUpCost(meta?.level ?? 1).units;

        const levelRow = document.createElement('div');
        levelRow.className = 'bag-card-level-row';

        const lv = document.createElement('span');
        lv.className = 'bag-card-level';
        lv.textContent = `Lv.${meta?.level ?? 1}`;
        lv.style.color = rarity?.color ?? '#4a4a4a';

        const prog = document.createElement('span');
        prog.className = 'bag-card-progress';
        prog.textContent = `${itemData.count}/${required}`;

        levelRow.appendChild(lv);
        levelRow.appendChild(prog);
        card.appendChild(levelRow);

        card.addEventListener('click', () => {
            itemData.enabled = !itemData.enabled;
            card.classList.toggle('off', !itemData.enabled);
            saveGame();
        });
    } else {
        const count = document.createElement('div');
        count.className = 'bag-card-count';
        count.textContent = `x${itemData.count}`;
        card.appendChild(count);
    }

    // 툴팁
    const tooltip = document.createElement('div');
    tooltip.className = 'bag-tooltip';
    const desc = meta.desc;
    tooltip.textContent = typeof desc === 'function'
        ? desc('multiplier' in meta ? meta.multiplier : meta.bonus)
        : (desc ?? '설명 없음');
    card.appendChild(tooltip);

    card.addEventListener('mouseenter', () => {
        if (!itemData.owned && itemData.count === 0) return;
        tooltip.classList.add('visible');
    });
    card.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
    });

    // 소비 아이템 클릭
    if (itemData.kind === 'active') {
        card.addEventListener('click', () => {
            if (itemData.count === 0) return;
            handleActiveUse(itemData, card);
        });
    }

    return card;
}

function handleActiveUse(itemData, card) {
    if (itemData.type === 'TutorialBook') {
        openTutorial();
        return;
    }
    if (itemData.type === 'UnitGachaTicket' || itemData.type === 'ItemGachaTicket') return;
    if (itemData.type === 'HpPotion') {
        const inst = new (ITEM_CLASS['HpPotion'])();
        if (inst.use()) {
            itemData.count--;
            saveGame();
            renderBagPanel(document.getElementById('panel-bag'));
        }
        return;
    }
    if (itemData.type === 'SmokeBomb') {
        if (game.state !== 'BATTLE') return;
        const inst = new (ITEM_CLASS['SmokeBomb'])();
        if (inst.use()) {
            itemData.count--;
            saveGame();
            renderBagPanel(document.getElementById('panel-bag'));
        }
        return;
    }
    if (game.pendingItem === itemData.type) {
        game.pendingItem = null;
        card.classList.remove('selected');
    } else {
        document.querySelector('.bag-card.selected')?.classList.remove('selected');
        game.pendingItem = itemData.type;
        card.classList.add('selected');
    }
}