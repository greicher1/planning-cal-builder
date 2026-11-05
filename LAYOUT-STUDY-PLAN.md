# LAYOUT-STUDY-PLAN.md

**Find out, from the owner's own picks, how the waterfall's columns should be ordered, reused and spanned —
then write those rules down and build them, so a calendar lays itself out without "Reuse Empty Columns".**

Written 4 Nov 2026 from the owner's idea (same day, chat). Read [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md)
→ [`COLUMN-ORDER-PLAN.md`](COLUMN-ORDER-PLAN.md) → [`COLUMN-REUSE-PLAN.md`](COLUMN-REUSE-PLAN.md) first. Tracker
card `learned-column-layout`.

This plan covers the **study** (a local tool, the owner's picks, and the rules derived from them). The **build**
that follows gets its own plan once the rules exist (§9).

---

## 1. What the owner asked for

> *"I think the program could do a better job automatically understanding and applying how to sort columns left to
> right, and how columns should span or not span in different scenarios. And last we might be able to remove the
> reuse empty columns feature if the program could dynamically understand how to sort columns … If I was to give
> you as many real calendars as possible and then I asked you to build a microapp that gives me a few hundred (or
> less) different calendars side by side and I get to pick which one is sorted and arranged properly …"*

The honest take given in chat, which this plan follows:

- Yes. The app already runs on a rulebook that has been discovered one incident at a time (handoff takes the freed
  column, 20 Oct; prefer a column already used this year, 4 Nov; Sim Post right of Production, 2 Nov; …). The
  study front-loads that discovery.
- What comes out is a **decision list**, not a trained model. One expert and a few hundred picks over discrete
  layouts cannot fit a learned model, and the app should not have one: it could not be gated byte for byte,
  explained to a user, or trusted on the calendar nobody showed it. A complete, explicit rule list can.
- A screen must isolate **one decision**, or a pick says which layout the owner likes without saying why.

## 2. What is true today (read from the code, 4 Nov 2026)

Three separate mechanisms decide what the owner is calling "sorting":

| Decision | Where | Frozen? |
|---|---|---|
| **Which column a phase takes** (`col`, an opaque identity) | `computeSchedule`'s `segCol` block (reuse off: strict start order, right of every running phase, reuse only to the right) and `placeSegmentsReusingColumns` (reuse on: COLUMN-REUSE-PLAN §3 — hand move, handoff, chain tie, year-aware free column, new column; Production renumbered 0) | **No.** Frozen code reads `col` as data |
| **Left-to-right order of a year's columns** | frozen `computeBlockLayout`: by first appearance in the year, ties by `col` value; then the stored swaps (`gridColSwaps`, `gridStintSwaps`, edit E0) | **Yes** |
| **How wide a cell is** | frozen `computePhaseRowLayout`: even share among the phases in the row; a phase spans right only into a column empty for its WHOLE run; a lone phase absorbs empty columns to its left; Sim Post's lane fixed at Production + 1 (SP1); `cellSpans` overrides per week\|phase | **Yes** |

So **placement and reuse can change without a frozen edit; order within a year and spans cannot.** The owner's
three complaints map onto all three rows, and the study has to keep them apart.

Manual overrides, all keyed by phase and all kept: `colFollow` (reuse on, "follows X"), the two swap stores,
`cellSpans` (`{l, r, k}`; `k` = the phase count in the row when it was set, so a stale claim rebalances), `colWidths`.
The study does not touch them; the rules it produces are the AUTOMATIC answer, and every override still wins.

`colReuse` is a PERMANENT saved key (absent = off = the old placement, byte-identical). Whatever the study finds,
a file saved with it clear must keep laying out as it does today (CLAUDE.md, "Every saved calendar…").

## 3. What the study produces

1. **`LAYOUT-RULES.md`** — the decision list, in the owner's terms, each rule with the picks that support it and
   the cases that are its exceptions. Public: rules only, no calendar data.
2. **`tools/layout-study/picks.json`'s private twin** — every screen shown and every answer, outside the repo (§4.5).
3. **Synthetic fixtures**, one per rule, made-up dates and names, each red on today's build where the rule differs
   from today's answer. These are the build's gate.
4. A **hit rate for today's rules** (how often the owner picks today's answer), measured for free because today's
   answer is always one of the candidates. If it is 95%, the build is small. That number also decides §9's R5.

