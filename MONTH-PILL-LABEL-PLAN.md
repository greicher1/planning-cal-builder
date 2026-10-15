# MONTH-PILL-LABEL-PLAN.md

**Status: PLAN, 15 Oct 2026. Nothing built and nothing committed.** The owner gave five rulings the
same day (§6). **Step 1, the measurement, is done (§7):** nothing in any mode clips in either PDF.
On screen the new modes lose only grey text, where today's labels lose the block and the episodes.
On those numbers the owner ruled that Episode and Block modes **split the pill at each episode or
block change** (Q4), and that **no width remedy** is wanted (Q5). **Step 2, the engine, is next.**

---

## 1. The request

> Owner, 15 Oct 2026: *"we need to have a setting in the month view to be able to toggle between the
> production phase showing by either Production week (as it is now) OR by Episode OR by Block number.
> When you toggle between the three, the subtext (in grey) is swapped so it shows the other info in
> the subtext of each phase portion (episode, block, or production week)"*

So Production's pills get a three-way choice of **primary text**. Whatever is not primary moves
into the grey text.

---

## 2. What exists today

These come from BLOCKS-PLAN.md §7 (rulings 7, 8 and 10) and §10:

- **Ruling 8:** the primary text is always *"Production Week N"*, from `segPillLabel()`. The grey
  text comes from `productionPillTag()`:
  - Episodes: *Ep. 201, 202*.
  - Blocks: *Block 1 · Ep. 201, 202*.
  - A split week: *Block 1 · Ep. 201, 202 / Block 2 · Ep. 203–205*.
- **Ruling 7:** a one-day piece of a pill has no grey text.
- **Ruling 10:** "Show Blocks / Show Episodes in Month View" are per-user switches
  (`prefs.mvBlocks` / `prefs.mvEpisodes`, absent = on). They live in the Preferences card and show
  in the month view only. They never enter a saved file, and flipping one re-renders without
  `update()`.
- **The one frozen edit already made:** `renderMonthView`'s Production `place()` call appends
  `<span class="mv-pill-block">` holding `productionPillTag()`'s text. The frozen CSS rule sets it
  at 9 px, weight 500, `#5C6470`. The primary text is 10 px, weight 600. Both truncate with an
  ellipsis (`.mv-bar`), and the writer copies that ellipsis (`bar-ell`).

---

## 3. What it will show

✅ **Ruled 15 Oct 2026 (Q4, §6): in Episode and Block modes, Production's pill SPLITS where the
episode or block changes.** Production Week mode never splits, and stays exactly as today.

**A calendar scheduled by Episodes**

| Label by | Pills in the week | Pill text | Grey text |
|---|---|---|---|
| Production Week *(today, the default)* | one per week | Production Week 7 | Ep. 204, 205 |
| Episode | one per episode | Ep. 204 · *then* · Ep. 205 | Production Week 7 *(on each)* |
| Block | *unavailable: the calendar has no blocks, so it draws as Production Week* | | |

**A calendar scheduled by Blocks**

| Label by | Pills in the week | Pill text | Grey text |
|---|---|---|---|
| Production Week *(today)* | one per week | Production Week 4 | Block 1 · Ep. 201, 202 / Block 2 · Ep. 203–205 |
| Episode | one per block | Ep. 201, 202 · *then* · Ep. 203–205 | Production Week 4 · Block 1 · *then* · Production Week 4 · Block 2 |
| Block | one per block | Block 1 · *then* · Block 2 | Production Week 4 · Ep. 201, 202 · *then* · Production Week 4 · Ep. 203–205 |

The rules behind those rows:

- **Where a pill splits.** On an Episodes calendar, Episode mode splits at each episode change, by
  `episodeDayMap()`, in shooting order. On a Blocks calendar both modes split at each block change.
  A block's episodes are cross-boarded, so its days cannot be split per episode, and Episode mode
  there names the block's episodes.
