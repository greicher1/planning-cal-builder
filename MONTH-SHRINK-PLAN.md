# MONTH-SHRINK-PLAN.md — a crowded month shrinks on screen exactly as its PDF does

**Status: STAGE 2 DONE (17 Nov 2026, owner: "finish"): tests re-premised, each red on a mutant, docs written; the full
gate ran 18 Nov (5,731 pass, 14 timeouts each green alone, gates 10 and 13 byte-identical; §5). Not pushed.** Stage 1 was built on branch `claude/month-shrink-build-c94fac` (worktree
`.claude/worktrees/month-shrink-build-c94fac`), cut from the planning branch `month-shrink` (`c6b7830`: `origin/main`
`aa16ffe`, v1.16.0, plus this plan). ⚠️ Stage 2 was done on `claude/dreamy-keller-2ed2c2`, the month row limit's branch,
which carries this build (`01dac2f`) with the limit on top and `origin/main` v1.17.0 merged in: the two ship together.
The shrink build's own branch stops at `01dac2f`. Tracker card `month-view-shrink-like-pdf`. HANDOFF's entry has what
was measured and what does not match.

**As built, where it left this plan** (both measured, both in HANDOFF):
- §4.4 "under a class on `#table-wrap`": the rules are gated on the factor's own presence in `#table-wrap`'s style,
  `#table-wrap#table-wrap[style*="--mvk"]`, not on a class. One piece of state, and `buildSavedHtml()` already strips it.
- §4.5 "`0 0 <row>px`": the weeks get the writer's own `fit.basis` and `fit.grow` (`<grow> 0 <basis>px`), so flexbox
  lands on `fit.rows` and the room left over absorbs a zoom's hairlines (fixed rows: 2.3 px over the page at 75%). The
  basis is never under what the week's bars need as drawn, so a note that takes a line more on screen (zoomed out) grows
  its week instead of being cut.

## 1. What the owner said

17 Nov 2026, with a PDF export and a screenshot of the same crowded month side by side: *"1st image is pdf export, 2nd
image is live viewer...the live viewer still looks different and is changing the height and stretching the whole
calendar"*.

That is the 16 Nov ruling "Full size, taller page" working as built (the month page, `b8f4ccf`): a month the PDF
shrinks stayed full size on screen, in a card taller than a Letter page. In the PDF the weeks' bars and text are
smaller, so every note fits one line; on screen the same notes wrapped to two and the card grew.

⛔ The two images are of a real show's calendar. Nothing from them may enter the repo, a fixture or a doc. Use the
synthetic fixtures that already hold a shrunk month: `monthscale` (August 2026), `month-dense60` (August 2026),
`month-lanecap` (August 2026).

## 2. Rulings (owner's pickers, 17 Nov 2026)

- **R1 "Shrink like the PDF".** The card stays one page tall at every month. A crowded month's bars and text get
  smaller on screen by the same factor the PDF uses, and notes wrap where the PDF wraps them. The zoom slider still
  enlarges it. This REPLACES "Full size, taller page".
- **R2 "Approve with that gate".** One frozen edit: on screen only, in a shrunk month, a note's lines are counted at
  the smaller text size. Inert at full size and while printing. **Gate:** gates 10 and 13 byte-identical, and the
  screen's week heights match the written PDF's rows on the shrunk test months.

- **R3 "Stay one page"** (picker, 17 Nov 2026, on the stage 1 build). A line the user adds to a week with the row's
  "+" does not make a shrunk month's card taller: the week keeps the PDF's row, and a blank line with no room is hidden
  below the week's edge. (A fitting month still keeps an added line inside its week.)

## 3. What the PDF does (read from the writer, `mvlFitMonth` and the comment above `mvlFitNumbers`)

- A month fits when the weeks' needs add up to no more than the room under the header. Otherwise ONE factor `k` for
  every week, a whole number of 64ths, the LARGEST at which the month fits, found by six halvings.
