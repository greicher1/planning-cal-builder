// wfcorner -- Hide in waterfall is the eye in the phase card's top right corner, and the "Month view only" tag is the
// same spot (owner, 18 Nov 2026: option A of mockups/hide-in-waterfall-corner.html, "Build A"; then "lets go with
// fix 1": the tag is an icon the eye's size, its words in its hover text). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh wfcorner 200
//
// app.js MVONLY_TAG / phaseHeadHtml / the corner's delegated click; legacy.css .phase-head-corner, .phase-wf-eye:
//   K1  every card that can be hidden has a corner with the eye showing and the tag hidden; Production has no corner;
//       Episodic Prep's and Double-ups' corners hold the tag as plain text (a span), showing; no id in any corner
//   K2  the body's Hide in waterfall row is hidden on every card; a built-in phase's whole switch block is gone (its two
//       rows, Snap to Monday and Hide in waterfall, both moved); a custom phase keeps Number weeks
//   K3  a click on the eye (hit-tested) hides the phase: its tick on, the tag in the eye's place, the phase out of the
//       waterfall's text, and the name's room unchanged
//   K4  the tag is an icon the eye's size: 22 x 22, its words not drawn (font-size 0) but its text and title say
//       "Month view only", and it is a button
//   K5  a click on the tag (hit-tested) shows the phase again; one undo step each way
//   K6  a folded card keeps its corner, and the eye still works there
//   K7  a custom phase: its x is in the corner, and the dates line under the name keeps the head's full text width
//   F1  no field id added (formSignature's keys unchanged)
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id){ return document.getElementById(id); }
  async function settle(){ await T.sleep(700); }
  function rowOf(key){ var sw = byId('swatch-' + key); return sw ? sw.closest('.phase-row') : null; }
  function corner(key){ var r = rowOf(key); return r ? r.querySelector('.custom-phase-header .phase-head-corner') : null; }
  function eye(key){ var r = rowOf(key); return r ? r.querySelector('.phase-head-corner .phase-wf-eye') : null; }
  function tag(key){ var r = rowOf(key); return r ? r.querySelector('.phase-head-corner .phase-mvonly-tag') : null; }
  function tick(key){ var r = rowOf(key); return r ? r.querySelector('.phase-hidewf-cb') : null; }
  function vis(el){ return !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0; }
  function nameW(key){ var r = rowOf(key); return r ? Math.round(r.querySelector('.phase-name-input').getBoundingClientRect().width) : null; }
  function wfText(){ return (byId('table-wrap').textContent || ''); }
  async function hitClick(el, what){
    el.scrollIntoView({block: 'center'}); await T.sleep(150);
    var r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if(hit !== el) throw new Error(what + ' is not on top at its centre (got ' + (hit && (hit.className || hit.tagName)) + ')');
    hit.click(); await settle();
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the fixture grid', 200, 100);
    var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if(tab) tab.click();
    await settle();
    var keysBefore = Object.keys(T.formSignature()).sort().join();
    byId('add-phase-btn').click(); await settle();
    var units = document.querySelectorAll('.form-panel select[id^="unit-custom"]');
    var ckey = units.length ? units[units.length - 1].id.slice(5) : null;
    if(ckey){ T.set('name-' + ckey, 'Colour Grading'); T.set('start-' + ckey, '2027-01-11'); T.set('weeks-' + ckey, '2'); await settle(); }
    keysBefore = Object.keys(T.formSignature()).sort().join();   // with the custom phase's own ids

    // ---- K1: the corners
    var HIDE = ['writersRoom', 'prePrep', 'prodPrep', 'post', 'localization'].concat(ckey ? [ckey] : []);
    var k1 = HIDE.map(function (k) { return {k: k, corner: !!corner(k), eye: vis(eye(k)), tagHidden: !!tag(k) && tag(k).hidden, tagIsButton: !!tag(k) && tag(k).tagName === 'BUTTON'}; });
    // Their cards may not be drawn on this calendar (no episodes yet), so the tag itself is asked, not its box.
    var fixed = ['episodePrep', 'doubleUp'].map(function (k) { var t = tag(k); return {k: k, tag: t ? t.tagName : null, shown: !!t && !t.hidden && getComputedStyle(t).display !== 'none', eye: !!eye(k)}; });
    var ids = document.querySelectorAll('.phase-head-corner [id], .phase-head-corner[id]').length;
    add('K1', 'a hideable card: eye shown, tag hidden (a button); Production: no corner; Episodic Prep and Double-ups: the tag as text, shown; no id in a corner',
      k1.every(function (x) { return x.corner && x.eye && x.tagHidden && x.tagIsButton; }) && !corner('production') &&
      fixed.every(function (x) { return x.tag === 'SPAN' && x.shown && !x.eye; }) && ids === 0,
      {hideable: k1, fixed: fixed, production: !!corner('production'), ids: ids}, 'as titled');

    // ---- K2: the body
    var rows = Array.from(document.querySelectorAll('#phase-rows > .phase-row, #custom-phase-rows > .phase-row'));
    var hidewfShown = rows.filter(function (r) { var x = r.querySelector('.phase-hidewf'); return x && vis(x); }).length;
    var builtBlocks = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'].map(function (k) { var b = rowOf(k).querySelector('.phase-switches'); return b ? getComputedStyle(b).display : 'none'; });
    var wk = ckey ? rowOf(ckey).querySelector('.phase-wknum') : null;
    add('K2', 'no card shows the Hide in waterfall row; a built-in phase\'s switch block is gone; a custom phase keeps Number weeks',
      hidewfShown === 0 && builtBlocks.every(function (d) { return d === 'none'; }) && vis(wk),
      {hidewfShown: hidewfShown, builtBlocks: builtBlocks, numberWeeks: vis(wk)}, '0 shown, every block none, Number weeks shown');

    // ---- K3: the eye hides
    var w0 = nameW('localization'), inWf0 = /Localization/.test(wfText());
    await hitClick(eye('localization'), 'Localization\'s eye');
    var k3 = {tick: tick('localization').checked, eye: vis(eye('localization')), tag: vis(tag('localization')),
              inWf: /Localization/.test(wfText()), nameW: nameW('localization'), nameW0: w0, inWf0: inWf0};
    add('K3', 'a click on the eye hides the phase: tick on, the tag in its place, out of the waterfall, the name\'s room unchanged',
      k3.tick && !k3.eye && k3.tag && k3.inWf0 && !k3.inWf && k3.nameW === k3.nameW0, k3, 'tick on, tag shown, gone from the waterfall, same name width');

    // ---- K4: the tag is an icon
    var t = tag('localization'), tr = t.getBoundingClientRect(), tcs = getComputedStyle(t);
    var k4 = {w: Math.round(tr.width), h: Math.round(tr.height), fontSize: tcs.fontSize, text: t.textContent, title: t.title, button: t.tagName};
    add('K4', 'the tag is a 22 x 22 icon button: its words not drawn, its text and title say "Month view only"',
      k4.w === 22 && k4.h === 22 && k4.fontSize === '0px' && k4.text === 'Month view only' && /^Month view only\./.test(k4.title) && k4.button === 'BUTTON',
      k4, '22 x 22, font-size 0px, text and title "Month view only"');

    // ---- K5: the tag shows it again; one undo step each way
    await hitClick(tag('localization'), 'Localization\'s tag');
    var shown = !tick('localization').checked && vis(eye('localization')) && /Localization/.test(wfText());
    byId('undo-btn').click(); await settle();
    var undone = tick('localization').checked && vis(tag('localization'));
    byId('redo-btn').click(); await settle();
    var redone = !tick('localization').checked && vis(eye('localization'));
    add('K5', 'a click on the tag shows the phase again; Undo hides it, Redo shows it (one step each)', shown && undone && redone,
      {shown: shown, undone: undone, redone: redone}, 'all true');

    // ---- K6: folded
    var caret = rowOf('post').querySelector(':scope > .custom-phase-header > .phase-collapse-btn');
    caret.click(); await T.sleep(200);
    var folded = rowOf('post').classList.contains('is-collapsed'), eyeFolded = vis(eye('post'));
    if(eyeFolded) await hitClick(eye('post'), 'Post\'s eye (folded)');
    var hidFolded = tick('post').checked && vis(tag('post'));
    if(hidFolded) await hitClick(tag('post'), 'Post\'s tag (folded)');
    caret.click(); await T.sleep(200);
    add('K6', 'a folded card keeps its corner, and the eye and the tag work there', folded && eyeFolded && hidFolded && !tick('post').checked,
      {folded: folded, eye: eyeFolded, hid: hidFolded, back: !tick('post').checked}, 'all true');

    // ---- K7: the custom phase's x and the dates line
    var k7 = null;
    if(ckey){
      var r = rowOf(ckey), x = r.querySelector('.remove-custom-phase'), text = r.querySelector('.phase-head-text'), meta = byId('meta-' + ckey);
      k7 = {xInCorner: !!(x && x.closest('.phase-head-corner')), metaW: Math.round(meta.getBoundingClientRect().width), textW: Math.round(text.getBoundingClientRect().width), meta: meta.textContent};
    }
    add('K7', 'a custom phase: its x sits in the corner, and the dates line keeps the head\'s full text width',
      !!k7 && k7.xInCorner && k7.meta.length > 0 && k7.metaW >= k7.textW - 1, k7, 'x in the corner; meta width = text width');

    // ---- F1: no field ids
    var keysAfter = Object.keys(T.formSignature()).sort().join();
    add('F1', 'the corner adds no field id', keysAfter === keysBefore, {before: keysBefore.split(',').length, after: keysAfter.split(',').length}, 'the same keys');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'wfcorner', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
