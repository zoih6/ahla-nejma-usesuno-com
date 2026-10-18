#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_scenes.py — the shot list.

Every scene carries its own camera rig as KEYFRAMES, not a single transform.
The renderer interpolates between them with an easing suited to the move, so a
dolly accelerates and settles instead of sliding at a constant rate.

Camera axes (all applied to #world, which carries the CSS perspective):
  x, y   pan            z   dolly (the only axis that produces true parallax)
  rx, ry rotate         rz  dutch roll
"""
import json

W, H = 1080, 1920
CX = W / 2

TL = 56.448          # song
LOGO = 7.0           # ومض end card
END = round(TL + LOGO, 3)

lines = json.load(open('analysis/lines.json', encoding='utf-8'))['lines']
beats = json.load(open('analysis/beats.json', encoding='utf-8'))


def L(i):
    """grab a line by index; the line window is the span of its own words"""
    d = lines[i]
    ws = d['words']
    return dict(text=d['src'],
                start=round(ws[0]['s'], 2), end=round(ws[-1]['e'], 2),
                words=ws)


def kwmark(text, kws, style='kw'):
    """wrap the gold keywords so the renderer can give them the paper-stack
       treatment instead of rendering the whole line flat"""
    words, out = text.split(' '), []
    for i, w in enumerate(words):
        core = w.strip('.,؛:!؟?')
        hit = next((k for k in kws if k in core or core in k), None)
        out.append({'t': w, 'k': bool(hit) and len(core) > 2, 'at': i * 0.26})
    return out


SCENES = []


def S(**k):
    SCENES.append(k)


# ============================================================ 1 · OPEN ====
# A paper curtain peels up off the frame and the full-body cut-out is
# standing there. The camera keeps dollying in through the whole scene so the
# reveal feels like a move, not a cut.
# --- 0.00 -> 2.90 is instrumental: the film opens on its own title ---------
S(id='title', art='bloom', start=0.0, end=2.92,
  girl=dict(which='wide', h=1150, x=CX, y=1700, inAt=.02, outAt=.965),
  planes=dict(sky=-1300, far=-760, mid=-300, girl=-40, near=260, fore=620),
  focusZ=-40, dof=4.2,
  camZ=[[0, -460], [.6, -120], [1, -10]],
  camRX=[[0, 6], [1, 0]], camRY=[[0, -6], [1, 3]],
  size=132, typeY=-560,
  lines=[dict(text='أَحْلَى نَجْمَة', size=132, start=.42, end=2.92, cls='name',
              words=[{'t': 'أَحْلَى', 'at': 0, 'k': False},
                     {'t': 'نَجْمَة', 'at': .30, 'k': True}]),
         dict(text='أُغْنِيَة إِيلَافْ', size=62, start=1.30, end=2.92, cls='small',
              words=[{'t': 'أُغْنِيَة', 'at': 0, 'k': False},
                     {'t': 'إِيلَافْ', 'at': .34, 'k': False}])])

l0 = L(0)
S(id='open', art='open', start=2.92, end=6.10,
  girl=dict(which='wide', h=1180, x=CX, y=1740, inAt=.02, outAt=.965),
  planes=dict(sky=-1300, far=-760, mid=-300, girl=-40, near=260, fore=620),
  focusZ=-40, dof=4.2,
  camZ=[[0, -420], [.55, -80], [1, 40]],
  camRX=[[0, 5.5], [1, 0]],
  camY=[[0, 120], [1, 0]],
  size=104, typeY=-540,
  lines=[dict(text=l0['text'], size=104, start=l0['start'], end=l0['end'],
              words=l0['words'], cls='name')])

# ======================================================= 2 · CHORUS 1a ====
# «أَحْلَى نَجْمَة.. بِالْأَوْصَافْ» — the signature line of the whole song, so
# it gets the biggest type in the film and a slow push.
l1 = L(1)
S(id='chorus1a', art='open', start=6.10, end=9.94,
  girl=dict(which='mid', h=980, x=CX + 20, y=1560, inAt=.02, outAt=.965),
  planes=dict(sky=-1250, far=-720, mid=-280, girl=0, near=300, fore=700),
  focusZ=0, dof=3.4,
  camZ=[[0, 60], [.6, 120], [1, 190]],
  camRX=[[0, -4], [1, 2]],
  camRY=[[0, -5], [1, 4]],
  size=112, typeY=-600,
  lines=[dict(text=l1['text'], size=112, start=l1['start'], end=l1['end'],
              words=l1['words'])])

# ======================================================= 3 · CHORUS 1b ====
# «الْمَرْكَزُ الْأَوَّل» — first place. The medal swings in and the frame
# dutches slightly, like a camera reacting to a win.
l2, l3 = L(2), L(3)
S(id='chorus1b', art='medal', start=9.40, end=12.90,
  girl=dict(which='close', h=880, x=CX, y=1500, inAt=.02, outAt=.965),
  planes=dict(sky=-1200, far=-680, mid=-260, girl=20, near=340, fore=760),
  focusZ=20, dof=3.0,
  camZ=[[0, 190], [.5, 240], [1, 300]],
  camRZ=[[0, -2.4], [.5, 1.6], [1, -0.6]],
  camRX=[[0, 2], [1, -1.5]],
  size=100, typeY=-620,
  lines=[dict(text=l2['text'], size=100, start=l2['start'], end=l2['end'], words=l2['words']),
         dict(text=l3['text'], size=86, start=l3['start'], end=l3['end'], words=l3['words'])])

# ========================================================= 4 · VERSE 1 ====
# «يَا سُكَّرْ يَا حِتَّةْ مَاسْ» — candy. The camera swings around the figure.
l4, l5 = L(4), L(5)
S(id='verse1a', art='candy', start=12.40, end=17.30,
  girl=dict(which='hero', h=1020, x=CX, y=1600, inAt=.02, outAt=.965),
  planes=dict(sky=-1300, far=-800, mid=-320, girl=0, near=280, fore=680),
  focusZ=0, dof=3.8,
  camRY=[[0, -13], [.55, 10], [1, -4]],
  camZ=[[0, 300], [.55, 40], [1, 150]],
  camRX=[[0, -3], [1, 3]],
  size=98, typeY=-560,
  lines=[dict(text=l4['text'], size=98, start=l4['start'], end=l4['end'], words=l4['words']),
         dict(text=l5['text'], size=98, start=l5['start'], end=l5['end'], words=l5['words'])])

# ========================================================= 5 · VERSE 1b ===
# «أَوَّل أَوَّل دَايْمًا أَوَّل» and «رَفَعْتِي يَا إِيلَافْ الرَّاسْ»
l6, l7 = L(6), L(7)
S(id='verse1b', art='clap', start=17.00, end=22.50,
  girl=dict(which='mid', h=940, x=CX - 30, y=1520, inAt=.02, outAt=.965),
  planes=dict(sky=-1200, far=-700, mid=-280, girl=0, near=320, fore=740),
  focusZ=0, dof=3.2,
  camZ=[[0, 330], [.5, 120], [1, 210]],
  camRY=[[0, 8], [.5, -6], [1, 2]],
  camRZ=[[0, 1.6], [1, -1.2]],
  size=96, typeY=-580,
  lines=[dict(text=l6['text'], size=96, start=l6['start'], end=l6['end'], words=l6['words']),
         dict(text=l7['text'], size=90, start=l7['start'], end=l7['end'], words=l7['words'])])

# ======================================================= 6 · CHORUS 2 ====
l8, l9 = L(8), L(9)
S(id='chorus2', art='rainbow', start=22.20, end=27.10,
  girl=dict(which='hero', h=1120, x=CX, y=1700, inAt=.02, outAt=.965),
  planes=dict(sky=-1350, far=-820, mid=-340, girl=-60, near=240, fore=640),
  focusZ=-60, dof=4.4,
  camZ=[[0, -300], [.6, -60], [1, 30]],
  camRX=[[0, 4], [1, -1]],
  camRY=[[0, 4], [1, -3]],
  size=110, typeY=-560,
  lines=[dict(text=l8['text'], size=110, start=l8['start'], end=l8['end'],
              words=l8['words'], cls='name'),
         dict(text=l9['text'], size=90, start=l9['start'], end=l9['end'], words=l9['words'])])

# ========================================================= 7 · VERSE 2 ====
# «أَلْوَانْ وَكِتَابْ وَحُرُوفْ» — the school section.
l10, l11 = L(10), L(11)
S(id='verse2a', art='school', start=26.90, end=31.70,
  girl=dict(which='close', h=860, x=CX, y=1360, inAt=.02, outAt=.965),
  planes=dict(sky=-1150, far=-660, mid=-240, girl=40, near=360, fore=800),
  focusZ=40, dof=2.8,
  camZ=[[0, 360], [.5, 200], [1, 280]],
  camRX=[[0, -5], [1, 2]],
  camRY=[[0, -6], [1, 5]],
  size=94, typeY=-730,
  lines=[dict(text=l10['text'], size=94, start=l10['start'], end=l10['end'], words=l10['words']),
         dict(text=l11['text'], size=94, start=l11['start'], end=l11['end'], words=l11['words'])])

# ======================================================== 8 · VERSE 2b ====
# «صَفِّقْ صَفِّقْ يَا شَاطِرْ» — clapping.
l12, l13 = L(12), L(13)
S(id='verse2b', art='clap', start=31.40, end=36.90,
  girl=dict(which='mid', h=960, x=CX + 30, y=1540, inAt=.02, outAt=.965),
  planes=dict(sky=-1200, far=-700, mid=-280, girl=0, near=320, fore=740),
  focusZ=0, dof=3.2,
  camZ=[[0, 260], [.5, 110], [1, 200]],
  camRZ=[[0, -1.8], [.5, 1.4], [1, -0.8]],
  camRY=[[0, -7], [1, 5]],
  size=96, typeY=-580,
  lines=[dict(text=l12['text'], size=96, start=l12['start'], end=l12['end'], words=l12['words']),
         dict(text=l13['text'], size=92, start=l13['start'], end=l13['end'], words=l13['words'])])

# ========================================================== 9 · BRIDGE ====
# «بُكْرَا تِكْبَرْ هَالْأَمِيرَةْ» — she grows. The camera cranes UP with her,
# which is the simplest way to make "growing" legible without cutting.
l14, l15 = L(14), L(15)
S(id='bridge', art='grow', start=36.60, end=41.80,
  girl=dict(which='hero', h=1000, x=CX, y=1560, inAt=.02, outAt=.965),
  planes=dict(sky=-1400, far=-860, mid=-360, girl=-80, near=220, fore=600),
  focusZ=-80, dof=4.6,
  camY=[[0, 180], [1, -120]],
  camZ=[[0, -260], [1, 60]],
  camRX=[[0, -6], [1, 3]],
  size=96, typeY=-610,
  lines=[dict(text=l14['text'], size=96, start=l14['start'], end=l14['end'], words=l14['words']),
         dict(text=l15['text'], size=96, start=l15['start'], end=l15['end'], words=l15['words'])])

# ======================================================== 10 · BRIDGE 2 ===
l16, l17 = L(16), L(17)
S(id='bridge2', art='grow', start=41.50, end=46.30,
  girl=dict(which='close', h=900, x=CX, y=1480, inAt=.02, outAt=.965),
  planes=dict(sky=-1250, far=-740, mid=-300, girl=0, near=300, fore=700),
  focusZ=0, dof=3.4,
  camY=[[0, -120], [1, 60]],
  camZ=[[0, 60], [1, 240]],
  camRY=[[0, 5], [1, -4]],
  size=92, typeY=-680,
  lines=[dict(text=l16['text'], size=92, start=l16['start'], end=l16['end'], words=l16['words']),
         dict(text=l17['text'], size=92, start=l17['start'], end=l17['end'], words=l17['words'])])

# ========================================================== 11 · OUTRO ====
l18 = L(18)
# The outro sings «مَبْرُووووكْ يَا إِيلَافْ» TWICE (46.0 -> 50.7 -> 54.4).
# lines.json only kept the second one, so the first is rebuilt from the raw
# word alignment — otherwise 4.7s of the song has nothing on screen.
OUTRO1 = [{'t': 'مَبْرُووووكْ', 's': 46.00, 'e': 48.08, 'k': True},
          {'t': 'يَا',         's': 48.08, 'e': 48.62, 'k': False},
          {'t': 'إِيلَافْ',     's': 48.62, 'e': 50.72, 'k': True}]
S(id='outro', art='party', start=46.00, end=TL + .02,
  girl=dict(which='hero', h=1080, x=CX, y=1660, inAt=.02, outAt=.965),
  planes=dict(sky=-1350, far=-800, mid=-320, girl=-40, near=260, fore=660),
  focusZ=-40, dof=4.0,
  camZ=[[0, -340], [.5, -40], [1, 20]],
  camRX=[[0, 4.5], [1, -1]],
  camRZ=[[0, 1.2], [1, -1.0]],
  size=104, typeY=-520,
  lines=[dict(text='مَبْرُووووكْ يَا إِيلَافْ', size=104,
              start=46.00, end=50.72, words=OUTRO1, cls='name'),
         dict(text=l18['text'], size=104, start=l18['start'], end=l18['end'],
              words=l18['words'], cls='name')])

# =========================================================== 12 · ومض ====
S(id='logo', art='logo', start=TL + .02, end=END, flashOff=True,
  girl=None,
  planes=dict(sky=-1200, far=-700, mid=-260, girl=0, near=280, fore=640),
  focusZ=0, dof=2.4,
  camZ=[[0, 260], [.7, 90], [1, 40]],
  camRX=[[0, -3], [1, 0]],
  size=76, typeY=390,   # clear of the mark: it occupies y 412..978
  lines=[dict(text='إِنْتَاجْ وَتَصْمِيمْ', size=62, start=TL + 3.1, end=END - .2,
              cls='small', words=[{'t': 'إِنْتَاجْ', 'at': 0, 'k': False},
                                  {'t': 'وَتَصْمِيمْ', 'at': .30, 'k': False}]),
         dict(text='اِسْتُودْيُو ومض', size=96, start=TL + 3.6, end=END - .2,
              words=[{'t': 'اِسْتُودْيُو', 'at': 0, 'k': False},
                     {'t': 'ومض', 'at': .34, 'k': False}])])

# ------------------------------------------------------------ plumbing ----
for i, s in enumerate(SCENES):
    s['__i'] = i
    s['start'] = round(s['start'], 3)
    s['end'] = round(s['end'], 3)
    # every scene needs a camera axis defined or the interpolator reads undef
    for ax in ('camX', 'camY', 'camZ', 'camRX', 'camRY', 'camRZ'):
        s.setdefault(ax, [[0, 0]])

print(f'[scenes] {len(SCENES)} shots, {END:.2f}s')
for s in SCENES:
    print(f"  {s['start']:6.2f} -> {s['end']:6.2f}  {s['id']:<10s} "
          f"art={s['art']:<7s} girl={s['girl']['which'] if s['girl'] else '--':<6s} "
          f"camZ={s['camZ'][0][1]:+.0f}->{s['camZ'][-1][1]:+.0f}")

json.dump({'fps': 25, 'w': W, 'h': H, 'duration': END, 'song': TL,
           'beats': beats['beatTimes'], 'scenes': SCENES},
          open('timeline.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('[scenes] -> timeline.json')
