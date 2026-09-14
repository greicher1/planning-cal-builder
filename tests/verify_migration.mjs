// Exhaustive check: every legacy region combination must resolve, after migration,
// to the SAME holiday list it resolved to before. Silent drift here means a user's
// saved calendar quietly recomputes its wrap date.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve relative to THIS file, never an absolute path: the harness lives in tests/ and must
// read the app.js of the checkout it is sitting in, wherever that checkout happens to be.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '../src/legacy/app.js');
const src = fs.readFileSync(APP, 'utf8');

function grab(decl) {
  const i = src.indexOf(decl);
  if (i < 0) throw new Error('not found: ' + decl);
  let d = 0, j = i + decl.length;
  for (;;) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } j++; }
  return eval('(' + src.slice(i + decl.length, j + 1) + ')');
}
const HOLIDAYS = grab('const HOLIDAYS = ');
const PLACES   = grab('const PLACES = ');
const LEGACY   = grab('const LEGACY_PROVINCE_PLACE = ');

// The migration, lifted verbatim from the patched source so the test can't drift from it.
const migSrc = src.slice(src.indexOf('function migrateRegionSnapshot'),
                         src.indexOf('function applyStateSnapshot'));
const migrateRegionSnapshot = eval(
  '(function(){ const LEGACY_PROVINCE_PLACE = ' + JSON.stringify(LEGACY) +
  '; ' + migSrc + ' return migrateRegionSnapshot; })()');

// What the OLD build resolved, before this patch.
const isCanada = v => v === 'CA' || v === 'CAN';
const OLD_HOLIDAY_KEYS = new Set(['US-GEN','US-NY','CA-BC','CA-ON','CA-QC','CA-AB','CA-MB','CA-NS','UK']);
function oldKey(country, usArea, prov) {
  if (!country) return null;
  if (isCanada(country)) { const s = prov || 'CA-BC'; return OLD_HOLIDAY_KEYS.has(s) ? s : 'CA-BC'; }
  if (country === 'US')  { const u = usArea || 'US-GEN'; return OLD_HOLIDAY_KEYS.has(u) ? u : 'US-GEN'; }
  return OLD_HOLIDAY_KEYS.has(country) ? country : null;
}
// The one deliberate rename: the old 'UK' list mixed England & Wales with Scotland's
// early-August bank holiday and was correct for neither. It becomes UK-EW.
const RENAMED = { 'UK': 'UK-EW' };

function newKey(byId) {
  const snap = { fields: { byId: JSON.parse(JSON.stringify(byId)) } };
  migrateRegionSnapshot(snap);
  const v = (snap.fields.byId['union-place'] || {}).value || '';
  if (!v) return null;
  const p = PLACES[v];
  return (p && HOLIDAYS[p.region]) ? p.region : null;
}

const COUNTRIES = ['', 'US', 'CA', 'CAN', 'UK'];
const US_AREAS  = ['US-GEN', 'US-NY', ''];
const PROVS     = ['CA-BC','CA-ON','CA-QC','CA-AB','CA-MB','CA-NS',''];

let n = 0, bad = 0;
for (const c of COUNTRIES) for (const u of US_AREAS) for (const p of PROVS) {
  const byId = { 'union-country': {value:c}, 'union-usregion': {value:u}, 'union-subregion': {value:p} };
  const want = oldKey(c, u, p);
  const wantMapped = want === null ? null : (RENAMED[want] || want);
  const got = newKey(byId);
  n++;
  if (got !== wantMapped) {
    bad++;
    console.log(`  MISMATCH country=${c||'∅'} us=${u||'∅'} prov=${p||'∅'}  was ${want} → expected ${wantMapped}, got ${got}`);
  }
}
console.log(`${bad ? '✗' : '✓'}  ${n - bad}/${n} legacy combinations resolve to the same list`);

// Edge cases the combinatorial sweep can't express.
const edge = [
  ['no region keys at all (pre-region file)', {'show-title':{value:'x'}}, null],
  ['already migrated', {'union-place':{value:'us-new-york'}}, 'US-NY'],
  ['unknown place value from a newer build', {'union-place':{value:'us-narnia'}}, null],
  ['country present, sub-selects absent', {'union-country':{value:'US'}}, 'US-GEN'],
  ['legacy CAN with no province', {'union-country':{value:'CAN'}}, 'CA-BC'],
];
let ebad = 0;
for (const [name, byId, want] of edge) {
  const got = newKey(byId);
  const ok = got === want;
  if (!ok) ebad++;
  console.log(`${ok ? '✓' : '✗'}  ${name}: ${got}${ok ? '' : `  (expected ${want})`}`);
}

// "None" must stay None: the old build left US-GEN/CA-BC sitting in the sub-selects even when
// the country was blank, and promoting those would switch holidays ON for a calendar that
// deliberately had none -- silently lengthening its schedule.
const none = newKey({'union-country':{value:''},'union-usregion':{value:'US-GEN'},'union-subregion':{value:'CA-BC'}});
const noneOk = none === null;
if (!noneOk) ebad++;
console.log(`${noneOk ? '✓' : '✗'}  "None" stays None even with resting sub-select values: ${none}`);

// Every PLACES entry must point at a real HOLIDAYS key.
const orphan = Object.entries(PLACES).filter(([, p]) => !HOLIDAYS[p.region]).map(([k]) => k);
console.log(`${orphan.length ? '✗' : '✓'}  all ${Object.keys(PLACES).length} places resolve to a real list${orphan.length ? ': ' + orphan : ''}`);

// Every HOLIDAYS key must be reachable from at least one place, or it is dead data.
const reachable = new Set(Object.values(PLACES).map(p => p.region));
const unreachable = Object.keys(HOLIDAYS).filter(k => !reachable.has(k));
console.log(`${unreachable.length ? '✗' : '✓'}  all ${Object.keys(HOLIDAYS).length} lists reachable${unreachable.length ? ': ' + unreachable : ''}`);

process.exit(bad + ebad + orphan.length + unreachable.length ? 1 : 0);
