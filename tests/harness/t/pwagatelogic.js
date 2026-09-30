// pwagatelogic -- the install gate's RESOLVER: which screen, and what each event does
// (PWA-ONLY-PLAN.md §4.3).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh pwagatelogic 120
//
// pwagate proves each screen looks right; this proves the right one is CHOSEN. It loads the page in
// a same-origin iframe with the localhost-only hook ?gate=live, which runs the real resolver exactly
// as on the hosted link, and drives it with the events Chrome would send. Two are synthetic, because
// headless Chrome cannot produce them for real (PWA-ONLY-PLAN.md M10): a beforeinstallprompt with a
// fake prompt()/userChoice, and the display-mode change of a tab that became the app window.
// window.__appGate.set() stands in for getInstalledRelatedApps' answer, which is the only way to
// say "installed" on localhost.
//
//   L0  a Chrome tab starts on CHECKING, and getInstalledRelatedApps answers
//   L1  no prompt by load + 2.5 s: MENU FALLBACK (Chrome) -- and OTHER BROWSER for other Chromium
//   L2  a late beforeinstallprompt upgrades MENU to INSTALL, and is preventDefault()ed
//   L3  installed beats installable: "installed" shows ALREADY INSTALLED even with a prompt waiting
//   L4  click -> Chrome's box -> dismissed -> CANCELLED -> click with no fresh prompt -> MENU
//   L5  click -> accepted -> JUST INSTALLED; appinstalled alone also lands there
//   L6  the tab becoming an app window reloads it into the app; any other mode change does not
//   L7  decide() on the cases the events above cannot reach
//   L8  Safari/Firefox and phones get their screen at once, before any signal
//   L9  the localStorage hook reaches a page with no query (what an installed TEST app opens)
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  var PAGE = location.pathname;
  async function frame(query){
    var f = document.createElement('iframe');
    f.style.cssText = 'position:absolute;left:0;top:0;width:1200px;height:800px;border:0;z-index:99999';
    f.src = PAGE + query;
    var loaded = new Promise(function (r) { f.addEventListener('load', r); });
    document.body.appendChild(f);
    await loaded;
    return f;
  }
  function screenOf(f){ return f.contentDocument.documentElement.getAttribute('data-app-gate'); }
  function fakePrompt(outcome){
    var e = new f0.contentWindow.Event('beforeinstallprompt', {cancelable: true});
    e.prompted = 0;
    e.prompt = function () { e.prompted++; };
    e.userChoice = Promise.resolve({outcome: outcome, platform: 'web'});
    return e;
  }
  var f0 = null;
  try {
    await T.appReady();
    f0 = await frame('?gate=live&brand=chrome');
    var G = f0.contentWindow.__appGate, w0 = f0.contentWindow;
    var start = screenOf(f0);
    await T.until(function () { return G.state.installed !== null || !G.state.gira; }, 'the installed-apps answer', 50, 50).catch(function () {});
    add('L0', 'a Chrome tab starts on CHECKING, and getInstalledRelatedApps answers',
      start === 'checking' && G.state.kind === 'chrome' && (G.state.installed === false || !G.state.gira),
      {start: start, state: JSON.parse(JSON.stringify(G.state))}, 'checking, installed:false');

    await T.until(function () { return G.state.timedOut; }, 'the fallback clock', 80, 100).catch(function () {});
    var afterClock = screenOf(f0);
    var fx = await frame('?gate=live&brand=chromium');
    var gx = fx.contentWindow.__appGate;
    await T.until(function () { return gx.state.timedOut; }, 'the fallback clock (chromium)', 80, 100).catch(function () {});
    add('L1', 'no prompt by load + 2.5 s: MENU FALLBACK in Chrome, OTHER BROWSER in any other Chromium',
      afterClock === 'menu' && screenOf(fx) === 'other', {chrome: afterClock, chromium: screenOf(fx)}, 'menu / other');
    fx.remove();

    var p1 = fakePrompt('dismissed');
    w0.dispatchEvent(p1);
    add('L2', 'a late beforeinstallprompt upgrades MENU to INSTALL, and is preventDefault()ed',
      screenOf(f0) === 'install' && p1.defaultPrevented === true && G.promptEvent === p1,
      {screen: screenOf(f0), defaultPrevented: p1.defaultPrevented}, 'install, true');

    G.set({installed: true});
    var withInstall = screenOf(f0);
    G.set({installed: false});
    add('L3', 'installed beats installable: ALREADY INSTALLED even with a prompt waiting, INSTALL again once it is not',
      withInstall === 'already' && screenOf(f0) === 'install', {installed: withInstall, notInstalled: screenOf(f0)}, 'already / install');

    var trail = [];
    f0.contentDocument.querySelector('#app-gate [data-for=install] [data-act=install]').click();
    trail.push(screenOf(f0) + ':' + p1.prompted);
    await T.sleep(50);
    trail.push(screenOf(f0));
    f0.contentDocument.querySelector('#app-gate [data-for=cancelled] [data-act=install]').click();
    trail.push(screenOf(f0));
    add('L4', 'click -> the box (prompt() called once) -> dismissed -> CANCELLED -> click with no fresh prompt -> MENU',
      trail.join(' ') === 'box:1 cancelled menu', trail, 'box:1 cancelled menu');

    G.set({phase: '', prompt: false});
    var p2 = fakePrompt('accepted');
    w0.dispatchEvent(p2);
    var beforeClick = screenOf(f0);
    f0.contentDocument.querySelector('#app-gate [data-for=install] [data-act=install]').click();
    await T.sleep(50);
    var accepted = screenOf(f0);
    G.set({phase: ''});
    var reset = screenOf(f0);
    w0.dispatchEvent(new w0.Event('appinstalled'));
    add('L5', 'click -> accepted -> JUST INSTALLED; the appinstalled event alone also lands there',
      beforeClick === 'install' && accepted === 'done' && reset !== 'done' && screenOf(f0) === 'done',
      {beforeClick: beforeClick, accepted: accepted, reset: reset, afterEvent: screenOf(f0)}, 'install -> done; appinstalled -> done');

    var reloads = 0;
    G.reload = function () { reloads++; };
    G.onMode({matches: false});
    var afterNo = reloads;
    G.onMode({matches: true});
    add('L6', 'the tab becoming an app window reloads it into the app; a mode change that is not one does not',
      afterNo === 0 && reloads === 1, {noMatch: afterNo, match: reloads}, '0 then 1');

    var D = G.decide, base = {kind: 'chrome', gira: true, installed: null, prompt: false, timedOut: false, phase: ''};
    function dd(p){ var s = {}, k; for (k in base) s[k] = base[k]; for (k in p) s[k] = p[k]; return D(s); }
    var table = [
      [{}, 'checking'],
      [{prompt: true}, 'checking'],                                   // prompt, but the installed answer is not in yet
      [{prompt: true, installed: false}, 'install'],
      [{prompt: true, gira: false}, 'install'],                       // Chrome/Edge below 140: nothing to wait for
      [{prompt: true, timedOut: true}, 'install'],                    // the answer never came
      [{installed: true}, 'already'],
      [{installed: true, prompt: true, timedOut: true}, 'already'],   // installed still wins after the clock
      [{timedOut: true, gira: false}, 'menu'],
      [{timedOut: true, kind: 'edge'}, 'menu'],
      [{timedOut: true, kind: 'chromium'}, 'other'],
      [{kind: 'other', prompt: true}, 'other'],
      [{kind: 'phone', installed: true}, 'phone'],
      [{phase: 'menu', prompt: true}, 'menu'],                        // a click with no prompt pins MENU
      [{phase: 'done', installed: true}, 'done'],
      [{phase: 'box', installed: true}, 'box']
    ];
    var misses = table.filter(function (t) { return dd(t[0]) !== t[1]; }).map(function (t) { return JSON.stringify(t[0]) + ' -> ' + dd(t[0]) + ' (want ' + t[1] + ')'; });
    add('L7', 'decide() on ' + table.length + ' signal combinations', misses.length === 0, misses, []);

    var fo = await frame('?gate=live&brand=other'), fp = await frame('?gate=live&brand=phone');
    add('L8', 'Safari/Firefox and phones get their screen at once, before any signal',
      screenOf(fo) === 'other' && screenOf(fp) === 'phone', {other: screenOf(fo), phone: screenOf(fp)}, 'other / phone');
    fo.remove(); fp.remove();

    localStorage.setItem('sptcal.gateTest', 'live');
    var fl = await frame('');
    var hooked = screenOf(fl);
    localStorage.removeItem('sptcal.gateTest');
    fl.remove();
    var fn = await frame('');
    var unhooked = screenOf(fn);
    fn.remove();
    add('L9', 'the localStorage hook gates a page with no query; without it the same page is the app',
      !!hooked && hooked !== 'null' && unhooked === null, {hooked: hooked, unhooked: unhooked}, 'a gate screen / null');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  try { localStorage.removeItem('sptcal.gateTest'); } catch (e) {}
  if (f0) f0.remove();
  T.done({test: 'pwagatelogic', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
