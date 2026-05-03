import { initUI, updateHUD, refreshUnitPanel, refreshBagPanel } from './ui/ui.js';
import { loadGame, deleteSave } from './save.js';
import { initTitleScreen } from './ui/title.js';
import { STATE, game, inventory, startWave, nextWave, checkWaveEnd, levelUpTower, selectTower, underWeightedPick } from './game.js';
import { getWaypoints, getTowerSlots, drawMap, drawTowerSlots } from './maps/map1.js';
import { TOWER_CLASS, attackFlashes } from './towers.js';
import { applyPassiveItems } from './items.js';

// canvas 세팅
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// 맵 상태
let waypoints  = [];
let towerSlots = [];

// 맵 생성
function initMap() {
    const W = canvas.width;
    const H = canvas.height;
    waypoints  = getWaypoints(W, H);
    towerSlots = getTowerSlots(W, H);

    relocateTower();
}

// 타워 위치 재조정
export function relocateTower() {
    for (let i = 0; i < towerSlots.length; i++) {
        if (game.towers[i]) {
            game.towers[i].x = towerSlots[i].x;
            game.towers[i].y = towerSlots[i].y;
        }
    }
}

// 게임 시작 시 첫 타워 생성 (1회)
function initFirstTower() {
    const idx = Math.floor(Math.random() * towerSlots.length);
    game.towers[idx] = new TOWER_CLASS['NormalTower'](towerSlots[idx].x, towerSlots[idx].y);
}

// 창 크기에 맞춰서 캔버스 크기 설정
function resizeCanvas() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    initMap();
}
// 창 크기 변경 시 실행
window.addEventListener('resize', resizeCanvas);

// wavestart 이벤트
document.addEventListener('wavestart', (e) => {
    game.units = e.detail.units;
    game.goldBonus = 0;
    applyPassiveItems(game.units, inventory);
    startWave();
    updateHUD();
    refreshUnitPanel();
});

// nextwavestart 이벤트 — 5웨이브마다 타워 생성, 나머지는 레벨업
document.addEventListener('nextwavestart', () => {
    if (game.waveNumber % 5 === 0) {
        const emptyIdxList = towerSlots.map((_, i) => i).filter(i => !game.towers[i]);
        if (emptyIdxList.length > 0) {
            const emptyIdx = emptyIdxList[Math.floor(Math.random() * emptyIdxList.length)];

            let selectedTower;
            // 10번째 웨이브마다 상위 타워 고정 생성
            if (game.waveNumber % 10 === 0) {
                const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'HERO', 'LEGEND'];
                selectedTower = selectTower(rarities[Math.floor(game.waveNumber / 10)])
            } else {
                selectedTower = underWeightedPick(Math.floor(game.waveNumber / 10));
            }
            if (selectedTower) {
                // 기존 타워 최솟값 먼저 계산 (새 타워 추가 전)
                let minTowerLevel = game.towers.reduce((min, t) => t ? Math.min(min, t.level) : min, 100);
                if (minTowerLevel === 100) minTowerLevel = 1;
                game.towers[emptyIdx] = new TOWER_CLASS[selectedTower](towerSlots[emptyIdx].x, towerSlots[emptyIdx].y);
                // 웨이브 비례 타워 레벨업
                for (let i = 1; i < minTowerLevel; i++) levelUpTower(game.towers[emptyIdx]);
            }
        }
    } 
    else {
        const existList = game.towers.filter(Boolean);
        if (existList.length > 0) {
            const tower = existList[Math.floor(Math.random() * existList.length)];
            levelUpTower(tower);
            addLevelUpEffect(tower.x, tower.y);
        }
    }
});

// 타워 정지 아이템 — 전투 중 타워 클릭
canvas.addEventListener('click', (e) => {
    if (game.state !== STATE.BATTLE) return;
    if (game.pendingItem !== 'TowerStop') return;

    const stopItem = inventory.find(i => i.type === 'TowerStop' && i.count > 0);
    if (!stopItem) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let used = false;
    game.towers.forEach(tower => {
        if (!tower || tower.stopped) return;
        const dx = mx - tower.x;
        const dy = my - tower.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
            tower.stopped = true;
            stopItem.count--;
            used = true;
        }
    });

    game.pendingItem = null;
    document.querySelector('.bag-card.selected')?.classList.remove('selected');
    refreshBagPanel();
});

