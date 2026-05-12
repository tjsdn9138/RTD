import { game, getReward } from './state.js';

export function dispatchAug(hook, ...args) {
    game.augmentations.forEach(aug => aug[hook](...args));
}

export class Augmentation {
    static meta = {
        name: '',
        rarity: '',
        desc: '',
    }
    onAcquire() {}
    onWaveStart(units) {}
    onWaveClear(units) {}
    onWaveFail(units) {}
    onUpdate(deltaTime, units) {}
    onUnitSurvive(unit) {}
    onUnitDeath(unit, units) {}
    onUnitSpawn(unit, units, waypoints) {}
}

export class ChangePosAug extends Augmentation {
    static meta = {
        name: '대격변',
        rarity: 'COMMON',
        desc: '타워들의 위치가 무작위로 변합니다.',
    }
    onAcquire() {
        const t = game.towers;
        for (let i = t.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [t[i], t[j]] = [t[j], t[i]];
        }
        game.relocateTowers?.();
    }
}

export class AutoOnlyAug extends Augmentation {
    static meta = {
        name: 'AI의 반란',
        rarity: 'COMMON',
        desc: '수동 출전이 불가능해지는 대신 골드를 1000 받습니다.',
        gold: 1000, // TODO: 수치조정
    }
    onAcquire() {
        game.gold += AutoOnlyAug.meta.gold;
    }
    onWaveStart(units) {
        game.manualSpawnDisabled = true;
        game.autoSpawn = true;
    }
}

export class TooManyIAug extends Augmentation {
    static meta = {
        name: '인해전술 I',
        rarity: 'UNCOMMON',
        family: '인해전술',
        desc: '유닛 슬롯이 1개 증가하는 대신 유닛의 받는 피해량이 15% 증가합니다.',
        slots: 1, dmgTakenBonus: 15,
    }
    onAcquire() {
        game.unitSlots += TooManyIAug.meta.slots;
        game.damageTakenBonus += TooManyIAug.meta.dmgTakenBonus;
    }
}

export class FastAug extends Augmentation {
    static meta = {
        name: '마법 신발',
        rarity: 'UNCOMMON',
        desc: '아군 전체의 최대 체력이 50% 감소하는 대신 속도가 100% 증가합니다.',
    }
    onWaveStart(units) {
        units.forEach(unit => { unit.maxHp *= 0.5; unit.speed *= 2; });
    }
}

export class TogetherIAug extends Augmentation {
    static meta = {
        name: '뭉쳐야 산다 I',
        rarity: 'UNCOMMON',
        family: '뭉쳐야 산다',
        desc: '유닛들이 주변에 있는 유닛 1명당 피해 감소 3%를 얻습니다. (최대 9%)',
        reductionPerUnit: 3, maxReduction: 9, radius: 60,
    }
    onUpdate(deltaTime, units) {
        const { reductionPerUnit, maxReduction, radius } = TogetherIAug.meta;
        const active = units.filter(u => u.active && u.alive);
        active.forEach(unit => {
            const nearby = active.filter(u => u !== unit && Math.hypot(u.x - unit.x, u.y - unit.y) <= radius).length;
            unit.proximityBonus += Math.min(maxReduction, nearby * reductionPerUnit);
        });
    }
}

export class GoldGoblinIAug extends Augmentation {
    static meta = {
        name: '황금 고블린 I',
        rarity: 'UNCOMMON',
        family: '황금 고블린',
        desc: '보유 골드 1000당 유닛들의 체력이 5% 증가합니다. (최대 20%)',
        goldPer: 1000, hpBonus: 5, maxBonus: 25,
    }
    onWaveStart(units) {
        const { goldPer, hpBonus, maxBonus } = GoldGoblinIAug.meta;
        const bonus = Math.min(maxBonus, Math.floor(game.gold / goldPer * hpBonus));
        if (bonus > 0) units.forEach(unit => { unit.maxHp *= (1 + bonus / 100); });
    }
}

export class TooManyIIAug extends Augmentation {
    static meta = {
        name: '인해전술 II',
        rarity: 'RARE',
        family: '인해전술',
        desc: '유닛 슬롯이 2개 증가하는 대신 유닛의 받는 피해량이 20% 증가합니다.',
        slots: 2, dmgTakenBonus: 20,
    }
    onAcquire() {
        game.unitSlots += TooManyIIAug.meta.slots;
        game.damageTakenBonus += TooManyIIAug.meta.dmgTakenBonus;
    }
}

