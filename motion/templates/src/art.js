/* ============================================================================
   art.js — the drawn world: every prop is a piece of cut paper.

   Each generator returns an SVG fragment. Nothing is stock art and nothing is
   a flat icon: every shape carries a torn edge, a thickness shadow and a
   paper grain, so the whole frame reads as one physical tabletop theatre.
   ========================================================================== */

/* --------------------------------------------------------------- a star -- */
/* The song is «أحلى نجمة», so the star is the film's signature. It is drawn
   as a slightly irregular five-point shape -- a perfect star looks like clip
   art, a hand-cut one looks like paper. */
function star(cx, cy, r, fill, rot, seed, stroke) {
  const rnd = rng(Math.floor(seed * 1000) + 7);
  let d = '';
  const N = 10;
  for (let i = 0; i < N; i++) {
    const a = rot + (i / N) * TAU - Math.PI / 2;
    const rr = (i % 2 === 0 ? r : r * 0.44) * (1 + (rnd() - .5) * .12);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    d += (i === 0 ? 'M' : 'L') + n2(x) + ' ' + n2(y) + ' ';
  }
  return `<path d="${d}Z" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="2.5"` : ''}/>`;
}

/* ------------------------------------------------------------ a cloud ---- */
function cloud(cx, cy, w, fill, seed) {
  const rnd = rng(Math.floor(seed * 1000) + 31);
  let d = `M${n2(cx - w / 2)} ${n2(cy)}`;
  const lobes = 5;
  for (let i = 0; i < lobes; i++) {
    const u = i / (lobes - 1);
    const x = lerp(cx - w / 2, cx + w / 2, u);
    const rr = w * (0.16 + 0.13 * Math.sin(u * Math.PI)) * (1 + (rnd() - .5) * .2);
    d += ` Q${n2(x)} ${n2(cy - rr * 1.5)} ${n2(x + w / (lobes - 1))} ${n2(cy)} `;
  }
  d += ` L${n2(cx + w / 2)} ${n2(cy + w * .12)} L${n2(cx - w / 2)} ${n2(cy + w * .12)} Z`;
  return `<path d="${d}" fill="${fill}"/>`;
}

/* ------------------------------------------------------------ confetti --- */
/* small torn paper squares, each tumbling on its own axis */
function confetti(t, n, seed, box, pal) {
  const rnd = rng(seed);
  let o = '';
  for (let i = 0; i < n; i++) {
    const sx = rnd(), sy = rnd(), sp = .35 + rnd() * .9, phase = rnd() * TAU;
    const x = box[0] + sx * box[2];
    const fall = mod(sy + t * sp * .22, 1);
    const y = box[1] + fall * box[3];
    const rot = (t * (40 + rnd() * 160) + phase * 57) % 360;
    const w = 9 + rnd() * 16, h = 5 + rnd() * 9;
    const col = pal[Math.floor(rnd() * pal.length)];
    // tumble: squash the width as it spins, so it reads as rotation, not slide
    const sq = Math.abs(Math.cos((rot + phase) * Math.PI / 180));
    o += `<rect x="${n2(x - w / 2)}" y="${n2(y)}" width="${n2(w * (0.25 + .75 * sq))}" height="${n2(h)}" `
      + `rx="1.5" fill="${col}" transform="rotate(${n2(rot)} ${n2(x)} ${n2(y)})" opacity="${n2(.55 + rnd() * .45)}"/>`;
  }
  return o;
}

/* -------------------------------------------------------------- sparkle -- */
function sparkle(cx, cy, r, fill, op) {
  return `<path d="M${n2(cx)} ${n2(cy - r)} Q${n2(cx + r * .16)} ${n2(cy - r * .16)} ${n2(cx + r)} ${n2(cy)} `
    + `Q${n2(cx + r * .16)} ${n2(cy + r * .16)} ${n2(cx)} ${n2(cy + r)} `
    + `Q${n2(cx - r * .16)} ${n2(cy + r * .16)} ${n2(cx - r)} ${n2(cy)} `
    + `Q${n2(cx - r * .16)} ${n2(cy - r * .16)} ${n2(cx)} ${n2(cy - r)} Z" fill="${fill}" opacity="${op}"/>`;
}

