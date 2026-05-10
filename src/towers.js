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
            this.attackTimer -= 1 / this.attackSpeed;
        } else {
            this.attackTimer = 1 / this.attackSpeed;
        }
    }

    getDamage(target) {
        return this.damage;
    }
}

export class NormalTower extends Tower {
    static meta = {
        name: '일반 타워', rarity: 'COMMON',
        damage: 200, attackSpeed: 1, range: 200,
        dmgPlus: 20, speedPlus: 0.1, rangePlus: 20,
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
        damage: 440, attackSpeed: 0.5, range: 160,
        dmgPlus: 44, speedPlus: 0.05, rangePlus: 20,
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
        damage: 80, attackSpeed: 2, range: 240,
        dmgPlus: 8, speedPlus: 0.2, rangePlus: 24,
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
        damage: 120, attackSpeed: 1.2, range: 240,
        dmgPlus: 12, speedPlus: 0.12, rangePlus: 24,
        passive: '공중', skyMul : 2,
        passiveDesc: (mul) => `비행 유닛을 공격 시 데미지가 ${mul}배 증가하며,\n비행 유닛을 우선 공격합니다.`,
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

    update(deltaTime, units) {
        if (this.stopped) return;
        this.attackTimer += deltaTime / 1000;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        let target      = null;
        let maxProgress = -Infinity;
        let hasFly      = false;
        let hasTaunt    = false;

        units.forEach(unit => {
            if (!unit.active || !unit.alive) return;
            if (unit.isInvisible) return;
            if (this.getDistance(unit) > this.range) return;

            const progress = this.getProgress(unit);

            if (unit.taunting) {
                if (!hasTaunt || progress > maxProgress) {
                    hasTaunt    = true;
                    maxProgress = progress;
                    target      = unit;
                }
                return;
            }

            if (hasTaunt) return;

            if (unit.isFlying) {
                if (!hasFly || progress > maxProgress) {
                    hasFly      = true;
                    maxProgress = progress;
                    target      = unit;
                }
                return;
            }

            if (!hasFly && progress > maxProgress) {
                maxProgress = progress;
                target      = unit;
            }
        });

        if (target) {
            target.takeDamage(this.getDamage(target), units);
            attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.25 });
            this.attackTimer -= 1 / this.attackSpeed;
        } else {
            this.attackTimer = 1 / this.attackSpeed;
        }
    }
}

export class InfraredTower extends Tower {
    static meta = {
        name: '적외선 타워', rarity: 'UNCOMMON',
        damage: 300, attackSpeed: 0.8, range: 240,
        dmgPlus: 30, speedPlus: 0.08, rangePlus: 24,
        passive: '적외선',
        passiveDesc: '은신한 유닛 공격 가능 및 은신한 유닛 우선 공격',
    };
    constructor(x, y) {
        super(x, y);
        this.damage      = InfraredTower.meta.damage;
        this.range       = InfraredTower.meta.range;
        this.attackSpeed = InfraredTower.meta.attackSpeed;
        this.color       = '#922b21';
    }

    update(deltaTime, units) {
        if (this.stopped) return;
        this.attackTimer += deltaTime / 1000;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        let target      = null;
        let maxProgress = -Infinity;
        let hasTaunt    = false;
        let hasInvis    = false;

        units.forEach(unit => {
            if (!unit.active || !unit.alive) return;
            if (this.getDistance(unit) > this.range) return;

            const progress = this.getProgress(unit);

            if (unit.taunting) {
                if (!hasTaunt || progress > maxProgress) {
                    hasTaunt    = true;
                    maxProgress = progress;
                    target      = unit;
                }
                return;
            }

            if (hasTaunt) return;

            if (unit.isInvisible) {
                if (!hasInvis || progress > maxProgress) {
                    hasInvis    = true;
                    maxProgress = progress;
                    target      = unit;
                }
                return;
            }

            if (!hasInvis && progress > maxProgress) {
                maxProgress = progress;
                target      = unit;
            }
        });

        if (target) {
            target.takeDamage(this.getDamage(target), units);
            attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.25 });
            this.attackTimer -= 1 / this.attackSpeed;
        } else {
            this.attackTimer = 1 / this.attackSpeed;
        }
    }
}