export class AdaptIAug extends Augmentation {
    static meta = {
        name: '적응 I',
        rarity: 'RARE',
        family: '적응',
        desc: '유닛이 같은 타워에 연속으로 피격 시 받는 피해량이 5% 감소합니다. (최대 20%)',
    }
    onWaveStart(units) {
        units.forEach(unit => {
            unit.adaptReductionPerStack = (unit.adaptReductionPerStack || 0) + 5;
            unit.adaptMaxReduction      = (unit.adaptMaxReduction      || 0) + 20;
        });
    }
}

export class TogetherIIAug extends Augmentation {
    static meta = {
        name: '뭉쳐야 산다 II',
        rarity: 'RARE',
        family: '뭉쳐야 산다',
        desc: '유닛들이 주변에 있는 유닛 1명당 피해 감소 5%를 얻습니다. (최대 20%)',
        reductionPerUnit: 5, maxReduction: 20, radius: 60,
    }
    onUpdate(deltaTime, units) {
        const { reductionPerUnit, maxReduction, radius } = TogetherIIAug.meta;
        const active = units.filter(u => u.active && u.alive);
        active.forEach(unit => {
            const nearby = active.filter(u => u !== unit && Math.hypot(u.x - unit.x, u.y - unit.y) <= radius).length;
            unit.proximityBonus += Math.min(maxReduction, nearby * reductionPerUnit);
        });
    }
}

export class GoldGoblinIIAug extends Augmentation {
    static meta = {
        name: '황금 고블린 II',
        rarity: 'RARE',
        family: '황금 고블린',
        desc: '보유 골드 1000당 유닛들의 체력이 6% 증가합니다. (최대 60%)',
        goldPer: 1000, hpBonus: 6, maxBonus: 60,
    }
    onWaveStart(units) {
        const { goldPer, hpBonus, maxBonus } = GoldGoblinIIAug.meta;
        const bonus = Math.min(maxBonus, Math.floor(game.gold / goldPer * hpBonus));
        if (bonus > 0) units.forEach(unit => { unit.maxHp *= (1 + bonus / 100); });
    }
}

export class TooManyIIIAug extends Augmentation {
    static meta = {
        name: '인해전술 III',
        rarity: 'HERO',
        family: '인해전술',
        desc: '유닛 슬롯이 3개 증가하는 대신 유닛의 받는 피해량이 25% 증가합니다.',
        slots: 3, dmgTakenBonus: 25,
    }
    onAcquire() {
        game.unitSlots += TooManyIIIAug.meta.slots;
        game.damageTakenBonus += TooManyIIIAug.meta.dmgTakenBonus;
    }
}

export class BarrierAug extends Augmentation {
    static meta = {
        name: '주문 보호막',
        rarity: 'HERO',
        desc: '유닛 전체가 피해를 한번 막을 수 있는 보호막을 가지고 웨이브를 시작합니다.',
    }
    onWaveStart(units) {
        units.forEach(unit => { unit.shield = true; });
    }
}

const SHADOW_GAP = 20;

function shadowPosAt(waypoints, targetDist) {
    let cumDist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
        const dx = waypoints[i + 1].x - waypoints[i].x;
        const dy = waypoints[i + 1].y - waypoints[i].y;
        const segLen = Math.sqrt(dx * dx + dy * dy);
        if (cumDist + segLen >= targetDist) {
            const t = (targetDist - cumDist) / segLen;
            return { x: waypoints[i].x + dx * t, y: waypoints[i].y + dy * t, waypointIndex: i + 1, dist: targetDist };
        }
        cumDist += segLen;
    }
    return { x: waypoints[0].x, y: waypoints[0].y, waypointIndex: 1, dist: 0 };
}

export class ShadowIAug extends Augmentation {
    static meta = {
        name: '그림자분신 I',
        rarity: 'HERO',
        family: '그림자분신',
        desc: '모든 유닛이 체력의 60%를 가진 분신 2마리로 생성됩니다.',
        clones: 2, hpFactor: 0.6,
    }
    onUnitSpawn(unit, units, waypoints) {
        const { clones, hpFactor } = ShadowIAug.meta;
        unit.maxHp *= hpFactor;
        unit.hp = unit.maxHp;
        for (let i = 1; i < clones; i++) {
            const clone = Object.assign(Object.create(Object.getPrototypeOf(unit)), unit);
            const pos = shadowPosAt(waypoints, i * SHADOW_GAP);
            clone.x = pos.x; clone.y = pos.y;
            clone.waypointIndex = pos.waypointIndex;
            clone.distanceTraveled = pos.dist;
            units.push(clone);
        }
    }
}

