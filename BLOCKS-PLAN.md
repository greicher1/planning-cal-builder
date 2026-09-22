# BLOCKS-PLAN.md

**Status:** ✅ **ALL FOUR STEPS BUILT 22 Sep 2026** (§9, §10) — steps 1–3 touch no frozen code;
step 4's one frozen edit was shown to the owner as PDFs and approved before committing. Committed
locally; **push held by the owner**. **Ten rulings**: four on 16 Sep 2026, six more on 22 Sep 2026 (§7).
**Written:** 16 Sep 2026, against `3338f55`.
**Related:** [`MONTH-VIEW-PLAN.md`](MONTH-VIEW-PLAN.md) — §5 of this plan collides with its gate.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md).

---

## 1. The request

> *"in the 'Show' tab you should be able to toggle between 'Episodes' and 'Blocks'. When you switch
> to block mode, you then can enter a number of shooting blocks (in addition to number of episodes)
> and then you enter the number of days per shooting block. From there, within the phases section,
> the episodes should be evenly divided among the blocks (so 5 blocks with 10 episodes would be 2
> eps per block) but you should be able to click and drag episodes between blocks to adjust which
> episodes are in each block. What this all really effects is that in the full month view calendar,
> each shooting week should be tagged with a little smaller subtext saying which block each week
> is."* — 16 Sep 2026

---

## 2. What already exists, and why it matters

⭐ **Episodes already drive Production's duration.** This is not a display concern — it is the
schedule's input:

```js
// showInfoStatus()
episodeDefs.forEach(e => { ... totalShootDays += n; });          // sum of the episode rows
if(!hasRows && ...) totalShootDays = perEp * numEp;              // fallback before rows exist

// computeSchedule
if(p.key === 'production' && info.complete) rawValue = info.totalShootDays;
```

`episodeDefs` is `[{id, name, days, nameEdited, daysEdited}]`, and `episodeSpans()` slices the
derived `shootDays[]` array sequentially to lay episode pills out in the month view.

⛔ **So Blocks mode introduces a SECOND way to compute Production's length, and the two can
disagree.** 5 blocks × 20 days = 100; 10 episodes × 8 days = 80. That conflict is the central design
problem of this feature — everything else is comparatively easy.

---

## 3. Proposed: the mode switch chooses which input drives the schedule

| Mode | Drives `totalShootDays` | Days-per-episode field | Episodes |
|---|---|---|---|
| **Episodes** (today) | `Σ episodeDefs[].days` | shown, drives the total | the unit |
| **Blocks** | `numBlocks × daysPerBlock` | **hidden** — it is no longer the driver | grouped into blocks, for labelling |

This matches the request: in Blocks mode the owner enters *blocks* and *days per block*, not days per
episode. Episode count is still entered, because episodes still need to exist to be assigned.

⚠️ **Switching mode changes the schedule**, so it must be reversible without data loss: keep both
`episodeDefs[].days` and the block numbers stored, and let the mode decide which is read. Switching
back to Episodes must restore the previous dates exactly. **Never discard the other mode's inputs.**

⚠️ **`showInfoStatus()` is the choke point.** It already decides `totalShootDays` and already gates
"Show Info complete". Blocks mode belongs *inside* it, not beside it — one function deciding the
total, as now. It is not frozen.

---

## 4. Blocks and the episodes inside them

### 4.1 ✅ RULED: default split, remainder to the FRONT

10 episodes / 5 blocks → 2 each. Uneven splits front-load: **10 / 3 → `4,3,3`**, not `3,3,4`.
⚠️ **Say this in a comment.** It is a coin-flip rule, and the next reader will wonder whether the
other order was a bug.

### 4.2 A block holds a SET of episodes, not a range

Real shoots group out of order — episodes 1, 2 and 5 can shoot together. So the assignment is
`{blockId: [episodeId, ...]}`, and dragging an episode between blocks does not have to preserve
order. ⚠️ **Do not model it as "episodes 1–3 belong to block 1"**; that reads simpler and is wrong
the first time someone shoots out of order.

### 4.3 ⚠️ Assignment affects LABELS, not dates

Block *durations* set the dates (§3). Which episodes sit in which block only changes what the month
view says. Dragging an episode from block 2 to block 3 must **not** move a single date.
⛔ That is the property that keeps this feature cheap. If assignment ever affects duration, blocks
become a scheduling model and this plan is void.

### 4.4 ✅ RULED: per-block day counts get INDIVIDUAL overrides

> Owner, 16 Sep 2026: **"should get individual overrides"**

