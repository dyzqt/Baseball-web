(() => {
  const STORAGE_KEY = "baseball-web:gallery-order";
  const LIST_SELECTOR = "[data-moment-list]";
  const CARD_SELECTOR = "[data-moment-id]";
  const DRAGGING_CLASS = "is-dragging";
  const PLACEHOLDER_CLASS = "moment-placeholder";

  const DRAG_THRESHOLD = 6;
  const MIN_SCALE = 1;
  const MAX_SCALE = 5;
  const DOUBLE_TAP_SCALE = 2.5;

  let activeDrag = null;
  let pendingPress = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function safeReadOrder() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function safeWriteOrder(order) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      // ignore storage failures
    }
  }

  function getOrder(list) {
    return Array.from(list.querySelectorAll(CARD_SELECTOR))
      .map((card) => card.dataset.momentId)
      .filter(Boolean);
  }

  function applyStoredOrder(list) {
    const stored = safeReadOrder();
    if (!stored) {
      return;
    }

    const cards = Array.from(list.querySelectorAll(CARD_SELECTOR));
    if (!cards.length) {
      return;
    }

    const byId = new Map(cards.map((card) => [card.dataset.momentId, card]));
    const ordered = [];

    for (const id of stored) {
      const card = byId.get(id);
      if (card) {
        ordered.push(card);
        byId.delete(id);
      }
    }

    for (const card of cards) {
      if (byId.has(card.dataset.momentId)) {
        ordered.push(card);
      }
    }

    for (const card of ordered) {
      list.appendChild(card);
    }
  }

  function findClosestCard(list, draggingCard, x, y) {
    let closest = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    const cards = Array.from(list.querySelectorAll(CARD_SELECTOR));

    for (const card of cards) {
      if (card === draggingCard) {
        continue;
      }
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = (x - centerX) ** 2 + (y - centerY) ** 2;
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = card;
      }
    }

    return closest instanceof HTMLElement ? closest : null;
  }

  function findDropTarget(list, draggingCard, x, y) {
    const element = document.elementFromPoint(x, y);
    if (element instanceof Element) {
      const card = element.closest(CARD_SELECTOR);
      if (card instanceof HTMLElement && card !== draggingCard) {
        return card;
      }
    }
    return findClosestCard(list, draggingCard, x, y);
  }

  function createPlaceholder(card) {
    const rect = card.getBoundingClientRect();
    const placeholder = document.createElement("div");
    placeholder.className = PLACEHOLDER_CLASS;
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.style.height = `${rect.height}px`;
    return placeholder;
  }

  function clearDragStyles(card) {
    card.style.position = "";
    card.style.left = "";
    card.style.top = "";
    card.style.width = "";
    card.style.height = "";
    card.style.margin = "";
    card.style.zIndex = "";
    card.style.pointerEvents = "";
    card.style.boxSizing = "";
    card.style.transform = "";
  }

  function placePlaceholder(list, placeholder, targetCard, clientY) {
    if (!targetCard) {
      return;
    }
    const rect = targetCard.getBoundingClientRect();
    const reference = clientY < rect.top + rect.height / 2 ? targetCard : targetCard.nextElementSibling;
    if (reference !== placeholder) {
      list.insertBefore(placeholder, reference);
    }
  }

  function beginDrag(list, card, pointerId, offsetX, offsetY, event) {
    const rect = card.getBoundingClientRect();
    const placeholder = createPlaceholder(card);
    card.parentNode?.insertBefore(placeholder, card);

    activeDrag = {
      card,
      list,
      placeholder,
      pointerId,
      offsetX,
      offsetY,
    };

    card.classList.add(DRAGGING_CLASS);
    card.setPointerCapture(pointerId);
    card.style.position = "fixed";
    card.style.left = `${rect.left}px`;
    card.style.top = `${rect.top}px`;
    card.style.width = `${rect.width}px`;
    card.style.height = `${rect.height}px`;
    card.style.margin = "0";
    card.style.zIndex = "10";
    card.style.pointerEvents = "none";
    card.style.boxSizing = "border-box";
    if (event) {
      event.preventDefault();
    }
  }

  function updateDrag(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
      return;
    }

    const { card, list, placeholder, offsetX, offsetY } = activeDrag;
    card.style.left = `${event.clientX - offsetX}px`;
    card.style.top = `${event.clientY - offsetY}px`;

    const targetCard = findDropTarget(list, card, event.clientX, event.clientY);
    placePlaceholder(list, placeholder, targetCard, event.clientY);
  }

  function finishDrag(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
      return;
    }

    const { card, list, placeholder, pointerId } = activeDrag;
    activeDrag = null;

    try {
      if (card.hasPointerCapture(pointerId)) {
        card.releasePointerCapture(pointerId);
      }
    } catch {
      // ignore capture release failures
    }

    card.classList.remove(DRAGGING_CLASS);
    placeholder.replaceWith(card);
    clearDragStyles(card);
    safeWriteOrder(getOrder(list));
  }

  function onPointerDown(list, card, event) {
    if (event.button !== 0 && event.pointerType === "mouse") {
      return;
    }
    if (activeDrag || pendingPress || viewer.open) {
      return;
    }

    const rect = card.getBoundingClientRect();
    pendingPress = {
      card,
      list,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
  }

  function onReorderPointerMove(event) {
    if (activeDrag && event.pointerId === activeDrag.pointerId) {
      updateDrag(event);
      return;
    }
    if (pendingPress && event.pointerId === pendingPress.pointerId) {
      const dx = event.clientX - pendingPress.startX;
      const dy = event.clientY - pendingPress.startY;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        const { card, list, pointerId, offsetX, offsetY } = pendingPress;
        pendingPress = null;
        beginDrag(list, card, pointerId, offsetX, offsetY, event);
      }
    }
  }

  function onReorderPointerEnd(event, cancelled) {
    if (activeDrag && event.pointerId === activeDrag.pointerId) {
      finishDrag(event);
      return;
    }
    if (pendingPress && event.pointerId === pendingPress.pointerId) {
      const { card } = pendingPress;
      pendingPress = null;
      if (!cancelled) {
        openViewer(card);
      }
    }
  }

  const viewer = {
    root: null,
    stage: null,
    img: null,
    scale: MIN_SCALE,
    tx: 0,
    ty: 0,
    open: false,
    pointers: new Map(),
    gesture: null,
  };

  function ensureViewer() {
    if (viewer.root) {
      return;
    }

    const root = document.createElement("div");
    root.className = "moment-viewer";
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.innerHTML = `
      <div class="moment-viewer__stage"></div>
      <button class="moment-viewer__close" type="button" aria-label="关闭">×</button>
    `;

    const stage = root.querySelector(".moment-viewer__stage");
    const closeBtn = root.querySelector(".moment-viewer__close");
    const img = document.createElement("img");
    img.className = "moment-viewer__img";
    img.alt = "";
    img.draggable = false;
    stage.appendChild(img);

    viewer.root = root;
    viewer.stage = stage;
    viewer.img = img;

    closeBtn.addEventListener("click", closeViewer);
    root.addEventListener("click", (event) => {
      if (event.target === stage || event.target === root) {
        closeViewer();
      }
    });

    root.addEventListener(
      "wheel",
      (event) => {
        if (!viewer.open) {
          return;
        }
        event.preventDefault();
        const factor = Math.exp(-event.deltaY * 0.0015);
        zoomViewerAt(event.clientX, event.clientY, factor);
      },
      { passive: false },
    );

    stage.addEventListener("dblclick", (event) => {
      if (!viewer.open || event.target !== img) {
        return;
      }
      event.preventDefault();
      const target = viewer.scale > MIN_SCALE ? MIN_SCALE : DOUBLE_TAP_SCALE;
      zoomViewerAt(event.clientX, event.clientY, target / viewer.scale);
    });

    stage.addEventListener("pointerdown", onViewerPointerDown);

    document.body.appendChild(root);
  }

  function setBodyLock(active) {
    document.documentElement.classList.toggle("moment-viewer-open", active);
    document.body.classList.toggle("moment-viewer-open", active);
  }

  function applyViewerTransform() {
    viewer.img.style.transform = `translate3d(${viewer.tx}px, ${viewer.ty}px, 0) scale(${viewer.scale})`;
  }

  function clampViewerPan() {
    const imgWidth = viewer.img.offsetWidth * viewer.scale;
    const imgHeight = viewer.img.offsetHeight * viewer.scale;
    const stageWidth = viewer.stage.clientWidth;
    const stageHeight = viewer.stage.clientHeight;
    const maxX = Math.max(0, (imgWidth - stageWidth) / 2);
    const maxY = Math.max(0, (imgHeight - stageHeight) / 2);
    viewer.tx = clamp(viewer.tx, -maxX, maxX);
    viewer.ty = clamp(viewer.ty, -maxY, maxY);
  }

  function resetViewerTransform() {
    viewer.scale = MIN_SCALE;
    viewer.tx = 0;
    viewer.ty = 0;
    viewer.pointers.clear();
    viewer.gesture = null;
    applyViewerTransform();
  }

  function zoomViewerAt(clientX, clientY, factor) {
    const stageRect = viewer.stage.getBoundingClientRect();
    const cx = clientX - stageRect.left - stageRect.width / 2;
    const cy = clientY - stageRect.top - stageRect.height / 2;
    const newScale = clamp(viewer.scale * factor, MIN_SCALE, MAX_SCALE);
    const k = newScale / viewer.scale;
    viewer.tx = cx * (1 - k) + k * viewer.tx;
    viewer.ty = cy * (1 - k) + k * viewer.ty;
    viewer.scale = newScale;
    clampViewerPan();
    applyViewerTransform();
  }

  function openViewer(card) {
    ensureViewer();
    const img = card.querySelector("img");
    if (!(img instanceof HTMLImageElement)) {
      return;
    }
    viewer.img.src = img.src;
    viewer.img.alt = img.alt || "";
    resetViewerTransform();
    viewer.root.hidden = false;
    viewer.root.setAttribute("aria-hidden", "false");
    viewer.open = true;
    setBodyLock(true);
  }

  function closeViewer() {
    if (!viewer.open) {
      return;
    }
    viewer.open = false;
    viewer.root.hidden = true;
    viewer.root.setAttribute("aria-hidden", "true");
    setBodyLock(false);
    viewer.img.src = "";
    viewer.img.alt = "";
    resetViewerTransform();
  }

  function onViewerPointerDown(event) {
    if (!viewer.open) {
      return;
    }
    viewer.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (viewer.pointers.size === 1) {
      viewer.gesture = {
        mode: "pan",
        startX: event.clientX,
        startY: event.clientY,
        startTx: viewer.tx,
        startTy: viewer.ty,
      };
    } else if (viewer.pointers.size === 2) {
      const points = Array.from(viewer.pointers.values());
      const dist = distance(points[0], points[1]);
      viewer.gesture = {
        mode: "pinch",
        startDist: dist || 1,
        startScale: viewer.scale,
        startTx: viewer.tx,
        startTy: viewer.ty,
        startMidX: (points[0].x + points[1].x) / 2,
        startMidY: (points[0].y + points[1].y) / 2,
      };
    }
  }

  function onViewerPointerMove(event) {
    if (!viewer.open || !viewer.pointers.has(event.pointerId)) {
      return;
    }
    viewer.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (viewer.pointers.size === 1 && viewer.gesture && viewer.gesture.mode === "pan") {
      viewer.tx = viewer.gesture.startTx + (event.clientX - viewer.gesture.startX);
      viewer.ty = viewer.gesture.startTy + (event.clientY - viewer.gesture.startY);
      clampViewerPan();
      applyViewerTransform();
    } else if (viewer.pointers.size === 2 && viewer.gesture && viewer.gesture.mode === "pinch") {
      const points = Array.from(viewer.pointers.values());
      const dist = distance(points[0], points[1]);
      const k = dist / (viewer.gesture.startDist || 1);
      viewer.scale = clamp(viewer.gesture.startScale * k, MIN_SCALE, MAX_SCALE);
      const midX = (points[0].x + points[1].x) / 2;
      const midY = (points[0].y + points[1].y) / 2;
      viewer.tx = viewer.gesture.startTx + (midX - viewer.gesture.startMidX);
      viewer.ty = viewer.gesture.startTy + (midY - viewer.gesture.startMidY);
      clampViewerPan();
      applyViewerTransform();
    }
  }

  function onViewerPointerEnd(event) {
    if (!viewer.open) {
      return;
    }
    viewer.pointers.delete(event.pointerId);

    if (viewer.pointers.size === 1) {
      const remaining = Array.from(viewer.pointers.values())[0];
      viewer.gesture = {
        mode: "pan",
        startX: remaining.x,
        startY: remaining.y,
        startTx: viewer.tx,
        startTy: viewer.ty,
      };
    } else if (viewer.pointers.size >= 2) {
      const points = Array.from(viewer.pointers.values());
      const dist = distance(points[0], points[1]);
      viewer.gesture = {
        mode: "pinch",
        startDist: dist || 1,
        startScale: viewer.scale,
        startTx: viewer.tx,
        startTy: viewer.ty,
        startMidX: (points[0].x + points[1].x) / 2,
        startMidY: (points[0].y + points[1].y) / 2,
      };
    } else {
      viewer.gesture = null;
    }
  }

  function initList(list) {
    applyStoredOrder(list);

    const cards = Array.from(list.querySelectorAll(CARD_SELECTOR));
    if (!cards.length) {
      return;
    }

    for (const card of cards) {
      card.draggable = false;
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");

      const alt = card.querySelector("img")?.alt || "";
      card.setAttribute("aria-label", alt ? `查看图片：${alt}` : "查看图片");

      card.addEventListener("dragstart", (event) => {
        event.preventDefault();
      });
      card.addEventListener("pointerdown", (event) => {
        onPointerDown(list, card, event);
      });
      card.addEventListener("lostpointercapture", finishDrag);
      card.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && !activeDrag && !pendingPress) {
          event.preventDefault();
          openViewer(card);
        }
      });
    }
  }

  function init() {
    const list = document.querySelector(LIST_SELECTOR);
    if (!(list instanceof HTMLElement)) {
      return;
    }

    document.addEventListener("pointermove", onReorderPointerMove);
    document.addEventListener("pointerup", (event) => {
      onReorderPointerEnd(event, false);
    });
    document.addEventListener("pointercancel", (event) => {
      onReorderPointerEnd(event, true);
    });

    document.addEventListener("pointermove", onViewerPointerMove);
    document.addEventListener("pointerup", onViewerPointerEnd);
    document.addEventListener("pointercancel", onViewerPointerEnd);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && viewer.open) {
        event.preventDefault();
        closeViewer();
      }
    });

    initList(list);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
