# CLAUDE.md

**SPTCal** (the SPT Planning Calendar Builder) is a TV production scheduling app: it turns phase start dates and lengths
into a week-by-week waterfall calendar, a month calendar, an Excel workbook and PDFs. Users run it as an installed app
behind a sign-in. A Vite + React + Mantine build in `src/` produces one self-contained file, `dist/index.html`, which
every push to `main` deploys to the live app.

This file holds only how to run, build and test the app, a map of the code, and the rules import below. It holds no
rules of its own (OUT-19). A rule that seems to belong here goes into GOVERNANCE.md on the owner's yes, and a note on
how the code works goes into HOW-IT-WORKS.md.

## The rules

SPTCal's rules load into every session from the line below: the intro and the PRD, FRZ, FILE, SEC, REL and WORK
chapters in full, plus the title of every other rule. **Before changing anything on screen or any words a user sees,
read `GOVERNANCE-UI.md` (UX, COPY). Before changing code, tests, the build or the harness, or running a gate, read
`GOVERNANCE-ENG.md` (TEST, CODE).** Rule history is in `GOVERNANCE-HISTORY.md`. Cite rules by ID ("per FILE-4") in new
comments and commit messages.

@GOVERNANCE.md

## Reading order (WORK-8)

1. The rules: loaded above, plus the companion the work needs.
2. [`HANDOFF.md`](HANDOFF.md), its current part ("START HERE"): what is in flight and what was just learned. Older
   entries are in `handoff/YYYY-MM.md`, which carry no authority. Keep HANDOFF current in the same commit as the work
   (WORK-7). Open work lives on the feature tracker, one card each (WORK-11).
3. Only the reference and plan sections the task touches, found by searching for the feature or symbol:
   - [`HOW-IT-WORKS.md`](HOW-IT-WORKS.md): how the code carries out the rules. These are the notes CLAUDE.md held until
     23 Nov 2026: the frozen edits in force, the file format's keys, the state model, the tools, save / restore,
     exports.
   - [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md): union-holiday research, deploy and harness detail, bug history, and
     line numbers (§14 only, checked by `tools/check-refs.py`).
   - [`MANTINE-SEAM.md`](MANTINE-SEAM.md): where React/Mantine ends and the frozen surface begins, symbol by symbol.
   - [`UI-CONVENTIONS.md`](UI-CONVENTIONS.md): UI work only. §10 lists the acceptance gates `gate.sh` automates.
   - The feature's own `*-PLAN.md`, for its rulings.

## Commands

Run from the repo root unless the command says otherwise. "Safe alongside" means safe while another session works in
the same checkout.

