<!doctype html>
<!-- Vorlage für build.py – nicht direkt rendern. index.html wird daraus erzeugt. -->
<html lang="de" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      :root {
        --blau: #0a3a9e;
        --blau-tief: #062a75;
        --gold: #f5c22b;
        --weiss: #ffffff;
        --schwarz: #111111;
        --rot: #dd0a1a;
        --display: "Archivo Black", sans-serif;
        --body: "Inter", sans-serif;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--blau); }
      #root { width: 100%; height: 100%; position: relative; font-family: var(--body); }

      .szene { position: absolute; inset: 0; overflow: hidden; }
      .buehne { position: absolute; inset: 0; }
      .blau { background: var(--blau); color: var(--weiss); }
      .gold { background: var(--gold); color: var(--blau-tief); }
      .weiss { background: var(--weiss); color: var(--blau-tief); }

      /* Hintergründe im Stil des Logos: Verlauf mit Lichteinfall oben links, feine Diagonaltextur,
         Schwarz-Rot-Gold-Band unten (unterhalb des Textbands, nur Dekoration) */
      .hg { position: absolute; inset: 0; overflow: hidden; }
      .blau .hg { background: radial-gradient(130% 85% at 12% 6%, #2a6ddc 0%, #0e48b6 32%, #0a3a9e 58%, #052464 100%); }
      .gold .hg { background: radial-gradient(130% 85% at 12% 6%, #ffe68a 0%, #f8ca3e 38%, #f1b91f 68%, #d79b08 100%); }
      .weiss .hg { background: radial-gradient(130% 85% at 12% 6%, #ffffff 0%, #f4f7fd 45%, #d9e3f5 100%); }
      .hg-licht { position: absolute; left: -260px; top: -320px; width: 1100px; height: 1100px; border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0) 70%); }
      .gold .hg-licht { background: radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 70%); }
      .weiss .hg-licht { background: radial-gradient(circle, rgba(42,109,220,0.10) 0%, rgba(42,109,220,0.04) 40%, rgba(42,109,220,0) 70%); left: 500px; top: 900px; }
      .hg-raster { position: absolute; inset: 0; background: repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 2px, rgba(255,255,255,0) 2px 24px); }
      .gold .hg-raster { background: repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0 2px, rgba(255,255,255,0) 2px 24px); }
      .weiss .hg-raster { background: repeating-linear-gradient(135deg, rgba(10,58,158,0.035) 0 2px, rgba(10,58,158,0) 2px 24px); }
      /* Foto-Hintergründe: breites Bild schwenkt seitlich, Königsblau-Schleier hält den Text lesbar */
      .hg-foto { position: absolute; top: 0; left: -1167px; width: 3414px; height: 1920px; }
      .hg-scrim { position: absolute; inset: 0;
        background: linear-gradient(180deg, rgba(5, 30, 90, 0.45) 0%, rgba(5, 30, 90, 0.64) 30%, rgba(5, 30, 90, 0.64) 68%, rgba(5, 30, 90, 0.25) 100%); }
      .hg-band { position: absolute; left: 0; top: 1330px; width: 1080px; height: 600px; overflow: visible; }
      .hg-band path { fill: none; stroke-linecap: butt; }
      .hg-band .rand { stroke: #062a75; stroke-width: 118; }
      .hg-band .st { stroke-width: 30; }

      /* Inhalt 270–1270 px, rechts 160 px frei für die TikTok-Leiste; darunter nur Dekoration */
      .band { position: absolute; left: 80px; right: 160px; top: 270px; height: 1000px; display: flex; flex-direction: column; justify-content: center; }
      .band.mitte { align-items: center; }
      .zentriert { text-align: center; }
      .d { font-family: var(--display); text-transform: uppercase; letter-spacing: -0.015em; line-height: 1.02; }
      .s { font-family: var(--body); font-weight: 800; letter-spacing: -0.01em; line-height: 1.2; }
      .fs52 { font-size: 52px; } .fs60 { font-size: 60px; } .fs64 { font-size: 64px; } .fs80 { font-size: 80px; } .fs84 { font-size: 80px; } .fs100 { font-size: 100px; } .fs130 { font-size: 130px; }
      .fs88 { font-size: 86px; } .fs92 { font-size: 92px; } .fs104 { font-size: 100px; } .fs110 { font-size: 110px; }
      .fs120 { font-size: 120px; } .fs124 { font-size: 124px; } .fs150 { font-size: 140px; }
      .goldtext { color: var(--gold); }
      .blau-t { color: var(--blau); }

      /* Wort-Masken: jedes Wort steigt aus seiner Maske */
      .m { display: inline-block; overflow: hidden; vertical-align: top; padding-bottom: 0.08em; margin-bottom: -0.08em; }
      .w { display: inline-block; }
      .blau .g { color: var(--gold); }
      .mit-foto .d, .mit-foto .s { text-shadow: 0 4px 24px rgba(0, 0, 0, 0.35); }
      .gold .g, .weiss .g { background: var(--blau); color: var(--gold); padding: 0 0.12em; }
      #hook1 .g { color: var(--gold); }

      /* Hook */
      .konto { margin: 50px 0 0; transform-origin: 30% 50%; background: var(--weiss); color: var(--blau-tief); padding: 34px 44px 30px; box-shadow: 0 18px 0 var(--blau-tief); }
      .konto-label { font-weight: 800; font-size: 36px; text-transform: uppercase; letter-spacing: 0.03em; }
      .konto-zahl { font-family: var(--display); font-size: 170px; line-height: 1.05; letter-spacing: -0.03em; }

      /* „Das ändern wir.“ */
      .aendern { display: flex; flex-direction: column; font-size: 190px; line-height: 0.95; color: var(--blau-tief); letter-spacing: -0.03em; }
      .ae { display: block; align-self: flex-start; }
      .blau-block { background: var(--blau-tief); color: var(--gold); padding: 0 0.12em; margin-top: 12px; }

      /* Logo */
      .logo-rahmen { position: relative; width: 680px; height: 680px; overflow: hidden; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35); }
      .logo-rahmen.klein-logo { width: 560px; height: 560px; }
      .logo { width: 100%; height: 100%; display: block; }
      .glanz { position: absolute; top: -20%; left: 0; width: 40%; height: 140%; background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%); }

      /* C – S – B */
      .akronym { font-family: var(--display); font-size: 280px; line-height: 0.85; letter-spacing: -0.03em; display: flex; gap: 18px; }
      .kb { display: inline-block; color: rgba(255, 255, 255, 0.22); }
      .kb.an { color: var(--gold); }
      .kb.weg { opacity: 0; }
      .gold .kb { color: rgba(6, 42, 117, 0.28); }
      .gold .kb.an { color: var(--blau-tief); }
      .wort { margin: 40px 0 34px; }

      /* Projekt */
      .klein { font-weight: 900; font-size: 46px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 30px; }
      .strich-gold { width: 520px; height: 26px; background: var(--gold); margin-top: 44px; }

      /* Werte */
      .werte { margin-top: 36px; display: flex; flex-direction: column; gap: 18px; }
      .wert-z { position: relative; display: flex; flex-direction: column; }
      .wert { font-family: "League Gothic", sans-serif; text-transform: uppercase; font-size: 150px; color: var(--gold); line-height: 0.92; letter-spacing: 0.01em; }
      .wert-b { display: block; width: 100%; height: 14px; background: var(--weiss); margin-top: 10px; }

      /* Forderungs-Karten */
      .icon { width: 180px; height: 180px; margin-bottom: 30px; }
      .icon * { fill: none; stroke: var(--blau); stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 0; }
      .thema { align-self: flex-start; font-weight: 900; font-size: 44px; text-transform: uppercase; letter-spacing: 0.04em; padding: 10px 24px; background: var(--blau); color: var(--gold); margin-bottom: 40px; }

      /* Europa */
      #eu-t { margin-bottom: 30px; }
      .eu { display: flex; gap: 26px; font-size: 54px; margin-top: 30px; }
      .eu .bk { width: 20px; background: var(--gold); flex: none; }
      .sternkreis { position: absolute; inset: 0; }
      .stern { position: absolute; width: 60px; height: 60px; }
      .stern path { fill: var(--gold); }

      /* Warum */
      .gruende { margin-top: 48px; display: flex; flex-direction: column; gap: 34px; }
      .grund { display: flex; align-items: flex-start; gap: 28px; }
      .haken { width: 80px; height: 80px; flex: none; background: var(--blau); }
      .haken path { fill: none; stroke: var(--gold); stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; }

      /* Bilder: Steckbrief und Plakat */
      .bild-rahmen { position: absolute; left: 0; top: 150px; width: 1080px; height: 1350px; }
      .bild { width: 100%; height: 100%; display: block; }
      .plakat-rahmen { position: absolute; left: 0; top: 130px; width: 1080px; height: 1350px; }
      .plakat { width: 100%; height: 100%; display: block; }

      /* Outro */
      .folgen { margin-top: 44px; background: var(--gold); color: var(--blau-tief); font-family: var(--display); text-transform: uppercase; font-size: 50px; padding: 18px 44px; }
      .schwung { position: absolute; left: 0; top: 1320px; width: 1080px; height: 600px; overflow: visible; }
      .schwung path { fill: none; stroke-width: 46; stroke-dasharray: 1; stroke-linecap: butt; }

      /* Schwarz-Rot-Gold-Wischer */
      #band-wrap { position: absolute; left: -400px; top: -300px; width: 1880px; height: 2520px; transform: rotate(-14deg); }
      #band-zug { position: absolute; inset: 0; }
      .streifen { position: absolute; left: 0; width: 1880px; height: 840px; }
      #st-schwarz { top: 0; background: var(--schwarz); }
      #st-rot { top: 840px; background: var(--rot); }
      #st-gold { top: 1680px; background: var(--gold); }

      #hinweis {
        position: absolute; left: 80px; top: 190px; z-index: 300;
        padding: 10px 20px; background: var(--weiss); color: var(--blau-tief); outline: 3px solid var(--blau-tief);
        font-weight: 800; font-size: 30px; letter-spacing: 0.03em; text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%ENDE%%" data-width="1080" data-height="1920">
