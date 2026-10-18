/* ============================================================================
   engine.js — camera, rig and type.

   window.__boot() once, then window.__render(t) for any absolute time.
   Pure function of t: frame 1 and frame 1500 can be rendered in separate
   processes and will still cut together.
   ========================================================================== */

const EL = {};
let MAP = {};
let sceneIdx = -1;
let wordEls = [], wordData = [];

/* ------------------------------------------------------------------ boot */
function boot() {
  EL.world = document.getElementById('world');
  EL.art = document.getElementById('art');
  EL.stack = document.getElementById('stack');
  EL.type = document.getElementById('type');
  EL.flash = document.getElementById('flash');
  EL.vig = document.getElementById('vignette');
  EL.grain = document.getElementById('grain');
  EL.planes = {
    sky: document.getElementById('p_sky'), far: document.getElementById('p_far'),
    mid: document.getElementById('p_mid'), girl: document.getElementById('p_girl'),
    near: document.getElementById('p_near'), fore: document.getElementById('p_fore'),
  };
  EL.head = document.getElementById('girlHead');
  EL.body = document.getElementById('girlBody');
  EL.shadow = document.getElementById('girlShadow');

  const FONTS = ['900 132px Cairo', '900 110px Cairo', '700 86px Cairo',
                 '400 62px Cairo', '700 38px Tajawal', '700 76px Amiri'];
  for (const f of FONTS) { try { document.fonts.load(f); } catch (e) { } }

  EL.grain.style.backgroundImage = `url('../assets/tex/grain.png')`;
  document.getElementById('papertex').style.backgroundImage = `url('../assets/tex/paper.png')`;
  document.getElementById('fibres').style.backgroundImage = `url('../assets/tex/fibres.png')`;

  MAP.girls = DATA.girls;
  /* the end-card mark: 560 wide, centred at y=760 — 52% of frame width,
     which is a real logo size for a vertical end card */
  const LW = 560, LH = LW / DATA.logo.aspect;
  MAP.logoBox = { x: CX - LW / 2, y: 690 - LH / 2, w: LW, h: LH };
  MAP.logoTiles = DATA.logoTiles;

  const env = DATA.env;
  MAP.step = env.hopSec; MAP.rms = env.rms; MAP.vocal = env.vocal;
  MAP.beats = DATA.beats;
}

function envAt(t, arr, step, win) {
  const i0 = Math.max(0, Math.floor((t - win / 2) / step));
  const i1 = Math.min(arr.length, Math.ceil((t + win / 2) / step));
  let s = 0, n = 0;
  for (let i = i0; i < i1; i++) { s += arr[i]; n++; }
  return n ? s / n : 0;
}

function findScene(t) {
  const S = DATA.timeline.scenes;
  for (let i = 0; i < S.length; i++) if (t < S[i].end) return S[i];
  return S[S.length - 1];
}

/* ------------------------------------------------------------ buildScene */
function buildScene(scene) {
  sceneIdx = scene.__i;
  wordEls = []; wordData = [];
  let html = '';
  (scene.lines || []).forEach((ln, li) => {
    const cls = ['line', ln.cls || ''].join(' ');
    html += `<div class="${cls}" data-li="${li}">`;
    (ln.words || []).forEach((w, wi) => {
      const k = w.k ? ' ' + (ln.kwStyle || 'kw') : '';
      html += `<span class="w${k}" data-w="${wordData.length}">${w.t}</span>`;
      if (wi < ln.words.length - 1) html += `<span class="w"> </span>`;
      wordData.push(Object.assign({}, w, { li }));
    });
    html += `</div>`;
  });
  if (scene.sub) html += `<div class="sub" id="sub">${scene.sub}</div>`;
  EL.stack.innerHTML = html;
  wordEls = Array.prototype.slice.call(EL.stack.querySelectorAll('.w[data-w]'));

  const L = EL.stack.querySelectorAll('.line');
  for (let i = 0; i < L.length; i++) {
    const ln = scene.lines[i];
    L[i].style.fontSize = (ln.size || scene.size || 96) + 'px';
  }
  const sub = document.getElementById('sub');
  if (sub) sub.style.fontSize = (scene.subSize || 38) + 'px';

  autofit(scene);
}

/* 1080px is narrow for display Arabic; every line is measured and shrunk to
   fit rather than allowed to overflow or wrap mid-phrase. */
const SAFE_W = 1080 - 2 * 70;
function autofit(scene) {
  const L = EL.stack.querySelectorAll('.line');
  for (let i = 0; i < L.length; i++) {
    const el = L[i];
    let fs = parseFloat(el.style.fontSize) || 96;
    for (let k = 0; k < 4; k++) {
      const r = document.createRange();
      r.selectNodeContents(el);
      const w = r.getBoundingClientRect().width;
      if (!(w > SAFE_W)) break;
      fs = Math.floor(fs * (SAFE_W / w) * .985);
      el.style.fontSize = fs + 'px';
    }
  }
}

