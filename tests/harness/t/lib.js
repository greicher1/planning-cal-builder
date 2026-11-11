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
// ⭐ THE HIATUS RIPPLE IS OFF IN EVERY LEG BUT ITS OWN (HIATUS-RIPPLE-PLAN.md §8). It is ON by default for users (owner
// ruling R1, 4 Nov 2026), and with it on a hiatus edit that settles moves the phases after it. The legs that edit a
// hiatus through the UI were written for a hiatus that only pauses, so they keep testing that. Written before the app
// reads its preferences: this script is inline at the end of <body>, the build's app a deferred module. t/hiatusripple.js
// deletes the key again at its top, which also runs before the app, so it tests the users' default.
(function(){
  try {
    var o = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {};
    o.hiatusRipple = false;
    localStorage.setItem('sptcal.prefs', JSON.stringify(o));
  } catch(e){}
})();
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
  // ⭐ THE EXPORT PDF DIALOG (PAPER-SIZE-PLAN.md §5a, 21 Oct 2026) is ANSWERED AT ITS DEFAULTS the moment it
  // opens, in every leg that has not taken it over with T.pdfDialog('manual'). Since the dialog exists, every
  // waterfall-PDF export -- about twenty legs through captureExport, more that click the button themselves --
  // stops on it, and a leg that read "whatever modal is up" after the click would have read the dialog
  // instead of the character warning it waits for.
  //  - It CLICKS the dialog's own Export, so the real path runs: the engine's askPdfPageSetup() applies the
  //    defaults, which must change nothing. That makes every PDF the gate byte-compares the proof that
  //    "Export at the defaults = the PDF from before the dialog existed". A switch that skipped the dialog
  //    inside the app would have hidden exactly that.
  //  - modalText() leaves the dialog out while in this mode, for the moment between its opening and the click.
  //  - t/pdfdialog.js takes it over ('manual') to drive it the way a user does.
  //  - ⭐ T.pdfDialogPick(['dashed', 'tabloid']) (11 Nov 2026): the NEXT dialog answered in 'auto' clicks those segments
  //    first, then Export. Since the owner removed Paper and Grid Lines in Exports from Preferences, the dialog is
  //    the only place a user picks either, so a leg that needs a paper or a grid-lines preference goes through it.
  //    T.pdfDialog() also reports what the last answered dialog OPENED on (`opened`) and its segments (`values`).
  var pdfDialogMode = 'auto', pdfDialogAnswered = 0, pdfDialogPicks = null, pdfDialogLast = null;
  function pdfDialogRadios(){ return Array.prototype.slice.call(document.querySelectorAll('.export-pdf-dlg input[type="radio"]')); }
  function answerPdfDialog(){
    if(pdfDialogMode !== 'auto') return;
    var b = document.querySelector('.export-pdf-dlg [data-pdfdlg="export"]');
    if(!b || b.__tAnswered) return;
    b.__tAnswered = true; pdfDialogAnswered++;
    var rs = pdfDialogRadios();
    pdfDialogLast = { values: rs.map(function(i){ return i.value; }),
                      opened: rs.filter(function(i){ return i.checked; }).map(function(i){ return i.value; }) };
    var picks = pdfDialogPicks; pdfDialogPicks = null;
    if(!picks || !picks.length){ b.click(); return; }
    picks.forEach(function(v){
      var inp = pdfDialogRadios().find(function(i){ return i.value === v; });
      if(!inp){ (window.__ERR = window.__ERR || []).push('T.pdfDialogPick: no ' + v + ' segment'); return; }
      var lab = document.querySelector('label[for="' + inp.id + '"]');
      (lab || inp).click();
    });
    setTimeout(function(){
      var e = document.querySelector('.export-pdf-dlg [data-pdfdlg="export"]');
      if(e) e.click();
    }, 300);
  }
  new MutationObserver(answerPdfDialog).observe(document.documentElement, {childList: true, subtree: true});
  function pdfDialog(mode){
    if(mode === 'auto' || mode === 'manual') pdfDialogMode = mode;
    return { mode: pdfDialogMode, answered: pdfDialogAnswered, last: pdfDialogLast };
  }
  function pdfDialogPick(values){ pdfDialogPicks = [].concat(values || []); }
  // Alt+Left / Alt+Right on the document: the column swap's keyboard path. The toolbar's
  // ◀ Swap / Swap ▶ buttons only duplicated it, and they went with owner ruling 2 (30 Sep 2026),
  // so the swap legs press the keys. The engine's handler needs a live selection in the
  // Waterfall and ignores the keys while focus is in a text field, exactly as for a user.
  function altSwap(dir){
    document.dispatchEvent(new KeyboardEvent('keydown', {key: dir < 0 ? 'ArrowLeft' : 'ArrowRight', altKey: true, bubbles: true, cancelable: true}));
  }
  // Rebuild From since its tick list (owner, 30 Oct 2026: "Build A"): choose the side, tick EVERY phase the
  // list offers, press Rebuild. That is exactly what the two direction buttons did on one click before the
  // ticks, so a leg written against the old buttons keeps asserting the same dates. The popover must be
  // open with its phase and date set. ** RE-QUERY each tick: the list is redrawn on every change. The
  // rebuildticks leg is the one that holds what unticked phases do.
  // ⚠️ BUILD AROUND (5 Nov 2026, REBUILD-FROM-LENGTHS-PLAN.md): the list holds BOTH sides with the pin in its place,
  // and it opens with ticks set by a rule (a phase running alongside its neighbour starts unticked). ⛔ There are NO
  // side buttons since 10 Nov 2026 (owner: Prior to X / After X removed; tool-solve-back / tool-solve-fwd are gone),
  // so this reaches one side by the boxes alone: it ticks every phase on the chosen side (rows before the pin for
  // -1, after it for 1) and unticks the other side. Still exactly the old one-sided, every-phase rebuild. The
  // buildaround leg holds the defaults.
  function rebuildAll(dir){
    function sideBoxes(want){
      var rows = Array.prototype.slice.call(document.querySelectorAll('#pop-solve .solve-list .solve-row'));
      var at = rows.findIndex(function (r) { return r.classList.contains('is-pin'); });
      return rows.filter(function (r, i) { return at >= 0 && (dir < 0 ? i < at : i > at) === want; })
        .map(function (r) { return r.querySelector('input[type=checkbox][data-key]'); }).filter(Boolean);
    }
    for(var guard = 0, box; guard < 60 && (box = sideBoxes(true).filter(function (b) { return !b.checked; })[0]); guard++) box.click();
    for(guard = 0; guard < 60 && (box = sideBoxes(false).filter(function (b) { return b.checked; })[0]); guard++) box.click();
    document.getElementById('tool-solve-go').click();
  }
  // BUILD AROUND, ONE SIDE OF THE PIN BY THE BOXES ALONE (there are no Prior to / After buttons since 10 Nov 2026):
  // unticks every ticked phase on the OTHER side. dir -1 keeps the phases before the pin, 1 the ones after it. The
  // kept side's ticks are left as they are (the starting ticks, or the caller's own). Synchronous: a box's click
  // redraws the list at once, so every pass re-queries.
  function solveKeepSide(dir){
    for(var guard = 0; guard < 60; guard++){
      var rows = Array.prototype.slice.call(document.querySelectorAll('#pop-solve .solve-list .solve-row'));
      var at = rows.findIndex(function (r) { return r.classList.contains('is-pin'); }), box = null;
      rows.forEach(function (r, i) {
        var b = r.querySelector('input[type=checkbox][data-key]');
        if(!box && at >= 0 && b && b.checked && (dir < 0 ? i > at : i < at)) box = b;
      });
      if(!box) return;
      box.click();
    }
  }
  // A realistic 10-episode US-General calendar spanning two year blocks, with every phase dated
  // so the notes column carries milestones AND holidays.
  function buildFixture(){
    // ⛔ The OLD default name, typed. Pre Prep's default became "Pre-Prep" on 28 Oct 2026, and every baseline cut
    // from this calendar before then says "Pre Prep Wk N". A calendar saved with the old name must still draw
    // exactly that (PHASES' `was`), so typing it here keeps those baselines byte-identical AND proves it on every
    // run. The new default is held by the prepreptitle leg.
    set('name-prePrep','Pre Prep');
    set('show-title','Test Show');
    set('season-num','2');
    set('num-episodes','10');
    set('shoot-days-per-ep','8');
    set('union-place','us-general');
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
  // A waterfall note, band or custom heading opens on a DOUBLE-click since 21 Oct 2026 (TEXT-STYLE-BAR-PLAN.md
  // D5: "a single click highlights it, like Excel"). Dispatched on the cell itself, at its centre.
  function openCell(el){
    var r=el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true,detail:2,
      clientX:Math.round(r.left+r.width/2),clientY:Math.round(r.top+r.height/2)}));
  }
  async function typeUserNote(weekIso, text){
    var td=document.querySelector('td.sheet-note-cell[data-week="'+weekIso+'"]');
    if(!td) throw new Error('no note cell for '+weekIso);
    openCell(td);
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
  //     #union-place .value  -- its default option is value="" ("None"), so an empty string is
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
  // ⚠️ MOVED A FOURTH TIME, 8 Sep 2026 -- and this one was not a wrong probe, it was a probe that
  // could not fire. It waited on #file-menu-wrap's display, which is cleared only by
  // renderRecents(), which runs inside loadRecents().then(...) -- an IndexedDB round trip. And
  // `indexedDB.open('spt-planning-cal')` NEVER SETTLES in headless Chrome under
  // --virtual-time-budget: no success, no error, no `blocked` (measured by t/fsprobe.js, and
  // identically on the untouched deployed page, which is what proves it environmental). So the wrap
  // is never revealed, appReady() always timed out, and the `restore` leg -- the ONLY test of the
  // real Open path, and the only thing that runs gate 5 -- failed 100% of the time. It was recorded
  // as a known environmental flake and ignored, which quietly cost us the save-format check.
  //
  // ⭐ THE STALL NEVER BLOCKED THE OPEN PATH ITSELF; it only blocked this probe. Measured 8 Sep 2026:
  // #file-menu is `keepMounted`, so its Open... item is in the DOM and enabled while the wrap is
  // still display:none; the engine's ONE delegated listener is bound to #file-menu, so a click on
  // the hidden item reaches it; and window.showSaveFilePicker IS a function in headless, so
  // supportsFsAccess is true and openFileViaPicker() does not early-return. A .click() dispatches
  // and bubbles regardless of visibility.
  //
  // So wait for the ENGINE-GENERATED SIDEBAR instead. #start-production is minted by
  // buildPhaseRows() as an HTML string -- the Phases card is deliberately NOT a React component
  // (Sidebar.jsx's header says why: those generators mint the ids that ARE the save-file format).
  // React cannot produce it, the static skeleton does not carry it, and it needs no IndexedDB. The
  // four DEFAULT_HIATUSES rows are the same kind of evidence, so require both: two independent
  // engine writes, in two different cards.
  //
  // ⛔ Keep this a signal ONLY LIVE CODE CAN PRODUCE -- the rule the three previous moves each
  // broke. #file-menu having children does NOT qualify (React commits those before the engine
  // starts); neither does #file-menu-label's text (the markup ships "Untitled"), nor
  // #union-place's value (its default option is value="", which is also what a dead page shows).
  // ⚠️ And do NOT reach for `table.sheet-table` here: a BLANK page has no grid at all --
  // computePhaseRowLayout() returns [] until Show Info is complete -- so it never appears before a
  // file is opened. That was the first attempt at this fix and it timed out for a reason that
  // looks identical to the bug it was fixing. It is the right probe for base.js, which builds a
  // fixture first; it is the wrong one here.
  async function appReady(){
    await until(function(){
      return !!document.getElementById('start-production') &&
             document.querySelectorAll('#hiatus-list .hiatus-entry').length > 0;
    }, 'the engine to build the sidebar (IndexedDB-free; see the note above)', 200, 100);
  }
  // opts (optional, added 25 Sep 2026 for the audit-fix legs):
  //   opts.writes -- an array. The handle then gets a createWritable() that RECORDS every write as
  //                  {file, text} instead of failing, and later getFile() calls return the last text
  //                  written -- so a leg can assert exactly what Save / autosave put in WHICH file.
  //   opts.text   -- use this text as the file's content instead of fetching url.
  //   opts.control -- an object; it gets touch(text), which rewrites the file AS IF SOMEONE ELSE HAD
  //                  (another window, a colleague, a sync client): new content, a later lastModified.
  //                  Added 29 Sep 2026 for the M-6 conflict leg.
  // Existing two-argument callers are unchanged: no createWritable, content fetched from url.
  //
  // ⚠️ lastModified is STABLE: getFile() reports the time of the last write, like a real file. It
  // used to mint a new File on every call with lastModified = now, which would read as "changed on
  // disk" on every single check once the app started comparing (audit M-6).
  async function openViaFakePicker(url, name, opts){
    opts = opts || {};
    var txt = (typeof opts.text === 'string') ? opts.text : await (await fetch(url)).text();
    // opts.mtime (9 Nov 2026, the lastedited leg): the file's last-modified time, which a file with no Date Last
    // Edited stamp stands in with. Default: a minute ago, as before.
    var mtime = (typeof opts.mtime === 'number') ? opts.mtime : Date.now() - 60000;
    var called = false;
    var handle = {
      name: name,
      kind: 'file',
      queryPermission: async function(){ return 'granted'; },
      requestPermission: async function(){ return 'granted'; },
      isSameEntry: async function(other){ return other === handle; },
      getFile: async function(){ return new File([txt], name, {type:'text/html', lastModified: mtime}); }
    };
    if(opts.control){
      opts.control.handle = handle;
      opts.control.touch = function(text){ txt = text; mtime = Math.max(Date.now(), mtime + 1000); };
      opts.control.text = function(){ return txt; };
    }
    if(opts.writes){
      handle.createWritable = async function(){
        var parts = [];
        return {
          write: async function(c){
            parts.push(typeof c === 'string' ? c : (c instanceof Blob ? await c.text() : String((c && c.data) || c)));
          },
          close: async function(){ txt = parts.join(''); mtime = Math.max(Date.now(), mtime + 1000); opts.writes.push({file: name, text: txt}); }
        };
      };
    }
    window.showOpenFilePicker = async function(){
      called = true;
      return [handle];
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
  //
  // ⛔ THE TWO SKIPS ARE THE POINT, and their absence made gate 5 assert the wrong thing for a week.
  // This must mirror collectFieldValues() EXACTLY, because gate 5's claim is "the fields.byId key
  // set is unchanged" -- the save-format contract. Without the skips this was a raw sweep reporting
  // a SUPERSET: the eight transient tool-* popover ids, which collectFieldValues() deliberately
  // drops, and pref-gridlines, which is a per-user PREFERENCE and must never enter a saved file.
  // So a preference appearing here read as a save-format change (a false alarm), while a genuine
  // format change could hide among the tool ids. Matched on the CLASS, not an id, for the same
  // reason the engine matches on the class: an id-based test stops matching the moment the markup
  // is reorganised, and it fails silently.
  //
  // ⚠️ Keep this function and collectFieldValues() in step. If the engine ever gains a third
  // exclusion, this needs it the same day, or the gate starts lying in one direction or the other.
  function formSignature(){
    var o={};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(function(e){
      if(e.closest('.tools-menu')) return;
      if(e.closest('.prefs-card')) return;
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
      country: (document.getElementById('union-place') || {}).value || '',
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
  // ---- Added 25 Sep 2026 for the audit-fix legs (FIX-PLAN.md step 0) ----------------------------
  //
  // memoryIDB(): replace window.indexedDB with an in-memory fake, so the recents list, persistRecents()
  // and the crash backup SETTLE in headless Chrome, where the real indexedDB.open() never fires
  // success, error or blocked (README trap). ⛔ It only works if called SYNCHRONOUSLY at the top of a
  // test script: the build's engine is a deferred <script type="module">, so an injected script runs
  // BEFORE the engine boots -- and idbOpen() re-opens the database on every call, so everything after
  // boot goes through the fake. Values are stored by reference (no structured clone), which is what
  // lets a fake FileSystemFileHandle (an object with functions) sit in the recents list.
  function memoryIDB(){
    var dbs = {};
    function later(fn){ Promise.resolve().then(fn); }
    function request(){ return {result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null}; }
    var fake = {
      open: function(name){
        var r = request();
        later(function(){
          var isNew = !dbs[name];
          if(isNew) dbs[name] = {};
          var stores = dbs[name];
          r.result = {
            objectStoreNames: {contains: function(s){ return !!stores[s]; }},
            createObjectStore: function(s){ stores[s] = stores[s] || new Map(); return {}; },
            close: function(){},
            transaction: function(){
              var tx = {oncomplete: null, onerror: null, error: null};
              tx.objectStore = function(s){
                var m = stores[s] || (stores[s] = new Map());
                function op(fn){ var q = request(); later(function(){ q.result = fn(); if(q.onsuccess) q.onsuccess({target: q}); }); return q; }
                return {
                  get: function(k){ return op(function(){ return m.get(k); }); },
                  put: function(v, k){ m.set(k, v); return op(function(){ return k; }); },
                  delete: function(k){ m.delete(k); return op(function(){ return undefined; }); },
                  // Per-tab crash-backup slots are found by key prefix (audit SAVE-7, 29 Sep 2026).
                  getAllKeys: function(){ return op(function(){ return Array.from(m.keys()); }); }
                };
              };
              later(function(){ later(function(){ if(tx.oncomplete) tx.oncomplete({target: tx}); }); });
              return tx;
            }
          };
          if(isNew && r.onupgradeneeded) r.onupgradeneeded({target: r});
          if(r.onsuccess) r.onsuccess({target: r});
        });
        return r;
      }
    };
    try { Object.defineProperty(window, 'indexedDB', {configurable: true, get: function(){ return fake; }}); }
    catch(e){ window.__MEMIDB_FAILED = String(e); }
    window.__MEMIDB = dbs;
    return dbs;
  }
  // The app's OWN dialogs (uiAlert / uiConfirm) are Mantine modals. ⛔ Never read them with
  // document.querySelector('[role="dialog"]'): the four toolbar tool popovers and #help-overlay are
  // also role="dialog" and come FIRST in the document, so a first-match selector never sees the
  // modal -- which made one audit result claim "no dialog" when the app had shown one.
  function modalText(){
    return Array.from(document.querySelectorAll('.mantine-Modal-content'))
      .filter(function(d){ return pdfDialogMode !== 'auto' || !d.closest('.export-pdf-dlg'); })
      .map(function(d){ return (d.innerText || d.textContent || '').replace(/\s+/g, ' ').trim(); })
      .filter(Boolean).join(' || ');
  }
  function clickModalButton(label){
    // ⛔ No dollar sign anywhere in this file or in a test (see srv.js): a label is matched EXACTLY,
    // a RegExp as given.
    var b = Array.from(document.querySelectorAll('.mantine-Modal-content button'))
      .find(function(x){ var t = (x.innerText || x.textContent || '').trim(); return label instanceof RegExp ? label.test(t) : t === label; });
    if(b) b.click();
    return !!b;
  }
  // ⛔ Chrome's --dump-dom EXITS with a 0-byte dump when the DOM holds a lone UTF-16 surrogate --
  // proven on a bare page with no app code (audit, 24 Sep 2026), so it is Chrome, not the app. A leg
  // that types such text would read as "the page crashed". done() scrubs text nodes and field
  // values first; the result JSON itself is safe (JSON.stringify escapes lone surrogates).
  function scrubSurrogates(){
    var bad = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, n = 0;
    function fix(s){ return s.replace(bad, function(m, pre){ n++; return (pre || '') + '?'; }); }
    var w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT), t;
    while((t = w.nextNode())){ if(/[\uD800-\uDFFF]/.test(t.data)) t.data = fix(t.data); }
    document.querySelectorAll('input, textarea').forEach(function(e){
      if(/[\uD800-\uDFFF]/.test(e.value)) e.value = fix(e.value);
    });
    return n;
  }
  // The newest crash backup in the in-memory IndexedDB, whatever its slot: {key, at, state, fileName}.
  // ⚠️ Since v1.3.1 each page load writes its OWN slot, 'unsavedBackup:<id>' (audit SAVE-7), so a
  // leg must not read the old fixed 'unsavedBackup' key -- it is only ever read now, never written.
  function latestBackup(){
    var db = window.__MEMIDB && window.__MEMIDB['spt-planning-cal'];
    var m = db && db.handles;
    if(!m) return null;
    var best = null;
    m.forEach(function(v, k){
      if(typeof k === 'string' && k.indexOf('unsavedBackup') === 0 && v && v.state && (!best || (v.at || 0) > (best.at || 0))){
        best = {key: k, at: v.at, state: v.state, fileName: v.fileName};
      }
    });
    return best;
  }
  // The month PDF's PRINT path, for a leg that needs the print DOCUMENT: gate 10, and every leg that captures
  // one (MONTH-PDF-WRITER-PLAN.md step 5). Since step 5 the month view's Export PDF runs the direct writer; on
  // localhost ONLY, localStorage 'sptcal.mvPdfTest' = 'print' sends it down the print path instead (owner
  // ruling, 2 Oct 2026). The engine reads it at click time, so one page may use both routes: call this
  // before the click, and monthPrintPath(false) to go back to the writer.
  function monthPrintPath(on){
    try { if(on === false) localStorage.removeItem('sptcal.mvPdfTest'); else localStorage.setItem('sptcal.mvPdfTest', 'print'); } catch(e){}
  }
  // A stand-in for the OS Save dialog (window.showSaveFilePicker), for the month PDF's Save (step 5) and any leg that
  // needs one: it records each call's options and each file written, its bytes once closed. Push an error NAME onto
  // `fail` to have the next call throw it ('AbortError' is a cancel; 'SecurityError' is a click's activation run out).
  // restore() puts the real one back.
  function fakeSavePicker(){
    var rec = {calls: [], files: [], fail: []}, real = window.showSaveFilePicker;
    window.showSaveFilePicker = async function (o) {
      rec.calls.push(o || {});
      var f = rec.fail.shift();
      if(f) throw new DOMException('test: ' + f, f);
      var file = {name: o && o.suggestedName, parts: [], closed: false, aborted: false, bytes: null};
      return {name: file.name, kind: 'file',
        createWritable: async function () { return {
          write: async function (d) { file.parts.push(d); },
          close: async function () { file.closed = true; file.bytes = new Uint8Array(await new Blob(file.parts).arrayBuffer()); rec.files.push(file); },
          abort: async function () { file.aborted = true; }}; }};
    };
    rec.restore = function () { window.showSaveFilePicker = real; };
    return rec;
  }
  // ⭐ A CALENDAR STATE THE UI NO LONGER MAKES, reached the way a user still has it: inside a saved file. Saves the
  // calendar through the real Save As (fakeSavePicker stands in for the OS picker), hands the snapshot to
  // `mutate(snap)`, and Loads the result through the real Load (openViaFakePicker), answering the unsaved-work question
  // if it comes. Resolves to the snapshot it loaded, once the file menu names `stem`. `opts.writes` goes to
  // openViaFakePicker, so a later plain Save records there ({file, text}).
  // Added 4 Nov 2026, when the waterfall's all-phase hiatus band stopped opening its editor (its name and colour are
  // its sidebar card's): a week's own band label, a blank one included, is now only in a file saved before that.
  // ⚠️ Needs memoryIDB(): Save As stores the new handle in the recents list.
  async function reloadWith(mutate, stem, opts){
    opts = opts || {};
    var rec = fakeSavePicker();
    try {
      await sleep(700);   // Save As drops a second click inside 600 ms (reClickGuard)
      await until(function(){ var b = document.getElementById('save-as-btn'); return !!b && !b.disabled; }, 'Save As', 60, 100);
      document.getElementById('save-as-btn').click();
      await until(function(){ return rec.files.length > 0; }, 'the Save As write', 100, 100);
    } finally { rec.restore(); }
    var snap = JSON.parse(new TextDecoder().decode(rec.files[rec.files.length - 1].bytes));
    mutate(snap);
    var label = function(){ return ((document.getElementById('file-menu-label') || {}).textContent || '').trim(); };
    var p = openViaFakePicker('/x.sptcal', stem + '.sptcal', {text: JSON.stringify(snap), writes: opts.writes});
    for(var i = 0; i < 40; i++){ await sleep(100); if(clickModalButton('Load') || label().indexOf(stem) !== -1) break; }
    await p;
    await until(function(){ return label().indexOf(stem) !== -1; }, 'the reloaded file in the file menu', 100, 100);
    await sleep(800);
    return snap;
  }
  // A PDF's page count, read off the writer's own page objects (and Chrome's: both say /Type /Page per page).
  // ⚠️ Counted by OBJECT NUMBER since the SPTCal mark (2 Nov 2026): the mark's update redefines every page as
  // itself, so a saved PDF holds each page dictionary twice under one number. Chrome's print PDFs and the
  // writers' own bytes count exactly as they did.
  function pdfPages(u8){
    var s = '', seen = {}, n = 0, m, re = /(\d+)\s+0\s+obj\s*<<\s*\/Type\s*\/Page(?![s\w])/g;
    for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    while((m = re.exec(s))) if(!seen[m[1]]){ seen[m[1]] = 1; n++; }
    return n;
  }
  // The SPTCal mark (markPdf in the engine, 2 Nov 2026): a saved PDF is the writer's bytes and then one appended
  // update. Returns {writer, mark} -- `writer` the bytes up to and including the writer's own %%EOF, `mark` what the
  // update says: {prev, creator, producer, pages: [{n, contents: [pre, own, post], pre, post}]} -- or null when the
  // file carries no update (the writer's bytes as they were). Read by the update's own trailer, never by searching
  // the binary: /Prev is the writer's xref, and the first %%EOF after it is where the writer stopped.
  function pdfUnmark(u8){
    var s = '';
    for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    var tr = /trailer\s*<<([^]*?)>>\s*startxref\s+(\d+)\s+%%EOF\s*$/.exec(s.slice(-400));
    var prev = tr && /\/Prev\s+(\d+)/.exec(tr[1]);
    if(!prev) return null;
    var end = s.indexOf('%%EOF\n', +prev[1]);
    if(end < 0) return null;
    end += 6;
    var upd = s.slice(end), info = /\/Info\s+(\d+)\s+0\s+R/.exec(tr[1]);
    var obj = function(n){ var m = new RegExp('(?:^|\\n)' + n + ' 0 obj\\n([^]*?)\\nendobj\\n').exec(upd); return m ? m[1] : null; };
    var str = function(d, k){ var m = d && new RegExp('/' + k + ' \\(((?:\\\\.|[^\\\\)])*)\\)').exec(d); return m ? m[1] : null; };
    var body = function(d){ var m = d && /^<< \/Length (\d+) >>\nstream\n/.exec(d); return m ? d.substr(m[0].length, +m[1]) : null; };
    var pages = [], pm, pre = /(?:^|\n)(\d+) 0 obj\n(<< \/Type \/Page [^]*?)\nendobj\n/g;
    while((pm = pre.exec(upd))){
      var c = /\/Contents \[(\d+) 0 R (\d+) 0 R (\d+) 0 R\]/.exec(pm[2]);
      pages.push({n: +pm[1], dict: pm[2], contents: c ? [+c[1], +c[2], +c[3]] : null,
                  pre: c ? body(obj(c[1])) : null, post: c ? body(obj(c[3])) : null});
    }
    var infoDict = info ? obj(info[1]) : null;
    return {writer: u8.subarray(0, end), mark: {prev: +prev[1], trailer: tr[1].trim(), info: infoDict,
            creator: str(infoDict, 'Creator'), producer: str(infoDict, 'Producer'), pages: pages, bytes: u8.length - end}};
  }
  // ⭐ EVERY STREAM OF A PDF, CUT AT ITS OWN /Length (5 Nov 2026). The one stream reader for the legs that read a
  // PDF's text: pdfStreams(u8) -> [{at, dict, bytes, byLength, flate, text}], `text` the stream inflated (UTF-8,
  // as every leg's copy read it) or null when it is not Flate or did not inflate; pdfInflated(u8) -> the texts
  // that did inflate, in file order; pdfRuns(u8) -> every "(text) Tj" literal in them, escapes undone ("\(" -> "(").
  // ⛔ NEVER TRIM THE EOL BEFORE `endstream` INSTEAD. Chrome's DecompressionStream rejects any byte after the
  // compressed data, so the copies these replaced found `endstream` and stripped trailing 0x0A / 0x0D bytes. But
  // compressed data can END in 0x0A or 0x0D itself, and stripping that byte truncates it: inflation throws (as
  // "TypeError: Failed to fetch" from Response.text()), the copy's catch swallowed it, and the leg saw no text at
  // all. Found twice: hiatuslabel N1-2 (23 Oct 2026, a header date of 10.23.26), then phiatusnum H4 (5 Nov 2026,
  // red on v1.11.0 because the layout rules' widths made page 1's content stream /Length 1466 end in an EOL byte;
  // the PDF was valid, pdftotext read every run). Twelve legs carried the trimming copy, so any of them could go
  // red the same way whenever a PDF's bytes moved.
  // The cut: `/Length N`, a DIRECT integer in the stream's own dictionary (the text from its "<n> <g> obj" to the
  // `stream` keyword; never /Length1, a font program's raw length, and never "/Length 12 0 R", an indirect one),
  // then N bytes after the keyword's EOL, accepted only when `endstream` follows them (after an optional EOL).
  // Anything else (no direct length, or a length that does not land on `endstream`) falls back to the old trim,
  // which is right whenever the data does not end in an EOL byte. Reading by length also STEPS OVER the data, so a
  // binary stream can no longer be mistaken for a `stream` keyword, and `endstream` is no longer one either.
  // ⚠️ A /FlateDecode stream cut at a verified length that still fails to inflate THROWS, never skips: a reader
  // that silently returns nothing is how this bug read as "no such text" for a day. A trimmed fallback that fails
  // is skipped, as before, since the trim itself may be what broke it.
  // The SPTCal mark (pdfUnmark above) adds its own streams after the writer's %%EOF: `<< /Length N >>`, no filter,
  // so they are cut by length and left uninflated (`text` null), exactly as the copies left them.
  async function pdfStreams(u8){
    var s = '';
    for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    var out = [], re = /stream(\r\n|\n)/g, m;
    while((m = re.exec(s))){
      if(s.slice(m.index - 3, m.index) === 'end') continue;          // the `endstream` keyword, not a stream
      var st = m.index + m[0].length;
      var objAt = s.lastIndexOf(' obj', m.index), dict = objAt >= 0 ? s.slice(objAt + 4, m.index) : '';
      // (?![\d.]) first, or the digits would backtrack out of the indirect test ("12 0 R" read as 1).
      var lm = /\/Length\s+(\d+)(?![\d.])(?!\s+\d+\s+R)/.exec(dict), en = -1, byLength = false;
      if(lm){
        var cut = st + parseInt(lm[1], 10), k = cut;
        if(s.charCodeAt(k) === 13) k++;
        if(s.charCodeAt(k) === 10) k++;
        if(cut <= u8.length && s.startsWith('endstream', k)){ en = cut; byLength = true; }
      }
      if(!byLength){
        en = s.indexOf('endstream', st);
        if(en < 0) continue;
        while(en > st && (u8[en - 1] === 10 || u8[en - 1] === 13)) en--;
      }
      var bytes = u8.subarray(st, en), flate = /\/FlateDecode\b/.test(dict) || !lm, text = null;
      if(flate){
        try {
          text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).text();
        } catch(e){
          if(byLength && /\/FlateDecode\b/.test(dict))
            throw new Error('pdfStreams: the /FlateDecode stream at byte ' + st + ' (/Length ' + lm[1] + ') did not inflate: ' + (e && e.message || e));
        }
      }
      out.push({at: st, dict: dict.trim(), bytes: bytes, byLength: byLength, flate: flate, text: text});
      re.lastIndex = en;                                             // step over the data
    }
    return out;
  }
  async function pdfInflated(u8){
    return (await pdfStreams(u8)).filter(function(x){ return x.text !== null; }).map(function(x){ return x.text; });
  }
  async function pdfRuns(u8){
    var runs = [];
    (await pdfInflated(u8)).forEach(function(t){
      var tj = /\(((?:\\.|[^\\)])*)\) Tj/g, x;
      while((x = tj.exec(t))) runs.push(x[1].replace(/\\(.)/g, '$1'));
    });
    return runs;
  }
  // ⭐ THE SETTINGS WINDOW (owner ruling 12, 20 Oct 2026) is what the sidebar's Settings TAB used to
  // be: Region and holidays, the preferences, the header presets, Export App With Data. Its tabs are
  // 'prefs' | 'region' | 'presets' (Mantine derives the tab ids from #settings-tabs). 'calendar' is still
  // accepted and opens 'prefs': the Calendar tab was merged into Preferences (owner, 20 Oct 2026), and a
  // leg written before that names it. Every
  // control in it is in the DOM whether or not it is open, so a leg that only SETS values by id needs
  // none of this; one that clicks, hit-tests or measures a control must open it first, on the right
  // tab, and wait out the 180 ms slide.
  async function openSettings(tab){
    var win = document.getElementById('settings-window');
    if(!win) throw new Error('no #settings-window');
    // ⚠️ THE SLIDE NEVER FINISHES HEADLESS. It is a CSS transition, and this harness's Chrome produces no
    // frames (the same reason requestAnimationFrame never fires here), so the window would sit at
    // translateX(-100%) forever -- and, closing, `display ... allow-discrete` would keep it displayed
    // forever. Switched off on the element, test-only; what the window shows and stores is unchanged.
    // (Since 23 Oct 2026 the build has no slide at all -- owner: "just have the menu already there" -- so
    // this does nothing there. It stays for an older build, a rollback or a leg on an older branch.)
    win.style.transition = 'none';
    if(!win.classList.contains('is-open')){
      var b = document.querySelector('.side-settings-btn');
      if(!b) throw new Error('no .side-settings-btn');
      b.click();
    }
    if(tab === 'calendar') tab = 'prefs';
    if(tab){
      var t = document.getElementById('settings-tabs-tab-' + tab);
      if(!t) throw new Error('no Settings tab ' + tab);
      t.click();
    }
    // Open, it sits on the sidebar BELOW the rail (owner, 23 Oct 2026: it no longer covers Show / Phases /
    // Settings), so its top is the rail's bottom edge, not the sidebar's top.
    var aside = document.querySelector('.form-panel'), rail = document.querySelector('.side-tabs');
    await until(function(){
      var r = win.getBoundingClientRect(), a = aside.getBoundingClientRect();
      var top = rail ? rail.getBoundingClientRect().bottom : a.top;
      return win.classList.contains('is-open') && Math.abs(r.left - a.left) < 1 && Math.abs(r.top - top) < 1;
    }, 'the Settings window to open', 40, 50);
  }
  // Closed the way a user closes it now: the rail's Settings button again (the window lost its x with
  // its head, 23 Oct 2026). A leg on an older branch still has the x, so that is used when it is there.
  async function closeSettings(){
    var win = document.getElementById('settings-window');
    if(!win || !win.classList.contains('is-open')) return;
    win.style.transition = 'none';   // see openSettings
    var c = win.querySelector('.sw-close') || document.querySelector('.side-settings-btn'); if(c) c.click();
    await until(function(){ return getComputedStyle(win).display === 'none'; }, 'the Settings window to close', 40, 50);
  }
  // Which Settings tab holds an element ('prefs' | 'region' | 'presets'), or null.
  function settingsTabOf(el){
    var p = el && el.closest && el.closest('#settings-window [role="tabpanel"]');
    var m = p && /-panel-(\w+)$/.exec(p.id);
    return m ? m[1] : null;
  }
  // Is a control laid out where the user would see it? For one in the Settings window, opens the tab
  // that holds it first: only one tab is displayed at a time, and the by-view and contextual rules
  // hide cards and rows with display:none.
  async function shownInSettings(id){
    var el = document.getElementById(id);
    if(!el) return false;
    var t = settingsTabOf(el);
    if(t) await openSettings(t);
    return el.getClientRects().length > 0;
  }
  // ⭐ THE PHASE BAR SIZE (MONTH-BAR-SIZE-PLAN.md step 3). `?barsize=large|xl` (HARNESS_QUERY) puts the calendar on
  // screen at that size, through the control's own radio, exactly as a click picks it (one undo step, the file
  // dirtied), so the month legs can run any calendar at a size without a fixture per size. Returns the size set, or ''
  // when the query names none. A leg that builds the writer's model passes barSizeShown(), the size on screen, which
  // is also a sized FIXTURE's size: the size is read off <body>'s class, as legacy.css's rules read it.
  // ?barsize=11|large|13|xl (or 12 / 14 for large / xl) picks the phase bar size through its dropdown,
  // #pref-mv-barsize, as a user picks it (MONTH-NOTE-SIZE-PLAN.md §1a: a dropdown since 2 Nov 2026, Standard /
  // Large / Extra large segments before). ?notesize=11-14 picks the note size through #pref-mv-notesize.
  async function pickSelect(id, value, label){
    var sel = document.getElementById(id);
    if(!sel) throw new Error('no #' + id);
    if(![].some.call(sel.options, function(o){ return o.value === value; })) throw new Error('#' + id + ' has no option ' + value);
    sel.value = value;
    sel.dispatchEvent(new Event('change', {bubbles: true}));
    await sleep(300);
    return label;
  }
  async function applyBarSizeQuery(){
    var q = (/[?&]barsize=(11|12|13|14|large|xl)\b/.exec(location.search) || [])[1] || '';
    if(!q) return '';
    q = q === '12' ? 'large' : q === '14' ? 'xl' : q;
    await pickSelect('pref-mv-barsize', q, q);
    await until(function(){ return document.body.classList.contains('mv-bar-' + q); }, 'the ' + q + ' bar size', 50, 100);
    await sleep(300);
    return q;
  }
  async function applyNoteSizeQuery(){
    var q = (/[?&]notesize=(11|12|13|14)\b/.exec(location.search) || [])[1] || '';
    if(!q) return '';
    await pickSelect('pref-mv-notesize', q, q);
    await until(function(){ return document.body.classList.contains('mv-note-sized'); }, 'the ' + q + ' px note size', 50, 100);
    await sleep(300);
    return q;
  }
  function barSizeShown(){
    var c = document.body.classList;
    return c.contains('mv-bar-xl') ? 'xl' : c.contains('mv-bar-13') ? '13' : c.contains('mv-bar-large') ? 'large' : c.contains('mv-bar-11') ? '11' : '';
  }
  function noteSizeShown(){
    var n = document.getElementById('pref-mv-notesize');
    return n ? n.value : '';
  }
  // ⭐ THE SHIFT BOX (the list first, 9 Nov 2026; ANCHOR-TO-DIRECTION-PLAN.md §7.6). The What moves buttons are gone:
  // a leg says what moves through the LIST, as a user does. These press with real pointer events, the path the mouse
  // takes (the list's pointerdown); a dispatched `click` only reaches its tap path. The box must be open: the rows
  // are found by their place on the page.
  //   shiftRow(key)                 the phase's row (throws when it has none)
  //   shiftPress(key, where)        press and release: 'row' (its name: chooses the row, no tick changes; the default)
  //                                 or 'box' (its tick box: flips the tick)
  //   shiftDrag(from, to, where)    press on `from`, drag over each row in `to` (a key, or keys in order), release
  //   shiftSide('prior'|'after', key)  choose the row, then press "Prior to X" / "After X": what Phase & before /
  //                                 Phase & after on that phase used to set
  // ⭐ BUILD AROUND'S LIST is pressed the same way since 10 Nov 2026 (it took Shift's look and feel): solveRow /
  // solvePress / solveDrag are these helpers on #pop-solve. There a press on the row itself PINS the phase.
  var listSel = '#pop-shift [data-shift-list]';
  function onList(sel, fn){ var was = listSel; listSel = sel; try { return fn(); } finally { listSel = was; } }
  function shiftRow(key){
    var rows = document.querySelectorAll(listSel + ' .solve-row[data-key]');
    for(var i = 0; i < rows.length; i++) if(rows[i].dataset.key === key) return rows[i];
    throw new Error('no row for ' + key + ' in ' + listSel);
  }
  function shiftPoint(key, where){
    var row = shiftRow(key), el = where === 'box' ? row.querySelector('input[type=checkbox]') : row.querySelector('.solve-nm');
    if(!el) throw new Error('no ' + where + ' in the row for ' + key);
    var r = el.getBoundingClientRect();
    if(!r.height) throw new Error('the box is not open (' + listSel + ')');
    return {el: el, x: r.left + r.width / 2, y: r.top + r.height / 2};
  }
  function shiftPointer(type, target, x, y){
    target.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y}));
  }
  function pressNow(key, where){
    var p = shiftPoint(key, where || 'row');
    shiftPointer('pointerdown', p.el, p.x, p.y); shiftPointer('pointerup', document, p.x, p.y);
  }
  function dragNow(from, to, where){
    var a = shiftPoint(from, where || 'row'), last = a;
    shiftPointer('pointerdown', a.el, a.x, a.y);
    // Each point is read AFTER the step before it: the list is redrawn as the drag goes.
    (Array.isArray(to) ? to : [to]).forEach(function(k){ last = shiftPoint(k, 'row'); shiftPointer('pointermove', document, last.x, last.y); });
    shiftPointer('pointerup', document, last.x, last.y);
  }
  async function shiftPress(key, where){ pressNow(key, where); await sleep(80); }
  async function shiftDrag(from, to, where){ dragNow(from, to, where); await sleep(80); }
  var SOLVE_LIST = '#pop-solve [data-solve-list]';
  function solveRow(key){ return onList(SOLVE_LIST, function(){ return shiftRow(key); }); }
  // A press on a Build Around row pins it (the dropdown's own change redraws the list, which runs the solvers), so
  // these wait longer than Shift's.
  async function solvePress(key, where){ onList(SOLVE_LIST, function(){ pressNow(key, where); }); await sleep(450); }
  async function solveDrag(from, to, where){ onList(SOLVE_LIST, function(){ dragNow(from, to, where); }); await sleep(450); }
  async function shiftSide(side, key){
    await shiftPress(key, 'row');
    var b = document.querySelector('#pop-shift ' + (side === 'prior' ? '[data-shift-prior]' : '[data-shift-after]'));
    if(!b) throw new Error('no ' + side + ' button in the Shift box');
    b.click();
    await sleep(120);
  }
  function done(o){ scrubSurrogates(); document.getElementById('R').textContent=JSON.stringify(o); }
  return {set:set,sleep:sleep,shiftRow:shiftRow,shiftPress:shiftPress,shiftDrag:shiftDrag,shiftSide:shiftSide,
          solveRow:solveRow,solvePress:solvePress,solveDrag:solveDrag,buildFixture:buildFixture,showHolidaysInSheet:showHolidaysInSheet,
          typeUserNote:typeUserNote,openCell:openCell,addHiatus:addHiatus,openViaFakePicker:openViaFakePicker,
          formSignature:formSignature,appHealth:appHealth,until:until,appReady:appReady,
          clippedCells:clippedCells,gridWidthPt:gridWidthPt,colList:colList,
          gridSignature:gridSignature,captureDownload:captureDownload,captureExport:captureExport,b64:b64,done:done,
          memoryIDB:memoryIDB,modalText:modalText,clickModalButton:clickModalButton,scrubSurrogates:scrubSurrogates,
          latestBackup:latestBackup,altSwap:altSwap,monthPrintPath:monthPrintPath,fakeSavePicker:fakeSavePicker,reloadWith:reloadWith,pdfPages:pdfPages,pdfUnmark:pdfUnmark,pdfStreams:pdfStreams,pdfInflated:pdfInflated,pdfRuns:pdfRuns,
          openSettings:openSettings,closeSettings:closeSettings,settingsTabOf:settingsTabOf,shownInSettings:shownInSettings,
          pdfDialog:pdfDialog,pdfDialogPick:pdfDialogPick,applyBarSizeQuery:applyBarSizeQuery,barSizeShown:barSizeShown,
          applyNoteSizeQuery:applyNoteSizeQuery,noteSizeShown:noteSizeShown,pickSelect:pickSelect,
          rebuildAll:rebuildAll, solveKeepSide:solveKeepSide};
})();
