# Pizzeria Tycoon – Plan

Stand: 27.10.2026 · Julian Harder

> Dieser Plan beschreibt das neu gebaute Spiel. Die erste Fassung (Pixelgrafik,
> Garten, Kachelraster, Kamera) liegt als Sicherung im Ordner `alt/` und ist
> nicht mehr die Grundlage.

## Spielidee und Kern-Kreislauf

Pizzeria Tycoon ist ein 2D-Browserspiel in Draufsicht: Du führst eine kleine
Pizzeria und siehst den ganzen Laden immer als ein Bild. Gäste kommen von der
Straße herein, setzen sich und bestellen. Du belegst die Pizza, backst sie im
Ofen und servierst sie im richtigen Moment. Der Druck entsteht aus drei Dingen
zugleich: die Backzeit läuft, die Geduld der Gäste sinkt, und der Chef muss
jeden Weg selbst gehen.

1. Gast kommt herein und setzt sich an einen freien Tisch.
2. Er bestellt, sein Geduldsbalken beginnt zu sinken.
3. Du belegst die Pizza an der Arbeitsfläche.
4. Du schiebst sie in den Ofen und holst sie zum richtigen Zeitpunkt heraus.
5. Du servierst. Der Gast isst, zahlt an der Kasse und gibt Sterne.
6. Sterne ergeben den Ruf, und der Ruf bestimmt, wie viele Gäste kommen.

```
Gast kommt ──► bestellt ──► Arbeitsfläche ──► Ofen ──► servieren ──► Kasse
    ▲              (Geduld sinkt)        (Backbalken)      (Sterne, Geld)   │
    └──────────── besserer Ruf holt mehr Gäste ◄──────────────────────────┘
```

## Was dieses Spiel bewusst nicht hat

Diese Punkte sind Entscheidungen, keine offenen Aufgaben:

- **Kein Garten, kein Vorrat, keine Frische.** Zutaten sind immer da.
- **Kein Holz, keine Temperatur, kein Schalter.** Der Ofen läuft immer; das
  Feuer brennt nur, solange eine Pizza drin liegt.
- **Keine Kamera.** Der Laden ist immer vollständig zu sehen, nichts zoomt,
  nichts läuft mit.
- **Kein Pixel-Look.** Flache, abgerundete Formen mit weichen Schatten.
- **Kein Tageslauf.** Keine Uhr, kein Spieltag, keine Öffnungszeiten. Die
  Pizzeria hat immer offen, Gäste kommen durchgehend.

## Technischer Rahmen

HTML, CSS und Vanilla JavaScript auf einem einzigen Canvas, ohne Bibliotheken.
Das Spiel startet per Doppelklick auf die `index.html`, ohne Server, und läuft
genauso online.

- **Keine ES-Module:** Alle Skripte als normale `<script src>` in fester
  Reihenfolge, `main.js` zuletzt. `import`/`export` scheitert bei `file://`.
- **Ein Namensraum `PT`:** `PT.shop`, `PT.oven`, `PT.customers` und so weiter.
- **Logische Bildgröße 960 × 540:** Gezeichnet wird immer in diesen Einheiten.
  Die Leinwand ist so groß wie das Fenster mal Pixeldichte, eine Transformation
  rechnet um (`gfx.js`). Dadurch ist alles bei jeder Fenstergröße scharf, auch
  die Schrift, und der Laden passt immer ganz ins Bild (16:9, sonst Rand).
- **Game-Loop:** `requestAnimationFrame` mit fester Logik-Schrittweite von
  1/60 Sekunde, damit das Spiel auf jedem Rechner gleich schnell läuft.
- **Wegfindung:** unsichtbares Raster aus 20er-Zellen, Breitensuche, danach
  werden überflüssige Zwischenpunkte entfernt, damit die Figuren schräg und
  natürlich laufen (`nav.js`). Gezeichnet wird völlig frei davon.
