// sharecopyguard -- a page keeps a backup of unsaved work only while it HAS unsaved work (the Nov 2026 audit's item
// 3.13, a shareable-copy hardening fix; its default: "keep the crash backup for copies opened from disk; clear a page's
// own slot once it saves or closes cleanly").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=show-a ./run.sh sharecopyguard 200
//
// Run on show-a.sptcal through the page's own inline saved-state block, which is how a shareable copy opens itself.
// One page, in order:
//   K1  unsaved work is backed up in this page's own slot (the crash backup is kept, as the default says)
//   K2  ...and a page that closes WITH unsaved work keeps it there (that is the backup's whole job)
//   C1  Load another calendar, answering Load to the unsaved-work question: the work was discarded by the user's own
//       choice, so this page's slot goes with it. Before: the discarded calendar stayed in the slot, to be offered back
//       as "Recover unsaved work" at the next launch
//   C2  a page with nothing unsaved that closes leaves no slot behind, even one an earlier step failed to delete.
//       Before: nothing looked at the slot on close
//   C3  Save drops the slot, as it always has (the guard for the old rule)
//   C4  no error logged
// Closing is a synthetic pagehide: it is the event the browser fires when a page is closed, reloaded or left.
(function () { window.__T.memoryIDB(); })();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function handles(){ var db = window.__MEMIDB['spt-planning-cal']; return (db && db.handles) || new Map(); }
  function slots(){ return Array.from(handles().keys()).filter(function (k) { return String(k).indexOf('unsavedBackup') === 0; }).sort(); }
  function slotTitle(k){ var v = handles().get(k); try { return v.state.fields.byId['show-title'].value; } catch (e) { return null; } }
  function title(){ return document.getElementById('show-title').value; }
  function closePage(){ window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: false})); }
  try {
    await T.appReady();
    await T.until(function () { return title() === 'SHOW A'; }, 'show-a from the inline saved state', 60, 100);
    await T.sleep(1500);
    // A launch may be asked about a backup another page left; none exists here (a fresh in-memory store).
    var own = null;
    T.set('show-title', 'UNSAVED WORK');
    await T.until(function () { own = slots().filter(function (k) { return slotTitle(k) === 'UNSAVED WORK'; })[0] || null; return !!own; },
      'the crash backup of the unsaved work', 80, 100).catch(function () {});
    add('K1', 'unsaved work is backed up in this page\'s own slot', !!own, {slots: slots(), own: own}, 'a slot holding UNSAVED WORK');

    closePage(); await T.sleep(500);
    add('K2', 'a page that closes with unsaved work keeps its backup', !!own && slotTitle(own) === 'UNSAVED WORK',
      {slots: slots(), title: own && slotTitle(own)}, 'UNSAVED WORK still in the slot');

    var writes = [];
    var x = new XMLHttpRequest(); x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
    var other = JSON.parse(x.responseText); other.fields.byId['show-title'] = {value: 'OTHER CALENDAR'};
    var asked = '';
    var p = T.openViaFakePicker('/x.sptcal', 'other.sptcal', {text: JSON.stringify(other), writes: writes});
    for(var i = 0; i < 40; i++){ await T.sleep(100); var m = T.modalText(); if(m){ asked = m; T.clickModalButton('Load'); break; } }
    await p;
    await T.until(function () { return title() === 'OTHER CALENDAR'; }, 'the other calendar', 60, 100);
    await T.sleep(1500);
    add('C1', 'Load another calendar, discarding the unsaved work: this page\'s slot goes with it',
      /unsaved/i.test(asked) && !!own && !handles().has(own) && slots().length === 0,
      {asked: asked.slice(0, 160), slots: slots(), discardedStillKept: !!own && handles().has(own) ? slotTitle(own) : null}, 'asked; no slot left');

    // A slot left on a page that has nothing unsaved (as if an earlier delete had not landed), then the page closes.
    if(own) handles().set(own, {state: other, at: Date.now() - 60000, fileName: null});
    var before = slots();
    closePage(); await T.sleep(800);
    add('C2', 'a page with nothing unsaved that closes leaves no slot behind',
      before.length === 1 && slots().length === 0, {before: before, after: slots()}, 'one slot before, none after');

    T.set('show-title', 'EDITED AGAIN');
    var own2 = null;
    await T.until(function () { own2 = slots().filter(function (k) { return slotTitle(k) === 'EDITED AGAIN'; })[0] || null; return !!own2; },
      'the crash backup of the second edit', 80, 100).catch(function () {});
    var saveBtn = document.getElementById('save-file-btn');
    if(saveBtn) saveBtn.click();
    await T.until(function () { return writes.length > 0; }, 'the Save write', 60, 100).catch(function () {});
    await T.sleep(800);
    add('C3', 'Save drops the slot (the old rule, kept)', !!own2 && writes.length > 0 && slots().length === 0,
      {own: own2, writes: writes.length, slots: slots()}, 'backed up, saved, no slot');

    var errs = T.appHealth().errors;
    add('C4', 'no error logged', errs.length === 0, errs.slice(0, 6), 'none');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'sharecopyguard', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
