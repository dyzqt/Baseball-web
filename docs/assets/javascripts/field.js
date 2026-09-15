(() => {
  const ROOT_SELECTOR = "#baseball-field-practice";
  const STORAGE_KEY = "baseball-web:field-positions:v11";
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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function readPositions() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object" || !saved.positions || typeof saved.positions !== "object") {
        return null;
      }

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

  function writePositions(positions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ positions }));
    } catch {
      // 浏览器禁用存储时，当前页面仍可正常拖动。
    }
  }

  function createField(root) {
    document.body.classList.add("field-page");

    const savedPositions = readPositions();
    const state = {
      positions: { ...defaultPositions, ...savedPositions },
      dragging: null,
    };

    root.innerHTML = `
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
    `;

    const field = root.querySelector("[data-field]");
    const playersEl = root.querySelector("[data-players]");

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
      writePositions(state.positions);
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
      writePositions(state.positions);
    }

    document.addEventListener("pointermove", updateDrag);
    document.addEventListener("pointerup", finishDrag);
    document.addEventListener("pointercancel", finishDrag);
    renderPlayers();
  }

  function init() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (root instanceof HTMLElement) createField(root);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
