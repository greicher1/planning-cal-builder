#!/usr/bin/env node
// Score today's two placements against each seed's answer key (LAYOUT-STUDY-PLAN.md §3 item 4, §4.3).
//
//   node tools/layout-study/compare.mjs <port> "<scrubbed folder>" [seed-id ...]
//
// For every seed (or the ones named) and each of Reuse Empty Columns off / on, opens the study server's
// /app page in headless Chrome, dumps the rendered waterfall, reads each week row's cells per year block
// (column index and width of every phase and of the Sim Post lane), and compares them with the answer
// key in specs.json. Writes the engine's layout to <scrubbed>/engine/<seed>.<mode>.json for the study page
// and prints the hit rate: phase-weeks whose column and width match the picture.
//
// The Sim Post lane is scored apart (SP1, ruled 2 Nov 2026, fixes it right of Production) and never
// counts against a placement. Chrome is driven as tests/harness/run.sh does: --dump-dom, then poll the
// file until it ends in </html> and holds still, then kill (Chrome does not exit on its own).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [portArg, dir, ...only] = process.argv.slice(2);
if (!portArg || !dir) { console.error('usage: node tools/layout-study/compare.mjs <port> "<scrubbed folder>" [seed ...]'); process.exit(2); }
const PORT = +portArg;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const specs = JSON.parse(fs.readFileSync(path.join(dir, 'specs.json'), 'utf8'));
const ids = (only.length ? only : Object.keys(specs).filter(k => !k.startsWith('_'))).filter(id => fs.existsSync(path.join(dir, id + '.sptcal')));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-study-'));
const engineDir = path.join(dir, 'engine');
fs.mkdirSync(engineDir, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function dumpDom(url, tag) {
  const out = path.join(tmp, tag + '.html');
  const profile = path.join(tmp, 'profile-' + tag);
  const fd = fs.openSync(out, 'w');
  const p = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-features=MacAppCodeSignClone',
    '--user-data-dir=' + profile, '--window-size=1600,1200', '--virtual-time-budget=8000', '--dump-dom', url], { stdio: ['ignore', fd, 'ignore'] });
  let last = -1, steady = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    await sleep(300);
    let size = -1;
    try { size = fs.statSync(out).size; } catch (e) {}
    if (size > 0 && size === last) {
      const tail = fs.readFileSync(out, 'utf8').slice(-64);
      if (/<\/html>\s*$/.test(tail)) steady++; else steady = 0;
    } else steady = 0;
    last = size;
    if (steady >= 2) break;
    if (p.exitCode !== null) break;
  }
  try { p.kill('SIGKILL'); } catch (e) {}
  fs.closeSync(fd);
  return fs.readFileSync(out, 'utf8');
}

const attr = (tag, name) => { const m = tag.match(new RegExp('\\s' + name + '="([^"]*)"')); return m ? m[1] : null; };
const text = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();

