// changessince -- File menu ▸ "Changes since last save…" (audit 2026-11 AUD2-103, idea I.3; owner: "work on it now",
// 16 Nov 2026). What changed on the calendar since it was last saved or loaded, in lines to copy into an email.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh changessince 150
//
// Loads tests/fixtures/changessince.sptcal ("Test Show", synthetic) through the real Load, as a user does, with a
// fake file handle that records every write, then:
//
//   N0  before anything is loaded or saved: the window says there is no saved version to compare with, and Copy is off
//   C1  right after Load: "No changes since then.", under "Since you loaded “Changes Fixture.sptcal” at …"
//   C2  three edits (Production's start 2 weeks later, a 1-week all-phase hiatus added inside the shoot, the Title
//       renamed): the list names EXACTLY those three, in this order and these words --
//         Title now “Test Show Revised” (was “Test Show”)
//         Production: first shoot day pushed 2 wks, wrap pushed 3 wks (now 9/28/26 – <wrap>)
//         Hiatus 10/19/26 – 10/23/26 added (1 wk)
//       and nothing about Post, Writer's Rm or any other phase, which did not move
//   C3  Copy puts exactly those lines on the clipboard, one per line, and the button reads Copied
//   C4  Save writes the file, and the window then says "No changes since then.", "Since you saved …"
//   C5  after the Save, a further edit is listed against the SAVED calendar (the title's "was" is the saved title)
//   C6  typed back the way it was saved, nothing is listed
//   C7  an edit that changes no date, count or name (the waterfall's date format) is the one line
//       "Notes, formatting or settings changed", so the list is never empty while something changed
//   C8  a phase whose end alone moved reads "Post now ends <date> (pushed 1 wk)", and with a dated line to show, the
//       "Notes, formatting or settings changed" line goes (it is written only when no other line is)
//   (Autosave's 10-minute tick does not move the baseline, by design; a leg cannot wait it out, so it is not asserted.)
//   F1  guard: the file holds no new key (the saved snapshot's top-level keys are the fixture's own, which is a file
//       this build writes)
//   Two scenarios: the fixture made into a two-tab file ("Plan A" on screen, "Plan B" parked with Production a week
//   later), loaded over the unsaved work through the real Load:
//   S1  "Plan A" right after Load: "No changes since then.", the line naming the scenario ("In “Plan A”, since you …")
//   S2  switched to the parked "Plan B" (its saved values are read as it comes on screen unchanged): "No changes since
//       then.", and opening the window leaves the calendar on screen as it was (Plan B's Production start and title).
//       Red before savedBaselineUnvisited(): read off a probe, a file with no Prep name read "Prep" where the screen
//       shows "Episodic Prep", and the untouched tab listed "Notes, formatting or settings changed".
//   S3  an edit on "Plan B" is listed against Plan B's own saved values ("Production pushed 1 wk" from 9/21/26)
//   S4  a scenario added since the Load says there is no saved version of it to compare with
//   E0  0 console errors
//
// ⛔ memoryIDB() runs synchronously, here at the top, before the engine boots: Load awaits the recents list, and real
// IndexedDB never settles in headless Chrome.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'changessince', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
    var r = document.getElementById('R');
    if (r) r.textContent = 'pending after ' + id + ' ' + JSON.stringify(out.cases.map(function (x) { return x.id + ':' + x.pass; }));
  }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  function dlg() { return document.querySelector('.changes-dlg .mantine-Modal-content') || document.querySelector('.changes-dlg'); }
  function txt(sel) { var e = document.querySelector('.changes-dlg ' + sel); return e ? e.textContent.trim() : null; }
  function read() {
    var lines = Array.prototype.map.call(document.querySelectorAll('.changes-dlg .changes-line'), function (li) { return li.textContent.trim(); });
    var copyBtn = Array.prototype.filter.call(document.querySelectorAll('.changes-dlg button'), function (b) { return /^(Copy|Copied)(?![\s\S])/.test(b.textContent.trim()); })[0];
    return { open: !!dlg(), since: txt('.changes-since'), msg: txt('.changes-msg'), lines: lines,
             copy: copyBtn ? { label: copyBtn.textContent.trim(), disabled: copyBtn.disabled || copyBtn.hasAttribute('data-disabled') } : null };
  }
  async function openChanges() {
    document.querySelector('.file-menu-btn').click();
    await T.until(function () { return !!document.querySelector('#file-menu .file-menu-item[data-action="changes"]'); }, 'the Changes since last save item', 60, 100);
    await T.sleep(150);
    document.querySelector('#file-menu .file-menu-item[data-action="changes"]').click();
    await T.until(function () { return !!dlg(); }, 'the changes window', 60, 100);
    await T.sleep(400);
    return read();
  }
  async function closeChanges() {
    var done = Array.prototype.filter.call(document.querySelectorAll('.changes-dlg button'), function (b) { return b.textContent.trim() === 'Done'; })[0];
    if (done) done.click();
    await T.until(function () { return !dlg(); }, 'the changes window to close', 60, 100);
    await T.sleep(200);
  }
  // The clipboard, recorded: headless Chrome has no focused window to write a real one from.
  var clip = [];
  try {
    Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: function (t) { clip.push(String(t)); return Promise.resolve(); } } });
  } catch (e) { out.clipStub = String(e); }
  var label = function () { return ((document.getElementById('file-menu-label') || {}).textContent || '').trim(); };
  try {
    await T.appReady();
    await settle('the first calendar');

    // ---- N0: nothing saved or loaded yet ----
    var n0 = await openChanges();
    kase('N0', 'before any Save or Load: no saved version to compare with, no list, Copy off',
         n0.open && n0.lines.length === 0 && /no saved version to compare with/.test(n0.msg || '') && !n0.since && !!n0.copy && n0.copy.disabled,
         { observed: n0 });
    await closeChanges();

    // ---- Load the fixture through the real Load ----
    var writes = [];
    await T.openViaFakePicker('/tests/fixtures/changessince.sptcal', 'Changes Fixture.sptcal', { writes: writes });
    await T.until(function () { return label().indexOf('Changes Fixture') !== -1; }, 'the loaded file in the file menu', 100, 100);
    await settle('the loaded calendar');
    await T.sleep(600);
    var fixtureKeys = Object.keys(JSON.parse(await (await fetch('/tests/fixtures/changessince.sptcal')).text())).sort();

    // ---- C1: right after Load ----
    var c1 = await openChanges();
    kase('C1', 'right after Load: "No changes since then." under "Since you loaded “Changes Fixture.sptcal” at …"',
         c1.lines.length === 0 && c1.msg === 'No changes since then.' && /^Since you loaded “Changes Fixture\.sptcal” at \d{1,2}:\d{2} [AP]M(?![\s\S])/.test(c1.since || '')
         && c1.copy && c1.copy.disabled, { observed: c1 });
    await closeChanges();

    // ---- C2: three edits ----
    var before = { prod: document.getElementById('start-production').value, title: document.getElementById('show-title').value };
    T.set('start-production', '2026-09-28');
    await settle('Production moved');
    T.addHiatus('2026-10-19', 1);
    await settle('the hiatus added');
    T.set('show-title', 'Test Show Revised');
    await settle('the title');
    await T.sleep(500);
    var c2 = await openChanges();
    var L = c2.lines;
    var prodRe = /^Production: first shoot day pushed 2 wks, wrap pushed 3 wks \(now 9\/28\/26 – \d{1,2}\/\d{1,2}\/27\)(?![\s\S])/;
    kase('C2', 'after shifting Production 2 weeks, adding a hiatus and renaming the Title, the list names exactly those three',
         L.length === 3 && L[0] === 'Title now “Test Show Revised” (was “Test Show”)' && prodRe.test(L[1])
         && L[2] === 'Hiatus 10/19/26 – 10/23/26 added (1 wk)'
         && !L.some(function (l) { return /^(Post|Writer|Pre Prep|Prod Prep|Localization)/.test(l); })
         && /^Since you loaded “Changes Fixture\.sptcal”/.test(c2.since || '') && c2.copy && !c2.copy.disabled,
         { observed: c2, before: before });

    // ---- C3: Copy ----
    var copyBtn = Array.prototype.filter.call(document.querySelectorAll('.changes-dlg button'), function (b) { return b.textContent.trim() === 'Copy'; })[0];
    if (copyBtn) copyBtn.click();
    await T.sleep(300);
    var after3 = read();
    kase('C3', 'Copy puts exactly the listed lines on the clipboard, one per line, and the button reads Copied',
         clip.length === 1 && clip[0] === L.join('\n') && after3.copy && after3.copy.label === 'Copied',
         { observed: { clip: clip, button: after3.copy } });
    await closeChanges();

    // ---- C4: Save ----
    var nWrites = writes.length;
    await T.sleep(700);
    document.getElementById('save-file-btn').click();
    await T.until(function () { return writes.length > nWrites; }, 'the Save write', 100, 100);
    await T.sleep(600);
    var c4 = await openChanges();
    kase('C4', 'after Save: "No changes since then." under "Since you saved “Changes Fixture.sptcal” at …"',
         writes.length === nWrites + 1 && c4.lines.length === 0 && c4.msg === 'No changes since then.'
         && /^Since you saved “Changes Fixture\.sptcal” at \d{1,2}:\d{2} [AP]M(?![\s\S])/.test(c4.since || ''),
         { observed: c4, writes: writes.length });
    await closeChanges();

    // ---- F1: the file Save wrote holds no new key ----
    var saved = JSON.parse(writes[writes.length - 1].text);
    var savedKeys = Object.keys(saved).sort();
    var extra = savedKeys.filter(function (k) { return fixtureKeys.indexOf(k) < 0; });
    kase('F1', 'the saved file holds no key the fixture lacks (nothing new is saved for this)',
         extra.length === 0, { observed: { extra: extra.map(function (k) { return [k, saved[k]]; }) } });

    // ---- C5: an edit after the Save is listed against the saved calendar ----
    T.set('show-title', 'Test Show Final');
    await settle('the second title');
    await T.sleep(400);
    var c5 = await openChanges();
    kase('C5', 'after the Save, a new edit is measured from the SAVED calendar',
         c5.lines.length === 1 && c5.lines[0] === 'Title now “Test Show Final” (was “Test Show Revised”)', { observed: c5 });
    await closeChanges();

    // ---- C6: typed back ----
    T.set('show-title', 'Test Show Revised');
    await settle('the title typed back');
    await T.sleep(400);
    var c6 = await openChanges();
    kase('C6', 'typed back the way it was saved: nothing listed', c6.lines.length === 0 && c6.msg === 'No changes since then.', { observed: c6 });
    await closeChanges();

    // ---- C7: a change no line names ----
    await T.pickSelect('wf-date-format', 'm/d/yyyy');
    await settle('the date format');
    await T.sleep(400);
    var c7 = await openChanges();
    kase('C7', 'an edit that moves no date, count or name: the one line "Notes, formatting or settings changed"',
         c7.lines.length === 1 && c7.lines[0] === 'Notes, formatting or settings changed', { observed: c7 });
    await closeChanges();

    // ---- C8: a phase whose end alone moved ----
    T.set('weeks-post', '17');
    await settle('Post one week longer');
    await T.sleep(400);
    var c8 = await openChanges();
    kase('C8', 'Post one week longer reads "Post now ends <date> (pushed 1 wk)", and the formatting line goes',
         c8.lines.length === 1 && /^Post now ends \d{1,2}\/\d{1,2}\/\d{2} \(pushed 1 wk\)(?![\s\S])/.test(c8.lines[0]), { observed: c8 });
    await closeChanges();

    // ---- S1-S4: two scenarios ----
    var two = JSON.parse(await (await fetch('/tests/fixtures/changessince.sptcal')).text());
    var planB = JSON.parse(JSON.stringify(two));
    planB.fields.byId['start-production'] = { value: '2026-09-21' };
    two.version = 2;
    two.scenarios = { current: 's1', counter: 2, tabs: [{ id: 's1', name: 'Plan A' }, { id: 's2', name: 'Plan B', snapshot: planB }] };
    var p2 = T.openViaFakePicker('/x.sptcal', 'Two Plans.sptcal', { text: JSON.stringify(two), writes: writes });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || label().indexOf('Two Plans') !== -1) break; }
    await p2;
    await T.until(function () { return label().indexOf('Two Plans') !== -1; }, 'the two-plan file in the file menu', 100, 100);
    await settle('the two-plan calendar');
    await T.sleep(800);
    var s1 = await openChanges();
    kase('S1', '"Plan A" right after Load: no changes, and the line names the scenario',
         s1.lines.length === 0 && s1.msg === 'No changes since then.' && /^In “Plan A”, since you loaded “Two Plans\.sptcal” at /.test(s1.since || ''),
         { observed: s1 });
    await closeChanges();

    document.dispatchEvent(new CustomEvent('sptcal-scenario', { detail: { op: 'switch', id: 's2' } }));
    await T.until(function () { return document.getElementById('start-production').value === '2026-09-21'; }, 'Plan B on screen', 60, 100);
    await settle('Plan B');
    await T.sleep(600);
    var onB = { prod: document.getElementById('start-production').value, title: document.getElementById('show-title').value,
                grid: (document.getElementById('table-wrap') || {}).innerHTML.length };
    var s2 = await openChanges();
    var afterOpen = { prod: document.getElementById('start-production').value, title: document.getElementById('show-title').value,
                       grid: (document.getElementById('table-wrap') || {}).innerHTML.length };
    kase('S2', 'the parked "Plan B", put on screen: no changes, and opening the window leaves the calendar as it was',
         s2.lines.length === 0 && s2.msg === 'No changes since then.' && /^In “Plan B”, since you loaded/.test(s2.since || '')
         && JSON.stringify(onB) === JSON.stringify(afterOpen), { observed: s2, before: onB, after: afterOpen });
    await closeChanges();

    T.set('start-production', '2026-09-28');
    await settle('Plan B moved');
    await T.sleep(400);
    var s3 = await openChanges();
    kase('S3', 'an edit on "Plan B" is measured from Plan B’s own saved values',
         s3.lines.length === 1 && /^Production pushed 1 wk \(now 9\/28\/26 – /.test(s3.lines[0] || ''), { observed: s3 });
    await closeChanges();

    document.dispatchEvent(new CustomEvent('sptcal-scenario', { detail: { op: 'add' } }));
    await T.until(function () { return document.querySelectorAll('.sc-tab, [data-scenario-id]').length >= 3 || true; }, 'a third tab', 10, 100);
    await T.sleep(1200);
    var s4 = await openChanges();
    kase('S4', 'a scenario added since the Load: no saved version of it to compare with',
         s4.lines.length === 0 && /no saved version of it to compare with/.test(s4.msg || ''), { observed: s4 });
    await closeChanges();

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'changessince threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
