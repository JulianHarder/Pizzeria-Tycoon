/* ui.js - Kopfzeile, Fußzeile, Meldungen und die Auswahlfenster.
 *
 * Alles wird in logischen Einheiten gezeichnet und ist dadurch bei jeder
 * Fenstergröße scharf.
 */

PT.ui = (function () {
  var C = PT.config;
  var col = C.colors;

  var hint = { text: '', time: 0, stars: 0 };
  var menu = null;
  // --- Meldungen -------------------------------------------------------------

  function ueber(x, y, w, h) {
    var m = PT.input.pointer;
    return m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
  }

  function setHint(text, seconds, stars) {
    if (!text) return;
    hint.text = text;
    hint.time = seconds || 2.6;
    hint.stars = stars || 0;
  }

  function clearHint() { hint.time = 0; }

  function update(dt) {
    if (hint.time > 0) hint.time -= dt;
    refreshMenu();
  }

  // --- Auswahlfenster ------------------------------------------------------
  //
  // Statt einer Textliste zeigt das Fenster Bild-Kacheln: eine Pizza, ein
  // freier Platz, der Ofenschalter, die Tonne. Was die Kachel macht, sieht man
  // am Bild und am kleinen Zeichen in der Ecke; die Beschriftung steht nur als
  // Hilfe darunter, wenn der Zeiger darauf liegt.

  // Grundmaße eines Fensters. Am Handy wird alles noch ein Stück größer,
  // damit die Kacheln mit dem Finger sicher zu treffen sind.
  var BASIS = {
    tile: 50,          // Kachelgröße
    gap: 7,
    pad: 11,
    titleH: 22,
    tipH: 21,          // eine Zeile Hilfe, mit Unterzeile mehr
    titleSize: 12,
    tipSize: 13
  };
  var TOUCH_FAKTOR = 1.22;
  var ICON_BASIS = 44;   // Kachelgröße, für die die Symbole gezeichnet sind
  var MAX_W = 340;

  function masse() {
    var f = PT.input.pointer.touch ? TOUCH_FAKTOR : 1;
    return {
      f: f,
      tile: Math.round(BASIS.tile * f),
      gap: Math.round(BASIS.gap * f),
      pad: Math.round(BASIS.pad * f),
      titleH: Math.round(BASIS.titleH * f),
      tipH: Math.round(BASIS.tipH * f),
      titleSize: BASIS.titleSize * f,
      tipSize: BASIS.tipSize * f
    };
  }

  // Das Fenster bekommt keinen fertigen Inhalt, sondern einen Bauplan: eine
  // Funktion, die { title, items } aus dem aktuellen Spielstand liefert. Der
  // wird in jedem Bild neu gefragt, damit die Kacheln von selbst mitgehen -
  // etwa wenn die Pizza im Ofen durch ist oder der Chef gerade etwas ablegt.
  function openMenu(x, y, bauplan) {
    menu = { x: x, y: y, build: bauplan, title: '', items: [] };
    refreshMenu();
  }

  function refreshMenu() {
    if (!menu) return;
    var m = menu.build ? menu.build() : null;
    if (!m || !m.items || !m.items.length) {   // Station gibt nichts mehr her
      menu = null;
      return;
    }
    menu.title = m.title;
    menu.items = m.items;
  }

  function closeMenu() { menu = null; }
  function isMenuOpen() { return menu !== null; }

  // Kacheln in Reihen aufteilen (items können eine Reihe vorgeben)
  function rowsOf() {
    var rows = [];
    for (var i = 0; i < menu.items.length; i++) {
      var r = menu.items[i].row || 0;
      if (!rows[r]) rows[r] = [];
      rows[r].push(menu.items[i]);
    }
    return rows.filter(function (r) { return r && r.length; });
  }

  function menuGeometry(g) {
    var m = masse();
    var rows = rowsOf();
    var cols = 1;
    for (var i = 0; i < rows.length; i++) cols = Math.max(cols, rows[i].length);

    // So breit müssen die Kacheln auf jeden Fall nebeneinander passen
    var kachelW = m.pad * 2 + cols * m.tile + (cols - 1) * m.gap;

    var w = Math.max(kachelW, g.textWidth(menu.title, m.titleSize, 700) + m.pad * 2 + 6);

    // auch der Hilfetext unten muss hineinpassen
    for (var k = 0; k < menu.items.length; k++) {
      w = Math.max(w, g.textWidth(menu.items[k].label, m.tipSize, 600) + m.pad * 2 + 6);
      if (menu.items[k].sub) {
        w = Math.max(w, g.textWidth(menu.items[k].sub, m.tipSize - 1, 400) + m.pad * 2 + 6);
      }
    }
    w = Math.max(Math.min(w, MAX_W), kachelW);

    // Gibt es Unterzeilen, braucht die Hilfe unten mehr Platz
    var tipH = m.tipH;
    for (var t = 0; t < menu.items.length; t++) {
      if (menu.items[t].sub) { tipH = m.tipH + Math.round(14 * m.f); break; }
    }
    var h = m.titleH + rows.length * m.tile + (rows.length - 1) * m.gap + tipH + m.pad;

    var x = menu.x + 22;
    var y = menu.y - 28;
    if (x + w > C.W - 14) x = menu.x - 22 - w;
    x = Math.max(14, Math.min(C.W - 14 - w, x));
    y = Math.max(C.HUD_TOP + 10, Math.min(C.H - C.HUD_BOTTOM - 10 - h, y));

    return { x: x, y: y, w: w, h: h, rows: rows, tipH: tipH, m: m };
  }

  function tileRect(geo, r, i) {
    var row = geo.rows[r];
    var m = geo.m;
    var rowW = row.length * m.tile + (row.length - 1) * m.gap;
    return {
      x: geo.x + (geo.w - rowW) / 2 + i * (m.tile + m.gap),
      y: geo.y + m.titleH + r * (m.tile + m.gap),
      w: m.tile, h: m.tile
    };
  }

  function menuClick(g, mx, my) {
    if (!menu) return { inside: false, item: null };
    var geo = menuGeometry(g);
    if (mx < geo.x || mx > geo.x + geo.w || my < geo.y || my > geo.y + geo.h) {
      return { inside: false, item: null };
    }
    for (var r = 0; r < geo.rows.length; r++) {
      for (var i = 0; i < geo.rows[r].length; i++) {
        var t = tileRect(geo, r, i);
        if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h) {
          var it = geo.rows[r][i];
          return { inside: true, item: it.enabled === false ? null : it };
        }
      }
    }
    return { inside: true, item: null };
  }

  // --- Symbole auf den Kacheln ------------------------------------------------

  function badge(g, x, y, art, farbe, f) {
    var ctx = g.ctx();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f || 1, f || 1);
    ctx.translate(-x, -y);
    g.circle(x, y, 8.5, farbe);
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (art === 'plus') {
      ctx.moveTo(x - 4.5, y); ctx.lineTo(x + 4.5, y);
      ctx.moveTo(x, y - 4.5); ctx.lineTo(x, y + 4.5);
    } else if (art === 'hoch') {
      ctx.moveTo(x, y + 4.5); ctx.lineTo(x, y - 4.5);
      ctx.moveTo(x - 4, y - 0.5); ctx.lineTo(x, y - 5);
      ctx.moveTo(x + 4, y - 0.5); ctx.lineTo(x, y - 5);
    } else if (art === 'runter') {
      ctx.moveTo(x, y - 4.5); ctx.lineTo(x, y + 4.5);
      ctx.moveTo(x - 4, y + 0.5); ctx.lineTo(x, y + 5);
      ctx.moveTo(x + 4, y + 0.5); ctx.lineTo(x, y + 5);
    } else if (art === 'haken') {
      ctx.moveTo(x - 4.5, y + 0.5); ctx.lineTo(x - 1, y + 4); ctx.lineTo(x + 5, y - 4);
    } else if (art === 'rechts') {
      ctx.moveTo(x - 4.5, y); ctx.lineTo(x + 4.5, y);
      ctx.moveTo(x + 0.5, y - 4); ctx.lineTo(x + 5, y);
      ctx.moveTo(x + 0.5, y + 4); ctx.lineTo(x + 5, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  function tischIcon(g, cx, cy) {
    g.circle(cx, cy, 11, col.table);
    g.circle(cx, cy, 8, col.tableTop);
    g.rect(cx - 18, cy - 5, 8, 10, col.chair, 3);
    g.rect(cx + 10, cy - 5, 8, 10, col.chair, 3);
  }

  function flaecheIcon(g, cx, cy) {
    g.rect(cx - 15, cy - 10, 30, 21, col.prep, 6);
    g.rect(cx - 12, cy - 4, 24, 12, col.prepTop, 4);
    for (var i = 0; i < 4; i++) g.circle(cx - 9 + i * 6, cy + 2, 2.3, '#e8d9b8');
  }

  function ofenIcon(g, cx, cy, plus) {
    g.rect(cx - 14, cy - 10, 28, 21, col.oven, 7);
    var ctx = g.ctx();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + 10);
    ctx.lineTo(cx - 9, cy + 2);
    ctx.quadraticCurveTo(cx, cy - 8, cx + 9, cy + 2);
    ctx.lineTo(cx + 9, cy + 10);
    ctx.closePath();
    ctx.fillStyle = '#241c1a';
    ctx.fill();
    ctx.restore();
    if (plus) g.star(cx + 11, cy - 9, 6, col.gold);
  }

  function trashIcon(g, cx, cy) {
    g.rect(cx - 9, cy - 5, 18, 17, col.bin, 5);
    g.rect(cx - 11, cy - 9, 22, 5, col.binLid, 3);
    g.rect(cx - 3, cy - 12, 6, 3, col.binLid, 2);
    g.rect(cx - 4, cy - 1, 3, 9, 'rgba(255,255,255,0.18)', 2);
    g.rect(cx + 2, cy - 1, 3, 9, 'rgba(255,255,255,0.18)', 2);
  }

  function slotIcon(g, cx, cy) {
    var ctx = g.ctx();
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Die Symbole sind für eine 44er Kachel gezeichnet; ist die Kachel größer,
  // wird einfach mitskaliert.
  function drawIcon(g, it, t) {
    var cx = t.x + t.w / 2;
    var cy = t.y + t.h / 2;
    var ic = it.icon || {};
    var f = t.w / ICON_BASIS;

    var ctx = g.ctx();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(f, f);
    ctx.translate(-cx, -cy);

    if (ic.kind === 'pizza') g.pizza(cx, cy, 15, ic.recipe, ic.grade);
    else if (ic.kind === 'trash') trashIcon(g, cx, cy);
    else if (ic.kind === 'tisch') tischIcon(g, cx, cy);
    else if (ic.kind === 'flaeche') flaecheIcon(g, cx, cy);
    else if (ic.kind === 'ofen') ofenIcon(g, cx, cy, false);
    else if (ic.kind === 'ofenPlus') ofenIcon(g, cx, cy, true);
    else slotIcon(g, cx, cy);

    ctx.restore();

    if (ic.badge) {
      badge(g, t.x + t.w - 9 * f, t.y + 9 * f, ic.badge,
            ic.badgeColor || col.chefAccent, f);
    }
  }

  function kuerzen(g, text, maxW, size) {
    if (g.textWidth(text, size, 600) <= maxW) return text;
    var t = text;
    while (t.length > 4 && g.textWidth(t + '...', size, 600) > maxW) t = t.slice(0, -1);
    return t + '...';
  }

  function drawMenu(g) {
    if (!menu) return;
    var geo = menuGeometry(g);
    var m = geo.m;
    var p = PT.input.pointer;

    g.ring(menu.x, menu.y, 16, 'rgba(255,255,255,0.6)', 2.5);
    g.withShadow(26, 10, function () {
      g.rect(geo.x, geo.y, geo.w, geo.h, col.hud, 16);
    });
    g.text(kuerzen(g, menu.title, geo.w - m.pad * 2, m.titleSize),
           geo.x + m.pad + 2, geo.y + 5,
           { size: m.titleSize, weight: 700, color: col.textDim });

    var tip = null;
    var sub = null;
    for (var r = 0; r < geo.rows.length; r++) {
      for (var i = 0; i < geo.rows[r].length; i++) {
        var it = geo.rows[r][i];
        var t = tileRect(geo, r, i);
        var on = it.enabled !== false;
        var hot = on && p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h;
        if (hot) { tip = it.label; sub = it.sub || null; }

        g.rect(t.x, t.y, t.w, t.h, hot ? col.chefAccent : col.hudSoft,
               Math.round(12 * m.f));
        if (!on) {
          var ctx = g.ctx();
          ctx.save();
          ctx.globalAlpha = 0.3;
          drawIcon(g, it, t);
          ctx.restore();
        } else {
          drawIcon(g, it, t);
        }
      }
    }

    if (!tip) {
      for (var k = 0; k < menu.items.length; k++) {
        if (menu.items[k].enabled !== false) {
          tip = menu.items[k].label;
          sub = menu.items[k].sub || null;
          break;
        }
      }
    }
    if (tip) {
      var ty = geo.y + geo.h - geo.tipH + 2;
      g.text(kuerzen(g, tip, geo.w - m.pad * 2, m.tipSize), geo.x + geo.w / 2, ty,
             { size: m.tipSize, weight: 600, align: 'center', color: col.text });
      if (sub) {
        g.text(kuerzen(g, sub, geo.w - m.pad * 2, m.tipSize - 1),
               geo.x + geo.w / 2, ty + Math.round(15 * m.f),
               { size: m.tipSize - 1, align: 'center', color: col.textDim });
      }
    }
  }

  // --- Kopfzeile ----------------------------------------------------------

  // abgerundetes Feld im HUD
  function chip(g, x, y, w, h, color) {
    g.rect(x, y, w, h, color || col.hudSoft, h / 2);
  }

  // Fragezeichen neben den Anzeigen: holt die Anleitung zurück
  var HELP = { x: 532, y: 12, w: 30, h: 30 };

  function helpHit(x, y) {
    return x >= HELP.x && x <= HELP.x + HELP.w && y >= HELP.y && y <= HELP.y + HELP.h;
  }

  function drawHelp(g) {
    var hot = ueber(HELP.x, HELP.y, HELP.w, HELP.h);
    g.circle(HELP.x + 15, HELP.y + 15, 15, hot ? col.chefAccent : col.hudSoft);
    g.text('?', HELP.x + 15, HELP.y + 6,
           { size: 16, weight: 800, align: 'center', color: hot ? '#fff8f2' : col.textDim });
  }

  // Vollbild: vor allem fürs Handy gedacht, damit die Leisten des Browsers
  // verschwinden und der Laden den ganzen Bildschirm bekommt.
  var FULL = { x: 570, y: 12, w: 30, h: 30 };

  function vollbildMoeglich() {
    var el = document.documentElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
  }

  function imVollbild() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  // Muss direkt aus dem Klick heraus aufgerufen werden, sonst lehnt der
  // Browser das Vollbild ab (siehe main.js).
  function vollbildUmschalten() {
    var el = document.documentElement;
    try {
      if (imVollbild()) {
        var aus = document.exitFullscreen || document.webkitExitFullscreen;
        if (aus) aus.call(document);
        return;
      }
      var an = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!an) { setHint('Vollbild geht in diesem Browser nicht'); return; }
      var versprechen = an.call(el);
      if (versprechen && versprechen['catch']) {
        versprechen['catch'](function () {
          setHint('Vollbild geht in diesem Browser nicht');
        });
      }
    } catch (e) {
      setHint('Vollbild geht in diesem Browser nicht');
    }
  }

  function fullscreenHit(x, y) {
    return vollbildMoeglich() &&
           x >= FULL.x && x <= FULL.x + FULL.w && y >= FULL.y && y <= FULL.y + FULL.h;
  }

  function drawVollbild(g) {
    if (!vollbildMoeglich()) return;
    var hot = ueber(FULL.x, FULL.y, FULL.w, FULL.h);
    var cx = FULL.x + 15, cy = FULL.y + 15;
    g.circle(cx, cy, 15, hot ? col.chefAccent : col.hudSoft);

    // Vier Ecken. Außerhalb des Vollbilds zeigen sie nach außen, im Vollbild
    // nach innen - so sieht man gleich, was der Knopf tut.
    var raus = !imVollbild();
    var r = raus ? 6.5 : 3.0;
    var l = 4;
    var ctx = g.ctx();
    ctx.save();
    ctx.strokeStyle = hot ? '#fff8f2' : col.textDim;
    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var sx = -1; sx <= 1; sx += 2) {
      for (var sy = -1; sy <= 1; sy += 2) {
        var ex = cx + sx * r, ey = cy + sy * r;
        if (raus) {
          ctx.moveTo(ex - sx * l, ey); ctx.lineTo(ex, ey); ctx.lineTo(ex, ey - sy * l);
        } else {
          ctx.moveTo(ex + sx * l, ey); ctx.lineTo(ex, ey); ctx.lineTo(ex, ey + sy * l);
        }
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawHeader(g) {
    g.rect(0, 0, C.W, C.HUD_TOP, col.hud);

    // Geld
    chip(g, 16, 12, 164, 30);
    g.circle(35, 27, 9, col.gold);
    g.text(PT.economy.format(PT.economy.state.money), 50, 20, { size: 15, weight: 700 });

    // Ruf
    var rep = PT.customers.reputation();
    chip(g, 194, 12, 150, 30);
    g.stars(212, 27, rep, 7);
    g.text(rep.toFixed(1), 328, 20, { size: 14, weight: 600, align: 'right', color: col.textDim });

    // Bedient, und wie viele ohne Tisch wieder gegangen sind
    var st = PT.customers.stats();
    chip(g, 358, 12, 164, 30);
    g.text('Bedient', 376, 21, { size: 13, weight: 600, color: col.textDim });
    g.text(st.bedient + (st.verloren ? '  (' + st.verloren + ' weg)' : ''),
           506, 20, { size: 15, weight: 700, align: 'right' });

    drawHelp(g);
    drawVollbild(g);

    // Pizza in der Hand
    var hand = PT.chef.state.carry;
    if (hand) {
      var txt = C.recipes[hand.recipe].name + (hand.grade ? ' - ' + hand.grade : ' - roh');
      var w = g.textWidth(txt, 14, 600) + 54;
      chip(g, C.W - 16 - w, 12, w, 30);
      g.pizza(C.W - 16 - w + 20, 27, 11, hand.recipe, hand.grade);
      g.text(txt, C.W - 16 - w + 38, 20, { size: 14, weight: 600 });
    }

    g.rect(0, C.HUD_TOP - 2, C.W, 2, 'rgba(255,255,255,0.07)');
  }

  // --- Fußzeile ---------------------------------------------------------------------

  function drawFooter(g) {
    var y = C.H - C.HUD_BOTTOM;
    g.rect(0, y, C.W, C.HUD_BOTTOM, col.hud);

    g.text('Klick auf Ofen, Arbeitsfläche, Theke, Mülleimer oder Gast - der Chef geht hin.',
           20, y + 17, { size: 14, color: col.textDim });

    // rechts die Öfen, in der Farbe des dringendsten Backergebnisses
    g.text(PT.oven.summary(), C.W - 20, y + 17,
           { size: 14, weight: 600, align: 'right', color: PT.oven.summaryColor() });
  }

  // --- Meldung ---------------------------------------------------------------------------

  function drawHint(g) {
    if (hint.time <= 0) return;
    var extra = hint.stars ? 86 : 0;
    var w = g.textWidth(hint.text, 15, 600) + 36 + extra;
    var x = (C.W - w) / 2;
    var y = C.H - C.HUD_BOTTOM - 54;

    g.withShadow(20, 8, function () {
      g.rect(x, y, w, 38, col.hud, 12);
    });
    g.text(hint.text, x + 18, y + 11, { size: 15, weight: 600 });
    if (hint.stars) g.stars(x + w - extra + 8, y + 19, hint.stars, 7);
  }

  function draw(g) {
    drawHeader(g);
    drawFooter(g);
    drawHint(g);
    drawMenu(g);
  }

  // Liegt der Punkt auf der Kopf- oder Fußzeile?
  function overHud(x, y) {
    return y < C.HUD_TOP || y > C.H - C.HUD_BOTTOM;
  }

  return {
    setHint: setHint,
    clearHint: clearHint,
    update: update,
    draw: draw,
    openMenu: openMenu,
    closeMenu: closeMenu,
    isMenuOpen: isMenuOpen,
    menuClick: menuClick,
    overHud: overHud,
    helpHit: helpHit,
    fullscreenHit: fullscreenHit,
    vollbildUmschalten: vollbildUmschalten
  };
})();