So `days-per-block` is a **default applied to new blocks**, not a global constant — exactly the shape
`episodeDefs` already has:

```js
blockDefs = [{ id, name, days, daysEdited }]     // mirrors episodeDefs
```

⭐ **This makes both modes structurally identical, which is the point:**

| Mode | Total shoot days | Fallback before rows exist |
|---|---|---|
| Episodes | `Σ episodeDefs[].days` | `perEp × numEp` |
| Blocks | `Σ blockDefs[].days` | `numBlocks × daysPerBlock` |

`showInfoStatus()` already implements the left column. Blocks mode is the same function reading a
different array — not a second code path. **Build it that way.**

### 4.5 Where the drag lives

*"within the phases section"* — the Phases tab. That is **chrome, not frozen**: sidebar markup and
its own popovers. No freeze ruling needed for the drag-between-blocks UI itself.

---

## 5. ⛔ The month-view subtext — AND A GATE COLLISION

> *"each shooting week should be tagged with a little smaller subtext saying which block each week is"*

This is new markup inside `renderMonthView`, which **is** the month PDF's document
(`MANTINE-SEAM.md` §5.2). A frozen edit, like the day-override marks and drag handles.

⛔ **But it CANNOT use the gate those were approved against.** That gate's second condition is:

> `mvNoteLineCount()` row heights unchanged

Month-view row heights derive from how much content a week must carry. **Adding a subtext line to
every shooting week is exactly a height change.** The feature cannot pass its own acceptance test.

**So this needs its own gate.** Proposed:

1. Row heights change **only** on weeks carrying a block tag, and by **one line**, bounded.
2. The month PDF still paginates the same — ⚠️ **the real risk**: taller rows can push a month onto
   an extra page, which changes the page count of every month PDF.
3. No change at all to the month view with Blocks mode **off** — byte-identical output.
4. Gates 1–5 unchanged.
5. ⛔ **Two PDFs shown to the owner BEFORE anything is committed** — one with Blocks mode on, one
   with it off — so the subtext and the page count are seen, not merely asserted by a test.

> Owner, 16 Sep 2026: **"Approved, but show me the PDF first"** — the frozen edit is approved
> against this gate, with condition 5 as an explicit precondition to committing.

⚠️ **Condition 3 is the important one.** It means the whole feature is invisible unless switched on,
so no existing calendar's PDF can move. Build it that way and the blast radius is zero.

### 5.1 ✅ RULED: a split week names BOTH blocks

> Owner, 16 Sep 2026: **"Both — 'Block 1 / 2'"**

A block boundary falls mid-week whenever a block's day count is not a multiple of 5 — which is most
of the time. Such a week is tagged with every block it touches: **`Block 1 / 2`**. Nothing is hidden
from whoever reads the calendar, which is the reason it won over "whichever owns more days".

⚠️ **A week can touch THREE blocks** if a block is shorter than five shoot days — legal once §4.4
allows per-block overrides. `Block 1 / 2 / 3` must not overflow the day column or silently clip.
**Measure it at the narrowest month-view column before assuming it fits**, and decide then whether
to abbreviate (`B1/2/3`). This is the same width trap that has bitten the grid twice before
(`HANDOFF.md` §3).

---

## 6. Save format

⛔ New ids and keys are **permanent** once shipped — `collectFieldValues()` sweeps every
`input[id]` / `select[id]` into `fields.byId`, and `union-place` already demonstrated the cost of
getting a key name wrong.

| New | Where | Note |
|---|---|---|
| `show-mode` (`episodes` \| `blocks`) | DOM field → `fields.byId` | ⚠️ **absent must mean `episodes`**, so every existing calendar is unaffected |
| `num-blocks`, `days-per-block` | DOM fields → `fields.byId` | named once, permanent |
| `blockDefs` / episode→block map | `captureSnapshot()` + `applyStateSnapshot()` + resets | restore unconditionally: `snap.x ? {...snap.x} : {}` |

⚠️ Blocks are **not** week-keyed and **not** day-keyed — they are ordinal. `shiftCalendar` should not
touch them at all. Unlike `dayOverrides` (`MONTH-VIEW-PLAN.md` §4.3), there is nothing to re-key.

---

## 7. ✅ Rulings received (16 Sep 2026)

