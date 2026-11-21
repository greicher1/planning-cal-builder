#!/usr/bin/env node
// Scrub a folder of saved calendars for the layout study (LAYOUT-STUDY-PLAN.md §4.3, §4.5).
//
//   node tools/layout-study/scrub.mjs "<seeds folder>" "<scrubbed folder>"
//
// Reads every .sptcal and legacy .html in the seeds folder, blanks every free-text field, and writes
// seed-01.sptcal, seed-02.sptcal, … to the scrubbed folder. The study tool, and Claude, read ONLY the
// scrubbed folder. The mapping seed-NN → original file name is written beside the ORIGINALS
// (scrub-index.txt), never beside the scrubbed copies.
//
// What goes: the show title, version and location, header lines and templates, every note's text,
// every hiatus name, custom holiday names, renamed episode and block names, side-box text, typed
// column headings, scenario names, and the two stores keyed by a note's TEXT (mvWfNotePlace,
// mvTextStyles.wfnote). What stays, because the layout is made of it: every date, duration, phase,
// region, override (swaps, spans, colFollow, colReuse) and setting. Phase names, holiday renames and
// Sim Post's name stay too (production vocabulary, not a title) and are listed in the report.
//
// The report prints EVERY string that survives, so the owner can read exactly what would reach Claude
// before copying the folder anywhere. Structural tokens (dates, colours, keys, enum words) are left
// out of that list; anything with a space or longer than 12 characters is in it.
//
// PDFs and images are skipped: those are transcribed by hand in the session (plan §4.3) — black out the
// title before dropping them in.

import fs from 'node:fs';
import path from 'node:path';

const [inDir, outDir] = process.argv.slice(2);
if (!inDir || !outDir) {
  console.error('usage: node tools/layout-study/scrub.mjs "<seeds folder>" "<scrubbed folder>"');
  process.exit(2);
}

const STATE_RE = /<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/;

function readSnapshot(file) {
  const text = fs.readFileSync(file, 'utf8');
  const t = text.trimStart();
  if (t.startsWith('{')) return JSON.parse(t);
  const m = text.match(STATE_RE);
  if (!m) throw new Error('no saved-state block (not a calendar file?)');
  const json = m[1].trim();
  if (!json || json === 'null') throw new Error('saved-state is empty (a blank app, not a saved calendar)');
  return JSON.parse(json);
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const scrubbed = [];   // [what, count]
const note = (what, n = 1) => { const e = scrubbed.find(x => x[0] === what); if (e) e[1] += n; else scrubbed.push([what, n]); };

function scrubFields(fields) {
  if (!isObj(fields)) return;
  const byId = fields.byId;
  if (isObj(byId)) {
    for (const id of ['show-title', 'show-version', 'show-location', 'custom-hol-name']) {
      if (isObj(byId[id]) && typeof byId[id].value === 'string' && byId[id].value !== '') { byId[id].value = ''; note(id); }
    }
    for (const id of Object.keys(byId)) {
      if (id.startsWith('phiatus-name-') && isObj(byId[id]) && byId[id].value) { byId[id].value = ''; note('phase hiatus name'); }
    }
  }
  if (Array.isArray(fields.hiatuses)) {
    for (const h of fields.hiatuses) if (isObj(h) && h.name) { h.name = ''; note('hiatus name'); }
  }
}

function scrubStrings(obj, what, repl) {
  if (!isObj(obj)) return;
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'string' && obj[k] !== '') { obj[k] = repl; note(what); }
    else if (isObj(obj[k])) scrubStrings(obj[k], what, repl);
  }
}

