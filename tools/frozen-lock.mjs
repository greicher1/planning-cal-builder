#!/usr/bin/env node
// THE FROZEN-CODE GUARD (owner, 21 Nov 2026: "Build the guard").
//
// CLAUDE.md freezes a list of engine declarations ("Never touch the grid or the exports"): the width
// model, grid rendering and geometry, text fitting, direct manipulation, the writers, and the four
// functions its named frozen edits made frozen. Until now that freeze was prose only. Nothing stopped
// an edit; the gate caught one only if it happened to move an output the gate compares.
//
// This tool fingerprints the EXACT TEXT of every frozen declaration (SHA-256 of its source span, its
// inner comments included, the comment above it not) and compares it with tools/frozen-lock.json.
// `npm run check` runs it through tools/check-build.mjs, and deploy.yml runs `npm run check` on every
// push, so a frozen declaration that changed without an approved lock update fails the deploy.
//
//   node tools/frozen-lock.mjs                       check (exit 1 on any difference)
//   node tools/frozen-lock.mjs --approve "<words>"   re-lock the declarations that changed, recording
//                                                    the owner's approval in the lock's history
//   node tools/frozen-lock.mjs --approve "<words>" --add name[:group] --remove name
//                                                    freeze or unfreeze a declaration (owner's call)
//   node tools/frozen-lock.mjs --self-test           prove a one-character change to EACH frozen
//                                                    declaration, and a rename, are caught
//
// ⛔ `--approve` is for an edit the OWNER approved, in their words, with the date. It is a tamper seal,
// not a padlock: a session can run it without asking, but the lock file then changes in the same
// commit, each re-locked entry carries the approval it was given, and
//   git log --format='%h %cs %(trailers:key=Frozen-edit-approved,valueonly)' -- tools/frozen-lock.json
// is the history of every frozen edit. Never run it to make a red check go green.
// On a merge conflict in the lock (two branches edited the SAME frozen declaration): resolve the code,
// then re-run --approve quoting both approvals.
//
// What it does NOT guard, on purpose and said here so nobody assumes otherwise:
//   - BEHAVIOUR. A non-frozen helper that frozen code calls can still change what it does. The gate
//     (byte-identical exports) is what guards behaviour; this guards the frozen text.
//   - The frozen CSS. Not locked yet (owner's call, HANDOFF 21 Nov 2026).
//   - Moving a declaration within the file, or reformatting the file around it: only its own text counts.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT_DEFAULT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCK_REL = 'tools/frozen-lock.json';

// rolldown is Vite 8's bundler, so `npm ci` always installs it; its parser reads the engine in ~0.2 s.
// If a Vite upgrade ever drops it, this throws loudly rather than passing quietly.
function loadParser(root) {
  const req = createRequire(path.join(root, 'package.json'));
  return req('rolldown/parseAst').parseAst;
}

// The declarations a frozen name may live in: the program's top level, any exported function's
// body, and the engine's IIFE inside initLegacyApp() (where every frozen declaration is today). A
// later split into modules lands at a module's top level, which is still covered.
function scopeBodies(ast) {
  const bodies = [ast.body];
  for (const st of ast.body) {
    const decl = st.type === 'ExportNamedDeclaration' ? st.declaration : st;
    if (!decl || decl.type !== 'FunctionDeclaration' || !decl.body) continue;
    bodies.push(decl.body.body);
    for (const inner of decl.body.body) {
      const call = inner.type === 'ExpressionStatement' && inner.expression.type === 'CallExpression' ? inner.expression : null;
      const fn = call && call.callee;
      if (fn && (fn.type === 'FunctionExpression' || fn.type === 'ArrowFunctionExpression') && fn.body && fn.body.body) bodies.push(fn.body.body);
    }
  }
  return bodies;
}

