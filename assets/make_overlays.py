#!/usr/bin/env python3
"""Render the on-screen text overlays for the GTA 6 clipper entry.

Each overlay is a transparent 720x1280 PNG with bold white text on a
semi-transparent black pill, drawn with DejaVu Sans Bold. The overlays are
authored here (not downloaded) and are composited by main.ts with ffmpeg.
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 720, 1280
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

OVERLAYS = {
    # (filename, [(text, size), ...], top_y)
    "ov-a.png": ([("GTA 6 IS HERE", 76)], 150),
    "ov-b.png": ([("LUCIA & JASON", 62), ("VICE CITY AWAITS", 42)], 150),
    "ov-c.png": ([("MY AI AGENT", 62), ("CUT THIS CLIP", 62)], 150),
    "ov-d.png": ([("IT CAN MAKE YOU MONEY", 44),
                  ("make.fun - EARN MAKING", 38),
                  ("CLIPS WITH AI - $500 BOUNTY", 38)], 150),
}


def render(lines, top_y):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y = top_y
    for text, size in lines:
        font = ImageFont.truetype(FONT, size)
        bbox = d.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x0 = (W - tw) // 2
        pad_x, pad_y = 26, 16
        # pill background
        d.rounded_rectangle(
            [x0 - pad_x, y - pad_y, x0 + tw + pad_x, y + th + pad_y],
            radius=24, fill=(0, 0, 0, 170))
        d.text((x0 - bbox[0], y - bbox[1]), text, font=font,
               fill=(255, 255, 255, 255))
        y += th + 18
    return img


if __name__ == "__main__":
    import os
    outdir = os.path.dirname(os.path.abspath(__file__))
    for name, (lines, top_y) in OVERLAYS.items():
        img = render(lines, top_y)
        path = os.path.join(outdir, name)
        img.save(path)
        print("wrote", path, img.size)
