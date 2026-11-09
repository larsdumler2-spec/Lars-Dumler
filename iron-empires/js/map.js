'use strict';
/* ==========================================================================
   Iron Empires – Interaktive SVG-Karte (Zoom, Verschieben, Kartenmodi)
   ========================================================================== */
const NS = 'http://www.w3.org/2000/svg';
const MAP_W = HW * (COLS + 0.5) + 12, MAP_H = HEX * 1.5 * ROWS + HEX + 12;
const HEXPTS = [0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 180 * (60 * k - 30); return [HEX * Math.cos(a), HEX * Math.sin(a)]; });
const hexPoints = (x, y, s = 1) => HEXPTS.map(([dx, dy]) => `${(x + dx * s).toFixed(2)},${(y + dy * s).toFixed(2)}`).join(' ');
const TERR_COL = { p: '#8d9a62', f: '#4f7a46', m: '#8c7c68', w: '#5d7f70', u: '#9a9a92' };
const FAC_COLS = ['#c2463b', '#3d7bd1', '#c9a227', '#5aa36a', '#9a5bc4', '#d0763b'];

function el(tag, attrs = {}, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}
function mix(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

const MapView = {
  mode: 'pol', view: { x: 0, y: 0, w: MAP_W, h: MAP_H }, hexEls: [], armyDirty: true,
  init(svg) {
    this.svg = svg; svg.innerHTML = '';
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const defs = el('defs', {}, svg);
    defs.innerHTML = `
      <radialGradient id="seaGrad" cx="45%" cy="40%" r="75%"><stop offset="0" stop-color="#1d3a52"/><stop offset="1" stop-color="#0c1b29"/></radialGradient>
      <pattern id="seaWaves" width="22" height="12" patternUnits="userSpaceOnUse"><path d="M0 6 q5.5 -4 11 0 t11 0" fill="none" stroke="#2a4b66" stroke-width=".5" opacity=".55"/></pattern>
      <pattern id="occ" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="4" fill="rgba(10,10,14,.42)"/></pattern>
      <pattern id="civil" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="2" height="5" fill="rgba(200,40,40,.35)"/></pattern>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="landShadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="#000" flood-opacity=".55"/></filter>
      <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#f2d27a"/></marker>
      <marker id="arrowR" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#e05a4a"/></marker>`;
    el('rect', { x: -400, y: -400, width: MAP_W + 800, height: MAP_H + 800, fill: 'url(#seaGrad)' }, svg);
    el('rect', { x: -400, y: -400, width: MAP_W + 800, height: MAP_H + 800, fill: 'url(#seaWaves)' }, svg);
    this.gLand = el('g', { filter: 'url(#landShadow)' }, svg);
    this.gHex = el('g', { class: 'hexes' }, this.gLand);
    this.gOcc = el('g', { class: 'occ', 'pointer-events': 'none' }, svg);
    this.pCoast = el('path', { class: 'coast', fill: 'none' }, svg);
    this.pBorder = el('path', { class: 'border', fill: 'none' }, svg);
    this.pFront = el('path', { class: 'front', fill: 'none' }, svg);
    this.pSelC = el('path', { class: 'selcountry', fill: 'none' }, svg);
    this.gCity = el('g', { class: 'cities' }, svg);
    this.gLabel = el('g', { class: 'labels', 'pointer-events': 'none' }, svg);
    this.gPath = el('g', { class: 'paths', 'pointer-events': 'none' }, svg);
    this.gBattle = el('g', { class: 'battles', 'pointer-events': 'none' }, svg);
    this.gArmy = el('g', { class: 'armies' }, svg);
    this.selHex = el('polygon', { class: 'selhex', points: '' }, svg);
    this.hexEls = [];
    for (const p of PROV) {
      if (!p.land && !p.waste) continue;
      const poly = el('polygon', { points: hexPoints(p.x, p.y, 1.02), 'data-i': p.i, class: p.waste ? 'waste' : 'hex' }, this.gHex);
      this.hexEls[p.i] = poly;
    }
    for (const p of PROV) if (p.city) {
      const g = el('g', { class: 'city' + (p.cap ? ' capital' : '') + (p.vp >= 5 ? ' big' : ''), 'data-i': p.i }, this.gCity);
      if (p.cap) el('path', { d: starPath(p.x, p.y, 2.6, 1.1), class: 'star' }, g);
      else el('circle', { cx: p.x, cy: p.y, r: p.vp >= 5 ? 1.5 : 1.05 }, g);
      const t = el('text', { x: p.x, y: p.y - 2.8, class: 'cname' }, g); t.textContent = p.city;
    }
    this.bindInput();
    this.fit();
    this.refresh(true);
  },
  fit() {
    const r = this.svg.getBoundingClientRect(); const ar = (r.width || 1) / (r.height || 1);
    let w = MAP_W * .62, h = w / ar; if (h > MAP_H) { h = MAP_H; w = h * ar; }
    this.view = { x: MAP_W * .2, y: MAP_H * .22, w, h };
    if (G && C(G.player)) this.centerOn(C(G.player).cap, w);
    this.apply();
  },
  centerOn(i, w) {
    const p = PROV[i]; const r = this.svg.getBoundingClientRect(); const ar = (r.width || 1) / (r.height || 1);
    w = w || this.view.w; const h = w / ar;
    this.view = { x: p.x - w / 2, y: p.y - h / 2, w, h }; this.apply();
  },
  apply() {
    const v = this.view;
    v.w = clamp(v.w, 90, MAP_W * 1.4);
    const r = this.svg.getBoundingClientRect(); v.h = v.w / ((r.width || 1) / (r.height || 1));
    v.x = clamp(v.x, -v.w * .5, MAP_W - v.w * .5); v.y = clamp(v.y, -v.h * .5, MAP_H - v.h * .5);
    this.svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
    this.svg.classList.toggle('z1', v.w < 520); this.svg.classList.toggle('z2', v.w < 300);
  },
  zoom(f, cx, cy) {
    const v = this.view; const r = this.svg.getBoundingClientRect();
    const px = cx == null ? .5 : (cx - r.left) / r.width, py = cy == null ? .5 : (cy - r.top) / r.height;
    const mx = v.x + v.w * px, my = v.y + v.h * py;
    v.w *= f; v.h *= f; v.x = mx - v.w * px; v.y = my - v.h * py; this.apply();
  },
  bindInput() {
    const svg = this.svg; const ptrs = new Map(); let drag = null, moved = 0, pinch = null;
    svg.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
    svg.addEventListener('pointerdown', e => {
      svg.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y, target: e.target, btn: e.button }; moved = 0; }
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: this.view.w }; drag = null; moved = 99; }
    });
    svg.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        const f = (pinch.w * pinch.d / Math.max(10, d)) / this.view.w; this.zoom(f, (a.x + b.x) / 2, (a.y + b.y) / 2); return;
      }
      if (!drag) return;
      const r = svg.getBoundingClientRect(); const s = this.view.w / r.width;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      if (moved > 5) { this.view.x = drag.vx - dx * s; this.view.y = drag.vy - dy * s; this.apply(); svg.classList.add('dragging'); }
    });
    const end = e => {
      ptrs.delete(e.pointerId); svg.classList.remove('dragging');
      if (ptrs.size < 2) pinch = null;
      if (drag && moved <= 5 && ptrs.size === 0) this.click(drag.target, drag.btn === 2, e);
      if (ptrs.size === 0) drag = null;
    };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = null; pinch = null; });
    svg.addEventListener('contextmenu', e => e.preventDefault());
  },
  hexAt(e) {
    const pt = this.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = this.svg.getScreenCTM(); if (!m) return -1;
    const p = pt.matrixTransform(m.inverse()); let best = -1, bd = 1e9;
    for (const q of PROV) if (q.land) { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; best = q.i; } }
    return bd < HEX * HEX * 1.2 ? best : -1;
  },
  click(target, right, e) {
    const ag = target.closest && target.closest('.army');
    if (ag && !right) { UI.selectArmy(+ag.dataset.id, e.shiftKey); return; }
    const i = target.dataset && target.dataset.i != null ? +target.dataset.i : this.hexAt(e);
    if (i < 0 || !PROV[i] || !PROV[i].land) { UI.clearSel(); return; }
    UI.hexClicked(i, right);
  },
  colorOf(i) {
    const p = G.prov[i]; const c = C(p.ctl);
    switch (this.mode) {
      case 'ide': return IDEOLOGIES[c.ide].col;
      case 'fac': { const f = factionOf(p.ctl); if (!f) return p.ctl === G.player ? '#bfa76a' : '#55595f'; return FAC_COLS[f.id % FAC_COLS.length]; }
      case 'ter': return TERR_COL[PROV[i].terrain];
      case 'ind': { const v = p.civ + p.mil; return v === 0 ? '#3b3f45' : mix('#4a5560', p.mil > p.civ ? '#e0703a' : '#e8c35a', Math.min(1, v / 10)); }
      case 'dip': {
        if (p.ctl === G.player) return '#d6b25e';
        if (atWar(G.player, p.ctl)) return '#c0392b';
        if (allied(G.player, p.ctl)) return '#3f7fcf';
        const r = rel(G.player, p.ctl); return r >= 0 ? mix('#666b70', '#5fb36b', r / 100) : mix('#666b70', '#d06a3a', -r / 100);
      }
      case 'sup': {
        if (!G._sup || !G._sup[G.player]) return p.ctl === G.player || allied(G.player, p.ctl) ? '#5fa86b' : '#45494e';
        return G._sup[G.player][i] ? '#5fa86b' : (p.ctl === G.player ? '#c0392b' : '#45494e');
      }
      default: return c.col;
    }
  },
  refresh(force) {
    if (!G) return;
    if (G.mapDirty || force) {
      G.mapDirty = false;
      let occ = '';
      for (const i of LAND) {
        const e = this.hexEls[i]; if (!e) continue;
        const col = this.colorOf(i); e.setAttribute('fill', col); e.setAttribute('stroke', shade(col, -.18));
        const p = G.prov[i];
        if (this.mode === 'pol' && p.ctl !== p.own) occ += `<polygon points="${hexPoints(PROV[i].x, PROV[i].y, 1.02)}" fill="url(#occ)"/>`;
        if (this.mode === 'pol' && G.scw && p.own === 'SPA') occ += `<polygon points="${hexPoints(PROV[i].x, PROV[i].y, 1.02)}" fill="url(#civil)"/>`;
      }
      for (const p of PROV) if (p.waste && this.hexEls[p.i]) { this.hexEls[p.i].setAttribute('fill', '#3a3d40'); this.hexEls[p.i].setAttribute('stroke', '#34373a'); }
      this.gOcc.innerHTML = occ;
      this.drawBorders(); this.drawLabels();
    }
    this.drawFronts();
    this.drawArmies(); this.drawSelection();
  },
  edge(i, j) {
    const a = PROV[i]; let bx, by;
    if (j >= 0) { bx = PROV[j].x; by = PROV[j].y; }
    else { const k = PROV[i].all.indexOf(j); return null; }
    const ang = Math.atan2(by - a.y, bx - a.x), r = HEX;
    const x1 = a.x + r * Math.cos(ang - Math.PI / 6), y1 = a.y + r * Math.sin(ang - Math.PI / 6);
    const x2 = a.x + r * Math.cos(ang + Math.PI / 6), y2 = a.y + r * Math.sin(ang + Math.PI / 6);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`;
  },
  edgeDir(i, k) {
    // Kante in Richtung Nachbar-Index k (0..5), auch für Randfelder
    const a = PROV[i]; const odd = a.r & 1;
    const d = odd ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]] : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
    const [dc, dr] = d[k]; const nx = HW * (a.c + dc + 0.5 * ((a.r + dr) & 1)) + HW / 2 + 6, ny = HEX * 1.5 * (a.r + dr) + HEX + 6;
    const ang = Math.atan2(ny - a.y, nx - a.x), r = HEX;
    return `M${(a.x + r * Math.cos(ang - Math.PI / 6)).toFixed(2)} ${(a.y + r * Math.sin(ang - Math.PI / 6)).toFixed(2)}L${(a.x + r * Math.cos(ang + Math.PI / 6)).toFixed(2)} ${(a.y + r * Math.sin(ang + Math.PI / 6)).toFixed(2)}`;
  },
  drawBorders() {
    let coast = '', border = '';
    for (const i of LAND) {
      const p = PROV[i];
      p.all.forEach((j, k) => {
        if (j < 0 || !PROV[j].land) { coast += this.edgeDir(i, k); return; }
        if (j < i) return;
        if (G.prov[j].ctl !== G.prov[i].ctl) border += this.edgeDir(i, k);
      });
    }
    this.pCoast.setAttribute('d', coast); this.pBorder.setAttribute('d', border);
  },
  drawFronts() {
    let d = '';
    if (G.wars.length) for (const i of LAND) for (let k = 0; k < 6; k++) {
      const j = PROV[i].all[k]; if (j < 0 || j < i || !PROV[j].land) continue;
      if (atWar(G.prov[i].ctl, G.prov[j].ctl)) d += this.edgeDir(i, k);
    }
    if (d !== this._front) { this.pFront.setAttribute('d', d); this._front = d; }
  },
  drawLabels() {
    const groups = {};
    for (const i of LAND) { const id = G.prov[i].ctl; (groups[id] = groups[id] || []).push(i); }
    let html = '';
    for (const id in groups) {
      // größte zusammenhängende Fläche
      const set = new Set(groups[id]), seen = new Set(); let best = [];
      for (const s of groups[id]) {
        if (seen.has(s)) continue; const comp = [], q = [s]; seen.add(s);
        while (q.length) { const x = q.pop(); comp.push(x); for (const j of PROV[x].nb) if (set.has(j) && !seen.has(j)) { seen.add(j); q.push(j); } }
        if (comp.length > best.length) best = comp;
      }
      if (best.length < 2) continue;
      let mx = 0, my = 0; for (const i of best) { mx += PROV[i].x; my += PROV[i].y; } mx /= best.length; my /= best.length;
      let sxx = 0, syy = 0, sxy = 0; for (const i of best) { const dx = PROV[i].x - mx, dy = PROV[i].y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
      let ang = .5 * Math.atan2(2 * sxy, sxx - syy) * 180 / Math.PI;
      const l1 = (sxx + syy) / 2 + Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy), l2 = (sxx + syy) / 2 - Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
      if (l1 < l2 * 2.2) ang = 0; ang = clamp(ang, -65, 65);
      // nächstgelegenes Feld zum Schwerpunkt (für konkave Formen)
      let cx = mx, cy = my; if (!best.some(i => (PROV[i].x - mx) ** 2 + (PROV[i].y - my) ** 2 < HEX * HEX)) { let bd = 1e9; for (const i of best) { const d = (PROV[i].x - mx) ** 2 + (PROV[i].y - my) ** 2; if (d < bd) { bd = d; cx = PROV[i].x; cy = PROV[i].y; } } }
      const name = C(id).s.toUpperCase();
      const len = Math.sqrt(l1 / best.length) * 3.4 + HEX * 1.5;
      const fs = clamp(Math.min(len / (name.length * .62), Math.sqrt(best.length) * 2.6), 4.2, 19);
      html += `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" transform="rotate(${ang.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" font-size="${fs.toFixed(1)}" letter-spacing="${(fs * .12).toFixed(2)}" class="clabel${id === G.player ? ' me' : ''}">${name}</text>`;
    }
    this.gLabel.innerHTML = html;
  },
  armyPos(a) {
    if (a.inv) { const f = PROV[a.inv.from], t = PROV[a.inv.to]; const tot = a.inv.tot || 20; const k = clamp(1 - a.inv.days / tot, 0, 1); return [f.x + (t.x - f.x) * k, f.y + (t.y - f.y) * k]; }
    const p = PROV[a.prov];
    if (a.path.length) { const n = PROV[a.path[0]]; const k = clamp(a.prog / moveDays(a, a.path[0]), 0, 1) * .5; return [p.x + (n.x - p.x) * k, p.y + (n.y - p.y) * k]; }
    return [p.x, p.y];
  },
  drawArmies() {
    const sel = new Set(UI.selArmies());
    const stackIdx = {}; let html = '', paths = '';
    const visible = G.armies.filter(a => a.divs.length);
    for (const a of visible) {
      const key = a.inv ? 'sea' + a.id : a.prov; const k = stackIdx[key] = (stackIdx[key] || 0) + 1;
      let [x, y] = this.armyPos(a); const o = Math.min(k - 1, 3); x += o * 2.2; y -= o * 2.2;
      const c = C(a.owner), me = a.owner === G.player, enemy = atWar(G.player, a.owner), s = sel.has(a.id);
      const org = armyOrg(a), str = armyStr(a) / 100;
      html += `<g class="army${me ? ' mine' : ''}${enemy ? ' enemy' : ''}${s ? ' sel' : ''}${a.inv ? ' atsea' : ''}" data-id="${a.id}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">`
        + `<rect x="-6.2" y="-4.2" width="12.4" height="8.4" rx="1.4" fill="${c.col}" class="abox"/>`
        + `<rect x="-6.2" y="-4.2" width="3.2" height="8.4" rx="1" fill="${shade(c.col, -.35)}"/>`
        + (a.inv ? `<path d="M-5.2 1.2 h4 l-.8 1.6 h-2.4z" fill="#fff"/>` : `<path d="M-5.6 -1 l1 -1.6 l1 1.6 v2.4 h-2z" fill="rgba(255,255,255,.85)"/>`)
        + `<text x="1.6" y="1.9" class="adiv">${a.divs.length}</text>`
        + `<rect x="-6.2" y="4.6" width="12.4" height="1.1" fill="#1a1a1a"/><rect x="-6.2" y="4.6" width="${(12.4 * org).toFixed(2)}" height="1.1" fill="#6cc06a"/>`
        + `<rect x="-6.2" y="5.9" width="${(12.4 * str).toFixed(2)}" height=".7" fill="#e0c060"/>`
        + `</g>`;
      if ((me || s) && a.path.length && !a.inv) {
        const pts = [[x, y], ...a.path.map(i => [PROV[i].x, PROV[i].y])];
        paths += `<polyline points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" class="mpath${enemy ? ' epath' : ''}" marker-end="url(#${enemy ? 'arrowR' : 'arrow'})"/>`;
      }
      if (me && a.inv) { const t = PROV[a.inv.to]; paths += `<line x1="${x}" y1="${y}" x2="${t.x}" y2="${t.y}" class="mpath sea" marker-end="url(#arrow)"/>`; }
    }
    this.gArmy.innerHTML = html; this.gPath.innerHTML = paths;
    let b = '';
    for (const bt of G.battles) {
      const f = PROV[bt.from], t = PROV[bt.to]; const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2;
      const mine = bt.a === G.player || bt.d === G.player;
      b += `<g class="battle${mine ? ' mine' : ''}" transform="translate(${mx.toFixed(1)} ${my.toFixed(1)})"><circle r="4.2" class="bpulse"/><circle r="3.1" class="bcore"/>`
        + `<path d="M-1.8 -1.8 L1.8 1.8 M1.8 -1.8 L-1.8 1.8" class="bx"/>`
        + `<rect x="-4" y="3.6" width="8" height="1.1" fill="#223"/><rect x="-4" y="3.6" width="${(8 * bt.r).toFixed(2)}" height="1.1" fill="${bt.a === G.player || allied(G.player, bt.a) ? '#6cc06a' : '#e05a4a'}"/></g>`;
    }
    this.gBattle.innerHTML = b;
  },
  drawSelection() {
    const s = UI.sel;
    if (s && s.type === 'prov') this.selHex.setAttribute('points', hexPoints(PROV[s.i].x, PROV[s.i].y, .92)); else this.selHex.setAttribute('points', '');
    let d = '';
    const cid = UI.selCountry();
    if (cid) for (const i of LAND) { if (G.prov[i].own !== cid) continue; PROV[i].all.forEach((j, k) => { if (j < 0 || !PROV[j].land || G.prov[j].own !== cid) d += this.edgeDir(i, k); }); }
    this.pSelC.setAttribute('d', d);
  },
  setMode(m) { this.mode = m; this.refresh(true); }
};
function starPath(x, y, R, r) {
  let d = ''; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r : R; d += (k ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(2) + ' ' + (y + rr * Math.sin(a)).toFixed(2); }
  return d + 'Z';
}
