// regionmirror -- the Production Region appears TWICE: under Version in the Show info card, and in the
// Settings window's Region tab, and the two always agree.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh regionmirror 150
//
// Owner, 21 Oct 2026: "i want the region selector to be below the version number box in the Show Iinfo
// tab. It should also exist as a duplicate setting in the settings tab where it already appears, but now
// it appears in both places". #union-place (Settings) stays the one real control: its id is the save
// format and its change handler asks "Continue?". The Show info copy is select.region-mirror, with NO id,
// so it is invisible to collectFieldValues(); a change there is forwarded to #union-place, and
// reflectRegionUI() writes the outcome back.
//
//   M0  the copy: one select.region-mirror, in the Show info card, the field right after Version, no id,
//       labelled "Production Region", with exactly #union-place's options (values and labels, in order)
//   M1  #union-place is still in the Settings window's Region tab, and the copy is visible on the Show tab
//   M2  at boot the two agree
//   M3  Settings -> Show info: setting #union-place (as buildFixture does) moves the copy
//   M4  Show info -> Settings: a pick on the copy, with nothing to misplace, sets #union-place with no
//       dialog, Production's dates recompute, and fields.byId gains no key (the save format is unchanged)
//   M5  undo puts BOTH back
//   M6  with a note to misplace, a pick on the copy ASKS; while it asks both selects hold the OLD Region
//       and the dates have not moved; Cancel leaves both on the old Region
//   M7  asked again and answered Continue: both show the new Region and the dates recompute
//   M8  Load (the real file menu, a fake picker): a calendar saved with us-atlanta shows us-atlanta in both
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function real(){ return document.getElementById('union-place'); }
  function mirrors(){ return document.querySelectorAll('select.region-mirror'); }
  function mirror(){ return mirrors()[0] || null; }
  function both(){ return {settings: real() ? real().value : null, showInfo: mirror() ? mirror().value : null}; }
  function agree(v){ var b = both(); return b.settings === v && b.showInfo === v; }
  function prodMeta(){ return ((document.getElementById('meta-production') || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function optionList(sel){
    return Array.prototype.map.call(sel ? sel.querySelectorAll('option') : [], function (o) {
      return (o.parentNode && o.parentNode.tagName === 'OPTGROUP' ? o.parentNode.label + '/' : '') + o.value + '=' + o.textContent;
    });
  }
  // A user's pick on the Show info copy: the value, then the input and change events a real select raises.
  function pickMirror(v){
    var m = mirror(); if(!m) throw new Error('no select.region-mirror');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(m, v);
    m.dispatchEvent(new Event('input', {bubbles: true}));
    m.dispatchEvent(new Event('change', {bubbles: true}));
  }
  async function waitModal(re, polls){
    for(var i = 0; i < (polls || 30); i++){ await T.sleep(100); var t = T.modalText(); if(re.test(t)) return t; }
    return '';
  }
  function keys(o){ return Object.keys(o).sort().join(','); }
  var REGION_ASK = /Changing the Production Region/;
  try {
    await T.appReady();

    // M0: where the copy is and what it offers.
    var m = mirror(), ver = document.getElementById('show-version');
    var card = ver && ver.closest('section.card');
    var fields = card ? Array.prototype.filter.call(card.querySelectorAll('input, select, textarea'), function (e) { return e.type !== 'hidden'; }) : [];
    var after = fields[fields.indexOf(ver) + 1] || null;
    var wrap = m && m.closest('.mantine-InputWrapper-root');
    var label = wrap ? ((wrap.querySelector('.mantine-InputWrapper-label') || {}).textContent || '').trim() : '';
    var mOpts = optionList(m), rOpts = optionList(real());
    add('M0', 'the Show info card has ONE select.region-mirror, the field right after Version, with no id, labelled "Production Region", offering exactly #union-place\'s options',
      mirrors().length === 1 && !!m && !!card && card.dataset.tab === 'show' && card.contains(m) && after === m && !m.id
        && !!wrap && !wrap.querySelector('input[id], select[id], textarea[id]') && label === 'Production Region'
        && m.getAttribute('aria-label') === 'Production Region' && mOpts.length > 30 && mOpts.join('|') === rOpts.join('|'),
      {count: mirrors().length, inShowCard: !!(card && m && card.contains(m)), afterVersion: after === m, afterIs: after && (after.id || after.className),
       id: m && m.id, label: label, aria: m && m.getAttribute('aria-label'), options: mOpts.length, sameOptions: mOpts.join('|') === rOpts.join('|')},
      'one; in the Show card; after #show-version; no id; "Production Region"; identical option list');

    // M1: the Settings window keeps the real one; the copy is laid out on the Show tab.
    add('M1', '#union-place is still in the Settings window\'s Region tab, and the copy is visible on the Show tab',
      T.settingsTabOf(real()) === 'region' && !!m && m.getClientRects().length > 0,
      {tab: T.settingsTabOf(real()), mirrorShown: !!m && m.getClientRects().length > 0}, 'region; shown');

    // M2: boot.
    var boot = both();
    add('M2', 'at boot the two selects agree', boot.settings !== null && boot.settings === boot.showInfo, boot, 'equal');

    // M3: Settings -> Show info.
    T.buildFixture();   // sets #union-place to us-general the way the Settings window's select does
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the reference grid', 100, 100);
    await T.sleep(1200);
    add('M3', 'choosing in Settings (#union-place) moves the Show info copy', agree('us-general'), both(), 'both us-general');

    // M4: Show info -> Settings, nothing to misplace: no dialog, the dates move, no new save key.
    var sig0 = T.formSignature(), meta0 = prodMeta();
    pickMirror('uk-london');
    var asked4 = await waitModal(REGION_ASK, 12);
    await T.sleep(900);
    var sig1 = T.formSignature(), meta1 = prodMeta();
    add('M4', 'a pick on the Show info copy sets #union-place with no dialog, recomputes Production, and adds no key to fields.byId',
      !asked4 && agree('uk-london') && meta1 !== meta0 && keys(sig0) === keys(sig1) && sig1['union-place'] === 'uk-london',
      {asked: asked4.slice(0, 60), both: both(), meta0: meta0, meta1: meta1, sameKeys: keys(sig0) === keys(sig1), saved: sig1['union-place']},
      'no dialog; both uk-london; the dates move; same key set, union-place = uk-london');

    // M5: undo is a restore (applyStateSnapshot -> refreshAfterRestore), the same path Load takes.
    document.getElementById('undo-btn').click();
    await T.sleep(1200);
    add('M5', 'undo puts both selects back, and Production\'s dates with them', agree('us-general') && prodMeta() === meta0,
      {both: both(), meta: prodMeta(), want: meta0}, 'both us-general; the dates as before');

    // M6: with a note to misplace, the copy's pick asks, holds, and Cancel keeps the old Region on both.
    var week = (document.querySelector('td.sheet-note-cell[data-week]') || {dataset: {}}).dataset.week;
    if(!week) throw new Error('no note cell to type in');
    await T.typeUserNote(week, 'Crew BBQ');
    var metaN = prodMeta();
    pickMirror('uk-london');
    var asked6 = await waitModal(REGION_ASK, 30);
    var during = {both: both(), meta: prodMeta()};
    if(asked6) T.clickModalButton('Cancel');
    await T.sleep(900);
    add('M6', 'with a note, a pick on the copy ASKS; while it asks both selects hold the old Region and the dates have not moved; Cancel keeps both',
      !!asked6 && during.both.settings === 'us-general' && during.both.showInfo === 'us-general' && during.meta === metaN
        && agree('us-general') && prodMeta() === metaN && !T.modalText(),
      {asked: asked6.slice(0, 80), during: during, after: both(), meta: prodMeta(), want: metaN},
      'asked; us-general on both throughout; the dates unchanged');

    // M7: Continue.
    pickMirror('uk-london');
    var asked7 = await waitModal(REGION_ASK, 30);
    if(asked7) T.clickModalButton('Continue');
    await T.sleep(1200);
    add('M7', 'asked again and answered Continue: both show the new Region and Production\'s dates recompute',
      !!asked7 && agree('uk-london') && prodMeta() !== metaN, {asked: asked7.slice(0, 40), both: both(), meta: prodMeta(), was: metaN},
      'both uk-london; the dates move');

    // M8: Load, through the real file menu. customunits.sptcal was saved with us-atlanta.
    var p = T.openViaFakePicker('/tests/fixtures/customunits.sptcal', 'customunits.sptcal', {writes: []});
    for(var i = 0; i < 150; i++){ await T.sleep(100); if(T.clickModalButton('Load') || real().value === 'us-atlanta') break; }
    await p;
    await T.until(function () { return real().value === 'us-atlanta'; }, 'the loaded calendar\'s Region', 300, 100);
    await T.sleep(900);
    add('M8', 'Load: a calendar saved with us-atlanta shows us-atlanta in both selects', agree('us-atlanta'), both(), 'both us-atlanta');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'regionmirror', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