Not produced: any change to how a calendar lays out. The study changes one thing in the app, a localhost-only hook
(§6), inert everywhere else.

## 4. The tool: "Layout Study"

A local page under `tools/layout-study/`, served by its own small server, never deployed, never part of `dist/`.

### 4.1 One screen

- **One decision point**: "where does *Post* go in the week of 3/16/26?" — named at the top, with the phase outlined
  in every candidate.
- **Every legal candidate for that one decision, side by side**: each free column, plus a new column on the right.
  Typically 2–3; never more than 5 (beyond that, today's answer and the four nearest alternatives). Everything else
  in the calendar is held at today's answer, so the candidates differ in that one phase's column and nothing else.
- Each candidate is **the real grid**: the build in an iframe, the seed loaded through the shareable-copy
  `saved-state` path (the one the harness's `?state=` uses) and the candidate's columns forced by the hook (§6).
  The study page, same origin, injects a style that hides everything but the grid and crops to the year block(s)
  the phase runs in. What the owner judges is what the app would draw.
- **Answers** (keys in brackets): one candidate `[1–5]`; **both / all fine** `[B]`; **something else is wrong here**
  `[N]` with a one-line note (the candidate set is exhaustive for the decision, so "neither" can only mean the
  problem is another phase, or the spans — the note says which); **unsure** `[U]` (counted, weighted low);
  **back** `[←]` re-answers the last screen.
- A **progress line**: screens done, the question being worked (§5), and the current hit rate of today's rule.

### 4.2 Span screens

The second sitting (§5, S-questions). Same page; the candidates differ in cell widths, expressed through
`cellSpans` entries written into the candidate's state (`{l, r, k}` with `k` = that row's phase count, so the frozen
override code honours them in full). No hook is needed for spans.

### 4.3 Seeds, cases and candidates

- **Seeds** are the owner's real calendars, in any of three forms (owner's question, 4 Nov 2026):
  - **`.sptcal` or legacy `.html`** — complete; the engine reads both (the server extracts the snapshot the way
    `parseCalendarText` does). ⭐ One carrying hand swaps, `colFollow` or dragged `cellSpans` is the most valuable
    kind: those overrides are the owner's own corrections of today's rule, labels for free. Send them as they are.
  - **PDFs** — a waterfall PDF from SPTCal, or a calendar made elsewhere (the old Excel ones) printed to PDF.
    Transcribed into a `.sptcal` by Claude in the session (phases, starts, lengths, hiatuses, Sim Post, region),
    the owner confirming each transcription on its first screen. ⭐ A calendar made OUTSIDE SPTCal also carries an
    **answer key**: the columns and widths a person chose. Its layout is recorded with the seed, and today's rule is
    checked against it directly — a case where they agree needs no pick, and where they differ the pictured layout
    is pre-marked and the owner only confirms.
  - **JPGs and screenshots** — the same as PDFs, transcribed by eye. Dates and week counts must be legible; where
    they are not, the owner supplies them, because a handoff gap of one week versus two is exactly what P2 asks.
    The pictured layout is an answer key as above.
  - Every seed is checked once by the owner, rendered by the real grid beside its source, before it is used.
- **Cases** are decision points. The generator walks each seed in start order and keeps every phase whose placement
  has **two or more legal answers** (a free column and a new one; two free columns; …). Phases with one legal
  answer (nothing free, new column) are not asked.
- **Variants** fill the questions seeds do not cover. Each is a seed with one change — a phase moved by k weeks to
  make a gap of exactly N, a second season cloned 52 weeks on, a phase dropped, a phase shortened — labelled
  "(variant)" on screen, because the owner has not scheduled that calendar and their judgment there is weaker.
