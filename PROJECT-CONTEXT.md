# SPT Planning Calendar Builder — Full Project Context

**Purpose of this document:** everything a fresh Claude session needs to work on this project
with no prior context. Pair it with the current `index.html` and you have the whole picture.

**Last updated:** at commit `ae42e96` (Excel header 255-char fix).

---

## 1. What this app is

A **TV production scheduling tool** used to build season planning calendars. You give it phase
start dates and durations; it produces a week-by-week **waterfall calendar**, a **month
calendar**, an **Excel workbook**, and **printable PDFs**.

It is used by production/scheduling staff at a TV studio ("SPT" = Sony Pictures Television).
The output is the sort of one-page planning calendar that gets circulated to a production team.

**Live URL:** https://greicher1.github.io/planning-cal-builder/
**Repo:** https://github.com/greicher1/planning-cal-builder (public)
**Owner:** Graham Reicher (grahamreicher@gmail.com)

### The six built-in phases (in order)

`writersRoom` → `prePrep` → `prodPrep` → `production` → `post` → `localization`

Every phase takes a **start date + a number of weeks**, except **Production**, which is measured
in **shoot days** and simulated day-by-day. Users can also add **custom phases** (keys
`custom<n>`).

---

## 2. Hard architectural constraint: ONE FILE

`index.html` is a **single self-contained HTML file** (~6,100 lines, ~380 KB). One `<style>`
block, static markup, one big `<script>` block.

**Do not split out CSS/JS or add local asset files.** This is load-bearing, not stylistic:

- **Saved calendars *are* copies of `index.html`** with the user's state baked into a
  `<script id="saved-state">` block. A saved calendar is a fully working copy of the app.
- The PWA manifest and all icons are inlined as `data:` URIs so the tool can be **emailed
  around as one file** and run offline from `file://`.

**The only external dependencies:** ExcelJS from a CDN `<script>` tag (line ~1003) and Google
Fonts. Everything else is inline.

**No build system. No package manager. No test framework. No server.**

**Run it:** `open index.html` on macOS, or serve the directory over HTTP. Reload to test.
Chrome/Edge are the target browsers — the File System Access API (`showSaveFilePicker`) and
IndexedDB handle persistence degrade to a plain download elsewhere.

---

## 3. Core data flow

Everything funnels through one cycle, driven by `update()` (line ~4315):

```
DOM inputs → readState() → computeSchedule(state) → render(schedule) → markDirty()
```

- **`readState()`** (~1591) reads every `#start-<key>` / `#weeks-<key>` field, hiatus rows,
  per-phase hiatuses, Show Info, and the region selectors.
  Note: once Show Info is complete (`showInfoStatus()`), **`episodes × days-per-episode`
  overrides** whatever was typed in the Production row, everywhere.

- **`computeSchedule(state)`** (~1650) is the heart of the app. Returns
  `{weeks, maxConcurrent, totalWeeks, segments, hiatuses, gaps, notesByIdx, productionInfo,
  phaseHolidays, error?}`. Each week carries its phase segments, hiatus flags, and auto-notes.

- **`render(schedule)`** (~2359) dispatches to `renderSpreadsheetView()` (waterfall, ~3165) or
  `renderMonthView()` (~2638) per `viewMode` (`'sheet' | 'month'`), plus the summary row and the
  holiday list in Settings.

### Deliberate scheduling behaviours (do not "fix" these)

- **Hiatuses PAUSE a phase, they don't consume its weeks.** `extendEndForHiatus()` (~1677)
  walks week-by-week and only counts non-hiatus weeks, so a phase always delivers its full
  requested span — the hiatus pushes its end date out. Overlapping hiatuses extend by the
  **union**, not per-hiatus.
- **Production alone runs a day-level simulation** (`simulateProductionSchedule()`, ~1701):
  skips weekends, hiatus days, and **enabled** union holidays for the selected region until the
  shoot-day count is met.
- **Global hiatuses** apply to all phases; **`phaseHiatuses[key]`** pauses only its own phase.
- `MAX_WEEKS = 600` guards against typo'd years hanging the page.
- All weeks are **Monday-snapped**.

---

## 4. Dates convention (important)

