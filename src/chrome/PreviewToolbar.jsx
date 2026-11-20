// The preview toolbar: the view toggle, the Shift split control, the two adjustment popovers (Shift
// and Build Around, which was Rebuild From until 5 Nov 2026; Shift From and Anchor To folded into Shift on 4 Nov
// 2026) and undo/redo.
//
// ⚠️ READ THIS BEFORE REACHING FOR A MANTINE COMPONENT HERE. This surface is different in kind from
// the header, and the difference decides the whole design.
//
// The header's state was PRESENTATIONAL -- labels, disabled, a status string -- so a bridge that
// pushed data into React worked cleanly. This toolbar's state is ENGINE-OWNED by construction: the
// engine reads .value off six controls, writes .innerHTML into two <select>s (fillPhaseSelect),
// writes .value into two date inputs (syncAnchorDate), and toggles four class tokens it later reads
// back -- `open`, `active`, `flash`, `warn`. React must not be a second writer to any of that.
//
// So this component RENDERS ONCE AND NEVER RE-RENDERS. It contributes structure and Mantine's
// design language; the engine keeps every behaviour it has today, untouched. The only state React
// owns is undo/redo's disabled flag and the Header button's label (owner ruling 1), each only because
// Mantine will not draw it otherwise (below).
//
// THREE MANTINE COMPONENTS ARE DELIBERATELY NOT USED HERE:
//
//   1. ⛔ Popover, for the .tools-menu panels (four until 4 Nov 2026, two since). Two independent reasons, either fatal:
//      * `withinPortal: true` is in Popover's defaultProps, and portalling moves the dropdown out
//        from under .tools-menu -- which is the ENTIRE mechanism keeping this surface's six id'd
//        controls out of every saved file and every undo step. collectFieldValues() sweeps
//        `input[id], select[id], textarea[id]` and excludes exactly one thing:
//        `el.closest('.tools-menu')`. Portal them and six junk keys land in the save format.
//      * Popover mounts its dropdown from an EFFECT, so #pop-shift and friends would not exist when
//        the IIFE evaluates -- and the engine collects every trigger/menu pair BY ID at
//        evaluation time. This already cost an afternoon on the file menu (HANDOFF §2b-3).
//      Plain divs render synchronously in the same commit, so they are present when the engine
//      looks. The panels are positioned by the app's own CSS, as they already were.
//
//   2. ⛔ SegmentedControl, for the Waterfall/Month toggle -- which is what UI-CONVENTIONS.md §5
//      asks for, and it cannot be used until §8.3 is resolved. SegmentedControl renders a real
//      <input type="radio"> per segment, and Mantine generates an id for each when none is passed.
//      Those are `input[id]`, they are NOT inside a .tools-menu, and so they would be swept
//      straight into fields.byId -- into every saved calendar, under keys that change every page
//      load. The toggle stays two <button>s, restyled. The engine keeps toggling `.active` on them
//      by computed id ('view-' + mode + '-btn'), exactly as it does now.
//
//   3. ⛔ DateInput, for the two tool dates. It is a CONTROLLED component, and syncAnchorDate()
//      writes #tool-anchor-date's .value imperatively every time the popover opens. A controlled
//      input would ignore that write. See PreviewToolbar's note in HANDOFF §2b-3 -- this is the
//      same conflict that governs the whole sidebar, where applyStateSnapshot() writes .value into
//      every field on restore.
import { useState, useLayoutEffect, useRef } from 'react'
import { InfoHint } from './InfoHint.jsx'
import { Button, ActionIcon, Tooltip, Group } from '@mantine/core'
import { installChrome } from './bridge.js'
import { keyLabel } from './keys.js'
import { IconRows, IconCalendarPlain, IconUndo, IconRedo, IconDots, IconHeading, IconHammer } from './icons.jsx'
import { MonthMap, MonthStepper } from './MonthMap.jsx'

