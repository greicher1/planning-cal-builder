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
  // Alt+Left / Alt+Right on the document: the column swap's keyboard path. The toolbar's
  // ◀ Swap / Swap ▶ buttons only duplicated it, and they went with owner ruling 2 (30 Sep 2026),
  // so the swap legs press the keys. The engine's handler needs a live selection in the
  // Waterfall and ignores the keys while focus is in a text field, exactly as for a user.
  function altSwap(dir){
    document.dispatchEvent(new KeyboardEvent('keydown', {key: dir < 0 ? 'ArrowLeft' : 'ArrowRight', altKey: true, bubbles: true, cancelable: true}));
  }
  // A realistic 10-episode US-General calendar spanning two year blocks, with every phase dated
  // so the notes column carries milestones AND holidays.
  function buildFixture(){
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
    var mtime = Date.now() - 60000;
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
  // A PDF's page count, read off the writer's own page objects (and Chrome's: both say /Type /Page per page).
  function pdfPages(u8){
    var s = '';
    for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return (s.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
  }
  function done(o){ scrubSurrogates(); document.getElementById('R').textContent=JSON.stringify(o); }
  return {set:set,sleep:sleep,buildFixture:buildFixture,showHolidaysInSheet:showHolidaysInSheet,
          typeUserNote:typeUserNote,addHiatus:addHiatus,openViaFakePicker:openViaFakePicker,
          formSignature:formSignature,appHealth:appHealth,until:until,appReady:appReady,
          clippedCells:clippedCells,gridWidthPt:gridWidthPt,colList:colList,
          gridSignature:gridSignature,captureDownload:captureDownload,captureExport:captureExport,b64:b64,done:done,
          memoryIDB:memoryIDB,modalText:modalText,clickModalButton:clickModalButton,scrubSurrogates:scrubSurrogates,
          latestBackup:latestBackup,altSwap:altSwap,monthPrintPath:monthPrintPath,fakeSavePicker:fakeSavePicker,pdfPages:pdfPages};
})();
