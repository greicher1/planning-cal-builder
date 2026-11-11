// fillspace -- the Fill Space switch left of Side Boxes (owner, 9 Nov 2026: "a toggle to the left of side boxes button
// that turns on or off expand rows to fill empty space", then: "when i say fill space i mean collumsn that fill only a
// portion of the phase such that only some weeks are wider than others. The algorithm should always fill collumns as
// wide as they have space for if they are all uniform in width"). Frozen edit LR6, FILL-INTENT-PLAN.md §10.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=layout-r13 ./run.sh fillspace 300
//
//   S1  on a stamped calendar the switch shows in the Waterfall, on, labelled Fill Space; Post 2031 and Writers change
//       width partway through the year
//   S2  off: every phase has ONE width per year, the widest free for its whole run there (Post 2031 two, Writers one);
//       every cell is still there; the file says fillSpaceOff: true; no new field id (the switch is a button, never an
//       input the save sweep collects)
//   S3  off, a phase's own double-click fill wish still fills week by week -- only that phase varies
//   S4  undo the wish, then undo the switch: the original widths, and the file carries no key
//   S5  the Month view hides it; New turns it back on
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. Red on the build before it at S1 (no switch).
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  function C(id, title, pass, observed, expected) { out.cases.push({ id: id, title: title, pass: !!pass, observed: observed, expected: expected }); }
  var J = function (x) { return JSON.stringify(x); };
  function $(id) { return document.getElementById(id); }
  async function settle() {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, 'the grid', 200, 100);
    var last = '', stable = 0;
    await T.until(function () {
      var s = [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join('');
      stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4;
    }, 'a settled grid', 200, 100);
  }
  var cells = function () { return [].slice.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell')); };
  // Each phase's widths in each year: {'post 2031': '2/3', ...}; a single value is one even width.
  var widths = function () {
    var o = {};
    cells().forEach(function (td) { var k = td.dataset.pkey + ' ' + (td.dataset.week || '').slice(0, 4); (o[k] = o[k] || {})[td.colSpan || 1] = 1; });
    var r = {}; Object.keys(o).sort().forEach(function (k) { r[k] = Object.keys(o[k]).sort().join('/'); }); return r;
  };
  var varying = function (w) { return Object.keys(w).filter(function (k) { return w[k].indexOf('/') >= 0; }); };
  function btn() { return $('tb-fill-space-btn'); }
  function shown() { var b = btn(); return !!b && getComputedStyle(b).display !== 'none'; }
  var written = [];
  var saveHandle = { name: 'fillspace.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'fillspace.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(200);
    var w = written[written.length - 1];
    return JSON.parse(typeof w === 'string' ? w : w.text);
  }
  try {
    try { localStorage.clear(); } catch (e) {}
    await settle();
    await T.until(function () { return shown(); }, 'the Fill Space switch', 60, 100);
    var n0 = cells().length, W0 = widths();
    var s0 = await save();
    C('S1', 'stamped, Waterfall: the switch shows, on, labelled Fill Gaps (Fill Space until 10 Nov 2026); Post 2031 and Writers change width partway through the year',
      shown() && btn().getAttribute('aria-pressed') === 'true' && /Fill Gaps/.test(btn().textContent) && W0['post 2031'] === '2/3' && W0['writersRoom 2031'] === '1/2' && !('fillSpaceOff' in s0),
      J({ shown: shown(), pressed: btn() && btn().getAttribute('aria-pressed'), varying: varying(W0), key: s0.fillSpaceOff }));
    btn().click(); await settle();
    var s1 = await save(), W1 = widths();
    var ids0 = Object.keys(s0.fields.byId).sort(), ids1 = Object.keys(s1.fields.byId).sort();
    C('S2', 'off: every phase ONE width per year, the widest free for its whole run (Post 2031 two, Writers one); every cell still there; fillSpaceOff: true; no new field id',
      btn().getAttribute('aria-pressed') === 'false' && !varying(W1).length && W1['post 2031'] === '2' && W1['writersRoom 2031'] === '1' && cells().length === n0 && s1.fillSpaceOff === true && J(ids0) === J(ids1),
      J({ pressed: btn().getAttribute('aria-pressed'), widths: W1, cells: cells().length + ' of ' + n0, key: s1.fillSpaceOff, newIds: ids1.filter(function (k) { return ids0.indexOf(k) < 0; }) }));
    // S3: Writers' first week (one wide, empty columns beside it): double-click, and only Writers varies.
    var pick = cells().filter(function (td) { return td.dataset.pkey === 'writersRoom' && (td.colSpan || 1) === 1 && (+td.dataset.rmax - +td.dataset.own) > 0; })[0];
    if (pick) { pick.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); await settle(); }
    var W3 = widths();
    C('S3', 'off, a phase’s own double-click fill wish still fills week by week: Writers alone varies',
      !!pick && J(varying(W3)) === J(['writersRoom 2031']), J({ varying: varying(W3), writers: W3['writersRoom 2031'] }));
    $('undo-btn').click(); await settle();
    var afterUndo1 = varying(widths());
    $('undo-btn').click(); await settle();
    var s4 = await save();
    C('S4', 'undo the wish (even again), then undo the switch: the original widths, on, and no key in the file',
      !afterUndo1.length && J(widths()) === J(W0) && btn().getAttribute('aria-pressed') === 'true' && !('fillSpaceOff' in s4),
      J({ afterWishUndo: afterUndo1, same: J(widths()) === J(W0), pressed: btn().getAttribute('aria-pressed'), key: s4.fillSpaceOff }));
    btn().click(); await settle();
    $('view-month-btn').click(); await T.sleep(800);
    var inMonth = shown();
    $('view-sheet-btn').click(); await settle();
    $('new-file-btn').click();
    for (var i = 0; i < 30; i++) { await T.sleep(100); if (T.clickModalButton('Start new')) break; }
    await T.sleep(900);
    var s5 = await save();
    C('S5', 'the Month view hides it; New turns Fill Space back on', !inMonth && !('fillSpaceOff' in s5) && btn().getAttribute('aria-pressed') === 'true',
      J({ month: inMonth, key: s5.fillSpaceOff, pressed: btn().getAttribute('aria-pressed') }));
    out.errors = (window.__ERR || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.message || String(e));
    C('EX', 'the leg ran to the end', false, out.EX);
  }
  T.done(out);
})(); });
