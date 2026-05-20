import { game, getReward, addGold, getFailReward, MAX_UNIT_LEVEL, MAX_WAVES } from './state.js';
import { inventory, deploySlots } from './game.js';
import { UNIT_CLASSES } from './units.js';

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
    onUnitSurvive(unit, units) {}
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
        desc: '수동 출전이 불가능해지는 대신 골드를 3000 받습니다.',
        gold: 3000, // TODO: 수치조정
    }
    onAcquire() {
        addGold(AutoOnlyAug.meta.gold);
    }
    onWaveStart(units) {
        game.manualSpawnDisabled = true;
        game.autoSpawn = true;
    }
}

export class LifeGambleAug extends Augmentation {
    static meta = {
        name: '목숨을 건 도박',
        rarity: 'COMMON',
        desc: '남은 생명이 1개가 됩니다.\n대신 잃은 생명에 비례한 랜덤한 보상을 얻습니다.',
    }
    constructor() {
        super();
        this.reward      = null;
        this.lostLives   = 0;
        this.rewardLabel = null;
    }
    onAcquire() {
        const lost = Math.max(0, game.lives - 1);
        game.lives     = 1;
        this.lostLives = lost;

        if (lost === 0) {
            this.reward      = 'none';
            this.rewardLabel = '결과: (생명이 이미 1개)';
            return;
        }

        const rewards = ['꽝', 'slot', 'gold', 'unitTicket', 'itemTicket', 'levelup'];
        this.reward   = rewards[Math.floor(Math.random() * rewards.length)];

        switch (this.reward) {
            case '꽝':
                this.rewardLabel = '결과: 도박을 하다 보면 잃는 때도 있는 법이죠...';
                break;
            case 'slot':
                game.unitSlots += lost;
                game.augSlots  += lost;
                this.rewardLabel = `결과: 유닛 슬롯 +${lost}개`;
                break;
            case 'gold': {
                const tiers = [2, 1.5, 1, 0.5];
                const count = lost * tiers[Math.floor(Math.random() * tiers.length)];
                const amount = Math.floor(getFailReward() * count);
                addGold(amount);
                this.rewardLabel = `결과: 골드 +${amount}`;
                break;
            }
            case 'unitTicket': {
                const tiers = [80, 40, 20, 10];
                const count = lost * tiers[Math.floor(Math.random() * tiers.length)];
                const slot  = inventory.find(i => i.type === 'UnitGachaTicket');
                if (slot) slot.count += count;
                this.rewardLabel = `결과: 유닛 뽑기권 +${count}장`;
                break;
            }
            case 'itemTicket': {
                const tiers = [20, 15, 10, 5];
                const count = lost * tiers[Math.floor(Math.random() * tiers.length)];
                const slot  = inventory.find(i => i.type === 'ItemGachaTicket');
                if (slot) slot.count += count;
                this.rewardLabel = `결과: 아이템 뽑기권 +${count}장`;
                break;
            }
            case 'levelup':
                this._applyFreeLevel(lost);
                this.rewardLabel = `결과: 랜덤 유닛 레벨업 ${lost}회`;
                break;
        }
    }
    _applyFreeLevel(count) {
        const levelable = UNIT_CLASSES.filter(Cls => Cls.meta.level < MAX_UNIT_LEVEL);
        for (let i = 0; i < count; i++) {
            if (!levelable.length) break;
            const idx  = Math.floor(Math.random() * levelable.length);
            const meta = levelable[idx].meta;

            meta.hp    = Math.floor(meta.hp    + meta.hpPlus);
            meta.speed = Math.floor(meta.speed + meta.speedPlus);
            meta.level++;

            if (meta.level % 5 === 0) {
                if ('defense'    in meta) meta.defense    += meta.defPlus;
                if ('timePlus'   in meta) meta.time        = parseFloat((meta.time + meta.timePlus).toFixed(2));
                if ('dodgeProb'  in meta) meta.dodgeProb   = parseFloat(Math.min(100, meta.dodgeProb + meta.dodgePlus).toFixed(2));
                if ('heal'       in meta) meta.heal        += meta.healPlus;
                if ('decDamage'  in meta) meta.decDamage   += meta.decPlus;
                if ('returnPlus' in meta) meta.returnHp    = Math.min(100, meta.returnHp + meta.returnPlus);
                if ('splitPlus'  in meta) meta.splitNum    += meta.splitPlus;
                if ('dashMinus'  in meta) meta.dashTime    = Math.max(0.1, parseFloat((meta.dashTime - meta.dashMinus).toFixed(2)));
            }

            if (meta.level >= MAX_UNIT_LEVEL) levelable.splice(idx, 1);
        }
    }
}

