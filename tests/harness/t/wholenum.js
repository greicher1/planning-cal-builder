// wholenum -- a weeks or days count that is not a whole number is ringed and says "Whole weeks
// only" / "Whole days only"; the schedule is unchanged (FIX-PLAN.md 4.6; AUDIT-REPORT L-12, and the
// defaults table's L-12 row: "Keep whole-number semantics. Ring the field ... The schedule does not
// change").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh wholenum 150
//
// Every duration is read with parseInt, so 2.5 weeks is 2, "1e3" is 1 and a 7.5-day episode is 7 --
// silently. The Show Info counts are Mantine NumberInputs with allowDecimal={false}, so a decimal
// cannot be typed there; these are the six engine fields that take one.
//
//   W0  the reference calendar: nothing ringed, no message
//   W1  Post's weeks 2.5: ringed, "Whole weeks only" under the field, and the grid IS the 2-week grid
//   W2  Post's weeks "1e3" (1000 to the input, 1 to parseInt): ringed
//   W3  Post's weeks "2.0" is a whole number: NOT ringed
//   W4  the 12/21/26 hiatus's weeks 1.5: ringed with "Whole weeks only"
//   W5  Post's own hiatus's weeks 1.5 (enabled): ringed with "Whole weeks only"
//   W6  Sim Post's offset 2.5 (enabled): ringed with "Whole weeks only"
//   W7  an episode's days 7.5: its day box is ringed, "Whole days only" under the row, and
//       Production's total is the one it is with 7
//   W8  Blocks mode, a block's days 10.5: its day box is ringed with "Whole days only"
//   W9  everything whole again: nothing ringed, no message anywhere
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function setEl(e, v){
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(e, v);
    ['input', 'change'].forEach(function (t) { e.dispatchEvent(new Event(t, {bubbles: true})); });
  }
  function ringed(){
    return Array.from(document.querySelectorAll('.form-panel input.is-invalid')).map(function (e) {
      return e.id || ('.' + e.className.split(/\s+/).filter(function (c) { return c !== 'is-invalid' && c !== 'is-edited'; }).join('.'));
    });
  }
  // What the user READS: the generated text on the message host (the field's label, or the row).
  function said(el){
    var host = el && (el.closest('.episode-row') || el.closest('.block-head') || el.closest('label'));
    if(!host) return null;
    var c = getComputedStyle(host, '::after').content;
    if(!c || c === 'none' || c === 'normal') return '';
    return (c.charAt(0) === '"' && c.charAt(c.length - 1) === '"') ? c.slice(1, -1) : c;   // no dollar sign in a leg
  }
  // A box's border colour, for the day fields, whose visible border is the .num-suffix label's.
  function boxBorder(el){ var b = el && el.closest('.num-suffix'); return b ? getComputedStyle(b).borderTopColor : null; }
  function messages(){ return Array.from(document.querySelectorAll('.form-panel *')).filter(function (e) { var c = getComputedStyle(e, '::after').content; return /Whole (weeks|days) only/.test(c || ''); }).length; }
  // JSON, because gridSignature() returns an ARRAY: two of them are never === (found writing this leg).
  function sig(){ return JSON.stringify(T.gridSignature()); }
  function total(){ return ((document.getElementById('prod-total-readout') || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  var WEEKS = 'Whole weeks only', DAYS = 'Whole days only';
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the reference grid', 100, 100);
    await T.sleep(1200);
    add('W0', 'the reference calendar: nothing ringed, no message', ringed().length === 0 && messages() === 0,
      {ringed: ringed(), messages: messages()}, 'ringed [], 0 messages');

    var post = document.getElementById('weeks-post');
    T.set('weeks-post', '2'); await T.sleep(1000);
    var sig2 = sig();
    T.set('weeks-post', '2.5'); await T.sleep(1000);
    var sig25 = sig();
    add('W1', 'Post at 2.5 weeks: ringed, "Whole weeks only" under it, and the grid is exactly the 2-week grid',
      same(ringed(), ['weeks-post']) && said(post) === WEEKS && sig25 === sig2,
      {ringed: ringed(), said: said(post), sameGridAs2: sig25 === sig2}, {ringed: ['weeks-post'], said: WEEKS, sameGridAs2: true});

    T.set('weeks-post', '1e3'); await T.sleep(1000);
    add('W2', 'Post at "1e3" weeks (1 to the schedule): ringed', same(ringed(), ['weeks-post']) && said(post) === WEEKS,
      {value: post.value, ringed: ringed(), said: said(post)}, {ringed: ['weeks-post']});

    T.set('weeks-post', '2.0'); await T.sleep(1000);
    add('W3', 'Post at "2.0" weeks is whole: not ringed, no message', ringed().length === 0 && said(post) === '',
      {ringed: ringed(), said: said(post)}, 'ringed [], no message');
    T.set('weeks-post', '16'); await T.sleep(1000);

    var hw = document.querySelector('#hiatus-list .hiatus-entry .hiatus-weeks'), hwOrig = hw.value;
    setEl(hw, '1.5'); await T.sleep(1000);
    add('W4', 'the 12/21/26 hiatus at 1.5 weeks: ringed, "Whole weeks only"', same(ringed(), ['.hiatus-weeks']) && said(hw) === WEEKS,
      {ringed: ringed(), said: said(hw)}, {ringed: ['.hiatus-weeks'], said: WEEKS});
    setEl(hw, hwOrig); await T.sleep(800);

    var en = document.getElementById('phiatus-en-post');
    if(!en.checked) en.click();
    await T.sleep(600);
    T.set('phiatus-start-post', '2026-12-07'); T.set('phiatus-weeks-post', '1.5'); await T.sleep(1000);
    var pw = document.getElementById('phiatus-weeks-post');
    add('W5', 'Post\'s own hiatus at 1.5 weeks: ringed, "Whole weeks only"', same(ringed(), ['phiatus-weeks-post']) && said(pw) === WEEKS,
      {ringed: ringed(), said: said(pw)}, {ringed: ['phiatus-weeks-post'], said: WEEKS});
    T.set('phiatus-weeks-post', '2'); en.click(); await T.sleep(800);

    var sp = document.getElementById('simpost-enabled');
    if(!sp.checked) sp.click();
    await T.sleep(600);
    T.set('simpost-offset', '2.5'); await T.sleep(1000);
    var so = document.getElementById('simpost-offset');
    add('W6', 'Sim Post\'s offset at 2.5 weeks: ringed, "Whole weeks only"', same(ringed(), ['simpost-offset']) && said(so) === WEEKS,
      {ringed: ringed(), said: said(so)}, {ringed: ['simpost-offset'], said: WEEKS});
    T.set('simpost-offset', '0'); sp.click(); await T.sleep(800);

    var ep = document.querySelector('#episode-rows .ep-days');
    var restBorder = boxBorder(ep);
    setEl(ep, '7'); await T.sleep(1000);
    var total7 = total();
    setEl(ep, '7.5'); await T.sleep(1000);
    ep = document.querySelector('#episode-rows .ep-days');   // the list re-renders
    add('W7', 'an episode at 7.5 days: its day box is ringed, "Whole days only" under the row, and Production\'s total is the 7-day one',
      ep.classList.contains('is-invalid') && boxBorder(ep) !== restBorder && said(ep) === DAYS && total() === total7,
      {ringed: ringed(), border: boxBorder(ep), restBorder: restBorder, said: said(ep), total: total(), total7: total7},
      {said: DAYS, total: total7});
    setEl(ep, '8'); await T.sleep(1000);

    T.set('show-mode', 'blocks'); await T.sleep(800);
    T.set('num-blocks', '5'); T.set('days-per-block', '16'); await T.sleep(1200);
    var bd = document.querySelector('#episode-rows .blk-days');
    if(bd){
      var bRest = boxBorder(bd);
      setEl(bd, '10.5'); await T.sleep(1000);
      bd = document.querySelector('#episode-rows .blk-days');
      add('W8', 'Blocks mode, a block at 10.5 days: its day box is ringed with "Whole days only"',
        bd.classList.contains('is-invalid') && boxBorder(bd) !== bRest && said(bd) === DAYS,
        {ringed: ringed(), border: boxBorder(bd), rest: bRest, said: said(bd)}, {said: DAYS});
      setEl(bd, '16'); await T.sleep(800);
    } else {
      add('W8', 'Blocks mode, a block at 10.5 days', false, 'no .blk-days field appeared', 'a block row');
    }
    T.set('show-mode', 'episodes'); await T.sleep(1200);

    add('W9', 'everything whole again: nothing ringed, no message anywhere', ringed().length === 0 && messages() === 0,
      {ringed: ringed(), messages: messages()}, 'ringed [], 0 messages');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'wholenum', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
