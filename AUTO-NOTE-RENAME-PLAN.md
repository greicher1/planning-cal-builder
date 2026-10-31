# AUTO-NOTE-RENAME-PLAN.md

Ruled 30 Oct 2026, not built. Tracker card `rename-auto-notes`. Built the way the holiday rename was
(HANDOFF, "RENAME A HOLIDAY, COLOUR ONE HOLIDAY, EDIT ONE NOTE LINE").

- **The ask** (owner): *"like how holidays notes now work, Auto notes are labelled as "Auto Note" in the popup when
  you go to edit it and allow you to edit the name of it, without affecting its date and ability to move
  automatically."* Then: *"what happens if you delete the auto note or want to replace the auto note with your own
  non-auto note"*.
- **How it works today** (the reason for the second question): any edit to an auto note (Start Principal
  Photography, Principal Photography Wraps, Writer's Room Opens, the nine phase Begins/Ends kinds) saves its WEEK as
  typed text (`saveNoteEdit` → `userNotes`), so it stops following its date. A delete (cleared cell, the Delete key,
  a cleared month line) is the explicit clear `{text:''}` on the WEEK, not the note: when the shoot moves, the note
  comes back in its new week, and the old week stays blank and hides any auto note that later lands there
  (`rewriteMovedAutoNotes` deliberately leaves '' alone). Only unticking the kind in Settings ▸ Automatic notes
  follows the note.
- **Rulings, by picker (five):**
  1. The new name shows **"Everywhere"**: month view, waterfall, Excel, both PDFs.
  2. A colour picked in its editor colours **"Just that note"** (month view, as `holidayColors` does; the waterfall
     cell keeps the week's one fill).
  3. Typing over its line in the waterfall's Notes cell **renames it** and keeps it automatic (as
     `wfHolidayRenames` does). A different date, or a changed line count, still saves as typed text.
  4. Clearing its text and saving, in either view, **removes that note**: it switches the kind off (the same store
     as Settings ▸ Automatic notes), so it is gone everywhere and stays gone when dates move. It does NOT blank the
     week. Ticking it again in Settings brings it back.
  5. A **"Delete Auto-Note" button** in the Auto Note editor does the same as 4, with a hint saying where to bring it
     back. Replacing an auto note with your own = delete it, then add a regular note (no "make it my own" button).
     The **holiday editor gets no button** (owner's picker, "No button"): deleting a holiday would give Production
     the day back and move the shoot, which a note popup must not do; hiding and switching off stay in Settings ▸
     Holidays.
- **Shape it fits (not yet built):** each kind appears at most once per calendar and its `kind` word is already
  permanent (`AUTO_NOTE_PHASE_EDGES`, `autoNotesOff`/`autoNotesOn`), so a name store keyed by kind, applied once in
  `computeSchedule()`'s `addNote`, reaches every reader with no frozen edit, the way `holidayNames` is applied in
  `fullHolidayList()`. A typed name beats a phase rename in the Phases tab; with no typed name the default follows the
  phase name, as now. The month editor gets an "m/d/yy · Auto Note" mode beside the holiday mode in
  `openMvNoteEditor`. A rename must also swap the old line word for word in any `userNotes` override and copy its
  `mvTextStyle.wfnote` / `mvWfNotePlace` keys, as `setHolidayName` does. Per-note colour would reuse frozen edit
  H1's `b.color` route from `mvDayNotePlan`. A delete writes `autoNotesOff` (or removes from `autoNotesOn` for an
  opt-in kind). Whether a removed note keeps its typed name for when it is ticked back on is open (suggest: no,
  removing clears it). Still to settle while building: the waterfall Delete key on a cell that mixes an auto note
  with a holiday or typed lines. Related cards: `wf-holiday-editor-mode`, `autonote-follow-sidebar`.

