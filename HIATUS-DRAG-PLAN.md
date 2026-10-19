# HIATUS-DRAG-PLAN.md — drag a hiatus in the month view

**Status (19 Oct 2026): BUILT, gated, and committed as `fffb589` on branch `hiatus-drag` (worktree
`.claude/worktrees/hiatus-drag`). Not merged into `main`, not pushed. The owner ruled on all four decisions (§8). §10 is the as-built record. Where it differs from the
plan above, §10 is right.**

Owner, 19 Oct 2026: *"plan month-view hiatus drag grips (whole-week move and edges, same pattern as
the phase grips). Put the open decisions to me before building."* This came from the question *"Are
you able to use drag handles or click and drag for hiatus periods?"* The answer was no. A hiatus's
dates are typed in the sidebar, and the waterfall's band drag changes layout only.

Read with: [`MONTH-VIEW-PLAN.md`](MONTH-VIEW-PLAN.md) §6.4 (why a hiatus is whole weeks) and §6.7
(the phase handles this copies), and `installPhaseEdgeHandles` / `installMonthPillDrag` in
`src/legacy/app.js`.

---

## 1. What is true today, measured from the code

- **Two kinds of hiatus, both whole weeks.** An all-phase hiatus is a `.hiatus-entry` row in
  `#hiatus-list`, with `.hiatus-name`, `.hiatus-start`, `.hiatus-weeks` and `.hiatus-locked`. These
  inputs have classes, not ids, and the snapshot carries them as `fields.hiatuses`. A phase's own
  hiatus is `phiatus-en-<key>`, `phiatus-name-<key>`, `phiatus-start-<key>` and
  `phiatus-weeks-<key>`, which are id'd and live in `fields.byId`. `computeSchedule` turns each one
  into `{start: mondayOf(start), end: start + weeks*7}`. A hiatus therefore runs Monday to Sunday
  for whole weeks, and nothing finer exists.
- **The month view draws each hiatus week as one band per row.** Rows run Sunday to Saturday, and a
  band covers that row's Monday to Friday (frozen edit, 18 Sep 2026). So a band IS exactly one week
  of one hiatus, unless two hiatuses overlap. The all-phase band comes from `isHiatusDate()`, the
  union of all rows. A phase's own band sits in that phase's lane, on the weekdays the phase is
  running and outside any all-phase hiatus.
- ⛔ **A band carries no identity.** `renderMonthView` calls `place(..., 'mv-bar mv-hiatus-bar',
  ...)` with an empty data slot, so nothing says which row or phase a band belongs to. Pills got
  `data-ph` by a frozen edit, and bands never did.
- ⛔ **A band is click-through.** `.mv-bars{pointer-events:none}`, and only `.mv-pill` (frozen CSS,
  18 Sep 2026) and `.mv-note-click` opt back in. So `e.target` over a band is the `.mv-daycell`
  underneath, and `elementsFromPoint()` does not list the band at all. Hover has to be detected by
  geometry. A click on a band today reaches the day cell, and the day menu opens for a shoot day.
  The day menu also opens from the day-number strip at the top of each cell, which is where it opens
  for every day a pill covers.
- **The month view shows one month at a time** (`monthCursor`, `#mv-prev` / `#mv-next`). A drag can
  only reach the rows on screen, about five or six weeks including the spill-over rows. The phase
  handles have the same limit.
- **Every all-phase hiatus starts LOCKED.** `addHiatusRow()` defaults `prefillLocked` to true, and
  all three creating callers rely on it: the built-in winter breaks, *+ Add hiatus*, and restore for
  old files without the key. The lock's tooltip and its only reader (the shift tools) mean *"Keep
  this hiatus on these dates when the calendar is shifted"*. Nothing else reads it.
- **Typing a new hiatus date runs plain `update()`.** It does not run inside `asShootDayMove()`, so
  Production's day marks stay on their dates. It does not re-key `hiatusTexts` / `hiatusColors` /
  `hiatusFontSize`, so a band's hand-made look stays on its old weeks.
  `syncHiatusNamesFromSidebar()` does move the sidebar **Name** with the hiatus: it claims the new
  weeks and releases the old ones.
