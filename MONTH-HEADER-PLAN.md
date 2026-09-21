# MONTH-HEADER-PLAN.md

**Status:** plan only. **No code written.** Written 21 Sep 2026 against `2863460`.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) →
[`HEADER-PRESETS-PLAN.md`](HEADER-PRESETS-PLAN.md) §2–§3 (the waterfall system this extends) →
[`MANTINE-SEAM.md`](MANTINE-SEAM.md) §5.2 (why `renderMonthView` is an export renderer).

> Owner, 21 Sep 2026: *"I also want an entirely separate header template system for the month view.
> Do you think these header template files should save as separate files for the waterfall header
> and the month view header or do you think in some cases it could/should be the same file for both
> and each is shows depending on which view you are in"*

---

## 0. Summary in one screen

| | |
|---|---|
| **What exists** | The waterfall has three modes, 9 slots, 41 tokens, a template editor and `.spthdr` preset files. The month view has a **two-state toggle** over **two** slots and nothing else. |
| **The recommendation** | **ONE preset file with TWO sections**, `sheet` and `month`, each optional, each applied to its own view. Separate *stores and slots*; **one shared resolver**. |
| **The cost** | The month header markup lives **inside `renderMonthView`**, which is frozen and IS the month PDF. A third mode and any new slot is a **frozen edit**. |
| **The free part** | `buildHeaderCtx()` and `resolveHeaderTemplate()` are **view-agnostic already** — verified, not assumed. Tokens cost nothing to reuse. |
| **Blocking** | Four rulings in §6. Nothing should be built before they land. |

---

## 1. What is actually true today — measured, with the symbols

### 1.1 The month header is two slots inside the frozen renderer

```
renderMonthView                    <- FROZEN. It IS the month PDF (exportMonthPdf injects it).
  ├─ mvDefaults   { title, today } <- the auto values
  ├─ mvLine(id, cls)               <- emits .hdr-line[data-mvhid]
  └─ #mv-hdr-mode-btn              <- the two-state toggle
```

Stores: `mvHeaderMode` (`'auto' | 'manual'`), `mvHeaderManual` (`{title, today}`), `mvHeaderFormat`
(per-line size/bold/italic/colour/highlight/align). All three are in `captureSnapshot()`.

⛔ **Everything in that box is frozen.** Adding a `Template` mode changes `#mv-hdr-mode-btn`; adding
a slot changes `.mv-titlebar`. Both are edits to `renderMonthView`, and a new slot **adds a line to
every month PDF**, which is a height change, not a paint. See §5.

### 1.2 ⭐ The token engine is already view-agnostic — this is the finding that makes it cheap

`buildHeaderCtx(schedule)` reads **Show Info fields and the schedule**, never anything
waterfall-shaped: `{title}`, `{season}`, `{titleSeason}`, `{version}`, `{episodes}`,
`{shootDaysPerEp}`, `{shootDays}`, `{today}`, plus a generated set per phase from
`getAllPhaseDefs()`. `resolveHeaderTemplate(str, ctx)` is a pure string function over that context.

**Neither knows which view is asking.** So the month view can use both with **zero changes to
either** — and it must, because two resolvers would eventually disagree about what `{episodes}`
means inside one document. That is the divergence `computePhaseRowLayout()` exists to prevent,
applied to text.

### 1.3 ⛔ The month's auto values are ALREADY duplicated, and that is a latent bug

`renderMonthView` builds them:

```js
const title = rawTitle + (seasonVal ? (rawTitle ? ' ' : '') + 'S' + seasonVal : '');
const todayStr = (now.getMonth()+1) + '.' + String(now.getDate()).padStart(2,'0') + '.' + ...
```

…and the `#mv-hdr-mode-btn` handler builds **the same two strings again**, verbatim, so that
switching to Manual can snapshot them. Two copies of one rule, one of them frozen.

⭐ **A template system deletes the duplicate rather than adding to it.** Make the defaults a
`DEFAULT_MV_TEMPLATE` of `{titleSeason} Full Prelim Production Calendar` / `{today}` and resolve it
through the shared resolver. Then "what does the month header say by default" has **one** definition,
and the frozen copy becomes a call rather than a rule. ⚠️ `{today}` already exists and is LOCAL-time
by deliberate design (see `hdrDate`) — check it renders the same dotted `M.DD.YY` the month view
uses before assuming it is a drop-in.

