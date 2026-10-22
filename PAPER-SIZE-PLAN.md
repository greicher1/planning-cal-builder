# PAPER-SIZE-PLAN.md — the paper the waterfall is laid out for, and the Export PDF dialog

Owner, 21 Oct 2026: asked what happens when the waterfall is printed on Legal paper, and whether that needs
a paper-type setting or a direct system print dialog; then *"Yes, write up a plan for a paper-size setting,
with the rulings I need to make."* On the feature tracker as `paper-size`. Status: **📝 PLANNED, not built.
✅ All four rulings in §6 were made by the owner by picker on 21 Oct 2026: R1 Legal and Tabloid (no A4), and R2,
R3 and R4 each (a), the recommended option.** Building waits on the owner's go-ahead.

**Second ask, the same evening:** *"I think the setting can live in the regular setting tab but I think we also
now need a popup dialogue when you click export pdf that asks you to both confirm (or change) your paper type and
your grid lines. It should also have a selector for portrait or landscape but one is listed as (recommended)
based on the logic we already have to maximize the size of the calendar on the page"*. That is §5a. ✅ **Its
rulings D1–D3 in §6 were made by picker the same evening, each (a), the recommended option.**

This plan makes **frozen edits** (CLAUDE.md's symbol list), and the change is **inert by default**. A calendar left on
Letter saves, renders and exports byte for byte as it does today, so every existing baseline (waterfall PDF,
every Excel part, the clipped-cell count, `fields.byId`, both month PDFs) must stay green without a re-cut.

---

## 1. What is hard-coded today

Every output is laid out for US Letter, in these places:

| Output | Where Letter is fixed | Frozen? | This plan |
|---|---|---|---|
| Waterfall PDF (`buildWaterfallPdf`) | `SHEET_PAPER_PT` (612 × 792 pt), read for the page box and the fit | yes | follows the setting (P1) |
| The page-turn rule (`sheetPageOrientation`) | `SHEET_PAPER_PT` | yes | follows (the same P1) |
| Single Column's fill (`sheetColumnWidths`) | `SHEET_PAPER_PT.portrait` | yes | ruling R3 |
| Excel (`exportExcel`) | `pageSetup.paperSize: 1` | yes | follows (P2) |
| Waterfall print fallback (`exportWaterfallPdf`, `setWfPageStyle`) | its own 8.5 × 11 in page, `@page{ size: letter … }` | yes | unchanged: a rollback, unreachable while `WF_PDF_MODE = 'direct'` |
| Month PDF writer (`MVL_GEOMETRY`, `fitMonthLayout`, `buildMonthPdf`) | one 11 × 8.5 in page per month | no (not ruled frozen) | ruling R4 |
| Month print path (`exportMonthPdf`, `legacy.css` `@page`) | `PAGE_H`, `PRINT_W`, `@page{ size:letter landscape }` | yes | unchanged: the rollback |
| Help (`src/index.html`, *Exporting*) | "The workbook is set to print on US Letter" | no | reworded (step 2) |

**What a Letter file does on Legal today.** The PDF prints whole, at the same size, with about 3″ of blank
paper: at the top and bottom in portrait, at the sides in landscape. The audit measured the same for the month
PDF: *"whole, with blank space"* (AUDIT-REPORT §8). A printer that picks its tray by the page size feeds Letter.
The workbook re-fits to Legal if the paper is changed in Excel's Page Setup, because it is set to fit on one
page, but it keeps the orientation the app chose for Letter.

⚠️ **Found while mapping:** the same Help paragraph still says the month export *"opens your browser's print
dialog"*. Since 2 Oct 2026 it opens a Save dialog (`MV_PDF_MODE = 'direct'`). That sentence can be fixed in
step 2 along with the Letter one.

## 2. Why a setting, and not the system print dialog

- **The layout is decided from the paper before any dialog can open.** That covers orientation, the
  whole-percent fit and Single Column's widths. A web page is never told which paper the user picked in the
  print dialog. So choosing Legal there only puts the Letter layout on larger paper, which printing today's PDF
  already does.
- **The dialog route is the print path the PDF writer replaced.** That path is why the PDF did not match the
  Excel print. It is also why A4 in a UK-locale Chrome clipped the bottom row (audit L-3), which was fixed by
  pinning Letter and hiding the dialog's Paper size.
- **The system dialog is already one step away.** Open the PDF and press ⌘P.

## 3. What each size gains

The printable area is in points, with the writer's margins: 18 at the sides, 54 at the top (18 with Header: Off)
and 18 at the bottom. **Nothing ever prints larger than 100%**, so a calendar that already fits Letter at 100%
gains only white space.

| Paper | Portrait printable | Landscape printable | The most a calendar can grow, against Letter |
|---|---|---|---|
| Letter 8.5 × 11 in | 576 × 720 | 756 × 540 | — |
| Legal 8.5 × 14 in | 576 × 936 | 972 × 540 | **+30%** for a tall portrait calendar, **+29%** for a wide landscape one, nothing on the other axis |
| Tabloid 11 × 17 in | 756 × 1152 | 1188 × 756 | +31% to +60% in portrait, +40% to +57% in landscape |
| A4 210 × 297 mm | 559 × 770 | 806 × 523 | −3% to +7%; a width-bound portrait calendar prints **3% smaller** |

Here is a made-up example, a one-year grid of 500 × 1000 pt that prints in portrait. It prints at **72%** on Letter,
**93%** on Legal and **100%** on Tabloid.

## 4. The design

- **The control:** one select, **Paper**, in Settings ▸ Preferences ▸ Waterfall, next to *Grid Lines in
  Exports*. That is the Settings window's main tab, which is what the owner's *"the regular setting tab"* is read
  as. The Export PDF dialog (§5a) shows the same value and can change it. The options are *Letter (8.5 × 11) · Legal (8.5 × 14) · Tabloid (11 × 17)*
  (R1), and the default is Letter. Its info hint gets one line: *"The paper the PDF and the Excel file are laid out for. Bigger paper
  prints a long or wide calendar larger."* It is a `NativeSelect` with the id `wf-paper` inside `.prefs-card`,
  set up the way `wf-date-format` is, so `fields.byId`'s id set does not move (gate 5).
- **Where the choice is kept depends on R2:**
  - **(a) In the calendar.** It is saved as a snapshot key, `paperSize`, with the values `'legal'` and
    `'tabloid'` (and `'a4'` if R1 includes it). Letter is an ABSENT key, written only when the paper is not
    Letter. The key is restored unconditionally, `sanitizeSnapshot` drops any other value, New clears it, a
    change is one undo step, and a change marks the file dirty. **No `SNAPSHOT_VERSION` bump:** an older build
    ignores the key and prints Letter, which is what it always printed. ⛔ The key and its values are permanent
    from the first file saved with them.
  - **(b) On this computer.** It is `prefs.paper` in `sptcal.prefs`. Absent means Letter, it never enters
    `captureSnapshot()`, and the tab's opening line lists it among the settings that stay on this computer.
- **One table:** `SHEET_PAPERS = { letter: 612 × 792, legal: 612 × 1008, tabloid: 792 × 1224, a4: 595.28 ×
  841.89 }`, beside the Excel paper codes `{ letter: 1, legal: 5, tabloid: 3, a4: 9 }`. These are ECMA-376's
  numbers. Tabloid is 3, not Ledger's 4, because orientation is set separately.
- **Frozen edit P1, a declaration change only** (sanctioned pattern 1, the same move Header: Off made on
  `SHEET_PAGE_MARGIN_PT`). `SHEET_PAPER_PT.portrait` and `.landscape` become getters that read the chosen paper.
  On Letter they return exactly `{612, 792}` and `{792, 612}`. That one declaration reaches the PDF's page box
  and fit, the page-turn rule and Single Column's fill, so the PDF and the workbook still cannot turn
  differently.
- **Frozen edit P2:** in `exportExcel`, `paperSize: 1` becomes `paperSize: sheetPaperCode()`, which returns 1
  on Letter. This is one expression.
- **Frozen edit P3, only if R3 is (b):** Single Column's fill reads `SHEET_PAPERS.letter` instead of
  `SHEET_PAPER_PT`.
- **The page turns by the existing rule, applied to the chosen paper.** That rule is landscape from three year
  blocks, unless the other way prints at least 15% larger. So a calendar can come out the other way round on
  Legal than on Letter. The PDF and the workbook always agree.
- **What a change re-runs:** changing the paper re-runs `update()`, because Single Column's widths can change on
  screen (R3). Nothing else on screen changes.
- **What stays Letter:** the two print rollbacks. If `WF_PDF_MODE` is ever flipped back to `'print'`, it prints
  Letter whatever is chosen, and HANDOFF will say so.

## 5. Why Single Column needs a ruling (R3)

Single Column Mode widens its columns **on screen** until the single column fills the page's width at the scale
the page's height allows (owner, 10 Sep 2026). The page's shape is one of its inputs. Legal's height allows a
larger scale, so the column needs less widening to fill the width:

- **(a) Follows the paper.** On Legal the columns on screen come out about 24% narrower than on Letter, but still
  wider than with Single Column off. The PDF then prints the column about 30% larger and fills the Legal page.
- **(b) Keeps Letter's widths.** The screen never changes. But on Legal the grid becomes width-bound at Letter's
  scale, so it prints at the **same size as on Letter**, with a blank band at the bottom. A single-column
  calendar gains nothing.

## 5a. The Export PDF dialog (the owner's second ask)

**When it opens:** on every click of Export PDF in the waterfall view (`#export-wf-pdf-btn`), and on ⌘P there,
which clicks the same button. The click handler is engine code outside the freeze. The dialog goes **before**
the existing character check (`confirmPdfPrintable`, audit L-6) and before frozen `exportWaterfallPdfDirect()`,
and neither of those changes. The PDF still downloads straight away afterwards, as it does today.
**The month view's Export PDF gets no dialog:** its paper is Letter (R4), its page is always landscape, and grid
lines never reach it.

```
 Export PDF
 Paper         [ Letter | Legal | Tabloid ]
 Orientation   (•) Portrait    Recommended · prints at about 93%
               ( ) Landscape   prints at about 52%
 Grid lines    [ None ▾ ]
                                         [ Cancel ]  [ Export ]
```

- **What it opens on:**
  - the calendar's paper;
  - its saved orientation if it has one (D1), otherwise the recommended one;
  - the grid-lines preference.
- **What earns "Recommended":** frozen `sheetPageOrientation()`'s answer for the paper selected **in the
  dialog** (D2). Changing the paper asks again, so the tag and the sizes move as you click.
- **Where the sizes come from:** that same call's portrait and landscape fit numbers, capped at 100%. They read
  "about" because the rule measures every row flat at 20 px while the PDF measures each row, so the two can
  differ by a few percent. This is sanctioned pattern 2: the dialog asks the frozen rule, so there is no second
  copy of it to drift.
- **How a paper you haven't chosen yet is asked about:** through a *probe* that P1's getters read. It is set and
  cleared inside one synchronous call, because `sheetColumnWidths`, `sheetGridMetrics` and
  `sheetPageOrientation` are all synchronous, so no render can ever see it. ⚠️ **Not by running the writer**,
  even though `buildWaterfallPdf` returns its exact scale: it awaits, and a probe held across an await could
  leak into an on-screen render, because Single Column's widths read the paper.
- **Export applies all three choices, and Cancel applies none:**
  - **Paper** becomes the calendar's `paperSize` (R2), the same value the Settings select shows. It marks the
    file changed, and it is one undo step together with the orientation.
  - **Orientation** is handled as D1 rules.
  - **Grid lines** becomes `prefs.gridlines`, the per-computer preference Settings already shows. As today it is
    not undoable and not saved in the file.
- **Then the export goes on as now:** the character check if one is needed, then the download.
- **Keys:** Enter exports and Esc cancels, as in the app's other dialogs.
- **Frozen edit P4, the orientation choice.** Two expressions each go through one helper,
  `chosenOrientation(auto)`, which returns `auto` when nothing is chosen, so both are byte-identical when unused:
  - `buildWaterfallPdf`'s `const orientation = pick.orientation`;
  - `exportExcel`'s `ws.pageSetup.orientation = sheetPageOrientation(…).orientation`.

  Both writers read the same helper, so they still cannot turn differently.
- **Single Column with landscape chosen:** Single Column's fill keeps sizing for portrait, as it does today, so
  the column prints smaller with white at the sides, and the dialog's size line shows that before you pick it.
  The orientation choice never changes the screen; only the paper does (R3).
- ⚠️ **Hazards:**
  - **The save sweep.** The dialog is a body-level Mantine modal. Mantine mints an id for a control given none
    (UI-CONVENTIONS §8.3), and `collectFieldValues()` sweeps every `input[id]` in the document. So the dialog's
    root takes a class the sweep skips, and the leg checks `fields.byId` with the dialog open.
  - **The gate's own legs click this button.** About twenty use the shared `T.captureExport('export-wf-pdf-btn')`
    in `tests/harness/t/lib.js`, and a handful click it directly (`winansi`, `hdrrow`, `sideboxes`,
    `exportrefused`, `filekeys`, and `cspproof.mjs`). Each would stall on the dialog. `captureExport` learns to
    press the dialog's Export at its defaults, and the direct clicks are updated one by one. That keeps the real
    path exercised, and it makes the whole gate the proof that *"Export at the defaults = today's PDF, byte for
    byte"*. A localhost switch that skips the dialog would hide exactly that.

## 6. Rulings for the owner

✅ **Ruled 21 Oct 2026, by picker:** R1 *"Legal"* and *"Tabloid"* (no A4); R2 (a) *"With the calendar"*; R3 (a)
*"Follow the paper"*; R4 (a) *"Letter for now"*. So the menu reads *Letter · Legal · Tabloid*, the saved key is
`paperSize` (`'legal'` | `'tabloid'`, absent = Letter), §4's option (b) and P3 are not built, and the month PDF
stays Letter. The options as they were put:

1. **R1. Which sizes does the menu offer?** (a) *Recommended:* Letter, Legal and Tabloid (11 × 17, the usual
   size for a wall print). (b) Letter and Legal only. (c) Add A4 as well. That is only worth it if anyone prints
   outside North America: the app has UK, German, Australian and Lithuanian regions, but A4 changes little (§3).
2. **R2. Where is the choice kept?** (a) *Recommended:* **saved with the calendar.** This reverses my first
   answer, which leaned towards keeping it on each computer because paper depends on the printer. Tracing the
   code changed the recommendation, for three reasons:
   - The paper sets Single Column's **on-screen** widths, so a per-computer setting would make the same file
     look different on two screens.
   - The paper decides which way the page turns, as Header: Off and Single Column (both saved) do.
   - Excel keeps its page setup in the workbook, and different calendars want different paper: a three-year
     calendar on Tabloid, a short one on Letter.

   (b) On this computer: the choice follows the printer, and two people exporting one file can get different
   PDFs.
3. **R3. Single Column on bigger paper?** (a) *Recommended:* it follows the paper, so it prints larger (§5). (b)
   It keeps Letter's widths, so the screen never moves and a single-column calendar gains nothing on Legal.
4. **R4. The month PDF?** (a) *Recommended:* it stays Letter for now and gets its own plan later. The month
   writer lays out one page per month at the screen's pixel sizes, from measurements hand-copied out of frozen
   print CSS. Gate 13 holds twenty byte baselines for it. On Legal landscape every day would be about 29% wider,
   so every note would re-wrap. The result is wider days rather than larger type, and that deserves its own
   picture for you to judge. (b) Include it in this change.

### The dialog's rulings

✅ **Ruled 21 Oct 2026, by picker:**
- D1 (a) *"With the calendar"*: `pageOrientation`, saved only when it differs from the recommended one.
- D2 (a) *"Today's rule"*.
- D3 (a) *"PDF only"*.

The options as they were put:

5. **D1. Is the orientation you pick remembered?**
   - (a) *Recommended:* **with the calendar, but only when it differs from the recommended one.** It is saved as
     `pageOrientation: 'portrait' | 'landscape'`, and an absent key means *follow the rule*. Exporting with the
     recommended one selected clears it, so a calendar that is never overridden keeps following the rule as it
     grows. The Excel export follows the same choice, so the PDF and the workbook never come out different ways
     round.
   - (b) For this export only. The dialog always opens on the recommended one, and Excel stays automatic, so the
     PDF and the workbook can come out different ways round.
6. **D2. What earns "Recommended"?**
   - (a) *Recommended:* **the rule the exports use today:** landscape from three year blocks, unless the other way
     prints at least 15% larger. A calendar exported without changing anything comes out exactly as it does now.
     Inside that 15% band the recommended one can print slightly *smaller*, and the sizes in the dialog show it.
   - (b) **Whichever prints larger, always.** This changes the default for calendars inside that band, in Excel
     too, and the Help's *"two years or fewer print portrait"* sentence goes.
7. **D3. Does Export to Excel get the dialog too?**
   - (a) *Recommended:* no, the PDF only, as asked. Excel reads the same three choices silently: the calendar's
     paper, its orientation (D1), and the grid-lines preference.
   - (b) Yes, the same dialog opens before the workbook downloads.

## 7. Measurements (the acceptance gate)

- **Inert:** the full `gate.sh` is green with **no re-cut**. That means 0 clipped cells, the waterfall PDF and
  every Excel part identical, v1.0.0 restoring, `fields.byId`'s id set unchanged, and gate 10's print documents
  and gate 13's written month PDFs identical.
- **A new leg, `papersize`,** registered in `gate.sh`. It must be red on the pre-change build and green after:
  - **On Legal and Tabloid:**
    - the PDF's `/MediaBox` is `[0 0 612 1008]`, `[0 0 1008 612]` or `[0 0 792 1224]`;
    - the workbook's `xl/worksheets/sheet1.xml` carries `paperSize="5"` or `"3"`;
    - the PDF and the workbook turn the same way on four calendars: one, two and three year blocks, and one
      built to flip on Legal;
    - the PDF's scale is the expected whole percent;
    - 0 cells are clipped;
    - Header: Off and side boxes each work on Legal;
    - Single Column behaves as R3 rules.
  - **Save and restore:**
    - choosing Letter writes no key (R2a) or no preference (R2b);
    - Save and Load round-trip the choice;
    - a file with no key, or with an unknown value, loads as Letter;
    - a change is one undo step, and New clears it;
    - the select shows the loaded value.
  - **Mutants:** the Excel code left at 1, a getter that ignores the choice, the page turn still read from
    Letter, and the restore skipped. Each must turn the leg red.
- **A second new leg, `pdfdialog`:**
  - **Opening:** Export PDF and ⌘P open it in the waterfall view, and it never opens in the month view.
  - **Defaults:** it opens on the calendar's paper, its orientation (D1) and the grid-lines preference.
  - **The recommendation:** for each paper, on the four calendars above, its recommended orientation is the one
    the PDF comes out in, and its sizes are within 5 points of the PDF's own scale.
  - **Cancel** changes nothing: no dirty flag, no undo step, the preference untouched.
  - **Export with changes** writes the paper key, the orientation per D1 and the preference, as one undo step,
    and the PDF and the workbook both follow. Exporting with the recommended orientation selected clears the
    key. Enter and Esc work.
  - **The sweep:** `fields.byId` is unchanged while the dialog is open.
  - **Mutants:** the recommendation read from Letter whatever the paper, the probe left set after the call,
    Cancel applying the choices, and Excel ignoring the orientation. Each must turn the leg red.
- **The owner's own check:** open the Legal PDF in Preview and print it, or print-preview it, on Legal. Open the
  workbook in Excel on the owner's Mac and read its Page Setup back (JXA): it should show Legal and fit to one
  page.
- `npm run check`, `check-refs.py`, and the CSP proof (nothing new loads).

## 8. Build order

1. The table, the getters (P1) and the Excel code (P2), with only Letter reachable. Then a full gate: it must
   be inert.
2. The control, the state (per R2) and the Help text.
3. The `papersize` leg and its mutants. Then a full gate.
4. The Export PDF dialog: P4, the probe, the dialog component, and `captureExport` with the direct-click legs
   taught to confirm it. Then the `pdfdialog` leg and its mutants, then a full gate, which must still be inert
   at the dialog's defaults.
5. Docs: the README changelog, HANDOFF, CLAUDE.md (state-model rows for `paperSize`, and for `pageOrientation`
   under D1 (a)) and PROJECT-CONTEXT's width-model notes.
6. The owner's merge picker. A version cut and a push happen only on the owner's word. Nothing is pushed from
   the building session.
