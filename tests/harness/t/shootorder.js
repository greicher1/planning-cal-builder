// shootorder -- Episodes mode's SHOOTING ORDER (ruling 9), the grey episode text inside Production's
// pill (ruling 8), and the two month-view Preferences (ruling 10) -- on a REAL saved calendar.
//
// ⚠️ Driven by ?state=shootorder (tests/fixtures/shootorder.sptcal). Run against the BUILD:
//     HARNESS_PAGE=/dist/index.html HARNESS_STATE=shootorder ./run.sh shootorder 120
//
// The fixture was minted in the app: the reference calendar in Episodes mode (10 x 8 days from
// 6/29/26), episode 205 dragged to the front of the shooting order and 201 to fifth. Its
// episodeShootOrder is [ep5, ep2, ep3, ep4, ep1, ep6 .. ep10], and it carries NO preference keys --
// the preferences never enter a saved file.
//
// ⛔ THE PROPERTIES THAT MATTER:
//   labelsNotDates  -- the shooting order moves which days each episode occupies, NEVER Production's
//                      length: the wrap and the whole waterfall grid are identical in any order.
//   prefsNotData    -- flipping a preference changes the pills, pushes NO undo step, and is not in
//                      fields.byId. Checked FIRST, while the undo stack is still empty, so "no undo
//                      step" is a measurement (the Undo button stays disabled) rather than a guess.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  function order() {
    return [].map.call(document.querySelectorAll('#episode-rows .episode-row'), function (r) {
      return r.querySelector('.ep-name').value.replace(/^Episode /, '');
    });
  }
  function meta() { return ((document.getElementById('meta-production') || {}).textContent || '').trim(); }
  // Production's pills in the month on screen: [label, grey text] per pill.
  function pills() {
    return [].map.call(document.querySelectorAll('#table-wrap .mv-pill[data-ph="production"]'), function (p) {
      var sp = p.querySelector('.mv-pill-block');
      return [(p.firstChild && p.firstChild.nodeType === 3 ? p.firstChild.textContent : p.textContent).trim(),
              sp ? sp.textContent : ''];
    });
  }
  function shown(id) { var el = document.getElementById(id); return !!el && el.getClientRects().length > 0; }
  function tab(name) { var b = document.querySelector('.side-tab-btn[data-tab="' + name + '"]'); if (b) b.click(); }
  async function settle() {
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
  }
  async function toMonth(label) {
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month grid', 200, 100);
    for (var g = 0; g < 24; g++) {
      if (new RegExp(label).test((document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || '')) break;
      var nx = document.getElementById('mv-next'); if (!nx || nx.disabled) break;
      nx.click(); await T.sleep(120);
    }
    await settle();
  }
  try {
    await T.appReady();
    await T.until(function () { return document.querySelectorAll('#episode-rows .episode-row').length === 10; },
                  'the restored episode list', 200, 100);
    await settle();

    // ---- 1. restored in its saved shooting order ------------------------------------------------
    out.mode = document.getElementById('show-mode').value;
    out.restoredOrder = order();
    out.restoredMeta = meta();
    out.gridSig = JSON.stringify(T.gridSignature());

    // ---- 1b. a preference pushes NO undo step -------------------------------------------------
    // ⚠️ HERE, before anything else happens: switching to the month view is itself an undo step
    // (viewMode is calendar state), so measured any later the Undo button is already enabled and
    // "still enabled afterwards" would prove nothing. The first cut of this leg did exactly that.
    out.undoDisabledBefore = document.getElementById('undo-btn').disabled;
    document.getElementById('pref-mv-episodes').click();
    await T.sleep(300);
    out.undoDisabledAfterPref = document.getElementById('undo-btn').disabled;
    document.getElementById('pref-mv-episodes').click();
    await T.sleep(300);
    out.undoDisabledAfterBoth = document.getElementById('undo-btn').disabled;

    // ---- 2. ruling 8: Production's pill + the episodes as grey text, in shooting order ----------
    await toMonth('July 2026');
    out.julyPills = pills();
    out.episodePills = [].filter.call(document.querySelectorAll('#table-wrap .mv-pill'),
      function (p) { return /^Episode\b/.test(p.textContent.trim()); }).length;

    // ---- 3. ruling 10: preferences are NOT calendar data ----------------------------------------
    tab('settings'); await T.sleep(200);
    out.rowsInMonth = { onecol: shown('one-col-btn'), blocks: shown('pref-mv-blocks'), eps: shown('pref-mv-episodes') };
    document.getElementById('pref-mv-episodes').click();
    await settle();
    out.pillsEpsOff = pills();
    var sig = T.formSignature();
    out.prefIdsInFields = Object.keys(sig).filter(function (k) { return /^pref-/.test(k); });
    document.getElementById('pref-mv-episodes').click();
    await settle();
    out.pillsEpsBackOn = pills();
    document.getElementById('view-sheet-btn').click();
    await settle();
    out.rowsInSheet = { onecol: shown('one-col-btn'), blocks: shown('pref-mv-blocks'), eps: shown('pref-mv-episodes') };

    // ---- 4. ruling 9: a drag re-sequences the shoot; no date moves; one undo step ---------------
    // ⚠️ The Phases tab must be VISIBLE: a hidden panel measures 0x0, so every drop would read as
    // "before" (found while minting the fixture).
    tab('phases'); await T.sleep(200);
    function rowOf(n) { return [].find.call(document.querySelectorAll('#episode-rows .episode-row'),
      function (r) { return r.querySelector('.ep-name').value === 'Episode ' + n; }); }
    function drag(n, target, side) {
      var g = rowOf(n).querySelector('.ep-grip'), t = rowOf(target), b = t.getBoundingClientRect();
      var y = side === 'before' ? b.top + 2 : b.bottom - 2, dt = new DataTransfer();
      g.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      t.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y }));
      t.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y }));
      g.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
    }
    drag('210', '205', 'before');
    await settle();
    out.afterBefore = order();
    drag('203', '201', 'after');
    await settle();
    out.afterAfter = order();
    out.dragMetaSame = meta() === out.restoredMeta;
    out.dragGridSame = JSON.stringify(T.gridSignature()) === out.gridSig;
    document.getElementById('undo-btn').click();
    await settle();
    out.afterOneUndo = order();
    out.oneUndoExact = JSON.stringify(out.afterOneUndo) === JSON.stringify(out.afterBefore);

    out.errors = (T.appHealth().errors || []).slice(0, 10);
  } catch (e) { out.EX = e.message; out.errors = (window.__ERR || []).slice(0, 10); }
  T.done(out);
})(); });
