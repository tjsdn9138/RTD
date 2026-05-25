import { game } from './state.js';
import { dispatchAug } from './augmentations.js';

export class Item {
    constructor(name) {
        this.name = name;
    }
}

export class PassiveItem extends Item {
    constructor(name) {
        super(name);
    }
    targetFilter(unit) { return true; }
    apply(units) {
        this.applyTo(units.filter(u => this.targetFilter(u)));
    }
    applyTo(units) {}
}

export class ActiveItem extends Item {
    constructor(name) {
        super(name);
        this.used = false;
    }
    use(target) {}
}

export class SpeedCharm extends PassiveItem {
    static meta = {
        name: '속도부적', kind: 'passive', rarity: 'COMMON',
        level: 1, multiplier: 1.05, LevelUpPlus: 0.02,
        desc: (mul) => `아군 전체의 속도를 ${mul}배 증가시킵니다.`,
    };
    constructor() {
        super('속도부적');
        this.multiplier = SpeedCharm.meta.multiplier;
    }
    applyTo(units) {
        units.forEach(unit => { unit.speed = Math.floor(unit.speed * this.multiplier); });
    }
}

export class HpCharm extends PassiveItem {
    static meta = {
        name: '체력부적', kind: 'passive', rarity: 'COMMON',
        level: 1, multiplier: 1.1, LevelUpPlus: 0.04,
        desc: (mul) => `아군 전체의 체력을 ${mul}배 증가시킵니다.`,
    };
    constructor() {
        super('체력부적');
        this.multiplier = HpCharm.meta.multiplier;
    }
    applyTo(units) {
        units.forEach(unit => {
            unit.maxHp = Math.floor(unit.maxHp * this.multiplier);
            unit.hp    = unit.maxHp;
        });
    }
}

export class GoldCharm extends PassiveItem {
    static meta = {
        name: '돈부적', kind: 'passive', rarity: 'COMMON',
        level: 1, bonus: 200, LevelUpPlus: 100,
        desc: (bonus) => `웨이브 클리어 시 획득 골드가 ${bonus} 증가합니다.`,
    };
    constructor() {
        super('돈부적');
        this.bonus = GoldCharm.meta.bonus;
    }
    apply() {
        game.goldBonus = (game.goldBonus || 0) + this.bonus;
    }
}

export class CommonCharm extends PassiveItem {
    static meta = {
        name: '일반부적', kind: 'passive', rarity: 'UNCOMMON',
        level: 1, multiplier: 1.05, LevelUpPlus: 0.05,
        desc: (mul) => `일반 등급 유닛의 체력을 ${mul}배 증가시킵니다.`,
    };
    constructor() {
        super('일반부적');
        this.multiplier = CommonCharm.meta.multiplier;
    }
    targetFilter(unit) { return unit.constructor.meta.rarity === 'COMMON'; }
    applyTo(units) {
        units.forEach(unit => { 
            unit.maxHp = Math.floor(unit.maxHp * this.multiplier);
            unit.hp    = unit.maxHp;
         });
    }
}

export class UncommonCharm extends PassiveItem {
    static meta = {
        name: '고급부적', kind: 'passive', rarity: 'UNCOMMON',
        level: 1, multiplier: 1.05, LevelUpPlus: 0.05,
        desc: (mul) => `고급 등급 유닛의 체력을 ${mul}배 증가시킵니다.`,
    };
    constructor() {
        super('고급부적');
        this.multiplier = UncommonCharm.meta.multiplier;
    }
    targetFilter(unit) { return unit.constructor.meta.rarity === 'UNCOMMON'; }
    applyTo(units) {
        units.forEach(unit => { 
            unit.maxHp = Math.floor(unit.maxHp * this.multiplier);
            unit.hp    = unit.maxHp;
         });
    }
}

export class RareCharm extends PassiveItem {
    static meta = {
        name: '희귀부적', kind: 'passive', rarity: 'UNCOMMON',
        level: 1, multiplier: 1.1, LevelUpPlus: 0.05,
        desc: (mul) => `희귀 등급 유닛의 체력을 ${mul}배 증가시킵니다.`,
    };
    constructor() {
        super('희귀부적');
        this.multiplier = RareCharm.meta.multiplier;
    }
    targetFilter(unit) { return unit.constructor.meta.rarity === 'RARE'; }
    applyTo(units) {
        units.forEach(unit => { 
            unit.maxHp = Math.floor(unit.maxHp * this.multiplier);
            unit.hp    = unit.maxHp;
         });
    }
}

export class EpicCharm extends PassiveItem {
    static meta = {
        name: '영웅부적', kind: 'passive', rarity: 'UNCOMMON',
        level: 1, multiplier: 1.1, LevelUpPlus: 0.05,
        desc: (mul) => `영웅 등급 유닛의 체력을 ${mul}배 증가시킵니다.`,
    };
    constructor() {
        super('영웅부적');
        this.multiplier = EpicCharm.meta.multiplier;
    }
    targetFilter(unit) { return unit.constructor.meta.rarity === 'EPIC'; }
    applyTo(units) {
        units.forEach(unit => { 
            unit.maxHp = Math.floor(unit.maxHp * this.multiplier);
            unit.hp    = unit.maxHp;
         });
    }
}

export class LegendCharm extends PassiveItem {
    static meta = {
        name: '전설부적', kind: 'passive', rarity: 'UNCOMMON',
        level: 1, multiplier: 1.2, LevelUpPlus: 0.05,
        desc: (mul) => `전설 등급 유닛의 체력을 ${mul}배 증가시킵니다.`,
    };
    constructor() {
        super('전설부적');
        this.multiplier = LegendCharm.meta.multiplier;
    }
    targetFilter(unit) { return unit.constructor.meta.rarity === 'LEGEND'; }
    applyTo(units) {
        units.forEach(unit => { 
            unit.maxHp = Math.floor(unit.maxHp * this.multiplier);
            unit.hp    = unit.maxHp;
         });
    }
}