- **Order**: questions are worked one at a time (§5), screens inside a question shuffled, seeds before variants.

### 4.4 Numbers

**How many seeds:** a calendar yields about 2–5 placement decisions with more than one legal answer, so the twelve
questions at ~15 consistent picks each would want ~60 real calendars for all-real coverage, which is not realistic;
variants fill the rest. **10–15 distinct calendars is the working minimum, 20–30 ideal**, and past ~30 the returns
fall off unless they differ in shape. Variety matters more than count: different phase counts, one season and two,
with and without Sim Post, custom phases, per-phase hiatuses, a year boundary mid-run, one where a column was
reused, one where it should not have been. Five is enough to start. One calendar the owner considers perfectly laid
out is worth more than five they would accept.

With 10–30 seeds: roughly 150–250 placement screens and 50–100 span screens. At ~10 s a screen that is under an
hour of the owner's time, taken in sittings of ~50. **Stopping rule per question:** once 15 consecutive screens
agree with one candidate rule and no conflict is open, the question closes and its remaining screens are dropped.

### 4.5 Confidentiality (binding, see [`tests/fixtures/README.md`](tests/fixtures/README.md))

- Seeds and the picks file live **outside the repo**: `~/SPTCal Layout Study/seeds/` and
  `~/SPTCal Layout Study/picks.json`, given to the server on the command line. The repo holds the tool and
  synthetic sample seeds only.
- ✅ **The title never reaches Claude** (owner, 4 Nov 2026: *"can you drop the title from the sptcal file before it
  hits claude"*). `tools/layout-study/scrub.mjs` (built the same day) runs on the owner's Mac over the seeds folder
  and writes `seed-NN.sptcal` copies to `~/SPTCal Layout Study/scrubbed/`; **the study tool and Claude read only
  the scrubbed folder.** It blanks the show title, version and location, header lines and templates, every note's
  text, every hiatus name and band text (and the synced-name record, so the app still owns the band), custom
  holiday names, renamed episodes and blocks, side-box text, typed column headings, scenario names, and the two
  stores keyed by a note's text (`mvWfNotePlace`, `mvTextStyles.wfnote`). Dates, durations, phases, region,
  overrides and settings stay, because the layout is made of them; phase names, holiday renames and Sim Post's
  name stay too (vocabulary, not a title). Its report prints **every string that survives**, so the owner reads
  exactly what would reach Claude before anything is copied. The seed → original mapping is written beside the
  originals, never beside the copies. Proven 4 Nov 2026 on five fixtures (one a legacy `.html`): key sets and
  every field id unchanged, titles blank, and `seed-04` (side boxes, hiatus names, notes) opened in the build with
  the placeholders drawn. PDFs and images are skipped by it: black out the title before dropping those in.

  ```bash
  node tools/layout-study/scrub.mjs "$HOME/SPTCal Layout Study/seeds" "$HOME/SPTCal Layout Study/scrubbed"
  ```
- Nothing from a seed reaches `LAYOUT-RULES.md`, a fixture, a commit message or HANDOFF: a rule is stated on
  made-up dates and generic names. A real case that reproduces a rule is rebuilt as a synthetic twin, as
  `stintswap-reshape` was.
- The tool runs on localhost only and the hook (§6) answers on localhost only.

## 5. The questions

Each question names its candidates and today's answer (★). A screen belongs to exactly one question.

### Placement (not frozen)

- **P1 Freed column or new column.** A column LEFT of a still-running phase has been free for a while. Take it ★(on)
  / open a new column on the right ★(off). This is the reuse question itself, asked on real cases.
- **P2 The handoff gap.** The freed column's occupant ended N weeks before this phase starts: N = 0 (same week),
  1, 2, 4, 8, 26, 52. Which N still reads as a handoff? Today: 0, or only all-phase hiatus weeks between (Q5);
  any other gap falls to the free-column rule.
- **P3 Two columns free.** The one whose occupant is this phase's "Start after" predecessor ★ / the one freed most
  recently / the leftmost / the one its own kind used last (Prep after Prep) / the one already used in this year ★.
- **P4 Top of a year.** Two columns first appear in the same week of a new year block. Production left ★(on, Q2) /
  the earlier starter left ★(off) / whichever was left last year (continuity).
- **P5 Second season.** S2's Prep starts after S1's Post ends and every column is free. S1 Prep's column (kind
  continuity) / the lowest free ★(off) / the one already used in the year ★(on, 4 Nov).
