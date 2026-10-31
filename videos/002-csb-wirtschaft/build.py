"""Video 2 – Die Wirtschaftspolitik der CSB. Baut index.html aus Voiceover-Wortzeiten.

  python3 build.py

Stimme: assets/stimme/voiceover.mp3 (ElevenLabs „Henri“, Pausen gekürzt),
Wortzeiten: assets/stimme/voiceover-woerter.json. Karten: assets/karten/*.json
(Natural Earth über world-atlas, erzeugt mit d3-geo).
"""
import json
import re
from pathlib import Path

HIER = Path(__file__).parent
WOERTER = json.loads((HIER / "assets/stimme/voiceover-woerter.json").read_text())
W = [w["start"] for w in WOERTER]
ENDE = round(WOERTER[-1]["end"] + 2.2, 2)
DE = json.loads((HIER / "assets/karten/deutschland.json").read_text())
EU = json.loads((HIER / "assets/karten/europa.json").read_text())
VORLAUF, UEBERLAPP = 0.1, 0.35

# (id, erstes Wort, Farbwelt, Übergang hinein)
SZENEN = [
    ("hook", 0, "blau", None), ("dmark", 20, "blau", "zoom"), ("erhard", 27, "weiss", "push"),
    ("fenster", 35, "nacht", "hoch"), ("idee", 42, "blau", "wisch"), ("heute", 53, "nacht", "wisch"),
    ("drei", 71, "gold", "zoom"), ("markt", 77, "blau", "push"), ("sozial", 87, "gold", "push"),
    ("bremse", 103, "blau", "push"), ("widerspruch", 123, "nacht", "zoom"), ("antwort", 134, "blau", "wisch"),
    ("steuern", 155, "gold", "push"), ("frage", 159, "blau", "zoom"),
]
START = {s: 0 if i == 0 else round(W[wi] - VORLAUF, 3) for i, (s, wi, *_) in enumerate(SZENEN)}
SLOT = {}
for i, (s, *_) in enumerate(SZENEN):
    SLOT[s] = round((ENDE if i == len(SZENEN) - 1 else START[SZENEN[i + 1][0]] + UEBERLAPP) - START[s], 3)


def w(text):
    out = []
    for wort in text.split(" "):
        gold = bool(re.match(r"^\*.*\*[.,:?!]*$", wort))
        out.append(f'<span class="m"><span class="w{" g" if gold else ""}">{wort.replace("*", "")}</span></span>')
    return " ".join(out)


BAND_SVG = ('<svg id="hg-{sid}-band" class="hg-band" viewBox="0 0 1080 600"><path class="rand" d="M-80 500 C 360 480 760 360 1160 70"/>'
            '<path class="st" stroke="#111111" d="M-80 466 C 360 446 760 326 1160 36"/><path class="st" stroke="#dd0a1a" d="M-80 500 C 360 480 760 360 1160 70"/>'
            '<path class="st" stroke="#f5c22b" d="M-80 534 C 360 514 760 394 1160 104"/></svg>')
OHNE_BAND = {"hook", "fenster", "heute", "markt", "frage", "sozial", "antwort"}


def szene(sid, inhalt, z):
    welt = next(s for s in SZENEN if s[0] == sid)[2]
    band = "" if sid in OHNE_BAND else BAND_SVG.format(sid=sid)
    return (f'<div id="s-{sid}" class="szene clip" data-start="{START[sid]}" data-duration="{SLOT[sid]}" data-track-index="0" style="z-index:{z}">\n'
            f'  <div id="b-{sid}" class="buehne {welt}"><div class="hg"><div id="hg-{sid}-licht" class="hg-licht"></div><div class="hg-raster"></div>{band}</div>\n{inhalt}\n  </div>\n</div>')


z = iter(range(1, 100))
T = []

