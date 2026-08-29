# tests/harness/

The headless-Chrome harness described in `PROJECT-CONTEXT.md` §11, committed so it stops being
rebuilt from scratch every time someone needs it. **It is not deployed and not part of the app** —
nothing in `index.html` references it.

## Why it looks like this

The app has no build step, no runner, and one `<script>` block wrapped in an IIFE. Nothing inside
that IIFE is a global, so a test **cannot call the app's functions** — it has to drive the DOM the
way a user does: set a field and dispatch `input`+`change`, or click a button. And because some
tests need to *fetch* a fixture, the page has to be served over HTTP rather than opened from
`file://`.

So: a throwaway server injects a test script into `index.html`, headless Chrome runs it with
`--dump-dom`, and the test writes its result as JSON into a `<pre id="R">` that gets parsed back
out. That is the whole mechanism.

**And that is why it is Chrome-only.** `--headless=new`, `--dump-dom` and `--virtual-time-budget`
are the mechanism, not an implementation detail of it. Safari has no headless mode and no DOM dump
— only `safaridriver`, a windowed WebDriver browser that must be enabled by hand; Firefox has
headless but no `--dump-dom`. `CHROME=` swaps the *binary*, not the browser engine's capabilities:
point it at anything but a Chromium build and nothing works. Porting this is a rewrite as a
WebDriver client. See `HANDOFF.md` §3, which also separates this from the app's own Chromium
requirement — they are different constraints and get confused for each other.

## Running

```bash
cd tests/harness
./run.sh base 45        # build a calendar, measure the grid, capture both exports
./run.sh restore 35     # open tests/fixtures/v1.0.0-saved.html and prove it still restores
```

Results land beside the script as `<name>.json`, plus `<name>.xlsx` / `<name>.pdf` when the test
captured an export. Those outputs are gitignored — commit a copy into `tests/baselines/` when you
want to keep one.

Then validate the exports:

```bash
./check-xlsx.sh base.xlsx           # the four things that make Excel cry "corrupt file"
node pdf-info.js base.pdf base.txt  # page box, text/rect counts, grid extent, every string
```

Environment: `HARNESS_PORT` (default 8231), `CHROME` (default the standard macOS path).

## Files

| | |
|---|---|
| `run.sh` | one test, end to end: start server → Chrome → hard-kill → parse → stop server |
| `srv.js` | serves the repo root; injects `t/lib.js` + `t/<name>.js` into `index.html?test=<name>` |
| `parse.js` | lifts the `<pre id="R">` payload out of the dump, un-escapes it, splits off base64 files |
| `t/lib.js` | shared helpers: fixture builder, clipping/width measurements, export capture, fake file picker |
| `t/base.js` | the acceptance-gate measurement: grid, clipping, Excel, waterfall PDF |
| `t/restore.js` | the compatibility test: does a real v1.0.0 saved calendar still open |
| `t/sharecopy.js` | does "Export shareable copy" bake transient notice strips into the file (HANDOFF §2h) |
| `t/probe.js` | diagnostic only: what is alive over time, with real timestamps |
| `check-xlsx.sh` | validates an `.xlsx` the way Excel rejects it, not the way a parser does |
| `pdf-info.js` | reads back a waterfall PDF so two exports can be diffed |

## Traps this harness has already fallen into

Every one of these produced a confidently wrong result. They are guarded in the code now, with the
reason attached; this is the index.

- **`--dump-dom` writes the file and then does not always exit.** The DOM lands on disk, Chrome
  stays alive, and the next command in the shell chain never runs — which looks exactly like the
  test hanging. `run.sh` backgrounds Chrome and hard-kills it for this reason. Never put the parse
  step after Chrome in the same foreground chain.
- **A NodeList held across a click that re-renders its list is detached.** A `forEach` over
  `#holiday-vis-list input.hv-cb` clicked 14 boxes and turned on **one**: the list rebuilds after
  each change. Detached clicks throw nothing and change nothing, so it reads as the app ignoring
  input. Re-query every iteration.
- **"Clipped cells" must mean HORIZONTAL clipping.** Counting vertical overflow too reported three
  failures against untouched code. Vertical overflow is deliberate — rows are a fixed height and
  text is fitted to the row, so a multi-line note in a 20 px row is clipped by design once the
  shrink floor is reached. Only horizontal clipping is the padding trap.
- **Stub `window.alert` into an array** before any Open/Save test. Every failure path in the file
  layer is an `alert()`, so without this a rejected file is indistinguishable from a silent no-op.
- **Allow ~2 s after triggering a restore.** It is async; measuring too early reports an empty
  calendar, which looks like a restore failure.
- **Pick a readiness probe only LIVE CODE can satisfy.** This was wrong twice before it was right.
  `#union-country`'s default option is `value=""`, so an empty string is the *correct* fresh state
  and also what a dead page shows; `#file-menu-label` ships the literal text "Untitled" in the
  markup. A probe a dead page also satisfies turns a broken page into a "broken feature". The
  signal that works is `#file-menu` having children — it is empty in the markup and only
  `renderRecents()` fills it.
- ⚠️ **Fresh-profile IndexedDB stall.** `renderRecents()` runs inside `loadRecents().then(...)`,
  an IndexedDB round trip, and on a fresh `--user-data-dir` the database has to be created first.
  Roughly one run in three it does not resolve within 20 s, while the app is otherwise completely
  healthy — the grid renders, no errors, no alerts. Two consequences: **gate a test only on the
  subsystem it actually uses** (`base` deliberately does not call `appReady()`, because it never
  touches the file menu), and if `restore` or `sharecopy` times out on the file menu, suspect the
  environment before the app.
- **Measure at the END of an async path, not at its first visible effect.** `showLegacyNotice()` is
  the last thing `openRecentFile()` does — after `applyStateSnapshot`, `refreshAfterRestore`,
  `persistRecents` and `renderRecents`. Reading the strip the moment the grid appears races it and
  reports `false` on a working app.
- **A fresh port per run, and kill the old server first.** `EADDRINUSE` silently leaves the *old*
  `index.html` being served, so a run can "regress" against code that has not changed.
- **Every test must build its own fixture.** Reusing state means an action that happens to be a
  no-op creates no undo step, so the next `undo` pops the test's own setup and every later
  assertion cascades into a false failure. One session lost eight assertions to this.
- **`requestAnimationFrame` does not fire while the browser pane is hidden.** If a fix depends on
  rAF, front the pane before measuring.

`PROJECT-CONTEXT.md` §11 carries the rest, including the false-failure table (why waterfall rows
look out of order, why `Post wk 1` matches inside `Simultaneous Post wk 1`, and so on). Read it
before believing a FAIL.
