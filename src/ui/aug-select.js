import { game } from '../state.js';
import { RARITY, weightedPick } from '../game.js';
import { AUGMENTATION_CLASSES } from '../augmentations.js';

const SKIP_GOLD = {
    COMMON: 200, UNCOMMON: 400, RARE: 700, HERO: 1200, LEGEND: 2000,
};
const RARITY_ORDER = ['COMMON', 'UNCOMMON', 'RARE', 'HERO', 'LEGEND'];

// 모달이 열려있는 동안의 상태
let _cardsEl    = null;
let _skipBtn    = null;
let _closeFn    = null;
let _onDone     = null;
let _curChoices = [];

function pickAugs(exclude = []) {
    const ownedNames = new Set(game.augmentations.map(a => a.constructor.name));
    const exclNames  = new Set(exclude.map(Cls => Cls.name));
    let pool = AUGMENTATION_CLASSES.filter(Cls => !ownedNames.has(Cls.name) && !exclNames.has(Cls.name));
    if (pool.length < 3) pool = AUGMENTATION_CLASSES.filter(Cls => !ownedNames.has(Cls.name));

    const result = [];
    const pickedFamilies = new Set();
    while (result.length < 3 && pool.length > 0) {
        const picked = weightedPick(pool);
        if (!picked) break;
        result.push(picked);
        const family = picked.meta.family;
        if (family) pickedFamilies.add(family);
        pool = pool.filter(Cls => Cls !== picked && (!Cls.meta.family || !pickedFamilies.has(Cls.meta.family)));
    }
    return result;
}

function getSkipGold(augClasses) {
    if (!augClasses.length) return 200;
    const topKey = augClasses.reduce((top, Cls) => {
        const ri = RARITY_ORDER.indexOf(Cls.meta.rarity);
        return ri > RARITY_ORDER.indexOf(top) ? Cls.meta.rarity : top;
    }, 'COMMON');
    return SKIP_GOLD[topKey] ?? 200;
}

function renderCards(choices) {
    _cardsEl.innerHTML = '';
    choices.forEach(Cls => {
        const meta   = Cls.meta;
        const rarity = RARITY[meta.rarity] ?? RARITY.COMMON;

        const card = document.createElement('div');
        card.className = 'aug-card';
        card.style.setProperty('--rc', rarity.color);

        const rarEl = document.createElement('div');
        rarEl.className = 'aug-card-rarity';
        rarEl.textContent = rarity.name;
        rarEl.style.color = rarity.color;

        const nameEl = document.createElement('div');
        nameEl.className = 'aug-card-name';
        nameEl.textContent = meta.name;

        const descEl = document.createElement('div');
        descEl.className = 'aug-card-desc';
        meta.desc.split('\n').forEach((line, i) => {
            if (i > 0) descEl.appendChild(document.createElement('br'));
            descEl.appendChild(document.createTextNode(line));
        });

        card.append(rarEl, nameEl, descEl);
        card.addEventListener('click', () => {
            const aug = new Cls();
            game.augmentations.push(aug);
            aug.onAcquire();
            const done = _onDone;
            _closeFn();
            done?.();
        });
        _cardsEl.appendChild(card);
    });

    _skipBtn.textContent = `포기하고 ${getSkipGold(choices)}G 받기`;
}

// 증강 새로고침 아이템에서 호출
export function rerollAugChoices() {
    if (!_cardsEl) return;
    _curChoices = pickAugs(_curChoices);
    renderCards(_curChoices);
}

export function openAugSelect(onDone) {
    if (document.getElementById('aug-overlay')) return;

    _onDone     = onDone;
    _curChoices = pickAugs();

    const overlay = document.createElement('div');
    overlay.id = 'aug-overlay';

    const modal = document.createElement('div');
    modal.id = 'aug-modal';

    const titleEl = document.createElement('div');
    titleEl.id = 'aug-title';
    titleEl.textContent = '✦  증강 선택  ✦';

    const subEl = document.createElement('div');
    subEl.id = 'aug-subtitle';
    subEl.textContent = `WAVE ${game.waveNumber}`;

    _cardsEl = document.createElement('div');
    _cardsEl.id = 'aug-cards';

    _skipBtn = document.createElement('button');
    _skipBtn.id = 'aug-skip';
    _skipBtn.addEventListener('click', () => {
        game.gold += getSkipGold(_curChoices);
        const done = _onDone;
        _closeFn();
        done?.();
    });

    modal.append(titleEl, subEl, _cardsEl, _skipBtn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    renderCards(_curChoices);

    function onKey(e) {
        if (e.code === 'Space' || e.code === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    document.addEventListener('keydown', onKey, true);

    _closeFn = () => {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        _cardsEl    = null;
        _skipBtn    = null;
        _closeFn    = null;
        _onDone     = null;
        _curChoices = [];
    };
}
