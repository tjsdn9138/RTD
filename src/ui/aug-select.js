import { game, addGold } from '../state.js';
import { RARITY, weightedPick, inventory } from '../game.js';
import { AUGMENTATION_CLASSES } from '../augmentations.js';
import { saveGame } from '../save.js';

const RARITY_WEIGHT = {
    COMMON: 1, UNCOMMON: 2, RARE: 3, EPIC: 5, LEGEND: 10,
};
const SKIP_GOLD_PER_WAVE = 25;

// 모달이 열려있는 동안의 상태
let _cardsEl          = null;
let _skipBtn          = null;
let _closeFn          = null;
let _onDone           = null;
let _curChoices       = [];
let _seenChoices      = [];
let _rightLikeTimer   = null;
let _rightLikeInterval = null;

const RIGHT_LIKE_DELAY = 1; // 자동 선택까지의 대기 시간 (초)

function pickOneAug(exclude) {
    const ownedNames   = new Set(game.augmentations.map(a => a.constructor.name));
    const exclNames    = new Set(exclude.map(Cls => Cls.name));
    const exclFamilies = new Set(exclude.map(Cls => Cls.meta.family).filter(Boolean));
    const isFirst      = game.augmentations.length === 0;
    let pool = AUGMENTATION_CLASSES.filter(Cls =>
        !ownedNames.has(Cls.name) &&
        !exclNames.has(Cls.name) &&
        (!Cls.meta.family || !exclFamilies.has(Cls.meta.family)) &&
        (!Cls.meta.firstOnly || isFirst) &&
        (!Cls.meta.lifeOneOnly || game.lives === 1) &&
        (!Cls.meta.minLives || game.lives >= Cls.meta.minLives) &&
        (!game.contractDone || Cls.meta.requires !== 'ContractAug') &&
        (!Cls.meta.requires || ownedNames.has(Cls.meta.requires))
    );
    if (pool.length === 0)
        pool = AUGMENTATION_CLASSES.filter(Cls => !ownedNames.has(Cls.name) && !exclNames.has(Cls.name) && (!Cls.meta.firstOnly || isFirst) && (!Cls.meta.lifeOneOnly || game.lives === 1) && (!Cls.meta.minLives || game.lives >= Cls.meta.minLives) && (!game.contractDone || Cls.meta.requires !== 'ContractAug') && (!Cls.meta.requires || ownedNames.has(Cls.meta.requires)));
    return weightedPick(pool);
}

// reroll 가능 여부 사전 검사 — pickOneAug 의 2단계 폴백 풀과 동일 조건
function _hasRerollPool(exclude) {
    const ownedNames = new Set(game.augmentations.map(a => a.constructor.name));
    const exclNames  = new Set(exclude.map(Cls => Cls.name));
    const isFirst    = game.augmentations.length === 0;
    return AUGMENTATION_CLASSES.some(Cls =>
        !ownedNames.has(Cls.name) &&
        !exclNames.has(Cls.name) &&
        (!Cls.meta.firstOnly || isFirst) &&
        (!Cls.meta.lifeOneOnly || game.lives === 1) &&
        (!Cls.meta.minLives || game.lives >= Cls.meta.minLives) &&
        (!game.contractDone || Cls.meta.requires !== 'ContractAug') &&
        (!Cls.meta.requires || ownedNames.has(Cls.meta.requires))
    );
}

function pickAugs(exclude = []) {
    const ownedNames = new Set(game.augmentations.map(a => a.constructor.name));
    const exclNames  = new Set(exclude.map(Cls => Cls.name));
    const isFirst    = game.augmentations.length === 0;
    let pool = AUGMENTATION_CLASSES.filter(Cls => !ownedNames.has(Cls.name) && !exclNames.has(Cls.name) && (!Cls.meta.firstOnly || isFirst) && (!Cls.meta.lifeOneOnly || game.lives === 1) && (!Cls.meta.minLives || game.lives >= Cls.meta.minLives) && (!game.contractDone || Cls.meta.requires !== 'ContractAug') && (!Cls.meta.requires || ownedNames.has(Cls.meta.requires)));
    if (pool.length < 3) pool = AUGMENTATION_CLASSES.filter(Cls => !ownedNames.has(Cls.name) && (!Cls.meta.firstOnly || isFirst) && (!Cls.meta.lifeOneOnly || game.lives === 1) && (!Cls.meta.minLives || game.lives >= Cls.meta.minLives) && (!game.contractDone || Cls.meta.requires !== 'ContractAug') && (!Cls.meta.requires || ownedNames.has(Cls.meta.requires)));

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
    const weightSum = augClasses.reduce((s, Cls) => s + (RARITY_WEIGHT[Cls.meta.rarity] ?? 0), 0);
    return Math.floor(weightSum * game.waveNumber * SKIP_GOLD_PER_WAVE);
}

