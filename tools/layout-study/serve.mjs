#!/usr/bin/env node
// The layout study's local server (LAYOUT-STUDY-PLAN.md §4). Localhost only, never deployed.
//
//   node tools/layout-study/serve.mjs <port> "<scrubbed folder>" [<path to dist/index.html>]
//
// GET /                          the study page (index.html beside this file)
// GET /seeds                     the seed ids (json)
// GET /specs.json                the specs, answer keys included
// GET /app?seed=<id>&reuse=on|off[&layout=<json>][&spans=<json>]
//     The build with <scrubbed>/<id>.sptcal substituted into its <script id="saved-state"> block (the
//     shareable-copy restore path, as tests/harness/srv.js does for ?state=), `colReuse` set from `reuse`,
//     `spans` merged into the snapshot's cellSpans, and the page's own query string kept, so the app's
//     localhost-only `?layout=` hook reads it.
// GET /candidate?seed=<id>       the picture's own layout as {layout, spans} for /app (solved from the key)
// GET /diffs?seed=<id>           where today's two layouts differ from the picture (from compare.mjs's
//                                engine/<id>.<mode>.json), as runs: one question each
// GET /by-hand/<file>            the picture itself (png/pdf), from <scrubbed>/by-hand
// GET /picks  POST /pick         the owner's answers, kept in <scrubbed>/../picks.json
//
// Only the scrubbed folder is ever read; the originals never pass through here.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const [portArg, dir, distArg] = process.argv.slice(2);
if (!portArg || !dir) { console.error('usage: node tools/layout-study/serve.mjs <port> "<scrubbed folder>" [dist/index.html]'); process.exit(2); }
const PORT = +portArg;
const DIST = distArg ? path.resolve(distArg) : path.join(repo, 'dist', 'index.html');
const PICKS = path.join(path.dirname(path.resolve(dir)), 'picks.json');
const STATE_RE = /(<script id="saved-state" type="application\/json">)([\s\S]*?)(<\/script>)/;

