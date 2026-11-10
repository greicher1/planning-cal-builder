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
import { useState, useLayoutEffect } from 'react'
import { InfoHint } from './InfoHint.jsx'
import { Button, ActionIcon, Tooltip, Group } from '@mantine/core'
import { installChrome } from './bridge.js'
import { IconRows, IconCalendarPlain, IconUndo, IconRedo } from './icons.jsx'
import { MonthMap, MonthStepper } from './MonthMap.jsx'

// WHERE THE TEXT STYLE BAR GOES (owner, 10 Nov 2026). It sits between the view toggle and the tools while all three
// fit on the row's first line. Where they don't, it takes `.style-own-line` on the row, and CSS puts the bar alone
// on a line under them, its old place: a plain flex wrap would have pushed the TOOLS down instead, moving Shift and
// Undo on every narrow window. Measured, not a media query: the tools' width changes with the view (Side Boxes is
// waterfall only), the Header button's label and the window (Fill Space's label goes at 1300 px).
// * None of the three widths depends on where the bar is, so the choice cannot flip-flop: the toggle and the tools
//   are flex:none at their content width (the tools clamped at the row's, which only happens when nothing fits), and
//   the bar is width:max-content.
// * The bar's hidden highlight well counts as shown. It appears for a header or box line, and a toolbar that jumped
//   to two lines when a header line was clicked would be worse than one that drops a little sooner.
// * Applied a frame later: changing the row's height inside the observer's own callback is what makes Chrome report
//   "ResizeObserver loop completed with undelivered notifications" as a page error, which legs count.
// * The class is on .view-toggle-row, which the static skeleton owns (src/index.html); the engine only reads it.
function useStyleBarFit() {
  useLayoutEffect(() => {
    const row = document.querySelector('.view-toggle-row')
    const host = row && row.querySelector('.style-bar-host')
    const toggle = row && row.querySelector('.view-toggle')
    const tools = row && row.querySelector('.preview-tools')
    if (!row || !host || !toggle || !tools || typeof ResizeObserver === 'undefined') return
    let frame = 0, watchedBar = null
    const fit = () => {
      frame = 0
      const bar = host.firstElementChild
      if (!bar) { row.classList.remove('style-own-line'); return }
      if (bar !== watchedBar) { ro.observe(bar); watchedBar = bar }
      const hl = bar.querySelector('.hf-swatch-hl'), sw = bar.querySelector('.hf-swatch:not(.hf-swatch-hl)')
      const barCs = getComputedStyle(bar), rowCs = getComputedStyle(row)
      const reserve = hl && hl.hidden && sw ? sw.offsetWidth + (parseFloat(barCs.columnGap) || 0) : 0
      const gap = parseFloat(rowCs.columnGap) || 0
      const hostLead = parseFloat(getComputedStyle(host).marginLeft) || 0
      const need = toggle.offsetWidth + gap + hostLead + bar.offsetWidth + reserve + gap + tools.offsetWidth
      row.classList.toggle('style-own-line', row.clientWidth - (parseFloat(rowCs.paddingLeft) || 0) - (parseFloat(rowCs.paddingRight) || 0) < need)
    }
    const later = () => { if (!frame) frame = requestAnimationFrame(fit) }
    const ro = new ResizeObserver(later)
    ;[row, host, toggle, tools].forEach((el) => ro.observe(el))
    // The engine fills the host after React mounts; a mutation says so even on a page that is not painting.
    const mo = new MutationObserver(later)
    mo.observe(host, { childList: true })
    fit()
    return () => { ro.disconnect(); mo.disconnect(); if (frame) cancelAnimationFrame(frame) }
  }, [])
}

