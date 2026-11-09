'use strict';
/* ==========================================================================
   Iron Empires – Benutzeroberfläche & Spielschleife
   ========================================================================== */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const ic = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const pct = v => Math.round(v) + ' %';
const SPEEDS = [0, 900, 450, 220, 100, 35];
const SAVE_KEY = 'ironempires_v1_';

function emblem(id, size = 30) {
  const c = CD[id] ? (G && G.C[id] ? G.C[id] : CD[id]) : null; if (!c) return '';
  const col = c.col, dark = shade(col, -.45), light = shade(col, .35);
  const ide = G && G.C[id] ? G.C[id].ide : CD[id].ide;
  return `<svg class="emblem" width="${size}" height="${size * 1.15}" viewBox="0 0 40 46" aria-hidden="true">
    <path d="M20 2 L37 7 V22 C37 34 29 41 20 44 C11 41 3 34 3 22 V7 Z" fill="${col}" stroke="#d9c38a" stroke-width="1.6"/>
    <path d="M3.6 16 H36.4 V24 H3.6 Z" fill="${dark}" opacity=".55"/>
    <path d="M20 2 L37 7 V10 L20 5 L3 10 V7 Z" fill="${light}" opacity=".5"/>
    <circle cx="20" cy="33" r="4.2" fill="${IDEOLOGIES[ide].col}" stroke="#d9c38a" stroke-width="1"/>
    <text x="20" y="22.6" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="Inter, sans-serif" letter-spacing=".5">${id}</text></svg>`;
}
function bar(v, max = 100, cls = '') { return `<span class="bar ${cls}"><i style="width:${clamp(v / max * 100, 0, 100).toFixed(1)}%"></i></span>`; }
function relLabel(r) { return r >= 60 ? 'Freundschaftlich' : r >= 25 ? 'Gut' : r > -25 ? 'Neutral' : r > -60 ? 'Angespannt' : 'Feindselig'; }
function relCls(r) { return r >= 25 ? 'pos' : r <= -25 ? 'neg' : ''; }

