// legacyparse -- the legacy .html reader is linear: a crafted ~3 MB file parses or is refused
// FAST (FIX-PLAN.md 4.3; AUDIT-REPORT L-22).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh legacyparse 300
//
// parseCalendarText lifted the saved-state block out of a legacy .html with ONE regex,
// /<script[^>]*id=["']saved-state["'][^>]*>([\s\S]*?)<\/script>/i. On a file of `<script ` openers
// with no `>`, every opener's [^>]* scans to the end of the file: quadratic. Measured in Node
// (V8, as Chrome) 29 Sep 2026, openers every 150 chars: 100 KB 1.8 s, x4 per doubling, about 87 s at
// 3 MB -- the audit's figure. Openers that carry the id but no `>` are worse (25 KB 12 s, 50 KB 99 s).
//
// The files are generated HERE, not committed: 3 MB of `<script ` is not a fixture anyone needs to
// read, and every byte of it is synthetic (tests/fixtures/README.md).
//
//   P1  v1.0.0-saved.html through the real picker loads (the restore leg's file, the reader's contract)
//   P2  the same file with 20 KB of `<script …` spam (no `>`) right before the saved-state opener:
//       the old regex's LEFTMOST match starts in the spam and still lifts the real block, so the new
//       reader must too. Small, so the pre-fix build finishes it: this is equivalence, not timing.
//   T0  100 KB of bare `<script ` openers: refused with the page blocked under 100 ms. The pre-fix
//       build blocks 430 ms in the pane and 1.6 s headless; at 200 KB it froze the pane for minutes.
//       ⛔ Keep the threshold far below the pre-fix figure: T0 is the GATE for T1-T4, and at 300 ms a
//       lucky pre-fix run slipped under it, went on to 3 MB and pinned a renderer at 100% CPU for
//       as long as it was left. The fix blocks 0-3 ms.
//       ⛔ PROVE THIS LEG RED IN THE PANE, NOT WITH run.sh. Under --virtual-time-budget a long
//       blocking task costs many times its own length in WALL time (probed 29 Sep 2026: 11 s of
//       regex took 2.5 min), so on the pre-fix build every run.sh run of this leg ran past the 930 s
//       cap and dumped 0 bytes. In the pane (real time) the pre-fix build finishes it and reports
//       the number. The fixed build never blocks, so run.sh -- and the gate -- run it normally.
//   T1  3 MB of openers every 150 chars, no `>`: refused in under 3 s (the pre-fix build takes ~87 s)
//   T2  3 MB of `<script id="saved-state" ` with no `>`: refused fast
//   T3  3 MB of `<script id="saved-state">` with no closer: refused fast
//   T4  3 MB of T1's spam, then v1.0.0's real block: PARSES fast, the calendar loads
//   T2-T4 run only when T1 passed: on the pre-fix build each would freeze the tab for minutes or
//   more, and the dump would never come. They are reported as failed, not skipped silently.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function title(){ var e = document.getElementById('show-title'); return e ? e.value : null; }
  var FAST_MS = 3000;

  // Load `text` as `name` through the real picker; resolve with how it ended and how long it took.
  // Load `text` as `name` through the real picker. `ms` is the longest the page was BLOCKED: the
  // widest gap between two 100 ms poll ticks, less the 100 ms. A blocking parse is one long task,
  // so it shows up as one long gap, and a gap is REAL time even under --virtual-time-budget
  // (probed 29 Sep 2026: a 1.6 s regex advanced performance.now() by 1611 ms).
  // ⚠️ Keep the polls at 100 ms. At 20 ms, every run on this page ran past run.sh's 930 s cap:
  // under the virtual-time budget each timer tick costs real time on a page this size.
  async function load(text, name, expectTitle){
    var msg = '', loaded = false, picked = false, maxGap = 0;
    var p = T.openViaFakePicker(null, name, {text: text}).then(function () { picked = true; });
    for(var g = 0; g < 80 && !picked; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); } }
    await p;
    var last = performance.now();
    // 3000 polls, not 300: reading a 3 MB File is real async I/O the virtual clock does not wait
    // for, and at 300 (30 virtual s) run.sh raced past T1's read and saw neither verdict.
    for(var i = 0; i < 3000; i++){
      await T.sleep(100);
      var now = performance.now(); maxGap = Math.max(maxGap, now - last); last = now;
      var mt = T.modalText();
      if(/couldn|doesn.t contain|newer version/i.test(mt)){ msg = mt; break; }
      if(expectTitle != null && title() === expectTitle){ loaded = true; break; }
    }
    if(msg) T.clickModalButton(/OK|Close/);
    await T.sleep(400);
    return {ms: Math.max(0, Math.round(maxGap - 100)), refused: !!msg, msg: msg.slice(0, 90), loaded: loaded, title: title()};
  }

  try {
    await T.appReady();
    var real = await (await fetch('/tests/fixtures/v1.0.0-saved.html')).text();
    // The fixture's own title, lifted with plain indexOf so the leg does not use the reader it tests.
    var a = real.indexOf('id="saved-state"'), b = real.indexOf('>', a) + 1, c = real.indexOf('<\/script>', b);
    var wantTitle = JSON.parse(real.slice(b, c)).fields.byId['show-title'].value;   // v1.0.0 stores {value}
    var opener = real.lastIndexOf('<script', a);

    var r1 = await load(real, 'v1.0.0-saved.html', wantTitle);
    add('P1', 'v1.0.0-saved.html loads through the picker', r1.loaded && r1.title === wantTitle, r1, 'title ' + wantTitle);

    // Move off the fixture's title so P2 has something to prove.
    T.set('show-title', 'Legacy Parse Control'); await T.sleep(1200);
    var spamSmall = ''; while(spamSmall.length < 20000) spamSmall += '<script ' + 'x'.repeat(142);
    var r2 = await load(real.slice(0, opener) + spamSmall + real.slice(opener), 'spam-before.html', wantTitle);
    add('P2', 'spam openers right before the real block: the real block is still lifted (the old regex\'s leftmost match)',
      r2.loaded && r2.title === wantTitle, r2, 'title ' + wantTitle);

    var MB3 = 3 * 1024 * 1024;
    function fill(unit){ var n = Math.ceil(MB3 / unit.length); return unit.repeat(n); }
    var spaced = fill('<script ' + 'x'.repeat(142));
    var before = title();
    // T0 first, at 100 KB: small enough that the pre-fix build FINISHES it and reports a measured
    // time (red), where the 3 MB cases would freeze it past run.sh's cap and report nothing. The
    // 3 MB cases run only once T0 shows the reader is linear.
    var r0 = await load('<script '.repeat(12500), 'crafted-100k.html', null);
    add('T0', '100 KB of bare openers, no ">": refused in under 100 ms, calendar untouched',
      r0.refused && r0.ms < 100 && r0.title === before, {ms: r0.ms, refused: r0.refused, msg: r0.msg}, 'refused, < 100 ms');
    if(!cases[cases.length - 1].pass){
      ['T1', 'T2', 'T3', 'T4'].forEach(function (id) {
        add(id, 'not run: T0 shows the reader is still super-linear, and a 3 MB case would freeze the tab', false, 'not run', 'T0 passes');
      });
      throw 'SKIP';
    }
    var r3 = await load(spaced, 'crafted-spaced.html', null);
    add('T1', '3 MB of openers every 150 chars, no ">": refused in under ' + FAST_MS + ' ms, calendar untouched',
      r3.refused && r3.ms < FAST_MS && r3.title === before, {ms: r3.ms, refused: r3.refused, msg: r3.msg, bytes: spaced.length}, 'refused, < ' + FAST_MS + ' ms');

    if(cases[cases.length - 1].pass){
      var r4 = await load(fill('<script id="saved-state" '), 'crafted-idnogt.html', null);
      add('T2', '3 MB of id-carrying openers with no ">": refused fast', r4.refused && r4.ms < FAST_MS && r4.title === before,
        {ms: r4.ms, refused: r4.refused, msg: r4.msg}, 'refused, < ' + FAST_MS + ' ms');
      var r5 = await load(fill('<script id="saved-state">'), 'crafted-noclose.html', null);
      add('T3', '3 MB of saved-state openers with no closer: refused fast', r5.refused && r5.ms < FAST_MS && r5.title === before,
        {ms: r5.ms, refused: r5.refused, msg: r5.msg}, 'refused, < ' + FAST_MS + ' ms');
      T.set('show-title', 'Legacy Parse Control 2'); await T.sleep(1200);
      var r6 = await load(spaced + real.slice(opener), 'crafted-thenreal.html', wantTitle);
      add('T4', '3 MB of spam, then a real saved-state block: PARSES fast and the calendar loads',
        r6.loaded && r6.ms < FAST_MS, {ms: r6.ms, loaded: r6.loaded, title: r6.title}, 'title ' + wantTitle + ', < ' + FAST_MS + ' ms');
    } else {
      ['T2', 'T3', 'T4'].forEach(function (id) {
        add(id, 'not run: T1 shows the reader is still super-linear, and this case would freeze the tab', false, 'not run', 'T1 passes');
      });
    }
  } catch (e) { if(e !== 'SKIP') cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'legacyparse', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
// ⛔ Never write the closing-script-tag literal in this file, even in a comment: srv.js injects a leg
// INLINE inside a script element, so the HTML parser ends the leg at the first one and nothing runs
// (the leg reads "STILL PENDING"). Written escaped with a backslash before the slash throughout.
