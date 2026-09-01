(() => {
  const SCRIPT_URL = new URL(document.currentScript?.src ?? window.location.href, window.location.href);
  const FRAME_ROOT = new URL("../transitions/page-rise/frames/", SCRIPT_URL);
  const FRAME_MANIFEST_URL = new URL("manifest.json?v=6", FRAME_ROOT).toString();
  const FRAME_CACHE_KEY = "baseball-web:transition:frames:v6";
  const FRAME_INTERVAL = 80;
  const MIN_VISIBLE_MS = 360;
  const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

  const state = {
    busy: false,
    playingFrames: false,
    frameTimer: 0,
    framePromise: null,
    cachedFrames: null,
    reducedMotion: window.matchMedia(REDUCED_QUERY).matches,
  };

  const overlay = (() => {
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

  function cleanup() {
    stopFrames();
    overlay.classList.remove("is-active");
    overlay.dataset.phase = "idle";
    overlay.dataset.mode = "fallback";
    lockScroll(false);
    state.busy = false;
    state.playingFrames = false;
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
    if (state.reducedMotion || !state.playingFrames) {
      return false;
    }
    const frames = await getFrames();
    if (!state.playingFrames || !frames.length || !overlay.isConnected) {
      overlay.dataset.mode = "fallback";
      return false;
    }
    const img = overlay.querySelector(".page-transition__frame");
    if (!(img instanceof HTMLImageElement)) {
      overlay.dataset.mode = "fallback";
      return false;
    }
    overlay.dataset.mode = "frames";
    let index = 0;
    const tick = () => {
      if (!overlay.isConnected || !state.playingFrames) {
        stopFrames();
        return;
      }
      img.src = frames[index];
      index = (index + 1) % frames.length;
    };
    tick();
    stopFrames();
    state.frameTimer = window.setInterval(tick, FRAME_INTERVAL);
    return true;
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

  function waitForPaint() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve);
      });
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  async function beginNavigation(href) {
    if (state.busy) {
      return;
    }
    state.busy = true;
    activate("leaving");
    state.playingFrames = true;
    const startedAt = Date.now();
    void startFramePlayback();
    await waitForPaint();
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_VISIBLE_MS) {
      await sleep(MIN_VISIBLE_MS - elapsed);
    }
    window.location.assign(href);
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
        void beginNavigation(anchor.href);
      },
      true,
    );
  }

  function init() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", init, { once: true });
      return;
    }
    window.addEventListener("pageshow", handlePageLifecycle);
    window.addEventListener("pagehide", handlePageLifecycle);
    installGuards();
  }

  init();
})();
