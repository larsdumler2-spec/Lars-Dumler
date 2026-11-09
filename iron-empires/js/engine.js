'use strict';
/* ==========================================================================
   Iron Empires – Spiel-Engine: Zustand, Wirtschaft, Politik, Diplomatie,
   Militär, Kampf, Frieden. Keine DOM-Abhängigkeiten.
   ========================================================================== */
let G = null;          // dynamischer Spielzustand (wird gespeichert)
let PROV = [];         // statische Felddaten
let LAND = [];         // Indizes aller spielbaren Landfelder
const UIHOOK = { toast(){}, log(){}, event(){}, peace(){}, gameOver(){}, mapDirty(){} };

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const LAND_EQ = 60, AIR_PL = 35, NAV_PTS = 12, PROJ_MAX = 10;
const TERR = { p:{n:'Ebene',atk:1}, f:{n:'Wald',atk:.8}, m:{n:'Gebirge',atk:.6}, w:{n:'Sumpf',atk:.7}, u:{n:'Stadt',atk:.75} };

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = Math.random;
const pick = arr => arr[Math.floor(rand() * arr.length)];
const fmt = (n, d = 0) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: d });

/* ------------------------------------------------------------------ Karte */
function hexNeighbors(c, r) {
  const odd = r & 1;
  const d = odd ? [[1,0],[-1,0],[0,-1],[1,-1],[0,1],[1,1]] : [[1,0],[-1,0],[-1,-1],[0,-1],[-1,1],[0,1]];
  return d.map(([dc, dr]) => { const cc = c + dc, rr = r + dr; return (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) ? -1 : rr * COLS + cc; });
}
function buildStatic() {
  const grid = new Array(ROWS * COLS).fill('.');
  MAP_RUNS.forEach((row, r) => row.split(' ').filter(Boolean).forEach(tok => {
    const ch = tok[0]; const [a, b] = tok.slice(1).split('-').map(Number);
    for (let c = a; c <= (b ?? a); c++) grid[r * COLS + c] = ch;
  }));
  PROV = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c, ch = grid[i];
    PROV.push({ i, c, r, ch, x: HW * (c + 0.5 * (r & 1)) + HW / 2 + 6, y: HEX * 1.5 * r + HEX + 6,
      land: !!CODES[ch], waste: ch === ',', owner0: CODES[ch] || null, terrain: 'p', nb: [], all: hexNeighbors(c, r),
      coastal: false, city: null, vp: 1, cap: false, name: '', resShare: null });
  }
  for (const p of PROV) {
    p.nb = p.all.filter(j => j >= 0 && PROV[j].land);
    p.coastal = p.land && p.all.some(j => j < 0 || PROV[j].ch === '.');
  }
  for (const [t, r, a, b] of TERRAIN_SPEC) for (let c = a; c <= b; c++) { const p = PROV[r * COLS + c]; if (p.land) p.terrain = t; }
  for (const p of PROV) if (p.land) {
    if (p.owner0 === 'NOR' || (p.owner0 === 'SWE' && p.r < 9 && p.c < 22)) p.terrain = 'm';
    else if (p.r <= 12 && p.terrain === 'p') p.terrain = 'f';
  }
  // Städte platzieren
  for (const [name, cc, lat, lon, vp, ex] of CITIES) {
    let c = Math.round((lon + 10) / 1.25), r = Math.round(71 - lat);
    let idx = (c >= 0 && c < COLS && r >= 0 && r < ROWS) ? r * COLS + c : -1;
    if (idx < 0 || PROV[idx].owner0 !== cc || PROV[idx].city) {
      const tx = HW * (c + 0.5 * (r & 1)), ty = HEX * 1.5 * r; let best = -1, bd = 1e9;
      for (const p of PROV) if (p.owner0 === cc && !p.city) { const d = (p.x - tx) ** 2 + (p.y - ty) ** 2; if (d < bd) { bd = d; best = p.i; } }
      idx = best;
    }
    if (idx < 0) continue;
    const p = PROV[idx]; p.city = name; p.vp = 1 + vp; p.cap = !!(ex && ex.cap); p.resShare = ex && ex.res || null;
    if (vp >= 4) p.terrain = p.terrain === 'm' ? 'm' : 'u';
  }
  // Namen
  const cnt = {};
  for (const p of PROV) {
    if (!p.land) { p.name = p.waste ? 'Unzugängliches Gebiet' : 'See'; continue; }
    if (p.city) { p.name = p.city; continue; }
    let best = null, bd = 1e9;
    for (const q of PROV) if (q.city && q.owner0 === p.owner0) { const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2; if (d < bd) { bd = d; best = q; } }
    const base = best ? best.city : CD[p.owner0].s; cnt[base] = (cnt[base] || 0) + 1;
    p.name = 'Gebiet ' + base + (cnt[base] > 1 ? ' ' + roman(cnt[base]) : '');
  }
  LAND = PROV.filter(p => p.land).map(p => p.i);
}
function roman(n) { return ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'][n] || String(n); }

/* -------------------------------------------------------------- Zeit/Datum */
function curDate(t = G.tick) { const d = new Date(Date.UTC(1936, 0, 1 + t)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; }
function dateStr(t = G.tick) { const d = curDate(t); return `${d.d}. ${MONTHS[d.m - 1]} ${d.y}`; }
function dayNum(y, m, d = 1) { return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1936, 0, 1)) / 864e5); }

/* ---------------------------------------------------------- Neues Spiel */
function newGame(player) {
  if (!PROV.length) buildStatic();
  G = { v: 1, player, tick: 0, speed: 2, paused: true, nextId: 1, prov: [], C: {}, armies: [], wars: [], factions: [],
    naps: [], trades: [], guar: [], rel: {}, tension: 5, flags: {}, fired: {}, pending: [], log: [], justify: [],
    battles: [], scw: null, threat: {}, claims: {}, gameOver: false, peaceQueue: [], notes: [] };
  for (const p of PROV) G.prov[p.i] = p.land ? { own: p.owner0, ctl: p.owner0, civ: 0, mil: 0, inf: 1, fort: 0, res: [0, 0, 0, 0] } : null;
  for (const id in CD) initCountry(id);
  initRelations();
  // Historische Befestigungslinien
  const fortLine = (a, b, lvl) => { for (const i of LAND) if (G.prov[i].own === a && PROV[i].nb.some(j => G.prov[j].own === b)) G.prov[i].fort = lvl; };
  fortLine('FRA', 'GER', 4); fortLine('FRA', 'ITA', 2); fortLine('GER', 'FRA', 2); fortLine('CZE', 'GER', 2); fortLine('CZE', 'AUT', 1);
  fortLine('FIN', 'SOV', 2); fortLine('BEL', 'GER', 1); fortLine('SOV', 'POL', 1); fortLine('ITA', 'FRA', 1); fortLine('SWI', 'GER', 2); fortLine('SWI', 'ITA', 2);
  for (const id in CD) placeInitialArmies(G.C[id]);
  for (const id in CD) { computeMods(G.C[id]); }
  monthlyEconomyAll();
  G.mapDirty = true;
  addLog(`Das Spiel beginnt. Sie führen ${G.C[player].n}.`, 'info');
  return G;
}

function initCountry(id) {
  const d = CD[id];
  const provs = LAND.filter(i => PROV[i].owner0 === id);
  const capIdx = provs.find(i => PROV[i].cap) ?? provs[0];
  const c = G.C[id] = {
    id, n: d.n, s: d.s, col: d.col, ide: d.ide, ldr: d.ldr, pop: d.pop, stab: d.stab, ws: d.ws, pp: 60, tr: d.tr,
    mp: 0, laws: { eco: d.eco || 'civ', cons: d.cons || 'vol', tax: 'norm' },
    ipop: { fas: d.ipop[0], com: d.ipop[1], dem: d.ipop[2], neu: d.ipop[3] },
    alloc: id === 'ENG' ? { land: 40, air: 30, navy: 30 } : id === 'ITA' ? { land: 50, air: 25, navy: 25 } : d.major ? { land: 60, air: 25, navy: 15 } : { land: 75, air: 20, navy: 5 },
    eq: 400 + d.mil * 50, planes: d.air, ships: { dd: d.navy[0], cl: d.navy[1], bb: d.navy[2], ss: d.navy[3] }, navPts: 0,
    shipQ: [], buildQ: [], recQ: [], tech: {}, rs: new Array(d.slots).fill(null), baseSlots: d.slots, eff: .5,
    gens: [], cap: capIdx, aggr: d.aggr, major: !!d.major, alive: true, overlord: null, lend: 0, dcd: {}, mods: {},
    tmods: [], origProv: provs.length, cas: 0, wargoals: [], econ: {}, alt: d.alt || {}, airBonus: 0, blockade: 0, bombDmg: 0,
    lastAI: 0, purge: 0
  };
  c.mp = c.pop * 1000 * CONS_LAWS[c.laws.cons].rate * 0.6;
  // Fabriken verteilen (Städte stärker gewichtet)
  const w = provs.map(i => PROV[i].city ? 1 + PROV[i].vp * 1.6 : 1);
  distribute(provs, w, d.civ, 'civ'); distribute(provs, w, d.mil, 'mil');
  for (const i of provs) {
    const p = G.prov[i]; p.inf = clamp(d.infra + (PROV[i].city ? 1 : 0) - (PROV[i].terrain === 'm' ? 1 : 0), 1, 5);
  }
  // Rohstoffe
  ['steel', 'oil', 'alu', 'rubber'].forEach((r, k) => {
    let total = d.res[k]; if (!total) return;
    for (const i of provs) { const s = PROV[i].resShare; if (s && s[r]) { G.prov[i].res[k] += total * s[r]; } }
    const special = provs.reduce((a, i) => a + ((PROV[i].resShare || {})[r] || 0), 0);
    const rest = total * (1 - special);
    for (const i of provs) G.prov[i].res[k] += rest / provs.length;
  });
  (d.gens || [['Generalstab', 2, 'none']]).forEach(([n, sk, tr]) => c.gens.push({ id: G.nextId++, n, sk, tr, army: null }));
  G.threat[id] = 0; G.claims[id] = [];
}
function distribute(provs, w, total, key) {
  const sw = w.reduce((a, b) => a + b, 0); let given = 0;
  const raw = provs.map((i, k) => total * w[k] / sw);
  provs.forEach((i, k) => { const f = Math.floor(raw[k]); G.prov[i][key] += f; given += f; });
  const order = provs.map((i, k) => [k, raw[k] - Math.floor(raw[k])]).sort((a, b) => b[1] - a[1]);
  for (let n = 0; given < total && n < order.length; n++, given++) G.prov[provs[order[n][0]]][key]++;
}

