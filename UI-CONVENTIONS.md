# UI-CONVENTIONS.md — the chrome's design system

**Written 29 Aug 2026**, against `main` at `83ac3b7`, at the owner's instruction:

> *"a UI conventions reconsideration pass is necessary right now. Other than the actual editing
> waterfall view and the export structure of the pdf … and excel — do a full pass into how to
> beautify the rest of the controls, including fonts, weighting, spacing, margins, date pickers,
> warning pop ups, colors … Items such as note pop ups, phases etc — all of it should get a
> decision pass based on mantine's responsive components"*

This is **Mantine Stage 2** — the design pass that `MANTINE-MIGRATION.md` §6 says comes before any
chrome is built, and that `HANDOFF.md` §5c asks for as *"explain to me exactly how X will work
before you build it."* **No code was written into `index.html` for this document.**

Reading order is unchanged: [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) →
[`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md). Read [`MANTINE-SEAM.md`](MANTINE-SEAM.md) before acting
on anything here.

---

## 0. What this document is, and the one thing it is not

It settles the three things Stage 2 exists to settle — **theme tokens**, **one feedback system**,
and **the chrome's responsive behaviour** — plus the component choice for every control, overlay
and date picker outside the frozen surface.

**It is not permission to start building.** Six items in §9 need an owner ruling first, and three
of them turn out to require editing `render()`, which is frozen.

**Every Mantine claim here was checked against the real package**, `@mantine/core` and
`@mantine/dates` **9.5.2**, installed and read rather than recalled. Where this document says a
prop exists, someone opened the file. Where a widely-assumed prop turned out **not** to behave as
expected, that is §8 — and §8 is the most valuable part of this document.

Per `CLAUDE.md`, prose here names **symbols, never line numbers**. `grep -n` finds them.

---

## 1. The boundary, stated once

The owner narrowed this on 29 Aug 2026, mid-pass:

> *"the waterfall editor and output is to remain as similar to as it is right now to retain its
> identity to user-comfortable conventions of the past, unless given specific instructions from
> the user. This includes formatting styles, auto shrinking, font, font size, width and heights
> etc etc. Outside of the actual grid and export, all is fair game"*

That is now the rule in `CLAUDE.md` and `HANDOFF.md` §4, and it **withdrew** the latitude an
earlier remark had been read as granting. The line this document holds:

| | |
|---|---|
| **Frozen** | Anything that changes what a grid cell *looks like*, or *how much text fits in it*. |
| **Fair game** | The chrome around the grid, and the floating panels *anchored to* it. |

`.note-pop` is a body-level panel — `document.body.appendChild`, which is the whole point of it —
so its own padding, type and controls may be redesigned. What may **not** change is the note's
rendered size, wrapping or shrink behaviour once it lands back in the cell.

### ⚠️ Three CSS blocks are filed under the wrong section header

A line-range fence would freeze the wrong things. Classify by **runtime DOM position**, never by
the section comment above a rule:

| Rules | Filed under | Actually |
|---|---|---|
| `.simpost-*`, `.ep-panel`, `.ep-panel-warn` | *Month view* | **chrome** — built into the sidebar's Production phase row |
| `.prod-total-*`, `.show-info-note`, `.show-info-flags`, `.episode-row` | *Calendar PDF export* | **chrome** — sidebar |
| `.note-pop*`, `.mv-note-pop*`, `.note-day-row`, `.note-size-row`, `.note-color-row` | between frozen `.sheet-*` rules | **chrome** — both popovers are appended to `document.body` |

Conversely `#mv-hdr-mode-btn`, `.mv-arrow`, `#hdr-mode-btn` and `#notes-reset-btn` *look* like
chrome and are **frozen** — the frozen renderers emit them into `#table-wrap`.

### ⚠️ The phase palette's real source is JavaScript, not the CSS tokens

The freeze has been described as protecting the `--c-*` custom properties. **Measured: they have
two consumers in the whole file, `.badge.hiatus` and `.badge.simpost`, and both are dead CSS** —
`badge` appears nowhere in the markup or in any JS-generated HTML, along with `week-table`,
`block-divider`, `date-cell` and `footer.assumptions`.

The live palette of record is the **JS constants**: `PHASES[]` and its `color` / `textColor`
fields, plus `HIATUS_COLOR`, `SIMPOST_COLOR`, `MILESTONE_COLOR`. The grid emits those as inline
hexes; `exportExcel` and `buildWaterfallPdf` read the same constants. The `--c-*` block is a
byte-identical shadow copy that nothing live reads.

**Consequence:** the phase colours are frozen **in JavaScript**. Keep the `--c-*` declarations
anyway — they are the palette's documentation and cost nothing — but do not believe that guarding
them guards the exports. And `PHASE_COLOR_OPTIONS`' array **order** remains save-format data
(`phaseColorOverride` and `customPhaseDefs[].colorIndex` are indices into it): **append only.**

---

## 2. What was measured

Chrome only, frozen surface excluded. Every number here was counted or measured, not estimated.

| | |
|---|---:|
| Distinct `font-size` values | **16** (34 of 106 declarations on a half-pixel) |
| Distinct `font-weight` values | 4 (400, 500, 600, 700) |
| Distinct `line-height` values | 9 |
| Distinct `border-radius` values | 9 — and `--radius` is used at **2 of 56** radius sites |
| Distinct `box-shadow` values | 8, for **5** surfaces at the same conceptual elevation |
| Distinct spacing values | 18; values ≤8 px are **147 of 206** occurrences (71%) |
| `z-index` declarations | 18, **12** distinct values |
| Inline `style=` attributes | **40** in markup carrying **168** declarations, + 25 built in JS |
| Feedback surfaces | **32**, across 7 font sizes and 16 uncoordinated amber/blue hexes |
| Chrome form controls | 181 |

### The five findings that carry the pass

**1 — The chrome's fonts are a CDN dependency the grid's font deliberately is not.** Inter and
IBM Plex Mono are fetched from `fonts.googleapis.com`. Carlito is *embedded* — base64, decoded into
a `FontFace`, with a comment saying it shadows any same-named font on the machine — precisely so
measurement cannot drift. Offline, on `file://`, or inside an emailed shareable copy, the entire
chrome silently falls back to system faces at sizes tuned for Inter. This cuts against the
self-containment rule the project treats as load-bearing.

⛔ **And it is load-bearing for a frozen export.** `mvNoteLineCount()` measures a hidden div whose
`cssText` names `'Inter'`, and its return value is the `span` argument to `place()`, which sets
month-view row heights — and `exportMonthPdf` prints those. **Whether Inter loaded changes the
month PDF.** See §9.1; this is not a typography decision to take alone.

**2 — The Inter race has no cache invalidation.** `carlitoReady.then()` clears `_measureCache` and
re-renders, under a comment explaining that a first render against a fallback face bakes wrong
column widths in for the session. `_mvNoteLineCache` gets no such treatment — it is cleared only by
its own size guard. The stylesheet uses `display=swap`, so the first paint is *guaranteed* to
happen against the fallback. The Carlito fix was never extended to the chrome font.

**3 — Nine visible controls render in Arial.** 22 CSS rules set `font-family:inherit`; the rules
for `.ln-x`, `.icon-btn` and `#help-close` do not, and `<button>` does not inherit it. So every "×"
and the undo/redo arrows — which are text glyphs, not icons — are drawn in a different typeface
from everything around them. (54 checkboxes are also Arial; invisible, ignore them.)

**4 — The frozen CSS reads the chrome's neutral tokens 39 times.** `var(--text)` ×15,
`--border-strong` ×7, `--text-muted` ×5, `--text-faint` ×5, `--edit-accent` ×4, `--edit-accent-bg`
×1, `--bg` ×2. Among them: `border:2px solid var(--text)` on `.sheet-blockstart` / `.sheet-blockend`
and the first/last row rules — **the waterfall's structural block borders** — plus two rules inside
`@media print`. **Retinting the chrome's neutrals moves frozen output.** They must fork: frozen
consumers keep the literal values under the existing names.

**5 — One class does four jobs.** `.placeholder-note` is 12 px italic `--text-faint`, and it is
used for explanatory copy, for `#union-lock-hint` (recoloured amber inline), for `#custom-hol-err`
(recoloured red inline), and for `#holiday-vis-empty` (an empty state). **All six instances carry a
`style=` attribute overriding it.** Italic currently means both "explanatory" and "error", and
therefore means nothing.

### Measured responsive behaviour

Real browser, real app, populated calendar:

| Window | Layout | Sidebar | App toolbar | Preview toolbar |
|---|---|---:|---|---|
| 1600 | row | 384 | 1 line | 1 line |
| 1280 | row | 333 | 1 line | 1 line |
| 1190 | row | 305 | 1 line | 1 line |
| **1180** | row | 307 | 1 line | **2 lines (75 px)** |
| 1024 | row | 280 | 1 line | 2 lines |
| **1012** | row | 280 | **2 lines** | 2 lines |
| 940 | **column** | 940 | 2 lines | 1 line |

⚠️ **A documented number is wrong.** `HANDOFF.md` §6 argues for a status bar partly because the top
toolbar *"already wraps to two lines below 1280 px"*, and `PROJECT-CONTEXT.md` records the same as a
settled decision. Measured:

- The **preview** toolbar wraps at **~1185 px**, and its wrapped height is **75 px** — exactly the
  "75 px tall" `PROJECT-CONTEXT` records. So that note is right, and it is about a *different
  toolbar* than `HANDOFF.md` §6 credits it to.
- The **header** toolbar wraps between **~848 px** (empty app, short status string) and **~1018 px**
  (long file name, longer status string) — it is content-dependent, bounded by the file button's
  `max-width`. Never at 1280.

Both corrections are now in those two files. The dependence on the file name is itself the argument
for §7's decision: **make the header structurally incapable of wrapping** rather than measuring it.

### The two measured wrap points land on Mantine's own defaults

Mantine 9.5.2's defaults are `lg: 75em` = **1200 px** and `md: 62em` = **992 px**. The measured wrap
points are ~1185 and ~1018. Adopting Mantine's breakpoint *names* is therefore an empirical fit, not
a convenience — see §7.

---

## 2b. The visual reference: ui.mantine.dev

**Set by the owner, 29 Aug 2026, mid-build:**

> *"review https://ui.mantine.dev/ — these prebuilt components are good references to what I want
> it to look like"*

This is a decision about *look*, and it resolves something §3 left open. §3 settles the **tokens**;
this settles **how they are consumed**. Read together they say: the chrome does not merely contain
Mantine components, it is built the way Mantine UI builds.

**The conventions, read out of Mantine UI's own source** (`NavbarSimple.module.css`,
`HeaderTabs.module.css` and friends in `mantinedev/ui.mantine.dev`) rather than inferred from
screenshots:

