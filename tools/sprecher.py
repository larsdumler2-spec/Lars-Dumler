"""Deutsche Männerstimme (Piper „Thorsten“, CC0).

Einrichten (einmalig):
  python -m venv tts && tts/bin/pip install piper-tts
  curl -L -o t.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-de_DE-thorsten-high.tar.bz2
  tar -xjf t.tar.bz2

Nutzung: tts/bin/python sprecher.py <modell.onnx> <zeilen.json> <ausgabe-ordner> [tempo]
zeilen.json: [{"id": "l01", "text": "..."}]  ->  <id>.wav + dauern.json
tempo = length_scale; < 1 spricht schneller.
"""
import json
import sys
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

modell, zeilen, aus = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
tempo = float(sys.argv[4]) if len(sys.argv) > 4 else 0.9
aus.mkdir(parents=True, exist_ok=True)

stimme = PiperVoice.load(str(modell))
cfg = SynthesisConfig(length_scale=tempo)

dauern = {}
for z in json.loads(zeilen.read_text()):
    pfad = aus / f"{z['id']}.wav"
    with wave.open(str(pfad), "wb") as wf:
        stimme.synthesize_wav(z["text"], wf, syn_config=cfg)
    with wave.open(str(pfad), "rb") as wf:
        dauern[z["id"]] = round(wf.getnframes() / wf.getframerate(), 3)
    print(z["id"], dauern[z["id"]])
(aus / "dauern.json").write_text(json.dumps(dauern, indent=2))