- **P6 A short phase in the middle.** A phase that starts while others run and ends before them: right of everything
  ★ / between two of them. ⚠️ Within a year the order is first-appearance, frozen. If the owner wants "between",
  the build is a frozen edit or a generated stint swap (§9); the study still asks, to learn whether it is wanted.
- **P7 Custom phases.** As any phase ★ / always right of the built-ins / by their position in the phase list.
- **P8 Across a per-phase hiatus.** A column whose occupant is paused (its own hiatus) for the weeks this phase
  runs: still busy ★ / free for the pause.

Not asked: Sim Post's lane (SP1, ruled 2 Nov 2026); a hidden phase (takes no column, PHASES-TAB-PLAN §2.2).

### Spans (frozen `computePhaseRowLayout`)

- **S1 The even share.** Two phases, four columns: 2 + 2 ★ / the left one wider / Production wider / each as wide
  as its own run allows.
- **S2 A short overlap.** A 30-week phase beside a 3-week one: narrow for its whole run ★ / wide outside the three
  shared weeks (the cell changes width mid-run).
- **S3 Left absorb.** A lone phase whose left column was used earlier in the year: fills the width ★ / stays in
  its own column.
- **S4 Over the Sim Post lane.** Spanning across the lane in weeks Sim Post is not active ★ / never.

Not asked: a per-phase hiatus band's width (ruled 1 Sep 2026: as its phase).

## 6. The one app change: a localhost-only layout hook

`?layout=<json>` on the page URL, read **once, in `computeSchedule`, at the `segCol` block**, exactly where
`colReuse` chooses between the two placements today (sanctioned pattern: it decides `col` and nothing else, and
frozen `computeBlockLayout` / `computePhaseRowLayout` read `col` as data).

- Form: `{ "production": 0, "prep": 1, "post": 1, … }`, phase key → column index.
- Honoured only when `location.hostname` is `localhost` / `127.0.0.1` (the `monthPdfMode()` regexp) AND every
  phase in `wfSegments` is in the map. A half map is ignored whole, so the hook can never produce a layout nobody
  asked for. Elsewhere, or absent, both placements run byte for byte as today.
- Not saved, not state, never in `captureSnapshot()`; the swap stores and `colFollow` still apply on top, as they
  do to either placement.
- Precedent: `?gate=`, `?brand=`, `sptcal.mvPdfTest`, `sptcal.gateTest`.
- Leg `layouthook`: absent → placement identical to today on `colreuse.sptcal` both ways; present → the forced
  columns, read back with the table reader `colreuse` uses; a map missing one phase → ignored. Its inertness is
  the full gate: every baseline byte-identical.

## 7. From picks to rules

1. For every screen the generator records the **features** of each candidate, not just the pick: the gap in weeks
   since the column freed, whether its last occupant is the chain predecessor / the same kind / in this year,
   whether the year block is new, the phase's length, its overlap with each neighbour, the number of columns each
   candidate gives the year.
2. `tools/layout-study/derive.mjs` tests a library of candidate rules (today's two placements and every alternative
   named in §5) against every pick and prints an **agreement table** per question.
