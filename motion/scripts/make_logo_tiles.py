"""
make_logo_tiles.py — dice the mark into tiles so it can be ANIMATED IN LAYERS.

The client was explicit: «شعار ومض مابيه يظهر كذا بشكل سطحي... لازم تحركه حركة
موشن طبقات مو تحركه كله كصورة واحدة». A single <image> can only translate,
scale and rotate as one block, which is exactly the flat result to avoid.

So the mark's own alpha is diced on a grid and every non-empty cell becomes a
tile with its own centroid. The renderer flies each tile in along its own arc,
staggered by distance from centre, so the mark assembles outward.
"""
import json
import numpy as np
from PIL import Image

ROOT = "/home/user/ilaf"
im = Image.open(f"{ROOT}/assets/brand/wamd_logo.png").convert("RGBA")
a = np.array(im).astype(np.float32)
alpha = a[..., 3] / 255.0
H, W = alpha.shape
print(f"[tiles] mark {W}x{H}  aspect {W/H:.4f}  opaque {100*(alpha>0.5).mean():.1f}%")

GX, GY = 7, 7
MIN_FILL = 0.02          # drop cells that are only antialiased fringe
tiles = []
for gy in range(GY):
    for gx in range(GX):
        x0, x1 = int(gx * W / GX), int((gx + 1) * W / GX)
        y0, y1 = int(gy * H / GY), int((gy + 1) * H / GY)
        cell = alpha[y0:y1, x0:x1]
        fill = float((cell > 0.4).mean())
        if fill < MIN_FILL:
            continue
        ys, xs = np.where(cell > 0.4)
        tiles.append({
            "x": x0 / W, "y": y0 / H,
            "w": (x1 - x0) / W, "h": (y1 - y0) / H,
            "cx": (x0 + xs.mean()) / W, "cy": (y0 + ys.mean()) / H,
            "fill": round(fill, 3),
        })
tiles.sort(key=lambda t: (t["cy"], t["cx"]))
print(f"[tiles] {GX}x{GY} grid -> {len(tiles)} live tiles "
      f"({100*len(tiles)/(GX*GY):.0f}% of the grid)")
with open(f"{ROOT}/analysis/logo_tiles.json", "w", encoding="utf-8") as fh:
    json.dump({"grid": [GX, GY], "tiles": tiles,
               "aspect": round(W / H, 4)}, fh, indent=1)
