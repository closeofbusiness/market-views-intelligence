/* Market Views Intelligence - Assumption check page. Descriptive only. Uses the existing consensus groups (M.G) and outlier rule (M.outlierTest); no second implementation of the statistics. */
(function () {
  'use strict';
  var M = window.MVI, P = M.pages, esc = M.esc;
  var PREFILL_KEY = M.gkey('FED_CUM_CHANGE', '', '2026');
  var MIN_BAND = 8; // below this many sources no middle-half band is drawn and no middle-half wording is used
  var S = { key: null, val: null }; // in-memory only; nothing is written to storage, the address bar or the network

  var consensusGroups = function () {
    var G = M.G(), out = [];
    Object.keys(G).forEach(function (k) { if (G[k].stats.consensus) out.push(G[k]); });
    return out;
  };
  var prefillGroup = function () {
    var G = M.G(), g = G[PREFILL_KEY];
    if (g && g.stats.consensus) return g;
    var best = null;
    consensusGroups().forEach(function (c) { if (!best || c.stats.n > best.stats.n || (c.stats.n === best.stats.n && c.key < best.key)) best = c; });
    return best;
  };
  var decimals = function (id) { var u = M.unitName(id); return u === 'basis points' ? 0 : u === 'percent' ? 2 : u === 'exchange rate' && M.fmtBare(id, 1.23456).split('.')[1].length === 3 ? 3 : 1; };
  var defaultVal = function (g) { return g.key === PREFILL_KEY ? '-50' : String(Number(g.stats.median.toFixed(decimals(g.id)))); };
  var hrefFor = function (g) { return '#/assumption/' + g.id + '/' + (g.measure || '-') + '/' + encodeURIComponent(g.period); };
  var parseVal = function (s) { if (s === null || s === '' || s === undefined) return null; var n = Number(s); return isFinite(n) ? n : null; };

  var dates = function (g) {
    var d = g.entries.map(function (e) { return e.rec.as_of_date; }).sort();
    return { oldest: d[0], newest: d[d.length - 1] };
  };

  /* position in words only, never a percentile and never a colour */
  var position = function (g, x) {
    var st = g.stats, EPS = 1e-9, band = st.n >= MIN_BAND;
    if (band && x >= st.q1 - EPS && x <= st.q3 + EPS) return 'within the middle half of published views';
    if (x >= st.min - EPS && x <= st.max + EPS) return 'within published views';
    return 'outside all published views';
  };

  var honest = function (g) { return 'Based on ' + g.stats.n + ' sources in a one-time sample; values carry different dates.'; };

  var figures = function (g, x) {
    var st = g.stats, id = g.id, d = dates(g), left = M.state.stale ? g.nStale : 0;
    var t = [
      ['Median', M.fmtV(id, st.median, true), 'of the latest value per source'],
      ['Interquartile range', M.fmtSpread(id, st.q3 - st.q1), M.fmtV(id, st.q1) + ' to ' + M.fmtV(id, st.q3)],
      ['Sources', String(st.n), 'range ' + M.fmtV(id, st.min) + ' to ' + M.fmtV(id, st.max)],
      ['Dates of these views', M.fmtDate(d.newest), 'newest; oldest ' + M.fmtDate(d.oldest)],
      ['Older views left out', String(left), M.state.stale ? 'by the 90-day rule (of ' + g.nAll + ' sources with a value)' : 'stale values are included (header switch)'],
      ['Distance from median', x === null ? 'n/a' : M.fmtDiff(id, x - st.median), x === null ? 'type a number' : 'typed value minus median']
    ];
    return '<div class="tiles tiles-sm ac-fig">' + t.map(function (a) {
      return '<div class="tile static"><span class="tile-k">' + esc(a[0]) + '</span><span class="tile-v">' + esc(a[1]) + '</span><span class="tile-s">' + esc(a[2]) + '</span></div>';
    }).join('') + '</div>';
  };

  /* older views left out by the 90-day rule: only said when they change the reading (value outside the current range, inside the range of all latest values) */
  var olderNote = function (g, x) {
    if (!M.state.stale || !g.nStale || position(g, x) !== 'outside all published views') return '';
    var all = M.groups(false)[g.key], EPS = 1e-9;
    if (!all || x < all.stats.min - EPS || x > all.stats.max + EPS) return '';
    var old = all.entries.filter(function (e) { return e.stale; }).map(function (e) { return e.rec.as_of_date; }).sort();
    return 'With the ' + old.length + ' older views included, the value is within published views (oldest of those: ' + M.fmtDate(old[0]) + ').';
  };

  var posBlock = function (g, x) {
    var st = g.stats, id = g.id, h = [];
    if (x === null) {
      h.push('<p class="ac-pos"><span class="k">Position</span>Type a number to see where it sits among the published views.</p>');
    } else {
      var dev = x - st.median, flag = M.outlierTest(st, x);
      h.push('<p class="ac-pos"><span class="k">Position</span>Typed value ' + esc(M.fmtV(id, x, true)) + ': ' + position(g, x) + '.</p>');
      var older = olderNote(g, x);
      if (older) h.push('<p class="ac-line"><span class="k">Older views</span>' + esc(older) + '</p>');
      h.push('<p class="ac-line"><span class="k">Outlier rule</span>The existing outlier rule ' + (flag ? 'would flag' : 'would not flag') + ' this value: it ' + (dev === 0 ? 'equals' : 'is ' + esc(M.fmtSpread(id, dev)) + (dev > 0 ? ' above' : ' below')) + ' the median, and the threshold is ' + esc(M.fmtSpread(id, st.thr)) + ' (the larger of the floor ' + esc(M.fmtSpread(id, st.floor)) + ' and 3 × 1.4826 × MAD). The typed value is not added to the group.</p>');
    }
    if (st.n < MIN_BAND) h.push('<p class="ac-line muted">Fewer than ' + MIN_BAND + ' sources: no middle-half band is drawn and no middle-half wording is used.</p>');
    else if (st.q1 === st.q3) h.push('<p class="ac-line muted">The middle half of published views sits at a single value.</p>');
    h.push('<p class="ac-honest">' + esc(honest(g)) + '</p>');
    return h.join('');
  };

  var viewCard = function (label, e, g, x, ties) {
    var r = e.rec, id = g.id, d = r.point_value - x;
    var others = ties.filter(function (o) { return o !== e; });
    return '<article class="card acard"><header><h3>' + esc(label) + '</h3></header>' +
      '<p class="sub"><b>' + esc(e.fc) + '</b>' + (r.attributed_institution ? ' <span class="muted">(quoted in a ' + esc(r.institution) + ' document)</span>' : '') + ' · <button type="button" class="val" data-rec="' + r.id + '" title="Open the quote and source">' + esc(M.fmtV(id, r.point_value, true)) + '</button> · as of ' + esc(M.fmtDate(r.as_of_date)) + ' · ' + esc(M.basisShort(r.basis)) + (e.stale ? ' ' + M.chip('stale', 'Stale') : '') + '</p>' +
      '<p class="sub">' + (d === 0 ? 'Equal to the typed value.' : esc(M.fmtSpread(id, d)) + (d > 0 ? ' above' : ' below') + ' the typed value.') + (others.length ? ' ' + others.length + ' other ' + (others.length === 1 ? 'source publishes' : 'sources publish') + ' the same value: ' + esc(others.map(function (o) { return o.fc; }).join(', ')) + '.' : '') + '</p>' +
      M.quoteBlock(r) + '<p class="cite">' + M.srcLink(r) + ' <span class="muted">' + esc(M.titleOf(r)) + '</span></p></article>';
  };

  var cards = function (g, x) {
    if (x === null) return '';
    var E = g.entries.slice(), dist = function (e) { return Math.abs(e.rec.point_value - x); };
    var order = function (a, b) { return (b.rec.as_of_date > a.rec.as_of_date ? 1 : b.rec.as_of_date < a.rec.as_of_date ? -1 : 0) || (a.fc < b.fc ? -1 : 1); };
    var near = E.slice().sort(function (a, b) { return dist(a) - dist(b) || order(a, b); })[0];
    var far = E.slice().sort(function (a, b) { return dist(b) - dist(a) || order(a, b); })[0];
    var same = function (e) { return E.filter(function (o) { return o.rec.point_value === e.rec.point_value; }); };
    return '<div class="cards ac-cards">' + viewCard('Nearest published view', near, g, x, same(near)) + viewCard('Furthest published view', far, g, x, same(far)) + '</div>' +
      '<p class="note">When several sources share a value, the card shows the one with the newest date, then the first by name.</p>';
  };

  /* update the result areas in place while typing (keeps the input focused) */
  P.acUpdate = function (el) {
    var g = M.G()[el.getAttribute('data-gk')]; if (!g) return;
    S.val = el.value;
    var x = parseVal(S.val);
    document.getElementById('ac-plot').innerHTML = M.stripPlot(g, x, g.stats.n >= MIN_BAND);
    document.getElementById('ac-fig').innerHTML = figures(g, x);
    document.getElementById('ac-pos').innerHTML = posBlock(g, x);
    document.getElementById('ac-cards').innerHTML = cards(g, x);
  };

  P.assumption = function (args) {
    var G = M.G(), g = null, note = '';
    if (args && args[0] && args[1] && args[2]) {
      var req = G[M.gkey(args[0], args[1] === '-' ? '' : args[1], decodeURIComponent(args[2]))];
      if (req && req.stats.consensus) g = req;
      else note = '<p class="note">The group in the link has fewer than 4 sources under the current settings, so the default example is shown.</p>';
    }
    if (!g) g = prefillGroup();
    if (S.key !== g.key) { S.key = g.key; S.val = defaultVal(g); }
    var x = parseVal(S.val), id = g.id, st = g.stats;

    /* selector, labelled as on the Variable view, groups with a consensus only */
    var cg = consensusGroups(), sel = ['<select id="ac-group" data-sel="acgroup" aria-label="Variable and horizon">'];
    M.CATS.forEach(function (c) {
      var inCat = cg.filter(function (k) { return M.varCat(k.id) === c[0]; });
      if (!inCat.length) return;
      var order = {}; M.pairs().forEach(function (p, i) { order[p.id + '|' + p.measure] = i; });
      inCat.sort(function (a, b) { return (order[a.id + '|' + a.measure] - order[b.id + '|' + b.measure]) || M.periodCmp(a.period, b.period); });
      sel.push('<optgroup label="' + esc(c[1]) + '">');
      inCat.forEach(function (k) { sel.push('<option value="' + esc(k.key) + '"' + (k.key === g.key ? ' selected' : '') + '>' + esc(M.fullLabel(k.id, k.measure) + ', ' + M.periodLabel(k.period) + '  (n=' + k.stats.n + ')') + '</option>'); });
      sel.push('</optgroup>');
    });
    sel.push('</select>');

    var h = ['<h1>Assumption check</h1>',
      '<p class="banner info ac-notice" role="note">Type any number. Nothing is stored or sent. In a pilot this would be the bank’s own assumption or stress path. Descriptive only: not a test of whether an assumption is right.</p>',
      note,
      '<section class="card ac-main" id="ac-main"><div class="controls"><label>Variable and horizon' + sel.join('') + '</label>' +
      '<label>Typed value <span class="ac-inp"><input type="number" id="ac-val" step="any" inputmode="decimal" data-sel="acval" data-gk="' + esc(g.key) + '" value="' + esc(S.val === null ? '' : S.val) + '" aria-describedby="ac-unit"> <span id="ac-unit" class="ac-unit">' + esc(M.unitName(id)) + '</span></span>' + (g.key === PREFILL_KEY ? '<span class="ac-hint">Example: a plan that assumes two rate cuts in 2026.</span>' : '') + '</label></div>',
      '<h2 class="vh">' + esc(M.fullLabel(id, g.measure)) + ', ' + esc(M.periodLabel(g.period)) + '</h2>',
      M.legend([['dot', 'published value (latest per source)'], ['out', 'flagged by the outlier rule']].concat(st.n >= MIN_BAND ? [['band', 'middle half of published views']] : []).concat([['med', 'median'], ['fence', 'outlier threshold'], ['typed', 'typed value']])),
      '<div id="ac-plot">' + M.stripPlot(g, x, st.n >= MIN_BAND) + '</div>',
      '<div id="ac-fig">' + figures(g, x) + '</div>',
      '<div id="ac-pos" aria-live="polite">' + posBlock(g, x) + '</div>',
      '<p class="note">Statistics are the Variable view’s: latest value per source, central bank projections excluded, ' + (M.state.stale ? 'stale values excluded' : 'stale values included') + ', at least 4 sources. <a href="' + esc(M.varHref(g.id, g.measure, g.period)) + '">Open this group on the Variable view</a>.</p></section>',
      '<div id="ac-cards">' + cards(g, x) + '</div>'];

    /* Narrow ranges */
    var narrow = cg.slice().sort(function (a, b) {
      return ((a.stats.q3 - a.stats.q1) / a.stats.floor) - ((b.stats.q3 - b.stats.q1) / b.stats.floor) || b.stats.n - a.stats.n || (a.key < b.key ? -1 : 1);
    });
    h.push('<section class="card"><div class="card-h"><h2>Narrow ranges</h2><span class="sub">' + narrow.length + ' groups with 4 or more sources, sorted by interquartile range divided by the variable’s outlier floor, smallest first</span></div>' +
      '<p class="lede ac-lede">A narrow range means published views agree. It does not mean they are right.</p>' +
      '<div class="tscroll"><table class="tbl"><caption class="sr">Groups with a consensus, from the narrowest interquartile range relative to the outlier floor to the widest.</caption><thead><tr><th scope="col">Variable</th><th scope="col">Horizon</th><th scope="col" class="num">Sources</th><th scope="col" class="num">Median</th><th scope="col" class="num">Interquartile range</th></tr></thead><tbody>' +
      narrow.map(function (k) {
        var s = k.stats;
        return '<tr><th scope="row" class="fc"><a href="' + esc(hrefFor(k)) + '">' + esc(M.fullLabel(k.id, k.measure)) + '</a></th><td>' + esc(M.periodLabel(k.period)) + '</td><td class="num">' + s.n + '</td><td class="num">' + esc(M.fmtV(k.id, s.median, true)) + '</td><td class="num">' + esc(M.fmtSpread(k.id, s.q3 - s.q1)) + ' <span class="muted">(' + esc(M.fmtBare(k.id, s.q1)) + ' to ' + esc(M.fmtBare(k.id, s.q3)) + ')</span></td></tr>';
      }).join('') + '</tbody></table></div></section>');

    /* Dissent register */
    var outs = M.allOutliers(M.state.stale), nProse = outs.filter(function (o) { return !M.isTableRow(o.e.rec.source_quote); }).length;
    h.push('<section class="card"><div class="card-h"><h2>Dissent register</h2><span class="sub">' + outs.length + ' flagged outliers (' + (M.state.stale ? 'stale values excluded' : 'stale values included') + '); ' + nProse + ' carry prose reasoning. Ranked by distance from the median in multiples of the group floor.</span></div>' +
      '<div class="tscroll"><table class="tbl ac-dissent"><caption class="sr">Flagged outliers with their stated reasoning, date and source, and an empty column for a committee response.</caption><thead><tr><th scope="col">Institution</th><th scope="col">Variable and horizon</th><th scope="col" class="num">Their value</th><th scope="col" class="num">Median</th><th scope="col">Date</th><th scope="col">Reasoning</th><th scope="col">Source</th><th scope="col" class="resp-h">Committee response (design)</th></tr></thead><tbody>' +
      outs.map(function (o) {
        var r = o.e.rec, k = o.g, tbl = M.isTableRow(r.source_quote);
        return '<tr><th scope="row" class="fc">' + esc(o.e.fc) + '</th><td><a href="' + esc(M.varHref(k.id, k.measure, k.period)) + '">' + esc(M.fullLabel(k.id, k.measure)) + '</a>, ' + esc(M.periodLabel(k.period)) + '</td><td class="num"><button type="button" class="val" data-rec="' + r.id + '" title="Open the quote and source">' + esc(M.fmtV(k.id, r.point_value, true)) + '</button></td><td class="num">' + esc(M.fmtV(k.id, k.stats.median, true)) + '</td><td class="nowrap">' + esc(M.fmtDate(r.as_of_date)) + '</td><td class="quote-c">' + (tbl ? '<span class="muted">table row only</span>' : '“' + esc(r.source_quote) + '”') + '</td><td>' + M.srcLink(r) + '</td><td class="resp"></td></tr>';
      }).join('') + '</tbody></table></div><p class="note">The last column is empty on purpose: in a pilot the committee’s answer to each dissent would be recorded there.</p></section>');
    return { title: 'Assumption check', html: h.join('') };
  };
})();