// THE FIRST LINE'S LAYOUT (owner, 10-11 Nov 2026; reworked 16 Nov 2026 for every window size). One measurement, two jobs.
// 1. THE GAP. One equal gap after every item on the line, Redo's to the toolbar's edge included (owner, 11 Nov 2026:
//    "the gap should be the same as the gaps between all the other buttons"). It is solved so the line fills the row,
//    but NEVER over --tb-gap-max (14 px, the gap on the owner's laptop) and never under --tb-gap-min (10 px). On a wide
//    window the toolbar therefore keeps its laptop size and the spare room collects on the RIGHT (owner's picker,
//    16 Nov 2026: "keep the toolbar at its laptop size, as Excel does"); until then every gap grew with the window, to
//    116 px on a 2560 px screen. Written as --tb-gap-fit on .preview-panel, which every gap reads through --tb-gap.
// 2. THE FOLD LEVEL. The line is ALWAYS one line (owner's picker, 16 Nov 2026: "Icons, then a More menu"). Where it
//    cannot fit at the smallest gap, it gives up room in fixed steps, least-used first, the view toggle and Shift last:
//      1. Fill Gaps shows its switch alone and Header its icon (both keep a hover hint). Side Boxes keeps its label:
//         the month stepper shares their slot and needs about that width, so its icon would save nothing.
//      2. Fill Gaps, Side Boxes and Header (the month stepper in the month view) fold into one More menu (.tb-more).
//      3. Build Around shows its icon (a hammer; a pin until the owner said it read as a location) and caret.
//      4. The text style buttons fold behind a Text button and open under it (.tb-text-btn).
//      5. Waterfall and Month show their icons alone, each with its name as a hover hint (written here, below).
//    Each step is a class on .preview-panel, cumulative (tbf1 ... tbf5), so CSS draws it; this hook only tries the
//    levels in turn, from 0, and keeps the first whose line fits. Measured with side boxes, the narrowest preview:
//    step 0 to about 1,700 px, 1 to 1,560, 2 to 1,290, 3 to 1,100, 4 to 1,000, 5 at the app's minimum width (960 px,
//    legacy.css, "The app shell"), where it fits with about 80 px to spare. Below the minimum the window scrolls
//    sideways instead.
//    Until 16 Nov 2026 the text bar dropped to a line of its own instead (`.style-own-line`), and the rest of the
//    line wrapped to a third below about 1150 px.
// * None of the widths summed depends on the gap, so the answer cannot flip-flop: the sections are flex:none at their
//   content width, the bar is width:max-content, Header has a fixed width (useFixedHeaderWidth), Highlight is always
//   in the bar (greyed where it doesn't apply), Fill Gaps is never display:none, and Fill Gaps and Side Boxes are
//   measured even in the month view (they keep their place there, hidden by visibility).
// * Trying the levels changes classes and reads layout within ONE task, so nothing paints in between and nothing
//   flickers; the result is the same level every time for the same row width, so the observers settle at once.
// * Applied in a task of its own (a zero timer): changing the row's height inside the observer's own callback is what
//   makes Chrome report "ResizeObserver loop completed with undelivered notifications" as a page error, which legs
//   count. ⛔ Not requestAnimationFrame: a hidden page never gets one, and under the harness's --virtual-time-budget
//   it may never fire (monthmap.js says the same), so the level would never be set there.
// * ⛔ A WINDOW RESIZE IS FITTED AT ONCE, in the resize event itself, never a task later (owner, 16 Nov 2026: "There's a
//   CSS wrap glitch as i change the size of the window", "at width 1258 px and several other 1 pixel gaps"). The event
//   fires before that frame is laid out and painted. While the fit waited for its timer, the frame was painted with the
//   NEW width and the OLD gap: one pixel narrower and the line was too long, so More and Undo / Redo dropped to a second
//   line for one frame and the calendar under them jumped 44 px, at EVERY pixel of the two bands where the gap is solved
//   (measured: 1317-1293 and 1271-1247 px on the month view, level 2 and level 3). The resize event is not a
//   ResizeObserver callback, so fitting inside it cannot raise the loop error the timer exists for. Everything else
//   (the observers, the fonts) still goes through the timer.
// * ⛔ THE GAP IS ROUNDED DOWN, to a whole 1/64 px (Chrome lays out in 1/64ths), with one 1/64 kept in hand, and the row
//   is measured in fractions (getBoundingClientRect, not clientWidth, which rounds to a whole px and so can round UP at a
//   browser zoom). Until 16 Nov 2026 it was written with toFixed(2), which rounds up half the time: the line then had
//   as little as 1/64 px to spare (measured at 1258 px) and at some widths less than nothing on paper.
// * The classes and the gap are on .preview-panel, never on .view-toggle-row: the shareable copy is a clone of the page
//   whose builder empties the row but keeps the row's own attributes (sharecopy2 caught a class riding there).
//   .preview-panel already carries the grid fit's --header-h the same way, and a copy solves both again when it opens.
const TB_LEVELS = 5
const LU = 1 / 64   // Chrome's layout unit
function useToolbarFit() {
  useLayoutEffect(() => {
    const row = document.querySelector('.view-toggle-row')
    const host = row && row.querySelector('.style-bar-host')
    const toggle = row && row.querySelector('.view-toggle')
    const tools = row && row.querySelector('.preview-tools')
    const dates = row && row.querySelector(':scope > .tb-dates')
    const panel = row && row.closest('.preview-panel')
    if (!row || !host || !toggle || !tools || !dates || !panel || typeof ResizeObserver === 'undefined') return
    const q = (sel) => row.querySelector(sel)
    let timer = 0, watchedBar = null
    const setLevel = (level) => {
      for (let k = 1; k <= TB_LEVELS; k++) panel.classList.toggle('tbf' + k, k <= level)
      // Step 5's hover hints. Written here because React renders these buttons once with no title (a tooltip naming
      // the label beside it would only be noise), so nothing else ever writes the attribute.
      toggle.querySelectorAll('.view-toggle-btn').forEach((b) => {
        if (level >= 5) b.title = b.textContent.trim(); else b.removeAttribute('title')
      })
    }
    // The items on the first line at a level, each followed by one gap.
    const partsAt = (level, bar) => level < 2
      ? [toggle, q('#shift-group'), q('#pop-solve-btn'), bar, q('#tb-fill-space-btn'), q('#tb-side-boxes-btn'),
         q('#tb-hdr-mode-btn'), q('.undo-redo-group')]
      : [toggle, q('#shift-group'), q('#pop-solve-btn'), level < 4 ? bar : q('.tb-text-btn'), q('.tb-more-btn'),
         q('.undo-redo-group')]
    const fit = () => {
      timer = 0
      host.classList.remove('style-own-line')   // retired 16 Nov 2026; a copy saved before may still carry it
      const bar = host.firstElementChild
      if (!bar) return
      if (bar !== watchedBar) { ro.observe(bar); watchedBar = bar }
      const rowCs = getComputedStyle(row)
      const min = parseFloat(rowCs.getPropertyValue('--tb-gap-min')) || 10
      const max = parseFloat(rowCs.getPropertyValue('--tb-gap-max')) || 14
      const inner = row.getBoundingClientRect().width - (parseFloat(rowCs.paddingLeft) || 0) - (parseFloat(rowCs.paddingRight) || 0)
        - (parseFloat(rowCs.borderLeftWidth) || 0) - (parseFloat(rowCs.borderRightWidth) || 0)
      let level = 0, content = 0, n = 1
      for (; level <= TB_LEVELS; level++) {
        setLevel(level)
        const parts = partsAt(level, bar)
        content = parts.reduce((t, el) => t + (el ? el.getBoundingClientRect().width : 0), 0)
        n = parts.length
        if (content + n * min <= inner || level === TB_LEVELS) break
      }
      const gap = Math.max(min, Math.min(max, Math.floor((inner - content - LU) / n / LU) * LU))
      const value = gap.toFixed(6) + 'px'
      if (panel.style.getPropertyValue('--tb-gap-fit') !== value) panel.style.setProperty('--tb-gap-fit', value)
    }
    const later = () => { if (!timer) timer = setTimeout(fit, 0) }
    const now = () => { if (timer) { clearTimeout(timer); timer = 0 } fit() }
    const ro = new ResizeObserver(later)
    ;[row, host, toggle, dates, tools].forEach((el) => ro.observe(el))
    // The engine fills the host after React mounts; a mutation says so even on a page that is not painting.
    const mo = new MutationObserver(later)
    mo.observe(host, { childList: true })
    // A ResizeObserver reports only at a rendering opportunity, which a hidden page never gets (the grid fit in app.js
    // found that); a window resize arrives regardless. Fitted in the event itself, so the frame it announces is never
    // painted with the last width's gap (the comment above the hook).
    window.addEventListener('resize', now)
    // Inter arrives a moment after the first layout, and every label's width changes with it: a level chosen on the
    // fallback font stuck (seen as fold step 3 on a window that holds step 0) when nothing painted in between.
    const fonts = document.fonts
    if (fonts) { fonts.addEventListener && fonts.addEventListener('loadingdone', later); fonts.ready && fonts.ready.then(later) }
    fit()
    return () => {
      ro.disconnect(); mo.disconnect(); window.removeEventListener('resize', now)
      if (fonts && fonts.removeEventListener) fonts.removeEventListener('loadingdone', later)
      if (timer) clearTimeout(timer)
    }
  }, [])
}

