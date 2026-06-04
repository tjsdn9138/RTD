import { game, getReward, addGold, getFailReward, spendGold, MAX_UNIT_LEVEL, MAX_WAVES } from './state.js';
import { inventory, deploySlots, levelUpTower } from './game.js';
import { UNIT_CLASSES } from './units.js';
import { ITEM_CLASSES } from './items.js';

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
    onUnitHeal(unit, excess) {}
    onUnitHit(unit) {}
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

function applyFreeLevel(count) {
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
            if ('barPlus'       in meta) meta.barrier     += meta.barPlus;
            if ('maxPlus'       in meta) meta.maxHpPlus   += meta.maxPlus;
            if ('reductionPlus' in meta) meta.reduction   += meta.reductionPlus;
            if ('ignorePlus'    in meta) meta.ignoreNum   += meta.ignorePlus;
            if ('stopMinus'     in meta) meta.stopTime    = Math.max(0.5, parseFloat((meta.stopTime - meta.stopMinus).toFixed(2)));
        }

        if (meta.level >= MAX_UNIT_LEVEL) levelable.splice(idx, 1);
    }
}

function levelDownUnit(Cls) {
    const meta = Cls.meta;
    if (meta.level < 2) return false;
    if (meta.level % 5 === 0) {
        if ('defense'   in meta && 'defPlus'   in meta) meta.defense   -= meta.defPlus;
        if ('timePlus'  in meta)                         meta.time       = parseFloat((meta.time - meta.timePlus).toFixed(2));
        if ('dodgeProb' in meta && 'dodgePlus' in meta) meta.dodgeProb  = parseFloat(Math.max(0, meta.dodgeProb - meta.dodgePlus).toFixed(2));
        if ('heal'      in meta && 'healPlus'  in meta) meta.heal      -= meta.healPlus;
        if ('decDamage' in meta && 'decPlus'   in meta) meta.decDamage -= meta.decPlus;
        if ('returnPlus' in meta)                        meta.returnHp   = Math.max(0, meta.returnHp - meta.returnPlus);
        if ('splitPlus' in meta)                         meta.splitNum   = Math.max(1, meta.splitNum - meta.splitPlus);
        if ('dashMinus' in meta)                         meta.dashTime   = parseFloat((meta.dashTime + meta.dashMinus).toFixed(2));
        if ('barPlus'       in meta) meta.barrier   = Math.max(0, meta.barrier   - meta.barPlus);
        if ('maxPlus'       in meta) meta.maxHpPlus = Math.max(1, meta.maxHpPlus - meta.maxPlus);
        if ('reductionPlus' in meta) meta.reduction = Math.max(1, meta.reduction - meta.reductionPlus);
        if ('ignorePlus'    in meta) meta.ignoreNum = Math.max(1, meta.ignoreNum - meta.ignorePlus);
        if ('stopMinus'     in meta) meta.stopTime  = parseFloat((meta.stopTime  + meta.stopMinus).toFixed(2));
    }
    meta.hp    = Math.max(1, Math.floor(meta.hp    - meta.hpPlus));
    meta.speed = Math.max(1, Math.floor(meta.speed - meta.speedPlus));
    meta.level--;
    return true;
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

        const rewards = ['miss', 'slot', 'gold', 'unitTicket', 'itemTicket', 'levelup'];
        this.reward   = rewards[Math.floor(Math.random() * rewards.length)];

        switch (this.reward) {
            case 'miss':
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
    _applyFreeLevel(count) { applyFreeLevel(count); }
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

export class PrayAug extends Augmentation {
    static meta = {
        name: '기도',
        rarity: 'COMMON',
        desc: '10% 확률로 무작위 전설 등급 증강을 획득합니다.',
    }
    constructor() {
        super();
        this.rewardLabel = null;
    }
    onAcquire() {
        if (Math.random() >= 0.1) {
            this.rewardLabel = '결과: 기도를 들어줄 이는 존재하지 않았습니다...';
            return;
        }
        const ownedNames = new Set(game.augmentations.map(a => a.constructor.name));
        const pool = AUGMENTATION_CLASSES.filter(Cls =>
            Cls.meta.rarity === 'LEGEND' && !ownedNames.has(Cls.name) && !Cls.meta.chainOnly
        );
        if (!pool.length) {
            this.rewardLabel = '결과: 획득할 수 있는 전설 증강이 없습니다.';
            return;
        }
        const Cls = pool[Math.floor(Math.random() * pool.length)];
        const aug = new Cls();
        game.augmentations.push(aug);
        aug.onAcquire();
        this.rewardLabel = `결과: ${Cls.meta.name} 획득`;
    }
}

export class CountDownAug extends Augmentation {
    static meta = {
        name: '카운트다운',
        rarity: 'COMMON',
        desc: '카운트다운을 시작합니다.',
        chainOnly: true,
    }
}

export class CountVAug extends Augmentation {
    static meta = {
        name: '다섯',
        rarity: 'COMMON',
        desc: '유닛 뽑기권 55장과 아이템 뽑기권 5장을 얻습니다.',
        requires: 'CountDownAug',
        chainOnly: true,
    }
    onAcquire() {
        const unitSlot = inventory.find(i => i.type === 'UnitGachaTicket');
        const itemSlot = inventory.find(i => i.type === 'ItemGachaTicket');
        if (unitSlot) unitSlot.count += 55;
        if (itemSlot) itemSlot.count += 5;
    }
}

export class ContractAug extends Augmentation {
    static meta = {
        name: '계약',
        rarity: 'COMMON',
        desc: '계약을 시작합니다.\n잃는 것이 있다면 얻는 것도 있습니다.',
        chainOnly: true,
    }
}

export class ContractDoneAug extends Augmentation {
    static meta = {
        name: '계약 완료',
        rarity: 'COMMON',
        desc: '현재까지 한 계약에 비례한 보상을 얻습니다.',
        requires: 'ContractAug',
        chainOnly: true,
    }
    constructor() {
        super();
        this.rewardLabel = null;
    }
    onAcquire() {
        game.contractDone = true;

        // 획득한 계약 체인 증강(ContractI~V) 수집 후 등급별 그룹화
        const contractChain = game.augmentations.filter(aug =>
            aug.constructor.meta.requires === 'ContractAug' &&
            aug.constructor.name !== 'ContractDoneAug'
        );
        const byRarity = {};
        contractChain.forEach(aug => {
            const r = aug.constructor.meta.rarity;
            byRarity[r] = (byRarity[r] || 0) + 1;
        });

        // 각 등급별로 동일 등급 비체인 증강 2개 무작위 지급
        const ownedNames = new Set(game.augmentations.map(a => a.constructor.name));
        const rewards = [];
        Object.keys(byRarity).forEach(rarity => {
            const pool = AUGMENTATION_CLASSES.filter(Cls =>
                Cls.meta.rarity === rarity &&
                !ownedNames.has(Cls.name) &&
                !Cls.meta.chainOnly &&
                !Cls.meta.firstOnly &&
                (!Cls.meta.lifeOneOnly || game.lives === 1) &&
                (!Cls.meta.minLives || game.lives >= Cls.meta.minLives) &&
                (!Cls.meta.requires || ownedNames.has(Cls.meta.requires))
            );
            for (let i = 0; i < 2 && pool.length > 0; i++) {
                const idx = Math.floor(Math.random() * pool.length);
                const Cls = pool.splice(idx, 1)[0];
                const aug = new Cls();
                game.augmentations.push(aug);
                aug.onAcquire();
                ownedNames.add(Cls.name);
                rewards.push(Cls.meta.name);
            }
        });

        this.rewardLabel = rewards.length > 0
            ? `결과: ${rewards.join(', ')} 획득`
            : '결과: 획득 가능한 증강이 없습니다.';
    }
}

export class ContractIAug extends Augmentation {
    static meta = {
        name: '계약: 압류',
        rarity: 'COMMON',
        desc: '현재 보유한 모든 2레벨 이상의 유닛 및 아이템의 레벨이 1 감소합니다.',
        requires: 'ContractAug',
        chainOnly: true,
    }
    onAcquire() {
        UNIT_CLASSES.forEach(Cls => levelDownUnit(Cls));
        ITEM_CLASSES.forEach(Cls => {
            const meta = Cls.meta;
            if (!('level' in meta) || meta.level < 2) return;
            if ('multiplier' in meta) meta.multiplier = parseFloat((meta.multiplier - meta.LevelUpPlus).toFixed(4));
            else if ('bonus' in meta) meta.bonus -= meta.LevelUpPlus;
            meta.level--;
        });
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

export class FriendShieldIAug extends Augmentation {
    static meta = {
        name: '프렌드 실드 I',
        rarity: 'UNCOMMON',
        family: '프렌드 실드',
        desc: '유닛들이 주변에 있는 유닛 1명당 피해 감소 3%를 얻습니다. (최대 9%)',
        reductionPerUnit: 3, maxReduction: 9, radius: 60,
    }
    onUpdate(deltaTime, units) {
        const { reductionPerUnit, maxReduction, radius } = FriendShieldIAug.meta;
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

export class FirstAidKitIAug extends Augmentation {
    static meta = {
        name: '구급 상자 I',
        rarity: 'UNCOMMON',
        desc: '유닛들이 받는 회복량과 보호막이 20% 증가합니다.',
    }
    onWaveStart(units) {
        units.forEach(unit => {
            unit.healBonus   = (unit.healBonus   ?? 1) * 1.2;
            unit.shieldBonus = (unit.shieldBonus ?? 1) * 1.2;
        });
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

export class CountIVAug extends Augmentation {
    static meta = {
        name: '넷',
        rarity: 'UNCOMMON',
        desc: '무작위 유닛 4개를 레벨업 시킵니다.',
        requires: 'CountVAug',
        chainOnly: true,
    }
    onAcquire() {
        applyFreeLevel(4);
    }
}

export class SuperstitionAug extends Augmentation {
    static meta = {
        name: '미신',
        rarity: 'UNCOMMON',
        desc: '50% 확률로 모든 타워의 레벨이 1 감소합니다.\n50% 확률로 모든 타워의 레벨이 1 증가합니다.',
    }
    constructor() {
        super();
        this.rewardLabel = null;
    }
    onAcquire() {
        if (Math.random() < 0.5) {
            game.towers.forEach(tower => {
                if (!tower || tower.level <= 1) return;
                const meta = tower.constructor.meta;
                if (!meta) return;
                if (tower.level % 5 === 0) {
                    tower.attackSpeed = parseFloat((tower.attackSpeed - meta.speedPlus).toFixed(4));
                    tower.range       = Math.floor(tower.range       - meta.rangePlus);
                }
                tower.damage = Math.floor(tower.damage - meta.dmgPlus);
                tower.level--;
            });
            this.rewardLabel = '결과: 진실된 미신 — 모든 타워의 레벨이 1 감소했습니다.';
        } else {
            game.towers.forEach(tower => { if (tower) levelUpTower(tower); });
            this.rewardLabel = '결과: 거짓된 미신 — 모든 타워의 레벨이 1 증가했습니다.';
        }
    }
}

export class ContractIIAug extends Augmentation {
    static meta = {
        name: '계약: 임금체불',
        rarity: 'UNCOMMON',
        desc: '웨이브 클리어 골드가 20% 감소합니다.',
        requires: 'ContractAug',
        chainOnly: true,
    }
    onAcquire() {
        game.waveRewardMul = parseFloat((game.waveRewardMul * 0.8).toFixed(4));
    }
}

export class LifeInsuranceAug extends Augmentation {
    static meta = {
        name: '생명보험',
        rarity: 'UNCOMMON',
        desc: '생명을 잃을 때 획득하는 골드가 2배가 됩니다.',
    }
    onAcquire() {
        game.failGoldMul *= 2;
    }
}

export class LoneWolfIAug extends Augmentation {
    static meta = {
        name: '고독한 늑대 I',
        rarity: 'UNCOMMON',
        family: '고독한 늑대',
        desc: '유닛들이 주변에 다른 유닛이 없을 때 피해 감소 10%를 얻습니다.',
        reduction: 10, radius: 80,
    }
    onUpdate(deltaTime, units) {
        const { reduction, radius } = LoneWolfIAug.meta;
        const active = units.filter(u => u.active && u.alive);
        active.forEach(unit => {
            const alone = !active.some(u => u !== unit && Math.hypot(u.x - unit.x, u.y - unit.y) <= radius);
            if (alone) unit.proximityBonus += reduction;
        });
    }
}

export class RightLikeAug extends Augmentation {
    static meta = {
        name: '오른쪽이 좋아',
        rarity: 'UNCOMMON',
        desc: '남은 증강 선택 시 새로고침을 할 수 없으며 오른쪽 증강이 선택됩니다.\n버려진 증강의 등급에 따라 골드를 획득합니다.',
    }
    onAcquire() {
        game.rightLikeActive = true;
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

export class FriendShieldIIAug extends Augmentation {
    static meta = {
        name: '프렌드 실드 II',
        rarity: 'RARE',
        family: '프렌드 실드',
        desc: '유닛들이 주변에 있는 유닛 1명당 피해 감소 5%를 얻습니다. (최대 20%)',
        reductionPerUnit: 5, maxReduction: 20, radius: 60,
    }
    onUpdate(deltaTime, units) {
        const { reductionPerUnit, maxReduction, radius } = FriendShieldIIAug.meta;
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
        desc: '마지막으로 살아남은 유닛의 받는 피해량이 20% 감소합니다.',
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

export class RandomAug extends Augmentation {
    static meta = {
        name: '무작위 증강',
        rarity: 'RARE',
        desc: '무작위 증강을 획득합니다.',
    }
    constructor() {
        super();
        this.rewardLabel = null;
    }
    onAcquire() {
        const ownedNames = new Set(game.augmentations.map(a => a.constructor.name));
        const pool = AUGMENTATION_CLASSES.filter(Cls =>
            Cls !== RandomAug && !ownedNames.has(Cls.name) && !Cls.meta.chainOnly
        );
        if (!pool.length) {
            this.rewardLabel = '결과: 획득할 수 있는 증강이 없습니다.';
            return;
        }
        const rarities = [...new Set(pool.map(Cls => Cls.meta.rarity))];
        const rarity   = rarities[Math.floor(Math.random() * rarities.length)];
        const candidates = pool.filter(Cls => Cls.meta.rarity === rarity);
        const Cls = candidates[Math.floor(Math.random() * candidates.length)];
        const aug = new Cls();
        game.augmentations.push(aug);
        aug.onAcquire();
        this.rewardLabel = `결과: ${Cls.meta.name} 획득`;
    }
}

export class ATMAug extends Augmentation {
    static meta = {
        name: 'ATM',
        rarity: 'RARE',
        desc: '유닛 피격 시 유닛 최대 체력의 10%만큼 골드를 획득합니다.',
    }
    onUnitHit(unit) {
        const gold = Math.floor(unit.maxHp * 10 / 100);
        if (gold > 0) addGold(gold);
    }
}

export class CountIIIAug extends Augmentation {
    static meta = {
        name: '셋',
        rarity: 'RARE',
        desc: '다음 웨이브 획득 보상이 3배가 됩니다.',
        requires: 'CountIVAug',
        chainOnly: true,
    }
    constructor() {
        super();
        this.done = false;
    }
    onWaveClear(units) {
        if (this.done) return;
        game.nextWaveRewardMul = 3;
        this.done = true;
    }
}

export class ContractIIIAug extends Augmentation {
    static meta = {
        name: '계약: 몰수',
        rarity: 'RARE',
        desc: '현재 보유한 골드를 모두 잃습니다.',
        requires: 'ContractAug',
        chainOnly: true,
    }
    onAcquire() {
        spendGold(game.gold);
    }
}

export class LittleHopeAug extends Augmentation {
    static meta = {
        name: '일말의 희망',
        rarity: 'RARE',
        desc: '생명을 1개 획득합니다.',
        lifeOneOnly: true,
    }
    onAcquire() {
        game.lives++;
    }
}

export class HitReadyAug extends Augmentation {
    static meta = {
        name: '맞을 준비',
        rarity: 'RARE',
        desc: '3초 동안 피해를 입지 않으면 최대 체력의 15% 보호막을 얻습니다.',
        delay: 3, shieldPct: 15,
    }
    onWaveStart(units) {
        units.forEach(unit => { unit.hitReadyTimer = 0; });
    }
    onUnitHit(unit) {
        unit.hitReadyTimer = 0;
    }
    onUpdate(deltaTime, units) {
        const { delay, shieldPct } = HitReadyAug.meta;
        units.filter(u => u.active && u.alive).forEach(unit => {
            if (unit.shieldHp > 0) {
                unit.hitReadyTimer = 0;
                return;
            }
            unit.hitReadyTimer = (unit.hitReadyTimer ?? 0) + deltaTime / 1000;
            if (unit.hitReadyTimer >= delay) {
                const amount = Math.floor(unit.maxHp * shieldPct / 100 * (unit.shieldBonus ?? 1));
                unit.shieldHp  = amount;
                unit.shieldMax = Math.max(unit.shieldMax, amount);
                unit.hitReadyTimer = 0;
            }
        });
    }
}

export class LoneWolfIIAug extends Augmentation {
    static meta = {
        name: '고독한 늑대 II',
        rarity: 'RARE',
        family: '고독한 늑대',
        desc: '유닛들이 주변에 다른 유닛이 없을 때 피해 감소 15%를 얻습니다.',
        reduction: 15, radius: 80,
    }
    onUpdate(deltaTime, units) {
        const { reduction, radius } = LoneWolfIIAug.meta;
        const active = units.filter(u => u.active && u.alive);
        active.forEach(unit => {
            const alone = !active.some(u => u !== unit && Math.hypot(u.x - unit.x, u.y - unit.y) <= radius);
            if (alone) unit.proximityBonus += reduction;
        });
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
            unit.maxHp *= 3;
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

export class FirstAidKitIIAug extends Augmentation {
    static meta = {
        name: '구급 상자 II',
        rarity: 'EPIC',
        desc: '유닛들이 받는 회복량과 보호막이 50% 증가합니다.',
    }
    onWaveStart(units) {
        units.forEach(unit => {
            unit.healBonus   = (unit.healBonus   ?? 1) * 1.5;
            unit.shieldBonus = (unit.shieldBonus ?? 1) * 1.5;
        });
    }
}

export class ManyGoodAug extends Augmentation {
    static meta = {
        name: '다다익선',
        rarity: 'EPIC',
        desc: '유닛들이 체력 회복 초과분을 보호막으로 얻습니다. (최대 20%)',
    }
    onWaveStart(units) {
        units.forEach(unit => {
            unit.shieldMax = Math.floor(unit.maxHp * 0.2);
        });
    }
    onUnitHeal(unit, excess) {
        if (unit.shieldMax <= 0) return;
        unit.shieldHp = Math.min(unit.shieldMax, unit.shieldHp + excess * (unit.shieldBonus ?? 1));
    }
}

export class CountIIAug extends Augmentation {
    static meta = {
        name: '둘',
        rarity: 'EPIC',
        desc: '2초마다 체력이 가장 적은 유닛 2마리의 체력을 20% 회복시킵니다.',
        requires: 'CountIIIAug',
        chainOnly: true,
    }
    constructor() {
        super();
        this.healTimer = 0;
    }
    onWaveStart(units) {
        this.healTimer = 0;
    }
    onUpdate(deltaTime, units) {
        this.healTimer += deltaTime / 1000;
        if (this.healTimer < 2) return;
        this.healTimer -= 2;
        const alive = units.filter(u => u.active && u.alive);
        if (!alive.length) return;
        const sorted = [...alive].sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        sorted.slice(0, 2).forEach(unit => {
            unit.hp = Math.min(unit.maxHp, unit.hp + unit.maxHp * 0.2 * (unit.healBonus ?? 1));
        });
    }
}

export class HackingAug extends Augmentation {
    static meta = {
        name: '해킹',
        rarity: 'EPIC',
        desc: '웨이브 시작 시 60% 확률로 10초간 랜덤한 타워 하나를 멈춥니다.\n유닛이 하나라도 통과하면 해킹이 풀립니다.',
    }
    constructor() {
        super();
        this.hackedTower  = null;
        this.hackTimer    = 0;
        this.firstSpawned = false;
    }
    onWaveStart(units) {
        this.hackedTower  = null;
        this.hackTimer    = 0;
        this.firstSpawned = false;
        if (Math.random() >= 0.6) return;
        const candidates = game.towers.filter(t => t && !t.stopped);
        if (!candidates.length) return;
        this.hackedTower = candidates[Math.floor(Math.random() * candidates.length)];
    }
    onUnitSpawn(unit, units, waypoints) {
        if (this.firstSpawned || !this.hackedTower) return;
        this.firstSpawned = true;
        this.hackedTower.stopped = true;
        this.hackTimer = 10;
    }
    onUpdate(deltaTime, units) {
        if (!this.hackedTower || this.hackTimer <= 0) return;
        this.hackTimer -= deltaTime / 1000;
        if (this.hackTimer <= 0) {
            this.hackedTower.stopped = false;
            this.hackedTower = null;
        }
    }
    onUnitSurvive(unit, units) {
        if (!this.hackedTower) return;
        this.hackedTower.stopped = false;
        this.hackedTower = null;
        this.hackTimer = 0;
    }
}

export class ContractIVAug extends Augmentation {
    static meta = {
        name: '계약: 과로',
        rarity: 'EPIC',
        desc: '모든 타워의 레벨이 1 증가합니다.',
        requires: 'ContractAug',
        chainOnly: true,
    }
    onAcquire() {
        game.towers.forEach(t => { if (t) levelUpTower(t); });
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
    onWaveStart(units) {
        units.forEach(unit => { unit.statusImmune = true; });
    }
}

export class BarrierAug extends Augmentation {
    static meta = {
        name: '주문 보호막',
        rarity: 'LEGEND',
        desc: '유닛 전체가 피해를 한번 막을 수 있는 보호막을 가지고 웨이브를 시작합니다.',
    }
    onWaveStart(units) {
        units.forEach(unit => { unit.shield = true; });
    }
}

export class RevengeAug extends Augmentation {
    static meta = {
        name: '복수',
        rarity: 'LEGEND',
        desc: '유닛 사망 시 다른 유닛들의 속도가 1초간 20% 증가합니다. (중첩 X)',
    }
    onUnitDeath(unit, units) {
        units.forEach(u => {
            if (!u.active || !u.alive || u === unit) return;
            u.hasteTimer  = 1.0;
            u.hasteFactor = 20;
        });
    }
}

export class CountIAug extends Augmentation {
    static meta = {
        name: '하나',
        rarity: 'LEGEND',
        desc: '레벨이 가장 높은 타워 하나를 부숩니다.',
        requires: 'CountIIAug',
        chainOnly: true,
    }
    onAcquire() {
        let maxLevel = -Infinity;
        let maxIdx = -1;
        game.towers.forEach((t, i) => {
            if (t && t.level > maxLevel) { maxLevel = t.level; maxIdx = i; }
        });
        if (maxIdx !== -1) {
            game.towers[maxIdx] = null;
            game.relocateTowers?.();
        }
    }
}

export class CounterAttackAug extends Augmentation {
    static meta = {
        name: '반격',
        rarity: 'LEGEND',
        desc: '유닛 피격 시 10% 확률로 1초간 무적이 됩니다.',
    }
    onUnitHit(unit) {
        if (Math.random() >= 0.1) return;
        unit.invincibleTimer = 1.0;
    }
}

export class ContractVAug extends Augmentation {
    static meta = {
        name: '계약: 착취',
        rarity: 'LEGEND',
        desc: '생명이 2개 감소한다.\n유닛들이 더이상 보호막을 얻을 수 없고, 체력을 회복할 수 없습니다.',
        requires: 'ContractAug',
        chainOnly: true,
        minLives: 3,
    }
    onAcquire() {
        game.lives = Math.max(1, game.lives - 2);
    }
    onWaveStart(units) {
        units.forEach(unit => {
            unit.noHeal   = true;
            unit.shieldHp  = 0;
            unit.shieldMax = 0;
            unit.shield    = false;
        });
    }
    onUnitSpawn(unit) {
        unit.noHeal   = true;
        unit.shieldHp  = 0;
        unit.shieldMax = 0;
        unit.shield    = false;
    }
    onUpdate(deltaTime, units) {
        units.filter(u => u.active && u.alive).forEach(unit => {
            if (unit.shieldHp  > 0) unit.shieldHp  = 0;
            if (unit.shieldMax > 0) unit.shieldMax = 0;
            if (unit.shield)        unit.shield    = false;
        });
    }
}

export const AUGMENTATION_CLASSES = [
    ChangePosAug, AutoOnlyAug, LifeGambleAug, HesitationAug, PrayAug, CountDownAug, CountVAug, ContractAug, ContractDoneAug, ContractIAug,
    TooManyIAug, FastAug, FriendShieldIAug, GoldGoblinIAug, FirstAidKitIAug, InterestAug, CountIVAug, SuperstitionAug, ContractIIAug, LifeInsuranceAug, LoneWolfIAug, RightLikeAug,
    TooManyIIAug, AdaptIAug, FriendShieldIIAug, GoldGoblinIIAug, VanguardAug, LastStandingAug, RandomAug, ATMAug, CountIIIAug, ContractIIIAug, LittleHopeAug, HitReadyAug, LoneWolfIIAug,
    TooManyIIIAug, SoloLevelingAug, AdaptIIAug, SacrificeAug, MoraleBoostAug, FirstAidKitIIAug, ManyGoodAug, CountIIAug, HackingAug, ContractIVAug,
    TooManyIVAug, AuthorityAug, ShadowAug, IndomitableAug, BarrierAug, RevengeAug, CountIAug, CounterAttackAug, ContractVAug,
];
export const AUGMENTATION_CLASS = Object.fromEntries(
    AUGMENTATION_CLASSES.map(Cls => [Cls.name, Cls])
);
