import { game } from './state.js';

export class Tower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.level = 1;
        this.range = 200;
        this.damage = 100;
        this.attackSpeed = 1; // (1 / attackSpeed)로 시간 계산
        this.attackTimer = 0; // 마지막으로 공격한 이후로의 시간
        this.color = '#e67e22';
        this.stopped = false;
    }

    // 유닛과의 직선 거리 계산
    getDistance(unit) { 
        const dx = unit.x - this.x;
        const dy = unit.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 우선순위 계산
    getProgress(unit) {
        if (!unit.waypoints.length) return 0;
        const target = unit.waypoints[unit.waypointIndex];
        if (!target) return unit.waypointIndex * 100000;
        
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const distToNext = Math.sqrt(dx * dx + dy * dy);

        // 인덱스가 클수록 높고, 같은 인덱스면 남은 거리가 짧을수록 높음
        return unit.waypointIndex * 100000 - distToNext;
    }

    // 타워 정보 갱신
    update(deltaTime, units) {
        // 타워 정지 사용 시 공격 X
        if (this.stopped) return;

        // attackTimer 계산 후 공속보다 느리면 공격 X
        this.attackTimer += deltaTime / 1000;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        let target = null;
        let maxProgress = -Infinity;
        let hasTaunt = false; // 도발 패시브를 가진 유닛의 사거리 내 존재여부

        units.forEach(unit => {
            // 유닛이 죽거나 통과한 경우
            if (!unit.active || !unit.alive) return;
            if (unit.isInvisible) return;
            // 사거리 밖인 경우
            if (this.getDistance(unit) > this.range) return;

            const progress = this.getProgress(unit);

            // 유닛이 도발 패시브를 가진 경우
            if (unit.taunting) {
                if (!hasTaunt || progress > maxProgress) {
                    hasTaunt = true;
                    maxProgress = progress;
                    target = unit;
                }
                return;
            }

            if (!hasTaunt && progress > maxProgress) {
                maxProgress = progress;
                target = unit;
            }
        });

        // 타겟 존재 시 공격
        if (target) {
            target.takeDamage(this.getDamage(target), units);
            attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.25 });
            this.attackTimer = 0;
        }
    }

    getDamage(target) {
        return this.damage;
    }
}

export class NormalTower extends Tower {
    static meta = {
        name: '일반 타워', rarity: 'COMMON',
        damage: 100, attackSpeed: 1, range: 200,
        damageMul: 1.1, speedMul: 1.1, rangeMul: 1.2,
        passive: null, passiveDesc: null,
    };
    constructor(x, y) {
        super(x, y);
        this.damage      = NormalTower.meta.damage;
        this.range       = NormalTower.meta.range;
        this.attackSpeed = NormalTower.meta.attackSpeed;
        this.color       = '#e67e22';
    }
}

export class HeavyTower extends Tower {
    static meta = {
        name: '한방 타워', rarity: 'COMMON',
        damage: 220, attackSpeed: 0.5, range: 160,
        damageMul: 1.1, speedMul: 1.05, rangeMul: 1.3,
        passive: null, passiveDesc: null,
    };
    constructor(x, y) {
        super(x, y);
        this.damage      = HeavyTower.meta.damage;
        this.range       = HeavyTower.meta.range;
        this.attackSpeed = HeavyTower.meta.attackSpeed;
        this.color       = '#c0392b';
    }
}

export class FastTower extends Tower {
    static meta = {
        name: '빠른 타워', rarity: 'COMMON',
        damage: 40, attackSpeed: 2, range: 240,
        damageMul: 1.1, speedMul: 1, rangeMul: 1.1,
        passive: null, passiveDesc: null,
    };
    constructor(x, y) {
        super(x, y);
        this.damage      = FastTower.meta.damage;
        this.range       = FastTower.meta.range;
        this.attackSpeed = FastTower.meta.attackSpeed;
        this.color       = '#27ae60';
    }
}