function initRelations() {
  const ids = Object.keys(CD);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = G.C[ids[i]], b = G.C[ids[j]]; let v = 0;
    if (a.ide === b.ide) v += 20;
    const pair = [a.ide, b.ide].sort().join();
    if (pair === 'com,fas') v -= 40; else if (pair === 'dem,fas' || pair === 'com,dem') v -= 15;
    G.rel[relKey(a.id, b.id)] = v;
  }
  const tweaks = [['GER','FRA',-30],['GER','POL',-10],['GER','ITA',10],['ENG','FRA',40],['FRA','POL',30],['FRA','CZE',40],['SOV','POL',-30],
    ['HUN','ROM',-40],['HUN','CZE',-30],['BUL','ROM',-20],['BUL','GRE',-20],['ITA','YUG',-20],['ITA','FRA',-10],['ITA','ENG',-15],['SOV','FIN',-25],
    ['SOV','ROM',-20],['LIT','POL',-40],['GER','AUT',10],['GER','LIT',-20],['TUR','GRE',-10],['GER','CZE',-20],['ENG','HOL',20],['ENG','POR',30],
    ['FRA','BEL',30],['SOV','FRA',10],['ITA','ALB',10],['ITA','HUN',20],['GER','HUN',15]];
  for (const [a, b, v] of tweaks) addRel(a, b, v);
  G.guar.push({ a: 'FRA', b: 'POL' }, { a: 'FRA', b: 'CZE' });
  G.naps.push({ a: 'GER', b: 'POL', until: 0 });
  for (const [a, b] of [['GER','SWE'],['GER','ROM'],['ITA','ROM'],['ENG','HOL'],['FRA','BEL'],['GER','YUG'],['ENG','POR']]) G.trades.push({ a, b });
}

/* -------------------------------------------------------------- Helfer */
const C = id => G.C[id];
const alive = id => !!(G.C[id] && G.C[id].alive);
const relKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
const rel = (a, b) => a === b ? 100 : (G.rel[relKey(a, b)] || 0);
function addRel(a, b, v) { if (a === b) return; const k = relKey(a, b); G.rel[k] = clamp((G.rel[k] || 0) + v, -100, 100); }
const isPlayer = id => id === G.player && !G.observer;
function addLog(text, type = 'info', cid = null) {
  G.log.unshift({ t: G.tick, text, type, c: cid }); if (G.log.length > 250) G.log.length = 250;
  UIHOOK.log(text, type);
}
function notify(text, type = 'info') { addLog(text, type); UIHOOK.toast(text, type); }
function playerConcerned(...ids) { return ids.includes(G.player) || ids.some(id => id && allied(id, G.player)); }

function provsOwned(id) { return LAND.filter(i => G.prov[i].own === id); }
function provsCtl(id) { return LAND.filter(i => G.prov[i].ctl === id); }
function borders(a, b) { return LAND.some(i => G.prov[i].own === a && PROV[i].nb.some(j => G.prov[j].own === b)); }
function neighborsOfCountry(a) { const s = new Set(); for (const i of LAND) if (G.prov[i].own === a) for (const j of PROV[i].nb) { const o = G.prov[j].own; if (o !== a) s.add(o); } return [...s]; }
function countryVP(id) { let v = 0; for (const i of LAND) if (G.prov[i].own === id) v += PROV[i].vp; return v; }

/* ---- Fraktionen, Kriege, Pakte (mit Cache) ---- */
let _cache = null;
const CIDS = Object.keys(CD), CIX = Object.fromEntries(CIDS.map((id, k) => [id, k])), NC = CIDS.length;
function dirty() { _cache = null; }
function cache() {
  if (_cache) return _cache;
  const war = new Uint8Array(NC * NC), ally = new Uint8Array(NC * NC), fac = {};
  const setW = (a, b) => { war[CIX[a] * NC + CIX[b]] = 1; war[CIX[b] * NC + CIX[a]] = 1; };
  const addA = (a, b) => { ally[CIX[a] * NC + CIX[b]] = 1; ally[CIX[b] * NC + CIX[a]] = 1; };
  for (const w of G.wars) for (const a of w.A) for (const d of w.D) setW(a, d);
  for (const f of G.factions) for (const a of f.m) { fac[a] = f; for (const b of f.m) addA(a, b); }
  for (const w of G.wars) { for (const a of w.A) for (const b of w.A) addA(a, b); for (const a of w.D) for (const b of w.D) addA(a, b); }
  for (const id in G.C) { const o = G.C[id].overlord; if (o) addA(id, o); }
  for (let k = 0; k < NC; k++) ally[k * NC + k] = 1;
  return _cache = { war, ally, fac };
}
const atWar = (a, b) => a !== b && cache().war[CIX[a] * NC + CIX[b]] === 1;
const allied = (a, b) => a === b || cache().ally[CIX[a] * NC + CIX[b]] === 1;
const factionOf = id => cache().fac[id] || null;
const sameFaction = (a, b) => { const f = factionOf(a); return !!f && f.m.includes(b); };
const warsOf = id => G.wars.filter(w => w.A.includes(id) || w.D.includes(id));
const sideOf = (w, id) => w.A.includes(id) ? 'A' : w.D.includes(id) ? 'D' : null;
function enemiesOf(id) { const s = new Set(); for (const w of warsOf(id)) (sideOf(w, id) === 'A' ? w.D : w.A).forEach(x => s.add(x)); return s; }
const inWar = id => G.wars.some(w => w.A.includes(id) || w.D.includes(id));
const hasNap = (a, b) => G.naps.some(n => (n.a === a && n.b === b) || (n.a === b && n.b === a));
const hasTrade = (a, b) => G.trades.some(n => (n.a === a && n.b === b) || (n.a === b && n.b === a));
const guarantees = (a, b) => G.guar.some(g => g.a === a && g.b === b);
const guarantorsOf = b => G.guar.filter(g => g.b === b && alive(g.a)).map(g => g.a);
const tradePartners = a => G.trades.filter(t => t.a === a || t.b === a).map(t => t.a === a ? t.b : t.a);
function canEnter(owner, i) { const ctl = G.prov[i].ctl; return ctl === owner || allied(owner, ctl) || atWar(owner, ctl); }

function createFaction(name, leader) {
  leaveFaction(leader, true);
  const f = { id: G.nextId++, n: name, l: leader, m: [leader] }; G.factions.push(f); dirty();
  addLog(`${C(leader).s} gründet das Bündnis „${name}“.`, 'dip'); return f;
}
function joinFaction(id, f) {
  if (!f || f.m.includes(id)) return; leaveFaction(id, true); f.m.push(id); dirty();
  for (const m of f.m) if (m !== id) addRel(id, m, 20);
  addLog(`${C(id).s} tritt dem Bündnis „${f.n}“ bei.`, 'dip');
  // Kriege des Bündnisses übernehmen (Verteidigung)
  for (const w of G.wars) { const s = w.A.includes(f.l) ? 'A' : w.D.includes(f.l) ? 'D' : null; if (s && !sideOf(w, id)) { if (s === 'D' || C(id).aggr >= .8) joinWar(w, id, s); } }
}
function leaveFaction(id, silent) {
  const f = factionOf(id); if (!f) return;
  f.m = f.m.filter(x => x !== id);
  if (f.m.length < 2 && !(f.m.length === 1 && C(f.m[0]).major)) { G.factions = G.factions.filter(x => x !== f); }
  else if (f.l === id) f.l = f.m.slice().sort((a, b) => milPower(b) - milPower(a))[0];
  if (!f.m.length) G.factions = G.factions.filter(x => x !== f);
  dirty();
  if (!silent) { for (const m of f.m) addRel(id, m, -25); addLog(`${C(id).s} verlässt das Bündnis „${f.n}“.`, 'dip'); }
}
function addNap(a, b, days = 0) { if (!hasNap(a, b)) G.naps.push({ a, b, until: days ? G.tick + days : 0 }); }
function removeNap(a, b) { G.naps = G.naps.filter(n => !((n.a === a && n.b === b) || (n.a === b && n.b === a))); }
function addTrade(a, b) { if (!hasTrade(a, b)) G.trades.push({ a, b }); }
function removeTrade(a, b) { G.trades = G.trades.filter(n => !((n.a === a && n.b === b) || (n.a === b && n.b === a))); }
function addGuarantee(a, b) { if (!guarantees(a, b)) { G.guar.push({ a, b }); addRel(a, b, 15); addLog(`${C(a).s} garantiert die Unabhängigkeit von ${C(b).s}.`, 'dip'); } }
function removeGuarantee(a, b) { G.guar = G.guar.filter(g => !(g.a === a && g.b === b)); }

/* ----------------------------------------------------------- Modifikatoren */
function computeMods(c) {
  const m = {};
  for (const t in c.tech) { const fx = TECH_BY_ID[t].fx; for (const k in fx) m[k] = (m[k] || 0) + fx[k]; }
  c.tmods = c.tmods.filter(t => t.until > G.tick);
  for (const t of c.tmods) m[t.k] = (m[t.k] || 0) + t.v;
  c.mods = m;
  const slots = c.baseSlots + (m.slot || 0);
  while (c.rs.length < slots) c.rs.push(null);
}
const mod = (c, k) => c.mods[k] || 0;
function addTMod(c, k, v, days) { c.tmods.push({ k, v, until: G.tick + days }); computeMods(c); }

/* ------------------------------------------------------------- Militär */
function newArmy(owner, prov, name) {
  const c = C(owner);
  const n = G.armies.filter(a => a.owner === owner).length + 1;
  const a = { id: G.nextId++, owner, name: name || `${n}. Armee`, prov, divs: [], gen: null, path: [], prog: 0, inv: null, sup: 1, xp: 0 };
  G.armies.push(a); return a;
}
function newDiv(t, c) { return { t, str: 100, org: maxOrg(c, t) }; }
function maxOrg(c, t) { return DIV[t].org * (1 + mod(c, 'org')) * (c.purge > G.tick ? .75 : 1); }
function armyStr(a) { return a.divs.length ? a.divs.reduce((s, d) => s + d.str, 0) / a.divs.length : 0; }
function armyOrg(a) { const c = C(a.owner); return a.divs.length ? a.divs.reduce((s, d) => s + d.org / maxOrg(c, d.t), 0) / a.divs.length : 0; }
function armyPow(a, kind = 'atk') { return a.divs.reduce((s, d) => s + DIV[d.t][kind] * d.str / 100, 0); }
function armiesAt(i) { return G.armies.filter(a => a.prov === i && !a.inv); }
function generalOf(a) { if (!a.gen) return null; return C(a.owner).gens.find(g => g.id === a.gen) || null; }
function milPower(id) {
  const c = C(id); if (!c || !c.alive) return 0;
  let p = 0; for (const a of G.armies) if (a.owner === id) p += (armyPow(a, 'atk') + armyPow(a, 'def')) / 2;
  return p + c.planes / 60 + (c.econ.mil || 0) * 6 + c.recQ.length * 10;
}
function navyPow(id) { const c = C(id); if (!c) return 0; let p = 0; for (const s in SHIPS) p += c.ships[s] * SHIPS[s].pow * (s === 'ss' ? 1 + mod(c, 'subPow') : 1); return p * (1 + mod(c, 'navPow')); }
function divCount(id) { let n = 0; for (const a of G.armies) if (a.owner === id) n += a.divs.length; return n; }
function coalitionPow(id) {
  let p = milPower(id); const f = factionOf(id); const seen = new Set([id]);
  if (f) for (const m of f.m) if (!seen.has(m)) { seen.add(m); p += milPower(m) * .8; }
  for (const g of guarantorsOf(id)) if (!seen.has(g)) { seen.add(g); p += milPower(g) * .6; }
  return p;
}

