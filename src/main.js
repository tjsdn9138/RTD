import { initUI, updateHUD, refreshUnitPanel, refreshBagPanel } from './ui/ui.js';
import { initUnitPopup } from './ui/unit-popup.js';
import { loadGame, deleteSave, saveGame } from './save.js';
import { initTitleScreen } from './ui/title.js';
import { STATE, game, inventory, startWave, nextWave, checkWaveEnd, levelUpTower, selectTower, selectRandomTower, MAX_TOWER_LEVEL, generateAugWaves } from './game.js';
import { getWaypoints, getTowerSlots, drawMap, drawTowerSlots } from './maps/map1.js';
import { TOWER_CLASS, attackFlashes } from './towers.js';
import { shatterEffects } from './units.js';
import { applyPassiveItems } from './items.js';
import { dispatchAug } from './augmentations.js';

// canvas 세팅
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// 맵 상태
let waypoints  = [];
let towerSlots = [];
let logicalW   = 0;
let logicalH   = 0;

// 맵 생성
function initMap() {
    waypoints  = getWaypoints(logicalW, logicalH);
    towerSlots = getTowerSlots(logicalW, logicalH);
    relocateTower();
    game.relocateTowers = relocateTower;
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
    const towerRange = new TOWER_CLASS['NormalTower'](0, 0).range;
    const weights = towerSlots.map(slot => {
        const cov = getSlotPathCoverage(slot, waypoints, towerRange);
        return cov > 0 ? 1 / cov : 0;
    });
    const idx = pickWeightedIndex(weights);
    game.towers[idx] = new TOWER_CLASS['StunTower'](towerSlots[idx].x, towerSlots[idx].y);
}

// 슬롯에서 경로 세그먼트 중 range 안에 들어오는 길이 계산
function segmentCoveredLength(px, py, ax, ay, bx, by, r) {
    const dx = bx - ax, dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return 0;
    const fx = ax - px, fy = ay - py;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return 0;
    const sq = Math.sqrt(disc);
    const t1 = Math.max(0, Math.min(1, (-b - sq) / (2 * a)));
    const t2 = Math.max(0, Math.min(1, (-b + sq) / (2 * a)));
    return Math.max(0, t2 - t1) * len;
}

// 슬롯이 커버하는 경로 총길이 (모든 세그먼트 합산)
function getSlotPathCoverage(slot, wps, range) {
    let total = 0;
    for (let i = 0; i < wps.length - 1; i++) {
        total += segmentCoveredLength(
            slot.x, slot.y,
            wps[i].x, wps[i].y,
            wps[i + 1].x, wps[i + 1].y,
            range
        );
    }
    return total;
}

// 가중치 배열에서 인덱스 랜덤 선택
function pickWeightedIndex(weights) {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
    }
    return weights.length - 1;
}

// 창 크기에 맞춰서 캔버스 크기 설정
function resizeCanvas() {
    const dpr  = window.devicePixelRatio || 1;
    const cssW = canvas.offsetWidth;
    const cssH = canvas.offsetHeight;

    const oldW = logicalW;
    const oldH = logicalH;
    logicalW = cssW;
    logicalH = cssH;

    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initMap();

    if (oldW > 0 && oldH > 0 && game.units.length > 0) {
        const scaleX = logicalW / oldW;
        const scaleY = logicalH / oldH;
        game.units.forEach(u => {
            if (u.active) {
                u.x *= scaleX;
                u.y *= scaleY;
                u.waypoints = waypoints;
            }
        });
    }
    setUIScale();
}

// 뷰포트 크기에 따라 UI 전체 스케일 계산 (브라우저 zoom과 무관)
function setUIScale() {
    const scaleH = window.innerHeight / 768;
    const scaleW = (window.innerWidth * 0.4) / 640;
    const scale  = Math.max(0.7, Math.min(1.4, Math.min(scaleH, scaleW)));
    document.documentElement.style.setProperty('--ui-scale', scale);
}
setUIScale();

