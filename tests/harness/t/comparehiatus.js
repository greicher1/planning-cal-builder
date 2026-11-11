// comparehiatus -- a phase whose typed start falls inside a hiatus that pauses it is dated from the first week it
// WORKS, in Compare, the key facts band and every {<phase>.open} token (owner, 10 Nov 2026: "Fix the token").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=compare-hiatus ./run.sh comparehiatus 240
//
// tests/fixtures/compare-hiatus.sptcal (synthetic) holds three scenarios of one calendar, on screen the first:
//   "Typed in the break"  Writer's Rm typed 12/21/26 and Post 12/20/27, each the first week of a locked 2-week Holiday
//                         Hiatus, so the grid's Writer's Rm wk 1 is 1/4/27 and its Post wk 1 is 1/3/28;
//   "After the break"     the same calendar with those two typed the week after each break: an identical grid;
//   "Own break"           "After the break" plus Post's own 2-week hiatus from 1/3/28, so Post wk 1 is 1/17/28.
// Before the fix, Compare read each phase's typed date (seg.start): "12/20/27 - 8/11/28" against "1/3/28 - 8/11/28"
// with "Start pushed 2 wks, end same" on two identical calendars (the owner's report), and the band and "Weeks, first
// phase to last" counted the break's weeks. Red on the pre-change build at H1-H4 and H6 (measured 10 Nov 2026).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function val(id){ var e = document.getElementById(id); return e ? e.value : null; }
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  // Compare's row by its label: [{text, chip}] per scenario column, on-screen scenario first (the window's order).
  function compareRow(label){
    var tr = [].slice.call(document.querySelectorAll('.compare-dlg tbody tr')).filter(function(r){ return r.children[0].innerText.trim() === label; })[0];
    return tr ? [].slice.call(tr.children).slice(1).map(function(td){
      var lines = td.innerText.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
      return {text: lines[0] || '', chip: lines.slice(1).join(' | ')};
    }) : null;
  }
  function heads(){ return [].slice.call(document.querySelectorAll('.compare-dlg thead th')).slice(1).map(function(th){ return th.innerText.split('\n')[0].trim(); }); }
  // The earliest week a phase's cell (not its hiatus band) is drawn in, by data-week, which sorts as a date.
  function firstWeek(key){
    var w = [].slice.call(document.querySelectorAll('td.sheet-phase-cell[data-pkey="' + key + '"]'))
      .filter(function(td){ return !td.classList.contains('sheet-hiatus-cell'); }).map(function(td){ return td.dataset.week; }).sort();
    return w[0] || null;
  }
  function wrTile(){
    var s = [].slice.call(document.querySelectorAll('.sc-band-stat')).filter(function(x){ return /^Writer/.test(x.querySelector('.sc-band-lab').textContent); })[0];
    return s ? {text: [].slice.call(s.querySelectorAll('.sc-band-v')).map(function(v){ return v.textContent; }).join(' · '),
                same: [].slice.call(s.querySelectorAll('.sc-band-v')).map(function(v){ return v.classList.contains('is-same'); })} : null;
  }
  async function openCompare(){
    [].slice.call(document.querySelectorAll('.sc-strip button')).filter(function(b){ return b.textContent.trim() === 'Compare'; })[0].click();
    await T.until(function(){ return !!document.querySelector('.compare-dlg .sc-compare-table'); }, 'the Compare window', 80, 100);
    await T.sleep(400);
  }
  try {
    await T.appReady();
    await T.until(function(){ return document.querySelectorAll('.sc-tab').length === 3 && !!firstWeek('post'); }, 'the three scenarios and the grid', 200, 100);
    await T.sleep(1500);

    // H0 -- the premise: the typed dates are inside the breaks, and the grid works from the week after each.
    var grid = {wrTyped: val('start-writersRoom'), postTyped: val('start-post'), wr: firstWeek('writersRoom'), post: firstWeek('post')};
    add('H0', 'the fixture: Writer\'s Rm typed 12/21/26 and Post 12/20/27, inside the breaks; the grid starts them 1/4/27 and 1/3/28',
      grid.wrTyped === '2026-12-21' && grid.postTyped === '2027-12-20' && grid.wr === '2027-01-04' && grid.post === '2028-01-03',
      grid, 'typed 2026-12-21 / 2027-12-20, grid 2027-01-04 / 2028-01-03');

    await openCompare();
    var cols = heads(), post = compareRow('Post'), wr = compareRow('Writer\'s Rm'), weeks = compareRow('Weeks, first phase to last'), pick = compareRow('Pick-Ups');
    add('H1', 'Compare dates Post from its first working week: 1/3/28 - 8/11/28 in both identical calendars, with no chip',
      cols[0] === 'Typed in the break' && cols[1] === 'After the break' && post && post[0].text === '1/3/28 – 8/11/28'
        && post[1].text === post[0].text && !post[1].chip,
      {cols: cols, post: post}, 'Post "1/3/28 – 8/11/28" twice, no chip');
    add('H2', 'Writer\'s Rm too: its row reads the same in both, from 1/4/27, with no chip',
      wr && /^1\/4\/27 – /.test(wr[0].text) && wr[1].text === wr[0].text && !wr[1].chip, wr, 'from 1/4/27, equal, no chip');
    add('H3', 'a phase\'s OWN hiatus over its start counts too: "Own break" reads 1/17/28 - 8/25/28, "Pushed 2 wks"',
      post && post[2] && post[2].text === '1/17/28 – 8/25/28' && post[2].chip === 'Pushed 2 wks', post && post[2], '1/17/28 – 8/25/28, Pushed 2 wks');
    add('H4', '"Weeks, first phase to last" leaves the break out: the same in both identical calendars',
      weeks && weeks[0].text === weeks[1].text && !weeks[1].chip, weeks, 'equal, no chip');
    add('H5', 'a start outside any hiatus is untouched: Pick-Ups reads its typed 3/6/28 - 3/10/28 in every scenario',
      pick && pick.every(function(c){ return c.text === '3/6/28 – 3/10/28' && !c.chip; }), pick, '3/6/28 – 3/10/28 x3');
    [].slice.call(document.querySelectorAll('.compare-dlg button')).filter(function(b){ return b.textContent.trim() === 'Done'; })[0].click();
    await T.sleep(600);

    // H6 -- the key facts band reads the same token: its Writer's Rm tile opens 1/4/27, and since the other tabs open
    // the room on 1/4/27 too, it is drawn as a fact every scenario shares (dimmed).
    await T.until(function(){ return !!wrTile(); }, 'the band', 80, 100);
    await T.sleep(800);
    var tile = wrTile();
    add('H6', 'the key facts band\'s Writer\'s Rm tile opens 1/4/27, dimmed as shared by every scenario',
      tile && /^1\/4\/27/.test(tile.text) && tile.same[0] === true, tile, '"1/4/27 · …", first value dimmed');

    // H7 -- reading never writes: the typed dates are still the ones in the file.
    add('H7', 'Compare and the band never rewrite the typed starts', val('start-writersRoom') === '2026-12-21' && val('start-post') === '2027-12-20',
      {wr: val('start-writersRoom'), post: val('start-post')}, '2026-12-21 / 2027-12-20');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'comparehiatus', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
