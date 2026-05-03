import { game, checkWaveEnd } from './state.js';

export class Unit {
    constructor() {
        this.maxHp = 100;
        this.hp    = this.maxHp;
        this.x     = 0;
        this.y     = 0;
        this.speed = 100;
        this.waypointIndex = 0;
        this.alive  = true; // 죽으면 false
        this.active = false; // 죽거나 통과하면 false
        this.waypoints = [];
    }

    // 유닛 생성
    spawn(waypoints, hpMultiplier = 1, speedMultiplier = 1) {
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

        const target = this.waypoints[this.waypointIndex]; // 다음 웨이포인트
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy); // 타겟까지의 거리

        const moveAmount = this.speed * (deltaTime / 1000);

        if (distance <= moveAmount) {
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

        const nx = dx / distance;
        const ny = dy / distance;
        this.x += nx * moveAmount;
        this.y += ny * moveAmount;
    }

    // 피격 시 데미지 계산
    takeDamage(amount, units) {
        this.hp -= amount;
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
        ctx.fillStyle = this.color || '#3498db';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x - 20, this.y - 25, 40, 6);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - 20, this.y - 25, 40 * (this.hp / this.maxHp), 6);
        ctx.restore();
    }
}

export class NormalUnit extends Unit {
    static meta = {
        type: 'NormalUnit', name: '평범한넘', rarity: 'COMMON',
        ico: '평', bg: '#c8d8f0', fg: '#0a2aaa',
        hp: 500, speed: 200, level: 1,
        hpMul: 1.1, speedMul: 1.1,
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
        hp: 300, speed: 300, level: 1,
        hpMul: 1.15, speedMul: 1.05,
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
        hpMul: 1.15, speedMul: 1.05,
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
        hpMul: 1.1, speedMul: 1.1,
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
        hp: 700, speed: 120, level: 1,
        hpMul: 1.1, speedMul: 1.1, defMul: 1.5,
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

export class TauntUnit extends Unit {
    static meta = {
        type: 'TauntUnit', name: '어그로끄는넘', rarity: 'RARE',
        ico: '어', bg: '#f0c8c8', fg: '#aa1800',
        hp: 1100, speed: 100, level: 1,
        hpMul: 1.1, speedMul: 1.1,
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

export class InvisibleUnit extends Unit {
    static meta = {
        type: 'InvisibleUnit', name: '투명한넘', rarity: 'HERO',
        ico: '투', bg: '#e0e0e8', fg: '#5a5a7a',
        hp: 300, speed: 250, level: 1,
        hpMul: 1.05, speedMul: 1.15, timePlus: 0.5,
        passive: '투명', time: 2,
        passiveDesc: (time) => `4초마다 ${time}초 동안 타겟이 되지 않습니다.`,
    };

    static VISIBLE_DURATION = 4; // TODO: 수치 조정

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

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.globalAlpha = this.isInvisible ? 0.15 : 1;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x - 20, this.y - 25, 40, 6);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - 20, this.y - 25, 40 * (this.hp / this.maxHp), 6);
        ctx.restore();
    }
}

export class EvadeUnit extends Unit {
    static meta = {
        type: 'EvadeUnit', name: '잽싼넘', rarity: 'LEGEND',
        ico: '잽', bg: '#b8ede4', fg: '#0a6a4a',
        hp: 100, speed: 400, level: 1,
        hpMul: 1.1, speedMul: 1.1, dodgeMul: 1.5,
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

export const UNIT_CLASSES = [
    NormalUnit, FastUnit, SlowUnit,
    FlyUnit, ShieldUnit,
    TauntUnit,
    InvisibleUnit,
    EvadeUnit,
];
export const UNIT_CLASS = Object.fromEntries(UNIT_CLASSES.map(Cls => [Cls.name, Cls]));