| | |
|---|---|
| Borders | `1px solid var(--mantine-color-gray-3)` — a hairline, never a heavy rule |
| Resting surface | `var(--mantine-color-white)` on a `gray-0` ground |
| Hover | `background: var(--mantine-color-gray-0)` |
| **Active / selected** | `background: var(--mantine-color-<primary>-light)` + `color: var(--mantine-color-<primary>-light-color)` |
| Interactive text | `font-size: sm`, `font-weight: 500` |
| Section rule | `padding-bottom` + `margin-bottom` + `border-bottom`, not a bare `<hr>` |
| Cards | white, hairline border, `radius-md`, **no shadow at rest** — a column of them stays calm |

⛔ **The operative consequence: chrome CSS reads `--mantine-*` variables, not the app's legacy
tokens.** That is the token fork §2 finding 4 demanded, and it is the thing that makes a surface
*read* as Mantine. Converted so far: `.form-panel`, `section.card` + its `h2`, `.side-tabs`,
`.view-toggle`, `.shift-group`, `.tools-menu`, `.tools-head`, `.tools-div`.

⛔ **The legacy tokens are not retired and must not be retinted.** 39 places in FROZEN CSS read
them — including `border:2px solid var(--text)` on the waterfall's structural block borders and two
rules inside `@media print`. They keep their literal values under their existing names; the chrome
simply stops being one of their readers.

⚠️ **One tension to resolve deliberately, not by drift.** Mantine UI's blocks are *airier* than this
app can afford: they assume `sm`/`md` controls, while §3d fixes every chrome form control at `xs`
because the Phases tab already overflows its scroll container by 2×. **Take Mantine UI's structure
and its colour/border/radius idiom; do not take its density.** Where the two disagree, density wins
in the sidebar and Mantine UI wins everywhere else.

---

## 2c. ⛔ A trap §8 missed, and it is bigger than the ones it caught

**Mantine's input components are CONTROLLED. `applyStateSnapshot()` writes `el.value` into every
field on restore.** A controlled component ignores that write — React re-renders from its own state
and the restored value vanishes.

§8.1 caught `DatePickerInput`'s *id* problem and prescribed `DateInput` instead. But `DateInput` is
controlled too, so it fails a *different* way: the id survives, the id appears in `fields.byId`, the
file saves correctly — and then **the value silently does not come back on open**. That is worse
than the trap §8 documented, because it passes every id-based assertion.

Found 29 Aug 2026 while porting the preview toolbar, where `syncAnchorDate()` writes
`#tool-anchor-date`'s value every time the popover opens. It is why the two tool dates stayed native
`<input type="date">`.

**This governs the entire sidebar stage.** Every control in `fields.byId` — 56 ids — is written by
`applyStateSnapshot()`. So either:

1. **Uncontrolled everywhere** (native inputs, or Mantine components used uncontrolled with a real
   `id` and no `value` prop), keeping `collectFieldValues()` / `applyStateSnapshot()` exactly as
   they are. Lowest risk; loses `DateInput`'s week-band affordance from §5.
2. **Rewrite the restore path** so it sets React state rather than DOM values — which is
   `MANTINE-MIGRATION.md` §4.4's original plan, and it puts the save-format contract (§0 rule 3,
   *every saved calendar must keep opening, forever*) in the blast radius of a UI pass.

✅ **SETTLED 29 Aug 2026 — option (1), and by demonstration rather than by argument.** The three
static sidebar cards were built entirely from **uncontrolled** Mantine components (`defaultValue`
only, never `value`), and the `restore` gate passes against real `TextInput` / `NativeSelect` /
`NumberInput` elements: a genuine v1.0.0 saved calendar restores to 52 rows / 154 cells / 324 pt
with `fields.byId` unchanged at **56 ids**. So `applyStateSnapshot()`'s `el.value` writes reach
Mantine-rendered inputs perfectly, and `collectFieldValues()` / `applyStateSnapshot()` need no
change at all.

