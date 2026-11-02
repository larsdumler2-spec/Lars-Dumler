"""Sprechpausen in einem Voiceover kürzen und die Wortzeiten mitverschieben.

Nutzung: python3 pausen_kuerzen.py <audio-ein> <woerter-ein.json> <audio-aus.mp3> <woerter-aus.json> [rest_s] [min_s]
Jede leise Stelle (unter -40 dBFS) länger als min_s (Standard 0.12 s) wird auf rest_s
(Standard 0.08 s) gekürzt; an den Schnitten wird 6 ms weich überblendet.
"""
import json
import subprocess
import sys

import numpy as np

ein, w_ein, aus, w_aus = sys.argv[1:5]
REST = float(sys.argv[5]) if len(sys.argv) > 5 else 0.08
MIN = float(sys.argv[6]) if len(sys.argv) > 6 else 0.12
RATE = 44100

pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", ein, "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768

# Leise Abschnitte in 10-ms-Fenstern finden
fenster = RATE // 100
n = len(x) // fenster
rms = np.sqrt(np.mean(x[: n * fenster].reshape(n, fenster) ** 2, axis=1))
leise = 20 * np.log10(rms + 1e-9) < -40
pausen, i = [], 0
while i < n:
    if leise[i]:
        j = i
        while j < n and leise[j]:
            j += 1
        a, b = i * 0.01, j * 0.01
        if b - a >= MIN and a > 0.05 and j < n:      # Anfang und Ende der Datei nicht anfassen
            pausen.append((a, b))
        i = j
    else:
        i += 1

# Schneiden: aus jeder Pause bleibt REST (Hälfte vorn, Hälfte hinten), weich überblendet
teile, schnitte, pos = [], [], 0
blende = int(0.006 * RATE)
for a, b in pausen:
    weg_a, weg_b = a + REST / 2, b - REST / 2
    teile.append(x[int(pos * RATE):int(weg_a * RATE)])
    schnitte.append((weg_a, weg_b - weg_a))
    pos = weg_b
teile.append(x[int(pos * RATE):])
y = teile[0]
for t in teile[1:]:
    if len(y) > blende and len(t) > blende:
        rampe = np.linspace(0, 1, blende, dtype=np.float32)
        mitte = y[-blende:] * (1 - rampe) + t[:blende] * rampe
        y = np.concatenate([y[:-blende], mitte, t[blende:]])
    else:
        y = np.concatenate([y, t])


def neu(t):
    """Alte Zeit -> neue Zeit nach den Schnitten."""
    verschoben = 0.0
    for s, laenge in schnitte:
        if t >= s + laenge:
            verschoben += laenge
        elif t > s:
            verschoben += t - s
    return round(t - verschoben, 3)


woerter = json.loads(open(w_ein).read())
for w in woerter:
    w["start"], w["end"] = neu(w["start"]), neu(w["end"])
open(w_aus, "w").write(json.dumps(woerter, ensure_ascii=False, indent=1))

roh = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "-",
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", str(RATE), "-b:a", "192k", aus], input=roh, check=True)
gespart = sum(l for _, l in schnitte)
print(f"{len(pausen)} Pausen gekürzt, {gespart:.2f} s gespart: {len(x) / RATE:.2f} s -> {len(y) / RATE:.2f} s")
