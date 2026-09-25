# FIX-PLAN.md: fixing every finding in AUDIT-REPORT.md

Written 25 Sep 2026. Covers **every** entry in [`AUDIT-REPORT.md`](AUDIT-REPORT.md): 4 high, 15 medium, 26 low, 10 notes, and the 13 suspected items. It follows CLAUDE.md throughout: symbols, never line numbers; every saved calendar keeps opening; no captureSnapshot key and no `fields.byId` id is renamed or removed; frozen edits only where the owner approved them below.

## 0. Owner rulings this plan rests on (25 Sep 2026)

| # | Question | Ruling |
|---|---|---|
| R1 | Snap-off fix (H-3/H-4) changes Excel and waterfall-PDF output for snap-off calendars | **Approved, but show before/after exports first** |
| R2 | How Production's half/off/worked days travel when it moves | **By shoot-day number**, on every mover |
| R3 | Frozen edits | **All four groups approved:** waterfall-PDF note wrap; the Excel writer fixes (header trimmer, width/height clamps, cached dates); the month-print Letter pin; the month-view renderer fixes (holidays under edited notes, lane cap, nav clamp, blank hiatus label) |
| R4 | File changed on disk since it was loaded | **Pause and ask:** autosave stops; Save offers overwrite, load the newer version, or save a copy |
| R5 | Edited auto-notes after a shift | **Rewrite on shift**, with no save-format change |
| R6 | Safari/Firefox | **Chrome/Edge only:** a notice on other browsers, plus correcting HANDOFF §3 B |
| R7 | Shared github.io origin | **Scope the service-worker cleanup now; plan a custom domain as a later, separate step** |
| R8 | Shipping | **Batches, each a release; batch 1 is v1.3.0.** Every push needs its own explicit OK |
| R9 | Shareable copy | **Keep it and fix it** |

**Defaults chosen where no ruling was needed.** Any of these can be overridden; say so before the batch that contains it starts.

| Item | Default |
|---|---|
| L-12 decimal weeks/days | Keep whole-number semantics. **Ring the field** and say "whole weeks/days only". The schedule does not change |
| L-24 "Start after previous" off a snap-off phase | Start the day after the previous phase ends. If the chained phase is snapped, start the next Monday instead. Never overlap |
| M-15 runaway counts | Episodes and blocks capped at 200 (`max` on the inputs, plus an engine clamp). A hiatus's weeks are capped at `MAX_WEEKS` before any loop |
| M-7 holiday range | Regenerate for **2024–2031** (owner, 25 Sep 2026: "only go up to 2031"). Show a notice when shoot days fall outside the covered years |
| N-1 blank hiatus label | A deliberately blank label stays blank in **both** views and both PDFs |
| L-6 characters outside WinAnsi | A warning before the waterfall-PDF export lists the characters that will print as "?". No font rework |
| SAVE-7 crash backup | One backup slot **per tab**. Recovery offers the newest. A save deletes only its own tab's slot |
| SCHED-13 Sim Post offset | Relabel it "calendar weeks after Production begins". No date change |
| N-4 add-holiday inputs in `fields.byId` | **Leave them** (removing them is a save-format change) and document it as deliberate |
| N-6 clickjacking | No change. Documented |

## 1. How every fix is done (the per-fix procedure)

1. **Write the failing leg first.** Every fix gets a `tests/harness/t/<leg>.js` that reproduces the audit finding on `/dist/index.html` and fails before the fix. The leg is wired into `gate.sh` when it guards the save format, an export or a date.
2. **Make the change.** The frozen surface is touched only where R3 approved it.
3. **Always-checks:** `node --check src/legacy/app.js`, `npm run build && npm run check`, then verify the change in the real browser pane with real clicks where it is a gesture.
4. **Frozen edits:** show a before/after (PDF diff, `monthcmp.py ab`, or Excel parts) before re-cutting any baseline. Record every re-cut in that baseline's README, with a table of what moved and why.
5. **Record it** in the README changelog and in HANDOFF, in the same breath as the code.
6. **Commit locally.** One commit per fix, with the message standard in HANDOFF §5e.
7. **Run the full `gate.sh`** at the end of each batch, before asking to push. Every push is asked for separately (R8).