export function PreviewToolbar() {
  useStyleBarFit()
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

      {/* The text style bar's host (TEXT-STYLE-BAR-PLAN.md, owner rulings 21 Oct 2026). EMPTY here and filled once by
          the engine (app.js, "THE TEXT STYLE BAR"), which owns every control in it -- React renders this node once and
          never gives it children, so a re-render (undo/redo) cannot touch what the engine put inside. The engine finds
          it by its class, wherever it sits. ⛔ Inside .view-toggle-row on purpose: a sibling between that row and
          #table-wrap would break the pair the contracts above need. ⛔ No id on anything in it (collectFieldValues).
          SINCE 10 NOV 2026 IT SITS HERE, between Waterfall | Month and Shift, as the bare buttons (owner: "move the
          styling bar to this blank space between Month and the left shift button. It should only be the buttons ...
          not the surrounding box, text, etc"). It was a full-width second line of this row, a boxed bar with a "Text"
          label and a hint. Where the three no longer fit on one line, the bar alone drops to its own line under them,
          its old place (useStyleBarFit below), so a narrow window looks as it did and Shift and Undo never move. */}
      <div className="style-bar-host"></div>

      <div className="preview-tools">
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
              Shift
              {/* ⛔ Opens ABOVE the title and never flips (owner's spec, 9 Nov 2026, item 8: no panel, popover or
                  floating control may sit over the list's rows at any width). The list is directly under this
                  title now, so the default position ("right", which can flip) would lay the card over its first
                  rows. Above is always clear: the toolbar and the app header are there. */}
              <InfoHint label="Shift" width={300} position="top-start" middlewares={{ flip: false, shift: true }}>
                Moves the ticked phases by a number of weeks or to a date. The gaps between them are kept; use Build Around to close them.
              </InfoHint>
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
          <Button className="tools-btn" id="pop-solve-btn" type="button" size="xs" variant="default"
                  title="Pin one phase to a date and build the others around it" aria-haspopup="true" aria-expanded="false"
                  rightSection={<span className="caret" aria-hidden="true">▾</span>}>Build Around</Button>
          {/* 400px, the widest panel: each row holds a tick, a colour, the name, a LENGTH box, a date and "Pushed
              3 wks", and only the name gives way. */}
          <div className="tools-menu tools-menu-solve" id="pop-solve" role="dialog" aria-label="Build around a phase">
            <p className="tools-head">
              Build around a phase
              <InfoHint label="Build around a phase" width={300}>
                Pin one phase to a date and build the others around it, end to end, from their lengths. Phases with no dates yet get them. Type a length right in the list. Unticked phases stay where they are. Nothing changes until you press Build. Use Shift to move phases and keep the spacing between them.
              </InfoHint>
            </p>
            {/* The first row reads as a sentence: [Production ▾] [starts ▾] [6/14/2027]. The phase list names the
                phase alone (its date is in the box beside it). "ends by" is ruling R3: the pin's last workday on
                or before the date. ⛔ No children on the phase select: fillPhaseSelect() owns its innerHTML. The
                edge's option VALUES are read directly ('start' / 'end'). */}
            <div className="tools-row">
              <select id="tool-solve-phase" aria-label="Phase to build around"></select>
              <select id="tool-solve-edge" className="tools-edge tools-edge-solve" aria-label="Its start or its end" defaultValue="start">
                <option value="start">starts</option>
                <option value="end">ends by</option>
              </select>
              <input type="date" id="tool-solve-date" className="tools-date-fixed" aria-label="Date" />
            </div>
            {/* Shortcuts that fill in the ticks, as Shift's three buttons do: Before ticks the default set on the
                pin's earlier side, After its later side, Both both. A tick changed by hand leaves none pressed.
                tool-solve-back / tool-solve-fwd are the old direction buttons' ids, kept so the legs that click
                them still pick one side. Plain <button>s with aria-pressed, which the engine sets. The list, its
                count, the note and the button's label are all written by the engine, so none has children here;
                the ticks and the length boxes it writes carry no id, inside .tools-menu besides, so
                collectFieldValues() can never sweep them into a saved file. */}
            <p className="tools-head">
              Phases to build<span className="solve-count" data-solve-count=""></span>
            </p>
            <div className="solve-dir" role="group" aria-label="Which phases to build">
              <button type="button" id="tool-solve-back" data-dir="-1">← Before</button>
              <button type="button" id="tool-solve-both" data-dir="0">Both</button>
              <button type="button" id="tool-solve-fwd" data-dir="1">After →</button>
            </div>
            <div className="solve-list" data-solve-list=""></div>
            {/* Production's length is read-only here (ruling R4); while Show info leaves it unset, this says where. */}
            <p className="solve-note" data-solve-note="" hidden>Production’s length comes from Show info. Set its episodes and shooting days there, and the phases after it can be placed.</p>
            <button type="button" className="solve-go" id="tool-solve-go"></button>
            <p className="tools-msg" data-tools-msg=""></p>
          </div>
        </div>

        {/* Fill Space (owner, 9 Nov 2026: "a toggle to the left of side boxes button that turns on or off expand rows to
            fill empty space"). On, phases widen into the empty columns beside them (the layout as it was); off, every
            phase keeps its own lane. The engine flips it by DELEGATION on this id and pushes {visible, on} back
            (chrome.fillSpaceBtn). ⛔ A <button> with aria-pressed and a drawn switch, NEVER a Mantine Switch: that
            renders an input with an automatic id, and collectFieldValues() would sweep it into every saved file and
            add phantom undo steps. The switch drawn inside is a span (.fill-switch), not a control. Always rendered,
            visibility by display, as the header's view-following buttons are. */}
        <Button id="tb-fill-space-btn" className="tools-btn fill-space-btn" type="button" size="xs" variant="default"
                aria-pressed={fill.on ? 'true' : 'false'}
                style={{ display: fill.visible ? undefined : 'none' }}
                title={fill.on
                  ? 'Phases widen into the empty columns beside them. Click to keep every phase in its own lane.'
                  : 'Every phase keeps its own lane. Click to let phases widen into the empty columns beside them.'}
                leftSection={<span className={'fill-switch' + (fill.on ? ' is-on' : '')} aria-hidden="true"><span className="fill-knob" /></span>}>
          Fill Space
        </Button>

        {/* Side boxes (owner ruling 7 + Q7, 20 Oct 2026; SIDE-BOXES-PLAN.md): adds a colour key or a
            text box beside the waterfall. The engine opens its menu (openSideMenu) by DELEGATION,
            exactly as it does the header mode menu below, because React owns this node. Waterfall
            view only: legacy.css hides it while #view-month-btn is active. A <button>, never an
            id'd input/select/textarea, so collectFieldValues() cannot sweep it into a saved file. */}
        <Button id="tb-side-boxes-btn" className="tools-btn" type="button" size="xs" variant="default"
                title="Add a colour key or a text box beside the waterfall"
                aria-haspopup="true" aria-expanded="false"
                rightSection={<span className="caret" aria-hidden="true">▾</span>}>
          Side Boxes
        </Button>

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
        <Button id="tb-hdr-mode-btn" className={'tools-btn' + (hdr.mode === 'auto' ? '' : ' is-manual')}
                type="button" size="xs" variant="default"
                title={hdr.view === 'month'
                  ? 'Choose how the Month view’s header is written: Auto, Template or Manual, or turn it Off'
                  : 'Choose how the header is written: Auto, Template or Manual, or turn it Off'}
                aria-haspopup="true" aria-expanded="false"
                rightSection={<span className="caret" aria-hidden="true">▾</span>}>
          {/* 'off' is Header: Off: the waterfall's (owner ruling 10, 20 Oct 2026) and, since 23 Oct 2026, the month's. */}
          {hdr.mode === 'template' ? 'Header: Template' : hdr.mode === 'manual' ? 'Header: Manual'
            : hdr.mode === 'off' ? 'Header: Off' : 'Header: Auto'}
        </Button>

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

        <Group className="undo-redo-group" gap="xxs" wrap="nowrap">
          <Tooltip label="Undo (⌘Z)" position="bottom" withArrow>
            <ActionIcon id="undo-btn" className="icon-btn" variant="subtle" color="gray" size="md"
                        disabled={undoRedo.undo} aria-label="Undo"><IconUndo className="btn-ic" /></ActionIcon>
          </Tooltip>
          <Tooltip label="Redo (⌘⇧Z)" position="bottom" withArrow>
            <ActionIcon id="redo-btn" className="icon-btn" variant="subtle" color="gray" size="md"
                        disabled={undoRedo.redo} aria-label="Redo"><IconRedo className="btn-ic" /></ActionIcon>
          </Tooltip>
        </Group>
      </div>

      {/* The phase map (MONTH-RAIL-PLAN.md, owner, 27 Oct 2026, option 3d+): a full-width line of this row in the month
          view only, ABOVE the style bar, so the style bar sits on the calendar it styles. Its own component with its own
          state, so its re-renders never reach this component's engine-owned children. Inside this row for the reason
          the style bar's host is. */}
      <MonthMap />
      {/* The month stepper's line (MONTH-RAIL-PLAN.md §18, option B, 28 Oct 2026). It shared this line with the text
          style bar until the bar moved up beside the view toggle (10 Nov 2026), and it keeps the line alone, at its
          right end. In the waterfall the stepper renders nothing and the empty line takes no room (.style-row:empty).
          When the bar has had to drop to its own line (a narrow window) it rejoins the stepper here, by flex order
          only, so the month view looks as it did. */}
      <div className="style-row">
        <MonthStepper />
      </div>
    </>
  )
}
