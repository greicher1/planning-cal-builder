// pwagate -- the install gate's SCREENS (PWA-ONLY-PLAN.md; owner, 30 Sep 2026).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh pwagate 120
//
// The hosted link shows an ordinary browser tab one full-screen page -- install, or "use the app" --
// and the app boots only in the installed app window. Headless Chrome cannot produce an app window
// (PWA-ONLY-PLAN.md M10) and this leg runs on localhost, which is never gated. So the leg runs in the
// ordinary app page (proving localhost boots the app, P0) and loads each screen in a same-origin
// IFRAME through the localhost-only test hook ?gate=<screen>, which shows that screen with every
// signal ignored. The resolver that CHOOSES a screen is pwagatelogic's job.
//
//   P0  localhost with no hook boots the app: no data-app-gate, #app-gate hidden, no __appGate,
//       phase rows rendered, and the retired #install-app-btn is gone
//   P1  no form field and no id on any control inside #app-gate (UI-CONVENTIONS §10 gate 9)
//   S-<screen>  for each of the nine screens:
//       - exactly that screen is visible, and the page's title is right
//       - the app's skeleton is display:none and the ENGINE NEVER STARTED (no phase rows, no
//         React header, empty #react-root)
//       - every visible string is the owner's approved wording (30 Sep 2026, PWA-ONLY-PLAN.md §10)
//       - the help line is shown on every screen but CHECKING
//       - where the screen has the big button: at least 360 x 88 px, 26 px label, solid navy,
//         centred horizontally to within 2 px (the owner: "large and centered")
//   E1  Edge: the menu screen swaps in Edge's steps and InPrivate, and hides Chrome's
//   C1  Copy link: the "Link copied" line appears
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function norm(s){ return String(s || '').replace(/\s+/g, ' ').trim(); }
  var PAGE = location.pathname;

  var APPROVED = {
    checking: 'One moment…',
    install: "Install SPTCal to get started It opens in its own window, like any other app. Install SPTCal Chrome will ask you to confirm. Click Install. Already installed? Open SPTCal from your Dock or Start menu.",
    box: 'Install SPTCal to get started Click Install in the box Chrome just opened.',
    cancelled: 'Install SPTCal to get started Install was cancelled. SPTCal only runs as an installed app. Install SPTCal',
    done: "SPTCal is installed It's open in its own window. You can close this tab. Open SPTCal",
    already: "Please use the SPTCal app, not the browser Open it from your Dock (Mac) or Start menu (Windows). Open SPTCal Or use Chrome's Open in app button in the address bar.",
    menu: "Install SPTCal from Chrome's menu Click ⋮ at the top right of Chrome. Choose Cast, save, and share, then Install SPTCal… Click Install. Already installed? Open SPTCal from your Dock or Start menu. In an Incognito or Guest window? Apps can't be installed there — open this link in a regular window. Installed it under another Chrome profile? Switch to that profile.",
    other: "Open this link in Google Chrome SPTCal installs and runs in Google Chrome or Microsoft Edge. Copy link Don't have Chrome? Get it free.",
    phone: 'Open SPTCal on your computer Open this link in Chrome on your Mac or PC to install it. Copy link'
  };
  var MENU_EDGE = "Install SPTCal from Edge's menu Click … at the top right of Edge. Choose Apps, then Install SPTCal. Click Install. Already installed? Open SPTCal from your Dock or Start menu. In an InPrivate or Guest window? Apps can't be installed there — open this link in a regular window. Installed it under another Edge profile? Switch to that profile.";
  var TITLES = { already: 'Open the SPTCal app', done: 'Open the SPTCal app' };
  var HELP = 'Contact Graham Reicher for help.';
  var BIG = { install: 1, cancelled: 1, already: 1, other: 1, phone: 1 };

  // A same-origin frame the size of a laptop window, so the gate lays out at full size.
  async function frame(query){
    var f = document.createElement('iframe');
    f.style.cssText = 'position:absolute;left:0;top:0;width:1440px;height:900px;border:0;z-index:99999';
    f.src = PAGE + query;
    var loaded = new Promise(function (r) { f.addEventListener('load', r); });
    document.body.appendChild(f);
    await loaded;
    await T.sleep(400);
    return f;
  }
  function inspect(f){
    var w = f.contentWindow, d = f.contentDocument, st = function (el) { return el ? w.getComputedStyle(el) : null; };
    var shown = Array.prototype.filter.call(d.querySelectorAll('#app-gate .ag-screen'), function (s) { return st(s).display !== 'none'; })
      .map(function (s) { return s.getAttribute('data-for'); });
    var sec = shown.length === 1 ? d.querySelector('#app-gate [data-for="' + shown[0] + '"]') : null;
    var big = sec ? sec.querySelector('.ag-big') : null, r = big ? big.getBoundingClientRect() : null;
    var help = d.querySelector('#app-gate .ag-help');
    return {
      attr: d.documentElement.getAttribute('data-app-gate'), shown: shown, title: d.title,
      text: sec ? norm(sec.innerText) : '',
      help: help && st(help).display !== 'none' ? norm(help.innerText) : '',
      gateDisplay: st(d.getElementById('app-gate')).display,
      appHidden: st(d.querySelector('.layout')).display === 'none' && st(d.querySelector('header.app-header')).display === 'none',
      engine: { phaseRows: d.getElementById('phase-rows').childElementCount, header: d.querySelector('header.app-header').childElementCount,
                reactRoot: d.getElementById('react-root').childElementCount },
      big: r ? { w: Math.round(r.width), h: Math.round(r.height), dx: Math.round(Math.abs(r.left + r.width / 2 - w.innerWidth / 2)),
                 font: st(big).fontSize, bg: st(big).backgroundColor, focused: d.activeElement === big } : null,
      iconLoaded: (d.querySelector('#app-gate .ag-icon img') || {}).naturalWidth || 0,
      errors: (w.__ERR || []).slice(0, 5)
    };
  }

  try {
    await T.appReady();
    // P0 -- this page is localhost with no hook: it must be the app, exactly as before the gate.
    await T.until(function () { return document.querySelectorAll('#phase-rows .phase-row').length > 0; }, 'phase rows', 100, 100);
    var g = document.getElementById('app-gate');
    add('P0', 'localhost with no hook boots the app: no gate attribute, #app-gate hidden, the engine ran, the old button is gone',
      !document.documentElement.hasAttribute('data-app-gate') && g && g.hidden && getComputedStyle(g).display === 'none' &&
      typeof window.__appGate === 'undefined' && document.querySelectorAll('#phase-rows .phase-row').length > 0 &&
      !document.getElementById('install-app-btn'),
      {attr: document.documentElement.getAttribute('data-app-gate'), hidden: g && g.hidden, appGate: typeof window.__appGate,
       phaseRows: document.querySelectorAll('#phase-rows .phase-row').length, installBtn: !!document.getElementById('install-app-btn')},
      'app booted, gate inert');
    var bad = g ? g.querySelectorAll('input, select, textarea, button[id], a[id]').length : -1;
    add('P1', 'no form field and no id on any control inside #app-gate (gate 9)', bad === 0, {count: bad}, 0);

    var screens = Object.keys(APPROVED);
    for (var i = 0; i < screens.length; i++) {
      var s = screens[i], f = await frame('?gate=' + s + '&brand=chrome'), o = inspect(f);
      var ok = o.attr === s && o.shown.length === 1 && o.shown[0] === s && o.title === (TITLES[s] || 'Install SPTCal') &&
        o.gateDisplay === 'flex' && o.appHidden && o.engine.phaseRows === 0 && o.engine.header === 0 && o.engine.reactRoot === 0 &&
        o.text === APPROVED[s] && o.help === (s === 'checking' ? '' : HELP) && o.iconLoaded === 192 && o.errors.length === 0;
      if (BIG[s]) ok = ok && !!o.big && o.big.w >= 360 && o.big.h >= 88 && o.big.dx <= 2 && o.big.font === '26px' &&
        o.big.bg === 'rgb(44, 62, 80)' && o.big.focused;
      add('S-' + s, s + ': that screen alone, the app never started, the approved words' + (BIG[s] ? ', a big centred navy button with focus' : ''),
        ok, o, {text: APPROVED[s], title: TITLES[s] || 'Install SPTCal'});
      f.remove();
    }

    var fe = await frame('?gate=menu&brand=edge'), oe = inspect(fe);
    add('E1', "Edge: the menu screen shows Edge's steps and InPrivate, and hides Chrome's", oe.text === MENU_EDGE, oe.text, MENU_EDGE);
    fe.remove();

    var fc = await frame('?gate=other&brand=other'), dc = fc.contentDocument;
    var copied = dc.querySelector('#app-gate [data-for=other] .ag-copied');
    var before = fc.contentWindow.getComputedStyle(copied).display;
    dc.querySelector('#app-gate [data-for=other] [data-act=copy]').click();
    await T.until(function () { return fc.contentWindow.getComputedStyle(copied).display !== 'none'; }, 'copied line', 40, 100).catch(function () {});
    add('C1', 'Copy link: the "Link copied" line appears', before === 'none' && fc.contentWindow.getComputedStyle(copied).display === 'block' &&
      norm(copied.innerText) === 'Link copied. Paste it into Chrome.', {before: before, after: fc.contentWindow.getComputedStyle(copied).display, text: norm(copied.innerText)}, 'none -> block');
    fc.remove();
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'pwagate', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