/* --------------------------------------------------------------- crayon --- */
function crayon(x, y, len, col, rot) {
  const w = len * .17;
  return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(rot)})">`
    + `<rect x="0" y="${n2(-w / 2)}" width="${n2(len * .74)}" height="${n2(w)}" rx="${n2(w * .18)}" fill="${col}"/>`
    + `<rect x="${n2(len * .70)}" y="${n2(-w / 2)}" width="${n2(len * .10)}" height="${n2(w)}" fill="${rgba(C.ink, .16)}"/>`
    + `<path d="M${n2(len * .80)} ${n2(-w / 2)} L${n2(len)} 0 L${n2(len * .80)} ${n2(w / 2)} Z" fill="${mixHex(col, C.ink, .34)}"/>`
    + `</g>`;
}

/* ----------------------------------------------------------------- book --- */
function openBook(cx, cy, w, colPage, colCover) {
  const h = w * .62;
  return `<g>`
    + `<path d="M${n2(cx - w / 2)} ${n2(cy - h * .34)} Q${n2(cx)} ${n2(cy - h * .52)} ${n2(cx + w / 2)} ${n2(cy - h * .34)} `
    + `L${n2(cx + w / 2)} ${n2(cy + h * .30)} Q${n2(cx)} ${n2(cy + h * .48)} ${n2(cx - w / 2)} ${n2(cy + h * .30)} Z" fill="${colCover}"/>`
    + `<path d="M${n2(cx - w / 2 + 10)} ${n2(cy - h * .28)} Q${n2(cx)} ${n2(cy - h * .44)} ${n2(cx + w / 2 - 10)} ${n2(cy - h * .28)} `
    + `L${n2(cx + w / 2 - 10)} ${n2(cy + h * .24)} Q${n2(cx)} ${n2(cy + h * .40)} ${n2(cx - w / 2 + 10)} ${n2(cy + h * .24)} Z" fill="${colPage}"/>`
    + `<line x1="${n2(cx)}" y1="${n2(cy - h * .42)}" x2="${n2(cx)}" y2="${n2(cy + h * .38)}" stroke="${rgba(C.ink, .30)}" stroke-width="3"/>`
    + `</g>`;
}

/* --------------------------------------------------------------- balloon -- */
function balloon(x, y, r, col, sway) {
  return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(sway)})">`
    + `<ellipse cx="0" cy="0" rx="${n2(r)}" ry="${n2(r * 1.18)}" fill="${col}"/>`
    + `<path d="M0 ${n2(r * 1.18)} l-7 14 l14 0 Z" fill="${mixHex(col, C.ink, .35)}"/>`
    + `<path d="M0 ${n2(r * 1.30)} q22 34 4 74 q-14 22 -20 4" fill="none" stroke="${rgba(C.ink, .45)}" stroke-width="2"/>`
    + `<ellipse cx="${n2(-r * .34)}" cy="${n2(-r * .42)}" rx="${n2(r * .22)}" ry="${n2(r * .30)}" fill="#FFF" opacity=".42" transform="rotate(-22)"/>`
    + `</g>`;
}

/* ---------------------------------------------------------------- medal -- */
function medal(cx, cy, r) {
  return `<g transform="translate(${n2(cx)} ${n2(cy)})">`
    + `<path d="M${n2(-r * .9)} ${n2(-r * .6)} L${n2(-r * .2)} ${n2(-r * 2.3)} L${n2(r * .1)} ${n2(-r * .7)} Z" fill="${C.turq}"/>`
    + `<path d="M${n2(r * .9)} ${n2(-r * .6)} L${n2(r * .2)} ${n2(-r * 2.3)} L${n2(-r * .1)} ${n2(-r * .7)} Z" fill="${C.turqDeep}"/>`
    + `<circle r="${n2(r)}" fill="${C.sun}" stroke="${C.tanger}" stroke-width="${n2(r * .13)}"/>`
    + star(0, 0, r * .62, C.tanger, 0, 4.2) +
    `</g>`;
}

/* ==========================================================================
   SCENES
   Each returns {svg, planes} — planes carry the 3D placement of the figure
   and of any depth props, so the camera move affects them for real.
   ========================================================================== */

