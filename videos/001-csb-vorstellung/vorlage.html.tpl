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

      /* Inhalt 260–1120 px, Untertitel 1150–1310 px, rechts 160 px frei für die TikTok-Leiste */
      .band { position: absolute; left: 80px; right: 160px; top: 260px; height: 860px; display: flex; flex-direction: column; justify-content: center; }
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
      .gold .g, .weiss .g { background: var(--blau); color: var(--gold); padding: 0 0.12em; }
      #hook1 .g { color: var(--gold); }

      /* Hook */
      .konto { margin: 56px 0 0; background: var(--weiss); color: var(--blau-tief); padding: 34px 44px 30px; box-shadow: 0 18px 0 var(--blau-tief); }
      .konto-label { font-weight: 800; font-size: 36px; text-transform: uppercase; letter-spacing: 0.03em; }
      .konto-zahl { font-family: var(--display); font-size: 156px; line-height: 1.05; letter-spacing: -0.03em; }

      /* 60 Sekunden */
      .ring-box { position: relative; width: 400px; height: 400px; margin: 30px 0; }
      #ring { position: absolute; inset: 0; width: 400px; height: 400px; }
      #ring circle { fill: none; stroke-width: 34; }
      .ring-bg { stroke: rgba(6, 42, 117, 0.15); }
      .ring-v { stroke: var(--blau); stroke-dasharray: 1; stroke-dashoffset: 1; stroke-linecap: butt; }
      #ring-v { transform-origin: 220px 220px; }
      .eins { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 240px; color: var(--blau); }

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
      .wort { margin: 40px 0 34px; }

      /* Projekt */
      .klein { font-weight: 900; font-size: 46px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 30px; }
      .strich-gold { width: 520px; height: 26px; background: var(--gold); margin-top: 44px; }

      /* Werte */
      .werte { margin-top: 36px; display: flex; flex-direction: column; gap: 18px; }
      .wert-z { position: relative; display: flex; flex-direction: column; }
      .wert { font-family: "League Gothic", sans-serif; text-transform: uppercase; font-size: 176px; color: var(--gold); line-height: 0.92; letter-spacing: 0.01em; }
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

      /* Dunkles Band hinter den Untertiteln, wenn darunter ein Bild liegt */
      .ut-verlauf { position: absolute; left: 0; top: 1090px; width: 1080px; height: 280px;
        background: linear-gradient(180deg, rgba(6, 24, 70, 0) 0%, rgba(6, 24, 70, 0.82) 28%, rgba(6, 24, 70, 0.82) 72%, rgba(6, 24, 70, 0) 100%); }

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

      <div id="untertitel" class="clip" data-composition-id="untertitel" data-composition-src="compositions/untertitel.html" data-start="0" data-duration="%%ENDE%%" data-track-index="3" data-track-kind="captions" style="position:absolute; inset:0; z-index:250"></div>

      <div id="wischer" class="clip" data-start="0" data-duration="%%ENDE%%" data-track-index="1" data-layout-allow-overflow data-layout-allow-overlap style="position:absolute; inset:0; z-index:200; pointer-events:none">
        <div id="band-wrap"><div id="band-zug">
          <div id="st-schwarz" class="streifen"></div><div id="st-rot" class="streifen"></div><div id="st-gold" class="streifen"></div>
        </div></div>
      </div>

      <div id="hinweis" class="clip" data-start="0" data-duration="%%ENDE%%" data-track-index="2">Fiktive Partei</div>

      %%AUDIO%%
    </div>

    <script>
      const L = %%L%%;
      const WT = %%WT%%;
      const SLOT = %%SLOT%%;
      const S = %%S%%;
      const UE = %%UEBERGAENGE%%;
      const IDS = %%IDS%%;
      const tl = gsap.timeline({ paused: true });
      const EIN = "power4.out";
      const q = (s) => document.querySelector(s);
      const qa = (s) => [...document.querySelectorAll(s)];

      // Wörter steigen im Sprechtempo aus ihren Masken (Abstand nach Zeichenzahl).
      function woerter(sel, t, d) {
        const ws = qa(sel + " .w");
        const laengen = ws.map((w) => w.textContent.length + 1);
        const summe = laengen.reduce((a, b) => a + b, 0);
        let bisher = 0;
        ws.forEach((w, i) => {
          tl.fromTo(w, { yPercent: 115 }, { yPercent: 0, duration: 0.34, ease: EIN }, t + (d * 0.88 * bisher) / summe);
          bisher += laengen[i];
        });
      }
      function zeichnen(sel, t, dauer, stagger = 0) {
        qa(sel).forEach((el, i) => tl.fromTo(el, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: dauer, ease: "power2.inOut" }, t + i * stagger));
      }

      // Übergänge: Push (neue Szene schiebt von rechts, alte weicht mit Parallaxe) oder Schwarz-Rot-Gold-Wischer.
      tl.set("#band-zug", { x: -2500 }, 0);
      UE.forEach(([t, art], i) => {
        const neu = "#b-" + IDS[i + 1], alt = "#b-" + IDS[i];
        if (art === "push") {
          tl.fromTo(neu, { xPercent: 100 }, { xPercent: 0, duration: 0.45, ease: "power3.inOut" }, t);
          tl.fromTo(alt, { xPercent: 0 }, { xPercent: -35, duration: 0.45, ease: "power3.inOut" }, t);
        } else {
          tl.fromTo("#band-zug", { x: -2500 }, { x: 0, duration: 0.3, ease: "power2.in" }, t - 0.3);
          tl.to("#band-zug", { x: 2500, duration: 0.34, ease: "power2.out" }, t);
        }
      });

      // 1 Hook: Satz + Kontostand stehen ab Frame 0; bei „Und am Ende…“ rauscht er auf 0 €, bei „nichts“ ist er leer.
      tl.fromTo("#hook1", { scale: 1.05 }, { scale: 1, duration: 0.45, ease: "power3.out", transformOrigin: "0% 50%" }, 0);
      const konto = { v: 2480 };
      const kz = q("#konto-zahl");
      tl.fromTo(konto, { v: 2480 }, {
        v: 0, duration: WT.l01[12] - WT.l01[5], ease: "power2.in",
        onUpdate: () => { kz.textContent = Math.round(konto.v).toLocaleString("de-DE") + " €"; },
      }, WT.l01[5]);
      tl.fromTo("#konto-zahl", { color: "#062a75" }, { color: "#dd0a1a", duration: 0.12 }, WT.l01[12] - 0.05);
      [-14, 12, -9, 7, -4, 0].forEach((x, i) => tl.to("#konto", { x, duration: 0.045, ease: "none" }, WT.l01[12] + i * 0.045));

      // 2 Eine Minute: Ring zieht sich zu.
      tl.fromTo("#mi-dann", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: EIN }, S.minute + 0.35);
      tl.fromTo("#ring-v", { strokeDashoffset: 1, rotation: -90 }, { strokeDashoffset: 0, rotation: -90, duration: 1.4, ease: "power1.inOut" }, L.l02.s);
      tl.fromTo("#mi-1", { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }, WT.l02[3] - 0.05);
      tl.fromTo("#mi-min", { scaleX: 1.4, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.35, ease: EIN }, WT.l02[4]);

      // 3 Logo mit Glanz
      tl.fromTo("#logo1-r", { scale: 1.3, rotation: -5 }, { scale: 1, rotation: 0, duration: 0.7, ease: "power3.out" }, S.logo);
      tl.fromTo("#glanz1", { xPercent: -150 }, { xPercent: 300, duration: 0.9, ease: "power2.inOut" }, S.logo + 0.6);
      woerter("#logo-name", WT.l03[4], L.l03.s + L.l03.d - WT.l03[4]);

      // 3b Steckbrief: langsame Kamerafahrt vom Logo zu den Eckdaten
      tl.fromTo("#sb-rahmen", { scale: 1.0, y: 30 }, { scale: 1.06, y: -170, duration: SLOT.steckbrief, ease: "sine.inOut", transformOrigin: "50% 40%" }, S.steckbrief);

      // 4–6 Das Akronym baut sich auf: C, CS, CSB
      [["c", 0, "l04"], ["s", 1, "l05"], ["b", 2, "l06"]].forEach(([k, i, lid]) => {
        tl.fromTo(`#${k}-k${i}`, { y: -460, rotation: -16, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.55, ease: "back.out(1.8)" }, S[k] + 0.3);
        tl.fromTo(`#${k}-wort`, { scaleX: 1.5, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.4, ease: EIN, transformOrigin: "0% 50%" }, L[lid].s);
        woerter(`#${k}-satz`, WT[lid][1], L[lid].s + L[lid].d - WT[lid][1]);
      });

      // 7 Projekt
      tl.fromTo("#pr-k", { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: EIN }, S.projekt + 0.3);
      woerter("#pr-t", WT.l07[2], L.l07.s + L.l07.d - WT.l07[2]);
      tl.fromTo("#pr-strich", { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: EIN, transformOrigin: "0% 50%" }, L.l07.s + L.l07.d - 0.3);

      // 8 Werte: jedes Wort knallt rein, wenn es gesprochen wird.
      tl.fromTo("#we-k", { opacity: 0 }, { opacity: 1, duration: 0.3 }, S.werte + 0.35);
      [4, 5, 6].forEach((wi, i) => {
        const n = i + 1, t = WT.l08[wi];
        tl.fromTo(`#we${n}`, { scale: 1.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: EIN, transformOrigin: "0% 50%" }, t);
        tl.fromTo(`#we${n}b`, { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: EIN, transformOrigin: "0% 50%" }, t + 0.1);
      });

      // 9 Konkret
      woerter("#ko-t", L.l09.s - 0.15, L.l09.d + 0.1);

      // 10–14 Karten: Icon zeichnet sich, Thema, Forderung im Sprechtempo
      ["f1", "f2", "f3", "f4", "f5"].forEach((k, i) => {
        const lid = "l" + (10 + i);
        tl.fromTo(`#${k}-icon`, { scale: 0.5, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(2)", transformOrigin: "50% 50%" }, S[k] + 0.3);
        zeichnen(`#${k}-icon *`, S[k] + 0.3, 0.6, 0.07);
        tl.fromTo(`#${k}-th`, { x: -120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: EIN }, S[k] + 0.4);
        woerter(`#${k}-sa`, L[lid].s, L[lid].d);
      });

      // 15 Europa: zwölf Sterne, Aussagen kommen mit dem gesprochenen Satz
      tl.fromTo("#eu-t", { scale: 1.35, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: EIN, transformOrigin: "0% 50%" }, S.europa + 0.35);
      for (let i = 0; i < 12; i++) {
        tl.fromTo(`#stern${i}`, { scale: 0, rotation: -120 }, { scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2.5)" }, L.l15.s + 0.2 + i * 0.07);
      }
      [["#eu1", 2], ["#eu2", 7], ["#eu3", 11]].forEach(([id, wi]) => {
        tl.fromTo(id, { x: -90, opacity: 0 }, { x: 0, opacity: 1, duration: 0.32, ease: EIN }, WT.l15[wi] - 0.05);
      });

      // 16–19 Warum CSB? Haken zeichnen sich, Gründe im Sprechtempo
      tl.fromTo("#wa-t", { scale: 1.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.6)", transformOrigin: "0% 50%" }, L.l16.s - 0.05);
      [["wa1", "l17"], ["wa2", "l18"], ["wa3", "l19"]].forEach(([g, lid]) => {
        tl.fromTo(`#${g}-h`, { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(2)" }, L[lid].s - 0.1);
        zeichnen(`#${g}-h path`, L[lid].s + 0.1, 0.35);
        woerter(`#${g}`, L[lid].s + 0.1, L[lid].d - 0.1);
      });

      // 20 Plakat: Kamerafahrt über die Menschen, Slogan wird gesprochen
      tl.fromTo("#pl-rahmen", { scale: 1.0 }, { scale: 1.07, duration: SLOT.plakat, ease: "sine.inOut", transformOrigin: "50% 60%" }, S.plakat);

      // 21 Endkarte: Logo, Werte, Folgen, Schwarz-Rot-Gold-Schwung
      tl.fromTo("#logo2-r", { scale: 1.3 }, { scale: 1, duration: 0.7, ease: "power3.out" }, S.ende);
      tl.fromTo("#glanz2", { xPercent: -150 }, { xPercent: 300, duration: 0.9, ease: "power2.inOut" }, S.ende + 0.6);
      zeichnen(".schwung path", S.ende + 0.25, 1.0, 0.12);
      tl.fromTo("#ende-werte", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: EIN }, S.ende + 0.45);
      tl.fromTo("#folgen", { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.2)" }, L.l21.s);
      [0, 0.8].forEach((dt) => {
        tl.to("#folgen", { scale: 1.08, duration: 0.18, ease: "power2.out" }, L.l21.s + 1.1 + dt);
        tl.to("#folgen", { scale: 1, duration: 0.3, ease: "power2.inOut" }, L.l21.s + 1.28 + dt);
      });

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
