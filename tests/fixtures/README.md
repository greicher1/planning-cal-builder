# tests/fixtures/

Real saved calendars, and deliberately damaged or hostile ones, for the headless harness
(`tests/harness/`). Load one at startup with `HARNESS_STATE=<name>` (the inline `?state=` path), or
through the real picker with `T.openViaFakePicker('/tests/fixtures/<file>', '<file>')`.

The older fixtures (`blocks`, `colswap-*`, `stintswap-*`, `dayoverrides`, `v1.0.0-saved.html`, …) are
described where their legs are, in `tests/harness/README.md` and `PROJECT-CONTEXT.md` §11.

## From the deployment-readiness audit (24 Sep 2026)

These came out of `AUDIT-REPORT.md`. They were promoted here by `FIX-PLAN.md` step 0.1, so the batch
1–4 fixes have real regression inputs. Each one reproduces a finding **on the build as it was on
24 Sep 2026** (`a432613`). Once its fix lands, the leg that loads it must pass.

⛔ **Every payload is an inert marker.** It pushes a string onto a `window.__PWN` / `window.__pwn`
array, or sets a `top.__PWN_*` flag. Nothing fetches, navigates, reads storage or exfiltrates.
Keep it that way: a fixture that can do harm is not a test.

⛔ **Do not push the `xss-*` files before the H-1 fix is live.** The repo is public, and until then
they are a working demonstration against the live site. They ship in the same release as the fix
(FIX-PLAN batch 1, v1.3.0). The same applies to `AUDIT-REPORT.md` / `.pdf`.

### Hostile values (H-1: stored XSS through file-supplied values)

| File | Where the payload sits | Sink it reached on `a432613` |
|---|---|---|
| `xss-hdrfmt.sptcal` | `headerFormat.*.color` / `.size`, Manual mode | the header line's `style="…"` |
| `xss-hdrfmt-auto.sptcal` | the same, Auto mode | the same, so it is not Manual-only |
| `xss-notecolor.sptcal` | `noteColors[week]` | the note cell's `style` |
| `xss-hiatuscolor.sptcal` | `hiatusColors[week]` | the hiatus band's `style` |
| `xss-daynotecolor.sptcal` | `dayNotes[].color` / `dayNoteColors` | the month-view note bar |
| `xss-holidayid.sptcal` | `customHolidays[].id` | `data-hid="…"` in the holiday list |
| `xss-episodes.sptcal` | `episodeDefs[].id` / `.days`, plus a holiday id | the episode rows |
| `xss-blocks.sptcal` | `blockDefs[].id` / `.days` | the block rows |
| `xss-mixed.sptcal` | an episode id, custom-holiday ids, hiatus `start` / `weeks` | several at once |
| `xss-grid.sptcal` | note and hiatus colours plus header formats | grid and header together |
| `xss-legacy.html` | a crafted legacy `.html` with markup in stored strings and in its OWN scripts | its own scripts must never run; the stored strings are the same sinks |

### Loads that fail partway (M-1)

| File | Why it fails | Must now |
|---|---|---|
| `show-a.sptcal` | nothing: the GOOD file ("SHOW A": notes, a *Summer Break* hiatus) | be left exactly as it was after any bad load |
| `loadfail-null-field.sptcal` | `fields.byId['season-num']` is `null` | be refused cleanly, calendar untouched |
| `loadfail-null-hiatus.sptcal` | `fields.hiatuses` holds a `null` | the same |
| `loadfail-colour.sptcal` | `phaseColorOverride.production = 9`, and `PHASE_COLOR_OPTIONS` has 0–8 | the same. This is what the first colour append would make every OLDER engine see |
| `loadfail-future.sptcal` | `version: 2` | be refused as "saved by a newer version" |
| `foreign.json` | not a calendar (a `package.json`) | be refused, and never be written to |

### Carry-over between files, and restore

| File | Use |
|---|---|
| `carry-rich.sptcal` | `stintswap-chained` with every store populated. Load it, then a customless file; `captureSnapshot()` must equal a fresh load of the second file (M-2, M-5) |
| `hiatus-blank.sptcal` | the default 12/21/26 hiatus with `weeks: ""`. It must stay blank through load, undo and recovery (M-3) |

### Snap to Mon off (H-3, H-4)

| File | What it has |
|---|---|
| `snapoff-sheet.sptcal` | `dayoverrides` in the waterfall view: Pre Prep snap-off on Wed 4/8/26 |
| `snapoff-friday.sptcal` | the earliest phase snap-off on Fri 1/2/26, full-year mode |
| `snapoff-onecol.sptcal` | the earliest phase snap-off on Wed 1/7/26, Single Column Mode |

### Month view and exports

| File | Use |
|---|---|
| `month-dense60.sptcal` | 60 notes in one week of Aug 2026, a shrink-to-fit month |
| `month-lanecap.sptcal` | more than 60 lanes in one day (L-16) |
| `hdr-cut.sptcal` | long, formatted header lines that the Excel trimmer must shave without cutting a `&"font"` code (M-9) |

### Parser robustness (these already PASS; keep them passing through the loader changes)

`parse-bom.sptcal` (UTF-8 BOM before `{`), `parse-crlf.sptcal`, `parse-trunc.sptcal` (cut mid-JSON:
refused), `parse-empty.sptcal` (`{}`: refused once the shape gate lands), `parse-utf16.sptcal`
(refused), `parse-twoblocks.html` (two `saved-state` blocks: the first one wins).
