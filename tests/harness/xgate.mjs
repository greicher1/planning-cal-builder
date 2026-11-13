// xgate.mjs -- run every line of win-legs.txt through xleg.mjs, one after another, and write <out>/summary.json.
//
//   node xgate.mjs [--list win-legs.txt] [--out <dir>] [--from N] [--to M] [--only <regex>] [--cap <s>] [--missing] [--max N]
//   node xgate.mjs --summarize [--list ...] [--out <dir>]        rebuild summary.json from what <out> holds, run nothing
//   node xgate.mjs --compare <a/summary.json> <b/summary.json>   what differs between two runs (macOS vs Windows)
//
// Node 22 or later, no dependencies, any OS. See WINDOWS.md. It ALWAYS exits 0: the summary is the result.
//
// --from / --to pick list entries by their 1-based number among the leg lines (comments and blank lines do not count),
// so a long list can be run in chunks into one --out; every run rewrites summary.json over ALL list entries, marking
// the ones with no result yet "NOT RUN". --cap lowers any leg's budget to that many seconds (a real-clock budget).
//
// summary.json:
//   env    process.platform, os.release(), Node, Chrome's version and user agent (CDP /json/version), and from the page:
//          navigator.platform, userAgentData.platform, devicePixelRatio, the measured classic scrollbar width,
//          document.fonts.status and the loaded faces (taken from the first leg that ran at scale 1)
//   legs   one entry per list line: name, the line's fields, status (PASS: every case passed; FAIL: a case failed or
//          the leg threw; REPORTED: no cases[] -- gate.sh judges those with its own scripts, so compare them with a
//          macOS run; NOT RUN), cases, passed, failing (case ids and titles), ms, measured (a leg's own `measured`
//          object, the win-* legs), and sha256 of every exported file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
const has = k => argv.includes('--' + k);

if (has('compare')) { compare(arg('compare'), argv[argv.indexOf('--compare') + 2]); process.exit(0); }

const LIST = path.resolve(arg('list', path.join(HERE, 'win-legs.txt')));
const OUT = path.resolve(arg('out', path.join(HERE, 'xgate-out')));
const FROM = Number(arg('from', 1)), TO = Number(arg('to', 1e9));
const ONLY = arg('only', '') ? new RegExp(arg('only')) : null;
const CAP = Number(arg('cap', 0));
fs.mkdirSync(OUT, { recursive: true });

