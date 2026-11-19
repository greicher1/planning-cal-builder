// scenversion -- each scenario tab shows its Version, and a copy is offered the next one (owner, 18-19 Nov 2026:
// "if someone adds a version number to the first scenario ... when they add a second scenario"; layout C of
// mockups/scenario-version-layouts.html, "lets see with version c looks like in the app"; then "if i dont click the
// arrow ... at first, i should later be able to click on the little version number and the arrow should pop up again").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh scenversion 200
//
// Driven as a user drives it: Show info's Version box, the strip's "+", the rename box, the tab badges and "→ vN".
// tests/fixtures/halfdays.sptcal (synthetic, no Version), Loaded through openViaFakePicker so Save writes to a recorder.
//
//   V1  one scenario: no badge (the strip is "+ Scenario"); with a Version typed and "+" pressed, the first tab's
//       badge reads v3 and the copy, its name box open, shows "→ v4"
//   V2  "→ v4" with the name box open: the Version box, the header and the band read v4, the box stays open with
//       focus, and the offer is gone
//   V3  Enter keeps the name: the tabs read "Scenario A v3", "Scenario B v4"; ⌘Z takes B back to v3
//   V4  a click on the tab's badge brings "→ v4" back; a second click puts it away
//   V5  the offer goes on the next edit (Show info's Location)
//   V6  a click on ANOTHER tab's badge switches to it and offers there; the number is the highest on any tab + 1
//   V7  a copy of the FIRST tab goes to the far right (19 Nov 2026); with no Version, no badge and no offer
//   V8  a saved file carries no new key (the offer and the badge are session UI)
//   V9  the "+" tooltip names the tab it will copy (19 Nov 2026)
//   E0  no page errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function q(s){ return document.querySelector(s); }
  function qa(s){ return [].slice.call(document.querySelectorAll(s)); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  // "Name badge →bump", the current tab starred, an open name box as [its value].
  function tabs(){ return qa('.sc-tab').map(function(t){
    var inp = t.querySelector('input');
    var parts = [inp ? '[' + inp.value + ']' : txt(t.querySelector('.sc-tab-name')), txt(t.querySelector('.sc-tab-ver')), txt(t.querySelector('.sc-ver-bump'))];
    return (t.classList.contains('is-current') ? '*' : '') + parts.filter(Boolean).join(' ');
  }).join(' | '); }
  function setField(id, v){
    var el = document.getElementById(id), d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    d.set.call(el, v); el.dispatchEvent(new Event('input', {bubbles: true}));
  }
  function addBtn(){ return q('.sc-strip [aria-label="Duplicate this scenario"]') ||
                            qa('.sc-strip button').filter(function(b){ return /Scenario/.test(b.textContent); })[0]; }
  // A press as a mouse makes it: the bump's mousedown must not take focus from the name box.
  function press(el){
    var md = new MouseEvent('mousedown', {bubbles: true, cancelable: true});
    var kept = !el.dispatchEvent(md);   // false when the handler called preventDefault
    el.click();
    return kept;
  }
  function badgeOf(name){ var t = qa('.sc-tab').filter(function(x){ return txt(x.querySelector('.sc-tab-name')) === name; })[0]; return t && t.querySelector('.sc-tab-ver'); }
  function bandVersion(){
    var s = qa('.sc-band-stat').filter(function(x){ return txt(x.querySelector('.sc-band-lab')) === 'Version'; })[0];
    return s ? {v: txt(s.querySelector('.sc-band-v')), same: !!s.querySelector('.sc-band-v.is-same')} : null;
  }
  function headerHas(v){ return new RegExp('(^|\\s)' + v + '(\\s|$)').test((q('#table-wrap') || {}).innerText || ''); }
  function enterName(){ var i = q('.sc-tab-input'); if(i) i.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); }
  try {
    var writes = [];
    var p = T.openViaFakePicker('/tests/fixtures/halfdays.sptcal', 'halfdays.sptcal', {writes: writes});
    for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    await p; await T.sleep(1500);
    await T.until(function(){ return !!q('.sc-strip'); }, 'the scenario strip', 60, 100);

    // V1
    var one = {tabs: qa('.sc-tab').length, badges: qa('.sc-tab-ver').length};
    setField('show-version', '3'); await T.sleep(400);
    addBtn().click(); await T.sleep(900);
    out.v1 = tabs();
    add('V1', 'one scenario has no badge; after "+", A reads v3 and the copy (name box open) offers → v4',
      one.tabs === 0 && one.badges === 0 && out.v1 === 'Scenario A v3 | *[Scenario B] → v4' && document.activeElement === q('.sc-tab-input'),
      {one: one, tabs: out.v1, focus: document.activeElement && document.activeElement.className}, '0 tabs, then Scenario A v3 | *[Scenario B] → v4, focus in the box');

    // V2
    var kept = press(q('.sc-ver-bump')); await T.sleep(700);
    var v2 = {kept: kept, ver: q('#show-version').value, header: headerHas('v4'), band: bandVersion(), tabs: tabs(),
              focus: document.activeElement === q('.sc-tab-input'), bump: !!q('.sc-ver-bump')};
    add('V2', '→ v4 with the name box open: Version, header and band read v4, the box keeps focus, the offer goes',
      v2.kept && v2.ver === '4' && v2.header && v2.band && v2.band.v === 'v4' && !v2.band.same && v2.focus && !v2.bump,
      v2, 'mousedown prevented, 4, header v4, band v4 (not dimmed), focus kept, no bump');

    // V3
    enterName(); await T.sleep(500);
    var v3a = tabs();
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', metaKey: true, bubbles: true})); await T.sleep(900);
    var v3b = tabs();
    add('V3', 'Enter keeps the name; the tabs read A v3, B v4; ⌘Z takes B back to v3',
      v3a === 'Scenario A v3 | *Scenario B v4' && v3b === 'Scenario A v3 | *Scenario B v3' && q('#show-version').value === '3',
      {afterEnter: v3a, afterUndo: v3b, ver: q('#show-version').value}, 'Scenario A v3 | *Scenario B v4, then *Scenario B v3');

    // V4
    badgeOf('Scenario B').click(); await T.sleep(400);
    var v4a = tabs();
    badgeOf('Scenario B').click(); await T.sleep(400);
    var v4b = tabs();
    add('V4', 'a click on the badge brings → v4 back; a second click puts it away',
      v4a === 'Scenario A v3 | *Scenario B v3 → v4' && v4b === 'Scenario A v3 | *Scenario B v3',
      {first: v4a, second: v4b}, '*Scenario B v3 → v4, then *Scenario B v3');

    // V5
    badgeOf('Scenario B').click(); await T.sleep(400);
    var v5a = !!q('.sc-ver-bump');
    setField('show-location', 'Somewhere'); await T.sleep(600);
    add('V5', 'the offer goes on the next edit', v5a && !q('.sc-ver-bump'), {before: v5a, after: !!q('.sc-ver-bump'), tabs: tabs()}, 'shown, then gone');

    // V6 -- B to 7 by hand; then A's badge: switches to A and offers v8 (the highest on any tab, 7, plus one).
    setField('show-version', '7'); await T.sleep(600);
    badgeOf('Scenario A').click(); await T.sleep(1200);
    var v6 = tabs();
    add('V6', 'another tab\'s badge switches to it and offers the highest version on any tab + 1',
      v6 === '*Scenario A v3 → v8 | Scenario B v7', {tabs: v6}, '*Scenario A v3 → v8 | Scenario B v7');

    // V7 -- clear A's Version, copy: no badge on either, no offer. A is the FIRST tab, and the copy goes to the far
    // right, not between A and B (owner, 19 Nov 2026, "Yes, far right").
    setField('show-version', ''); await T.sleep(500);
    // V9 -- the "+" tooltip names the tab it copies, the one on screen (owner, 19 Nov 2026, "Yes, add the name").
    var v9 = addBtn().getAttribute('title');
    add('V9', 'the "+" tooltip names the tab it will copy', v9 === 'Duplicate Scenario A', {title: v9}, 'Duplicate Scenario A');
    addBtn().click(); await T.sleep(900);
    var v7 = tabs();
    enterName(); await T.sleep(400);
    add('V7', 'a copy of the first tab goes to the far right; with no Version it shows no badge and no offer',
      v7 === 'Scenario A | Scenario B v7 | *[Scenario C]' && !q('.sc-ver-bump'), {tabs: v7}, 'Scenario A | Scenario B v7 | *[Scenario C]');

    // V8 -- the file: the scenarios' tab entries hold only their own keys, and no top-level key names the offer.
    document.getElementById('save-file-btn').click(); await T.sleep(1200);
    var text = writes.length ? writes[writes.length - 1].text : null;
    var obj = null; try { obj = text ? JSON.parse(text) : null; } catch(e){}
    var tabKeys = obj && obj.scenarios ? obj.scenarios.tabs.map(function(t){ return Object.keys(t).sort().join(','); }) : null;
    var flat = text ? /verOffer|scenarioVerOffer/.test(text) : null;
    add('V8', 'a saved file carries no new key: each tab is {id, name, snapshot}, and nothing names the offer',
      !!tabKeys && tabKeys.every(function(k){ return k === 'id,name,snapshot' || k === 'id,name'; }) && flat === false,
      {tabKeys: tabKeys, mentionsOffer: flat, saved: !!text}, 'id,name,snapshot per tab; no verOffer');
  } catch(e){
    add('ERR', 'the leg threw', false, String(e && e.stack || e), 'no error');
  }
  out.health = T.appHealth();
  add('E0', 'no page errors', !(out.health && out.health.errors && out.health.errors.length), out.health && out.health.errors, '[]');
  out.cases = cases;
  out.pass = cases.filter(function(c){ return c.pass; }).length;
  out.fail = cases.filter(function(c){ return !c.pass; }).length;
  T.done(out);
})(); });
