<!doctype html>
<!-- Vorlage für build.py – nicht direkt rendern. index.html wird daraus erzeugt. -->
<html lang="de" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      :root {
        --blau: #0a3a9e; --blau-tief: #062a75; --gold: #f5c22b; --weiss: #ffffff;
        --schwarz: #111111; --rot: #dd0a1a;
        --display: "Archivo Black", sans-serif; --body: "Inter", sans-serif;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--blau); }
      #root { width: 100%; height: 100%; position: relative; font-family: var(--body); }

      .szene { position: absolute; inset: 0; overflow: hidden; }
      .buehne { position: absolute; inset: 0; }
      .blau { background: var(--blau); color: var(--weiss); }
      .gold { background: var(--gold); color: var(--blau-tief); }
      .weiss { background: var(--weiss); color: var(--blau-tief); }
      .nacht { background: #071233; color: var(--weiss); }

      /* Hintergründe im Logo-Stil */
      .hg { position: absolute; inset: 0; overflow: hidden; }
      .blau .hg { background: radial-gradient(130% 85% at 12% 6%, #2a6ddc 0%, #0e48b6 32%, #0a3a9e 58%, #052464 100%); }
      .gold .hg { background: radial-gradient(130% 85% at 12% 6%, #ffe68a 0%, #f8ca3e 38%, #f1b91f 68%, #d79b08 100%); }
      .weiss .hg { background: radial-gradient(130% 85% at 12% 6%, #ffffff 0%, #f4f7fd 45%, #d9e3f5 100%); }
      .nacht .hg { background: radial-gradient(120% 80% at 80% 10%, #1b2f6e 0%, #0b1a46 45%, #040b22 100%); }
      .hg-licht { position: absolute; left: -260px; top: -320px; width: 1100px; height: 1100px; border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0) 70%); }
      .weiss .hg-licht { background: radial-gradient(circle, rgba(42,109,220,0.10) 0%, rgba(42,109,220,0) 70%); left: 500px; top: 900px; }
      .hg-raster { position: absolute; inset: 0; background: repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 2px, rgba(255,255,255,0) 2px 24px); }
      .gold .hg-raster { background: repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0 2px, rgba(255,255,255,0) 2px 24px); }
      .weiss .hg-raster { background: repeating-linear-gradient(135deg, rgba(10,58,158,0.035) 0 2px, rgba(10,58,158,0) 2px 24px); }
      .hg-band { position: absolute; left: 0; top: 1330px; width: 1080px; height: 600px; overflow: visible; }
      .hg-band path { fill: none; }
      .hg-band .rand { stroke: #062a75; stroke-width: 118; }
      .hg-band .st { stroke-width: 30; }

      /* Text nur im Band 270–1300 px, rechts 160 px frei (TikTok-Leiste) */
      .band { position: absolute; left: 80px; right: 160px; top: 270px; height: 1030px; display: flex; flex-direction: column; justify-content: center; }
      .band.oben { justify-content: flex-start; top: 290px; }
      .d { font-family: var(--display); text-transform: uppercase; letter-spacing: -0.015em; line-height: 1.02; }
      .s { font-family: var(--body); font-weight: 800; letter-spacing: -0.01em; line-height: 1.2; }
      .fs44 { font-size: 44px; } .fs48 { font-size: 48px; } .fs52 { font-size: 52px; } .fs56 { font-size: 56px; } .fs60 { font-size: 60px; }
      .fs64 { font-size: 64px; } .fs72 { font-size: 72px; } .fs80 { font-size: 80px; } .fs96 { font-size: 96px; } .fs104 { font-size: 104px; }
      .fs110 { font-size: 110px; } .fs120 { font-size: 120px; } .fs150 { font-size: 150px; }
      .goldtext { color: var(--gold); } .blau-t { color: var(--blau-tief); } .rot-t { color: #ff6b73; } .cyan-t { color: #19d3ff; }
      .blk { display: block; }
      .kicker.blau-t { color: var(--blau-tief); }
      .kasten { background: var(--blau-tief); padding: 0 0.14em; box-decoration-break: clone; -webkit-box-decoration-break: clone; line-height: 1.12; }
      .kicker { font-family: var(--display); text-transform: uppercase; font-size: 50px; letter-spacing: 0.01em; color: var(--gold); margin-bottom: 18px; }
      .m { display: inline-block; overflow: hidden; vertical-align: top; padding-bottom: 0.08em; margin-bottom: -0.08em; }
      .w { display: inline-block; }
      .blau .g, .nacht .g { color: var(--gold); }
      .gold .g, .weiss .g { background: var(--blau-tief); color: var(--gold); padding: 0 0.12em; }

      /* 1 Hook */
      .sepia { position: absolute; inset: 0; background: linear-gradient(180deg, #2a2018 0%, #4a3a2b 55%, #6b5440 100%); }
      .stadt { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
      .ru { fill: #2c231b; }
      .schutt { fill: #241c15; }
      .hk { fill: #5d4c3c; }
      .fe { fill: #f5c22b; opacity: 0; }
      .boden { fill: #1c150f; }
      .jahr { font-size: 300px; line-height: 0.9; color: #f3e3c3; letter-spacing: -0.04em; margin-top: 10px; }
      #h-frage { font-size: 48px; line-height: 1.1; }
      #h-wunder { margin-top: 18px; opacity: 0; }
      .wie { position: absolute; left: 0; right: 0; top: 700px; text-align: center; font-size: 330px; color: var(--gold);
        text-shadow: 0 16px 60px rgba(0, 0, 0, 0.55); opacity: 0; }

      /* 2 D-Mark */
      .kalender { width: 360px; background: #ffffff; color: var(--blau-tief); text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.35); }
      .kal-kopf { background: var(--rot); color: #fff; font-family: var(--display); text-transform: uppercase; font-size: 56px; padding: 10px 0; }
      .kal-tag { font-size: 230px; line-height: 1; padding-top: 10px; }
      .kal-jahr { font-weight: 900; font-size: 52px; padding-bottom: 18px; }
      .schein { position: absolute; left: 160px; top: 960px; width: 760px; height: 380px; filter: drop-shadow(0 24px 40px rgba(0,0,0,0.4)); }
      .sch-zahl { font-family: var(--display); font-size: 170px; fill: #3a5f8f; }
      .sch-titel { font-family: var(--display); font-size: 62px; fill: #3a5f8f; }
      .sch-klein { font-family: var(--body); font-weight: 900; font-size: 34px; fill: #3a5f8f; letter-spacing: 0.08em; }

      /* 3 Erhard */
      .dokument { position: relative; width: 820px; background: #fffdf6; border: 4px solid #c9d3e6; padding: 40px 44px 50px; box-shadow: 0 24px 60px rgba(6,42,117,0.18); }
      .dok-titel { font-family: var(--display); text-transform: uppercase; font-size: 54px; margin-bottom: 26px; }
      .dok-zeile { height: 16px; background: #c9d3e6; margin: 18px 0; border-radius: 8px; }
      .dok-strich { position: absolute; left: 20px; right: 20px; top: 150px; height: 18px; background: var(--rot); border-radius: 9px; }
      .stempel-wrap { position: absolute; right: 40px; bottom: 60px; transform: rotate(-12deg); }
      .stempel { border: 10px solid var(--rot); color: var(--rot); font-size: 76px; padding: 6px 26px; background: rgba(255,255,255,0.85); }

      /* 4 Schaufenster */
      .tag-hg { position: absolute; inset: 0; background: linear-gradient(180deg, #ffd56e 0%, #f2a93b 30%, #2a6ddc 75%, #0a3a9e 100%); opacity: 0; }
      .mond { position: absolute; left: 760px; top: 170px; width: 150px; height: 150px; border-radius: 50%; background: #f3efe4; box-shadow: -30px 0 0 0 #0b1a46 inset; }
      .sonne { position: absolute; left: 740px; top: 170px; width: 190px; height: 190px; border-radius: 50%; background: #fff2b0; opacity: 0; }
      .laden { margin-top: 44px; width: 840px; }
      .markise { height: 90px; background: repeating-linear-gradient(90deg, var(--gold) 0 70px, var(--blau-tief) 70px 140px); border-radius: 0 0 24px 24px; }
      .fenster-glas { border: 16px solid #5a3a1f; border-top: 0; background: rgba(255,255,255,0.14); padding: 26px 26px 10px; }
      .regale { display: grid; grid-template-columns: repeat(3, 1fr); row-gap: 14px; }
      .ware { width: 150px; height: 150px; justify-self: center; border-bottom: 12px solid #5a3a1f; padding-bottom: 6px; }

      /* 5 Waage */
      .waage { width: 840px; height: 420px; margin: 30px 0 10px; }
      .waage-t { font-family: var(--display); font-size: 40px; fill: #ffffff; }

      /* 6 Heute */
      .de-karte { position: absolute; left: 250px; top: 930px; width: 580px; height: 707px; }
      .de-fl { fill: var(--rot); opacity: 0; }
      .de-li { fill: none; stroke: var(--gold); stroke-width: 5; stroke-dasharray: 1; }
      .zaehler { font-family: var(--body); font-weight: 900; font-size: 82px; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
      .zins { margin-top: 70px; opacity: 0; }
      .muenze { position: absolute; top: -140px; width: 100px; height: 100px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffe68a, #d79b08);
        border: 6px solid #b07d05; color: #7a5600; font-family: var(--display); font-size: 54px; display: flex; align-items: center; justify-content: center; }

      /* 7 Drei */
      .saeulen { display: flex; gap: 40px; margin-top: 60px; }
      .saeule { width: 230px; height: 420px; border: 10px solid var(--blau-tief); display: flex; align-items: center; justify-content: center; font-size: 160px; color: var(--blau-tief); background: rgba(255,255,255,0.25); }

      /* 8 Markt */
      .eu-karte { position: absolute; left: 0; top: 560px; width: 1080px; height: 1150px; }
      .eu-l path { fill: rgba(255,255,255,0.10); stroke: rgba(255,255,255,0.28); stroke-width: 1.5; }
      .eu-de { fill: var(--gold); }
      .handel { fill: none; stroke: #ffffff; stroke-width: 6; stroke-dasharray: 1; stroke-linecap: round; }
      .stadt-p { fill: var(--gold); stroke: #fff; stroke-width: 4; }
      .chip { align-self: flex-start; background: var(--gold); color: var(--blau-tief); font-family: var(--display); text-transform: uppercase; font-size: 50px; padding: 12px 28px; margin-top: 20px; }

      /* 9 Sozial */
      .balken-box { display: flex; gap: 70px; align-items: flex-end; height: 500px; margin: 30px 0 40px; }
      .bal { width: 300px; display: flex; flex-direction: column; align-items: stretch; }
      .bal-saeule { width: 100%; }
      #so-b1 { height: 440px; } #so-b2 { height: 230px; }
      .blau-bg { background: var(--blau-tief); } .weiss-bg { background: #ffffff; }
      .bal-l { font-family: var(--display); text-transform: uppercase; font-size: 40px; text-align: center; margin-top: 14px; }
      .netz { position: absolute; left: 0; top: 1330px; width: 1080px; height: 420px; overflow: visible; }
      #so-netz, #so-netz2 { stroke-dasharray: 1; }

      /* 10 Bremse */
      .gg-zeile { display: flex; align-items: center; gap: 50px; margin: 20px 0 40px; }
      .buch { width: 250px; height: 330px; background: #0c2c6e; border: 8px solid var(--gold); border-radius: 6px 18px 18px 6px; display: flex; align-items: center; justify-content: center;
        box-shadow: 14px 14px 0 rgba(0,0,0,0.25); }
      .buch-t { font-family: var(--display); text-transform: uppercase; font-size: 46px; color: var(--gold); text-align: center; line-height: 1.05; }
      .bip-l { font-size: 38px; margin-bottom: 12px; }
      .bip-bar { position: relative; width: 840px; height: 64px; background: #ffffff; }
      .bip-sliver { position: absolute; right: 0; top: -14px; width: 4px; height: 92px; background: var(--rot); box-shadow: 0 0 0 6px rgba(221,10,26,0.25); }
      #br-zahl { margin-top: 26px; }

      /* 11 Widerspruch */
      .glitch-box { position: relative; height: 330px; }
      .glitch { position: absolute; left: 0; top: 0; font-size: 150px; }
      .pfeil-zeile { display: flex; align-items: center; gap: 26px; margin-top: 40px; }
      .pfeil { font-size: 90px; line-height: 1; }

      /* 12 Antwort */
      .kurve { position: absolute; left: 0; top: 880px; width: 1080px; height: 760px; }
      #an-li { stroke-dasharray: 1; }
      .kurve-t { font-family: var(--body); font-weight: 900; font-size: 46px; fill: #ffffff; }
      .unten-satz { position: absolute; left: 80px; right: 160px; top: 720px; z-index: 3; }

      /* 13 Steuern */
      .steuer { display: flex; align-items: center; gap: 34px; margin: 30px 0; }
      .haken-k { width: 140px; height: 140px; flex: none; display: flex; align-items: center; justify-content: center; font-family: var(--display); font-size: 100px; }
      .ja { background: var(--blau-tief); color: var(--gold); } .nein { background: var(--rot); color: #ffffff; }

      /* 14 Frage */
      .split { position: absolute; left: 0; width: 1080px; height: 960px; display: flex; flex-direction: column; padding: 0 160px 0 80px; }
      .oben-h { top: 0; background: linear-gradient(160deg, #2a6ddc, #0a3a9e 60%, #062a75); color: #fff; justify-content: flex-end; padding-bottom: 140px; }
      .unten-h { top: 960px; background: linear-gradient(160deg, #ffe68a, #f1b91f 60%, #d79b08); color: var(--blau-tief); justify-content: flex-start; padding-top: 110px; }
      .split-t { font-size: 112px; line-height: 0.98; }
      .oder { position: absolute; left: 380px; top: 860px; width: 200px; height: 200px; border-radius: 50%; background: var(--rot); color: #fff; font-size: 58px;
        display: flex; align-items: center; justify-content: center; box-shadow: 0 16px 40px rgba(0,0,0,0.35); }
      .jetzt { position: absolute; left: 80px; top: 280px; font-size: 62px; color: var(--gold); }
      .komm { position: absolute; left: 80px; top: 400px; display: flex; align-items: center; gap: 22px; color: #fff; font-size: 46px; }
      .komm svg { width: 90px; height: 90px; }
      .fr-logo { position: absolute; left: 80px; top: 1570px; width: 200px; height: 200px; box-shadow: 0 16px 40px rgba(0,0,0,0.35); }

      /* Schwarz-Rot-Gold-Wischer */
      #band-wrap { position: absolute; left: -400px; top: -300px; width: 1880px; height: 2520px; transform: rotate(-14deg); }
      #band-zug { position: absolute; inset: 0; }
      .streifen { position: absolute; left: 0; width: 1880px; height: 840px; }
      #st-schwarz { top: 0; background: var(--schwarz); } #st-rot { top: 840px; background: var(--rot); } #st-gold { top: 1680px; background: var(--gold); }
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

      %%AUDIO%%
    </div>

    <script>
      const W = %%W%%;
      const S = %%S%%;
      const SLOT = %%SLOT%%;
      const UE = %%UEBERGAENGE%%;
      const IDS = %%IDS%%;
      const tl = gsap.timeline({ paused: true });
      const q = (s) => document.querySelector(s);
      const qa = (s) => [...document.querySelectorAll(s)];

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
      function knall(sel, t, von = 1.6, origin = "0% 50%") {
        tl.fromTo(sel, { scale: von, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: "power4.out", transformOrigin: origin }, t);
      }
      function rein(sel, t, x = -90) {
        tl.fromTo(sel, { x, opacity: 0 }, { x: 0, opacity: 1, duration: 0.24, ease: "power4.out" }, t);
      }
      function wackeln(sel, t, staerke = 14) {
        [-1, 0.8, -0.6, 0.4, -0.2, 0].forEach((f, i) => tl.to(sel, { x: f * staerke, y: -f * staerke * 0.5, duration: 0.035, ease: "none" }, t + i * 0.035));
      }
      function zaehlen(sel, von, bis, t, d, format, ease = "power2.out") {
        const o = { v: von }, el = q(sel);
        tl.fromTo(o, { v: von }, { v: bis, duration: d, ease, onUpdate: () => { el.textContent = format(o.v); } }, t);
      }

      // Übergänge (0,3 s)
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
      // Licht wandert, Band hebt sich
      IDS.forEach((id) => {
        if (q(`#hg-${id}-licht`)) tl.fromTo(`#hg-${id}-licht`, { x: -90, y: -50 }, { x: 110, y: 60, duration: SLOT[id], ease: "none" }, S[id]);
        if (q(`#hg-${id}-band`)) tl.fromTo(`#hg-${id}-band`, { y: 50 }, { y: -14, duration: SLOT[id], ease: "power1.out" }, S[id]);
      });

      // 1 Hook: Frame 0 zeigt 1948, Ruinen und die Frage. Bei „Trümmern“ bebt alles,
      //   ab „Zehn Jahre später“ zählt das Jahr hoch und die Stadt wächst; bei „Wirtschaftswunder“ ist sie fertig.
      tl.fromTo("#h-jahr", { scale: 1.12 }, { scale: 1, duration: 0.4, ease: "power3.out", transformOrigin: "0% 50%" }, 0);
      tl.fromTo("#h-stadt", { scale: 1.06 }, { scale: 1, duration: W[5], ease: "none", transformOrigin: "50% 100%" }, 0);
      wackeln("#h-stadt", W[4], 12);
      zaehlen("#h-jahr", 1948, 1958, W[5], W[15] - W[5], (v) => String(Math.round(v)), "power1.inOut");
      const neu = qa("#h-neu .haus");
      neu.forEach((h, i) => {
        const r = h.querySelector(".hk"), ox = +r.getAttribute("x") + +r.getAttribute("width") / 2;
        tl.fromTo(h, { scaleY: 0, svgOrigin: `${ox} 1500` }, { scaleY: 1, svgOrigin: `${ox} 1500`, duration: 0.5, ease: "back.out(1.4)" }, W[5] + 0.15 + i * ((W[15] - W[5] - 0.8) / neu.length));
      });
      tl.to("#h-ruinen", { opacity: 0, duration: W[15] - W[5], ease: "none" }, W[5]);
      tl.to("#h-stadt .hk", { fill: "#1f4fb0", duration: W[15] - W[5], ease: "none" }, W[5]);
      tl.to("#h-stadt .boden", { fill: "#062a75", duration: W[15] - W[5], ease: "none" }, W[5]);
      tl.to("#h-stadt .fe", { opacity: 1, duration: 0.25, stagger: 0.004 }, W[12]);
      tl.to("#h-sepia", { opacity: 0, duration: W[15] - W[5], ease: "none" }, W[5]);
      tl.to("#h-jahr", { color: "#ffffff", duration: 0.4 }, W[14]);
      knall("#h-wunder", W[15] - 0.03, 1.8);
      tl.to(["#h-stadt", ".band.oben"].slice(0, 1), { opacity: 0.25, duration: 0.2 }, W[16] - 0.05);
      tl.to("#s-hook .band", { opacity: 0.2, duration: 0.2 }, W[16] - 0.05);
      knall("#h-wie", W[16] - 0.05, 2.4, "50% 50%");

      // 5 Die Idee: Waage kippt zum Markt und findet die Balance
      knall("#id-k", W[42], 1.3);
      knall("#id-t1", W[45] - 0.03, 1.7); knall("#id-t2", W[46] - 0.03, 1.7);
      tl.fromTo("#id-balken", { rotation: 0, svgOrigin: "420 118" }, { rotation: -10, svgOrigin: "420 118", duration: 0.4, ease: "power3.out" }, W[47]);
      tl.to("#id-balken", { rotation: 0, svgOrigin: "420 118", duration: 0.7, ease: "elastic.out(1, 0.45)" }, W[49]);
      ["#id-links", "#id-rechts"].forEach((p, i) => {
        const pivot = i ? "730 126" : "110 126";
        tl.fromTo(p, { rotation: 0, svgOrigin: pivot }, { rotation: 10, svgOrigin: pivot, duration: 0.4, ease: "power3.out" }, W[47]);
        tl.to(p, { rotation: 0, svgOrigin: pivot, duration: 0.7, ease: "elastic.out(1, 0.45)" }, W[49]);
      });
      woerter("#id-satz", W[47], W[52] + 0.4 - W[47]);

      // 6 Heute: Karte zeichnet sich, Schulden zählen hoch, Münzen fallen
      knall("#ht-k", W[53] - 0.05, 1.4);
      zeichnen("#ht-de", W[53], 1.0);
      zaehlen("#ht-zahl", 0, 2500000000000, W[55], W[59] - W[55] + 0.3, (v) => Math.round(v).toLocaleString("de-DE"), "power3.out");
      tl.to("#ht-de-fl", { opacity: 0.4, duration: W[59] - W[55], ease: "power1.in" }, W[55]);
      rein("#ht-zl", W[59] - 0.05);
      tl.fromTo("#ht-zins", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power4.out" }, W[60]);
      qa(".muenze").forEach((m, i) => tl.fromTo(m, { y: 0, rotation: 0 }, { y: 1500 + (i % 3) * 60, rotation: 180 + i * 40, duration: 0.9, ease: "bounce.out" }, W[62] + i * 0.12));
      knall("#ht-jahr", W[69] - 0.05, 1.8);
      wackeln("#b-heute", W[70], 10);

      // 7 Drei Dinge gleichzeitig: drei leere Säulen
      knall("#dr-k", W[71] - 0.05, 1.3);
      knall("#dr-t", W[73] - 0.05, 1.5);
      [0, 1, 2].forEach((i) => tl.fromTo(`#dr-s${i}`, { scaleY: 0 }, { scaleY: 1, duration: 0.3, ease: "back.out(1.8)", transformOrigin: "50% 100%" }, W[74] + i * 0.12));

      // 8 Freier Markt: Europa, Handelslinien ab Frankfurt
      knall("#mk-k", W[77] - 0.05, 1.4);
      tl.fromTo("#mk-de", { opacity: 0.3 }, { opacity: 1, duration: 0.3 }, W[78]);
      rein("#mk-c1", W[78] + 0.25); rein("#mk-c2", W[78] + 0.5); rein("#mk-c3", W[78] + 0.75);
      zeichnen(".handel", W[78] + 0.3, 0.45, 0.06);
      qa(".stadt-p").forEach((p, i) => tl.fromTo(p, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.2, ease: "back.out(3)" }, W[78] + 0.6 + i * 0.06));

      // 9 Soziale Sicherheit: Balken wachsen, Figur fällt ins Netz
      knall("#so-k", W[87] - 0.05, 1.3);
      tl.fromTo("#so-b2", { scaleY: 0 }, { scaleY: 1, duration: 0.35, ease: "power4.out", transformOrigin: "50% 100%" }, W[88]);
      tl.fromTo("#so-b1", { scaleY: 0 }, { scaleY: 1, duration: 0.45, ease: "back.out(1.6)", transformOrigin: "50% 100%" }, W[88] + 0.25);
      woerter("#so-satz", W[89], 0.6);

      // 10 Schuldenbremse: Grundgesetz, 2009, 0,35 %
      knall("#br-k", W[103] - 0.05, 1.3);
      tl.fromTo("#br-buch", { y: -500, rotation: -20 }, { y: 0, rotation: 0, duration: 0.45, ease: "bounce.out" }, W[105] - 0.1);
      knall("#br-seit", W[105] + 0.35, 1.6);
      rein("#br-bar", W[112] - 0.05, -120);
      tl.fromTo("#br-sliver", { scaleY: 0 }, { scaleY: 1, duration: 0.25, ease: "back.out(3)", transformOrigin: "50% 100%" }, W[117]);
      knall("#br-zahl", W[118] - 0.05, 2.0);
      rein("#br-zl", W[120] - 0.05);

      // 11 Widerspruch: Glitch, dann die zwei Pfeile
      ["#wi-r", "#wi-b"].forEach((g, i) => {
        [6, -10, 8, -4, 0].forEach((x, k) => tl.to(g, { x: (i ? -1 : 1) * x, y: (i ? 1 : -1) * x * 0.4, duration: 0.05, ease: "none" }, W[126] + k * 0.05));
      });
      knall("#wi-t", W[126] - 0.05, 1.5);
      tl.fromTo(["#wi-r", "#wi-b"], { opacity: 0 }, { opacity: 0.85, duration: 0.05 }, W[126] - 0.05);
      rein("#wi-1", W[127] - 0.05); rein("#wi-2", W[131] - 0.05);

      // 12 Antwort: Wachstum statt Kredit, Kurve steigt
      knall("#an-k", W[134] - 0.05, 1.3);
      knall("#an-1", W[138] - 0.05, 1.8); knall("#an-2", W[139] - 0.05, 1.5);
      zeichnen("#an-li", W[141], 1.2);
      tl.fromTo("#an-fl", { opacity: 0 }, { opacity: 0.18, duration: 1.2 }, W[141]);
      knall("#an-l1", W[143] - 0.1, 1.4, "50% 50%"); knall("#an-l2", W[147] - 0.1, 1.4, "50% 50%");
      woerter("#an-satz", W[150], W[154] + 0.3 - W[150]);

      // 14 Frage: Bild teilt sich in zwei Antworten
      knall("#fr-jetzt", W[159] - 0.05, 1.5);
      tl.fromTo("#fr-oben", { yPercent: -100 }, { yPercent: 0, duration: 0.35, ease: "power4.out" }, W[161]);
      tl.fromTo("#fr-unten", { yPercent: 100 }, { yPercent: 0, duration: 0.35, ease: "power4.out" }, W[165] - 0.1);
      tl.fromTo("#fr-oder", { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2.4)" }, W[165]);
      tl.fromTo("#fr-komm", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power4.out" }, W[172] - 0.05);
      tl.fromTo("#fr-logo", { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" }, W[172]);
      [0, 0.7].forEach((dt) => {
        tl.to("#fr-oder", { scale: 1.12, duration: 0.15, ease: "power2.out" }, W[175] + 0.5 + dt);
        tl.to("#fr-oder", { scale: 1, duration: 0.25, ease: "power2.inOut" }, W[175] + 0.65 + dt);
      });

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
