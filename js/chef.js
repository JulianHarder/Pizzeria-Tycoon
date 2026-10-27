/* chef.js - die Spielfigur.
 *
 * Angeklickte Aufgaben erledigt der Chef nicht aus der Ferne: er läuft erst
 * hin. Mit WASD kann man ihn auch von Hand steuern, das bricht den Klickweg ab.
 */

PT.chef = (function () {
  var C = PT.config;
  var col = C.colors;

  var state = {
    x: 200, y: 260,
    dirX: 1, dirY: 0,
    moving: false,
    bob: 0,
    carry: null        // Pizza in der Hand
  };

  var path = null;
  var onArrive = null;
  var facePoint = null;

  function init() {
    state.x = PT.shop.spots.prep.x;
    state.y = PT.shop.spots.prep.y + 20;
  }

  // --- Laufen ---------------------------------------------------------------

  function goTo(x, y, cb, face) {
    var p = PT.nav.findPath(state.x, state.y, x, y);
    if (!p) {
      if (cb) cb();
      return false;
    }
    path = p;
    onArrive = cb || null;
    facePoint = face || null;
    return true;
  }

  function cancel() {
    path = null;
    onArrive = null;
    facePoint = null;
  }

  function isWalking() { return path !== null && path.length > 0; }

  function target() {
    if (!path || !path.length) return null;
    return path[path.length - 1];
  }

  function lookAt(p) {
    var dx = p.x - state.x, dy = p.y - state.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    state.dirX = dx / len;
    state.dirY = dy / len;
  }

  function arrive() {
    var cb = onArrive;
    var face = facePoint;
    path = null;
    onArrive = null;
    facePoint = null;
    if (face) lookAt(face);
    if (cb) cb();
  }

  function follow(dt) {
    var next = path[0];
    var dx = next.x - state.x, dy = next.y - state.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var step = C.chef.speed * dt;

    if (dist <= step) {
      state.x = next.x;
      state.y = next.y;
      path.shift();
      if (!path.length) arrive();
    } else {
      state.x += dx / dist * step;
      state.y += dy / dist * step;
      lookAt(next);
    }
    state.moving = true;
  }

  function update(dt) {
    var a = PT.input.axis();

    if (a.x !== 0 || a.y !== 0) {
      cancel();
      var len = Math.sqrt(a.x * a.x + a.y * a.y);
      var step = C.chef.speed * dt;
      var nx = state.x + a.x / len * step;
      var ny = state.y + a.y / len * step;
      // Der Chef bleibt im Laden, auch bei Handsteuerung
      if (!PT.shop.blockedForChef(nx, state.y)) state.x = nx;
      if (!PT.shop.blockedForChef(state.x, ny)) state.y = ny;
      state.dirX = a.x / len;
      state.dirY = a.y / len;
      state.moving = true;
    } else if (path) {
      follow(dt);
    } else {
      state.moving = false;
    }

    state.bob = state.moving ? state.bob + dt * 11 : 0;
  }

  // --- Pizza tragen -----------------------------------------------------------

  // Nach einem Ausbau kann plötzlich etwas dort stehen, wo der Chef steht.
  // Dann schiebt er sich auf den nächsten freien Fleck.
  function befreien() {
    if (!PT.shop.blockedForChef(state.x, state.y)) return;
    cancel();
    for (var r = 22; r <= 220; r += 22) {
      for (var a = 0; a < 16; a++) {
        var w = a / 16 * Math.PI * 2;
        var nx = state.x + Math.cos(w) * r;
        var ny = state.y + Math.sin(w) * r;
        if (!PT.shop.blockedForChef(nx, ny)) {
          state.x = nx;
          state.y = ny;
          return;
        }
      }
    }
  }

  function hasHandsFree() { return state.carry === null; }
  function carry(pizza) { state.carry = pizza; }
  function takeCarried() {
    var p = state.carry;
    state.carry = null;
    return p;
  }

  // --- Zeichnen ----------------------------------------------------------------

  function draw(g) {
    var x = state.x;
    var y = state.y + (state.moving ? Math.sin(state.bob) * 1.6 : 0);

    g.groundShadow(state.x, state.y + 3, 16, 6);

    // Körper mit Schürze
    g.rect(x - 13, y - 34, 26, 36, col.chef, 11);
    g.rect(x - 13, y - 14, 26, 16, col.chefAccent, 8);
    g.rect(x - 3, y - 34, 6, 22, 'rgba(0,0,0,0.06)', 3);

    // Kopf
    g.circle(x, y - 42, 11, '#f0c9a4');
    // Blickrichtung
    g.circle(x + state.dirX * 6, y - 42 + state.dirY * 4, 2.6, '#3b2a20');

    // Kochmütze
    g.rect(x - 11, y - 56, 22, 9, col.chef, 4);
    g.circle(x - 6, y - 58, 7, col.chef);
    g.circle(x + 6, y - 58, 7, col.chef);
    g.circle(x, y - 62, 8, col.chef);

    // getragene Pizza
    if (state.carry) {
      var px = x + 20, py = y - 26;
      g.groundShadow(px, py + 9, 11, 4);
      g.pizza(px, py, 11, state.carry.recipe, state.carry.grade);
    }
  }

  return {
    state: state,
    init: init,
    goTo: goTo,
    cancel: cancel,
    isWalking: isWalking,
    target: target,
    lookAt: lookAt,
    update: update,
    befreien: befreien,
    hasHandsFree: hasHandsFree,
    carry: carry,
    takeCarried: takeCarried,
    draw: draw
  };
})();