/* ------------------------------------------------------- 1. title / open */
function artOpen(S) {
  const { t, p, energy } = S;
  let o = '<defs>' + rgDef('rayY', [[0, C.sun, .55], [1, C.sun, 0]], 0, 0, 0, 1) + '</defs>';

  /* rays behind the title */
  const spin = t * 5;
  o += `<g transform="translate(${CX} ${780}) rotate(${n2(spin)})" opacity=".30">`;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    o += `<path d="M0 0 L${n2(Math.cos(a - .06) * 900)} ${n2(Math.sin(a - .06) * 900)} `
      + `L${n2(Math.cos(a + .06) * 900)} ${n2(Math.sin(a + .06) * 900)} Z" `
      + `fill="${i % 2 ? C.sun : C.blush}" opacity="${i % 2 ? .5 : .35}"/>`;
  }
  o += '</g>';

  /* a constellation of stars arranging itself into one big star */
  const N = 26;
  const rnd = rng(909);
  const form = ease(clamp(seg(p, .10, .72), 0, 1));
  for (let i = 0; i < N; i++) {
    const r0 = 620 + rnd() * 260, a0 = rnd() * TAU;
    const tx = CX + Math.cos(a0) * r0, ty = 780 + Math.sin(a0) * r0;
    // target: points on a star outline
    const ai = (i / N) * TAU - Math.PI / 2;
    const rr = (i % 2 === 0 ? 300 : 132);
    const gx = CX + Math.cos(ai) * rr, gy = 780 + Math.sin(ai) * rr;
    const x = lerp(tx, gx, form), y = lerp(ty, gy, form);
    const sz = lerp(10, 26, form) * (.7 + (.3 + .7 * rnd()));
    o += star(x, y, sz, i % 3 === 0 ? C.sun : (i % 3 === 1 ? C.turq : C.blush),
      t * 30 + i, i * 1.7);
  }
  /* the hero star, once formed */
  if (form > .82) {
    const k = seg(form, .82, 1);
    const pop = ease(clamp(seg(p, .68, .86), 0, 1));
    o += `<g transform="translate(${CX} 780) scale(${n2(.6 + .4 * E.back(pop))})">`
      + star(0, 0, 210 * k, C.sun, t * 12, 3.3, C.tanger) + '</g>';
  }
  o += confetti(t, 34, 44, [0, 0, W, H], [C.pink, C.turq, C.sun, C.lilac, C.tanger]);
  o += sparkle(CX + 190, 560, 34 + 12 * Math.sin(t * 4), C.paper, .9);
  o += sparkle(CX - 240, 980, 22 + 10 * Math.sin(t * 5 + 2), C.paper, .8);
  return o;
}

/* ------------------------------------------- 1b. bloom (the title card) -- */
/* Paper flowers opening behind the title. Each petal is a separate lobe that
   unfolds from the centre, so the frame blossoms rather than fading up. */
function artBloom(S) {
  const { t, p } = S;
  let o = '';
  const rnd = rng(1717);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + t * .12;
    const rr = 300 + rnd() * 320;
    const x = CX + Math.cos(a) * rr;
    const y = 820 + Math.sin(a) * rr * .82;
    const open = ease(clamp(seg(p, .04 + (i % 5) * .045, .40 + (i % 5) * .045), 0, 1));
    const R = (34 + rnd() * 40) * (.35 + .65 * open);
    const col = [C.pink, C.blush, C.sun, C.lilac, C.tanger][i % 5];
    o += `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(t * 18 + i * 33)})">`;
    for (let k = 0; k < 6; k++) {
      const pa = (k / 6) * TAU;
      o += `<ellipse cx="${n2(Math.cos(pa) * R * .62)}" cy="${n2(Math.sin(pa) * R * .62)}" `
        + `rx="${n2(R * .52)}" ry="${n2(R * .34)}" fill="${col}" `
        + `transform="rotate(${n2(pa * 57.3)})" opacity="${n2(.55 + .45 * open)}"/>`;
    }
    o += `<circle r="${n2(R * .30)}" fill="${C.sun}"/>`
      + `<circle r="${n2(R * .16)}" fill="${C.tanger}"/></g>`;
  }
  o += confetti(t, 18, 202, [0, 0, W, H], [C.blush, C.sun, C.turq]);
  return o;
}

/* ------------------------------------ 2b. medal — «المركز الأول» -------- */
/* The song literally says «first place», so the scene is built around the
   medal: it swings in on a ribbon, then the frame behind it erupts in rays. */
