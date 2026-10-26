"""Baut index.html aus dem Sprechertext-Timing.

  python3 build.py

Die Szenen folgen der Stimme: Jede Zeile in assets/stimme/<id>.wav bekommt ihren
Startpunkt aus assets/stimme/dauern.json plus Pausen. Wortzeiten für Einsätze
kommen aus assets/stimme/woerter.json (tools/sprecher.py).
"""
import json
import math
import re
from pathlib import Path

HIER = Path(__file__).parent
DAUER = json.loads((HIER / "assets/stimme/dauern.json").read_text())
WOERTER = json.loads((HIER / "assets/stimme/woerter.json").read_text())

# --- Zeitplan -------------------------------------------------------------
PAUSE = 0.28
PAUSE_ABSCHNITT = 0.6           # vor einem Schwarz-Rot-Gold-Wischer
ABSCHNITT = {"l03", "l07", "l09", "l16", "l20"}
VORLAUF = 0.3                   # Szene beginnt so viel vor ihrer Stimme
UEBERLAPP = 0.45                # Push-Übergang
NACHLAUF = 2.2                  # Endkarte hält nach der letzten Zeile

L, t = {}, 0.25
for lid in sorted(DAUER):
    if lid in ABSCHNITT:
        t += PAUSE_ABSCHNITT - PAUSE
    L[lid] = {"s": round(t, 3), "d": DAUER[lid]}
    t += DAUER[lid] + PAUSE
ENDE = round(L["l21"]["s"] + L["l21"]["d"] + NACHLAUF, 2)
# Absolute Wortanfänge je Zeile
WT = {lid: [round(L[lid]["s"] + w["start"], 3) for w in ws] for lid, ws in WOERTER.items()}

SZENEN = [
    ("hook", "l01", None), ("minute", "l02", "push"), ("logo", "l03", "wisch"),
    ("steckbrief", "l03b", "push"),
    ("c", "l04", "push"), ("s", "l05", "push"), ("b", "l06", "push"),
    ("projekt", "l07", "wisch"), ("werte", "l08", "push"), ("konkret", "l09", "wisch"),
    ("f1", "l10", "push"), ("f2", "l11", "push"), ("f3", "l12", "push"),
    ("f4", "l13", "push"), ("f5", "l14", "push"), ("europa", "l15", "push"),
    ("warum", "l16", "wisch"), ("plakat", "l20", "wisch"), ("ende", "l21", "push"),
]
START = {}
for i, (sid, lid, _) in enumerate(SZENEN):
    START[sid] = 0 if i == 0 else round(L[lid]["s"] - VORLAUF, 3)
SLOT = {}
for i, (sid, _, _) in enumerate(SZENEN):
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


def hintergrund(sid):
    """Verlauf + wanderndes Licht + Textur + Schwarz-Rot-Gold-Band (nicht bei Endkarte und EU-Sternen)."""
    band = "" if sid in ("ende", "europa") else (
        f'<svg id="hg-{sid}-band" class="hg-band" viewBox="0 0 1080 600">'
        '<path class="rand" d="M-80 500 C 360 480 760 360 1160 70"/>'
        '<path class="st" stroke="#111111" d="M-80 466 C 360 446 760 326 1160 36"/>'
        '<path class="st" stroke="#dd0a1a" d="M-80 500 C 360 480 760 360 1160 70"/>'
        '<path class="st" stroke="#f5c22b" d="M-80 534 C 360 514 760 394 1160 104"/></svg>'
    )
    return f'<div class="hg"><div id="hg-{sid}-licht" class="hg-licht"></div><div class="hg-raster"></div>{band}</div>'


def szene(sid, klasse, inhalt, z):
    return (
        f'<div id="s-{sid}" class="szene clip" data-start="{START[sid]}" data-duration="{SLOT[sid]}" '
        f'data-track-index="0" style="z-index:{z}">\n'
        f'  <div id="b-{sid}" class="buehne {klasse}">\n    {hintergrund(sid)}\n{inhalt}\n  </div>\n</div>'
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
    ("f1", "weiss", "zug", "Bildung", "Bahnfahren und Mittagessen *gratis* für alle Schüler."),
    ("f2", "gold", "euro", "Familie &amp; Rente", "Mehr Geld für Familien, *Pflegekräfte* und Rentner."),
    ("f3", "weiss", "haus", "Wohnen", "Miet&shy;erhöhungen *klar* begrenzen."),
    ("f4", "gold", "blitz", "Energie", "Erneuerbare Energie – ohne dass *du* draufzahlst."),
    ("f5", "weiss", "schild", "Migration", "Integration fördern. Schwere Straftäter *abschieben.*"),
]

z = iter(range(1, 100))
teile = []
teile.append(szene("hook", "blau", """
    <div class="band">
      <h1 id="hook1" class="d fs100">Du gehst jeden Tag <span class="g">arbeiten.</span></h1>
      <div id="konto" class="konto">
        <div class="konto-label">Kontostand am Monatsende</div>
        <div id="konto-zahl" class="konto-zahl">2.480 €</div>
      </div>
    </div>""", next(z)))
teile.append(szene("minute", "gold", """
    <div class="band mitte">
      <p id="mi-dann" class="s fs64">Dann gib uns</p>
      <div class="ring-box">
        <svg id="ring" viewBox="0 0 440 440"><circle class="ring-bg" cx="220" cy="220" r="190"/><circle id="ring-v" class="ring-v" cx="220" cy="220" r="190" pathLength="1"/></svg>
        <div id="mi-1" class="d eins">1</div>
      </div>
      <div id="mi-min" class="d fs110">Minute.</div>
    </div>""", next(z)))