// THE TWO FOLD MENUS (step 2 and step 4 above). Each is open while its state says so and closes on a press anywhere
// outside it, on Escape and on a window resize (the level may change under it). ⛔ Plain elements, never a Mantine
// Menu or Popover: the page tools are the engine's by id and by delegation (it opens Side Boxes' and Header's own
// menus under whichever button was clicked), so they must stay these very nodes, mounted where they are, and simply
// be SHOWN in a panel. A press inside the engine's own menus (.sb-menu, .hdr-mode-pop) counts as outside: it closes
// More, which those menus do not need (each was placed once, when it opened).
function useFoldMenu(open, setOpen, isInside) {
  useLayoutEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!isInside(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])
}

// THE HEADER BUTTON'S FIXED WIDTH (owner, 11 Nov 2026: "I don't like the menu changing as you click around"). Its label
// is Auto, Template, Manual or Off, and the non-Auto ones are semibold, so its natural width changes with the mode. A
// hidden copy beside it is measured with every label and its state, and the button takes the widest, once the font
// has loaded. The copy carries no id and is gone before the next paint.
const HDR_LABELS = [['Header: Auto', false], ['Header: Template', true], ['Header: Manual', true], ['Header: Off', true]]
function useFixedHeaderWidth(ref, setW) {
  useLayoutEffect(() => {
    const measure = () => {
      const b = ref.current
      if (!b || !b.parentNode) return
      const copy = b.cloneNode(true)
      const label = copy.querySelector('.mantine-Button-label')
      if (!label) return
      copy.removeAttribute('id'); copy.removeAttribute('style'); copy.setAttribute('aria-hidden', 'true'); copy.tabIndex = -1
      Object.assign(copy.style, { position: 'absolute', visibility: 'hidden', left: '-10000px', width: 'auto' })
      b.parentNode.appendChild(copy)
      let w = 0
      HDR_LABELS.forEach(([text, semibold]) => {
        label.textContent = text
        copy.classList.toggle('is-manual', semibold)
        w = Math.max(w, copy.getBoundingClientRect().width)
      })
      copy.remove()
      if (w) setW(Math.ceil(w))
    }
    measure()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure)
  }, [])
}

