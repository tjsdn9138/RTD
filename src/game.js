import { UNIT_CLASSES } from './units.js';
import { TOWER_CLASSES } from './towers.js';
import { ITEM_CLASSES, ITEM_CLASS } from './items.js';

export * from './state.js';
import { MAX_UNIT_LEVEL, MAX_TOWER_LEVEL, MAX_SLOTS, game, getLevelUpCost } from './state.js';

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
export function getGachaCost(kind) {
    return getGachaCostAt(kind, game.gachaPulls[kind] ?? 0);
}

function getGachaCostAt(kind, pulls) {
    if (kind === 'unit') return (Math.floor(pulls / 10) + 1) * 25;
    if (kind === 'item') return (Math.floor(pulls / 10) + 1) * 100;
    return 0;
}

// startPull번째 뽑기부터 count회의 총 골드 비용
export function getGachaCostRange(kind, startPull, count) {
    let total = 0;
    for (let i = 0; i < count; i++) total += getGachaCostAt(kind, startPull + i);
    return total;
}

// 만렙 기준 스탯 최댓값
const _UNIT_LV_SUM  = MAX_UNIT_LEVEL  - 1;
const _TOWER_LV_SUM = MAX_TOWER_LEVEL - 1;
const _TOWER_LV_SPD = MAX_TOWER_LEVEL / 5;
export const UNIT_HP_MAX   = Math.max(...UNIT_CLASSES.map(C => C.meta.hp    + C.meta.hpPlus    * _UNIT_LV_SUM));
export const UNIT_SPD_MAX  = Math.max(...UNIT_CLASSES.map(C => C.meta.speed + C.meta.speedPlus * _UNIT_LV_SUM));
export const TOWER_DMG_MAX = Math.max(...TOWER_CLASSES.map(C => C.meta.damage      + C.meta.dmgPlus   * _TOWER_LV_SUM));
export const TOWER_SPD_MAX = Math.max(...TOWER_CLASSES.map(C => C.meta.attackSpeed + C.meta.speedPlus * _TOWER_LV_SPD));
export const TOWER_RNG_MAX = Math.max(...TOWER_CLASSES.map(C => C.meta.range       + C.meta.rangePlus * _TOWER_LV_SPD));

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
    if (tower.level >= MAX_TOWER_LEVEL) return false;

    tower.damage = Math.floor(tower.damage + meta.dmgPlus);
    tower.level++;

    if (tower.level % 5 === 0) {
        tower.attackSpeed = parseFloat((tower.attackSpeed + meta.speedPlus).toFixed(4));
        tower.range       = Math.floor(tower.range + meta.rangePlus);
    }
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

    meta.hp    = Math.floor(meta.hp    + meta.hpPlus);
    meta.speed = Math.floor(meta.speed + meta.speedPlus);
    meta.level++;

    if (meta.level % 5 === 0) {
        if ('defense' in meta) {
            meta.defense += meta.defPlus;
        }
        if ('timePlus' in meta) {
            meta.time = parseFloat((meta.time + meta.timePlus).toFixed(2));
        }
        if ('dodgeProb' in meta) {
            meta.dodgeProb = parseFloat(Math.min(100, meta.dodgeProb + meta.dodgePlus).toFixed(2));
        }
        if ('heal' in meta) {
            meta.heal += meta.healPlus;
        }
        if ('decDamage' in meta) {
            meta.decDamage = meta.decDamage + meta.decPlus;
        }
        if ('returnPlus' in meta) {
            meta.returnHp = Math.min(100, meta.returnHp + meta.returnPlus);
        }
        if ('splitPlus' in meta) {
            meta.splitNum += meta.splitPlus;
        }
        if ('dashMinus' in meta) {
            meta.dashTime = Math.max(0.1, parseFloat((meta.dashTime - meta.dashMinus).toFixed(2)));
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
        if ('multiplier' in meta)    meta.multiplier = parseFloat((meta.multiplier + meta.LevelUpPlus).toFixed(4));
        else if ('bonus' in meta)    meta.bonus += meta.LevelUpPlus;
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

// 지정 등급의 타워 중 중복 제외 랜덤 타워 선택
// rarities[5]='UNDEFINED'는 만능 타워(특수 milestone, 예: wave 50) 전용 풀
export function selectTower(rarityNum) {
    const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'HERO', 'LEGEND', 'UNDEFINED'];
    if (rarityNum < 0 || rarityNum >= rarities.length) return null;
    const existing = new Set(game.towers.filter(t => t).map(t => t.constructor.name));
    const candidates = TOWER_CLASSES.filter(t =>
        t.meta.rarity === rarities[rarityNum] && !existing.has(t.name)
    );

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)].name;
}

// rarityNum(0=COMMON~4=LEGEND) 이하 등급의 타워 중 중복 제외 랜덤 타워 선택
// UNDEFINED는 일반 풀에서 제외 (selectTower의 milestone에서만 등장)
export function selectRandomTower(rarityNum) {
    const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'HERO', 'LEGEND'];
    if (rarityNum < 0 || rarityNum >= rarities.length) return null;
    const existing = new Set(game.towers.filter(t => t).map(t => t.constructor.name));
    const candidates = TOWER_CLASSES.filter(t => {
        const idx = rarities.indexOf(t.meta.rarity);
        return idx >= 0 && idx <= rarityNum && !existing.has(t.name);
    });
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)].name;
}