⚠️ **Harness trap, recorded by the audit:** Chrome `--dump-dom` exits with a 0-byte dump when the DOM holds a lone UTF-16 surrogate. Legs that type such text must scrub text nodes and input values before `T.done()`. Step 0.3 builds a helper for this.

## 2. Step 0: harness preparation (tests only, no app code)

| Step | What | Why |
|---|---|---|
| 0.1 | **Promote the audit's hostile fixtures** from the session scratchpad into `tests/fixtures/`: the `XSS_*`, `PROD_xss*`, `SAVE_throw_*`, `SAVE_foreign.json`, `SAVE_future`, `SCHED_dayovsheet`, `SCHED_fridayanchor`, `SCHED_onecolsnap`, `SCHED_blankhiatus`, `MAIN_A`, `MAIN_rich`, `MONTH_dense60`, `MONTH_lanecap`. Payloads stay inert markers. | The scratchpad is not durable. These are the regression inputs for batches 1–2. |
| 0.2 | **A picker helper that can write:** `openViaFakePicker` gains a recording `createWritable`, plus an IndexedDB stub that settles, so `persistRecents` resolves in headless Chrome. | Lets legs prove what Save and autosave write into which file (M-1, M-6, L-1). |
| 0.3 | **`T.scrubSurrogates()`** in `lib.js`. | The dump trap above. |
| 0.4 | **A `[role=dialog]` fix in lib-style helpers:** assert on `.mantine-Modal-content`, never on the first `[role="dialog"]`. | The toolbar popovers are `role="dialog"` and come first in the DOM, which produced a false audit result (V14). |
| 0.5 | **Capture "before" exports** (Excel, waterfall PDF, month-print capture) on every fixture a later batch will move. They are stored beside the plan's working notes. | These become the before/after evidence R1 and R3 require. |

Size: small. No app code, so no gate needed. Commit locally.

## 3. Batch 1: must-fix, released as v1.3.0

In this order. The first five share one code boundary (`applyStateSnapshot`), so they land in sequence and are proven together.

### 1.1 M-2: custom phases no longer carry into the next file (together with HANDOFF known bug #1)

- **Fix:** in `applyStateSnapshot`, make the custom-phase block unconditional. Always clear `#custom-phase-rows`, reset `customPhaseDefs`/`customPhaseCounter`, and rebuild from `Array.isArray(snap.customPhaseDefs) ? snap.customPhaseDefs.filter(valid) : []`. `customPhaseCounter` becomes the max of the saved counter and the highest `customN` in use. In the same change, fix HANDOFF §2b-3 known bug #1: the remove, swatch and name handlers read `row.dataset.key` at event time, not a captured key.
- **Leg `loadcarry`:** load `stintswap-chained` then `blocks` through the real picker, and expect 0 custom rows and `captureSnapshot()` identical to `blocks` loaded fresh. Undo past "Add phase" should leave 0 rows. Existing custom-phase fixtures still restore exactly.
- **Frozen/format:** neither. **Size:** small.

### 1.2 M-3: a blanked hiatus stays blank

- **Fix:** `addHiatusRow` defaults to 2 weeks only when the argument is absent (`== null`). It also HTML-escapes `prefillStart`/`prefillWeeks`, which closes one H-1 sink. Both creating callers already pass 2 explicitly.
- **Leg `hiatusblank`:** `SCHED_blankhiatus`, then load, undo and recover. The weeks stay blank and Post's end is unchanged.
- **Size:** 1–2 lines.

### 1.3 M-5: Snap to Mon and per-phase hiatus names reset when a file lacks them

- **Fix:** in `applyStateSnapshot`'s absent-key block, beside the `show-mode` guard, and in `resetAll`: every `.phase-snap-cb` is set to checked, and every `.phiatus-name` to empty, when the file has no such id. Use explicit constants, not `defaultChecked`.
- **Leg:** extend `loadcarry` with snap-off calendar A, then `v1.0.0-saved.html`. Pre Prep reads "3/16/26 → … Snapped to Mon". New must also reset.
- **Size:** about 4 lines.

### 1.4 H-1: values read from files are validated (stored XSS), including L-8, L-9 and L-5

