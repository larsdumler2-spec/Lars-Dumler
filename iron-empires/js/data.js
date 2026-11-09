'use strict';
/* ==========================================================================
   Iron Empires – Europa 1936 · Statische Spieldaten
   Karte: Hexfeld-Raster (versetzte Zeilen). Jede Zeile = 1 Breitengrad
   (71°N … 35°N), jede Spalte = 1,25 Längengrad (10°W … 44°O).
   ========================================================================== */
const COLS = 44, ROWS = 37, HEX = 10, HW = HEX * Math.sqrt(3);

// Lauflängen-Kodierung je Zeile: <Code><von>-<bis>
const MAP_RUNS = [
  "V27-29",
  "V22-32",
  "V20-23 W24-25 J26-30 S31-40",
  "V19-21 W22-26 J27-31 S32-43",
  "V18-20 W21-26 J27-31 S32-34 S38-43",
  "V17-19 W20-25 J26-31 S32-34 S41-43",
  "V16-18 W19-24 J27-31 S32-34 S39-43",
  "V15-17 W18-24 J26-31 S32-35 S38-43",
  "V14-17 W18-23 J26-31 S32-43",
  "V12-16 W17-21 J25-31 S32-43",
  "V12-15 W16-21 J25-32 S33-43",
  "V12-15 W16-22 J24-31 S32-43",
  "V13-15 W16-22 S31-43",
  "U4-6 V12-13 W17-21 126-30 S31-43",
  "U3-6 D15-16 W18-21 225-30 S31-43",
  "U3-6 D14-16 W18-20 325-28 229 S30-43",
  "R0-1 U2-6 D14-16 324-27 P28-29 S30-43",
  "R0-2 U3 U5-7 G15-21 P22-23 G24-26 P27-29 S30-43",
  "R0-2 U4-9 N12-13 G14-19 P20-28 S29-43",
  "R0-2 U4-8 N11-13 G14-19 P20-28 S29-43",
  "R0-1 U4-8 B10-12 G13-22 P23-29 S30-43",
  "U4-5 F9-11 B12 G13-17 C18-22 P23-29 S30-43",
  "F4-14 G15-17 C18-26 P27-29 S30-43",
  "F4-14 G15-17 A18-21 C22-24 M25 Q26-29 S30-43",
  "F6-12 H13-15 A16-21 M22-25 Q26-30 S31-35 S39-43",
  "F7-13 H14 I15-18 Y19-21 M22-24 Q25-30 S31-37 S39-43",
  "F7-13 I14-19 Y20-25 Q26-31 S34-36 S38-43",
  "F7-13 I14-18 Y20-25 Q26-30 S38-43",
  "E1-6 F7-13 I17-18 Y21-25 K26-30 S38-43",
  "O1-2 E3-10 F15 I17-20 L23 Y24-25 K26-29 T30 S41-43",
  "O0-2 E3-9 I15 I18-21 L23-24 X25-28 T29-30 T32-43",
  "O0-2 E3-8 E11 I15 I20-21 L24 X25-27 T29-43",
  "O0-2 E3-8 E10 I15 I21 X24-26 T29-43",
  "O0-1 E2-7 I18-21 X25-27 T29-43",
  "O0-1 E2-6 F12-15 I18-19 X25-26 T29-43",
  "E3-4 F7-16 T29-36 ,37-43",
  ",0-6 F7-16 X27-28 ,36-43"
];
const CODES = { G:'GER', F:'FRA', U:'ENG', R:'IRE', I:'ITA', P:'POL', S:'SOV', E:'SPA', O:'POR', B:'BEL', N:'HOL',
  H:'SWI', A:'AUT', C:'CZE', M:'HUN', Q:'ROM', Y:'YUG', K:'BUL', X:'GRE', T:'TUR', W:'SWE', V:'NOR', D:'DEN',
  J:'FIN', '1':'EST', '2':'LAT', '3':'LIT', L:'ALB' };

// Gelände: [Typ, Zeile, vonSpalte, bisSpalte]  m=Gebirge f=Wald w=Sumpf
const TERRAIN_SPEC = [
  ['m',24,13,20],['m',25,13,20],['m',26,14,15],             // Alpen
  ['m',28,5,9],                                              // Pyrenäen
  ['m',22,23,27],['m',23,24,28],['m',24,27,28],['m',25,25,28], // Karpaten
  ['m',27,20,23],['m',28,20,24],['m',29,23,27],['m',30,23,25],['m',31,24,25], // Balkan
  ['m',28,17,17],['m',29,18,18],['m',30,19,20],              // Apennin
  ['m',28,40,43],['m',29,40,43],                             // Kaukasus
  ['m',31,35,43],['m',32,34,43],['m',33,33,43],['m',34,33,43], // Anatolien
  ['m',13,4,4],['m',14,3,4],                                 // Schottland
  ['m',30,4,6],['m',31,4,5],['m',33,4,6],                    // Spanien
  ['m',31,25,26],['m',32,25,25],                             // Griechenland
  ['m',21,18,19],['m',22,19,19],['m',22,13,14],              // Sudeten, Vogesen
  ['f',20,15,17],['f',21,11,12],['f',21,14,16],              // Mittelgebirge, Ardennen
  ['w',19,27,31],['w',20,27,31],                             // Pripjet-Sümpfe
  ['f',13,32,43],['f',14,32,43],['f',15,33,43],['f',17,31,34],['f',18,31,33]
];

