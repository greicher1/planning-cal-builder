# GOVERNANCE-ENG.md: SPTCal's rules, testing and engineering

*Part of SPTCal's rules: GOVERNANCE.md holds the introduction (how rules change, which document wins, the words with one fixed meaning) and every other chapter, and loads into every session by itself. Read this file before changing code, tests, the build or the harness, and before any gate. Edited by hand only; history in GOVERNANCE-HISTORY.md under the same IDs.*

<a id="test"></a>
## TEST: Testing

### TEST-1 · Test on Chrome only, and always cover Windows
Chrome and Edge are the supported browsers (others get a notice). Test on Chrome only, not Edge, and make sure Windows is covered: through the Windows test runners (each push to them owner-approved) or a person at a PC.
<br>*Why:* Users run Chrome; studio coordinators use Windows, and every audit run had been on a Mac. · *Owner:* "no need to test edge, only chrome, but do test windows" (2026-11-13)

### TEST-2 · A single test never proves nothing regressed
Use a single test (leg) to see behaviour. Only the full gate's comparisons against the baselines prove non-regression.
<br>*Why:* Running one leg writes a result that nothing compares against the baselines. · *Derived*

### TEST-3 · A new test must fail on the build before the fix
Prove a new test is red on the build before the change and on mutants of the change, putting the source back afterwards and checking it with cmp. A test that guards the save format, an export or a date goes into gate.sh the day it is written.
<br>*Why:* A test that passes on the old build proves nothing; mutants caught two that could never fail. · *Derived*

### TEST-4 · Re-cut a baseline only on the owner's picker
Re-cut a gate baseline only when the owner signs off by picker after seeing what moved (old / new / difference sheets, or a line-by-line list), and record the reason in the baseline's README, saying so when it is only a key-set change. Never re-cut a baseline because it went red.
<br>*Why:* 'The baseline was red so I re-cut it' is how real regressions get hidden. · *Owner:* "Yes, update the gate 13 month PDF baselines to the outlined version, then run the full gate." (2026-10-21)
- Exception, 2026-10-02: a compressor-only month-PDF change may be re-cut with its proof recorded and the owner told (ruling 4)

### TEST-5 · Re-run a failure alone before calling it a flake
Before calling a failure a flake, delete its old result file and re-run that test alone through gate.sh's own evaluator on the same build. A test that wrote no result is contention until proven otherwise. Watch long gates for a hung test.
<br>*Why:* Many gate failures were load flakes that passed alone, but an old result file can fake a pass or a fail. · *Derived*

### TEST-6 · One full gate at a time, and leave the checkout alone while it runs
Before starting a gate, check that no other gate or queued gate script is running, and stagger with other sessions waiting on the same one. Run it on a quiet machine, on power with the lid open. While it runs, don't edit app.js or gate.sh, rebuild dist/, merge into the checkout or clear the result files. Build first: gate.sh tests dist/ as it stands and refuses a stale one. ⚖ The full gate runs in its own throwaway worktree checked out at the exact commit being tested, so other sessions keep working and the result names that commit (picker, 23 Nov 2026: "Gate in its own worktree").
<br>*Why:* Two gates share a port and kill or stall each other; a gate across a closed lid took 789 minutes; clearing results under a live run fakes failures. · *Derived* · *Held by:* gate (refuses a stale build; fails if the build changes mid-run), seen 2026-11-24

### TEST-7 · Pass HARNESS_PAGE=/dist/index.html when testing the build
gate.sh tests the build (/dist/index.html) but run.sh defaults to the legacy root /index.html, so always pass HARNESS_PAGE=/dist/index.html when re-running a test alone. A test that reports nothing is not a test that passed.
<br>*Why:* Re-running a leg alone has silently tested a different program and passed while the build failed, three times. · *Derived*

### TEST-8 · Run single tests on a private port
Run a single test on its own HARNESS_PORT, checking it with lsof first in a separate command. The default port is shared, run.sh and the CDP scripts kill any server on their port, and no port is reserved between sessions; never use the default port while a gate may be running.
<br>*Why:* Sessions have repeatedly killed each other's servers, gates included, or tested another worktree's build. · *Derived*

### TEST-9 · Test loading with real files saved by old builds
Prove the load path with files the old builds themselves saved (the v1.0.0 saved calendar and the fixture cut at every version), never with files the current code wrote.
<br>*Why:* A round trip through today's code proves nothing about old files, and synthesised files miss what real saves contain. · *Derived* · *Held by:* gate (gate 4, rowmigrate, blocks: files old builds saved), seen 2026-11-24