- **Fix, all at non-frozen boundaries:**
  - A `sanitizeSnapshot(snap)` step at the top of `applyStateSnapshot`. It covers Load, legacy `.html`, shareable copies, undo/redo, crash recovery and boot restore. Rules:
    - colours match `/^#[0-9a-f]{6}$/i` (note, hiatus and day-note colours; header and month-header `color` and `highlight`);
    - sizes are finite numbers in range;
    - alignment comes from a fixed set;
    - ids match `/^[\w-]+$/`;
    - day counts are numbers;
    - dates are ISO `YYYY-MM-DD`;
    - line values are strings.
    - Anything else falls back to the default and is counted.
  - The same validator runs in the `.spthdr` reader, with a size ceiling (about 256 KB). It rolls back if `savePrefs()` fails (L-8).
  - The header token resolver uses `hasOwnProperty`, and precomputes `lastIndexOf(']')` (L-9).
  - At note, hiatus, header and title commit, strip XML-illegal characters (`U+0000–0008, 000C, 000E–001F, FFFE, FFFF`) and lone surrogates, and turn `U+000B` into a newline (L-5).
- **Why not escape in the renderers:** `renderSpreadsheetView`/`renderMonthView` are frozen. Every value reaching their sinks enters through these boundaries, and the UI can only produce safe values, so validating at the boundary fixes it without a frozen edit.
- **Leg `hostile`:** every promoted `XSS_*`/`PROD_xss*` fixture goes through both the picker and inline paths, plus a `.spthdr` import-and-apply. The pass is 0 markers fired and 0 injected elements. Honest fixtures must restore byte-identically (gate 4 and 5 unchanged).
- **Frozen/format:** neither. No valid file changes. **Size:** small–medium, about 70 lines.

### 1.5 M-1: loading is all-or-nothing, including L-1, L-19 and N-8's recents

- **Fix:**
  - A `restoreAtomically(snap)` wrapper, used by `openRecentFile`, `applySnapshotJSON`, `offerBackupRecovery` and the boot restore (`restoreSavedState`): snapshot the current state; `try { apply; refreshAfterRestore }`, and on a throw re-apply the saved state and rethrow; `finally { suppressDirty = false }`.
  - `savedFileHandle` and `activeFileId` change only after success.
  - A version gate: `snap.version > SNAPSHOT_VERSION` is refused with "saved by a newer version of SPTCal".
  - A shape gate in `parseCalendarText`: require `fields.byId` to be a plain object, so a non-calendar JSON is refused with the existing "doesn't contain saved calendar data" message (L-1).
  - The four throw sites fall back instead of throwing, including the unguarded `PHASE_COLOR_OPTIONS[...]` lookup.
  - A refused file is not added to recents (N-8).
  - The boot restore finishes init on failure and shows a notice (L-19).
- **Leg `loadfail`:**
  - load A, then each `SAVE_throw_*` / `SAVE_future` / `SAVE_foreign`;
  - A's `captureSnapshot()` is unchanged;
  - an edit then shows "Unsaved changes";
  - a recording-handle Save writes A's own content;
  - the foreign file is never written.
- **Frozen/format:** neither. **Size:** small–medium, about 50 lines.

### 1.6 H-2: the shareable copy renders once, including L-21

- **Fix:**
  - In `buildSavedHtml`'s clone, beside the existing `#table-wrap`/`#print-root` emptying, empty the React hosts: `header.app-header, .view-toggle-row, #sidebar-static, #hiatus-hint-host, #react-root`.
  - Skip `.prefs-card` in `reflectFieldsToAttributes`, so the sender's preferences stay out of the copy (L-21).
  - Belt and braces: `main.jsx` clears each portal host before its first render.
- **Leg:** extend `sharecopy`. The copy opened as a document has exactly one of each id (`show-title`, `export-btn`, `undo-btn`, `file-menu`), no horizontal overflow, the saved calendar restored, and no `.fm-list` or sender preference in its markup. Re-check `file://` opening in the pane.
- **Frozen/format:** neither. Only the `saved-state` block is ever read back. **Size:** small.

### 1.7 H-3 + H-4: snap-off phases are placed correctly, including L-26 and L-24 (**R1: before/after first**)