export class HesitationAug extends Augmentation {
    static meta = {
        name: '우유부단',
        rarity: 'COMMON',
        get desc() { return `${getReward()}골드 획득 및 3웨이브 후 증강을 선택합니다.`; },
    }
    onAcquire() {
        addGold(getReward());
        const targetWave = game.waveNumber + 3;
        if (targetWave <= MAX_WAVES && !game.augWaves.includes(targetWave)) {
            game.augWaves.push(targetWave);
        }
    }
}

export class TooManyIAug extends Augmentation {
    static meta = {
        name: '인해전술 I',
        rarity: 'UNCOMMON',
        family: '인해전술',
        desc: '유닛 슬롯이 1개 증가하는 대신 유닛의 받는 피해량이 5% 증가합니다.',
        slots: 1, dmgTakenBonus: 5,
    }
    onAcquire() {
        game.unitSlots += TooManyIAug.meta.slots;
        game.augSlots  += TooManyIAug.meta.slots;
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
        units.forEach(unit => { unit.maxHp *= 0.5; unit.hp = unit.maxHp; unit.speed *= 2; });
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
        goldPer: 1000, hpBonus: 5, maxBonus: 20,
    }
    onWaveStart(units) {
        const { goldPer, hpBonus, maxBonus } = GoldGoblinIAug.meta;
        const bonus = Math.min(maxBonus, Math.floor(game.gold / goldPer * hpBonus));
        if (bonus > 0) units.forEach(unit => { unit.maxHp *= (1 + bonus / 100); });
    }
}

export class FirstAidKitAug extends Augmentation {
    static meta = {
        name: '구급 상자',
        rarity: 'UNCOMMON',
        desc: '유닛들이 받는 회복량이 20% 증가합니다.',
    }
    onWaveStart(units) {
        units.forEach(unit => { unit.healBonus = (unit.healBonus ?? 1) * 1.2; });
    }
}

export class InterestAug extends Augmentation {
    static meta = {
        name: '이자',
        rarity: 'UNCOMMON',
        desc: '획득하는 모든 골드가 5% 증가합니다.',
    }
    onAcquire() {
        game.goldBonusPct += 5;
    }
}

