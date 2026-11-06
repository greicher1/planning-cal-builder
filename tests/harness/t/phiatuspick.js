// phiatuspick -- a phase's own hiatus is picked only inside that phase (owner, 5 Nov 2026: "the calendar popup for
// per phase hiatus periods should be limited to only dates/months that fall in the range of the phase. When you add a
// per phase hiatus and go to set the date, it should start on the first month of the phase").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh phiatuspick 200
//
// src/chrome/DatePop.jsx's hiatusWindowOf(), from update()'s dateContext hiatusWindows, from computeSchedule()'s
// segment.hiatusWindow: the Mondays the phase's own hiatus can start on and still pause it, worked out WITHOUT that
// hiatus (all-phase hiatuses still counted), so the weeks the hiatus itself adds to the phase are never offered.
//   - Opens on the phase's first month when the field is empty (or holds a date outside the phase).
//   - Mondays outside the window carry .dp-off + aria-disabled, as every other greyed day does.
//   - The month arrows stop at the phase's first and last months (aria-disabled, a click does nothing).
//   - A phase held by its END (Ends): its hiatus moves its start earlier, so the window opens where it would start
//     without the hiatus. Production: from its first week to its wrap's week without the hiatus.
//   - A phase with no dates, and an all-phase hiatus, are not limited (the old picker).
// The picker is opened by a dispatched focusin, the event it listens for (as datepick does).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  var MS = 86400000, MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function iso(t){ return new Date(t).toISOString().slice(0, 10); }
  function mondayOf(t){ return t - ((new Date(t).getUTCDay() + 6) % 7) * MS; }
  function $(id){ return document.getElementById(id); }
  function closePick(){ document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true})); }
  async function open(el){
    if(typeof el === 'string') el = $(el);
    closePick(); await T.sleep(80);
    el.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    await T.sleep(150);
    return read();
  }
  function cells(){
    var p = document.querySelector('.date-pop'); if(!p) return null;
    var m = /^(\w+) (\d{4})$/.exec(p.querySelector('.dp-title').textContent.trim());
    var start = mondayOf(Date.UTC(+m[2], MONTHS.indexOf(m[1]), 1));
    return Array.from(p.querySelectorAll('.dp-day')).map(function (b, i) { return {b: b, iso: iso(start + i * MS), mon: i % 7 === 0}; });
  }
  function nav(which){ var p = document.querySelector('.date-pop'); return p && p.querySelector('.dp-nav[aria-label="' + which + ' month"]'); }
  function read(){
    var p = document.querySelector('.date-pop'); if(!p) return null;
    var cs = cells();
    var off = cs.filter(function (c) { return c.b.classList.contains('dp-off'); });
    var prev = nav('Previous'), next = nav('Next');
    return {
      title: p.querySelector('.dp-title').textContent.trim(),
      pickable: cs.filter(function (c) { return !c.b.classList.contains('dp-off'); }).map(function (c) { return c.iso; }),
      off: off.length,
      offMarked: off.every(function (c) { return c.b.getAttribute('aria-disabled') === 'true' && c.b.tabIndex === -1; }),
      solo: cs.filter(function (c) { return c.b.classList.contains('dp-solo'); }).map(function (c) { return c.iso; }),
      prevOff: prev.getAttribute('aria-disabled') === 'true', nextOff: next.getAttribute('aria-disabled') === 'true',
      hint: Array.from(p.querySelectorAll('.dp-hint')).map(function (h) { return h.textContent.trim(); }).join(' | '),
      ids: p.querySelectorAll('[id]').length
    };
  }
  // Every month the arrows reach in one direction, from the open one: [{title, pickable}], the open month first.
  async function walk(which){
    var out = [read()];
    for(var i = 0; i < 24; i++){
      var b = nav(which);
      if(!b || b.getAttribute('aria-disabled') === 'true') break;
      b.click(); await T.sleep(60); out.push(read());
    }
    return out;
  }
  function allPickable(months){
    var s = {}; months.forEach(function (m) { m.pickable.forEach(function (d) { s[d] = true; }); });
    return Object.keys(s).sort();
  }
  async function clickDay(dayIso){
    var c = (cells() || []).filter(function (x) { return x.iso === dayIso; })[0];
    if(!c) throw new Error('no ' + dayIso + ' in the picker');
    c.b.click(); await T.sleep(150);
  }
  // A meta line's dates (m/d/yy), as ISO days, in order.
  function metaDates(key){
    var t = ($('meta-' + key) || {}).textContent || '';
    return (t.match(/\d{1,2}\/\d{1,2}\/\d{2}\b/g) || []).map(function (s) {
      var p = s.split('/'); return iso(Date.UTC(2000 + +p[2], +p[0] - 1, +p[1]));
    });
  }
  function isoMonday(d){ return iso(mondayOf(Date.parse(d + 'T00:00:00Z'))); }
  async function settle(){ await T.sleep(900); }
  var WIN_HINT = 'A hiatus always starts on a Monday, in a week this phase runs.';
  var HIA_HINT = 'A hiatus always starts on a Monday.';
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the fixture grid', 200, 100);
    await T.sleep(800);

    // ---- Pre-Prep: 4/6/26, 6 weeks (Mondays 4/6 to 5/11). Its hiatus switched on, the date still empty.
    if(!$('phiatus-en-prePrep').checked) $('phiatus-en-prePrep').click();
    await T.sleep(400);
    var r = await open('phiatus-start-prePrep');
    add('K1', "an empty phase hiatus opens on the phase's first month (April 2026), not today's",
      !!r && r.title === 'April 2026', r && r.title, 'April 2026');
    add('K2', 'only the Mondays the phase runs can be picked: 4/6 to 5/4 in April; 3/30 and every other day greyed, each aria-disabled',
      !!r && r.pickable.join() === '2026-04-06,2026-04-13,2026-04-20,2026-04-27,2026-05-04' && r.off === 37 && r.offMarked && r.ids === 0,
      r, 'pickable 4/6, 4/13, 4/20, 4/27, 5/4; 37 greyed; no id');
    add('K3', 'the hint says the hiatus starts in a week the phase runs', !!r && r.hint === WIN_HINT, r && r.hint, WIN_HINT);
    var prevBtn = nav('Previous'); prevBtn.click(); await T.sleep(100);
    var r2 = read();
    add('K4', "at the phase's first month the previous-month arrow is disabled, and a click on it does nothing",
      !!r && r.prevOff && !r.nextOff && r2.title === 'April 2026', {before: r && {prevOff: r.prevOff, nextOff: r.nextOff}, afterClick: r2.title}, 'prev disabled, next enabled, still April');
    nav('Next').click(); await T.sleep(100);
    var may = read();
    nav('Next').click(); await T.sleep(100);
    var may2 = read();
    add('K5', "the last month (May): 4/27, 5/4 and 5/11 only, the next-month arrow disabled and inert",
      may.title === 'May 2026' && may.pickable.join() === '2026-04-27,2026-05-04,2026-05-11' && may.nextOff && !may.prevOff && may2.title === 'May 2026',
      {may: may, afterClick: may2.title}, 'May 2026: 4/27, 5/4, 5/11; next disabled; still May');

    // Pick a Monday in the phase: it is written, and the phase is paused (its end moves 2 weeks out).
    nav('Previous').click(); await T.sleep(100);
    await clickDay('2026-04-20');
    await settle();
    var wrote = {value: $('phiatus-start-prePrep').value, open: !!document.querySelector('.date-pop'), meta: metaDates('prePrep')};
    add('K6', 'a click on 4/20 writes it and closes the picker; Pre-Prep now runs to 5/29/26',
      wrote.value === '2026-04-20' && !wrote.open && wrote.meta.join() === '2026-04-06,2026-05-29', wrote, 'value 2026-04-20, closed, 4/6/26 → 5/29/26');

    // The weeks the hiatus ADDS (5/18, 5/25) are not offered: a hiatus started there would land after the phase had
    // finished. The window is the phase's without its hiatus.
    r = await open('phiatus-start-prePrep');
    var months = await walk('Next');
    add('K7', "reopened: on the date's month with 4/20 capped; the months still end at May, with 5/11 the last Monday (not 5/25)",
      !!r && r.title === 'April 2026' && r.solo.join() === '2026-04-20' && months[months.length - 1].title === 'May 2026'
        && allPickable(months).join() === '2026-04-06,2026-04-13,2026-04-20,2026-04-27,2026-05-04,2026-05-11',
      {open: r, months: months.map(function (m) { return m.title + ': ' + m.pickable.join(' '); })}, 'April, solo 4/20; Mondays 4/6 to 5/11 across April and May');

    // A date outside the phase in the field (typed, or left behind when the phase moved): the picker opens on the
    // phase's first month, nothing capped, and the field is not rewritten.
    closePick(); await T.sleep(80);
    T.set('phiatus-start-prePrep', '2026-07-06'); await settle();
    r = await open('phiatus-start-prePrep');
    add('K8', "a date outside the phase (7/6/26): opens on the phase's first month, nothing capped, the field keeps it",
      !!r && r.title === 'April 2026' && r.solo.length === 0 && $('phiatus-start-prePrep').value === '2026-07-06',
      {open: r, value: $('phiatus-start-prePrep').value}, 'April 2026, no solo, value 2026-07-06');
    closePick(); await T.sleep(80);
    T.set('phiatus-start-prePrep', '2026-04-20'); await settle();

    // ---- Production: from its first week to its wrap's week, WITHOUT its own hiatus.
    var p0 = metaDates('production');   // [start, wrap]
    if(!$('phiatus-en-production').checked) $('phiatus-en-production').click();
    await T.sleep(400);
    closePick(); await T.sleep(80);
    T.set('phiatus-start-production', '2026-08-03'); await settle();
    var p1 = metaDates('production');
    r = await open('phiatus-start-production');
    var back = await walk('Previous');
    closePick(); await T.sleep(80);
    await open('phiatus-start-production');
    var fwd = await walk('Next');
    var pk = allPickable(back.concat(fwd));
    add('K9', "Production: Mondays from its first week to the wrap's week without the hiatus (the hiatus moved the wrap, not the window)",
      p0.length === 2 && p1.length === 2 && p1[1] > p0[1] && pk[0] === isoMonday(p0[0]) && pk[pk.length - 1] === isoMonday(p0[1])
        && back[back.length - 1].prevOff && fwd[fwd.length - 1].nextOff && !!r && r.hint === WIN_HINT,
      {before: p0, after: p1, first: pk[0], last: pk[pk.length - 1], months: back.length + fwd.length - 1},
      'first ' + (p0[0] && isoMonday(p0[0])) + ', last ' + (p0[1] && isoMonday(p0[1])) + ', the wrap moved later');

    // ---- Post held by its END (3/5/27): its hiatus moves its START earlier, so the window opens where Post starts
    // without the hiatus.
    var row = $('swatch-post').closest('.phase-row'), sel = row.querySelector('select.phase-anchor');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, 'ends');
    sel.dispatchEvent(new Event('change', {bubbles: true}));
    await settle();
    var e0 = metaDates('post');
    if(!$('phiatus-en-post').checked) $('phiatus-en-post').click();
    await T.sleep(400);
    closePick(); await T.sleep(80);
    T.set('phiatus-start-post', '2027-01-18'); await settle();
    var e1 = metaDates('post');
    r = await open('phiatus-start-post');
    back = await walk('Previous');
    closePick(); await T.sleep(80);
    await open('phiatus-start-post');
    fwd = await walk('Next');
    pk = allPickable(back.concat(fwd));
    add('K10', 'an Ends phase (Post, ends 3/5/27): its hiatus moves its start earlier, and the window still opens where it starts without one',
      e0.length === 2 && e1.length === 2 && e1[0] < e0[0] && e1[1] === e0[1] && pk[0] === isoMonday(e0[0]) && pk[pk.length - 1] === isoMonday(e0[1])
        && back[back.length - 1].title === MONTHS[new Date(Date.parse(e0[0] + 'T00:00:00Z')).getUTCMonth()] + ' ' + e0[0].slice(0, 4),
      {before: e0, after: e1, first: pk[0], last: pk[pk.length - 1], firstMonth: back[back.length - 1].title},
      'start moved earlier; first ' + (e0[0] && isoMonday(e0[0])) + ', last ' + (e0[1] && isoMonday(e0[1])));

    // ---- A phase with no dates: not limited. Localization's start cleared.
    closePick(); await T.sleep(80);
    T.set('start-localization', ''); await settle();
    if(!$('phiatus-en-localization').checked) $('phiatus-en-localization').click();
    await T.sleep(400);
    r = await open('phiatus-start-localization');
    var now = new Date(), thisMonth = MONTHS[now.getUTCMonth()] + ' ' + now.getUTCFullYear();
    add('K11', "a phase with no dates: not limited -- today's month, every Monday pickable, the plain hiatus hint, both arrows on",
      !!r && r.title === thisMonth && r.off === 36 && r.hint === HIA_HINT && !r.prevOff && !r.nextOff && r.ids === 0,
      r, thisMonth + ', 36 greyed, "' + HIA_HINT + '"');

    // ---- An all-phase hiatus start: unchanged (Mondays only, no window).
    r = await open(document.querySelector('#hiatus-list .hiatus-start'));
    add('K12', 'an all-phase hiatus start is not limited (Mondays only, the plain hint, both arrows on)',
      !!r && r.off === 36 && r.hint === HIA_HINT && !r.prevOff && !r.nextOff && r.ids === 0, r, '36 greyed, "' + HIA_HINT + '"');
    closePick();
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'phiatuspick', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
