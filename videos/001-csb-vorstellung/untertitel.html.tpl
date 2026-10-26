<!-- Vorlage für build.py – erzeugt compositions/untertitel.html -->
<template>
  <style>
    #root { position: absolute; inset: 0; pointer-events: none; }
    /* Untertitel-Zone 1150–1310 px: unter dem Inhalt, über der TikTok-Beschriftung */
    .ug {
      position: absolute; left: 80px; width: 840px; top: 1150px;
      text-align: center; opacity: 0;
      font-family: "Archivo Black", sans-serif; text-transform: uppercase;
      font-size: 64px; line-height: 1.1; letter-spacing: -0.01em;
      color: #ffffff; -webkit-text-stroke: 11px #071a45; paint-order: stroke fill;
    }
    .uw { display: inline-block; margin: 0 0.22em; transform-origin: 50% 60%; }
  </style>
  <div id="root" data-composition-id="untertitel" data-width="1080" data-height="1920">
%%GRUPPEN%%
  </div>
  <script>
    const UT = %%DATEN%%;
    const tl = gsap.timeline({ paused: true });
    const fit = window.__hyperframes && window.__hyperframes.fitTextFontSize;
    UT.forEach((g, i) => {
      const el = document.getElementById(`ut-g${i}`);
      if (fit) {
        const { fontSize } = fit(el.textContent.toUpperCase(), { fontFamily: "Archivo Black", fontWeight: 400, maxWidth: 840 / 1.1 });
        el.style.fontSize = Math.min(fontSize, 68) + "px";
      }
      tl.fromTo(el, { opacity: 0, scale: 0.86, y: 24 }, { opacity: 1, scale: 1, y: 0, duration: 0.14, ease: "back.out(2)" }, g.s);
      g.w.forEach(([s], j) => {
        const wEl = document.getElementById(`ut-g${i}-w${j}`);
        const weiter = j + 1 < g.w.length ? g.w[j + 1][0] : g.e;
        tl.set(wEl, { color: "#f5c22b" }, s);
        tl.fromTo(wEl, { scale: 1.08 }, { scale: 1, duration: 0.16, ease: "power2.out" }, s);
        tl.set(wEl, { color: "#ffffff" }, weiter);
      });
      tl.to(el, { opacity: 0, duration: 0.08, ease: "power2.in" }, g.e - 0.08);
      tl.set(el, { opacity: 0, visibility: "hidden" }, g.e);
    });
    window.__timelines["untertitel"] = tl;
  </script>
</template>
