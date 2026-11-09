'use strict';
/* ==========================================================================
   Iron Empires – Künstliche Intelligenz für alle Nicht-Spieler-Länder
   ========================================================================== */
const isAI = id => !isPlayer(id);
const MOUNTAIN_NATIONS = ['ITA', 'YUG', 'GRE', 'SWI', 'AUT', 'NOR', 'TUR', 'SPA', 'BUL', 'ALB'];
const CAV_NATIONS = ['POL', 'SOV', 'TUR', 'HUN', 'ROM'];
const NEUTRALS = ['SWI', 'SWE', 'IRE', 'POR', 'TUR', 'BEL', 'HOL', 'DEN', 'NOR', 'SPA'];

/* ------------------------------------------------------- Militär (täglich) */
function aiDaily() {
  const ids = Object.keys(G.C);
  for (let k = 0; k < ids.length; k++) {
    const id = ids[k]; if (!alive(id) || !isAI(id)) continue;
    if (inWar(id)) aiWarArmies(id);
  }
  // Spielerarmeen mit aktivierter KI-Frontführung
  if (alive(G.player) && !G.observer && inWar(G.player) && G.armies.some(a => a.owner === G.player && a.auto)) aiWarArmies(G.player, true);
}
function aiWarArmies(id, autoOnly) {
  const myArmies = G.armies.filter(a => a.owner === id && !a.inv && a.divs.length && (!autoOnly || a.auto));
  if (!myArmies.length) return;
  const enemyPow = new Map(), enemyDivs = new Map(), friendDivs = new Map();
  for (const a of G.armies) {
    if (a.inv) continue;
    if (atWar(id, a.owner)) { enemyPow.set(a.prov, (enemyPow.get(a.prov) || 0) + armyPow(a, 'def') * (.4 + .6 * armyOrg(a))); enemyDivs.set(a.prov, (enemyDivs.get(a.prov) || 0) + a.divs.length); }
    else if (allied(id, a.owner)) { const t = a.path.length ? a.path[a.path.length - 1] : a.prov; friendDivs.set(t, (friendDivs.get(t) || 0) + a.divs.length); }
  }
  const isEnemy = i => atWar(id, G.prov[i].ctl);
  const isFront = i => { const ctl = G.prov[i].ctl; return (ctl === id || allied(id, ctl)) && !isEnemy(i) && PROV[i].nb.some(isEnemy); };
  const need = i => { let n = 2; for (const j of PROV[i].nb) n += (enemyDivs.get(j) || 0) * .7; return n; };
  // Front aufteilen: große Armeen teilen, wenn Abschnitte unbesetzt sind
  let frontCount = 0; for (const i of LAND) if (G.prov[i].ctl === id && isFront(i)) frontCount++;
  if (myArmies.length < frontCount * .9 && G.armies.filter(a => a.owner === id).length < 60) {
    const big = myArmies.filter(a => a.divs.length >= 6 && !a.path.length).sort((x, y) => y.divs.length - x.divs.length)[0];
    if (big) { const b = splitArmy(big); if (b) myArmies.push(b); }
  }
  // Nächstgelegene feindliche Hauptstadt als strategisches Ziel
  const caps = [...enemiesOf(id)].filter(alive).map(e => C(e).cap);
  // Demokratien führen zu Kriegsbeginn einen vorsichtigen Abwehrkrieg
  const wstart = Math.min(...warsOf(id).map(w => w.start));
  const cautious = C(id).ide === 'dem' && G.tick - wstart < 300 ? .6 : 0;
  // Gesamtkräfteverhältnis: gegen deutlich schwächere Gegner offensiver
  let myP = 0, enP = 0; for (const a of G.armies) { if (allied(id, a.owner)) myP += armyPow(a, 'atk'); else if (atWar(id, a.owner)) enP += armyPow(a, 'def'); }
  const dominant = myP > enP * 1.8;
  for (const a of myArmies) {
    if (a.path.length) {
      const t = a.path[0]; const def = enemyPow.get(t) || 0;
      if (def > 0 && armyPow(a, 'atk') * armyOrg(a) < def * .5 && a.path.length === 1) a.path = [];
      continue;
    }
    const org = armyOrg(a); if (org < .55) continue;
    const goal = caps.length ? caps.reduce((b, c) => hexDist(a.prov, c) < hexDist(a.prov, b) ? c : b, caps[0]) : null;
    // Hält diese Armee allein einen bedrohten Frontabschnitt?
    const threatHere = PROV[a.prov].nb.reduce((s, j) => s + (enemyDivs.get(j) || 0), 0);
    const holding = isFront(a.prov) && threatHere > 0 && (friendDivs.get(a.prov) || 0) <= a.divs.length;
    let best = null, bs = 0;
    const atk = armyPow(a, 'atk') * org;
    for (const j of PROV[a.prov].nb) {
      if (!isEnemy(j)) continue;
      const def = (enemyPow.get(j) || 0) * (1 + G.prov[j].fort * .15) / TERR[PROV[j].terrain].atk;
      let s = def > 0 ? atk / def : 1.6;
      // leeres Feindesfeld neben starken Feinden ist eine Falle
      if (def === 0) s -= PROV[j].nb.reduce((t, k) => t + (enemyDivs.get(k) || 0), 0) * .05;
      s += PROV[j].vp * .03;
      if (goal != null) s += .05 * (hexDist(a.prov, goal) - hexDist(j, goal));
      if (s > bs) { bs = s; best = j; }
    }
    if (best != null && bs > (holding && !dominant ? 1.9 : dominant ? 1.05 : 1.25) + cautious) { a.path = [best]; continue; }
    if (!isFront(a.prov) || (friendDivs.get(a.prov) || 0) > need(a.prov) * 2.2) {
      let p = findNearest(id, a.prov, i => isFront(i) && (friendDivs.get(i) || 0) < need(i) * .8, 80) || findNearest(id, a.prov, isFront, 80);
      if (p && p.length) { a.path = p; const t = p[p.length - 1]; friendDivs.set(t, (friendDivs.get(t) || 0) + a.divs.length); }
    }
  }
}