export class SkyTower extends Tower {
    static meta = {
        name: '공중 타워', rarity: 'UNCOMMON',
        damage: 60, attackSpeed: 1.2, range: 240,
        damageMul: 1.1, speedMul: 1, rangeMul: 1.1,
        passive: '공중', skyMul : 2,
        passiveDesc: (mul) => `비행 유닛을 공격 시 데미지가 ${mul}배 증가합니다.`,
    };
    constructor(x, y) {
        super(x, y);
        this.damage      = SkyTower.meta.damage;
        this.range       = SkyTower.meta.range;
        this.attackSpeed = SkyTower.meta.attackSpeed;
        this.color       = '#1a7abf';
    }

    getDamage(target) {
        return target.isFlying ? this.damage * SkyTower.meta.skyMul : this.damage;
    }
}

export class AreaTower extends Tower {
    static meta = {
        name: '전방위 타워', rarity: 'RARE',
        damage: 30, attackSpeed: 1, range: 120,
        damageMul: 1.1, speedMul: 1, rangeMul: 1.1,
        passive: '전방위',
        passiveDesc: '범위 내 모든 적을 동시에 공격합니다.',
    };
    constructor(x, y) {
        super(x, y);
        this.damage      = AreaTower.meta.damage;
        this.range       = AreaTower.meta.range;
        this.attackSpeed = AreaTower.meta.attackSpeed;
        this.color       = '#8e44ad';
    }

    // 범위 내 모든 적 공격
    update(deltaTime, units) {
        if (this.stopped) return;
        this.attackTimer += deltaTime / 1000;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        let attacked = false;

        units.forEach(unit => {
            if (!unit.active || !unit.alive) return;
            if (unit.isInvisible) return;
            if (this.getDistance(unit) > this.range) return;
            unit.takeDamage(this.getDamage(unit), units);
            attackFlashes.push({ x1: this.x, y1: this.y, x2: unit.x, y2: unit.y, color: this.color, timer: 0, duration: 0.2 });
            attacked = true;
        });

        if (attacked) this.attackTimer = 0;
    }
}

export class SniperTower extends Tower {
    static meta = {
        name: '저격 타워', rarity: 'HERO',
        damage: 500, attackSpeed: 0.1, range: 400,
        damageMul: 1.1, speedMul: 1, rangeMul: 1.1,
        passive: '저격',
        passiveDesc: '체력이 가장 낮은 적을 우선 공격하며,\nHP 10% 이하의 적을 즉시 처형합니다.',
    };
    constructor(x, y) {
        super(x, y);
        this.damage      = SniperTower.meta.damage;
        this.range       = SniperTower.meta.range;
        this.attackSpeed = SniperTower.meta.attackSpeed;
        this.color       = '#2c3e50';
    }

    // 체력 가장 낮은 유닛 우선 타겟
    update(deltaTime, units) {
        if (this.stopped) return;
        this.attackTimer += deltaTime / 1000;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        let target = null;
        let minHpRatio = Infinity;

        units.forEach(unit => {
            if (!unit.active || !unit.alive) return;
            if (unit.isInvisible) return;
            if (this.getDistance(unit) > this.range) return;

            const hpRatio = unit.hp / unit.maxHp;
            if (hpRatio < minHpRatio) {
                minHpRatio = hpRatio;
                target = unit;
            }
        });

        if (target) {
            target.takeDamage(this.getDamage(target), units);
            attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.4 });

            // 체력 10% 이하면 즉시 처형 (살아있는 경우에만)
            if (target.alive && target.hp / target.maxHp <= 0.1) {
                target.takeDamage(target.hp, units);
            }

            this.attackTimer = 0;
        }
    }
}