function placeInitialArmies(c) {
  const provs = provsOwned(c.id); if (!provs.length) return;
  const divs = []; for (const t in CD[c.id].div) for (let k = 0; k < CD[c.id].div[t]; k++) divs.push(t);
  if (!divs.length) return;
  const nArm = Math.max(1, Math.ceil(divs.length / 7));
  const border = provs.filter(i => PROV[i].nb.some(j => G.prov[j].own !== c.id));
  const scored = border.map(i => {
    let s = 0; for (const j of PROV[i].nb) { const o = G.prov[j].own; if (o !== c.id) s += (CD[o].major ? 3 : 1) + (CD[o].ide !== c.ide ? 1 : 0); }
    return [i, s + rand()];
  }).sort((a, b) => b[1] - a[1]);
  const spots = [c.cap];
  for (const [i] of scored) { if (spots.length >= nArm) break; if (spots.every(s => hexDist(s, i) >= 2)) spots.push(i); }
  while (spots.length < nArm) spots.push(scored.length ? pick(scored)[0] : c.cap);
  const arms = spots.map(s => newArmy(c.id, s));
  divs.forEach((t, k) => arms[k % arms.length].divs.push(newDiv(t, c)));
  c.gens.forEach((g, k) => { if (arms[k]) { arms[k].gen = g.id; g.army = arms[k].id; } });
}
function splitArmy(a) {
  if (a.divs.length < 2 || a.inv) return null;
  const b = newArmy(a.owner, a.prov); b.divs = a.divs.splice(Math.ceil(a.divs.length / 2)); b.xp = a.xp; b.auto = a.auto;
  const g = C(a.owner).gens.find(x => !x.army); if (g) { b.gen = g.id; g.army = b.id; }
  return b;
}
function mergeArmies(a, b) {
  if (a.prov !== b.prov || a.owner !== b.owner || a.inv || b.inv || a === b) return false;
  a.divs.push(...b.divs); const g = generalOf(b); if (g) g.army = null;
  G.armies = G.armies.filter(x => x !== b); return true;
}
function hexDist(a, b) {
  const A = PROV[a], B = PROV[b];
  const ax = A.c - (A.r - (A.r & 1)) / 2, az = A.r, bx = B.c - (B.r - (B.r & 1)) / 2, bz = B.r;
  const dx = ax - bx, dz = az - bz, dy = -dx - dz; return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
}

function findPath(owner, from, to) {
  if (from === to) return [];
  if (!PROV[to].land || !canEnter(owner, to)) return null;
  const prev = new Int32Array(PROV.length).fill(-2); prev[from] = -1; const q = [from];
  for (let h = 0; h < q.length; h++) {
    const i = q[h]; if (i === to) break;
    for (const j of PROV[i].nb) if (prev[j] === -2 && canEnter(owner, j)) { prev[j] = i; q.push(j); }
  }
  if (prev[to] === -2) return null;
  const path = []; for (let i = to; i !== from; i = prev[i]) path.push(i);
  return path.reverse();
}
// Breitensuche zum nächsten Feld, das eine Bedingung erfüllt
function findNearest(owner, from, pred, maxD = 60) {
  const prev = new Int32Array(PROV.length).fill(-2); prev[from] = -1; const q = [from], dist = { [from]: 0 };
  for (let h = 0; h < q.length; h++) {
    const i = q[h]; if (i !== from && pred(i)) { const path = []; for (let k = i; k !== from; k = prev[k]) path.push(k); return path.reverse(); }
    if (dist[i] >= maxD) continue;
    for (const j of PROV[i].nb) if (prev[j] === -2 && canEnter(owner, j) && !atWar(owner, G.prov[j].ctl)) { prev[j] = i; dist[j] = dist[i] + 1; q.push(j); }
  }
  return null;
}
function moveDays(a, to) {
  const c = C(a.owner);
  let sp = Math.min(...a.divs.map(d => DIV[d.t].speed), 2);
  if (a.divs.some(d => DIV[d.t].oil) && c.econ.oilR < 1) sp *= .6 + .4 * c.econ.oilR;
  const t = PROV[to].terrain; const tm = t === 'm' ? 1.8 : t === 'f' ? 1.3 : t === 'w' ? 1.6 : 1;
  const inf = 1.25 - .08 * G.prov[to].inf;
  const enemy = atWar(a.owner, G.prov[to].ctl) ? 1.8 : 1;
  return Math.max(1, 4.5 * tm * inf * enemy / (sp * (1 + mod(c, 'speed'))));
}
function orderMove(a, to) {
  if (a.inv) return { ok: false, msg: 'Armee befindet sich auf See.' };
  if (to === a.prov) { a.path = []; return { ok: true }; }
  const path = findPath(a.owner, a.prov, to);
  if (path) { a.path = path; a.prog = 0; return { ok: true, path }; }
  return { ok: false, msg: 'Kein Landweg möglich (neutrales Gebiet oder Meer).' };
}
function canInvade(a, to) {
  const c = C(a.owner);
  if (!PROV[a.prov].coastal || !PROV[to].coastal || !PROV[to].land) return { ok: false, msg: 'Start und Ziel müssen Küstenfelder sein.' };
  if (!canEnter(a.owner, to)) return { ok: false, msg: 'Ziel ist neutral – keine Landung möglich.' };
  if (navyPow(a.owner) < 5) return { ok: false, msg: 'Ihre Flotte ist zu schwach für einen Seetransport.' };
  return { ok: true };
}
function orderInvasion(a, to) {
  const r = canInvade(a, to); if (!r.ok) return r;
  const d = Math.hypot(PROV[a.prov].x - PROV[to].x, PROV[a.prov].y - PROV[to].y);
  const days = Math.round(8 + d / 25); a.inv = { to, from: a.prov, days, tot: days }; a.path = [];
  return { ok: true, msg: `Seetransport gestartet (${a.inv.days} Tage).` };
}

/* ---- Versorgung: 0-1-Breitensuche von Hauptstädten und Häfen ---- */
function computeSupply(id) {
  const c = C(id), N = PROV.length, dist = new Float32Array(N).fill(99);
  const okC = new Uint8Array(NC); for (let k = 0; k < NC; k++) okC[k] = allied(id, CIDS[k]) ? 1 : 0;
  const ok = i => okC[CIX[G.prov[i].ctl]] === 1;
  const q = [];
  const push = (i, d) => { if (d < dist[i]) { dist[i] = d; q.push(i); } };
  for (const o in G.C) if (G.C[o].alive && allied(id, o)) { const s = G.C[o].cap; if (s != null && ok(s)) push(s, 0); }
  if (navyPow(id) >= 8) for (const i of LAND) if (PROV[i].coastal && G.prov[i].ctl === id && G.prov[i].own === id) push(i, 1);
  for (let h = 0; h < q.length; h++) {
    const i = q[h], di = dist[i];
    for (const j of PROV[i].nb) if (ok(j)) { const p = G.prov[j]; push(j, di + (p.own === p.ctl ? 0.1 : 1)); }
  }
  const range = 7 + 5 * mod(c, 'supply');
  const sup = new Uint8Array(N);
  for (const i of LAND) {
    if (dist[i] <= range) sup[i] = 1;
    else if (!ok(i)) { for (const j of PROV[i].nb) if (dist[j] <= range) { sup[i] = 1; break; } }
  }
  return sup;
}

/* ----------------------------------------------------------- Kampf ---- */
function attMod(a, d, terr, sup, landing) {
  const c = C(a.owner), g = generalOf(a), tr = g ? TRAITS[g.tr] : {};
  const armored = d.t === 'tank' || d.t === 'mot';
  let m = 1 + mod(c, 'landAtk') + (d.t === 'tank' ? mod(c, 'tankAtk') : 0) + c.airBonus;
  if (g) m += g.sk * .04 + (tr.atk || 0) + (armored ? (tr.tank || 0) : 0);
  let tm = TERR[terr].atk; if (d.t === 'mnt' && terr === 'm') tm = .95; if (armored && terr !== 'p') tm *= .75;
  if (tr.terr) tm = 1 - (1 - tm) * (1 - tr.terr);
  m *= tm;
  if (!sup) m *= tr.log ? .8 : .6;
  if (armored && c.econ.oilR < 1) m *= .5 + .5 * c.econ.oilR;
  if (landing) m *= .5 + .25 * mod(c, 'invasion');
  return m * (1 + a.xp * .002);
}
function defMod(a, d, fort, sup) {
  const c = C(a.owner), g = generalOf(a), tr = g ? TRAITS[g.tr] : {};
  let m = 1 + mod(c, 'landDef') + c.airBonus + fort * .15 * (1 + mod(c, 'fort')) + Math.min(.3, (a.still || 0) * .015);
  if (g) m += g.sk * .04 + (tr.def || 0);
  if (!sup) m *= tr.log ? .8 : .6;
  return m * (1 + a.xp * .002);
}
function combatRound(atts, defs, hex, landing) {
  const terr = PROV[hex].terrain, fort = G.prov[hex].fort, W = 16;
  const A = [], D = [];
  for (const a of atts) for (const d of a.divs) A.push([a, d]);
  for (const a of defs) for (const d of a.divs) D.push([a, d]);
  A.sort((x, y) => DIV[y[1].t].atk * y[1].str - DIV[x[1].t].atk * x[1].str);
  D.sort((x, y) => DIV[y[1].t].def * y[1].str - DIV[x[1].t].def * x[1].str);
  const FA = A.slice(0, W), FD = D.slice(0, W);
  let AP = 0, DP = 0;
  for (const [a, d] of FA) AP += DIV[d.t].atk * d.str / 100 * (.4 + .6 * d.org / maxOrg(C(a.owner), d.t)) * attMod(a, d, terr, a.sup, landing);
  for (const [a, d] of FD) DP += DIV[d.t].def * d.str / 100 * (.4 + .6 * d.org / maxOrg(C(a.owner), d.t)) * defMod(a, d, fort, a.sup);
  const dmgD = AP * .35 * (.85 + .3 * rand()) / Math.max(1, FD.length);
  const dmgA = DP * .30 * (.85 + .3 * rand()) / Math.max(1, FA.length);
  for (const [a, d] of FD) { d.org = Math.max(0, d.org - dmgD); const l = dmgD * .16; d.str = Math.max(0, d.str - l); C(a.owner).cas += l * DIV[d.t].mp / 100; }
  for (const [a, d] of FA) { d.org = Math.max(0, d.org - dmgA); const l = dmgA * .12; d.str = Math.max(0, d.str - l); C(a.owner).cas += l * DIV[d.t].mp / 100; }
  for (const a of [...atts, ...defs]) { a.divs = a.divs.filter(d => d.str > 4); a.xp = Math.min(100, a.xp + .15); }
  return { AP, DP };
}
function retreat(a, from, byProv) {
  const opts = PROV[from].nb.filter(j => {
    const ctl = G.prov[j].ctl; if (!(ctl === a.owner || allied(a.owner, ctl))) return false;
    return !(byProv.get(j) || []).some(o => atWar(a.owner, o.owner));
  });
  if (!opts.length || !a.divs.length) { destroyArmy(a, true); return false; }
  const to = opts.sort((x, y) => (G.prov[y].own === a.owner) - (G.prov[x].own === a.owner) || PROV[y].vp - PROV[x].vp)[0];
  moveInIndex(byProv, a, to); a.prov = to; a.path = []; a.prog = 0;
  return true;
}
function destroyArmy(a, encircled) {
  if (encircled && a.divs.length && (playerConcerned(a.owner) || G.wars.some(w => sideOf(w, G.player) && (w.A.includes(a.owner) || w.D.includes(a.owner))))) {
    addLog(`${a.name} (${C(a.owner).s}) wurde eingekesselt und vernichtet.`, a.owner === G.player ? 'bad' : 'war');
  }
  const g = generalOf(a); if (g) g.army = null;
  G.armies = G.armies.filter(x => x !== a);
  if (G.sel && G.sel.army === a.id) G.sel = null;
}
function moveInIndex(byProv, a, to) {
  const from = byProv.get(a.prov); if (from) { const k = from.indexOf(a); if (k >= 0) from.splice(k, 1); }
  if (!byProv.has(to)) byProv.set(to, []); byProv.get(to).push(a);
}
function captureProv(i, by) {
  const p = G.prov[i]; if (!atWar(by, p.ctl)) return;
  const prevCtl = p.ctl;
  p.ctl = (p.own === by || (allied(by, p.own) && !atWar(by, p.own))) ? p.own : by;
  G.mapDirty = true;
  const isCap = C(p.own).cap === i;
  if (PROV[i].vp >= 4 && (playerConcerned(by, prevCtl) || isCap)) {
    addLog(`${C(by).s} erobert ${PROV[i].name}${isCap ? ' (Hauptstadt von ' + C(p.own).s + ')' : ''}.`, prevCtl === G.player ? 'bad' : by === G.player ? 'good' : 'war');
  }
}

