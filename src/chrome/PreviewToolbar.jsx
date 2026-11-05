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

export function PreviewToolbar() {
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

  useLayoutEffect(() => {
    installChrome({
      undoRedo: (patch) => setUndoRedo((s) => ({ ...s, ...patch })),
      headerModeBtn: (s) => setHdr((p) => ({ ...p, ...s })),
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
              <InfoHint label="Shift" width={300}>
                Moves phases by a number of weeks or to a date. Choose whether all phases move, or one phase and the ones after it or before it, or tick the phases yourself. Gaps are kept; use Build Around to close them.
              </InfoHint>
            </p>
            <p className="tools-cap">What moves</p>
            <div className="tools-seg" role="group" aria-label="What moves" data-shift-move="">
              <button type="button" data-move="all">All phases</button>
              <button type="button" data-move="before">Phase &amp; before</button>
              <button type="button" data-move="after">Phase &amp; after</button>
            </div>
            <div className="tools-row" data-shift-phase-row="">
              {/* ⛔ No children, and it must stay a real <select>: fillPhaseSelect() owns this
                  element's innerHTML, and the handlers recover the phase name by splitting the
                  option label on ' — '. Whole schedule is in it only for All phases to a date.
                  Since 5 Nov 2026 this row shows ONLY under Phase & before / after, where the phase
                  is the pivot; under All phases or a hand-picked set the phase that lands on a date
                  is picked on the subject row under How far, a mirror of this select (owner: "is
                  this confusing?", mockups/shift-date-row.html). This one stays the source of truth
                  every reader asks, shown or hidden. */}
              <select id="tool-anchor-phase" aria-label="Phase"></select>
            </div>
            {/* The list (see the head of this block). No children: the engine owns everything inside. The link
                and the list wrap are shown or hidden by the engine through `hidden`. */}
            <button type="button" className="tools-link" data-shift-choose="">Choose phases…</button>
            <div data-shift-list-wrap="">
              <p className="tools-head">Phases<span className="solve-count" data-shift-count=""></span></p>
              <div className="solve-list" data-shift-list=""></div>
            </div>
            <p className="tools-cap">How far</p>
            <div className="tools-seg" role="group" aria-label="How far" data-shift-far="">
              <button type="button" data-far="weeks">By weeks</button>
              <button type="button" data-far="date">To a date</button>
            </div>
            {/* The SUBJECT of the date row (owner, 5 Nov 2026, mockups/shift-date-row.html): the date row used to
                read "starts on 3/2/26" with its phase two sections up, past the How far toggle. Under All phases
                or a hand-picked set, To a date, the phase that lands is picked HERE, directly above "starts on":
                a mirror of #tool-anchor-phase that the engine fills from it and writes back into it on change,
                so every reader keeps asking the one select. No id, so it never enters fields.byId. Under Phase &
                before / after the pivot (the row above) is the phase that lands, and the line repeats its name as
                text. Which one shows is the engine's, through `hidden`; by weeks neither does. */}
            <div className="tools-row" data-shift-subject-row="">
              <select data-shift-subject="" aria-label="Phase that lands on the date"></select>
            </div>
            <p className="tools-subject" data-shift-subject-line=""></p>
            <div className="tools-row" data-far-row="weeks">
              <input type="number" id="tool-shift-weeks" min="1" step="1" defaultValue="2" aria-label="Number of weeks to shift" />
              <span className="tools-unit">wks</span>
              <Button className="tools-half" id="tool-shift-earlier" type="button" size="xs" variant="default">Earlier</Button>
              <Button className="tools-half" id="tool-shift-later" type="button" size="xs" variant="default">Later</Button>
            </div>
            <div className="tools-row" data-far-row="date">
              {/* The option VALUES are read directly ('start' / 'end'); do not reword them. Beside the
                  date, not the phase (owner, 4 Nov 2026); the phase is the line above since 5 Nov 2026. */}
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
      {/* The text style bar's host (TEXT-STYLE-BAR-PLAN.md, owner rulings 21 Oct 2026): a full-width second line
          of this row, under the toggle and the tools, outside the calendar. EMPTY here and filled once by the
          engine (app.js, "THE TEXT STYLE BAR"), which owns every control in it -- React renders this node once
          and never gives it children, so a re-render (undo/redo) cannot touch what the engine put inside.
          ⛔ Inside .view-toggle-row on purpose: a sibling between that row and #table-wrap would break the pair
          the contracts above need. ⛔ No id on anything in it (collectFieldValues).
          Since 28 Oct 2026 it shares a line with the month stepper (MONTH-RAIL-PLAN.md §18, option B): .style-row is
          that line, full width as the host was. The engine finds the host by its class, so the wrapper changes
          nothing for it, and the host still gets no React children. In the waterfall the stepper renders nothing. */}
      <div className="style-row">
        <div className="style-bar-host"></div>
        <MonthStepper />
      </div>
    </>
  )
}
