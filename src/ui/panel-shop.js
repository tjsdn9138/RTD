import { game, inventory, ownedUnits, RARITY, GACHA_COST, weightedPick, checkItemLevelUp } from '../game.js';
import { UNIT_CLASSES } from '../units.js';
import { ITEM_CLASSES } from '../items.js';
import { updateHUD } from './ui.js';

// 상점 패널 랜더링
export function renderShopPanel(container) {
    container.innerHTML = '';

    container.appendChild(makeGachaSection(
        '유닛 뽑기',
        GACHA_COST.unit,
        'UnitGachaTicket',
        () => doGacha('unit')
    ));
    container.appendChild(makeGachaSection(
        '아이템 뽑기',
        GACHA_COST.item,
        'ItemGachaTicket',
        () => doGacha('item')
    ));

    container.appendChild(makeProbTable());
}

// 가챠 섹션 만들기
function makeGachaSection(title, cost, ticketType, onGacha) {
    const section = document.createElement('div');
    section.className = 'shop-section';

    const header = document.createElement('div');
    header.className = 'shop-section-header';

    const h = document.createElement('h3');
    h.className = 'shop-section-title';
    h.textContent = title;

    const btn = document.createElement('button');
    btn.className = 'shop-btn';

    const updateBtn = () => {
        const count = inventory.find(i => i.type === ticketType)?.count ?? 0;
        btn.innerHTML = count > 0 ? `🎫 1 / ${count}` : `🪙 ${cost} 뽑기`;
    };
    updateBtn();

    btn.addEventListener('click', () => {
        const result = onGacha();
        if (!result) return;
        updateBtn();
        showResult(section, result);
        updateHUD();
    });

    header.appendChild(h);
    header.appendChild(btn);
    section.appendChild(header);

    const resultArea = document.createElement('div');
    resultArea.className = 'shop-result';
    section.appendChild(resultArea);

    return section;
}

function doGacha(kind) {
    const ticketType = kind === 'unit' ? 'UnitGachaTicket' : 'ItemGachaTicket';
    const ticket = inventory.find(i => i.type === ticketType && i.count > 0);
    if (ticket) {
        ticket.count--;
    } else {
        const cost = GACHA_COST[kind];
        if (game.gold < cost) return null;
        game.gold -= cost;
    }

    const classes = kind === 'unit' ? UNIT_CLASSES : ITEM_CLASSES;
    const Cls = weightedPick(classes);
    if (!Cls) return null;

    if (kind === 'unit') {
        const owned = ownedUnits.find(u => u.type === Cls.name);
        if (owned) owned.count++;
    } else {
        const amount = Cls.name === 'UnitGachaTicket' ? 10 : Cls.name === 'ItemGachaTicket' ? 5 : 1;
        const inv = inventory.find(i => i.type === Cls.name);
        if (inv) { inv.count += amount; inv.owned = true; }
        if (Cls.meta.kind === 'passive') checkItemLevelUp(Cls.name);
    }

    return Cls.meta;  // showResult에서 name, rarity 필요
}

function showResult(section, meta) {
    const area = section.querySelector('.shop-result');
    const rarity = RARITY[meta.rarity];

    area.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'shop-result-card';
    card.style.borderColor = rarity.color;

    const rarityTag = document.createElement('div');
    rarityTag.className = 'shop-result-rarity';
    rarityTag.style.color = rarity.color;
    rarityTag.textContent = rarity.name;

    const name = document.createElement('div');
    name.className = 'shop-result-name';
    name.textContent = meta.name;

    card.appendChild(rarityTag);
    card.appendChild(name);
    area.appendChild(card);
}

function makeProbTable() {
    const wrap = document.createElement('div');
    wrap.className = 'shop-prob-wrap';

    const title = document.createElement('div');
    title.className = 'shop-prob-title';
    title.textContent = '뽑기 확률';
    wrap.appendChild(title);

    Object.entries(RARITY).forEach(([key, r]) => {
        const row = document.createElement('div');
        row.className = 'shop-prob-row';

        const label = document.createElement('span');
        label.className = 'shop-prob-label';
        label.style.color = r.color;
        label.textContent = r.name;

        const prob = document.createElement('span');
        prob.className = 'shop-prob-val';
        prob.textContent = `${r.prob}%`;

        row.appendChild(label);
        row.appendChild(prob);
        wrap.appendChild(row);
    });

    return wrap;
}