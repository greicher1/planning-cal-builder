// epcount -- a new Number of Episodes / Number of Blocks is applied when the box is LEFT or Enter is pressed, never
// per keystroke (audit item 2.1, AUD2-008, 13 Nov 2026). A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=blocks ./run.sh epcount 300
//
// ⚠️ Keep the budget under 600 virtual seconds. The leg needs about 100; at 600 (measured: 590 dumps in 6 s, 600 and
// 610 never dump) headless Chrome stops producing a dump at all once E7 has run, and the 1,830 s wall-clock cap
// kills it with nothing written. 600 s is the app's 10-minute autosave tick, and E7's Save As leaves the calendar
// linked to fakeSavePicker's stand-in handle, which has no getFile(). Not chased further: a real file handle has one.
//
// Before the fix, both boxes acted on every keystroke. Typing 12 over 10 passes through '1', and at that keystroke
// syncEpisodesFromShowInfo() popped episodes 202-210: names, day counts, prep and shooting order gone, new ids minted at
// '12', Production's length and wrap changed, and a "Removed ..." line that claimed the count had been LOWERED. In
// Blocks mode reconcileBlockEpisodes() then piled every re-minted episode into the last block, silently. Number of
// Blocks had the same shape: typing 10 over 5 passed through '1' and dropped Block 3's own 13 days.
//
// It types the way a user does, one keystroke at a time into the FOCUSED box (native setter + an input event per
// character), then presses Enter or leaves the box. The fixture is tests/fixtures/blocks.sptcal (Blocks mode, 10
// episodes x 8 days, 5 blocks of 18 days with Block 3 typed to 13, blocks hand-arranged 2/3/1/2/2). Part E reloads it
// in Episodes mode through the real Load with the audit's edits (Episode 201 renamed Pilot at 9 days, 205 at 7.5,
// 208 with 5 prep days, 205 and 206 swapped in the shooting order): 80.5 shoot days.
//   B0-B5  Blocks: typing 12 episodes keeps every block's episodes (211 and 212 join the last block), one Undo;
//          typing 10 blocks keeps Block 3's 13 days and every block's episodes, one Undo.
//   E0-E6  Episodes: mid-typing nothing moves; 12 + Enter keeps every edit and id, adds two at 8 days (96.5), keeps
//          the shooting order and says nothing; one Undo; a real lowering (7, then Tab) still warns, and Undo / Redo
//          take the "Removed ..." line down.
//   E7     A Save made while a count is still being typed writes the calendar on screen, not the half-typed count.
//   E8     Arrow keys in the box: whatever it reads when left is what the calendar has.
//   X0     no console errors.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {test: 'epcount', cases: cases, steps: {}};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id){ return document.getElementById(id); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function qa(s, root){ return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function meta(){ return txt(byId('meta-production')); }
  function warnShown(){ var w = byId('ep-panel-warn'); return !!w && w.style.display !== 'none' && txt(w) !== '' ? txt(w) : ''; }
  // Episodes mode: the rows in shooting order, "id:name:days".
  function epRows(){ return qa('#episode-rows .ep-list .episode-row').map(function (r) {
    return r.getAttribute('data-id') + ':' + r.querySelector('.ep-name').value + ':' + r.querySelector('.ep-days').value; }); }
  // Blocks mode: "id=days[ep,ep]" per block.
  function blocks(){ return qa('#episode-rows .block-row').map(function (b) {
    return b.getAttribute('data-id') + '=' + b.querySelector('.blk-days').value + '[' +
      qa('.episode-row', b).map(function (r) { return r.getAttribute('data-id'); }).join(',') + ']'; }).join(' '); }
  function nativeSet(el, v){ Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); }
  async function settle(){
    var last = '', st = 0;
    await T.until(function () {
      var s = (byId('table-wrap') || {innerHTML: ''}).innerHTML.length + '|' + meta() + '|' + byId('episode-rows').innerHTML.length;
      st = (s === last) ? st + 1 : 0; last = s; return st >= 4;
    }, 'the calendar to settle', 200, 100);
  }
  // Select the box's text and type `s` over it, one keystroke at a time, the box focused throughout.
  async function typeOver(id, s){
    var el = byId(id);
    el.focus(); el.select && el.select();
    await T.sleep(150);
    var v = '';
    for (var i = 0; i < s.length; i++) {
      v += s[i];
      nativeSet(el, v);
      el.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText', data: s[i]}));
      await T.sleep(300);
    }
    return el;
  }
  function pressEnter(el){ el.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', bubbles: true, cancelable: true})); }
  async function leave(el){ el.blur(); await T.sleep(400); await settle(); }
  async function undo(){ byId('undo-btn').click(); await T.sleep(900); await settle(); }
  async function redo(){ byId('redo-btn').click(); await T.sleep(900); await settle(); }
  async function backup(){
    await T.sleep(3600);   // the crash backup is debounced 3 s after an edit
    var b = T.latestBackup();
    return JSON.parse(JSON.stringify((b && b.state) || {}));
  }
  try {
    await T.appReady();
    byId('view-sheet-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap table.sheet-table'); }, 'the waterfall', 200, 100);
    await settle();

    // ---- Part B: Blocks mode, the fixture as saved --------------------------------------------------------------
    var B0 = 'blk1=18[ep1,ep2] blk2=18[ep3,ep4,ep5] blk3=13[ep6] blk4=18[ep7,ep8] blk5=18[ep9,ep10]';
    var b0 = {blocks: blocks(), meta: meta(), mode: byId('show-mode').value};
    add('B0', 'baseline: Blocks mode, five hand-arranged blocks (Block 3 typed to 13 days), 85 shoot days',
      b0.mode === 'blocks' && b0.blocks === B0 && b0.meta.indexOf('85 shoot days') === 0, b0, B0 + ', "85 shoot days"');

    var ne = await typeOver('num-episodes', '1');
    var b1 = {blocks: blocks(), meta: meta(), field: ne.value, warn: warnShown()};
    add('B1', 'mid-typing: the "1" of 12 moves no episode out of its block',
      b1.blocks === B0 && b1.field === '1', b1, B0);
    ne = await typeOver('num-episodes', '12');
    pressEnter(ne); await T.sleep(400); await settle();
    var B2 = 'blk1=18[ep1,ep2] blk2=18[ep3,ep4,ep5] blk3=13[ep6] blk4=18[ep7,ep8] blk5=18[ep9,ep10,ep11,ep12]';
    var b2 = {blocks: blocks(), meta: meta(), warn: warnShown()};
    add('B2', '12 + Enter: every block keeps its episodes, the two new ones (211, 212) join the last block, nothing is said',
      b2.blocks === B2 && b2.warn === '' && b2.meta.indexOf('85 shoot days') === 0, b2, B2);
    await leave(ne);
    await undo();
    var b3 = {blocks: blocks(), field: byId('num-episodes').value};
    add('B3', 'one Undo puts the count back to 10 with every block as it was',
      b3.blocks === B0 && b3.field === '10', b3, B0 + ', field 10');

    var nb = await typeOver('num-blocks', '1');
    var b4a = {blocks: blocks(), meta: meta()};
    nb = await typeOver('num-blocks', '10');
    await leave(nb);
    var B4 = B0 + ' blk6=18[] blk7=18[] blk8=18[] blk9=18[] blk10=18[]';
    var b4 = {mid: b4a, blocks: blocks(), meta: meta(), warn: warnShown()};
    add('B4', 'Number of Blocks 5 -> 10 typed (1, 10), then left: Block 3 keeps its 13 days, every block its episodes; 175 shoot days',
      b4a.blocks === B0 && b4.blocks === B4 && b4.meta.indexOf('175 shoot days') === 0 && b4.warn === '', b4, B4);
    await undo();
    var b5 = {blocks: blocks(), field: byId('num-blocks').value, meta: meta()};
    add('B5', 'one Undo puts five blocks back', b5.blocks === B0 && b5.field === '5' && b5.meta.indexOf('85 shoot days') === 0, b5, B0);

    // ---- Part E: Episodes mode, with the audit's edits, through the real Load --------------------------------
    await T.reloadWith(function (snap) {
      snap.fields.byId['show-mode'] = {value: 'episodes'};
      var e = snap.episodeDefs;
      e[0].name = 'Pilot'; e[0].nameEdited = true; e[0].days = 9; e[0].daysEdited = true;
      e[4].days = 7.5; e[4].daysEdited = true;
      e[7].prepDays = '5';
      var ids = e.map(function (x) { return x.id; }); var t = ids[4]; ids[4] = ids[5]; ids[5] = t;
      snap.episodeShootOrder = ids;
    }, 'Epcount Episodes');
    await settle();
    var E0 = ['ep1:Pilot:9', 'ep2:Episode 202:8', 'ep3:Episode 203:8', 'ep4:Episode 204:8', 'ep6:Episode 206:8', 'ep5:Episode 205:7.5',
              'ep7:Episode 207:8', 'ep8:Episode 208:8', 'ep9:Episode 209:8', 'ep10:Episode 210:8'];
    var e0 = {rows: epRows(), meta: meta(), mode: byId('show-mode').value};
    out.steps.e0 = e0;
    add('E0', 'baseline: Episodes mode, Pilot at 9 days, 205 at 7.5 and shot after 206: 80.5 shoot days',
      e0.mode === 'episodes' && e0.rows.join('|') === E0.join('|') && e0.meta.indexOf('80.5 shoot days') === 0, e0, E0.join('|'));

    ne = await typeOver('num-episodes', '1');
    var e1 = {rows: epRows(), meta: meta(), warn: warnShown(), field: ne.value};
    add('E1', 'mid-typing: the "1" of 12 drops no episode, changes no length and says nothing',
      e1.rows.join('|') === E0.join('|') && e1.meta === e0.meta && e1.warn === '' && e1.field === '1', e1, 'as E0');
    ne = await typeOver('num-episodes', '12');
    pressEnter(ne); await T.sleep(400); await settle();
    var E2 = E0.concat(['ep11:Episode 211:8', 'ep12:Episode 212:8']);
    var e2 = {rows: epRows(), meta: meta(), warn: warnShown()};
    await leave(ne);
    var s2 = await backup();
    var ep8 = (s2.episodeDefs || []).filter(function (x) { return x.id === 'ep8'; })[0] || {};
    e2.prep208 = ep8.prepDays; e2.order = (s2.episodeShootOrder || []).join(','); e2.savedCount = ((s2.fields || {}).byId || {})['num-episodes'];
    out.steps.e2 = e2;
    add('E2', '12 + Enter: every edit and id kept, 211 and 212 added at 8 days (96.5 shoot days), the order kept, 208 keeps its 5 prep days, nothing said',
      e2.rows.join('|') === E2.join('|') && e2.meta.indexOf('96.5 shoot days') === 0 && e2.warn === '' && e2.prep208 === '5' &&
      e2.order.indexOf('ep4,ep6,ep5,ep7') !== -1 && !!e2.savedCount && e2.savedCount.value === '12', e2, E2.join('|') + ', 96.5');

    await undo();
    var e3 = {rows: epRows(), meta: meta(), field: byId('num-episodes').value};
    add('E3', 'one Undo puts 10 episodes back with every edit', e3.rows.join('|') === E0.join('|') && e3.meta === e0.meta && e3.field === '10', e3, 'as E0');

    // A REAL lowering still warns: 7 drops 208 (prep), 209 and 210.
    ne = await typeOver('num-episodes', '7');
    var e4a = {rows: epRows().length, warn: warnShown()};
    await leave(ne);
    var e4 = {mid: e4a, rows: epRows(), warn: warnShown(), meta: meta()};
    add('E4', 'a real lowering to 7, applied when the box is left: seven episodes, and the line names Episode 208 (its prep days went)',
      e4a.rows === 10 && e4a.warn === '' && e4.rows.length === 7 && /Removed\s+Episode 208/.test(e4.warn), e4, '7 rows, "Removed Episode 208 ..."');
    await undo();
    var e5 = {rows: epRows(), warn: warnShown(), field: byId('num-episodes').value};
    add('E5', 'Undo brings the three episodes back and takes the "Removed ..." line down',
      e5.rows.join('|') === E0.join('|') && e5.warn === '' && e5.field === '10', e5, 'as E0, no line');
    await redo();
    var e6 = {rows: epRows().length, warn: warnShown(), field: byId('num-episodes').value};
    add('E6', 'Redo lowers it to 7 again without putting the line back up',
      e6.rows === 7 && e6.warn === '' && e6.field === '7', e6, '7 rows, no line');
    await undo();

    // E7: a Save while the count is still being typed (the box focused, nothing applied yet).
    ne = await typeOver('num-episodes', '3');
    var rec = T.fakeSavePicker(), saved = null;
    try {
      await T.sleep(700);
      byId('save-as-btn').click();
      await T.until(function () { return rec.files.length > 0; }, 'the Save As write', 100, 100);
      saved = JSON.parse(new TextDecoder().decode(rec.files[rec.files.length - 1].bytes));
    } finally { rec.restore(); }
    var e7 = {focused: document.activeElement === ne, field: ne.value, rows: epRows().length,
      savedCount: saved && saved.fields.byId['num-episodes'], savedDefs: saved && (saved.episodeDefs || []).length};
    await leave(ne);
    e7.after = epRows().length;
    add('E7', 'a Save made while "3" is still being typed writes the calendar on screen (10 episodes, count 10); leaving the box then applies 3',
      e7.field === '3' && e7.rows === 10 && !!e7.savedCount && e7.savedCount.value === '10' && e7.savedDefs === 10 && e7.after === 3, e7,
      'saved count 10 with 10 episodes; 3 rows after leaving');
    await undo();

    // E8: arrow keys. Mantine steps the box without an input event; whatever the box reads when it is left is what applies.
    ne = byId('num-episodes'); ne.focus(); await T.sleep(150);
    for (var k = 0; k < 2; k++) { ne.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', code: 'ArrowUp', bubbles: true, cancelable: true})); await T.sleep(250); }
    var e8a = ne.value;
    await leave(ne);
    var e8 = {afterArrows: e8a, field: ne.value, rows: epRows().length};
    add('E8', 'arrow keys: the calendar has as many episodes as the box reads once it is left',
      String(e8.rows) === e8.field, e8, 'rows = field');

    add('X0', 'no console errors', (window.__ERR || []).length === 0, (window.__ERR || []).slice(0, 5), 'none');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  out.err = (window.__ERR || []).slice(0, 10);
  T.done(out);
})(); });
