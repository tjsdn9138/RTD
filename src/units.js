import { game, checkWaveEnd } from './state.js';

export class Unit {
    constructor() {
        this.maxHp = 100;
        this.hp    = this.maxHp;
        this.x     = 0;
        this.y     = 0;
        this.speed = 100;
        this.waypointIndex = 0;
        this.alive     = true;  // 죽으면 false
        this.active    = false; // 죽거나 통과하면 false
        this.spawned   = false; // 출전 버튼으로 전장에 보내지면 true
        this.waypoints       = [];
        this.healFlash       = 0;
        this.isPoisoned      = false;
        this.poisonTimer     = 0;
        this.poisonDps       = 0;
        this.damageReduction  = 0;
        this.distanceTraveled = 0;
    }

    // 유닛 생성
    spawn(waypoints, hpMultiplier = 1, speedMultiplier = 1) {
        this.spawned = true;
        this.x = waypoints[0].x;
        this.y = waypoints[0].y;
        this.waypointIndex = 0;
        this.waypoints = waypoints;
        this.alive  = true;
        this.active = true;
        this.maxHp  = this.maxHp * hpMultiplier;
        this.hp     = this.maxHp;
        this.speed  = this.speed * speedMultiplier;
    }

    update(deltaTime, units) {
        if (!this.active || !this.alive) return;

        if (this.healFlash > 0) {
            this.healFlash = Math.max(0, this.healFlash - deltaTime / 400);
        }

        if (this.isPoisoned) {
            this.poisonTimer -= deltaTime / 1000;
            if (this.poisonTimer <= 0) {
                this.isPoisoned  = false;
                this.poisonTimer = 0;
                this.poisonDps   = 0;
            } else {
                this.takeDamage(this.poisonDps * (deltaTime / 1000), units);
                if (!this.active || !this.alive) return;
            }
        }

        const target = this.waypoints[this.waypointIndex]; // 다음 웨이포인트
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy); // 타겟까지의 거리

        const moveAmount = this.speed * (deltaTime / 1000);

        if (distance <= moveAmount) {
            this.distanceTraveled += distance;
            this.x = target.x;
            this.y = target.y;
            this.waypointIndex++;
            if (this.waypointIndex >= this.waypoints.length) {
                this.active = false;
                game.survivedCount++;
                checkWaveEnd();
            }
            return;
        }

