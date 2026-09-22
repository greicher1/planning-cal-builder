// Proves the .spthdr PRESET FILE format -- the v2 two-section shape, its forward-only migration
// from v1, and the strict up-front version check (MONTH-HEADER-PLAN.md §2 and §6 rulings 1 and 4).
//
// The real parseHeaderPresetText / headerPresetToJson / normalizeHeaderPreset are sliced verbatim
// out of src/legacy/app.js and evaluated, so this test cannot drift from the implementation the way
// a hand-transcription would. Same technique as prove-header-template.mjs.
//
// WHY A NODE TEST AND NOT A BROWSER LEG
//   These three are pure string/object functions -- no DOM, no module state beyond the id lists and
//   the default templates, which are sliced along with them. Exhaustive coverage is cheap here and
//   expensive in headless Chrome. A browser leg covers what this cannot: that an applied preset
//   actually reaches the screen and both writers.
//
// THE RULES BEING PROVED, each of which exists to stop a preset silently lying to someone
//   1. A v1 file (flat lines/format, no version key) migrates into the SHEET section and leaves the
//      month section ABSENT. ⭐ The load-bearing one: a v1 file's ids are waterfall slot ids, and
//      read as month ids every single one would be dropped.
//   2. A v2 file round-trips: write then read returns what went in.
//   3. Either section may be absent, and absent is not the same as empty.
//   4. A file from a NEWER format version is refused ENTIRELY, before any content is read -- never
//      half-imported. A half-imported preset is one the user believes in and cannot see holes in.
//   5. Unknown slot ids and unknown format keys are DROPPED, per section, and counted.
//   6. A non-preset file, malformed JSON and a wrong `kind` are each refused by name.
//
// Run:  node tests/harness/prove-header-preset.mjs
// Exit: 0 = every rule holds, 1 = a rule is violated (do not ship the preset format)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'src', 'legacy', 'app.js');
const source = readFileSync(SRC, 'utf8');

function slice(startMark, endMark, tail, what) {
  const from = source.indexOf(startMark);
  const to = from < 0 ? -1 : source.indexOf(endMark, from);
  if (from < 0 || to < 0) {
    console.error(`FAIL: could not locate ${what} in src/legacy/app.js.`);
    console.error('Its declaration or its final statement changed. Re-anchor this test before trusting it.');
    process.exit(1);
  }
  return source.slice(from, to + endMark.length) + tail;
}

// The id lists and the two default templates, which the section helpers close over.
const idsBody = slice(
  "const HDR_IDS = ['left','l2','l3','c1','c2','c3','c4','r1','r2','r3'];",
  "r1:   '{production.summary}', r2: '{production.dates}', r3: '[{episodes} Episodes]',",
  '\n  };',
  'the id lists and DEFAULT_HEADER_TEMPLATE');
const mvIdsBody = slice(
  "const MV_HDR_IDS = ['tleft','title','subtitle','today'];",
  "subtitle: '', today: '{today:dotpad}',",
  '\n  };',
  'the month id list and DEFAULT_MV_TEMPLATE');
// The section helpers + the file reader/writer + the store normaliser.
const secBody = slice(
  "const HDR_PRESET_SECTIONS = ['sheet','month'];",
  "function hdrSectionLabel(sec){ return sec === 'month' ? 'month' : 'waterfall'; }",
  '',
  'the preset section helpers');
const normBody = slice(
  'function normalizeHeaderPreset(p){',
  "sheet: p.lines ? { lines:p.lines, format:p.format || {} } : null, month: null };",
  '\n  }',
  'normalizeHeaderPreset');
const fmtKeysBody = slice(
  "const HDR_FMT_KEYS = ['size','bold','italic','color','highlight','align'];",
  "const HDR_FMT_KEYS = ['size','bold','italic','color','highlight','align'];",
  '',
  'HDR_FMT_KEYS');
const writerBody = slice(
  'const HDR_PRESET_VERSION = 2;',
  'return JSON.stringify(out, null, 1);',
  '\n  }',
  'headerPresetToJson');
const readerBody = slice(
  'function parseHeaderPresetText(text){',
  'return { ok:true, preset, dropped };',
  '\n  }',
  'parseHeaderPresetText');

