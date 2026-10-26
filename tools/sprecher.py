"""Deutsche Männerstimme (Piper „Thorsten“, CC0).

Einrichten (einmalig):
  python -m venv tts && tts/bin/pip install piper-tts
  curl -L -o t.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-de_DE-thorsten-high.tar.bz2
  tar -xjf t.tar.bz2

Nutzung: tts/bin/python sprecher.py <modell.onnx> <zeilen.json> <ausgabe-ordner> [tempo]
zeilen.json: [{"id": "l01", "text": "..."}]  ->  <id>.wav + dauern.json + woerter.json
woerter.json: geschätzte Wortzeiten je Zeile (Sprechpausen im Audio + Phonemanzahl),
gut genug für Untertitel; Hugging Face (Whisper-Modelle) ist hier gesperrt.
tempo = length_scale; < 1 spricht schneller.
"""
import json
import re
import sys
import wave
from pathlib import Path

import numpy as np

from piper import PiperVoice, SynthesisConfig

modell, zeilen, aus = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
tempo = float(sys.argv[4]) if len(sys.argv) > 4 else 0.9
aus.mkdir(parents=True, exist_ok=True)

stimme = PiperVoice.load(str(modell))
cfg = SynthesisConfig(length_scale=tempo)



def sprechabschnitte(pfad, schwelle=0.03, min_pause=0.12):
    """Zeitbereiche mit Sprache (Pausen >= min_pause trennen)."""
    with wave.open(str(pfad), "rb") as wf:
        rate = wf.getframerate()
        x = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    fenster = int(rate * 0.01)
    rms = np.array([np.sqrt(np.mean(x[i:i + fenster] ** 2)) for i in range(0, len(x) - fenster, fenster)])
    an = rms > schwelle * rms.max()
    teile, start, still = [], None, 0
    for i, a in enumerate(an):
        if a:
            if start is None:
                start = i
            still = 0
        elif start is not None:
            still += 1
            if still * 0.01 >= min_pause:
                teile.append([start * 0.01, (i - still + 1) * 0.01])
                start, still = None, 0
    if start is not None:
        teile.append([start * 0.01, len(an) * 0.01])
    return teile


def gewicht(wort):
    ph = "".join("".join(s) for s in stimme.phonemize(wort))
    return max(1, len(re.sub("[ˈˌː ]", "", ph)))


def wortzeiten(text, pfad):
    woerter = text.split()
    phrasen, akt = [], []
    for w in woerter:
        akt.append(w)
        if re.search(r"[.,?!:;]$", w) or w in ("–", "-"):
            phrasen.append(akt)
            akt = []
    if akt:
        phrasen.append(akt)
    teile = sprechabschnitte(pfad)
    if len(teile) != len(phrasen):
        # Fallback: alles über den gesamten Sprechbereich verteilen
        teile, phrasen = [[teile[0][0], teile[-1][1]]], [woerter]
    out = []
    for (a, b), ph in zip(teile, phrasen):
        g = [gewicht(w) for w in ph]
        t = a
        for w, gi in zip(ph, g):
            d = (b - a) * gi / sum(g)
            out.append({"text": w, "start": round(t, 3), "end": round(t + d, 3)})
            t += d
    return out


dauern, alle_woerter = {}, {}
for z in json.loads(zeilen.read_text()):
    pfad = aus / f"{z['id']}.wav"
    with wave.open(str(pfad), "wb") as wf:
        stimme.synthesize_wav(z["text"], wf, syn_config=cfg)
    with wave.open(str(pfad), "rb") as wf:
        dauern[z["id"]] = round(wf.getnframes() / wf.getframerate(), 3)
    alle_woerter[z["id"]] = wortzeiten(z["text"], pfad)
    print(z["id"], dauern[z["id"]])
(aus / "dauern.json").write_text(json.dumps(dauern, indent=2))
(aus / "woerter.json").write_text(json.dumps(alle_woerter, indent=1, ensure_ascii=False))
