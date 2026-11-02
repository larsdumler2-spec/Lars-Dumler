"""Baut index.html aus dem ElevenLabs-Voiceover und seinen Wortzeiten.

  python3 build.py

Die Stimme ist ein durchgehender Take (assets/stimme/voiceover.mp3). Ihre Wortzeiten
(assets/stimme/voiceover-woerter.json, aus tools/wortzeiten.py) legen fest, wann jede
Szene beginnt und wann jedes Element erscheint.
"""
import json
import math
import re
from pathlib import Path

HIER = Path(__file__).parent
WOERTER = json.loads((HIER / "assets/stimme/voiceover-woerter.json").read_text())
W = [w["start"] for w in WOERTER]
ENDE = round(WOERTER[-1]["end"] + 1.4, 2)
VORLAUF = 0.1        # Szene beginnt kurz vor ihrem ersten Wort
UEBERLAPP = 0.35     # alte Szene bleibt für den Übergang stehen

# (id, erstes Wort, Farbwelt, Übergang hinein, Hintergrundbild)
SZENEN = [
    ("hook", 0, "blau", None, None),
    ("aendern", 7, "gold", "zoom", None),
    ("logo", 10, "blau", "wisch", None),
    ("steckbrief", 17, "blau", "push", None),
    ("c", 23, "blau", "push", "kirche"),
    ("s", 31, "gold", "hoch", None),
    ("b", 43, "blau", "push", None),
    ("projekt", 50, "blau", "wisch", "zug"),
    ("werte", 57, "blau", "zoom", None),
    ("konkret", 62, "gold", "wisch", None),
    ("f1", 65, "weiss", "push", None),
    ("f2", 72, "gold", "push", None),
    ("f3", 79, "weiss", "push", None),
    ("f4", 80, "gold", "push", None),
    ("f5", 86, "weiss", "push", None),
    ("europa", 91, "blau", "zoom", None),
    ("warum", 112, "blau", "wisch", "familie"),
    ("plakat", 133, "blau", "wisch", None),
    ("ende", 139, "blau", "zoom", None),
]
START = {sid: 0 if i == 0 else round(W[wi] - VORLAUF, 3) for i, (sid, wi, *_) in enumerate(SZENEN)}
SLOT = {}
for i, (sid, *_) in enumerate(SZENEN):
    ende = ENDE if i == len(SZENEN) - 1 else START[SZENEN[i + 1][0]] + UEBERLAPP
    SLOT[sid] = round(min(ende, ENDE) - START[sid], 3)


def w(text):
    """Text -> maskierte Wörter; *wort* wird hervorgehoben."""
    out = []
    for wort in text.split(" "):
        gold = bool(re.match(r"^\*.*\*[.,:?!]*$", wort))
        wort = wort.replace("*", "")
        out.append(f'<span class="m"><span class="w{" g" if gold else ""}">{wort}</span></span>')
    return " ".join(out)


def hintergrund(sid, bild):
    """Foto (falls vorhanden) oder Verlauf, wanderndes Licht, Textur, Schwarz-Rot-Gold-Band."""
    foto = (
        f'<img id="hg-{sid}-foto" class="hg-foto" src="assets/hg/{bild}.jpg" alt="" /><div class="hg-scrim"></div>'
        if bild else f'<div id="hg-{sid}-licht" class="hg-licht"></div>'
    )
    band = "" if sid in ("ende", "europa", "plakat", "steckbrief") else (
        f'<svg id="hg-{sid}-band" class="hg-band" viewBox="0 0 1080 600">'
        '<path class="rand" d="M-80 500 C 360 480 760 360 1160 70"/>'
        '<path class="st" stroke="#111111" d="M-80 466 C 360 446 760 326 1160 36"/>'
        '<path class="st" stroke="#dd0a1a" d="M-80 500 C 360 480 760 360 1160 70"/>'
        '<path class="st" stroke="#f5c22b" d="M-80 534 C 360 514 760 394 1160 104"/></svg>'
    )
    return f'<div class="hg">{foto}<div class="hg-raster"></div>{band}</div>'


def szene(sid, inhalt, z):
    _, _, welt, _, bild = next(s for s in SZENEN if s[0] == sid)
    return (
        f'<div id="s-{sid}" class="szene clip" data-start="{START[sid]}" data-duration="{SLOT[sid]}" '
        f'data-track-index="0" style="z-index:{z}">\n'
        f'  <div id="b-{sid}" class="buehne {welt}{" mit-foto" if bild else ""}">\n    {hintergrund(sid, bild)}\n{inhalt}\n  </div>\n</div>'
    )


ICON = {
    "zug": '<rect x="45" y="20" width="130" height="150" rx="26"/><rect x="65" y="45" width="90" height="50" rx="8"/>'
           '<circle cx="80" cy="130" r="9"/><circle cx="140" cy="130" r="9"/><path d="M70 170 L50 205 M150 170 L170 205"/>',
    "euro": '<path d="M175 55 A75 75 0 1 0 175 165"/><path d="M35 95 H140 M35 128 H140"/>',
    "haus": '<path d="M25 110 L110 35 L195 110"/><path d="M50 90 V195 H170 V90"/><path d="M93 195 V140 H127 V195"/>',
    "blitz": '<path d="M128 15 L55 120 H108 L88 205 L168 92 H115 Z"/>',
    "schild": '<path d="M110 15 L185 45 V105 C185 160 150 190 110 207 C70 190 35 160 35 105 V45 Z"/><path d="M72 108 L100 136 L150 82"/>',
}


