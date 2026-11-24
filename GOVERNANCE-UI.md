# GOVERNANCE-UI.md: SPTCal's rules, look, interaction and words

*Part of SPTCal's rules: GOVERNANCE.md holds the introduction (how rules change, which document wins, the words with one fixed meaning) and every other chapter, and loads into every session by itself. Read this file before changing anything on screen or any words a user sees. Edited by hand only; history in GOVERNANCE-HISTORY.md under the same IDs.*

<a id="ux"></a>
## UX: Look and interaction

### UX-1 · Never refuse silently: a note by the spot, a dialog only for a failed job ⚖
When the app won't do something, it says why, naming what is involved. A refused edit on the calendar gets a short note beside the thing the user acted on (if that spot is out of view, at the top of the calendar, naming the date), never a browser alert or a dialog with OK. A whole job that fails (an export, a file that won't load) keeps its dialog. A limit stops only what the user adds by hand: never an edit, automatic or linked content, holidays, the movers, Load or Undo, and nothing is ever hidden to enforce it. A control that swallows a click with no explanation is a defect.
<br>*Why:* A full month day once refused a note with no word, a paste to an off-screen day said nothing, and an earlier refusal ('collide') named nothing anyone could act on. · *Owner:* "Short message by the day" (2026-11-17)

### UX-2 · Right-click menus: only what the cell needs, nothing greyed out
Add a menu item only if it is what people reach for on that cell and the cell has no one-gesture way to do it already (never Swap column, never Add note). An item that cannot act right now is left out, never shown greyed. Count the lines on the busiest cell, and ask before trimming a live menu.
<br>*Why:* A proposed phase menu ran to about 17 lines, mostly duplicates of double-click, Delete and the arrow keys; greyed rows are clutter nobody can use. · *Owner:* "I want you to be more cautious in adding extra buttons to the right click menu. I want you to think very carefully about which buttons we actually need in each right click menu." (2026-10-23)

