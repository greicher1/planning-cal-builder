// twodigityear -- a date box takes a two-digit year and shows one (owner, 4 Nov 2026: "you can type 26 instead of
// 2026", and the box "should read 01/04/26"). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh twodigityear 300
//
// Chrome's date box reports a typed "26" as the year 0026 (its value is "0026-04-15"), which the engine refuses as a
// bad year. app.js holds a year under 1000 back from the engine while it is being typed (holdUnfinishedYear) and,
// once it is finished, makes a year under 100 into 20xx (finishTypedYear); legacy.css clips the year field to its
// last two digits. The value always stays a full ISO date, so nothing saved changes.
//
// T.buildFixture()'s calendar: Pre Prep from Mon 4/6/26, 6 weeks, Snap to Monday on.
//
//   Y1  while still in the box the typed year stays 0026, and the engine has not heard of it: no "Check that year"
//       refusal, the waterfall unchanged
//   Y2  leaving the box makes it 2026, and a snapped start then shows its Monday (Wed 4/15 -> 2026-04-13): the year is
//       fixed BEFORE showSnappedMonday() reads it; the refusal is gone
//   Y3  one undo takes back the typing and the 2026 together (back to 2026-04-06)
//   K1  a digit keydown leaves 0002 alone (2, 0, 2, 6 must still type 2026); Enter makes 0026 into 2026
//   K2  Tab (any key but a digit or a delete) makes it 2026 too
//   N1  a 0026 nobody typed in this visit (an older file's) is left alone when the box is tabbed through
//   N2  a three-digit year (0202) and a five-digit one (20266) are left as typed: still a bad year
//   F1  typing 2026 digit by digit (0002, 0020, 0202, 2026) never shows the refusal on the way, and lands on 2026
//   B1  every other kind of sidebar box: an all-phase hiatus start, a phase's own hiatus start, an Ends box (its end
//       lands on the Friday of 2026's week), the calendar range, a custom holiday's date
//   B2  a tool popover's date (Rebuild From) too
//   B3  a date box outside the sidebar and the tool popovers is never touched
//   C1  the stylesheet clips the year field to two digits, on the same boxes
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'twodigityear', cases: [] };
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
  function nativeSet(e, v) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, v); }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  // Focus, then type a date the way Chrome's date box reports one (input + change). Headless Chrome may not deliver
  // focus events without a focused window, so each is also dispatched.
  function focusBox(x) { var b = el(x); b.focus(); b.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); return b; }
  function typeInto(x, v) {
    var b = focusBox(x); nativeSet(b, v);
    b.dispatchEvent(new Event('input', { bubbles: true })); b.dispatchEvent(new Event('change', { bubbles: true }));
    return b;
  }
  function leave(x) { var b = el(x); b.blur(); b.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); }
  function key(x, k) { el(x).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
  function refused() { return /year that doesn/i.test((byId('table-wrap') || { textContent: '' }).textContent); }
  async function undo() { byId('undo-btn').click(); await settle(); }

  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the fixture grid', 200, 100);
    await settle();

    // ---- Y1 / Y2: type 04/15/26 into Pre Prep's Starts box (was Mon 4/6/26), pause, then leave the box.
    await step('Y1', async function () {
      var before = (byId('table-wrap') || { innerHTML: '' }).innerHTML;
      typeInto('start-prePrep', '0026-04-15'); await settle();
      var o = { value: byId('start-prePrep').value, refused: refused(), ring: byId('start-prePrep').matches('.is-invalid, .invalid, [aria-invalid="true"]'),
        gridSame: (byId('table-wrap') || { innerHTML: '' }).innerHTML === before };
      kase('Y1', 'still in the box: the typed year stays 0026 and the engine has not heard of it (no refusal, no ring, the waterfall unchanged)',
        o.value === '0026-04-15' && !o.refused && !o.ring && o.gridSame, o);
    });
    await step('Y2', async function () {
      leave('start-prePrep'); await settle();
      var o = { value: byId('start-prePrep').value, refused: refused() };
      kase('Y2', 'leaving the box makes it 2026, then the snapped start shows its Monday (2026-04-13); the calendar is back',
        o.value === '2026-04-13' && !o.refused, o);
    });
    // ---- Y3: the typing was banked before the box was left (settle waited past the debounce).
    await step('Y3', async function () {
      await undo();
      var v = byId('start-prePrep').value;
      kase('Y3', 'one undo takes back the typing and the 2026 together (2026-04-06)', v === '2026-04-06', { value: v });
    });
    // ---- K1: a digit keeps typing; Enter finishes the year.
    await step('K1', async function () {
      var b = typeInto('start-prePrep', '0002-04-06');
      key(b, '0');
      var afterDigit = b.value;
      nativeSet(b, '0026-04-06'); b.dispatchEvent(new Event('input', { bubbles: true }));
      key(b, 'Enter'); await settle();
      var o = { afterDigit: afterDigit, afterEnter: b.value, focused: document.activeElement === b };
      leave(b); await settle();
      o.afterLeave = byId('start-prePrep').value;
      kase('K1', 'a digit keydown leaves the year as typed (0002); Enter makes 0026 into 2026-04-06 (headless Chrome has no focused window, so focus is recorded, not asserted)',
        o.afterDigit === '0002-04-06' && o.afterEnter === '2026-04-06' && o.afterLeave === '2026-04-06', o);
    });
    // ---- K2: Tab.
    await step('K2', async function () {
      var b = typeInto('start-prePrep', '0026-04-20');
      key(b, 'Tab');
      var v = b.value;
      leave(b); await settle();
      kase('K2', 'Tab makes 0026 into 2026 (2026-04-20)', v === '2026-04-20' && byId('start-prePrep').value === '2026-04-20', { onTab: v });
      T.set('start-prePrep', '2026-04-06'); await settle();
    });
    // ---- N1: a 0026 nobody typed (as an older file could hold one).
    await step('N1', async function () {
      var b = byId('start-prePrep');
      nativeSet(b, '0026-04-06');
      focusBox(b); leave(b); await settle();
      var v = byId('start-prePrep').value;
      kase('N1', 'tabbing through a box holding a year nobody typed in this visit (0026) rewrites nothing', v === '0026-04-06', { value: v });
      T.set('start-prePrep', '2026-04-06'); await settle();
    });
    // ---- N2: only one- and two-digit years are filled in.
    await step('N2', async function () {
      typeInto('start-prePrep', '0202-04-06'); leave('start-prePrep'); await settle();
      var three = byId('start-prePrep').value, threeRefused = refused();
      typeInto('start-prePrep', '20266-04-06'); leave('start-prePrep'); await settle();
      var five = byId('start-prePrep').value, fiveRefused = refused();
      kase('N2', 'a year of 0202 or 20266 is left as typed, and still refused as a bad year',
        three === '0202-04-06' && threeRefused && five === '20266-04-06' && fiveRefused,
        { three: three, threeRefused: threeRefused, five: five, fiveRefused: fiveRefused });
      T.set('start-prePrep', '2026-04-06'); await settle();
    });
    // ---- F1: four digits, one at a time, as Chrome reports them.
    await step('F1', async function () {
      var seen = [];
      var b = focusBox('start-prePrep');
      ['0002-04-20', '0020-04-20', '0202-04-20', '2026-04-20'].forEach(function (v) {
        nativeSet(b, v); b.dispatchEvent(new Event('input', { bubbles: true })); b.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await settle();
      seen.push(refused());
      var v = b.value;
      leave(b); await settle();
      kase('F1', 'typing 2026 a digit at a time never refuses on the way (0002, 0020, 0202 are held) and lands on 2026-04-20',
        v === '2026-04-20' && seen[0] === false && byId('start-prePrep').value === '2026-04-20' && !refused(), { value: v, refusedAtEnd: seen[0] });
      T.set('start-prePrep', '2026-04-06'); await settle();
    });
    // ---- B1: the sidebar's other date boxes.
    await step('B1', async function () {
      var o = {};
      var hs = document.querySelector('#hiatus-list .hiatus-start');
      typeInto(hs, '0026-12-23'); leave(hs); await settle();
      o.hiatus = document.querySelector('#hiatus-list .hiatus-start').value;
      var en = byId('phiatus-en-prodPrep'); if (en && !en.checked) { en.click(); await settle(); }
      T.set('phiatus-weeks-prodPrep', '1'); await settle();
      typeInto('phiatus-start-prodPrep', '0026-06-04'); leave('phiatus-start-prodPrep'); await settle();
      o.ownHiatus = byId('phiatus-start-prodPrep').value;
      var row = byId('start-post').closest('.phase-row');
      var sel = row.querySelector('select.phase-anchor');
      sel.value = 'ends'; sel.dispatchEvent(new Event('change', { bubbles: true })); await settle();
      var ends = byId('start-post').closest('.phase-row').querySelector('.phase-endsdate');
      typeInto(ends, '0027-03-03'); leave(ends); await settle();
      o.endsBox = ends.value; o.endVal = (byId('end-post') || {}).value;
      typeInto('cal-range-start', '0026-05-06'); leave('cal-range-start'); await settle();
      o.range = byId('cal-range-start').value;
      T.set('cal-range-start', ''); await settle();
      typeInto('custom-hol-date', '0026-11-04'); leave('custom-hol-date'); await T.sleep(200);
      o.holiday = byId('custom-hol-date').value;
      o.refused = refused();
      kase('B1', 'an all-phase hiatus (-> 2026-12-21, its Monday), a phase\'s own hiatus (-> 2026-06-01), an Ends box (-> 2027, end on Fri 2027-03-05), the calendar range and a custom holiday all read the two-digit year as 20xx',
        o.hiatus === '2026-12-21' && o.ownHiatus === '2026-06-01' && /^2027-03-0[35]$/.test(o.endsBox) && o.endVal === '2027-03-05' &&
        o.range === '2026-05-06' && o.holiday === '2026-11-04' && !o.refused, o);
    });
    // ---- B2: a tool popover's date (keepMounted, so it is in the DOM while closed).
    await step('B2', async function () {
      var b = byId('tool-solve-date');
      if (!b) { kase('B2', 'Rebuild From\'s date box is in the DOM', false, {}); return; }
      typeInto(b, '0027-03-01'); leave(b); await T.sleep(200);
      kase('B2', 'Rebuild From\'s date reads 0027 as 2027 (2027-03-01)', b.value === '2027-03-01', { value: b.value });
      nativeSet(b, '');
    });
    // ---- B3: anywhere else, untouched.
    await step('B3', async function () {
      var b = document.createElement('input'); b.type = 'date'; document.body.appendChild(b);
      typeInto(b, '0026-04-06'); leave(b); await T.sleep(200);
      var v = b.value; b.remove();
      kase('B3', 'a date box outside the sidebar and the tool popovers keeps 0026', v === '0026-04-06', { value: v });
    });
    // ---- C1: the clip.
    await step('C1', async function () {
      var hits = [];
      Array.from(document.styleSheets).forEach(function (s) {
        var rules; try { rules = s.cssRules; } catch (e) { return; }
        Array.from(rules || []).forEach(function (r) {
          if (r.selectorText && r.selectorText.indexOf('::-webkit-datetime-edit-year-field') !== -1) hits.push({ sel: r.selectorText, width: r.style.width, overflow: r.style.overflow, justify: r.style.justifyContent });
        });
      });
      // The build may write the two selectors as one rule or as two (it did as two), so each is looked for on its own.
      var clips = hits.filter(function (x) { return x.width === '2ch' && x.overflow === 'hidden' && x.justify === 'flex-end'; });
      function clipped(scope) { return clips.some(function (x) { return x.sel.indexOf(scope) !== -1; }); }
      // Equal-width digits on the box itself (on the year field alone Chrome ignores them, and 2011 showed "011").
      var tab = { sidebar: getComputedStyle(byId('start-prePrep')).fontVariantNumeric,
                  tool: byId('tool-solve-date') ? getComputedStyle(byId('tool-solve-date')).fontVariantNumeric : null };
      kase('C1', 'the stylesheet clips the year field to its last two digits in .form-panel and .tools-menu, and both boxes use tabular figures',
        clipped('.form-panel') && clipped('.tools-menu') && tab.sidebar === 'tabular-nums' && tab.tool === 'tabular-nums', { rules: hits, tabular: tab });
    });
    kase('E0', 'no console errors', (window.__ERR || []).length === 0, { errors: (window.__ERR || []).slice(0, 5) });
  } catch (e) { kase('EX', 'harness: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  T.done(out);
})(); });
