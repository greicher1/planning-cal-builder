# GOVERNANCE-PLAN.md: one rules sheet for SPTCal

**Status:** Phases 0-4 done (Phase 4, the rewire, on 23 Nov 2026: §7e). Phase 5 (the checker and the hooks) is next.
Tracker card `governance-sheet`.

*The rules themselves are GOVERNANCE.md, GOVERNANCE-UI.md and GOVERNANCE-ENG.md, edited by hand. Paths below under
`governance-work/` name the local working folder the sheet was drafted in: it is a record kept on the owner's Mac, out of
git, and no session needs it. This plan is history and status, not rules (INTRO-1). §4's first-cut inventory was
superseded by the draft.*

The goal: **one short document that holds every standing rule for how SPTCal is built, designed and shipped**, each
with the owner's own words and the reason behind it. Today those rules are spread across eight places, mixed in with
build notes, and some of them contradict each other.

---

## 1. Why now: the rules are hard to find, and some disagree

### Where the rules live today

| Place | Size | What's in it besides rules |
|---|---|---|
| `CLAUDE.md` | 121 KB, loaded into every session | how the code works, nine frozen-surface exceptions with their implementation detail, the state table |
| `HANDOFF.md` | **2 MB, 20,278 lines** | 17,650 lines of dated work entries come *before* its §0 "rules that override everything" |
| `UI-CONVENTIONS.md` | 1,616 lines | Mantine traps, measurements, gate list |
| `PROJECT-CONTEXT.md`, `MANTINE-SEAM.md` | 2,800 lines | reference material |
| 58 `*-PLAN.md` files | | each has its own numbered rulings (R1, R2…), some of them really app-wide |
| `README.md` changelog | 14,000 lines | ~200 quoted owner instructions, buried in release notes |
| Claude's private memory | 15 rule files | **worktree sessions can't see it**, so rules like "keep the app simple", "lean right-click menus" and "Pushed / Pulled" don't reach most sessions |
| The feature tracker | | status, not rules |

Counted across these docs (plans included): about **800 quoted owner instructions**, many of them repeated in more
than one doc, and **340 "owner's picker" rulings**. Some are about one feature and some apply to the whole app, and
nothing marks which is which.

### Contradictions found in the first read (each is a rule that drifted because it lived in two places)

1. **Browser storage:** CLAUDE.md says *"`localStorage` is used nowhere in the app today"*. The app uses it in 21
   places, and another part of CLAUDE.md describes the `sptcal.prefs` key.
2. **Reading order:** CLAUDE.md says CLAUDE → HANDOFF → PROJECT-CONTEXT (owner, 29 Aug 2026) and says the other docs
   were brought into line. HANDOFF §5b still says CLAUDE → PROJECT-CONTEXT → HANDOFF.
3. **Cutting a version:** HANDOFF §5g says bump `APP_VERSION` in `index.html` + `version.json`. CLAUDE.md says
   `src/legacy/app.js` + `version.json`, and *never* the root `index.html`. `npm run check` also requires
   `package.json`, which neither of them mentions.
4. **"Do not split the file":** HANDOFF §4 says *"saved calendars are copies of index.html"*. That hasn't been true
   since v1.1.0 (`.sptcal`), and since v1.21.0 nothing writes a copy of the app.
5. **The Mantine CSS fence:** HANDOFF §4 says Mantine's CSS *"must be fenced into a `@layer`"*. CLAUDE.md says
   the build fences it by import order, *"not a hand-written `@layer`"*.
6. **Where it deploys:** HANDOFF §5a says `main` deploys to GitHub Pages. Since v1.21.0 the real address is
   `sptcal.pages.dev` behind the sign-in, and GitHub Pages shows a "moved" page.
7. **Browsers:** CLAUDE.md says *"Chrome/Edge are the target browsers"*. The owner said on 13 Nov 2026 *"no need to
   test edge, only chrome, but do test windows"*. Those can both be true (Edge supported, Chrome tested), but no
   doc says so.

None of these broke the app. They do mean a session can follow the wrong copy with complete confidence, which is the
failure `CLAUDE.md` itself warns about.

---

## 2. What the governance sheet is, and what it is not

**It is:** `GOVERNANCE.md`, one file in the repo, the **only** home of every standing rule: things that must always
or never happen, how the owner wants the app to look and behave, and how work gets done and shipped. Each rule comes
with its reason and the owner's words. It should be short enough to read in full at the start of every session.
Target: **under 50 KB**, against CLAUDE.md's 121 KB today.

**It is not:**

| Not this | That stays in |
|---|---|
| What's being worked on, what's owed | `HANDOFF.md` |
| What shipped and when | `README.md` changelog |
| How the code works (the width model, the seam, the state table) | `PROJECT-CONTEXT.md`, `MANTINE-SEAM.md`, a slimmer `CLAUDE.md` |
| One feature's design and its own rulings | that feature's `*-PLAN.md` |
| Private reasons (confidentiality, people, other projects) | Claude's private memory |

**The test for "is this a rule?":** it applies beyond one feature, and breaking it would be a mistake even in code
that hasn't been written yet. *"A day in the month view holds 10 lines"* is a feature decision (stays in its plan).
*"Never refuse silently: say why, next to where it happened"* is a rule (it came from that feature, and it applies
everywhere).