| # | Question | Ruling |
|---|---|---|
| 1 | Uneven episode split | **Front-loaded** — 10 / 3 → `4,3,3` (§4.1) |
| 2 | Mid-week block boundaries | **Name both** — `Block 1 / 2` (§5.1) |
| 3 | Frozen edit to `renderMonthView` | **Approved**, against §5's gate, **and the two PDFs must be shown before committing** |
| 4 | Per-block day counts | **Individual overrides**, mirroring `episodeDefs` (§4.4) |
| 5 | *(22 Sep)* What Production's lane shows in Blocks mode | **Production's own pills, no episode pills — and the week tag names the block AND its episodes**, e.g. `Block 1 · 201, 202` |
| 6 | *(22 Sep)* The waterfall header's "8-Day Shooting Schedule" in Blocks mode | **`… / 5 Shooting Blocks`** — the block count, which stays true when blocks differ in length |
| 7 | *(22 Sep)* A pill piece too short for the tag (a one-day piece) | **Omit the tag on one-day pieces** (offered: shrink to fit; ellipsis) |
| 8 | *(22 Sep)* Episodes mode, too | **"Production Week N" is always the pill's primary text; the episodes being shot are the grey text** — episode pills are retired in both modes |
| 9 | *(22 Sep)* Shooting order | **Drag episodes to reorder in Episodes mode.** Numbers never change; only which days each episode occupies. The order also drives Blocks' automatic split |
| 10 | *(22 Sep)* Turning the grey text off | **Per-user Preferences, "Show Blocks in Month View" / "Show Episodes in Month View", default on** — accepting that two people printing one calendar can differ |

**Owner adjustments on seeing the PDFs, 22 Sep 2026, all made:**
- *"why can't the block number/episode numbers be written in the green pills as smaller grey text
  next to production wk"* — the tag moved **inside Production's pill**. The first cut was a lane of
  its own (one line, 20 px, on every shooting week); inside the pill it costs **no height at all**.
- *"Can we put 'Ep' before the episode numbers"*, then *"Maybe it should be 'Ep.'"* — **`Ep.`**, once
  per list: `Ep. 205, 202`, `Block 1 · Ep. 201, 202`.
- *"make sure there is enough spacing between those two toggles"* — the card's divider between them.
- *"Single column mode setting should only show in waterfall view and the two show in month view
  settings should only show up in the month view"* — done in CSS off the view toggle. ⚠️ It
  reverses a 10 Sep decision that Single Column should NOT hide by view.

**Why 5 and 6 were asked, when the plan said nothing was outstanding.** Both were found while
building step 1, and both are consequences the plan did not see. (5) The month view draws each
episode as a pill spanning *its own* day count. In Blocks mode those counts drive nothing, so the
pills would not cover the shoot: 10 × 8 = 80 days of pills over a 100-day block schedule. And block
shooting cross-boards a block's episodes, so laying them end to end would draw a sequence that is
not the shoot. (6) The Days per Episode field is hidden in Blocks mode but keeps its value, so the
waterfall header would print a number nobody can see.

⚠️ **Ruling 5 widens §5.1's width problem.** The tag now carries episodes as well as blocks, so a
split week reads something like `Block 1 · 201, 202 / Block 2 · 203, 204`. Measure it at the
narrowest month-view column *before* choosing an abbreviation. The §5.1 warning applies twice over.


## 8. Suggested order

Steps 1–3 touch no frozen code.

1. **Mode toggle + the two fields**, with `showInfoStatus()` choosing the driver (§3). Prove
   switching modes and back restores dates exactly.
2. **Block model + even split** (§4.1), no UI beyond the numbers.
3. **Drag episodes between blocks** in the Phases tab (§4.4) — chrome.
4. ⛔ *Frozen work.* Month-view subtext, against §5's gate, **off by default** — and ⛔ **export both
   PDFs and show the owner before committing** (§5 condition 5).

⚠️ **Cut a `.sptcal` fixture at steps 1 and 2** — the save format moves in both.

## 9. ✅ As built — steps 1–3 (22 Sep 2026)

