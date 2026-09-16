(() => {
  const ROOT_SELECTOR = "#baseball-field-practice";
  const POSITION_STORAGE_KEY = "baseball-web:field-positions:v11";
  const GAME_STORAGE_KEY = "baseball-web:field-game:v1";
  const DRAG_THRESHOLD = 4;
  const MIN_POSITION = 2.5;
  const MAX_POSITION = 97.5;

  const defenders = [
    { id: "P", number: "1", name: "投手" },
    { id: "C", number: "2", name: "捕手" },
    { id: "1B", number: "3", name: "一垒手" },
    { id: "2B", number: "4", name: "二垒手" },
    { id: "3B", number: "5", name: "三垒手" },
    { id: "SS", number: "6", name: "游击手" },
    { id: "LF", number: "7", name: "左外野手" },
    { id: "CF", number: "8", name: "中外野手" },
    { id: "RF", number: "9", name: "右外野手" },
  ];

  const attackers = [
    { id: "runner-1", number: "1", name: "一垒跑者" },
    { id: "runner-2", number: "2", name: "二垒跑者" },
    { id: "runner-3", number: "3", name: "三垒跑者" },
    { id: "runner-4", number: "4", name: "击球员" },
  ];

  const defaultPositions = {
    P: [50, 63.1],
    C: [50, 94],
    "1B": [76, 56],
    "2B": [61, 43],
    "3B": [24, 56],
    SS: [39, 43],
    LF: [16, 20],
    CF: [50, 12],
    RF: [84, 20],
    "runner-1": [78.284, 61.716],
    "runner-2": [50, 33.432],
    "runner-3": [21.716, 61.716],
    "runner-4": [50, 87],
  };

  const defaultGame = {
    home: 0,
    away: 0,
    inning: 1,
    half: "上半",
    balls: 0,
    strikes: 0,
    outs: 0,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function readPositions() {
    try {
      const saved = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object" || !saved.positions || typeof saved.positions !== "object") return null;

      const positions = {};
      Object.keys(defaultPositions).forEach((id) => {
        const point = saved.positions[id];
        if (Array.isArray(point) && point.length === 2 && point.every((value) => Number.isFinite(Number(value)))) {
          positions[id] = [clamp(Number(point[0]), MIN_POSITION, MAX_POSITION), clamp(Number(point[1]), MIN_POSITION, MAX_POSITION)];
        }
      });
      return positions;
    } catch {
      return null;
    }
  }

  function readGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return { ...defaultGame };
      return {
        home: clamp(Number(saved.home) || 0, 0, 99),
        away: clamp(Number(saved.away) || 0, 0, 99),
        inning: clamp(Number(saved.inning) || 1, 1, 99),
        half: saved.half === "下半" ? "下半" : "上半",
        balls: clamp(Number(saved.balls) || 0, 0, 3),
        strikes: clamp(Number(saved.strikes) || 0, 0, 2),
        outs: clamp(Number(saved.outs) || 0, 0, 2),
      };
    } catch {
      return { ...defaultGame };
    }
  }

  function writePositions(positions) {
    try {
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ positions }));
    } catch {
      // 浏览器禁用存储时，当前页面仍可正常拖动。
    }
  }

  function writeGame(game) {
    try {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(game));
    } catch {
      // 浏览器禁用存储时，记分牌仍可在当前页面中使用。
    }
  }

  function createField(root) {
    document.body.classList.add("field-page");

    const savedPositions = readPositions();
    const state = {
      positions: { ...defaultPositions, ...savedPositions },
      game: readGame(),
      dragging: null,
    };

    root.innerHTML = `
      <div class="field-shell">
        <div class="field-topbar">
          <a class="field-back" href="/" data-field-back aria-label="返回上一页">← 返回</a>
        </div>
        <div class="field-layout">
          <div class="baseball-field__stage">
            <div class="baseball-field" data-field tabindex="0" aria-label="棒球比赛场地，可拖动场上球员">
              <svg class="baseball-field__diagram" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
                <rect class="baseball-field__outfield" x="0" y="0" width="1000" height="1000" />
                <path class="baseball-field__warning-track" d="M 0 600 Q 500 -140 1000 600" />
                <polygon class="baseball-field__infield" points="500,900 782.84,617.16 500,334.32 217.16,617.16" />
                <path class="baseball-field__base-line baseball-field__base-line--left" d="M 500 900 L 217.16 617.16 L 0 400" />
                <path class="baseball-field__base-line baseball-field__base-line--right" d="M 500 900 L 782.84 617.16 L 1000 400" />
                <circle class="baseball-field__mound" cx="500" cy="637.78" r="40" />
                <rect class="baseball-field__pitching-plate" x="495.56" y="631.11" width="8.88" height="2.22" rx="0.5" />
                <polygon class="baseball-field__home-plate" points="496.85,893.7 503.15,893.7 503.15,896.85 500,900 496.85,896.85" />
                <polygon class="baseball-field__base" points="782.84,612.45 787.55,617.16 782.84,621.87 778.13,617.16" />
                <polygon class="baseball-field__base" points="500,329.61 504.71,334.32 500,339.03 495.29,334.32" />
                <polygon class="baseball-field__base" points="217.16,612.45 221.87,617.16 217.16,621.87 212.45,617.16" />
                <rect class="baseball-field__batter-box baseball-field__batter-box--left" x="459.1" y="866.67" width="17.78" height="26.66" rx="1" />
                <rect class="baseball-field__batter-box baseball-field__batter-box--right" x="523.12" y="866.67" width="17.78" height="26.66" rx="1" />
                <rect class="baseball-field__catcher-box" x="481.3" y="900" width="37.4" height="31.11" rx="2" />
              </svg>
              <div class="baseball-field__players" data-players></div>
            </div>
          </div>
          <aside class="field-scoreboard" aria-label="比赛记分牌">
            <div class="field-scoreboard__header">
              <h2>记分牌</h2>
              <span>比赛记录</span>
            </div>
            <div class="field-scoreboard__teams">
              <div class="field-scoreboard__team">
                <span>主队</span>
                <button type="button" class="field-scoreboard__step" data-score-action="decrease" data-team="home" aria-label="主队减一分">−</button>
                <strong data-score="home">0</strong>
                <button type="button" class="field-scoreboard__step" data-score-action="increase" data-team="home" aria-label="主队加一分">+</button>
              </div>
              <div class="field-scoreboard__team">
                <span>客队</span>
                <button type="button" class="field-scoreboard__step" data-score-action="decrease" data-team="away" aria-label="客队减一分">−</button>
                <strong data-score="away">0</strong>
                <button type="button" class="field-scoreboard__step" data-score-action="increase" data-team="away" aria-label="客队加一分">+</button>
              </div>
            </div>
            <div class="field-scoreboard__inning">
              <span>局数</span>
              <button type="button" class="field-scoreboard__step" data-game-action="inning-decrease" aria-label="减少局数">−</button>
              <strong data-game-value="inning">1</strong>
              <button type="button" class="field-scoreboard__half" data-game-action="toggle-half" aria-label="切换上下半局"><span data-game-value="half">上半</span></button>
              <button type="button" class="field-scoreboard__step" data-game-action="inning-increase" aria-label="增加局数">+</button>
            </div>
            <div class="field-scoreboard__count-grid">
              <div class="field-scoreboard__count" data-count="strikes">
                <span>好球</span>
                <div><button type="button" class="field-scoreboard__step" data-count-action="decrease" aria-label="减少好球">−</button><strong data-count-value="strikes">0</strong><button type="button" class="field-scoreboard__step" data-count-action="increase" aria-label="增加好球">+</button></div>
              </div>
              <div class="field-scoreboard__count" data-count="balls">
                <span>坏球</span>
                <div><button type="button" class="field-scoreboard__step" data-count-action="decrease" aria-label="减少坏球">−</button><strong data-count-value="balls">0</strong><button type="button" class="field-scoreboard__step" data-count-action="increase" aria-label="增加坏球">+</button></div>
              </div>
              <div class="field-scoreboard__count" data-count="outs">
                <span>出局</span>
                <div><button type="button" class="field-scoreboard__step" data-count-action="decrease" aria-label="减少出局数">−</button><strong data-count-value="outs">0</strong><button type="button" class="field-scoreboard__step" data-count-action="increase" aria-label="增加出局数">+</button></div>
              </div>
            </div>
            <div class="field-scoreboard__actions">
              <button type="button" data-game-action="clear-count">清除球数</button>
              <button type="button" data-game-action="reset-game">重置比赛</button>
            </div>
          </aside>
        </div>
      </div>
    `;

    const field = root.querySelector("[data-field]");
    const playersEl = root.querySelector("[data-players]");

    function persist() {
      writePositions(state.positions);
      writeGame(state.game);
    }

    function renderGame() {
      root.querySelector('[data-score="home"]').textContent = state.game.home;
      root.querySelector('[data-score="away"]').textContent = state.game.away;
      root.querySelector('[data-game-value="inning"]').textContent = state.game.inning;
      root.querySelector('[data-game-value="half"]').textContent = state.game.half;
      ["strikes", "balls", "outs"].forEach((key) => {
        root.querySelector(`[data-count-value="${key}"]`).textContent = state.game[key];
        const count = root.querySelector(`[data-count="${key}"]`);
        count.querySelector('[data-count-action="decrease"]').disabled = state.game[key] === 0;
        count.querySelector('[data-count-action="increase"]').disabled = state.game[key] === { strikes: 2, balls: 3, outs: 2 }[key];
      });
    }

    function renderPlayers() {
      playersEl.replaceChildren();
      defenders.concat(attackers).forEach((player) => {
        const isAttacker = player.id.startsWith("runner-");
        const [x, y] = state.positions[player.id];
        const button = document.createElement("button");
        button.type = "button";
        button.className = `baseball-field__player ${isAttacker ? "baseball-field__player--attack" : "baseball-field__player--defense"}`;
        button.dataset.playerId = player.id;
        button.style.left = `${x}%`;
        button.style.top = `${y}%`;
        button.textContent = player.number;
        button.setAttribute("aria-label", `${player.number}号${player.name}，可拖动`);
        button.addEventListener("pointerdown", (event) => beginDrag(button, event));
        button.addEventListener("keydown", (event) => moveWithKeyboard(button, event));
        playersEl.appendChild(button);
      });
    }

    function updateScore(team, direction) {
      state.game[team] = clamp(state.game[team] + direction, 0, 99);
      renderGame();
      persist();
    }

    function updateGame(action) {
      if (action === "inning-decrease") state.game.inning = clamp(state.game.inning - 1, 1, 99);
      if (action === "inning-increase") state.game.inning = clamp(state.game.inning + 1, 1, 99);
      if (action === "toggle-half") state.game.half = state.game.half === "上半" ? "下半" : "上半";
      if (action === "clear-count") {
        state.game.balls = 0;
        state.game.strikes = 0;
        state.game.outs = 0;
      }
      if (action === "reset-game") state.game = { ...defaultGame };
      renderGame();
      persist();
    }

    function updateCount(container, direction) {
      const key = container.dataset.count;
      const maximum = { strikes: 2, balls: 3, outs: 2 }[key];
      state.game[key] = clamp(state.game[key] + direction, 0, maximum);
      renderGame();
      persist();
    }

    function pointFromEvent(event) {
      const rect = field.getBoundingClientRect();
      return [
        clamp(((event.clientX - rect.left) / rect.width) * 100, MIN_POSITION, MAX_POSITION),
        clamp(((event.clientY - rect.top) / rect.height) * 100, MIN_POSITION, MAX_POSITION),
      ];
    }

    function beginDrag(button, event) {
      if (event.button !== undefined && event.button !== 0 && event.pointerType === "mouse") return;
      const [x, y] = pointFromEvent(event);
      state.dragging = {
        button,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        offsetX: x - Number.parseFloat(button.style.left),
        offsetY: y - Number.parseFloat(button.style.top),
      };
      button.setPointerCapture?.(event.pointerId);
      button.classList.add("is-dragging");
      event.preventDefault();
    }

    function updateDrag(event) {
      if (!state.dragging || event.pointerId !== state.dragging.pointerId) return;
      const drag = state.dragging;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= DRAG_THRESHOLD) drag.moved = true;
      if (!drag.moved) return;

      const [x, y] = pointFromEvent(event);
      const next = [clamp(x - drag.offsetX, MIN_POSITION, MAX_POSITION), clamp(y - drag.offsetY, MIN_POSITION, MAX_POSITION)];
      drag.button.style.left = `${next[0]}%`;
      drag.button.style.top = `${next[1]}%`;
      state.positions[drag.button.dataset.playerId] = next;
    }

    function finishDrag(event) {
      if (!state.dragging || event.pointerId !== state.dragging.pointerId) return;
      const drag = state.dragging;
      state.dragging = null;
      drag.button.classList.remove("is-dragging");
      persist();
      drag.button.releasePointerCapture?.(event.pointerId);
    }

    function moveWithKeyboard(button, event) {
      const step = event.shiftKey ? 5 : 1;
      const movement = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!movement) return;
      event.preventDefault();
      const [x, y] = state.positions[button.dataset.playerId];
      const next = [clamp(x + movement[0], MIN_POSITION, MAX_POSITION), clamp(y + movement[1], MIN_POSITION, MAX_POSITION)];
      state.positions[button.dataset.playerId] = next;
      button.style.left = `${next[0]}%`;
      button.style.top = `${next[1]}%`;
      persist();
    }

    root.querySelectorAll("[data-score-action]").forEach((button) => {
      button.addEventListener("click", () => updateScore(button.dataset.team, button.dataset.scoreAction === "increase" ? 1 : -1));
    });
    root.querySelectorAll("[data-game-action]").forEach((button) => {
      button.addEventListener("click", () => updateGame(button.dataset.gameAction));
    });
    root.querySelectorAll("[data-count-action]").forEach((button) => {
      button.addEventListener("click", () => updateCount(button.closest("[data-count]"), button.dataset.countAction === "increase" ? 1 : -1));
    });

    const back = root.querySelector("[data-field-back]");
    back.addEventListener("click", (event) => {
      event.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else if (document.referrer && document.referrer.startsWith(window.location.origin)) {
        window.location.href = document.referrer;
      } else {
        window.location.href = "/";
      }
    });

    document.addEventListener("pointermove", updateDrag);
    document.addEventListener("pointerup", finishDrag);
    document.addEventListener("pointercancel", finishDrag);
    renderPlayers();
    renderGame();
  }

  function init() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (root instanceof HTMLElement) createField(root);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