All dates are handled as **UTC midnight**. Always use the helpers, never raw `Date` math:

| Helper | Line | Purpose |
|---|---|---|
| `parseDateUTC()` | 1474 | parse `'YYYY-MM-DD'` to a UTC-midnight Date |
| `addDays(d, n)` | 1480 | day arithmetic |
| `mondayOf(d)` | 1481 | snap to the week's Monday |
| `isoOf(d)` | 2498 | back to `'YYYY-MM-DD'` |
| `fmtShort(d)` | 1486 | display format |

Using local-time `Date` math here causes off-by-one-day bugs that are painful to track down.

---

## 5. The holiday / region system (the most researched part)

This was rebuilt from primary union-contract sources. **The data is generated from rules, not
hand-transcribed — regenerate it rather than editing dates by hand.**

### Region model

The region is a **country + a sub-region**, held in **three separate `<select>` elements** so
every option set stays static and a restored save can set any value directly:

| Element | Values |
|---|---|
| `#union-country` | `US`, `CA`, `UK` (+ hidden legacy `CAN`) |
| `#union-usregion` | `US-GEN`, `US-NY` |
| `#union-subregion` | `CA-BC`, `CA-ON`, `CA-QC`, `CA-AB`, `CA-MB`, `CA-NS` |

Supporting functions:

- **`effectiveRegionKey()`** (~4346) resolves country + sub-region to ONE `HOLIDAYS` key.
  The bare `US`/`CA` values are **never** keys.
- **`reflectRegionUI()`** (~4360) shows whichever sub-region row applies (UK has none).
- **`normalizeRegionSelection()`** (~4334) rewrites the legacy `CAN` value from pre-split saves
  and fills a missing sub-region with that country's default (`CA-BC` / `US-GEN`).
- **`syncRegionTracking()`** (~4538) re-baselines the change-guard after any programmatic
  load/restore, so the next user change isn't compared against a stale value.

### THE RESEARCH FINDINGS (verified against primary sources — do not silently change these)

**United States — IATSE's 11 recognized holidays.**

`US-GEN` (West Coast Studio Local Agreements **and** the Area Standards Agreement — verified
word-for-word identical, so **LA = Atlanta = Albuquerque**):

> New Year's Day · Martin Luther King Jr. Day · Presidents' Day · **Good Friday** · Memorial Day ·
> Juneteenth · Independence Day · Labor Day · Thanksgiving · Day After Thanksgiving · Christmas

`US-NY` (IATSE Local 52 Majors Agreement) — **swaps Good Friday for Veterans Day.** Same count
(11), different days.

**Critical corrections that were made** (the app previously had these wrong):

- **Columbus Day is on NO IATSE calendar.** It appears in neither US list. It was wrongly
  costing shoot days.
- **Veterans Day is AICP *commercial*-contract only** — so it is correct for **New York only**,
  never for General.
- **Good Friday IS a US union holiday** (not Canada/UK-only).
- **Day After Thanksgiving** is recognized (Basic + Low Budget, not AICP).
- **Juneteenth** was added effective **1 Jan 2025** (2024 MOA), so it applies for 2026–2029.
  The same MOA raised the unworked-holiday percentage 4% → 4.583%.
- **MLK Day** was added to Local 52 effective **1 Jan 2023** (raising its percentage
  3.719% → 4%).
- **Christmas Eve and New Year's Eve are NOT holidays** (in BC they carry premium pay but are
  working days). Do not mark them as no-shoot.

**Canada — per province, because the statutory lists genuinely diverge:**

| Holiday | BC | ON | QC | AB | MB | NS |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| New Year's, Good Friday, Canada Day, Labour Day, Christmas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Family Day / Louis Riel / Heritage Day (3rd Mon Feb) | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Victoria Day (Patriotes in QC) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Thanksgiving | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Boxing Day** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Remembrance Day** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Truth & Reconciliation** | ✅ | ❌* | ❌ | ❌ | ✅ | ❌ |
| **Aug civic holiday** | ✅ BC Day | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Fête nationale (24 Jun)** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

Totals: **BC 11 · ON 9 · QC 8 · AB 9 · MB 9 · NS 6**

