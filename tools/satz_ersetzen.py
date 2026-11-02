"""Einen Satzbereich eines Voiceovers durch eine Neuaufnahme ersetzen.

Nutzung: python3 satz_ersetzen.py <haupt.mp3> <haupt.json> <neu.mp3> <neu.json> <haupt-von-bis> <neu-von-bis> <zuordnung> <aus.mp3> <aus.json>
<zuordnung>: für jedes Wort der Neuaufnahme der Original-Index ("o") oder "-", kommagetrennt.
Wörter der Hauptaufnahme behalten/erhalten "o" (ihr Original-Index). Mehrfach anwendbar.
"""
import json
import subprocess
import sys

import numpy as np

(h_a, h_w, n_a, n_w, h_ber, n_ber, zuordnung, aus_a, aus_w) = sys.argv[1:10]
RATE = 44100


def laden(p):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768


hx, nx = laden(h_a), laden(n_a)
hw, nw = json.loads(open(h_w).read()), json.loads(open(n_w).read())
for i, w in enumerate(hw):
    w.setdefault("o", i)
ha, hb = (int(v) for v in h_ber.split("-"))
na, nb = (int(v) for v in n_ber.split("-"))
zu = [None if z == "-" else int(z) for z in zuordnung.split(",")]
assert len(zu) == nb - na + 1, "Zuordnung passt nicht zur Wortzahl"


def schnitt(woerter, x, a, b):
    t0 = max(0.0, woerter[a]["start"] - 0.04)
    t1 = woerter[b + 1]["start"] - 0.04 if b + 1 < len(woerter) else len(x) / RATE
    return t0, t1


blende = int(0.008 * RATE)
rampe = np.linspace(0, 1, blende, dtype=np.float32)
h0, h1 = schnitt(hw, hx, ha, hb)
n0, n1 = schnitt(nw, nx, na, nb)
mitte = nx[int(n0 * RATE):int(n1 * RATE)].copy()
mitte[:blende] *= rampe
mitte[-blende:] *= rampe[::-1]
vorn, hinten = hx[:int(h0 * RATE)].copy(), hx[int(h1 * RATE):].copy()
if len(vorn) > blende:
    vorn[-blende:] *= rampe[::-1]
if len(hinten) > blende:
    hinten[:blende] *= rampe
y = np.concatenate([vorn, mitte, hinten])

delta = (n1 - n0) - (h1 - h0)
neu = [w for w in hw[:ha]]
for k, i in enumerate(range(na, nb + 1)):
    w = nw[i]
    neu.append({"o": zu[k], "text": w["text"], "start": round(h0 + w["start"] - n0, 3), "end": round(h0 + min(w["end"], n1) - n0, 3)})
for w in hw[hb + 1:]:
    neu.append({**w, "start": round(w["start"] + delta, 3), "end": round(w["end"] + delta, 3)})

roh = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "-",
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", str(RATE), "-b:a", "192k", aus_a], input=roh, check=True)
open(aus_w, "w").write(json.dumps(neu, ensure_ascii=False, indent=1))
print(f"Wörter {ha}-{hb} ersetzt durch {nb - na + 1} neue; Länge {len(hx) / RATE:.2f} s -> {len(y) / RATE:.2f} s")