function artMedal(S) {
  const { t, p, beat } = S;
  let o = '';
  const near = 1 - Math.min(1, Math.abs(beat - 0));
  /* The medal is drawn on the MID plane, which sits BEHIND the figure. Placed
     centrally it vanished entirely behind her head (her head is 352px wide,
     the medal only 264). It is therefore put in the clear side channels —
     the figure occupies x 288..792 — as a pair of medallions flanking her,
     with the sunburst centred behind her where it cannot hide. */
  const MX = CX, MY = 980;
  /* rays behind */
  o += `<g transform="translate(${MX} ${MY})" opacity="${n2(.24 + .34 * near)}">`;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU + t * .22;
    const L = 380 + 90 * near;
    o += `<path d="M0 0 L${n2(Math.cos(a - .045) * L)} ${n2(Math.sin(a - .045) * L)} `
      + `L${n2(Math.cos(a + .045) * L)} ${n2(Math.sin(a + .045) * L)} Z" `
      + `fill="${i % 2 ? C.sun : C.blush}" opacity="${i % 2 ? .5 : .34}"/>`;
  }
  o += '</g>';
  /* the medal swings in and settles */
  const sw = E.out(clamp(seg(p, .05, .42), 0, 1));
  /* two medallions, swinging in from the outside on their ribbons */
  [[168, 900, -1], [912, 900, 1]].forEach(([px, py, dir], k) => {
    const d = E.out(clamp(seg(p, .06 + k * .07, .46 + k * .07), 0, 1));
    const ang = dir * (1 - d) * 46 + Math.sin(t * 1.8 + k * 2) * 5 * d;
    const x = px + dir * (1 - d) * 210;
    o += `<g transform="translate(${n2(x)} ${n2(py)}) rotate(${n2(ang)}) `
      + `scale(${n2(.55 + .45 * d)})">` + medal(0, 0, 104) + '</g>';
  });
  o += confetti(t, 24, 404, [0, 0, W, H], [C.sun, C.pink, C.turq]);
  return o;
}

/* ------------------------------------------- 4b. rainbow (second chorus) - */
/* «أَحْلَى نَجْمَة» returns, so the signature gets its own signature image:
   an arc of paper bands that sweeps across the frame behind her. */
function artRainbow(S) {
  const { t, p } = S;
  let o = '';
  const bands = [C.pink, C.tanger, C.sun, C.turq, C.lilac];
  const sweep = E.out(clamp(seg(p, .04, .62), 0, 1));
  const cx0 = CX, cy0 = 1180;
  for (let i = 0; i < bands.length; i++) {
    const R = (300 + i * 54) * (.55 + .45 * sweep);
    const a0 = Math.PI * (1.06 + .02 * i) - .5 * sweep;
    const a1 = Math.PI * (1.94 - .02 * i) + .3 * sweep;
    o += `<path d="M${n2(cx0 + Math.cos(a0) * R)} ${n2(cy0 + Math.sin(a0) * R * .82)} `
      + `A${n2(R)} ${n2(R * .82)} 0 0 1 ${n2(cx0 + Math.cos(a1) * R)} ${n2(cy0 + Math.sin(a1) * R * .82)}" `
      + `fill="none" stroke="${bands[i]}" stroke-width="46" stroke-linecap="round" `
      + `opacity="${n2(.42 + .38 * sweep)}"/>`;
  }
  /* a star riding the top of the arc */
  const ay = cy0 - (300 + 4 * 54) * (.55 + .45 * sweep) * .82;
  o += star(CX, ay, 62, C.sun, t * 16, 5.5, C.tanger);
  o += confetti(t, 26, 505, [0, 0, W, H], [C.pink, C.sun, C.turq, C.lilac]);
  return o;
}