// ---- the list ----------------------------------------------------------------------------------------------------
const none = v => (v == null || v === '' || v === '-') ? '' : v;
const entries = [];
for (const raw of fs.readFileSync(LIST, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const f = line.split('|').map(s => s.trim());
  const e = { n: entries.length + 1, leg: f[0], fixture: none(f[1]), query: none(f[2]), secs: Number(none(f[3]) || 120),
    window: none(f[4]), scale: none(f[5]), tz: none(f[6]), page: none(f[7]) };
  e.name = outName(e);
  entries.push(e);
}
// One output name per line, stable across OSes so two summaries line up: leg--fixture--q<hash>--w<W>x<H>--s<scale>--tz<hash>--p<page>.
function outName(e) {
  const h = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);
  let n = e.leg;
  if (e.fixture) n += '--' + e.fixture;
  if (e.query) n += '--q' + (/^[\w=.-]{1,24}$/.test(e.query) ? e.query.replace(/=/g, '-') : h(e.query));
  if (e.window) n += '--w' + e.window.replace(',', 'x');
  if (e.scale) n += '--s' + e.scale;
  if (e.tz) n += '--tz' + h(e.tz);
  if (e.page) n += '--p' + e.page.replace(/^.*\//, '').replace(/\.html$/, '');
  return n.replace(/[^\w.@+-]/g, '_');
}

// ---- run ---------------------------------------------------------------------------------------------------------
if (!has('summarize')) {
  // --missing: only the entries with no result in <out> yet; --max N: at most N of them (chunked local runs).
  const pick = entries.filter(e => e.n >= FROM && e.n <= TO && (!ONLY || ONLY.test(e.name)) &&
    (!has('missing') || !fs.existsSync(path.join(OUT, e.name + '.json')))).slice(0, Number(arg('max', 1e9)));
  const tStart = Date.now();
  for (const e of pick) {
    const secs = CAP ? Math.min(CAP, e.secs) : e.secs;
    const a = [path.join(HERE, 'xleg.mjs'), '--leg', e.leg, '--name', e.name, '--out', OUT, '--secs', String(secs)];
    if (e.fixture) a.push('--state', e.fixture);
    if (e.query) a.push('--query', e.query);
    if (e.window) a.push('--window', e.window);
    if (e.scale) a.push('--scale', e.scale);
    if (e.tz) a.push('--tz', e.tz);
    if (e.page) a.push('--page', e.page);
    if (/^win-/.test(e.leg)) a.push('--shot', path.join(OUT, 'shots', e.name + '.png'));
    if (process.env.HARNESS_PORT) a.push('--port', process.env.HARNESS_PORT);
    const r = spawnSync(process.execPath, a, { stdio: ['ignore', 'inherit', 'pipe'], encoding: 'utf8', timeout: (secs + 120) * 1000 });
    const line = (r.stderr || '').trim().split('\n').pop() || `xleg exited ${r.status}`;
    console.log(`[${e.n}/${entries.length}] ${line}`);
  }
  console.log(`xgate: ran ${pick.length} legs in ${((Date.now() - tStart) / 1000).toFixed(0)} s`);
}

// ---- summary -----------------------------------------------------------------------------------------------------
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } };
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files = fs.readdirSync(OUT);
let env = null;
const legs = entries.map(e => {
  const res = readJson(path.join(OUT, e.name + '.json')), side = readJson(path.join(OUT, e.name + '.xleg.json'));
  const row = { n: e.n, name: e.name, leg: e.leg, fixture: e.fixture || null, query: e.query || null, secs: e.secs,
    window: e.window || null, scale: e.scale || null, tz: e.tz || null, page: e.page || null };
  if (!res) return Object.assign(row, { status: 'NOT RUN' });
  if (!env && side && side.env && !side.env.error && !e.scale) {
    env = { platform: process.platform, release: os.release(), node: process.version, osOfRun: side.os,
      chrome: side.chrome && { browser: side.chrome.Browser, userAgent: side.chrome['User-Agent'], protocol: side.chrome['Protocol-Version'] },
      page: side.env, from: e.name };
  }
  // Judged cases are {id, pass: boolean}. Some gate legs use `cases` for measurements instead (wrapdate) and are judged
  // by gate.sh's own script; a top-level boolean PASS is used when the leg gives one.
  const raw = Array.isArray(res.cases) ? res.cases : [];
  const judged = raw.length && raw.every(c => c && typeof c.pass === 'boolean');
  const cases = judged ? raw : typeof res.PASS === 'boolean' ? [{ id: 'PASS', title: 'the leg\'s own PASS flag', pass: res.PASS }] : [];
  const failing = cases.filter(c => c.pass !== true).map(c => String(c.id) + ': ' + String(c.title || '').slice(0, 100));
  const exported = {};
  for (const f of files) {
    if (f.startsWith(e.name + '.') && /\.(xlsx|pdf|sptcal)$/.test(f) && !f.slice(e.name.length + 1).includes('--')) exported[f] = sha(path.join(OUT, f));
  }
  return Object.assign(row, {
    status: res.EX ? 'FAIL' : !cases.length ? 'REPORTED' : failing.length ? 'FAIL' : 'PASS',
    ex: res.EX ? String(res.EX).slice(0, 300) : undefined,
    cases: cases.length, passed: cases.length - failing.length, failing,
    ms: side && side.ms, measured: res.measured, exported });
});
const count = s => legs.filter(l => l.status === s).length;
const summary = { generated: new Date().toISOString(), list: path.basename(LIST), env,
  totals: { legs: legs.length, PASS: count('PASS'), FAIL: count('FAIL'), REPORTED: count('REPORTED'), 'NOT RUN': count('NOT RUN'),
    cases: legs.reduce((a, l) => a + (l.cases || 0), 0), casesPassed: legs.reduce((a, l) => a + (l.passed || 0), 0) },
  legs };
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
const t = summary.totals;
console.log(`xgate: ${t.legs} legs: ${t.PASS} PASS, ${t.FAIL} FAIL, ${t.REPORTED} REPORTED, ${t['NOT RUN']} NOT RUN; cases ${t.casesPassed}/${t.cases} -> ${path.join(OUT, 'summary.json')}`);
for (const l of legs.filter(l => l.status === 'FAIL')) console.log(`  FAIL  ${l.name}: ${l.ex || l.failing.slice(0, 3).join(' | ')}`);
process.exit(0);

