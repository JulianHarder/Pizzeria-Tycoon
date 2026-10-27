/* oven.js - die Öfen, das Backen und die Karte.
 *
 * Kein Holz, keine Temperatur, kein Schalter: ein Ofen läuft immer. Sobald
 * eine Pizza drin liegt, brennt das Feuer und der Backbalken läuft - es kommt
 * nur darauf an, sie im richtigen Moment herauszuholen: roh, gut, perfekt
 * oder verbrannt.
 *
 * Es gibt zwei Backplätze. Der zweite kommt über den Ausbau dazu; die
 * Schwellen auf dem Balken hängen ebenfalls am Ausbau (besserer Ofen).
 */

PT.oven = (function () {
  var C = PT.config;
  var O = C.oven;
  var col = C.colors;

  var state = {
    slots: [{ pizza: null }, { pizza: null }],
    glow: 0            // Flackern des Feuers
  };

  var prep = [];       // belegte, rohe Pizzen auf der Arbeitsfläche
  var gewaehlt = C.recipeOrder[0];   // welche Sorte gerade belegt wird

  function selected() { return gewaehlt; }

  function select(key) {
    if (C.recipes[key]) gewaehlt = key;
    return C.recipes[gewaehlt].name + ' gewählt';
  }

  function anzahl() { return PT.upgrades.ofenAnzahl(); }

  function pizzaIn(index) {
    var s = state.slots[index];
    return s ? s.pizza : null;
  }

  function belegen(recipeKey) {
    return { recipe: recipeKey, bake: 0, time: 0, grade: null };
  }

  // --- Arbeitsfläche --------------------------------------------------------

  function prepPut(recipeKey) {
    if (prep.length >= PT.upgrades.prepSlots()) return null;
    prep.push(belegen(recipeKey));
    return C.recipes[recipeKey].name + ' belegt (' +
           prep.length + '/' + PT.upgrades.prepSlots() + ')';
  }

  // Eine Pizza aus der Hand zurück auf die Arbeitsfläche legen
  function prepReturn(pizza) {
    if (prep.length >= PT.upgrades.prepSlots()) return null;
    prep.push(pizza);
    return C.recipes[pizza.recipe].name + ' abgelegt (' +
           prep.length + '/' + PT.upgrades.prepSlots() + ')';
  }

  function prepTake(index) {
    if (index < 0 || index >= prep.length) return null;
    return prep.splice(index, 1)[0];
  }

  function prepList() { return prep; }

  function drawPrep(g) {
    for (var i = 0; i < prep.length; i++) {
      var p = PT.shop.prepSlotPos(i);
      g.groundShadow(p.x, p.y + 11, 13, 4);
      g.pizza(p.x, p.y, 14, prep[i].recipe, 'roh');
    }
  }

  // --- Backen ----------------------------------------------------------------

  function insert(pizza, index) {
    if (pizzaIn(index)) return 'Da liegt schon eine Pizza drin';
    pizza.grade = null;              // sie backt weiter, der Balken läuft weiter
    state.slots[index].pizza = pizza;
    return C.recipes[pizza.recipe].name + ' eingeschoben';
  }

  function gradeOf(pizza) {
    var sch = PT.upgrades.schwellen();
    if (pizza.bake < sch.gut) return 'roh';
    if (pizza.bake < sch.perfekt) return 'gut';
    if (pizza.bake < sch.verbrannt) return 'perfekt';
    return 'verbrannt';
  }

  function removePizza(index) {
    var pizza = pizzaIn(index);
    if (!pizza) return null;
    state.slots[index].pizza = null;
    pizza.grade = gradeOf(pizza);
    return pizza;
  }

  function update(dt) {
    state.glow = (Math.sin(performance.now() / 420) + 1) / 2;
    for (var i = 0; i < anzahl(); i++) {
      var pizza = pizzaIn(i);
      if (!pizza) continue;
      pizza.bake = Math.min(O.ende, pizza.bake + dt / O.bakeSeconds);
      pizza.time += dt;
    }
  }

  function describe(index) {
    var pizza = pizzaIn(index);
    if (!pizza) return 'Ofen ist leer';
    return C.recipes[pizza.recipe].name + ' im Ofen: ' + gradeOf(pizza);
  }

  // Kurzfassung für die Fußzeile, bei zwei Öfen beide
  function summary() {
    if (anzahl() === 1) return describe(0);
    var teile = [];
    for (var i = 0; i < anzahl(); i++) {
      var pizza = pizzaIn(i);
      teile.push('Ofen ' + (i + 1) + ': ' + (pizza ? gradeOf(pizza) : 'leer'));
    }
    return teile.join('   ');
  }

  // Farbe für die Fußzeile: das dringendste Ergebnis gewinnt
  function summaryColor() {
    var rang = { roh: 0, gut: 1, perfekt: 2, verbrannt: 3 };
    var beste = -1;
    for (var i = 0; i < anzahl(); i++) {
      var pizza = pizzaIn(i);
      if (pizza) beste = Math.max(beste, rang[gradeOf(pizza)]);
    }
    if (beste === 3) return col.bad;
    if (beste === 2) return col.good;
    if (beste === 1) return col.warn;
    return col.textDim;
  }

  // Backbalken auf der Front jedes Ofens
  function drawOverlay(g) {
    for (var i = 0; i < anzahl(); i++) {
      var pizza = pizzaIn(i);
      if (!pizza) continue;

      // Die Leiste liegt quer auf dem Ofen, zwischen Schriftzug und Maul.
      var o = PT.shop.ovens[i];
      var x = o.x + 14;
      var y = o.y + 22;
      var w = o.w - 28;
      var h = 13;

      g.rect(x, y, w, h, 'rgba(18,22,28,0.82)', 6);

      var sch = PT.upgrades.schwellen();
      var f = pizza.bake / O.ende;
      var grade = gradeOf(pizza);
      var color = grade === 'perfekt' ? col.good
                : (grade === 'gut' ? col.warn
                : (grade === 'roh' ? '#8fa0ad' : col.bad));
      g.rect(x + 2, y + 2, Math.max(9, (w - 4) * f), h - 4, color, 4);

      var ctx = g.ctx();
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      [sch.perfekt, sch.verbrannt].forEach(function (v) {
        var mx = x + 2 + (w - 4) * (v / O.ende);
        ctx.beginPath();
        ctx.moveTo(mx, y + 1);
        ctx.lineTo(mx, y + h - 1);
        ctx.stroke();
      });
      ctx.restore();

      // Statt "OFEN" steht oben jetzt das Ergebnis, in seiner Farbe
      g.text(grade, o.x + o.w / 2, o.y + 6,
             { size: 12, weight: 800, align: 'center', color: color });
    }
  }

  return {
    state: state,
    anzahl: anzahl,
    pizzaIn: pizzaIn,
    belegen: belegen,
    selected: selected,
    select: select,
    prepPut: prepPut,
    prepReturn: prepReturn,
    prepTake: prepTake,
    prepList: prepList,
    drawPrep: drawPrep,
    insert: insert,
    removePizza: removePizza,
    gradeOf: gradeOf,
    update: update,
    describe: describe,
    summary: summary,
    summaryColor: summaryColor,
    drawOverlay: drawOverlay
  };
})();