/* ==========================================================================
   THE CAMERA
   A real 3D transform on #world. `perspective` lives on #stage, so Chromium
   projects the planes: depth genuinely shrinks and rotates foreshorten.
   ========================================================================== */
function applyCamera(cam) {
  const z = cam.z || 0, rx = cam.rx || 0, ry = cam.ry || 0, rz = cam.rz || 0;
  EL.world.style.transform =
    `translate3d(0,0,${n2(z)}px) rotateX(${n2(rx)}deg) rotateY(${n2(ry)}deg) ` +
    `rotateZ(${n2(rz)}deg) translate3d(${n2(-(cam.x || 0))}px,${n2(-(cam.y || 0))}px,0)`;
}

/* Depth of field: blur each plane by how far it sits from the focal plane.
   This one cue is most of what separates "shot on a camera" from "assembled". */
function applyDof(planes, focusZ, strength) {
  for (const k in planes) {
    const d = Math.abs((planes[k] || 0) - focusZ);
    const b = clamp(d / 900, 0, 1) * strength;
    EL.planes[k].style.filter = b > .25 ? `blur(${n2(b)}px)` : 'none';
  }
}

/* ==========================================================================
   THE RIG
   Head and body are separate nodes with their own pivots. The body sways; the
   head counter-rotates a beat LATER. That lag is what makes a paper cut-out
   read as a living character instead of a sticker sliding around.
   ========================================================================== */
function placeGirl(scene, t, p, energy, beat) {
  const g = scene.girl;
  if (!g) { EL.head.style.opacity = '0'; EL.body.style.opacity = '0'; EL.shadow.style.opacity = '0'; return; }
  const R = MAP.girls[g.which];
  if (!R) return;

  const full = R.fullBBox;                      // [x,y,w,h] in source pixels
  const scale = (g.h || 1080) / full[3];        // fit the figure to a target height
  const ox = (g.x != null ? g.x : CX) - (full[0] + full[2] / 2) * scale;
  const oy = (g.y != null ? g.y : 1180) - (full[1] + full[3]) * scale;

  /* entrance: pop in with overshoot, then settle */
  const inU = ease(clamp(seg(p, g.inAt != null ? g.inAt : .04, (g.inAt != null ? g.inAt : .04) + .30), 0, 1));
  const outU = 1 - ease(clamp(seg(p, g.outAt != null ? g.outAt : .93, 1), 0, 1));
  const pop = E.back(inU);
  const vis = clamp(inU * outU, 0, 1);

  /* motion: sway from the music, drift from noise, bob on the beat */
  const sway = Math.sin(t * 1.35) * 3.6 + noise1(t * .55, 3) * 2.8;
  const swayLag = Math.sin(t * 1.35 - .55) * 4.4 + noise1(t * .55 - .3, 7) * 3.2;
  /* a nod on the beat: the head dips just after each beat lands */
  const nod = Math.pow(1 - beat, 2.2) * 4.2;
  const bob = Math.sin(t * 2.7) * 3.6 * (.5 + energy * .8) + nod;
  const lean = Math.sin(t * .8) * 2.6;

  /* ---- body: sways about the hips ---- */
  const B = R.parts.body;
  if (B) {
    const bw = B.bbox[2] * scale, bh = B.bbox[3] * scale;
    const bx = ox + B.bbox[0] * scale, by = oy + B.bbox[1] * scale;
    setPart(EL.body, `girl${idxOf(g.which)}_body.png`, bx, by, bw, bh,
      B.pivot[0] * scale, B.pivot[1] * scale,
      `rotateZ(${n2(sway)}deg) rotateY(${n2(lean)}deg) scale(${n2(.80 + .20 * pop)})`,
      vis);
  }
  /* ---- head: counter-rotates, delayed, and bobs ---- */
  const Hd = R.parts.head;
  if (Hd) {
    const hw = Hd.bbox[2] * scale, hh = Hd.bbox[3] * scale;
    const hx = ox + Hd.bbox[0] * scale, hy = oy + Hd.bbox[1] * scale;
    setPart(EL.head, `girl${idxOf(g.which)}_head.png`, hx, hy, hw, hh,
      Hd.pivot[0] * scale, Hd.pivot[1] * scale,
      `rotateZ(${n2(-swayLag * .72)}deg) rotateY(${n2(-lean * .7)}deg) ` +
      `translateY(${n2(bob)}px) scale(${n2(.80 + .20 * pop)})`,
      vis);
  }
  /* ---- contact shadow: stays on the ground, only scales ---- */
  if (R.shadowBBox) {
    const s = R.shadowBBox;
    setPart(EL.shadow, `girl${idxOf(g.which)}_shadow.png`,
      ox + s[0] * scale, oy + s[1] * scale, s[2] * scale, s[3] * scale,
      s[2] * scale / 2, s[3] * scale,
      `scale(${n2((.80 + .20 * pop) * (1 - bob / 260))})`, vis * .85);
  }
}