- **The shift tools DO carry a band's look** (`shiftCalendar`, `hiatusKeyStays`): *"A band's label,
  colour and text size have to make the SAME stay-or-go decision the band made … or they walk off
  it."* So the project has already ruled that a moving band's look moves with it, on that path.

## 2. The gesture

Everything here copies `installPhaseEdgeHandles`, except where a hiatus differs.

- **Hover.** In the month view, a band under the pointer (by rect, because bands are click-through)
  gets three things, all body-level chrome:
  - **a move layer** over the band's visible rect, transparent, `cursor:grab`. Grab anywhere on the
    band to move it, as a pill moves.
  - **a start grip** at the band's left end, only on the hiatus's FIRST week.
  - **an end grip** at the band's right end, only on its LAST week.
  - **On a LOCKED all-phase hiatus (ruling 1), only the layer, with `cursor:not-allowed`, a
    tooltip saying to untick Lock in place, and no grips.**

  The grips reuse `.phase-edge-handle` (10 px, the band's text colour), and their cursor is
  `ns-resize`, because a week is a row. Nothing is drawn inside `#table-wrap`, so neither month PDF
  can carry any of it (print hides every direct child of `<body>` but `#print-root`).
- **One step is one week, chosen by ROW.** The pointer's day (`dayAtPoint`) is read as its row's
  week: the Monday of that Sunday-to-Saturday row. A Sunday is therefore read as the row it sits in,
  not as the week before, which is what `mondayOf()` alone would give. Dragging sideways within a
  row changes nothing. Dropping on any day of a row means "that week".
  - **Move:** `start += k weeks`, and the length is unchanged.
  - **Start grip:** the start moves to the pointer's week and the last week is held, so the weeks
    change.
  - **End grip:** the last week moves to the pointer's week and the start is held.
  - **Floor:** one week. Neither edge can cross the other.
- **Undo, as the phase handles do it:**
  - a leading `pushUndoSnapshot()` on press;
  - `cancelPendingUndoPush()` after every step's `update()`;
  - one trailing push on release, only if something changed;
  - **Escape** puts back exactly what was there and banks nothing, and so does a drag that ends
    where it began;
  - a release outside the window is caught by the `buttons` test, as body-drag's is.
- **During the drag**, a full-screen shield owns the pointer (`.phase-edge-shield`, with an
  `ns-resize` or `grabbing` cursor), and the band follows its own week through every re-render.

## 3. Which band is which (no frozen edit)

A band's row gives its week: the row's Monday, from `cellDate()` on the row's cells, cross-checked
against the printed day numbers as `pillRange()` already does.

- **All-phase or per-phase** is decided by that week. An all-phase band's days are
  `isHiatusDate()` days. A phase's own band is drawn only where `!isHiatusDate()`.
- **All-phase:** the band belongs to the `.hiatus-entry` row whose Monday-snapped range contains
  that week. Exactly one row must match. If two rows overlap there, the band is ambiguous and gets
  **no grips and no move layer** (§5).
- **Per-phase:** the candidates are the phases whose own hiatus covers that week AND whose span
  covers the band's days. With one candidate, the band is that phase's. With more than one, the
  band's label must equal exactly one candidate's (`hiatusTexts[week|key]`, or the default
  "<name> Hiatus"). Otherwise the band gets no grips. ⚠️ *Corrected while building:* this said the
  band's `grid-row` would match the candidate's pills, because "lanes hold all month". They do not.
  `takeLane()` packs every week top-down from lane 0, so a lane is per WEEK, and a grid row
  identifies nothing.
- ⛔ **Refuse rather than guess.** If the wrong hiatus were picked, the guard in §5 would not catch
  it, because it would faithfully move the wrong one. Every ambiguity therefore ends in no
  affordance, never in a best guess.

## 4. What a drag writes

- **All-phase:** `.hiatus-start` (written as the new Monday) and `.hiatus-weeks` in that row.
- **Per-phase:** `phiatus-start-<key>` and `phiatus-weeks-<key>`.
- Values are set with `.value` and then `update()` runs, as the phase handles do. The rows' only
  input listener is `update()` itself, so the sidebar, the snap note and `fields.byId` all follow.
  **No new state, no new snapshot key, no new id'd control.**
- **The band's look comes with it (ruling 4):** `hiatusTexts`, `hiatusNameSyncedKeys`,
  `hiatusColors` and `hiatusFontSize`, for the dragged hiatus's own week keys only (a bare ISO
  date, or `ISO|<key>`).
  - A move re-keys them by `k` weeks. This is `shiftKeyedMap`'s shape, but every step starts from
    the copy taken at the press, so moving out and back is exact.
  - A lengthening copies the end week's look onto each added week.
  - A shortening leaves the removed weeks' keys where they are. They are inert on a week with no
    band, as the shift tools leave them.
  - `cellSpans` is NOT touched: a `week|key` span belongs to that phase's cell whatever the week
    holds.
