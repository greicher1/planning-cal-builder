// Shared helpers for every test in this harness, exposed as window.__T.
//
// ** Everything here drives the DOM, never the app's own functions. ** index.html's script is one
// ** IIFE, so nothing inside it is a global: `exportExcel()` is unreachable from a test and the
// ** only way to trigger an export is to click its button. Fields are set by assigning .value and
// ** dispatching input+change, which is what the app's listeners are bound to.
//
// ⚠️ If the chrome is ever migrated to React/Mantine, `el.value = v` + a dispatched event stops
// working -- React ignores it -- and every test here would quietly assert against a blank
// calendar. Fix this file (native value setter) BEFORE porting anything, not after.
window.__T = (function(){
  // ⚠️ NATIVE SETTER, not `e.value = v`.
  // React installs its own `value` setter on the input prototype and tracks the last value it
  // wrote. A plain assignment updates the DOM but leaves React's tracker unchanged, so React
  // decides nothing changed and swallows the dispatched event -- silently. Every fixture in this
  // harness would go on "setting" fields that never took, and every assertion would run against a
  // blank calendar, which reads exactly like the app ignoring input. Calling the PROTOTYPE setter
  // bypasses React's override and leaves the tracker stale, which is what makes React believe the
  // value is new. This is the fix MANTINE-MIGRATION.md §4.2 says must land before any porting.
  function nativeSet(e, v){
    var proto = e instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
              : e instanceof HTMLSelectElement   ? HTMLSelectElement.prototype
              : HTMLInputElement.prototype;
    var d = Object.getOwnPropertyDescriptor(proto, 'value');
    if(d && d.set) d.set.call(e, v); else e.value = v;
  }
  function set(id,v){
    var e=document.getElementById(id); if(!e) throw new Error('no #'+id);
    nativeSet(e, v); ['input','change'].forEach(function(t){e.dispatchEvent(new Event(t,{bubbles:true}));});
  }
  function sleep(ms){ return new Promise(function(r){setTimeout(r,ms);}); }
  // A realistic 10-episode US-General calendar spanning two year blocks, with every phase dated
  // so the notes column carries milestones AND holidays.
  function buildFixture(){
    set('show-title','Test Show');
    set('season-num','2');
    set('num-episodes','10');
    set('shoot-days-per-ep','8');
    set('union-country','US');
    set('union-usregion','US-GEN');
    set('start-writersRoom','2026-01-05'); set('weeks-writersRoom','12');
    set('start-prePrep','2026-04-06');     set('weeks-prePrep','6');
    set('start-prodPrep','2026-05-18');    set('weeks-prodPrep','6');
    set('start-production','2026-06-29');
    set('start-post','2026-11-02');        set('weeks-post','16');
    set('start-localization','2027-03-01');set('weeks-localization','8');
  }
  // Every holiday defaults to month-view-only. Turn them all on for the sheet so the notes
  // column is exercised at its most crowded -- which is where clipping shows up.
  // ** RE-QUERY on every iteration. The holiday list re-renders on each change, so a captured
  // ** NodeList is detached after the first click and every later click silently does nothing.
  async function showHolidaysInSheet(){
    var n=0;
    for(var guard=0; guard<200; guard++){
      var next=null;
      var all=document.querySelectorAll('#holiday-vis-list input.hv-cb');
      for(var i=0;i<all.length;i++){
        if(all[i].dataset.view==='sheet' && !all[i].checked){ next=all[i]; break; }
      }
      if(!next) break;
      next.click(); n++;
      await sleep(60);
    }
    return n;
  }
  // A free-text note typed by the user: the path that must stay pixel-identical.
  async function typeUserNote(weekIso, text){
    var td=document.querySelector('td.sheet-note-cell[data-week="'+weekIso+'"]');
    if(!td) throw new Error('no note cell for '+weekIso);
    td.click();
    await sleep(300);
    var ta=document.querySelector('.note-editor textarea');
    if(!ta) throw new Error('note editor did not open');
    ta.value=text;
    ta.dispatchEvent(new Event('input',{bubbles:true}));
    // Ctrl+Enter is the explicit commit; a body click relies on an outside-click handler that
    // a synthetic click does not always satisfy.
    ta.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true}));
    await sleep(500);
  }
  function addHiatus(startIso, weeks){
    document.getElementById('add-hiatus').click();
    var rows=document.querySelectorAll('#hiatus-list .hiatus-entry');
    var row=rows[rows.length-1];
    var s=row.querySelector('.hiatus-start'), w=row.querySelector('.hiatus-weeks');
    s.value=startIso; ['input','change'].forEach(function(t){s.dispatchEvent(new Event(t,{bubbles:true}));});
    w.value=String(weeks); ['input','change'].forEach(function(t){w.dispatchEvent(new Event(t,{bubbles:true}));});
  }
  // A cell clips HORIZONTALLY when its text is wider than the box the width model gave it.
  // That -- and only that -- is the padding trap: CSS spending more than the model budgets
  // silently ellipsis-clips text. It has landed twice and it is the acceptance gate.
  //
  // VERTICAL overflow is a different thing and is deliberate: rows are a fixed height and text
  // is fitted to the row, so a three-line note in a 20px row is clipped by design once the
  // shrink floor is reached. Counted separately so a regression there is still visible, but it
  // is not a failure.
  function clippedCells(){
    var h=[], v=[];
    document.querySelectorAll('table.sheet-table td, table.sheet-table th').forEach(function(td){
      var probe = td.querySelector('.cell-body') || td.querySelector('.phase-cell-label') || td;
      var txt=(td.textContent||'').trim(); if(!txt) return;
      var dw = probe.scrollWidth - probe.clientWidth;
      var dh = probe.scrollHeight - probe.clientHeight;
      if(dw > 1) h.push({t:txt.slice(0,40), dw:dw, cls:td.className});
      if(dh > 1) v.push({t:txt.slice(0,40), dh:dh, cls:td.className});
    });
    return {h:h, v:v};
  }
  // The screen renders 11px type where Excel uses 11pt, so a screen pixel of column width IS
  // a point. Summing the declared <col> widths gives the grid width the PDF writer will use.
  function gridWidthPt(){
    var s=0;
    document.querySelectorAll('table.sheet-table colgroup col').forEach(function(c){
      s += parseFloat(c.style.width)||0;
    });
    return s;
  }
  function colList(){
    return [].map.call(document.querySelectorAll('table.sheet-table colgroup col'), function(c){
      return {k:c.dataset.ckey, w:parseFloat(c.style.width)||0};
    });
  }
  // A stable text signature of the whole grid: what every row shows, in order.
  function gridSignature(){
    var rows=[];
    var tb=document.querySelector('table.sheet-table tbody');
    if(!tb) return rows;
    [].forEach.call(tb.rows,function(tr){
      rows.push([].map.call(tr.cells,function(td){
        return (td.textContent||'').replace(/\s+/g,' ').trim()+'#'+(td.colSpan||1);
      }).join('|'));
    });
    return rows;
  }
  // Grab whatever Blob the next export hands to URL.createObjectURL, and stop the download firing.
  //
  // Returns { peek, stop }: `peek()` is the blob so far (null until the export finishes), `stop()`
  // restores the originals and returns it. Poll with until(cap.peek) rather than sleeping — an
  // export is async with no DOM signal, and under --virtual-time-budget a sleep is not a real wait,
  // so a fixed sleep is a race that fails as "no blob" on a perfectly good export.
  function captureDownload(){
    var got=null;
    var real=URL.createObjectURL;
    URL.createObjectURL=function(b){ got=b; return real.call(URL,b); };
    var realClick=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){ if(!this.download) return realClick.call(this); };
    return {
      peek: function(){ return got; },
      stop: function(){ URL.createObjectURL=real; HTMLAnchorElement.prototype.click=realClick; return got; }
    };
  }
  // Click an export button and hand back its Blob, waiting on the blob itself.
  async function captureExport(btnId, label){
    var cap = captureDownload();
    try {
      document.getElementById(btnId).click();
      await until(cap.peek, label || ('export from #' + btnId), 200, 100);
    } finally { cap.stop(); }
    return cap.peek();
  }
  function b64(buf){
    var b=new Uint8Array(buf), s='';
    for(var i=0;i<b.length;i+=8192) s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));
    return btoa(s);
  }
  // Drive the real Open path with a file fetched over HTTP, by standing in for the picker.
  // Nothing else is stubbed: parseCalendarText / applyStateSnapshot / refreshAfterRestore all
  // run exactly as they do for a user.
  // The file menu is rendered by renderRecents(), which runs inside loadRecents().then(...) --
  // i.e. after an IndexedDB round trip. Until that resolves, #file-menu is EMPTY and the Open
  // item does not exist. Waiting on this is what makes the Open path testable at all; pacing it
  // with sleep() gave a ~1-in-3 run where the click landed on nothing, no error was thrown, and
  // the test reported an unrestored calendar as though the app had ignored the file.
  //
  // ⚠️ ** Pick a readiness signal only LIVE CODE can produce. ** This probe was wrong twice before
  // ** it was right, and both wrong versions looked reasonable:
  //     #union-country .value  -- its default option is value="" ("None"), so an empty string is
  //                               the correct fresh state AND what a dead page shows.
  //     #file-menu-label text  -- the markup ships the literal text "Untitled" already.
  // A probe a dead page also satisfies turns a broken page into a "broken feature", which is how
  // an unrestored calendar got reported as the app ignoring a file.
  //
  // ⚠️ CHANGED WITH THE MANTINE HEADER, and it is the third time this probe has had to move.
  // It used to be "#file-menu has children". That worked while the dropdown shipped EMPTY in the
  // markup and only renderRecents() filled it. The Mantine Menu renders its Open… and Export
  // shareable copy… items from React's very first commit -- before initLegacyApp() has even run --
  // so a page whose engine never started now satisfies the old probe. Same failure mode as the two
  // before it: a dead page reads as a live one, and the real breakage surfaces later as a "feature"
  // that does nothing.
  //
  // #file-menu-wrap's display is still a live-code-only signal: it ships display:none from React's
  // state default and is cleared only by renderRecents(), which runs inside loadRecents().then(...)
  // -- an IndexedDB round trip, and on a fresh --user-data-dir the database has to be created
  // first. That round trip is the real source of the ~1-in-3 flake.
  async function appReady(){
    await until(function(){
      var wrap = document.getElementById('file-menu-wrap');
      return wrap && getComputedStyle(wrap).display !== 'none';
    }, 'renderRecents() to reveal the file menu (IndexedDB-backed; see README)', 200, 100);
  }
  async function openViaFakePicker(url, name){
    var txt = await (await fetch(url)).text();
    var called = false;
    window.showOpenFilePicker = async function(){
      called = true;
      return [{
        name: name,
        kind: 'file',
        queryPermission: async function(){ return 'granted'; },
        requestPermission: async function(){ return 'granted'; },
        isSameEntry: async function(){ return false; },
        getFile: async function(){ return new File([txt], name, {type:'text/html'}); }
      }];
    };
    await appReady();
    document.querySelector('.file-menu-btn').click();  // NB: the id is Mantine's (Popover.Target injects it); the class is the contract
    await until(function(){
      return !!document.querySelector('#file-menu .file-menu-item[data-action="open"]');
    }, 'Open... menu item', 60, 100);
    document.querySelector('#file-menu .file-menu-item[data-action="open"]').click();
    // Prove the app actually reached the picker. Without this a menu that silently did nothing is
    // indistinguishable from a file the app refused.
    await until(function(){ return called; }, 'showOpenFilePicker to be called', 60, 100);
    return txt.length;
  }
  // Everything a restored calendar should bring back, in one comparable blob.
  function formSignature(){
    var o={};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(function(e){
      if(e.type==='checkbox'||e.type==='radio') o[e.id]=e.checked?'1':'0'; else o[e.id]=e.value;
    });
    return o;
  }
  // Is the app actually alive? A test that measures a page whose script threw during init reports
  // an empty calendar, which reads as a broken feature. Every test should report this.
  function appHealth(){
    return {
      errors: (window.__ERR || []).slice(0, 20),
      // #file-menu is empty in the markup; only renderRecents() fills it. Non-zero means the
      // app's init actually completed, which is NOT the same as the page merely having loaded.
      menuItems: (document.getElementById('file-menu') || {children: []}).children.length,
      country: (document.getElementById('union-country') || {}).value || '',
      hasGrid: !!document.querySelector('table.sheet-table'),
      excelJs: typeof window.ExcelJS,
      fontsLoaded: (document.fonts && document.fonts.check) ? document.fonts.check('11pt Carlito') : null
    };
  }
  // Wait for a condition rather than for a duration. Under --virtual-time-budget a setTimeout is
  // not a real wait, so pacing a test with sleep() alone is why runs came back empty at random.
  async function until(fn, label, tries, gap){
    tries = tries || 60; gap = gap || 100;
    var t0 = performance.now();
    for(var i=0;i<tries;i++){
      try { if(fn()) return true; } catch(e){}
      await sleep(gap);
    }
    // Report the REAL elapsed time, not the poll count. Under --virtual-time-budget those are
    // different numbers, and knowing which one ran out is most of the diagnosis.
    throw new Error('timed out waiting for: ' + (label || 'condition')
      + ' (' + tries + ' polls, ' + Math.round(performance.now() - t0) + 'ms real)');
  }
  function done(o){ document.getElementById('R').textContent=JSON.stringify(o); }
  return {set:set,sleep:sleep,buildFixture:buildFixture,showHolidaysInSheet:showHolidaysInSheet,
          typeUserNote:typeUserNote,addHiatus:addHiatus,openViaFakePicker:openViaFakePicker,
          formSignature:formSignature,appHealth:appHealth,until:until,appReady:appReady,
          clippedCells:clippedCells,gridWidthPt:gridWidthPt,colList:colList,
          gridSignature:gridSignature,captureDownload:captureDownload,captureExport:captureExport,b64:b64,done:done};
})();