### 1.4 Preset files today

`.spthdr`, JSON, `{ kind:'spt-header-preset', version:1, name, lines, format }` where `lines` is
keyed by `HDR_IDS` — the **nine waterfall slots**. Stored per-user in `localStorage`
(`prefs.headerPresets`) and exportable/importable as files. ⛔ It has its **own** small reader and
must never go through `parseCalendarText()`; that function is the one reader of calendar files and
is contract.

⭐ **`version: 1` is already there**, with a comment saying it exists "so a later shape can migrate
rather than guess." §3's migration is the thing it was put there for.

---

## 2. The answer to the owner's question: ONE file, TWO sections

**Recommended.** A preset is *"our header look"*, not *"our waterfall header"*.

### Why not two files

The two headers have **structurally incompatible slots** — 9 vs 2 — so a preset for one can never be
*applied* to the other. That argues for two **sections**, and it is the only thing it argues for.

What two *files* would cost: the unit a user thinks in is one look across both outputs. Two files
drift. Someone sends a colleague their waterfall preset, the colleague's month header stays default,
and **one calendar prints two different identities**. That is the same failure class as three
independent column-width systems, in text.

### Why not one merged template

Already answered: 9 slots vs 2, and the waterfall's are constrained by Excel's 255-character page
header while the month's are not. They cannot be one thing.

### The shape

```json
{ "kind": "spt-header-preset", "version": 2, "name": "SPT Standard",
  "sheet": { "lines": { "left": "...", "c1": "...", "...": "" }, "format": { } },
  "month": { "lines": { "title": "...", "today": "..." },          "format": { } } }
```

- **Either section may be absent.** A month-only preset applies in the month view and, in the
  waterfall, refuses **by name** — "This preset has no waterfall header" — never silently.
- **Applying writes whichever sections exist**, as **one undo step**, matching `applyHeaderPreset()`.
- **`version: 1` migrates forward in three lines**: top-level `lines`/`format` become
  `{sheet:{lines,format}, month:null}`. Forward-only, the shape `migrateRegionSnapshot()` already
  models.

⚠️ **A v2 file cannot be read by an older build, and that is unfixable by design** (CLAUDE.md: old
file into new app, never the reverse). The blast radius is small — presets are niche and the deployed
build is current — but the reader must **reject cleanly**, never half-apply. Worth an explicit test.

⚠️ **Do NOT reuse `.spthdr` for a v2 file silently if the reader would half-succeed.** Either the
reader validates `version` up front and refuses, or the extension changes. Decide in §6 ruling 4.

---

## 3. What the month system gets

**Separate stores and slots. Shared resolver, shared token catalogue, shared grammar.**

| | Waterfall | Month |
|---|---|---|
| slots | `HDR_IDS` — 9 | `MV_HDR_IDS` — `title`, `today` (see ruling 2) |
| mode | `headerMode` + `headerTemplates` | `mvHeaderMode` — gains `'template'` |
| raw store | `headerManual` | `mvHeaderManual` |
| format | `headerFormat` | `mvHeaderFormat` |
| defaults | `DEFAULT_HEADER_TEMPLATE` | `DEFAULT_MV_TEMPLATE` (new, §1.3) |
| resolver | `resolveHeaderTemplate` | **the same one** |
| tokens | `buildHeaderCtx` | **the same one** |
| editor | the template editor popup | **the same popup, retargeted** (ruling 3) |

⚠️ **`captureSnapshot()` gains `mvHeaderTemplates`** (or `mvHeaderMode: 'template'`). Absent must
mean **today's behaviour**, so every calendar saved before this keeps its header. Same rule
`SHEET_GRIDLINES` and `snap-<key>` follow.

⛔ **No new id'd control anywhere in the editor.** `collectFieldValues()` sweeps every `input[id]` /
`select[id]` / `textarea[id]` into saved files *and* the undo stack. The existing editor is
class-only for exactly this reason and the `hdreditor` leg asserts it.

---

## 4. What is frozen, and what is not

