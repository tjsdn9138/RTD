export class Augmentation {
    static meta = {
        name: '',
        rarity: 'COMMON',
        desc: '',
        tags: [], // 'unit', 'tower'등
    }
    onWaveStart(units) {}
    onWaveClear(units) {}
    onWaveFail(units) {}
    onUnitSurvive(unit) {}
    onUnitDeath(unit, units) {}
}

export class FastAug extends Augmentation {
    static meta = {
        name: 'temp',
        rarity: 'COMMON',
        desc: '아군 전체의 최대 체력이 50% 감소하는 대신 속도가 90% 증가합니다.',
        tags: ['unit'],
    }
    onWaveStart(units) {
        units.forEach(unit => { unit.maxHp *= 0.5; unit.hp = unit.maxHp; });
        units.forEach(unit => { unit.speed *= 1.9; });
    }
}

export const AUGMENTATION_CLASSES = [
    FastAug,
];
export const AUGMENTATION_CLASS = Object.fromEntries(
    AUGMENTATION_CLASSES.map(Cls => [Cls.name, Cls])
);
