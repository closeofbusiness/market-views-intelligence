/* Market Views Intelligence - Sources page: how much market-view material is published freely. */
(function () {
  'use strict';
  var M = window.MVI, esc = M.esc, D = M.D, P = M.pages;
  var plural = function (n, a, b) { return n + ' ' + (n === 1 ? a : (b || a + 's')); };
  var fAcc = 'all', fStat = 'all', fReg = 'all';
  P.setSrc = function (k, v) { if (k === 'sacc') fAcc = v; else if (k === 'sstat') fStat = v; else fReg = v; };
  var ACC = { OPEN: 'Open', OPEN_WITH_DISCLAIMER: 'Open, with disclaimer', REGISTRATION: 'Registration', PARTLY_GATED: 'Partly gated' };
  var STAT = { opened: 'opened 17 Nov 2026', reported: 'as reported (Oct 2026), not re-checked' };
  var TYPE = { asset_manager: 'asset manager', insurer: 'insurer', reinsurer: 'reinsurer', bank: 'bank', 'investment bank': 'investment bank', 'development bank': 'development bank', 'independent research': 'independent research' };
  var regionOf = function (r) { return r.region || 'Not stated'; };

  var rowHTML = function (r) {
    var hq = r.hq ? esc(r.hq) + (r.region && !r.merged ? '' : '') : '';
    var where = r.merged || !r.hq ? esc(regionOf(r)) + (r.hq ? '<span class="th-s">HQ ' + hq + '</span>' : '') : hq + '<span class="th-s">' + esc(regionOf(r)) + '</span>';
    if (!r.hq && !r.region) where = '<span class="muted">–</span>';
    var num = r.numeric === 'yes' ? '<span class="chip chip-yes">Yes</span><span class="th-s num-ex">' + esc(r.numeric_text) + '</span>' :
      r.numeric === 'not_seen' ? '<span class="chip chip-few">Not seen</span>' + (r.numeric_text ? '<span class="th-s">' + esc(r.numeric_text) + '</span>' : '') :
      '<span class="chip chip-few">Not checked</span>';
    var accTxt = r.access_note ? '<span class="th-s">' + esc(r.access_note) + '</span>' : '';
    return '<tr><th scope="row" class="fc">' + esc(r.institution) + '<span class="th-s">' + esc(TYPE[r.type] || r.type) + (r.merged ? '; also in the report as “' + esc(r.report_name) + '”' : '') + '</span></th>' +
      '<td>' + where + '</td>' +
      '<td class="pub">' + esc(r.published || '') + (r.formats ? '<span class="th-s">Formats: ' + esc(r.formats) + '</span>' : '') + (r.recent_item ? '<span class="th-s">Recent item opened: ' + esc(r.recent_item) + '</span>' : '') + '</td>' +
      '<td>' + (r.covers ? esc(r.covers) : '<span class="muted">not stated</span>') + '</td>' +
      '<td class="numc">' + num + '</td>' +
      '<td><span class="chip chip-acc-' + esc(r.access_class) + '">' + esc(ACC[r.access_class] || r.access_class) + '</span>' + accTxt + '</td>' +
      '<td><span class="chip ' + (r.status === 'opened' ? 'chip-yes' : 'chip-few') + '">' + esc(STAT[r.status]) + '</span></td>' +
      '<td><a class="src" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">Open page <span aria-hidden="true">↗</span></a></td></tr>';
  };
  var tableHTML = function (rows) {
    return '<div class="tscroll"><table class="tbl srctbl"><thead><tr><th>Institution</th><th>HQ / region</th><th>What is published</th><th>Coverage</th><th>Numeric forecasts</th><th>Access</th><th>Status</th><th>Link</th></tr></thead><tbody>' + rows.map(rowHTML).join('') + '</tbody></table></div>';
  };

  P.sources = function () {
    var S = D.sources || [], listed = S.filter(function (r) { return r.section !== 'equity_only'; }), equity = S.filter(function (r) { return r.section === 'equity_only'; });
    var opened = listed.filter(function (r) { return r.status === 'opened'; });
    var nums = opened.filter(function (r) { return r.numeric === 'yes'; });
    var gated = listed.filter(function (r) { return r.access_class === 'PARTLY_GATED' || r.access_class === 'REGISTRATION'; });
    var accVals = {}, regVals = {};
    listed.forEach(function (r) { accVals[r.access_class] = 1; regVals[regionOf(r)] = 1; });
    var keep = function (r) { return (fAcc === 'all' || r.access_class === fAcc) && (fStat === 'all' || r.status === fStat) && (fReg === 'all' || regionOf(r) === fReg); };
    var shown = listed.filter(keep);
    var secs = [['bank', 'Banks (competitor research)'], ['asset_manager', 'Asset managers (client-side research)'], ['insurer', 'Insurers and reinsurers (client-side research)']];
    var h = ['<h1>Sources</h1>',
      '<p class="lede">How much market-view material is published freely on the open web: by competitors (banks), by client-side institutions (asset managers, insurers), and in free podcasts. This is the pool the concept could draw on.</p>',
      '<div class="tiles tiles-sm">' +
      '<div class="tile static"><span class="tile-k">Institutions listed</span><span class="tile-v">' + listed.length + '</span><span class="tile-s">' + plural(listed.filter(function (r) { return r.section === 'bank'; }).length, 'bank') + ', ' + plural(listed.filter(function (r) { return r.section === 'asset_manager'; }).length, 'asset manager') + ', ' + plural(listed.filter(function (r) { return r.section === 'insurer'; }).length, 'insurer or reinsurer') + '; plus ' + equity.length + ' equity-only houses outside scope</span></div>' +
      '<div class="tile static"><span class="tile-k">Opened and readable on 17 Nov 2026</span><span class="tile-v">' + opened.length + '</span><span class="tile-s">of ' + listed.length + ' listed; page and a recent item read without login</span></div>' +
      '<div class="tile static"><span class="tile-k">Numeric forecasts seen</span><span class="tile-v">' + nums.length + '</span><span class="tile-s">of ' + opened.length + ' opened institutions (the others: not seen on the item opened)</span></div>' +
      '<div class="tile static"><span class="tile-k">Partly gated or registration</span><span class="tile-v">' + gated.length + '</span><span class="tile-s">of ' + listed.length + ' listed (' + gated.filter(function (r) { return r.status === 'opened'; }).length + ' of the ' + opened.length + ' opened)</span></div></div>',
      '<div class="banner warn"><b>How to read this list.</b> “Free to read” means the page opened without login on the date shown. It does not mean free to copy, store or redistribute. Publishers’ terms and investor-category notices apply and need review before any systematic collection. This list is a starting point to investigate, not a cleared source list.</div>',
      '<div class="controls"><label>Access<select data-sel="sacc" aria-label="Access class"><option value="all">All access classes</option>' + Object.keys(ACC).filter(function (k) { return accVals[k]; }).map(function (k) { return '<option value="' + k + '"' + (fAcc === k ? ' selected' : '') + '>' + esc(ACC[k]) + '</option>'; }).join('') + '</select></label>' +
      '<label>Status<select data-sel="sstat" aria-label="Status"><option value="all">All</option><option value="opened"' + (fStat === 'opened' ? ' selected' : '') + '>Opened 17 Nov 2026</option><option value="reported"' + (fStat === 'reported' ? ' selected' : '') + '>As reported (Oct 2026), not re-checked</option></select></label>' +
      '<label>Region<select data-sel="sreg" aria-label="Region"><option value="all">All regions</option>' + Object.keys(regVals).sort().map(function (k) { return '<option' + (fReg === k ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select></label>' +
      '<span class="muted">Showing ' + shown.length + ' of ' + listed.length + ' institutions.</span></div>',
      '<p class="note">Status “opened 17 Nov 2026”: the page was opened and a recent item read without login on that date. “As reported (Oct 2026), not re-checked”: taken from a report on open-access bank research portals, not re-opened. A bank in both lists is one row, with the 17 Nov details and the report’s region (' + S.filter(function (r) { return r.merged; }).length + ' such rows). HQ shows a dash where the opened page did not state it.</p>'];
    secs.forEach(function (s) {
      var rows = shown.filter(function (r) { return r.section === s[0]; }), all = listed.filter(function (r) { return r.section === s[0]; });
      h.push('<section class="card"><div class="card-h"><h2>' + esc(s[1]) + '</h2><span class="sub">' + rows.length + ' of ' + all.length + ' shown; ' + all.filter(function (r) { return r.status === 'opened'; }).length + ' opened 17 Nov 2026</span></div>' + (rows.length ? tableHTML(rows) : '<p class="muted">No institutions match these filters.</p>') + '</section>');
    });
    if (equity.length) h.push('<details class="card"><summary><b>Equity-only, outside scope</b> <span class="sub">(' + equity.length + ' independent equity research houses from the report; not relevant to rates, FX or commodities)</span></summary>' + tableHTML(equity) + '</details>');
    // podcasts
    var pv = D.podcasts || [], shows = {};
    pv.forEach(function (p) { var s = shows[p.show] = shows[p.show] || { spk: {}, ep: {}, n: 0 }; s.spk[p.person] = 1; s.ep[p.episode_url] = p.episode_title; s.n++; });
    h.push('<section class="card"><div class="card-h"><h2>Free podcasts used in this demo</h2><span class="sub">' + Object.keys(shows).length + ' shows, ' + pv.length + ' views. See <a href="#/podcasts">Podcast &amp; interview views</a>.</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>Show</th><th class="num">Views</th><th class="num">Speakers</th><th>Episodes used</th></tr></thead><tbody>' +
      Object.keys(shows).sort().map(function (k) {
        var s = shows[k];
        return '<tr><th scope="row" class="fc">' + esc(k) + '</th><td class="num">' + s.n + '</td><td class="num">' + Object.keys(s.spk).length + '</td><td>' + Object.keys(s.ep).map(function (u) { return '<a class="src" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(s.ep[u]) + ' <span aria-hidden="true">↗</span></a>'; }).join('<br>') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>');
    h.push('<section class="card"><div class="card-h"><h2>Not free: client portals</h2></div><p>Several large banks keep their full research behind client logins, for example Goldman Sachs Marquee, J.P. Morgan Markets, Citi Velocity and Barclays Live. Those are outside this concept unless the user’s institution is entitled to them.</p></section>');
    return { title: 'Sources', html: h.join('') };
  };
})();