- `mvlWeekPaint(k, barSize)` is the list of what scales: the bar layer's top and bottom padding, the lane minimum and
  gap, every bar's type, vertical padding and radius, a note's type, line and vertical padding, the grey tags, the day
  number, the cell's top padding and strut, the shoot-day label. ⛔ NOT scaled: every width, every horizontal padding
  and margin, every line weight (a bar's 1 px border), and the header, month bar and weekday row.
  - So a Standard bar is `17k + 2` px tall (15k line + 2k padding + 2 px border), not `19k`; a 10 px note is
    `(13n + 4)k + 2`.
- Notes are RE-WRAPPED at the smaller size in the same box and each week re-packed with the renderer's first-fit rule
  (`mvlShrinkWeeks`). Pills keep their full-size line count.
- A shrunk week's height is its top line (not scaled) plus its bar layer at `k`, never under `57k`; what room is left
  is shared out by `mvlShareRows`, as in a month that fits.
- The `monthwriter` leg already holds a shrunk PDF month, box for box, to Chrome's own layout of the print document
  restyled by its `scaledCss(pi, k)`. ⭐ That function is the worked list of CSS to scale; start from it.

## 4. The build

1. **Ask the writer, for the month on screen.** In `app.js`'s "THE MONTH PAGE" block: render the visible month's PRINT
   html exactly as `buildMonthLayout` does (set `printingCursor` to the cursor month, call frozen `renderMonthView`,
   restore both in `finally`), make its model with `mvlMonthLayout`, and take `mvlFitMonth(model, fonts).fit`
   (`mode`, `scale`, `rows`). That is the export's own answer for that month, so the factor cannot differ from the
   PDF's. Needs the four Inter PDF programs (`loadInterPdfFont`, once, async): until they are in, the month draws as
   today, then is fitted again. Cache the fit by the print html.
2. **Hold the factor in engine state** (`mvScreenK`, 1 = none; session only, never saved). When the writer's factor
   differs from the one the month on screen was rendered with, set it and call `render(currentSchedule)` once, from the
   first observer (the one that already re-renders a month drawn with no day to measure). The second pass computes the
   same factor, so it does not loop.
3. **Frozen edit SK1 (R2).** In `mvNoteLineCount` (the 10 px path) and `mvNoteLineCountSized`: when `!printingCursor`
   and `mvScreenK !== 1`, measure in a box whose TEXT width is the drawn text width divided by `k` (type shrunk by `k`
   in the same box is the same wrap as full type in a box `1/k` as wide). Use the DRAWN box (`boxW - 6/7`), as the
   sized path already does. The cache key must carry it (it does if the width is changed before the key is made).
   ⛔ Not `mvNoteBoxWidth()`: one-day pills read the same width and the PDF does not re-wrap pills.
4. **Screen-only CSS**, in the month page's block, under a class on `#table-wrap` (its own attribute) with `--mvk` on
   its own style: every size §3 lists, as `calc(<px> * var(--mvk))`, the unscaled borders added where a height is
   fixed. Doubled id, as the month page's own size rules. Soft Lines stays.
5. **Week heights in a shrunk month** come straight from the writer's `fit.rows` (`--mvp-f<i>: 0 0 <row>px`), so they
   are the PDF's by construction. A month that fits keeps today's flex rule (already within 0.03 px).
6. **The card is one page at every month.** Nothing else changes for a month that fits.

## 5. Tests

### As built (17 Nov 2026)

Seven legs failed on the stage 1 build (80 checks in the row limit's full gate); each is re-premised, green on the build,
and red on a mutant of the build:
- **`monthpage`**: G0 the card is one page in EVERY month (it was "at least"); P every printed month's weeks are the
  written PDF's rows, a shrunk month too; **T** the factor on screen is the PDF's in every month (read from the PDF's own
  day-number type: 8.25 pt times k), a whole number of 64ths, a shrunk month's card one page; **N** a shrunk month's notes
  are in the PDF's boxes (each note paired with the PDF's clipped text group: lanes = the PDF's lines, same width, never
  taller, the PDF's height for all but a knife-edge 3%); B bars and notes at their printed height times k; **K** Stay one
  page. Runs on all three shrink fixtures with `shrunk=1`, and on `monthscale` at 1100 x 760. Mutants: SK1 off (N), the
  shrink CSS off (P, N, B), no factor (T), Stay one page off (K).
- **`monthemit` / `monthwriter` / `monthlayout` F0**: the month page's region now runs from `monthPageNumbers` to the end
  of `mvShrinkToFit` and is held to EXACTLY the writer names its fit uses (seven; five of them the model's, for
  `monthlayout`); `loadInterPdfFont` appears five times, not four; and `monthlayout` checks that the programs are asked
  for in the month view only. Mutants: an eighth name (all three), the month-view-only guard dropped (`monthlayout`).
  `monthlayout` takes `?src=` now, as the other two do.
- **`monthexport` X1**: `font-inter-600` is taken out BEFORE the app boots (the first month drawn decodes the programs,
  and a decoded weight is cached, so taking it out later no longer fails the export), and put back after X1. The leg's
  own slice reads it for the four synchronous loader calls only.
- **`monthlanes` L16b**: 8/12's 25 notes are read at FULL size from the print document (76 lanes, past the old cap of
  60); on screen the shrunk month's notes take 51 and could never show the cap. Mutant: the 60-lane cap put back.
- **`mvnotesize`** (on `month-dense60`): every rule is judged at the month's factor (k = 1 everywhere but the shrunk
  August). Mutant: the shrink CSS off. (SK1 off leaves it green: it judges heights and sizes, not where a note wraps;
  `monthpage` N holds SK1.)

