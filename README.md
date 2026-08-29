# SPT Planning Calendar Builder

A TV production scheduling tool. Phase start dates + durations in, and out comes a week-by-week
waterfall calendar, a month calendar, an Excel workbook and a printable PDF.

**Live:** <https://greicher1.github.io/planning-cal-builder/>
**v1.0.0 (frozen):** `releases/v1.0.0.html` — also reachable at
<https://greicher1.github.io/planning-cal-builder/releases/v1.0.0.html> **once this commit and the
`v1.0.0` tag are pushed.** Until then the copy is local only; `git push && git push --tags`.

One self-contained `index.html`. No build system, no package manager, no server. Open the file and
it runs.

**For contributors and agents, the reading order is:** [`HANDOFF.md`](HANDOFF.md) →
[`CLAUDE.md`](CLAUDE.md) → [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md).

---

## Changelog

This project versions the **built app**, not the repo. A version is cut when the app changes in a
way a user would notice or a future session would need to return to. See
[`CLAUDE.md`](CLAUDE.md) → "⛔ Changelog every substantial change" for when and how.

<!-- Newest first. Add new entries directly under this line. -->

### v1.2.0 — 29 Aug 2026 — The app can tell you it has been updated

**The problem, measured rather than assumed.** There is no service worker (one was removed
precisely because it served a stale app forever), so the received wisdom was that a reload always
fetches the current build. Checking the live site's actual headers showed that is *nearly* true:

```
cache-control: max-age=600
etag: "6a9254a0-a18bb"
```

GitHub Pages sets a **ten-minute** browser cache. A relaunch inside that window is answered from
the browser's own HTTP cache and never learns a new deploy exists. Worse, most people run this as
an installed PWA, which they leave open and return to rather than relaunching at all — so an old
build can persist indefinitely, and shipping a fix does not mean anyone receives it.

**What now happens.** The app knows its own version (`APP_VERSION`) and compares it against a
tiny `version.json` deployed beside it. When the deployed version is genuinely newer, a blue strip
appears under the header: *"Version 1.2.1 is available — this copy is 1.2.0."* with a **Reload to
update** button.

- **It never reloads on its own.** You may be mid-edit with unsaved work, and reloading out from
  under someone is how a production plan gets destroyed. It tells you and lets you choose; the
  existing unsaved-changes guard still applies on the way out.
- **It only nags when the server is genuinely ahead.** Versions are compared numerically per
  segment, so `1.2.10` correctly beats `1.2.9` (a string comparison gets that backwards), and a
  rolled-back deploy leaves you alone rather than inviting you to "update" to an older build.
- **Dismissal is per version.** Waving away 1.2.1 does not hide 1.3.0.
- **Only the deployed app checks.** A *shareable copy* opened from `file://` is a deliberate
  frozen snapshot — telling its holder to "update" would navigate them away from the very file
  they were sent. It stays silent.
- **It gives up after three consecutive failures.** A frozen `releases/vX.Y.Z.html` resolves the
  marker relative to its own folder, where there is none and never will be; without this it would
  404 every thirty minutes forever. Any success resets the count.
- **Offline is silence,** not an error. An update check that cannot run is not worth interrupting
  anyone about.

The check runs 8 s after load, then every 30 minutes, and when the tab becomes visible again after
that long — the likeliest moment for a new deploy to have appeared under a long-lived PWA.

> ### ⚠️ `APP_VERSION` and `version.json` are ONE action, not two
> Bump them in the same commit. `version.json` alone makes every user see an update that does not
> exist; `APP_VERSION` alone makes a real update invisible. Both live at the top of their files
> with this warning attached.

**Also in this release:** the two notice strips now share one set of CSS rules and differ only in
hue — amber for *"your file is an old format"*, blue for *"the app has a newer version"*. This app
already had more warning styles than it should; a second strip built from scratch would have made
that worse. Verified the legacy strip's computed styling is byte-for-byte what it was.

