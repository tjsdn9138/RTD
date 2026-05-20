import { game } from './state.js';
import { ownedUnits, inventory, deploySlots } from './game.js';
import { UNIT_CLASSES } from './units.js';
import { ITEM_CLASSES } from './items.js';
import { TOWER_CLASS } from './towers.js';
import { AUGMENTATION_CLASS } from './augmentations.js';

const KEY = 'rtd_save';

export function hasSaveData() {
    return !!localStorage.getItem(KEY);
}

export function saveGame() {
    const data = {
        wave:       game.waveNumber,
        lives:      game.lives,
        gold:       game.gold,
        unitSlots:   game.unitSlots,
        boughtSlots: game.boughtSlots,
        gachaPulls: { ...game.gachaPulls },

        towers: game.towers.map(t => {
            if (!t) return null;
            return {
                type:        t.constructor.name,
                level:       t.level,
                damage:      t.damage,
                attackSpeed: t.attackSpeed,
                range:       t.range,
            };
        }),

        unitMetas: UNIT_CLASSES.map(Cls => {
            const m = Cls.meta;
            const e = { type: Cls.name, level: m.level, hp: m.hp, speed: m.speed };
            if ('defense'   in m) e.defense   = m.defense;
            if ('time'      in m) e.time      = m.time;
            if ('dodgeProb' in m) e.dodgeProb = m.dodgeProb;
            if ('heal'      in m) e.heal      = m.heal;
            if ('decDamage' in m) e.decDamage = m.decDamage;
            if ('returnHp'  in m) e.returnHp  = m.returnHp;
            if ('splitNum'  in m) e.splitNum  = m.splitNum;
            if ('dashTime'  in m) e.dashTime  = m.dashTime;
            return e;
        }),

        ownedCounts: Object.fromEntries(ownedUnits.map(u => [u.type, u.count])),

        deploySlots: deploySlots.map(s => s ? { type: s.type, name: s.name } : null),

        itemMetas: ITEM_CLASSES.map(Cls => {
            const m = Cls.meta;
            const e = { type: Cls.name, level: m.level };
            if ('multiplier' in m) e.multiplier = m.multiplier;
            if ('bonus'      in m) e.bonus       = m.bonus;
            return e;
        }),

        inventoryData: Object.fromEntries(inventory.map(i => [i.type, {
            count:   i.count,
            owned:   i.owned,
            enabled: i.enabled,
        }])),

        totalSurvived:  game.totalSurvived,
        totalGoldSpent: game.totalGoldSpent,
        damageTakenBonus: game.damageTakenBonus,
        goldBonus: game.goldBonus,
        goldBonusPct: game.goldBonusPct,
        augSlots: game.augSlots,
        manualSpawnDisabled: game.manualSpawnDisabled,
        augWaves: game.augWaves,
        augPending: game.augPending,
        augChoices: game.augChoices,
        augmentations: game.augmentations.map(aug => {
            const entry = { name: aug.constructor.name };
            if (aug.done             !== undefined) entry.done             = aug.done;
            if (aug.goldGiven        !== undefined) entry.goldGiven        = aug.goldGiven;
            if (aug.wavesRemaining   !== undefined) entry.wavesRemaining   = aug.wavesRemaining;
            if (aug.originalUnitSlots !== undefined) entry.originalUnitSlots = aug.originalUnitSlots;
            if (aug.reward           !== undefined) entry.reward           = aug.reward;
            if (aug.lostLives        !== undefined) entry.lostLives        = aug.lostLives;
            if (aug.rewardLabel      !== undefined) entry.rewardLabel      = aug.rewardLabel;
            return entry;
        }),
        savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadGame() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;

    try {
        const data = JSON.parse(raw);

        game.waveNumber  = data.wave;
        game.lives       = data.lives;
        game.gold        = data.gold;
        game.unitSlots   = data.unitSlots;
        game.boughtSlots = data.boughtSlots ?? 0;
        game.gachaPulls  = data.gachaPulls ?? { unit: 0, item: 0 };
        game.totalSurvived    = data.totalSurvived    ?? 0;
        game.totalGoldSpent   = data.totalGoldSpent   ?? 0;
        game.damageTakenBonus = data.damageTakenBonus ?? 0;
        game.goldBonus        = data.goldBonus        ?? 0;
        game.goldBonusPct     = data.goldBonusPct     ?? 0;
        game.augSlots         = data.augSlots ?? 0;
        game.augWaves   = data.augWaves ?? [];
        game.augPending = data.augPending ?? false;
        game.augChoices = data.augChoices ?? [];
        game.augmentations = (data.augmentations ?? []).map(entry => {
            const name = typeof entry === 'string' ? entry : entry.name;
            const Cls = AUGMENTATION_CLASS[name];
            if (!Cls) return null;
            const aug = new Cls();
            if (entry.done              !== undefined) aug.done              = entry.done;
            if (entry.goldGiven         !== undefined) aug.goldGiven         = entry.goldGiven;
            if (entry.wavesRemaining    !== undefined) aug.wavesRemaining    = entry.wavesRemaining;
            if (entry.originalUnitSlots !== undefined) aug.originalUnitSlots = entry.originalUnitSlots;
            if (entry.reward            !== undefined) aug.reward            = entry.reward;
            if (entry.lostLives         !== undefined) aug.lostLives         = entry.lostLives;
            if (entry.rewardLabel       !== undefined) aug.rewardLabel       = entry.rewardLabel;
            return aug;
        }).filter(Boolean);

        // 타워 복원 (위치는 나중에 relocateTower() 가 처리)
        if (data.towers) {
            game.towers.length = 0;
            data.towers.forEach((t, i) => {
                if (!t) { game.towers[i] = null; return; }
                const Cls = TOWER_CLASS[t.type];
                if (!Cls) return;
                const tower = new Cls(0, 0);
                tower.level       = t.level;
                tower.damage      = t.damage;
                tower.attackSpeed = t.attackSpeed;
                tower.range       = t.range;
                game.towers[i]    = tower;
            });
        }

        // 유닛 메타 복원
        data.unitMetas?.forEach(saved => {
            const Cls = UNIT_CLASSES.find(C => C.name === saved.type);
            if (!Cls) return;
            const m = Cls.meta;
            m.level = saved.level;
            m.hp    = saved.hp;
            m.speed = saved.speed;
            if ('defense'   in saved) m.defense   = saved.defense;
            if ('time'      in saved) m.time      = saved.time;
            if ('dodgeProb' in saved) m.dodgeProb = saved.dodgeProb;
            if ('heal'      in saved) m.heal      = saved.heal;
            if ('decDamage' in saved) m.decDamage = saved.decDamage;
            if ('returnHp'  in saved) m.returnHp  = saved.returnHp;
            if ('splitNum'  in saved) m.splitNum  = saved.splitNum;
            if ('dashTime'  in saved) m.dashTime  = saved.dashTime;
        });

        // 보유 유닛 개수 복원
        ownedUnits.forEach(u => {
            const c = data.ownedCounts?.[u.type];
            if (c !== undefined) u.count = c;
        });

        // 출전 슬롯 복원
        deploySlots.fill(null);
        data.deploySlots?.forEach((s, i) => { deploySlots[i] = s; });

        // 아이템 메타 복원
        data.itemMetas?.forEach(saved => {
            const Cls = ITEM_CLASSES.find(C => C.name === saved.type);
            if (!Cls) return;
            const m = Cls.meta;
            m.level = saved.level;
            if ('multiplier' in saved) m.multiplier = saved.multiplier;
            if ('bonus'      in saved) m.bonus       = saved.bonus;
        });

        // 인벤토리 복원
        inventory.forEach(item => {
            const saved = data.inventoryData?.[item.type];
            if (!saved) return;
            item.count   = saved.count;
            item.owned   = saved.owned;
            item.enabled = saved.enabled;
        });

        return true;
    } catch {
        return false;
    }
}

export function deleteSave() {
    localStorage.removeItem(KEY);
}

export function getSaveSummary() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
        const data = JSON.parse(raw);
        return { wave: data.wave, lives: data.lives, gold: data.gold };
    } catch {
        return null;
    }
}
