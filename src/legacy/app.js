// The SPT Planning Calendar Builder's original application script, moved out of index.html's
// single inline <script> and into a module, VERBATIM. Nothing between initLegacyApp()'s braces has
// been changed from the v1.2.0 build -- the wrapper is the whole diff.
//
// Why a function rather than running on import: ES module imports are hoisted and run before the
// importing module's body, and this script binds listeners to chrome elements BY ID at evaluation
// time (seven of them unguarded on #table-wrap alone -- MANTINE-SEAM.md 3.1). React must therefore
// have rendered the chrome before this runs, which means main.jsx has to call it, not import it.
//
// ⚠️ A module is STRICT MODE; the old inline <script> was sloppy. An assignment to an undeclared
// variable now throws ReferenceError instead of silently creating a global. The harness's
// window.__ERR trap is what proves this file is clean -- do not skip it after editing here.

import { chrome } from '../chrome/bridge.js'

export function initLegacyApp() {

(function(){
  const DAY_MS = 86400000;

  // ---------- The build's own version ----------
  // What this copy of the app IS. Compared against the deployed version.json by the update
  // check at the bottom of this file, so an installed PWA can find out a new build exists.
  //
  // >>> BUMP THIS AND version.json IN THE SAME COMMIT. <<<
  // They are one action, not two: version.json alone makes every user see an update that
  // isn't there, and APP_VERSION alone makes a real update invisible. The release-cut step in
  // README's changelog rules lists them together for exactly this reason.
  const APP_VERSION = '1.2.0';

  // ---------- Embedded Carlito ----------
  // The two <script type="text/plain"> blocks above hold Carlito, subset and zlib-compressed,
  // as base64. Decode them once and register both weights with the document, so the calendar
  // grid renders from a font that ships INSIDE this file rather than one that may or may not
  // arrive from a CDN. `carlitoBytes` keeps the decompressed programs because the PDF writer
  // will need the same bytes to embed as /FontFile2, and `carlitoDeflated` keeps the compressed
  // ones because a PDF font stream is /FlateDecode -- i.e. exactly what is stored here already,
  // so the PDF can reuse them without recompressing.
  const carlitoBytes = {}, carlitoDeflated = {};
  const carlitoReady = (async function loadCarlito(){
    const b64ToBytes = s => {
      const bin = atob(s.replace(/\s+/g, ''));
      const out = new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
      return out;
    };
    const inflate = async u8 => new Uint8Array(await new Response(
      new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
    try {
      for(const weight of ['400','700']){
        const el = document.getElementById('font-carlito-' + weight);
        if(!el) continue;
        const z = b64ToBytes(el.textContent);
        const ttf = await inflate(z);
        carlitoDeflated[weight] = z;
        carlitoBytes[weight] = ttf;
        // A FontFace added to document.fonts shadows any same-named font installed on the
        // machine, so an installed Carlito can't quietly win and reintroduce kerning.
        const ff = new FontFace('Carlito', ttf.buffer, { weight, style:'normal' });
        await ff.load();
        document.fonts.add(ff);
      }
      return true;
    } catch(err){
      // Never fatal: the CSS stacks still name Calibri and a generic sans after Carlito, so the
      // app stays usable. Measurements would drift, which is worth a console note.
      console.warn('Embedded Carlito failed to load; falling back to system fonts.', err);
      return false;
    }
  })();

  // Decoding the font is async, so the first render can measure against a fallback face and
  // bake wrong column widths in for the rest of the session. Drop the measurement cache and
  // re-render once the real font is live. Guarded on currentSchedule so this does nothing if
  // the font wins the race, which it usually does.
  carlitoReady.then(()=>{
    _measureCache.clear();
    if(typeof currentSchedule !== 'undefined' && currentSchedule) render(currentSchedule);
  });

  // ---------- Column geometry: one width model for screen, Excel and PDF ----------
  // Everything is expressed in EXCEL COLUMN-WIDTH UNITS, because that is the only unit all
  // three outputs can honour: Excel takes it directly, and the screen and PDF convert it to
  // pixels. Previously each output decided widths for itself -- the Excel export from a
  // hand-tuned per-character weight table, the screen and PDF from browser table auto-layout --
  // so the three could never agree, which is why the PDF never looked like the Excel print.
  //
  // Excel defines the unit from the workbook's NORMAL STYLE font, Calibri 11pt, whose maximum
  // digit width at 96dpi is 7px. A column of width w renders trunc(w*7)+5 px, the +5 being the
  // cell's own insets and gridline.
  //
  // ** The trap: Calibri/Carlito's "0" actually advances 7.4336px at 11pt, not 7. Excel floors
  // ** it to an integer. Divide measured text by the true 7.4336 and every column comes out ~6%
  // ** narrower than Excel's own autofit, in a way that just looks like a rounding bug.
  const EXCEL_MDW = 7;          // NOT 7.4336 -- see above
  const EXCEL_CELL_PAD = 5;
  // Text is measured at 11pt (the unit's basis). The on-screen grid is set in 11px type, so its
  // pixels are 11/(11*96/72) = 0.75 of Excel's -- a faithfully scaled copy rather than a
  // different layout.
  const SHEET_ZOOM = 0.75;
  // ~8px at the 11pt basis: Excel's own inset is ~5px, and the extra is visual breathing room so
  // a label does not sit flush against the cell edge. Spent HERE rather than in CSS padding, so
  // the screen, the PDF and the workbook all receive the same slack.
  const COL_PAD_CHARS = 1.15;
  // Autofit ceilings. The cap exists so one very long custom phase name cannot force endless
  // horizontal scroll -- but notes are prose and legitimately longer, and a cap that is too
  // tight puts a note permanently out of reach of one line: past MAX/SHRINK_FLOOR chars' worth
  // of text, no column autofit can hold it. 55 covers realistic note text; beyond that the
  // shrink takes over, and beyond the floor it wraps. Dragging by hand is not capped at all.
  const COL_MAX_CHARS = 40;
  const COL_MAX_CHARS_NOTES = 55;
  const COL_MIN_CHARS = 3;      // hand-dragged floor; the auto floor is higher (see clampChars)
  // A note narrower than its column renders at full size. One that would overflow is SHRUNK to
  // fit on one line rather than wrapping, down to this fraction of the base size; only if it
  // still doesn't fit at the floor does it fall back to wrapping, so text is never lost.
  const NOTE_SHRINK_FLOOR = 0.6;
  // Screen rows are 20px where Excel's default row is 15pt, so heights convert 1:0.75 -- the
  // same ratio as the width scale, but arrived at independently and worth keeping named apart.
  const ROW_PX_TO_PT = 0.75;
  const ROW_DEFAULT_PX = 20;
  // Measured from the live grid, not assumed: computed line-height is 14.85px on an 11px base.
  const SHEET_LINE_RATIO = 1.35;
  // Vertical padding (2px top + 2px bottom) plus the collapsed border, taken off a row's height
  // before dividing it into lines.
  const ROW_TEXT_PAD_PX = 5;

  // Hand-dragged overrides. Columns are keyed by ROLE, not by position: 'date' and 'notes' are
  // shared by every year block (unequal ones read as broken), and a phase slot is keyed by its
  // block's YEAR rather than the block index, because a schedule that grows or loses a year
  // renumbers the blocks and would otherwise move everybody's widths onto the wrong columns.
  // Rows are keyed by row INDEX because one <tr> carries row r of every block -- three
  // different weeks -- so there is no single date to key on.
  let colWidths = {};    // 'date' | 'notes' | 'y2027:s0'  ->  width in Excel char units
  let rowHeights = {};   // row index -> height in screen px
  // How far a single phase cell reaches across the empty columns beside it, keyed
  // '<week ISO>|<phase key>' -> {l, r} = slots claimed LEFT and RIGHT of the phase's own column.
  //
  // The automatic layout is deliberately conservative: a phase only widens into a neighbouring
  // column when that column is free for the phase's WHOLE run, so the last week of a phase whose
  // neighbour finished earlier leaves a gap. This store is the hand override for those gaps --
  // and {l:0,r:0} is a real value meaning "stay in your own column", which is how a cell is
  // un-filled. Absent = follow the automatic layout.
  //
  // Anchored on the phase's own column rather than stored as a delta on the automatic span, so
  // a schedule change that moves the auto span cannot silently move the width the user dragged.
  let cellSpans = {};

  // How a cell's text has to be squeezed to sit on one line in `chars` of column width.
  // Shared by the screen and the Excel export so both shrink by exactly the same amount, and by
  // notes AND phase labels so a narrowed column of either kind behaves the same way. The
  // caller decides what to do when even the floor is not enough: notes wrap (the row grows),
  // phase labels clip, because a wrapped label would break the fixed-height colour band.
  // How many lines `text` needs in `availPx` of width (11pt measurement basis). Greedy word
  // wrap, with explicit newlines as hard breaks. Each WORD is measured once rather than every
  // running prefix, so the memo stays small and the scan below stays cheap.
  function wrapLineCount(text, availPx){
    const spaceW = measureTextPx(' ', false);
    let total = 0;
    String(text).split('\n').forEach(para=>{
      const words = para.split(/\s+/).filter(Boolean);
      if(!words.length){ total += 1; return; }   // a blank line still occupies one
      let lineW = 0, lines = 1;
      words.forEach(w=>{
        const ww = measureTextPx(w, false);
        const cand = lineW ? lineW + spaceW + ww : ww;
        // `lineW === 0` lets a single over-long word own its line instead of looping forever
        if(cand <= availPx || lineW === 0) lineW = cand;
        else { lines++; lineW = ww; }
      });
      total += lines;
    });
    return total;
  }

  // How a cell's text has to be sized to sit inside its column AND its row.
  //
  // The row height is an INPUT, not an output: it buys a LINE BUDGET, and the text wraps into
  // however many lines that is. Shrinking is what happens when even the budget is not enough.
  // A row the user has never dragged is worth one line, which is the behaviour notes have had
  // all along.
  //
  // The budget cannot be computed once and held: line-height is a multiple of font-size, so
  // shrinking the text both reduces the lines NEEDED and increases the lines that FIT. Those two
  // curves move towards each other monotonically as the size falls, so scanning size downwards
  // finds the largest size where they meet -- no circularity, and no oscillation.
  //
  // opts.basePx   font size the cell wants (11 unless the user chose one for this note)
  // opts.manual   true when basePx is the user's explicit choice -- then it is honoured outright
  //               and the text is allowed to clip, because that is what the control is for
  // opts.rowPx    the row's pinned height, or undefined for an auto-height (one line) row
  // Returns { scale, lines, wrap, clipped } with scale ALWAYS relative to the 11px base, so
  // every call site keeps its existing `11 * fit.scale` shape.
  function cellTextFit(noteText, chars, opts){
    opts = opts || {};
    const basePx = opts.basePx || 11;
    const availBasis = Math.max(1, chars * EXCEL_MDW);   // Excel's content width, inset excluded
    if(!noteText) return { scale: basePx / 11, lines: 1, wrap: false, clipped: false };

    // lines that fit in the row at font size px
    const budgetAt = px => opts.rowPx
      ? Math.max(1, Math.floor((opts.rowPx - ROW_TEXT_PAD_PX) / (px * SHEET_LINE_RATIO)))
      : 1;
    // lines the text needs at font size px: at px the glyphs are px/11 of measured size, which
    // is the same as the available width shrinking by 11/px.
    const needAt = px => wrapLineCount(noteText, availBasis * (11 / px));

    if(opts.manual){
      const need = needAt(basePx), fits = budgetAt(basePx);
      // `lines` is the TRUE count, not the capped one: the renderer caps by clipping and the
      // Excel export needs the honest number to size its row.
      return { scale: basePx / 11, lines: need, wrap: need > 1, clipped: need > fits };
    }
    for(let s = 1; s >= NOTE_SHRINK_FLOOR - 1e-9; s -= 0.02){
      const px = 11 * s, need = needAt(px);
      if(need <= budgetAt(px)) return { scale: s, lines: need, wrap: need > 1, clipped: false };
    }
    // Floored and still over budget: wrap anyway rather than lose text. On an auto-height row
    // that grows the row, which is the long-standing behaviour; on a pinned row it clips.
    const px = 11 * NOTE_SHRINK_FLOOR, need = needAt(px);
    return { scale: NOTE_SHRINK_FLOOR, lines: need, wrap: true,
             clipped: need > budgetAt(px) };
  }

  // screen px -> Excel char units, the inverse of charsToScreenPx
  function screenPxToChars(px){
    return Math.round(((px / SHEET_ZOOM) - EXCEL_CELL_PAD) / EXCEL_MDW * 100) / 100;
  }
  // ---------- Drag-to-resize columns and rows ----------
  // Handles are built AFTER the table is in the DOM and positioned from real geometry
  // (getBoundingClientRect on the header cells and rows) rather than from cumulative widths.
  // The waterfall header row is Date | <year colspan=N> | Notes per block, so most column
  // boundaries have no <th> edge to hang a handle off -- reading the laid-out <col> boxes is the
  // only thing that lines up with every boundary.
  //
  // Live feedback during a drag writes the <col> width directly and re-runs the note fit; a full
  // re-render happens once, on release, together with the single undo step.
  function installGridResizers(){
    const wrap = document.querySelector('.sheet-grid-wrap');
    if(!wrap) return;
    const table = wrap.querySelector('table.sheet-table');
    const layer = wrap.querySelector('.grid-resize-layer');
    if(!table || !layer) return;
    layer.innerHTML = '';

    const cols = [...table.querySelectorAll('colgroup col')];
    const head = table.tHead && table.tHead.rows[0];
    if(!cols.length || !head) return;

    const wrapBox = wrap.getBoundingClientRect();
    const tableBox = table.getBoundingClientRect();
    const tableH = tableBox.height;

    // Column boundaries: walk the declared widths, which table-layout:fixed honours exactly.
    let x = tableBox.left - wrapBox.left;
    cols.forEach((col, i)=>{
      x += parseFloat(col.style.width) || 0;
      const h = document.createElement('div');
      h.className = 'grid-resize is-col';
      h.style.left = x + 'px';
      h.style.top = '0px';
      h.style.height = tableH + 'px';
      h.dataset.ckey = col.dataset.ckey || '';
      h.dataset.colIdx = String(i);
      h.title = 'Drag to resize · double-click to fit the widest entry';
      layer.appendChild(h);
    });

    // Row boundaries, but only across the FIRST date column: a full-width row handle would sit
    // on top of every note cell and swallow the click that opens the editor. Inset from that
    // column's right edge so it never overlaps the column handle living there.
    const COL_HANDLE_CLEARANCE = 9;
    const firstDateW = Math.max(12, (parseFloat(cols[0].style.width) || 40) - COL_HANDLE_CLEARANCE);
    const rows = [...table.tBodies[0].rows];
    rows.forEach((tr, r)=>{
      const rb = tr.getBoundingClientRect();
      const h = document.createElement('div');
      h.className = 'grid-resize is-row';
      h.style.left = (tableBox.left - wrapBox.left) + 'px';
      h.style.width = firstDateW + 'px';
      h.style.top = (rb.bottom - wrapBox.top) + 'px';
      h.dataset.row = String(r);
      h.title = 'Drag to resize the row · double-click to reset';
      layer.appendChild(h);
    });

    // Cell-span handles: one on each vertical edge of a phase cell, for dragging how far that
    // ONE cell reaches across the empty columns beside it. They are per-row and only as tall as
    // their row, which is why they sit above the column handles -- a column boundary runs the
    // whole height of the grid and would otherwise take every grab aimed at a cell edge.
    const colX = [];
    {
      let cx = tableBox.left - wrapBox.left;
      cols.forEach((c, i)=>{ colX[i] = cx; cx += parseFloat(c.style.width) || 0; });
      colX[cols.length] = cx;
    }
    // A block's phase columns are 'y<year>:s<slot>', so slot 0's position in the flat colgroup
    // is all a handle needs to turn the slot numbers on the cell into screen coordinates.
    const slotBase = new Map();
    cols.forEach((c, i)=>{
      const m = /^(y\d+):s(\d+)$/.exec(c.dataset.ckey || '');
      if(m && m[2] === '0') slotBase.set(m[1], i);
    });
    rows.forEach(tr=>{
      const rb = tr.getBoundingClientRect();
      const top = rb.top - wrapBox.top, rowH = rb.height;
      let ci = 0;
      [...tr.cells].forEach(td=>{
        const span = td.colSpan || 1;
        const start = ci;
        ci += span;
        if(!td.classList.contains('sheet-phase-cell')) return;
        const m = /^(y\d+):s\d+$/.exec((cols[start] && cols[start].dataset.ckey) || '');
        const base = m ? slotBase.get(m[1]) : undefined;
        if(base === undefined) return;
        // +4 / -11 keep the 7px handle clear of the column handle's x-4..x+3 band on both sides.
        [['l', colX[start] + 4], ['r', colX[start + span] - 11]].forEach(pair=>{
          const hd = document.createElement('div');
          hd.className = 'grid-resize is-span';
          hd.style.left = pair[1] + 'px';
          hd.style.top = top + 'px';
          hd.style.height = rowH + 'px';
          hd.dataset.side = pair[0];
          hd.dataset.base = String(base);
          hd.dataset.week = td.dataset.week;
          hd.dataset.pkey = td.dataset.pkey;
          hd.dataset.own  = td.dataset.own;
          hd.dataset.lmin = td.dataset.lmin;
          hd.dataset.rmax = td.dataset.rmax;
          hd.dataset.a = String(start - base);              // the cell's current first slot
          hd.dataset.b = String(start + span - 1 - base);   // ...and its current last slot
          hd.dataset.nphases = td.dataset.nphases || '1';   // phases sharing this row right now
          hd.title = 'Drag to change how far this cell reaches · double-click for automatic';
          layer.appendChild(hd);
        });
      });
    });
  }

  // Column boundary positions for a span drag, recomputed per pointerdown so they reflect the
  // widths as they are right now (a column may have been dragged since the last render).
  function spanHandleGeometry(){
    const wrap = document.querySelector('.sheet-grid-wrap');
    const table = wrap && wrap.querySelector('table.sheet-table');
    if(!table) return null;
    const cols = [...table.querySelectorAll('colgroup col')];
    const colX = [];
    let cx = table.getBoundingClientRect().left - wrap.getBoundingClientRect().left;
    cols.forEach((c, i)=>{ colX[i] = cx; cx += parseFloat(c.style.width) || 0; });
    colX[cols.length] = cx;
    return { wrap, colX };
  }

  // Re-run shrink-to-fit without a full render, so text visibly resizes mid-drag. Walks each
  // row accumulating colSpan so a spanned cell is measured against the SUM of the columns it
  // covers, exactly as the renderer does. Throttled to one pass per frame: a pointermove can
  // fire several times per frame and this touches every text-bearing cell in the grid.
  let _fitFrame = 0;
  function applyCellFitLive(){
    if(_fitFrame) return;
    _fitFrame = requestAnimationFrame(()=>{
      _fitFrame = 0;
      const table = document.querySelector('table.sheet-table');
      if(!table || !table.tBodies[0]) return;
      const chars = [...table.querySelectorAll('colgroup col')]
        .map(c => screenPxToChars(parseFloat(c.style.width) || 0));
      [...table.tBodies[0].rows].forEach(tr=>{
        // The row's CURRENT height, not the committed rowHeights[] entry: during a row drag the
        // inline height is being written live and the store has not been updated yet, and the
        // line budget has to follow the row as it grows.
        const rowPx = parseFloat(tr.style.height) || undefined;
        let ci = 0;
        [...tr.cells].forEach(td=>{
          const span = td.colSpan || 1;
          let avail = 0;
          for(let k=0;k<span;k++) avail += chars[ci+k] || 0;
          ci += span;
          if(td.classList.contains('sheet-date') || td.classList.contains('sheet-empty')) return;
          const txt = td.textContent;
          if(!txt) return;
          const isNote = td.classList.contains('sheet-note-cell');
          const isHi   = td.classList.contains('sheet-hiatus-cell');
          const flows  = isNote || isHi;   // cells that may wrap into the row's line budget
          // A per-cell size lives on the week key, which both note and hiatus cells already
          // carry; without reading it here the drag refit would overwrite the user's chosen
          // size with the auto one (and its empty-string branch used to wipe it outright).
          const cSize = isNote ? noteFontSizeFor(td.dataset.week)
                      : isHi   ? hiatusFontSizeFor(td.dataset.week) : undefined;
          const fit = cellTextFit(txt, avail, flows
            ? { basePx: cSize || 11, manual: cSize !== undefined, rowPx }
            : {});
          const px = 11 * fit.scale;
          // A note's text lives in .cell-body (so a pinned row can cap it), so that is what
          // carries the size and wrapping; everything else styles the cell directly.
          const target = flows ? (td.querySelector('.cell-body') || td) : td;
          target.style.fontSize = Math.abs(px - 11) > 0.01 ? px.toFixed(2) + 'px' : '';
          // Only notes and hiatus bands may wrap; a wrapped PHASE label would break the
          // fixed-height colour band that makes the waterfall readable.
          if(flows){
            target.style.whiteSpace = fit.wrap ? 'pre-wrap' : 'pre';
            target.style.maxHeight = rowPx ? Math.max(0, rowPx - ROW_TEXT_PAD_PX) + 'px' : '';
            td.style.verticalAlign = fit.wrap ? 'top' : '';
            td.dataset.notefit = fit.scale.toFixed(4);
            td.dataset.notelines = String(fit.lines);
          }
        });
      });
    });
  }

  // Keep the handles sitting on the boundaries they represent while a drag is in progress.
  // Without this the purple bar stays where it was installed while the boundary moves out from
  // under the cursor, which is most of what made dragging feel unpredictable.
  function repositionColHandles(){
    const wrap = document.querySelector('.sheet-grid-wrap');
    const table = wrap && wrap.querySelector('table.sheet-table');
    if(!table) return;
    const cols = [...table.querySelectorAll('colgroup col')];
    const handles = [...wrap.querySelectorAll('.grid-resize.is-col')];
    let x = table.getBoundingClientRect().left - wrap.getBoundingClientRect().left;
    cols.forEach((c, i)=>{
      x += parseFloat(c.style.width) || 0;
      if(handles[i]) handles[i].style.left = x + 'px';
    });
  }
  function repositionRowHandles(){
    const wrap = document.querySelector('.sheet-grid-wrap');
    const table = wrap && wrap.querySelector('table.sheet-table');
    if(!table || !table.tBodies[0]) return;
    const top = wrap.getBoundingClientRect().top;
    const handles = [...wrap.querySelectorAll('.grid-resize.is-row')];
    [...table.tBodies[0].rows].forEach((tr, r)=>{
      if(handles[r]) handles[r].style.top = (tr.getBoundingClientRect().bottom - top) + 'px';
    });
    // a taller row makes the whole grid taller, so the column handles have to grow with it
    const h = table.getBoundingClientRect().height + 'px';
    wrap.querySelectorAll('.grid-resize.is-col').forEach(el=>{ el.style.height = h; });
  }

  let _liveFrame = 0;
  function scheduleLiveUpdate(isCol){
    if(_liveFrame) return;
    _liveFrame = requestAnimationFrame(()=>{
      _liveFrame = 0;
      applyCellFitLive();
      if(isCol) repositionColHandles(); else repositionRowHandles();
    });
  }

  // Drag one edge of a phase cell across the empty columns beside it. The edge snaps to column
  // boundaries because there is nothing in between to land on -- a cell either covers a column
  // or it doesn't -- and a ghost rectangle shows where it will end up, rather than rewriting
  // colSpan live and reflowing the whole table on every pointermove.
  function beginSpanDrag(e, h){
    const geo = spanHandleGeometry();
    if(!geo) return;
    const { wrap, colX } = geo;
    const base = +h.dataset.base, own = +h.dataset.own;
    const side = h.dataset.side;
    const key  = h.dataset.week + '|' + h.dataset.pkey;
    // The edge being dragged may travel between these slots; the other edge stays put.
    const lo = side === 'l' ? +h.dataset.lmin : own;
    const hi = side === 'l' ? own : +h.dataset.rmax;
    let a = +h.dataset.a, b = +h.dataset.b;

    const ghost = document.createElement('div');
    ghost.className = 'span-preview';
    ghost.style.top = h.style.top;
    ghost.style.height = h.style.height;
    wrap.querySelector('.grid-resize-layer').appendChild(ghost);
    const paint = ()=>{
      ghost.style.left  = colX[base + a] + 'px';
      ghost.style.width = Math.max(2, colX[base + b + 1] - colX[base + a]) + 'px';
    };
    paint();

    try { h.setPointerCapture(e.pointerId); } catch(_){}
    h.classList.add('dragging');
    document.body.classList.add('grid-resizing','span');
    let moved = false;

    const onMove = ev=>{
      const x = ev.clientX - wrap.getBoundingClientRect().left;
      // Nearest legal boundary. For the left edge the boundary is the slot's own left side;
      // for the right edge it is the slot AFTER it, hence the +1.
      let best = lo, bestD = Infinity;
      for(let sIdx = lo; sIdx <= hi; sIdx++){
        const d = Math.abs(colX[base + sIdx + (side === 'l' ? 0 : 1)] - x);
        if(d < bestD){ bestD = d; best = sIdx; }
      }
      if(side === 'l'){ if(best === a) return; a = best; }
      else            { if(best === b) return; b = best; }
      moved = true;
      paint();
    };
    const onUp = ()=>{
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      ghost.remove();
      h.classList.remove('dragging');
      document.body.classList.remove('grid-resizing','span');
      if(!moved) return;
      pushUndoSnapshot();
      // Stored relative to the phase's own column, so {l:0,r:0} is a real value meaning
      // "stay in your own column" -- that is how a cell gets un-filled. `k` is how many phases
      // shared the row when this was set: once that changes the width is no longer what the
      // user agreed to, so the even-share cap takes over again.
      cellSpans[key] = { l: own - a, r: b - own, k: +h.dataset.nphases || 1 };
      render(currentSchedule);
      markDirty();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  document.addEventListener('pointerdown', e=>{
    const h = e.target.closest && e.target.closest('.grid-resize');
    if(!h) return;
    e.preventDefault();
    if(h.classList.contains('is-span')){ beginSpanDrag(e, h); return; }
    const isCol = h.classList.contains('is-col');
    const table = document.querySelector('table.sheet-table');
    const cols = [...table.querySelectorAll('colgroup col')];
    const startX = e.clientX, startY = e.clientY;
    const ckey = h.dataset.ckey;
    const colIdx = +h.dataset.colIdx;
    const rowIdx = +h.dataset.row;
    const col = isCol ? cols[colIdx] : null;
    const startW = col ? (parseFloat(col.style.width) || 0) : 0;
    const tr = isCol ? null : table.tBodies[0].rows[rowIdx];
    const startH = tr ? tr.getBoundingClientRect().height : 0;
    // Heights a row drag snaps to: the default, and whatever every OTHER row is already set to.
    // Without this you end up with a 21 beside a 20 -- invisible on screen, obvious in print --
    // and no way to get back to matching except by deleting the override. Collected once per
    // drag, so a height set earlier in the same session is a target for the next row.
    const snapTargets = isCol ? [] : (()=>{
      const set = new Set([ROW_DEFAULT_PX]);
      Object.keys(rowHeights).forEach(k=>{ if(+k !== rowIdx) set.add(rowHeights[k]); });
      return [...set].filter(v=>v > 0);
    })();
    const ROW_SNAP_PX = 4;

    // Keep receiving moves even when the pointer outruns the 7px handle or leaves the window.
    try { h.setPointerCapture(e.pointerId); } catch(_){}
    h.classList.add('dragging');
    document.body.classList.add('grid-resizing');
    if(!isCol) document.body.classList.add('row');
    let moved = false;

    const onMove = ev=>{
      if(isCol){
        const px = Math.max(charsToScreenPx(COL_MIN_CHARS), Math.round(startW + (ev.clientX - startX)));
        col.style.width = px + 'px';
        // ** The table's explicit width MUST move with the columns. table-layout:fixed scales
        // ** the declared column widths to whatever the table's width is, so widening one column
        // ** without this just steals room from every other column and the dragged one never
        // ** reaches the size asked for -- which is exactly what "the dragging feels weird"
        // ** looked like.
        let sum = 0;
        cols.forEach(c=>{ sum += parseFloat(c.style.width) || 0; });
        table.style.width = sum + 'px';
      } else {
        let px = Math.max(8, Math.round(startH + (ev.clientY - startY)));
        // Snap to the nearest matching height when the pointer gets close, so rows end up equal
        // rather than one pixel apart. Nearest wins if several are in range.
        let best = null, bestD = ROW_SNAP_PX + 1;
        snapTargets.forEach(t=>{ const d = Math.abs(t - px); if(d < bestD){ bestD = d; best = t; } });
        if(best !== null) px = best;
        h.classList.toggle('snapped', best !== null && best !== Math.round(startH + (ev.clientY - startY)));
        tr.style.height = px + 'px';
      }
      moved = true;
      scheduleLiveUpdate(isCol);
    };
    const onUp = ()=>{
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      h.classList.remove('dragging','snapped');
      document.body.classList.remove('grid-resizing','row');
      if(!moved) return;
      pushUndoSnapshot();
      if(isCol){
        colWidths[ckey] = screenPxToChars(parseFloat(col.style.width) || 0);
      } else {
        rowHeights[rowIdx] = Math.round(parseFloat(tr.style.height) || ROW_DEFAULT_PX);
      }
      render(currentSchedule);
      markDirty();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });

  // Double-click a phase cell = fill the empty columns beside it, or -- if it is already
  // filling them -- pull it back to its own column. The one-click version of the edge drag,
  // and the only one of the two that is discoverable without knowing the handles are there.
  document.addEventListener('dblclick', e=>{
    const td = e.target.closest && e.target.closest('.sheet-phase-cell');
    if(!td) return;
    e.preventDefault();
    const own = +td.dataset.own;
    const maxL = own - (+td.dataset.lmin), maxR = (+td.dataset.rmax) - own;   // room available
    const curL = own - (+td.dataset.a),   curR = (+td.dataset.b) - own;       // room taken now
    const key = td.dataset.week + '|' + td.dataset.pkey;
    // Read the CURRENT span off the cell rather than the override: a cell the automatic layout
    // already widened has no override to compare against, and testing only the store made
    // double-clicking one of those do nothing at all.
    if(!maxL && !maxR && cellSpans[key] === undefined) return;   // alone in its column, nothing to do
    const filled = curL === maxL && curR === maxR;
    pushUndoSnapshot();
    const k = +td.dataset.nphases || 1;
    cellSpans[key] = filled ? { l:0, r:0, k } : { l:maxL, r:maxR, k };
    render(currentSchedule);
    markDirty();
  });

  // Double-click a handle = autofit: drop the override and let the measured width win again.
  document.addEventListener('dblclick', e=>{
    const h = e.target.closest && e.target.closest('.grid-resize');
    if(!h) return;
    e.preventDefault();
    if(h.classList.contains('is-span')){
      const key = h.dataset.week + '|' + h.dataset.pkey;
      if(cellSpans[key] === undefined) return;   // already automatic
      pushUndoSnapshot();
      delete cellSpans[key];
      render(currentSchedule);
      markDirty();
      return;
    }
    const isCol = h.classList.contains('is-col');
    const key = isCol ? h.dataset.ckey : +h.dataset.row;
    const store = isCol ? colWidths : rowHeights;
    if(store[key] === undefined) return;      // already auto -- nothing to undo
    pushUndoSnapshot();
    delete store[key];
    render(currentSchedule);
    markDirty();
  });


  const _measureCanvas = document.createElement('canvas').getContext('2d');
  const _measureCache = new Map();
  // Width of `str` in px at 11pt, i.e. in the same pixel space as EXCEL_MDW.
  function measureTextPx(str, bold){
    const key = (bold ? 'b|' : 'r|') + str;
    let v = _measureCache.get(key);
    if(v === undefined){
      _measureCanvas.font = (bold ? 'bold ' : '') + "11pt Carlito, Calibri, sans-serif";
      v = _measureCanvas.measureText(str).width;
      _measureCache.set(key, v);
    }
    return v;
  }
  // px (at the 11pt basis) -> Excel column-width units
  function pxToChars(px){ return px / EXCEL_MDW + COL_PAD_CHARS; }
  // Excel column-width units -> px, Excel's own formula
  function charsToPx(chars){ return Math.trunc(chars * EXCEL_MDW) + EXCEL_CELL_PAD; }
  // ...and the on-screen pixel width of that same column
  function charsToScreenPx(chars){ return Math.round(charsToPx(chars) * SHEET_ZOOM); }
  function clampChars(chars, minChars, maxChars){
    let w = Math.min(maxChars || COL_MAX_CHARS, Math.max(minChars || 8, Math.round(chars * 100) / 100));
    // ExcelJS treats width===9 as its own default and omits the <col> element entirely, so
    // Excel then falls back to ITS default of 8.43 and the value never takes effect -- while
    // everything here, and the screen, still believes the column is 9 wide. Nudge off the
    // sentinel. (The date column dodges this by flooring at 8.43; any computed column can land
    // on it.)
    if(w === 9) w = 9.01;
    return w;
  }

  const PHASES = [
    { key:'writersRoom', label:"Writer's Rm",  color:'#FFF2CC', textColor:'#7A6215', template:n=>`Writer's Rm wk ${n}` },
    { key:'prePrep',     label:'Pre Prep',      color:'#DAE3F3', textColor:'#203864', template:n=>`Pre Prep Wk ${n}` },
    { key:'prodPrep',    label:'Prod Prep',     color:'#D6DCE5', textColor:'#222A35', template:n=>`Prod Prep wk ${n}` },
    { key:'production',  label:'Production', color:'#E2F0D9', textColor:'#375623', template:n=>`Production wk ${n}`, inputMode:'days' },
    { key:'post',        label:'Post',       color:'#FBE5D6', textColor:'#8A4A1F', template:n=>`Post wk ${n}` },
    { key:'localization',label:'Localization',  color:'#EDEDED', textColor:'#525252', template:n=>`Localization wk ${n}` },
  ];
  const SHOOT_DAYS_PER_WEEK = 5;
  const HIATUS_COLOR = '#FF0000', HIATUS_TEXT = '#FFFFFF';
  // Interior gridlines are a genuine per-team preference, not a house style: the reference
  // Excel exports some execs work from have NO interior rules at all (only the grey header,
  // the year-block separators and the outer frame), while others want them visible. This flag
  // drives BOTH the Excel export and the waterfall PDF from one place so they can never
  // disagree, and it is the first entry of the style config the Settings menu will own.
  // 'none' matches the reference export; 'dashed' is what the tool shipped before.
  const SHEET_GRIDLINES = 'none'; // 'none' | 'dashed' | 'dotted'
  // How the waterfall PDF is produced. 'direct' writes the file byte-by-byte from the shared
  // column model; 'print' is the original route through window.print(), kept working so the two
  // can be compared and so there is somewhere to fall back to.
  const WF_PDF_MODE = 'direct';   // 'direct' | 'print'
  // Default label for the production-wide (all-phase) hiatus band. Per-phase hiatuses keep
  // their own "<Phase> Hiatus" labels; this is the generic full-width one.
  const HIATUS_DEFAULT_LABEL = 'Hiatus';
  const SIMPOST_COLOR = '#FFFF00', SIMPOST_TEXT = '#5B5B00';
  // Grid text is BLACK. Only a cell whose fill is dark or user-chosen -- a note, a hiatus band --
  // picks its ink for contrast, via textColorFor().
  //
  // The phase palette carries a per-phase textColor (a dark tint of its own fill) and the
  // waterfall used to draw labels in it. The workbook never did: baseStyle() sets no font colour
  // for a phase cell, so Excel has always rendered them black -- which is why the reference
  // exports look right and the on-screen grid and the PDF did not. Black everywhere settles it
  // in favour of what the workbook, and the reference, already do.
  const GRID_TEXT_COLOR = '#000000';
  // The marker text for a Simultaneous Post week, shared by the waterfall, the Excel export and the
  // month view so all three always agree. computeSchedule only assigns simPostNum in the numbered
  // mode, so a falsy number means the un-numbered ("old") mode and we print the bare label.
  function simPostLabel(week){
    const n = week && week.simPostNum;
    return n ? ('Simultaneous Post wk ' + n) : 'Simultaneous Post';
  }
  const MILESTONE_COLOR = '#7030A0';
  const MILESTONE_TEXT = '#FFFFFF';
  const ROWS_PER_BLOCK = 53; // legacy fallback only, no longer used for grouping

  // Union/statutory holiday data, keyed by REGION (not just country) because the no-shoot days
  // genuinely differ by province. Generated from the holiday RULES (Nth-weekday-of-month, fixed
  // dates, Easter via the standard algorithm) rather than hand-transcribed, so the dates are
  // reproducible and internally consistent; see the research notes in the commit history.
  //
  // US = the IATSE Basic Agreement's eleven (11) recognized holidays (effective 1 Jan 2025, which
  // added Juneteenth). Columbus Day and Veterans Day are deliberately ABSENT: per IATSE Local 695's
  // holiday calendar Veterans Day is in the AICP *commercial* contract only, and Columbus Day is on
  // no IATSE calendar at all -- listing them wrongly stole shoot days.
  //
  // Canada is split per province because the statutory lists really do diverge -- e.g. Boxing Day is
  // Ontario-only among these; Remembrance Day is BC/AB but not ON/QC; Truth and Reconciliation is
  // statutory in BC and MB but not ON/QC/AB; the Fete nationale (St-Jean-Baptiste) is Quebec-only.
  //
  // Weekend handling: a holiday landing on Sat/Sun also emits an '(Observed)' weekday entry, since
  // that substitute day is what actually costs a shoot day (weekends are skipped anyway). The US
  // follows the IATSE ASA rule (Sat -> preceding Friday, Sun -> following Monday); Canada/UK move
  // forward to the next free weekday, so Christmas-Sat + Boxing-Sun become Mon + Tue, not a clash.
  // Double-check 'observed' dates against your own union agreement before relying on them.
  const HOLIDAYS = {
    'US-GEN': [
      {date:'2026-01-01', name:"New Year's Day"},
      {date:'2026-01-19', name:'Martin Luther King Jr. Day'},
      {date:'2026-02-16', name:"Presidents' Day"},
      {date:'2026-04-03', name:'Good Friday'},
      {date:'2026-05-25', name:'Memorial Day'},
      {date:'2026-06-19', name:'Juneteenth'},
      {date:'2026-07-03', name:'Independence Day (Observed)'},
      {date:'2026-07-04', name:'Independence Day'},
      {date:'2026-09-07', name:'Labor Day'},
      {date:'2026-11-26', name:'Thanksgiving'},
      {date:'2026-11-27', name:'Day After Thanksgiving'},
      {date:'2026-12-25', name:'Christmas Day'},
      {date:'2027-01-01', name:"New Year's Day"},
      {date:'2027-01-18', name:'Martin Luther King Jr. Day'},
      {date:'2027-02-15', name:"Presidents' Day"},
      {date:'2027-03-26', name:'Good Friday'},
      {date:'2027-05-31', name:'Memorial Day'},
      {date:'2027-06-18', name:'Juneteenth (Observed)'},
      {date:'2027-06-19', name:'Juneteenth'},
      {date:'2027-07-04', name:'Independence Day'},
      {date:'2027-07-05', name:'Independence Day (Observed)'},
      {date:'2027-09-06', name:'Labor Day'},
      {date:'2027-11-25', name:'Thanksgiving'},
      {date:'2027-11-26', name:'Day After Thanksgiving'},
      {date:'2027-12-24', name:'Christmas Day (Observed)'},
      {date:'2027-12-25', name:'Christmas Day'},
      {date:'2027-12-31', name:"New Year's Day (Observed)"},
      {date:'2028-01-01', name:"New Year's Day"},
      {date:'2028-01-17', name:'Martin Luther King Jr. Day'},
      {date:'2028-02-21', name:"Presidents' Day"},
      {date:'2028-04-14', name:'Good Friday'},
      {date:'2028-05-29', name:'Memorial Day'},
      {date:'2028-06-19', name:'Juneteenth'},
      {date:'2028-07-04', name:'Independence Day'},
      {date:'2028-09-04', name:'Labor Day'},
      {date:'2028-11-23', name:'Thanksgiving'},
      {date:'2028-11-24', name:'Day After Thanksgiving'},
      {date:'2028-12-25', name:'Christmas Day'},
      {date:'2029-01-01', name:"New Year's Day"},
      {date:'2029-01-15', name:'Martin Luther King Jr. Day'},
      {date:'2029-02-19', name:"Presidents' Day"},
      {date:'2029-03-30', name:'Good Friday'},
      {date:'2029-05-28', name:'Memorial Day'},
      {date:'2029-06-19', name:'Juneteenth'},
      {date:'2029-07-04', name:'Independence Day'},
      {date:'2029-09-03', name:'Labor Day'},
      {date:'2029-11-22', name:'Thanksgiving'},
      {date:'2029-11-23', name:'Day After Thanksgiving'},
      {date:'2029-12-25', name:'Christmas Day'},
    ],
    'US-NY': [
      {date:'2026-01-01', name:"New Year's Day"},
      {date:'2026-01-19', name:'Martin Luther King Jr. Day'},
      {date:'2026-02-16', name:"Presidents' Day"},
      {date:'2026-05-25', name:'Memorial Day'},
      {date:'2026-06-19', name:'Juneteenth'},
      {date:'2026-07-03', name:'Independence Day (Observed)'},
      {date:'2026-07-04', name:'Independence Day'},
      {date:'2026-09-07', name:'Labor Day'},
      {date:'2026-11-11', name:'Veterans Day'},
      {date:'2026-11-26', name:'Thanksgiving'},
      {date:'2026-11-27', name:'Day After Thanksgiving'},
      {date:'2026-12-25', name:'Christmas Day'},
      {date:'2027-01-01', name:"New Year's Day"},
      {date:'2027-01-18', name:'Martin Luther King Jr. Day'},
      {date:'2027-02-15', name:"Presidents' Day"},
      {date:'2027-05-31', name:'Memorial Day'},
      {date:'2027-06-18', name:'Juneteenth (Observed)'},
      {date:'2027-06-19', name:'Juneteenth'},
      {date:'2027-07-04', name:'Independence Day'},
      {date:'2027-07-05', name:'Independence Day (Observed)'},
      {date:'2027-09-06', name:'Labor Day'},
      {date:'2027-11-11', name:'Veterans Day'},
      {date:'2027-11-25', name:'Thanksgiving'},
      {date:'2027-11-26', name:'Day After Thanksgiving'},
      {date:'2027-12-24', name:'Christmas Day (Observed)'},
      {date:'2027-12-25', name:'Christmas Day'},
      {date:'2027-12-31', name:"New Year's Day (Observed)"},
      {date:'2028-01-01', name:"New Year's Day"},
      {date:'2028-01-17', name:'Martin Luther King Jr. Day'},
      {date:'2028-02-21', name:"Presidents' Day"},
      {date:'2028-05-29', name:'Memorial Day'},
      {date:'2028-06-19', name:'Juneteenth'},
      {date:'2028-07-04', name:'Independence Day'},
      {date:'2028-09-04', name:'Labor Day'},
      {date:'2028-11-10', name:'Veterans Day (Observed)'},
      {date:'2028-11-11', name:'Veterans Day'},
      {date:'2028-11-23', name:'Thanksgiving'},
      {date:'2028-11-24', name:'Day After Thanksgiving'},
      {date:'2028-12-25', name:'Christmas Day'},
      {date:'2029-01-01', name:"New Year's Day"},
      {date:'2029-01-15', name:'Martin Luther King Jr. Day'},
      {date:'2029-02-19', name:"Presidents' Day"},
      {date:'2029-05-28', name:'Memorial Day'},
      {date:'2029-06-19', name:'Juneteenth'},
      {date:'2029-07-04', name:'Independence Day'},
      {date:'2029-09-03', name:'Labor Day'},
      {date:'2029-11-11', name:'Veterans Day'},
      {date:'2029-11-12', name:'Veterans Day (Observed)'},
      {date:'2029-11-22', name:'Thanksgiving'},
      {date:'2029-11-23', name:'Day After Thanksgiving'},
      {date:'2029-12-25', name:'Christmas Day'},
    ],
    'CA-BC': [
      {date:'2026-01-01', name:"New Year's Day"},
      {date:'2026-02-16', name:'Family Day'},
      {date:'2026-04-03', name:'Good Friday'},
      {date:'2026-05-18', name:'Victoria Day'},
      {date:'2026-07-01', name:'Canada Day'},
      {date:'2026-08-03', name:'B.C. Day'},
      {date:'2026-09-07', name:'Labour Day'},
      {date:'2026-09-30', name:'National Day for Truth and Reconciliation'},
      {date:'2026-10-12', name:'Thanksgiving'},
      {date:'2026-11-11', name:'Remembrance Day'},
      {date:'2026-12-25', name:'Christmas Day'},
      {date:'2027-01-01', name:"New Year's Day"},
      {date:'2027-02-15', name:'Family Day'},
      {date:'2027-03-26', name:'Good Friday'},
      {date:'2027-05-24', name:'Victoria Day'},
      {date:'2027-07-01', name:'Canada Day'},
      {date:'2027-08-02', name:'B.C. Day'},
      {date:'2027-09-06', name:'Labour Day'},
      {date:'2027-09-30', name:'National Day for Truth and Reconciliation'},
      {date:'2027-10-11', name:'Thanksgiving'},
      {date:'2027-11-11', name:'Remembrance Day'},
      {date:'2027-12-25', name:'Christmas Day'},
      {date:'2027-12-27', name:'Christmas Day (Observed)'},
      {date:'2028-01-01', name:"New Year's Day"},
      {date:'2028-01-03', name:"New Year's Day (Observed)"},
      {date:'2028-02-21', name:'Family Day'},
      {date:'2028-04-14', name:'Good Friday'},
      {date:'2028-05-22', name:'Victoria Day'},
      {date:'2028-07-01', name:'Canada Day'},
      {date:'2028-07-03', name:'Canada Day (Observed)'},
      {date:'2028-08-07', name:'B.C. Day'},
      {date:'2028-09-04', name:'Labour Day'},
      {date:'2028-09-30', name:'National Day for Truth and Reconciliation'},
      {date:'2028-10-02', name:'National Day for Truth and Reconciliation (Observed)'},
      {date:'2028-10-09', name:'Thanksgiving'},
      {date:'2028-11-11', name:'Remembrance Day'},
      {date:'2028-11-13', name:'Remembrance Day (Observed)'},
      {date:'2028-12-25', name:'Christmas Day'},
      {date:'2029-01-01', name:"New Year's Day"},
      {date:'2029-02-19', name:'Family Day'},
      {date:'2029-03-30', name:'Good Friday'},
      {date:'2029-05-21', name:'Victoria Day'},
      {date:'2029-07-01', name:'Canada Day'},
      {date:'2029-07-02', name:'Canada Day (Observed)'},
      {date:'2029-08-06', name:'B.C. Day'},
      {date:'2029-09-03', name:'Labour Day'},
      {date:'2029-09-30', name:'National Day for Truth and Reconciliation'},
      {date:'2029-10-01', name:'National Day for Truth and Reconciliation (Observed)'},
      {date:'2029-10-08', name:'Thanksgiving'},
      {date:'2029-11-11', name:'Remembrance Day'},
      {date:'2029-11-12', name:'Remembrance Day (Observed)'},
      {date:'2029-12-25', name:'Christmas Day'},
    ],
    'CA-ON': [
      {date:'2026-01-01', name:"New Year's Day"},
      {date:'2026-02-16', name:'Family Day'},
      {date:'2026-04-03', name:'Good Friday'},
      {date:'2026-05-18', name:'Victoria Day'},
      {date:'2026-07-01', name:'Canada Day'},
      {date:'2026-09-07', name:'Labour Day'},
      {date:'2026-10-12', name:'Thanksgiving'},
      {date:'2026-12-25', name:'Christmas Day'},
      {date:'2026-12-26', name:'Boxing Day'},
      {date:'2026-12-28', name:'Boxing Day (Observed)'},
      {date:'2027-01-01', name:"New Year's Day"},
      {date:'2027-02-15', name:'Family Day'},
      {date:'2027-03-26', name:'Good Friday'},
      {date:'2027-05-24', name:'Victoria Day'},
      {date:'2027-07-01', name:'Canada Day'},
      {date:'2027-09-06', name:'Labour Day'},
      {date:'2027-10-11', name:'Thanksgiving'},
      {date:'2027-12-25', name:'Christmas Day'},
      {date:'2027-12-26', name:'Boxing Day'},
      {date:'2027-12-27', name:'Christmas Day (Observed)'},
      {date:'2027-12-28', name:'Boxing Day (Observed)'},
      {date:'2028-01-01', name:"New Year's Day"},
      {date:'2028-01-03', name:"New Year's Day (Observed)"},
      {date:'2028-02-21', name:'Family Day'},
      {date:'2028-04-14', name:'Good Friday'},
      {date:'2028-05-22', name:'Victoria Day'},
      {date:'2028-07-01', name:'Canada Day'},
      {date:'2028-07-03', name:'Canada Day (Observed)'},
      {date:'2028-09-04', name:'Labour Day'},
      {date:'2028-10-09', name:'Thanksgiving'},
      {date:'2028-12-25', name:'Christmas Day'},
      {date:'2028-12-26', name:'Boxing Day'},
      {date:'2029-01-01', name:"New Year's Day"},
      {date:'2029-02-19', name:'Family Day'},
      {date:'2029-03-30', name:'Good Friday'},
      {date:'2029-05-21', name:'Victoria Day'},
      {date:'2029-07-01', name:'Canada Day'},
      {date:'2029-07-02', name:'Canada Day (Observed)'},
      {date:'2029-09-03', name:'Labour Day'},
      {date:'2029-10-08', name:'Thanksgiving'},
      {date:'2029-12-25', name:'Christmas Day'},
      {date:'2029-12-26', name:'Boxing Day'},
    ],
    'CA-QC': [
      {date:'2026-01-01', name:"New Year's Day"},
      {date:'2026-04-03', name:'Good Friday'},
      {date:'2026-05-18', name:'National Patriots’ Day'},
      {date:'2026-06-24', name:'Fête nationale (St-Jean-Baptiste)'},
      {date:'2026-07-01', name:'Canada Day'},
      {date:'2026-09-07', name:'Labour Day'},
      {date:'2026-10-12', name:'Thanksgiving'},
      {date:'2026-12-25', name:'Christmas Day'},
      {date:'2027-01-01', name:"New Year's Day"},
      {date:'2027-03-26', name:'Good Friday'},
      {date:'2027-05-24', name:'National Patriots’ Day'},
      {date:'2027-06-24', name:'Fête nationale (St-Jean-Baptiste)'},
      {date:'2027-07-01', name:'Canada Day'},
      {date:'2027-09-06', name:'Labour Day'},
      {date:'2027-10-11', name:'Thanksgiving'},
      {date:'2027-12-25', name:'Christmas Day'},
      {date:'2027-12-27', name:'Christmas Day (Observed)'},
      {date:'2028-01-01', name:"New Year's Day"},
      {date:'2028-01-03', name:"New Year's Day (Observed)"},
      {date:'2028-04-14', name:'Good Friday'},
      {date:'2028-05-22', name:'National Patriots’ Day'},
      {date:'2028-06-24', name:'Fête nationale (St-Jean-Baptiste)'},
      {date:'2028-06-26', name:'Fête nationale (St-Jean-Baptiste) (Observed)'},
      {date:'2028-07-01', name:'Canada Day'},
      {date:'2028-07-03', name:'Canada Day (Observed)'},
      {date:'2028-09-04', name:'Labour Day'},
      {date:'2028-10-09', name:'Thanksgiving'},
      {date:'2028-12-25', name:'Christmas Day'},
      {date:'2029-01-01', name:"New Year's Day"},
      {date:'2029-03-30', name:'Good Friday'},
      {date:'2029-05-21', name:'National Patriots’ Day'},
      {date:'2029-06-24', name:'Fête nationale (St-Jean-Baptiste)'},
      {date:'2029-06-25', name:'Fête nationale (St-Jean-Baptiste) (Observed)'},
      {date:'2029-07-01', name:'Canada Day'},
      {date:'2029-07-02', name:'Canada Day (Observed)'},
      {date:'2029-09-03', name:'Labour Day'},
      {date:'2029-10-08', name:'Thanksgiving'},
      {date:'2029-12-25', name:'Christmas Day'},
    ],
    'CA-AB': [
      {date:'2026-01-01', name:"New Year's Day"},
      {date:'2026-02-16', name:'Alberta Family Day'},
      {date:'2026-04-03', name:'Good Friday'},
      {date:'2026-05-18', name:'Victoria Day'},
      {date:'2026-07-01', name:'Canada Day'},
      {date:'2026-09-07', name:'Labour Day'},
      {date:'2026-10-12', name:'Thanksgiving'},
      {date:'2026-11-11', name:'Remembrance Day'},
      {date:'2026-12-25', name:'Christmas Day'},
      {date:'2027-01-01', name:"New Year's Day"},
      {date:'2027-02-15', name:'Alberta Family Day'},
      {date:'2027-03-26', name:'Good Friday'},
      {date:'2027-05-24', name:'Victoria Day'},
      {date:'2027-07-01', name:'Canada Day'},
      {date:'2027-09-06', name:'Labour Day'},
      {date:'2027-10-11', name:'Thanksgiving'},
      {date:'2027-11-11', name:'Remembrance Day'},
      {date:'2027-12-25', name:'Christmas Day'},
      {date:'2027-12-27', name:'Christmas Day (Observed)'},
      {date:'2028-01-01', name:"New Year's Day"},
      {date:'2028-01-03', name:"New Year's Day (Observed)"},
      {date:'2028-02-21', name:'Alberta Family Day'},
      {date:'2028-04-14', name:'Good Friday'},
      {date:'2028-05-22', name:'Victoria Day'},
      {date:'2028-07-01', name:'Canada Day'},
      {date:'2028-07-03', name:'Canada Day (Observed)'},
      {date:'2028-09-04', name:'Labour Day'},
      {date:'2028-10-09', name:'Thanksgiving'},
      {date:'2028-11-11', name:'Remembrance Day'},
      {date:'2028-11-13', name:'Remembrance Day (Observed)'},
      {date:'2028-12-25', name:'Christmas Day'},
      {date:'2029-01-01', name:"New Year's Day"},
      {date:'2029-02-19', name:'Alberta Family Day'},
      {date:'2029-03-30', name:'Good Friday'},
      {date:'2029-05-21', name:'Victoria Day'},
      {date:'2029-07-01', name:'Canada Day'},
      {date:'2029-07-02', name:'Canada Day (Observed)'},
      {date:'2029-09-03', name:'Labour Day'},
      {date:'2029-10-08', name:'Thanksgiving'},
      {date:'2029-11-11', name:'Remembrance Day'},
      {date:'2029-11-12', name:'Remembrance Day (Observed)'},
      {date:'2029-12-25', name:'Christmas Day'},
    ],
    'CA-MB': [
      {date:'2026-01-01', name:"New Year's Day"},
      {date:'2026-02-16', name:'Louis Riel Day'},
      {date:'2026-04-03', name:'Good Friday'},
      {date:'2026-05-18', name:'Victoria Day'},
      {date:'2026-07-01', name:'Canada Day'},
      {date:'2026-09-07', name:'Labour Day'},
      {date:'2026-09-30', name:'National Day for Truth and Reconciliation'},
      {date:'2026-10-12', name:'Thanksgiving'},
      {date:'2026-12-25', name:'Christmas Day'},
      {date:'2027-01-01', name:"New Year's Day"},
      {date:'2027-02-15', name:'Louis Riel Day'},
      {date:'2027-03-26', name:'Good Friday'},
      {date:'2027-05-24', name:'Victoria Day'},
      {date:'2027-07-01', name:'Canada Day'},
      {date:'2027-09-06', name:'Labour Day'},
      {date:'2027-09-30', name:'National Day for Truth and Reconciliation'},
      {date:'2027-10-11', name:'Thanksgiving'},
      {date:'2027-12-25', name:'Christmas Day'},
      {date:'2027-12-27', name:'Christmas Day (Observed)'},
      {date:'2028-01-01', name:"New Year's Day"},
      {date:'2028-01-03', name:"New Year's Day (Observed)"},
      {date:'2028-02-21', name:'Louis Riel Day'},
      {date:'2028-04-14', name:'Good Friday'},
      {date:'2028-05-22', name:'Victoria Day'},
      {date:'2028-07-01', name:'Canada Day'},
      {date:'2028-07-03', name:'Canada Day (Observed)'},
      {date:'2028-09-04', name:'Labour Day'},
      {date:'2028-09-30', name:'National Day for Truth and Reconciliation'},
      {date:'2028-10-02', name:'National Day for Truth and Reconciliation (Observed)'},
      {date:'2028-10-09', name:'Thanksgiving'},
      {date:'2028-12-25', name:'Christmas Day'},
      {date:'2029-01-01', name:"New Year's Day"},
      {date:'2029-02-19', name:'Louis Riel Day'},
      {date:'2029-03-30', name:'Good Friday'},
      {date:'2029-05-21', name:'Victoria Day'},
      {date:'2029-07-01', name:'Canada Day'},
      {date:'2029-07-02', name:'Canada Day (Observed)'},
      {date:'2029-09-03', name:'Labour Day'},
      {date:'2029-09-30', name:'National Day for Truth and Reconciliation'},
      {date:'2029-10-01', name:'National Day for Truth and Reconciliation (Observed)'},
      {date:'2029-10-08', name:'Thanksgiving'},
      {date:'2029-12-25', name:'Christmas Day'},
    ],
    'CA-NS': [
      {date:'2026-01-01', name:"New Year's Day"},
      {date:'2026-02-16', name:'Nova Scotia Heritage Day'},
      {date:'2026-04-03', name:'Good Friday'},
      {date:'2026-07-01', name:'Canada Day'},
      {date:'2026-09-07', name:'Labour Day'},
      {date:'2026-12-25', name:'Christmas Day'},
      {date:'2027-01-01', name:"New Year's Day"},
      {date:'2027-02-15', name:'Nova Scotia Heritage Day'},
      {date:'2027-03-26', name:'Good Friday'},
      {date:'2027-07-01', name:'Canada Day'},
      {date:'2027-09-06', name:'Labour Day'},
      {date:'2027-12-25', name:'Christmas Day'},
      {date:'2027-12-27', name:'Christmas Day (Observed)'},
      {date:'2028-01-01', name:"New Year's Day"},
      {date:'2028-01-03', name:"New Year's Day (Observed)"},
      {date:'2028-02-21', name:'Nova Scotia Heritage Day'},
      {date:'2028-04-14', name:'Good Friday'},
      {date:'2028-07-01', name:'Canada Day'},
      {date:'2028-07-03', name:'Canada Day (Observed)'},
      {date:'2028-09-04', name:'Labour Day'},
      {date:'2028-12-25', name:'Christmas Day'},
      {date:'2029-01-01', name:"New Year's Day"},
      {date:'2029-02-19', name:'Nova Scotia Heritage Day'},
      {date:'2029-03-30', name:'Good Friday'},
      {date:'2029-07-01', name:'Canada Day'},
      {date:'2029-07-02', name:'Canada Day (Observed)'},
      {date:'2029-09-03', name:'Labour Day'},
      {date:'2029-12-25', name:'Christmas Day'},
    ],
    'UK': [
      {date:'2026-01-01', name:"New Year's Day"},
      {date:'2026-04-03', name:'Good Friday'},
      {date:'2026-04-06', name:'Easter Monday'},
      {date:'2026-05-04', name:'Early May Bank Holiday'},
      {date:'2026-05-25', name:'Spring Bank Holiday'},
      {date:'2026-08-03', name:'Summer Bank Holiday (Scotland)'},
      {date:'2026-08-31', name:'Summer Bank Holiday'},
      {date:'2026-12-25', name:'Christmas Day'},
      {date:'2026-12-26', name:'Boxing Day'},
      {date:'2026-12-28', name:'Boxing Day (Observed)'},
      {date:'2027-01-01', name:"New Year's Day"},
      {date:'2027-03-26', name:'Good Friday'},
      {date:'2027-03-29', name:'Easter Monday'},
      {date:'2027-05-03', name:'Early May Bank Holiday'},
      {date:'2027-05-31', name:'Spring Bank Holiday'},
      {date:'2027-08-02', name:'Summer Bank Holiday (Scotland)'},
      {date:'2027-08-30', name:'Summer Bank Holiday'},
      {date:'2027-12-25', name:'Christmas Day'},
      {date:'2027-12-26', name:'Boxing Day'},
      {date:'2027-12-27', name:'Christmas Day (Observed)'},
      {date:'2027-12-28', name:'Boxing Day (Observed)'},
      {date:'2028-01-01', name:"New Year's Day"},
      {date:'2028-01-03', name:"New Year's Day (Observed)"},
      {date:'2028-04-14', name:'Good Friday'},
      {date:'2028-04-17', name:'Easter Monday'},
      {date:'2028-05-01', name:'Early May Bank Holiday'},
      {date:'2028-05-29', name:'Spring Bank Holiday'},
      {date:'2028-08-07', name:'Summer Bank Holiday (Scotland)'},
      {date:'2028-08-28', name:'Summer Bank Holiday'},
      {date:'2028-12-25', name:'Christmas Day'},
      {date:'2028-12-26', name:'Boxing Day'},
      {date:'2029-01-01', name:"New Year's Day"},
      {date:'2029-03-30', name:'Good Friday'},
      {date:'2029-04-02', name:'Easter Monday'},
      {date:'2029-05-07', name:'Early May Bank Holiday'},
      {date:'2029-05-28', name:'Spring Bank Holiday'},
      {date:'2029-08-06', name:'Summer Bank Holiday (Scotland)'},
      {date:'2029-08-27', name:'Summer Bank Holiday'},
      {date:'2029-12-25', name:'Christmas Day'},
      {date:'2029-12-26', name:'Boxing Day'},
    ],
  };

  function computeYearBlocks(weeks){
    const blocks = [];
    let currentYear = null, start = 0;
    weeks.forEach((w,i)=>{
      const y = w.date.getUTCFullYear();
      if(currentYear===null){ currentYear = y; start = i; }
      else if(y!==currentYear){
        blocks.push({year:currentYear, startIdx:start, count:i-start});
        currentYear = y; start = i;
      }
    });
    if(weeks.length>0) blocks.push({year:currentYear, startIdx:start, count:weeks.length-start});
    return blocks;
  }

  // ---------- date helpers ----------
  const MIN_YEAR = 1970, MAX_YEAR = 2100;
  function parseDateUTC(str){
    if(!str) return null;
    const [y,m,d] = str.split('-').map(Number);
    if(!y || y < MIN_YEAR || y > MAX_YEAR) return null; // guards against typo'd years (e.g. an extra digit) hanging the page
    const out = new Date(Date.UTC(y, m-1, d));
    // Return null rather than an Invalid Date. A malformed tail (a composite cell key like
    // "2026-01-05|writersRoom", or a half-typed value) otherwise yields an Invalid Date, which is
    // TRUTHY -- so callers that check the result pass it on and blow up later inside toISOString().
    return Number.isFinite(out.getTime()) ? out : null;
  }
  function addDays(date, n){ return new Date(date.getTime() + n*DAY_MS); }
  function mondayOf(date){
    const dow = date.getUTCDay();
    const back = (dow+6)%7;
    return addDays(date, -back);
  }
  // m/d/yy with no zero padding -- Excel's own short-date format, and what the reference
  // exports show ("1/5/26", not "01/05/26"), in the date column and inside note text alike.
  // Notes in calendars saved before this change keep whatever they were written with; the
  // formatter is not retroactive and rewriting stored note text was not worth it.
  function fmtShort(date){
    const mm = date.getUTCMonth()+1;
    const dd = date.getUTCDate();
    const yy = String(date.getUTCFullYear()).slice(2);
    return `${mm}/${dd}/${yy}`;
  }
  // Format the auto-generated notes for a week as inline "Label date" lines, e.g.
  // "Writers Room Opens 7/20/26". Multiple notes in the same week are newline-separated.
  function autoNotesText(autoNotes){
    if(!autoNotes || !autoNotes.length) return '';
    return autoNotes.map(n => n.date ? `${n.label} ${fmtShort(n.date)}` : n.label).join('\n');
  }
  // Resolve what a note cell should actually show. Priority:
  //  - user has an override for this week -> use its text (may be '' = explicitly cleared)
  //  - otherwise -> the inline auto-notes text
  // Returns the string to display ('' means the cell is empty / no highlight).
  function effectiveNoteText(weekKey, autoNotes){
    const u = userNotes[weekKey];
    if(u !== undefined) return (u.text || '');   // includes explicit-clear ('' suppresses auto)
    return autoNotesText(autoNotes);
  }
  // Per-holiday, per-view visibility for holiday NOTES only. This changes what the notes
  // column DISPLAYS in each view -- it never touches the production scheduling math (holidays
  // still skip Production shoot days exactly as before). Default: hidden in the Waterfall,
  // shown in the Month view. holidayView (declared with the other note state) holds explicit
  // per-holiday overrides keyed by the holiday's id (its ISO date).
  const HOLIDAY_VIEW_DEFAULT = {sheet:false, month:true};
  function holidayVisibleIn(hid, view){
    const sel = holidayView[hid];
    if(sel && sel[view] !== undefined) return !!sel[view];
    return !!HOLIDAY_VIEW_DEFAULT[view];
  }

  // ---- Holiday identity -------------------------------------------------------------------
  // A holiday's id used to be its ISO date, which was fragile: switching region kept the date but
  // changed the holiday, so a "hide this one" choice silently transferred to whatever now fell on
  // that day. Ids are now name+year, so a choice follows the HOLIDAY. Settings for a holiday the
  // new region doesn't have simply lie dormant and come back if you switch back.
  function holidaySlug(name, isoDate){
    const year = String(isoDate || '').slice(0, 4);
    const base = String(name || '')
      .toLowerCase()
      .replace(/[’']/g, '')          // drop apostrophes so "New Year's" -> "new-years"
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base + '@' + year;
  }
  // Files saved before ids became name-based key holidayView by bare ISO date. Rewrite those keys
  // once, resolving each date against the region's list to recover the holiday's name.
  function migrateHolidayViewKeys(){
    const isoKey = /^\d{4}-\d{2}-\d{2}$/;
    const keys = Object.keys(holidayView || {});
    if(!keys.some(k => isoKey.test(k))) return;
    const list = (function(){ const r = effectiveRegionKey(); return (r && HOLIDAYS[r]) || []; })();
    const nameByDate = {};
    list.forEach(h=>{ if(!nameByDate[h.date]) nameByDate[h.date] = h.name; });
    const out = {};
    keys.forEach(k=>{
      if(isoKey.test(k) && nameByDate[k]) out[holidaySlug(nameByDate[k], k)] = holidayView[k];
      else out[k] = holidayView[k];
    });
    holidayView = out;
  }
  // A holiday is on unless explicitly switched off. Turning it OFF removes it entirely: it stops
  // costing Production a shoot day AND stops generating notes (the two note checkboxes grey out).
  function holidayEnabled(hid){ return !holidayOff[hid]; }
  // Every holiday that applies to this calendar -- the region's list plus the user's own -- each
  // tagged with its id and whether it's enabled. Custom holidays are deliberately NOT region-scoped:
  // "studio shutdown" belongs to the show, so it survives a region change.
  function fullHolidayList(regionKey){
    const out = [];
    const seen = {};
    ((regionKey && HOLIDAYS[regionKey]) || []).forEach(h=>{
      if(seen[h.date + '|' + h.name]) return;
      seen[h.date + '|' + h.name] = true;
      const hid = holidaySlug(h.name, h.date);
      out.push({date:h.date, name:h.name, hid, custom:false, enabled:holidayEnabled(hid)});
    });
    (customHolidays || []).forEach(c=>{
      if(!c || !c.date || !c.name) return;
      out.push({date:c.date, name:c.name, hid:c.id, custom:true, enabled:holidayEnabled(c.id)});
    });
    return out;
  }
  // Drop holiday auto-notes the user hasn't enabled for this view; pass everything else through.
  function autoNotesForView(list, view){
    if(!list || !list.length) return list || [];
    return list.filter(n => !n.holiday || holidayVisibleIn(n.hid, view));
  }
  function colLetter(n){
    let s='';
    while(n>0){ const rem=(n-1)%26; s=String.fromCharCode(65+rem)+s; n=Math.floor((n-1)/26); }
    return s;
  }

  // ---------- state ----------
  const MAX_WEEKS = 600; // ~11.5 years - a generous ceiling that catches typo'd years before they hang the page

  function rawInputToWeeks(p, rawValue){
    if(p.inputMode==='days'){
      return Math.ceil(rawValue / SHOOT_DAYS_PER_WEEK);
    }
    return rawValue;
  }

  function readState(){
    const allDefs = getAllPhaseDefs();
    const phases = {};
    let hasInvalidYear = false;
    // Once Show Info is complete it is the source of truth for how long Production runs:
    // episodes x days-per-episode replaces whatever shoot-day count was typed into the
    // Production row, everywhere (spreadsheet, export and month view alike).
    const info = showInfoStatus();
    allDefs.forEach(p=>{
      const startStr = document.getElementById('start-'+p.key).value;
      let rawValue = parseInt(document.getElementById('weeks-'+p.key).value, 10);
      if(p.key === 'production' && info.complete) rawValue = info.totalShootDays;
      if(startStr && parseDateUTC(startStr)===null) hasInvalidYear = true;
      const weeks = rawValue>0 ? rawInputToWeeks(p, rawValue) : NaN;
      phases[p.key] = (startStr && weeks>0) ? {start:startStr, weeks, rawValue} : null;
    });
    const hiatuses = [];
    document.querySelectorAll('.hiatus-entry').forEach(el=>{
      const start = el.querySelector('.hiatus-start').value;
      const weeks = parseInt(el.querySelector('.hiatus-weeks').value, 10);
      if(start && parseDateUTC(start)===null) hasInvalidYear = true;
      if(start && weeks>0) hiatuses.push({start, weeks});
    });
    // Per-phase hiatus: a start + week count scoped to a single phase, collected only when that
    // phase's toggle is on. Keyed by phase key so the scheduler can pause just that phase.
    const phaseHiatuses = {};
    allDefs.forEach(p=>{
      const en = document.getElementById('phiatus-en-'+p.key);
      if(!en || !en.checked) return;
      const sEl = document.getElementById('phiatus-start-'+p.key);
      const wEl = document.getElementById('phiatus-weeks-'+p.key);
      const start = sEl ? sEl.value : '';
      const weeks = wEl ? parseInt(wEl.value, 10) : NaN;
      if(start && parseDateUTC(start)===null) hasInvalidYear = true;
      if(start && weeks>0) phaseHiatuses[p.key] = {start, weeks};
    });
    return {
      phases,
      allDefs,
      hiatuses,
      phaseHiatuses,
      hasInvalidYear,
      // The HOLIDAYS key for the chosen region: 'US' / 'UK' directly, or the province key
      // ('CA-BC' etc.) when the country is Canada. Named unionCountry for continuity with the
      // rest of computeSchedule, which only ever uses it to look up HOLIDAYS[...].
      unionCountry: effectiveRegionKey(),
      simultaneousPost:{
        enabled: document.getElementById('simpost-enabled').checked,
        offsetWeeks: parseInt(document.getElementById('simpost-offset').value,10) || 0,
        // Numbering mode. Off (default): every flagged week just reads "Simultaneous Post" and Post
        // starts over at wk 1. On: the flagged weeks are numbered and Post continues from them.
        // Off is also the behaviour that predates the checkbox, so saved files older than it -- which
        // carry no stored value and fall back to this default -- read exactly as they did when made.
        countAsPostWeeks: (document.getElementById('simpost-count')||{checked:false}).checked
      }
    };
  }

  // ---------- core scheduling ----------
  function computeSchedule(state){
    if(state.hasInvalidYear){
      return {weeks:[], maxConcurrent:0, totalWeeks:0, error:'invalid-year'};
    }

    const hiatuses = (state.hiatuses||[]).filter(h=>h.start && h.weeks>0 && parseDateUTC(h.start)).map(h=>{
      const start = mondayOf(parseDateUTC(h.start));
      const end = addDays(start, h.weeks*7);
      return {start, end};
    });

    // Per-phase hiatuses: same shape as a global hiatus (Monday-snapped start + week span) but
    // each pauses only the one phase it belongs to. Kept keyed by phase so the scheduler can
    // both extend that phase's end and mark only its own column as interrupted.
    const phaseHiatusRanges = {};
    Object.keys(state.phaseHiatuses||{}).forEach(k=>{
      const h = state.phaseHiatuses[k];
      const pd = parseDateUTC(h.start);
      if(!pd || !(h.weeks>0)) return;
      const start = mondayOf(pd);
      phaseHiatusRanges[k] = {start, end: addDays(start, h.weeks*7)};
    });

    // A hiatus pauses whatever phase it falls inside, so that phase still delivers its full
    // requested week count -- it pushes the phase's end date out rather than quietly losing weeks.
    // This can cascade: extending a phase's end can pull a second hiatus into range, so we
    // repeat until nothing new gets absorbed.
    function extendEndForHiatus(start, weeksRequested, phaseKey){
      // Walk week-by-week from start: only non-hiatus weeks count toward the requested
      // total, so the phase always delivers its full week count. This uses the exact
      // predicate the renderer uses to mark a week as hiatus, which fixes two bugs the
      // old sum-of-durations approach had: (1) overlapping hiatuses covering the same
      // calendar week now extend the phase by that week ONCE (the union), not once per
      // hiatus; (2) a hiatus that begins BEFORE the phase but overlaps its start now
      // extends the phase too (previously only hiatuses starting inside the range did).
      // A phase's OWN hiatus (phaseKey) pauses it the same way, so it too pushes the end out.
      const ownHi = phaseKey ? phaseHiatusRanges[phaseKey] : null;
      let delivered = 0, cur = start, safety = 0;
      while(delivered < weeksRequested && safety++ < 2000){
        const inHiatus = hiatuses.some(h => cur >= h.start && cur < h.end)
                         || (ownHi && cur >= ownHi.start && cur < ownHi.end);
        if(!inHiatus) delivered++;
        cur = addDays(cur, 7);
      }
      return cur;
    }

    // Day-level simulation for Production only: walks day by day from start, skipping
    // weekends, any Holiday Hiatus days, and any union holiday for the selected country,
    // until enough actual shoot days have been counted. Returns the last real shoot day
    // and the list of union holidays that landed on a would-be shoot day (for notes).
    function simulateProductionSchedule(start, shootDaysRequested, holidayList){
      const ownHi = phaseHiatusRanges['production'];
      let current = start;
      let count = 0;
      let lastShootDay = null;
      const holidaysHit = [];
      const shootDays = [];   // the actual working days Production shoots (for the month view)
      let safety = 0;
      while(count < shootDaysRequested && safety < 5000){
        safety++;
        const dow = current.getUTCDay();
        const isWeekday = dow>=1 && dow<=5;
        const inHiatus = hiatuses.some(h=> current>=h.start && current<h.end)
                         || (ownHi && current>=ownHi.start && current<ownHi.end);
        if(isWeekday && !inHiatus){
          const iso = current.toISOString().slice(0,10);
          const holiday = holidayList.find(h=>h.date===iso);
          if(holiday){
            holidaysHit.push({date:current, name:holiday.name});
          } else {
            count++;
            lastShootDay = current;
            shootDays.push(iso);
          }
        }
        current = addDays(current, 1);
      }
      return {lastShootDay: lastShootDay || start, holidaysHit, shootDays};
    }

    const segments = [];
    let productionInfo = null;
    state.allDefs.forEach(p=>{
      const cfg = state.phases[p.key];
      if(cfg && cfg.start && cfg.weeks>0){
        const parsed = parseDateUTC(cfg.start);
        if(!parsed) return;
        const start = mondayOf(parsed);
        let end, weeksForSegment = cfg.weeks, shootDaysForSegment = null;
        if(p.key==='production'){
          // Only ENABLED holidays cost a shoot day; a holiday switched off in Settings is treated
          // as an ordinary working day.
          const holidayList = fullHolidayList(state.unionCountry).filter(h=>h.enabled);
          const sim = simulateProductionSchedule(start, cfg.rawValue, holidayList);
          const weeksNeeded = Math.round((mondayOf(sim.lastShootDay)-start)/DAY_MS/7) + 1;
          end = addDays(start, weeksNeeded*7);
          // The calendar labels Production "wk 1, wk 2..." only on weeks it actually works --
          // hiatus weeks are stop-work and get a Hiatus band instead. Count the same way here
          // so the hint agrees with the grid rather than counting elapsed calendar weeks.
          const prodOwnHi = phaseHiatusRanges['production'];
          let workedWeeks = 0;
          for(let wkStart = new Date(start.getTime()); wkStart < end; wkStart = addDays(wkStart, 7)){
            const inHiatus = hiatuses.some(h=> wkStart>=h.start && wkStart<h.end)
                             || (prodOwnHi && wkStart>=prodOwnHi.start && wkStart<prodOwnHi.end);
            if(!inHiatus) workedWeeks++;
          }
          weeksForSegment = workedWeeks;
          productionInfo = {startDate:start, lastShootDay:sim.lastShootDay, holidaysHit:sim.holidaysHit, shootDays:sim.shootDays};
          shootDaysForSegment = sim.shootDays;
        } else {
          end = extendEndForHiatus(start, cfg.weeks, p.key);
        }
        segments.push(Object.assign({}, p, {start, end, weeks:weeksForSegment, enteredDate:parsed, shootDays:shootDaysForSegment, phaseHiatus: phaseHiatusRanges[p.key] || null}));
      }
    });

    if(segments.length===0){
      return {weeks:[], maxConcurrent:0, totalWeeks:0};
    }

    // A hiatus only affects the visible range if it actually overlaps something scheduled --
    // otherwise the always-present default hiatus entries (which span years) would force the
    // calendar to stretch across all of them even when nothing is scheduled nearby.
    const relevantHiatuses = hiatuses.filter(h => segments.some(s => h.start < s.end && h.end > s.start));
    const naturalStarts = segments.map(s=>s.start.getTime()).concat(relevantHiatuses.map(h=>h.start.getTime()));
    const naturalEnds   = segments.map(s=>s.end.getTime()).concat(relevantHiatuses.map(h=>h.end.getTime()));

    function firstMondayOfYear(year){
      const jan1 = new Date(Date.UTC(year,0,1));
      const daysToAdd = (8 - jan1.getUTCDay()) % 7;
      return addDays(jan1, daysToAdd);
    }

    // Show the FULL calendar year(s) touched by the schedule -- from the first Monday of the
    // earliest year through the end of the latest year -- so every export is a consistent,
    // familiar full-year shape instead of starting wherever the first phase happens to land.
    const allStarts = [...naturalStarts];
    const allEnds = [...naturalEnds];
    if(naturalStarts.length){
      const naturalStartYear = new Date(Math.min.apply(null, naturalStarts)).getUTCFullYear();
      allStarts.push(firstMondayOfYear(naturalStartYear).getTime());
    }
    if(naturalEnds.length){
      const lastActiveDay = addDays(new Date(Math.max.apply(null, naturalEnds)), -1);
      allEnds.push(firstMondayOfYear(lastActiveDay.getUTCFullYear()+1).getTime());
    }
    // fall back to whichever bound was actually supplied if one list is empty
    if(allStarts.length===0) allStarts.push(allEnds[0]);
    if(allEnds.length===0) allEnds.push(allStarts[0]);

    const overallStart = new Date(Math.min.apply(null, allStarts));
    const overallEnd   = new Date(Math.max.apply(null, allEnds));
    const totalWeeks = Math.round((overallEnd-overallStart)/DAY_MS/7);

    if(!Number.isFinite(totalWeeks) || totalWeeks < 0){
      return {weeks:[], maxConcurrent:0, totalWeeks:0, error:'invalid-range'};
    }
    if(totalWeeks > MAX_WEEKS){
      return {weeks:[], maxConcurrent:0, totalWeeks:0, error:'too-large', attemptedWeeks: totalWeeks};
    }

    const weekCounters = {};
    state.allDefs.forEach(p=> weekCounters[p.key]=1);

    // Assign each phase segment a STABLE column with strict start-order priority:
    //   - Process segments in the order they start.
    //   - Earliest-starting phase sits leftmost; each later phase sits to the RIGHT of every
    //     phase that started before it and is still running when it begins. A later phase can
    //     never slide left of an earlier one that's still going.
    //   - A phase may REUSE a freed column (keeping the sheet narrow for linear schedules)
    //     ONLY when that column is genuinely free AND the reuse doesn't place it left of any
    //     still-running earlier phase. Concretely: the chosen column index must be greater
    //     than the highest column occupied by any phase still running at this seg's start.
    //   - Ties on start date keep their original phase order (stable sort by index).
    const segCol = new Map();
    {
      const byStart = segments
        .map((seg, i)=>({seg, i}))
        .sort((a,b)=> (a.seg.start - b.seg.start) || (a.i - b.i))
        .map(o=>o.seg);
      const colFreeAt = []; // colFreeAt[i] = timestamp when column i becomes free again
      byStart.forEach(seg=>{
        const startT = seg.start.getTime();
        // Lowest column index this phase is allowed to occupy: it must sit to the right of
        // every earlier phase that is still running now. Any column still busy at startT
        // belongs to an earlier-starting phase (we go in start order), so the floor is one
        // past the highest currently-busy column.
        let minCol = 0;
        for(let i=0;i<colFreeAt.length;i++){
          if(colFreeAt[i] > startT) minCol = i + 1; // column i is busy -> must be right of it
        }
        // Among columns >= minCol, reuse the lowest one that's actually free; else open new.
        let placedAt = -1;
        for(let i=minCol;i<colFreeAt.length;i++){
          if(colFreeAt[i] <= startT){ placedAt = i; break; }
        }
        if(placedAt===-1){
          placedAt = Math.max(minCol, colFreeAt.length);
          while(colFreeAt.length <= placedAt) colFreeAt.push(0);
        }
        colFreeAt[placedAt] = seg.end.getTime();
        segCol.set(seg, placedAt);
      });
    }

    const prodSeg = segments.find(s=>s.key==='production');

    // Simultaneous Post = post work done DURING the shoot. A week counts as a sim-post week when the
    // toggle is on and Production is running that week, from `offsetWeeks` after Production begins
    // through its end. (Callers still skip global-hiatus weeks, where the shoot -- and thus post --
    // is paused, so those never count.)
    const isSimPostWeek = (ws) => {
      if(!(state.simultaneousPost.enabled && prodSeg)) return false;
      if(ws < prodSeg.start || ws >= prodSeg.end) return false;
      const wip = Math.round((ws - prodSeg.start)/DAY_MS/7);
      return wip >= state.simultaneousPost.offsetWeeks;
    };
    // Numbering mode (the "Number these weeks & continue Post's count" checkbox):
    //  - ON  -- sim-post weeks are numbered 1..K ("Simultaneous Post wk N") and the regular Post
    //           phase picks up from K+1, so post-week numbering is one unbroken sequence across the
    //           concurrent-with-the-shoot and standalone stretches. Count K up front (order-
    //           independent, in case Post's own span overlaps Production) and start Post past it.
    //  - OFF -- the original behavior: every flagged week just reads "Simultaneous Post" (no number)
    //           and Post is untouched, starting over at wk 1.
    const countSimAsPost = state.simultaneousPost.countAsPostWeeks !== false;
    let simPostTotal = 0;
    if(countSimAsPost){
      for(let i=0;i<totalWeeks;i++){
        const ws = addDays(overallStart, i*7);
        if(hiatuses.find(h=> ws>=h.start && ws<h.end)) continue; // shoot paused -> not a post week
        if(isSimPostWeek(ws)) simPostTotal++;
      }
      if(simPostTotal > 0 && weekCounters.post !== undefined) weekCounters.post = simPostTotal + 1;
    }

    const weeks = [];
    let maxConcurrent = 1;
    let simPostCounter = 0;

    for(let i=0;i<totalWeeks;i++){
      const weekStart = addDays(overallStart, i*7);
      const hiatus = hiatuses.find(h=> weekStart>=h.start && weekStart<h.end);
      const cells = [];
      let simPost = false, simPostNum = 0;

      if(hiatus){
        cells.push({type:'hiatus', label:HIATUS_DEFAULT_LABEL});
      } else {
        const active = segments.filter(s=> weekStart>=s.start && weekStart<s.end).sort((a,b)=>a.start-b.start);
        active.forEach(ph=>{
          const ownHi = ph.phaseHiatus;
          if(ownHi && weekStart>=ownHi.start && weekStart<ownHi.end){
            // This phase is paused this week: draw a hiatus band in ITS column only. It keeps
            // its slot (so neighbors can't slide into it) but never spans sideways, and it does
            // not advance the phase's week counter -- the paused weeks aren't work weeks.
            const baseLabel = (ph.label || 'Phase') + ' Hiatus';
            cells.push({type:'phaseHiatus', key:ph.key, col:segCol.get(ph),
              weekIso: isoOf(weekStart), defaultLabel: baseLabel,
              color: HIATUS_COLOR, textColor: HIATUS_TEXT, label: baseLabel});
          } else {
            const num = weekCounters[ph.key]++;
            cells.push({type:'phase', key:ph.key, label:ph.template(num), color:ph.color, textColor:ph.textColor, col:segCol.get(ph)});
          }
        });
        // simPostNum stays 0 in the un-numbered mode; the renderers fall back to the bare label.
        if(isSimPostWeek(weekStart)){ simPost = true; if(countSimAsPost) simPostNum = ++simPostCounter; }
      }
      maxConcurrent = Math.max(maxConcurrent, cells.length);
      weeks.push({date:weekStart, cells, simPost, simPostNum});
    }
    // Flag interior gaps: genuinely EMPTY weeks (no phase and no hiatus) bounded by real phase
    // coverage on both sides. "Coverage" means an actual phase cell (a running phase, or a
    // phase paused by its OWN hiatus) -- NOT a standalone global-hiatus band. This matters because
    // the calendar auto-extends to the end of the last year it touches, and the always-present
    // year-end break (a global hiatus) lands in that trailing padding. Counting that hiatus as
    // "coverage" used to close the trailing empty run and mis-report months of padding as an
    // "unscheduled gap." Anchoring to the first/last PHASE week keeps lead-in/lead-out padding --
    // and any hiatus sitting inside it -- from ever being flagged.
    const gaps = [];
    const hasPhase = w => w.cells.some(c => c.type === 'phase' || c.type === 'phaseHiatus');
    let firstPhaseIdx = -1, lastPhaseIdx = -1;
    for(let i=0;i<weeks.length;i++){
      if(hasPhase(weeks[i])){ if(firstPhaseIdx===-1) firstPhaseIdx = i; lastPhaseIdx = i; }
    }
    if(firstPhaseIdx !== -1){
      let gapStart = null;
      const closeGap = (endIdx)=> gaps.push({startDate: weeks[gapStart].date, endDate: addDays(weeks[endIdx].date,6), weeks: (endIdx+1)-gapStart});
      for(let i=firstPhaseIdx+1;i<lastPhaseIdx;i++){
        const empty = weeks[i].cells.length===0;
        if(empty && gapStart===null) gapStart = i;
        if(!empty && gapStart!==null){ closeGap(i-1); gapStart = null; }
      }
      // A run of empty weeks reaching the last phase is still interior -> flag it (loop stops before lastPhaseIdx).
      if(gapStart!==null) closeGap(lastPhaseIdx-1);
    }

    // map each milestone/holiday note to the week index it falls in, shared by preview + export
    const notesByIdx = {};
    function addNote(date, label, meta){
      const idx = weeks.findIndex(w => date>=w.date && date<addDays(w.date,7));
      if(idx===-1) return;
      if(!notesByIdx[idx]) notesByIdx[idx] = [];
      const note = {label, date};
      if(meta) Object.assign(note, meta);
      notesByIdx[idx].push(note);
    }

    // Every union holiday (for the selected country) that falls inside ANY entered phase's
    // span. This is the master list the per-view holiday checklist is generated from, and the
    // source of the holiday NOTES shown in the calendar. It is deliberately independent of the
    // day-level Production simulation above: that math still skips shoot days on holidays exactly
    // as before -- this list only governs what the notes column DISPLAYS.
    const phaseHolidays = [];
    // Every holiday landing inside a phase -- INCLUDING ones switched off, because the Settings
    // list has to show them to let you switch them back on. The `enabled` flag decides what
    // actually produces a note below.
    {
      const seen = {};
      fullHolidayList(state.unionCountry).forEach(h=>{
        const hd = parseDateUTC(h.date);
        if(!hd || seen[h.hid]) return;
        if(!segments.some(s=> hd>=s.start && hd<s.end)) return;
        seen[h.hid] = true;
        phaseHolidays.push({iso:h.date, name:h.name, date:hd, hid:h.hid,
                            custom:!!h.custom, enabled:h.enabled});
      });
      phaseHolidays.sort((a,b)=> a.date - b.date);
    }

    if(productionInfo){
      addNote(productionInfo.startDate, 'Start Principal Photography');
      addNote(productionInfo.lastShootDay, 'Principal Photography Wraps');
    }
    // Holiday notes: one per phase-spanning holiday, tagged so each view -- and each individual
    // holiday -- can independently show or hide it (see autoNotesForView / holidayVisibleIn).
    // The notes are always generated; the per-holiday, per-view checklist governs what actually
    // displays (default: hidden in the Waterfall, shown in the Month view). This does NOT change
    // the schedule -- only Production's date math skips these days, and only for Production.
    phaseHolidays.filter(h=>h.enabled).forEach(h=> addNote(h.date, h.name, {holiday:true, hid:h.hid}));
    // "Writer's Room Opens" on the first week of the Writer's Room phase.
    const wrSeg = segments.find(s=>s.key==='writersRoom');
    if(wrSeg) addNote(wrSeg.start, "Writer's Room Opens");

    return {weeks, maxConcurrent, totalWeeks, overallStart, gaps, productionInfo, notesByIdx, segments, hiatuses, phaseHolidays};
  }

  // ---------- UI: phase rows ----------
  function buildPhaseRows(){
    const wrap = document.getElementById('phase-rows');
    wrap.innerHTML = '';
    PHASES.forEach(p=>{
      const row = document.createElement('div');
      row.className = 'phase-row';
      const isDays = p.inputMode==='days';
      const fieldLabel = isDays ? 'Total Shooting Days' : 'Weeks';
      const placeholder = isDays ? 'e.g. 105' : 'e.g. 12';
      // Production's total is never typed: it's the sum of the episode list, which Show Info
      // builds. The input still exists (hidden) because it remains the single place the rest
      // of the app reads that number from -- it's just now written to rather than edited.
      const fieldsHtml = (p.key === 'production')
        ? `<label>Start date <input type="date" id="start-${p.key}"></label>
           <input type="hidden" id="weeks-${p.key}">
           <div class="prod-total-readout" id="prod-total-readout"></div>`
        : `<label>Start date <input type="date" id="start-${p.key}"></label>
           <label>${fieldLabel} <input type="number" id="weeks-${p.key}" min="1" step="1" placeholder="${placeholder}"></label>`;
      const swColor = PHASE_COLOR_OPTIONS[autoPhaseColorIndex(p)].color;
      row.innerHTML = `
        <div class="swatch clickable" id="swatch-${p.key}" style="background:${swColor};" title="Click to set this phase's color"></div>
        <div class="custom-phase-header">
          <input type="text" class="phase-name-input" id="name-${p.key}" value="${p.label}" placeholder="${p.label}">
        </div>
        <div class="phase-fields">
          ${fieldsHtml}
        </div>
        ${p.key !== 'writersRoom' ? `<button class="autostart-btn" id="autostart-${p.key}" data-phase="${p.key}" type="button">↳ Start after previous phase</button>` : ''}
        <div class="phase-meta" id="meta-${p.key}"></div>
        ${phaseHiatusBlockHtml(p.key, p.label)}
        ${p.key === 'production' ? `
        <div class="ep-panel" id="ep-panel" style="display:none;">
          <div class="ep-panel-warn" id="ep-panel-warn"></div>
          <div id="episode-rows"></div>
        </div>
        <div class="simpost-panel">
          <label class="simpost-toggle">
            <input type="checkbox" id="simpost-enabled">
            Simultaneous Post
          </label>
          <label class="simpost-offset-row" id="simpost-offset-row">
            Starts
            <input type="number" id="simpost-offset" min="0" step="1" value="0">
            weeks after Production begins
          </label>
          <label class="simpost-count-row" id="simpost-count-row" title="On: the flagged weeks read &quot;Simultaneous Post wk 1, 2...&quot; and the regular Post phase carries on from there (Post wk 3, 4...). Off: every flagged week reads just &quot;Simultaneous Post&quot; and Post starts over at wk 1.">
            <input type="checkbox" id="simpost-count">
            <span>Number these weeks &amp; continue Post&rsquo;s count</span>
          </label>
        </div>` : ''}
      `;
      wrap.appendChild(row);
      row.querySelector('.phase-name-input').addEventListener('input', update);
      const sw = row.querySelector('.swatch');
      sw.addEventListener('click', ()=>{
        openPhaseColorPop(sw, autoPhaseColorIndex(p), (i)=>{
          phaseColorOverride[p.key] = i;
          sw.style.background = PHASE_COLOR_OPTIONS[i].color;
          update();
        });
      });
    });
  }

  // Custom phases: user-named, always standard start-date + weeks (never shooting-days mode,
  // never auto-noted). Color is pickable -- including matching one of the 6 standard categories,
  // e.g. so a second "post-production" block for a prior season can look like Post while still
  // being a fully independent, freely-overlapping phase.
  const PHASE_COLOR_OPTIONS = [
    {name:"Gray",                color:'#EDEDED', text:'#525252'},
    {name:"Light blue",          color:'#DEEBF7', text:'#1F4E79'},
    {name:"Light purple",        color:'#E4DFEC', text:'#5F497A'},
    {name:"Light teal",          color:'#D5F0EE', text:'#1F6357'},
    {name:"Gold (like Writer's Rm)",  color:'#FFF2CC', text:'#7A6215'},
    {name:"Blue (like Pre Prep)",     color:'#DAE3F3', text:'#203864'},
    {name:"Slate (like Prod Prep)",   color:'#D6DCE5', text:'#222A35'},
    {name:"Green (like Production)",  color:'#E2F0D9', text:'#375623'},
    {name:"Orange (like Post)",       color:'#FBE5D6', text:'#8A4A1F'},
  ];
  // Per-auto-phase color override: key -> index into PHASE_COLOR_OPTIONS. Auto phases default to
  // whichever preset matches their built-in color; the user can repick from the swatch.
  let phaseColorOverride = {};
  function autoPhaseColorIndex(p){
    if(p.key in phaseColorOverride) return phaseColorOverride[p.key];
    const idx = PHASE_COLOR_OPTIONS.findIndex(o=>o.color.toUpperCase() === String(p.color||'').toUpperCase());
    return idx >= 0 ? idx : 0;
  }

  // A small floating picker of the standard phase colors, anchored under a clicked color square.
  // Shared by the built-in phases and the custom phases so both recolor the same way.
  let activeColorPop = null;
  function closePhaseColorPop(){
    if(activeColorPop){
      activeColorPop.remove();
      activeColorPop = null;
      document.removeEventListener('mousedown', onColorPopOutside, true);
      window.removeEventListener('resize', closePhaseColorPop);
      window.removeEventListener('scroll', closePhaseColorPop, true);
    }
  }
  function onColorPopOutside(e){
    if(!activeColorPop) return;
    if(activeColorPop.contains(e.target)) return;
    if(activeColorPop._anchor && activeColorPop._anchor.contains(e.target)) return;
    closePhaseColorPop();
  }
  function openPhaseColorPop(anchorEl, currentIndex, onPick){
    closePhaseColorPop();
    const pop = document.createElement('div');
    pop.className = 'phase-color-pop';
    pop._anchor = anchorEl;
    PHASE_COLOR_OPTIONS.forEach((o,i)=>{
      const sw = document.createElement('span');
      sw.className = 'pc-sw' + (i===currentIndex ? ' selected' : '');
      sw.style.background = o.color;
      sw.title = o.name;
      sw.addEventListener('click', (e)=>{ e.stopPropagation(); closePhaseColorPop(); onPick(i); });
      pop.appendChild(sw);
    });
    document.body.appendChild(pop);
    const r = anchorEl.getBoundingClientRect();
    let top = window.scrollY + r.bottom + 5;
    let left = window.scrollX + r.left;
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
    const pr = pop.getBoundingClientRect();
    if(pr.right > window.innerWidth - 8) pop.style.left = (window.scrollX + window.innerWidth - pr.width - 8) + 'px';
    if(pr.bottom > window.innerHeight - 8) pop.style.top = (window.scrollY + r.top - pr.height - 5) + 'px';
    activeColorPop = pop;
    setTimeout(()=>{
      document.addEventListener('mousedown', onColorPopOutside, true);
      window.addEventListener('resize', closePhaseColorPop);
      window.addEventListener('scroll', closePhaseColorPop, true);
    }, 0);
  }

  // Markup for the per-phase hiatus controls, dropped under each phase's fields. IDs are keyed
  // by phase so their values round-trip through collectFieldValues()/restore like any field.
  function phaseHiatusBlockHtml(key, label){
    return `<div class="phase-hiatus">
        <label class="phase-hiatus-toggle">
          <input type="checkbox" class="phiatus-en" id="phiatus-en-${key}">
          <span class="phiatus-label" id="phiatus-label-${key}">${escHtml(label)} Hiatus</span>
        </label>
        <div class="phase-hiatus-fields" id="phiatus-fields-${key}" style="display:none;">
          <label>Start date <input type="date" class="phiatus-start" id="phiatus-start-${key}"></label>
          <label>Weeks <input type="number" class="phiatus-weeks" id="phiatus-weeks-${key}" min="1" step="1" value="2"></label>
          <div class="snap-note"></div>
        </div>
      </div>`;
  }

  let customPhaseDefs = [];
  let customPhaseCounter = 0;
  // Episodes (month view). Each: {id, name, days, nameEdited, daysEdited}. The *Edited flags
  // let autofill keep names/day-counts in sync with Show Info + Season until the user
  // deliberately overrides one, at which point that field stops being managed.
  let episodeDefs = [];
  let episodeCounter = 0;
  // Names of user-edited episodes discarded by lowering the episode count, shown once as a
  // warning so the loss isn't silent.
  let lastDroppedEpisodes = [];

  function getAllPhaseDefs(){
    const fixed = PHASES.map(p=>{
      const nameEl = document.getElementById('name-'+p.key);
      const typed = nameEl ? nameEl.value.trim() : '';
      let def = p;
      if(typed && typed!==p.label){
        def = Object.assign({}, p, { label:typed, template:n=>`${typed} wk ${n}` });
      }
      if(p.key in phaseColorOverride){
        const opt = PHASE_COLOR_OPTIONS[phaseColorOverride[p.key]];
        if(opt) def = Object.assign({}, def, { color:opt.color, textColor:opt.text });
      }
      return def;
    });
    const custom = customPhaseDefs.map(cp=>{
      const nameEl = document.getElementById('name-'+cp.key);
      const name = (nameEl && nameEl.value.trim()) || 'Custom phase';
      const opt = PHASE_COLOR_OPTIONS[cp.colorIndex] || PHASE_COLOR_OPTIONS[0];
      return { key:cp.key, label:name, color:opt.color, textColor:opt.text, template:n=>`${name} wk ${n}` };
    });
    return fixed.concat(custom);
  }

  function addCustomPhaseRow(){
    const key = 'custom' + (++customPhaseCounter);
    const colorIndex = customPhaseDefs.length % PHASE_COLOR_OPTIONS.length;
    customPhaseDefs.push({key, colorIndex});
    const opt = PHASE_COLOR_OPTIONS[colorIndex];
    const wrap = document.getElementById('custom-phase-rows');
    const row = document.createElement('div');
    row.className = 'phase-row';
    row.dataset.key = key;
    row.innerHTML = `
      <div class="swatch clickable" id="swatch-${key}" style="background:${opt.color};" title="Click to set this phase's color"></div>
      <div class="custom-phase-header">
        <input type="text" class="phase-name-input" id="name-${key}" placeholder="Phase name">
        <button class="icon-btn remove-custom-phase" title="Remove">&times;</button>
      </div>
      <div class="phase-fields">
        <label>Start date <input type="date" id="start-${key}"></label>
        <label>Weeks <input type="number" id="weeks-${key}" min="1" step="1" placeholder="e.g. 12"></label>
      </div>
      <div class="phase-meta" id="meta-${key}"></div>
      ${phaseHiatusBlockHtml(key, 'Phase')}
    `;
    row.querySelector('.remove-custom-phase').addEventListener('click', async ()=>{
      // Only prompt when there's something to lose -- an untouched blank row deletes freely.
      const nameEl = row.querySelector('.phase-name-input');
      const startEl = document.getElementById('start-'+key);
      const weeksEl = document.getElementById('weeks-'+key);
      const hasData = (startEl && startEl.value) || (weeksEl && weeksEl.value) || (nameEl && nameEl.value.trim());
      if(hasData && !(await uiConfirm('Remove this phase? Its name, dates, duration and hiatus will be lost.', { title: 'Remove phase', confirmLabel: 'Remove', danger: true }))) return;
      customPhaseDefs = customPhaseDefs.filter(cp=>cp.key!==key);
      row.remove();
      update();
    });
    const swEl = row.querySelector('.swatch');
    swEl.addEventListener('click', ()=>{
      const cp = customPhaseDefs.find(c=>c.key===key);
      openPhaseColorPop(swEl, cp ? cp.colorIndex : 0, (i)=>{
        if(cp) cp.colorIndex = i;
        swEl.style.background = PHASE_COLOR_OPTIONS[i].color;
        update();
      });
    });
    // Keep the hiatus toggle's label in step with the phase's typed name.
    row.querySelector('.phase-name-input').addEventListener('input', (e)=>{
      const lbl = document.getElementById('phiatus-label-'+key);
      if(lbl) lbl.textContent = ((e.target.value.trim() || 'Phase')) + ' Hiatus';
    });
    row.querySelectorAll('input').forEach(inp=> inp.addEventListener('input', update));
    wrap.appendChild(row);
  }

  // `prefillLocked` defaults to TRUE: an all-phase hiatus is normally anchored to the real
  // calendar (the built-in defaults are all winter breaks), so the shift tools leave it where it
  // is unless the user unlocks it. Per-phase hiatuses have no such lock -- they belong to their
  // phase's work, so they always travel with a shift.
  function addHiatusRow(prefillStart, prefillWeeks, prefillLocked){
    const list = document.getElementById('hiatus-list');
    const row = document.createElement('div');
    row.className = 'hiatus-entry';
    const locked = (prefillLocked === undefined) ? true : !!prefillLocked;
    row.innerHTML = `
      <label>Start date <input type="date" class="hiatus-start" value="${prefillStart||''}"></label>
      <label>Weeks <input type="number" class="hiatus-weeks" min="1" step="1" value="${prefillWeeks||2}"></label>
      <button class="icon-btn remove-hiatus" title="Remove">&times;</button>
      <label class="hiatus-lock" title="Keep this hiatus on these dates when the calendar is shifted"><input type="checkbox" class="hiatus-locked"${locked?' checked':''}>Lock in place</label>
      <div class="snap-note"></div>
    `;
    row.querySelector('.remove-hiatus').addEventListener('click', async ()=>{
      const startEl = row.querySelector('.hiatus-start');
      if(startEl && startEl.value && !(await uiConfirm('Remove this hiatus?', { title: 'Remove hiatus', confirmLabel: 'Remove', danger: true }))) return;
      row.remove(); update();
    });
    row.querySelectorAll('input').forEach(inp=> inp.addEventListener('input', update));
    list.appendChild(row);
  }

  const DEFAULT_HIATUSES = [
    ['2026-12-21', 2],
    ['2027-12-20', 2],
    ['2028-12-18', 2],
    ['2029-12-24', 2],
  ];
  function addDefaultHiatuses(){
    document.getElementById('hiatus-list').innerHTML = '';
    DEFAULT_HIATUSES.forEach(([s,w]) => addHiatusRow(s,w));
  }

  // "Snapped to Mon …" hint for any date field. Dates in this tool always snap to the Monday of
  // their week; when the typed value isn't already a Monday we say so under the field so the
  // shift is never silent. Returns '' for empty/invalid/already-Monday values.
  function snapNoteText(dateStr){
    if(!dateStr) return '';
    const d = parseDateUTC(dateStr);
    if(!d) return '';
    if(d.getUTCDay() === 1) return '';
    return 'Snapped to Mon ' + fmtShort(mondayOf(d));
  }
  function refreshSnapNotes(){
    document.querySelectorAll('.hiatus-entry').forEach(row=>{
      const inp = row.querySelector('.hiatus-start');
      const note = row.querySelector('.snap-note');
      if(inp && note) note.textContent = snapNoteText(inp.value);
    });
    document.querySelectorAll('.phase-hiatus-fields').forEach(fields=>{
      const inp = fields.querySelector('.phiatus-start');
      const note = fields.querySelector('.snap-note');
      if(inp && note) note.textContent = snapNoteText(inp.value);
    });
  }

  // ---------- rendering: summary + timeline + table ----------
  // Auto-generated checklist of every holiday that lands inside a phase, with a Waterfall and a
  // Month checkbox each. Re-rendered on every schedule change so it always matches the phases and
  // the selected country. Hidden when the master switch is off or no holidays fall in any phase.
  function renderHolidayVisList(schedule){
    const wrap = document.getElementById('holiday-vis');
    const listEl = document.getElementById('holiday-vis-list');
    const emptyEl = document.getElementById('holiday-vis-empty');
    if(!wrap || !listEl) return;
    const inRange = (schedule && schedule.phaseHolidays) || [];
    // Custom holidays are always listed even when they fall outside the current phases -- they're
    // the user's own entries, so silently hiding one they just added would look like a bug.
    const shown = inRange.slice();
    const have = {};
    inRange.forEach(h=> have[h.hid] = true);
    (customHolidays || []).forEach(c=>{
      if(!c || !c.date || !c.name || have[c.id]) return;
      const d = parseDateUTC(c.date);
      if(!d) return;
      shown.push({iso:c.date, name:c.name, date:d, hid:c.id, custom:true,
                  enabled:holidayEnabled(c.id), outOfRange:true});
    });
    shown.sort((a,b)=> a.date - b.date);
    const countryEl = document.getElementById('union-country');
    const hasCountry = countryEl ? !!countryEl.value : false;
    if(!shown.length){
      wrap.style.display = 'none';
      listEl.innerHTML = '';
      // Empty list: say why -- no region picked vs. a region set but none landing in range.
      if(emptyEl){
        emptyEl.textContent = hasCountry
          ? 'No holidays fall inside your current phases yet.'
          : 'Set a Production Region above to apply union holidays.';
        emptyEl.style.display = 'block';
      }
      return;
    }
    if(emptyEl) emptyEl.style.display = 'none';
    wrap.style.display = 'block';
    listEl.innerHTML = shown.map(h=>{
      const on = h.enabled !== false;
      // A holiday on a Saturday/Sunday can't cost a shoot day -- weekends are already skipped --
      // so its Enable box is inert. Its "(Observed)" weekday twin is the one that matters, and
      // saying so here heads off "I un-ticked it and nothing happened".
      const dow = h.date.getUTCDay();
      const weekend = (dow === 0 || dow === 6);
      const label = escHtml(h.name) + ' · ' + fmtShort(h.date);
      // Presentation lives in .hv-* classes (legacy.css) rather than inline style= attributes --
      // these rows used to carry ~7 inline declarations each, which no stylesheet pass could touch.
      // The .hv-en/.hv-cb/.hv-del classes and data-hid/data-view attributes are the delegated
      // handlers' matching contract; the class swap must never touch those.
      const dim = on ? '' : ' hv-dim';
      const noteAttrs = on ? '' : ' disabled';   // notes are meaningless with the holiday off
      const s = holidayVisibleIn(h.hid, 'sheet') ? ' checked' : '';
      const m = holidayVisibleIn(h.hid, 'month') ? ' checked' : '';
      const tag = h.custom
        ? ' <span class="hv-tag">custom</span>'
        : '';
      const oor = h.outOfRange
        ? ' <span class="hv-oor">(outside schedule)</span>'
        : '';
      const wk = weekend ? ' title="Falls on a weekend — no shoot day to skip. Its (Observed) entry is the one that counts."' : '';
      const del = h.custom
        ? '<button type="button" class="icon-btn hv-del" data-hid="'+h.hid+'" title="Remove this custom holiday">&times;</button>'
        : '';
      return '<div class="hv-row">'
        + '<span class="hv-label'+dim+'" title="'+label+'">'
        +   '<span class="hv-name">'+escHtml(h.name)+tag+oor+'</span>'
        +   '<span class="hv-date">'+fmtShort(h.date)+'</span>'
        + '</span>'
        + '<span class="hv-cell"'+wk+'><input type="checkbox" class="hv-en" aria-label="Enable '+label+'" data-hid="'+h.hid+'"'+(on?' checked':'')+(weekend?' data-weekend="1"':'')+'></span>'
        + '<span class="hv-cell'+dim+'"><input type="checkbox" class="hv-cb" aria-label="Show '+label+' in Waterfall view" data-hid="'+h.hid+'" data-view="sheet"'+s+noteAttrs+'></span>'
        + '<span class="hv-cell hv-cell-month'+dim+'"><input type="checkbox" class="hv-cb" aria-label="Show '+label+' in Month view" data-hid="'+h.hid+'" data-view="month"'+m+noteAttrs+'></span>'
        + del
        + '</div>';
    }).join('');
  }

  // Rebuilding markup with innerHTML replaces the scroll containers themselves, which puts them
  // back at the top -- and rebuilding the sidebar can change the page height, taking the window's
  // own scroll with it. Every edit re-renders (a drag, a cell span, a note, a phase colour, or
  // just a new week count), so without this the preview snapped back to January on all of them
  // and nothing below the fold could be worked on.
  //
  // Positions are remembered by element id and put back on the rebuilt nodes. Only containers
  // that are actually scrolled are recorded, and a position is only written back when it has
  // really changed, so nesting these (update() around render()) costs nothing and cannot fight
  // itself.
  function captureScroll(){
    const memo = [];
    document.querySelectorAll('[id]').forEach(el=>{
      if(el.scrollTop || el.scrollLeft) memo.push([el.id, el.scrollLeft, el.scrollTop]);
    });
    // The WINDOW is anchored to where the preview sits on screen, not to a scroll number.
    // Sidebar rows come and go above the grid -- an added hiatus row, the province selector that
    // appears when the region becomes Canada -- which moves the grid down the document. Putting
    // the old scrollY back faithfully would then slide the grid down the SCREEN by exactly that
    // much, which is the jump, not the cure. What the user is watching is the grid, so the grid
    // is what gets held still.
    const anchor = document.getElementById('sheet-scroll-container') || document.getElementById('table-wrap');
    return { memo, x: window.scrollX, y: window.scrollY,
             anchorId: anchor ? anchor.id : null,
             anchorTop: anchor ? anchor.getBoundingClientRect().top : 0 };
  }
  function restoreScroll(snap){
    if(!snap) return;
    snap.memo.forEach(entry=>{
      const el = document.getElementById(entry[0]);
      if(!el) return;
      if(el.scrollLeft !== entry[1]) el.scrollLeft = entry[1];
      if(el.scrollTop  !== entry[2]) el.scrollTop  = entry[2];
    });
    const anchor = snap.anchorId ? document.getElementById(snap.anchorId) : null;
    if(anchor){
      // A delta, so this agrees with the browser's own scroll anchoring instead of fighting it:
      // where anchoring already held the grid still, dy is 0 and nothing happens.
      const dy = anchor.getBoundingClientRect().top - snap.anchorTop;
      if(Math.abs(dy) >= 1) window.scrollBy(0, dy);
      if(window.scrollX !== snap.x) window.scrollTo(snap.x, window.scrollY);
    } else if(window.scrollX !== snap.x || window.scrollY !== snap.y){
      window.scrollTo(snap.x, snap.y);
    }
  }

  // A sidebar control can change the SIDEBAR'S OWN height -- adding a hiatus row, ticking a
  // per-phase hiatus, picking a country that reveals a province selector. On a narrow window the
  // layout stacks, so the panel sits above the preview and every one of those pushes the grid
  // down the page while the user is looking at it.
  //
  // The snapshot inside update() cannot catch these: the handlers rebuild their rows FIRST and
  // call update() afterwards, by which point the grid has already moved and the new position
  // looks like the correct one. So take it on the event itself, in the capture phase before any
  // handler has run, and put the grid back once the DOM has settled. Scoped to .form-panel --
  // events in the grid must not be second-guessed, since scrolling a clicked cell into view is
  // exactly what should happen there.
  (function(){
    let armed = null;
    const arm = e=>{
      if(!e.target || !e.target.closest || !e.target.closest('.form-panel')) return;
      const a = document.getElementById('sheet-scroll-container') || document.getElementById('table-wrap');
      if(!a) return;
      armed = { id: a.id, top: a.getBoundingClientRect().top };
      requestAnimationFrame(()=>{
        const p = armed; armed = null;
        if(!p) return;
        const el = document.getElementById(p.id);
        if(!el) return;
        // A delta, so it agrees with the browser's own scroll anchoring rather than fighting it.
        const dy = el.getBoundingClientRect().top - p.top;
        if(Math.abs(dy) >= 1) window.scrollBy(0, dy);
      });
    };
    ['pointerdown','change','input'].forEach(t=> document.addEventListener(t, arm, true));
  })();

  function render(schedule){
    // Taken before ANY rebuilding -- renderHolidayVisList below rewrites a sidebar list, and a
    // sidebar that changes height moves the window scroll before the grid is even touched.
    const scrollSnap = captureScroll();
    refreshSnapNotes();
    renderHolidayVisList(schedule);
    const tableEl = document.getElementById('table-wrap');
    const exportBtn = document.getElementById('export-btn');
    // The button does different things in each view, so it says which -- and the FILLED button is
    // always the PDF one. In the waterfall that is the separate Waterfall-to-PDF button beside it,
    // so this one drops to the plain style; in the month view this button IS the PDF export (the
    // other is hidden), so it takes the fill instead of leaving the view with no emphasised action.
    const isMonth = viewMode === 'month';
    chrome.exportBtn({
      // Short labels, HeaderMegaMenu-style: the icon carries the file-type half of the meaning
      // (Header.jsx renders a download glyph when primary, a table glyph otherwise).
      label: isMonth ? 'Export PDF' : 'Export to Excel',
      primary: isMonth,
    });
    // The Waterfall-to-PDF button only applies to the waterfall (the month view has its own PDF
    // export via the main button), so it's shown only there.
    chrome.exportWfBtn({ visible: !isMonth });

    // update per-phase computed end-date hints
    getAllPhaseDefs().forEach(p=>{
      const startVal = document.getElementById('start-'+p.key).value;
      const weeksVal = document.getElementById('weeks-'+p.key).value;
      const cfg = readCfgForMeta(p.key);
      const metaEl = document.getElementById('meta-'+p.key);
      const unitWord = p.inputMode==='days' ? 'shooting day count' : 'week count';
      // Read the ACTUAL computed segment rather than re-deriving anything here. The real
      // schedule walks day by day around weekends, union holidays and hiatus and pushes the
      // end out to still deliver the full count, so a naive days/5 estimate drifts from the
      // calendar -- exactly the sort of quiet disagreement this hint is meant to prevent.
      const seg = (schedule.segments || []).find(s=>s.key===p.key);
      if(cfg==='invalid'){
        metaEl.textContent = `Check that year — doesn't look right`;
        metaEl.style.color = 'var(--danger)';
      } else if(cfg){
        // Prefer the real computed segment; fall back to the raw entry only if the schedule
        // hasn't produced one (e.g. the range was rejected as too large).
        const start = seg ? seg.start : mondayOf(parseDateUTC(cfg.start));
        const weeks = seg ? seg.weeks : cfg.weeks;
        const end = seg ? addDays(seg.end, -1) : addDays(start, cfg.weeks*7 - 1);
        let note;
        if(p.inputMode==='days'){
          // For Production the meaningful end is the last actual SHOOT day, not the end of the
          // week block it happens to sit in.
          const lastDay = (schedule.productionInfo && schedule.productionInfo.lastShootDay)
            ? schedule.productionInfo.lastShootDay : end;
          note = `${cfg.rawValue} shoot day${cfg.rawValue===1?'':'s'} \u2192 ${weeks} wk \u00b7 ${fmtShort(start)} \u2192 ${fmtShort(lastDay)}`;
        } else {
          note = `${fmtShort(start)} \u2192 ${fmtShort(end)} (${weeks} wk)`;
        }
        if(cfg.start !== start.toISOString().slice(0,10)){
          note += `\nSnapped to Mon ${fmtShort(start)}`;   // '\n' + .phase-meta{white-space:pre-line}: two rows (owner, 29 Aug 2026)
        }
        metaEl.textContent = note;
        metaEl.style.color = '';
      } else if(startVal && !weeksVal){
        metaEl.textContent = `Enter a ${unitWord} to include this phase`;
        metaEl.style.color = 'var(--danger)';
      } else if(startVal && weeksVal && p.inputMode !== 'days' && !(parseInt(weeksVal,10) > 0)){
        // A start date with a zero / negative / non-numeric week count drops the phase from the
        // schedule. Without this the phase just vanishes with no explanation. (Production is
        // excluded: its count comes from Show Info, which has its own guidance.)
        metaEl.textContent = 'Enter a week count of 1 or more to schedule this phase';
        metaEl.style.color = 'var(--danger)';
      } else if(!startVal && weeksVal){
        metaEl.textContent = 'Enter a start date to include this phase';
        metaEl.style.color = 'var(--danger)';
      } else {
        metaEl.textContent = '';
      }
      // "Start after previous phase" button: name it after the phase it would chain from, and
      // disable it when nothing earlier in the chain is scheduled yet.
      const asBtn = document.getElementById('autostart-'+p.key);
      if(asBtn){
        const prev = prevChainSegment(p.key, schedule);
        if(prev){
          const nm = ((document.getElementById('name-'+prev.key)||{}).value || '').trim()
                     || (PHASES.find(x=>x.key===prev.key)||{}).label || 'previous phase';
          asBtn.textContent = '↳ Start after ' + nm;
          asBtn.disabled = false;
        } else {
          asBtn.textContent = '↳ Start after previous phase';
          asBtn.disabled = true;
        }
      }
    });

    if(schedule.weeks.length===0){
      document.getElementById('gap-warning').innerHTML = '';
      let msg = 'Enter at least one phase\u2019s start date and week count to see a preview.';
      if(schedule.error==='invalid-year'){
        msg = 'One of the dates has a year that doesn\u2019t look right (expected between 1970\u20132100) \u2014 check the fields above for a typo.';
      } else if(schedule.error==='too-large'){
        msg = `That combination of dates spans about ${schedule.attemptedWeeks.toLocaleString()} weeks \u2014 that\u2019s almost certainly a typo in one of the years. (Capped at ${MAX_WEEKS} weeks / ~${Math.round(MAX_WEEKS/52)} years.)`;
      } else if(schedule.error==='invalid-range'){
        msg = 'That date range doesn\u2019t resolve to a valid span \u2014 double check the start and end dates.';
      }
      tableEl.innerHTML = `<div class="empty-state">${msg}</div>`;
      chrome.exportBtn({ disabled: true });
      chrome.exportWfBtn({ disabled: true });
      return;
    }
    chrome.exportBtn({ disabled: false });
    chrome.exportWfBtn({ disabled: false });

    const gapWarningEl = document.getElementById('gap-warning');
    if(schedule.gaps && schedule.gaps.length){
      const items = schedule.gaps.map(g=>
        `${fmtShort(g.startDate)}\u2013${fmtShort(g.endDate)} (${g.weeks} wk)`
      ).join(', ');
      gapWarningEl.innerHTML = `<div class="gap-banner"><strong>Unscheduled gap${schedule.gaps.length>1?'s':''} found:</strong> ${items}. No phase covers ${schedule.gaps.length>1?'these weeks':'this week range'} \u2014 check whether a start date needs adjusting.</div>`;
    } else {
      gapWarningEl.innerHTML = '';
    }

    // (installGridResizers runs just below, once the new markup is in the DOM.)
    tableEl.innerHTML = (viewMode==='month') ? renderMonthView(schedule)
                                             : renderSpreadsheetView(schedule);
    // Handles are positioned from laid-out geometry, so they can only be built once the new
    // markup is in the document. Their coordinates are all differences measured against the grid
    // wrapper, so where the container happens to be scrolled makes no difference to them.
    if(viewMode !== 'month') installGridResizers();
    // A render from anywhere else -- a sidebar field, an undo -- rebuilds the grid and throws away
    // the cell an open editor was anchored to. The editor is on the body now, so it would outlive
    // that and hang over the calendar pointing at nothing. (commitActiveNoteEditor and
    // closeWithoutSaving both clear activeNoteEditor before they render, so this only ever fires
    // for a render they did not start.)
    if(activeNoteEditor && !document.body.contains(activeNoteEditor.td)){
      closeNoteEditorPop();
      activeNoteEditor = null;
    }
    restoreScroll(scrollSnap);
  }

  // ---------- Month view ----------
  // A traditional day-by-day month grid rendered from the SAME schedule data as the other
  // views. Coloring rules mirror how the phases actually work:
  //  - Production is measured in shoot days, and the engine already knows exactly which days
  //    those are (weekends, hiatuses and holidays excluded), so we color precisely those.
  //  - Every other phase is measured in weeks, so we color its weekdays (Mon-Fri) and leave
  //    weekends blank -- a purely visual rule; the schedule math is untouched.
  let monthCursor = null; // first-of-month currently displayed (UTC)
  // A day block always shows at least this many lines, so there's somewhere to put a note even
  // on an empty day. Content beyond it grows the row.
  const MV_MIN_LANES = 4;
  // Ceiling on MANUAL expansion. Real content (phases, episodes, notes) is never hidden and may
  // push a row past this -- the print scaling absorbs that. The cap just stops the "+ line"
  // button from inflating rows indefinitely.
  const MV_MAX_LANES = 6;
  // Extra lines the user has asked for, per week (keyed by that week's Monday). Weeks share a
  // row, so this necessarily applies to all seven days.
  let mvExtraLanes = {};
  // While building the PDF we walk every month in turn. That deliberately ignores the
  // range-clamp the live view applies, so it's kept in its own variable rather than fighting
  // monthCursor for control.
  let printingCursor = null;

  function isoOf(d){ return d.toISOString().slice(0,10); }

  // Does this phase cover the given date? Encodes the two different phase models:
  //  - Production is measured in shoot days; the engine knows exactly which days those are.
  //  - Everything else is week-based: inside the range, weekdays only (visual rule).
  function segCoversDate(s, date){
    const dow = date.getUTCDay();
    if(s.key === 'production'){
      return !!(s.shootDays && s.shootDays.indexOf(isoOf(date)) !== -1);
    }
    if(dow===0 || dow===6) return false;         // weekends stay blank for week-based phases
    return date >= s.start && date < s.end;
  }

  function isHiatusDate(schedule, date){
    return (schedule.hiatuses||[]).some(h=> date>=h.start && date<h.end);
  }

  // True when `date` falls inside a phase's OWN hiatus (the per-phase pause), which interrupts
  // just that phase rather than the whole calendar.
  function isPhaseHiatusDate(seg, date){
    const h = seg && seg.phaseHiatus;
    return !!(h && date>=h.start && date<h.end);
  }

  // The label a phase's pill shows for a given date, e.g. "Writers Room Week 3".
  function segPillLabel(s, date){
    const name = (s.name || s.label || '').replace(/\s*wk\s*\d+\s*$/i,'');
    const weekNo = Math.floor((mondayOf(date) - mondayOf(s.start))/DAY_MS/7) + 1;
    return weekNo > 0 ? `${name} Week ${weekNo}` : name;
  }

  // The run(s) of consecutive covered days for a phase within one week row, so each can be
  // drawn as a single pill spanning those columns.
  function pillRunsForWeek(schedule, weekStart, seg){
    const runs = [];
    let run = null;
    for(let i=0;i<7;i++){
      const d = addDays(weekStart, i);
      const covered = segCoversDate(seg, d) && !isHiatusDate(schedule, d) && !isPhaseHiatusDate(seg, d);
      if(covered){
        if(!run){ run = {startCol:i, endCol:i, date:d}; }
        else run.endCol = i;
      } else if(run){ runs.push(run); run = null; }
    }
    if(run) runs.push(run);
    return runs;
  }

  // Notes are stored per WEEK (keyed by that week's Monday), but each auto-note also carries
  // the real date it refers to. In a day-by-day month grid we place each note on its ACTUAL
  // day -- otherwise e.g. a Thanksgiving note would sit on Monday, several days off.
  // User-edited notes have no per-day date (the user edits the week's text as a whole), so
  // those stay on the week's Monday.
  function notesForWaterfallDate(schedule, date){
    const iso = isoOf(date);
    const weekIso = isoOf(mondayOf(date));
    const idx = (schedule.weeks||[]).findIndex(w=> isoOf(w.date) === weekIso);
    const autoNotes = autoNotesForView((idx >= 0 && schedule.notesByIdx) ? (schedule.notesByIdx[idx] || []) : [], 'month');

    // Waterfall-owned notes. An override replaces the week's auto text; it sits on its picked
    // day, or the week's Monday when none was chosen (a waterfall edit has no inherent day).
    const override = userNotes[weekIso];
    const out = [];
    if(override !== undefined){
      const list = userNoteList(weekIso);
      list.forEach(n=>{
        // A note's text may carry its own trailing date (the day picker stamps one in, and the
        // auto-notes are written that way too). That date is the truth about where the line
        // belongs -- so a multi-line override splits across days rather than stacking on one.
        String(n.text || '').split('\n').filter(Boolean).forEach(line=>{
          const m = line.match(/(\d{1,2})\/(\d{2})\/(\d{2})\s*$/);
          if(m){
            const yr = 2000 + parseInt(m[3],10);
            const lineIso = isoOf(new Date(Date.UTC(yr, parseInt(m[1],10)-1, parseInt(m[2],10))));
            if(lineIso === iso) out.push(line);
            return;
          }
          // No date in the text: fall back to the note's pinned day, else the week's Monday.
          const belongsHere = n.date ? (n.date === iso) : (date.getUTCDay() === 1);
          if(belongsHere) out.push(line);
        });
      });
    } else {
      autoNotes
        .filter(n => n.date ? isoOf(n.date) === iso : date.getUTCDay() === 1)
        .map(n => n.date ? `${n.label} ${fmtShort(n.date)}` : n.label)
        .forEach(t=>out.push(t));
    }
    return out;
  }

  // Everything shown on a day in the month view: the waterfall's notes plus that day's own.
  function notesForDate(schedule, date){
    const out = notesForWaterfallDate(schedule, date).slice();
    const own = dayNotes[isoOf(date)];
    if(own && own.text) String(own.text).split('\n').filter(Boolean).forEach(t=>out.push(t));
    return out;
  }

  // Notes can be up to 3 lines tall and render as ONE solid block. To lay them out we need to know,
  // before placing them, how many lines a note's text occupies at the day-column width -- both for
  // user notes with real line breaks and for long auto-notes that wrap. Measured in a hidden element
  // styled exactly like a note bar, and cached (keyed by width+text) so re-renders don't reflow.
  let _mvNoteMeasureEl = null;
  const _mvNoteLineCache = new Map();
  function mvNoteLineCount(text, boxW){
    const t = String(text == null ? '' : text);
    if(!t.trim()) return 1;
    const key = Math.round(boxW) + '|' + t;
    if(_mvNoteLineCache.has(key)) return _mvNoteLineCache.get(key);
    if(!_mvNoteMeasureEl){
      _mvNoteMeasureEl = document.createElement('div');
      _mvNoteMeasureEl.setAttribute('aria-hidden','true');
      _mvNoteMeasureEl.style.cssText = 'position:absolute; left:-99999px; top:0; visibility:hidden; box-sizing:border-box;'
        + "font-family:'Inter',-apple-system,sans-serif; font-size:10px; font-weight:500; line-height:1.3;"
        + 'padding:2px 4px; border:1px solid transparent; white-space:pre-wrap; word-break:break-word; hyphens:auto;';
      document.body.appendChild(_mvNoteMeasureEl);
    }
    _mvNoteMeasureEl.style.width = Math.max(24, boxW) + 'px';
    _mvNoteMeasureEl.textContent = t;
    const h = _mvNoteMeasureEl.offsetHeight; // = lines*13 (line-height) + 4 (padding) + 2 (border)
    const lines = Math.min(3, Math.max(1, Math.round((h - 6) / 13)));
    if(_mvNoteLineCache.size > 800) _mvNoteLineCache.clear();
    _mvNoteLineCache.set(key, lines);
    return lines;
  }
  // Border-box width of a note bar = one day column minus the bar's 1px horizontal margins.
  function mvNoteBoxWidth(){
    let colW = 0;
    const cell = document.querySelector('#table-wrap .mv-daycell');
    if(cell) colW = cell.getBoundingClientRect().width;
    if(!colW || colW < 20){
      const tw = document.getElementById('table-wrap');
      const w = (tw && tw.clientWidth) ? tw.clientWidth : 980;
      colW = Math.max(70, (w - 30) / 7);
    }
    return colW - 2;
  }

  function renderMonthView(schedule){
    const segs = schedule.segments || [];
    if(!segs.length && !(schedule.weeks||[]).length){
      return '<div class="month-empty">Enter phase dates to see the calendar.</div>';
    }
    // Pick the month to show. The cursor persists across renders so paging survives edits,
    // but it must not survive a schedule that has moved somewhere else entirely -- otherwise
    // resetting or opening a different file leaves the view parked on an empty month far away,
    // which reads as the toggle being broken. If it falls outside the schedule, snap it back.
    const range = monthRangeForSchedule(schedule);
    if(printingCursor){
      // Printing walks every month deliberately: no clamping.
    } else if(range){
      if(!monthCursor || monthCursor < range.first || monthCursor > range.last){
        monthCursor = new Date(range.first.getTime());
      }
    } else if(!monthCursor){
      const base = schedule.overallStart || new Date();
      monthCursor = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
    }
    const cursor = printingCursor || monthCursor;
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    // Header title carries the season as a short suffix, e.g. "Show Name S2".
    const rawTitle = (document.getElementById('show-title').value || '').trim();
    const seasonVal = (document.getElementById('season-num').value || '').trim();
    const title = rawTitle + (seasonVal ? (rawTitle ? ' ' : '') + 'S' + seasonVal : '');
    // Today's date for the header, in x.xx.xx form. Uses LOCAL date (not UTC): this is "today"
    // for the person reading it, unlike the schedule dates which are deliberately UTC.
    const now = new Date();
    const todayStr = (now.getMonth()+1) + '.' + String(now.getDate()).padStart(2,'0')
                     + '.' + String(now.getFullYear()).slice(2);

    // Grid starts on the Monday on/before the 1st.
    const first = new Date(Date.UTC(year, month, 1));
    const lead = first.getUTCDay(); // Sun=0 ... Sat=6 -- weeks run Sunday to Saturday
    const gridStart = addDays(first, -lead);
    const daysInMonth = new Date(Date.UTC(year, month+1, 0)).getUTCDate();
    const weekCount = Math.ceil((lead + daysInMonth)/7);
    // Stable lane order: phases keep the same vertical position all month (earliest start on
    // top), so the eye can track a bar across weeks instead of it hopping rows.
    const laneSegs = segs.slice().sort((a,b)=> a.start - b.start);
    const epSpans = episodeSpans(schedule);

    const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const head = dowNames.map(n=>`<div class="mv-dow">${n}</div>`).join('');

    let rows = '';
    for(let wk=0; wk<weekCount; wk++){
      const weekStart = addDays(gridStart, wk*7);

      let dayCells = '';
      for(let i=0;i<7;i++){
        const d = addDays(weekStart, i);
        const inMonth = d.getUTCMonth() === month;
        const dow = d.getUTCDay();
        const cls = ['mv-daycell'];
        if(!inMonth) cls.push('mv-out');
        if(dow===0 || dow===6) cls.push('mv-weekend');
        dayCells += `<div class="${cls.join(' ')}"><span class="mv-daynum">${d.getUTCDate()}</span></div>`;
      }

      // Bars are collected as objects first so each can be given an explicit grid ROW. That
      // turns the block into addressable "slots": anything not filled by a phase, episode or
      // note is a real gap we can offer a "+" in, rather than whatever the flow happens to
      // leave over. Lane 0 is the top line under the day numbers.
      const placed = [];              // {lane, laneSpan, startCol, endCol, html}
      const occupied = new Map();     // lane -> Set of columns already used
      // Find the first lane where a `laneSpan`-tall block fits (every column free across ALL of its
      // lanes), packing top-down, and reserve those lanes. laneSpan > 1 is how a multi-line note
      // claims the vertical space it needs so nothing else lands on top of it.
      const takeLane = (startCol, endCol, laneSpan)=>{
        laneSpan = Math.max(1, laneSpan || 1);
        for(let lane = 0; lane < 60; lane++){
          let free = true;
          for(let L = lane; L < lane + laneSpan && free; L++){
            const used = occupied.get(L);
            if(used){ for(let c=startCol;c<=endCol;c++){ if(used.has(c)){ free=false; break; } } }
          }
          if(free){
            for(let L = lane; L < lane + laneSpan; L++){
              if(!occupied.has(L)) occupied.set(L, new Set());
              const s = occupied.get(L);
              for(let c=startCol;c<=endCol;c++) s.add(c);
            }
            return lane;
          }
        }
        return 0;
      };
      const place = (startCol, endCol, cls, style, title, text, data, laneSpan)=>{
        laneSpan = Math.max(1, laneSpan || 1);
        const lane = takeLane(startCol, endCol, laneSpan);
        placed.push({lane, laneSpan, startCol, endCol, cls, style, title, text, data});
        return lane;
      };
      const noteBoxW = mvNoteBoxWidth();

      // Hiatus first: a full-width stop-work band across the days it covers. Spillover days
      // (the greyed-out neighbours from the previous/next month that fill the first and last
      // rows) show the schedule too: a cell states what's true of its DATE, so a hiatus running
      // Dec 28 - Jan 2 must look continuous on both pages rather than stopping at the 31st.
      const hiRuns = [];
      let hrun = null;
      for(let i=0;i<7;i++){
        const d = addDays(weekStart, i);
        if(isHiatusDate(schedule, d)){
          if(!hrun) hrun = {startCol:i, endCol:i, date:d}; else hrun.endCol = i;
        } else if(hrun){ hiRuns.push(hrun); hrun = null; }
      }
      if(hrun) hiRuns.push(hrun);
      hiRuns.forEach(r=>{
        const wkIso = isoOf(mondayOf(r.date));
        const hc = hiatusColors[wkIso] || HIATUS_COLOR;
        const ht = hiatusTexts[wkIso] || HIATUS_DEFAULT_LABEL;
        place(r.startCol, r.endCol, 'mv-bar mv-hiatus-bar',
          `background:${hc}; color:${textColorFor(hc)};`, '', escHtml(ht), '');
      });

      // One rounded pill per phase per contiguous run of covered days. Phases keep their lane
      // order so a phase sits at the same height all month.
      laneSegs.forEach(s=>{
        const replacedByEpisodes = (s.key === 'production' && epSpans.length > 0);
        if(!replacedByEpisodes){
          pillRunsForWeek(schedule, weekStart, s).forEach(r=>{
            const bg = s.color || '#eee';
            const fg = s.textColor || textColorFor(bg);
            const lbl = segPillLabel(s, addDays(weekStart, r.startCol));
            place(r.startCol, r.endCol, 'mv-bar mv-pill',
              `background:${bg}; color:${fg};`, escHtml(lbl), escHtml(lbl), '');
          });
        }
        // Episode pills occupy Production's lane.
        if(s.key === 'production' && epSpans.length){
          const bg = s.color || '#eee';
          const fg = s.textColor || textColorFor(bg);
          epSpans.forEach(ep=>{
            let run = null;
            const runs = [];
            for(let i=0;i<7;i++){
              const d = addDays(weekStart, i);
              if(ep.days.has(isoOf(d))){
                if(!run) run = {startCol:i, endCol:i}; else run.endCol = i;
              } else if(run){ runs.push(run); run = null; }
            }
            if(run) runs.push(run);
            runs.forEach(r=>{
              place(r.startCol, r.endCol, 'mv-bar mv-pill',
                `background:${bg}; color:${fg};`, escHtml(ep.name), escHtml(ep.name), '');
            });
          });
        }
        // Per-phase hiatus: a red band in this phase's lane on the weekdays it pauses. Mirrors
        // the Holiday Hiatus band, but scoped to this one phase; edits made in the Waterfall
        // (rename/recolor, keyed by week + phase) show through here too.
        const ph = s.phaseHiatus;
        if(ph){
          const hRuns = [];
          let hr = null;
          for(let i=0;i<7;i++){
            const d = addDays(weekStart, i);
            const dow = d.getUTCDay();
            const inBand = (dow>=1 && dow<=5) && d>=s.start && d<s.end
                           && d>=ph.start && d<ph.end && !isHiatusDate(schedule, d);
            if(inBand){ if(!hr) hr = {startCol:i, endCol:i, date:d}; else hr.endCol = i; }
            else if(hr){ hRuns.push(hr); hr = null; }
          }
          if(hr) hRuns.push(hr);
          hRuns.forEach(r=>{
            const hKey = isoOf(mondayOf(r.date)) + '|' + s.key;
            const defLbl = (s.name || s.label || 'Phase').replace(/\s*wk\s*\d+\s*$/i,'') + ' Hiatus';
            const hTxt = (hKey in hiatusTexts) ? hiatusTexts[hKey] : defLbl;
            const hc = hiatusColors[hKey] || HIATUS_COLOR;
            place(r.startCol, r.endCol, 'mv-bar mv-hiatus-bar',
              `background:${hc}; color:${textColorFor(hc)};`, escHtml(hTxt), escHtml(hTxt), '');
          });
        }
      });

      // Simultaneous Post: a per-week band, exactly as in the waterfall view.
      // A grid row runs SUNDAY to Saturday (gridStart backs up to the Sunday on/before the 1st),
      // but the schedule's weeks are Monday-based. mondayOf() on the row's own Sunday therefore
      // returns the Monday of the PREVIOUS week -- the week that ended the day this row starts --
      // so the band was drawn a week late, and the first sim-post week never appeared in the month
      // that actually contains it. The row's working days are Mon-Fri, so look up from its Monday.
      const rowMonday = addDays(weekStart, 1);
      const wkRec = (schedule.weeks || []).find(x => isoOf(x.date) === isoOf(mondayOf(rowMonday)));
      if(wkRec && wkRec.simPost){
        let sp = null;
        const spRuns = [];
        for(let i=0;i<7;i++){
          const d = addDays(weekStart, i);
          const dow = d.getUTCDay();
          const working = (dow>=1 && dow<=5) && !isHiatusDate(schedule, d);
          if(working){ if(!sp) sp = {startCol:i, endCol:i}; else sp.endCol = i; }
          else if(sp){ spRuns.push(sp); sp = null; }
        }
        if(sp) spRuns.push(sp);
        const spLabel = simPostLabel(wkRec);
        spRuns.forEach(r=>{
          place(r.startCol, r.endCol, 'mv-bar mv-pill',
            `background:${SIMPOST_COLOR}; color:${SIMPOST_TEXT};`, spLabel, spLabel, '');
        });
      }

      // Notes last, so they sit under the phase pills.
      for(let i=0;i<7;i++){
        const d = addDays(weekStart, i);
        const dIso = isoOf(d);
        const wkKey = isoOf(mondayOf(d));
        const wfNotes = notesForWaterfallDate(schedule, d);
        const wfColor = noteColors[wkKey] || MILESTONE_COLOR;
        wfNotes.forEach(n=>{
          // A single auto/waterfall note. It may be long enough to wrap onto 2-3 lines -- give it
          // that many lanes so it prints as one solid block instead of spilling over its neighbour.
          const span = mvNoteLineCount(n, noteBoxW);
          place(i, i, 'mv-bar mv-note-block mv-note-click',
            `background:${wfColor}; color:${textColorFor(wfColor)};`,
            escHtml(n) + ' \u2014 click to edit (also updates the Waterfall)', escHtml(n),
            `data-note-week="${wkKey}" data-note-day="${dIso}" data-note-kind="wf"`,
            span);
        });
        // This day's own notes: month-view only, each independently editable with its own colour.
        // A note is ONE block that can be up to 3 lines tall (its own real line breaks plus any
        // wrapping) -- the whole thing shares one highlight rather than splitting into separate
        // notes. The index ties a block back to its entry for editing.
        const ownList = dayNoteList(dIso);
        ownList.forEach((entry, ni)=>{
          const oc = entry.color || MILESTONE_COLOR;
          const text = String(entry.text || '');
          if(!text.trim()) return;
          const span = mvNoteLineCount(text, noteBoxW);
          place(i, i, 'mv-bar mv-note-block mv-note-click',
            `background:${oc}; color:${textColorFor(oc)};`,
            escHtml(text) + ' \u2014 click to edit (month view only)', escHtml(text),
            `data-note-week="${wkKey}" data-note-day="${dIso}" data-note-kind="day" data-note-index="${ni}"`,
            span);
        });
        // An "add note" affordance on free lines (added below for every day).
      }

      // How tall is this week? At least MV_MIN_LANES, and more if the content needs it --
      // content is never hidden. Manual expansion is what's capped: it can lift the row up to
      // MV_MAX_LANES but no further, so a stray click can't inflate a page indefinitely.
      const contentLanes = placed.length ? Math.max.apply(null, placed.map(p=>p.lane + (p.laneSpan||1))) : 0;
      // Deliberately NOT corrected the way the sim-post lookup above was. This key is only ever
      // compared against itself -- the row's "+" writes mvExtraLanes under exactly this key and
      // this line reads it back -- so the off-by-one is invisible. It is also PERSISTED, so
      // re-deriving it would orphan the extra lanes in every already-saved calendar.
      const wkIsoRow = isoOf(mondayOf(weekStart));
      const baseLanes = Math.max(MV_MIN_LANES, contentLanes);
      const roomToGrow = Math.max(0, MV_MAX_LANES - baseLanes);
      const extra = Math.min(mvExtraLanes[wkIsoRow] || 0, roomToGrow);
      const laneCount = baseLanes + extra;
      const atCap = (laneCount >= MV_MAX_LANES);

      // Emit the placed bars.
      let bars = '';
      placed.forEach(p=>{
        const span = p.laneSpan || 1;
        const gr = span > 1 ? `grid-row:${p.lane+1} / span ${span};` : `grid-row:${p.lane+1};`;
        bars += `<div class="${p.cls}" ${p.data} style="grid-column:${p.startCol+1} / ${p.endCol+2}; ${gr}${p.style}"${p.title?` title="${p.title}"`:''}>${p.text}</div>`;
      });

      // Every free slot gets its own "+", so a note can be added on the exact line it will
      // occupy rather than always landing at the bottom of the block.
      for(let i=0;i<7;i++){
        const d = addDays(weekStart, i);
        if(isHiatusDate(schedule, d)) continue;
        const dIso = isoOf(d);
        const wkKey = isoOf(mondayOf(d));
        let anyFree = false;
        for(let lane=0; lane<laneCount; lane++){
          const used = occupied.get(lane);
          if(used && used.has(i)) continue;
          anyFree = true;
          bars += `<div class="mv-bar mv-note-add mv-note-click" data-note-week="${wkKey}" data-note-day="${dIso}" data-note-kind="day" style="grid-column:${i+1} / ${i+2}; grid-row:${lane+1};" title="Add a note on ${fmtShort(d)} (month view only)">+</div>`;
        }
        // A day whose lanes are all taken still needs a way to add a note. Rather than a trailing
        // grid row (which would leave an empty line of dead space under a full day), drop the "+"
        // as an absolute overlay in the row's bottom padding -- present on hover, costing no height.
        if(!anyFree){
          bars += `<div class="mv-bar mv-note-add mv-note-add-full mv-note-click" data-note-week="${wkKey}" data-note-day="${dIso}" data-note-kind="day" style="left:calc(3px + ${i} * (100% - 6px) / 7); width:calc((100% - 6px) / 7);" title="Add a note on ${fmtShort(d)} (month view only)">+</div>`;
        }
      }

      // A wider control on the bottom edge grows the whole week row: day blocks share a row, so
      // there's no way to give one day more lines without the others following.
      bars += atCap
        ? `<div class="mv-row-expand is-full" data-expand-week="${wkIsoRow}" title="This week is at its ${MV_MAX_LANES}-line maximum">&middot;&middot;&middot;</div>`
        : `<div class="mv-row-expand" data-expand-week="${wkIsoRow}" title="Add another line to this week">+</div>`;

      rows += `<div class="mv-week">
        <div class="mv-daygrid">${dayCells}</div>
        <div class="mv-bars">${bars}</div>
      </div>`;
    }

    // Month header lines. In Auto they mirror Show Info; in Manual they're an editable
    // snapshot. Kept separate from the waterfall header's mode on purpose.
    const mvDefaults = {
      title: (title ? title + ' ' : '') + 'Full Prelim Production Calendar',
      today: todayStr
    };
    const mvManual = mvHeaderMode === 'manual';
    const mvLine = (id, cls) => {
      const val = mvManual
        ? (mvHeaderManual[id] !== undefined ? mvHeaderManual[id] : mvDefaults[id])
        : mvDefaults[id];
      const empty = val ? '' : ' hdr-empty';
      const editable = mvManual ? ' contenteditable="true"' : '';
      const editCls = mvManual ? ' hdr-editable' : '';
      return `<div class="hdr-line ${cls}${empty}${editCls}" data-mvhid="${id}"${editable} spellcheck="false">${escHtml(val)}</div>`;
    };

    return `<div class="month-view">
      <div class="mv-tools">
        <button id="mv-hdr-mode-btn" class="${mvManual?'is-manual':''}" type="button"
          title="${mvManual?'Discard manual header edits and return to auto-filled values':'Take over the month header: snapshot the current values into editable lines'}"
          >${mvManual?'Header: Manual \u2014 Switch to Auto':'Header: Auto \u2014 Switch to Manual'}</button>
      </div>
      <div class="mv-header${mvManual?' hdr-manual-mode':''}">
        <div class="mv-titlebar">
          ${mvLine('title','mv-title')}
          ${mvLine('today','mv-today')}
        </div>
      </div>
      <div class="mv-monthbar">
        <button class="mv-arrow" id="mv-prev" type="button" aria-label="Previous month"${(range && cursor <= range.first) ? ' disabled' : ''}>&#9664;</button>
        <div class="mv-monthyear">${MONTHS[month]} ${year}</div>
        <button class="mv-arrow" id="mv-next" type="button" aria-label="Next month"${(range && cursor >= range.last) ? ' disabled' : ''}>&#9654;</button>
      </div>
      <div class="mv-dowrow">${head}</div>
      <div class="mv-body">${rows}</div>
    </div>`;
  }

  // ---------- Episodes ----------
  // Show Info drives Production once it's complete. Episodes are simply a better way to enter
  // the shoot-day total: the total is the SUM of the individual episode day-counts, so an
  // episode manually bumped to 10 days pushes the total up by 2 rather than being averaged
  // away. Everything downstream (waterfall view, Excel export) then works exactly as before
  // off that single number -- 5-day weeks, holidays and hiatus all handled by the same engine.
  // "Complete" means the three fields that are load-bearing for that math and for episode
  // numbering; the show title is cosmetic (header text only) and deliberately isn't required.
  function showInfoStatus(){
    const seasonEl = document.getElementById('season-num');
    const perEpEl = document.getElementById('shoot-days-per-ep');
    const numEpEl = document.getElementById('num-episodes');
    const season = seasonEl ? seasonEl.value : '';
    const perEp = parseInt(perEpEl ? perEpEl.value : '', 10);
    const numEp = parseInt(numEpEl ? numEpEl.value : '', 10);
    const missing = [];
    if(!season) missing.push('Season');
    if(!Number.isFinite(perEp) || perEp <= 0) missing.push('Shooting Days per Episode');
    if(!Number.isFinite(numEp) || numEp <= 0) missing.push('Number of Episodes');
    const complete = missing.length === 0;

    // Sum the actual episode rows. Falls back to the flat multiply before rows exist (e.g.
    // during the first render pass, or if the list somehow hasn't been built yet).
    let totalShootDays = 0;
    let hasRows = false;
    if(episodeDefs.length){
      hasRows = true;
      episodeDefs.forEach(e=>{
        const n = parseInt(e.days, 10);
        if(Number.isFinite(n) && n > 0) totalShootDays += n;
      });
    }
    if(!hasRows && Number.isFinite(perEp) && Number.isFinite(numEp)) totalShootDays = perEp * numEp;

    // Which episodes the user has personally overridden, for the Show Info flag.
    const overrides = episodeDefs
      .filter(e => e.daysEdited && parseInt(e.days,10) > 0)
      .map(e => ({ name: e.name || '', days: parseInt(e.days,10) }));

    return { complete, missing, season,
      perEp: Number.isFinite(perEp) ? perEp : 0,
      numEp: Number.isFinite(numEp) ? numEp : 0,
      totalShootDays, overrides };
  }

  // Episode numbering follows the industry convention: season 1 -> 101, 102...; season 5 ->
  // 501, 502... Falls back to plain 1, 2, 3 when no season is chosen.
  function episodeNumberFor(seasonVal, index){
    const s = parseInt(seasonVal, 10);
    if(!s || s < 1) return String(index + 1);
    return String(s * 100 + index + 1);
  }
  function defaultEpisodeName(index){
    return 'Episode ' + episodeNumberFor(document.getElementById('season-num').value, index);
  }
  function defaultEpisodeDays(){
    const v = parseInt(document.getElementById('shoot-days-per-ep').value, 10);
    return (Number.isFinite(v) && v > 0) ? v : '';
  }

  // Keep the episode list in step with Show Info: grow/shrink to "Number of Episodes", and
  // refresh any name/day value the user hasn't personally overridden.
  // Returns the names of any user-edited episodes that were discarded, so the caller can warn.
  function syncEpisodesFromShowInfo(){
    const wanted = parseInt(document.getElementById('num-episodes').value, 10);
    const dropped = [];
    if(Number.isFinite(wanted) && wanted > 0){
      while(episodeDefs.length < wanted){
        episodeDefs.push({ id:'ep'+(++episodeCounter), name:'', days:'', nameEdited:false, daysEdited:false });
      }
      // The episode count is the only control now, so it wins -- but note anything customised
      // that got dropped rather than deleting someone's work silently.
      while(episodeDefs.length > wanted){
        const last = episodeDefs.pop();
        if(last.nameEdited || last.daysEdited) dropped.push(last.name || 'an episode');
      }
    }
    episodeDefs.forEach((e, i)=>{
      if(!e.nameEdited) e.name = defaultEpisodeName(i);
      if(!e.daysEdited) e.days = defaultEpisodeDays();
    });
    return dropped;
  }

  function renderEpisodeRows(){
    const wrap = document.getElementById('episode-rows');
    if(!wrap) return;
    wrap.innerHTML = episodeDefs.map(e=>`
      <div class="episode-row" data-id="${e.id}">
        <input type="text" class="ep-name" value="${escHtml(e.name)}" placeholder="Episode name">
        <input type="number" class="ep-days" min="1" step="1" value="${e.days===''?'':e.days}" placeholder="Days">
      </div>`).join('');
  }

  // Update everything derived from the episode list (the locked total, the hints/flags) WITHOUT
  // rebuilding the episode inputs -- rebuilding them mid-keystroke would blow away focus and
  // the caret while someone is typing a day count.
  function refreshDerivedInfo(){
    const info = showInfoStatus();
    const daysField = document.getElementById('weeks-production');
    const prodRow = daysField ? daysField.closest('.phase-row') : null;
    // The total is written, never typed: it's the sum of the episode list.
    if(daysField) daysField.value = info.complete ? info.totalShootDays : '';

    const readout = document.getElementById('prod-total-readout');
    if(readout){
      readout.innerHTML = info.complete
        ? '<span class="prod-total-label" title="Total Shooting Days">Total Shooting Days</span>'
          + '<span class="prod-total-value"><strong>' + info.totalShootDays + '</strong>'
          + '<span class="prod-total-src">from ' + episodeDefs.length + ' episode'
          + (episodeDefs.length===1?'':'s') + '</span></span>'
        : '<span class="prod-total-empty">Total Shooting Days \u2014 set by Show Info</span>';
    }

    // Grey the Production row until Show Info can produce a total: with no manual field left,
    // there's genuinely no other way to schedule it.
    if(prodRow) prodRow.classList.toggle('phase-blocked', !info.complete);

    // Show Info note + manual-override flags
    const infoNote = document.getElementById('show-info-note');
    if(infoNote){
      if(info.complete){
        infoNote.style.display = '';
        let html = '<strong>Production\u2019s Total Shooting Days: ' + info.totalShootDays + '</strong>'
          + ' \u2014 the sum of the episode list in the Production phase. Used by the Waterfall'
          + ' view and the Excel export.';
        if(info.overrides.length){
          html += '<div class="show-info-flags">Manually changed: '
            + info.overrides.map(o=> escHtml(o.name || 'Episode') + ' \u2192 <strong>' + o.days + ' days</strong>').join('; ')
            + ' (default is ' + info.perEp + ').</div>';
        }
        infoNote.innerHTML = html;
      } else { infoNote.style.display = 'none'; }
    }
    return info;
  }

  function refreshEpisodesUI(){
    // Keep the underlying episode list correct even when the panel isn't on screen: the
    // shoot-day total is derived from it in every view, so it can't wait for the UI.
    const dropped = syncEpisodesFromShowInfo();
    if(dropped.length) lastDroppedEpisodes = dropped;
    const panel = document.getElementById('ep-panel');
    const info = refreshDerivedInfo();

    if(!panel) return;
    // The episode list is the input for Production's shoot-day total, which drives BOTH views,
    // so it stays visible in either one -- only the month view renders episodes as pills.
    panel.style.display = '';

    const warn = document.getElementById('ep-panel-warn');
    const rowsWrap = document.getElementById('episode-rows');
    if(!info.complete){
      if(warn){
        warn.style.display = '';
        warn.innerHTML = 'Complete <strong>Show Info</strong> to schedule Production \u2014 missing: ' +
                         info.missing.map(m=>escHtml(m)).join(', ') + '.';
      }
      if(rowsWrap) rowsWrap.innerHTML = '';
      return;
    }
    if(warn){
      // Warn once about episodes discarded by a lowered episode count.
      if(lastDroppedEpisodes.length){
        warn.style.display = '';
        warn.innerHTML = 'Removed ' + lastDroppedEpisodes.map(n=>'<strong>'+escHtml(n)+'</strong>').join(', ')
          + ' \u2014 lowering the episode count discarded '
          + (lastDroppedEpisodes.length===1?'an episode you had edited':'episodes you had edited') + '.';
        lastDroppedEpisodes = [];
      } else {
        warn.style.display = 'none';
      }
    }
    renderEpisodeRows();
  }

  // Lay episodes out across Production's shoot days, back to back: the first episode takes the
  // first N shoot days, the next takes the following N, and so on. Episodes without a day
  // count are skipped rather than guessed at.
  function episodeSpans(schedule){
    if(!showInfoStatus().complete) return [];   // nothing reliable to lay out
    const prod = (schedule.segments||[]).find(s=>s.key==='production');
    if(!prod || !prod.shootDays || !prod.shootDays.length) return [];
    const spans = [];
    let cursor = 0;
    episodeDefs.forEach(e=>{
      const n = parseInt(e.days, 10);
      if(!Number.isFinite(n) || n <= 0) return;
      const days = prod.shootDays.slice(cursor, cursor + n);
      if(!days.length) return;
      spans.push({ name:e.name || '', days: new Set(days) });
      cursor += n;
    });
    return spans;
  }

  // Mirrors the actual Excel export layout: year-blocks side by side, same column
  // structure (Date | label sub-columns | Simultaneous Post | Milestone label | Milestone date),
  // Holiday Hiatus spanning the full width of a row, same colors/borders.
  function renderSpreadsheetView(schedule){
    const yearBlocks = computeYearBlocks(schedule.weeks);
    const blockLayout = computeBlockLayout(schedule, yearBlocks);
    const { blockSlotMaps, blockMaxConcurrent, blockOccupancy, blockSimSlot } = blockLayout;
    // Same widths the Excel export uses, so the grid on screen, the PDF and the workbook are
    // three renderings of ONE column model instead of three independent guesses.
    // Named colWidthsFor, not colWidths -- the latter is the module-level override store.
    const colWidthsFor = sheetColumnWidths(schedule, yearBlocks, blockLayout);
    const hasAnySimPost = schedule.weeks.some(w=>w.simPost);
    const notesColspan = 1; // Notes only; Simultaneous Post now lives in the phase area
    const maxRows = sheetRowCount(schedule, yearBlocks);
    const notesByIdx = schedule.notesByIdx || {};

    let headerHtml = '';
    yearBlocks.forEach((b, bi)=>{
      const isFirst = bi===0, isLast = bi===yearBlocks.length-1;
      const mc = blockMaxConcurrent[bi];
      headerHtml += `<th class="${isFirst?'sheet-blockstart':''}">Date</th>`;
      headerHtml += `<th colspan="${mc}">${b.year}</th>`;
      headerHtml += `<th colspan="${notesColspan}" class="${isLast?'sheet-blockend':''}">Notes</th>`;
    });

    // <colgroup> + table-layout:fixed is what gives columns an identity at all. Without it the
    // browser sizes them from content and no explicit width can be honoured -- which is also
    // why the old renderer had to cap phase labels at a hardcoded 130px to stop one long custom
    // name dragging the whole grid into horizontal scroll.
    let colsHtml = '';
    let gridPxTotal = 0;
    yearBlocks.forEach((b, bi)=>{
      colWidthsFor[bi].cols.forEach(c=>{
        const px = charsToScreenPx(c.chars);
        gridPxTotal += px;
        colsHtml += `<col data-ckey="${c.key}" style="width:${px}px">`;
      });
    });

    let bodyHtml = '';
    for(let r=0; r<maxRows; r++){
      const rh = rowHeights[r];
      // Written on EVERY row, not just dragged ones. Left to itself a row is only as tall as its
      // tallest cell, so heights drifted apart by a pixel here and there; and the workbook and the
      // PDF both lay the grid out as a flat rows x ROW_DEFAULT_PX, so a screen row that quietly
      // grew was a screen-vs-export divergence as well as an untidy grid.
      bodyHtml += `<tr data-row="${r}" style="height:${rh || ROW_DEFAULT_PX}px">`;
      yearBlocks.forEach((b, bi)=>{
        const isFirst = bi===0, isLast = bi===yearBlocks.length-1;
        const mc = blockMaxConcurrent[bi];
        if(r >= b.count){
          bodyHtml += `<td class="sheet-empty ${isFirst?'sheet-blockstart':''}"></td>`;
          bodyHtml += `<td class="sheet-empty" colspan="${mc+notesColspan}" ${isLast?'style="border-right:2px solid var(--text);"':''}></td>`;
          return;
        }
        const idx = b.startIdx + r;
        const w = schedule.weeks[idx];
        bodyHtml += `<td class="sheet-date ${isFirst?'sheet-blockstart':''}">${fmtShort(w.date)}</td>`;

        if(w.cells.length && w.cells[0].type==='hiatus'){
          const hKey = w.date.toISOString().slice(0,10);
          const hTxt = hiatusTextFor(hKey);
          const hCol = hiatusColorFor(hKey);
          const escHi = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
          // The band spans every column of the block except the date one, so its available
          // width is their sum. It had no fitting at all before: a long label simply ran past
          // the cell and was clipped by the table's overflow rule.
          let hAvail = 0;
          colWidthsFor[bi].cols.forEach((c, ci)=>{ if(ci > 0) hAvail += c.chars; });
          const hSize = hiatusFontSizeFor(hKey);
          const hFit = cellTextFit(hTxt, hAvail, {
            basePx: hSize || 11, manual: hSize !== undefined, rowPx: rowHeights[r] || ROW_DEFAULT_PX
          });
          const hPx = 11 * hFit.scale;
          const hFitCss = `white-space:${hFit.wrap ? 'pre-wrap' : 'pre'};`
            + (Math.abs(hPx - 11) > 0.01 ? ` font-size:${hPx.toFixed(2)}px;` : '')
            + ` max-height:${Math.max(0, (rowHeights[r] || ROW_DEFAULT_PX) - ROW_TEXT_PAD_PX)}px;`;
          bodyHtml += `<td class="sheet-hiatus-cell" title="Click to rename or recolor this hiatus" data-week="${hKey}" data-default-label="${HIATUS_DEFAULT_LABEL}" data-notelines="${hFit.lines}" colspan="${mc+notesColspan}" style="background:${hCol}; color:${textColorFor(hCol)}; cursor:text; ${hFit.wrap?'vertical-align:top;':''} ${isLast?'border-right:2px solid var(--text);':''}"><div class="cell-body" style="${hFitCss}">${escHi(hTxt)}</div></td>`;
        } else {
          // Lay out the phase area: stable slots, lone phases span empty slots, and
          // Simultaneous Post occupies the leftmost free slot (see computePhaseRowLayout).
          const layout = computePhaseRowLayout(w, mc, blockSlotMaps[bi], blockOccupancy[bi], r, blockSimSlot[bi]);
          // Phase columns are draggable like any other, so their labels need the same
          // shrink-to-fit as notes. A spanned cell gets the SUM of the columns it covers.
          const blockCols = colWidthsFor[bi].cols;
          const wIso = w.date.toISOString().slice(0,10);
          // How far each segment could reach if it were dragged: the empty slots directly beside
          // it. Worked out here, where the whole row is visible, so the drag handles can clamp
          // honestly rather than letting the pointer run past what the layout will actually grant.
          const emptyLeft = [], emptyRight = [];
          {
            let run = 0;
            layout.forEach((sg, j)=>{ emptyLeft[j] = run; run = sg.kind==='empty' ? run + sg.colspan : 0; });
            run = 0;
            for(let j=layout.length-1; j>=0; j--){ emptyRight[j] = run; run = layout[j].kind==='empty' ? run + layout[j].colspan : 0; }
          }
          let slotCursor = 0;
          layout.forEach((cell, segIdx)=>{
            const segStart = slotCursor;
            const cs = cell.colspan>1 ? ` colspan="${cell.colspan}"` : '';
            let availChars = 0;
            for(let k=0;k<cell.colspan;k++){
              const c = blockCols[1 + slotCursor + k];   // +1 skips the date column
              if(c) availChars += c.chars;
            }
            slotCursor += cell.colspan;
            // No rowPx: a phase label is always one line -- a wrapped one would break the
            // fixed-height colour band that makes the waterfall readable.
            const lf = cellTextFit(cell.label || '', availChars, {});
            // Never wrap here: rows are a fixed height and a wrapped label would break the band.
            const lfCss = lf.scale < 1 ? ` font-size:${(11 * lf.scale).toFixed(2)}px;` : '';
            if(cell.kind==='phase'){
              const escAttr = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
              const tip = cell.label.length > 18 ? ` title="${escAttr(cell.label)}"` : '';
              // own/lmin/rmax are the span drag's whole world: the phase's own column (which it
              // can never give up) and the furthest slot on each side it may claim in this row.
              const sp = cell.own === undefined ? '' :
                ` class="sheet-phase-cell" data-week="${wIso}" data-pkey="${escAttr(cell.cell.key)}"`
                + ` data-own="${cell.own}" data-lmin="${segStart - emptyLeft[segIdx]}"`
                + ` data-rmax="${segStart + cell.colspan - 1 + emptyRight[segIdx]}"`
                + ` data-a="${segStart}" data-b="${segStart + cell.colspan - 1}"`
                + ` data-nphases="${cell.nPhases || 1}"`;
              bodyHtml += `<td${cs}${sp} style="background:${cell.color}; color:${GRID_TEXT_COLOR};${lfCss}"><span class="phase-cell-label"${tip}>${escHtml(cell.label)}</span></td>`;
            } else if(cell.kind==='phaseHiatus'){
              const phKey = cell.weekIso + '|' + cell.phaseKey;
              const escHi = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
              const escAttr = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
              // A per-phase band is editable text like a note, so it gets the note treatment --
              // the row's line budget and a per-band size -- rather than the one-line fit the
              // phase labels beside it use.
              const phSize = hiatusFontSizeFor(phKey);
              const phFit = cellTextFit(cell.label || '', availChars, {
                basePx: phSize || 11, manual: phSize !== undefined, rowPx: rowHeights[r] || ROW_DEFAULT_PX
              });
              const phPx = 11 * phFit.scale;
              const phCss = `white-space:${phFit.wrap ? 'pre-wrap' : 'pre'};`
                + (Math.abs(phPx - 11) > 0.01 ? ` font-size:${phPx.toFixed(2)}px;` : '')
                + ` max-height:${Math.max(0, (rowHeights[r] || ROW_DEFAULT_PX) - ROW_TEXT_PAD_PX)}px;`;
              bodyHtml += `<td${cs} class="sheet-hiatus-cell" title="Click to rename or recolor this hiatus" data-week="${phKey}" data-default-label="${escAttr(cell.defaultLabel)}" data-notelines="${phFit.lines}" style="background:${cell.color}; color:${cell.textColor}; cursor:text; ${phFit.wrap?'vertical-align:top;':''}"><div class="cell-body" style="${phCss}">${escHi(cell.label)}</div></td>`;
            } else if(cell.kind==='simpost'){
              bodyHtml += `<td${cs} style="background:${SIMPOST_COLOR}; color:${GRID_TEXT_COLOR};${lfCss}">${escHtml(cell.label)}</td>`;
            } else {
              bodyHtml += `<td${cs}></td>`;
            }
          });
          const autoNotes = autoNotesForView(notesByIdx[idx], 'sheet');
          const weekDateKey = w.date.toISOString().slice(0,10);
          const noteText = effectiveNoteText(weekDateKey, autoNotes);
          const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
          if(noteText){
            const nc = noteColorFor(weekDateKey);
            // The row's height buys a line budget; the note wraps into it and only shrinks
            // when even that is not enough. A size the user picked for this note wins outright.
            const nSize = noteFontSizeFor(weekDateKey);
            const fit = cellTextFit(noteText, colWidthsFor[bi].notes, {
              basePx: nSize || 11, manual: nSize !== undefined, rowPx: rowHeights[r] || ROW_DEFAULT_PX
            });
            const fitPx = 11 * fit.scale;
            // pre keeps a single line single (and lets text-overflow put an ellipsis on it);
            // pre-wrap is only for a note that is genuinely using more than one line.
            const fitCss = `white-space:${fit.wrap ? 'pre-wrap' : 'pre'};`
              + (Math.abs(fitPx - 11) > 0.01 ? ` font-size:${fitPx.toFixed(2)}px;` : '')
              // Every row caps its text now, not just a hand-dragged one: they all start at the
              // default height, so they all get the same line budget.
              + ` max-height:${Math.max(0, (rowHeights[r] || ROW_DEFAULT_PX) - ROW_TEXT_PAD_PX)}px;`;
            bodyHtml += `<td class="sheet-note-cell has-note" title="Click to edit this note" data-week="${weekDateKey}" data-notefit="${fit.scale.toFixed(4)}" data-notelines="${fit.lines}" style="background:${nc}; color:${textColorFor(nc)}; ${fit.wrap?'vertical-align:top;':''} ${isLast?'border-right:2px solid var(--text);':''}"><div class="cell-body" style="${fitCss}">${esc(noteText)}</div></td>`;
          } else {
            bodyHtml += `<td class="sheet-note-cell" title="Click to add a note" data-week="${weekDateKey}" ${isLast?'style="border-right:2px solid var(--text);"':''}><span class="note-add-hint">+</span></td>`;
          }
        }
      });
      bodyHtml += '</tr>';
    }

    // --- Calendar header bar. In Auto mode every line mirrors the inputs and is read-only.
    // In Manual mode the lines are a snapshot the user can freely edit.
    const hdrDefaults = computeHeaderDefaults(schedule);
    const escH = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    const manual = headerMode === 'manual';
    const hline = (id, cls, extraStyle) => {
      const val = headerLine(id, hdrDefaults);
      const empty = val ? '' : ' hdr-empty';
      const editable = manual ? ' contenteditable="true"' : '';
      const editCls = manual ? ' hdr-editable' : '';
      return `<div class="hdr-line ${cls||''}${empty}${editCls}" data-hid="${id}"${editable} spellcheck="false" style="${extraStyle||''}">${escH(val)}</div>`;
    };

    const headerBar = `<div class="hdr-tools">
      <button id="notes-reset-btn" title="Reset every note, holiday, and hiatus band back to its auto-generated text and default highlight color" type="button">Reset Notes &amp; Hiatus</button>
      <button id="hdr-mode-btn" class="${manual?'is-manual':''}" title="${manual?'Discard manual header edits and return to auto-filled values':'Take over the header: snapshot the current values into editable lines'}" type="button">${manual?'Header: Manual \u2014 Switch to Auto':'Header: Auto \u2014 Switch to Manual'}</button>
    </div>
    <div class="cal-header-bar${manual?' hdr-manual-mode':''}">
      <div class="cal-header-date">${hline('left','')}</div>
      <div class="cal-header-center">
        ${hline('c1','hdr-title')}
        ${hline('c2','cal-subtitle')}
        ${hline('c3','cal-subtitle')}
      </div>
      <div class="cal-header-right"><div class="cal-header-right-content">
        ${hline('r1','cal-subtitle','font-weight:600;')}
        ${hline('r2','cal-subtitle')}
        ${hline('r3','cal-subtitle')}
      </div></div>
    </div>`;

    const html = `
      <div class="sheet-scroll" id="sheet-scroll-container">
        ${headerBar}
        <div class="sheet-grid-wrap">
          <table class="sheet-table" style="width:${gridPxTotal}px">
            <colgroup>${colsHtml}</colgroup>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
          <div class="grid-resize-layer" aria-hidden="true"></div>
        </div>
      </div>
    `;
    return html;
  }

  // ---------- note-cell inline editor ----------
  // Uses a single delegated listener on #table-wrap rather than per-cell handlers,
  // so there are no RAF timing issues and no need to re-attach after every render.
  let activeNoteEditor = null;

  // --- Editable header lines ---
  // Commit an edited line on blur: if the text differs from the auto default it becomes a
  // per-line override (empty text = intentionally blank line); if it matches the default the
  // override is removed so the line goes back to auto-updating.
  document.getElementById('table-wrap').addEventListener('focusout', e=>{
    if(headerMode !== 'manual') return;
    const line = e.target.closest && e.target.closest('.hdr-line');
    if(!line) return;
    const id = line.dataset.hid;
    const text = (line.textContent || '').replace(/\u00a0/g,' ').trim();
    if((headerManual[id] || '') === text) return; // nothing changed
    headerManual[id] = text;
    render(currentSchedule);
    markDirty(); // was previously missing here -- header edits were invisible to save-dirty tracking and undo
  });
  // Enter commits (no newlines inside a header line)
  document.getElementById('table-wrap').addEventListener('keydown', e=>{
    if(e.key==='Enter' && e.target.closest && e.target.closest('.hdr-line')){
      e.preventDefault(); e.target.blur();
    }
  });

  // Month-view header: mode toggle + capturing edits. Independent of the waterfall header.
  document.getElementById('table-wrap').addEventListener('click', e=>{
    if(e.target && e.target.id === 'mv-hdr-mode-btn'){
      if(mvHeaderMode === 'auto'){
        // Snapshot the current auto values so they become the starting point for editing.
        const rawTitle = (document.getElementById('show-title').value || '').trim();
        const seasonVal = (document.getElementById('season-num').value || '').trim();
        const t = rawTitle + (seasonVal ? (rawTitle ? ' ' : '') + 'S' + seasonVal : '');
        const now = new Date();
        mvHeaderManual = {
          title: (t ? t + ' ' : '') + 'Full Prelim Production Calendar',
          today: (now.getMonth()+1) + '.' + String(now.getDate()).padStart(2,'0') + '.' + String(now.getFullYear()).slice(2)
        };
        mvHeaderMode = 'manual';
      } else {
        mvHeaderMode = 'auto';
        mvHeaderManual = {};
      }
      render(currentSchedule);
      markDirty();
    }
  });
  document.getElementById('table-wrap').addEventListener('focusout', e=>{
    const line = e.target && e.target.closest ? e.target.closest('.hdr-line[data-mvhid]') : null;
    if(!line || mvHeaderMode !== 'manual') return;
    const id = line.dataset.mvhid;
    const text = line.textContent.replace(/\s+/g,' ').trim();
    if((mvHeaderManual[id] || '') === text) return;
    mvHeaderManual[id] = text;
    markDirty();
  });

  document.getElementById('table-wrap').addEventListener('click', e=>{
    if(e.target && e.target.id === 'hdr-mode-btn'){
      if(headerMode === 'auto'){
        // Switch to Manual: snapshot the current auto values into editable lines.
        headerManual = computeHeaderDefaults(currentSchedule);
        headerMode = 'manual';
      } else {
        // Switch to Auto: discard manual edits, go back to live auto-fill.
        headerMode = 'auto';
        headerManual = {};
      }
      render(currentSchedule);
      return;
    }
    if(e.target && e.target.id === 'notes-reset-btn'){
      // Wipe every manual note override (edits AND cleared-note tombstones, so suppressed
      // holidays come back), plus all per-cell highlight colors and hiatus text/colors.
      Object.keys(userNotes).forEach(k=>delete userNotes[k]);
    Object.keys(dayNotes).forEach(k=>delete dayNotes[k]);
    mvExtraLanes = {};
    dayNoteColors = {};
      noteColors = {}; noteFontSize = {}; hiatusTexts = {}; hiatusColors = {};
      hiatusFontSize = {}; holidayView = {};
      render(currentSchedule);
      reflectCountryLock();
      // resetAll() ends with update(), which calls markDirty(); this branch never did, so
      // "Reset Notes & Hiatus" left the file showing Saved and could not be undone.
      markDirty();
      return;
    }
    if(viewMode !== 'sheet') return;
    const td = e.target.closest('td.sheet-note-cell, td.sheet-hiatus-cell');
    if(!td) return; // click wasn't on an editable cell
    e.stopPropagation();
    if(activeNoteEditor && activeNoteEditor.td === td) return; // already editing this cell
    if(activeNoteEditor){
      // Switching cells: fully commit the open editor (this re-renders), then re-locate
      // the clicked cell in the fresh DOM by its week key + kind and open it.
      const targetWeek = td.dataset.week;
      const targetSel = td.classList.contains('sheet-hiatus-cell') ? 'td.sheet-hiatus-cell' : 'td.sheet-note-cell';
      commitActiveNoteEditor();
      const fresh = document.querySelector(`${targetSel}[data-week="${targetWeek}"]`);
      if(fresh) openNoteEditor(fresh);
      return;
    }
    openNoteEditor(td);
  });

  function openNoteEditor(td){
    const weekKey = td.dataset.week;
    const isHiatus = td.classList.contains('sheet-hiatus-cell');

    let textVal, curColor;
    let autoNotes = [];
    const hiatusDefaultLabel = td.dataset.defaultLabel || HIATUS_DEFAULT_LABEL;
    if(isHiatus){
      textVal = (weekKey in hiatusTexts) ? hiatusTexts[weekKey] : hiatusDefaultLabel;
      curColor = hiatusColorFor(weekKey);
    } else {
      autoNotes = (currentSchedule.notesByIdx && currentSchedule.weeks) ? (() => {
        const idx = currentSchedule.weeks.findIndex(w=>w.date.toISOString().slice(0,10)===weekKey);
        return idx>=0 ? autoNotesForView(currentSchedule.notesByIdx[idx]||[], 'sheet') : [];
      })() : [];
      // Prefill with whatever the cell currently shows (user override if present, else the
      // inline auto-note text) so pre-filled comments can be edited or cleared.
      textVal = effectiveNoteText(weekKey, autoNotes);
      curColor = noteColorFor(weekKey);
    }

    td.classList.add('editing');
    td.style.background = curColor;
    td.style.color = textColorFor(curColor);
    const swatches = EXCEL_STANDARD_COLORS.map(c =>
      `<span class="color-swatch${c.toUpperCase()===curColor.toUpperCase()?' selected':''}" data-color="${c}" title="${c}" style="background:${c};"></span>`
    ).join('');
    // Day picker: the waterfall's unit is a week, so a note typed here needs a day before the
    // month view can place it. Default is "Mon (default)" -- the same fallback the month view
    // uses -- so this is opt-in rather than another required field.
    const existing = userNotes[weekKey];
    const pinnedDate = (!isHiatus && existing && typeof existing === 'object' && existing.date) ? existing.date : '';
    // Note cells key off a plain week ISO; per-phase hiatus cells key off "week|phase", which
    // isn't a parseable date. The day picker is only built for notes, so skip it for hiatus.
    const weekStart = isHiatus ? null : parseDateUTC(weekKey);
    const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const dayOpts = weekStart ? DOW.map((nm,i)=>{
      const dIso = isoOf(addDays(weekStart, i));
      const sel = (pinnedDate === dIso) ? ' selected' : '';
      return `<option value="${dIso}"${sel}>${nm} ${fmtShort(addDays(weekStart, i))}</option>`;
    }).join('') : '';
    // Font size for THIS note. Deliberately a class and no id: collectFieldValues() sweeps every
    // input[id]/select[id]/textarea[id] in the document into the saved file and the undo stack,
    // so a transient editor control with an id would be baked into saves and add phantom undo
    // steps. .note-day-select next door follows the same rule.
    const NOTE_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16];
    // Hiatus bands get the size control too -- they are editable text in the same grid, and a
    // band squeezed by a short row needs the same escape hatch a note does. (The DAY picker
    // stays notes-only: a hiatus key is "week|phase", which is not a parseable date.)
    const curSize = isHiatus ? hiatusFontSizeFor(weekKey) : noteFontSizeFor(weekKey);
    const sizeRow = `<div class="note-size-row">
      <label>Size <select class="note-size-select">
        <option value=""${curSize === undefined ? ' selected' : ''}>Auto</option>
        ${NOTE_SIZES.map(s=>`<option value="${s}"${curSize === s ? ' selected' : ''}>${s}</option>`).join('')}
      </select></label>
    </div>`;
    const dayRow = isHiatus ? '' : `<div class="note-day-row">
      <label>Day <select class="note-day-select">
        <option value=""${pinnedDate?'':' selected'}>Mon (default)</option>
        ${dayOpts}
      </select></label>
    </div>`;
    // Anchored to the cell, appended to the body -- NOT written into the cell. The grid keeps
    // exactly the shape it had before the click.
    const pop = document.createElement('div');
    pop.className = 'note-pop';
    // A per-phase hiatus key is "<week>|<phase>", which is not a date, so take the week part and
    // fall back to the raw key if it still will not parse.
    const popWeek = parseDateUTC(splitWeekKey(weekKey).iso);
    const popTitle = (isHiatus ? 'Hiatus' : 'Note') + ' \u00b7 ' + (popWeek ? fmtShort(popWeek) : weekKey);
    pop.innerHTML = `<div class="note-pop-title">${escHtml(popTitle)}</div>
      <div class="note-editor">
      <textarea rows="2" placeholder="${isHiatus?'Hiatus label':'Note text (multi-line OK)'}">${textVal.replace(/</g,'&lt;')}</textarea>
      ${dayRow}
      ${sizeRow}
      <div class="note-color-row" title="Highlight color">${swatches}</div>
      </div>
      <div class="note-pop-hint">Tab or Ctrl/Cmd&#8209;Enter to save \u00b7 Esc to cancel</div>`;
    document.body.appendChild(pop);
    // Keep it beside the cell and inside the window, and keep doing so: the grid scrolls inside
    // its own pane, so a popover placed once and left alone slides away from its cell.
    const place = ()=>{
      const r = td.getBoundingClientRect();
      pop.style.top = (window.scrollY + r.bottom + 4) + 'px';
      pop.style.left = (window.scrollX + r.left) + 'px';
      const pr = pop.getBoundingClientRect();
      if(pr.right > window.innerWidth - 8) pop.style.left = (window.scrollX + window.innerWidth - pr.width - 8) + 'px';
      if(pr.bottom > window.innerHeight - 8) pop.style.top = (window.scrollY + r.top - pr.height - 4) + 'px';
      if(parseFloat(pop.style.top) < window.scrollY + 8) pop.style.top = (window.scrollY + 8) + 'px';
    };
    place();
    // Capture phase, so scrolling the grid's own pane counts and not just the window.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);

    const textarea = pop.querySelector('textarea');
    // Choosing a day stamps the date into the text itself, so it reads "Table Read 11/04/26"
    // the way the auto-notes do. It's inserted as plain characters -- editable and deletable
    // like anything else typed -- rather than being auto-appended at render time, so what's in
    // the box is exactly what gets saved.
    const daySel = pop.querySelector('.note-day-select');
    if(daySel){
      daySel.addEventListener('mousedown', e=>e.stopPropagation());
      daySel.addEventListener('click', e=>e.stopPropagation());
      daySel.addEventListener('change', e=>{
        e.stopPropagation();
        const iso = daySel.value;
        const cur = textarea.value;
        // Replace any date this control previously stamped, so switching days doesn't stack
        // them up. Only touches a trailing date -- one typed mid-sentence is left alone.
        // \d{1,2} on the DAY as well as the month: fmtShort no longer zero-pads, so a
        // day-of-month under 10 gave a one-digit day and the old pattern silently failed to
        // strip -- switching days would then stack a second date on the end.
        const stripped = cur.replace(/\s*\d{1,2}\/\d{1,2}\/\d{2}\s*$/, '');
        textarea.value = iso ? (stripped ? stripped + ' ' : '') + fmtShort(parseDateUTC(iso)) : stripped;
        textarea.focus();
      });
    }
    textarea.focus();
    textarea.select();

    // Auto-resize the textarea up to the CSS max-height, past which it scrolls. Nothing here
    // touches the grid any more, so a long note grows the popover rather than the calendar.
    function resize(){ textarea.style.height='auto'; textarea.style.height=textarea.scrollHeight+'px'; }
    textarea.addEventListener('input', resize);
    resize();

    activeNoteEditor = {td, pop, place, weekKey, textarea, autoNotes, isHiatus, pendingColor: null,
                        pendingSize: undefined, sizeTouched: false, defaultLabel: hiatusDefaultLabel};
    const sizeSel = pop.querySelector('.note-size-select');
    if(sizeSel){
      sizeSel.addEventListener('mousedown', e=>e.stopPropagation());
      sizeSel.addEventListener('click', e=>e.stopPropagation());
      sizeSel.addEventListener('change', e=>{
        e.stopPropagation();
        if(!activeNoteEditor || activeNoteEditor.td !== td) return;
        activeNoteEditor.pendingSize = sizeSel.value ? +sizeSel.value : undefined;
        activeNoteEditor.sizeTouched = true;
        textarea.focus();
      });
    }

    // Swatch clicks: preview immediately on the cell, store as pending until commit.
    pop.querySelectorAll('.color-swatch').forEach(sw=>{
      sw.addEventListener('mousedown', e=>{ e.preventDefault(); }); // keep textarea focus
      sw.addEventListener('click', e=>{
        e.stopPropagation();
        const c = sw.dataset.color;
        if(activeNoteEditor && activeNoteEditor.td === td){
          activeNoteEditor.pendingColor = c;
          td.style.background = c;
          td.style.color = textColorFor(c);
          pop.querySelectorAll('.color-swatch').forEach(s=>s.classList.toggle('selected', s===sw));
        }
      });
    });
  }

  // Persist an edit. An override is only stored when the committed text actually DIFFERS
  // from the auto-generated value -- merely opening a note and clicking away must not
  // freeze it (a frozen holiday note would wrongly survive a union-country change).
  // Typing a note back to its auto text likewise returns it to auto-updating.
  // Empty text is stored as an explicit clear ('') ONLY when the week had an auto-note to
  // suppress; a blank cell that never had an auto-note is simply removed from userNotes.
  //
  // `date` is an optional ISO day within the week. The waterfall's unit is a week, so a note
  // typed there has no inherent day -- when none is given the month view falls back to the
  // week's Monday. Setting a date pins it to that exact day in the month view.
  // This store belongs to the waterfall: one override per week, feeding the Notes column and
  // the Excel export. Month-view-only notes live separately in dayNotes.
  function saveNoteEdit(weekKey, rawText, autoNotes, date){
    const text = rawText.trim();
    const autoText = autoNotesText(autoNotes || []).trim();
    if(text === autoText && !date){
      delete userNotes[weekKey]; // matches auto -> stay (or return to) auto
    } else if(text){
      userNotes[weekKey] = date ? {text, date} : {text};
    } else if(autoNotes && autoNotes.length){
      userNotes[weekKey] = {text:''}; // explicit clear of an auto-note
    } else {
      delete userNotes[weekKey];
    }
  }

  // Normalise any stored shape into a list of {text, date?}.
  function userNoteList(weekKey){
    const v = userNotes[weekKey];
    if(v === undefined) return [];
    if(v && typeof v === 'object' && Array.isArray(v.notes)) return v.notes.slice();
    const text = (v && typeof v === 'object') ? (v.text || '') : (v || '');
    if(!text) return [];
    const dt = (v && typeof v === 'object' && v.date) ? v.date : null;
    return [dt ? {text, date:dt} : {text}];
  }

  // Take the popover down and stop it tracking the cell. Called by every path that ends an edit;
  // a render() would rebuild the grid but not this, since it lives on the body.
  function closeNoteEditorPop(){
    if(!activeNoteEditor) return;
    const {pop, place} = activeNoteEditor;
    if(place){
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    }
    if(pop) pop.remove();
  }

  function commitActiveNoteEditor(){
    if(!activeNoteEditor) return;
    const {td, pop, weekKey, textarea, autoNotes, isHiatus, pendingColor, pendingSize, sizeTouched,
           defaultLabel} = activeNoteEditor;
    if(isHiatus){
      const text = textarea.value.trim();
      if(text === (defaultLabel || HIATUS_DEFAULT_LABEL)) delete hiatusTexts[weekKey];
      else hiatusTexts[weekKey] = text; // '' allowed = blank band
      if(pendingColor){
        if(pendingColor.toUpperCase() === HIATUS_COLOR.toUpperCase()) delete hiatusColors[weekKey];
        else hiatusColors[weekKey] = pendingColor;
      }
      if(sizeTouched){
        if(pendingSize === undefined || pendingSize === 11) delete hiatusFontSize[weekKey];
        else hiatusFontSize[weekKey] = pendingSize;
      }
    } else {
      const daySel = pop.querySelector('.note-day-select');
      const chosenDate = daySel ? (daySel.value || '') : '';
      saveNoteEdit(weekKey, textarea.value, autoNotes, chosenDate);
      if(pendingColor){
        if(pendingColor.toUpperCase() === MILESTONE_COLOR.toUpperCase()) delete noteColors[weekKey];
        else noteColors[weekKey] = pendingColor;
      }
      if(sizeTouched){
        // "Auto" (and an explicit 11, the default) store nothing, so an untouched calendar keeps
        // an empty map -- the same rule the colour swatches follow.
        if(pendingSize === undefined || pendingSize === 11) delete noteFontSize[weekKey];
        else noteFontSize[weekKey] = pendingSize;
      }
      // A cell with no note has no highlight and no size; drop both with it.
      if(!effectiveNoteText(weekKey, autoNotes)){ delete noteColors[weekKey]; delete noteFontSize[weekKey]; }
    }
    closeNoteEditorPop();
    activeNoteEditor = null;
    render(currentSchedule);
    reflectCountryLock();
    markDirty(); // was previously missing here -- waterfall note/hiatus edits were invisible to save-dirty tracking and undo
  }

  function closeWithoutSaving(){
    if(!activeNoteEditor) return;
    closeNoteEditorPop();
    activeNoteEditor = null;
    render(currentSchedule);
  }

  // Save on clicking outside. e.stopPropagation() in the table-wrap delegated handler
  // already prevents the cell-opening click from bubbling here, so no skip-flag needed.
  document.addEventListener('click', e=>{
    if(!activeNoteEditor) return;
    // The popover is a sibling of the grid, not inside the cell, so it has to be excluded here
    // too -- otherwise picking a colour or a day would commit and close the editor.
    if(activeNoteEditor.td.contains(e.target)) return;
    if(activeNoteEditor.pop && activeNoteEditor.pop.contains(e.target)) return;
    commitActiveNoteEditor();
  });
  document.addEventListener('keydown', e=>{
    if(!activeNoteEditor) return;
    if(e.key==='Escape'){ closeWithoutSaving(); return; }
    if(e.key==='Tab'){ e.preventDefault(); commitActiveNoteEditor(); return; }
    // Ctrl+Enter or Cmd+Enter commits (plain Enter adds a newline in the textarea)
    if(e.key==='Enter' && (e.ctrlKey || e.metaKey)){
      e.preventDefault(); commitActiveNoteEditor();
    }
  });

  function readCfgForMeta(key){
    const start = document.getElementById('start-'+key).value;
    const rawValue = parseInt(document.getElementById('weeks-'+key).value,10);
    if(start && parseDateUTC(start)===null) return 'invalid';
    if(!(start && rawValue>0)) return null;
    const p = PHASES.find(ph=>ph.key===key) || {inputMode:'weeks'};
    const weeks = rawInputToWeeks(p, rawValue);
    return {start, weeks, rawValue};
  }

  // ---------- Excel export ----------
  async function exportExcel(schedule){
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Planning Cal', {
      views: [{ showGridLines: true, showRowColHeaders: true }],
      pageSetup: {
        orientation: 'portrait',
        // Pin US Letter. With paperSize omitted Excel falls back to the DEFAULT PRINTER's
        // paper, so the same workbook silently reflowed to A4 for anyone whose machine
        // defaults to it -- a different page shape from the one the layout was fitted to.
        paperSize: 1,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        // The on-screen grid and the waterfall PDF both centre the block (margin:auto in the
        // print CSS). Excel left-aligns unless told otherwise, which showed up as the export
        // sitting off to one side for any calendar narrower than the printable width.
        horizontalCentered: true
      }
    });
    const yearBlocks = computeYearBlocks(schedule.weeks);
    const blockCount = yearBlocks.length;

    const blockLayout = computeBlockLayout(schedule, yearBlocks);
    const { blockSlotMaps, blockMaxConcurrent, blockOccupancy, blockSimSlot } = blockLayout;
    const hasAnySimPost = schedule.weeks.some(w=>w.simPost);
    // Columns per block = date + phase slots (Simultaneous Post now lives inside the phase
    // area, no dedicated column) + single Notes column.
    const blockColsPerBlock = blockMaxConcurrent.map(mc => 1 + mc + 1);
    const blockStartCols = [];
    { let cum=1; for(let b=0;b<blockCount;b++){ blockStartCols.push(cum); cum += blockColsPerBlock[b]; } }

    // Column widths come from the shared model, so the workbook, the on-screen grid and the
    // PDF are all laid out from the same numbers. This replaced a per-character weight table
    // that estimated rendered width ("i" 0.34, "M" 1.25, ...) and then multiplied by an
    // empirical 1.40 -- it over-estimated "Production wk 21" by about 30%, which is why the
    // exported columns sat wider than the reference export's.
    const blockColWidths = sheetColumnWidths(schedule, yearBlocks, blockLayout);

    // A hand-dragged row height carries into the workbook. Screen px -> points, matching the
    // 20px/15pt relationship the grid is built on.
    // A pinned row height is written as-is. ExcelJS emits customHeight="1" for ANY truthy
    // row.height, which permanently disables Excel's autofit for that row -- so a wrapped note
    // taller than the pinned height would be clipped in the workbook with no ellipsis and no
    // indication. That is exactly what the screen does now too (the .cell-body wrapper caps at
    // the same height), so the two agree: pinned means pinned, in both.
    // Set on EVERY row, not just dragged ones. It carries customHeight, which switches Excel's
    // autofit off -- which is now the point: the screen and the PDF give every row the same
    // height, and a workbook that quietly grew one row around a long note would be the odd one
    // out. Excel's own row autofit is still one click away for anyone who wants it.
    function applyRowHeight(row, r){
      row.height = Math.round((rowHeights[r] || ROW_DEFAULT_PX) * ROW_PX_TO_PT * 100) / 100;
    }

    const HEADER_FILL = 'D9D9D9';
    const thin = {style:'thin'};
    const notesByIdx = schedule.notesByIdx || {};

    // Use Excel's built-in page header (Page Layout view + printed pages)
    // Excel header format: &L=left &C=center &R=right
    // Line break inside a section: use char code 10 (LF)
    // Strip any & characters from user text (they are escape codes in Excel headers)
    const hdrSafe = s => String(s).replace(/&/g, '').trim();
    const totalCols = blockStartCols[blockCount-1] + blockColsPerBlock[blockCount-1] - 1;

    // Header lines come from the same auto defaults as the live view, with any per-line
    // manual overrides applied on top (see computeHeaderDefaults / headerOverrides).
    const hd = computeHeaderDefaults(schedule);
    const todayStr = hdrSafe(headerLine('left', hd));
    const cLines = ['c1','c2','c3'].map(id=>hdrSafe(headerLine(id, hd))).filter(Boolean);
    const rLines = ['r1','r2','r3'].map(id=>hdrSafe(headerLine(id, hd))).filter(Boolean);

    // Header size codes: &B turns on bold, then place &12 immediately before a font-name
    // code (&"Calibri,Bold"). The quote after the size digits is a non-digit terminator, so
    // Excel reads the size as 12 even when the section text itself starts with a digit
    // (e.g. the date or a "40-Day" span). Leading with a bare &12 would let Excel swallow
    // following digits into the size (e.g. &127.9.26 → size 127), which is the misparse to
    // avoid.
    const HSIZE = '&B&12&"Calibri,Bold"';
    // Excel hard-caps a header/footer string at 255 characters IN TOTAL (not per &L/&C/&R
    // section). One character over and the workbook still writes and still validates as XML, but
    // Excel refuses it on open with "We found a problem with some content... Do you want us to try
    // to recover as much as we can?" -- which looks like a corrupt file rather than a too-long
    // header. A real calendar hit this at exactly 256 characters, so keep the total inside the
    // limit here rather than shipping a workbook Excel will reject.
    //
    // Note the three `HSIZE` prefixes alone cost 60 of the 255, so the text budget is really ~195;
    // long show titles plus three right-hand stat lines can genuinely exceed it.
    const HF_MAX = 255;
    let hL = todayStr, hC = cLines.slice(), hR = rLines.slice();
    const assembleHeader = () => [
      `&L${HSIZE}${hL}`,
      hC.length ? `&C${HSIZE}${hC.join('\n')}` : '',
      hR.length ? `&R${HSIZE}${hR.join('\n')}` : '',
    ].join('');
    let headerStr = assembleHeader();
    // First give up trailing DETAIL lines -- the right-hand stats before the centre's subtitles --
    // since losing "10 Episodes" reads better than a truncated show title. A block's first line is
    // never dropped, so the date, the title and the headline stat always survive.
    while(headerStr.length > HF_MAX && (hR.length > 1 || hC.length > 1)){
      if(hR.length > 1) hR.pop(); else hC.pop();
      headerStr = assembleHeader();
    }
    // Backstop for a single very long line (e.g. an enormous show title): shave the longest
    // remaining line until it fits. Trimming the assembled string directly could cut through an
    // "&..." control code and corrupt the formatting, so always cut inside a line's own text.
    let hfGuard = 0;
    while(headerStr.length > HF_MAX && hfGuard++ < 400){
      let arr = null, idx = -1, len = hL.length;      // default target: the left/date line
      hC.forEach((s,i)=>{ if(s.length > len){ arr = hC; idx = i; len = s.length; } });
      hR.forEach((s,i)=>{ if(s.length > len){ arr = hR; idx = i; len = s.length; } });
      if(len <= 1) break;                              // nothing left worth cutting
      const keep = Math.max(1, len - (headerStr.length - HF_MAX) - 1);
      const cut = (arr ? arr[idx] : hL).slice(0, keep).replace(/\s+$/, '') + '…';
      if(arr) arr[idx] = cut; else hL = cut;
      headerStr = assembleHeader();
    }
    ws.headerFooter.oddHeader = headerStr;
    ws.pageSetup.margins = {
      left: 0.25, right: 0.25,
      top: 0.75, bottom: 0.75,
      header: 0.3, footer: 0.3
    };

    function setFill(cell, hex){
      if(!hex) return;
      cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF'+hex.replace('#','')}};
    }
    function baseStyle(cell, opts){
      // 11, not 12. Excel's column-width unit is defined by the workbook's Normal style
      // (Calibri 11pt, max digit width 7px); cells set to 12pt are ~9% wider than that unit
      // assumes, so every measured width came out short and needed fudging. The reference
      // export's 15pt base row height is Excel's default for an 11pt Normal style, so 11 also
      // matches what the exports being copied actually use.
      cell.font = Object.assign({name:'Calibri', size:11}, opts && opts.font);
      cell.alignment = {horizontal:'center', vertical:'middle'};
      if(opts && opts.numFmt) cell.numFmt = opts.numFmt;
    }

    for(let b=0; b<blockCount; b++){
      const maxConcurrent = blockMaxConcurrent[b];
      const startCol = blockStartCols[b];
      const dateCol = startCol;
      const labelColStart = startCol+1;
      const labelColEnd = startCol+maxConcurrent;
      const notesCol = labelColEnd + 1;

      const widths = blockColWidths[b];
      ws.getColumn(dateCol).width = widths.date;
      for(let k=0;k<maxConcurrent;k++) ws.getColumn(labelColStart+k).width = widths.labels[k];
      ws.getColumn(notesCol).width = widths.notes;

      // Clamped to the same trimmed height the screen uses, so the workbook does not carry a
      // trailing empty row the preview has dropped.
      const rowsInBlock = Math.min(yearBlocks[b].count, sheetRowCount(schedule, yearBlocks));
      const yearLabel = yearBlocks[b].year;

      // header row
      const hDate = ws.getRow(1).getCell(dateCol);
      hDate.value = 'Date'; baseStyle(hDate, {font:{bold:true}}); setFill(hDate, HEADER_FILL);
      hDate.border = {top:thin, left:thin};

      if(labelColEnd>labelColStart) ws.mergeCells(1, labelColStart, 1, labelColEnd);
      const hYear = ws.getRow(1).getCell(labelColStart);
      hYear.value = yearLabel; baseStyle(hYear, {font:{bold:true}}); setFill(hYear, HEADER_FILL);
      hYear.border = {top:thin};
      for(let c=labelColStart+1;c<=labelColEnd;c++){ const cc=ws.getRow(1).getCell(c); setFill(cc,HEADER_FILL); cc.border={top:thin}; }

      // Notes header over the single Notes column.
      const hNotes = ws.getRow(1).getCell(notesCol);
      hNotes.value = 'Notes'; baseStyle(hNotes, {font:{bold:true}}); setFill(hNotes, HEADER_FILL);
      hNotes.border = {top:thin, right:thin};

      for(let r=0;r<rowsInBlock;r++){
        const excelRow = r+2;
        const globalIdx = yearBlocks[b].startIdx + r;
        const week = schedule.weeks[globalIdx];
        const isLastRow = (r===rowsInBlock-1);
        // Row r is the same <tr> in every block, so this runs once per block with the same
        // value. Idempotent, and cheaper than hoisting it out of the per-block loop.
        applyRowHeight(ws.getRow(excelRow), r);

        // date cell (hardcode very first cell; formula-chain everything else)
        const dCell = ws.getRow(excelRow).getCell(dateCol);
        baseStyle(dCell, {font:{bold:true}, numFmt:'mm-dd-yy'});
        if(b===0 && r===0){
          dCell.value = week.date;
        } else if(r===0){
          const prevBlockStartCol = blockStartCols[b-1];
          const prevBlockRows = yearBlocks[b-1].count;
          dCell.value = {formula:`${colLetter(prevBlockStartCol)}${prevBlockRows+1}+7`};
        } else {
          dCell.value = {formula:`${colLetter(dateCol)}${excelRow-1}+7`};
        }
        dCell.border = Object.assign({left:thin}, isLastRow?{bottom:thin}:{});

        if(week.cells.length && week.cells[0].type==='hiatus'){
          const hKey = week.date.toISOString().slice(0,10);
          const hTxt = hiatusTextFor(hKey);
          const hCol = hiatusColorFor(hKey);
          ws.mergeCells(excelRow, labelColStart, excelRow, notesCol);
          const hCell = ws.getRow(excelRow).getCell(labelColStart);
          hCell.value = hTxt;
          // Same fit the screen applies, over the same span: every column of the block but the
          // date one.
          let hAvail = 0;
          for(let k=0;k<maxConcurrent;k++) hAvail += (widths.labels[k] || 0);
          hAvail += widths.notes;
          const hSize = hiatusFontSizeFor(hKey);
          const hFit = cellTextFit(hTxt, hAvail, {
            basePx: hSize || 11, manual: hSize !== undefined, rowPx: rowHeights[r] || ROW_DEFAULT_PX
          });
          baseStyle(hCell, {font:{color:{argb:'FF'+textColorFor(hCol).replace('#','')},
                                  size: Math.round(11 * hFit.scale * 100) / 100}});
          // NOTE: Excel never autofits a MERGED cell, so a wrapped band in a row with no pinned
          // height will not grow the row -- unlike the screen. Pinning the row (which is what
          // the line budget is derived from anyway) is what makes the two agree.
          hCell.alignment = {horizontal:'center', vertical:'middle',
                             wrapText: hFit.lines > 1 || hTxt.indexOf('\n') >= 0, indent:0};
          setFill(hCell, hCol);
          hCell.border = isLastRow ? {bottom:thin} : {};
          // the rightmost cell of a merged range needs its own border set for the edge to render
          const rightCell = ws.getRow(excelRow).getCell(notesCol);
          rightCell.border = Object.assign({right:thin}, isLastRow?{bottom:thin}:{});
        } else {
          // Lay out the phase area exactly like the live view: stable slots, lone phases
          // span empty slots (merged cells), and Simultaneous Post takes the leftmost free
          // slot. `slot` tracks the local phase-slot index; `col` is its Excel column.
          const layout = computePhaseRowLayout(week, maxConcurrent, blockSlotMaps[b], blockOccupancy[b], r, blockSimSlot[b]);
          let slot = 0;
          layout.forEach(item=>{
            const col = labelColStart + slot;
            const cell = ws.getRow(excelRow).getCell(col);
            if(item.colspan > 1){
              ws.mergeCells(excelRow, col, excelRow, col + item.colspan - 1);
            }
            // Same shrink the screen applies to a phase label, from the same helper and over the
            // same summed span, so a narrowed phase column reads identically in both.
            let availChars = 0;
            for(let k=0;k<item.colspan;k++) availChars += (widths.labels[slot + k] || 0);
            const lf = cellTextFit(item.label || '', availChars, {});
            const lfSize = Math.round(11 * lf.scale * 100) / 100;
            if(item.kind === 'phase'){
              // Explicit, though it is also ExcelJS's default: leaving it implicit is what let
              // the screen and the PDF drift into the phase palette's own textColor.
              baseStyle(cell, {font:{size:lfSize, color:{argb:'FF'+GRID_TEXT_COLOR.replace('#','')}}});
              cell.value = item.label;
              setFill(cell, item.color);
            } else if(item.kind === 'phaseHiatus'){
              // Editable text, so it follows the note rules (row budget + per-band size) rather
              // than the one-line fit used for the phase labels beside it.
              // item.weekIso, not week.date: this must be byte-identical to the key the screen
              // builds (cell.weekIso + '|' + cell.phaseKey) or a size set in the editor would
              // never be found by the export.
              const phKey = item.weekIso + '|' + item.phaseKey;
              const phSize = hiatusFontSizeFor(phKey);
              const phFit = cellTextFit(item.label || '', availChars, {
                basePx: phSize || 11, manual: phSize !== undefined, rowPx: rowHeights[r] || ROW_DEFAULT_PX
              });
              baseStyle(cell, {font:{color:{argb:'FF'+textColorFor(item.color).replace('#','')},
                                     size: Math.round(11 * phFit.scale * 100) / 100}});
              cell.alignment = {horizontal:'center', vertical:'middle',
                                wrapText: phFit.lines > 1, indent:0};
              cell.value = item.label;
              setFill(cell, item.color);
            } else if(item.kind === 'simpost'){
              baseStyle(cell, {font:{size:lfSize, color:{argb:'FF'+GRID_TEXT_COLOR.replace('#','')}}});
              cell.value = item.label;
              setFill(cell, SIMPOST_COLOR);
            } else {
              baseStyle(cell);
            }
            // Border on the starting cell; the rightmost covered cell also needs its edge.
            cell.border = (isLastRow)?{bottom:thin}:{};
            if(item.colspan > 1){
              const rc = ws.getRow(excelRow).getCell(col + item.colspan - 1);
              rc.border = (isLastRow)?{bottom:thin}:{};
            }
            slot += item.colspan;
          });
          // Notes: a single cell containing the inline "Label date" text. User edits
          // (including cleared auto-notes) win via effectiveNoteText. Tight horizontal
          // padding so the column hugs its content.
          const nCell = ws.getRow(excelRow).getCell(notesCol);
          const nKey = week.date.toISOString().slice(0,10);
          const noteText = effectiveNoteText(nKey, autoNotesForView(notesByIdx[globalIdx] || [], 'sheet'));
          if(noteText){
            const nCol = noteColorFor(nKey);
            // Same shrink the screen applies, from the same helper, so a note that sits on one
            // line in the preview sits on one line here too. The size is written EXPLICITLY
            // rather than leaning on Excel's own shrinkToFit, whose algorithm is not ours --
            // an explicit size is what makes the two agree.
            const nSize = noteFontSizeFor(nKey);
            const fit = cellTextFit(noteText, widths.notes, {
              basePx: nSize || 11, manual: nSize !== undefined, rowPx: rowHeights[r] || ROW_DEFAULT_PX
            });
            // An un-pinned row must be tall enough for the lines the note actually uses:
            // Excel autofits a wrapped cell only when no explicit height is set, and that is
            // the case here, so nothing to do -- but a pinned row is capped on both sides.
            baseStyle(nCell, {font:{
              color:{argb:'FF'+textColorFor(nCol).replace('#','')},
              size: Math.round(11 * fit.scale * 100) / 100
            }});
            nCell.value = noteText;
            setFill(nCell, nCol);
            // wrapText must also be on when the text carries an explicit newline. Without it
            // Excel keeps the break in the cell's value but lays the whole string out on ONE
            // line, so a week with two notes -- autoNotesText joins them with '\n' -- ran
            // together in the workbook while the screen showed two lines.
            nCell.alignment = {horizontal:'center', vertical:'middle',
                               wrapText: fit.lines > 1 || noteText.indexOf('\n') >= 0, indent:0};
          } else {
            baseStyle(nCell);
          }
          nCell.border = Object.assign({right:thin}, isLastRow?{bottom:thin}:{});
        }
      }
    }

    // Interior gridlines are drawn as light cell borders rather than via Excel's print
    // gridline setting, so they can be styled. Structural borders (block frames, header
    // separators) are already set and are always kept. SHEET_GRIDLINES==='none' leaves the
    // interior clean, which is what the reference exports look like.
    ws.pageSetup.showGridLines = false;
    if(SHEET_GRIDLINES !== 'none'){
      const line = (SHEET_GRIDLINES === 'dotted')
        ? {style:'dotted', color:{argb:'FFDBDBDB'}}
        : {style:'dashed', color:{argb:'FFBFBFBF'}};
      const totalRows = 1 + Math.max(...yearBlocks.map(b=>b.count));
      const totalColsForGrid = blockStartCols[blockCount-1] + blockColsPerBlock[blockCount-1] - 1;
      for(let r=1;r<=totalRows;r++){
        for(let c=1;c<=totalColsForGrid;c++){
          const cell = ws.getRow(r).getCell(c);
          const b = cell.border || {};
          cell.border = {
            top: b.top || line,
            left: b.left || line,
            bottom: b.bottom || line,
            right: b.right || line,
          };
        }
      }
    }

    // Orientation: 2 or fewer year-columns -> portrait, 3 or more -> landscape, unless the
    // other way round prints meaningfully larger. The rule itself now lives in
    // sheetPageOrientation() and is shared with the PDF writer -- when each output computed it
    // from its own grid measurements they could disagree, and a three-year calendar sitting on
    // the 15% boundary came out landscape here and portrait there.
    {
      const totalCols = blockStartCols[blockCount-1] + blockColsPerBlock[blockCount-1] - 1;
      const totalRows = 1 + Math.max(...yearBlocks.map(b=>b.count));
      const metrics = sheetGridMetrics(schedule, yearBlocks, blockColWidths);
      ws.pageSetup.orientation =
        sheetPageOrientation(metrics.gridW, metrics.gridH, blockCount).orientation;
      // Pin the print area to the used range. Left unset, Excel infers it, and any cell that
      // has ever been touched outside the grid drags a blank second page into the print job
      // -- which also defeats fitToHeight:1, since the "sheet" it fits is then the wrong size.
      ws.pageSetup.printArea = 'A1:' + ws.getColumn(totalCols).letter + totalRows;
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const titleRaw = (document.getElementById('show-title').value || '').trim();
    const safeTitle = titleRaw.replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim();
    const xlsxName = (safeTitle ? safeTitle + ' ' : '') + 'Planning Calendar.xlsx';
    a.href = url; a.download = xlsxName;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- wire up ----------
  let currentSchedule = {weeks:[], maxConcurrent:0};
  let viewMode = 'sheet';
  // Which settings tab is showing in the sidebar. Purely a UI grouping; persisted so a saved
  // file re-opens on the same tab.
  let sidebarTab = 'show';
  function setSidebarTab(tab){
    if(tab === 'holidays') tab = 'settings';   // pre-rename saves
    if(!['show','phases','settings'].includes(tab)) tab = 'show';
    sidebarTab = tab;
    document.querySelectorAll('.side-tab-btn').forEach(b=>{
      const on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1; // roving tabindex: only the selected tab is in the tab order
    });
    document.querySelectorAll('.form-panel section.card[data-tab]').forEach(s=>{
      s.classList.toggle('tab-hidden', s.dataset.tab !== tab);
    });
  }
  (function(){
    const track = document.querySelector('.side-tabs-track');
    if(!track) return;
    const tabs = Array.from(track.querySelectorAll('.side-tab-btn'));
    // Complete the ARIA tab pattern: link each tab to the section(s) it reveals (as tabpanels),
    // and give the tablist real keyboard semantics -- roving tabindex + Arrow / Home / End nav,
    // which the role="tab" markup promised but didn't implement.
    tabs.forEach(b=>{
      const t = b.dataset.tab;
      if(!b.id) b.id = 'sidetab-' + t;
      const panels = Array.from(document.querySelectorAll('.form-panel section.card[data-tab="'+t+'"]'));
      panels.forEach((p,i)=>{
        if(!p.id) p.id = 'sidepanel-' + t + '-' + i;
        p.setAttribute('role','tabpanel');
        p.setAttribute('aria-labelledby', b.id);
      });
      if(panels.length) b.setAttribute('aria-controls', panels.map(p=>p.id).join(' '));
      b.tabIndex = b.classList.contains('active') ? 0 : -1;
    });
    track.addEventListener('click', e=>{
      const b = e.target.closest('.side-tab-btn');
      if(b) setSidebarTab(b.dataset.tab);
    });
    track.addEventListener('keydown', e=>{
      const idx = tabs.indexOf(document.activeElement);
      if(idx === -1) return;
      let next = -1;
      if(e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % tabs.length;
      else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length;
      else if(e.key === 'Home') next = 0;
      else if(e.key === 'End') next = tabs.length - 1;
      if(next === -1) return;
      e.preventDefault();
      setSidebarTab(tabs[next].dataset.tab);
      tabs[next].focus();
    });
  })();
  // User-editable notes for the spreadsheet view. Keyed by ISO date string (Monday of each week)
  // so they survive schedule re-renders (week indices can shift when dates change, but the date itself doesn't).
  const userNotes = {}; // { 'YYYY-MM-DD': {text: string} }  text:'' = auto-note explicitly cleared
  // Month-view-only notes, keyed by DAY. Deliberately separate from userNotes: the waterfall's
  // unit is a week and its Notes column feeds the Excel export, so per-day notes added in the
  // month view live here and appear only in the month view and its PDF.
  // Each day holds a LIST -- a date block can carry several independent notes, each remembering
  // the line it was added on and its own colour. Normalised by dayNoteList() below.
  const dayNotes = {};      // { 'YYYY-MM-DD': [ {text, lane, color} ] }
  let dayNoteColors = {};   // legacy per-day colour store, folded in by dayNoteList()
  // Normalise any stored shape (old single-object saves included) into a list.
  function dayNoteList(iso){
    const v = dayNotes[iso];
    if(!v) return [];
    if(Array.isArray(v)) return v;
    if(v.text) return [{text:v.text, lane:(v.lane!=null?v.lane:null), color:dayNoteColors[iso]||null}];
    return [];
  }

  // Per-cell highlight customization. All keyed by week 'YYYY-MM-DD'; absent = default.
  let noteColors = {};   // note cell fill override (default MILESTONE_COLOR purple)
  // Per-note font size override, in screen px on the 11px base (undefined = size chosen
  // automatically from the row's line budget). Keyed by week ISO exactly like noteColors, and
  // travels with the note under every operation that moves notes.
  let noteFontSize = {};
  // Same idea for hiatus bands. One store serves BOTH kinds because they are edited by the same
  // editor and keyed the way their text and colour already are: a full-block band by week ISO,
  // a per-phase band by "week|phaseKey". Kept separate from noteFontSize so the two cannot
  // collide on a bare week key.
  let hiatusFontSize = {};
  let hiatusTexts = {};  // hiatus band label override (default 'Holiday Hiatus')
  let hiatusColors = {}; // hiatus band fill override (default HIATUS_COLOR red)
  // Per-holiday, per-view note visibility overrides. { 'YYYY-MM-DD': {sheet:bool, month:bool} }
  // Absent key -> HOLIDAY_VIEW_DEFAULT. Display-only; never affects the schedule math.
  let holidayView = {};
  // hid -> true means the user switched that holiday OFF (default is on, so an empty map = all on).
  let holidayOff = {};
  // The user's own one-off holidays: [{id, name, date}]. Single days, which the hiatus rows can't
  // express (those are whole Monday-snapped weeks). Not tied to a region.
  let customHolidays = [];

  // The 10 "Standard Colors" from Microsoft Office / Excel's color picker.
  const EXCEL_STANDARD_COLORS = [
    '#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050',
    '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'
  ];
  // Black or white text depending on the fill's luminance, so labels stay readable
  // on light colors like yellow or light green.
  function textColorFor(hex){
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return (0.299*r + 0.587*g + 0.114*b) > 160 ? '#000000' : '#FFFFFF';
  }
  // Escape user-provided text for safe interpolation into HTML (labels, notes, titles).
  function escHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Compute per-block slot maps (global column -> visual slot) and the phase-slot count for
  // each year-block. Shared by the live view and the Excel export so they never drift.
  // mc for a block accounts for Simultaneous Post needing its own slot in weeks where every
  // phase slot is already occupied, so the SimPost marker always has room.
  function computeBlockLayout(schedule, yearBlocks){
    const blockSlotMaps = yearBlocks.map(b=>{
      const firstAppear = new Map();
      for(let i=b.startIdx; i<b.startIdx+b.count; i++){
        const local = i - b.startIdx;
        schedule.weeks[i].cells.forEach(c=>{
          if(c.col!==undefined && !firstAppear.has(c.col)) firstAppear.set(c.col, local);
        });
      }
      const sortedSlots = Array.from(firstAppear.keys()).sort((a,bv)=>{
        const fa = firstAppear.get(a), fb = firstAppear.get(bv);
        return (fa - fb) || (a - bv);
      });
      const map = new Map();
      sortedSlots.forEach((slot, localIdx) => map.set(slot, localIdx));
      return map;
    });
    // Simultaneous Post gets ONE fixed column per block, immediately to the right of the
    // Production column, and always renders there (never hopping columns week to week). It
    // may share that column with a phase that has already ended. We compute that fixed slot
    // and ensure the block has enough columns that the slot is free during every SimPost week.
    const blockMaxConcurrent = [];
    const blockSimSlot = [];
    yearBlocks.forEach((b, bi)=>{
      const slotMap = blockSlotMaps[bi];
      const phaseSlots = slotMap.size;
      const anySim = (()=>{ for(let i=b.startIdx;i<b.startIdx+b.count;i++){ if(schedule.weeks[i].simPost) return true; } return false; })();
      if(!anySim){ blockMaxConcurrent[bi] = Math.max(1, phaseSlots); blockSimSlot[bi] = -1; return; }
      // Production's local slot (SimPost sits just right of it; fall back to rightmost).
      let prodSlot = -1;
      for(let i=b.startIdx; i<b.startIdx+b.count; i++){
        const pc = schedule.weeks[i].cells.find(c=>c.key==='production');
        if(pc && pc.col!==undefined && slotMap.has(pc.col)){ prodSlot = slotMap.get(pc.col); break; }
      }
      let simSlot = prodSlot>=0 ? prodSlot+1 : phaseSlots; // desired column for SimPost
      // Check whether any phase occupies simSlot during a SimPost week; if so, SimPost needs
      // its own extra lane (we widen the block by one and place SimPost in that new column).
      let conflict = false;
      for(let i=b.startIdx; i<b.startIdx+b.count && !conflict; i++){
        const wk = schedule.weeks[i];
        if(!wk.simPost || (wk.cells.length && wk.cells[0].type==='hiatus')) continue;
        for(const c of wk.cells){
          if(c.col!==undefined && slotMap.has(c.col) && slotMap.get(c.col)===simSlot){ conflict = true; break; }
        }
      }
      let mc = phaseSlots;
      if(simSlot >= phaseSlots || conflict){ mc = Math.max(phaseSlots + 1, simSlot + 1); if(conflict) simSlot = mc - 1; }
      blockMaxConcurrent[bi] = Math.max(1, mc);
      blockSimSlot[bi] = Math.min(simSlot, blockMaxConcurrent[bi]-1);
    });
    // For each block build an occupancy grid: occupied[slot] = Map(local week index -> occupant
    // key) for the phase (or Simultaneous Post marker) holding that slot. Spanning is then decided
    // per phase LIFETIME (not per block): a phase may span into a neighbor slot only if that
    // neighbor is empty for every week the phase itself runs. Two phases that never share a
    // week don't block each other, so a phase can fill a column its non-overlapping neighbor
    // used at a different time.
    const blockOccupancy = yearBlocks.map((b, bi)=>{
      const slotMap = blockSlotMaps[bi];
      const mc = blockMaxConcurrent[bi];
      const simSlot = blockSimSlot[bi];
      // Each slot maps local-week -> the KEY of whatever occupies it (a phase key, or a sentinel
      // for the Simultaneous Post marker). Tracking the occupant's identity -- not just "occupied"
      // -- lets phaseRunBounds() stop a run where the column's occupant changes, so a later,
      // non-overlapping phase that REUSES a column isn't treated as one continuous run with the
      // earlier phase (which would let the earlier phase's overlaps block the later one's spanning).
      const SIM_KEY = ' simpost';
      const occupied = Array.from({length:mc}, ()=>new Map());
      for(let i=b.startIdx; i<b.startIdx+b.count; i++){
        const local = i - b.startIdx;
        const wk = schedule.weeks[i];
        // Hiatus weeks render as a full-width band and don't belong to any phase slot, so
        // they must NOT mark slots as occupied -- otherwise they'd artificially extend a
        // phase's run through the hiatus and block legitimate spanning around it.
        if(wk.cells.length && wk.cells[0].type==='hiatus') continue;
        wk.cells.forEach(c=>{ if(c.col!==undefined && slotMap.has(c.col)){ const s=slotMap.get(c.col); if(s<mc){ occupied[s].set(local, c.key || ('col'+c.col)); } } });
        if(wk.simPost && simSlot>=0) occupied[simSlot].set(local, SIM_KEY); // SimPost's fixed lane
      }
      return occupied;
    });
    return { blockSlotMaps, blockMaxConcurrent, blockOccupancy, blockSimSlot };
  }

  // Given a block's occupancy grid, the local week index, and a phase occupying slot `s`,
  // return the phase's run [start,end] (contiguous weeks it occupies slot s) so we can test
  // whether a neighbor slot is free for the phase's whole lifetime.
  function phaseRunBounds(occupiedSlot, localWeek){
    // Bound the run to the SAME occupant (phase key) that holds the slot at localWeek, stopping
    // where the occupant changes. occupiedSlot is now a Map(local -> key); walking raw occupancy
    // across an occupant change would merge two non-overlapping phases sharing a reused column
    // into one run -- and then one phase's overlaps (e.g. Simultaneous Post) would wrongly block
    // the other phase from spanning to fill the width.
    const key = occupiedSlot.get(localWeek);
    let start = localWeek, end = localWeek;
    while(start-1 >= 0 && occupiedSlot.get(start-1) === key) start--;
    while(occupiedSlot.get(end+1) === key) end++;
    return [start, end];
  }

  // Compute how a single week's phase area (mc phase slots) should be laid out:
  //  - Phases sit in their stable slots.
  //  - A phase spans rightward into a neighbor slot only if that neighbor is empty for the
  //    phase's ENTIRE run (its contiguous set of weeks). Non-overlapping phases don't block
  //    each other; a phase stays narrow beside anything it actually overlaps.
  //  - Simultaneous Post occupies ONE fixed slot for the whole block (simSlot, just right of
  //    Production) and always renders there; a phase span stops before it.
  // `occupancy` is the block's per-slot Map(local week index -> occupant key); `localWeek` is
  // this row's index within the block; `fixedSimSlot` is the block's SimPost column (or -1).
  function computePhaseRowLayout(week, mc, slotMap, occupancy, localWeek, fixedSimSlot){
    const bySlot = new Array(mc).fill(null);
    week.cells.forEach(c=>{
      if(c.col!==undefined && slotMap.has(c.col)){
        const s = slotMap.get(c.col);
        if(s<mc) bySlot[s] = c;
      }
    });

    // Simultaneous Post's slot this week: the fixed lane, only when this week flags it.
    const simSlot = (week.simPost && fixedSimSlot!==undefined && fixedSimSlot>=0) ? fixedSimSlot : -1;

    // Is neighbor slot `n` free for the whole run of the phase occupying slot `s` at this
    // week? True only if `n` is empty across every week that slot `s` phase runs. The SimPost
    // lane is treated like any other column here: a phase may span across it during weeks it
    // isn't used, as long as SimPost never appears in that column during the phase's run.
    const freeForRun = (s, n) => {
      if(!occupancy) return false;
      if(n === simSlot) return false; // don't overrun THIS week's active SimPost marker
      const [rs, re] = phaseRunBounds(occupancy[s], localWeek);
      for(let wk=rs; wk<=re; wk++){ if(occupancy[n].has(wk)) return false; }
      return true;
    };
    // Are ALL slots from..to free for the whole run of the phase occupying slot `s`?
    const freeForRunSpan = (s, from, to) => {
      for(let n=from; n<=to; n++){ if(n===simSlot) return false; if(!freeForRun(s, n)) return false; }
      return true;
    };

    // How wide any ONE phase may get in this row. Phases running at the same time divide the
    // phase area evenly -- two take half each, three a third, four a quarter -- because a row
    // where one phase is three columns wide and the phase beside it is one reads as a mistake
    // rather than as a schedule. A phase running alone is unaffected and still fills the area.
    //
    // Fixed cells are taken out of the pot first: a per-phase hiatus band and the Simultaneous
    // Post marker are one column each and never widen, so the phases divide what is left.
    const fixedSlots = (simSlot >= 0 ? 1 : 0)
                     + bySlot.filter(c => c && c.type === 'phaseHiatus').length;
    const nPhases = bySlot.filter(c => c && c.type !== 'phaseHiatus').length;
    const spanCap = nPhases > 1 ? Math.max(1, Math.floor((mc - fixedSlots) / nPhases)) : mc;

    const out = [];
    let k = 0;
    while(k < mc){
      if(k === simSlot){
        out.push({kind:'simpost', label:simPostLabel(week), color:SIMPOST_COLOR, textColor:SIMPOST_TEXT, colspan:1});
        k++;
      } else if(bySlot[k]){
        const c = bySlot[k];
        if(c.type === 'phaseHiatus'){
          // A per-phase hiatus band lives ONLY in its own column: never spans sideways, and
          // (because it occupies the slot) neighbors can't span into it either. Resolve any
          // per-band rename/recolor the user has applied, keyed by week + phase.
          const hKey = c.weekIso + '|' + c.key;
          const hTxt = (hKey in hiatusTexts) ? hiatusTexts[hKey] : c.defaultLabel;
          const hCol = hiatusColors[hKey] || HIATUS_COLOR;
          out.push({kind:'phaseHiatus', label:hTxt, color:hCol, textColor:textColorFor(hCol),
                    colspan:1, weekIso:c.weekIso, phaseKey:c.key, defaultLabel:c.defaultLabel});
          k += 1;
        } else {
          let span = 1;
          while(k+span < mc && span < spanCap && !bySlot[k+span] && freeForRun(k, k+span)){ span++; }
          out.push({kind:'phase', label:c.label, color:c.color||'#fff', textColor:c.textColor, colspan:span, cell:c, own:k});
          k += span;
        }
      } else {
        // Empty slot(s). If the next phase to the right can legally span left across this
        // empty run (each empty slot is free for that phase's whole run), let that phase
        // left-extend to absorb them -- so a lone phase fills the width even when an earlier
        // (non-overlapping) phase briefly held the column to its left. A per-phase hiatus band
        // is excluded as an absorb target so it can never widen past its own column.
        let n = k;
        while(n < mc && !bySlot[n] && n!==simSlot) n++;
        if(n < mc && bySlot[n] && bySlot[n].type!=='phaseHiatus' && freeForRunSpan(n, k, n-1)){
          // Absorb slots k..n-1 into the phase at slot n, then span it rightward as usual --
          // but never past its even share, and taking from the LEFT first so the run stays
          // flush against whatever is to its left rather than leaving a one-column island.
          let left = Math.min(n - k, Math.max(0, spanCap - 1));
          const from = n - left;
          let span = 1;
          while(n+span < mc && (left + span) < spanCap && !bySlot[n+span] && freeForRun(n, n+span)){ span++; }
          // Anything the cap stopped it taking is still empty and gets its own run.
          if(from > k) out.push({kind:'empty', colspan:from - k});
          const c = bySlot[n];
          out.push({kind:'phase', label:c.label, color:c.color||'#fff', textColor:c.textColor, colspan:left+span, cell:c, own:n});
          k = n + span;
        } else {
          // Plain empty run (merge consecutive empty non-SimPost slots).
          let span = 1;
          while(k+span < mc && !bySlot[k+span] && (k+span)!==simSlot){ span++; }
          out.push({kind:'empty', colspan:span});
          k += span;
        }
      }
    }
    out.forEach(sg=>{ if(sg.kind === 'phase') sg.nPhases = nPhases; });
    return applyCellSpanOverrides(out, mc, slotMap, week, nPhases, spanCap);
  }

  // Lay the user's hand-dragged cell spans over the automatic layout.
  //
  // A claim may only take slots the automatic layout left EMPTY in this row, so it can never
  // hide a phase, a per-phase hiatus band, or an active Simultaneous Post marker -- those keep
  // their automatic footprint and the claim stops at the first slot it cannot have. A stale
  // override (the schedule moved under it) therefore shrinks to whatever is genuinely free
  // rather than being dropped outright or, worse, swallowing a neighbour.
  function applyCellSpanOverrides(segs, mc, slotMap, week, nPhases, spanCap){
    const weekIso = isoOf(week.date);
    const claim = new Map();   // segment index -> [from, to] in slot space
    const ownOf = new Map();   // segment index -> the phase's own slot
    const startOf = [];
    let s = 0;
    segs.forEach((seg, i)=>{ startOf[i] = s; s += seg.colspan; });
    segs.forEach((seg, i)=>{
      if(seg.kind !== 'phase' || !seg.cell || seg.own === undefined) return;
      const ov = cellSpans[weekIso + '|' + seg.cell.key];
      if(!ov) return;
      // A width dragged out when the phase had the row to itself must not survive a phase moving
      // in beside it -- that is exactly the case where one cell ends up three columns wide and
      // its new neighbour one. The override records how many phases shared the row when it was
      // set; if that has changed since, it is held to the same even share the automatic layout
      // would give. Deliberately widening a cell while the overlap is on screen still wins,
      // because then the counts agree. (An override saved before this was recorded has no count
      // and is treated as stale, so old files rebalance rather than staying lopsided.)
      const cap = (ov.k === nPhases) ? mc : spanCap;
      let l = ov.l || 0, r = ov.r || 0;
      if(l + r + 1 > cap){
        // Trim the right edge first, then the left: a phase reads from its own column outward,
        // and pulling the right edge in keeps it flush with whatever sits to its left.
        r = Math.max(0, Math.min(r, cap - 1));
        l = Math.max(0, Math.min(l, cap - 1 - r));
      }
      ownOf.set(i, seg.own);
      claim.set(i, [Math.max(0, seg.own - l), Math.min(mc - 1, seg.own + r)]);
    });
    if(!claim.size) return segs;

    const taken = new Array(mc).fill(-1);
    // 1. Everything that isn't empty and isn't claiming keeps exactly what the auto layout gave it.
    segs.forEach((seg, i)=>{
      if(seg.kind === 'empty' || claim.has(i)) return;
      for(let n = startOf[i]; n < startOf[i] + seg.colspan; n++) taken[n] = i;
    });
    // 2. A claiming cell always keeps its own column (nothing else can own it -- it is the
    //    phase's slot), then 3. grows outward into free slots only, stopping at the first
    //    it cannot have so the result is always one contiguous cell.
    claim.forEach((_, i)=>{ taken[ownOf.get(i)] = i; });
    claim.forEach(([from, to], i)=>{
      const own = ownOf.get(i);
      for(let n = own - 1; n >= from; n--){ if(taken[n] !== -1) break; taken[n] = i; }
      for(let n = own + 1; n <= to;   n++){ if(taken[n] !== -1) break; taken[n] = i; }
    });

    const out = [];
    let k = 0;
    while(k < mc){
      const i = taken[k];
      let span = 1;
      while(k + span < mc && taken[k + span] === i) span++;
      out.push(i === -1 ? {kind:'empty', colspan:span}
                        : Object.assign({}, segs[i], {colspan:span}));
      k += span;
    }
    return out;
  }

  // Column widths for one schedule, in Excel column-width units, keyed by ROLE rather than by
  // absolute column index: a schedule change that alters maxConcurrent must not scramble
  // widths, and the three year-blocks are parallel views of the same structure so their Date
  // and Notes columns are linked (dragging one later should move all three).
  //
  // Consumed by renderSpreadsheetView (screen + the PDF, via <colgroup>) and by exportExcel.
  // Returns [{ date, labels:[...], notes }] -- one entry per year block.
  // How many table rows the grid actually needs.
  //
  // A table row is one row of EVERY year block at once, so the grid is as tall as the LONGEST
  // block. Years are not the same length -- 2029 has 53 Mondays because both Jan 1 and Dec 31
  // fall on one, while 2026-2028 have 52 -- so a 53-Monday year forces a final row that is
  // blank in every other block. When nothing is scheduled in that week either, the result is a
  // completely empty strip under the calendar.
  //
  // Trailing rows that are content-free in EVERY block are dropped. This deliberately does not
  // touch the full-year padding the layout is built around: a year whose work finishes in
  // September still shows its remaining weeks, because those rows carry content in some other
  // block. Only a row with nothing anywhere in it goes.
  function sheetRowCount(schedule, yearBlocks){
    let rows = Math.max(...yearBlocks.map(b=>b.count));
    const notesByIdx = schedule.notesByIdx || {};
    const hasContent = (b, r)=>{
      if(r >= b.count) return false;
      const i = b.startIdx + r;
      const w = schedule.weeks[i];
      if(!w) return false;
      if(w.cells && w.cells.length) return true;          // a phase, sim-post or hiatus band
      const wk = w.date.toISOString().slice(0,10);
      return !!effectiveNoteText(wk, autoNotesForView(notesByIdx[i], 'sheet'));
    };
    while(rows > 1 && !yearBlocks.some(b => hasContent(b, rows - 1))) rows--;
    return rows;
  }

  // Page geometry shared by the workbook and the PDF, in points.
  //
  // These live together because the orientation decision has to be made from IDENTICAL inputs in
  // both outputs. It very nearly was not: the workbook measured height as a flat rows*20px while
  // the PDF used its real per-row heights, and on a three-year calendar sitting right on the
  // 15% override boundary that 24px difference was enough to print the workbook landscape and
  // the PDF portrait. Height is deliberately the FLAT model here -- a note wrapping to a second
  // line should not be able to turn the page over.
  // Left/right and top are the workbook's Narrow preset (0.25in sides, 0.75in top), and the top
  // is load-bearing: the page header is drawn in the band between `hdr` and `t`.
  //
  // The BOTTOM is not. Excel reserves 0.75in there for a footer; this app draws none, and on a
  // landscape sheet the fit is usually height-bound, so that 54pt came straight off the size of
  // the calendar -- a near-square grid ended up 540pt wide on a 792pt page with 1.75in of white
  // down each side. Reclaiming it is the one free increase available.
  const SHEET_PAGE_MARGIN_PT = { l: 18, r: 18, t: 54, b: 18, hdr: 21.6, ftr: 0 };
  const SHEET_PAPER_PT = { portrait: { w: 612, h: 792 }, landscape: { w: 792, h: 612 } };

  function sheetGridMetrics(schedule, yearBlocks, colWidthsFor){
    const rows = sheetRowCount(schedule, yearBlocks);
    let gridW = 0;
    colWidthsFor.forEach(b => b.cols.forEach(c => { gridW += charsToScreenPx(c.chars); }));
    return { rows, gridW, gridH: (rows + 1) * ROW_DEFAULT_PX * ROW_PX_TO_PT };
  }

  // Landscape from three year-blocks, unless the other way round prints meaningfully larger --
  // the rule the Excel export has always used, now the only copy of it.
  function sheetPageOrientation(gridW, gridH, blockCount){
    const M = SHEET_PAGE_MARGIN_PT;
    const fit = p => Math.min((p.w - M.l - M.r) / gridW,
                              (p.h - M.t - M.b - M.hdr - M.ftr) / gridH);
    const portrait = fit(SHEET_PAPER_PT.portrait), landscape = fit(SHEET_PAPER_PT.landscape);
    const preferred = blockCount >= 3 ? 'landscape' : 'portrait';
    const pref  = preferred === 'landscape' ? landscape : portrait;
    const other = preferred === 'landscape' ? portrait : landscape;
    const orientation = (other > pref * 1.15)
      ? (preferred === 'landscape' ? 'portrait' : 'landscape') : preferred;
    return { orientation, portrait, landscape, preferred };
  }

  function sheetColumnWidths(schedule, yearBlocks, layout){
    const { blockSlotMaps, blockMaxConcurrent, blockOccupancy, blockSimSlot } = layout;
    const notesByIdx = schedule.notesByIdx || {};
    // Measured PER BLOCK, including the date and notes columns. They used to share one width
    // across all blocks, which meant dragging one year's Date column silently resized every
    // other year's too -- surprising, and unlike Excel, where every column is its own thing.
    const maxByBlock = [];

    yearBlocks.forEach((b, bi)=>{
      const mc = blockMaxConcurrent[bi];
      const labelMax = new Array(mc).fill(0);
      const spans = [];
      let dateMax = 0, notesMax = 0;
      for(let i=b.startIdx; i<b.startIdx+b.count; i++){
        const week = schedule.weeks[i];
        // Date cells are bold, so they measure wider than the same digits in the body font.
        dateMax = Math.max(dateMax, measureTextPx(fmtShort(week.date), true));
        if(week.cells.length && week.cells[0].type==='hiatus') continue;   // spans the block
        const rows = computePhaseRowLayout(week, mc, blockSlotMaps[bi], blockOccupancy[bi],
                                           i - b.startIdx, blockSimSlot[bi]);
        let slot = 0;
        rows.forEach(cell=>{
          // A single-slot cell charges its whole label to its own column. A SPANNED cell is
          // deferred to a second pass: charging its label to the starting column would inflate
          // that column for every other row in the block, but ignoring it entirely (as the
          // first version of this did) left a block whose every row is one lone spanning phase
          // with nothing but minimum-width columns.
          if(cell.kind==='phase' || cell.kind==='simpost'){
            const px = measureTextPx(cell.label, false);
            if(cell.colspan === 1) labelMax[slot] = Math.max(labelMax[slot], px);
            else spans.push({ slot, colspan: cell.colspan, px });
          }
          slot += cell.colspan;
        });
        const wk = week.date.toISOString().slice(0,10);
        const noteText = effectiveNoteText(wk, autoNotesForView(notesByIdx[i], 'sheet'));
        if(noteText) noteText.split('\n').forEach(line=>{
          notesMax = Math.max(notesMax, measureTextPx(line, false));
        });
      }
      // Second pass: a spanned label only needs the columns it covers to ADD UP to its width,
      // so top up the shortfall evenly rather than pushing any one column out on its own.
      spans.forEach(({slot, colspan, px})=>{
        let have = 0;
        for(let k=slot; k<slot+colspan; k++) have += labelMax[k] || 0;
        if(have < px){
          const add = (px - have) / colspan;
          for(let k=slot; k<slot+colspan; k++) labelMax[k] = (labelMax[k] || 0) + add;
        }
      });
      maxByBlock.push({ labelMax, dateMax, notesMax });
    });

    // 8.43 is Excel's default column width and what the reference export uses for its date
    // column; measured need is a little under that, so it acts as the floor.
    // A hand-dragged override wins over the measurement outright -- that is the whole point of
    // dragging -- and double-clicking the handle deletes the override to get autofit back.
    const pick = (k, auto) => (colWidths[k] !== undefined ? colWidths[k] : auto);
    return yearBlocks.map((b, bi)=>{
      const m = maxByBlock[bi];
      const kd = 'y' + b.year + ':date';
      const kn = 'y' + b.year + ':notes';
      const date  = pick(kd, clampChars(pxToChars(m.dateMax), 8.43));
      const notes = pick(kn, clampChars(pxToChars(m.notesMax), 8, COL_MAX_CHARS_NOTES));
      // Phase columns within a block are all the SAME width. Two phases running side by side
      // each get one column, and columns that differ by 15% make an even split look like a
      // mistake -- so the block's phase columns are sized together, to whatever the widest of
      // them needs. A hand-dragged width still overrides its own column outright.
      const slotAuto = clampChars(pxToChars(Math.max(0, ...m.labelMax)), 8);
      const labels = m.labelMax.map((px, s)=> pick('y' + b.year + ':s' + s, slotAuto));
      // `cols` is the flat left-to-right list the renderer and the drag handles both walk, so
      // neither has to re-derive which key belongs to which column.
      const cols = [{ key:kd, chars:date }]
        .concat(labels.map((c, s)=>({ key:'y' + b.year + ':s' + s, chars:c })))
        .concat([{ key:kn, chars:notes }]);
      return { date, labels, notes, cols };
    });
  }
  function noteColorFor(weekKey){ return noteColors[weekKey] || MILESTONE_COLOR; }
  // undefined means "auto" -- the caller falls back to fitting the text to the row's line budget.
  function noteFontSizeFor(weekKey){ return noteFontSize[weekKey]; }
  function hiatusFontSizeFor(weekKey){ return hiatusFontSize[weekKey]; }
  function hiatusTextFor(weekKey){ return (weekKey in hiatusTexts) ? hiatusTexts[weekKey] : HIATUS_DEFAULT_LABEL; }
  function hiatusColorFor(weekKey){ return hiatusColors[weekKey] || HIATUS_COLOR; }

  // True if the user has made ANY manual edit to comments/holidays/hiatus (edited text,
  // cleared a note, or changed a highlight color / hiatus label). Used to lock the union
  // country selector so a country switch can't silently drop the user's customizations.
  function hasNoteEdits(){
    return Object.keys(userNotes).length > 0
      || Object.keys(noteColors).length > 0
      || Object.keys(hiatusTexts).length > 0
      || Object.keys(hiatusColors).length > 0;
  }

  // Changing the shooting country only moves DATES when Production is actually scheduled --
  // holidays are skipped shoot days, so with no shoot there's nothing to shift. When Production
  // isn't scheduled a country switch merely swaps which (unanchored) holiday auto-notes show,
  // and every manual edit is keyed to an absolute week that doesn't move -- so it's safe to allow
  // the switch freely. We only lock the selector when a switch could genuinely misplace edits:
  // there are manual edits AND Production is scheduled (so its dates could recompute under them).
  function productionIsScheduled(){
    const startEl = document.getElementById('start-production');
    return !!(startEl && startEl.value) && showInfoStatus().complete;
  }
  function countryChangeWouldClobber(){
    return hasNoteEdits() && productionIsScheduled();
  }

  // Per-line header overrides. Keys: left, c1 (title), c2 ("Planning Calendar"),
  // Header mode: 'auto' (lines mirror the inputs, not editable) or 'manual' (a snapshot of
  // the auto values that the user can freely edit; stops auto-updating). headerManual holds
  // the seven editable lines when in manual mode.
  let headerMode = 'auto';
  let headerManual = {}; // { left, c1, c2, c3, r1, r2, r3 }
  // The month view has its own header with its own auto/manual switch. It's deliberately
  // INDEPENDENT of the waterfall header above: the two documents are printed separately and
  // often want different wording, so taking one manual never touches the other.
  let mvHeaderMode = 'auto';
  let mvHeaderManual = {}; // { title, today }

  // Compute the auto defaults for every header line from the current form inputs + schedule.
  function computeHeaderDefaults(schedule){
    const today = new Date();
    const todayStr = `${today.getMonth()+1}.${today.getDate()}.${String(today.getFullYear()).slice(2)}`;
    const showTitle = (document.getElementById('show-title').value || '').trim();
    // Carry the season as a short suffix, e.g. "Show Name S2" -- same convention as the month
    // view header, so the two documents identify the season identically.
    const seasonSel = document.getElementById('season-num');
    const seasonNum = seasonSel ? (seasonSel.value || '').trim() : '';
    const titleLine = showTitle + (seasonNum ? (showTitle ? ' ' : '') + 'S' + seasonNum : '');
    const wrStartRaw = document.getElementById('start-writersRoom') ? document.getElementById('start-writersRoom').value : '';
    let wrLine = '';
    if(wrStartRaw){
      const parsed = parseDateUTC(wrStartRaw);
      if(parsed){ const mon = mondayOf(parsed); wrLine = `Writer's Room Opens: ${mon.getUTCMonth()+1}.${mon.getUTCDate()}.${String(mon.getUTCFullYear()).slice(2)}`; }
    }
    let r1='', r2='', r3='';
    const shootDaysPerEp = parseInt((document.getElementById('shoot-days-per-ep').value||'').trim(), 10);
    if(schedule && schedule.productionInfo){
      const prodInfo = schedule.productionInfo;
      let prodWeeks = 0;
      for(const w of schedule.weeks){
        if(w.cells.some(c=>c.key==='production' || (c.label&&c.label.startsWith('Production')))) prodWeeks++;
      }
      const fmt = d => `${d.getUTCMonth()+1}.${d.getUTCDate()}.${String(d.getUTCFullYear()).slice(2)}`;
      const parts = [
        prodWeeks ? `${prodWeeks}-Week Production Span` : '',
        !isNaN(shootDaysPerEp) && shootDaysPerEp > 0 ? `${shootDaysPerEp}-Day Shooting Schedule` : '',
      ].filter(Boolean);
      r1 = parts.join(' / ');
      r2 = `Principal Photography ${fmt(prodInfo.startDate)} / Wrap: ${fmt(prodInfo.lastShootDay)}`;
    }
    const numEpisodes = parseInt((document.getElementById('num-episodes').value||'').trim(), 10);
    if(!isNaN(numEpisodes) && numEpisodes > 0) r3 = `${numEpisodes} Episodes`;
    return { left: todayStr, c1: titleLine, c2: 'Planning Calendar', c3: wrLine, r1, r2, r3 };
  }
  // Effective text for a header line: the manual value in manual mode, else the auto default.
  function headerLine(id, defaults){
    if(headerMode === 'manual') return (id in headerManual) ? headerManual[id] : (defaults[id] || '');
    return defaults[id] || '';
  }
  function update(){
    // Belt and braces around render()'s own snapshot: reflectCountryLock() and markDirty() below
    // both touch the DOM after the grid is rebuilt, and update() is what the handlers that add or
    // remove sidebar rows call once they have already changed the page height.
    const scrollSnap = captureScroll();
    const state = readState();
    currentSchedule = computeSchedule(state);
    render(currentSchedule);
    reflectCountryLock();
    // Chrome OUTPUT: the date-picker popovers (src/chrome/DatePop.jsx) mark enabled holidays and
    // all-phase hiatus weeks in their calendars -- mark, never exclude. Pushed here like every
    // other chrome surface, so the popover never reaches into the engine.
    chrome.dateContext({
      holidays: fullHolidayList(state.unionCountry)
        .filter(h => h.enabled !== false)
        .map(h => ({ iso: h.date, name: h.name })),
      hiatuses: (state.hiatuses || []).map(h => ({ start: h.start, weeks: h.weeks }))
    });
    markDirty();
    restoreScroll(scrollSnap);
  }

  // ---- Production Region (country + optional province) -------------------------------------
  // Canada's statutory holidays differ enough between provinces that one national list was wrong
  // everywhere, so the region is now a country plus -- for Canada -- a province.
  const DEFAULT_PROVINCE = 'CA-BC';
  const DEFAULT_US_AREA = 'US-GEN';
  const isCanada = v => v === 'CA' || v === 'CAN';   // 'CAN' = the pre-split saved value
  // Rewrite the legacy single-value selections saved by older files. Those stored one national list
  // per country ('US' / 'CAN'); map them onto a country + an area/province so they still resolve.
  // BC is the Canadian default because its list is the closest match to that old merged one (and
  // Vancouver is the highest-volume Canadian production centre); 'General' is the US default since
  // it covers everywhere except New York. Both are visible and changeable.
  function normalizeRegionSelection(){
    const c = document.getElementById('union-country');
    const s = document.getElementById('union-subregion');
    const u = document.getElementById('union-usregion');
    if(!c) return;
    if(c.value === 'CAN') c.value = 'CA';
    if(isCanada(c.value) && s && !HOLIDAYS[s.value]) s.value = DEFAULT_PROVINCE;
    if(c.value === 'US' && u && !HOLIDAYS[u.value]) u.value = DEFAULT_US_AREA;
    reflectRegionUI();
  }
  // The HOLIDAYS key for the current selection, or null for "None". The country alone is never a
  // key for US/Canada -- those resolve through their area/province selector.
  function effectiveRegionKey(){
    const c = (document.getElementById('union-country') || {}).value || '';
    if(!c) return null;
    if(isCanada(c)){
      const s = (document.getElementById('union-subregion') || {}).value || DEFAULT_PROVINCE;
      return HOLIDAYS[s] ? s : DEFAULT_PROVINCE;
    }
    if(c === 'US'){
      const u = (document.getElementById('union-usregion') || {}).value || DEFAULT_US_AREA;
      return HOLIDAYS[u] ? u : DEFAULT_US_AREA;
    }
    return HOLIDAYS[c] ? c : null;
  }
  // Show whichever sub-region row applies to the chosen country (UK has none).
  function reflectRegionUI(){
    const c = document.getElementById('union-country');
    if(!c) return;
    const prov = document.getElementById('union-subregion-row');
    const area = document.getElementById('union-usregion-row');
    if(prov) prov.style.display = isCanada(c.value) ? 'flex' : 'none';
    if(area) area.style.display = (c.value === 'US') ? 'flex' : 'none';
  }

  // Visually flag the region selectors as locked while note/hiatus edits exist.
  function reflectCountryLock(){
    const sel = document.getElementById('union-country');
    if(!sel) return;
    const locked = countryChangeWouldClobber();
    const tip = locked
      ? 'Locked: changing the Region recomputes Production’s dates and would misplace your comment/hiatus edits. Reset Notes & Hiatus first.'
      : '';
    // Every selector changes the holiday set, so they all get the locked treatment.
    [sel, document.getElementById('union-subregion'), document.getElementById('union-usregion')].forEach(el=>{
      if(!el) return;
      el.classList.toggle('locked', locked);
      el.title = tip;
    });
    const hint = document.getElementById('union-lock-hint');
    if(hint) hint.style.display = locked ? 'block' : 'none';
  }

  function setViewMode(mode){
    viewMode = mode;
    ['sheet','month'].forEach(m=>{
      const b = document.getElementById('view-'+m+'-btn');
      if(b) b.classList.toggle('active', m===mode);
    });
    refreshEpisodesUI();
    update();
  }

  // Episodes panel wiring. Delegated from the phase-rows container because the panel lives
  // inside the Production row, which is rebuilt by buildPhaseRows().
  (function(){
    const host = document.getElementById('phase-rows');
    if(!host) return;
    host.addEventListener('input', (e)=>{
      const row = e.target.closest('.episode-row');
      if(!row) return;
      const def = episodeDefs.find(x=>x.id === row.dataset.id);
      if(!def) return;
      // Typing in a field marks it user-owned so autofill stops managing it.
      if(e.target.classList.contains('ep-name')){ def.name = e.target.value; def.nameEdited = true; }
      if(e.target.classList.contains('ep-days')){ def.days = e.target.value; def.daysEdited = true; }
      // Episode day-counts sum into Production's shoot-day total, so this changes the whole
      // schedule -- recompute rather than just re-rendering.
      refreshDerivedInfo();
      update();
    });
    // "Start after previous phase" shortcut buttons.
    host.addEventListener('click', (e)=>{
      const btn = e.target.closest('.autostart-btn');
      if(!btn || btn.disabled) return;
      autostartPhase(btn.dataset.phase);
    });
  })();

  // Fixed chain order for the built-in phases. autostartPhase() fills a phase's start date with the
  // week right after the nearest EARLIER phase that is actually scheduled -- skipping past any
  // hiatus so the new phase begins on a working week. Custom phases are intentionally not part of
  // this chain.
  const PHASE_CHAIN = ['writersRoom','prePrep','prodPrep','production','post','localization'];
  // The scheduled phase (with a computed segment) immediately before `key` in the chain, or null.
  function prevChainSegment(key, schedule){
    const idx = PHASE_CHAIN.indexOf(key);
    if(idx <= 0) return null;
    const segs = (schedule && schedule.segments) || [];
    for(let i = idx - 1; i >= 0; i--){
      const seg = segs.find(s => s.key === PHASE_CHAIN[i]);
      if(seg) return { seg, key: PHASE_CHAIN[i] };
    }
    return null;
  }
  function autostartPhase(key){
    const prev = prevChainSegment(key, currentSchedule);
    if(!prev) return;
    // The segment's end already accounts for hiatuses INSIDE the previous phase (it delivers its
    // full week count and pushes its end out). From there, step over any weeks that fall in a
    // hiatus so the new phase lands on the first working week.
    let d = new Date(prev.seg.end.getTime());
    const hi = (currentSchedule && currentSchedule.hiatuses) || [];
    let safety = 0;
    while(hi.some(h => d >= h.start && d < h.end) && safety++ < 600){ d = addDays(d, 7); }
    const inp = document.getElementById('start-' + key);
    if(inp){ inp.value = isoOf(d); update(); }
  }

  document.getElementById('view-sheet-btn').addEventListener('click', ()=> setViewMode('sheet'));
  document.getElementById('view-month-btn').addEventListener('click', ()=> setViewMode('month'));

  // Month navigation (delegated: the grid is re-rendered on every change).
  document.getElementById('table-wrap').addEventListener('click', (e)=>{
    if(viewMode !== 'month') return;
    const prev = e.target.closest('#mv-prev');
    const next = e.target.closest('#mv-next');
    if(!prev && !next) return;
    const step = prev ? -1 : 1;
    const target = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth()+step, 1));
    // Don't page off the end of the schedule into empty months.
    const range = monthRangeForSchedule(currentSchedule);
    if(range && (target < range.first || target > range.last)) return;
    monthCursor = target;
    render(currentSchedule);
  });

  buildPhaseRows();
  refreshSimPostUI();
  addDefaultHiatuses();
  PHASES.forEach(p=>{
    document.getElementById('start-'+p.key).addEventListener('input', update);
    document.getElementById('weeks-'+p.key).addEventListener('input', update);
  });
  // Simultaneous Post lives inside the Production row, which buildPhaseRows() creates. Bind by
  // delegation rather than to the elements directly: a direct listener would be silently lost
  // if the rows were ever rebuilt, and the failure would look like the checkbox doing nothing.
  // Both 'input' and 'change' are handled -- a real checkbox click fires both, but scripted
  // interaction may raise only one.
  ['input','change'].forEach(evt=>{
    document.getElementById('phase-rows').addEventListener(evt, e=>{
      if(e.target && (e.target.id === 'simpost-enabled' || e.target.id === 'simpost-offset'
                      || e.target.id === 'simpost-count')){
        refreshSimPostUI();
        update();
      }
    });
  });
  // The offset and the numbering mode only mean something when the feature is on.
  function refreshSimPostUI(){
    const on = document.getElementById('simpost-enabled');
    if(!on) return;
    ['simpost-offset-row','simpost-count-row'].forEach(id=>{
      const row = document.getElementById(id);
      if(row) row.classList.toggle('is-off', !on.checked);
    });
  }
  // Per-phase hiatus controls (present in both the built-in and custom phase containers).
  // Delegated so it keeps working across row rebuilds; toggling the checkbox reveals the
  // start/weeks fields, and any change recomputes the schedule.
  ['input','change'].forEach(evt=>{
    ['phase-rows','custom-phase-rows'].forEach(cid=>{
      const host = document.getElementById(cid);
      if(!host) return;
      host.addEventListener(evt, e=>{
        const t = e.target;
        if(!t || !t.classList) return;
        if(t.classList.contains('phiatus-en')){
          const key = t.id.replace('phiatus-en-','');
          const f = document.getElementById('phiatus-fields-'+key);
          if(f) f.style.display = t.checked ? 'flex' : 'none';
          update();
        } else if(t.classList.contains('phiatus-start') || t.classList.contains('phiatus-weeks')){
          update();
        }
      });
    });
  });
  // Show/hide each phase-hiatus field group to match its toggle (used after restore/reset).
  function refreshPhaseHiatusUI(){
    document.querySelectorAll('.phiatus-en').forEach(cb=>{
      const key = cb.id.replace('phiatus-en-','');
      const f = document.getElementById('phiatus-fields-'+key);
      if(f) f.style.display = cb.checked ? 'flex' : 'none';
    });
  }
  // Union country is locked while any note/hiatus edit exists: switching countries would
  // recompute holidays and discard the user's edits, so we block it until they reset.
  let lastCountry = document.getElementById('union-country').value;
  let lastSubregion = (document.getElementById('union-subregion') || {}).value || '';
  let lastUsArea = (document.getElementById('union-usregion') || {}).value || '';
  // Re-baseline the guard's "last known good" region after anything that sets the selects
  // programmatically (load, restore, backup recovery) -- otherwise the next user change would be
  // compared against a stale value and could trip the lock alert spuriously.
  function syncRegionTracking(){
    normalizeRegionSelection();
    lastCountry = (document.getElementById('union-country') || {}).value || '';
    lastSubregion = (document.getElementById('union-subregion') || {}).value || '';
    lastUsArea = (document.getElementById('union-usregion') || {}).value || '';
  }
  // Country AND province both swap the holiday set, so both go through the same guard.
  ['union-country','union-subregion','union-usregion'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('change', ()=>{
      const cEl = document.getElementById('union-country');
      const sEl = document.getElementById('union-subregion');
      const uEl = document.getElementById('union-usregion');
      const changed = cEl.value !== lastCountry
                   || (sEl && sEl.value !== lastSubregion)
                   || (uEl && uEl.value !== lastUsArea);
      if(changed && countryChangeWouldClobber()){
        uiAlert('Changing the Production Region recomputes Production\u2019s dates (its shoot skips that region\u2019s holidays) and regenerates holiday notes \u2014 which would misplace the comment/hiatus edits you\u2019ve made. Click \u201cReset Notes & Hiatus\u201d above the calendar first, then change the region.');
        cEl.value = lastCountry;               // revert ALL, so they can't drift apart
        if(sEl) sEl.value = lastSubregion;
        if(uEl) uEl.value = lastUsArea;
        reflectRegionUI();
        return;
      }
      // Switching country with no valid area/province yet lands on that country's default.
      normalizeRegionSelection();
      lastCountry = cEl.value;
      lastSubregion = sEl ? sEl.value : '';
      lastUsArea = uEl ? uEl.value : '';
      update();
    });
  });
  // Per-holiday, per-view checklist. Toggling a box records an explicit override for that holiday
  // and re-renders. Display-only: it never re-runs the schedule, so the calendar math is untouched.
  (function(){
    const host = document.getElementById('holiday-vis');
    if(!host) return;
    host.addEventListener('change', e=>{
      const cb = e.target.closest('.hv-cb');
      if(!cb) return;
      const hid = cb.dataset.hid, view = cb.dataset.view;
      const cur = Object.assign({}, holidayView[hid]);
      cur[view] = cb.checked;
      holidayView[hid] = cur;
      markDirty();
      render(currentSchedule);
    });
    // Enabling/disabling a holiday changes Production's dates, so it can shift notes the user has
    // already placed. Same hazard the Region selectors guard against -- but this is one holiday and
    // trivially undone, so we warn once and let it through rather than blocking outright.
    host.addEventListener('change', async e=>{
      const cb = e.target.closest('.hv-en');
      if(!cb) return;
      const hid = cb.dataset.hid;
      if(countryChangeWouldClobber()){
        const ok = await uiConfirm('Changing which holidays apply recomputes Production’s dates, which can misplace the comment/hiatus edits you’ve made.\n\nContinue?', { title: 'Recompute the schedule?' });
        if(!ok){ cb.checked = !cb.checked; return; }   // put the box back
      }
      if(cb.checked) delete holidayOff[hid]; else holidayOff[hid] = true;
      update();   // full recompute: this moves shoot days
    });
    host.addEventListener('click', async e=>{
      const del = e.target.closest('.hv-del');
      if(del){
        const hid = del.dataset.hid;
        const h = (customHolidays || []).find(c=>c.id === hid);
        if(h && !(await uiConfirm('Remove the custom holiday “' + h.name + '”?', { title: 'Remove holiday', confirmLabel: 'Remove', danger: true }))) return;
        customHolidays = (customHolidays || []).filter(c=>c.id !== hid);
        delete holidayOff[hid];
        delete holidayView[hid];
        update();
        return;
      }
      const a = e.target.closest('.hv-bulk');
      if(!a) return;
      e.preventDefault();
      const view = a.dataset.view;
      const holidays = (currentSchedule && currentSchedule.phaseHolidays) || [];
      if(!holidays.length) return;
      if(view === 'enabled'){
        if(countryChangeWouldClobber()
           && !(await uiConfirm('Changing which holidays apply recomputes Production’s dates, which can misplace the comment/hiatus edits you’ve made.\n\nContinue?', { title: 'Recompute the schedule?' }))) return;
        const turnOn = holidays.some(h=> !holidayEnabled(h.hid));
        holidays.forEach(h=>{ if(turnOn) delete holidayOff[h.hid]; else holidayOff[h.hid] = true; });
        update();
        return;
      }
      // If any are currently off, turn them all on; otherwise turn them all off.
      const turnOn = holidays.some(h=> !holidayVisibleIn(h.hid, view));
      holidays.forEach(h=>{
        const cur = Object.assign({}, holidayView[h.hid]);
        cur[view] = turnOn;
        holidayView[h.hid] = cur;
      });
      markDirty();
      render(currentSchedule);
    });
  })();
  // Add / reset for the user's own holidays.
  (function(){
    const nameEl = document.getElementById('custom-hol-name');
    const dateEl = document.getElementById('custom-hol-date');
    const addBtn = document.getElementById('custom-hol-add');
    const errEl  = document.getElementById('custom-hol-err');
    const resetBtn = document.getElementById('holiday-reset-btn');
    function fail(msg){ if(errEl){ errEl.textContent = msg; errEl.style.display = 'block'; } }
    function clearErr(){ if(errEl) errEl.style.display = 'none'; }
    function add(){
      clearErr();
      const name = (nameEl.value || '').trim();
      const date = (dateEl.value || '').trim();
      if(!name) return fail('Give the holiday a name.');
      if(!parseDateUTC(date)) return fail('Pick a date for the holiday.');
      if((customHolidays || []).some(c=>c.date === date && c.name.toLowerCase() === name.toLowerCase()))
        return fail('You already added that one.');
      // A random id (not name+date) so renaming later keeps the holiday's on/off and note settings.
      const id = 'cst-' + Math.random().toString(36).slice(2, 9);
      customHolidays.push({id, name, date});
      nameEl.value = ''; dateEl.value = '';
      update();
    }
    if(addBtn) addBtn.addEventListener('click', add);
    // Enter in either field adds, matching the Add button.
    [nameEl, dateEl].forEach(el=>{
      if(!el) return;
      el.addEventListener('keydown', ev=>{ if(ev.key === 'Enter'){ ev.preventDefault(); add(); } });
      el.addEventListener('input', clearErr);
    });
    if(resetBtn) resetBtn.addEventListener('click', async ()=>{
      if(!(await uiConfirm('Re-enable every holiday, clear the note choices, and delete your custom holidays?\n\nThis only affects the Holidays section.', { title: 'Reset holidays', confirmLabel: 'Reset', danger: true }))) return;
      holidayOff = {};
      holidayView = {};
      customHolidays = [];
      clearErr();
      update();
    });
  })();
  document.getElementById('show-title').addEventListener('input', ()=>{ render(currentSchedule); markDirty(); });
  document.getElementById('season-num').addEventListener('change', ()=>{ refreshEpisodesUI(); update(); });
  document.getElementById('shoot-days-per-ep').addEventListener('input', ()=>{ refreshEpisodesUI(); update(); });
  document.getElementById('num-episodes').addEventListener('input', ()=>{ refreshEpisodesUI(); update(); });
  document.getElementById('add-hiatus').addEventListener('click', ()=>{ addHiatusRow('', 2); update(); });
  document.getElementById('add-phase-btn').addEventListener('click', ()=>{ addCustomPhaseRow(); update(); });
  // The actual reset. Kept separate from the button's confirm so that "New" -- which resets as
  // part of starting a blank file, and does its own prompting -- doesn't ask twice.
  function resetAll(){
    hideLegacyNotice();
    phaseColorOverride = {};
    PHASES.forEach(p=>{
      document.getElementById('start-'+p.key).value='';
      document.getElementById('weeks-'+p.key).value='';
      document.getElementById('name-'+p.key).value=p.label;
      const sw = document.getElementById('swatch-'+p.key);
      if(sw) sw.style.background = PHASE_COLOR_OPTIONS[autoPhaseColorIndex(p)].color;
    });
    // Clear every per-phase hiatus (both built-in and custom rows about to be removed).
    document.querySelectorAll('.phiatus-en').forEach(cb=>{ cb.checked = false; });
    document.querySelectorAll('.phiatus-start').forEach(el=>{ el.value = ''; });
    document.querySelectorAll('.phiatus-weeks').forEach(el=>{ el.value = '2'; });
    refreshPhaseHiatusUI();
    customPhaseDefs = [];
    document.getElementById('custom-phase-rows').innerHTML = '';
    addDefaultHiatuses();
    document.getElementById('simpost-enabled').checked = false;
    document.getElementById('simpost-offset').value = 0;
    const spCount = document.getElementById('simpost-count');
    if(spCount) spCount.checked = false; // un-numbered is the default
    refreshSimPostUI();
    document.getElementById('union-country').value = '';
    const subEl = document.getElementById('union-subregion');
    if(subEl) subEl.value = DEFAULT_PROVINCE;
    const usEl = document.getElementById('union-usregion');
    if(usEl) usEl.value = DEFAULT_US_AREA;
    reflectRegionUI();
    lastCountry = '';
    lastSubregion = subEl ? subEl.value : '';
    lastUsArea = usEl ? usEl.value : '';
    document.getElementById('show-title').value = '';
    document.getElementById('season-num').value = '';
    document.getElementById('shoot-days-per-ep').value = '';
    document.getElementById('num-episodes').value = '';
    episodeDefs = []; episodeCounter = 0;
    refreshEpisodesUI();
    headerMode = 'auto'; headerManual = {};
    mvHeaderMode = 'auto'; mvHeaderManual = {};
    Object.keys(userNotes).forEach(k=>delete userNotes[k]);
    Object.keys(dayNotes).forEach(k=>delete dayNotes[k]);
    mvExtraLanes = {};
    dayNoteColors = {};
    noteColors = {}; noteFontSize = {}; hiatusTexts = {}; hiatusColors = {};
    hiatusFontSize = {}; holidayView = {};
    holidayOff = {}; customHolidays = [];
    // Hand-dragged column widths, row heights and cell spans are layout, not notes, so "Reset
    // Notes & Hiatus" deliberately leaves them alone -- only a full Reset All clears them.
    colWidths = {}; rowHeights = {}; cellSpans = {};
    update();
  }

  document.getElementById('reset-btn').addEventListener('click', async ()=>{
    const ok = await uiConfirm(
      'Reset All will clear this calendar completely:\n\n' +
      '\u2022 every phase, date and duration\n' +
      '\u2022 Show Info, season and the episode list\n' +
      '\u2022 all notes, hiatus bands and colour edits\n' +
      '\u2022 the Production Region and header text\n\n' +
      'Any saved file on disk is left untouched \u2014 this only clears what\u2019s on screen. Continue?',
      { title: 'Reset All', confirmLabel: 'Reset everything', danger: true }
    );
    if(ok) resetAll();
  });
  // ---------- Save to File: snapshot current data into a self-contained HTML copy ----------
  // Reflect every live input/select/textarea value into its HTML attributes so that,
  // when we serialize the DOM to a string, the user's entries are baked into the markup.
  function reflectFieldsToAttributes(){
    document.querySelectorAll('input').forEach(el=>{
      if(el.type === 'checkbox' || el.type === 'radio'){
        if(el.checked) el.setAttribute('checked',''); else el.removeAttribute('checked');
      } else {
        el.setAttribute('value', el.value);
      }
    });
    document.querySelectorAll('select').forEach(sel=>{
      Array.from(sel.options).forEach(opt=>{
        if(opt.selected) opt.setAttribute('selected',''); else opt.removeAttribute('selected');
      });
    });
    document.querySelectorAll('textarea').forEach(t=>{ t.textContent = t.value; });
  }

  function buildSavedFileName(ext){
    const raw = (document.getElementById('show-title').value || '').trim() || 'Show Name';
    const d = new Date();
    const stamp = d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0');
    // strip characters that are illegal in filenames
    const safe = raw.replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim();
    return `${safe} ${stamp}${ext || SAVE_EXT}`;
  }

  function collectFieldValues(){
    // Capture values keyed by element id (for id'd fields) plus the ordered
    // list of hiatus rows (which have no ids). This is the source of truth that
    // restoreSavedState() replays after the app rebuilds its dynamic rows on load.
    const byId = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el=>{
      // The toolbar tools' own controls are transient UI, not calendar data: re-seeded from the
      // live schedule every time a popover opens. Capturing them would bake stale tool dates into
      // saved files and -- worse -- make a popover's own re-seed after an action look like a state
      // change, adding a phantom step to the undo history.
      // Matched on the CLASS, not an id: there is one popover per tool now, so an id-based test
      // silently stops matching the moment the markup is reorganised.
      if(el.closest('.tools-menu')) return;
      if(el.type === 'checkbox' || el.type === 'radio') byId[el.id] = {checked: el.checked};
      else byId[el.id] = {value: el.value};
    });
    const hiatuses = [];
    document.querySelectorAll('#hiatus-list .hiatus-entry').forEach(row=>{
      const lockEl = row.querySelector('.hiatus-locked');
      hiatuses.push({
        start: (row.querySelector('.hiatus-start')||{}).value || '',
        weeks: (row.querySelector('.hiatus-weeks')||{}).value || '',
        // Saves written before the lock existed have no `locked`; restore reads a missing value
        // as locked, matching the default for a new row.
        locked: lockEl ? !!lockEl.checked : true
      });
    });
    return {byId, hiatuses};
  }

  // The DATA format: the state snapshot as JSON and nothing else. This is what Save writes.
  // Same object the crash backup and the undo stack use, so all three can never disagree about
  // what counts as state.
  function buildSavedData(){
    // Commit any open note editor first, or its in-progress text is lost.
    if(typeof activeNoteEditor !== 'undefined' && activeNoteEditor){
      commitActiveNoteEditor();
    }
    return JSON.stringify(captureSnapshot(), null, 1);
  }

  // The SHARE format: the whole document, with current state embedded, as a self-contained and
  // double-clickable copy of the app. No longer what Save writes -- it is "Export shareable
  // copy", and the download fallback on browsers with no File System Access.
  function buildSavedHtml(){
    // 1. Commit any open note editor so its text isn't lost
    if(typeof activeNoteEditor !== 'undefined' && activeNoteEditor){
      commitActiveNoteEditor();
    }
    // 2. Reflect current field values into attributes. outerHTML serializes ATTRIBUTES, not live
    //    DOM property values, so without this every form field exports blank.
    reflectFieldsToAttributes();
    // 3. Serialize a CLONE, not the live document. The old version mutated the live #saved-state
    //    element and restored it in a finally block; cloning means the running page is never
    //    touched at all, and it gives us somewhere safe to strip things from.
    const clone = document.documentElement.cloneNode(true);
    // 4. Drop what the file doesn't need. The grid and #print-root are REGENERATED from state by
    //    refreshAfterRestore() the moment the file opens, so serializing them writes 44.5 KB
    //    (measured, 10-episode calendar) that is read by nothing and grows with the calendar.
    //    Note this empties the clone -- the live grid is never touched, which the "never touch
    //    the grid" rule in CLAUDE.md requires.
    const tw = clone.querySelector('#table-wrap'); if(tw) tw.innerHTML = '';
    const pr = clone.querySelector('#print-root'); if(pr) pr.innerHTML = '';
    //    Body-level popovers are transient UI that happens to live in <body>; a stray one would
    //    export as a panel hanging over the calendar pointing at nothing.
    // .date-pop added 29 Aug 2026 with the pop-out date pickers: the popover unmounts when
    // closed, but a Share click closes it via React state -- which commits AFTER this synchronous
    // build -- so without the strip a copy exported by that click would carry the open calendar.
    clone.querySelectorAll('.note-pop, .mv-note-pop, .phase-color-pop, .date-pop').forEach(el=>el.remove());
    // 5. Write the state in. Escape '<' as \u003c: a literal script-closing tag in any user text
    //    would otherwise terminate the state script element early and corrupt the whole file.
    //    JSON.parse treats \u003c identically to '<', so restore is unaffected.
    const stateEl = clone.querySelector('#saved-state');
    if(stateEl) stateEl.textContent = JSON.stringify(captureSnapshot()).replace(/</g, '\\u003c');
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  // Read a calendar out of a file's text, in either format. THE one place that knows how to do
  // this, so the recents list, the Open picker and any future path can never diverge on it.
  // Returns a snapshot object, or null if the text is neither format.
  //
  // The .html branch must keep working forever (CLAUDE.md): every calendar saved before v1.1.0 is
  // an .html, they are sitting on people's machines, and a file that stops opening is a
  // production plan destroyed with no other copy.
  // Returns {format:'data'|'html', snapshot:{...}} or null. The FORMAT is part of the return
  // rather than something the caller re-derives, because the caller has to act on it: opening a
  // legacy .html is the one moment we can offer to move that calendar onto the current format,
  // and a second "does this start with {" test somewhere else is a rule that would drift.
  function parseCalendarText(text){
    const trimmed = String(text || '').replace(/^\uFEFF/, '').trimStart();
    // Data format: the file IS the snapshot.
    if(trimmed.startsWith('{')){
      try { const o = JSON.parse(trimmed); return (o && typeof o === 'object') ? {format:'data', snapshot:o} : null; }
      catch(e){ return null; }
    }
    // Legacy HTML format: lift the embedded state block out of a full copy of the app.
    const m = text.match(/<script[^>]*id=["']saved-state["'][^>]*>([\s\S]*?)<\/script>/i);
    if(!m) return null;
    try { const o = JSON.parse(m[1].trim()); return (o && typeof o === 'object') ? {format:'html', snapshot:o} : null; }
    catch(e){ return null; }
  }

  // A handle to the file chosen on the first save, so later saves write back in place.
  // The handle is also persisted in IndexedDB so that when this saved file is reopened, the
  // app can reconnect to the same file on disk after a single permission click (the browser
  // requires that click for security; it won't grant write access silently on page load).
  let savedFileHandle = null;
  let handleNeedsPermission = false; // true when we have a remembered handle but not yet permission
  const supportsFsAccess = (typeof window.showSaveFilePicker === 'function');

  // ---------- The two save formats ----------
  // A calendar is DATA, not an application, and until v1.1.0 the two were the same file: Save
  // wrote document.documentElement.outerHTML -- a complete runnable copy of the app -- with the
  // state embedded in <script id="saved-state">. Measured on a 10-episode calendar, that file was
  // 729,172 bytes of which the state was 3,238 (0.44%). Open never read the other 99.56%: it lifts
  // the JSON out and replays it into the RUNNING app, so the old file's HTML/CSS/JS is never
  // parsed and never executed. 44.5 KB of it was the rendered grid, serialized out of the live DOM
  // and then regenerated from state on load and thrown away.
  //
  // So there are now two formats with two different jobs:
  //   .sptcal  -- the state JSON and nothing else (~3 KB). The default for Save/Open/autosave.
  //   .html    -- the old full self-contained copy, kept as an explicit "Export shareable copy"
  //               for emailing someone a double-clickable working app.
  // Open reads BOTH, forever (see parseCalendarText) -- every calendar saved before v1.1.0 is an
  // .html, and CLAUDE.md makes never breaking those a standing rule.
  const SAVE_EXT   = '.sptcal';
  const SAVE_MIME  = 'application/json';
  // Written into every snapshot from v1.1.0 on. Nothing branches on it yet -- it exists so a
  // future migration can ask "which app wrote this?" instead of sniffing for individual keys,
  // which is what migrateHolidayViewKeys() and normalizeRegionSelection() have had to do.
  const SNAPSHOT_VERSION = 1;
  const SAVE_TYPES = [{ description: 'Planning Calendar', accept: { [SAVE_MIME]: [SAVE_EXT] } }];
  // The Open picker takes either format. Two entries rather than one with two MIME keys so the
  // picker shows "Planning Calendar" first and the legacy type as a distinct, clearly-labelled
  // choice.
  const OPEN_TYPES = [
    { description: 'Planning Calendar', accept: { [SAVE_MIME]: [SAVE_EXT] } },
    { description: 'Planning Calendar (legacy HTML)', accept: { 'text/html': ['.html'] } },
  ];
  // True when a handle points at a legacy .html calendar. Save writes back in whatever format the
  // file already is, so opening an old calendar and hitting Save keeps it working exactly as it
  // did -- no silent format change under a file the user didn't ask us to convert.
  function handleIsLegacyHtml(h){ return !!(h && /\.html?$/i.test(h.name || '')); }

  // --- IndexedDB: a list of recent files (each { id, handle, name, savedAt }) plus a
  // pointer to the currently-active file. Reusing the File System Access handles lets the
  // app reopen, switch between, and update real files on disk. ---
  const HANDLE_DB = 'spt-planning-cal', HANDLE_STORE = 'handles';
  const RECENTS_KEY = 'recentFiles', ACTIVE_KEY = 'activeFileId', LEGACY_KEY = 'savedFile';
  function idbOpen(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(HANDLE_DB, 1);
      req.onupgradeneeded = ()=>{ req.result.createObjectStore(HANDLE_STORE); };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }
  function idbGet(key){
    return idbOpen().then(db=> new Promise((res,rej)=>{ const tx=db.transaction(HANDLE_STORE,'readonly'); const r=tx.objectStore(HANDLE_STORE).get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); })).catch(()=>undefined);
  }
  function idbSet(key, val){
    return idbOpen().then(db=> new Promise((res,rej)=>{
      const tx=db.transaction(HANDLE_STORE,'readwrite');
      const store=tx.objectStore(HANDLE_STORE);
      if(val === undefined) store.delete(key); else store.put(val, key);
      tx.oncomplete=res; tx.onerror=()=>rej(tx.error);
    })).catch(()=>{});
  }

  // In-memory model of the recent list; each entry: { id, handle, name, savedAt }.
  let recentFiles = [];
  let activeFileId = null;

  async function loadRecents(){
    let list = await idbGet(RECENTS_KEY);
    if(!Array.isArray(list)){
      list = [];
      // One-time migration: fold a legacy single-handle save into the new list.
      const legacy = await idbGet(LEGACY_KEY);
      if(legacy){ list.push({ id: 'legacy', handle: legacy, name: (legacy.name||'Saved Calendar'), savedAt: Date.now() }); }
    }
    recentFiles = list;
    activeFileId = await idbGet(ACTIVE_KEY) || null;
  }
  async function persistRecents(){
    await idbSet(RECENTS_KEY, recentFiles.map(f=>({ id:f.id, handle:f.handle, name:f.name, savedAt:f.savedAt })));
    await idbSet(ACTIVE_KEY, activeFileId);
  }
  // Add or update an entry for a handle we just saved to, and make it active.
  async function recordRecent(handle){
    const name = handle.name || buildSavedFileName();
    // De-dupe by comparing handles (isSameEntry when available).
    let existing = null;
    for(const f of recentFiles){
      if(f.handle && handle.isSameEntry){ try { if(await handle.isSameEntry(f.handle)){ existing = f; break; } } catch(e){} }
      else if(f.name === name){ existing = f; break; }
    }
    if(existing){ existing.handle = handle; existing.name = name; existing.savedAt = Date.now(); activeFileId = existing.id; }
    else {
      const id = 'f' + Date.now() + Math.random().toString(36).slice(2,6);
      recentFiles.unshift({ id, handle, name, savedAt: Date.now() });
      activeFileId = id;
    }
    // Keep the list tidy (most-recent first, cap at 12).
    recentFiles.sort((a,b)=> b.savedAt - a.savedAt);
    if(recentFiles.length > 12) recentFiles = recentFiles.slice(0,12);
    await persistRecents();
    renderRecents();
  }

  // Download fallback (browsers without the File System Access API): writes a new file.
  function downloadTextFile(text, mime, name){
    const blob = new Blob([text], {type:mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  // Smart save. First save opens a "save as" dialog (or downloads on unsupported browsers);
  // subsequent saves write back to the same file with no dialog. If we have a remembered
  // handle from a previous session, the first save re-requests write permission (one prompt).
  // Returns 'saved'|'saveas'|'download', or throws on real errors.
  async function saveToFile(){
    if(!supportsFsAccess){
      // No File System Access: the browser won't let us write a file, so a download is the only
      // route. Downloads keep the SHARE format -- without a handle there is nothing to write back
      // to, so a data file the user then can't re-link is worse than a copy that just works.
      downloadTextFile(buildSavedHtml(), 'text/html', buildSavedFileName('.html'));
      markClean();
      return 'download';
    }
    let isNew = false;
    if(!savedFileHandle){
      // FIRST SAVE ALWAYS OPENS THE PICKER. The user chooses where their calendar lives; nothing
      // in this app ever writes a file to a location they didn't pick. Autosave deliberately
      // cannot reach this path -- see startAutosave().
      isNew = true;
      savedFileHandle = await window.showSaveFilePicker({
        suggestedName: buildSavedFileName(),
        types: SAVE_TYPES,
      });
    } else if(handleNeedsPermission){
      // Reconnecting to a remembered file: ask for write permission (one click).
      const perm = await savedFileHandle.requestPermission({ mode: 'readwrite' });
      if(perm !== 'granted'){
        // Permission denied -> fall back to a fresh Save As so the user can still save.
        savedFileHandle = await window.showSaveFilePicker({
          suggestedName: buildSavedFileName(),
          types: SAVE_TYPES,
        });
        isNew = true;
      }
      handleNeedsPermission = false;
    }
    // Write back in whatever format the file already is. Opening a pre-v1.1.0 .html calendar and
    // hitting Save keeps it an .html -- we never silently convert a file the user didn't ask us
    // to convert, and their existing workflow is untouched.
    const legacy = handleIsLegacyHtml(savedFileHandle);
    const body = legacy ? buildSavedHtml() : buildSavedData();
    const writable = await savedFileHandle.createWritable();
    await writable.write(body);
    await writable.close();
    // Mark clean the moment the bytes are on disk, BEFORE the recents bookkeeping. recordRecent()
    // awaits IndexedDB, and reporting the save only after that unrelated round-trip left the
    // status line still saying "unsaved" for as long as IDB took -- measured at ~1.2s in a test
    // run, long enough for an autosave tick to fire a second, redundant write of the same bytes.
    markClean();
    await recordRecent(savedFileHandle); // add/update in the recent-files list
    return isNew ? 'saveas' : 'saved';
  }

  // ---------- Unsaved-change tracking, autosave, and crash/close recovery ----------
  // Three layers protect work in progress:
  //  1. AUTOSAVE: if a file is linked, silently write to it every AUTOSAVE_MS.
  //  2. LOCAL BACKUP: a rolling copy of the current state in IndexedDB (local to this
  //     browser, never uploaded) covering work that has no file yet -- the browser won't let
  //     us create a file without a click, so this is the safety net for unsaved calendars.
  //  3. CLOSE WARNING: the browser's generic "leave site?" prompt when changes are unsaved.
  //     (Browsers don't allow a custom Save button in that dialog, so it's a speed bump.)
  const AUTOSAVE_MS = 10 * 60 * 1000; // 10 minutes
  const BACKUP_KEY = 'unsavedBackup';
  let isDirty = false;         // changes since the last successful save
  let suppressDirty = true;    // ignore programmatic updates during load/restore
  let lastSavedAt = null;
  let autosaveTimer = null;
  let autosaveFailed = false;  // last autosave write threw (file moved/deleted, permission lost)
  // Autosave came around with unsaved work but no file to write it to. Surfaced in the status
  // line rather than acted on: only a user gesture can open the save picker (see startAutosave).
  let autosaveNeedsFile = false;

  // Single source of truth for "the current app state" as a plain-JSON-able object -- reused by
  // the save file, the local crash-recovery backup, and the undo/redo stack so all three always
  // agree on exactly what counts as state.
  function captureSnapshot(){
    return {
      version: SNAPSHOT_VERSION,
      customPhaseDefs, customPhaseCounter, phaseColorOverride, episodeDefs, episodeCounter,
      userNotes, dayNotes, mvExtraLanes, dayNoteColors, headerMode, headerManual,
      mvHeaderMode, mvHeaderManual, noteColors, noteFontSize, hiatusTexts, hiatusColors,
      hiatusFontSize, holidayView,
      holidayOff, customHolidays, viewMode, sidebarTab, colWidths, rowHeights, cellSpans,
      fields: collectFieldValues()
    };
  }

  function markDirty(){
    if(suppressDirty) return;
    isDirty = true;
    refreshSaveStatus();
    scheduleBackup();
    scheduleUndoPush();
  }
  function markClean(){
    isDirty = false;
    autosaveFailed = false;      // a successful save clears any prior autosave-failure warning
    autosaveNeedsFile = false;   // ...and so does now having somewhere to autosave to
    lastSavedAt = new Date();
    refreshSaveStatus();
    idbSet(BACKUP_KEY, undefined); // saved to a real file; drop the recovery copy
  }

  function fmtTime(d){
    let h = d.getHours(), m = String(d.getMinutes()).padStart(2,'0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if(h === 0) h = 12;
    return h + ':' + m + ' ' + ap;
  }
  // Pushes the status as DATA rather than writing it onto the node. The old version assigned
  // el.className as a WHOLE STRING, which under React wipes whatever class Mantine put there --
  // the readout would silently lose its styling the first time the status changed. `tone` is the
  // state; how each tone looks is the chrome's business. 'failed' is the one state that means
  // something is actually wrong, and it is the one the chrome gives a shape to (a Badge) rather
  // than leaving as quiet text -- UI-CONVENTIONS.md §4.
  function refreshSaveStatus(){
    if(isDirty && autosaveFailed){ chrome.saveStatus({ text: 'Autosave failed — click Save', tone: 'failed', title: 'The linked file couldn’t be written (it may have been moved, deleted, or had its permission revoked). Use Save to choose a location.' }); }
    else if(isDirty && autosaveNeedsFile){ chrome.saveStatus({ text: 'Autosave needs a file — click Save', tone: 'failed', title: 'This calendar isn’t linked to a file yet, so autosave has nowhere to write. Click Save to choose where it lives. Your work is backed up in this browser meanwhile.' }); }
    else if(isDirty){ chrome.saveStatus({ text: 'Unsaved changes', tone: 'dirty', title: '' }); }
    else if(lastSavedAt){ chrome.saveStatus({ text: 'Saved ' + fmtTime(lastSavedAt), tone: 'idle', title: '' }); }
    else { chrome.saveStatus({ text: '', tone: 'idle', title: '' }); }
  }

  // Rolling local backup (debounced so typing doesn't hammer IndexedDB).
  let backupTimer = null;
  function scheduleBackup(){
    clearTimeout(backupTimer);
    backupTimer = setTimeout(writeBackup, 3000);
  }
  function writeBackup(){
    try {
      idbSet(BACKUP_KEY, { state: captureSnapshot(), at: Date.now(), fileName: (savedFileHandle && savedFileHandle.name) || null });
    } catch(e){ /* non-fatal */ }
  }

  // ---------- Undo / redo ----------
  // Whole-state snapshots -- the same shape captureSnapshot() also feeds to Save and the crash-
  // recovery backup -- so applying one just re-runs the save file's own restore path
  // (applyStateSnapshot). Pushes are coalesced rather than per-keystroke: markDirty() already
  // fires on every edit, including once per keystroke in text/number fields, so the push itself
  // is debounced -- a burst of typing collapses into one undo step, taken once typing pauses.
  // Stack entries are kept as JSON strings (not live objects) so a later in-place mutation of
  // e.g. userNotes can never retroactively corrupt an already-pushed step.
  const UNDO_LIMIT = 100;
  const UNDO_DEBOUNCE_MS = 500;
  let undoStack = [];                // snapshots older than the current state, oldest first
  let redoStack = [];                // snapshots newer than the current state, oldest first
  let lastPushedSnapshotJSON = null; // JSON of the current state as of the last push (the "baseline")
  let applyingUndoRedo = false;      // true while restoring a snapshot, so restoring doesn't itself push a step
  let undoPushTimer = null;

  function pushUndoSnapshot(){
    if(applyingUndoRedo || suppressDirty) return;
    const json = JSON.stringify(captureSnapshot());
    if(json === lastPushedSnapshotJSON) return; // nothing actually changed
    if(lastPushedSnapshotJSON !== null){
      undoStack.push(lastPushedSnapshotJSON);
      if(undoStack.length > UNDO_LIMIT) undoStack.shift();
    }
    lastPushedSnapshotJSON = json;
    redoStack = []; // a fresh edit invalidates any redo history
    refreshUndoRedoUI();
  }
  function scheduleUndoPush(){
    clearTimeout(undoPushTimer);
    undoPushTimer = setTimeout(pushUndoSnapshot, UNDO_DEBOUNCE_MS);
  }
  // Discards all undo/redo history and re-baselines on the current state. Called whenever a
  // different document replaces what's on screen (New, Open, a recent file, backup recovery, or
  // the initial page load) -- undoing "past" the start of a different calendar makes no sense.
  function resetUndoHistory(){
    undoStack = [];
    redoStack = [];
    clearTimeout(undoPushTimer);
    lastPushedSnapshotJSON = JSON.stringify(captureSnapshot());
    refreshUndoRedoUI();
  }
  function applySnapshotJSON(json){
    applyingUndoRedo = true;
    suppressDirty = true;
    applyStateSnapshot(JSON.parse(json));
    // refreshAfterRestore(), not a bare update(): undo/redo is applying a snapshot, so it needs
    // the same post-restore UI refresh that loading a file does. With only update() here, an undo
    // that changed the episode count put the field back but left the old episode rows on screen.
    refreshAfterRestore();
    suppressDirty = false;
    applyingUndoRedo = false;
    lastPushedSnapshotJSON = json;
    markDirty(); // the restored state differs from what's on disk
    refreshUndoRedoUI();
  }
  function undo(){
    clearTimeout(undoPushTimer);
    pushUndoSnapshot(); // flush any pending (debounced) edit as its own step before undoing it
    if(!undoStack.length) return;
    redoStack.push(lastPushedSnapshotJSON);
    applySnapshotJSON(undoStack.pop());
  }
  function redo(){
    if(!redoStack.length) return;
    undoStack.push(lastPushedSnapshotJSON);
    applySnapshotJSON(redoStack.pop());
  }
  function refreshUndoRedoUI(){
    // Pushed, not written. Mantine styles disabled state from [data-disabled] alone -- there is no
    // :disabled rule in its CSS -- so setting the native property here would disable the buttons
    // functionally and leave them looking enabled.
    chrome.undoRedo({ undo: !undoStack.length, redo: !redoStack.length });
  }

  // ---------- Calendar shift tools ----------
  // Move the whole plan earlier or later in whole weeks. The dates are the easy half: everything
  // the user has typed ONTO those weeks is keyed by the week's Monday (or by an exact day), so a
  // shift that moved only the start dates would leave every note behind on the old calendar date,
  // silently detached from the phase it was written for. So the same delta is applied to the
  // week-keyed stores too, by rebuilding each map under its new keys.
  //
  // What deliberately does NOT move:
  //  * Holidays -- they're real calendar dates, not part of the plan. Because Production is a
  //    day-level simulation that steps over them, shifting by exactly 7 days can move its WRAP by
  //    more or less than 7: sliding into or out of a week containing a holiday adds or removes a
  //    shoot day. That's correct, and shiftCalendar() reports the resulting wrap so it isn't a
  //    surprise.
  //  * All-phase hiatuses that are locked (the default) -- a winter break belongs to Christmas.
  //    Unlocked ones travel. Per-phase hiatuses always travel: they belong to their phase's work.
  //  * Notes carrying a specific date -- a note pinned to a day is about that day (a holiday, a
  //    network screening), so it keeps both its day and its week. Month-view day notes are
  //    day-addressed by nature and stay put for the same reason, along with their extra lanes.
  const MAX_SHIFT_WEEKS = 520; // ~10 years; a typo'd week count shouldn't fling the calendar away

  function shiftDateFieldValue(el, days){
    if(!el || !el.value) return false;      // an empty date field has nothing to shift
    const d = parseDateUTC(el.value);
    if(!d) return false;                    // unparseable (mid-typing, bad year) -- leave alone
    el.value = isoOf(addDays(d, days));
    return true;
  }
  // Rebuild a week/day-keyed map under shifted keys. `keep(key)` returns true for entries that
  // must stay on their original key. Built fresh rather than mutated in place so a shift can never
  // collide with a key it is about to write.
  //
  // Split a cell key into its week and any "|<phase key>" suffix. Note cells key off a plain week
  // ISO; per-phase hiatus bands key off "<week>|<phase>". parseDateUTC() on the whole composite key
  // does NOT return null -- str.split('-') leaves "05|writersRoom" for the day, so it builds an
  // Invalid Date, which is truthy. That made a shift push the key onto the moving list and then
  // throw RangeError inside isoOf(). Renaming any per-phase hiatus band was enough to crash a
  // shift half-way through, after the dates were written but before the UI refreshed.
  function splitWeekKey(k){
    const bar = String(k).indexOf('|');
    return bar < 0 ? { iso: k, suffix: '' } : { iso: k.slice(0, bar), suffix: k.slice(bar) };
  }
  //
  // Staying entries claim their keys FIRST. A moving entry can land on a week a pinned entry is
  // still sitting on (shift a plain note one week forward onto the week of a date-pinned one), and
  // whichever was written second would otherwise silently delete the other. So arrivals merge --
  // or, with no merge function, yield to the entry already there. A shift must never lose text.
  function shiftKeyedMap(map, days, keep, merge){
    const out = {}, moving = [];
    Object.keys(map).forEach(k=>{
      const v = map[k];
      // A key is either a plain week ISO or "<week ISO>|<phase key>" -- the per-phase hiatus bands
      // are addressed that way, so hiatusTexts/hiatusColors hold both shapes. Shift the date part
      // and reattach the suffix: a per-phase band travels with its phase, so its custom label and
      // colour must travel too.
      const { iso, suffix } = splitWeekKey(k);
      const d = parseDateUTC(iso);
      if(!d || (keep && keep(k))) out[k] = v;         // unparseable keys stay put too
      else moving.push([isoOf(addDays(d, days)) + suffix, v]);
    });
    moving.forEach(([k, v])=>{
      if(!(k in out)) out[k] = v;
      else if(merge) out[k] = merge(out[k], v);
    });
    return out;
  }
  // Text of a stored note value, across every shape the store has used.
  function noteValueText(v){
    if(v === undefined || v === null) return '';
    if(typeof v === 'string') return v;
    if(Array.isArray(v.notes)) return v.notes.map(n=>(n && n.text) || '').filter(Boolean).join('\n');
    return v.text || '';
  }
  // Two notes have ended up on one week. A waterfall cell holds one block of text and at most one
  // day pin, so the texts join and the staying note keeps the pin -- it is the one that owns a day.
  function mergeNoteValues(stay, incoming){
    const text = [noteValueText(stay), noteValueText(incoming)].filter(Boolean).join('\n');
    const date = (stay && typeof stay === 'object' && stay.date) ? stay.date : null;
    return date ? {text, date} : {text};
  }

  // Shift by `weeks` (negative = earlier). With `fromIso` set, only the part of the calendar on or
  // after that week moves -- that's the ripple case ("prep slipped, push the shoot and everything
  // after it"); everything earlier stays exactly where it is. Returns a short summary for the
  // caller to show, or null if there was nothing to shift.
  function shiftCalendar(weeks, fromIso){
    const n = Math.round(Number(weeks) || 0);
    if(!n || Math.abs(n) > MAX_SHIFT_WEEKS) return null;
    const days = n * 7;
    const fromDate = fromIso ? mondayOf(parseDateUTC(fromIso)) : null;
    // Whole-calendar shift -> everything is in range. Takes a cell key, which may carry a
    // "|<phase key>" suffix, so it compares on the week part only.
    const inRange = key => {
      if(!fromDate) return true;
      const d = parseDateUTC(splitWeekKey(key).iso);
      return !!d && mondayOf(d) >= fromDate;
    };

    // 1. Phase start dates -- built-ins and custom phases alike.
    let movedPhases = 0;
    // Phases that stayed put. Their per-phase hiatus band stayed with them, so its label and
    // colour -- keyed "<week ISO>|<phase key>" -- must stay too. See step 3.
    const stayingPhases = new Set();
    getAllPhaseDefs().forEach(p=>{
      const startEl = document.getElementById('start-' + p.key);
      // A phase moves as a unit: its own hiatus is part of its work, so it travels with the phase
      // rather than being judged against the cutoff separately.
      if(!startEl || !startEl.value || !inRange(startEl.value)){ stayingPhases.add(p.key); return; }
      if(shiftDateFieldValue(startEl, days)) movedPhases++;
      shiftDateFieldValue(document.getElementById('phiatus-start-' + p.key), days);
    });

    // 2. All-phase hiatuses -- only the ones the user has unlocked.
    let movedHiatuses = 0, lockedHiatuses = 0;
    // Every week still occupied by a band that did NOT move -- because it is locked, or (on a
    // ripple) starts before the cutoff. Collected from the pre-shift dates, which is automatic:
    // a row is recorded on exactly the paths that return before touching its start field.
    const stayingHiatusWeeks = new Set();
    const recordStayingWeeks = row=>{
      const startEl = row.querySelector('.hiatus-start');
      const d = startEl && startEl.value && mondayOf(parseDateUTC(startEl.value));
      if(!d) return;
      const wks = Math.max(1, parseInt((row.querySelector('.hiatus-weeks')||{}).value, 10) || 1);
      for(let i=0;i<wks;i++) stayingHiatusWeeks.add(isoOf(addDays(d, i*7)));
    };
    document.querySelectorAll('#hiatus-list .hiatus-entry').forEach(row=>{
      const startEl = row.querySelector('.hiatus-start');
      if(!startEl || !startEl.value || !inRange(startEl.value)){ recordStayingWeeks(row); return; }
      const lock = row.querySelector('.hiatus-locked');
      if(lock && lock.checked){ lockedHiatuses++; recordStayingWeeks(row); return; }
      if(shiftDateFieldValue(startEl, days)) movedHiatuses++;
    });

    // 3. Week-keyed stores. Which weeks are pinned has to be worked out BEFORE anything moves:
    //    a note's colour keys off the same week as the note, so it must make the same stay-or-go
    //    decision -- and by the time the colours are shifted, userNotes has already been rewritten.
    const pinnedWeeks = new Set(Object.keys(userNotes).filter(k => userNoteList(k).some(n => !!n.date)));
    // A note stays put if it is date-pinned OR (for a ripple) sits before the cutoff.
    const isPinnedWeek = k => pinnedWeeks.has(k) || !inRange(k);
    // userNotes is declared const and mutated in place elsewhere, so it's cleared and repopulated
    // rather than reassigned.
    const shiftedNotes = shiftKeyedMap(userNotes, days, isPinnedWeek, mergeNoteValues);
    Object.keys(userNotes).forEach(k=> delete userNotes[k]);
    Object.assign(userNotes, shiftedNotes);
    // No merge for colours: a cell has one fill, and the note that stayed owns it.
    noteColors  = shiftKeyedMap(noteColors, days, isPinnedWeek);
    noteFontSize = shiftKeyedMap(noteFontSize, days, isPinnedWeek);
    // A band's label, colour and text size have to make the SAME stay-or-go decision the band
    // made in steps 1-2, or they walk off it: a locked band would revert to the default red
    // "Holiday Hiatus" while "Christmas Break" ended up on a week with no band at all. Note this
    // is deliberately not isPinnedWeek -- that guard is about date-pinned notes, a different rule.
    const hiatusKeyStays = k => {
      const { iso, suffix } = splitWeekKey(k);
      return suffix ? stayingPhases.has(suffix.slice(1)) : stayingHiatusWeeks.has(iso);
    };
    hiatusTexts = shiftKeyedMap(hiatusTexts, days, hiatusKeyStays);
    hiatusColors = shiftKeyedMap(hiatusColors, days, hiatusKeyStays);
    hiatusFontSize = shiftKeyedMap(hiatusFontSize, days, hiatusKeyStays);
    // A hand-set cell span is keyed '<week>|<phase key>' and belongs to its phase, so it makes
    // the same journey a per-phase hiatus band does: it moves when its phase moves, stays when
    // the phase stays put on a ripple.
    cellSpans = shiftKeyedMap(cellSpans, days, hiatusKeyStays);
    // dayNotes / dayNoteColors / mvExtraLanes are day-addressed month-view content and stay put.

    refreshSnapNotes();      // the "Snapped to Mon ..." hints under every date field are now stale
    // Keep the month view looking at the same content instead of an emptied month. Null until the
    // month view has been opened once, in which case it picks its own start and needs no nudge.
    if(monthCursor) monthCursor = addDays(monthCursor, days);
    refreshAfterRestore();

    return {
      weeks: n, movedPhases, movedHiatuses, lockedHiatuses,
      productionWrap: productionWrapText()
    };
  }
  // The Production wrap date after a shift, for the toolbar's readout -- the one value a shift can
  // move by something other than the requested amount (holidays don't move with the plan).
  function productionWrapText(){
    const info = currentSchedule && currentSchedule.productionInfo;
    return (info && info.lastShootDay) ? fmtShort(info.lastShootDay) : null;
  }

  // ---------- Anchoring: shift so that some landmark lands on a chosen date ----------
  // Both anchors work by measuring the whole-week gap between where the landmark is now and where
  // the user wants it, then handing that delta to the ordinary shift. Everything is Monday-snapped
  // first, so a target typed mid-week means "the week containing that date" rather than failing.
  function weeksBetweenMondays(fromDate, toDate){
    return Math.round((mondayOf(toDate) - mondayOf(fromDate)) / DAY_MS / 7);
  }
  // A deadline is one-sided: "deliver by the 5th" must not land on the 11th just because the 11th
  // is the end of the week the 5th falls in. So this floors instead of rounding to the nearest
  // week -- the schedule finishes on or before the date asked for, never after it.
  function weeksToFinishBy(lastDay, target){
    return Math.floor((target - lastDay) / DAY_MS / 7);
  }
  // The last day any phase is still running -- segment ends are exclusive (a phase's end IS the
  // following phase's start), so the final working day is the day before the latest end.
  function scheduleLastDay(){
    const segs = (currentSchedule && currentSchedule.segments) || [];
    if(!segs.length) return null;
    let last = null;
    segs.forEach(s=>{ if(!last || s.end > last) last = s.end; });
    return last ? addDays(last, -1) : null;
  }
  function phaseStartDate(key){
    const el = document.getElementById('start-' + key);
    return (el && el.value) ? parseDateUTC(el.value) : null;
  }

  // ---------- Rebuild From: rebuild one side of a fixed date, back to back ----------
  // "Anchor" moves the plan without reshaping it. This reshapes it: it pins one date and recomputes
  // the phases on one side so they run consecutively, WRITING start dates -- including into fields
  // left blank, which is what lets it answer "the shoot starts 6/22, so when does the room open?"
  // from durations alone.

  // The order the phases run in, for rebuilding purposes. Built-ins keep their canonical chain
  // order: that's the app's own model of the sequence and what the per-phase "Start after previous
  // phase" button already follows, and it works even when no dates have been entered yet. A custom
  // phase has no place in that chain, so it's slotted by the date it currently sits on; an undated
  // custom phase has nothing to position it, so it goes last, where it is at least predictable.
  function phaseSequence(){
    const defs = getAllPhaseDefs();
    const byKey = {};
    defs.forEach(p=>{ byKey[p.key] = p; });
    const seq = PHASE_CHAIN.filter(k=>byKey[k]).map(k=>byKey[k]);
    const customs = defs.filter(p=>PHASE_CHAIN.indexOf(p.key) === -1);
    customs.forEach(p=>{
      const d = phaseStartDate(p.key);
      if(!d){ seq.push(p); return; }
      // Insert before the first phase in the sequence that currently starts later than this one.
      let at = seq.length;
      for(let i = 0; i < seq.length; i++){
        const other = phaseStartDate(seq[i].key);
        if(other && other > d){ at = i; break; }
      }
      seq.splice(at, 0, p);
    });
    return seq;
  }

  // ---------- Inverting Production ----------
  // Production has no week count to subtract: its span is a day-level walk that skips weekends,
  // hiatus days and every enabled union holiday until the shoot-day count is met, so the same
  // shoot can occupy a different number of weeks depending on WHERE it lands. Rather than
  // reimplement that walk in reverse -- which would be a second copy of the rule, free to drift --
  // this asks the real scheduler: try a start, read the end it produces, and search for the fit.
  //
  // computeSchedule() is called directly rather than through update(), so nothing re-renders during
  // the search. The field is put back immediately, so a failed search leaves no trace.
  function productionEndFor(startIso){
    const el = document.getElementById('start-production');
    if(!el) return null;
    const prev = el.value;
    el.value = startIso;
    let end = null;
    try {
      const sch = computeSchedule(readState());
      const seg = (sch.segments || []).find(s=>s.key === 'production');
      if(seg) end = seg.end;
    } catch(e){ /* treat an unschedulable candidate as "doesn't fit" */ }
    el.value = prev;
    return end;
  }
  // The latest Monday on which the shoot can start and still be finished by `cursor`.
  //
  // Searched from the latest candidate BACKWARD, and deliberately not by stepping forward until it
  // stops fitting: a later start is not always a later finish. A shoot beginning just before a long
  // hiatus is pushed out by it, while one beginning a week later starts after it and can finish
  // sooner -- so a forward scan can stop at a local fit and miss the real answer. Walking back from
  // cursor returns the largest valid start on the first hit, whatever the hiatuses do.
  function productionStartEndingBy(cursor){
    let s = addDays(mondayOf(cursor), -7);   // must occupy at least one week
    let safety = 0;
    while(safety++ < 300){
      const end = productionEndFor(isoOf(s));
      if(end && end <= cursor) return s;
      s = addDays(s, -7);
    }
    return null;
  }

  // How many calendar-eligible weeks a phase needs. Production returns null -- it has no week count
  // and is placed by productionStartEndingBy() instead.
  function phaseWeeksFor(p){
    if(p.key === 'production') return null;
    const el = document.getElementById('weeks-' + p.key);
    const raw = el ? parseInt(el.value, 10) : NaN;
    if(!(raw > 0)) return null;
    const w = rawInputToWeeks(p, raw);
    return (w > 0) ? w : null;
  }

  // Hiatus ranges as computeSchedule builds them, but readable from outside it: the global list off
  // the last computed schedule, and the per-phase ones straight from their fields (a phase with no
  // start date yet has no segment to read them from).
  function hiatusRangesForSolve(){
    const global = ((currentSchedule && currentSchedule.hiatuses) || []).slice();
    const own = {};
    getAllPhaseDefs().forEach(p=>{
      const en = document.getElementById('phiatus-en-' + p.key);
      if(en && !en.checked) return;
      const sEl = document.getElementById('phiatus-start-' + p.key);
      const wEl = document.getElementById('phiatus-weeks-' + p.key);
      const pd = sEl ? parseDateUTC(sEl.value) : null;
      const wk = wEl ? parseInt(wEl.value, 10) : NaN;
      if(!pd || !(wk > 0)) return;
      const start = mondayOf(pd);
      own[p.key] = {start, end: addDays(start, wk * 7)};
    });
    return {global, own};
  }

  // The exact inverse of extendEndForHiatus(): walk BACK from an exclusive end, counting only weeks
  // that aren't paused, until the phase has its full span. A phase straddling a hiatus therefore
  // starts earlier rather than losing weeks -- the same guarantee, solved from the other end.
  function startForWeeksEndingAt(endExclusive, weeks, phaseKey, ranges){
    const ownHi = phaseKey ? ranges.own[phaseKey] : null;
    let delivered = 0, cur = endExclusive, safety = 0;
    while(delivered < weeks && safety++ < 2000){
      cur = addDays(cur, -7);
      const paused = ranges.global.some(h => cur >= h.start && cur < h.end)
                  || (ownHi && cur >= ownHi.start && cur < ownHi.end);
      if(!paused) delivered++;
    }
    return cur;
  }

  // Pin `key` to `targetIso` and rebuild every phase BEFORE it so they run consecutively, ending
  // where the next one begins. Returns a summary, or {error} describing why it stopped.
  function workBackwardsFrom(key, targetIso){
    const target = parseDateUTC(targetIso);
    if(!target) return {error:'Pick a date first.'};
    const seq = phaseSequence();
    const at = seq.findIndex(p=>p.key === key);
    if(at < 0) return {error:'That phase isn’t in the schedule.'};
    if(at === 0) return {error:'Nothing runs before that phase.'};

    const predecessors = seq.slice(0, at).reverse();  // nearest-first, walking backwards
    const ranges = hiatusRangesForSolve();
    const anchorMonday = mondayOf(target);
    const written = [];
    const skipped = [];
    let cursor = anchorMonday;   // the date the phase being placed must END on (exclusive)
    predecessors.forEach(p=>{
      const el = document.getElementById('start-' + p.key);
      if(!el) return;
      let start;
      if(p.key === 'production'){
        // The shoot is placed by searching the real simulation, not by subtracting weeks -- it has
        // no week count, and how many weeks it occupies depends on the holidays it lands on.
        if(!showInfoStatus().complete){ skipped.push(p.label || p.key); return; }
        start = productionStartEndingBy(cursor);
        if(!start){ skipped.push(p.label || p.key); return; }
      } else {
        const weeks = phaseWeeksFor(p);
        if(!weeks){ skipped.push(p.label || p.key); return; }
        start = startForWeeksEndingAt(cursor, weeks, p.key, ranges);
      }
      // Keep the previous date: on a calendar that is already fully dated this tool OVERWRITES
      // rather than fills, and absorbing several weeks of deliberate slack would otherwise be an
      // invisible side effect of pinning one date.
      const prevIso = el.value;
      el.value = isoOf(start);
      written.push({label: p.label || p.key, start, wasBlank: !prevIso, prevIso});
      cursor = start;   // the next phase back must end where this one begins
    });

    const anchorEl = document.getElementById('start-' + key);
    if(anchorEl) anchorEl.value = isoOf(anchorMonday);
    return {written, skipped, anchor: anchorMonday};
  }

  // Pin `key` to `targetIso` and rebuild every phase AFTER it, each starting where the previous one
  // ends. Unlike the backward pass this leans on the live scheduler rather than its own arithmetic:
  // it writes a start, recomputes, and reads the real segment end before placing the next phase --
  // so Production's day-level shoot simulation is honoured for free, and a forward solve can never
  // disagree with the dates the calendar is showing.
  function workForwardsFrom(key, targetIso){
    const target = parseDateUTC(targetIso);
    if(!target) return {error:'Pick a date first.'};
    const seq = phaseSequence();
    const at = seq.findIndex(p=>p.key === key);
    if(at < 0) return {error:'That phase isn’t in the schedule.'};
    if(at === seq.length - 1) return {error:'Nothing runs after that phase.'};

    const anchorEl = document.getElementById('start-' + key);
    if(!anchorEl) return {error:'That phase has no start field.'};
    anchorEl.value = isoOf(mondayOf(target));
    update();   // so the anchor's own computed end is available to place the next phase

    const written = [], skipped = [];
    // The phase each new one hands off from is the last one actually PLACED, not the previous entry
    // in the sequence. Those differ whenever a phase is skipped for having no week count: chaining
    // off the sequence position instead meant one unused phase in the middle broke the handoff for
    // every phase after it, and they were all reported skipped.
    let prevKey = key;
    seq.slice(at + 1).forEach(p=>{
      const el = document.getElementById('start-' + p.key);
      if(!el) return;
      // A phase with no span isn't in use -- skip it and keep chaining from the last placed one.
      // Production is the exception: its span comes from Show Info, not a week count.
      if(p.key === 'production' ? !showInfoStatus().complete : !phaseWeeksFor(p)){
        skipped.push(p.label || p.key);
        return;
      }
      const prevSeg = ((currentSchedule && currentSchedule.segments) || []).find(s=>s.key === prevKey);
      if(!prevSeg){ skipped.push(p.label || p.key); return; }
      // A phase can't begin on a week the whole production is paused, so step over any hiatus the
      // handoff lands in -- the same rule the per-phase "Start after previous phase" button uses.
      let d = new Date(prevSeg.end.getTime());
      const hi = (currentSchedule && currentSchedule.hiatuses) || [];
      let safety = 0;
      while(hi.some(h => d >= h.start && d < h.end) && safety++ < 600){ d = addDays(d, 7); }
      const prevIso = el.value;   // see the note in workBackwardsFrom: overwrites must be visible
      el.value = isoOf(d);
      written.push({label: p.label || p.key, start: d, wasBlank: !prevIso, prevIso});
      prevKey = p.key;
      update();   // recompute so the NEXT phase reads this one's real end
    });
    return {written, skipped, anchor: mondayOf(target)};
  }

  // ---------- Close all gaps ----------
  // Re-chain the built-in phases back to back, which is the per-phase "Start after previous phase"
  // button applied down the whole chain. Only phases that are ALREADY scheduled are touched --
  // this tidies an existing plan, it doesn't invent start dates for phases left blank. Custom
  // phases stay out of it, matching autostartPhase()'s own rule.
  function closeAllGaps(){
    let moved = 0, seenFirst = false;
    PHASE_CHAIN.forEach(key=>{
      const before = phaseStartDate(key);
      if(!before) return;              // not scheduled -> leave it alone
      if(!seenFirst){ seenFirst = true; return; }  // the chain's first phase is the anchor
      autostartPhase(key);             // runs its own update(), so currentSchedule stays fresh
      const after = phaseStartDate(key);
      if(after && before && after.getTime() !== before.getTime()) moved++;
    });
    return moved;
  }

  // Autosave: only meaningful when a file is already linked (we can't create one silently).
  function startAutosave(){
    clearInterval(autosaveTimer);
    autosaveTimer = setInterval(async ()=>{
      if(!isDirty) return;
      // NO LINKED FILE: autosave cannot silently invent one. showSaveFilePicker() requires a user
      // gesture -- calling it from a timer throws NotAllowedError -- and even if it didn't,
      // writing someone's calendar to a location they never chose is exactly the behaviour the
      // first-save picker exists to prevent. So flag it instead: the status line asks for a Save
      // click, and that click takes the normal saveToFile() path, which opens the picker. Work is
      // not at risk meanwhile -- writeBackup() has been keeping a rolling copy in IndexedDB since
      // three seconds after the first edit.
      if(!savedFileHandle){
        if(!autosaveNeedsFile){ autosaveNeedsFile = true; refreshSaveStatus(); }
        return;
      }
      if(handleNeedsPermission) return;
      try {
        const body = handleIsLegacyHtml(savedFileHandle) ? buildSavedHtml() : buildSavedData();
        const writable = await savedFileHandle.createWritable();
        await writable.write(body);
        await writable.close();
        markClean();
      } catch(e){
        // Permission lost or file moved/deleted: stay dirty AND flag it, so the user isn't
        // lulled into thinking autosave still protects their work. The warning persists (through
        // further edits) until a manual Save succeeds. console for diagnostics.
        console.warn('Autosave failed:', e);
        autosaveFailed = true;
        refreshSaveStatus();
      }
    }, AUTOSAVE_MS);
  }

  // Warn before closing/reloading with unsaved changes. Browsers show their own generic
  // message here; a custom prompt with a Save button isn't permitted.
  window.addEventListener('beforeunload', (e)=>{
    if(!isDirty) return;
    writeBackup(); // last-chance recovery copy
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  // Offer to restore a backup if the last session ended with unsaved work.
  async function offerBackupRecovery(){
    const b = await idbGet(BACKUP_KEY);
    if(!b || !b.state) return;
    const when = new Date(b.at);
    const which = b.fileName ? ('"' + b.fileName + '"') : 'an unsaved calendar';
    if(!(await uiConfirm('Recover unsaved work from ' + which + ' (' + fmtTime(when) + ')?', { title: 'Recover unsaved work', confirmLabel: 'Recover' }))){
      // Keep the backup rather than deleting it on a single "No" -- an accidental decline
      // shouldn't be irreversible. It's cleared on the next successful Save (markClean) or
      // explicit New (newFile), and overwritten as soon as the user makes an edit (scheduleBackup).
      return;
    }
    const el = document.getElementById('saved-state');
    if(!el) return;
    suppressDirty = true;
    el.textContent = JSON.stringify(b.state).replace(/</g, '\\u003c');
    restoreSavedState();
    refreshAfterRestore();
    suppressDirty = false;
    resetUndoHistory(); // recovered work is a fresh baseline, not something to undo "past"
    isDirty = true;          // recovered work still isn't in a file
    refreshSaveStatus();
  }
  // "Save As…" — always pick a NEW file and write the current calendar to it, then make that
  // new file the active one. This duplicates the current calendar (fork it to try a variation);
  // distinct from "New", which clears the calendar and starts blank.
  async function saveAsFile(){
    if(!supportsFsAccess){
      downloadTextFile(buildSavedHtml(), 'text/html', buildSavedFileName('.html'));
      return 'download';
    }
    const handle = await window.showSaveFilePicker({
      suggestedName: buildSavedFileName(),
      types: SAVE_TYPES,
    });
    // Save As always produces the current format, even when forking a legacy .html calendar --
    // the user is naming a new file here, so there is no existing format to preserve.
    const writable = await handle.createWritable();
    await writable.write(handleIsLegacyHtml(handle) ? buildSavedHtml() : buildSavedData());
    await writable.close();
    savedFileHandle = handle;
    handleNeedsPermission = false;
    markClean();                 // bytes are on disk -- report it before the IDB bookkeeping
    await recordRecent(handle);
    refreshSaveBtn();
    return 'saveas';
  }

  // ---------- The "this is an old-format file" notice ----------
  // Raised by openRecentFile() when parseCalendarText() reports it read a legacy .html, cleared by
  // anything that means the calendar on screen is no longer that file.
  function showLegacyNotice(fileName){
    const el = document.getElementById('legacy-notice');
    if(!el) return;
    const name = (fileName || 'That calendar').replace(/\.html?$/i,'');
    el.querySelector('.ln-text').innerHTML =
      '<strong>' + escHtml(name) + '</strong> is an older <strong>.html</strong> calendar. ' +
      'It opened fine and always will \u2014 but it carries a whole copy of an old build of the app ' +
      'around ~3 KB of plan. Saving it as <strong>.sptcal</strong> keeps only the plan, and it will ' +
      'then always open in the current app.';
    el.hidden = false;
  }
  function hideLegacyNotice(){
    const el = document.getElementById('legacy-notice');
    if(el) el.hidden = true;
  }
  (function wireLegacyNotice(){
    const el = document.getElementById('legacy-notice');
    if(!el) return;
    el.querySelector('.ln-x').addEventListener('click', hideLegacyNotice);
    el.querySelector('.ln-go').addEventListener('click', async ()=>{
      const btn = el.querySelector('.ln-go');
      if(btn.disabled) return;
      btn.disabled = true;
      try {
        // Save As, not Save: Save deliberately writes back in the file's own format, so it would
        // rewrite the .html and change nothing. Save As names a NEW file, which gets .sptcal.
        const r = await saveAsFile();
        // Only stand down once the calendar actually lives somewhere new. On the download
        // fallback the user still has no linked file, so the advice still stands.
        if(r === 'saveas'){ hideLegacyNotice(); flashSaveBtn('Saved \u2713'); }
        else btn.disabled = false;
      } catch(err){
        btn.disabled = false;
        if(err && err.name === 'AbortError') return;   // user cancelled the picker
        console.error(err);
        uiAlert('Could not save a .sptcal copy: ' + err.message);
      }
    });
  })();

  const saveBtn = document.getElementById('save-file-btn');
  const saveAsBtn = document.getElementById('save-as-btn');
  const saveBtnLabel = () => supportsFsAccess ? 'Save' : 'Save to File';
  // The chrome is React now, so what these buttons SAY is pushed through the bridge rather than
  // written onto the node. Writing textContent onto a Mantine Button destroys its inner spans, and
  // Mantine styles disabled from [data-disabled] only -- setting .disabled would disable the button
  // functionally while leaving it looking enabled. src/chrome/bridge.js has the full reasoning.
  function refreshSaveBtn(){
    chrome.saveBtn({ label: saveBtnLabel() });
    // "Save As…" only makes sense where we can pick a real file location.
    chrome.saveAsBtn({ visible: supportsFsAccess });
  }
  refreshSaveBtn();
  // ⚠️ The re-entrancy guard is now this flag, NOT the button's .disabled property. React commits
  // asynchronously, so a second click landing before the commit would have read .disabled === false
  // and started a concurrent write to the same file. The flag is set synchronously.
  let saveInFlight = false;
  // Round-3 owner ask (29 Aug 2026): an accidental-retrigger guard for the file-action buttons.
  // A double activation inside the window is dropped. This exists because the async busy states
  // commit through React AFTER the second click of a fast double-click has already landed --
  // saveInFlight closes that hole for Save specifically; this closes it for the rest (double
  // pickers, double downloads, double New confirms).
  // The app's own dialogs (owner, rounds 3-4): every user-facing confirm()/alert() in CHROME
  // handlers goes through the bridge to a Mantine modal (src/chrome/Dialogs.jsx). Two rules:
  //   * uiConfirm must be AWAITED -- it resolves true/false. Converted handlers became async.
  //   * ⛔ alert() calls INSIDE the frozen export functions (exportMonthPdf, exportWaterfallPdf,
  //     exportWaterfallPdfDirect) stay native: editing those bodies is what the freeze forbids.
  //   * The bridge default degrades to window.confirm/alert, so a chromeless engine still asks.
  function uiConfirm(message, opts){
    return chrome.dialog(Object.assign({ kind: 'confirm', message }, opts || {}));
  }
  function uiAlert(message, opts){
    return chrome.dialog(Object.assign({ kind: 'alert', message }, opts || {}));
  }

  function reClickGuard(ms, fn){
    let last = 0;
    return function(...args){
      const now = Date.now();
      if(now - last < ms) return;
      last = now;
      return fn.apply(this, args);
    };
  }
  function flashSaveBtn(text, btn){
    const isSaveAs = btn === saveAsBtn;
    const restore = isSaveAs ? 'Save As\u2026' : saveBtnLabel();
    const push = isSaveAs ? chrome.saveAsBtn : chrome.saveBtn;
    push({ label: text, disabled: true });
    setTimeout(()=>{ push({ label: restore, disabled: false }); }, 1200);
  }

  // Load a file's saved data INTO the running app: read its HTML, pull out the embedded
  // <script id="saved-state"> JSON, inject it into the live document, and replay it.
  async function openRecentFile(entry){
    if(!entry || !entry.handle) return;
    // Permission to READ the file (one click if not already granted this session).
    try {
      const q = await entry.handle.queryPermission({ mode: 'readwrite' });
      if(q !== 'granted'){
        const p = await entry.handle.requestPermission({ mode: 'readwrite' });
        if(p !== 'granted'){ uiAlert('Permission to open that file was declined.'); return; }
      }
    } catch(e){ /* some browsers: proceed and let read throw */ }

    let text;
    try { const file = await entry.handle.getFile(); text = await file.text(); }
    catch(e){ uiAlert('Could not read that file. It may have been moved or deleted.'); return; }

    // Read the calendar out of the file -- either format, one code path (parseCalendarText).
    const parsed = parseCalendarText(text);
    if(!parsed){ uiAlert('That file doesn\u2019t contain saved calendar data.'); return; }
    const snap = parsed.snapshot;
    // Reset dynamic rows to defaults so restore rebuilds cleanly, then replay. applyStateSnapshot
    // is called directly rather than round-tripping through the live #saved-state element: that
    // detour existed only because the old Open path had the JSON as a string, and writing another
    // file's data into this document's state block was always a bit of a lie.
    suppressDirty = true;
    applyStateSnapshot(snap);
    refreshAfterRestore();
    suppressDirty = false;
    resetUndoHistory(); // opening a different file starts a fresh undo history
    // Make this the active, writable file so subsequent Save writes back to it.
    savedFileHandle = entry.handle;
    handleNeedsPermission = false;
    activeFileId = entry.id;
    entry.savedAt = Date.now();
    recentFiles.sort((a,b)=> b.savedAt - a.savedAt);
    await persistRecents();
    isDirty = false; lastSavedAt = null; refreshSaveStatus();
    refreshSaveBtn();
    renderRecents();
    // A pre-v1.1.0 calendar opened fine -- and it will keep opening fine forever, which is the
    // rule in CLAUDE.md. But it is still a ~750 KB copy of an OLD BUILD of the app carrying ~3 KB
    // of actual plan, and a saved copy keeps the bugs it was saved with. So offer the upgrade at
    // the one moment it is relevant. Offer, not force: Save on this file still writes .html, and
    // the notice is dismissible.
    if(parsed.format === 'html') showLegacyNotice(entry.name); else hideLegacyNotice();
  }

  // "Open…" — pick any calendar from disk (either format) and load + track it.
  async function openFileViaPicker(){
    if(!supportsFsAccess) return;
    let handle;
    try {
      [handle] = await window.showOpenFilePicker({
        types: OPEN_TYPES,
        multiple: false,
      });
    } catch(e){ if(e && e.name === 'AbortError') return; throw e; }
    const entry = { id: 'f'+Date.now()+Math.random().toString(36).slice(2,6), handle, name: handle.name, savedAt: Date.now() };
    // De-dupe against existing recents.
    let dup = null;
    for(const f of recentFiles){ if(f.handle && handle.isSameEntry){ try{ if(await handle.isSameEntry(f.handle)){ dup=f; break; } }catch(e){} } }
    const target = dup || entry;
    if(!dup){ recentFiles.unshift(entry); }
    await openRecentFile(target);
  }

  // "New" — clear the active file link and reset to a blank calendar.
  function newFile(){
    hideLegacyNotice();   // a blank calendar is not the old file any more
    savedFileHandle = null;
    handleNeedsPermission = false;
    activeFileId = null;
    persistRecents();
    suppressDirty = true;
    resetAll(); // full reset without the button's own confirm (New already prompted)
    suppressDirty = false;
    resetUndoHistory(); // a blank calendar starts a fresh undo history
    isDirty = false; lastSavedAt = null; refreshSaveStatus();
    idbSet(BACKUP_KEY, undefined);
    refreshSaveBtn();
    renderRecents();
  }

  async function removeRecent(id){
    recentFiles = recentFiles.filter(f=>f.id !== id);
    if(activeFileId === id){ activeFileId = null; savedFileHandle = null; }
    await persistRecents();
    renderRecents();
    refreshSaveBtn();
  }

  // Render the file dropdown in the header: current file name on the button, recents +
  // "Open…" inside the menu.
  // Pushes the recents list as DATA. The chrome renders each entry carrying the SAME
  // data-id / data-remove / data-action attributes the delegated handler below matches on with
  // .closest(), so that handler -- and its deliberate branch ORDER -- ports across untouched.
  //
  // The local `esc` that used to live here is gone, and good riddance: it escaped & < " but NOT >,
  // while the notice strips used the app's escHtml() which does. Two escapers doing one job, with
  // one of them subtly weaker. JSX escapes, so neither is needed.
  function renderRecents(){
    if(!supportsFsAccess){ chrome.fileMenu({ visible: false }); return; }
    const active = recentFiles.find(f=>f.id === activeFileId);
    chrome.fileMenu({
      visible: true,
      // NB: strips only .html -- a .sptcal file deliberately shows its extension.
      label: active ? active.name.replace(/\.html$/i,'') : 'Untitled',
      items: recentFiles.map(f => ({ id: f.id, name: f.name, active: f.id === activeFileId })),
    });
  }
  function closeFileMenu(){ chrome.fileMenu({ open: false }); }

  // On load: bring in the recent-files list, but do NOT adopt the last active file's handle.
  // A freshly-loaded page shows a blank calendar, so silently pointing Save at the previous
  // file would let someone type a brand-new schedule and overwrite that file without meaning
  // to. Instead we start "Untitled": Save asks where to go, and picking a file from the menu
  // both loads its data and links it, so what's on screen always matches the linked file.
  if(supportsFsAccess){
    loadRecents().then(()=>{
      activeFileId = null;   // nothing is open yet in this session
      savedFileHandle = null;
      handleNeedsPermission = false;
      renderRecents();
      refreshSaveBtn();
    });
  }

  if(saveBtn) saveBtn.addEventListener('click', async ()=>{
    if(saveInFlight) return;              // ignore double-clicks while a write is already in flight
    saveInFlight = true;
    chrome.saveBtn({ busy: true, disabled: true });   // mirrors Export's "Building file..."

    try {
      const result = await saveToFile();
      saveInFlight = false;
      chrome.saveBtn({ busy: false });     // flashSaveBtn re-disables briefly for its confirmation
      flashSaveBtn(result === 'download' ? 'Downloaded \u2713' : 'Saved \u2713');
    } catch(err){
      saveInFlight = false;
      chrome.saveBtn({ busy: false, disabled: false, label: saveBtnLabel() });
      if(err && err.name === 'AbortError') return; // user cancelled the picker
      console.error(err);
      uiAlert('Something went wrong saving the file: ' + err.message);
    }
  });

  // Undo / redo buttons, next to the waterfall/month view toggle.
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  if(undoBtn) undoBtn.addEventListener('click', undo);
  if(redoBtn) redoBtn.addEventListener('click', redo);

  // Shift tools. Each click is its own undo step: the debounce that collapses a burst of typing
  // into one step would otherwise merge three quick clicks on "one week earlier" into a single
  // three-week undo, which reads as the button having eaten two of the presses.
  (function(){
    const group = document.getElementById('shift-group');
    const readout = document.getElementById('shift-readout');
    let flashTimer = null;
    function runShift(weeks){
      pushUndoSnapshot();          // close off whatever came before, so this click stands alone
      const res = shiftCalendar(weeks);
      pushUndoSnapshot();          // ...and bank the shift itself immediately
      if(!res || !readout) return;
      // Say what happened. The wrap date is worth showing because holidays don't move with the
      // plan, so Production's wrap can travel by more or less than the weeks requested.
      const dir = res.weeks < 0 ? 'earlier' : 'later';
      const n = Math.abs(res.weeks);
      readout.textContent = n + (n === 1 ? ' wk ' : ' wks ') + dir + (res.productionWrap ? ' · wrap ' + res.productionWrap : '');
      group.classList.add('flash');
      clearTimeout(flashTimer);
      flashTimer = setTimeout(()=>{ group.classList.remove('flash'); }, 2600);
    }
    const back = document.getElementById('shift-back-btn');
    const fwd = document.getElementById('shift-fwd-btn');
    if(back) back.addEventListener('click', ()=> runShift(-1));
    if(fwd) fwd.addEventListener('click', ()=> runShift(1));
  })();

  // The calendar tools: one button per tool on the preview toolbar, each opening its own small
  // popover. Replaces a single "Adjustment Tools" menu that stacked all of them -- which hid every
  // capability behind one unlabelled click and grew to 562px tall.
  (function(){
    // Each entry pairs a trigger button with the popover it owns.
    const POPS = [
      {btn:'pop-shift-btn',  menu:'pop-shift'},
      {btn:'pop-ripple-btn', menu:'pop-ripple'},
      {btn:'pop-anchor-btn', menu:'pop-anchor'},
      {btn:'pop-solve-btn',  menu:'pop-solve'}
    ].map(p=>({btn:document.getElementById(p.btn), menu:document.getElementById(p.menu)}))
     .filter(p=>p.btn && p.menu);
    if(!POPS.length) return;

    // Results are written into whichever popover is open, so each tool reports in its own panel.
    function say(text, isWarning){
      const open = POPS.find(p=>p.menu.classList.contains('open'));
      POPS.forEach(p=>{
        const el = p.menu.querySelector('[data-tools-msg]');
        if(el && p.menu !== (open && open.menu)){ el.textContent = ''; el.classList.remove('warn'); }
      });
      if(!open) return;
      const el = open.menu.querySelector('[data-tools-msg]');
      if(!el) return;
      el.textContent = text || '';
      el.classList.toggle('warn', !!isWarning);
    }
    // Every tool is a discrete action, so each gets its own undo step -- same reasoning as the
    // arrow buttons: the typing-collapse debounce would otherwise fold consecutive tool uses
    // together and make one Undo jump back further than the user expects.
    function asOneUndoStep(fn){
      pushUndoSnapshot();
      const out = fn();
      pushUndoSnapshot();
      refreshMenuFromCalendar(); // the menu quotes live dates; they just changed
      return out;
    }
    function describeShift(res){
      if(!res) return 'Nothing to shift.';
      const n = Math.abs(res.weeks);
      let out = 'Shifted ' + n + (n === 1 ? ' week ' : ' weeks ') + (res.weeks < 0 ? 'earlier' : 'later') + '.';
      if(res.lockedHiatuses) out += ' ' + res.lockedHiatuses + ' locked hiatus' + (res.lockedHiatuses === 1 ? '' : 'es') + ' held.';
      if(res.productionWrap) out += ' Wrap ' + res.productionWrap + '.';
      return out;
    }
    function readWeeks(id){
      const v = Math.round(Number((document.getElementById(id) || {}).value));
      return (Number.isFinite(v) && v > 0) ? v : null;
    }

    // Every scheduled phase, in the order it runs. Built on open rather than once at startup so it
    // always reflects the phases that exist right now, custom ones included.
    function scheduledPhases(){
      return getAllPhaseDefs()
        .map(p=>({p, start: phaseStartDate(p.key)}))
        .filter(x=>x.start)
        .sort((a,b)=> a.start - b.start);
    }
    // `withAll` adds the whole-schedule entry, which only the anchor offers -- rippling "from the
    // whole schedule" would just be the plain shift that already has its own row.
    function fillPhaseSelect(id, list, preferKey, withAll){
      const sel = document.getElementById(id);
      const prev = sel.value;
      // Work-from lists phases that have no start date yet (placing them is the point), so the
      // date suffix is omitted rather than assumed -- mondayOf(null) would throw.
      const opts = list.map(x=>`<option value="${x.p.key}">${escHtml(x.p.label || 'Phase')}${x.start ? ' — ' + fmtShort(mondayOf(x.start)) : ' — no date yet'}</option>`);
      if(withAll && list.length) opts.push(`<option value="${ANCHOR_ALL}">Whole schedule (all phases)</option>`);
      sel.innerHTML = opts.length ? opts.join('') : '<option value="">No phases scheduled yet</option>';
      // Keep whatever was chosen last if it still exists, else fall back to the caller's preference.
      const has = k => k === ANCHOR_ALL ? (withAll && list.length) : list.some(x=>x.p.key === k);
      if(prev && has(prev)) sel.value = prev;
      else if(preferKey && has(preferKey)) sel.value = preferKey;
    }
    // The anchor works on a LANDMARK: one edge (start or end) of one phase, or of the schedule as
    // a whole. ANCHOR_ALL is the whole-schedule entry -- "ends by" on it is the delivery deadline.
    const ANCHOR_ALL = '__whole_schedule__';
    // Where a landmark currently sits. A phase's end comes from its computed segment, so a phase
    // with no duration typed has a start but no end yet. Production reports its WRAP rather than
    // the end of the week the wrap falls in, matching what the header and the notes call it.
    function landmarkDate(key, edge){
      if(key === ANCHOR_ALL){
        if(edge === 'end') return scheduleLastDay();
        const segs = (currentSchedule && currentSchedule.segments) || [];
        let first = null;
        segs.forEach(s=>{ if(!first || s.start < first) first = s.start; });
        return first;
      }
      if(edge === 'start') return phaseStartDate(key);
      if(key === 'production'){
        const info = currentSchedule && currentSchedule.productionInfo;
        if(info && info.lastShootDay) return info.lastShootDay;
      }
      const seg = ((currentSchedule && currentSchedule.segments) || []).find(s=>s.key === key);
      return seg ? addDays(seg.end, -1) : null;
    }
    function anchorSelection(){
      const pSel = document.getElementById('tool-anchor-phase');
      const eSel = document.getElementById('tool-anchor-edge');
      const key = pSel.value, edge = eSel.value;
      const label = key === ANCHOR_ALL
        ? 'The schedule'
        : ((pSel.selectedOptions[0] ? pSel.selectedOptions[0].textContent : '').split(' — ')[0] || 'That phase');
      return {key, edge, label, current: key ? landmarkDate(key, edge) : null};
    }
    // Show where the chosen landmark sits now, so the field reads as "where it is" and the user
    // edits from there rather than typing into a blank box.
    function syncAnchorDate(){
      const {edge, current} = anchorSelection();
      // A start is Monday-snapped like every other start in this tool; an end is a real last day.
      document.getElementById('tool-anchor-date').value =
        current ? isoOf(edge === 'start' ? mondayOf(current) : current) : '';
    }
    // Re-read the calendar into the menu's own controls. Called on open AND after every tool runs:
    // each dropdown entry carries the phase's current start date, so leaving them alone after a
    // shift would leave the menu quoting dates the calendar no longer has.
    // Work-from can target a phase that has no start date yet -- placing undated phases is the
    // point of it -- so its dropdown lists every phase with a usable span, not just scheduled ones.
    function solvablePhases(){
      return phaseSequence()
        .filter(p => p.key === 'production' ? showInfoStatus().complete : !!phaseWeeksFor(p))
        .map(p => ({p, start: phaseStartDate(p.key)}));
    }
    function syncSolveDate(){
      const key = (document.getElementById('tool-solve-phase')||{}).value;
      const start = key ? phaseStartDate(key) : null;
      document.getElementById('tool-solve-date').value = start ? isoOf(mondayOf(start)) : '';
    }
    function refreshMenuFromCalendar(){
      const list = scheduledPhases();
      fillPhaseSelect('tool-ripple-phase', list);
      fillPhaseSelect('tool-anchor-phase', list, 'production', true); // the shoot is the usual anchor
      fillPhaseSelect('tool-solve-phase', solvablePhases(), 'production');
      syncAnchorDate();
      syncSolveDate();
    }
    function closeAllPops(){
      POPS.forEach(p=>{
        p.menu.classList.remove('open');
        p.btn.setAttribute('aria-expanded','false');
        const m = p.menu.querySelector('[data-tools-msg]');
        if(m){ m.textContent = ''; m.classList.remove('warn'); }
      });
    }
    // Opening one closes the others: only ever one popover on screen, so they can't overlap each
    // other or leave two stale result lines showing.
    function openPop(target){
      const wasOpen = target.menu.classList.contains('open');
      closeAllPops();
      if(wasOpen) return;
      refreshMenuFromCalendar();   // every dropdown quotes live dates
      target.menu.classList.add('open');
      target.btn.setAttribute('aria-expanded','true');
    }
    POPS.forEach(p=>{
      p.btn.addEventListener('click', e=>{ e.stopPropagation(); openPop(p); });
      // Clicks inside a popover must not reach the click-away handler below.
      p.menu.addEventListener('click', e=> e.stopPropagation());
    });
    document.addEventListener('click', e=>{
      if(!e.target.closest('.tools-wrap') && !e.target.closest('.shift-group')) closeAllPops();
    });
    document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeAllPops(); });

    document.getElementById('tool-anchor-phase').addEventListener('change', syncAnchorDate);
    document.getElementById('tool-anchor-edge').addEventListener('change', syncAnchorDate);
    document.getElementById('tool-solve-phase').addEventListener('change', syncSolveDate);

    // --- Shift All by N weeks (the toolbar arrows are the one-click 1-week case of this)
    function shiftBy(sign){
      const n = readWeeks('tool-shift-weeks');
      if(!n) return say('Enter a number of weeks.', true);
      say(describeShift(asOneUndoStep(()=> shiftCalendar(sign * n))));
    }
    document.getElementById('tool-shift-earlier').addEventListener('click', ()=> shiftBy(-1));
    document.getElementById('tool-shift-later').addEventListener('click', ()=> shiftBy(1));

    // --- Anchor: put one landmark -- the start or the end of any phase, or of the whole schedule
    //     -- on a chosen date. Unlike the ripple below, this slides the WHOLE calendar so that
    //     landmark lands there: the plan keeps its shape and every phase keeps its lead time, it
    //     just sits somewhere else on the calendar.
    //
    //     The two edges round differently, and deliberately. A START is Monday-snapped like every
    //     start in this tool, so aligning it to the target's week lands it exactly. An END falls on
    //     whatever weekday the work happens to finish, and shifts move in whole weeks -- which
    //     preserves weekday -- so an arbitrary end date is usually unreachable. "Ends by" is
    //     therefore one-sided: it floors, landing on or before the date rather than overshooting
    //     past a deadline to get nearer to it.
    document.getElementById('tool-anchor-go').addEventListener('click', ()=>{
      const {key, edge, label, current} = anchorSelection();
      if(!key) return say('Nothing selected.', true);
      const target = parseDateUTC((document.getElementById('tool-anchor-date')||{}).value);
      if(!target) return say('Pick a date first.', true);
      if(!current){
        return say(edge === 'end'
          ? label + ' has no end yet — give it a duration first.'
          : label + ' has no start date to move.', true);
      }
      const delta = edge === 'start'
        ? weeksBetweenMondays(current, target)
        : weeksToFinishBy(current, target);
      if(!delta){
        return say(edge === 'start'
          ? label + ' already starts that week.'
          : label + ' already ends ' + fmtShort(current) + ' — as late as it can without passing that date.');
      }
      const res = asOneUndoStep(()=> shiftCalendar(delta));
      // Report where the landmark actually landed rather than the date asked for: whole-week steps
      // land short of a deadline, and because holidays don't travel with the plan a shifted shoot
      // can even grow over one it now overlaps and finish past the date.
      const landed = landmarkDate(key, edge);
      let out = describeShift(res) + (landed ? ' ' + label + (edge === 'end' ? ' ends ' : ' starts ') + fmtShort(landed) + '.' : '');
      const overshot = !!(landed && edge === 'end' && landed > target);
      if(overshot) out += ' Still past your date — the shoot grew over a holiday it now overlaps.';
      say(out, overshot);
    });

    // --- "Shift From": move one phase and everything after it, leaving earlier phases put.
    //     Both directions move the same SET -- Earlier/Later is the direction of travel, not which
    //     side of the calendar is affected -- so the gap in front of the chosen phase is what
    //     stretches or shrinks.
    function ripple(sign){
      const sel = document.getElementById('tool-ripple-phase');
      const key = sel.value;
      if(!key) return say('No phase selected.', true);
      const label = (sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '').split(' — ')[0] || 'that phase';
      const n = readWeeks('tool-ripple-weeks');
      if(!n) return say('Enter a number of weeks.', true);
      const from = phaseStartDate(key);
      if(!from) return say(label + ' has no start date.', true);
      const res = asOneUndoStep(()=> shiftCalendar(sign * n, isoOf(mondayOf(from))));
      if(!res) return say('Nothing to shift.', true);
      // Name the phase it started from: the section header is deliberately terse, so the result
      // line is where "from where?" gets answered.
      say(describeShift(res) + ' From ' + label + ' onward — '
        + res.movedPhases + ' phase' + (res.movedPhases === 1 ? '' : 's') + ' moved.');
    }
    document.getElementById('tool-ripple-earlier').addEventListener('click', ()=> ripple(-1));
    document.getElementById('tool-ripple-later').addEventListener('click', ()=> ripple(1));

    // --- Rebuild From: pin one phase's start, rebuild one side of it back to back
    function runSolve(direction){
      const sel = document.getElementById('tool-solve-phase');
      const key = sel.value;
      if(!key) return say('No phase selected.', true);
      const label = (sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '').split(' — ')[0] || 'that phase';
      const dateIso = (document.getElementById('tool-solve-date')||{}).value;
      const res = asOneUndoStep(()=>{
        const out = direction < 0 ? workBackwardsFrom(key, dateIso) : workForwardsFrom(key, dateIso);
        if(!out.error) refreshAfterRestore();   // the date fields were written directly
        return out;
      });
      if(res.error) return say(res.error, true);
      if(!res.written.length){
        return say('Nothing to place — the phases ' + (direction < 0 ? 'before' : 'after') + ' ' + label + ' have no week counts.', true);
      }
      // Lead with the phase the user actually wants to know about: the far end of the rebuild.
      const far = res.written[res.written.length - 1];
      const filled = res.written.filter(w=>w.wasBlank).length;
      let out = (direction < 0 ? 'Worked back from ' : 'Worked forward from ') + label + ' — '
        + far.label + ' starts ' + fmtShort(far.start);
      // How far the outermost phase travelled. On an already-dated calendar this tool overwrites
      // and absorbs whatever slack was between the phases, which is easy to miss when all you did
      // was pin one date -- so if the far end moved, the message says by how much.
      if(far.prevIso){
        const prev = parseDateUTC(far.prevIso);
        const moved = prev ? Math.round((mondayOf(far.start) - mondayOf(prev)) / DAY_MS / 7) : 0;
        if(moved) out += ' (' + Math.abs(moved) + (Math.abs(moved) === 1 ? ' week ' : ' weeks ')
          + (moved > 0 ? 'later' : 'earlier') + ' than before)';
      }
      out += '. ' + res.written.length + ' phase' + (res.written.length === 1 ? '' : 's') + ' placed';
      out += filled ? (', ' + filled + ' newly dated.') : '.';
      if(res.skipped.length) out += ' Skipped ' + res.skipped.join(', ') + ' (no week count).';
      say(out);
    }
    document.getElementById('tool-solve-back').addEventListener('click', ()=> runSolve(-1));
    document.getElementById('tool-solve-fwd').addEventListener('click', ()=> runSolve(1));

    // --- Close all gaps
    document.getElementById('tool-close-gaps').addEventListener('click', ()=>{
      const moved = asOneUndoStep(closeAllGaps);
      say(moved
        ? 'Chained ' + moved + ' phase' + (moved === 1 ? '' : 's') + ' back to back.'
        : 'No gaps to close.');
    });
  })();

  // Global keyboard shortcuts: Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo), Cmd/Ctrl+S (save).
  // While focus is inside an editable field (a text/number input, a textarea -- e.g. the
  // waterfall or month-view note editor -- or a contenteditable header line), Z/Shift+Z is left
  // alone so the browser's own in-field undo runs instead; app-level undo takes back over once
  // focus leaves the field (matches the existing Escape/Tab handling in the note editor).
  document.addEventListener('keydown', e=>{
    const meta = e.metaKey || e.ctrlKey;
    if(!meta) return;
    const key = e.key.toLowerCase();
    if(key === 's'){
      e.preventDefault();
      if(saveBtn) saveBtn.click(); // reuses the click handler's disabled-guard, flash, and error handling
      return;
    }
    if(key !== 'z') return;
    const active = document.activeElement;
    const isEditable = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    if(isEditable) return;
    e.preventDefault();
    if(e.shiftKey) redo(); else undo();
  });

  // Header toolbar wiring: file dropdown, New, Save As.
  (function(){
    // NB: there is no menuBtn const any more. Mantine's Menu.Target delegates to Popover.Target,
    // which CLONES its child and injects Popover's own generated id -- so an id written on that
    // button is silently replaced and getElementById('file-menu-btn') returns null. Nothing here
    // needs it: opening, closing, aria-expanded, click-away and Escape are all Mantine's now.
    const newBtn = document.getElementById('new-file-btn');

    // ⚠️ Opening, closing, click-away and Escape are Mantine's Menu now, NOT this file's.
    // The toggle handler, the document click-away (`!e.target.closest('#file-menu-wrap')`) and the
    // document Escape handler that used to live here are all DELETED, deliberately: two closers on
    // one menu is exactly how "clicking an item reopens it" happens. What stays is the ONE
    // delegated listener below, because its branch ORDER is load-bearing --
    //   data-remove (returns early, so the menu STAYS OPEN while pruning several entries)
    //     -> item -> close -> share (above the dirty guard, since exporting is not navigation)
    //     -> dirty confirm -> open/recent.
    // Mantine is configured with closeOnItemClick={false} so this flow keeps deciding, unchanged.
    // ⛔ Bound to DOCUMENT, not to #file-menu, and scoped by closest(). Binding to the node
    // directly is what broke this once already: Mantine's Popover mounts its dropdown from an
    // EFFECT, so #file-menu does not exist at the instant this IIFE evaluates -- even inside
    // flushSync, and even with keepMounted. getElementById returned null, the listener silently
    // never attached, and the file menu opened and closed perfectly while doing nothing at all.
    // No error, no warning; the only symptom was Open… not opening anything.
    //
    // The general rule this is an instance of: the engine must not capture React-rendered nodes at
    // evaluation time. Delegating from document costs nothing and cannot be defeated by a remount.
    {
      document.addEventListener('click', async (e)=>{
        if(!e.target.closest || !e.target.closest('#file-menu')) return;
        const rm = e.target.closest('[data-remove]');
        if(rm){ e.stopPropagation(); await removeRecent(rm.getAttribute('data-remove')); return; }
        const item = e.target.closest('.file-menu-item');
        if(!item) return;
        closeFileMenu();
        // Export is not a navigation: it doesn't replace what's on screen, so it deliberately
        // sits above the unsaved-changes guard below.
        if(item.dataset.action === 'share'){
          try {
            downloadTextFile(buildSavedHtml(), 'text/html', buildSavedFileName('.html'));
          } catch(err){ console.error(err); uiAlert('Could not build a shareable copy: '+err.message); }
          return;
        }
        const isOpen = item.dataset.action === 'open';
        const entry = isOpen ? null : recentFiles.find(f=>f.id === item.dataset.id);
        // Opening another calendar replaces the one on screen -- warn if there's unsaved work,
        // matching the "New" guard. Fires before the picker opens / any recents mutation.
        if((isOpen || entry) && isDirty && !(await uiConfirm('Open another calendar? Your unsaved changes will be lost.', { title: 'Open another calendar', confirmLabel: 'Open', danger: true }))) return;
        if(isOpen){
          try { await openFileViaPicker(); } catch(err){ if(err && err.name!=='AbortError'){ console.error(err); uiAlert('Could not open a file: '+err.message); } }
          return;
        }
        if(entry){ try { await openRecentFile(entry); } catch(err){ console.error(err); uiAlert('Could not open that file: '+err.message); } }
      });
    }

    // "Export shareable copy" moved out of the file menu to its own header button (owner's ask,
    // 29 Aug 2026). Delegated from document for the same remount-proofing reason as the menu
    // listener above; the menu's own 'share' branch stays as harmless belt-and-braces.
    document.addEventListener('click', reClickGuard(600, (e)=>{
      if(!e.target.closest || !e.target.closest('#share-copy-btn')) return;
      try {
        downloadTextFile(buildSavedHtml(), 'text/html', buildSavedFileName('.html'));
      } catch(err){ console.error(err); uiAlert('Could not build a shareable copy: '+err.message); }
    }));

    if(newBtn) newBtn.addEventListener('click', reClickGuard(600, async ()=>{
      // Only warn if there's actually unsaved work to lose.
      if(isDirty && !(await uiConfirm('Start a new blank calendar? Your unsaved changes will be lost.', { title: 'New calendar', confirmLabel: 'Start new', danger: true }))) return;
      newFile();
    }));

    if(saveAsBtn) saveAsBtn.addEventListener('click', reClickGuard(600, async ()=>{
      try {
        const r = await saveAsFile();
        flashSaveBtn(r === 'download' ? 'Downloaded \u2713' : 'Saved \u2713', saveAsBtn);
      } catch(err){
        if(err && err.name === 'AbortError') return;
        console.error(err);
        uiAlert('Something went wrong saving the file: ' + err.message);
      }
    }));
  })();

  // Help modal
  (function(){
    const overlay = document.getElementById('help-overlay');
    const openHelp = ()=>{ overlay.classList.add('open'); };
    const closeHelp = ()=>{ overlay.classList.remove('open'); };
    document.getElementById('help-fab').addEventListener('click', openHelp);
    document.getElementById('help-close').addEventListener('click', closeHelp);
    overlay.addEventListener('click', e=>{ if(e.target === overlay) closeHelp(); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && overlay.classList.contains('open')) closeHelp(); });
  })();

  document.getElementById('export-btn').addEventListener('click', reClickGuard(600, async ()=>{
    if(viewMode === 'month'){
      exportMonthPdf();
      return;
    }
    if(typeof ExcelJS === 'undefined'){
      uiAlert('The Excel export library failed to load from the CDN (cdn.jsdelivr.net). This can happen on locked-down corporate networks. Try a different network, or ask IT to allow that domain.');
      return;
    }
    // ⚠️ This used to be `const original = btn.textContent` … `finally { btn.textContent =
    // original }` -- a snapshot of a property render() ALSO writes. Under React a commit landing
    // between the snapshot and the restore could strand the button reading 'Building file...', or
    // showing the other view's label. `busy` is a state now and the label is always DERIVED from
    // viewMode, never captured. MANTINE-SEAM.md §3.1 names this specifically.
    chrome.exportBtn({ busy: true, disabled: true });
    try{
      await exportExcel(currentSchedule);
    } catch(err){
      console.error(err);
      uiAlert('Something went wrong building the Excel file: ' + err.message);
    } finally {
      chrome.exportBtn({ busy: false, disabled: false });
    }
  }));

  document.getElementById('export-wf-pdf-btn').addEventListener('click', reClickGuard(600, ()=>{
    if(WF_PDF_MODE === 'direct') exportWaterfallPdfDirect();
    else exportWaterfallPdf();
  }));

  // ---------- Month view: export every month to PDF ----------
  // Uses the browser's own print pipeline (Print -> "Save as PDF"), which is the only way a
  // single-file, no-dependency tool can produce a real PDF -- and it renders the live DOM, so
  // the output matches what's on screen rather than being a second implementation that drifts.
  // Every month from the first phase to the last is rendered into a print-only container, so
  // the PDF spans the whole schedule rather than just the month being viewed.
  function monthRangeForSchedule(schedule){
    const segs = (schedule.segments || []);
    if(!segs.length) return null;
    let min = Infinity, max = -Infinity;
    segs.forEach(s=>{
      min = Math.min(min, s.start.getTime());
      // `end` is exclusive, so step back a day to get the last day actually covered -- a phase
      // ending on the 1st shouldn't drag in a whole extra month.
      max = Math.max(max, addDays(s.end, -1).getTime());
    });
    (schedule.hiatuses||[]).forEach(h=>{
      if(segs.some(s=> h.start < s.end && h.end > s.start)){
        min = Math.min(min, h.start.getTime());
        max = Math.max(max, addDays(h.end, -1).getTime());
      }
    });
    if(!Number.isFinite(min) || !Number.isFinite(max)) return null;
    const a = new Date(min), b = new Date(max);
    return {
      first: new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1)),
      last:  new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 1))
    };
  }

  function exportMonthPdf(){
    const range = monthRangeForSchedule(currentSchedule);
    if(!range){
      alert('Add at least one phase with a start date before exporting the calendar.');
      return;
    }
    const host = document.getElementById('print-root');
    if(!host) return;
    const savedCursor = monthCursor;

    // Clear any leftovers from an export that didn't finish cleanly, otherwise a stuck
    // `printing-calendar` class hides the whole app and the next print silently does nothing.
    document.body.classList.remove('printing-calendar');
    host.innerHTML = '';

    try {
      let html = '';
      let cur = new Date(range.first.getTime());
      let guard = 0;
      while(cur <= range.last && guard++ < 240){
        // printingCursor bypasses the range-clamp in renderMonthView: here we deliberately
        // walk every month in turn, and the clamp would keep snapping us back to the first.
        printingCursor = new Date(cur.getTime());
        html += '<div class="print-page">' + renderMonthView(currentSchedule) + '</div>';
        cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth()+1, 1));
      }
      host.innerHTML = html;
    } catch(err){
      console.error(err);
      printingCursor = null;
      monthCursor = savedCursor;
      host.innerHTML = '';
      alert('Something went wrong building the calendar for print: ' + err.message);
      return;
    }
    printingCursor = null;

    // Fit every month to exactly one sheet. Rather than measuring and shrinking the whole page
    // with a transform (which left sparse months floating at the top, since a 2-row month has
    // no natural reason to reach the bottom), the page is pinned to the printable area and the
    // week rows divide it between them in proportion to their lane counts. A month with four
    // 4-line rows prints as four equal rows filling the sheet; if one row carries 6 lines of
    // comments it takes proportionally more and the others give way. Everything stays visible
    // and the grid always spans top to bottom.
    // Fit each month to exactly one sheet, in two modes:
    //  - If the month's content fits, the week rows FLEX-GROW to fill the page (proportional to
    //    their line counts: a 6-line row takes more, the others give way -- sparse months print
    //    as uniform full-size rows).
    //  - If the content is taller than the page (e.g. a 6-week month with episodes + Simultaneous
    //    Post on most weeks PLUS a comment-heavy week), each row is given its natural height and
    //    the whole month is SCALED DOWN (scaleY) just enough to fit one page -- so nothing
    //    overflows into the row below and nothing is dropped. This is the "shrink to fit" mode.
    const MV_LANE_PX = 19;      // 17px lane track + 2px gap
    const MV_ROW_CHROME = 38;   // 24px top padding + 14px bottom, per week's day-number strip
    const PAGE_H = (8.5 - 2*8/25.4) * 96;   // landscape Letter page box height, px @96dpi
    const PAGE_PAD = 4;                     // print-page's 2px top+bottom padding
    const PRINT_W = Math.round((11 - 2*8/25.4) * 96);
    try {
      // Pass 1: compute each week's 4-line "nice" height, used only to distribute slack so rows
      // read as even blocks when there's room. Bars are already packed top-down and gap-free (the
      // renderer places them compactly), and a note may span several lanes, so the lane count is
      // the furthest lane any bar reaches (start + span), not just the number of distinct starts.
      const pages = Array.from(host.children).map(page=>{
        const weeks = Array.from(page.querySelectorAll('.mv-week'));
        const niceH = weeks.map(wkEl=>{
          const bars = Array.from(wkEl.querySelectorAll('.mv-bar:not(.mv-note-add):not(.mv-row-expand)'));
          let maxLane = 0;
          bars.forEach(b=>{
            const m = String(b.style.gridRow || '').match(/^\s*(\d+)(?:\s*\/\s*span\s*(\d+))?/);
            if(m){ const start = parseInt(m[1],10); const span = m[2] ? parseInt(m[2],10) : 1; maxLane = Math.max(maxLane, start - 1 + span); }
          });
          return MV_ROW_CHROME + Math.max(maxLane, MV_MIN_LANES) * MV_LANE_PX;
        });
        return { page, weeks, niceH };
      });

      // Measure -- with the print-root shown off-screen at the exact print width, and everything
      // that print hides also hidden -- two things per page: (1) the header stack height (title +
      // month bar + weekday row), and (2) each week's REAL content height. The content height is
      // read from the bar layer's scrollHeight, so a note that wraps to two lines counts as the two
      // lines it actually occupies -- lane-counting alone would undercount a wrapped note and clip
      // it. reqH is therefore the true minimum a row needs; niceH is only for distributing slack.
      const prevHost = host.style.cssText;
      host.style.cssText = 'display:block; position:absolute; left:-99999px; top:0; width:' + PRINT_W + 'px;';
      const restore = [];
      host.querySelectorAll('.mv-arrow, .mv-tools, .mv-note-add, .mv-row-expand').forEach(el=>{
        restore.push([el, el.style.display]); el.style.display = 'none';
      });
      pages.forEach(d=>{
        const hdr = d.page.querySelector('.mv-header');
        const firstWeek = d.weeks[0];
        let reserve = 105; // sensible fallback
        if(hdr && firstWeek){
          const r = firstWeek.getBoundingClientRect().top - hdr.getBoundingClientRect().top;
          if(r > 20 && r < PAGE_H) reserve = r;
        }
        d.avail = PAGE_H - PAGE_PAD - reserve;
        d.reqH = d.weeks.map(wkEl=>{
          const barLayer = wkEl.querySelector('.mv-bars');
          if(!barLayer) return MV_ROW_CHROME + MV_LANE_PX;
          // Match the print track sizing (content-sized lanes) while measuring, so a wrapped note
          // is measured at the height it will actually print, then restore.
          const prevGAR = barLayer.style.gridAutoRows;
          barLayer.style.gridAutoRows = 'minmax(17px, auto)';
          const h = Math.ceil(barLayer.scrollHeight);
          barLayer.style.gridAutoRows = prevGAR;
          return Math.max(h, MV_ROW_CHROME + MV_LANE_PX); // never below ~1 line
        });
        d.reqTotal = d.reqH.reduce((a,b)=>a+b,0);
      });
      restore.forEach(([el, disp])=> el.style.display = disp);
      // Restore the print-root's ORIGINAL inline style exactly. It must NOT be forced to
      // display:none inline -- an inline display would beat the "@media print #print-root{display:block}"
      // rule and the whole calendar would print blank. Empty original => clear inline entirely so
      // the stylesheet (hidden on screen, shown in print) governs it.
      host.style.cssText = prevHost;

      // Pass 2: fill when the ACTUAL content fits, shrink only when it genuinely can't.
      pages.forEach(d=>{
        const body = d.page.querySelector('.mv-body');
        if(!d.weeks.length){ return; }
        if(d.reqTotal <= d.avail || d.avail <= 0){
          // Content fits: fill the page at FULL SIZE (no scaling). Each row starts at its real
          // content height (flex-basis=reqH) and can't shrink below it (flex-shrink:0 + explicit
          // min-height), so nothing ever spills into the row below.
          // The left-over height is handed ONLY to rows that aren't using their full 4-line block
          // (grow weight = how far a row is BELOW the 4-line floor). A row already full of comments
          // therefore stays exactly at its content height -- no dead space under it -- while the
          // emptier rows stretch to carry the slack and the grid still reaches the bottom of the
          // sheet. This is exactly "scale down the rows that aren't being used fully". If every row
          // is already at/above the floor (nothing wants slack), fall back to sharing it by weight.
          const growW = d.weeks.map((_, i)=> Math.max(0, d.niceH[i] - d.reqH[i]));
          const anyGrow = growW.some(g=> g > 0);
          d.weeks.forEach((wkEl, i)=>{
            wkEl.style.flexGrow = String(anyGrow ? growW[i] : d.niceH[i]);
            wkEl.style.flexShrink = '0';
            wkEl.style.flexBasis = d.reqH[i] + 'px';
            wkEl.style.minHeight = d.reqH[i] + 'px';
            wkEl.style.height = '';
          });
          if(body){ body.style.transform = ''; body.style.transformOrigin = ''; body.style.flex = ''; }
        } else {
          // Even at minimum, the content is taller than the page: give each row exactly its content
          // height and scale the whole month down (scaleY) just enough to fit one page. Nothing is
          // dropped or overlapped; a very full month simply prints a little smaller.
          const scale = d.avail / d.reqTotal;
          d.weeks.forEach((wkEl, i)=>{
            wkEl.style.flexGrow = '0';
            wkEl.style.flexShrink = '0';
            wkEl.style.flexBasis = 'auto';
            wkEl.style.minHeight = '';
            wkEl.style.height = d.reqH[i] + 'px';
          });
          if(body){
            body.style.flex = '0 0 auto';
            body.style.transformOrigin = 'top left';
            body.style.transform = 'scaleY(' + scale.toFixed(4) + ')';
          }
        }
      });
    } catch(err){
      console.error(err);   // never let a layout failure block the dialog
    }

    // Restore the live view. Guarded: if this throws, the print must still happen -- the
    // document is already built, and failing here would mean no dialog and no explanation.
    monthCursor = savedCursor;
    try { render(currentSchedule); } catch(err){ console.error(err); }

    // (printing-calendar was already set above, before measuring.)
    document.body.classList.add('printing-calendar');
    let done = false;
    const cleanup = ()=>{
      if(done) return;
      done = true;
      document.body.classList.remove('printing-calendar');
      host.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    try {
      window.print();
    } catch(err){
      console.error(err);
      cleanup();
      alert('The browser blocked the print dialog: ' + err.message);
      return;
    }
    // Safety net: afterprint isn't fired reliably by every browser.
    setTimeout(cleanup, 60000);
  }

  // Dynamic @page for the waterfall PDF: orientation is chosen at export time, so it can't live in
  // the static stylesheet. Injected just before printing and removed on cleanup, so it never
  // affects the month PDF (which keeps the static landscape @page).
  function setWfPageStyle(orientation, marginMm){
    removeWfPageStyle();
    const st = document.createElement('style');
    st.id = 'wf-page-style';
    st.textContent = '@media print{ @page{ size: letter ' + orientation + '; margin: ' + marginMm + 'mm; } }';
    document.head.appendChild(st);
  }
  function removeWfPageStyle(){
    const ex = document.getElementById('wf-page-style');
    if(ex) ex.remove();
  }

  // Export the WATERFALL view to PDF via the browser print dialog, styled to read like the Excel
  // sheet printed: it reuses renderSpreadsheetView() (the same header + column-layout logic that
  // backs both the on-screen grid and the Excel export), then picks page orientation and a
  // fit-to-width scale from the grid's natural width so wide multi-year schedules land in
  // landscape and narrow ones in portrait -- the way Excel's "fit to width" print would.
  // ---------- Direct PDF writer ----------
  // The waterfall PDF is written byte-by-byte here rather than handed to window.print().
  //
  // Going through the browser's print dialog meant the output depended on settings we do not
  // control -- the user's scale, margins and "Background graphics" toggle all silently change
  // it -- and the page could only ever be as faithful as a screen stylesheet stretched with
  // `zoom`. Writing the file directly gives exact control of the page box, the scale and every
  // glyph position, and it draws from the SAME column model the screen and the workbook use
  // (sheetColumnWidths / sheetRowCount / cellTextFit / computePhaseRowLayout), so all three
  // stay one layout rather than three approximations of one.
  //
  // Points are the unit throughout. charsToScreenPx() already returns a column's Excel width
  // converted at 0.75, which is numerically the same as its width in points -- so it is the
  // right function for both, despite the name.

  // Minimal TrueType reader: only what /FontFile2 embedding and text measurement need.
  function ttfRead(bytes){
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const tables = {};
    const n = dv.getUint16(4);
    for(let i=0;i<n;i++){
      const o = 12 + i*16;
      tables[String.fromCharCode(...bytes.subarray(o,o+4))] =
        { off: dv.getUint32(o+8), len: dv.getUint32(o+12) };
    }
    const head = tables.head.off, hhea = tables.hhea.off;
    const t = {
      dv, tables,
      unitsPerEm: dv.getUint16(head+18),
      bbox: [dv.getInt16(head+36), dv.getInt16(head+38), dv.getInt16(head+40), dv.getInt16(head+42)],
      ascent: dv.getInt16(hhea+4),
      descent: dv.getInt16(hhea+6),
      numHMetrics: dv.getUint16(hhea+34),
      italicAngle: tables.post ? dv.getInt32(tables.post.off+4)/65536 : 0,
    };
    const os2 = tables['OS/2'];
    t.capHeight = (os2 && os2.len >= 90) ? dv.getInt16(os2.off+88) : Math.round(t.ascent*0.7);
    // PostScript name (nameID 6), stripped to the characters a PDF name may carry
    t.name = 'EmbeddedFont';
    if(tables.name){
      const o = tables.name.off, cnt = dv.getUint16(o+2), strOff = o + dv.getUint16(o+4);
      for(let i=0;i<cnt;i++){
        const r = o+6+i*12;
        if(dv.getUint16(r+6) === 6){
          const len = dv.getUint16(r+8), off = dv.getUint16(r+10), plat = dv.getUint16(r);
          let s = '';
          for(let k=0;k<len;k++){
            const ch = bytes[strOff+off+k];
            if(plat === 3){ if(k%2) s += String.fromCharCode(ch); } else s += String.fromCharCode(ch);
          }
          s = s.replace(/[^\x21-\x7E]/g,'');
          if(s){ t.name = s; break; }
        }
      }
    }
    // best Unicode cmap subtable
    const c = tables.cmap.off, sub = dv.getUint16(c+2);
    let best = null;
    for(let i=0;i<sub;i++){
      const r = c+4+i*8, plat = dv.getUint16(r), enc = dv.getUint16(r+2);
      const score = (plat===3&&enc===1)?3 : (plat===3&&enc===10)?2 : (plat===0)?1 : 0;
      if(score && (!best || score > best.score)) best = { score, off: c + dv.getUint32(r+4) };
    }
    t.cmapOff = best ? best.off : 0;
    t.cmapFmt = best ? dv.getUint16(best.off) : 0;
    return t;
  }
  function ttfGlyph(t, u){
    const dv = t.dv, o = t.cmapOff;
    if(t.cmapFmt === 4){
      const segX2 = dv.getUint16(o+6);
      const ends = o+14, starts = ends+segX2+2, deltas = starts+segX2, ranges = deltas+segX2;
      for(let s=0;s<segX2;s+=2){
        if(u <= dv.getUint16(ends+s)){
          const st = dv.getUint16(starts+s);
          if(u < st) return 0;
          const ro = dv.getUint16(ranges+s);
          if(ro === 0) return (u + dv.getInt16(deltas+s)) & 0xFFFF;
          const gi = dv.getUint16(ranges+s+ro+(u-st)*2);
          return gi === 0 ? 0 : (gi + dv.getInt16(deltas+s)) & 0xFFFF;
        }
      }
      return 0;
    }
    if(t.cmapFmt === 12){
      const groups = dv.getUint32(o+12);
      for(let g=0;g<groups;g++){
        const r = o+16+g*12, s = dv.getUint32(r), e = dv.getUint32(r+4);
        if(u >= s && u <= e) return dv.getUint32(r+8) + (u - s);
      }
    }
    return 0;
  }
  function ttfAdvance(t, gid){
    return t.dv.getUint16(t.tables.hmtx.off + Math.min(gid, t.numHMetrics-1)*4);
  }
  function ttfTextWidth(t, str, sizePt){
    let w = 0;
    for(const ch of String(str)) w += ttfAdvance(t, ttfGlyph(t, ch.codePointAt(0)));
    return w * sizePt / t.unitsPerEm;
  }

  // WinAnsiEncoding differs from Latin-1 only at 0x80-0x9F; PDF's /Widths is indexed by BYTE,
  // so the smart-punctuation band needs its own code -> unicode map.
  const PDF_WINANSI_HI = {
    0x80:0x20AC,0x82:0x201A,0x83:0x0192,0x84:0x201E,0x85:0x2026,0x86:0x2020,0x87:0x2021,
    0x88:0x02C6,0x89:0x2030,0x8A:0x0160,0x8B:0x2039,0x8C:0x0152,0x8E:0x017D,0x91:0x2018,
    0x92:0x2019,0x93:0x201C,0x94:0x201D,0x95:0x2022,0x96:0x2013,0x97:0x2014,0x98:0x02DC,
    0x99:0x2122,0x9A:0x0161,0x9B:0x203A,0x9C:0x0153,0x9E:0x017E,0x9F:0x0178
  };
  let _winansiRev = null;
  function pdfEscape(s){
    if(!_winansiRev){ _winansiRev = {}; for(const k in PDF_WINANSI_HI) _winansiRev[PDF_WINANSI_HI[k]] = +k; }
    let out = '';
    for(const ch of String(s)){
      const u = ch.codePointAt(0);
      let code = u <= 0xFF ? u : (_winansiRev[u] || 0x3F);   // '?' rather than dropping a glyph
      if(code === 0x28 || code === 0x29 || code === 0x5C) out += '\\' + String.fromCharCode(code);
      else if(code < 32 || code > 126) out += '\\' + code.toString(8).padStart(3,'0');
      else out += String.fromCharCode(code);
    }
    return out;
  }

  const pdfNum = v => (Math.round(v*1000)/1000).toString();
  function pdfRgb(hex){
    const n = parseInt(String(hex).replace('#',''),16);
    return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255].map(v=>v.toFixed(4)).join(' ');
  }

  // A one-page PDF: filled rectangles, hairlines and WinAnsi text in embedded TrueType.
  function pdfPage(wPt, hPt){
    const ops = [];
    return {
      w: wPt, h: hPt, ops,
      // y is measured from the TOP of the page; PDF's own origin is bottom-left.
      rect(x, y, w, h, hex){
        if(w <= 0 || h <= 0) return;
        ops.push(`${pdfRgb(hex)} rg ${pdfNum(x)} ${pdfNum(hPt-(y+h))} ${pdfNum(w)} ${pdfNum(h)} re f`);
      },
      line(x1, y1, x2, y2, hex, wt){
        ops.push(`${pdfRgb(hex)} RG ${pdfNum(wt)} w ${pdfNum(x1)} ${pdfNum(hPt-y1)} m `
               + `${pdfNum(x2)} ${pdfNum(hPt-y2)} l S`);
      },
      text(str, x, baselineY, tag, sizePt, hex){
        if(str === '' || str == null) return;
        ops.push(`BT /${tag} ${pdfNum(sizePt)} Tf ${pdfRgb(hex)} rg 1 0 0 1 ${pdfNum(x)} `
               + `${pdfNum(hPt-baselineY)} Tm (${pdfEscape(str)}) Tj ET`);
      },
      // clip the next drawing to a cell, so an over-long label cannot bleed into its neighbour
      clipPush(x, y, w, h){ ops.push(`q ${pdfNum(x)} ${pdfNum(hPt-(y+h))} ${pdfNum(w)} ${pdfNum(h)} re W n`); },
      clipPop(){ ops.push('Q'); },
    };
  }

  async function pdfDeflate(u8){
    const cs = new CompressionStream('deflate');     // zlib wrapper == PDF /FlateDecode
    return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer());
  }

  // Serialise one page plus its embedded fonts. `fonts` is [{tag, ttf, raw, deflated}].
  async function pdfSerialize(page, fonts){
    const enc = new TextEncoder();
    const chunks = []; let len = 0;
    const push = u8 => { chunks.push(u8); len += u8.length; };
    const put = s => push(enc.encode(s));
    const offsets = [];
    const nObjs = 4 + fonts.length*3;
    const fontObj = i => 5 + i*3, descObj = i => 6 + i*3, fileObj = i => 7 + i*3;
    const startObj = n => { offsets[n] = len; put(`${n} 0 obj\n`); };
    const endObj = () => put('endobj\n');

    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    startObj(1); put('<< /Type /Catalog /Pages 2 0 R >>\n'); endObj();
    startObj(2); put('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n'); endObj();
    startObj(3);
    put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNum(page.w)} ${pdfNum(page.h)}] `
      + `/Resources << /Font << ${fonts.map((f,i)=>`/${f.tag} ${fontObj(i)} 0 R`).join(' ')} >> >> `
      + `/Contents 4 0 R >>\n`);
    endObj();
    const content = await pdfDeflate(enc.encode(page.ops.join('\n')));
    startObj(4); put(`<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`);
    push(content); put('\nendstream\n'); endObj();

    for(let i=0;i<fonts.length;i++){
      const f = fonts[i], t = f.ttf, sc = 1000 / t.unitsPerEm;
      const widths = [];
      for(let c=32;c<=255;c++){
        const u = (c >= 0x80 && c <= 0x9F) ? (PDF_WINANSI_HI[c] || 0) : c;
        widths.push(u ? Math.round(ttfAdvance(t, ttfGlyph(t,u)) * sc) : 0);
      }
      startObj(fontObj(i));
      put(`<< /Type /Font /Subtype /TrueType /BaseFont /${t.name} /FirstChar 32 /LastChar 255 `
        + `/Widths [${widths.join(' ')}] /Encoding /WinAnsiEncoding `
        + `/FontDescriptor ${descObj(i)} 0 R >>\n`);
      endObj();
      startObj(descObj(i));
      put(`<< /Type /FontDescriptor /FontName /${t.name} /Flags 32 `
        + `/FontBBox [${t.bbox.map(v=>Math.round(v*sc)).join(' ')}] /ItalicAngle ${pdfNum(t.italicAngle)} `
        + `/Ascent ${Math.round(t.ascent*sc)} /Descent ${Math.round(t.descent*sc)} `
        + `/CapHeight ${Math.round(t.capHeight*sc)} /StemV 80 /FontFile2 ${fileObj(i)} 0 R >>\n`);
      endObj();
      // Length1 is the UNCOMPRESSED font program length; Length is the stream's. The bytes are
      // already Flate-compressed in the file (that is how they are stored), so they go straight
      // in without a recompression round trip.
      startObj(fileObj(i));
      put(`<< /Length ${f.deflated.length} /Length1 ${f.raw.length} /Filter /FlateDecode >>\nstream\n`);
      push(f.deflated); put('\nendstream\n'); endObj();
    }

    const xref = len;
    put(`xref\n0 ${nObjs+1}\n0000000000 65535 f \n`);
    for(let n=1;n<=nObjs;n++) put(`${String(offsets[n]).padStart(10,'0')} 00000 n \n`);
    put(`trailer\n<< /Size ${nObjs+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

    const out = new Uint8Array(len);
    let p = 0;
    for(const c of chunks){ out.set(c, p); p += c.length; }
    return out;
  }

  // Lay the waterfall out in points and draw it. Mirrors renderSpreadsheetView cell for cell.
  async function buildWaterfallPdf(schedule){
    await carlitoReady;
    if(!carlitoBytes['400'] || !carlitoBytes['700'])
      throw new Error('The embedded font is not available, so the PDF cannot be written.');
    const reg = ttfRead(carlitoBytes['400']), bold = ttfRead(carlitoBytes['700']);

    const yearBlocks = computeYearBlocks(schedule.weeks);
    const blockLayout = computeBlockLayout(schedule, yearBlocks);
    const { blockSlotMaps, blockMaxConcurrent, blockOccupancy, blockSimSlot } = blockLayout;
    const colWidthsFor = sheetColumnWidths(schedule, yearBlocks, blockLayout);
    const maxRows = sheetRowCount(schedule, yearBlocks);
    const notesByIdx = schedule.notesByIdx || {};

    // --- geometry, all in points -------------------------------------------------------------
    // charsToScreenPx() converts an Excel column width at 0.75, which IS its width in points.
    const blockCols = colWidthsFor.map(b => b.cols.map(c => ({ key:c.key, chars:c.chars, w: charsToScreenPx(c.chars) })));
    const blockX = []; let gx = 0;
    blockCols.forEach(cols=>{ blockX.push(gx); cols.forEach(c=>{ gx += c.w; }); });
    const gridW = gx;

    // Row heights follow Excel: a screen pixel of row height is 0.75pt. Every row is the default
    // unless it was dragged, exactly as the grid is -- text is fitted to the row rather than the
    // row grown to the text.
    //
    // This used to grow a row for a note needing more lines, which put the PDF out of step with
    // the screen AND with sheetGridMetrics(), whose orientation decision has always measured
    // height as a flat rows x ROW_DEFAULT_PX ("a note wrapping to a second line should not be
    // able to turn the page over"). Now all three agree.
    const HDR_ROW_PT = ROW_DEFAULT_PX * ROW_PX_TO_PT;
    const rowPt = [];
    for(let r=0;r<maxRows;r++) rowPt.push((rowHeights[r] || ROW_DEFAULT_PX) * ROW_PX_TO_PT);
    const gridH = rowPt.reduce((a,b)=>a+b, HDR_ROW_PT);

    // --- header block ------------------------------------------------------------------------
    const hd = computeHeaderDefaults(schedule);
    const hLeft = headerLine('left', hd);
    const hCentre = ['c1','c2','c3'].map(id=>headerLine(id, hd)).filter(Boolean);
    const hRight = ['r1','r2','r3'].map(id=>headerLine(id, hd)).filter(Boolean);
    const HDR_TITLE_PT = 11, HDR_SUB_PT = 8, HDR_GAP_PT = 10;
    const hdrLines = Math.max(hCentre.length, hRight.length, hLeft ? 1 : 0);
    const headerH = hdrLines ? (HDR_TITLE_PT*1.35 + (hdrLines-1)*HDR_SUB_PT*1.35 + HDR_GAP_PT) : 0;

    // --- page, orientation and a WHOLE-PERCENT fit scale --------------------------------------
    // Excel walks its fit-to-page scale down in 1% steps; matching that is what keeps the two
    // outputs the same size rather than merely similar.
    // Margins are the workbook's, in points: ws.pageSetup.margins is
    // {left:.25, right:.25, top:.75, bottom:.75, header:.3, footer:.3} inches. The reference
    // export confirms them -- its grid starts 55.44pt down the page, against a 54pt top margin,
    // and its header text sits at 22.32pt against a 21.6pt header margin.
    const MARGIN_PT = SHEET_PAGE_MARGIN_PT, PAPER = SHEET_PAPER_PT;
    // Orientation is decided the way exportExcel decides it, NOT the way the old print path did.
    // The print path chose on width alone; the workbook prefers landscape from three year-blocks
    // and only overrides when the other orientation prints meaningfully larger. Since the whole
    // point of this writer is that the PDF and the workbook are one layout, a calendar must not
    // be able to come out portrait in one and landscape in the other.
    // Decided from the SHARED metrics, not from this writer's own precise gridH, so the page
    // turns the same way here as it does in the workbook.
    const metrics = sheetGridMetrics(schedule, yearBlocks, colWidthsFor);
    const pick = sheetPageOrientation(metrics.gridW, metrics.gridH, yearBlocks.length);
    const orientation = pick.orientation;
    const paper = PAPER[orientation];
    // The real scale uses the actual body box; the header text lives in the top margin, as
    // Excel's does, so it costs the grid nothing.
    const bodyTop = MARGIN_PT.t;
    const bodyH = paper.h - MARGIN_PT.t - MARGIN_PT.b;
    const raw = Math.min((paper.w - MARGIN_PT.l - MARGIN_PT.r) / gridW, bodyH / gridH);
    // Excel steps its fit-to-page scale in whole percent; matching that is what keeps the two
    // the same size rather than merely similar.
    const scale = Math.max(0.1, Math.floor(Math.min(raw, 1) * 100) / 100);

    const page = pdfPage(paper.w, paper.h);
    // Paint the sheet white FIRST. A PDF page has no background of its own -- it is transparent,
    // and a viewer that composites onto anything but white (thumbnailers and rasterisers
    // routinely composite onto black) turns every black glyph invisible and the page into a
    // black rectangle. Excel's own export paints one too.
    page.rect(0, 0, paper.w, paper.h, '#FFFFFF');
    const availW = paper.w - MARGIN_PT.l - MARGIN_PT.r;
    const originX = MARGIN_PT.l + Math.max(0, (availW - gridW*scale) / 2);   // centred, like Excel
    const originY = MARGIN_PT.t;

    const S = v => v * scale;
    const baselineIn = (topY, h, lines, size, i) => {
      // CSS half-leading, using the font's real metrics, so a line sits where the grid puts it
      const lh = size * SHEET_LINE_RATIO;
      const asc = reg.ascent / reg.unitsPerEm, desc = reg.descent / reg.unitsPerEm;
      const blockH = lines * lh;
      const top = topY + Math.max(0, (h - blockH) / 2);
      return top + i*lh + (lh - (asc - desc)*size)/2 + asc*size;
    };
    const drawLines = (txt, cx, cellTop, cellH, size, colour, tag, ttf, maxW)=>{
      const lines = String(txt).split('\n');
      lines.forEach((ln, i)=>{
        const w = ttfTextWidth(ttf, ln, size);
        const x = cx - w/2;
        page.text(ln, x, baselineIn(cellTop, cellH, lines.length, size, i), tag, size, colour);
      });
    };

    // --- header text -----------------------------------------------------------------------
    // Drawn in the TOP MARGIN band, at Excel's header margin, not above the grid in the body.
    // That is where Excel puts &L/&C/&R, and it is why the grid can start at exactly the top
    // margin no matter how many header lines there are -- the header costs the grid nothing.
    // Header type is NOT scaled with the grid: Excel's page header keeps its point size however
    // hard the sheet is shrunk to fit.
    if(hdrLines){
      const midX = originX + gridW*scale/2;
      const rightEdge = originX + gridW*scale;
      // The band runs from the header margin to the top margin; the grid begins immediately
      // below it. Three header lines at full size need more room than that band has, and the
      // overflow ran straight into the grid's top edge -- so the header type shrinks to fit
      // rather than the grid moving, which is what keeps the table top calibrated.
      // What has to fit is the FIRST ASCENDER to the LAST DESCENDER, not a sum of line boxes:
      // sizing by line boxes left the final line's baseline sitting exactly on the grid edge
      // with its descenders below it, so "Writer's Room Opens" was sliced by the header row.
      const bandH = MARGIN_PT.t - MARGIN_PT.hdr - 1;      // 1pt so it never quite touches
      const asc = reg.ascent / reg.unitsPerEm, dsc = Math.abs(reg.descent / reg.unitsPerEm);
      const needAt1 = asc*HDR_TITLE_PT
        + (hdrLines > 1 ? HDR_TITLE_PT*1.35 + (hdrLines-2)*HDR_SUB_PT*1.35 : 0)
        + dsc*(hdrLines > 1 ? HDR_SUB_PT : HDR_TITLE_PT);
      const hS = needAt1 > bandH ? bandH/needAt1 : 1;
      const T = HDR_TITLE_PT*hS, U = HDR_SUB_PT*hS;
      const baseY = MARGIN_PT.hdr + asc*T;          // first baseline, inside the band
      const stackY = i => baseY + (i ? T*1.35 + (i-1)*U*1.35 : 0);
      if(hLeft) page.text(hLeft, originX, baseY, 'F1', U, '#666666');
      hCentre.forEach((ln, i)=>{
        const size = i === 0 ? T : U;
        const tag = i === 0 ? 'F2' : 'F1', ttf = i === 0 ? bold : reg;
        page.text(ln, midX - ttfTextWidth(ttf, ln, size)/2, stackY(i), tag, size, '#000000');
      });
      hRight.forEach((ln, i)=>{
        const tag = i === 0 ? 'F2' : 'F1', ttf = i === 0 ? bold : reg;
        page.text(ln, rightEdge - ttfTextWidth(ttf, ln, U), baseY + i*U*1.35, tag, U, '#000000');
      });
    }

    // The grid always begins at the top margin; the header sat above it, in the margin.
    const gridTop = originY;
    const HEADER_FILL_PDF = '#D9D9D9', FRAME = '#1E1D1B', HDR_RULE = '#BFBFBF';
    const interior = SHEET_GRIDLINES === 'none' ? null
                   : (SHEET_GRIDLINES === 'dotted' ? '#DBDBDB' : '#BFBFBF');

    // --- column header row ---------------------------------------------------------------------
    let hy = gridTop, hh = S(HDR_ROW_PT);
    yearBlocks.forEach((b, bi)=>{
      const cols = blockCols[bi];
      let x = originX + S(blockX[bi]);
      page.rect(x, hy, S(cols.reduce((a,c)=>a+c.w,0)), hh, HEADER_FILL_PDF);
      const put = (label, w)=>{
        const size = S(HDR_ROW_PT*0.55);
        page.clipPush(x, hy, w, hh);
        drawLines(label, x + w/2, hy, hh, size, '#000000', 'F2', bold, w);
        page.clipPop();
        x += w;
      };
      put('Date', S(cols[0].w));
      put(String(b.year), S(cols.slice(1,-1).reduce((a,c)=>a+c.w,0)));
      put('Notes', S(cols[cols.length-1].w));
    });
    page.line(originX, hy+hh, originX + S(gridW), hy+hh, HDR_RULE, 0.75);

    // --- body ------------------------------------------------------------------------------------
    let ry = gridTop + hh;
    for(let r=0;r<maxRows;r++){
      const rh = S(rowPt[r]);
      yearBlocks.forEach((b, bi)=>{
        const cols = blockCols[bi];
        const bx = originX + S(blockX[bi]);
        if(r >= b.count) return;                       // shorter block: leave the row blank
        const w = schedule.weeks[b.startIdx + r];
        if(!w) return;

        // date cell
        const dw = S(cols[0].w);
        const dsize = S(11);
        page.clipPush(bx, ry, dw, rh);
        drawLines(fmtShort(w.date), bx + dw/2, ry, rh, dsize, '#000000', 'F2', bold, dw);
        page.clipPop();

        if(w.cells.length && w.cells[0].type==='hiatus'){
          const hKey = w.date.toISOString().slice(0,10);
          const hTxt = hiatusTextFor(hKey), hCol = hiatusColorFor(hKey);
          const bandW = S(cols.slice(1).reduce((a,c)=>a+c.w,0));
          let av = 0; cols.forEach((c,ci)=>{ if(ci>0) av += c.chars; });
          const hs = hiatusFontSizeFor(hKey);
          const fit = cellTextFit(hTxt, av, { basePx: hs||11, manual: hs!==undefined,
                                              rowPx: rowHeights[r] || ROW_DEFAULT_PX });
          page.rect(bx + dw, ry, bandW, rh, hCol);
          page.clipPush(bx + dw, ry, bandW, rh);
          drawLines(hTxt, bx + dw + bandW/2, ry, rh, S(11*fit.scale),
                    textColorFor(hCol), 'F1', reg, bandW);
          page.clipPop();
          return;
        }

        const layout = computePhaseRowLayout(w, blockMaxConcurrent[bi], blockSlotMaps[bi],
                                             blockOccupancy[bi], r, blockSimSlot[bi]);
        let slot = 0, cx = bx + dw;
        layout.forEach(cell=>{
          let cw = 0, av = 0;
          for(let k=0;k<cell.colspan;k++){
            const c = cols[1 + slot + k];
            if(c){ cw += S(c.w); av += c.chars; }
          }
          slot += cell.colspan;
          if(cell.kind === 'phase' || cell.kind === 'simpost' || cell.kind === 'phaseHiatus'){
            const fill = cell.kind === 'simpost' ? SIMPOST_COLOR : cell.color;
            // A per-phase hiatus is a hiatus: its fill is dark and user-chosen, so it keeps the
            // contrast rule. Phase and Simultaneous Post labels are black like everything else.
            const ink  = cell.kind === 'phaseHiatus' ? textColorFor(cell.color) : GRID_TEXT_COLOR;
            page.rect(cx, ry, cw, rh, fill);
            let fit;
            if(cell.kind === 'phaseHiatus'){
              const k = cell.weekIso + '|' + cell.phaseKey;
              const ps = hiatusFontSizeFor(k);
              fit = cellTextFit(cell.label||'', av, { basePx: ps||11, manual: ps!==undefined,
                                                      rowPx: rowHeights[r] || ROW_DEFAULT_PX });
            } else {
              fit = cellTextFit(cell.label||'', av, {});
            }
            page.clipPush(cx, ry, cw, rh);
            drawLines(cell.label||'', cx + cw/2, ry, rh, S(11*fit.scale), ink, 'F1', reg, cw);
            page.clipPop();
          }
          cx += cw;
        });

        // notes cell
        const nw = S(cols[cols.length-1].w);
        const nx = bx + S(cols.reduce((a,c)=>a+c.w,0)) - nw;
        const wk = w.date.toISOString().slice(0,10);
        const nTxt = effectiveNoteText(wk, autoNotesForView(notesByIdx[b.startIdx+r], 'sheet'));
        if(nTxt){
          const nCol = noteColorFor(wk), ns = noteFontSizeFor(wk);
          const fit = cellTextFit(nTxt, colWidthsFor[bi].notes,
                                  { basePx: ns||11, manual: ns!==undefined, rowPx: rowHeights[r] || ROW_DEFAULT_PX });
          page.rect(nx, ry, nw, rh, nCol);
          page.clipPush(nx, ry, nw, rh);
          drawLines(nTxt, nx + nw/2, ry, rh, S(11*fit.scale), textColorFor(nCol), 'F1', reg, nw);
          page.clipPop();
        }
      });

      if(interior && r < maxRows-1)
        page.line(originX, ry+rh, originX + S(gridW), ry+rh, interior, 0.4);
      ry += rh;
    }

    // --- frame and year-block separators -----------------------------------------------------
    const gridBottom = ry, right = originX + S(gridW);
    page.line(originX, gridTop, right, gridTop, FRAME, 1.2);
    page.line(originX, gridBottom, right, gridBottom, FRAME, 1.2);
    page.line(originX, gridTop, originX, gridBottom, FRAME, 1.2);
    page.line(right, gridTop, right, gridBottom, FRAME, 1.2);
    for(let bi=1; bi<yearBlocks.length; bi++){
      const x = originX + S(blockX[bi]);
      page.line(x, gridTop, x, gridBottom, FRAME, 1.2);
    }

    const fonts = [
      { tag:'F1', ttf:reg,  raw:carlitoBytes['400'], deflated:carlitoDeflated['400'] },
      { tag:'F2', ttf:bold, raw:carlitoBytes['700'], deflated:carlitoDeflated['700'] },
    ];
    const bytes = await pdfSerialize(page, fonts);
    return { bytes, orientation, scale, gridW, gridH, pageW: paper.w, pageH: paper.h };
  }

  async function exportWaterfallPdfDirect(){
    if(!currentSchedule || !currentSchedule.weeks || !currentSchedule.weeks.length){
      alert('Add at least one phase with a start date before exporting the waterfall.');
      return;
    }
    let out;
    try { out = await buildWaterfallPdf(currentSchedule); }
    catch(err){
      console.error(err);
      alert('Something went wrong writing the waterfall PDF: ' + err.message);
      return;
    }
    const titleRaw = (document.getElementById('show-title').value || '').trim();
    const safe = titleRaw.replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim();
    const name = (safe ? safe + ' ' : '') + 'Planning Calendar.pdf';
    const url = URL.createObjectURL(new Blob([out.bytes], {type:'application/pdf'}));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportWaterfallPdf(){
    if(!currentSchedule || !currentSchedule.weeks || !currentSchedule.weeks.length){
      alert('Add at least one phase with a start date before exporting the waterfall.');
      return;
    }
    const host = document.getElementById('print-root');
    if(!host) return;
    // Clear leftovers from any print that didn't finish, so a stuck class can't blank the app.
    document.body.classList.remove('printing-calendar', 'printing-waterfall');
    removeWfPageStyle();
    host.innerHTML = '';

    try {
      host.innerHTML = '<div class="wf-print wf-grid-' + SHEET_GRIDLINES + '">' + renderSpreadsheetView(currentSchedule) + '</div>';
      const tools = host.querySelector('.hdr-tools'); // interactive toolbar -- never on paper
      if(tools) tools.remove();
    } catch(err){
      console.error(err);
      host.innerHTML = '';
      alert('Something went wrong building the waterfall for print: ' + err.message);
      return;
    }

    // Fit the ENTIRE grid (header + every week row) onto exactly ONE page, and pick the
    // orientation that lets it print as LARGE as possible -- this is what Excel's "fit sheet on
    // one page" does, and why a tall/narrow calendar lands in portrait while a wide multi-year one
    // lands in landscape. We measure the grid's natural width AND height off-screen, compute the
    // fit-to-page scale for each orientation (min of the width- and height-fit), and take the
    // orientation with the larger scale. Only shrink, never enlarge past 100% (like Excel).
    const MARGIN_MM = 5;   // ~0.2" -- Excel's "Narrow" preset, so the grid gets most of the sheet
    const px = inches => Math.round((inches - 2 * MARGIN_MM / 25.4) * 96); // printable px @96dpi
    const PAGE = { portrait: { w: px(8.5), h: px(11) }, landscape: { w: px(11), h: px(8.5) } };
    let orientation = 'portrait', scale = 1, natW = 0;
    try {
      const prev = host.style.cssText;
      host.style.cssText = 'display:block; position:absolute; left:-99999px; top:0; width:auto;';
      const table = host.querySelector('.sheet-table');
      const hdr = host.querySelector('.cal-header-bar');
      const tRect = table ? table.getBoundingClientRect() : { width: 0, height: 0 };
      const hRect = hdr ? hdr.getBoundingClientRect() : { width: 0, height: 0 };
      const W = Math.ceil(Math.max(tRect.width, hRect.width));
      const H = Math.ceil(hRect.height + tRect.height);
      host.style.cssText = prev;
      natW = W;
      // Orientation follows the grid's WIDTH (its column count), the way Excel does: stay portrait
      // while the grid fits the portrait page width, and switch to landscape only once there are
      // enough columns that it no longer does. (Choosing by raw max-scale instead would flip a
      // short, wide 2-year grid into landscape even though Excel keeps such a calendar portrait.)
      orientation = (W > 0 && W <= PAGE.portrait.w) ? 'portrait' : 'landscape';
      const page = PAGE[orientation];
      // Fill the chosen page up to the binding edge (width for a short/wide grid, height for a
      // tall one), scaling UP if needed so the grid uses the sheet with only the thin margins
      // around it -- capped at 2x so a tiny schedule doesn't balloon. Any leftover slack on the
      // non-binding axis is split evenly by the centering rule in the print CSS.
      // Height gets a 4% safety cushion because per-row sub-pixel rounding across many rows makes
      // the print a hair taller than the measured height -- without it a tall grid can spill one
      // row onto a 2nd page. It only bites the height-bound (tall/landscape) case; a width-bound
      // grid still fills the page width exactly.
      scale = Math.min(Math.min(page.w / W, (page.h * 0.96) / H), 2) * 0.99;
    } catch(err){ console.error(err); }

    const wrap = host.querySelector('.wf-print');
    if(wrap){
      // Pin the grid to the EXACT width we measured so the print can't reflow it narrower (which
      // would wrap text, make it taller than measured, and spill the last row onto a 2nd page).
      // zoom then scales this fixed-width block to fit the page; margin:auto (print CSS) centers it.
      if(natW > 0) wrap.style.width = natW + 'px';
      wrap.style.zoom = String(scale);
    }
    setWfPageStyle(orientation, MARGIN_MM);

    document.body.classList.add('printing-waterfall');
    let done = false;
    const cleanup = ()=>{
      if(done) return;
      done = true;
      document.body.classList.remove('printing-waterfall');
      removeWfPageStyle();
      host.innerHTML = '';
      if(wrap) wrap.style.zoom = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    try {
      window.print();
    } catch(err){
      console.error(err);
      cleanup();
      alert('The browser blocked the print dialog: ' + err.message);
      return;
    }
    setTimeout(cleanup, 60000);
  }

  // ---------- Month view: note editing ----------
  // These notes belong to the month view alone. They're keyed by day and never touch userNotes,
  // so they can't collide with the waterfall's week-level notes -- and by the same token they
  // don't appear in the waterfall or the Excel export. Waterfall notes DO show here (placed on
  // their picked day, or Monday by default); the flow is deliberately one-way.
  let activeMvNote = null;
  function closeMvNoteEditor(){
    const pop = document.getElementById('mv-note-pop');
    if(pop) pop.remove();
    activeMvNote = null;
  }
  // Write the active editor's text/colour into the stores WITHOUT re-rendering or closing. Split
  // out so that opening another note (or clicking a "+") can save the current one first instead
  // of throwing it away -- re-rendering here would invalidate the anchor the caller is about to
  // use. Returns true if anything was written.
  function writeActiveMvNote(){
    if(!activeMvNote) return false;
    const {kind, weekKey, dayIso, lane, editIndex, textarea, pendingColor} = activeMvNote;
    const text = textarea.value.trim();
    if(kind === 'wf'){
      // A waterfall-owned note: write it back to the week store so the Waterfall and the Excel
      // export see the same edit. Pin it to this day so it stays where it was clicked.
      const autoNotes = (currentSchedule.notesByIdx && currentSchedule.weeks) ? (()=>{
        const idx = currentSchedule.weeks.findIndex(w=>isoOf(w.date)===weekKey);
        return idx>=0 ? autoNotesForView(currentSchedule.notesByIdx[idx]||[], 'month') : [];
      })() : [];
      saveNoteEdit(weekKey, text, autoNotes, dayIso);
      if(pendingColor){
        if(pendingColor.toUpperCase() === MILESTONE_COLOR.toUpperCase()) delete noteColors[weekKey];
        else noteColors[weekKey] = pendingColor;
      }
      if(!effectiveNoteText(weekKey, autoNotes)) delete noteColors[weekKey];
    } else {
      // Day notes are a LIST: editing one note touches only that note, adding creates a new
      // entry, and committing empty text removes the note -- and with it its highlight.
      // No colour picked = default (purple): stored as null so it renders MILESTONE_COLOR.
      const list = dayNoteList(dayIso).slice();
      const idx = (editIndex != null && editIndex >= 0 && editIndex < list.length) ? editIndex : -1;
      if(text){
        const entry = {text, lane:(lane!=null?lane:null), color:pendingColor || (idx>=0 ? list[idx].color : null) || null};
        if(entry.color && entry.color.toUpperCase() === MILESTONE_COLOR.toUpperCase()) entry.color = null;
        if(idx >= 0) list[idx] = entry; else list.push(entry);
      } else if(idx >= 0){
        list.splice(idx, 1);   // deleting all text removes the note (and its colour with it)
      }
      if(list.length) dayNotes[dayIso] = list;
      else { delete dayNotes[dayIso]; delete dayNoteColors[dayIso]; }
    }
    return true;
  }
  function commitMvNoteEditor(){
    if(!activeMvNote) return;
    writeActiveMvNote();
    closeMvNoteEditor();
    markDirty();
    render(currentSchedule);
  }
  // Find, in the freshly-rendered grid, the element equivalent to one that was just clicked --
  // used after committing a note (which re-renders and detaches the original click target) so the
  // editor can re-open on the live node. Matches an existing note by day+kind+index, or a "+" by
  // day (preferring the same lane), falling back to any "+" on that day.
  function relocateNoteAnchor(t){
    if(!t) return null;
    if(!t.isAdd && t.index !== undefined && t.index !== null && t.index !== ''){
      const el = document.querySelector(
        `.mv-note-block[data-note-kind="${t.kind}"][data-note-day="${t.day}"][data-note-index="${t.index}"]`);
      if(el) return el;
    }
    if(t.kind === 'wf' && !t.isAdd){
      const el = document.querySelector(`.mv-note-block[data-note-kind="wf"][data-note-day="${t.day}"]`);
      if(el) return el;
    }
    if(t.day){
      const adds = Array.from(document.querySelectorAll(`.mv-note-add[data-note-day="${t.day}"]`));
      if(adds.length){
        return adds.find(a=>a.style.gridRow === t.gridRow) || adds[0];
      }
    }
    return null;
  }
  function openMvNoteEditor(anchor, weekKey, dayIso, kind){
    // Clicking straight from one note to another "+" (common when clicking "out" onto the grid,
    // where an invisible per-lane "+" sits) must SAVE the note in progress AND show it right away.
    // Capture what was clicked, fully commit the open note (which re-renders so it appears), then
    // re-locate the clicked target in the fresh DOM and continue with it.
    if(activeMvNote){
      const target = {
        week: anchor.dataset.noteWeek, day: anchor.dataset.noteDay,
        kind: anchor.dataset.noteKind || 'day', index: anchor.dataset.noteIndex,
        gridRow: anchor.style.gridRow, isAdd: anchor.classList.contains('mv-note-add')
      };
      commitMvNoteEditor(); // write + close + markDirty + render
      const fresh = relocateNoteAnchor(target);
      if(!fresh) return;    // nothing to re-open (e.g. the day is now full) -- the note is saved
      anchor = fresh;
      weekKey = fresh.dataset.noteWeek;
      dayIso = fresh.dataset.noteDay;
      kind = fresh.dataset.noteKind || 'day';
    }
    closeMvNoteEditor();
    const isWf = (kind === 'wf');
    // Which line was clicked. Notes remember it so they stay on the line you chose.
    const laneAttr = anchor.style.gridRow ? (parseInt(anchor.style.gridRow, 10) - 1) : null;
    let editIdx = null;
    // Prefill: a waterfall note shows its current text (auto or overridden); a day note shows
    // its own, and a blank day starts empty.
    let curText, curColor;
    if(isWf){
      // A waterfall note is a WEEK-level thing: an override replaces the week's whole text.
      // So show every note the week currently has, not just the line clicked -- otherwise
      // saving would silently drop the others (e.g. editing Thanksgiving would delete
      // "Day after Thanksgiving" from the same week).
      const autoNotes = (currentSchedule.notesByIdx && currentSchedule.weeks) ? (()=>{
        const idx = currentSchedule.weeks.findIndex(w=>isoOf(w.date)===weekKey);
        return idx>=0 ? autoNotesForView(currentSchedule.notesByIdx[idx]||[], 'month') : [];
      })() : [];
      curText = effectiveNoteText(weekKey, autoNotes);
      curColor = noteColors[weekKey] || MILESTONE_COLOR;
    } else {
      // Editing an existing note (index carried on the clicked block) prefills just that one;
      // a "+" starts blank. Other notes on the day are untouched either way.
      const list = dayNoteList(dayIso);
      const ni = anchor.dataset.noteIndex !== undefined ? parseInt(anchor.dataset.noteIndex, 10) : -1;
      const entry = (ni >= 0 && ni < list.length) ? list[ni] : null;
      curText = entry ? (entry.text || '') : '';
      curColor = (entry && entry.color) || MILESTONE_COLOR;
      editIdx = entry ? ni : null;
    }
    const swatches = EXCEL_STANDARD_COLORS.map(c =>
      `<span class="color-swatch${c.toUpperCase()===curColor.toUpperCase()?' selected':''}" data-color="${c}" title="${c}" style="background:${c};"></span>`
    ).join('');
    const pop = document.createElement('div');
    pop.id = 'mv-note-pop';
    pop.className = 'mv-note-pop';
    const scopeNote = isWf
      ? 'Also updates the Waterfall + Excel'
      : 'Month view only';
    const lineHint = isWf ? '' : 'Up to 3 lines \u00b7 Enter for a new line \u00b7 ';
    pop.innerHTML = `<div class="mv-note-pop-day">${fmtShort(parseDateUTC(dayIso))}</div>
      <textarea rows="3" placeholder="Note text${isWf?' (multi-line OK)':' \u2014 Enter for a new line, up to 3'}">${curText.replace(/</g,'&lt;')}</textarea>
      <div class="note-color-row" title="Highlight color">${swatches}</div>
      <div class="mv-note-pop-hint">${scopeNote} \u00b7 ${lineHint}Tab or Ctrl/Cmd&#8209;Enter to save \u00b7 Esc to cancel</div>`;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 4) + 'px';
    pop.style.left = (window.scrollX + r.left) + 'px';
    // Clamp to the viewport using the popover's REAL measured size (mirrors openPhaseColorPop):
    // flip above the day when it would overflow the bottom, and pull it in from the right edge --
    // otherwise a note near the bottom/right of the screen opens partly off-screen and unreachable.
    const pr = pop.getBoundingClientRect();
    if(pr.right > window.innerWidth - 8) pop.style.left = (window.scrollX + window.innerWidth - pr.width - 8) + 'px';
    if(pr.bottom > window.innerHeight - 8) pop.style.top = (window.scrollY + r.top - pr.height - 4) + 'px';
    const textarea = pop.querySelector('textarea');
    // A month-view day note is capped at 3 lines (it prints as one 3-line block). Waterfall notes
    // aren't capped -- there each line is a separate milestone across the week.
    if(!isWf){
      const cap3 = ()=>{
        const lines = textarea.value.split('\n');
        if(lines.length > 3) textarea.value = lines.slice(0,3).join('\n');
      };
      textarea.addEventListener('input', cap3);
      textarea.addEventListener('keydown', e=>{
        if(e.key === 'Enter' && !e.metaKey && !e.ctrlKey && textarea.value.split('\n').length >= 3){
          e.preventDefault(); // already at 3 lines -- don't add a 4th
        }
      });
    }
    textarea.focus(); textarea.select();
    activeMvNote = {kind: isWf ? 'wf' : 'day', weekKey, dayIso, lane: laneAttr, editIndex: editIdx, textarea, pendingColor:null};
    pop.querySelectorAll('.color-swatch').forEach(sw=>{
      sw.addEventListener('mousedown', e=>e.preventDefault());
      sw.addEventListener('click', e=>{
        e.stopPropagation();
        if(!activeMvNote) return;
        activeMvNote.pendingColor = sw.dataset.color;
        pop.querySelectorAll('.color-swatch').forEach(s=>s.classList.toggle('selected', s===sw));
      });
    });
    pop.addEventListener('click', e=>e.stopPropagation());
    textarea.addEventListener('keydown', e=>{
      if(e.key === 'Escape'){ e.preventDefault(); closeMvNoteEditor(); }
      else if(e.key === 'Tab' || ((e.metaKey||e.ctrlKey) && e.key === 'Enter')){ e.preventDefault(); commitMvNoteEditor(); }
    });
  }
  document.getElementById('table-wrap').addEventListener('click', e=>{
    const exp = e.target.closest && e.target.closest('.mv-row-expand');
    if(exp){
      e.stopPropagation();
      if(exp.classList.contains('is-full')) return;
      const k = exp.dataset.expandWeek;
      mvExtraLanes[k] = (mvExtraLanes[k] || 0) + 1;
      markDirty();
      render(currentSchedule);
      return;
    }
    const hit = e.target.closest && e.target.closest('.mv-note-click');
    if(!hit) return;
    e.stopPropagation();
    openMvNoteEditor(hit, hit.dataset.noteWeek, hit.dataset.noteDay, hit.dataset.noteKind || 'day');
  });
  // Clicking anywhere else commits, matching the waterfall editor's behaviour.
  document.addEventListener('click', e=>{
    if(!activeMvNote) return;
    if(e.target.closest && (e.target.closest('#mv-note-pop') || e.target.closest('.mv-note-click'))) return;
    commitMvNoteEditor();
  });

  // ---------- Restore saved data when this file was produced by "Save to File" ----------
  function restoreSavedState(){
    const el = document.getElementById('saved-state');
    if(!el) return;
    let snap;
    try { snap = JSON.parse(el.textContent); } catch(e){ return; }
    if(!snap || typeof snap !== 'object') return;
    applyStateSnapshot(snap);
  }

  // Everything that must run after a snapshot has been applied, to bring the visible UI back in
  // line with the restored state. Three paths need it -- initial page load, opening a file, and
  // recovering a backup -- and each used to keep its own hand-maintained copy of the list, which
  // drifted. Opening a file never called refreshEpisodesUI(), which is the only thing that hides
  // the "Complete Show Info" notice and renders the episode rows (update() deliberately doesn't:
  // rebuilding the rows on every recompute would blow away focus mid-typing). So opening a
  // complete calendar from a blank page restored every field correctly but left the blank page's
  // stale "missing: Season, ..." notice on screen and the episode list empty. Keep this as the
  // single list so the three paths can't diverge again.
  function refreshAfterRestore(){
    setSidebarTab(sidebarTab);
    syncRegionTracking();
    refreshEpisodesUI();
    refreshSimPostUI();
    update();
  }

  // Apply a captured state snapshot (see captureSnapshot()) to the live document: DOM fields,
  // dynamic rows, and every module-scope state map. Shared by loading a saved file, recovering a
  // crash backup, and undo/redo -- all three need the same "replace everything" semantics, not a
  // merge (an undo step, or a different opened file, may need to remove entries the current
  // in-memory state has and the snapshot doesn't).
  function applyStateSnapshot(snap){
    // 1. Rebuild custom phase rows, then set their saved counter
    if(Array.isArray(snap.episodeDefs)){
      episodeDefs = snap.episodeDefs.map(e=>({
        id: e.id || ('ep'+(++episodeCounter)),
        name: e.name || '', days: (e.days===undefined?'':e.days),
        nameEdited: !!e.nameEdited, daysEdited: !!e.daysEdited
      }));
      if(typeof snap.episodeCounter === 'number') episodeCounter = snap.episodeCounter;
    }
    if(Array.isArray(snap.customPhaseDefs) && snap.customPhaseDefs.length){
      document.getElementById('custom-phase-rows').innerHTML = '';
      customPhaseDefs = [];
      customPhaseCounter = 0;
      snap.customPhaseDefs.forEach(()=> addCustomPhaseRow());
      // align the generated keys/colorIndex/counter with what was saved
      customPhaseDefs = snap.customPhaseDefs.map(cp=>({key:cp.key, colorIndex:cp.colorIndex}));
      if(typeof snap.customPhaseCounter === 'number') customPhaseCounter = snap.customPhaseCounter;
      // re-key the freshly built rows to match saved keys (every id ends in "-<key>", where a
      // key is always "custom<n>"), then reflect the saved color onto the swatch.
      const rows = document.querySelectorAll('#custom-phase-rows .phase-row');
      rows.forEach((row, i)=>{
        const saved = snap.customPhaseDefs[i];
        if(!saved) return;
        row.dataset.key = saved.key;
        row.querySelectorAll('[id]').forEach(node=>{
          node.id = node.id.replace(/-custom\d+$/, '-' + saved.key);
        });
        const sw = document.getElementById('swatch-' + saved.key);
        const opt = PHASE_COLOR_OPTIONS[saved.colorIndex];
        if(sw && opt) sw.style.background = opt.color;
        const lbl = document.getElementById('phiatus-label-' + saved.key);
        const nameEl = document.getElementById('name-' + saved.key);
        if(lbl && nameEl) lbl.textContent = ((nameEl.value.trim() || 'Phase')) + ' Hiatus';
      });
    }

    // 2. Rebuild hiatus rows to match the saved set (replaces the defaults)
    if(snap.fields && Array.isArray(snap.fields.hiatuses)){
      document.getElementById('hiatus-list').innerHTML = '';
      // h.locked is absent in saves written before the lock existed -> addHiatusRow defaults it to
      // locked, which matches how those calendars behaved (nothing shifted them).
      snap.fields.hiatuses.forEach(h=> addHiatusRow(h.start, h.weeks, h.locked));
    }

    // 3. Apply saved values to every id'd field
    if(snap.fields && snap.fields.byId){
      Object.keys(snap.fields.byId).forEach(id=>{
        const node = document.getElementById(id);
        if(!node) return;
        const v = snap.fields.byId[id];
        if('checked' in v) node.checked = !!v.checked;
        else if('value' in v){
          node.value = v.value;
          if(node.tagName === 'SELECT'){
            // ensure the option reflects the value
            Array.from(node.options).forEach(o=>{ o.selected = (o.value === v.value); });
          }
          if(id.indexOf('color-') === 0){
            const sw = document.getElementById('swatch-' + id.slice(6));
            const idx = parseInt(v.value, 10);
            if(sw && PHASE_COLOR_OPTIONS[idx]) sw.style.background = PHASE_COLOR_OPTIONS[idx].color;
          }
        }
      });
    }

    // 4. Restore user notes and view mode. Migrate any old-format entries
    //    ({label, noteDate}) into the new single-text shape ({text}).
    if(snap.mvExtraLanes && typeof snap.mvExtraLanes === 'object'){
      mvExtraLanes = Object.assign({}, snap.mvExtraLanes);
    }
    // Reassigned, not merged: an absent store in the snapshot means "no overrides", and a merge
    // would keep a previous file's hand-dragged widths on this one.
    colWidths  = (snap.colWidths  && typeof snap.colWidths  === 'object') ? Object.assign({}, snap.colWidths)  : {};
    rowHeights = (snap.rowHeights && typeof snap.rowHeights === 'object') ? Object.assign({}, snap.rowHeights) : {};
    cellSpans  = (snap.cellSpans  && typeof snap.cellSpans  === 'object') ? Object.assign({}, snap.cellSpans)  : {};
    // Clear first, then repopulate -- a plain merge would leave behind entries the snapshot
    // being applied doesn't have (stale after an undo step, or leaked in from a previously open
    // file). dayNotes/userNotes are declared const and mutated in place elsewhere, so they're
    // cleared key-by-key rather than reassigned.
    Object.keys(dayNotes).forEach(k=>{ delete dayNotes[k]; });
    if(snap.dayNotes && typeof snap.dayNotes === 'object'){
      Object.keys(snap.dayNotes).forEach(k=>{ dayNotes[k] = snap.dayNotes[k]; });
    }
    if(snap.dayNoteColors && typeof snap.dayNoteColors === 'object'){
      dayNoteColors = Object.assign({}, snap.dayNoteColors);
    }
    Object.keys(userNotes).forEach(k=>{ delete userNotes[k]; });
    if(snap.userNotes && typeof snap.userNotes === 'object'){
      Object.keys(snap.userNotes).forEach(k=>{
        const v = snap.userNotes[k];
        if(v && typeof v === 'object' && !('text' in v) && ('label' in v || 'noteDate' in v)){
          const lbl = (v.label||'').trim();
          const dt = (v.noteDate||'').trim();
          userNotes[k] = {text: [lbl, dt].filter(Boolean).join(' ')};
        } else {
          userNotes[k] = v;
        }
      });
    }
    // 4b. Restore header mode + manual lines. Old saves used per-line headerOverrides;
    //     migrate any of those into manual mode so they aren't lost.
    if(snap.mvHeaderMode === 'manual' || (snap.mvHeaderManual && Object.keys(snap.mvHeaderManual).length)){
      mvHeaderMode = 'manual';
      mvHeaderManual = Object.assign({}, snap.mvHeaderManual || {});
    }
    if(snap.headerMode === 'manual' || (snap.headerManual && Object.keys(snap.headerManual).length)){
      headerMode = 'manual';
      headerManual = Object.assign({}, snap.headerManual || {});
    } else if(snap.headerOverrides && Object.keys(snap.headerOverrides).length){
      headerMode = 'manual';
      headerManual = Object.assign(computeHeaderDefaults(currentSchedule), snap.headerOverrides);
    } else {
      headerMode = 'auto'; headerManual = {};
    }
    // 4c. Restore per-cell highlight colors and hiatus text/color overrides
    // All reassigned unconditionally: an absent key in the snapshot means "no overrides", and a
    // conditional assign would leave the previous state's colours or sizes in place -- which is
    // what opening a save that predates one of these stores used to do.
    noteColors = (snap.noteColors && typeof snap.noteColors === 'object')
      ? Object.assign({}, snap.noteColors) : {};
    noteFontSize = (snap.noteFontSize && typeof snap.noteFontSize === 'object')
      ? Object.assign({}, snap.noteFontSize) : {};
    hiatusFontSize = (snap.hiatusFontSize && typeof snap.hiatusFontSize === 'object')
      ? Object.assign({}, snap.hiatusFontSize) : {};
    hiatusTexts = (snap.hiatusTexts && typeof snap.hiatusTexts === 'object')
      ? Object.assign({}, snap.hiatusTexts) : {};
    hiatusColors = (snap.hiatusColors && typeof snap.hiatusColors === 'object')
      ? Object.assign({}, snap.hiatusColors) : {};
    holidayView = (snap.holidayView && typeof snap.holidayView === 'object') ? Object.assign({}, snap.holidayView) : {};
    holidayOff = (snap.holidayOff && typeof snap.holidayOff === 'object') ? Object.assign({}, snap.holidayOff) : {};
    customHolidays = Array.isArray(snap.customHolidays)
      ? snap.customHolidays.filter(c=>c && c.name && c.date).map(c=>({id:c.id || ('cst-' + Math.random().toString(36).slice(2,9)), name:String(c.name), date:String(c.date)}))
      : [];
    // Runs after snap.fields is applied above, so the region selects already hold their saved
    // values and the date->name lookup resolves against the right list.
    migrateHolidayViewKeys();
    if(typeof snap.sidebarTab === 'string') setSidebarTab(snap.sidebarTab);
    // 4d. Restore auto-phase color overrides and reflect them on the built-in swatches.
    if(snap.phaseColorOverride && typeof snap.phaseColorOverride === 'object'){
      phaseColorOverride = Object.assign({}, snap.phaseColorOverride);
    } else {
      phaseColorOverride = {};
    }
    PHASES.forEach(p=>{
      const sw = document.getElementById('swatch-'+p.key);
      if(sw) sw.style.background = PHASE_COLOR_OPTIONS[autoPhaseColorIndex(p)].color;
    });
    // 4e. Match per-phase hiatus field visibility + custom labels to the restored values.
    refreshPhaseHiatusUI();
    document.querySelectorAll('#custom-phase-rows .phase-row').forEach(row=>{
      const key = row.dataset.key;
      const lbl = document.getElementById('phiatus-label-'+key);
      const nameEl = document.getElementById('name-'+key);
      if(lbl && nameEl) lbl.textContent = ((nameEl.value.trim() || 'Phase')) + ' Hiatus';
    });
    if(snap.viewMode === 'sheet' || snap.viewMode === 'month'){
      viewMode = snap.viewMode;
    } else if(snap.viewMode === 'list'){
      viewMode = 'sheet';   // List view was removed; fall back to the waterfall.
    }
    {
      ['sheet','month'].forEach(m=>{
        const b = document.getElementById('view-'+m+'-btn');
        if(b) b.classList.toggle('active', m===viewMode);
      });
    }
  }

  // Keep --header-h in sync with the real sticky header height so the sidebar sits flush
  // beneath it and its scroll area is sized correctly at any window width (the toolbar
  // wraps to a second line on narrow windows, changing the height).
  (function(){
    const hdr = document.querySelector('header.app-header');
    if(!hdr) return;
    const sync = ()=>{
      const h = Math.round(hdr.getBoundingClientRect().height);
      if(h > 0) document.documentElement.style.setProperty('--header-h', h + 'px');
    };
    sync();
    if(typeof ResizeObserver !== 'undefined'){ try { new ResizeObserver(sync).observe(hdr); } catch(e){} }
    window.addEventListener('resize', sync);
  })();

  restoreSavedState();
  refreshAfterRestore();

  // Initial load/restore is done -- from here on, changes are real user edits.
  suppressDirty = false;
  resetUndoHistory();
  isDirty = false;
  refreshSaveStatus();
  startAutosave();
  // If a previous session ended with unsaved work, offer to bring it back.
  if(typeof indexedDB !== 'undefined'){ setTimeout(()=>{ offerBackupRecovery(); }, 400); }

  // ---------- PWA: install prompt ----------
  // Installability comes from the inline manifest, not a service worker, so there's no cache
  // layer here: every load fetches the current version straight from the server. Updates
  // therefore appear on a normal refresh, with no stale-cache dance and no background
  // update-check traffic.
  (function(){
    // Clean up the caching service worker earlier versions registered. Without this, a browser
    // that already installed it would keep serving the old cached app indefinitely.
    if('serviceWorker' in navigator){
      try {
        navigator.serviceWorker.getRegistrations().then(regs=>{
          regs.forEach(r=> r.unregister().catch(()=>{}));
        }).catch(()=>{});
        if(typeof caches !== 'undefined' && caches.keys){
          caches.keys().then(keys=>{
            keys.forEach(k=>{ if(/spt-planning-cal/.test(k)) caches.delete(k).catch(()=>{}); });
          }).catch(()=>{});
        }
      } catch(_) { /* non-fatal */ }
    }

    // ---------- Update delivery ----------
    // There is no service worker, so a reload always reaches the network. But GitHub Pages
    // serves this file with `cache-control: max-age=600` (measured 29 Aug 2026), so a relaunch
    // WITHIN ten minutes of the last fetch is answered from the browser's own HTTP cache and
    // never learns a new deploy exists -- and a long-lived installed PWA, which people leave
    // open and return to rather than relaunching, can sit on an old build indefinitely. This
    // closes both gaps by asking a tiny separate file what the current version is.
    //
    // Deliberately NOT a service worker. One was removed from this project precisely because it
    // served a stale app forever, and the cleanup above still unregisters leftovers.
    //
    // Deliberately NOT an auto-reload. The user may be mid-edit with unsaved work, and reloading
    // out from under someone is how you destroy a production plan. Tell them; let them choose.
    (function(){
      // Only the DEPLOYED app checks. A shareable-copy .html opened from file:// is a deliberate
      // frozen snapshot of the app as it was exported -- telling its holder to "update" would
      // mean navigating them away from the very file they were sent, to an app that is not
      // theirs and may not have their calendar in it.
      if(!/^https?:$/.test(location.protocol)) return;

      const MARKER = 'version.json';
      const EVERY  = 30 * 60 * 1000;   // the marker is a few dozen bytes; this is not traffic
      let lastCheck = 0, shownVersion = null, dismissedVersion = null;
      // Stop asking after a few consecutive failures. A frozen releases/vX.Y.Z.html copy
      // resolves `version.json` relative to its own folder, where there is none and never will
      // be -- without this it would 404 every thirty minutes, forever, for no possible benefit.
      // Same for a machine that is simply offline. Any single success resets the count.
      let failures = 0, timer = null;
      const MAX_FAILURES = 3;

      // "1.2.10" must beat "1.2.9", so compare numerically per segment, not as strings.
      // Returns true only when the server is genuinely AHEAD: if a deploy is ever rolled back,
      // the user's newer build is not something to nag them to "update" to.
      function isNewer(remote, local){
        const a = String(remote).split('.').map(n => parseInt(n, 10) || 0);
        const b = String(local ).split('.').map(n => parseInt(n, 10) || 0);
        for(let i = 0; i < Math.max(a.length, b.length); i++){
          const x = a[i] || 0, y = b[i] || 0;
          if(x !== y) return x > y;
        }
        return false;
      }

      function show(remote){
        const el = document.getElementById('update-notice');
        // Dismissal is per VERSION, not forever: waving away 1.2.1 should not hide 1.3.0.
        if(!el || dismissedVersion === remote) return;
        shownVersion = remote;
        el.querySelector('.ln-text').innerHTML =
          'Version <strong>' + escHtml(remote) + '</strong> of the calendar builder is available' +
          ' — this copy is <strong>' + escHtml(APP_VERSION) + '</strong>. Reloading picks it ' +
          'up. <strong>Save first</strong> if you have unsaved changes.';
        el.hidden = false;
      }

      function giveUp(){
        if(timer){ clearInterval(timer); timer = null; }
      }

      async function check(){
        lastCheck = Date.now();
        try {
          // Cache-bust twice over. The marker is served from the same Pages host and inherits
          // the same ten-minute cache as the app, so a plain fetch could be answered from cache
          // with precisely the version we are trying to detect a change away from.
          const res = await fetch(MARKER + '?t=' + Date.now(), { cache: 'no-store' });
          if(!res.ok){ if(++failures >= MAX_FAILURES) giveUp(); return; }
          const data = await res.json();
          failures = 0;
          if(data && typeof data.version === 'string' && isNewer(data.version, APP_VERSION)){
            show(data.version);
          }
        } catch(_){
          // Offline, blocked, or the marker is not deployed yet. Silence is the correct
          // behaviour: an update check that cannot run is not something to bother anyone with.
          if(++failures >= MAX_FAILURES) giveUp();
        }
      }

      const el = document.getElementById('update-notice');
      if(el){
        el.querySelector('.ln-x').addEventListener('click', ()=>{
          dismissedVersion = shownVersion;
          el.hidden = true;
        });
        el.querySelector('.ln-go').addEventListener('click', ()=>{
          // A real top-level navigation, not a fetch. If this deploy is ever moved behind an
          // SSO gate (HANDOFF §2f), a navigation is the form that can complete an interactive
          // login; a background fetch simply fails. The existing beforeunload handler still
          // guards unsaved work, so this cannot silently discard a calendar.
          location.reload();
        });
      }

      setTimeout(check, 8000);    // let the first render finish before spending anything
      timer = setInterval(check, EVERY);
      document.addEventListener('visibilitychange', ()=>{
        // A PWA is left open and returned to far more often than it is relaunched, so becoming
        // visible again is the likeliest moment for a new deploy to have appeared.
        if(!document.hidden && timer && Date.now() - lastCheck > EVERY) check();
      });
    })();

    // Install affordance: Chrome/Edge fire beforeinstallprompt when the app is installable.
    // Installed PWAs get persistent file permissions, so the in-place Save stops re-prompting.
    let deferredPrompt = null;
    const installBtn = document.getElementById('install-app-btn');
    window.addEventListener('beforeinstallprompt', (e)=>{
      e.preventDefault();
      deferredPrompt = e;
      if(installBtn) installBtn.style.display = '';
    });
    if(installBtn){
      installBtn.addEventListener('click', async ()=>{
        if(!deferredPrompt) return;
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch(_){}
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }
    window.addEventListener('appinstalled', ()=>{ if(installBtn) installBtn.style.display = 'none'; });
  })();
})();

}
