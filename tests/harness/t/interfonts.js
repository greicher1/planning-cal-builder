// interfonts -- the four static Inter programs the month-PDF writer will embed (MONTH-PDF-WRITER-PLAN.md
// §8 step 1). Decoded from the page exactly as loadCarlito() decodes Carlito, read by the FROZEN
// ttfRead / ttfGlyph / ttfAdvance / ttfTextWidth -- sliced verbatim out of src/legacy/app.js, the way
// the Node provers slice their subjects, so this cannot drift from the code the writer will call --
// and every glyph's advance checked against the browser's own unkerned width of the APP's Inter.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh interfonts 60
//
//   F0  four blocks, each stamped with the SHA-256 of the WOFF2 in this page's own stylesheet
//   F1  each decodes the way loadCarlito() decodes Carlito (atob, then DecompressionStream
//       'deflate') to a TrueType program, and ITS sfnt is what the frozen ttfRead() is handed
//   F2  the frozen ttfRead reads each: 2048 units per em, a (3,1) format-4 cmap, a capHeight
//   F3  the PostScript names: subset-tagged, distinct, and not the installed Inter's names
//   F4  coverage: exactly the WinAnsi codepoints the app's Inter has (the engine's own
//       PDF_WINANSI_HI, sliced). The ten it lacks are absent from the variable font too, so
//       nothing was lost in the subset. ⚠️ The screen still DRAWS one of them, Ÿ, by
//       decomposing it to Y + U+0308; a PDF cannot (see the case)
//   F5  ⭐ every glyph's advance, read by the frozen ttfAdvance, is the whole number nearest the
//       browser's own unkerned width of the app's Inter at that weight: within half a font unit,
//       all 208 codepoints at all four weights. The app's Inter is checked to BE the stylesheet's
//       embedded WOFF2 (not an installed Inter) by measuring that WOFF2 separately
//   F6  Chrome accepts each program as a font (FontFace.load(), behind its font sanitizer), and
//       measures it at exactly its own advances
//   F7  the browser's unkerned width of a string is exactly the sum of its glyphs' widths, for
//       real month-view strings at every weight, so a writer that sums advances (ttfTextWidth)
//       reproduces the screen to F5's rounding. Kerning's size is RECORDED, not judged
//
// ⚠️ 2048 px is used on purpose: at a font size equal to unitsPerEm, one CSS pixel is one font unit,
// so a measurement IS an advance, with no scaling to round.
// ⚠️ Chrome's variable advances are FRACTIONAL (an HVAR delta at an F2Dot14 location), and a TrueType
// advance is a whole number, so "equals" can only mean "the nearest whole number". Measured 1 Oct
// 2026 on Chrome 154: worst 0.4995 units at 500, 0.4790 at 600, 0.4983 at 700, and exact at 400.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  var WEIGHTS = [400, 500, 600, 700];
  var MISSING = [0x00AD, 0x0160, 0x0161, 0x0178, 0x017D, 0x017E, 0x0192, 0x2020, 0x2021, 0x2030];
  function b64ToBytes(s){
    var bin = atob(s.replace(/\s+/g, '')), out = new Uint8Array(bin.length);
    for(var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // loadCarlito()'s own inflate, so the leg decodes the bytes the way the engine will.
  async function inflate(u8){
    return new Uint8Array(await new Response(
      new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  }
  async function sha256Hex(u8){
    var h = new Uint8Array(await crypto.subtle.digest('SHA-256', u8));
    return Array.prototype.map.call(h, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  try {
    await T.appReady();

    // ---- the frozen primitives, sliced verbatim (anchored on declaration and final statement) ----
    var src = await (await fetch('/src/legacy/app.js', {cache: 'no-store'})).text();
    function slice(startMark, endMark, what){
      var from = src.indexOf(startMark), to = from < 0 ? -1 : src.indexOf(endMark, from);
      if(from < 0 || to < 0) throw new Error('could not locate ' + what + ' in src/legacy/app.js: re-anchor this leg');
      return src.slice(from, to + endMark.length);
    }
    var ttfSrc = slice('function ttfRead(bytes){', 'return w * sizePt / t.unitsPerEm;\n  }', 'ttfRead..ttfTextWidth');
    var hiSrc = slice('const PDF_WINANSI_HI = {', '};', 'PDF_WINANSI_HI');
    var F = new Function(ttfSrc + '\n' + hiSrc + '\nreturn {ttfRead: ttfRead, ttfGlyph: ttfGlyph, ttfAdvance: ttfAdvance, ttfTextWidth: ttfTextWidth, HI: PDF_WINANSI_HI};')();
    var winansi = [];
    for(var c = 0x20; c <= 0x7E; c++) winansi.push(c);
    for(c = 0xA0; c <= 0xFF; c++) winansi.push(c);
    Object.keys(F.HI).forEach(function (k) { winansi.push(F.HI[k]); });
    winansi.sort(function (a, b) { return a - b; });

    // ---- the stylesheet's own WOFF2: the screen's Inter -------------------------------------------
    var css = Array.prototype.map.call(document.querySelectorAll('style'), function (s) { return s.textContent; }).join('\n');
    var wm = css.match(/url\(["']?data:font\/woff2;base64,([A-Za-z0-9+\/=]+)["']?\)/);
    if(!wm) throw new Error("no woff2 data: URI in the page's stylesheets");
    var woff2 = b64ToBytes(wm[1]);
    var woffSha = await sha256Hex(woff2);
    info.woff2 = {bytes: woff2.length, sha256: woffSha};

    // ---- F0 + F1: the four blocks, decoded --------------------------------------------------------
    var progs = {}, f0 = [], f1 = [];
    for(var wi = 0; wi < WEIGHTS.length; wi++){
      var W = WEIGHTS[wi], el = document.getElementById('font-inter-' + W);
      f0.push({w: W, present: !!el, type: el && el.getAttribute('type'), sha: el && el.getAttribute('data-source-sha256')});
      if(!el) continue;
      var z = b64ToBytes(el.textContent), ttf = await inflate(z);
      var dv = new DataView(ttf.buffer);
      progs[W] = {z: z, ttf: ttf};
      f1.push({w: W, zlib: z.length, ttf: ttf.length, sfnt: dv.getUint32(0).toString(16), sha256: (await sha256Hex(ttf)).slice(0, 16)});
    }
    add('F0', "four text/plain blocks, each stamped with the SHA-256 of this page's own Inter WOFF2",
      f0.length === 4 && f0.every(function (b) { return b.present && b.type === 'text/plain' && b.sha === woffSha; }),
      {blocks: f0, woff2: woffSha}, 'font-inter-400/500/600/700, data-source-sha256 = ' + woffSha.slice(0, 16) + '…');
    add('F1', "each decodes as loadCarlito() decodes Carlito, to a TrueType program",
      f1.length === 4 && f1.every(function (b) { return b.sfnt === '10000' && b.ttf > 10000; }),
      f1, 'sfnt version 0x00010000');

    // ---- F2 + F3: the frozen reader, and the names ------------------------------------------------
    var f2 = [], names = [];
    WEIGHTS.forEach(function (W) {
      if(!progs[W]) return;
      var t = F.ttfRead(progs[W].ttf);
      progs[W].t = t;
      f2.push({w: W, unitsPerEm: t.unitsPerEm, cmapFmt: t.cmapFmt, cmap31: t.cmapOff > 0, capHeight: t.capHeight,
               ascent: t.ascent, descent: t.descent, bbox: t.bbox, name: t.name, tables: Object.keys(t.tables).sort().join(' ')});
      names.push(t.name);
    });
    add('F2', 'the frozen ttfRead reads each: 2048 units per em, a format-4 Unicode cmap, a capHeight, no variation tables',
      f2.length === 4 && f2.every(function (r) { return r.unitsPerEm === 2048 && r.cmapFmt === 4 && r.cmap31 && r.capHeight > 0 && !/\b(fvar|gvar|HVAR|GSUB|GPOS)\b/.test(r.tables); }),
      f2, 'unitsPerEm 2048, cmapFmt 4, capHeight > 0');
    var installed = ['Inter-Regular', 'Inter-Medium', 'Inter-SemiBold', 'Inter-Bold', 'Inter', 'InterVariable'];
    add('F3', "the PostScript names are subset-tagged, distinct, and none is an installed Inter's, even with the tag stripped",
      names.length === 4 && names.every(function (n) { return /^[A-Z]{6}\+InterPDF-(Regular|Medium|SemiBold|Bold)$/.test(n) && installed.indexOf(n.split('+')[1]) < 0; }) &&
      new Set(names).size === 4 && new Set(names.map(function (n) { return n.slice(0, 6); })).size === 4,
      names, 'ABCDEF+InterPDF-<style>, four distinct tags');

    // ---- the browser's own widths -----------------------------------------------------------------
    // The APP's Inter, as the month view renders it, and a probe face built from the same WOFF2
    // bytes under a name no installed font can have: if the two agree at every glyph, the app's
    // "Inter" is the embedded font and not the Inter 3.019 in ~/Library/Fonts.
    var probeVar = new FontFace('IFProbeVar', woff2.buffer.slice(0), {weight: '100 900'});
    await probeVar.load(); document.fonts.add(probeVar);
    for(wi = 0; wi < WEIGHTS.length; wi++) await document.fonts.load(WEIGHTS[wi] + ' 2048px Inter', 'Ag');
    var ctx = document.createElement('canvas').getContext('2d');
    function widthOf(fontSpec, str, kern){
      ctx.font = fontSpec; ctx.fontKerning = kern ? 'normal' : 'none';
      return ctx.measureText(str).width;
    }
    function hex(u){ return 'U+' + u.toString(16).toUpperCase().padStart(4, '0'); }

    // ---- F4: coverage -----------------------------------------------------------------------------
    var f4 = [];
    WEIGHTS.forEach(function (W) {
      var t = progs[W] && progs[W].t;
      if(!t) return;
      var have = winansi.filter(function (u) { return F.ttfGlyph(t, u) !== 0; });
      var lack = winansi.filter(function (u) { return F.ttfGlyph(t, u) === 0; });
      progs[W].cps = have;
      f4.push({w: W, have: have.length, lack: lack.map(hex).join(' ')});
    });
    // ...and the VARIABLE font lacks the same ten, so nothing was lost in the subset. A character a
    // face lacks is drawn by the NEXT family in the stack, so it measures differently behind a
    // monospace fallback than behind a serif one; a character the face has measures the same behind
    // both. 'A' and the euro sign are the controls. The soft hyphen is default-ignorable -- no
    // browser draws it in running text -- so it cannot be asked this way; fontTools' cmap reading in
    // tools/subset-inter.py's report is its evidence.
    // ⚠️ FOUND 1 Oct 2026: Ÿ (U+0178) is drawn IN Inter on screen although Inter has no glyph for it.
    // The shaper decomposes it to Y + U+0308 (combining diaeresis), which this latin subset DOES
    // map, and stacks the mark. A PDF cannot compose glyphs, so on paper Ÿ is a missing glyph like
    // the other nine: one character the screen shows and the writer cannot. Proved here rather than
    // assumed: Ÿ measures exactly as the decomposed pair does, behind both fallbacks.
    function lacks(u){ var ch = String.fromCodePoint(u);
      return Math.abs(widthOf('400 2048px IFProbeVar, monospace', ch, false) - widthOf('400 2048px IFProbeVar, serif', ch, false)) > 1e-6; }
    var probed = MISSING.filter(function (u) { return u !== 0x00AD && u !== 0x0178; });
    var varLacks = probed.filter(lacks).map(hex), controls = {A: lacks(0x41), euro: lacks(0x20AC)};
    var yDia = {}, yOk = true;
    ['monospace', 'serif'].forEach(function (fb) {
      var whole = widthOf('400 2048px IFProbeVar, ' + fb, 'Ÿ', false), pair = widthOf('400 2048px IFProbeVar, ' + fb, 'Ÿ', false);
      yDia[fb] = {Y_diaeresis: whole, Y_plus_U0308: pair};
      if(Math.abs(whole - pair) > 1e-6) yOk = false;
    });
    add('F4', 'coverage: exactly the WinAnsi codepoints the app’s Inter has; the ten absent are the documented ten, absent from the variable font too',
      f4.length === 4 && f4.every(function (r) { return r.have === winansi.length - MISSING.length && r.lack === MISSING.map(hex).join(' '); }) &&
      varLacks.length === probed.length && !controls.A && !controls.euro && yOk,
      {winansi: winansi.length, perWeight: f4, variableFontLacks: varLacks, controlsLacking: controls, screenDrawsYDiaeresisAsYPlusU0308: yDia},
      (winansi.length - MISSING.length) + ' of ' + winansi.length + '; the variable font lacks the eight drawable ones; Ÿ is Y + U+0308 on screen; controls present');

    var f5 = [], appVsProbe = 0;
    WEIGHTS.forEach(function (W) {
      var t = progs[W] && progs[W].t;
      if(!t) return;
      var worst = 0, worstAt = null, exact = 0;
      progs[W].cps.forEach(function (u) {
        var ch = String.fromCodePoint(u);
        var b = widthOf(W + ' 2048px Inter', ch, false);
        appVsProbe = Math.max(appVsProbe, Math.abs(b - widthOf(W + ' 2048px IFProbeVar', ch, false)));
        var a = F.ttfAdvance(t, F.ttfGlyph(t, u));
        var d = Math.abs(a - b);
        if(d < 1e-6) exact++;
        if(d > worst){ worst = d; worstAt = {cp: hex(u), advance: a, browser: b}; }
      });
      f5.push({w: W, glyphs: progs[W].cps.length, exact: exact, worstUnits: +worst.toFixed(4), worstAt: worstAt});
    });
    add('F5', "every glyph's advance (frozen ttfAdvance) is the whole number nearest the browser's unkerned width of the app's Inter",
      f5.length === 4 && f5.every(function (r) { return r.glyphs === winansi.length - MISSING.length && r.worstUnits <= 0.5; }) && appVsProbe < 1e-6,
      {perWeight: f5, appInterVsEmbeddedWoff2MaxUnits: appVsProbe}, 'worst <= 0.5 units at every weight; the app’s Inter IS the embedded WOFF2');

    // ---- F6: Chrome takes each program as a font, at its own advances ----------------------------
    var f6 = [];
    for(wi = 0; wi < WEIGHTS.length; wi++){
      W = WEIGHTS[wi];
      var t6 = progs[W] && progs[W].t;
      if(!t6) continue;
      var face = new FontFace('IFProbeStatic' + W, progs[W].ttf.buffer.slice(0));
      var ok = true, err = null;
      try { await face.load(); document.fonts.add(face); } catch (e) { ok = false; err = String(e); }
      var worst6 = 0;
      if(ok) progs[W].cps.forEach(function (u) {
        worst6 = Math.max(worst6, Math.abs(widthOf('2048px IFProbeStatic' + W, String.fromCodePoint(u), false) - F.ttfAdvance(t6, F.ttfGlyph(t6, u))));
      });
      f6.push({w: W, loaded: ok, err: err, worstUnits: worst6});
    }
    add('F6', 'Chrome accepts each program as a font and measures it at exactly its own advances',
      f6.length === 4 && f6.every(function (r) { return r.loaded && r.worstUnits < 1e-6; }), f6, 'loaded; 0 units');

    // ---- F7: strings are sums of glyphs; kerning recorded ----------------------------------------
    // Real month-view text: titles, the month bar, weekdays, pills, bands, notes, holidays.
    var STRS = ['September 2026', 'Mon Tue Wed Thu Fri Sat Sun', 'Production', 'Pre-Production', 'Simultaneous Post',
                'Writers’ Room', 'Hiatus', 'Labor Day 9/7/26', 'Thanksgiving (Observed)', 'Block 2 · Eps 3–4',
                'Ep. 101, 102 & 103', 'Wrap party — TBC', 'AVA Today: “Way to go”', 'Café naïve résumé ½',
                'Localization & Delivery', 'Total: 48 shoot days'];
    var f7 = [], kern = [];
    WEIGHTS.forEach(function (W) {
      var t = progs[W] && progs[W].t;
      if(!t) return;
      STRS.forEach(function (s) {
        var whole = widthOf(W + ' 2048px Inter', s, false), sum = 0;
        for(var ch of s) sum += widthOf(W + ' 2048px Inter', ch, false);
        var tw = F.ttfTextWidth(t, s, 2048);
        f7.push({w: W, s: s, wholeMinusSum: +(whole - sum).toFixed(4), writerMinusScreen: +(tw - whole).toFixed(3), chars: [...s].length});
        var kw = widthOf(W + ' 2048px Inter', s, true);
        kern.push({w: W, s: s, unkernedOverKerned: +((whole / kw - 1) * 100).toFixed(3)});
      });
    });
    // "Exactly" is to the browser's float arithmetic: a whole string and the sum of its glyphs differ
    // by up to 0.0024 units in Chrome 154 (27 characters, measured 1 Oct 2026), while any shaping
    // substitution (a contextual alternate, a ligature) would move a width by whole units. 0.05 is
    // twenty times the noise and fifty times smaller than the smallest real effect.
    var bad7 = f7.filter(function (r) { return Math.abs(r.wholeMinusSum) > 0.05 || Math.abs(r.writerMinusScreen) > 0.5 * r.chars + 1e-3; });
    add('F7', "a string's unkerned width is the sum of its glyphs' (no shaping substitution), so ttfTextWidth reproduces the screen to F5's rounding",
      f7.length === STRS.length * 4 && bad7.length === 0,
      {strings: f7.length, failing: bad7.slice(0, 8),
       worstWholeMinusSumUnits: Math.max.apply(null, f7.map(function (r) { return Math.abs(r.wholeMinusSum); })),
       worstWriterMinusScreenUnits: Math.max.apply(null, f7.map(function (r) { return Math.abs(r.writerMinusScreen); }))},
      '|whole - sum| <= 0.05 units; |ttfTextWidth - screen| <= 0.5 units per glyph');
    info.kerning = {maxUnkernedWiderPct: Math.max.apply(null, kern.map(function (k) { return k.unkernedOverKerned; })),
                    minPct: Math.min.apply(null, kern.map(function (k) { return k.unkernedOverKerned; })),
                    meanPct: +(kern.reduce(function (a, k) { return a + k.unkernedOverKerned; }, 0) / kern.length).toFixed(3),
                    widest: kern.slice().sort(function (a, b) { return b.unkernedOverKerned - a.unkernedOverKerned; }).slice(0, 4)};
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'interfonts', cases: cases, info: info, err: (window.__ERR || []).slice(0, 10)});
})(); });