/* ------------------------------------------------------- 2. clap / chorus */
function artClap(S) {
  const { t, p, energy, beat } = S;
  let o = '';
  /* a burst on every detected beat — driven by the measured grid, not a timer */
  const near = 1 - Math.min(1, Math.abs(beat - 0));
  o += `<g transform="translate(${CX} ${620})" opacity="${n2(.30 + .5 * near)}">`;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const rr = 250 + 90 * near + Math.sin(t * 3 + i) * 20;
    o += star(Math.cos(a) * rr, Math.sin(a) * rr, 26 + 12 * near,
      i % 2 ? C.pink : C.sun, t * 40 + i, i * 2.1);
  }
  o += '</g>';
  /* clapping hands as two paper mittens meeting */
  const cl = Math.abs(Math.sin(beat * Math.PI));
  const gap = 30 + 130 * cl;
  o += `<g opacity=".9">`
    + mitten(CX - gap - 60, 1180, -18 - 14 * cl, C.blush)
    + mitten(CX + gap + 60, 1180, 18 + 14 * cl, C.blush)
    + '</g>';
  o += confetti(t, 30, 77, [0, 0, W, H], [C.pink, C.turq, C.sun, C.lilac]);
  return o;
}
function mitten(x, y, rot, col) {
  return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(rot)})">`
    + `<ellipse cx="0" cy="0" rx="62" ry="74" fill="${col}"/>`
    + `<ellipse cx="${-34}" cy="${-58}" rx="26" ry="30" fill="${col}"/>`
    + `<path d="M-52 30 q52 26 104 0" stroke="${rgba(C.ink, .18)}" stroke-width="5" fill="none"/>`
    + `</g>`;
}

/* ---------------------------------------------------- 3. candy / verse 1 */
function artCandy(S) {
  const { t, p } = S;
  let o = '';
  const rnd = rng(313);
  /* sweets and gems orbiting — «يا سكر يا حتة ماس» */
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + t * .34;
    const rr = 330 + Math.sin(t * 1.1 + i) * 46;
    const x = CX + Math.cos(a) * rr, y = 700 + Math.sin(a) * rr * .78;
    const s = 26 + rnd() * 22;
    const col = [C.pink, C.turq, C.sun, C.lilac, C.tanger][i % 5];
    if (i % 3 === 0) {
      o += `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(t * 40 + i)})">`
        + `<path d="M0 ${n2(-s)} L${n2(s * .74)} 0 L0 ${n2(s)} L${n2(-s * .74)} 0 Z" fill="${col}" stroke="${mixHex(col, C.ink, .3)}" stroke-width="3"/>`
        + `<path d="M0 ${n2(-s)} L0 ${n2(s)} M${n2(-s * .74)} 0 L${n2(s * .74)} 0" stroke="${rgba(C.paper, .6)}" stroke-width="2"/></g>`;
    } else {
      o += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(s * .78)}" fill="${col}" opacity=".92"/>`
        + `<circle cx="${n2(x - s * .26)}" cy="${n2(y - s * .30)}" r="${n2(s * .22)}" fill="#FFF" opacity=".5"/>`;
    }
  }
  o += confetti(t, 22, 12, [0, 0, W, H], [C.blush, C.sun, C.turq]);
  return o;
}

/* --------------------------------------------------- 4. school / verse 2 */
function artSchool(S) {
  const { t, p } = S;
  let o = '';
  /* «ألوان وكتاب وحروف» */
  o += openBook(CX, 1180, 520, C.paper, C.turq);
  const letters = ['ا', 'ل', 'و', 'ا', 'ن'];
  for (let i = 0; i < 5; i++) {
    const u = i / 5;
    const fly = clamp(seg(p, .10 + u * .07, .42 + u * .07), 0, 1);
    const x = lerp(CX - 460, CX - 200 + i * 100, E.out(fly));
    const y = lerp(1500, 1080, E.out(fly)) + Math.sin(t * 2 + i) * 8;
    o += `<text x="${n2(x)}" y="${n2(y)}" font-family="Cairo" font-weight="900" font-size="76" `
      + `fill="${[C.pink, C.sun, C.turq, C.lilac, C.tanger][i]}" text-anchor="middle" `
      + `opacity="${n2(fly)}">${letters[i]}</text>`;
  }
  /* crayons standing in a row */
  for (let i = 0; i < 5; i++) {
    const x = CX - 240 + i * 120;
    const wob = Math.sin(t * 2.4 + i * .8) * 6;
    o += crayon(x, 1560 + wob, 190, [C.pink, C.sun, C.turq, C.lilac, C.tanger][i], -78 + wob);
  }
  o += confetti(t, 20, 55, [0, 0, W, H], [C.sun, C.turq, C.blush]);
  return o;
}

