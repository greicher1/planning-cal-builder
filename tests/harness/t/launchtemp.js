// launchtemp -- a .sptcal double-clicked from an email attachment (audit AUD2-017, item 2.6). The OS hands the file over
// through launchQueue and it becomes the linked file: Save and autosave write back to it with no picker (owner, 1 Oct
// 2026; launchopen L4), which stays so -- the audit's default is NO extra dialog on the first Save. What was missing:
// nothing said where that file lives (a mail app's attachment folder, which it may empty), and once it was gone Save
// failed with the browser's raw error and never offered Save As. Grown from the audit's repro legs
// (repro/audit-vr16-launchtmp.js, -launchtmp2.js), which this build failed.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh launchtemp 240
//
// L5b and L9 were added by the 14 Nov 2026 review: a shareable copy's strip carried the launched file's NAME in its
// (hidden) text, and the strip's Save As ran while a Save was still writing. Both red on the reviewed build.
//
// Like launchopen, it replaces window.launchQueue before the engine boots (this script runs ahead of the deferred
// module) with a fake that delivers launches exactly as Chrome does, and uses the in-memory IndexedDB. The handles are
// fakes; one can vanish (NotFoundError), standing for the mail app emptying its folder. The OS Save dialog is
// t/lib.js's fakeSavePicker.
window.__T.memoryIDB();
(function seed(){
  function get(u){ var x = new XMLHttpRequest(); x.open('GET', u, false); x.send(); return x.responseText; }
  window.__TXT = { A: get('/tests/fixtures/v1.4.2-saved.sptcal'), B: get('/tests/fixtures/show-a.sptcal') };   // "Test Show", "SHOW A"
  window.__mkHandle = function(name, key){
    var txt = window.__TXT[key], mtime = Date.now() - 60000;
    var gone = function(){ return new DOMException('A requested file or directory could not be found', 'NotFoundError'); };
    var h = { name: name, kind: 'file', writes: [], gone: false,
      queryPermission: async function(){ if(h.gone) throw gone(); return 'granted'; },
      requestPermission: async function(){ return 'granted'; },
      isSameEntry: async function(other){ return other === h; },
      getFile: async function(){ if(h.gone) throw gone(); return new File([txt], name, {type: 'application/json', lastModified: mtime}); },
      createWritable: async function(){
        if(h.gone) throw gone();
        if(h.hold) await h.hold;   // L9: a write held open, so a Save stays in flight
        var parts = [];
        return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); },
                 close: async function(){ txt = parts.join(''); mtime = Math.max(Date.now(), mtime + 1000); h.writes.push(txt); } };
      } };
    return h;
  };
  var consumer = null, queued = [];
  var fake = { setConsumer: function(fn){ consumer = fn; queued.splice(0).forEach(function(p){ setTimeout(function(){ fn(p); }, 0); }); } };
  try { Object.defineProperty(window, 'launchQueue', {configurable: true, get: function(){ return fake; }}); }
  catch(e){ window.__LQERR = String(e); }
  window.__launch = function(files){ var p = {files: files, targetURL: location.href}; if(consumer) consumer(p); else queued.push(p); };
  window.__H = { A: window.__mkHandle('Invented Show.sptcal', 'A') };
  window.__launch([window.__H.A]);   // the COLD launch
})();

