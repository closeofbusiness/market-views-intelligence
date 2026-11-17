/* Market Views Intelligence - inline SVG charts (no libraries). Colours come from CSS custom properties. */
(function () {
  'use strict';
  var M = window.MVI, esc = M.esc;

  function niceTicks(lo, hi, target) {
    if (!(hi > lo)) { return [lo]; }
    var span = hi - lo, raw = span / (target || 6);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), r = raw / mag;
    var step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
    var out = [], t = Math.ceil(lo / step - 1e-9) * step;
    for (; t <= hi + step * 1e-9; t += step) out.push(Math.round(t / step * 1e6) / 1e6 * step);
    return out;
  }
  M.niceTicks = niceTicks;
  var f2 = function (n) { return (Math.round(n * 100) / 100).toString(); };

  /* ---- legend ---- */
  var LEG = {
    dot: '<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><circle r="5" class="m-fresh"/></svg>',
    stale: '<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><circle r="4.5" class="m-stale"/></svg>',
    cb: '<svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><rect x="-5" y="-5" width="10" height="10" class="m-cb"/></svg>',
    out: '<svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true"><path d="M0-7L7 0 0 7-7 0z" class="m-out"/></svg>',
    band: '<svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="1" y="1" width="16" height="10" class="m-band"/></svg>',
    med: '<svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><line x1="9" y1="0" x2="9" y2="12" class="m-med"/></svg>',
    fence: '<svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><line x1="9" y1="0" x2="9" y2="12" class="m-fence"/></svg>'
  };
  M.legend = function (items) {
    return '<ul class="legend">' + items.map(function (i) { return '<li>' + LEG[i[0]] + '<span>' + esc(i[1]) + '</span></li>'; }).join('') + '</ul>';
  };

  /* ---- strip / dot plot: one row per forecaster ---- */
  M.dotPlot = function (g) {
    var id = g.id, st = g.stats, cons = st.consensus;
    var E = g.entries.slice().sort(function (a, b) { return a.rec.point_value - b.rec.point_value || (a.fc < b.fc ? -1 : 1); });
    var C = (g.cb || []).slice().sort(function (a, b) { return a.point_value - b.point_value; });
    var SEP = C.length ? 30 : 0;
    var W = 880, L = 210, R = 120, T = 44, RH = 31, B = 38, H = T + E.length * RH + SEP + C.length * RH + B;
    var vals = E.map(function (e) { return e.rec.point_value; }).concat(C.map(function (c) { return c.point_value; }));
    if (cons) { vals.push(st.median - st.thr, st.median + st.thr); }
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pad = (hi - lo) * 0.06 || Math.abs(hi) * 0.05 || 1;
    // keep the outlier fences inside the plot only if they are near the data
    var d0 = lo - pad, d1 = hi + pad, iw = W - L - R;
    var x = function (v) { return L + (v - d0) / (d1 - d0) * iw; };
    var s = ['<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc('Dot plot of ' + E.length + ' forecasters' + (C.length ? ' and ' + C.length + ' central bank projections' : '') + ' for ' + M.fullLabel(id, g.measure) + ', ' + M.periodLabel(g.period) + (cons ? '. Median ' + M.fmtV(id, st.median, true) + '.' : '. Too few sources for a consensus.')) + '">'];
    var ticks = niceTicks(d0, d1, 7);
    ticks.forEach(function (t) {
      s.push('<line x1="' + f2(x(t)) + '" x2="' + f2(x(t)) + '" y1="' + T + '" y2="' + (H - B) + '" class="grid"/>');
      s.push('<text x="' + f2(x(t)) + '" y="' + (H - B + 16) + '" class="tick" text-anchor="middle">' + esc(M.fmtBare(id, t)) + '</text>');
    });
    s.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" class="axis"/>');
    s.push('<text x="' + (W - R) + '" y="' + (H - 6) + '" class="tick" text-anchor="end">' + esc(M.unitName(id)) + '</text>');
    if (cons) {
      var bx = x(st.q1), bw = Math.max(2, x(st.q3) - x(st.q1));
      s.push('<rect x="' + f2(bx) + '" y="' + T + '" width="' + f2(bw) + '" height="' + (E.length * RH) + '" class="m-band"/>');
      [st.median - st.thr, st.median + st.thr].forEach(function (v) {
        s.push('<line x1="' + f2(x(v)) + '" x2="' + f2(x(v)) + '" y1="' + T + '" y2="' + (H - B - SEP - C.length * RH) + '" class="m-fence"/>');
      });
      s.push('<text x="' + f2(x(st.median - st.thr)) + '" y="' + (T - 22) + '" class="tick" text-anchor="middle">outlier limit</text>');
      s.push('<text x="' + f2(x(st.median + st.thr)) + '" y="' + (T - 22) + '" class="tick" text-anchor="middle">outlier limit</text>');
      s.push('<line x1="' + f2(x(st.median)) + '" x2="' + f2(x(st.median)) + '" y1="' + (T - 8) + '" y2="' + (H - B - SEP - C.length * RH) + '" class="m-med"/>');
      s.push('<text x="' + f2(x(st.median)) + '" y="' + (T - 11) + '" class="lbl-strong" text-anchor="middle">median ' + esc(M.fmtV(id, st.median)) + '</text>');
    }
    E.forEach(function (e, i) {
      var cy = T + i * RH + RH / 2, cx = x(e.rec.point_value), r = e.rec;
      var tip = e.fc + ': ' + M.fmtV(id, r.point_value, true) + ' (as of ' + M.fmtDate(r.as_of_date) + ', ' + M.basisShort(r.basis) + ')';
      if (cons) tip += '. ' + M.fmtDiff(id, e.dev) + ' vs median (' + e.devFloor.toFixed(1) + 'x floor)' + (e.outlier ? '. OUTLIER' : '') + (e.stale ? '. STALE' : '');
      s.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + cy + '" y2="' + cy + '" class="rowline"/>');
      s.push('<text x="' + (L - 12) + '" y="' + (cy - 1) + '" class="rowlab' + (e.stale ? ' is-stale' : '') + '" text-anchor="end">' + esc(e.fc) + '</text>');
      s.push('<text x="' + (L - 12) + '" y="' + (cy + 11) + '" class="rowsub" text-anchor="end">' + esc(M.fmtDate(r.as_of_date) + ' · ' + M.basisAbbr(r.basis) + (e.stale ? ' · stale' : '')) + '</text>');
      var mark;
      if (e.outlier) mark = '<path d="M' + f2(cx) + ' ' + (cy - 8) + 'l8 8-8 8-8-8z" class="m-out' + (e.stale ? ' stale' : '') + '"/>';
      else mark = '<circle cx="' + f2(cx) + '" cy="' + cy + '" r="5.5" class="' + (e.stale ? 'm-stale' : 'm-fresh') + '"/>';
      var right = cx < W - R - 70, tx = right ? cx + 13 : cx - 13;
      var label = esc(M.fmtBare(id, r.point_value)) + (e.outlier ? '  outlier, ' + e.devFloor.toFixed(1) + '× floor' : '');
      s.push('<g class="hit" tabindex="0" role="button" data-rec="' + r.id + '" data-tip="' + esc(tip) + '" aria-label="' + esc(tip + '. Open the quote and source.') + '">' +
        '<circle cx="' + f2(cx) + '" cy="' + cy + '" r="13" class="hitarea"/>' + mark +
        '<text x="' + f2(tx) + '" y="' + (cy + 4) + '" class="vlab' + (e.outlier ? ' is-out' : '') + '" text-anchor="' + (right ? 'start' : 'end') + '">' + label + '</text></g>');
    });
    if (C.length) {
      var sy = T + E.length * RH + 18;
      s.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (sy - 12) + '" y2="' + (sy - 12) + '" class="divider"/>');
      s.push('<text x="' + L + '" y="' + (sy + 2) + '" class="lbl-strong">Central bank projections (not part of the consensus)</text>');
      C.forEach(function (r, j) {
        var cy = T + E.length * RH + SEP + j * RH + RH / 2, cx = x(r.point_value), who = M.forecaster(r);
        var person = r.attributed_person;
        var tip = who + (person ? ' (individual policymaker: ' + person + ', not the institution’s view)' : ' central bank projection') + ': ' + M.fmtV(id, r.point_value, true) + ' (as of ' + M.fmtDate(r.as_of_date) + '). Excluded from the consensus.';
        s.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + cy + '" y2="' + cy + '" class="rowline"/>');
        s.push('<text x="' + (L - 12) + '" y="' + (cy - 1) + '" class="rowlab" text-anchor="end">' + esc(who) + (person ? ' (' + esc(person) + ')' : '') + '</text>');
        s.push('<text x="' + (L - 12) + '" y="' + (cy + 11) + '" class="rowsub" text-anchor="end">' + esc(person ? 'individual policymaker' : 'central bank projection') + ' · ' + esc(M.fmtDate(r.as_of_date)) + '</text>');
        var right = cx < W - R - 70, tx = right ? cx + 13 : cx - 13;
        s.push('<g class="hit" tabindex="0" role="button" data-rec="' + r.id + '" data-tip="' + esc(tip) + '" aria-label="' + esc(tip + ' Open the quote and source.') + '"><circle cx="' + f2(cx) + '" cy="' + cy + '" r="13" class="hitarea"/><rect x="' + f2(cx - 5.5) + '" y="' + (cy - 5.5) + '" width="11" height="11" class="m-cb"/><text x="' + f2(tx) + '" y="' + (cy + 4) + '" class="vlab" text-anchor="' + (right ? 'start' : 'end') + '">' + esc(M.fmtBare(id, r.point_value)) + '</text></g>');
      });
    }
    s.push('</svg>');
    return s.join('');
  };

  /* ---- heat-cell mini range bar ---- */
  M.miniBar = function (g, w, h) {
    w = w || 68; h = h || 12;
    var st = g.stats, vals = g.entries.map(function (e) { return e.rec.point_value; });
    var lo = st.min, hi = st.max, span = hi - lo, px = 3;
    var x = function (v) { return span ? px + (v - lo) / span * (w - 2 * px) : w / 2; };
    var s = ['<svg class="mini" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">'];
    s.push('<line x1="' + f2(x(lo)) + '" x2="' + f2(x(hi)) + '" y1="' + h / 2 + '" y2="' + h / 2 + '" class="mini-rng"/>');
    s.push('<rect x="' + f2(x(st.q1)) + '" y="2" width="' + f2(Math.max(2, x(st.q3) - x(st.q1))) + '" height="' + (h - 4) + '" class="mini-iqr"/>');
    s.push('<line x1="' + f2(x(st.median)) + '" x2="' + f2(x(st.median)) + '" y1="0" y2="' + h + '" class="mini-med"/>');
    g.entries.forEach(function (e) {
      if (e.outlier) { var cx = x(e.rec.point_value); s.push('<path d="M' + f2(cx) + ' ' + (h / 2 - 4.5) + 'l4.5 4.5-4.5 4.5-4.5-4.5z" class="m-out"/>'); }
    });
    s.push('</svg>');
    return s.join('');
  };

  /* ---- number line for an outlier card ---- */
  M.numberLine = function (g, e) {
    var id = g.id, st = g.stats, W = 300, H = 38, px = 10;
    var vals = g.entries.map(function (x) { return x.rec.point_value; }).concat([st.median - st.thr, st.median + st.thr]);
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), sp = (hi - lo) || 1;
    var x = function (v) { return px + (v - lo) / sp * (W - 2 * px); };
    var s = ['<svg class="nline" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(e.fc + ' ' + M.fmtV(id, e.rec.point_value, true) + ' against median ' + M.fmtV(id, st.median, true)) + '">'];
    s.push('<line x1="' + px + '" x2="' + (W - px) + '" y1="22" y2="22" class="axis"/>');
    s.push('<rect x="' + f2(x(st.q1)) + '" y="12" width="' + f2(Math.max(2, x(st.q3) - x(st.q1))) + '" height="20" class="m-band"/>');
    [st.median - st.thr, st.median + st.thr].forEach(function (v) { s.push('<line x1="' + f2(x(v)) + '" x2="' + f2(x(v)) + '" y1="8" y2="36" class="m-fence"/>'); });
    s.push('<line x1="' + f2(x(st.median)) + '" x2="' + f2(x(st.median)) + '" y1="6" y2="38" class="m-med"/>');
    g.entries.forEach(function (o) { if (o !== e) s.push('<circle cx="' + f2(x(o.rec.point_value)) + '" cy="22" r="3.5" class="' + (o.stale ? 'm-stale' : 'm-fresh') + '"/>'); });
    var cx = x(e.rec.point_value);
    s.push('<path d="M' + f2(cx) + ' 13l9 9-9 9-9-9z" class="m-out' + (e.stale ? ' stale' : '') + '"/>');
    s.push('<text x="' + f2(x(st.median)) + '" y="6" class="tick" text-anchor="middle">median</text>');
    s.push('</svg>');
    return s.join('');
  };

  /* ---- path chart: median and range across target periods ---- */
  M.pathChart = function (id, measure, selPeriod, hrefFor) {
    var G = M.G(), cats = [];
    Object.keys(G).forEach(function (k) {
      var g = G[k];
      if (g.id === id && g.measure === (measure || '') && g.entries.length) cats.push(g);
    });
    var kindOrder = { quarter: 0, year: 1, month: 2, date: 2 };
    cats.sort(function (a, b) {
      var ka = kindOrder[M.periodKind(a.period)], kb = kindOrder[M.periodKind(b.period)];
      return (ka - kb) || M.periodCmp(a.period, b.period);
    });
    if (!cats.length) return '<p class="muted">No eligible values for this variable.</p>';
    var W = 880, L = 64, R = 20, T = 34, B = 62, H = 280, gap = 26;
    var nGap = 0; for (var i = 1; i < cats.length; i++) if (kindOrder[M.periodKind(cats[i].period)] !== kindOrder[M.periodKind(cats[i - 1].period)]) nGap++;
    var step = Math.min(78, (W - L - R - nGap * gap) / Math.max(cats.length, 1));
    var vals = [];
    cats.forEach(function (g) { vals.push(g.stats.min, g.stats.max); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.05 || 1;
    var d0 = lo - pad, d1 = hi + pad, y = function (v) { return H - B - (v - d0) / (d1 - d0) * (H - B - T); };
    var s = ['<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc('Path of the median and range across target periods for ' + M.fullLabel(id, measure)) + '">'];
    niceTicks(d0, d1, 5).forEach(function (t) {
      s.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + f2(y(t)) + '" y2="' + f2(y(t)) + '" class="grid"/>');
      s.push('<text x="' + (L - 8) + '" y="' + f2(y(t) + 4) + '" class="tick" text-anchor="end">' + esc(M.fmtBare(id, t)) + '</text>');
    });
    var cx = L + step / 2, prevKind = null, path = [], pos = [];
    cats.forEach(function (g, i) {
      var kd = kindOrder[M.periodKind(g.period)];
      if (prevKind !== null && kd !== prevKind) {
        cx += gap;
        s.push('<line x1="' + f2(cx - gap / 2 - step / 2) + '" x2="' + f2(cx - gap / 2 - step / 2) + '" y1="' + T + '" y2="' + (H - B) + '" class="divider"/>');
        path.push(null);
      }
      prevKind = kd; pos.push(cx); path.push(g); cx += step;
    });
    // panel titles
    var titles = { 0: 'Quarterly targets', 1: 'Annual targets', 2: 'Date targets' }, seen = {};
    cats.forEach(function (g, i) {
      var kd = kindOrder[M.periodKind(g.period)];
      if (!seen[kd]) { seen[kd] = 1; var tx0 = pos[i] - step / 2 + 2, endAnch = tx0 > W - R - 150; s.push('<text x="' + f2(endAnch ? W - R : tx0) + '" y="14" class="lbl-strong"' + (endAnch ? ' text-anchor="end"' : '') + '>' + titles[kd] + '</text>'); }
    });
    // median polyline (consensus points only, per panel)
    var seg = [];
    var flush = function () { if (seg.length > 1) s.push('<polyline points="' + seg.join(' ') + '" class="path-line"/>'); seg = []; };
    cats.forEach(function (g, i) {
      if (i > 0 && kindOrder[M.periodKind(g.period)] !== kindOrder[M.periodKind(cats[i - 1].period)]) flush();
      if (g.stats.consensus) seg.push(f2(pos[i]) + ',' + f2(y(g.stats.median))); else flush();
    });
    flush();
    cats.forEach(function (g, i) {
      var st = g.stats, px = pos[i], sel = g.period === selPeriod;
      var tip = M.periodLabel(g.period) + ': n=' + st.n + (st.consensus ? ', median ' + M.fmtV(id, st.median, true) + ', range ' + M.fmtV(id, st.min) + ' to ' + M.fmtV(id, st.max) : ', too few sources for a consensus (' + g.entries.map(function (e) { return M.fmtV(id, e.rec.point_value); }).join(', ') + ')');
      s.push('<g class="hit" tabindex="0" role="link" data-goto="' + esc(hrefFor(g.period)) + '" data-tip="' + esc(tip) + '" aria-label="' + esc(tip + '. Select this period.') + '">');
      s.push('<rect x="' + f2(px - step / 2 + 1) + '" y="' + T + '" width="' + f2(step - 2) + '" height="' + (H - B - T + 44) + '" class="' + (sel ? 'col-sel' : 'col-hit') + '"/>');
      if (st.consensus) {
        s.push('<line x1="' + f2(px) + '" x2="' + f2(px) + '" y1="' + f2(y(st.max)) + '" y2="' + f2(y(st.min)) + '" class="mini-rng"/>');
        [st.max, st.min].forEach(function (v) { s.push('<line x1="' + f2(px - 5) + '" x2="' + f2(px + 5) + '" y1="' + f2(y(v)) + '" y2="' + f2(y(v)) + '" class="mini-rng"/>'); });
        s.push('<rect x="' + f2(px - 8) + '" y="' + f2(y(st.q3)) + '" width="16" height="' + f2(Math.max(2, y(st.q1) - y(st.q3))) + '" class="m-band2"/>');
        s.push('<circle cx="' + f2(px) + '" cy="' + f2(y(st.median)) + '" r="5" class="m-fresh"/>');
      } else {
        g.entries.forEach(function (e) { s.push('<circle cx="' + f2(px) + '" cy="' + f2(y(e.rec.point_value)) + '" r="4" class="m-stale"/>'); });
      }
      s.push('<text x="' + f2(px) + '" y="' + (H - B + 16) + '" class="tick' + (sel ? ' sel' : '') + '" text-anchor="middle">' + esc(M.periodShort(g.period)) + '</text>');
      s.push('<text x="' + f2(px) + '" y="' + (H - B + 30) + '" class="rowsub" text-anchor="middle">n=' + st.n + '</text>');
      s.push('</g>');
    });
    s.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" class="axis"/>');
    s.push('</svg>');
    return s.join('');
  };

  /* ---- Wilson interval chart for the illustrative track-record panel ---- */
  M.wilsonChart = function (rows, minN) {
    var W = 760, L = 150, R = 130, T = 30, RH = 34, B = 34, H = T + rows.length * RH + B, iw = W - L - R;
    var x = function (p) { return L + p * iw; };
    var s = ['<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Illustrative hit rate with 95 percent Wilson interval for placeholder forecasters A to F. Placeholder numbers, not real scores.">'];
    [0, 0.25, 0.5, 0.75, 1].forEach(function (p) {
      s.push('<line x1="' + x(p) + '" x2="' + x(p) + '" y1="' + T + '" y2="' + (H - B) + '" class="' + (p === 0.5 ? 'm-fence' : 'grid') + '"/>');
      s.push('<text x="' + x(p) + '" y="' + (H - B + 16) + '" class="tick" text-anchor="middle">' + Math.round(p * 100) + '%</text>');
    });
    s.push('<text x="' + x(0.5) + '" y="' + (T - 10) + '" class="tick" text-anchor="middle">50% reference</text>');
    rows.forEach(function (r, i) {
      var cy = T + i * RH + RH / 2;
      s.push('<text x="' + (L - 12) + '" y="' + (cy - 1) + '" class="rowlab" text-anchor="end">' + esc(r.name) + '</text>');
      s.push('<text x="' + (L - 12) + '" y="' + (cy + 11) + '" class="rowsub" text-anchor="end">n=' + r.n + ' scored</text>');
      if (r.n < minN) {
        s.push('<text x="' + x(0.02) + '" y="' + (cy + 4) + '" class="vlab">withheld: n=' + r.n + ' is below the minimum of ' + minN + '</text>');
        return;
      }
      var w = M.wilson(r.k, r.n);
      s.push('<line x1="' + f2(x(w.lo)) + '" x2="' + f2(x(w.hi)) + '" y1="' + cy + '" y2="' + cy + '" class="mini-rng" stroke-width="2.5"/>');
      s.push('<circle cx="' + f2(x(w.p)) + '" cy="' + cy + '" r="5.5" class="m-fresh"/>');
      s.push('<text x="' + f2(x(w.hi) + 8) + '" y="' + (cy + 4) + '" class="vlab">' + Math.round(w.p * 100) + '% (' + Math.round(w.lo * 100) + '-' + Math.round(w.hi * 100) + ')</text>');
    });
    s.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" class="axis"/></svg>');
    return s.join('');
  };
})();
