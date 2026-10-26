# TikTok-Kanal einer fiktiven Partei

Dieses Repo ist die Produktionszentrale für einen TikTok-Kanal einer **erfundenen** Partei.
Antworte auf Deutsch.

## Struktur
- `partei/PARTEI.md` – die Partei: Name, Farben, Programm, Ton, Tabus. **Quelle der Wahrheit.**
- `kanal/KANAL.md` – Profil, Formate, Regeln, Video-Log.
- `videos/_vorlage/` – HyperFrames-Vorlage (1080×1920, 15 s, Format „Forderung der Woche“).
- `videos/NNN-slug/` – je ein Ordner pro Video (Kopie der Vorlage).
- `.claude/skills/` – HyperFrames-Skills (`/hyperframes`, `/hyperframes-cli`, `/hyperframes-registry`, `/media-use`).

## Neues Video bauen
1. `partei/PARTEI.md` und `kanal/KANAL.md` lesen; Skill `/hyperframes` laden.
2. `cp -r videos/_vorlage videos/NNN-slug` (ohne `.hyperframes/`).
3. Texte/Farben über die Variablen in `index.html` setzen (oder `--variables '{...}'` beim Rendern).
4. `HYPERFRAMES_SKIP_SKILLS=1 npx hyperframes@0.8.204 check` → `snapshot` ansehen → `render -o renders/NNN-slug.mp4`.
5. Eintrag im Video-Log in `kanal/KANAL.md` ergänzen.

## Stimme (deutsch, männlich)
- Piper-Stimme „Thorsten“ (CC0), Skript `tools/sprecher.py` (Einrichtung steht im Kopf der Datei).
- Modell kommt von GitHub-Releases (k2-fsa/sherpa-onnx, `vits-piper-de_DE-thorsten-high`); Hugging Face ist hier gesperrt.
- Sprechertext in `sprechertext.json`, Abkürzungen für die Aussprache ausschreiben (`EU` → `E-U`).
- Danach je Zeile `loudnorm=I=-14:TP=-1.5` → `assets/stimme/`, dann `python3 build.py` (Beispiel: `videos/001-csb-vorstellung`).
- Musik gibt es hier keine: in der TikTok-App einen Sound leise unterlegen.

## Wichtig
- GSAP liegt lokal in `assets/vendor/gsap.min.js` – der Render-Browser erreicht hier kein CDN. Keine CDN-Skripte verwenden.
- Text nur im Band 168–1330 px Höhe, rechts 160 px frei (TikTok-UI).
- Jedes Video trägt den Hinweis „Fiktive Partei“.
- MP4s werden nicht committet (`.gitignore`); fertige Videos dem Nutzer per Datei schicken.
