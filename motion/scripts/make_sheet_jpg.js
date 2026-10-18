/* contact_sheet.jpg — one glance over the whole film.
   A 4-across grid of thumbnails with the timecode and shot name under each,
   so the cut can be reviewed without opening a video player. */
import fs from 'fs'; import path from 'path'; import url from 'url';
import sharp from 'sharp';
const __dir = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const FRAMES = process.env.FRAMES || '/var/tmp/ilaf';
const FPS = 25;
const OUT = path.join(ROOT, 'output', 'contact_sheet.jpg');

const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'timeline.json'), 'utf8'));
const PER = 3;
const picks = [];
for (const s of tl.scenes) {
  for (let k = 0; k < PER; k++) {
    const t = s.start + (s.end - s.start) * ((k + .5) / PER);
    picks.push({ i: Math.min(Math.round(t * FPS), Math.round(tl.duration * FPS) - 1), t, name: s.id, art: s.art });
  }
}
const CW = 270, CH = 480, CAP = 26, COLS = 4;
const rows = Math.ceil(picks.length / COLS);
const W = COLS * CW, H = rows * (CH + CAP);

const comp = [];
for (let n = 0; n < picks.length; n++) {
  const p = picks[n];
  const f = path.join(FRAMES, 'f' + String(p.i).padStart(5, '0') + '.jpg');
  if (!fs.existsSync(f)) continue;
  const th = await sharp(f).resize(CW, CH, { fit: 'cover' }).toBuffer();
  const x = (n % COLS) * CW, y = Math.floor(n / COLS) * (CH + CAP);
  comp.push({ input: th, left: x, top: y });
  const svg = `<svg width="${CW}" height="${CAP}"><rect width="${CW}" height="${CAP}" fill="#1a1030"/>`
    + `<text x="8" y="18" font-family="monospace" font-size="14" fill="#FFD447">`
    + `${p.t.toFixed(2)}s</text>`
    + `<text x="${CW - 8}" y="18" text-anchor="end" font-family="monospace" font-size="14" fill="#8FE3E0">`
    + `${p.art}</text></svg>`;
  comp.push({ input: Buffer.from(svg), left: x, top: y + CH });
}
await sharp({ create: { width: W, height: H, channels: 3, background: '#1a1030' } })
  .composite(comp).jpeg({ quality: 82 }).toFile(OUT);
console.log(`[sheet] ${OUT}  ${picks.length} thumbs  ${W}x${H}  `
  + `${(fs.statSync(OUT).size/1048576).toFixed(2)} MB`);