const IDEOLOGIES = {
  fas: { n:'Faschismus',  adj:'faschistisch',  col:'#9a6531', gov:'Faschistische Diktatur' },
  com: { n:'Kommunismus', adj:'kommunistisch', col:'#c3342e', gov:'Sozialistische Einparteienherrschaft' },
  dem: { n:'Demokratie',  adj:'demokratisch',  col:'#3f7fcf', gov:'Parlamentarische Demokratie' },
  neu: { n:'Autoritär',   adj:'autoritär',     col:'#8f8f7c', gov:'Autoritäres Regime' }
};

const TRAITS = {
  off:  { n:'Offensivgeist',     d:'+15 % Angriff', atk:.15 },
  def:  { n:'Defensivexperte',   d:'+20 % Verteidigung', def:.20 },
  tank: { n:'Panzerführer',      d:'+25 % Angriff von Panzer- und mot. Divisionen', tank:.25 },
  log:  { n:'Logistiker',        d:'Halbiert Versorgungsmalus, +20 % Org.-Erholung', log:.5, orgR:.2 },
  mnt:  { n:'Gebirgskämpfer',    d:'Halbiert Geländemalus', terr:.5 },
  inf:  { n:'Infanterieführer',  d:'+10 % Angriff und Verteidigung', atk:.1, def:.1 },
  none: { n:'Keine Besonderheit', d:'–' }
};

// Divisionstypen (abstrahiert)
const DIV = {
  inf:  { n:'Infanterie',   s:'INF', atk:10, def:14, org:60, speed:1.0, eq:100, mp:10, days:60,  oil:0 },
  mnt:  { n:'Gebirgsjäger', s:'GEB', atk:11, def:16, org:65, speed:1.0, eq:130, mp:10, days:75,  oil:0 },
  cav:  { n:'Kavallerie',   s:'KAV', atk:9,  def:10, org:65, speed:1.4, eq:80,  mp:8,  days:50,  oil:0 },
  art:  { n:'Artillerie',   s:'ART', atk:22, def:11, org:40, speed:0.9, eq:180, mp:8,  days:80,  oil:0 },
  mot:  { n:'Motorisiert',  s:'MOT', atk:14, def:15, org:60, speed:2.0, eq:220, mp:10, days:90,  oil:.5 },
  tank: { n:'Panzer',       s:'PZ',  atk:30, def:16, org:50, speed:1.8, eq:400, mp:10, days:120, oil:1 }
};
const SHIPS = {
  dd: { n:'Zerstörer',      pow:1,   cost:14 },
  cl: { n:'Kreuzer',        pow:3,   cost:34 },
  bb: { n:'Schlachtschiff', pow:8,   cost:90 },
  ss: { n:'U-Boot',         pow:1.2, cost:10 }
};

const ECO_LAWS = {
  civ:   { n:'Zivilwirtschaft',     cons:.35, ws:0,  stab:0,   d:'35 % der Zivilfabriken für Konsumgüter' },
  part:  { n:'Teilmobilisierung',   cons:.25, ws:15, stab:-3,  d:'25 % Konsumgüter' },
  war:   { n:'Kriegswirtschaft',    cons:.15, ws:35, stab:-6,  d:'15 % Konsumgüter' },
  total: { n:'Totale Mobilmachung', cons:.08, ws:60, stab:-10, d:'8 % Konsumgüter' }
};
const CONS_LAWS = {
  vol:   { n:'Freiwilligenarmee',      rate:.015, ws:0,  stab:0,  d:'1,5 % der Bevölkerung rekrutierbar' },
  lim:   { n:'Begrenzte Wehrpflicht',  rate:.025, ws:10, stab:0,  d:'2,5 % rekrutierbar' },
  ext:   { n:'Allgemeine Wehrpflicht', rate:.05,  ws:30, stab:-3, d:'5 % rekrutierbar' },
  total: { n:'Totale Mobilisierung',   rate:.09,  ws:60, stab:-8, d:'9 % rekrutierbar' }
};
const TAX_LAWS = {
  low:  { n:'Niedrige Steuern', mult:.75, stab:5,  d:'Weniger Einnahmen, +5 Stabilität' },
  norm: { n:'Normale Steuern',  mult:1,   stab:0,  d:'Ausgewogen' },
  high: { n:'Hohe Steuern',     mult:1.3, stab:-6, d:'Mehr Einnahmen, −6 Stabilität' }
};

const BUILD = {
  civ:   { n:'Zivilfabrik',      cost:48, d:'Erzeugt Bau- und Konsumkapazität' },
  mil:   { n:'Militärfabrik',    cost:40, d:'Produziert Ausrüstung, Flugzeuge, Schiffe' },
  infra: { n:'Infrastruktur',    cost:20, d:'Schnellere Bewegung, bessere Versorgung' },
  fort:  { n:'Festungsanlage',   cost:20, d:'+15 % Verteidigung je Stufe' }
};
const RES = { steel:'Stahl', oil:'Öl', alu:'Aluminium', rubber:'Kautschuk' };

