// pilllabel -- Production's month bars labelled by Production Week, Episode or Block
// (MONTH-PILL-LABEL-PLAN.md, owner 15 Oct 2026). STEP 2's half: the ENGINE, driven from loaded files.
// Rebuilt on half-days (05f7f89, "Stacked bars, always"): Production is one bar per episode (per block on a
// Blocks calendar), and the label changes each bar's TEXT (ruling Q6) -- except Production Week, which the
// owner then ruled draws ONE BAR PER WEEK (picker, 15 Oct 2026). There is no control yet (step 3), so every
// label arrives the way a saved calendar delivers it: the fixture's own JSON with `mvProdLabel` set (or
// removed), opened through the real Load path (T.openViaFakePicker).
//
//   HARNESS_STATE=<fixture>   the calendar under test; the leg re-opens THAT file's text per label.
//
// "base" is the file with NO key: not chosen, which follows Schedule by (ruling Q7) and is exactly what
// half-days drew, so it is what gates 10 and 13 hold. Every other open is judged against it.
//
//   W0  the label Schedule by already gives ('episode' on an Episodes calendar, 'block' on a Blocks one)
//       draws the month view BYTE-IDENTICAL to no key
//   W1  'block' on an Episodes calendar is byte-identical to no key too: it follows Schedule by (Q11)
//   W2  a file with no key, opened right after a 'week' file, is byte-identical to base (restore
//       unconditionally -- never the previous file's label)
//   W3  an unknown value ('bogus') opens as no key
//   WK  labelled by Week: per week row the bars are exactly the runs of days base covers (nothing stacked,
//       no day added or lost), each "Production Week K", with ruling 8's grey text worked out from base's
//       bars on those days ("Ep. 202, 203"; "Block 1 · Ep. 201, 202 / Block 2 · Ep. 203–205"). Ruling 7:
//       a one-day bar has no grey text
//   G   labelled by Episode on a Blocks calendar: the SAME bars as base (month, row, columns, lane, order)
//   T   ... each with the plan's text, worked out from base's own two strings for that bar: "Ep. 201, 202"
//       with grey "Production Week K · Block 1". A bar with no unit reads as in base
//   X1  Q9: a "Show" switch edits the grey text ONLY. With no key, the unit's own switch off ("Show
//       Episodes" on an Episodes calendar, "Show Blocks" on a Blocks one) changes NOTHING -- the bar names
//       that item -- where half-days joined the bars back up
//   X2  in Week mode each switch drops only its item from each list in the grey text, and moves no bar
//   K0  the key travels: Save writes the opened file back with mvProdLabel unchanged
//   K1  not chosen stays absent: Save of a file with no key writes no key
//
// STEP 3 (16 Oct 2026) adds the real control, Preferences ▸ "Label Production by", driven by clicking its
// segments: C (what it shows on open, and §5.2's Show rows), B (Block disabled on an Episodes calendar, and
// Q11's guard), S (the Show switches: no undo step, never in the file) and M (each label picked: the same
// month view as the file with that key, dirty, ONE undo step, Redo, Save, Load round trip, and back to the
// default clearing the key). Their own comment block, below K1, has the detail.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  var st = (/[?&]state=([\w.-]+)/.exec(location.search) || [])[1];
  out.state = st;
  function settle(label) {
    var last = -1, n0 = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      n0 = (n === last && n > 0) ? n0 + 1 : 0; last = n; return n0 >= 5;
    }, label || 'settle', 200, 100);
  }
  // Answer the unsaved-work guard if a re-open raises it: it is the app's own dialog.
  var guard = setInterval(function () {
    var b = [].find.call(document.querySelectorAll('button'), function (x) {
      return (x.textContent || '').trim() === 'Load' && x.offsetParent !== null;
    });
    if (b) b.click();
  }, 50);
  var seq = 0;
  async function openText(text, writes) {
    seq++;
    await T.openViaFakePicker(null, 'pilllabel-' + seq + '.sptcal', { text: text, writes: writes });
    await T.sleep(300);
    await settle('open ' + seq);
    if (!document.getElementById('view-month-btn').classList.contains('active')) {
      document.getElementById('view-month-btn').click();
      await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'month grid', 200, 100);
      await settle('month ' + seq);
    }
  }
  // Every month, first to last: its HTML, and its Production bars.
  async function months() {
    var g = 0;
    while (g++ < 80) { var p = document.getElementById('mv-prev'); if (!p || p.disabled) break; p.click(); await settle('prev'); }
    var res = []; g = 0;
    while (g++ < 80) {
      var wrap = document.getElementById('table-wrap');
      var title = (wrap.querySelector('.mv-title, .mv-month-name, h2, h3') || {}).textContent || ('m' + res.length);
      var pills = [].map.call(wrap.querySelectorAll('.mv-pill[data-ph="production"]'), function (el) {
        var sty = el.getAttribute('style') || '';
        var m = /grid-column:\s*(\d+)\s*\/\s*(\d+)/.exec(sty);
        var r = /grid-row:\s*(\d+)/.exec(sty);
        var tagEl = el.querySelector('.mv-pill-block'), text = '';
        el.childNodes.forEach(function (n) { if (n !== tagEl) text += n.textContent; });
        var week = el.closest('.mv-week');
        var weekIdx = week ? [].indexOf.call(week.parentNode.children, week) : -1;
        // `half`: a switch day's inset (HALF-SQUARE-BARS-PLAN), whose one-day bar reads the short "Ep. N".
        return { week: weekIdx, from: m ? +m[1] - 1 : -1, to: m ? +m[2] - 2 : -1, lane: r ? +r[1] : -1,
                 text: text, tag: tagEl ? tagEl.textContent : '', half: /margin-(left|right):\s*calc\(/.test(sty) };
      });
      res.push({ title: title, html: wrap.innerHTML, pills: pills });
      var nx = document.getElementById('mv-next');
      if (!nx || nx.disabled) break;
      nx.click(); await settle('next');
    }
    return res;
  }
  function sameHtml(a, b) {
    if (a.length !== b.length) return 'months ' + a.length + ' vs ' + b.length;
    for (var i = 0; i < a.length; i++) if (a[i].html !== b[i].html) return 'month ' + i + ' (' + a[i].title + ') differs';
    return true;
  }
  function geo(p) { return [p.week, p.from, p.to, p.lane].join(':'); }
  // G: the same bars, in the same order, month by month.
  function sameBars(res, base) {
    if (res.length !== base.length) return 'months ' + res.length + ' vs ' + base.length;
    for (var i = 0; i < res.length; i++) {
      var a = res[i].pills.map(geo).join(' '), b = base[i].pills.map(geo).join(' ');
      if (a !== b) return res[i].title + ': ' + a + '  vs base  ' + b;
    }
    return true;
  }
  async function pref(id) { document.getElementById(id).click(); await settle('pref ' + id); }
  try {
    await T.appReady();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr'); }, 'restored', 200, 100);
    await settle('first load');
    var text = await (await fetch('/tests/fixtures/' + st + '.sptcal')).text();
    function withKey(v) { var o = JSON.parse(text); if (v === undefined) delete o.mvProdLabel; else o.mvProdLabel = v; return JSON.stringify(o); }
    out.fixtureHasKey = 'mvProdLabel' in JSON.parse(text);

    await openText(withKey(undefined));
    out.scheduleBy = (document.getElementById('show-mode') || {}).value || '(none)';
    var blocksCal = out.scheduleBy === 'blocks';
    var base = await months();
    out.months = base.length;
    out.bars = base.reduce(function (n, m) { return n + m.pills.length; }, 0);
    out.untagged = base.reduce(function (n, m) { return n + m.pills.filter(function (p) { return /^Production Week \d+$/.test(p.text); }).length; }, 0);
    out.oneDay = base.reduce(function (n, m) { return n + m.pills.filter(function (p) { return p.from === p.to; }).length; }, 0);
    out.baseSample = base.reduce(function (a, m) { return a.concat(m.pills.map(function (p) { return p.text + ' | ' + p.tag; })); }, []).slice(0, 8);

    // ---- X1, first: with no key, the unit's own switch changes nothing (ruling 1) ----
    var ownSwitch = blocksCal ? 'pref-mv-blocks' : 'pref-mv-episodes';
    await pref(ownSwitch);
    out.X1 = sameHtml(await months(), base);
    await pref(ownSwitch);
    out.X1back = sameHtml(await months(), base);

    await openText(withKey(blocksCal ? 'block' : 'episode'));
    out.W0 = sameHtml(await months(), base);
    if (!blocksCal) { await openText(withKey('block')); out.W1 = sameHtml(await months(), base); }

    await openText(withKey('week'));
    var wk = await months();
    await openText(withKey(undefined));
    out.W2 = sameHtml(await months(), base);
    await openText(withKey('bogus'));
    out.W3 = sameHtml(await months(), base);
    var ep = blocksCal ? (await openText(withKey('episode')), await months()) : null;

    // ---- What base tells us ----
    // Each split bar's unit name, the week K of each row (from a multi-day bar's grey text, or an untagged
    // bar's own text), and on a Blocks calendar each block's episodes. Base's bars come out in the order
    // productionSplitRuns() hands them over: the units in SHOOTING order, then any untagged days.
    var rowK = {}, blockEps = {};
    base.forEach(function (mo, mi) {
      mo.pills.forEach(function (p) {
        var m = /^Production Week (\d+)/.exec(p.tag) || /^Production Week (\d+)$/.exec(p.text);
        if (m) rowK[mi + ':' + p.week] = rowK[mi + ':' + p.week] || m[1];
        var e = blocksCal && / · (Ep\. .+)$/.exec(p.tag);
        if (e) blockEps[p.text] = e[1];
      });
    });
    var Kof = function (mi, wkRow) { return rowK[mi + ':' + wkRow] ? 'Production Week ' + rowK[mi + ':' + wkRow] : null; };
    // episodeListLabel(), restated: runs of THREE or more consecutive numbers fold to "a–b".
    function epList(names) {
      var out = [];
      for (var i = 0; i < names.length;) {
        var j = i;
        while (j + 1 < names.length && /^\d+$/.test(names[j]) && /^\d+$/.test(names[j + 1]) && +names[j + 1] === +names[j] + 1) j++;
        if (j - i >= 2) out.push(names[i] + '–' + names[j]); else for (var k = i; k <= j; k++) out.push(names[k]);
        i = j + 1;
      }
      return out.join(', ');
    }

    // ---- WK: labelled by Week, ONE BAR PER WEEK (owner's picker, 15 Oct 2026) ----
    // Per week row, the bars are exactly the runs of days base covers (no day added or lost, no stacking),
    // each reads "Production Week K", and its grey text is ruling 8's: the episodes (Episodes calendar) or
    // the blocks each with its episodes (Blocks calendar) of base's bars on those days, in shooting order.
    function judgeWeek(res) {
      var r = { bars: 0, notRuns: [], wrong: [], unknownWeek: 0, oneDayTagged: [] };
      if (res.length !== base.length) { r.notRuns.push('months ' + res.length + ' vs ' + base.length); return r; }
      res.forEach(function (mo, mi) {
        var rows = {};
        base[mi].pills.forEach(function (b) { (rows[b.week] = rows[b.week] || { base: [], wk: [] }).base.push(b); });
        mo.pills.forEach(function (p) { (rows[p.week] = rows[p.week] || { base: [], wk: [] }).wk.push(p); });
        Object.keys(rows).forEach(function (w) {
          var R = rows[w], cov = [];
          R.base.forEach(function (b) { for (var c = b.from; c <= b.to; c++) cov[c] = true; });
          var runs = [], run = null;
          for (var c = 0; c < 7; c++) {
            if (cov[c]) { if (!run) run = [c, c]; else run[1] = c; } else if (run) { runs.push(run); run = null; }
          }
          if (run) runs.push(run);
          var got = R.wk.map(function (p) { return [p.from, p.to]; }).sort(function (a, b) { return a[0] - b[0]; });
          if (JSON.stringify(got) !== JSON.stringify(runs)) r.notRuns.push(mo.title + ' row ' + w + ': bars ' + JSON.stringify(got) + ' vs runs ' + JSON.stringify(runs));
          R.wk.forEach(function (p) {
            r.bars++;
            var where = mo.title + ' w' + p.week + ' c' + p.from + '-' + p.to + ': ';
            var K = Kof(mi, p.week);
            if (!K) r.unknownWeek++;
            var names = [];
            R.base.forEach(function (b) {
              if (b.to < p.from || b.from > p.to || /^Production Week \d+$/.test(b.text)) return;
              if (names.indexOf(b.text) < 0) names.push(b.text);
            });
            var tag;
            if (p.from === p.to) tag = '';
            // ⚠️ An episode bar reads "Shoot 201" while it is named "Episode 201" (owner, 28 Oct 2026; unitBarLabel),
            // "Ep. 201" on a one-day half bar ("Shoot Ep. 201" / "Episode 201" in the 20-28 Oct builds). The grey
            // text names the number.
            else if (!blocksCal) tag = names.length ? 'Ep. ' + epList(names.map(function (n) { return n.replace(/^(?:Shoot Ep\.|Shoot|Episode|Ep\.) /, ''); })) : '';
            else tag = names.map(function (B) { return [B, blockEps[B]].filter(Boolean).join(' · '); }).join(' / ');
            if (p.from === p.to && p.tag) r.oneDayTagged.push(where + p.text + ' | ' + p.tag);
            var textOk = K ? p.text === K : /^Production Week \d+$/.test(p.text);
            if (!textOk || p.tag !== tag) r.wrong.push(where + JSON.stringify([p.text, p.tag]) + ' expected ' + JSON.stringify([K, tag]));
          });
        });
      });
      r.notRuns = r.notRuns.slice(0, 6); r.wrong = r.wrong.slice(0, 8);
      return r;
    }
    out.week = judgeWeek(wk);
    out.weekSample = wk.reduce(function (a, m) { return a.concat(m.pills.map(function (p) { return p.text + ' | ' + p.tag; })); }, []).slice(0, 8);

    // ---- G + T: labelled by Episode on a Blocks calendar, the SAME split bars, each with the plan's text ----
    function expectEp(p, mi) {
      if (/^Production Week \d+$/.test(p.text)) return { text: p.text, tag: p.tag };      // no unit
      var one = p.from === p.to;
      var K = (/^(Production Week \d+)/.exec(p.tag) || [])[1] || Kof(mi, p.week);
      var B = p.text, L = blockEps[B] || null;                  // base: Block B | Production Week K · Ep. L
      if (!L) return { text: K, tag: one ? '' : B, fallback: true };   // a block with no episodes reads as Week
      // A list of episodes reads as listed, "Ep. L", with no "Shoot" (owner, 20 Oct 2026: lists unchanged, and the
      // name, not a prefix, is where "Shoot" lives now), on a half bar or a whole one alike.
      return { text: L, tag: one ? '' : [K, B].join(' · ') };  // Ep. L | Production Week K · Block B
    }
    function judgeEp(res) {
      var r = { bars: 0, wrong: [], unknownWeek: 0, fallback: [], slash: [], oneDayTagged: [] };
      res.forEach(function (mo, mi) {
        mo.pills.forEach(function (p, pi) {
          r.bars++;
          var b = base[mi] && base[mi].pills[pi];
          if (!b) { r.wrong.push(mo.title + ' bar ' + pi + ': no base bar'); return; }
          var x = expectEp(b, mi);
          var where = mo.title + ' w' + p.week + ' c' + p.from + '-' + p.to + ' L' + p.lane + ': ';
          if (x.fallback) r.fallback.push(where + p.text + ' | ' + p.tag);
          if (/ \/ /.test(p.text + p.tag)) r.slash.push(where + p.text + ' | ' + p.tag);
          if (p.from === p.to && p.tag) r.oneDayTagged.push(where + p.text + ' | ' + p.tag);
          var textOk = x.text === null ? /^Production Week \d+$/.test(p.text) : p.text === x.text;
          if (x.text === null) r.unknownWeek++;
          if (!textOk || p.tag !== x.tag) r.wrong.push(where + JSON.stringify([p.text, p.tag]) + ' expected ' + JSON.stringify([x.text, x.tag]));
        });
      });
      r.wrong = r.wrong.slice(0, 8);
      return r;
    }
    if (ep) {
      out.G = sameBars(ep, base);
      out.episode = judgeEp(ep);
      out.episodeSample = ep.reduce(function (a, m) { return a.concat(m.pills.map(function (p) { return p.text + ' | ' + p.tag; })); }, []).slice(0, 8);
    }

    // ---- X2: Week mode with a switch off: the grey text loses that item, list by list; no bar moves ----
    await openText(withKey('week'));
    await pref('pref-mv-episodes');
    var wkNoEp = await months();
    await pref('pref-mv-episodes');
    function stripped(res, fn) {
      var bad = [];
      res.forEach(function (mo, mi) {
        mo.pills.forEach(function (p, pi) {
          var w = wk[mi] && wk[mi].pills[pi];
          var want = w ? w.tag.split(' / ').map(fn).filter(Boolean).join(' / ') : null;
          if (!w || p.text !== w.text || p.tag !== want) bad.push(mo.title + ' bar ' + pi + ': ' + JSON.stringify([p.text, p.tag]) + ' expected ' + JSON.stringify([w && w.text, want]));
        });
      });
      return bad.length ? bad.slice(0, 6) : true;
    }
    out.X2 = { eps: { bars: sameBars(wkNoEp, wk), text: stripped(wkNoEp, function (t) { return t.replace(/(^| · )Ep\. .*$/, ''); }) } };
    if (blocksCal) {
      await pref('pref-mv-blocks');
      var wkNoBl = await months();
      await pref('pref-mv-blocks');
      out.X2.blocks = { bars: sameBars(wkNoBl, wk), text: stripped(wkNoBl, function (t) { return t.replace(/^Block \d+( · )?/, ''); }) };
    }

    // ---- K0 / K1: Save writes the key back, and never writes a key nobody chose ----
    async function saveOf(v) {
      var writes = [];
      await openText(withKey(v), writes);
      var save = document.getElementById('save-file-btn');
      if (!save) return { err: 'no save button' };
      // ⚠️ The previous Save's "Saved ✓" flash disables the button for 1.2 s (flashSaveBtn), and a click
      // on a disabled button never fires. A fast load lands inside that window: K1 timed out on three
      // calendars until this wait was added.
      try { await T.until(function () { return !save.disabled && !save.hasAttribute('data-disabled'); }, 'save enabled', 100, 100); }
      catch (e) { return { err: e.message }; }
      save.click();
      try { await T.until(function () { return writes.length > 0; }, 'save write', 100, 100); } catch (e) { return { err: e.message }; }
      try { var o = JSON.parse(writes[writes.length - 1].text); return { has: 'mvProdLabel' in o, value: o.mvProdLabel }; }
      catch (e) { return { err: 'unparsable: ' + e.message }; }
    }
    out.K0 = await saveOf('week');
    out.K1 = await saveOf(undefined);

    // ==== STEP 3: THE REAL CONTROL (MONTH-PILL-LABEL-PLAN §5, 16 Oct 2026) ===============================
    // Preferences ▸ "Label Production by", a SegmentedControl named mv-prod-label, driven the way a user does:
    // a click on a segment's LABEL. Every calendar here is opened with viewMode 'month' set in its JSON, so no
    // view click adds an undo step of its own -- each undo assertion starts from an EMPTY stack.
    // ⚠️ Since the Settings window (owner ruling 12, 20 Oct 2026) the control and the Show switches are in its
    // Preferences tab's Month view card (the control was in a Calendar tab until the owner merged the two, the
    // same night); rows() opens the tab that holds each row before judging its
    // layout (T.shownInSettings), and opening the window is session UI, never an undo step. The JSON still
    // carries sidebarTab 'settings' -- a value no build writes any more -- which the engine reads as Show.
    //
    //   C   on open, the selected segment is the label the bars are drawn in: no key = Schedule by (Q7, Q10),
    //       'block' on an Episodes calendar = Episode (Q11); Block disabled exactly on an Episodes calendar.
    //       The Show rows visible are plan §5.2's table for that label and calendar
    //   B   Episodes calendar: a click on the disabled Block changes nothing, and hovering it mounts the
    //       reason tooltip. Q11's guard: clicking Episode where a stored 'block' already SHOWS as Episode
    //       is not a pick -- no undo step, and Save keeps the 'block'
    //   S   the three Show switches, each off then on: no undo step, the calendar not dirtied; while off they
    //       are in localStorage and NOT in the saved file (no mvWeek/mvBlocks/mvEpisodes, no pref- id in
    //       fields.byId)
    //   M   per label the control can pick away from the default: the month view is BYTE-IDENTICAL to the
    //       file opened with that key (the step-2 leg above holds those to the plan's table); the calendar
    //       is dirtied; it is ONE undo step (one Undo empties the stack and restores no-key's month view,
    //       Redo re-applies it); Save writes the key; Load of that saved text shows it again (round trip);
    //       and picking Schedule by's own label from there clears the key (Q10) and draws no key's view
    function ctl() {
      var r = [].slice.call(document.querySelectorAll('input[name="mv-prod-label"]'));
      var on = r.filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
      var blk = document.getElementById('mv-prod-label-block');
      return { checked: on.length === 1 ? on[0] : (on.join('+') || null), n: r.length,
               ids: r.map(function (x) { return x.id; }).join(','), blockDisabled: blk ? blk.disabled : null };
    }
    async function rows() { return { week: await T.shownInSettings('pref-mv-week'), blocks: await T.shownInSettings('pref-mv-blocks'), episodes: await T.shownInSettings('pref-mv-episodes') }; }
    // Plan §5.2's table: a switch is hidden while its item is the bar's text; Show Blocks only on a Blocks calendar.
    function wantRows(label) { return { week: label !== 'week', blocks: blocksCal && label !== 'block', episodes: label !== 'episode' }; }
    function statusText() { return ((document.getElementById('save-status') || {}).textContent || '').trim(); }
    function undoOff() { return !!document.getElementById('undo-btn').disabled; }
    function redoOff() { return !!document.getElementById('redo-btn').disabled; }
    var def = blocksCal ? 'block' : 'episode';
    function withCtl(v) {
      var o = JSON.parse(withKey(v));
      o.viewMode = 'month'; o.sidebarTab = 'settings';
      return JSON.stringify(o);
    }
    async function shows(v, label) {
      await T.until(function () { return ctl().checked === v; }, label || ('control shows ' + v), 60, 100);
      await settle('control ' + v);
    }
    async function pick(v) {
      var lab = document.querySelector('label[for="mv-prod-label-' + v + '"]');
      if (!lab) throw new Error('no segment label for ' + v);
      lab.click();
      await shows(v, 'picked ' + v);
    }
    // Save the calendar on screen; the written file's JSON.
    async function saveNow(writes) {
      var save = document.getElementById('save-file-btn'), n = writes.length;
      await T.until(function () { return !save.disabled && !save.hasAttribute('data-disabled'); }, 'save enabled', 100, 100);
      save.click();
      await T.until(function () { return writes.length > n; }, 'save write', 100, 100);
      return JSON.parse(writes[writes.length - 1].text);
    }
    function prefKeys(o) {
      var ks = Object.keys((o.fields && o.fields.byId) || {});
      return { n: ks.length, bad: ks.filter(function (k) { return /^(pref-|mv-prod-label)/.test(k); }),
               top: ['mvWeek', 'mvBlocks', 'mvEpisodes', 'prefs'].filter(function (k) { return k in o; }) };
    }

    // ---- C: what the control shows on open, and the rows it leaves ----
    out.C = {};
    var keys = [undefined, 'week', 'episode', 'block'];
    for (var ci = 0; ci < keys.length; ci++) {
      var kv = keys[ci], want = kv === undefined ? def : (kv === 'block' && !blocksCal ? 'episode' : kv);
      await openText(withCtl(kv));
      var got = null;
      try { await shows(want); } catch (e) { got = e.message; }
      var c = ctl(), rw = await rows(), wr = wantRows(want);
      out.C[kv === undefined ? 'none' : kv] = { want: want, got: c.checked, n: c.n, ids: c.ids, blockDisabled: c.blockDisabled,
        rows: rw, rowsOk: JSON.stringify(rw) === JSON.stringify(wr), err: got };
    }

    // ---- B: Block disabled on an Episodes calendar, the reason on hover, and Q11's guard ----
    if (!blocksCal) {
      var bw = [];
      await openText(withCtl('block'), bw);
      await shows('episode');
      var tipsOf = function () { return [].map.call(document.querySelectorAll('[role="tooltip"]'), function (t) { return t.textContent; }); };
      out.B = { tipBefore: tipsOf() };
      document.querySelector('label[for="mv-prod-label-block"]').click();
      await T.sleep(700);
      out.B.afterBlockClick = ctl().checked;
      out.B.undoOffAfterBlockClick = undoOff();
      // ⚠️ A MOVE, not a mouseenter. A synthetic mouseenter does not open a Mantine Tooltip on a page no real
      // mouse has touched (measured in the pane, 16 Oct 2026); floating-ui's useHover also opens on the
      // reference's first mousemove, and that one does.
      // ⚠️ And the OPEN STATE is read, not the tooltip's text: Mantine mounts the tooltip's box from
      // requestAnimationFrame (its Transition), which this headless run never fires, so [role=tooltip] stays
      // absent here. floating-ui's useRole sets aria-describedby on the reference the moment it opens. The
      // text itself was checked by a real hover in the pane ("Schedule by Blocks to label by block").
      await T.openSettings('prefs');   // the control is laid out only on its own tab
      var ref = document.querySelector('label[for="mv-prod-label-block"] span span');
      out.B.describedBefore = ref ? ref.getAttribute('aria-describedby') : 'no reference';
      if (ref) {
        var rb = ref.getBoundingClientRect();
        ref.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: rb.x + 3, clientY: rb.y + 3 }));
        await T.sleep(400);
      }
      out.B.describedAfter = ref ? ref.getAttribute('aria-describedby') : null;
      out.B.tipAfter = tipsOf();
      if (ref) ref.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
      document.querySelector('label[for="mv-prod-label-episode"]').click();
      await T.sleep(700);
      out.B.undoOffAfterEpisodeClick = undoOff();
      var bs = await saveNow(bw);
      out.B.savedKey = bs.mvProdLabel === undefined ? null : bs.mvProdLabel;
    } else {
      out.B = { tooltipRef: !!document.querySelector('label[for="mv-prod-label-block"] span span') };
    }

    // ---- S: the Show switches push no undo step, never dirty the calendar, never reach the file ----
    var sw = [];
    await openText(withCtl(undefined), sw);
    await shows(def);
    var S = { undoBefore: undoOff(), statusBefore: statusText() };
    var SW = ['pref-mv-week', 'pref-mv-blocks', 'pref-mv-episodes'];
    for (var si = 0; si < SW.length; si++) { document.getElementById(SW[si]).click(); await settle('off ' + SW[si]); }
    await T.sleep(700);
    S.undoAfterOff = undoOff(); S.statusAfterOff = statusText();
    S.allOff = SW.map(function (id) { return document.getElementById(id).checked; });
    try { var pr = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}'); S.stored = [pr.mvWeek, pr.mvBlocks, pr.mvEpisodes]; } catch (e) { S.stored = 'unreadable'; }
    S.file = prefKeys(await saveNow(sw));
    for (si = 0; si < SW.length; si++) { document.getElementById(SW[si]).click(); await settle('on ' + SW[si]); }
    await T.sleep(700);
    S.undoAfterOn = undoOff();
    try { S.storedAfterOn = Object.keys(JSON.parse(localStorage.getItem('sptcal.prefs') || '{}')).filter(function (k) { return /^mv/.test(k); }); } catch (e) { S.storedAfterOn = 'unreadable'; }
    out.S = S;

    // ---- M: each label the control can pick, against the file opened with that key ----
    var byKey = { week: wk };
    if (ep) byKey.episode = ep;
    out.M = {};
    var modes = ['week', 'episode', 'block'].filter(function (m) { return m !== def && !(m === 'block' && !blocksCal); });
    for (var mi = 0; mi < modes.length; mi++) {
      var m = modes[mi], R = {}, mw = [];
      await openText(withCtl(undefined), mw);
      await shows(def);
      R.undoBefore = undoOff(); R.statusBefore = statusText();
      await pick(m);
      R.view = byKey[m] ? sameHtml(await months(), byKey[m]) : 'no reference for ' + m;
      R.rows = JSON.stringify(await rows()) === JSON.stringify(wantRows(m));
      await T.sleep(700);
      R.statusAfter = statusText(); R.undoAfter = undoOff();
      document.getElementById('undo-btn').click();
      await shows(def, 'undo to ' + def);
      R.undoView = sameHtml(await months(), base);
      R.undoEmpty = undoOff(); R.redoReady = !redoOff();
      document.getElementById('redo-btn').click();
      await shows(m, 'redo to ' + m);
      R.redoView = byKey[m] ? sameHtml(await months(), byKey[m]) : 'no reference';
      var saved = await saveNow(mw);
      R.savedKey = saved.mvProdLabel === undefined ? null : saved.mvProdLabel;
      R.savedFields = prefKeys(saved);
      // The round trip: Load the text Save just wrote.
      var dw = [];
      await openText(mw[mw.length - 1].text, dw);
      try { await shows(m, 'reopened ' + m); } catch (e) { /* recorded below */ }
      R.reopened = ctl().checked;
      R.reopenView = byKey[m] ? sameHtml(await months(), byKey[m]) : 'no reference';
      // Q10 through the control: Schedule by's own label clears the key and draws no key's view.
      await pick(def);
      R.defaultView = sameHtml(await months(), base);
      var ds = await saveNow(dw);
      R.defaultSavedHasKey = 'mvProdLabel' in ds;
      out.M[m] = R;
    }

    clearInterval(guard);
    out.errors = (T.appHealth().errors || []).slice(0, 10);
  } catch (e) { clearInterval(guard); out.EX = e.message; out.errors = (window.__ERR || []).slice(0, 10); }
  T.done(out);
})(); });
