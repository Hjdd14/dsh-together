#!/usr/bin/env python
"""Render a recorded draw-op list (tools/shot.mjs output) to a PNG with Pillow.

The recorder already flattened the 2D canvas calls into primitives, so this is a plain
painter: background, then rects / arcs / polylines / text in order, at 2x supersampling.
Semi-transparent primitives are composited through a cropped layer, because Pillow's
ImageDraw does not blend alpha on its own.
"""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
SCALE = 2

data = json.load(open(SRC, encoding="utf-8"))
W, H = data["w"] * SCALE, data["h"] * SCALE
img = Image.new("RGBA", (W, H), (10, 13, 18, 255))


def font_for(size, bold=False):
    for path in (
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ):
        try:
            return ImageFont.truetype(path, max(6, int(size)))
        except Exception:
            continue
    return ImageFont.load_default()


def to_rgba(color, default=(255, 255, 255, 255)):
    if not color or len(color) < 3:
        return default
    alpha = color[3] if len(color) > 3 else 1
    return (int(color[0]), int(color[1]), int(color[2]), max(0, min(255, round(alpha * 255))))


def paint(op, kind, x, y, w, h):
    """Composite one primitive, cropping the layer to its own bounding box."""
    fill = to_rgba(op["fill"]) if op.get("fill") else None
    stroke = to_rgba(op["stroke"]) if op.get("stroke") else None
    if fill is None and stroke is None:
        return
    pad = int(op.get("lw", 1) * SCALE) + 4
    x0 = max(0, int(x) - pad)
    y0 = max(0, int(y) - pad)
    x1 = min(W, int(x + w) + pad)
    y1 = min(H, int(y + h) + pad)
    if x1 <= x0 or y1 <= y0:
        return
    opaque = (fill is None or fill[3] >= 255) and (stroke is None or stroke[3] >= 255)
    if opaque:
        layer, draw, ox, oy = img, ImageDraw.Draw(img), 0, 0
    else:
        layer = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
        draw, ox, oy = ImageDraw.Draw(layer), x0, y0
    box = [x - ox, y - oy, x + w - ox, y + h - oy]
    width = max(1, round(op.get("lw", 1) * SCALE)) if stroke else 1
    try:
        kind(draw, box, fill, stroke, width)
    except Exception:
        return
    if not opaque:
        img.alpha_composite(layer, (x0, y0))


def rect_shape(draw, box, fill, stroke, width):
    draw.rectangle(box, fill=fill, outline=stroke, width=width)


def round_rect_shape(draw, box, fill, stroke, width):
    radius = max(1, round((box[2] - box[0]) * 0.12))
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=stroke, width=width)


for op in data["ops"]:
    kind = op.get("k")
    if kind == "bg":
        img.paste(Image.new("RGBA", (W, H), to_rgba(op.get("fill"), (10, 13, 18, 255))), (0, 0))
        continue

    if kind == "rect":
        x, y = op["x"] * SCALE, op["y"] * SCALE
        w, h = op["w"] * SCALE, op["h"] * SCALE
        shape = round_rect_shape if op.get("radius") else rect_shape
        paint(op, shape, x, y, w, h)
        continue

    if kind == "arc":
        cx, cy = op["cx"] * SCALE, op["cy"] * SCALE
        r = op["r"] * SCALE
        if r <= 0.4:
            continue
        start = op.get("a0", 0) * 57.2958
        end = op.get("a1", 6.2832) * 57.2958
        full = abs(end - start) >= 359.9

        def arc_shape(draw, box, fill, stroke, width, start=start, end=end, full=full):
            if full and fill:
                draw.ellipse(box, fill=fill)
            elif fill:
                draw.pieslice(box, start, end, fill=fill)
            elif stroke:
                draw.arc(box, start, end, fill=stroke, width=width)

        paint(op, arc_shape, cx - r, cy - r, r * 2, r * 2)
        continue

    if kind == "poly":
        pts = op.get("pts") or []
        coords = [(pts[i] * SCALE, pts[i + 1] * SCALE) for i in range(0, len(pts) - 1, 2)]
        if len(coords) < 2:
            continue
        xs = [point[0] for point in coords]
        ys = [point[1] for point in coords]
        fill = to_rgba(op["fill"]) if op.get("fill") else None
        stroke = to_rgba(op["stroke"]) if op.get("stroke") else None
        if fill is None and stroke is None:
            continue
        x0, y0 = max(0, int(min(xs)) - 4), max(0, int(min(ys)) - 4)
        x1, y1 = min(W, int(max(xs)) + 5), min(H, int(max(ys)) + 5)
        if x1 <= x0 or y1 <= y0:
            continue
        opaque = (fill is None or fill[3] >= 255) and (stroke is None or stroke[3] >= 255)
        layer = img if opaque else Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        shifted = [(px - (0 if opaque else x0), py - (0 if opaque else y0)) for px, py in coords]
        width = max(1, round(op.get("lw", 1) * SCALE)) if stroke else 1
        try:
            if fill:
                draw.polygon(shifted, fill=fill)
            if stroke:
                draw.line(shifted + ([shifted[0]] if op.get("closed") else []), fill=stroke, width=width, joint="curve")
        except Exception:
            continue
        if not opaque:
            img.alpha_composite(layer, (x0, y0))
        continue

    if kind == "text":
        text = op.get("s") or ""
        if not text:
            continue
        size = max(6, round(op.get("size", 16) * SCALE))
        font = font_for(size, bool(op.get("bold")))
        try:
            left, top, right, bottom = draw_bbox = ImageDraw.Draw(img).textbbox((0, 0), text, font=font)
        except Exception:
            continue
        tw, th = right - left, bottom - top
        x = op["x"] * SCALE
        y = op["y"] * SCALE
        align = op.get("align", "left")
        if align == "center":
            x -= tw / 2
        elif align == "right":
            x -= tw
        baseline = op.get("baseline", "middle")
        if baseline == "middle":
            y -= th / 2 + top
        elif baseline == "top":
            y -= top
        elif baseline == "bottom":
            y -= bottom
        color = to_rgba(op.get("fill"))
        x0, y0 = max(0, int(x + left) - 2), max(0, int(y + top) - 2)
        x1, y1 = min(W, int(x + right) + 2), min(H, int(y + bottom) + 2)
        if x1 <= x0 or y1 <= y0:
            continue
        layer = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
        ImageDraw.Draw(layer).text((x - x0, y - y0), text, font=font, fill=color)
        img.alpha_composite(layer, (x0, y0))
        continue

img = img.convert("RGB")
img.save(OUT, "PNG", optimize=True)
print(f"render: {OUT} ({img.width}x{img.height}, {len(data['ops'])} ops)")