function setPart(el, file, x, y, w, h, px, py, tf, op) {
  el.style.backgroundImage = `url('../assets/${file}')`;
  el.style.left = n2(x) + 'px';
  el.style.top = n2(y) + 'px';
  el.style.width = n2(w) + 'px';
  el.style.height = n2(h) + 'px';
  el.style.transformOrigin = `${n2(px)}px ${n2(py)}px`;
  el.style.transform = tf;
  el.style.opacity = op.toFixed(3);
}
function idxOf(which) { return { wide: 1, mid: 2, close: 3, hero: 4 }[which] || 1; }

/* ==========================================================================
   TYPE
   Words are authored to land on their measured times with a pop and a small
   3D tilt, not a fade. Keywords get the stacked-paper treatment.
   ========================================================================== */
function paintType(scene, t, p, energy) {
  for (let i = 0; i < wordEls.length; i++) {
    const w = wordData[i], el = wordEls[i];
    let u;
    if (w.s != null) u = clamp((t - w.s) / .18, 0, 1);
    else u = clamp((t - scene.start - (w.at || 0)) / .28, 0, 1);
    const outv = 1 - ease(clamp(seg(t, scene.end - .30, scene.end), 0, 1));
    u = Math.min(u, outv);
    if (u <= .001) {
      el.style.opacity = '0';
      /* collapse it: an unseen word still reserved its box, which pushed the
         visible line off centre (the outro's second «مبروك» shoved the first
         one upward for 4.7s before it had sung a note) */
      el.style.display = (w.s != null && t < w.s - .02) ? 'none' : 'inline-block';
      continue;
    }
    const pop = E.back(clamp(u, 0, 1));
    const rot = (1 - pop) * (i % 2 ? 9 : -9);
    const ty = (1 - pop) * 46;
    const sc = .55 + .45 * pop;
    el.style.opacity = clamp(u, 0, 1).toFixed(3);
    el.style.transform = `translateY(${n2(ty)}px) rotate(${n2(rot)}deg) scale(${n2(sc)})`;
    el.style.display = 'inline-block';
  }
  /* the whole stack breathes very slightly with the voice */
  const s = 1 + .008 * energy;
  EL.stack.style.transform = `scale(${s.toFixed(4)})`;
  EL.stack.style.opacity = '1';
}

/* ---------------------------------------------------------------- chrome */
function paintChrome(scene, t, p, energy) {
  const f = clamp((energy - .55) * .5, 0, 1) * (scene.flashOff ? 0 : 1);
  EL.flash.style.opacity = (f * .06).toFixed(4);
  EL.vig.style.opacity = (1 - .12 * energy).toFixed(3);
}

/* --------------------------------------------------------------- render */
function render(t) {
  const scene = findScene(t);
  if (scene.__i !== sceneIdx) buildScene(scene);
  const p = clamp((t - scene.start) / (scene.end - scene.start), 0, 1);
  const energy = clamp(envAt(t, MAP.rms, MAP.step, .08) * 1.8 +
                       envAt(t, MAP.vocal, MAP.step, .08) * .6, 0, 1.5);

  let beat = 0;
  const B = MAP.beats;
  if (B && B.length) {
    let lo = 0, hi = B.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (B[m] < t) lo = m + 1; else hi = m; }
    const prev = B[lo - 1] != null ? B[lo - 1] : B[0];
    const next = B[lo] != null ? B[lo] : prev + .6;
    beat = clamp((t - prev) / Math.max(.05, next - prev), 0, 1);
  }

  /* ---- camera: authored per scene, driven by keyframes ---- */
  const cam = {
    x: track(scene.camX, p, 0),
    y: track(scene.camY, p, 0),
    z: track(scene.camZ, p, 0),
    rx: track(scene.camRX, p, 0),
    ry: track(scene.camRY, p, 0),
    rz: track(scene.camRZ, p, 0),
  };
  applyCamera(cam);

  const planes = scene.planes || { sky: -1200, far: -700, mid: -260, girl: 0, near: 220, fore: 520 };
  for (const k in planes) EL.planes[k].style.transform = `translateZ(${planes[k]}px)`;
  applyDof(planes, scene.focusZ != null ? scene.focusZ : 0, scene.dof != null ? scene.dof : 3.2);

  placeGirl(scene, t, p, energy, beat);

  const S = { scene, t, p, abs: t, energy, beat,
              logoBox: MAP.logoBox, logoTiles: MAP.logoTiles };
  const fn = ART[scene.art];
  EL.art.innerHTML = fn ? fn(S) : '';
  EL.art.style.transform = `translateZ(${(planes.mid || 0)}px)`;

  /* type sits where the scene wants it in the vertical frame */
  EL.type.style.transform = `translateY(${(scene.typeY != null ? scene.typeY : -520)}px)`;

  paintType(scene, t, p, energy);
  paintChrome(scene, t, p, energy);
}

window.__boot = boot;
window.__render = render;
