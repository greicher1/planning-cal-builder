# LABELS-SETUP-PLAN.md — bundle B: six label and setup changes

**Status:** 🔨 BUILT 20 Oct 2026, not merged. The owner's rulings are in §1, the answers to this plan's
questions in §8, the two sign-offs during the build and the as-built record in §10.
**Branch:** `claude/labels-setup-c74155` (worktree `.claude/worktrees/labels-setup-c74155`), cut from
local `main` at `be67ca5` (live v1.5.0 + a docs commit).
**Siblings:** `prep-switch` (item 1, lands first) and `month-notes` (items 2, 6, 10, 15, 17). Expect to
merge `main` again before landing.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md). The freeze and save-format
rules apply in full. Nothing here edits a frozen symbol.

⛔ **Confidentiality.** These items came from recreating two real production calendars in the app.
Nothing about them (titles, dates, places, studios) goes into code, fixtures, commits or docs. Every
fixture below is synthetic.

---

## 1. The owner's rulings (20 Oct 2026, by picker, relayed by the session that started this one)

| Item | What | Ruling, verbatim |
|---|---|---|
| 3 | The "Ep." prefix | *"'Ep.' only before numbers"* (declined *"Never add Ep."*, because it would re-cut every month baseline) |
| 4 | Blocks mode without an episode count | *"Optional; old files keep dates"* |
| 5 | A weekend first shoot day | *"The weekend just before"* |
| 7 | The month header | *"10"* (header sizes 10, 11 and 12 join the size list) |
| 8 | A France region | *"Film agreement's list"* and *"France only"* |
| 9 | Hiatus bands in the month view | *"Recolour from day menu"* and *"Number the weeks"* |

## 2. Item 3: "Ep." only before numbers

**Today.** Every episode label in the month view is `'Ep. ' + shortEpisodeName(e)`, and a list is
`'Ep. ' + episodeListLabel(defs)`. So an episode renamed "Pilot" reads "Ep. Pilot". Four sites:
`unitLabelParts` (episode and block branches) and `productionPillTag` (episode and block branches).
`shortEpisodeName` strips a leading "Episode ", and `episodeListLabel` folds three or more consecutive
numbers into a range.

**Change.** A name is a NUMBER when its short name is digits only (`/^\d+$/`, the test
`episodeListLabel` already folds ranges by). "Ep." goes before a number and never before anything else.
One helper, `epLabel(defs)`, replaces the four `'Ep. ' + …` sites:

- one numbered episode: "Ep. 101" (unchanged);
- one named episode: "Pilot";
- a list: per §8 Q1.

Prep pills already carry no "Ep." (owner, 19 Oct 2026) and are untouched.

**No baseline moves.** Surveyed 20 Oct 2026: every fixture that renders episode names uses "Episode N"
(or a bare number). The one exception, `loadfail-null-field.sptcal` ("B-EP 1" …), is loaded only by the
`loadfail` leg, which asserts the title, the hiatus names and the console, never a label.

## 3. Item 4: Blocks mode without an episode count

**Today.** `showInfoStatus()` pushes 'Number of Episodes' into `missing` in Blocks mode, so a Blocks
calendar with no count is incomplete: `refreshDerivedInfo()` blanks `#weeks-production`, the row reads
"Set by Show Info", and **Production is not scheduled at all.**

