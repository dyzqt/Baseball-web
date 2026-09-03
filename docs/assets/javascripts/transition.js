(() => {
  const STORAGE_KEY = "baseball-web:transition";
  const SCRIPT_URL = new URL(document.currentScript?.src ?? window.location.href, window.location.href);
  const FRAME_ROOT = new URL("../transitions/page-rise/frames/", SCRIPT_URL);
  const FRAME_VERSION = "16";
  const FRAME_URL = new URL(`000.png?v=${FRAME_VERSION}`, FRAME_ROOT).toString();
  const TRANSITION_BG = "#020617";
  const FRAME_PRELOAD_TIMEOUT = 1200;
  const PLAYBACK_DURATION = 520;
  const REVEAL_DURATION = 480;
  const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

  const state = {
    busy: false,
    playbackActive: false,
    playbackStartedAt: 0,
    framePromise: null,
    revealTimer: 0,
    reducedMotion: window.matchMedia(REDUCED_QUERY).matches,
  };

  document.documentElement.style.setProperty("--page-transition-bg", TRANSITION_BG);

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

  function preloadFrame() {
    if (state.framePromise) {
      return state.framePromise;
    }
    const promise = new Promise((resolve) => {
      const image = new Image();
      let done = false;
      const finish = (value) => {
        if (done) {
          return;
        }
        done = true;
        window.clearTimeout(timeout);
        resolve(value);
      };
      const timeout = window.setTimeout(() => finish(null), FRAME_PRELOAD_TIMEOUT);
      image.decoding = "async";
      image.fetchPriority = "high";
      image.onload = () => {
        if (image.decode) {
          image.decode().then(() => finish(FRAME_URL)).catch(() => finish(FRAME_URL));
          return;
        }
        finish(FRAME_URL);
      };
      image.onerror = () => finish(null);
      image.src = FRAME_URL;
    });
    state.framePromise = promise.then((value) => {
      if (!value) {
        state.framePromise = null;
      }
      return value;
    });
    return state.framePromise;
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

  function clearRevealTimer() {
    if (state.revealTimer) {
      window.clearTimeout(state.revealTimer);
      state.revealTimer = 0;
    }
  }

  function cleanup() {
    clearRevealTimer();
    overlay.classList.remove("is-active", "is-revealing");
    overlay.dataset.phase = "idle";
    overlay.dataset.mode = "fallback";
    document.documentElement.classList.remove("page-transition-preload");
    lockScroll(false);
    state.busy = false;
    state.playbackActive = false;
    state.playbackStartedAt = 0;
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
    document.documentElement.style.setProperty("--page-transition-bg", TRANSITION_BG);
    mountOverlay();
    overlay.classList.add("is-active");
    overlay.dataset.phase = phase;
    overlay.dataset.mode = "fallback";
    lockScroll(true);
  }

  async function showTransitionFrame() {
    if (state.reducedMotion || !state.playbackActive) {
      return false;
    }
    const img = overlay.querySelector(".page-transition__frame");
    if (!(img instanceof HTMLImageElement)) {
      overlay.dataset.mode = "fallback";
      return false;
    }
    const frame = await preloadFrame();
    if (!state.playbackActive || !overlay.isConnected || overlay.dataset.phase === "reveal" || !frame) {
      overlay.dataset.mode = "fallback";
      return false;
    }
    img.src = frame;
    overlay.dataset.mode = "frame";
    state.playbackStartedAt = Date.now();
    return true;
  }

  function revealOverlay() {
    if (!overlay.isConnected || !state.playbackActive) {
      return;
    }
    overlay.dataset.phase = "reveal";
    overlay.classList.add("is-revealing");
    clearRevealTimer();
    state.revealTimer = window.setTimeout(() => {
      cleanup();
    }, state.reducedMotion ? 1 : REVEAL_DURATION);
  }

  function scheduleReveal(delay) {
    clearRevealTimer();
    state.revealTimer = window.setTimeout(() => {
      revealOverlay();
    }, delay);
  }

  function beginNavigation(href) {
    if (state.busy) {
      return;
    }
    state.busy = true;
    safeWritePending(href);
    activate("leaving");
    state.playbackActive = true;
    void showTransitionFrame();
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
      void preloadFrame();
      return;
    }
    mountOverlay();
    activate("holding");
    state.playbackActive = true;
    const frameReady = showTransitionFrame();
    await waitForLoad();
    safeClearPending();
    if (state.reducedMotion) {
      revealOverlay();
      return;
    }
    const hasFrame = await frameReady;
    const elapsed = hasFrame ? Date.now() - state.playbackStartedAt : PLAYBACK_DURATION;
    scheduleReveal(Math.max(0, PLAYBACK_DURATION - elapsed));
  }

  function init() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", init, { once: true });
      return;
    }
    document.documentElement.style.setProperty("--page-transition-bg", TRANSITION_BG);
    window.addEventListener("pageshow", handlePageLifecycle);
    window.addEventListener("pagehide", handlePageLifecycle);
    installGuards();
    initIncomingTransition().catch(() => {
      cleanup();
    });
  }

  init();
})();