/* -------------------------------------------------------- Monatlich ---- */
function aiMonthly() {
  for (const id in G.C) {
    const c = G.C[id]; if (!c.alive) continue;
    // Unruhen/Umsturz auch beim Spieler
    if (c.stab < 25 && rand() < .12) queueEvent('unrest', id, {}, 0);
    const opp = topOpposition(c);
    if (opp && c.ipop[opp] > 55 && c.stab < 40 && rand() < .1 && !c.overlord) queueEvent('coup_threat', id, { ide: opp }, 0);
    if (!isAI(id)) continue;
    try {
      aiEconomy(c); aiResearch(c); aiPolitics(c);
      if (!c.overlord) aiDiplomacy(c);
      aiPeace(c);
      if (!inWar(id)) aiPeacetimeArmies(id); else aiInvasion(id);
    } catch (e) { console.error('KI-Fehler', id, e); }
  }
}
function aiEconomy(c) {
  const war = inWar(c.id), y = curDate().y;
  const threatened = isThreatened(c.id);
  let guard = 0;
  while (c.buildQ.length < (c.major ? 4 : 2) && guard++ < 6) {
    let t; const r = rand();
    if (war) t = r < .7 ? 'mil' : r < .85 ? 'fort' : 'infra';
    else if (y < 1938 && !threatened) t = c.econ.civ < c.econ.mil * 1.6 + 8 ? (r < .75 ? 'civ' : 'mil') : (r < .4 ? 'civ' : r < .9 ? 'mil' : 'infra');
    else t = r < .6 ? 'mil' : r < .75 ? 'civ' : r < .88 ? (threatened ? 'fort' : 'infra') : 'fort';
    if (!queueBuild(c.id, t) && !queueBuild(c.id, 'infra') && !queueBuild(c.id, 'fort')) break;
  }
  // Produktionsverteilung
  if (c.id === 'ENG') c.alloc = war ? { land: 40, air: 35, navy: 25 } : { land: 35, air: 30, navy: 35 };
  else if (c.major) c.alloc = war ? { land: 65, air: 28, navy: 7 } : { land: 60, air: 25, navy: 15 };
  // Rekrutierung
  const target = Math.round(6 + c.econ.mil * 2.2 + c.pop * .22 + (war ? 10 : 0) + G.tension * .08 + (threatened ? 6 : 0));
  let divs = divCount(c.id) + c.recQ.length, g2 = 0;
  while (divs < target && g2++ < 12) {
    const t = pickDivType(c);
    if (!recruit(c.id, t, 1)) { if (t === 'inf' || !recruit(c.id, 'inf', 1)) break; }
    divs++;
  }
  // Schiffe
  if (c.alloc.navy > 0 && !c.shipQ.length) {
    const opts = c.id === 'GER' ? ['ss', 'ss', 'dd', 'cl'] : c.id === 'ENG' ? ['dd', 'cl', 'bb', 'dd'] : ['dd', 'cl', 'ss'];
    c.shipQ.push(pick(opts));
  }
  // Steuern
  if (c.tr < 0 && c.laws.tax !== 'high' && c.pp >= 50) setLaw(c.id, 'tax', c.laws.tax === 'low' ? 'norm' : 'high');
  else if (c.tr > 2500 && c.stab < 45 && c.laws.tax !== 'low' && c.pp >= 50) setLaw(c.id, 'tax', c.laws.tax === 'high' ? 'norm' : 'low');
  // Mobilisierung
  if ((war || G.tension > 45 || threatened) && c.pp >= 90) {
    const order = ['civ', 'part', 'war', 'total']; const k = order.indexOf(c.laws.eco);
    if (k < 3 && ECO_LAWS[order[k + 1]].ws <= c.ws && (war || k < 1 || G.tension > 65)) setLaw(c.id, 'eco', order[k + 1]);
    const o2 = ['vol', 'lim', 'ext', 'total']; const k2 = o2.indexOf(c.laws.cons);
    if (k2 < 3 && CONS_LAWS[o2[k2 + 1]].ws <= c.ws && (war || k2 < 1) && c.mp < c.pop * 5) setLaw(c.id, 'cons', o2[k2 + 1]);
  }
}
function pickDivType(c) {
  const r = rand(), canMech = c.econ.oilR > .7 && c.econ.mil >= 6;
  if (r < .1 && MOUNTAIN_NATIONS.includes(c.id)) return 'mnt';
  if (r < .2 && CAV_NATIONS.includes(c.id) && !canMech) return 'cav';
  if (r < .33) return 'art';
  if (canMech && r < .43) return 'tank';
  if (canMech && r < .52) return 'mot';
  return 'inf';
}
function aiResearch(c) {
  const prio = c.id === 'ENG' ? { nav: .7, air: .7, ind: .8, eco: .9 } : c.id === 'GER' ? { mil: .6, ind: .7, eco: .8 } : c.major ? { ind: .7, mil: .7, infra: .9 } : { mil: .7, ind: .8, infra: .8 };
  for (let k = 0; k < c.rs.length; k++) {
    if (c.rs[k]) continue;
    const av = TECHS.filter(t => techAvailable(c, t.id));
    if (!av.length) return;
    av.sort((a, b) => techCost(c, a.id) * (prio[a.cat] || 1) * (.85 + rand() * .3) - techCost(c, b.id) * (prio[b.cat] || 1) * (.85 + rand() * .3));
    startResearch(c.id, av[0].id, k);
  }
}
function aiPolitics(c) {
  if (c.stab < 40 && c.pp >= 100) takeDecision(c.id, 'unity');
  if (c.ws < 35 && (G.tension > 50 || inWar(c.id)) && c.pp >= 90) takeDecision(c.id, 'warprop');
  if (c.tr < -200 && c.ws >= 20 && c.pp >= 60) takeDecision(c.id, 'warbonds');
  if (inWar(c.id) && c.mp < c.pop * 3 && c.pp >= 80) takeDecision(c.id, 'reserve');
  if (c.ide === 'dem' && rand() < .02 && c.pp > 120) takeDecision(c.id, 'elections');
  if (G.scw && c.pp > 70 && c.eq > 600 && c.id !== 'SPA' && rand() < .4) {
    if (c.ide === 'fas') supportSCW(c.id, 'nat'); else if (c.ide === 'com') supportSCW(c.id, 'rep');
  }
}
function isThreatened(id) {
  if (G.justify.some(j => j.b === id)) return true;
  for (const n of neighborsOfCountry(id)) {
    if (!alive(n) || allied(id, n)) continue;
    const cn = C(n);
    if (cn.wargoals.includes(id)) return true;
    if (cn.aggr > .4 && ideoAffinity(id, n) < 0 && milPower(n) > milPower(id) * 1.4 && G.tension > 25) return true;
    if (isPlayer(n) && G.threat[n] > 30) return true;
  }
  return false;
}
function propose(action, from, to) {
  if (isPlayer(to)) { if (rand() < .35 && !(G.pending.some(p => p.id === 'ai_proposal' && p.args.from === from)) && !(G.eventQueue || []).some(p => p.id === 'ai_proposal' && p.args.from === from)) queueEvent('ai_proposal', to, { action, from }, 0); return false; }
  const ev = evaluate(action, from, to); if (ev.score < 0) return false;
  acceptProposal(action, from, to); return true;
}
function aiDiplomacy(c) {
  const id = c.id;
  if (rand() < .5) return; // nicht jeden Monat aktiv
  const others = Object.keys(G.C).filter(o => o !== id && alive(o));
  // 1. Beziehungen pflegen
  if (c.pp > 80) {
    const cand = others.filter(o => !atWar(id, o) && ideoAffinity(id, o) >= 0 && rel(id, o) < 60).sort((a, b) => (C(b).major - C(a).major) || rel(id, b) - rel(id, a));
    if (cand.length) diplo('improve', id, cand[0]);
  }
  // 2. Handel bei Rohstoffmangel
  const e = c.econ;
  if (e.need && tradePartners(id).length < 4) {
    for (let k = 0; k < 4; k++) {
      if (e.avail[k] >= e.need[k]) continue;
      const p = others.filter(o => !hasTrade(id, o) && !atWar(id, o) && C(o).econ.prod && C(o).econ.prod[k] - C(o).econ.need[k] > 3).sort((a, b) => rel(id, b) - rel(id, a))[0];
      if (p && c.pp >= 10) { c.pp -= 10; propose('trade', id, p); break; }
    }
  }
  const threatened = isThreatened(id);
  // 3. Bündnisse
  const f = factionOf(id);
  if (!f) {
    if (threatened && !NEUTRALS.includes(id) && !c.major) {
      const facs = (c.dcd.faction || 0) > G.tick ? [] : G.factions.filter(x => alive(x.l) && x.l !== id && C(x.l).major && !inWar(x.l) && rel(id, x.l) > 20 && ideoAffinity(id, x.l) >= 0
        && !x.m.some(m => C(m).wargoals.includes(id) || atWar(m, id) || (borders(m, id) && C(m).aggr > .4)));
      facs.sort((a, b) => milPower(b.l) - milPower(a.l));
      for (const fx of facs) {
        if (isPlayer(fx.l)) { if (rand() < .3) propose('join', id, fx.l); break; }
        if (evaluate('join', id, fx.l).score >= 0) { joinFaction(id, fx); break; }
      }
    }
    if (!factionOf(id) && c.major && G.tension > 55 && G.tick > dayNum(1939, 1) && c.ide !== 'neu' && rand() < .15) {
      const base = ({ dem: 'Alliierte', fas: 'Achsenmächte', com: 'Komintern' })[c.ide];
      createFaction(base + (G.factions.some(x => x.n.startsWith(base)) ? ' II' : ''), id);
    }
  } else if (f.l === id && rand() < .3) {
    // Bündnisführer lädt bedrohte, gleichgesinnte Länder ein
    const cand = others.filter(o => !factionOf(o) && !atWar(id, o) && !NEUTRALS.includes(o) && !((C(o).dcd.faction || 0) > G.tick) && !inWar(id) && ideoAffinity(id, o) >= 0 && rel(id, o) > 20 && (isThreatened(o) || (C(o).major && G.tension > 50)));
    if (cand.length) { const t = pick(cand); if (c.pp >= 25) { c.pp -= 25; propose('invite', id, t); } }
  }
  // 4. Garantien (Demokratien schützen bedrohte Kleinstaaten)
  if (c.major && c.ide === 'dem' && G.tension > 30 && G.guar.filter(g => g.a === id).length < 6 && c.pp >= 25) {
    const aggressors = others.filter(o => G.threat[o] > 25 && ideoAffinity(id, o) < 0);
    const vic = others.filter(o => !C(o).major && !guarantees(id, o) && rel(o, aggressors[0] || o) < 20 && !allied(o, aggressors[0] || '') && aggressors.some(ag => borders(ag, o) && !allied(ag, o)) && C(o).ide !== 'fas' && C(o).ide !== 'com' && !inWar(o));
    if (vic.length) diplo('guarantee', id, pick(vic));
  }
  // 5. Nichtangriffspakte mit gefährlichen Nachbarn
  if (threatened && c.pp >= 25 && rand() < .4) {
    const dang = neighborsOfCountry(id).filter(n => alive(n) && !allied(id, n) && !hasNap(id, n) && !atWar(id, n) && milPower(n) > milPower(id) && !C(n).wargoals.includes(id));
    if (dang.length) { c.pp -= 25; propose('nap', id, dang[0]); }
  }
  // 6. Reaktion auf bedrohlichen Spieler
  if (G.threat[G.player] > 35 && borders(id, G.player) && !allied(id, G.player)) addRel(id, G.player, -3);
  if (G.threat[G.player] < 10 && ideoAffinity(id, G.player) >= 15 && rel(id, G.player) > 50 && f && f.l === id && !factionOf(G.player) && rand() < .15 && c.pp >= 25) { c.pp -= 25; propose('invite', id, G.player); }
  // 7. Krieg (aggressive Länder)
  aiWar(c);
}
function aiWar(c) {
  const id = c.id, d = curDate();
  // Bestehende Kriegsgründe einlösen
  for (const t of c.wargoals.slice()) {
    if (!alive(t) || allied(id, t)) { c.wargoals = c.wargoals.filter(x => x !== t); continue; }
    if (atWar(id, t)) continue;
    const ratio = (milPower(id) + (factionOf(id) ? factionOf(id).m.filter(m => m !== id).reduce((s, m) => s + milPower(m) * .5, 0) : 0)) / Math.max(1, coalitionPow(t));
    if (ratio > (c.aggr > .7 ? .9 : 1.3) && warsOf(id).length < 2 && !G.pending.some(p => p.id === 'ai_war' && p.who === id)) declareWar(id, t);
  }
  if (c.aggr < .4 || c.overlord) return;
  const earliest = { GER: dayNum(1939, 9), SOV: dayNum(1939, 10), ITA: dayNum(1940, 6) }[id] ?? dayNum(1939, 1);
  if (G.tick < earliest || G.tension < 40 || warsOf(id).length >= 2) return;
  if (rand() > c.aggr * .12) return;
  if (c.wargoals.length || G.justify.some(j => j.a === id)) return;
  const myPow = milPower(id);
  const cands = neighborsOfCountry(id).filter(t => alive(t) && !allied(id, t) && !atWar(id, t) && canJustify(id, t).ok)
    .filter(t => !hasNap(id, t) || (c.aggr >= .8 && d.y >= 1941 && myPow > coalitionPow(t) * 1.3))
    .map(t => [t, myPow / Math.max(1, coalitionPow(t))]).filter(([, r]) => r > 1.6).sort((a, b) => b[1] - a[1]);
  if (cands.length) diplo('justify', id, cands[0][0]);
}
function aiReactToJustify(target, from) {
  const t = C(target); addRel(target, from, -20);
  queueBuild(target, 'fort');
  if (!factionOf(target)) {
    const fx = G.factions.filter(f => alive(f.l) && !f.m.includes(from) && !allied(f.l, from) && ideoAffinity(target, f.l) > -20).sort((a, b) => milPower(b.l) - milPower(a.l))[0];
    if (fx && !isPlayer(fx.l) && evaluate('join', target, fx.l).score >= -10) joinFaction(target, fx);
  }
  for (const g of ['ENG', 'FRA']) if (alive(g) && isAI(g) && C(g).ide === 'dem' && ideoAffinity(g, from) < 0 && !t.major && !guarantees(g, target) && G.tension > 30 && rand() < .5) addGuarantee(g, target);
}
function aiPeace(c) {
  const id = c.id;
  for (const w of G.wars.slice()) {
    const side = sideOf(w, id); if (!side) continue;
    const mine = side === 'A' ? w.A : w.D, theirs = side === 'A' ? w.D : w.A;
    if (mine[0] !== id || !theirs.length) continue;
    const s = scoreFor(w, id), age = G.tick - w.start, enemy = theirs[0];
    if ((w.lastOffer || 0) > G.tick - 120) continue;
    if (s < -35 && age > 120) {
      w.lastOffer = G.tick;
      if (isPlayer(enemy)) queueEvent('peace_offer', enemy, { from: id, terms: 'give' }, 0);
      else makePeace(enemy, id, 'take');
    } else if (age > 540 && Math.abs(s) < 12 && rand() < .1) {
      w.lastOffer = G.tick;
      if (isPlayer(enemy)) queueEvent('peace_offer', enemy, { from: id, terms: 'white' }, 0);
      else if (isAI(enemy)) makePeace(id, enemy, 'white');
    }
  }
}
function aiPeacetimeArmies(id) {
  const arms = G.armies.filter(a => a.owner === id && !a.inv && !a.path.length && a.divs.length);
  if (!arms.length) return;
  const c = C(id);
  const threats = neighborsOfCountry(id).filter(n => alive(n) && !allied(id, n) && (C(n).wargoals.includes(id) || G.justify.some(j => j.a === n && j.b === id) || (ideoAffinity(id, n) < 0 && milPower(n) > milPower(id) * .5) || c.wargoals.includes(n) || (isPlayer(n) && G.threat[n] > 20)));
  if (!threats.length) return;
  const spots = provsOwned(id).filter(i => PROV[i].nb.some(j => threats.includes(G.prov[j].own)));
  if (!spots.length) return;
  const occupied = new Set(G.armies.filter(a => a.owner === id).map(a => a.path.length ? a.path[a.path.length - 1] : a.prov));
  for (const a of arms) {
    if (spots.includes(a.prov)) continue;
    if (a.prov === c.cap && arms.filter(x => x.prov === c.cap).length === 1 && arms.length > 2) continue;
    const free = spots.filter(s => !occupied.has(s)).sort((x, y) => hexDist(a.prov, x) - hexDist(a.prov, y));
    const tgt = free[0] ?? spots[Math.floor(rand() * spots.length)];
    const p = findPath(id, a.prov, tgt); if (p) { a.path = p; occupied.add(tgt); }
  }
}
function aiInvasion(id) {
  const enemies = [...enemiesOf(id)].filter(alive); if (!enemies.length) return;
  const reachable = G.armies.some(a => a.owner === id && PROV[a.prov].nb.some(j => atWar(id, G.prov[j].ctl)));
  if (reachable) return;
  // gibt es überhaupt einen Landweg?
  const any = G.armies.find(a => a.owner === id && !a.inv);
  if (!any) return;
  const landPath = findNearest(id, any.prov, i => PROV[i].nb.some(j => atWar(id, G.prov[j].ctl)), 200);
  if (landPath) return;
  let en = 0; enemies.forEach(e => en += navyPow(e));
  if (navyPow(id) < en * 1.2 || rand() > .35) return;
  const cand = G.armies.filter(a => a.owner === id && !a.inv && !a.path.length && PROV[a.prov].coastal && a.divs.length >= 4 && armyOrg(a) > .7);
  if (!cand.length) return;
  const a = cand.sort((x, y) => y.divs.length - x.divs.length)[0];
  const targets = LAND.filter(i => PROV[i].coastal && atWar(id, G.prov[i].ctl) && !armiesAt(i).some(x => atWar(id, x.owner)));
  if (!targets.length) return;
  const t = targets.sort((x, y) => hexDist(a.prov, x) - hexDist(a.prov, y))[0];
  orderInvasion(a, t);
}
