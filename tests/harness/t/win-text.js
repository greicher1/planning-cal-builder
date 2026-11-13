// win-text -- what a Windows desktop feeds the app: CRLF clipboard text pasted into the waterfall's Notes, CRLF typed
// into the note editor (a trusted Input.insertText under xleg), and the file names the app proposes for titles
// Windows forbids. Judges what must hold on every OS: no carriage return reaches a note or a saved file, and no
// proposed name holds a character Windows forbids. A 420-character title's name length is reported only.
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var measured = {}, out = {cases: cases, measured: measured};
  function add(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function q(s) { return document.querySelector(s); }
  var xseq = 0;
  async function xinput(steps) {
    if (!window.__XLEG) return null;
    var id = ++xseq; window.__XREQ = {id: id, steps: steps};
    await T.until(function () { return window.__XACK === id; }, 'xleg input ' + id, 100, 100);
    return window.__XRES;
  }
  function mid(el) { var r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  function pe(type, p) {
    var o = {bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0,
      buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true};
    var t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new PointerEvent(type, o));
    t.dispatchEvent(new MouseEvent(type === 'pointerdown' ? 'mousedown' : 'mouseup', o));
    if (type === 'pointerup') t.dispatchEvent(new MouseEvent('click', o));
  }
  async function click(el) { el.scrollIntoView({block: 'center', inline: 'nearest'}); await T.sleep(60); var p = mid(el); pe('pointerdown', p); pe('pointerup', p); await T.sleep(250); }
  function bodyFocus() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  async function settled() { var last = '', same = 0; for (var i = 0; i < 60 && same < 3; i++) { await T.sleep(100); var s = JSON.stringify(T.gridSignature()); same = (s === last) ? same + 1 : 0; last = s; } }
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cellText(wk) { var c = noteTd(wk); return c && c.classList.contains('has-note') ? c.textContent.trim() : ''; }
  function paste(text) {
    var dt = new DataTransfer(); dt.setData('text/plain', text);
    document.body.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
  }
  var downloads = [], realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) { downloads.push(this.download); return; } return realClick.apply(this, arguments); };
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return !!q('#table-wrap td.sheet-phase-cell[data-pkey="post"]'); }, 'grid', 100, 100);
    await settled();

    // CR1: CRLF with a trailing CRLF (what Excel and Notepad put on the clipboard), pasted on an empty Notes cell.
    await click(noteTd('2026-02-02')); bodyFocus(); await T.sleep(200);
    paste('Table read 10am\r\nCast fitting\r\n');
    await settled();
    var n1 = cellText('2026-02-02'), n2 = cellText('2026-02-09'), n3 = cellText('2026-02-16');
    add('CR1', 'CRLF clipboard text pastes one line per week with no stray carriage return', n1 === 'Table read 10am' && n2 === 'Cast fitting' && !/\r/.test(n1 + n2) && !n3,
        {feb2: JSON.stringify(n1), feb9: JSON.stringify(n2), feb16: JSON.stringify(n3)}, 'Table read 10am / Cast fitting / empty');
    // CR2: one Excel cell holding a line break (quoted, LF inside), then a CRLF row end.
    await click(noteTd('2026-03-02')); bodyFocus(); await T.sleep(200);
    paste('"Location scout\nTech scout"\r\nProduction meeting\r\n');
    await settled();
    var m1 = cellText('2026-03-02'), m2 = cellText('2026-03-09');
    add('CR2', 'an Excel cell with a line break then a CRLF row end: two notes, no carriage return', /Location scout/.test(m1) && /Tech scout/.test(m1) && m2 === 'Production meeting' && !/\r/.test(m1 + m2),
        {mar2: JSON.stringify(m1), mar9: JSON.stringify(m2)}, 'cell 1 holds both lines; cell 2 Production meeting');

    // CR4: the note editor. Under xleg the text goes in as trusted input (Input.insertText), CRLF and all; otherwise
    // through the value setter. Committed with Ctrl+Enter, as T.typeUserNote does.
    T.closePops(); bodyFocus();
    T.openCell(noteTd('2026-04-06'));
    await T.until(function () { return !!q('.note-editor textarea'); }, 'note editor', 40, 100);
    var ta = q('.note-editor textarea'); ta.focus();
    var how = 'value setter';
    if (window.__XLEG) { await xinput([{text: 'Wardrobe call\r\nTech recce'}]); how = 'Input.insertText'; }
    else { ta.value = 'Wardrobe call\r\nTech recce'; ta.dispatchEvent(new Event('input', {bubbles: true})); }
    var typed = ta.value;
    ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', ctrlKey: true, bubbles: true}));
    await settled();
    var e1 = cellText('2026-04-06');
    add('CR4', 'CRLF typed into the note editor is stored without a carriage return', /Wardrobe call/.test(e1) && /Tech recce/.test(e1) && !/\r/.test(e1),
        {how: how, editorValue: JSON.stringify(typed), cell: JSON.stringify(e1)}, 'both lines, no carriage return');

    // FN: the names the app proposes (Save As through the fake picker; Excel's download name from the anchor).
    function winBad(n) {
      var why = [];
      if (/[<>:"\/\\|?*\u0000-\u001F]/.test(n)) why.push('forbidden character');
      if (/[ .]$/.test(n)) why.push('ends in space or dot');
      var base = n.split('.')[0].trim().toUpperCase();
      if (/^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/.test(base)) why.push('reserved name');
      return why;
    }
    var titles = ['Harbor Lights: Part 2', 'A/B?', 'CON', 'Harbor Lights.', 'Harbor  Lights\t2', '<Harbor> "Lights" | *', new Array(31).join('Harbor Lights ')];
    var names = [];
    for (var i = 0; i < titles.length; i++) {
      T.set('show-title', titles[i]); await T.sleep(300);
      var rec = T.fakeSavePicker();
      try {
        await T.sleep(800);
        await T.until(function () { var b = q('#save-as-btn'); return !!b && !b.disabled; }, 'Save As', 60, 100);
        q('#save-as-btn').click();
        await T.until(function () { return rec.calls.length > 0; }, 'picker', 60, 100);
        await T.until(function () { return rec.files.length > 0; }, 'write', 60, 100);
      } finally { rec.restore(); }
      var dl0 = downloads.length;
      await T.sleep(800);
      q('#export-btn').click();
      await T.until(function () { return downloads.length > dl0; }, 'excel download', 150, 100);
      var save = rec.calls[0].suggestedName, xl = downloads[downloads.length - 1];
      names.push({title: titles[i].slice(0, 40), titleLen: titles[i].length, save: save.length > 80 ? save.slice(0, 40) + '...(' + save.length + ')' : save, saveLen: save.length, saveBad: winBad(save), excel: xl.length > 80 ? xl.slice(0, 40) + '...(' + xl.length + ')' : xl, excelLen: xl.length, excelBad: winBad(xl)});
    }
    measured.names = names;
    var bad = names.filter(function (n) { return n.saveBad.length || n.excelBad.length; });
    add('FN', 'no proposed file name holds a character or name Windows forbids', bad.length === 0, {names: names}, 'none');
    var longest = names[names.length - 1];
    add('FN2', 'the long title\'s proposed name length measured', true, {save: longest.saveLen, excel: longest.excelLen}, 'reported, not judged');

    // CR3: the saved .sptcal holds no carriage return.
    var rec2 = T.fakeSavePicker(), txt = '';
    try { await T.sleep(800); q('#save-as-btn').click(); await T.until(function () { return rec2.files.length > 0; }, 'save', 60, 100); txt = new TextDecoder().decode(rec2.files[0].bytes); } finally { rec2.restore(); }
    add('CR3', 'the saved .sptcal has no carriage return in any note, and no CRLF line ends', txt.length > 0 && txt.indexOf('\\r') === -1 && txt.indexOf('\r') === -1,
        {escapedCR: txt.indexOf('\\r') !== -1, rawCR: txt.indexOf('\r') !== -1, bytes: txt.length}, 'none');
    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0, {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception');
  }
  HTMLAnchorElement.prototype.click = realClick;
  T.done(out);
})(); });
