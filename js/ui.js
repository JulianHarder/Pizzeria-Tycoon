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

  var TILE = 44;        // Kachelgröße, noch mit dem Finger zu treffen
  var GAP = 6;
  var PAD = 9;
  var TITLE_H = 20;
  var TIP_H = 19;        // eine Zeile Hilfe, mit Unterzeile mehr
  var TITLE_SIZE = 11;
  var TIP_SIZE = 12;

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
    var rows = rowsOf();
    var cols = 1;
    for (var i = 0; i < rows.length; i++) cols = Math.max(cols, rows[i].length);

    var w = PAD * 2 + cols * TILE + (cols - 1) * GAP;
    w = Math.max(w, g.textWidth(menu.title, TITLE_SIZE, 700) + PAD * 2 + 6);

    // auch der Hilfetext unten muss hineinpassen
    for (var k = 0; k < menu.items.length; k++) {
      w = Math.max(w, g.textWidth(menu.items[k].label, TIP_SIZE, 600) + PAD * 2 + 6);
      if (menu.items[k].sub) {
        w = Math.max(w, g.textWidth(menu.items[k].sub, TIP_SIZE - 1, 400) + PAD * 2 + 6);
      }
    }
    w = Math.min(w, 300);
    // Gibt es Unterzeilen, braucht die Hilfe unten mehr Platz
    var tipH = TIP_H;
    for (var t = 0; t < menu.items.length; t++) {
      if (menu.items[t].sub) { tipH = TIP_H + 13; break; }
    }
    var h = TITLE_H + rows.length * TILE + (rows.length - 1) * GAP + tipH + PAD;

    var x = menu.x + 22;
    var y = menu.y - 28;
    if (x + w > C.W - 14) x = menu.x - 22 - w;
    x = Math.max(14, Math.min(C.W - 14 - w, x));
    y = Math.max(C.HUD_TOP + 10, Math.min(C.H - C.HUD_BOTTOM - 10 - h, y));

    return { x: x, y: y, w: w, h: h, rows: rows, tipH: tipH };
  }

  function tileRect(geo, r, i) {
    var row = geo.rows[r];
    var rowW = row.length * TILE + (row.length - 1) * GAP;
    return {
      x: geo.x + (geo.w - rowW) / 2 + i * (TILE + GAP),
      y: geo.y + TITLE_H + r * (TILE + GAP),
      w: TILE, h: TILE
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

  function badge(g, x, y, art, farbe) {
    g.circle(x, y, 8.5, farbe);
    var ctx = g.ctx();
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

  function drawIcon(g, it, t) {
    var cx = t.x + t.w / 2;
    var cy = t.y + t.h / 2;
    var ic = it.icon || {};

    if (ic.kind === 'pizza') g.pizza(cx, cy, 15, ic.recipe, ic.grade);
    else if (ic.kind === 'trash') trashIcon(g, cx, cy);
    else if (ic.kind === 'tisch') tischIcon(g, cx, cy);
    else if (ic.kind === 'flaeche') flaecheIcon(g, cx, cy);
    else if (ic.kind === 'ofen') ofenIcon(g, cx, cy, false);
    else if (ic.kind === 'ofenPlus') ofenIcon(g, cx, cy, true);
    else slotIcon(g, cx, cy);

    if (ic.badge) {
      badge(g, t.x + t.w - 9, t.y + 9, ic.badge, ic.badgeColor || col.chefAccent);
    }
  }

  function kuerzen(g, text, maxW) {
    if (g.textWidth(text, TIP_SIZE, 600) <= maxW) return text;
    var t = text;
    while (t.length > 4 && g.textWidth(t + '...', TIP_SIZE, 600) > maxW) t = t.slice(0, -1);
    return t + '...';
  }

  function drawMenu(g) {
    if (!menu) return;
    var geo = menuGeometry(g);
    var p = PT.input.pointer;

    g.ring(menu.x, menu.y, 16, 'rgba(255,255,255,0.6)', 2.5);
    g.withShadow(26, 10, function () {
      g.rect(geo.x, geo.y, geo.w, geo.h, col.hud, 16);
    });
    g.text(kuerzen(g, menu.title, geo.w - PAD * 2), geo.x + PAD + 2, geo.y + 5,
           { size: TITLE_SIZE, weight: 700, color: col.textDim });

    var tip = null;
    var sub = null;
    for (var r = 0; r < geo.rows.length; r++) {
      for (var i = 0; i < geo.rows[r].length; i++) {
        var it = geo.rows[r][i];
        var t = tileRect(geo, r, i);
        var on = it.enabled !== false;
        var hot = on && p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h;
        if (hot) { tip = it.label; sub = it.sub || null; }

        g.rect(t.x, t.y, t.w, t.h, hot ? col.chefAccent : col.hudSoft, 12);
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
      g.text(kuerzen(g, tip, geo.w - PAD * 2), geo.x + geo.w / 2, ty,
             { size: TIP_SIZE, weight: 600, align: 'center', color: col.text });
      if (sub) {
        g.text(kuerzen(g, sub, geo.w - PAD * 2), geo.x + geo.w / 2, ty + 14,
               { size: TIP_SIZE - 1, align: 'center', color: col.textDim });
      }
    }
  }

  // --- Kopfzeile ----------------------------------------------------------

  // abgerundetes Feld im HUD
  function chip(g, x, y, w, h, color) {
    g.rect(x, y, w, h, color || col.hudSoft, h / 2);
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
    update: update,
    draw: draw,
    openMenu: openMenu,
    closeMenu: closeMenu,
    isMenuOpen: isMenuOpen,
    menuClick: menuClick,
    overHud: overHud
  };
})();
