// startrecents -- the recent calendars on an empty start, as two cards (owner, 16 Nov 2026: "this recent calendars UI is
// ugly", then "combine 2 and 3" and "Build 7, two cards"; mockups/start-recents.html, version 7).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh startrecents 240
//
// Nine recent files are seeded, most recent first by savedAt: today, yesterday, four days ago, an older ".html" calendar,
// three more, the eighth from 400 days ago (another year), and a ninth, older still, which the start leaves out (it shows
// eight, START_RECENTS_MAX).
//
//   C1  the last calendar has its own card: "Pick up where you left off", its name, "Last opened today at h:mm AM/PM",
//       Open; it carries the file's data-id (the engine's delegated handler loads it) and the whole name as its title
//   C2  the rest are in a second card, "Other recent calendars", seven rows in savedAt order, each with data-id and a
//       when-line; Load… (data-action="open") sits in that card's title row; the ninth file is not shown
//   C3  names drop ".sptcal"; an older ".html" calendar keeps its extension in .sr-ext; every title is the whole name
//   C4  when: "Yesterday at h:mm AM/PM"; an older date reads "Weekday, Mon D", with the year only when it is another year's
//   C5  nothing in the list carries an id (collectFieldValues sweeps input/select/textarea[id])
//   L1  a click on a row in the second card loads that file (the File menu names it) and the list goes away
//   L2  New brings the list back, and the file just loaded is now the one at the top (load sets savedAt)
//   O1  with one recent file: its card, then "Load another calendar…" (data-action="open"), and no second card
//   O0  with none: one card, "Recent calendars", Load…, and "Calendars you save or load will show up here."
//   E0  0 console errors
//
// ⛔ memoryIDB() runs synchronously, here at the top, before the engine boots (real IndexedDB never settles in headless
// Chrome). Files are removed with the File menu's own × (data-remove), the path a user takes, to reach one and none.
window.__T.memoryIDB();
(function seed(){
  var x = new XMLHttpRequest();                      // synchronous: this must land before boot
  x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var text = x.responseText;
  function handle(name){
    var h = {name: name, kind: 'file', reads: 0,
      queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
      isSameEntry: async function(o){ return o === h; },
      getFile: async function(){ h.reads++; return new File([text], name, {lastModified: 1700000000000}); }};
    return h;
  }
  var DAY = 86400000, now = Date.now();
  function at(daysAgo){ var d = new Date(now - daysAgo * DAY); d.setHours(9, 40, 0, 0); return Math.min(d.getTime(), now - 60000); }
  var names = [
    ['Alpha Plan 2026-11-04.sptcal', 0], ['Bravo Plan 2026-10-20.sptcal', 1], ['Charlie Plan.sptcal', 4],
    ['Delta Plan.html', 9], ['Echo Plan.sptcal', 15], ['Foxtrot Plan.sptcal', 22], ['Golf Plan.sptcal', 30],
    ['Hotel Plan.sptcal', 400], ['India Plan.sptcal', 500]
  ];
  window.__SEED = names.map(function (n, i) { return {id: 'r' + i, handle: handle(n[0]), name: n[0], savedAt: at(n[1])}; });
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([['recentFiles', window.__SEED.slice()]])};
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'startrecents', cases: [], observed: {} };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
    var r = document.getElementById('R');
    if (r) r.textContent = 'pending after ' + id + ' ' + JSON.stringify(out.cases.map(function (x) { return x.id + ':' + x.pass; }));
  }
  function q(s, root) { return (root || document).querySelector(s); }
  function qa(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function txt(e) { return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function shown(e) { return !!e && !e.closest('[hidden]') && e.getClientRects().length > 0; }
  function label() { return txt(q('#file-menu-label')); }
  var TIME = '\\d{1,2}:\\d{2}\\s[AP]M';
  var DATE = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}(, (\d{4}))?$/;
  function dateOk(s, ts) {
    var m = DATE.exec(s);
    if (!m) return false;
    var otherYear = new Date(ts).getFullYear() !== new Date().getFullYear();
    return otherYear ? m[4] === String(new Date(ts).getFullYear()) : !m[3];
  }
  function state() {
    var host = q('.start-recents'), hero = q('.start-recents .sr-hero'), cards = qa('.start-recents .sr-card');
    var other = cards.filter(function (c) { return /Other recent calendars/.test(txt(q('.sr-title', c))); })[0];
    var rows = other ? qa('.sr-row', other) : [];
    return {
      shown: shown(host),
      hero: hero ? { id: hero.getAttribute('data-id'), title: hero.getAttribute('title'), over: txt(q('.sr-over', hero)),
                     name: txt(q('.sr-hero-name', hero)), meta: txt(q('.sr-meta', hero)), open: txt(q('.sr-open', hero)),
                     item: hero.classList.contains('start-recent-item') } : null,
      cards: cards.map(function (c) { return txt(q('.sr-title', c)); }),
      rows: rows.map(function (r) { return { id: r.getAttribute('data-id'), title: r.getAttribute('title'), name: txt(q('.sr-name', r)),
                                            ext: txt(q('.sr-ext', r)), meta: txt(q('.sr-meta', r)) }; }),
      headLoad: other ? txt(q('.sr-head [data-action="open"]', other)) : null,
      foot: txt(q('.start-recents .sr-foot [data-action="open"]')),
      empty: txt(q('.start-recents .sr-empty')),
      loads: qa('.start-recents [data-action="open"]').map(txt),
      dataIds: qa('.start-recents [data-id]').length,
      ids: qa('.start-recents [id]').map(function (e) { return e.id; })
    };
  }
  async function removeVia(id) {
    var x = q('#file-menu [data-remove="' + id + '"]');
    if (x) x.click();
    await T.until(function () { return !q('#file-menu [data-remove="' + id + '"]'); }, id + ' to leave the recents', 40, 100).catch(function () {});
    await T.sleep(300);
    return !!x;
  }
  var S = window.__SEED;
  try {
    await T.appReady();
    await T.until(function () { return qa('.start-recents [data-id]').length === 8; }, 'eight recent calendars on the empty start', 100, 100);
    await T.sleep(400);
    var s = state();
    out.observed.start = s;

    kase('C1', 'the last calendar has its own card: Pick up where you left off, its name, Last opened today at …, Open',
         s.shown && !!s.hero && s.hero.item && s.hero.id === S[0].id && s.hero.title === S[0].name &&
         s.hero.over === 'Pick up where you left off' && s.hero.name === 'Alpha Plan 2026-11-04' &&
         new RegExp('^Last opened today at ' + TIME + '$').test(s.hero.meta) && /^Open$/.test(s.hero.open),
         { observed: s.hero });

    var wantIds = S.slice(1, 8).map(function (f) { return f.id; });
    kase('C2', 'the rest are in "Other recent calendars": seven rows in order, Load… in its title row, the ninth left out',
         s.cards.length === 1 && s.cards[0] === 'Other recent calendars' &&
         JSON.stringify(s.rows.map(function (r) { return r.id; })) === JSON.stringify(wantIds) &&
         s.rows.every(function (r) { return !!r.meta; }) && s.headLoad === 'Load…' && s.loads.length === 1 &&
         s.dataIds === 8 && !q('.start-recents [data-id="' + S[8].id + '"]'),
         { observed: { cards: s.cards, rows: s.rows.map(function (r) { return r.id; }), headLoad: s.headLoad, loads: s.loads } });

    var delta = s.rows.filter(function (r) { return r.id === S[3].id; })[0] || {};
    var allTitles = [s.hero && s.hero.title].concat(s.rows.map(function (r) { return r.title; }));
    kase('C3', 'names drop .sptcal, an older .html keeps its extension faintly, and each title is the whole name',
         s.rows.every(function (r) { return !/\.sptcal$/i.test(r.name); }) && !/\.sptcal/i.test(s.hero ? s.hero.name : '.sptcal') &&
         delta.name === 'Delta Plan.html' && delta.ext === '.html' &&
         JSON.stringify(allTitles) === JSON.stringify(S.slice(0, 8).map(function (f) { return f.name; })),
         { observed: { names: s.rows.map(function (r) { return r.name; }), delta: delta, titles: allTitles } });

    var metaOf = function (i) { return (s.rows.filter(function (r) { return r.id === S[i].id; })[0] || {}).meta || ''; };
    var c4 = { yesterday: metaOf(1), fourDays: metaOf(2), lastYear: metaOf(7) };
    kase('C4', 'when: Yesterday at …, then Weekday, Mon D, with the year only when it is another year’s',
         new RegExp('^Yesterday at ' + TIME + '$').test(c4.yesterday) && dateOk(c4.fourDays, S[2].savedAt) &&
         dateOk(c4.lastYear, S[7].savedAt) && /, \d{4}$/.test(c4.lastYear),
         { observed: c4 });

    kase('C5', 'nothing in the list carries an id', s.ids.length === 0, { observed: s.ids });

    // ---- a click on a row in the second card loads that file ----------------------------------------------------
    var row = q('.start-recents .sr-card .sr-row[data-id="' + S[2].id + '"]');
    if (row) row.click();
    await T.until(function () { return label().indexOf('Charlie Plan') !== -1; }, 'Charlie Plan to load', 60, 100).catch(function () {});
    await T.sleep(600);
    kase('L1', 'a click on a row in the second card loads that file, and the list goes away',
         !!row && label().indexOf('Charlie Plan') !== -1 && S[2].handle.reads > 0 && !state().shown,
         { observed: { label: label(), reads: S[2].handle.reads, shown: state().shown } });

    // ---- New: the list comes back, with the file just loaded at the top -------------------------------------------
    q('#new-file-btn').click();
    await T.sleep(400);
    if (q('.mantine-Modal-content')) { T.clickModalButton('Start new'); await T.sleep(400); }
    await T.until(function () { return state().shown; }, 'the list to come back', 60, 100).catch(function () {});
    await T.sleep(300);
    var l2 = state();
    kase('L2', 'New brings the list back, and the file just loaded is at the top',
         l2.shown && !!l2.hero && l2.hero.id === S[2].id && l2.hero.name === 'Charlie Plan' &&
         new RegExp('^Last opened today at ' + TIME + '$').test(l2.hero.meta),
         { observed: l2.hero });

    // ---- one recent file, then none (the File menu's ×) -------------------------------------------------------------
    var keep = l2.hero ? l2.hero.id : S[2].id;
    var removed = 0;
    for (var i = 0; i < S.length; i++) { if (S[i].id !== keep && await removeVia(S[i].id)) removed++; }
    var o1 = state();
    kase('O1', 'one recent file: its card, then Load another calendar…, and no second card',
         o1.shown && !!o1.hero && o1.hero.id === keep && o1.cards.length === 0 && o1.foot === 'Load another calendar…' &&
         o1.loads.length === 1 && o1.dataIds === 1,
         { observed: { removed: removed, hero: o1.hero, cards: o1.cards, foot: o1.foot, loads: o1.loads } });

    await removeVia(keep);
    var o0 = state();
    kase('O0', 'none: one card, Recent calendars, Load…, and where they will show up',
         o0.shown && !o0.hero && o0.cards.length === 1 && o0.cards[0] === 'Recent calendars' && o0.dataIds === 0 &&
         o0.loads.length === 1 && o0.loads[0] === 'Load…' && o0.empty === 'Calendars you save or load will show up here.',
         { observed: o0 });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    kase('EX', 'the leg threw', false, { observed: String(e && e.stack || e) });
  }
  T.done(out);
})(); });
