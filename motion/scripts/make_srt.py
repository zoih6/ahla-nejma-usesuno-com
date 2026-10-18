"""make_srt.py — lyrics.srt from the measured word timings."""
import json, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines=json.load(open(os.path.join(ROOT,'analysis/lines.json'),encoding='utf-8'))['lines']
def ts(s):
    h=int(s//3600); m=int(s%3600//60); sec=s%60
    return f"{h:02d}:{m:02d}:{int(sec):02d},{int(round((sec-int(sec))*1000)):03d}"
out=[]
for i,L in enumerate(lines):
    w=L['words']
    out.append(f"{i+1}\n{ts(w[0]['s'])} --> {ts(w[-1]['e'])}\n{L['src']}\n")
p=os.path.join(ROOT,'lyrics.srt')
open(p,'w',encoding='utf-8').write('\n'.join(out))
print(f"[srt] {len(lines)} cues -> {p}")
