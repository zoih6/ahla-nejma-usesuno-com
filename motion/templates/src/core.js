/* ============================================================================
   core.js — the machinery everything else is built on.

   Three things here are what separate this film from flat 2D motion graphics:

   1. A REAL CAMERA. Layers live in 3D space (x, y, z). The stage carries a CSS
      `perspective` and the world carries a real matrix, so Chromium does the
      projection: distant layers shrink, rotated planes foreshorten, and a
      dolly move produces genuine parallax. Nothing is faked with scale().

   2. DEPTH OF FIELD. Blur is computed per layer from its distance to the
      focal plane. Near and far layers go soft; the subject stays crisp. That
      single cue is most of what makes a render read as "shot on a camera"
      rather than "assembled in a browser".

   3. ART-DIRECTED KEYFRAMES. Motion is authored as keyframes with named
      easing curves, then interpolated — the way an animator works in a graph
      editor. Procedural sine waves are used only for idle/breathing motion,
      never for a primary move.
   ========================================================================== */

const W = 1080, H = 1920;
const CX = W / 2, CY = H / 2;
const FPS = 25;
const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- palette */
/* bright paper, candy-coloured — chosen with the client */
const C = {
  paper:   '#FFF4E4',
  cream:   '#FFE3BE',
  blush:   '#FF9BB8',
  pink:    '#FF6F9C',
  pinkHot: '#F0407A',
  turq:    '#37C9C4',
  turqDeep:'#12A09B',
  sun:     '#FFC53D',
  tanger:  '#FF8F3C',
  lilac:   '#B18CFF',
  sky:     '#8FDCFF',
  ink:     '#3A2450',   // deep plum instead of black: softer, still high contrast
  inkSoft: '#6B4A85',
};

/* ------------------------------------------------------------- maths ---- */
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, u) => a + (b - a) * u;
const mod = (a, n) => ((a % n) + n) % n;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ------------------------------------------------------------- easing --- */
/* Named curves. `io` = ease in and out, `out` = decelerate, `back`/`elastic`
   overshoot. These are the curves an animator would pick by feel. */
const E = {
  linear: u => u,
  in:     u => u * u * u,
  out:    u => 1 - Math.pow(1 - u, 3),
  io:     u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  qio:    u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2,
  out5:   u => 1 - Math.pow(1 - u, 5),
  in5:    u => u * u * u * u * u,
  expo:   u => u === 0 ? 0 : u === 1 ? 1 : u < .5
              ? Math.pow(2, 20 * u - 10) / 2
              : (2 - Math.pow(2, -20 * u + 10)) / 2,
  back:   u => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
  backIn: u => { const c = 1.70158, c3 = c + 1; return c3 * u * u * u - c * u * u; },
  elastic: u => u === 0 ? 0 : (u === 1 ? 1
              : Math.pow(2, -10 * u) * Math.sin((u * 10 - .75) * (TAU / 3)) + 1),
  bounce: u => {
    const n = 7.5625, d = 2.75;
    if (u < 1 / d) return n * u * u;
    if (u < 2 / d) return n * (u -= 1.5 / d) * u + .75;
    if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + .9375;
    return n * (u -= 2.625 / d) * u + .984375;
  },
};
function easeNamed(name, u) { return (E[name] || E.io)(clamp(u, 0, 1)); }
/* bare `ease` is the cubic ease-out — the default for anything that has no
   reason to accelerate at its start */
function ease(u) { return E.out(clamp(u, 0, 1)); }

/* --------------------------------------------------------- keyframes ---- */
/* keys: [[t, v, easeOut, easeIn], ...]  — value can be a number or an array
   of numbers (so one track can drive x/y/z/rot together). */
function track(keys, t, def) {
  if (!keys || !keys.length) return def !== undefined ? def : 0;
  if (t <= keys[0][0]) return val(keys[0][1]);
  const last = keys[keys.length - 1];
  if (t >= last[0]) return val(last[1]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a[0] && t <= b[0]) {
      let u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      const eOut = a[2] || 'io', eIn = b[3] || a[2] || 'io';
      // blend the outgoing and incoming curves so a keyframe can be
      // "smooth in / sharp out" the way a graph editor handle works
      u = lerp(easeNamed(eOut, u), easeNamed(eIn, u), 0.5);
      const va = val(a[1]), vb = val(b[1]);
      if (Array.isArray(va)) return va.map((x, k) => lerp(x, vb[k], u));
      return lerp(va, vb, u);
    }
  }
  return val(last[1]);
}
function val(v) { return Array.isArray(v) ? v.slice() : v; }

/* ------------------------------------------------------- seeded PRNG ---- */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------- colour --- */
function rgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mixHex(a, b, u) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, u));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, u));
  const bl = Math.round(lerp(pa & 255, pb & 255, u));
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

/* ------------------------------------------------------------ helpers --- */
const n2 = v => Math.round(v * 100) / 100;
function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
function bump(t, at, w) { const u = (t - at) / w; return Math.exp(-u * u); }
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/* smooth pseudo-noise: deterministic, cheap, good enough for drift */
function noise1(x, seed) {
  const i = Math.floor(x), f = x - i;
  const a = hash(String(i + (seed || 0) * 7919));
  const b = hash(String(i + 1 + (seed || 0) * 7919));
  const u = f * f * (3 - 2 * f);
  return lerp(a, b, u) * 2 - 1;
}
