import { hasSaveData, getSaveSummary } from '../save.js';

function initStars() {
    const canvas = document.getElementById('title-stars');
    if (!canvas) return () => {};
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // 별
    const stars = Array.from({ length: 160 }, () => ({
        x:     Math.random(),
        y:     Math.random(),
        size:  Math.random() * 1.8 + 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.6 + 0.2,
        base:  Math.random() * 0.4 + 0.2,
    }));

    // 유성
    const meteors       = [];
    const pendingSpawns = []; // 예약된 생성 시각(초)
    let nextShower      = 2 + Math.random() * 3;
    let lastT           = null;

    function spawnMeteor() {
        const speed = 320 + Math.random() * 180;
        meteors.push({
            x:      canvas.width * (0.3 + Math.random() * 0.9),
            y:      -20,
            vx:     -speed,
            vy:     speed * (0.9 + Math.random() * 0.2),
            length: 90 + Math.random() * 110,
            alpha:  1,
        });
    }

    function scheduleShower(baseTime) {
        const count = Math.random() < 0.35
            ? Math.floor(Math.random() * 3) + 2  // 40%: 2~4개 동시
            : 1;
        for (let i = 0; i < count; i++) {
            pendingSpawns.push(baseTime + i * (0.12 + Math.random() * 0.18));
        }
    }

    function draw(t) {
        if (lastT === null) { lastT = t; raf = requestAnimationFrame(draw); return; }
        const dt   = Math.min((t - lastT) / 1000, 0.1);
        lastT      = t;
        const time = t / 1000;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ── 별 그리기 ──
        stars.forEach(s => {
            const alpha = s.base + (1 - s.base) * 0.5 * (1 + Math.sin(time * s.speed + s.phase));
            ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x * canvas.width, s.y * canvas.height, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // ── 유성우 스케줄링 ──
        if (time >= nextShower) {
            scheduleShower(time);
            nextShower = time + 5 + Math.random() * 7;
        }

        // 예약된 유성 생성
        for (let i = pendingSpawns.length - 1; i >= 0; i--) {
            if (time >= pendingSpawns[i]) {
                spawnMeteor();
                pendingSpawns.splice(i, 1);
            }
        }

        // ── 유성 업데이트 & 그리기 ──
        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            m.x += m.vx * dt;
            m.y += m.vy * dt;

            if (m.y > canvas.height + 60 || m.x < -100) {
                meteors.splice(i, 1);
                continue;
            }

            const spd = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
            const nx  = m.vx / spd;
            const ny  = m.vy / spd;
            const tx  = m.x - nx * m.length;
            const ty  = m.y - ny * m.length;

            const grad = ctx.createLinearGradient(tx, ty, m.x, m.y);
            grad.addColorStop(0,   `rgba(200, 220, 255, 0)`);
            grad.addColorStop(0.6, `rgba(220, 235, 255, ${m.alpha * 0.35})`);
            grad.addColorStop(1,   `rgba(245, 250, 255, ${m.alpha})`);

            ctx.save();
            ctx.strokeStyle = grad;
            ctx.lineWidth   = 1.8;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();

            // 머리 (밝은 점)
            ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        raf = requestAnimationFrame(draw);
    }

    let raf = requestAnimationFrame(draw);

    return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
    };
}

export function initTitleScreen(onNewGame, onContinue) {
    const overlay     = document.getElementById('title-overlay');
    const btnNew      = document.getElementById('btn-new-game');
    const btnContinue = document.getElementById('btn-continue');
    const saveInfo    = document.getElementById('title-save-info');
    const pressAnyKey = document.getElementById('title-press-any-key');
    const buttons     = document.getElementById('title-buttons');

    const stopStars = initStars();

    const hasSave = hasSaveData();
    btnContinue.disabled = !hasSave;
    btnContinue.classList.toggle('disabled', !hasSave);

    const summary = getSaveSummary();
    if (summary && saveInfo) {
        saveInfo.innerHTML =
            `WAVE <span>${summary.wave}</span> / 40` +
            `&nbsp;&nbsp;❤ <span>${summary.lives}</span>` +
            `&nbsp;&nbsp;<span>${summary.gold.toLocaleString()}</span>G`;
        saveInfo.style.display = 'block';
    }

    function showMenu() {
        pressAnyKey.style.display = 'none';
        buttons.classList.add('visible');
        document.removeEventListener('keydown', showMenu);
        overlay.removeEventListener('click', showMenu);
    }

    document.addEventListener('keydown', showMenu);
    overlay.addEventListener('click', showMenu);

    function exitTitle() {
        stopStars();
        overlay.remove();
    }

    btnNew.addEventListener('click', (e) => {
        e.stopPropagation();
        exitTitle();
        onNewGame();
    });

    btnContinue.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!hasSaveData()) return;
        exitTitle();
        onContinue();
    });
}
