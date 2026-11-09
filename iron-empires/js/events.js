'use strict';
/* ==========================================================================
   Iron Empires – Ereignissystem 1936–1945
   Jedes Ereignis: who (entscheidendes Land), date (frühestes Datum),
   cond (Bedingung), chance (Tageswahrscheinlichkeit), opts (Optionen).
   KI-Länder wählen gewichtet (ai), der Spieler über ein Fenster.
   ========================================================================== */
const ev = {
  tension(v) { G.tension = clamp(G.tension + v, 0, 100); },
  stab(id, v) { if (alive(id)) C(id).stab = clamp(C(id).stab + v, 0, 100); },
  ws(id, v) { if (alive(id)) C(id).ws = clamp(C(id).ws + v, 0, 100); },
  threat(id, v) { G.threat[id] = (G.threat[id] || 0) + v; },
  adjTo(owner, toOwner) { return provsOwned(owner).filter(i => PROV[i].nb.some(j => G.prov[j].own === toOwner)); },
  wargoal(a, b) { if (alive(a) && alive(b) && !C(a).wargoals.includes(b)) C(a).wargoals.push(b); },
  playerOr(def, ...alts) { for (const a of alts) if (G.player === a && alive(a)) return a; return def; },
  fasc: id => alive(id) && C(id).ide === 'fas',
  comm: id => alive(id) && C(id).ide === 'com',
  free: id => alive(id) && !inWar(id)
};