- **Leichtgewichtig:** keine Bilddateien, alles wird im Code gezeichnet.

## Spielwelt und Steuerung

Die Welt ist ein Grundstück in Draufsicht. Links die Küche: oben die beiden
gemauerten Öfen nebeneinander an der Wand, mit Krone, Mauerfugen und einem
hellen Steinbogen um das dunkle Maul, das nach unten in den Raum zeigt – davor
ist bei beiden Platz für den Chef. An der linken Wand darunter die Bautafel,
hochkant längs zur Wand, ganz unten die Arbeitsfläche und daneben die
Mülltonne. In der Mitte die Theke mit Kasse,
rechts der Gastraum. Zu Beginn stehen dort zwei Tische zu je
zwei Plätzen; zwei weitere Stellplätze sind als blasse Umrisse zu sehen und
werden dazugekauft. Der Eingang liegt in der **rechten** Wand, davor
Gehweg und Straße mit Bank, Laterne und Stehschild.

- **Klick oder Tipp auf eine Station** (Ofen, Arbeitsfläche, Theke, Mülleimer,
  Bautafel, Gast) öffnet ein Auswahlfenster. Der Chef läuft hin und führt die
  Aktion aus. Bei einem Gast zählt die ganze Figur als Fläche – Kopf, Körper,
  Namensschild und Sprechblase –, nicht nur der Stuhl. Was unter dem Zeiger
  anklickbar ist, bekommt einen hellen Rahmen.
- **Die Fenster sind Bild-Kacheln, keine Textlisten.** Jede Kachel zeigt die
  Sache selbst: die Pizza, die gebacken wird, einen freien Platz als
  gestrichelten Kreis, die Mülltonne. Ein kleines Zeichen in der Ecke sagt, was
  passiert – Plus für neu belegen, Pfeil nach oben für nehmen, nach unten für
  ablegen, nach rechts für servieren. Die Beschriftung steht nur als Hilfe
  darunter, wenn der Zeiger auf einer Kachel liegt.
- **Das Fenster bleibt offen und geht mit.** Es baut seine Kacheln in jedem
  Bild neu aus dem Spielstand auf: Während die Pizza bäckt, wandert dieselbe
  Kachel von „roh“ über „gut“ zu „perfekt“, und sobald der Chef etwas abgelegt
  oder eingeschoben hat, steht es sofort drin – man muss nicht erneut klicken.
  Die Karte ist immer so breit, dass Titel und Hilfetext hineinpassen.
- **Die Kacheln spiegeln die Wirklichkeit:** Arbeitsfläche und Theke zeigen
  genau so viele Plätze, wie es dort gibt, mit den Pizzen, die wirklich darauf
  liegen – ein Klick auf eine liegende Pizza öffnet dasselbe Fenster. Beim Gast
  stehen Wunsch und das, was der Chef in der Hand hat, nebeneinander – passt es
  nicht, ist der Pfeil gelb.
- **Aufträge brechen nichts ab:** Ist der Chef schon unterwegs, macht er den
  Schritt fertig, und der neue Klick reiht sich dahinter ein (bis zu drei).
  Ein Zähler über dem Kopf und blasse Ringe an den Zielen zeigen, was noch
  ansteht. Nur wer selbst mit WASD läuft, übernimmt und wirft die Liste weg.
- **Tastatur zusätzlich:** WASD oder Pfeiltasten laufen, E handelt an der
  nächsten Station.
- Maus und Finger laufen über dieselben Pointer-Events, Menüzeilen sind 34
  Einheiten hoch, damit man sie am Handy trifft.

## Ofen und Rezepte

Der Ofen ist ein Zeitspiel, kein Verwaltungsspiel.

- **Immer an:** Kein Schalter, nichts zu bedienen. Liegt eine Pizza drin,
  brennt das Feuer im Ofenmaul und wirft einen warmen Schein auf den Boden;
  ist er leer, bleibt es dunkel.
