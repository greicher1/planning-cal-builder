// fence -- prove that mounting Mantine did not move anything inside the FROZEN surface.
//
// This is acceptance gate 7 in UI-CONVENTIONS.md §10, and it is the one no existing test covered.
// It exists because the obvious assertion is worthless:
//
//   "no element inside #table-wrap matches [class*='m_']"
//
// would have PASSED while the bug shipped. Mantine's baseline reaches the frozen container through
// TYPE selectors, not through its hashed classes -- `input, button, textarea, select { font:
// inherit }` hits the five real <button> elements the frozen renderers emit into #table-wrap, and
// because `font` is a shorthand it resets line-height too. Measured at +3px of button height WITH
// the @layer fence in place, because a layer settles priority between declarations of the same
// property and here the app declared none.
//
// So this test asserts POSITIVELY: it dumps the computed values that matter for every frozen
// element the baseline could reach, and the run is compared against the same dump taken from the
// pre-Mantine page. Run it against both and diff:
//
//   ./run.sh fence 40                              # the deployed single-file app
//   HARNESS_PAGE=/dist/index.html ./run.sh fence 40 # the Mantine build
//
// The negative assertion is still recorded (mantineClassesInGrid) -- it is cheap and it would
// catch a different mistake -- but it is NOT the gate.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};

  // Which computed properties matter. font-size / line-height / padding are the ones the `font`
  // shorthand can move; the rest are here because a cell's laid-out box is exactly the quantity
  // the clipping gate counts (scrollWidth vs clientWidth) and a row drag seeds from.
  var PROPS = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
               'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
               'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
               'box-sizing', 'text-align', 'vertical-align', 'white-space', 'overflow-wrap',
               'text-overflow', 'overflow-x', 'height', 'width',
               '-webkit-font-smoothing', 'print-color-adjust'];

  function snap(el) {
    if (!el) return null;
    var cs = getComputedStyle(el), o = {};
    for (var i = 0; i < PROPS.length; i++) o[PROPS[i]] = cs.getPropertyValue(PROPS[i]);
    var r = el.getBoundingClientRect();
    // Round: sub-pixel jitter from scroll position is not what this test is about.
    o['@w'] = Math.round(r.width * 100) / 100;
    o['@h'] = Math.round(r.height * 100) / 100;
    return o;
  }
  function bySel(sel) { return snap(document.querySelector(sel)); }

  try {
    T.buildFixture();
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 150, 100);

    out.health = T.appHealth();

    // ---- body, because line-height inherits from it into the whole frozen subtree -------------
    // Mantine's baseline sets body line-height to var(--mantine-line-height) = 1.55 against the
    // app's 1.5. That one reaches .mv-daynum and therefore exportMonthPdf. The fence DOES fix it
    // (the app declares the property, so unlayered wins) -- this line is what proves it did.
    out.body = snap(document.body);

    // ---- --header-h, because it is an INPUT to a frozen rule ----------------------------------
    // A ResizeObserver measures header.app-header and writes --header-h, and the frozen
    // `.sheet-scroll{max-height:calc(100vh - var(--header-h) - 140px)}` reads it. MANTINE-SEAM.md
    // §3.1 records the consequence: exportWaterfallPdf measures the injected copy in SCREEN media,
    // where `#print-root .sheet-scroll{max-height:none!important}` (inside @media print) does not
    // apply -- so toolbar height can move the measured width across the `W <= PAGE.portrait.w`
    // threshold and FLIP THE PAGE ORIENTATION of the print-fallback waterfall PDF. Any change to
    // the header's rendered height is therefore export-affecting until that rule is lifted out of
    // @media print. Measure it, do not assume it.
    out.headerH = getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim();
    var hdr = document.querySelector('header.app-header');
    out.headerRectH = hdr ? Math.round(hdr.getBoundingClientRect().height * 100) / 100 : null;
    out.headerIsBodyChild = !!hdr && hdr.parentElement === document.body;
    out.printRootIsLastBodyChild = (function () {
      var pr = document.getElementById('print-root');
      return !!pr && pr.parentElement === document.body;
    })();
    out.chrome = { tbBtn: bySel('.tb-btn'), sideTab: bySel('.side-tab-btn'), formPanel: bySel('.form-panel') };

    // ---- the waterfall half of the frozen surface ---------------------------------------------
    out.waterfall = {
      hdrModeBtn:    bySel('#hdr-mode-btn'),
      notesResetBtn: bySel('#notes-reset-btn'),
      noteCell:      bySel('td.sheet-note-cell'),
      phaseCell:     bySel('td.sheet-phase-cell'),
      dateCell:      bySel('td.sheet-date'),
      th:            bySel('table.sheet-table th'),
      table:         bySel('table.sheet-table'),
      scroll:        bySel('.sheet-scroll'),
    };

    // A cell that actually holds text, since an empty cell cannot show a fitting change.
    var filled = null, cells = document.querySelectorAll('td.sheet-note-cell');
    for (var i = 0; i < cells.length; i++) {
      if ((cells[i].textContent || '').trim().length > 12) { filled = cells[i]; break; }
    }
    out.waterfall.filledNoteCell = snap(filled);
    out.waterfall.filledNoteText = filled ? filled.textContent.trim().slice(0, 60) : null;

    // ---- the negative assertion, recorded but NOT the gate -------------------------------------
    var tw = document.getElementById('table-wrap');
    out.mantineClassesInGrid = tw ? tw.querySelectorAll('[class*="m_"]').length : -1;
    out.gridButtonCount = tw ? tw.querySelectorAll('button').length : -1;
    out.gridButtonIds = tw
      ? Array.prototype.map.call(tw.querySelectorAll('button'), function (b) {
          return b.id || ('.' + (b.className || '?'));
        })
      : [];

    // ---- the month half ------------------------------------------------------------------------
    // renderMonthView is an EXPORT renderer, not chrome: exportMonthPdf injects its output into
    // #print-root and prints it. So its computed values are frozen output, and .mv-daynum is the
    // element the body line-height hazard actually reaches.
    var mb = document.getElementById('view-month-btn');
    if (mb) {
      mb.click();
      await T.until(function () { return !!document.querySelector('.mv-week'); },
                    'the month view to render', 100, 100);
      out.month = {
        prev:      bySel('#mv-prev'),
        next:      bySel('#mv-next'),
        hdrMode:   bySel('#mv-hdr-mode-btn'),
        dayNum:    bySel('.mv-daynum'),
        dayCell:   bySel('.mv-daycell'),
        bar:       bySel('.mv-bar'),
        week:      bySel('.mv-week'),
      };
      var mtw = document.getElementById('table-wrap');
      out.mantineClassesInMonth = mtw ? mtw.querySelectorAll('[class*="m_"]').length : -1;
      // Back to the waterfall, so a later assertion never reads the wrong view.
      var wb = document.getElementById('view-sheet-btn');
      if (wb) { wb.click(); await T.sleep(300); }
    }
  } catch (e) {
    out.EX = String((e && e.message) || e);
  }
  T.done(out);
})(); });