function dailyMilitary() {
  G.battles = [];
  if (!G._sup || G.tick % 3 === 0) {
    G._sup = {};
    for (const id in G.C) if (G.C[id].alive && (inWar(id) || G.armies.some(a => a.owner === id && G.prov[a.prov].own !== id))) G._sup[id] = computeSupply(id);
  }
  const sup = G._sup;
  const byProv = new Map();
  for (const a of G.armies) if (!a.inv) { if (!byProv.has(a.prov)) byProv.set(a.prov, []); byProv.get(a.prov).push(a); }
  for (const a of G.armies) a.sup = sup[a.owner] ? sup[a.owner][a.prov] : 1;
  const attacks = new Map(); const fighting = new Set();
  for (const a of G.armies.slice()) {
    if (!G.armies.includes(a)) continue;
    if (a.inv) { stepInvasion(a, byProv, fighting); continue; }
    if (!a.path.length) continue;
    const nx = a.path[0];
    if (!canEnter(a.owner, nx)) { a.path = []; continue; }
    const defs = (byProv.get(nx) || []).filter(d => atWar(a.owner, d.owner));
    if (defs.length) { if (armyOrg(a) > .12) { if (!attacks.has(nx)) attacks.set(nx, []); attacks.get(nx).push(a); } else a.path = []; continue; }
    a.prog += 1;
    if (a.prog >= moveDays(a, nx)) {
      const wasEnemy = atWar(a.owner, G.prov[nx].ctl);
      moveInIndex(byProv, a, nx); a.prov = nx; a.path.shift(); a.prog = 0; a.still = 0;
      captureProv(nx, a.owner);
      // Einflusszone: Vormarsch stoppt in Feindesland neben feindlichen Truppen
      if (wasEnemy && a.path.length && PROV[nx].nb.some(j => j !== a.path[0] && (byProv.get(j) || []).some(o => atWar(a.owner, o.owner)))) a.path = [];
    }
  }
  for (const [hex, atts] of attacks) {
    const live = atts.filter(a => G.armies.includes(a) && a.divs.length);
    const defs = (byProv.get(hex) || []).filter(d => live.some(a => atWar(a.owner, d.owner)) && G.armies.includes(d));
    if (!live.length || !defs.length) continue;
    const r = combatRound(live, defs, hex, false);
    live.forEach(a => fighting.add(a)); defs.forEach(a => fighting.add(a));
    G.battles.push({ to: hex, from: live[0].prov, a: live[0].owner, d: defs[0].owner, r: r.AP / (r.AP + r.DP + .001) });
    for (const d of defs) if (G.armies.includes(d) && (!d.divs.length || armyOrg(d) < .1)) retreat(d, hex, byProv);
    for (const a of live) { if (!a.divs.length) destroyArmy(a); else if (armyOrg(a) < .12) { a.path = []; a.prog = 0; } }
  }
  // Erholung, Verstärkung, Zermürbung
  for (const a of G.armies) {
    if (a.inv) continue;
    const c = C(a.owner), g = generalOf(a), orgR = 1 + (g && TRAITS[g.tr].orgR || 0);
    const fight = fighting.has(a);
    if (!a.path.length) a.still = (a.still || 0) + 1;
    for (const d of a.divs) {
      const mo = maxOrg(c, d.t);
      if (a.sup) {
        if (!fight) d.org = Math.min(mo, d.org + 2.5 * orgR);
        if (!fight && d.str < 100) {
          const need = Math.min(1.5, 100 - d.str), eqN = DIV[d.t].eq * need / 100, mpN = DIV[d.t].mp * need / 100;
          if (c.eq >= eqN && c.mp >= mpN) { c.eq -= eqN; c.mp -= mpN; d.str += need; }
        }
      } else { d.org = Math.max(0, d.org - .6); d.str = Math.max(5, d.str - .25); }
    }
  }
}
function stepInvasion(a, byProv, fighting) {
  const v = a.inv; v.days--;
  if (v.days > 0) return;
  const c = C(a.owner);
  // Feindliche Flottenüberlegenheit
  const enemies = enemiesOf(a.owner); let en = 0; enemies.forEach(e => en += navyPow(e));
  if (en > navyPow(a.owner) * 1.5) { a.divs.forEach(d => d.str *= .75); addLog(`${a.name}: schwere Verluste durch feindliche Flotte auf See.`, a.owner === G.player ? 'bad' : 'war'); }
  a.inv = null;
  if (!canEnter(a.owner, v.to)) { a.prov = v.from; moveInIndex(byProv, a, v.from); return; }
  const defs = (byProv.get(v.to) || []).filter(d => atWar(a.owner, d.owner));
  if (defs.length) {
    let res = null;
    for (let k = 0; k < 6 && a.divs.length && armyOrg(a) > .15 && defs.some(d => d.divs.length && armyOrg(d) > .1); k++) res = combatRound([a], defs.filter(d => d.divs.length), v.to, true);
    fighting.add(a);
    const won = defs.every(d => !d.divs.length || armyOrg(d) < .1);
    if (won && a.divs.length) {
      for (const d of defs) if (G.armies.includes(d)) retreat(d, v.to, byProv);
      a.prov = v.to; moveInIndex(byProv, a, v.to); captureProv(v.to, a.owner);
      if (playerConcerned(a.owner) || defs.some(d => d.owner === G.player)) addLog(`Erfolgreiche Landung von ${a.name} (${c.s}) bei ${PROV[v.to].name}.`, a.owner === G.player ? 'good' : 'war');
    } else {
      a.prov = v.from; moveInIndex(byProv, a, v.from); a.divs.forEach(d => { d.str *= .8; d.org = 5; });
      if (!a.divs.length) destroyArmy(a);
      if (playerConcerned(a.owner) || defs.some(d => d.owner === G.player)) addLog(`Landung von ${a.name} (${c.s}) bei ${PROV[v.to].name} zurückgeschlagen.`, a.owner === G.player ? 'bad' : 'war');
    }
  } else {
    a.prov = v.to; moveInIndex(byProv, a, v.to); captureProv(v.to, a.owner);
    if (a.owner === G.player) addLog(`${a.name} ist bei ${PROV[v.to].name} gelandet.`, 'good');
  }
}

