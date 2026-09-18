from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import unquote

from PIL import Image

IMAGE_SUFFIXES = {".jpeg", ".jpg", ".png"}
ASSETS_DIR = Path("assets/images")
COMPRESSED_DIR = "compressed"
COMPRESSED_WIDTH = 1200
COMPRESSED_QUALITY = 82
IMAGE_URL_PATTERN = re.compile(r"(?P<prefix>(?:\.\./)+assets/images/)(?P<path>[^)\s\"'<>]+)")
IMAGE_TAG_PATTERN = re.compile(r"<img\b[^>]*>", re.IGNORECASE)


def _relative_path(raw_path: str) -> Path | None:
    path = unquote(raw_path.split("?", 1)[0].split("#", 1)[0])
    parts = tuple(part for part in path.split("/") if part)
    if not parts or any(part in {".", ".."} for part in parts):
        return None
    return Path(*parts)


def _source_images(docs_dir: str) -> tuple[Path, list[Path]]:
    docs_path = Path(docs_dir)
    assets_dir = docs_path / ASSETS_DIR
    sources: set[Path] = set()
    for markdown in docs_path.rglob("*.md"):
        content = markdown.read_text(encoding="utf-8")
        for match in IMAGE_URL_PATTERN.finditer(content):
            relative = _relative_path(match.group("path"))
            if relative is None or relative.suffix.lower() not in IMAGE_SUFFIXES:
                continue
            source = assets_dir / relative
            if source.is_file():
                sources.add(source)
    return assets_dir, sorted(sources)


def _compressed_path(source: Path, assets_dir: Path) -> Path:
    return assets_dir / COMPRESSED_DIR / source.relative_to(assets_dir).with_suffix(".webp")


def _generate_compressed(source: Path, output: Path) -> None:
    if output.is_file() and output.stat().st_mtime_ns >= source.stat().st_mtime_ns:
        return

    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image.thumbnail((COMPRESSED_WIDTH, COMPRESSED_WIDTH), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")
        image.save(output, "WEBP", quality=COMPRESSED_QUALITY, method=6)


def _remove_orphan_compressed(sources: list[Path], assets_dir: Path) -> None:
    compressed_dir = assets_dir / COMPRESSED_DIR
    if not compressed_dir.exists():
        return

    expected = {_compressed_path(source, assets_dir) for source in sources}
    for compressed in compressed_dir.rglob("*.webp"):
        if compressed not in expected:
            compressed.unlink()

    for directory in sorted((path for path in compressed_dir.rglob("*") if path.is_dir()), reverse=True):
        if not any(directory.iterdir()):
            directory.rmdir()


def _ensure_compressed_images(docs_dir: str) -> None:
    assets_dir, sources = _source_images(docs_dir)
    _remove_orphan_compressed(sources, assets_dir)
    for source in sources:
        _generate_compressed(source, _compressed_path(source, assets_dir))


def _replace_image_url(match: re.Match[str], assets_dir: Path) -> str:
    relative = _relative_path(match.group("path"))
    if relative is None or relative.suffix.lower() not in IMAGE_SUFFIXES:
        return match.group(0)

    source = assets_dir / relative
    compressed = _compressed_path(source, assets_dir)
    if not source.is_file() or not compressed.is_file():
        return match.group(0)

    raw_path = match.group("path").split("?", 1)[0].split("#", 1)[0]
    compressed_path = f"{COMPRESSED_DIR}/{raw_path.rsplit('.', 1)[0]}.webp"
    suffix = match.group("path")[len(raw_path):]
    return f"{match.group('prefix')}{compressed_path}{suffix}"


def _add_lazy_loading(markdown: str) -> str:
    def replace_tag(match: re.Match[str]) -> str:
        tag = match.group(0)
        closing = "/>" if tag.rstrip().endswith("/>") else ">"
        body = tag[:-len(closing)]
        if " loading=" not in tag.lower():
            body += ' loading="lazy"'
        if " decoding=" not in tag.lower():
            body += ' decoding="async"'
        return body + closing

    return IMAGE_TAG_PATTERN.sub(replace_tag, markdown)


def on_pre_build(config):
    _ensure_compressed_images(config["docs_dir"])


def on_page_markdown(markdown: str, *, page, config, files):
    assets_dir = Path(config["docs_dir"]) / ASSETS_DIR
    markdown = IMAGE_URL_PATTERN.sub(lambda match: _replace_image_url(match, assets_dir), markdown)
    return _add_lazy_loading(markdown)
