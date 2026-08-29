# SPT Planning Calendar Builder

A TV production scheduling tool. Phase start dates + durations in, and out comes a week-by-week
waterfall calendar, a month calendar, an Excel workbook and a printable PDF.

**Live:** <https://greicher1.github.io/planning-cal-builder/>
**v1.0.0 (frozen):** `releases/v1.0.0.html` — also reachable at
<https://greicher1.github.io/planning-cal-builder/releases/v1.0.0.html> **once this commit and the
`v1.0.0` tag are pushed.** Until then the copy is local only; `git push && git push --tags`.

One self-contained `index.html`. No build system, no package manager, no server. Open the file and
it runs.

**Browser:** use **Chrome or Edge.** A calendar will *open* in any modern browser, but saving in
place — writing back to the same file, the recent-files list, autosave — needs the File System
Access API, which only Chromium browsers have. In Safari or Firefox, Save falls back to downloading
a new copy each time, and printing has not been tested.

**For contributors and agents, the reading order is:** [`HANDOFF.md`](HANDOFF.md) →
[`CLAUDE.md`](CLAUDE.md) → [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md).

---

## Changelog

This project versions the **built app**, not the repo. A version is cut when the app changes in a
way a user would notice or a future session would need to return to. See
[`CLAUDE.md`](CLAUDE.md) → "⛔ Changelog every substantial change" for when and how.

<!-- Newest first. Add new entries directly under this line. -->

### Unreleased — round 6: fit and finish, and the note editors join the family

⚠️ **Not deployed and not cut as a version.** The owner's sixth review round (HANDOFF §2b-3
rows 34–39), plus the first slice of the standing backlog. The five fixes:

- **New / Save / Save As are equal at the longest button's own size** — a grid wrapper whose
  `1fr` auto-columns all size to the largest content (Save As defines the set at its natural
  padding), replacing round 5's hardcoded 104px. Measured 86/86/86.
- **The file chip trimmed 20%** (280 → 224; the dropdown stays 280).
- **The holiday table's header stopped colliding** — the three note columns widened to 46/46/44
  (header and row cells in lockstep) and the uppercase tracking came off the cell labels;
  "W'FALL NOTE" and "MONTH NOTE" now read as two columns instead of one jam.
- **The "Complete Show Info" warning reads as a sentence again.** The chip was `display:flex`,
  which turns the message's text-plus-`<strong>` into three independently-wrapping anonymous
  flex items — the odd columns in the owner's screenshot. Block layout with the glyph absolutely
  positioned fixes both of the engine's messages with no engine change.
- **The shift readout lands under the button that acted** — `runShift` stamps the direction on
  the group and CSS anchors "1 wk earlier" under ← and "1 wk later" under →. Verified by
  geometry both ways.