### TEST-10 · A dispatched event doesn't prove a gesture works
For any new control, check that it is really what sits under its own centre (document.elementsFromPoint), and drive real clicks where it is a gesture.
<br>*Why:* A pill that received no mouse press (it inherited pointer-events:none) shipped as 'verified'; the same trap was paid for twice. · *Derived*

### TEST-11 · Tests wait for the thing, never a fixed time
A test waits for the state it needs (the restored calendar after a Load, not a menu label), never a fixed sleep. Under virtual time requestAnimationFrame never fires, so supply frames for a gesture and assert what moved, not how far.
<br>*Why:* One leg passed on luck for a day, and fixed sleeps raced the import. · *Derived*

### TEST-12 · Measure what the user sees
Measure where things sit on screen, not raw scroll values. Keep requestAnimationFrame off any path a test must reach, bring the browser pane to the front before measuring anything that needs it, and check a quoted Chrome measurement before trusting it.
<br>*Why:* requestAnimationFrame doesn't fire in a hidden pane or headless Chrome, and scroll anchoring made scrollY lie; together they caused several false failures. · *Derived*

### TEST-13 · Test the install screens only through the localhost hooks
Prove the install gate and the 'moved' screens only through the localhost test hooks (?gate=, the localStorage test keys); never point tests at the live address. Headless Chrome can't make an installed app window.
<br>*Why:* There is no other way to reach those screens from a test, and the live address is not a test target. · *Derived*

### TEST-14 · Test layout by positions, not only text
Check a layout feature by coordinates, comparing positions across layouts from the real PDF content, not only by what the text says, so a guard doesn't rot when the wording changes.
<br>*Why:* Single Column collapsed the printed header while every check compared only its words. · *Derived*

### TEST-15 · A test that installs the app uses a throwaway profile and another name
Any harness or probe that installs a PWA uses a throwaway browser profile in a temp folder, deletes it afterwards, and names the app something other than SPTCal, because a visible install writes an app beside the owner's real one.
<br>*Why:* A headful install lands next to the owner's installed app. · *Derived*

<a id="code"></a>
## CODE: Engineering habits

### CODE-1 · Every date mover runs in the shoot-day bracket
Anything that moves dates runs inside asShootDayMove(), so Production's day marks travel by shoot-day number; writes a phase's start through setPhaseStart(); and carries the phase's own hiatus and week-keyed stores. A new restore path ends any live nudge burst first. An edge drag isn't a mover: it holds the other end.
<br>*Why:* A mover outside the bracket brings back audit M-4, and one that skipped setPhaseStart() stretched Dates phases.

### CODE-2 · Compute once, and read it everywhere
Work out a layout or rule in one place and have the screen and every writer read it; never keep a second copy that can drift. Keep derived values derived from their inputs, and ask the frozen code for its verdict rather than re-implement it.
<br>*Why:* Free-position side boxes needed no writer change because both read one layout; a header worked out half by guess and half by measurement printed wrong. · *Derived*

### CODE-3 · Dates are UTC midnights, built with the helpers
Handle every date as a UTC midnight through parseDateUTC, addDays, mondayOf and isoOf; weeks snap to Monday. 'Today' is the user's local day turned into a UTC midnight, never Date.now().
<br>*Why:* Raw Date math drifts across time zones; the date picker's Today was wrong near midnight. · *Derived* · *Held by:* gate (datetoday), seen 2026-11-24

### CODE-4 · Holidays are generated, never hand-edited
Holiday lists come from the crew agreements the owner confirmed, generated from rules in tools/gen_holidays.py (2024-2031) and validated, never edited by hand and never fed live. A correction that moves saved calendars is stamped in the file and announced once. A holiday's id (its original name and date) never changes when it is renamed; region caveat text lives only in the generator's BOX table.
<br>*Why:* Hand edits drift, and a renamed holiday silently loses its saved settings. · *Owner:* "a good source of truth" (2026-10-29)
- Exception, 2026-10-29: owner's D4: the corrected Alberta, Manitoba and Nova Scotia lists move calendars already saved there, with the 'holiday list was corrected' strip shown once.

### CODE-6 · Never mix up the two embedded fonts
Carlito is the grid and export face and feeds the frozen width model; Inter is the chrome face and, since October 2026, the month PDF writer's. Touching Carlito changes every export; touching Inter changes the month PDF. Re-run subset-inter.py after fetch-inter.py.
<br>*Why:* Each font reaches different outputs, and confusing them changes exports nobody meant to touch. · *Derived* · *Held by:* check (the month PDF's Inter fonts match this build's Inter), seen 2026-11-24

