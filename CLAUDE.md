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
- **Standard: ElevenLabs** über den ElevenLabs-Connector (`creative_generate_speech`), Stimme „Henri“ (`PgDR8pfZXGiB1HsizOuW`), Modell `eleven_v4`, der ganze Text als **ein** Take (klingt flüssiger als Einzelzeilen).
- Audio-URL aus `creative_get_flow_run_status` mit `curl` laden (storage.googleapis.com ist erreichbar), mit `loudnorm=I=-14:TP=-1.5` nach `assets/stimme/voiceover.mp3`.
- Sprechpausen kürzen: `tools/pausen_kuerzen.py` (Pausen > 0,12 s → 0,08 s, Wortzeiten werden mitverschoben); Originale bleiben als `voiceover-original*`.
- Auf Länge kürzen ohne neue Credits: `tools/saetze_schneiden.py` (ganze Sätze nach Wort-Indizes behalten, optional leicht beschleunigen; Wörter behalten ihren Original-Index `i`).
- Wortzeiten lokal: `tools/wortzeiten.py` (Parakeet v3, Modell von GitHub-Releases) → `assets/stimme/voiceover-woerter.json`; danach `python3 build.py` (Beispiel: `videos/001-csb-vorstellung`). Szenen und Einsätze hängen an Wort-Indizes.
- Kostenloses ElevenLabs-Konto: Bilder nur wenige pro Tag, Bilder kommen im Querformat 16:9.
- Fallback ohne ElevenLabs: Piper „Thorsten“ über `tools/sprecher.py`.
- Musik gibt es hier keine: in der TikTok-App einen Sound leise unterlegen.
- Fertiges MP4 am Ende noch einmal auf −14 LUFS normalisieren (`-c:v copy`, nur Ton).

## Bilder und Karten
- Wikimedia/Bundesarchiv ist hier gesperrt, echte historische Fotos gibt es daher nicht. Keine KI-„Archivfotos“ erzeugen; historische Szenen als animierte Illustrationen bauen.
- Karten: npm `world-atlas` (Natural Earth, gemeinfrei) + `d3-geo` → SVG-Pfade (Beispiel: `videos/002-csb-wirtschaft/assets/karten`).

## Wichtig
- GSAP liegt lokal in `assets/vendor/gsap.min.js` – der Render-Browser erreicht hier kein CDN. Keine CDN-Skripte verwenden.
- Text nur im Band 168–1330 px Höhe, rechts 160 px frei (TikTok-UI).
- Kein „Fiktive Partei“-Hinweis im Video (Wunsch von Lars). Stattdessen in Bio/Beschreibung kennzeichnen und bei KI-Stimme/-Bildern TikToks KI-Label setzen.
- MP4s werden nicht committet (`.gitignore`); fertige Videos dem Nutzer per Datei schicken.
