// hdrfit -- the waterfall's header ends with the calendar (owner, 21 Oct 2026: "header should scale with the length of
// the cal when you adjust the window zoom"; ruled "At every zoom", 100% included). app.js and legacy.css "THE HEADER
// ENDS WITH THE CALENDAR": the title block and the Manual-mode format strip are capped at the grid's own width, which
// the engine writes on .preview-panel as --wf-grid-w, with min-width:fit-content as the floor.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=colreuse ./run.sh hdrfit 300
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=hdrmanualbraces ./run.sh hdrfit 300
//
// colreuse is an Auto header over a grid a little wider than the harness window's scroll box at 100%, so it has both
// cases: the header across the visible width (100%, zoomed in) and the header ending with the grid (zoomed out).
// hdrmanualbraces is a Manual header (the format strip is up) over a grid narrower than the window at every zoom.
// Red on the pre-change build: the header ran to the scroll box's edge at every zoom.
//
// H1 at 25%-200% the header (and the strip) ends at min(the grid's last column, where it used to end)
// H2 at every zoom the header's and strip's HEIGHT is what it is without the cap: no line wraps that did not
// H3 a grid narrower than its own header text: the header keeps its one-line height, ending past the grid
// H4 a live grid resize with no render (a column drag) is followed
// H5 the month view drops the value; back in the waterfall it is the grid's again
// H6 the print copy cannot see it (#print-root is outside the panel, and a header there is uncapped)
// H7 a shareable copy carries no --wf-grid-w
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'hdrfit'}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function near(a, b, tol){ return Math.abs(a - b) <= (tol == null ? 1 : tol); }
  function panel(){ return q('main.preview-panel'); }
  function cap(){ return panel().style.getPropertyValue('--wf-grid-w'); }
  async function zoomTo(z){
    document.dispatchEvent(new CustomEvent('sptcal-zoom', {detail: {zoom: z}}));
    await T.sleep(400);   // past the engine's 150 ms settle
  }
  // Not requestAnimationFrame: it never fires under the harness's virtual time. A ResizeObserver delivers at the
  // next rendering opportunity, which a short sleep gives it.
  function frames(){ return T.sleep(150); }
  // The header, the strip and the grid, in screen px. `bare` measures with the cap taken off for one synchronous
  // read -- what the header was before this change -- and puts it straight back.
  function boxes(){
    var sc = q('#table-wrap > .sheet-scroll'), hb = q('.cal-header-bar', sc), ht = q('.hdr-tools', sc), gw = q('.sheet-grid-wrap', sc);
    var strip = q('.hdr-fmt', sc);
    return {hR: hb.getBoundingClientRect().right, hH: hb.offsetHeight,
            tR: strip ? ht.getBoundingClientRect().right : null, tH: strip ? ht.offsetHeight : null,
            gR: gw.getBoundingClientRect().right};
  }
  function bare(){
    var v = cap();
    panel().style.removeProperty('--wf-grid-w');
    var b = boxes();
    panel().style.setProperty('--wf-grid-w', v);
    return b;
  }
  try {
    await T.until(function () { return q('#table-wrap > .sheet-scroll .cal-header-bar') && cap(); }, 'the waterfall and its header cap', 150, 100);
    await T.sleep(300);
    out.manual = !!q('#table-wrap .hdr-fmt');
    out.cap0 = cap();
    out.zooms = [];

    // ---- H1 / H2: every zoom ----
    var endsOk = true, heightOk = true, sawCut = false, sawVisible = false;
    for(var z of [1, 0.75, 0.5, 0.25, 1.5, 2]){
      await zoomTo(z);
      var b = boxes(), o = bare(), want = Math.min(o.gR, o.hR);
      var row = {z: z, hR: Math.round(b.hR), gR: Math.round(b.gR), oldR: Math.round(o.hR), hH: b.hH, oldH: o.hH};
      if(!near(b.hR, want)) endsOk = false;
      if(b.hH !== o.hH) heightOk = false;
      if(out.manual){
        row.tR = Math.round(b.tR); row.tH = b.tH; row.oldTH = o.tH;
        if(!near(b.tR, Math.min(o.gR, o.tR))) endsOk = false;
        if(b.tH !== o.tH) heightOk = false;
      }
      if(o.hR > o.gR + 1) sawCut = true;        // the old header ran past the grid here
      if(o.gR > o.hR + 1) sawVisible = true;    // the grid ran past the visible width here
      out.zooms.push(row);
    }
    await zoomTo(1);
    check(endsOk && sawCut, 'H1 at 25%-200% the header' + (out.manual ? ' and the format strip end' : ' ends') +
          ' at the grid\'s last column, or where it used to end when the grid runs past the view (' + JSON.stringify(out.zooms).slice(0, 400) + ')');
    check(heightOk, 'H2 at every zoom the header\'s' + (out.manual ? ' and the strip\'s' : '') + ' height is what it is without the cap: no line wraps that did not');
    out.sawVisible = sawVisible;

    // ---- H3: a grid narrower than the header's own text ----
    var o3 = bare(), v3 = cap();
    panel().style.setProperty('--wf-grid-w', '200px');
    var hb = q('#table-wrap .cal-header-bar'), sl = q('#table-wrap > .sheet-scroll').getBoundingClientRect().left;
    out.narrow = {w: Math.round(hb.getBoundingClientRect().width), h: hb.offsetHeight, oldH: o3.hH, left: Math.round(hb.getBoundingClientRect().left - sl)};
    panel().style.setProperty('--wf-grid-w', v3);
    check(out.narrow.h === o3.hH && out.narrow.w > 200 && out.narrow.w <= Math.round(o3.hR - sl) + 1,
          'H3 capped at 200px, the header keeps its one-line height and takes only the width its text needs (' + JSON.stringify(out.narrow) + ')');

    // ---- H4: a live resize with no render, as a column drag makes ----
    var tb = q('#table-wrap table.sheet-table'), cols = tb.querySelectorAll('col'), last = cols[cols.length - 1];
    var w0 = parseFloat(last.style.width), t0 = parseFloat(tb.style.width);
    await zoomTo(0.5);
    last.style.width = (w0 + 120) + 'px'; tb.style.width = (t0 + 120) + 'px';
    await frames();
    var b4 = boxes();
    out.live = {hR: Math.round(b4.hR), gR: Math.round(b4.gR), cap: cap()};
    last.style.width = w0 + 'px'; tb.style.width = t0 + 'px';
    await frames();
    check(near(b4.hR, b4.gR) && parseFloat(out.live.cap) > parseFloat(out.cap0),
          'H4 a grid widened live, with no render, takes the header with it (' + JSON.stringify(out.live) + ')');
    await zoomTo(1);

    // ---- H5: the month view and back ----
    $('view-month-btn').click();
    await T.until(function () { return q('#table-wrap .mv-body'); }, 'the month view', 100, 100);
    await T.sleep(200);
    out.monthCap = cap();
    $('view-sheet-btn').click();
    await T.until(function () { return q('#table-wrap > .sheet-scroll .cal-header-bar'); }, 'the waterfall again', 100, 100);
    await T.sleep(200);
    var b5 = boxes(), o5 = bare();
    out.backCap = cap();
    check(out.monthCap === '' && out.backCap === out.cap0 && near(b5.hR, Math.min(o5.gR, o5.hR)),
          'H5 the month view drops the value and the waterfall puts it back (' + JSON.stringify({month: out.monthCap, back: out.backCap, first: out.cap0}) + ')');

    // ---- H6: the print copy ----
    var pr = $('print-root');
    var probe = q('#table-wrap > .sheet-scroll').cloneNode(true);
    pr.appendChild(probe);
    var mw = getComputedStyle(q('.cal-header-bar', probe)).maxWidth;
    probe.remove();
    check(!!pr && !panel().contains(pr) && mw === 'none',
          'H6 #print-root is outside the panel and a header there is uncapped (max-width ' + mw + ')');

    // ---- H7: a shareable copy ----
    await T.sleep(700);   // the share handler's reClickGuard(600)
    var dl = T.captureDownload();
    $('share-copy-btn').click();
    await T.until(dl.peek, 'the shareable copy', 200, 100);
    var html = await dl.stop().text();
    var panelTag = (html.match(/<main[^>]*class="[^"]*preview-panel[^"]*"[^>]*>/) || [''])[0];
    out.copyPanelTag = panelTag.slice(0, 200);
    check(!!panelTag && !/--wf-grid-w/.test(panelTag), 'H7 a shareable copy carries no --wf-grid-w (' + out.copyPanelTag + ')');
  } catch(e){
    out.EX = String(e && e.stack || e);
  }
  out.checks = checks;
  out.fails = fails;
  out.health = T.appHealth ? T.appHealth() : null;
  var errs = ((out.health || {}).errors || []);
  check(!errs.length, 'H8 no console error or warning (' + errs.slice(0, 2).join(' | ') + ')');
  out.pass = fails.length === 0 && !out.EX;
  T.done(out);
})(); });