3. The decision list is written from that table, by hand, in the order the rules fire. A rule with under ~90%
   agreement is not a rule yet: its disagreeing screens are re-shown to the owner **in pairs** ("you took the freed
   column here and a new one here — what is different?") until the condition is found or the owner says both are
   fine.
4. "Both fine" picks are the rule's **latitude**: where either answer is accepted, the rule keeps today's answer,
   because that changes the fewest existing calendars.
5. **Unsure** and **variant** picks count half.
6. The stopping rule (§4.4) ends a question; the study ends when every question is closed or the owner stops.

## 8. Tests

- `layouthook` (§6) on the pre-hook build is red (the map does nothing); with the hook, green; the full gate's
  baselines unmoved.
- The study tool itself: a `check` script loads the synthetic sample seeds, generates their cases and asserts the
  candidate counts and that each candidate's forced columns differ from the others in exactly one phase.
- The rules (deliverable 3 in §3): one synthetic fixture per rule, each red on today's build where the rule
  differs, green on the build. Written during the study, so the build plan starts with its gate in hand.

## 9. The build that follows (its own plan, after the rules exist)

- **Placement v3** replaces `placeSegmentsReusingColumns` behind the ON path. Not frozen. Reuse-ON calendars may
  re-lay out (the owner accepted exactly this on 4 Nov for rule 3); reuse-OFF calendars do not move.
- **Order and spans**: only if a P6 or S-question moves. A frozen edit, asked for with its measurement (the rule
  fixtures reproduced, every other baseline byte-identical), as CLAUDE.md requires. A P6 "between" could instead
  be emitted as a stored stint swap, which the frozen order already honours; the plan weighs the two.
- **Reuse Empty Columns** (ruling R5, taken THEN, with the hit rate known). My recommendation: the switch leaves
  the UI only once placement v3 reproduces every seed; new calendars are always on; `colReuse` stays a readable key
  forever; a file saved with it clear opens as it always did and gets a one-time strip offering "Lay out
  automatically" (the shape of the holiday-correction strip), never a silent conversion. The swap drag and
  `colFollow` stay as the manual override whatever the rule says.

## 10. Steps

1. **The hook** (§6) and leg `layouthook`, on branch `layout-hook` in a worktree from `origin/main`. Targeted legs
   (the swap/reuse mini-gate) and a full gate. Small.
2. **The tool**: server (seeds from a folder outside the repo, `saved-state` substitution as `srv.js` does, the
   `?layout=` pass-through), the page (§4.1), the generator (§4.3), the picks store, keyboard, the `check` script,
   two synthetic sample seeds. Proven in the browser pane on the samples.
3. **Sitting 1 — placement** (P1–P8, ~150–250 screens, ~30–40 min). Then `derive.mjs`, the agreement table, the
   conflict pairs re-shown.
4. **Sitting 2 — spans** (S1–S4, ~50–100 screens).
5. **`LAYOUT-RULES.md`** and the rule fixtures. The owner reads the rules; a rule they do not recognise goes back
   to a screen.
6. The build plan.

## 12. As built, 4 Nov 2026 (branch `layout-study`, worktree `.claude/worktrees/layout-study`)

The seeds came as **17 screenshots and one PDF, no `.sptcal`** (one, a calendar for several shows at once, the owner
set aside). So the study's first stage was the §4.3 "by hand" path, and the answer-key comparison replaced the
first sitting of picks:

- **`tools/layout-study/scrub.mjs`** copied them to `scrubbed/by-hand/hand-NN` under neutral names (§4.5).
- **`scrubbed/specs.json`** (outside the repo): every picture transcribed — phases, Mondays, week counts, hiatuses,
  Sim Post — plus its layout as the answer key (`cols` per year block, `wide` cells). 15 distinct seeds; two were
  duplicates of others.
- **`tools/layout-study/transcribe.mjs`** builds a `.sptcal` from each entry on a blank snapshot (region None, one
  5-day episode per pictured Production week, title blank). Each checked in the pane against its picture.
- **`tools/layout-study/compare.mjs`** opens every seed in headless Chrome with Reuse Empty Columns off and on,
  reads the rendered grid row by row and scores column and width per phase-week against the key
  (`scrubbed/engine/`, `compare-report.txt`). Sim Post's lane is scored apart (SP1).
- **The hook (§6)** is in `src/legacy/app.js` at the `segCol` block, as planned; proven in the pane.
- **`tools/layout-study/serve.mjs` + `index.html`**: the study page. Per seed, three real grids side by side — A
  today off, B today on, C the picture's own layout (the hook for columns, `cellSpans` for widths, solved from the
  key by `/candidate`) — the picture under them, and **one question per difference** (`/diffs`, runs of weeks):
  Picture / Today / Either, with a note; then "is the picture how it should look today?" per seed. Picks go to
  `~/SPTCal Layout Study/picks.json`. Run: `node tools/layout-study/serve.mjs 8978 "~/SPTCal Layout Study/scrubbed"
  .claude/worktrees/layout-study/dist/index.html` (launch.json `layout-study-8978`), open `http://localhost:8978/`.

