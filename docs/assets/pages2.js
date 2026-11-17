/* Market Views Intelligence - pages: institution, themes, track record, method. */
(function () {
  'use strict';
  var M = window.MVI, esc = M.esc, D = M.D, P = M.pages;
  var chip = M.chip, valBtn = function (r, text) { return '<button type="button" class="val" data-rec="' + r.id + '" title="Open the quote and source">' + esc(text) + '</button>'; };
  var mn = function (n) { return n ? '\u2212' + n : '0'; };
  var plural = function (n, a, b) { return n + ' ' + (n === 1 ? a : (b || a + 's')); };

  /* ---------- view card (shared by Institution and Themes) ---------- */
  var DIR = { hike: ['▲', 'Hike'], up: ['▲', 'Up'], cut: ['▼', 'Cut'], down: ['▼', 'Down'], hold: ['■', 'Hold'], flat: ['■', 'Flat'] };
  var viewCard = function (v, showInst) {
    var d = DIR[v.direction] || ['', v.direction || 'n/a'];
    var who = v.attributed_institution ? esc(v.attributed_institution) + ', as reported by ' + esc(v.institution) : esc(v.institution);
    return '<article class="card vcard"><header><span class="dir dir-' + esc(v.direction) + '"><span aria-hidden="true">' + d[0] + '</span> ' + esc(d[1]) + '</span><h3>' + esc(M.varLabel(v.variable_id)) + (v.target_period ? '<span class="th-s">' + esc(M.periodLabel(v.target_period)) + '</span>' : '') + '</h3></header>' +
      '<p class="sub">' + (showInst === false ? '' : who + ' · ') + esc(M.fmtDate(v.as_of_date)) + ' · conviction: ' + (v.conviction ? esc(v.conviction) : 'not stated') + (v.trade_stance ? ' · stance: ' + esc(v.trade_stance) : '') + '</p>' +
      '<blockquote>“' + esc(v.source_quote) + '”</blockquote><p class="cite">' + (v.document_url ? '<a class="src" href="' + esc(v.document_url) + '" target="_blank" rel="noopener noreferrer">Source document <span aria-hidden="true">↗</span></a>' : '') + ' <span class="muted">' + esc(M.titleOf(v)) + '</span></p></article>';
  };

  /* ---------- INSTITUTION ---------- */
  P.institution = function (args) {
    var docInst = M.institutions();
    var fcNames = {};
    D.forecasts.forEach(function (f) { fcNames[M.forecaster(f)] = 1; });
    var attribOnly = Object.keys(fcNames).filter(function (n) { return docInst.indexOf(n) < 0; }).sort();
    var name = args && args[0] ? decodeURIComponent(args[0]) : 'ING';
    if (docInst.indexOf(name) < 0 && attribOnly.indexOf(name) < 0) name = docInst[0];
    var G = M.G();
    var rows = [];
    Object.keys(G).forEach(function (k) {
      G[k].entries.forEach(function (e) { if (e.fc === name) rows.push({ g: G[k], e: e }); });
    });
    var verdict = function (r) {
      if (!r.g.stats.consensus) return 'none';
      if (r.e.outlier) return r.e.dev > 0 ? 'out-above' : 'out-below';
      if (Math.abs(r.e.dev) <= r.g.stats.floor + 1e-9) return 'inline';
      return r.e.dev > 0 ? 'above' : 'below';
    };
    rows.forEach(function (r) { r.v = verdict(r); });
    var withCons = rows.filter(function (r) { return r.v !== 'none'; });
    withCons.sort(function (a, b) { return b.e.devFloor - a.e.devFloor; });
    var noCons = rows.filter(function (r) { return r.v === 'none'; }).sort(function (a, b) {
      return (a.g.id < b.g.id ? -1 : a.g.id > b.g.id ? 1 : 0) || M.periodCmp(a.g.period, b.g.period);
    });
    var cnt = function (f) { return withCons.filter(f).length; };
    var nAbove = cnt(function (r) { return r.v === 'above' || r.v === 'out-above'; }), nBelow = cnt(function (r) { return r.v === 'below' || r.v === 'out-below'; }), nIn = cnt(function (r) { return r.v === 'inline'; });
    var nOut = cnt(function (r) { return r.v.indexOf('out') === 0; });
    var docs = D.documents.filter(function (d) { return d.institution === name; });
    var allRecs = D.forecasts.filter(function (f) { return M.forecaster(f) === name; });
    var elig = allRecs.filter(function (f) { return M.eligible.indexOf(f) >= 0; });
    var quotedElsewhere = D.forecasts.filter(function (f) { return f.institution === name && f.attributed_institution; });
    var views = M.views.filter(function (v) { return v.institution === name || v.attributed_institution === name; });
    if (!docs.length) {
      var ds = {}; allRecs.concat(views).forEach(function (r) { ds[r.doc] = 1; });
      docs = Object.keys(ds).map(function (k) { return M.docs[k]; });
    }
    var h = ['<h1>Institution view</h1><div class="controls"><label>Institution<select data-sel="inst" aria-label="Institution"><optgroup label="Publishers of the ' + D.documents.length + ' documents">' +
      docInst.map(function (n) { return '<option' + (n === name ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</optgroup><optgroup label="Only appear as the attributed source of a forecast">' +
      attribOnly.map(function (n) { return '<option' + (n === name ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</optgroup></select></label></div>'];
    h.push('<h2 class="vh">' + esc(name) + '</h2>');
    var isCBn = M.isCB(name);
    if (isCBn) {
      var cbr = M.cbRecords.filter(function (f) { return M.forecaster(f) === name; });
      var nPers = cbr.filter(function (f) { return f.attributed_person; }).length;
      h.push('<div class="banner info"><b>Central bank, not a Street forecaster.</b> Its projections are excluded from every consensus, dispersion and outlier calculation and are shown next to the Street values on the variable views. They are quoted in the research documents of banks in this sample.</div>');
      h.push('<div class="tiles tiles-sm"><div class="tile static"><span class="tile-k">Projection records</span><span class="tile-v">' + cbr.length + '</span><span class="tile-s">of ' + D.forecasts.length + ' records (base, unconditional, point value)</span></div><div class="tile static"><span class="tile-k">Individual policymakers</span><span class="tile-v">' + nPers + '</span><span class="tile-s">of ' + cbr.length + ': not the institution\u2019s view</span></div></div>');
      h.push('<section class="card"><div class="card-h"><h2>Projections quoted in the sample</h2><span class="sub">Street median shown for reference only (' + (M.state.stale ? 'stale excluded; ' : '') + 'blank where there are fewer than 4 sources).</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Variable</th><th>Period</th><th class="num">Projection</th><th class="num">Street median (n)</th><th>Note</th><th>Quote</th><th>Link</th></tr></thead><tbody>');
      cbr.slice().sort(function (a, b) { return (a.variable_id < b.variable_id ? -1 : a.variable_id > b.variable_id ? 1 : 0) || M.periodCmp(a.target_period, b.target_period); }).forEach(function (r) {
        var gg = G[M.gkey(r.variable_id, r.measure, r.target_period)], ref = gg && gg.stats.consensus ? '<button type="button" class="val" data-group="' + esc(gg.key) + '">' + esc(M.fmtV(r.variable_id, gg.stats.median)) + '</button> (n=' + gg.stats.n + ')' : '<span class="muted">n/a</span>';
        h.push('<tr><td><a href="' + esc(M.varHref(r.variable_id, r.measure, r.target_period)) + '">' + esc(M.fullLabel(r.variable_id, r.measure)) + '</a></td><td>' + esc(M.periodLabel(r.target_period)) + '</td><td class="num">' + valBtn(r, M.fmtV(r.variable_id, r.point_value)) + '</td><td class="num">' + ref + '</td><td>' + (r.attributed_person ? esc(r.attributed_person) + ', individual policymaker' : 'central bank projection') + (r.scenario !== 'base' ? '' : '') + '</td><td class="quote-c">' + M.quoteCell(r) + '</td><td>' + M.srcLink(r, 'Open') + '<span class="th-s">' + esc(r.institution) + ' document</span></td></tr>');
      });
      h.push('</tbody></table></div></section>');
    } else {
    if (M.state.stale) h.push('<p class="note">Stale values are excluded from the consensus statistics and from this table.</p>');
    h.push('<div class="tiles tiles-sm">' +
      '<div class="tile static"><span class="tile-k">Documents</span><span class="tile-v">' + docs.length + '</span><span class="tile-s">of ' + D.documents.length + ' in the sample</span></div>' +
      '<div class="tile static"><span class="tile-k">Forecast records</span><span class="tile-v">' + allRecs.length + '</span><span class="tile-s">of ' + D.forecasts.length + '; ' + elig.length + ' eligible for consensus</span></div>' +
      '<div class="tile static"><span class="tile-k">Compared with a consensus</span><span class="tile-v">' + withCons.length + '</span><span class="tile-s">of ' + rows.length + ' latest values sit in groups with n ≥ 4</span></div>' +
      '<div class="tile static"><span class="tile-k">Above / in line / below</span><span class="tile-v">' + nAbove + ' / ' + nIn + ' / ' + nBelow + '</span><span class="tile-s">of ' + withCons.length + ' compared; ' + nOut + ' outliers</span></div></div>');
    if (quotedElsewhere.length) h.push('<p class="note">' + plural(quotedElsewhere.length, 'record') + ' in ' + esc(name) + ' documents quote another institution’s forecast (' + esc(Object.keys(quotedElsewhere.reduce(function (a, f) { a[f.attributed_institution] = 1; return a; }, {})).join(', ')) + '). They are attributed to that institution, as the method requires, and appear under its name.</p>');

    h.push('<section class="card"><div class="card-h"><h2>Forecasts versus consensus</h2><span class="sub">Above / below when more than the group floor from the median; in line otherwise. Groups with fewer than 4 sources have no consensus to compare with.</span></div>');
    if (!rows.length) h.push('<p class="muted">No eligible forecasts for this institution.</p>');
    else {
      h.push('<div class="tscroll"><table class="tbl"><thead><tr><th>Variable</th><th>Period</th><th class="num">Its value</th><th class="num">Median (n)</th><th class="num">Difference</th><th>Versus consensus</th><th>As of</th><th>Source</th></tr></thead><tbody>');
      var vlab = { above: ['up', 'Above'], below: ['down', 'Below'], inline: ['eq', 'In line'], 'out-above': ['out', 'Above, outlier'], 'out-below': ['out', 'Below, outlier'], none: ['few', 'No consensus'] };
      withCons.concat(noCons).forEach(function (r) {
        var g = r.g, id = g.id, v = vlab[r.v];
        h.push('<tr class="' + (r.e.stale ? 'is-stale' : '') + '"><td><a href="' + esc(M.varHref(id, g.measure, g.period)) + '">' + esc(M.fullLabel(id, g.measure)) + '</a></td><td>' + esc(M.periodLabel(g.period)) + '</td><td class="num">' + valBtn(r.e.rec, M.fmtV(id, r.e.rec.point_value)) + '</td>' +
          (r.v === 'none' ? '<td class="num muted">n=' + g.stats.n + ', too few</td><td class="num muted">n/a</td>' : '<td class="num"><button type="button" class="val" data-group="' + esc(g.key) + '">' + esc(M.fmtV(id, g.stats.median)) + '</button> (n=' + g.stats.n + ')</td><td class="num">' + esc(M.fmtDiff(id, r.e.dev)) + '<span class="th-s">' + r.e.devFloor.toFixed(1) + '× floor</span></td>') +
          '<td><span class="chip chip-' + v[0] + '">' + v[1] + '</span>' + (r.e.stale ? ' ' + chip('stale', 'Stale') : '') + '</td><td>' + esc(M.fmtDate(r.e.rec.as_of_date)) + '</td><td>' + M.srcLink(r.e.rec, 'Open') + '</td></tr>');
      });
      h.push('</tbody></table></div>');
    }
    h.push('</section>');
    }

    h.push('<section class="card"><div class="card-h"><h2>Documents</h2><span class="sub">' + docs.length + ' in the sample</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Date</th><th>Document</th><th>Type</th><th class="num">Forecasts</th><th class="num">Views</th></tr></thead><tbody>');
    docs.slice().sort(function (a, b) { return a.as_of_date < b.as_of_date ? 1 : -1; }).forEach(function (d) {
      h.push('<tr><td>' + esc(M.fmtDate(d.as_of_date)) + '</td><td><a class="src" href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">' + esc(M.titleOf(d)) + ' <span aria-hidden="true">↗</span></a>' + (d.institution !== name ? '<span class="th-s">published by ' + esc(d.institution) + '</span>' : '') + '</td><td>' + esc(String(d.doc_class).replace('_', ' ')) + '</td><td class="num">' + d.n_forecasts + (d.n_forecasts ? '' : '<span class="th-s">none extracted</span>') + '</td><td class="num">' + d.n_views + '</td></tr>');
    });
    h.push('</tbody></table></div></section>');

    h.push('<section class="card"><div class="card-h"><h2>Qualitative views</h2><span class="sub">' + plural(views.length, 'view') + ' of ' + M.views.length + '</span></div>');
    if (!views.length) h.push('<p class="muted">No qualitative views extracted for this institution.</p>');
    else h.push('<div class="cards">' + views.map(function (v) { return viewCard(v, false); }).join('') + '</div>');
    h.push('</section>');
    return { title: 'Institution view', html: h.join('') };
  };

  /* ---------- THEMES ---------- */
  var themeSel = 'all';
  P.setTheme = function (k) { themeSel = k; };
  P.themes = function () {
    var groups = {}, order = [];
    var CATFIX = { UST_CURVE_SLOPE: 'yield' };
    M.views.forEach(function (v) {
      var key, title, coded = !!v.theme_code;
      if (coded) { key = 'theme:' + v.theme_code; title = 'Theme: ' + v.theme_code.replace(/_/g, ' '); }
      else { var c = CATFIX[v.variable_id] || M.varCat(v.variable_id); key = 'cat:' + c; title = M.catName(c); }
      if (!groups[key]) { groups[key] = { key: key, title: title, coded: coded, items: [] }; order.push(key); }
      groups[key].items.push(v);
    });
    order.sort(function (a, b) { return (groups[b].coded - groups[a].coded) || (groups[b].items.length - groups[a].items.length); });
    var nUncoded = M.views.filter(function (v) { return !v.theme_code; }).length;
    var h = ['<h1>Themes</h1>',
      '<p class="lede">The qualitative views extracted from the same documents: what banks say about direction, risk and positioning, with the verbatim sentence and a link to the original.</p>',
      '<div class="banner info"><b>Data note.</b> Only ' + (M.views.length - nUncoded) + ' of ' + M.views.length + ' views carry a <code>theme_code</code> in the data (' + Object.keys(groups).filter(function (k) { return groups[k].coded; }).map(function (k) { return esc(groups[k].title.replace('Theme: ', '')); }).join(', ') + '). The other ' + nUncoded + ' are grouped here by the asset class of the variable they refer to.</div>',
      '<div class="chips" role="group" aria-label="Filter by theme"><button type="button" class="fchip" data-tf="all" aria-pressed="' + (themeSel === 'all') + '">All (' + M.views.length + ')</button>' + order.map(function (k) { return '<button type="button" class="fchip" data-tf="' + esc(k) + '" aria-pressed="' + (themeSel === k) + '">' + esc(groups[k].title) + ' (' + groups[k].items.length + ')</button>'; }).join('') + '</div>'];
    order.forEach(function (k) {
      if (themeSel !== 'all' && themeSel !== k) return;
      var gr = groups[k], dirs = {};
      gr.items.forEach(function (v) { dirs[v.direction] = (dirs[v.direction] || 0) + 1; });
      var insts = {}; gr.items.forEach(function (v) { insts[v.institution] = 1; });
      h.push('<section class="theme"><div class="card-h"><h2>' + esc(gr.title) + '</h2><span class="sub">' + plural(gr.items.length, 'view') + ' from ' + plural(Object.keys(insts).length, 'institution') + ' (of ' + M.views.length + ' views). Direction: ' + Object.keys(dirs).sort(function (a, b) { return dirs[b] - dirs[a]; }).map(function (d) { return (DIR[d] ? DIR[d][1] : d) + ' ' + dirs[d]; }).join(', ') + '</span></div><div class="cards">' +
        gr.items.slice().sort(function (a, b) { return a.as_of_date < b.as_of_date ? 1 : -1; }).map(function (v) { return viewCard(v, true); }).join('') + '</div></section>');
    });
    return { title: 'Themes', html: h.join('') };
  };

  /* ---------- TRACK RECORD (illustrative design) ---------- */
  P.track = function () {
    var E = M.eligible, NEW = M.NEWEST;
    var ended = E.filter(function (f) { return M.periodEnd(f.target_period) <= NEW; });
    var before = E.filter(function (f) { return M.periodEnd(f.target_period) < f.as_of_date; });
    var per = {}; ended.forEach(function (f) { var k = M.forecaster(f) + '|' + f.variable_id; per[k] = (per[k] || 0) + 1; });
    var maxPer = 0, maxKey = ''; Object.keys(per).forEach(function (k) { if (per[k] > maxPer) { maxPer = per[k]; maxKey = k; } });
    var MIN = 20;
    var rows = [
      { name: 'Forecaster A', n: 48, k: 33, mae: 0.17, maeC: 0.21, maeN: 0.34 },
      { name: 'Forecaster B', n: 36, k: 17, mae: 0.29, maeC: 0.22, maeN: 0.33 },
      { name: 'Forecaster C', n: 27, k: 21, mae: 0.15, maeC: 0.20, maeN: 0.31 },
      { name: 'Forecaster D', n: 12, k: 9, mae: 0.12, maeC: 0.19, maeN: 0.30 },
      { name: 'Forecaster E', n: 60, k: 31, mae: 0.23, maeC: 0.22, maeN: 0.36 },
      { name: 'Forecaster F', n: 22, k: 11, mae: 0.26, maeC: 0.23, maeN: 0.29 }
    ];
    var w20 = M.wilson(10, 20), w40 = M.wilson(20, 40), w100 = M.wilson(50, 100);
    var h = ['<h1>Track record</h1>',
      '<div class="banner illus"><b>Illustrative design – no real scores yet.</b> Nothing on this page is a measured result for any real institution. The forecasters below are generic placeholders and every figure in the placeholder panels is invented to show the layout.</div>'];
    h.push('<section class="card"><div class="card-h"><h2>Why there is no score yet</h2><span class="sub">Real counts from the sample</span></div>' +
      '<p><b>' + ended.length + ' of ' + E.length + ' sample forecasts refer to periods that have already ended; outcome data is not yet connected in this demo, and no forecaster has more than ' + maxPer + ' such forecasts for one variable, which is ' + (maxPer < MIN ? 'below' : 'not below') + ' the minimum sample size for a score (' + MIN + ').</b> Scoring needs a market-data series for each variable (the realised value on the target date). Counts, with denominators (central bank projections excluded, as in the consensus):</p>' +
      '<table class="tbl narrow"><tbody>' +
      '<tr><td>Eligible forecast records</td><td class="num">' + E.length + ' of ' + D.forecasts.length + '</td></tr>' +
      '<tr><td>Target period ends after the newest document date (' + esc(M.fmtDate(NEW)) + '): still in the future at that date</td><td class="num">' + (E.length - ended.length) + ' of ' + E.length + '</td></tr>' +
      '<tr><td>Target period already ended by ' + esc(M.fmtDate(NEW)) + ': scorable once outcome data are loaded</td><td class="num">' + ended.length + ' of ' + E.length + '</td></tr>' +
      '<tr><td>… of which the target period had already ended on the document’s own date (an estimate or restatement, not a forecast)</td><td class="num">' + before.length + ' of ' + ended.length + '</td></tr>' +
      '<tr><td>Largest number of ended-target records for one forecaster and variable' + (maxKey ? ' (' + esc(maxKey.split('|')[0] + ', ' + M.varLabel(maxKey.split('|')[1])) + ')' : '') + '</td><td class="num">' + maxPer + ' (minimum to show a score: ' + MIN + ')</td></tr>' +
      '<tr><td>Forecaster and variable combinations reaching the minimum of ' + MIN + '</td><td class="num">' + Object.keys(per).filter(function (k) { return per[k] >= MIN; }).length + ' of ' + Object.keys(per).length + '</td></tr>' +
      '</tbody></table></section>');

    h.push('<section class="card illus-panel"><div class="card-h"><h2>Hit rate with confidence interval</h2><span class="sub">ILLUSTRATIVE: placeholder forecasters and invented numbers, one placeholder variable</span></div>' +
      '<p>A forecast is a hit when the realised value lands within the variable’s floor of the forecast (the same floor as the outlier rule: 0.25 pp for rates, 25 bp, 2% for FX and so on). The interval is a 95% Wilson interval on hits out of scored forecasts. A score appears only when at least ' + MIN + ' forecasts have been scored for that forecaster and variable, from at least 3 distinct target dates.</p>' +
      M.wilsonChart(rows, MIN) + '</section>');

    var f1 = function (x) { return (x >= 0 ? '+' : '−') + Math.abs(Math.round(x * 100)) + '%'; };
    h.push('<section class="card illus-panel"><div class="card-h"><h2>Error versus consensus and versus a no-change baseline</h2><span class="sub">ILLUSTRATIVE: placeholder numbers</span></div>' +
      '<p>Error is the mean absolute error in native units on the same scored sample. The no-change baseline carries the value in force on the forecast date forward to the target date. Skill is 1 − error / baseline error: positive means better than the baseline; shown only above the minimum sample.</p>' +
      '<div class="tscroll"><table class="tbl"><thead><tr><th>Placeholder</th><th class="num">Scored (n)</th><th class="num">Hit rate</th><th class="num">95% interval</th><th class="num">Error</th><th class="num">Consensus error</th><th class="num">No-change error</th><th class="num">Skill vs consensus</th><th class="num">Skill vs no-change</th></tr></thead><tbody>' +
      rows.map(function (r) {
        if (r.n < MIN) return '<tr class="is-stale"><th scope="row" class="fc">' + esc(r.name) + '</th><td class="num">' + r.n + '</td><td colspan="7" class="muted">no score shown: n=' + r.n + ' is below the minimum of ' + MIN + '</td></tr>';
        var w = M.wilson(r.k, r.n);
        return '<tr><th scope="row" class="fc">' + esc(r.name) + '</th><td class="num">' + r.n + '</td><td class="num">' + Math.round(w.p * 100) + '%</td><td class="num">' + Math.round(w.lo * 100) + '–' + Math.round(w.hi * 100) + '%</td><td class="num">' + r.mae.toFixed(2) + '</td><td class="num">' + r.maeC.toFixed(2) + '</td><td class="num">' + r.maeN.toFixed(2) + '</td><td class="num">' + f1(1 - r.mae / r.maeC) + '</td><td class="num">' + f1(1 - r.mae / r.maeN) + '</td></tr>';
      }).join('') + '</tbody></table></div></section>');

    h.push('<section class="card"><div class="card-h"><h2>Design rules</h2></div><ol class="steps">' +
      '<li><b>Freeze at publication.</b> Each forecast keeps its value, as-of date, basis, quote and source link; later revisions are new records, never edits.</li>' +
      '<li><b>Match to the outcome.</b> After the target date, the realised value comes from a market-data or official-release series, on the same basis as the forecast (end of period or period average).</li>' +
      '<li><b>Score in native units and in floor multiples.</b> So a 5 bp miss on a 2-year yield and a 0.01 miss on EUR/USD are comparable.</li>' +
      '<li><b>Compare with two baselines.</b> The consensus of the other forecasters at the same time, and a no-change forecast.</li>' +
      '<li><b>Minimum sample before any score is shown:</b> ' + MIN + ' scored forecasts per forecaster and variable, from at least 3 distinct target dates. At n=20 a 50% hit rate has a 95% interval of ' + Math.round(w20.lo * 100) + '–' + Math.round(w20.hi * 100) + '%; at n=40 it is ' + Math.round(w40.lo * 100) + '–' + Math.round(w40.hi * 100) + '%; at n=100, ' + Math.round(w100.lo * 100) + '–' + Math.round(w100.hi * 100) + '%. Below the minimum the page says “not enough scored forecasts”, never a number.</li>' +
      '<li><b>Overlap caution.</b> Forecasts of the same period made weeks apart by one forecaster are not independent; the minimum counts target dates, not records.</li></ol></section>');
    return { title: 'Track record (illustrative design)', html: h.join('') };
  };

  /* ---------- PODCAST & INTERVIEW VIEWS ---------- */
  var pSpk = 'all', pFam = 'all';
  P.setPod = function (k, v) { if (k === 'pspk') pSpk = v; else pFam = v; };
  var FAMS = [['policy', 'Policy rates'], ['yield', 'Yields & curve'], ['fx', 'FX & dollar'], ['gold_oil', 'Gold & oil'], ['inflation', 'Inflation'], ['credit', 'Credit']];
  var podFamily = function (p) { // by variable where given, otherwise by the topic text
    var v = p.variable_id || '', t = (p.topic || '').toLowerCase();
    if (/^(FED|ECB|BOE|BOJ)_/.test(v)) return 'policy';
    if (/_YIELD$/.test(v)) return 'yield';
    if (v === 'DXY') return 'fx';
    if (v === 'GOLD' || v === 'BRENT' || v === 'WTI') return 'gold_oil';
    if (/hyperscaler|credit/.test(t)) return 'credit';
    if (/yield|treasury|real interest/.test(t)) return 'yield';
    if (/discount rate|policy rate/.test(t)) return 'policy';
    if (/purchasing power/.test(t)) return 'inflation';
    if (/dollar/.test(t)) return 'fx';
    if (/gold|oil|commodit|metal/.test(t)) return 'gold_oil';
    return 'policy';
  };
  var crossLink = function (p) {
    if (!p.variable_id) return '';
    var G = M.groups(false), best = null;
    Object.keys(G).forEach(function (k) {
      var g = G[k];
      if (g.id !== p.variable_id) return;
      var s = (g.stats.consensus ? 1000 : 0) + g.nAll;
      if (!best || s > best.s || (s === best.s && g.key < best.g.key)) best = { g: g, s: s };
    });
    if (!best) return '<p class="xlink muted">No written-research values for ' + esc(M.fullLabel(p.variable_id)) + ' in this sample.</p>';
    var g = best.g, any = Object.keys(G).some(function (k) { return G[k].id === p.variable_id && G[k].stats.consensus; });
    return '<p class="xlink"><a href="' + esc(M.varHref(g.id, g.measure, g.period)) + '">Compare with written research: ' + esc(M.fullLabel(g.id, g.measure)) + '</a> <span class="muted">(' + (any ? 'consensus available for some periods' : 'individual values only: too few sources for a consensus') + ')</span></p>';
  };
  P.podcasts = function () {
    var A = D.podcasts || [];
    var spk = {}, shows = {}, dates = [];
    A.forEach(function (p) { spk[p.person] = 1; shows[p.show] = 1; dates.push(p.episode_date); });
    dates.sort();
    var speakers = Object.keys(spk).sort();
    var famCount = {}; A.forEach(function (p) { var f = podFamily(p); famCount[f] = (famCount[f] || 0) + 1; });
    if (pSpk !== 'all' && !spk[pSpk]) pSpk = 'all';
    var list = A.filter(function (p) { return (pSpk === 'all' || p.person === pSpk) && (pFam === 'all' || podFamily(p) === pFam); });
    var h = ['<h1>Podcast &amp; interview views</h1>',
      '<p class="lede">Views spoken by named speakers on public podcasts, shown with the transcript sentence and a link to the episode. They are qualitative: they are <b>not</b> merged into the written-research consensus numbers, and the cross-links below only take you to the written-research variable view for comparison.</p>',
      '<div class="tiles tiles-sm"><div class="tile static"><span class="tile-k">Views</span><span class="tile-v">' + A.length + '</span><span class="tile-s">spoken views in the sample</span></div>' +
      '<div class="tile static"><span class="tile-k">Speakers</span><span class="tile-v">' + speakers.length + '</span><span class="tile-s">named speakers</span></div>' +
      '<div class="tile static"><span class="tile-k">Shows</span><span class="tile-v">' + Object.keys(shows).length + '</span><span class="tile-s">public podcasts</span></div>' +
      '<div class="tile static"><span class="tile-k">Date range</span><span class="tile-v tv-sm">' + esc(M.fmtDate(dates[0]).replace(/ 20\d\d$/, '') + ' – ' + M.fmtDate(dates[dates.length - 1])) + '</span><span class="tile-s">episode dates</span></div></div>',
      '<div class="banner info"><b>Provenance.</b> Quotes come from machine transcripts of public podcast episodes and may contain transcription errors. Each speaker is a named guest or host of the episode, identified by speaker separation with a human confirmation. The episode audio is the source of record. Collected once; not updated.</div>',
      '<div class="controls"><label>Speaker<select data-sel="pspk" aria-label="Speaker"><option value="all">All speakers (' + speakers.length + ')</option>' + speakers.map(function (n) { return '<option' + (n === pSpk ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></label>' +
      '<label>Topic family<select data-sel="pfam" aria-label="Topic family"><option value="all">All topics</option>' + FAMS.filter(function (f) { return famCount[f[0]]; }).map(function (f) { return '<option value="' + f[0] + '"' + (f[0] === pFam ? ' selected' : '') + '>' + esc(f[1]) + ' (' + famCount[f[0]] + ')</option>'; }).join('') + '</select></label>' +
      '<span class="muted">Showing ' + list.length + ' of ' + A.length + ' views.</span></div>'];
    FAMS.forEach(function (f) {
      var items = list.filter(function (p) { return podFamily(p) === f[0]; });
      if (!items.length) return;
      h.push('<section class="theme"><div class="card-h"><h2>' + esc(f[1]) + '</h2><span class="sub">' + plural(items.length, 'view') + ' of ' + A.length + '</span></div><div class="cards">' +
        items.map(function (p) {
          return '<article class="card vcard pcard"><header><h3>' + esc(p.person) + '<span class="th-s">' + esc(p.role === 'host' ? 'host of' : 'guest on') + ' ' + esc(p.show) + '</span></h3></header>' +
            '<p class="sub"><a class="src" href="' + esc(p.episode_url) + '" target="_blank" rel="noopener noreferrer">' + esc(p.episode_title) + ' <span aria-hidden="true">↗</span></a> · ' + esc(M.fmtDate(p.episode_date)) + '</p>' +
            '<p class="pchips"><span class="chip">' + esc(p.topic) + '</span> <span class="chip chip-dir">Direction: ' + esc(p.direction) + '</span>' + (p.horizon_text ? ' <span class="chip chip-note">Horizon: ' + esc(p.horizon_text) + '</span>' : '') + '</p>' +
            '<p class="psum">' + esc(p.summary) + '</p>' +
            '<blockquote><span class="k">Transcript excerpt (machine transcription)</span>“' + esc(p.quote) + '”</blockquote>' + crossLink(p) + '</article>';
        }).join('') + '</div></section>');
    });
    if (!list.length) h.push('<p class="muted">No views match these filters.</p>');
    h.push('<p class="note">Topic families are assigned from the variable where one is given, otherwise from the topic text. Direction and horizon are shown as extracted, in the wording of the summary; they are not normalised.</p>');
    return { title: 'Podcast & interview views', html: h.join('') };
  };

  /* ---------- METHOD & DATA ---------- */
  P.method = function () {
    var W = M.waterfall, G = M.groups(false), GX = M.groups(true);
    var keys = Object.keys(G);
    var nCons = keys.filter(function (k) { return G[k].stats.consensus; }).length;
    var nConsX = Object.keys(GX).filter(function (k) { return GX[k].stats.consensus; }).length;
    var mixed = keys.filter(function (k) { return G[k].mixedBasis; }).length;
    var mixedCons = keys.filter(function (k) { return G[k].mixedBasis && G[k].stats.consensus; }).length;
    var ties = 0, tiesDiff = 0;
    keys.forEach(function (k) { G[k].entries.forEach(function (e) { if (e.alts.length) { ties++; if (e.alts.some(function (a) { return a.point_value !== e.rec.point_value; })) tiesDiff++; } }); });
    var sizes = {}; keys.forEach(function (k) { var n = G[k].nAll; sizes[n] = (sizes[n] || 0) + 1; });
    var h = ['<h1>Method &amp; data</h1>'];
    h.push('<section class="card"><div class="card-h"><h2>Intended use</h2></div><p>This concept is for <b>internal use inside a financial institution</b>. It is not a client product and not for redistribution. It serves four groups:</p><div class="cards">' +
      [['Research, risk management and credit', 'Stress their models and internal views against the range of outside expectations.'],
       ['Management', 'Test business assumptions and the overall strategy.'],
       ['Trading, sales and relationship managers', 'See what a client\u2019s own published research says. It can differ from what the client says in a call, which is itself a useful data point.'],
       ['Strategists, desk strategy and research teams', 'See what competitors are putting out.']].map(function (c, i) { return '<article class="card vcard"><header><span class="rank">' + (i + 1) + '</span><h3>' + c[0] + '</h3></header><p>' + c[1] + '</p></article>'; }).join('') + '</div></section>');
    h.push('<section class="card"><div class="card-h"><h2>Consensus method</h2></div><ol class="steps">' +
      '<li><b>Eligible records.</b> Scenario is “base”, not conditional, value type is “level” or “change”, and a point value exists. Of ' + W.total + ' extracted records: ' + mn(W.notBase) + ' non-base scenarios, ' + mn(W.conditional) + ' conditional, ' + mn(W.badType) + ' of type range or probability, ' + mn(W.noPoint) + ' without a point value, ' + mn(W.centralBank) + ' central bank projections (Fed, ECB, BoE, BoJ as forecaster; shown separately) = <b>' + W.eligible + ' eligible</b> (' + Math.round(100 * W.eligible / W.total) + '% of ' + W.total + ').</li>' +
      '<li><b>Forecaster.</b> The attributed institution if the record has one (for example a Mizuho Securities USA forecast inside a Mizuho document), otherwise the publishing institution. <b>Central banks are not Street views:</b> records whose forecaster is the Fed, ECB, BoE or BoJ (' + W.centralBank + ' of the base, unconditional point records) are excluded from the consensus, the dispersion statistics and the outlier tests. The variable view shows them as a separate marker labelled “central bank projection”, with quote and link. Where the quote names an individual policymaker, it is labelled as that person’s view, not the institution’s. Distinct names are distinct forecasters, so “Scotiabank” and “Scotiabank (Wealth Management)” count separately.</li>' +
      '<li><b>Groups.</b> Records are grouped by (variable, measure, target period): ' + keys.length + ' groups from ' + W.eligible + ' records. Within a group each forecaster contributes one value, the one with the latest as-of date.</li>' +
      '<li><b>Statistics per group.</b> n, median, first and third quartile (linear interpolation, the same as Excel QUARTILE.INC), minimum, maximum and MAD, the median of absolute deviations from the median.</li>' +
      '<li><b>Consensus only if n ≥ 4.</b> ' + nCons + ' of ' + keys.length + ' groups qualify (' + nConsX + ' if stale values are excluded). Smaller groups show their individual values labelled “too few sources for a consensus”. Group sizes (forecasters per group): ' + Object.keys(sizes).sort(function (a, b) { return a - b; }).map(function (n) { return 'n=' + n + ': ' + sizes[n]; }).join(', ') + '.</li>' +
      '<li><b>Outlier flag</b> (n ≥ 4 only): a value is flagged when |value − median| is strictly greater than max(floor, 3 × 1.4826 × MAD). Comparisons use a 1e-9 tolerance so that a value exactly on the limit is not flagged by floating-point noise.</li>' +
      '<li><b>Staleness.</b> The as-of date of each value is shown. A value more than 90 days older than the newest value in its group is marked stale (muted). The “exclude stale” switch in the header drops those values and recomputes every statistic and flag on what remains; the 90 days are measured against the newest value in the group, not against today.</li></ol>' +
      '<h3>Floors</h3><table class="tbl narrow"><thead><tr><th>Variables</th><th class="num">Floor</th></tr></thead><tbody><tr><td>Policy rates and yields (percent levels)</td><td class="num">0.25 pp</td></tr><tr><td>Inflation (CPI, PCE, HICP, year on year)</td><td class="num">0.30 pp</td></tr><tr><td>Variables in basis points (cumulative and next-decision policy changes, credit spreads)</td><td class="num">25 bp</td></tr><tr><td>FX rates and the dollar index</td><td class="num">2% of the median</td></tr><tr><td>Brent and WTI</td><td class="num">8% of the median</td></tr><tr><td>Gold</td><td class="num">4% of the median</td></tr></tbody></table>' +
      '<p class="note">Distance on the Outliers page is |value − median| divided by the floor (“floor multiples”). Because the limit is the larger of the floor and 3 × 1.4826 × MAD, a flagged value is always at least 1× the floor from the median.</p></section>');

    h.push('<section class="card"><div class="card-h"><h2>Caveats visible in the data</h2><span class="sub">Observed while building this demo; nothing here has been altered</span></div><ul class="plain">' +
      '<li><b>Basis is not in the grouping key.</b> A pilot would also group by basis (end of period versus period average); this demo pools them and flags the mixed groups. The specified key is (variable, measure, period). ' + mixed + ' of ' + keys.length + ' groups pool values quoted on different bases (end of period and period average), including ' + mixedCons + ' of the ' + nCons + ' consensus groups. The variable view warns when this happens and shows the basis on every row.</li>' +
      '<li><b>Same-date ties.</b> The rule “latest as-of date” does not separate ' + ties + ' forecaster values that have several records on the same date (' + tiesDiff + ' with different values, for example one document quoting both bases). The tie is broken by preferring the basis most common in the group (end of period on a tie), then source order; the alternates are listed in the row.</li>' +
      '<li><b>Policy-change variables mix vintages.</b> “Cumulative change” is measured from the rate in force on each document’s own date, so values from different dates are not strictly like for like.</li>' +
      '<li><b>Decision-date targets.</b> Next-action variables use a meeting date as the period, so most such groups have a single source.</li>' +
      '<li><b>Ranges, probabilities, scenarios</b> are in the data but excluded from the consensus (see the waterfall above).</li>' +
      '<li><b>Quotes</b> are reproduced exactly as extracted, including odd spacing from the source PDF.</li></ul></section>');

    h.push('<section class="card"><div class="card-h"><h2>Data provenance</h2></div><p>The data are a hand-annotated and adjudicated extraction from <b>' + D.documents.length + ' publicly available research documents of ' + M.institutions().length + ' institutions</b>: ' + W.total + ' forecast records and ' + M.views.length + ' qualitative views. Quotes are short excerpts with links to the originals; the original document remains the source of record. The sample is small and mixes publication dates (' + esc(M.fmtDate(M.OLDEST)) + ' to ' + esc(M.fmtDate(M.NEWEST)) + '), so it demonstrates the product; it is not a market survey. The page makes no network requests: the data are embedded in the page, and links to the source documents only open when you click them.</p><p><b>Podcast and interview views.</b> Quotes come from machine transcripts of public podcast episodes and may contain transcription errors. Each speaker is a named guest or host of the episode, identified by speaker separation with a human confirmation. The episode audio is the source of record. The views were collected once and are not updated. They are qualitative and are never merged into the written-research consensus.</p></section>');

    h.push('<section class="card roadmap"><div class="card-h"><h2>Roadmap</h2></div><ul class="plain">' +
      '<li><b>Client-view segmentation.</b> Tag each view by client segment (real money, hedge funds, corporates, central banks) so desks can see what the clients they cover expect, next to what competitors publish.</li>' +
      '<li><b>Podcast and interview views with speaker identification.</b> Add spoken views, attributed to the identified speaker, with the same quote-and-link traceability.</li>' +
      '<li><b>Automatic scoring against market data.</b> Match every forecast to the realised value and populate the <a href="#/track">track record</a> once the minimum sample is reached.</li></ul></section>');
    return { title: 'Method & data', html: h.join('') };
  };
})();
