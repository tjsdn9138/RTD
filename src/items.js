import { game } from './state.js';

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
        level: 1, multiplier: 1.1, LevelUpPlus: 0.05,
        desc: (mul) => `아군 전체의 속도를 ${mul}배 증가시킵니다.`,
    };
    constructor() {
        super('속도부적');
        this.multiplier = SpeedCharm.meta.multiplier;
    }
    applyTo(units) {
        units.forEach(unit => { unit.speed *= this.multiplier; });
    }
}

export class HpCharm extends PassiveItem {
    static meta = {
        name: '체력부적', kind: 'passive', rarity: 'COMMON',
        level: 1, multiplier: 1.2, LevelUpPlus: 0.05,
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
        level: 1, bonus: 100, LevelUpPlus: 50,
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

export class NormalUnitCharm extends PassiveItem {
    static meta = {
        name: '평범부적', kind: 'passive', rarity: 'UNCOMMON',
        level: 1, multiplier: 1.05, LevelUpPlus: 0.03,
        desc: (mul) => `평범한넘의 스탯을 ${mul}배 상승시킵니다.`,
    };
    constructor() {
        super('평범부적');
        this.multiplier = NormalUnitCharm.meta.multiplier;
    }
    targetFilter(unit) { return unit.constructor.meta.type === 'NormalUnit'; }
    applyTo(units) {
        units.forEach(unit => {
            unit.maxHp = Math.floor(unit.maxHp * this.multiplier);
            unit.hp    = unit.maxHp;
            unit.speed = Math.floor(unit.speed * this.multiplier);
        });
    }
}

export class SpeedUnitCharm extends PassiveItem {
    static meta = {
        name: '빠른부적', kind: 'passive', rarity: 'UNCOMMON',
        level: 1, multiplier: 1.1, LevelUpPlus: 0.05,
        desc: (mul) => `빠른넘의 체력을 ${mul}배 상승시킵니다.`,
    };
    constructor() {
        super('빠른부적');
        this.multiplier = SpeedUnitCharm.meta.multiplier;
    }
    targetFilter(unit) { return unit.constructor.meta.type === 'FastUnit'; }
    applyTo(units) {
        units.forEach(unit => {
            unit.maxHp = Math.floor(unit.maxHp * this.multiplier);
            unit.hp    = unit.maxHp;
        });
    }
}

export class SlowUnitCharm extends PassiveItem {
    static meta = {
        name: '느린부적', kind: 'passive', rarity: 'UNCOMMON',
        level: 1, multiplier: 1.05, LevelUpPlus: 0.05,
        desc: (mul) => `느린넘의 속도를 ${mul}배 상승시킵니다.`,
    };
    constructor() {
        super('느린부적');
        this.multiplier = SlowUnitCharm.meta.multiplier;
    }
    targetFilter(unit) { return unit.constructor.meta.type === 'SlowUnit'; }
    applyTo(units) {
        units.forEach(unit => {
            unit.speed = Math.floor(unit.speed * this.multiplier);
        });
    }
}

export class ShieldUnitCharm extends PassiveItem {
    static meta = {
        name: '방패부적', kind: 'passive', rarity: 'RARE',
        level: 1, multiplier: 1.5, LevelUpPlus: 0.5,
        desc: (mul) => `방패든넘의 패시브 수치를 ${mul}배 상승시킵니다.`,
    };
    constructor() {
        super('방패부적');
        this.multiplier = ShieldUnitCharm.meta.multiplier;
    }
    targetFilter(unit) { return unit.constructor.meta.type === 'ShieldUnit'; }
    applyTo(units) {
        units.forEach(unit => {
            unit.defense = Math.floor(unit.defense * this.multiplier);
        });
    }
}

export class TauntUnitCharm extends PassiveItem {
    static meta = {
        name: '도발부적', kind: 'passive', rarity: 'RARE',
        level: 1, multiplier: 1.15, LevelUpPlus: 0.05,
        desc: (mul) => `어그로끄는넘의 체력을 ${mul}배 상승시킵니다.`,
    };
    constructor() {
        super('도발부적');
        this.multiplier = TauntUnitCharm.meta.multiplier;
    }
    targetFilter(unit) { return unit.constructor.meta.type === 'TauntUnit'; }
    applyTo(units) {
        units.forEach(unit => {
            unit.maxHp = Math.floor(unit.maxHp * this.multiplier);
            unit.hp    = unit.maxHp;
        });
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

export class UnitTicketHero extends ActiveItem {
    static meta = {
        name: '유닛 뽑기권', kind: 'active', rarity: 'HERO',
        targetType: 'UnitGachaTicket',
        desc: '유닛 뽑기를 1회 할 수 있습니다.',
    };
    constructor() {
        super('유닛 뽑기권');
    }
}

export class ItemTicketHero extends ActiveItem {
    static meta = {
        name: '아이템 뽑기권', kind: 'active', rarity: 'HERO',
        targetType: 'ItemGachaTicket',
        desc: '아이템 뽑기를 1회 할 수 있습니다.',
    };
    constructor() {
        super('아이템 뽑기권');
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
    NormalUnitCharm, SpeedUnitCharm, SlowUnitCharm,
    ShieldUnitCharm, TauntUnitCharm,
    // HERO 패시브 아이템
    // LEGEND 패시브 아이템
    TutorialBook,
    UnitGachaTicket, ItemGachaTicket,
    // UNCOMMON 액티브 아이템
    // RARE 액티브 아이템
    UnitTicketHero, ItemTicketHero,
    TowerStop, UnitTicketLegend, ItemTicketLegend,
];
export const ITEM_CLASS = Object.fromEntries(ITEM_CLASSES.map(Cls => [Cls.name, Cls]));