// 창 크기 변경 시 실행 (브라우저 zoom 변경은 무시)
// Chrome  zoom: innerWidth × dpr 일정 (dpr 같이 변함)
// Safari  zoom: outerWidth 일정   (dpr 안 변하고 innerWidth만 줄어듦)
let lastPhysViewW = Math.round(window.innerWidth  * (window.devicePixelRatio || 1));
let lastPhysViewH = Math.round(window.innerHeight * (window.devicePixelRatio || 1));
let lastOuterW    = window.outerWidth;
let lastOuterH    = window.outerHeight;
window.addEventListener('resize', () => {
    const physW  = Math.round(window.innerWidth  * (window.devicePixelRatio || 1));
    const physH  = Math.round(window.innerHeight * (window.devicePixelRatio || 1));
    const outerW = window.outerWidth;
    const outerH = window.outerHeight;
    const isZoom = (physW === lastPhysViewW && physH === lastPhysViewH)
                || (outerW === lastOuterW   && outerH === lastOuterH);
    lastPhysViewW = physW;
    lastPhysViewH = physH;
    lastOuterW    = outerW;
    lastOuterH    = outerH;
    if (!isZoom) resizeCanvas();
});

// 수동 유닛 출전 (autoSpawn 중엔 차단)
document.addEventListener('spawnunit', (e) => {
    if (game.autoSpawn) return;
    e.detail.unit.spawn(waypoints, 1, 1);
    dispatchAug('onUnitSpawn', e.detail.unit, game.units, waypoints);
});

// wavestart 이벤트
document.addEventListener('wavestart', (e) => {
    game.units = e.detail.units;
    game.goldBonus = 0;
    applyPassiveItems(game.units, inventory);
    startWave();
    dispatchAug('onWaveStart', game.units);
    updateHUD();
    refreshUnitPanel();
});