%%SZENEN%%

      <div id="wischer" class="clip" data-start="0" data-duration="%%ENDE%%" data-track-index="1" data-layout-allow-overflow data-layout-allow-overlap style="position:absolute; inset:0; z-index:200; pointer-events:none">
        <div id="band-wrap"><div id="band-zug">
          <div id="st-schwarz" class="streifen"></div><div id="st-rot" class="streifen"></div><div id="st-gold" class="streifen"></div>
        </div></div>
      </div>

      <div id="hinweis" class="clip" data-start="0" data-duration="%%ENDE%%" data-track-index="2">Fiktive Partei</div>

      %%AUDIO%%
    </div>

    <script>
      const W = %%W%%;
      const SLOT = %%SLOT%%;
      const S = %%S%%;
      const UE = %%UEBERGAENGE%%;
      const IDS = %%IDS%%;
      const tl = gsap.timeline({ paused: true });
      const EIN = "power4.out";
      const q = (s) => document.querySelector(s);
      const qa = (s) => [...document.querySelectorAll(s)];

      // Wörter schnellen aus ihren Masken, verteilt über die Sprechzeit (Abstand nach Zeichenzahl).
      function woerter(sel, t, d) {
        const ws = qa(sel + " .w");
        const laengen = ws.map((w) => w.textContent.length + 1);
        const summe = laengen.reduce((a, b) => a + b, 0);
        let bisher = 0;
        ws.forEach((w, i) => {
          tl.fromTo(w, { yPercent: 110, rotation: 4 }, { yPercent: 0, rotation: 0, duration: 0.22, ease: "power3.out" }, t + (d * 0.85 * bisher) / summe);
          bisher += laengen[i];
        });
      }
      function zeichnen(sel, t, dauer, stagger = 0) {
        qa(sel).forEach((el, i) => tl.fromTo(el, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: dauer, ease: "power2.inOut" }, t + i * stagger));
      }
      function knall(sel, t, von = 1.6) {
        tl.fromTo(sel, { scale: von, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: "power4.out", transformOrigin: "0% 50%" }, t);
      }
      function wackeln(sel, t, staerke = 14) {
        [-1, 0.8, -0.6, 0.4, -0.2, 0].forEach((f, i) => tl.to(sel, { x: f * staerke, y: -f * staerke * 0.5, duration: 0.035, ease: "none" }, t + i * 0.035));
      }

      // Übergänge (0,3 s): push = von rechts, hoch = von unten, zoom = rein, wisch = Schwarz-Rot-Gold-Band.
      tl.set("#band-zug", { x: -2500 }, 0);
      UE.forEach(([t, art], i) => {
        const neu = "#b-" + IDS[i + 1], alt = "#b-" + IDS[i];
        if (art === "push") {
          tl.fromTo(neu, { xPercent: 100 }, { xPercent: 0, duration: 0.3, ease: "power4.inOut" }, t);
          tl.fromTo(alt, { xPercent: 0 }, { xPercent: -30, duration: 0.3, ease: "power4.inOut" }, t);
        } else if (art === "hoch") {
          tl.fromTo(neu, { yPercent: 100 }, { yPercent: 0, duration: 0.3, ease: "power4.inOut" }, t);
          tl.fromTo(alt, { yPercent: 0 }, { yPercent: -25, duration: 0.3, ease: "power4.inOut" }, t);
        } else if (art === "zoom") {
          tl.fromTo(neu, { scale: 1.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: "power3.out" }, t);
          tl.fromTo(alt, { scale: 1 }, { scale: 0.9, duration: 0.28, ease: "power2.in" }, t);
        } else {
          tl.fromTo("#band-zug", { x: -2500 }, { x: 0, duration: 0.2, ease: "power2.in" }, t - 0.2);
          tl.to("#band-zug", { x: 2500, duration: 0.24, ease: "power2.out" }, t);
        }
      });

      // Hintergründe leben: Fotos schwenken, Licht wandert, Band hebt sich.
      IDS.forEach((id) => {
        if (q(`#hg-${id}-foto`)) tl.fromTo(`#hg-${id}-foto`, { x: 420, scale: 1.04 }, { x: -420, scale: 1.12, duration: SLOT[id], ease: "none" }, S[id]);
        if (q(`#hg-${id}-licht`)) tl.fromTo(`#hg-${id}-licht`, { x: -90, y: -50 }, { x: 110, y: 60, duration: SLOT[id], ease: "none" }, S[id]);
        if (q(`#hg-${id}-band`)) tl.fromTo(`#hg-${id}-band`, { y: 50 }, { y: -14, duration: SLOT[id], ease: "power1.out" }, S[id]);
      });

      // 1 Hook (ab Frame 0 lesbar): Kontostand rauscht bis „nichts“ auf 0 € und kracht.
      tl.fromTo("#hook1", { scale: 1.08 }, { scale: 1, duration: 0.3, ease: "power3.out", transformOrigin: "0% 50%" }, 0);
      const konto = { v: 2480 };
      const kz = q("#konto-zahl");
      tl.fromTo(konto, { v: 2480 }, {
        v: 0, duration: W[6] - W[1], ease: "power3.in",
        onUpdate: () => { kz.textContent = Math.round(konto.v).toLocaleString("de-DE") + " €"; },
      }, W[1]);
      tl.fromTo("#konto-zahl", { color: "#062a75" }, { color: "#dd0a1a", duration: 0.08 }, W[6] - 0.04);
      tl.fromTo("#konto", { rotation: 0 }, { rotation: -4, duration: 0.18, ease: "back.out(3)" }, W[6]);
      wackeln("#konto", W[6], 16);

      // 2 „Das ändern wir.“: drei Schläge im Takt der Stimme, beim letzten bebt das Bild.
      knall("#ae1", W[7] - 0.03, 2.2); knall("#ae2", W[8] - 0.03, 2.2); knall("#ae3", W[9] - 0.03, 2.4);
      wackeln("#b-aendern", W[9], 18);

      // 3 Logo mit Glanz
      tl.fromTo("#logo1-r", { scale: 1.4, rotation: -6 }, { scale: 1, rotation: 0, duration: 0.45, ease: "power4.out" }, S.logo);
      tl.fromTo("#glanz1", { xPercent: -150 }, { xPercent: 300, duration: 0.6, ease: "power2.inOut" }, S.logo + 0.4);
      woerter("#logo-name", W[14], W[16] + 0.5 - W[14]);

      // 3b Steckbrief: Kamerafahrt vom Logo zu den Eckdaten
      tl.fromTo("#sb-rahmen", { scale: 1.0, y: 30 }, { scale: 1.08, y: -200, duration: SLOT.steckbrief, ease: "sine.inOut", transformOrigin: "50% 40%" }, S.steckbrief);

      // 4–6 Akronym: C, CS, CSB
      [["c", 0, 23], ["s", 1, 31], ["b", 2, 43]].forEach(([k, i, wi]) => {
        tl.fromTo(`#${k}-k${i}`, { y: -420, rotation: -18, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.38, ease: "back.out(2)" }, S[k] + 0.02);
        tl.fromTo(`#${k}-wort`, { scaleX: 1.6, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.25, ease: "power4.out", transformOrigin: "0% 50%" }, W[wi]);
        const ende = { c: W[30] + 0.4, s: W[42] + 0.4, b: W[49] + 0.4 }[k];
        woerter(`#${k}-satz`, W[wi + 1], ende - W[wi + 1]);
      });

      // 7 Ziel (über dem ICE)
      knall("#pr-k", W[50], 1.4);
      woerter("#pr-t", W[52], W[56] + 0.4 - W[52]);
      tl.fromTo("#pr-strich", { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power4.out", transformOrigin: "0% 50%" }, W[56] + 0.3);

      // 8 Werte: jedes Wort schlägt ein, wenn es fällt
      knall("#we-k", W[57], 1.4);
      [59, 60, 61].forEach((wi, i) => {
        knall(`#we${i + 1}`, W[wi] - 0.03, 1.8);
        tl.fromTo(`#we${i + 1}b`, { scaleX: 0 }, { scaleX: 1, duration: 0.25, ease: "power4.out", transformOrigin: "0% 50%" }, W[wi] + 0.06);
      });

      // 9 Konkret
      woerter("#ko-t", W[62] - 0.05, W[64] + 0.3 - W[62]);

      // 10–14 Karten: Icon zeichnet sich, Thema, Forderung im Sprechtempo
      [["f1", 65, 71], ["f2", 72, 78], ["f3", 79, 79], ["f4", 80, 85], ["f5", 86, 90]].forEach(([k, a, e]) => {
        tl.fromTo(`#${k}-icon`, { scale: 0.4, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2.2)", transformOrigin: "50% 50%" }, S[k] + 0.05);
        zeichnen(`#${k}-icon *`, S[k] + 0.05, 0.4, 0.05);
        tl.fromTo(`#${k}-th`, { x: -120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.22, ease: "power4.out" }, S[k] + 0.08);
        woerter(`#${k}-sa`, W[a], Math.max(0.5, W[e] + 0.3 - W[a]));
      });

      // 15 Europa: Sterne drehen ein, Aussagen mit dem Satz
      knall("#eu-t", W[91] - 0.03, 1.4);
      for (let i = 0; i < 12; i++) {
        tl.fromTo(`#stern${i}`, { scale: 0, rotation: -140 }, { scale: 1, rotation: 0, duration: 0.3, ease: "back.out(2.5)" }, W[92] + i * 0.045);
      }
      [["#eu1", 93], ["#eu2", 98], ["#eu3", 102]].forEach(([id, wi]) => {
        tl.fromTo(id, { x: -90, opacity: 0 }, { x: 0, opacity: 1, duration: 0.22, ease: "power4.out" }, W[wi] - 0.05);
      });

      // 16–19 Warum CSB? (über der Familie)
      knall("#wa-t", W[112] - 0.03, 1.5);
      [["wa1", 114, 118], ["wa2", 119, 124], ["wa3", 125, 132]].forEach(([g, a, e]) => {
        tl.fromTo(`#${g}-h`, { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.25, ease: "back.out(2.4)" }, W[a] - 0.08);
        zeichnen(`#${g}-h path`, W[a] + 0.05, 0.25);
        woerter(`#${g}`, W[a], W[e] + 0.3 - W[a]);
      });

      // 20 Plakat: langsamer Zoom, Slogan wird gesprochen
      tl.fromTo("#pl-rahmen", { scale: 1.0 }, { scale: 1.08, duration: SLOT.plakat, ease: "sine.inOut", transformOrigin: "50% 60%" }, S.plakat);

      // 21 Endkarte
      tl.fromTo("#logo2-r", { scale: 1.4 }, { scale: 1, duration: 0.45, ease: "power4.out" }, S.ende);
      tl.fromTo("#glanz2", { xPercent: -150 }, { xPercent: 300, duration: 0.6, ease: "power2.inOut" }, S.ende + 0.35);
      zeichnen(".schwung path", S.ende + 0.1, 0.7, 0.08);
      knall("#ende-werte", S.ende + 0.3, 1.3);
      tl.fromTo("#folgen", { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2.4)" }, W[140] - 0.05);
      [0, 0.6].forEach((dt) => {
        tl.to("#folgen", { scale: 1.08, duration: 0.14, ease: "power2.out" }, W[141] + 0.4 + dt);
        tl.to("#folgen", { scale: 1, duration: 0.22, ease: "power2.inOut" }, W[141] + 0.54 + dt);
      });

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
