# tests/fixtures/

Calendars saved by the app, and deliberately damaged or hostile ones, for the headless harness
(`tests/harness/`). Load one at startup with `HARNESS_STATE=<name>` (the inline `?state=` path), or
through the real picker with `T.openViaFakePicker('/tests/fixtures/<file>', '<file>')`.

⛔ **Every fixture is synthetic, and must stay that way.** The repo is public, so never commit a
calendar derived from a real production, not even with the titles removed: its dates, region,
episode structure and phase lengths identify it on their own. When a real calendar reproduces a
bug, rebuild its *overlap pattern* on made-up dates, then prove the new fixture is red on the
pre-fix build. `stintswap-chained` and `stintswap-reshape` (29 Sep 2026) are the worked examples.

The older fixtures (`blocks`, `colswap-*`, `stintswap-*`, `dayoverrides`, `v1.0.0-saved.html`, …) are
described where their legs are, in `tests/harness/README.md` and `PROJECT-CONTEXT.md` §11.

## Half days (15 Oct 2026)

`halfdays.sptcal` is the reference calendar (`T.buildFixture()`) at **4.5 shooting days per episode, with Episode 201
at 5**: 45.5 shoot days from Mon 6/29/26, wrapping Tue 9/1/26. Its episode boundaries fall half way through a day
(Mon 7/13, Fri 7/24, Thu 8/6, …), so Production's month-view bars stacked on those days, and since 16 Oct 2026
(HALF-SQUARE-BARS-PLAN.md) meet half way through the square in one lane. Cut from the running app by the
`halfdays` leg (its `fixture` output), not written by hand. It also carries a dormant 5 x 8.5-day block list from the
leg's Blocks-mode step, in Episodes mode. Used by gate 10 (`monthprint`), `monthwriter`, `monthexport` and gate 13.

`halfmarks.sptcal` (16 Oct 2026) is `dayoverrides-onhalf.sptcal` with **Episode 201 typed as 4.5**, so every later
episode boundary falls half way through a day. Two of those switch days carry a saved ½ mark: Fri 7/3 ('onhalf',
201|202) and Sat 8/1 ('onhalf', 203|204). So a ½ shade sits inside a bar that is inset half a day, which no other
fixture has. Cut from the running app by the `halfmarks` leg (its `fixture` output). Used by `monthlayout` and
`monthwriter` in the gate.

## Edited auto-notes under the month view's drags (19 Oct 2026)

