# Stage 8 — what it is, and why almost none of it can be built

**Written 29 Aug 2026, against commit `6a32b95`. Read-only investigation: `index.html` was not
modified.** Produced by six parallel agents mapping the code, an adversarial pass that knocked down
15 of their 24 claims, and then a hand verification of every claim that survived and mattered.

> ⚠️ **This is a dated investigation, not living documentation.** It is deliberately *not* checked
> by `tools/check-refs.py`. Citations name **symbols**, not line numbers, for the reason
> `PROJECT-CONTEXT.md` §14 gives — `grep -n` finds a symbol forever, a line number rots on the next
> commit. Every value quoted was read from the source at the commit above.

---

## 1. What Stage 8 is

Stage 8 is the leftover list of ways the app's printed calendar does not look like the Excel
printout the owner supplied as the reference. Six differences: the body text is a hair bigger, the
grid is narrower, the rows are taller, the table starts half a point higher, and two colours are
wrong. It was written expecting **Stage 7** (the split Notes column) to close most of it for free.
Stage 7 is held (`HANDOFF.md` §2c), so Stage 8 would have to close the gap on its own — and the
rule set on 29 Aug 2026, that the exports must look exactly as v1.0.0 did (`HANDOFF.md` §4),
applies to every route.

**Framing point, verified by hand.** The app's export code today *is* v1.0.0's. Spot-checked
function by function against `releases/v1.0.0.html` — `buildWaterfallPdf`, `exportExcel`,
`sheetColumnWidths`, `computePhaseRowLayout` and `cellTextFit` all hash identically. So the gap
Stage 8 wants to close is not a regression that crept in. **It is the gap v1.0.0 shipped with, and
closing it means changing what v1.0.0 prints.**

---

## 2. The mechanism — one number, multiplied by fifteen

Excel and the app both print "fit on one page", and both ask the same question: how far must I
shrink this until it fits the paper in *both* directions? Whichever direction runs out first sets
one scale for everything.

> **Excel runs out of width first. The app runs out of height first — and the app gave itself
> 36 points more height to run into than Excel has.**

On landscape Letter (792 × 612 pt), verified in the source:

| | printable width | printable height |
|---|---|---|
| The **workbook** the app writes (`exportExcel`'s `pageSetup.margins`, 0.25/0.25/0.75/0.75 in) | 792 − 18 − 18 = **756** | 612 − 54 − 54 = **504** |
| The app's own **PDF writer** (`SHEET_PAGE_MARGIN_PT`, `{l:18, r:18, t:54, b:18}`) | 792 − 18 − 18 = **756** | 612 − 54 − 18 = **540** |

The bottom margin is 18 where Excel's is 54, **deliberately**. The comment on
`SHEET_PAGE_MARGIN_PT` says so: Excel reserves that band for a footer, this app draws none, so it
was reclaimed as *"the one free increase available."*

Then, in `buildWaterfallPdf`:

```js
const raw   = Math.min((paper.w - l - r) / gridW, bodyH / gridH);
const scale = Math.max(0.1, Math.floor(Math.min(raw, 1) * 100) / 100);   // whole percent, like Excel
```

One number comes out, and every row is drawn at `(rowHeights[r] || ROW_DEFAULT_PX) × ROW_PX_TO_PT ×
scale` — exactly **15 pt × scale** for a row nobody has dragged. Every column, font and rule is
multiplied by the same number.

**So there is no row-height setting to turn. Row pitch *is* the fit scale, times fifteen.**

The reference printed at 58% (its content stream opens `0.58 0 0 0.58 0 33.16 cm` — `HANDOFF.md`
§3, measured against a file that is no longer available). The app printed at roughly 64–66% on the
same calendar. Roughly **half of the +16% is the reclaimed bottom margin alone**: scale is linear
in the height budget while height-bound, so 540 → 504 would be −6.7% on everything.

### The second-order consequence nobody has decided about

**The app's PDF and the app's own Excel file do not print at the same size.** For any calendar
where height binds, the PDF prints ~7% larger (540/504) than the same calendar printed from the
`.xlsx` the app just wrote. That is not a reference-matching question — it is the app disagreeing
with itself, and it has never been raised.

### Which axis binds is a property of the calendar, not the app

Worth knowing before anyone generalises. The committed baseline
(`tests/baselines/2026-08-29-stage-7/`) is a 2-block portrait calendar and it is **width**-bound at
72%, exact to the digit:

- grid 797 pt unscaled × 0.72 = **573.84** = the drawn width in `base.pdf.json` ✓
- 53 rows × 15 pt × 0.72 = **572.4** = the drawn height ✓
- printable width 612 − 36 = 576 (binding), printable height 792 − 72 = 720 (slack)

---

## 3. The inventory

| # | Item | Status | Why |
|---|---|---|---|
| 1 | Body text +1.1% (6.96 → 7.04 pt) | **BLOCKED** | A knob exists — the four draw sites in `buildWaterfallPdf` take `11` as the base, and 10.875 × 0.64 = 6.96 exactly, with no grid movement. It changes what v1.0.0 prints, so §4 stops it. A permission problem, not an engineering one. |
| 2 | Grid width −48 pt | **BLOCKED** | This *is* Stage 7. The width gap is the missing notes-date column, and Stage 7 was held on exactly this ground. |
| 3 | Grid height +75 pt | **BLOCKED** | The same one number as row pitch. Cannot move without moving everything. |
| 4 | **Row pitch +16%** | **BLOCKED** | The stage's headline item. Every lever — `ROW_DEFAULT_PX`, the fit binding, the column widths, the margins — is either frozen by §0 rule 2 or visibly changes the PDF. No version of this survives §4. |
| 5 | Table top −0.5 pt | **BLOCKED, and close it** | 54.0 is the top margin and it is v1.0.0's. Half a point is 0.18 mm. Not worth a release. |
| 6 | "App reserves 54 pt above the grid, Excel ~21.5" | **DOC FIX** | **The claim is false of the current code.** See §5. |
| 7 | Pre Prep / Prod Prep fills swapped vs reference | **NEEDS A DECISION** | Two hex literals in `PHASES`. Zero geometry risk. But it visibly changes both exports against v1.0.0. |
| 8 | Header grey `#D9D9D9` vs reference `#D0CECE` | **NEEDS A DECISION** | One literal in `exportExcel`, one in `buildWaterfallPdf`, one in the print-fallback CSS. Same call as #7; answer them together. |
| 9 | **PDF prints ~7% larger than the app's own workbook** | **NEEDS A DECISION** | Reverting `SHEET_PAGE_MARGIN_PT.b` to 54 makes the two outputs finally agree — and shrinks every height-bound PDF by ~7%, the most visible single change on this list. Also the only lever that touches nothing inside the frozen grid. |
| 10 | `sheetPageOrientation()` charges the header band on top of the top margin | **NEEDS A DECISION** | It fits into 756 × 518.4 where `buildWaterfallPdf` fits into 756 × 540. It feeds `ws.pageSetup.orientation`, so "fixing" it can flip a workbook portrait↔landscape. Not a quiet correction. |
| 11 | Print area covers rows `sheetRowCount()` trimmed | **NEEDS A DECISION** | Makes the workbook print smaller than it needs to on a 53-Monday year with an idle last week. Fixing it makes Excel prints *bigger* — an export appearance change. Needs a new fixture; the committed baseline does not exercise it. |
| 12 | Screen header grey `#F2F2F2` disagrees with both exports' `#D9D9D9` | **ALLOWED** | §4 gives the on-screen grid latitude and freezes the exports. Read literally: the screen value may move, the export value may not — the opposite of the instinct. |
| 13 | Dead code and a wrong comment in the PDF writer | **ALLOWED** | `headerH` and `bodyTop` are computed and never read (`grep -n` finds only their declarations). Provably output-neutral, but still a diff against the `releases/` copy — ask first. |
| 14 | **`buildSavedHtml()` bakes visible notice strips into shareable copies** | **BUG — and fixing it moves the export *back* toward v1.0.0** | Confirmed empirically, see §4. |
| 15 | **`PHASE_COLOR_OPTIONS`'s array order is part of the save-file format** | **ALLOWED — write it down** | `phaseColorOverride[key]` and `customPhaseDefs[].colorIndex` are **array indices**, and both are in `captureSnapshot()`. Re-ordering that array silently recolours every calendar ever saved. Undocumented until now. If #7 ever ships, re-pair **in place**, and swap the option *names* too ("Blue (like Pre Prep)" / "Slate (like Prod Prep)"). |
| 16 | Per-cell font size already exists and reaches the PDF | **ALLOWED — surface it, don't change defaults** | `cellTextFit`'s `opts.manual` path returns `basePx/11`; `noteFontSize` / `hiatusFontSize` are saved state. A user who wants smaller text already has the control. |

---

## 4. The one real bug — proved, not read

**Export shareable copy bakes in whichever notice strip happens to be showing.**

`buildSavedHtml()` serialises a clone and strips `#table-wrap`, `#print-root` and the three
body-level popover classes. It does **not** strip `#legacy-notice` or `#update-notice`. Both ship
`hidden` in the markup and are un-hidden at runtime by `el.hidden = false` — which *removes* the
attribute, and `outerHTML` serialises attributes.

Reproduced with `tests/harness/t/sharecopy.js`: open the real legacy fixture (which raises the
upgrade strip), then File ▸ Export shareable copy. What came out, verbatim:

```html
<div id="legacy-notice" role="status" aria-live="polite">
  ... <strong>v1.0.0-saved</strong> is an older <strong>.html</strong> calendar. It opened fine ...
```

No `hidden`. The control assertions in the same run passed — `#table-wrap` *was* emptied and
`#update-notice` *did* keep its `hidden` — so the test is reading the right file and the strip
really is the exception.

**What the recipient sees:** a working calendar with a permanent banner naming *someone else's*
file and urging them to upgrade a file they do not have. The same mechanism bakes in the blue
update banner if one is showing at export time.

**This is a v1.2.0-era regression in an export** — v1.0.0 had neither element. So under §4 fixing
it is not merely permitted, it is *required*: the fix restores v1.0.0's output. It is one line in
`buildSavedHtml()`'s existing strip list. **Not applied — `index.html` was not touched by this
investigation.**

---

## 5. The verdict

**Stage 8 is mostly dead, and the part that dies is the part it was named for.**

Its four geometry rows — body text, grid width, grid height, row pitch — are not four items. They
are **one whole-percent fit scale multiplying fixed geometry.** Every route to moving any of them
visibly moves the PDF, most move the workbook too, and §4 forbids that. Two more rows are not
defects at all: on the table top the app is already right, and the header band describes behaviour
the code stopped having on 28 Aug.

What is genuinely left is not calibration:

- **Two one-line colour decisions** (#7, #8) that only the owner can make.
- **One real bug** (#14) whose fix moves an export back toward v1.0.0.
- **Three internal disagreements** (#9, #10, #11) where the app contradicts *itself* and nobody has
  decided which side is right.
- **A short list of output-neutral cleanups and undocumented hazards** (#6, #12, #13, #15, #16).

That is a half-day of work and two conversations. **It is not a stage.** Recommendation: strike
Stage 8 from the build order, fold #14 into the next release as a bug fix, put #7/#8/#9 to the
owner as three yes/no questions, and record the row pitch as **WONTFIX** in §2d so the next session
does not burn another stage rediscovering that it cannot be touched.

---

## 6. The decision the owner owes

> **When you said "exactly as 1.0.0 was", did you mean the app's v1.0.0 build, or the Excel
> spreadsheet the reference export came from?**

Read here as **v1.0.0 the build** — the owner's own words were *"easy to understand for new users
coming from the old version"*, and the old version people come from is the deployed app.
Everything above assumes that. But the whole of Stage 8 exists to make the app match the
*reference*, so the two readings give opposite answers.

**If v1.0.0 the build** — nothing on the geometry list ships, #7 and #8 do not ship, Stage 8
closes. Cost: the printed calendar stays 16% loose in the rows and two colours off from the
reference, permanently. Benefit: nobody's printout changes, and the frozen surface stays frozen —
which is also what protects saved files and the Excel/PDF agreement already in hand.

**If the reference** — #7 and #8 become wanted work (a day, low risk), and #1, #4 and #9 become
live questions with real cost. Closing row pitch means either reverting the bottom margin (#9, −7%
on every height-bound PDF) or re-opening Stage 7 (option 3 in §2c). Everyone with a saved calendar
gets a different-looking printout on their next export.

**A third answer is available and may be the honest one:** the exports stay as v1.0.0 and the
*screen* grid gets the design attention instead. §4 already grants that latitude explicitly; #12 is
the first candidate.

Whichever it is, one line into `HANDOFF.md` §4 verbatim, so it is not re-litigated in three
sessions' time.

---

## 7. What was knocked down

Six claims that looked solid did not survive the adversarial pass. Recorded so nobody re-derives
them.

### ⚠️ `HANDOFF.md` §2d contained a statement that is FALSE of the current code

> *"the app reserves 54 pt above the grid where Excel reserves ~21.5 (Excel puts its header
> inside that band)"*

The app has drawn its header **inside** the top-margin band since 28 Aug 2026 — exactly as Excel
does. `buildWaterfallPdf` says so in terms (*"Drawn in the TOP MARGIN band, at Excel's header
margin, not above the grid in the body… the header costs the grid nothing"*), its first baseline is
`MARGIN_PT.hdr + asc*T`, and the grid origin is unconditionally `MARGIN_PT.t` with nothing added
(`originY` appears in exactly two places, both verified).

The `~21.5` is Excel's **header margin** (0.3 in = 21.6 pt), which is where Excel puts its header
*text*. Excel's grid still starts at its 0.75 in top margin. §2d's own table records that agreement
two rows earlier — *Table top: Excel 54.5, App 54.0*. **The sentence contradicted the table printed
twenty lines above it.** Left in place it would have invited the next session to "fix" a 32 pt band
that is already correct, inside a function byte-identical to v1.0.0. **Now struck in §2d.**

### The §2d app-side numbers are not internally consistent

Two of the four app figures imply a 64% fit scale (body text 7.04 = 11 × 0.64; grid width 706.5 ≈
1104 × 0.64). The other two imply ~66.3% (row pitch 9.94 / 15; grid height 527.0 / (53 × 15)). The
app applies **one** scale to fonts and geometry alike, so all four cannot be right. And 706.5 is not
1104 × any whole percent — 0.64 gives 706.56, 0.63 gives 695.52 — where the committed baseline is
exact to the digit (797 × 0.72 = 573.84).

Something in that measurement is off; most likely the two heights were taken against different row
counts, or that calendar had dragged row heights. **The reference file is gone, so it cannot be
settled.** Treat +16% as *"large and real"*, not as a target to hit to a decimal place. Anyone
re-opening this needs a fresh reference export from the owner first.

### "The body-text delta is purely a scale consequence" — no

It is two differences nearly cancelling. The reference draws nominally 12 pt type at 58%; the app
draws nominally 11 pt at ~64%. If the app matched the reference's scale exactly, its body text
would be 11 × 0.58 = 6.38 pt — an 8.3% *deficit*, worse than today's +1.1%. "Close the scale gap and
the text follows" is backwards.

This also puts a question mark on §2c: if the reference workbook's Normal style really was 12 pt
(6.96 / 0.58 = 12.0 exactly), then part of the 1104 → 1301 pt width gap is **type size, not notes
columns**, and §2c's *"nearly all of that gap is the notes columns"* is overstated. The comment in
`exportExcel` argues the opposite from the reference's 15 pt row height. Both cannot be right, and
again the file is gone.

### "The PDF's fit box is 756 × 540" — true of one computation, in one of three paths

`buildWaterfallPdf` scales into 756 × 540. But `sheetPageOrientation`, which *chooses the page* for
both the PDF and the workbook, fits into 756 × 518.4 (it subtracts the header band as well). The
print-fallback PDF uses its own margin model and scales *up* to 2×. The month PDF is a height-only
`scaleY`. **"The PDF" is not one thing, and neither is "the fit."**

### "Nothing in the code chooses to be height-bound" — wrong in spirit

The scale is a symmetric `min()`, yes. But the flat 20 px row model and the asymmetric margins
(72 pt of the landscape page's height against 36 pt of its width) set the ratio, and
`SHEET_PAGE_MARGIN_PT`'s comment reclaims the bottom margin *because* "on a landscape sheet the fit
is usually height-bound." The codebase reasons about this and sets constants in response. Which
axis binds is also not a property of the app — the committed baseline is width-bound at 72%.

### "The exports are byte-identical to v1.0.0" — the source is; the output is not

The export-producing source really is unchanged. But the Excel bytes come from a CDN-loaded ExcelJS
and the printed header carries the export date, so two exports from the same build are never
byte-identical to each other. And the clause "nothing shipped in v1.1.0/v1.2.0 has to be undone" is
false — item #14 is a v1.2.0 change that alters an export's appearance versus v1.0.0.

### One claim I checked and REJECTED before it reached this document

An agent flagged `applyStateSnapshot`'s `phaseColorOverride` restore as a conditional-restore
violation. It is not: it has the required `else { phaseColorOverride = {}; }`. Verified by reading
it. Recorded because "the agent said so" is not evidence, and this one would have sent someone
after a bug that does not exist.

---

## 8. Housekeeping found on the way

- **`tools/check-refs.py` reported CLEAN while `HANDOFF.md` §2b's line numbers were stale by
  exactly +32.** The prose scan skipped any line beginning `|`, and §2b keeps its references in a
  table. That is precisely the failure the script was written to prevent, just moved inside a
  table. **Both fixed** — the checker now catches a backticked symbol followed by a bare line
  number anywhere outside §14, and §2b now names symbols instead.
- ExcelJS 4.4.0 writes the print area as the row-relative defined name `'Planning Cal'!$A1:$H53`
  rather than `$A$1:$H$53`. The emitted string is verified; that Excel *misreads* it is **not**.
  `exportExcel`'s comment says the print area is what stops `fitToHeight:1` fitting the wrong
  sheet, so it is worth ten minutes with a real Excel.
- The six `--c-<phase>` CSS custom properties are a dead mirror of the JS palette — only
  `--c-hiatus` and `--c-simpost` are ever read.

## 9. What could not be done

The owner's reference export is **not in this repo and never has been**. Every number attributed to
it here comes from `HANDOFF.md` §2d or §3, both measured in an earlier session against a file that
is gone. No browser and no Excel were run for the analysis: the fit arithmetic was checked against
the committed baseline artifacts, and the constants were read from source. The one empirical claim
— item #14 — was proved in headless Chrome with the committed harness.
