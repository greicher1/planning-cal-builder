# MONTH-HEADER-PLAN.md

**Status:** ✅ **BUILT, 21 Sep 2026.** All seven steps of §7, against the four §6 rulings.
Written as a plan against `2863460`; this header is the only part kept up to date after the build —
the sections below are the plan as it was reasoned, and `README.md`'s changelog entry plus
`HANDOFF.md` are what shipped.

**What changed from the plan while building it, and why:**

- ⭐ **Step 1 does NOT route Auto through the resolver.** The plan said the frozen `mvDefaults`
  should "become a call rather than a rule" by resolving `DEFAULT_MV_TEMPLATE`. It became a call to
  hand-coded `computeMvHeaderDefaults()` instead, because `DEFAULT_HEADER_TEMPLATE` carries an
  explicit standing instruction not to do the other thing: *"Do not 'simplify' by making Auto read
  this template… routing them through the resolver puts the byte-identical baseline at risk for no
  user-visible gain."* The §1.3 duplication is still deleted — the mode-toggle handler's copy was
  the live one — and `DEFAULT_MV_TEMPLATE` is guarded as a deliberate duplicate the same way its
  waterfall twin is.
- ⭐ **The third mode needed no new `mvHeaderMode` value.** `mvHeaderTemplates` is a FLAG, exactly
  as `headerTemplates` is, so frozen `renderMonthView`'s `mvHeaderMode === 'manual'` gate is
  untouched and no file saved before today can reach the new branch.
- ⛔ **`{today}` was not a drop-in**, which §1.3 flagged as worth checking and which turned out to
  matter on **121 days a year**. `{today:dotpad}` was added.
- ⛔ **A regression the plan's gate would not have caught:** in Manual mode every line carries
  `.hdr-editable`, so the "empty added slots are hidden" guarantee silently stopped applying and the
  empty subtitle would have printed. See the changelog.
- ⛔ **A pre-existing restore bug was found and fixed** — the month header had no else branch in
  `applyStateSnapshot()`.

⚠️ **One thing deliberately NOT changed, and it needs an owner ruling:** `.mv-header.hdr-manual-mode`
carries `padding:8px` and a lavender tint, and **nothing strips it in print**. So a month calendar in
Manual or Template mode already prints a 16 px taller header inside a pale purple box — an editing
affordance on paper. That is **pre-existing** (Manual mode has always done it) and changing it would
move the PDF of every existing Manual-mode month calendar, so it was left alone. `.mv-tools` next to
it *is* stripped; this was simply never noticed.
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
| **Blocking** | ✅ **Nothing.** All four §6 rulings landed 21 Sep 2026. |
| **The ruling that costs** | The month header gains **both** the free left slot **and** a new line. The new line shortens every week row on every page — §6 ruling 2. |

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
| **`mvLine()` / `.mv-titlebar` — the LEFT slot** | ⛔ **YES**, but **free in height** — it fills the blank 84 px `::before` reservation (§6 ruling 2) |
| **`mvLine()` / `.mv-titlebar` — the NEW LINE** | ⛔ **YES**, and it **shortens every week row on every page** — the one real cost here (§6 ruling 2) |
| **`mvDefaults` → a resolved template** | ⛔ **YES**, though the output can be held identical |

⭐ **Two of those three can be made provably inert, and one cannot.** A third mode changes a
**button's label and click behaviour** — the button is stripped from the print host
(`.mv-tools`), so the month PDF cannot move. Replacing `mvDefaults` with a resolved template is
inert **iff** the template resolves to the identical string, which is a measurement, not a hope.
**A new slot is a real height change** — ✅ now ruled (§6 ruling 2): the left slot is free, the new line is not.

---

## 5. ⛔ The acceptance gate

1. **Month PDF structure hash unchanged with the feature OFF.** Use the technique from the half-day
   overlay: hash every element's tag + class + `data-ph` + text across `#print-root`, styles
   excluded. A calendar that does not use a month template must print **identically**.
2. **With a template that resolves to today's defaults, the hash is STILL unchanged.** This is the
   real test of §1.3 — it proves the template replaced the rule without changing the output.
3. **`mvNoteLineCount()` row heights unchanged**, and the header's own rendered height unchanged
   **for the left slot** — it fills reserved blank space, so it must move nothing at all.
   ⛔ **For the NEW LINE, the opposite is asserted:** row heights WILL change on every page, so the
   A/B must *quantify* the change (header stack height before/after, each week row's rendered
   height, and which months cross into `scaleY` shrink-to-fit) and put it in front of the owner.
   A structure hash alone cannot see this — it excludes styles, and this is purely geometry.
4. **Zero editor affordances in `#print-root`.** `.mv-tools` is stripped today; assert it, do not
   assume it.
