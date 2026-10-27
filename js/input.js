/* input.js - Maus, Finger und Tastatur.
 *
 * Maus und Touch laufen beide über Pointer-Events, damit die Bedienung am
 * Handy dieselbe ist. Die Position kommt in logischen Koordinaten an.
 */

PT.input = (function () {
  var down = {};
  var fresh = {};

  var pointer = { x: -100, y: -100, down: false, clicked: false, touch: false };

  var blocked = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1, Tab: 1 };

  function init(canvas) {
    window.addEventListener('keydown', function (e) {
      if (blocked[e.code]) e.preventDefault();
      if (!down[e.code]) fresh[e.code] = true;
      down[e.code] = true;
    });
    window.addEventListener('keyup', function (e) { down[e.code] = false; });
    window.addEventListener('blur', function () { down = {}; fresh = {}; pointer.down = false; });

    canvas.addEventListener('pointermove', function (e) { setPointer(e); });
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      setPointer(e);
      pointer.down = true;
      pointer.clicked = true;
    });
    window.addEventListener('pointerup', function () { pointer.down = false; });
    window.addEventListener('pointercancel', function () { pointer.down = false; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  }

  function setPointer(e) {
    var p = PT.gfx.toLogical(e.clientX, e.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.touch = (e.pointerType === 'touch');
  }

  function anyDown(codes) {
    for (var i = 0; i < codes.length; i++) if (down[codes[i]]) return true;
    return false;
  }

  function wasPressed(code) { return fresh[code] === true; }

  function anyPressed(codes) {
    for (var i = 0; i < codes.length; i++) if (fresh[codes[i]]) return true;
    return false;
  }

  function axis() {
    var x = 0, y = 0;
    if (anyDown(['KeyA', 'ArrowLeft'])) x -= 1;
    if (anyDown(['KeyD', 'ArrowRight'])) x += 1;
    if (anyDown(['KeyW', 'ArrowUp'])) y -= 1;
    if (anyDown(['KeyS', 'ArrowDown'])) y += 1;
    return { x: x, y: y };
  }

  function endStep() {
    fresh = {};
    pointer.clicked = false;
  }

  return {
    init: init,
    axis: axis,
    wasPressed: wasPressed,
    anyPressed: anyPressed,
    endStep: endStep,
    pointer: pointer
  };
})();
