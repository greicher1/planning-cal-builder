// toc.js -- Help's table of contents: the sections, and the articles in each, in order. The ONE list of what Help holds.
//
// An article's body is src/help/articles/<id>.jsx (README.md beside this file). An entry here with no file yet shows
// its `outline` as a placeholder ("Being written"), so the structure can land before the words do.
//
//   id       the file name, and the id `ShowMe`, `<Related>`, the context table in HelpWindow.jsx and saved "last
//            article" use. ⛔ Never rename one that has shipped: a machine remembers it as the last article read.
//   title    sidebar and heading text.
//   view     'waterfall' | 'month' | 'both': the label on the article, and "I only use the Month view" hides the
//            waterfall-only ones.
//   brief    a short article: a few lines (owner's picks, 21 Nov 2026). Only marks it in the sidebar.
//   outline  what an unwritten article will cover. Delete it when the file is written.
//
// The owner's picks (21 Nov 2026) left these out of Help altogether: how the waterfall picks columns, hiding a Notes
// column, crowded months and the 10-lines-a-day limit, older .html calendars, copy/paste/drag notes as an article,
// Reset notes, Which bar sits on top, the key facts band, Zoom. Don't add them back without asking.

export const GROUPS = [
  { id: 'start', name: 'Start here', articles: [
    { id: 'welcome', title: 'Tour of the screen', view: 'both' },
    { id: 'first', title: 'Build your first calendar', view: 'both' },
    { id: 'views', title: 'Waterfall or Month view?', view: 'both' },
    { id: 'install', title: 'Opening SPTCal and your files', view: 'both', brief: true },
  ] },
  { id: 'show', name: 'Show setup', articles: [
    { id: 'showinfo', title: 'Show info', view: 'both', outline: ['Title, and how it names your files', 'Season, or several seasons', 'Version and Location'] },
    { id: 'episodes', title: 'Episodes or blocks', view: 'both', brief: true, outline: ['Schedule by Episodes or Blocks', 'Shooting days per episode or block', 'Renaming episodes, day counts, shoot order', 'Half days (4.5 days)'] },
    { id: 'tandem', title: 'Tandem days', view: 'month', brief: true, outline: ['What "8 + 1" means', 'Default and per-episode tandem days', 'Moving a tandem day'] },
    { id: 'region', title: 'Production Region and union holidays', view: 'both', outline: ['Pick where you shoot', 'How a holiday lengthens the shoot', 'Observed days for weekend holidays', 'Turning a holiday off; adding your own', 'Changing Region asks first'] },
    { id: 'range', title: 'Calendar range', view: 'waterfall', brief: true, outline: ['Show only some weeks in the waterfall, Excel and PDF'] },
  ] },
  { id: 'phases', name: 'Phases', articles: [
    { id: 'cards', title: 'Phase cards: start and length', view: 'both', brief: true, outline: ['Starts or Ends; Weeks or Dates', 'Start after previous phase; Finish before', 'Names and colors'] },
    { id: 'production', title: 'Production and the shoot', view: 'both', outline: ['Shoot days, not weeks', 'Day by day around weekends, holidays and hiatus', 'The wrap date', 'Off days and working a weekend'] },
    { id: 'custom', title: 'Add your own phases', view: 'both', brief: true, outline: ['+ Add phase', 'Overlapping phases sit side by side'] },
    { id: 'hidewf', title: 'Hide a phase in the waterfall', view: 'waterfall', brief: true, outline: ['Hidden from the waterfall, Excel and its PDF', 'Still in the Month view and still counted'] },
    { id: 'prep', title: 'Episodic prep', view: 'month', outline: ['A prep bar for every episode', 'Default prep and per-episode prep', 'Pause prep on days marked Off'] },
    { id: 'simpost', title: 'Simultaneous Post', view: 'both', brief: true, outline: ['Marking post weeks during the shoot', 'The offset', 'Numbering them into Post’s count', 'Renaming it'] },
  ] },
  { id: 'hiatus', name: 'Hiatus', articles: [
    { id: 'hiatus', title: 'All-phase hiatus', view: 'both', outline: ['Add a hiatus: start and weeks', 'Name and color its band', 'Lock in place'] },
    { id: 'phiatus', title: 'A hiatus for one phase', view: 'both', outline: ['Pause just one phase', 'Its band name and color'] },
    { id: 'ripple', title: 'Ripple Hiatus Periods', view: 'both', outline: ['What moves and what stays', 'When it runs', 'Turning it off'] },
  ] },
  { id: 'move', name: 'Moving dates', articles: [
    { id: 'move', title: 'Shift or Build Around?', view: 'both' },
    { id: 'shift', title: 'Shift in detail', view: 'both' },
    { id: 'build', title: 'Build Around in detail', view: 'both' },
    { id: 'nudge', title: 'Move one phase (▲ ▼)', view: 'waterfall', brief: true },
    { id: 'stays', title: 'What never moves', view: 'both' },
    { id: 'drag', title: 'Drag bars in the Month view', view: 'month', brief: true },
  ] },
  { id: 'notes', name: 'Notes', articles: [
    { id: 'auto', title: 'Automatic notes', view: 'both' },
    { id: 'wfnotes', title: 'Notes in the Waterfall', view: 'waterfall' },
    { id: 'mvnotes', title: 'Notes in the Month view', view: 'month' },
    { id: 'linked', title: 'Notes that stay with a phase', view: 'both', brief: true },
    { id: 'holnotes', title: 'Holidays in the notes', view: 'both' },
    { id: 'bulk', title: 'Paste many notes at once', view: 'month', brief: true },
  ] },
  { id: 'wf', name: 'Waterfall view', articles: [
    { id: 'read', title: 'Reading the waterfall', view: 'waterfall', outline: ['A block of columns per year', 'Overlapping phases side by side', 'The Simultaneous Post column'] },
    { id: 'headings', title: 'Column headings', view: 'waterfall', outline: ['Rename, merge, split', 'Reset a heading'] },
    { id: 'sizing', title: 'Column widths and row heights', view: 'waterfall', outline: ['Drag a boundary', 'Snap to matching heights', 'Double-click for automatic'] },
    { id: 'swap', title: 'Swapping two phases’ columns', view: 'waterfall', brief: true, outline: ['Alt+← / Alt+→ and the teal circle', 'Swap Column'] },
    { id: 'textbar', title: 'Styling text', view: 'waterfall', outline: ['Pick cells, then bold, italic, color, size', 'Styles print in Excel and the PDF'] },
    { id: 'side', title: 'Side boxes: color keys and text', view: 'waterfall', outline: ['Add a color key or a text box', 'Left or right of the calendar', 'In Excel and the PDF'] },
    { id: 'singlecol', title: 'Single Column Mode', view: 'waterfall', outline: ['One column per phase for its whole run', 'When to use it'] },
    { id: 'datefmt', title: 'Date format', view: 'waterfall', brief: true, outline: ['MM/DD or DD/MM', 'What follows the day-first order'] },
    { id: 'keys', title: 'Selecting with the mouse and keyboard', view: 'waterfall', outline: ['Click, Shift-click, ⌘-click, drag', 'Arrow keys, Tab, Delete', 'Right-click menu'] },
  ] },
  { id: 'month', name: 'Month view', articles: [
    { id: 'month', title: 'The Month view at a glance', view: 'month', outline: ['The month map', 'Episode bars and grey labels', 'Holidays and notes'] },
    { id: 'daymenu', title: 'A day’s menu', view: 'month', brief: true, outline: ['Add a 1-day or 1-week phase', 'Add a hiatus', 'Off, and Work this day'] },
    { id: 'mvsize', title: 'Size, day numbers and labels', view: 'month', brief: true, outline: ['Standard, Large, Extra Large', 'Number Production Days', 'Grey labels in Production’s bars'] },
  ] },
  { id: 'header', name: 'Header', articles: [
    { id: 'hdrmodes', title: 'Header: Auto, Template, Manual, Off', view: 'both', outline: ['What each mode does', 'Each view has its own', 'Formatting header lines'] },
    { id: 'tokens', title: 'Template variables', view: 'both', outline: ['Every {variable}, with an example', '[Square brackets] hide when empty'] },
    { id: 'presets', title: 'Header presets', view: 'both', outline: ['Save a header as a preset', 'Apply one to any calendar', 'Export and import a preset file'] },
    { id: 'lastedited', title: 'Date Last Edited', view: 'both', brief: true, outline: ['Why the header’s date is not today', 'What counts as an edit'] },
  ] },
  { id: 'scen', name: 'Scenarios & Compare', articles: [
    { id: 'scen', title: 'Scenario tabs', view: 'both', outline: ['+ Scenario', 'Rename, reorder, duplicate', 'Version on the tab', 'Save one scenario as its own file'] },
    { id: 'compare', title: 'Compare scenarios', view: 'both', outline: ['Up to 12 side by side', 'Only differences', 'Copy table, Excel, PDF'] },
  ] },
  { id: 'export', name: 'Export & share', articles: [
    { id: 'pdf', title: 'Export PDF (Waterfall)', view: 'waterfall', outline: ['Paper and orientation', 'Grid lines', 'File name'] },
    { id: 'excel', title: 'Export to Excel', view: 'waterfall', outline: ['What the workbook holds', 'Printing from Excel'] },
    { id: 'mvpdf', title: 'Month PDF', view: 'month', outline: ['All months, this month, or a range', 'One page per month'] },
    { id: 'names', title: 'File names', view: 'both', outline: ['The parts: title, season, version, WRO, a.o.', 'Changing order and parts'] },
  ] },
  { id: 'files', name: 'Files & saving', articles: [
    { id: 'save', title: 'Save, Save As and Load', view: 'both', outline: ['The .sptcal file', 'First save asks where; then it saves in place', 'Save As to fork a version'] },
    { id: 'filemenu', title: 'The File menu and recent calendars', view: 'both', brief: true, outline: ['Recent calendars and search', 'Show in folder', 'Remove from the list'] },
    { id: 'autosave', title: 'Autosave and getting work back', view: 'both', brief: true, outline: ['Autosave every 10 minutes', 'The backup in this browser'] },
    { id: 'changes', title: 'Changes since last save', view: 'both', brief: true, outline: ['What changed since you saved, listed'] },
    { id: 'newreset', title: 'New and the reset buttons', view: 'both', brief: true, outline: ['New clears everything', 'The narrower resets'] },
  ] },
  { id: 'settings', name: 'Settings', articles: [
    { id: 'prefs', title: 'Preferences', view: 'both', outline: ['One card per view', 'Saved with the calendar vs kept on this computer'] },
    { id: 'regiontab', title: 'Region and the holiday list', view: 'both', outline: ['Enable or disable a holiday', 'Add your own holiday', 'Reset holidays'] },
  ] },
  { id: 'ref', name: 'Reference', articles: [
    { id: 'shortcuts', title: 'Keyboard shortcuts', view: 'both' },
    { id: 'glossary', title: 'Glossary', view: 'both' },
    { id: 'holidaylists', title: 'Union holiday lists', view: 'both', brief: true, outline: ['Every region’s list, in short', 'Sources'] },
    { id: 'trouble', title: 'Troubleshooting', view: 'both', outline: ['“Let this site edit the file?”', 'The file changed on disk', 'Excel library didn’t download', 'Only Chrome or Edge'] },
    { id: 'whatsnew', title: 'What’s new', view: 'both' },
  ] },
]

// Flat lookups, built once.
export const ARTICLES = GROUPS.flatMap(g => g.articles.map(a => ({ ...a, group: g.id, groupName: g.name })))
export const ARTICLE = Object.fromEntries(ARTICLES.map(a => [a.id, a]))
