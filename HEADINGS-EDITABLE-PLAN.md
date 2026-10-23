# HEADINGS-EDITABLE-PLAN.md: column headings editable all the time, no switch

**Status: PLANNED, 22 Oct 2026. Nothing built. Question Q1 (§4) and the frozen edits in §5 await the owner.** Build
it after `hide-notes` (HIDE-NOTES-PLAN.md) is merged, on its own branch (`headings-editable`). It edits the same
three frozen heading paths, and it retires that branch's headings-off Notes panel (§3).

Owner, 22 Oct 2026, while `hide-notes` was being built:

> *"i say we remove the custom column headings toggle in settings and just make it editable all the time"*

Ruled the same day by picker: **"Keep Date | year | Notes"**. An untouched calendar and its exports look exactly as
today. Double-click any heading to edit it. Calendars saved with the switch on keep the year over Date.

On the tracker as `headings-always-editable`.

---

## 1. How it works today (HEADER-ROW-PLAN.md §4, ruling 2)

- **`headerRowCustom`** (the Settings switch *Custom Column Headings*, saved as `headerRowCustom: true`) chooses
  between **two paths** in each of the three frozen heading writers: `renderSpreadsheetView`'s header loop,
  `exportExcel`'s row 1 and `buildWaterfallPdf`'s header row.
  - **Off:** the original three headings, `Date | <year> | Notes`, byte for byte as every calendar has always
    printed.
  - **On:** one heading per run of identical neighbouring labels (`headerRowRuns`), each editable by
    double-click (`openHeaderRowPop`). The defaults come from `headerRowDefault()`: **the year for the Date
    column and the phase columns**, `Notes` for Notes. So an untouched calendar with the switch on draws
    `[ 2026 over Date + phases ][ Notes ]`: the year moves over the Date column.
- Typed labels (`headerRowLabels`) and splits (`headerRowSplits`) are **kept while the switch is off**, so turning
  it back on brings them back.
- ⚠️ **The two paths do not write the same workbook even for the same text.** Excel's custom path adds
  `shrinkToFit` to each heading cell, and the screen's adds a class, a title and `data-hcol`. (The PDF's two paths
  probably draw the same bytes for `Date | year | Notes`; that is unmeasured, and Excel alone settles it.) So
  keeping untouched calendars byte-identical means keeping the original path for them (§2), not just changing a
  default.

## 2. The design

- **The switch leaves Settings.** The Waterfall card loses its *Custom Column Headings* row.
- **"Typed" replaces "switched on" as the path condition.** A helper outside the frozen code decides it:

  ```js
  function headerRowTyped(){
    return headerRowCustom || Object.keys(headerRowLabels).length > 0 || Object.keys(headerRowSplits).length > 0;
  }
  ```

  - An **untouched calendar** has none of the three, so it takes the original path: `Date | year | Notes` on
    screen, in Excel and in the PDF, byte for byte.
  - A calendar **saved with the switch on** has `headerRowCustom: true`, so it takes the custom path as it does
    today, with the year over Date (the ruling).
  - The **first edit** of any heading writes a label, and from then on the calendar takes the custom path.
- **The Date column's default becomes `Date`**, except on a calendar saved with the switch on:
  `headerRowDefault()` returns `headerRowCustom ? year : 'Date'` for a `:date` key. So the custom path's defaults
  draw `Date | 2026 over the phases | Notes`, the same three headings as the original path. Typing one heading
  changes only that heading. **Reset** (or typing a heading back to its default) deletes the label, and a calendar
  with no label left goes back to the original path and its original bytes.
- **Double-click ANY heading to edit it.** On the original path the headings carry no `data-hcol`, so the
  double-click handler finds the column with `headingColKey(th)`, as the text style bar and the Notes panel
  already do. `openHeaderRowPop` takes that key instead of reading `th.dataset.hcol`. No frozen markup changes.