export class PoisonTower extends Tower {
    static meta = {
        name: '독 타워', rarity: 'UNCOMMON',
        damage: 60, attackSpeed: 1.2, range: 240,
        dmgPlus: 8, speedPlus: 0.12, rangePlus: 24,
        passive: '독', poisonTime: 3,
        passiveDesc: (time) => `${time}초에 걸쳐 도트 데미지를 받습니다.\n독에 걸린 유닛은 받는 회복량이 50% 감소됩니다.`,
    };
    constructor(x, y) {
        super(x, y);
        this.damage      = PoisonTower.meta.damage;
        this.range       = PoisonTower.meta.range;
        this.attackSpeed = PoisonTower.meta.attackSpeed;
        this.color       = '#7dba00';
    }

    update(deltaTime, units) {
        if (this.stopped) return;
        this.attackTimer += deltaTime / 1000;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        let target      = null;
        let maxProgress = -Infinity;
        let hasTaunt    = false;
        let hasClean    = false;

        units.forEach(unit => {
            if (!unit.active || !unit.alive) return;
            if (unit.isInvisible) return;
            if (this.getDistance(unit) > this.range) return;

            const progress = this.getProgress(unit);

            if (unit.taunting) {
                if (!hasTaunt || progress > maxProgress) {
                    hasTaunt    = true;
                    maxProgress = progress;
                    target      = unit;
                }
                return;
            }

            if (hasTaunt) return;

            if (!unit.isPoisoned) {
                if (!hasClean || progress > maxProgress) {
                    hasClean    = true;
                    maxProgress = progress;
                    target      = unit;
                }
                return;
            }

            if (!hasClean && progress > maxProgress) {
                maxProgress = progress;
                target      = unit;
            }
        });

        if (target) {
            target.takeDamage(this.getDamage(target), units);
            target.isPoisoned  = true;
            target.poisonTimer = PoisonTower.meta.poisonTime;
            target.poisonDps   = this.damage;
            attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.25 });
            this.attackTimer -= 1 / this.attackSpeed;
        } else {
            this.attackTimer = 1 / this.attackSpeed;
        }
    }
}

export class AreaTower extends Tower {
    static meta = {
        name: '전방위 타워', rarity: 'RARE',
        damage: 100, attackSpeed: 1, range: 160,
        dmgPlus: 10, speedPlus: 0.1, rangePlus: 16,
        passive:     ['전방위', '지상'],
        passiveDesc: ['범위 내 모든 적을 동시에 공격합니다.', '비행 유닛을 공격할 수 없습니다.'],
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
            if (unit.isFlying) return;
            if (this.getDistance(unit) > this.range) return;
            unit.takeDamage(this.getDamage(unit), units);
            attackFlashes.push({ x1: this.x, y1: this.y, x2: unit.x, y2: unit.y, color: this.color, timer: 0, duration: 0.2 });
            attacked = true;
        });

        if (attacked) {
            this.attackTimer -= 1 / this.attackSpeed;
        } else {
            this.attackTimer = 1 / this.attackSpeed;
        }
    }
}

export class ChainTower extends Tower {
    static meta = {
        name: '전이 타워', rarity: 'RARE',
        damage: 200, attackSpeed: 0.7, range: 160,
        dmgPlus: 20, speedPlus: 0.07, rangePlus: 16,
        passive: '전이', decDamage: 75,
        passiveDesc: (dec) => `공격이 근처 적에게 ${dec}% 감소된 피해로 전이됩니다. (최대 4회)`,
    };

    static CHAIN_MAX   = 4;

    constructor(x, y) {
        super(x, y);
        this.damage      = ChainTower.meta.damage;
        this.range       = ChainTower.meta.range;
        this.attackSpeed = ChainTower.meta.attackSpeed;
        this.color       = '#00bcd4';
    }