- **Fix in `computeSchedule` (not frozen):**
  - the week activity test becomes an overlap test (`s.start < weekStart+7 && s.end > weekStart`);
  - Production's week span is computed from `mondayOf(start)`;
  - the grid's geometry comes from Monday-snapped starts and Monday-rounded ends, while the day-accurate `seg.start` stays for the month view.
  - This also fixes the one-day Friday shoot vanishing (L-26), the gap banner over-count, and the `{key.close}` token landing on a Sunday.
- **L-24:** "Start after previous phase" follows the default above.
- **Proof for R1:**
  1. Export Excel and the waterfall PDF on `SCHED_dayovsheet`, `SCHED_fridayanchor`, `SCHED_onecolsnap` and `dayoverrides`, before and after.
  2. Show the owner a side-by-side (rows, first and last week per phase, notes visible) **before committing**.
  3. Snapped calendars must be identical: the gate baselines, plus a 400-calendar randomised comparison of the week, cell and label signatures, as the skeptic ran.
- **Leg `snapoff`:** the rows and exports for the four fixtures.
- **Frozen:** no. **Exports:** yes, by design (R1). **Size:** small–medium.

### Batch 1 release

- Full `gate.sh` over the batch.
- Cut **v1.3.0**, following CLAUDE.md's four steps:
  - `APP_VERSION` in `src/legacy/app.js` and `version.json`, together;
  - the changelog;
  - `git tag -a v1.3.0`;
  - `releases/v1.3.0.html` (a byte-identical copy of `dist/index.html`);
  - a new real fixture, `tests/fixtures/v1.3.0-saved.sptcal`, made by clicking Save in the built app.
- ⚠️ **One question for the owner at release time.** CLAUDE.md's rule is "`APP_VERSION` in `index.html`, in `src/legacy/app.js` and in `version.json`, all three together". Measured 25 Sep: `src/index.html` has no `APP_VERSION`. The only other copy is in the root `index.html`, which is the legacy rollback and must stay byte-identical to `releases/v1.2.0.html`. So the rule predates the build cutover and cannot be followed as written. The plan bumps the build's copy and `version.json` only, and corrects CLAUDE.md, unless the owner rules otherwise.
- Ask to push. Verify the live URL is byte-identical to the gated build.

**Batch 1 size:** about one working session plus the gate.

## 4. Batch 2: correct dates and data (release v1.3.1)

| Step | Finding(s) | Fix | Where | Frozen? | Size |
|---|---|---|---|---|---|
| 2.1 | **M-4** (+SHIFT-2, MONTH-2, PROD-5), **R2** | Re-key `dayOverrides` **by shoot-day number** on every mover: Shift All, Shift From (only when Production itself moves), month-view body drag, Rebuild From, Close gaps. Before a move, map each override to its shoot-day index via `productionInfo.shootDays`; after it, map back onto the new shoot days. An `on` over a weekend or holiday keeps its position relative to its shoot week. An index that no longer exists (a shorter shoot) is dropped and reported in the tool's result line. | `shiftCalendar`, `installMonthPillDrag`, `workBackwardsFrom`/`workForwardsFrom`, `closeAllGaps` | no | medium |
| 2.2 | **M-10**, **R5** | On shift, a moving `userNote` whose text starts with the pre-shift auto text of its week gets that prefix replaced with the post-shift auto text. The user's added lines are kept. | `shiftCalendar` | no | medium |
| 2.3 | **M-11**, L-13, L-15, L-14 | The tools read `snap-<key>`: when it is off, anchor on the typed day and show the phase's real start in the prefill. "Ends by" uses the phase's last weekday (Production: its last shoot day). Rebuild checks there is something to place before writing anything. A shift that lands an undated note on an all-phase hiatus week says so in its result line. | shift/solve tools | no | small each |
| 2.4 | **M-12** | Re-key `rowHeightsByWeek` in `shiftCalendar`, next to `noteFontSize`. | `shiftCalendar` | no | 1 line |
| 2.5 | **M-7** | Regenerate `HOLIDAYS` for 2024–2031 with `tools/gen_holidays.py` (never hand-edit). Prove 2026–2030 is byte-identical by set difference. Add a notice when shoot days fall outside the covered years. | generator + `refreshDerivedInfo` | no | small |
| 2.6 | **M-14** | Base the year-block end on the final week's Monday. | `computeSchedule` | no | 1 line |
| 2.7 | **M-15**, L-25 | The caps from the defaults table, applied before any loop. | `applyRange`, episode/block sync, `NumberInput max` | no | small |
| 2.8 | **M-6**, **R4**, SAVE-7, L-18, SAVE-14 | Record `{lastModified, size}` at load and after every write. Before each write, compare. On a mismatch, autosave pauses with a "file changed on disk" status, and Save asks: Overwrite / Load newer / Save a copy. Per-tab crash-backup slots. Autosave skips its tick while a note editor is open. `isDirty` is cleared before awaiting IndexedDB. | `saveToFile`, `startAutosave`, `saveAsFile`, `openRecentFile`, `writeBackup`, `offerBackupRecovery` | no | medium (~80 lines) |
| 2.9 | **M-13** (+MONTH-6), R3 | Month-view holiday labels for a week stay visible when that week's note is edited. Editing a waterfall note from the month view never bakes month-only holidays into the waterfall note. `monthcmp.py ab` on the affected fixtures goes in front of the owner before any baseline re-cut. | `notesForWaterfallDate`/`autoNotesForView` (month-PDF renderer, R3-approved) | **yes (approved)** | small |