// The rendered table -> blocks: [{year|'single', rows: [{date, band?, cells: [{what, col, width}]}]}]
function readTable(html, singleColumn) {
  const wrap = html.match(/<div id="table-wrap"[\s\S]*?<\/table>/);
  if (!wrap) throw new Error('no #table-wrap table in the dump');
  const rows = [...wrap[0].matchAll(/<tr data-row="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g)];
  const blocks = [];
  for (const [, , inner] of rows) {
    const tds = [...inner.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/g)].map(m => ({ a: m[1], body: m[2] }));
    let bi = -1, pos = 0, cur = null;
    for (const td of tds) {
      const cls = attr(td.a, 'class') || '';
      if (/\bsheet-date\b/.test(cls)) {
        bi++; pos = 0;
        if (!blocks[bi]) blocks[bi] = { rows: [] };
        cur = { date: text(td.body), cells: [] };
        blocks[bi].rows.push(cur);
        continue;
      }
      if (/\bsheet-empty\b/.test(cls)) { if (!cur || cur.closed) { if (/sheet-blockstart/.test(cls) || pos === 0) bi += 0; } cur = null; continue; }
      if (!cur) continue;
      if (/\bsheet-note-cell\b/.test(cls)) { cur.closed = true; cur = null; continue; }
      const span = +(attr(td.a, 'colspan') || 1);
      const pkey = attr(td.a, 'data-pkey');
      const t = text(td.body);
      if (/\bsheet-hiatus-cell\b/.test(cls) && !pkey) { cur.band = t; pos += span; continue; }
      if (pkey) cur.cells.push({ what: pkey, col: pos, width: span, hiatus: /\bsheet-hiatus-cell\b/.test(cls) || undefined });
      else if (/^Simultaneous Post/i.test(t) || /Simultaneous Post/i.test(t)) cur.cells.push({ what: 'simpost', col: pos, width: span });
      pos += span;
    }
  }
  // The row loop above advances bi on every date cell in a row, so blocks are in left-to-right order.
  // Name each block by the year of its first date (m/d/yy), or 'single'.
  for (const b of blocks) {
    const m = b.rows[0] && b.rows[0].date.match(/(\d+)\/(\d+)\/(\d+)/);
    b.year = singleColumn ? 'single' : (m ? String(2000 + +m[3]) : '?');
    b.width = Math.max(0, ...b.rows.map(r => r.cells.reduce((w, c) => Math.max(w, c.col + c.width), 0)));
  }
  return blocks;
}

const toIso = (mdy) => { const m = mdy.match(/(\d+)\/(\d+)\/(\d+)/); return m ? `${2000 + +m[3]}-${String(+m[1]).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}` : mdy; };

function expected(keyBlock, phase, iso) {
  if (!keyBlock) return null;
  const col = keyBlock.cols.findIndex(c => c.includes(phase));
  if (col < 0) return { missing: true };
  for (const w of keyBlock.wide || []) {
    if (w.phase !== phase) continue;
    if (w.from && iso < w.from) continue;
    if (w.to && iso > w.to) continue;
    return { col: w.col !== undefined ? w.col : col, width: w.width };
  }
  return { col, width: 1 };
}

const results = [];
for (const id of ids) {
  const spec = specs[id];
  for (const mode of ['off', 'on']) {
    const url = `http://localhost:${PORT}/app?seed=${id}&reuse=${mode}`;
    const html = await dumpDom(url, id + '.' + mode);
    const blocks = readTable(html, !!spec.singleColumn);
    fs.writeFileSync(path.join(engineDir, `${id}.${mode}.json`), JSON.stringify(blocks, null, 1));
    if (process.env.KEEP_DUMP) fs.writeFileSync(path.join(engineDir, `${id}.${mode}.html`), html);
    const r = { id, mode, phaseWeeks: 0, colMiss: 0, widthMiss: 0, laneWeeks: 0, laneMiss: 0, unexpected: new Set(), byPhase: {}, blocksSeen: blocks.map(b => b.year + ':' + b.width + 'w') };
    for (const b of blocks) {
      const kb = spec.key[b.year];
      for (const row of b.rows) {
        const iso = toIso(row.date);
        for (const c of row.cells) {
          const e = expected(kb, c.what, iso);
          if (!e) { r.unexpected.add('block ' + b.year); continue; }
          if (e.missing) { r.unexpected.add(c.what + '@' + b.year); continue; }
          if (c.what === 'simpost') { r.laneWeeks++; if (e.col !== c.col) r.laneMiss++; continue; }
          r.phaseWeeks++;
          const bp = r.byPhase[c.what] || (r.byPhase[c.what] = { weeks: 0, col: 0, width: 0, first: null });
          bp.weeks++;
          if (e.col !== c.col) { r.colMiss++; bp.col++; bp.first = bp.first || `${iso} col ${c.col} (key ${e.col})`; }
          else if (e.width !== c.width) { r.widthMiss++; bp.width++; bp.first = bp.first || `${iso} width ${c.width} (key ${e.width})`; }
        }
      }
    }
    results.push(r);
    const pct = r.phaseWeeks ? ((r.phaseWeeks - r.colMiss - r.widthMiss) / r.phaseWeeks * 100).toFixed(1) : '-';
    console.log(`${id} reuse ${mode.padEnd(3)}  blocks ${r.blocksSeen.join(' ')}  phase-weeks ${r.phaseWeeks}  col-miss ${r.colMiss}  width-miss ${r.widthMiss}  hit ${pct}%` +
      (r.laneWeeks ? `  lane ${r.laneWeeks - r.laneMiss}/${r.laneWeeks}` : '') + (r.unexpected.size ? `  UNEXPECTED ${[...r.unexpected].join(',')}` : ''));
    for (const [k, bp] of Object.entries(r.byPhase)) if (bp.col || bp.width) console.log(`    ${k}: ${bp.col} col, ${bp.width} width of ${bp.weeks} weeks; first ${bp.first}`);
  }
}
const tot = m => results.filter(r => r.mode === m).reduce((a, r) => ({ w: a.w + r.phaseWeeks, c: a.c + r.colMiss, d: a.d + r.widthMiss }), { w: 0, c: 0, d: 0 });
for (const m of ['off', 'on']) { const t = tot(m); console.log(`\nTOTAL reuse ${m}: ${t.w} phase-weeks, ${t.c} column misses, ${t.d} width misses, hit ${((t.w - t.c - t.d) / t.w * 100).toFixed(1)}%`); }
fs.rmSync(tmp, { recursive: true, force: true });
