/* Market Views Intelligence - consensus engine and formatting. Vanilla JS, no dependencies. */
(function () {
  'use strict';
  var D = window.MVI_DATA;
  var M = (window.MVI = { D: D, state: { stale: true } });

  /* ---------- helpers ---------- */
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  M.esc = esc;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  M.fmtDate = function (iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0];
  };
  var dayNum = function (iso) {
    var p = iso.split('-');
    return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000;
  };
  M.dayNum = dayNum;
  var median = function (a) {
    var s = a.slice().sort(function (x, y) { return x - y; });
    var n = s.length, m = n >> 1;
    return n % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  var quant = function (s, p) { // linear interpolation, "type 7" (Excel QUARTILE.INC)
    var h = (s.length - 1) * p, lo = Math.floor(h), hi = Math.min(lo + 1, s.length - 1);
    return s[lo] + (s[hi] - s[lo]) * (h - lo);
  };
  M.median = median;

  /* ---------- variable catalogue ---------- */
  // floor kinds: rate 0.25 pp, infl 0.30 pp, bps 25 bp, fx 2 %, oil 8 %, gold 4 %
  var V = {
    FED_RATE_LEVEL: ['Fed funds target (upper bound)', 'policy', 'rate', 'pct'],
    ECB_RATE_LEVEL: ['ECB deposit facility rate', 'policy', 'rate', 'pct'],
    BOE_RATE_LEVEL: ['BoE Bank Rate', 'policy', 'rate', 'pct'],
    BOJ_RATE_LEVEL: ['BoJ policy rate', 'policy', 'rate', 'pct'],
    FED_CUM_CHANGE: ['Fed: cumulative change in policy rate', 'policy', 'bps', 'bps'],
    ECB_CUM_CHANGE: ['ECB: cumulative change in deposit rate', 'policy', 'bps', 'bps'],
    BOE_CUM_CHANGE: ['BoE: cumulative change in Bank Rate', 'policy', 'bps', 'bps'],
    BOJ_CUM_CHANGE: ['BoJ: cumulative change in policy rate', 'policy', 'bps', 'bps'],
    FED_NEXT_ACTION: ['Fed: change at the next decisions', 'policy', 'bps', 'bps'],
    ECB_NEXT_ACTION: ['ECB: change at the next decisions', 'policy', 'bps', 'bps'],
    BOE_NEXT_ACTION: ['BoE: change at the next decisions', 'policy', 'bps', 'bps'],
    BOJ_NEXT_ACTION: ['BoJ: change at the next decisions', 'policy', 'bps', 'bps'],
    UST_10Y_YIELD: ['US 10Y Treasury yield', 'yield', 'rate', 'pct'],
    UST_30Y_YIELD: ['US 30Y Treasury yield', 'yield', 'rate', 'pct'],
    BUND_10Y_YIELD: ['German 10Y Bund yield', 'yield', 'rate', 'pct'],
    BUND_30Y_YIELD: ['German 30Y Bund yield', 'yield', 'rate', 'pct'],
    GILT_10Y_YIELD: ['UK 10Y Gilt yield', 'yield', 'rate', 'pct'],
    GILT_30Y_YIELD: ['UK 30Y Gilt yield', 'yield', 'rate', 'pct'],
    JGB_10Y_YIELD: ['Japan 10Y JGB yield', 'yield', 'rate', 'pct'],
    JGB_30Y_YIELD: ['Japan 30Y JGB yield', 'yield', 'rate', 'pct'],
    EURUSD: ['EUR/USD', 'fx', 'fx', 'fx3'],
    GBPUSD: ['GBP/USD', 'fx', 'fx', 'fx3'],
    EURGBP: ['EUR/GBP', 'fx', 'fx', 'fx3'],
    USDJPY: ['USD/JPY', 'fx', 'fx', 'fx1'],
    EURJPY: ['EUR/JPY', 'fx', 'fx', 'fx1'],
    DXY: ['US Dollar Index (DXY)', 'fx', 'fx', 'idx1'],
    US_CPI_YOY: ['US CPI inflation (YoY)', 'inflation', 'infl', 'pct'],
    US_PCE_YOY: ['US PCE inflation (YoY)', 'inflation', 'infl', 'pct'],
    EA_HICP_YOY: ['Euro area HICP inflation (YoY)', 'inflation', 'infl', 'pct'],
    UK_CPI_YOY: ['UK CPI inflation (YoY)', 'inflation', 'infl', 'pct'],
    JP_CPI_YOY: ['Japan CPI inflation (YoY)', 'inflation', 'infl', 'pct'],
    BRENT: ['Brent crude', 'commodity', 'oil', 'usd1'],
    WTI: ['WTI crude', 'commodity', 'oil', 'usd1'],
    GOLD: ['Gold', 'commodity', 'gold', 'usd0'],
    CREDIT_IG_OAS: ['Investment-grade credit spread (OAS)', 'credit', 'bps', 'bps'],
    CREDIT_HY_OAS: ['High-yield credit spread (OAS)', 'credit', 'bps', 'bps']
  };
  var VORDER = Object.keys(V);
  var EXTRA = { MARKET_RISK_THEME: 'Market risk theme', UST_CURVE_SLOPE: 'US Treasury curve slope' };
  M.CATS = [['policy', 'Policy rates'], ['yield', 'Yields'], ['fx', 'FX'], ['inflation', 'Inflation'], ['commodity', 'Commodities'], ['credit', 'Credit']];
  M.catName = function (c) { for (var i = 0; i < M.CATS.length; i++) if (M.CATS[i][0] === c) return M.CATS[i][1]; return c; };
  var MEAS = { headline: 'headline', core: 'core', us: 'US' };
  M.varLabel = function (id) { return V[id] ? V[id][0] : (EXTRA[id] || id); };
  M.varCat = function (id) { return V[id] ? V[id][1] : 'other'; };
  M.fullLabel = function (id, meas) { return M.varLabel(id) + (meas ? ', ' + (MEAS[meas] || meas) : ''); };

  /* ---------- number formatting ---------- */
  var MINUS = '−';
  var commas = function (s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var fixed = function (v, d) { var s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? MINUS : '') + commas(s); };
  M.fmtV = function (id, v, withUnit) {
    var k = V[id] ? V[id][3] : 'pct', u = !!withUnit;
    switch (k) {
      case 'pct': return fixed(v, 2) + '%';
      case 'bps': return (v > 0 ? '+' : '') + fixed(v, 0) + (u ? ' bp' : '');
      case 'fx3': return fixed(v, 3);
      case 'fx1': return fixed(v, 1);
      case 'idx1': return fixed(v, 1);
      case 'usd1': return '$' + fixed(v, 1) + (u ? '/bbl' : '');
      case 'usd0': return '$' + fixed(v, 0) + (u ? '/oz' : '');
    }
    return String(v);
  };
  // bare number (axis ticks / dense cells) without unit decoration
  M.fmtBare = function (id, v) {
    var k = V[id] ? V[id][3] : 'pct';
    switch (k) {
      case 'pct': return fixed(v, 2);
      case 'bps': return (v > 0 ? '+' : '') + fixed(v, 0);
      case 'fx3': return fixed(v, 3);
      case 'usd1': return fixed(v, 1);
      case 'usd0': return fixed(v, 0);
      default: return fixed(v, 1);
    }
  };
  M.unitName = function (id) {
    var k = V[id] ? V[id][3] : 'pct';
    return { pct: 'percent', bps: 'basis points', fx3: 'exchange rate', fx1: 'exchange rate', idx1: 'index points', usd1: 'USD per barrel', usd0: 'USD per troy ounce' }[k];
  };
  // signed difference with unit, e.g. "+0.50 pp", "-25 bp", "+0.040", "+$4.0"
  M.fmtDiff = function (id, d) {
    var k = V[id] ? V[id][3] : 'pct', s = d > 0 ? '+' : (d < 0 ? MINUS : '');
    var a = Math.abs(d);
    switch (k) {
      case 'pct': return s + a.toFixed(2) + ' pp';
      case 'bps': return s + a.toFixed(0) + ' bp';
      case 'fx3': return s + a.toFixed(3);
      case 'fx1': return s + a.toFixed(1);
      case 'idx1': return s + a.toFixed(1);
      case 'usd1': return s + '$' + a.toFixed(1);
      case 'usd0': return s + '$' + a.toFixed(0);
    }
    return s + a;
  };
  M.fmtSpread = function (id, d) { // unsigned width
    return M.fmtDiff(id, Math.abs(d)).replace(/^\+/, '');
  };
  M.basisShort = function (b) { return { end_of_period: 'end of period', period_avg: 'period average', point: 'point in time' }[b] || b || ''; };
  M.basisAbbr = function (b) { return { end_of_period: 'EoP', period_avg: 'avg', point: 'pt' }[b] || ''; };

  /* ---------- periods ---------- */
  var periodEnd = function (p) { // returns ISO date string of period end
    var m;
    if ((m = /^(\d{4})$/.exec(p))) return m[1] + '-12-31';
    if ((m = /^(\d{4})Q([1-4])$/.exec(p))) { var mo = +m[2] * 3; return m[1] + '-' + (mo < 10 ? '0' : '') + mo + '-' + (mo === 6 || mo === 9 ? '30' : '31'); }
    if ((m = /^(\d{4})-(\d{2})$/.exec(p))) { var last = new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate(); return p + '-' + last; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
    return '9999-12-31';
  };
  M.periodEnd = periodEnd;
  M.periodKind = function (p) { return /^\d{4}$/.test(p) ? 'year' : /^\d{4}Q/.test(p) ? 'quarter' : /^\d{4}-\d{2}$/.test(p) ? 'month' : 'date'; };
  M.periodLabel = function (p) {
    var m;
    if ((m = /^(\d{4})Q([1-4])$/.exec(p))) return 'Q' + m[2] + ' ' + m[1];
    if (/^\d{4}$/.test(p)) return p + ' (year)';
    if ((m = /^(\d{4})-(\d{2})$/.exec(p))) return MON[+m[2] - 1] + ' ' + m[1];
    if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return 'decision ' + M.fmtDate(p);
    return p;
  };
  M.periodShort = function (p) {
    var m;
    if ((m = /^(\d{4})Q([1-4])$/.exec(p))) return 'Q' + m[2] + ' ' + m[1].slice(2);
    if (/^\d{4}$/.test(p)) return p;
    if ((m = /^(\d{4})-(\d{2})$/.exec(p))) return MON[+m[2] - 1] + ' ' + m[1].slice(2);
    if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return M.fmtDate(p).replace(/ 20(\d\d)$/, ' $1');
    return p;
  };
  var periodCmp = function (a, b) { var x = periodEnd(a), y = periodEnd(b); return x < y ? -1 : x > y ? 1 : (a < b ? -1 : a > b ? 1 : 0); };
  M.periodCmp = periodCmp;

  /* ---------- floors ---------- */
  M.floorFor = function (id, med) {
    switch (V[id][2]) {
      case 'rate': return 0.25;
      case 'infl': return 0.30;
      case 'bps': return 25;
      case 'fx': return 0.02 * Math.abs(med);
      case 'oil': return 0.08 * Math.abs(med);
      case 'gold': return 0.04 * Math.abs(med);
    }
    return 0.25;
  };
  M.floorText = function (id) {
    switch (V[id][2]) {
      case 'rate': return '0.25 pp';
      case 'infl': return '0.30 pp';
      case 'bps': return '25 bp';
      case 'fx': return '2% of median';
      case 'oil': return '8% of median';
      case 'gold': return '4% of median';
    }
    return '';
  };

  /* ---------- eligibility, grouping, statistics ---------- */
  var forecasts = D.forecasts;
  forecasts.forEach(function (f, i) { f.id = i; });
  var docByKey = {};
  D.documents.forEach(function (d) { docByKey[d.doc] = d; });
  M.docs = docByKey;
  M.forecaster = function (f) { return f.attributed_institution || f.institution; };
  M.NEWEST = forecasts.reduce(function (a, f) { return f.as_of_date > a ? f.as_of_date : a; }, '0000');
  M.OLDEST = forecasts.reduce(function (a, f) { return f.as_of_date < a ? f.as_of_date : a; }, '9999');

  // exclusion waterfall, applied in this order
  var waterfall = { total: forecasts.length, notBase: 0, conditional: 0, badType: 0, noPoint: 0, centralBank: 0, eligible: 0 };
  var eligible = [], cbRecords = [];
  M.CB = { Fed: 1, ECB: 1, BoE: 1, BoJ: 1 };
  M.isCB = function (n) { return !!M.CB[n]; };
  forecasts.forEach(function (f) {
    if (f.scenario !== 'base') { waterfall.notBase++; return; }
    if (f.is_conditional) { waterfall.conditional++; return; }
    if (f.value_type !== 'level' && f.value_type !== 'change') { waterfall.badType++; return; }
    if (f.point_value == null) { waterfall.noPoint++; return; }
    if (M.isCB(M.forecaster(f))) { waterfall.centralBank++; cbRecords.push(f); return; }
    eligible.push(f);
  });
  M.cbRecords = cbRecords;
  waterfall.eligible = eligible.length;
  M.waterfall = waterfall;
  M.eligible = eligible;
  M.STALE_DAYS = 90;
  var EPS = 1e-9;

  var gkey = function (v, m, p) { return v + '|' + (m || '') + '|' + p; };
  M.gkey = gkey;

  function computeStats(entries, id) {
    var vals = entries.map(function (e) { return e.rec.point_value; }).sort(function (a, b) { return a - b; });
    var n = vals.length;
    var s = { n: n, consensus: n >= 4 };
    if (!n) return s;
    s.median = median(vals);
    s.q1 = quant(vals, 0.25);
    s.q3 = quant(vals, 0.75);
    s.min = vals[0];
    s.max = vals[n - 1];
    s.mad = median(vals.map(function (v) { return Math.abs(v - s.median); }));
    s.floor = M.floorFor(id, s.median);
    s.thr = Math.max(s.floor, 3 * 1.4826 * s.mad);
    s.outliers = 0;
    entries.forEach(function (e) {
      e.dev = e.rec.point_value - s.median;
      e.devFloor = Math.abs(e.dev) / s.floor;
      e.devThr = Math.abs(e.dev) / s.thr;
      e.outlier = s.consensus && Math.abs(e.dev) - s.thr > EPS;
      if (e.outlier) s.outliers++;
    });
    return s;
  }

  function build(excludeStale) {
    var byG = {};
    eligible.forEach(function (f) {
      var k = gkey(f.variable_id, f.measure, f.target_period);
      (byG[k] = byG[k] || []).push(f);
    });
    var groups = {};
    Object.keys(byG).forEach(function (k) {
      var L = byG[k], f0 = L[0];
      // modal basis in the group (tie -> end_of_period); used only to break same-date ties
      var bc = {};
      L.forEach(function (f) { bc[f.basis] = (bc[f.basis] || 0) + 1; });
      var modal = 'end_of_period', best = -1;
      Object.keys(bc).sort().forEach(function (b) {
        if (bc[b] > best || (bc[b] === best && b === 'end_of_period')) { best = bc[b]; modal = b; }
      });
      var by = {};
      L.forEach(function (f) { (by[M.forecaster(f)] = by[M.forecaster(f)] || []).push(f); });
      var entries = [];
      Object.keys(by).forEach(function (fc) {
        var l = by[fc], mx = l.reduce(function (a, f) { return f.as_of_date > a ? f.as_of_date : a; }, '0000');
        var c = l.filter(function (f) { return f.as_of_date === mx; });
        c.sort(function (a, b) { return ((a.basis !== modal) - (b.basis !== modal)) || (a.id - b.id); });
        entries.push({ fc: fc, rec: c[0], alts: c.slice(1), older: l.length - c.length });
      });
      var newest = entries.reduce(function (a, e) { return e.rec.as_of_date > a ? e.rec.as_of_date : a; }, '0000');
      entries.forEach(function (e) { e.stale = dayNum(newest) - dayNum(e.rec.as_of_date) > M.STALE_DAYS; });
      var nStale = entries.filter(function (e) { return e.stale; }).length;
      var all = entries.length;
      if (excludeStale) entries = entries.filter(function (e) { return !e.stale; });
      var bases = {};
      L.forEach(function (f) { bases[f.basis] = 1; });
      var g = {
        key: k, id: f0.variable_id, measure: f0.measure || '', period: f0.target_period,
        entries: entries, newest: newest, nStale: nStale, nAll: all, modalBasis: modal,
        mixedBasis: Object.keys(bases).length > 1, bases: Object.keys(bases)
      };
      g.stats = computeStats(entries, g.id);
      g.cb = [];
      groups[k] = g;
    });
    cbRecords.forEach(function (f) {
      var g = groups[gkey(f.variable_id, f.measure, f.target_period)];
      if (g) g.cb.push(f);
    });
    return groups;
  }
  var cache = {};
  M.groups = function (excl) {
    var k = excl ? 'x' : 'a';
    return cache[k] || (cache[k] = build(excl));
  };
  M.G = function () { return M.groups(M.state.stale); };
  M.group = function (key) { return M.G()[key]; };

  M.allOutliers = function (excl) {
    var out = [], G = M.groups(excl);
    Object.keys(G).forEach(function (k) {
      var g = G[k];
      g.entries.forEach(function (e) { if (e.outlier) out.push({ g: g, e: e }); });
    });
    out.sort(function (a, b) { return b.e.devFloor - a.e.devFloor; });
    return out;
  };

  /* ---------- lists for selectors and the heat table ---------- */
  M.pairs = function () { // (variable, measure) with at least one eligible group
    var seen = {}, out = [];
    var G = M.groups(false);
    Object.keys(G).forEach(function (k) {
      var g = G[k], pk = g.id + '|' + g.measure;
      if (!seen[pk]) { seen[pk] = { id: g.id, measure: g.measure, periods: [] }; out.push(seen[pk]); }
      seen[pk].periods.push(g.period);
    });
    out.forEach(function (p) { p.periods.sort(periodCmp); });
    out.sort(function (a, b) {
      var ca = M.CATS.findIndex(function (c) { return c[0] === M.varCat(a.id); });
      var cb = M.CATS.findIndex(function (c) { return c[0] === M.varCat(b.id); });
      return (ca - cb) || (VORDER.indexOf(a.id) - VORDER.indexOf(b.id)) || (a.measure < b.measure ? -1 : 1);
    });
    return out;
  };
  M.defaultSelection = function () {
    var G = M.groups(false), best = null;
    Object.keys(G).forEach(function (k) {
      var g = G[k];
      if (!best || g.nAll > best.nAll || (g.nAll === best.nAll && g.key < best.key)) best = g;
    });
    return best;
  };

  // heat-table columns: upcoming periods (end after the newest document date), six most populated
  M.heatColumns = function () {
    var G = M.groups(false), cnt = {};
    Object.keys(G).forEach(function (k) {
      var g = G[k];
      if (periodEnd(g.period) > M.NEWEST && /^\d{4}(Q[1-4])?$/.test(g.period)) cnt[g.period] = (cnt[g.period] || 0) + g.nAll;
    });
    var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a] || periodCmp(a, b); }).slice(0, 6);
    top.sort(function (a, b) {
      var qa = /Q/.test(a), qb = /Q/.test(b);
      if (qa !== qb) return qa ? -1 : 1;
      return periodCmp(a, b);
    });
    return top.map(function (p) { return { period: p, count: cnt[p] }; });
  };

  /* ---------- Wilson interval (used by the illustrative track-record panel) ---------- */
  M.wilson = function (k, n) {
    var z = 1.96, p = k / n, den = 1 + z * z / n;
    var c = (p + z * z / (2 * n)) / den;
    var h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den;
    return { p: p, lo: Math.max(0, c - h), hi: Math.min(1, c + h) };
  };

  /* ---------- views ---------- */
  M.views = D.views;
  M.institutions = function () {
    var s = {};
    D.documents.forEach(function (d) { s[d.institution] = 1; });
    return Object.keys(s).sort();
  };

  /* ---------- quotes and titles ---------- */
  M.isTableRow = function (q) {
    q = String(q || '').trim();
    if (q.charAt(0) === '|') return true;
    var pipes = (q.match(/\|/g) || []).length;
    if (pipes >= 2 && /\d/.test(q)) return true;
    var letters = (q.match(/[A-Za-zÀ-ɏ]/g) || []).length;
    return q.length > 0 && /\d/.test(q) && letters / q.length < 0.3;
  };
  M.tableRowCells = function (q) {
    return String(q).split('|').map(function (c) { return c.replace(/\s+/g, ' ').trim(); }).filter(function (c) { return c; });
  };
  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  var decode = function (t) {
    return t.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, function (m, e) {
      if (e.charAt(0) === '#') { var n = e.charAt(1).toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(n) ? String.fromCharCode(n) : m; }
      return ENT.hasOwnProperty(e.toLowerCase()) ? ENT[e.toLowerCase()] : m;
    });
  };
  var GENERIC = { 'rbc economics': 1, 'global economics': 1, 'macro note': 1, 'capital marketsstrategy': 1, 'summary': 1 };
  M.cleanTitle = function (title, inst, date) {
    var t = decode(String(title || '')).replace(/\s+/g, function (m) { return m.length >= 3 ? '\u0001' : ' '; });
    var fallback = (inst || 'Institution') + ' research document, ' + M.fmtDate(date);
    // letter-spaced titles: single spaces between letters, 3+ spaces between words
    var tokens = t.split(/[ \u0001]/).filter(Boolean);
    var singles = tokens.filter(function (x) { return x.length === 1; }).length;
    if (tokens.length >= 6 && singles / tokens.length > 0.7) {
      t = t.split('\u0001').map(function (w) { return w.replace(/ /g, ''); }).join(' ');
      t = t.toLowerCase().replace(/(^|\|\s*)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
      if (t.split(/[^A-Za-z]+/).some(function (w) { return w.length > 15; })) return fallback; // words glued together in the source: not recoverable
    } else t = t.replace(/\u0001/g, ' ');
    t = t.replace(/\s*Skip to content\s*$/i, '').replace(/\s*\|\s*Post\s*$/i, '').trim();
    var letters = t.replace(/[^A-Za-z]/g, '');
    if (letters.length > 3 && letters === letters.toUpperCase() && /\s/.test(t)) {
      t = t.split(' ').map(function (w) { return /\./.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase(); }).join(' ');
    }
    var low = t.toLowerCase();
    if (!t || !/\s/.test(t) || GENERIC[low] || low === String(inst || '').toLowerCase()) return fallback;
    return t;
  };
  M.titleOf = function (r) { return M.cleanTitle(r.document_title || r.title, r.institution, r.as_of_date); };
})();