### UX-3 · Show a control only where it acts; a fold for clutter needs the owner's yes ⚖
Show a button or switch only where clicking it does something (Swap Column only where a swap can happen, a holiday's Enable only where it moves a date, a band or strip only once there is more than one thing to show). The phase cards keep every switch on show, with no 'More options' fold. Anywhere else, folding controls that do apply to cut clutter is decided case by case: propose it with a mockup and wait for the owner's yes. A 'More' menu for a toolbar too narrow for one line is fine. In the toolbar and header, a button whose appearing or vanishing would shift its neighbours between views or states stays in place, greyed, with a tooltip saying why.
<br>*Why:* Controls that did nothing confused people, and a fold that hid rarely used switches was judged worse than a longer card. · *Owner:* "In fact it shouldn't show up anywhere it doesnt make sense." (2026-11-10)
- Exception, 2026-11-16: all-phase hiatus cards still open folded to their one-line head (audit item 2.14, approved); the owner's words named the phase cards' menu only.
- Exception, 2026-11-11: toolbar and header buttons grey in place rather than hide, so the bar never shifts.

### UX-4 · Descriptions never sit on screen: the control's name, then the ⓘ, then Help
No descriptions, scope lines, grey 'e.g.' examples, placeholders or key-hint lines under or inside controls: a control's name says what it is. A description worth keeping for someone meeting the control for the first time goes behind the small grey ⓘ beside it (a hover card, one to three lines, the same component everywhere); anything longer, or that needs a worked example, goes in Help. Warnings, errors and empty states are never hidden behind an ⓘ: they show because something needs attention, and a hover doesn't get attention. A dialog holds what is needed and nothing else. When the owner asks for such text to go, remove it everywhere it appears, not only where they saw it.
<br>*Why:* The owner deleted settings scope lines, header-menu subtext, the Compare window's explanations, the note editors' keys lines and Show info's examples one after another. · *Owner:* "super super easy to understand and styled with mantine, reduce complexity ... remove all the random explainations at the bottom and top. remember clean and simple" (2026-10-22)
- Exception, 2026-11-12: the month note editor keeps its 'Enter to save / Esc to cancel' line (owner: 'No, leave it').

### UX-5 · Say nothing after an action that works; hints wait until needed
After an action that works, show no chip, message, flash or outline: the change itself is the feedback. Speak only to refuse (and then say why) or when a hint is truly needed, and let a warning wait until the user commits (presses Enter or leaves the box), never while they are still typing.
<br>*Why:* Confirmation chips and change flashes felt noisy ('a little silly'), and a standing 'enter a week count' warning nagged people mid-typing. · *Owner:* "remove the chip entirely, except say "Double click to expand cells" when you highlight phae blocks. then only if can't do a swap does it tell you why with a chip" (2026-10-21)
- Exception, 2026-10-21: highlighting phase blocks shows the hint 'Double click to expand cells'.

### UX-6 · Flag a state with a dot or badge; don't spell it out
Mark a state quietly (a dot, a small badge, a plain tag) instead of counts, quoted content or sentences, and drop a confirmation step when nothing is lost.
<br>*Why:* A column holding notes needs a dot, not a description; the app should stay clean and elegant. · *Owner:* "you can just flag that a collumn contains notes, you dont need to specificy. we want to keep things clean and elegant and in mantine style." (2026-10-22)

### UX-7 · Act on the thing itself: direct manipulation over dialogs
Resize, fill, rename and choose by dragging, double-clicking or a control on the object itself before reaching for a dialog or form, and put a new control where the user already looks (a hover button on the block, the day number, the card's corner). Double-click means 'back to automatic'.
<br>*Why:* Selecting every cell to swap a block was tedious, and switch rows far from what they change cluttered the cards. · *Owner:* "there should be a button in the top right corner of the first week of the block ... when you hover over that year, a button pops up" (2026-09-01)

### UX-8 · The grid works like Excel
A single click highlights; double-click, Enter or typing opens the editor; a press never opens an editor by itself. Highlighted text is styled from the style bar, typing adds to a note rather than replacing it, and keys follow Excel's (arrows, Tab, Delete on cells).
<br>*Why:* SPTCal replaces Excel for waterfalls, so users bring Excel's habits, and a stray key must never wipe a note. · *Owner:* "double-click (or Enter, or typing) opens a note or hiatus band's editor; a single click highlights it, like Excel." (2026-10-21)

### UX-9 · Undo covers every edit, one step each; a view switch isn't one
Cmd Z and Shift Cmd Z work after every kind of edit (checkboxes, switches, date boxes, grid drags, menu items, renames, hides), one step per user action, with a burst of nudges as one step. Switching between Waterfall and Month view is never an undo step: undo and redo never change the view, and a switch keeps the redo stack. Only a real text field keeps the browser's own typing undo. Nor is a view switch an unsaved change: on a clean calendar it never marks the file unsaved, arms the leave warning or starts an autosave (the view is saved with the next real save).
<br>*Why:* Focus left on a checkbox or date box made the keys silently do nothing, and undoing back through view switches was confusing. · *Owner:* "Does command z and command shift z works for EVERYTHING?" (2026-10-22)

### UX-10 · The preview never jumps on an edit
Every edit redraws the calendar, but the scroll position of the inner pane and the window is put back, anchored to where the preview sits on screen.
<br>*Why:* How steady it feels matters more than the scroll number. · *Derived*

### UX-11 · Toolbars, header and dialogs hold still while you work
Toggling a view, mode, tool or the style bar never shifts, wraps or resizes the toolbar or header: buttons that exist in both views stay exactly where they are. A dialog doesn't move or resize as the user changes a setting in it; it opens wide enough for its content. Anything added to the header's crowded right end must fold away when room runs short.
<br>*Why:* Menus that moved under the pointer, and an Export window that jumped as its file name changed, kept being corrected. · *Owner:* "the menu should be locked where it is and all buttons that are the same should stay exactly where they are" (2026-11-11)

### UX-12 · A standard app window: never stacks, scrolls sideways under 960 px
The app is a fixed window: the page never scrolls, and the sidebar, the waterfall and the month view each scroll in their own box while menus and toolbars stay put. The sidebar stays on the left and nothing ever stacks; on a wide screen the toolbar keeps its size with spare room on the right, on a small one it folds to icons and then a More menu, and below 960 px the window scrolls sideways.
<br>*Why:* It should behave like a standard desktop app (Excel shows fewer columns on a small screen), not a web page that reflows. · *Owner:* "the left side bar (show, phases, settings) should always stay on the left, I never want the UI to start stacking up and down....the app should basically just force you to use it on a screen size that is wide enough" (2026-11-16)

### UX-13 · Never cut text off: no ellipses, no truncated labels
Windows size to their content, narrow layouts wrap or scroll, and wide tables scroll sideways rather than squeeze; never cut text with an ellipsis or drop a fact. Header controls keep their natural width and give up room in deliberate steps (icons first, the status text last), so a label is never clipped; test at a narrow window with a selection live.
<br>*Why:* Compare and the key facts band truncated their text, and shrinking header buttons once read 'Expor'. · *Owner:* "the window needs to scale larger so we dont have elipses/things cut off" (2026-10-23)

### UX-14 · Ask first before a change could lose or move work unasked
Ask 'Continue?' before an action that could move the user's dates or notes in a way they didn't ask for (changing the Region while notes exist) or clear many items at once (a notes reset), saying how many. Don't ask when there is nothing to lose.
<br>*Why:* One press of a reset once cleared every note with no question; a hard lock on the Region was worse than a question.

### UX-15 · Change only what the user picked, and keep what they placed
A swap or move changes only what the user selected: no automatic reflow, resize or collateral move of anything else (they can stretch it themselves). What the user placed by hand stays placed through later changes: store the intent (this phase in this column), not a fixed position, so the engine never flips it back.
<br>*Why:* Automatic follow-on reflow felt confusing and assumptive, and columns flipping sideways after an edit undid the user's work. · *Owner:* "a genuine swap and then if the user wants the rows to expand the follow collumn, they can use the stretching feature to do that themselves manually but having it automatically do it like this is confusing and assumptive." (2026-08-31)

### UX-16 · Decide from the calendar's dates, never by phase type
Automatic layout and tool defaults judge by what the whole calendar actually shows (overlaps, gaps, how the year reads), not by special cases for one phase or one kind of phase.
<br>*Why:* Phase-by-phase patches kept missing the real problem, and rules by kind (Writer's Room always unticked) were wrong whenever the dates differed. · *Owner:* "its less about phase specific changes like that and more about the algorithm understanding better what looks right and what doesnt with any phases" (2026-11-06)

### UX-17 · Knock-on date changes: one clear switch, only from a user's edit
A feature that moves many dates at once as a side effect gets one clearly visible on/off switch in Settings, not a question each time and not hard-wired; the owner picks its default. Its knock-on moves start only from a named user edit, never from a field watcher, and never from Load, Undo, Redo, New or a scenario switch.
<br>*Why:* The owner declined ask-each-time and always-on; a ripple fired by loading or undoing would move a calendar nobody touched. · *Owner:* "On off switch … Ripple on should be on by default" (2026-11-04)

### UX-18 · Every tool that moves phases steps over a held hiatus
Shift, the shift arrows, the hiatus ripple and (with Ripple Hiatus on) the phase card's ▲ / ▼ move dates by working weeks and step over a held hiatus, so the gaps between phases are kept. A new tool that moves phases must do the same.
<br>*Why:* Moving by calendar weeks slid a break from one phase into the next, opening a gap before it and an overlap after it. · *Owner:* "When ripple hiatus is on if you bump over a hiatus period, it should bump it right to the week before/after the hiatus" (2026-11-11)

### UX-20 · A light accent tint means 'selected'; resting controls never wear it
In this app a light navy tint means selected. Set a resting control apart with a border, ink or a solid fill (as Export PDF), never the selected tint; a disabled control loses its colour but stays readable, never dimmed by opacity.
<br>*Why:* Four toolbar buttons tinted like the sidebar's selected tab read as all selected. · *Owner:* "now it looks like those buttons are all selected since the blue color is the same as the selected button color on the left side bar. come up with a few mockups" (2026-10-21)
- Exception, 2026-09-30: the install gate's one button is solid navy (owner ruling D8).

### UX-21 · Chrome looks like Mantine UI, in the app's own colours
Build chrome the way ui.mantine.dev builds it (hairline borders, white cards on a light warm-grey ground, no shadow at rest), keeping the sidebar's density. Use the app's own colour sets (navy, warm grey, warn, info, danger) through tokens, never Mantine's stock feedback colours, and keep text contrast at AA.
<br>*Why:* The owner pointed at Mantine UI as the target look; Mantine's default colours measured below AA and would undo an accessibility fix. · *Owner:* "review https://ui.mantine.dev/ — these prebuilt components are good references to what I want it to look like" (2026-08-29)

### UX-22 · One gap and one height across the toolbar and its rows
Toolbar sections use one gap from one variable, and a button added to a row matches its neighbours' spacing, height and look.
<br>*Why:* Sections told apart by gaps that were all different, and buttons of odd heights, kept being corrected. · *Owner:* "the gap should be the same as the gaps between all the other buttons" (2026-11-11)

### UX-23 · Pickers offer only what the field can take, and mark the rest
A date picker offers only dates the field will actually use (only Mondays with Snap to Monday on, only Fridays for an Ends box, only the phase's own dates for its hiatus, only shoot days for a wrap date), and a typed date is rewritten to the day it snapped to. Days that are allowed but notable, holidays and hiatus weeks, are marked with a dot and never removed, so a scheduler can still pick them and see the result.
<br>*Why:* Letting people pick a value the app silently changes misleads them; hiding a holiday would hide the very consequence the scheduler needs to see. · *Owner:* "when snap to monday is on wouldn't it make sense that you aren't able to pick any dates except mondays?" (2026-10-30)

### UX-24 · A typed date works like a picked one, applied when the box is left
Read typed dates forgivingly (7/29, 7-29, 7-29-25 all work) and treat them exactly like a pick, through the same rules. A typed date takes effect when the user leaves the box or presses Enter, never on each keystroke, and then at once.
<br>*Why:* Typing a year digit by digit must not fling dates around, and a hand-typed date must not behave differently from a picked one. · *Owner:* "what if you hand type 7/29/25 as 7/29 or 7-29-25 or 7-29. All should be recognized" (2026-11-17)

### UX-25 · Number entry is an open text box, not plus and minus buttons
Use an open text box for a number, like every other number box in the app, not plus and minus step symbols.
<br>*Why:* Consistency with the rest of the app's inputs. · *Owner:* "lets not do the plus and minus symbols lets do open text boxes like all" (2026-11-17)

### UX-26 · One master tool per job, and one look across the tools
Prefer one tool with settings over several near-duplicate tools. Tools that do similar jobs share one look and feel: a new tool panel matches Shift and Build Around (the list first, the same rows, header strip and hints).
<br>*Why:* Shift From and Anchor To merged into one Shift tool, and Build Around was rebuilt to match it. · *Owner:* "Ok im going to vote we go with C, one master shift tool" (2026-11-04)

### UX-27 · Tool panels: open under the button, stay current, close on click away
A tool panel (Shift, Build Around and any new one) opens under its button and can be dragged anywhere. A click outside closes it unless the user dragged it, which keeps it open until its ✕, its button, Esc or the other tool, the same at every window size. While open it follows changes to the calendar but never overwrites what the user typed into it, and nothing floats over its list's rows.
<br>*Why:* Panels left open covered the calendar, a width-dependent rule confused people, and a refresh once wiped typed dates. · *Owner:* "universal rule at any window size...shift tool and build around menus should hide when you click anywhere outside of them EXCEPT when a user has dragged them to any custom spot" (2026-11-16)

### UX-28 · Typing in an editor never restructures what it edits
Typing changes text only. Splitting, merging or joining happens only through an explicit button, one box per thing.
<br>*Why:* Retyping a column heading once split the heading row in two as a side effect. · *Owner:* "you have to understand that if you change the notes collumn to something other than writing, it is THEN going to split the header row into 2. Why would that be intuitive?" (2026-10-20)

### UX-29 · A drag goes where the hand puts it, day by day
A drag moves day by day rather than snapping to weeks, and a drag that lands off a snap turns the snap off, visibly.
<br>*Why:* The owner rejected week stepping. · *Owner:* "i want to drag day by day" (2026-09-18)

### UX-30 · Everything works at every zoom level
Every calendar feature, including column and row resizing and the text highlight, works at every zoom; anything drawn in grid pixels is redrawn after each zoom change.
<br>*Why:* Resize handles were hidden while zoomed, and the text highlight drifted up to 76 px at 200%. · *Owner:* "are there any other features that dont work at every zoom level" (2026-10-22)

### UX-31 · Panels and menus appear at once, with no slide or fade
Don't add slide or fade animations to chrome without asking.
<br>*Why:* The owner asked for the Settings menu to already be there rather than sliding in. · *Owner:* "can we just have the menu already there rather than still sliding in" (2026-10-23)

### UX-32 · No footer: header, sidebar and preview only
The layout is header, sidebar and preview. Don't add a footer, and don't read the dead footer CSS as a plan: vertical space belongs to the calendar.
<br>*Why:* Asked during the Mantine scoping; a print-only footer would also mean editing frozen export code. · *Owner:* "no footer now, none foreseen" (2026-08-28)

### UX-33 · No dark mode
The app stays light. The calendar and its exports are black-on-white documents, so the Mantine provider is forced light.
<br>*Why:* A dark shell would leave a white slab around the calendar or change frozen output. · *Derived*

### UX-34 · One feedback system: no toasts, every message by its control
Use the app's one feedback system (UI-CONVENTIONS §4) rather than a new look per message. No toasts or notification popups: every message is about a specific control and sits next to it. Every browser popup is the app's own dialog (only the leave-page warning stays native), and explanatory text is never italic.
<br>*Why:* There were 32 uncoordinated feedback surfaces, and italic meant both 'explanatory' and 'error'. · *Derived*

### UX-35 · Hover reveals any label the layout shortened
Keep a hover title wherever the layout shortens or iconifies text (the file name, a holiday label, a phase label, a folded toolbar button).
<br>*Why:* Hover is the only way to read a truncated or iconified label. · *Derived*

### UX-36 · The owner decides each default; new options start off
Every default is the owner's call. A new option is off or empty on a new calendar unless nearly everyone will want it (Fill Gaps off; the Final Delivery note on), and a new automatic behaviour starts off so no existing calendar changes until it is turned on.
<br>*Why:* Defaults that switched things on surprised the owner. · *Owner:* "I think fill gaps should be disabled by default" (2026-11-11)

### UX-37 · Production's length is set in Show info only
Show info owns Production's shoot days. Tools and other panels show the length read-only (Build Around shows it, or 'Not set' with a pointer to Show info) and never write a Show info field.
<br>*Why:* One place owns the shoot-day count. · *Owner:* "production should be the one phase you aren't allow[ed] to edit/change" (2026-11-05)

### UX-38 · Note editors: Enter saves, and Esc never throws away typed text
In the typed-note editors (a waterfall note, a month day note, a waterfall line, a linked note) Enter saves, Shift+Enter or Alt+Enter adds a line, Tab and Ctrl/Cmd+Enter save, and a click outside saves. Esc keeps text that changed and isn't empty; it closes without saving only when nothing changed or the box was emptied, so Esc can never delete a note. The holiday and automatic-note editors keep Enter to save and Esc to cancel. The editors find their cell again by its key after every redraw, and stay hand-built rather than Mantine popovers, which portal and mount late.
<br>*Why:* A Mantine popover would escape the class that keeps its controls out of saved files, and the grid is rebuilt on every render.

### UX-39 · Save and Undo keys do nothing while a question is open
While a question dialog is open, Cmd S, Cmd Z and Shift Cmd Z do nothing, so a pending question is never answered by a save or an undo underneath it.
<br>*Why:* An undo under Remove phase left a ghost row, and a save under the Region question dropped a pending change. · *Derived*

### UX-40 · Editors are body-level popovers anchored to what they edit
Keep chrome out of the frozen grid: popovers live at body level, anchored to the cell they edit, never injected into the grid; tear them down when the grid re-renders, follow capture-phase scroll and resize, and stay clamped inside the window.
<br>*Why:* A popover that outlives its anchor hangs over the calendar pointing at nothing. · *Derived*

### UX-41 · Measure new chrome at its narrowest
Measure anything new in the preview toolbar at a narrow window with a selection live (its widest state), and any new absolutely-positioned panel inside the preview panel at 1024 px. The toolbar folds (icons, then a More menu) and never wraps, and how far it folds must not depend on whether a scroll bar shows.
<br>*Why:* One no-wrap row hid Expand, Swap and Undo/Redo off-screen at 611 px, and the Shift panel was cut off by 42 px at 1024 px. · *Derived*

### UX-42 · Notice strips show one at a time, in a fixed priority order
Only one notice strip shows at a time: a raised strip holds back every strip after it, and the document order in index.html is the priority. Strips about work at risk (unsaved work waiting, nothing being backed up) come first. A new strip joins that order and every CSS list that stacks them.
<br>*Why:* Several strips at once stacked over the calendar. · *Owner:* "Yes, same rule" (2026-11-16)

### UX-43 · An editing surface shows the real look and never restyles on focus
A preview or editing surface shows exactly what the output will look like: focusing or clicking a line never changes its font or size, and each slot previews from its own real default, not one shared style.
<br>*Why:* The header editor's lines changed size when clicked. · *Owner:* "the font/size of the header text lines are changing when" (2026-09-09)

<a id="copy"></a>
## COPY: Words

### COPY-1 · Save and Load in the app; 'open' in the code
In the app, Save means writing a .sptcal file and Load means opening a .sptcal or .html file; all new copy says Load. The code keeps saying 'open' (the file menu's data-action="open", openRecentFile): renaming it silently kills the menu.
<br>*Why:* One vocabulary for users, while the code's names are a contract with the file menu's handler.

### COPY-2 · Use the user's words, never the engine's
Ask people in their own terms and work out the engine's concept behind it (pick where you shoot; the union agreement follows). Never show engine words such as slot, lane, stint or col.
<br>*Why:* Users don't know the engine's vocabulary; the Region picker replaced three agreement selects this way. · *Owner:* "lets switch back to W'Fall Note" (2026-11-11)

### COPY-3 · Rename what users see, never the code's ids or saved keys
A feature's user-facing name may change while its code ids, classes and saved keys keep the old word (Load/open, Build Around/pop-solve, Tandem/double-up); retire an id rather than rename it. Before naming, check the word real calendars use, and put the name to the owner as a choice.
<br>*Why:* Ids are contracts with saved files, tests and the app's own handlers.

### COPY-4 · Moved dates are Pushed / Pulled; counts keep + and −
A date that moves is 'Pushed 2 wks' or 'Pulled 1 day', never + or −. Counts (episodes, shoot days, lengths) keep their + and −. Holidays behind a move are counted, never named.
<br>*Why:* Production vocabulary: a date is pushed or pulled, and a sign reads as arithmetic. · *Owner:* "lets use pushed and pulled instead of + and - when it comes to talking about dates being pushed or pulled by a certain number of weeks/days" (2026-10-23)

### COPY-5 · A number must mean something to the reader
Never show a number the reader can't interpret, such as a bare '−1 holidays'. Say it in words, and only where it means something.
<br>*Why:* The owner could not tell what '−1 holiday' under First shoot day meant. · *Owner:* "what does -1 holidays … even mean??" (2026-11-04)

### COPY-7 · A switch's label says plainly what it does
A switch's label says plainly what it does ('Add Production Week Label in Month View'), and related switches sit together under the setting they belong to, apart from unrelated ones.
<br>*Why:* The owner reworded and regrouped the month view's grey-text switches. · *Owner:* "maybe the toggle should say something more clear like 'Add Production Week Label in Month View'" (2026-10-24)

### COPY-8 · Never overwrite a name the user typed
When default wording changes, a default name nobody typed takes the new wording, but a name someone typed stays exactly as typed.
<br>*Why:* A rename must never touch the user's own text. · *Derived*

### COPY-9 · Numbered labels read 'wk N'
Numbered phase and hiatus labels read 'wk N' (Production wk 1, Hiatus wk 1), never 'Week N', the same as every other phase.
<br>*Why:* Consistency across phases. · *Owner:* "It should be 'wk' not 'Week' for consistency with all the other phases" (2026-10-20)

### COPY-10 · 'Color', not 'Colour', everywhere users see it
Write 'Color' (US spelling) everywhere a user sees it. Code identifiers, ids, saved keys and docs keep their old spelling.
<br>*Why:* Owner preference. · *Owner:* "Change "Colour" in all places to "Color"" (2026-11-19)

### COPY-11 · Every date follows the calendar's day/month order
On a calendar set to day-first dates, every date the app writes (notes, holiday lines, the title block, the sidebar, tool lists, editors, Compare) is written day first, and every date it reads from text (a typed note's trailing date, Paste notes) is read day first. Only the order follows; years keep their short form in notes. A month-first calendar is unchanged.
<br>*Why:* Owner's decision D3 (a), 13 Nov 2026 (audit item 2.4), reversing the 20 Oct rule that automatic notes keep 1/6/25. · *Owner:* "typed or pasted dates are read day first too" (2026-11-13)

### COPY-12 · Keyboard hints name the keys of the computer in use
Tooltips and Help name shortcuts for the computer in use: Ctrl+Z on Windows, the command-key form on a Mac (with Redo in Apple's order there). Never hard-code one platform's keys.
<br>*Why:* Studio coordinators use Windows; Mac-only key glyphs were a Windows audit finding. · *Derived*
