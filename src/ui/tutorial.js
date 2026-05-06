const CHAPTERS = [
    {
        title: '기본 규칙',
        content: [
            '■ 유닛을 편성하고 웨이브를 시작하세요.',
            '■ 유닛이 경로를 따라 이동하고, 타워들은 이를 막으려 합니다.',
            '■ 유닛이 1마리라도 경로를 통과하면 웨이브 클리어!',
            '■ 유닛을 한마리도 통과시키지 못하면 실패, 목숨을 잃습니다.',
            '■ 목숨이 0이 되면 게임 오버입니다.',
            '■ 화면 우측 상단에서 게임 속도를 조절할 수 있습니다.',
        ],
    },
    {
        title: '편성 탭',
        content: [
            '■ 보유 유닛을 슬롯에 배치해 출전시킬 수 있습니다.',
            '■ 전투 시작 후 출전 유닛 클릭으로 유닛을 출발시킬 수 있습니다.',
            '■ 유닛을 드래그하여 배치된 순서를 바꿀 수 있습니다.',
            '■ 자동 출전 버튼은 슬롯에 배치된 순서대로 유닛을 출발시킵니다.',
        ],
    },
    {
        title: '유닛 탭',
        content: [
            '■ 보유 유닛의 스탯과 레벨을 확인할 수 있습니다.',
            '■ 같은 유닛을 많이 모으면 레벨업할 수 있습니다.',
            '■ 유닛은 상점의 뽑기를 통해 얻을 수 있습니다.',
        ],
    },
    {
        title: '타워 탭',
        content: [
            '■ 현재 배치된 타워들의 정보를 확인할 수 있습니다.',
            '■ 타워는 웨이브가 진행될수록 강해집니다.',
            '■ 타워마다 고유한 공격 방식과 패시브가 있습니다.',
        ],
    },
    {
        title: '아이템 탭',
        content: [
            '■ 보유 아이템을 확인하고 사용할 수 있습니다.',
            '■ 카드를 클릭해 ON/OFF 할 수 있습니다.',
            '■ 소비 아이템은 카드를 클릭해 사용할 수 있습니다.',
            '■ 아이템은 다양한 방법으로 획득할 수 있습니다.',
        ],
    },
    {
        title: '상점 탭',
        content: [
            '■ 골드로 유닛이나 아이템을 뽑을 수 있습니다.',
            '■ 획득한 유닛/아이템은 보유 목록에 자동 추가됩니다.',
        ],
    },
    {
        title: '단축키',
        content: [
            '■ Space     —  웨이브 시작 / 다음 웨이브 / 재시도',
            '■ ↑ / ↓   —  게임 배속 증가 / 감소',
            '■ A         —  전투 중 자동 출전 토글',
            '■ 1 ~ 9, 0  —  전투 중 해당 순번 유닛 출전',
        ],
    },
];

export function openTutorial() {
    if (document.getElementById('tutorial-overlay')) return;

    let currentChapter = 0;

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';

    const modal = document.createElement('div');
    modal.id = 'tutorial-modal';

    // 헤더
    const header = document.createElement('div');
    header.id = 'tutorial-header';

    const titleEl = document.createElement('div');
    titleEl.id = 'tutorial-title';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'tutorial-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => overlay.remove());

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // 챕터 탭
    const tabs = document.createElement('div');
    tabs.id = 'tutorial-tabs';
    CHAPTERS.forEach((ch, i) => {
        const tab = document.createElement('button');
        tab.className = 'tutorial-tab';
        tab.textContent = ch.title;
        tab.addEventListener('click', () => goTo(i));
        tabs.appendChild(tab);
    });

    // 본문
    const body = document.createElement('div');
    body.id = 'tutorial-body';

    // 하단 네비
    const nav = document.createElement('div');
    nav.id = 'tutorial-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'tutorial-nav-btn';
    prevBtn.textContent = '◀ 이전';
    prevBtn.addEventListener('click', () => goTo(currentChapter - 1));

    const pageEl = document.createElement('span');
    pageEl.id = 'tutorial-page';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'tutorial-nav-btn';
    nextBtn.textContent = '다음 ▶';
    nextBtn.addEventListener('click', () => goTo(currentChapter + 1));

    nav.appendChild(prevBtn);
    nav.appendChild(pageEl);
    nav.appendChild(nextBtn);

    modal.appendChild(header);
    modal.appendChild(tabs);
    modal.appendChild(body);
    modal.appendChild(nav);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    function goTo(idx) {
        if (idx < 0 || idx >= CHAPTERS.length) return;
        currentChapter = idx;

        const ch = CHAPTERS[idx];
        titleEl.textContent = `📖  ${ch.title}`;
        pageEl.textContent  = `${idx + 1} / ${CHAPTERS.length}`;

        body.innerHTML = '';
        ch.content.forEach(line => {
            const p = document.createElement('p');
            p.textContent = line;
            if (line === '') p.className = 'tutorial-spacer';
            body.appendChild(p);
        });

        tabs.querySelectorAll('.tutorial-tab').forEach((t, i) => {
            t.classList.toggle('active', i === idx);
        });

        prevBtn.disabled = idx === 0;
        nextBtn.disabled = idx === CHAPTERS.length - 1;
    }

    goTo(0);
}
