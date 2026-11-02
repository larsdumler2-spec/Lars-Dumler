"""Ganze Sätze aus einem Voiceover herausschneiden (nach Wort-Indizes) und optional beschleunigen.

Nutzung: python3 saetze_schneiden.py <audio> <woerter.json> <audio-aus> <woerter-aus.json> <bereiche> [tempo]
<bereiche>: behaltene Wortbereiche, z. B. "0-19,42-52,53-70" (inklusive).
tempo > 1 beschleunigt (ffmpeg atempo, Tonhöhe bleibt). Jedes Wort behält sein Feld "i"
(Index im Original), damit Animationen weiter auf Originalwörter zeigen können.
"""
import json
import subprocess
import sys

import numpy as np

ein, w_ein, aus, w_aus, bereiche = sys.argv[1:6]
TEMPO = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
RATE = 44100
woerter = json.loads(open(w_ein).read())
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", ein, "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768
dauer = len(x) / RATE

teile, neu, pos = [], [], 0.0
blende = int(0.008 * RATE)
for b in bereiche.split(","):
    a, e = (int(v) for v in b.split("-"))
    t0 = max(0.0, woerter[a]["start"] - 0.04)
    t1 = woerter[e + 1]["start"] - 0.04 if e + 1 < len(woerter) else dauer
    stueck = x[int(t0 * RATE):int(t1 * RATE)].copy()
    rampe = np.linspace(0, 1, blende, dtype=np.float32)
    stueck[:blende] *= rampe
    stueck[-blende:] *= rampe[::-1]
    for i in range(a, e + 1):
        w = woerter[i]
        neu.append({"i": w.get("o", i), "text": w["text"], "start": round((pos + w["start"] - t0) / TEMPO, 3),
                    "end": round((pos + min(w["end"], t1) - t0) / TEMPO, 3)})
    teile.append(stueck)
    pos += len(stueck) / RATE
y = np.concatenate(teile)
roh = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
filt = (f"atempo={TEMPO}," if TEMPO != 1.0 else "") + "loudnorm=I=-14:TP=-1.5:LRA=9"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "-",
                "-af", filt, "-ar", str(RATE), "-b:a", "192k", aus], input=roh, check=True)
open(w_aus, "w").write(json.dumps(neu, ensure_ascii=False, indent=1))
print(f"{len(neu)} Wörter, {pos:.2f} s -> {pos / TEMPO:.2f} s (Tempo {TEMPO})")