/* ------------------------------------------------------- Krieg & Frieden */
function warName(a, b) { return `${C(a).s}–${C(b).s}-Krieg`; }
function declareWar(a, b, opts = {}) {
  if (!alive(a) || !alive(b) || a === b || atWar(a, b) || allied(a, b)) return null;
  const ca = C(a), cb = C(b);
  if (hasNap(a, b)) { removeNap(a, b); ca.stab = clamp(ca.stab - 10, 0, 100); G.tension = clamp(G.tension + 5, 0, 100); addLog(`${ca.s} bricht den Nichtangriffspakt mit ${cb.s}!`, 'war'); }
  const w = { id: G.nextId++, name: opts.name || warName(a, b), A: [a], D: [b], start: G.tick };
  G.wars.push(w); dirty();
  ca.wargoals = ca.wargoals.filter(x => x !== b);
  addRel(a, b, -60); G.tension = clamp(G.tension + (cb.major || ca.major ? 10 : 5), 0, 100);
  G.threat[a] = (G.threat[a] || 0) + (cb.major ? 15 : 8);
  cb.ws = clamp(cb.ws + 20, 0, 100); ca.ws = clamp(ca.ws + 3, 0, 100);
  for (const o in G.C) if (o !== a && o !== b && G.C[o].alive) addRel(a, o, -5);
  notify(`⚔ ${ca.s} erklärt ${cb.s} den Krieg!`, 'war');
  // Verteidiger: Bündnis, Garanten, Oberherr
  const fb = factionOf(b);
  const defJoin = new Set(); if (fb) fb.m.forEach(m => defJoin.add(m));
  guarantorsOf(b).forEach(g => defJoin.add(g));
  if (cb.overlord) defJoin.add(cb.overlord);
  for (const id in G.C) if (G.C[id].overlord === b) defJoin.add(id);
  defJoin.delete(b); defJoin.delete(a);
  for (const j of defJoin) callToArms(w, j, 'D');
  // Angreifer-Bündnis
  const fa = factionOf(a);
  if (fa) for (const m of fa.m) if (m !== a && !defJoin.has(m)) callToArms(w, m, 'A');
  for (const id in G.C) if (G.C[id].overlord === a) callToArms(w, id, 'A');
  if (typeof onWarDeclared === 'function') onWarDeclared(a, b, w);
  return w;
}
function callToArms(w, j, side) {
  if (!alive(j) || sideOf(w, j)) return;
  const enemies = side === 'A' ? w.D : w.A;
  if (enemies.some(e => allied(j, e) && !atWar(j, e))) return;
  if (isPlayer(j)) { queueEvent('call_to_arms', j, { war: w.id, side }, 0); return; }
  const c = C(j), leader = side === 'A' ? w.A[0] : w.D[0];
  let join = side === 'D' ? true : (c.aggr >= .8 || rel(j, leader) > 85) && !enemies.some(e => hasNap(j, e));
  if (c.overlord) join = true;
  if (join) joinWar(w, j, side);
}
function joinWar(w, id, side) {
  if (!G.wars.includes(w) || sideOf(w, id) || !alive(id)) return;
  const enemies = side === 'A' ? w.D : w.A;
  for (const e of enemies) if (hasNap(id, e)) { removeNap(id, e); }
  (side === 'A' ? w.A : w.D).push(id); dirty();
  for (const e of enemies) addRel(id, e, -40);
  addLog(`${C(id).s} tritt dem ${w.name} bei (${side === 'A' ? 'Angreifer' : 'Verteidiger'}).`, 'war');
  if (id === G.player) UIHOOK.toast(`Ihr Land befindet sich nun im ${w.name}.`, 'war');
}
function warById(id) { return G.wars.find(w => w.id === id); }
function warScore(w) {
  let aL = 0, aT = 0, dL = 0, dT = 0;
  for (const i of LAND) {
    const p = G.prov[i], vp = PROV[i].vp;
    if (w.A.includes(p.own)) { aT += vp; if (w.D.includes(p.ctl)) aL += vp; }
    else if (w.D.includes(p.own)) { dT += vp; if (w.A.includes(p.ctl)) dL += vp; }
  }
  return Math.round(100 * (dL / Math.max(1, dT) - aL / Math.max(1, aT)));
}
function scoreFor(w, id) { const s = warScore(w); return sideOf(w, id) === 'A' ? s : -s; }
function transferProv(i, to) {
  const p = G.prov[i]; if (!p) return; p.own = to; p.ctl = to; G.mapDirty = true;
}
function revertOccupation(w, filterIds) {
  for (const i of LAND) {
    const p = G.prov[i]; if (p.ctl === p.own) continue;
    const pair = (w.A.includes(p.own) && w.D.includes(p.ctl)) || (w.D.includes(p.own) && w.A.includes(p.ctl));
    if (!pair) continue;
    if (filterIds && !(filterIds.includes(p.own) || filterIds.includes(p.ctl))) continue;
    if (!atWarOther(p.own, p.ctl, w)) { p.ctl = p.own; G.mapDirty = true; }
  }
}
function atWarOther(a, b, w) { return G.wars.some(x => x !== w && ((x.A.includes(a) && x.D.includes(b)) || (x.D.includes(a) && x.A.includes(b)))); }
function leaveWar(w, id) {
  const enemies = sideOf(w, id) === 'A' ? w.D.slice() : w.A.slice();
  revertOccupation(w, [id]);
  w.A = w.A.filter(x => x !== id); w.D = w.D.filter(x => x !== id); dirty();
  for (const e of enemies) if (!atWar(id, e)) addNap(id, e, 540);
  checkWarEnd(w);
}
function checkWarEnd(w) {
  w.A = w.A.filter(alive); w.D = w.D.filter(alive);
  if (w.A.length && w.D.length) return;
  revertOccupation(w); G.wars = G.wars.filter(x => x !== w); dirty();
  addLog(`Der ${w.name} ist beendet.`, 'info');
  fixArmies();
}
function endWar(w) { w.A.forEach(a => w.D.forEach(d => addNap(a, d, 540))); w.A = []; checkWarEnd(w); }

// Kapitulation prüfen (wöchentlich)
function checkCapitulations() {
  for (const id in G.C) {
    const c = G.C[id]; if (!c.alive || !inWar(id) || G.peaceQueue.some(p => p.loser === id)) continue;
    let tot = 0, held = 0;
    for (const i of LAND) { const p = G.prov[i]; if (p.own !== id) continue; tot += PROV[i].vp; if (p.ctl === id || (allied(id, p.ctl) && !atWar(id, p.ctl))) held += PROV[i].vp; }
    const capCtl = G.prov[c.cap] ? G.prov[c.cap].ctl : null;
    const capHeld = capCtl === id || (capCtl && allied(id, capCtl));
    const ratio = held / Math.max(1, tot);
    if ((ratio < .45 && !capHeld) || ratio < .22) capitulate(id);
  }
}
function capitulate(id) {
  const enemies = enemiesOf(id); const occ = {};
  for (const i of LAND) { const p = G.prov[i]; if (p.own === id && enemies.has(p.ctl)) occ[p.ctl] = (occ[p.ctl] || 0) + PROV[i].vp; }
  const main = Object.keys(occ).sort((a, b) => occ[b] - occ[a])[0] || [...enemies][0];
  notify(`🏳 ${C(id).n} kapituliert!`, id === G.player ? 'bad' : 'war');
  if (main === G.player && !G.observer) { G.peaceQueue.push({ loser: id, winner: main }); UIHOOK.peace(); return; }
  applyCapitulation(id, main, 'occ');
}
function applyCapitulation(id, winner, mode) {
  const c = C(id); if (!c.alive) return;
  const enemies = enemiesOf(id);
  for (const w of warsOf(id)) { w.A = w.A.filter(x => x !== id); w.D = w.D.filter(x => x !== id); }
  dirty();
  // Vom Verlierer besetzte fremde Gebiete zurückgeben
  for (const i of LAND) { const p = G.prov[i]; if (p.ctl === id && p.own !== id) { p.ctl = p.own; G.mapDirty = true; } }
  const own = provsOwned(id);
  if (mode === 'occ' || mode === 'full') {
    for (const i of own) { const p = G.prov[i]; if (enemies.has(p.ctl)) transferProv(i, p.ctl); }
    const rest = provsOwned(id);
    if (mode === 'full' || rest.length < 3 || rest.length < c.origProv * .15) for (const i of rest) transferProv(i, winner);
  } else if (mode === 'puppet') {
    for (const i of own) { const p = G.prov[i]; if (enemies.has(p.ctl) && p.ctl !== winner) transferProv(i, p.ctl); else p.ctl = id; }
    c.overlord = winner; setGovernment(id, C(winner).ide, null, true);
    leaveFaction(id, true); const f = factionOf(winner) || createFaction(`${C(winner).s}-Block`, winner); joinFaction(id, f);
    G.mapDirty = true;
  } else if (mode === 'repar') {
    for (const i of own) { const p = G.prov[i]; if (enemies.has(p.ctl)) p.ctl = id; }
    const w = C(winner); w.tr += c.tr * .5 + 300; w.eq += c.eq * .5; c.tr *= .5; c.eq *= .5; G.mapDirty = true;
  }
  G.armies.filter(a => a.owner === id).forEach(a => destroyArmy(a));
  if (mode !== 'puppet') leaveFaction(id, true);
  c.dcd.faction = G.tick + 900;
  if (c.alive && provsOwned(id).length) { enemies.forEach(e => addNap(id, e, 720)); c.stab = clamp(c.stab - 20, 0, 100); c.ws = clamp(c.ws - 30, 0, 100); }
  G.threat[winner] = (G.threat[winner] || 0) + 10; G.tension = clamp(G.tension + 3, 0, 100);
  for (const w of G.wars.slice()) checkWarEnd(w);
  afterTerritoryChange();
}
// Friedensschluss zwischen zwei Kriegsparteien
function makePeace(a, b, terms) {
  const w = G.wars.find(x => (x.A.includes(a) && x.D.includes(b)) || (x.D.includes(a) && x.A.includes(b)));
  if (!w) return;
  if (terms === 'take') for (const i of LAND) { const p = G.prov[i]; if (p.own === b && p.ctl === a) transferProv(i, a); }
  if (terms === 'give') for (const i of LAND) { const p = G.prov[i]; if (p.own === a && p.ctl === b) transferProv(i, b); }
  const sa = sideOf(w, a), sb = sideOf(w, b);
  const leadA = (sa === 'A' ? w.A : w.D)[0] === a, leadB = (sb === 'A' ? w.A : w.D)[0] === b;
  addLog(`Frieden zwischen ${C(a).s} und ${C(b).s} (${terms === 'white' ? 'Status quo' : 'Gebietsabtretungen'}).`, 'dip');
  if (leadA && leadB) endWar(w);
  else if (!leadA) leaveWar(w, a);
  else leaveWar(w, b);
  afterTerritoryChange();
}
function afterTerritoryChange() {
  for (const id in G.C) {
    const c = G.C[id]; if (!c.alive) continue;
    const own = provsOwned(id);
    if (!own.length) { killCountry(id); continue; }
    if (G.prov[c.cap].own !== id) {
      c.cap = own.slice().sort((x, y) => PROV[y].vp - PROV[x].vp)[0];
    }
  }
  fixArmies(); G.mapDirty = true; dirty();
}
function killCountry(id) {
  const c = C(id); c.alive = false;
  leaveFaction(id, true);
  for (const w of G.wars.slice()) { w.A = w.A.filter(x => x !== id); w.D = w.D.filter(x => x !== id); }
  G.naps = G.naps.filter(n => n.a !== id && n.b !== id); G.trades = G.trades.filter(n => n.a !== id && n.b !== id);
  G.guar = G.guar.filter(n => n.a !== id && n.b !== id);
  G.armies.filter(a => a.owner === id).forEach(a => destroyArmy(a));
  for (const o in G.C) if (G.C[o].overlord === id) G.C[o].overlord = null;
  dirty();
  addLog(`${c.n} hat aufgehört zu existieren.`, id === G.player ? 'bad' : 'war');
  for (const w of G.wars.slice()) checkWarEnd(w);
  if (id === G.player && !G.observer) { G.gameOver = true; UIHOOK.gameOver(false); }
}
function fixArmies() {
  for (const a of G.armies.slice()) {
    if (!alive(a.owner)) { destroyArmy(a); continue; }
    if (a.inv) continue;
    if (!canEnter(a.owner, a.prov) || (G.prov[a.prov].ctl !== a.owner && !allied(a.owner, G.prov[a.prov].ctl) && !atWar(a.owner, G.prov[a.prov].ctl))) {
      a.prov = C(a.owner).cap; a.path = []; a.prog = 0;
    }
    a.path = a.path.filter(i => canEnter(a.owner, i));
  }
}
function annexCountry(id, to) {
  for (const i of provsOwned(id)) transferProv(i, to);
  G.threat[to] = (G.threat[to] || 0) + Math.min(25, C(id).origProv);
  afterTerritoryChange();
}
function cedeProvs(list, to) { for (const i of list) transferProv(i, to); afterTerritoryChange(); }

