/* Market Views Intelligence - router, drawer, tooltip, theme and stale toggle. */
(function () {
  'use strict';
  var M = window.MVI, P = M.pages, esc = M.esc;
  var view = document.getElementById('view'), drawer = document.getElementById('drawer'), scrim = document.getElementById('scrim'), tip = document.getElementById('tip');
  var lastFocus = null;

  /* ---- theme ---- */
  var root = document.documentElement;
  var setTheme = function (t) {
    root.setAttribute('data-theme', t);
    var b = document.getElementById('theme-btn');
    if (b) { b.setAttribute('aria-pressed', String(t === 'dark')); b.querySelector('.lbl').textContent = t === 'dark' ? 'Dark' : 'Light'; }
    try { localStorage.setItem('mvi-theme', t); } catch (e) { /* file:// may block storage */ }
  };
  var saved = null;
  try { saved = localStorage.getItem('mvi-theme'); } catch (e) { saved = null; }
  setTheme(saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  /* ---- routing ---- */
  var ROUTES = { overview: P.overview, variable: P.variable, outliers: P.outliers, institution: P.institution, themes: P.themes, podcasts: P.podcasts, track: P.track, method: P.method };
  var parse = function () {
    var parts = (location.hash || '#/overview').replace(/^#\/?/, '').split('/');
    var name = parts[0] || 'overview';
    if (!ROUTES[name]) name = 'overview';
    return { name: name, args: parts.slice(1) };
  };
  var render = function (keepScroll) {
    closeDrawer(true);
    var r = parse();
    var out = ROUTES[r.name](r.args);
    view.innerHTML = out.html;
    document.title = out.title + ' · Market Views Intelligence';
    var links = document.querySelectorAll('#nav a');
    for (var i = 0; i < links.length; i++) {
      var on = links[i].getAttribute('data-route') === r.name;
      if (on) links[i].setAttribute('aria-current', 'page'); else links[i].removeAttribute('aria-current');
    }
    var cnt = document.getElementById('stale-count');
    if (cnt) var G0 = M.groups(false), ns = 0, na = 0; Object.keys(G0).forEach(function (k) { ns += G0[k].nStale; na += G0[k].nAll; }); cnt.textContent = ns + ' of ' + na + (M.state.stale ? ' values excluded as stale' : ' values are stale');
    if (!keepScroll) { window.scrollTo(0, 0); var h1 = view.querySelector('h1'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); } }
  };
  window.addEventListener('hashchange', function () { render(false); });

  /* ---- drawer ---- */
  function openDrawer(out) {
    lastFocus = document.activeElement;
    document.getElementById('drawer-title').textContent = out.title;
    document.getElementById('drawer-body').innerHTML = out.html;
    drawer.hidden = false; scrim.hidden = false;
    document.body.classList.add('has-drawer');
    document.getElementById('drawer-close').focus();
    hideTip();
  }
  function closeDrawer(silent) {
    if (drawer.hidden) return;
    drawer.hidden = true; scrim.hidden = true;
    document.body.classList.remove('has-drawer');
    if (!silent && lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  /* ---- tooltip ---- */
  function showTip(el) {
    var t = el.getAttribute('data-tip'); if (!t) return;
    tip.textContent = t; tip.hidden = false;
    var r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - 8);
    var y = r.top - th - 8; if (y < 8) y = r.bottom + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { tip.hidden = true; }
  document.addEventListener('mouseover', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el); });
  document.addEventListener('mouseout', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) hideTip(); });
  document.addEventListener('focusin', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el); });
  document.addEventListener('focusout', hideTip);
  window.addEventListener('scroll', hideTip, { passive: true });

  /* ---- clicks ---- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : e.target.parentNode, el;
    if ((el = t.closest('[data-close]')) && el.tagName !== 'BUTTON') { closeDrawer(true); return; }
    if ((el = t.closest('[data-rec]'))) { openDrawer(P.recordDrawer(+el.getAttribute('data-rec'))); return; }
    if ((el = t.closest('[data-group]'))) { openDrawer(P.groupDrawer(el.getAttribute('data-group'))); return; }
    if ((el = t.closest('[data-tile]'))) { openDrawer(P.tileDrawer(el.getAttribute('data-tile'))); return; }
    if ((el = t.closest('[data-goto]'))) { location.hash = el.getAttribute('data-goto'); return; }
    if ((el = t.closest('[data-tf]'))) { P.setTheme(el.getAttribute('data-tf')); render(true); return; }
    if (t.closest('[data-close]')) { closeDrawer(); return; }
    if (t.closest('#scrim')) { closeDrawer(); return; }
    if (t.closest('#stale-btn')) {
      M.state.stale = !M.state.stale;
      var b = document.getElementById('stale-btn');
      b.setAttribute('aria-pressed', String(M.state.stale));
      render(true); return;
    }
    if (t.closest('#theme-btn')) { setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !drawer.hidden) { closeDrawer(); return; }
    var el = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && el.getAttribute && (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') && el.tagName.toLowerCase() === 'g') { e.preventDefault(); el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    if (e.key === 'Tab' && !drawer.hidden) { // keep focus inside the dialog
      var f = drawer.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---- selects ---- */
  document.addEventListener('change', function (e) {
    var el = e.target, kind = el.getAttribute && el.getAttribute('data-sel');
    if (!kind) return;
    if (kind === 'var') {
      var p = el.value.split('|'), pair = M.pairs().filter(function (x) { return x.id === p[0] && x.measure === p[1]; })[0];
      var cur = (parse().args[2] ? decodeURIComponent(parse().args[2]) : null), G = M.groups(false);
      var per = pair.periods.indexOf(cur) >= 0 ? cur : pair.periods.slice().sort(function (a, b) { return G[M.gkey(p[0], p[1], b)].nAll - G[M.gkey(p[0], p[1], a)].nAll || M.periodCmp(a, b); })[0];
      location.hash = M.varHref(p[0], p[1], per);
    } else if (kind === 'period') {
      var v = el.getAttribute('data-var').split('|');
      location.hash = M.varHref(v[0], v[1], el.value);
    } else if (kind === 'ocat') { P.setOcat(el.value); render(true); }
    else if (kind === 'pspk' || kind === 'pfam') { P.setPod(kind, el.value); render(true); }
    else if (kind === 'oprose') { P.setOprose(el.checked); render(true); }
    else if (kind === 'inst') { location.hash = '#/institution/' + encodeURIComponent(el.value); }
  });

  document.getElementById('stale-btn').setAttribute('aria-pressed', String(M.state.stale));
  render(false);
})();