        this.distanceTraveled += moveAmount;
        const nx = dx / distance;
        const ny = dy / distance;
        this.x += nx * moveAmount;
        this.y += ny * moveAmount;
    }

    // 피격 시 데미지 계산
    takeDamage(amount, units) {
        this.hp -= amount * (1 - this.damageReduction / 100);
        if (this.hp <= 0) {
            this.alive  = false;
            this.active = false;
            game.deadCount++;
            checkWaveEnd();
        }
    }

    // 유닛 그리기
    draw(ctx) {
        if (!this.active) return;

        ctx.save();

        // 힐 수신 효과
        if (this.healFlash > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 12 + 6 * (1 - this.healFlash), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(46, 204, 113, ${this.healFlash})`;
            ctx.lineWidth   = 2.5;
            ctx.stroke();
        }

        // 독 상태 외곽 글로우
        if (this.isPoisoned) {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(125, 186, 0, ${0.5 + 0.4 * pulse})`;
            ctx.lineWidth   = 2.5;
            ctx.stroke();
        }

        this._drawBody(ctx);

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x - 20, this.y - 25, 40, 6);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - 20, this.y - 25, 40 * (this.hp / this.maxHp), 6);
        ctx.restore();
    }

    _drawBody(ctx) {
        ctx.fillStyle = this.color || '#3498db';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
        ctx.fill();

        if (this.isPoisoned) {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(125, 186, 0, ${0.18 + 0.12 * pulse})`;
            ctx.fill();
        }
    }
}

export class NormalUnit extends Unit {
    static meta = {
        type: 'NormalUnit', name: '평범한넘', rarity: 'COMMON',
        ico: '평', bg: '#c8d8f0', fg: '#0a2aaa',
        hp: 500, speed: 200, level: 1,
        hpPlus: 50, speedPlus: 10,
        passive: null, passiveDesc: null,
    };
    constructor() {
        super();
        this.maxHp = NormalUnit.meta.hp;
        this.hp    = this.maxHp;
        this.speed = NormalUnit.meta.speed;
        this.color = '#3498db';
    }
}

export class FastUnit extends Unit {
    static meta = {
        type: 'FastUnit', name: '빠른넘', rarity: 'COMMON',
        ico: '빠', bg: '#c0e8c0', fg: '#2a8a00',
        hp: 330, speed: 300, level: 1,
        hpPlus: 33, speedPlus: 15,
        passive: null, passiveDesc: null,
    };
    constructor() {
        super();
        this.maxHp = FastUnit.meta.hp;
        this.hp    = this.maxHp;
        this.speed = FastUnit.meta.speed;
        this.color = '#2ecc71';
    }
}

export class SlowUnit extends Unit {
    static meta = {
        type: 'SlowUnit', name: '느린넘', rarity: 'COMMON',
        ico: '느', bg: '#f0d8c0', fg: '#aa1800',
        hp: 800, speed: 130, level: 1,
        hpPlus: 80, speedPlus: 8,
        passive: null, passiveDesc: null,
    };
    constructor() {
        super();
        this.maxHp = SlowUnit.meta.hp;
        this.hp    = this.maxHp;
        this.speed = SlowUnit.meta.speed;
        this.color = '#9b59b6';
    }
}

export class FlyUnit extends Unit {
    static meta = {
        type: 'FlyUnit', name: '날라댕기는넘', rarity: 'UNCOMMON',
        ico: '날', bg: '#d0eaf8', fg: '#1a5f8a',
        hp: 300, speed: 180, level: 1,
        hpPlus: 35, speedPlus: 10,
        passive: '비행',
        passiveDesc: '특정 타워의 공격을 받지 않습니다.',
    };
    constructor() {
        super();
        this.maxHp    = FlyUnit.meta.hp;
        this.hp       = this.maxHp;
        this.speed    = FlyUnit.meta.speed;
        this.color    = '#5dade2';
        this.isFlying = true;
    }
}

export class ShieldUnit extends Unit {
    static meta = {
        type: 'ShieldUnit', name: '방패든넘', rarity: 'UNCOMMON',
        ico: '방', bg: '#f0e8c0', fg: '#c87800',
        hp: 600, speed: 150, level: 1,
        hpPlus: 70, speedPlus: 10, defPlus: 10,
        passive: '방어', defense: 10,
        passiveDesc: (def) => `받는 데미지를 ${def}만큼 감소시킵니다.`,
    };
    constructor() {
        super();
        this.maxHp   = ShieldUnit.meta.hp;
        this.hp      = this.maxHp;
        this.speed   = ShieldUnit.meta.speed;
        this.defense = ShieldUnit.meta.defense;
        this.color   = '#f39c12';
    }
    takeDamage(amount, units) {
        const reduced = Math.max(0, amount - this.defense);
        super.takeDamage(reduced, units);
    }
}

export class HealUnit extends Unit {
    static meta = {
        type: 'HealUnit', name: '힐주는넘', rarity: 'UNCOMMON',
        ico: '힐', bg: '#f8d0e8', fg: '#8a0050',
        hp: 300, speed: 200, level: 1,
        hpPlus: 35, speedPlus: 10, healPlus: 30,
        passive: '힐', heal: 50,
        passiveDesc: (heal) => `1초마다 범위 내 체력이 가장 적은 아군 한명의 체력을 ${heal}만큼 회복시킵니다.`,
    };

    static HEAL_RANGE    = 150;
    static HEAL_INTERVAL = 1;

    constructor() {
        super();
        this.maxHp      = HealUnit.meta.hp;
        this.hp         = this.maxHp;
        this.speed      = HealUnit.meta.speed;
        this.heal       = HealUnit.meta.heal;
        this.color      = '#e91e8c';
        this.healTimer  = 0;
    }

    update(deltaTime, units) {
        super.update(deltaTime, units);
        if (!this.active || !this.alive) return;

        this.healTimer += deltaTime / 1000;
        if (this.healTimer >= HealUnit.HEAL_INTERVAL) {
            this.healTimer = 0;
            this._doHeal(units);
        }
    }

    _doHeal(units) {
        let target   = null;
        let lowestHp = Infinity;
        const range2 = HealUnit.HEAL_RANGE ** 2;
        for (const u of units) {
            if (u === this) continue;
            if (!u.active || !u.alive) continue;
            if (u.hp >= u.maxHp) continue;
            const dx = u.x - this.x;
            const dy = u.y - this.y;
            if (dx * dx + dy * dy > range2) continue;
            if (u.hp < lowestHp) {
                lowestHp = u.hp;
                target   = u;
            }
        }
        if (target) {
            const amount      = target.isPoisoned ? this.heal * 0.5 : this.heal;
            target.hp         = Math.min(target.maxHp, target.hp + amount);
            target.healFlash  = 1;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        // 힐 범위 원
        ctx.beginPath();
        ctx.arc(this.x, this.y, HealUnit.HEAL_RANGE, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(46, 204, 113, 0.4)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        ctx.fillStyle   = 'rgba(46, 204, 113, 0.05)';
        ctx.fill();

        ctx.restore();
        super.draw(ctx);
    }
}

export class TauntUnit extends Unit {
    static meta = {
        type: 'TauntUnit', name: '어그로끄는넘', rarity: 'RARE',
        ico: '어', bg: '#f0c8c8', fg: '#aa1800',
        hp: 1100, speed: 100, level: 1,
        hpPlus: 120, speedPlus: 7,
        passive: '도발',
        passiveDesc: '모든 타워가 이 유닛을 우선 공격합니다.',
    };
    constructor() {
        super();
        this.maxHp   = TauntUnit.meta.hp;
        this.hp      = this.maxHp;
        this.speed   = TauntUnit.meta.speed;
        this.color   = '#e74c3c';
        this.taunting = true;
    }
}

export class BuffUnit extends Unit {
    static meta = {
        type: 'BuffUnit', name: '버프주는넘', rarity: 'RARE',
        ico: '버', bg: '#fff8d0', fg: '#7a5a00',
        hp: 400, speed: 200, level: 1,
        hpPlus: 45, speedPlus: 10, decPlus: 5,
        passive: '버프', decDamage: 5,
        passiveDesc: (dec) => `범위 내 아군의 받는 피해량이 ${dec}% 감소합니다.`,
    };

    static BUFF_RANGE = 150;

    constructor() {
        super();
        this.maxHp    = BuffUnit.meta.hp;
        this.hp       = this.maxHp;
        this.speed    = BuffUnit.meta.speed;
        this.color    = '#f1c40f';
        this.decDamage = BuffUnit.meta.decDamage;
        this._buffed  = new Set();
    }

    update(deltaTime, units) {
        super.update(deltaTime, units);

        if (!this.active || !this.alive) {
            for (const u of this._buffed) u.damageReduction = 0;
            this._buffed.clear();
            return;
        }

        const range2     = BuffUnit.BUFF_RANGE ** 2;
        const nowBuffed  = new Set();

        for (const u of units) {
            if (u === this) continue;
            if (!u.active || !u.alive) continue;
            const dx = u.x - this.x;
            const dy = u.y - this.y;
            if (dx * dx + dy * dy <= range2) {
                u.damageReduction = this.decDamage;
                nowBuffed.add(u);
            }
        }

        for (const u of this._buffed) {
            if (!nowBuffed.has(u)) u.damageReduction = 0;
        }
        this._buffed = nowBuffed;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        // 버프 범위 원 (핑크)
        ctx.beginPath();
        ctx.arc(this.x, this.y, BuffUnit.BUFF_RANGE, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(233, 30, 140, 0.35)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        ctx.fillStyle   = 'rgba(233, 30, 140, 0.05)';
        ctx.fill();

        ctx.restore();
        super.draw(ctx);
    }
}

export class InvisibleUnit extends Unit {
    static meta = {
        type: 'InvisibleUnit', name: '투명한넘', rarity: 'HERO',
        ico: '투', bg: '#e0e0e8', fg: '#5a5a7a',
        hp: 350, speed: 250, level: 1,
        hpPlus: 40, speedPlus: 20, timePlus: 0.5,
        passive: '투명', time: 1,
        passiveDesc: (time) => `2초마다 ${time}초 동안 타겟이 되지 않습니다.`,
    };

    static VISIBLE_DURATION = 2; // TODO: 수치 조정

    constructor() {
        super();
        this.maxHp       = InvisibleUnit.meta.hp;
        this.hp          = this.maxHp;
        this.speed       = InvisibleUnit.meta.speed;
        this.color       = '#95a5a6';
        this.isInvisible = false;
        this.invisTimer  = 0;
    }

    update(deltaTime, units) {
        super.update(deltaTime, units);
        if (!this.active || !this.alive) return;

        this.invisTimer += deltaTime / 1000;
        if (!this.isInvisible && this.invisTimer >= InvisibleUnit.VISIBLE_DURATION) {
            this.isInvisible = true;
            this.invisTimer  = 0;
        } else if (this.isInvisible && this.invisTimer >= InvisibleUnit.meta.time) {
            this.isInvisible = false;
            this.invisTimer  = 0;
        }
    }

    _drawBody(ctx) {
        ctx.save();
        ctx.globalAlpha = this.isInvisible ? 0.15 : 1;
        super._drawBody(ctx);
        ctx.restore();
    }

    draw(ctx) {
        super.draw(ctx);
    }
}

export class SplitUnit extends Unit {
    static meta = {
        type: 'SplitUnit', name: '분열하는넘', rarity: 'HERO',
        ico: '분', bg: '#fde8e0', fg: '#a03000',
        hp: 700, speed: 120, level: 1,
        hpPlus: 50, speedPlus: 10, splitPlus: 1,
        passive: '분열', splitNum: 2,
        passiveDesc: (num) => `사망 시 ${num}마리로 분열합니다.\n분열된 유닛은 30%의 체력과 200%의 속도를 갖습니다.`,
    };

    constructor() {
        super();
        this.maxHp    = SplitUnit.meta.hp;
        this.hp       = this.maxHp;
        this.speed    = SplitUnit.meta.speed;
        this.color    = '#e17055';
        this.isSplit  = false;
        this.splitNum = SplitUnit.meta.splitNum;
    }

    takeDamage(amount, units) {
        const actualDamage = amount * (1 - this.damageReduction / 100);
        if (!this.isSplit && this.hp - actualDamage <= 0) {
            this.alive  = false;
            this.active = false;
            game.deadCount++;
            shatterEffects.push({
                x: this.x, y: this.y,
                timer: 0, duration: 0.5,
                color: this.color,
                shards: Array.from({ length: 8 }, (_, i) => ({
                    angle: (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
                    speed: 28 + Math.random() * 22,
                    size:  3 + Math.random() * 2.5,
                })),
            });
            this._spawnChildren(units);
            checkWaveEnd();
            return;
        }
        super.takeDamage(amount, units);
    }

    _spawnChildren(units) {
        const GAP = 20;
        for (let i = 0; i < this.splitNum; i++) {
            const child            = new SplitUnit();
            child.isSplit          = true;
            child.splitNum         = this.splitNum;
            child.maxHp            = Math.floor(this.maxHp * 0.3);
            child.hp               = child.maxHp;
            child.speed            = this.speed * 2.0;
            child.waypoints        = this.waypoints;
            child.alive            = true;
            child.active           = true;
            child.spawned          = true;
            child.isPoisoned       = this.isPoisoned;
            child.poisonDps        = this.poisonDps;
            child.poisonTimer      = this.poisonTimer;

            const targetDist       = Math.max(0, this.distanceTraveled - i * GAP);
            const pos              = SplitUnit._posAt(this.waypoints, targetDist);
            child.x                = pos.x;
            child.y                = pos.y;
            child.waypointIndex    = pos.waypointIndex;
            child.distanceTraveled = pos.dist;

            units.push(child);
        }
    }

    static _posAt(waypoints, targetDist) {
        let cumDist = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            const dx     = waypoints[i + 1].x - waypoints[i].x;
            const dy     = waypoints[i + 1].y - waypoints[i].y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (cumDist + segLen >= targetDist) {
                const t = (targetDist - cumDist) / segLen;
                return { x: waypoints[i].x + dx * t, y: waypoints[i].y + dy * t, waypointIndex: i + 1, dist: targetDist };
            }
            cumDist += segLen;
        }
        return { x: waypoints[0].x, y: waypoints[0].y, waypointIndex: 1, dist: 0 };
    }

    _drawBody(ctx) {
        if (!this.isSplit) { super._drawBody(ctx); return; }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 9, 0, Math.PI * 2);
        ctx.fill();

        if (this.isPoisoned) {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 9, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(125, 186, 0, ${0.18 + 0.12 * pulse})`;
            ctx.fill();
        }
    }

    draw(ctx) {
        if (!this.active) return;
        if (!this.isSplit) { super.draw(ctx); return; }

        ctx.save();

        if (this.healFlash > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 9 + 4 * (1 - this.healFlash), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(46, 204, 113, ${this.healFlash})`;
            ctx.lineWidth   = 2;
            ctx.stroke();
        }

        if (this.isPoisoned) {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 11, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(125, 186, 0, ${0.5 + 0.4 * pulse})`;
            ctx.lineWidth   = 2;
            ctx.stroke();
        }

        this._drawBody(ctx);

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x - 14, this.y - 18, 28, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - 14, this.y - 18, 28 * (this.hp / this.maxHp), 4);

        ctx.restore();
    }
}