/* --------------------------------------------------------------- Politik */
function setGovernment(id, ide, leader, silent) {
  const c = C(id); const old = c.ide; c.ide = ide;
  c.ldr = leader || c.alt[ide] || ({ fas: 'Nationale Führung', com: 'Revolutionsrat', dem: 'Koalitionsregierung', neu: 'Militärregierung' })[ide];
  if (old !== ide) {
    c.ipop[ide] = Math.max(c.ipop[ide], 50); normPop(c);
    for (const o in G.C) if (o !== id && G.C[o].alive) { const oi = G.C[o].ide; addRel(id, o, oi === ide ? 20 : oi === old ? -20 : 0); }
    if (!silent) notify(`${c.n}: Regierungswechsel – neue Führung: ${c.ldr} (${IDEOLOGIES[ide].n}).`, id === G.player ? 'good' : 'dip');
    const f = factionOf(id); if (f && !c.overlord && f.m.some(m => m !== id && C(m).ide !== ide && ((C(m).ide === 'fas') !== (ide === 'fas')))) leaveFaction(id);
  }
}
function normPop(c) { const s = c.ipop.fas + c.ipop.com + c.ipop.dem + c.ipop.neu; for (const k in c.ipop) c.ipop[k] = c.ipop[k] * 100 / s; }
function shiftPop(c, ide, v) { c.ipop[ide] = Math.max(1, c.ipop[ide] + v); normPop(c); }

const DECISIONS = [
  { id: 'unity', n: 'Kampagne der nationalen Einheit', d: '+12 Stabilität', cost: 75, cd: 180, ok: c => c.stab < 95, fx: c => { c.stab = clamp(c.stab + 12, 0, 100); } },
  { id: 'warprop', n: 'Kriegspropaganda', d: '+12 Kriegsunterstützung, +2 Spannung', cost: 60, cd: 120, ok: c => c.ws < 95, fx: c => { c.ws = clamp(c.ws + 12, 0, 100); G.tension = clamp(G.tension + 2, 0, 100); } },
  { id: 'warbonds', n: 'Kriegsanleihen ausgeben', d: '+400 Mio. Staatskasse, −5 Stabilität', cost: 30, cd: 240, ok: c => c.ws >= 20, fx: c => { c.tr += 400; c.stab = clamp(c.stab - 5, 0, 100); } },
  { id: 'rearm', n: 'Aufrüstungsprogramm', d: '+15 % Produktionseffizienz, −300 Mio.', cost: 50, cd: 365, ok: c => c.tr >= 300, fx: c => { c.eff = Math.min(1, c.eff + .15); c.tr -= 300; } },
  { id: 'reserve', n: 'Reservisten einberufen', d: '+1,5 % der Bevölkerung als Personal, −6 Stabilität', cost: 50, cd: 365, ok: c => c.ws >= 30, fx: c => { c.mp += c.pop * 15; c.stab = clamp(c.stab - 6, 0, 100); } },
  { id: 'infra_prog', n: 'Staatliches Bauprogramm', d: '+15 % Baugeschwindigkeit für 1 Jahr, −250 Mio.', cost: 50, cd: 400, ok: c => c.tr >= 250, fx: c => { addTMod(c, 'build', .15, 365); c.tr -= 250; } },
  { id: 'science', n: 'Forschungsförderung', d: '+10 % Forschung für 1 Jahr, −200 Mio.', cost: 50, cd: 400, ok: c => c.tr >= 200, fx: c => { addTMod(c, 'research', .10, 365); c.tr -= 200; } },
  { id: 'elections', n: 'Wahlen abhalten', d: 'Stärkste Ideologie übernimmt die Regierung (+5 Stabilität bei Bestätigung)', cost: 40, cd: 365, ok: c => c.ide === 'dem', fx: c => { const top = topIdeology(c); if (top !== c.ide) setGovernment(c.id, top); else { c.stab = clamp(c.stab + 5, 0, 100); if (isPlayer(c.id)) notify('Die Regierung wurde in Wahlen bestätigt.', 'good'); } } },
  { id: 'coup', n: 'Regierungsumsturz', d: 'Opposition mit über 45 % Rückhalt übernimmt die Macht (−15 Stabilität)', cost: 100, cd: 365, ok: c => topOpposition(c) && c.ipop[topOpposition(c)] > 45, fx: c => { setGovernment(c.id, topOpposition(c)); c.stab = clamp(c.stab - 15, 0, 100); } }
];
function topIdeology(c) { return Object.keys(c.ipop).sort((a, b) => c.ipop[b] - c.ipop[a])[0]; }
function topOpposition(c) { return Object.keys(c.ipop).filter(k => k !== c.ide).sort((a, b) => c.ipop[b] - c.ipop[a])[0]; }
function takeDecision(id, decId) {
  const c = C(id), d = DECISIONS.find(x => x.id === decId);
  if (!d || c.pp < d.cost || !d.ok(c) || (c.dcd[decId] || 0) > G.tick) return false;
  c.pp -= d.cost; c.dcd[decId] = G.tick + d.cd; d.fx(c); return true;
}
function propaganda(id, ide) { const c = C(id); if (c.pp < 40 || (c.dcd['prop_' + ide] || 0) > G.tick) return false; c.pp -= 40; c.dcd['prop_' + ide] = G.tick + 90; shiftPop(c, ide, 8); return true; }
function setLaw(id, kind, val) {
  const c = C(id), L = kind === 'eco' ? ECO_LAWS : kind === 'cons' ? CONS_LAWS : TAX_LAWS;
  if (c.laws[kind] === val || c.pp < 50 || (L[val].ws || 0) > c.ws) return false;
  c.pp -= 50; c.laws[kind] = val; return true;
}