`autonote-grips.sptcal` is `monthnotes.sptcal` (an undated edit of the 6/29 week's auto-note, "Start Principal
Photography 6/29/26" + "Table Read") with **two more week notes added by script**, the only change:
- `2026-10-19`: `Principal Photography Wraps 10/20/26`, stored as exactly the auto text. That is the shape the owner's own
  calendar held for its start note (synthetic dates here).
- `2026-01-05`: `Writer's Room Opens 1/5/26` + `Pitch day`.
- `2026-08-03`: `Cast read 8/4/26` (dated inside its week, on a day 1–9) + `Delivery 8/12/26` (dated in another week).

It holds the R5 rewrite in the month view's drags (owner, 19 Oct 2026: the grip "doesnt move the comment with it"):
`pilldrag` E15–E17 and D5, `phaseedge` F13. All five were red on the build before the fix (`87028001…`). The 8/3 note
and `pilldrag` E18/E19 hold the two frozen lines in `notesForWaterfallDate` approved the same day (a one-digit day,
and a line dated outside its note's week). Both cases were red on the grip-fix build `65389d35…`.

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
| `sideboxes.sptcal` | the `sideboxes` leg (SIDE-BOXES-PLAN.md, 20 Oct 2026): `show-a.sptcal`'s made-up calendar with Prod Prep recoloured to Pre Prep's blue (`phaseColorOverride.prodPrep = 5`, so the key has a shared row) and a hand-added `sideBoxes` key: a five-line text box on the LEFT (bold, a line that wraps to three rows, italic red, a yellow highlight, a 14 pt centred line) and a colour key on the RIGHT. Hand-made from show-a's JSON, not a Save; the leg's F1 proves a real Save writes the same shape |
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
| `xlsx-overlimit.sptcal` | the reference calendar with the 2026 notes column dragged to 529.57 characters and the 9/14/26 row to 821 px: a REAL Save from the pre-L-2 build, straight after the `xlsxlimits` leg's drags. It stands for every file saved before the clamps (L-2) |
| `notewrap.sptcal` | the reference calendar plus four long texts, each made through the real UI: a note in a default row (10/5/26), a note in a row dragged to 81 px (9/14/26), an all-phase hiatus label in a dragged row (8/24/26), and a per-phase Post hiatus label (12/7/26). It is the waterfall-PDF A/B input for word wrap (M-8), minted by the `notewrap` leg through the real Save, 29 Sep 2026 |
| `hiatus-blanklabel.sptcal` | the reference calendar (`T.buildFixture()`) plus a 2-week hiatus from 8/24/26 whose two week labels were emptied in the note editor, so `hiatusTexts` holds `""` for both (N-1). Minted by the `hiatuslabel` leg through the real Save, 29 Sep 2026 |
| `hdr-cut.sptcal` | long, formatted header lines that the Excel trimmer must shave without cutting a `&"font"` code (M-9) |

### Version fixtures (one per cut, CLAUDE.md)

| File | What it is |
|---|---|
| `v1.0.0-saved.html` | a genuine pre-`.sptcal` calendar, saved by the v1.0.0 build (the `restore` leg, gate 4) |
| `v1.3.0-saved.sptcal` | a real Save from the v1.3.0 build: `T.buildFixture()`'s reference calendar, 62 `fields.byId` ids |
| `v1.3.1-saved.sptcal` | the same calendar saved by the v1.3.1 build (29 Sep 2026): 43 snapshot keys and 62 ids, both **identical sets** to v1.3.0's — batch 2 changed no save-format key. Minted with `t/mintfixture.js` (a real Save click through a recording handle; not a gate leg), and the `autonote` leg passes 9/9 on it |
| `v1.4.0-saved.sptcal` | the same calendar saved by the v1.4.0 build (29 Sep 2026): 43 snapshot keys and 62 ids, both **identical sets** to v1.3.1's — batch 3 changed no save-format key. Minted with `t/mintfixture.js`; 0 clipped cells |
| `v1.4.1-saved.sptcal` | the same calendar saved by the v1.4.1 build (30 Sep 2026): 43 snapshot keys and 62 ids, both **identical sets** to v1.4.0's -- batches 4 and 5 changed no save-format key. Minted with `t/mintfixture.js` (a real Save through the stood-in picker); 0 clipped cells, `version: 1`, 5,652 bytes. |
| `v1.4.2-saved.sptcal` | the same calendar saved by the v1.4.2 build (30 Sep 2026): 43 snapshot keys and 62 ids, both **identical sets** to v1.4.1's -- the header-controls build (owner rulings 1–7) changed no save-format key: every new control is a `<button>`, which `collectFieldValues()` never sweeps. Minted with `t/mintfixture.js` (a real Save through the stood-in picker); 0 clipped cells, `version: 1` |
| `v1.4.3-saved.sptcal` | the same calendar saved by the v1.4.3 build (1 Oct 2026): 43 snapshot keys and 62 ids, both **identical sets** to v1.4.2's -- double-click-to-open, the file shortcuts and the Reset Notes polish changed no save-format key (a launch is session UI; the new status line is not state). Minted with `t/mintfixture.js`; 0 clipped cells, `version: 1` |
| `v1.5.0-saved.sptcal` | the same calendar saved by the v1.5.0 build (20 Oct 2026): 43 snapshot keys, the **identical set** to v1.4.3's, and **74 ids, v1.4.3's 62 plus 12, none removed**: `unit-<key>` and `end-<key>` for the five built-in Weeks phases (a phase's length in Weeks, Days or Dates, 16 Oct 2026) and `prep-days` / `prep-name` (per-episode prep, 19 Oct 2026). The same 74 gate 5 holds. Number weeks' `wknum-<key>` is absent because the calendar has no custom phase. Minted with `t/mintfixture.js`; 0 clipped cells, `version: 1`, 6,209 bytes |
| `blocks-noeps-v1.5.0.sptcal` | ⭐ 20 Oct 2026 (LABELS-SETUP-PLAN.md item 4): a REAL Save by the v1.5.0 release of a synthetic Blocks calendar with **no episode count** (3 blocks × 15 days, the reference phases, US General), minted by `t/mintblocksnoeps.js` against `/releases/v1.5.0.html`. In v1.5.0 its Production is UNSCHEDULED ('Number of Episodes' was missing), its `weeks-production` is '' and it has no `blocksEpisodesOptional` key. The `labelsetup` leg holds the new build to opening it exactly so, the owner's *"old files keep dates"*. 43 keys, 5,390 bytes |

### Batch 2: dates and data (FIX-PLAN §4, v1.3.1)

| File | Use |
|---|---|
| `monthnotes.sptcal` | `v1.3.0-saved.sptcal` in the month view with three waterfall notes: an undated edit of the 6/29 week's auto-note (+ "Table Read"), a plain override on Thanksgiving week, and a 5/25 note carrying "Memorial Day 5/25/26" as the old month editor baked it. Month-only holidays must still show beneath the first two, and the third's only once (M-13, leg `monthnotes`); also the calendar the M-13 month-PDF A/B was taken on |
| `shift-stores.sptcal` | `v1.3.0-saved.sptcal` plus an undated note on the week of 8/3/26 in a 60px dragged row, and a note pinned to 9/10/26 in a 45px row. A shift must move the first note's row height with it and leave the pinned one's (M-12, leg `rowheight`) |

### Parser robustness (these already PASS; keep them passing through the loader changes)

`parse-bom.sptcal` (UTF-8 BOM before `{`), `parse-crlf.sptcal`, `parse-trunc.sptcal` (cut mid-JSON:
refused), `parse-empty.sptcal` (`{}`: refused once the shape gate lands), `parse-utf16.sptcal`
(refused), `parse-twoblocks.html` (two `saved-state` blocks: the first one wins).

### Custom phase units (CUSTOM-PHASE-UNITS-PLAN.md, 15 Oct 2026)

| File | Use |
|---|---|
| `hiatusdrag.sptcal` | A synthetic calendar on made-up 2027 dates, with no region (so no holidays), built by script from `customunits.sptcal`'s shape for the `hiatusdrag` leg (19 Oct 2026). Production is 3 × 10-day episodes from Mon 3/1/27, with a **half day on Wed 4/14/27**. Post runs 3 weeks from 5/3/27 with its own hiatus, **Post Pause** (5/17/27). Localization runs 12 weeks from 6/7/27, which carries the month view into August. The all-phase hiatuses are one week each unless noted: **Spring Break** 3/22 (unlocked, its band restyled on the band itself: label "Spring Break (typed)" with no sync claim, colour `#7030A0`), **Easter Week** 4/5 (unlocked), **Studio Shutdown** 4/19 (LOCKED), **Summer Hiatus** 6/14 (unlocked, 3 weeks), and **Overlap One** 8/2 (2 weeks) with **Overlap Two** 8/9, which share a week on purpose. Since 27 Oct 2026 two bands carry a waterfall text style, `textStyles.hiatus` italic on Spring Break (`2027-03-22`) and Post Pause (`2027-05-17|post`), for `hiatusdrag` H13, and a MONTH band style too, `mvTextStyles.band` regular weight (`bold: false`) on the same two, so H13 holds both views' styles through the drag |
| `mvtextstyle.sptcal` | MINTED by the `mvtextstyle` leg's own Save, 27 Oct 2026 (MONTH-TEXT-STYLE-PLAN.md): `T.buildFixture()` (synthetic, made-up 2026 dates) with Simultaneous Post on, Post's own hiatus the week of 11/16/26 and a day note "Crew lunch" on 7/8/26, then every month text kind styled at once from the text style bar: Pre Prep Week 2 (`prePrep@2`), Ep. 201 (`ep1`), Sim Post wk 1, both bands, the waterfall line "Start Principal Photography", the day note (`fmt` on its entry), the month name and the weekday row. Re-mint by running the leg LIVE and copying `tests/harness/mvtextstyle.sptcal` here; then regenerate the hostile copy below |
| `mvtextstyle-bad.sptcal` | `mvtextstyle.sptcal` with six values the sanitizer must drop, planted by hand: an unknown kind (`bogus`), a colour and a size 12 on `episode.ep1` (N1, R3), a highlight on a band, a frame key `nope`, and size 11 on the day note's `fmt`; and the title "Hostile Show". The leg's RESTORE mode loads it through the picker and holds the drops (R3) and their count (R4) |
| `customunits.sptcal` | A synthetic calendar on made-up 2027 dates, Atlanta (US-GEN) region, with one all-phase hiatus (week of 2/15/27). Four custom phases, one per case: **Scout**, Weeks with Snap off from Wed 1/13/27, the `{key.close}` bug case; **Read-through**, Days 6 across MLK Day; **Stage Build**, Dates 2/10–2/23/27 across the hiatus; and **Rigging**, Days 5 across the hiatus. Pre Prep (Weeks) is the Monday-end control. Minted by the `customunits` leg's LIVE run through the real Save (15 Oct 2026). Then **its month header was set by script** to a template naming every phase's `{close}` (`mvHeaderMode: manual`, `mvHeaderTemplates: true`, `mvHeaderManual`, the only keys touched), so the RESTORE run can read the tokens on screen. On the pre-change build `{custom1.close}` printed `1.24.27`, a Sunday; it must print `1.26.27` |
| `builtindates.sptcal` | Step 6 (§7a): the five built-in Weeks phases in Dates mode. A synthetic calendar on made-up 2027 dates, Atlanta (US-GEN), with one locked all-phase hiatus (the week of 2/15/27): **Writer's Rm**, Weeks from Mon 1/4/27 for 4 weeks (the control); **Pre Prep**, Dates 2/10–2/23/27 across the hiatus; **Prod Prep**, Weeks from Mon 3/1/27 for 4 weeks; and **Post**, Dates 4/1–5/12/27. Production and Localization are unscheduled. Minted by the `builtindates` leg's LIVE run through the real Save (15 Oct 2026), **unmodified**. The pre-step-6 build opens it with Pre Prep and Post in whole weeks, from the `weeks-<key>` fallback, so neither vanishes |

⚠️ **Since 29 Oct 2026 `customunits`, `builtindates`, `episodeprep` and `episodeprep-blocks` are also the real-file proof
of a retired place.** All four were saved with `us-atlanta`, one of the twelve US places the owner removed from the
picker that day. They load as `us-general` with Location "Atlanta" (`RETIRED_PLACES` in app.js), on the same
holidays. Do not re-mint them without keeping a copy saved with a retired place: the `retiredplaces` leg loads
`customunits.sptcal` as that proof, and its LIVE runs now build with `us-general`.

### A custom phase without "wk N" (PHASE-NUMBERING-PLAN.md, 19 Oct 2026)

| File | Use |
|---|---|
| `phasenumbering.sptcal` | A synthetic calendar on made-up 2027 dates, no region, no hiatus near it. Pre Prep (built-in Weeks, Mon 3/1/27 x 3) is the control and has no box (ruling R2). Six custom phases, each with its `wknum-<key>` box: **Table Read**, Days 1 on Wed 3/10/27, and **Scout**, Dates Thu 3/18 to Mon 3/22/27 (two week rows), both unticked by their By select; **Stage Lock**, Weeks from Mon 3/1/27 x 2, unticked by hand; **Rigging**, Weeks from Mon 3/8/27 x 2, ticked (the custom control); **Fitting** (Fri 3/26/27) and **Camera Test** (Mon 3/29/27), made by the month day menu's "Add 1-day phase here" (unticked) and "Add 1-week phase here" (ticked). Minted by the `phasenum` leg's LIVE run through the real Save, from the waterfall view. The pre-change build (`05169b7f…`) opens it with every phase reading "wk N" / "Week N" and nothing lost |

### Per-episode prep (EPISODE-PREP-PLAN.md, 19 Oct 2026)

| File | Use |
|---|---|
| `episodeprep.sptcal` | A synthetic calendar on made-up 2027 dates and a made-up show shape, Atlanta (US-GEN): "Prep Fixture", Season 3, 6 episodes x 5 days from Mon 2/22/27, Prod Prep from 1/18/27 (5 wk), Post from 4/19/27 (8 wk), and one LOCKED all-phase hiatus, the week of 3/15/27, which falls between two episodes. Shooting order 302, 301, 304, 303, 306, 305. Prep: default 5 working days, 304 its own 8 and 303 its own 10, so two pairs of preps overlap (one pair both from the same Monday). Presidents' Day (2/15) falls inside Prep 302 and Good Friday (3/26) inside Prep 306. The hand trace is in `tests/harness/t/episodeprep.js`'s header. Minted by the `episodeprep` leg's LIVE run through the real Save (19 Oct 2026), **unmodified**. Its Episode 306 is `ep7`: the leg's drop-warning step removed and re-added it before the drags |
| `offweek.sptcal` | A synthetic calendar on made-up 2027 dates and a made-up show shape, US General: "Off Week Fixture", Season 3, 8 episodes x 5 days from Mon 8/2/27, Prod Prep from 6/21/27 (6 wk), Post from 11/8/27 (12 wk), a LOCKED all-phase hiatus the week of 8/23 and Production's OWN hiatus the week of 10/4. Day marks: 8/2-8/6 off (a dark week BEFORE the first shoot day, ruling Q3), 8/30-9/3 off (an off week), 9/7-9/10 off with Labor Day 9/6 (an off week of mixed cause), 9/20-9/24 off with Sat 9/25 worked (NOT an off week). Wrap Thu 11/4/27. The hand trace is in `tests/harness/t/offweek.js`'s header. Minted by the `offweek` leg's LIVE run through the real Save, every mark set through the month view's day popover (19 Oct 2026), **unmodified**. No gate-10 or gate-13 baseline reads it (OFF-WEEK-PLAN §10) |
| `shootdays.sptcal` | `offweek.sptcal` with **Number Production Days ON** (`mvNumberShootDays: true`, 19 Oct 2026): opened through the real Load path on the month view and the Settings tab, switched on by clicking `#pref-mv-shootdays`, and written by the real Save (the `shootdays` leg's A9/A10). Differs from `offweek.sptcal` only by that key, `viewMode: 'month'`, `sidebarTab: 'settings'` and `prep-name` (today's build writes "Episodic Prep"). 40 numbered shoot days, Day 1 on 8/9/27 to Day 40 on 11/4/27, Day 16 on the worked Saturday. Read by `monthemit`, `monthwriter` and `monthexport` (gate.sh) to hold the month-PDF writer's "Day N" to Chrome's own print. No gate-10 or gate-13 baseline reads it |
| `shootdays-onhalf.sptcal` | `dayoverrides-onhalf.sptcal` with **Number Production Days ON**, minted the same way. Adds a numbered half day (7/6/26), two numbered half-worked days (7/3/26, a holiday; 8/1/26, a Saturday), each keeping its ½ beside the date, and a numbered worked Saturday (7/11/26); 82 shoot days. The extra `unit-*`/`end-*`/`prep-*` fields are ones today's build writes. Read by `monthemit` and `monthwriter`. No gate-10 or gate-13 baseline reads it |
| `mvbarsize-large.sptcal` | ⭐ 27 Oct 2026 (MONTH-BAR-SIZE-PLAN.md step 3): `mvnotes.sptcal` at the **Large phase bar size** (`mvBarSize: "large"`), minted by the `mvbarsize` leg from its real Save at Large (out.sptcal). Two one-day custom bars renamed by the leg: custom3 (4/17/26) "Wardrobe Fittings For The", which fits one line at 10 px and not at 12 in the SCREEN's day (B5), and custom1 (4/15/26) "Camera Prep Day For T", which fits one line of the PDF's box at 10 px and not at 12, so the written Large PDF sets it on two lines (gate.sh's text check). Read by `monthemit`, `monthwriter` and `monthexport` (gate.sh's sized block). No gate-10 or gate-13 baseline reads it yet (plan step 4) |
| `episodeprep-blocks.sptcal` | Its Blocks-mode twin, minted by the same run's second Save: Schedule by Blocks, 3 blocks x 10 days (episodes split 2, 2, 2 in shooting order), Block 3 with its own prep of 12, so Prep Block 3 overlaps Prep Block 2 and steps over Good Friday and the hiatus. It still carries the Episodes calendar's per-episode lengths, dormant, which the leg's K3 switches back to |

### Excel's editing keys in the waterfall (WATERFALL-KEYS-PLAN.md, 22 Oct 2026)

| File | Use |
|---|---|
| `wfkeys.sptcal` | `shift-stores.sptcal` ("Test Show", US General, two year blocks 2026 and 2027) edited by script, nothing else changed: its two tall rows removed (`rowHeightsByWeek: {}`), its notes replaced by four synthetic ones (2026-08-03 "Table read" #FFC000, size 9, bold + italic through `textStyles`; 2026-08-10 two lines; 2026-09-07 "Wrap party 9/10/26" pinned to Thu 9/10; 2026-09-14 "Blocker"), and one unlocked all-phase hiatus added, 11/23/26 for 2 weeks (two band rows with no Notes cell). The automatic notes on 1/5, 6/29 and 10/19/26 are the calendar's own. Read by `t/wfkeys.js` and `wfkeysreal.mjs` |

## Month notes around the phases, and to another day (23 Oct 2026)

`mvdrag.sptcal` holds the `mvorder` leg's M1–M10 (MONTH-ORDER-PLAN.md §9). Synthetic, written by script from
`mvorder-notes.sptcal`: Writer's Rm runs from Thu 1/1/26 for 11 weeks with Snap off, so it ends Wed 3/18, and Prod
Prep starts Thu 3/12 with Snap off. So in March 2026 the week of 3/8 has Writer's Rm and Pre Prep Mon–Fri and Prod
Prep Thu–Fri, and the week of 3/15 has Writer's Rm Mon–Wed only, leaving its line free on Thu and Fri. Month notes
sit on every weekday of the week of 3/8 (one, "Fitting 3/10/26", with a date), on Tue 3/17 and on Thu 3/19 / Fri 3/20.
The 3/9 week's waterfall note is "Wardrobe 3/10/26" + "Props 3/12/26". No order and no place is saved, so it opens in
the untouched layout. Production starts Mon 6/29/26, for the auto-note case. On the live build of 23 Oct
(`d2ac914e`), M1, M2 and M3 are red.