- **Year over Date stays reachable:** in the editor, **Merge →** on the Date heading joins it with the year heading
  and takes its text. It is one heading over both, which is exactly the old switched-on look, now per block.
- **`headerRowCustom` stays a PERMANENT snapshot key**, now meaning "this calendar's Date column defaults to the
  year". It is still read, sanitized and restored. Nothing new writes `true`: New clears it, and it reaches a file
  only from a calendar that already had it.
- **The hover ring** that tells a heading is editable (`#table-wrap th.hdrrow-cell:hover`) extends to the
  original path's headings: one new chrome rule, scoped to `#table-wrap`, so neither print path sees it.

## 3. What it does to `hide-notes`

`openNotesColPop` (the Notes panel a double-click opens with Custom Column Headings off) becomes redundant: every
heading now opens the heading editor, and the editor already carries **Hide column** over a Notes column. The panel
is retired. Its "Has notes" badge and Hide button already live in the editor. The `notescols` leg's A group moves
to the editor, and its C group (which turns the switch on) folds into A.

## 4. Question for the owner

**Q1. Headings typed while the switch was on, then switched off.** A few calendars may hold typed headings
with the switch turned off. The switch only existed from 20 to 22 Oct 2026, and labels are kept while it is off.
Today they print `Date | year | Notes`. Under §2 their typed headings come back the next time they open.

- **(a) Recommended: bring them back.** They are headings someone typed, and Reset in the editor removes any one
  of them.
- **(b) Drop them on load.** A file with labels but no `headerRowCustom: true` loses them. This needs a marker
  key on new saves, so that a calendar whose headings were typed after this change keeps them.

## 5. The frozen edits (for sign-off)

| | Edit | Inert when |
|---|---|---|
| **H1** | `renderSpreadsheetView`'s header loop: `if(headerRowCustom)` becomes `if(headerRowTyped())` | An untouched calendar (both false) and one saved with the switch on (both true). It differs only for Q1's calendars, and for a calendar after its first heading edit (the point of the change) |
| **H2** | `exportExcel`'s row 1: the same one-word condition | The same |
| **H3** | `buildWaterfallPdf`'s header row: the same | The same |

Not frozen: `headerRowTyped()`, `headerRowDefault()`, the double-click handler, `openHeaderRowPop`'s key lookup,
the retired Notes panel, `pdfUnprintablePlaces()` (it scans typed headings on `headerRowTyped()`), the Settings
row, the hover rule and the Help text.

## 6. The gate

1. **Every baseline byte-identical:** the waterfall PDF, every Excel part, and the month PDFs (untouched). No
   baseline types a heading.
2. **`hdrrow`, rewritten without the switch:** an untouched calendar's heading row has the original markup; a
   double-click on Date, the year and Notes each opens the editor; one typed heading changes only that heading on
   screen, in Excel and in the PDF; Reset puts the original path's bytes back (the workbook's row 1 and the PDF
   compared with an untouched export); a file saved with `headerRowCustom: true` opens with the year over Date;
   Merge → on Date gives year over Date.
3. **`settingswin`:** the Waterfall card's control list loses `wf-hdr-custom`. Gate 5's id set does not move (the
   switch sat in `.prefs-card`, so it was never in `fields.byId`).
4. **`notescols`:** A and C folded as §3 says.
5. The full `gate.sh` before any push.

## 7. Build order (branch `headings-editable`, from `main` after `hide-notes` merges)

1. `headerRowTyped()`, `headerRowDefault()`'s Date default, H1–H3. Prove gate 1.
2. Double-click on any heading → the editor; retire the Notes panel; the hover rule.
3. Remove the Settings row; the Help text (the Waterfall card's ⓘ and the help panel).
4. Legs (`hdrrow`, `settingswin`, `notescols`), README, HANDOFF, CLAUDE.md's state table (`headerRowCustom`'s new
   meaning), then the full gate.
