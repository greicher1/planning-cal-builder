// snapbox -- a snapped start's box shows the Monday it snapped to once it has been typed (owner, 30 Oct 2026, of a
// Wednesday left in Pre-Prep's Starts box under "Snapped to Mon 3/23/26": "It should also change the actual the date
// shows in the box. Otherwise this is confusing."). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh snapbox 300
//
// T.buildFixture()'s calendar: Pre Prep from Mon 4/6/26, 6 weeks, Snap to Monday on.
//
//   T1  while the box is still being typed in, it keeps the typed Wednesday and the meta line says "Snapped to Mon"
//   T2  leaving the box writes its Monday (4/13/26); the "Snapped to Mon" row goes; the waterfall is unchanged
//   U1  one undo step takes back the typing and the rewrite together (back to 4/6/26); one redo gives the MONDAY
//   U2  the same with the box left at once (the typing's undo step still pending): still one step
//   U3  a Wednesday typed over its own week's Monday nets to nothing: no undo step is left behind
//   K1  Enter writes the Monday too, and the box keeps focus
//   N1  tabbing through a box holding a Wednesday nobody typed (an older calendar's) rewrites nothing
//   O1  Snap to Monday off: the Wednesday stays, and the phase starts on it (as before)
//   D1  a Dates phase's start stays as typed
//   P1  Production (snapped) and a custom Weeks phase (its row is rebuilt, the listener is delegated) show the Monday
//   H1  an all-phase hiatus's Starts and a phase's own hiatus's Starts show the Monday; their "Snapped to" notes empty
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'snapbox', cases: [] };
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
  function el(x) { return typeof x === 'string' ? byId(x) : x; }
  function nativeSet(e, v) {
    var proto = e instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v);
  }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  // Focus, then type a whole date the way Chrome's date box reports one (input + change). Headless Chrome may not
  // deliver focus events without a focused window, so each is also dispatched.
  function focusBox(x) { var b = el(x); b.focus(); b.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); return b; }
  function typeInto(x, v) {
    var b = focusBox(x); nativeSet(b, v);
    b.dispatchEvent(new Event('input', { bubbles: true })); b.dispatchEvent(new Event('change', { bubbles: true }));
    return b;
  }
  function leave(x) { var b = el(x); b.blur(); b.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); }
  function enter(x) { el(x).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); }
  function meta(key) { return ((byId('meta-' + key) || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function grid() { return (byId('table-wrap') || { innerHTML: '' }).innerHTML; }
  function undoOn() { var b = byId('undo-btn'); return !!b && !b.disabled; }
  async function undo() { byId('undo-btn').click(); await settle(); }
  async function redo() { byId('redo-btn').click(); await settle(); }
  function snapNote(input) { var host = input.closest('.hiatus-entry, .phase-hiatus-fields'); var n = host && host.querySelector('.snap-note'); return n ? n.textContent : null; }

  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the fixture grid', 200, 100);
    await settle();

    // ---- T1 / T2: type Wed 4/15/26 into Pre Prep (was Mon 4/6/26), pause, then leave the box.
    await step('T1', async function () {
      typeInto('start-prePrep', '2026-04-15'); await settle();
      var o = { value: byId('start-prePrep').value, meta: meta('prePrep') };
      kase('T1', 'still in the box: it keeps the typed Wednesday, the meta line says Snapped to Mon 4/13/26',
        o.value === '2026-04-15' && /Snapped to Mon 4\/13\/26/.test(o.meta), o);
    });
    await step('T2', async function () {
      var before = grid();
      leave('start-prePrep'); await settle();
      var o = { value: byId('start-prePrep').value, meta: meta('prePrep'), gridSame: grid() === before };
      kase('T2', 'leaving the box writes its Monday (2026-04-13), the "Snapped to Mon" row goes, the waterfall is unchanged',
        o.value === '2026-04-13' && o.meta.indexOf('Snapped') === -1 && /^4\/13\/26/.test(o.meta) && o.gridSame, o);
    });
    // ---- U1: the typing was banked before the box was left (settle waited past the debounce).
    await step('U1', async function () {
      await undo();
      var back = byId('start-prePrep').value;
      await redo();
      var again = byId('start-prePrep').value;
      kase('U1', 'one undo takes back the typing and the rewrite together (2026-04-06); one redo gives the Monday, never the Wednesday',
        back === '2026-04-06' && again === '2026-04-13', { back: back, again: again });
    });
    // ---- U2: left at once, before the typing's step is banked.
    await step('U2', async function () {
      typeInto('start-prePrep', '2026-04-23'); leave('start-prePrep'); await settle();
      var now = byId('start-prePrep').value;
      await undo();
      var back = byId('start-prePrep').value;
      kase('U2', 'typed (Thu 4/23/26) and left at once: the Monday (2026-04-20), and one undo goes back to 2026-04-13',
        now === '2026-04-20' && back === '2026-04-13', { now: now, back: back });
    });
    // ---- U3: a Wednesday typed over its own week's Monday nets to nothing.
    await step('U3', async function () {
      // A fresh, known history: one real edit (Writers' Room 12 -> 13 weeks) on top.
      typeInto('weeks-writersRoom', '13'); leave('weeks-writersRoom'); await settle();
      typeInto('start-prePrep', '2026-04-15'); await settle(); leave('start-prePrep'); await settle();
      var now = { prePrep: byId('start-prePrep').value, wr: byId('weeks-writersRoom').value };
      await undo();
      var back = { prePrep: byId('start-prePrep').value, wr: byId('weeks-writersRoom').value };
      kase('U3', 'Wed 4/15/26 over Mon 4/13/26 leaves no undo step: the next undo is the edit before it (Writers\' Room 13 -> 12 weeks)',
        now.prePrep === '2026-04-13' && now.wr === '13' && back.prePrep === '2026-04-13' && back.wr === '12', { now: now, back: back });
    });
    // ---- K1: Enter.
    await step('K1', async function () {
      var b = typeInto('start-prePrep', '2026-04-09'); enter(b); await settle();
      var o = { value: b.value, focused: document.activeElement === b, meta: meta('prePrep') };
      leave(b); await settle();
      o.afterLeave = b.value;
      kase('K1', 'Enter writes the Monday (Thu 4/9/26 -> 2026-04-06) and drops the "Snapped to Mon" row; leaving the box afterwards changes nothing',
        o.value === '2026-04-06' && o.meta.indexOf('Snapped') === -1 && o.afterLeave === '2026-04-06', o);
    });
    // ---- N1: a Wednesday nobody typed in this visit (as an older calendar loads one): tabbing through leaves it.
    await step('N1', async function () {
      T.set('start-prePrep', '2026-04-08'); await settle();
      focusBox('start-prePrep'); leave('start-prePrep'); await settle();
      var o = { value: byId('start-prePrep').value, meta: meta('prePrep') };
      kase('N1', 'tabbing through a box holding a Wednesday rewrites nothing; the meta line still explains the snap',
        o.value === '2026-04-08' && /Snapped to Mon 4\/6\/26/.test(o.meta), o);
      T.set('start-prePrep', '2026-04-06'); await settle();
    });
    // ---- O1: Snap off -- the exact day, as before.
    await step('O1', async function () {
      byId('snap-prePrep').click(); await settle();
      typeInto('start-prePrep', '2026-04-08'); await settle(); leave('start-prePrep'); await settle();
      var o = { value: byId('start-prePrep').value, meta: meta('prePrep'), snap: byId('snap-prePrep').checked };
      kase('O1', 'Snap to Monday off: the typed Wednesday stays and the phase starts on it (4/8/26)',
        !o.snap && o.value === '2026-04-08' && /^4\/8\/26/.test(o.meta) && o.meta.indexOf('Snapped') === -1, o);
      byId('snap-prePrep').click(); T.set('start-prePrep', '2026-04-06'); await settle();
    });
    // ---- D1: a Dates phase uses its start to the day.
    await step('D1', async function () {
      T.set('unit-post', 'dates'); await settle();
      typeInto('start-post', '2026-11-04'); await settle(); leave('start-post'); await settle();
      var v = byId('start-post').value;
      kase('D1', 'a Dates phase (Post): the typed Wednesday stays', v === '2026-11-04', { value: v });
      T.set('unit-post', 'weeks'); T.set('start-post', '2026-11-02'); await settle();
    });
    // ---- P1: Production, and a custom Weeks phase.
    await step('P1', async function () {
      typeInto('start-production', '2026-07-01'); await settle(); leave('start-production'); await settle();
      var prod = { value: byId('start-production').value, meta: meta('production') };
      byId('add-phase-btn').click(); await settle();
      var starts = document.querySelectorAll('#custom-phase-rows input[id^="start-custom"]');
      var c = starts.length ? starts[starts.length - 1] : null;
      var key = c ? c.id.slice(6) : null;
      if (key) { T.set('weeks-' + key, '4'); await settle(); }
      if (c) { typeInto(c, '2026-09-10'); await settle(); leave(c); await settle(); }
      // re-read: the custom row may have been rebuilt by update()
      var cv = key && byId('start-' + key) ? byId('start-' + key).value : null;
      kase('P1', 'Production (Wed 7/1/26 -> 2026-06-29) and a custom Weeks phase (Thu 9/10/26 -> 2026-09-07) show their Monday',
        prod.value === '2026-06-29' && prod.meta.indexOf('Snapped') === -1 && cv === '2026-09-07', { production: prod, custom: key, customValue: cv });
    });
    // ---- H1: hiatus starts always snap.
    await step('H1', async function () {
      var hs = document.querySelector('#hiatus-list .hiatus-start');
      var was = hs.value;
      typeInto(hs, '2026-12-23'); await settle(); leave(hs); await settle();
      hs = document.querySelector('#hiatus-list .hiatus-start');
      var all = { was: was, value: hs.value, note: snapNote(hs) };
      var en = byId('phiatus-en-prodPrep'); if (en && !en.checked) { en.click(); await settle(); }
      T.set('phiatus-weeks-prodPrep', '1'); await settle();
      typeInto('phiatus-start-prodPrep', '2026-06-04'); await settle(); leave('phiatus-start-prodPrep'); await settle();
      var ps = byId('phiatus-start-prodPrep');
      var own = { value: ps.value, note: snapNote(ps) };
      kase('H1', 'an all-phase hiatus (Wed 12/23/26 -> 2026-12-21) and Prod Prep\'s own hiatus (Thu 6/4/26 -> 2026-06-01) show their Monday, with no "Snapped to" note',
        all.value === '2026-12-21' && all.note === '' && own.value === '2026-06-01' && own.note === '', { all: all, own: own });
    });
    kase('E0', 'no console errors', (window.__ERR || []).length === 0, { errors: (window.__ERR || []).slice(0, 5) });
  } catch (e) { kase('EX', 'harness: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  T.done(out);
})(); });