def icon(name, iid):
    return f'<svg id="{iid}" class="icon" viewBox="0 0 220 220">{ICON[name].replace("/>", " pathLength=\"1\"/>")}</svg>'


KARTEN = [
    ("f1", "zug", "Bildung", "Bahn und Mittagessen *gratis* für alle Schüler."),
    ("f2", "euro", "Familie &amp; Rente", "Mehr Geld für Familien, *Pflegekräfte* und Rentner."),
    ("f3", "haus", "Wohnen", "Miet&shy;erhöhungen *begrenzen.*"),
    ("f4", "blitz", "Energie", "Erneuerbare Energie – ohne dass *du* draufzahlst."),
    ("f5", "schild", "Migration", "Integration fördern. Schwere Straftäter *abschieben.*"),
]

z = iter(range(1, 100))
teile = [
    szene("hook", """
    <div class="band">
      <h1 id="hook1" class="d fs130">Vollzeit <span class="g">arbeiten.</span></h1>
      <div id="konto" class="konto">
        <div class="konto-label">Kontostand am Monatsende</div>
        <div id="konto-zahl" class="konto-zahl">2.480 €</div>
      </div>
    </div>""", next(z)),
    szene("aendern", """
    <div class="band">
      <div class="d aendern"><span id="ae1" class="ae">Das</span><span id="ae2" class="ae">ändern</span><span id="ae3" class="ae blau-block">wir.</span></div>
    </div>""", next(z)),
    szene("logo", f"""
    <div class="band mitte">
      <div id="logo1-r" class="logo-rahmen"><img id="logo1" class="logo" src="assets/csb-logo.png" alt="CSB Logo" /><div id="glanz1" class="glanz"></div></div>
      <p id="logo-name" class="s fs52 zentriert" style="margin-top:40px">{w("Christlich-Soziale *Bürgerunion*")}</p>
    </div>""", next(z)),
    szene("steckbrief", """
    <div id="sb-rahmen" class="bild-rahmen"><img id="sb-bild" class="bild" src="assets/steckbrief.jpg" alt="Parteisteckbrief der CSB" /></div>""", next(z)),
]
for sid, akt, wort, satz in [
    ("c", 0, "Christlich", "Familie und Nächstenliebe als *Fundament.*"),
    ("s", 1, "Sozial", "Wer arbeitet, muss *mehr* haben als wer nicht arbeitet."),
    ("b", 2, "Bürgerunion", "Die Partei der *Mitte.* Für alle."),
]:
    buchst = "".join(
        f'<span id="{sid}-k{i}" class="kb{" an" if i == akt else ""}{" weg" if i > akt else ""}">{ch}</span>'
        for i, ch in enumerate("CSB")
    )
    teile.append(szene(sid, f"""
    <div class="band">
      <div class="akronym">{buchst}</div>
      <div id="{sid}-wort" class="d fs92 wort">{wort}</div>
      <p id="{sid}-satz" class="s fs52">{w(satz)}</p>
    </div>""", next(z)))
teile.append(szene("projekt", f"""
    <div class="band">
      <div id="pr-k" class="klein goldtext">Unser Ziel</div>
      <h2 id="pr-t" class="d fs100">{w("Ein Deutschland, das wieder *funktioniert.*")}</h2>
      <div id="pr-strich" class="strich-gold"></div>
    </div>""", next(z)))
teile.append(szene("werte", """
    <div class="band">
      <p id="we-k" class="klein goldtext">Unsere Werte</p>
      <div class="werte">
        <div class="wert-z"><span id="we1" class="wert">Freiheit</span><span id="we1b" class="wert-b"></span></div>
        <div class="wert-z"><span id="we2" class="wert">Sicherheit</span><span id="we2b" class="wert-b"></span></div>
        <div class="wert-z"><span id="we3" class="wert">Verantwortung</span><span id="we3b" class="wert-b"></span></div>
      </div>
    </div>""", next(z)))
teile.append(szene("konkret", f"""
    <div class="band"><h2 id="ko-t" class="d fs130">{w("Konkret heißt das:")}</h2></div>""", next(z)))
for sid, ic, thema, satz in KARTEN:
    teile.append(szene(sid, f"""
    <div class="band">
      {icon(ic, sid + "-icon")}
      <div id="{sid}-th" class="thema">{thema}</div>
      <p id="{sid}-sa" class="d fs84">{w(satz)}</p>
    </div>""", next(z)))
