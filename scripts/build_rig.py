#!/usr/bin/env python3
"""Create aligned head-only page-mascot atlases from ERA Lab's approved PNGs.

The body is a single immutable layer. Direction and reaction sheets contain
ONLY the face/head; all input source drawings remain unchanged. This matters:
packing the original full-body PNGs into a sprite sheet still makes the coat
and shoulders jump between direction cells.

Usage: python scripts/build_rig.py --source assets --dest dist/assets/rig
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

DIRECTIONS = (
    "up-left", "up", "up-right",
    "left", "center", "right",
    "down-left", "down", "down-right",
)
REACTIONS = (
    "calm", "joy", "surprised",
    "excited", "curious", "sleepy",
    "thinking", "love", "victory",
)
CELL = 512


def split_head(image):
    """Cut illustrated head/neck with a soft collar boundary, without redraws."""
    pix = np.asarray(image.convert("RGBA"))
    assert pix.shape == (CELL, CELL, 4), "A source frame must be 512 x 512 RGBA"
    r, g, b = (pix[:, :, channel].astype(np.float32) for channel in range(3))
    y, x = np.indices((CELL, CELL))
    skin = (r > 95) & (r > g + 10) & (g > b + 7) & (r > b + 25) & ((r + 1) / (g + 1) > 1.07)
    hair = (r > g + 1) & (r > b + 3) & (r < 150) & (g < 125) & (b < 135)
    neck_zone = (x > 96) & (x < 416)
    keep = (y < 326) | (skin & (y <= 422) & neck_zone) | (hair & (y < 362) & neck_zone)
    # Keep edge pixels around the moving neck instead of leaving a flat crop.
    skin_mask = Image.fromarray(np.uint8((skin & (y <= 418) & neck_zone) * 255))
    expanded = skin_mask.filter(ImageFilter.MaxFilter(5))
    keep |= np.asarray(expanded) > 127
    matte = Image.fromarray(np.uint8(keep * 255)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = np.array(pix, copy=True)
    rgba[:, :, 3] = np.asarray(matte).astype(np.uint16) * rgba[:, :, 3].astype(np.uint16) // 255
    return Image.fromarray(rgba, "RGBA"), matte


def immutable_body(center):
    """Remove only the original center head, retaining its exact hoodie pixels."""
    _, original_head_mask = split_head(center)
    rgba = np.array(center.convert("RGBA"), copy=True)
    rgba[:, :, 3] = (rgba[:, :, 3].astype(np.uint16) * (
        255 - np.asarray(original_head_mask).astype(np.uint16)
    ) // 255).astype(np.uint8)
    fixed = Image.fromarray(rgba, "RGBA")
    # Dark undershirt behind the neck prevents tiny transparent collar gaps.
    backing = Image.new("RGBA", (CELL, CELL))
    ImageDraw.Draw(backing).ellipse((204, 335, 308, 438), fill=(25, 36, 65, 255))
    backing.alpha_composite(fixed)
    return backing


def build(source, dest):
    source, dest = Path(source), Path(dest)
    dest.mkdir(parents=True, exist_ok=True)
    src_center = Image.open(source / "directions/center.png").convert("RGBA")
    body = immutable_body(src_center)
    body.save(dest / "body.webp", format="WEBP", lossless=True, method=6)
    for category, names in (("directions", DIRECTIONS), ("reactions", REACTIONS)):
        atlas = Image.new("RGBA", (CELL * 3, CELL * 3))
        for index, name in enumerate(names):
            src = Image.open(source / category / (name + ".png")).convert("RGBA")
            head, _ = split_head(src)
            atlas.alpha_composite(head, ((index % 3) * CELL, (index // 3) * CELL))
        out = dest / (category + ".webp")
        atlas.save(out, format="WEBP", lossless=True, method=6)
        verify = Image.open(out).convert("RGBA")
        assert verify.size == atlas.size, "3 x 3 atlas dimensions are incorrect"
        assert verify.getpixel((0, 0))[3] == 0, "Atlas corners must be transparent"
        for i in range(9):
            area = verify.crop(((i % 3) * CELL, (i // 3) * CELL,
                                (i % 3 + 1) * CELL, (i // 3 + 1) * CELL))
            assert area.getchannel("A").getbbox(), "Missing cell " + str(i)
        print(f"PASS {out}: nine cropped head-only cells")
    assert Image.open(dest / "body.webp").size == (CELL, CELL)
    print("PASS fixed-body 512 x 512, source artwork untouched")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="assets")
    parser.add_argument("--dest", default="dist/assets/rig")
    a = parser.parse_args()
    build(a.source, a.dest)