const UI = {
  sel: null, tab: null, buildMode: null, invMode: false, logOpen: false, unread: 0, diploSel: null, lastRender: 0,
  wasRunning: false, modalOpen: false, rightOpen: false,
  selArmies() { return this.sel && this.sel.type === 'army' ? this.sel.ids.filter(id => G.armies.some(a => a.id === id)) : []; },
  selCountry() { if (!this.sel) return null; if (this.sel.type === 'prov') return G.prov[this.sel.i].own; if (this.sel.type === 'country') return this.sel.id; return null; },

  /* ------------------------------------------------------ Start */
  start() {
    buildStatic();
    UIHOOK.toast = (t, type) => this.toast(t, type);
    UIHOOK.log = (t, type) => { if (G && G.player) { this.unread++; } };
    UIHOOK.event = () => this.checkModals();
    UIHOOK.peace = () => this.checkModals();
    UIHOOK.gameOver = win => this.gameOver(win);
    this.renderStart();
    document.addEventListener('click', e => this.onClick(e));
    document.addEventListener('input', e => this.onInput(e));
    document.addEventListener('keydown', e => this.onKey(e));
    window.addEventListener('resize', () => { if (G && MapView.svg) MapView.apply(); });
    requestAnimationFrame(t => this.loop(t));
  },
  renderStart() {
    const saves = this.listSaves();
    $('#start').innerHTML = `
      <div class="start-inner">
        <div class="title-block">
          <div class="crest">${ic('crest', 'big')}</div>
          <h1>Iron Empires</h1>
          <h2>Europa 1936 · Grand Strategy</h2>
          <p class="lead">1. Januar 1936. Europa steht am Scheideweg. Führen Sie eine der sechs Großmächte durch neun Schicksalsjahre – mit Wirtschaft, Diplomatie, Forschung und Krieg. Die Geschichte ist nicht geschrieben.</p>
        </div>
        <div class="nation-grid">
          ${PLAYABLE.map(id => { const d = CD[id]; const divs = Object.values(d.div).reduce((a, b) => a + b, 0); return `
            <button class="nation" data-act="newgame" data-id="${id}" style="--nc:${d.col}">
              <div class="n-head">${emblem(id, 38)}<div><b>${d.s}</b><small>${d.n}</small></div></div>
              <div class="n-stats">
                <span>${ic('pillar')} ${IDEOLOGIES[d.ide].n}</span><span>${ic('people')} ${fmt(d.pop, 1)} Mio.</span>
                <span>${ic('civ')} ${d.civ} Zivil</span><span>${ic('mil')} ${d.mil} Militär</span>
                <span>${ic('helmet')} ${divs} Div.</span><span>${ic('anchor')} ${d.navy[0] + d.navy[1] + d.navy[2] + d.navy[3]} Schiffe</span>
              </div>
              <p>${PLAYABLE_INFO[id]}</p>
              <span class="n-leader">Staatsführung: ${esc(d.ldr)}</span>
            </button>`; }).join('')}
        </div>
        <div class="start-foot">
          ${saves.length ? `<div class="saves"><h3>${ic('load')} Gespeicherte Spiele</h3>${saves.map(s => `<button class="btn" data-act="load" data-slot="${s.slot}">${s.slot === 'auto' ? 'Autosave' : 'Platz ' + s.slot}: ${esc(CD[s.player].s)} – ${esc(s.date)}</button>`).join('')}</div>` : ''}
          <p class="disclaimer">Eigenständiges, von klassischen Grand-Strategy-Spielen inspiriertes Projekt. Alle Grafiken und Symbole sind eigene Entwürfe. Historische Personen und Ereignisse dienen ausschließlich dem geschichtlichen Kontext.</p>
        </div>
      </div>`;
  },
  newGame(id) {
    newGame(id); this.enterGame();
    this.showModal(`<div class="modal-head">${emblem(id, 44)}<div><h2>${esc(C(id).n)}</h2><small>1. Januar 1936</small></div></div>
      <div class="modal-body"><p>${PLAYABLE_INFO[id]}</p>
      <ul class="howto">
        <li><b>Zeit:</b> ${ic('play')} startet die Zeit, Leertaste pausiert, Tasten 1–5 ändern die Geschwindigkeit. Wirtschaft, Politik und KI werden monatlich abgerechnet, Bewegungen und Gefechte täglich.</li>
        <li><b>Karte:</b> Ziehen zum Verschieben, Mausrad/zwei Finger zum Zoomen. Felder antippen zeigt Provinz- und Landesinfos.</li>
        <li><b>Armeen:</b> Armee antippen, dann Zielprovinz antippen. Ohne Landweg wird ein Seetransport angeboten.</li>
        <li><b>Menüs links:</b> Politik, Diplomatie, Wirtschaft, Militär, Forschung und Bauwesen.</li>
        <li><b>Krieg:</b> Erst einen Kriegsgrund schaffen (Diplomatie), dann den Krieg erklären. Länder kapitulieren, wenn sie zu viele Siegpunkte verlieren.</li>
      </ul></div>
      <div class="modal-actions"><button class="btn primary" data-act="closemodal">Zum Hauptquartier</button></div>`);
  },
  enterGame() {
    $('#start').hidden = true; $('#app').hidden = false;
    this.sel = null; this.tab = null; this.unread = 0;
    MapView.init($('#map'));
    this.renderAll();
  },

  /* ------------------------------------------------------ Schleife */
  loop(t) {
    requestAnimationFrame(tt => this.loop(tt));
    if (!G || $('#app').hidden) { this._last = t; return; }
    if (G.paused || this.modalOpen || G.gameOver) { this._last = t; this._acc = 0; return; }
    this._acc = (this._acc || 0) + (t - (this._last || t)); this._last = t;
    const step = SPEEDS[G.speed]; let n = 0;
    while (this._acc >= step && n < 6) {
      const m = curDate().m; advanceDay(); this._acc -= step; n++;
      if (curDate().m !== m) this.onMonth();
      if (this.modalOpen || G.paused) break;
    }
    if (this._acc > step * 6) this._acc = 0;
    if (n) this.onTick();
  },
  onTick() {
    this.renderTop(); this.renderBottom();
    MapView.refresh();
    const now = performance.now();
    if (now - this.lastRender > 300) { this.lastRender = now; this.renderRight(); if (this.tab && this.tab !== 'diplo') this.renderDrawer(true); }
    this.checkModals();
  },
  onMonth() {
    if (curDate().m % 3 === 1) this.save('auto', true);
    if (this.tab === 'diplo') this.renderDrawer(true);
  },
  setPaused(p) { G.paused = p; this.renderBottom(); },
  togglePause() { if (G.gameOver && !G.observer) return; this.setPaused(!G.paused); },

  /* ------------------------------------------------------ Rendering */
  renderAll() { this.renderTop(); this.renderLeft(); this.renderDrawer(); this.renderRight(); this.renderBottom(); this.renderMapCtl(); MapView.refresh(true); },
  renderTop() {
    const c = C(G.player); if (!c) return; const e = c.econ;
    const resChip = (k, i) => { const a = e.avail ? e.avail[i] : 0, n = e.need ? e.need[i] : 0; const bad = n > 0 && a < n * .98;
      return `<div class="chip ${bad ? 'warn' : ''}" title="${RES[k]}: verfügbar ${fmt(a, 1)} / Bedarf ${fmt(n, 1)} (Förderung ${fmt(e.prod[i], 1)}, Import ${fmt(e.imp[i], 1)})">${ic(k)}<span>${fmt(a)}</span><small>/${fmt(n)}</small></div>`; };
    $('#top').innerHTML = `
      <button class="nation-btn" data-act="tab" data-tab="pol" title="${esc(c.n)}">${emblem(G.player, 30)}<span><b>${esc(c.s)}</b><small>${IDEOLOGIES[c.ide].n}</small></span></button>
      <div class="date">${ic('calendar')}<span>${dateStr()}</span></div>
      <div class="chips">
        <div class="chip" title="Politische Macht (+${fmt(40 + mod(c, 'pp') + (c.stab > 70 ? 5 : 0))}/Monat)">${ic('pp')}<span>${fmt(c.pp)}</span></div>
        <div class="chip ${c.stab < 35 ? 'warn' : ''}" title="Stabilität">${ic('stab')}<span>${pct(c.stab)}</span></div>
        <div class="chip" title="Kriegsunterstützung">${ic('ws')}<span>${pct(c.ws)}</span></div>
        <div class="chip" title="Zivilfabriken: ${fmt(e.civAvail, 1)} verfügbar von ${fmt(e.civ, 1)} (Konsumgüter ${pct(e.cons * 100)})">${ic('civ')}<span>${fmt(e.civAvail)}</span><small>/${fmt(e.civ)}</small></div>
        <div class="chip" title="Militärfabriken (Effizienz ${pct(c.eff * 100)})${c.lend ? ' + ' + c.lend + ' Leihlieferungen' : ''}">${ic('mil')}<span>${fmt(e.mil + c.lend)}</span></div>
        <div class="chip" title="Personal (rekrutierbar)">${ic('people')}<span>${fmt(c.mp)}k</span></div>
        <div class="chip" title="Ausrüstung im Depot">${ic('crate')}<span>${fmt(c.eq)}</span></div>
        <div class="chip ${c.tr < 0 ? 'warn' : ''}" title="Staatskasse (Einnahmen ${fmt(e.income)} / Ausgaben ${fmt(e.expense)} pro Monat)">${ic('coin')}<span>${fmt(c.tr)}</span></div>
        ${['steel', 'oil', 'alu', 'rubber'].map(resChip).join('')}
        <div class="chip tension" title="Weltspannung – bestimmt, welche Regierungen Kriegsgründe schaffen dürfen">${ic('globe')}<span>${pct(G.tension)}</span></div>
      </div>`;
  },
  renderLeft() {
    const tabs = [['pol', 'pillar', 'Politik'], ['diplo', 'hand', 'Diplomatie'], ['eco', 'chart', 'Wirtschaft'], ['mil', 'helmet', 'Militär'], ['res', 'flask', 'Forschung'], ['build', 'crane', 'Bauwesen']];
    $('#left').innerHTML = tabs.map(([k, i, n]) => `<button class="tabbtn ${this.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" title="${n}">${ic(i)}<span>${n}</span>${k === 'res' && C(G.player).rs.some(s => !s) ? '<em class="dot"></em>' : ''}</button>`).join('');
  },
  renderMapCtl() {
    const modes = [['pol', 'Politisch'], ['ide', 'Ideologie'], ['fac', 'Bündnisse'], ['dip', 'Beziehungen'], ['ter', 'Gelände'], ['ind', 'Industrie'], ['sup', 'Versorgung']];
    $('#mapctl').innerHTML = `
      <div class="zoom"><button data-act="zoom" data-f="0.8" title="Hineinzoomen">+</button><button data-act="zoom" data-f="1.25" title="Herauszoomen">−</button><button data-act="fit" title="Zur Hauptstadt">${ic('target')}</button></div>
      <div class="modes">${modes.map(([k, n]) => `<button class="${MapView.mode === k ? 'on' : ''}" data-act="mapmode" data-m="${k}">${n}</button>`).join('')}</div>
      ${this.buildMode ? `<div class="banner">${ic('crane')} ${BUILD[this.buildMode].n}: eigene Provinz antippen <button data-act="buildmode" data-t="">Beenden</button></div>` : ''}
      ${this.invMode ? `<div class="banner">${ic('anchor')} Seetransport: Ziel-Küstenfeld antippen <button data-act="invmode">Abbrechen</button></div>` : ''}`;
  },
  renderBottom() {
    const last = G.log[0];
    $('#bottom').innerHTML = `
      <div class="timectl">
        <button class="play ${G.paused ? '' : 'on'}" data-act="pause" title="Pause/Weiter (Leertaste)">${ic(G.paused ? 'play' : 'pause')}</button>
        <div class="speeds">${[1, 2, 3, 4, 5].map(s => `<button class="${G.speed === s ? 'on' : ''}" data-act="speed" data-s="${s}" title="Geschwindigkeit ${s}">${'›'.repeat(Math.min(s, 3))}${s > 3 ? s : ''}</button>`).join('')}</div>
      </div>
      <button class="ticker" data-act="log" title="Ereignisprotokoll">${ic('bell')}${this.unread ? `<em class="badge">${Math.min(99, this.unread)}</em>` : ''}<span class="tk-text ${last ? last.type : ''}">${last ? esc(dateStr(last.t) + ' · ' + last.text) : 'Keine Meldungen'}</span></button>
      <div class="sysbtns">
        <button data-act="quicksave" title="Schnellspeichern">${ic('save')}</button>
        <button data-act="menu" title="Menü">${ic('menu')}</button>
      </div>
      ${this.logOpen ? `<div class="logpanel"><div class="lp-head"><b>Ereignisprotokoll</b><button data-act="log">✕</button></div><ul>${G.log.slice(0, 80).map(l => `<li class="${l.type}"><time>${dateStr(l.t)}</time>${esc(l.text)}</li>`).join('')}</ul></div>` : ''}`;
  },

  /* ---------------------------------------------- Rechte Seitenleiste */
  renderRight() {
    const r = $('#right'); if (!r) return;
    const st = r.scrollTop; let h = '';
    const arms = this.selArmies();
    if (arms.length) h += this.armyCard(arms);
    else if (this.sel && this.sel.type === 'prov') h += this.provCard(this.sel.i) + this.countryCard(G.prov[this.sel.i].own);
    else if (this.sel && this.sel.type === 'country') h += this.countryCard(this.sel.id);
    else h += this.overviewCard();
    h += `<section class="card events"><h3>${ic('bell')} Aktuelle Ereignisse</h3><ul class="evlist">${G.log.filter(l => l.type !== 'info' || l.t === 0).slice(0, 10).map(l => `<li class="${l.type}"><time>${dateStr(l.t)}</time>${esc(l.text)}</li>`).join('') || '<li>–</li>'}</ul></section>`;
    r.innerHTML = `<button class="close-right" data-act="closeright">✕</button>` + h;
    r.scrollTop = st;
    document.body.classList.toggle('has-sel', !!this.sel);
  },
  overviewCard() {
    const c = C(G.player); const wars = warsOf(G.player);
    return `<section class="card"><h3>${emblem(G.player, 22)} Lagebericht</h3>
      <dl class="kv"><dt>Regierung</dt><dd>${IDEOLOGIES[c.ide].gov}</dd><dt>Staatsführung</dt><dd>${esc(c.ldr)}</dd>
      <dt>Divisionen</dt><dd>${divCount(G.player)}</dd><dt>Bündnis</dt><dd>${factionOf(G.player) ? esc(factionOf(G.player).n) : '–'}</dd>
      <dt>Kriege</dt><dd>${wars.length ? wars.map(w => esc(w.name)).join('<br>') : 'Frieden'}</dd></dl>
      <p class="hint">Tippen Sie auf eine Provinz oder Armee, um Details zu sehen.</p></section>`;
  },
  provCard(i) {
    const p = G.prov[i], P = PROV[i], own = C(p.own), ctl = C(p.ctl), mine = p.own === G.player && p.ctl === G.player;
    const here = armiesAt(i);
    return `<section class="card"><h3>${ic('pin')} ${esc(P.name)}${C(p.own).cap === i ? ' <span class="tag gold">Hauptstadt</span>' : ''}</h3>
      <dl class="kv">
        <dt>Eigentümer</dt><dd>${emblem(p.own, 14)} ${esc(own.s)}</dd>
        ${p.ctl !== p.own ? `<dt>Besetzt von</dt><dd class="neg">${emblem(p.ctl, 14)} ${esc(ctl.s)}</dd>` : ''}
        ${P.owner0 !== p.own ? `<dt>Kerngebiet von</dt><dd>${esc(CD[P.owner0].s)}</dd>` : ''}
        <dt>Gelände</dt><dd>${TERR[P.terrain].n}${P.coastal ? ' · Küste' : ''}</dd>
        <dt>Siegpunkte</dt><dd>${P.vp}</dd>
        <dt>Fabriken</dt><dd>${ic('civ')} ${p.civ} · ${ic('mil')} ${p.mil} <small>(max. ${maxFactories(i)})</small></dd>
        <dt>Infrastruktur</dt><dd>${bar(p.inf, 5)} ${p.inf}/5</dd>
        <dt>Festung</dt><dd>${bar(p.fort, 5, 'gold')} ${p.fort}/5</dd>
        <dt>Rohstoffe</dt><dd>${['steel', 'oil', 'alu', 'rubber'].map((k, n) => p.res[n] >= .3 ? `${ic(k)} ${fmt(p.res[n], 1)}` : '').join(' ') || '–'}</dd>
      </dl>
      ${mine ? `<div class="btnrow">${Object.keys(BUILD).map(t => `<button class="btn sm" data-act="buildhere" data-t="${t}" data-i="${i}" ${canBuild(G.player, t, i) ? '' : 'disabled'}>${ic(t === 'civ' ? 'civ' : t === 'mil' ? 'mil' : t === 'infra' ? 'road' : 'fort')} ${BUILD[t].n}</button>`).join('')}</div>` : ''}
      ${here.length ? `<h4>Truppen im Feld</h4>${here.map(a => `<button class="armyrow" data-act="selarmy" data-id="${a.id}">${emblem(a.owner, 14)} ${esc(a.name)} <small>${a.divs.length} Div. · Org ${pct(armyOrg(a) * 100)}</small></button>`).join('')}` : ''}
    </section>`;
  },
  countryCard(id) {
    const c = C(id); if (!c) return ''; const me = id === G.player; const f = factionOf(id);
    const r = rel(G.player, id);
    return `<section class="card"><h3>${emblem(id, 26)} ${esc(c.n)}</h3>
      <dl class="kv">
        <dt>Regierung</dt><dd><span class="ide" style="--ic:${IDEOLOGIES[c.ide].col}">${IDEOLOGIES[c.ide].n}</span></dd>
        <dt>Staatsführung</dt><dd>${esc(c.ldr)}</dd>
        <dt>Bevölkerung</dt><dd>${fmt(c.pop, 1)} Mio.</dd>
        <dt>Stabilität</dt><dd>${bar(c.stab)} ${pct(c.stab)}</dd>
        <dt>Kriegsunterst.</dt><dd>${bar(c.ws, 100, 'red')} ${pct(c.ws)}</dd>
        <dt>Industrie</dt><dd>${ic('civ')} ${fmt(c.econ.civ)} · ${ic('mil')} ${fmt(c.econ.mil)}</dd>
        <dt>Armee</dt><dd>${divCount(id)} Div. · ${fmt(c.planes)} Flugz.</dd>
        <dt>Flotte</dt><dd>${Object.keys(SHIPS).map(s => c.ships[s]).reduce((a, b) => a + b, 0)} Schiffe (Stärke ${fmt(navyPow(id))})</dd>
        <dt>Bündnis</dt><dd>${f ? esc(f.n) + (f.l === id ? ' (Führung)' : '') : '–'}</dd>
        ${c.overlord ? `<dt>Oberherr</dt><dd>${esc(C(c.overlord).s)}</dd>` : ''}
        ${!me ? `<dt>Beziehung</dt><dd class="${relCls(r)}">${relLabel(r)} (${r > 0 ? '+' : ''}${Math.round(r)})</dd>` : ''}
        ${!me ? `<dt>Status</dt><dd>${[atWar(G.player, id) ? '<span class="tag red">Krieg</span>' : '', allied(G.player, id) ? '<span class="tag blue">Verbündet</span>' : '', hasNap(G.player, id) ? '<span class="tag">Nichtangriffspakt</span>' : '', hasTrade(G.player, id) ? '<span class="tag">Handel</span>' : '', guarantees(G.player, id) ? '<span class="tag">Garantiert</span>' : '', c.wargoals.includes(G.player) ? '<span class="tag red">Kriegsgrund gegen Sie</span>' : ''].join(' ') || '–'}</dd>` : ''}
        ${inWar(id) ? `<dt>Im Krieg mit</dt><dd>${[...enemiesOf(id)].map(e => esc(C(e).s)).join(', ')}</dd>` : ''}
      </dl>
      ${!me ? `<div class="btnrow"><button class="btn sm" data-act="diplowith" data-id="${id}">${ic('hand')} Diplomatie</button></div>` : ''}
    </section>`;
  },
  armyCard(ids) {
    const arms = ids.map(id => G.armies.find(a => a.id === id)).filter(Boolean);
    const a = arms[0]; const c = C(a.owner); const mine = a.owner === G.player;
    const g = generalOf(a);
    const grouped = {}; a.divs.forEach(d => { (grouped[d.t] = grouped[d.t] || []).push(d); });
    const sameHex = G.armies.filter(x => x !== a && x.owner === a.owner && x.prov === a.prov && !x.inv && !a.inv);
    const freeGens = c.gens.filter(x => !x.army || x.army === a.id);
    return `<section class="card army-card"><h3>${emblem(a.owner, 22)} ${esc(a.name)}${arms.length > 1 ? ` <span class="tag">+${arms.length - 1} weitere</span>` : ''}</h3>
      <dl class="kv">
        <dt>Standort</dt><dd>${a.inv ? `Auf See → ${esc(PROV[a.inv.to].name)} (${a.inv.days} Tage)` : esc(PROV[a.prov].name)}</dd>
        <dt>Divisionen</dt><dd>${a.divs.length}</dd>
        <dt>Organisation</dt><dd>${bar(armyOrg(a) * 100, 100, 'green')} ${pct(armyOrg(a) * 100)}</dd>
        <dt>Stärke</dt><dd>${bar(armyStr(a), 100, 'gold')} ${pct(armyStr(a))}</dd>
        <dt>Angriff/Vert.</dt><dd>${fmt(armyPow(a, 'atk'))} / ${fmt(armyPow(a, 'def'))}</dd>
        <dt>Erfahrung</dt><dd>${fmt(a.xp)}</dd>
        <dt>Versorgung</dt><dd class="${a.sup ? 'pos' : 'neg'}">${a.sup ? 'Versorgt' : 'Abgeschnitten!'}</dd>
        <dt>Befehl</dt><dd>${a.path.length ? 'Marsch nach ' + esc(PROV[a.path[a.path.length - 1]].name) : a.inv ? 'Seetransport' : 'Stellung halten' + ((a.still || 0) > 10 ? ' (eingegraben)' : '')}</dd>
      </dl>
      <h4>General</h4>
      ${mine ? `<select class="sel" data-gen="${a.id}"><option value="">– kein General –</option>${freeGens.map(x => `<option value="${x.id}" ${a.gen === x.id ? 'selected' : ''}>${esc(x.n)} (★${x.sk}, ${TRAITS[x.tr].n})</option>`).join('')}</select>` : ''}
      ${g ? `<p class="gen">${ic('star')} <b>${esc(g.n)}</b> · Fähigkeit ${'★'.repeat(g.sk)}<br><small>${TRAITS[g.tr].n}: ${TRAITS[g.tr].d}</small></p>` : '<p class="hint">Kein General zugewiesen.</p>'}
      <h4>Verbände</h4>
      <div class="divlist">${Object.keys(grouped).map(t => { const L = grouped[t]; const s = L.reduce((x, d) => x + d.str, 0) / L.length; return `<div class="divrow"><span class="dt">${DIV[t].s}</span><span>${L.length}× ${DIV[t].n}</span>${bar(s, 100, 'gold')}</div>`; }).join('')}</div>
      ${mine ? `<div class="btnrow">
        ${a.path.length ? `<button class="btn sm" data-act="stop">${ic('pause')} Halt</button>` : ''}
        <button class="btn sm" data-act="split" ${a.divs.length < 2 || a.inv ? 'disabled' : ''}>Teilen</button>
        ${sameHex.length ? `<button class="btn sm" data-act="merge">Zusammenlegen (${sameHex.length})</button>` : ''}
        <button class="btn sm ${this.invMode ? 'on' : ''}" data-act="invmode" ${PROV[a.prov].coastal && !a.inv ? '' : 'disabled'}>${ic('anchor')} Seetransport</button>
        <button class="btn sm ${a.auto ? 'on' : ''}" data-act="autoarmy" title="Im Krieg übernimmt der Generalstab (KI) Angriffe und Frontverteilung">${ic('target')} KI-Führung ${a.auto ? 'an' : 'aus'}</button>
      </div><p class="hint">Ziel auf der Karte antippen (Desktop: Rechtsklick) um zu marschieren. Gegnerische Felder werden beim Betreten angegriffen.</p>` : ''}
    </section>`;
  },

  /* ---------------------------------------------- Linke Panels */
  renderDrawer(soft) {
    const d = $('#drawer');
    if (!this.tab) { d.classList.remove('open'); d.innerHTML = ''; this.renderLeft(); return; }
    if (soft && (document.activeElement && d.contains(document.activeElement) && document.activeElement.tagName === 'INPUT')) return;
    const st = d.querySelector('.dbody') ? d.querySelector('.dbody').scrollTop : 0;
    const titles = { pol: 'Politik', diplo: 'Diplomatie', eco: 'Wirtschaft', mil: 'Militär', res: 'Forschung', build: 'Bauwesen' };
    const body = this['panel_' + this.tab]();
    d.innerHTML = `<div class="dhead"><h2>${titles[this.tab]}</h2><button data-act="tab" data-tab="${this.tab}" title="Schließen">✕</button></div><div class="dbody">${body}</div>`;
    d.classList.add('open'); d.querySelector('.dbody').scrollTop = st;
    if (!soft) this.renderLeft();
  },
  panel_pol() {
    const c = C(G.player);
    const lawBlock = (kind, L, title) => `<h4>${title}</h4><div class="laws">${Object.keys(L).map(k => `<button class="law ${c.laws[kind] === k ? 'on' : ''}" data-act="law" data-kind="${kind}" data-v="${k}" ${c.laws[kind] === k || c.pp < 50 || (L[k].ws || 0) > c.ws ? 'disabled' : ''}><b>${L[k].n}</b><small>${L[k].d}${L[k].ws ? ` · benötigt ${L[k].ws} % Kriegsunterst.` : ''}${L[k].stab ? ` · ${L[k].stab > 0 ? '+' : ''}${L[k].stab} Stab.` : ''}</small></button>`).join('')}</div>`;
    return `<section class="card"><div class="gov">${emblem(G.player, 48)}<div><h3>${esc(c.n)}</h3><p>${IDEOLOGIES[c.ide].gov}<br>Staatsführung: <b>${esc(c.ldr)}</b></p></div></div>
      <div class="statgrid"><div>${ic('pp')}<b>${fmt(c.pp)}</b><small>Politische Macht</small></div><div>${ic('stab')}<b>${pct(c.stab)}</b><small>Stabilität</small></div><div>${ic('ws')}<b>${pct(c.ws)}</b><small>Kriegsunterstützung</small></div></div></section>
      <section class="card"><h4>Ideologische Strömungen</h4>
      ${Object.keys(IDEOLOGIES).map(k => `<div class="iderow"><span class="ide" style="--ic:${IDEOLOGIES[k].col}">${IDEOLOGIES[k].n}${k === c.ide ? ' ★' : ''}</span>${bar(c.ipop[k], 100, 'ide-' + k)}<b>${pct(c.ipop[k])}</b><button class="btn xs" data-act="prop" data-ide="${k}" ${c.pp < 40 || (c.dcd['prop_' + k] || 0) > G.tick ? 'disabled' : ''} title="Propaganda: +8 % (40 PM)">+</button></div>`).join('')}
      <p class="hint">Eine Ideologie mit über 45 % Rückhalt kann per Umsturz die Macht übernehmen. Regierungswechsel verändern Beziehungen und Bündnisse.</p></section>
      <section class="card"><h4>Entscheidungen</h4><div class="decisions">${DECISIONS.map(d => { const cd = (c.dcd[d.id] || 0) - G.tick; const ok = d.ok(c) && c.pp >= d.cost && cd <= 0;
        return `<button class="decision" data-act="decision" data-id="${d.id}" ${ok ? '' : 'disabled'}><b>${d.n}</b><small>${d.d}</small><span class="cost">${ic('pp')} ${d.cost}${cd > 0 ? ` · ${cd} Tage` : ''}</span></button>`; }).join('')}</div></section>
      <section class="card">${lawBlock('eco', ECO_LAWS, 'Wirtschaftsgesetz')}${lawBlock('cons', CONS_LAWS, 'Wehrpflicht')}${lawBlock('tax', TAX_LAWS, 'Steuerpolitik')}<p class="hint">Gesetzesänderungen kosten 50 politische Macht.</p></section>`;
  },
  panel_diplo() {
    const me = G.player, c = C(me);
    const ids = Object.keys(G.C).filter(id => id !== me && alive(id)).sort((a, b) => (C(b).major - C(a).major) || rel(me, b) - rel(me, a));
    const t = this.diploSel && alive(this.diploSel) && this.diploSel !== me ? this.diploSel : null;
    let detail = '';
    if (t) {
      const ct = C(t); const myF = factionOf(me), tF = factionOf(t);
      const evalTag = (act) => { const e = evaluate(act, me, t); const ok = e.score >= 0; return `<span class="accept ${ok ? 'pos' : 'neg'}" title="${esc(e.reasons.map(([v, n]) => (v > 0 ? '+' : '') + v + ' ' + n).join('\n'))}">${ok ? 'Zustimmung wahrscheinlich' : 'Ablehnung wahrscheinlich'} (${e.score > 0 ? '+' : ''}${e.score})</span>`; };
      const A = (act, label, cost, extra = '', dis = false, tag = '') => `<div class="dact"><button class="btn" data-act="diplo" data-a="${act}" data-t="${t}" ${dis || c.pp < cost ? 'disabled' : ''}>${label}${cost ? ` <small>${ic('pp')}${cost}</small>` : ''}</button>${tag}${extra}</div>`;
      const war = atWar(me, t);
      const jc = canJustify(me, t);
      const justifying = G.justify.find(j => j.a === me && j.b === t);
      const allyEnemy = G.wars.find(w => sideOf(w, t) && (w.A.includes(t) ? w.D : w.A).some(x => allied(me, x)) && !sideOf(w, me));
      detail = `<section class="card dsel"><h3>${emblem(t, 28)} ${esc(ct.n)}</h3>
        <dl class="kv"><dt>Beziehung</dt><dd class="${relCls(rel(me, t))}">${relLabel(rel(me, t))} (${Math.round(rel(me, t))})</dd>
        <dt>Regierung</dt><dd>${IDEOLOGIES[ct.ide].n} · ${esc(ct.ldr)}</dd><dt>Bündnis</dt><dd>${tF ? esc(tF.n) : '–'}</dd>
        <dt>Stärke</dt><dd>${fmt(milPower(t))} (Ihre: ${fmt(milPower(me))})</dd>
        <dt>Schutzmächte</dt><dd>${guarantorsOf(t).map(g => esc(C(g).s)).join(', ') || '–'}</dd></dl>
        <div class="dacts">
        ${war ? `${A('peace_white', 'Weißen Frieden anbieten', 10, '', false, evalTag('peace_white'))}${A('peace_take', 'Frieden: besetzte Gebiete fordern', 10, '', false, evalTag('peace_take'))}` : `
          ${A('improve', 'Beziehungen verbessern', 20, '', (c.dcd['imp_' + t] || 0) > G.tick)}
          ${A('worsen', 'Beziehungen verschlechtern', 10)}
          ${hasTrade(me, t) ? A('cancel_trade', 'Handelsabkommen kündigen', 0) : A('trade', 'Handelsabkommen anbieten', 10, '', false, evalTag('trade'))}
          ${hasNap(me, t) ? A('cancel_nap', 'Nichtangriffspakt kündigen', 0) : A('nap', 'Nichtangriffspakt anbieten', 25, '', false, evalTag('nap'))}
          ${A('guarantee', guarantees(me, t) ? 'Garantie zurückziehen' : 'Unabhängigkeit garantieren', guarantees(me, t) ? 0 : 25)}
          ${myF && !tF ? A('invite', `In „${esc(myF.n)}“ einladen`, 25, '', false, evalTag('invite')) : ''}
          ${!myF && tF ? A('join', `Beitritt zu „${esc(tF.n)}“ beantragen`, 25, '', false, evalTag('join')) : ''}
          ${demandable(me, t).length ? A('demand', `Gebiete fordern (${demandable(me, t).length})`, 40, '', false, evalTag('demand')) : ''}
          ${allyEnemy ? A('joinwar', `Dem ${esc(allyEnemy.name)} beitreten`, 0) : ''}
          ${c.wargoals.includes(t) ? A('war', '⚔ Krieg erklären', 0, '', false, '<span class="accept neg">Kriegsgrund vorhanden</span>') :
            justifying ? `<div class="dact"><button class="btn" disabled>Kriegsgrund in Arbeit</button><span class="accept">noch ${justifying.done - G.tick} Tage</span></div>` :
            A('justify', 'Kriegsgrund schaffen', c.ide === 'fas' || c.ide === 'com' ? 35 : 50, '', !jc.ok, jc.ok ? '<span class="accept">45 Tage, erhöht Spannung</span>' : `<span class="accept neg">${esc(jc.msg)}</span>`)}`}
        </div></section>`;
    }
    const myF = factionOf(me);
    return `<section class="card"><h4>${ic('globe')} Weltspannung</h4>${bar(G.tension, 100, 'red')}<p class="hint">${pct(G.tension)} – Demokratien dürfen Kriegsgründe erst ab 70 % schaffen (gegen Diktaturen ab 40 %), autoritäre Staaten ab 30 %.</p></section>
      ${detail}
      <section class="card"><h4>Staaten</h4><div class="clist">${ids.map(id => { const r = rel(me, id); return `<button class="crow ${t === id ? 'on' : ''}" data-act="diplosel" data-id="${id}">${emblem(id, 18)}<span>${esc(C(id).s)}</span>${atWar(me, id) ? '<em class="tag red">Krieg</em>' : allied(me, id) ? '<em class="tag blue">Verb.</em>' : ''}<b class="${relCls(r)}">${r > 0 ? '+' : ''}${Math.round(r)}</b></button>`; }).join('')}</div></section>
      <section class="card"><h4>${ic('shield')} Ihr Bündnis</h4>${myF ? `<p><b>${esc(myF.n)}</b> – Führung: ${esc(C(myF.l).s)}<br>Mitglieder: ${myF.m.map(m => esc(C(m).s)).join(', ')}</p><button class="btn sm" data-act="diplo" data-a="leave">Bündnis verlassen</button>`
        : `<p class="hint">Sie gehören keinem Bündnis an.</p><div class="row"><input id="facname" class="inp" placeholder="Name des Bündnisses" value="${esc(c.s)}er Pakt"><button class="btn sm" data-act="createfac" ${c.pp < 50 ? 'disabled' : ''}>Gründen ${ic('pp')}50</button></div>`}</section>
      <section class="card"><h4>Bündnisse der Welt</h4>${G.factions.length ? G.factions.map(f => `<p><b>${esc(f.n)}</b> (${esc(C(f.l).s)}): ${f.m.map(m => esc(C(m).s)).join(', ')}</p>`).join('') : '<p class="hint">Noch keine Bündnisse.</p>'}</section>
      <section class="card"><h4>${ic('swords')} Kriege</h4>${G.wars.length ? G.wars.map(w => { const s = warScore(w); return `<div class="warrow"><b>${esc(w.name)}</b><small>seit ${dateStr(w.start)}</small><div class="wsides"><span>${w.A.map(x => esc(C(x).s)).join(', ')}</span><i>vs.</i><span>${w.D.map(x => esc(C(x).s)).join(', ')}</span></div><div class="wscore"><span class="${s > 0 ? 'pos' : s < 0 ? 'neg' : ''}">Kriegslage: ${s > 0 ? '+' : ''}${s}</span>${bar(50 + s / 2, 100, s >= 0 ? 'green' : 'red')}</div></div>`; }).join('') : '<p class="hint">Europa ist (noch) im Frieden.</p>'}</section>
      ${G.scw ? `<section class="card"><h4>Spanischer Bürgerkrieg</h4><p>Nationalisten ${fmt(G.scw.nat)} : ${fmt(G.scw.rep)} Republikaner · Ende ca. ${dateStr(G.scw.end)}</p><div class="btnrow"><button class="btn sm" data-act="scw" data-side="nat" ${(c.dcd.scw || 0) > G.tick ? 'disabled' : ''}>Nationalisten unterstützen</button><button class="btn sm" data-act="scw" data-side="rep" ${(c.dcd.scw || 0) > G.tick ? 'disabled' : ''}>Republikaner unterstützen</button></div><p class="hint">Kostet 25 PM und 150 Ausrüstung, bringt Kampferfahrung und beeinflusst den Ausgang.</p></section>` : ''}`;
  },
  panel_eco() {
    const c = C(G.player), e = c.econ;
    return `<section class="card"><h4>${ic('civ')} Industrie</h4>
      <dl class="kv"><dt>Zivilfabriken</dt><dd>${fmt(e.civ, 1)}</dd><dt>davon Konsumgüter</dt><dd>${fmt(e.civ * e.cons, 1)} (${pct(e.cons * 100)})</dd><dt>Für Bauprojekte</dt><dd><b>${fmt(e.civAvail, 1)}</b></dd>
      <dt>Militärfabriken</dt><dd>${fmt(e.mil, 1)}${c.lend ? ` + ${c.lend} Leihlieferungen` : ''}</dd><dt>Effizienz</dt><dd>${bar(c.eff * 100, 100, 'gold')} ${pct(c.eff * 100)}</dd>
      <dt>Rohstofffaktor</dt><dd class="${e.resF < .95 ? 'neg' : ''}">${pct(e.resF * 100)}</dd><dt>Produktion/Monat</dt><dd>${fmt(e.milOut, 1)} Punkte</dd>
      ${c.bombDmg ? `<dt>Bombenschäden</dt><dd class="neg">−${pct(c.bombDmg * 100)}</dd>` : ''}</dl></section>
      <section class="card"><h4>${ic('mil')} Verteilung der Militärproduktion</h4>
      ${[['land', 'Heer (Ausrüstung)', `≈ ${fmt(e.milOut * c.alloc.land / 100 * LAND_EQ)} Ausrüstung/Monat`], ['air', 'Luftwaffe (Flugzeuge)', `≈ ${fmt(e.milOut * c.alloc.air / 100 * AIR_PL)} Flugzeuge/Monat`], ['navy', 'Marine (Werftpunkte)', `≈ ${fmt(e.milOut * c.alloc.navy / 100 * NAV_PTS)} Punkte/Monat`]].map(([k, n, h]) => `<label class="slider"><span>${n} <b>${c.alloc[k]} %</b></span><input type="range" min="0" max="100" step="5" value="${c.alloc[k]}" data-alloc="${k}"><small>${h}</small></label>`).join('')}</section>
      <section class="card"><h4>Rohstoffe (pro Monat)</h4><table class="tbl"><tr><th></th><th>Förderung</th><th>Import</th><th>Bedarf</th><th>Bilanz</th></tr>
      ${['steel', 'oil', 'alu', 'rubber'].map((k, i) => { const b = e.avail[i] - e.need[i]; return `<tr><td>${ic(k)} ${RES[k]}</td><td>${fmt(e.prod[i], 1)}</td><td>${fmt(e.imp[i], 1)}</td><td>${fmt(e.need[i], 1)}</td><td class="${b < -.05 ? 'neg' : 'pos'}">${b > 0 ? '+' : ''}${fmt(b, 1)}</td></tr>`; }).join('')}</table>
      <p class="hint">Fehlender Stahl, Aluminium oder Kautschuk senkt die Militärproduktion. Ölmangel lähmt Panzer und motorisierte Truppen. Handelsabkommen decken Defizite aus Überschüssen der Partner${c.blockade ? `; <b class="neg">Seeblockade: −${pct(c.blockade * 100)} Importe</b>` : ''}.</p></section>
      <section class="card"><h4>${ic('hand')} Handelspartner</h4>${tradePartners(G.player).length ? tradePartners(G.player).map(p => `<div class="row">${emblem(p, 16)} ${esc(C(p).s)} <button class="btn xs" data-act="diplo" data-a="cancel_trade" data-t="${p}">Kündigen</button></div>`).join('') : '<p class="hint">Keine Handelsabkommen. Neue über das Diplomatie-Menü.</p>'}</section>
      <section class="card"><h4>${ic('coin')} Staatshaushalt (pro Monat)</h4><dl class="kv"><dt>Einnahmen</dt><dd class="pos">+${fmt(e.income)}</dd><dt>Ausgaben</dt><dd class="neg">−${fmt(e.expense)}</dd><dt>Saldo</dt><dd class="${e.income - e.expense >= 0 ? 'pos' : 'neg'}">${fmt(e.income - e.expense)}</dd><dt>Staatskasse</dt><dd><b>${fmt(c.tr)} Mio.</b></dd></dl>
      <p class="hint">Ausgaben: Divisionen, Flugzeuge, Flotte und Rüstungsbetriebe. Ein negativer Haushalt senkt die Stabilität.</p></section>`;
  },
  panel_mil() {
    const c = C(G.player);
    const arms = G.armies.filter(a => a.owner === G.player);
    return `<section class="card"><div class="statgrid four"><div>${ic('helmet')}<b>${divCount(G.player)}</b><small>Divisionen</small></div><div>${ic('crate')}<b>${fmt(c.eq)}</b><small>Ausrüstung</small></div><div>${ic('people')}<b>${fmt(c.mp)}k</b><small>Personal</small></div><div>${ic('plane')}<b>${fmt(c.planes)}</b><small>Flugzeuge</small></div></div>
      ${inWar(G.player) ? `<p class="hint">Luftüberlegenheit: <b class="${c.airBonus >= 0 ? 'pos' : 'neg'}">${c.airBonus >= 0 ? '+' : ''}${pct(c.airBonus * 100)}</b> Kampfkraft</p>` : ''}</section>
      <section class="card"><h4>Divisionen ausheben</h4><div class="recruit">${Object.keys(DIV).map(t => { const d = DIV[t]; const ok = c.eq >= d.eq && c.mp >= d.mp;
        return `<div class="rcard"><div class="rt"><span class="dt">${d.s}</span><b>${d.n}</b></div><small>Angr. ${d.atk} · Vert. ${d.def} · Org. ${d.org} · Tempo ${d.speed}${d.oil ? ' · Öl' : ''}</small><small>${ic('crate')} ${d.eq} · ${ic('people')} ${d.mp}k · ${d.days} Tage</small><div class="btnrow"><button class="btn xs" data-act="recruit" data-t="${t}" data-n="1" ${ok ? '' : 'disabled'}>+1</button><button class="btn xs" data-act="recruit" data-t="${t}" data-n="5" ${c.eq >= d.eq * 5 && c.mp >= d.mp * 5 ? '' : 'disabled'}>+5</button></div></div>`; }).join('')}</div>
      ${c.recQ.length ? `<h4>In Ausbildung (${c.recQ.length})</h4><div class="queue">${c.recQ.slice(0, 12).map(q => `<div class="qrow"><span class="dt">${DIV[q.t].s}</span>${bar(DIV[q.t].days - q.d, DIV[q.t].days, 'green')}<small>${q.d} T.</small></div>`).join('')}${c.recQ.length > 12 ? `<small>… und ${c.recQ.length - 12} weitere</small>` : ''}</div>` : ''}
      <p class="hint">Neue Divisionen erscheinen in der Hauptstadt.</p></section>
      <section class="card"><h4>${ic('flag')} Armeen (${arms.length})</h4><div class="btnrow" style="margin:0 0 6px"><button class="btn xs" data-act="autoall" data-v="1">KI-Führung für alle an</button><button class="btn xs" data-act="autoall" data-v="0">alle aus</button></div>${arms.map(a => `<button class="armyrow" data-act="selarmy" data-id="${a.id}" data-center="1"><b>${esc(a.name)}</b><small>${a.divs.length} Div. · ${esc(a.inv ? 'auf See' : PROV[a.prov].name)} · Org ${pct(armyOrg(a) * 100)} · Stärke ${pct(armyStr(a))}${generalOf(a) ? ' · ' + esc(generalOf(a).n) : ''}${a.auto ? ' · KI' : ''}</small></button>`).join('') || '<p class="hint">Keine Armeen.</p>'}</section>
      <section class="card"><h4>${ic('star')} Generäle</h4>${c.gens.map(g => `<div class="genrow"><b>${esc(g.n)}</b> <span class="stars">${'★'.repeat(g.sk)}</span><small>${TRAITS[g.tr].n}: ${TRAITS[g.tr].d}<br>${g.army && G.armies.find(a => a.id === g.army) ? 'Führt ' + esc(G.armies.find(a => a.id === g.army).name) : 'Ohne Kommando'}</small></div>`).join('')}</section>
      <section class="card"><h4>${ic('anchor')} Marine (Stärke ${fmt(navyPow(G.player))})</h4><div class="ships">${Object.keys(SHIPS).map(s => `<div class="ship"><b>${c.ships[s]}</b><small>${SHIPS[s].n}</small><button class="btn xs" data-act="ship" data-s="${s}">Bauen (${SHIPS[s].cost})</button></div>`).join('')}</div>
      <p>Werftpunkte: ${fmt(c.navPts)} · Bauliste: ${c.shipQ.length ? c.shipQ.map(s => SHIPS[s].n).join(', ') : 'leer'} ${c.shipQ.length ? '<button class="btn xs" data-act="clearships">Leeren</button>' : ''}</p>
      <p class="hint">Flottenüberlegenheit ermöglicht Seetransporte, blockiert feindliche Importe und schützt den eigenen Handel.</p></section>`;
  },
  panel_res() {
    const c = C(G.player);
    return `<section class="card"><h4>${ic('flask')} Forschungsplätze</h4><div class="slots">${c.rs.map((s, k) => s ? `<div class="slot on"><b>${TECH_BY_ID[s.t].n}</b>${bar(s.p, techCost(c, s.t), 'blue')}<small>${Math.max(0, Math.ceil((techCost(c, s.t) - s.p) / ((1 + mod(c, 'research')) * (.8 + .4 * c.stab / 100))))} Tage</small><button class="btn xs" data-act="cancelres" data-k="${k}">✕</button></div>` : `<div class="slot empty">Freier Platz – Technologie wählen</div>`).join('')}</div>
      <p class="hint">Forschung vor dem historischen Jahr kostet mehr (+45 % je Jahr). Stabilität beeinflusst das Tempo.</p></section>
      <div class="techtree">${Object.keys(TECH_CATS).map(cat => `<div class="tcol"><h4>${TECH_CATS[cat]}</h4>${TECHS.filter(t => t.cat === cat).map(t => {
        const done = c.tech[t.id] != null, active = c.rs.some(s => s && s.t === t.id), av = techAvailable(c, t.id);
        return `<button class="tech ${done ? 'done' : active ? 'active' : av ? 'av' : 'locked'}" data-act="research" data-id="${t.id}" ${av && c.rs.some(s => !s) ? '' : 'disabled'} title="${esc(t.d)}${t.req.length ? '\nVoraussetzung: ' + t.req.map(r => TECH_BY_ID[r].n).join(', ') : ''}"><b>${t.n}</b><small>${t.d}</small><span>${done ? '✓ erforscht' : active ? 'in Forschung' : `${t.y} · ${techCost(c, t.id)} Tage`}</span></button>`; }).join('')}</div>`).join('')}</div>`;
  },
  panel_build() {
    const c = C(G.player), e = c.econ;
    const rate = PROJ_MAX * (1 + mod(c, 'build')) / 30;
    let pts = e.civAvail * (1 + mod(c, 'build')) * e.stabF / 30;
    return `<section class="card"><h4>${ic('crane')} Neues Bauprojekt</h4><div class="buildgrid">${Object.keys(BUILD).map(t => `<div class="bcard"><b>${ic(t === 'civ' ? 'civ' : t === 'mil' ? 'mil' : t === 'infra' ? 'road' : 'fort')} ${BUILD[t].n}</b><small>${BUILD[t].d} · Kosten ${BUILD[t].cost}</small><div class="btnrow"><button class="btn xs" data-act="buildauto" data-t="${t}">Automatisch</button><button class="btn xs ${this.buildMode === t ? 'on' : ''}" data-act="buildmode" data-t="${t}">Auf Karte</button></div></div>`).join('')}</div>
      <p class="hint">Jedes Projekt erhält bis zu ${PROJ_MAX} Zivilfabriken. Verfügbar: <b>${fmt(e.civAvail, 1)}</b> Zivilfabriken → ${Math.max(1, Math.ceil(e.civAvail / PROJ_MAX))} Projekte gleichzeitig.</p></section>
      <section class="card"><h4>Bauliste (${c.buildQ.length})</h4>${c.buildQ.length ? c.buildQ.map((q, k) => { const use = Math.min(rate, Math.max(0, pts)); pts -= use; const days = use > 0 ? Math.ceil((BUILD[q.t].cost - q.p) / use) : '∞';
        return `<div class="brow ${use > 0 ? '' : 'idle'}"><span>${BUILD[q.t].n}<small>${esc(PROV[q.prov].name)}</small></span>${bar(q.p, BUILD[q.t].cost, 'gold')}<small>${days} T.</small><div class="mini"><button class="btn xs" data-act="bup" data-k="${k}" ${k ? '' : 'disabled'}>▲</button><button class="btn xs" data-act="bdel" data-k="${k}">✕</button></div></div>`; }).join('') : '<p class="hint">Keine Projekte. Ungenutzte Zivilfabriken sind verschwendete Kapazität!</p>'}</section>`;
  },

  /* ---------------------------------------------- Interaktion */
  onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const d = b.dataset; const act = this.ACT[d.act]; if (!act) return;
    e.preventDefault(); act.call(this, d, b);
  },
  onInput(e) {
    const t = e.target;
    if (t.dataset.alloc) {
      const c = C(G.player), k = t.dataset.alloc, v = +t.value; const others = Object.keys(c.alloc).filter(x => x !== k);
      const rest = 100 - v, sum = others.reduce((s, x) => s + c.alloc[x], 0);
      c.alloc[k] = v; others.forEach((x, n) => { c.alloc[x] = sum ? Math.round(rest * c.alloc[x] / sum / 5) * 5 : Math.round(rest / 2 / 5) * 5; });
      const tot = c.alloc.land + c.alloc.air + c.alloc.navy; c.alloc[others[0]] += 100 - tot;
      this.renderDrawer(); const el2 = document.querySelector(`[data-alloc="${k}"]`); if (el2) el2.focus();
    }
    if (t.dataset.gen) {
      const a = G.armies.find(x => x.id === +t.dataset.gen); if (!a) return; const c = C(a.owner);
      const old = generalOf(a); if (old) old.army = null;
      const g = c.gens.find(x => x.id === +t.value); a.gen = g ? g.id : null; if (g) { const prev = G.armies.find(x => x.gen === g.id && x !== a); if (prev) prev.gen = null; g.army = a.id; }
      this.renderRight();
    }
  },
  onKey(e) {
    if (!G || $('#app').hidden || e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); if (!this.modalOpen) this.togglePause(); }
    else if (/^Digit[1-5]$/.test(e.code)) { G.speed = +e.code.slice(5); this.renderBottom(); }
    else if (e.code === 'Escape') { if (this.modalOpen && !(G.eventQueue || []).length && !G.peaceQueue.length) this.closeModal(); else { this.clearSel(); this.tab = null; this.buildMode = null; this.invMode = false; this.renderAll(); } }
  },
  selectArmy(id, add) {
    const a = G.armies.find(x => x.id === id); if (!a) return;
    if (this.invMode || (this.sel && this.sel.type === 'army' && a.owner !== G.player && this.selArmies().some(x => G.armies.find(y => y.id === x).owner === G.player))) { this.hexClicked(a.inv ? a.inv.to : a.prov, true); return; }
    const cur = this.selArmies();
    if (add && a.owner === G.player && cur.length) this.sel = { type: 'army', ids: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
    else if (cur.length === 1 && cur[0] === id) {
      // erneutes Antippen: nächste Armee im selben Feld
      const stack = G.armies.filter(x => x.prov === a.prov && !x.inv); const k = stack.indexOf(a); const nx = stack[(k + 1) % stack.length];
      this.sel = { type: 'army', ids: [nx.id] };
    } else this.sel = { type: 'army', ids: [id] };
    this.rightOpen = true; this.renderRight(); MapView.refresh();
  },
  clearSel() { this.sel = null; this.invMode = false; this.renderRight(); this.renderMapCtl(); MapView.refresh(); },
  hexClicked(i, right) {
    if (this.buildMode) {
      if (queueBuild(G.player, this.buildMode, i)) this.toast(`${BUILD[this.buildMode].n} in ${PROV[i].name} in Auftrag gegeben.`, 'good');
      else this.toast('Hier nicht möglich (eigene, unbesetzte Provinz mit freier Kapazität nötig).', 'bad');
      this.renderDrawer(); return;
    }
    const mine = this.selArmies().map(id => G.armies.find(a => a.id === id)).filter(a => a && a.owner === G.player);
    if (mine.length) {
      if (this.invMode) {
        let ok = 0, msg = ''; for (const a of mine) { const r = orderInvasion(a, i); if (r.ok) { ok++; a.inv.tot = a.inv.days; } msg = r.msg; }
        this.toast(ok ? `Seetransport von ${ok} Armee(n) nach ${PROV[i].name} gestartet.` : msg, ok ? 'good' : 'bad');
        this.invMode = false; this.renderMapCtl(); this.renderRight(); MapView.refresh(); return;
      }
      if (mine.length === 1 && mine[0].prov === i && !right) { this.sel = { type: 'prov', i }; this.renderRight(); MapView.refresh(); return; }
      let ok = 0, fail = '';
      for (const a of mine) { const r = orderMove(a, i); if (r.ok) ok++; else fail = r.msg; }
      if (ok) { this.toast(`Marschbefehl nach ${PROV[i].name}.`, 'info'); }
      else if (PROV[i].coastal && mine.every(a => PROV[a.prov].coastal && !a.inv) && canEnter(G.player, i)) {
        this.confirm(`Kein Landweg nach ${PROV[i].name}. Seetransport starten?`, () => { for (const a of mine) { const r = orderInvasion(a, i); if (r.ok) a.inv.tot = a.inv.days; else this.toast(r.msg, 'bad'); } MapView.refresh(); this.renderRight(); });
      } else this.toast(fail, 'bad');
      MapView.refresh(); this.renderRight(); return;
    }
    this.sel = { type: 'prov', i }; this.rightOpen = true;
    this.renderRight(); MapView.refresh();
  },
  ACT: {
    newgame(d) { this.newGame(d.id); },
    load(d) { this.load(d.slot); },
    closemodal() { this.closeModal(); },
    tab(d) { this.tab = this.tab === d.tab ? null : d.tab; this.renderDrawer(); },
    pause() { this.togglePause(); },
    speed(d) { G.speed = +d.s; if (G.paused) G.paused = false; this.renderBottom(); },
    log() { this.logOpen = !this.logOpen; this.unread = 0; this.renderBottom(); },
    zoom(d) { MapView.zoom(+d.f); },
    fit() { MapView.centerOn(C(G.player).cap, 300); },
    mapmode(d) { MapView.setMode(d.m); this.renderMapCtl(); },
    closeright() { this.clearSel(); },
    quicksave() { this.save(1); },
    menu() { this.openMenu(); },
    save(d) { this.save(d.slot); this.openMenu(); },
    loadslot(d) { this.closeModal(); this.load(d.slot); },
    mainmenu() { this.closeModal(); G.paused = true; $('#app').hidden = true; $('#start').hidden = false; this.renderStart(); },
    help() { this.openHelp(); },
    selarmy(d) { this.sel = { type: 'army', ids: [+d.id] }; const a = G.armies.find(x => x.id === +d.id); if (a && d.center) MapView.centerOn(a.inv ? a.inv.from : a.prov); this.rightOpen = true; this.renderRight(); MapView.refresh(); },
    diplowith(d) { this.tab = 'diplo'; this.diploSel = d.id; this.renderDrawer(); },
    diplosel(d) { this.diploSel = d.id; this.renderDrawer(); },
    diplo(d) {
      let r;
      if (d.a === 'peace_white' || d.a === 'peace_take') {
        const c = C(G.player); if (c.pp < 10) return this.toast('Nicht genug politische Macht.', 'bad');
        c.pp -= 10; const ev2 = evaluate(d.a, G.player, d.t);
        if (ev2.score >= 0) { makePeace(G.player, d.t, d.a === 'peace_take' ? 'take' : 'white'); r = { ok: true, msg: `${C(d.t).s} nimmt das Friedensangebot an.` }; }
        else r = { ok: false, msg: `${C(d.t).s} lehnt das Friedensangebot ab.` };
      } else r = diplo(d.a, G.player, d.t);
      this.toast(r.msg, r.ok ? 'good' : 'bad'); this.renderAll();
    },
    createfac() { const n = ($('#facname') || {}).value || 'Neuer Pakt'; const r = diplo('create', G.player, null, n.slice(0, 40)); this.toast(r.msg, r.ok ? 'good' : 'bad'); this.renderAll(); },
    scw(d) { if (supportSCW(G.player, d.side)) this.toast('Freiwillige und Material sind unterwegs nach Spanien.', 'good'); else this.toast('Nicht möglich (25 PM und 150 Ausrüstung nötig).', 'bad'); this.renderAll(); },
    prop(d) { if (propaganda(G.player, d.ide)) this.toast(`Propagandakampagne für ${IDEOLOGIES[d.ide].n} gestartet.`, 'good'); this.renderAll(); },
    decision(d) { if (takeDecision(G.player, d.id)) this.toast('Entscheidung umgesetzt.', 'good'); this.renderAll(); },
    law(d) { if (setLaw(G.player, d.kind, d.v)) this.toast('Gesetz geändert.', 'good'); this.renderAll(); },
    recruit(d) { const n = recruit(G.player, d.t, +d.n); this.toast(n ? `${n}× ${DIV[d.t].n} in Ausbildung.` : 'Nicht genug Ausrüstung oder Personal.', n ? 'good' : 'bad'); this.renderAll(); },
    ship(d) { C(G.player).shipQ.push(d.s); this.renderDrawer(); },
    clearships() { C(G.player).shipQ = []; this.renderDrawer(); },
    research(d) { if (startResearch(G.player, d.id)) this.toast(`Forschung begonnen: ${TECH_BY_ID[d.id].n}.`, 'good'); this.renderAll(); },
    cancelres(d) { C(G.player).rs[+d.k] = null; this.renderAll(); },
    buildauto(d) { if (queueBuild(G.player, d.t)) this.toast(`${BUILD[d.t].n} in Auftrag gegeben.`, 'good'); else this.toast('Keine geeignete Provinz verfügbar.', 'bad'); this.renderDrawer(); },
    buildmode(d) { this.buildMode = d.t && this.buildMode !== d.t ? d.t : null; MapView.setMode(this.buildMode ? 'ind' : 'pol'); this.renderMapCtl(); this.renderDrawer(); },
    buildhere(d) { if (queueBuild(G.player, d.t, +d.i)) this.toast(`${BUILD[d.t].n} in Auftrag gegeben.`, 'good'); this.renderAll(); },
    bup(d) { const q = C(G.player).buildQ, k = +d.k; [q[k - 1], q[k]] = [q[k], q[k - 1]]; this.renderDrawer(); },
    bdel(d) { C(G.player).buildQ.splice(+d.k, 1); this.renderDrawer(); },
    stop() { this.selArmies().forEach(id => { const a = G.armies.find(x => x.id === id); if (a && a.owner === G.player) { a.path = []; a.prog = 0; } }); this.renderRight(); MapView.refresh(); },
    split() { const a = G.armies.find(x => x.id === this.selArmies()[0]); const b = a && splitArmy(a); if (b) { this.sel = { type: 'army', ids: [a.id] }; this.toast(`${a.name} geteilt – neue ${b.name}.`, 'good'); } this.renderRight(); MapView.refresh(); },
    merge() { const a = G.armies.find(x => x.id === this.selArmies()[0]); if (!a) return; G.armies.filter(x => x !== a && x.owner === a.owner && x.prov === a.prov && !x.inv).forEach(b => mergeArmies(a, b)); this.renderRight(); MapView.refresh(); },
    invmode() { this.invMode = !this.invMode; this.renderMapCtl(); this.renderRight(); },
    autoarmy() { this.selArmies().forEach(id => { const a = G.armies.find(x => x.id === id); if (a && a.owner === G.player) a.auto = !a.auto; }); this.renderRight(); },
    autoall(d) { G.armies.forEach(a => { if (a.owner === G.player) a.auto = d.v === '1'; }); this.toast(d.v === '1' ? 'Der Generalstab führt nun alle Armeen im Krieg.' : 'Alle Armeen wieder unter Ihrem Befehl.', 'info'); this.renderDrawer(); },
    eventopt(d) { const inst = G.eventQueue.shift(); this.closeModal(true); applyEventOption(inst, +d.k); this.renderAll(); this.checkModals(); },
    peaceopt(d) { const p = G.peaceQueue.shift(); this.closeModal(true); applyCapitulation(p.loser, p.winner, d.mode); this.toast('Friedensvertrag unterzeichnet.', 'good'); this.renderAll(); this.checkModals(); },
    confirmyes() { const f = this._confirm; this.closeModal(); if (f) f(); },
    continuegame() { this.closeModal(); G.paused = true; },
    observe() { G.observer = true; G.gameOver = false; this.closeModal(); G.paused = false; }
  },

  /* ---------------------------------------------- Fenster */
  showModal(html, cls = '') { const m = $('#modal'); m.innerHTML = `<div class="modal ${cls}">${html}</div>`; m.hidden = false; this.modalOpen = true; },
  closeModal(keepFlag) { $('#modal').hidden = true; $('#modal').innerHTML = ''; this.modalOpen = false; if (!keepFlag) this.checkModals(); },
  confirm(text, fn) { this._confirm = fn; this.showModal(`<div class="modal-body"><p>${esc(text)}</p></div><div class="modal-actions"><button class="btn" data-act="closemodal">Abbrechen</button><button class="btn primary" data-act="confirmyes">Ja</button></div>`, 'small'); },
  checkModals() {
    if (this.modalOpen || !G) return;
    if (G.peaceQueue && G.peaceQueue.length) {
      const p = G.peaceQueue[0]; const L = C(p.loser);
      if (!L.alive) { G.peaceQueue.shift(); return this.checkModals(); }
      const occ = provsOwned(p.loser).filter(i => G.prov[i].ctl === p.winner).length, tot = provsOwned(p.loser).length;
      this.showModal(`<div class="modal-head">${emblem(p.loser, 44)}<div><h2>Friedenskonferenz</h2><small>${esc(L.n)} hat kapituliert</small></div></div>
        <div class="modal-body"><p>Ihre Truppen kontrollieren ${occ} von ${tot} Provinzen des Gegners. Bestimmen Sie die Friedensbedingungen:</p></div>
        <div class="opts">
          <button class="opt" data-act="peaceopt" data-mode="occ"><b>Besetzte Gebiete annektieren</b><small>Alle von Ihnen (und Verbündeten) besetzten Provinzen werden abgetreten.</small></button>
          <button class="opt" data-act="peaceopt" data-mode="full"><b>Vollständige Annexion</b><small>Der gesamte Staat wird Ihrem Reich einverleibt. Starker Anstieg der Spannung.</small></button>
          <button class="opt" data-act="peaceopt" data-mode="puppet"><b>Marionettenregime einsetzen</b><small>Das Land bleibt bestehen, übernimmt Ihre Ideologie und tritt Ihrem Bündnis bei.</small></button>
          <button class="opt" data-act="peaceopt" data-mode="repar"><b>Reparationen fordern</b><small>Status quo; Sie erhalten die Hälfte der Staatskasse und Ausrüstung des Gegners.</small></button>
        </div>`);
      return;
    }
    if (G.eventQueue && G.eventQueue.length) {
      const inst = G.eventQueue[0]; const e = EVENTS[inst.id];
      if (!e || !alive(inst.who)) { G.eventQueue.shift(); return this.checkModals(); }
      this.showModal(`<div class="modal-head evhead">${eventArt(inst.id)}<div><h2>${esc(e.title)}</h2><small>${dateStr()}</small></div></div>
        <div class="modal-body"><p>${esc(eventText(inst))}</p></div>
        <div class="opts">${e.opts.map((o, k) => `<button class="opt" data-act="eventopt" data-k="${k}"><b>${esc(o.t)}</b>${optTip(inst, o) ? `<small>${esc(optTip(inst, o))}</small>` : ''}</button>`).join('')}</div>`, 'event');
    }
  },
  openMenu() {
    const saves = this.listSaves();
    const slot = n => { const s = saves.find(x => x.slot === String(n)); return `<div class="saverow"><span>Platz ${n}: ${s ? esc(CD[s.player].s + ' – ' + s.date) : '<i>leer</i>'}</span><button class="btn xs" data-act="save" data-slot="${n}">Speichern</button><button class="btn xs" data-act="loadslot" data-slot="${n}" ${s ? '' : 'disabled'}>Laden</button></div>`; };
    const auto = saves.find(x => x.slot === 'auto');
    this.showModal(`<div class="modal-head">${ic('crest', 'mid')}<div><h2>Menü</h2><small>Spiel pausiert</small></div></div>
      <div class="modal-body">${slot(1)}${slot(2)}${slot(3)}${auto ? `<div class="saverow"><span>Autosave: ${esc(CD[auto.player].s + ' – ' + auto.date)}</span><button class="btn xs" data-act="loadslot" data-slot="auto">Laden</button></div>` : ''}</div>
      <div class="modal-actions"><button class="btn" data-act="help">Anleitung</button><button class="btn" data-act="mainmenu">Hauptmenü</button><button class="btn primary" data-act="closemodal">Weiter</button></div>`);
    G.paused = true; this.renderBottom();
  },
  openHelp() {
    this.showModal(`<div class="modal-head">${ic('crest', 'mid')}<div><h2>Anleitung</h2><small>Iron Empires – Europa 1936</small></div></div>
      <div class="modal-body help">
        <h4>Zeit & Steuerung</h4><p>Ein Tag pro Takt; Wirtschaft, Politik, Diplomatie und KI rechnen monatlich ab. Leertaste = Pause, 1–5 = Tempo, Esc = Auswahl aufheben.</p>
        <h4>Wirtschaft</h4><p>Zivilfabriken bauen (Bauwesen) und erzeugen Konsumgüter; Militärfabriken produzieren Ausrüstung, Flugzeuge und Werftpunkte (Verteilung im Wirtschaftsmenü). Rohstoffmangel senkt die Produktion – Handelsabkommen helfen.</p>
        <h4>Militär</h4><p>Divisionen kosten Ausrüstung und Personal und erscheinen in der Hauptstadt. Armeen auswählen und ein Ziel antippen. Kampf: Angriff gegen Verteidigung, verändert durch Gelände, Festungen, Generäle, Technologie, Luftüberlegenheit, Versorgung und Eingraben. Verliert eine Seite ihre Organisation, zieht sie sich zurück – eingekesselte Armeen werden vernichtet.</p>
        <h4>Diplomatie</h4><p>Beziehungen, Handel, Nichtangriffspakte, Garantien und Bündnisse. Die KI bewertet Vorschläge nach Beziehung, Ideologie, Kräfteverhältnis und Bedrohung – die Gründe sehen Sie per Mauszeiger auf der Bewertung. Aggressives Verhalten erhöht Ihre Bedrohlichkeit; Nachbarn suchen dann Schutz.</p>
        <h4>Krieg & Frieden</h4><p>Kriegsgrund schaffen (45 Tage), dann Krieg erklären. Ein Land kapituliert, wenn es unter 45 % seiner Siegpunkte hält und die Hauptstadt verloren hat (oder unter 22 %). Als Hauptsieger bestimmen Sie die Bedingungen. Friedensangebote sind im Diplomatie-Menü möglich.</p>
        <h4>Ereignisse</h4><p>Historische Ereignisse 1936–1945 treten nur ein, wenn ihre Voraussetzungen erfüllt sind – Ihre Entscheidungen verändern den Verlauf.</p>
        <h4>Speichern</h4><p>Drei Speicherplätze im Browser (localStorage) plus Autosave alle drei Monate.</p>
      </div><div class="modal-actions"><button class="btn primary" data-act="closemodal">Schließen</button></div>`);
  },
  gameOver(win) {
    G.paused = true;
    const c = C(G.player);
    const own = provsOwned(G.player).length, vp = countryVP(G.player);
    this.showModal(`<div class="modal-head">${emblem(G.player, 44)}<div><h2>${win ? 'Das Jahr 1946 bricht an' : 'Niederlage'}</h2><small>${dateStr()}</small></div></div>
      <div class="modal-body">${win ? `<p>${esc(c.n)} hat die Schicksalsjahre überstanden.</p><dl class="kv"><dt>Provinzen</dt><dd>${own} (Start: ${c.origProv})</dd><dt>Siegpunkte</dt><dd>${vp}</dd><dt>Fabriken</dt><dd>${fmt(c.econ.civ + c.econ.mil)}</dd><dt>Divisionen</dt><dd>${divCount(G.player)}</dd><dt>Bündnis</dt><dd>${factionOf(G.player) ? esc(factionOf(G.player).n) : '–'}</dd></dl>` : `<p>${esc(c.n)} existiert nicht mehr. Die Geschichte geht ohne Sie weiter.</p>`}</div>
      <div class="modal-actions">${win ? '<button class="btn primary" data-act="continuegame">Weiterspielen</button>' : '<button class="btn" data-act="observe">Als Beobachter weiterschauen</button>'}<button class="btn" data-act="mainmenu">Hauptmenü</button></div>`);
  },
  toast(text, type = 'info') {
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = text;
    const box = $('#toasts'); box.appendChild(t); while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 3600); setTimeout(() => t.remove(), 4200);
  },

  /* ---------------------------------------------- Speichern */
  listSaves() {
    const out = [];
    try { for (const s of ['1', '2', '3', 'auto']) { const m = localStorage.getItem(SAVE_KEY + 'meta_' + s); if (m) out.push({ slot: s, ...JSON.parse(m) }); } } catch (e) { }
    return out;
  },
  save(slot, silent) {
    try {
      localStorage.setItem(SAVE_KEY + slot, serialize());
      localStorage.setItem(SAVE_KEY + 'meta_' + slot, JSON.stringify({ player: G.player, date: dateStr() }));
      if (!silent) this.toast(`Gespeichert (${slot === 'auto' ? 'Autosave' : 'Platz ' + slot}).`, 'good');
    } catch (e) { if (!silent) this.toast('Speichern fehlgeschlagen: ' + e.message, 'bad'); }
  },
  load(slot) {
    try {
      const s = localStorage.getItem(SAVE_KEY + slot); if (!s) return this.toast('Kein Spielstand vorhanden.', 'bad');
      deserialize(s); this.enterGame(); this.toast('Spielstand geladen.', 'good');
    } catch (e) { this.toast('Laden fehlgeschlagen: ' + e.message, 'bad'); }
  }
};

// Eigene Ereignis-Illustrationen
function eventArt(id) {
  const kind = /war|winter|barbarossa|greece|sov_poland|fall|sudeten_war|italy/.test(id) ? 'swords' : /pact|mrp|axis|triple|guarantee|munich|proposal|intermarium|sov_fra|peace/.test(id) ? 'hand' : /scw|unrest|coup|purge|popfront|abdication/.test(id) ? 'pillar' : /usa|lendlease/.test(id) ? 'anchor' : 'globe';
  return `<div class="evart ${kind}">${ic(kind, 'big')}</div>`;
}

window.addEventListener('DOMContentLoaded', () => UI.start());