/* --------------------------------------------------- 5. growing / bridge */
function artGrow(S) {
  const { t, p } = S;
  let o = '';
  /* «بكرا تكبر هالأميرة» — a ladder of stars she climbs, receding in depth */
  for (let i = 0; i < 7; i++) {
    const u = i / 6;
    const rise = clamp(seg(p, .06 + u * .05, .48 + u * .06), 0, 1);
    const y = lerp(1620, 380, E.out(rise)) + Math.sin(t * 1.6 + i) * 10;
    const x = CX - 330 + u * 660;
    const s = lerp(20, 54, u);
    o += star(x, y, s, i % 2 ? C.sun : C.lilac, t * 20 + i, i * 3.1);
    if (i > 0) {
      const x0 = CX - 330 + ((i - 1) / 6) * 660;
      const u0 = (i - 1) / 6;
      const y0 = lerp(1620, 380, E.out(clamp(seg(p, .06 + u0 * .05, .48 + u0 * .06), 0, 1)));
      o += `<line x1="${n2(x0)}" y1="${n2(y0)}" x2="${n2(x)}" y2="${n2(y)}" `
        + `stroke="${C.blush}" stroke-width="4" stroke-dasharray="2 14" opacity="${n2(.5 * rise)}" stroke-linecap="round"/>`;
    }
  }
  /* a crown for the princess, descending */
  const cr = E.out(clamp(seg(p, .58, .88), 0, 1));
  if (cr > .01) {
    const cy = lerp(-200, 300, cr);
    o += `<g transform="translate(${CX} ${n2(cy)}) rotate(${n2(Math.sin(t * 1.4) * 5)})">`
      + `<path d="M${-110} 60 L${-110} ${-40} L${-56} 6 L0 ${-72} L${56} 6 L${110} ${-40} L${110} 60 Z" `
      + `fill="${C.sun}" stroke="${C.tanger}" stroke-width="6" stroke-linejoin="round"/>`
      + `<circle cx="0" cy="${-92}" r="16" fill="${C.pinkHot}"/>`
      + `<circle cx="${-110}" cy="${-58}" r="13" fill="${C.turq}"/>`
      + `<circle cx="${110}" cy="${-58}" r="13" fill="${C.turq}"/>`
      + `</g>`;
  }
  o += confetti(t, 26, 88, [0, 0, W, H], [C.lilac, C.sun, C.blush, C.turq]);
  return o;
}

/* -------------------------------------------------- 6. celebrate / outro */
function artParty(S) {
  const { t, p } = S;
  let o = '';
  o += `<g transform="translate(${CX} 700)">`;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU + t * .5;
    const rr = 380 + Math.sin(t * 2 + i) * 60;
    o += star(Math.cos(a) * rr, Math.sin(a) * rr, 30 + (i % 4) * 9,
      [C.pink, C.sun, C.turq, C.lilac][i % 4], t * 30 + i, i * 1.3);
  }
  o += '</g>';
  for (let i = 0; i < 9; i++) {
    const x = 110 + (i % 5) * 215 + Math.sin(t * 1.3 + i) * 22;
    const y = 1420 + Math.sin(t * 1.7 + i * 1.4) * 30 - (i > 4 ? 90 : 0);
    o += balloon(x, y, 46, [C.pink, C.sun, C.turq, C.lilac, C.tanger][i % 5],
      Math.sin(t * 1.5 + i) * 8);
  }
  o += confetti(t, 60, 101, [0, 0, W, H], [C.pink, C.sun, C.turq, C.lilac, C.tanger, C.blush]);
  for (let i = 0; i < 8; i++) {
    o += sparkle(120 + (i * 137) % 840, 260 + (i * 211) % 1200,
      14 + 10 * Math.abs(Math.sin(t * 3 + i)), C.paper, .85);
  }
  return o;
}

/* ------------------------------------------------------------- 7. logo -- */
/* The mark is NOT moved as one picture. It is diced into tiles; every tile is
   a separate sheet that flies in along its own 3D arc and lands at a slightly
   different moment. Only when the last one seats does the light sweep cross.
   That is the difference between "a logo animating" and "a logo animating in
   layers", which is what was asked for. */
