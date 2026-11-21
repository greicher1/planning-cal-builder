// ripplemarks -- with Ripple Hiatus Periods on (the users' default), editing a break leaves Production's day marks on
// their dates and SAYS so, names each mark the edit puts under a hiatus, and keeps a note written inside the break on
// its date (audit AUD2-037 and AUD2-016, owner decision D2 = b, 16 Nov 2026: "marks stay on their dates when a hiatus is
// edited ... the result line says so, and warns when a mark lands under the break. Notes stay; one Undo").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=ripplemarks ./run.sh ripplemarks 500
//
// THE BUGS IT HOLDS.
//   AUD2-037: a ripple from a break inside the shoot moved the notes after it a week and left every Off day, worked day
//     and half day on its date (the ruled behaviour, D2 = b), but its line under the hiatus named only the phases, so a
//     mark that now fell on another shoot day, or under the break where it does nothing, went unmentioned.
//   AUD2-016: the ripple cut at the break's FIRST week, so a note typed in the break ("Crew party", beside "Production
//     Hiatus") moved with everything after it: onto the work week before the break when the break was shortened or
//     switched off, deeper into it when lengthened, and, on a re-date, out of the break altogether.
//
// THE CALENDAR: tests/fixtures/ripplemarks.sptcal (made-up names and dates; rippleundo.sptcal with Production's own
// hiatus and five notes): Production from Mon 6/29/26 (10 episodes x 8 days, US general holidays), the UNLOCKED
// one-week "Summer break" 7/13/26, Production's own 2-week hiatus 8/17/26, Post 11/16/26, Localization 3/15/27, New's
// four locked winter breaks. Day marks: Worked day Sat 7/11, Off 7/15 (inside the Summer break), Half 7/24, Half 8/12,
// Off 9/4, Half 9/23, Off 10/2. Notes: "Office closed" 7/13 (inside the Summer break: no Notes cell shows there, as in a
// file from before the ripple), "Crew returns" 7/20, "Crew party" 8/17 (inside Production's hiatus), "Back to set" 8/31,
// "Block 3" 9/14. It opens in the waterfall.
//
// ⚠️ lib.js turns the ripple OFF for every leg (HIATUS-RIPPLE-PLAN.md §8). This leg puts the users' default back (the
// key absent = on) at the top, before the build's deferred app module reads its preferences.
//
// EACH CASE: the calendar as saved before (Save As through a stand-in picker), the edit, the calendar after (its marks,
// notes and phase starts) and the line under the hiatus; then ONE Cmd+Z must give back the calendar exactly as before
// (AUD2-038's one step, held for the new paths: the lifted notes and the restored marks).
//   R0  the ripple preference is the users' default; the calendar as described
//   A1  the Summer break's Weeks 1 -> 2: Post and Localization pushed 1 wk; every mark on its date; "Office closed"
//       stays on 7/13 (red before: 7/20), the notes after it move a week; the line says "Day marks stay on their
//       dates" and "Half day Fri 7/24/26 is now under a hiatus" (red before: neither)
//   A2  its Starts typed 2026-08-10, Enter (a re-date, the finding's route c): every mark on its date; "Office closed"
//       stays on 7/13 (red before: 7/6), and "Crew returns" comes back with the work to 7/13, joined under it; a line
//       is shown, and names "Half day Wed 8/12/26" (red before)
//   A3  its ×, Remove: Post and Localization pulled 1 wk; marks on their dates; "Office closed" on 7/13, "Crew returns"
//       joined under it; the line says the marks stay (red before)
//   B1  Production's own hiatus Weeks 2 -> 1: "Crew party" stays on 8/17 (red before: 8/10), "Back to set" 8/24;
//       marks on their dates; the line says so
//   B2  its Hiatus switch off: "Crew party" on 8/17 (red before: 8/3), "Back to set" joined under it
//   B3  its Weeks 2 -> 3: "Crew party" on 8/17 (red before: 8/24), "Back to set" 9/7; the line names "Off day Fri
//       9/4/26"
//   B4  its Weeks typed 1 then 10 (each a push, ruled 5 Nov 2026): "Crew party" on 8/17 (red before: 8/10), "Back to
//       set" 10/26 (as 2 -> 10 in one step); the line names the three marks the break now covers
//   C1  the Summer break's Starts typed 2026-06-22, Enter (before the shoot): Production itself is pushed 1 wk, so its
//       marks GO WITH their shoot days (ruling R2, unchanged) and the line does NOT say they stay
//   E0  0 console errors
//
// ⚠️ What it does not prove: synthetic focus and input events drive the handlers (rippleundo's way); hiatusripple.mjs
// drives the same boxes with CDP's trusted input. The month view's band drag reaches the same rippleAfterHiatusEdit.
try {
  var o = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {};
  delete o.hiatusRipple;
  localStorage.setItem('sptcal.prefs', JSON.stringify(o));
} catch (e) {}
window.__T.memoryIDB();   // Save As puts each new file in the recents list (IndexedDB never settles headless)
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'ripplemarks', cases: [], observed: {} };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
    var r = document.getElementById('R');
    if (r) r.textContent = 'pending after ' + id + ' ' + JSON.stringify(out.cases.map(function (x) { return x.id + ':' + x.pass; }));
  }
  function $(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function txt(el) { return ((el || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function val(id) { return ($(id) || {}).value; }
  function nativeSet(e, v) { var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(e, v); }

  // ---- the calendar, as a Save would write it (rippleundo's stand-in picker: it keeps the text as it is WRITTEN) ----
  async function snap() {
    var real = window.showSaveFilePicker, rec = { calls: 0, text: null };
    window.showSaveFilePicker = async function (o) {
      rec.calls++;
      var parts = [];
      return { name: (o && o.suggestedName) || 'ripplemarks.sptcal', kind: 'file',
        createWritable: async function () { return {
          write: async function (d) { parts.push(String(d)); },
          close: async function () { rec.text = parts.join(''); },
          abort: async function () {} }; } };
    };
    try {
      await T.sleep(700);   // Save As drops a second click inside 600 ms (reClickGuard)
      await T.until(function () { var b = $('save-as-btn'); return !!b && !b.disabled; }, 'Save As', 60, 100);
      $('save-as-btn').click();
      try { await T.until(function () { return rec.text !== null; }, 'the Save As write', 100, 100); }
      catch (e) { throw new Error(e.message + '; calls ' + rec.calls + '; modal "' + T.modalText().slice(0, 200) + '"'); }
      await T.sleep(100);
    } finally { window.showSaveFilePicker = real; }
    var s = JSON.parse(rec.text);
    delete s.lastEdited; delete s.viewMode;
    return JSON.stringify(s);
  }
  function noteText(v) {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    if (Array.isArray(v.notes)) return v.notes.map(function (n) { return (n && n.text) || ''; }).filter(Boolean).join('\n');
    return v.text || '';
  }
  // Each week's typed note text, by week.
  function notesOf(json) {
    var u = JSON.parse(json).userNotes || {}, m = {};
    Object.keys(u).sort().forEach(function (k) { var t = noteText(u[k]); if (t) m[k] = t; });
    return m;
  }
  function marksOf(json) { return JSON.parse(json).dayOverrides || {}; }
  function same(a, b) {
    var ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    return JSON.stringify(ka) === JSON.stringify(kb) && ka.every(function (k) { return a[k] === b[k]; });
  }
  // The week a note's text is on (null if no note holds it); every week that holds it, for the record.
  function weekOf(notes, text) {
    var ks = Object.keys(notes).filter(function (k) { return notes[k].split('\n').indexOf(text) >= 0; });
    return ks.length === 1 ? ks[0] : (ks.length ? ks.join('+') : null);
  }
  function line() { return qa('.ripple-note').filter(function (el) { return !el.hidden && txt(el); }).map(txt).join(' | '); }
  function starts() { return { production: val('start-production'), post: val('start-post'), localization: val('start-localization') }; }
  function hiatuses() {
    return qa('#hiatus-list .hiatus-entry').map(function (r) {
      return q('.hiatus-start', r).value + ' x' + q('.hiatus-weeks', r).value + (q('.hiatus-locked', r).checked ? ' L' : '');
    });
  }
  function phi() { return val('phiatus-start-production') + ' x' + val('phiatus-weeks-production') + '/' + (($('phiatus-en-production') || {}).checked ? 'on' : 'off'); }
  function summerRow() {
    return qa('#hiatus-list .hiatus-entry').find(function (r) { return (q('.hiatus-name', r) || {}).value === 'Summer break'; });
  }

  // ---- keys, as a keyboard sends them: to whatever has focus ----
  function blur() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  async function press(shift) {
    blur();
    var e = new KeyboardEvent('keydown', { key: shift ? 'Z' : 'z', code: 'KeyZ', bubbles: true, cancelable: true, metaKey: true, shiftKey: !!shift });
    (document.activeElement || document).dispatchEvent(e);
    await T.sleep(900);
    return e.defaultPrevented;
  }
  async function answer(label) {
    await T.until(function () { return !!T.modalText(); }, 'the question', 60, 100);
    var text = T.modalText();
    if (!T.clickModalButton(label)) throw new Error('no ' + label + ' in: ' + text);
    await T.until(function () { return !T.modalText(); }, 'the question to close', 60, 100);
    await T.sleep(400);
    return text;
  }
  // The edit's boxes, as a user's typing reaches them: focus first (the ripple's "before", rippleBegin), then the value.
  function focusIn(el) { el.focus(); el.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); }
  function typeInto(el, v) { nativeSet(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }
  function enter(el) { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })); }

  // ONE Cmd+Z = the calendar exactly as before (at most two more if not, so the next case starts where it expects).
  async function undoOnce(id, before, maxPresses) {
    var n = 0, s = null;
    for (; n < (maxPresses || 1); ) { await press(false); n++; s = await snap(); if (s === before) break; }
    kase(id + '-undo', id + ': ' + (maxPresses > 1 ? 'Cmd+Z (once per push)' : 'ONE Cmd+Z') + ' gives back the calendar exactly as before, notes and marks included',
      s === before, { presses: n });
    for (var i = 0; i < 2 && s !== before; i++) { await press(false); s = await snap(); }
  }

  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(txt($('meta-production'))) && !!summerRow(); }, 'the restored calendar', 200, 100);
    await T.sleep(1500);
    var pref = {};
    try { pref = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {}; } catch (e) {}
    var base = await snap(), marks0 = marksOf(base), notes0 = notesOf(base);
    var st0 = { starts: starts(), hiatuses: hiatuses(), phi: phi(), marks: marks0, notes: notes0 };
    out.observed.R0 = { pref: pref, state: st0 };
    kase('R0', 'the ripple preference is the users\' default; Production 6/29/26, the unlocked Summer break 7/13 x1, Production\'s own hiatus 8/17 x2, Post 11/16, Localization 3/15/27, seven marks, five notes',
      !Object.prototype.hasOwnProperty.call(pref, 'hiatusRipple') && st0.starts.production === '2026-06-29' && st0.starts.post === '2026-11-16'
        && st0.starts.localization === '2027-03-15' && st0.hiatuses[0] === '2026-07-13 x1' && st0.phi === '2026-08-17 x2/on'
        && Object.keys(marks0).length === 7 && notes0['2026-07-13'] === 'Office closed' && notes0['2026-08-17'] === 'Crew party',
      { observed: st0 });

    // One case: run `edit`, read the result, check it, undo it.
    async function kaseRun(id, title, edit, check, undoPresses) {
      var before = await snap();
      await edit();
      await T.sleep(500);
      var ln = line(), after = await snap();
      var r = { line: ln, starts: starts(), hiatuses: hiatuses(), phi: phi(), marks: marksOf(after), notes: notesOf(after) };
      r.marksSame = same(r.marks, marks0);
      out.observed[id] = r;
      check(r);
      await undoOnce(id, before, undoPresses);
    }
    function wk(r, text) { return weekOf(r.notes, text); }

    // ---- A: the all-phase Summer break, inside the shoot ----
    await kaseRun('A1', 'the Summer break\'s Weeks 1 -> 2', async function () {
      var w = q('.hiatus-weeks', summerRow());
      focusIn(w); typeInto(w, '2');
    }, function (r) {
      kase('A1-move', 'A1: Post 11/23, Localization 3/22 (pushed 1 wk)', r.starts.post === '2026-11-23' && r.starts.localization === '2027-03-22', { observed: r.starts });
      kase('A1-marks', 'A1: every day mark on its date', r.marksSame, { observed: r.marks });
      kase('A1-inside', 'A1: "Office closed", written inside the break, stays on 7/13 (AUD2-016)', wk(r, 'Office closed') === '2026-07-13', { observed: r.notes });
      kase('A1-after', 'A1: the notes after the break move a week, as they always have (Crew returns 7/27, Crew party 8/24, Back to set 9/7, Block 3 9/21)',
        wk(r, 'Crew returns') === '2026-07-27' && wk(r, 'Crew party') === '2026-08-24' && wk(r, 'Back to set') === '2026-09-07' && wk(r, 'Block 3') === '2026-09-21', { observed: r.notes });
      kase('A1-line', 'A1: the line says "Pushed 1 wk", "Day marks stay on their dates" and "Half day Fri 7/24/26 is now under a hiatus" (AUD2-037)',
        /Pushed 1 wk/.test(r.line) && /Day marks stay on their dates/.test(r.line) && /Half day Fri 7\/24\/26 is now under a hiatus/.test(r.line)
          && !/Off day Wed 7\/15/.test(r.line), { observed: r.line });
    });

    await kaseRun('A2', 'the Summer break\'s Starts typed 2026-08-10, Enter', async function () {
      var s = q('.hiatus-start', summerRow());
      focusIn(s); typeInto(s, '2026-08-10'); await T.sleep(200); enter(s);
    }, function (r) {
      kase('A2-made', 'A2: the break on 8/10 x1; Post and Localization where they were (out 1 wk, in 1 wk)',
        r.hiatuses.indexOf('2026-08-10 x1') >= 0 && r.starts.post === '2026-11-16' && r.starts.localization === '2027-03-15', { observed: { h: r.hiatuses, s: r.starts } });
      kase('A2-marks', 'A2: every day mark on its date', r.marksSame, { observed: r.marks });
      kase('A2-inside', 'A2: "Office closed" stays on 7/13, and "Crew returns" comes back with the work to 7/13, under it (AUD2-016)',
        r.notes['2026-07-13'] === 'Office closed\nCrew returns', { observed: r.notes });
      kase('A2-after', 'A2: the notes past the new break where they were (Crew party 8/17, Back to set 8/31)',
        wk(r, 'Crew party') === '2026-08-17' && wk(r, 'Back to set') === '2026-08-31', { observed: r.notes });
      kase('A2-line', 'A2: a line is shown, says the marks stay and names "Half day Wed 8/12/26" now under a hiatus (AUD2-037 route c)',
        /Day marks stay on their dates/.test(r.line) && /Half day Wed 8\/12\/26 is now under a hiatus/.test(r.line), { observed: r.line });
    });

    await kaseRun('A3', 'the Summer break\'s ×, Remove', async function () {
      q('.remove-hiatus', summerRow()).click();
      await answer('Remove');
    }, function (r) {
      kase('A3-move', 'A3: the break gone; Post 11/9, Localization 3/8 (pulled 1 wk)',
        !summerRow() && r.starts.post === '2026-11-09' && r.starts.localization === '2027-03-08', { observed: r.starts });
      kase('A3-marks', 'A3: every day mark on its date', r.marksSame, { observed: r.marks });
      kase('A3-inside', 'A3: "Office closed" stays on 7/13, "Crew returns" joined under it (AUD2-016)', r.notes['2026-07-13'] === 'Office closed\nCrew returns', { observed: r.notes });
      kase('A3-line', 'A3: the line says "Pulled 1 wk" and "Day marks stay on their dates", and names no mark (none is newly under a hiatus)',
        /Pulled 1 wk/.test(r.line) && /Day marks stay on their dates/.test(r.line) && !/now under a hiatus/.test(r.line), { observed: r.line });
    });

    // ---- B: Production's own hiatus (AUD2-016's reproduced route) ----
    var pw = $('phiatus-weeks-production');
    await kaseRun('B1', 'Production\'s own hiatus Weeks 2 -> 1', async function () {
      focusIn(pw); typeInto(pw, '1');
    }, function (r) {
      kase('B1-move', 'B1: Post 11/9, Localization 3/8 (pulled 1 wk); the hiatus 8/17 x1', r.phi === '2026-08-17 x1/on' && r.starts.post === '2026-11-09' && r.starts.localization === '2027-03-08', { observed: { phi: r.phi, s: r.starts } });
      kase('B1-inside', 'B1: "Crew party" stays on 8/17 (red before: 8/10); "Back to set" 8/24, "Block 3" 9/7',
        wk(r, 'Crew party') === '2026-08-17' && wk(r, 'Back to set') === '2026-08-24' && wk(r, 'Block 3') === '2026-09-07', { observed: r.notes });
      kase('B1-marks', 'B1: every day mark on its date, and the line says so', r.marksSame && /Day marks stay on their dates/.test(r.line) && !/now under a hiatus/.test(r.line), { observed: { marks: r.marks, line: r.line } });
    });

    await kaseRun('B2', 'Production\'s own Hiatus switched off', async function () {
      $('phiatus-en-production').click();
    }, function (r) {
      kase('B2-inside', 'B2: "Crew party" stays on 8/17 (red before: 8/3), "Back to set" joined under it',
        r.phi.slice(-3) === 'off' && r.notes['2026-08-17'] === 'Crew party\nBack to set' && !r.notes['2026-08-03'], { observed: { phi: r.phi, notes: r.notes } });
      kase('B2-marks', 'B2: every day mark on its date, and the line says so', r.marksSame && /Day marks stay on their dates/.test(r.line), { observed: { marks: r.marks, line: r.line } });
    });

    await kaseRun('B3', 'Production\'s own hiatus Weeks 2 -> 3', async function () {
      focusIn(pw); typeInto(pw, '3');
    }, function (r) {
      kase('B3-inside', 'B3: "Crew party" stays on 8/17 (red before: 8/24); "Back to set" 9/7',
        wk(r, 'Crew party') === '2026-08-17' && wk(r, 'Back to set') === '2026-09-07', { observed: r.notes });
      kase('B3-line', 'B3: marks on their dates; the line says so and names "Off day Fri 9/4/26" now under a hiatus',
        r.marksSame && /Pushed 1 wk/.test(r.line) && /Day marks stay on their dates/.test(r.line) && /Off day Fri 9\/4\/26 is now under a hiatus/.test(r.line), { observed: { marks: r.marks, line: r.line } });
    });

    await kaseRun('B4', 'Production\'s own hiatus Weeks typed 1 then 10', async function () {
      focusIn(pw); typeInto(pw, '1'); await T.sleep(150); typeInto(pw, '10');
    }, function (r) {
      kase('B4-inside', 'B4: "Crew party" stays on 8/17 (red before: 8/10); "Back to set" 10/26, as 2 -> 10 in one step',
        r.phi === '2026-08-17 x10/on' && wk(r, 'Crew party') === '2026-08-17' && wk(r, 'Back to set') === '2026-10-26', { observed: { phi: r.phi, notes: r.notes } });
      kase('B4-line', 'B4: marks on their dates; the line names the three marks the break now covers',
        r.marksSame && /Off day Fri 9\/4\/26, Half day Wed 9\/23\/26 and Off day Fri 10\/2\/26 are now under a hiatus/.test(r.line), { observed: { marks: r.marks, line: r.line } });
    }, 3);

    // ---- C: a break moved before the shoot: Production itself is pushed, so its marks go with their shoot days ----
    await kaseRun('C1', 'the Summer break\'s Starts typed 2026-06-22, Enter', async function () {
      var s = q('.hiatus-start', summerRow());
      focusIn(s); typeInto(s, '2026-06-22'); await T.sleep(200); enter(s);
    }, function (r) {
      kase('C1-prod', 'C1: Production pushed 1 wk (6/29 -> 7/6), the line says so', r.starts.production === '2026-07-06' && /Pushed 1 wk: Production/.test(r.line), { observed: { s: r.starts, line: r.line } });
      kase('C1-marks', 'C1: the marks went with their shoot days (ruling R2), and the line does NOT say they stay',
        !r.marksSame && !/Day marks stay/.test(r.line), { observed: { marks: r.marks, line: r.line } });
    });

    var h = T.appHealth();
    kase('E0', '0 console errors', h.errors.length === 0, { errors: h.errors });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'the leg threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