function scrubSnapshot(s) {
  if (!isObj(s)) return s;
  scrubFields(s.fields);
  if (isObj(s.userNotes)) {
    // `text: ''` means "automatic note cleared" and must stay ''; only typed text is replaced.
    for (const k of Object.keys(s.userNotes)) {
      const n = s.userNotes[k];
      if (isObj(n) && typeof n.text === 'string' && n.text !== '') { n.text = 'Note'; note('waterfall note'); }
    }
  }
  if (isObj(s.dayNotes)) {
    for (const k of Object.keys(s.dayNotes)) {
      const list = s.dayNotes[k];
      if (Array.isArray(list)) for (const n of list) if (isObj(n) && n.text) { n.text = 'Note'; note('month note'); }
    }
  }
  if (isObj(s.hiatusTexts)) for (const k of Object.keys(s.hiatusTexts)) if (s.hiatusTexts[k]) { s.hiatusTexts[k] = 'Hiatus'; note('hiatus band text'); }
  // The app owns a band's text while this equals hiatusTexts[k]; the same word keeps that true.
  if (isObj(s.hiatusNameSyncedKeys)) for (const k of Object.keys(s.hiatusNameSyncedKeys)) if (s.hiatusNameSyncedKeys[k]) { s.hiatusNameSyncedKeys[k] = 'Hiatus'; note('synced hiatus name'); }
  scrubStrings(s.headerManual, 'header line', 'Header');
  scrubStrings(s.mvHeaderManual, 'month header line', 'Header');
  if (isObj(s.headerTemplates)) scrubStrings(s.headerTemplates, 'header template', 'Header');
  if (isObj(s.mvHeaderTemplates)) scrubStrings(s.mvHeaderTemplates, 'month header template', 'Header');
  if (Array.isArray(s.customHolidays)) s.customHolidays.forEach((h, i) => { if (isObj(h) && h.name) { h.name = 'Holiday ' + (i + 1); note('custom holiday name'); } });
  if (Array.isArray(s.episodeDefs)) s.episodeDefs.forEach((e, i) => {
    if (isObj(e) && e.nameEdited && typeof e.name === 'string') { e.name = 'Episode ' + (i + 1); note('renamed episode'); }
  });
  if (Array.isArray(s.blockDefs)) s.blockDefs.forEach((b, i) => {
    if (isObj(b) && typeof b.name === 'string' && !/^Block \d+$/.test(b.name)) { b.name = 'Block ' + (i + 1); note('renamed block'); }
  });
  if (isObj(s.sideBoxes) && Array.isArray(s.sideBoxes.boxes)) {
    for (const b of s.sideBoxes.boxes) {
      if (!isObj(b)) continue;
      if (b.title) { b.title = 'Box'; note('side box title'); }
      if (Array.isArray(b.lines)) for (const l of b.lines) if (isObj(l) && l.t) { l.t = 'Line'; note('side box line'); }
    }
  }
  if (isObj(s.headerRowLabels)) for (const k of Object.keys(s.headerRowLabels)) if (s.headerRowLabels[k]) { s.headerRowLabels[k] = 'Heading'; note('typed column heading'); }
  // Keyed by a note's TEXT: dropped whole (month-note placement and style only, nothing to do with columns).
  if (isObj(s.mvWfNotePlace) && Object.keys(s.mvWfNotePlace).length) { delete s.mvWfNotePlace; note('mvWfNotePlace (keyed by note text)'); }
  if (isObj(s.mvTextStyles) && isObj(s.mvTextStyles.wfnote)) {
    delete s.mvTextStyles.wfnote; note('mvTextStyles.wfnote (keyed by note text)');
    if (!Object.keys(s.mvTextStyles).length) delete s.mvTextStyles;
  }
  return s;
}

function scrubFile(obj) {
  scrubSnapshot(obj);
  if (isObj(obj.scenarios) && Array.isArray(obj.scenarios.tabs)) {
    obj.scenarios.tabs.forEach((t, i) => {
      if (!isObj(t)) return;
      if (t.name) { t.name = 'Scenario ' + (i + 1); note('scenario name'); }
      if (isObj(t.snapshot)) scrubSnapshot(t.snapshot);
    });
  }
  return obj;
}

