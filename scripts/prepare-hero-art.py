"""Produce battle figures and UI sprites from the four transparent art masters.

Run from the repository root. Requires Pillow; the game itself has no build step.
Optional paths override the masters in assets/heroes/source, in hero order.
"""

from pathlib import Path
import sys
from PIL import Image


HEROES = ("fighter", "rogue", "wizard", "cleric")
OUTPUT = Path("assets/heroes")


def prepare(source: Path, hero: str) -> None:
    picture = Image.open(source).convert("RGBA")
    bounds = picture.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"Empty sprite: {source}")
    # The battle figure is 3 portrait tiles tall and slightly narrower than its
    # source illustration. Smaller square versions fit existing cards and tokens.
    for suffix, size in (
        ("-board", (72, 96)),
        ("-board-small", (36, 48)),
        ("", (32, 32)),
    ):
        picture.resize(size, Image.Resampling.LANCZOS).save(
            OUTPUT / f"{hero}{suffix}.png", optimize=True
        )
    Image.open(OUTPUT / f"{hero}.png").resize(
        (16, 16), Image.Resampling.LANCZOS
    ).save(OUTPUT / f"{hero}-small.png", optimize=True)


if __name__ == "__main__":
    if len(sys.argv) not in (1, len(HEROES) + 1):
        raise SystemExit("Usage: prepare-hero-art.py [BRAKKA VEX ORIN SELA]")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    paths = sys.argv[1:] or [str(OUTPUT / "source" / f"{name}.png") for name in HEROES]
    for name, path in zip(HEROES, paths):
        prepare(Path(path), name)