- **Production's day marks stay on their dates** (ruling 2). There is no `asShootDayMove()`.

## 5. Limits and guards

- **No overlap.** A dragged all-phase hiatus stops at the week before another all-phase hiatus. It
  may sit next to one, because the two still draw as separate rows' bands. Overlap is what makes a
  band ambiguous, and it is almost always a mistake.
- **A phase's own hiatus stays inside its phase.** It cannot be dragged to a week where it would
  stop pausing the phase. Its band would vanish, leaving a sidebar entry that does nothing and no
  way to grab it back.
- **The scheduler is asked, not trusted.** After each step, the new range is read back the way
  `computeSchedule` reads it (`readState()` → Monday-snapped range) and must equal what the step
  computed. If it does not, the step is put back and the gesture goes inert, as in
  `installPhaseEdgeHandles`'s `apply()` guard.
- **One month at a time.** A drag reaches only the rows on screen, so a longer move takes several
  drags with ◀ ▶ in between. The phase handles share this. A drag that flips the month when it nears
  the month bar is a possible follow-up, and it is not in this plan.
- **Existing overlaps.** A calendar already saved with overlapping hiatuses gets no affordance on
  the shared weeks, while its other weeks work. The sidebar still edits it.

## 6. Freeze check

**Zero frozen edits.** No `.mv-*` rule, no change to `renderMonthView`, nothing in `#table-wrap` or
`#print-root`. All of it is a new IIFE beside `installPhaseEdgeHandles`, so the drag effects come
from outside the frozen code (sanctioned pattern 2). It reads `cellDate`, `pillRange`-style
geometry, `visibleRect` and `dayAtPoint` (all module scope already), and it re-hides on a
`MutationObserver` over `#table-wrap` (pattern 3). The only new CSS is body-level, beside
`.phase-edge-handle`.

⚠️ **Not a mover.** Shift All, Shift From, Anchor To, Rebuild From and the pill drag move PHASES. A
hiatus drag moves no phase's start, so it does not go through `setPhaseStart()`. Ruling 2 keeps it out
of `asShootDayMove()` as well.

## 7. Build steps