const KIND = 'spt-header-preset';
const api = new Function(`
  const HDR_PRESET_KIND = ${JSON.stringify(KIND)};
  const HDR_PRESET_EXT = '.spthdr';
  ${idsBody}
  ${mvIdsBody}
  ${fmtKeysBody}
  ${secBody}
  ${normBody}
  ${writerBody}
  ${readerBody}
  return { parseHeaderPresetText, headerPresetToJson, normalizeHeaderPreset,
           HDR_IDS, MV_HDR_IDS, DEFAULT_HEADER_TEMPLATE, DEFAULT_MV_TEMPLATE, HDR_PRESET_VERSION };
`)();

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}\n        got  ${g}\n        want ${w}`); }
};
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? '\n        ' + detail : ''}`); }
};

console.log('=== prove-header-preset: the .spthdr v2 format ===\n');

// ---- 1. v1 migrates into the SHEET section, month absent -----------------------------------------
console.log('-- rule 1: a v1 file is a WATERFALL preset, and must land there');
const v1 = JSON.stringify({ kind: KIND, version: 1, name: 'Legacy',
  lines: { left: '{today}', c1: '{titleSeason}', r3: '[{episodes} Episodes]' },
  format: { c1: { bold: true, size: 14 } } });
const r1 = api.parseHeaderPresetText(v1);
ok('a v1 file is accepted', r1.ok, r1.reason);
eq('its lines land in the SHEET section', r1.preset.sheet.lines,
   { left: '{today}', c1: '{titleSeason}', r3: '[{episodes} Episodes]' });
eq('its format lands in the SHEET section', r1.preset.sheet.format, { c1: { bold: true, size: 14 } });
ok('the MONTH section is ABSENT, not empty', r1.preset.month === null,
   'a v1 file says nothing about the month header, so applying it must leave that header alone');
// A v1 file with NO version key at all -- the oldest shape there is.
const v1NoVer = JSON.stringify({ kind: KIND, name: 'Older', lines: { c1: 'X' } });
const r1b = api.parseHeaderPresetText(v1NoVer);
ok('a v1 file with no `version` key at all is still read as v1', r1b.ok && !!r1b.preset.sheet, r1b.reason);

// ⭐ The failure this rule exists to prevent, stated as a test: read as MONTH ids, every v1 line dies.
const asMonth = Object.keys(JSON.parse(v1).lines).filter(k => api.MV_HDR_IDS.indexOf(k) >= 0);
ok('no v1 waterfall id is also a month id', asMonth.length === 0,
   'if these overlapped, a mis-sectioned v1 file would half-apply instead of failing loudly');

// ---- 2. v2 round-trips ---------------------------------------------------------------------------
console.log('\n-- rule 2: write then read returns what went in');
const both = { name: 'House Style',
  sheet: { lines: { c1: '{titleSeason}', c2: 'Planning Calendar' }, format: { c1: { bold: true } } },
  month: { lines: { title: '[{titleSeason} ]Full Prelim Production Calendar', today: '{today:dotpad}' },
           format: {} } };
const round = api.parseHeaderPresetText(api.headerPresetToJson(both));
ok('a two-section preset round-trips', round.ok, round.reason);
eq('  sheet survives', round.preset.sheet, both.sheet);
eq('  month survives', round.preset.month, both.month);
eq('  name survives', round.preset.name, 'House Style');
ok('the written file declares version 2',
   JSON.parse(api.headerPresetToJson(both)).version === api.HDR_PRESET_VERSION);

// ---- 3. either section may be absent --------------------------------------------------------------
console.log('\n-- rule 3: either section may be absent, and absent is not empty');
const monthOnly = { name: 'Month only', sheet: null, month: { lines: { title: 'X' }, format: {} } };
const mJson = api.headerPresetToJson(monthOnly);
ok('an absent section is OMITTED from the file, not written as null',
   !('sheet' in JSON.parse(mJson)), 'got keys: ' + Object.keys(JSON.parse(mJson)).join(','));
const rm = api.parseHeaderPresetText(mJson);
ok('a month-only preset reads back', rm.ok, rm.reason);
ok('  its sheet section is absent', rm.preset.sheet === null);
eq('  its month section survives', rm.preset.month.lines, { title: 'X' });

const sheetOnly = { name: 'Sheet only', sheet: { lines: { c1: 'Y' }, format: {} }, month: null };
const rs = api.parseHeaderPresetText(api.headerPresetToJson(sheetOnly));
ok('a sheet-only preset reads back with month absent', rs.ok && rs.preset.month === null, rs.reason);

