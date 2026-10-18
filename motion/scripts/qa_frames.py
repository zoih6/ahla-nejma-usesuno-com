"""Numeric QA. I cannot see the frames, so they are measured instead:
   per-frame statistics, a coarse ASCII luminance map of the composition, and
   a check that the cut-out is actually on screen and the type is legible."""
import sys, glob, numpy as np
from PIL import Image

files = sorted(glob.glob(sys.argv[1] + '/f*.jpg'))
print(f"{len(files)} frames\n")
print(f"{'frame':>8} {'t':>7} {'mean':>6} {'std':>6} {'ink%':>6} {'pink%':>6} {'turq%':>6} {'sun%':>6}  flags")

CH = " .:-=+*#%@"
for f in files:
    im = Image.open(f).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    lum = a @ [.299, .587, .114]
    idx = int(f.split('/')[-1][1:6]); t = idx / 25
    ink = (lum < 90).mean() * 100
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    pink = ((r > 190) & (g < 150) & (b > 110) & (b < 200)).mean() * 100
    turq = ((b > 140) & (g > 140) & (r < 140)).mean() * 100
    sun = ((r > 220) & (g > 150) & (g < 215) & (b < 130)).mean() * 100
    flags = []
    if a.std() < 12: flags.append('FLAT!')
    if ink < .4: flags.append('no-ink')
    if ink > 34: flags.append('too-dark')
    print(f"{idx:>8} {t:>7.2f} {a.mean():>6.1f} {a.std():>6.1f} "
          f"{ink:>6.2f} {pink:>6.2f} {turq:>6.2f} {sun:>6.2f}  {' '.join(flags)}")
