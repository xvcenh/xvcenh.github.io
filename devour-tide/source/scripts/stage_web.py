"""Stage only the files referenced by the current Vite entry point."""
import re
import shutil
import sys
from pathlib import Path

GAME = Path(__file__).resolve().parents[2]


def stage_web(destination):
    destination = Path(destination)
    html = (GAME / "index.html").read_text(encoding="utf-8")
    match = re.search(r'src="\./assets/(index-[\w-]+\.js)"', html)
    if not match:
        raise ValueError("Build the Vite game first")
    bundle = GAME / "assets" / match[1]
    filenames = sorted(set(re.findall(r'new URL\("([\w-]+\.webp)",import\.meta\.url\)', bundle.read_text(encoding="utf-8"))))
    if not filenames:
        raise ValueError("No production paintings found in the entry bundle")
    paths = [GAME / "index.html", bundle, *(GAME / "assets" / name for name in filenames)]
    for src in paths:
        target = destination / src.relative_to(GAME)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, target)
    return [src.relative_to(GAME) for src in paths]


if __name__ == "__main__":
    for path in stage_web(sys.argv[1]):
        print(path.as_posix())