/* ---- Länder -------------------------------------------------------------
   res: [Stahl, Öl, Aluminium, Kautschuk] Förderung pro Monat
   navy: [Zerstörer, Kreuzer, Schlachtschiffe, U-Boote]
   ipop: Popularität [fas, com, dem, neu]                                   */
const CD = {
  GER:{n:'Deutsches Reich',s:'Deutschland',col:'#7c838c',ide:'fas',ldr:'Adolf Hitler',pop:67,civ:30,mil:14,res:[45,2,6,0],tr:900,stab:60,ws:35,div:{inf:26,mnt:3,cav:1,mot:2,tank:3},air:700,navy:[12,6,3,24],slots:3,aggr:.9,major:1,ipop:[70,5,10,15],infra:4,eco:'part',cons:'lim',
    gens:[['Gerd von Rundstedt',4,'def'],['Heinz Guderian',4,'tank'],['Erich von Manstein',5,'off'],['Fedor von Bock',3,'log'],['Wilhelm Ritter von Leeb',3,'def']],
    alt:{dem:'Carl Goerdeler',com:'Ernst Thälmann',neu:'Ludwig Beck'}},
  FRA:{n:'Französische Republik',s:'Frankreich',col:'#3e6db4',ide:'dem',ldr:'Albert Sarraut',pop:42,civ:32,mil:12,res:[30,1,12,0],tr:1100,stab:50,ws:15,div:{inf:40,mnt:3,cav:4,mot:3,tank:2},air:900,navy:[32,15,6,40],slots:3,aggr:.15,major:1,ipop:[8,18,62,12],infra:4,eco:'civ',cons:'lim',
    gens:[['Maurice Gamelin',2,'def'],['Charles de Gaulle',4,'tank'],['Alphonse Georges',3,'inf'],['Henri Giraud',3,'off']],
    alt:{fas:'François de La Rocque',com:'Maurice Thorez',neu:'Philippe Pétain'}},
  ENG:{n:'Vereinigtes Königreich',s:'Großbritannien',col:'#c25463',ide:'dem',ldr:'Stanley Baldwin',pop:47,civ:34,mil:11,res:[25,3,10,10],tr:1400,stab:70,ws:15,div:{inf:18,mot:2,tank:1,cav:1},air:1000,navy:[60,40,15,30],slots:3,aggr:.2,major:1,ipop:[4,6,80,10],infra:4,eco:'civ',cons:'vol',
    gens:[['Bernard Montgomery',4,'inf'],['Alan Brooke',4,'def'],['Harold Alexander',3,'log'],['Archibald Wavell',3,'off']],
    alt:{fas:'Oswald Mosley',com:'Harry Pollitt',neu:'Edward VIII.'}},
  ITA:{n:'Königreich Italien',s:'Italien',col:'#4f9c5a',ide:'fas',ldr:'Benito Mussolini',pop:43,civ:18,mil:10,res:[8,1,8,0],tr:600,stab:55,ws:40,div:{inf:30,mnt:6,cav:3,mot:1,tank:1},air:800,navy:[40,18,4,60],slots:2,aggr:.6,major:1,ipop:[65,5,10,20],infra:3,eco:'part',cons:'lim',
    gens:[['Rodolfo Graziani',2,'off'],['Giovanni Messe',4,'def'],['Ettore Bastico',2,'mnt']],
    alt:{dem:'Ivanoe Bonomi',com:'Palmiro Togliatti',neu:'Pietro Badoglio'}},
  POL:{n:'Republik Polen',s:'Polen',col:'#c97ca2',ide:'neu',ldr:'Ignacy Mościcki',pop:34,civ:12,mil:4,res:[12,4,0,0],tr:400,stab:55,ws:25,div:{inf:30,cav:10,mnt:2},air:400,navy:[4,0,0,5],slots:2,aggr:.2,major:1,ipop:[12,8,25,55],infra:2,eco:'civ',cons:'lim',
    gens:[['Edward Rydz-Śmigły',3,'def'],['Władysław Anders',3,'off'],['Tadeusz Kutrzeba',3,'inf']],
    alt:{fas:'Bolesław Piasecki',com:'Bolesław Bierut',dem:'Wincenty Witos'}},
  SOV:{n:'Sowjetunion',s:'Sowjetunion',col:'#922c28',ide:'com',ldr:'Josef Stalin',pop:165,civ:40,mil:22,res:[70,40,14,2],tr:1200,stab:50,ws:30,div:{inf:70,cav:12,mnt:4,mot:3,tank:8},air:2500,navy:[20,8,3,60],slots:3,aggr:.5,major:1,ipop:[3,80,5,12],infra:2,eco:'part',cons:'lim',
    gens:[['Georgi Schukow',5,'off'],['Michail Tuchatschewski',4,'tank'],['Konstantin Rokossowski',4,'inf'],['Semjon Timoschenko',3,'def']],
    alt:{fas:'Konstantin Rodzajewski',dem:'Alexander Kerenski',neu:'Leo Trotzki'}},
  SPA:{n:'Spanische Republik',s:'Spanien',col:'#d8b24b',ide:'dem',ldr:'Manuel Azaña',pop:24,civ:8,mil:3,res:[8,0,2,0],tr:300,stab:35,ws:20,div:{inf:14,mnt:2},air:150,navy:[10,6,2,8],slots:2,aggr:.1,ipop:[25,25,35,15],infra:2,gens:[['José Miaja',2,'def']],alt:{fas:'Francisco Franco'}},
  POR:{n:'Portugal',s:'Portugal',col:'#3a8f6c',ide:'neu',ldr:'António de Oliveira Salazar',pop:7,civ:3,mil:1,res:[2,0,0,2],tr:120,stab:65,ws:10,div:{inf:6},air:60,navy:[6,0,0,3],slots:1,aggr:.05,ipop:[20,5,15,60],infra:2},
  BEL:{n:'Königreich Belgien',s:'Belgien',col:'#bba53c',ide:'dem',ldr:'Paul van Zeeland',pop:8,civ:6,mil:3,res:[10,0,0,6],tr:200,stab:60,ws:10,div:{inf:12},air:150,navy:[0,0,0,0],slots:1,aggr:.02,ipop:[10,8,72,10],infra:4,gens:[['Raoul Van Overstraeten',2,'def']]},
  HOL:{n:'Königreich der Niederlande',s:'Niederlande',col:'#e08b3f',ide:'dem',ldr:'Hendrikus Colijn',pop:8.5,civ:6,mil:2,res:[2,10,2,15],tr:260,stab:65,ws:10,div:{inf:8},air:120,navy:[8,4,0,12],slots:1,aggr:.02,ipop:[6,5,80,9],infra:4,gens:[['Henri Winkelman',2,'def']]},
  SWI:{n:'Schweiz',s:'Schweiz',col:'#cfcbb8',ide:'dem',ldr:'Albert Meyer',pop:4.2,civ:4,mil:2,res:[0,0,2,0],tr:200,stab:80,ws:20,div:{inf:9,mnt:3},air:100,navy:[0,0,0,0],slots:1,aggr:0,ipop:[5,3,85,7],infra:4,gens:[['Henri Guisan',4,'mnt']]},
  AUT:{n:'Bundesstaat Österreich',s:'Österreich',col:'#d9cfb6',ide:'neu',ldr:'Kurt Schuschnigg',pop:6.7,civ:4,mil:1,res:[3,1,2,0],tr:120,stab:45,ws:10,div:{inf:6,mnt:2},air:60,navy:[0,0,0,0],slots:1,aggr:0,ipop:[30,5,15,50],infra:3},
  CZE:{n:'Tschechoslowakei',s:'Tschechoslowakei',col:'#4fa3a9',ide:'dem',ldr:'Edvard Beneš',pop:15,civ:10,mil:6,res:[12,0,1,0],tr:300,stab:60,ws:30,div:{inf:24,mnt:2,tank:2},air:400,navy:[0,0,0,0],slots:2,aggr:.02,ipop:[10,10,70,10],infra:3,gens:[['Ludvík Krejčí',3,'def']]},
  HUN:{n:'Königreich Ungarn',s:'Ungarn',col:'#9b7b50',ide:'neu',ldr:'Miklós Horthy',pop:9,civ:4,mil:2,res:[2,1,12,0],tr:140,stab:55,ws:20,div:{inf:8,cav:2},air:80,navy:[0,0,0,0],slots:1,aggr:.15,ipop:[25,5,15,55],infra:3,gens:[['Gusztáv Jány',2,'inf']]},
  ROM:{n:'Königreich Rumänien',s:'Rumänien',col:'#d3bd52',ide:'neu',ldr:'Carol II.',pop:19,civ:5,mil:3,res:[4,35,0,0],tr:200,stab:45,ws:15,div:{inf:18,cav:4,mnt:2},air:150,navy:[4,0,0,1],slots:1,aggr:.05,ipop:[25,5,20,50],infra:2,gens:[['Ion Antonescu',3,'off']]},
  YUG:{n:'Königreich Jugoslawien',s:'Jugoslawien',col:'#6d5ba8',ide:'neu',ldr:'Prinzregent Paul',pop:15,civ:4,mil:2,res:[4,0,8,0],tr:160,stab:40,ws:15,div:{inf:18,mnt:4},air:120,navy:[4,1,0,4],slots:1,aggr:.05,ipop:[10,10,25,55],infra:2,gens:[['Dušan Simović',2,'mnt']]},
  BUL:{n:'Zarentum Bulgarien',s:'Bulgarien',col:'#6f9b3f',ide:'neu',ldr:'Boris III.',pop:6.2,civ:2,mil:1,res:[1,0,0,0],tr:80,stab:50,ws:20,div:{inf:8},air:40,navy:[2,0,0,0],slots:1,aggr:.1,ipop:[15,15,15,55],infra:2,gens:[['Hristo Lukov',2,'inf']]},
  GRE:{n:'Königreich Griechenland',s:'Griechenland',col:'#6fa9dc',ide:'neu',ldr:'Ioannis Metaxas',pop:7,civ:3,mil:1,res:[1,0,4,0],tr:100,stab:50,ws:20,div:{inf:10,mnt:2},air:60,navy:[10,2,0,4],slots:1,aggr:.05,ipop:[15,10,30,45],infra:2,gens:[['Alexandros Papagos',3,'mnt']]},
  TUR:{n:'Republik Türkei',s:'Türkei',col:'#a8753f',ide:'neu',ldr:'Mustafa Kemal Atatürk',pop:16,civ:6,mil:2,res:[6,0,0,0],tr:200,stab:65,ws:20,div:{inf:18,cav:4,mnt:2},air:100,navy:[8,2,1,4],slots:1,aggr:.05,ipop:[5,5,20,70],infra:1,gens:[['Fevzi Çakmak',3,'def']]},
  SWE:{n:'Königreich Schweden',s:'Schweden',col:'#4f90c5',ide:'dem',ldr:'Per Albin Hansson',pop:6.3,civ:6,mil:3,res:[40,0,0,0],tr:260,stab:75,ws:10,div:{inf:8},air:150,navy:[12,6,0,10],slots:1,aggr:0,ipop:[3,8,82,7],infra:3,gens:[['Olof Thörnell',2,'def']]},
  NOR:{n:'Königreich Norwegen',s:'Norwegen',col:'#9d5c63',ide:'dem',ldr:'Johan Nygaardsvold',pop:2.9,civ:2,mil:1,res:[2,0,4,0],tr:100,stab:70,ws:10,div:{inf:4},air:40,navy:[6,0,0,4],slots:1,aggr:0,ipop:[5,5,82,8],infra:2,gens:[['Otto Ruge',2,'mnt']]},
  DEN:{n:'Königreich Dänemark',s:'Dänemark',col:'#c8665b',ide:'dem',ldr:'Thorvald Stauning',pop:3.7,civ:3,mil:1,res:[0,0,0,0],tr:120,stab:75,ws:5,div:{inf:3},air:30,navy:[4,0,0,2],slots:1,aggr:0,ipop:[5,5,82,8],infra:3},
  FIN:{n:'Republik Finnland',s:'Finnland',col:'#d0d8e8',ide:'dem',ldr:'Pehr Evind Svinhufvud',pop:3.7,civ:3,mil:1,res:[3,0,0,0],tr:100,stab:65,ws:30,div:{inf:9},air:60,navy:[2,0,0,4],slots:1,aggr:0,ipop:[10,5,70,15],infra:2,gens:[['Carl Gustaf Mannerheim',5,'def']]},
  EST:{n:'Republik Estland',s:'Estland',col:'#5c80a7',ide:'neu',ldr:'Konstantin Päts',pop:1.1,civ:1,mil:1,res:[1,1,0,0],tr:40,stab:55,ws:15,div:{inf:3},air:15,navy:[1,0,0,2],slots:1,aggr:0,ipop:[10,5,30,55],infra:2},
  LAT:{n:'Republik Lettland',s:'Lettland',col:'#8f4b5b',ide:'neu',ldr:'Kārlis Ulmanis',pop:1.9,civ:1,mil:1,res:[1,0,0,0],tr:50,stab:55,ws:15,div:{inf:3},air:15,navy:[0,0,0,2],slots:1,aggr:0,ipop:[10,5,30,55],infra:2},
  LIT:{n:'Republik Litauen',s:'Litauen',col:'#c9c35b',ide:'neu',ldr:'Antanas Smetona',pop:2.4,civ:1,mil:1,res:[0,0,0,0],tr:50,stab:55,ws:15,div:{inf:3},air:15,navy:[0,0,0,0],slots:1,aggr:0,ipop:[10,5,30,55],infra:2},
  ALB:{n:'Königreich Albanien',s:'Albanien',col:'#a3494a',ide:'neu',ldr:'Zogu I.',pop:1,civ:1,mil:0,res:[0,1,0,0],tr:20,stab:45,ws:10,div:{inf:2},air:0,navy:[0,0,0,0],slots:1,aggr:0,ipop:[10,5,10,75],infra:1},
  IRE:{n:'Irischer Freistaat',s:'Irland',col:'#5ba46b',ide:'dem',ldr:'Éamon de Valera',pop:3,civ:2,mil:0,res:[0,0,0,0],tr:60,stab:65,ws:5,div:{inf:2},air:10,navy:[0,0,0,0],slots:1,aggr:0,ipop:[5,3,80,12],infra:2}
};
const PLAYABLE = ['GER','FRA','ENG','ITA','POL','SOV'];
const PLAYABLE_INFO = {
  GER:'Industriemacht mit starker Armee, aber kaum Öl und Kautschuk. Revisionistische Ziele gegenüber den Nachbarn.',
  FRA:'Große Armee und Kolonialreich. Abhängig von Bündnissen; innenpolitisch gespalten.',
  ENG:'Weltgrößte Flotte, sichere Insellage, kleine Armee. Hüter des Gleichgewichts in Europa.',
  ITA:'Ehrgeiziges Mittelmeerreich mit schwacher Industrie und großer Flotte.',
  POL:'Zwischen zwei Großmächten eingeklemmt. Viele Divisionen, wenig Industrie.',
  SOV:'Gewaltige Ressourcen und Menschenmassen, aber eine Armee vor inneren Säuberungen.'
};

