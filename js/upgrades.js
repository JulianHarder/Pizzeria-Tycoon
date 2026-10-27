/* upgrades.js - was man an der Bautafel kaufen kann.
 *
 * Hier steht nur, was gekauft ist und was das für die anderen Teile bedeutet.
 * Gezeichnet wird in shop.js, bedient wird es über das Menü in main.js.
 */

PT.upgrades = (function () {
  var C = PT.config;

  var gekauft = {};

  function init() {
    gekauft = {};
  }

  function hat(id) { return gekauft[id] === true; }

  function definition(id) {
    for (var i = 0; i < C.upgrades.length; i++) {
      if (C.upgrades[i].id === id) return C.upgrades[i];
    }
    return null;
  }

  function kaufbar(id) {
    return !hat(id) && PT.economy.state.money >= definition(id).preis;
  }

  // Kauft den Ausbau und gibt die Meldung zurück
  function kaufen(id) {
    var def = definition(id);
    if (!def) return null;
    if (hat(id)) return def.name + ' ist schon gebaut';
    if (PT.economy.state.money < def.preis) {
      return 'Dafür fehlt Geld (' + PT.economy.format(def.preis) + ')';
    }

    PT.economy.spend(def.preis);
    gekauft[id] = true;

    // Grundriss und Wege ändern sich, also beides neu aufbauen
    PT.shop.rebuild();
    PT.nav.build(PT.shop.blocked);
    PT.chef.befreien();

    // Neuer Tisch: gleich kommt jemand, damit man es merkt
    if (id === 'tisch3' || id === 'tisch4') PT.customers.gastBald();

    return def.name + ' gebaut (-' + PT.economy.format(def.preis) + ')';
  }

  // --- was die anderen Teile wissen wollen ---------------------------------

  function prepSlots() {
    return C.oven.prepSlots + (hat('flaeche') ? 1 : 0);
  }

  function ofenAnzahl() {
    return hat('ofen2') ? 2 : 1;
  }

  // Schwellen auf dem Backbalken
  function schwellen() {
    if (!hat('ofenGut')) {
      return { gut: C.oven.gut, perfekt: C.oven.perfekt, verbrannt: C.oven.verbrannt };
    }
    return {
      gut: C.oven.gut,
      perfekt: C.oven.besser.perfekt,
      verbrannt: C.oven.besser.verbrannt
    };
  }

  function tischeGebaut() {
    return 2 + (hat('tisch3') ? 1 : 0) + (hat('tisch4') ? 1 : 0);
  }

  return {
    init: init,
    hat: hat,
    definition: definition,
    kaufbar: kaufbar,
    kaufen: kaufen,
    prepSlots: prepSlots,
    ofenAnzahl: ofenAnzahl,
    schwellen: schwellen,
    tischeGebaut: tischeGebaut,
    liste: function () { return C.upgrades; }
  };
})();
