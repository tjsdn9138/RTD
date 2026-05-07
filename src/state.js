export const STATE = {
    READY: 'READY',
    BATTLE: 'BATTLE',
    RESULT: 'RESULT',
    GAMEOVER: 'GAMEOVER',
    GAMECLEAR: 'GAMECLEAR',
};

// 게임의 현재 스테이터스
export const game = {
    state: STATE.READY,
    waveNumber: 1,
    lives: 3,
    gold: 100,
    unitSlots: 2,
    spawnTimer: 0,
    spawnInterval: 0.25,
    spawnCount: 0,
    survivedCount: 0,
    deadCount: 0,
    units: [], // 출전 유닛
    towers: [], // 현재 타워
    gameSpeed: 1, // 게임 배속 (1 ~ 3)
    waveResult: null, // 'CLEAR' | 'FAIL' | null
    pendingItem: null, // 사용 대기 중인 소비 아이템 type
    goldBonus: 0,
    autoSpawn: false,  // 자동 출전 활성화 여부
    gachaPulls: { unit: 0, item: 0 },
};

export const MAX_SLOTS       = 10; // 유닛 최대 개수
export const MAX_UNIT_LEVEL  = 20; // 유닛 최대 레벨
export const MAX_TOWER_LEVEL = 20; // 타워 최대 레벨
export const MAX_WAVES       = 40; // 총 웨이브 수

// 유닛 슬롯 추가 가격 계산
// TODO: 수치 조정
export function getSlotCost() {
    return (game.unitSlots - 1) * 100;
}

// 유닛 레벨업 가격 계산
// TODO: 수치 조정
export function getLevelUpCost(level) {
    return {
        units: level * 2,
        gold:  (level * 2) * 10,
        items: level * 2,
    };
}

// 유닛 슬롯 추가
export function buySlot() {
    const cost = getSlotCost();
    if (game.gold < cost || game.unitSlots >= MAX_SLOTS) return null;
    game.gold -= cost;
    game.unitSlots++;
    return true;
}

// 웨이브 클리어 보상 계산
// TODO: 수치 조정
export function getReward() {
    const defaultReward = game.waveNumber * 50;
    const extraReward = game.survivedCount > 1 ?
        (game.survivedCount - 1) * (defaultReward / 5) : 0
    const bonus = game.goldBonus || 0;
    return Math.floor(defaultReward + extraReward + bonus);
}

// 웨이브 시작
export function startWave() {
    game.state       = STATE.BATTLE;
    game.spawnTimer  = 0;
    game.spawnCount  = 0;
    game.autoSpawn   = false;
    game.survivedCount = 0;
    game.deadCount   = 0;
    game.units.forEach(unit => {
        unit.active = false;
        unit.alive  = true;
    });
    game.towers.forEach(tower => {
        if (tower) tower.attackTimer = 1 / tower.attackSpeed;
    });
}

// 웨이브 종료 확인
export function checkWaveEnd() {
    const allDone = game.units.every(unit => !unit.active);
    const allSent = game.units.every(unit => unit.spawned);
    if (!allSent || !allDone) return;
    game.waveResult = game.survivedCount > 0 ? 'CLEAR' : 'FAIL';
    game.state = STATE.RESULT;
}

// 실패 보상 계산
// TODO: 수치 조정
export function getFailReward() {
    return Math.floor(game.waveNumber * 100);
}

// 목숨 감소 — 0이 되면 게임 오버
export function loseLife() {
    game.lives--;
    game.gold += getFailReward();
    if (game.lives <= 0) {
        game.lives  = 0;
        game.state  = STATE.GAMEOVER;
    }
}

// 동일 웨이브 재시도
export function retryWave() {
    game.towers.forEach(t => { if (t) t.stopped = false; });
    game.pendingItem = null;
    game.waveResult  = null;
    game.state       = STATE.READY;
}

// 다음 웨이브로 넘어가기
export function nextWave() {
    game.towers.forEach(t => { if (t) t.stopped = false; });
    game.pendingItem = null;
    game.gold        += getReward();
    game.waveNumber++;
    game.waveResult  = null;
    game.state       = STATE.READY;
}

// 게임 클리어
export function gameWin() {
    game.pendingItem = null;
    game.state       = STATE.GAMECLEAR;
}