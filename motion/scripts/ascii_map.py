"""Ink map with a LOCAL baseline. The frame carries a vignette and a paper
gradient, so any global threshold measures the gradient, not the content.
Subtracting a heavy box blur leaves only local contrast: real content."""
import sys, numpy as np
from PIL import Image, ImageFilter
CH = " .:-=+*#%@"
for f in sys.argv[1:]:
    im = Image.open(f).convert('L')
    a = np.asarray(im).astype(np.float32)
    blur = np.asarray(im.filter(ImageFilter.GaussianBlur(34))).astype(np.float32)
    ink = np.clip((blur - a) / 46.0, 0, 1)      # darker than local mean = ink
    sm = np.asarray(Image.fromarray((ink*255).astype(np.uint8)).resize((46,72), Image.BOX)).astype(np.float32)/255
    print(f"=== {f}  local-ink map ===")
    for row in sm:
        print(''.join(CH[min(9,int(v*9.99))] for v in row))
