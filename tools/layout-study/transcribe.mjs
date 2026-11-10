#!/usr/bin/env node
// Turn the study's transcription specs into .sptcal files (LAYOUT-STUDY-PLAN.md §4.3, "PDFs / JPGs").
//
//   node tools/layout-study/transcribe.mjs "<scrubbed folder>"
//
// Reads <scrubbed>/specs.json (one entry per picture: phases, dates, weeks, hiatuses, Sim Post, and the
// pictured layout as the answer key) and writes <scrubbed>/<id>.sptcal, one per entry, from a blank
// snapshot built on tests/fixtures/autonoterename.sptcal's field set (the newest id set in the fixtures).
// Region is None, so Production's weeks are exactly days/5 and nothing depends on a holiday list; the
// title, version and location are blank; Show info holds no episode count, so the Production row's typed
// days are what schedule it. The answer key is not written into the .sptcal (the app would ignore it);
// compare.mjs reads it from specs.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const template = JSON.parse(fs.readFileSync(path.join(repo, 'tests', 'fixtures', 'autonoterename.sptcal'), 'utf8'));

const BUILTIN = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
const DEFAULT_NAME = { writersRoom: "Writer's Rm", prePrep: 'Pre-Prep', prodPrep: 'Prod Prep', production: 'Production', post: 'Post', localization: 'Localization' };

function blank() {
  const s = JSON.parse(JSON.stringify(template));
  const by = s.fields.byId;
  // Every per-phase field of the template's one custom phase is the pattern for more; drop it, rebuild below.
  for (const id of Object.keys(by)) if (/-custom\d+$/.test(id)) delete by[id];
  for (const id of Object.keys(by)) {
    const f = by[id];
    if ('checked' in f) continue;
    if (/^(start|end|weeks|days|phiatus-start|phiatus-name)-/.test(id) || ['show-title', 'show-version', 'show-location', 'num-episodes', 'shoot-days-per-ep', 'num-blocks', 'days-per-block', 'prep-days', 'custom-hol-name', 'custom-hol-date', 'cal-range-start', 'cal-range-end'].includes(id)) f.value = '';
  }
  for (const k of BUILTIN) { by['name-' + k].value = DEFAULT_NAME[k]; if (by['phiatus-en-' + k]) by['phiatus-en-' + k].checked = false; if (by['phiatus-weeks-' + k]) by['phiatus-weeks-' + k].value = '2'; if (by['snap-' + k]) by['snap-' + k].checked = true; if (by['unit-' + k]) by['unit-' + k].value = 'weeks'; }
  by['union-place'].value = '';          // None: no holiday list, so a week is five shoot days
  by['season-num'].value = '1';
  by['show-mode'].value = 'episodes';
  by['prep-name'].value = 'Episodic Prep';
  by['simpost-enabled'].checked = false; by['simpost-offset'].value = '0'; by['simpost-count'].checked = false;
  s.fields.hiatuses = [];
  s.customPhaseDefs = []; s.customPhaseCounter = 0;
  s.episodeDefs = []; s.episodeCounter = 0; s.episodeShootOrder = [];
  s.blockDefs = []; s.blockCounter = 0; s.blockAssignEdited = false;
  for (const k of ['userNotes', 'dayNotes', 'mvExtraLanes', 'dayNoteColors', 'dayOverrides', 'headerManual', 'mvHeaderManual', 'headerFormat', 'mvHeaderFormat', 'noteColors', 'noteFontSize', 'hiatusTexts', 'hiatusColors', 'hiatusFontSize', 'hiatusNameSyncedKeys', 'holidayView', 'holidayOff', 'colWidths', 'colWidthsAlt', 'rowHeights', 'rowHeightsByWeek', 'cellSpans', 'gridColSwaps', 'gridStintSwaps', 'phaseColorOverride']) s[k] = {};
  s.customHolidays = [];
  s.headerMode = 'auto'; s.mvHeaderMode = 'auto'; s.headerTemplates = false; s.mvHeaderTemplates = false;
  s.viewMode = 'sheet'; s.sidebarTab = 'phases'; s.singleColumn = false;
  delete s.autoNotesOn; delete s.autoNotesOff; delete s.colReuse; delete s.colFollow; delete s.colKeep;
  return s;
}