---

## 3. How each rule is written

Every rule takes the same shape, so it can be scanned, cited and checked:

```markdown
### UX-4 · Right-click menus carry only what that cell needs
**Rule:** Add a menu item only if it's what people reach for on THAT cell and the cell has no one-gesture way to
do it already. Never Swap column, never Add note. Count the lines on the busiest cell; a long menu is a defect.
**Why:** a 17-line phase menu was mostly duplicates of double-click, Delete and ⌥←.
**Owner:** *"I want you to be more cautious in adding extra buttons to the right click menu"* (23 Oct 2026)
**Applies to:** Waterfall, Month view · **Held by:** review only
**Status:** In force
```

- **ID**: a chapter prefix plus a number (`REL-1`, `FILE-3`, `UX-4`). Never reused and never renumbered, so it can be
  cited in code comments, commit messages and plans ("per FILE-4").
- **Rule**: one or two sentences, said as an instruction.
- **Why**: the incident or reason, in one or two sentences. Longer history links out.
- **Owner**: the quote and date that made it. A rule a session worked out from an incident says *Derived* and
  stays **Proposed** until the owner confirms it.
- **Applies to**: Whole app / Waterfall / Month view / Exports / Save & load / Process. Product rules also say
  **Studio / Show / Both**, the two audiences.
- **Held by**: the check that holds it (`npm run check`, a gate leg, a hook), or *review only*. This column shows
  which rules depend on someone remembering them.
- **Status**: In force · Proposed · Superseded by X (date) · Withdrawn (date). **Nothing is deleted.** Old wording is
  struck through and points at its replacement, the way CLAUDE.md already handles withdrawn rules.
- **Exceptions**: listed under their rule with dates, one line each, linking to the detail. Example: the nine
  owner-approved, screen-only exceptions to the frozen month view become nine one-line entries under the freeze rule,
  and their implementation detail moves out to `MANTINE-SEAM.md`.

---

## 4. The chapters, with a first-cut inventory

This is what an hour of reading turned up. Phase 1 (§7) does the full sweep. Sources in brackets.

### REL: Shipping and releases
| ID | Rule |
|---|---|
| REL-1 | Never push without a fresh approval for that specific push, asked with a picker. "Looks good" isn't approval, and one approval doesn't cover the next push. [CLAUDE, HANDOFF §5a] |
| REL-2 | After an approved push, confirm the live address serves the change before calling it shipped. [CLAUDE] |
| REL-3 | Run `git log origin/main..main` right before any push, because other sessions commit on `main`. [memory] |
| REL-4 | Commit locally while working. Commit messages say what changed, why, and what was checked. [HANDOFF §5e] |
| REL-5 | Changelog every substantial change in `README.md`, written with the code. [CLAUDE] |
| REL-6 | A version cut is: `APP_VERSION` + `version.json` + `package.json`, changelog, tag, `releases/` copy, a new fixture. *(reconciles contradiction 3)* [CLAUDE, check-build] |
| REL-7 | What's New lists only things users would care about, in plain words, with nothing confidential. [CLAUDE, 19 Nov] |
| REL-8 | To roll back, deploy the previous release. Never serve the root `index.html`. [CLAUDE, D7] |
| REL-9 | Run the full gate for anything that can change a grid cell, an export or a saved file. A chrome-only CSS or label change needs `npm run check`, the legs that touch it, and a browser check. [CLAUDE, memory] |
| REL-10 | When several features are waiting on gates, put them on one release branch and run one gate. [memory] |

### FRZ: The frozen surface
| ID | Rule |
|---|---|
| FRZ-1 | The grid, the width model and the writers are frozen. Read the freeze by its **symbol list**, never by the word "grid". [CLAUDE] |
| FRZ-2 | The exports look exactly as v1.0.0's build made them, from the same render engine. [HANDOFF §4, 29 Aug] |
| FRZ-3 | The waterfall editor's look is frozen too: formatting, auto-shrink, font, size, widths, heights. [29 Aug] |
| FRZ-4 | A frozen edit needs the owner's approval, plus a measured acceptance gate agreed beforehand. Each approved one is listed as an exception. [CLAUDE] |
| FRZ-5 | Before calling a request "blocked by the freeze", try the three sanctioned patterns. [CLAUDE] |
| FRZ-6 | No third-party CSS may reach the frozen surface. Re-verify on every Mantine upgrade. [CLAUDE] |

### FILE: Saved calendars
| ID | Rule |
|---|---|
| FILE-1 | Every calendar saved by any version opens in every future version. [CLAUDE] |
| FILE-2 | Snapshot keys are permanent: never rename, remove or repurpose one. [CLAUDE] |
| FILE-3 | `fields.byId`'s element ids and `PHASE_COLOR_OPTIONS`' order are part of the file format. Append only. [CLAUDE] |
| FILE-4 | Restore unconditionally. A missing key gets a new calendar's default, never what's already in memory. [CLAUDE] |
| FILE-5 | New state goes into capture, restore, resets, the shift re-key and `savedFieldDefault()`. [CLAUDE] |
| FILE-6 | Transient UI and preferences never get an id outside `.prefs-card` / `.tools-menu`. Preferences live in `localStorage`, never in the file. [CLAUDE] |
| FILE-7 | Bump `SNAPSHOT_VERSION` only when an older build must refuse the file. [CLAUDE] |
| FILE-8 | A file from another machine is read with `parseUntrustedJson()`. [CLAUDE] |
| FILE-9 | Never convert a file without asking. The first save always opens the picker. [CLAUDE] |