    update(deltaTime, units) {
        if (this.stopped) return;
        this.attackTimer += deltaTime / 1000;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        let target      = null;
        let maxProgress = -Infinity;
        let hasTaunt    = false;

        units.forEach(unit => {
            if (!unit.active || !unit.alive) return;
            if (unit.isInvisible) return;
            if (this.getDistance(unit) > this.range) return;

            const progress = this.getProgress(unit);

            if (unit.taunting) {
                if (!hasTaunt || progress > maxProgress) {
                    hasTaunt    = true;
                    maxProgress = progress;
                    target      = unit;
                }
                return;
            }

            if (!hasTaunt && progress > maxProgress) {
                maxProgress = progress;
                target      = unit;
            }
        });

        if (!target) {
            this.attackTimer = 1 / this.attackSpeed;
            return;
        }

        // 1차 공격
        const hit = new Set([target]);
        target.takeDamage(this.damage, units);
        attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.25, lineWidth: 3, dotRadius: 6, glow: true });
        attackFlashes.push({ ring: true, x: target.x, y: target.y, maxRadius: this.range * 2, color: this.color, timer: 0, duration: 0.35 });

        // 전이 체인
        let prev        = target;
        let chainDamage = this.damage * 0.5;

        for (let i = 0; i < ChainTower.CHAIN_MAX; i++) {
            const prevProgress = this.getProgress(prev);
            let next    = null;
            let minDist = Infinity;

            units.forEach(unit => {
                if (!unit.active || !unit.alive) return;
                if (unit.isInvisible) return;
                if (hit.has(unit)) return;
                if (this.getProgress(unit) >= prevProgress) return; // 뒤쪽만

                const dx = unit.x - prev.x;
                const dy = unit.y - prev.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > this.range * 2) return;
                if (dist < minDist) { minDist = dist; next = unit; }
            });

            if (!next) break;

            const lineWidth = 3 - i * 0.5;
            const dotRadius = 5 - i * 0.8;
            hit.add(next);
            next.takeDamage(chainDamage, units);
            attackFlashes.push({ x1: prev.x, y1: prev.y, x2: next.x, y2: next.y, color: this.color, timer: 0, duration: 0.3, lineWidth, dotRadius, glow: true });
            attackFlashes.push({ ring: true, x: next.x, y: next.y, maxRadius: this.range * 2, color: this.color, timer: 0, duration: 0.35 });

            prev        = next;
            chainDamage *= 0.5;
        }

        this.attackTimer -= 1 / this.attackSpeed;
    }
}

export class MortarTower extends Tower {
    static meta = {
        name: '박격포 타워', rarity: 'RARE',
        damage: 300, attackSpeed: 0.6, range: 240,
        dmgPlus: 30, speedPlus: 0.06, rangePlus: 24,
        passive: '포탄',
        passiveDesc: '공격 시 큰 포탄을 발사해 주변 적도 함께 때립니다.',
    };

    static SPLASH_RADIUS = 100;

    constructor(x, y) {
        super(x, y);
        this.damage      = MortarTower.meta.damage;
        this.range       = MortarTower.meta.range;
        this.attackSpeed = MortarTower.meta.attackSpeed;
        this.color       = '#6b7533';
    }

    update(deltaTime, units) {
        if (this.stopped) return;
        this.attackTimer += deltaTime / 1000;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        let target = null, maxProgress = -Infinity, hasTaunt = false;
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

        if (!target) { this.attackTimer = 1 / this.attackSpeed; return; }

        // 주 타겟 공격
        target.takeDamage(this.damage, units);
        attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.2 });

        // 폭발 범위 내 스플래시 (주 타겟 제외, 50% 피해)
        const r2 = MortarTower.SPLASH_RADIUS ** 2;
        units.forEach(unit => {
            if (!unit.active || !unit.alive || unit === target) return;
            const dx = unit.x - target.x, dy = unit.y - target.y;
            if (dx * dx + dy * dy > r2) return;
            unit.takeDamage(this.damage * 0.5, units);
        });

        // 폭발 이펙트
        attackFlashes.push({ ring: true, x: target.x, y: target.y, maxRadius: MortarTower.SPLASH_RADIUS, color: this.color, timer: 0, duration: 0.35 });

        this.attackTimer -= 1 / this.attackSpeed;
    }
}

export class SniperTower extends Tower {
    static meta = {
        name: '저격 타워', rarity: 'HERO',
        damage: 1000, attackSpeed: 0.2, range: 400,
        dmgPlus: 100, speedPlus: 0.02, rangePlus: 40,
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

    // 체력 가장 낮은 유닛 우선 타겟 (도발 > 최저 HP)
    update(deltaTime, units) {
        if (this.stopped) return;
        this.attackTimer += deltaTime / 1000;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        let target = null;
        let tauntTarget = null;
        let minHpRatio = Infinity;
        let minTauntRatio = Infinity;

        units.forEach(unit => {
            if (!unit.active || !unit.alive) return;
            if (unit.isInvisible) return;
            if (this.getDistance(unit) > this.range) return;

            const hpRatio = unit.hp / unit.maxHp;
            if (unit.taunting && hpRatio < minTauntRatio) {
                minTauntRatio = hpRatio;
                tauntTarget = unit;
            }
            if (hpRatio < minHpRatio) {
                minHpRatio = hpRatio;
                target = unit;
            }
        });

        target = tauntTarget ?? target;

        if (target) {
            target.takeDamage(this.getDamage(target), units);
            attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.4 });

            // 체력 10% 이하면 즉시 처형 (살아있는 경우에만)
            if (target.alive && target.hp / target.maxHp <= 0.1) {
                target.takeDamage(target.hp, units);
            }

            this.attackTimer -= 1 / this.attackSpeed;
        } else {
            this.attackTimer = 1 / this.attackSpeed;
        }
    }
}

