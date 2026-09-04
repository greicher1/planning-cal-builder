# HEADER-PRESETS-PLAN.md

**Header templates and presets: every header line can mix literal text with live data tokens, any
line can be styled, the whole arrangement can be saved as a named preset on the user's computer and
exported/imported as a file — and a version number typed into Show Info lands in the header's
bottom-left slot by default.**

Written 1 Sep 2026 for Opus 5 to build from. Self-contained: assumes no memory of the analysis that
produced it. Read [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) first. This is a plan, not a
record of work done. **Nothing here is built.**

> ⚠️ **This document quotes no line numbers, deliberately.** `tools/check-refs.py` fails the deploy on
> a number in prose. Every claim names a symbol; `LC_ALL=C grep -ano 'symbol' src/legacy/app.js` finds
> it (the `-a` is mandatory — the file carries embedded base64 font data and plain `grep` calls it
> binary).

> ✅ **No frozen edit is required for the core feature.** §4 shows why, and it is the single most
> important fact in this plan: build it the way §4 describes and the freeze is never in question.
> Two optional conveniences (§8 H2, H6) would each be a one-line frozen edit and each needs its own
> owner sign-off. Do not fold them into the core build.

> ⚠️ **This supersedes an earlier ruling.** `HANDOFF.md` §2b records that on 3 Sep 2026 the owner
> chose *style-only* header presets ("no `headerManual`, so nothing forces the header out of auto
> mode"). The owner's request of 1 Sep 2026 (§1) asks for presets that also control **content** —
> which data appears, and how — so this plan builds content + style. Applying such a preset
> necessarily puts the header into Manual mode (§3.4, decision H3). Update §2b when this lands.

---

## 0. Summary in one screen

- **A header line is a template.** `Principal Photography {production.open} / Wrap: {production.wrap}`
  renders live, from the same data the auto header reads. Literal text is literal. `{unknown}` stays
  as typed. `[ … ]` renders only if every token inside it resolved to something.
- **Resolution happens in `headerLine()`**, the one non-frozen function all three consumers call —
  screen, Excel, PDF — so they cannot disagree and nothing frozen changes.
- **No new mode.** Auto stays byte-identical (§2.4). Manual lines are now templates; a line with no
  tokens behaves exactly as today. Applying a preset writes nine templates + nine formats into the
  existing `headerManual` / `headerFormat` stores and switches to Manual.
- **`{version}`** reads a new Show Info field (`show-version`), renders as `v` + the number, and is
  the auto default for the bottom-left slot `l2`. Empty version → empty line → hidden, so existing
  calendars render identically until someone types one.
- **Presets live in `sptcal.prefs`** (per user, per machine — the store gridlines already use), are
  applied as one undo step, and export/import as `.spthdr` JSON files through the same picker +
  download-fallback path Save uses.
- **The applied header travels inside the calendar** (it always did — `headerManual`/`headerFormat`
  are in `captureSnapshot()`), so a `.sptcal` opened on another machine renders its header without
  that machine owning the preset.

---

## 1. What the owner asked for

> *"lets build a plan for being able to make header presets that you can save to your computer. They
> should let you be able to pick any styling for any of the header lines but also let you be able to
> customize how data shows in any way. This should include things such as: writers room open/close
> date; production length; how many days per episode; how many episodes; Name of show; adding
> "Planning Calendar" or some other predetermined text; today's date or another date; a version
> number (lowercase "v" then a number you input. I also want this version number thing to be part of
> the default header and be in the very bottom left side text box of the header. You should be able to
> type your version number into the "Show Info" section and this should autopopulate into the
> header."*

Read as five requirements:

| # | requirement | where it lands |
|---|---|---|
| R1 | Any styling on any header line | Already built (`headerFormat`, 31 Aug 2026) — a preset **captures** it |
| R2 | Any data, arranged any way, in any line | The template engine, §3.1–3.2 |
| R3 | Named presets saved to the user's computer | `sptcal.prefs` + `.spthdr` files, §3.5–3.6 |
| R4 | A version number typed in Show Info | New `show-version` field + `{version}` token, §3.3 |
| R5 | Version in the **bottom-left** header slot **by default** | `l2`'s auto default becomes the version, §3.3 |

---

## 2. How the header works today — facts, with the symbols that hold them

### 2.1 Nine lines, three columns

`HDR_IDS = ['left','l2','c1','c2','c3','c4','r1','r2','r3']`. Visually: left column `left` (top) and
`l2` (**bottom-left — the slot R5 names**); centre `c1` (title) … `c4`; right `r1` … `r3`. `l2` and
`c4` are the two slots added 31 Aug 2026 (`HDR_NEW_SLOTS`); they carry no auto value and CSS hides them
when empty in Auto mode: `.hdr-line.hdr-slot.hdr-empty:not(.hdr-editable){ display:none; }`.

### 2.2 Two modes, three stores

- `headerMode` is `'auto' | 'manual'`. `headerManual` holds per-line text in Manual (keyed by `hid`).
  `headerFormat[hid] = { size, bold, italic, color, highlight, align }`, every key optional.
- **Auto → Manual** (`#hdr-mode-btn` handler in the `#table-wrap` click listener) snapshots
  `computeHeaderDefaults(currentSchedule)` into `headerManual` — a copy of the *resolved* strings, so
  the header "stops auto-updating". **Manual → Auto** discards `headerManual`.
- Editing: lines are `contenteditable` only in Manual; a `focusout` listener on `#table-wrap` commits
  `line.textContent` (with ` ` normalised to spaces, trimmed) into `headerManual[id]`, renders,
  marks dirty. `Enter` blurs (no newlines in a line).
- The month view has its **own** header (`mvHeaderMode`, `mvHeaderManual`, `mvHeaderFormat`; lines
  `title`, `today`), independent by design. See §8 H6 — it is **not** in scope for the core build.

### 2.3 The one choke point — this is the whole design

Three consumers, one text source:

| consumer | frozen? | how it gets a line's text |
|---|---|---|
| screen — `hline()` inside `renderSpreadsheetView` | **yes** | `computeHeaderDefaults(schedule)` then `headerLine(id, defaults)` |
| workbook — `exportExcel` | **yes** | same two calls, then `hdrSafe()` strips `&`, then the 255-character trimmer |
| PDF — `buildWaterfallPdf` | **yes** | same two calls, filters empty lines, draws with `headerFmt(id)` |
| the format toolbar — `headerFmtToolbarHtml(mv)` | **no** (its *call site* inside `renderSpreadsheetView` is) | — |

`computeHeaderDefaults` and `headerLine` are **not** on the frozen list in `CLAUDE.md` and are not
inside any frozen function. Everything in this plan hangs off those two.

```js
// today
function headerLine(id, defaults){
  if(headerMode === 'manual') return (id in headerManual) ? headerManual[id] : (defaults[id] || '');
  return defaults[id] || '';
}
```

### 2.4 What "byte-identical" currently depends on

- `computeHeaderDefaults` hand-codes every auto string: `left` = today as `M.D.YY` (local date, no
  zero-padding), `c1` = title + `' S' + season`, `c2` = `'Planning Calendar'`, `c3` =
  `"Writer's Room Opens: M.D.YY"` (Monday of the entered start), `r1` = `"<n>-Week Production Span"`
  and/or `"<d>-Day Shooting Schedule"` joined with `' / '` (each part dropped when absent), `r2` =
  `"Principal Photography <first shoot day> / Wrap: <last shoot day>"` (real shoot days, not the entered
  Monday — README's "the header's Principal Photography date was wrong" entry), `r3` = `"<n> Episodes"`.
  `l2` and `c4` are `''`.
- Excel: `withCodes()` filters empty lines, so an empty `l2` leaves the `&L` section byte-identical
  to the old bare `todayStr`. Per-line format codes are emitted **only** if some line in that section
  is formatted. `HF_MAX = 255` and the trimmer drops trailing lines, never mid-code.
- PDF: `['left','l2'].map(...).filter(x=>x.t)` — an empty `l2` draws nothing.
- `gate.sh` byte-compares the waterfall PDF and every Excel part against
  `tests/baselines/2026-08-29-stage-7/` on a calendar with no version and no manual header. **That
  compare is the proof this feature is inert until used, and it must stay green.**

### 2.5 Show Info, and how the header learns about it

Show Info is React (`ShowInfoCard` in `src/chrome/Sidebar.jsx`): `TextInput#show-title`,
`NativeSelect#season-num`, `NumberInput#shoot-days-per-ep`, `NumberInput#num-episodes`. The engine
binds by id: `#show-title` → `input` → `render(currentSchedule); markDirty()`; the three others →
`refreshEpisodesUI(); update()`. `showInfoStatus()` reports completeness from season + per-ep + count
— **a version field must not join that test** (it is optional).

`collectFieldValues()` sweeps every `input[id]`/`select[id]`/`textarea[id]` into `fields.byId`, which
is save format — skipping only `.tools-menu` and `.prefs-card`. A new id'd input in the Show Info card
is therefore **saved and restored automatically**, and its id becomes part of the file format.

### 2.6 The per-user store, and its rules

`PREFS_KEY = 'sptcal.prefs'`, `prefs` object, `loadPrefs()` / `savePrefs()` (try/catch, `version:1`),
first tenant `SHEET_GRIDLINES`. Rules already in force (`HANDOFF.md` §2b, `CLAUDE.md`): preferences
are per user and per machine, **never** in `captureSnapshot()`; a chosen default **removes** the key
rather than storing it; every preference control lives inside the `.prefs-card` so the field sweep
skips it. Measured: `localStorage` works from `file://` and every `file://` copy on one machine shares
one bucket; the https site has its own.

### 2.7 Files: save, download fallback, open

`saveToFile` / `saveAsFile` use `window.showSaveFilePicker` (Chromium) with `SAVE_TYPES`, and fall
back to `downloadTextFile(text, mime, name)` where `supportsFsAccess` is false. `openFileViaPicker`
uses `showOpenFilePicker`. `parseCalendarText()` is the one reader of calendar files. A preset file is
a **different** format and must not be routed through it (§3.6).

---

## 3. The design

### 3.1 The template grammar — small, fixed, and closed

Deliberately not a language. Four constructs and nothing else:

| construct | meaning | example → output |
|---|---|---|
| `{token}` | a value from §3.2 | `{episodes}` → `10` |
| `{token:format}` | a value with a named format from that token's format list | `{today:long}` → `September 2, 2026` |
| `[ … ]` | a **conditional group**: rendered only if **every** token inside it resolved non-empty; contains no nested groups | `[Writer's Room Opens: {writersRoom.open}]` → whole thing, or nothing |
| `{{` `}}` `[[` `]]` | literal brace / bracket | `{{draft}}` → `{draft}` |

Rules the engine enforces, each of which exists to keep an old file rendering as it did:

- **An unknown token name renders as typed**, braces included. This is what makes turning
  `headerManual` into templates safe for every existing file: text a user once typed that happens to
  contain braces is unchanged unless it names a real token. (§8 H4 records the residual risk.)
- **Resolution is one pass.** A token's value is never re-parsed, so a show titled `{today}` prints
  the words `{today}`.
- **Whitespace is preserved as typed.** The engine does not collapse or trim — the existing commit
  path (`focusout`) already trims the whole line, and the Excel writer already strips `&`.
- **A group that fails collapses to nothing**, including its literal text and its surrounding spaces
  *inside* the brackets. It does not touch text outside the brackets. (So `A [ / {x}]` → `A ` with a
  trailing space when `{x}` is empty — write `A[ / {x}]` to avoid that. The palette inserts groups in
  that tight form.)

```js
// Shape, not final code. Pure; no DOM access; `ctx` is built once per render by buildHeaderCtx().
function resolveHeaderTemplate(str, ctx){
  if(!str || (str.indexOf('{') < 0 && str.indexOf('[') < 0)) return str;   // fast path: no tokens
  // 1. protect escapes  2. resolve [groups] (each token inside must be non-empty or the group -> '')
  // 3. resolve remaining {tokens}  4. restore escapes
  // Unknown {name} -> left exactly as written.
}
```

### 3.2 The token catalogue — every value the header can show

All values are read the way `computeHeaderDefaults` already reads them: Show Info from the DOM by id,
schedule facts from `currentSchedule` (`segments`, `productionInfo`, `weeks`), phase names from
`getAllPhaseDefs()`. Dates default to the header's existing `M.D.YY` dot form; every date token accepts
`:dot` (default) `:slash` (`M/D/YY`, the grid's `fmtShort`) `:long` (`September 2, 2026`)
`:iso` (`2026-09-02`).

**Show and version**

| token | value | empty when |
|---|---|---|
| `{title}` | `#show-title`, trimmed | no title |
| `{season}` | `S` + `#season-num` | no season |
| `{titleSeason}` | exactly today's `c1`: title, then `' S'` + season if any | both empty |
| `{version}` | `v` + `#show-version` with any leading `v`/`V` stripped, trimmed | field empty |
| `{episodes}` | `#num-episodes` as a number | not a positive number |
| `{shootDaysPerEp}` | `#shoot-days-per-ep` | not a positive number |
| `{shootDays}` | `showInfoStatus().totalShootDays` | 0 |

**Dates**

| token | value |
|---|---|
| `{today}` | local calendar date (not UTC — it is "today" for the reader, as `computeHeaderDefaults` notes) |
| `{date:YYYY-MM-DD}` | that date, in the default format; add a second format arg `{date:2026-10-05:long}` |

**Phases — generic, for every built-in and every custom phase key**

`{<phaseKey>.open}` `{<phaseKey>.close}` `{<phaseKey>.weeks}` `{<phaseKey>.name}`, where `<phaseKey>`
is `writersRoom`, `prePrep`, `prodPrep`, `production`, `post`, `localization`, `custom1`, … — the same
keys the sidebar rows carry. Values come from `currentSchedule.segments.find(s => s.key === k)`:

- `.open` — the segment's `start` (its first Monday).
- `.close` — see **H5**. Recommended: the **Friday of the final week**, `addDays(seg.end, -3)`,
  because `seg.end` is the *exclusive* Monday after the last week (`extendEndForHiatus` counts
  delivered weeks and returns the Monday following them). "Writer's Room closes 3.6.26" should name a
  day the room is open.
- `.weeks` — `seg.weeks` (for Production this is worked weeks, hiatus excluded, as the label numbering).
- `.name` — the phase's current display name from `getAllPhaseDefs()`, so a renamed phase reads right.
- **Production is special-cased to real shoot days, exactly as the auto header already is:**
  `{production.open}` = `productionInfo.firstShootDay || productionInfo.startDate`, `{production.wrap}`
  = `productionInfo.lastShootDay`. `{production.close}` is an alias of `.wrap`. This preserves the fix
  recorded in README ("the wrap date was right; the date beside it was a calendar guess").

**Compound tokens that reproduce today's composite lines exactly** (so a preset can be the auto
header without re-deriving its joins):

| token | value |
|---|---|
| `{production.summary}` | today's `r1`, verbatim logic: span and/or schedule joined by `' / '` |
| `{production.dates}` | today's `r2`, verbatim: `Principal Photography <open> / Wrap: <wrap>` |
| `{writersRoom.line}` | today's `c3`, verbatim: `Writer's Room Opens: <open>` |

Empty tokens: a token whose value is empty resolves to `''`. Inside a `[group]` that empties the group.

### 3.3 The version number — R4 and R5

1. **Field.** `ShowInfoCard` gains `<TextInput id="show-version" label="Version"
   placeholder="e.g. 3" … />` after Number of Episodes. `TextInput`, not `NumberInput`: owners write
   `3`, `3.1`, `3a`; the field is a label, not arithmetic. It is **not** part of `showInfoStatus()`'s
   completeness test and must never gate Production.
2. **Wiring.** `document.getElementById('show-version').addEventListener('input', ()=>{
   render(currentSchedule); markDirty(); })` — the exact shape `#show-title` uses. A `render`, not an
   `update`: nothing about the schedule changes.
3. **Token.** `{version}` per §3.2. Leading `v`/`V` stripped so `v3` and `3` both read `v3`.
4. **Auto default (R5).** `computeHeaderDefaults` returns `l2: versionLabel()` instead of `l2: ''`,
   where `versionLabel()` is the same helper the token uses. Nothing else in that function changes.
   With the field empty the function returns exactly what it returns today.
5. **Save format.** `show-version` is swept into `fields.byId` by `collectFieldValues()` and restored
   by `applyStateSnapshot()` like every other id'd field. Append-only; a file without the key restores
   an empty field. Its **id is now part of the file format** — rename it and every saved version is
   silently dropped (`CLAUDE.md`, "fields.byId is keyed by DOM element id").
6. **Reset.** `resetAll()` clears `#show-title`, `#season-num`, `#shoot-days-per-ep`, `#num-episodes`
   by id — add `#show-version` beside them.
7. **Month view** (`mvDefaults` in `renderMonthView`) does **not** gain the version. Its header is
   independent by design and touching it is a frozen edit (H6).

**Why this is inert:** `l2` empty → `.hdr-slot.hdr-empty` hidden on screen; filtered by `withCodes`
in Excel (the `&L` section stays the bare date); filtered in the PDF. The gate's byte-compare stays
green. **This is the smallest shippable increment and ships first (§10).**

### 3.4 Modes stay as they are; Manual lines become templates

- `headerLine()` becomes: in Manual, `resolveHeaderTemplate(headerManual[id] ?? defaults[id], ctx)`;
  in Auto, `defaults[id]` unchanged. `ctx` is built once by `buildHeaderCtx(schedule)` and passed in
  by `computeHeaderDefaults`'s callers — simplest: `computeHeaderDefaults` attaches it as a
  non-enumerable `defaults.__ctx` so the three frozen call sites need no signature change. ⛔ Do not
  add a parameter to `headerLine`; its call sites are inside frozen functions.
- **Auto → Manual** keeps snapshotting the *resolved* strings. So the documented behaviour — "stops
  auto-updating" — is unchanged, and the Help text stays true. A user who wants live data in Manual
  types a token or applies a preset.
- **Editing a template line.** The frozen `hline()` emits the *resolved* text, so a user clicking into
  a line would otherwise see `v3` and, on blur, commit the literal `v3` — silently destroying the
  token. Fix, without a frozen edit: a delegated `focusin` listener on `#table-wrap` swaps
  `line.textContent` to the **raw** `headerManual[id]` when a Manual line gains focus; the existing
  `focusout` commit then stores the raw text and re-renders, which shows it resolved again. Both
  listeners are non-frozen. ⛔ Only swap on focus when `id in headerManual` — a line still showing its
  auto default has no raw form to show.
- **Applying a preset** (§3.5) = `headerManual = {…preset.lines}; headerFormat = {…preset.format};
  headerMode = 'manual'; render; markDirty` inside `asOneUndoStep`. **Header: Auto** afterwards
  discards it, exactly as it discards hand edits today (H3).
- **The Default preset.** Ships built in, read-only, first in every list:

  ```js
  const DEFAULT_HEADER_TEMPLATE = {
    left: '{today}',  l2: '{version}',
    c1: '{titleSeason}', c2: 'Planning Calendar', c3: '{writersRoom.line}', c4: '',
    r1: '{production.summary}', r2: '{production.dates}', r3: '[{episodes} Episodes]',
  };
  ```
  It exists so a user can *start from* the auto header and change one line. ⚠️ It is a **second
  statement of the auto header**, and the two can drift. The `hdrdefault` gate leg (§7) asserts that
  resolving this template equals `computeHeaderDefaults()`'s nine strings on the baseline calendar.
  Do not "simplify" by making Auto read the template — Auto's hand-coded strings are the
  byte-identical baseline and stay as they are.

### 3.5 Presets — the per-user library

```js
prefs.headerPresets = [
  { id: 'hp_9f3a…', name: 'Studio standard', createdAt: '2026-09-01T18:40:00Z',
    lines:  { left:'{today}', l2:'{version}', c1:'{title}', c2:'Planning Calendar', … },   // nine hids
    format: { c1:{ size:14, bold:true }, r1:{ color:'#7030A0' } },                           // sparse
  }, …
];
```

- **Where:** `sptcal.prefs`, the existing store, under one new key. Per user, per machine, never in
  `captureSnapshot()` — a preset is *how this person likes headers*, not *this calendar's header*.
  The calendar's header travels in `headerManual`/`headerFormat` as it always has, so a `.sptcal` is
  self-contained without the preset.
- **Ids** are generated (`'hp_' + random`), never the name — a rename must not orphan anything.
- **Save current header as preset** captures **raw templates**, not resolved text: `headerManual` as
  it stands (falling back per line to `DEFAULT_HEADER_TEMPLATE[hid]` for any line not in
  `headerManual`, so a preset saved from a half-edited Manual header still tracks data), plus a copy
  of `headerFormat`. ⛔ It must never capture the *value* of `{version}` or `{title}` — those are
  calendar data. A preset saying `v3` in `l2` would stamp v3 on every calendar it is applied to.
- **Apply** = §3.4, one undo step, marks dirty (it changed calendar data).
- **Rename / Delete** edit `prefs.headerPresets` and `savePrefs()`. The built-in Default cannot be
  deleted or renamed.
- **Empty list ⇒ no key.** `delete prefs.headerPresets` when the last one goes (§2.6's rule).
- Presets do not store the month-view header (H6).

### 3.6 Preset files — R3's "save to your computer"

- **Format:** JSON, extension `.spthdr`, MIME `application/json`:
  `{ kind:'spt-header-preset', version:1, name, lines, format }`. The `kind` field is what the
  importer checks; `version` exists so a later shape can migrate.
- **Export** one preset: `showSaveFilePicker` with a `types` entry `{ description:'Calendar header
  preset', accept:{ 'application/json':['.spthdr'] } }`, `suggestedName = <name>.spthdr`; where
  `supportsFsAccess` is false, `downloadTextFile(json, 'application/json', name)`. Same two-branch
  shape as `saveAsFile`.
- **Import:** `showOpenFilePicker` with the same type; fallback a hidden `<input type="file"
  accept=".spthdr,application/json">` created on demand (⛔ **no id** — §9). Read as text, `JSON.parse`
  in try/catch, require `kind === 'spt-header-preset'`, validate `lines` keys ⊆ `HDR_IDS` and
  `format` values ⊆ the six format keys, drop anything else, assign a fresh id, add to the library. A
  file that fails validation is refused with `uiAlert` naming why — never partially imported.
- ⛔ **Not through `parseCalendarText()`.** That function is the one reader of *calendar* files and
  is contract. A preset file is a different thing; give it its own small reader.
- **No arbitrary content is executed or injected.** Templates are strings resolved by §3.1; the
  renderer escapes them (`escH` / `escHtml`) exactly as it escapes today's manual text.

### 3.7 Where the controls live

**Primary — the Preferences card** (`PreferencesCard` in `src/chrome/Sidebar.jsx`), because presets
*are* preferences and that card is the one place the field sweep skips (§2.6). A **Header presets**
block under the gridlines control:

- a `NativeSelect` listing *Default* + the user's presets, and an **Apply** button;
- **Save current header as preset…** → an inline `TextInput` for the name + Save/Cancel (inline, not a
  `Modal` — a Modal portals to `<body>`, *outside* `.prefs-card`, so any id'd control in it would be
  swept into every saved file);
- per-preset **Rename**, **Delete**, **Export file…**; and **Import file…**.

Bridged like every other chrome surface: the engine pushes `chrome.headerPresets({ items, current })`
(names + ids only), React renders, the engine handles clicks by delegated `data-action` on classes —
the `fileMenu` pattern. ⛔ **No `id` on any of these controls.** The `.prefs-card` skip protects the
ones inside the card, but the rule is simpler to keep if none exist at all (the header format toolbar
follows it for the same reason).

**Secondary — the token palette in the format toolbar.** `headerFmtToolbarHtml(mv)` is non-frozen;
its returned HTML is inserted by the frozen renderer. Add, for `mv === false` only, an **Insert ▾**
control listing the §3.2 tokens grouped (Show · Dates · Phases · Snippets), inserting `{token}` at the
caret of `hdrFmtTarget` (the last-focused line, which is how the toolbar already targets a line).
Snippets are literal text the owner named: `Planning Calendar`, and the compound tokens. ⛔ Classes
only, no ids (the toolbar's own rule). Visible only in Manual mode, like the rest of that toolbar.

**Optional — a Presets ▾ button on the header strip itself**, beside *Header: Manual*. That strip
(`.hdr-tools`) is built inline inside frozen `renderSpreadsheetView`, so this is a one-line frozen
edit and needs its own ruling: **H2**. The core build does not depend on it.

### 3.8 The Excel budget, shown before export

Excel rejects a header/footer over **255 characters in total**, codes included, and `exportExcel`'s
trimmer drops trailing lines to stay under. Templates make long headers easy to write, so the
Preferences block shows *"Excel header: about 212 of 255 characters"*, computed by
`estimateExcelHeaderLength()`: resolve the nine lines, apply `hdrSafe`'s `&`-strip, add the
per-section `HSIZE` cost and per-line format-code cost using the same arithmetic as `hdrLineCode`.
⚠️ **This is a second copy of a frozen function's arithmetic and can drift**; label it *about*, keep
the frozen trimmer authoritative, and let the `hdrexcel` gate leg (§7) prove a header the estimator
calls 250 still produces a workbook `check-xlsx.sh` accepts.

---

## 4. Freeze verdict — why this needs no frozen edit

| change | inside a frozen function? | why not |
|---|---|---|
| Template resolution | no | lives in `headerLine`, which the three frozen consumers *call*; their call sites are unchanged |
| `ctx` construction | no | `computeHeaderDefaults` is not frozen; the ctx rides on its return value |
| `{version}` in Auto `l2` | no | one field of `computeHeaderDefaults`'s return object |
| Raw-on-focus editing | no | a new delegated `focusin` listener beside the existing `focusout` one on `#table-wrap` |
| Token palette | no | inside `headerFmtToolbarHtml`'s returned string; the frozen call site is untouched |
| Show Info field | no | React chrome, `src/chrome/Sidebar.jsx` |
| Preset library and files | no | prefs store, chrome, engine helpers |

This is `CLAUDE.md`'s sanctioned pattern #2 — *drive the effect from outside, and ask the frozen code
for nothing it does not already give*. The renderer keeps emitting `escH(val)`; `val` is simply a
resolved string now. Excel keeps stripping `&` and trimming to 255; the PDF keeps filtering empties.

The two things that **would** be frozen edits, and are therefore separate rulings:

- **H2** — a Presets button in `.hdr-tools`.
- **H6** — the month-view header: `mvLine()` inside `renderMonthView` reads `mvHeaderManual[id]`
  directly, not through any choke point, so routing it through the resolver is a frozen edit (and
  `exportMonthPdf` prints that DOM).

---

## 5. Save-format contract

- **New snapshot keys: none.** The applied header rides in `headerManual` / `headerFormat`, which are
  already in `captureSnapshot()` and already restored unconditionally by `applyStateSnapshot()`. A
  template string is just a string.
- **New `fields.byId` key: `show-version`.** Swept automatically. Append-only. Its id is now format.
- **`SNAPSHOT_VERSION` stays 1.** An absent `show-version` restores empty; an old `headerManual`
  with no tokens resolves to itself. Nothing needs a migration branch.
- **Prefs:** `prefs.headerPresets` under the existing `version:1` object. Absent key ⇒ Default only.
- **`.spthdr`:** its own `kind`/`version` (§3.6).
- ⛔ **Nothing from `prefs` ever enters a `.sptcal`**, and nothing from a `.sptcal` ever enters
  `prefs`. A preset is applied by *copying* its lines into the calendar's stores; the calendar then
  has no memory of which preset it came from, and needs none.

---

## 6. Build steps, in order

**Step 1 — the version (R4, R5). Ship alone.**
`show-version` TextInput; `versionLabel()`; `l2: versionLabel()` in `computeHeaderDefaults`; the
`input` listener; the `resetAll` clear. Gate: existing byte-compare green with the field empty; new
leg `hdrversion`.

**Step 2 — the engine.**
`buildHeaderCtx(schedule)` (all §3.2 values, computed once), `resolveHeaderTemplate(str, ctx)`,
`headerLine` resolving in Manual, `defaults.__ctx` carriage, the `focusin` raw swap. Unit-test the
resolver in Node (`tests/harness/prove-header-template.mjs`, slicing the verbatim function the way
`prove-col-permutation.mjs` slices `computeBlockLayout`): every §3.1 rule, every §3.2 token against a
fixed ctx, unknown-token passthrough, escapes, empty-group collapse, one-pass resolution.

**Step 3 — the Default template and the palette.**
`DEFAULT_HEADER_TEMPLATE`; `hdrdefault` leg proving it equals the auto strings; **Insert ▾** in
`headerFmtToolbarHtml(false)` with caret insertion into `hdrFmtTarget`.

**Step 4 — the library.**
`prefs.headerPresets`, `chrome.headerPresets` bridge, the Preferences block, Apply as
`asOneUndoStep`, Save-as (raw templates), Rename, Delete. Leg `hdrpreset`.

**Step 5 — files.** Export / Import per §3.6, both picker and fallback branches. Leg `hdrfile`
(round-trip a preset through `JSON.stringify` → the reader; refuse a `kind`-less file).

**Step 6 — the budget meter, Help, docs.** `estimateExcelHeaderLength()`; leg `hdrexcel`; Help entry
under *Header (Auto vs. Manual)*; README changelog; `HANDOFF.md` §2b updated (the style-only ruling is
superseded); a `tests/fixtures/*.sptcal` carrying a templated header for the restore path.

Each step is a separate commit with its own changelog line. Nothing in steps 2–6 changes the output
of a calendar that has no version and no Manual header — the byte-compare is run after **every** step.

---

## 7. Acceptance gate

All in `tests/harness/gate.sh`, all against `/dist/index.html`, plus the Node prover.

1. **Inertness** — existing legs: with no version and Auto header, waterfall PDF and every Excel part
   byte-identical to the baseline; 0 clipped cells; `gridWidthPt` unchanged. **After every step.**
2. **`hdrversion`** — fixture with `show-version = "3"`, Auto mode: screen `l2` reads `v3` and is
   visible; Excel `oddHeader` `&L` section is `<date>\nv3`; PDF left column has two lines; typing
   `V3` also yields `v3`; clearing the field hides the line again; the value survives a `.sptcal`
   round-trip via the `?state=` path.
3. **`prove-header-template.mjs`** — the resolver rules in §3.1 and every token in §3.2, from a
   frozen ctx, including: `{unknown}` → `{unknown}`; `{{x}}` → `{x}`; `[a {empty} b]` → `''`;
   `[a {full}]c` → `a <full>c`; `{today:iso}`; a title of `{today}` prints the literal.
4. **`hdrdefault`** — resolving `DEFAULT_HEADER_TEMPLATE` against the baseline calendar's ctx equals
   `computeHeaderDefaults()` for all nine hids, byte for byte. This is the drift guard for the one
   duplicated statement of the auto header.
5. **`hdrtemplate`** — fixture in Manual with templated lines: screen shows resolved text; focusing a
   line shows the raw template; blurring commits raw and re-renders resolved; Excel and PDF carry the
   resolved text (and the Excel `&L` still has no format codes when none is set).
6. **`hdrpreset`** — save current header as a preset → `prefs.headerPresets` gains one entry whose
   `l2` is `{version}` (raw), **not** `v3`; apply another preset → `headerMode === 'manual'`, one
   undo step reverts all nine lines and formats; the preset never appears in `captureSnapshot()`;
   deleting the last preset removes the key; a preset control changing adds **no** undo step and
   **no** `fields.byId` entry.
7. **`hdrfile`** — export → reader round-trip is identity; a file without `kind` is refused; a file
   with an extra unknown key imports with the key dropped.
8. **`hdrexcel`** — a preset the estimator scores at ≥ 250 exports a workbook `check-xlsx.sh`
   accepts, and the trimmer's line-dropping order is unchanged.
9. **`prove-col-permutation.mjs`** and every existing leg still pass (this feature touches none of
   that surface; run it anyway).

---

## 8. Owner decisions

| | decision | recommendation |
|---|---|---|
| **H1** | **Version label.** Always `v` + the input with any leading `v`/`V` stripped (so `3`, `v3`, `V3` all read `v3`)? Any string accepted (`3.1`, `3a`)? | Yes to both; the field is a label, not a number. |
| **H2** | **A Presets ▾ button on the header strip** beside *Header: Manual*. One-line **frozen edit** to `renderSpreadsheetView`'s `.hdr-tools`. | Build the core without it; rule separately after using the Preferences-card path. |
| **H3** | **Applying a preset switches the header to Manual** (it must — Auto is the hand-coded default), and *Header: Auto* then discards it like any hand edit. Acceptable? | Yes; it is the existing mental model. |
| **H4** | **Compatibility judgement.** Turning Manual lines into templates means a legacy header that literally contains a *known* token name in braces — e.g. someone typed `{today}` — starts resolving. Unknown names are untouched. Accept that residual? | Accept; the alternative (a new mode or a flag per file) costs more than the risk. |
| **H5** | **What `{phase.close}` means.** Friday of the final week (recommended: names a day the phase is active), or the Monday of the final week, or the exclusive `seg.end`? Production's is always the real last shoot day. | Friday of the final week. |
| **H6** | **Month-view header in scope?** Needs a frozen edit (`mvLine` reads its store directly). | Out of scope for this build; separate ruling. |
| **H7** | **File extension `.spthdr`** and a **"Calendar header preset"** picker description. | As stated. |
| **H8** | **Presets store templates, never values.** `{version}`, not `v3`. Confirm — it means a preset cannot pin a title or version onto calendars. | Confirm; that is what Show Info is for. |

---

## 9. Traps — read before writing a line

- ⛔ **No `id` on any preset or palette control.** `collectFieldValues()` sweeps `input[id]` /
  `select[id]` / `textarea[id]` into every saved calendar and adds an undo step per change. The
  `.prefs-card` skip covers controls inside that card **only** — a Mantine `Modal` portals to
  `<body>` and escapes it. Use classes and delegated `data-action`, as the header format toolbar and
  the file menu already do.
- ⛔ **`show-version`'s id is save format the moment it ships.** Pick it once.
- ⛔ **Do not change `headerLine`'s signature or `computeHeaderDefaults`'s call shape.** Three call
  sites are inside frozen functions. Carry `ctx` on the defaults object.
- ⛔ **Auto stays hand-coded.** `DEFAULT_HEADER_TEMPLATE` is a *second* statement guarded by a test,
  not the source of Auto's strings. Making Auto read the template risks the byte-identical baseline.
- ⛔ **Snapshot raw, resolve late.** A preset captures templates; the frozen renderer receives
  resolved strings; the `focusin` swap shows raw only while editing. Get one of those backwards and
  either tokens are destroyed on the first edit or literal `v3` is stamped into presets.
- ⚠️ **`focusout` commits `textContent` trimmed with ` ` → space.** Raw templates survive that;
  do not add further normalisation (a template with deliberate double spaces inside a group should
  keep them).
- ⚠️ **Excel strips `&` (`hdrSafe`) and caps at 255 including codes.** Tokens producing `&` are
  fine; long templates lose trailing lines by design. The estimator is an estimate.
- ⚠️ **`{today}` is a local date; schedule dates are UTC.** `computeHeaderDefaults` already makes this
  distinction; the ctx must keep it (`new Date()` for today, `getUTC*` for everything else).
- ⚠️ **`l2`/`c4` hide when empty in Auto (CSS) but show as dashed slots in Manual.** A preset with an
  empty `c4` therefore shows an empty editable slot in Manual — that is existing behaviour, not a bug.
- ⚠️ **Per-component Mantine CSS is imported in a derived order in `src/main.jsx`, never
  alphabetised.** `NativeSelect`, `TextInput`, `Button`, `Group`, `Stack`, `Menu`, `Tooltip` are
  already imported and used in `Sidebar.jsx` / `Header.jsx`; if a new component is introduced, add its
  `*.layer.css` in the position `@mantine/core/styles.layer.css` gives it.
- ⚠️ **`refreshDerivedInfo()` owns `#weeks-production`.** Nothing here touches it, and `show-version`
  must not be routed through `showInfoStatus()`.

---

## 10. Sequencing

```
1. Step 1 (version field + {version} in l2)       <- ⭐ smallest shippable; ship, confirm on live
2. Step 2 (engine) + prove-header-template.mjs
3. Step 3 (Default template + palette) + hdrdefault leg
4. Step 4 (library in Preferences) + hdrpreset leg  <- ⭐ Feature complete for R1-R5 except files
5. Step 5 (files) + hdrfile leg
6. Step 6 (budget, Help, docs)
--- ask ---
7. H2 (strip button, frozen), H6 (month header, frozen) -- only if asked
```

The gate's byte-compare runs after every step; a red compare on any step is a stop, not a note.