export class AllRoundTower extends Tower {
    static meta = {
        name: '만능 타워', rarity: 'LEGEND',
        damage: 100, attackSpeed: 1, range: 200,
        damageMul: 1.1, speedMul: 1.1, rangeMul: 1.2,
        passive: '만능',
        passiveDesc: '이때까지 나온 타워들에 비례해 강해집니다.',
    };
    constructor(x, y) {
        super(x, y);
        const others = game.towers.filter(t => t && !(t instanceof AllRoundTower));
        if (others.length > 0) {
            this.damage      = Math.floor(others.reduce((s, t) => s + t.damage,      0) / others.length);
            this.attackSpeed = parseFloat((others.reduce((s, t) => s + t.attackSpeed, 0) / others.length).toFixed(4));
            this.range       = Math.floor(others.reduce((s, t) => s + t.range,       0) / others.length);
        } else {
            this.damage      = AllRoundTower.meta.damage;
            this.range       = AllRoundTower.meta.range;
            this.attackSpeed = AllRoundTower.meta.attackSpeed;
        }
        this.color = '#c8a800';
    }

    getDamage(target) {
        const hasSky = game.towers.some(t => t instanceof SkyTower && t !== this);
        return hasSky && target.isFlying ? this.damage * SkyTower.meta.skyMul : this.damage;
    }

    update(deltaTime, units) {
        if (this.stopped) return;
        this.attackTimer += deltaTime / 1000;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        const others    = game.towers.filter(t => t && t !== this);
        const hasArea   = others.some(t => t instanceof AreaTower);
        const hasSniper = others.some(t => t instanceof SniperTower);

        if (hasArea) {
            let attacked = false;
            units.forEach(unit => {
                if (!unit.active || !unit.alive) return;
                if (unit.isInvisible) return;
                if (this.getDistance(unit) > this.range) return;
                unit.takeDamage(this.getDamage(unit), units);
                attackFlashes.push({ x1: this.x, y1: this.y, x2: unit.x, y2: unit.y, color: this.color, timer: 0, duration: 0.2 });
                attacked = true;
            });
            if (hasSniper) {
                units.forEach(unit => {
                    if (!unit.active || !unit.alive) return;
                    if (unit.isInvisible) return;
                    if (this.getDistance(unit) > this.range) return;
                    if (unit.hp / unit.maxHp <= 0.1) unit.takeDamage(unit.hp, units);
                });
            }
            if (attacked) this.attackTimer = 0;
            return;
        }

        if (hasSniper) {
            let target = null;
            let minHpRatio = Infinity;
            units.forEach(unit => {
                if (!unit.active || !unit.alive) return;
                if (unit.isInvisible) return;
                if (this.getDistance(unit) > this.range) return;
                const hpRatio = unit.hp / unit.maxHp;
                if (hpRatio < minHpRatio) { minHpRatio = hpRatio; target = unit; }
            });
            if (target) {
                target.takeDamage(this.getDamage(target), units);
                attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.4 });
                if (target.alive && target.hp / target.maxHp <= 0.1) target.takeDamage(target.hp, units);
                this.attackTimer = 0;
            }
            return;
        }

        // 기본 타겟팅 (도발 우선 → 진행도 우선)
        let target = null;
        let maxProgress = -Infinity;
        let hasTaunt = false;
        units.forEach(unit => {
            if (!unit.active || !unit.alive) return;
            if (unit.isInvisible) return;
            if (this.getDistance(unit) > this.range) return;
            const progress = this.getProgress(unit);
            if (unit.taunting) {
                if (!hasTaunt || progress > maxProgress) { hasTaunt = true; maxProgress = progress; target = unit; }
                return;
            }
            if (!hasTaunt && progress > maxProgress) { maxProgress = progress; target = unit; }
        });
        if (target) {
            target.takeDamage(this.getDamage(target), units);
            attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.25 });
            this.attackTimer = 0;
        }
    }
}

export const attackFlashes = [];

export const TOWER_CLASSES = [
    NormalTower, HeavyTower, FastTower,
    SkyTower,
    AreaTower,
    SniperTower,
    AllRoundTower,
];
export const TOWER_CLASS = Object.fromEntries(TOWER_CLASSES.map(Cls => [Cls.name, Cls]));