export class EvadeUnit extends Unit {
    static meta = {
        type: 'EvadeUnit', name: '잽싼넘', rarity: 'LEGEND',
        ico: '잽', bg: '#b8ede4', fg: '#0a6a4a',
        hp: 100, speed: 400, level: 1,
        hpPlus: 50, speedPlus: 20, dodgePlus: 10,
        passive: '회피', dodgeProb: 10,
        passiveDesc: (prob) => `${prob}% 확률로 공격을 피합니다.`,
    };
    constructor() {
        super();
        this.maxHp     = EvadeUnit.meta.hp;
        this.hp        = this.maxHp;
        this.speed     = EvadeUnit.meta.speed;
        this.color     = '#1abc9c';
        this.dodgeProb = EvadeUnit.meta.dodgeProb;
    }
    takeDamage(amount, units) {
        if (Math.random() < this.dodgeProb / 100) return;
        super.takeDamage(amount, units);
    }
}

export class TimeUnit extends Unit {
    static meta = {
        type: 'TimeUnit', name: '시간돌리는넘', rarity: 'LEGEND',
        ico: '시', bg: '#f0e8f8', fg: '#4a1a6a',
        hp: 450, speed: 200, level: 1,
        hpPlus: 60, speedPlus: 25, returnPlus: 15,
        passive: '시간역행', returnHp: 40,
        passiveDesc: (prob) => `사망 직전 체력을 ${prob}% 회복하며 시간을 되돌립니다.`,
    };
    constructor() {
        super();
        this.maxHp        = TimeUnit.meta.hp;
        this.hp           = this.maxHp;
        this.speed        = TimeUnit.meta.speed;
        this.color        = '#6c3483';
        this.returnHp     = TimeUnit.meta.returnHp;
        this.reversed     = false;
        this.reverseFlash = 0;
    }

