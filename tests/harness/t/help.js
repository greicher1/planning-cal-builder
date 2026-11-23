// help -- SPTCal's Help window (src/help/, 21 Nov 2026): the ONE leg for all of Help (owner's rule: Help stays cheap to
// update, so it has this leg and npm run check, never the full gate).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=help-demo ./run.sh help 400
//
// It replaced the one-page Guide's wording checks, which sat in six other legs (filekeys H1, firstrun H1, noresetall A4,
// simpostlabel S2, exportnames X7, swapwords R6) and in oskeys H1/H2 (now reads the Keyboard shortcuts article). Those
// matched text in a hidden overlay that was always in the page; Help is drawn only while it is open, so everything here
// opens it first. The leg checks that Help WORKS and that its words are not stale; it does not grade its prose.
//
// ⛔ No dollar sign anywhere in this file (see srv.js).
//
//   H0  Help is closed at the start, and the ? button is there
//   H1  ? opens it on the tour, with a sidebar of articles
//   H2  every article opens under its own title, says nothing is "being written", and every picture in it has loaded
//   H4  search finds an article by a word in its body, says so when nothing matches, Esc clears the search and keeps
//       Help open, and a result opens its article
//   H5  Esc closes Help
//   H7  the "I only use the Month view" switch hides the Waterfall-only articles, and is remembered (localStorage)
//   H8  Help's own controls (opening, reading, searching, the switch) change nothing in the calendar: no field moves, the
//       Undo button and the save status are as they were
//   H3  every Show me button closes Help and rings its control, whatever view or tab it has to go to first
//   H6  ? opens the article for what is open: the Shift box, Build Around, a waterfall note editor, the month day menu,
//       Settings (by its tab: Preferences, Region, Presets); else the last article read, else the view's own
//   (an ⓘ hint's "More in Help" is not here: a headless run draws no frames, so a Mantine HoverCard never opens. The link
//   was tried by hand in the browser, and tools/check-help-jsx.mjs fails on any help="..." that names no article.)
//   H10 no stale wording in ANY article: nothing the app no longer has or does (Export App With Data, Reset All, "three
//       modes", the old file-name shapes, "aren't touched" and "same widths" for a swap ...)
//   H11 the facts that mattered most are still said: autosave writes the real file, Region starts on None, Auto throws
//       header lines away, the offset is in calendar weeks, the file-name example, and every main feature has a page
//   E0  no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function txt(e){ return ((e && (e.innerText || e.textContent)) || '').replace(/\s+/g, ' ').trim(); }
  // The whole text, folded "More detail" sections included (innerText leaves a closed <details> out).
  function full(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function isOpen(){ return !!q('.help-dlg'); }
  function crumb(){ return txt(q('.help-dlg .hp-art h1')); }
  function navTitles(){ return qa('.help-dlg .hp-nav .hp-i').map(txt); }
  function shown(sel){ var e = q(sel); if(!e) return false; var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function typeInto(input, v){
    var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(input, v); input.dispatchEvent(new Event('input', {bubbles: true}));
  }
  function esc(el){ (el || document.body).dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', bubbles: true, cancelable: true})); }
  // The ? button, as a person presses it: the pointer press (which reads what is open) and then the click.
  async function pressHelp(){
    var fab = q('#help-fab');
    fab.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
    fab.click();
    await T.until(isOpen, 'Help to open', 60, 50);
    await T.sleep(200);
  }
  async function closeHelp(){
    if(!isOpen()) return;
    q('.help-dlg .hp-x').click();
    await T.until(function(){ return !isOpen(); }, 'Help to close', 40, 50);
  }
  async function openArticle(title){
    var b = qa('.help-dlg .hp-nav .hp-i').filter(function(x){ return txt(x) === title; })[0];
    if(!b) return false;
    b.click(); await T.sleep(70);
    return crumb() === title;
  }
  async function view(mode){
    var want = mode === 'month' ? '#table-wrap .month-view' : '#table-wrap table';
    if(q(want)) return;
    q(mode === 'month' ? '#view-month-btn' : '#view-sheet-btn').click();
    await T.until(function(){ return !!q(want); }, 'the ' + mode + ' view', 60, 100);
    await T.sleep(300);
  }
  async function contextArticle(prep){
    await closeHelp(); T.closePops(); await T.sleep(150);
    await prep(); await T.sleep(250);
    await pressHelp();
    var got = crumb();
    await closeHelp(); T.closePops(); await T.sleep(150);
    return got;
  }

  try {
    await T.appReady();
    await T.sleep(1200);
    try { localStorage.removeItem('sptcal.help'); } catch (e) {}
    var sig0 = JSON.stringify(T.formSignature()), undo0 = !!(q('#undo-btn') || {}).disabled, status0 = txt(q('#save-status'));

    // ---- H0, H1 ----
    add('H0', 'Help is closed at the start, and the ? button is there',
      !isOpen() && !!q('#help-fab'), {open: isOpen(), fab: !!q('#help-fab')}, 'closed; #help-fab');
    await pressHelp();
    var titles = navTitles();
    add('H1', '? opens Help on the tour, with a sidebar of articles',
      isOpen() && crumb() === 'Tour of the screen' && titles.length >= 40 && !!q('.help-dlg .hp-search input') && !!q('.help-dlg .hp-foot'),
      {title: crumb(), articles: titles.length}, 'Tour of the screen; 40+ articles');

    // ---- H2: every article ----
    var problems = [], allText = {}, showmes = [], picCount = 0;
    for(var i = 0; i < titles.length; i++){
      var btn = qa('.help-dlg .hp-nav .hp-i')[i];
      btn.click(); await T.sleep(70);
      var art = q('.help-dlg .hp-art'), body = txt(art);
      var imgs = qa('img', art), bad = imgs.filter(function(m){ return !(m.complete && m.naturalWidth > 0); });
      if(bad.length){ await T.sleep(250); bad = imgs.filter(function(m){ return !(m.complete && m.naturalWidth > 0); }); }
      picCount += imgs.length;
      var title = txt(q('h1', art));
      if(title !== titles[i]) problems.push(titles[i] + ': heading reads "' + title + '"');
      if(/being written/i.test(body) || q('.hp-todo', art)) problems.push(titles[i] + ': "being written"');
      if(!q('.hp-lead', art)) problems.push(titles[i] + ': no lead');
      if(bad.length) problems.push(titles[i] + ': ' + bad.length + ' picture(s) not loaded');
      allText[titles[i]] = full(art);
      qa('.hp-showme', art).forEach(function(b, n){
        showmes.push({article: titles[i], n: n, at: b.getAttribute('data-showme'), view: b.getAttribute('data-view'), tab: b.getAttribute('data-tab'), sw: b.getAttribute('data-sw')});
      });
    }
    add('H2', 'every article opens under its own title, with a lead, nothing "being written", every picture loaded',
      problems.length === 0 && titles.length >= 40, {articles: titles.length, pictures: picCount, showMe: showmes.length, problems: problems.slice(0, 8)}, 'no problems');

    // ---- H4: search ----
    var input = q('.help-dlg .hp-search input');
    typeInto(input, 'autosave');
    await T.until(function(){ return qa('.help-dlg .hp-res').length > 0; }, 'search results', 80, 100);
    var found = qa('.help-dlg .hp-res b').map(txt);
    typeInto(input, 'zzzqqqxx');
    await T.until(function(){ return !!q('.help-dlg .hp-none') && qa('.help-dlg .hp-res').length === 0; }, 'no results', 60, 100);
    var none = txt(q('.help-dlg .hp-none'));
    esc(input); await T.sleep(150);
    var afterEsc = {open: isOpen(), value: q('.help-dlg .hp-search input').value, nav: navTitles().length};
    typeInto(q('.help-dlg .hp-search input'), 'swap');
    await T.until(function(){ return qa('.help-dlg .hp-res').length > 0; }, 'swap results', 60, 100);
    var swapRes = qa('.help-dlg .hp-res').filter(function(r){ return /Swapping/.test(txt(q('b', r))); })[0];
    if(swapRes) swapRes.click();
    await T.sleep(150);
    add('H4', 'search finds an article by a word in its body, says so when nothing matches, Esc clears it and keeps Help open, a result opens its article',
      found.indexOf('Save, Load and autosave') >= 0 && /No articles match/.test(none) &&
      afterEsc.open && afterEsc.value === '' && afterEsc.nav >= 40 && !!swapRes && /Swapping/.test(crumb()) && q('.help-dlg .hp-search input').value === '',
      {found: found.slice(0, 4), none: none, afterEsc: afterEsc, opened: crumb()}, 'autosave in the results; no match line; Esc clears; the result opens');

    // ---- H7: the Month-only switch ----
    var sw = q('.help-dlg .hp-side-foot input[type=checkbox]');
    var all = navTitles().length;
    sw.click(); await T.sleep(200);
    var monthOnly = navTitles();
    var stored = ''; try { stored = localStorage.getItem('sptcal.help') || ''; } catch (e) {}
    qa('.help-dlg .hp-side-foot input[type=checkbox]')[0].click(); await T.sleep(200);
    var back = navTitles().length;
    add('H7', 'the Month-only switch hides the Waterfall-only articles and is remembered; switching it off brings them back',
      monthOnly.length < all && monthOnly.indexOf('Reading the waterfall') < 0 && monthOnly.indexOf('The Month view at a glance') >= 0 &&
      /"monthOnly":true/.test(stored) && back === all,
      {all: all, monthOnly: monthOnly.length, stored: stored, back: back}, 'fewer articles, no Reading the waterfall, stored, then all back');

    // ---- H5: Esc closes ----
    esc(q('.help-dlg .hp-search input')); await T.sleep(250);
    var escClosed = !isOpen();
    if(!escClosed) await closeHelp();
    add('H5', 'Esc closes Help', escClosed, {closedByEsc: escClosed}, 'closed');

    // ---- H8: Help changed nothing in the calendar ----
    await T.sleep(300);
    var sig1 = JSON.stringify(T.formSignature()), undo1 = !!(q('#undo-btn') || {}).disabled, status1 = txt(q('#save-status'));
    add('H8', 'opening, reading, searching and the switch change nothing in the calendar: same fields, same Undo, same save status',
      sig1 === sig0 && undo1 === undo0 && status1 === status0,
      {sameFields: sig1 === sig0, undoBefore: undo0, undoAfter: undo1, statusBefore: status0, statusAfter: status1}, 'unchanged');

    // ---- H3: every Show me ----
    await view('sheet');
    var showFails = [];
    for(var s = 0; s < showmes.length; s++){
      var sm = showmes[s];
      if(!isOpen()) await pressHelp();
      if(q('.help-dlg .hp-search input').value) typeInto(q('.help-dlg .hp-search input'), '');
      await T.sleep(60);
      if(!(await openArticle(sm.article))){ showFails.push(sm.article + ' #' + sm.n + ': article would not open'); continue; }
      var button = qa('.help-dlg .hp-showme')[sm.n];
      if(!button){ showFails.push(sm.article + ' #' + sm.n + ': no button'); continue; }
      qa('.help-ring').forEach(function(r){ r.remove(); });
      button.click();
      var ringed = true;
      try { await T.until(function(){ return !!q('.help-ring'); }, 'the ring', 50, 100); } catch (e) { ringed = false; }
      if(!ringed || isOpen()) showFails.push(sm.article + ' ' + sm.at + (ringed ? ': Help stayed open' : ': no ring'));
      qa('.help-ring').forEach(function(r){ r.remove(); });
      if(isOpen()) await closeHelp();
      await T.sleep(100);
    }
    add('H3', 'every Show me closes Help and rings its control (' + showmes.length + ' buttons)',
      showFails.length === 0 && showmes.length >= 12, {buttons: showmes.length, fails: showFails.slice(0, 8)}, 'every ring drawn');

    // ---- H6: ? opens the article for what is open ----
    await T.closeSettings();
    await view('sheet');
    try { localStorage.removeItem('sptcal.help'); } catch (e) {}
    var c = {};
    c.waterfall = await contextArticle(async function(){});
    c.shift = await contextArticle(async function(){
      q('#pop-shift-btn').click(); await T.until(function(){ return shown('#pop-shift'); }, 'the Shift box', 40, 50); });
    c.build = await contextArticle(async function(){
      q('#pop-solve-btn').click(); await T.until(function(){ return shown('#pop-solve'); }, 'the Build Around box', 40, 50); });
    c.note = await contextArticle(async function(){
      var td = q('td.sheet-note-cell[data-week="2027-06-07"]') || q('td.sheet-note-cell[data-week]');
      T.openCell(td); await T.until(function(){ return shown('.note-pop'); }, 'the note editor', 40, 50); });
    c.prefs = await contextArticle(async function(){ await T.openSettings('prefs'); });
    c.region = await contextArticle(async function(){ await T.openSettings('region'); });
    c.presets = await contextArticle(async function(){ await T.openSettings('presets'); });
    await T.closeSettings();
    await view('month');
    try { localStorage.removeItem('sptcal.help'); } catch (e) {}
    c.month = await contextArticle(async function(){});
    c.dayMenu = await contextArticle(async function(){
      var cell = q('#table-wrap .mv-daycell'), r = cell.getBoundingClientRect();
      cell.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true, button: 2, clientX: Math.round(r.left + 20), clientY: Math.round(r.top + 20)}));
      await T.until(function(){ return shown('.day-menu'); }, 'the day menu', 40, 50); });
    // "the last article read": read the Glossary, close, reopen with nothing open.
    await closeHelp(); T.closePops();
    esc(document.body); document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
    try { await T.until(function(){ return !shown('.day-menu'); }, 'the day menu to close', 30, 50); } catch (e) {}
    await pressHelp(); await openArticle('Glossary'); await closeHelp(); await T.sleep(150);
    await pressHelp(); c.last = crumb(); await closeHelp();
    add('H6', '? opens the article for what is open (Shift, Build Around, a note editor, the day menu, each Settings tab), else the last one read, else the view\'s own',
      c.waterfall === 'Tour of the screen' && c.shift === 'Shift in detail' && c.build === 'Build Around in detail' && c.note === 'Notes in the Waterfall' &&
      c.prefs === 'Preferences' && c.region === 'Production Region and union holidays' && c.presets === 'Header presets' &&
      c.month === 'The Month view at a glance' && c.dayMenu === 'The Month view at a glance' && c.last === 'Glossary',
      c, 'Tour; Shift in detail; Build Around in detail; Notes in the Waterfall; Preferences; Production Region and union holidays; Header presets; The Month view at a glance (twice: the month, then a day’s menu); Glossary');

    // ---- H10: no stale wording ----
    var STALE = [
      ['Export App With Data', /Export App With Data/], ['Background graphics', /Background graphics/], ['Reset All', /Reset All/],
      ['three modes', /three modes/i], ['bottom of the panel', /bottom of the panel/], ['informational', /informational/i],
      ['local storage', /local storage/i], ['Settings > Calendar', /Settings\s*[→›>]\s*Calendar\b/],
      ['old file name: Season 1 Planning Calendar', /Season 1 Planning Calendar/], ['old file name: Planning Calendar S1', /Show Title Planning Calendar S1/],
      ['old file name: Show Title - Season 1', /Show Title - Season 1/], ['Reset Notes alone', /\bReset Notes\b/],
      ['five default phases', /Pre-Prep, Prod Prep, Production, and Post are provided/], ['Sim Post blocks Production', /can.t be moved while Simultaneous Post/],
      ['swap: aren\'t touched', /aren.t touched/], ['swap: same widths', /same widths/], ['offset in weeks (not calendar weeks)', /how many weeks after Production begins/],
      ['a Month view only tag in words', /card then reads Month view only/], ['Ends by never overshoots', /Ends by never overshoots/],
      ['"each one asks first"', /Each one asks first/], ['Cancel keeps the choice', /The choice is kept either way/]
    ];
    var hits = [];
    Object.keys(allText).forEach(function(t){ STALE.forEach(function(p){ if(p[1].test(allText[t])) hits.push(p[0] + ' in ' + t); }); });
    add('H10', 'no stale wording in any article', hits.length === 0, {checked: Object.keys(allText).length, patterns: STALE.length, hits: hits.slice(0, 8)}, 'none');

    // ---- H11: the facts that must still be said ----
    function has(title, re){ return re.test(allText[title] || ''); }
    var FEATURES = [
      ['Simultaneous Post', /calendar weeks after Production begins/],
      ['File names', /Show Title S1 Planning Calendar v3 WRO 1\.5\.26 - a\.o\. 11\.12\.26\.xlsx/],
      ['Save, Load and autosave', /rewrites that file/], ['Save, Load and autosave', /Save As/], ['Save, Load and autosave', /Unsaved work/],
      ['Save, Load and autosave', /recent calendars/],
      ['Production Region and union holidays', /starts on None/], ['Production Region and union holidays', /Costs a shoot day/],
      ['Header: Auto, Template, Manual, Off', /throws away the lines/], ['Header: Auto, Template, Manual, Off', /last edited/i],
      ['Header: Auto, Template, Manual, Off', /square brackets/],
      ['Scenarios and Compare', /Scenario/], ['Scenarios and Compare', /Only differences/], ['Calendar range', /Calendar range/],
      ['Preferences', /MM\/DD/], ['Preferences', /Single Column Mode/], ['Preferences', /Number Production Days/],
      ['The Month view at a glance', /Work this day/], ['The Month view at a glance', /Full day/],
      ['Phase cards: start and length', /Add phase/], ['Phase cards: start and length', /eye/],
      ['Hiatus: the whole show or one phase', /one phase/], ['Export: PDF and Excel (Waterfall)', /Export to Excel/],
      ['Automatic notes and holidays', /Hide Holiday/], ['Notes in the Month view', /Paste notes/],
      ['Episodes or blocks', /Blocks/], ['Episodes or blocks', /4\.5/], ['Episodic prep', /Default prep/],
      ['Tandem days', /not a 13-day shoot/], ['Shift in detail', /keep their distance from the wrap/], ['Keyboard shortcuts', /Esc/]
    ];
    var missing = FEATURES.filter(function(f){ return !has(f[0], f[1]); }).map(function(f){ return f[0] + ': ' + String(f[1]).slice(0, 40); });
    add('H11', 'the facts that mattered most are still said, and every main feature has its page', missing.length === 0,
      {checked: FEATURES.length, missing: missing}, 'none missing');

    var errs = (T.appHealth().errors || []);
    add('E0', '0 console errors', errs.length === 0, {errors: errs.slice(0, 5)}, 'none');
  } catch (e) {
    add('EX', 'the leg threw: ' + String(e && e.message || e), false, String(e && e.stack || e), 'no error');
  }
  T.done({test: 'help', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