### PRD: What the product is for
| ID | Rule |
|---|---|
| PRD-1 | As easy as Outlook or Excel. Clutter is a defect: fix it by removing, merging or hiding, never by adding a setting. [memory, 20 Oct + 12 Nov] *(Corrected 23 Nov 2026: the owner's words are "hiding until relevant", and folding controls that apply needs a mockup and the owner's yes: UX-3.)* |
| PRD-2 | SPTCal replaces Excel for waterfalls and replaces other builders for month calendars. Formatting lives in the app, and the export isn't the place to finish a calendar. [memory, 23 Oct + 12 Nov] |
| PRD-3 | Automate by default, and give an override on the thing itself that can be undone, has a way back to automatic, and is never silently overwritten. [memory, 12 Nov] |
| PRD-4 | Two audiences. Studio: waterfall and month view, change-and-send in under 10 minutes, many scenarios. Show: month view only, dense and daily. Judge every decision per audience. [memory, 12 Nov] |
| PRD-5 | Installed app only, behind the sign-in. Chrome is the tested browser, and Windows must be tested. *(reconciles contradiction 7)* [CLAUDE, memory] |
| PRD-6 | On screen, the month view looks like its PDF. [CLAUDE, 16 Nov] |

### UX: Look and interaction
| ID | Rule |
|---|---|
| UX-1 | Direct manipulation over dialogs. Double-click means "back to automatic". [HANDOFF §6] |
| UX-2 | Editors are popovers anchored to what they edit, never markup inside the grid. [HANDOFF §6] |
| UX-3 | The preview never jumps on an edit. [HANDOFF §6] |
| UX-4 | Right-click menus are lean (example above). [memory, 23 Oct] |
| UX-5 | Flag a state with a dot or badge rather than spelling out counts. Drop confirmations when nothing is lost. [memory, 22 Oct] |
| UX-6 | New chrome uses the app's Mantine theme: navy, warm greys, Inter, 7 / 10 px radii. [memory] |
| UX-7 | "Same style as X" means X's colours only: keep the shape, and ask before changing geometry. [memory, 30 Oct] |
| UX-8 | Never refuse silently. Say why, next to where it happened. [CLAUDE, row limit] |
| UX-9 | Undo covers everything. [memory, 12 Nov] |
| UX-10 | Show a control only when it's relevant. Engine words (slot, lane, stint) never appear in the UI. [memory] |
| UX-11 | The filled button is the PDF export. There's no footer. [HANDOFF §6] |

### COPY: Words
| ID | Rule |
|---|---|
| COPY-1 | The UI says **Load**, and the code keeps "open". User words can change without code ids changing (Tandem / double-up, Build Around / `pop-solve`). [CLAUDE] |
| COPY-2 | A moved date is "Pushed 2 wks" / "Pulled 1 day". Counts keep + and −. [memory, 23 Oct] |
| COPY-3 | A description says only what sets an option apart. Anything true of every option is left out. [HANDOFF §6] |

### SEC: Confidentiality and security
| ID | Rule |
|---|---|
| SEC-1 | No studio-identifying information or real schedules in the repo. Fixtures are synthetic, and one that reproduces a bug is proven red on the build before the fix. [fixtures README, memory] |
| SEC-2 | Example calendars the owner shares stay in the conversation and never go into a file. [memory] |
| SEC-3 | Anything new that loads from a new place has to fit the CSP by hand. [CLAUDE] |
| SEC-4 | Never publish to an address the sign-in doesn't cover. The installed identity (manifest id) never changes without a plan. [CLAUDE] |

*The reasons behind SEC-1 and SEC-2 stay in private memory. While the repo is public, this chapter keeps its wording
general, the way HANDOFF already does.*

### WORK: How we work together
| ID | Rule |
|---|---|
| WORK-1 | Explain exactly how something will work before building anything substantial. Use mockups when the layout is undecided. [HANDOFF §5c] |
| WORK-2 | For UI changes, hand over a working build to try in the browser first. Tests, docs and push come after "finish it". [memory, 9 Nov] |
| WORK-3 | Put decisions to the owner as plain questions with the recommendation first. Decisions belong to the owner. [memory] |
| WORK-4 | One thing at a time. Don't pad estimates. Re-examine a finding when it's questioned instead of defending it. [HANDOFF §5c] |
| WORK-5 | Report evidence from a real browser, with numbers. Say what wasn't checked. [HANDOFF §4] |
| WORK-6 | Every feature the owner mentions goes on the tracker. [memory, 21 Oct] |
| WORK-7 | Keep HANDOFF current in the same commit as the work. Warn before the context runs long. [CLAUDE] |
| WORK-8 | Check plan usage before any large multi-agent run. [memory] |
| WORK-9 | Mockups keep working in a narrow pane: calendars scroll sideways and never squeeze. [memory] |