export class Vaccine extends PassiveItem {
    static meta = {
        name: '예방주사', kind: 'passive', rarity: 'LEGEND',
        level: 1, multiplier: 20, LevelUpPlus: 5,
        desc: (mul) => `유닛들의 상태이상 지속 시간이 ${mul}% 감소합니다.`,
    };
    constructor() {
        super('예방주사');
        this.multiplier = Vaccine.meta.multiplier;
    }
    applyTo(units) {
        const rate = 1 / (1 - Math.min(this.multiplier, 90) / 100);
        units.forEach(unit => { unit.statusDurationMul = rate; });
    }
}

export class TutorialBook extends ActiveItem {
    static meta = {
        name: '튜토리얼 책', kind: 'active', rarity: 'UNDEFINED',
        desc: '사용 시 튜토리얼을 볼 수 있습니다.',
    };
    constructor() {
        super('튜토리얼 책');
    }
}

export class UnitGachaTicket extends ActiveItem {
    static meta = {
        name: '유닛 뽑기권', kind: 'active', rarity: 'UNDEFINED',
        desc: '유닛 뽑기를 1회 할 수 있습니다.',
    };
    constructor() {
        super('유닛 뽑기권');
    }
}

export class ItemGachaTicket extends ActiveItem {
    static meta = {
        name: '아이템 뽑기권', kind: 'active', rarity: 'UNDEFINED',
        desc: '아이템 뽑기를 1회 할 수 있습니다.',
    };
    constructor() {
        super('아이템 뽑기권');
    }
}

export class AugReroll extends ActiveItem {
    static meta = {
        name: '증강 새로고침', kind: 'active', rarity: 'RARE',
        desc: '증강 선택 시 새로고침을 1회 할 수 있습니다.',
    };
    constructor() {
        super('증강 새로고침');
    }
}


export class UnitTicketHero extends ActiveItem {
    static meta = {
        name: '유닛 뽑기권', kind: 'active', rarity: 'EPIC',
        targetType: 'UnitGachaTicket',
        desc: '유닛 뽑기를 1회 할 수 있습니다.',
    };
    constructor() {
        super('유닛 뽑기권');
    }
}

export class ItemTicketHero extends ActiveItem {
    static meta = {
        name: '아이템 뽑기권', kind: 'active', rarity: 'EPIC',
        targetType: 'ItemGachaTicket',
        desc: '아이템 뽑기를 1회 할 수 있습니다.',
    };
    constructor() {
        super('아이템 뽑기권');
    }
}

export class HpPotion extends ActiveItem {
    static meta = {
        name: '체력 포션', kind: 'active', rarity: 'EPIC',
        desc: '모든 유닛들의 체력을 10% 회복합니다.',
    };
    constructor() {
        super('체력 포션');
    }
    use() {
        if (this.used) return false;
        const targets = game.units.filter(u => u.active && u.alive);
        if (!targets.length) return false;
        targets.forEach(unit => {
            const base   = Math.floor(unit.maxHp * 0.1);
            const amount = base * (unit.isPoisoned ? 0.5 : 1) * (unit.healBonus ?? 1);
            const excess = Math.max(0, unit.hp + amount - unit.maxHp);
            unit.hp = Math.min(unit.maxHp, unit.hp + amount);
            if (excess > 0) dispatchAug('onUnitHeal', unit, excess);
            unit.healFlash = 1;
        });
        this.used = true;
        return true;
    }
}

export class UnitTicketLegend extends ActiveItem {
    static meta = {
        name: '유닛 뽑기권', kind: 'active', rarity: 'LEGEND',
        targetType: 'UnitGachaTicket',
        desc: '유닛 뽑기를 1회 할 수 있습니다.',
    };
    constructor() {
        super('유닛 뽑기권');
    }
}

export class ItemTicketLegend extends ActiveItem {
    static meta = {
        name: '아이템 뽑기권', kind: 'active', rarity: 'LEGEND',
        targetType: 'ItemGachaTicket',
        desc: '아이템 뽑기를 1회 할 수 있습니다.',
    };
    constructor() {
        super('아이템 뽑기권');
    }
}

export class TowerStop extends ActiveItem {
    static meta = {
        name: '타워 정지', kind: 'active', rarity: 'LEGEND',
        desc: '타워 하나를 한 웨이브 동안 무력화합니다.\n클릭 후 전투 중 타워를 선택하세요.',
    };
    constructor() {
        super('타워 정지');
    }
    use(tower) {
        if (this.used) return false;
        tower.stopped = true;
        this.used = true;
        return true;
    }
}

export function applyPassiveItems(units, inventory) {
    inventory
        .filter(i => i.kind === 'passive' && i.owned && i.enabled)
        .forEach(i => {
            const Cls = ITEM_CLASS[i.type];
            if (Cls) new Cls().apply(units);
        });
}

export const ITEM_CLASSES = [
    SpeedCharm, HpCharm, GoldCharm,
    CommonCharm, UncommonCharm, RareCharm, EpicCharm, LegendCharm,
    // RARE 패시브
    // EPIC 패시브
    Vaccine,
    TutorialBook, UnitGachaTicket, ItemGachaTicket,
    // COMMON 액티브
    // UNCOMMON 액티브
    AugReroll,
    UnitTicketHero, ItemTicketHero, HpPotion,
    TowerStop, UnitTicketLegend, ItemTicketLegend,
];
export const ITEM_CLASS = Object.fromEntries(ITEM_CLASSES.map(Cls => [Cls.name, Cls]));