// name -> [{start, end}] for every function, class or variable declaration in those scopes. A
// variable statement declaring several names gives each of them the WHOLE statement's text.
function declarationsIn(ast) {
  const found = new Map();
  const add = (name, node) => {
    if (!found.has(name)) found.set(name, []);
    found.get(name).push({ start: node.start, end: node.end });
  };
  for (const body of scopeBodies(ast)) {
    for (const st of body) {
      const decl = st.type === 'ExportNamedDeclaration' && st.declaration ? st.declaration : st;
      if ((decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') && decl.id) add(decl.id.name, decl);
      else if (decl.type === 'VariableDeclaration') {
        for (const d of decl.declarations) if (d.id && d.id.type === 'Identifier') add(d.id.name, decl);
      }
    }
  }
  return found;
}

// Line endings are normalised first: a checkout with core.autocrlf (a Windows machine, a future Windows
// runner) turns every \n into \r\n, which is not an edit. Nothing else is normalised.
const sha = (text) => crypto.createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('hex');
const lineCount = (text) => text.split('\n').length;

export function readLock(root = ROOT_DEFAULT) {
  return JSON.parse(fs.readFileSync(path.join(root, LOCK_REL), 'utf8'));
}

// Fingerprint the named declarations in `src`. Returns name -> {sha256, lines} or {error}.
export function fingerprint(src, names, parseAst) {
  const ast = parseAst(src);
  const decls = declarationsIn(ast);
  const out = {};
  for (const name of names) {
    const hits = decls.get(name) || [];
    if (hits.length === 0) { out[name] = { error: 'not found (renamed, deleted or moved inside another function?)' }; continue; }
    if (hits.length > 1) { out[name] = { error: `declared ${hits.length} times` }; continue; }
    const text = src.slice(hits[0].start, hits[0].end);
    out[name] = { sha256: sha(text), lines: lineCount(text) };
  }
  return out;
}

// The check. Returns {ok, total, changed: [{name, why}], summary}.
export function verifyFrozen(root = ROOT_DEFAULT, srcOverride) {
  const lock = readLock(root);
  const names = Object.keys(lock.declarations);
  const src = srcOverride !== undefined ? srcOverride : fs.readFileSync(path.join(root, lock.file), 'utf8');
  const now = fingerprint(src, names, loadParser(root));
  const changed = [];
  for (const name of names) {
    const want = lock.declarations[name];
    const got = now[name];
    if (got.error) changed.push({ name, why: got.error });
    else if (got.sha256 !== want.sha256) changed.push({ name, why: `text changed (${want.lines} lines when locked, ${got.lines} now)` });
  }
  return {
    ok: changed.length === 0 && names.length > 0,
    total: names.length,
    changed,
    summary: changed.length ? changed.map((c) => `${c.name}: ${c.why}`).join('; ') : `${names.length} declarations in ${lock.file}`,
  };
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function approve(root, words, adds, removes) {
  if (!words || words.trim().length < 12) {
    console.error('--approve needs the owner\'s approval in their words with the date, e.g.\n' +
      '  --approve "Owner\'s picker \\"Approve\\", 21 Nov 2026: frozen edit XY1 in renderMonthView"');
    process.exit(2);
  }
  const lockPath = path.join(root, LOCK_REL);
  const lock = readLock(root);
  for (const name of removes) {
    if (!lock.declarations[name]) { console.error(`--remove ${name}: not in the lock`); process.exit(2); }
    delete lock.declarations[name];
  }
  for (const spec of adds) {
    const [name, group = 'added'] = spec.split(':');
    if (lock.declarations[name]) { console.error(`--add ${name}: already locked`); process.exit(2); }
    lock.declarations[name] = { group, sha256: '', lines: 0 };
  }
  const src = fs.readFileSync(path.join(root, lock.file), 'utf8');
  const now = fingerprint(src, Object.keys(lock.declarations), loadParser(root));
  const relocked = [];
  for (const [name, entry] of Object.entries(lock.declarations)) {
    const got = now[name];
    if (got.error) { console.error(`${name}: ${got.error}. Nothing written.`); process.exit(1); }
    if (got.sha256 !== entry.sha256) { relocked.push(name); entry.sha256 = got.sha256; entry.lines = got.lines; }
  }
  const removed = removes.slice();
  if (!relocked.length && !removed.length) { console.log('Nothing changed: every frozen declaration already matches the lock. Nothing written.'); return; }
  // The approval is written ON each re-locked entry, not appended to a shared list: two branches that
  // edit different frozen functions then merge without a conflict in this file, and two that edit
  // the SAME one conflict, which is exactly the case a person should look at.
  const stamp = `${today()}: ${words.trim()}`;
  for (const name of relocked) lock.declarations[name].approved = stamp;
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  console.log(`Re-locked ${relocked.length}${removed.length ? `, unfroze ${removed.length}` : ''}: ${[...relocked, ...removed].join(', ')}`);
  console.log('Commit tools/frozen-lock.json in the SAME commit as the frozen edit, with this line at the end of the message:');
  console.log(`  Frozen-edit-approved: ${words.trim()}`);
}

// Mutation test: one space added inside each declaration (just before its last character) must turn
// exactly that declaration red, and a rename must read as "not found". One parse per mutant.
function selfTest(root) {
  const lock = readLock(root);
  const names = Object.keys(lock.declarations);
  const src = fs.readFileSync(path.join(root, lock.file), 'utf8');
  const parseAst = loadParser(root);
  const base = verifyFrozen(root, src);
  if (!base.ok) { console.error(`self-test needs a green lock first: ${base.summary}`); process.exit(1); }
  const decls = declarationsIn(parseAst(src));
  let bad = 0;
  for (const name of names) {
    const { start, end } = decls.get(name)[0];
    // Names declared in ONE statement (const A = 1, B = 2;) share its text, so a change flags them all.
    const expect = names.filter((n) => decls.get(n)[0].start === start).sort();
    const inner = end - 1; // before the closing } or ;
    const mutant = src.slice(0, inner) + ' ' + src.slice(inner);
    const r = verifyFrozen(root, mutant);
    const hit = r.changed.map((c) => c.name).sort();
    if (hit.join() !== expect.join()) { bad++; console.error(`  MISSED  ${name}: flagged [${hit.join(', ')}], expected [${expect.join(', ')}]`); }
  }
  // a rename of the first locked function
  const fnName = names.find((n) => /^function\b/.test(src.slice(decls.get(n)[0].start, decls.get(n)[0].start + 9)));
  const at = decls.get(fnName)[0].start;
  const renamed = src.slice(0, at) + src.slice(at).replace(`function ${fnName}(`, `function ${fnName}Renamed(`);
  const rr = verifyFrozen(root, renamed);
  const renameCaught = rr.changed.some((c) => c.name === fnName && /not found/.test(c.why));
  if (!renameCaught) { bad++; console.error(`  MISSED  rename of ${fnName}`); }
  console.log(`self-test: ${names.length} one-space mutants + 1 rename, ${bad ? `${bad} MISSED` : 'every one caught'}`);
  process.exit(bad ? 1 : 0);
}

// ---- CLI -------------------------------------------------------------------------------------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const take = (flag) => { const out = []; for (let i = 0; i < args.length; i++) if (args[i] === flag && args[i + 1] !== undefined) out.push(args[i + 1]); return out; };
  if (args.includes('--self-test')) selfTest(ROOT_DEFAULT);
  else if (args.includes('--approve')) approve(ROOT_DEFAULT, take('--approve')[0], take('--add'), take('--remove'));
  else {
    const r = verifyFrozen(ROOT_DEFAULT);
    if (r.ok) { console.log(`frozen code unchanged: ${r.summary}`); }
    else {
      console.error(`FROZEN CODE CHANGED (${r.changed.length} of ${r.total}):`);
      for (const c of r.changed) console.error(`  ${c.name}: ${c.why}`);
      console.error('\nThese declarations are frozen (CLAUDE.md, "Never touch the grid or the exports").\n' +
        'Put them back, or, ONLY with the owner\'s approval for this frozen edit:\n' +
        '  node tools/frozen-lock.mjs --approve "<the owner\'s words, date, what changed>"');
      process.exit(1);
    }
  }
}