// 레벨업 이펙트
const effects = [];

function addLevelUpEffect(x, y) {
    effects.push({
        x, y,
        timer: 0,
        duration: 1.0,
        sparkles: Array.from({ length: 8 }, (_, i) => ({
            angle: (i / 8) * Math.PI * 2,
            speed: 28 + Math.random() * 16,
        })),
    });
}

function updateAndDrawEffects(rawDelta) {
    for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.timer += rawDelta;
        if (e.timer >= e.duration) { effects.splice(i, 1); continue; }

        const t     = e.timer / e.duration;
        const alpha = 1 - t;

        ctx.save();

        // 파동 링
        ctx.strokeStyle = `rgba(255, 220, 50, ${alpha})`;
        ctx.lineWidth   = 3 * (1 - t);
        ctx.beginPath();
        ctx.arc(e.x, e.y, t * 55, 0, Math.PI * 2);
        ctx.stroke();

        // 반짝이 파티클
        e.sparkles.forEach((s, idx) => {
            const dist    = 18 + t * s.speed;
            const sx      = e.x + Math.cos(s.angle) * dist;
            const sy      = e.y + Math.sin(s.angle) * dist;
            const twinkle = Math.abs(Math.sin(e.timer * 12 + idx * 1.3));
            ctx.fillStyle = `rgba(255, 255, 180, ${alpha * twinkle})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 3 * (1 - t * 0.5), 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }
}

// 공격 이펙트 렌더링
function updateAndDrawAttackFlashes(rawDelta) {
    for (let i = attackFlashes.length - 1; i >= 0; i--) {
        const f = attackFlashes[i];
        f.timer += rawDelta;
        if (f.timer >= f.duration) { attackFlashes.splice(i, 1); continue; }

        const t     = f.timer / f.duration;
        const alpha = 1 - t;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = f.color;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(f.x1, f.y1);
        ctx.lineTo(f.x2, f.y2);
        ctx.stroke();

        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x2, f.y2, 5 * (1 - t), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 게임 루프
let lastTime  = null;
let prevState = null;

function gameLoop(timestamp) {
    if (lastTime === null) { lastTime = timestamp; requestAnimationFrame(gameLoop); return; }
    const rawDelta  = Math.min((timestamp - lastTime) / 1000, 0.1);
    const deltaTime = rawDelta * game.gameSpeed * 1000;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap(ctx, canvas.width, canvas.height, waypoints);
    drawTowerSlots(ctx, towerSlots, game.towers);

    if (game.state === STATE.BATTLE) {
        game.spawnTimer += deltaTime / 1000;
        if (game.spawnCount < game.units.length && game.spawnTimer >= game.spawnInterval) {
            game.units[game.spawnCount].spawn(waypoints, 1, 1);
            game.spawnCount++;
            game.spawnTimer = 0;
        }

        game.towers.forEach(t => { if (t) t.update(deltaTime, game.units); });
        game.units.forEach(u => u.update(deltaTime, game.units));

        checkWaveEnd();
    }

    if (prevState !== STATE.RESULT && game.state === STATE.RESULT) {
        updateHUD();
    }
    prevState = game.state;

    game.units.forEach(u => u.draw(ctx));
    updateAndDrawAttackFlashes(rawDelta);
    updateAndDrawEffects(rawDelta);

    requestAnimationFrame(gameLoop);
}

// 타이틀 화면 — 선택 후 게임 초기화
function startGame(isNew) {
    resizeCanvas();
    if (isNew) initFirstTower();
    initUI();
    requestAnimationFrame(gameLoop);
}

initTitleScreen(
    () => { deleteSave(); startGame(true); },
    () => { loadGame();   startGame(false); },
);