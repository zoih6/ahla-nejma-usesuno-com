/*
  compose_video.js — frames + master audio -> output.mp4 (1080x1920).

  Two failures from earlier films worth remembering:

  1. yuvj420p IS REFUSED BY BROWSERS. The filter chain must explicitly scale
     in_range=full:out_range=limited and force format=yuv420p, and the encoder
     must be told -color_range tv. A file that ffprobe calls valid can still be
     unplayable in Chrome, so the pixel format is VERIFIED at the end, not
     assumed.

  2. THE AUDIO IS SHORTER THAN THE FILM. The song is 56.448s; the film runs
     63.45s because the استوديو ومض end card holds 7s past the last note. The
     audio is padded with real digital silence (`apad`) so no player truncates
     the video at 56.4s.

  The master carries a cover-art stream, so every stream is mapped explicitly
  rather than letting ffmpeg copy a still image in as a second video track.
*/
import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const FFMPEG = '/usr/bin/ffmpeg';
const FFPROBE = '/usr/bin/ffprobe';
const FRAMES = process.env.FRAMES || '/var/tmp/ilaf';
const FPS = 25;

const AUDIO = process.env.AUDIO || path.join(ROOT, 'assets/audio_master.mp3');

const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'timeline.json'), 'utf8'));
const DUR = Math.max(...tl.scenes.map(s => s.end));

/* Bright paper candy. The grade LIFTS saturation rather than pulling it, and
   keeps the highlights off the ceiling so the cream never clips to white. */
const GRADE = 'eq=contrast=1.04:saturation=1.07:brightness=0.004';

const OUT = path.join(ROOT, 'output');
fs.mkdirSync(OUT, { recursive: true });

const probe = (p, args) =>
  execFileSync(FFPROBE, ['-v', 'error', ...args, p], { encoding: 'utf8' }).trim();

function run(args) {
  const a = args.map(x => String(x).replace(/\s*\n\s*/g, ' '));
  console.log('$ ffmpeg ' + a.slice(0, 7).join(' ') + ' …');
  const r = spawnSync(FFMPEG, ['-y', '-v', 'error', ...a], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr || r.stdout); throw new Error('ffmpeg failed'); }
  return r.stdout || '';
}

/* --------------------------------------------------------------- checks - */
const nFrames = fs.readdirSync(FRAMES).filter(f => f.endsWith('.jpg')).length;
const want = Math.round(DUR * FPS);
console.log(`[compose] ${nFrames} frames on disk, timeline wants ${want}`);
if (nFrames < want - 2) throw new Error(`missing frames: have ${nFrames}, need ${want}`);
if (!fs.existsSync(path.join(FRAMES, 'f00000.jpg'))) throw new Error('f00000.jpg missing');

const aDur = parseFloat(probe(AUDIO, ['-show_entries', 'format=duration',
  '-of', 'default=nw=1:nk=1']));
console.log(`[compose] song ${aDur.toFixed(3)}s -> padded to ${DUR.toFixed(2)}s `
  + `(+${(DUR - aDur).toFixed(2)}s of silence under the end card)`);

/* ---------------------------------------------------------------- master - */
const out = path.join(OUT, 'output.mp4');
run([
  '-framerate', String(FPS),
  '-i', path.join(FRAMES, 'f%05d.jpg'),
  '-i', AUDIO,
  '-filter_complex',
  `[0:v]${GRADE},scale=in_range=full:out_range=limited,format=yuv420p[v];` +
  `[1:a]apad,atrim=0:${DUR.toFixed(3)},asetpts=N/SR/TB[a]`,
  '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-profile:v', 'main', '-level', '4.0',
  '-preset', 'medium', '-crf', '23',
  '-maxrate', '1800k', '-bufsize', '3600k',
  '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
  '-t', DUR.toFixed(3),
  '-movflags', '+faststart',
  out,
]);

/* -------------------------------------------------- light preview pass --- */
const prev = path.join(OUT, 'preview_light.mp4');
run([
  '-i', out,
  '-vf', 'scale=540:960:in_range=full:out_range=limited,format=yuv420p',
  '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'veryfast', '-crf', '29',
  '-maxrate', '800k', '-bufsize', '1600k', '-pix_fmt', 'yuv420p',
  '-color_range', 'tv', '-c:a', 'aac', '-b:a', '96k',
  '-movflags', '+faststart', prev,
]);

/* ------------------------------------------------------------- verify ---- */
function verify(f, label) {
  const px = probe(f, ['-select_streams', 'v:0', '-show_entries',
    'stream=pix_fmt,color_range,width,height', '-of', 'default=nw=1:nk=1']);
  console.log(`[verify] ${label}: ${px.replace(/\n/g, '  ')}`);
  if (!/yuv420p/.test(px) || /yuvj/.test(px)) {
    throw new Error(`${label} is ${px} — browsers refuse yuvj; re-encode`);
  }
}
verify(out, 'master');
verify(prev, 'preview');

const vd = parseFloat(probe(out, ['-select_streams', 'v:0', '-count_frames',
  '-show_entries', 'stream=nb_read_frames', '-of', 'default=nw=1:nk=1']));
const dur = parseFloat(probe(out, ['-show_entries', 'format=duration',
  '-of', 'default=nw=1:nk=1']));
console.log(`\n[done] ${out}`);
console.log(`       ${(fs.statSync(out).size / 1048576).toFixed(1)} MB  ${dur.toFixed(2)}s  ${vd} frames`);
console.log(`       preview ${(fs.statSync(prev).size / 1048576).toFixed(1)} MB`);
if (Math.abs(vd - want) > 3) console.warn(`  ! frame count off by ${vd - want}`);

/* the end card must be silent — measure it rather than assume it */
const vol = execFileSync(FFMPEG, ['-v', 'info', '-ss', String(aDur + 0.6), '-t', '5.0',
  '-i', out, '-af', 'volumedetect', '-f', 'null', '/dev/null'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const m = vol.match(/mean_volume:\s*([-\d.]+)\s*dB/);
console.log(`       end-card level: ${m ? m[1] + ' dB' : 'unread'} (silence expected)`);