- **A pill still breaks wherever it breaks today:** at a weekend, a holiday, a hiatus and the end
  of the row. The split only adds breaks.
- ⚠️ **An untagged day never splits off.** The trailing half-day entries past Σ episodes or Σ
  blocks belong to the piece before them. In the prototype they became one-day pills of their own,
  reading *Production Week 18* (§7.4). An untagged piece that STARTS a row has no piece before it,
  and falls back (below).
- **Because a piece never straddles two blocks or two episodes, no new-mode pill joins names with
  ` / `.** *Block 1 / Block 2* is gone, and with it the one case that clipped in print (§7.3).
  Week mode's own grey text keeps its split form, unchanged.
- **Grey text order is fixed.** It always reads Production Week, then Block, then Episodes, minus
  the pill text's own item and any item the user has switched off (§5.2).
- **"Ep." is written once per list,** as in ruling 8. Runs of three or more consecutive episodes
  fold into a range (`episodeListLabel()`, unchanged).
- **Ruling 7 stands in every mode.** The split makes more one-day pieces, and none of them has grey
  text. A one-day piece has no grey text. Its pill text is usually
  shorter than today's: *Ep. 204* or *Block 2*, against *Production Week 16*.
  - ⚠️ *Corrected by measurement (§7):* on a **Blocks** calendar, a one-day piece names **every
    episode of its block**, because episodes there come from block membership, not from the day.
    The `blocks+force3` case shows *Ep. 209, 210* on one day. A block of four episodes shot out of
    order (*Ep. 207, 201, 205, 203*) is the one pill text that is longer than today's.
- **Fallback.** A run with nothing to show for the chosen label draws exactly as Production Week
  mode. That covers Show Info being incomplete, and the trailing half-day entries past Σ episodes
  or Σ blocks, which today are untagged. The same goes for **Block on an Episodes calendar.** The
  file keeps the choice, so switching Schedule by back to Blocks brings Block back.

---

## 4. ⭐ No frozen edit is needed. Here is why, and what to check

Frozen `renderMonthView` calls two **non-frozen** helpers for every Production pill.
`MONTH-PDF-WRITER-PLAN.md` §2.3 lists both as callable helpers:

```
const lbl    = segPillLabel(s, addDays(weekStart, r.startCol));                  // pill text
const blkTag = productionPillTag(schedule, weekStart, r.startCol, r.endCol);     // grey text
```

Changing what those two return changes what the frozen code draws, and not one frozen line moves.
It is the route ruling 8 took through `episodeSpans()`, and CLAUDE.md's sanctioned pattern 2
(*ask the frozen code, act from outside*).

**The split (Q4) is a third non-frozen helper, `pillRunsForWeek()`.** The renderer draws one pill per
run it returns, and `renderMonthView` is its only caller. In Episode and Block modes it splits
Production's runs where the unit changes (§3), and in Week mode it returns exactly what it returns
today. Every piece then gets its own pill text and grey text from the two helpers above. Measured in
the prototype (§7.4).