function renderCards(choices) {
    _cardsEl.innerHTML = '';
    choices.forEach((Cls, idx) => {
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

        const rerollItem = inventory.find(i => i.type === 'AugReroll');
        const rerollCount = rerollItem?.count ?? 0;
        const canReroll = !game.rightLikeActive && rerollCount > 0 && _hasRerollPool(_seenChoices);
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'aug-card-refresh' + (canReroll ? '' : ' disabled');
        refreshBtn.textContent = `↺ x${rerollCount}`;
        refreshBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!canReroll) return;
            const item = inventory.find(i => i.type === 'AugReroll' && i.count > 0);
            if (!item) return;
            const newAug = pickOneAug(_seenChoices);
            if (!newAug) return;
            item.count--;
            _seenChoices.push(newAug);
            _curChoices[idx] = newAug;
            game.augChoices = _curChoices.map(Cls => Cls.name);
            saveGame();
            renderCards(_curChoices);
        });

        card.append(rarEl, nameEl, descEl);
        const isForced = game.rightLikeActive && idx !== choices.length - 1;
        if (isForced) {
            card.classList.add('disabled');
        } else {
            card.addEventListener('click', () => {
                clearTimeout(_rightLikeTimer);
                clearInterval(_rightLikeInterval);
                _rightLikeTimer = null;
                _rightLikeInterval = null;
                if (game.rightLikeActive) {
                    const discarded = _curChoices.filter((_, i) => i !== idx);
                    addGold(getSkipGold(discarded));
                }
                const aug = new Cls();
                game.augmentations.push(aug);
                aug.onAcquire();
                const done = _onDone;
                _closeFn();
                done?.();
            });
        }

        const wrap = document.createElement('div');
        wrap.className = 'aug-card-wrap';
        wrap.append(card, refreshBtn);
        _cardsEl.appendChild(wrap);
    });

    _skipBtn.textContent = `포기하고 ${getSkipGold(choices)}G 받기`;

    if (game.rightLikeActive) {
        clearTimeout(_rightLikeTimer);
        clearInterval(_rightLikeInterval);

        const rightIdx  = choices.length - 1;
        const rightWrap = _cardsEl.children[rightIdx];
        const countEl   = document.createElement('div');
        countEl.className = 'aug-card-countdown';
        let remaining   = RIGHT_LIKE_DELAY;
        countEl.textContent = remaining;
        rightWrap.appendChild(countEl);

        _rightLikeInterval = setInterval(() => {
            remaining--;
            countEl.textContent = remaining;
            if (remaining <= 0) {
                clearInterval(_rightLikeInterval);
                _rightLikeInterval = null;
            }
        }, 1000);

        _rightLikeTimer = setTimeout(() => {
            _rightLikeTimer = null;
            const lastCls   = choices[rightIdx];
            const discarded = _curChoices.filter((_, i) => i !== rightIdx);
            addGold(getSkipGold(discarded));
            const aug  = new lastCls();
            game.augmentations.push(aug);
            aug.onAcquire();
            const done = _onDone;
            _closeFn();
            done?.();
        }, RIGHT_LIKE_DELAY * 1000);
    }
}


export function openAugSelect(onDone) {
    if (document.getElementById('aug-overlay')) return;

    _onDone = onDone;

    if (game.augPending && game.augChoices.length > 0) {
        _curChoices = game.augChoices
            .map(name => AUGMENTATION_CLASSES.find(Cls => Cls.name === name))
            .filter(Boolean);
    } else {
        game.augPending = true;
        _curChoices = pickAugs();
        game.augChoices = _curChoices.map(Cls => Cls.name);
        saveGame();
    }
    _seenChoices = [..._curChoices];

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
        addGold(getSkipGold(_curChoices));
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
        clearTimeout(_rightLikeTimer);
        clearInterval(_rightLikeInterval);
        _rightLikeTimer    = null;
        _rightLikeInterval = null;
        game.augPending = false;
        game.augChoices = [];
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        _cardsEl     = null;
        _skipBtn     = null;
        _closeFn     = null;
        _onDone      = null;
        _curChoices  = [];
        _seenChoices = [];
    };
}