### TEST and CODE: Engineering habits
| ID | Rule |
|---|---|
| TEST-1 | Test on Chrome only, with Windows required. [memory, 13 Nov] |
| TEST-2 | Sanity-check your own measurements before reporting them. Re-run a failure alone before calling it a flake. [HANDOFF §4, memory] |
| TEST-3 | A gate baseline is re-cut only on the owner's picker, with the reason recorded beside it. [CLAUDE] |
| CODE-1 | Comments explain *why*. Keep existing ones when editing nearby. [HANDOFF §5f] |
| CODE-2 | Docs name symbols, never line numbers. [CLAUDE] |
| CODE-3 | The product is one self-contained file. [CLAUDE] |
| CODE-4 | Dates are UTC midnight, using the helpers. The deliberate scheduling behaviours are not bugs to fix. [CLAUDE, HANDOFF §4] |
| CODE-5 | Holidays are generated from rules, never hand-edited, and a holiday's name (its id) is never changed. [CLAUDE] |

That's about **75 rules**. The full sweep will add some, mostly app-wide rulings now buried in plans and HANDOFF
entries, and will merge others.

---

## 5. How it fits with the other documents

```
GOVERNANCE.md   the rules: what must always / never be true, and why      ← read first, every session
CLAUDE.md       slimmed: imports GOVERNANCE.md, how to run / build / test, a map of the code
HANDOFF.md      status only: in flight, owed, learned this week
README.md       changelog: what shipped
PROJECT-CONTEXT / MANTINE-SEAM / UI-CONVENTIONS    reference: how it works
*-PLAN.md       one feature's design and its own rulings
memory          private only: reasons that can't be public, other projects
```

Three changes make this work:

1. **CLAUDE.md loads the sheet automatically.** Claude Code reads `CLAUDE.md` into every session and follows
   `@GOVERNANCE.md` imports written in it, so the rules reach **every session, worktrees included**. That fixes
   the gap private memory has today.
2. **CLAUDE.md shrinks.** Its rules move to GOVERNANCE.md and its implementation detail moves to the reference
   docs. Each rule's old location keeps a one-line pointer to its new ID, so nothing appears to vanish.
