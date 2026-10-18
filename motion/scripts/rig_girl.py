"""
rig_girl.py — turn each cut-out into an ANIMATABLE RIG, not a flat picture.

The client's instruction was «قصها قص دقيق وحرك الطبقات»: cut precisely, then
animate the layers. A single flattened PNG can only ever translate and scale as
one block, which is exactly the flat look we were asked to avoid.

So each figure is split into a HEAD and a BODY at the neck, and each part is
trimmed to its own bounding box with a recorded pivot. Reassembled in the
renderer at their pivots, the two parts can then rotate independently in 3D:
the body sways, the head counter-rotates and bobs a beat later. That small
offset is what makes a paper cut-out read as a character instead of a sticker.

Where is the neck? Measured, not guessed: the narrowest row of the silhouette
in its upper half. For a head-and-shoulders portrait that minimum is the neck
almost by definition.

Also produced per figure:
  * a soft contact shadow (so the figure sits in the scene instead of floating)
  * a paper-grain overlay clipped to the silhouette, which is what makes it
    read as cut paper rather than a photo pasted on top
"""
import json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = "/home/user/ilaf"
OUT = {}
ORDER = ["wide", "mid", "close", "hero"]     # girl1..girl4


def row_widths(alpha):
    return (alpha > 0.5).sum(1).astype(float)


def smooth(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same")


def find_neck(alpha):
    """The neck is the row that is narrowest RELATIVE TO BOTH SIDES: narrower
    than the head above it and narrower than the shoulders below it.

    Picking the plain minimum inside a fixed band fails, and fails differently
    per pose: on the full-body figure it locks onto the waist, and on the
    big-head portrait it locks onto a dip inside the hair. Scoring every
    candidate by how much it dips below the max on both sides finds the real
    constriction in all four poses."""
    H, W = alpha.shape
    w = smooth(row_widths(alpha), max(3, H // 50))
    on = np.where(w > 0)[0]
    if on.size < 20:
        return int(H * 0.4)
    top, bot = int(on[0]), int(on[-1])
    fh = bot - top
    lo = int(top + fh * 0.16)
    hi = int(top + fh * 0.72)
    best, bestScore = (top + fh * 0.4), -1e18
    pre = np.maximum.accumulate(w)
    suf = np.maximum.accumulate(w[::-1])[::-1]
    for r in range(lo, hi):
        score = (pre[r] - w[r]) + (suf[r] - w[r])
        if score > bestScore:
            bestScore, best = score, r
    return int(best)


def trim(a_rgba, pad=2):
    """tight bbox of the non-transparent pixels, with a small pad"""
    al = a_rgba[..., 3]
    ys, xs = np.where(al > 8)
    if len(xs) == 0:
        return None
    x0, x1 = max(0, xs.min() - pad), min(a_rgba.shape[1], xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(a_rgba.shape[0], ys.max() + 1 + pad)
    return (x0, y0, x1 - x0, y1 - y0)


for i, name in enumerate(ORDER, 1):
    src = f"{ROOT}/assets/girl{i}.png"
    im = Image.open(src).convert("RGBA")
    a = np.array(im).astype(np.float32)
    alpha = a[..., 3] / 255.0
    H, W = alpha.shape

    neck = find_neck(alpha)
    bb_full = trim(a)

    # ---- split at the neck, with a few px of overlap so no seam shows
    ov = 6
    head_m = np.zeros_like(alpha)
    head_m[:neck + ov] = alpha[:neck + ov]
    body_m = np.zeros_like(alpha)
    body_m[neck - ov:] = alpha[neck - ov:]

    parts = {}
    for pname, mask in (("head", head_m), ("body", body_m)):
        rgba = np.dstack([a[..., :3], (mask * 255)])
        bb = trim(rgba)
        if bb is None:
            continue
        x, y, w, h = bb
        Image.fromarray(rgba[y:y + h, x:x + w].astype(np.uint8), "RGBA") \
            .save(f"{ROOT}/assets/girl{i}_{pname}.png")
        # pivot: head rotates about the neck; body rotates about the hips
        ys, xs = np.where(mask > 0.5)
        if pname == "head":
            px, py = (xs.mean(), float(neck))
        else:
            px, py = (xs.mean(), float(np.percentile(ys, 92)))
        parts[pname] = {"bbox": [int(x), int(y), int(w), int(h)],
                        "pivot": [round(float(px - x), 1), round(float(py - y), 1)]}

    # ---- contact shadow: the alpha, blurred and dropped, in ink
    sh = ndimage.gaussian_filter(alpha, 9)
    sh = np.clip(sh * 0.55, 0, 1)
    shadow = np.zeros((H, W, 4), np.float32)
    shadow[..., 0] = 0x3A / 255; shadow[..., 1] = 0x24 / 255; shadow[..., 2] = 0x50 / 255
    shadow[..., 3] = sh
    sbb = trim(shadow)
    if sbb:
        x, y, w, h = sbb
        Image.fromarray((shadow[y:y + h, x:x + w] * 255).astype(np.uint8), "RGBA") \
            .save(f"{ROOT}/assets/girl{i}_shadow.png")

    OUT[name] = {
        "src": f"girl{i}.png",
        "imgSize": [W, H],
        "fullBBox": [int(v) for v in bb_full],
        "neckY": int(neck),
        "parts": parts,
        "shadowBBox": [int(v) for v in sbb] if sbb else None,
        "coverage": round(100 * float((alpha > 0.5).mean()), 1),
    }
    print(f"  girl{i} [{name:5s}] {W}x{H}  neck y={neck} ({100*neck/H:.0f}%)  "
          f"coverage {OUT[name]['coverage']:.1f}%  parts: {list(parts)}")

with open(f"{ROOT}/assets/girls.json", "w", encoding="utf-8") as fh:
    json.dump(OUT, fh, ensure_ascii=False, indent=1)
print("\n[rig] -> assets/girls.json")