| Piece | Frozen? |
|---|---|
| `buildHeaderCtx`, `resolveHeaderTemplate`, `hdrScan`, `lookupHeaderToken` | **No** |
| `headerFmtToolbarHtml`, the preset store, the `.spthdr` reader/writer, the template editor popup | **No** |
| `mvHeaderMode` / `mvHeaderManual` / `mvHeaderFormat` and the save format | **No** |
| **`#mv-hdr-mode-btn` — two states → three** | ⛔ **YES** — it is markup inside `renderMonthView` |
| **`mvLine()` / `.mv-titlebar` — any new slot** | ⛔ **YES**, and it **changes the month PDF's height** |
| **`mvDefaults` → a resolved template** | ⛔ **YES**, though the output can be held identical |

⭐ **Two of those three can be made provably inert, and one cannot.** A third mode changes a
**button's label and click behaviour** — the button is stripped from the print host
(`.mv-tools`), so the month PDF cannot move. Replacing `mvDefaults` with a resolved template is
inert **iff** the template resolves to the identical string, which is a measurement, not a hope.
**A new slot is a real height change and needs its own ruling.**

---

## 5. ⛔ The acceptance gate

1. **Month PDF structure hash unchanged with the feature OFF.** Use the technique from the half-day
   overlay: hash every element's tag + class + `data-ph` + text across `#print-root`, styles
   excluded. A calendar that does not use a month template must print **identically**.
2. **With a template that resolves to today's defaults, the hash is STILL unchanged.** This is the
   real test of §1.3 — it proves the template replaced the rule without changing the output.
3. **`mvNoteLineCount()` row heights unchanged**, and the header's own rendered height unchanged
   unless a slot was added under ruling 2.
4. **Zero editor affordances in `#print-root`.** `.mv-tools` is stripped today; assert it, do not
   assume it.
5. **Gates 1–5 unchanged**, and `fields.byId` key set unchanged — no new id'd control.
6. **A v1 `.spthdr` still applies**, and a v2 file with only a `month` section refuses in the
   waterfall **with a named reason**.

⛔ **If the gate fails, STOP and report. Do not re-cut the baseline.**

---

## 6. ⏳ Rulings needed before any code

1. **One file with two sections — confirmed?** (§2. The owner has indicated yes; recorded here so
   the build has a written ruling to point at.)
2. **Does the month header get MORE than two slots?** Two is what exists. A subtitle or a left/right
   pair would be genuinely useful for a template system — and it is the **one change here that
   adds height to every month PDF**. If yes, it needs the same before/after the half-day overlay
   got. **Default assumption: NO new slots**, template the two that exist.
3. **Does the month use the SAME editor popup, retargeted, or its own?** Recommendation: the same
   one, switched by view — it is already "not a second renderer" and reuse keeps it that way. Its
   Insert rail is token-driven and needs no per-view work.
4. **Does a v2 preset keep the `.spthdr` extension?** Recommendation: yes, with the reader
   validating `version` up front and refusing anything it does not understand.

⏸ **Still unanswered from `MONTH-VIEW-PLAN.md`, asked four times now:** do any of the other
"adjustments" the owner has in mind move dates?

---

## 7. Suggested order

Steps 1–3 touch **no frozen code** and can ship before anything is drawn.

1. **`DEFAULT_MV_TEMPLATE` + resolve the month defaults through the shared resolver**, with the
   frozen `mvDefaults` still producing today's exact strings. Gate condition 2 is the proof.
   ⭐ This deletes the §1.3 duplication and is worth doing **even if the rest is never built**.
2. **`mvHeaderTemplates` in the stores, the save format and the resets.** Absent = today.
3. **The `.spthdr` v2 shape, the migration, and the per-view apply.** Cut a fixture of each version.
4. ⛔ *Frozen work begins.* **The third mode on `#mv-hdr-mode-btn`**, against §5.
5. **The editor retargeted to the month view** (ruling 3).
6. ⛔ **New slots, only if ruling 2 says so**, against §5 with a before/after in front of the owner.

⚠️ **Cut a `.sptcal` fixture at steps 2 and 4**, and a `.spthdr` fixture of **both** versions at
step 3. `tests/fixtures/` is how the restore path is proven, and the month-view frozen edits went
five deep before anyone cut one.
