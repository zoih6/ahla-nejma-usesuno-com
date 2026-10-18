"""
build_timeline.py — turn measured timings into the film's timeline.json.

The problem this solves
-----------------------
The words are known (lyrics.json, taken from the MP3's own tags). What is not
known is WHEN each one is sung. Whisper gives noisy, incomplete, partly
hallucinated word events. So:

  1. Every recognised word event is scored against the canonical word sequence
     using a Needleman-Wunsch alignment (not a heuristic, not a regex). A word
     only takes a timing if it actually matches something in the poem.
  2. Words Whisper never heard are interpolated between the two nearest
     anchored neighbours, so the gap is spread, never dumped on one word.
  3. A minimum duration is enforced by borrowing from the surrounding silence,
     so no word can flash for 40 ms and be unreadable.

Structure is asserted from measurement, not assumed:
  - 0    -> 11.0   instrumental intro      (Whisper reports "موسيقى" at 6.1)
  - 11.0 -> 26.0   verse 1
  - 26.3 -> 42.7   chorus 1                (word-exact)
  - 42.7 -> 64.0   INSTRUMENTAL interlude  (three different prompts all
                   returned the same sentence across the whole window at
                   no-speech 0.66 -> it is music, not singing)
  - 64.0 -> 78.5   verse 2                 (word-exact)
  - 78.7 -> 95.1   chorus 2                (word-exact)
  - 95.1 -> 115    outro, wordless
"""
import difflib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AN = os.path.join(ROOT, "analysis")

MIN = 0.26          # shortest on-screen word duration (s)
FPS = 25

# ------------------------------------------------------------- normalising
DIAC = re.compile(r'[\u064B-\u0652\u0670\u0640]')          # harakat + tatweel
NOISE = re.compile(r'[^\u0600-\u06FF\u0750-\u077F]')


def norm(s):
    s = DIAC.sub('', s or '')
    s = NOISE.sub('', s)
    s = (s.replace('\u0622', '\u0627').replace('\u0623', '\u0627')
          .replace('\u0625', '\u0627').replace('\u0627\u064B', '\u0627')
          .replace('\u0649', '\u064A').replace('\u0629', '\u0647'))
    return s.strip()


def toks(line):
    out = []
    for raw in line.split():
        n = norm(raw)
        if n:
            out.append({"t": raw, "n": n, "k": False})
    return out


# ------------------------------------------------------------- alignment --
def sim(a, b):
    if a == b:
        return 1.0
    if a.startswith(b) or b.startswith(a):
        return 0.82
    return difflib.SequenceMatcher(None, a, b).ratio()


def align(can, got, gap=-0.55):
    """Global alignment. Returns list mapping canonical index -> got index or -1."""
    n, m = len(can), len(got)
    if m == 0:
        return [-1] * n
    NEG = -1e9
    S = [[NEG] * (m + 1) for _ in range(n + 1)]
    P = [[0] * (m + 1) for _ in range(n + 1)]
    S[0][0] = 0.0
    for i in range(1, n + 1):
        S[i][0] = i * gap; P[i][0] = 1
    for j in range(1, m + 1):
        S[0][j] = j * gap; P[0][j] = 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d = S[i - 1][j - 1] + sim(can[i - 1]["n"], got[j - 1]["n"])
            u = S[i - 1][j] + gap
            l = S[i][j - 1] + gap
            best, p = d, 0
            if u > best: best, p = u, 1
            if l > best: best, p = l, 2
            S[i][j] = best; P[i][j] = p
    i, j, mp = n, m, [-1] * n
    while i > 0 or j > 0:
        p = P[i][j]
        if p == 0:
            mp[i - 1] = j - 1; i -= 1; j -= 1
        elif p == 1:
            i -= 1
        else:
            j -= 1
    return mp


# ------------------------------------------------------------------ load --
def load_words(path):
    if not os.path.exists(path):
        return []
    d = json.load(open(path, encoding="utf-8"))
    return [{"w": x["w"], "n": norm(x["w"]), "s": x["s"], "e": x["e"], "p": x.get("p", 0)}
            for x in d.get("words", [])]