**Verified:** matching versions stay silent; a newer marker raises the strip; a rolled-back marker
stays silent; a missing marker is silent and stops asking; the comparison passes 10/10 cases
including `1.2.10 > 1.2.9`; and the grid is unchanged at 157 cells / 132 filled / **0 clipped**,
identical to before the change. The grid and the exports were not touched.

> **v1.1.0 never shipped on its own.** It was changelogged and committed but never deployed or
> tagged, so v1.2.0 is the release that carries both it and this. Everything in the v1.1.0 entry
> below arrives with this version.

### v1.1.0 — 28 Aug 2026 — Save writes data, not a copy of the app

**Save and Open used to be the same file.** Save wrote `document.documentElement.outerHTML` — a
complete runnable copy of the app — with the state embedded in `<script id="saved-state">`. But
Open never read the app: it lifts that JSON out and replays it into the **running** app, so the
old file's HTML, CSS and JS is never parsed and never executed. Measured on a 10-episode calendar,
that file was **729,172 bytes of which 3,238 (0.44%) was the data**, and 44.5 KB of the rest was
the rendered grid — serialized out of the live DOM, then regenerated from state on load and thrown
away.

There are now **two formats with two different jobs**:

| | **`.sptcal`** — the calendar | **`.html`** — a shareable copy |
|---|---|---|
| Contents | the state, as JSON | the whole app, with the state in it |
| Size | **~4.5 KB** | ~695 KB |
| Written by | **Save, Save As, autosave** | File ▸ **Export shareable copy…** |
| For | working — opening, editing, saving | sending to someone who doesn't have the tool |

**Measured: a save is now 155× smaller** (4,488 vs 695,556 bytes on the same calendar).

- **Every calendar saved before this version still opens, and always will.** `parseCalendarText()`
  is the one place that reads a file: text starting with `{` is a snapshot, anything else gets the
  original `saved-state` regex. Both paths converge on the same `applyStateSnapshot()`, so there
  is no migration to get wrong.

  Verified against a **real** legacy file, not a synthesised one: `tests/fixtures/v1.0.0-saved.html`
  was generated by running the **v1.0.0 build itself** and clicking Save — 760 KB, 27 snapshot
  keys, no `version` field, grid baked in. Opened in v1.1.0 it restores every field (title, season,
  episodes, all four phase dates, week counts, region) and a **154-cell rendered grid identical to
  the one it was saved from**. Re-saved as `.sptcal` it is 4,525 bytes — **168× smaller** — and
  restores identically again. `releases/v1.0.0.html` (the app itself, whose state block is the
  literal `null`) is rejected cleanly rather than opening as an empty calendar.

- **Opening a legacy `.html` now recommends upgrading it.** A dismissible amber strip under the
  header explains that the file carries a whole copy of an old build of the app around ~3 KB of
  plan, with a **Save as .sptcal** button that runs Save As. Amber and not red on purpose: nothing
  failed, and colouring it like an error would teach people to distrust their own saved calendars.
  It is a recommendation — plain Save on a legacy file still writes `.html`, and nothing is ever
  converted without being asked.
- **Save writes back in whatever format the file already is.** Open a legacy `.html` and Save keeps
  it an `.html` — no file is silently converted.
- **The first save still always opens the save dialog**, manual or otherwise. Autosave can never
  reach that path: `showSaveFilePicker()` requires a user gesture, and writing a calendar somewhere
  the user never chose is exactly what the dialog exists to prevent. When autosave finds unsaved
  work with no file linked it now says so — *"Autosave needs a file — click Save"* — instead of
  failing silently. Work is not at risk meanwhile; the rolling IndexedDB backup has been running
  since three seconds after the first edit.
- **The shareable copy got smaller too.** It is built from a **clone** of the document, so the live
  page is never mutated, and the clone drops `#table-wrap`, `#print-root` and any open popover
  before serializing — all regenerated on load. Verified 0 bytes for each in the export.