    update(deltaTime, units) {
        super.update(deltaTime, units);
        if (this.reverseFlash > 0) {
            this.reverseFlash = Math.max(0, this.reverseFlash - deltaTime / 600);
        }
    }

    takeDamage(amount, units) {
        const actualDamage = amount * (1 - this.damageReduction / 100);
        if (!this.reversed && this.hp - actualDamage <= 0) {
            this.reversed     = true;
            this.reverseFlash = 1;
            this.hp           = Math.floor(this.maxHp * (this.returnHp / 100));
            this._reversePosition(this.distanceTraveled / 2);
            return;
        }
        super.takeDamage(amount, units);
    }

    _reversePosition(targetDist) {
        const wp = this.waypoints;
        let cumDist = 0;
        for (let i = 0; i < wp.length - 1; i++) {
            const dx     = wp[i + 1].x - wp[i].x;
            const dy     = wp[i + 1].y - wp[i].y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            if (cumDist + segLen >= targetDist) {
                const t              = (targetDist - cumDist) / segLen;
                this.x               = wp[i].x + dx * t;
                this.y               = wp[i].y + dy * t;
                this.waypointIndex   = i + 1;
                this.distanceTraveled = targetDist;
                return;
            }
            cumDist += segLen;
        }
        // targetDist가 0에 가까울 때 폴백
        this.x                = wp[0].x;
        this.y                = wp[0].y;
        this.waypointIndex    = 1;
        this.distanceTraveled = 0;
    }

    _drawBody(ctx) {
        super._drawBody(ctx);
        if (this.reverseFlash > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 12 + 8 * (1 - this.reverseFlash), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(108, 52, 131, ${this.reverseFlash})`;
            ctx.lineWidth   = 3;
            ctx.stroke();
        }
    }
}

export const shatterEffects = [];

export const UNIT_CLASSES = [
    NormalUnit, FastUnit, SlowUnit,
    FlyUnit, ShieldUnit, HealUnit,
    TauntUnit, BuffUnit,
    InvisibleUnit, SplitUnit,
    EvadeUnit, TimeUnit,
];
export const UNIT_CLASS = Object.fromEntries(UNIT_CLASSES.map(Cls => [Cls.name, Cls]));