### CODE-7 · Docs name symbols, never line numbers or live counts
Name functions and symbols in docs, never line numbers; line numbers live only in PROJECT-CONTEXT §14, checked by tools/check-refs.py (which can't see src/legacy/app.js). Don't state a live count in prose; keep an inventory in one place, pinned to a fixture.
<br>*Why:* A wrong line number reads as precision; one commit once invalidated about 107 references twice in a day, and an id count went stale within days. · *Derived* · *Held by:* check (tools/check-refs.py; only warns in the deploy), seen 2026-11-24

### CODE-8 · Comments explain why, and existing ones stay
Code comments explain why (the bug, the browser constraint, the failure), at length when needed. Keep existing explanatory comments intact when editing nearby.
<br>*Why:* The comments are the project's real documentation. · *Derived*

### CODE-9 · Never memoise on currentSchedule for inputs it doesn't carry
A cache keyed on currentSchedule must not cover inputs the schedule doesn't carry (holiday ticks, notes, sizes). A memo like that lasts one synchronous pass and is dropped on markDirty().
<br>*Why:* A holiday tick redraws the same schedule object, so a row height stayed stale until the next edit. · *Derived*

### CODE-10 · Tools that run before anything is dated read the form
A solver or tool that can run before the phases are dated reads its inputs from the form rows, never from currentSchedule.
<br>*Why:* Build Around missed the winter break on a new calendar. · *Derived*

### CODE-11 · Never disarm an input guard with a timer
Drop a click guard on the next press or key, never after a timeout.
<br>*Why:* A timer-disarmed guard ate the next real click ('choose a row, press After' did nothing). · *Derived*

### CODE-12 · Excel headers and footers stay within 255 characters
Keep each Excel header and footer string within 255 characters in total, counted as Excel stores it.
<br>*Why:* One character over and Excel reports the whole file as corrupt. · *Derived* · *Held by:* gate (hdrexcel), seen 2026-11-24

### CODE-13 · Declare new top-level state before any boot code reads it
Declare new top-level state with let near the top of the engine, before any boot code that reads it.
<br>*Why:* Read too early it throws and kills the whole engine; paper size was first declared too late. · *Derived*

### CODE-14 · React portals into the page and never wraps it
React mounts as one root that portals into the existing containers. Never use AppShell or any wrapper that re-parents body's children, and never unmount a component whose listener must attach when the engine starts: render it always and hide it with display.
<br>*Why:* Both print paths select body's direct children, so a wrapping root prints a blank page; a conditionally unmounted listener once left the file menu dead. · *Derived*

### CODE-15 · Share a CSS rule between look-alikes, never a class
When two elements must look alike, share the CSS rule, not the class; a class shared by hosts with opposite constraints is overridden per host, never changed.
<br>*Why:* Colliding classes silently rebound lookups, and a popover's ellipsis clipped the header editor's rail. · *Derived*

### CODE-16 · The deliberate scheduling behaviours are not bugs
Don't 'fix' these: a hiatus pauses a phase rather than eating its weeks (the phase still delivers its full span, overlapping hiatuses counted once), Production alone runs a day-level simulation, MAX_WEEKS is 600, 'Ends by' floors to a week, and a later phase never sits left of an earlier one still running. Treat the wrap date as right unless an independent day-by-day walk disagrees.
<br>*Why:* Each looks like a bug and is not; a probe that once reported every wrap date wrong was itself wrong. · *Derived*

### CODE-17 · Find every place an unwritten assumption is relied on
When a feature changes something the code quietly assumes (such as 'one block per calendar year'), search for the expression that encodes it, not just the name, and fix every site; use the shared helper (blockYearOf), never an inline copy like slice(0,4).
<br>*Why:* Single Column mode broke column swapping at ten sites with no error. · *Derived*

### CODE-18 · Grid pointer and click listeners: the two traps
Never call preventDefault() on a pointerdown over a grid cell, and never stopPropagation() from a document capture listener there; suppress selectstart for the gesture instead. A document-level bubbling click listener can't hear note cells or per-phase hiatus bands, because the grid stops propagation there: use capture or listen on the table.
<br>*Why:* preventDefault on pointerdown kills click and double-click, so the note editor and double-click-to-fill die; a capture stop throws away uncommitted note text. · *Derived*

### CODE-19 · No broad subject after :has() in CSS
Never put * or another broad subject after body:has(...), and never an attribute-only subject (such as [id^=]) behind :has(); name the elements or key them on a class.
<br>*Why:* A broad :has() subject made switching from the month view to the waterfall measurably slow. · *Derived*