export class SoloLevelingAug extends Augmentation {
    static meta = {
        name: '나 혼자만 레벨업',
        rarity: 'HERO',
        desc: '5웨이브 동안 유닛을 하나만 출전할 수 있습니다.\n대신 배치하는 유닛의 능력치가 크게 상승하며, 클리어 시 보상이 증가합니다.',
    }
    constructor() {
        super();
        this.wavesRemaining = 5;
        this.originalUnitSlots = null;
    }
    onAcquire() {
        this.originalUnitSlots = game.unitSlots;
        game.unitSlots = 1;
    }
    onWaveStart(units) {
        if (this.wavesRemaining <= 0) return;
        game.unitSlots = 1;
        units.splice(1); // 1번 슬롯부터 제거해 실제로 1유닛만 출전
        units.forEach(unit => {
            unit.maxHp *= 4;
            unit.hp = unit.maxHp;
            unit.soloRegen = true;
        });
    }
    onWaveClear(units) {
        if (this.wavesRemaining <= 0) return;
        game.gold += getReward() * 2;
        this.wavesRemaining--;
        if (this.wavesRemaining === 0 && this.originalUnitSlots !== null) {
            game.unitSlots = this.originalUnitSlots;
        }
    }
    onWaveFail(units) {
        if (this.wavesRemaining <= 0) return;
        this.wavesRemaining--;
        if (this.wavesRemaining === 0 && this.originalUnitSlots !== null) {
            game.unitSlots = this.originalUnitSlots;
        }
    }
    onUpdate(deltaTime, units) {
        if (this.wavesRemaining <= 0) return;
        units.filter(u => u.soloRegen && u.alive).forEach(unit => {
            unit.hp = Math.min(unit.maxHp, unit.hp + unit.maxHp * 0.05 * (deltaTime / 1000));
        });
    }
}

export class AdaptIIAug extends Augmentation {
    static meta = {
        name: '적응 II',
        rarity: 'HERO',
        family: '적응',
        desc: '유닛이 같은 타워에 연속으로 피격 시 받는 피해량이 6% 감소합니다. (최대 30%)',
    }
    onWaveStart(units) {
        units.forEach(unit => {
            unit.adaptReductionPerStack = (unit.adaptReductionPerStack || 0) + 6;
            unit.adaptMaxReduction      = (unit.adaptMaxReduction      || 0) + 30;
        });
    }
}

export class TooManyIVAug extends Augmentation {
    static meta = {
        name: '인해전술 IV',
        rarity: 'LEGEND',
        family: '인해전술',
        desc: '유닛 슬롯이 4개 증가하는 대신 유닛의 받는 피해량이 30% 증가합니다.',
        slots: 4, dmgTakenBonus: 30,
    }
    onAcquire() {
        game.unitSlots += TooManyIVAug.meta.slots;
        game.damageTakenBonus += TooManyIVAug.meta.dmgTakenBonus;
    }
}

export class AuthorityAug extends Augmentation {
    static meta = {
        name: '권능',
        rarity: 'LEGEND',
        desc: '유닛마다 1회에 한해 죽음에 이르는 공격을 받을 시 체력 1로 생존합니다.',
    }
    onWaveStart(units) {
        units.forEach(unit => { unit.undying = true; });
    }
}

export class ShadowIIAug extends Augmentation {
    static meta = {
        name: '그림자분신 II',
        rarity: 'LEGEND',
        family: '그림자분신',
        desc: '모든 유닛이 체력의 50%를 가진 분신 3마리로 생성됩니다.',
        clones: 3, hpFactor: 0.5,
    }
    onUnitSpawn(unit, units, waypoints) {
        const { clones, hpFactor } = ShadowIIAug.meta;
        unit.maxHp *= hpFactor;
        unit.hp = unit.maxHp;
        for (let i = 1; i < clones; i++) {
            const clone = Object.assign(Object.create(Object.getPrototypeOf(unit)), unit);
            const pos = shadowPosAt(waypoints, i * SHADOW_GAP);
            clone.x = pos.x; clone.y = pos.y;
            clone.waypointIndex = pos.waypointIndex;
            clone.distanceTraveled = pos.dist;
            units.push(clone);
        }
    }
}

export const AUGMENTATION_CLASSES = [
    ChangePosAug, AutoOnlyAug,
    TooManyIAug, FastAug, TogetherIAug, GoldGoblinIAug,
    TooManyIIAug, AdaptIAug, TogetherIIAug, GoldGoblinIIAug,
    TooManyIIIAug, BarrierAug, ShadowIAug, SoloLevelingAug, AdaptIIAug,
    TooManyIVAug, AuthorityAug, ShadowIIAug
];
export const AUGMENTATION_CLASS = Object.fromEntries(
    AUGMENTATION_CLASSES.map(Cls => [Cls.name, Cls])
);
