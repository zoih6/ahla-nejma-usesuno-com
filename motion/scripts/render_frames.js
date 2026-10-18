/*
  render_frames.js — Chromium renders each frame headless and screenshots it.

  Everything the page needs is inlined into one HTML file, and the renderer is
  a pure function of absolute time, so the frame loop can be sharded across
  processes with no shared state at all.

  Flags (NOT env vars — env vars do not survive this shell):
      --start=0 --end=7 --stride=25 --out=/var/tmp/ilaf --q=88
*/
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};

const START = parseFloat(arg('start', '0'));
const END = parseFloat(arg('end', '3'));
const STRIDE = parseInt(arg('stride', '25'), 10);
const OUT = arg('out', '/var/tmp/ilaf');
const Q = parseInt(arg('q', '88'), 10);
const SHARD = parseInt(arg('shard', '0'), 10);
const NSHARD = parseInt(arg('nshard', '1'), 10);

const FRAME = path.join(ROOT, 'templates/frame.build.html');
const FILE = url.pathToFileURL(FRAME).href;

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--force-device-scale-factor=1', '--font-render-hinting=none',
         '--disable-lcd-text', '--disable-gpu', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.error('  [page]', m.text().slice(0, 300)); });
page.on('pageerror', e => console.error('  [page]', String(e).slice(0, 400)));

await page.goto(FILE, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => window.__boot());
await page.waitForFunction(() => typeof window.__render === 'function');

let n = 0, t0 = Date.now();
const TOTAL = Math.ceil(END * 25);
for (let i = 0; i < TOTAL; i++) {
  if (NSHARD > 1 && (i % NSHARD) !== SHARD) continue;
  if (i % STRIDE !== 0) continue;
  const t = i / 25;
  if (t < START || t >= END) continue;
  const name = path.join(OUT, 'f' + String(i).padStart(5, '0') + '.jpg');
  if (fs.existsSync(name) && fs.statSync(name).size > 900) { n++; continue; }
  await page.evaluate(tt => window.__render(tt), t);
  await page.screenshot({ path: name, type: 'jpeg', quality: Q });
  n++;
  if (n % 25 === 0) {
    const el = (Date.now() - t0) / 1000;
    console.log(`  ${n} frames  ${el.toFixed(0)}s  ${(n / el).toFixed(1)} fps`);
  }
}
await browser.close();
console.log(`[render] shard ${SHARD}/${NSHARD} -> ${n} frames in ${OUT}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
