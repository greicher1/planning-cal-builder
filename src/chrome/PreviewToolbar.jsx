// The preview toolbar: the view toggle, the Shift All split control, the four adjustment popovers
// and undo/redo.
//
// ⚠️ READ THIS BEFORE REACHING FOR A MANTINE COMPONENT HERE. This surface is different in kind from
// the header, and the difference decides the whole design.
//
// The header's state was PRESENTATIONAL -- labels, disabled, a status string -- so a bridge that
// pushed data into React worked cleanly. This toolbar's state is ENGINE-OWNED by construction: the
// engine reads .value off eight controls, writes .innerHTML into three <select>s (fillPhaseSelect),
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
//   1. ⛔ Popover, for the four .tools-menu panels. Two independent reasons, either fatal:
//      * `withinPortal: true` is in Popover's defaultProps, and portalling moves the dropdown out
//        from under .tools-menu -- which is the ENTIRE mechanism keeping this surface's eight id'd
//        controls out of every saved file and every undo step. collectFieldValues() sweeps
//        `input[id], select[id], textarea[id]` and excludes exactly one thing:
//        `el.closest('.tools-menu')`. Portal them and eight junk keys land in the save format.
//      * Popover mounts its dropdown from an EFFECT, so #pop-shift and friends would not exist when
//        the IIFE evaluates -- and the engine collects all four trigger/menu pairs BY ID at
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
        {/* Shift All is a SPLIT control: the arrows act on one click (much the most-used thing
            here, so it must not move behind a popover) and the caret beside them opens the
            multi-week form. Each of the other tools gets its own button and its own small
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
          <button className="shift-btn shift-main" id="pop-shift-btn" type="button" title="Shift the whole calendar by any number of weeks" aria-haspopup="true" aria-expanded="false">Shift All <span className="caret" aria-hidden="true">▾</span></button>
          <button className="shift-btn" id="shift-fwd-btn" type="button" title="Shift the whole calendar one week later">1 wk →</button>
          {/* The readout is only ever made visible by `.shift-group.flash .shift-readout`, and its
              pointer-events:none is load-bearing: without it the readout swallowed a click aimed at
              Reset Notes & Hiatus. */}
          <span className="shift-readout" id="shift-readout" role="status" aria-live="polite"></span>

          <div className="tools-menu tools-menu-sm" id="pop-shift" role="dialog" aria-label="Shift All">
            <p className="tools-head">
              Shift All
              <InfoHint label="Shift All" width={300}>
                Every phase moves by the same amount — the arrows do one week. The gaps between them stay exactly as they are.
              </InfoHint>
            </p>
            <div className="tools-row">
              <input type="number" id="tool-shift-weeks" min="1" step="1" defaultValue="2" aria-label="Number of weeks to shift" />
              <span className="tools-unit">weeks</span>
              <Button className="tools-go" id="tool-shift-earlier" type="button" size="xs" variant="default">Earlier</Button>
              <Button className="tools-go" id="tool-shift-later" type="button" size="xs" variant="default">Later</Button>
            </div>
            <p className="tools-msg" data-tools-msg=""></p>
          </div>
        </div>

        <div className="tools-wrap">
          <Button className="tools-btn" id="pop-ripple-btn" type="button" size="xs" variant="default"
                  title="Shift one phase and everything after it" aria-haspopup="true" aria-expanded="false"
                  rightSection={<span className="caret" aria-hidden="true">▾</span>}>Shift From</Button>
          <div className="tools-menu" id="pop-ripple" role="dialog" aria-label="Shift From">
            <p className="tools-head">
              Shift From
              <InfoHint label="Shift From" width={300}>
                The phase you pick and everything after it move. Earlier phases stay put, so the gap in front of it opens or closes. Earlier and Later are directions of travel, not which side moves.
              </InfoHint>
            </p>
            <div className="tools-row">
              {/* ⛔ No children, and it must stay a real <select>: fillPhaseSelect() owns this
                  element's innerHTML, and three handlers recover the phase name by splitting the
                  option label on ' — '. */}
              <select id="tool-ripple-phase" aria-label="Phase to shift from, along with everything after it"></select>
              <input type="number" id="tool-ripple-weeks" min="1" step="1" defaultValue="1" aria-label="Number of weeks to shift" />
              <span className="tools-unit">wks</span>
            </div>
            <div className="tools-row">
              <Button className="tools-half" id="tool-ripple-earlier" type="button" size="xs" variant="default">Earlier</Button>
              <Button className="tools-half" id="tool-ripple-later" type="button" size="xs" variant="default">Later</Button>
            </div>
            <p className="tools-msg" data-tools-msg=""></p>
          </div>
        </div>

        <div className="tools-wrap">
          <Button className="tools-btn" id="pop-anchor-btn" type="button" size="xs" variant="default"
                  title="Slide the calendar so one landmark lands on a date" aria-haspopup="true" aria-expanded="false"
                  rightSection={<span className="caret" aria-hidden="true">▾</span>}>Anchor To</Button>
          <div className="tools-menu" id="pop-anchor" role="dialog" aria-label="Anchor to a date">
            <p className="tools-head">
              Anchor to a date
              <InfoHint label="Anchor to a date" width={300}>
                Every phase moves so your date lands on the phase you pick — like Shift All, but you name the destination instead of the distance. Gaps are preserved; use Rebuild From if you want them closed.
              </InfoHint>
            </p>
            <div className="tools-row">
              <select id="tool-anchor-phase" aria-label="What to anchor"></select>
              {/* The option VALUES are read directly ('start' / 'end'); do not reword them. */}
              <select id="tool-anchor-edge" className="tools-edge" aria-label="Anchor its start or its end" defaultValue="start">
                <option value="start">starts on</option>
                <option value="end">ends by</option>
              </select>
            </div>
            <div className="tools-row">
              {/* Native date input, NOT Mantine's DateInput -- syncAnchorDate() writes .value here
                  imperatively every time the popover opens, and a controlled component ignores that. */}
              <input type="date" id="tool-anchor-date" aria-label="Date to anchor it to" />
              <Button className="tools-go" id="tool-anchor-go" type="button" size="xs" variant="default">Go</Button>
            </div>
            <p className="tools-msg" data-tools-msg=""></p>
          </div>
        </div>

        <div className="tools-wrap">
          <Button className="tools-btn" id="pop-solve-btn" type="button" size="xs" variant="default"
                  title="Rebuild the phases on one side of a fixed date" aria-haspopup="true" aria-expanded="false"
                  rightSection={<span className="caret" aria-hidden="true">▾</span>}>Rebuild From</Button>
          {/* Wider than the others: its phase + "starts" + date row clips the phase name below 364px. */}
          <div className="tools-menu tools-menu-lg" id="pop-solve" role="dialog" aria-label="Rebuild from a date">
            <p className="tools-head">
              Rebuild from a date
              <InfoHint label="Rebuild from a date" width={300}>
                Doesn’t move the calendar — rebuilds it. Your date stays put, and the phases on one side are recalculated from their week counts to run with no gaps — including any that aren’t dated yet. Use Anchor To if the plan should keep its current spacing.
              </InfoHint>
            </p>
            <div className="tools-row">
              <select id="tool-solve-phase" aria-label="Phase to work from"></select>
              <span className="tools-unit">starts</span>
              <input type="date" id="tool-solve-date" className="tools-date-fixed" aria-label="Date that phase should start on" />
            </div>
            <div className="tools-row">
              <Button className="tools-half" id="tool-solve-back" type="button" size="xs" variant="default">← Work backwards</Button>
              <Button className="tools-half" id="tool-solve-fwd" type="button" size="xs" variant="default">Work forwards →</Button>
            </div>
            {/* Folded in here rather than given its own button: it IS Work-forwards from the first
                phase at whatever date it already sits on, and the row has no spare width. */}
            <div className="tools-div"></div>
            <Button className="tools-wide" id="tool-close-gaps" type="button" size="xs" variant="default" fullWidth>Close all gaps between phases</Button>
            <p className="tools-msg" data-tools-msg=""></p>
          </div>
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
        <Button id="tb-hdr-mode-btn" className={'tools-btn' + (hdr.mode === 'auto' ? '' : ' is-manual')}
                type="button" size="xs" variant="default"
                title={hdr.view === 'month'
                  ? 'Choose how the Month view’s header is written: Auto, Template or Manual'
                  : 'Choose how the header is written: Auto, Template or Manual'}
                aria-haspopup="true" aria-expanded="false"
                rightSection={<span className="caret" aria-hidden="true">▾</span>}>
          {hdr.mode === 'template' ? 'Header: Template' : hdr.mode === 'manual' ? 'Header: Manual' : 'Header: Auto'}
        </Button>

        {/* ⛔ THE BATCH-EXPAND BUTTON ("Expand N" / "Pull back N") AND THE TWO SWAP BUTTONS ("◀ Swap" /
            "Swap ▶") USED TO SIT HERE, and are gone (owner ruling 2, relayed 30 Sep 2026; built
            after v1.4.1). They only duplicated gestures on the grid itself: double-click (or Enter)
            on a selected cell expands or pulls back, Alt+Left / Alt+Right swaps its column, and the
            swap knob takes a click or a drag. The selection's count chip on the grid names both
            ("double-click to expand · Alt+←/→ to swap"). Their delegated engine listeners went in
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
    </>
  )
}
