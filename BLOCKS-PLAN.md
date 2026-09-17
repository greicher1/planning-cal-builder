# BLOCKS-PLAN.md

**Status:** plan only. No code. **All four rulings received 16 Sep 2026** (§7).
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

Nothing outstanding. This plan is ready to build when the owner wants it.


## 8. Suggested order

Steps 1–3 touch no frozen code.

1. **Mode toggle + the two fields**, with `showInfoStatus()` choosing the driver (§3). Prove
   switching modes and back restores dates exactly.
2. **Block model + even split** (§4.1), no UI beyond the numbers.
3. **Drag episodes between blocks** in the Phases tab (§4.4) — chrome.
4. ⛔ *Frozen work.* Month-view subtext, against §5's gate, **off by default** — and ⛔ **export both
   PDFs and show the owner before committing** (§5 condition 5).

⚠️ **Cut a `.sptcal` fixture at steps 1 and 2** — the save format moves in both.
