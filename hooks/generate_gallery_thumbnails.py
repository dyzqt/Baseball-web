from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

IMAGE_SUFFIXES = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"}
THUMBNAIL_DIR = "thumbnails"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate WebP thumbnails for the gallery.")
    parser.add_argument("--gallery-dir", type=Path, default=Path("docs/gallery"))
    parser.add_argument("--width", type=int, default=1000)
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    return parser.parse_args()


def source_images(gallery_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in gallery_dir.rglob("*")
        if path.is_file()
        and THUMBNAIL_DIR not in path.relative_to(gallery_dir).parts
        and path.suffix.lower() in IMAGE_SUFFIXES
    )


def thumbnail_path(image: Path, gallery_dir: Path, thumbnail_dir: Path) -> Path:
    return (thumbnail_dir / image.relative_to(gallery_dir)).with_suffix(".webp")


def remove_orphan_thumbnails(images: list[Path], gallery_dir: Path, thumbnail_dir: Path) -> None:
    if not thumbnail_dir.exists():
        return

    expected = {
        thumbnail_path(image, gallery_dir, thumbnail_dir)
        for image in images
    }
    for thumbnail in thumbnail_dir.rglob("*.webp"):
        if thumbnail not in expected:
            thumbnail.unlink()

    for directory in sorted((path for path in thumbnail_dir.rglob("*") if path.is_dir()), reverse=True):
        if not any(directory.iterdir()):
            directory.rmdir()


def generate_thumbnail(image: Path, output: Path, args: argparse.Namespace) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            args.ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(image),
            "-vf",
            f"scale='min({args.width},iw)':-2",
            "-frames:v",
            "1",
            "-c:v",
            "libwebp",
            "-quality",
            str(args.quality),
            str(output),
        ],
        check=True,
    )


def main() -> None:
    args = parse_args()
    gallery_dir = args.gallery_dir.resolve()
    thumbnail_dir = gallery_dir / THUMBNAIL_DIR
    images = source_images(gallery_dir)
    remove_orphan_thumbnails(images, gallery_dir, thumbnail_dir)

    if not images:
        print("No gallery images found.")
        return

    generated = 0
    skipped = 0
    for image in images:
        output = thumbnail_path(image, gallery_dir, thumbnail_dir)
        if output.exists() and output.stat().st_mtime_ns >= image.stat().st_mtime_ns:
            skipped += 1
            continue
        generate_thumbnail(image, output, args)
        generated += 1

    print(f"Generated {generated} thumbnails; skipped {skipped} up-to-date thumbnails.")


if __name__ == "__main__":
    main()