// ---- 4. a newer version is refused ENTIRELY -------------------------------------------------------
console.log('\n-- rule 4: a newer format version is refused before any content is read');
const v3 = JSON.stringify({ kind: KIND, version: 3, name: 'From the future',
  sheet: { lines: { c1: 'X' }, format: {} }, somethingNew: { matters: true } });
const r3 = api.parseHeaderPresetText(v3);
ok('a v3 file is REFUSED', !r3.ok);
ok('  it has no preset at all -- never half-imported', r3.preset === undefined);
ok('  the reason names both versions', /3/.test(r3.reason) && /2/.test(r3.reason), r3.reason);
for (const bad of [0, -1, 2.5, 'two', null, NaN, Infinity]) {
  const rr = api.parseHeaderPresetText(JSON.stringify({ kind: KIND, version: bad, sheet: { lines: { c1: 'X' } } }));
  // null means "absent" -> treated as v1, which has no sheet section in this shape -> refused for
  // having no lines. Either way it must NOT be accepted with content.
  ok(`  version ${JSON.stringify(bad)} does not yield a v2 preset`, !rr.ok || !rr.preset.sheet, rr.reason);
}

// ---- 5. unknown ids and format keys are dropped, per section -------------------------------------
console.log('\n-- rule 5: unknown ids and format keys are dropped and counted');
const junk = JSON.stringify({ kind: KIND, version: 2, name: 'Junk',
  sheet: { lines: { c1: 'keep', nope: 'drop', title: 'drop-too' }, format: { c1: { bold: true, evil: 1 } } },
  month: { lines: { title: 'keep', c1: 'drop' }, format: {} } });
const rj = api.parseHeaderPresetText(junk);
ok('a file with junk still imports', rj.ok, rj.reason);
eq('  sheet keeps only waterfall ids', Object.keys(rj.preset.sheet.lines).sort(), ['c1']);
eq('  month keeps only month ids', Object.keys(rj.preset.month.lines).sort(), ['title']);
eq('  unknown format keys are stripped', rj.preset.sheet.format, { c1: { bold: true } });
ok('  the drops are counted', rj.dropped >= 4, 'dropped=' + rj.dropped);
ok('⭐ `title` is a MONTH id and is dropped from the SHEET section',
   !('title' in rj.preset.sheet.lines),
   'the two id spaces overlap on nothing today, but the reader must not rely on that');

// ---- 6. non-presets are refused by name ----------------------------------------------------------
console.log('\n-- rule 6: a non-preset is refused, by name');
ok('malformed JSON is refused', !api.parseHeaderPresetText('{not json').ok);
ok('a JSON array is refused', !api.parseHeaderPresetText('[]').ok);
ok('a wrong `kind` is refused and says what a preset is',
   /\.spthdr/.test(api.parseHeaderPresetText(JSON.stringify({ kind: 'something-else' })).reason));
ok('a preset with no lines in any section is refused',
   !api.parseHeaderPresetText(JSON.stringify({ kind: KIND, version: 2, name: 'Empty' })).ok);

// ---- 7. the localStorage normaliser agrees with the file reader -----------------------------------
console.log('\n-- rule 7: the stored-preset normaliser migrates the same way the file reader does');
const storedV1 = { id: 'hp_x', name: 'Stored legacy', lines: { c1: 'A' }, format: { c1: { bold: true } } };
const n = api.normalizeHeaderPreset(storedV1);
eq('a stored v1 preset folds into sheet', n.sheet, { lines: { c1: 'A' }, format: { c1: { bold: true } } });
ok('  and its month section is absent', n.month === null);
const storedV2 = { id: 'hp_y', name: 'Stored v2', sheet: { lines: { c1: 'A' }, format: {} }, month: null };
eq('a stored v2 preset is left alone', api.normalizeHeaderPreset(storedV2).sheet, { lines: { c1: 'A' }, format: {} });
ok('normalising is idempotent',
   JSON.stringify(api.normalizeHeaderPreset(api.normalizeHeaderPreset(storedV1))) === JSON.stringify(n));

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail) { console.log('RESULT: the preset format is broken. Do not ship it.'); process.exit(1); }
console.log('RESULT: the .spthdr v2 format holds -- v1 migrates, v2 round-trips, newer is refused.');
