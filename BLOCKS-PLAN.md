# BLOCKS-PLAN.md

**Status:** plan only. No code. Owner asked for it as a separate document to implement later.
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

### 4.1 Default split

10 episodes / 5 blocks → 2 each. ⏸ **Ruling needed for the uneven case:** 10 episodes / 3 blocks is
`4,3,3` or `3,3,4`. Pick one and say so in a comment; either is defensible, silence is not.

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

### 4.4 Where the drag lives

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

⚠️ **Condition 3 is the important one.** It means the whole feature is invisible unless switched on,
so no existing calendar's PDF can move. Build it that way and the blast radius is zero.

### 5.1 ⏸ Block boundaries will not align to weeks

A block boundary falls mid-week whenever `daysPerBlock` is not a multiple of 5 — which is most of
the time. So a single week can contain the end of block 2 and the start of block 3.

**Ruling needed.** Options: tag with both (`B2 / B3`), tag with whichever owns more shoot days in
that week, or tag with whichever the week *starts* in. No default is obviously right, and the answer
changes the markup.

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

## 7. ⏸ What the owner owes before this is built

1. **Uneven split rule** (§4.1) — `4,3,3` or `3,3,4`.
2. **Mid-week block boundaries** (§5.1) — both, dominant, or starting block.
3. **A second frozen-edit ruling**, against §5's gate — *not* the `MONTH-VIEW-PLAN.md` one, which
   this feature cannot satisfy.
4. **Are per-block day counts uniform?** The request says *"the number of days per shooting block"*,
   singular. Per-block overrides — mirroring how `episodeDefs[].daysEdited` already works — would be
   the natural extension, but they are not in scope unless asked for.

---

## 8. Suggested order

Steps 1–3 touch no frozen code.

1. **Mode toggle + the two fields**, with `showInfoStatus()` choosing the driver (§3). Prove
   switching modes and back restores dates exactly.
2. **Block model + even split** (§4.1), no UI beyond the numbers.
3. **Drag episodes between blocks** in the Phases tab (§4.4) — chrome.
4. ⛔ *Frozen work.* Month-view subtext, against §5's gate, **off by default**.

⚠️ **Cut a `.sptcal` fixture at steps 1 and 2** — the save format moves in both.