- **Backen:** Eine Leiste längs auf dem Ofen läuft in 11 Sekunden von oben
  nach unten bis „fertig“. Von der Wand nach vorne gelesen liegt alles in
  dieser Reihenfolge: Schriftzug, Timer-Leiste, Maul, und ganz vorne im Maul
  das Feuer, dessen Zungen nach hinten in den Ofen schlagen.
  Daneben steht laufend das aktuelle Ergebnis, und in der Fußzeile steht es in
  der Farbe des Ergebnisses.
- **Ergebnis:** roh (unter 0,60), gut (bis 0,85), perfekt (bis 1,05), danach
  verbrannt. Zwei Marken auf dem Balken zeigen, wo perfekt anfängt und wo es
  kippt. Eine zu früh herausgeholte Pizza darf zurück in den Ofen und backt
  dort weiter.
- **Belegen:** An der Arbeitsfläche wählt man direkt aus der Karte, es kann
  nichts fehlen. Die belegte Pizza bleibt **auf der Arbeitsfläche liegen**, bis
  zu drei Stück nebeneinander. So kann man mehrere nacheinander vorbereiten und
  sich dann eine nach der anderen holen. Eine rohe Pizza aus der Hand kann man
  dort auch wieder ablegen.
- **Theke:** Bis zu drei fertige Pizzen zwischenlagern, um vorzuarbeiten.
- **Mülleimer:** Steht in der Küche an der Wand zwischen Ofen und
  Arbeitsfläche, auf dem Weg dazwischen. Was misslungen ist, vor allem
  Verbranntes, wirft man dort weg.

| Pizza | Preis | Belag |
| --- | --- | --- |
| Margherita | 8,50 € | Tomate, Käse, Basilikum |
| Salami | 10,00 € | Tomate, Käse, Salami |
| Funghi | 9,50 € | Tomate, Käse, Pilze |

## Gäste, Bewertung und Ruf

Jeder Gast läuft eine feste Abfolge durch: kommt herein, sucht einen freien
Stuhl (gibt es keinen, geht er wieder), setzt sich, bestellt mit Sprechblase,
wartet, isst, zahlt an der Kasse, geht. Über dem Kopf sinkt der Geduldsbalken,
darunter steht sein Name.

**Bewertung (1–5 Sterne)**, ausgehend von fünf:

| Grund | Abzug |
| --- | --- |
| mehr als die Hälfte der Geduld verbraucht | −1 |
| mehr als drei Viertel verbraucht | −2 |
| Pizza nur „gut“ statt perfekt | −1 |
| Pizza roh | −3 |
| Pizza verbrannt | −4 |
| falsches Rezept serviert | −2 |
| Geduld ganz abgelaufen, Gast geht | 1 Stern |

Ab vier Sternen gibt es Trinkgeld: 12 % des Preises je Stern über drei. Der
**Ruf** ist der Schnitt der letzten 20 Bewertungen (Start: 3,0) und bestimmt,
wie schnell der nächste Gast hereinkommt.

## Wirtschaft und Ausbau

Es gibt keine Uhr und keinen Tageswechsel. Du spielst, solange du magst; oben
stehen nur Kasse, Ruf und wie viele Gäste du bedient hast (und in Klammern, wie
viele mangels Tisch wieder gegangen sind).

**Ausgaben gibt es genau eine: die Zutaten.** Bezahlt wird beim Belegen, nicht
beim Verkauf – dadurch ist eine verbrannte oder falsch belegte Pizza ein echter
Verlust, und der Mülleimer tut weh. Eine laufende Miete passt nicht, solange es
keinen Tageslauf gibt.

| Pizza | Verkauf | Zutaten | Gewinn |
| --- | --- | --- | --- |
| Margherita | 8,50 € | 2,50 € | 6,00 € |
| Salami | 10,00 € | 3,20 € | 6,80 € |
| Funghi | 9,50 € | 3,00 € | 6,50 € |