0. Re-verify §1's claims in the pane before writing code: that a band is click-through
   (`elementsFromPoint` at a band's centre), and that a phase's own hiatus, Production's included,
   draws a band. ⚠️ `daySituation()`'s comment says Production's own hiatus is NOT painted, but
   `renderMonthView` loops the per-phase band over every lane, Production included. One of them is
   stale. Find out which.
1. `installHiatusDrag()`: hover detection, band identification (§3), and placing the move layer and
   grips. The grips do nothing yet.
2. The move gesture, the undo bracket, Escape and out-and-back.
3. The edge grips, the floor and the no-overlap and stay-in-phase limits.
4. Look re-keying and copying (§4). Then the lock (ruling 1) and the Keep/Undo prompt with
   persistence held (ruling 3).
5. The README changelog, HANDOFF, MONTH-VIEW-PLAN §6.7's cross-reference, and UI-CONVENTIONS §10
   for the new gate leg. ⚠️ *As built:* there was no Help copy to update. The Help overlay has no
   month-view drag section at all, so the pill drag and the phase grips aren't described there
   either. Writing one is a separate piece of copy, not done here.

## 8. Owner rulings (19 Oct 2026, by picker)

1. ⭐ **A LOCKED hiatus can't be dragged.** This was against the recommendation, which pointed out
   that every all-phase hiatus starts locked. Hovering a locked band shows a layer with
   `cursor:not-allowed` and no grips. Its tooltip names the hiatus and says to untick **Lock in
   place** in the sidebar to drag it. A press does nothing. A phase's own hiatus has no lock, so it
   is always draggable.
   - ⚠️ Consequence: on a new calendar, no all-phase hiatus is draggable until the user unlocks
     it, because all four built-in winter breaks and *+ Add hiatus* start locked. The tooltip is the
     only cue. Watch for this in the pane.
2. **Production's day marks stay on their dates.** No `asShootDayMove()`, the same as typing the
   date and as the phase edge grips.
3. ⭐ **The owner's own answer: *"ask for unlocked all phase hiatuses, dont ask for per phase
   hiatuses"*.** Read as: **every all-phase drag that changed something asks on release, whether or
   not notes exist.** The owner did not mention the note condition from the offered option, and
   ruling 1 already makes every draggable all-phase hiatus an unlocked one. A phase's own hiatus
   never asks. ✅ **Confirmed by the owner, 19 Oct 2026 (next-step box): "Keep it as built: every
   all-phase hiatus drag that changed something asks Keep or Undo."**
   - **The prompt** is a `uiConfirm` titled *Move hiatus*. It names the hiatus and its new dates,
     and gives Production's wrap before → after when that changed. **Keep** banks the drag as ONE
     undo step. **Undo** (also Escape, or closing the dialog) puts back exactly what was there,
     looks included, and banks nothing.
   - ⛔ **While it asks, nothing may persist the unconfirmed move.** This is the Region-change
     lesson (`confirmRegionChange()` holds the old Region while asking). Here the move is already
     on screen, and it should stay there while the owner decides. So instead of putting the old
     values back, the build must hold the crash backup and autosave until the answer, or prove that
     neither can fire with the move. This is resolved in step 2 and gets a test case.
4. **The band's look comes with it**, as in §4: a move re-keys, a lengthening copies the end week's
   look, and a shortening leaves inert keys.

## 9. Proof

- **New Node leg `tests/harness/hiatusdrag.mjs`**, phaseedge's sibling. It uses trusted CDP input,
  and every press is made where `elementsFromPoint` has the move layer or grip topmost. Its fixture
  is a new synthetic `tests/fixtures/hiatusdrag.sptcal`, with no real show data:
  - an unlocked and a locked all-phase hiatus inside Production, one of them recoloured and renamed
    on the band;
  - a phase with its own hiatus;
  - two all-phase hiatuses one week apart;
  - a pair that already overlap;
  - a half day after the mid-shoot hiatus.

  Cases, roughly:
  - grips only on the first and last weeks; the move layer on every unambiguous week; none on the
    overlap;
  - a move of two rows (start and Production's wrap both move two weeks; one Ctrl+Z restores both);
  - a sideways drag within a row writes nothing;
  - a Sunday-column drop means that row's week;
  - the start grip up, and the end grip down;
  - the one-week floor;
  - the move stopping at the neighbour;
  - a phase's own hiatus clamped to its phase;
  - Escape, and out-and-back, banking nothing (proved by the next Ctrl+Z landing where it should);
  - the look travelling;
  - the half day staying on its date;
  - a locked band offering nothing;
  - an all-phase drag asking, Keep giving one undo step and Undo restoring and banking nothing,
    while a phase's own hiatus never asks;
  - nothing written to the crash backup while the prompt is up.

  Each case is proved red on a mutant first, as phaseedge's were.
- **The full gate**, with frozen outputs unchanged: gates 1–5 (`fields.byId` id set), gate 10's
  print documents, and gate 13's written month PDFs byte-identical, because no frozen line changes.
  Also `pilldrag`, `phaseedge` and `npm run check`.
- **The pane**: a real drag of each kind, with screenshots.

## 10. As built (19 Oct 2026)

**Code.** All of it is in `src/legacy/app.js` and `src/styles/legacy.css`, with zero frozen edits.
- `installHiatusDrag()`, a new IIFE right after `installPhaseEdgeHandles`. It makes one
  `.hiatus-drag-layer` and two `.hiatus-grip`s on `<body>`, and a `.hiatus-drag-shield` per drag.
  - The shield deliberately does NOT carry `.phase-edge-shield`. `pilldrag` and `phaseedge` read that
    class.
  - The grips are not `.phase-edge-handle`, for the same reason: `phaseedge` E7 finds handles by
    `data-edge`. Their CSS is a copy, beside `.phase-edge-shield`.
- **The persistence hold** (ruling 3) sits beside `writeBackup()`: `holdPersistence()` and
  `releasePersistence()`, with `persistHold`, `backupHeld` and `backupPending`. While it is held:
  - `writeBackup()` writes nothing and notes that a backup fell due; the release schedules it;
  - the autosave tick skips;
  - the global shortcut handler swallows Cmd/Ctrl+S and Cmd/Ctrl+Z. Plain Cmd+S is NOT stopped by
    `appDialogOpen()`, and Cmd+Z ran under any open dialog, so both had to be checked by hand.

  The press first FLUSHES a pending backup, so a window closed while the question is up recovers the
  state from just before the drag. The hold is taken for every hiatus drag, including a phase's own,
  which never asks; for those it ends with the drag.
- **`buildSavedHtml()`'s strip list** gains the three new classes. The shareable copy's own engine
  makes fresh ones when it boots.
- **Step 0's answer:** a phase's own hiatus IS painted in the month view, Production's included. Seen
  in the pane as "Production Hiatus" in Production's lane. So `daySituation()`'s comment ("Production's
  own does not [get a band]") is the stale one. It was left alone here: it is another session's area,
  and the code under it is right.

**The question's wording** (ruling 3), titled *Move hiatus*, with the buttons **Undo** (the
autofocused, safe answer) and **Keep**: *"“Spring Break” now runs Mon 3/15/27 – Fri 3/19/27 (1
week). It was Mon 3/22/27 – Fri 3/26/27 (1 week)."* It adds *"Production now wraps …"* when the wrap
moved, and *"It also changes when Rigging ends."* for every other phase whose end moved.

**Proof.**
- `tests/harness/hiatusdrag.mjs`, H0–H12, 13/13 on `tests/fixtures/hiatusdrag.sptcal` (synthetic), and
  wired into `gate.sh` after `phaseedge`. It went red on three mutants first, each restored and checked
  with `cmp`:
  - **A** (no lock refusal, `mondayOf` instead of the row rule, no Cmd+Z hold, no overlap check, asking
    for a phase's own hiatus, no stay-in-phase check) → H0, H1, H4, H5, H9 and H10 red;
  - **B** (no re-keying of the look) → H1, H6 and H7 red;
  - **C** (Undo not restoring, no floor, Escape not restoring) → H2, H8 and H11 red.

  H3 (a sideways drag) and H12 (print media) are guards that pass on every build.
- **The backup half of the hold, in the app pane** (IndexedDB never settles headless). A real drag
  with the question left open showed the move on screen, while the page's backup slot still held the
  pre-drag 3/22 after 21 s, which is seven backup intervals. One second after Keep, it held 3/15.
- **The full gate on build `3d54c122…` (`dist/index.html`): **1,758 PASS, 2 FAIL** (18 min, 19 Oct 2026, overlapping another session's gate). The 2 FAILs were `loadfail` R and AS, which run on a fast-forwarded clock and touch no hiatus-drag path (`persistHold` is 0 unless a drag is live). Re-run alone on the same build, `loadfail` passed **6/6**, R and AS included. Every frozen output is identical: the waterfall PDF, the Excel parts, the grid signature, `fields.byId` (72 ids), gate 10's print document, and gate 13's twenty written month PDFs (byte-identical). `hiatusdrag` passed 13/13 inside the gate.**
- **Real drags in the pane:** the locked layer (not-allowed cursor, tooltip, no grips); a move with
  Keep, then Undo, then Redo; Cmd+Z under the open question doing nothing; and the grips drawn as
  white bars at the band's ends.