**What the comparison found before a single pick** (1,645 phase-weeks over 15 seeds; today's rule reproduces the
pictures in **82.3%** of them with Reuse off and **71.6%** with it on; off is 100% on five seeds, on is 100% on two):

- **F1 — Reuse ON mis-seats Production beside Sim Post.** Writers and Prod Prep both end the week before the
  shoot; the handoff tie goes to the chain predecessor (Prod Prep's column), Production is renumbered 0, and the
  frozen first-appearance order then leaves Writers' column on the left, so Production absorbs it (2 wide) and
  Sim Post opens a THIRD column. Every picture puts Production in the LEFT free column and Sim Post in Prod
  Prep's. Seeds 01, 06, 10, 11, 15, 16. Reuse off gets all of these right.
- **F2 — Wrap and Post starting together.** When a 3-week Wrap (custom) and Post both start the week Production
  ends, the pictures give Wrap Production's column and Post the Sim Post column (or the next one); both modes
  give Post the handoff (phase order: built-in before custom). Seeds 06, 09, 11, 12, 13.
- **F3 — The top of a year.** Reuse ON's "Production's column is 0" (Q2) orders 02, 03 and 07's year blocks wrong:
  the pictures order a year's columns by the start date of the phase at the top of each column (continuing phases
  by their start, new ones after). Hand-08 — the only seed Q2 was needed for — fits that rule as well.
- **F4 — Widening (frozen).** A phase widens the week its neighbour's column frees: Prod Prep's last week after
  Writers closes; Post once Wrap ends. Today a phase stays as narrow as its whole run needs. Seeds 06, 09, 11, 12,
  13, 15, 16 — the single largest source of misses. Two pictures go the other way: hand-08 never widens (its
  columns have roles per year), hand-05's Post stays one column with two free beside it.
- **F5 — Localization after Post:** beside it in a new column (07) or stacked in Post's column (05, 08). A conflict
  the owner settles.
- **F6 (frozen)** — hand-05: a phase alone before a hiatus band stays one wide; today the band splits the run and
  the weeks before it widen.
- **F7** — hand-05: Post, then Localization, continue in the Sim Post column with two free columns to their left.
- Sim Post left of Production in hand-09's first year: not scored (SP1).

Leg `layouthook` (§6) is in `gate.sh` after colreuse and green on the branch (a full map forces every slot; a half
map is ignored whole). Still to do before merge: a full gate. The `LAYOUT-RULES.md` of §3 waits for the picks.

## 11. Owner calls (R2, R3, R5, R6 ruled 4 Nov 2026, by picker, each as recommended)

- **R1 Seeds.** OPEN — the owner gathers them. Any mix of `.sptcal`, old `.html`, PDFs, JPGs and screenshots
  (§4.3), into `~/SPTCal Layout Study/seeds/` (outside the repo). 10–15 minimum, 20–30 ideal (§4.4). More seeds
  mean fewer variants.
- **R2 Per screen.** ✅ **Every legal candidate for the one decision** (2–3 typical, 5 max).
- **R3 Scope.** ✅ **Placement first, spans in a second sitting.**
- **R4 "Both fine" as an answer.** Assumed yes (not put to the picker): forcing a pick where either is right teaches
  noise. Say so if you want it out.
- **R5 Reuse Empty Columns.** ✅ **Decided after the study**, on the measured hit rate (§9).
- **R6 The hook.** ✅ **Ships in the product build**, localhost-only and inert, like `?gate=`.