export class InfernoTower extends Tower {
    static meta = {
        name: '인페르노 타워', rarity: 'HERO',
        damage: 50, attackSpeed: 0, range: 300,
        dmgPlus: 5, speedPlus: 0, rangePlus: 30,
        passive: '인페르노',
        passiveDesc: '같은 대상을 오래 공격할수록 더 큰 피해를 입힙니다.',
    };

    constructor(x, y) {
        super(x, y);
        this.damage        = InfernoTower.meta.damage;
        this.range         = InfernoTower.meta.range;
        this.attackSpeed   = InfernoTower.meta.attackSpeed;
        this.color         = '#7b1818';
        this.currentTarget = null;
        this.burnTime      = 0;
    }

    update(deltaTime, units) {
        if (this.stopped) return;
        const dt = deltaTime / 1000;

        // 도발 유닛 우선 처리 — 진입 시 강제 전환
        let tauntTarget  = null;
        let maxTauntProg = -Infinity;
        units.forEach(unit => {
            if (!unit.active || !unit.alive) return;
            if (unit.isInvisible) return;
            if (!unit.taunting) return;
            if (this.getDistance(unit) > this.range) return;
            const prog = this.getProgress(unit);
            if (prog > maxTauntProg) { maxTauntProg = prog; tauntTarget = unit; }
        });

        if (tauntTarget && this.currentTarget !== tauntTarget) {
            this.currentTarget = tauntTarget;
            this.burnTime      = 0;
        }

        // 현재 타겟 유효성 검증
        if (this.currentTarget && (
            !this.currentTarget.active     ||
            !this.currentTarget.alive      ||
            this.currentTarget.isInvisible ||
            this.getDistance(this.currentTarget) > this.range
        )) {
            this.currentTarget = null;
            this.burnTime      = 0;
        }

        // 타겟 없으면 새로 선택 (진행도 가장 높은 유닛)
        if (!this.currentTarget) {
            let maxProg = -Infinity;
            units.forEach(unit => {
                if (!unit.active || !unit.alive) return;
                if (unit.isInvisible) return;
                if (this.getDistance(unit) > this.range) return;
                const prog = this.getProgress(unit);
                if (prog > maxProg) { maxProg = prog; this.currentTarget = unit; }
            });
        }

        if (!this.currentTarget) return;

        // 공격: 누적 시간에 비례해 DPS 증가
        this.burnTime += dt;
        const dps = this.damage * (1 + this.burnTime);
        this.currentTarget.takeDamage(dps * dt, units);

        // 빔 이펙트: burnTime에 따라 굵어짐
        const beamWidth = Math.min(6, 1.5 + this.burnTime * 0.4);
        attackFlashes.push({
            x1: this.x, y1: this.y,
            x2: this.currentTarget.x, y2: this.currentTarget.y,
            color: this.color, timer: 0, duration: 0.08,
            lineWidth: beamWidth, dotRadius: 3, glow: true,
        });
    }
}

export class AllRoundTower extends Tower {
    static meta = {
        name: '만능 타워', rarity: 'LEGEND',
        damage: 100, attackSpeed: 1, range: 200,
        dmgPlus: 10, speedPlus: 0.1, rangePlus: 20,
        passive: '만능',
        passiveDesc: '모든 해로운 효과에 면역이 되며,\n이때까지 나온 타워들에 비례해 강해집니다.',
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
        this.color      = '#c8a800';
        this.burnMul    = 1;    // 인페르노: 누적 배율
        this.burnTarget = null; // 인페르노: 현재 타겟 추적
        this.aoeTimer   = 0;    // 전방위: 주기 타이머
    }