**The full gate** (17–18 Nov 2026, this build and the month row limit together, `origin/main` v1.17.0 merged in;
build `19edc0f9…`): **5,731 pass, 14 fail.** Gates 1–3, the restore, **gate 10 (11 of 11 print documents) and gate 13
(24 of 24 written month PDFs) byte-identical**, which is the gate the owner set for SK1. Every leg above green in it.
The 14 failures were timeouts or runs that stopped early under a machine load of up to 60 (the gate took 11 h 45 min);
each passes alone on the same build, and the 4 gate 13 files those runs did not write were written alone and are
byte-identical. `HANDOFF.md` lists them.

### As planned

- `monthpage`: **T is re-premised** (it holds "stays full size in a taller card"): a shrunk month's card is one page
  and its weeks are the written PDF's rows, the same rule as P. G0's "at least 788.03 px tall" becomes "788.03 px".
  B (printed heights) needs the scaled heights on a shrunk month. Add: on a shrunk month every note has the lines the
  PDF gives it (read the PDF's note lines out of its content streams, or compare lane counts through `mvlShrinkWeeks`).
- `monthemit` / `monthwriter` F0: the month page's region now names more of the writer (`mvlMonthLayout`,
  `mvlFitMonth`, `loadInterPdfFont`, `MVL_FONT_WEIGHTS`, `mvlTextWidth`, `MVL_GEOMETRY` as used). Widen its allow-list
  to exactly the names used, and move its end marker if `monthPageNumbers` changes shape.
- Gates 10 and 13 byte-identical (R2's gate). `calzoom`, `mvbarsize`, `mvnotesize`, `mvtextstyle`, `hoverexpand`,
  `mvmenu`, `softlines` on the shrink fixtures: expect some to need re-premising; the full gate will say.
- Mutation proofs: SK1 disabled (notes keep full-size lines: the lanes case goes red); the CSS disabled (rows differ).

## 6. Traps already known (from building the month page)

- The fit's MutationObserver must stay the FIRST one made on `#table-wrap`.
- A re-render before Inter is in poisons the note line caches; `mvFontsIn()` reads the face's own status.
- A leg that measures right after a render must wait for the second render (the fresh-month one, and now the shrink one).
- `monthpage` Z: at 50% zoom a week is up to 1.5 px off its 100% height (hairlines draw at least one device pixel).
- Knife edges remain: Chrome's text measure and the writer's font tables differ by hundredths of a pixel, so a note
  within about 0.1 px of its box can still take a line more or less than in the PDF.
- Two full gates at once stall each other: `pgrep -f gate.sh` first. A gate is about 55 minutes.
- Hand the owner a localhost build to try before legs and docs ("try in the browser before finishing").
