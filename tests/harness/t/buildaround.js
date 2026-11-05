// buildaround -- Build Around, Rebuild From's redesign (REBUILD-FROM-LENGTHS-PLAN.md, layout B, owner 5 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh buildaround 600
//
// The owner's asks: keep the tool but tick Writer's Rm off by default ("keep writers room, just maybe have it unchecked
// by default"); let a length be typed in the box ("What if you could enter number of weeks within the menu? Cuz right
// now thats the holdup"); one list for both sides (B); renamed Build Around; Production's length never editable in the
// box ("production should be the one phase you aren't allow[ed] to edit/change duration from the build around menu");
// R2(a) lengths saved on Build, one undo; R3 "ends by". Close all gaps is gone (it pushed the shoot on every one of the
// owner's calendars).
//
// PART 1, A NEW CALENDAR (nothing entered, as the app boots):
//   N1      the box offers every phase (today's said "No phases scheduled yet"), Production pinned, "Pick a date"
//   N2      Production's length reads "Not set", read-only, and the Show info line is up
//   N3      typing Pre Prep 6 and Prod Prep 6 ticks those rows and places them back from the shoot date; the fields are
//           NOT written yet (staged); Post typed 16 reads "Can't place" (Production has no length)
//   N4      Build: both phases dated, all three lengths saved (Post's too), the result line says the phases after
//           Production wait for Show info; one undo takes back dates AND lengths
// PART 2, buildFixture() (synthetic: US-General, 10 eps x 8 days; Writer's Rm 1/5/26 x 12, Pre Prep 4/6 x 6, Prod
// Prep 5/18 x 6, Production 6/29, Post 11/2 x 16, Localization 3/1/27 x 8):
//   O1-O4   opening: the name and heading, every phase in run order with the pin in its place, Both pressed, Writer's Rm
//           unticked, Production's cell "80 days" with no input, the other lengths in boxes, no Close all gaps
//   B1-B3   the shoot pinned two weeks later: both sides in one run, the previewed dates delivered, one undo
//   S1-S3   Before / After shortcuts tick one side; a hand tick leaves none pressed
//   L1-L4   Prod Prep typed 8 with the shoot pinned where it is: Prod Prep and Pre Prep pulled 2 wks, the field still
//           6 until Build; Build saves 8 with the dates; one undo restores both
//   Z1      a length saved with nothing moved ("Save 1 length")
//   X1      closing the box forgets a typed length
//   E1-E5   "ends by": switching prefills the phase's last workday and the pin stays put; Prod Prep ends by Wed
//           7/8/26 -> its last Friday is 7/3, so it starts 5/25 (Pushed 1 wk), Pre Prep 4/13 behind it; the shoot by
//           its own wrap stays put, and with Before alone the button is the disabled "No changes"
//   P1      Show info incomplete: Production "Not set", the line shows, the phases after it "Can't place", and ends-by
//           on the shoot reads "Production needs Show info"
//   I1      no control in the list carries an id; I2 the crash backup after a Build holds none of the box's controls
//   K0      0 console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function val(id){ return ($(id) || {}).value; }
  var pop = function () { return $('pop-solve'); };
  function msg(){ return ((pop().querySelector('[data-tools-msg]') || {}).textContent || '').trim(); }
  function closePops(){ document.body.click(); }
  async function openBox(){ closePops(); await T.sleep(150); $('pop-solve-btn').click(); await T.sleep(400); }
  async function settle(){ await T.sleep(800); }
  function rowEls(){ return Array.prototype.filter.call(pop().querySelectorAll('.solve-row'), function (r) { return !r.classList.contains('solve-colhead'); }); }
  function rows(){
    return rowEls().map(function (r) {
      var box = r.querySelector('input[type=checkbox]'), len = r.querySelector('input[data-len]'), ro = r.querySelector('.solve-len-ro');
      function t(c){ var e = r.querySelector('.' + c); return e ? (e.textContent || '').trim() : ''; }
      return {nm: t('solve-nm'), dt: t('solve-dt'), ch: t('solve-ch'), pin: r.classList.contains('is-pin'),
              ticked: box ? (box.disabled ? null : box.checked) : null, len: len ? len.value : (ro ? ro.textContent.trim() : ''),
              staged: !!(len && len.classList.contains('is-staged'))};
    });
  }
  function row(name){ return rows().filter(function (r) { return r.nm === name; })[0] || {}; }
  function rowEl(name){ return rowEls().filter(function (r) { var n = r.querySelector('.solve-nm'); return n && n.textContent.trim() === name; })[0]; }
  function tick(name, on){ var b = rowEl(name) && rowEl(name).querySelector('input[data-key]'); if(b && b.checked !== on) b.click(); }
  async function typeLen(name, v){
    var box = rowEl(name) && rowEl(name).querySelector('input[data-len]');
    if(!box) throw new Error('no length box for ' + name);
    box.focus(); box.value = v; box.dispatchEvent(new Event('input', {bubbles: true}));
    await T.sleep(450);
  }
  function go(){ return $('tool-solve-go'); }
  function pressed(){
    return ['tool-solve-back', 'tool-solve-both', 'tool-solve-fwd'].filter(function (id) { return $(id).getAttribute('aria-pressed') === 'true'; })
      .map(function (id) { return $(id).textContent.trim(); }).join(',');
  }
  function note(){ var n = pop().querySelector('[data-solve-note]'); return n && !n.hidden; }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
  function starts(){ var o = {}; KEYS.forEach(function (k) { o[k] = val('start-' + k); }); return o; }
  function lens(){ var o = {}; KEYS.forEach(function (k) { if(k !== 'production') o[k] = val('weeks-' + k); }); return o; }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  async function undo(){ $('undo-btn').click(); await T.sleep(900); }
  async function setDate(iso){ T.set('tool-solve-date', iso); await T.sleep(450); }
  async function setPin(key){ T.set('tool-solve-phase', key); await T.sleep(450); }
  async function setEdge(e){ T.set('tool-solve-edge', e); await T.sleep(450); }

  try {
    await T.appReady();
    await T.sleep(600);

    // ===================== PART 1: a new calendar =====================
    await openBox();
    var opts = Array.prototype.map.call($('tool-solve-phase').options, function (o) { return o.value; });
    add('N1', 'a new calendar: every phase offered, Production pinned, "Pick a date"',
      same(opts, KEYS) && val('tool-solve-phase') === 'production' && go().textContent === 'Pick a date' && go().disabled,
      {opts: opts, pin: val('tool-solve-phase'), go: go().textContent}, KEYS.join(',') + '; production; "Pick a date"');
    add('N2', 'Production\'s length is read-only "Not set", and the Show info line is up',
      row('Production').len === 'Not set' && !(rowEl('Production') || document.body).querySelector('input[data-len]') && note(),
      {prod: row('Production'), note: note()}, '"Not set", no box, the line visible');
    await setDate('2026-06-29');
    await typeLen('Pre-Prep', '6');
    await typeLen('Prod Prep', '6');
    await typeLen('Post', '16');
    var rn = rows();
    add('N3', 'typed lengths tick their rows and place them back from the shoot; nothing is written yet; Post can\'t be placed',
      row('Pre-Prep').ticked === true && row('Pre-Prep').dt === '4/6/26' && row('Pre-Prep').ch === 'New' && row('Pre-Prep').staged
        && row('Prod Prep').dt === '5/18/26' && row('Prod Prep').ch === 'New'
        && row('Post').ticked === true && row('Post').ch === 'Can’t place'
        && row("Writer's Rm").ch === 'No length'
        && val('weeks-prePrep') === '' && val('weeks-prodPrep') === '' && val('weeks-post') === '' && val('start-prePrep') === ''
        && go().textContent === 'Build 2 phases' && !go().disabled,
      {rows: rn, go: go().textContent, fields: lens()}, 'Pre-Prep 4/6/26 New, Prod Prep 5/18/26 New, Post Can\'t place; fields blank; "Build 2 phases"');
    var n0 = {s: starts(), l: lens()};
    go().click(); await settle();
    add('N4a', 'Build: both phases dated, the shoot pinned, all three typed lengths saved (Post\'s too)',
      val('start-prePrep') === '2026-04-06' && val('start-prodPrep') === '2026-05-18' && val('start-production') === '2026-06-29'
        && val('weeks-prePrep') === '6' && val('weeks-prodPrep') === '6' && val('weeks-post') === '16' && val('start-post') === '',
      {s: starts(), l: lens()}, 'starts 4/6, 5/18, 6/29; weeks 6, 6, 16; Post undated');
    add('N4b', 'the result line: the pin, what was built, the lengths saved, and the phases after Production waiting',
      /^Production starts 6\/29\/26\. 2 phases built around it, 3 lengths saved\./.test(msg()) && /wait for its length in Show info/.test(msg()),
      {msg: msg()}, '"Production starts 6/29/26. 2 phases built around it, 3 lengths saved. … wait for its length in Show info."');
    await undo();
    add('N4c', 'one undo takes back the dates AND the lengths', same({s: starts(), l: lens()}, n0), {s: starts(), l: lens()}, n0);
    closePops(); await T.sleep(200);

    // ===================== PART 2: buildFixture =====================
    T.buildFixture();
    await T.until(function () { return /shoot days/.test((($('meta-production') || {}).textContent || '')); }, 'the shoot', 200, 100);
    await T.sleep(1500);
    var s0 = starts(), l0 = lens();
    add('T0', 'the calendar as built', s0.prePrep === '2026-04-06' && s0.prodPrep === '2026-05-18' && s0.production === '2026-06-29'
      && s0.post === '2026-11-02' && l0.prodPrep === '6', {s: s0, l: l0}, 'buildFixture');

    await openBox();
    var btn = $('pop-solve-btn').textContent.trim(), head = (pop().querySelector('.tools-head') || {}).textContent || '';
    add('O1', 'the button reads "Build Around", the box "Build around a phase", and Close all gaps is gone',
      /^Build Around/.test(btn) && /Build around a phase/.test(head) && !$('tool-close-gaps') && !/Rebuild/.test(pop().textContent),
      {btn: btn, head: head.trim(), closeGaps: !!$('tool-close-gaps')}, 'Build Around / Build around a phase / no #tool-close-gaps');
    var r0 = rows();
    add('O2', 'every phase in the order it runs, the pinned shoot in its place; Both pressed; it opens on starts',
      same(r0.map(function (r) { return r.nm; }), ["Writer's Rm", 'Pre Prep', 'Prod Prep', 'Production', 'Post', 'Localization'])
        && r0[3].pin && pressed() === 'Both' && val('tool-solve-edge') === 'start' && val('tool-solve-date') === '2026-06-29',
      {names: r0.map(function (r) { return r.nm; }), pressed: pressed(), edge: val('tool-solve-edge'), date: val('tool-solve-date')}, 'run order, pin 4th, Both, starts 6/29/26');
    add('O3', 'starting ticks: every built-in with a length EXCEPT Writer\'s Rm (owner); "4 of 5 ticked"',
      row("Writer's Rm").ticked === false && row("Writer's Rm").ch === 'Stays' && row('Pre Prep').ticked === true && row('Prod Prep').ticked === true
        && row('Post').ticked === true && row('Localization').ticked === true
        && (pop().querySelector('[data-solve-count]') || {}).textContent === '4 of 5 ticked',
      {rows: r0, count: (pop().querySelector('[data-solve-count]') || {}).textContent}, 'WR unticked Stays; four ticked');
    add('O4', 'Production\'s length is "80 days" with no box; the others are boxes holding their weeks; no Show info line',
      row('Production').len === '80 days' && !rowEl('Production').querySelector('input') && row('Pre Prep').len === '6' && row('Post').len === '16'
        && row("Writer's Rm").len === '12' && !note(),
      {prod: row('Production'), pre: row('Pre Prep').len, post: row('Post').len, note: note()}, '80 days; 6; 16; 12');
    var postNow = row('Post');

    // ---- B: the shoot two weeks later, both sides in one run ----
    var gridBefore = $('table-wrap').innerHTML;
    await setDate('2026-07-13');
    var rb = rows();
    var postPreview = row('Post').dt;
    add('B1', 'both sides previewed: the prep two weeks later behind the shoot, Post after it, Writer\'s Rm stays; nothing moved yet',
      row('Pre Prep').dt === '4/20/26' && row('Pre Prep').ch === 'Pushed 2 wks' && row('Prod Prep').dt === '6/1/26'
        && row('Production').dt === '7/13/26' && row('Production').ch === 'Pushed 2 wks'
        && /^Pushed /.test(row('Post').ch) && row("Writer's Rm").ch === 'Stays'
        && go().textContent === 'Build 4 phases' && same(starts(), s0) && $('table-wrap').innerHTML === gridBefore,
      {rows: rb, go: go().textContent, unmoved: same(starts(), s0)}, 'Pre Prep 4/20, Prod Prep 6/1, Production 7/13, Post Pushed; "Build 4 phases"');
    go().click(); await settle();
    var s1 = starts();
    var postShort = function (iso) { var p = iso.split('-'); return (+p[1]) + '/' + (+p[2]) + '/' + p[0].slice(2); };
    add('B2', 'Build delivers the previewed dates on both sides in one run; Writer\'s Rm untouched',
      s1.prePrep === '2026-04-20' && s1.prodPrep === '2026-06-01' && s1.production === '2026-07-13' && postShort(s1.post) === postPreview
        && s1.writersRoom === s0.writersRoom && /^Production starts 7\/13\/26\. 4 phases built around it\./.test(msg()),
      {s: s1, postPreview: postPreview, msg: msg()}, 'Pre Prep 4/20, Prod Prep 6/1, Production 7/13, Post ' + postPreview);
    // The crash backup after Build is the saved state: the box's controls (the edge picker is the one new id) must not
    // be in it. Waits for a backup newer than any before Build.
    var bk = null, at0 = ((T.latestBackup() || {}).at) || 0;
    await T.until(function () { bk = T.latestBackup(); return !!(bk && bk.state && bk.at > at0); }, 'a fresh crash backup', 150, 100);
    var byIdKeys = bk && bk.state && bk.state.fields ? Object.keys(bk.state.fields.byId) : [];
    add('I2', 'the saved state carries none of the box\'s controls (no tool-* or solve key in fields.byId)',
      byIdKeys.length > 10 && !byIdKeys.some(function (k) { return /^tool-|solve/.test(k); }),
      {keys: byIdKeys.length, leaked: byIdKeys.filter(function (k) { return /^tool-|solve/.test(k); })}, 'none');
    await undo();
    add('B3', 'one undo restores every phase', same(starts(), s0), starts(), s0);

    // ---- S: the shortcuts ----
    await openBox();
    $('tool-solve-back').click(); await T.sleep(400);
    var sb = rows();
    add('S1', 'Before: the prep ticked, Post and Localization not', pressed() === '← Before' && row('Pre Prep').ticked && row('Prod Prep').ticked
      && row('Post').ticked === false && row('Localization').ticked === false && row("Writer's Rm").ticked === false, {rows: sb, pressed: pressed()}, 'before side only');
    $('tool-solve-fwd').click(); await T.sleep(400);
    add('S2', 'After: Post and Localization ticked, the prep not', pressed() === 'After →' && row('Post').ticked && row('Localization').ticked
      && row('Pre Prep').ticked === false && row('Prod Prep').ticked === false, {rows: rows(), pressed: pressed()}, 'after side only');
    tick("Writer's Rm", true); await T.sleep(400);
    add('S3', 'a hand tick (Writer\'s Rm) leaves no shortcut pressed, and the room is then built like any phase',
      pressed() === '' && row("Writer's Rm").ticked === true, {pressed: pressed(), wr: row("Writer's Rm")}, 'none pressed; WR ticked');

    // ---- L: a length typed in the box ----
    await openBox();
    await typeLen('Prod Prep', '8');
    add('L1', 'Prod Prep 8 with the shoot where it is: Prod Prep and Pre Prep pulled 2 wks, the box marked typed, the field still 6',
      row('Prod Prep').dt === '5/4/26' && row('Prod Prep').ch === 'Pulled 2 wks' && row('Pre Prep').dt === '3/23/26' && row('Pre Prep').ch === 'Pulled 2 wks'
        && row('Prod Prep').staged && val('weeks-prodPrep') === '6' && row('Production').ch === 'No change' && same(starts(), s0),
      {rows: rows(), field: val('weeks-prodPrep')}, 'Prod Prep 5/4 Pulled 2 wks, Pre Prep 3/23 Pulled 2 wks; field 6');
    add('L2', 'the caret stays in the box across the redraw', document.activeElement && document.activeElement.dataset && document.activeElement.dataset.len === 'prodPrep',
      {active: document.activeElement && (document.activeElement.dataset || {}).len}, 'prodPrep focused');
    var goL = go().textContent;
    go().click(); await settle();
    add('L3', 'Build saves the length with the dates', val('weeks-prodPrep') === '8' && val('start-prodPrep') === '2026-05-04' && val('start-prePrep') === '2026-03-23'
      && /1 length saved/.test(msg()), {weeks: val('weeks-prodPrep'), s: starts(), msg: msg(), go: goL}, 'weeks 8, 5/4, 3/23, "1 length saved"');
    await undo();
    add('L4', 'one undo restores the length and the dates together', val('weeks-prodPrep') === '6' && same(starts(), s0), {weeks: val('weeks-prodPrep'), s: starts()}, '6 and the fixture');

    // ---- Z: a length saved with nothing moved ----
    await openBox();
    $('tool-solve-back').click(); await T.sleep(300);
    tick('Pre Prep', false); tick('Prod Prep', false); await T.sleep(300);
    await typeLen('Localization', '9');
    tick('Localization', false); await T.sleep(400);
    var goZ = go().textContent;
    go().click(); await settle();
    add('Z1', '"Save 1 length": the length written, no date moved', goZ === 'Save 1 length' && val('weeks-localization') === '9' && same(starts(), s0)
      && /^1 length saved\. Nothing moved\./.test(msg()), {go: goZ, weeks: val('weeks-localization'), msg: msg()}, '"Save 1 length" -> 9, dates unmoved');
    await undo();

    // ---- X: closing forgets ----
    await openBox();
    await typeLen('Post', '20');
    closePops(); await T.sleep(200);
    await openBox();
    add('X1', 'closing the box forgets a typed length: the field and the reopened box both say 16', val('weeks-post') === '16' && row('Post').len === '16' && !row('Post').staged,
      {field: val('weeks-post'), box: row('Post')}, '16, not staged');

    // ---- E: ends by ----
    await setPin('prodPrep');
    await setEdge('end');
    // (Post may still read "Pulled 1 wk": buildFixture leaves a week between the wrap and Post, which Both closes.)
    add('E1', 'switching to "ends by" prefills the phase\'s last workday (Fri 6/26/26), and the pin and the prep stay put',
      val('tool-solve-date') === '2026-06-26' && row('Prod Prep').pin && row('Prod Prep').ch === 'No change' && row('Pre Prep').ch === 'No change'
        && row('Production').ch === 'No change',
      {date: val('tool-solve-date'), go: go().textContent, rows: rows()}, '2026-06-26; Prod Prep, Pre Prep, Production "No change"');
    await setDate('2026-07-08');
    add('E2', 'Prod Prep ends by Wed 7/8/26: its last Friday is 7/3, so it starts 5/25 (Pushed 1 wk), Pre Prep 4/13 behind it',
      row('Prod Prep').dt === '5/25/26' && row('Prod Prep').ch === 'Pushed 1 wk' && row('Pre Prep').dt === '4/13/26' && row('Pre Prep').ch === 'Pushed 1 wk',
      rows(), 'Prod Prep 5/25/26 Pushed 1 wk; Pre Prep 4/13/26');
    go().click(); await settle();
    add('E3', 'Build: Prod Prep 5/25, the result line says "ends by"', val('start-prodPrep') === '2026-05-25' && /^Prod Prep ends by 7\/8\/26\./.test(msg()),
      {s: starts(), msg: msg()}, '5/25, "Prod Prep ends by 7/8/26."');
    await undo();
    await setPin('production'); await setEdge('end');
    add('E4', 'the shoot pinned by its end at its own wrap (10/20/26): the shoot and the prep stay put',
      val('tool-solve-date') === '2026-10-20' && row('Production').pin && row('Production').ch === 'No change' && row('Prod Prep').ch === 'No change',
      {go: go().textContent, date: val('tool-solve-date'), rows: rows()}, '2026-10-20; Production, Prod Prep "No change"');
    // ...and with Before alone, nothing moves at all: the disabled "No changes".
    $('tool-solve-back').click(); await T.sleep(400);
    add('E5', 'with Before alone, nothing would move: the disabled "No changes"', go().textContent === 'No changes' && go().disabled,
      {go: go().textContent, rows: rows()}, '"No changes"');
    closePops(); await T.sleep(200);

    // ---- P: Show info incomplete ----
    var eps = val('num-episodes');
    T.set('num-episodes', ''); await settle();
    await openBox();
    await setDate('2026-07-13');
    add('P1', 'Show info incomplete: "Not set", the line shows, the phases after the shoot can\'t be placed, the prep still can',
      row('Production').len === 'Not set' && note() && row('Post').ch === 'Can’t place' && row('Pre Prep').dt === '4/20/26' && go().textContent === 'Build 2 phases',
      {rows: rows(), note: note(), go: go().textContent}, '"Not set", line, Post Can\'t place, Pre Prep 4/20, "Build 2 phases"');
    await setEdge('end');
    add('P2', 'ends by on the shoot with no length: "Production needs Show info"', go().textContent === 'Production needs Show info' && go().disabled,
      {go: go().textContent}, 'disabled "Production needs Show info"');
    closePops(); await T.sleep(200);
    T.set('num-episodes', eps); await settle();

    // ---- I: no ids ----
    await openBox();
    var inputs = pop().querySelectorAll('.solve-list input');
    add('I1', 'no control in the list carries an id, and every one sits inside .tools-menu',
      inputs.length >= 10 && !pop().querySelector('.solve-list [id]') && Array.prototype.every.call(inputs, function (b) { return !!b.closest('.tools-menu'); }),
      {inputs: inputs.length, withId: pop().querySelectorAll('.solve-list [id]').length}, 'no ids');
    closePops();
    var errs = (window.__ERR || []);
    add('K0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'buildaround', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