function customFields(by, key, name) {
  by['name-' + key] = { value: name };
  by['start-' + key] = { value: '' }; by['end-' + key] = { value: '' };
  by['weeks-' + key] = { value: '' }; by['days-' + key] = { value: '' };
  by['unit-' + key] = { value: 'weeks' };
  by['snap-' + key] = { checked: true }; by['wknum-' + key] = { checked: true };
  by['phiatus-en-' + key] = { checked: false }; by['phiatus-name-' + key] = { value: '' };
  by['phiatus-start-' + key] = { value: '' }; by['phiatus-weeks-' + key] = { value: '2' };
}

// One spec -> one snapshot. Exported for tools/layout-study/fixtures.mjs, which writes the synthetic rule fixtures
// (tests/fixtures/layout-*.sptcal) from the same shape of spec, plus `colReuse` (the layout stamp) when asked.
export function buildSnapshot(spec, id) {
  const s = blank();
  const by = s.fields.byId;
  const customs = spec.phases.filter(p => /^custom\d+$/.test(p.key)).map(p => p.key).sort((a, b) => +a.slice(6) - +b.slice(6));
  customs.forEach((key, i) => {
    s.customPhaseDefs.push({ key, colorIndex: i % 8 });
    customFields(by, key, spec.phases.find(p => p.key === key).name || 'Custom ' + (i + 1));
  });
  s.customPhaseCounter = customs.length ? Math.max(...customs.map(k => +k.slice(6))) : 0;
  for (const p of spec.phases) {
    if (!by['start-' + p.key]) throw new Error(id + ': unknown phase key ' + p.key);
    by['start-' + p.key].value = p.start;
    if (p.key === 'production') {
      // Production's length is the episode list's total (Episodes mode): one 5-day episode per pictured
      // week, so with region None the shoot spans exactly those weeks. weeks-production is the derived
      // hidden field and is written too, for an older build.
      by['num-episodes'].value = String(p.weeks);
      by['shoot-days-per-ep'].value = '5';
      by['weeks-production'].value = String(p.weeks * 5);
      s.episodeDefs = Array.from({ length: p.weeks }, (_, i) => ({ id: 'ep' + (i + 1), name: 'Episode ' + (101 + i), days: 5, nameEdited: false, daysEdited: false }));
      s.episodeCounter = p.weeks;
    } else by['weeks-' + p.key].value = String(p.weeks);
    if (p.name && !/^custom/.test(p.key)) by['name-' + p.key].value = p.name;
  }
  for (const h of spec.phaseHiatus || []) {
    by['phiatus-en-' + h.key].checked = true;
    by['phiatus-start-' + h.key].value = h.start;
    by['phiatus-weeks-' + h.key].value = String(h.weeks);
    by['phiatus-name-' + h.key].value = h.name || '';
  }
  s.fields.hiatuses = (spec.hiatuses || []).map(h => ({ start: h.start, weeks: String(h.weeks), locked: true, name: h.name || '' }));
  if (spec.simpost && spec.simpost.enabled) {
    by['simpost-enabled'].checked = true;
    by['simpost-offset'].value = String(spec.simpost.offset || 0);
    by['simpost-count'].checked = !!spec.simpost.count;
  }
  if (spec.singleColumn) s.singleColumn = true;
  if (spec.stamped) s.colReuse = true;
  return s;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir] = process.argv.slice(2);
  if (!dir) { console.error('usage: node tools/layout-study/transcribe.mjs "<scrubbed folder>"'); process.exit(2); }
  const specs = JSON.parse(fs.readFileSync(path.join(dir, 'specs.json'), 'utf8'));
  let n = 0;
  for (const id of Object.keys(specs)) {
    if (id.startsWith('_')) continue;
    fs.writeFileSync(path.join(dir, id + '.sptcal'), JSON.stringify(buildSnapshot(specs[id], id), null, 2) + '\n');
    n++;
  }
  console.log(n + ' .sptcal file(s) written to ' + dir);
}
