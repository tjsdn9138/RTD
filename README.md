# RTD — Reverse Tower Defense

바닐라 JS + HTML5 Canvas로 만든 리버스 타워 디펜스 게임.

타워를 배치하는 대신, **타워의 공격을 뚫고 유닛을 통과시키는** 것이 목표입니다.

## 플레이 방법

1. **유닛 편성** — 보유 유닛을 슬롯에 배치합니다
2. **WAVE START** — 전투를 시작하면 유닛들이 경로를 따라 이동합니다
3. **생존** — 타워의 공격을 피해 최대한 많은 유닛을 통과시킵니다
4. **성장** — 클리어 보상으로 골드를 모아 유닛을 강화하고 슬롯을 늘립니다
5. **40웨이브** 클리어가 목표입니다

## 플레이

🔗 https://tjsdn9138.github.io/RTD/

## 기술 스택

- Vanilla JavaScript (ES Modules)
- HTML5 Canvas
- CSS3

## 프로젝트 구조

```
RTD/
├── index.html
├── style.css
├── fonts/
└── src/
    ├── main.js        # 게임 루프
    ├── state.js       # 게임 상태
    ├── game.js        # 핵심 게임 로직
    ├── units.js       # 유닛 클래스
    ├── towers.js      # 타워 클래스
    ├── items.js       # 아이템 시스템
    ├── save.js        # 저장/불러오기
    ├── maps/
    │   └── map1.js
    └── ui/
        ├── ui.js
        ├── title.js
        ├── panel-unit.js
        ├── panel-unit-list.js
        ├── panel-tower.js
        ├── panel-bag.js
        ├── panel-shop.js
        └── tutorial.js
```
