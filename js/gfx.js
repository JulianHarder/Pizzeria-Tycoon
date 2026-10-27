/* gfx.js - Leinwand und Zeichenhelfer.
 *
 * Gezeichnet wird immer in logischen 960x540 Einheiten. Die Leinwand selbst
 * ist so gross wie das Fenster (mal Pixeldichte), und eine Transformation
 * rechnet um. Dadurch ist alles - auch Schrift - bei jeder Fenstergröße
 * gestochen scharf, und der Laden passt immer komplett ins Bild.
 */

PT.gfx = (function () {
  var C = PT.config;

  var canvas = null;
  var ctx = null;
  var scale = 1;
  var dpr = 1;

  var FONT = '"Segoe UI","Helvetica Neue",Arial,"DejaVu Sans",sans-serif';

  function init(el) {
    canvas = el;
    ctx = canvas.getContext('2d');
    PT.ctx = ctx;
    resize();
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    scale = Math.min(window.innerWidth / C.W, window.innerHeight / C.H);

    var w = Math.max(1, Math.round(C.W * scale));
    var h = Math.max(1, Math.round(C.H * scale));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }

  // Bildschirmpunkt in logische Koordinaten umrechnen
  function toLogical(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) / r.width * C.W,
      y: (clientY - r.top) / r.height * C.H
    };
  }

  function clear() {
    ctx.fillStyle = C.colors.bgDark;
    ctx.fillRect(0, 0, C.W, C.H);
  }

  // --- Formen --------------------------------------------------------------

  function pathRound(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function rect(x, y, w, h, color, r) {
    pathRound(x, y, w, h, r || 0);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function outline(x, y, w, h, color, r, lineWidth) {
    pathRound(x, y, w, h, r || 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth || 2;
    ctx.stroke();
  }

  function circle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function ring(x, y, radius, color, lineWidth) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth || 2;
    ctx.stroke();
  }

  // Weicher Schatten um alles, was in fn gezeichnet wird
  function withShadow(blur, dy, fn, color) {
    ctx.save();
    ctx.shadowColor = color || C.colors.shadow;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = dy;
    fn();
    ctx.restore();
  }

  // Flacher Bodenschatten unter Figuren und Möbeln
  function groundShadow(x, y, rx, ry) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0d1117';
    ctx.fill();
    ctx.restore();
  }

  // Eine Pizza von oben. Jedes Rezept bekommt seinen eigenen Belag, damit man
  // die Sorten auf einen Blick auseinanderhält, ohne lesen zu müssen.
  var BELAG_PUNKTE = [
    [-0.40, -0.26], [0.30, -0.40], [0.42, 0.22],
    [-0.20, 0.42], [0.00, -0.02], [-0.46, 0.18]
  ];

  function belagStellen(x, y, r, indizes) {
    var out = [];
    for (var i = 0; i < indizes.length; i++) {
      var p = BELAG_PUNKTE[indizes[i]];
      out.push([x + p[0] * r, y + p[1] * r]);
    }
    return out;
  }

  function pizza(x, y, r, recipeKey, grade) {
    var verbrannt = (grade === 'verbrannt');
    var roh = (grade === 'roh' || grade === null || grade === undefined);
    var rec = C.recipes[recipeKey];

    // Teigrand
    circle(x, y, r, roh ? '#f3e6c8' : '#e8d4a8');

    if (verbrannt) {
      circle(x, y, r * 0.8, '#30261f');
      circle(x - r * 0.3, y - r * 0.2, r * 0.17, '#1d1713');
      circle(x + r * 0.28, y + r * 0.26, r * 0.14, '#1d1713');
      return;
    }

    // Soße
    circle(x, y, r * 0.8, roh ? '#d05a40' : '#c8472e');

    var belag = rec.belag || [];
    var i, stellen;

    if (belag.indexOf('kaese') >= 0) {
      stellen = belagStellen(x, y, r, [0, 2, 3]);
      for (i = 0; i < stellen.length; i++) {
        circle(stellen[i][0], stellen[i][1], Math.max(1.6, r * 0.21), '#f8e7b0');
      }
    }
    if (belag.indexOf('salami') >= 0) {
      stellen = belagStellen(x, y, r, [1, 4, 5]);
      for (i = 0; i < stellen.length; i++) {
        circle(stellen[i][0], stellen[i][1], Math.max(1.8, r * 0.23), '#a8302a');
        circle(stellen[i][0], stellen[i][1], Math.max(0.8, r * 0.09), '#c4564a');
      }
    }
    if (belag.indexOf('pilze') >= 0) {
      stellen = belagStellen(x, y, r, [1, 4, 5]);
      for (i = 0; i < stellen.length; i++) {
        circle(stellen[i][0], stellen[i][1], Math.max(1.8, r * 0.22), '#8a6a4a');
        circle(stellen[i][0], stellen[i][1] - r * 0.07, Math.max(1, r * 0.12), '#c7ab86');
      }
    }
    if (belag.indexOf('basilikum') >= 0) {
      stellen = belagStellen(x, y, r, [1, 5]);
      for (i = 0; i < stellen.length; i++) {
        circle(stellen[i][0], stellen[i][1], Math.max(1.4, r * 0.17), '#3d9a5f');
        circle(stellen[i][0] + r * 0.14, stellen[i][1] + r * 0.1, Math.max(1.2, r * 0.13), '#4cb87c');
      }
    }

    if (grade === 'roh') ring(x, y, r - 1, 'rgba(255,255,255,0.55)', 1.5);
  }

  // --- Schrift ---------------------------------------------------------------

  function font(size, weight) {
    return (weight || 400) + ' ' + size + 'px ' + FONT;
  }

  function text(str, x, y, opt) {
    opt = opt || {};
    ctx.font = font(opt.size || 14, opt.weight);
    ctx.textAlign = opt.align || 'left';
    ctx.textBaseline = opt.baseline || 'top';
    ctx.fillStyle = opt.color || C.colors.text;
    ctx.fillText(str, x, y);
  }

  function textWidth(str, size, weight) {
    ctx.font = font(size || 14, weight);
    return ctx.measureText(str).width;
  }

  // --- Anzeigen ----------------------------------------------------------------

  function bar(x, y, w, h, fill, color, bg) {
    rect(x, y, w, h, bg || 'rgba(18,22,28,0.35)', h / 2);
    var fw = Math.max(0, Math.min(1, fill)) * w;
    if (fw > 1) rect(x, y, Math.max(h, fw), h, color, h / 2);
  }

  function star(cx, cy, r, color) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = (i % 2 === 0) ? r : r * 0.45;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var px = cx + Math.cos(a) * rad;
      var py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Sterne-Reihe für Bewertungen
  function stars(x, y, value, size, colorOn, colorOff) {
    for (var i = 0; i < 5; i++) {
      star(x + i * (size * 2.2), y, size,
           i < Math.round(value) ? (colorOn || C.colors.gold) : (colorOff || 'rgba(255,255,255,0.18)'));
    }
  }

  return {
    init: init,
    resize: resize,
    toLogical: toLogical,
    clear: clear,
    ctx: function () { return ctx; },
    pathRound: pathRound,
    rect: rect,
    outline: outline,
    circle: circle,
    ring: ring,
    pizza: pizza,
    withShadow: withShadow,
    groundShadow: groundShadow,
    text: text,
    textWidth: textWidth,
    bar: bar,
    star: star,
    stars: stars
  };
})();
