"""Generate the ElevenLabs voiceover (deep male voice) for the Roman Empire video and sync it.

Reads ELEVENLABS_API_KEY from the environment. For each narration line in
rom/assets/data.js it requests speech from ElevenLabs, measures the clip, retimes
the lines (captions and camera moves follow automatically), writes one combined
rom/assets/voice.mp3 and adds an <audio> clip to rom/index.html.

Usage: python3 hyperframes/tools/elevenlabs_voice.py --samples        # Hörproben
       python3 hyperframes/tools/elevenlabs_voice.py [--voice brian|daniel|adam|NAME] [--voice-id ID]
"""
import argparse, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rom")
API = "https://api.elevenlabs.io"
GAP, LEAD, TAIL = 0.35, 0.4, 1.6


def req(path, body=None, key=None):
    r = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                               headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=120) as resp:
        return resp.read()


# Deep male ElevenLabs premade voices that work well in German via eleven_multilingual_v2
DEEP_MALE = {
    "brian": "nPczCjzI2devNBz1zQrb",   # deep, resonant narrator
    "daniel": "onwK4e9ZLuTAKqWW03F9",  # deep, authoritative news voice
    "adam": "pNInz6obpgDQGcFmaJgB",    # deep, documentary style
}
SAMPLE = "Was wäre, wenn das Römische Reich heute noch existieren würde?"


def find_voice(key, name):
    if name.lower() in DEEP_MALE:
        return DEEP_MALE[name.lower()], name
    voices = json.loads(req("/v1/voices", key=key))["voices"]
    mine = [v for v in voices if v["name"].lower().startswith(name.lower())]
    if mine:
        return mine[0]["voice_id"], mine[0]["name"]
    shared = json.loads(req(f"/v1/shared-voices?search={urllib.parse.quote(name)}&gender=male&page_size=20", key=key))["voices"]
    if not shared:
        sys.exit(f"Keine Stimme '{name}' gefunden – bitte --voice-id angeben.")
    return shared[0]["voice_id"], shared[0]["name"]


def tts(key, vid, text, model, out):
    audio = req(f"/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
                {"text": text, "model_id": model, "language_code": "de",
                 "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.3}}, key)
    open(out, "wb").write(audio)


def samples(key, model):
    """Write one short German sample per deep male candidate (premade + German library voices)."""
    cands = list(DEEP_MALE.items())
    try:
        lib = json.loads(req("/v1/shared-voices?gender=male&language=de&use_cases=narrative_story&page_size=5", key=key))["voices"]
        cands += [(v["name"], v["voice_id"]) for v in lib]
    except Exception as e:  # library search is optional
        print("Voice-Library-Suche fehlgeschlagen:", e)
    out = os.path.join(ROOT, "..", "voice_samples"); os.makedirs(out, exist_ok=True)
    for nm, vid in cands:
        f = os.path.join(out, re.sub(r"\W+", "_", nm.lower()) + ".mp3")
        tts(key, vid, SAMPLE, model, f)
        print(f"{nm:30s} {vid}  ->  {f}")


def duration(f):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="brian", help="brian | daniel | adam | Name aus deinem Konto/der Library")
    ap.add_argument("--voice-id")
    ap.add_argument("--samples", action="store_true", help="nur Hörproben erzeugen")
    ap.add_argument("--model", default="eleven_multilingual_v2")
    a = ap.parse_args()
    key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("ELEVENLABS_API_KEY fehlt.")
    if a.samples:
        return samples(key, a.model)
    vid, name = (a.voice_id, a.voice_id) if a.voice_id else find_voice(key, a.voice)
    print("Stimme:", name, vid)

    data_path = os.path.join(ROOT, "assets", "data.js")
    src = open(data_path, encoding="utf-8").read()
    data = json.loads(src[src.index("=") + 1:].rstrip().rstrip(";"))

    tmp = tempfile.mkdtemp()
    t, parts = LEAD, []
    for i, ln in enumerate(data["lines"]):
        f = os.path.join(tmp, f"l{i:02d}.mp3")
        tts(key, vid, ln["text"], a.model, f)
        d = duration(f)
        ln["t0"], ln["t1"] = round(t, 3), round(t + d, 3)
        parts.append((f, t))
        print(f"{i:2d} {d:5.2f}s  {ln['text'][:60]}")
        t += d + GAP
    data["total"] = round(t - GAP + TAIL, 2)
    open(data_path, "w", encoding="utf-8").write("window.ROMDATA=" + json.dumps(data, ensure_ascii=False) + ";")

    # one voice track with every line at its start time
    inputs, filt = [], []
    for k, (f, st) in enumerate(parts):
        inputs += ["-i", f]
        filt.append(f"[{k}:a]adelay={int(st * 1000)}:all=1[a{k}]")
    filt.append("".join(f"[a{k}]" for k in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0,loudnorm=I=-14:TP=-1[out]")
    voice = os.path.join(ROOT, "assets", "voice.mp3")
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]",
                    "-t", str(data["total"]), "-c:a", "libmp3lame", "-b:a", "192k", voice], check=True)

    # composition length + audio clip
    html_path = os.path.join(ROOT, "index.html")
    html = open(html_path, encoding="utf-8").read()
    html = re.sub(r'data-duration="[\d.]+"', f'data-duration="{data["total"]}"', html)
    html = re.sub(r'\s*<audio id="voice"[^>]*></audio>', "", html)
    html = html.replace('<div id="caps"></div>', '<div id="caps"></div>\n        <audio id="voice" src="assets/voice.mp3" data-start="0" '
                        f'data-duration="{data["total"]}" data-track-index="1" data-volume="1"></audio>')
    open(html_path, "w", encoding="utf-8").write(html)
    print("Fertig. Gesamtlänge", data["total"], "s – jetzt rendern: cd hyperframes/rom && npx hyperframes render")


if __name__ == "__main__":
    main()
