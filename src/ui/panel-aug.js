import { game } from '../state.js';
import { RARITY } from '../game.js';

export function renderAugPanel(container) {
    container.innerHTML = '';

    const augs = game.augmentations ?? [];
    if (augs.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'aug-panel-empty';
        empty.textContent = '보유한 증강이 없습니다.';
        container.appendChild(empty);
        return;
    }

    augs.forEach(aug => {
        const meta   = aug.constructor.meta;
        const rarity = RARITY[meta.rarity] ?? RARITY.COMMON;

        const card = document.createElement('div');
        card.className = 'aug-panel-card';
        card.style.setProperty('--rc', rarity.color);

        const header = document.createElement('div');
        header.className = 'aug-panel-header';

        const rarEl = document.createElement('span');
        rarEl.className = 'aug-panel-rarity';
        rarEl.textContent = rarity.name;
        rarEl.style.color = rarity.color;

        const nameEl = document.createElement('span');
        nameEl.className = 'aug-panel-name';
        nameEl.textContent = meta.name;

        header.append(rarEl, nameEl);

        const descEl = document.createElement('div');
        descEl.className = 'aug-panel-desc';
        meta.desc.split('\n').forEach((line, i) => {
            if (i > 0) descEl.appendChild(document.createElement('br'));
            descEl.appendChild(document.createTextNode(line));
        });

        if (aug.rewardLabel) {
            descEl.appendChild(document.createElement('br'));
            const resultEl = document.createElement('span');
            resultEl.className = 'aug-panel-result';
            resultEl.textContent = aug.rewardLabel;
            descEl.appendChild(resultEl);
        }

        card.append(header, descEl);
        container.appendChild(card);
    });
}
