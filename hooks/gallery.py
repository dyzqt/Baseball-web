from __future__ import annotations

from pathlib import Path
from urllib.parse import quote

IMAGE_SUFFIXES = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"}
MOMENT_DIR = "gallery"
MOMENT_PAGE = "gallery/index.md"


def _collect_images(docs_dir: str) -> list[Path]:
    moment_dir = Path(docs_dir) / MOMENT_DIR
    if not moment_dir.exists():
        return []
    images = [
        path
        for path in moment_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    ]
    images.sort(key=lambda path: (not path.stem.startswith("大"), path.relative_to(moment_dir).as_posix().lower()))
    return images


def _image_url(path: Path, moment_dir: Path) -> str:
    relative = path.relative_to(moment_dir).as_posix().split("/")
    return "/".join(quote(part) for part in relative)


def _card_html(path: Path, moment_dir: Path) -> str:
    classes = ["moment-card"]
    if path.stem.startswith("大"):
        classes.append("moment-card--large")
    src = _image_url(path, moment_dir)
    return "\n".join(
        [
            f'<figure class="{" ".join(classes)}" data-moment-id="{src}">',
            f'  <img src="{src}" alt="{path.stem}" loading="lazy" draggable="false">',
            "</figure>",
        ]
    )


def _page_bootstrap() -> str:
    return "\n".join(
        [
            "<script>",
            "(function () {",
            '  document.body.classList.add("moment-page");',
            '  const header = document.querySelector(".md-header__inner");',
            '  const title = document.querySelector(".md-header__title");',
            '  if (title) {',
            '    title.querySelectorAll(".md-ellipsis").forEach((el) => {',
            '      el.textContent = "时刻";',
            '    });',
            '  }',
            '  if (header && title && !document.querySelector(".moment-back")) {',
            '    const back = document.createElement("a");',
            '    back.className = "moment-back";',
            '    back.href = "#";',
            '    back.innerHTML = "&larr; 返回";',
            '    back.setAttribute("aria-label", "返回上一页");',
            '    back.addEventListener("click", (event) => {',
            '      event.preventDefault();',
            '      if (window.history.length > 1) {',
            '        window.history.back();',
            '      } else if (document.referrer && document.referrer.startsWith(window.location.origin)) {',
            '        window.location.href = document.referrer;',
            '      } else {',
            '        window.location.href = "/";',
            '      }',
            '    });',
            '    header.insertBefore(back, title);',
            '  }',
            "})();",
            "</script>",
        ]
    )


def on_page_markdown(markdown: str, *, page, config, files):
    if page.file.src_uri != MOMENT_PAGE:
        return markdown

    moment_dir = Path(config["docs_dir"]) / MOMENT_DIR
    images = _collect_images(config["docs_dir"])
    parts = ['<h1 hidden>时刻</h1>', _page_bootstrap()]
    if images:
        parts.extend(["<div class=\"moment-shell\">", '  <div class="moment-masonry" data-moment-list>'])
        for path in images:
            parts.append("    " + _card_html(path, moment_dir).replace("\n", "\n    "))
        parts.extend(["  </div>", "</div>"])
    return "\n".join(parts)
