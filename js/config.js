/* config.js - alle Stellschrauben an einem Ort. */

var PT = {};

PT.config = {
  // Logische Bildgröße. Alles wird in diesen Einheiten gezeichnet und zum
  // Schluss auf die Fenstergröße skaliert - der Laden ist immer ganz zu sehen.
  W: 960,
  H: 540,
  HUD_TOP: 54,
  HUD_BOTTOM: 50,

  STEP: 1 / 60,
  MAX_STEPS: 5,

  chef: {
    speed: 185,       // Einheiten pro Sekunde
    radius: 13
  },

  oven: {
    prepSlots: 3,     // Plätze auf der Arbeitsfläche, der Ausbau macht 4 daraus
    bakeSeconds: 11,  // bis "fertig"
    gut: 0.60,
    perfekt: 0.85,
    verbrannt: 1.05,
    ende: 1.35,

    // Der bessere Ofen zieht das Fenster für "perfekt" auseinander
    besser: { perfekt: 0.78, verbrannt: 1.14 }
  },

  // Die Karte. Zutaten sind immer da, es gibt keinen Vorrat.
  // preis = was der Gast zahlt, zutaten = was das Belegen kostet
  recipes: {
    margherita: { name: 'Margherita', kurz: 'Margh.', preis: 8.5,  zutaten: 2.5, farbe: '#e4572e', belag: ['tomate', 'kaese', 'basilikum'] },
    salami:     { name: 'Salami',     kurz: 'Salami', preis: 10.0, zutaten: 3.2, farbe: '#c0392b', belag: ['tomate', 'kaese', 'salami'] },
    funghi:     { name: 'Funghi',     kurz: 'Funghi', preis: 9.5,  zutaten: 3.0, farbe: '#b4762f', belag: ['tomate', 'kaese', 'pilze'] }
  },
  recipeOrder: ['margherita', 'salami', 'funghi'],

  customers: {
    speed: 105,
    ersterGast: 8,        // Sekunden Ruhe zu Beginn, zum Ofen anmachen
    spawnBase: 40,        // Sekunden zwischen zwei Gästen bei Ruf 0 ...
    spawnPerStar: 4,      // ... minus so viel je Stern Ruf ...
    spawnPerTisch: 6,     // ... und minus so viel je Tisch über den zwei Starttischen
    spawnMin: 14,         // so dicht kommen sie höchstens
    patience: 95,
    eatTime: 18,
    payTime: 2.2,
    tipShare: 0.12,
    startReputation: 3,
    memory: 20,
    counterSlots: 3,
    names: ['Mia', 'Jonas', 'Lena', 'Ben', 'Ida', 'Noah', 'Emma', 'Finn', 'Lea', 'Paul', 'Nora', 'Theo']
  },

  economy: {
    startMoney: 60
  },

  // Ausbauten. Gekauft wird an der Bautafel in der Küche.
  upgrades: [
    { id: 'tisch3',   name: 'Dritter Tisch',        preis: 60,  icon: 'tisch',    text: 'Zwei Plätze mehr im Gastraum' },
    { id: 'flaeche',  name: 'Größere Arbeitsfläche', preis: 40,  icon: 'flaeche',  text: 'Vier belegte Pizzen statt drei' },
    { id: 'tisch4',   name: 'Vierter Tisch',        preis: 90,  icon: 'tisch',    text: 'Nochmal zwei Plätze mehr' },
    { id: 'ofen2',    name: 'Zweiter Ofen',         preis: 200, icon: 'ofen',     text: 'Zwei Pizzen gleichzeitig backen' },
    { id: 'ofenGut',  name: 'Besserer Ofen',        preis: 120, icon: 'ofenPlus', text: 'Perfekt gelingt leichter, verbrennt später' }
  ],

  // Flache, warme Farbwelt
  colors: {
    bgDark:     '#0e1218',
    plaza:      '#c9c3b6',
    plazaLine:  '#b8b1a2',
    street:     '#3c4350',
    streetLine: '#7d879a',
    wall:       '#2b3440',
    wallTop:    '#3b4654',
    floorDine:  '#f3e5cf',
    floorKitchen: '#e2eaf0',
    floorLine:  'rgba(0,0,0,0.05)',
    counter:    '#c98a4b',
    counterTop: '#e0a868',
    oven:       '#8c3b2e',
    ovenHot:    '#ff8c42',
    prep:       '#cfd8df',
    prepTop:    '#eef3f7',
    table:      '#b9743f',
    tableTop:   '#d08c53',
    chair:      '#8a5a33',
    plant:      '#3fa06a',
    bin:        '#4a5560',
    binLid:     '#5f6b78',
    chef:       '#fbf7f0',
    chefAccent: '#e4572e',
    hud:        '#161c24',
    hudSoft:    '#1f2732',
    text:       '#f6f2ea',
    textDim:    '#9aa5b1',
    ink:        '#1f2630',
    good:       '#3fa06a',
    warn:       '#f2b705',
    bad:        '#e4572e',
    gold:       '#f2b705',
    shadow:     'rgba(12,16,22,0.22)'
  },

  guestColors: ['#5b8def', '#e4572e', '#3fa06a', '#9b5de5', '#f2b705', '#2ec4b6'],

  debug: false
};