**No frozen code.** Chrome (`Sidebar.jsx`, `legacy.css`'s React-cards section) and non-frozen engine
functions only. `episodeSpans()` is not on the frozen list, and ruling 5 is delivered there: it
returns `[]` in Blocks mode, and the frozen renderer already draws Production whenever it is empty.

| | |
|---|---|
| The switch | `#show-mode`, a `NativeSelect`, **Schedule by: Episodes / Blocks**. Not a `SegmentedControl` (a radio per segment, each with a generated id). The **values** are the contract; the look can change without a migration |
| Which fields show | pure CSS off the select's **checked option** (`:has()`), not an engine-toggled class. The select is the only source of truth, so no restore, undo or open path can leave the fields out of step with the mode that is actually scheduling |
| The driver | `showInfoStatus()` — one function; the Episodes branch is the old body verbatim. Blocks mode requires Season, Number of Episodes, Number of Blocks and Shooting Days per Block |
| The model | `blockDefs = [{id, name, days, daysEdited, episodes:[episodeId]}]`, `blockCounter`, `blockAssignEdited` |
| The split | front-loaded (ruling 1), recomputed while `blockAssignEdited` is false |
| A hand arrangement | once an episode is dragged, the arrangement is the user's and is only ever **reconciled**: a gone episode drops out, and one no block holds (new, or whose block was removed) joins the **last** block. ⚠️ These two rules are mine, not rulings. They are the least-surprising defaults I could find, and cheap to change |
| The drag | HTML5 drag-and-drop in the Production row's panel; the whole block row is the drop target; **one move = one undo step** (the flush/commit `pushUndoSnapshot()` pair). Desktop only: HTML5 drag does not work on touch |
| Save format | three `fields.byId` ids (`show-mode`, `num-blocks`, `days-per-block`), and three snapshot keys, written in **both** modes. **An absent `show-mode` means Episodes**, enforced in `applyStateSnapshot()`, not merely by the markup default |
| Header | ruling 6, in `computeHeaderDefaults()` r1 **and** the `{production.summary}` token, in lockstep; `{shootDaysPerEp}` is empty in Blocks mode |

**Proved** by the new `blocks` gate leg on a minted fixture (`tests/fixtures/blocks.sptcal`), and by
driving the dev build with real mouse gestures: a real drag moved an episode, one `cmd+z` put it
back, and `cmd+shift+z` redid it. Full gate: **351 pass, 0 fail**, with every Episodes-mode output
identical (waterfall PDF, Excel, all four month-PDF cases, the v1.0.0 restore). Gate 5 re-cut
59 → 62 ids, recorded in that baseline's README.

⭐ **The restore default was proven necessary by removing it.** Without it, a pre-Blocks calendar
loaded after a Blocks one was scheduled **in Blocks mode, from the previous file's block count** —
90 days, wrap 11/10/26, instead of 80 and 10/27/26. That is someone else's plan on your show, with
no error anywhere.

## 10. ✅ As built — step 4 and rulings 7–10 (22 Sep 2026)

**The one frozen edit** is in `renderMonthView`'s Production-pill `place()` call, which appends
`<span class="mv-pill-block">` holding `productionPillTag()`'s text, plus the frozen CSS rule
`.mv-pill-block` (9 px, `#5C6470`, `vertical-align:top` so the smaller font cannot grow the line box).
Everything else is non-frozen:
- `episodeSpans()` returns `[]`, retiring episode pills (ruling 8); the renderer's episode branch is
  now dead code, left in place.
- `productionPillTag()` and `episodeListLabel()` build the grey text, which folds runs of 3+
  consecutive episodes into a range (`203–205`).
- `episodeShootOrder` and `effectiveShootOrder()` carry the shooting order (ruling 9).
- `prefs.mvBlocks` / `prefs.mvEpisodes` carry ruling 10.

| §5 condition | result |
|---|---|
| 1. row heights change only on tagged weeks, by one line, bounded | ⭐ **better than asked: no row height moves at all** in Blocks mode (A/B fit tables identical) |
| 2. the month PDF paginates the same | ✅ every case one sheet per month, every month still `fill` |
| 3. no change with Blocks off | ✅ `blocksoff` is byte-identical to `reference`. ⚠️ Ruling 8 then **deliberately** changed every episodic calendar's month PDF — re-cut, recorded, and shown to the owner |
| 4. gates 1–5 unchanged | ✅ (gate 5 re-cut 59 → 62 in step 1, recorded) |
| 5. two PDFs shown before committing | ✅ three rounds of PDFs, approved |

⚠️ **The one row ruling 8 moved** is a pre-existing gap, now closed. A half day pushes a calendar's
last shoot day past the episodes' total, and episode pills count entries, so the wrap day had **no
pill at all**. Production's own pill now covers it. See the monthprint baseline README.

**Measured, not assumed (§5.1):** in the fixtures no pill is ever clipped, on screen or at the
printed width. There is at least 56 px of headroom in print, and the forced three-block week
(`Block 2 · Ep. 203–205 / Block 3 · Ep. 206 / Block 4 · Ep. 207, 208`) still fits. Only a one-day
piece could not fit, which is ruling 7.

**Save format:** `episodeShootOrder` is a new snapshot key; `[]` means natural order and it is
restored unconditionally. The two preferences are **not** calendar data: they sit inside
`.prefs-card`, never in `fields.byId` or the snapshot, and the `shootorder` leg measures that
flipping one pushes no undo step.