export class TooManyIIAug extends Augmentation {
    static meta = {
        name: '인해전술 II',
        rarity: 'RARE',
        family: '인해전술',
        desc: '유닛 슬롯이 2개 증가하는 대신 유닛의 받는 피해량이 10% 증가합니다.',
        slots: 2, dmgTakenBonus: 10,
    }
    onAcquire() {
        game.unitSlots += TooManyIIAug.meta.slots;
        game.augSlots  += TooManyIIAug.meta.slots;
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

export class VanguardAug extends Augmentation {
    static meta = {
        name: '선봉대',
        rarity: 'RARE',
        desc: '가장 앞에 있는 유닛의 받는 피해량이 10% 감소합니다.',
    }
    onUpdate(deltaTime, units) {
        const active = units.filter(u => u.active && u.alive);
        if (!active.length) return;

        let vanguard = null;
        let maxProg = -Infinity;
        active.forEach(u => {
            const wp = u.waypoints[u.waypointIndex];
            const prog = u.waypointIndex * 100000 - (wp ? Math.hypot(wp.x - u.x, wp.y - u.y) : 0);
            if (prog > maxProg) { maxProg = prog; vanguard = u; }
        });

        if (vanguard) vanguard.proximityBonus += 10;
    }
}

export class LastStandingAug extends Augmentation {
    static meta = {
        name: '최후의 저항',
        rarity: 'RARE',
        desc: '마지막으로 살아남은 유닛의 받는 피해량이 10% 감소합니다.',
    }
    constructor() {
        super();
        this.totalToDeploy   = 0;
        this.deployedCount   = 0;
    }
    onWaveStart(units) {
        this.totalToDeploy = deploySlots.filter(s => s !== null).length;
        this.deployedCount = 0;
    }
    onUnitSpawn(unit, units, waypoints) {
        this.deployedCount++;
    }
    onUpdate(deltaTime, units) {
        if (this.deployedCount < this.totalToDeploy) return;
        const alive = units.filter(u => u.active && u.alive);
        if (alive.length !== 1) return;
        alive[0].proximityBonus += 10;
    }
}

export class TooManyIIIAug extends Augmentation {
    static meta = {
        name: '인해전술 III',
        rarity: 'EPIC',
        family: '인해전술',
        desc: '유닛 슬롯이 3개 증가하는 대신 유닛의 받는 피해량이 15% 증가합니다.',
        slots: 3, dmgTakenBonus: 15,
    }
    onAcquire() {
        game.unitSlots += TooManyIIIAug.meta.slots;
        game.augSlots  += TooManyIIIAug.meta.slots;
        game.damageTakenBonus += TooManyIIIAug.meta.dmgTakenBonus;
    }
}

export class BarrierAug extends Augmentation {
    static meta = {
        name: '주문 보호막',
        rarity: 'EPIC',
        desc: '유닛 전체가 피해를 한번 막을 수 있는 보호막을 가지고 웨이브를 시작합니다.',
    }
    onWaveStart(units) {
        units.forEach(unit => { unit.shield = true; });
    }
}

export class SoloLevelingAug extends Augmentation {
    static meta = {
        name: '나 혼자만 레벨업',
        rarity: 'EPIC',
        desc: '5웨이브 동안 유닛을 하나만 출전할 수 있습니다.\n대신 배치하는 유닛의 능력치가 크게 상승하며, 클리어 시 보상이 증가합니다.',
        firstOnly: true,
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
        addGold(getReward() * 2);
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
        rarity: 'EPIC',
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

export class SacrificeAug extends Augmentation {
    static meta = {
        name: '희생',
        rarity: 'EPIC',
        desc: '유닛 사망 시 다른 모든 유닛들이 체력을 10% 회복합니다.',
    }
    onUnitDeath(unit, units) {
        units.forEach(u => {
            if (!u.active || !u.alive || u === unit) return;
            u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.1 * (u.healBonus ?? 1));
        });
    }
}

export class MoraleBoostAug extends Augmentation {
    static meta = {
        name: '사기진작',
        rarity: 'EPIC',
        desc: '유닛 통과 시 다른 모든 유닛들이 체력을 10% 회복합니다.',
    }
    onUnitSurvive(unit, units) {
        units.forEach(u => {
            if (!u.active || !u.alive || u === unit) return;
            u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.1 * (u.healBonus ?? 1));
        });
    }
}

export class TooManyIVAug extends Augmentation {
    static meta = {
        name: '인해전술 IV',
        rarity: 'LEGEND',
        family: '인해전술',
        desc: '유닛 슬롯이 4개 증가하는 대신 유닛의 받는 피해량이 20% 증가합니다.',
        slots: 4, dmgTakenBonus: 20,
    }
    onAcquire() {
        game.unitSlots += TooManyIVAug.meta.slots;
        game.augSlots  += TooManyIVAug.meta.slots;
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

export class ShadowAug extends Augmentation {
    static meta = {
        name: '그림자분신',
        rarity: 'LEGEND',
        desc: '모든 유닛이 체력의 40%를 가진 분신 2마리로 생성됩니다.',
        clones: 2, hpFactor: 0.4,
    }
    onUnitSpawn(unit, units, waypoints) {
        const { clones, hpFactor } = ShadowAug.meta;
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

export class IndomitableAug extends Augmentation {
    static meta = {
        name: '불굴',
        rarity: 'LEGEND',
        desc: '모든 유닛이 모든 상태이상에 면역이 됩니다.',
    }
    onUpdate(deltaTime, units) {
        units.forEach(unit => {
            if (!unit.active || !unit.alive) return;
            if (unit.isPoisoned) { unit.isPoisoned = false; unit.poisonTimer = 0; unit.poisonDps = 0; }
            if (unit.isSlowed)   { unit.isSlowed = false; unit.slowTimer = 0; unit.slowFactor = 0; }
            if (unit.isStunned)  { unit.isStunned = false; unit.stunTimer = 0; }
        });
    }
}

export const AUGMENTATION_CLASSES = [
    ChangePosAug, AutoOnlyAug, LifeGambleAug, HesitationAug,
    TooManyIAug, FastAug, TogetherIAug, GoldGoblinIAug, FirstAidKitAug, InterestAug,
    TooManyIIAug, AdaptIAug, TogetherIIAug, GoldGoblinIIAug, VanguardAug, LastStandingAug,
    TooManyIIIAug, BarrierAug, SoloLevelingAug, AdaptIIAug, SacrificeAug, MoraleBoostAug,
    TooManyIVAug, AuthorityAug, ShadowAug, IndomitableAug,
];
export const AUGMENTATION_CLASS = Object.fromEntries(
    AUGMENTATION_CLASSES.map(Cls => [Cls.name, Cls])
);