- **`segPillLabel(s, date)` knows only where the run STARTS.** It gets no run end and no schedule,
  but Episode and Block need the run's extent. For Production it can work the run out from
  `s.shootDays`: from `date`, step forward within that Sun–Sat row while each day is a shoot day
  **of the same unit** (the split's rule, so the two cannot disagree about where a piece ends).
  - **That matches `pillRunsForWeek` only if a Production shoot day can never be a hiatus day.**
    By reading `simulateProductionSchedule()` (15 Oct 2026), it cannot be. Its `inHiatus` covers
    both a global hiatus and Production's own (`phaseHiatusRanges['production']`), and
    `'on'`/`'onhalf'` never override either ("to work during a hiatus, shorten the hiatus").
  - Reading is not proof, so the new leg **asserts the two runs agree on every fixture** (§8).
  - ⛔ **If they ever disagree, stop.** The fallback is a frozen edit (pass the run's columns to
    one helper that returns both strings). It needs the owner's approval against a gate, and is
    not to be done unasked.
- **One shared helper, `productionRunParts(seg, weekStart, fromCol, toCol)`,** returns
  `{ week, blocks, episodes }`, and both `segPillLabel` and `productionPillTag` read it. Then the
  pill text and the grey text can never disagree about which run they describe.
  - `episodeDayMap()` and `productionPillTag`'s block map are both cached by schedule today. They
    get cached by the Production segment instead, which is also one object per schedule.
  - `segPillLabel`'s other phases (*Writers Room Week 3*) are untouched.
- **The look does not change.** The pill text stays 10 px, weight 600, and the grey text 9 px,
  weight 500. Only which words sit in which part changes. The frozen `.mv-pill-block` rule is
  untouched.
- **Both month PDFs follow on their own:**
  - The print path prints `renderMonthView` itself.
  - The writer parses its HTML. `mvlParseItem` takes the pill text and the `.mv-pill-block` text
    separately, and it already copies Chrome's ellipsis.
- **Excel, the waterfall view and the waterfall PDF cannot move.** The only caller of
  `segPillLabel` and of `pillRunsForWeek` is `renderMonthView`.
- ⚠️ **To check in step 2: the month view's body-drag on split pieces.** Every piece carries
  `data-ph="production"`, as the pieces of a holiday-split pill do today. So dragging any piece
  should move Production, but nothing has driven it yet.

---

## 5. The setting and the switches

### 5.1 "Label Production by", saved in the calendar (Q2)

The model is **`singleColumn`**. That switch also sits in the Preferences card while being
calendar data, and it travels through `captureSnapshot()`'s own key rather than through
`fields.byId`.

- **State:** an engine variable, `mvProdLabel`, holding `'week'`, `'episode'` or `'block'`. The
  control **reflects** it and never holds it, the contract `reflectSingleColumn()` has.
- **A change** goes through `setMvProdLabel(next)`, shaped like `setSingleColumn()`. It does
  `update()` then `markDirty()`, so it dirties the file and is **one undo step**. Unlike ruling 10's
  switches, this one is meant to: it changes the calendar.
- **⛔ The save format (CLAUDE.md, "Every saved calendar must keep opening"):**
  - **A new snapshot key, `mvProdLabel`, permanent from the first file saved with it.** The
    **values** are the contract, so the control's look can change later without a migration.
  - It is written by `captureSnapshot()` and restored **unconditionally** in
    `applyStateSnapshot()`: a valid value, or else `'week'`. **An absent key means Production
    Week**, so every existing calendar opens exactly as it does today. It is never left at whatever
    the previous file held, the trap BLOCKS-PLAN §9 proved real for `show-mode`.
  - It is reset to `'week'` wherever `singleColumn` is reset.
  - It is not week-keyed, so `shiftCalendar` does not touch it.
  - **`SNAPSHOT_VERSION` stays 1.** An older build ignores the key and draws Production Week. That
    loses nothing on screen, and it is the `'onhalf'` precedent. An older build that re-saves the
    file drops the key, which is the forward-only rule every new key lives under.
  - The control sits inside `.prefs-card`, so the sweep skips it, `fields.byId` stays at 62 ids,
    and gate 5 does not move. The **snapshot key is the one store**, so nothing can disagree with
    it.
  - Shareable copies, the crash backup and the undo stack all carry it for free, because all three
    are `captureSnapshot()`.
- **The control (Q1): a three-way toggle, "Label Production by: Week · Episode · Block",** at the
  top of the Preferences card's month-only box (`.pref-view-month`).
  - It is a `SegmentedControl` with an explicit `name` (UI-CONVENTIONS §8.3). Its generated radio
    ids are inside `.prefs-card`, so the sweep skips them.
  - Mantine positions the segment indicator from React state, so the engine cannot write it the way
    it writes a Switch's `.checked`:
    - **value:** reaches React through `bridge.js` (`chrome.mvProdLabel({ value, blockAvailable })`),
      as undo and redo do;
    - **input:** the radios' native `change` events, caught by a `document` listener.
  - **Fallback if the bridge proves awkward:** a `NativeSelect` `#mv-prod-label`, which the engine
    can write directly, as it does `#pref-gridlines`. It keeps the same values, so no migration.
- **Block is disabled on an Episodes calendar,** with a tooltip: "Schedule by Blocks to label by
  block". The stored `'block'` is kept (§3, Fallback).

### 5.2 The Show switches follow the mode (Q3)

The owner's ruling was *"the toggles should contextually change based on what mode we are on"*.
Read that as: **the switches offered are exactly the items the grey text can carry right now.**

| Label by | Switches shown (Episodes calendar) | Switches shown (Blocks calendar) |
|---|---|---|
| Production Week | Show Episodes | Show Blocks, Show Episodes |
| Episode | Show Production Week | Show Production Week, Show Blocks |
| Block | *(draws as Week)* Show Episodes | Show Production Week, Show Episodes |

- **One new switch, "Show Production Week in Month View",** with `#pref-mv-week` and
  `prefs.mvWeek` (absent = on). It follows ruling 10's pattern exactly: inside `.prefs-card`, never
  in a file, and it re-renders without `update()`.
- **Each switch keeps one meaning in every mode.** Turning off Show Episodes under Week keeps
  episodes out of the grey text under Block too. A switch is hidden while its item is the pill text,
  because there is nothing for it to switch: the pill text always shows.
- **Hiding Show Blocks on an Episodes calendar is an extension of mine.** Today it shows there and
  does nothing. The ruling's "contextually" covers it, and it is cheap to undo.
- **Which rows show is pure CSS,** using `:has()` off the toggle's checked radio and `#show-mode`'s
  checked option. That is the pattern `show-mode` already uses, so no restore, undo or open path can
  leave the switches out of step with the calendar. Rows are hidden, never unmounted: the engine
  writes `.checked` by id. Each row carries its own divider, so hiding a row cannot leave two
  dividers stacked.
- **Ruling 10 is otherwise unchanged:** the Show switches stay per user. So two people printing one
  calendar get the same pill text, but can still differ in the grey text (§10).

---

## 6. ✅ Rulings received (owner's picker, 15 Oct 2026)

| # | Question | Ruling |
|---|---|---|
| Q1 | Where does the setting live? | **Settings ▸ Preferences**, beside the Show switches, visible only in the month view |
| Q2 | Is it per user, or saved with the calendar? | **Saved in the calendar.** Everyone who opens the file sees and prints the same labels. A new permanent snapshot key and an undo step (§5.1) |
| Q3 | What happens to "Show Blocks / Show Episodes"? | *"The toggles should contextually change based on what mode we are on"* (§5.2) |
| Q4 | One pill per week, or split where the episode or block changes? *(asked after step 1)* | **Split at each change** (§3, §7.4). Week mode never splits |
| Q5 | A width remedy? *(asked after step 1)* | **None** (§7.5) |
| — | Commit the plan now? | **Hold** until it settles |

---

## 7. ✅ Width, measured (15 Oct 2026)

The long part moves into the larger, bolder face, so this was measured before any code was written.

### 7.1 How it was measured

- **A throwaway prototype.** A scratch copy of `src/legacy/app.js` had §4's two helpers rewired,
  with the mode read from the page's query (`?pilllabel=`). It was built outside the repo and
  served as `dist/_pill.html`, which has since been removed. So the frozen renderer, the print path
  and the writer drew each mode for real. Nothing in `src/` changed.
- **The calendars:** the eighteen behind gates 10 and 13 (`reference`, `blocks`, `blocksoff`,
  `month-dense60`, `monthscale` and the rest), plus `blocks` with block 3 cut to 2 days, which
  forces the three-block week. Each was run in all three modes.
- **The checks:**
  - **Screen:** every Production pill in every month, at windows of 1600, 1280, 961 and 960 px. A
    pill counts as clipped when its text overflows its box (`scrollWidth`, and a Range against the
    content box, the `blocks` leg's method).
  - **The print path:** its document laid out at the printed width (996 px), then printed by Chrome
    to a PDF.
  - **The writer:** the real Export, through a stood-in Save dialog.
  - **Both PDFs:** read back with `pdftotext`, counting `…`.
- **A control:** an over-long label was caught by all four checks. Without that, "nothing clips"
  could have meant "nothing measured".
- **216 runs in all.** `segPillLabel`'s worked-out run matched `pillRunsForWeek`'s in **17,664 of
  17,664** pills (§4's premise). Page counts were identical in every mode.

### 7.2 ⭐ The narrowest window is 961 px, not 960

Above 960 px the app is the fixed shell, with the sidebar beside the calendar, and the day column
shrinks with the window:

| window | 961 | 1000 | 1100 | 1200 | 1280 | 1400 | 1600 |
|---|---|---|---|---|---|---|---|
| day column (px) | **83.6** | 89.1 | 102.6 | 113.1 | 121.6 | 138.3 | 160 |

At 960 px the layout stacks and the calendar gets the full width (a 123.4 px column). The printed
column is 136.3 px. ⚠️ Anyone measuring the month view should measure at **961**, where the column
is narrowest.

### 7.3 Results

**The PDFs: nothing clips in any mode.** No pill overflowed at the printed width on any calendar,
and neither PDF gained a single `…` over Week mode. The tightest print fit was today's one-day
*Production Week 16*, with 19 px to spare. The new modes' tightest had 56 px (Episode) and 23 px
(Block).

**The screen, at 1280 px and wider, and at 960: nothing clips in any mode.**

**The screen, at 961 px: today's labels already clip, and the new modes clip less.**

| | Week (today) | Episode | Block |
|---|---|---|---|
| Production pills clipped, all 18 calendars | **10** of 368 | **4** of 368 | **9** of 368 |

- The new modes clip **no pill that today's labels leave whole**.
- Block's extra clips are Episodes calendars, where Block falls back to Week and so clips exactly as
  today does.
- **What gets cut differs, and favours the new modes.** On the 2-day wrap piece of `blocks`, today
  cuts *Production Week 18 · Block 5…*, losing the block and the episodes. Episode keeps
  *Ep. 209, 210* and cuts only the grey *Production Wee…*, and Block likewise keeps *Block 5*.

**Worst cases the calendars do not contain**, set in a real pill's fonts. Each row gives the window
below which it starts to clip on screen, at the shortest run it can occur on:

| | today | Episode | Block |
|---|---|---|---|
| 2-day piece, Episodes calendar (*Ep. 205, 202*) | < 1004 | < 990 | *(as today)* |
| 2-day piece, Blocks calendar, one block | < 1149 | < 1163 | < 1190 |
| 2-day piece across two blocks | < 1594, **and clips in print** (−46 px) | < 1511, **clips in print** (−28) | < 1517, **clips in print** (−29) |
| 3-day piece across three blocks | < 1357 | < 1066 | < 1292 |
| 1-day piece | < 1243 (*Production Week 16*) | fits (*Ep. 1005*) · < 1316 for a block of 4 out of order | fits (*Block 12*) |

Read the rows this way:

- **The only print clip is a 2-day piece that straddles a block boundary.** Today's text clips there
  already, and by more than either new mode's.
- **Two cases are worse than today, both on screen only, between about 1150 and 1320 px:**
  - Block mode on a 2-day piece, starting about 40 px of window sooner than today's text;
  - Episode mode on a one-day piece whose block holds three or more episodes shot out of order.

### 7.4 ✅ One pill per week, or split where the episode or block changes? RULED: split (Q4)

*The §7.3 tables measured one pill per week, the plan as first written. The owner then chose the
split on these numbers and pictures, so §7.3's two-block rows no longer apply to the new modes.*

**Raised by two other plans written the same day.** EPISODE-PREP-PLAN §12 and CUSTOM-PHASE-UNITS-PLAN
§2 both looked at an example calendar of the owner's (not in the repo). It draws the shoot as **one
bar per episode**, splitting a week's bar where one episode wraps and the next starts. §3 above keeps
one pill per week and lists both, *Ep. 204, 205*.

**The split needs no frozen edit either.** Where Production's pill breaks is decided by
`pillRunsForWeek()`, which is not frozen and is called only by `renderMonthView`. Each piece then gets
its own pill text and grey text from §4's two helpers. The prototype split:

- Episode mode on an Episodes calendar, at each episode change: *Ep. 204 · Production Week 7 |
  Ep. 205 · Production Week 7*;
- both modes on a Blocks calendar, at each block change, because a block's episodes are
  cross-boarded and its days cannot be split per episode.

**Week mode never splits,** so the default stays byte-identical.

The split variant was measured on the same 18 calendars, at 1600 and 961 px and in both PDFs. That is
72 more runs, 288 in all, and §4's run check agreed on 24,728 of 24,728 pills.

| | Episode per week | Episode split | Block per week | Block split |
|---|---|---|---|---|
| pills | 368 | 495 | 368 | 388 |
| clipped in either PDF, or at the printed width | 0 | 0 | 0 | 0 |
| clipped on screen at 1600 | 0 | 0 | 0 | 0 |
| clipped on screen at 961 | 4 | 15 | 9 | 16 |

- **The split adds short pieces, so on narrow screens more grey text is cut.** Every one of those
  cuts takes grey text only. The pill text survives, except on the fallback pieces below.
- **The split removes the worst width case outright.** A piece can no longer straddle two blocks,
  so *Block 1 / Block 2* never occurs, and neither does the two-block piece that clips in print
  (§7.3).
- ⚠️ **One rule the split needs: untagged days do not split off.** On calendars where a half day
  pushes the wrap past Σ episodes, the prototype gave that trailing day a one-day pill of its own,
  reading *Production Week 18*. An untagged day belongs to the piece before it.
- **Pictures:** `pdf-episode-week-vs-split.png` and `pdf-block-week-vs-split.png` (the written PDF,
  `reference` in August and `blocks` in July). These are session files, not in the repo.

### 7.5 ✅ Is a width remedy wanted? RULED: none (Q5)

Nothing clips in either PDF. On screen, the new modes lose only grey text, where today's labels
lose the block and the episodes. The levers that were offered, kept for the record:

- **The ruling-2 short form, *Block 12 / 13*,** for Block's pill text on a split piece. It saves
  29 px, and the two-block print case then fits exactly (0 px to spare). Block names are always
  *Block N* (renumbered on reorder), so the short form is always available.
- **A shorter grey Production Week (*Prod. Wk 16*).** It saves about 35 px wherever it is grey
  text, but it changes the look of every Episode and Block pill.

---

## 8. The gate

1. **The default is byte-identical.** Gates 10 (the print path) and 13 (the writer's bytes) must
   pass **unchanged** on all their calendars, with no baseline re-cut. Those calendars carry no
   `mvProdLabel`, so this also proves that an absent key is Production Week.
2. **Real fixtures, minted in the app and not synthesised** (CLAUDE.md, "Test with real files"):
   - `pilllabel-block.sptcal`: a Blocks calendar labelled by Block;
   - `pilllabel-episode.sptcal`: an Episodes calendar labelled by Episode.
   Their show data is synthetic, like every fixture.
3. **A new leg, `pilllabel`.** It asserts:
   - every row of §3's tables, plus the one-day piece and the three-block week;
   - **the split (Q4):**
     - in Episode and Block modes a piece never spans two episodes (on an Episodes calendar) or two
       blocks (on a Blocks calendar);
     - Week mode's runs are exactly `pillRunsForWeek`'s output today;
     - no new-mode text contains ` / `;
     - dragging a split piece moves Production as a whole (§4);
   - each fallback: Show Info incomplete, the trailing half-day entries (which join the piece before
     them and never become a pill of their own), and Block on an Episodes calendar;
   - **that the run worked out in `segPillLabel` equals `pillRunsForWeek`'s,** on every fixture in
     `tests/fixtures/` (§4's premise, tested rather than assumed);
   - **the save format:**
     - `mvProdLabel` round-trips Save → Load through the real picker (`openViaFakePicker`);
     - a Block file, then a file without the key, loads as **Week**;
     - a shareable copy opens in its saved label;
     - an unknown value loads as Week;
     - `fields.byId` stays at 62 ids;
   - a label change marks the calendar dirty and is **exactly one** undo step, which Redo
     re-applies;
   - §5.2's table: which switches are visible for each label and Schedule by. Flipping a Show switch
     pushes no undo step, and no Show switch reaches the snapshot.
4. **No clipped pill text in either PDF or at the printed width,** in any mode on those calendars.
   On screen at **961 px**, nothing beyond what §7.4 measured, and only grey text (Q5: no remedy).
5. ⛔ **The owner sees PDFs before anything is committed** (the BLOCKS-PLAN ruling-3 precondition,
   and the writer's ruling 4): `monthbase.py sheets` contact sheets, with Episode and Block against
   today. Only after a yes are the two fixtures cut into gates 10 and 13. They are added as new
   cases, and no existing baseline is re-cut.
6. **The full `gate.sh` is green.**

---

## 9. Order of work

1. ✅ **Measure (§7).** Done 15 Oct 2026. The `pilllabel` leg should reuse its method: every
   Production pill, at **961 px** and at the printed width, plus `…` counted in both PDFs.
2. **Engine:** `productionRunParts`; the three helpers rewired (`segPillLabel`,
   `productionPillTag`, and `pillRunsForWeek` for the split); `mvProdLabel` in the snapshot, the
   restore and the resets; and `setMvProdLabel`. Drive it from a loaded snapshot, with no UI yet.
3. **The controls:** the toggle (§5.1), the Show Production Week switch, and the contextual
   visibility (§5.2).
4. **Mint the two fixtures in the app.** Write the `pilllabel` leg and wire it into `gate.sh`.
5. **PDFs to the owner (§8.5).** On a yes, cut the new baselines, then write the README changelog
   entry and update HANDOFF.
6. **Commit and push only through the owner's picker** (CLAUDE.md). It changes the save format and
   the month PDF, so it rides with a version cut if the owner wants one. Cut that version's saved
   fixture with it.

⚠️ **Coordinate with two plans written the same day.**
- **EPISODE-PREP-PLAN** (its step 5) also changes `pillRunsForWeek()`, to split per prep, and
  `segPillLabel()`, to label *Prep 202*. Both touch the same two functions this plan rewires, from
  different directions: that plan works on a new prep segment, this one on Production. Whichever
  lands second must keep the other's branch intact.
- **CUSTOM-PHASE-UNITS-PLAN** reaches the same month pill path.
- All three plans are held to gate 13. Build them one at a time, and re-run gate 13 on top of
  whichever landed first.

---

## 10. My own decisions, not rulings, and cheap to change

- The grey text order: Week, Block, Episodes.
- An untagged trailing day joins the piece before it (§3), rather than becoming a fallback pill.
- Block is disabled, not hidden, on an Episodes calendar, and the stored choice is kept.
- "Ep." in the pill text, matching ruling 8's grey text, rather than the retired pills'
  *Episode 201*.
- Show Blocks is hidden on an Episodes calendar (§5.2).
- ⚠️ **The Show switches stay per user** (ruling 10), while the label is now saved in the calendar.
  If the owner wants the grey text to travel in the file too, that is three more snapshot keys and
  it reverses ruling 10. Ask; do not assume.
- ⛔ **Not cheap to change once shipped:** the key name `mvProdLabel` and its three values. Settle
  them before the first build that saves.
