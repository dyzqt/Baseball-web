(() => {
  const STORAGE_KEY = "baseball-web:transition";
  const SCRIPT_URL = new URL(document.currentScript?.src ?? window.location.href, window.location.href);
  const FRAME_ROOT = new URL("../transitions/page-rise/frames/", SCRIPT_URL);
  const FRAME_MANIFEST_URL = new URL("manifest.json?v=11", FRAME_ROOT).toString();
  const FRAME_CACHE_KEY = `${STORAGE_KEY}:frames:v11`;
  const FRAME_INTERVAL = 80;
  const REVEAL_DURATION = 720;
  const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

  const state = {
    busy: false,
    waitingForLoad: false,
    playbackActive: false,
    playbackStartedAt: 0,
    frameCount: 0,
    frameTimer: 0,
    framePromise: null,
    cachedFrames: null,
    revealTimer: 0,
    reducedMotion: window.matchMedia(REDUCED_QUERY).matches,
  };

  const overlay = (() => {
    const existing = document.querySelector(".page-transition");
    if (existing instanceof HTMLElement) {
      return existing;
    }
    const node = document.createElement("div");
    node.className = "page-transition";
    node.setAttribute("aria-hidden", "true");
    node.dataset.phase = "idle";
    node.dataset.mode = "fallback";
    node.innerHTML = `
      <div class="page-transition__stage">
        <div class="page-transition__film">
          <img class="page-transition__frame" alt="" />
          <div class="page-transition__fallback" aria-hidden="true"></div>
        </div>
        <p class="page-transition__caption">加载中…</p>
      </div>
    `;
    return node;
  })();

  function safeReadPending() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      sessionStorage.removeItem(STORAGE_KEY);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.href !== "string") {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function safeWritePending(href) {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ href, at: Date.now() }),
      );
    } catch {
    }
  }

  function safeClearPending() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
    }
  }

  function readCachedFrames() {
    try {
      const raw = sessionStorage.getItem(FRAME_CACHE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every((frame) => typeof frame === "string")) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function writeCachedFrames(frames) {
    if (!frames.length) {
      return;
    }
    try {
      sessionStorage.setItem(FRAME_CACHE_KEY, JSON.stringify(frames));
    } catch {
    }
  }

  function mountOverlay() {
    if (!document.body) {
      return;
    }
    if (overlay.parentNode !== document.body) {
      document.body.appendChild(overlay);
    }
  }

  function lockScroll(active) {
    document.documentElement.classList.toggle("page-transition-lock", active);
    if (document.body) {
      document.body.classList.toggle("page-transition-lock", active);
    }
  }

  function stopFrames() {
    if (state.frameTimer) {
      window.clearInterval(state.frameTimer);
      state.frameTimer = 0;
    }
  }

  function clearRevealTimer() {
    if (state.revealTimer) {
      window.clearTimeout(state.revealTimer);
      state.revealTimer = 0;
    }
  }

  function minimumPlaybackDuration(frames) {
    return Math.max(REVEAL_DURATION, frames.length * FRAME_INTERVAL);
  }

  function canReveal(frames) {
    if (!state.playbackActive) {
      return false;
    }
    if (state.reducedMotion) {
      return true;
    }
    return Date.now() - state.playbackStartedAt >= minimumPlaybackDuration(frames);
  }

  function cleanup() {
    clearRevealTimer();
    stopFrames();
    overlay.classList.remove("is-active", "is-revealing");
    overlay.dataset.phase = "idle";
    overlay.dataset.mode = "fallback";
    document.documentElement.classList.remove("page-transition-preload");
    lockScroll(false);
    state.busy = false;
    state.waitingForLoad = false;
    state.playbackActive = false;
    state.playbackStartedAt = 0;
    state.frameCount = 0;
    if (overlay.parentNode) {
      overlay.remove();
    }
  }

  function handlePageLifecycle(event) {
    if (event.persisted) {
      cleanup();
    }
  }

  function activate(phase) {
    mountOverlay();
    overlay.classList.add("is-active");
    overlay.dataset.phase = phase;
    overlay.dataset.mode = "fallback";
    lockScroll(true);
  }

  async function getFrames() {
    if (state.cachedFrames) {
      return state.cachedFrames;
    }
    const cached = readCachedFrames();
    if (cached) {
      state.cachedFrames = cached;
      return cached;
    }
    if (state.framePromise) {
      return state.framePromise;
    }
    state.framePromise = fetch(FRAME_MANIFEST_URL, { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() : []))
      .then((value) => (Array.isArray(value) ? value : []))
      .then((value) =>
        value
          .filter((frame) => typeof frame === "string" && frame.length > 0)
          .map((frame) => new URL(frame, FRAME_ROOT).toString()),
      )
      .catch(() => [])
      .then((value) => {
        state.framePromise = null;
        if (value.length) {
          state.cachedFrames = value;
          writeCachedFrames(value);
        }
        return value;
      });
    return state.framePromise;
  }

  async function startFramePlayback() {
    if (state.reducedMotion || !state.playbackActive) {
      return false;
    }
    const frames = await getFrames();
    if (!state.playbackActive || !frames.length || !overlay.isConnected || overlay.dataset.phase === "reveal") {
      overlay.dataset.mode = "fallback";
      return false;
    }
    const img = overlay.querySelector(".page-transition__frame");
    if (!(img instanceof HTMLImageElement)) {
      overlay.dataset.mode = "fallback";
      return false;
    }
    overlay.dataset.mode = "frames";
    state.playbackStartedAt = Date.now();
    state.frameCount = 0;
    let index = 0;
    const tick = () => {
      if (!overlay.isConnected || overlay.dataset.phase === "reveal" || !state.playbackActive) {
        stopFrames();
        return;
      }
      img.src = frames[index];
      index = (index + 1) % frames.length;
      state.frameCount += 1;
      if (index === 0 && canReveal(frames)) {
        stopFrames();
        revealOverlay();
      }
    };
    tick();
    stopFrames();
    state.frameTimer = window.setInterval(tick, FRAME_INTERVAL);
    return true;
  }

  function revealOverlay() {
    if (!overlay.isConnected || !state.playbackActive) {
      return;
    }
    if (!state.reducedMotion && state.frameCount < 1) {
      return;
    }
    overlay.dataset.phase = "reveal";
    overlay.classList.add("is-revealing");
    clearRevealTimer();
    state.revealTimer = window.setTimeout(() => {
      cleanup();
    }, state.reducedMotion ? 1 : REVEAL_DURATION);
  }

  function beginNavigation(href) {
    if (state.busy) {
      return;
    }
    state.busy = true;
    safeWritePending(href);
    activate("leaving");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.location.assign(href);
      });
    });
  }

  function shouldIntercept(anchor) {
    const href = anchor.getAttribute("href");
    if (!href || href === "#" || href.startsWith("javascript:")) {
      return false;
    }
    if (anchor.hasAttribute("download")) {
      return false;
    }
    const target = anchor.getAttribute("target");
    if (target && target !== "_self") {
      return false;
    }
    if (anchor.closest("[data-transition='skip']")) {
      return false;
    }
    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return false;
    }
    if (url.origin !== window.location.origin) {
      return false;
    }
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return false;
    }
    return true;
  }

  function installGuards() {
    document.addEventListener(
      "click",
      (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        if (!(event.target instanceof Element)) {
          return;
        }
        const anchor = event.target.closest("a[href]");
        if (!(anchor instanceof HTMLAnchorElement)) {
          return;
        }
        if (!shouldIntercept(anchor)) {
          return;
        }
        event.preventDefault();
        beginNavigation(anchor.href);
      },
      true,
    );
  }

  function waitForLoad() {
    if (document.readyState === "complete") {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      window.addEventListener("load", resolve, { once: true });
    });
  }

  async function initIncomingTransition() {
    const pending = safeReadPending();
    if (!pending) {
      cleanup();
      return;
    }
    mountOverlay();
    activate("holding");
    state.playbackActive = true;
    void startFramePlayback();
    await waitForLoad();
    safeClearPending();
    if (state.reducedMotion) {
      revealOverlay();
      return;
    }
    const frames = await getFrames();
    if (!frames.length) {
      revealOverlay();
      return;
    }
    if (state.frameCount >= frames.length && Date.now() - state.playbackStartedAt >= minimumPlaybackDuration(frames)) {
      revealOverlay();
      return;
    }
    const check = window.setInterval(() => {
      if (!overlay.isConnected) {
        window.clearInterval(check);
        return;
      }
      if (state.frameCount >= frames.length && Date.now() - state.playbackStartedAt >= minimumPlaybackDuration(frames)) {
        window.clearInterval(check);
        revealOverlay();
      }
    }, FRAME_INTERVAL);
  }

  function init() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", init, { once: true });
      return;
    }
    window.addEventListener("pageshow", handlePageLifecycle);
    window.addEventListener("pagehide", handlePageLifecycle);
    installGuards();
    initIncomingTransition().catch(() => {
      cleanup();
    });
  }

  init();
})();