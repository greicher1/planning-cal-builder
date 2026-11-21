// headingsfollow -- typed column headings follow their phase when the APP rearranges a year's columns (audit AUD2-077,
// FIX-PLAN batch 3 item 3.8, 14 Nov 2026; the finding's default: "typed headings follow their phase").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=keepcols-heavy ./run.sh headingsfollow 600    (A: Update layout)
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=swap-holds ./run.sh headingsfollow 600        (B: Reset Columns)
//
// A heading is typed over EVERY phase column, each naming the phase with the most weeks in it ("<phase key> col"), put
// into the file through Save As and Load (lib.js reloadWith). Then the app itself reshapes the columns:
//   A  keepcols-heavy, its layout stamp, memories and hand moves taken out (an older file): the strip's Update layout.
//      2026 goes from five columns to four and 2027 from seven to five, so three phases now share a column under
//      another phase's heading.
//   B  swap-holds (Prod Prep swapped left of Pre-Prep in 2031): Reset Columns, which takes the swap away.
// Then:
//   H1  every heading still drawn sits over its phase: the phase it names has cells in that column, and that column is
//       the one where the phase has the most (screen; Excel and the PDF read the same store by the same key)
//   H2  nothing else lost: every typed heading is either drawn or named in the one-line notice, which shows only when
//       one had to go (A: the three merged ones; B: none, a swap undone is a reordering)
//   H3  one Undo puts the old layout and every heading back, and the notice goes
//   H4  the saved file holds only headings that are drawn (no heading left on a position that no longer exists)
//   E0  no engine errors
//
// Red on the build before the fix at H1 and H2 (A: custom1's heading over custom2, three headings neither drawn nor
// mentioned; B: Prod Prep's heading over Pre-Prep).
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. No dollar sign in this file (srv.js splices legs in with
// String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  function C(id, title, pass, observed, expected) { out.cases.push({ id: id, title: title, pass: !!pass, observed: observed, expected: expected }); }
  var J = function (x) { return JSON.stringify(x); };
  function byId(id) { return document.getElementById(id); }
  function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  var q = new URLSearchParams(location.search), FX = q.get('state') || '';
  var MODE = FX === 'swap-holds' ? 'B' : 'A', base = null;
  out.mode = MODE;
  var sig = function () { return [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join(''); };
  async function settle() {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, 'the grid', 200, 100);
    var last = '', stable = 0;
    await T.until(function () { var s = sig(); stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4; }, 'a settled grid', 200, 100);
  }
  // Per column key (y2026:s3): phase key -> how many of its week cells sit there.
  function holders() {
    var m = {};
    document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey][data-week]').forEach(function (td) {
      if (td.dataset.own === undefined) return;
      var k = 'y' + td.dataset.week.slice(0, 4) + ':s' + td.dataset.own;
      var o = m[k] = m[k] || {};
      o[td.dataset.pkey] = (o[td.dataset.pkey] || 0) + 1;
    });
    return m;
  }
  function lead(o) { var best = null, n = 0; Object.keys(o || {}).sort().forEach(function (k) { if (o[k] > n) { best = k; n = o[k]; } }); return best; }
  // Where a phase has the most cells in a year: its column key.
  function homeOf(h, year, phase) {
    var best = null, n = 0;
    Object.keys(h).sort().forEach(function (k) { if (k.indexOf('y' + year + ':') === 0 && (h[k][phase] || 0) > n) { best = k; n = h[k][phase]; } });
    return best;
  }
  // The typed headings drawn: column key -> text.
  function drawn() {
    var o = {};
    document.querySelectorAll('#table-wrap th.hdrrow-cell[data-hcol]').forEach(function (th) { if (/:s\d+$/.test(th.dataset.hcol)) o[th.dataset.hcol] = norm(th.textContent); });
    return o;
  }
  function notice() { var el = byId('heading-notice'); return el && !el.hidden ? norm(el.textContent) : ''; }
  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady(); await settle();
    if (MODE === 'A') {
      await T.reloadWith(function (s) { delete s.colReuse; delete s.colKeep; delete s.colFollow; base = JSON.parse(J(s)); }, 'headingsfollow-0');
      await settle();
    }
    var H0 = holders(), typed = {};
    Object.keys(H0).forEach(function (k) { typed[k] = lead(H0[k]) + ' col'; });
    await T.reloadWith(function (s) { s.headerRowLabels = Object.assign({}, s.headerRowLabels || {}, typed); }, 'headingsfollow-1');
    await settle();
    var d0 = drawn(), sig0 = sig();
    out.before = { holders: H0, drawn: d0 };

    var go = MODE === 'A' ? document.querySelector('#layout-notice .ln-go') : byId('tb-cols-reset-btn');
    if (!go) throw new Error('no ' + (MODE === 'A' ? 'Update layout button (the strip is not up)' : 'Reset Columns button'));
    await T.sleep(700);
    go.click(); await T.sleep(500); await settle();
    var H1 = holders(), d1 = drawn(), say = notice();
    out.after = { holders: H1, drawn: d1, notice: say };

    var wrong = [];
    Object.keys(d1).forEach(function (k) {
      var phase = d1[k].replace(/ col$/, ''), year = k.slice(1, 5);
      if (!(H1[k] && H1[k][phase]) || homeOf(H1, year, phase) !== k) wrong.push(k + ': "' + d1[k] + '" over ' + J(H1[k] || {}));
    });
    C('H1', 'every heading still drawn sits over its own phase, in the column where that phase has the most weeks', !wrong.length && Object.keys(d1).length > 0,
      J({ wrong: wrong, drawn: Object.keys(d1).length }));

    // By count, not by text: one phase can head a column in two years ("custom1 col" in 2026 and 2027).
    var left = {}; Object.keys(d1).forEach(function (k) { left[d1[k]] = (left[d1[k]] || 0) + 1; });
    var gone = [];
    Object.keys(typed).sort().forEach(function (k) { var t = typed[k]; if (left[t]) left[t]--; else gone.push(t); });
    gone.sort();
    var unnamed = gone.filter(function (t) { return say.indexOf('\u201c' + t + '\u201d') === -1; });
    C('H2', MODE === 'A' ? 'nothing lost silently: each heading not drawn now is named in the one-line notice (three merged columns)'
      : 'nothing lost: every heading is still drawn (a swap undone only reorders), and no notice',
      MODE === 'A' ? (gone.length === 3 && !unnamed.length && /Undo brings them back/.test(say))
        : (!gone.length && !say),
      J({ gone: gone, unnamed: unnamed, notice: say }));

    if (MODE === 'A') {
      // H6 (repair, 14 Nov 2026): a shareable copy exported while the strip is up carries it hidden and EMPTY: its text
      // names headings the sender removed. Red before the repair (hidden, but the names travelled in .ln-text).
      await T.openSettings('prefs');
      await T.until(function () { return !!byId('share-copy-btn'); }, 'the Export-App button', 80, 100);
      await T.sleep(900);
      var cap = T.captureDownload();
      byId('share-copy-btn').click();
      await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
      var html = await cap.stop().text();
      var hm = /<div id="heading-notice"([^>]*)>([\s\S]*?)<\/div>/.exec(html);
      var inner = hm ? (/<span class="ln-text">([\s\S]*?)<\/span>/.exec(hm[2]) || [])[1] : null;
      C('H6', 'a shareable copy exported while the strip is up carries it hidden, with no heading names in it',
        !!say && !!hm && /\shidden(\s|>|=|$)/.test(hm[1]) && inner !== undefined && inner !== null && !norm(inner),
        J({ stripUp: !!say, tag: hm ? hm[1] : null, text: inner }));
      await T.closeSettings();
      await T.sleep(400);
    }

    byId('undo-btn').click(); await T.sleep(600); await settle();
    var d2 = drawn();
    C('H3', 'one Undo puts the old layout and every heading back, and the notice goes',
      sig() === sig0 && J(d2) === J(d0) && !notice(), J({ layout: sig() === sig0, headings: J(d2) === J(d0) ? 'same' : d2, notice: notice() }));

    byId('redo-btn').click(); await T.sleep(600); await settle();
    var snap = await T.reloadWith(function () {}, 'headingsfollow-2');
    await settle();
    var labels = snap.headerRowLabels || {}, stale = Object.keys(labels).filter(function (k) { return /:s\d+$/.test(k) && drawn()[k] !== labels[k]; });
    C('H4', 'the saved file holds only the headings that are drawn, each on its own column', !stale.length && J(drawn()) === J(d1),
      J({ stale: stale, sameAsAfter: J(drawn()) === J(d1) }));

    if (MODE === 'A') {
      // H5a / H5b (review repair, 14 Nov 2026; the reviewer's case). Update layout puts custom1 (21 weeks), custom3 (12)
      // and custom4 (15) into one 2027 column (y2027:s2). Before the repair a collision's winner was picked by which
      // phase leads the new column, so custom1's EMPTY position won and a typed heading was removed with nothing typed
      // competing for its column (red: H5a lost "custom3 col", H5b lost both). Now only typed positions compete:
      //   H5a  one heading, over custom3 (y2027:s5) alone: it moves over its phase, nothing removed, no strip
      //   H5b  two, over custom3 and custom4 (y2027:s6) alone: the two typed ones DO collide, so exactly one goes and is
      //        named; custom4 stays (more weeks in the column), "custom3 col" is named in the strip
      var runs = [
        { id: 'H5a', keys: ['y2027:s5'], keep: ['y2027:s5'], gone: [] },
        { id: 'H5b', keys: ['y2027:s5', 'y2027:s6'], keep: ['y2027:s6'], gone: ['y2027:s5'] }
      ];
      for (var ri = 0; ri < runs.length; ri++) {
        var R = runs[ri], set = {};
        R.keys.forEach(function (k) { set[k] = typed[k]; });
        await T.reloadWith(function (s) {
          Object.keys(s).forEach(function (k) { delete s[k]; });
          Object.assign(s, JSON.parse(J(base)), { headerRowLabels: set });
        }, 'headingsfollow-3' + ri);
        await settle();
        var d5a = drawn(), okBefore = R.keys.every(function (k) { return d5a[k] === set[k]; });
        var go5 = document.querySelector('#layout-notice .ln-go');
        if (!go5) throw new Error(R.id + ': no Update layout button');
        await T.sleep(700);
        go5.click(); await T.sleep(500); await settle();
        var H5 = holders(), d5 = drawn(), say5 = notice(), wrong5 = [], lost5 = [], kept5 = [];
        R.keys.forEach(function (k) {
          var t = set[k], at = Object.keys(d5).filter(function (kk) { return d5[kk] === t; });
          if (!at.length) { lost5.push(k); return; }
          kept5.push(k);
          var phase = t.replace(/ col$/, '');
          if (!(H5[at[0]] && H5[at[0]][phase]) || homeOf(H5, '2027', phase) !== at[0]) wrong5.push(at[0] + ': "' + t + '"');
        });
        var named = R.gone.every(function (k) { return say5.indexOf('“' + set[k] + '”') !== -1; });
        C(R.id, R.gone.length
            ? 'headings typed over custom3 and custom4 alone, which Update layout puts in one column: one stays over its phase, the other is named in the strip'
            : 'one heading typed over custom3 alone: after Update layout it is still drawn over its phase, and no strip',
          okBefore && J(kept5) === J(R.keep) && J(lost5) === J(R.gone) && !wrong5.length && (R.gone.length ? named : !say5),
          J({ typed: set, h2027: Object.keys(H5).filter(function (k) { return k.indexOf('y2027') === 0; }).map(function (k) { return k + J(H5[k]); }),
            kept: kept5, lost: lost5, wrong: wrong5, notice: say5 }));
      }
    }

    out.errors = (T.appHealth().errors || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.stack || e.message || String(e));
    C('EX', 'the leg ran to the end', false, String(out.EX).slice(0, 600));
  }
  T.done(out);
})(); });