    getDamage(target) {
        const others = game.towers.filter(t => t && t !== this);
        let mul = 1;
        if (others.some(t => t instanceof SkyTower)      && target.isFlying)    mul *= 1.2;
        if (others.some(t => t instanceof InfraredTower) && target.isInvisible) mul *= 1.2;
        return this.damage * mul;
    }

    update(deltaTime, units) {
        if (this.stopped) return;
        const dt     = deltaTime / 1000;
        const others = game.towers.filter(t => t && t !== this);

        const hasPoison   = others.some(t => t instanceof PoisonTower);
        const hasChain    = others.some(t => t instanceof ChainTower);
        const hasSniper   = others.some(t => t instanceof SniperTower);
        const hasArea     = others.some(t => t instanceof AreaTower);
        const hasInferno  = others.some(t => t instanceof InfernoTower);

        // 은신 항상 공격 가능, 도발 무시
        const canTarget = (unit) => {
            if (!unit.active || !unit.alive) return false;
            return this.getDistance(unit) <= this.range;
        };

        // 전방위 타워: 1초마다 범위 내 전체에게 공격력 10% 피해
        if (hasArea) {
            this.aoeTimer += dt;
            if (this.aoeTimer >= 1) {
                this.aoeTimer -= 1;
                units.forEach(unit => {
                    if (!canTarget(unit)) return;
                    unit.takeDamage(this.damage * 0.1, units);
                    attackFlashes.push({ x1: this.x, y1: this.y, x2: unit.x, y2: unit.y, color: this.color, timer: 0, duration: 0.15 });
                });
            }
        }

        this.attackTimer += dt;
        if (this.attackTimer < 1 / this.attackSpeed) return;

        let target = null;
        let maxProgress = -Infinity;
        units.forEach(unit => {
            if (!canTarget(unit)) return;
            const p = this.getProgress(unit);
            if (p > maxProgress) { maxProgress = p; target = unit; }
        });

        if (!target) { this.attackTimer = 1 / this.attackSpeed; return; }

        // 인페르노 타워: 타겟 바뀌면 배율 초기화
        if (hasInferno) {
            if (this.burnTarget !== target) { this.burnMul = 1; this.burnTarget = target; }
        } else {
            this.burnMul = 1; this.burnTarget = null;
        }

        const dmg = this.getDamage(target) * (hasInferno ? this.burnMul : 1);
        target.takeDamage(dmg, units);
        if (hasInferno) this.burnMul *= 1.05;

        attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.25 });

        // 독 타워: 1초 독 (HealUnit에서 독 걸린 유닛 힐량 50% 감소 적용)
        if (hasPoison && target.alive) {
            target.isPoisoned  = true;
            target.poisonTimer = 1;
            target.poisonDps   = this.damage;
        }

        // 전이 타워: 50% 피해 최대 2명 전이
        if (hasChain && target.alive) {
            const primaryProgress = this.getProgress(target);
            const hit = new Set([target]);
            let prev = target;
            for (let i = 0; i < 2; i++) {
                let next = null, minDist = Infinity;
                units.forEach(unit => {
                    if (!unit.active || !unit.alive || hit.has(unit)) return;
                    if (this.getProgress(unit) >= primaryProgress) return;
                    const dx = unit.x - prev.x, dy = unit.y - prev.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > this.range * 2 || dist >= minDist) return;
                    minDist = dist; next = unit;
                });
                if (!next) break;
                hit.add(next);
                next.takeDamage(this.damage * 0.5, units);
                attackFlashes.push({ x1: prev.x, y1: prev.y, x2: next.x, y2: next.y, color: this.color, timer: 0, duration: 0.3, lineWidth: 2, dotRadius: 4, glow: true });
                prev = next;
            }
        }

        // 저격 타워: 체력 5% 미만 즉시 처형
        if (hasSniper && target.alive && target.hp / target.maxHp < 0.05) {
            target.takeDamage(target.hp, units);
        }

        this.attackTimer -= 1 / this.attackSpeed;
    }
}

export const attackFlashes = [];

export const TOWER_CLASSES = [
    NormalTower, HeavyTower, FastTower,
    SkyTower, InfraredTower, PoisonTower,
    AreaTower, ChainTower, MortarTower,
    SniperTower, InfernoTower,
    AllRoundTower,
];
export const TOWER_CLASS = Object.fromEntries(TOWER_CLASSES.map(Cls => [Cls.name, Cls]));