\* Ontario's IATSE Local 873 treats 30 Sept as a *"Proclaimed Holiday"*, not statutory, with an
auto-upgrade clause if Ontario legislates it.

Other notes: **Quebec requires Good Friday *or* Easter Monday (employer's choice)** — the app
lists Good Friday; switch manually if a production observes Easter Monday. **Nova Scotia is the
outlier** with only 6 (no Victoria Day, Thanksgiving, or Boxing Day) — a Halifax production's
IATSE 849 agreement may add some back, but there was no primary source for it so nothing was
invented.

**Weekend observance rule** (verified verbatim from the ASA):

> *"If any of the above-named holidays falls on a Sunday, the following Monday shall be
> considered the holiday and if any... falls on a Saturday, the preceding Friday shall be
> considered the holiday, except that during six (6) day workweeks, Saturday holidays will be
> recognized on Saturday."*

So: **US shifts Sat→Fri / Sun→Mon.** **Canada and UK move forward to the next free weekday**,
which is why a Saturday Christmas + Sunday Boxing Day correctly become Monday + Tuesday rather
than colliding.

A weekend holiday also emits an **`(Observed)` weekday entry**. Only that observed entry can
actually cost a shoot day (weekends are already skipped), so the UI greys out the Enable box on
the weekend entry itself.

### Primary sources (re-verify here if the data is ever questioned)

- IATSE Local 695 holiday calendar — https://www.local695.com/iatse-holiday-calendar/
- IATSE Basic Agreement 2021–2027 — https://www.editorsguild.com/Portals/0/FullContract/COMBINED%20IATSE%20BASIC%20AGREEMENT%20-%202021-2027.pdf
- 2024 IATSE Area Standards Agreement MOA — https://iatse.net/wp-content/uploads/2024/07/2024-IATSE-Area-Standards-Agreement-MOA-FINAL.pdf
- IATSE Local 52 Majors Agreement — https://amptp.org/wp-content/themes/amptp/assets/pdf/IATSE/New%20York%20Agreements/Local%2052/
- BC statutory holidays — https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards/statutory-holidays
- Ontario ESA public holidays — https://www.ontario.ca/document/your-guide-employment-standards-act-0/public-holidays
- Alberta general holidays — https://www.alberta.ca/general-holidays-pay
- Manitoba general holidays — https://www.gov.mb.ca/labour/standards/
- Nova Scotia paid holidays — https://novascotia.ca/lae/employmentrights/holidaychart.asp

**Not verified:** DGA and Teamsters holiday lists (those claims failed verification). IATSE is
the safe anchor because crew holidays are what actually stop a shoot day. Also unverified:
whether Juneteenth reached Local 52 (industry-wide pattern says yes; the current Local 52 MOA
would not open).

### Holiday identity — stable IDs

A holiday's id is **`slug(name)@year`** (e.g. `good-friday@2026`), produced by `holidaySlug()`
(~1524). It used to be the bare ISO date, which was fragile: switching region kept the date but
changed the holiday, so a per-holiday choice silently transferred to whatever now fell on that
day. With name-based ids a choice **follows the holiday** across region changes, and settings for
a holiday the new region lacks simply lie dormant.

`migrateHolidayViewKeys()` (~1535) rewrites old date-keyed entries on load.

### Enable / disable and custom holidays

- **`holidayOff`** — `hid → true` means the user switched that holiday OFF. Empty map = all on.
- **`customHolidays`** — `[{id, name, date}]`, the user's own single-day holidays. Ids are random
  (`cst-xxxxxxx`) so renaming keeps the settings. **Deliberately NOT region-scoped**, so a
  studio shutdown survives a region change. Always listed even when outside the current phases.
- **`fullHolidayList(regionKey)`** (~1555) merges the region's list with the custom ones and tags
  each with `enabled`.
- Disabling a holiday **changes Production's dates**, so it warns once (only when note edits
  exist) rather than hard-blocking.
- Custom holidays fill a real gap: hiatus rows are **whole Monday-snapped weeks**, so there was
  previously no way to block a **single day**.

---

## 6. Other subsystems

### Simultaneous Post

Marks weeks where post runs concurrently with the shoot. Lives inside the Production row (its
offset counts weeks from Production's start). A **numbering toggle** (`#simpost-count`, default
ON) chooses between:

- **On:** weeks read "Simultaneous Post wk 1, 2…" and the regular Post phase **continues** from
  there (Post wk 3, 4…). One unbroken post-week sequence.
- **Off:** every flagged week reads just "Simultaneous Post" and Post starts again at wk 1.

`simPostLabel()` (~1025) centralizes the marker text so the waterfall, Excel export, and month
view can't drift apart.

### "Start after previous phase"

Each built-in phase except Writers Room has a small text button that fills its start date with
the week right after the nearest **earlier scheduled** phase ends, following `PHASE_CHAIN`
(~4427). Handles hiatuses two ways: the previous phase's end already accounts for hiatuses
*inside* it, and then `autostartPhase()` (~4439) steps past any hiatus at the boundary so the new
phase lands on a working week. One-time fill; the date stays editable. Custom phases excluded.

### Notes

The Notes column auto-fills milestones ("Start Principal Photography", "Principal Photography
Wraps", holidays, sim-post flags). Users can edit, recolor, or clear any note.

**The two views own their notes separately:**
- **Waterfall notes** are the master set — they appear in the Waterfall, the Excel export, AND
  the Month view.
- **Month view notes** (added via the `+` on a day) belong to the Month view and its PDF only,
  and deliberately do NOT appear in the Waterfall or Excel.

`userNotes[key].text === ''` means "auto-note explicitly cleared" and stays gone.

### Sidebar tabs

Three tabs: **Show**, **Phases**, **Settings** (`setSidebarTab()`, ~3944). Sections are
`<section class="card" data-tab="...">`. The Settings tab holds **Production Region** and
**Holidays** together — they were previously split across two tabs, which made the region
undiscoverable.

---

## 7. State model & the THREE-PLACES RULE

State lives in **module-scope mutable variables**, not a single store. The persisted ones:

| Variable | Purpose |
|---|---|
| `userNotes` | note-cell overrides (`text:''` = auto-note cleared) |
| `dayNotes` / `dayNoteColors` | month-view per-day notes and legacy colours |
| `noteColors`, `hiatusTexts`, `hiatusColors` | per-cell appearance overrides |
| `holidayView` | which holidays show in which view (`{sheet, month}`) |
| `holidayOff` | holidays switched off (affects the schedule) |
| `customHolidays` | user-added single-day holidays |
| `headerMode`/`headerManual`, `mvHeaderMode`/`mvHeaderManual` | auto vs hand-edited header lines |
| `mvExtraLanes` | extra note lanes per month-view week |
| `customPhaseDefs`, `episodeDefs` | dynamic rows |
| `phaseColorOverride` | per-phase colour overrides |
| `viewMode`, `sidebarTab` | UI position |

> ### ⚠️ Any new persistent state must be added in THREE places or it silently won't survive a save:
> 1. the `stateSnapshot` literal in `buildSavedHtml()` (~4802)
> 2. the matching branch in `restoreSavedState()` (~5905)
> 3. if it's a DOM field, `collectFieldValues()` / `reflectFieldsToAttributes()`
>
> There is also a **second** `stateSnapshot` for the IndexedDB/localStorage backup (~4987) —
> update that too.

---

## 8. Save / restore

**Save writes a new complete HTML document**: `document.documentElement.outerHTML` with live
state serialized into `<script id="saved-state" type="application/json">` (line 750, ships as
`null`). `<` is escaped to `<` so user text containing a closing script tag can't truncate
the file.

On load, `restoreSavedState()` (~5905) parses that block and replays it: rebuilds custom-phase
and hiatus rows **first** (re-keying generated ids to the saved keys), then applies
`fields.byId`, then the in-memory maps.

**`reflectFieldsToAttributes()` exists because `outerHTML` serializes *attributes*, not live DOM
property values** — form fields must have their values written back to attributes before
snapshotting.

File handles are kept in **IndexedDB** (`spt-planning-cal` / `handles`) as a recents list, so a
reopened saved file can write back in place after one permission click. `suppressDirty` gates
dirty-tracking during load/restore; `markDirty()` schedules a localStorage backup and the
10-minute autosave.

**Consequence to remember:** a saved calendar carries the app code from whenever it was saved.
Fixing a bug in `index.html` does **not** fix already-saved calendars. To repair one, patch the
code inside that saved file (this has been done before — see §11).

---

## 9. Exports

### Excel (`exportExcel()`, ~3582)

Builds an ExcelJS workbook directly with explicit column widths, merges, and ARGB fills.
`computeBlockLayout()` (~4048) / `computePhaseRowLayout()` (~4155) compute the column-slot
assignment — **the same layout logic backs the on-screen waterfall**, so changes there affect
both.

> ### ⚠️ Excel caps a header/footer string at 255 characters IN TOTAL (not per `&L`/`&C`/`&R` section).
> One character over and the file still writes and still parses as valid XML, but Excel refuses
> it on open with *"We found a problem with some content… Do you want us to try to recover as
> much as we can?"* — which looks like corruption, not a too-long header.
>
> A real calendar hit this at exactly **256** characters. The export now enforces the limit
> (`HF_MAX`, ~3708) by dropping trailing detail lines (right-hand stats before centre subtitles,
> never a block's first line), with a backstop that shaves the longest remaining line inside its
> own text so it can't cut through an `&` control code.
>
> Note the three `&B&12&"Calibri,Bold"` prefixes cost **60 of the 255** on their own, leaving
> only ~195 for actual text.

### PDF

- **Month PDF** (`exportMonthPdf()`, ~5391) — renders every month into `#print-root`, adds
  `body.printing-calendar`, calls `window.print()`.
- **Waterfall PDF** (`exportWaterfallPdf()`, ~5603) — fits the ENTIRE grid onto ONE page and
  picks the orientation that prints largest, mirroring Excel's "fit sheet on one page".
  Orientation follows the grid's **width**; `MARGIN_MM = 5` (Excel's "Narrow"); the grid is
  pinned to its measured width so the print can't reflow and spill a row; height gets a 4%
  cushion for per-row sub-pixel rounding. Gridlines are fine **dotted** light grey (dashed
  rendered as chunky marks once the fit-to-page zoom magnified them).

> ### ⚠️ Always clear `body.printing-*` and `#print-root` before starting a print.
> A stuck class hides the entire app and makes the next print silently do nothing.

---

## 10. Development process (how this project is actually worked on)

### Workflow

1. **Make the change** in `index.html`.
2. **Verify it in a real browser** — never claim it works from code reading alone. The owner
   expects evidence.
3. **Report what was verified**, with concrete before/after values.
4. **Wait for an explicit "commit and push."** The owner gates every deploy. Committing locally
   while waiting is fine and expected; pushing without being asked is not — `main` auto-deploys
   to a public site.
5. **Push → GitHub Pages redeploys** (~40 s). Verify the live URL actually serves the change.

### Owner's preferences (learned over the project)

- Wants to **test locally before deploying**; will often say "I want to test it before I push."
- Says **"commit and push"** (or "push and ship") explicitly when ready. Honour that gate.
- Wants **honest reporting** — if something wasn't verified, say so. Corrections are welcomed
  (e.g. the "US is uniform nationally" claim was wrong and needed retracting).
- Prefers **discussing design before building** for anything substantial ("explain to me exactly
  how X will work before you build it"). Mockups help.
- Pushes back usefully — if the owner questions a finding, re-examine it rather than defending.

### Commit style

Long, explanatory commit messages: **what changed, why, what was verified**, and the bug history
where relevant. Look at `git log` for the established tone. Every commit ends with:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

(Match whatever model is actually doing the work.)

### Code comment style

The codebase comments explain **why** — bug history, browser constraints, the failure that
motivated the code — often at length. **Match that style** when the reasoning is non-obvious,
and **keep existing explanatory comments intact** when editing nearby. These comments are the
project's real documentation.

---

## 11. Testing methodology (no test framework — use headless Chrome)

There is no test runner. The reliable pattern is a **throwaway static server that injects a test
script**, driven by headless Chrome with `--dump-dom`, writing results into a `<pre>` that gets
parsed back out.

```js
// /tmp/testsrv.js — serve index.html with a test script injected
const http=require('http'), fs=require('fs'), path=require('path');
const ROOT='/Users/apple/Downloads/Calendar Builder';
const INJECT=`
<pre id="R">pending</pre>
<script>
window.addEventListener('load',function(){setTimeout(function(){
  var out={};
  function set(id,v){var e=document.getElementById(id);if(!e)return;e.value=v;
    ['input','change'].forEach(function(t){e.dispatchEvent(new Event(t,{bubbles:true}));});}
  try{
    set('show-title','T'); set('shoot-days-per-ep','10'); set('num-episodes','10');
    set('start-production','2026-01-05');
    set('union-country','US'); set('union-usregion','US-GEN');
    out.wrap = (Array.from(document.querySelectorAll('table.sheet-table td'))
      .find(function(x){return /Principal Photography Wraps/.test(x.textContent||'');})||{}).textContent;
  }catch(e){ out.EX=e.message; }
  document.getElementById('R').textContent=JSON.stringify(out,null,1);
},1000);});
</script>`;
http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html';
  fs.readFile(path.join(ROOT,p),(e,d)=>{
    if(e){r.writeHead(404);r.end('nf');return;}
    let o=String(d); if(q.url.includes('test')) o=o.replace('</body>',INJECT+'</body>');
    r.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});r.end(Buffer.from(o));
  });
}).listen(8190,()=>console.log('8190'));
```

Then:

```bash
node /tmp/testsrv.js & sleep 2
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-sandbox --user-data-dir=/tmp/tc --virtual-time-budget=8000 \
  --dump-dom "http://localhost:8190/index.html?test" > /tmp/out.html
# then grep the <pre id="R"> block out of /tmp/out.html
```

### Practical gotchas with this harness

- **`grep` on `index.html` often fails** (very long lines). Use `node -e` with `readFileSync`
  and split on `\n` instead.
- **Use a fresh port each run** — `EADDRINUSE` silently yields a bogus page that looks like a
  test failure. Always `pkill -f` old servers first and check the server actually started.
- **Kill stale Chrome:** `pkill -9 -f "Google Chrome.*headless"`, and use a unique
  `--user-data-dir` per run.
- **`timeout` doesn't exist on macOS** by default.
- **Closure scope:** app functions live inside one big script and are NOT globals. To trigger an
  export from a test, **click the button** (`document.getElementById('export-btn').click()`),
  don't call `exportExcel()`.
- **To capture an exported file**, monkey-patch `URL.createObjectURL` to grab the Blob, then
  base64 it into the DOM and decode locally.

### Validating an exported .xlsx

```bash
mkdir x && cd x && unzip -q out.xlsx
for f in $(find . -name "*.xml"); do xmllint --noout "$f" || echo "FAIL $f"; done
```
Then check, in order of likelihood: **header/footer length ≤ 255**, overlapping merged ranges,
column widths ≤ 255, style indices < `cellXfs count`, control characters in `sharedStrings.xml`.

### Verifying a deploy

```bash
node -e "const https=require('https');
https.get('https://greicher1.github.io/planning-cal-builder/?t='+Date.now(),r=>{
  let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(d.includes('SOME_MARKER')));});"
```
GitHub's CDN can serve a stale copy for a minute — cache-bust with a query string, and tell the
user to hard-refresh (Cmd+Shift+R) or use Incognito.

---

## 12. Bug history & traps (things already learned the hard way)

- **Excel "corrupt file" alert** = the 255-char header limit, not real corruption. See §9.
- **Waterfall PDF printed 2 pages**: `width:fit-content` let columns reflow narrower, wrapping
  text and making the real height exceed the measured height. Fixed by pinning the wrapper to the
  measured width plus a height safety factor.
- **Phase columns spanning wrongly**: occupancy tracked *weeks* rather than *phase identity*.
  Fixed with per-occupant-key tracking.
- **Victoria Day is the Monday STRICTLY before 25 May.** When 25 May is itself a Monday (2026),
  Victoria Day is 18 May, not 25 May. Easy off-by-one.
- **A "download gateway"** (forcing users to download rather than run the hosted app) was built
  and then **reverted** — it broke for anyone who had installed the PWA, because an installed app
  loads the hosted URL and got gated. It lives in history at `ffadc6d` if ever revisited; the
  installed-PWA fix was started but never finished.
- **Button height inconsistency**: `button.primary` (specificity 0,1,1) overrode `.tb-btn`
  (0,1,0). Fixed with `:not(.tb-btn)`.
- **The app's `holidayView` checklist used to be display-only.** It now has an Enable column that
  genuinely changes the schedule — don't confuse the two.
- **Repairing an already-saved calendar** requires patching the code inside that `.html` file,
  because saved calendars embed the app. This was done for a user's file by string-replacing the
  affected function and writing a `(Excel fix)` copy — the original was left untouched.

---

## 13. Pending / discussed but not built

**New Calendar intake screen** — agreed in design, not implemented:

- **One screen** (not stepped), shown as a **modal over the app**.
- Collects: show title + season, episodes × days-per-episode, and **Production Region** (the
  whole point — Region is the most consequential field and is otherwise undiscoverable now that
  it lives in Settings).
- **No anchor date**, no phase dates (those need the live waterfall), no holiday customization.
- Must be **skippable** and never blocking; add a quiet empty-state hint for anyone who skips.
- ⚠️ **Must never appear when opening a saved calendar** — trigger off "no saved state AND no
  fields filled", not merely "page loaded". Saved calendars are copies of the app, so getting
  this wrong greets every saved calendar with a setup form.
- Also triggered by the existing **New** button.

**Explicitly deferred:** an imported "holiday pack" format and a server-side/admin authoring UI.
Judged unnecessary while the tool is still pre-release with no external users. If revisited: a
static `admin.html` that authors holiday rules and exports a pack is the recommended approach —
**not** a live API, which would break offline use and risk silently shifting dates under already-
saved calendars. Holiday data must never auto-update into an existing calendar.

**Not yet done:** non-holiday settings (export options, defaults) in the Settings tab — the owner
asked to hold off on those.

---

## 14. Quick line-number map (as of `ae42e96`)

Approximate; the file shifts as it's edited. Regenerate with:
`grep -n "^\s*\(async \)\?function [a-zA-Z]" index.html`

| Area | Line |
|---|---|
| `<style>` block | 21–746 |
| `<script id="saved-state">` | 750 |
| ExcelJS CDN tag | 1003 |
| Main `<script>` | 1004–6130 |
| `PHASES` | 1008 |
| `HOLIDAYS` | 1052 |
| `holidaySlug` / `migrateHolidayViewKeys` / `fullHolidayList` | 1524 / 1535 / 1555 |
| `readState` | 1591 |
| `computeSchedule` | 1650 |
| `extendEndForHiatus` | 1677 |
| `simulateProductionSchedule` | 1701 |
| `buildPhaseRows` | 1998 |
| `renderHolidayVisList` | 2292 |
| `render` | 2359 |
| `renderMonthView` | 2638 |
| `renderSpreadsheetView` | 3165 |
| `exportExcel` | 3582 |
| Excel header 255 guard (`HF_MAX`) | 3708 |
| `setSidebarTab` | 3944 |
| `computeBlockLayout` / `computePhaseRowLayout` | 4048 / 4155 |
| `countryChangeWouldClobber` | 4258 |
| `update` | 4315 |
| Region helpers | 4334–4386 |
| `autostartPhase` | 4439 |
| `syncRegionTracking` | 4538 |
| `buildSavedHtml` state snapshot | 4802 |
| Backup snapshot | 4987 |
| `exportMonthPdf` | 5391 |
| `exportWaterfallPdf` | 5603 |
| `restoreSavedState` | 5905 |

---

## 15. Starting a fresh session — suggested first message

> This is the SPT Planning Calendar Builder, a single-file HTML TV production scheduling tool.
> I'm attaching `PROJECT-CONTEXT.md` (full context) and `index.html` (the app). Please read the
> context doc first. Key things: it must stay a single self-contained file, saved calendars are
> copies of the app itself, verify changes in a real browser before telling me they work, and
> don't push to `main` until I say "commit and push" — it auto-deploys to a public site.

Also worth re-creating a `CLAUDE.md` in the repo (one already exists and should be kept current)
so the guidance loads automatically in Claude Code.