**Legs:**
- `overrides`: every mover keeps each mark on its shoot day. The Shift From case (Post +1) leaves Production, `#meta-production` and `#prod-ov-note` unchanged.
- `autonote`, `rowheight`, `holidays2031`, `conflict` (the recording handle changes the file between load and save).

Full gate at batch end, then release **v1.3.1** (same cut steps).

**Size:** about 1–2 sessions.

## 5. Batch 3: the approved frozen export edits (release v1.4.0)

Each step is its own gated change with a before/after, and its own baseline re-cut recorded in the baseline README.

| Step | Finding | Fix | Frozen symbol | Baseline moved | Size |
|---|---|---|---|---|---|
| 3.1 | **M-8** | Word-wrap notes in the waterfall PDF with `ttfTextWidth`, using the same greedy rule and line budget as `wrapLineCount`, top-aligned when wrapping (as the screen is). | `buildWaterfallPdf` | waterfall PDF, only where notes wrap | medium (~25 lines) |
| 3.2 | **M-9** | The Excel header trimmer keeps `{code, text}` per line until assembly, shaves only text, and drops a line whose text reaches zero. Mirror the change in the budget meter's estimate. | `exportExcel` | Excel `sheet1.xml`, only for over-long formatted headers | small–medium |
| 3.3 | **L-2** | Clamp column widths ≤ 255 characters and row heights ≤ 409 pt: in the Single Column Mode post-pass (cap `f`), in drag `onUp`, and at the write (which covers values already saved in old files). | `sheetColumnWidths`, `installGridResizers`, `exportExcel` | none on current fixtures | tiny |
| 3.4 | **L-7** | Write the Date column as `{formula, result}` so ExcelJS emits cached values. | `exportExcel` | **every** Excel baseline (deliberate re-cut) | trivial |
| 3.5 | **L-3** | `@page{ size: letter landscape; margin:8mm; }` in the month-print CSS. | print CSS | should be none: headless prints Letter, and `monthprint` must be byte-identical | 1 line |
| 3.6 | **L-16**, **L-17**, **N-1** | Remove the 60-lane cap (loop until free). The month nav clamps to the nearest month in range. A blank all-phase hiatus label stays blank. | `renderMonthView` | month PDF only for calendars with >60 lanes or blank labels | 1 line each |

**Manual verification (needs a person):** open the 3.2/3.3 before-and-after workbooks in Excel.app (installed on this machine) and confirm there is no repair prompt. Open a 3.5 PDF from a UK-locale Chrome and confirm Save as PDF hides Paper size.

**Size:** about one session.

## 6. Batch 4: hardening and the low items (release v1.4.1)