const EVENTS = {
  /* ---------------------------------------------------------------- 1936 */
  sov_fra_pact: { who: 'FRA', date: [1936, 2, 27], cond: () => alive('SOV') && C('FRA').ide === 'dem',
    title: 'Französisch-sowjetischer Beistandspakt', text: 'Die Abgeordnetenkammer debattiert die Ratifizierung des Beistandspakts mit der Sowjetunion. Berlin betrachtet den Vertrag als Einkreisung.',
    opts: [{ t: 'Pakt ratifizieren', tip: 'Beziehung zur Sowjetunion +25, Deutschland −15, Spannung +2', ai: 1, fx: () => { addRel('FRA', 'SOV', 25); addRel('FRA', 'GER', -15); ev.tension(2); } },
           { t: 'Ratifizierung verweigern', tip: 'Beziehung zur Sowjetunion −15, Deutschland +10', ai: .3, fx: () => { addRel('FRA', 'SOV', -15); addRel('FRA', 'GER', 10); } }] },
  rhineland: { who: 'GER', date: [1936, 3, 7], cond: () => ev.fasc('GER') && alive('FRA') && !atWar('GER', 'FRA'),
    title: 'Remilitarisierung des Rheinlands', text: 'Der Generalstab legt Pläne vor, Truppen in die entmilitarisierte Zone am Rhein zu verlegen – ein klarer Bruch der Nachkriegsverträge. Die Generäle fürchten eine französische Reaktion.',
    opts: [{ t: 'Truppen ins Rheinland schicken', tip: 'Kriegsunterstützung +10, Spannung +4. Frankreich muss reagieren.', ai: 1, fx: () => { ev.ws('GER', 10); ev.tension(4); ev.threat('GER', 5); G.flags.rhineland = 1; queueEvent('rhine_fra', ev.playerOr('FRA', 'FRA'), {}, 2); } },
           { t: 'Vorsicht walten lassen', tip: 'Stabilität −5, die Geschichte nimmt einen anderen Lauf', ai: 0, fx: () => { ev.stab('GER', -5); G.flags.no_rhineland = 1; } }] },
  rhine_fra: { dyn: 1, title: 'Deutsche Truppen am Rhein', text: 'Deutsche Bataillone sind in das entmilitarisierte Rheinland einmarschiert. Paris muss entscheiden, ob es den Vertragsbruch hinnimmt.',
    opts: [{ t: 'Diplomatischer Protest', tip: 'Beziehung zu Deutschland −15, Stabilität −3', ai: 1, fx: w => { addRel(w, 'GER', -15); ev.stab(w, -3); } },
           { t: 'Militärisch intervenieren', tip: 'Krieg gegen Deutschland! Spannung steigt stark.', ai: 0, fx: w => { C(w).wargoals.push('GER'); declareWar(w, 'GER', { name: 'Rheinlandkrieg' }); } }] },
  popfront: { who: 'FRA', date: [1936, 5, 3], cond: () => C('FRA').ide === 'dem',
    title: 'Wahlen in Frankreich', text: 'Die Volksfront aus Sozialisten, Radikalen und Kommunisten hat die Parlamentswahl gewonnen. Sie verspricht Sozialreformen – das bürgerliche Lager warnt vor Unruhen.',
    opts: [{ t: 'Volksfront-Regierung unter Léon Blum', tip: 'Stabilität +5, Kommunismus +8 %, Kriegsunterstützung −5', ai: 1, fx: () => { const c = C('FRA'); c.ldr = 'Léon Blum'; ev.stab('FRA', 5); shiftPop(c, 'com', 8); ev.ws('FRA', -5); } },
           { t: 'Bürgerliche Koalition bilden', tip: 'Stabilität −4, Faschismus +5 %, Kriegsunterstützung +5', ai: .4, fx: () => { const c = C('FRA'); c.ldr = 'Pierre-Étienne Flandin'; ev.stab('FRA', -4); shiftPop(c, 'fas', 5); ev.ws('FRA', 5); } }] },
  scw: { who: 'SPA', date: [1936, 7, 17], cond: () => alive('SPA') && !inWar('SPA') && C('SPA').ide !== 'fas',
    title: 'Spanischer Bürgerkrieg', text: 'Teile der spanischen Armee haben sich gegen die Republik erhoben. Das Land versinkt im Bürgerkrieg zwischen Nationalisten und Republikanern. Europas Mächte können Freiwillige und Material schicken (Diplomatie-Menü).',
    news: 1, opts: [{ t: 'Das Land brennt …', tip: 'Spanien: Stabilität 15, Armee geschwächt. Unterstützung beeinflusst den Ausgang.', ai: 1, fx: () => {
      G.scw = { nat: 10, rep: 10, end: G.tick + 960, by: {} }; const s = C('SPA'); s.stab = 15; ev.tension(4);
      G.armies.filter(a => a.owner === 'SPA').forEach(a => a.divs.forEach(d => d.str = 55)); } }] },
  scw_end: { dyn: 1, title: 'Ende des Spanischen Bürgerkriegs', text: a => a.nat ? 'Die Nationalisten unter General Franco haben Madrid eingenommen. Spanien wird zu einem autoritären Staat.' : 'Die Republik hat den Aufstand niedergeschlagen. Die Regierung in Madrid hat überlebt – mit starker Linkstendenz.',
    news: 1, opts: [{ t: 'Verstanden', ai: 1, fx: a => {
      if (a.nat) setGovernment('SPA', 'fas', 'Francisco Franco'); else setGovernment('SPA', a.com ? 'com' : 'dem', a.com ? 'José Díaz' : 'Juan Negrín');
      C('SPA').stab = 40; for (const id in G.scw.by) if (alive(id)) addRel('SPA', id, G.scw.by[id] === (a.nat ? 'nat' : 'rep') ? 40 : -30);
      G.scw = null; } }] },
  axis: { who: 'GER', date: [1936, 10, 25], cond: () => ev.fasc('GER') && ev.fasc('ITA') && !factionOf('ITA') && rel('GER', 'ITA') > -10,
    title: 'Achse Berlin–Rom', text: 'Mussolinis Außenminister schlägt eine enge Zusammenarbeit vor. Ein gemeinsames Bündnis würde beide Diktaturen eng aneinander binden.',
    opts: [{ t: 'Bündnis mit Italien anbieten', tip: 'Gründet die „Achsenmächte“; Italien entscheidet über den Beitritt. Spannung +3', ai: 1, fx: () => { if (!factionOf('GER')) createFaction('Achsenmächte', 'GER'); ev.tension(3); queueEvent('axis_ita', 'ITA', {}, 3); } },
           { t: 'Allein bleiben', tip: 'Beziehung zu Italien −10', ai: 0, fx: () => addRel('GER', 'ITA', -10) }] },
  axis_ita: { dyn: 1, title: 'Einladung in die Achse', text: 'Deutschland lädt Italien ein, den Achsenmächten beizutreten. Ein Beitritt bedeutet gegenseitige Kriegsbeistandspflicht.',
    opts: [{ t: 'Der Achse beitreten', tip: 'Mitglied der Achsenmächte', ai: .9, fx: w => { const f = factionOf('GER'); if (f) joinFaction(w, f); } },
           { t: 'Ablehnen – Italien bleibt unabhängig', tip: 'Beziehung zu Deutschland −15', ai: .1, fx: w => addRel(w, 'GER', -15) }] },
  abdication: { who: 'ENG', date: [1936, 12, 10], cond: () => C('ENG').ide === 'dem',
    title: 'Abdankungskrise', text: 'König Edward VIII. will eine zweimal geschiedene Amerikanerin heiraten. Regierung und Kirche drohen mit einer Verfassungskrise.',
    opts: [{ t: 'Der König dankt ab', tip: 'Stabilität +3', ai: 1, fx: () => ev.stab('ENG', 3) },
           { t: 'Den König stützen', tip: 'Stabilität −10, Autoritäre Strömung +10 %', ai: .1, fx: () => { ev.stab('ENG', -10); shiftPop(C('ENG'), 'neu', 10); } }] },
  /* ---------------------------------------------------------------- 1937 */
  intermarium: { who: 'POL', date: [1937, 2, 1], cond: () => alive('POL') && !factionOf('POL'), chance: .03,
    title: 'Intermarium-Initiative', text: 'In Warschau wird die Idee eines Staatenbundes zwischen Ostsee und Schwarzem Meer wiederbelebt, um sich gegen Berlin und Moskau zu behaupten.',
    opts: [{ t: 'Intermarium gründen', tip: 'Gründet ein eigenes Bündnis; Nachbarn werden eingeladen', ai: .25, fx: () => { const f = createFaction('Intermarium', 'POL'); for (const m of ['LIT', 'LAT', 'EST', 'ROM', 'HUN', 'CZE']) if (alive(m) && !factionOf(m) && evaluate('invite', 'POL', m).score >= -5) joinFaction(m, f); } },
           { t: 'Auf Frankreich vertrauen', tip: 'Beziehung zu Frankreich +10', ai: .75, fx: () => addRel('POL', 'FRA', 10) }] },
  purge: { who: 'SOV', date: [1937, 6, 1], cond: () => ev.comm('SOV'),
    title: 'Die Große Säuberung', text: 'Der Geheimdienst meldet angebliche Verschwörungen in Partei und Rotem Heer. Eine Welle von Verhaftungen würde die Macht festigen – und das Offizierskorps dezimieren.',
    opts: [{ t: 'Säuberung durchführen', tip: 'Stabilität +12, Organisation −25 % für 2 Jahre, zwei Generäle verloren', ai: 1, fx: w => { const c = C(w); ev.stab(w, 12); c.purge = G.tick + 730; const gs = c.gens.filter(g => g.n.includes('Tuchatschewski') || g.sk <= 3).slice(0, 2); for (const g of gs) { const a = G.armies.find(x => x.id === g.army); if (a) a.gen = null; } c.gens = c.gens.filter(g => !gs.includes(g)); } },
           { t: 'Säuberung abbrechen', tip: 'Stabilität −10, +50 politische Macht', ai: 0, fx: w => { ev.stab(w, -10); C(w).pp += 50; } }] },
  /* ---------------------------------------------------------------- 1938 */
  anschluss: { who: 'GER', date: [1938, 3, 11], cond: () => ev.fasc('GER') && alive('AUT') && borders('GER', 'AUT') && !inWar('AUT'),
    title: 'Die Österreich-Frage', text: 'Österreichische Nationalsozialisten drängen auf den „Anschluss“. Wien versucht, mit einer Volksabstimmung die Unabhängigkeit zu retten.',
    opts: [{ t: 'Anschluss fordern', tip: 'Österreich entscheidet. Spannung +6', ai: 1, fx: () => { ev.tension(6); queueEvent('anschluss_aut', 'AUT', {}, 2); } },
           { t: 'Österreichs Unabhängigkeit respektieren', tip: 'Beziehung zu Italien +10, Stabilität −5', ai: 0, fx: () => { addRel('GER', 'ITA', 10); ev.stab('GER', -5); } }] },
  anschluss_aut: { dyn: 1, title: 'Ultimatum aus Berlin', text: 'Deutschland verlangt die Vereinigung Österreichs mit dem Reich. Ohne starke Verbündete ist Widerstand aussichtslos.',
    opts: [{ t: 'Nachgeben', tip: 'Österreich wird Teil Deutschlands', ai: () => guarantorsOf('AUT').length || factionOf('AUT') ? .2 : .9, fx: () => { annexCountry('AUT', 'GER'); G.flags.anschluss = 1; ev.threat('GER', 10); ev.tension(5); notify('Österreich wurde an Deutschland angeschlossen.', 'war'); } },
           { t: 'Widerstand leisten', tip: 'Deutschland erhält einen Kriegsgrund', ai: () => guarantorsOf('AUT').length || factionOf('AUT') ? .8 : .1, fx: () => { ev.wargoal('GER', 'AUT'); if (!isPlayer('GER')) queueEvent('ai_war', 'GER', { t: 'AUT' }, 10); } }] },
  sudeten: { who: 'GER', date: [1938, 9, 1], cond: () => ev.fasc('GER') && alive('CZE') && borders('GER', 'CZE') && !inWar('CZE') && !atWar('GER', 'CZE'),
    title: 'Sudetenkrise', text: 'Die deutschsprachige Minderheit in den Grenzgebieten der Tschechoslowakei fordert den Anschluss an das Reich. Prag mobilisiert, Paris und London sind alarmiert.',
    opts: [{ t: 'Das Sudetenland fordern', tip: 'Großbritannien/Frankreich entscheiden in München. Spannung +6', ai: 1, fx: () => { ev.tension(6); queueEvent('munich', ev.playerOr('ENG', 'ENG', 'FRA'), {}, 5); } },
           { t: 'Auf Forderungen verzichten', tip: 'Stabilität −5, Spannung −3', ai: 0, fx: () => { ev.stab('GER', -5); ev.tension(-3); } }] },
  munich: { dyn: 1, title: 'Konferenz von München', text: 'Die Regierungschefs Großbritanniens, Frankreichs, Italiens und Deutschlands verhandeln über das Sudetenland – ohne die Tschechoslowakei. Nachgeben könnte den Frieden retten oder den Aggressor ermutigen.',
    opts: [{ t: 'Nachgeben – „Frieden für unsere Zeit“', tip: 'Die Grenzgebiete fallen an Deutschland; Frankreich zieht seine Garantie zurück', ai: .85, fx: () => { cedeProvs(ev.adjTo('CZE', 'GER'), 'GER'); removeGuarantee('FRA', 'CZE'); removeGuarantee('ENG', 'CZE'); G.flags.munich = 1; ev.threat('GER', 10); ev.tension(5); notify('Münchner Abkommen: Das Sudetenland fällt an Deutschland.', 'dip'); } },
           { t: 'Standhaft bleiben', tip: 'Großbritannien und Frankreich garantieren die Tschechoslowakei. Deutschland muss sich entscheiden.', ai: .15, fx: () => { addGuarantee('ENG', 'CZE'); addGuarantee('FRA', 'CZE'); ev.tension(4); queueEvent('sudeten_war', 'GER', {}, 4); } }] },
  sudeten_war: { dyn: 1, title: 'Die Westmächte bleiben hart', text: 'London und Paris haben der Tschechoslowakei ihren Schutz zugesichert. Ein Angriff würde einen europäischen Krieg auslösen.',
    opts: [{ t: 'Trotzdem angreifen', tip: 'Krieg gegen die Tschechoslowakei und ihre Garanten', ai: .35, fx: () => { ev.wargoal('GER', 'CZE'); declareWar('GER', 'CZE', { name: 'Sudetenkrieg' }); } },
           { t: 'Zurückweichen', tip: 'Stabilität −10, Kriegsunterstützung −10', ai: .65, fx: () => { ev.stab('GER', -10); ev.ws('GER', -10); } }] },
  /* ---------------------------------------------------------------- 1939 */
  rest_czech: { who: 'GER', date: [1939, 3, 15], cond: () => G.flags.munich && ev.fasc('GER') && alive('CZE') && !guarantorsOf('CZE').length && !factionOf('CZE') && !inWar('CZE'),
    title: 'Zerschlagung der Rest-Tschechei', text: 'Die verbliebene Tschechoslowakei ist militärisch wehrlos. Berlin könnte Böhmen und Mähren besetzen; Ungarn verlangt die Karpato-Ukraine.',
    opts: [{ t: 'Böhmen und Mähren besetzen', tip: 'Tschechoslowakei wird aufgeteilt. Spannung +10 – die Westmächte werden reagieren.', ai: 1, fx: () => { if (alive('HUN')) cedeProvs(provsOwned('CZE').filter(i => PROV[i].c >= 25), 'HUN'); annexCountry('CZE', 'GER'); ev.tension(10); ev.threat('GER', 15); G.flags.rest_czech = 1; notify('Deutschland besetzt die Rest-Tschechei.', 'war'); } },
           { t: 'Darauf verzichten', tip: 'Spannung −2', ai: 0, fx: () => ev.tension(-2) }] },
  memel: { who: 'GER', date: [1939, 3, 22], cond: () => ev.fasc('GER') && alive('LIT') && borders('GER', 'LIT') && !inWar('LIT'),
    title: 'Memelland', text: 'Deutschland verlangt von Litauen die Rückgabe des Memellandes. Kaunas hat kaum Mittel, sich zu widersetzen.',
    opts: [{ t: 'Memelland fordern', tip: 'Litauen tritt das Grenzgebiet ab, Spannung +3', ai: 1, fx: () => { cedeProvs(ev.adjTo('LIT', 'GER').slice(0, 2), 'GER'); ev.tension(3); } },
           { t: 'Verzichten', ai: 0, fx: () => addRel('GER', 'LIT', 10) }] },
  guarantee_pol: { who: 'ENG', date: [1939, 3, 31], cond: () => (G.flags.anschluss || G.flags.munich || G.flags.rest_czech || G.threat.GER > 25) && alive('POL') && ev.fasc('GER') && !allied('POL', 'GER') && C('ENG').ide === 'dem',
    title: 'Garantie für Polen', text: 'Nach der Expansion Deutschlands drängt das Kabinett darauf, Polen eine Beistandsgarantie zu geben – und ein formelles Bündnis mit Frankreich zu schließen.',
    opts: [{ t: 'Polen garantieren, Alliierte gründen', tip: 'Garantie für Polen; Bündnis „Alliierte“ mit Frankreich', ai: 1, fx: w => { addGuarantee(w, 'POL'); if (alive('FRA')) addGuarantee('FRA', 'POL'); let f = factionOf(w); if (!f) f = createFaction('Alliierte', w); if (alive('FRA') && !factionOf('FRA') && C('FRA').ide === 'dem') joinFaction('FRA', f); ev.tension(3); } },
           { t: 'Keine Verpflichtungen eingehen', tip: 'Beziehung zu Polen −20', ai: 0, fx: w => addRel(w, 'POL', -20) }] },
  albania: { who: 'ITA', date: [1939, 4, 7], cond: () => ev.fasc('ITA') && alive('ALB') && !inWar('ITA') && !factionOf('ALB'),
    title: 'Besetzung Albaniens', text: 'Italienische Truppen stehen bereit, um über die Adria nach Albanien überzusetzen. König Zogu kann kaum Widerstand leisten.',
    opts: [{ t: 'Albanien besetzen', tip: 'Albanien wird italienisch. Spannung +5', ai: 1, fx: () => { annexCountry('ALB', 'ITA'); ev.tension(5); notify('Italien hat Albanien besetzt.', 'war'); } },
           { t: 'Verzichten', ai: 0, fx: () => addRel('ITA', 'ALB', 15) }] },
  triple_talks: { who: 'ENG', date: [1939, 4, 15], cond: () => alive('SOV') && !G.flags.mrp && ev.fasc('GER') && factionOf('ENG') && !factionOf('SOV') && C('SOV').ide !== 'fas',
    title: 'Bündnisgespräche mit Moskau', text: 'Die Sowjetunion signalisiert Interesse an einem Bündnis gegen Deutschland. Viele im Kabinett misstrauen Stalin zutiefst.',
    opts: [{ t: 'Verhandlungen aufnehmen', tip: 'Die Sowjetunion entscheidet über einen Beitritt zum Bündnis', ai: .6, fx: w => queueEvent('triple_sov', 'SOV', { from: w }, 5) },
           { t: 'Ablehnen', tip: 'Beziehung zur Sowjetunion −15', ai: .4, fx: w => addRel(w, 'SOV', -15) }] },
  triple_sov: { dyn: 1, title: 'Angebot der Westmächte', text: 'London bietet der Sowjetunion die Aufnahme in sein Bündnis an. Ein Beitritt würde Deutschland mit einem Zweifrontenkrieg bedrohen.',
    opts: [{ t: 'Dem Bündnis beitreten', tip: 'Mitglied im Bündnis der Westmächte', ai: .25, fx: (w, a) => { const f = factionOf(a.from); if (f) joinFaction(w, f); G.flags.triple = 1; } },
           { t: 'Ablehnen', tip: 'Freie Hand für andere Abkommen', ai: .75, fx: (w, a) => addRel(w, a.from, -10) }] },
  mrp: { who: 'GER', date: [1939, 8, 20], cond: () => ev.fasc('GER') && ev.comm('SOV') && !atWar('GER', 'SOV') && !allied('SOV', 'ENG') && !hasNap('GER', 'SOV'),
    title: 'Ein Pakt mit Moskau?', text: 'Außenminister Ribbentrop schlägt einen Nichtangriffspakt mit der Sowjetunion vor – mit geheimem Zusatzprotokoll über Einflusssphären in Osteuropa.',
    opts: [{ t: 'Pakt anbieten', tip: 'Die Sowjetunion entscheidet', ai: 1, fx: () => queueEvent('mrp_sov', 'SOV', {}, 3) },
           { t: 'Kein Pakt mit den Bolschewisten', tip: 'Beziehung zur Sowjetunion −15', ai: 0, fx: () => addRel('GER', 'SOV', -15) }] },
  mrp_sov: { dyn: 1, title: 'Deutsches Paktangebot', text: 'Berlin bietet einen Nichtangriffspakt und die Aufteilung Osteuropas in Interessensphären an: Ostpolen, das Baltikum und Bessarabien für die Sowjetunion.',
    opts: [{ t: 'Pakt unterzeichnen', tip: 'Nichtangriffspakt; sowjetische Ansprüche auf Ostpolen, Baltikum und Bessarabien', ai: .85, fx: () => { addNap('GER', 'SOV'); addRel('GER', 'SOV', 30); G.flags.mrp = 1; ev.tension(4); notify('Deutschland und die Sowjetunion schließen einen Nichtangriffspakt.', 'dip'); } },
           { t: 'Ablehnen', tip: 'Beziehung zu Deutschland −20', ai: .15, fx: () => addRel('SOV', 'GER', -20) }] },
  danzig: { who: 'GER', date: [1939, 8, 25], cond: () => ev.fasc('GER') && alive('POL') && !atWar('GER', 'POL') && !allied('GER', 'POL') && borders('GER', 'POL'),
    title: 'Danzig und der Korridor', text: 'Berlin fordert die Freie Stadt Danzig und eine exterritoriale Verbindung nach Ostpreußen. Warschau steht unter enormem Druck.',
    opts: [{ t: 'Forderungen stellen', tip: 'Polen entscheidet. Bei Ablehnung: Kriegsgrund', ai: 1, fx: () => { ev.tension(5); queueEvent('danzig_pol', 'POL', {}, 3); } },
           { t: 'Verzichten', tip: 'Stabilität −5', ai: 0, fx: () => ev.stab('GER', -5) }] },
  danzig_pol: { dyn: 1, title: 'Deutsches Ultimatum', text: 'Deutschland verlangt Danzig und den Korridor. Ein Nachgeben würde Polens Zugang zum Meer kosten; eine Ablehnung bedeutet vermutlich Krieg.',
    opts: [{ t: 'Nachgeben', tip: 'Grenzgebiete fallen an Deutschland, Stabilität −15', ai: .1, fx: w => { cedeProvs(ev.adjTo(w, 'GER').filter(i => PROV[i].r <= 18), 'GER'); ev.stab(w, -15); } },
           { t: 'Ablehnen – „Wir weichen nicht“', tip: 'Deutschland erhält einen Kriegsgrund', ai: .9, fx: w => { ev.wargoal('GER', w); ev.ws(w, 15); if (!isPlayer('GER')) queueEvent('ai_war', 'GER', { t: w }, 7); else notify('Polen lehnt ab. Sie haben einen Kriegsgrund gegen Polen.', 'war'); } }] },
  sov_poland: { dyn: 1, title: 'Einmarsch in Ostpolen?', text: 'Die polnische Armee ist im Westen gebunden. Gemäß dem Geheimprotokoll könnte die Rote Armee die Ostgebiete besetzen.',
    opts: [{ t: 'Einmarschieren', tip: 'Krieg gegen Polen', ai: .9, fx: w => { if (alive('POL') && !atWar(w, 'POL')) { ev.wargoal(w, 'POL'); declareWar(w, 'POL', { name: 'Sowjetischer Einmarsch in Polen' }); } } },
           { t: 'Neutral bleiben', ai: .1, fx: () => {} }] },
  winterwar: { who: 'SOV', date: [1939, 11, 1], cond: () => ev.comm('SOV') && alive('FIN') && !atWar('SOV', 'FIN') && !allied('SOV', 'FIN') && borders('SOV', 'FIN'),
    title: 'Forderungen an Finnland', text: 'Leningrad liegt nur 30 km von der finnischen Grenze. Moskau will die Karelische Landenge und Stützpunkte am Finnischen Meerbusen.',
    opts: [{ t: 'Karelien fordern', tip: 'Finnland entscheidet. Bei Ablehnung: Krieg', ai: .9, fx: () => queueEvent('winter_fin', 'FIN', {}, 3) },
           { t: 'Verzichten', ai: .1, fx: () => addRel('SOV', 'FIN', 10) }] },
  winter_fin: { dyn: 1, title: 'Sowjetische Forderungen', text: 'Die Sowjetunion verlangt Karelien. Marschall Mannerheim hält die Verteidigungslinie für stark.',
    opts: [{ t: 'Gebiete abtreten', tip: 'Ostkarelien fällt an die Sowjetunion', ai: .2, fx: w => cedeProvs(provsOwned(w).filter(i => PROV[i].c >= 30 && PROV[i].r >= 9), 'SOV') },
           { t: 'Ablehnen', tip: 'Die Sowjetunion erklärt den Krieg (Winterkrieg)', ai: .8, fx: w => { ev.wargoal('SOV', w); declareWar('SOV', w, { name: 'Winterkrieg' }); } }] },
  /* ---------------------------------------------------------------- 1940 */
  baltics: { who: 'SOV', date: [1940, 6, 15], cond: () => G.flags.mrp && ev.comm('SOV') && ['EST', 'LAT', 'LIT'].some(x => alive(x) && !factionOf(x) && !inWar(x)),
    title: 'Das Baltikum', text: 'Gestützt auf das Geheimprotokoll kann Moskau Estland, Lettland und Litauen ultimativ zur Aufnahme in die Union zwingen.',
    opts: [{ t: 'Baltikum eingliedern', tip: 'Die baltischen Staaten werden sowjetisch. Spannung +8', ai: .9, fx: () => { for (const x of ['EST', 'LAT', 'LIT']) if (alive(x) && !factionOf(x) && !inWar(x) && x !== G.player) annexCountry(x, 'SOV'); ev.tension(8); notify('Die Sowjetunion gliedert das Baltikum ein.', 'war'); } },
           { t: 'Verzichten', ai: .1, fx: () => {} }] },
  bessarabia: { who: 'SOV', date: [1940, 6, 26], cond: () => G.flags.mrp && ev.comm('SOV') && alive('ROM') && !atWar('SOV', 'ROM') && !allied('SOV', 'ROM'),
    title: 'Bessarabien', text: 'Moskau verlangt von Rumänien die Rückgabe Bessarabiens.',
    opts: [{ t: 'Bessarabien fordern', tip: 'Rumänien tritt die Ostgebiete ab, sofern es keine Schutzmacht hat', ai: .9, fx: () => { const l = provsOwned('ROM').filter(i => PROV[i].c >= 29); if (!guarantorsOf('ROM').length && !factionOf('ROM')) { cedeProvs(l, 'SOV'); notify('Rumänien tritt Bessarabien an die Sowjetunion ab.', 'dip'); } else ev.wargoal('SOV', 'ROM'); ev.tension(3); } },
           { t: 'Verzichten', ai: .1, fx: () => {} }] },
  italy_war: { who: 'ITA', date: [1940, 5, 15], chance: .06, cond: () => ev.fasc('ITA') && alive('FRA') && G.wars.some(w => (w.A.includes('GER') && w.D.includes('FRA'))) && !inWar('ITA') && franceShaky(),
    title: 'Kriegseintritt?', text: 'Frankreich wankt unter dem deutschen Ansturm. Mussolini will „ein paar tausend Tote“, um am Friedenstisch zu sitzen.',
    opts: [{ t: 'An der Seite Deutschlands in den Krieg', tip: 'Krieg gegen Frankreich und seine Verbündeten', ai: .85, fx: w => { const war = G.wars.find(x => x.A.includes('GER') && x.D.includes('FRA')); if (war) joinWar(war, w, 'A'); } },
           { t: 'Nicht kriegführend bleiben', ai: .15, fx: () => {} }] },
  vienna_award: { who: 'HUN', date: [1940, 8, 30], cond: () => alive('HUN') && alive('ROM') && ev.fasc('GER') && rel('HUN', 'GER') > 0 && !inWar('ROM') && !factionOf('ROM'),
    title: 'Zweiter Wiener Schiedsspruch', text: 'Unter deutscher und italienischer Vermittlung soll Rumänien Nordsiebenbürgen an Ungarn abtreten.',
    opts: [{ t: 'Nordsiebenbürgen annehmen', tip: 'Gebiete von Rumänien; Beziehung zu Deutschland +15', ai: 1, fx: w => { cedeProvs(provsOwned('ROM').filter(i => PROV[i].r <= 25 && PROV[i].c <= 27), w); addRel(w, 'GER', 15); addRel(w, 'ROM', -40); } },
           { t: 'Ablehnen', ai: 0, fx: () => {} }] },
  greece: { who: 'ITA', date: [1940, 10, 28], chance: .05, cond: () => ev.fasc('ITA') && alive('GRE') && borders('ITA', 'GRE') && !atWar('ITA', 'GRE') && !allied('ITA', 'GRE') && G.wars.some(w => sideOf(w, 'ITA')),
    title: 'Ultimatum an Griechenland', text: 'Von Albanien aus könnte Italien Griechenland angreifen – ein Prestigeprojekt Mussolinis.',
    opts: [{ t: 'Griechenland angreifen', tip: 'Krieg gegen Griechenland', ai: .8, fx: w => { ev.wargoal(w, 'GRE'); declareWar(w, 'GRE'); } },
           { t: 'Abwarten', ai: .2, fx: () => {} }] },
  /* ---------------------------------------------------------------- 1941+ */
  barbarossa: { who: 'GER', date: [1941, 5, 20], chance: .05, cond: () => ev.fasc('GER') && alive('SOV') && !atWar('GER', 'SOV') && borders('GER', 'SOV') && !G.wars.some(w => sideOf(w, 'GER') && [...enemiesOf('GER')].some(e => e === 'FRA')),
    title: 'Der Krieg im Osten', text: 'Der Generalstab legt Pläne für einen Angriff auf die Sowjetunion vor. Die Rote Armee gilt als geschwächt – doch das Land ist riesig.',
    opts: [{ t: 'Angriff befehlen', tip: 'Krieg gegen die Sowjetunion (Pakt wird gebrochen)', ai: .85, fx: () => { ev.wargoal('GER', 'SOV'); declareWar('GER', 'SOV', { name: 'Deutsch-Sowjetischer Krieg' }); } },
           { t: 'Frieden im Osten wahren', tip: 'Stabilität +5', ai: .15, fx: () => ev.stab('GER', 5) }] },
  lendlease: { who: 'SOV', date: [1941, 9, 1], cond: () => alive('SOV') && alive('ENG') && G.wars.some(w => sideOf(w, 'SOV') && sideOf(w, 'ENG') && sideOf(w, 'SOV') === sideOf(w, 'ENG')),
    title: 'Leih- und Pachtlieferungen', text: 'Über das Nordmeer und Persien erreichen Lastwagen, Flugzeuge und Rohstoffe aus Übersee die Sowjetunion.',
    opts: [{ t: 'Lieferungen annehmen', tip: '+8 virtuelle Militärfabriken, +3000 Ausrüstung', ai: 1, fx: w => { C(w).lend += 8; C(w).eq += 3000; } }] },
  usa_entry: { who: 'ENG', date: [1941, 12, 8], cond: () => alive('ENG') && inWar('ENG') && [...enemiesOf('ENG')].some(e => ev.fasc(e)),
    title: 'Kriegseintritt der USA', text: 'Nach dem Angriff auf ihre Pazifikflotte erklären die Vereinigten Staaten den Achsenmächten den Krieg. Amerikas Industrie arbeitet nun für die Alliierten.',
    news: 1, opts: [{ t: 'Willkommen, Verbündete!', tip: '+12 virtuelle Militärfabriken, +800 000 Personal, +1500 Flugzeuge, Kriegsunterstützung +15', ai: 1, fx: w => { const c = C(w); c.lend += 12; c.mp += 800; c.planes += 1500; ev.ws(w, 15); } }] },
  /* ---------------------------------------------------------------- Generisch (dynamisch) */
  ai_war: { dyn: 1, title: 'Kriegsentscheidung', text: a => `Der Generalstab ist bereit zum Angriff auf ${C(a.t).s}.`, opts: [
    { t: 'Angriff', ai: 1, fx: (w, a) => { if (alive(a.t) && C(w).wargoals.includes(a.t) && !atWar(w, a.t)) declareWar(w, a.t); } },
    { t: 'Abwarten', ai: 0, fx: () => {} }] },
  call_to_arms: { dyn: 1, title: 'Ruf zu den Waffen', text: a => { const w = warById(a.war); if (!w) return 'Der Krieg ist bereits beendet.'; const l = a.side === 'D' ? w.D[0] : w.A[0]; return `${C(l).n} ruft Sie auf, im ${w.name} an seiner Seite zu kämpfen (${a.side === 'D' ? 'Verteidigung' : 'Angriff'}). Gegner: ${(a.side === 'D' ? w.A : w.D).map(x => C(x).s).join(', ')}.`; },
    opts: [{ t: 'Dem Krieg beitreten', tip: 'Sie werden Kriegspartei', ai: 1, fx: (w, a) => { const war = warById(a.war); if (war) joinWar(war, w, a.side); } },
           { t: 'Ablehnen', tip: 'Beziehung zum Bündnisführer −40; Garantien/Bündnis erlöschen', ai: 0, fx: (w, a) => { const war = warById(a.war); if (!war) return; const l = a.side === 'D' ? war.D[0] : war.A[0]; addRel(w, l, -40); removeGuarantee(w, l); if (sameFaction(w, l)) leaveFaction(w); } }] },
  ai_proposal: { dyn: 1, title: 'Diplomatischer Vorschlag', text: a => {
      const f = C(a.from).n; return ({ nap: `${f} schlägt einen Nichtangriffspakt vor.`, trade: `${f} bietet ein Handelsabkommen an.`, invite: `${f} lädt Sie in das Bündnis „${(factionOf(a.from) || {}).n || '?'}“ ein.`, join: `${f} möchte Ihrem Bündnis beitreten.`, demand: `${f} fordert die Abtretung von Grenzgebieten (${demandable(a.from, G.player).map(i => PROV[i].name).slice(0, 4).join(', ')}). Eine Ablehnung gibt ${C(a.from).s} einen Kriegsgrund.` })[a.action]; },
    opts: [{ t: 'Annehmen', ai: 1, fx: (w, a) => { if (alive(a.from)) acceptProposal(a.action, a.from, w); } },
           { t: 'Ablehnen', ai: 0, fx: (w, a) => { addRel(w, a.from, -10); if (a.action === 'demand') ev.wargoal(a.from, w); } }] },
  peace_offer: { dyn: 1, title: 'Friedensangebot', text: a => `${C(a.from).n} bietet Frieden an: ${a.terms === 'white' ? 'Rückkehr zum Status quo.' : a.terms === 'give' ? `${C(a.from).s} tritt alle von Ihnen besetzten Gebiete ab.` : 'Sie treten die von ihnen besetzten Gebiete ab.'}`,
    opts: [{ t: 'Frieden schließen', ai: 1, fx: (w, a) => { if (!atWar(w, a.from)) return; if (a.terms === 'give') makePeace(w, a.from, 'take'); else if (a.terms === 'take') makePeace(a.from, w, 'take'); else makePeace(w, a.from, 'white'); } },
           { t: 'Weiterkämpfen', ai: 0, fx: () => {} }] },
  unrest: { dyn: 1, title: 'Innere Unruhen', text: 'Streiks und Demonstrationen erschüttern das Land. Die Regierung muss handeln.',
    opts: [{ t: 'Kriegsrecht verhängen', tip: 'Stabilität +10, Kriegsunterstützung −5, −30 politische Macht', ai: .6, fx: w => { ev.stab(w, 10); ev.ws(w, -5); C(w).pp = Math.max(0, C(w).pp - 30); } },
           { t: 'Zugeständnisse machen', tip: 'Stabilität +6, stärkste Opposition +8 %', ai: .4, fx: w => { ev.stab(w, 6); shiftPop(C(w), topOpposition(C(w)), 8); } }] },
  coup_threat: { dyn: 1, title: 'Drohender Umsturz', text: a => `Anhänger des ${IDEOLOGIES[a.ide].n} kontrollieren die Straßen. Teile der Armee sympathisieren mit ihnen.`,
    opts: [{ t: 'Regierung abtreten', tip: a => `Neue Regierung (${IDEOLOGIES[a.ide].n})`, ai: .5, fx: (w, a) => { setGovernment(w, a.ide); ev.stab(w, 10); } },
           { t: 'Aufstand niederschlagen', tip: 'Stabilität −12, Opposition −15 %', ai: .5, fx: (w, a) => { ev.stab(w, -12); shiftPop(C(w), a.ide, -15); } }] }
};
function franceShaky() {
  let t = 0, h = 0; for (const i of LAND) { const p = G.prov[i]; if (p.own !== 'FRA') continue; t += PROV[i].vp; if (p.ctl === 'FRA') h += PROV[i].vp; }
  return h / Math.max(1, t) < .85;
}

