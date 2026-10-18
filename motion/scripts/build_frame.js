/*
  build_frame.js — inline everything into ONE self-contained HTML frame.

  One file means the renderer fetches nothing while it draws: no network, no
  CORS, no race where a frame renders before an asset arrives.
*/
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const shell = rd('templates/src/shell.html');
const css = rd('templates/src/styles.css');
const core = rd('templates/src/core.js');
const art = rd('templates/src/art.js');
const engine = rd('templates/src/engine.js');

const config = JSON.parse(rd('config.json'));
const timeline = JSON.parse(rd('timeline.json'));
const girls = JSON.parse(rd('assets/girls.json'));
const tiles = JSON.parse(rd('analysis/logo_tiles.json'));
const env = JSON.parse(rd('analysis/audio_env.json'));

const DATA = {
  config, timeline, girls,
  logoTiles: tiles.tiles,
  logo: { aspect: tiles.aspect },
  env: { hopSec: env.hopSec, rms: env.rms, vocal: env.vocal },
  beats: timeline.beats,
};

function inject(src, name, code) {
  const marker = `/*__${name}__*/`;
  const i = src.indexOf(marker);
  if (i < 0) throw new Error(`marker ${marker} not found in shell.html`);
  return src.slice(0, i) + marker + '\n' + code + '\n' + src.slice(i + marker.length);
}

let out = shell;
out = inject(out, 'STYLE', css);
out = inject(out, 'DATA', 'const DATA = ' + JSON.stringify(DATA) + ';');
out = inject(out, 'CORE', core);
out = inject(out, 'ART', art);
out = inject(out, 'ENGINE', engine);

const dest = path.join(ROOT, 'templates/frame.build.html');
fs.writeFileSync(dest, out, 'utf8');
console.log(`[build] ${dest}  ${(fs.statSync(dest).size / 1024).toFixed(1)} KB`);
console.log(`[build] ${timeline.scenes.length} scenes, `
  + `${timeline.scenes.reduce((n, s) => n + (s.lines ? s.lines.length : 0), 0)} text lines, `
  + `${DATA.logoTiles.length} logo tiles, ${Object.keys(girls).length} rigged figures`);
