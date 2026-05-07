import { game, inventory, ownedUnits, RARITY, getGachaCost, getGachaCostRange, weightedPick, checkItemLevelUp } from '../game.js';
import { UNIT_CLASSES } from '../units.js';
import { ITEM_CLASSES } from '../items.js';
import { updateHUD } from './ui.js';

// 상점 패널 랜더링
export function renderShopPanel(container) {
    container.innerHTML = '';

    const allUpdateBtns = [];

    container.appendChild(makeGachaSection('유닛 뽑기',   'UnitGachaTicket', 'unit',  allUpdateBtns));
    container.appendChild(makeGachaSection('아이템 뽑기', 'ItemGachaTicket', 'item', allUpdateBtns));

    container.appendChild(makeProbTable());
}

// 가챠 섹션 만들기
function makeGachaSection(title, ticketType, kind, allUpdateBtns) {
    const section = document.createElement('div');
    section.className = 'shop-section';

    const header = document.createElement('div');
    header.className = 'shop-section-header';

    const h = document.createElement('h3');
    h.className = 'shop-section-title';
    h.textContent = title;

    const btnGroup = document.createElement('div');
    btnGroup.className = 'shop-btn-group';

    const btn1 = document.createElement('button');
    btn1.className = 'shop-btn';

    const btn10 = document.createElement('button');
    btn10.className = 'shop-btn';

    const updateBtn = () => {
        const cost         = getGachaCost(kind);
        const count        = inventory.find(i => i.type === ticketType)?.count ?? 0;
        const ticketsToUse = Math.min(count, 10);
        const goldNeeded   = getGachaCostRange(kind, game.gachaPulls[kind] + ticketsToUse, 10 - ticketsToUse);

        btn1.innerHTML = count > 0 ? `🎫 1 / ${count}` : `🪙 ${cost}`;

        if (count >= 10) {
            btn10.innerHTML = `🎫 × 10`;
        } else if (count > 0) {
            btn10.innerHTML = `🎫 ${count} + 🪙 ${goldNeeded}`;
        } else {
            btn10.innerHTML = `🪙 ${goldNeeded}`;
        }
    };
    allUpdateBtns.push(updateBtn);
    updateBtn();

    btn1.addEventListener('click', () => {
        const result = doGacha(kind);
        if (!result) return;
        allUpdateBtns.forEach(u => u());
        showResults(section, [result]);
        updateHUD();
    });

    btn10.addEventListener('click', () => {
        const results = doGacha10(kind);
        if (!results) return;
        allUpdateBtns.forEach(u => u());
        showResults(section, results);
        updateHUD();
    });

    btnGroup.appendChild(btn1);
    btnGroup.appendChild(btn10);
    header.appendChild(h);
    header.appendChild(btnGroup);
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
        const cost = getGachaCost(kind);
        if (game.gold < cost) return null;
        game.gold -= cost;
    }
    game.gachaPulls[kind]++;

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

    return Cls.meta;
}

function doGacha10(kind) {
    const ticketType = kind === 'unit' ? 'UnitGachaTicket' : 'ItemGachaTicket';
    const ticket = inventory.find(i => i.type === ticketType);
    const ticketCount  = ticket?.count ?? 0;
    const ticketsToUse = Math.min(ticketCount, 10);
    const goldNeeded   = getGachaCostRange(kind, game.gachaPulls[kind] + ticketsToUse, 10 - ticketsToUse);

    if (game.gold < goldNeeded) return null;

    const results = [];
    for (let i = 0; i < 10; i++) {
        const result = doGacha(kind);
        if (result) results.push(result);
    }
    return results.length > 0 ? results : null;
}

function showResults(section, metas) {
    const area = section.querySelector('.shop-result');
    area.innerHTML = '';
    area.classList.toggle('shop-result-multi', metas.length > 1);

    metas.forEach(meta => {
        const rarity = RARITY[meta.rarity];
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
    });
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