| Command | What it does or tests | Default page / port | Time | Safe alongside? |
|---|---|---|---|---|
| `npm run dev` | Serves `src/` with Vite for quick iteration | Vite's own port | seconds | Yes |
| `npm run build` | Builds `dist/index.html`, the one file that ships | none | seconds | Not while a gate runs here: the gate tests `dist/` as it stands (TEST-6) |
| `npm run check` | Build checks: CSP hashes, manifest and install gate, fonts, Help hints, the frozen-code lock (fails if a frozen declaration's text changed without approval) | reads `dist/` | seconds | Yes |
| `node --check src/legacy/app.js` | Syntax check of the engine | none | instant | Yes |
| `cd tests/harness && ./gate.sh` | **The full gate:** every leg plus the baselines (gates 1-13: the waterfall PDF, every Excel part, the month PDF's print document, printed sheets and written PDF, byte for byte). When it is owed is REL-6 | `/dist/index.html`, port 8231 unless `HARNESS_PORT` is set | about an hour on a quiet machine (55-60 min, Nov 2026); many hours under load | **One at a time** (TEST-6), in its own worktree at the commit being tested (TEST-6, decision 3). Run in the background |
| Is a full gate running? | The command under this table: it counts real gates (0 = none). `pgrep -f gate.sh` also matches wrappers and waiting loops, so it misleads | none | instant | Yes |
| `cd tests/harness && HARNESS_PAGE=/dist/index.html HARNESS_PORT=<free port> ./run.sh <leg>` | One leg (a single test). Shows behaviour; never proves nothing regressed (TEST-2) | ⚠️ `run.sh` defaults to the LEGACY `/index.html` and port 8231: always pass both (TEST-7, TEST-8) | seconds to minutes | Yes, on a private port checked free with `lsof -i :<port>` first |
| `node tools/frozen-lock.mjs` | Checks the frozen declarations against `tools/frozen-lock.json` (part of `npm run check`) | none | instant | Yes |
| `python3 tools/check-refs.py` | Checks PROJECT-CONTEXT §14's line numbers, and that the prose docs quote no others. Blind to `src/legacy/app.js` | root `index.html` | seconds | Yes |
| `python3 tools/gen_holidays.py` | Regenerates the holiday lists from their rules; never edit them by hand (CODE-4) | none | seconds | Yes |
| `node tools/help-shots.mjs [names]` | Retakes Help's pictures (see `src/help/README.md`) | its own server | about 25 s per group | Yes |
| `open index.html` | The legacy v1.2.0 app at the repo root: never what users get and never served (REL-11) | file:// | instant | Yes |

Is a full gate running? (0 means none)

```bash
ps -axww -o command= | grep -cE '^(/bin/)?zsh [^ ]*gate\.sh( |$)'
```

## Code map

- **`src/legacy/app.js`**: the engine, one IIFE (nothing inside is global, so tests drive the DOM). It holds all
  calendar state, `computeSchedule`, both renderers, and the Excel and PDF writers.
  - The core cycle is `update()`: DOM inputs → `readState()` → `computeSchedule(state)` → `render(schedule)` →
    `markDirty()`.
  - `captureSnapshot()` is the single definition of what counts as state, read by Save, the crash backup and Undo.
    `applyStateSnapshot()` then `refreshAfterRestore()` is the one restore route.
  - `parseCalendarText()` is the one reader of a calendar file.
  - `HOW-IT-WORKS.md` §6-§9 has the detail and the state model table.
- **The frozen code** is listed in `tools/frozen-lock.json`. Its CSS, element ids and structure are mapped in
  `MANTINE-SEAM.md`. `#table-wrap` and `#print-root` are rendered by the engine only (FRZ-1 to FRZ-18).
- **`src/index.html`**: the page markup, the Content-Security-Policy (SEC-7) and the install gate script (SEC-5).
- **`src/main.jsx`, `src/chrome/*.jsx`, `src/theme.js`**: the React + Mantine chrome. It is one root that portals into
  the page and never wraps it (CODE-14). `bridge.js` connects it to the engine.
- **`src/styles/legacy.css`**: the app's CSS, unlayered and imported last, so the frozen rules win (FRZ-8).
- **`src/help/`**: the Help window. One file per article; `toc.js` is the only structure file.
- **`src/whats-new.js`**: What's New entries (REL-12).
- **`tools/`**: build checks, the frozen-code lock, the font subsetters (FRZ-10), the holiday generator (CODE-4) and
  the Help picture kit.
- **`tests/harness/`**: the headless-Chrome harness (`run.sh`, `gate.sh`, `srv.js`, `t/lib.js`). Baselines are in
  `tests/baselines/`; real saved calendars from old builds are in `tests/fixtures/` (TEST-9), all made up (SEC-1).
- **`releases/vX.Y.Z.html`**: byte-identical copies of each version (REL-10). The root `index.html` is the legacy
  v1.2.0 app.
- **`.github/workflows/deploy.yml`**: builds, checks and deploys `main`. Its `release` input is the rollback (REL-11).
- **Docs:** `README.md` is the changelog (REL-9), `HANDOFF.md` is status, `handoff/` is the archive, and `*-PLAN.md`
  is one feature's design and rulings.

## Where CLAUDE.md's rules went (23 Nov 2026)

Each heading that used to be here, and the rule IDs that now carry it. HOW-IT-WORKS.md keeps the notes that explained
them.

| What CLAUDE.md said | Now |
|---|---|
| Read HANDOFF.md first, and keep it current | WORK-7, WORK-8 |
| Never commit, push or deploy on your own initiative | REL-1 to REL-5 (branch commits are free; merge and push are asked) |
| Never touch the grid or the exports, its symbol list, and the waterfall editor's look | FRZ-1 to FRZ-18; the list is `tools/frozen-lock.json` |
| The sanctioned ways to change frozen behaviour | FRZ-6 |
| Every saved calendar must keep opening, forever (and Load vs open) | FILE-1 to FILE-21, COPY-1 |
| The hosted link boots the app only in the installed app window | PRD-8, SEC-3 to SEC-6, TEST-13 |
| Changelog every substantial change, version cuts, What's New | REL-9, REL-10, REL-12 |
| Watch the context window | WORK-9 |
| The Content-Security-Policy | SEC-7 |
| The two embedded fonts | FRZ-10, CODE-6 |
| Chrome / Edge, and testing | PRD-9, TEST-1 |
| No line numbers in docs | CODE-7 |
| Keep it single-file | No rule: declined (CODE-5, 23 Nov 2026); one file by choice (HOW-IT-WORKS §5) |
| Transient controls and the field sweep; preferences vs calendar data | FILE-7, FILE-8, FILE-9 |
| New state goes everywhere state must go; restore unconditionally | FILE-4, FILE-5, FILE-6, FILE-15 |
| Every date mover in the shoot-day bracket | CODE-1, FILE-19 |
| Dates are UTC midnights; holidays are generated; comments explain why | CODE-3, CODE-4, CODE-8 |
| A Region change asks first | UX-14 |
