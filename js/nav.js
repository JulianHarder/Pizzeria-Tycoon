/* nav.js - unsichtbares Gitter für die Wegfindung.
 *
 * Gezeichnet wird frei, gelaufen wird über ein grobes Raster: jede Zelle ist
 * frei oder versperrt. Eine Breitensuche liefert den kürzesten Weg, danach
 * werden überflüssige Zwischenpunkte entfernt, damit die Figuren schräg
 * und natürlich laufen statt im Treppenmuster.
 */

PT.nav = (function () {
  var C = PT.config;
  var CELL = 20;

  var cols = 0, rows = 0;
  var blocked = null;
  var test = null;         // Funktion, die sagt, ob ein Punkt versperrt ist

  function build(isBlocked) {
    test = isBlocked;
    cols = Math.ceil(C.W / CELL);
    rows = Math.ceil(C.H / CELL);
    blocked = new Uint8Array(cols * rows);

    for (var cy = 0; cy < rows; cy++) {
      for (var cx = 0; cx < cols; cx++) {
        var p = center(cx, cy);
        blocked[cy * cols + cx] = isBlocked(p.x, p.y) ? 1 : 0;
      }
    }
  }

  function center(cx, cy) {
    return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
  }

  function cellOf(x, y) {
    return {
      cx: Math.max(0, Math.min(cols - 1, Math.floor(x / CELL))),
      cy: Math.max(0, Math.min(rows - 1, Math.floor(y / CELL)))
    };
  }

  function free(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false;
    return blocked[cy * cols + cx] === 0;
  }

  // Nächstgelegene freie Zelle, falls jemand in einer Ecke steckt
  function nearestFree(cx, cy) {
    if (free(cx, cy)) return { cx: cx, cy: cy };
    for (var r = 1; r < 12; r++) {
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          if (free(cx + dx, cy + dy)) return { cx: cx + dx, cy: cy + dy };
        }
      }
    }
    return null;
  }

  // Liegt die gerade Linie zwischen zwei Punkten frei?
  function lineFree(x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.ceil(len / 6);
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      if (test(x0 + dx * t, y0 + dy * t)) return false;
    }
    return true;
  }

  // Liste von Punkten vom Start zum Ziel, oder null
  function findPath(x0, y0, x1, y1) {
    var start = nearestFree(cellOf(x0, y0).cx, cellOf(x0, y0).cy);
    var goalCell = cellOf(x1, y1);
    var goal = nearestFree(goalCell.cx, goalCell.cy);
    if (!start || !goal) return null;

    var startIdx = start.cy * cols + start.cx;
    var goalIdx = goal.cy * cols + goal.cx;

    if (startIdx === goalIdx) return smooth(x0, y0, [{ x: x1, y: y1 }]);

    var prev = new Int32Array(cols * rows).fill(-1);
    var seen = new Uint8Array(cols * rows);
    var queue = [startIdx];
    seen[startIdx] = 1;

    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var head = 0, found = false;

    while (head < queue.length) {
      var cur = queue[head++];
      if (cur === goalIdx) { found = true; break; }

      var cx = cur % cols, cy = (cur - cx) / cols;
      for (var d = 0; d < 4; d++) {
        var nx = cx + dirs[d][0], ny = cy + dirs[d][1];
        if (!free(nx, ny)) continue;
        var ni = ny * cols + nx;
        if (seen[ni]) continue;
        seen[ni] = 1;
        prev[ni] = cur;
        queue.push(ni);
      }
    }
    if (!found) return null;

    var pts = [];
    var node = goalIdx;
    while (node !== startIdx) {
      var x = node % cols;
      pts.push(center(x, (node - x) / cols));
      node = prev[node];
    }
    pts.reverse();

    // Letzter Punkt: wenn das echte Ziel frei liegt, genau dorthin
    if (!test(x1, y1)) pts[pts.length - 1] = { x: x1, y: y1 };
    return smooth(x0, y0, pts);
  }

  // Zwischenpunkte wegwerfen, solange die Luftlinie frei ist
  function smooth(x0, y0, pts) {
    var out = [];
    var fromX = x0, fromY = y0;
    var i = 0;
    while (i < pts.length) {
      var j = pts.length - 1;
      while (j > i && !lineFree(fromX, fromY, pts[j].x, pts[j].y)) j--;
      out.push(pts[j]);
      fromX = pts[j].x;
      fromY = pts[j].y;
      i = j + 1;
    }
    return out;
  }

  function isBlocked(x, y) { return test ? test(x, y) : false; }

  return {
    CELL: CELL,
    build: build,
    findPath: findPath,
    lineFree: lineFree,
    isBlocked: isBlocked
  };
})();
