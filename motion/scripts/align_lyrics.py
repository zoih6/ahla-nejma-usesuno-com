"""
align_lyrics.py
===============
Word-level timing for كامل شجوني.

Why this exists instead of a plain Whisper pass
-----------------------------------------------
The text is already known: it is embedded in the MP3's `lyrics-eng` tag and
lives in lyrics.json. So this is an ALIGNMENT problem, not a transcription
problem. Whisper is only asked "when is this known word sung?", never "what is
being sung?".

Two practical problems it solves:

1. MEMORY. `medium` OOM-kills on this 2 GB box when one process loads the model
   and then walks the whole file. Fix: one short-lived child process per window,
   so the model's weights are freed by the OS after every window.

2. OVER-FILTERING. The default no-speech / log-prob gates threw away ~75% of
   this track (a Sanaani-dialect vocal over dense Khaliji instrumentation is
   exactly the case those defaults are tuned to reject). Fix: much looser gates,
   and the decision is handed to the anchor step instead, which knows the true
   word sequence and can reject junk on its own terms.

Usage:  python3 scripts/align_lyrics.py
        WIN=20 HOP=16 WHISPER_MODEL=medium python3 scripts/align_lyrics.py
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AN = os.path.join(ROOT, "analysis")
WAV = os.environ.get("WAV16", "/tmp/kam16k.wav")
MODEL = os.environ.get("WHISPER_MODEL", "medium")
WIN = float(os.environ.get("WIN", "20"))
HOP = float(os.environ.get("HOP", "16"))

LYR = json.load(open(os.path.join(ROOT, "lyrics.json"), encoding="utf-8"))
PROMPT = ". ".join(l["t"] for l in LYR["lines"]) + "."


def dur_of(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path])
    return float(out.split()[0])


# ---------------------------------------------------------------- worker mode
def worker(t0, t1):
    """Load the model, transcribe ONE window, print JSON on stdout, exit.

    faster_whisper has no clip_start/clip_end, so the window is cut out with
    ffmpeg first and the offset added back afterwards."""
    import tempfile
    from faster_whisper import WhisperModel
    chunk = tempfile.mktemp(suffix=".wav", dir="/tmp")
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-ss", str(t0), "-t", str(t1 - t0),
         "-i", WAV, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", chunk],
        check=True)
    m = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=2)
    try:
        segs, _ = m.transcribe(
            chunk,
        language="ar",
        initial_prompt=PROMPT,
        word_timestamps=True,
        beam_size=5,
        vad_filter=False,
        condition_on_previous_text=False,
        temperature=[0.0, 0.2, 0.4, 0.6],
        no_speech_threshold=0.95,      # was 0.9 -> far too eager to discard
        log_prob_threshold=-4.0,       # was -1.2 -> discarded whole phrases
        compression_ratio_threshold=2.8,
    )
    finally:
        try: os.unlink(chunk)
        except OSError: pass
    out = []
    for s in segs:
        words = []
        for w in (s.words or []):
            words.append({
                "w": w.word.strip(),
                "s": round(float(w.start) + t0, 3),
                "e": round(float(w.end) + t0, 3),
                "p": round(float(w.probability), 3),
            })
        if not words:
            continue
        out.append({
            "src": f"win{t0:06.1f}",
            "start": round(float(s.start) + t0, 3),
            "end": round(float(s.end) + t0, 3),
            "text": s.text.strip(),
            "avgLogprob": round(float(s.avg_logprob), 3),
            "noSpeechProb": round(float(s.no_speech_prob), 3),
            "words": words,
        })
    print("__JSON__" + json.dumps(out, ensure_ascii=False))


# ----------------------------------------------------------------- driver
def main():
    if len(sys.argv) == 3:                 # child: explicit window
        worker(float(sys.argv[1]), float(sys.argv[2]))
        return

    dur = dur_of(WAV)
    print(f"[align] dur={dur:.2f}s model={MODEL} win={WIN}s hop={HOP}s", flush=True)

    windows = []
    t = 0.0
    while t < dur:
        windows.append((round(t, 2), round(min(t + WIN, dur), 2)))
        t += HOP
        if t + 2 > dur and t < dur:
            break

    all_segs = []
    for i, (a, b) in enumerate(windows):
        r = subprocess.run(
            [sys.executable, os.path.abspath(__file__), str(a), str(b)],
            capture_output=True, text=True,
            env={**os.environ, "WAV16": WAV, "WHISPER_MODEL": MODEL},
        )
        got = [l for l in r.stdout.splitlines() if l.startswith("__JSON__")]
        if not got:
            print(f"  win {a:6.1f}->{b:6.1f}  FAILED rc={r.returncode} "
                  f"{r.stderr.strip().splitlines()[-1][:100] if r.stderr.strip() else ''}",
                  flush=True)
            continue
        segs = json.loads(got[0][8:])
        nw = sum(len(s["words"]) for s in segs)
        print(f"  win {a:6.1f}->{b:6.1f}  segs={len(segs):3d} words={nw:4d}", flush=True)
        all_segs.extend(segs)

    all_segs.sort(key=lambda s: s["start"])

    # merge: prefer the copy from the window whose centre is closest to the
    # segment, so overlapping windows do not double-count a phrase
    merged = []
    for s in all_segs:
        for w in s["words"]:
            merged.append({"w": w["w"], "s": w["s"], "e": w["e"], "p": w["p"],
                           "lp": s["avgLogprob"]})
    merged.sort(key=lambda w: w["s"])

    # collapse duplicates that the window overlap produced (same word, ~same time)
    final = []
    for w in merged:
        if final and abs(w["s"] - final[-1]["s"]) < 0.22 and \
           w["w"].strip(".,") == final[-1]["w"].strip(".,"):
            if w["p"] > final[-1]["p"]:
                final[-1] = w
            continue
        final.append(w)

    os.makedirs(AN, exist_ok=True)
    out = {"duration": round(dur, 3), "model": MODEL, "words": final}
    json.dump(out, open(os.path.join(AN, "words_raw.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"[align] {len(final)} word events -> analysis/words_raw.json", flush=True)
    print("[align] span:", f"{final[0]['s']:.2f} -> {final[-1]['e']:.2f}" if final else "none")


if __name__ == "__main__":
    main()
