from __future__ import annotations

import json
from pathlib import Path

IMAGE_SUFFIXES = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"}
FRAME_DIR = Path("assets/transitions/page-rise/frames")
FRAME_MANIFEST = FRAME_DIR / "manifest.json"
MOMENT_TRANSITION_BG = "#020617"
EARLY_TRANSITION_STYLE = """<style>
html.page-transition-lock,
body.page-transition-lock {
  overflow: hidden;
}

.page-transition {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  background: var(--page-transition-bg, var(--md-default-bg-color, #f8fafc));
  transition: none;
}

.page-transition.is-active {
  opacity: 1;
  visibility: visible;
}

.page-transition__stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.page-transition__film {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--page-transition-bg, var(--md-default-bg-color, #f8fafc));
}

.page-transition__frame,
.page-transition__fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: var(--page-transition-bg, var(--md-default-bg-color, #f8fafc));
}

.page-transition__frame {
  object-fit: contain;
  opacity: 0;
  transition: opacity 120ms linear;
  z-index: 1;
}

.page-transition[data-mode="frames"] .page-transition__frame {
  opacity: 1;
}

.page-transition__fallback {
  opacity: 1;
  z-index: 0;
}
</style>"""
EARLY_TRANSITION_BOOTSTRAP = """<script>
(function () {
  try {
    var raw = sessionStorage.getItem("baseball-web:transition");
    if (!raw) {
      return;
    }
    var pending = JSON.parse(raw);
    if (!pending || typeof pending.href !== "string") {
      return;
    }
    var root = document.documentElement;
    root.classList.add("page-transition-preload");
    window.setTimeout(function () {
      if (root.classList.contains("page-transition-preload") && !document.querySelector(".page-transition.is-revealing")) {
        root.classList.remove("page-transition-preload");
      }
    }, 15000);
    if (document.querySelector(".page-transition")) {
      return;
    }
    var overlay = document.createElement("div");
    overlay.className = "page-transition is-active";
    overlay.setAttribute("aria-hidden", "true");
    overlay.dataset.phase = "holding";
    overlay.dataset.mode = "fallback";
    overlay.innerHTML = `
      <div class="page-transition__stage">
        <div class="page-transition__film">
          <img class="page-transition__frame" alt="" />
          <div class="page-transition__fallback" aria-hidden="true"></div>
        </div>
      </div>
    `;
    root.appendChild(overlay);
  } catch (error) {
  }
})();
</script>"""



def _collect_frames(docs_dir: str) -> list[str]:
    frame_dir = Path(docs_dir) / FRAME_DIR
    if not frame_dir.exists():
        return []

    frames = [
        path.relative_to(frame_dir).as_posix()
        for path in frame_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    ]
    frames.sort(key=str.lower)
    return frames


def on_post_page(output_content: str, *, page, config):
    if "<head>" not in output_content:
        return output_content

    transition_bg_bootstrap = ""
    if page.file.src_uri == MOMENT_PAGE:
        transition_bg_bootstrap = (
            "<style>"
            f":root {{ --page-transition-bg: {MOMENT_TRANSITION_BG}; }}"
            "</style>\n"
        )

    return output_content.replace(
        "<head>",
        f"<head>\n{EARLY_TRANSITION_STYLE}\n{transition_bg_bootstrap}{EARLY_TRANSITION_BOOTSTRAP}",
        1,
    )


def on_post_build(config):
    site_manifest = Path(config["site_dir"]) / FRAME_MANIFEST
    site_manifest.parent.mkdir(parents=True, exist_ok=True)
    frames = _collect_frames(config["docs_dir"])
    site_manifest.write_text(
        json.dumps(frames, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
