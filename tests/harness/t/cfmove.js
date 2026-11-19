// cfmove -- SPTCal's move to sptcal.pages.dev behind a Cloudflare Access sign-in (CLOUDFLARE-ACCESS-PLAN.md, owner,
// 18 Nov 2026): what the app itself does about it.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh cfmove 180
//
// The install gate's "moved" screen is pwagate's S-moved; this leg covers the rest.
//
// Phase 1 (an ordinary localhost page):
//   M0  control: no hook, so #update-notice stays hidden and is the update strip as it always was
//   L1  an older .html calendar loaded through the real Load, then Save: the app ASKS, naming the file, with
//       "Save as .sptcal…" (plan §7a; it used to write the .html back, a whole working copy of the app)
//   L2  answering it opens the save picker offering "<name>.sptcal", and what is written is the calendar's DATA
//       (JSON), never the app; nothing is written to the .html file
//   L3  Cancel instead: nothing is written anywhere and no picker opens
//   L4  with unsaved work on an .html calendar the status line says autosave is paused and why
//   X1  "Export App With Data" is gone: no visible control by that name anywhere (on localhost a hidden test
//       button remains for the legs that still build a copy)
// Phase 2 (reloaded with localStorage 'sptcal.movedTest' = '1', the localhost stand-in for the old host):
//   M1  #update-notice shows "SPTCal has moved …" with "Go to the new SPTCal"
//   M2  the button opens https://sptcal.pages.dev/ in a new window (window.open, recorded), and the page stays
//   M3  the x hides it
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); progress(id); }
  function progress(step){ var r = document.getElementById('R'); if(r) r.textContent = 'pending ' + step + ' ' + JSON.stringify(cases.map(function(c){ return c.id + ':' + c.pass; })); }
  function store(){ try { sessionStorage.setItem('cfmove-cases', JSON.stringify(cases)); } catch(e){} }
  function strip(){
    var el = document.getElementById('update-notice');
    if(!el) return {exists: false};
    var go = el.querySelector('.ln-go');
    return {exists: true, shown: !el.hidden && el.offsetParent !== null,
            text: ((el.querySelector('.ln-text') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
            go: go ? go.textContent.trim() : null};
  }
  function status(){ return ((document.getElementById('save-status') || {}).textContent || '').trim(); }
  var phase = null; try { phase = sessionStorage.getItem('cfmove-phase'); } catch(e){}
  try {
    if(phase !== '2'){
      try { localStorage.removeItem('sptcal.movedTest'); } catch(e){}
      await T.sleep(1500);
      var s0 = strip();
      add('M0', 'control: no hook, the update strip stays hidden and is not the moved strip',
        s0.exists && !s0.shown && s0.text.indexOf('SPTCal has moved') < 0, s0, 'hidden');

      // ---- An older .html calendar, loaded through the real Load, then Save ----
      var W = [];
      await T.openViaFakePicker('/tests/fixtures/v1.0.0-saved.html', 'v1.0.0-saved.html', {writes: W});
      await T.until(function(){ return (document.getElementById('show-title') || {}).value !== undefined; }, 'the load', 50, 100);
      await T.sleep(800);
      var rec = T.fakeSavePicker();
      document.getElementById('save-file-btn').click();
      await T.until(function(){ return /older \.html calendar/.test(T.modalText()); }, 'the Save question', 50, 100).catch(function(){});
      var q = T.modalText();
      add('L1', 'Save on an older .html calendar asks first, naming it, and offers "Save as .sptcal…"',
        /v1\.0\.0-saved\.html/.test(q) && /older \.html calendar/.test(q) && /Save as \.sptcal/.test(q) && W.length === 0 && rec.calls.length === 0,
        {dialog: q.slice(0, 300), writesToHtml: W.length, pickerCalls: rec.calls.length}, 'asked; nothing written yet');

      T.clickModalButton('Cancel');
      await T.sleep(800);
      add('L3', 'Cancel: nothing is written anywhere and no picker opens',
        W.length === 0 && rec.calls.length === 0 && !T.modalText(), {writesToHtml: W.length, pickerCalls: rec.calls.length, dialog: T.modalText()}, 'nothing');

      document.getElementById('save-file-btn').click();
      await T.until(function(){ return /older \.html calendar/.test(T.modalText()); }, 'the Save question again', 50, 100).catch(function(){});
      T.clickModalButton(/^Save as \.sptcal/);
      await T.until(function(){ return rec.files.length > 0; }, 'the .sptcal write', 50, 100).catch(function(){});
      var f = rec.files[0], text = f ? new TextDecoder().decode(f.bytes) : '';
      var json = null; try { json = JSON.parse(text); } catch(e){}
      add('L2', 'answered: the picker offers v1.0.0-saved.sptcal and the calendar’s DATA is written, never the app; the .html is untouched',
        rec.calls.length === 1 && rec.calls[0].suggestedName === 'v1.0.0-saved.sptcal' && !!json && typeof json === 'object' &&
        text.indexOf('<html') < 0 && W.length === 0,
        {suggested: rec.calls[0] && rec.calls[0].suggestedName, startsWith: text.slice(0, 40), isJson: !!json, bytes: text.length, writesToHtml: W.length},
        'v1.0.0-saved.sptcal, JSON');
      rec.restore();

      // ---- Autosave on an .html calendar: paused, and the status line says so ----
      var W2 = [];
      await T.openViaFakePicker('/tests/fixtures/v1.0.0-saved.html', 'v1.0.0-saved.html', {writes: W2});
      await T.sleep(800);
      T.set('show-title', 'Moved Show');
      await T.until(function(){ return /Autosave paused/.test(status()); }, 'the paused status', 50, 100).catch(function(){});
      add('L4', 'unsaved work on an .html calendar: the status line says autosave is paused (click Save)',
        /^Autosave paused/.test(status()) && W2.length === 0, {status: status(), writesToHtml: W2.length}, 'Autosave paused — click Save');

      var visible = Array.from(document.querySelectorAll('button, a, [role="button"], [role="menuitem"]')).filter(function(b){
        return /Export App With Data|shareable copy/i.test(b.textContent || '') && b.offsetParent !== null;
      }).map(function(b){ return b.textContent.trim(); });
      var hidden = document.getElementById('share-copy-btn');
      add('X1', '"Export App With Data" is gone: no visible control; only the hidden localhost test button remains',
        visible.length === 0 && !!hidden && hidden.hidden, {visible: visible, testButton: !!hidden, testButtonHidden: !!hidden && hidden.hidden}, 'none visible');

      store();
      try { localStorage.setItem('sptcal.movedTest', '1'); sessionStorage.setItem('cfmove-phase', '2'); } catch(e){}
      location.reload();
      return;
    }

    // ---- Phase 2: the old host's strip ----
    try { cases = JSON.parse(sessionStorage.getItem('cfmove-cases') || '[]'); } catch(e){}
    var opened = [];
    window.open = function(u, t, f){ opened.push({url: u, target: t, features: f}); return null; };
    await T.until(function(){ return strip().shown; }, 'the moved strip', 50, 100).catch(function(){});
    var s1 = strip();
    add('M1', 'the old host (hook): #update-notice says SPTCal has moved, with "Go to the new SPTCal"',
      s1.shown && s1.text.indexOf('SPTCal has moved to sptcal.pages.dev.') === 0 && s1.go === 'Go to the new SPTCal', s1,
      'SPTCal has moved to sptcal.pages.dev. Save your work first, then install it from there. Your saved calendar files aren’t affected.');
    var here = location.href;
    document.querySelector('#update-notice .ln-go').click();
    await T.sleep(500);
    add('M2', 'its button opens https://sptcal.pages.dev/ in a new window, and this page stays',
      opened.length === 1 && opened[0].url === 'https://sptcal.pages.dev/' && opened[0].target === '_blank' && location.href === here,
      {opened: opened, stayed: location.href === here}, 'one window.open of the new address');
    document.querySelector('#update-notice .ln-x').click();
    await T.sleep(400);
    add('M3', 'the x hides it', !strip().shown, strip(), 'hidden');
  } catch(err){
    cases.push({id: 'EX', title: 'threw', pass: false, observed: String(err && err.stack || err)});
  } finally {
    if(phase === '2'){
      try { localStorage.removeItem('sptcal.movedTest'); sessionStorage.removeItem('cfmove-phase'); sessionStorage.removeItem('cfmove-cases'); } catch(e){}
      T.done({test: 'cfmove', cases: cases, err: []});
    }
  }
})(); });