/* ---- Städte: [Name, Land, Breite, Länge, Siegpunkte, Extras] ---- */
const CITIES = [
  ['Berlin','GER',52.5,13.4,10,{cap:1}],['Hamburg','GER',53.55,10,5],['München','GER',48.1,11.6,4],['Köln','GER',50.9,7,4],
  ['Ruhrgebiet','GER',51.6,7.2,6,{res:{steel:.35}}],['Frankfurt','GER',50.1,8.7,3],['Königsberg','GER',54.7,20.5,3],['Breslau','GER',51.1,17,3],
  ['Dresden','GER',51.05,13.7,3],['Stuttgart','GER',48.8,9.2,3],['Leipzig','GER',51.3,12.4,2],['Hannover','GER',52.4,9.7,2],['Stettin','GER',53.4,14.5,2],
  ['Paris','FRA',48.85,2.35,10,{cap:1}],['Lyon','FRA',45.75,4.85,4],['Marseille','FRA',43.3,5.4,4],['Bordeaux','FRA',44.85,-0.6,3],['Lille','FRA',50.6,3.06,3],
  ['Straßburg','FRA',48.6,7.75,3],['Brest','FRA',48.4,-4.5,2],['Toulouse','FRA',43.6,1.44,2],['Nantes','FRA',47.2,-1.55,2],['Algier','FRA',36.75,3.06,3],
  ['Tunis','FRA',36.8,10.2,2],['Oran','FRA',35.7,-0.6,1],['Ajaccio','FRA',41.9,8.7,1],
  ['London','ENG',51.5,-0.12,10,{cap:1}],['Birmingham','ENG',52.5,-1.9,4],['Manchester','ENG',53.5,-2.25,4],['Glasgow','ENG',55.86,-4.25,3],
  ['Edinburgh','ENG',55.95,-3.2,2],['Newcastle','ENG',54.97,-1.6,2],['Belfast','ENG',54.6,-5.93,2],['Plymouth','ENG',50.37,-4.14,2],['Cardiff','ENG',51.48,-3.18,2],
  ['Aberdeen','ENG',57.15,-2.1,1],
  ['Rom','ITA',41.9,12.5,10,{cap:1}],['Mailand','ITA',45.46,9.19,5],['Turin','ITA',45.07,7.69,4],['Neapel','ITA',40.85,14.27,4],['Venedig','ITA',45.44,12.33,3],
  ['Genua','ITA',44.4,8.93,3],['Florenz','ITA',43.77,11.25,2],['Bari','ITA',41.12,16.87,2],['Palermo','ITA',38.12,13.36,2],['Cagliari','ITA',39.22,9.12,1],
  ['Triest','ITA',45.65,13.77,2],['Bologna','ITA',44.5,11.34,2],
  ['Warschau','POL',52.23,21.0,10,{cap:1}],['Krakau','POL',50.06,19.94,4],['Lodz','POL',51.76,19.46,3],['Posen','POL',52.41,16.93,3],['Lemberg','POL',49.84,24.03,3],
  ['Wilna','POL',54.69,25.28,2],['Gdingen','POL',54.5,18.53,2],['Lublin','POL',51.25,22.57,2],['Brest-Litowsk','POL',52.1,23.7,1],['Białystok','POL',53.13,23.16,1],
  ['Moskau','SOV',55.75,37.62,10,{cap:1}],['Leningrad','SOV',59.93,30.34,8],['Kiew','SOV',50.45,30.52,6],['Charkow','SOV',49.99,36.23,5],['Stalingrad','SOV',48.7,44.5,5],
  ['Minsk','SOV',53.9,27.56,3],['Odessa','SOV',46.48,30.72,3],['Smolensk','SOV',54.78,32.04,2],['Murmansk','SOV',68.97,33.08,2],['Archangelsk','SOV',64.54,40.54,2],
  ['Sewastopol','SOV',44.6,33.5,2],['Rostow','SOV',47.23,39.7,3],['Gorki','SOV',56.3,43.9,4],['Woronesch','SOV',51.66,39.2,2],['Maikop','SOV',44.6,40.1,2,{res:{oil:.6}}],
  ['Madrid','SPA',40.4,-3.7,8,{cap:1}],['Barcelona','SPA',41.39,2.17,4],['Sevilla','SPA',37.39,-5.98,2],['Valencia','SPA',39.47,-0.38,2],['Bilbao','SPA',43.26,-2.93,2],['Saragossa','SPA',41.65,-0.89,1],
  ['Lissabon','POR',38.72,-9.14,5,{cap:1}],['Porto','POR',41.15,-8.61,2],
  ['Brüssel','BEL',50.85,4.35,5,{cap:1}],['Antwerpen','BEL',51.22,4.4,3],
  ['Amsterdam','HOL',52.37,4.9,5,{cap:1}],['Rotterdam','HOL',51.92,4.48,3],
  ['Bern','SWI',46.95,7.45,5,{cap:1}],['Zürich','SWI',47.37,8.54,3],
  ['Wien','AUT',48.2,16.37,6,{cap:1}],['Graz','AUT',47.07,15.44,2],['Innsbruck','AUT',47.27,11.4,1],
  ['Prag','CZE',50.08,14.44,6,{cap:1}],['Brünn','CZE',49.2,16.6,3],['Pressburg','CZE',48.15,17.1,2],['Pilsen','CZE',49.75,13.38,2],
  ['Budapest','HUN',47.5,19.04,6,{cap:1}],['Debrecen','HUN',47.53,21.63,2],
  ['Bukarest','ROM',44.43,26.1,6,{cap:1}],['Ploiești','ROM',44.94,26.02,3,{res:{oil:.7}}],['Klausenburg','ROM',46.77,23.6,2],['Jassy','ROM',47.16,27.6,2],['Konstanza','ROM',44.17,28.63,1],
  ['Belgrad','YUG',44.8,20.46,6,{cap:1}],['Zagreb','YUG',45.81,15.98,3],['Sarajevo','YUG',43.86,18.41,2],['Skopje','YUG',42,21.43,1],['Split','YUG',43.5,16.44,1],
  ['Sofia','BUL',42.7,23.32,5,{cap:1}],['Warna','BUL',43.2,27.9,2],['Plowdiw','BUL',42.15,24.75,1],
  ['Athen','GRE',37.98,23.73,6,{cap:1}],['Thessaloniki','GRE',40.64,22.94,3],['Iraklio','GRE',35.34,25.13,1],
  ['Ankara','TUR',39.93,32.86,6,{cap:1}],['Istanbul','TUR',41.01,28.98,5],['Izmir','TUR',38.42,27.14,3],['Adana','TUR',37,35.32,2],['Samsun','TUR',41.29,36.33,1],['Erzurum','TUR',39.9,41.27,1],
  ['Stockholm','SWE',59.33,18.07,6,{cap:1}],['Göteborg','SWE',57.7,11.97,3],['Malmö','SWE',55.6,13,2],['Kiruna','SWE',67.85,20.2,2,{res:{steel:.6}}],
  ['Oslo','NOR',59.91,10.75,5,{cap:1}],['Bergen','NOR',60.39,5.32,2],['Trondheim','NOR',63.43,10.4,2],['Narvik','NOR',68.44,17.43,2],
  ['Kopenhagen','DEN',55.68,12.57,5,{cap:1}],['Aarhus','DEN',56.16,10.2,2],
  ['Helsinki','FIN',60.17,24.94,5,{cap:1}],['Turku','FIN',60.45,22.27,2],['Wiborg','FIN',60.71,28.75,2],['Oulu','FIN',65.01,25.47,1],
  ['Tallinn','EST',59.44,24.75,4,{cap:1}],['Riga','LAT',56.95,24.1,4,{cap:1}],['Kaunas','LIT',54.9,23.9,4,{cap:1}],['Memel','LIT',55.7,21.13,1],
  ['Tirana','ALB',41.33,19.82,3,{cap:1}],['Dublin','IRE',53.35,-6.26,4,{cap:1}],['Cork','IRE',51.9,-8.47,1]
];