export function PreviewToolbar() {
  useToolbarFit()
  // The ONLY React-owned state in this component. It exists because Mantine styles disabled state
  // from [data-disabled] alone -- there is no :disabled rule in its CSS -- so the engine's
  // `u.disabled = !undoStack.length` would disable the buttons functionally while leaving them
  // looking enabled. Routing it through the bridge also lets the disabled state be a real colour
  // instead of `opacity:.4`, which composited to 1.72:1 on the app's ground: the worst contrast in
  // the file, on its two most-used disabled controls (UI-CONVENTIONS.md §3b).
  const [undoRedo, setUndoRedo] = useState({ undo: true, redo: true })
  // The Header button (owner ruling 1). Bridged, not imperative, for the same reason as undo/redo:
  // its label changes (Auto / Template / Manual), and the engine must never write a Mantine Button's
  // textContent -- that destroys its inner spans. So the label is DERIVED here from bridged data.
  // `view` picks which header's mode it shows. (The batch-expand button, the first control built this
  // way, went with owner ruling 2.)
  const [hdr, setHdr] = useState({ view: 'sheet', mode: 'auto' })
  // Fill Space (owner, 9 Nov 2026): pushed by the engine with the view controls. Hidden until the engine says otherwise.
  const [fill, setFill] = useState({ visible: false, on: true })
  // The Header button's fixed width (useFixedHeaderWidth).
  const hdrRef = useRef(null)
  const [hdrW, setHdrW] = useState(null)
  useFixedHeaderWidth(hdrRef, setHdrW)
  // The Header button's words, also its hover hint's first words (at fold step 1 it shows its icon alone).
  const hdrLabel = hdr.mode === 'template' ? 'Header: Template' : hdr.mode === 'manual' ? 'Header: Manual'
    : hdr.mode === 'off' ? 'Header: Off' : 'Header: Auto'
  // The fold menus (useToolbarFit's steps 2 and 4): More holds the page tools, Text the text style buttons.
  const moreRef = useRef(null)
  const textBtnRef = useRef(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [textOpen, setTextOpen] = useState(false)
  // The tool menus that CASCADE from the More panel (app.js, cascadeFrom: Side Boxes', Header's) are part of it: a press
  // in one does not close the panel; the click that chooses in one closes it, a task later, once the engine has acted.
  const SUBMENUS = '.sb-menu, .hdr-mode-pop'
  useFoldMenu(moreOpen, setMoreOpen, (t) => (moreRef.current && moreRef.current.contains(t))
    || !!(t.closest && t.closest(SUBMENUS)))
  const hoverTimer = useRef(0)
  useLayoutEffect(() => {
    if (!moreOpen) {
      // However the panel closed (Escape, a press outside, a choice, the button), its cascaded menus go with it.
      clearTimeout(hoverTimer.current)
      document.dispatchEvent(new Event('sptcal:close-tool-menus'))
      return
    }
    // Which side each row's menu will open, so its arrow points that way before the first paint (app.js, cascadeSide).
    document.dispatchEvent(new Event('sptcal:measure-tool-menus'))
    const onChoose = (e) => {
      const t = e.target
      if (t.closest && t.closest(SUBMENUS) && t.closest('button:not([disabled])')) setTimeout(() => setMoreOpen(false), 0)
    }
    // Capture: Side Boxes' items stop their click from bubbling (app.js, openSideMenu), so a listener on the way up never
    // hears the choice.
    document.addEventListener('click', onChoose, true)
    return () => document.removeEventListener('click', onChoose, true)
  }, [moreOpen])
  // HOVER, as a menu does (owner, 16 Nov 2026, with a macOS menu): resting on Side Boxes or Header opens its menu beside
  // the panel; resting on another row closes it. A short delay, so a pointer crossing a row on its way does nothing.
  // The open is the row's own click, so the engine's delegated handler does it exactly as a click would.
  const onPanelOver = (e) => {
    if (!moreOpen) return
    const row = e.target.closest && e.target.closest('#tb-side-boxes-btn, #tb-hdr-mode-btn, #tb-fill-space-btn, .month-step')
    if (!row) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      const sub = row.matches('#tb-side-boxes-btn, #tb-hdr-mode-btn')
      if (sub && row.getAttribute('aria-expanded') === 'true') return
      document.dispatchEvent(new Event('sptcal:close-tool-menus'))
      if (sub) row.click()
    }, 140)
  }
  useFoldMenu(textOpen, setTextOpen, (t) => (textBtnRef.current && textBtnRef.current.contains(t))
    || !!(t.closest && t.closest('.style-bar-host')))
  // The Text menu IS the style bar's host, shown under its button: the host stays where React put it (the engine fills
  // it once and finds it by its class, and legs reach it as `.view-toggle-row > .style-bar-host`), so it is placed
  // with position:fixed from the button's box (CSS, under .tbf4). Fixed, so the preview panel's scroll box cannot clip
  // it. A class and two inline lengths on the host, which React never writes (its className never changes).
  useLayoutEffect(() => {
    const host = document.querySelector('.view-toggle-row > .style-bar-host')
    const btn = textBtnRef.current
    if (!host) return
    host.classList.toggle('is-dropped', textOpen)
    if (!textOpen || !btn) { host.style.removeProperty('top'); host.style.removeProperty('left'); return }
    const r = btn.getBoundingClientRect()
    host.style.top = Math.round(r.bottom + 6) + 'px'
    host.style.left = Math.round(r.left) + 'px'
    const hr = host.getBoundingClientRect()
    if (hr.right > window.innerWidth - 8) host.style.left = Math.max(8, Math.round(window.innerWidth - 8 - hr.width)) + 'px'
  }, [textOpen])

  useLayoutEffect(() => {
    installChrome({
      undoRedo: (patch) => setUndoRedo((s) => ({ ...s, ...patch })),
      headerModeBtn: (s) => setHdr((p) => ({ ...p, ...s })),
      fillSpaceBtn: (s) => setFill((p) => ({ ...p, ...s })),
    })
  }, [])

  // Renders the INTERIOR of .view-toggle-row, which stays in the static skeleton. #gap-warning has
  // to remain a genuine SIBLING of .view-toggle-row and #table-wrap, and #table-wrap has to be the
  // immediately following sibling -- a React wrapper would make the toolbar their nephew instead.
  return (
    <>
      <div className="view-toggle" id="view-toggle">
        {/* Icons are safe here: the engine only ever toggles .active on these buttons by id --
            it never writes their textContent -- and clicks resolve on the button itself. */}
        <button className="view-toggle-btn active" data-mode="sheet" id="view-sheet-btn" type="button">
          <IconRows className="vt-ic" /><span>Waterfall</span>
        </button>
        <button className="view-toggle-btn" data-mode="month" id="view-month-btn" type="button">
          <IconCalendarPlain className="vt-ic" /><span>Month</span>
        </button>
      </div>

      {/* ⚠️ "One column" LIVED HERE until 10 Sep 2026 and now sits in the Preferences card
          (Sidebar.jsx). The owner could not find it beside the view toggle. It kept its id, so the
          engine binding and both gate legs were unaffected by the move. */}

      {/* Shift is a SPLIT control: the arrows act on one click (much the most-used thing
          here, so it must not move behind a popover) and the caret beside them opens the
          Shift form (it read "Shift All" until 4 Nov 2026, when the form learned to move part of
          the calendar). Each of the other tools gets its own button and its own small
          popover, so the row names every capability without anything having to be opened. */}
      {/* Redesigned 29 Aug 2026 (owner): a joined three-part control at the toolbar's shared
          30px height. The CENTER is now the dropdown trigger -- "Shift All ▾" opens the
          multi-week form -- so the label stopped being dead text sitting between two arrows and
          the dropdown stopped being an unreadable sliver. Same three engine ids, same handlers:
          the engine binds shift-back/fwd by id and pop-shift-btn as the popover trigger, and
          .shift-label had zero engine references (verified), so folding it into the trigger is
          markup-only. */}
      {/* THE DATE TOOLS, FIRST AFTER THE VIEW TOGGLE (owner, 10 Nov 2026: "lets reorder as follows: Month/Waterfall -
          Shift tool/Build Around - Styling Menu - Fill gaps/side boxes/header - undo/redo"). A direct child of the row
          now (it was the first thing inside .preview-tools), and its auto left margin is what packs every tool to the
          right of the view toggle. No well of its own ("remove the faint grey box"); Shift and Build Around stand the
          one section gap apart. A plain div, not positioned and never overflow:hidden, so the two popovers anchor and
          hang exactly as before. */}
      <div className="tb-well tb-dates">
      <div className="shift-group" id="shift-group">
        <button className="shift-btn" id="shift-back-btn" type="button" title="Shift the whole calendar one week earlier">← 1 wk</button>
        <button className="shift-btn shift-main" id="pop-shift-btn" type="button" title="Shift the calendar by a number of weeks or to a date" aria-haspopup="true" aria-expanded="false">Shift <span className="caret" aria-hidden="true">▾</span></button>
        <button className="shift-btn" id="shift-fwd-btn" type="button" title="Shift the whole calendar one week later">1 wk →</button>
        {/* The readout is only ever made visible by `.shift-group.flash .shift-readout`, and its
            pointer-events:none is load-bearing: without it the readout swallowed a click aimed at
            Reset Notes & Hiatus. */}
        <span className="shift-readout" id="shift-readout" role="status" aria-live="polite"></span>

        {/* ONE SHIFT TOOL (owner, 4 Nov 2026: "Ok im going to vote we go with C, one master shift tool";
            ANCHOR-TO-DIRECTION-PLAN.md §6, mockups/anchor-to-direction.html tab C). Shift All's form, Shift From
            and Anchor To all ended in the same shiftCalendar() call and differed in two things only, so they are
            two choices here: WHAT MOVES (All phases | Phase & before | Phase & after) and HOW FAR (By weeks |
            To a date). The Shift From and Anchor To buttons went with it.
            * It opens on All phases, By weeks every time (ruling R2(a)): exactly the old Shift All form.
            * The phase row shows only when it is needed (owner's picker): hidden for All phases by weeks.
            * Earlier/Later always shift by weeks and Go always goes to the date, each reading What moves for
              itself; How far only chooses which row is SHOWN. The engine toggles `hidden` on the rows and
              aria-pressed on the choices, so neither is set here (React renders this once and must not be a
              second writer).
            * ⛔ The ids are the ones the legs and the engine know: tool-shift-* (weeks, Earlier, Later) and
              tool-anchor-* (phase, edge, date, Go). Shift From's tool-ripple-* retired. Every control stays
              inside .tools-menu, which is what keeps them out of collectFieldValues() and every saved file;
              the choice buttons carry no id at all.
            * THE LIST OF PHASES (owner, 5 Nov 2026: "lets go with A", mockups/shift-tick-phases.html tab A;
              plan §7): Rebuild From's list, filled by the engine (renderShiftList) with a row per scheduled phase:
              a tick, the colour, the name, its date, and Moves / Stays (by weeks) or the new date and Pushed /
              Pulled (to a date). The three buttons are SHORTCUTS that fill the ticks in; a tick changed by hand
              makes the user's own set, and then no button is pressed. Under All phases the list is folded behind
              "Choose phases…" until opened, so the box opens as short as it did. The ticks carry data-key and no
              id, inside .tools-menu, so collectFieldValues() never sees them. */}
        <div className="tools-menu" id="pop-shift" role="dialog" aria-label="Shift">
          <p className="tools-head">
            <span className="tools-grip" aria-hidden="true"></span>
            Shift
            {/* ⛔ Opens ABOVE the title and never flips (owner's spec, 9 Nov 2026, item 8: no panel, popover or
                floating control may sit over the list's rows at any width). The list is directly under this
                title now, so the default position ("right", which can flip) would lay the card over its first
                rows. Above is always clear: the toolbar and the app header are there. */}
            <InfoHint label="Shift" width={300} position="top-start" middlewares={{ flip: false, shift: true }}>
              Moves the ticked phases by a number of weeks or to a date. The gaps between them are kept; use Build Around to close them.
            </InfoHint>
            {/* THE PANEL'S OWN CONTROLS (owner, 11 Nov 2026: the panel covered the dates being read). The title row is
                the grip: drag it and the panel floats where it is dropped (engine: placePop / the head's pointerdown).
                It opens under its button every time, and a drag lasts until it closes (no Put back). A click outside closes it unless it has been dragged (owner, 16 Nov 2026); the cross closes either.
                ⛔ No id and no `title` (nothing may float over the list's rows), inside .tools-menu besides. */}
            <span className="tools-head-btns">
              <button type="button" className="tools-close" data-tools-close="" aria-label="Close">✕</button>
            </span>
          </p>
          {/* THE LIST FIRST (owner's spec, 9 Nov 2026; ANCHOR-TO-DIRECTION-PLAN.md §7.6). The What moves buttons
              (All phases | Phase & before | Phase & after) are gone: the box goes from its title straight to the
              phases, and the ticks alone say what moves.
                * The box holds a HEADER STRIP and the rows. The strip is not a column header: a select-all box
                  in the ticks' own column and the live count beside it. It is a sibling ABOVE the rows'
                  scroller, never a sticky bar over them (item 8).
                * The rows are the engine's (renderShiftList); no children here. Press a row and drag to set a
                  run; the last row touched is outlined.
                * Prior / After, under the box, name the outlined row; the engine writes their text.
              ⛔ No id on anything here: ids inside .tools-menu are skipped by the save sweep, but transient
              chrome does not get ids in this codebase. */}
          <p className="tools-cap">Phases</p>
          <div className="shift-box">
            <label className="shift-all">
              <input type="checkbox" data-shift-all="" aria-label="Tick every phase" />
              <span data-shift-count=""></span>
            </label>
            <div className="solve-list" data-shift-list=""></div>
          </div>
          <div className="tools-row shift-sides">
            <button type="button" className="shift-side" data-shift-prior=""></button>
            <button type="button" className="shift-side" data-shift-after=""></button>
          </div>
          <p className="tools-cap">How far</p>
          <div className="tools-seg" role="group" aria-label="How far" data-shift-far="">
            <button type="button" data-far="weeks">By weeks</button>
            <button type="button" data-far="date">To a date</button>
          </div>
          {/* The phase that LANDS on the date, directly above "starts on" (owner, 5 Nov 2026: the date row must
              carry its own subject, mockups/shift-date-row.html). To a date only; the engine hides it by weeks.
              ⛔ No children, and it must stay a real <select>: fillPhaseSelect() owns this element's innerHTML,
              and the handlers recover the phase name by splitting the option label on ' — '. Since 9 Nov 2026
              this is the ONE phase select in the box (the pivot row and its mirror went with the What moves
              buttons), it offers only the TICKED phases (Whole schedule too while every phase is ticked), and
              it shows the outlined row's phase: one chosen phase (fillShiftPhase). */}
          <div className="tools-row" data-shift-phase-row="">
            <select id="tool-anchor-phase" aria-label="Phase that lands on the date"></select>
          </div>
          <div className="tools-row" data-far-row="weeks">
            <input type="number" id="tool-shift-weeks" min="1" step="1" defaultValue="2" aria-label="Number of weeks to shift" />
            <span className="tools-unit">wks</span>
            <Button className="tools-half" id="tool-shift-earlier" type="button" size="xs" variant="default">Earlier</Button>
            <Button className="tools-half" id="tool-shift-later" type="button" size="xs" variant="default">Later</Button>
          </div>
          <div className="tools-row" data-far-row="date">
            {/* The option VALUES are read directly ('start' / 'end'); do not reword them. Beside the
                date, not the phase (owner, 4 Nov 2026); the phase is the row above since 5 Nov 2026. */}
            <select id="tool-anchor-edge" className="tools-edge" aria-label="Its start or its end" defaultValue="start">
              <option value="start">starts on</option>
              <option value="end">ends by</option>
            </select>
            {/* Native date input, NOT Mantine's DateInput -- syncAnchorDate() writes .value here
                imperatively every time the popover opens, and a controlled component ignores that. */}
            <input type="date" id="tool-anchor-date" aria-label="Date" />
            <Button className="tools-go" id="tool-anchor-go" type="button" size="xs" variant="default">Go</Button>
          </div>
          <p className="tools-msg" data-tools-msg=""></p>
        </div>
      </div>

      <div className="tools-wrap">
        {/* BUILD AROUND (Rebuild From until 5 Nov 2026; REBUILD-FROM-LENGTHS-PLAN.md, layout B, the name by the
            owner's picker). ⛔ The ids keep the old names (pop-solve-*, tool-solve-*), as Load kept
            data-action="open": the engine and the legs reach these controls by id, and only what a user reads
            changed. Twelve characters, as "Rebuild From" was, so the toolbar wraps no sooner. */}
        {/* The hammer is drawn only at fold step 3 (useToolbarFit), when the label gives way to it; its title is the hint. */}
        <Button className="tools-btn has-fold-ic" id="pop-solve-btn" type="button" size="xs" variant="default"
                title="Build Around: pin one phase to a date and build the others around it" aria-haspopup="true" aria-expanded="false"
                leftSection={<IconHammer className="tb-fold-ic" />}
                rightSection={<span className="caret" aria-hidden="true">▾</span>}>Build Around</Button>
        {/* 400px, the widest panel: each row holds a tick, a colour, the name, a LENGTH box, a date and "Pushed
            3 wks", and only the name gives way.
            SHIFT'S LOOK AND FEEL since 10 Nov 2026 (owner: "make Build Around match the same UI look and feel
            as the shift tool"; mockups/build-around-like-shift.html), top to bottom as in #pop-shift: the title,
            "Phases", the list in Shift's box with its header strip, Prior to X / After X, the line that says why
            a phase was left unticked, then "Pin to a date": the phase directly above "starts on", then Build.
            The list, the count, both buttons' text, the note lines and Build's label are the engine's, so none
            has children here. ⛔ No new ids: the ticks, the header box and the length boxes carry none, inside
            .tools-menu besides, so collectFieldValues() can never sweep them into a saved file. */}
        <div className="tools-menu tools-menu-solve" id="pop-solve" role="dialog" aria-label="Build around a phase">
          <p className="tools-head">
            <span className="tools-grip" aria-hidden="true"></span>
            Build Around
            {/* ⛔ Opens ABOVE the title and never flips, as Shift's does: the list is directly under it, and
                nothing may float over its rows. */}
            <InfoHint label="Build Around" width={300} position="top-start" middlewares={{ flip: false, shift: true }}>
              Pin one phase to a date and build the ticked phases around it, end to end, from their lengths. Phases with no dates yet get them. Type a length right in the list. Unticked phases stay where they are. Nothing changes until you press Build. Use Shift to move phases and keep the gaps between them.
            </InfoHint>
            {/* THE PANEL'S OWN CONTROLS (owner, 11 Nov 2026: the panel covered the dates being read). The title row is
                the grip: drag it and the panel floats where it is dropped (engine: placePop / the head's pointerdown).
                It opens under its button every time, and a drag lasts until it closes (no Put back). A click outside closes it unless it has been dragged (owner, 16 Nov 2026); the cross closes either.
                ⛔ No id and no `title` (nothing may float over the list's rows), inside .tools-menu besides. */}
            <span className="tools-head-btns">
              <button type="button" className="tools-close" data-tools-close="" aria-label="Close">✕</button>
            </span>
          </p>
          <p className="tools-cap">Phases</p>
          <div className="shift-box">
            <label className="shift-all">
              <input type="checkbox" data-solve-all="" aria-label="Tick every phase" />
              <span data-solve-count=""></span>
            </label>
            <div className="solve-list" data-solve-list=""></div>
          </div>
          {/* ⛔ NO Prior to X / After X here (owner, 10 Nov 2026: "using the build around tool is such a big change
              that i dont think we need the before and after buttons"). The box builds both sides of the pin and
              what is built is what is ticked. tool-solve-back / tool-solve-fwd are retired with them; Shift keeps
              its own pair. The line below says why a phase opened unticked. */}
          <p className="solve-left" data-solve-left="" hidden></p>
          {/* Production's length is read-only here (ruling R4); while Show info leaves it unset, this says where. */}
          <p className="solve-note" data-solve-note="" hidden>Production’s length comes from Show info. Set its episodes and shooting days there, and the phases after it can be placed.</p>
          {/* THE PIN, under the list as Shift's date row is: the phase on its own row, directly above "starts on".
              It is also the row clicked in the list (the engine writes the click into this select). "ends by" is
              ruling R3: the pin's last workday on or before the date. ⛔ No children on the phase select:
              fillPhaseSelect() owns its innerHTML. The edge's option VALUES are read directly ('start' / 'end'). */}
          <p className="tools-cap">Pin to a date</p>
          <div className="tools-row">
            <select id="tool-solve-phase" aria-label="Phase to build around"></select>
          </div>
          <div className="tools-row">
            <select id="tool-solve-edge" className="tools-edge" aria-label="Its start or its end" defaultValue="start">
              <option value="start">starts on</option>
              <option value="end">ends by</option>
            </select>
            <input type="date" id="tool-solve-date" aria-label="Date" />
          </div>
          <button type="button" className="solve-go" id="tool-solve-go"></button>
          <p className="tools-msg" data-tools-msg=""></p>
        </div>
      </div>

      </div>

      {/* The text style bar's host (TEXT-STYLE-BAR-PLAN.md, owner rulings 21 Oct 2026). EMPTY here and filled once by
          the engine (app.js, "THE TEXT STYLE BAR"), which owns every control in it -- React renders this node once and
          never gives it children, so a re-render (undo/redo) cannot touch what the engine put inside. The engine finds
          it by its class, wherever it sits. ⛔ Inside .view-toggle-row on purpose: a sibling between that row and
          #table-wrap would break the pair the contracts above need. ⛔ No id on anything in it (collectFieldValues).
          SINCE 10 NOV 2026 IT SITS ON THE FIRST LINE, after the date tools and before the page tools (owner: first "move
          the styling bar to this blank space between Month and the left shift button", then variation 27 of
          mockups/toolbar-variations.html, every section in a grey well with one gap between them, then the reorder
          "Month/Waterfall - Shift tool/Build Around - Styling Menu - Fill gaps/side boxes/header - undo/redo"). It was a full-width
          second line of this row, a boxed bar with a "Text" label and a hint. The well is drawn on the engine's
          .style-bar (width:max-content), never on this host, which grows when the bar has its own line. Where the
          sections no longer fit on one line, the bar alone drops to its own line under them, its old place
          (useToolbarFit above). Since 16 Nov 2026 it never leaves the line: at fold step 4 it opens under the Text button. */}
      {/* Fold step 4 (useToolbarFit): the text style buttons fold behind this button and open under it. Hidden below
          that step. preventDefault on the press keeps the focus and the text picked where they are, so the buttons
          act on them once the menu is open. No id (collectFieldValues), and a <button>, never an input. */}
      <button type="button" className="tb-text-btn" ref={textBtnRef}
              title="Text style: size, bold, italic, color, alignment"
              aria-haspopup="true" aria-expanded={textOpen ? 'true' : 'false'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTextOpen((o) => !o)}>
        <span className="tb-text-aa" aria-hidden="true">Aa</span><span className="caret" aria-hidden="true">▾</span>
      </button>
      <div className="style-bar-host"></div>

      <div className="preview-tools">
        {/* THE PAGE TOOLS (owner, 11 Nov 2026, card 4b of mockups/toolbar-month-parity.html): each its own grey button, no
            shared well. The first two places are a SLOT (.tb-slots, a one-cell grid): in the waterfall it shows Fill Gaps and
            Side Boxes, in the month view the month stepper (it left its own line under the phase map, and its Today button
            went: "get rid of the today button entirely and just make the stepper larger"). Both sit in the same grid cell,
            the view not shown kept by visibility, so the cell is one width in both views and Header, Undo and Redo never
            move when you switch ("the menu should be locked where it is").
            ⚠️ That holds only because the stepper adds NO width to the cell (audit 2.14, AUD2-034: legacy.css gives it
            `container-type:inline-size`, and it shortens to "Sep 2027" where the full name does not fit). At 1300 px and
            below Fill Gaps is its bare switch, the pair is about 142 px, and the stepper had made the cell wider in the
            month view only: at 1280 px the first line wrapped there and not in the waterfall. */}
        {/* THE MORE MENU (fold step 2, useToolbarFit). Below that step this wrapper is display:contents and its button
            hidden, so the page tools sit in the line exactly as before; from it, they are SHOWN in a panel under the
            button instead (the same nodes, ids and engine bindings: see useFoldMenu). */}
        {/* Side Boxes' and Header's own menus cascade beside the open panel (app.js, cascadeFrom), on a click or on
            hover (onPanelOver), and the panel stays open behind them, as a menu's parent does. */}
        <div className={'tb-more' + (moreOpen ? ' is-open' : '')} ref={moreRef} onMouseOver={onPanelOver}>
        <button type="button" className="tb-more-btn" title="More tools"
                aria-label="More tools" aria-haspopup="true" aria-expanded={moreOpen ? 'true' : 'false'}
                onClick={() => setMoreOpen((o) => !o)}>
          <IconDots className="btn-ic" />
        </button>
        <div className="tb-page">
        <div className="tb-slots">
        <div className="tb-pair">
        {/* Fill Space (owner, 9 Nov 2026: "a toggle to the left of side boxes button that turns on or off expand rows to
            fill empty space"). On, phases widen into the empty columns beside them (the layout as it was); off, every
            phase keeps its own lane. The engine flips it by DELEGATION on this id and pushes {visible, on} back
            (chrome.fillSpaceBtn). ⛔ A <button> with aria-pressed and a drawn switch, NEVER a Mantine Switch: that
            renders an input with an automatic id, and collectFieldValues() would sweep it into every saved file and
            add phantom undo steps. The switch drawn inside is a span (.fill-switch), not a control. Always rendered,
            visibility by display, as the header's view-following buttons are. */}
        {/* ⚠️ Since 11 Nov 2026 it is never display:none: where it does not apply yet (a calendar still on the layout it was
            saved with) it stays in its place, greyed, so the toolbar does not change as you click around (owner). */}
        <Button id="tb-fill-space-btn" className="tools-btn tb-solo fill-space-btn" type="button" size="xs" variant="default"
                aria-pressed={fill.on ? 'true' : 'false'}
                disabled={!fill.visible}
                title={!fill.visible
                  ? 'Fill Gaps works once this calendar uses the automatic column layout: press Update layout in the notice above.'
                  : fill.on
                  ? 'Phases widen into the empty columns beside them. Click to keep every phase in its own lane.'
                  : 'Every phase keeps its own lane. Click to let phases widen into the empty columns beside them.'}
                leftSection={<span className={'fill-switch' + (fill.on ? ' is-on' : '')} aria-hidden="true"><span className="fill-knob" /></span>}>
          {/* "Fill Gaps", not "Fill Space" (owner, 10 Nov 2026). Only the words changed: the id, the engine's
              fillSpaceOff and the saved key keep the old name, as Load kept data-action="open". */}
          Fill Gaps
        </Button>

        {/* Side boxes (owner ruling 7 + Q7, 20 Oct 2026; SIDE-BOXES-PLAN.md): adds a colour key or a
            text box beside the waterfall. The engine opens its menu (openSideMenu) by DELEGATION,
            exactly as it does the header mode menu below, because React owns this node. Waterfall
            view only: legacy.css hides it while #view-month-btn is active. A <button>, never an
            id'd input/select/textarea, so collectFieldValues() cannot sweep it into a saved file. */}
        <Button id="tb-side-boxes-btn" className="tools-btn tb-solo" type="button" size="xs" variant="default"
                title="Add a color key or a text box beside the waterfall"
                aria-haspopup="true" aria-expanded="false"
                rightSection={<span className="caret" aria-hidden="true">▾</span>}>
          Side Boxes
        </Button>
        </div>
        {/* The month view's occupant of the slot: renders nothing in the waterfall. */}
        <MonthStepper />
        </div>

        {/* The header's MODE button (owner ruling 1, relayed 30 Sep 2026; built after v1.4.1). It
            used to live INSIDE the calendar -- #hdr-mode-btn / #mv-hdr-mode-btn, emitted by the
            frozen renderers, which still emit them: they are hidden by CSS, never deleted. This is
            chrome, so it may look like its neighbours: the mode word the owner's mockups kept, plus
            a caret. The engine opens the SAME mode menu (openHeaderModePop) under this button, for
            whichever view is showing; it reaches the button by DELEGATION, because React owns it.
            ⚠️ Measured before it was built (HANDOFF, 30 Sep 2026): this and a notes reset together
            wrapped this row below 1414 px, so the notes reset went to the app header instead (the
            owner's fallback). This button alone wraps the row below about 1301 px.
            It is a <button>, never an id'd input/select/textarea, so collectFieldValues() cannot
            sweep it into a saved file. */}
        {/* ⚠️ A FIXED WIDTH, that of its longest label (useFixedHeaderWidth), so switching Auto / Template / Manual / Off
            never resizes it and the toolbar stays put as you click around (owner, 11 Nov 2026). */}
        <Button id="tb-hdr-mode-btn" ref={hdrRef} className={'tools-btn tb-solo has-fold-ic' + (hdr.mode === 'auto' ? '' : ' is-manual')}
                style={hdrW ? { width: hdrW } : undefined}
                type="button" size="xs" variant="default"
                title={hdrLabel + (hdr.view === 'month'
                  ? '. Choose how the Month view’s header is written: Auto, Template or Manual, or turn it Off'
                  : '. Choose how the header is written: Auto, Template or Manual, or turn it Off')}
                aria-haspopup="true" aria-expanded="false"
                leftSection={<IconHeading className="tb-fold-ic" />}
                rightSection={<span className="caret" aria-hidden="true">▾</span>}>
          {/* 'off' is Header: Off: the waterfall's (owner ruling 10, 20 Oct 2026) and, since 23 Oct 2026, the month's. */}
          {hdrLabel}
        </Button>

        </div>
        </div>

        {/* Paste notes… lived here (MONTH-NOTES-PLAN.md §5) until the owner moved it into the Settings
            window's Calendar tab, Month view card (20 Oct 2026, "put paste notes into settings"). Same id,
            same engine listener: see CalendarMonthCard in Sidebar.jsx. */}

        {/* ⛔ THE BATCH-EXPAND BUTTON ("Expand N" / "Pull back N") AND THE TWO SWAP BUTTONS ("◀ Swap" /
            "Swap ▶") USED TO SIT HERE, and are gone (owner ruling 2, relayed 30 Sep 2026; built
            after v1.4.1). They only duplicated gestures on the grid itself: double-click (or Enter)
            on a selected cell expands or pulls back, Alt+Left / Alt+Right swaps its column, and the
            swap knob takes a click or a drag. The selection's chip on the grid says "Double click to
            expand cells" (owner, 21 Oct 2026); the Help has the swap keys. Their delegated engine listeners went in
            the same change; the engine keeps pushing chrome.gridSelection, which nothing renders. */}

        {/* UNDO / REDO, LAST (owner, 10 Nov 2026, the reorder above). Back at the end of .preview-tools, where it was before
            variation 27 briefly put it first. A grey well like the text buttons' and the page tools'. The ids, the
            Tooltips and the bridged disabled state are unchanged. The hints name the keys for the computer they are on
            (audit 2026-11, WIN-3; src/chrome/keys.js): Undo (Ctrl+Z) on Windows and Linux, Undo (⌘Z) on a Mac, and
            Redo in Apple's order there (⇧⌘Z, as Help writes it; it read ⌘⇧Z until then). */}
        <Group className="undo-redo-group" gap="xxs" wrap="nowrap">
          <Tooltip label={'Undo (' + keyLabel('Mod+Z') + ')'} position="bottom" withArrow>
            <ActionIcon id="undo-btn" className="icon-btn" variant="subtle" color="gray" size="md"
                        disabled={undoRedo.undo} aria-label="Undo"><IconUndo className="btn-ic" /></ActionIcon>
          </Tooltip>
          <Tooltip label={'Redo (' + keyLabel('Mod+Shift+Z') + ')'} position="bottom" withArrow>
            <ActionIcon id="redo-btn" className="icon-btn" variant="subtle" color="gray" size="md"
                        disabled={undoRedo.redo} aria-label="Redo"><IconRedo className="btn-ic" /></ActionIcon>
          </Tooltip>
        </Group>

      </div>

      {/* The phase map (MONTH-RAIL-PLAN.md, owner, 27 Oct 2026, option 3d+): a full-width line of this row in the month
          view only, under the toggle and the tools (and, since 10 Nov 2026, the style bar's buttons beside them). Its own
          component with its own state, so its re-renders never reach this component's engine-owned children. Inside
          this row for the reason the style bar's host is. */}
      <MonthMap />
      {/* The month stepper's old line (MONTH-RAIL-PLAN.md §18, 28 Oct 2026). Since 11 Nov 2026 the stepper sits in the
          toolbar's slot (above), so this line is always empty and takes no room (.style-row:empty). Kept as the place the
          text style bar's own line orders against on a narrow window. */}
      <div className="style-row"></div>
    </>
  )
}
