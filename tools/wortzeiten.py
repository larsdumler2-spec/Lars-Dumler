"""Wortzeiten aus einer Sprachaufnahme (lokal, Parakeet v3 über sherpa-onnx).

Modell (GitHub-Release, ~490 MB):
  curl -L -o p.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2

Nutzung: python wortzeiten.py <modell-ordner> <audio> <ausgabe.json>
Ausgabe: [{"text": "Wort", "start": s, "end": s}, ...]
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import sherpa_onnx

modell, audio, aus = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])

rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=str(modell / "encoder.int8.onnx"),
    decoder=str(modell / "decoder.int8.onnx"),
    joiner=str(modell / "joiner.int8.onnx"),
    tokens=str(modell / "tokens.txt"),
    model_type="nemo_transducer",
    num_threads=4,
)
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768
dauer = len(x) / 16000

# In 25-s-Stücken erkennen (das Modell mag keine sehr langen Eingaben); Schnitte in leisen Stellen.
woerter, pos = [], 0
while pos < len(x):
    ende = min(len(x), pos + 25 * 16000)
    if ende < len(x):
        fenster = x[ende - 3 * 16000:ende]
        rms = np.convolve(fenster ** 2, np.ones(1600) / 1600, mode="same")
        ende = ende - 3 * 16000 + int(np.argmin(rms))
    s = rec.create_stream()
    s.accept_waveform(16000, x[pos:ende])
    rec.decode_stream(s)
    r = s.result
    akt = None
    for tok, t in zip(r.tokens, r.timestamps):
        t = pos / 16000 + t
        if tok.startswith(" ") or akt is None:
            akt = {"text": tok.strip(), "start": round(t, 3)}
            woerter.append(akt)
        else:
            akt["text"] += tok
    pos = ende
for i, w in enumerate(woerter):
    w["end"] = round(woerter[i + 1]["start"] if i + 1 < len(woerter) else dauer, 3)
woerter = [w for w in woerter if w["text"]]
aus.write_text(json.dumps(woerter, ensure_ascii=False, indent=1))
print(len(woerter), "Wörter,", round(dauer, 2), "s")
print(" ".join(w["text"] for w in woerter))