And from the backlog, **the note-popover stage (§9.5, ruled in scope) landed its core**: both
note editors wear the app's one overlay look (the file-menu/date-picker shell, token type,
chevroned Day/Size selects, 16px swatches with the primary-colored selected ring), and the
month-view editor's live bug is fixed — it now tracks its anchor on scroll and resize like its
waterfall twin, and a MutationObserver on `#table-wrap` gives it the twin's rebuild protection
*without* touching frozen `render()` (where the twin's guard lives): a rebuild re-finds the
equivalent anchor and follows it, or closes without saving. Verified live: a resize re-glues the
popover at 4px; a sidebar edit that rebuilt the grid under an open editor re-anchored it. The
note's rendered size, wrapping and shrink behaviour back in the cell are untouched — the frozen
gate run confirms it.

### Unreleased — round 5: Load, the loader-look pickers, and one icon everywhere

⚠️ **Not deployed and not cut as a version.** The owner's fifth review round, logged item by item
in HANDOFF §2b-3's master list (rows 27–33) and built the same day. What a user notices:

- **The dialogs breathe.** The app's own warning dialogs were rendering with 8px of side padding —
  `Modal` pads with the `md` *spacing* token, and the chrome's density scale redefines `md` from
  16px down to 8px, silently halving every modal's padding. Fixed once, in the theme's
  `Modal.defaultProps` (`padding:'xxl'` = 20px). Measured 8 → 20px.
- **"Open" became "Load" everywhere a user reads it** — the file-menu item, the dirty-work
  confirm ("Load another calendar?"), the permission and error alerts, the legacy-notice strip,
  and the help guide — completing the round-3 terminology rule (saving = write `.sptcal`, loading
  = open a file into the PWA). Identifiers and the `data-action="open"` engine contract
  deliberately did not change. The help's Save paragraph also stopped claiming Save writes a full
  copy of the tool — that has been `.sptcal` since v1.1.0.
- **The tool popovers' pickers look like the loader.** The phase pickers under Shift From /
  Anchor To / Rebuild From (and Anchor To's starts-on/ends-by) no longer open the OS select popup:
  `SelectPop.jsx` overlays the native selects with the file menu's look — white panel, accented
  current row, dimmed right-aligned dates. The native `<select>`s stay exactly as they were
  (`fillPhaseSelect` still owns their options; handlers still read `.value`; write-back is the
  native setter + real events — verified by watching a pick move the anchor date, and by a full
  Anchor To run through a picked phase). The panel deliberately lives *inside* `.tools-menu`: the
  engine closes all tool popovers on any click outside them, so a body-level panel would shut the
  popover on every pick.
- **The header settled.** The file chip is a fixed 280px (shows much of a real title, never
  resizes), "Save As…" lost its ellipsis (in the chrome *and* in `flashSaveBtn`'s restore string,
  which would have flashed it back), and New / Save / Save As share one 104px min-width.
- **One icon, everywhere.** The header brand mark now *is* the favicon — the red calendar tile —
  and both are instances of one source (`src/chrome/appIcon.js`); the head links carry
  placeholders that main.jsx fills at startup. The installed-PWA manifest icons and the red
  `theme-color` stay as they were, flagged as their own decision.
- **The help guide animates in** (fade + rise, 0.22s) — keyframes on the existing `.open` class,
  since a transition cannot fire across display:none; reduced-motion honoured.
- **More air between the sidebar fields** — the card stacks moved from 8px gaps to 16px.

Verified in the dev server and in the built `dist/index.html` (zero console errors; `--header-h`
unchanged at 63px; Escape closes the picker first and the popover second). **Full gate PASSED**
against `tests/baselines/2026-08-29-stage-7`: 0 horizontally clipped cells, waterfall PDF
byte-identical, every Excel part identical, `v1.0.0-saved.html` restoring to 52 rows / 154 cells /
324 pt with `fields.byId` identical at 56 ids. (One gate run first FAILED on the restore leg's
documented IndexedDB stall — it passed standalone and on a quieter re-run, exactly per the
HANDOFF §2b-3 diagnosis note.)

### Unreleased — round 4: the app's own dialogs, and the polish pass on the polish

⚠️ **Not deployed and not cut as a version.** What a user notices most: **the browser-chrome
popups are gone.** "Start a new blank calendar?", Reset All, removing a phase / hiatus / custom
holiday, the holiday-reset and recompute warnings, and recovery prompts are now the app's own
Mantine dialogs — titled, centred, with the destructive action as a red filled button, and Escape
or clicking outside always answering the safe way. Error alerts in the save/open/share/export
handlers follow. Under the hood the bridge's `dialog` entry deliberately falls back to the NATIVE
dialogs if the chrome ever fails to mount — a silent auto-confirm on a destructive action being
the one unacceptable failure. ⚠️ Eight `alert()` calls remain native on purpose: they live inside
the frozen export functions, and converting them is a frozen edit that needs its own ruling.

Also in this round, from the owner's screenshots: the episode warning chip got real padding and
line-height; **holiday rows split name and date onto two lines** (date smaller and lighter); phase
chips got more side padding; and the remove × plus undo/redo glyphs are now geometrically centred
— the × is drawn (a mask over `currentColor`, so the red hover still works) instead of a text
glyph that sat on a baseline. HANDOFF §2b-3 now carries the reconciled **master list** of every
request in the redesign arc with per-item status.

### Unreleased — round 3: chips crowned, warnings diegetic, terminology settled

⚠️ **Not deployed and not cut as a version.** The owner's third review round, itemised in
HANDOFF §2b-3 and built the same day. What a user notices: every phase chip is crowned by its
**color bar** (the full-width clickable strip is the same color changer, conforming to the chip's
corner radius) with a visual grab handle beside the name (reordering itself is deliberately not
built — it is save-format territory); the production episode warning reads as a real warning with
a drawn glyph on the amber tuple; the phase date/duration readout sits on **two rows**; remove ×
buttons centre their glyph and go red on hover; undo/redo wear drawn glyphs; the tool popovers'
phase pickers wear Mantine's chevron; **"Autosave needs a file" shows as the red badge**; the file
menu searches "**loaded** files" (new house terminology: *saving* writes a `.sptcal` locally,
*loading* opens a `.sptcal`/`.html` into the PWA); and sharing a copy moved to **Settings ▸ App ▸
Export App With Data**. Under the hood: a 600 ms accidental-retrigger guard on New / Save As /
Share / both exports, and label/text-size parity rules so Show, Settings and Phases cannot drift.

⚠️ **One line of this round is the project's first deliberate frozen-function edit**, made at the
owner's direction: the two-row readout changes one separator (` · ` → newline) inside `render()`'s
meta branch. `meta-<key>` is a write-only sidebar element no export reads, and the full gate —
waterfall PDF byte-identical, Excel parts identical, v1.0.0 restore, 56 ids — passed after it.
Also answered this round: the export filename convention is untouched, and the all-phase hiatus
never had a sidebar name field (band labels are edited on the band itself, in the calendar).

### Unreleased — the visual redesign rounds: header, navbar, blocks, split control, date pickers

⚠️ **Not deployed and not cut as a version** — same standing as the entries below. Everything here
was driven live by the owner across three review rounds on 29 Aug 2026, each verified against the
full gate before the next round started (waterfall PDF byte-identical, Excel parts identical, the
v1.0.0 fixture restoring to 52 rows / 154 cells, `fields.byId` at 56 ids, 0 clipped cells).

**The design direction, settled by iteration.** A DoubleNavbar icon rail was built to the
ui.mantine.dev reference, reviewed, and **reverted** on the owner's verdict — the horizontal
icon+label tabs won, on a white sidebar panel that now fills to the bottom of the viewport. What
stayed from that round: the thicker header (51→63px — safe because `--header-h` is measured, not
assumed) led by an **"SPT Planning Calendar"** brand mark, iconed buttons throughout (hand-drawn
inline geometry, no icon package), the right-aligned export pair with the filled **Export PDF** at
the row's end, a red-text Reset All isolated past a divider, and press/caret micro-animations
adapted from the ui.mantine.dev buttons category.

**The owner's seven-point adjustment round, all landed:** Install-as-app above the switchers; Show
info / Region / Holidays content in the **same bounded white blocks as the phase rows** (one shared
`.side-block` recipe); no more pure black — `theme.black` is the warm `#1E1D1B` the app's own scale
tops out at, and input text dropped to 12px in the 30px box (the "Reset All ratio"); Waterfall and
Month segments equal width and centred; **Shift All rebuilt as a joined split control** at the
toolbar's shared height whose centre *is* the dropdown trigger; breathing room before the save
status; one rhythm for the file menu.

**The pop-out date pickers** (owner-selected feature): every sidebar and tool-popover date field
opens a Mantine-styled calendar — the **Monday-snap week band** made visible before the click
(hover previews the week, the Monday is capped), enabled union holidays dotted red and all-phase
hiatus weeks dotted amber ("mark, never exclude"), single-day mode for the custom-holiday field.
Hand-rolled deliberately: Mantine's DateInput is controlled and would silently break restore
(UI-CONVENTIONS §2c); this popover instead writes through the native setter exactly like a
keystroke, carries no ids anywhere, gets its marker data pushed through the bridge
(`chrome.dateContext`), and is stripped from shareable copies by class.

**File menu restructured:** Open… pinned to the top, an id-less search box under it (deliberately
NOT a Mantine input — those mint random ids that would leak into every saved file), only the
recents list scrolls, and **"Export shareable copy" split out of the menu** to its own
document-delegated button.

**Two fixes along the way:** the two dead-listener conditional-render bugs (Save As…, Export
Waterfall to PDF) documented in the entry below were fixed at the start of this arc, and the
engine's export-button labels were shortened at their push site with the icon following the
engine's `primary` flag so the Month-view button truthfully shows a download glyph.

**Verified but worth restating:** the export filename convention is untouched — the workbook still
saves as `<Show Title> Planning Calendar.xlsx`; only button labels changed.

### Unreleased — the engine-generated sidebar rows: restyled to spec, deliberately not rebuilt

⚠️ **Not deployed and not cut as a version** — same standing as the entry below; the root
`index.html` and the live site are still v1.2.0.

**The decision first, because it shapes everything after it.** The phase rows, per-phase hiatus
blocks, all-phase hiatus rows, episode rows and the holiday list are generated by the engine as
HTML strings, and those generators mint the element ids that ARE the save-file format. Asked
whether to rebuild them as React components or restyle them in place, the owner chose **restyle to
spec** (29 Aug 2026, the recommended option). The deciding finding: the settled uncontrolled-input
rule means a React rebuild renders the same native inputs CSS already styles — near-zero visual
gain — while the restore path (`applyStateSnapshot` rebuilds rows, re-keys ids and writes values
in one synchronous tick) and undo/redo would sit squarely in the blast radius, and the acceptance
gate covers none of the custom-phase path a rebuild most endangers.

**What changed for a user:** the last visibly-legacy controls now match the Mantine chrome. Every
sidebar checkbox (hiatus locks, per-phase hiatus toggles, holiday enable/note boxes, sim-post) is
drawn as Mantine's Checkbox — primary fill, white check — instead of a native accent box; native
number-spinner arrows are gone (every count is typed, not stepped); the holiday rows dropped ~7
inline style declarations each for one stylesheet block in the ui.mantine.dev table idiom; the
episode inputs lost their private second input size; the "+ Add phase" / "+ Add hiatus period"
buttons stopped being beaten by a leftover legacy rule that had silently outranked their Mantine
restyle the whole time; the × remove buttons stopped rendering their glyph in Arial; and the last
IBM Plex Mono references went — the readouts now use the system mono stack and the Google Fonts
request is Inter-only.

**Two real bugs fixed in the Mantine build, both the same shape:** `Save As…` and
`Export Waterfall to PDF` were rendered *conditionally* by React, but the engine captures both by
`getElementById` at evaluation time and binds their click listeners through that capture. Save As
started invisible, so its capture was null and the button appeared later fully dead; the export
button started visible, so it worked — until one Month↔Waterfall round-trip remounted a new node
and orphaned the listener. Both are now always rendered with visibility carried by
`display`, the same rule `#file-menu-wrap` already documented. Verified in a real browser: the
export button is the identical node after a round-trip, and Save As is present at load.

**What was verified** (all against the built `dist/index.html`): the full gate passes — waterfall
PDF byte-identical, Excel parts identical, 0 horizontally clipped cells, the real v1.0.0 calendar
restoring to 52 rows / 154 cells / 324 pt with `fields.byId` unchanged at 56 ids, 0 console
errors; a hand-run `fence.js` diff shows every frozen `#table-wrap` computed style identical
between the deployed page and the build; and in a live browser: custom phase add mints
`name/start/weeks/phiatus-*-custom1` correctly and remove works, hiatus rows add/remove, holiday
note toggles re-render and apply, and the sim-post block behaves.

**Harness honesty fixes:** `gate.sh`'s header claimed it ran the fence (it never did — the comment
now says to run it by hand and how); its lost/gained id diagnostic was dead code behind a
wrong-type guard and now prints lost/gained/changed ids on a `fields.byId` failure; and the
date-pinned baseline is now called out in the header — the Excel/PDF legs false-fail from any date
after 2026-08-29 because both embed the export date.

### Unreleased — the Mantine chrome: build, header, preview toolbar, sidebar

⚠️ **Not deployed and not cut as a version.** The live site and the repo's `index.html` are still
v1.2.0 and are byte-identical to `releases/v1.2.0.html`. This work builds from a new `src/` into
`dist/index.html` and deliberately leaves the root file alone — `main` auto-deploys it, so a
source-only `index.html` at the root would break the live site the moment anyone pushed.

**What changed for a user:** the app looks like a different application, and behaves like the same
one. The header, the preview toolbar and the sidebar are rebuilt on Mantine — real keyboard
navigation and Escape in the file menu, one button system instead of six looks, one field system
instead of 166 hand-written inline style declarations, and every phase reading as its own card.
The calendar itself — the waterfall, the month view, both exports — is untouched, deliberately and
verifiably.

Three real bugs fell out of the work: the custom-holiday **name field was functionally zero-width**
on a small laptop (16 px, of which 14 was its own padding); undo and redo were the app's two
most-used disabled controls and the *worst* contrast in the file at 1.72:1; and IBM Plex Mono was
being downloaded at two weights for eight sites that all render at 400.

**Why a build step at all.** React + Mantine cannot be pasted into a single file; the owner priced
that trade on 29 Aug 2026 and chose the minified build (~1.1 MB against today's 667 KB, 307 KB
gzipped) plus a GitHub Action to publish it. The single-file property survives — `dist/index.html`
is still one self-contained document that runs from `file://` — but the *shipped* file is no longer
readable source. That matters less than it used to, because Save has written 4.5 KB of `.sptcal`
JSON since v1.1.0 rather than a copy of the app.

**What is frozen and stayed frozen.** The waterfall grid, the month view, the width model and the
Excel/PDF writers are untouched. The verification is the point, not the claim: the waterfall PDF is
**byte-identical**, every part of the Excel workbook is identical (excluding its timestamp), a real
v1.0.0 saved calendar restores to the same 52 rows / 154 cells / 324 pt grid, `fields.byId` carries
the same 56 ids, horizontally clipped cells stay at 0, and every computed font, padding and box
metric inside `#table-wrap` is unchanged.

**Why the first attempt still looked old, which is the most useful thing here.** Porting the header
and toolbar changed almost nothing visible, because the sidebar is most of what you look at and it
had not been touched — and because its three cards carried **38 inline `style=` attributes, 166
declarations**, hard-coding a border, radius, padding and font-size onto every field. An inline
style beats every stylesheet rule, so no amount of restyling could reach them; only replacing the
markup could. The lesson generalises: a design system cannot be applied to markup that styles itself.

**Four things worth knowing, each found by measurement:**

- Mantine's CSS baseline reaches inside the frozen container through *type* selectors, not its
  hashed classes — `input, button, textarea, select { font: inherit }` is a shorthand, so it resets
  `line-height` on the buttons the frozen renderers emit. Three of them declared none and grew by
  3 px. They now pin `line-height: normal` explicitly. The obvious defensive assertion — "nothing
  inside the grid matches a Mantine class" — would have passed while that shipped.
- Mantine's `Popover` mounts its dropdown from an effect, so the file menu's node did not exist when
  the app's script bound its listener. The menu opened and closed perfectly while doing nothing at
  all, with no error of any kind.
- Mantine writes its own `id` over one you give a menu button. Element ids are part of this app's
  save-file format, so that class of surprise is the main hazard in the rest of this work.
- **Mantine's inputs are *controlled*, and this app restores a saved calendar by writing values
  straight into the DOM.** A controlled field ignores that write — so a saved date would save
  correctly, pass every check, and then silently not come back when you opened the file. Every field
  is therefore deliberately uncontrolled, and a real v1.0.0 calendar restoring identically is what
  proves it.

**Still legacy, and honestly so:** the Phases and All-phase hiatus card *interiors*, the holiday
list and the episode rows are **restyled, not rebuilt**. They are generated by the app as HTML
strings, by code that also mints the element ids that are the save-file format, so rebuilding them
is a separate and more careful job.

**Verified:** `tests/harness/gate.sh` — the whole acceptance gate as one command — passes after every
stage against `tests/baselines/2026-08-29-stage-7`: 0 horizontally clipped cells, the waterfall PDF
byte-identical, every Excel part identical, a real v1.0.0 saved calendar restoring to the same 52
rows / 154 cells / 324 pt grid, the same 56 field ids, 0 console errors. New: `t/fence.js` asserts
positively that computed styles inside the frozen container did not move, which no test covered
before.


### Unreleased — 29 Aug 2026 — The chrome's design system, settled before it is built

**No change to `index.html`.** This is a decision pass, written up in
[`UI-CONVENTIONS.md`](UI-CONVENTIONS.md): the Mantine design work ("Stage 2") that the migration
plan puts *before* any chrome is built. It settles the theme tokens, one feedback system to replace
the many, the component choice for every control, overlay and date picker outside the frozen
surface, and the responsive model.

**What it changes about the plan, rather than about the app.** Every Mantine claim was checked
against the installed `@mantine/core` **9.5.2** source instead of recalled, and five widely-assumed
choices turned out to break the save format silently:

- `DatePickerInput` renders a **`<button>`**, and `collectFieldValues()` sweeps `input[id]` — so
  every `start-<phase>` key would vanish from `fields.byId`. Not saved wrong: **saved not at all.**
  `DateInput` is the only viable picker, and its default `valueFormat` writes `"August 29, 2026"`
  where `parseDateUTC` expects an ISO date.
- `Select` puts the option **label** in the id-bearing input, so the region selects would save
  `"United States"` instead of `"US"`. They must be `NativeSelect`.
- Omitting `id` yields a **randomly generated** id, not none — Mantine's `useId` runs
  unconditionally. ~75 holiday checkboxes plus the note-popover controls would land in every saved
  file and every undo step, under keys that change each session. That is the exact bug the existing
  code comments say was deliberately avoided.
- `Popover` portals by default, which moves the four tool popovers' eight id'd controls out from
  under the single `.tools-menu` ancestor test that keeps them out of saved files.
- Mantine's CSS baseline reaches **five real `<button>` elements inside `#table-wrap`**; `font:
  inherit` is a shorthand that also resets `line-height`, measured at **+3 px** of button height
  *with* the `@layer` fence in place, because a layer settles priority and not matching.

**Measured, and two documented numbers corrected.** The chrome's typography turns out to be a CDN
dependency the grid's font deliberately is not — Inter and IBM Plex Mono are fetched from Google
Fonts while Carlito is embedded — and it is load-bearing for a **frozen export**: `mvNoteLineCount`
measures against Inter and its result sets month-view row heights that `exportMonthPdf` prints.
Nine visible controls render in Arial because their rules omit `font-family:inherit`. The chrome
carries 16 font sizes, 9 radii, 8 shadows for 5 same-elevation surfaces, and 40 inline `style=`
attributes holding 168 declarations. And the toolbar-wrap width recorded in two docs was wrong: the
**preview** toolbar wraps at ~1185 px (that is the 75 px-tall one), while the **header** toolbar
wraps between ~848 px and ~1018 px depending on the file name — never at 1280 px.

**Also recorded:** the owner's standing instruction that the on-screen waterfall editor keeps its
present appearance — formatting, auto-shrinking, font, size, widths and heights — unless
specifically directed otherwise. That **narrows** an earlier reading of "the editable grid could
have a reconsideration on design", and now sits in `CLAUDE.md` and `HANDOFF.md` §4 mapped onto the
symbols it actually names.

**Verified:** `python3 tools/check-refs.py` CLEAN, with `UI-CONVENTIONS.md` added to its scan.
Browser measurements taken against the running app at seven widths, with the pane fronted — an
earlier run gave a false `--header-h` staleness because `ResizeObserver` and `requestAnimationFrame`
are throttled while the pane is hidden, which is the trap PROJECT-CONTEXT §11 already records.

### v1.2.0 — 29 Aug 2026 — The app can tell you it has been updated

**The problem, measured rather than assumed.** There is no service worker (one was removed
precisely because it served a stale app forever), so the received wisdom was that a reload always
fetches the current build. Checking the live site's actual headers showed that is *nearly* true:

```
cache-control: max-age=600
etag: "6a9254a0-a18bb"
```

GitHub Pages sets a **ten-minute** browser cache. A relaunch inside that window is answered from
the browser's own HTTP cache and never learns a new deploy exists. Worse, most people run this as
an installed PWA, which they leave open and return to rather than relaunching at all — so an old
build can persist indefinitely, and shipping a fix does not mean anyone receives it.

**What now happens.** The app knows its own version (`APP_VERSION`) and compares it against a
tiny `version.json` deployed beside it. When the deployed version is genuinely newer, a blue strip
appears under the header: *"Version 1.2.1 is available — this copy is 1.2.0."* with a **Reload to
update** button.

- **It never reloads on its own.** You may be mid-edit with unsaved work, and reloading out from
  under someone is how a production plan gets destroyed. It tells you and lets you choose; the
  existing unsaved-changes guard still applies on the way out.
- **It only nags when the server is genuinely ahead.** Versions are compared numerically per
  segment, so `1.2.10` correctly beats `1.2.9` (a string comparison gets that backwards), and a
  rolled-back deploy leaves you alone rather than inviting you to "update" to an older build.
- **Dismissal is per version.** Waving away 1.2.1 does not hide 1.3.0.
- **Only the deployed app checks.** A *shareable copy* opened from `file://` is a deliberate
  frozen snapshot — telling its holder to "update" would navigate them away from the very file
  they were sent. It stays silent.
- **It gives up after three consecutive failures.** A frozen `releases/vX.Y.Z.html` resolves the
  marker relative to its own folder, where there is none and never will be; without this it would
  404 every thirty minutes forever. Any success resets the count.
- **Offline is silence,** not an error. An update check that cannot run is not worth interrupting
  anyone about.

The check runs 8 s after load, then every 30 minutes, and when the tab becomes visible again after
that long — the likeliest moment for a new deploy to have appeared under a long-lived PWA.

> ### ⚠️ `APP_VERSION` and `version.json` are ONE action, not two
> Bump them in the same commit. `version.json` alone makes every user see an update that does not
> exist; `APP_VERSION` alone makes a real update invisible. Both live at the top of their files
> with this warning attached.

**Also in this release:** the two notice strips now share one set of CSS rules and differ only in
hue — amber for *"your file is an old format"*, blue for *"the app has a newer version"*. This app
already had more warning styles than it should; a second strip built from scratch would have made
that worse. Verified the legacy strip's computed styling is byte-for-byte what it was.

**Verified:** matching versions stay silent; a newer marker raises the strip; a rolled-back marker
stays silent; a missing marker is silent and stops asking; the comparison passes 10/10 cases
including `1.2.10 > 1.2.9`; and the grid is unchanged at 157 cells / 132 filled / **0 clipped**,
identical to before the change. The grid and the exports were not touched.

> **v1.1.0 never shipped on its own.** It was changelogged and committed but never deployed or
> tagged, so v1.2.0 is the release that carries both it and this. Everything in the v1.1.0 entry
> below arrives with this version.

### v1.1.0 — 28 Aug 2026 — Save writes data, not a copy of the app

**Save and Open used to be the same file.** Save wrote `document.documentElement.outerHTML` — a
complete runnable copy of the app — with the state embedded in `<script id="saved-state">`. But
Open never read the app: it lifts that JSON out and replays it into the **running** app, so the
old file's HTML, CSS and JS is never parsed and never executed. Measured on a 10-episode calendar,
that file was **729,172 bytes of which 3,238 (0.44%) was the data**, and 44.5 KB of the rest was
the rendered grid — serialized out of the live DOM, then regenerated from state on load and thrown
away.

There are now **two formats with two different jobs**:

| | **`.sptcal`** — the calendar | **`.html`** — a shareable copy |
|---|---|---|
| Contents | the state, as JSON | the whole app, with the state in it |
| Size | **~4.5 KB** | ~695 KB |
| Written by | **Save, Save As, autosave** | File ▸ **Export shareable copy…** |
| For | working — opening, editing, saving | sending to someone who doesn't have the tool |

**Measured: a save is now 155× smaller** (4,488 vs 695,556 bytes on the same calendar).

- **Every calendar saved before this version still opens, and always will.** `parseCalendarText()`
  is the one place that reads a file: text starting with `{` is a snapshot, anything else gets the
  original `saved-state` regex. Both paths converge on the same `applyStateSnapshot()`, so there
  is no migration to get wrong.

  Verified against a **real** legacy file, not a synthesised one: `tests/fixtures/v1.0.0-saved.html`
  was generated by running the **v1.0.0 build itself** and clicking Save — 760 KB, 27 snapshot
  keys, no `version` field, grid baked in. Opened in v1.1.0 it restores every field (title, season,
  episodes, all four phase dates, week counts, region) and a **154-cell rendered grid identical to
  the one it was saved from**. Re-saved as `.sptcal` it is 4,525 bytes — **168× smaller** — and
  restores identically again. `releases/v1.0.0.html` (the app itself, whose state block is the
  literal `null`) is rejected cleanly rather than opening as an empty calendar.

- **Opening a legacy `.html` now recommends upgrading it.** A dismissible amber strip under the
  header explains that the file carries a whole copy of an old build of the app around ~3 KB of
  plan, with a **Save as .sptcal** button that runs Save As. Amber and not red on purpose: nothing
  failed, and colouring it like an error would teach people to distrust their own saved calendars.
  It is a recommendation — plain Save on a legacy file still writes `.html`, and nothing is ever
  converted without being asked.
- **Save writes back in whatever format the file already is.** Open a legacy `.html` and Save keeps
  it an `.html` — no file is silently converted.
- **The first save still always opens the save dialog**, manual or otherwise. Autosave can never
  reach that path: `showSaveFilePicker()` requires a user gesture, and writing a calendar somewhere
  the user never chose is exactly what the dialog exists to prevent. When autosave finds unsaved
  work with no file linked it now says so — *"Autosave needs a file — click Save"* — instead of
  failing silently. Work is not at risk meanwhile; the rolling IndexedDB backup has been running
  since three seconds after the first edit.
- **The shareable copy got smaller too.** It is built from a **clone** of the document, so the live
  page is never mutated, and the clone drops `#table-wrap`, `#print-root` and any open popover
  before serializing — all regenerated on load. Verified 0 bytes for each in the export.
- **Snapshots now carry a `version` field** (`SNAPSHOT_VERSION = 1`). Nothing branches on it yet;
  it exists so a future migration can ask which app wrote a file instead of sniffing for individual
  keys, which is what `migrateHolidayViewKeys()` and `normalizeRegionSelection()` have had to do.
- **Fixed along the way:** the save status waited on IndexedDB recents bookkeeping before reporting
  a write that had already succeeded — measured at ~1.2 s in a test run, long enough for an
  autosave tick to fire a second redundant write of the same bytes. `markClean()` now runs as soon
  as the bytes are on disk. Verified: status settles within 400 ms and the duplicate write is gone.

The grid and the exports were not touched. See [`HANDOFF.md`](HANDOFF.md) §7 for the full analysis
and [`CLAUDE.md`](CLAUDE.md) for the standing rule that saved calendars must keep opening forever.

### v1.0.0 — 28 Aug 2026 · `305c343` · tag `v1.0.0`

> The tag points at **`305c343`** — the commit where `index.html` was last the shipped app.
> The changelog, the rules and `releases/v1.0.0.html` were added in the commits *after* it, so
> checking out the tag gives you the v1.0.0 **app**, not this documentation. `index.html` is
> byte-identical either way.

**The last single-file build before the Mantine UI overhaul.** Frozen as the known-good baseline;
a byte-identical copy lives at [`releases/v1.0.0.html`](releases/v1.0.0.html)
(SHA-256 `0150be15e97c3ae1a670a181ab55987c9cfd3afeeb42580e13afde4fa20ffc81`).

The state of the app at v1.0.0:

- **Waterfall + month calendar** from phase start dates and durations, with the six built-in
  phases, custom phases, simultaneous post, and per-phase or all-phase hiatuses.
- **Day-level Production simulation** — shoot days, skipping weekends, hiatus days and union
  holidays for the selected region until the count is met.
- **Union-holiday data** for US (General / New York Local 52), six Canadian provinces, and the UK,
  generated from rules rather than hand-transcribed, with observed-day handling.
- **One shared column model** feeding the screen, the Excel workbook and the PDF, so all three
  finally agree. `computePhaseRowLayout()` is the single source for which phase occupies which
  column.
- **Embedded Carlito** (subset, zlib'd, 91 KB) so text measurement cannot drift.
- **Direct PDF writer** — TrueType subsetting, `/FontFile2`, WinAnsi, xref, Flate. No print dialog.
- **Excel export** via ExcelJS with explicit widths, merges and ARGB fills.
- **Direct manipulation** — drag columns and rows, autofit, shrink-to-fit, cell spans,
  double-click to return to automatic.
- **Calendar tools** — Shift All, Shift From, Anchor To, Rebuild From, Close all gaps, undo/redo.
- **Save / open** as self-contained HTML, with File System Access write-back, an IndexedDB recents
  list, a 10-minute autosave and crash recovery.

**Known limits at this version**, all documented in [`HANDOFF.md`](HANDOFF.md) §2:
the Settings menu and per-user preferences are not built; Notes is one column rather than the
reference export's label + right-aligned date; the PDF is height-bound where Excel is width-bound
(row pitch runs ~16% long); the month view still tints phase bars with the palette's text colour.

### Returning to v1.0.0

Any of these work, in increasing order of commitment:

```bash
# 1. Just look at it / run it — no git state changes at all
open releases/v1.0.0.html
```

```bash
# 2. Read a file as it was at v1.0.0, without moving the working tree
git show v1.0.0:index.html > /tmp/v1.0.0-index.html
```

```bash
# 3. Restore v1.0.0's index.html into the working tree as an uncommitted change
git checkout v1.0.0 -- index.html
```

```bash
# 4. Branch off the tag to work from it
git switch -c from-v1.0.0 v1.0.0
```

The tag is immutable and `releases/v1.0.0.html` is a byte-identical copy, so **the baseline
survives even if the working tree, `main`, or the whole build system is replaced.**