**What this costs, precisely:** only the components that are *inherently* controlled are ruled out —
`DateInput` and `DatePickerInput`. Every date field in the app is therefore still a native
`<input type="date">`, and **§5's Monday-snap week band has to be re-costed on its own terms**
rather than arriving free with `DateInput`. It is the one thing in this document that the port
cannot deliver as written.

---

## 3. The theme

### 3a. Type

**Face — embed Inter, drop IBM Plex Mono.** Embed Inter's four weights the way Carlito already is
(base64 of a zlib'd subset in `<script type="text/plain">`, decoded to a `FontFace`);
`tools/subset-font.py` is the worked example. Delete the Google Fonts links. Extend the
`carlitoReady.then()` guard into one `fontsReady` promise that clears **both** `_measureCache` and
`_mvNoteLineCache` before re-rendering — closing finding 2.

Take the **system monospace stack** for the eight mono sites rather than embedding a second family:
Mantine's `fontFamilyMonospace` default is already `ui-monospace, SFMono-Regular, Menlo, Monaco,
Consolas, …`. The current stylesheet requests IBM Plex Mono at weights 500 and 600 and **zero of the
eight mono sites set a font-weight** — every one renders at 400. The app is paying for two weights it
never uses, of a family it uses eight times.

⚠️ Keep `Apple Color Emoji, Segoe UI Emoji` on the end of `theme.fontFamily`. Mantine's default
carries them and the chrome renders `✓` (U+2713) in `flashSaveBtn` — exactly the glyph those entries
exist for.

**Scale — six tokens, all integers.** Sixteen sizes and 34 half-pixel declarations collapse to:

| Token | px | Role |
|---|---:|---|
| `xxs` | 10 | dense metadata, popover hints, column headers |
| `xs` | 11 | field labels, hints, readouts, status |
| `sm` | 12 | dense controls — toolbar buttons, menu items, tabs |
| `md` | 14 | body default, input text |
| `lg` | 16 | section lead |
| `xl` | 20 | modal title |

The half-pixels are not doing perceptual work: `.tb-btn` 12 vs `.side-tab-btn` 12.5, `input` 13 vs
`.phase-name-input` 13.5, `.phase-fields label` 11 vs `.tools-lbl` 11.5 — three pairs that sit
within 200 px of each other and read as identical.

⚠️ **9 px goes to 10.** The two popover hints are the only things in the file that use 9 px, and it
is below the app's own smallest legible size everywhere else.

**Weights — three, each with a meaning.** 400 body and inputs; **500** interactive labels — buttons,
tabs, phase names (the app's dominant weight, 11 sites); **600** section headers, active states, and
the one emphatic status. Retire 700 from the chrome (it survives in the frozen month view, which is
why Inter 500 and 700 must both be embedded).

⚠️ Mantine's `fontWeights.medium` is **600**, not 500. The app's interactive weight is 500
throughout, so set it explicitly rather than reaching for the token.

**Line-heights — five tokens, three used in practice:** `xs` 1.3 for dense metadata, `md` 1.5 for
UI default (unchanged from `body` today), `xl` 1.6 for reading copy. `line-height:1` stays an
explicit override on icon buttons, not a token.

### 3b. Colour

**`primaryColor: 'navy'`**, one custom tuple anchored so today's accent is reproduced byte for byte:
`navy[6] = #2C3E50`, `navy[7] = #1C2833`. Mantine's `primaryShade` default is `{light:6, dark:8}`
and `-filled` / `-filled-hover` resolve to shades 6 and 7 — so the anchor points are exactly the two
the app already uses.

**`theme.colors.gray` is overridden with the app's warm neutral**, rather than adding a new name —
override the key `gray` and every Mantine component picks it up with no per-component config. Eight
of the ten slots are existing app values: `#F7F6F3` (`--bg`), `#EEECE5`, `#E3E1DA` (`--border`),
`#D9D7CE`, —, —, `#726F68` (`--text-muted`), —, —, `#1E1D1B` (`--text`). This matters because
Mantine's light-mode globals read `gray` for `dimmed`, `default-border`, `placeholder`, `disabled`
and `default-hover`; leaving Mantine's cool grey in place would put a cool neutral next to the app's
warm one everywhere.

**Three semantic tuples replace 16 hand-tuned hexes.** Amber appears today as **three near-identical
triples plus two strays** — `#FEF6E7/#F0D9A8/#7A5B14`, `#FFF4E5/#F0C36D/#7A5300`,
`#fff8e6/#f0d9a0/#8a5a00`, plus `#fffbeb/#f59e0b` and `#b45309`. Two of those borders differ by
**8/255 in one channel**. Blue appears as two triples. Collapse to `warn`, `info`, `danger`, each
anchored so `variant="light"` reproduces today's best-tested pair exactly:

| Tuple | shade 1 (ground) | shade 9 (ink) | contrast |
|---|---|---|---:|
| `warn` | `#FEF6E7` | `#7A5B14` | 5.86:1 |
| `info` | `#EDF4FD` | `#1B4A7A` | 8.22:1 |
| `danger` | `#fdf2f2` | `#B3261E` | 5.96:1 |

⛔ **Do not adopt Mantine's stock feedback colours.** Measured: `c="dimmed"` (gray-6 `#868e96`) on
the app's `--bg` is **3.07:1** against `--text-faint`'s **4.98:1** — and `--text-faint` carries a
comment recording that it was darkened from `#9C988E` *specifically to reach AA*. Mantine's
`--mantine-color-error` (red-6 `#fa5252`) is **3.28:1** against `--danger`'s 6.54:1.
`<Alert color="yellow" variant="light">` resolves to **2.69:1**; today's `.gap-banner` is 6.31:1.
Adopting the defaults would regress contrast in four places and silently undo a documented
accessibility fix.

**`--edit-accent` stays a raw custom property.** Do not make it a tuple. Mantine colour props accept
any CSS colour string, so `c="var(--edit-accent)"` works — and the manual-override purple has four
frozen consumers.

**Disabled states are unreadable today and become one system.** Five of them fail, three via opacity
compositing that hides the failure from a token audit: `button.primary:disabled` **1.81:1**;
`.tb-btn:disabled` at `opacity:.45` composites to **2.84:1**; **`.icon-btn:disabled` at `opacity:.4`
composites to 1.72:1 — and undo/redo are the most-used disabled controls in the app.** Replace the
opacity compositing with explicit `gray-5` ink at 2.41:1.

⚠️ Leave `.phase-row.phase-blocked{opacity:.45}` alone. It dims real schedule data, not a control,
and the right answer there is probably a different affordance, not a different alpha.

**Dark mode: no.** `<MantineProvider forceColorScheme="light">`. Not deferred — a stated non-goal.
The grid and both exports are permanently black-on-white documents that cannot invert, and finding 4
shows the frozen CSS reads the chrome's neutral tokens 39 times, so a dark palette would either
leave the calendar a white slab in a dark shell or change frozen output.

### 3c. Spacing, radius, elevation

**Spacing — 7 steps, all px.** `xxs 2, xs 4, sm 6, md 8, lg 12, xl 16, xxl 20`. Retire 1, 3, 5, 7,
9, 14, 18, 22, 24. Keep 28 px only as the page gutter, as its own `--page-inset` variable — it is
not a rhythm step.

⚠️ **Mantine's spacing scale starts at 10 px and offers nothing between 0 and 10**, while 71% of the
app's chrome spacing is ≤8 px. The scale must be overridden, not extended.

**Radius — 5 steps, laddered by object size**, which is the part that is missing today rather than
the values themselves: `xs 3` swatches and chips; `sm 5` in-track segments and small text buttons;
`md 7` **every standalone control**; `lg 10` **every container that holds controls**; `xl 14` the
help modal only. Today 6 px and 8 px each do double duty as *both* a container and a control radius,
which is why the hierarchy does not read.

**Elevation — 5 steps, and this is the clearest single win.** Five surfaces at the same conceptual
elevation — file menu, tool popovers, note popover, month-note popover, colour picker — carry
**three different shadows**, and one of them sits at `z-index:200` against its peers' 60, *above the
help overlay*. One `md` shadow for all five.

⚠️ **Mantine gives `Popover` and `Menu` no shadow at all by default** — `Popover.Dropdown` renders
`box-shadow: var(--popover-shadow, none)` and `shadow` is absent from both components' defaultProps.
`Modal` is the only overlay that ships one. Every popover and menu must be passed `shadow="md"`
explicitly or they will render flat.

**px, not rem, throughout.** Mantine's `rem()` emits `calc(<n>rem * var(--mantine-scale))`, but theme
values themselves are written to CSS verbatim — so px strings survive. Leave `theme.scale` at 1 and
never pass a bare number where a token is expected: numbers get `rem()`'d and scaled.

### 3d. Density — the constraint that decides component sizes

⚠️ **The Phases tab already overflows its scroll container by 2×**: at a 1200 px window its
scroll height measures 2,019 px against a client height of 1,005 px. The sidebar holds 35
date/number inputs plus 4 selects.

Mantine's `--input-height-sm` is 36 px against `--input-height-xs` 30 px. The app's current input
is **30.0 px measured**. So:

> **Every chrome form control takes `size="xs"`.** Set once via `theme.components.Input.defaultProps`,
> never per call site.

Taking Mantine's `sm` default instead would add **+6 px × 39 fields = +234 px** to a panel that
already scrolls twice its own height — against `HANDOFF.md` §6's rule that vertical space belongs to
the preview. Toolbar buttons take `size="xs"` (30 px, matching `.tb-btn`'s measured 30.5); sidebar
action buttons take `size="sm"`.

⚠️ There is a **second, undeclared input size** in the sidebar today — the episode rows and the
custom-holiday fields run at `padding:5px 7px; font-size:12.5px`, and `#custom-hol-date`'s inline
style beats the shared rule. Move them to the one size. If the episode list genuinely needs to be
denser, that is a *second, named* size declared once, not an inline style on two elements.

---

## 4. The one feedback system

**32 surfaces become 8 categories.** The rule that decides where a new message goes — four questions,
asked in order:

1. Must the user answer before anything happens? → **Destructive confirmation**
2. Did the thing they tried fail, or is a value unusable? One named control → **Inline field error**;
   otherwise → **Blocking error**
3. Does the text change as they work? No → **Explanatory copy**
4. What does it name? One control → **Inline hint/readout**. The calendar → **Advisory warning**.
   The app or the file → **Persistent strip**. An empty region → **Empty state**. Something that
   stops being true on its own → **Transient confirmation**. Something true until state changes →
   **Status readout**.

| Category | Today | Becomes | aria |
|---|---|---|---|
| Blocking error | 20 × `alert()` | one `Modal` via `showMessage({kind:'error'})` | `assertive` |
| Destructive confirm | 10 × `confirm()` | same `Modal`, `kind:'confirm'` | dialog role |
| Advisory warning | `.gap-banner`, `.ep-panel-warn`, `.show-info-flags` | `Alert variant="light" color="warn"` | `role="status"` |
| Inline field error | `#custom-hol-err`, `.phase-meta` error branch | `InputWrapper` **error** slot | none — announced on focus |
| Inline hint / readout | `.snap-note`, `.phase-meta`, `.show-info-note`, `.prod-total-empty` | `InputWrapper` **description** slot | none |
| Explanatory copy | `.placeholder-note` ×3, `.tools-hint`, both popover hints | `Text size="xxs" c="dimmed"`, **roman** | none |
| Transient confirmation | `.shift-readout`, `.tools-msg`, `flashSaveBtn` | unchanged in shape; unified type + `aria-live="polite"` | **polite — the biggest gap today** |
| Persistent strip | `#legacy-notice`, `#update-notice` | full-bleed `Alert radius={0}`, ids and aria kept | `role="status"` |
| Status readout | `.save-status` + 2 states | `Text` for saved/dirty; **`Badge`** for failed | `role="status"` |
| Empty state | `.empty-state`, `#holiday-vis-empty`, `.file-menu-empty` | `Text` in place; `EmptyState` for the preview only | polite on the preview one |

**Three decisions inside that table worth stating plainly:**

- **Retire italic from the app's feedback vocabulary.** It currently marks both explanatory copy and
  errors.
- **`#union-lock-hint` stops being a strip** and becomes the `InputWrapper` error on the region
  group — it names three specific controls, so it is a field error, not an advisory. The `alert()`
  that duplicates it is deleted: one sentence, one place.
- **"Autosave failed" leaves the status slot** and becomes a `Badge`. The one state that means
  something is wrong should be the one state with a shape.

**No toasts.** Do not add `@mantine/notifications`. Every message in this app is about a specific
control, and the one hand-rolled transient — `.shift-readout` — is deliberately anchored to the
control that produced it. Its `pointer-events:none` is load-bearing: a comment records that without
it, the readout swallowed a click aimed at *Reset Notes & Hiatus*.

---

## 5. Controls, and the date pickers

**The date pickers were the owner's explicit ask, and they carry the single biggest hazard in the
migration.** See §8.1 first.

> ⛔ **SUPERSEDED 29 Aug 2026 — see §2c.** `DateInput` is *also* a controlled component, and
> `applyStateSnapshot()` restores by writing `el.value` into every field by id. A controlled input
> ignores that write, so a saved date would silently fail to come back on open — while still saving
> correctly and passing every id-based assertion. **Every date field in the app is a native
> `<input type="date">`**, and the week-band affordance below needs re-costing on its own terms.
> What survives of this section: the *behaviour* it describes is still the right target, and
> `DatePickerInput` is still ruled out for the separate reason §8.1 gives.

~~**Verdict: `DateInput`, never `DatePickerInput`**, with `valueFormat="YYYY-MM-DD"` — non-negotiable,
not cosmetic. Applies to all six date families: phase starts, per-phase hiatus, all-phase hiatus,
custom holiday, and the two tool-popover dates.~~

**Monday-snapping moves into the picker.** Today it is a `.snap-note` afterthought printed under the
field *after* the user has already chosen. Instead: `getDayProps(date)` returns
`{inRange, firstInRange, lastInRange}` for the Monday–Sunday week of the current value, so the whole
week paints as a selected band with the Monday capped — and **every day stays clickable**. The
existing snapping behaviour is unchanged; it just becomes visible before the click instead of
explained after it. `firstDayOfWeek={1}` makes Monday column one so the band reads as a row.

**Union holidays and hiatus weeks get marked in the calendar** — `getDayProps` emits `data-holiday`
/ `data-hiatus`, and `renderDay` adds a 3 px dot rather than recolouring the number. **Mark, never
exclude:** a scheduler must be able to *choose* a date that lands on a holiday and see the
consequence, which is the whole point of the day-level Production simulation.

Absence of the week band is what will distinguish the single-day custom-holiday field from the six
week-snapped fields — a distinction that is currently invisible.

| Control | Today | Becomes |
|---|---|---|
| Region + season selects | 4 × `<select>` + inline styles | **`NativeSelect`** — never `Select` (§8.2) |
| Integer counts (9 fields) | `<input type=number>` | `NumberInput allowDecimal={false} allowNegative={false} clampBehavior="blur" hideControls` |
| Free text (3 fields) | `<input type=text>` + inline styles | `TextInput size="xs"` |
| Phase-name inline edit | `.phase-name-input`, `outline:none` | `TextInput variant="unstyled"` + **a real focus ring restored** |
| Checkboxes (4 families) | bare `<input type=checkbox>` | `Checkbox size="xs"` — one size, no exceptions |
| Hiatus "Lock in place" | checkbox + `title` | **stays a `Checkbox`** with a `description`, not a `Switch` |
| View toggle / sidebar tabs | hand-built button pairs | `SegmentedControl` **with an explicit `name`** (§8.3) |
| Holiday list | hand-built 3-column grid | `Table stickyHeader` in `Table.ScrollContainer` — **not** `Checkbox.Group` |

**Why the pin stays a Checkbox:** a Switch implies an immediate effect on a running thing. The pin
records a property of the hiatus that only matters later, when a shift tool runs. That is a checkbox.

**The inline-style duplication ends.** Of the seven repeated field recipes, six need no replacement
at all — the component supplies the styling — and only `#show-title` needs one.

⚠️ **Two of the seven are not dead copies.** `#shoot-days-per-ep` and `#num-episodes` carry inline
`font-family:inherit`, which out-ranks the `input[type=number]` mono rule — they render in Inter
today. Deleting those two inline blocks, or applying `ff="mono"` to every `NumberInput`, would newly
monospace two Show Info fields. Scope it out deliberately.

⚠️ **The custom-holiday name field is functionally zero-width on a small laptop.** The add row spends
190 px on fixed-width children (a 132 px date + the Add button + two gaps); at the sidebar's 280 px
floor the name input gets **16 px, of which 14 is its own padding**. Give the date `flex:1` and drop
the fixed width.

---

## 6. Overlays and layering

**The z-index ladder is re-based onto Mantine's**, which the chrome currently contradicts in one
place: `.phase-color-pop` sits at 200, *above* `#help-overlay`'s 70, so the colour picker can paint
over a modal.

| Tier | Members |
|---:|---|
| **100** | app header, sidebar tab strip, help FAB |
| **200** | help modal **and its backdrop** |
| **300** | every popover and menu, and the shift readout |

⚠️ **Mantine's `overlay: 400` tier is dead in 9.5.2** — `Overlay`'s default zIndex is
`getDefaultZIndex('modal')` = 200, and `getDefaultZIndex("overlay")` is read by no component in the
package. `Modal`'s backdrop inherits the modal's own 200 and the stack is resolved by DOM order
inside `ModalRoot`, not by a numeric gap. Do not design around a 400 tier.

The eight grid-internal values (1–7) inside `#table-wrap` are frozen and stay. ⚠️ But `.side-tabs`
at `z-index:6` is **chrome**, not a grid internal, and must be re-based with the rest.

**The riskiest item — anchoring a popover to a cell React does not own — is solvable.** Verified:

- `usePopoverContext` is **publicly exported** from `@mantine/core`, and its context value exposes
  floating-ui's `reference: (node) => void` setter. So a `<Popover opened>` with **no**
  `<Popover.Target>` can be pointed at a live `<td>` from an effect.
- `usePopover` wires floating-ui's **`autoUpdate`** — both as `whileElementsMounted` and explicitly
  while open. That is the ancestor-scroll and resize repositioning the app hand-rolls, for free.
- The default middlewares are `{flip: true, shift: true}`. `shift` is the window-clamping the app
  hand-rolls.

~~So `place()`, both scroll/resize listeners and the three clamp lines all delete.~~ ⛔ **THE
OPPOSITE WAS BUILT, DELIBERATELY, AND NONE OF IT DELETED.** Mantine's `Popover` was rejected for
these panels on two independent grounds, either fatal: it **portals by default**, which moves a
dropdown out from under `.tools-menu` — the ancestor test that is the *entire* mechanism keeping
eight id'd controls out of every saved file and every undo step — and it **mounts its dropdown from
an effect**, so the node does not exist when the engine collects it by id at evaluation time.
`legacy.css` carries a standing comment saying so. The hand-rolled `place()` and its capture-phase
scroll + resize listeners are load-bearing, and round 6 ADDED a second copy of them to
`.mv-note-pop`, which had never had any. **What does not delete** is the anchor re-resolution: `render()` rebuilds the grid, so the popover must key on
`{weekKey, isHiatus}` and re-find its cell after each render — which the app already does when
switching cells — rather than holding the node.

**Six things Mantine will not do for you**, worth writing down rather than rediscovering:

1. Document-level Escape for the four tool popovers — Popover's own Escape needs focus inside the
   dropdown.
2. Anchor re-resolution after every `render()` for both grid-anchored editors.
3. **Split commit-vs-cancel.** `onDismiss` fires identically for Escape and outside-click, but the
   app needs Escape = cancel and outside-click = **commit**. Set `closeOnEscape={false}` and handle
   it.
4. `clickOutsideEvents={['click']}` on the two note editors, to preserve today's event ordering
   against `mousedown`.
5. `Tooltip` defaults with `events:{hover:true, focus:true, touch:false}` set in
   `theme.components`, so focus-visibility cannot be forgotten per site.
6. Add the Mantine portal container to `buildSavedHtml()`'s strip list — or every shareable copy
   bakes in whatever overlay was open. *(This is the same class as the live `#legacy-notice` bug in
   `HANDOFF.md` §2h.)*

**Native `title=` tooltips convert selectively, not wholesale.** Keep native `title=` wherever it
reveals text the layout truncated — the file name, the holiday label, the phase label. ⚠️ **13
in-grid `title=` attributes are frozen**, not ten: `renderMonthView` and `renderSpreadsheetView`
emit them into `#table-wrap`.

⚠️ **The month-view note popover is never torn down by `render()` and never repositions.** The
orphan-guard tests `activeNoteEditor` only; `activeMvNote` appears in no guard, and
`openMvNoteEditor` registers neither a scroll nor a resize listener where `.note-pop` registers
both. That is a live bug this work would fix as a side effect — not a regression to introduce.

### 6a. ⛔ The grid's pointer budget, as an ordered total procedure

Six gestures now compete for the same pixels inside `#table-wrap`, and four of them live within 7px
of a column boundary. Written down because the next session **will** re-derive it wrongly, and
because two of these orderings were established by measurement after a plausible version broke
something else.

Resolution order over a phase cell — the browser decides steps 1–2 by `z-index` and
`pointer-events`, the code decides the rest by guard:

| # | Owner | How it wins |
|---:|---|---|
| 1 | **`.grid-swap-knob`** (column swap) | `z-index:8` layer, `pointer-events:auto`, and it **exists only while a swap-eligible selection is live**. 21px of one row, so it does not monopolise the seam. |
| 2 | `.span-preview` (7) → `.grid-resize.is-span` (6) → `.is-col` (5) → `.is-row` (4) | The frozen handle ladder. Everything else in either overlay is `pointer-events:none`. |
| 3 | the frozen `.grid-resize` `pointerdown` | Unchanged, and **self-guarding** on `closest('.grid-resize')` — so a knob never matches it. Zero contention, no z-index games needed. |
| 4 | the batch-expand marquee | Yields explicitly, in this order: `closest('.grid-resize')`, then `closest('.grid-sel-layer, .grid-swap-layer')`. |
| 5 | `dblclick`-to-fill (single cell and batch) | Untouched. A knob is not `.sheet-phase-cell`, and `hitCell()` returns `null` over one — otherwise a double-click on the knob would batch-expand the cell beneath it. |
| 6 | the note / hiatus editor opener | Untouched. A knob fails its `closest()` test. |

Four rules that are not obvious from that table:

- ⛔ **Never `preventDefault()` a `pointerdown` over a grid cell.** In Chromium it suppresses
  `mousedown`, `mouseup`, `click` **and** `dblclick` outright — it silently kills the note editor and
  double-click-to-fill. Suppress `selectstart` instead, and only for the life of the gesture.
  ⚠️ `selectstart`'s target is a **text node**, which has no `.closest`; hop to `parentElement` first
  or the guard never matches and the selection happens anyway.
- ⛔ **Never `stopPropagation()` from a document CAPTURE listener here.** The note editor commits on
  outside click via a document **bubble** listener, and `render()` discards an orphaned editor
  *without* committing it — so a capture-phase stop destroys uncommitted note text.
- **The `#table-wrap` click listener already `stopPropagation`s `td.sheet-note-cell` and
  `td.sheet-hiatus-cell`.** A new document **bubble** click listener is therefore silently deaf to
  note cells and per-phase hiatus bands — the failure that reads as "the gesture doesn't work on
  hiatus cells only".
- **`.sheet-phase-cell` is not proof the drag contract is present.** A per-phase hiatus band carries
  the class unconditionally and the `data-own/lmin/rmax/a/b/nphases` set conditionally. Test
  `Number.isFinite(+td.dataset.own)`.

Layer geometry, and why there are two overlays rather than one:

- `.grid-sel-layer` — `z-index:1`, `pointer-events:none`, `overflow:hidden`. Selection rects, the
  marquee, the drag ghosts, the amber collateral rects and the settle animation. **1, deliberately
  below the frozen sticky header** (`.sheet-table th` is `position:sticky; z-index:2`) so the overlay
  scrolls under the pinned Date/year/Notes row instead of painting over it.
- `.grid-swap-layer` — `z-index:8`, `pointer-events:none` with `auto` on the knob only. The knob and
  the swap chip. It exists **because** the layer above is capped at 1: `z-index:1` +
  `position:absolute` is a stacking context, and `.grid-resize.is-col` is `z-index:5`, 7px wide,
  **full table height**, centred on exactly the seam the knob must be centred on. A knob trapped in
  the selection layer is unclickable at its own centre. Since this layer paints *above* the header,
  its contents are clamped below the header's live bottom edge and dropped when the run scrolls
  behind it.
- Both are siblings of `.grid-resize-layer` inside `.sheet-grid-wrap`, so they inherit the grid's
  coordinate space, scroll with the pane in both axes, are clipped by it, and are absent from both
  print paths. `body.grid-resizing` hides both — frozen `repositionColHandles` moves the grid live
  and knows nothing about them.
- ⛔ `overflow:hidden` on both is **not cosmetic**: `.sheet-grid-wrap` is `width:max-content` inside
  an `overflow:auto` pane, so anything drawn past the grid's box extends the scroll extent — a
  scrollbar that appears and vanishes with the selection.

Chips stack **upwards** from the selection, never downwards: below, they covered the next week's
labels, and the swap knob is centred vertically on the selected run, so a chip across the middle of
it lands on the feature's primary affordance.

---

## 7. Responsiveness

> ⛔ **THIS SECTION WAS SUPERSEDED BY WHAT WAS BUILT (round 6, 31 Aug 2026). Read the "AS BUILT"
> block at the end before acting on anything above it.** Three of its prescriptions are not merely
> unbuilt — they are now known to be wrong for this app, and one of them would break the print paths.

~~**`AppShell` replaces the hand-rolled sticky layout**~~, with `AppShell.Header` / `.Navbar` /
`.Main`. `#print-root` stays a direct child of `<body>`, outside the React root.

⛔ **`AppShell` cannot be used and was not.** React mounts through `createPortal` into the static
skeleton precisely because a root that WRAPS the app defeats both print paths'
`body.printing-* > *:not(#print-root)` **child** combinators — the printed page comes out blank.
`AppShell` is a wrapper by construction. See MANTINE-SEAM §3.1; `main.jsx` says the same in its own
comment.

**Breakpoints keep Mantine's five names, with the app's real numbers:**
`xs 576, sm 768, md 1024, lg 1200, xl 1440`. `md` replaces the current 960 as the sidebar-collapse
point; `lg` replaces the unnamed ~1185 as the toolbar-density point.

~~**The header is made structurally incapable of wrapping**~~ — `Group wrap="nowrap"` with three
zones, and below `lg` the non-essential controls move into one overflow `Menu`.

⛔ **No overflow `Menu` was built, and the diagnosis behind it was wrong.** The header never wrapped
and never overflowed: its flex items **SHRANK**, so at 1100 px the labels read "Expor", "Exp",
"Rese". An overflow menu would also have fought the engine, which binds those buttons by id at
evaluation time and must never see them unmounted.

~~That is what lets `--header-h`'s runtime `ResizeObserver` be deleted~~ — ⛔ **the ResizeObserver is
KEPT and is load-bearing.** It still measures the header and writes `--header-h`, which the frozen
`.sheet-scroll{max-height:calc(100vh - var(--header-h) - 140px)}` reads. That is *why* the header was
allowed to grow to 63 px at all: the grid adapts because the value is measured rather than declared.
A hard-coded `--header-h` would silently mis-size the container holding the grid. The dev-only
assertion this paragraph asked for is unnecessary for the same reason — there is no declared number
to disagree with.

### ✅ AS BUILT — the header's responsive ladder (round 6)

The rule: **a label is never truncated.** Controls keep their natural width (`.app-toolbar > *` is
`flex:none`), the save-status readout is the only elastic element, and demand is reduced in
deliberate steps instead:

| Below | What gives up room, and why it is the cheapest thing to lose |
|---|---|
| **1320 px** | the file chip narrows 224 → 180 px — the widest single control, and the same name is inside the menu it opens |
| **1200 px** | the brand **name** hides; the mark stays, so identity survives |
| **1120 px** | New / Save As / the secondary export go **icon-only** with `title=` tooltips |
| **980 px** | the status text hides — the only thing here that is not a command |

**Save keeps its label at every width** (it carries the engine's "Saved ✓" flash confirmation) and so
does the primary export. Verified at 1440 / 1280 / 1150 / 1024 / 900: zero clipped labels, zero
overflow, `--header-h` 63 px throughout.

**The preview toolbar keeps its two highest-frequency controls at every width** — the Waterfall/Month
toggle and the Shift All arrows, which are deliberately one-click. Below `lg` the three labelled
popover buttons collapse into one *Adjust ▾* menu.

⚠️ **Sidebar internals must be keyed to the sidebar's width, not the viewport's.** Measured, the
sidebar's width is **non-monotonic in the viewport**: the holiday-row label is 83 px at a 1024 px
window and 484 px at 960 px — the sidebar is at its narrowest one pixel before it goes full width.
Every viewport media query written for a sidebar internal is keyed to the wrong quantity. Use
container queries inside `AppShell.Navbar`.

**Below 960 px the frozen `.sheet-scroll` box hangs 392–434 px below the fold** — because stacking
the sidebar above the preview pushes the grid down while its `max-height` still assumes it starts
under the header. The fix is not to touch the frozen rule: below the navbar breakpoint the sidebar
becomes a Burger-toggled overlay, so `AppShell.Main` always starts directly under the header. Treat
*"the grid's top edge is header + ~140 px from the viewport top"* as a written, testable invariant.

**Declare the supported range and stop pretending:**

> **1200 px is the design target. 1024 px is the fully supported floor. 768 px is
> degraded-but-working. Below 768 px is explicitly unsupported.**

Nobody builds a production calendar on a phone. Engineer `md` and `lg` properly; treat `sm` as "must
not break, must not be pretty"; do nothing for `xs` beyond preventing horizontal overflow.

---

## 8. ⛔ Seven verified traps

**Every one of these was a decision that looked right and was wrong.** They were caught by reading
the installed Mantine source, not by reasoning about it. Each would have broken the save format or
the frozen surface silently.

### 8.1 `DatePickerInput` would destroy every saved start date

`DatePickerInput`'s factory declares `ref: HTMLButtonElement`, and `PickerInputBase` renders
`<Input component="button" type="button">`. Its only `<input>` is `HiddenDatesInput`, which accepts
`value`, `name`, `form`, `type`, `withTime` — **and no `id`**.

`collectFieldValues()` selects `input[id], select[id], textarea[id]`. So every `start-<phase>` key
would match **nothing** and vanish from `fields.byId` — not saved wrong, **saved not at all**. Every
start date in every calendar saved after that port would be lost on reopen.

`DateInput` declares `ref: HTMLInputElement` and spreads `inputProps` (which carry `id`) onto a real
`<input>`. **Use `DateInput`.**

⚠️ And `DateInput`'s **default `valueFormat` is `"MMMM D, YYYY"`** — it renders that formatted string
as the input's `value`, and `collectFieldValues()` stores `el.value`. Left at the default, saved
files would carry `"August 29, 2026"` where `parseDateUTC` expects `2026-08-29`.
**`valueFormat="YYYY-MM-DD"` is a correctness requirement, not a style choice.**

### 8.2 `Select` puts the option *label* in the id-bearing input

`Select` passes `id` to a visible **text input** whose value is the search/label string; the real
value lives in a separate hidden input reachable only through `hiddenInputProps`. So
`id="union-country"` on a `Select` would write **`"United States"`** into `fields.byId` instead of
`"US"`, and `normalizeRegionSelection()` would see an unrecognised value on restore.

`NativeSelect` renders a real `<select>` with `ref: HTMLSelectElement`. **Any control whose id is in
`fields.byId` takes `NativeSelect`. `Select` / `Autocomplete` / `Combobox` are ruled out for those
four ids.**

### 8.3 Omitting `id` does not produce an id-less element

`InputWrapper` calls `useId(id)` **unconditionally** and publishes the result through context;
`Input` renders `id: ctx?.inputId || id` with `withAria` defaulting to true. `useId` returns the
static id only when it is a string — otherwise a generated one.

So **every** `TextInput` / `NumberInput` / `NativeSelect` / `Textarea` renders an `id` on the real
focusable element, **randomly generated and re-rolled per page load** when none is passed. Same for
`Checkbox` (`const uuid = useId(id)`) and `SegmentedControl` (which needs the id for its label's
`htmlFor`, so there is no way to suppress it).

`collectFieldValues()` would sweep all of them into `fields.byId` **and the undo stack**, under keys
that change every session. Affected: the ~75 holiday-list checkboxes, the note-popover selects and
textarea, the hiatus rows, the episode rows, and 5–6 `SegmentedControl` radios.

**This is the exact bug the code comments say was deliberately avoided.** The fix must be chosen
*before* any Mantine input is placed in those places: either pass a stable `name`/`id`, or widen
`collectFieldValues()`'s skip test — and ship that guard **in the same change** as the component
swap.

### 8.4 `Popover` portals by default, defeating the `.tools-menu` escape

`withinPortal: true` is in `Popover`'s defaultProps. The four tool popovers' **eight** id'd controls
are kept out of every saved file by exactly one test — `el.closest('.tools-menu')` — and portalling
moves them out from under that ancestor.

**Every tool Popover must carry the class on its dropdown**, not on a wrapper:
`classNames={{ dropdown: 'tools-menu' }}`.

⚠️ Secondary effect: `keepMounted` defaults to false, so a closed popover's controls leave the DOM —
which silently changes what a snapshot contains depending on whether a popover happened to be open.

### 8.5 `Input.Wrapper`'s id *wins* over the inner input's

The intuitive defence — give the wrapper a different id so the inner input keeps the real one — is
backwards. `InputWrapper` sets `inputId` from its own `id` prop and publishes it; `Input` renders
`ctx?.inputId || id`. So `<Input.Wrapper id="wrap-start-post"><Input id="start-post"/></Input.Wrapper>`
renders an input with **`id="wrap-start-post"`**.

**Pass the real id to the component** (`<TextInput id="start-post">` routes it to both wrapper and
input), and the error/description ids derive from it automatically.

### 8.6 Mantine's baseline reaches inside `#table-wrap`

The reassuring grep — no `table`/`td`/`th` selectors in the baseline — is necessary but not
sufficient. `baseline.css` also carries `input, button, textarea, select { font: inherit }` and
`button, select { text-transform: none }`, and **five real `<button>` elements live inside
`#table-wrap`**, all emitted by the frozen renderers: `#mv-hdr-mode-btn`, `#mv-prev`, `#mv-next`,
`#notes-reset-btn`, `#hdr-mode-btn`.

`font` is a **shorthand**, so it resets `line-height` too — and those rules set `font-size` and
`font-family` but not `line-height`. Measured on an isolated repro: **+3 px of button height**, with
the `@layer` fence in place, because the fence only helps where the app declares the same property
and here it declares nothing.

⚠️ **A `@layer` is a cascade-priority guarantee, not a matching guarantee.** The proposed assertion
"no element inside `#table-wrap` matches `[class*='m_']`" would have **passed while this shipped**,
because the baseline uses type selectors, not Mantine's hashed classes.

Two corrections to how this hazard was first framed:

- It is **screen-only**. Both affected toolbars are stripped from print —
  `#print-root .mv-tools{display:none!important}`, and the waterfall print path removes `.hdr-tools`
  in JS.
- The hazard that **does** reach the month PDF is the quieter one: the baseline sets `body`
  line-height to 1.55 against the app's 1.5, which reaches `.mv-daynum` and therefore
  `exportMonthPdf`. **The fence fixes that one.** Fix the button one with an explicit declaration.

Also: `theme.fontSmoothing` defaults to **true**, applying `antialiased` to `body`, which inherits
into `#table-wrap`. Glyph *metrics* are unchanged — so `measureTextPx` and the 3.75 px budget are
safe — but the on-screen appearance of the frozen waterfall changes. Set `fontSmoothing: false`.

### 8.7 ~~There is no build system to import CSS into~~ ✅ There is one, and the CSS is per-component now

`styles.layer.css` is **273,442 bytes**; the ten per-component files this design needs total
**26,276**. But the deeper point is that the app has no import graph — the CSS has to be pasted into
the single `<style>` block with the `@layer mantine { }` wrapper preserved by hand.

Restate the decision in the terms the app actually has: paste per-component layered CSS into the one
`<style>` block, keep the wrapper on every chunk, declare `@layer mantine, app;` first, and add a
grep assertion to `tools/check-refs.py` that the block contains no unwrapped Mantine ruleset.

**And decide explicitly whether the size increase is acceptable for the "email it around" property**
— that is an owner question, not an engineering one.

---

## 9. Not decided — these need an owner ruling

Each of these looked like a design decision and turned out to be a change to frozen code or frozen
output. None should be built on a guess.

**9.1 — ✅ RULED YES AND BUILT (round 7).** Inter is embedded as one variable woff2 (latin) in
`src/styles/inter.css`, regenerated by `tools/fetch-inter.py`; the Google Fonts link and both
preconnects are gone and the app fetches nothing external. **The gate was met by measurement**:
canvas text widths at 400/500/600/700 came out byte-identical to the Google-served statics, so
`mvNoteLineCount`'s input never changed, and with no request left network state cannot be a
variable. ⚠️ Nobody has exported a month PDF before-and-after, so the literal diff below is still
unrun. The original reasoning, which is what made this a ruling rather than a task:

**Embedding Inter changes a frozen export's output on offline machines.** Via
`mvNoteLineCount` → `place()` → month-view row heights → `exportMonthPdf`. Embedding standardises
the measurement to Inter *always*, which is byte-identical to today's **online** behaviour and a
real, visible change to the month PDF on any machine that is offline, behind a network that blocks
Google, or opening an emailed copy from `file://`. **Recommended: do it** — it is what the embedded
Carlito exists to do — but as a frozen-export change with the gate the project's own rule demands:
a pre/post month-PDF diff produced with the network **on** and **off**.

**9.2 — `.gap-banner` is written by `render()`, which is frozen.** The container `#gap-warning` is
free; the content is not. Converting it to an `Alert` means either editing `render()` or leaving it
writing raw HTML into a container React owns. **Safe fallback: retokenise the `.gap-banner` CSS in
place** — that achieves most of the visual win with no frozen edit.

**9.3 — `.phase-meta` splitting into description + error slots** has the same problem, and the aria
wiring is the entire justification. Without a ruling, that benefit is unavailable.

**9.4 — `.empty-state` lives inside `#table-wrap`** and is written by `render()`. Recommended
resolution: hoist it out into a sibling in the preview panel so the frozen container is only ever
the grid. Gate: the rendered grid HTML for a *populated* schedule must be byte-identical, since only
the empty branch is touched.

**9.5 — `.mv-note-pop`** was a genuine collision in the rules themselves: it matches the frozen
`.mv-*` pattern and sits inside the frozen CSS band, but it is a body-level popover and the owner's
instruction puts panels anchored to the grid in scope.
✅ **RULED IN SCOPE by the owner (29 Aug 2026) and BUILT (round 6).** It now wears the shared overlay
look, and the live bug this document flagged in §6 is fixed: it tracks its anchor on capture-phase
scroll + resize like its waterfall twin, and gets the twin's rebuild protection from a
**MutationObserver on `#table-wrap`** — deliberately *not* by mirroring the twin's guard, which lives
inside frozen `render()`. Observing mutates nothing. ⚠️ The note's rendered size, wrapping and shrink
behaviour back in the cell were not touched and must not be; the frozen `renderMonthView` still emits
its anchor.

**9.6 — The single-file size budget.** ✅ **Settled by building it.** The projection was ~1.0–1.15 MB
(`MANTINE-MIGRATION.md` §3) and the build landed at 1,096 KB with the full stylesheet. Round 7 then
took the per-component CSS (26 files, not the 273 KB bundle) *and* added the embedded font, and the
file came out at **983 KB** — smaller than before, with one fewer network dependency.
⛔ **The per-component import ORDER is derived from Mantine's own `styles.layer.css` and must never
be alphabetised**: they share one `@layer`, so order decides, and sorting it put `UnstyledButton`
after `Button`, whose reset then stripped every button in the app of its background, border and
padding. Add a file whenever a component **or a state** is added — Badge, Loader and Tooltip are in
the list for states no click can reach.

---

## 10. Acceptance gates

Nothing in this document ships without all of these, every stage:

1. **Horizontally clipped-cell count stays 0.** Horizontal, not vertical — vertical overflow is
   deliberate. `tests/harness` measures it.
2. **Waterfall PDF diffs clean** against a pre-change export (`tests/harness/pdf-info.js`).
3. **Excel opens with no corrupt-file alert** (`tests/harness/check-xlsx.sh`).
4. **`tests/fixtures/v1.0.0-saved.html` restores identically.**
5. **NEW — `fields.byId` key-set is byte-identical** before and after any control swap. This is the
   gate §8 exists for, and no current test covers it. Assert element **ids** specifically, not that
   keys resolve.
6. **NEW — no `/^tool-/` key appears in `fields.byId`** with each of the four tool popovers open,
   and opening/closing a popover adds **no** undo step.
7. **NEW — computed `line-height`, `font-size` and `padding` of the five in-grid buttons and a
   `td.sheet-note-cell` are unchanged** after mounting Mantine. A positive before/after comparison,
   not a negative "no `m_` class" assertion — §8.6 explains why the negative one passes while the
   bug ships.
8. **NEW — month PDF diffed with the network on and off**, for §9.1 only.

---

## 11. Build order for the chrome

Unchanged from `MANTINE-MIGRATION.md` §6 in shape; this document is what Stage 2 produced.

> ⚠️ **SUPERSEDED by what was actually built. `HANDOFF.md` §2b-3 is the live status and the live
> order.** Recorded here because the *reasoning* still reads correctly, and because the two places
> the plan diverged are worth knowing:
>
> - **Stage 3 (the Settings menu) was skipped, not forgotten.** Its whole justification was proving
>   the provider, theme, CSS layering and build pipeline on something small. Stage 1 proved all four
>   on the real app, so Stage 3's proving value was already spent. The owner's §2b ask still stands
>   and is still unbuilt.
> - **`collectFieldValues()` did NOT die**, which this table assumed it would. It survives untouched,
>   and that is what kept the save-format contract out of the migration's blast radius entirely —
>   see §2c. Every Mantine input carries its real id and is uncontrolled.

| | | Depends on |
|---|---|---|
| **Stage 3** | Settings menu, first Mantine surface — proves provider, theme, layer fence, build | §8.6, §8.7 |
| **Stage 4** | Sidebar — where `collectFieldValues()` dies and §8.1–8.5 all land at once | **§8.3 decided first** |
| **Stage 5** | Header, preview toolbar, popovers, help | §8.4, §6 |
| **Stage 6** | Measure, calibrate, document | — |

⚠️ **§8.3 gates Stage 4 and is not an implementation detail.** Whether Mantine inputs may carry
generated ids has to be answered before the first one is placed in a hiatus row, an episode row or
the holiday list — not discovered afterwards, when saved files already carry the junk keys.
✅ Answered in practice: **pass the real id to every Mantine input**, and use no component that mints
hidden id'd inputs of its own — which is why `SegmentedControl` is ruled out for the view toggle
(a radio per segment, each with a generated id, outside any `.tools-menu`).