5. **Gates 1–5 unchanged**, and `fields.byId` key set unchanged — no new id'd control.
6. **A v1 `.spthdr` still applies**, and a v2 file with only a `month` section refuses in the
   waterfall **with a named reason**.

⛔ **If the gate fails, STOP and report. Do not re-cut the baseline.**

---

## 6. ✅ Rulings — ALL FOUR LANDED 21 Sep 2026

Asked and answered in one pass. Nothing here is an assumption any more.

**1. ✅ ONE preset file, TWO sections.** The §2 shape: `{sheet:{lines,format}, month:{lines,format}}`,
either section optional, each applied to its own view. A preset is *"our header look"*, not *"our
waterfall header"*. The reasoning that carried it: two files drift, and the failure is a colleague
opening a shared preset and printing **one calendar with two identities**.

**2. ⛔ BOTH — the month header gains the LEFT SLOT *and* a NEW LINE.** This is the expensive
ruling and the only one that moves the month PDF.

⭐ **The question was split before it was asked, because a measurement showed it was two questions
wearing one coat.** Measured in a real browser at 1440×900 on `tests/fixtures/dayoverrides.sptcal`
— the month header is **ONE 33 px row**, not a stack:

| | measured |
|---|---|
| `.mv-titlebar` | 1000 × 33 px, `display:flex; align-items:baseline` |
| `.mv-titlebar::before` | **84 px wide, `content:''` — permanently blank** |
| `.mv-title` | 814 px, `flex:1`, centred (its centre sits 3 px off the titlebar's) |
| `.mv-today` | 79 px, right, `white-space:nowrap` |

⭐ **The 84 px spacer is reserved, blank space that exists ONLY to balance the date** so the title
reads centred. `--mv-today-w` is **never assigned anywhere in the codebase** — verified by grep
across `src/` — so the fallback `84px` is the only value it has ever had. **A left slot therefore
costs ZERO height: it fills a reservation that is already there and already empty.**

⚠️ **The free slot is NARROW and that constraint is load-bearing** — ~84 px is roughly 7–8
characters at the current 20 px bold. Longer content either pushes the title off centre (horizontal
only, still no height) or **wraps, which WOULD add height and forfeits the whole reason it was free**.
Whatever ships here needs `white-space:nowrap` and a measured character budget, not a hope.
`{version}` is the natural fit — Show Info already carries it and the waterfall already tokenises it.

⛔ **The NEW LINE is the half that costs, and the cost is NOT what "adds height to every month PDF"
suggests.** `exportMonthPdf` fits **each month to exactly one sheet**: it measures *"the header stack
height (title + month bar + weekday row)"* and divides the remaining printable area among the week
rows. So a second header line **does not lengthen the document and does not spill to a new page** —
it **shortens every week row on every page**, and pushes any month already in shrink-to-fit
(`scaleY`) further down. On the reference fixture that is all 15 pages.

⛔ **It therefore needs the same before/after the half-day overlay got** — §5, condition 3, with the
structure hash AND the rendered row heights, in front of the owner before it ships. Build it last
(§7 step 6) so the cheap, inert work is already banked and provable when that A/B is taken.

**3. ✅ The SAME editor popup, retargeted by view.** Not a second one. Its Insert rail is
token-driven so it needs no per-view work, and one editor cannot drift from the other.
⛔ It carries **no `id` at all** today, deliberately (`UI-CONVENTIONS.md` §10.9 — fourteen form
controls that would otherwise be baked into every saved calendar with a phantom undo step per
keystroke). Retargeting must not introduce one, and `hdreditor` already asserts the panel's `[id]`
set is empty.

**4. ✅ Keep the `.spthdr` extension; the reader validates `version` UP FRONT.** It refuses cleanly
on anything it does not understand and **never half-applies**. `version: 1` is already in the format
with a comment saying it exists so a later shape can migrate rather than guess — this is that later
shape.

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
5. **The editor retargeted to the month view** — ✅ ruling 3: the SAME popup, switched by view.
   ⛔ It must stay `id`-free; `hdreditor` asserts that and the assertion has to keep passing.
6. ⛔ **The LEFT SLOT** — ✅ ruled in. Frozen markup, but **free in height**: it fills the blank
   84 px `.mv-titlebar::before` reservation. Gate it as *inert* — structure hash AND rendered
   geometry unchanged — and give it `white-space:nowrap` with a measured character budget, because
   a wrap here forfeits the entire reason it was free.
7. ⛔ **THE NEW LINE — ✅ ruled in, and this is the one that costs.** Do it LAST, on its own, with
   the quantified before/after §5 condition 3 now demands in front of the owner. Every week row on
   every page gets shorter; months already in `scaleY` shrink-to-fit go further down.

⚠️ **Cut a `.sptcal` fixture at steps 2 and 4**, and a `.spthdr` fixture of **both** versions at
step 3. `tests/fixtures/` is how the restore path is proven, and the month-view frozen edits went
five deep before anyone cut one.