**Ausbauten** kauft man an der **Bautafel** in der Küche – dasselbe
Kachelfenster wie überall, ein Bild je Ausbau, Preis und Erklärung stehen
darunter. Was zu teuer ist, ist grau; was steht, bekommt einen grünen Haken.

| Ausbau | Preis | Was es bringt |
| --- | --- | --- |
| Größere Arbeitsfläche | 40 € | vier belegte Pizzen statt drei |
| Dritter Tisch | 60 € | zwei Plätze mehr |
| Vierter Tisch | 90 € | nochmal zwei Plätze |
| Besserer Ofen | 120 € | „perfekt“ dauert von 0,78 bis 1,14 statt 0,85 bis 1,05 |
| Zweiter Ofen | 200 € | zweiter Backplatz, zwei Pizzen gleichzeitig |

| Wert | Einstellung |
| --- | --- |
| Startgeld | 60,00 € |
| Ruhe bis zum ersten Gast | 8 Sekunden |
| Abstand zwischen zwei Gästen | 40 Sekunden, minus 4 je Stern Ruf, minus 6 je Tisch über den ersten beiden, mindestens 14 |
| Geduld eines Gasts | 95 Sekunden |
| Essen | 18 Sekunden |
| Zahlen an der Kasse | 2,2 Sekunden |
| Tempo Chef / Gast | 185 / 105 Einheiten je Sekunde |

Der Andrang hängt an Ruf **und** Tischzahl – ein neuer Tisch soll ja nicht leer
herumstehen. Nach dem Kauf eines Tisches kommt sofort jemand, damit man den
Unterschied merkt.

| | Ruf 2 | Ruf 3 | Ruf 4 | Ruf 5 |
| --- | --- | --- | --- | --- |
| 2 Tische | 32 s | 28 s | 24 s | 20 s |
| 3 Tische | 26 s | 22 s | 18 s | 14 s |
| 4 Tische | 20 s | 16 s | 14 s | 14 s |

Eine Pizza braucht mit Laufwegen gut 18 Sekunden, mit zwei Öfen etwa die
Hälfte. Am Anfang hat man also Luft, am Ende braucht es den zweiten Ofen – und
wer trödelt, verliert Gäste.

Alle diese Zahlen stehen gesammelt in `js/config.js`, zusammen mit der
Farbpalette. Zum Balancen reicht diese eine Datei.

## Grafik

Es gibt keine Bilddateien. Alles wird in `gfx.js` aus Rechtecken mit runden
Ecken, Kreisen, Schatten und Text gezeichnet. Der Stil ist flach und warm:

- **Farben** kommen alle aus `config.colors`. Eine andere Stimmung ist eine
  Frage von ein paar Hex-Werten.
- **Figuren** sind einfache Formen: Körper, Kopf, beim Chef die Kochmütze, bei
  Gästen eine eigene Farbe je Person.
- **Jede Pizza hat ihren eigenen Belag** – Margherita mit Mozzarella und
  Basilikum, Salami mit roten Scheiben, Funghi mit Pilzen. Dadurch erkennt man
  die Sorte überall wieder, ohne zu lesen: auf der Arbeitsfläche, im Ofen, in
  der Hand, in der Sprechblase und auf den Kacheln.
- **Schatten** liegen flach unter Möbeln und Figuren, das gibt Tiefe, ohne
  perspektivisch zu werden.

## Dateistruktur

Die Skripte werden in der `index.html` in genau dieser Reihenfolge eingebunden.