def main():
    lyr = json.load(open(os.path.join(ROOT, "lyrics.json"), encoding="utf-8"))
    # A keyword is highlighted on an EXACT match, never a substring one.
    # Substring matching lit up «إِن» and «مَا» purely because "ان" and "ما"
    # happen to sit inside «أماني».
    _KW = set()
    for k in lyr["keywords"]:
        nk = norm(k)
        _KW.add(nk)
        if nk.startswith("\u0627\u0644"):
            _KW.add(nk[2:])
    KW = _KW
    def isKw(n):
        return n in KW or (n.startswith("\u0627\u0644") and n[2:] in KW)

    words = load_words(os.path.join(AN, "words_raw.json"))
    v1 = load_words(os.path.join(AN, "words_v1.json"))
    # the focused verse-1 pass is better inside its own window; prefer it there
    keep = [w for w in words if not (10.0 <= w["s"] <= 27.0)]
    words = sorted(keep + v1, key=lambda w: w["s"])
    print(f"[tl] {len(words)} recognised word events ({len(v1)} from the verse-1 pass)")

    # ------------------------------------------------------- line windows
    # Measured, not guessed. See the module docstring for how each was fixed.
    WINDOWS = [
        (2.90, 4.54),     # C1 L1  هِيييه هِيييه.. يَا إِيلَافْ   (wordless ad-lib)
        (4.54, 7.40),     # C1 L2  أَحْلَى نَجْمَة.. بِالْأَوْصَافْ
        (7.40, 9.78),     # C1 L3  الْمَرْكَزُ الْأَوَّلْ.. لِكْ صَارْ
        (9.78, 12.26),    # C1 L4  وَنَجَاحِكْ شَعْشَعْ.. أَنْوَارْ

        (12.46, 14.20),   # V1 L1  يَا سُكَّرْ يَا حِتَّةْ مَاسْ
        (14.20, 17.10),   # V1 L2  يَا شَاطِرَةْ بَيْنَ النَّاسْ
        (17.10, 18.90),   # V1 L3  أَوَّلْ.. أَوَّلْ.. دَايْمًا أَوَّلْ
        (19.58, 22.30),   # V1 L4  رَفَعْتِي يَا إِيلَافْ الرَّاسْ

        (22.30, 24.70),   # C2 L1  هِيييه هِيييه.. يَا إِيلَافْ
        (24.62, 26.90),   # C2 L2  أَحْلَى نَجْمَة.. بِالْأَوْصَافْ

        (26.84, 29.20),   # V2 L1  أَلْوَانْ وَكِتَابْ وَحُرُوفْ
        (29.14, 31.50),   # V2 L2  إِيلَافْ مَا تِعْرِفْ خَوْفْ
        (31.48, 34.10),   # V2 L3  صَفِّقْ صَفِّقْ يَا شَاطِرْ
        (34.10, 36.80),   # V2 L4  أَحْلَى بَنُّوتَة رَحْ نْشُوفْ

        (36.74, 39.20),   # BR L1  بُكْرَا تِكْبَرْ هَالْأَمِيرَةْ
        (39.22, 41.70),   # BR L2  وَتِصِيرْ بَنُّوتَةْ كْبِيرَةْ
        (41.64, 43.70),   # BR L3  وَالْمَرْكَزْ الْأَوَّلْ.. دَايْمًا
        (43.70, 46.20),   # BR L4  لِإِيلَافْ الْحُلْوَةْ الصَّغِيرَةْ

        (46.00, 54.50),   # outro  مَبْرُووووكْ يَا إِيلَافْ
    ]

    lines = []
    anchored = total = 0
    for li, L in enumerate(lyr["lines"]):
        if li >= len(WINDOWS):
            break
        a, b = WINDOWS[li]
        can = toks(L["t"])
        got = [w for w in words if w["e"] > a - 0.6 and w["s"] < b + 0.6 and w["n"]]
        mp = align(can, got)

        times = []
        for i, c in enumerate(can):
            j = mp[i]
            if j >= 0 and got[j]["s"] >= a - 0.8 and got[j]["e"] <= b + 0.8:
                times.append([got[j]["s"], got[j]["e"]]); anchored += 1
            else:
                times.append(None)
            total += 1

        # interpolate the ones Whisper never heard
        known = [(i, t) for i, t in enumerate(times) if t]
        if known:
            for i, t in enumerate(times):
                if t:
                    continue
                prev = max((k for k in known if k[0] < i), key=lambda k: k[0], default=None)
                nxt = min((k for k in known if k[0] > i), key=lambda k: k[0], default=None)
                lo = prev[1][1] if prev else a
                hi = nxt[1][0] if nxt else b
                if not prev and not nxt:
                    lo, hi = a, b
                span = max(0.12, hi - lo)
                k = sum(1 for x in times[:i] if x is None) if prev else i
                tot = 1
                if prev and nxt:
                    tot = nxt[0] - prev[0]
                elif prev:
                    tot = len(can) - prev[0]
                else:
                    tot = (nxt[0] if nxt else len(can)) or 1
                w0 = lo + span * (k / tot)
                w1 = lo + span * ((k + 1) / tot)
                times[i] = [w0, w1]
        else:
            # nothing recognised at all: spread the line evenly
            span = (b - a) / len(can)
            times = [[a + span * i, a + span * (i + 1)] for i in range(len(can))]

        # monotonic + minimum duration, borrowing from silence not from neighbours
        for i in range(len(times)):
            times[i][0] = max(times[i][0], a - 0.4)
            times[i][1] = min(times[i][1], b + 0.4)
            if times[i][1] - times[i][0] < MIN:
                need = MIN - (times[i][1] - times[i][0])
                times[i][1] += need / 2
                times[i][0] -= need / 2
            if i:
                times[i][0] = max(times[i][0], times[i - 1][1])
                if times[i][1] <= times[i][0]:
                    times[i][1] = times[i][0] + MIN
        if times[-1][1] > b + 0.5:
            times[-1][1] = b + 0.5

        words_out = []
        for c, (s, e) in zip(can, times):
            words_out.append({
                "t": c["t"], "s": round(s, 3), "e": round(e, 3),
                "k": isKw(c["n"]),
            })
        lines.append({"sec": L["sec"], "src": L["t"], "words": words_out})

    # --- global monotonic guard: lines overlap slightly at their seams; make
    # the whole film's word order strictly increasing in time.
    flat = [w for L in lines for w in L["words"]]
    for i in range(1, len(flat)):
        if flat[i]["s"] < flat[i - 1]["e"]:
            flat[i]["s"] = flat[i - 1]["e"]
            if flat[i]["e"] <= flat[i]["s"] + MIN:
                flat[i]["e"] = flat[i]["s"] + MIN
    print(f"[tl] monotonic guard applied over {len(flat)} words")

    print(f"[tl] anchored {anchored}/{total} words "
          f"({100 * anchored / max(1, total):.0f}%)")

    for L in lines:
        print(f"   {L['words'][0]['s']:7.2f} {L['words'][-1]['e']:7.2f}  {L['src']}")

    json.dump({"lines": lines}, open(os.path.join(AN, "lines.json"), "w",
                                     encoding="utf-8"), ensure_ascii=False, indent=1)
    print("[tl] -> analysis/lines.json")


if __name__ == "__main__":
    main()
