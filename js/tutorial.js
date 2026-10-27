/* tutorial.js - die Anleitung beim Start.
 *
 * Sieben Karten, die der Reihe nach erklären, was man wo macht. Dazu wird der
 * Laden abgedunkelt und genau die Stelle, um die es geht, wieder hell
 * ausgeschnitten - so sieht man beim Lesen sofort, wo das gemeint ist.
 *
 * Solange die Anleitung offen ist, ruht das Spiel: main.js überspringt den
 * Logikschritt, es kommt also kein Gast und keine Backzeit läuft.
 */

PT.tutorial = (function () {
  var C = PT.config;
  var col = C.colors;

  var offen = false;
  var schritt = 0;
  var zeit = 0;

  var PAD = 20;
  var CARD_W = 400;
  var ZEILE = 21;
  var BTN_H = 34;

  // --- Inhalt ---------------------------------------------------------------
  //
  // ziel() liefert das Rechteck im Laden, das hell bleiben soll, oder null für
  // eine Karte ohne Ausschnitt. Es wird erst beim Zeichnen gefragt, damit es
  // auch nach einem Ausbau noch passt.

  function r(x, y, w, h, radius) {
    return { x: x, y: y, w: w, h: h, r: radius || 14 };
  }

  var schritte = [
    {
      titel: 'Willkommen in deiner Pizzeria',
      text: [
        'Du führst den Laden allein: Gäste kommen herein, bestellen und warten. Du belegst die Pizza, backst sie und servierst sie.',
        'Klick oder tippe auf eine Station - der Chef läuft hin und macht es dort.',
        'Diese Anleitung kannst du jederzeit überspringen. Das Fragezeichen oben holt sie zurück.'
      ],
      ziel: function () { return null; }
    },
    {
      titel: 'Die Gäste bestellen',
      text: [
        'Durch die Tür rechts kommen die Gäste herein und setzen sich an einen freien Tisch.',
        'Über dem Kopf steht ihr Wunsch in einer Sprechblase, darunter läuft die Geduld ab.',
        'Ein Klick auf den Gast zeigt, was er möchte.'
      ],
      ziel: function () {
        var s = PT.shop;
        return r(548, s.IN.y, s.B.x + s.B.w - 548, s.IN.h, 16);
      }
    },
    {
      titel: '1. Pizza belegen',
      text: [
        'Unten links in der Küche liegt die Arbeitsfläche. Klick darauf und wähle die Sorte aus den Bildkacheln.',
        'Die Zutaten kosten sofort Geld. Bis zu drei belegte Pizzen können dort liegen bleiben - so arbeitest du vor.'
      ],
      ziel: function () {
        var p = PT.shop.prep;
        return r(p.x - 10, p.y - 10, p.w + 20, p.h + 20, 16);
      }
    },
    {
      titel: '2. Im Ofen backen',
      text: [
        'Nimm die rohe Pizza und klick auf den Ofen. Er läuft immer, einen Schalter gibt es nicht.',
        'Die Leiste auf dem Ofen braucht elf Sekunden. Zwischen den beiden Marken ist die Pizza perfekt, danach verbrennt sie.',
        'Noch ein Klick auf den Ofen holt sie wieder heraus.'
      ],
      ziel: function () {
        var o = PT.shop.ovens[0];
        return r(o.x - 10, o.y - 10, o.w + 20, o.h + 24, 16);
      }
    },
    {
      titel: '3. Servieren und kassieren',
      text: [
        'Mit der fertigen Pizza in der Hand klickst du den Gast an. Ein grüner Pfeil heißt: richtige Sorte.',
        'Er isst, zahlt an der Kasse und gibt Sterne - für Tempo und für eine perfekt gebackene Pizza.',
        'Aus den Sternen wird dein Ruf, und ein guter Ruf bringt mehr Gäste.'
      ],
      ziel: function () {
        var t = PT.shop.tables[0];
        return r(t.cx - 110, t.cy - 62, 220, 124, 18);
      }
    },
    {
      titel: 'Theke, Mülleimer und Bautafel',
      text: [
        'Auf der Theke in der Mitte stellst du fertige Pizzen ab, wenn der Gast noch nicht so weit ist.',
        'Was verbrannt ist, wirfst du in die Tonne neben der Arbeitsfläche. Bezahlt hast du sie trotzdem.',
        'An der Bautafel an der linken Wand kaufst du Ausbauten: mehr Tische, mehr Platz und einen zweiten Ofen.'
      ],
      ziel: function () {
        var s = PT.shop;
        return r(s.IN.x, s.IN.y, 300 - s.IN.x, s.IN.h, 16);
      }
    },
    {
      titel: 'Die Steuerung',
      text: [
        'Maus oder Finger: Klick auf Ofen, Arbeitsfläche, Theke, Tonne, Bautafel oder Gast. Das Auswahlfenster bleibt offen und geht von selbst mit.',
        'Ist der Chef schon unterwegs, macht er den Schritt fertig und dein Klick reiht sich dahinter ein - bis zu drei.',
        'Wer lieber tippt: WASD oder die Pfeiltasten laufen, E handelt an der nächsten Station.',
        'Am Handy lohnt sich der Vollbild-Knopf oben neben dem Fragezeichen.'
      ],
      ziel: function () { return null; }
    }
  ];

  // --- Text umbrechen ---------------------------------------------------------

  function umbrechen(g, text, maxW, size) {
    var worte = text.split(' ');
    var zeilen = [];
    var zeile = '';
    for (var i = 0; i < worte.length; i++) {
      var versuch = zeile ? zeile + ' ' + worte[i] : worte[i];
      if (zeile && g.textWidth(versuch, size, 400) > maxW) {
        zeilen.push(zeile);
        zeile = worte[i];
      } else {
        zeile = versuch;
      }
    }
    if (zeile) zeilen.push(zeile);
    return zeilen;
  }

  function zeilenVon(g) {
    var alle = [];
    var abs = schritte[schritt].text;
    for (var i = 0; i < abs.length; i++) {
      if (i > 0) alle.push('');          // Leerzeile zwischen den Absätzen
      alle = alle.concat(umbrechen(g, abs[i], CARD_W - PAD * 2, 14.5));
    }
    return alle;
  }

  // --- Maße und Platz ---------------------------------------------------------

  function karte(g) {
    var zeilen = zeilenVon(g);
    var h = PAD + 15 + 8 + 26 + zeilen.length * ZEILE + 16 + BTN_H + PAD - 6;
    var z = schritte[schritt].ziel();

    var oben = C.HUD_TOP + 18;
    var unten = C.H - C.HUD_BOTTOM - 18 - h;
    var plaetze = [
      { x: C.W - 22 - CARD_W, y: oben },
      { x: 22, y: oben },
      { x: C.W - 22 - CARD_W, y: unten },
      { x: 22, y: unten }
    ];

    var pos = { x: (C.W - CARD_W) / 2, y: (C.H - h) / 2 };
    if (z) {
      // Die Karte geht dorthin, wo sie am wenigsten von der hellen Stelle
      // verdeckt - passt sie ganz daneben, ist die Überdeckung null.
      var besteFlaeche = -1;
      for (var i = 0; i < plaetze.length; i++) {
        var p = plaetze[i];
        var ux = Math.max(0, Math.min(p.x + CARD_W, z.x + z.w + 12) - Math.max(p.x, z.x - 12));
        var uy = Math.max(0, Math.min(p.y + h, z.y + z.h + 12) - Math.max(p.y, z.y - 12));
        var flaeche = ux * uy;
        if (besteFlaeche < 0 || flaeche < besteFlaeche) { besteFlaeche = flaeche; pos = p; }
        if (flaeche === 0) break;
      }
    }

    var btnY = pos.y + h - PAD - BTN_H + 4;
    var letzte = (schritt === schritte.length - 1);

    var weiterLabel = letzte ? 'Los geht\'s' : 'Weiter';
    var weiterW = g.textWidth(weiterLabel, 15, 700) + 36;
    var zurueckW = g.textWidth('Zurück', 15, 600) + 30;

    var knoepfe = [];
    if (!letzte) {
      knoepfe.push({
        id: 'skip', label: 'Überspringen', ghost: true, leise: true,
        x: pos.x + PAD - 6, y: btnY, w: g.textWidth('Überspringen', 14, 600) + 22, h: BTN_H
      });
    }
    knoepfe.push({
      id: 'weiter', label: weiterLabel,
      x: pos.x + CARD_W - PAD - weiterW, y: btnY, w: weiterW, h: BTN_H
    });
    if (schritt > 0) {
      knoepfe.push({
        id: 'zurueck', label: 'Zurück', ghost: true,
        x: pos.x + CARD_W - PAD - weiterW - 8 - zurueckW, y: btnY, w: zurueckW, h: BTN_H
      });
    }

    return { x: pos.x, y: pos.y, w: CARD_W, h: h, zeilen: zeilen, knoepfe: knoepfe, ziel: z };
  }

  // --- Zeichnen ---------------------------------------------------------------

  // Der Laden wird abgedunkelt und das Ziel wieder hell ausgeschnitten: dafür
  // wird der Laden innerhalb des Ausschnitts einfach ein zweites Mal gezeichnet.
  function ausschnitt(g, z) {
    var ctx = g.ctx();
    ctx.save();
    g.pathRound(z.x, z.y, z.w, z.h, z.r);
    ctx.clip();
    PT.shop.draw(g);
    PT.oven.drawPrep(g);
    PT.oven.drawOverlay(g);
    ctx.restore();

    var puls = 0.55 + 0.25 * Math.sin(zeit * 3);
    g.outline(z.x - 4, z.y - 4, z.w + 8, z.h + 8, 'rgba(242,183,5,' + puls.toFixed(2) + ')', z.r + 4, 3);
    g.outline(z.x, z.y, z.w, z.h, 'rgba(255,255,255,0.9)', z.r, 2);
  }

  function knopf(g, b) {
    var p = PT.input.pointer;
    var hot = p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

    if (b.leise) {
      g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 7,
             { size: 14, weight: 600, align: 'center',
               color: hot ? col.text : col.textDim });
      return;
    }
    if (b.ghost) {
      g.rect(b.x, b.y, b.w, b.h, hot ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)', 10);
      g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 8,
             { size: 15, weight: 600, align: 'center', color: col.text });
      return;
    }
    g.rect(b.x, b.y, b.w, b.h, hot ? '#f06a3e' : col.chefAccent, 10);
    g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 8,
           { size: 15, weight: 700, align: 'center', color: '#fff8f2' });
  }

  function punkte(g, k) {
    var n = schritte.length;
    var gr = 4;
    var abstand = 13;
    var x = k.x + k.w - PAD - (n - 1) * abstand;
    var y = k.y + PAD + 2;
    for (var i = 0; i < n; i++) {
      if (i === schritt) g.circle(x + i * abstand, y, gr + 1, col.gold);
      else g.circle(x + i * abstand, y, gr, 'rgba(255,255,255,0.22)');
    }
  }

  function draw(g) {
    if (!offen) return;
    var k = karte(g);

    g.rect(0, 0, C.W, C.H, 'rgba(8,11,16,0.74)');
    if (k.ziel) ausschnitt(g, k.ziel);

    g.withShadow(34, 14, function () {
      g.rect(k.x, k.y, k.w, k.h, col.hud, 18);
    });
    g.outline(k.x, k.y, k.w, k.h, 'rgba(255,255,255,0.09)', 18, 1.5);

    g.text('Anleitung · Schritt ' + (schritt + 1) + ' von ' + schritte.length,
           k.x + PAD, k.y + PAD - 5, { size: 12, weight: 700, color: col.gold });
    punkte(g, k);

    g.text(schritte[schritt].titel, k.x + PAD, k.y + PAD + 16,
           { size: 20, weight: 800, color: col.text });

    var y = k.y + PAD + 49;
    for (var i = 0; i < k.zeilen.length; i++) {
      if (k.zeilen[i]) {
        g.text(k.zeilen[i], k.x + PAD, y + i * ZEILE,
               { size: 14.5, color: '#d8dee6' });
      }
    }

    for (var b = 0; b < k.knoepfe.length; b++) knopf(g, k.knoepfe[b]);
  }

  // --- Bedienung ---------------------------------------------------------------

  function weiter() {
    if (schritt < schritte.length - 1) schritt++;
    else schliessen();
  }

  function zurueck() {
    if (schritt > 0) schritt--;
  }

  function schliessen() {
    offen = false;
    PT.ui.setHint('Viel Erfolg! Das Fragezeichen oben öffnet die Anleitung wieder.', 4.5);
  }

  function oeffnen() {
    offen = true;
    schritt = 0;
    PT.ui.clearHint();
    PT.ui.closeMenu();
  }

  function update(dt, g) {
    zeit += dt;

    if (PT.input.anyPressed(['Escape'])) { schliessen(); return; }
    if (PT.input.anyPressed(['Enter', 'Space', 'ArrowRight', 'KeyD'])) { weiter(); return; }
    if (PT.input.anyPressed(['ArrowLeft', 'KeyA'])) { zurueck(); return; }

    if (!PT.input.pointer.clicked) return;
    var k = karte(g);
    var p = PT.input.pointer;
    for (var i = 0; i < k.knoepfe.length; i++) {
      var b = k.knoepfe[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
        if (b.id === 'weiter') weiter();
        else if (b.id === 'zurueck') zurueck();
        else schliessen();
        return;
      }
    }
  }

  return {
    oeffnen: oeffnen,
    schliessen: schliessen,
    istOffen: function () { return offen; },
    update: update,
    draw: draw
  };
})();
