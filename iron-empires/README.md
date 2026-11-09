# Iron Empires – Europa 1936

Ein eigenständiges, historisches Grand-Strategy-Spiel für den Browser, inspiriert vom Genre der großen Strategiespiele. Reines HTML, CSS und JavaScript – keine Installation, kein Build-Schritt, keine Fremdgrafiken.

## Starten

`index.html` im Browser öffnen (Doppelklick genügt). Alternativ über einen lokalen Webserver:

```bash
cd iron-empires
python3 -m http.server 8000   # dann http://localhost:8000 öffnen
```

## Spielinhalt

| Bereich | Umsetzung |
|---|---|
| **Start** | 1. Januar 1936, spielbar: Deutschland, Frankreich, Großbritannien, Italien, Polen, Sowjetunion. 28 Staaten mit historischen Ausgangswerten (Industrie, Rohstoffe, Bevölkerung, Armee, Flotte, Ideologie). |
| **Zeit** | Täglicher Takt mit Pause und 5 Geschwindigkeiten. Wirtschaft, Politik, Diplomatie, Luft-/Seekrieg und KI rechnen **monatlich** ab; Bewegungen, Gefechte, Bau und Forschung schreiten täglich voran. Spielende: 1. Januar 1946 (Weiterspielen möglich). |
| **Karte** | Interaktive SVG-Hexkarte Europas (~700 Provinzen) mit Zoom/Verschieben (Maus, Mausrad, Touch/Pinch), Ländernamen, Grenzen, Städten, Besatzungs-Schraffur, animierten Frontlinien und 7 Kartenmodi (Politisch, Ideologie, Bündnisse, Beziehungen, Gelände, Industrie, Versorgung). Gebietsänderungen werden automatisch neu gezeichnet. |
| **Militär** | 6 Divisionstypen, Armeen mit Stärke, Organisation, Erfahrung, Versorgung und Eingraben; Generäle mit Fähigkeiten und Eigenschaften; Gelände, Festungen, Luftüberlegenheit, Ölmangel und Technologie beeinflussen den Kampf. Einkesselungen, Rückzüge, Seetransporte/Landungen, Flottenkrieg, Blockaden und strategische Bomber. Optionale KI-Frontführung für eigene Armeen. |
| **Frieden** | Kapitulation über Siegpunkte, Friedenskonferenz (Annexion besetzter Gebiete, Vollannexion, Marionettenregime, Reparationen), Friedensangebote in beide Richtungen. |
| **Wirtschaft** | Zivil- und Militärfabriken pro Provinz, Infrastruktur, Festungen, Rohstoffe (Stahl, Öl, Aluminium, Kautschuk), Handelsabkommen, Staatshaushalt, Personal, Produktionsverteilung (Heer/Luftwaffe/Marine), Schiffbau, Gesetze. |
| **Politik** | 4 Ideologien mit Popularität, Stabilität, Kriegsunterstützung, politische Macht, Entscheidungen, Wahlen, Umstürze, Wirtschafts-/Wehrpflicht-/Steuergesetze. |
| **Diplomatie** | Beziehungen, Handel, Nichtangriffspakte, Garantien, Bündnisse (gründen, einladen, beitreten, verlassen), Gebietsforderungen, Kriegsgründe, Weltspannung, Bedrohlichkeit. Die KI begründet ihre Antworten (Tooltip). |
| **Forschung** | 37 Technologien in 7 Bereichen (Industrie, Infrastruktur, Kommunikation, Militärorganisation, Luftfahrt, Marine, Wirtschaft) mit Voraussetzungen, Jahres-Malus und konkreten Boni. |
| **Ereignisse** | ~35 historische und alternative Ereignisse 1936–1945 (Rheinland, Volksfront, Spanischer Bürgerkrieg, Achse, Säuberung, Anschluss, Sudetenkrise/München, Danzig, Pakt mit Moskau, Winterkrieg, Baltikum, Barbarossa, Kriegseintritt der USA …). Sie treten nur ein, wenn ihre Voraussetzungen erfüllt sind – Entscheidungen verändern den Verlauf. |
| **KI** | Alle anderen Staaten bauen Wirtschaft auf, forschen, rekrutieren, schließen Handel/Pakte/Bündnisse, garantieren bedrohte Staaten, reagieren auf Krisen und auf aggressives Verhalten des Spielers, führen Kriege mit Frontverteilung und schließen Frieden. |
| **Speichern** | 3 Speicherplätze + Autosave (alle 3 Monate) im `localStorage` des Browsers. |
| **Bedienung** | Desktop, Tablet und Smartphone (Layout mit Bottom-Sheet und Menüleiste unten). Tastatur: Leertaste = Pause, 1–5 = Tempo, Esc = Auswahl aufheben. |

## Dateien

```
iron-empires/
├── index.html        Grundgerüst, eigene SVG-Symbole
├── css/style.css     Dunkles Design, responsives Layout
└── js/
    ├── data.js       Karte, Länder, Städte, Divisionen, Gesetze, Technologien
    ├── engine.js     Spielzustand, Wirtschaft, Politik, Diplomatie, Kampf, Frieden
    ├── events.js     Ereignissystem 1936–1945
    ├── ai.js         KI für alle Nicht-Spieler-Staaten
    ├── map.js        SVG-Karte (Zoom, Pan, Modi, Armeen, Fronten)
    └── ui.js         Oberfläche, Spielschleife, Speichern/Laden
```

## Hinweise

- Eigenständiges Projekt: Name, Grafiken, Symbole, Wappen und Regeln sind eigene Entwürfe; es werden keine Dateien anderer Spiele verwendet.
- Historische Personen und Ereignisse dienen ausschließlich dem geschichtlichen Kontext. Staatswappen sind neutral gestaltet (Farbe + Ländercode), ohne historische Symbole.
- Die Karte ist bewusst stilisiert (1 Hexfeld ≈ 1° Breite × 1,25° Länge).