/* ---- Forschung ---- */
const TECH_CATS = { ind:'Industrie', infra:'Infrastruktur', com:'Kommunikation', mil:'Militärorganisation', air:'Luftfahrt', nav:'Marine', eco:'Wirtschaft' };
const TECHS = [
  {id:'ind1',cat:'ind',n:'Fließbandfertigung',y:1936,cost:110,req:[],fx:{milOut:.10},d:'+10 % Militärproduktion'},
  {id:'ind2',cat:'ind',n:'Werkzeugmaschinen',y:1937,cost:140,req:['ind1'],fx:{milOut:.10,effCap:.10},d:'+10 % Militärproduktion, +10 % max. Effizienz'},
  {id:'ind3',cat:'ind',n:'Serienproduktion',y:1939,cost:170,req:['ind2'],fx:{milOut:.15},d:'+15 % Militärproduktion'},
  {id:'ind4',cat:'ind',n:'Automatisierte Fertigung',y:1941,cost:210,req:['ind3'],fx:{milOut:.15,effCap:.10},d:'+15 % Militärproduktion, +10 % max. Effizienz'},
  {id:'ind5',cat:'ind',n:'Dezentrale Industrie',y:1943,cost:240,req:['ind4'],fx:{milOut:.10,bombRes:.5},d:'+10 % Produktion, −50 % Bombenschäden'},
  {id:'inf1',cat:'infra',n:'Moderne Bautechnik',y:1936,cost:100,req:[],fx:{build:.10},d:'+10 % Baugeschwindigkeit'},
  {id:'inf2',cat:'infra',n:'Stahlbeton',y:1937,cost:130,req:['inf1'],fx:{build:.15,fort:.25},d:'+15 % Baugeschwindigkeit, +25 % Festungswirkung'},
  {id:'inf3',cat:'infra',n:'Fernstraßennetz',y:1938,cost:150,req:['inf1'],fx:{speed:.15,supply:.2},d:'+15 % Bewegung, bessere Versorgung'},
  {id:'inf4',cat:'infra',n:'Eisenbahnlogistik',y:1940,cost:180,req:['inf3'],fx:{speed:.10,supply:.3,build:.10},d:'+10 % Bewegung, +10 % Bau, Versorgung'},
  {id:'com1',cat:'com',n:'Feldfunk',y:1936,cost:100,req:[],fx:{org:.05,landAtk:.03},d:'+5 % Organisation, +3 % Angriff'},
  {id:'com2',cat:'com',n:'Forschungsinstitute',y:1936,cost:150,req:[],fx:{slot:1},d:'+1 Forschungsplatz'},
  {id:'com3',cat:'com',n:'Verschlüsselungstechnik',y:1938,cost:140,req:['com1'],fx:{research:.10,landDef:.05},d:'+10 % Forschung, +5 % Verteidigung'},
  {id:'com4',cat:'com',n:'Radar',y:1939,cost:180,req:['com3'],fx:{airPow:.20,navPow:.10},d:'+20 % Luftkampf, +10 % Seekampf'},
  {id:'com5',cat:'com',n:'Zweite Forschungsabteilung',y:1939,cost:200,req:['com2'],fx:{slot:1},d:'+1 Forschungsplatz'},
  {id:'com6',cat:'com',n:'Elektronische Rechenmaschinen',y:1942,cost:220,req:['com4'],fx:{research:.15},d:'+15 % Forschung'},
  {id:'mil1',cat:'mil',n:'Verbesserte Infanteriewaffen',y:1936,cost:100,req:[],fx:{landAtk:.10},d:'+10 % Angriff'},
  {id:'mil2',cat:'mil',n:'Mittlere Panzer',y:1937,cost:140,req:['mil1'],fx:{tankAtk:.20},d:'+20 % Angriff von Panzern'},
  {id:'mil3',cat:'mil',n:'Bewegungskrieg-Doktrin',y:1938,cost:160,req:['mil1'],fx:{landAtk:.10,org:.10},d:'+10 % Angriff, +10 % Organisation'},
  {id:'mil4',cat:'mil',n:'Tiefgestaffelte Verteidigung',y:1938,cost:150,req:['mil1'],fx:{landDef:.15},d:'+15 % Verteidigung'},
  {id:'mil5',cat:'mil',n:'Schwere Panzer',y:1941,cost:200,req:['mil2'],fx:{tankAtk:.25},d:'+25 % Angriff von Panzern'},
  {id:'mil6',cat:'mil',n:'Verbundene Waffen',y:1942,cost:220,req:['mil3','mil4'],fx:{landAtk:.10,landDef:.10,org:.10},d:'+10 % Angriff, Verteidigung, Organisation'},
  {id:'air1',cat:'air',n:'Ganzmetall-Jäger',y:1936,cost:110,req:[],fx:{airPow:.15},d:'+15 % Luftkampfstärke'},
  {id:'air2',cat:'air',n:'Sturzkampfbomber',y:1937,cost:140,req:['air1'],fx:{airBonus:.05},d:'+5 % Luftunterstützung am Boden'},
  {id:'air3',cat:'air',n:'Moderne Jagdflugzeuge',y:1939,cost:170,req:['air1'],fx:{airPow:.20},d:'+20 % Luftkampfstärke'},
  {id:'air4',cat:'air',n:'Viermotorige Bomber',y:1940,cost:190,req:['air2'],fx:{bomb:.5},d:'+50 % strategische Bombenwirkung'},
  {id:'air5',cat:'air',n:'Strahltriebwerke',y:1943,cost:260,req:['air3'],fx:{airPow:.35},d:'+35 % Luftkampfstärke'},
  {id:'nav1',cat:'nav',n:'Moderne Zerstörer',y:1936,cost:110,req:[],fx:{navPow:.10},d:'+10 % Flottenstärke'},
  {id:'nav2',cat:'nav',n:'U-Boot-Technik',y:1937,cost:130,req:[],fx:{subPow:.30},d:'+30 % U-Boot-Wirkung (Handelskrieg)'},
  {id:'nav3',cat:'nav',n:'Schnelle Schlachtschiffe',y:1938,cost:170,req:['nav1'],fx:{navPow:.15},d:'+15 % Flottenstärke'},
  {id:'nav4',cat:'nav',n:'Amphibische Kriegsführung',y:1939,cost:150,req:[],fx:{invasion:.5},d:'Halbiert den Landungsmalus'},
  {id:'nav5',cat:'nav',n:'Trägerkampfgruppen',y:1940,cost:200,req:['nav3'],fx:{navPow:.20},d:'+20 % Flottenstärke'},
  {id:'eco1',cat:'eco',n:'Zentralbank-Reform',y:1936,cost:100,req:[],fx:{income:.15},d:'+15 % Staatseinnahmen'},
  {id:'eco2',cat:'eco',n:'Konsumgüter-Rationalisierung',y:1937,cost:130,req:['eco1'],fx:{consumer:.05},d:'−5 % Konsumgüterbedarf'},
  {id:'eco3',cat:'eco',n:'Synthetisches Öl',y:1937,cost:150,req:[],fx:{synOil:1},d:'Erzeugt Öl aus Kohle (+4 und +10 % der Zivilfabriken)'},
  {id:'eco4',cat:'eco',n:'Synthetischer Kautschuk',y:1938,cost:150,req:['eco3'],fx:{synRub:1},d:'Erzeugt Kautschuk (+3 und +8 % der Zivilfabriken)'},
  {id:'eco5',cat:'eco',n:'Staatliche Planungsbehörde',y:1939,cost:170,req:['eco2'],fx:{build:.10,pp:10},d:'+10 % Bau, +10 politische Macht/Monat'},
  {id:'eco6',cat:'eco',n:'Kriegswirtschaftsamt',y:1941,cost:200,req:['eco5'],fx:{milOut:.10,consumer:.03},d:'+10 % Militärproduktion, −3 % Konsumgüter'}
];
const TECH_BY_ID = Object.fromEntries(TECHS.map(t => [t.id, t]));
