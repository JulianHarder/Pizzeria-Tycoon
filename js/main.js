/* main.js - Spielschleife, Klicks und die Aktionen an den Stationen. */

(function () {
  var C = PT.config;
  var g = null;

  var acc = 0, last = 0;

  // Aufgaben: der Chef macht den laufenden Weg fertig, weitere Klicks reihen
  // sich dahinter ein, statt ihn mitten im Schritt abzubrechen.
  var laufend = null;
  var warteschlange = [];
  var MAX_WARTEN = 3;

  function fuehreAus(aufgabe) {
    laufend = aufgabe;
    PT.chef.goTo(aufgabe.x, aufgabe.y, function () {
      var msg = aufgabe.fn ? aufgabe.fn() : null;
      laufend = null;
      if (msg) PT.ui.setHint(msg);
      naechsteAufgabe();
    }, aufgabe.face);
  }

  function naechsteAufgabe() {
    if (!laufend && warteschlange.length) fuehreAus(warteschlange.shift());
  }

  function plane(aufgabe) {
    if (!laufend) {
      fuehreAus(aufgabe);
      return;
    }
    if (warteschlange.length >= MAX_WARTEN) {
      PT.ui.setHint('Der Chef hat schon genug zu tun');
      return;
    }
    warteschlange.push(aufgabe);
    PT.ui.setHint(aufgabe.label ? aufgabe.label + ' - kommt als Nächstes'
                                : 'Kommt als Nächstes');
  }

  function alleAufgabenAbbrechen() {
    laufend = null;
    warteschlange.length = 0;
  }

  // --- Aktionen ---------------------------------------------------------------

  // Belegen legt die Pizza auf die Arbeitsfläche. Dort können mehrere
  // nebeneinander liegen, von dort nimmt man sie mit zum Ofen.
  function belegen(key) {
    var rec = C.recipes[key];
    if (PT.economy.state.money < rec.zutaten) {
      return 'Zu wenig Geld für die Zutaten (' + PT.economy.format(rec.zutaten) + ')';
    }
    var msg = PT.oven.prepPut(key);
    if (!msg) return 'Auf der Arbeitsfläche ist kein Platz mehr';
    PT.economy.spend(rec.zutaten);
    return msg + '  -' + PT.economy.format(rec.zutaten);
  }

  function vonArbeitsflaecheNehmen(index) {
    if (!PT.chef.hasHandsFree()) return 'Du hast schon eine Pizza in der Hand';
    var pizza = PT.oven.prepTake(index);
    if (!pizza) return 'Da liegt nichts';
    PT.chef.carry(pizza);
    return C.recipes[pizza.recipe].name + ' genommen';
  }

  function aufArbeitsflaecheAblegen() {
    var p = PT.chef.state.carry;
    if (!p) return 'Du trägst keine Pizza';
    if (p.grade && p.grade !== 'roh') return 'Fertige Pizzen gehören auf die Theke';
    var msg = PT.oven.prepReturn(p);
    if (!msg) return 'Auf der Arbeitsfläche ist kein Platz mehr';
    PT.chef.takeCarried();
    return msg;
  }

  function wegwerfen() {
    if (PT.chef.hasHandsFree()) return 'Du trägst keine Pizza';
    var p = PT.chef.takeCarried();
    return C.recipes[p.recipe].name + ' weggeworfen' +
           (p.grade === 'verbrannt' ? ' - war ja auch verbrannt' : '');
  }

  function ofenAktion(index) {
    if (PT.oven.pizzaIn(index)) {
      if (!PT.chef.hasHandsFree()) return 'Hände voll - erst die Pizza ablegen';
      var fertig = PT.oven.removePizza(index);
      PT.chef.carry(fertig);
      return C.recipes[fertig.recipe].name + ' ist ' + fertig.grade;
    }
    if (PT.chef.hasHandsFree()) return 'Erst an der Arbeitsfläche belegen';
    var hand = PT.chef.state.carry;
    if (hand.grade && hand.grade !== 'roh') return 'Die Pizza ist schon fertig gebacken';
    return PT.oven.insert(PT.chef.takeCarried(), index);
  }

  function thekeAktion() {
    if (!PT.chef.hasHandsFree()) {
      var p = PT.chef.state.carry;
      if (!p.grade) return 'Die rohe Pizza gehört in den Ofen';
      var msg = PT.customers.counterPut(p);
      if (!msg) return 'Auf der Theke ist kein Platz mehr';
      PT.chef.takeCarried();
      return msg;
    }
    var liste = PT.customers.counterList();
    if (!liste.length) return 'Die Theke ist leer';
    var pizza = PT.customers.counterTake(0);
    PT.chef.carry(pizza);
    return C.recipes[pizza.recipe].name + ' genommen';
  }

  function servieren(seat) {
    var gast = PT.customers.guestOfSeat(seat);
    if (!gast) return 'Da sitzt niemand';
    if (PT.chef.hasHandsFree()) return 'Du trägst keine Pizza';
    var p = PT.chef.state.carry;
    if (!p.grade) return 'Die Pizza ist noch roh';
    if (gast.state !== 'wartet') return gast.name + ' wartet gerade nicht';
    return PT.customers.serve(gast, PT.chef.takeCarried());
  }

  // --- Auswahlfenster -----------------------------------------------------------

  function mitWeg(spot, face, fn, label) {
    return function () {
      plane({ x: spot.x, y: spot.y, face: face, fn: fn, label: label });
    };
  }

  // --- Auswahlfenster je Station --------------------------------------------

  function menuFor(pick, x, y) {
    var s = PT.shop.spots;

    if (pick.kind === 'prep' || pick.kind === 'prepPizza') {
      var items = [];
      var liegt = PT.oven.prepList();
      var platz = liegt.length < PT.upgrades.prepSlots();
      var hand = PT.chef.state.carry;
      var kannAblegen = !!hand && (!hand.grade || hand.grade === 'roh') && platz;

      // obere Reihe: neu belegen
      for (var i = 0; i < C.recipeOrder.length; i++) {
        (function (key) {
          items.push({
            row: 0,
            label: C.recipes[key].name + ' belegen',
            icon: { kind: 'pizza', recipe: key, badge: 'plus' },
            enabled: platz,
            run: mitWeg(s.prep, PT.shop.prep, function () { return belegen(key); },
                        C.recipes[key].name + ' belegen')
          });
        })(C.recipeOrder[i]);
      }

      // untere Reihe: die Plätze auf der Arbeitsfläche, so wie sie dort liegen
      var ablegenVergeben = false;
      for (var k = 0; k < PT.upgrades.prepSlots(); k++) {
        if (k < liegt.length) {
          (function (index) {
            items.push({
              row: 1,
              label: C.recipes[liegt[index].recipe].name + ' nehmen',
              icon: { kind: 'pizza', recipe: liegt[index].recipe, grade: 'roh', badge: 'hoch' },
              enabled: PT.chef.hasHandsFree(),
              run: mitWeg(s.prep, PT.shop.prep, function () {
                return vonArbeitsflaecheNehmen(index);
              }, 'Pizza nehmen')
            });
          })(k);
        } else if (kannAblegen && !ablegenVergeben) {
          ablegenVergeben = true;
          items.push({
            row: 1,
            label: C.recipes[hand.recipe].name + ' hier ablegen',
            icon: { kind: 'slot', badge: 'runter' },
            run: mitWeg(s.prep, PT.shop.prep, aufArbeitsflaecheAblegen, 'Pizza ablegen')
          });
        } else {
          items.push({
            row: 1, label: 'Freier Platz', icon: { kind: 'slot' },
            enabled: false, run: function () { return null; }
          });
        }
      }

      return {
        title: 'Arbeitsfläche ' + liegt.length + '/' + PT.upgrades.prepSlots(),
        items: items
      };
    }

    if (pick.kind === 'bin') {
      return { title: 'Mülleimer', items: [{
        label: 'Pizza wegwerfen',
        icon: { kind: 'trash' },
        enabled: !PT.chef.hasHandsFree(),
        run: mitWeg(s.bin, PT.shop.bin, wegwerfen, 'Pizza wegwerfen')
      }] };
    }

    if (pick.kind === 'oven') {
      var nr = pick.index || 0;
      var ofen = PT.shop.ovens[nr];
      var o = [];
      var imOfen = PT.oven.pizzaIn(nr);

      if (imOfen) {
        o.push({
          label: 'Herausholen (' + PT.oven.gradeOf(imOfen) + ')',
          icon: { kind: 'pizza', recipe: imOfen.recipe, grade: PT.oven.gradeOf(imOfen), badge: 'hoch' },
          run: mitWeg(ofen.spot, ofen, function () { return ofenAktion(nr); }, 'Pizza herausholen')
        });
      } else {
        var h = PT.chef.state.carry;
        var kannRein = !!h && (!h.grade || h.grade === 'roh');
        o.push({
          label: kannRein ? C.recipes[h.recipe].name + ' einschieben'
                          : 'Erst eine rohe Pizza holen',
          icon: kannRein ? { kind: 'pizza', recipe: h.recipe, grade: 'roh', badge: 'runter' }
                         : { kind: 'slot', badge: 'runter' },
          enabled: kannRein,
          run: mitWeg(ofen.spot, ofen, function () { return ofenAktion(nr); }, 'Pizza einschieben')
        });
      }
      return { title: PT.oven.describe(nr), items: o };
    }

    if (pick.kind === 'board') {
      var aus = [];
      var liste = PT.upgrades.liste();
      for (var u = 0; u < liste.length; u++) {
        (function (def) {
          var fertig = PT.upgrades.hat(def.id);
          aus.push({
            label: fertig ? def.name + ' - steht schon'
                          : def.name + ' - ' + PT.economy.format(def.preis),
            sub: fertig ? null : def.text,
            icon: { kind: def.icon, badge: fertig ? 'haken' : 'plus',
                    badgeColor: fertig ? C.colors.good : C.colors.chefAccent },
            enabled: !fertig && PT.economy.state.money >= def.preis,
            run: mitWeg(s.board, PT.shop.board, function () {
              return PT.upgrades.kaufen(def.id);
            }, def.name)
          });
        })(liste[u]);
      }
      return { title: 'Ausbau - ' + PT.economy.format(PT.economy.state.money), items: aus };
    }

    if (pick.kind === 'counter' || pick.kind === 'counterPizza') {
      var t = [];
      var hand2 = PT.chef.state.carry;
      var theke = PT.customers.counterList();
      var kannAbstellen = !!hand2 && !!hand2.grade && hand2.grade !== 'roh' &&
                          theke.length < C.customers.counterSlots;
      var abstellenVergeben = false;

      for (var n = 0; n < C.customers.counterSlots; n++) {
        if (n < theke.length) {
          (function (index) {
            var pz = theke[index];
            t.push({
              label: C.recipes[pz.recipe].name + ' (' + pz.grade + ') nehmen',
              icon: { kind: 'pizza', recipe: pz.recipe, grade: pz.grade, badge: 'hoch' },
              enabled: PT.chef.hasHandsFree(),
              run: mitWeg(s.counter, PT.shop.counter, function () {
                var pizza = PT.customers.counterTake(index);
                if (!pizza) return 'Die Pizza ist weg';
                PT.chef.carry(pizza);
                return C.recipes[pizza.recipe].name + ' genommen';
              }, 'Pizza von der Theke')
            });
          })(n);
        } else if (kannAbstellen && !abstellenVergeben) {
          abstellenVergeben = true;
          t.push({
            label: C.recipes[hand2.recipe].name + ' hier abstellen',
            icon: { kind: 'slot', badge: 'runter' },
            run: mitWeg(s.counter, PT.shop.counter, thekeAktion, 'Pizza abstellen')
          });
        } else {
          t.push({
            label: 'Freier Platz', icon: { kind: 'slot' },
            enabled: false, run: function () { return null; }
          });
        }
      }
      return { title: 'Theke ' + theke.length + '/' + C.customers.counterSlots, items: t };
    }

    if (pick.kind === 'seat') {
      return gastMenu(PT.customers.guestOfSeat(pick.seat));
    }
    return null;
  }

  function gastMenu(gast) {
    if (!gast || !gast.seat) return null;
    var hand = PT.chef.state.carry;
    var seat = gast.seat;
    var passt = !!hand && hand.recipe === gast.order;

    return {
      title: PT.customers.describe(gast),
      items: [
        {
          label: 'Wunsch: ' + C.recipes[gast.order].name,
          icon: { kind: 'pizza', recipe: gast.order },
          enabled: false,
          run: function () { return null; }
        },
        {
          label: hand
            ? C.recipes[hand.recipe].name + ' servieren' + (passt ? '' : ' - falsche Sorte!')
            : 'Du trägst keine Pizza',
          icon: hand
            ? { kind: 'pizza', recipe: hand.recipe, grade: hand.grade, badge: 'rechts',
                badgeColor: passt ? C.colors.good : C.colors.warn }
            : { kind: 'slot', badge: 'rechts' },
          enabled: gast.state === 'wartet' && !!hand && !!hand.grade,
          run: mitWeg(seat.serve, seat, function () { return servieren(seat); }, 'Servieren')
        }
      ]
    };
  }

  function oeffneMenu(x, y) {
    // Gäste zuerst: die ganze Figur ist anklickbar, nicht nur der Stuhl
    var gast = PT.customers.guestAt(x, y);
    if (gast) {
      if (gastMenu(gast)) {
        PT.ui.openMenu(gast.x, gast.y - 18, function () { return gastMenu(gast); });
        return true;
      }
      PT.ui.setHint(PT.customers.describe(gast));
      return true;
    }

    var pick = PT.shop.pick(x, y);
    if (!pick) return false;
    if (!menuFor(pick, x, y)) return false;

    var ankerX = x, ankerY = y;
    if (pick.kind === 'seat') { ankerX = pick.seat.x; ankerY = pick.seat.y; }

    // Bauplan statt fertiger Liste: so gehen die Kacheln mit dem Spielstand mit
    PT.ui.openMenu(ankerX, ankerY, function () { return menuFor(pick, ankerX, ankerY); });
    return true;
  }

  function handlePointer() {
    if (!PT.input.pointer.clicked) return;
    var x = PT.input.pointer.x, y = PT.input.pointer.y;

    if (PT.ui.isMenuOpen()) {
      var r = PT.ui.menuClick(g, x, y);
      if (r.inside) {
        // Fenster bleibt offen und zeigt gleich den naechsten sinnvollen Schritt
        if (r.item) r.item.run();
        return;
      }
      // Klick daneben: Fenster zu, der Klick zählt trotzdem weiter
      PT.ui.closeMenu();
    }

    if (PT.ui.helpHit(x, y)) { PT.tutorial.oeffnen(); return; }
    if (PT.ui.overHud(x, y)) return;
    if (oeffneMenu(x, y)) return;

    if (!PT.shop.insideShop(x, y)) {
      PT.ui.setHint('Der Chef bleibt im Laden');
      return;
    }
    if (!PT.shop.blocked(x, y)) {
      plane({ x: x, y: y, face: null, fn: null, label: 'Hingehen' });
    }
  }

  // Station in Reichweite des Chefs, für die Tastatur
  function stationInReichweite() {
    var s = PT.shop.spots;
    var cx = PT.chef.state.x, cy = PT.chef.state.y;
    var kandidaten = [
      { kind: 'prep', p: s.prep },
      { kind: 'counter', p: s.counter },
      { kind: 'bin', p: s.bin }
    ];
    for (var oi = 0; oi < PT.oven.anzahl(); oi++) {
      kandidaten.push({ kind: 'oven', index: oi, p: PT.shop.ovens[oi].spot });
    }
    for (var i = 0; i < PT.shop.seats.length; i++) {
      if (PT.shop.seats[i].taken) {
        kandidaten.push({ kind: 'seat', seat: PT.shop.seats[i], p: PT.shop.seats[i].serve });
      }
    }
    var best = null, bestD = 80;
    for (var k = 0; k < kandidaten.length; k++) {
      var d = Math.sqrt(Math.pow(kandidaten[k].p.x - cx, 2) + Math.pow(kandidaten[k].p.y - cy, 2));
      if (d < bestD) { bestD = d; best = kandidaten[k]; }
    }
    return best;
  }

  function handleKeys() {
    if (PT.input.anyPressed(['KeyE', 'Space'])) {
      var st = stationInReichweite();
      if (!st) { PT.ui.setHint('Stell dich näher an eine Station'); return; }
      if (st.kind === 'oven') PT.ui.setHint(ofenAktion(st.index));
      else if (st.kind === 'prep') {
        // Hände frei und es liegt etwas: nehmen. Sonst neu belegen.
        PT.ui.setHint(PT.chef.hasHandsFree() && PT.oven.prepList().length
          ? vonArbeitsflaecheNehmen(0)
          : belegen(PT.oven.selected()));
      }
      else if (st.kind === 'counter') PT.ui.setHint(thekeAktion());
      else if (st.kind === 'bin') PT.ui.setHint(wegwerfen());
      else if (st.kind === 'seat') PT.ui.setHint(servieren(st.seat));
    }
  }

  // --- Schleife -------------------------------------------------------------------

  function step(dt) {
    // Solange die Anleitung offen ist, ruht das Spiel komplett
    if (PT.tutorial.istOffen()) {
      PT.tutorial.update(dt, g);
      PT.input.endStep();
      return;
    }

    PT.oven.update(dt);
    PT.customers.update(dt);

    // Wer selbst läuft, übernimmt und wirft die Aufgabenliste weg
    var a = PT.input.axis();
    if ((a.x !== 0 || a.y !== 0) && (laufend || warteschlange.length)) {
      alleAufgabenAbbrechen();
    }

    PT.chef.update(dt);

    // Weg abgebrochen (zum Beispiel von Hand): dann auch nichts nachschieben
    if (laufend && !PT.chef.isWalking()) alleAufgabenAbbrechen();

    handleKeys();
    handlePointer();
    PT.ui.update(dt);
    PT.input.endStep();
  }

  // --- Zeichnen ---------------------------------------------------------------------

  function hoverMarke() {
    var p = PT.input.pointer;
    if (PT.ui.isMenuOpen() || PT.ui.overHud(p.x, p.y)) return;

    var gast = PT.customers.guestAt(p.x, p.y);
    if (gast) {
      var b = PT.customers.hitbox(gast);
      g.outline(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1, 'rgba(255,255,255,0.7)', 14, 2.5);
    }

    var pick = gast ? null : PT.shop.pick(p.x, p.y);
    if (pick) {
      if (pick.kind === 'seat') g.ring(pick.seat.x, pick.seat.y, 22, 'rgba(255,255,255,0.75)', 2.5);
      else if (pick.kind === 'oven') {
        var ho = PT.shop.ovens[pick.index || 0];
        g.outline(ho.x - 5, ho.y - 5, ho.w + 10, ho.h + 10, 'rgba(255,255,255,0.75)', 14, 2.5);
      }
      else if (pick.kind === 'board') g.outline(PT.shop.board.x - 5, PT.shop.board.y - 5, PT.shop.board.w + 10, PT.shop.board.h + 10, 'rgba(255,255,255,0.75)', 10, 2.5);
      else if (pick.kind === 'prep') g.outline(PT.shop.prep.x - 5, PT.shop.prep.y - 5, PT.shop.prep.w + 10, PT.shop.prep.h + 10, 'rgba(255,255,255,0.75)', 14, 2.5);
      else if (pick.kind === 'counter') g.outline(PT.shop.counter.x - 5, PT.shop.counter.y - 5, PT.shop.counter.w + 10, PT.shop.counter.h + 10, 'rgba(255,255,255,0.75)', 12, 2.5);
      else if (pick.kind === 'bin') g.outline(PT.shop.bin.x - 6, PT.shop.bin.y - 7, PT.shop.bin.w + 12, PT.shop.bin.h + 14, 'rgba(255,255,255,0.75)', 10, 2.5);
      else if (pick.kind === 'prepPizza') g.ring(PT.shop.prepSlotPos(pick.index).x, PT.shop.prepSlotPos(pick.index).y, 17, 'rgba(255,255,255,0.85)', 2.5);
      else if (pick.kind === 'counterPizza') g.ring(PT.shop.counterSlotPos(pick.index).x, PT.shop.counterSlotPos(pick.index).y, 18, 'rgba(255,255,255,0.85)', 2.5);
    }

    var ziel = PT.chef.target();
    if (ziel) g.ring(ziel.x, ziel.y, 10, 'rgba(242,183,5,0.9)', 2.5);

    for (var i = 0; i < warteschlange.length; i++) {
      g.ring(warteschlange[i].x, warteschlange[i].y, 8, 'rgba(242,183,5,0.4)', 2);
    }
  }

  // Zähler über dem Chef, wenn noch etwas ansteht
  function aufgabenZaehler() {
    if (!warteschlange.length) return;
    var x = PT.chef.state.x - 21;
    var y = PT.chef.state.y - 52;
    g.circle(x, y, 10, C.colors.gold);
    g.text('+' + warteschlange.length, x, y - 7,
           { size: 13, weight: 800, align: 'center', color: '#2a1d0f' });
  }

  function render() {
    g.clear();
    PT.shop.draw(g);
    PT.oven.drawPrep(g);
    hoverMarke();
    PT.customers.draw(g);
    PT.chef.draw(g);
    aufgabenZaehler();
    PT.oven.drawOverlay(g);
    PT.ui.draw(g);
    PT.tutorial.draw(g);
  }

  function frame(now) {
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;

    var n = 0;
    while (acc >= C.STEP && n < C.MAX_STEPS) {
      step(C.STEP);
      acc -= C.STEP;
      n++;
    }
    if (n === C.MAX_STEPS) acc = 0;

    render();
    requestAnimationFrame(frame);
  }

  function init() {
    var canvas = document.getElementById('game');
    PT.gfx.init(canvas);
    g = PT.gfx;

    PT.input.init(canvas);
    PT.upgrades.init();
    PT.shop.rebuild();
    PT.nav.build(PT.shop.blocked);
    PT.chef.init();
    PT.economy.init();
    PT.customers.init();

    PT.tutorial.oeffnen();

    // Das Vollbild muss im Ereignis selbst angefordert werden, nicht erst in
    // der Spielschleife - sonst lehnt der Browser es ab. Der Knopf liegt in
    // der Kopfzeile, die Schleife lässt Klicks dort ohnehin liegen.
    canvas.addEventListener('pointerdown', function (e) {
      var p = PT.gfx.toLogical(e.clientX, e.clientY);
      if (PT.ui.fullscreenHit(p.x, p.y)) PT.ui.vollbildUmschalten();
    });

    window.addEventListener('resize', function () { PT.gfx.resize(); });
    document.addEventListener('fullscreenchange', function () { PT.gfx.resize(); });
    document.addEventListener('webkitfullscreenchange', function () { PT.gfx.resize(); });

    last = performance.now();
    requestAnimationFrame(frame);
  }

  window.addEventListener('load', init);
})();
