/* economy.js - Geld. */

PT.economy = (function () {
  var C = PT.config;

  var state = { money: C.economy.startMoney, einnahmen: 0, trinkgeld: 0, ausgaben: 0 };

  function init() {
    state.money = C.economy.startMoney;
    state.einnahmen = 0;
    state.trinkgeld = 0;
    state.ausgaben = 0;
  }

  function earn(preis, tip) {
    tip = tip || 0;
    state.money += preis + tip;
    state.einnahmen += preis;
    state.trinkgeld += tip;
  }

  // Zutaten und Ausbauten. Gibt false zurück, wenn das Geld nicht reicht.
  function spend(betrag) {
    if (state.money < betrag) return false;
    state.money -= betrag;
    state.ausgaben += betrag;
    return true;
  }

  function format(amount) {
    return amount.toFixed(2).replace('.', ',') + ' EUR';
  }

  return {
    state: state,
    init: init,
    earn: earn,
    spend: spend,
    format: format
  };
})();