teile.append(szene("logo", "blau", f"""
    <div class="band mitte">
      <div id="logo1-r" class="logo-rahmen"><img id="logo1" class="logo" src="assets/csb-logo.png" alt="CSB Logo" /><div id="glanz1" class="glanz"></div></div>
      <p id="logo-name" class="s fs52 zentriert" style="margin-top:40px">{w("Christlich-Soziale *Bürgerunion*")}</p>
    </div>""", next(z)))
teile.append(szene("steckbrief", "blau", """
    <div id="sb-rahmen" class="bild-rahmen"><img id="sb-bild" class="bild" src="assets/steckbrief.jpg" alt="Parteisteckbrief der CSB" /></div>""", next(z)))
for sid, akt, wort, satz in [
    ("c", 0, "Christlich", "Nächstenliebe und Familie als *Fundament.*"),
    ("s", 1, "Sozial", "Wer arbeitet, muss *mehr* haben als wer nicht arbeitet."),
    ("b", 2, "Bürgerunion", "Eine Partei der *Mitte.* Für alle Bürger."),
]:
    buchst = "".join(
        f'<span id="{sid}-k{i}" class="kb{" an" if i == akt else ""}{" weg" if i > akt else ""}">{ch}</span>'
        for i, ch in enumerate("CSB")
    )
    teile.append(szene(sid, "blau", f"""
    <div class="band">
      <div class="akronym">{buchst}</div>
      <div id="{sid}-wort" class="d fs92 wort">{wort}</div>
      <p id="{sid}-satz" class="s fs52">{w(satz)}</p>
    </div>""", next(z)))
teile.append(szene("projekt", "weiss", f"""
    <div class="band">
      <div id="pr-k" class="klein">Unser Projekt</div>
      <h2 id="pr-t" class="d fs100">{w("Ein Deutschland, das wieder *funktioniert.*")}</h2>
      <div id="pr-strich" class="strich-gold"></div>
    </div>""", next(z)))
teile.append(szene("werte", "blau", """
    <div class="band">
      <p id="we-k" class="s fs52">Drei Werte leiten uns.</p>
      <div class="werte">
        <div class="wert-z"><span id="we1" class="wert">Freiheit</span><span id="we1b" class="wert-b"></span></div>
        <div class="wert-z"><span id="we2" class="wert">Sicherheit</span><span id="we2b" class="wert-b"></span></div>
        <div class="wert-z"><span id="we3" class="wert">Verantwortung</span><span id="we3b" class="wert-b"></span></div>
      </div>
    </div>""", next(z)))
teile.append(szene("konkret", "gold", f"""
    <div class="band"><h2 id="ko-t" class="d fs120">{w("Konkret heißt das:")}</h2></div>""", next(z)))
for sid, bg, ic, thema, satz in KARTEN:
    teile.append(szene(sid, bg, f"""
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
teile.append(szene("europa", "blau", f"""
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
teile.append(szene("warum", "gold", f"""
    <div class="band">
      <h2 id="wa-t" class="d fs130">Warum <span class="blau-t">CSB?</span></h2>
      <div class="gruende">{reihen}</div>
    </div>""", next(z)))
teile.append(szene("plakat", "blau", """
    <div id="pl-rahmen" class="plakat-rahmen"><img id="pl-bild" class="plakat" src="assets/plakat.jpg" alt="CSB-Plakat: Freiheit bewahren. Verantwortung tragen. Zukunft gestalten." /></div>""", next(z)))
teile.append(szene("ende", "blau", """
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
audio = [f'<audio id="v-{lid}" src="assets/stimme/{lid}.wav" data-start="{v["s"]}" data-volume="1"></audio>' for lid, v in L.items()]
fx = []


def sfx(name, t, vol=0.5, extra=""):
    fx.append(f'<audio id="fx{len(fx)}" src="assets/sfx/{name}.mp3" data-start="{round(t, 3)}" data-volume="{vol}"{extra}></audio>')


for sid, lid, art in SZENEN[1:]:
    if art == "wisch":
        sfx("whoosh", START[sid] - 0.05, 0.4)
    else:
        sfx("whoosh-short", START[sid] - 0.1, 0.3)
sfx("impact-bass-2", WT["l01"][12], 0.5)                    # „nichts“: Konto auf 0
sfx("riser", L["l02"]["s"] - 0.2, 0.22, ' data-duration="2.2" data-fade-out="0.4"')
sfx("impact-bass-1", START["logo"] + 0.05, 0.55)
sfx("impact-bass-1", START["ende"] + 0.05, 0.5)
for i in range(3):
    sfx("click-soft", WT["l08"][4 + i], 0.45)                # Freiheit, Sicherheit, Verantwortung
    sfx("pop", L[f"l{17 + i}"]["s"], 0.35)

# --- Seite ----------------------------------------------------------------
html = (
    (HIER / "vorlage.html.tpl").read_text()
    .replace("%%SZENEN%%", "\n".join(teile))
    .replace("%%AUDIO%%", "\n      ".join(audio + fx))
    .replace("%%ENDE%%", str(ENDE))
    .replace("%%L%%", json.dumps(L))
    .replace("%%WT%%", json.dumps(WT))
    .replace("%%S%%", json.dumps(START))
    .replace("%%SLOT%%", json.dumps(SLOT))
    .replace("%%UEBERGAENGE%%", json.dumps([[START[s], a] for s, _, a in SZENEN[1:]]))
    .replace("%%IDS%%", json.dumps([s for s, _, _ in SZENEN]))
)
(HIER / "index.html").write_text(html)
print(f"index.html: {ENDE} s, {len(SZENEN)} Szenen")
