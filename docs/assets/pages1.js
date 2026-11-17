/* Market Views Intelligence - pages: overview, variable view, outliers, drawers. */
(function () {
  'use strict';
  var M = window.MVI, esc = M.esc, D = M.D;
  var P = (M.pages = {});

  /* ---------- shared fragments ---------- */
  var varHref = function (id, meas, period) { return '#/variable/' + id + '/' + (meas || '-') + '/' + encodeURIComponent(period); };
  M.varHref = varHref;
  var srcLink = function (r, label) {
    return r.document_url ? '<a class="src" href="' + esc(r.document_url) + '" target="_blank" rel="noopener noreferrer">' + esc(label || 'Source document') + ' <span aria-hidden="true">↗</span></a>' : '<span class="muted">no link</span>';
  };
  M.srcLink = srcLink;
  var valBtn = function (r, text, cls) {
    return '<button type="button" class="val ' + (cls || '') + '" data-rec="' + r.id + '" title="Open the quote and source">' + esc(text) + '</button>';
  };
  var chip = function (kind, text) { return '<span class="chip chip-' + kind + '">' + esc(text) + '</span>'; };
  var diamond = '<svg class="dmd" width="10" height="10" viewBox="-6 -6 12 12" aria-hidden="true"><path d="M0-5.5L5.5 0 0 5.5-5.5 0z" class="m-out"/></svg>';
  M.chip = chip;
  // a quote is labelled "Their stated reasoning" only when it is prose; table rows get their own label and a tidy monospace form
  M.quoteBlock = function (r) {
    var q = r.source_quote;
    if (M.isTableRow(q)) {
      var cells = M.tableRowCells(q), lead = [], i = 0;
      while (i < cells.length && !/^[-\u2212+]?[\d.,]+%?$/.test(cells[i])) { lead.push(cells[i]); i++; }
      var rest = cells.slice(i);
      return '<blockquote class="trow"><span class="k">Source table row</span><span class="lab">' + esc(lead.join(' ')) + '</span><span class="cells">' + rest.map(esc).join(' <i>|</i> ') + '</span></blockquote>';
    }
    return '<blockquote><span class="k">Their stated reasoning</span>\u201c' + esc(q) + '\u201d</blockquote>';
  };
  M.quoteCell = function (r) {
    if (M.isTableRow(r.source_quote)) return '<span class="badge tbl-b">table row</span> <span class="trow-i">' + esc(M.tableRowCells(r.source_quote).join(' | ')) + '</span>';
    return '\u201c' + esc(r.source_quote) + '\u201d';
  };
  var plural = function (n, a, b) { return n + ' ' + (n === 1 ? a : (b || a + 's')); };
  var pct = function (a, b) { return b ? Math.round(100 * a / b) + '%' : 'n/a'; };

  var staleNote = function () {
    return M.state.stale ? '<p class="note">Stale values (more than 90 days older than the newest value in their group) are excluded; statistics are recomputed on what remains.</p>' : '';
  };

  /* ---------- OVERVIEW ---------- */
  P.overview = function () {
    var F = D.forecasts, docs = D.documents;
    var instDocs = M.institutions();
    var instF = {}; F.forEach(function (f) { instF[f.institution] = 1; });
    var fcNames = {}; F.forEach(function (f) { fcNames[M.forecaster(f)] = 1; });
    var varIds = {}; F.forEach(function (f) { varIds[f.variable_id] = 1; });
    var G = M.G(), nG = Object.keys(G).length;
    var nCons = Object.keys(G).filter(function (k) { return G[k].stats.consensus; }).length;
    var abst = docs.filter(function (d) { return !d.n_forecasts; }).length;
    var recent = docs.filter(function (d) { return M.dayNum(M.NEWEST) - M.dayNum(d.as_of_date) <= M.STALE_DAYS; }).length;
    var W = M.waterfall;
    var tiles = [
      ['docs', 'Documents', docs.length, 'public research documents; ' + abst + ' of ' + docs.length + ' yielded no forecast'],
      ['inst', 'Institutions', instDocs.length, 'publishers of the ' + docs.length + ' documents; ' + Object.keys(instF).length + ' of ' + instDocs.length + ' contribute forecasts'],
      ['fc', 'Forecasts', F.length, W.eligible + ' of ' + F.length + ' (' + pct(W.eligible, F.length) + ') enter the consensus; ' + W.centralBank + ' central bank projections are shown separately'],
      ['vars', 'Variables', Object.keys(varIds).length, nG + ' variable/period groups; ' + nCons + ' of ' + nG + ' have 4 or more sources' + (M.state.stale ? ' (stale excluded)' : '')],
      ['dates', 'Date range', M.fmtDate(M.OLDEST).replace(/^\d+ /, '') + ' – ' + M.fmtDate(M.NEWEST).replace(/^\d+ /, ''), recent + ' of ' + docs.length + ' documents dated within 90 days of the newest (' + M.fmtDate(M.NEWEST) + ')']
    ];
    var h = ['<h1>Overview</h1>',
      '<p class="lede">What other banks expect for rates, FX, inflation, policy rates and commodities: where views cluster, where they split, and who sits outside the pack, each number traceable to the sentence it came from.</p>',
      '<div class="tiles">' + tiles.map(function (t) {
        return '<button type="button" class="tile" data-tile="' + t[0] + '"><span class="tile-k">' + esc(t[1]) + '</span><span class="tile-v' + (String(t[2]).length > 12 ? ' tv-sm' : '') + '">' + esc(t[2]) + '</span><span class="tile-s">' + esc(t[3]) + '</span></button>';
      }).join('') + '</div>',
      (function () { var pv = D.podcasts || [], sp = {}; pv.forEach(function (x) { sp[x.person] = 1; }); return '<p class="podline"><b>' + pv.length + ' podcast views from ' + Object.keys(sp).length + ' speakers</b>, shown separately from the written-research consensus below. <a href="#/podcasts">Open Podcast &amp; interview views</a></p>'; })(),
      '<p class="podline"><b>Intended use:</b> internal use inside a financial institution; not a client product and not for redistribution. <a href="#/method">See Method &amp; data</a></p>'];

    // heat table
    var cols = M.heatColumns();
    h.push('<section class="card"><div class="card-h"><h2>Consensus heat table</h2><span class="sub">Median of the latest value per forecaster. Columns: the ' + cols.length + ' most populated upcoming target periods (ending after ' + esc(M.fmtDate(M.NEWEST)) + '). Click a cell for the variable view.</span></div>');
    h.push(staleNote());
    var rows = {};
    Object.keys(G).forEach(function (k) {
      var g = G[k];
      if (!cols.some(function (c) { return c.period === g.period; })) return;
      var rk = g.id + '|' + g.measure;
      rows[rk] = rows[rk] || { id: g.id, measure: g.measure };
    });
    var pairs = M.pairs().filter(function (p) { return rows[p.id + '|' + p.measure]; });
    h.push('<div class="tscroll"><table class="heat"><caption class="sr">Consensus medians by variable and target period. Each cell shows the median, the number of forecasters n, a range bar (line = min to max, box = interquartile range, tick = median) and the interquartile range.</caption><thead><tr><th scope="col">Variable</th>');
    cols.forEach(function (c) { h.push('<th scope="col">' + esc(M.periodLabel(c.period)) + '<span class="th-s">' + c.count + ' values</span></th>'); });
    h.push('</tr></thead><tbody>');
    M.CATS.forEach(function (cat) {
      var rs = pairs.filter(function (p) { return M.varCat(p.id) === cat[0]; });
      if (!rs.length) return;
      h.push('<tr class="cat"><th colspan="' + (cols.length + 1) + '" scope="colgroup">' + esc(cat[1]) + '</th></tr>');
      rs.forEach(function (p) {
        var firstPeriod = null;
        var tds = cols.map(function (c) {
          var g = G[M.gkey(p.id, p.measure, c.period)];
          if (!g || !g.entries.length) return '<td class="empty"><span class="muted">–</span></td>';
          if (!firstPeriod || g.stats.n > G[M.gkey(p.id, p.measure, firstPeriod)].stats.n) firstPeriod = c.period;
          var st = g.stats, href = varHref(p.id, p.measure, c.period);
          if (st.consensus) {
            var bin = st.n >= 8 ? 3 : st.n >= 6 ? 2 : 1;
            return '<td class="bin-' + bin + '"><a class="cell" href="' + esc(href) + '" title="' + esc(M.fullLabel(p.id, p.measure) + ', ' + M.periodLabel(c.period) + ': median ' + M.fmtV(p.id, st.median, true) + ', n=' + st.n + ', IQR ' + M.fmtSpread(p.id, st.q3 - st.q1) + ', range ' + M.fmtV(p.id, st.min) + ' to ' + M.fmtV(p.id, st.max) + (st.outliers ? ', ' + plural(st.outliers, 'outlier') : '')) + '">' +
              '<span class="c1"><b class="cv">' + esc(M.fmtV(p.id, st.median)) + '</b><span class="cn">n=' + st.n + '</span>' + (st.outliers ? '<span class="obadge" title="' + plural(st.outliers, 'outlier') + '">' + diamond + st.outliers + '</span>' : '') + '</span>' +
              '<span class="c2">' + M.miniBar(g, 52) + '<span class="ciqr">IQR ' + esc(M.fmtSpread(p.id, st.q3 - st.q1).replace(' pp', '')) + '</span></span></a></td>';
          }
          var vs = g.entries.map(function (e) { return e.rec.point_value; }).sort(function (a, b) { return a - b; });
          var shown = vs.slice(0, 3).map(function (v) { return M.fmtV(p.id, v); }).join(' / ') + (vs.length > 3 ? ' ...' : '');
          return '<td class="few"><a class="cell" href="' + esc(href) + '" title="' + esc('Too few sources for a consensus (n=' + st.n + ' of 4 needed)') + '"><span class="c1"><span class="cv-few">' + esc(shown) + '</span></span><span class="c2"><span class="cn">n=' + st.n + ' · too few sources</span></span></a></td>';
        });
        var rowHref = firstPeriod ? varHref(p.id, p.measure, firstPeriod) : '#/variable';
        h.push('<tr><th scope="row"><a href="' + esc(rowHref) + '">' + esc(M.fullLabel(p.id, p.measure)) + '</a><span class="th-s">' + esc(M.unitName(p.id)) + '</span></th>' + tds.join('') + '</tr>');
      });
    });
    h.push('</tbody></table></div>');
    h.push('<div class="legend-row">' + '<span class="swatch bin-1"></span> n = 4–5 <span class="swatch bin-2"></span> n = 6–7 <span class="swatch bin-3"></span> n ≥ 8 <span class="swatch few"></span> n &lt; 4: individual values, no consensus ' + diamond + ' outlier count ' +
      '<span class="muted">Range bar: line = min to max, box = interquartile range, tick = median.</span></div>');
    var hidden = pairs.length;
    h.push('<p class="note">' + hidden + ' of ' + M.pairs().length + ' variable series have at least one value in these ' + cols.length + ' periods and are shown. The sample is small and mixes publication dates (' + esc(M.fmtDate(M.OLDEST)) + ' to ' + esc(M.fmtDate(M.NEWEST)) + '), so this demonstrates the product; it is not a market survey. See <a href="#/method">Method &amp; data</a>.</p></section>');

    // top outliers
    var outs = M.allOutliers(M.state.stale).slice(0, 5);
    var nOut = M.allOutliers(M.state.stale).length;
    h.push('<section class="card"><div class="card-h"><h2>Furthest from the pack</h2><span class="sub">Top 5 of ' + nOut + ' flagged outliers, ranked by distance from the median in multiples of the group floor. <a href="#/outliers">All outliers</a></span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Variable, period</th><th>Forecaster</th><th class="num">Value</th><th class="num">Median (n)</th><th class="num">Distance</th></tr></thead><tbody>');
    outs.forEach(function (o) {
      h.push('<tr><td><a href="' + esc(varHref(o.g.id, o.g.measure, o.g.period)) + '">' + esc(M.fullLabel(o.g.id, o.g.measure)) + '</a>, ' + esc(M.periodLabel(o.g.period)) + '</td><td>' + esc(o.e.fc) + '</td><td class="num">' + valBtn(o.e.rec, M.fmtV(o.g.id, o.e.rec.point_value)) + '</td><td class="num"><button type="button" class="val" data-group="' + esc(o.g.key) + '">' + esc(M.fmtV(o.g.id, o.g.stats.median)) + '</button> (n=' + o.g.stats.n + ')</td><td class="num">' + o.e.devFloor.toFixed(1) + '× floor</td></tr>');
    });
    h.push('</tbody></table></div></section>');
    return { title: 'Overview', html: h.join('') };
  };

  /* ---------- VARIABLE VIEW ---------- */
  P.variable = function (args) {
    var pairs = M.pairs();
    var sel = null;
    if (args && args[0] && args[1] && args[2]) {
      var key = M.gkey(args[0], args[1] === '-' ? '' : args[1], decodeURIComponent(args[2]));
      sel = M.groups(false)[key] || null;
    }
    if (!sel) sel = M.defaultSelection();
    var id = sel.id, meas = sel.measure, period = sel.period;
    var g = M.group(M.gkey(id, meas, period)) || sel;
    var st = g.stats;
    var pair = pairs.filter(function (p) { return p.id === id && p.measure === meas; })[0];
    var h = ['<h1>Variable view</h1>'];
    // selectors
    h.push('<div class="controls"><label>Variable<select data-sel="var" aria-label="Variable">');
    M.CATS.forEach(function (c) {
      var ps = pairs.filter(function (p) { return M.varCat(p.id) === c[0]; });
      if (!ps.length) return;
      h.push('<optgroup label="' + esc(c[1]) + '">');
      ps.forEach(function (p) { h.push('<option value="' + esc(p.id + '|' + p.measure) + '"' + (p === pair ? ' selected' : '') + '>' + esc(M.fullLabel(p.id, p.measure)) + '</option>'); });
      h.push('</optgroup>');
    });
    h.push('</select></label><label>Target period<select data-sel="period" data-var="' + esc(id + '|' + meas) + '" aria-label="Target period">');
    pair.periods.forEach(function (pp) {
      var gg = M.groups(false)[M.gkey(id, meas, pp)];
      h.push('<option value="' + esc(pp) + '"' + (pp === period ? ' selected' : '') + '>' + esc(M.periodLabel(pp) + '  (n=' + gg.nAll + ')') + '</option>');
    });
    h.push('</select></label></div>');
    h.push('<h2 class="vh">' + esc(M.fullLabel(id, meas)) + ', ' + esc(M.periodLabel(period)) + '</h2>');
    h.push(staleNote());

    // stat tiles
    var tl = [];
    tl.push(['Forecasters', '<button type="button" class="val big" data-group="' + esc(g.key) + '">' + st.n + '</button>', 'of ' + g.nAll + ' with a value' + (M.state.stale ? ' (' + g.nStale + ' stale excluded)' : '; ' + g.nStale + ' stale')]);
    if (st.consensus) {
      tl.push(['Median', '<button type="button" class="val big" data-group="' + esc(g.key) + '">' + esc(M.fmtV(id, st.median)) + '</button>', 'n=' + st.n + ', ' + M.unitName(id)]);
      tl.push(['Interquartile range', '<span class="big">' + esc(M.fmtBare(id, st.q1)) + ' – ' + esc(M.fmtBare(id, st.q3)) + '</span>', 'width ' + M.fmtSpread(id, st.q3 - st.q1) + ', n=' + st.n]);
      tl.push(['Min – max', '<span class="big">' + esc(M.fmtBare(id, st.min)) + ' – ' + esc(M.fmtBare(id, st.max)) + '</span>', 'spread ' + M.fmtSpread(id, st.max - st.min)]);
      tl.push(['Outlier limit', '<span class="big">±' + esc(M.fmtSpread(id, st.thr)) + '</span>', 'floor ' + M.fmtSpread(id, st.floor) + ', MAD ' + M.fmtSpread(id, st.mad) + ' (3×1.4826×MAD = ' + M.fmtSpread(id, 3 * 1.4826 * st.mad) + ')']);
      tl.push(['Outliers', '<span class="big">' + st.outliers + '</span>', 'of ' + st.n + ' forecasters']);
    } else {
      tl.push(['Consensus', '<span class="big few">not shown</span>', 'n=' + st.n + '; at least 4 sources are required']);
    }
    h.push('<div class="tiles tiles-sm">' + tl.map(function (t) { return '<div class="tile static"><span class="tile-k">' + esc(t[0]) + '</span><span class="tile-v">' + t[1] + '</span><span class="tile-s">' + esc(t[2]) + '</span></div>'; }).join('') + '</div>');

    if (!st.consensus) h.push('<div class="banner warn"><b>Too few sources for a consensus.</b> Only ' + plural(st.n, 'forecaster') + ' (' + (M.state.stale ? 'after excluding stale values' : 'of 4 required') + '). The individual values are shown without a median, band or outlier flag.</div>');
    if (g.mixedBasis) h.push('<div class="banner info"><b>Mixed bases.</b> The values in this group are quoted on different bases (' + g.bases.map(M.basisShort).join(' and ') + '). The method groups by variable, measure and period only, as specified, so they are pooled; the basis is shown on every row.</div>');

    // dot plot
    h.push('<section class="card"><div class="card-h"><h2>Where each forecaster sits</h2><span class="sub">One row per forecaster, latest value. Click a dot for the quote and source.</span></div>');
    h.push(M.legend([['dot', 'latest value'], ['stale', 'stale (over 90 days older than newest)'], ['out', 'outlier']].concat(st.consensus ? [['band', 'interquartile band'], ['med', 'median'], ['fence', 'outlier limit']] : []).concat(g.cb.length ? [['cb', 'central bank projection (not in consensus)']] : [])));
    h.push(M.dotPlot(g) + '</section>');

    // table
    var E = g.entries.slice().sort(function (a, b) { return a.rec.point_value - b.rec.point_value || (a.fc < b.fc ? -1 : 1); });
    h.push('<section class="card"><div class="card-h"><h2>Forecasters, sorted by value</h2><span class="sub">n=' + E.length + '. The sentence is the verbatim excerpt the number was read from.</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Forecaster</th><th class="num">Value</th>' + (st.consensus ? '<th class="num">vs median</th>' : '') + '<th>As of</th><th>Basis</th><th>Flags</th><th>Quote</th><th>Source</th></tr></thead><tbody>');
    E.forEach(function (e) {
      var r = e.rec, fl = [];
      if (e.outlier) fl.push(chip('out', 'Outlier'));
      if (e.stale) fl.push(chip('stale', 'Stale'));
      if (e.alts.length) fl.push('<span class="chip chip-note" title="' + esc('Other values on the same date from this forecaster: ' + e.alts.map(function (a) { return M.fmtV(id, a.point_value) + ' (' + M.basisShort(a.basis) + ')'; }).join(', ') + '. The one matching the group’s most common basis was used.') + '">+' + e.alts.length + ' same-date</span>');
      h.push('<tr class="' + (e.stale ? 'is-stale' : '') + '"><th scope="row" class="fc">' + esc(e.fc) + (r.attributed_institution ? '<span class="th-s">in a ' + esc(r.institution) + ' document</span>' : '') + '</th><td class="num">' + valBtn(r, M.fmtV(id, r.point_value, true)) + '</td>' +
        (st.consensus ? '<td class="num">' + esc(M.fmtDiff(id, e.dev)) + '<span class="th-s">' + e.devFloor.toFixed(1) + '× floor</span></td>' : '') +
        '<td>' + esc(M.fmtDate(r.as_of_date)) + '</td><td>' + esc(M.basisShort(r.basis)) + '</td><td>' + fl.join(' ') + '</td><td class="quote-c">' + M.quoteCell(r) + '</td><td>' + srcLink(r, 'Open') + '<span class="th-s">' + esc(r.institution) + '</span></td></tr>');
    });
    h.push('</tbody></table></div></section>');

    if (g.cb.length) {
      h.push('<section class="card"><div class="card-h"><h2>Central bank projections</h2><span class="sub">Not Street views: excluded from the median, dispersion and outlier tests above (n=' + g.cb.length + ').</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Source</th><th class="num">Value</th><th>As of</th><th>Note</th><th>Quote</th><th>Link</th></tr></thead><tbody>');
      g.cb.slice().sort(function (a, b) { return a.point_value - b.point_value; }).forEach(function (r) {
        var who = M.forecaster(r);
        h.push('<tr><th scope="row" class="fc">' + esc(who) + '<span class="th-s">' + (r.attributed_person ? 'individual policymaker' : 'central bank projection') + '</span></th><td class="num">' + valBtn(r, M.fmtV(id, r.point_value, true)) + '</td><td>' + esc(M.fmtDate(r.as_of_date)) + '</td><td>' + (r.attributed_person ? esc(r.attributed_person) + ' is one policymaker; this is not presented as the institution\u2019s view.' : 'As reported in a ' + esc(r.institution) + ' document.') + '</td><td class="quote-c">' + M.quoteCell(r) + '</td><td>' + srcLink(r, 'Open') + '</td></tr>');
      });
      h.push('</tbody></table></div></section>');
    }
    // path chart
    h.push('<section class="card"><div class="card-h"><h2>Path across target periods</h2><span class="sub">' + esc(M.fullLabel(id, meas)) + '. Dot = median (n of 4 or more); box = interquartile range; line = min to max. Hollow dots = individual values where n is below 4. Click a column to select that period.</span></div>');
    h.push(M.legend([['dot', 'median'], ['band', 'interquartile range'], ['stale', 'individual value, n below 4']]));
    h.push(M.pathChart(id, meas, period, function (pp) { return varHref(id, meas, pp); }) + '</section>');
    return { title: 'Variable view', html: h.join('') };
  };

  /* ---------- OUTLIERS ---------- */
  var oCat = 'all', oProse = false;
  P.setOprose = function (v) { oProse = v; };
  P.setOcat = function (v) { oCat = v; };
  P.outliers = function () {
    var all = M.allOutliers(M.state.stale);
    var nWith = M.allOutliers(false).length, nWithout = M.allOutliers(true).length;
    var G = M.G(), nCons = Object.keys(G).filter(function (k) { return G[k].stats.consensus; }).length;
    var nProse = all.filter(function (o) { return !M.isTableRow(o.e.rec.source_quote); }).length;
    var list = all.filter(function (o) { return (oCat === 'all' || M.varCat(o.g.id) === oCat) && (!oProse || !M.isTableRow(o.e.rec.source_quote)); });
    var h = ['<h1>Outliers &amp; contrarians</h1>',
      '<p class="lede">Forecasters whose value sits further from the median than the outlier limit: the larger of a per-variable floor and 3 × 1.4826 × MAD. Only groups with at least 4 sources are tested. Ranked by distance from the median in multiples of the floor.</p>',
      '<div class="tiles tiles-sm"><div class="tile static"><span class="tile-k">Flagged outliers</span><span class="tile-v">' + (M.state.stale ? nWithout : nWith) + '</span><span class="tile-s">' + (M.state.stale ? 'stale values excluded' : 'stale values included') + '; ' + nCons + ' consensus groups tested</span></div>' +
      '<div class="tile static"><span class="tile-k">Stale included</span><span class="tile-v">' + nWith + '</span><span class="tile-s">across ' + Object.keys(M.groups(false)).filter(function (k) { return M.groups(false)[k].stats.consensus; }).length + ' groups with n ≥ 4</span></div>' +
      '<div class="tile static"><span class="tile-k">Stale excluded</span><span class="tile-v">' + nWithout + '</span><span class="tile-s">across ' + Object.keys(M.groups(true)).filter(function (k) { return M.groups(true)[k].stats.consensus; }).length + ' groups with n ≥ 4</span></div></div>',
      '<div class="controls"><label>Category<select data-sel="ocat" aria-label="Category"><option value="all">All categories</option>' + M.CATS.map(function (c) { return '<option value="' + c[0] + '"' + (oCat === c[0] ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('') + '</select></label><label class="chk"><input type="checkbox" data-sel="oprose"' + (oProse ? ' checked' : '') + '> With stated reasoning only (' + nProse + ' of ' + all.length + ')</label><span class="muted">Showing ' + list.length + ' of ' + all.length + '.</span></div>'];
    h.push('<div class="cards">');
    list.forEach(function (o, i) {
      var g = o.g, e = o.e, r = e.rec, id = g.id, st = g.stats;
      h.push('<article class="card ocard"><header><span class="rank">' + (i + 1) + '</span><div><h3><a href="' + esc(varHref(id, g.measure, g.period)) + '">' + esc(M.fullLabel(id, g.measure)) + '</a>, ' + esc(M.periodLabel(g.period)) + (M.isTableRow(r.source_quote) ? '' : '<span class="badge">reasoning stated</span>') + '</h3><p class="sub">' + esc(e.fc) + (r.attributed_institution ? ' (quoted in a ' + esc(r.institution) + ' document)' : '') + ' · as of ' + esc(M.fmtDate(r.as_of_date)) + ' · ' + esc(M.basisShort(r.basis)) + (e.stale ? ' ' + chip('stale', 'Stale') : '') + '</p></div></header>' +
        '<div class="ometrics"><div><span class="k">Their value</span>' + valBtn(r, M.fmtV(id, r.point_value, true), 'big') + '</div><div><span class="k">Median (n=' + st.n + ')</span><button type="button" class="val big" data-group="' + esc(g.key) + '">' + esc(M.fmtV(id, st.median, true)) + '</button></div><div><span class="k">Distance</span><span class="big">' + esc(M.fmtDiff(id, e.dev)) + '</span></div><div><span class="k">In floor multiples</span><span class="big">' + e.devFloor.toFixed(1) + '×</span><span class="th-s">floor ' + esc(M.fmtSpread(id, st.floor)) + ' (' + esc(M.floorText(id)) + '); limit ' + esc(M.fmtSpread(id, st.thr)) + '</span></div></div>' +
        M.numberLine(g, e) +
        M.quoteBlock(r) + '<p class="cite">' + srcLink(r) + ' <span class="muted">' + esc(M.titleOf(r)) + '</span></p></article>');
    });
    h.push('</div>');
    return { title: 'Outliers & contrarians', html: h.join('') };
  };

  /* ---------- DRAWER CONTENT ---------- */
  P.recordDrawer = function (id) {
    var r = D.forecasts[id], vid = r.variable_id;
    var g = M.group(M.gkey(vid, r.measure, r.target_period)) || M.groups(false)[M.gkey(vid, r.measure, r.target_period)];
    var ent = g ? g.entries.filter(function (e) { return e.rec === r; })[0] : null;
    var elig = M.eligible.indexOf(r) >= 0;
    var h = ['<dl class="dl">',
      '<dt>Forecaster</dt><dd>' + esc(M.forecaster(r)) + (r.attributed_institution ? ' <span class="muted">(quoted in a ' + esc(r.institution) + ' document)</span>' : '') + '</dd>',
      '<dt>Variable</dt><dd>' + esc(M.fullLabel(vid, r.measure)) + '</dd>',
      '<dt>Target period</dt><dd>' + esc(M.periodLabel(r.target_period)) + (r.raw_horizon_text ? ' <span class="muted">(text: “' + esc(r.raw_horizon_text) + '”)</span>' : '') + '</dd>',
      '<dt>Value</dt><dd><b>' + esc(M.fmtV(vid, r.point_value, true)) + '</b> <span class="muted">(' + esc(r.value_type) + (r.scenario !== 'base' ? ', ' + esc(r.scenario) + ' scenario' : '') + '; as written: “' + esc(r.raw_value_text) + '”)</span></dd>',
      '<dt>Basis</dt><dd>' + esc(M.basisShort(r.basis)) + '</dd>',
      '<dt>As of</dt><dd>' + esc(M.fmtDate(r.as_of_date)) + '</dd>',
      '<dt>Document</dt><dd>' + esc(M.titleOf(r)) + ' <span class="muted">(' + esc(String(r.doc_class).replace('_', ' ')) + ')</span></dd></dl>',
      M.quoteBlock(r),
      '<p>' + srcLink(r, 'Open the public source document') + '</p>'];
    if (ent && g.stats.consensus) h.push('<p class="note">In this group: median ' + esc(M.fmtV(vid, g.stats.median, true)) + ' (n=' + g.stats.n + '). This value is ' + esc(M.fmtDiff(vid, ent.dev)) + ' from the median, ' + ent.devFloor.toFixed(1) + '× the floor' + (ent.outlier ? ' and beyond the outlier limit: <b>flagged outlier</b>' : ', inside the outlier limit') + (ent.stale ? '; it is <b>stale</b>' : '') + '.</p>');
    else if (ent) h.push('<p class="note">Too few sources for a consensus in this group (n=' + g.stats.n + ').</p>');
    else if (M.cbRecords.indexOf(r) >= 0) h.push('<p class="note"><b>Central bank projection.</b> ' + (r.attributed_person ? esc(r.attributed_person) + ' is an individual policymaker; this is not presented as the institution\u2019s view. ' : '') + 'It is excluded from the Street consensus, dispersion and outlier tests.</p>');
    else if (elig) h.push('<p class="note">This record was superseded by a later value from the same forecaster, or excluded as stale; it does not enter the current statistics.</p>');
    else h.push('<p class="note">Not eligible for the consensus (needs scenario = base, not conditional, level or change type, with a point value). Scenario: ' + esc(r.scenario) + '; type: ' + esc(r.value_type) + '.</p>');
    h.push('<p><a class="btn" href="' + esc(varHref(vid, r.measure, r.target_period)) + '" data-close>Open the variable view</a></p>');
    return { title: M.fmtV(vid, r.point_value, true) + ' · ' + M.forecaster(r), html: h.join('') };
  };

  P.groupDrawer = function (key) {
    var g = M.group(key);
    var st = g.stats, id = g.id;
    var h = ['<p>' + (st.consensus ? 'Consensus median <b>' + esc(M.fmtV(id, st.median, true)) + '</b> (n=' + st.n + ', IQR ' + esc(M.fmtBare(id, st.q1)) + ' to ' + esc(M.fmtBare(id, st.q3)) + ', range ' + esc(M.fmtBare(id, st.min)) + ' to ' + esc(M.fmtBare(id, st.max)) + ').' : '<b>Too few sources for a consensus</b> (n=' + st.n + ').') + '</p>'];
    h.push('<ul class="mlist">');
    g.entries.slice().sort(function (a, b) { return a.rec.point_value - b.rec.point_value; }).forEach(function (e) {
      h.push('<li><div class="mrow"><b>' + esc(e.fc) + '</b> ' + valBtn(e.rec, M.fmtV(id, e.rec.point_value, true)) + ' <span class="muted">' + esc(M.fmtDate(e.rec.as_of_date)) + '</span> ' + (e.outlier ? chip('out', 'Outlier') : '') + (e.stale ? chip('stale', 'Stale') : '') + '</div><p class="q">“' + esc(e.rec.source_quote) + '”</p><p>' + srcLink(e.rec) + '</p></li>');
    });
    h.push('</ul>');
    var older = g.entries.reduce(function (a, e) { return a + e.older; }, 0);
    if (older) h.push('<p class="note">' + plural(older, 'older record') + ' from the same forecasters were superseded by their latest value and are not counted.</p>');
    return { title: M.fullLabel(id, g.measure) + ', ' + M.periodLabel(g.period), html: h.join('') };
  };

  P.tileDrawer = function (kind) {
    var docs = D.documents.slice().sort(function (a, b) { return a.as_of_date < b.as_of_date ? 1 : -1; }), F = D.forecasts, h = [];
    var docTable = function (L) {
      return '<div class="tscroll"><table class="tbl"><thead><tr><th>Date</th><th>Institution</th><th>Document</th><th class="num">Forecasts</th><th class="num">Views</th></tr></thead><tbody>' + L.map(function (d) {
        return '<tr><td>' + esc(M.fmtDate(d.as_of_date)) + '</td><td><a href="#/institution/' + encodeURIComponent(d.institution) + '" data-close>' + esc(d.institution) + '</a></td><td><a class="src" href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">' + esc(M.titleOf(d)) + ' <span aria-hidden="true">↗</span></a></td><td class="num">' + d.n_forecasts + '</td><td class="num">' + d.n_views + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    };
    if (kind === 'docs') {
      h.push('<p>' + docs.length + ' documents, newest first. ' + docs.filter(function (d) { return !d.n_forecasts; }).length + ' contain no extractable forecast (the extraction abstained or found only qualitative views).</p>' + docTable(docs));
      return { title: 'Documents (' + docs.length + ')', html: h.join('') };
    }
    if (kind === 'dates') {
      h.push('<p>Document dates run from ' + esc(M.fmtDate(M.OLDEST)) + ' to ' + esc(M.fmtDate(M.NEWEST)) + '. Mixed vintages are why the staleness rule exists.</p>' + docTable(docs));
      return { title: 'Documents by date', html: h.join('') };
    }
    var rows;
    if (kind === 'inst') {
      var cnt = {};
      D.documents.forEach(function (d) { var c = cnt[d.institution] = cnt[d.institution] || { d: 0, f: 0, v: 0 }; c.d++; c.f += d.n_forecasts; c.v += d.n_views; });
      rows = Object.keys(cnt).sort().map(function (k) { return '<tr><td><a href="#/institution/' + encodeURIComponent(k) + '" data-close>' + esc(k) + '</a></td><td class="num">' + cnt[k].d + '</td><td class="num">' + cnt[k].f + '</td><td class="num">' + cnt[k].v + '</td></tr>'; });
      return { title: 'Institutions (' + rows.length + ')', html: '<p>Publishers of the ' + docs.length + ' documents. Open one for its forecasts versus consensus.</p><table class="tbl"><thead><tr><th>Institution</th><th class="num">Documents</th><th class="num">Forecasts</th><th class="num">Views</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>' };
    }
    if (kind === 'fc') {
      var W = M.waterfall;
      var byCat = {};
      F.forEach(function (f) { var c = M.varCat(f.variable_id); byCat[c] = (byCat[c] || 0) + 1; });
      h.push('<p>' + W.total + ' forecast records extracted. Eligibility waterfall used for the consensus (applied in this order):</p><table class="tbl"><tbody>' +
        '<tr><td>All records</td><td class="num">' + W.total + '</td></tr><tr><td>minus scenario other than base (upside, downside)</td><td class="num">−' + W.notBase + '</td></tr><tr><td>minus conditional forecasts</td><td class="num">−' + W.conditional + '</td></tr><tr><td>minus value type other than level or change (range, probability)</td><td class="num">−' + W.badType + '</td></tr><tr><td>minus records without a point value</td><td class="num">−' + W.noPoint + '</td></tr><tr><td>minus central bank projections (Fed, ECB, BoE, BoJ as the forecaster): shown separately, not Street views</td><td class="num">−' + W.centralBank + '</td></tr><tr><th>Eligible</th><th class="num">' + W.eligible + '</th></tr></tbody></table>');
      h.push('<p>Records by category (of ' + W.total + '):</p><table class="tbl"><tbody>' + M.CATS.map(function (c) { return '<tr><td>' + esc(c[1]) + '</td><td class="num">' + (byCat[c[0]] || 0) + '</td></tr>'; }).join('') + '</tbody></table>');
      return { title: 'Forecasts (' + W.total + ')', html: h.join('') };
    }
    if (kind === 'vars') {
      var G = M.groups(false);
      rows = M.pairs().map(function (p) {
        var ng = p.periods.length, nc = p.periods.filter(function (pp) { return G[M.gkey(p.id, p.measure, pp)].stats.consensus; }).length;
        var best = p.periods.slice().sort(function (a, b) { return G[M.gkey(p.id, p.measure, b)].nAll - G[M.gkey(p.id, p.measure, a)].nAll; })[0];
        return '<tr><td><a href="' + esc(varHref(p.id, p.measure, best)) + '" data-close>' + esc(M.fullLabel(p.id, p.measure)) + '</a></td><td>' + esc(M.catName(M.varCat(p.id))) + '</td><td class="num">' + ng + '</td><td class="num">' + nc + '</td></tr>';
      });
      return { title: 'Variables', html: '<p>Variable series with at least one eligible value, with the number of target periods (groups) and how many of those reach 4 sources.</p><table class="tbl"><thead><tr><th>Series</th><th>Category</th><th class="num">Periods</th><th class="num">With n ≥ 4</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>' };
    }
    return { title: '', html: '' };
  };
})();
