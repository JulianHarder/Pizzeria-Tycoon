/* customers.js - Gäste, Bewertung und die Theke.
 *
 * Ein Gast kommt von der Straße herein, sucht einen freien Stuhl, bestellt,
 * wartet, isst, zahlt an der Theke und geht wieder. Wird er zu lange nicht
 * bedient, geht er verärgert und gibt einen Stern.
 */

PT.customers = (function () {
  var C = PT.config;
  var CU = C.customers;
  var col = C.colors;

  var guests = [];
  var counter = [];          // fertige Pizzen auf der Theke
  var ratings = [];
  var spawnTimer = 0;
  var nextId = 1;

  var stats = { bedient: 0, verloren: 0 };

  function init() {
    guests = [];
    counter = [];
    ratings = [];
    spawnTimer = CU.ersterGast;
    stats = { bedient: 0, verloren: 0 };
    for (var i = 0; i < PT.shop.seats.length; i++) PT.shop.seats[i].taken = null;
  }

  // --- Laufen ---------------------------------------------------------------

  function sendTo(g, x, y, cb) {
    var p = PT.nav.findPath(g.x, g.y, x, y);
    if (!p) { if (cb) cb(g); return; }
    g.path = p;
    g.onArrive = cb || null;
  }

  function walk(g, dt) {
    var next = g.path[0];
    var dx = next.x - g.x, dy = next.y - g.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var step = CU.speed * dt;

    if (dist <= step) {
      g.x = next.x;
      g.y = next.y;
      g.path.shift();
      if (!g.path.length) {
        g.path = null;
        var cb = g.onArrive;
        g.onArrive = null;
        if (cb) cb(g);
      }
    } else {
      g.x += dx / dist * step;
      g.y += dy / dist * step;
    }
    g.bob += dt * 10;
  }

  // --- Kommen und gehen --------------------------------------------------------

  function reputation() {
    if (!ratings.length) return CU.startReputation;
    var sum = 0;
    for (var i = 0; i < ratings.length; i++) sum += ratings[i];
    return sum / ratings.length;
  }

  function record(st) {
    ratings.push(st);
    if (ratings.length > CU.memory) ratings.shift();
  }

  // Je besser der Ruf und je mehr Tische, desto dichter kommen die Gäste -
  // sonst würde ein neuer Tisch nur leer herumstehen.
  function spawnInterval() {
    var extraTische = PT.shop.seats.length / 2 - 2;
    return Math.max(CU.spawnMin,
                    CU.spawnBase
                    - reputation() * CU.spawnPerStar
                    - extraTische * CU.spawnPerTisch);
  }

  // Nach einem neuen Tisch soll man gleich merken, dass er sich lohnt
  function gastBald() {
    spawnTimer = Math.min(spawnTimer, 6);
  }

  function releaseSeat(g) {
    if (g.seat && g.seat.taken === g) g.seat.taken = null;
  }

  function leave(g) {
    releaseSeat(g);
    g.state = 'geht';
    sendTo(g, PT.shop.spots.spawn.x + 20, PT.shop.spots.spawn.y, function (x) {
      x.done = true;
    });
  }

  function spawn() {
    var seat = PT.shop.freeSeat();
    var g = {
      id: nextId++,
      name: CU.names[Math.floor(Math.random() * CU.names.length)],
      color: C.guestColors[nextId % C.guestColors.length],
      x: PT.shop.spots.spawn.x,
      y: PT.shop.spots.spawn.y,
      bob: 0,
      path: null, onArrive: null,
      state: 'kommt',
      seat: null,
      order: C.recipeOrder[Math.floor(Math.random() * C.recipeOrder.length)],
      patience: CU.patience,
      pizza: null,
      stars: 0,
      eatLeft: 0,
      payLeft: 0,
      done: false
    };
    guests.push(g);

    if (!seat) {
      stats.verloren++;
      PT.ui.setHint(g.name + ' findet keinen freien Tisch und geht wieder');
      leave(g);
      return;
    }

    seat.taken = g;
    g.seat = seat;
    sendTo(g, seat.x, seat.y, function (guest) { guest.state = 'wartet'; });
  }

  // --- Bewertung -----------------------------------------------------------------

  function rate(g, pizza) {
    var s = 5;
    var gewartet = 1 - g.patience / CU.patience;
    if (gewartet > 0.75) s -= 2;
    else if (gewartet > 0.5) s -= 1;

    if (pizza.grade === 'gut') s -= 1;
    else if (pizza.grade === 'roh') s -= 3;
    else if (pizza.grade === 'verbrannt') s -= 4;

    if (pizza.recipe !== g.order) s -= 2;

    return Math.max(1, Math.min(5, Math.round(s)));
  }

  function serve(g, pizza) {
    if (!g || g.state !== 'wartet') return 'Der Gast wartet gerade nicht';
    g.pizza = pizza;
    g.stars = rate(g, pizza);
    g.state = 'isst';
    g.eatLeft = CU.eatTime;

    var name = C.recipes[pizza.recipe].name;
    if (pizza.recipe !== g.order) {
      return name + ' serviert - ' + g.name + ' wollte ' + C.recipes[g.order].name;
    }
    return name + ' für ' + g.name + ' (' + pizza.grade + ')';
  }

  function pay(g) {
    var preis = C.recipes[g.pizza.recipe].preis;
    var tip = g.stars >= 4 ? preis * CU.tipShare * (g.stars - 3) : 0;
    PT.economy.earn(preis, tip);
    record(g.stars);
    stats.bedient++;
    PT.ui.setHint(g.name + ' zahlt ' + PT.economy.format(preis + tip), 3, g.stars);
    leave(g);
  }

  // --- Ablauf ------------------------------------------------------------------------

  function update(dt) {
    // Gäste kommen durchgehend, es gibt keine Oeffnungszeiten
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = spawnInterval();
      spawn();
    }

    for (var i = guests.length - 1; i >= 0; i--) {
      var g = guests[i];
      if (g.done) { guests.splice(i, 1); continue; }
      if (g.path) { walk(g, dt); continue; }

      if (g.state === 'wartet') {
        g.patience -= dt;
        if (g.patience <= 0) {
          g.stars = 1;
          record(1);
          PT.ui.setHint(g.name + ' ist verärgert gegangen', 3, 1);
          leave(g);
        }
      } else if (g.state === 'isst') {
        g.eatLeft -= dt;
        if (g.eatLeft <= 0) {
          releaseSeat(g);
          g.state = 'zahlt';
          var s = PT.shop.spots.counterGuest;
          sendTo(g, s.x, s.y, function (guest) { guest.payLeft = CU.payTime; });
        }
      } else if (g.state === 'zahlt') {
        g.payLeft -= dt;
        if (g.payLeft <= 0) pay(g);
      }
    }
  }

  // --- Theke ---------------------------------------------------------------------------

  function counterPut(pizza) {
    if (counter.length >= CU.counterSlots) return null;
    counter.push(pizza);
    return C.recipes[pizza.recipe].name + ' auf die Theke gestellt';
  }

  function counterTake(index) {
    if (index < 0 || index >= counter.length) return null;
    return counter.splice(index, 1)[0];
  }

  function counterList() { return counter; }

  function guestOfSeat(seat) {
    return seat ? seat.taken : null;
  }

  // Klickfläche eines Gasts: die ganze Figur mit Namensschild, Geduldsbalken
  // und Sprechblase - nicht nur der Stuhl.
  function hitbox(g) {
    var wartet = (g.state === 'wartet');
    return {
      x1: g.x - 26,
      y1: g.y - (wartet ? 64 : 56),
      x2: g.x + (wartet ? 52 : 26),
      y2: g.y + 24
    };
  }

  // Gast an diesem Punkt. Laufende Gäste zählen nicht mit, damit sie keine
  // Klicks auf den Boden abfangen.
  function guestAt(x, y) {
    var sitzend = guests.filter(function (g) {
      return g.state === 'wartet' || g.state === 'isst' || g.state === 'zahlt';
    });
    sitzend.sort(function (a, b) { return b.y - a.y; });

    for (var i = 0; i < sitzend.length; i++) {
      var b = hitbox(sitzend[i]);
      if (x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2) return sitzend[i];
    }
    return null;
  }

  function describe(g) {
    if (!g) return '';
    if (g.state === 'wartet') return g.name + ' wartet auf ' + C.recipes[g.order].name;
    if (g.state === 'isst') return g.name + ' isst';
    if (g.state === 'zahlt') return g.name + ' will zahlen';
    if (g.state === 'kommt') return g.name + ' sucht einen Platz';
    return g.name + ' geht';
  }

  // --- Zeichnen ---------------------------------------------------------------------------

  function drawGuest(gfx, g) {
    var y = g.y + (g.path ? Math.sin(g.bob) * 1.4 : 0);

    gfx.groundShadow(g.x, g.y + 2, 14, 5);
    gfx.rect(g.x - 11, y - 28, 22, 30, g.color, 10);
    gfx.circle(g.x, y - 34, 10, '#f0c9a4');
    gfx.circle(g.x, y - 40, 8, 'rgba(0,0,0,0.18)');   // Haare

    if (g.state === 'wartet') {
      // Namensschild
      var w = gfx.textWidth(g.name, 11, 700) + 14;
      gfx.rect(g.x - w / 2, y + 4, w, 15, 'rgba(22,28,36,0.85)', 7);
      gfx.text(g.name, g.x, y + 8, { size: 11, weight: 700, align: 'center', color: col.text });

      // Sprechblase mit der Bestellung
      var bx = g.x + 26, by = y - 58;
      gfx.withShadow(8, 3, function () {
        gfx.rect(bx - 22, by, 44, 40, '#fdfaf4', 12);
      });
      var ctx = gfx.ctx();
      ctx.beginPath();
      ctx.moveTo(bx - 8, by + 38);
      ctx.lineTo(bx - 2, by + 48);
      ctx.lineTo(bx + 4, by + 38);
      ctx.closePath();
      ctx.fillStyle = '#fdfaf4';
      ctx.fill();

      gfx.pizza(bx, by + 15, 12, g.order, 'gut');
      gfx.text(C.recipes[g.order].kurz, bx, by + 28, {
        size: 9, weight: 700, align: 'center', color: '#5c6670'
      });

      // Geduldsbalken
      var f = Math.max(0, g.patience / CU.patience);
      gfx.bar(g.x - 16, y - 50, 32, 6, f,
              f > 0.5 ? col.good : (f > 0.25 ? col.warn : col.bad));
    } else if (g.state === 'isst' && g.pizza) {
      gfx.pizza(g.x, y - 50, 11, g.pizza.recipe, g.pizza.grade);
      gfx.stars(g.x - 16, y - 64, g.stars, 4);
    }
  }

  function draw(gfx) {
    // Pizzen auf der Theke
    for (var i = 0; i < counter.length; i++) {
      var p = PT.shop.counterSlotPos(i);
      gfx.pizza(p.x, p.y, 14, counter[i].recipe, counter[i].grade);
    }

    // Gäste, hintere zuerst
    var sorted = guests.slice().sort(function (a, b) { return a.y - b.y; });
    for (var k = 0; k < sorted.length; k++) drawGuest(gfx, sorted[k]);
  }

  return {
    init: init,
    update: update,
    draw: draw,
    serve: serve,
    describe: describe,
    reputation: reputation,
    gastBald: gastBald,
    stats: function () { return stats; },
    counterPut: counterPut,
    counterTake: counterTake,
    counterList: counterList,
    guestOfSeat: guestOfSeat,
    guestAt: guestAt,
    hitbox: hitbox,
    list: function () { return guests; }
  };
})();