/* ------------------------------------------------------- Diplomatie ---- */
function ideoAffinity(a, b) {
  const x = C(a).ide, y = C(b).ide; if (x === y) return 15;
  const p = [x, y].sort().join(); if (p === 'com,fas') return -35; if (p === 'dem,fas' || p === 'com,dem') return -15; return 0;
}
// Bewertung eines Vorschlags aus Sicht des Ziels (KI). Ergebnis: {score, reasons}
function evaluate(action, from, to) {
  const r = []; let s = 0; const add = (v, t) => { s += v; r.push([v, t]); };
  const cf = C(from), ct = C(to);
  add(Math.round(rel(from, to) * .5), 'Beziehungen');
  if (atWar(from, to)) { if (!action.startsWith('peace')) return { score: -999, reasons: [[-999, 'Befinden sich im Krieg']] }; }
  const ratio = coalitionPow(from) / Math.max(1, coalitionPow(to));
  if (action === 'nap') {
    add(10, 'Grundhaltung');
    add(Math.round(clamp((ratio - 1) * 15, -10, 25)), 'Kräfteverhältnis');
    if (ct.wargoals.includes(from)) add(-50, 'Hat Kriegsziel gegen Sie');
    if (ideoAffinity(from, to) < -20) add(-15, 'Ideologische Feindschaft');
    if (G.threat[from] > 40) add(-10, 'Ihre Bedrohlichkeit');
  } else if (action === 'trade') {
    add(20, 'Wirtschaftlicher Nutzen');
    add(Math.round(ideoAffinity(from, to) * .5), 'Ideologie');
    if (enemiesOf(to).size && [...enemiesOf(to)].some(e => allied(from, e))) add(-60, 'Sie unterstützen ihre Feinde');
  } else if (action === 'invite' || action === 'join') {
    const f = factionOf(action === 'invite' ? from : to);
    add(ideoAffinity(from, to), 'Ideologie');
    if (action === 'invite' && factionOf(to)) add(-60, 'Bereits in einem Bündnis');
    if (action === 'invite' && !cf.major) add(-15, 'Bündnisführer ist keine Großmacht');
    if (action === 'invite') {
      // Bedrohung durch gemeinsame Gegner
      let th = 0; for (const o of neighborsOfCountry(to)) if (o !== from && C(o).aggr > .4 && ideoAffinity(o, to) < 0 && milPower(o) > milPower(to) * 1.5) th += 12;
      add(Math.min(30, th), 'Bedrohung durch Nachbarn');
      if (inWar(from)) add(-25, 'Würde in Krieg hineingezogen');
      if (ct.major) add(-20, 'Großmacht will unabhängig bleiben');
      if (ct.ide === 'neu' && cf.ide !== 'neu') add(-10, 'Neutralitätspolitik');
      if (typeof NEUTRALS !== 'undefined' && NEUTRALS.includes(to) && !inWar(to)) add(-40, 'Traditionelle Neutralität');
      add(-15, 'Bündnispflichten sind riskant');
    } else {
      add(-15, 'Bündnispflichten sind riskant');
      if (inWar(from)) add(-30, 'Sie befinden sich im Krieg');
      if (G.threat[from] > 30) add(-15, 'Ihre Bedrohlichkeit');
      if (f && f.m.some(m => m !== from && rel(m, from) < -20)) add(-25, 'Mitglieder misstrauen Ihnen');
      add(Math.round(Math.min(20, milPower(from) / Math.max(1, milPower(to)) * 10)), 'Ihr militärischer Wert');
    }
  } else if (action === 'demand') {
    add(Math.round(clamp((ratio - 2.2) * 25, -60, 40)), 'Kräfteverhältnis');
    if (guarantorsOf(to).length) add(-30, 'Hat Schutzmächte');
    if (factionOf(to)) add(-30, 'Ist in einem Bündnis');
    if (ct.major) add(-40, 'Großmacht');
    add(-20, 'Nationaler Stolz');
  } else if (action === 'peace_white' || action === 'peace_take') {
    const w = G.wars.find(x => (x.A.includes(from) && x.D.includes(to)) || (x.D.includes(from) && x.A.includes(to)));
    if (!w) return { score: -999, reasons: [[-999, 'Kein Krieg']] };
    const sc = scoreFor(w, to); const age = G.tick - w.start;
    s = 0; r.length = 0;
    add(-sc, 'Kriegslage (Siegpunkte)');
    if (action === 'peace_white') { add(age > 90 ? 10 : -20, age > 90 ? 'Kriegsmüdigkeit' : 'Krieg hat gerade begonnen'); add(Math.round((50 - ct.ws) / 5), 'Kriegsunterstützung'); }
    else add(-25, 'Gebietsabtretung gefordert');
    const lp = milPower(to) / Math.max(1, milPower(from)); add(Math.round(clamp((1 - lp) * 20, -20, 20)), 'Armeestärke');
  }
  return { score: s, reasons: r };
}
const PP_COST = { improve: 20, worsen: 10, nap: 25, trade: 10, guarantee: 25, invite: 25, join: 25, create: 50, justify: 50, demand: 40, peace: 10 };
// Führt Diplomatie-Aktion aus. Gibt {ok,msg}
function diplo(action, from, to, extra) {
  const cf = C(from), ct = to ? C(to) : null; const cost = PP_COST[action] || 0;
  if (cf.pp < cost) return { ok: false, msg: 'Nicht genug politische Macht.' };
  const pay = () => { cf.pp -= cost; };
  switch (action) {
    case 'improve': if ((cf.dcd['imp_' + to] || 0) > G.tick) return { ok: false, msg: 'Erst in einigen Tagen wieder möglich.' };
      pay(); addRel(from, to, 12); cf.dcd['imp_' + to] = G.tick + 30; return { ok: true, msg: `Beziehungen zu ${ct.s} verbessert (+12).` };
    case 'worsen': pay(); addRel(from, to, -20); G.tension = clamp(G.tension + 1, 0, 100); return { ok: true, msg: `Beziehungen zu ${ct.s} verschlechtert.` };
    case 'guarantee': if (guarantees(from, to)) { removeGuarantee(from, to); addRel(from, to, -15); return { ok: true, msg: `Garantie für ${ct.s} zurückgezogen.` }; }
      pay(); addGuarantee(from, to); return { ok: true, msg: `Sie garantieren die Unabhängigkeit von ${ct.s}.` };
    case 'create': if (factionOf(from)) return { ok: false, msg: 'Sie sind bereits in einem Bündnis.' };
      pay(); createFaction(extra || `${cf.s}er Bund`, from); return { ok: true, msg: 'Bündnis gegründet.' };
    case 'leave': leaveFaction(from); return { ok: true, msg: 'Bündnis verlassen.' };
    case 'cancel_trade': removeTrade(from, to); addRel(from, to, -10); return { ok: true, msg: 'Handelsabkommen gekündigt.' };
    case 'cancel_nap': removeNap(from, to); addRel(from, to, -20); G.tension = clamp(G.tension + 2, 0, 100); return { ok: true, msg: 'Nichtangriffspakt gekündigt.' };
    case 'justify': {
      const chk = canJustify(from, to); if (!chk.ok) return chk;
      const c2 = cf.ide === 'fas' || cf.ide === 'com' ? 35 : 50; if (cf.pp < c2) return { ok: false, msg: 'Nicht genug politische Macht.' };
      cf.pp -= c2; G.justify.push({ a: from, b: to, done: G.tick + 45 });
      G.tension = clamp(G.tension + 3, 0, 100); G.threat[from] = (G.threat[from] || 0) + 8; addRel(from, to, -25);
      addLog(`${cf.s} schafft einen Kriegsgrund gegen ${ct.s}.`, 'war');
      if (!isPlayer(to)) aiReactToJustify(to, from);
      else notify(`Warnung: ${cf.s} bereitet einen Kriegsgrund gegen Sie vor!`, 'bad');
      return { ok: true, msg: `Kriegsgrund gegen ${ct.s} wird vorbereitet (45 Tage).` };
    }
    case 'war': {
      if (!cf.wargoals.includes(to)) return { ok: false, msg: 'Kein Kriegsgrund vorhanden.' };
      declareWar(from, to); return { ok: true, msg: 'Krieg erklärt.' };
    }
    case 'joinwar': {
      const w = G.wars.find(x => (sideOf(x, to) && (x.A.includes(to) ? x.D : x.A).some(e => allied(from, e))));
      if (!w) return { ok: false, msg: 'Kein passender Krieg.' };
      const side = w.A.includes(to) ? 'D' : 'A'; joinWar(w, from, side); return { ok: true, msg: `Sie treten dem ${w.name} bei.` };
    }
  }
  // Vorschläge, die Zustimmung brauchen
  if (['nap', 'trade', 'invite', 'join', 'demand'].includes(action)) {
    if (action === 'nap' && hasNap(from, to)) return { ok: false, msg: 'Pakt besteht bereits.' };
    if (action === 'trade' && hasTrade(from, to)) return { ok: false, msg: 'Abkommen besteht bereits.' };
    if (action === 'invite' && !factionOf(from)) return { ok: false, msg: 'Sie führen kein Bündnis.' };
    if (action === 'join' && !factionOf(to)) return { ok: false, msg: 'Kein Bündnis vorhanden.' };
    const list = action === 'demand' ? demandable(from, to) : null;
    if (action === 'demand' && !list.length) return { ok: false, msg: 'Keine einforderbaren Gebiete (nur eigene Kerngebiete oder Ansprüche).' };
    pay();
    if (isPlayer(to)) { queueEvent('ai_proposal', to, { action, from }, 0); return { ok: true, msg: 'Vorschlag übermittelt.' }; }
    const ev = evaluate(action, from, to);
    if (ev.score < 0) {
      if (action === 'demand') { cf.wargoals.includes(to) || cf.wargoals.push(to); addRel(from, to, -30); G.tension = clamp(G.tension + 3, 0, 100); }
      return { ok: false, msg: `${ct.s} lehnt ab.` + (action === 'demand' ? ' Sie erhalten dadurch einen Kriegsgrund.' : '') };
    }
    acceptProposal(action, from, to, list);
    return { ok: true, msg: `${ct.s} stimmt zu.` };
  }
  return { ok: false, msg: 'Unbekannte Aktion.' };
}
function acceptProposal(action, from, to, list) {
  const loud = playerConcerned(from, to) || (C(from).major && C(to).major);
  if (action === 'nap') { addNap(from, to); addRel(from, to, 10); if (loud) addLog(`Nichtangriffspakt zwischen ${C(from).s} und ${C(to).s}.`, 'dip'); }
  if (action === 'trade') { addTrade(from, to); addRel(from, to, 5); if (loud) addLog(`Handelsabkommen zwischen ${C(from).s} und ${C(to).s}.`, 'dip'); }
  if (action === 'invite') joinFaction(to, factionOf(from));
  if (action === 'join') joinFaction(from, factionOf(to));
  if (action === 'demand') {
    list = list || demandable(from, to); cedeProvs(list, from);
    G.tension = clamp(G.tension + 4, 0, 100); G.threat[from] = (G.threat[from] || 0) + 6;
    notify(`${C(to).s} tritt ${list.length} Gebiet(e) an ${C(from).s} ab.`, 'dip');
  }
}
function demandable(from, to) {
  const cl = new Set(G.claims[from] || []);
  return provsOwned(to).filter(i => PROV[i].owner0 === from || cl.has(i));
}
function canJustify(from, to) {
  const cf = C(from), ct = C(to);
  if (!alive(to) || from === to) return { ok: false, msg: 'Ungültiges Ziel.' };
  if (allied(from, to)) return { ok: false, msg: 'Nicht gegen Verbündete möglich.' };
  if (atWar(from, to)) return { ok: false, msg: 'Bereits im Krieg.' };
  if (cf.wargoals.includes(to) || G.justify.some(j => j.a === from && j.b === to)) return { ok: false, msg: 'Kriegsgrund existiert bereits / in Arbeit.' };
  if (cf.overlord) return { ok: false, msg: 'Als Satellitenstaat nicht möglich.' };
  const need = cf.ide === 'dem' ? ((ct.ide === 'fas' || ct.ide === 'com') ? 40 : 70) : cf.ide === 'neu' ? 30 : 0;
  if (G.tension < need) return { ok: false, msg: `Ihre Regierung (${IDEOLOGIES[cf.ide].n}) benötigt mindestens ${need} % Weltspannung (aktuell ${Math.round(G.tension)} %).` };
  return { ok: true };
}