// ---- compare two summaries (and the leg JSONs beside them) ------------------------------------------------------------
function compare(pa, pb) {
  const A = JSON.parse(fs.readFileSync(pa, 'utf8')), B = JSON.parse(fs.readFileSync(pb, 'utf8'));
  const da = path.dirname(pa), db = path.dirname(pb);
  const pe = s => s && s.env ? `${s.env.platform} ${s.env.release}; ${s.env.chrome && s.env.chrome.browser}; navigator.platform ${s.env.page && s.env.page.platform}; dpr ${s.env.page && s.env.page.dpr}; scrollbar ${JSON.stringify(s.env.page && s.env.page.scrollbar)}` : '?';
  console.log('A: ' + pe(A) + '\nB: ' + pe(B));
  const bm = new Map(B.legs.map(l => [l.name, l]));
  let diffs = 0;
  // Values that legitimately differ run to run (wall time, today's date) are skipped by key name.
  const VOLATILE = /(^|_)(ms|elapsed|took|time|timing|today|now|stamp|date|at|generated|wall)s?$/i;
  function walk(x, y, p, outl) {
    if (outl.length > 12) return;
    if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y) || (x === null) !== (y === null)) { outl.push(`${p}: ${JSON.stringify(x)?.slice(0, 80)} vs ${JSON.stringify(y)?.slice(0, 80)}`); return; }
    if (x && typeof x === 'object') {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) { if (!VOLATILE.test(k)) walk(x[k], y[k], p + '.' + k, outl); }
      return;
    }
    if (x !== y) outl.push(`${p}: ${JSON.stringify(x)?.slice(0, 80)} vs ${JSON.stringify(y)?.slice(0, 80)}`);
  }
  for (const a of A.legs) {
    const b = bm.get(a.name);
    if (!b) { console.log(`ONLY IN A  ${a.name}`); diffs++; continue; }
    const notes = [];
    if (a.status !== b.status) notes.push(`status ${a.status} -> ${b.status}`);
    if (a.passed !== b.passed || a.cases !== b.cases) notes.push(`cases ${a.passed}/${a.cases} -> ${b.passed}/${b.cases}`);
    const fa = new Set(a.failing || []), fb = new Set(b.failing || []);
    const newly = [...fb].filter(x => !fa.has(x)), fixed = [...fa].filter(x => !fb.has(x));
    if (newly.length) notes.push('newly failing: ' + newly.join(' | '));
    if (fixed.length) notes.push('no longer failing: ' + fixed.join(' | '));
    for (const f of new Set([...Object.keys(a.exported || {}), ...Object.keys(b.exported || {})])) {
      if ((a.exported || {})[f] !== (b.exported || {})[f]) notes.push(`file ${f} differs`);
    }
    if (a.measured || b.measured) { const o = []; walk(a.measured, b.measured, 'measured', o); if (o.length) notes.push(...o); }
    if (a.status === 'REPORTED' && b.status === 'REPORTED') {
      const ja = (() => { try { return JSON.parse(fs.readFileSync(path.join(da, a.name + '.json'), 'utf8')); } catch (e) { return null; } })();
      const jb = (() => { try { return JSON.parse(fs.readFileSync(path.join(db, b.name + '.json'), 'utf8')); } catch (e) { return null; } })();
      if (ja && jb) { const o = []; walk(ja, jb, 'result', o); if (o.length) notes.push(...o); }
    }
    if (notes.length) { diffs++; console.log(`DIFF  ${a.name}\n      ` + notes.join('\n      ')); }
  }
  for (const b of B.legs) if (!A.legs.find(a => a.name === b.name)) { console.log(`ONLY IN B  ${b.name}`); diffs++; }
  console.log(`compare: ${diffs} of ${A.legs.length} legs differ`);
}