// Every string that survives, for the report. Structural tokens are left out.
const DATE = /^\d{4}-\d{2}-\d{2}$/, COLOUR = /^#[0-9a-fA-F]{3,8}$/, NUMBER = /^-?\d+(\.\d+)?$/;
const TOKEN = /^[A-Za-z0-9_@:|.\/-]{1,12}$/;   // keys, enum words, 'm/d/yyyy', 'y2026:s0', '2027-03-01|writersRoom'
function survivors(v, at, out) {
  if (typeof v === 'string') {
    if (v === '' || DATE.test(v) || COLOUR.test(v) || NUMBER.test(v) || TOKEN.test(v)) return;
    out.push(at + ' = ' + JSON.stringify(v));
  } else if (Array.isArray(v)) v.forEach((x, i) => survivors(x, at + '[' + i + ']', out));
  else if (isObj(v)) for (const k of Object.keys(v)) survivors(v[k], at ? at + '.' + k : k, out);
}

fs.mkdirSync(outDir, { recursive: true });
const files = fs.readdirSync(inDir).filter(f => /\.(sptcal|html?)$/i.test(f) && !f.startsWith('.')).sort((a, b) => a.localeCompare(b));
const skipped = fs.readdirSync(inDir).filter(f => /\.(pdf|jpe?g|png|gif|heic|webp)$/i.test(f));
if (!files.length && !skipped.length) { console.error('nothing to scrub in ' + inDir); process.exit(1); }
if (!files.length) console.log('no .sptcal or .html files; only PDFs/images to copy');

// The report never prints an original file name: the owner may paste it into the chat. Names go to the
// index beside the originals only.
const index = [];
let n = 0, unread = 0;
for (const f of files) {
  const src = path.join(inDir, f);
  let obj;
  try { obj = readSnapshot(src); }
  catch (e) { unread++; index.push('(not read)\t' + f + '\t' + e.message); console.log('SKIP  one file could not be read (named in scrub-index.txt): ' + e.message); continue; }
  scrubbed.length = 0;
  scrubFile(obj);
  n++;
  const name = 'seed-' + String(n).padStart(2, '0') + '.sptcal';
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(obj, null, 2) + '\n');
  index.push(name + '\t' + f);
  const left = [];
  survivors(obj, '', left);
  console.log('\n' + name + '  (from a ' + (/\.html?$/i.test(f) ? 'legacy .html' : '.sptcal') + ')');
  console.log('  scrubbed: ' + (scrubbed.length ? scrubbed.map(([w, c]) => w + (c > 1 ? ' ×' + c : '')).join(', ') : 'nothing to scrub'));
  console.log('  strings that survive (read these — this is what Claude would see):');
  if (!left.length) console.log('    none');
  for (const l of left) console.log('    ' + l);
}
// PDFs and images are copied under neutral names (hand-01.pdf, …) so they can be transcribed without their
// file names travelling; the index records which is which.
if (skipped.length) fs.mkdirSync(path.join(outDir, 'by-hand'), { recursive: true });
skipped.sort((a, b) => a.localeCompare(b)).forEach((f, i) => {
  const name = 'hand-' + String(i + 1).padStart(2, '0') + path.extname(f).toLowerCase();
  fs.copyFileSync(path.join(inDir, f), path.join(outDir, 'by-hand', name));
  index.push('by-hand/' + name + '\t' + f);
});
fs.writeFileSync(path.join(inDir, 'scrub-index.txt'), index.join('\n') + '\n');
console.log('\n' + n + ' file(s) written to ' + outDir + (unread ? ', ' + unread + ' not read' : ''));
console.log('index (seed → original) kept beside the originals: ' + path.join(inDir, 'scrub-index.txt'));
if (skipped.length) console.log(skipped.length + ' PDF/image file(s) copied to by-hand/ under neutral names, to be transcribed (black out the title first).');
