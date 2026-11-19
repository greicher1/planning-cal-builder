// weekprompt -- "Enter a week count to include this phase" waits to be asked for (owner, 19 Nov 2026: "this message
// should only show up when someone clicks enter (even tho i know the app doesn't need enter to be clicked) or when they
// click the start after or finish before buttons"). Frozen render() writes the line; reflectWeekCountPrompt() hides it
// (class is-quiet) until Enter in the card or a click on its Start after / Finish before arms it.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh weekprompt 200
//
//   P1  Pre Prep with a start and its Length cleared: the line holds the frozen sentence and is NOT shown
//   P2  Enter in Pre Prep's start box shows it
//   P3  a length typed clears the arming: clearing the length again hides the line again
//   P4  Prod Prep, Length cleared: hidden; a click on its Start after shows it
//   P5  an empty Weeks card's Finish before (R5) puts it on Ends with an end and no length: frozen render() leaves the
//       line blank there, so the armed card writes the prompt itself, shown; a length typed replaces it
//   P6  a 0 typed still says "of 1 or more" at once (an answer, not a blank)
//   P7  a custom Weeks phase: hidden until Enter in its card
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'weekprompt', cases: [] };
  var PROMPT = 'Enter a week count to include this phase';
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  async function step(id, fn) {
    try { await fn(); }
    catch (e) { kase(id, id + ' threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  }
  function byId(id) { return document.getElementById(id); }
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function meta(key) {
    var el = byId('meta-' + key);
    return { text: el.textContent, shown: getComputedStyle(el).display !== 'none', quiet: el.classList.contains('is-quiet') };
  }
  function enter(id) {
    var el = byId(id); el.focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    T.buildFixture();
    await settle();
    var tab = Array.prototype.filter.call(document.querySelectorAll('button, [role=tab]'), function (b) { return (b.textContent || '').trim() === 'Phases'; })[0];
    if (tab) { tab.click(); await T.sleep(400); }

    await step('P1', async function () {
      T.set('weeks-prePrep', ''); await settle();
      var m = meta('prePrep');
      kase('P1', 'start, no length: the frozen sentence is there and hidden', m.text === PROMPT && !m.shown, m);
    });
    await step('P2', async function () {
      enter('start-prePrep'); await T.sleep(100);
      var m = meta('prePrep');
      kase('P2', 'Enter in the start box shows it', m.text === PROMPT && m.shown, m);
    });
    await step('P3', async function () {
      T.set('weeks-prePrep', '6'); await settle();
      var a = meta('prePrep');
      T.set('weeks-prePrep', ''); await settle();
      var b = meta('prePrep');
      kase('P3', 'a length typed lapses the arming: cleared again, hidden again', a.text !== PROMPT && a.shown && b.text === PROMPT && !b.shown, { a: a, b: b });
    });
    await step('P4', async function () {
      T.set('weeks-prodPrep', ''); await settle();
      var a = meta('prodPrep');
      byId('autostart-prodPrep').click(); await settle();
      var b = meta('prodPrep');
      kase('P4', 'Prod Prep without a length: hidden, then shown by a click on Start after', a.text === PROMPT && !a.shown && b.text === PROMPT && b.shown, { a: a, b: b });
    });
    await step('P5', async function () {
      ['writersRoom', 'prePrep', 'prodPrep'].forEach(function (k) { T.set('start-' + k, ''); T.set('weeks-' + k, ''); T.set('end-' + k, ''); });
      await settle();
      var row = byId('swatch-prodPrep').closest('.phase-row');
      var btn = row.querySelector('.finish-before-btn');
      var avail = !!(btn && btn.offsetParent && !btn.disabled);
      if (avail) { btn.click(); await settle(); }
      var m = meta('prodPrep');
      var wk = byId('weeks-prodPrep').value, end = byId('end-prodPrep').value;
      T.set('weeks-prodPrep', '6'); await settle();
      var after = meta('prodPrep');
      kase('P5', 'Finish before on an empty card (on Ends, an end, no length): the prompt is written and shown; a length replaces it',
           avail && wk === '' && !!end && m.text === PROMPT && m.shown && after.text !== PROMPT && after.shown,
           { avail: avail, end: end, meta: m, after: after });
    });
    await step('P6', async function () {
      T.set('start-post', '2026-11-02'); T.set('weeks-post', '0'); await settle();
      var m = meta('post');
      kase('P6', 'a 0 typed says "of 1 or more" at once', /of 1 or more/.test(m.text) && m.shown, m);
      T.set('weeks-post', '16'); await settle();
    });
    await step('P7', async function () {
      byId('add-phase-btn').click(); await settle();
      var row = document.querySelector('#custom-phase-rows > .phase-row:last-child');
      var start = row.querySelector('input[id^="start-"]');
      var key = start.id.slice(6);
      T.set(start.id, '2026-04-06'); await settle();
      var a = meta(key);
      enter(start.id); await T.sleep(100);
      var b = meta(key);
      kase('P7', 'a custom Weeks phase: hidden until Enter in its card', a.text === PROMPT && !a.shown && b.text === PROMPT && b.shown, { key: key, a: a, b: b });
    });

    var errs = T.appHealth().errors || [];
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'weekprompt threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