- **Snapshots now carry a `version` field** (`SNAPSHOT_VERSION = 1`). Nothing branches on it yet;
  it exists so a future migration can ask which app wrote a file instead of sniffing for individual
  keys, which is what `migrateHolidayViewKeys()` and `normalizeRegionSelection()` have had to do.
- **Fixed along the way:** the save status waited on IndexedDB recents bookkeeping before reporting
  a write that had already succeeded — measured at ~1.2 s in a test run, long enough for an
  autosave tick to fire a second redundant write of the same bytes. `markClean()` now runs as soon
  as the bytes are on disk. Verified: status settles within 400 ms and the duplicate write is gone.

The grid and the exports were not touched. See [`HANDOFF.md`](HANDOFF.md) §7 for the full analysis
and [`CLAUDE.md`](CLAUDE.md) for the standing rule that saved calendars must keep opening forever.

### v1.0.0 — 28 Aug 2026 · `305c343` · tag `v1.0.0`

> The tag points at **`305c343`** — the commit where `index.html` was last the shipped app.
> The changelog, the rules and `releases/v1.0.0.html` were added in the commits *after* it, so
> checking out the tag gives you the v1.0.0 **app**, not this documentation. `index.html` is
> byte-identical either way.

**The last single-file build before the Mantine UI overhaul.** Frozen as the known-good baseline;
a byte-identical copy lives at [`releases/v1.0.0.html`](releases/v1.0.0.html)
(SHA-256 `0150be15e97c3ae1a670a181ab55987c9cfd3afeeb42580e13afde4fa20ffc81`).

The state of the app at v1.0.0:

- **Waterfall + month calendar** from phase start dates and durations, with the six built-in
  phases, custom phases, simultaneous post, and per-phase or all-phase hiatuses.
- **Day-level Production simulation** — shoot days, skipping weekends, hiatus days and union
  holidays for the selected region until the count is met.
- **Union-holiday data** for US (General / New York Local 52), six Canadian provinces, and the UK,
  generated from rules rather than hand-transcribed, with observed-day handling.
- **One shared column model** feeding the screen, the Excel workbook and the PDF, so all three
  finally agree. `computePhaseRowLayout()` is the single source for which phase occupies which
  column.
- **Embedded Carlito** (subset, zlib'd, 91 KB) so text measurement cannot drift.
- **Direct PDF writer** — TrueType subsetting, `/FontFile2`, WinAnsi, xref, Flate. No print dialog.
- **Excel export** via ExcelJS with explicit widths, merges and ARGB fills.
- **Direct manipulation** — drag columns and rows, autofit, shrink-to-fit, cell spans,
  double-click to return to automatic.
- **Calendar tools** — Shift All, Shift From, Anchor To, Rebuild From, Close all gaps, undo/redo.
- **Save / open** as self-contained HTML, with File System Access write-back, an IndexedDB recents
  list, a 10-minute autosave and crash recovery.

**Known limits at this version**, all documented in [`HANDOFF.md`](HANDOFF.md) §2:
the Settings menu and per-user preferences are not built; Notes is one column rather than the
reference export's label + right-aligned date; the PDF is height-bound where Excel is width-bound
(row pitch runs ~16% long); the month view still tints phase bars with the palette's text colour.

### Returning to v1.0.0

Any of these work, in increasing order of commitment:

```bash
# 1. Just look at it / run it — no git state changes at all
open releases/v1.0.0.html
```

```bash
# 2. Read a file as it was at v1.0.0, without moving the working tree
git show v1.0.0:index.html > /tmp/v1.0.0-index.html
```

```bash
# 3. Restore v1.0.0's index.html into the working tree as an uncommitted change
git checkout v1.0.0 -- index.html
```

```bash
# 4. Branch off the tag to work from it
git switch -c from-v1.0.0 v1.0.0
```

The tag is immutable and `releases/v1.0.0.html` is a byte-identical copy, so **the baseline
survives even if the working tree, `main`, or the whole build system is replaced.**