function artLogo(S) {
  const { t, p, logoTiles, logoBox } = S;
  let o = '<defs>' +
    `<linearGradient id="sweepg" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0"/>` +
    `<stop offset=".44" stop-color="#fff" stop-opacity=".95"/>` +
    `<stop offset=".54" stop-color="#fff" stop-opacity="1"/>` +
    `<stop offset=".64" stop-color="#fff" stop-opacity=".95"/>` +
    `<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<mask id="logomask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">` +
    `<image href="../assets/brand/wamd_logo.png" x="${logoBox.x}" y="${logoBox.y}" ` +
    `width="${logoBox.w}" height="${logoBox.h}" preserveAspectRatio="none"/></mask>` +
    glowDef('gLogoT', C.sun, 10) + '</defs>';

  const halo = seg(p, .06, .30) * (1 - seg(p, .90, 1) * .5);
  o += `<ellipse cx="${CX}" cy="${n2(logoBox.y + logoBox.h / 2)}" `
    + `rx="${n2(logoBox.w * 1.30)}" ry="${n2(logoBox.h * .78)}" fill="${C.sun}" opacity="${n2(.16 * halo)}"/>`;

  /* --- the tiles building the mark --- */
  /* Drawn for the WHOLE scene: once every tile has seated (u===1) it is the
     finished mark. Gating this on p < .52 made the logo vanish for the last
     half of the card, which is exactly the flat, absent ending to avoid. */
  if (logoTiles) {
    for (let i = 0; i < logoTiles.length; i++) {
      const T = logoTiles[i];
      /* stagger by distance from centre so it grows outward, not row by row */
      const d = Math.hypot(T.cx - 0.5, T.cy - 0.5);
      const start = .005 + d * .17;
      const u = ease(clamp(seg(p, start, start + .26), 0, 1));
      if (u <= .001) continue;
      /* each tile enters along its own 3D-looking arc and settles */
      const arc = (1 - u);
      const px = logoBox.x + (T.x + T.w / 2) * logoBox.w + (T.cx - .5) * 620 * arc;
      const py = logoBox.y + (T.y + T.h / 2) * logoBox.h + (T.cy - .5) * 520 * arc - 220 * arc * arc;
      const rot = (T.cx - .5) * 190 * arc;
      const sc = 0.35 + 0.65 * u;
      const op = u;
      o += `<g transform="translate(${n2(px)} ${n2(py)}) rotate(${n2(rot)}) scale(${n2(sc)})" opacity="${n2(op)}">`
        + `<image href="../assets/brand/wamd_logo.png" `
        + `x="${n2(-T.w * logoBox.w / 2)}" y="${n2(-T.h * logoBox.h / 2)}" `
        + `width="${n2(logoBox.w)}" height="${n2(logoBox.h)}" `
        + `clip-path="inset(${n2(T.y * 100)}% ${n2((1 - T.x - T.w) * 100)}% ${n2((1 - T.y - T.h) * 100)}% ${n2(T.x * 100)}%)" `
        + `preserveAspectRatio="none"/></g>`;
    }
  }

  /* --- the sweep: masked so it can only light the mark itself --- */
  const sw = seg(p, .52, .78);
  if (sw > 0 && sw < 1) {
    const cym = logoBox.y + logoBox.h / 2;
    const span = logoBox.w * 2.4;
    const x0 = CX - span / 2 + sw * span * 1.3 - span * .16;
    o += `<g mask="url(#logomask)"><rect x="${n2(x0)}" y="${n2(cym - logoBox.h * .8)}" `
      + `width="${n2(span * .22)}" height="${n2(logoBox.h * 1.6)}" fill="url(#sweepg)" `
      + `transform="rotate(-8 ${CX} ${n2(cym)})"/></g>`;
  }
  /* a warm bloom once the sweep has crossed */
  if (sw > .5) {
    const b = bump(p, .70, .09);
    o += `<g mask="url(#logomask)" filter="url(#gLogoT)">`
      + `<rect x="${logoBox.x}" y="${logoBox.y}" width="${logoBox.w}" height="${logoBox.h}" `
      + `fill="${C.sun}" fill-opacity="${n2(b * .70)}"/></g>`;
  }
  /* confetti, because this is a children's film and the mark should land happy */
  o += confetti(t, 26, 303, [0, 0, W, H], [C.pink, C.sun, C.turq, C.lilac, C.tanger]);
  return o;
}

function rgDef(id, stops, x1, y1, x2, y2) {
  const s = stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${s}</linearGradient>`;
}
function glowDef(id, col, dev) {
  return `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="${dev}" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

const ART = {
  open: artOpen, bloom: artBloom, clap: artClap, candy: artCandy,
  medal: artMedal, rainbow: artRainbow,
  school: artSchool, grow: artGrow, party: artParty, logo: artLogo,
};