const seedIds = () => fs.readdirSync(dir).filter(f => /^[\w-]+\.sptcal$/.test(f)).map(f => f.replace(/\.sptcal$/, '')).sort();
const specs = () => JSON.parse(fs.readFileSync(path.join(dir, 'specs.json'), 'utf8'));
const engine = (id, mode) => { const f = path.join(dir, 'engine', `${id}.${mode}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const toIso = (mdy) => { const m = mdy.match(/(\d+)\/(\d+)\/(\d+)/); return m ? `${2000 + +m[3]}-${String(+m[1]).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}` : mdy; };

function expected(keyBlock, phase, iso) {
  if (!keyBlock) return null;
  const col = keyBlock.cols.findIndex(c => c.includes(phase));
  if (col < 0) return null;
  for (const w of keyBlock.wide || []) {
    if (w.phase !== phase) continue;
    if (w.from && iso < w.from) continue;
    if (w.to && iso > w.to) continue;
    return { col: w.col !== undefined ? w.col : col, width: w.width };
  }
  return { col, width: 1 };
}

// Where a mode's layout differs from the picture, as runs of consecutive weeks: one question each.
function diffs(id) {
  const spec = specs()[id];
  const out = [];
  for (const mode of ['off', 'on']) {
    const blocks = engine(id, mode);
    if (!blocks) continue;
    const open = {};   // phase|block|kind -> run
    for (const b of blocks) {
      const kb = spec.key[b.year];
      for (const row of b.rows) {
        const iso = toIso(row.date);
        const seen = new Set();
        for (const c of row.cells) {
          if (c.what === 'simpost') continue;
          const e = expected(kb, c.what, iso);
          if (!e) continue;
          const kind = e.col !== c.col ? 'column' : (e.width !== c.width ? 'width' : null);
          const k = c.what + '|' + b.year;
          if (kind) {
            seen.add(k);
            const r = open[k];
            const same = r && r.kind === kind && r.engine.col === c.col && r.engine.width === c.width && r.key.col === e.col && r.key.width === e.width;
            if (same) r.to = iso;
            else { if (r) out.push(r); open[k] = { mode, phase: c.what, block: b.year, kind, from: iso, to: iso, engine: { col: c.col, width: c.width }, key: { col: e.col, width: e.width } }; }
          }
        }
        for (const k of Object.keys(open)) if (!seen.has(k)) { out.push(open[k]); delete open[k]; }
      }
      for (const k of Object.keys(open)) { out.push(open[k]); delete open[k]; }
    }
  }
  // Merge the two modes where they say the same thing, so one question covers both.
  const merged = [];
  for (const d of out) {
    const twin = merged.find(m => m.phase === d.phase && m.block === d.block && m.kind === d.kind && m.from === d.from && m.to === d.to && m.engine.col === d.engine.col && m.engine.width === d.engine.width);
    if (twin) twin.modes.push(d.mode); else merged.push(Object.assign({ modes: [d.mode] }, d));
  }
  merged.forEach((d, i) => { d.id = `${d.phase}|${d.block}|${d.kind}|${d.from}`; delete d.mode; });
  return merged;
}

// The picture's own layout for the hook: one `col` value per phase, chosen so that in every block the
// frozen order (first appearance, ties by `col`) reproduces the key's column order; and cellSpans for
// every `wide` cell, with k = the phases in that row so the override is honoured in full.
function candidate(id) {
  const spec = specs()[id];
  const blocks = engine(id, 'off') || [];
  // Phases that share a key column in any block share one value (union-find over the key's columns).
  const parent = {};
  const find = x => { while (parent[x] !== undefined && parent[x] !== x) x = parent[x]; return x; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  for (const p of spec.phases) parent[p.key] = p.key;
  for (const kb of Object.values(spec.key)) for (const col of kb.cols) { const ph = col.filter(k => k !== 'simpost'); for (let i = 1; i < ph.length; i++) union(ph[0], ph[i]); }
  // Order the groups: walk the blocks in order; a group is numbered when first met, in the key's left-to-right order.
  const order = [];
  for (const year of Object.keys(spec.key)) for (const col of spec.key[year].cols) { const ph = col.filter(k => k !== 'simpost'); if (!ph.length) continue; const g = find(ph[0]); if (!order.includes(g)) order.push(g); }
  const layout = {};
  for (const p of spec.phases) layout[p.key] = order.indexOf(find(p.key));
  // Spans: for each wide entry, every week the phase is active in that block (from the engine's rows).
  const spans = {};
  for (const b of blocks) {
    const kb = spec.key[b.year];
    if (!kb || !kb.wide) continue;
    for (const row of b.rows) {
      const iso = toIso(row.date);
      const nPhases = row.cells.filter(c => c.what !== 'simpost').length;
      for (const c of row.cells) {
        if (c.what === 'simpost') continue;
        const e = expected(kb, c.what, iso);
        if (!e || e.width === 1) continue;
        const own = kb.cols.findIndex(col => col.includes(c.what));
        spans[iso + '|' + c.what] = { l: Math.max(0, own - e.col), r: Math.max(0, e.col + e.width - 1 - own), k: nPhases };
      }
    }
  }
  return { layout, spans };
}

const readPicks = () => fs.existsSync(PICKS) ? JSON.parse(fs.readFileSync(PICKS, 'utf8')) : {};

http.createServer((q, r) => {
  const u = new URL(q.url, 'http://localhost');
  const send = (code, type, body) => { r.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); r.end(body); };
  const json = (o) => send(200, 'application/json', JSON.stringify(o));
  try {
    if (u.pathname === '/seeds') return json(seedIds());
    if (u.pathname === '/pictures') {
      const byHand = path.join(dir, 'by-hand');
      const files = fs.existsSync(byHand) ? fs.readdirSync(byHand) : [];
      const out = {};
      for (const id of seedIds()) { const f = files.find(x => x.replace(/\.[^.]+$/, '') === id); if (f) out[id] = f; }
      return json(out);
    }
    if (u.pathname === '/specs.json') return send(200, 'application/json', fs.readFileSync(path.join(dir, 'specs.json')));
    if (u.pathname === '/picks') return json(readPicks());
    if (u.pathname === '/pick' && q.method === 'POST') {
      let body = '';
      q.on('data', d => body += d);
      q.on('end', () => {
        try {
          const p = JSON.parse(body);
          const all = readPicks();
          all[p.key] = Object.assign({ at: new Date().toISOString() }, p);
          fs.writeFileSync(PICKS, JSON.stringify(all, null, 1) + '\n');
          json({ ok: true, count: Object.keys(all).length });
        } catch (e) { send(400, 'text/plain', String(e.message || e)); }
      });
      return;
    }
    const id = u.searchParams.get('seed') || '';
    if (['/app', '/candidate', '/diffs'].includes(u.pathname) && !/^[\w-]+$/.test(id)) return send(400, 'text/plain', 'bad seed id');
    if (u.pathname === '/candidate') return json(candidate(id));
    if (u.pathname === '/diffs') return json(diffs(id));
    if (u.pathname === '/app') {
      const snap = JSON.parse(fs.readFileSync(path.join(dir, id + '.sptcal'), 'utf8'));
      const reuse = u.searchParams.get('reuse');
      if (reuse === 'on') snap.colReuse = true; else if (reuse === 'off') delete snap.colReuse;
      const spans = u.searchParams.get('spans');
      if (spans) snap.cellSpans = Object.assign({}, snap.cellSpans || {}, JSON.parse(spans));
      const safe = JSON.stringify(snap).replace(/</g, '\\u003c');
      let html = fs.readFileSync(DIST, 'utf8');
      if (!STATE_RE.test(html)) return send(500, 'text/plain', 'no saved-state block in ' + DIST);
      html = html.replace(STATE_RE, (m, a, _b, c) => a + safe + c);
      return send(200, 'text/html; charset=utf-8', html);
    }
    if (u.pathname.startsWith('/by-hand/')) {
      const f = path.basename(u.pathname);
      if (!/^hand-\d+\.(png|jpe?g|pdf)$/.test(f)) return send(404, 'text/plain', 'no');
      const fp = path.join(dir, 'by-hand', f);
      if (!fs.existsSync(fp)) return send(404, 'text/plain', 'no');
      return send(200, f.endsWith('.pdf') ? 'application/pdf' : 'image/' + (f.endsWith('.png') ? 'png' : 'jpeg'), fs.readFileSync(fp));
    }
    if (u.pathname === '/' || u.pathname === '/index.html') {
      const page = path.join(here, 'index.html');
      if (!fs.existsSync(page)) return send(404, 'text/plain', 'no study page yet');
      return send(200, 'text/html; charset=utf-8', fs.readFileSync(page));
    }
    send(404, 'text/plain', 'not found');
  } catch (e) { send(500, 'text/plain', String(e && e.message || e)); }
}).listen(PORT, '127.0.0.1', () => console.log('layout study on http://localhost:' + PORT + '/  seeds: ' + seedIds().length + '  dist: ' + DIST + '  picks: ' + PICKS));
