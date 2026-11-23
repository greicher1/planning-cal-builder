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
// 23 Nov 2026 (owner's pick "Before shipping"): twenty small pages were folded into the page that explains the same thing,
// 64 -> 44 (custom, hidewf -> cards; phiatus -> hiatus; nudge, drag -> move; compare -> scen; holnotes -> auto; bulk ->
// mvnotes; singlecol, datefmt, mvsize -> prefs; daymenu -> month; tokens, lastedited -> hdrmodes; excel -> pdf; filemenu,
// autosave, trouble -> save; regiontab, holidaylists -> region). None had shipped, so no machine remembers those ids.
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
    { id: 'showinfo', title: 'Show info', view: 'both' },
    { id: 'episodes', title: 'Episodes or blocks', view: 'both', brief: true },
    { id: 'tandem', title: 'Tandem days', view: 'month', brief: true },
    { id: 'region', title: 'Production Region and union holidays', view: 'both' },
    { id: 'range', title: 'Calendar range', view: 'waterfall', brief: true },
  ] },
  { id: 'phases', name: 'Phases', articles: [
    { id: 'cards', title: 'Phase cards: start and length', view: 'both' },
    { id: 'production', title: 'Production and the shoot', view: 'both' },
    { id: 'prep', title: 'Episodic prep', view: 'month' },
    { id: 'simpost', title: 'Simultaneous Post', view: 'both', brief: true },
  ] },
  { id: 'hiatus', name: 'Hiatus', articles: [
    { id: 'hiatus', title: 'Hiatus: the whole show or one phase', view: 'both' },
    { id: 'ripple', title: 'Ripple Hiatus Periods', view: 'both' },
  ] },
  { id: 'move', name: 'Moving dates', articles: [
    { id: 'move', title: 'Shift or Build Around?', view: 'both' },
    { id: 'shift', title: 'Shift in detail', view: 'both' },
    { id: 'build', title: 'Build Around in detail', view: 'both' },
    { id: 'stays', title: 'What never moves', view: 'both' },
  ] },
  { id: 'notes', name: 'Notes', articles: [
    { id: 'auto', title: 'Automatic notes and holidays', view: 'both' },
    { id: 'wfnotes', title: 'Notes in the Waterfall', view: 'waterfall' },
    { id: 'mvnotes', title: 'Notes in the Month view', view: 'month' },
    { id: 'linked', title: 'Notes that stay with a phase', view: 'both', brief: true },
  ] },
  { id: 'wf', name: 'Waterfall view', articles: [
    { id: 'read', title: 'Reading the waterfall', view: 'waterfall' },
    { id: 'headings', title: 'Column headings', view: 'waterfall' },
    { id: 'sizing', title: 'Column widths and row heights', view: 'waterfall' },
    { id: 'swap', title: 'Swapping two phases’ columns', view: 'waterfall', brief: true },
    { id: 'textbar', title: 'Styling text', view: 'waterfall' },
    { id: 'side', title: 'Side boxes: color keys and text', view: 'waterfall' },
    { id: 'keys', title: 'Selecting with the mouse and keyboard', view: 'waterfall' },
  ] },
  { id: 'month', name: 'Month view', articles: [
    { id: 'month', title: 'The Month view at a glance', view: 'month' },
  ] },
  { id: 'header', name: 'Header', articles: [
    { id: 'hdrmodes', title: 'Header: Auto, Template, Manual, Off', view: 'both' },
    { id: 'presets', title: 'Header presets', view: 'both' },
  ] },
  { id: 'scen', name: 'Scenarios & Compare', articles: [
    { id: 'scen', title: 'Scenarios and Compare', view: 'both' },
  ] },
  { id: 'export', name: 'Export & share', articles: [
    { id: 'pdf', title: 'Export: PDF and Excel (Waterfall)', view: 'waterfall' },
    { id: 'mvpdf', title: 'Month PDF', view: 'month' },
    { id: 'names', title: 'File names', view: 'both' },
  ] },
  { id: 'files', name: 'Files & saving', articles: [
    { id: 'save', title: 'Save, Load and autosave', view: 'both' },
    { id: 'changes', title: 'Changes since last save', view: 'both', brief: true },
    { id: 'newreset', title: 'New and the reset buttons', view: 'both', brief: true },
  ] },
  { id: 'settings', name: 'Settings', articles: [
    { id: 'prefs', title: 'Preferences', view: 'both' },
  ] },
  { id: 'ref', name: 'Reference', articles: [
    { id: 'shortcuts', title: 'Keyboard shortcuts', view: 'both' },
    { id: 'glossary', title: 'Glossary', view: 'both' },
    { id: 'whatsnew', title: 'What’s new', view: 'both' },
  ] },
]

// Flat lookups, built once.
export const ARTICLES = GROUPS.flatMap(g => g.articles.map(a => ({ ...a, group: g.id, groupName: g.name })))
export const ARTICLE = Object.fromEntries(ARTICLES.map(a => [a.id, a]))
