# WATERFALL-KEYS-PLAN.md — Excel's editing keys in the waterfall

Owner, 22 Oct 2026, from the "what Excel features are we missing" list: item 2 (*arrow keys, Tab and Delete on
the selection*) and item 3 (*copy, cut and paste notes, and drag a note to another week*). Built together on
branch `wf-keys-paste` because both act on the same thing: the waterfall's highlight (`textSel`, the text style
bar's selection, TEXT-STYLE-BAR-PLAN.md §2a).

Tracker cards: `waterfall-keyboard`, `waterfall-copy-paste-notes`.

## 1. What a user gets

With something highlighted in the waterfall (a click, a sweep, ⌘-click or Shift-click, as today):

| Key | Does |
|---|---|
| ↑ ↓ ← → | Move the highlight one cell. Lands on any cell that can be highlighted, including an EMPTY Notes cell (that is where you type a new note). A blank gap in a phase column can't be highlighted, so the move steps over it to the next cell. At the edge of the calendar nothing happens. |
| Shift + arrow | Grows or shrinks the highlight from where it started, as a rectangle (Excel). |
| Tab / Shift+Tab | Right / left, as → and ←. |
| Enter, or typing | Opens the note, unchanged (D5). |
| Delete / Backspace | Clears the highlighted notes (§3, ruling Q1). |
| ⌘C / ⌘X / ⌘V | Copy, cut, paste notes (§2). |
| Escape | Clears the highlight, unchanged. |

The page scrolls to keep the moving cell in view, below the sticky heading row.

**Drag:** press on a highlighted note and drag it to another week's Notes cell. Several highlighted notes move
together, keeping their spacing. Drop anywhere that isn't a Notes cell, or press Escape, and nothing changes.
A press on a note that is NOT highlighted still starts a sweep, as today, so selecting by dragging is unchanged.

## 2. Copy, cut, paste

- **Copy** takes the highlighted Notes cells, in week order, one line each. It goes on the system clipboard as
  plain text, so it pastes into Excel, Mail or Notes. A note with several lines is quoted the way Excel quotes
  one, so pasting it back keeps it in one week.
- **Cut** is Copy, then Delete.
- **Paste** writes into the Notes column, starting at the earliest highlighted Notes cell and going down one
  Notes cell per line (all-phase hiatus rows have no Notes cell and are stepped over). One line pasted over
  several highlighted Notes cells fills each of them (Excel). Text from anywhere works; Excel's trailing newline
  is ignored. Lines that would run past the calendar's last week are not pasted, and a short message on the grid
  says so. The pasted cells end up highlighted.
- A note pinned to a day (the note editor's Day picker) keeps its weekday when it lands in another week, and a
  trailing date the picker stamped into its text is re-stamped to match.

## 3. Decisions for the owner

Asked by picker; recorded in §6 once ruled.

- **Q1 Delete:** what happens to an automatic note, and to a hiatus band's label?
- **Q2 Copy:** does a copied note carry its colour, size and style-bar style, or only its text?
- **Q3 Paste over a note:** replace it, add below it, or skip that week?
- **Q4 Drag onto a note:** ask, replace, swap, or put both in that week?

Not asked, because only one answer works: the arrow keys must stop on empty Notes cells (or a new note could
never be typed from the keyboard), and must step over blank phase gaps (they can't be highlighted).

## 4. Rules that hold whatever the rulings

- **Nothing frozen is edited.** The keys, the clipboard and the drag all live in the text style bar's section of
  `src/legacy/app.js` and write the stores the note editor already writes (`userNotes`, `noteColors`,
  `noteFontSize`, `textStyle.note`) through its own `saveNoteEdit()`, then call frozen `render()`. No cell looks
  different and no text fits differently: a pasted note is drawn exactly as the same note typed.
- **No new snapshot key, no new setting, no id** (collectFieldValues). The drop outline and the message are drawn
  on the highlight's own layer, never in a cell.
- **One gesture, one undo step:** a Delete, a cut, a paste, a drop. Each flushes the step before it and banks its
  own (the month note drag's pattern), so two quick gestures never merge.
- **A focused field keeps its keys.** Nothing happens unless focus is on the page itself (the gridSel keyboard
  rule), the note editor is closed and no dialog is up. Text selected somewhere else in the app copies normally.
- **Reusable for the right-click menu** (being mocked up in another session): `wfNotesCopy()`, `wfNotesCut()`,
  `wfNotesPaste(text)` and `wfNotesClear()` do the work; the key and clipboard handlers only call them.
- Stays out of `undo-keys`' way: no edit to the ⌘Z handler or the undo section, which that branch changes.

## 5. Proof

As built (22 Oct 2026), both in `gate.sh` after `textstyle`:

- **`wfkeys`** (t/ leg, dispatched events, new synthetic fixture `wfkeys.sptcal`, two year blocks): 84 checks.
  Movement, Shift's rectangle, Tab, the edges, blank gaps, bands, scrolling below the sticky heading row, the
  focused-field and modifier guards, Enter after a move; Delete per Q1; copy / cut / paste per Q2–Q3 with Excel's
  quoting, the hiatus rows stepped over, past the end refused and said, a pinned day, hostile clipboard data; the
  drag per Q4 (single, a block over itself, Cancel / Replace, off the column, Escape, past the end, an automatic
  note); one undo step each; no new id or snapshot key; 0 clipped. Red on the pre-change build (52 of 84) and on
  four mutants.
- **`wfkeysreal.mjs`** (Node, trusted CDP input): real arrows, ⌘C / ⌘X / ⌘V as Chrome's own Copy / Cut / Paste
  commands, the look surviving Chrome's clipboard across a reload, Delete, a real mouse drag and its question.
  0 of 6 on the pre-change build. ⚠️ It also passes with the `before*` listeners removed (§4 note in the code).

## 6. Rulings

Owner, 22 Oct 2026, by picker, each the recommended answer:

- **Q1 Delete: "Empty the Notes cells".** Every highlighted Notes cell goes blank, an automatic note included
  (stored as the note editor's explicit clear, `text:''`, so it stays blank until typed in or undone). Its colour,
  size and style go with it (the editor's own rule). Hiatus bands, phases, dates and headings are left alone.
  Cut is Copy then this.
- **Q2 Copy: "Text and its look".** Colour (`noteColors`), size (`noteFontSize`) and the style bar's style
  (`textStyle.note`) travel with a note copied inside SPTCal, and replace the target's. Text pasted from outside
  SPTCal takes the look of the cell it lands in, as typing into it would.
- **Q3 Paste over a note: "Replace it".** Excel's way; a blank line in the paste empties its week (as Delete).
- **Q4 Drag onto a note: "Ask before replacing".** Excel's question, once per drop, naming how many notes would
  be replaced. Cancel puts everything back. A drop on empty weeks asks nothing.