window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id){ return document.getElementById(id); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function title(){ return byId('show-title').value; }
  function label(){ return txt(byId('file-menu-label')); }
  function status(){ return txt(byId('save-status')); }
  function recents(){ return Array.prototype.map.call(document.querySelectorAll('#file-menu .file-menu-item[data-id]'), txt); }
  function strip(){ var e = byId('launch-notice'); return {up: !!e && !e.hidden && e.offsetHeight > 0, text: txt(e && e.querySelector('.ln-text'))}; }
  function written(s){ try { return JSON.parse(s).fields.byId['weeks-post'].value; } catch(e){ return '?'; } }
  async function noModal(ms){ for(var i = 0; i < ms / 100; i++){ await T.sleep(100); var m = T.modalText(); if(m) return m; } return ''; }
  async function saveFree(){
    await T.sleep(1400);   // flashSaveBtn holds the button for 1.2 s
    await T.until(function(){ var b = byId('save-file-btn'); return b && !b.disabled; }, 'the Save button', 200, 100);
  }
  async function menuItem(sel){
    if(!document.querySelector('#file-menu')){
      document.querySelector('.file-menu-btn').click();
      await T.until(function(){ return !!document.querySelector('#file-menu .file-menu-item[data-action="open"]'); }, 'the file menu', 200, 100);
    }
    return document.querySelector('#file-menu .file-menu-item' + sel);
  }
  try {
    if(window.__LQERR) throw new Error('could not replace window.launchQueue: ' + window.__LQERR);
    await T.appReady();
    var pick = T.fakeSavePicker();   // the OS Save dialog, for the whole leg

    // ---- L1: the cold launch raises the strip -----------------------------------------------------------------
    await T.until(function(){ return title() === 'Test Show' && strip().up; }, 'the launched calendar and its strip', 200, 100);
    var during = await noModal(1500);
    var s1 = strip(), el = byId('launch-notice');
    add('L1', 'a double-clicked calendar loads with a strip saying where Save writes, and offering Save As; no dialog',
      label() === 'Invented Show.sptcal' && /Invented Show\.sptcal was opened from another app/.test(s1.text) && /Save writes back to that copy/.test(s1.text) &&
      /email/.test(s1.text) && txt(el.querySelector('.ln-go')) === 'Save As…' && !during,
      {label: label(), strip: s1, button: txt(el.querySelector('.ln-go')), modal: during}, 'the strip names Invented Show.sptcal; Save As…; no dialog');
    add('L1b', 'the strip carries no ids and no form fields (nothing collectFieldValues could sweep into a saved file)',
      el.querySelectorAll('[id]').length === 0 && el.querySelectorAll('input, select, textarea').length === 0,
      {ids: el.querySelectorAll('[id]').length, fields: el.querySelectorAll('input, select, textarea').length}, '0 and 0');

    // ---- L2: the first Save writes back, as before: no picker, no extra dialog ------------------------------------
    T.set('weeks-post', '14'); await T.sleep(800);
    byId('save-file-btn').click();
    await T.until(function(){ return window.__H.A.writes.length > 0; }, 'Save to write the launched file', 200, 100);
    var ask = await noModal(800);
    add('L2', 'the first Save writes straight back to the double-clicked file: no picker, no dialog; the strip stays',
      pick.calls.length === 0 && written(window.__H.A.writes[0]) === '14' && !ask && strip().up,
      {pickerCalls: pick.calls.length, written: written(window.__H.A.writes[0]), modal: ask, strip: strip().up}, '0 picker calls; 14 written; strip up');

    // ---- L3/L4: x hides it; the next double-click raises it again ------------------------------------------------
    el.querySelector('.ln-x').click(); await T.sleep(400);
    add('L3', 'the strip\'s x hides it, and the file stays linked', !strip().up && label() === 'Invented Show.sptcal',
      {strip: strip().up, label: label()}, 'hidden; still Invented Show.sptcal');
    await saveFree();
    var hB = window.__mkHandle('Show A.sptcal', 'B');
    window.__launch([hB]);
    await T.until(function(){ return title() === 'SHOW A' && strip().up; }, 'the second launch and its strip', 200, 100);
    add('L4', 'once per double-click: the next launched file raises it again, naming that file',
      /Show A\.sptcal was opened from another app/.test(strip().text), {strip: strip()}, 'names Show A.sptcal');

    // ---- L5: a shareable copy exported meanwhile carries the strip hidden ----------------------------------------
    var cap = T.captureDownload();
    byId('share-copy-btn').click();   // Export App With Data (the engine's delegated listener)
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var tag = (html.match(/<div id="launch-notice"[^>]*>/) || [null])[0];
    add('L5', 'a shareable copy exported while the strip is up carries it hidden', !!tag && /\shidden(\s|>|=)/.test(tag) && strip().up,
      {tag: tag, stillUpHere: strip().up}, 'hidden in the file; still up here');
    // L5b (the 14 Nov 2026 review): hidden is not enough, the strip's TEXT still named the file the sender double-clicked.
    var copyDoc = new DOMParser().parseFromString(html, 'text/html');
    var copyText = copyDoc.querySelector('#launch-notice .ln-text');
    add('L5b', '...and with its text emptied: the copy never carries the name of the file the sender double-clicked',
      !!copyText && copyText.textContent.trim() === '' && copyText.children.length === 0 && /Show A\.sptcal/.test(strip().text),
      {copyText: copyText && copyText.innerHTML, hereText: strip().text}, 'empty in the file; still "Show A.sptcal" here');

    // ---- L6: Load... and New put it away -------------------------------------------------------------------------
    window.showOpenFilePicker = async function(){ return [window.__mkHandle('Loaded.sptcal', 'A')]; };
    (await menuItem('[data-action="open"]')).click();
    await T.until(function(){ return label() === 'Loaded.sptcal'; }, 'Load... to finish', 200, 100);
    await T.sleep(600);
    var afterLoad = strip().up;
    window.__launch([window.__mkHandle('Again.sptcal', 'B')]);
    await T.until(function(){ return label() === 'Again.sptcal' && strip().up; }, 'a launch after Load', 200, 100);
    byId('new-file-btn').click();
    await T.until(function(){ return label() === 'Untitled'; }, 'New', 200, 100);
    await T.sleep(400);
    add('L6', 'loading another calendar (Load...) or New takes the strip away', afterLoad === false && !strip().up,
      {afterLoad: afterLoad, afterNew: strip().up}, 'gone after each');

    // ---- L7: the strip's Save As... ------------------------------------------------------------------------------
    var hC = window.__mkHandle('Invented Show.sptcal', 'A');
    window.__launch([hC]);
    await T.until(function(){ return label() === 'Invented Show.sptcal' && strip().up; }, 'a third launch', 200, 100);
    T.set('weeks-post', '13'); await T.sleep(800);
    byId('launch-notice').querySelector('.ln-go').click();
    await T.until(function(){ return pick.files.length === 1; }, 'the strip\'s Save As to write', 200, 100);
    await T.sleep(800);
    var f1 = new TextDecoder().decode(pick.files[0].bytes);
    add('L7', 'the strip\'s Save As offers the file\'s own name, writes the calendar there, and the strip goes',
      pick.calls.length === 1 && pick.calls[0].suggestedName === 'Invented Show.sptcal' && written(f1) === '13' && !strip().up && hC.writes.length === 0,
      {suggested: pick.calls[0].suggestedName, written: written(f1), strip: strip().up, launchedWrites: hC.writes.length}, 'Invented Show.sptcal; 13; gone; nothing in the launched copy');
    await saveFree();
    T.set('weeks-post', '12'); await T.sleep(800);
    byId('save-file-btn').click();
    await T.until(function(){ return pick.files.length === 2; }, 'Save into the kept copy', 200, 100);
    await T.sleep(600);
    var last = pick.files[1].parts[pick.files[1].parts.length - 1];   // fakeSavePicker's handle keeps one parts list
    add('L7b', 'from then on Save writes to the kept copy, never to the attachment', written(typeof last === 'string' ? last : '') === '12' && hC.writes.length === 0 && pick.calls.length === 1,
      {written: written(typeof last === 'string' ? last : ''), launchedWrites: hC.writes.length, pickerCalls: pick.calls.length}, '12 in the kept copy; 0 in the attachment');

    // ---- L8: the mail app empties its folder, then Save ----------------------------------------------------------
    await saveFree();
    var hD = window.__mkHandle('Purged.sptcal', 'A');
    window.__launch([hD]);
    await T.until(function(){ return label() === 'Purged.sptcal' && strip().up; }, 'a fourth launch', 200, 100);
    T.set('weeks-post', '11'); await T.sleep(800);
    hD.gone = true;
    byId('save-file-btn').click();
    await T.until(function(){ return !!T.modalText(); }, 'Save\'s answer', 200, 100);
    await T.sleep(200);
    var m = T.modalText();
    add('L8', 'the double-clicked file is gone: Save says so in plain words and offers Save As; the dead file leaves Recents and the strip goes',
      /File not found/.test(m) && /“Purged\.sptcal” can’t be found/.test(m) && /Save As/.test(m) && !/requested file or directory|Something went wrong/.test(m) &&
      recents().indexOf('Purged.sptcal') === -1 && !strip().up,
      {modal: m, recents: recents(), strip: strip().up}, 'File not found; Save As; Purged gone from Recents; strip hidden');
    var clicked = T.clickModalButton('Save As…');
    try { await T.until(function(){ return pick.files.length === 3; }, 'Save As after the purge', 200, 100); }
    catch(e){ out.diag = {clicked: clicked, modalNow: T.modalText(), calls: pick.calls.length, files: pick.files.length, status: status(), label: label(),
      btns: Array.prototype.map.call(document.querySelectorAll('.mantine-Modal-content button'), function(b){ return txt(b); }), errs: T.appHealth().errors}; throw e; }
    await T.sleep(600);
    add('L8b', '...and Save As keeps the work, suggesting the lost file\'s name',
      pick.calls[pick.calls.length - 1].suggestedName === 'Purged.sptcal' && written(new TextDecoder().decode(pick.files[2].bytes)) === '11' && /^Saved/.test(status()),
      {suggested: pick.calls[pick.calls.length - 1].suggestedName, written: written(new TextDecoder().decode(pick.files[2].bytes)), status: status()}, 'Purged.sptcal; 11; Saved');

    // ---- L9 (the 14 Nov 2026 review): the strip's Save As does nothing while a Save is in flight, as the toolbar's Save ---
    await saveFree();
    var hE = window.__mkHandle('Held.sptcal', 'B');
    window.__launch([hE]);
    await T.until(function(){ return label() === 'Held.sptcal' && strip().up; }, 'a fifth launch', 200, 100);
    T.set('weeks-post', '10'); await T.sleep(800);
    var release = null; hE.hold = new Promise(function(r){ release = r; });
    var calls0 = pick.calls.length, files0 = pick.files.length;
    byId('save-file-btn').click();                       // Save, held at the write: in flight
    await T.sleep(400);
    byId('launch-notice').querySelector('.ln-go').click();
    await T.sleep(1200);
    var mid9 = {pickerCalls: pick.calls.length - calls0, files: pick.files.length - files0, strip: strip().up, label: label()};
    release();
    await T.until(function(){ return hE.writes.length === 1; }, 'the held Save to finish', 200, 100);
    await T.sleep(600);
    add('L9', 'while a Save is in flight the strip\'s Save As does nothing: no picker, no second file; the Save then writes back as before',
      mid9.pickerCalls === 0 && mid9.files === 0 && mid9.strip && written(hE.writes[0]) === '10' && pick.calls.length === calls0 && label() === 'Held.sptcal'
        && !byId('launch-notice').querySelector('.ln-go').disabled,
      {during: mid9, written: written(hE.writes[0]), pickerCallsAfter: pick.calls.length - calls0, label: label(), goDisabled: byId('launch-notice').querySelector('.ln-go').disabled},
      'nothing during the Save; 10 written to Held.sptcal');

    var errs = T.appHealth().errors.filter(function(e){ return e.indexOf('warn:') !== 0; });
    add('E0', 'no console errors or exceptions (warnings are the expected diagnostics)', errs.length === 0, {errors: T.appHealth().errors.slice(0, 8)}, '[]');
  } catch (e) { cases.push({id: 'EX', title: 'the leg threw', pass: false, observed: String(e && e.stack || e).slice(0, 600)}); }
  out.test = 'launchtemp'; out.cases = cases; out.modal = T.modalText();
  T.done(out);
})(); });
