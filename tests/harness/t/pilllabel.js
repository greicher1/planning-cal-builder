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
        return { week: weekIdx, from: m ? +m[1] - 1 : -1, to: m ? +m[2] - 2 : -1, lane: r ? +r[1] : -1,
                 text: text, tag: tagEl ? tagEl.textContent : '' };
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
            else if (!blocksCal) tag = names.length ? 'Ep. ' + epList(names.map(function (n) { return n.replace(/^Ep\. /, ''); })) : '';
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

    clearInterval(guard);
    out.errors = (T.appHealth().errors || []).slice(0, 10);
  } catch (e) { clearInterval(guard); out.EX = e.message; out.errors = (window.__ERR || []).slice(0, 10); }
  T.done(out);
})(); });