```
Pizzeria Tycoon/
├── index.html
├── PLAN.md
├── alt/                  // die alte Pixel-Fassung als Sicherung
├── css/
│   └── style.css
└── js/
    ├── config.js      // alle Werte und Farben
    ├── gfx.js         // Leinwand, Skalierung, Zeichenhelfer
    ├── input.js       // Maus, Finger, Tastatur
    ├── nav.js         // unsichtbares Gitter, Wegfindung
    ├── shop.js        // Grundriss, Kollision, Zeichnen des Ladens
    ├── chef.js        // Spielfigur
    ├── oven.js        // Ofen an/aus, Backen, Karte
    ├── customers.js   // Gäste, Bewertung, Theke
    ├── economy.js     // Geld und Trinkgeld
    ├── ui.js          // HUD, Meldungen, Auswahlfenster
    └── main.js        // Spielschleife, Klicks, Aktionen
```

## Stand

**Fertig und im Browser geprüft:**

- Grundgerüst, Skalierung auf jede Fenstergröße, Wegfindung
- Laden mit Küche, Theke, Gastraum, Eingang rechts und Straße
- Ofen mit Backbalken, Feuer und vier Ergebnissen
- Karte mit drei Pizzen, Belegen ohne Vorrat
- Arbeitsfläche als Ablage für drei belegte Pizzen, Theke für drei fertige
- Mülleimer zum Wegwerfen misslungener Pizzen
- Zutatenkosten beim Belegen
- Bautafel mit fünf Ausbauten: Arbeitsfläche, zwei Tische, besserer und
  zweiter Ofen - gekauftes erscheint sofort im Laden, Wege werden neu berechnet
- Gäste kommen durchgehend, von der Ankunft bis zur Bezahlung
- Sterne, Trinkgeld, Ruf und ein Zähler für bediente Gäste
- Bedienung per Maus, Touch und Tastatur

## Nächste Etappen

Jede Etappe einzeln bauen und danach im Browser testen.

1. **Personal:** Ein Kellner holt fertige Pizzen von der Theke und bringt sie
   an die Tische, gegen einmalige Einstellung und Lohn je bedientem Gast.
   - Fertig, wenn: Der Kellner arbeitet selbstständig, und man merkt den
     Unterschied im Stress.
2. **Stammgäste:** Vier bis sechs feste Figuren mit Namen, Lieblingspizza und
   Eigenheiten, die mehr Trinkgeld geben, wenn man sie gut bedient.
   - Fertig, wenn: Ein Stammgast kommt wieder und reagiert auf seine Bestellung.
3. **Eigene Rezepte:** Pizzen aus Belägen zusammenstellen, benennen und den
   Preis selbst festlegen. Zu teuer senkt die Bewertung.
   - Fertig, wenn: Eine selbst gebaute Pizza steht auf der Karte und wird
     bestellt.
4. **Feinschliff:** Titelbildschirm, Speichern in `localStorage`, Balancing,
   optional Geräusche.
   - Fertig, wenn: Der Spielstand überlebt einen Neustart des Browsers.

**Ideen für später:** Lieferdienst über die Straße, ein Porträt im HUD, das auf
Lob und Stress reagiert, Stoßzeiten, in denen kurz hintereinander Gäste kommen.

## Prompt für die nächste Sitzung

```
Lies PLAN.md komplett. Wir bauen am Spiel "Pizzeria Tycoon" weiter, so wie es
dort beschrieben ist.

Wichtig:
- Nur HTML, CSS und Vanilla JavaScript auf einem Canvas, keine Bibliotheken.
- Keine ES-Module, alle Skripte als <script src> im Namensraum PT.
- Gezeichnet wird in logischen 960x540 Einheiten, der Laden bleibt immer
  komplett im Bild, es gibt keine Kamera.
- Flacher moderner Look, keine Bilddateien, Farben aus config.colors.
- Kein Tageslauf: keine Uhr, kein Spieltag, keine Oeffnungszeiten.
- Jede neue Funktion muss auch mit Maus und Touch bedienbar sein, nicht nur
  mit Tasten.

Baue jetzt nur Etappe X und hör danach auf. Sag mir am Ende, wie ich das
Fertig-Kriterium im Browser teste.
```