# 1 Hook: Trümmerstadt 1948 wächst zur Wirtschaftswunder-Stadt 1958
HAEUSER = [(0, 130, 330), (120, 110, 270), (220, 150, 400), (360, 120, 300), (470, 160, 430), (620, 110, 280), (720, 140, 370), (850, 120, 320), (960, 140, 410)]
RUINEN = []
haeuser = []
for i, (x, b, h) in enumerate(HAEUSER):
    fenster = "".join(f'<rect class="fe" x="{x + 18 + c * 34}" y="{1500 - h + 30 + r * 54}" width="18" height="28"/>'
                      for r in range((h - 60) // 54) for c in range((b - 30) // 34))
    haeuser.append(f'<g id="h-haus{i}" class="haus"><rect class="hk" x="{x}" y="{1500 - h}" width="{b}" height="{h}"/>{fenster}</g>')
    rh = h * (0.28 + 0.12 * (i % 3))
    y0 = 1500 - rh
    RUINEN.append(f'<polygon class="ru" points="{x},1500 {x},{y0 + 20} {x + b * 0.25:.0f},{y0 - 25} {x + b * 0.45:.0f},{y0 + 30} '
                  f'{x + b * 0.7:.0f},{y0 - 10} {x + b},{y0 + 40} {x + b},1500"/>')
T.append(szene("hook", f"""
    <div id="h-sepia" class="sepia"></div>
    <svg id="h-stadt" class="stadt" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
      <g id="h-ruinen">{''.join(RUINEN)}<path class="schutt" d="M0 1500 Q 120 1440 260 1490 T 540 1480 T 820 1470 T 1080 1490 V 1920 H 0 Z"/></g>
      <g id="h-neu">{''.join(haeuser)}</g>
      <rect class="boden" x="0" y="1500" width="1080" height="420"/>
    </svg>
    <div class="band oben">
      <div id="h-frage" class="kicker">Von Trümmern zum Wunder – in 10 Jahren?</div>
      <div id="h-jahr" class="jahr d">1948</div>
      <div id="h-wunder" class="d fs96 goldtext" data-layout-allow-overlap>Wirtschafts&shy;wunder</div>
    </div>
    <div id="h-wie" class="wie d" data-layout-allow-overlap>Wie?</div>""", next(z)))

# 2 D-Mark
T.append(szene("dmark", """
    <div class="band">
      <div id="dm-kal" class="kalender"><div class="kal-kopf">Juni</div><div class="kal-tag d">20</div><div class="kal-jahr">1948</div></div>
      <div id="dm-titel" class="d fs110 goldtext" style="margin-top:46px">Die D-Mark kommt</div>
    </div>
    <svg id="dm-schein" class="schein" viewBox="0 0 760 380">
      <rect x="0" y="0" width="760" height="380" rx="16" fill="#e9dcb6"/><rect x="18" y="18" width="724" height="344" rx="10" fill="none" stroke="#3a5f8f" stroke-width="6"/>
      <circle cx="610" cy="190" r="120" fill="#c9b27a" opacity="0.55"/><text x="610" y="232" text-anchor="middle" class="sch-zahl">20</text>
      <text x="60" y="110" class="sch-titel">DEUTSCHE MARK</text><text x="60" y="170" class="sch-klein">ZWANZIG · 1948</text>
      <path d="M60 230 H 440 M60 262 H 400 M60 294 H 420" stroke="#3a5f8f" stroke-width="5" opacity="0.5"/>
    </svg>""", next(z)))

# 3 Erhard streicht Preisvorschriften
zeilen = "".join(f'<div class="dok-zeile" style="width:{w_}%"></div>' for w_ in (92, 78, 86, 64, 90, 72, 84, 58))
T.append(szene("erhard", f"""
    <div class="band">
      <div id="er-name" class="d fs96">Ludwig Erhard</div>
      <div id="er-rolle" class="s fs44 blau-t" style="margin:14px 0 50px">Direktor der Wirtschaftsverwaltung, 1948</div>
      <div id="er-dok" class="dokument">
        <div class="dok-titel">Preisvorschriften</div>{zeilen}
        <div id="er-strich" class="dok-strich"></div>
        <div class="stempel-wrap"><div id="er-stempel" class="stempel d">Gestrichen</div></div>
      </div>
    </div>""", next(z)))

# 4 Schaufenster über Nacht voll
WAREN = ["brot", "schuh", "topf", "radio", "kleid", "kaffee", "uhr", "tasche", "lampe"]
FORM = {
    "brot": '<ellipse cx="50" cy="60" rx="42" ry="26" fill="#d39a4a"/><path d="M22 52 l10 -8 M42 48 l10 -8 M62 48 l10 -8" stroke="#8a5a20" stroke-width="5"/>',
    "schuh": '<path d="M10 70 H 90 V 58 Q 70 54 58 40 L 30 34 Q 12 34 10 54 Z" fill="#6b3b1f"/>',
    "topf": '<rect x="18" y="40" width="64" height="40" rx="6" fill="#9aa7b8"/><rect x="10" y="34" width="80" height="10" rx="4" fill="#7c8a9c"/>',
    "radio": '<rect x="10" y="26" width="80" height="54" rx="8" fill="#8b5e34"/><circle cx="34" cy="53" r="14" fill="#e9dcb6"/><rect x="56" y="40" width="26" height="6" fill="#e9dcb6"/><rect x="56" y="54" width="26" height="6" fill="#e9dcb6"/>',
    "kleid": '<path d="M38 18 H 62 L 66 38 L 86 86 H 14 L 34 38 Z" fill="#c0392b"/>',
    "kaffee": '<rect x="28" y="20" width="44" height="64" rx="6" fill="#3b2a1f"/><rect x="34" y="40" width="32" height="20" fill="#f5c22b"/>',
    "uhr": '<circle cx="50" cy="52" r="32" fill="#f3efe4" stroke="#3a5f8f" stroke-width="6"/><path d="M50 52 V 32 M50 52 H 66" stroke="#3a5f8f" stroke-width="5"/>',
    "tasche": '<rect x="18" y="40" width="64" height="44" rx="8" fill="#1f4fb0"/><path d="M36 40 Q 50 14 64 40" fill="none" stroke="#1f4fb0" stroke-width="6"/>',
    "lampe": '<path d="M30 20 H 70 L 82 54 H 18 Z" fill="#f5c22b"/><rect x="46" y="54" width="8" height="26" fill="#555"/><rect x="32" y="80" width="36" height="6" fill="#555"/>',
}
waren = "".join(f'<svg id="sf-w{i}" class="ware" viewBox="0 0 100 100">{FORM[n]}</svg>' for i, n in enumerate(WAREN))
T.append(szene("fenster", f"""
    <div id="sf-tag" class="tag-hg"></div>
    <div id="sf-mond" class="mond"></div><div id="sf-sonne" class="sonne"></div>
    <div class="band">
      <div id="sf-titel" class="d fs96"><span class="kasten">Über Nacht:</span> <span class="kasten goldtext">volle Schaufenster</span></div>
      <div class="laden">
        <div class="markise"></div>
        <div class="fenster-glas"><div class="regale">{waren}</div></div>
      </div>
    </div>""", next(z)))

# 5 Soziale Marktwirtschaft – Waage
T.append(szene("idee", f"""
    <div class="band">
      <div id="id-k" class="kicker">Die Idee dahinter</div>
      <div class="d fs104"><span id="id-t1" class="blk">Soziale</span><span id="id-t2" class="blk goldtext">Markt&shy;wirtschaft</span></div>
      <svg class="waage" viewBox="0 0 840 420">
        <path d="M420 120 V 400 M340 400 H 500" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
        <g id="id-balken"><rect x="80" y="110" width="680" height="16" rx="8" fill="#f5c22b"/>
          <g id="id-links"><path d="M110 126 L 60 240 M110 126 L 160 240" stroke="#fff" stroke-width="5"/><rect x="40" y="236" width="140" height="14" rx="7" fill="#fff"/>
            <text x="110" y="290" text-anchor="middle" class="waage-t">MARKT</text></g>
          <g id="id-rechts"><path d="M730 126 L 680 240 M730 126 L 780 240" stroke="#fff" stroke-width="5"/><rect x="660" y="236" width="140" height="14" rx="7" fill="#fff"/>
            <text x="730" y="290" text-anchor="middle" class="waage-t">SOZIAL</text></g></g>
        <circle cx="420" cy="118" r="18" fill="#fff"/>
      </svg>
      <p id="id-satz" class="s fs56">{w("Freier Markt – aber *niemand* wird zurückgelassen.")}</p>
    </div>""", next(z)))

# 6 Heute: Schulden und Zinsen auf der Deutschlandkarte
muenzen = "".join(f'<div id="ht-m{i}" class="muenze" style="left:{180 + (i % 5) * 120}px">€</div>' for i in range(10))
T.append(szene("heute", f"""
    <svg class="de-karte" viewBox="0 0 {DE['w']} {DE['h']}"><path id="ht-de-fl" class="de-fl" d="{DE['d']}"/><path id="ht-de" class="de-li" d="{DE['d']}" pathLength="1"/></svg>
    <div class="band oben">
      <div id="ht-k" class="kicker">Und heute?</div>
      <div id="ht-zahl" class="zaehler">0</div>
      <div id="ht-zl" class="s fs52">Euro Staatsschulden</div>
      <div id="ht-zins" class="zins"><div class="d fs120 goldtext">30 Mrd. €</div><div class="s fs52">Zinsen, nur der Bund</div>
        <div id="ht-jahr" class="d fs80 rot-t">Jedes Jahr.</div></div>
    </div>
    {muenzen}""", next(z)))

# 7 Drei Dinge gleichzeitig
saeulen = "".join(f'<div id="dr-s{i}" class="saeule"><span class="d">{i + 1}</span></div>' for i in range(3))
T.append(szene("drei", f"""
    <div class="band">
      <div id="dr-k" class="kicker blau-t">Die CSB will</div>
      <div id="dr-t" class="d fs120">3 Dinge gleich&shy;zeitig</div>
      <div class="saeulen">{saeulen}</div>
    </div>""", next(z)))

# 8 Freier Markt – Europakarte mit Handelslinien
st = EU["staedte"]
fx, fy = st["Frankfurt"]
ziele = ["Paris", "Madrid", "Rom", "Warschau", "Stockholm", "Amsterdam", "Wien", "London", "Prag"]
linien = "".join(f'<path id="mk-l{i}" class="handel" d="M{fx} {fy} Q {(fx + st[c][0]) / 2} {min(fy, st[c][1]) - 120} {st[c][0]} {st[c][1]}" pathLength="1"/>'
                 f'<circle id="mk-p{i}" class="stadt-p" cx="{st[c][0]}" cy="{st[c][1]}" r="11"/>' for i, c in enumerate(ziele))
laender = "".join(f'<path d="{d}"/>' for d in EU["laender"])
T.append(szene("markt", f"""
    <svg class="eu-karte" viewBox="0 0 {EU['w']} {EU['h']}"><g class="eu-l">{laender}</g><path id="mk-de" class="eu-de" d="{EU['de']}"/>{linien}
      <circle cx="{fx}" cy="{fy}" r="16" fill="#ffffff"/></svg>
    <div class="band oben">
      <div id="mk-k" class="kicker">1 · Freier Markt</div>
      <div id="mk-c1" class="chip">Weniger Bürokratie</div>
      <div id="mk-c2" class="chip">Freier Handel</div>
      <div id="mk-c3" class="chip">Starke private Unternehmen</div>
    </div>""", next(z)))

# 9 Soziale Sicherheit – Balken und Netz
T.append(szene("sozial", f"""
    <div class="band">
      <div id="so-k" class="kicker blau-t">2 · Soziale Sicherheit</div>
      <div class="balken-box">
        <div class="bal"><div id="so-b1" class="bal-saeule blau-bg"></div><div class="bal-l">Mit Arbeit</div></div>
        <div class="bal"><div id="so-b2" class="bal-saeule weiss-bg"></div><div class="bal-l">Ohne Arbeit</div></div>
      </div>
      <p id="so-satz" class="d fs64">{w("Aber keiner fällt *durchs* Netz.")}</p>
    </div>
    <svg class="netz" viewBox="0 0 1080 420">
      <path id="so-netz" d="M40 120 Q 540 380 1040 120" fill="none" stroke="#062a75" stroke-width="10" pathLength="1"/>
      <path id="so-netz2" d="M40 120 L 300 290 L 540 330 L 780 290 L 1040 120 M180 200 L 300 290 M420 300 L 540 330 L 660 300 M780 290 L 900 200" fill="none" stroke="#062a75" stroke-width="6" pathLength="1"/>
      <g id="so-figur"><circle cx="540" cy="150" r="30" fill="#dd0a1a"/><rect x="515" y="185" width="50" height="80" rx="20" fill="#dd0a1a"/></g>
    </svg>""", next(z)))

# 10 Schuldenbremse – Grundgesetz und 0,35 %
T.append(szene("bremse", """
    <div class="band">
      <div id="br-k" class="kicker">3 · Schuldenbremse</div>
      <div class="gg-zeile">
        <div id="br-buch" class="buch"><div class="buch-t">Grund&shy;gesetz</div></div>
        <div id="br-seit" class="d fs110 goldtext">seit<br />2009</div>
      </div>
      <div class="bip">
        <div class="bip-l s">Wirtschaftsleistung = 100 %</div>
        <div id="br-bar" class="bip-bar"><div id="br-sliver" class="bip-sliver"></div></div>
      </div>
      <div id="br-zahl" class="d fs150 goldtext">0,35 %</div>
      <div id="br-zl" class="s fs48">neue Schulden pro Jahr – im Normalfall</div>
    </div>""", next(z)))

# 11 Widerspruch?
T.append(szene("widerspruch", """
    <div class="band">
      <div class="glitch-box"><div id="wi-r" class="d glitch rot-t" data-layout-allow-overlap>Wider&shy;spruch?</div><div id="wi-b" class="d glitch cyan-t" data-layout-allow-overlap>Wider&shy;spruch?</div><div id="wi-t" class="d glitch" data-layout-allow-overlap>Wider&shy;spruch?</div></div>
      <div id="wi-1" class="pfeil-zeile"><span class="pfeil goldtext">▲</span><span class="d fs72">Mehr soziale Sicherheit</span></div>
      <div id="wi-2" class="pfeil-zeile"><span class="pfeil rot-t">▼</span><span class="d fs72">Weniger Schulden</span></div>
    </div>""", next(z)))

# 12 Antwort: Wachstum statt Kredit
T.append(szene("antwort", f"""
    <div class="band oben">
      <div id="an-k" class="kicker">Die Antwort der CSB</div>
      <div class="d fs120"><span id="an-1" class="blk goldtext">Wachstum</span><span id="an-2" class="blk">statt Kredit</span></div>
    </div>
    <svg class="kurve" viewBox="0 0 1080 760">
      <path id="an-fl" d="M60 700 C 300 680 480 560 640 420 S 900 160 1000 80 V 700 Z" fill="#f5c22b" opacity="0.18"/>
      <path id="an-li" d="M60 700 C 300 680 480 560 640 420 S 900 160 1000 80" fill="none" stroke="#f5c22b" stroke-width="16" stroke-linecap="round" pathLength="1"/>
      <g id="an-l1"><circle cx="640" cy="420" r="16" fill="#fff"/><text x="610" y="400" text-anchor="end" class="kurve-t">Wirtschaft ▲</text></g>
      <g id="an-l2"><circle cx="1000" cy="80" r="16" fill="#fff"/><text x="970" y="150" text-anchor="end" class="kurve-t">Einnahmen ▲</text></g>
    </svg>
    <div id="an-satz" class="unten-satz s fs56">{w("Ohne neue Steuern auf *Arbeit.*")}</div>""", next(z)))

# 13 Steuern: ja / nein
T.append(szene("steuern", """
    <div class="band">
      <div id="st-1" class="steuer"><span class="haken-k ja">✓</span><span class="d fs72">Erbschaft&shy;steuer</span></div>
      <div id="st-2" class="steuer"><span class="haken-k nein">✕</span><span class="d fs72">Vermögen&shy;steuer</span></div>
    </div>""", next(z)))

# 14 Frage an die Zuschauer
T.append(szene("frage", """
    <div id="fr-oben" class="split oben-h"><div class="split-t d">Eisern<br />sparen?</div></div>
    <div id="fr-unten" class="split unten-h"><div class="split-t d">Schulden für<br />die Zukunft?</div></div>
    <div id="fr-oder" class="oder d">oder</div>
    <div id="fr-jetzt" class="jetzt d">Jetzt du:</div>
    <div id="fr-komm" class="komm"><svg viewBox="0 0 100 100"><path d="M10 14 H 90 V 70 H 40 L 20 90 V 70 H 10 Z" fill="#ffffff"/><circle cx="32" cy="42" r="6" fill="#062a75"/><circle cx="50" cy="42" r="6" fill="#062a75"/><circle cx="68" cy="42" r="6" fill="#062a75"/></svg><span class="s">Schreib's in die Kommentare</span></div>
    <img id="fr-logo" class="fr-logo" src="assets/csb-logo.png" alt="CSB Logo" />""", next(z)))

# --- Ton ------------------------------------------------------------------
fx = []


def sfx(name, t, vol=0.4, extra=""):
    fx.append(f'<audio id="fx{len(fx)}" src="assets/sfx/{name}.mp3" data-start="{round(max(0, t), 3)}" data-volume="{vol}"{extra}></audio>')


for s, _, _, art in SZENEN[1:]:
    sfx("whoosh" if art == "wisch" else "whoosh-short", START[s] - (0.12 if art == "wisch" else 0.05), 0.3 if art == "wisch" else 0.22)
sfx("impact-bass-2", W[4], 0.45)                                # Trümmern
sfx("riser", W[5], 0.22, ' data-duration="2.9" data-fade-out="0.4"')
sfx("impact-bass-1", W[15], 0.5)                                # Wirtschaftswunder
sfx("impact-bass-2", W[16], 0.4)                                # Wie?
sfx("impact-bass-1", W[26], 0.35)                               # D-Mark
sfx("impact-bass-2", W[30] + 0.3, 0.4)                          # gestrichen
for i in range(9):
    sfx("pop", W[38] + i * 0.17, 0.22)                          # Waren
sfx("impact-bass-2", W[59], 0.4)                                # Staatsschulden
for i in range(10):
    sfx("click-soft", W[62] + i * 0.12, 0.2)                    # Münzen
for i in (74, 77, 87, 103):
    sfx("impact-bass-1", W[i], 0.3)
sfx("impact-bass-2", W[118], 0.4)                               # 0,35 %
sfx("impact-bass-2", W[126], 0.45)                              # Widerspruch
sfx("impact-bass-1", W[138], 0.45)                              # Wachstum
sfx("pop", W[155], 0.35); sfx("pop", W[157], 0.35)
sfx("impact-bass-1", W[172], 0.35)
audio = ['<audio id="vo" src="assets/stimme/voiceover.mp3" data-start="0" data-volume="1"></audio>'] + fx

html = ((HIER / "vorlage.html.tpl").read_text()
        .replace("%%SZENEN%%", "\n".join(T)).replace("%%AUDIO%%", "\n      ".join(audio)).replace("%%ENDE%%", str(ENDE))
        .replace("%%W%%", json.dumps(W)).replace("%%S%%", json.dumps(START)).replace("%%SLOT%%", json.dumps(SLOT))
        .replace("%%UEBERGAENGE%%", json.dumps([[START[s[0]], s[3]] for s in SZENEN[1:]]))
        .replace("%%IDS%%", json.dumps([s[0] for s in SZENEN])))
(HIER / "index.html").write_text(html)
print(f"index.html: {ENDE} s, {len(SZENEN)} Szenen")