/* ------------------------------------------------------------- Ablauf --- */
function queueEvent(id, who, args = {}, delay = 0) { G.pending.push({ id, who, args, at: G.tick + delay }); }
function onWarDeclared(a, b) {
  if (a === 'GER' && b === 'POL' && G.flags.mrp && alive('SOV')) queueEvent('sov_poland', 'SOV', {}, 17);
  if (b === 'SPA' && G.scw) G.scw = null;
}
function processEvents() {
  const d = curDate();
  for (const id in EVENTS) {
    const e = EVENTS[id]; if (e.dyn || G.fired[id]) continue;
    const [y, m, dd] = e.date; if (d.y < y || (d.y === y && (d.m < m || (d.m === m && d.d < dd)))) continue;
    if (d.y > y + 3) { G.fired[id] = 'expired'; continue; }
    const who = e.who; if (!alive(who)) continue;
    if (!e.cond()) continue;
    if (e.chance && rand() > e.chance) continue;
    G.fired[id] = G.tick; fireEvent({ id, who, args: {} });
  }
  for (const p of G.pending.slice()) if (G.tick >= p.at) { G.pending = G.pending.filter(x => x !== p); if (alive(p.who)) fireEvent(p); }
  // Spanischer Bürgerkrieg
  if (G.scw && G.tick >= G.scw.end) {
    const s = G.scw, nat = s.nat * 1.15 + rand() * 25 > s.rep;
    const comBack = Object.entries(s.by).filter(([k, v]) => v === 'rep' && alive(k) && C(k).ide === 'com').length;
    fireEvent({ id: 'scw_end', who: 'SPA', args: { nat, com: comBack > 0 && rand() < .5 } });
  }
}
function fireEvent(inst) {
  const e = EVENTS[inst.id]; if (!e) return;
  if (e.news && !isPlayer(inst.who)) addLog(`📰 ${e.title}`, 'news');
  if (isPlayer(inst.who)) { G.eventQueue = G.eventQueue || []; G.eventQueue.push(inst); UIHOOK.event(); return; }
  // KI wählt gewichtet
  const ws = e.opts.map(o => typeof o.ai === 'function' ? o.ai(inst.args) : (o.ai ?? 1));
  const tot = ws.reduce((a, b) => a + b, 0); let r = rand() * tot, k = 0;
  for (; k < ws.length - 1; k++) { r -= ws[k]; if (r <= 0) break; }
  if (tot <= 0) k = 0;
  applyEventOption(inst, k);
}
function applyEventOption(inst, k) {
  const e = EVENTS[inst.id]; const o = e.opts[k];
  if (!e.news && (playerConcerned(inst.who) || isPlayer(inst.who))) addLog(`${C(inst.who).s}: ${e.title} – „${o.t}“`, 'event');
  try { o.fx(inst.who, inst.args); } catch (err) { console.error('Ereignisfehler', inst.id, err); }
  dirty(); G.mapDirty = true;
}
function eventText(inst) { const e = EVENTS[inst.id]; return typeof e.text === 'function' ? e.text(inst.args) : e.text; }
function optTip(inst, o) { return typeof o.tip === 'function' ? o.tip(inst.args) : (o.tip || ''); }

// Spanischer Bürgerkrieg: Unterstützung
function supportSCW(id, side) {
  const c = C(id); if (!G.scw || c.pp < 25 || c.eq < 150 || (c.dcd.scw || 0) > G.tick) return false;
  c.pp -= 25; c.eq -= 150; c.dcd.scw = G.tick + 90; G.scw[side] += C(id).major ? 12 : 6; G.scw.by[id] = side;
  G.armies.filter(a => a.owner === id).slice(0, 1).forEach(a => a.xp = Math.min(100, a.xp + 8));
  G.tension = clamp(G.tension + 1, 0, 100);
  return true;
}