3. **HANDOFF keeps recent entries only.** Dated entries older than the current version move to monthly archive files
   (`handoff/2026-10.md` …). Any lesson in them that is really a standing rule gets promoted into GOVERNANCE.md first.
   *(This is the biggest change to how HANDOFF works, so it's a separate decision in §9.)*

---

## 6. How a rule is made, changed and retired

- **Only the owner makes a rule.** A session may *propose* one (from an incident, or a pattern across rulings). It
  goes in as **Proposed** and doesn't bind anyone until the owner says yes.
- **Spotting one:** when the owner says something that sounds standing (*"this goes for everything"*, *"from now on"*,
  *"universal rule"*, *"always"*, *"never"*), the session drafts the rule entry, shows it, and on a yes adds it in the
  same commit as the work. The same goes for a feature ruling that turns out to apply app-wide.
- **Changing one:** edit it in place. The old wording is struck through with its date and a pointer to the new one.
  When two rulings conflict, the newer one wins, and the entry records that it supersedes the older one.
- **Feature rulings** (R1, R2… in a plan) stay in the plan unless they apply beyond that feature.
- **Drift check at every version cut:** reread the sheet against CLAUDE.md, HANDOFF's recent entries and that
  version's changelog, and fix anything that disagrees, the way the seven contradictions in §1 should have been
  caught.

---

## 7. Building it

| Phase | What happens | Done when |
|---|---|---|
| **0. Decide** | The owner answers §9. | Answers recorded here. |
| **1. Sweep** | Read every source in §1 for standing rules, each with its source and date. HANDOFF's 17,650 lines of entries are most of the work. It can be split across a few reader agents, sized against plan usage first (WORK-8). | A full inventory table (working file, not committed). |
| **2. Reconcile** | Merge duplicates. List every contradiction, the seven above included, and put each to the owner as one picker question. | Each conflict ruled. |
| **3. Draft** | Write `GOVERNANCE.md` in the §3 format. The owner reviews it **one chapter at a time**: accept, reword or drop each rule. | Every rule is In force or Withdrawn, none still Proposed. |
| **4. Rewire** | Slim CLAUDE.md and add `@GOVERNANCE.md`. Turn HANDOFF §0 / §4 / §5 / §6 into pointers. Point memory's rule files at their IDs. Fix the reading order everywhere. Archive old HANDOFF entries if the owner chose to. | One reading order, no copies of a rule anywhere, and CLAUDE.md under its target size. |
| **5. Hold** | Add `tools/check-governance.mjs` to `npm run check`: IDs unique, every rule has Why / Owner / Status, every "per XXX-N" cited in code or docs names a real rule. Fill in each rule's "Held by". | Check green. Each "review only" rule is a known, listed gap. |
| **6. Keep it alive** | The §6 process, plus the drift check at each version cut. | Ongoing. |

### 7a. ✅ Phase 1 done (21 Nov 2026)

- **Where:** `governance-work/` in the main checkout. It's kept out of git by `.git/info/exclude`, so a worktree session
  won't have it. `BRIEF.md` is what every reader followed, `sweep/*.jsonl` holds the nine readers' raw entries,
  `merge.py` builds `INVENTORY.md` and `all.json`, and `check.py` validates the files.
- **Readers:** eight Sonnet agents (HANDOFF in four parts, the plans in two, README, the reference docs), plus CLAUDE.md
  and private memory read by hand. Cost: 5-hour window 28 → 39%, weekly 75 → 77%.
- **Result:** **584 candidate entries**: 178 UX, 69 FRZ, 65 FILE, 53 PRD, 50 WORK, 44 REL, 37 TEST, 35 CODE, 27 SEC,
  24 COPY, 2 OTHER. 319 come from the owner and 265 are derived. **60 conflicts** were noticed and **13 entries are
  superseded, withdrawn or unclear.** The same rule usually appears several times in different words: grouping by
  word overlap only cut 584 to 536, so Phase 2 does the merging by reading them.
- **Quotes checked:** of 281 owner quotes, 260 appear verbatim in the docs. The 21 that don't are paraphrases or picker
  labels; they're marked ⚠ and must not be shown as the owner's words.
- **Coverage, honestly:** HANDOFF's mid/late-Oct part was read line by line. The other three HANDOFF parts were read
  through every owner quote, ⛔ line, keyword hit and heading, with full reads of the numbered sections and the likeliest
  passages, but not every line. Plans and README were searched first, then read around each hit. A rule the owner gave
  with no quote and no keyword can still be missing. Phase 2 can run a gap pass on those parts if wanted.
- ⚠️ **A known miss, found 21 Nov:** the owner's 31 Aug ruling that descriptions go behind the small grey ⓘ was
  missing. It lives in README's "descriptions became hover cards" entry and `src/chrome/InfoHint.jsx`'s comment, and
  is now written into draft rule UX-4. **The code comments were never swept:** they name the owner about 1,150 times
  (781 in `src/legacy/app.js`, 190 in `legacy.css`, about 160 in `src/chrome/`). Most repeat HANDOFF, but some rulings
  live only there. A grep-first pass over them is the cheapest way to close the gap before Phase 3.
- ✅ **The code-comment sweep, done 21 Nov (owner: "Sweep comments first").** `governance-work/comments/` holds the
  pieces. Every comment block mentioning the owner or a ruling (about 1,600 mentions in 31 files of `src/` and `tools/`)
  went into three hunk files. Three Sonnet readers compared them against the draft (`RULES-INDEX.md`), and
  `comments/check.py` verified every quote word for word against the source. They found **15 things**, all now in
  the draft:
  - **8 new rules:** PRD-12 an online app that says so; UX-42 one notice strip at a time; UX-43 an editing surface never
    restyles on focus; COPY-11 every date follows day/month order; COPY-12 keyboard hints per computer; FRZ-18 editing
    aids never print; FILE-21 Load restores the calendar, not the saver's screen; TEST-15 install probes use a
    throwaway profile.
  - **5 additions:** removed dropdown options stay hidden; fields.byId order; toolbar buttons grey in place rather
    than hide (an exception to UX-3); a view switch isn't an unsaved change; never ship a grip before its behaviour.
  - **UX-38 corrected:** since the owner's D6 (a) (13 Nov), Enter saves and Esc keeps typed text in the note editors.
  - Most comment rulings repeated rules the draft already had. **The draft is now 189 rules.**
- **Confidentiality:** a grep for studio, company, personal and email names over all entries found none (three hits in
  file names and the old Pages address were cleaned up by `merge.py`).

### 7b. ✅ Phase 2 done (21 Nov 2026)

- **Merge:** four Opus agents merged the 584 entries chapter by chapter (`MERGE-BRIEF.md`, `merge/out-*.jsonl`).
  `finalize.py` then folded 21 cross-chapter duplicates together (the month-view-looks-like-its-PDF rule had come
  out three times; the CSP, installed-identity, restore-path, holiday and single-file rules twice each), applied the
  owner's rulings, and numbered the result. `combine.py` checks that every one of the 584 entries sits in exactly one
  merged object.
- **Result:** **181 rules**: PRD 11, UX 41, COPY 10, FRZ 17, FILE 20, SEC 11, REL 14, WORK 24, TEST 14, CODE 19. Also
  **78 feature decisions**, which stay in their plans, and **22 reference notes** for the reference docs. **61 doc
  fixes** across 31 docs form Phase 4's punch list. IDs are provisional until `GOVERNANCE.md` lands.
- **Quotes:** 146 rules carry an owner quote, and every one is verbatim. One quote that appears in no doc was removed.
- **The owner's rulings, 21 Nov 2026 (pickers), each marked ⚖ in the draft:**

| Rule | Question | Owner's pick |
|---|---|---|
| REL-4 | May a session commit without asking? | **Branch commits free**; merge into main and every push are asked |
| REL-6 | Which changes need the full gate? | **All but chrome-only**, before any push that changes behaviour, a grid cell, an export, a saved file or a dependency, or cuts a version; the owner can waive it by picker. Replaces the 18 Sep policy |
| FRZ-13 | Is the month-PDF writer frozen? | **Its output is**: a moved page needs the owner's yes plus gate 13. Its code may be tidied |
| FRZ-3 | Does the waterfall editor's look follow its PDF? | **Decide with that plan** (WATERFALL-PDF-LOOK-PLAN); until then the 3 Sep gridline ruling stands |
| UX-3 | May controls that apply be folded away to cut clutter? | **Case by case** (against the recommendation of no folds for clutter): the phase cards stay unfolded; anywhere else, a fold needs a mockup and the owner's yes |
| UX-1 | Is a refusal a note or a dialog? | **Note for edits, dialog for jobs**: a refused edit gets a short note by the spot; a failed export or load keeps its dialog |

- **Size: the plan's target can't be met in the §3 format.** The rules alone run to 133 KB against the 50 KB target,
  because each one carries its history, exceptions and sources. **Proposal for Phase 3:** `GOVERNANCE.md` holds only
  ID, title, rule, a one-line why and the owner's quote (about 50-55 KB for 181 rules). Each rule's history,
  exceptions and sources go into a companion `GOVERNANCE-HISTORY.md`, keyed by the same IDs. Sessions read the first
  and consult the second.
- **Review load:** 181 rules is too many for one picker each. **Proposal:** per chapter, show its rules one line
  each, then one picker: *accept the chapter* / *I'll name changes*, with per-rule pickers only for the rules you name.
  Derived rules (engineering lessons you never stated yourself) are marked so you can accept them as a block.

### 7c. Phase 3 under way: the review page (21 Nov 2026)

- **Two-file draft:** `governance-work/make_gov.py` writes `GOVERNANCE.md` (rule, one-line why, owner's words,
  exceptions) and `GOVERNANCE-HISTORY.md` (history, dates, sources) from `rules.json`, applying `review.json`. The
  rules file comes out at **102 KB, not ~50**, because the rule wording itself is long. Tightening it or accepting
  the size is the owner's call at the end of review.
- **The PRD chapter was accepted as written** in chat (owner: "Accept as written").
- **The review page:** https://claude.ai/artifact/5BFJezZG1edDdq2GtAaN5q ("SPTCal Rules Review", private). It shows
  every part of the draft: the sheet's 4 intro parts, all 189 rules, and their 29 exceptions. Each part has Accept /
  Decline / Edit, a note for Claude, and "Accept the N left in this chapter"; each chapter has "Suggest a new rule".
  Picks save to the page's database (`db` capability). Built by `governance-work/review-page/build.py` from
  `template.html`; rebuild and republish the same file path to keep the URL. The 12 PRD rules were seeded as
  accepted (`via: "chat"`).
- **Reading the picks back:** ArtifactData `list` on collection `reviews` (one doc per rule ID: `status`
  accepted | declined | edited, edited `title` / `rule` / `why`, `note`, `exc: {index: {status, text}}`) and on
  `additions` (suggested new rules: `ch`, `title`, `rule`). An exception with no pick follows its rule. Then write
  them into `review.json` and rerun `make_gov.py`.

Phases 1–3 touch no app code and nothing a user sees, so none of them needs a gate or a push. Phase 4 changes
CLAUDE.md and HANDOFF.md, which every session reads, so it lands as a single commit after the owner has reviewed it.

---

## 8. Optional: machine checks for rules that rely on memory today

Two rules have already been broken by a session that forgot them, and nothing currently stops either. Each of these
is optional. *(Owner, 21 Nov 2026: build the push guard and the rule reminder; no tracker Rules tab.)*

- **A push guard** (a git `pre-push` hook): refuses unless the push names the commit it was approved for
  (`SPTCAL_PUSH_OK=<sha> git push`). That turns REL-1 from a promise into a step that can't be skipped. It's harmless
  for the owner's own pushes from a terminal: they'd just set the variable.
- **A standing-rule reminder** in the same style as the tracker's: a prompt hook that reminds every session to draft
  a governance entry when the owner's message sounds like a standing rule.
- **A rules view on the feature tracker:** a third tab beside Features and Audit that lists the rules by chapter.
  It's read-only, because the file stays the source.

---

## 9. Decisions for the owner

### ✅ Answered by the owner, 21 Nov 2026 (pickers)

| # | Decision | Owner's pick |
|---|---|---|
| 1 | Where it lives | **Repo file**: `GOVERNANCE.md`, imported by CLAUDE.md |
| 2 | How wide | **SPTCal only** |
| 3 | Slim CLAUDE.md | **Yes, trim it**: rules move to GOVERNANCE.md, how-the-code-works notes to the reference docs, with a one-line pointer left for each |
| 4 | Archive HANDOFF | **Yes, keep this version's entries**; older ones go to monthly files, after any standing rules in them are promoted |
| 5 | Cite rule IDs | **New work only** |
| 6 | Machine checks | **Push guard** and **Rule reminder**. No Rules tab on the tracker |
| 7 | Review style | **Chapter by chapter** in chat, with pickers to accept, reword or drop each rule. ⚠️ **Changed by the owner the same day**, after the PRD chapter was accepted in chat: *"can you give me an interactive page to accept/decline/edit every single part of the governance doc"*. The review now runs on a private claude.ai page (§7c) |

What that settles for the build:
- Phase 4 includes the CLAUDE.md trim and the HANDOFF archive (`handoff/YYYY-MM.md`, entries before the current
  version's cut).
- Phase 5 includes the `pre-push` guard and a `UserPromptSubmit` reminder hook. The push guard is a change to how
  every push works, the owner's own included, so its exact shape (`SPTCAL_PUSH_OK=<sha>`, and whether it lives in
  the repo's `.githooks/` or only on this Mac) is shown before it's installed. Both hooks are installed only on the
  owner's yes, the way the tracker hook was.
- Phase 3 goes one chapter per review round: the rules, then a picker per rule that's new, reworded or contested.

The questions as they were put, kept for the record:

1. **Where the sheet lives.** *Recommended:* `GOVERNANCE.md` in the repo, so every session reads it. The alternative
   is a claude.ai doc you can comment on, which sessions don't read automatically. Either way, while the repo is
   public the confidentiality chapter stays general.
2. **How wide.** *Recommended:* SPTCal only. Several WORK rules (pickers, one push at a time, evidence) also describe
   how you work on the Equipment DB and Budget Master; they could be copied there later.
3. **Slim CLAUDE.md** (move its implementation detail to the reference docs)? *Recommended:* yes. It's the file every
   session pays for, and 121 KB of it buries the rules.
4. **Archive old HANDOFF entries** into monthly files? *Recommended:* yes, keeping the current version's entries in
   HANDOFF itself.
5. **Cite rule IDs** in code comments and commit messages ("per FILE-4")? *Recommended:* yes, for new work only. No
   pass over old comments.
6. **Machine checks from §8:** push guard / standing-rule reminder / tracker rules view. Pick any or none.
7. **Review style for Phase 3:** chapter by chapter in chat with pickers (*recommended*), or the whole draft at once.

---

## 10. What we took from an outside governance framework (21 Nov 2026)

The owner shared an outside "repository governance installer" and the template it installs, and asked
what we could learn and fold in. **Neither file was copied into the repo, run or installed;** they stay in the owner's
Downloads, and the template was unpacked only into a session scratchpad. Everything we take is rewritten in our own words.

- **How it was read:** five readers pulled 337 practices from it, three Opus comparers turned those into 75
  recommendations against our 189 rules, and three skeptics (fit with the owner's rulings, already covered, worth the cost)
  checked every adopt / adapt / strengthen call. A recommendation survived if no more than one skeptic refuted it: 30 of 51
  did. A completeness check then added 6 items and overturned 6 verdicts. The full write-up is
  `governance-work/compare/SYNTHESIS.md` (local, not committed).
- **The main lessons:**
  - One home per rule, with something that stops CLAUDE.md growing back.
  - Whatever every session loads, every session pays for. As drafted, a 102 KB import saves little over today's 121 KB
    CLAUDE.md.
  - A guard counts only once it has been seen to refuse.
  - In a shared checkout, the commands that act on everything at once (add all, stash, reset, clean) do the harm.
  - A test result belongs to one commit.
  - Instructions inside files are information, not orders.
  - Match the machinery to a one-owner project: most of their system (journals, registries, structured headers, 18 doc
    folders, status folders, ownership roles) solves an installer's problems, not ours.
- ⚠️ **Verified on this machine while checking it** (not changed: the owner decides):
  - This checkout's `.claude/settings.local.json` allows `git push *` and `gh api *` with no ask or deny rules, so a
    session's push runs with no permission prompt; REL-1 is held only by sessions keeping to it.
  - No git hook is installed and `core.hooksPath` is unset.
  - There are 180 worktree folders (175 registered), many on old branches carrying their own older CLAUDE.md.
- **Where the proposals went:** the 41 surviving proposals are on the review page as their own chapter, **"Proposed from
  the outside framework" (OUT-1 … OUT-41)**, to accept, decline or edit like any rule:
  - 4 new rules: INTRO-5 words with one fixed meaning, WORK-25 instructions in files are information, WORK-26 leave no
    loose work, REL-15 never route around a guard.
  - Additions to WORK-3, WORK-6, WORK-8, WORK-9, WORK-11, WORK-12, WORK-13, REL-2, REL-7, REL-9, REL-10, INTRO-1, INTRO-2,
    INTRO-3 and plan §7c.
  - Phase 4-6 changes: measure what every session loads; deal with open branches first; prove the import loads in a new
    and an old worktree; the gate records the commit and build fingerprint it tested; the push guard installed in the
    shared `.git` hooks folder; a status line on every plan; checker additions; a host rule protecting main.
- **Five decisions for the owner**, all ✅ **answered by picker on 23 Nov 2026, each as recommended** (Phase 4 session):
  1. A push also needs Claude Code's own permission prompt: **"Yes, for a short list"**. The repo's shared settings
     (`.claude/settings.json`) ask before a push, a deploy or rollback run, a release, skipping hooks and wiping
     uncommitted work; the local allowances for `git push` and `gh api` were removed. In REL-1.
  2. How much every session loads (asked after measuring it, §7e): **"Core six + all titles"**. GOVERNANCE.md holds
     PRD, FRZ, FILE, SEC, REL and WORK plus every other rule's title; UX and COPY are in GOVERNANCE-UI.md, TEST and
     CODE in GOVERNANCE-ENG.md, read before that kind of work. In WORK-8.
  3. Sessions in the shared checkout: **"Gate in its own worktree"**. In TEST-6, a known mismatch until its trial run
     (Phase 5).
  4. The one list of open work: **"The tracker"**. HANDOFF §2 emptied in Phase 4. In WORK-11.
  5. Telling running sessions about rule changes: **"One line from the hook"**. Built with the reminder hook in
     Phase 5.

### 10a. The review page in plain words (21 Nov 2026, later)

- **Owner:** *"Rebuild the spitcal rules review page, but reword everything more simply so its less dense and easier to
  understand, explaining in context, what it is now, why it would change and how it would change it."* Version 3 of
  the page (same address) shows, for every item, a plain title and a one-sentence gist, then **Today / Why / What
  changes**, the owner's words, and the exact wording folded away. Editing changes the gist and the exact wording.
- **How it was written:** six writers took the 236 items (4 intro parts, 189 rules, 43 proposals) under
  `governance-work/plain/BRIEF.md`, and two editors checked meaning and cut density (`plain/check-*`, `plain/fix-*`).
  That gave 7 meaning fixes (UX-4, UX-18, UX-23, REL-1, SEC-6, OUT-2, OUT-15) and every part at most ~60 words.
  `plain/lint.py` checks coverage, length, jargon and names. `review-page/build.py` reads the plain files, with fixes
  overriding.
- **Changes from the Single HTML file architecture session** (its facts checked on origin/main):
  - FRZ-4 points at the live frozen-code lock.
  - OUT-14 protects the lock's script, not its list, which changes with each approved frozen edit.
  - The comment sweep's "saved-field order is load-bearing" addition to FILE-3 is dropped: HANDOFF 20 Nov shows
    nothing reads that order.
  - CODE-5 (one file) carries **"Suggested: decline"**: its reasons are stale, and the owner told that session the
    app probably shouldn't stay one file.
  - Two new proposals: **OUT-42**, the lock file becomes the one frozen list, and **OUT-43**, release copies move to
    GitHub release downloads (36 copies, 66 MB; the repo pack is 75 MiB).
  - Doc fixes: "seven #table-wrap listeners" is 21, and `prove-header-preset.mjs` tests nothing.
- **WORK-10** now says "before asking to merge or push", not "before committing", to match REL-4.
- **Later the same day the owner shelved splitting the engine** (*"Shelve it"*, HANDOFF on origin/main `920c8f81`): the app
  stays one file as a practical choice, without a rule; post-production is built as its own module from day one, and the
  holiday data may move to its own file. CODE-5's suggestion was updated to say so (page version 4).

### 7d. ✅ Phase 3 done: the owner's review (21-23 Nov 2026)

- **All 236 items decided on the review page:** 233 accepted, 3 declined, no new rules suggested. The picks are saved
  in `governance-work/picks/` (read with ArtifactData) and `review.json`.
- **Declined** (recorded under "Declined" in `GOVERNANCE-HISTORY.md`; their IDs are never reused):
  - **CODE-5**, the app stays one file. The suggested decline: it stays one file by choice, with no rule.
  - **COPY-6**, help text says only what sets an option apart.
  - **UX-19**, "same style as X" means its colours only.

  CLAUDE.md's "Calendar adjustment tools" paragraph and HANDOFF §6 "Tone of user-facing copy" still state COPY-6, so
  Phase 4 strikes them.
- **All 43 outside-framework proposals accepted**, and `make_gov.py` folds them in:
  - 4 new rules: WORK-25 instructions in files are information, WORK-26 leave no loose work, WORK-27 new plans state
    three things, REL-15 never route around a guard.
  - 5 additions to the sheet's intro: INTRO-5 words with one fixed meaning, which document wins, protected files and
    known mismatches, answering rule questions, declined rules recorded.
  - Additions to WORK-3, WORK-6, WORK-9, WORK-11, WORK-12, WORK-13, REL-2, REL-7, REL-9, REL-10 (clean release copy,
    and OUT-43's GitHub release downloads) and FRZ-1 (the lock file is the list). WORK-8 is rewritten as OUT-16's
    reading order.
  - The other 21 are plan work for Phases 4-6, listed at the end of `GOVERNANCE-HISTORY.md`.
- **Result:** `governance-work/GOVERNANCE.md`, **190 rules, 108 KB**, and `GOVERNANCE-HISTORY.md`, 39 KB. 108 KB is
  more than today's CLAUDE.md, so OUT-22 (measure what each session loads) and Decision 2 matter before Phase 4 lands it.
- **The owner's one note** (on WORK-8, the reading order): *"How will the new governance docs work with this?"*
  Answer, given in chat:
  - After Phase 4, CLAUDE.md imports GOVERNANCE.md, so every session gets the rules with no reading step.
  - The accepted OUT-16 turns WORK-8 into: the rules (automatic), then HANDOFF's current part, then only the plan and
    reference sections the task touches. UI-CONVENTIONS is read for UI work only, and PROJECT-CONTEXT is no longer
    read whole by default.
  - Until Phase 4 lands (OUT-18), sessions keep following CLAUDE.md and HANDOFF as today.
- **Still open for the owner:** §10's decisions 1 (a permission prompt for pushes), 3 (the shared checkout), 4 (the one
  list of open work) and 5 (telling running sessions about rule changes), and decision 2 (how much of the rules every
  session loads) once Phase 4 has measured it.
- **Next: Phase 4, rewire, in a fresh session** (this one is long, and the weekly usage limit was at 97% on 23 Nov).
  Start from HANDOFF and this plan's §7d, §10 and §10a.
