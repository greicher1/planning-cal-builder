// swapwords -- the part-column (per-week) swap says what it does in plain words (audit AUD2-028; owner decision D5 b,
// 14 Nov 2026: keep it, with a preview and plain-English refusals). Started from the audit's repro leg audit-s1-partial.js.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=swapnoop-three ./run.sh swapwords 200
//   HARNESS_PAGE=/dist/index.html ./run.sh swapwords 200                                (no fixture: T.buildFixture)
//
// swapnoop-three: four phase columns in late 2026. ⌘-click Pre-Prep 12/14/26 and press Alt+→ / Alt+←. Before the fix no
// circle appeared and both keys answered "Can't swap: it would re-flow weeks you did not select by more than one column."
//   R1  each refusal is plain: no "slot", "lane", "stint", "col" or "re-flow"                              (red before)
//   R2  ...names Pre-Prep and the weeks or week it is about                                                 (red before)
//   R3  ...and, since Swap Column is offered on Pre-Prep in 2026, says it can swap the whole column        (red before)
//   R4  nothing moved
// T.buildFixture: ⌘-click Post 3/1/27, the one week it shares with Localization. The swap is offered and would change
// other weeks of 2027 (Post's lone weeks widen, Localization's change shape).
//   R5  those weeks are shaded amber as soon as the circle shows, before any press                       (red before)
//   R6  the Help says what a swap can change: no "aren't touched", no "same widths", and a click is enough  (red before)
//
// ⚠️ Run against the BUILD (HARNESS_PAGE=/dist/index.html).
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases};
  function C(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function $(i) { return document.getElementById(i); }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function txt(e) { return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function drawn() {
    var t = document.querySelector('#table-wrap table.sheet-table'); if (!t) return '';
    var x0 = t.getBoundingClientRect().left;
    return qa('#table-wrap td.sheet-phase-cell[data-pkey]').map(function (td) {
      var r = td.getBoundingClientRect(); return td.dataset.pkey + '@' + td.dataset.week + ':' + Math.round(r.left - x0) + '+' + Math.round(r.width);
    }).join(' ');
  }
  async function settle() {
    await T.until(function () { return qa('#table-wrap td.sheet-phase-cell').length > 5; }, 'grid', 300, 100);
    var last = '', st = 0;
    await T.until(function () { var s = drawn(); st = (s === last) ? st + 1 : 0; last = s; return st >= 3; }, 'settled', 300, 100);
  }
  function cell(wk, key) { return document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"][data-week="' + wk + '"]:not(.sheet-hiatus-cell)'); }
  function centre(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + Math.min(r.width / 2, 20)), y: Math.round(r.top + r.height / 2) }; }
  async function cmdClick(el) {
    el.scrollIntoView({block: 'center'}); await T.sleep(100);
    var c = centre(el);
    ['pointerdown', 'pointerup'].forEach(function (type) {
      el.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, composed: true, clientX: c.x, clientY: c.y,
        button: 0, buttons: type === 'pointerdown' ? 1 : 0, pointerId: 7, pointerType: 'mouse', isPrimary: true, metaKey: true}));
    });
    el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, clientX: c.x, clientY: c.y, metaKey: true}));
    await T.sleep(700);   // past the knob's debounced verdict
  }
  function chips() { return qa('.grid-swap-layer .grid-swap-chip').map(txt).filter(Boolean); }
  function knobs() { return qa('.grid-swap-knob').map(function (k) { return k.dataset.dir + (k.classList.contains('is-partial') ? 'amber' : '') + ':' + (k.getAttribute('aria-label') || ''); }); }
  var engine = /\b(slot|slots|lane|lanes|stint|stints|col|cols|re-?flows?)\b/i;
  try {
    await T.appReady();
    var three = $('show-title').value === 'Swap No-op Three Fixture';
    if (!three) { T.buildFixture(); }
    await settle();
    if (three) {
      await cmdClick(cell('2026-12-14', 'prePrep'));
      out.knobs = knobs();
      var before = drawn(), said = [];
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      T.altSwap(1); await T.sleep(400); said.push(chips().join(' / '));
      await T.sleep(4500);
      T.altSwap(-1); await T.sleep(400); said.push(chips().join(' / '));
      await settle();
      out.said = said;
      C('R1', 'each refusal is in plain words', said.every(function (s) { return s && !engine.test(s); }), said, 'no slot / lane / stint / col / re-flow');
      C('R2', 'each names Pre-Prep and a date', said.every(function (s) { return /Pre-Prep/.test(s) && /\d+\/\d+\/\d+/.test(s); }), said, 'Pre-Prep and a date');
      C('R3', 'each says Swap Column can swap the whole column', said.every(function (s) { return /Swap Column/.test(s); }), said, '"Swap Column"');
      C('R4', 'nothing moved', drawn() === before, null, 'grid unchanged');
    } else {
      await cmdClick(cell('2027-03-01', 'post'));
      await T.until(function () { return qa('.grid-swap-knob').length > 0; }, 'a circle', 60, 100);
      await T.sleep(300);
      out.knobs = knobs();
      out.amber = qa('.grid-sel-layer .grid-swap-collateral').length;
      C('R5', 'the weeks a swap would change are shaded amber as soon as its circle shows (' + out.knobs.join(' | ') + ')', out.amber > 0, out.amber, 'amber boxes > 0');
      var help = (document.body.textContent || '').replace(/\s+/g, ' ');
      var i = help.indexOf('Swapping two phases'), para = i >= 0 ? help.slice(i, i + 1600) : '';
      out.help = para.slice(0, 700);
      C('R6', 'Help: no "aren\'t touched", no "same widths", and a click with Alt+arrow is enough',
        !!para && !/aren.t touched/.test(para) && !/same widths/.test(para) && /Click a cell of the phase you want to move/.test(para), out.help, 'corrected Help');
    }
    C('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0, {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts}, 'none');
  } catch (e) { C('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception'); }
  T.done(out);
})(); });