**Change.** In Blocks mode the episode count is optional: Production is Σ block days whether or not
episodes exist. With no episodes, `reconcileBlockEpisodes` gives every block an empty list, the grey
text names the block alone, `{episodes}` resolves to '' (so `[{episodes} Episodes]` collapses), and a
calendar labelled by Episode falls back to the week label (`unitLabelParts`' existing fallback).
Episodes mode is unchanged: there the count still drives the total.

**The old-file rule.** A Blocks file with no count, saved before this change, has Production
unscheduled. Under the new rule it would open with Production, its prep and Sim Post suddenly drawn:
dates appearing with no edit. So:

- New in-memory flag `blocksEpisodesLegacy` (session state, but carried by the snapshot as below). While
  it is true, Blocks mode still lists 'Number of Episodes' as missing: the old rule exactly.
- New snapshot key **`blocksEpisodesOptional: true`**, ⛔ PERMANENT. `captureSnapshot()` writes it ONLY
  when it changes something: Blocks mode, no positive episode count, and the flag off. Every other
  snapshot is byte-for-byte what it was, so no baseline and no older fixture moves.
- `applyStateSnapshot()` sets the flag **unconditionally**: true exactly when the snapshot is in Blocks
  mode, has no positive episode count and lacks the key. Undo, the crash backup and a shareable copy go
  through the same path, so each keeps whichever rule it was taken under.
- A new calendar, New and Reset start with the flag off.
- When the flag clears on an old file: §8 Q2.

No `SNAPSHOT_VERSION` bump: an older build reading a new file merely shows Production unscheduled, and
new-file-into-old-app is not supported anyway (CLAUDE.md). Proved on a real old file: the v1.5.0 build
(`releases/v1.5.0.html`), set to Blocks with no count and saved through the real Save path.

BLOCKS-PLAN §3 ("Episode count is still entered") gets this ruling recorded beside it.

## 4. Item 5: the weekend just before the first shoot day

**Today.** `simulateProductionSchedule()` walks from Production's start (its Monday when snapped), so a
day before it can never be shot, and `daySituation()` returns null for any day before the first shoot
day, so the day menu offers nothing there.

**Change.**

- **The lead weekend:** the Saturday and Sunday immediately before the first shoot day (walking back
  from it over weekend days only). When the first shoot day is a Monday that is Sat + Sun; when it is
  a worked Sunday, the Saturday; a first shoot day on a Tuesday (Monday a holiday) has none.
- **A new day word, `'lead'`** ("Work this day" on a lead-weekend day). ⛔ Not `'on'`: an `'on'` already
  stored there is INERT in every existing file (typing a new start date leaves marks on their dates),
  and letting it start counting would move that calendar's wrap with no edit. This is the `'onhalf'`
  precedent exactly. Older builds ignore an unknown word (`simulateProductionSchedule`'s rule), so no
  `SNAPSHOT_VERSION` bump.
- **The simulation:** after the walk, if a lead-weekend day carries `'lead'` (and is not inside a
  hiatus, the standing rule), the walk restarts from the earliest such day. Everywhere else `'lead'`
  behaves exactly as `'on'` (a forced weekend day), so a lead mark that ends up inside the shoot still
  counts. A `'lead'` mark further back is never reached, so it is inert.
- **The segment:** Production's segment starts at that day (its Monday when snapped). That is the
  existing week rule, not a new one: a weekend belongs to the Monday before it, so the weekend's week
  becomes Production's first week row (§8 Q3).
- **The movers** (`asShootDayMove`, audit M-4): the natural index ignores every mark, so a lead mark is
  pinned with `pinOverride`'s "no natural day in its own week" branch: offset −2/−1 from the first
  natural day's Monday. It lands on the weekend before the moved shoot. `beginShootDayMove`'s `worked`
  test learns `'lead'`.
- **The day menu:** `daySituation()` returns a situation for a lead-weekend day (flagged `lead`), and
  `dayOverrideRows()` offers "Weekend — not shot" and "Work this day" (writing `'lead'`). An `'on'`
  stored there shows as the existing stale notice, and "Work this day" replaces it.
- **Tests:** `mvmenu` L3 (Sun 28 Jun, the day before the shoot) is changed deliberately: it now has a
  shoot-day section. New cases: mark Sat, it becomes shoot day 1 and the wrap moves one day earlier;
  the Sunday too; one undo step; Shift All carries it; an old `'on'` there stays inert; a mark a week
  further back stays inert.

Week numbering is out of scope and unchanged.

## 5. Item 7: the month header

- `hdrTokenGroups()`: the Dates group gains `{date:<today>}`, "A fixed date: never updates", and
  Snippets gains `Revised as of {date:<today>}`. `<today>` is the ISO date the menu opens on, which the
  user then edits. `lookupHeaderToken` already resolves both.
- `headerFmtToolbarHtml(true)`: sizes become `[10, 11, 12, 14, 16, 18, 20, 22, 26, 30]`.
  `headerFormatCss` already accepts 1–400.
- ⚠️ The toolbar's markup is printed into manual-header documents, so **gate 10 moves for
  `mvheaderlegacy`**. Presented to the owner as an A/B with contact sheets before any re-cut.

## 6. Item 8: France

Research first (Légifrance: the film agreement IDCC 3097 and the audiovisual agreement IDCC 2642,
the Code du travail's list), then **the list and its sources go to the owner by picker BEFORE
generating.** Then: rules in `tools/gen_holidays.py` with source, verified date and caveat; regenerate
`HOLIDAYS` / `REGION_CAVEATS`; every existing list regenerates byte-identically (HANDOFF §2j's check);
2024–2031. One `PLACES` entry and one `#union-place` option (`eu-france`, appended: values are save
format). Alsace-Moselle: considered, and presented with the list (the owner said "France only").

## 7. Item 9: hiatus bands

- **Colour…** in each all-phase hiatus section of the day menu (`bandSections`). It opens a swatch
  popover (the phase picker's `.phase-color-pop`, which a shareable copy already strips, given the
  waterfall editor's `EXCEL_STANDARD_COLORS`) and writes `hiatusColors` for every week of that hiatus:
  the store the waterfall's band editor writes and frozen `renderMonthView` reads, so both views change
  together. The default colour deletes the keys, as the waterfall editor does. One undo step. This
  supersedes MONTH-CONTEXT-MENU-PLAN §3.10's "not offered".
- **Number weeks**, off unless ticked, so existing calendars print unchanged. Ticked, a hiatus of N weeks
  labels its bands "<name> Week 1" … "<name> Week N" ("Hiatus Week 1" with no name), written through
  `syncHiatusNamesFromSidebar()` into `hiatusTexts`, which every view and both exports already read. A
  band renamed by hand is never overwritten (the sync's ownership rule). Where the tick lives: §8 Q4.

## 8. The owner's answers to this plan's questions (20 Oct 2026, by picker)

1. **Item 3, mixed lists** (a block or week holding "Pilot" and 102–103): *"Pilot, Ep. 102, 103"*.
   "Ep." goes before each run of numbers and never before a name. Declined: no "Ep." on a mixed list.
2. **Item 4, when an old Blocks file without a count takes the new rule:** *"Next Show Info edit"*.
   The first change to Schedule by, Number of Episodes, Number of Blocks, Days per Block or a block's own
   day count clears `blocksEpisodesLegacy`, so the dates appear from the user's own edit. Declined: "Only
   on an episode count" and "Never".
3. **Item 5, the consequence** (the weekend's week becomes Production Week 1, later weeks number one
   higher, Sim Post's offset counts from it): *"Yes, build it so"*. Declined: "Hold item 5".
4. **Item 9, where "Number weeks" lives:** *"Per hiatus row"*. A box on each all-phase hiatus row beside
   Lock in place, saved inside the row (`fields.hiatuses[i].numbered`, written only when ticked, so no new
   id and no older snapshot changes), and the same tick in the day menu's hiatus section. Phases' own
   hiatuses stay unnumbered. Declined: one calendar-wide box.
5. **Item 8, the list and its sources:** *"France, 11 days"*. One place, `eu-france` → region `FR`.
   Declined: a second Alsace-Moselle place, and holding France until Légifrance is read directly.
   - **The list** (film agreement, IDCC 3097, Titre II art. 42, « soit actuellement »): New Year's Day,
     Easter Monday, 1 May, 8 May, Ascension, Whit Monday, 14 July, 15 August, All Saints, 11 November,
     Christmas. No substitution for a weekend holiday (Titre I art. 17: « tombant en même temps que le
     repos hebdomadaire ne donne pas lieu à indemnité particulière »), so `observance="none"`.
   - **The caveat:** Alsace-Moselle adds Good Friday and 26 December (art. 42, Code du travail
     L3134-13): add them as custom holidays there. TV productions under the audiovisual agreement
     (IDCC 2642, art. VII.2) work Whit Monday as the solidarity day. Only 1 May is a day off by law
     (L3133-4); the rest are days off by the agreement.
   - ⚠️ **Provenance, stated as it is:** Légifrance refused automated reads (403, then a human check,
     which was not attempted). The text read is the official BOCC fascicule 2013/34 (NOR ASET1350988M),
     a copy hosted at focal.ch, checked word for word against the producers' union SPI consolidation
     (June 2024) and fiche-paie.fr (October 2026). The Code du travail was read on code.travail.gouv.fr,
     the Labour Ministry's mirror. The extension arrêté of 31 Mar 2015 reserves nothing in arts. 17, 18,
     42 or 43. Whit Monday as a paid day for crew rests on Titre II art. 43 replacing Titre I art. 18's
     solidarity day for technicians: a reading of the text, not a sentence in it.

## 9. Tests and landing

A leg or leg extension per item, on synthetic fixtures, each with mutants. `npm run check`,
`python3 tools/check-refs.py`, then the full gate (serialised with other sessions). README changelog
entries and a HANDOFF entry. Merge into local `main` on the owner's picker (merge `main` first if the
siblings have landed), then ask by picker whether to push.

## 10. As built (20 Oct 2026)

**Two more sign-offs, by picker, after a screenshot and an A/B:**

- *"Approve the edit"*: a lead day showed the bar but not the worked-day tint, which frozen `renderMonthView`'s
  `_ovDays` decides. One condition there now marks `'lead'` as `'on'`. Inert on every baseline (no fixture has a
  `'lead'` mark); `labelsetup` L2t reads the class.
- *"Re-cut it"*: gate 10's `mvheaderlegacy` document gained the three size options (45 elements over 15 months). Its
  fit table is identical, and its printed PDF is pixel-identical to v1.5.0's on all 15 pages at 150 dpi. Re-cut,
  recorded in that baseline's README. The other nine gate-10 documents did not move.

**Departures from §2–§7, each small:**

- Item 3: a number is digits only after `shortEpisodeName`'s "Episode " strip (`/^\d+$/`, the test the range fold
  already used). "101A" reads as a name. `episodeListLabel` became `episodeListItems` + `epListLabel`.
- Item 4: a blank count in Blocks mode shows NO episodes, even where `episodeDefs` still holds the list from before
  the count was cleared (the sync never empties it, so typing the count back restores the names):
  `blockEpisodeDefs()`. The block panel's hint then says where episode names come from.
- Item 5: the lead weekend is found walking back from the first shoot day over enabled union holidays and Off days
  too, so a Tuesday start after a Monday holiday has one. A Wednesday start (snap off) has none, because walking from
  that Saturday would shoot the Monday and Tuesday it skipped.
- Item 9: the colour popover is the phase picker's, given an `options` list, so the shareable copy's strip list and
  the close rules needed nothing new.

**Mutants** (`labelsetup` on a build of each, `dist-mut/`, source restored and the real build hashed back each time):

| Mutant | Red |
|---|---|
| "Ep." before every name | E1, E1h, E2, E3 |
| no "Ep." on a mixed list | E2, E3 |
| no old-file rule | B4, B5, B6u |
| a Show Info edit never clears it | B6 |
| `blocksEpisodesOptional` never written | B3, B3r |
| a blank count still shows the old episodes | B2 |
| the menu writes `'on'` | L1, L2, L2m, L4, L5, L6, L6w |
| a stored `'on'` on the lead weekend counts | L6 |
| the segment does not move with the lead day | L2 |
| no second walk | L2, L2m, L4, L5, L6w |
| no lead days in `daySituation` | L1, L2, L2m, L4, L5, L6, L6w |
| no sizes 10–12 | H1, H2 |
| no fixed-date token | H3 |
| no France option | F1, F2, F3 |
| Number weeks ignored by the sync | C1, C4 |
| Colour… paints one week | C2, C2m, C3 |
| `numbered` always saved | C0, C4 |
| `numbered` not restored | C1, C4 |
| no leading undo push in Number weeks | C1u |
| no leading undo push in Colour… | C3u |

The tint's frozen edit has no mutant: the build before it is one (the lead day's cell carried no `mv-day-*` class).
