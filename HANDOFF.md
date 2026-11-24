# HANDOFF.md

---

## 🔴 START HERE: the current version's work (since v1.23.0, 19 Nov 2026)

*Older entries are in [`handoff/`](handoff/), one file per month, carrying no authority. The rules are GOVERNANCE.md and its two companions; open work is on the feature tracker.*

### 📜 23 Nov 2026: GOVERNANCE PHASE 4, THE REWIRE — the rules land in the repo and CLAUDE.md imports them. Branch `governance-phase4` (worktree `.claude/worktrees/governance-phase4`, from `origin/main` `2e3d3fa3`). ✅ **LIVE at `578bd46a`** (owner's pickers 23 Nov 2026: *"Merge into local main"*, *"Push main after the merge"*; pushed `2e3d3fa3..578bd46a`, which also carried local main's `54473204`; deploy run 45473455825 green, Cloudflare step included; the GitHub Pages file is byte-identical to the build, sha256 `6e8bdfc1…`, the same bytes as before, so users see no update bar). Tracker card `governance-sheet`.
- **What is on the branch:**
  - The rules: `GOVERNANCE.md` (loaded in every session by CLAUDE.md's `@GOVERNANCE.md` import: the intro, PRD, FRZ, FILE,
    SEC, REL and WORK in full, and the title of every other rule), `GOVERNANCE-UI.md` (UX, COPY: read before UI or wording
    work), `GOVERNANCE-ENG.md` (TEST, CODE: read before code, test, build or gate work) and `GOVERNANCE-HISTORY.md`.
    190 rules. From now on these files are edited by hand only (OUT-20).
  - `CLAUDE.md` 121 KB → 9 KB: the commands as a table (OUT-25), a code map, the reading order (WORK-8), and a table
    from each old heading to its rule IDs (OUT-19). Its notes moved nearly word for word to `HOW-IT-WORKS.md`.
  - HANDOFF: the entries before v1.23.0 (19 Nov) moved to `handoff/2026-09.md`, `2026-10.md` and `2026-11.md`, each saying it
    carries no authority (OUT-21); sections 0, 2, 4, 5 and 6 became pointers, their old text in
    `handoff/sections-before-governance.md`. 2.07 MB → about 150 KB. Every line of the old file was checked to be kept.
  - The doc-fix list applied (README, PROJECT-CONTEXT, UI-CONVENTIONS, MANTINE-SEAM, MANTINE-MIGRATION, THREAT-MODEL,
    SPTCAL-ENCRYPTION, FIX-PLAN, dated "Corrected" lines in the archive), the declined COPY-6 text struck through, and
    `GOVERNANCE-PLAN.md` committed (§7e has this phase).
  - `.claude/settings.json`, tracked: Claude Code asks before a push, a deploy or rollback run, a release, skipping hooks
    or wiping uncommitted work (decision 1). Outside git, the `git push *` / `gh api *` allowances were removed from the
    main checkout's and 13 worktrees' `.claude/settings.local.json`.
  - Private memory points at rule IDs, with its stale lines fixed.
- **The owner's pickers, 23 Nov 2026, all as recommended:** how much loads, *"Core six + all titles"*; the one list of open
  work, *"The tracker"*; a permission prompt on pushes, *"Yes, for a short list"*; the shared checkout, *"Gate in its own
  worktree"*; running sessions told of rule changes, *"One line from the hook"*; other branches' HANDOFF notes, *"Fold the
  recent ones in"*. They are in REL-1, WORK-8, WORK-11, TEST-6 and the plan's §10.
- **Measured (OUT-22), the app's own "Memory files" count:** **42,176** tokens per session before (CLAUDE.md + memory
  index); **29,223** after, in a fresh session on this branch (31% less).
- **OUT-23:** no session was running. Only three old branches still change CLAUDE.md (31 Aug, 22 Oct, 11 Nov). The main
  checkout's uncommitted HANDOFF entries and 15 branches' unpushed "is live" notes (16-23 Nov) were folded in before the
  archive; about 40 older branches were left, and their entries are archived as main had them. Full list:
  `phase4-prereqs.md` in the governance session family's shared notes folder.
- **OUT-24, the proof** (two fresh Sonnet sessions, auto mode, asked to answer before opening any file):
  - **New worktree on this branch:** it loaded CLAUDE.md, GOVERNANCE.md and the memory index, quoted REL-15 word for word,
    and had TEST-15's title only, which is the design (TEST is in GOVERNANCE-ENG.md).
  - **Worktree on an old branch** (`ui-scaling`, 16 Nov): it loaded only its own 98 KB CLAUDE.md, with no REL-15 and no
    TEST-15. ⚠️ **Claude Code does not load the main checkout's CLAUDE.md in a worktree session.** A session gets the rules
    only once its own branch carries this change. Existing worktrees keep the old text until they take `main`, and so does
    the main checkout, on `scenario-version-offer`, until that branch takes `main`. Decision 5's hook line (Phase 5) is what
    tells them.
  - Learned on the way: worktree sessions DO load the main project's memory index (`MEMORY.md`).
  - ⚠️ **Decision 1 did not hold in auto mode.** In the new-worktree session (auto mode, the shared settings on disk),
    `git push --dry-run origin HEAD:refs/heads/governance-prompt-test` ran with NO permission prompt (dry run, nothing
    created; `git ls-remote` confirms). Claude Code's docs (permission-modes, "Rules in auto mode") say an `ask` rule
    resolves to a prompt even in auto mode, and `Bash(git push:*)` is the right syntax, so either the desktop app does not
    load the tracked `.claude/settings.json` or ask rules behave differently there. Recorded as a known mismatch on REL-1.
    **The probe that tells the two apart is ready:** local branch `gov-probe` (never merge it) adds a `deny` rule for the
    harmless `echo governance-deny-probe`; a fresh session cut from it runs that one command. Refused means the file loads
    (then report the ask-rule behaviour as a bug, or use a deny rule); printed means the app ignores project settings (then
    the shared file holds nothing, and the push guard in Phase 5 is the real stop). Delete `gov-probe` afterwards.
- **When this merges into a checkout:** the main checkout's untracked `GOVERNANCE-PLAN.md` must be moved aside first (the
  committed copy is newer), and `scenario-version-offer` will conflict on HANDOFF.md, because the entries it edits moved
  to the archive. Resolve by keeping this branch's HANDOFF and re-adding any new entry at the top of START HERE.
- **Next:** the settings probe (the owner picked *"Run it now"*; a session can be started from branch `gov-probe` only on the owner's own message, not from an automated turn, and a proposal card drops the branch), then Phase 5 (the checker, the pre-push guard, the reminder hook with
  decision 5's line, the gate-in-its-own-worktree trial run).

### 🪟 23 Nov 2026: HELP OPENS ON TOP OF EVERY MENU — branch `help-on-top` (worktree `.claude/worktrees/help-on-top`, off
`origin/main` at `8056c32a`), pushed to `main` on the owner's picker. Tracker card `help-above-menus`.
- **Owner:** "More in Help" from the ⓘ in Shift or Build Around opened Help with the box still on top, *"those two menus. or
  any menu should never appear on top of the help menu"*.
- **Cause:** Help's `Modal` had Mantine's default z-index, 200. `.tools-menu` (both boxes, dragged or not) and every other
  menu are 300; the ⓘ cards, `.hde-overlay`, `.paste-notes-overlay`, `.du-toast` and `.du-rename-pop` are 400.
- **Fix:** `zIndex={500}` on Help's `Modal` (`HelpWindow.jsx`), a new top tier in UI-CONVENTIONS §6's ladder. Only
  `.chrome-failed` and `#app-gate` are higher. A new menu or dialog must stay below 500.
- **Held by** the `help` leg's H12: drags each box open (so it survives the press of ?), opens Help, and checks that
  every point of the box hits Help; then scans every app stylesheet rule OUTSIDE Mantine's layer for a z-index of 500 or
  more. Mantine's layer is skipped because its only values over 500 are a modal's sticky title row (1000) and scroll bar
  (1001), inside that modal's own stacking context. Without the fix H12 is red (both boxes hit, Help at 200).
  `help` 13/13, `npm run check` 47/47. Help-only chrome: no gate needed.
- ⚖ **Owner's picker, 23 Nov 2026: "Leave it as it is".** A click INSIDE Help counts as a click outside an undragged
  Shift or Build Around box (the 16 Nov rule), so that box closes on Help's first click (× included) and is gone when Help
  closes; a dragged box stays. Esc closes Help without closing the box. Don't make Help "not outside" without asking.
- **Tried by hand** in the browser pane at `localhost:8765/dist/index.html?state=help-demo` (`srv.js` started by hand: the
  pane's five-server limit was full with other chats').