/* -------------------------------------------------------- Wirtschaft --- */
function econBase(c) {
  let civ = 0, mil = 0; const prod = [0, 0, 0, 0];
  for (const i of LAND) {
    const p = G.prov[i];
    if (p.own === c.id && p.ctl === c.id) { civ += p.civ; mil += p.mil; for (let k = 0; k < 4; k++) prod[k] += p.res[k]; }
    else if (p.ctl === c.id) { civ += p.civ * .5; mil += p.mil * .5; for (let k = 0; k < 4; k++) prod[k] += p.res[k] * .5; }
  }
  if (mod(c, 'synOil')) prod[1] += 4 + civ * .1;
  if (mod(c, 'synRub')) prod[3] += 3 + civ * .08;
  let oil = 0, mech = 0;
  for (const a of G.armies) if (a.owner === c.id) for (const d of a.divs) { oil += DIV[d.t].oil; if (DIV[d.t].oil) mech++; }
  const need = [mil * .8, oil + c.planes / 150 + navyPow(c.id) / 40, mil * .25, mil * .15 + mech * .3];
  return { civ, mil, prod, need };
}
function monthlyEconomyAll() {
  const base = {};
  for (const id in G.C) if (G.C[id].alive) base[id] = econBase(G.C[id]);
  // Handel: Überschüsse der Partner decken Defizite
  for (const id in base) {
    const c = G.C[id], b = base[id], imp = [0, 0, 0, 0];
    for (const p of tradePartners(id)) {
      if (!base[p] || atWar(id, p)) continue;
      const pc = tradePartners(p).length || 1;
      for (let k = 0; k < 4; k++) {
        const def = b.need[k] - b.prod[k] - imp[k]; if (def <= 0) continue;
        const sur = Math.max(0, base[p].prod[k] - base[p].need[k]) * .6 / pc;
        imp[k] += Math.min(def, sur);
      }
    }
    if (c.blockade > 0) for (let k = 0; k < 4; k++) imp[k] *= 1 - c.blockade;
    const avail = b.prod.map((v, k) => v + imp[k]);
    const rat = k => b.need[k] > 0 ? Math.min(1, avail[k] / b.need[k]) : 1;
    const resF = .5 + .5 * Math.min(rat(0), rat(2), rat(3));
    const cons = Math.max(.04, ECO_LAWS[c.laws.eco].cons - mod(c, 'consumer'));
    const stabF = c.stab < 30 ? .85 : c.stab > 70 ? 1.05 : 1;
    const civAvail = Math.max(0, b.civ * (1 - cons));
    const milOut = (b.mil + c.lend) * c.eff * (1 + mod(c, 'milOut')) * resF * stabF * (c.tr < 0 ? .9 : 1) * (1 - c.bombDmg);
    c.eff = Math.min(.7 + mod(c, 'effCap'), c.eff + .04);
    const divs = divCount(id);
    const income = (b.civ * 2.5 + c.pop * .4) * TAX_LAWS[c.laws.tax].mult * (1 + mod(c, 'income')) + tradePartners(id).length * 3;
    const expense = divs * 1.0 + c.planes / 150 + navyPow(id) * .08 + b.mil * .5;
    c.econ = { civ: b.civ, mil: b.mil, prod: b.prod, need: b.need, imp, avail, resF, oilR: rat(1), cons, civAvail, milOut, income: income * (1 - c.blockade * .4), expense, stabF };
  }
}
function monthlyCountry(c) {
  const e = c.econ;
  c.tr += e.income - e.expense;
  if (c.tr < 0) c.stab = clamp(c.stab - 2, 0, 100);
  c.pp = Math.min(999, c.pp + 40 + mod(c, 'pp') + (c.stab > 70 ? 5 : 0) + (c.stab < 25 ? -10 : 0));
  // Personal
  const cap = c.pop * 1000 * CONS_LAWS[c.laws.cons].rate;
  c.mp = Math.min(cap, c.mp + cap / 12);
  // Stabilität & Kriegsunterstützung
  const war = inWar(c.id);
  let base = 50 + (c.ipop[c.ide] - 50) * .3 + TAX_LAWS[c.laws.tax].stab + ECO_LAWS[c.laws.eco].stab + CONS_LAWS[c.laws.cons].stab;
  if (war && c.ide === 'dem' && !G.wars.some(w => w.D.includes(c.id))) base -= 10;
  if (c.tr < 0) base -= 10;
  c.stab = clamp(c.stab + (base - c.stab) * .08, 0, 100);
  let wsB = ({ fas: 40, com: 30, dem: 15, neu: 20 })[c.ide] + G.tension * .3 + (G.wars.some(w => w.D.includes(c.id)) ? 20 : 0) - Math.min(25, c.cas / (c.pop * 4));
  c.ws = clamp(c.ws + (wsB - c.ws) * .08, 0, 100);
  // Ideologie-Drift
  shiftPop(c, c.ide, .6);
  computeMods(c);
}
function dailyCountry(c) {
  const e = c.econ; if (!e.civ && !e.mil && !c.recQ.length) return;
  // Bau
  let pts = e.civAvail * (1 + mod(c, 'build')) * e.stabF / 30;
  for (const q of c.buildQ) {
    if (pts <= 0) break;
    const use = Math.min(PROJ_MAX * (1 + mod(c, 'build')) / 30, pts); pts -= use; q.p += use;
    if (q.p >= BUILD[q.t].cost) {
      const p = G.prov[q.prov];
      if (p && p.own === c.id) { if (q.t === 'infra') p.inf = Math.min(5, p.inf + 1); else if (q.t === 'fort') p.fort = Math.min(5, p.fort + 1); else p[q.t]++; }
      q.done = true;
      if (isPlayer(c.id)) notify(`Bau abgeschlossen: ${BUILD[q.t].n} in ${PROV[q.prov].name}.`, 'good');
    }
  }
  c.buildQ = c.buildQ.filter(q => !q.done && G.prov[q.prov].own === c.id);
  // Produktion
  const out = e.milOut / 30;
  c.eq += out * c.alloc.land / 100 * LAND_EQ;
  c.planes += out * c.alloc.air / 100 * AIR_PL;
  c.navPts += out * c.alloc.navy / 100 * NAV_PTS;
  if (c.shipQ.length) { const s = c.shipQ[0]; if (c.navPts >= SHIPS[s].cost) { c.navPts -= SHIPS[s].cost; c.ships[s]++; c.shipQ.shift(); if (isPlayer(c.id)) notify(`Stapellauf: neuer ${SHIPS[s].n}.`, 'good'); } }
  else c.navPts = Math.min(c.navPts, 400);
  // Rekrutierung
  for (const q of c.recQ) q.d--;
  const done = c.recQ.filter(q => q.d <= 0); c.recQ = c.recQ.filter(q => q.d > 0);
  for (const q of done) deployDivision(c, q.t);
  // Forschung
  const rspd = (1 + mod(c, 'research')) * (.8 + .4 * c.stab / 100);
  c.rs.forEach((s, k) => {
    if (!s) return; s.p += rspd;
    if (s.p >= techCost(c, s.t)) {
      c.tech[s.t] = G.tick; c.rs[k] = null; computeMods(c);
      if (isPlayer(c.id)) notify(`Forschung abgeschlossen: ${TECH_BY_ID[s.t].n}.`, 'good');
    }
  });
}
function techCost(c, id) { const t = TECH_BY_ID[id]; const y = curDate().y; return Math.round(t.cost * (y < t.y ? 1 + .45 * (t.y - y) : 1)); }
function techAvailable(c, id) { const t = TECH_BY_ID[id]; return !c.tech[id] && !c.rs.some(s => s && s.t === id) && t.req.every(r => c.tech[r]); }
function startResearch(id, techId, slot) {
  const c = C(id); if (!techAvailable(c, techId)) return false;
  if (slot == null) slot = c.rs.findIndex(s => !s); if (slot < 0) return false;
  c.rs[slot] = { t: techId, p: 0 }; return true;
}
function deployDivision(c, t) {
  let a = G.armies.find(x => x.owner === c.id && x.prov === c.cap && !x.inv && x.divs.length < 10 && !x.path.length);
  if (!a) a = newArmy(c.id, c.cap);
  a.divs.push(newDiv(t, c));
}
function recruit(id, t, n = 1) {
  const c = C(id); let k = 0;
  for (; k < n; k++) {
    if (c.eq < DIV[t].eq || c.mp < DIV[t].mp) break;
    c.eq -= DIV[t].eq; c.mp -= DIV[t].mp; c.recQ.push({ t, d: DIV[t].days });
  }
  return k;
}
function maxFactories(i) { return 4 + G.prov[i].inf * 2 + (PROV[i].city ? 4 : 0); }
function canBuild(id, t, i) {
  const p = G.prov[i]; if (!p || p.own !== id || p.ctl !== id) return false;
  const queued = C(id).buildQ.filter(q => q.prov === i && q.t === t).length;
  if (t === 'infra') return p.inf + queued < 5;
  if (t === 'fort') return p.fort + queued < 5;
  const qf = C(id).buildQ.filter(q => q.prov === i && (q.t === 'civ' || q.t === 'mil')).length;
  return p.civ + p.mil + qf < maxFactories(i);
}
function queueBuild(id, t, i) {
  if (i == null) i = bestBuildProv(id, t);
  if (i == null || !canBuild(id, t, i)) return false;
  C(id).buildQ.push({ t, prov: i, p: 0 }); return true;
}
function bestBuildProv(id, t) {
  const c = C(id); const cands = provsOwned(id).filter(i => canBuild(id, t, i));
  if (!cands.length) return null;
  if (t === 'fort') {
    const threat = cands.filter(i => PROV[i].nb.some(j => { const o = G.prov[j].own; return o !== id && !allied(id, o) && (atWar(id, o) || C(o).wargoals.includes(id) || C(o).aggr > .4); }));
    const pool = threat.length ? threat : cands; return pool.sort((a, b) => G.prov[a].fort - G.prov[b].fort || PROV[b].vp - PROV[a].vp)[0];
  }
  if (t === 'infra') return cands.sort((a, b) => (G.prov[b].civ + G.prov[b].mil) - (G.prov[a].civ + G.prov[a].mil) || G.prov[a].inf - G.prov[b].inf)[0];
  return cands.sort((a, b) => (G.prov[b].inf + PROV[b].vp * .3) - (G.prov[a].inf + PROV[a].vp * .3))[0];
}

/* ------------------------------------------------- Luft- und Seekrieg --- */
function monthlyWarfare() {
  for (const id in G.C) { const c = G.C[id]; c.airBonus = 0; c.blockade = 0; c.bombDmg = Math.max(0, c.bombDmg * .5); }
  const done = new Set();
  for (const id in G.C) {
    const c = G.C[id]; if (!c.alive || !inWar(id) || done.has(id)) continue;
    const en = [...enemiesOf(id)].filter(alive); if (!en.length) continue;
    const mine = [id]; for (const o in G.C) if (o !== id && G.C[o].alive && allied(id, o) && en.some(e => atWar(o, e))) mine.push(o);
    const airP = ids => ids.reduce((s, x) => s + C(x).planes * (1 + mod(C(x), 'airPow')), 0);
    const navP = ids => ids.reduce((s, x) => s + navyPow(x), 0);
    const A1 = airP(mine), A2 = airP(en), N1 = navP(mine), N2 = navP(en);
    const ratio = A1 / Math.max(1, A1 + A2);
    for (const x of mine) {
      if (done.has(x)) continue; done.add(x);
      const cx = C(x);
      cx.airBonus = clamp((ratio - .5) * .4, -.2, .2) + (ratio > .5 ? mod(cx, 'airBonus') : 0);
      cx.planes = Math.max(0, cx.planes - Math.min(cx.planes * .25, A2 * .03 * (cx.planes / Math.max(1, A1))));
      // Seekrieg
      const nr = N1 / Math.max(1, N1 + N2);
      const loss = (1 - nr) * .06;
      for (const s in SHIPS) if (cx.ships[s] > 0 && rand() < loss * cx.ships[s]) cx.ships[s] = Math.max(0, cx.ships[s] - Math.max(1, Math.round(cx.ships[s] * loss)));
      if (nr < .35) cx.blockade = clamp((.35 - nr) * 2, 0, .7);
      // Strategische Bomber
      if (ratio < .4) cx.bombDmg = Math.min(.25, cx.bombDmg + (.4 - ratio) * .3 * (1 + en.reduce((m, e) => Math.max(m, mod(C(e), 'bomb')), 0)) * (1 - mod(cx, 'bombRes')));
    }
  }
}

/* ------------------------------------------------------- Hauptschleife --- */
function advanceDay() {
  if (G.gameOver && !G.observer) return;
  G.tick++;
  const d = curDate();
  for (const id in G.C) if (G.C[id].alive) dailyCountry(G.C[id]);
  dailyMilitary();
  // Kriegsgründe fertigstellen
  for (const j of G.justify.slice()) if (G.tick >= j.done) {
    G.justify = G.justify.filter(x => x !== j);
    if (alive(j.a) && alive(j.b) && !C(j.a).wargoals.includes(j.b)) {
      C(j.a).wargoals.push(j.b);
      if (isPlayer(j.a)) notify(`Kriegsgrund gegen ${C(j.b).s} ist bereit. Sie können nun den Krieg erklären.`, 'war');
    }
  }
  if (typeof aiDaily === 'function' && G.tick % 2 === 0) aiDaily();
  if (d.d === 1) monthly();
  if (G.tick % 7 === 0) checkCapitulations();
  if (typeof processEvents === 'function') processEvents();
  if (d.y >= 1946 && !G.flags.ended) { G.flags.ended = true; UIHOOK.gameOver(true); }
}
function monthly() {
  monthlyEconomyAll();
  for (const id in G.C) if (G.C[id].alive) monthlyCountry(G.C[id]);
  monthlyWarfare();
  G.naps = G.naps.filter(n => !n.until || n.until > G.tick);
  if (!G.wars.length) G.tension = Math.max(0, G.tension - .4);
  for (const id in G.threat) G.threat[id] = Math.max(0, G.threat[id] * .97);
  if (typeof aiMonthly === 'function') aiMonthly();
  // Relationen langsam normalisieren
  for (const k in G.rel) { const [a, b] = k.split('|'); if (!atWar(a, b)) G.rel[k] += ((ideoAffinity(a, b) * .8) - G.rel[k]) * .01; }
}

/* ------------------------------------------------- Speichern/Laden ---- */
function serialize() { return JSON.stringify(G, (k, v) => k === '_sup' ? undefined : v); }
function deserialize(s) { if (!PROV.length) buildStatic(); G = JSON.parse(s); G.paused = true; dirty(); G.mapDirty = true; return G; }
