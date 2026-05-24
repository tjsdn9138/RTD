// 웨이브 클리어/실패 시 자동 표시되는 결과 모달.
// NEXT WAVE / RETRY 버튼은 사이드바의 btn-start 를 트리거해 기존 흐름 그대로 재사용.

let _overlay = null;

export function closeWaveResultPopup() {
    if (_overlay) {
        _overlay.remove();
        _overlay = null;
    }
}

// spawned: [{ color, name, survived }, ...] — 출전한 모든 유닛 순서. SplitUnit 자식 제외 처리는 호출 측에서.
// deadCount: 사망 유닛 수 (통계 표시용; spawned.filter 와 동일).
export function showWaveResultPopup({ result, wave, spawned, deadCount, reward, lifeLost }) {
    closeWaveResultPopup();

    const isClear = result === 'CLEAR';
    const survivedCount = spawned.filter(u => u.survived).length;

    _overlay = document.createElement('div');
    _overlay.id = 'waveresult-overlay';

    const box = document.createElement('div');
    box.id = 'waveresult-box';
    box.classList.add(isClear ? 'wr-clear' : 'wr-fail');

    const title = document.createElement('div');
    title.className = 'wr-title';
    title.textContent = `WAVE ${wave} ${isClear ? 'CLEAR' : 'FAILED'}`;
    box.appendChild(title);

    // 출전 유닛 그리드 — 통과/사망 모두 표시, 사망 카드엔 X 오버레이
    const grid = document.createElement('div');
    grid.className = 'wr-units';
    if (spawned.length > 0) {
        spawned.forEach(u => {
            const card = document.createElement('div');
            card.className = 'wr-unit-card' + (u.survived ? '' : ' wr-failed');
            card.innerHTML = `
                <div class="wr-unit-ico" style="background:${u.color};"></div>
                <div class="wr-unit-name">${u.name}</div>
            `;
            grid.appendChild(card);
        });
    } else {
        const empty = document.createElement('div');
        empty.className = 'wr-units-empty';
        empty.textContent = '출전한 유닛이 없습니다';
        grid.appendChild(empty);
    }
    box.appendChild(grid);

    // 통계 행
    const stats = document.createElement('div');
    stats.className = 'wr-stats';
    const addStat = (label, val, cls = '') => {
        const row = document.createElement('div');
        row.className = `wr-stat ${cls}`.trim();
        row.innerHTML = `<span class="wr-label">${label}</span><span class="wr-val">${val}</span>`;
        stats.appendChild(row);
    };
    addStat('통과', survivedCount);
    addStat('사망', deadCount);
    if (!isClear && lifeLost > 0) addStat('라이프', `-${lifeLost}`, 'wr-life-loss');
    addStat('보상', `+${reward}G`, 'wr-reward');
    box.appendChild(stats);

    const btn = document.createElement('button');
    btn.className = 'wr-btn';
    btn.textContent = isClear ? '▶  NEXT WAVE' : '▶  RETRY';
    btn.addEventListener('click', () => {
        document.getElementById('btn-start').click();
    });
    box.appendChild(btn);

    _overlay.appendChild(box);
    document.body.appendChild(_overlay);
}