### 📖 21–23 Nov 2026: THE NEW HELP — ✅ LIVE (pushed to `main` 23 Nov 2026, `8056c32a`, on the owner's "push"); branch `help-center` (worktree `.claude/worktrees/help-center`, NOT pushed, NOT merged). Tracker card `help-center-redesign` (building). Plan page `mockups/help-docs-plan.html` (main checkout, untracked).
- **What it is:** the one-page Guide (`#help-overlay`, ~10,700 words) is replaced by `src/help/`: a ~1,120 px Mantine window with a
  sidebar of 14 sections / 45 articles (64 were written; 23 Nov: 20 folded into others, then "What is SPTCal?" added, see below), search, "On this page", Show me (rings the real control), `?` opening on the open
  Shift box / Build Around box / note editor / day menu / Settings (else the last article read; else Month view's article or
  the tour), an "I only use the Month view" switch (localStorage `sptcal.help`), What's New history, and "More in Help →"
  on every ⓘ hint (`InfoHint`'s `help` prop → `chrome.openHelp(id)`). The engine's sweep skips `.help-dlg`.
- **Owner's picks (21 Nov, from the plan page):** window A, design 1 (Docs), style B (picture first, details folded), crisp 2x
  shots, every building block but clips; extras on: search, context-aware ?, ⓘ links, Month-only switch, What's New
  history, reopen last; off: tour, guide PDF. Full / Brief / left-out per article are in `src/help/toc.js` (its header lists
  the nine left out: don't add them back without asking).
- **Owner, mid-build:** *"easily updated in the future without costing excess tokens or requiring significant new gates"*.
  So: one file per article, `toc.js` the only structure file, `src/help/README.md` the cheat-sheet, `node
  tools/check-help-jsx.mjs [ids]` parses articles in a second with no build, `node tools/help-shots.mjs [names]` retakes
  pictures. A Help change is gated by `npm run check` + ONE `help` leg (to write), never the full gate.
- **Owner, mid-build:** *"anything that uses screenshots/references to a calendar, ask/show me the calendar"* (memory
  `show-calendars-for-realism`). They gave a reference waterfall; `tests/fixtures/help-demo.sptcal` now reproduces it row for
  row (Harbor Lights S1, v1, 8 eps × 12 days, British Columbia so the wrap is 11/1/27, Location Vancouver, WR 1/4/27 20 wks,
  Pre-Prep 3/15/27 3 wks, Prod Prep 4/5/27 10 wks, Sim Post alongside, Post 11/8/27 30 wks with Final Delivery 6/16/28,
  Localization 6/19/28 10 wks, hiatuses 12/20/27 and 12/18/28). Owner's pickers: **made up, OK to ship**; **Vancouver BC**;
  **add a few typed notes** (added: Tone meeting Ep 101 6/2/27, Table read Ep 101 6/9/27 in the Waterfall; Tech scout /
  Production meeting Ep 101 on 6/8, 6/10/27 and Night shoot 7/14/27 in the Month view): **approved** ("Notes look good").
- **The extras, shown and settled (21 Nov):** they are UI steps in `tools/help-shots.mjs` on top of `help-demo`
  (`secondScenario()`, `colorKey()`, `tandem()`), and `HELP_SHOTS_OUT=<dir>` writes previews elsewhere for showing the
  owner. A second tab "Shoot +2 wks" (takes the offered v2; Shift › After Production › 2 wks Later; prep left where it
  was, the 2 empty weeks are the point: owner's picker **"Keep it as shown"**); Compare opened FROM THE ORIGINAL TAB so the
  new one reads Pushed 2 wks (picker); a color key on the right, **widened** ~70 px by dragging `.sb-width` (owner: *"make
  the color key wider"*); tandem 12+1 from Show info's box (no objection raised). The four test-fixture shots are gone
  from the kit.
- **Commits:** `ba06e4e3` (window, kit, 19 articles), `69954eec` (all 64 articles, 18 more shots, ⓘ links), then this one.
  `npm run check` 46/46 at `69954eec`.
- **NEXT, in order:**
  1. (Done: notes approved, extras shown and settled, see above.)
  2–4. **Done 21 Nov 2026 (`b86715c2`):** every picture retaken on Harbor Lights S1 (33, all used; `changes-dialog` dropped:
     a `?state=` calendar has no saved version, so that window only says so). The kit now runs ONLY the groups holding the
     named shots (`node tools/help-shots.mjs note-editor` ≈ 25 s; a group starts at a step that calls `load()`); new crops
     `wf-grid` (read), side boxes, tandem month and the Production card, so a 26 px dot is not bigger than its cell;
     `underTabs()` scrolls a card out from under the side panel's sticky tabs (scrollIntoView alone hides its top).
     Whole-window shots draw 18 px dots (help.css). Dots re-placed by eye with an overlay script at true dot size. Review
     fixes: header lines are styled by the text style bar (the in-header strip is hidden), Template is edited in the
     template editor (its list is "Insert", not "Insert ▾"), Compare's chips show only with 3+ scenarios, Hidden Notes out
     of `prefs`, Export… sits beside a saved preset, Fill Gaps (not "share the width") in `read`, the holiday rename from
     Settings › Region's list (commit `6be10871` on main, NOT on this branch: merge main in before shipping), every
     example on the demo's dates. Show me: `showme.js` checked `.side-settings-btn.active`, a class that button never
     has, so it CLOSED an open Settings window; it reads `aria-expanded` now, and `sw` picks a Settings tab. 20 Show me
     buttons in all. ⚠️ Not done: the engine's Insert list still says `{version}` is "Version, as typed" (it prints v3).
  **Two "needs explaining?" audits of all 64 pages (21 Nov, read-only, nothing applied yet).** Full records, outside the repo:
  `~/Library/Application Support/Claude/side-session-notes/local_1b68e484-…/help-audit-2026-11-21.md` (readers may use hover
  and ⓘ) and `…/help-audit-2-visible-only-2026-11-21.md` (readers who never read hover text or ⓘ). Result: 6 pages need
  explaining (tandem, ripple, mvnotes, swap, hdrmodes, autosave), 42 partly, 16 self-explanatory; about 20 merges would take
  64 pages to ~44; ~20 wrong or stale claims were found (e.g. `newreset` says every reset asks first, `names` says Cancel
  keeps the file-name choices, `hdrmodes` says Auto's lines come back, seven pages are stale since the 19 Nov
  "new notes stay with their phase" default, Blocks mode breaks four "Production waits for…" lines).
  ✅ **Applied 23 Nov 2026 (owner's picker "Fix and add"): the wrong claims are fixed and the hidden facts added to the
  EXISTING pages in 40 articles + the Zoom wording in `src/whats-new.js`; no page was merged, renamed or removed** (the ~20
  merges, 64 → ~44, still wait for the owner's yes). A separate fact-check read every new claim against the code: five
  were wrong or imprecise and are fixed (⌘-scroll does NOT zoom, only Ctrl-scroll and pinch; only the reset buttons
  Reset Columns / Reset Bar Order collapse to icons; "inside a locked hiatus lands the week after" is Starts on only; the
  Enable box and the "Costs a shoot day" tag are two different sets; a start date snaps to Monday only in a weeks phase with
  Snap to Monday on). ⚠️ Still unverified in code: bar-end drag leaves the other end put on every bar kind, Swap Column's
  full "has a neighbor" rule, and that Reset Month Notes / Reset holidays are one undo step each.
  `src/help/articles` rule learned: JSX drops the space between an inline element at a line end and the text on the next
  line (`</b>` newline `in the…` prints "…workin the…"): end such a line with `{' '}`.
  ⛔ **Owner ruling, 21 Nov 2026: NO printed captions.** He was shown ten one-line captions on localhost (File chip, Autosaved
  status, header-menu rows, Ripple, Region, Tandem, Lock in place, Calendar range, Hidden Notes, Total shooting days) and
  said *"absolutely not, i want less on-screen text as it looks ugly. I'd rather hide it behind 'i' symbols or in the help
  page."* All reverted, never committed. So what the screen does not say lives in an ⓘ hint or in Help. Don't mock up printed
  helper lines again; adding an ⓘ where a control has none is a UI change he hasn't seen, so show it first.
  5. ✅ **The `help` leg is written and in `gate.sh` (23 Nov 2026)**: `tests/harness/t/help.js`, `HARNESS_PAGE=/dist/index.html
     HARNESS_STATE=help-demo ./run.sh help 400`, 12 cases: opens (H0, H1), every article's title / lead / pictures / "being
     written" (H2), search + Esc (H4), the Month-only switch (H7), Esc closes (H5), Help changes no field and no Undo step
     (H8), every Show me (20 buttons) rings its control (H3), `?` by context incl. each Settings tab and "the last article"
     (H6), no stale wording in any article (H10), the facts that mattered most still said (H11), E0. Red on a planted stale
     phrase (H10) and a dead Show me selector (H3). Its first run found three bugs, fixed: Esc in the search box closed
     Help (Mantine closes a modal on Esc in the CAPTURE phase: the input now carries `data-mantine-stop-propagation` while
     there is a query); Show me took the first match even when hidden (`.si-tandem-in` is drawn once per Schedule by mode;
     it now takes the first VISIBLE match, and the Region ShowMe points at `.region-mirror`, since `#union-place` is in a
     closed Settings window); `?` with Settings open never matched (`.side-settings-btn.active` never existed: it reads
     `aria-expanded` and routes by tab: prefs / regiontab / presets). H3, H6 and the Show me test read the real UI, so a
     new article with a ShowMe is covered for free.
     ⚠️ Not in the leg: an ⓘ hint's "More in Help" (a headless run draws no frames, so a Mantine HoverCard never opens;
     `mouseover` opens it in the real browser, tried by hand). `node tools/check-help-jsx.mjs` instead fails on any
     `help="…"` or `openHelp('…')` in `src/chrome` that names no article, and `HelpWindow` logs a console error at load for
     a `?` context id that is not in `toc.js` (the leg's E0 catches it).
     The old Guide's text checks moved out of `filekeys` H1, `firstrun` H1, `noresetall` A4, `simpostlabel` S2,
     `exportnames` X7 and `swapwords` R6 (the last was not on the original list); `oskeys` H1 / H2 now open Help and read
     the Keyboard shortcuts article and the one on selecting cells, per platform. Results on the build, each with its
     gate arguments: help 12/12, oskeys win / mac / linux 10/10 each, filekeys 15/15, firstrun 21/21, noresetall 4/4,
     simpostlabel 2/2, exportnames 11/11, swapwords 2/2 and 5/5; `npm run check` 46/46.
     ⚠️ A leg that needs Help's TEXT must open Help first (`#help-fab` after a `pointerdown`) and read `.hp-art`; use
     `textContent`, not `innerText`, when a folded "More detail" must count (innerText leaves a closed <details> out).
  6. ✅ README changelog ("Unreleased — a new Help…") and a What's New entry (`2026-11-23`, "A new Help", "Help for Month
     view users") are written; the tracker card `help-center-redesign` is `ready`.
  7. ✅ **The page merges are DONE (23 Nov 2026, owner's picker "Before shipping"): 64 → 44 articles.** custom, hidewf →
     `cards` (which also took the phase-card picture from `first`); phiatus → `hiatus`; nudge, drag → `move` (now the
     chooser only: the Shift and Build Around steps and pictures live in `shift` / `build`); compare → `scen` ("Scenarios and
     Compare"); holnotes → `auto` ("Automatic notes and holidays"); bulk → `mvnotes`; singlecol, datefmt, mvsize → `prefs`;
     daymenu → `month`; tokens, lastedited → `hdrmodes` (the variable tables sit in a folded More); excel → `pdf`
     ("Export: PDF and Excel (Waterfall)"); filemenu, autosave, trouble → `save` ("Save, Load and autosave"; `trouble` kept
     only the permission prompt, "Chrome or Edge" and the file-changed line: the dialogs print their own explanations; the
     Excel-library line moved into the export page); regiontab, holidaylists → `region`. None had shipped, so no machine
     remembers the old ids. Re-pointed: every `<To id>` / `<Related>`, the `?` context table (day menu → `month`, Region tab
     → `region`), the Holidays ⓘ (`help="region"`), the help leg's titles. `check-help-jsx` 44/44, `npm run check` 46/46,
     the `help` leg 12/12 on the build (20 Show me buttons now).
  8. ✅ **`origin/main` merged in (23 Nov, `b4986b5b`; the owner's picker "Merge main, push, deploy")**: 7 commits (the
     holiday rename from Settings, the frozen-code guard, the cut-note "…"). Conflicts only in README, HANDOFF (kept both
     sides) and `src/index.html` (kept the Guide's removal; main's one-sentence edit to the Guide was already in the Region
     page). ⚠️ `git checkout --merge` writes `<<<<<<< ours / ||||||| base / ======= / >>>>>>> theirs`: a resolver must
     handle the `|||||||` section (diff3 style) or it keeps the base text. After the merge: `npm run check` 47/47, `help`
     12/12, `oskeys` ×3, `filekeys`, `firstrun`, `noresetall`, `simpostlabel`, `exportnames`, `swapwords` ×2, plus main's
     `holidayrename` 20/20 and `wfnoteellipsis` 11/11, all green on the merged build.
  9. ✅ **"What is SPTCal?" added (23 Nov, owner's request, `articles/what.jsx`)**: first in "Start here", and now the page Help
     opens on in the Waterfall when nothing is open and nothing was read (the Month view still opens `month`); the tour links to
     it. 45 articles; the `help` leg's H1 / H6 expect it. No picture (the tour has the numbered one); wording kept vague on
     purpose (nothing about a studio or a real show).
  10. ✅ **PUSHED and LIVE (23 Nov 2026).** `git push origin HEAD:main` from the worktree: `920c8f81..8056c32a`, a fast-forward
     (origin/main was an ancestor, 13 commits). "Build and deploy" run 45285294363: both jobs succeeded (Setup Pages, Deploy,
     Publish to Cloudflare Pages). The GitHub Pages `index.html` is byte-identical (sha256) to the tested `dist/` and holds
     the new pages; `sptcal.pages.dev` is behind the sign-in, so it was not fetched. ⚠️ The run's "Check the docs' line
     references" step exits 1 (9 prose line numbers in old HANDOFF text; the same on the 22 Nov run; the job still passes).
     Local `main` was left alone (it is not an ancestor of the pushed head; the main checkout is on another branch).
  **WHAT WAS LEFT (owner's call), now done:** (a) the final go-ahead: merge `help-center` into `main` and push (`main` auto-deploys;
  verify the live URL after, ~40-60 s). (b) (done, item 7). (c) Left on the owner's own "do not add back" list and still
  mentioned: `newreset` bullets Reset Waterfall / Month Notes, and `heading-editor.webp` shows "Hide column": ask. (d) The
  engine's ⓘ list says `{version}` is "Version, as typed" (it prints v3); an ⓘ edit, not Help. (e) Owner ruling: no
  printed captions, see above.
### 🎨 22 Nov 2026: A LOOK-AND-FEEL REVIEW AGAINST IMPECCABLE, ANALYSIS ONLY: no app code changed. Report https://claude.ai/artifact/C5fwjQyJhPbiJ53zqGyv48 (private, "SPTCal Look and Feel"; its `audit.json` holds every raw finding). Tracker card `ui-polish-motion-impeccable` (planned, waiting on the owner).
- **Owner:** a deep analysis of the UI/UX around the calendar with Impeccable.style as the basis: where Mantine works and
  where it doesn't, cleaner and more polished, what a redesign would entail, and where animation would add clarity and a
  friendlier feel. The waterfall and month calendars themselves out of scope.
- **How:** 34 captures of the dist build (v1.22.1, 21 Nov) at 1440×900 @2x in headless Chrome on the owner-approved
  Harbor Lights S1 (`help-demo.sptcal` from the help-center worktree), a computed-style census of every element outside
  `#table-wrap` in 7 states, then a 4-lens workflow (layout, panels/feedback, design system, motion: Opus) with a Sonnet
  checker per lens. 55 findings: 13 confirmed, 27 confirmed with a detail corrected, 0 wrong, 15 not cheap to check;
  merged into 31 in the report. Sized "lean" on the owner's picker (weekly all-models usage was at 91%).
- **The verdict:** refine, don't replace (Impeccable "Operate" mode; a new visual world would break the Outlook/Excel bar).
  The drift is measurable: 14 font sizes on screen vs the theme's 6, 22 radii vs 5, ~12 button styles, 4 dialog frames,
  23 uppercase-label rules, 27 transition timings all on `ease`, 2 of ~41 alerts titled (the rest "Notice").
- **Facts learned, checked by hand:** `theme.js` sets no `transitionProps` and `main.jsx` never sets
  `respectReducedMotion`, so every Mantine Modal drops 30 px over 200 ms each way and ignores reduced motion; the theme's
  Modal `radius: 'xl'` is overridden to `lg` in all six dialogs (a dead default); `flashSaveBtn` pushes `disabled:true`, so a
  successful Save paints grey; `runShift`'s readout says "earlier/later" against the Pushed/Pulled rule; `dayMonth()`
  (app.js ~14451) writes menu dates day-first on month-first calendars, against the 13 Nov date-order rule; `.info-hint`
  is gray-5 (2.58:1) in an 18 px box with a stock blue focus ring.
- **Proposed signature motion, "the move lands":** after a Shift, Build Around or ▲/▼, phase-coloured ghosts glide and a
  ring holds on what moved (Date column for whole-calendar moves); generalises `playSwapSettle`. ⚠️ Today's swap layer
  (`ensureSelLayer`) lives inside `.sheet-grid-wrap`, i.e. inside `#table-wrap`; the report recommends a body-level layer
  and lists the placement as an owner decision.
- ⚠️ **Prerequisite for ANY new motion:** headless Chrome draws no frames, so a `motionOK()` switch + a localhost
  motion-off flag set by `t/lib.js` must land first, or legs stall the way the Settings slide once did.
- **Next:** the owner's picks in the report's "Your calls" table (14 decisions; steps 0–3 need no ruling changed). Help
  findings (copy drift: Version text, "Header button in the toolbar") belong to the help-center branch.

### 📜 21 Nov 2026: A GOVERNANCE SHEET, PLAN ONLY — `GOVERNANCE-PLAN.md` (untracked), NO app code or doc rules changed. Tracker card `governance-sheet` (planned, waiting on the owner).
- **Owner:** write up a plan for a proper governance sheet built from everything they've said about how the app is
  built, designed, featured and how they like things to work.
- **The plan:** one `GOVERNANCE.md`, the only home of standing rules, each with an ID (`REL-1`, `FILE-4`…), the
  rule, why, the owner's words and date, what applies, what holds it, and its status; loaded into every session by an
  `@GOVERNANCE.md` import in CLAUDE.md (so worktree sessions finally see the rules that today live only in private
  memory). §4 is a first-cut inventory of ~75 rules in nine chapters; §7 the phases (sweep, reconcile, draft with the
  owner chapter by chapter, rewire, a `check-governance` script); §9 seven decisions for the owner.
- ✅ **Owner's pickers, same day (all seven, recorded in the plan's §9):** a repo file; SPTCal only; trim CLAUDE.md;
  archive HANDOFF entries older than the current version into monthly files; cite rule IDs in new work only; build the
  push guard (`pre-push`) and a standing-rule reminder hook, no tracker Rules tab; review chapter by chapter with
  pickers.
- ✅ **Phase 1, the sweep, done the same day.** Eight Sonnet reader agents covered HANDOFF (four parts), the plans (two
  halves), README and the reference docs, and CLAUDE.md and memory were read by hand. The result is 584 candidate
  entries, 60 noticed conflicts and 13 superseded/unclear entries, in `governance-work/INVENTORY.md`. That folder is
  local to the main checkout and kept out of git by `.git/info/exclude`; `merge.py` there rebuilds the inventory. 260
  of 281 owner quotes check out verbatim, and the 21 that don't are marked ⚠. Coverage limits are in the plan's §7a.
  Next: Phase 2, reconcile (merge duplicates, put each real conflict to the owner).
- ✅ **Phase 2, reconcile, done the same day.** Four Opus merge agents and `governance-work/finalize.py` turned the 584
  entries into **181 numbered rules** (IDs provisional), 78 feature decisions (they stay in their plans), 22 reference
  notes and 61 doc fixes, all in `governance-work/DRAFT-RULES.md`. ⚖ **The owner's six rulings (pickers, 21 Nov 2026),
  in force now:**
  - A session may **commit freely on its own working branch**; merging into main and every push are still asked.
  - The **full gate** runs before any push that changes behaviour, a grid cell, an export, a saved file or a
    dependency, or cuts a version. Chrome-only look and label changes are exempt, and the owner can waive it by picker.
    This **replaces the 18 Sep gate policy**.
  - The **month PDF's output is frozen** (a moved page needs the owner's yes plus gate 13); the writer's code isn't.
  - The waterfall editor's move toward its PDF look is **decided only through WATERFALL-PDF-LOOK-PLAN**.
  - **Folding controls that apply, to cut clutter, is case by case**: the phase cards stay unfolded; anywhere else a
    fold needs a mockup and the owner's yes.
  - A **refused edit gets a short note by the spot**; a failed job (export, load) keeps its dialog.

  CLAUDE.md and §0 / §5a still say the old thing on commits and the gate (in the draft's doc-fix list for Phase 4).
  Next: Phase 3, the owner's chapter-by-chapter review. The plan's §7b proposes the slimmer two-file format and a
  one-picker-per-chapter review.
- ✅ **The code comments were swept too** (owner: "Sweep comments first", after the 31 Aug ⓘ ruling turned out to
  exist only in README and `InfoHint.jsx`). Three Sonnet readers covered every comment that cites the owner, about
  1,600 in `src/` and `tools/`, with every quote verified. They added 8 rules and 5 additions, and corrected UX-38:
  since the owner's D6 (a) (13 Nov) the note editors save on Enter and Esc keeps typed text. The draft is now
  **189 rules**; details in the plan's §7a. UX-4 now says where descriptions go: the control's name on screen, a
  one-to-three-line description behind the grey ⓘ, anything longer in Help, and warnings never hidden.
- 🗳 **Phase 3, the owner's review, runs on a page now** (owner, 21 Nov: *"can you give me an interactive page to
  accept/decline/edit every single part of the governance doc"*, after accepting the PRD chapter as written in chat):
  https://claude.ai/artifact/5BFJezZG1edDdq2GtAaN5q, private, "SPTCal Rules Review". It covers all 189 rules, their 29
  exceptions and the sheet's 4 intro parts, each with Accept / Decline / Edit and a note, plus suggested new rules.
  Picks save to the page's database. **To act on them:** ArtifactData `list` on `reviews` and `additions` (shapes in
  the plan's §7c), write them into `governance-work/review.json`, then run `make_gov.py`. The two-file draft
  (`GOVERNANCE.md` 102 KB + `GOVERNANCE-HISTORY.md`) is in `governance-work/`.
- 🧭 **An outside governance framework was studied** (owner, 21 Nov: an installer doc and its template in Downloads;
  *"dont copy to repo"*). Nothing was copied, run or installed. A workflow ran 5 readers, 3 comparers and 9 skeptics, then
  a completeness check: 30 of 51 adopt/adapt/strengthen calls survived. The result is `governance-work/compare/SYNTHESIS.md`
  plus **41 proposals added to the review page as chapter OUT** (4 new rules: INTRO-5, WORK-25, WORK-26, REL-15; additions
  to 14 rules; Phase 4-6 changes). Summary and the five owner decisions are in GOVERNANCE-PLAN §10.
  - ⚠️ **Found while verifying, left for the owner:** `.claude/settings.local.json` allows `git push *` and `gh api *`
    with no prompt; no git hook is installed; there are 180 worktree folders. Decision 1 in §10 covers it. Don't change
    the permission settings without the owner.
- ✍️ **The review page is in plain words now** (owner: "reword everything more simply ... what it is now, why it would
  change and how"). Version 3 at the same address shows every item as a gist plus Today / Why / What changes. Six
  writers and two meaning-check editors produced it (`governance-work/plain/`); details in GOVERNANCE-PLAN §10a. The
  Single HTML file architecture session's critique is folded in, checked on origin/main:
  - CODE-5 (one file) is marked "Suggested: decline".
  - New proposals OUT-42 (the lock file is the frozen list) and OUT-43 (release copies out of the repo, 66 MB).
  - The FILE-3 field-order addition is dropped.
  - OUT-14 protects only `tools/frozen-lock.mjs`.
  - ⚠️ `tests/harness/prove-header-preset.mjs` tests nothing: its anchor `sheet: p.lines ?` matches nothing in the engine.
- ✅ **23 Nov 2026: PHASE 3 DONE, the owner reviewed every item.** 233 accepted and 3 declined: CODE-5 one file,
  COPY-6 help text only says what sets an option apart, UX-19 "same style" means colours only. All 43
  outside-framework proposals were accepted. The draft is now `governance-work/GOVERNANCE.md`, **190 rules, 108 KB**,
  plus `GOVERNANCE-HISTORY.md` (declines recorded; the 21 accepted plan-work items listed). Details are in
  GOVERNANCE-PLAN §7d.
  - ✅ **Phase 4 done 23 Nov 2026: see the entry above.** The `governance-work/` paths in this entry are history: a local
    record on the owner's Mac that no session needs (OUT-20).
  - **Next: Phase 4 (rewire) in a fresh session:** slim CLAUDE.md and import GOVERNANCE.md, archive old HANDOFF
    entries, and do the accepted Phase 4 items (measure the session load first, settle open branches, prove the import
    loads).
  - **Owner decisions still open:** §10's 1, 3, 4 and 5, then 2 once the load is measured.
  - Nothing committed: this checkout's branch holds another session's uncommitted work.
- ⚠️ **Seven contradictions found while reading, NOT fixed yet** (the plan's §1 lists them, Phase 2 rules them):
  CLAUDE.md's "localStorage is used nowhere" (app.js uses it 21 times); HANDOFF §5b's reading order; §5g's version-cut
  files (and `package.json`, which `npm run check` requires and neither names); §4's "saved calendars are copies of
  index.html"; §4's `@layer` fence (built by import order); §5a's GitHub Pages deploy (now Cloudflare); "Chrome/Edge"
  against the owner's "only chrome, but do test windows".

### 🗄️ 21 Nov 2026: SPLITTING THE ENGINE INTO FILES IS SHELVED (owner, *"Shelve it"*). Decision only, no code. Tracker cards `engine-split-modules` (held), `post-schedule-version`, `holiday-data-own-file`, `multi-file-output`.
- **Asked:** whether the single-file design holds the app back, especially with post-production coming. A read-only
  study (5 agents) measured `src/legacy/app.js`: a behaviour-identical split into ES modules fits in ONE night as one
  agent running a codemod (frozen text can stay byte-identical; only 7 bindings must sit with the frozen code). But it
  leaves the coupling as it is (17 modules = one cycle, 202 of 272 possible edges, 260 shared mutable bindings), and its
  prerequisites (a night's landing freeze, porting live branches by the merge-parent method, retargeting 15 path
  readers and 11 text-slicing legs, 332 doc mentions) cost more than it returns.
- **Why shelved, measured:** the gate gains nothing (headless Chrome starts in ~0.5 s and the app loads and boots in
  ~0.4 s more per leg; the hour is the legs' own work); the frozen-code guard shipped without it (entry below); git
  merges different hunks of one file without conflict; token savings are modest (sessions grep and read slices).
- ⛔ **Do instead:**
  - **Post-production is built as its OWN module from day one**: its own files, its saved data under one snapshot key,
    and a defined way to read the shoot schedule, not more of `app.js`. (`post-milestones`, the Producer's Cut note, is
    already inside `app.js`.)
  - **The generated holiday data** (`HOLIDAYS`, `REGION_CAVEATS`, `REGION_NOTES`, ~2,400 lines that
    `tools/gen_holidays.py` writes as `holidays.app.js` and someone splices in by hand) can move to its own generated
    file the next time holidays are regenerated.
  - **The output stays one file for now, but NOT as a rule.** Its old reason (an emailed working copy) is gone since
    v1.21.0. The reasons the governance draft gave (rollback, the CSP, fonts) don't require it. There's no service
    worker, so offline isn't a reason either. Keeping it is only the cost of changing (CSP, check-build, harness server,
    release copies, the font element ids the PDF writers read). Revisit if post-production makes the app much bigger.
- **Reopen the split if** post-production needs deep access to engine state, or merge conflicts in `app.js` start
  costing real time.
- **Found on the way:** 37 release copies (`releases/*.html`, 68 MB, ~2.3 MB each, 15 of them on 17-19 Nov) are committed;
  storing them as GitHub Release files would stop that growth (not decided). The parallel lanes (`gate-lanes`, rejected
  21 Oct) are still the biggest measured gate speed-up; the sleep trim (`gate-sleep-trim`) has sat unmerged since
  22 Oct. A governance session's notes and this session's critique of them went both ways the same day (its draft rule
  CODE-5, "the product stays one file", was flagged as not worth a rule).

### ✂️ 21 Nov 2026: A WATERFALL NOTE OR HIATUS BAND CUT OFF BY ITS ROW ENDS IN "…" — BUILT on branch `note-ellipsis` (worktree `.claude/worktrees/note-ellipsis`, from `origin/main` `81575e55`; `node_modules` is a symlink, unlink it before `git worktree remove`), full gate run, gate 2 RE-CUT on the owner's picker, committed `69ca122d`; `origin/main` merged in (`46b6ea33`, its three frozen declarations re-locked under the new frozen-code guard with the owner's approval), PUSHED to `main` on the owner's picker *"Merge and push"*. ✅ LIVE: deploy run green, the GitHub Pages file byte-identical to the tested build. Frozen edit **EL1** (CLAUDE.md's tenth exception). README "Unreleased". Tracker card `note-size-ellipsis`.
- **Owner:** *"When you increase font size of a note, don't just silently cut off the text, add an elipses"*. Pickers: *"Screen + PDF (Recommended)"* (Excel unchanged), *"Notes and hiatus bands"*, then, shown the reference calendar's cell, *"Accept, update refs"*.
- **Why it was silent.** `cellTextFit` honours a picked size outright (`manual`) and a pinned row's height, and the cell body is `max-height` + `overflow:hidden`, so lines past the row were simply cut; the PDF drew them inside the cell's clip box, where they were invisible. The month view already had a line clamp.
- **What it does.** `cellClampLines(fit, rowPx)` (beside `cellTextFit`) = the lines the row shows, `Math.round((rowPx - ROW_TEXT_PAD_PX) / (11 * scale * 1.35))`, at least 1; a cell whose wrapped lines run past that gets `display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:N` (`cellClampCss`) on its `.cell-body`: notes, all-phase bands, per-phase bands in `renderSpreadsheetView`, and `applyCellFitLive` during a drag. The PDF twin `wfPdfEllipsize` keeps that many of `wrapLines`' lines (its own row height, points) and ends the last in "…" (WinAnsi `\205`, trimmed until it fits the column; Carlito's subset carries every WinAnsi glyph, and Quartz draws it).
- ⛔ **Half a line counts as shown, never `budgetAt`'s floor.** The familiar two-line note in a 20 px row is `clipped` at the shrink floor (1.68 lines fit); a floor would have put "…" in place of its readable second line on every such note. With the round, it is untouched (the leg's control).
- ⚠️ **It also reaches AUTOMATIC-size cells**, not only picked sizes: any wrapped cell with more lines than its row shows. That is why gate 2 moved: the reference calendar's 6/29/26 Notes cell is three lines in a 20 px row ("Start Principal Photography 6/29/26", "Independence Day (Observed) 7/3/26", "Independence Day 7/4/26"); it now draws two, the second ending in "…", and the hidden third is no longer in the PDF. The owner saw exactly this and picked *"Accept, update refs"* (the alternative offered was "…" only on picked sizes). Re-cut as on 16 Nov, running clock pinned to 29 Aug 2026; the baseline README has the proofs. `base.json` (gate 1) and `base.xlsx` (gate 3) did not move.
- ⚠️ A cell already cut by part of a line still is: a 14 px note in a 20 px row shows one line slightly trimmed at the bottom, "…" included. Pre-existing; the row is shorter than the line.
- **Verified.** New leg `wfnoteellipsis` (fixture `noteellipsis.sptcal`, synthetic) 11/11, 7 of 11 red on the build before; `npm run check` 46/46; full gate: every baseline identical but gate 2's one cell (now re-cut and passing, `pdfcmp.py` both ways), and three legs that asserted the PDF writes lines the cell hid, changed to expect the shown lines and the "…": `notewrap` A-L/A-W/D-L/D-W (16/16; B and C, not cut, keep the old checks), `noteviews` P1 (15/15; the "…" after "Network call" is the proof the month notes reached the writer), `phasenotes` X2 (21/21; 8/3 draws "Table read…", not Visitor). Six failures under load (`swapsharenotice`, `swapsingleorders`, `recoverfail` newer, `doubleups` ×2, `weeknum`, `monthexport` monthnotes X6) all passed rerun alone. I could not use the browser pane (all five dev-server slots held by other sessions): the look was checked through a headless Chrome screenshot.
- No What's New entry (a small fix). Excel is deliberately not changed: Excel clips wrapped text itself, and cutting the cell's text would lose the note from the file.

### 🔒 21 Nov 2026: THE FROZEN-CODE GUARD — `npm run check` fails when a frozen declaration's text changes without an approved re-lock. ✅ **LIVE at `fbfd96a4`** (owner's picker *"Push now"*, 21 Nov 2026; fast-forward `79d6bea2..fbfd96a4`; deploy run 44941735360 green, its `npm run check` ran the guard, 47/47; the live build stamp is unchanged, `7b41a02b1a37`, so users got no update bar). Branch `frozen-guard` (worktree `.claude/worktrees/frozen-guard`; its `node_modules` is a symlink, unlink it before `git worktree remove`). README "Unreleased". Tracker card `frozen-code-guard`.
- **Owner:** asked whether the single-file design holds the app back; of the answer's options, *"Build the guard"*.
- **Done:** `tools/frozen-lock.mjs` parses `src/legacy/app.js` with Vite 8's own parser (`rolldown/parseAst`, 0.2 s) and
  takes a SHA-256 of the EXACT source text of each of the 55 frozen declarations (CLAUDE.md's 51: the five width-model
  constants, grid, text fitting, direct manipulation, exports; plus the four its named frozen edits made frozen:
  `mvNoteLineCount`, `mvNoteLineCountSized`, `notesForWaterfallDate`, `mvNoteBoxWidth`), 4,212 lines. Inner comments
  count; the comment above a declaration and its position in the file do not. `tools/frozen-lock.json` holds the
  fingerprints, each with the approval it was last locked under. `tools/check-build.mjs` runs it (check "the frozen code
  is unchanged"), and `deploy.yml` runs `npm run check` before publishing, so an unapproved frozen edit cannot deploy.
  - ⛔ **A frozen edit the owner approves re-locks in the SAME commit:** `node tools/frozen-lock.mjs --approve "<the
    owner's words, date, what changed>"` (refused without real words), plus the `Frozen-edit-approved:` line it prints at
    the end of the commit message. `git log --format='%h %cs %(trailers:key=Frozen-edit-approved,valueonly)' --
    tools/frozen-lock.json` is then the list of every frozen edit. Never re-lock to make a red check green.
  - `--add name[:group]` / `--remove name` freeze or unfreeze a declaration (owner's call); `--self-test` mutates each
    declaration by one space, and renames one, and requires each to be caught.
  - Approvals live ON each entry, not in a shared list, so two branches editing DIFFERENT frozen functions merge with no
    conflict in the lock; two editing the SAME one conflict there, which is the case a person should see.
  - ⚠️ **What it does not guard:** behaviour (a non-frozen helper frozen code calls can still change what it does: the
    gate guards that), and the frozen CSS (below). If the engine is ever split into modules, the lock's `file` becomes a
    list; the declaration finder already looks at a module's top level.
- **Not done, owner's call: the frozen CSS.** The two banner blocks CLAUDE.md names (`Month view`, `Calendar PDF export
  (browser print)` in `src/styles/legacy.css`) changed in 11 commits from 23 Oct to 14 Nov, several of them chrome work
  (the Phases tab, the "+" buttons' hover, a Show info note) rather than frozen edits, so locking them as they stand would
  stop ordinary work. Locking them needs the owner to rule what in them is frozen.
- **Measured:** the check takes 0.23 s; `--self-test` catches all 55 one-space mutants and a rename (10 s); `npm run check`
  47/47 on the worktree's build, and 46/47 with a comment added inside `renderMonthView` (exit 1, "renderMonthView: text
  changed (733 lines when locked, 734 now)"); an `--approve` round trip re-locked only the edited declaration. Replayed over
  the last 30 days of `origin/main`: 38 of 300 non-merge `app.js` commits changed frozen text, 36 saying "frozen" in their
  message; the other two (`5b583808` rule 22 = LR6, `8129f047` LR8) are frozen edits HANDOFF records, so frozen edits run at
  about one a day and every one would have needed a re-lock. Unmerged branches: the four live ones (`scenario-version-offer`,
  `note-rows-grow`, `help-center`, `producers-cut`) touch no frozen text; `try-d` and `claude/settings-window-30719d`
  (stale) do and would need an approval to re-lock if revived. No gate (no product file changed; `dist` is unaffected).
- **Found on the way (engine-split study, same day, tracker card `engine-split-modules`):** CLAUDE.md and MANTINE-SEAM
  say SEVEN unguarded `#table-wrap` listeners; `getElementById('table-wrap').addEventListener` appears 21 times.
  `prove-header-preset`'s text anchor `sheet: p.lines ?` matches nothing in `app.js`, so that prover tests nothing.

### ✏️ 21 Nov 2026: A HOLIDAY IS RENAMED FROM THE HOLIDAYS LIST (Settings › Region) — committed `6be10871` on `scenario-version-offer` (its hunks only), cherry-picked onto `origin/main` as `79d6bea2` and LIVE: pushed on the owner's picker, deploy green, the GitHub Pages file carries `hv-name-edit` (the Cloudflare address is behind the sign-in, not fetched). README "Unreleased". Tracker card `holiday-rename-in-settings`.
- **Owner:** asked whether a holiday's name should be editable from the Holidays list, then *"No text box until you hover
  over the title similar to how the episode names in the production phase section work"*.
- **Done:** `renderHolidayVisList`'s row puts the name in `.hv-name-edit`, a `contenteditable="plaintext-only"` span
  (no id) as `.hv-name`'s first child, carrying `data-hid` / `data-iso` / `data-name` / `data-orig`. legacy.css draws it as
  text; `:hover` gives it the episode names' gray-3 border and white fill, `:focus` the primary border; negative margins
  give its padding and border back, so no row or name moved (measured on all 27 rows of the fixture, leg S1). Cleared,
  `:empty::before` shows the name it goes back to. The `#holiday-vis` IIFE: Enter blurs, Esc restores `data-name` and
  blurs (both `preventDefault`, so the Settings window, which closes on an Escape nobody took, stays open); `focusout`
  runs `commitHolidayNameEdit()`, which is `writeActiveMvNote`'s holiday rule (`stripHolidayDate`, empty or the list's own
  name = no rename) through `setHolidayName()` and one `update()`. Help (Notes display paragraph) and the card's ⓘ say so.
  - Why a contenteditable and not an `<input>` like `.ep-name`: a long name still WRAPS between words as it did (an input
    would cut it in a ~125 px column), and the name stays `.hv-name`'s text, which `regionlock`, `mvmenu`, `holidayenable`
    and `settingswin` read.
  - ⛔ The list is rewritten on every render, so `renderHolidayVisList` carries a name being typed (text, caret, focus) into
    the new row, with `hvNameRedrawing` keeping the old node's focusout from committing half a name (leg S4).
  - `scheduleScenarioProbe`'s "typing" test now also takes `isContentEditable`: `[contenteditable="true"]` missed a
    plaintext-only field (this name, and a side box's text), so a probe could re-apply the calendar mid-typing.
- **No saved key, nothing frozen:** the rename is `holidayNames` as before (one date only, the owner's 30 Oct picker).
  No What's New entry (a second way to do something users can already do: the 21 Nov Hide Holiday got none either).
- **Verified:** `holidayrename` with new S1-S5, `holidayenable` 8/8 (anchorside) + 2/2 (customunits), `settingswin` 21/21,
  `regionlock` 14/14, `mvmenu` 81/81 (halfdays), `npm run check` 46/46; in the browser on `holidayrename` (hover, rename,
  ⌘Z, Esc, clear, a redraw mid-typing). ⚠️ `holidayrename` and `mvmenu` time out at "the fixture" without their
  `HARNESS_STATE` (holidayrename, halfdays): that is a harness call, not a failure. No full gate (chrome only).
  ⛔ **Run legs on a private `HARNESS_PORT`.** `run.sh` defaults to 8231 and `pkill`s any srv.js there, and other
  sessions' gates use it: a bare run killed the `note-ellipsis` gate's server (its results 09:50-10:50 are suspect)
  and once tested another worktree's code (a "14/14" holidayrename with no H1 or S cases). The legs above were
  re-run on 8437 against the pushed tree: all green.

### 🙈 21 Nov 2026: THE MONTH VIEW'S HOLIDAY EDITOR HAS "HIDE HOLIDAY" — committed `a3ed0a2e` on `scenario-version-offer`, cherry-picked onto `origin/main` as `21af8e8b` and LIVE: pushed on the owner's picker, deploy green, the GitHub Pages file carries `mv-holiday-hide` (the Cloudflare address is behind the sign-in, not fetched). README "Unreleased". Tracker card `month-hide-holiday`.
- **Owner:** *"We need to add the same hide holiday button in the waterfall pop-up to the month view pop-up"*.
- **Done:** `openMvNoteEditor`'s head gives a holiday (`isHol`) a `note-pop-delete mv-holiday-hide` button, "Hide
  Holiday", where the Auto-Note editor has Hide Auto-Note (it had none). Its click goes through the existing
  `.note-pop-delete:not(.mv-note-delete)` handler, which now sets `activeMvNote.hideHoliday` for a holiday (`deleteAuto`
  otherwise); `writeActiveMvNote`'s holiday branch applies the rename / colour first, then
  `holidayView[hid].month = false` and `renamed` (the commit runs `update()`). The twin of `hideHolidayInWaterfall()`:
  the Waterfall box is left as it was, the holiday stays a day off. No new id, no saved key, nothing frozen.
- **Verified:** `holidayrename` 15/15 (new H1), `npm run check` 46/46, in the browser (8863's harness server, all five
  preview slots were held by other chats).
- ⚠️ `run.sh holidayrename` PRINTS its result cut off after W1 (stdout only); `holidayrename.json` has every case. Read
  the JSON before calling X1 / E0 missing.
- ⚠️ In the browser pane, `?state=holidayrename` opened with every holiday's Month box UNTICKED (Thanksgiving had to be
  ticked to show), while the leg sees them on. Not investigated: likely the pane's own leftover state (a recovery offer
  came up at launch).

### 📐 20 Nov 2026: SHIFT KEEPS EVERY PHASE'S DISTANCE FROM THE WRAP — BUILT on branch `shift-wrap-follow` (worktree `.claude/worktrees/shift-wrap-follow`, from `origin/main` `a85ca47c`), full gate run (every baseline identical; no failure from this branch), README "Unreleased" and What's New entries in, committed locally; `origin/main` (`07d681ed`, the 13" toolbar) merged in and local `main` moved to the merge on the owner's picker *"Merge, don't push"*; then `origin/main` (`b093115`, the four re-premised checks) merged in again and PUSHED on the owner's *"push it"* (20 Nov 2026) as `81575e55`: LIVE. Deploy run 44854769982 green (Build and check, GitHub Pages, Cloudflare Pages); the GitHub Pages file is byte-identical to the build (sha256 `0225542c…`) and carries the What's New entry; sptcal.pages.dev answers 302 to its sign-in, as it should. (The two deploys before it, for `b093115`, had failed at GitHub's own `deploy-pages` step, "No artifacts named github-pages", a GitHub-side fault; this push carried that change out too.) Plan and rulings: [`SHIFT-WRAP-FOLLOW-PLAN.md`](SHIFT-WRAP-FOLLOW-PLAN.md). Tracker card `shift-keeps-wrap-gap` (ready).
- **Owner:** Shift moves Production onto new holidays, the shoot gains or loses a week, and a 1-week gap or overlap opens before Post.
  Rulings by chat and picker (plan §1): R1 every phase Production's length affects, not just Post; R2 any cause (holidays, Off days,
  worked holidays, worked weekends); R3 a phase alongside the shoot follows only if it ended in the wrap week; R4 Production's own ▲ / ▼
  stay one-phase-only and there is no switch; R5 the hiatus ripple follows too (only when it moved Production); R6 To a date with
  Production landing by its END lands on or before the date (searched one week earlier at a time, at most 4); R7 a phase straddling the
  wrap stays.
- **Done** (`src/legacy/app.js`, beside `shiftCalendar`): `wrapFollowBefore()` reads the wrap and the tied phases before a move;
  `wrapFollowAfter(before, expectedOf)` compares the wrap with where the move alone would have put it (working weeks over the follow
  move's held breaks) and moves the tied phases the move moved by the difference, as a part move (`stepHeld`, one window per phase,
  `colKeepQuiet`); `wrapCauseText()` names the cause from `productionInfo`'s `holidaysHit` / `offsHit` / `addedDays` + `holidaysWorked`;
  `shiftWithWrapFollow(weeks, held, move)` wraps the arrows (`runShift`), `shiftBy` and To a date's Go; the ripple calls
  `wrapFollowAfter` itself after its `update()`, its expected wrap worked out step by step with each step's own obstacles. Lines:
  "Wrap 9/14/26: Labor Day falls in the shoot now. Post and Localization were also pushed 1 wk to keep their distance from the wrap."
  The arrows: "· Post & 1 more pushed 1 wk". The ripple: "Wrap 9/14/26 (Labor Day falls in the shoot now)".
- ⚠️ **Found while building:** on the reference calendar (`T.buildFixture()`, 80 days) NO weekly shift changes the shoot's length in
  weeks: its wrap moves between Tuesday and Friday inside the same week. A follow needs a wrap at a week's edge (a Friday that gains a
  holiday, a Monday that loses one). The leg uses 40 days from 7/13/26 (wraps Fri 9/4; a week later Labor Day makes it Mon 9/14).
- ⚠️ The plan said the wrap could only be read after the move's bracket closed; wrong: `update()` re-derives the day marks from their pins
  while `overrideMove` is set, so the schedule a move leaves already has them (plan §4 corrected).
- **Verified:** new leg `shiftwrapfollow` 14/14 (in gate.sh after `shiftheld`); `npm run check` 46/46; 21 related legs on
  `/dist/index.html`, all green: finishbefore 16, rebuildticks 20, buildaround 36, anchorside 39, buildalongside 8, buildcarry 17,
  buildendsby 21, panelstale 16, builddates 9, shiftbandline 10, yearroll 11, paneldrag 12, phasearrows 26, phasearrowsripple 10,
  rippleundo 29, mvdragcarry 15, stalebandkey 9, shiftheld 13, lastedited 22, ripplemarks 35, autonotefollow 8. Not tried in the browser pane: all five server slots are held by other chats and the
  pane cannot open a local file.
- **Full gate** (port 8297, 20 Nov 2026, ~1 h at a load of ~6): 5,953 PASS / 9 FAIL, EVERY BASELINE IDENTICAL (waterfall PDF,
  workbook, restore, gate 10, gate 13); `shiftwrapfollow` 14/14 inside it. The 9: `settingswin` W10, `noresetall`, `hdrrow`,
  `calrange` (file-menu load timeout), `mvbarsize` hiatus-blanklabel, all green alone (21/21, 5/5, 40/40, 18/18, 12/12);
  `hidewf` F1 + F3, `phasesui` P1 and `hiatusripple` R0 are red alone too, and red the same way on this branch's base
  `a85ca47c` built clean, so they are NOT this branch. ⚠️ **They are red on `main`**: each compares a saved file's
  `fields.byId` with a fixture's (`phasesui` names 12 fixtures). Some commit at or before `a85ca47c` changed what Save
  writes for those fixtures; unexplained, unfixed. After the gate: README "Unreleased" + What's New `2026-11-20` added,
  rebuilt, `npm run check` 46/46, `whatsnew` 12/12. ⚠️ `origin/main` has moved on (`07d681ed`, the 13" toolbar): merging
  will meet README / What's New / HANDOFF conflicts at their tops (keep both sides).
### 🧪 20 Nov 2026: FOUR RED HARNESS CHECKS ON `main` EXPLAINED AND RE-PREMISED — branch `fix-showinfo-order-legs` (worktree `.claude/worktrees/sweet-dijkstra-49037f`), `01c3e2c`, PUSHED to `main` (merge `b093115`) on the owner's picker (20 Nov 2026). Tests and docs only; no app code, so the live app is unchanged either way. ⚠️ Its deploy failed in GitHub's Pages "Deploy" step, the known GitHub-side failure (no `github-pages` artifact; two on the re-run): push run `44852551879` and its re-run, and a fresh `workflow_dispatch` (`deploy=true`) run `44852738909`, which fixed it last time, failed the same way. Cloudflare's step comes after it, so it did not run. Nothing live is stale (the last green deploy, `a64f7d3`, builds the same app); the next push's deploy carries this along.
- **Red since `368f9e2`** (19 Nov, Show info's field order per mode, below): `hidewf` F1 (`sameIds: false`) + F3 (not byte
  for byte the fixture), `phasesui` P1 (all 46 fixtures' `fields.byId`, the leg lists 12) and `hiatusripple` R0.
- **Cause:** `fields.byId` is built in DOCUMENT order, and that commit moved the markup to `num-blocks, days-per-block,
  num-episodes, shoot-days-per-ep` (was `shoot-days-per-ep, num-episodes, num-blocks, days-per-block`). Its own entry
  said "Nothing saved changed"; the ids and values did not, the KEY ORDER did (corrected in README). Measured on all 46
  `phasesui` fixtures: those four keys' order is the only difference.
- **Harmless:** nothing reads the order (`applyStateSnapshot` step 3 sets values with no event; `lastEditedCanon` sorts
  keys; `resetUndoHistory` takes a fresh capture). So the reorder stands and the CHECKS were re-premised:
  `T.showInfoOrderEra()` in `t/lib.js` (inlined in `hiatusripple.mjs`) puts those four ids of an older fixture or
  baseline in today's order, every other id must still be where it was. No fixture or baseline file was edited (the
  `phasesui` baseline README says so).
- ⛔ **Lesson:** moving an id'd control past another in the markup changes every saved file's bytes even when no id
  changes. Before calling a markup reorder "nothing saved changed", run `hidewf`, `phasesui` and `hiatusripple`; the
  `restore` leg (gate 5) compares the key SET only and stays green.
- **Verified:** `hidewf` 19/19, `phasesui` 8/8, `hiatusripple` 19/19 (each alone, on `dist/`), `npm run check` 46/46.
### 💻 19–20 Nov 2026: THE WHOLE TOOLBAR FITS ON A 13" MACBOOK AIR — branch `toolbar-13in` (worktree `.claude/worktrees/toolbar-13in`, from `origin/main` `2ef16d2`; `node_modules` is a symlink, unlink it before `git worktree remove`). Owner tried it on localhost and on another computer, then *"Finish it"*, then *"commit and push it"*: committed `67c729c`, `origin/main` (`a85ca47`) merged in (README and HANDOFF conflicts, both sides kept), re-checked (`npm run check` 46/46; `toolbarfit`, `spancounts`, `stylebarplace`, `calzoom`, `finaldelivery`, `hdrtemplate` green on the merged build), PUSHED to `main` (`07d681e`). ✅ LIVE: the push's own deploy run failed in GitHub's Pages step (no `github-pages` artifact, as on 19 Nov); a manual "Build and deploy" run ⛔ WITH ITS `deploy` INPUT ON (`gh workflow run "Build and deploy" --ref main -f deploy=true`; without it the deploy job is skipped) published it, Cloudflare step included; the GitHub Pages file is byte-identical to the tested build. Tracker card `toolbar-fits-13in`. A follow-up the owner looked at and declined (*"nevermind just leave it as is"*): fitting Production's weeks on the dashed line at 13" widths (`mockups/span-weeks-13in.html`, main checkout, untracked; card `span-weeks-on-line-13in`).
- **Owner:** *"is a standard 13" macbook air screen not big enough to show the entire menu bar in its full form?"* (no: the
  line needed ~1,690 px; the Air's window is 1,470, or 1,440 on an M1), then *"Make it fit"*, *"mock up the options"*,
  *"lets see mockups without side boxes"*, and *"Build Option B"* (squeeze, rather than A: fold the text buttons first).
  Mockups: `mockups/toolbar-13in-options.html` (untracked, in the main checkout).
- **Done:** one `@media (max-width:1700px)` block in `src/styles/legacy.css` ("THE LAPTOP TOOLBAR"): `--tb-gap-min` 8 px
  (was 10), 8 px side padding on the view toggle, Shift, Build Around and the page tools, the text style buttons 26 px and
  the size box 58, `.preview-panel` 12 px side padding (was 28). The sidebar, from 1,700 px down, is
  `clamp(280px, min(24vw, 100vw - 1150px), 440px)` (was `clamp(280px, 26vw, 320px)` from 1,280 only): ⭐ ONLY AS NARROW
  AS THE TOOLBAR NEEDS (owner, 20 Nov 2026: *"narrow it only as much as the toolbar needs"*). A first build used a flat
  `20.5vw` up to 1,700 px; the full gate showed it wrapped Production's shoot-days line (`spancounts` M1, N1) at 1,600,
  and the owner had not noticed the sidebar was part of Option B. Now it is exactly as before from 1,513 px up, 320 at
  1,470 (was 353), 290 at 1,440, 280 from 1,430 down. The 1,150 is measured (the line fits at the 8 px minimum gap
  while the sidebar ≤ window − 1,130) plus 20 px for a classic scroll bar and rounding, held in the gaps (10.5 px).
  ⚠️ That line wrapping is not new on a laptop: before this branch it already wrapped at 1,470 and 1,366
  (`spancounts` red there on the old build too); the leg runs at 1,600, where it fits again. `useFixedHeaderWidth` re-measures when
  `matchMedia('(max-width:1700px)')` flips (the Header button's padding changes there; ⛔ keep the two queries equal).
  Above 1,700 px nothing changed.
- **The new ladder** (sideboxes, both views): 0 down to ~1,430, 1 to ~1,275, 2 to ~1,140, 3 to ~1,090, 4 at 960.
  Step 5 (icon-only view toggle) is reached by no window now; `toolbarfit` F6 reaches it with a forced 420 px sidebar.
  From 1,430 to 1,513 the gaps are 10.5 px (the margin above). UI-CONVENTIONS' fold table is updated.
- ⚠️ **The harness's 1,600 px window:** the sidebar is 384 px there again; the grid box is 32 px wider (1,192, the preview's
  12 px side padding). `fence` on the build before and after: every frozen `/waterfall` and month style identical.
  `calzoom` W6 went red on the first build ONLY because a wider box let it pick a cell whose 100% Swap button still
  covered it at 150%: the leg now clears the hover before asking what is on top (green on both builds).
- **Legs:** `toolbarfit` moved to the new widths (F0 also holds 1,470 and 1,440 at level 0; F3 at 1,250 / 1,150; F4 at
  1,250 / 1,150 / 1,100 / 960; F5 at 1,050; F6 at 1,100 and the forced step 5; F7 at 1,250; F9's solved gap from 8
  px): 14/14. `stylebarplace` 15/15, `monthmap` ×3 20/20, `hdrcontrols` 12/12, `calzoom` 26/26, `monthpage` ×3 13/13,
  `laptopfit` ×3 11/11, `spancounts` 10/10, `npm run check` 46/46 (all on the final build).
- **Full gate** (on the FIRST build, 20.5vw; port 8955, 20 Nov 09:55–11:17): 5,920 PASS / 8 FAIL. Each failing leg re-run
  alone on the build before this branch (`2ef16d2`) and on this one: `labelsetup` (halfdays) and `buildaround` (a Chrome
  that sat idle for 13 min) green on both, machine load; ⚠️ **`hidewf` F1 + F3, `phasesui` P1 and `hiatusripple` R0 red
  on BOTH: broken before this branch, not by it** (saved `fields.byId` differs from the fixtures', and R0's switch
  check); `spancounts` M1 + N1 red on this branch only (the 20.5vw sidebar), fixed by "only what it needs" above. No
  second full gate: the final build differs from the gated one only by the sidebar, which is the old width at 1,513 px
  and up (so at the gate's 1,600 px window), and every leg it touched is green on it.
- No What's New entry (a small UI change). README "Unreleased".


### ↕️ 21 Nov 2026: EVERY BAR KIND REORDERS IN THE MONTH VIEW, TANDEM AND PREP INCLUDED — branch `mv-order-all` (worktree `.claude/worktrees/mv-order-all`, from `origin/main` at `a0819c0e`; its `node_modules` is a symlink, unlink it before `git worktree remove`). Committed as `f0ffbc7b` (rebased onto the month holiday editor's Hide Holiday, `21af8e8b`) and LIVE: pushed to `main` on the owner's "Commit and push" after trying it in the pane, deploy run 44930553358 green, the GitHub Pages file is byte-identical to the build (the Cloudflare address is behind the sign-in, not fetched); `mvorderdu` 10/10 and `npm run check` 46/46 re-run on the rebased build. README "Unreleased", What's New `2026-11-21-2`. Tracker card `month-reorder-every-bar`.
- **Owner:** *"Ensure all phases of any type (including sim post, episodic/block prep, and tandem, can be arranged up and
  down in any order in the month view"*.
- **What was already true (checked in the browser on `doubleups`):** Sim Post reorders (SO1, live 11 Nov). Episodic /
  Block Prep reorders too: it is its own segment (`PREP_KEY`, `data-ph="episodePrep"`), so its grip moves every prep bar
  as one row (they stack among themselves by unit order, P5). Only **Tandem** had no grip: `BAR_SEL` excluded
  `[data-du]` on purpose when double-ups were built.
- **As built (no frozen edit):** `installMonthOrderDrag`'s `BAR_SEL` takes every `.mv-pill[data-ph]`, and `barKey`
  maps a Tandem pill through the new `duRidesProduction(schedule, id)` (beside `duLooseRunsForWeek`, the same test):
  - LOOSE (moved, the last unit's, or labelled by Production Week): the double-up segment's own key `DU_KEY`
    (`doubleUp`), already a segment frozen E1 orders, so it is a row like any phase.
  - JOINED (riding its episode's line, R6): `production`, the line it is part of. ⚠️ My call, not ruled: the
    alternative, a joined Tandem leaving its episode's line, would undo the owner's R6.
- Saved as `doubleUp` in `mvPhaseOrder`: no new key, no version bump (the sanitizer already keeps unknown keys).
  `mvOrderIsCustom()` / Back to date order need nothing (segment keys). Help's "What sits on top" paragraph and
  CLAUDE.md's `mvPhaseOrder` row and DU1 note say so.
- **Leg `mvorderdu`** (new, in gate.sh after `mvordersp`; `mvordersp.mjs`'s plumbing, `doubleups`, April 2027): D0-D8,
  E0. Red on `origin/main`'s build (throws at D1: no grip on a Tandem bar).
- **Verified (build `/dist/index.html`, port 8962):** `mvorderdu` 10/10, `mvorder` 31/31, `mvordersp` 11/11, `doubleups`
  live 20/20, doubleups 50/50, doubleups-half 3/3, doubleups-blocks 2/2 (0 console errors each), `npm run check` 46/46;
  in the browser pane on `doubleups` with the real mouse: Prep above Production, Tandem 305 above Shoot 305, Tandem 306
  taking Production below Prep. No full gate: no frozen code, no output moves on a calendar that never reorders.
### 🔤 19 Nov 2026: THE TEMPLATE EDITOR OPENS ON VARIABLES, NOT A MANUAL HEADER'S PLAIN TEXT — committed `5ee3a54e` on `scenario-version-offer`, cherry-picked onto `origin/main` as `a85ca47c` and LIVE: pushed on the owner's picker, deploy green, the GitHub Pages file is byte-identical to the build (the Cloudflare address is behind the sign-in, not fetched). README "Unreleased". Tracker card `template-editor-variables`.
- **Owner:** *"by default when you open the template editor, all the labels of the default auto-header should be the
  dynamic variables as opposed to plain text"*; asked which plain text, picked **"Header was on Manual"**. (From Auto the
  editor already seeded `DEFAULT_HEADER_TEMPLATE`; only "Planning Calendar" and the month's "Full Prelim Production
  Calendar" are literal there, and that was not the ask.)
- **Done:** `hdrAutoLinesAsTokens(lines, mv)` (just above `setHeaderMode()`), called by the Manual -> Template branch of
  `setHeaderMode()` and `setMvHeaderMode()`, so both the editor's way in and the mode menu's Template do it, inside the
  transition's one undo step. A non-empty line becomes an auto line's template when it equals what that template prints
  now, or matches the auto line's SHAPE (`HDR_AUTO_SHAPES` / `MV_HDR_AUTO_SHAPES`: dates, "vN", Writer's Room, the
  production summary and dates, "N Episodes"), checking its own slot first and then every other (a Writer's Room line
  moved to r3 becomes `{writersRoom.line}` there). Titles (c1, the month title) have no shape: exact only, since an
  older title there may be deliberate. Empty stays empty; typed text, unknown tokens and braces stay as typed.
- ⚠️ My call, not ruled: a date-shaped Manual line (e.g. a fixed "11.10.26" typed top left) becomes `{lastEdited}`.
- **Verified:** `hdrtemplate` step 11 (`autoLinesBackAsTokens`, `typedLinesKept`, both new gate.sh checks),
  `hdreditor`, `hdrpreset`, `hdrfile`, `hdrverload` (hdrversion), `hdrcontrols` 12/12, `mvhdroff` 9/9, `seasons` 15/15,
  `lastedited` 22/22, `npm run check` 46/46; in the browser on `hdrversion`: Manual, then 12 episodes and v4, then the
  editor showed every auto line as a variable; hand-typed c1 / c3 / r1 kept; one ⌘Z back to Manual; month view too. No
  full gate: chrome-side header store only, no frozen code, no output changes unless the user switches mode. No What's
  New entry (small).

### 📅 19 Nov 2026: BUILD AROUND'S "ENDS BY" PICKS A FRIDAY (PRODUCTION: ANY WEEKDAY) — branch `endsby-picker` (worktree `.claude/worktrees/endsby-picker`, from `origin/main`; `node_modules` is a symlink, unlink it before `git worktree remove`), LIVE: committed `f33015c` (rebased onto `2ef16d2`, the wrap-picker hint removal: its deletion kept, this `weekday` hint added beside it), pushed to `main` on the owner's "commit and push", deploy run green, the GitHub Pages file carries the new hint (sptcal.pages.dev is behind Access, same run). Owner: *"why can i only select mondays? ... it should be only fridays except for production which should be any weekday"*. Chrome only: `fieldKind()` in `src/chrome/DatePop.jsx` read `#tool-solve-date` by the start's rule on both edges. Now on `tool-solve-edge` = end: `friday` for a phase whose `phaseSnapped()` is true (Snap on, or Ends), `weekday` (new kind, weekends greyed) for Production and Days / Dates / unsnapped phases. The engine is untouched (it already took any date as the deadline). ⚠️ Shift's To a date "ends by" is still `day` (any day, weekends too): the owner asked about Build Around only. Legs `datepick` 21/21 (E1-E4 new), `buildendsby`, `buildaround`; `npm run check` 46/46. What's New `2026-11-19-3`. README "Unreleased". Tracker card `build-around-endsby-picker`.

### ✂️ 19 Nov 2026: THE WRAP-DATE PICKER'S "ONLY SHOOT DAYS" LINE IS GONE — committed `b7c3b6f` on `scenario-version-offer`, cherry-picked onto `origin/main` as `2ef16d2` and LIVE: pushed on the owner's picker, deploy green, the GitHub Pages file is byte-identical to the build (the Cloudflare address is behind the sign-in, not fetched). Tracker card `wrap-picker-hint-removed`
- **Owner:** *"delete: the shoot wraps on a shoot day, so only shoot days can be picked."*
- **Done:** the `kind === 'wrap'` hint in `src/chrome/DatePop.jsx` is deleted; the picker still greys every non-shoot
  day. The Monday / Friday / hiatus hints stay. Leg `prodends` E5 now expects no `.dp-hint`.
- **Verified:** `npm run check` 46/46, `prodends` 8/8 on `/dist/index.html`. No full gate (chrome text only). No What's
  New entry (a small UI change).

### 🇺🇸 19 Nov 2026: "COLOUR" READS "COLOR" IN THE APP — `d777f66` on `scenario-version-offer`, cherry-picked onto `origin/main` as `22551d6` and LIVE: pushed on the owner's picker; the push's Pages step failed twice on GitHub's side ("Fetching artifact metadata failed", then "Multiple artifacts" on a re-run of the job: never re-run just that job), so it went out through "Build and deploy" with deploy=true, and the live file is byte-identical to the build (owner: *"Change "Colour" in all places to "Color""*). Every USER-VISIBLE spelling (tooltips, aria-labels, the note editors' Color row and hints, Reset Notes questions, Paste notes' hint and error, toolbar tooltips, the Holidays hint, the Help window) in `src/legacy/app.js`, `src/index.html`, `Sidebar.jsx`, `Header.jsx`, `PreviewToolbar.jsx`. ⛔ Code names, CSS classes (`note-colour-*`), comments, docs and saved keys keep "colour" on purpose: renaming them moves leg selectors and risks the save format for no user gain. New user-facing copy says "color". Legs `notelook`, `hiatuscolour`, `notesreset` updated. README "Unreleased". Tracker card `color-spelling`.

### 🗓️ 19 Nov 2026: THE NOTE EDITOR'S DAY DEFAULT READS "Default (Monday)" — branch `note-day-default-label` (worktree `.claude/worktrees/note-day-default-label`, from `origin/main` `9a71d11`), owner tried it on localhost, then *"Finish it"*, then the picker *"Push to main"*: LIVE, `a3b3da2` + `a881295` fast-forwarded onto `main`. Its own deploy run failed twice in GitHub's Pages step (no `github-pages` artifact, then two on the re-run: the same failure `1afc25b` and `22551d6` hit that evening); it went live with the next push's manual (`workflow_dispatch`) run from `22551d6`, live build `1bbc2e936e61`. ⚠️ A re-run of a failed push run does NOT fix that failure; a fresh `workflow_dispatch` run did. Then the Help overlay's "Leave it on “No date”" sentence (`src/index.html`), missed in the first push, fixed as `b78fad1`. README "Unreleased". Tracker card `note-day-default-rename`. Supersedes the 17 Nov "No date" label (entry below, `note-day-default-no-date`).
- **Owner:** *"Putting "No Date" as default selection in waterfall might not make sense as even tho there is no typed
  date, it still is on monday when you go to the month view"*; then, after weighing "Default - Mon xx/xx/xx" with the Mon
  entry removed, *"What about "Default (Monday)" and then keep Mon xx/xx/xx"*.
- **As built** (`src/legacy/app.js`, the waterfall note editor; no frozen code, nothing saved): the Day list's empty
  choice is `dayDefaultLabel(link key)`: "Default (Monday)" on the week, and on a note that stays with a phase
  "Default (<weekday>)" for the day it is drawn on, from `phaseNoteDefaultDay(key, currentSchedule)`. `reflectLinkRow`
  relabels it when Stays with changes. `phaseWeekFirstDay(seg, week, hiatuses)` is `placePhaseNotes()`'s old inline
  first-day loop, moved out unchanged so the label and the placement share one rule.
- ⛔ **Keep the "Mon 7/6/26" entry.** It is NOT the default: picking it stamps the date into the note, holds the note on
  that date when the calendar shifts (a pin), and on a linked note fixes `dow`. Removing it (the owner's first idea) would
  have left Monday reachable only by typing the date.
- **Proof:** `phaselink` 15/15 (R1 re-expected; new R1b: Labor Day week 9/7/26, Stays with Production reads
  "Default (Tuesday)", the first shoot day), `notedates` 18/18 (N0 re-expected), `phasenotes` 21/21, `phasemonth` 21/21
  (the refactor), `npm run check` 46/46. No full gate: no output reads the label, and the placement rule is moved, not
  changed.

### 🧵 19 Nov 2026: THE WATERFALL HEADINGS' TOP LINE NO LONGER SPLITS AFTER A SCROLL — committed `5c31a38` on `scenario-version-offer`, cherry-picked onto `origin/main` (v1.23.0) as `9a71d11` and LIVE: pushed on the owner's picker *"Merge and push"*, deploy green, the GitHub Pages file carries the strip (the Cloudflare address is behind the sign-in, not fetched). ⚠️ This branch still lacks `origin/main` (v1.23.0 and `9a71d11`): merge it before the next push. The CSS is one `@media screen` block after the heading hover rule in `src/styles/legacy.css`. README "Unreleased". Tracker card `waterfall-header-double-line`.
- **Owner:** *"when i first launch the app i see the solid black line but when i scroll down and then scroll back up, the
  line is now this double line"*; then *"Yes, fix it"* to a screen-only frozen-surface edit.
- **Cause:** the line is the table's collapsed `tr:first-child th{border-top:2px}` plus the sticky `th`'s
  `inset 0 2px 0` shadow. After a scroll Chrome composites the sticky row and rounds its layer's offset separately, so at
  a fractional grid position (163.64 px and the like, common at any zoom) the row sits one device pixel low and the
  table's white shows between the two rules: 3 dark, 1 white, 3 dark device pixels in the owner's screenshot.
- **Fix:** `#table-wrap table.sheet-table{ background-image: ink, 100% × 4px, no-repeat }` in screen media. The strip
  is under the heading row (border + shadow rows), so it shows only where a shifted row uncovers it.
- ⚠️ **What did NOT work, so nobody retries it:** making the cell draw the whole line (border transparent + an outer
  `0 -1px` shadow, or a background strip on the `th`). In collapsed-border mode the cell paints nothing outside its
  padding box and Chrome draws no outer shadow for it (a `0 -6px 0 red` test painted nothing), so the border region
  went white.
- **How to reproduce the seam on demand:** inject `#table-wrap table.sheet-table th{will-change:transform}` and set the
  calendar zoom to 1.9 (`sptcal-zoom` event): row 15 of a crop at the heading's top edge goes light. The browser pane's
  screenshots are scaled, so read pixels from the saved crop with PIL rather than by eye.
- **Verified:** that repro shows the seam without the strip and none with it; the line at rest and the stuck row look as
  before; `npm run check` 46/46; against `/dist/index.html`, `base` (clipped 0 / 2, as its baseline), `calzoom` 26/26
  (needs `HARNESS_STATE=mvnotes`, 300 s), `hdrrow` 40/40 (400 s). CLAUDE.md lists it as the ninth exception. No full gate: no output
  reads CSS, and nothing in `#print-root` matches.

### 🏷️ 19 Nov 2026: v1.23.0 CUT AND LIVE — owner: *"Yes, cut v1.23.0"* (so every installed copy sees the blue bar: the build before the bar-and-What's-New release reads version numbers only, and that release went out as 1.22.1). Tracker card `whats-new-dialog`.
- Carries everything "Unreleased" since v1.22.1: new notes stay with their phase week, the update bar on every update +
  What's New, "Final Delivery", the scenario-tab drop line, the hover-only Notes "+", the week-count prompt on Enter.
- ⚠️ **What's New's entry is `2026-11-19-2`** (version 1.23.0), replacing `2026-11-19` (live under an hour), which lacked
  "New notes stay with their phase" (pushed by another session just before). The window now shows "Version 1.23.0 ·
  19 Nov 2026". Machines that saw the old entry see the new one once more, by design.
- Checked: `npm run check` 46/46, `whatsnew` 12/12, `releases/v1.23.0.html` cmp-identical, fixture
  `v1.23.0-saved.sptcal` (mintfixture: 46 keys, 77 ids, only `lastEdited` differs from v1.22.1's). No full gate (version
  strings and the list only).

### 🔨 19 Nov 2026: THE WATERFALL'S NOTES "+" SHOWS ONLY ON HOVER — BUILT; owner tried it on localhost and said "finish it"; targeted legs, NOT a full gate; owner's picker *"Merge into main and push"*: `origin/main` (`e53e38b`) merged in as `0fcd9bc` (README, HANDOFF and gate.sh conflicts: both sides kept), PUSHED to `main`; deploy run green, the rule seen in the GitHub Pages copy. Branch `note-plus-hover` (worktree `.claude/worktrees/note-plus-hover`, from `origin/main` `2215aa5`; `node_modules` is a symlink, unlink it before `git worktree remove`). Tracker card `waterfall-note-plus-hover`.
- **Owner:** *"What if the plus symbol only appears in the notes collumn of the waterfall when you hover over it - similar
  to how it works in the month view"*, then *"Yes, build it"*, *"finish it"*.
- **As built:** two ADDED rules in `legacy.css`, right under the two frozen `td.sheet-note-cell .note-add-hint` rules
  (which are untouched): `#table-wrap td.sheet-note-cell .note-add-hint{opacity:0; transition:opacity .12s}` and
  `#table-wrap td.sheet-note-cell:hover .note-add-hint{opacity:1}`. Opacity only, so no box moves (leg G1 measures it);
  the `+` keeps its frozen #ccc / 11 px, and its frozen hover colour #b39ddb is what shows. `#print-root` already hid it.
  No `@media screen` wrapper on purpose: `#table-wrap` is not in any print document, and a new `@media screen` block
  risks the build merging it with a neighbour (the Soft Lines trap).
- ⚠️ **Cell, not row.** The month view lights every day's `+` faintly across the hovered week. The waterfall's `<tr>`
  runs across every year block, so a row glow would light other years' weeks; the owner was told and kept the cell.
- **Leg `noteplushover`** (in `gate.sh`'s run.sh list): H0 rules present, H1 every hint opacity 0 at rest, H2 the hover
  rule reaches every hint (a page cannot hover itself, so it reads the rule), H3 frozen look kept, G1 paint only, P1
  print hides it, E0. Red on H0-H2 with `origin/main`'s CSS.
- **Verified:** `npm run check` 43/43; `noteplushover` 7/7; `softlines` 6/6 (dayoverrides) and 6/6 (halfmarks), `notelook` 13/13, `wfnoteeditor` 14/14, `noteviews` 15/15, `textfit` g=small 5/5 and g=wf 2/2, `forcedcolors` (control) 7/7; browser (fixture `carry-rich`, 45 empty
  cells hidden, the hovered one shown, double-click opens the editor). Not a full gate: the change is opacity only and
  the gate measures boxes and exports, neither of which it can move.
- **Merged build re-checked:** `npm run check` 43/43, `noteplushover` 7/7, main's `weekprompt` 8/8 and `finishbefore`
  16/16, `wfnoteeditor` 14/14. No version cut. Local `main` NOT moved.
- **Next:** nothing. Once nothing else needs the worktree: unlink `node_modules`, then `git worktree remove`.

### 🤫 19 Nov 2026: "ENTER A WEEK COUNT TO INCLUDE THIS PHASE" WAITS TO BE ASKED FOR — committed `8a21a59` on `scenario-version-offer` (its hunks only; the What's New work stays uncommitted), `origin/main` (`2215aa5`, notes follow their phase week) merged in a temp worktree as `e53e38b`, LIVE: pushed to `main` on the owner's picker, deploy green, the live file carries `.phase-meta.phase-meta.is-quiet`. ⚠️ This checkout's branch does NOT have `e53e38b` yet (the dirty tree overlaps it): merge `origin/main` before the next push. README "Unreleased". Tracker card `week-count-prompt-on-enter`.
- **Owner:** *"this message should only show up when someone clicks enter (even tho i know the app doesn't need enter to
  be clicked) or when they click the start after or finish before buttons"*.
- **Done:** frozen `render()` still writes the red line the moment a Weeks card has a start and no length; it is HIDDEN
  from outside (`reflectWeekCountPrompt()`, beside `reflectProductionMissing()`, run by the same `metaObserver`;
  sanctioned pattern 3) by the class `is-quiet` (`legacy.css`, `.phase-meta.phase-meta.is-quiet`, doubled to beat the
  custom header's `display`). Enter in any box of the card, or a click on its ↳ Start after / ↳ Finish before, ARMS it
  (`weekPromptArmed`, session only, never saved); it lapses the moment the line says anything else, so the next start
  typed waits again. Only that sentence, word for word: Production's line, "of 1 or more" (a 0 typed), the start-date
  prompt and a Days / Dates card's own line are untouched. Nothing frozen edited, nothing saved.
- ⚠️ **Finish before on an EMPTY Weeks card (R5) leaves the frozen line BLANK** (on Ends, an end, no length: render()
  asks for a length only beside a start), so an armed card WRITES the prompt there itself, in red, and puts it back
  after every render. ⛔ The arming click listener runs AFTER the button's own handler (bubble, registered later on
  `#phase-rows`): armed first, it read the empty card's old blank line as "something else" and lapsed at once.
- **Legs:** new `weekprompt` 8/8 (P1-P7, E0; in gate.sh after `finishbefore`), `finishbefore` 16/16, `npm run check`
  46/46. Not tried in the browser pane (all five server slots held by other chats); the leg drives the real build.

### 🆕 19 Nov 2026: THE UPDATE BAR ON EVERY RELEASE + A "WHAT'S NEW" WINDOW — on `scenario-version-offer`, LIVE: `240589f` on `main` (cherry-picked onto origin/main from `9ba2ac5`), pushed on the owner's picker, deploy green, the live file and `version.json` carry build `4b46fbbf27cd`. README "Unreleased"; CLAUDE.md's release rules gain the What's New step; leg `whatsnew` (12/12, in gate.sh's loop). Tracker card `whats-new-dialog`.
- **Owner:** *"Whenever theres a new update to the app, lets add the blue update bar to the top as we've done previously.
  When a new update launches lets add a quick dialogue that explains what new features/updates were added. But only for
  things the user would actually care about - small UI changes, tiny bug fixes (not major ones), and anything behind the
  scenes, don't tell the user. For real substantial changes, give a list of the changes just like a real app would"*.
- ⚠️ **Why the bar had gone quiet:** it compared VERSION NUMBERS only, and most pushes since v1.22.1 went live as
  "Unreleased" with `APP_VERSION` unchanged, so no user was told.
- **The bar (build stamp):** `tools/build-stamp.mjs` (a Vite plugin, last in `vite.config.js`) hashes the finished
  `dist/index.html` and writes the first 12 hex digits into `<meta name="sptcal-build">` (placeholder `dev` in
  `src/index.html`) and into `dist/version.json` = `{version, build}`. The engine's update check shows the bar when the
  live version is newer OR the stamp differs (never when the live version is OLDER: a rollback; never for `dev` or a
  marker with no stamp). Text: "An update to SPTCal is available. Reload to get it…" (a new number is named). A
  docs/tests-only push builds the same bytes and the same stamp (checked: two builds, one stamp), so it shows nothing.
  ⛔ `deploy.yml`'s "Include version.json" step (`cp version.json dist/`) is GONE: it would overwrite the stamp. The
  root `version.json` still holds the version and `check-build` still holds it to package.json and APP_VERSION.
- **What's New:** `src/whats-new.js` (the list, newest first, with the in/out rule in its header) and
  `src/chrome/WhatsNewDialog.jsx`. Once per machine per entry: `localStorage 'sptcal.whatsNew'` = the newest id seen.
  A release with no entry shows no window. A machine with no key (everyone, the first time) sees the newest entry only
  if the bar's Reload was pressed (`sptcal.updating`, set by the engine) or `sptcal.prefs` exists; a first-ever launch
  stays quiet. ⭐ **It comes BEFORE the "Recover unsaved work" question** (owner, 19 Nov 2026, then *"Good"* on seeing
  it): the launch's list is decided once while the chrome first renders, and `offerBackupRecovery()` awaits
  `chrome.whatsNewDone()` (settles when the window closes, at once with nothing to show, or after ~75 s if it never
  could show), placed BEFORE its `fileLaunchSeen` check so a double-clicked file still outranks the question. Seen in
  the browser: What's New, Got it, then Recover. ⚠️ Testing it: two Cancels on a recovery stop the launch asking
  (`backupAskable`), so make a fresh backup (type a title, wait, reload) to see the order again.
  Deployed app (https) only; on localhost `?whatsnew=1` previews the newest entry (writes nothing), `?whatsnew=live`
  runs the real rule. The version under the SPTCal name is now a button that reopens it (`chrome.whatsNew`).
- **The first entry (19 Nov 2026), for the owner to edit:** scenario tabs show their version; Tandem days in Show info;
  Finish before on an empty card; zoom just the calendar; "Final Delivery". Left out as small: the drag line, "+
  Duplicate", the far-right tab, the grey prompt, the field order, Reset hiatus bands' removal.
- **Checked:** `npm run check` 46/46 (3 new: the stamp, dist/version.json agrees, entry ids); `cfmove` 9/9;
  `cspproof` 15/15; in the browser: the bar with a faked new stamp, Reload → What's New once, not again on the next
  launch, quiet for a first-time user, the version label reopens it, preview writes nothing.
- **Leg `whatsnew`** (six launches, the backupdecline reload pattern; fakes the engine's `version.json` fetch): W0-W7,
  U1-U4; 9 of 12 red on `releases/v1.22.1.html`. ⚠️ Two harness traps learned: lib.js writes `sptcal.prefs` at the top
  of EVERY leg page (Ripple Hiatus off), so a leg playing a first-ever launch must delete it in its synchronous top
  block; and `location.reload` cannot be stubbed in Chrome (unforgeable), so U4 lets the bar's Reload really reload.
- ⚠️ **Old copies don't see this release's bar:** a machine still running the build BEFORE this one has the old check
  (version numbers only), and this shipped as 1.22.1, so its bar waits for a version cut or the user's next relaunch.
  From this build on, every release shows it.
- ⛔ **For every later session:** a release users would care about adds an entry to `src/whats-new.js` (CLAUDE.md's
  changelog rules say what qualifies). The bar needs nothing.

### 🎬 19 Nov 2026: PRODUCER'S CUT 1, 6 WEEKS AFTER EACH EPISODE WRAPS — PLANNED, nothing built: `PRODUCERS-CUT-PLAN.md`, ⛔ LOCAL ONLY (owner, 19 Nov 2026: *"dont push the plan to git, keep it local"*; listed in `.git/info/exclude`, so it is in the main checkout only and a worktree will not have it: copy it in by hand). Tracker card `post-milestones`.
- **The ask:** the executives' review (17 Nov) wanted the first cut on the calendar (typed by hand at Production week 12
  so far). The post executive's answer (19 Nov): on average 6 weeks from the completion of filming of an episode or
  block to the first studio cut, counted from the unit's OWN wrap, not from the Post phase (confirmed with the owner).
  Wording (owner): "101 Producer's Cut 1 to <studio>".
- **The plan's rulings** (owner: *"write the plan with your recommendations"*): one automatic note per episode or
  block; wrap includes the unit's Tandem days; 6 working weeks (all-phase hiatus days not counted, a holiday or weekend
  landing moves to the next working day); the number is the calendar's, default 6; off on saved calendars, on for New;
  no frozen edit, no baseline moves.
- **R1, settled (owner's picker, 19 Nov 2026):** the default text is the owner's wording exactly, studio initials
  included, although the repo is still public. Next: build it on its own branch.
- ⚠️ **Learned:** every automatic-note kind was one note per calendar, and its name, Delete, drag and
  `followLineId()` (`'k:' + kind`) all assume it. This kind is one per unit, so the plan gives each a per-unit answer.

### ✅ 19 Nov 2026: "FINAL DELIVERY" STARTS ON FOR NEW CALENDARS — committed `7b961fe` on `scenario-version-offer`, cherry-picked onto `origin/main` as `c90c43b` with the What's New line (`2026-11-19-4`), LIVE: pushed on the owner's picker ("Push it"; scope "New calendars only"), deploy green, the live file carries `finalDeliveryTest` and `2026-11-19-4`. ⚠️ `main`'s own copy of this entry still says "committed locally, NOT pushed". README "Unreleased". Tracker card `final-delivery-default-on`.
- **Owner:** *"Final Delivery note should be enabled by default"*.
- **As built:** `newCalendarAutoNotesOn()` (beside `AUTO_NOTE_OPT_IN`) returns `{postEnd: true}`; the boot sets
  `autoNotesOn` from it just before `restoreSavedState()`, and `resetAll()` (New, Reset All) does the same. colReuse's
  pattern: only a NEW calendar starts ticked.
- ⛔ **Saved calendars do not change** (my call, not ruled): `postEnd` stays in the opt-in store, and an absent
  `autoNotesOn` still restores as none, so every file saved before today (and any saved with it unticked) opens with the
  note off and its exports unchanged. If the owner wants it on in OLD calendars too, that is a different change: those
  files' Notes columns and exports would move on their next open, and gates 1-3 / 10 / 13 would need re-cutting only if
  the reference calendar is changed to show it.
- ⚠️ **Harness:** every leg builds on a new calendar, so `t/lib.js` sets localhost-only `sptcal.finalDeliveryTest = 'off'`
  before the app boots (the hiatus ripple's pattern); the reference calendar and every baseline are untouched.
  `t/finaldelivery.js` removes the key to test the users' default. An `.mjs` driver without lib.js that dates Post on a
  NEW page would now see the note: none does today (hiatusdrag / hiatusripple load `?state=` fixtures, which reset it).
- What's New: added on `main` only (`2026-11-19-4`), since `main`'s `whats-new.js` is ahead of this branch's.
- **Legs (build):** `finaldelivery` 4/4, `autonotephases` 27/27, `autonoteview` 18/18 and `autonoterename` 25/25
  (`HARNESS_STATE=autonoterename`), `autonote` 9/9 (`HARNESS_STATE=v1.3.0-saved`), `autonotekinds` 16/16, `loadsparse`
  8/8, `firstrun` 22/22, `noresetall` 5/5, `npm run check` 46/46. No full gate: nothing frozen, no saved key added.

### ✅ 19 Nov 2026: A NEW NOTE STAYS WITH ITS PHASE WEEK BY DEFAULT — BUILT; owner said "Finish it"; ✅ FULL GATE GREEN (every failure load, green alone); owner's pickers *"Commit on the branch"*, *"Merge into main and push"*: committed `df1a209`, `origin/main` (`2b77e98`) merged in as `ccce702`, ✅ **LIVE at `2215aa5`** (pushed from the branch `2b77e98..2215aa5` at 12:52:30 19 Nov 2026; "Build and deploy" succeeded at 12:53:28; the live GitHub Pages `index.html` matched the local build `35999a1e…` byte for byte at 12:53:31; `sptcal.pages.dev` answered with its Access sign-in). Branch `notes-follow-phase` (worktree `.claude/worktrees/notes-follow-phase`, from `origin/main` `1b45340`; `node_modules` is a symlink, unlink it before `git worktree remove`). Tracker card `notes-default-stay-with-phase`.
- **Owner:** *"New default, notes should stay with their specifc phase week and not the specific actual week"*. Pickers:
  which phase in a shared week = **First in the list** (`wfLinkOptions[0]`, the row's left-most phase cell); saved notes
  = **Leave them on their week**; **Yes, both editors**; **Yes, pasted notes too**.
- **As built (`src/legacy/app.js`, no frozen code, no save-format change):**
  - Waterfall editor: `link.init` is the row's STARTING choice; `link.sel0` still says what the cell holds ('' = the
    week). A cell with no note of the user's (`wfCellHasOwnLines` false: no line beyond its automatic text, no linked
    note) starts on `opts[0]`, so a save with the row untouched takes commit's "changed" branch and links the typed lines.
    ⛔ A HIDDEN row (a rename of the cell's one automatic note, a box of other notes' lines) counts as no choice
    (`linkRowShown`): its select can sit on a phase while hidden.
  - ⭐ `preEdits`: in that "changed" branch, `wfLineEdits` now runs on the WHOLE box first, so an automatic line renamed
    or taken out in the same save as a new line is a rename/hide, never swept into the linked note's text (it was, for a
    phase picked by hand too). The week's own save then skips `wfLineEdits`.
  - Month editor: `linkInit` = `linkOpts[0]` for a NEW day note (`kind === 'day'`, `editIdx === null`); `linkSel0` stays ''.
  - Paste (`wfNotesPaste`): a cell with no note of the user's before the paste gets `wfLinkNewNote(wk)` after
    `wfPutNote`: the week's typed lines become ONE linked note at `opts[0]` (look, Day → `dow`, "Show in month view"),
    automatic lines stay the week's. Drag is NOT changed (it moves an existing note).
  - Month-view paste (owner, same day: *"do it also for pasted month notes"*): `mvLinkPastedNote(iso, e)` links each
    note ⌘V (`mvNotesPaste`) or the Paste notes… box (`addPastedNotes`) adds to `mvLinkOptions(iso)[0]` through
    `addPhaseNote` (dow, `sheetHidden: true`, colour; fmt / place via `carryDayNoteLook`), joined to a note already at that
    link; a day with no phase keeps a day note. ⌘V's highlight picks only the day notes it wrote. The 10-line door still
    counts on a trial `dayNotes` list (a linked note is a line too, so the count is unchanged).
- ⭐ **Month-only linked notes are drawn WITHOUT their date** (owner's picker *"Drop the date"*, asked once every new Month
  note linked by default): `placePhaseNotes` appends " m/d/yy" only when `v.sheetHidden !== true`. `dated` / `dayIso`
  are unchanged, and every waterfall reader filters sheetHidden notes out (`wfLinkedLinesFor`), so only the month view
  (and both month PDFs, which parse it) change. Turning "Show in waterfall" on brings the date back in both views.
- ⛔ **ONLY A FREE PHASE WEEK (`newNoteLinkKey`, found by the first full gate's `mvnotes` V4):** a phase week holds ONE
  linked note (`<phase>@<n>`, a permanent key shape), so a second note linked there JOINED the first: it took the first
  one's day and colour (five notes pasted Mon-Fri of one prep week became one note on Monday), and a Waterfall note typed
  over a Month-only note's phase week vanished into it (`sheetHidden`). So a new note starts on the first phase ONLY while
  that link holds no note; otherwise it starts on "Week of …" / "This day", and nothing is ever joined. Both editors, both
  pastes. Production's shoot days are keyed per day, so on a shoot day only a note on that same day is affected. ⚠️ Owner
  told: the second note of a prep week stays on its day; making every note follow needs a new key shape (a save-format
  change, a ruling).
- ⭐ **Case 3, one cell one home for an ADDED line** (owner, 20 Nov 2026, after the worked example: *"yeah do the case 3
  thing"*): in `commitActiveNoteEditor`'s unchanged branch, when the editor opened on the cell's ONE linked note
  (`sel0`), a line left over after `wfLinkedLineEdits` that is not an automatic line JOINS that note (`preEdits` first,
  so an automatic rename stays a rename); the Day stamp comes off it. Until now it became the week's own text, and the
  next phase move split the cell in two. `notephase` C3 (+ M1 moves both).
- `data-new-note` on the Stays with select marks a row that started on a phase; only `t/lib.js` reads it.
- **Proof:** `notephase` 17/17 (W1-W7, C3, P1, M1, Q1-Q3, N1, N1D, N2, E0; fixture `phasenotes`), in `gate.sh` after
  `notedates`. ⭐ `t/lib.js` now picks "Week of …" / "This day" the moment an editor opens on a NEW note
  (`select[data-new-note]`, a MutationObserver) in every leg but `notephase` / `phasemonth`
  (`window.__keepNewNoteDefault`), the ripple switch-off's pattern. ⚠️ An observer is a microtask: a leg that opens a "+"
  and saves in the same synchronous step gets the default anyway, so `regionlock` L1, `mvmenu` V6 and `mvkeysreal`
  (no lib.js) pick This day themselves. `T.typeUserNote`, `notedates`, `mvkeys` openPlus, `phasemonth` B2 do too.
  Paste has no such choice; re-expected to the ruled behaviour: `mvkeys` / `mvkeysreal` / `monthrowlimit` read a day's
  day + wf blocks; `mvnotes` V4/V5 read dayNotes or phaseNotes; `phasekeys` X1/C4, `autonoterename` P1, `wfkeys`
  C6/C13 expect the pasted note linked. `phasemonth` P3/E2/E4 re-expected without the date.
- **First full gate** (port 8627, 19 Nov 2026, ~9.5 h under a load of ~30): 5,804 PASS / 66 FAIL, EVERY BASELINE
  IDENTICAL (waterfall PDF, workbook, restore, gate 10, gate 13). The 66: the re-premises above, plus `nofsa`,
  `regioncaveat`, `noswapbtns`, `hostile` S2, `numclamp` N4, `wfmenu` (load: all green alone). Every flagged leg green
  alone after the fixes.
- **Final full gate** (port 8627, on the final build, case 3 included; ended 12:40 19 Nov 2026): 5,888 PASS / 21 FAIL,
  EVERY BASELINE IDENTICAL again, `notephase` 17/17 inside it. The 21, each re-run ALONE on the same build and green:
  `pilllabel` blocks + blocksoff (gate's own checker, 0 FAIL), `hdrrow` 40/40, `caholidays` 11/11 and `offweek` 42/42
  (the file-menu load timeout), `mvhdroff` 9/9, `mvbarsize` mvnotes 13/13, `monthexport` mvheader 9/9 and monthnotes
  9/9 (whose missing PDF is gate 13's one red line).
- **Merged build re-checked** (no second full gate: the merged commits were live and gated): `npm run check` 43/43;
  `notephase` 17/17, `phasenotes` 21/21, `phaselink` 14/14, `phasekeys` 18/18, `phaselook` 10/10, `notedates` 18/18,
  `wfnoteeditor` 14/14, `noteviews` 15/15, `mvnotes` 14/14, `wfkeys` 84/84, and main's `finishbefore` 16/16,
  `scenversion` 11/11, `autonotephases` 27/27. Merge conflicts: Help (main removed the "Reset hiatus bands" sentence
  from the paragraph this branch rewrote), README and HANDOFF (both sides' entries kept). No version cut. Local `main`
  NOT moved.
### 📦 19 Nov 2026: POST'S END NOTE READS "FINAL DELIVERY 9/22/28" — on `scenario-version-offer` (`2b77e98`), LIVE: pushed to `main` on the owner's "Yes, push it", deploy green, the live file carries `text:`Final Delivery``. README "Unreleased". Tracker card `post-end-final-delivery`.
- **Owner:** *"the auto note for the final friday of the last week of post production should be changed to "Final
  Delivery 9/22/28" - where 9/22/28 is the friday date"*.
- **As built:** `AUTO_NOTE_PHASE_EDGES`' `postEnd` entry carries `text:'Final Delivery'` (Writer's Room Closes' pattern),
  so `computeSchedule` labels it so and `autoNoteLine` adds the date. The day was already right: `drawn()` from Post's
  end backwards, the last day its month bar is drawn (the Friday of its last week, earlier if a holiday or hiatus takes
  that Friday). The card's word for that box is "Final Delivery" (`autoNoteCardPhases`), so its tooltip / aria-label
  read "Post Final Delivery, Waterfall".
- ⚠️ **Fixed wording: it no longer follows a renamed Post** ("Edit Ends" before; `autonotephases` P9 re-expected). A name
  typed for the note itself (`autoNoteNames.postEnd`) still wins. Still opt-in (off until ticked); kind word unchanged.
- ⚠️ A typed waterfall note saved with "Post Ends …" in it keeps that text (it is the user's text now); the month view's
  place for that line (`mvWfNotePlace`, keyed by text) does not carry to the new words. Not handled; no one asked.
- **Legs (build, `HARNESS_STATE=autonoterename` for the two that need it):** `autonotephases` 27/27, `autonoteview`
  18/18, `autonoterename` 25/25, `autonotekinds` 11/11, `npm run check` 43/43. No full gate: nothing frozen, nothing
  saved changes (the note text reaches Excel and the PDFs through the schedule, as every renamed note does).

### ↔️ 19 Nov 2026: A DROP LINE BETWEEN SCENARIO TABS WHILE ONE IS DRAGGED — on `scenario-version-offer` (`684e722`), LIVE: pushed on the owner's picker, deploy green, the live file carries `drop-before`. README "Unreleased". Tracker card `scenario-drag-marker`.
- **Owner:** *"there should be little markers between scenario tabs that appear when you drag to rearrange the scenarios
  so you know where they are going to drop"*. Tried on localhost: *"Yes, finish it"*.
- **As built** (`ScenarioTabs.jsx`, `gap` state, `slotAt` / `moves` / `markOf`; CSS `.sc-tab.drop-before` /
  `.drop-after` beside `.sc-tab.is-dragging`): the drop target is now `.sc-tabs` itself, not each tab. The slot is the
  count of tabs whose middle is left of the pointer; the move sends `to: slot > from ? slot - 1 : slot`. A slot either
  side of the dragged tab shows no line and drops nothing. The line is a 2 px `::before` / `::after` inside the tab's box
  (the strip's `overflow-x:auto` clips anything outside it, so the first tab's line sits on its own edge, `left:0`).
- ⚠️ Changed behaviour: before, dropping ON tab i always sent `to: i` (so a drop on either half did the same); now the
  half matters. No leg had driven the drag before; `scenversion` V10 does now, with `DragEvent`s sharing one
  `DataTransfer`.
- **Legs:** `scenversion` 11/11, `scenarios` 23/23, `scenlist` (rtleg) 9/9, `npm run check` 43/43. No full gate
  (chrome only, nothing frozen, no saved key).

### 🗑️ 19 Nov 2026: "RESET HIATUS BANDS" REMOVED — on `scenario-version-offer` (`ccfa8e7`), LIVE: pushed on the owner's picker, deploy green, the live file has no button, host or Help mention. README "Unreleased". Tracker card `hiatus-reset-full-width`.
- **Owner** first asked for the button to span the sidebar like + Add hiatus period (done, then dropped), then asked
  whether it was needed at all. Analysis given: it reset only the bands' LOOK (label, colour, size, text styles, month
  band styles; all-phase and per-phase), never a hiatus, yet read as if it cleared the hiatuses; Undo, the card's name box
  and colour square, the text bar and New cover every case. **Ruling: *"Yes, remove it"*.**
- ⚠️ The one thing only it did: put a band typed by hand (before 4 Nov 2026, in an older file) back under its row's
  name. Typing the name on the hiatus's card already takes such a week over (`claimBandNames` / `claimHiatusRowNames`),
  so nothing is stranded; `hdrcontrols` N4 now holds that path instead.
- **Gone:** `HiatusResetButton` (Sidebar.jsx), its portal (main.jsx), `#hiatus-reset-host` (index.html) and its place in
  `buildSavedHtml()`'s emptied hosts, `resetHiatusBands()` and its branch of the delegated reset click (app.js), and the
  two Help mentions. Nothing saved changes; nothing frozen.
- **Legs:** `hdrcontrols` N4 rewritten (no button, the card ends with + Add hiatus period, naming the row takes over both
  weeks) 12/12; `phiatusnum` H11 without the reset step 18/18; `sharecopy2` (the host must be absent, 0 buttons) passes.
  ⚠️ sharecopy2's copy carries the leg's own script, so its pattern is built from pieces (`'<' + 'div id="hiatus-' + …`):
  a literal matched itself, and a literal `<div` also fed the leg's `inert=""` check. `npm run check` 43/43.

### 🏷️ 19 Nov 2026: THE SCENARIO "+" SAYS WHICH TAB IT COPIES ("+ Duplicate Scenario B") — shipped in v1.22.1 on the owner's "Yes, ship it". README v1.22.1. Tracker card `scenario-plus-which-tab`.
- **Owner** asked whether "+" should copy the right-most tab (earlier ones from the caret menu) and whether a copy of B
  beside C v3 / D v4 should be offered v5. Analysis given in chat: it already offers the highest + 1 (v5), the caret menu
  already has Duplicate, and a "+" that copies a tab you are not looking at fails silently. **Ruling: "+" keeps copying
  the tab on screen**; the owner took the one addition, *"Yes, add the name"*.
- ⚠️ **It shipped first as a TOOLTIP (`590fd5b`) and that was a misreading:** *"i thought the button was going to
  dynamically change and have text, not just a hover text"*. Now a Mantine `Button` (subtle, gray, compact-xs, like the
  one-tab "+ Scenario") reading "Duplicate <tab on screen>" (`curName` in `ScenarioTabs.jsx`); the name in
  `.sc-add-name`, cut with "…" at 120 px (`legacy.css`, beside `.sc-tabs`); `title` keeps the whole name. ⛔ Its
  `aria-label` stays "Duplicate this scenario": `scenarios` and `scenversion` find the button by it.
- It is wider than the old "+" (about 200 px with a long name), so the tabs get less room before the strip scrolls.
- **Legs:** `scenversion` V9 (the `title`) 10/10, `scenarios` 23/23; `npm run check` 43/43.

### ➡️ 19 Nov 2026: A NEW SCENARIO GOES AT THE FAR RIGHT — on `scenario-version-offer` (`cde7299`), merged with origin/main (v1.22.0, Finish before R5) and pushed to `main` on the owner's picker. README "Unreleased". Tracker card `scenario-copy-far-right`.
- **Owner:** asked whether a copy made while a tab other than the last is on screen should go at the far right instead
  of just right of the tab copied; on the recommendation, *"Yes, far right"*.
- **Done:** `duplicateScenario()` pushes the copy last. Reason kept in its comment: `nextScenarioName()` and
  `nextScenarioVersion()` both continue from the last tab, so a copy beside its source scrambled the strip's order.
- ⚠️ **The strip's keep-in-view effect now also depends on `editing` and `st.verOffer.to`.** The copy's name box and
  "→ vN" open a render after it becomes current and widen the tab; scrolled only on `st.current`, a far-right copy's
  "→ vN" was left 13 px under the right fade (measured at 800 px with six tabs).
- **Legs:** `scenversion` V7 re-expected (copies the first tab, expects it last), 9/9. Green on the build: scenarios 23,
  scenariofacts 12, scenlist (rt) 9, changessince 15, comparebreaks 10, exportnames 12, comparehiatus 8, lastedited 22;
  `npm run check` 43/43. No full gate (chrome + scenario engine, nothing frozen, no saved key).

### ✂️ 19 Nov 2026: SHOW INFO'S BOXES HAVE NO "e.g." EXAMPLES — committed `97320af` on `scenario-version-offer`, cherry-picked onto `origin/main` as `1afc25b` and LIVE: pushed on the owner's "commit and push", the GitHub Pages file has none of the seven (the Cloudflare address is behind the sign-in, not fetched). ⚠️ The push's own run failed at GitHub's Pages step (its artifact could not be fetched; a re-run of the failed job then found TWO artifacts), so a fresh "Build and deploy" was dispatched on `main` and went green. Next time: dispatch a new run, never re-run the failed job. A "Show Title" label was tried and withdrawn by the owner the same turn: it stays "Title".
- **Owner:** *"remove all these e.g. labels"* (a screenshot of Show info).
- **Done:** the seven `placeholder="e.g. …"` in `src/chrome/Sidebar.jsx` are gone (Title, Number of Episodes, Shooting
  Days per Episode, Version, Location, and Blocks mode's Number of Blocks / Shooting Days per Block). Tandem Days keeps
  "None", Season "—". Not asked, so left: the phase cards' "e.g. 12" / "e.g. 10" (`app.js`). README "Unreleased".
  Tracker card `show-info-no-examples`.

### ✂️ 19 Nov 2026: THE WATERFALL NOTE EDITOR HAS NO PLACEHOLDER — committed on `scenario-version-offer` after `e690859`, pushed to `main` with the far-right change
- **Owner:** *"delete this text in waterfall"* (the grey "Note text (Shift+Enter for a new line)" in an empty note box).
- **Done:** the waterfall note editor's `<textarea>` carries no `placeholder`; a hiatus band keeps "Hiatus label", and the
  month note editor's prompt is untouched (not asked). README "Unreleased". Checked in the build (attribute absent, empty
  box blank). Its own commit, after the scenario-version commit, so either can be dropped alone.

### ↩️ 19 Nov 2026: FINISH BEFORE ON AN EMPTY CARD BEFORE A DATED PHASE (ruling R5; branch `finish-before-dated`, worktree `.claude/worktrees/finish-before-dated`, from `origin/main` `1b45340`; `node_modules` is a symlink, unlink it before `git worktree remove`). **LIVE:** merged with `origin/main` (scenario versions, Tandem Days in Show info) as `b6abd67`, pushed on the owner's picker; deploy green to GitHub Pages and Cloudflare, the GitHub address serves it (Cloudflare is behind the sign-in, not fetched). README "Unreleased". Tracker card `finish-before-dated`.
- **Owner,** with a screenshot (only Production dated, 11/23/26; Writer's Rm, Pre-Prep, Prod Prep empty): *"when you give a
  start date to a later phase, previous phases should allow you to click Finish before"*. Tried on localhost: *"Looks
  good, finish it"*.
- **R5, as built** (`chainOpenBetween()` beside `reflectFinishBefore()` in app.js; CSS beside `.finish-before-btn`): a card
  with NO segment of its own and a scheduled chain phase after it offers Finish before though nothing is on Ends. No
  scheduled chain phase before it: `chain-back` (in place of Start after). One before it too: the new class `chain-both`,
  the one case that shows BOTH buttons. R1 wins over R5 (a later Ends phase still means Finish before alone). A card with
  dates of its own is unchanged, so C1's finished calendar on Starts reads exactly as before.
- **The click on an empty card:** Weeks goes on Ends with the end (as before) and an empty Length, and `focusEmpty()` puts
  the cursor in `weeks-<key>`; Dates (built-in, no Ends) writes only `end-<key>`, the last weekday before the next phase,
  and focuses `start-<key>` (it used to return and do nothing). Production empty is not special-cased.
- **Legs:** `finishbefore` R5a-R5d (16/16); `endsdate`, `prodends`, `spancounts`, `overrides` (dayoverrides),
  `snaptools` (dayoverrides), `builtindates` (live + restored) green; `npm run check` 43/43. No full gate: sidebar chrome,
  no frozen code, writer or saved key.
### 🏷️ 19 Nov 2026: SCENARIO TABS SHOW THEIR VERSION, A COPY IS OFFERED THE NEXT — merged with origin/main (v1.22.0 + the Tandem / Show info / zoom pushes) and pushed to `main` on the owner's picker. README "Unreleased". Tracker card `scenario-version-bump`.
- **Owner, in order:** asked whether a new scenario should take the Version as its name or the Version show in the bottom
  bar; then *"it could automatically set the version number to the next number"*; *"could there be a dialogue that asks"*;
  picked a strip offer (B), then asked to name tabs after the version *"as a suggestion, not force them"*, linked to the
  real Version; then *"two different dialogues is confusing"*; four layouts; picked **C** (*"lets see with version c looks
  like in the app"*); then *"if i dont click the arrow ... I should later be able to click on the little version number
  and the arrow should pop up again"*; *"Finish it"*. Mockups kept: `mockups/scenario-version-bump.html`,
  `scenario-name-version.html`, `scenario-new-tab-card.html`, `scenario-version-layouts.html` (C is the built one).
- **Built:** a Version badge on every tab (`tabVersionLabel`: the tab on screen from the box, a parked tab from its
  snapshot's `fields.byId['show-version']`); `→ vN` on a fresh copy and on a badge click (`scenarioVerOffer`,
  `nextScenarioVersion` = highest whole version on any tab + 1, only when the tab's own Version is a number);
  `takeScenarioVerOffer` types the number into `#show-version` and fires its input handler, so it is one ordinary undo
  step; the band's Version tile (`BAND_KEYS` + `ver`). No naming of tabs after the version: the badge replaced it.
- ⚠️ **The offer is dropped in `markDirty()` by comparing `undoStateJSON()` with the state it was offered against**, so
  a rename (no tab name is in a snapshot) does not drop it, and any calendar edit does. Its base is
  `lastPushedSnapshotJSON` after a copy and `undoStateJSON()` on a badge click.
- ⚠️ **`→ vN` sits inside the tab while its rename box is open, and its `mousedown` calls `preventDefault()`.** Without
  that the box blurs first, the rename re-renders the strip, and the click lands on nothing.
- ⚠️ **A tab's `textContent` now includes its badge** ("Scenario Av3"). Legs must read `.sc-tab-name`; five were changed
  (scenarios, scenariofacts, recoverfail, retiredplaces, comparebreaks).
- **Legs:** new `scenversion` (in gate.sh after scenariofacts) 9/9, red on v1.21.0 (V1). Re-run green on the build:
  scenarios 23/23, scenariofacts 12/12, scenlist (rt) 9/9, comparebreaks 10/10, exportnames 12/12, filenamelist 11/11,
  comparehiatus 8/8, retiredplaces 8/8, recoverfail mode=scen 3/3, loadsparse v=scen 7/7, changessince 15/15. `npm run check` 43/43. No full gate
  (chrome + scenario engine, nothing frozen, no saved key).

### ✅ 19 Nov 2026: SHOW INFO'S FIELD ORDER PER MODE — LIVE (`368f9e2`, pushed on the owner's picker; deploy green to GitHub Pages and Cloudflare; the GitHub Pages file is byte-identical to the build). Tracker card `show-info-field-order`.
- **Owner:** Episodes mode reads Schedule by, Number of Episodes, Shooting Days per Ep + Tandem, Version, Region, Location;
  Blocks mode reads Number of Blocks, Shooting Days per Block + Tandem, then Number of Episodes, *"it can still be optional
  but remove that it says so"*.
- **Done in `Sidebar.jsx` only:** markup order is num-blocks, days-per-block row (Blocks only), `#num-episodes` (both), the
  days-per-episode row (Episodes only); the `(optional)` span is gone. ⛔ Never duplicate `#num-episodes` to get the two
  orders: its id is the save format. Help still says the count is optional in Blocks (true).
- **Legs:** `doubleups` SI8 (both orders), `labelsetup` B1u re-premised to the plain label.
- ⚠️ **20 Nov 2026:** the move changed `fields.byId`'s KEY ORDER (built in document order), which turned four checks red;
  re-premised, see the 20 Nov entry at the top.
### ✅ 19 Nov 2026: TANDEM DAYS IN SHOW INFO — LIVE (`4562e9d`, pushed on the owner's picker; deploy green to GitHub Pages and Cloudflare, the GitHub Pages copy fetched and carries `si-tandem-in`; the Cloudflare address is behind the sign-in, so not fetched). Branch `show-info-tandem` (worktree `.claude/worktrees/show-info-tandem`, from `origin/main` `1b45340`; `node_modules` is a symlink, unlink it before `git worktree remove`). Mockup [`mockups/show-info-tandem.html`](mockups/show-info-tandem.html) (main checkout, untracked). Tracker card `show-info-tandem`.
- **Owner:** *"add double-up/tandem days in the Show Info section. To the right of the Shooting days per episode should be a big plus symbol and then to the right of that another box"*; then *"the plus doesn't need to be that big"*, *"could all be on one line"*, *"remove the subtext below it, then build it"*.
- **Built:** Show info's days row is `days box + Tandem Days` on one line, in Episodes and in Blocks mode (`TandemDaysBox` in `Sidebar.jsx`, `.si-days-tandem` in `legacy.css`). The box is a SECOND view of the Tandem card's "Default tandem days" (`doubleUpDays`, saved as `doubleUps.days`): a delegated `input` listener writes it as the card's box does, `reflectShowInfoTandem()` (from `update()`) writes it back. Undo, both directions and Blocks mode checked in the pane; `npm run check` 43/43.
- ⛔ **No id on the box:** a PLAIN `<input>`, the Region mirror's pattern. A Mantine `Input` inside `Input.Wrapper` TOOK THE WRAPPER'S MINTED ID (seen in the built page), which the save sweep would have baked into `fields.byId`.
- The days label runs over the plus column (`nowrap`), which keeps it to one line in the 280 px sidebar (142 of 146 px). "Whole days only" sits under the row (absolute), not in the 72 px column, where it wrapped and lifted the box.
- **Finished:** leg `doubleups` LIVE run gained SI0-SI7 (one line in both modes, no id on either copy, Show info -> card and
  card -> Show info, one Undo, Save adds no `fields.byId` key, Load, the whole-days ring with the box kept in line); help
  text in the Tandem paragraph; README "Unreleased". "One value in two places" was never ruled; the owner tried it and said
  finish. No full gate (chrome + a sidebar listener, nothing frozen).

---

## 0. The rules that override everything else

Moved to the rules, which every session loads (GOVERNANCE.md, 23 Nov 2026). What this section said, and where it is now:
1. Never commit or push on your own initiative: **REL-1, REL-4** (commits on your own branch are free; merge and push are asked).
2. Never touch the grid or the exports: **FRZ-1 to FRZ-18**.
3. Every saved calendar must keep opening, forever: **FILE-1 to FILE-3**.
4. Changelog every substantial change, and cut versions: **REL-9, REL-10**.
5. Watch the context window: **WORK-9**.

The text as it stood is in [`handoff/sections-before-governance.md`](handoff/sections-before-governance.md) (no authority).

## 1. Where the app stands

**The live site is the Vite BUILD.** `.github/workflows/deploy.yml` builds `src/` and publishes
`dist/index.html` (~1,050 KB) to <https://greicher1.github.io/planning-cal-builder/> on every push
to `main` — cutover 31 Aug 2026, owner-approved (§2b-3 row 7). Verified 2 Sep 2026: the live page is
byte-identical to a local `npm run build` at `2a75929`. The root `index.html` (~10,344 lines /
~667 KB, one file, no build step) is **no longer what users get**; it stays in the repo as the v1.2.0
legacy app, byte-identical to `releases/v1.2.0.html`. ⛔ *(Corrected 13 Nov 2026, audit AUD2-006, D7 (a).)* It is NOT the
rollback any more: the rollback is "Build and deploy" dispatched on `main` with `release` = the previous version, which
publishes that release's stored copy (header of `deploy.yml`). Serving this v1.2.0 file moved every wrap date.

### ✅ CORRECTED 2 Sep 2026 — this section used to say "v1.2.0 IS BUILT BUT NOT DEPLOYED — the live site is still v1.0.0"

That was verified true on 28 Aug 2026 (the live page then matched `releases/v1.0.0.html`, SHA-256
`0150be15…`) and became false on 31 Aug when the cutover shipped — but the section was never
rewritten, and a session on 2 Sep pushed believing the live app would be unchanged. **Every push to
`main` deploys the build to real users.** `git log --oneline origin/main..main` is the list of what a
push would ship; it is currently short.

**Two tags are unpushed: `v1.0.0` and `v1.2.0`.** That is what makes the `releases/…` URLs in
`README.md` 404. They need their own `git push --tags`; pushing `main` does not carry them.

⚠️ **v1.1.0 was never cut** — it has a changelog entry but no tag and no `releases/` copy, because
it was superseded before it ever deployed. **v1.2.0 is the release that carries both.** Do not go
back and retro-cut v1.1.0; there is no build of it that was ever public.

### ⚠️ Push only from a machine signed in as the repo owner (learned 28 Aug 2026)

A push from a second machine was **rejected** on 28 Aug 2026 with `remote: Permission to
greicher1/planning-cal-builder.git denied to <account>`. `gh api repos/greicher1/planning-cal-builder`
reported `pull: true, push: false` for that account: the token was fine (it carried `repo` scope),
the *account* simply was not a collaborator. What still applies:

- **Push from a machine authenticated as the repo owner.** A 403 on push is the account, not the
  token, so a new token does not fix it; collaborator access for that account would.
- **Move a working copy between machines as the whole folder**, never just `index.html`. Commits,
  tags and the reflog live in `.git`, and copying the working files alone silently discards them.
- **Do not read the changelog as a description of what users have.** Only a push to `main`
  reaches them; `git log --oneline origin/main..main` is the list of what one would ship. Ask
  before pushing (§5a).

*(Trimmed 29 Sep 2026: the 28 Aug status lines under this heading were stale, since `.sptcal` has
reached users since the 31 Aug cutover.)*

The through-line of the last stretch of work: the app had **three independent column-width
systems** (screen, Excel, PDF) that could never agree, and that — not the rendering — was why the
PDF never looked like an Excel print. Collapsing them into one shared model is what most of the
recent commits are really about.

```
sheetColumnWidths()   → Excel char units, measured with a real canvas
        ├─ screen     → <colgroup> + table-layout:fixed
        ├─ Excel      → column widths directly
        └─ PDF        → the same numbers read as points
```

`computePhaseRowLayout()` is the matching single source for *which phase occupies which column in
a given week*. All four consumers (screen, PDF writer, `sheetColumnWidths`, Excel export) call it,
so a layout change lands everywhere at once. **Keep it that way** — the previous divergence cost
weeks.

### Shipped in the 27–28 Aug build session (21 commits, `ca26df0` … `cf51a29`)

| Area | What landed |
|---|---|
| Excel print setup | Letter, centered, print area pinned; gridlines default to the reference look |
| Embedded font | Carlito subsetted to 91 KB and inlined; the CDN font dependency is gone |
| One column model | `sheetColumnWidths()` now feeds screen, workbook and PDF |
| Resize | Drag columns and rows; autofit; shrink-to-fit for notes, phase labels and hiatus bands |
| Row line budget | Row height decides how many lines a note gets; per-note and per-hiatus font size |
| Direct PDF writer | lines: TrueType subsetting, `/FontFile2`, WinAnsi, xref, Flate. No print dialog |
| Page geometry | One orientation rule shared by the workbook and the PDF |
| Cell spans | Drag a cell's edge across the empty columns beside it; double-click to fill / un-fill |
| Even splits | Phases running at the same time divide the width evenly; phase columns share one width |
| Scroll | The preview holds its position through every edit |
| Row heights | Every row starts at the default; dragging snaps to matching heights |
| Note editor | A popover anchored to the cell instead of markup injected into it |

Bugs fixed along the way that were not the task at hand — worth knowing they existed, because each
was invisible until measured:

- 64 of 255 filled cells were silently ellipsis-clipped (CSS padding vs. the width model).
- 9 of 52 date cells were clipped the same way, on the one column where it is most obvious.
- ExcelJS omits `<col>` when `width === 9`, so the Date column's width never took effect.
- The workbook and the PDF disagreed about page orientation on a 3-block calendar.
- Excel dropped hard line breaks in notes (`wrapText` was only set at the shrink floor).
- "Reset Notes & Hiatus" never called `markDirty()`.
- A hiatus label walked away from a band that stayed put (locked, or before a ripple's cutoff).

---

## 2. Requested but not yet done

**Open work lives on the feature tracker, one card per item** (WORK-11; the owner's picker, 23 Nov 2026: "The tracker").
HANDOFF keeps only what is in flight right now, in START HERE, each with its card ID.

The old section (2a to 2l) is in [`handoff/sections-before-governance.md`](handoff/sections-before-governance.md). Every item still open in it already had a card: 2c notes columns
(`notes-columns`, rejected by the owner), 2g encrypted files (`encrypted-files`, held) and 2i half days (`half-days`,
live). The rest were done or superseded; the two engine bugs listed under 2b-3 were fixed by audit M-2 (25 Sep 2026).
2e moved to §3.

## 3. Findings worth keeping

### The MDW trap (the single most important number in the project)

Carlito/Calibri's `"0"` actually advances **7.4336 px** at 11 pt. Excel floors MDW to **7**.

```js
const EXCEL_MDW = 7;   // NOT 7.4336 — Excel floors it
```

Dividing measured text by the *true* advance yields columns ~6% narrower than Excel's autofit.
Every width in the app goes through `px = trunc(chars × 7) + 5`.

`SHEET_ZOOM = 0.75` is the other half: the screen renders 11 px type where Excel uses 11 pt, so
screen px and Excel points are numerically the same, and `charsToScreenPx()` serves both the screen
and the PDF.

### Carlito is metric-compatible with Calibri

Verified, not assumed: both give `"0"` an advance of 1038/2048 em, and a 155 px string measures
identically. This is what lets an embedded open-licence font stand in for Calibri without the
column model drifting.

### CSS padding must match what the width model budgets

The model budgets `EXCEL_CELL_PAD = 5` at `SHEET_ZOOM`, i.e. **3.75 px total**. Any cell rule that
spends more than that clips text by the difference, silently, with an ellipsis. This has now bitten
twice — body cells (20 px against 3.75) and the Date column (10 px). Breathing room belongs in
`COL_PAD_CHARS`, where **both** outputs get it equally.

### `table-layout: fixed` scales declared widths to the table's width

So widening one column without also updating the table's explicit width just steals room from every
other column, and the dragged one never reaches the size asked for. That was the entirety of "the
dragging feels weird."

### Excel's fit-to-page is a page CTM

The reference PDF's content stream opens with `0.58 0 0 0.58 0 33.16 cm` and draws all text at
`Tf 1` with `Tm 12`. So its "12 pt" body text is really 6.96 pt. The app bakes the scale into the
font size instead (`Tf 7.04`) — same result, different mechanism. Worth knowing when comparing
content streams.

### `requestAnimationFrame` does not fire while the browser pane is hidden

This silently invalidated a whole test run. If a fix depends on rAF, **front the pane** before
measuring, or the results are meaningless.

### Measure what the user perceives, not the raw number

Three "scroll jump" failures turned out to be Chrome's scroll anchoring correctly holding the view
still while `scrollY` changed. Comparing scroll numbers lied; comparing *where a given week's row
sits on screen* told the truth. Pick the metric that matches the complaint.

### Saved files carry their own copy of the app — the *old* ones, and every shareable copy

⚠️ **Narrowed by v1.1.0, and the old phrasing is now a trap.** Plain **Save** writes `.sptcal` —
~4.5 KB of JSON, no app code — so a `.sptcal` cannot carry a bug at all. The finding still holds,
unchanged, for the two formats that *are* whole documents: **legacy `.html` calendars** saved
before v1.1.0, and every **shareable copy** (File ▸ *Export shareable copy…*), which is a complete
frozen app on purpose.

Those keep the bugs they were saved with, forever. When the owner reports something already fixed,
ask **which file they are in** before digging — that has already caused one false alarm. Two live
consequences of the same fact: §2h, where a shareable copy bakes in a notice strip naming someone
else's file; and the update check staying deliberately silent on `file://`, because telling a
frozen copy's holder to "update" would navigate them off the very file they were sent.

There is no service worker (removed deliberately, and old registrations are actively unregistered
on load), so the *live site* always serves current code on a normal refresh — including on an
installed PWA's relaunch, since with no service worker it fetches like a plain tab. The one caveat,
worked through 28 Aug 2026: if the deploy is ever moved behind GitHub Enterprise Cloud private
Pages (SSO-gated), that gate is checked on *every* request, not once — so an unattended background
fetch from inside the installed PWA (an update check, or the relaunch fetch itself) can silently
fail with no valid session, where a real page navigation would not. See §2f.

---

### "Chrome/Edge" is two constraints, not one — and Safari has never been measured

Asked by the owner 29 Aug 2026: *is there a reason Chromium is the only reliable run, over Safari?*
The audit found **no decision had ever been recorded.** The word "Safari" appeared nowhere in the
repo — not in a doc, not in a code comment. One sentence ("Chrome/Edge are the target browsers")
had been carrying two unrelated constraints, which is why the question had no answer to point at.

**The decision, confirmed by the owner the same day: stay on Chrome/Edge.** Written down here so it
is a choice and not an accident. What follows is **two real constraints and one unknown**, and they
are different in kind — conflating them is how someone ends up "just trying Safari" and drawing a
confident wrong conclusion from it.

**A — the harness is Chrome-only structurally, not by preference.** `tests/harness/run.sh` is built
*around* `--headless=new`, `--dump-dom` and `--virtual-time-budget`: inject a script, let it write
JSON into `<pre id="R">`, dump the serialised DOM to stdout, parse the payload back out. Safari has
**no headless mode and no DOM-dump flag at all.** Its only automation surface is `safaridriver` — a
real windowed browser speaking WebDriver, which must be enabled by hand under *Develop ▸ Allow
Remote Automation* and driven by a client library. Firefox has headless but no `--dump-dom`. Either
port is a **rewrite of the harness**, not a change to `CHROME=`. Budget it that way if it is ever
asked for.

**B — the app is Chromium-first, and degrades on purpose.** `supportsFsAccess` gates on
`window.showSaveFilePicker`, and the File System Access API is Chromium-only; so is
structured-cloning a `FileSystemFileHandle` into IndexedDB, which is exactly what the recents list
is. On Safari that means no save-in-place, no recents, no autosave-to-a-linked-file — and **Save
writes the legacy full-copy `.html`, not `.sptcal`.** That last one is deliberate, and the comment
in `saveToFile` says why: with no handle there is nothing to write back to, so handing someone a
data file they then cannot re-link is worse than a copy that just works.

⛔ **CORRECTED 30 Sep 2026 (audit L-20):** this section said "**Opening is unaffected** —
`parseCalendarText()` does not care what browser it is in — so §0 rule 3 holds everywhere". That was
wrong. Without the API `renderRecents()` hides the whole file menu, and **Load…** with it, and
`openFileViaPicker()` returns early. So there is **no Load at all**, and a `.sptcal` cannot be
opened. The reader doesn't care about the browser; the only way to reach it does. The one exception
is an `.html` copy, a shareable copy or a pre-v1.1.0 save. It is a complete app of its own, so
opening that file runs whatever build it carries, not the current app, and that has never been
measured outside Chrome. §0 rule 3 is a promise about Chrome/Edge (owner ruling R6). Since v1.4.1 a
strip (`#browser-notice`) tells such a user: "SPTCal saves and loads in Chrome or Edge."

**C — one thing nobody has measured.** The month PDF is `window.print()`, and the print CSS is
tuned against **Chrome's** print engine specifically: the 2 px page-box inset exists because Chrome
trims frame borders sitting exactly on the clip boundary to a sub-pixel, and the bar-border rule
exists because Chrome's print pipeline rasterises a composited absolute layer. Those are
observations of *one* engine. Safari's print output has never been looked at. Two things are safe:
`buildWaterfallPdf()` writes PDF bytes directly with no print dialog, so no engine is involved; and
`DecompressionStream('deflate')`, which inflates the embedded Carlito, needs **Safari ≥ 16.4** —
below that the font never loads and the whole width model silently measures a fallback.

**So do not describe Safari as "degrades gracefully."** A and B are structural and known; C is an
*unknown*, not a tested fallback. The honest statement, and the one to give a user who asks
(corrected 30 Sep 2026, audit L-20; it used to say "every calendar opens in any modern browser"):
**SPTCal saves and loads in Chrome or Edge. Elsewhere a calendar can't be loaded at all, and
printing has never been measured.**

---

### A single-file client-side app cannot hold a secret

Any key embedded in `index.html` ships to everyone who runs the app — that is not an obfuscation
problem to be solved with cleverness, it is what "the browser must execute this file" means. It
came up designing `.sptcal` encryption (§2g) and it will come up again for any licensing, API-key
or "phone home" idea. The only secrets this app can hold are ones the *user* supplies at runtime
and the app never stores. Everything else is tamper-evidence, which is real and useful, and worth
saying plainly instead of dressing up as confidentiality.

Related, and easy to miss: the repo is **public** and the app is on **GitHub Pages**. Anything
committed to `index.html` is published, immediately and permanently, including in git history.

⚠️ *Added 23 Nov 2026 (SEC-11):* this assumed a public repo forever. Since v1.21.0 the app sits behind a sign-in, and
the repo is to go private after the sign-in plan's Phase E. History already pushed, and the app delivered to users, stay
exposed either way.

### Known, deliberately left alone (was §2e until 23 Nov 2026)

- **Month view** still tints phase bars with the palette's `textColor`; the waterfall was changed to
  black text and the month view was not. Flagged to the owner, not acted on.
- **Switching to Month view and back** lands the waterfall at the top. The waterfall's scroll
  container does not exist while the month view is up, so there is nothing to restore onto.
- **`hiatusTexts` / `hiatusColors` shifting** now respects locked and pre-cutoff bands, but the
  guard is a different rule from `isPinnedWeek` (which is about date-pinned *notes*). Do not
  "unify" them — they are deliberately separate.
- **Font subsetting is build-time only** (`tools/subset-font.py`); PDFs embed the full subset rather
  than subsetting per document.

---

## 4. What NOT to do

Moved to the rules (23 Nov 2026). Each "Do not" this section held, and where it is now:
- Do not push without being asked: **REL-1**.
- Do not touch the grid or the exports, change how the exports look, or redesign the waterfall editor: **FRZ-1, FRZ-2,
  FRZ-3** (HOW-IT-WORKS.md §1 has the detail).
- Do not break a saved calendar; `fields.byId` ids are the file format: **FILE-1, FILE-3**.
- Do not ship without a changelog entry: **REL-9**.
- Do not report a fix without evidence from a real browser, or trust an unchecked harness: **WORK-5**.
- Do not put transient UI controls behind an id: **FILE-8**.
- Do not add persistent state in one place, or restore a store conditionally: **FILE-5, FILE-4**.
- Do not split the file: no rule. The owner declined it as a rule (CODE-5, 23 Nov 2026); it stays one file by choice.
- Do not "fix" the deliberate scheduling behaviours: **CODE-16**.

The text as it stood is in [`handoff/sections-before-governance.md`](handoff/sections-before-governance.md) (no authority).

## 5. Agreed conventions

Moved to the rules (23 Nov 2026):
- 5a commit and deploy: **REL-1 to REL-6**, REL-3 for checking the live app.
- 5b session migration: **WORK-9**.
- 5c working style (discuss first, research, honesty, pushback, no padding, one thing at a time): **WORK-1, WORK-5, WORK-6**.
- 5d keep this file current: **WORK-7**.
- 5e commit messages: **REL-13**.
- 5f code comments: **CODE-8**.
- 5g versioning and the changelog: **REL-9, REL-10**.

The text as it stood is in [`handoff/sections-before-governance.md`](handoff/sections-before-governance.md) (no authority).

## 6. UI conventions

Moved to the rules in GOVERNANCE-UI.md (23 Nov 2026); UI-CONVENTIONS.md stays the UI reference:
- Toolbar: **UX-11, UX-22, UX-41**. Footer (there isn't one): **UX-32**. The grid: **FRZ-3, UX-8**. Editing: **UX-8,
  UX-38, UX-40**.
- Tone of user-facing copy: ~~"anything true of every option must not appear in one option's description"~~, declined as
  a rule by the owner (COPY-6, review page, 23 Nov 2026). Descriptions are governed by UX-4.

The text as it stood is in [`handoff/sections-before-governance.md`](handoff/sections-before-governance.md) (no authority).

## 7. The save / open format — how it actually works, and where it should go

⚠️ *Added 23 Nov 2026 (FILE-13, SEC-3):* parts of this section describe v1.1.0 to v1.20. Since v1.21.0 no button writes a shareable copy (Export App With Data is gone), and Save on a legacy `.html` asks and writes a NEW `.sptcal` through the picker, leaving the `.html` as it was. HOW-IT-WORKS.md §2 and §9 describe it as built.

Written 28 Aug 2026 after the owner asked whether saves are full app copies and whether that is
the right design. **Measured, not assumed** — headless-Chrome harness, a 10-episode US-General
calendar with four phases dated and four hiatus rows.

### What happens today

Save and Open are **not symmetric**, and that is the crux.

```
SAVE:  captureSnapshot()  →  JSON  →  <script id="saved-state">
       + document.documentElement.outerHTML   ← a complete, runnable copy of the app

OPEN:  read file as TEXT  →  regex out <script id="saved-state">  →  JSON
       →  applyStateSnapshot()  →  refreshAfterRestore()
       ✗ the old file's HTML/CSS/JS is NEVER parsed and NEVER executed
```

So the answer to "are we saving a full snapshot then only parsing the data on open, or fully
loading the old HTML?" is **the first one**. Open takes exactly one thing from the file: the
snapshot JSON. Everything else is inert.

### What that costs, measured

| Part of a saved calendar | Bytes | Share |
|---|---:|---:|
| **The data — `saved-state` JSON** | **3,238** | **0.44%** |
| Embedded Carlito font | 93,797 | 12.9% |
| **The rendered grid, serialized and then thrown away** | **44,568** | 6.1% |
| The rest of the app — CSS, markup, script, help modal |,000 | 80.5% |
| **Total** | **729,172** | 100% |

**99.56% of a saved calendar is a copy of the application that the Open path never reads.**

The 44.5 KB rendered-grid figure is the one to notice: because `buildSavedHtml()` serializes the
*live* DOM, whatever the grid happened to be showing gets baked into the file — and then
`refreshAfterRestore()` regenerates it from the state on load and discards it. It is pure
overhead, it grows with the size of the calendar, and nothing ever reads it.

### Why it is still not simply wrong

The full copy buys one real thing: **a saved calendar is double-clickable.** Mail someone the
file and they have a working app with your schedule in it, no install, no server, offline. That
was a deliberate design goal and it is genuinely valuable.

But it also carries a cost that has already caused a false alarm in this project: **a saved file
keeps the bugs it was saved with, forever.** When someone reports something already fixed, ask
which file they are in before digging (§3).

### The better shape — two formats, one contract  ✅ **SHIPPED in v1.1.0**

Neither the copy nor the data should be dropped. They should stop being the same file.

| | **`.spcal` — the data file** | **`.html` — the share file** |
|---|---|---|
| Contents | the snapshot JSON, nothing else | today's full self-contained app + state |
| Size | **~3 KB** | KB |
| Role | **the default.** Save, Open, autosave, recents, backup | "Export a shareable copy" — an explicit, occasional action |
| Opens by | the app | double-click, anywhere, offline |
| Carries app bugs | no — always opened by current code | yes, frozen at export time |

Concretely, this is a **small** change, because the hard part already exists:

- `Save` writes `JSON.stringify(captureSnapshot())` instead of `buildSavedHtml()`. The File System
  Access handle, recents, autosave and dirty-tracking are untouched.
- `Open` gains one branch at the top: if the text starts with `{`, parse it directly; otherwise run
  today's regex for the `saved-state` block. **Both paths converge on the same
  `applyStateSnapshot()`,** which is why old `.html` calendars keep working with no migration.
- `buildSavedHtml()` survives verbatim as "Export shareable copy", and should additionally empty
  `#table-wrap` before serializing — that alone reclaims the 44.5 KB of dead grid markup.

What it buys: saves become× smaller and effectively instant; autosave and the IndexedDB
backup stop moving three-quarters of a megabyte every ten minutes; a saved plan always opens in
*current* code, so fixes reach old files; and files become diffable, greppable and mergeable in a
way a 730 KB HTML blob never will be.

**This matters more after the Mantine overhaul, not less.** Once there is a build step,
`buildSavedHtml()` serializes a *minified* app, so the "readable copy" argument for the HTML
format weakens at exactly the moment the data-only format becomes cleaner to produce.

### As built (v1.1.0)

All of the above shipped, plus the `version` field that was listed as its prerequisite.

| Symbol | Job |
|---|---|
| `SAVE_EXT` / `SAVE_MIME` / `SAVE_TYPES` / `OPEN_TYPES` | the two formats, declared once |
| `SNAPSHOT_VERSION` = 1 | stamped into every snapshot; nothing branches on it yet |
| `buildSavedData()` | the data format — `captureSnapshot()` as pretty JSON |
| `buildSavedHtml()` | the share format, now built from a **clone** |
| `parseCalendarText()` | **the one reader.** `{` → snapshot; otherwise the `saved-state` regex |
| `handleIsLegacyHtml()` | so Save writes back in the format the file already is |
| `autosaveNeedsFile` | autosave found work but no file; surfaced in the status line |

Measured on the same fixture: **4,488-byte `.sptcal` vs 695,556-byte `.html` — 155× smaller.**
Both formats round-trip to a byte-identical rendered grid; a snapshot with no `version` key still
opens; garbage, empty text and HTML with no state block are all rejected cleanly.

Three things deliberately **not** done, and why:

- **`buildSavedHtml()` was not deleted.** Emailing someone a double-clickable working calendar was
  a real design goal and it still is. It is just no longer what Save means.
- **Legacy `.html` files are not auto-converted.** Open one, hit Save, and it stays an `.html`.
  Converting a file the user did not ask us to convert is how you lose someone's trust once.
- **Preferences still do not go in the data file.** Settings are per-user and per-machine —
  `localStorage`, never `captureSnapshot()`. That was true before and the format split does not
  change it.

### Still true for the Mantine work

`MANTINE-MIGRATION.md` §4.4–4.5 is *smaller* now but not gone. `captureSnapshot()` is still a
DOM sweep via `collectFieldValues()`, so `fields.byId` is still keyed by element id and the legacy
branch is still needed — the difference is that `parseCalendarText()` has already isolated
"reading a file" from "applying a snapshot", so only the second half has to change.

---

## 8. Build order

Written 28 Aug 2026, after three sessions' findings landed at once (the `.sptcal` format split,
the PWA update-delivery research in §2f, and the encryption design in §2g). This is the **one
sequenced list** of what to build next. `MANTINE-MIGRATION.md` §6 still holds the detail of the
redesign stages; this says where they sit relative to everything else.

Two items are **decision-gated**, not effort-gated — no amount of work moves them until the owner
answers. They are listed first because a wrong guess there wastes a whole stage.

### Gate 0 — decisions the owner owes, before anything is built

| # | Decision | Blocks | Where it's laid out |
|---|---|---|---|
| D1 | **Encryption threat model: A, B or C.** Public repo means an embedded app key is not a secret. ⏸ **Deferred 29 Aug 2026** — asked and explicitly parked, not unanswered. Ask again before starting §2g. ⏸ **Parked again 19 Nov 2026** (owner) after a fourth option was raised: since v1.21.0 the key can come from a Pages Function behind the Access sign-in, never in the app or the repo (`SPTCAL-ENCRYPTION.md` §0a). **Revisit after `CLOUDFLARE-ACCESS-PLAN.md` Phase E** (owner, 19 Nov 2026): the old GitHub address shut and the repo private. | all of §2g | `SPTCAL-ENCRYPTION.md` §0 |
| D2 | **Is losing "a saved calendar is readable" acceptable?** Largely answered by `.sptcal` shipping — the thing you inspect is now 4.5 KB of JSON. Worth confirming. | Mantine Stage 4 | `MANTINE-MIGRATION.md` §7 Q1 |
| D3 | ~~**Committed `dist/` or a GitHub Action?**~~ ✅ **ANSWERED 29 Aug 2026: a GitHub Action** builds and publishes `dist/` (§2b-3's ruling table; `.gitignore` records the same decision). Unbuilt, but no longer an open question. | Mantine Stage 1 | `MANTINE-MIGRATION.md` §7 Q3 |
| D4 | ~~**Repo visibility.**~~ ✅ **ANSWERED 28 Aug 2026: the repo is PUBLIC** (`gh repo view` → `isPrivate:false`, `visibility:PUBLIC`). So an app key baked into `index.html` is *published*, and D1 must be decided knowing that. What remains open is only the **hosting plan** — whether it ever moves behind GHEC private Pages. | §2f, §2g | §2f |

### The order

| Stage | What | Depends on | Est. |
|---|---|---|---|
| ~~**0**~~ | ✅ **DONE — docs refresh.** `CLAUDE.md` + `PROJECT-CONTEXT.md` are current as of `83ac3b7`; prose names symbols and quotes **no** line numbers, §14 map at **74 verified rows**, enforced by `tools/check-refs.py` across seven docs. See §2a. | — | — |
| ~~**1**~~ | ✅ **DONE — PWA update delivery** (§2f). `version.json` in this repo (owner's call, 29 Aug 2026), `APP_VERSION`, a per-version-dismissable blue strip, `location.reload()` not `fetch()`, gives up after 3 failures, silent on `file://`. Shipped as **v1.2.0**. | D4 | — |
| **2** | ⏸ **DEFERRED by the owner, 29 Aug 2026.** Encryption (§2g). The design and the `crypto.subtle` verification stand; nothing is blocked *technically*, it is simply not being done now. Re-open by answering D1. | **D1** | 2–3 |
| **3** | 🔒 **HELD as the first Mantine surface** (owner's call, 29 Aug 2026) — so it is built **once**, in Mantine, not twice. Do **not** build it in plain JS. Its constraints are worked out in §2b and still apply. | Mantine | 1–2 |
| **4** | **Mantine Stage 1** — scaffold, zero behaviour change. ✅ The harness prerequisite is **done**: [`tests/harness/`](tests/harness/) is committed and green, with a pre-Mantine baseline at `tests/baselines/2026-08-29-stage-7/` to diff the scaffold against. It is Chrome-only by construction — see §3. | D3 | 1–2 |
| ~~**5**~~ | ✅ **DONE — Mantine Stage 2**, 29 Aug 2026, at the owner's request. Theme tokens, the one feedback system, the responsive model and the component choice for every chrome control, date picker and overlay are settled in [`UI-CONVENTIONS.md`](UI-CONVENTIONS.md). No code written. ⛔ **Read its §8 before Stage 4** — seven verified traps, five of which silently break the save format; and its §9, six items that need an owner ruling because they turn out to touch `render()` or a frozen export. | — | — |
| **6** | **Mantine Stages 3–5** — sidebar, toolbar, popovers, editors. | D2 | 5–7 |
| ~~**7**~~ | ⏸ **HELD by the owner, 29 Aug 2026.** Structured notes columns (§2c). Picked up, baselined, and stopped at the gate: the split cannot be export-neutral, and the exports must look exactly as v1.0.0 (§4). Design and baseline both stand in §2c; **do not build it without asking again**. | — | — |
| ~~**8**~~ | ⏹ **INVESTIGATED 29 Aug 2026 and mostly WONTFIX** — see [`STAGE-8.md`](STAGE-8.md). Its four geometry rows are one whole-percent fit scale, every route to them visibly changes the PDF, and §4 forbids that. What is left is not a stage: two colour decisions, one real bug (§2h), three internal disagreements and some cleanups. **Recommendation: strike it from the build order.** | — | — |

**Why this order, where it isn't obvious:**

- **Stage 0 first, always.** The docs now lag far enough that a fresh session would act on a save
  path that no longer exists. That is exactly the failure `CLAUDE.md`'s first rule exists to stop.
- **PWA delivery before the redesign, not after.** It is small, it is independent, and it is the
  mechanism by which every later change actually reaches the people using this. Shipping a
  redesign that installed users never receive is the worst possible ordering.
- **Encryption before the Mantine work** *if* D1 comes back as A or C. It touches
  `buildSavedData()` and `parseCalendarText()` — two functions the redesign does not go near — so
  doing it while the save layer is freshly in mind and stable is cheaper than doing it on top of a
  half-migrated app. If D1 comes back as B, drop it down the list; tamper-evidence alone is not
  urgent.
- **Settings menu before Mantine Stage 3, and again after.** It is listed once here, but
  `MANTINE-MIGRATION.md` also proposes it as the first Mantine surface. Pick one: build it now in
  plain JS if it is wanted soon, or hold it as the Mantine proving ground. **Do not build it
  twice.**
- **Notes columns last.** It is the largest change to what the grid contains, and the grid is
  frozen (§0 rule 2) — so it needs its own conversation and its own acceptance gate before anyone
  starts, not to be folded into a UI stage. ✅ **That ordering paid off exactly as intended:** the
  stage got its own conversation, the conversation surfaced a constraint nobody had written down,
  and it was stopped before any code was written rather than after. Keep doing this.
- ~~**Stage 8 is now the odd one out.**~~ ✅ **Done, same day.** Stage 8 was the only remaining
  stage that still wanted to change the exports, so its first task was to establish whether a
  version of itself was allowed to exist. It mostly is not — [`STAGE-8.md`](STAGE-8.md). Note the
  investigation cost a few hours and would have cost a whole stage to discover by building; the
  same "work out whether it is permitted before estimating it" step is worth applying to anything
  else that touches the exports.

### One thing the next session must not trip on

`parseCalendarText()` **now returns `{format, snapshot}`**, not a bare snapshot — the format is
needed so opening a legacy `.html` can offer the upgrade. `SPTCAL-ENCRYPTION.md` §3 was written
against the older signature and shows a third branch returning the snapshot directly. The design
is unaffected; the code sketch in it needs `{format:'data', snapshot:…}` on the encrypted branch.

### Test fixtures now exist

`tests/fixtures/v1.0.0-saved.html` — a **genuine** pre-v1.1.0 saved calendar, produced by running
the v1.0.0 build itself and clicking Save. 760 KB, 27 snapshot keys, no `version` field, grid baked
in. This is the file to test any future change to the restore path against. **Generate a new
fixture each time a version is cut**, alongside the tag and the `releases/` copy (§5g) — the
fixtures are only useful if they keep pace with the formats that exist in the wild.
