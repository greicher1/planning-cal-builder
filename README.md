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
