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
            if (attacked) {
                this.attackTimer -= 1 / this.attackSpeed;
            } else {
                this.attackTimer = 1 / this.attackSpeed;
            }
            return;
        }

        if (hasSniper) {
            let target     = null;
            let minHpRatio = Infinity;
            let hasTaunt   = false;
            units.forEach(unit => {
                if (!unit.active || !unit.alive) return;
                if (unit.isInvisible) return;
                if (this.getDistance(unit) > this.range) return;
                if (unit.taunting) {
                    const ratio = unit.hp / unit.maxHp;
                    if (!hasTaunt || ratio < minHpRatio) { hasTaunt = true; minHpRatio = ratio; target = unit; }
                    return;
                }
                if (hasTaunt) return;
                const hpRatio = unit.hp / unit.maxHp;
                if (hpRatio < minHpRatio) { minHpRatio = hpRatio; target = unit; }
            });
            if (target) {
                target.takeDamage(this.getDamage(target), units);
                attackFlashes.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y, color: this.color, timer: 0, duration: 0.4 });
                if (target.alive && target.hp / target.maxHp <= 0.1) target.takeDamage(target.hp, units);
                this.attackTimer -= 1 / this.attackSpeed;
            } else {
                this.attackTimer = 1 / this.attackSpeed;
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
            this.attackTimer -= 1 / this.attackSpeed;
        } else {
            this.attackTimer = 1 / this.attackSpeed;
        }
    }
}

export const attackFlashes = [];

export const TOWER_CLASSES = [
    NormalTower, HeavyTower, FastTower,
    SkyTower, InfraredTower, PoisonTower,
    AreaTower, ChainTower,
    SniperTower, InfernoTower,
    AllRoundTower,
];
export const TOWER_CLASS = Object.fromEntries(TOWER_CLASSES.map(Cls => [Cls.name, Cls]));