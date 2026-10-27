/* shop.js - der Grundriss.
 *
 * Der ganze Laden ist immer zu sehen: Straße rechts, Eingang in der rechten
 * Wand, Gastraum in der Mitte, Küche links. Hier stehen die Maße, die
 * Kollision für die Wegfindung und das Zeichnen von allem Unbeweglichen.
 */

PT.shop = (function () {
  var C = PT.config;
  var col = C.colors;

  // --- Maße -------------------------------------------------------------

  var WALL = 14;
  var B = { x: 40, y: 76, w: 724, h: 392 };            // Außenkante
  var IN = { x: B.x + WALL, y: B.y + WALL,             // Innenraum
             w: B.w - 2 * WALL, h: B.h - 2 * WALL };
  var KITCHEN_RIGHT = 300;                              // Küche bis hierhin
  var DOOR = { y1: 250, y2: 320 };                      // Lücke in der rechten Wand

  var STREET_X = 858;

  var walls = [
    { x: B.x, y: B.y, w: B.w, h: WALL },                           // oben
    { x: B.x, y: B.y + B.h - WALL, w: B.w, h: WALL },              // unten
    { x: B.x, y: B.y, w: WALL, h: B.h },                           // links
    { x: B.x + B.w - WALL, y: B.y, w: WALL, h: DOOR.y1 - B.y },    // rechts oben
    { x: B.x + B.w - WALL, y: DOOR.y2, w: WALL, h: B.y + B.h - DOOR.y2 }
  ];

  // Zwei Ofenplätze übereinander an der Küchenwand. Der zweite ist erst nach
  // dem Ausbau da, vorher steht dort nur ein blasser Umriss.
  // Beide Öfen stehen nebeneinander an der oberen Wand, das Maul zeigt nach
  // unten in den Raum - davor ist bei beiden Platz für den Chef.
  var ovens = [
    { x: 62, y: 96, w: 96, h: 84 },
    { x: 166, y: 96, w: 96, h: 84, id: 'ofen2' }
  ];
  var oven = ovens[0];

  var prep    = { x: 62, y: 380, w: 134, h: 64 };   // Belegen unten
  var counter = { x: 264, y: 186, w: 38, h: 160 };
  var board   = { x: 62, y: 226, w: 40, h: 92 };    // Bautafel längs an der Wand

  // Bank auf dem Gehweg - steht im Weg, deshalb in der Kollision
  var bench = { x: 792, y: 372, w: 74, h: 24 };

  var tables = [
    { cx: 420, cy: 170, r: 34 },
    { cx: 620, cy: 170, r: 34 },
    { cx: 420, cy: 380, r: 34, id: 'tisch3' },
    { cx: 620, cy: 380, r: 34, id: 'tisch4' }
  ];

  // Steht das hier schon? Ohne id ist es von Anfang an da.
  function gebaut(ding) {
    return !ding.id || PT.upgrades.hat(ding.id);
  }

  var bin = { x: 204, y: 388, w: 46, h: 50 };

  var plants = [
    { x: 726, y: 112, r: 17 },
    { x: 726, y: 432, r: 17 }
  ];

  // Sitzplätze: zwei Stühle je gebautem Tisch, links und rechts. Nach einem
  // Ausbau wird dieselbe Liste neu gefüllt, damit Verweise gültig bleiben.
  var seats = [];

  function rebuild() {
    var alt = {};
    for (var a = 0; a < seats.length; a++) alt[seats[a].id] = seats[a].taken;
    seats.length = 0;

    for (var i = 0; i < tables.length; i++) {
      var t = tables[i];
      if (!gebaut(t)) continue;
      for (var s = -1; s <= 1; s += 2) {
        var id = 'seat' + i + (s < 0 ? 'L' : 'R');
        seats.push({
          id: id,
          x: t.cx + s * 58,
          y: t.cy,
          table: t,
          side: s,
          serve: { x: t.cx + s * 100, y: t.cy },
          taken: alt[id] || null
        });
      }
    }
  }

  // Punkte, an denen gearbeitet wird
  // Vor dem Ofenmaul, also unter dem Ofen
  for (var oi = 0; oi < ovens.length; oi++) {
    ovens[oi].spot = { x: ovens[oi].x + ovens[oi].w / 2, y: ovens[oi].y + ovens[oi].h + 28 };
  }

  var spots = {
    oven:        ovens[0].spot,
    board:       { x: board.x + board.w + 28, y: board.y + board.h / 2 },
    prep:        { x: prep.x + prep.w / 2, y: prep.y - 28 },
    counter:     { x: counter.x - 28, y: counter.y + counter.h / 2 },
    counterGuest:{ x: counter.x + counter.w + 30, y: counter.y + counter.h / 2 },
    bin:         { x: bin.x + bin.w + 26, y: bin.y + bin.h / 2 },
    door:        { x: B.x + B.w + 6, y: (DOOR.y1 + DOOR.y2) / 2 },
    inside:      { x: IN.x + IN.w - 40, y: (DOOR.y1 + DOOR.y2) / 2 },
    spawn:       { x: 945, y: 292 }
  };

  // --- Kollision -----------------------------------------------------------

  var BODY = 14;   // so dick ist eine Figur für die Wegfindung

  function nearRect(x, y, r, pad) {
    pad = pad || 0;
    var rx = r.x - pad, ry = r.y - pad;
    var rw = r.w + pad * 2, rh = r.h + pad * 2;
    var nx = Math.max(rx, Math.min(x, rx + rw));
    var ny = Math.max(ry, Math.min(y, ry + rh));
    var dx = x - nx, dy = y - ny;
    return dx * dx + dy * dy < BODY * BODY;
  }

  function nearCircle(x, y, cx, cy, radius) {
    var dx = x - cx, dy = y - cy;
    return Math.sqrt(dx * dx + dy * dy) < radius + BODY;
  }

  // Steht an diesem Punkt etwas im Weg?
  function blocked(x, y) {
    // Spielfeldrand
    if (x < 14 || x > C.W - 14) return true;
    if (y < C.HUD_TOP + 10 || y > C.H - C.HUD_BOTTOM - 10) return true;

    var i;
    for (i = 0; i < walls.length; i++) if (nearRect(x, y, walls[i])) return true;
    for (i = 0; i < ovens.length; i++) {
      if (gebaut(ovens[i]) && nearRect(x, y, ovens[i])) return true;
    }
    if (nearRect(x, y, prep)) return true;
    if (nearRect(x, y, counter)) return true;
    if (nearRect(x, y, board)) return true;
    if (nearRect(x, y, bench)) return true;
    if (nearRect(x, y, bin)) return true;
    for (i = 0; i < tables.length; i++) {
      if (gebaut(tables[i]) && nearCircle(x, y, tables[i].cx, tables[i].cy, tables[i].r)) return true;
    }
    for (i = 0; i < plants.length; i++) {
      if (nearCircle(x, y, plants[i].x, plants[i].y, plants[i].r)) return true;
    }
    return false;
  }

  // --- Anklicken ------------------------------------------------------------

  function inRect(x, y, r, pad) {
    pad = pad || 0;
    return x >= r.x - pad && x <= r.x + r.w + pad &&
           y >= r.y - pad && y <= r.y + r.h + pad;
  }

  function seatAt(x, y) {
    var i;
    for (i = 0; i < seats.length; i++) {
      var dx = x - seats[i].x, dy = y - seats[i].y;
      if (dx * dx + dy * dy < 24 * 24) return seats[i];
    }
    // Klick auf den Tisch trifft den Gast, der dort sitzt
    for (i = 0; i < tables.length; i++) {
      var t = tables[i];
      if ((x - t.cx) * (x - t.cx) + (y - t.cy) * (y - t.cy) < (t.r + 6) * (t.r + 6)) {
        for (var s = 0; s < seats.length; s++) {
          if (seats[s].table === t && seats[s].taken) return seats[s];
        }
      }
    }
    return null;
  }

  function nahBei(x, y, p, r) {
    var dx = x - p.x, dy = y - p.y;
    return dx * dx + dy * dy < r * r;
  }

  function pick(x, y) {
    var i;

    // Einzelne Pizzen gehen vor: man klickt genau die an, die man meint
    var liegt = PT.oven.prepList();
    for (i = 0; i < liegt.length; i++) {
      if (nahBei(x, y, prepSlotPos(i), 17)) return { kind: 'prepPizza', index: i };
    }
    var theke = PT.customers.counterList();
    for (i = 0; i < theke.length; i++) {
      if (nahBei(x, y, counterSlotPos(i), 18)) return { kind: 'counterPizza', index: i };
    }

    for (i = 0; i < ovens.length; i++) {
      if (gebaut(ovens[i]) && inRect(x, y, ovens[i], 6)) return { kind: 'oven', index: i };
    }
    if (inRect(x, y, board, 8)) return { kind: 'board' };
    if (inRect(x, y, prep, 6)) return { kind: 'prep' };
    if (inRect(x, y, counter, 8)) return { kind: 'counter' };
    if (inRect(x, y, bin, 8)) return { kind: 'bin' };
    var seat = seatAt(x, y);
    if (seat) return { kind: 'seat', seat: seat };
    return null;
  }

  // Innenraum des Ladens - der Chef darf nur hier sein
  function insideShop(x, y) {
    return x > IN.x + 2 && x < IN.x + IN.w - 2 &&
           y > IN.y + 2 && y < IN.y + IN.h - 2;
  }

  function blockedForChef(x, y) {
    return blocked(x, y) || !insideShop(x, y);
  }

  function freeSeat() {
    for (var i = 0; i < seats.length; i++) if (!seats[i].taken) return seats[i];
    return null;
  }

  // --- Zeichnen ---------------------------------------------------------------

  function drawStreet(g) {
    var top = C.HUD_TOP, bottom = C.H - C.HUD_BOTTOM;

    // Gehweg überall draußen
    g.rect(0, top, C.W, bottom - top, col.plaza);

    // Fugen im Gehweg
    var ctx = g.ctx();
    ctx.save();
    ctx.strokeStyle = col.plazaLine;
    ctx.lineWidth = 2;
    for (var x = 780; x < STREET_X; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    for (var y = top + 40; y < bottom; y += 40) {
      ctx.beginPath();
      ctx.moveTo(772, y);
      ctx.lineTo(STREET_X, y);
      ctx.stroke();
    }
    ctx.restore();

    // Straße
    g.rect(STREET_X, top, C.W - STREET_X, bottom - top, col.street);
    ctx.save();
    ctx.strokeStyle = col.streetLine;
    ctx.lineWidth = 4;
    ctx.setLineDash([22, 18]);
    ctx.beginPath();
    ctx.moveTo(STREET_X + 52, top);
    ctx.lineTo(STREET_X + 52, bottom);
    ctx.stroke();
    ctx.restore();

    // Fußmatte vor der Tür
    g.rect(B.x + B.w, DOOR.y1 + 8, 34, DOOR.y2 - DOOR.y1 - 16, '#a8694a', 6);

    // Stehschild
    g.groundShadow(806, 214, 26, 7);
    g.rect(800, 138, 12, 76, '#8d8477', 4);
    g.withShadow(10, 3, function () {
      g.rect(772, 100, 68, 44, col.wall, 8);
    });
    g.text('PIZZA', 806, 114, { size: 15, weight: 800, align: 'center', color: col.gold });
    g.text('TYCOON', 806, 129, { size: 9, weight: 700, align: 'center', color: col.textDim });
  }

  function drawFloor(g) {
    var ctx = g.ctx();

    // Boden: links Küche, rechts Gastraum
    g.rect(IN.x, IN.y, KITCHEN_RIGHT - IN.x, IN.h, col.floorKitchen);
    g.rect(KITCHEN_RIGHT, IN.y, IN.x + IN.w - KITCHEN_RIGHT, IN.h, col.floorDine);

    ctx.save();
    ctx.strokeStyle = col.floorLine;
    ctx.lineWidth = 2;

    // Fliesen in der Küche
    var x, y;
    for (x = IN.x + 40; x < KITCHEN_RIGHT; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, IN.y); ctx.lineTo(x, IN.y + IN.h); ctx.stroke();
    }
    for (y = IN.y + 40; y < IN.y + IN.h; y += 40) {
      ctx.beginPath(); ctx.moveTo(IN.x, y); ctx.lineTo(KITCHEN_RIGHT, y); ctx.stroke();
    }
    // Dielen im Gastraum
    for (y = IN.y + 34; y < IN.y + IN.h; y += 34) {
      ctx.beginPath(); ctx.moveTo(KITCHEN_RIGHT, y); ctx.lineTo(IN.x + IN.w, y); ctx.stroke();
    }
    ctx.restore();

    // Schwelle in der Tür
    g.rect(IN.x + IN.w - 2, DOOR.y1, 8, DOOR.y2 - DOOR.y1, 'rgba(0,0,0,0.07)');
  }

  function drawWalls(g) {
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      g.rect(w.x, w.y, w.w, w.h, col.wall, 3);
      // heller Streifen oben auf der Wand
      g.rect(w.x + 2, w.y + 2, w.w - 4, Math.min(4, w.h - 4), col.wallTop, 2);
    }
  }

  // Bogen mit flachem Boden - das Ofenmaul
  function pathArch(ctx, x, y, w, h) {
    var r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  // Gemauerter Holzofen von vorne. hot = es liegt eine Pizza drin, nur dann
  // brennt das Feuer. Von hinten nach vorne: Schriftzug auf der Krone,
  // Timer-Leiste (zeichnet oven.js), Steinbogen, Feuer ganz vorne im Maul.
  function drawOven(g, oven, hot, glow) {
    var ctx = g.ctx();
    var cx = oven.x + oven.w / 2;
    var unten = oven.y + oven.h;

    g.groundShadow(cx, unten + 4, oven.w / 2, 8);

    // warmer Schein auf dem Boden davor
    if (hot) {
      ctx.save();
      ctx.globalAlpha = 0.15 + 0.07 * glow;
      ctx.beginPath();
      ctx.ellipse(cx, unten + 18, oven.w / 2 + 10, 24, 0, 0, Math.PI * 2);
      ctx.fillStyle = col.ovenHot;
      ctx.fill();
      ctx.restore();
    }

    // Korpus
    g.rect(oven.x, oven.y, oven.w, oven.h, col.oven, 12);

    // Mauerwerk: Fugen links und rechts vom Bogen
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.lineWidth = 2;
    var fugen = [oven.y + 48, oven.y + 64, oven.y + 80];
    for (var f = 0; f < fugen.length; f++) {
      ctx.beginPath();
      ctx.moveTo(oven.x + 4, fugen[f]);
      ctx.lineTo(cx - 32, fugen[f]);
      ctx.moveTo(cx + 32, fugen[f]);
      ctx.lineTo(oven.x + oven.w - 4, fugen[f]);
      ctx.stroke();
    }
    // kurze Stoßfugen, versetzt
    for (var q = 0; q < 2; q++) {
      var qy = oven.y + 48 + q * 16;
      ctx.beginPath();
      ctx.moveTo(oven.x + 16 + q * 8, qy);
      ctx.lineTo(oven.x + 16 + q * 8, qy + 16);
      ctx.moveTo(oven.x + oven.w - 16 - q * 8, qy);
      ctx.lineTo(oven.x + oven.w - 16 - q * 8, qy + 16);
      ctx.stroke();
    }
    ctx.restore();

    // Krone oben, dort steht die Beschriftung
    g.rect(oven.x + 5, oven.y + 4, oven.w - 10, 17, '#b2604b', 7);
    g.rect(oven.x + 7, oven.y + 6, oven.w - 14, 3, 'rgba(255,255,255,0.14)', 2);

    // Steinbogen mit dunklem Maul
    ctx.save();
    pathArch(ctx, cx - 34, oven.y + 38, 68, oven.h - 38);
    ctx.fillStyle = '#e2c9a6';
    ctx.fill();
    pathArch(ctx, cx - 26, oven.y + 45, 52, oven.h - 45);
    ctx.fillStyle = hot ? '#2a1410' : '#241a16';
    ctx.fill();
    ctx.restore();

    if (hot) {
      // Feuer ganz vorne im Maul, Zungen schlagen nach hinten in den Ofen
      var basis = unten - 7;

      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#7d2b10';
      ctx.beginPath();
      ctx.ellipse(cx, basis + 2, 19, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      var flammen = [[-13, 12, 0.6], [1, 18, 1], [13, 13, 0.8]];
      for (var i = 0; i < flammen.length; i++) {
        var fx = cx + flammen[i][0];
        var laenge = flammen[i][1] + glow * 5 * flammen[i][2];

        ctx.fillStyle = col.ovenHot;
        ctx.beginPath();
        ctx.moveTo(fx - 6, basis);
        ctx.quadraticCurveTo(fx - 6, basis - laenge, fx, basis - laenge - 4);
        ctx.quadraticCurveTo(fx + 6, basis - laenge, fx + 6, basis);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.moveTo(fx - 2.5, basis);
        ctx.quadraticCurveTo(fx - 2.5, basis - laenge * 0.6, fx, basis - laenge * 0.6 - 2);
        ctx.quadraticCurveTo(fx + 2.5, basis - laenge * 0.6, fx + 2.5, basis);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Füße
    g.rect(oven.x + 6, unten - 5, 16, 7, 'rgba(0,0,0,0.25)', 3);
    g.rect(oven.x + oven.w - 22, unten - 5, 16, 7, 'rgba(0,0,0,0.25)', 3);

    // Beschriftung auf der Krone. Backt etwas, schreibt oven.js das Ergebnis.
    if (!hot) {
      g.text('OFEN', cx, oven.y + 7, {
        size: 11, weight: 800, align: 'center', color: 'rgba(255,255,255,0.8)'
      });
    }
  }

  // Noch nicht gebaut: blasser Umriss, damit man sieht, was hier hinkommt.
  // text kommt als zwei Zeilen, damit nichts über den Rahmen hinausragt.
  function drawPlatzhalter(g, r, zeile1, zeile2) {
    var ctx = g.ctx();
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = 'rgba(90,105,120,0.55)';
    ctx.lineWidth = 2;
    g.pathRound(r.x, r.y, r.w, r.h, 12);
    ctx.stroke();
    ctx.restore();
    g.text(zeile1, r.x + r.w / 2, r.y + r.h / 2 - 14,
           { size: 11, weight: 700, align: 'center', color: 'rgba(90,105,120,0.8)' });
    g.text(zeile2, r.x + r.w / 2, r.y + r.h / 2 + 1,
           { size: 11, weight: 700, align: 'center', color: 'rgba(90,105,120,0.8)' });
  }

  function drawPrep(g) {
    g.groundShadow(prep.x + prep.w / 2, prep.y + prep.h + 4, prep.w / 2, 8);
    g.rect(prep.x, prep.y, prep.w, prep.h, col.prep, 12);
    g.rect(prep.x + 6, prep.y + 18, prep.w - 12, prep.h - 26, col.prepTop, 8);
    g.text('BELEGEN', prep.x + prep.w / 2, prep.y + 4, {
      size: 10, weight: 800, align: 'center', color: '#7c8792'
    });
  }

  // Plätze für die fertigen Pizzen auf der Theke
  function counterSlotPos(i) {
    return { x: counter.x + counter.w / 2, y: counter.y + 30 + i * 46 };
  }

  // Plätze für die belegten Pizzen auf der Arbeitsfläche
  function prepSlotPos(i) {
    return { x: prep.x + 22 + i * 30, y: prep.y + 40 };
  }

  // Treteimer: Korpus, Rand, Deckel mit Spalt - und ein Stück Pizza,
  // das oben herausschaut, damit klar ist, wofür er da ist.
  function drawBin(g) {
    var cx = bin.x + bin.w / 2;

    g.groundShadow(cx, bin.y + bin.h, bin.w / 2 - 1, 6);

    // Korpus, unten etwas schmaler
    g.rect(bin.x + 4, bin.y + 14, bin.w - 8, bin.h - 14, col.bin, 8);
    g.rect(bin.x + 7, bin.y + 18, 7, bin.h - 24, 'rgba(255,255,255,0.10)', 4);

    // Rand und Deckel
    g.rect(bin.x, bin.y + 8, bin.w, 9, col.binLid, 4);
    g.rect(bin.x + 2, bin.y + 4, bin.w - 4, 6, col.bin, 3);
    g.rect(cx - 8, bin.y + 1, 16, 4, col.binLid, 2);

    // Pizzarest, der schräg aus dem Deckel schaut
    var ctx = g.ctx();
    ctx.save();
    ctx.translate(bin.x + bin.w - 7, bin.y + 7);
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(16, 5);
    ctx.lineTo(2, 12);
    ctx.closePath();
    ctx.fillStyle = '#e7d3ab';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 3);
    ctx.lineTo(12, 6);
    ctx.lineTo(4, 9);
    ctx.closePath();
    ctx.fillStyle = '#c0632f';
    ctx.fill();
    ctx.restore();
  }

  function drawCounter(g) {
    g.groundShadow(counter.x + counter.w / 2, counter.y + counter.h + 4, counter.w / 2 + 8, 8);
    g.rect(counter.x, counter.y, counter.w, counter.h, col.counter, 12);
    g.rect(counter.x + 4, counter.y + 4, counter.w - 8, counter.h - 8, col.counterTop, 9);

    // Kasse am oberen Ende, zum Gastraum hin
    g.rect(counter.x + 7, counter.y + 10, counter.w - 14, 26, '#46525e', 6);
    g.rect(counter.x + 11, counter.y + 15, counter.w - 22, 9, '#9fb4c2', 3);

    g.text('KASSE', counter.x + counter.w / 2, counter.y + counter.h - 26, {
      size: 9, weight: 800, align: 'center', color: 'rgba(80,50,20,0.55)'
    });
  }

  function drawTables(g) {
    var i, t;

    // freie Stellplätze zuerst, damit sie hinter allem liegen
    for (i = 0; i < tables.length; i++) {
      t = tables[i];
      if (gebaut(t)) continue;
      var ctx = g.ctx();
      ctx.save();
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = 'rgba(140,110,80,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.cx, t.cy, t.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      g.text('Platz für', t.cx, t.cy - 12,
             { size: 10, weight: 600, align: 'center', color: 'rgba(120,95,70,0.75)' });
      g.text('einen Tisch', t.cx, t.cy + 1,
             { size: 10, weight: 600, align: 'center', color: 'rgba(120,95,70,0.75)' });
    }

    for (i = 0; i < tables.length; i++) {
      t = tables[i];
      if (!gebaut(t)) continue;
      g.groundShadow(t.cx, t.cy + t.r - 4, t.r + 2, 9);
      g.circle(t.cx, t.cy, t.r, col.table);
      g.circle(t.cx, t.cy, t.r - 6, col.tableTop);
    }
    for (var s = 0; s < seats.length; s++) {
      var seat = seats[s];
      g.rect(seat.x - 13, seat.y - 13, 26, 26, col.chair, 8);
      g.rect(seat.x - 9, seat.y - 9, 18, 18, '#9c6a3e', 6);
    }
  }

  // Türrahmen, damit der Eingang klar zu erkennen ist
  function drawDoor(g) {
    var x = B.x + B.w - WALL;
    g.rect(x, DOOR.y1 - 10, WALL, 12, col.wallTop, 3);
    g.rect(x, DOOR.y2 - 2, WALL, 12, col.wallTop, 3);
    g.rect(x + 3, DOOR.y1 + 2, WALL - 6, DOOR.y2 - DOOR.y1 - 4, 'rgba(255,255,255,0.35)', 4);

    g.text('EINGANG', x - 6, (DOOR.y1 + DOOR.y2) / 2 - 7, {
      size: 9, weight: 800, align: 'right', color: 'rgba(60,70,80,0.5)'
    });
  }

  // Bautafel an der Küchenwand, längs zur Wand: hier kauft man die Ausbauten
  function drawBoard(g) {
    var cx = board.x + board.w / 2;

    g.groundShadow(cx, board.y + board.h + 2, board.w / 2 - 2, 5);
    g.rect(board.x, board.y, board.w, board.h, '#8a6a4a', 6);
    g.rect(board.x + 4, board.y + 4, board.w - 8, board.h - 20, '#d9cdb4', 4);

    // Zettel untereinander, jeder mit seiner Pinnnadel
    var farben = [col.bad, col.good, col.gold];
    for (var i = 0; i < 3; i++) {
      var zy = board.y + 11 + i * 23;
      g.rect(cx - 11, zy, 22, 17, '#fdfaf4', 2);
      g.circle(cx, zy, 2.5, farben[i]);
    }

    g.text('AUSBAU', cx, board.y + board.h - 13,
           { size: 8, weight: 800, align: 'center', color: 'rgba(60,70,80,0.8)' });
  }

  function drawOutdoor(g) {
    // Bank
    g.groundShadow(bench.x + bench.w / 2, bench.y + bench.h + 2, bench.w / 2, 6);
    g.rect(bench.x, bench.y, bench.w, bench.h, '#8a6a4a', 7);
    g.rect(bench.x + 5, bench.y + 4, bench.w - 10, 7, '#a98258', 4);

    // Laterne, unterhalb vom Schild
    g.groundShadow(830, 322, 12, 5);
    g.rect(826, 246, 8, 76, '#5c6670', 4);
    g.rect(816, 230, 28, 20, '#424c57', 6);
    g.circle(830, 240, 6, '#f7e3a1');
  }

  function drawPlants(g) {
    for (var i = 0; i < plants.length; i++) {
      var p = plants[i];
      g.groundShadow(p.x, p.y + p.r, p.r, 6);
      g.rect(p.x - 13, p.y + 2, 26, 20, '#b06a44', 6);
      g.circle(p.x, p.y - 4, p.r, col.plant);
      g.circle(p.x - 7, p.y - 12, 9, '#4cb87c');
      g.circle(p.x + 8, p.y - 9, 8, '#358d5d');
    }
  }

  // Alles Unbewegliche. Welcher Ofen brennt, fragt es direkt beim Ofen nach.
  function draw(g) {
    drawStreet(g);

    g.withShadow(26, 10, function () {
      g.rect(B.x, B.y, B.w, B.h, col.wall, 6);
    });

    drawFloor(g);
    drawWalls(g);
    drawDoor(g);
    drawOutdoor(g);
    drawBoard(g);

    for (var i = 0; i < ovens.length; i++) {
      if (gebaut(ovens[i])) {
        drawOven(g, ovens[i], !!PT.oven.pizzaIn(i), PT.oven.state.glow);
      } else {
        drawPlatzhalter(g, ovens[i], 'Platz für', 'einen Ofen');
      }
    }

    drawPrep(g);
    drawBin(g);
    drawCounter(g);
    drawTables(g);
    drawPlants(g);
  }

  return {
    B: B, IN: IN, DOOR: DOOR, WALL: WALL,
    oven: oven, ovens: ovens, board: board,
    prep: prep, counter: counter, bin: bin,
    gebaut: gebaut,
    rebuild: rebuild,
    prepSlotPos: prepSlotPos,
    counterSlotPos: counterSlotPos,
    insideShop: insideShop,
    blockedForChef: blockedForChef,
    tables: tables, seats: seats, spots: spots,
    blocked: blocked,
    pick: pick,
    seatAt: seatAt,
    freeSeat: freeSeat,
    draw: draw
  };
})();
