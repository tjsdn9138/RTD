import { UNIT_CLASSES } from './units.js';
import { TOWER_CLASSES } from './towers.js';
import { ITEM_CLASSES, ITEM_CLASS } from './items.js';

export * from './state.js';
import { MAX_UNIT_LEVEL, MAX_SLOTS, game, getLevelUpCost } from './state.js';

// 희귀도 정보
// TODO: 확률 조정
export const RARITY = {
    COMMON:   { name: '일반', color: '#4a4a4a', prob: 55 },
    UNCOMMON: { name: '고급', color: '#2a8a00', prob: 25 },
    RARE:     { name: '희귀', color: '#0a2aaa', prob: 12 },
    HERO:     { name: '영웅', color: '#6a0aaa', prob: 6  },
    LEGEND:   { name: '전설', color: '#c87800', prob: 2  },
    UNDEFINED: { name: '고유', color: '#00a8a8', prob: 0  },
};

// 뽑기 가격
// TODO: 수치 조정
export const GACHA_COST = {
    unit: 25,
    item: 100,
};

// 보유 유닛
export const ownedUnits = UNIT_CLASSES.map(Cls => ({
    type:  Cls.name, // 클래스 이름 ex) NormalUnit
    name:  Cls.meta.name, // 유닛명 ex) 평범한넘
    count: 0,
}));

// 시작 유닛 개수 설정
ownedUnits.find(u => u.type === 'NormalUnit').count = 1;
ownedUnits.find(u => u.type === 'FastUnit').count = 1;
ownedUnits.find(u => u.type === 'SlowUnit').count = 1;

// 보유 아이템
export const inventory = ITEM_CLASSES.map(Cls => ({
    type:    Cls.name,
    name:    Cls.meta.name,
    kind:    Cls.meta.kind,
    count:   0,
    owned:   false, // 한 번이라도 획득했으면 true (레벨업으로 count=0이 돼도 유지)
    enabled: true,
}));

// 시작 아이템 개수 설정
const _startItems = ['TutorialBook'];
_startItems.forEach(type => {
    const i = inventory.find(i => i.type === type);
    i.count = 1;
    i.owned = true;
});

// 출전 유닛 슬롯 — null이면 비어있음
export const deploySlots = Array(MAX_SLOTS).fill(null);

// 타워 레벨업
export function levelUpTower(tower) {
    const meta = tower.constructor.meta;
    if (!meta) return false;

    tower.level++;
    tower.damage = Math.floor(tower.damage * meta.damageMul);
    tower.attackSpeed = parseFloat((tower.attackSpeed * meta.speedMul).toFixed(4));
    if (tower.level % 5 === 0) tower.range = Math.floor(tower.range * meta.rangeMul);
    return true;
}

// 유닛 레벨업 (유닛 여유분 + 골드 동시 소비)
export function levelUpUnit(type) {
    const Cls = UNIT_CLASSES.find(C => C.name === type);
    if (!Cls) return false;

    const meta = Cls.meta;
    if (meta.level >= MAX_UNIT_LEVEL) return false;

    const cost  = getLevelUpCost(meta.level);
    const owned = ownedUnits.find(u => u.type === type);
    if (!owned) return false;

    if (owned.count < cost.units) return false;
    if (game.gold < cost.gold) return false;

    owned.count -= cost.units;
    owned.count += 1;
    game.gold   -= cost.gold;

    meta.level++;
    meta.hp    = Math.floor(meta.hp    * meta.hpMul);
    meta.speed = Math.floor(meta.speed * meta.speedMul);

    if (meta.level % 5 === 0) {
        if ('defense' in meta) {
            meta.defense = Math.floor(meta.defense * meta.defMul);
        }
        if ('timePlus' in meta) {
            meta.time = parseFloat((meta.time + meta.timePlus).toFixed(2));
        }
        if ('dodgeProb' in meta) {
            meta.dodgeProb = parseFloat((meta.dodgeProb * meta.dodgeMul).toFixed(2));
        }
    }

    return true;
}

// 아이템 레벨업 가능 여부 확인
export function checkItemLevelUp(type) {
    const Cls = ITEM_CLASS[type];
    if (!Cls) return;
    const meta = Cls.meta;
    const item = inventory.find(i => i.type === type);
    if (!item) return;

    item.owned = true;

    let required = getLevelUpCost(meta.level).items;
    while (item.count >= required) {
        item.count -= required;
        meta.level++;
        if ('LevelUpMul' in meta)        meta.multiplier = parseFloat((meta.multiplier * meta.LevelUpMul).toFixed(4));
        else if ('LevelUpBonus' in meta) meta.bonus += meta.LevelUpBonus;
        required = getLevelUpCost(meta.level).items;
    }
}

// 희귀도 가중치 기반 랜덤 픽
export function weightedPick(classes) {
    const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'HERO', 'LEGEND'];
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const rarity of rarities) {
        cumulative += RARITY[rarity].prob;
        if (roll < cumulative) {
            const candidates = classes.filter(Cls => Cls.meta.rarity === rarity);
            if (candidates.length === 0) continue;
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
    }
    return null;
}

// 임의의 희귀도 내에서의 랜덤 픽
export function underWeightedPick(rarityNum) {
    const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'HERO', 'LEGEND'];
    rarityNum = Math.min(rarityNum, rarities.length - 1);
    let total = 0;
    for (let i = 0; i <= rarityNum; i++) {
        total += RARITY[rarities[i]].prob;
    }

    const roll = Math.random() * total;
    let cumulative = 0;
    for (let i = 0; i <= rarityNum; i++) {
        cumulative += RARITY[rarities[i]].prob;
        if (roll < cumulative) return selectTower(rarities[i]);
    }
    return selectTower(rarities[rarityNum]);
}

// 희귀도에 맞는 타워 중 랜덤 선택
export function selectTower(rarity) {
    const selected = TOWER_CLASSES.filter(tower => tower.meta.rarity === rarity);
    if (selected.length === 0) return null;
    return selected[Math.floor(Math.random() * selected.length)].name;
}