| Step | Finding | Fix | Size |
|---|---|---|---|
| 4.1 | **L-4** | Add `integrity="sha384-…"`, `crossorigin="anonymous"` and `defer` to the ExcelJS tag in `src/index.html` only, with the hash verified out of band. Add the CSP `<meta>` tested in the audit (`default-src 'none'`, hashed inline scripts, the ExcelJS URL, `style-src 'unsafe-inline'`, `font-src data:`, `img-src data: blob:`, `connect-src 'self'`, `manifest-src data:`, `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`). ⚠️ First fix why building a shareable copy timed out under it. Add `<meta name="referrer" content="no-referrer">`. `check-build.mjs` computes the inline-script hashes at build time, so they cannot drift. | small–medium |
| 4.2 | **SUPPLY-3 (part 1)**, R7 | Unregister only service workers whose scope is under this app's own path. | 1 line |
| 4.3 | **L-22** | Legacy reader: a bounded search for the `saved-state` opener, then `indexOf('</script>')`. Prove it with the `restore` leg on `v1.0.0-saved.html`. | small |
| 4.4 | **L-10**, N-2 | Ring hiatus and per-phase-hiatus date fields with a bad year. Reword the runaway-duration message so it names durations as well as years. The message is frozen (`readCfgForMeta`), so it is driven from outside: a sidebar hint from `update()`. | small |
| 4.5 | **L-11** | Count `key === 'production'` only in the span header, at both sites. | trivial |
| 4.6 | **L-12** | Ring non-integer weeks/days (the default above). | small |
| 4.7 | **L-23** | Include `dayNotes` in `hasNoteEdits`, and route custom-holiday add through the same confirm as `hv-en`. | small |
| 4.8 | **L-6** | Warn before the waterfall-PDF export when text holds characters outside WinAnsi. This drives the frozen writer from outside, sanctioned pattern 2. | small |
| 4.9 | **L-20**, R6 | On a browser without the File System Access API, show a one-line "SPTCal saves and loads in Chrome or Edge" notice. Correct HANDOFF §3 B. | small |
| 4.10 | **N-3** | Export while the calendar is refused (>600 weeks) shows the refusal message instead of doing nothing. | small |
| 4.11 | **N-5** | `check-build.mjs` asserts the engine's `APP_VERSION` equals `version.json`. | trivial |
| 4.12 | **N-7** | `deploy.yml`: `if: github.ref == 'refs/heads/main'`, and SHA-pin the actions. ⚠️ A CI change; the push is asked for separately. | small |
| 4.13 | **N-9** | Show region caveats (Local 52 Juneteenth, Quebec's Good Friday/Easter Monday choice) as an info line under the location picker. The text comes from PROJECT-CONTEXT §5's research. | small |
| 4.14 | **N-8** (rest) | The legacy `headerOverrides` migration computes its defaults from the file being opened, not the previous schedule. | small |
| 4.15 | **SCHED-13** | Relabel the Sim Post offset (the default above). | trivial |

## 7. Batch 5: verify the suspected items, then fix whatever reproduces

Each is checked first. It is fixed only if it reproduces, and it then joins the nearest open batch.

| Suspected item | How it gets verified |
|---|---|
| Autosave writing a mixed calendar by itself (M-1) | Covered by the batch 1.5 leg using the settling IndexedDB stub (step 0.2) |
| What an XSS payload could do with live file grants | Moot once H-1 lands. Record it in the threat model |
| Shared origin exposure | The service-worker part is fixed in 4.2. **Custom domain: a separate plan doc** (DNS, the one-time loss of recents and backups, a notice for users), per R7 |
| Crash-backup single slot | Fixed by the design in 2.8. Proven in the pane with two real tabs |
| Print dialog Margins | By hand in desktop Chrome after 3.5 lands |
| Print dialog left open >60 s | By hand. If it reproduces, the safety net waits for `afterprint` only while the dialog is open |
| Cmd/Ctrl+P prints the whole UI | By hand. If it reproduces, a `beforeprint` handler routes to the month or waterfall export, or a print rule hides the chrome (non-frozen chrome CSS) |
| Real Excel on the flagged workbooks | By hand in Excel.app (batch 3's manual step) |
| One-digit-day month notes (MONTH-1) | Already measured correct (W2). Closed |
| A pill drag back to its origin leaves snap cleared (MONTH-9) | Pane gesture test. If real: record the snap at mousedown and restore it when the start returns to a Monday |
| Sim Post counting hiatus weeks (SCHED-13) | Relabelled in 4.15 |
| NumberInput clamp-on-blur desync | Pane test with real focus and blur. If real: the engine reads the clamped value on blur |
| `openRecentFile` asking for readwrite to read | Pane test with a real Recents entry. If a second prompt appears, request read first and write at first save |

## 8. Documentation updates (same breath as each fix, collected here so none is missed)

- **HANDOFF §3 B:** without the File System Access API there is **no** Load (R6's notice).
- **CLAUDE.md's region paragraph:** now `#union-place` (single select, `PLACES` map), not the three pre-14-Sep selects. **Also:** "There is no `version` field in the snapshot yet" is out of date (`SNAPSHOT_VERSION` exists and is now enforced by 1.5).
- **CLAUDE.md's release rule:** clarify which `APP_VERSION` a cut bumps now that the root file is the frozen legacy app. Ask the owner at the v1.3.0 cut.
- **PROJECT-CONTEXT §7a:** add `dayOverrides` (shoot-day re-key, R2) and `rowHeightsByWeek` to the "What a shift moves" table.
- **PROJECT-CONTEXT §11 / harness README:** the `--dump-dom` lone-surrogate trap, and the `[role="dialog"]` first-match trap.
- **UI-CONVENTIONS §10:** add the new legs to the acceptance gate list.
- **README changelog:** one entry per fix, plus one per release.

## 9. What this plan deliberately does not do

- **The direct month-PDF writer.** It comes after this plan (owner's ruling). AUDIT-REPORT §9 is its spec input.
- **Safari/Firefox support** (R6).
- **Removing the add-holiday inputs from `fields.byId`** (N-4): that would be a save-format change.
- **Clickjacking defences** (N-6).
- **A font rework for non-WinAnsi PDF text** (L-6 gets a warning only).
- **Moving to a custom domain.** It gets its own plan doc (R7).

## 10. Order and effort at a glance

| Batch | Contents | Release | Effort |
|---|---|---|---|
| 0 | harness preparation | none | small |
| 1 | M-2, M-3, M-5, H-1, M-1, H-2, H-3/H-4 | **v1.3.0** | ~1 session + gate |
| 2 | M-4, M-10, M-11, M-12, M-7, M-14, M-15, M-6, M-13 (+ their lows) | v1.3.1 | ~1–2 sessions |
| 3 | M-8, M-9, L-2, L-7, L-3, L-16, L-17, N-1 (frozen, approved) | v1.4.0 | ~1 session |
| 4 | hardening and the remaining lows | v1.4.1 | ~1 session |
| 5 | verify the suspected items; fix what reproduces | folded into 2–4 | small |

Every finding in AUDIT-REPORT.md maps to a step above:
- **High:** H-1 → 1.4, H-2 → 1.6, H-3/H-4 → 1.7.
- **Medium:**
  - batch 1: M-1 → 1.5, M-2 → 1.1, M-3 → 1.2, M-5 → 1.3;
  - batch 2: M-4 → 2.1, M-6 → 2.8, M-7 → 2.5, M-10 → 2.2, M-11 → 2.3, M-12 → 2.4, M-13 → 2.9, M-14 → 2.6, M-15 → 2.7;
  - batch 3: M-8 → 3.1, M-9 → 3.2.
- **Low:**
  - batch 1: L-1 → 1.5, L-5 → 1.4, L-8 → 1.4, L-9 → 1.4, L-19 → 1.5, L-21 → 1.6, L-24 → 1.7, L-26 → 1.7;
  - batch 2: L-13 → 2.3, L-14 → 2.3, L-15 → 2.3, L-18 → 2.8, L-25 → 2.7;
  - batch 3: L-2 → 3.3, L-3 → 3.5, L-7 → 3.4, L-16 → 3.6, L-17 → 3.6;
  - batch 4: L-4 → 4.1, L-6 → 4.8, L-10 → 4.4, L-11 → 4.5, L-12 → 4.6, L-20 → 4.9, L-22 → 4.3, L-23 → 4.7.
- **Notes:**
  - fixed: N-1 → 3.6, N-2 → 4.4, N-3 → 4.10, N-5 → 4.11, N-7 → 4.12, N-8 → 1.5 and 4.14, N-9 → 4.13;
  - documented: N-4 and N-6 (§9), and N-10 (§1 and §8).