sterne = "".join(
    f'<svg id="stern{i}" class="stern" style="left:{540 + 170 * math.sin(i * math.pi / 6) - 30:.0f}px; '
    f'top:{1620 - 170 * math.cos(i * math.pi / 6) - 30:.0f}px" viewBox="0 0 100 100">'
    '<path d="M50 5 L61 38 H96 L68 59 L79 93 L50 72 L21 93 L32 59 L4 38 H39 Z"/></svg>'
    for i in range(12)
)
teile.append(szene("europa", f"""
    <div class="band">
      <h2 id="eu-t" class="d fs120 goldtext">Und Europa?</h2>
      <div id="eu1" class="eu s"><span class="bk"></span><span>Stark in EU und NATO.</span></div>
      <div id="eu2" class="eu s"><span class="bk"></span><span>Unabhängiger von den USA.</span></div>
      <div id="eu3" class="eu s"><span class="bk"></span><span>An der Seite der Ukraine – für einen gerechten Frieden.</span></div>
    </div>
    <div class="sternkreis">{sterne}</div>""", next(z)))
gruende = [("wa1", "Sozial *und* vernünftig."), ("wa2", "Leistung lohnt sich *wieder.*"), ("wa3", "Eine Mitte, die *anpackt.*")]
reihen = "\n".join(
    f'<div id="{gid}" class="grund"><svg id="{gid}-h" class="haken" viewBox="0 0 100 100"><path d="M18 52 L42 76 L84 26" pathLength="1"/></svg>'
    f'<p class="d fs60">{w(txt)}</p></div>'
    for gid, txt in gruende
)
teile.append(szene("warum", f"""
    <div class="band">
      <h2 id="wa-t" class="d fs130">Warum <span class="goldtext">CSB?</span></h2>
      <div class="gruende">{reihen}</div>
    </div>""", next(z)))
teile.append(szene("plakat", """
    <div id="pl-rahmen" class="plakat-rahmen"><img id="pl-bild" class="plakat" src="assets/plakat.jpg" alt="CSB-Plakat: Freiheit bewahren. Verantwortung tragen. Zukunft gestalten." /></div>""", next(z)))
teile.append(szene("ende", """
    <div class="band mitte">
      <div id="logo2-r" class="logo-rahmen klein-logo"><img id="logo2" class="logo" src="assets/csb-logo.png" alt="CSB Logo" /><div id="glanz2" class="glanz"></div></div>
      <div id="ende-werte" class="d fs60 goldtext zentriert" style="margin-top:44px">Freiheit. Sicherheit.<br />Verantwortung.</div>
      <div id="folgen" class="folgen">Folge der CSB</div>
    </div>
    <svg class="schwung" viewBox="0 0 1080 600">
      <path id="sw1" d="M-60 560 C 380 540 760 420 1140 80" stroke="#111111" pathLength="1"/>
      <path id="sw2" d="M-60 612 C 400 590 790 470 1160 130" stroke="#dd0a1a" pathLength="1"/>
      <path id="sw3" d="M-60 664 C 420 640 820 520 1180 180" stroke="#f5c22b" pathLength="1"/>
    </svg>""", next(z)))

# --- Ton ------------------------------------------------------------------
fx = []


def sfx(name, t, vol=0.5):
    fx.append(f'<audio id="fx{len(fx)}" src="assets/sfx/{name}.mp3" data-start="{round(max(0, t), 3)}" data-volume="{vol}"></audio>')


for sid, _, _, art, _ in SZENEN[1:]:
    sfx("whoosh" if art == "wisch" else "whoosh-short", START[sid] - (0.12 if art == "wisch" else 0.05), 0.32 if art == "wisch" else 0.25)
sfx("impact-bass-2", W[6], 0.45)                    # „nichts“: Konto auf 0
for i in (7, 8, 9):
    sfx("click-soft", W[i], 0.45)                   # Das – ändern – wir.
sfx("impact-bass-1", W[9], 0.5)
sfx("impact-bass-1", START["logo"] + 0.05, 0.45)
sfx("impact-bass-1", START["ende"] + 0.05, 0.4)
for i in (59, 60, 61):
    sfx("click-soft", W[i], 0.4)                    # Freiheit, Sicherheit, Verantwortung
for i in (114, 119, 125):
    sfx("pop", W[i], 0.3)                           # Gründe

audio = ['<audio id="vo" src="assets/stimme/voiceover.mp3" data-start="0" data-volume="1"></audio>'] + fx

# --- Seite ----------------------------------------------------------------
html = (
    (HIER / "vorlage.html.tpl").read_text()
    .replace("%%SZENEN%%", "\n".join(teile))
    .replace("%%AUDIO%%", "\n      ".join(audio))
    .replace("%%ENDE%%", str(ENDE))
    .replace("%%W%%", json.dumps(W))
    .replace("%%S%%", json.dumps(START))
    .replace("%%SLOT%%", json.dumps(SLOT))
    .replace("%%UEBERGAENGE%%", json.dumps([[START[s[0]], s[3]] for s in SZENEN[1:]]))
    .replace("%%IDS%%", json.dumps([s[0] for s in SZENEN]))
)
(HIER / "index.html").write_text(html)
print(f"index.html: {ENDE} s, {len(SZENEN)} Szenen")
