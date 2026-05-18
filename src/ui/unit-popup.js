const MAX_POPUPS = 6;
const POPUP_DURATION = 2500;

const popups = [];
let container = null;
let inited = false;

function updateContainerPos() {
    if (!container) return;
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    container.style.left  = rect.left + 'px';
    container.style.width = rect.width + 'px';
}

export function initUnitPopup() {
    if (inited) { updateContainerPos(); return; }
    inited = true;
    container = document.getElementById('unit-popup-container');
    updateContainerPos();
    window.addEventListener('resize', updateContainerPos);

    document.addEventListener('nextwavestart', () => {
        for (const entry of popups) {
            clearTimeout(entry.timer);
            entry.el.remove();
        }
        popups.length = 0;
    });

    document.addEventListener('unit-event', (e) => {
        const { name, color, type } = e.detail;

        if (popups.length >= MAX_POPUPS) {
            const oldest = popups.shift();
            clearTimeout(oldest.timer);
            oldest.el.remove();
        }

        const el = document.createElement('div');
        el.className = `unit-popup ${type === 'death' ? 'popup-death' : 'popup-survive'}`;
        el.innerHTML =
            `<span class="popup-dot" style="background:${color}"></span>` +
            `<span class="popup-name">${name}</span>` +
            `<span class="popup-result">${type === 'death' ? '사망' : '통과'}</span>`;
        container.appendChild(el);

        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('popup-visible')));

        const entry = { el, timer: null };
        popups.push(entry);

        entry.timer = setTimeout(() => {
            el.classList.remove('popup-visible');
            el.classList.add('popup-hiding');
            el.addEventListener('transitionend', () => {
                el.remove();
                const idx = popups.indexOf(entry);
                if (idx !== -1) popups.splice(idx, 1);
            }, { once: true });
        }, POPUP_DURATION);
    });
}