// nextwavestart 이벤트 — 5웨이브마다 타워 생성, 나머지는 레벨업
document.addEventListener('nextwavestart', () => {
    if (game.waveNumber % 5 === 0) {
        const emptyIdxList = towerSlots.map((_, i) => i).filter(i => !game.towers[i]);
        if (emptyIdxList.length > 0) {
            // 타워 먼저 선택
            let selectedTower;
            if (game.waveNumber % 10 === 0) {
                selectedTower = selectTower(Math.floor(game.waveNumber / 10));
            } else {
                selectedTower = selectRandomTower(Math.floor(game.waveNumber / 10));
            }
            if (selectedTower) {
                // 해당 타워의 실제 사거리로 슬롯별 커버 경로 계산 후 반비례 가중치로 슬롯 선택
                const towerRange = new TOWER_CLASS[selectedTower](0, 0).range;
                const weights = emptyIdxList.map(i => {
                    const cov = getSlotPathCoverage(towerSlots[i], waypoints, towerRange);
                    return cov > 0 ? 1 / cov : 0;
                });
                const emptyIdx = emptyIdxList[pickWeightedIndex(weights)];

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
        const levelUpCnt = Math.max(1, Math.floor(game.waveNumber / 10));
        for (let i = 0; i < levelUpCnt; i++) {
            const existList = game.towers.filter(t => t && t.level < MAX_TOWER_LEVEL);
            if (existList.length > 0) {
                const tower = existList[Math.floor(Math.random() * existList.length)];
                levelUpTower(tower);
                addLevelUpEffect(tower.x, tower.y);
            }
        }
    }
    saveGame();
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
        if (tower.constructor.name === 'AllRoundTower') return;
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
    if (used) saveGame();
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

// 분열 파편 이펙트 렌더링
function updateAndDrawShatterEffects(rawDelta) {
    for (let i = shatterEffects.length - 1; i >= 0; i--) {
        const e = shatterEffects[i];
        e.timer += rawDelta;
        if (e.timer >= e.duration) { shatterEffects.splice(i, 1); continue; }

        const t = e.timer / e.duration;

        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle   = e.color;

        e.shards.forEach(s => {
            const dist = s.speed * t;
            const sx   = e.x + Math.cos(s.angle) * dist;
            const sy   = e.y + Math.sin(s.angle) * dist;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(s.angle + t * Math.PI * 1.5);
            ctx.beginPath();
            ctx.moveTo(0, -s.size);
            ctx.lineTo(s.size * 0.6, s.size * 0.8);
            ctx.lineTo(-s.size * 0.6, s.size * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
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

        if (f.ring) {
            ctx.save();
            ctx.globalAlpha = (1 - t) * 0.55;
            ctx.shadowBlur  = 8;
            ctx.shadowColor = f.color;
            ctx.strokeStyle = f.color;
            ctx.lineWidth   = 1.5 * (1 - t * 0.5);
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.maxRadius * t, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            continue;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        if (f.glow) {
            ctx.shadowBlur  = 12;
            ctx.shadowColor = f.color;
        }

        ctx.strokeStyle = f.color;
        ctx.lineWidth   = f.lineWidth ?? 2;
        ctx.beginPath();
        ctx.moveTo(f.x1, f.y1);
        ctx.lineTo(f.x2, f.y2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle  = f.color;
        ctx.beginPath();
        ctx.arc(f.x2, f.y2, (f.dotRadius ?? 5) * (1 - t), 0, Math.PI * 2);
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
    game.time += deltaTime;

    ctx.clearRect(0, 0, logicalW, logicalH);
    drawMap(ctx, logicalW, logicalH, waypoints);
    drawTowerSlots(ctx, towerSlots, game.towers);

    if (game.state === STATE.BATTLE) {
        if (game.autoSpawn) {
            game.spawnTimer += deltaTime / 1000;
            if (game.spawnTimer >= game.spawnInterval) {
                game.spawnTimer = 0;
                const next = game.units.find(u => !u.spawned);
                if (next) {
                    next.spawn(waypoints, 1, 1);
                    dispatchAug('onUnitSpawn', next, game.units, waypoints);
                    if (!game.units.some(u => !u.spawned)) game.autoSpawn = false;
                } else {
                    game.autoSpawn = false;
                }
                refreshUnitPanel();
            }
        }

        game.units.forEach(u => { u.proximityBonus = 0; });
        dispatchAug('onUpdate', deltaTime, game.units);
        game.towers.forEach(t => { if (t) t.update(deltaTime, game.units); });
        game.units.forEach(u => u.update(deltaTime, game.units));

        checkWaveEnd();
    }

    if (prevState !== STATE.RESULT && game.state === STATE.RESULT) {
        if (game.waveResult === 'CLEAR') dispatchAug('onWaveClear', game.units);
        else dispatchAug('onWaveFail', game.units);
        updateHUD();
        refreshUnitPanel();
    }
    prevState = game.state;

    game.units.forEach(u => u.draw(ctx));
    updateAndDrawShatterEffects(rawDelta);
    updateAndDrawAttackFlashes(rawDelta);
    updateAndDrawEffects(rawDelta);

    requestAnimationFrame(gameLoop);
}

// 타이틀 화면 — 선택 후 게임 초기화
function startGame(isNew) {
    resizeCanvas();
    initUnitPopup();
    if (isNew) {
        generateAugWaves();
        initFirstTower();
        saveGame();
    } else if (!game.augWaves.length) {
        generateAugWaves(); // 구세이브 호환
    }
    initUI();
    requestAnimationFrame(gameLoop);
}

// "새 게임" 클릭 시 reload로 모든 클래스 메타(레벨업으로 변형된 static meta)를 초기화
// reload 직후엔 타이틀을 건너뛰고 바로 신규 게임 시작
const FRESH_START_KEY = 'rtd-fresh-start';
if (sessionStorage.getItem(FRESH_START_KEY)) {
    sessionStorage.removeItem(FRESH_START_KEY);
    // index.html에 정적으로 박혀있는 타이틀 오버레이를 제거 (initTitleScreen 스킵하므로 직접 정리)
    document.getElementById('title-overlay')?.remove();
    startGame(true);
} else {
    initTitleScreen(
        () => {
            deleteSave();
            sessionStorage.setItem(FRESH_START_KEY, '1');
            location.reload();
        },
        () => { loadGame(); startGame(false); },
    );
}