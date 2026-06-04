// 길 전환점 반환
export function getWaypoints(W, H) {
    return [
        { x: 0,        y: H * 0.25 },
        { x: W * 0.75, y: H * 0.25 },
        { x: W * 0.75, y: H * 0.50 },
        { x: W * 0.25, y: H * 0.50 },
        { x: W * 0.25, y: H * 0.75 },
        { x: W * 0.75, y: H * 0.75 },
        { x: W,        y: H * 0.75 },
    ];
}

// 설치 가능한 타워 위치 반환
export function getTowerSlots(W, H) {
    return [
        // 1번 직선 위
        { x: W * 0.30, y: H * 0.14 },
        { x: W * 0.50, y: H * 0.14 },
        { x: W * 0.70, y: H * 0.14 },
        // 1번+2번 사이 커버
        { x: W * 0.20, y: H * 0.37 },
        { x: W * 0.40, y: H * 0.37 },
        { x: W * 0.60, y: H * 0.37 },
        { x: W * 0.85, y: H * 0.37 },
        // 2번+3번 사이 커버
        { x: W * 0.15, y: H * 0.62 },
        { x: W * 0.40, y: H * 0.62 },
        { x: W * 0.60, y: H * 0.62 },
        { x: W * 0.80, y: H * 0.62 },
        // 3번 직선 아래
        { x: W * 0.30, y: H * 0.86 },
        { x: W * 0.50, y: H * 0.86 },
        { x: W * 0.70, y: H * 0.86 },
    ];
}

// 맵 그리기 — 오프스크린 캐시
let mapCache = null;

export function drawMap(ctx, W, H, waypoints) {
    const dpr   = window.devicePixelRatio || 1;
    const physW = Math.round(W * dpr);
    const physH = Math.round(H * dpr);
    if (!mapCache || mapCache.width !== physW || mapCache.height !== physH) {
        mapCache = buildMapCache(W, H, waypoints, dpr);
    }
    ctx.drawImage(mapCache, 0, 0, W, H);
}

function buildMapCache(W, H, waypoints, dpr = 1) {
    const offscreen = document.createElement('canvas');
    offscreen.width  = Math.round(W * dpr);
    offscreen.height = Math.round(H * dpr);
    const c = offscreen.getContext('2d');
    c.scale(dpr, dpr);

    // 기본 잔디색
    c.fillStyle = '#5a8a3a';
    c.fillRect(0, 0, W, H);

    // 도트 잔디 텍스처 — 밝은 점
    c.fillStyle = '#6a9a48';
    const dotSize = 4;
    const gap = 12;
    for (let x = 0; x < W; x += gap) {
        for (let y = 0; y < H; y += gap) {
            c.fillRect(x, y, dotSize, dotSize);
        }
    }

    // 도트 잔디 텍스처 — 어두운 점 (엇갈리게)
    c.fillStyle = '#4a7a2a';
    for (let x = gap / 2; x < W; x += gap) {
        for (let y = gap / 2; y < H; y += gap) {
            c.fillRect(x, y, dotSize - 1, dotSize - 1);
        }
    }

    // ── 경로 테두리 (먼저 그려서 아래 깔기) ───────────
    const pathW = W * 0.07;
    c.save();
    c.strokeStyle = '#8a6a30';
    c.lineWidth = pathW + 8;
    c.lineCap = 'square';
    c.lineJoin = 'miter';
    c.beginPath();
    c.moveTo(waypoints[0].x, waypoints[0].y);
    waypoints.slice(1).forEach(wp => c.lineTo(wp.x, wp.y));
    c.stroke();

    // 경로 본체
    c.strokeStyle = '#c8a85a';
    c.lineWidth = pathW;
    c.beginPath();
    c.moveTo(waypoints[0].x, waypoints[0].y);
    waypoints.slice(1).forEach(wp => c.lineTo(wp.x, wp.y));
    c.stroke();

    // 경로 도트 패턴 (흙길 느낌)
    c.strokeStyle = '#b89848';
    c.lineWidth = 2;
    c.setLineDash([6, 10]);
    c.beginPath();
    c.moveTo(waypoints[0].x, waypoints[0].y);
    waypoints.slice(1).forEach(wp => c.lineTo(wp.x, wp.y));
    c.stroke();
    c.setLineDash([]);
    c.restore();

    // ── 입구 / 출구 ────────────────────────────────────
    const fontSize = Math.max(10, Math.floor(W * 0.028));
    c.save();
    c.font = `${fontSize}px NeoDunggeunmo`;
    c.textBaseline = 'middle';

    // START 배경
    c.fillStyle = '#1a5a00';
    c.fillRect(0, waypoints[0].y - fontSize - 4, fontSize * 3.2, fontSize + 8);
    c.fillStyle = '#aaffaa';
    c.textAlign = 'left';
    c.fillText('START', 4, waypoints[0].y - fontSize + 1);

    // GOAL 배경
    c.fillStyle = '#5a0000';
    const goalW = fontSize * 2.8;
    c.fillRect(W - goalW, waypoints[waypoints.length-1].y - fontSize - 4, goalW, fontSize + 8);
    c.fillStyle = '#ffaaaa';
    c.textAlign = 'right';
    c.fillText('GOAL', W - 4, waypoints[waypoints.length-1].y - fontSize + 1);
    c.restore();

    return offscreen;
}

// 타워 슬롯 그리기
export function drawTowerSlots(ctx, slots, towers) {
    const slotSize = 28;
    const innerSize = 20;

    slots.forEach((slot, i) => {
        const tower = towers[i];
        const stopped = tower?.stopped;

        ctx.save();

        // 슬롯 그림자
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(slot.x - slotSize/2 + 2, slot.y - slotSize/2 + 2, slotSize, slotSize);

        // 슬롯 외곽 (픽셀 테두리)
        ctx.fillStyle = '#4a3a1a';
        ctx.fillRect(slot.x - slotSize/2, slot.y - slotSize/2, slotSize, slotSize);

        if (tower) {
            // 타워 있음 — 색상 채우기
            ctx.fillStyle = stopped ? '#333' : tower.color;
            ctx.fillRect(slot.x - innerSize/2, slot.y - innerSize/2, innerSize, innerSize);

            // 정지 표시
            if (stopped) {
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(slot.x - 6, slot.y - 6);
                ctx.lineTo(slot.x + 6, slot.y + 6);
                ctx.moveTo(slot.x + 6, slot.y - 6);
                ctx.lineTo(slot.x - 6, slot.y + 6);
                ctx.stroke();
            }

            // 방해 효과 (jamTimer > 0)
            if (tower.jamTimer > 0) {
                const t = tower.jamTimer / 0.3;
                ctx.fillStyle = `rgba(186, 220, 88, ${0.35 * t})`;
                ctx.fillRect(slot.x - innerSize/2, slot.y - innerSize/2, innerSize, innerSize);
                ctx.strokeStyle = `rgba(186, 220, 88, ${0.9 * t})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(slot.x - innerSize/2, slot.y - innerSize/2, innerSize, innerSize);
            }

            // 사거리 표시
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(slot.x, slot.y, tower.range, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // 빈 슬롯 — 어두운 내부
            ctx.fillStyle = '#2a2a1a';
            ctx.fillRect(slot.x - innerSize/2, slot.y - innerSize/2, innerSize, innerSize);

            // 빈 슬롯 표시 (작은 점)
            ctx.fillStyle = '#6a5a3a';
            ctx.fillRect(slot.x - 2, slot.y - 2, 4, 4);
        }

        ctx.restore();
    });
}