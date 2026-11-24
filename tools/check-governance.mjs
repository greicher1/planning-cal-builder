#!/usr/bin/env node
// SPTCal's GOVERNANCE CHECKER (governance plan Phase 5, "Hold"; accepted proposals OUT-26, OUT-27, OUT-28,
// OUT-31, OUT-32, OUT-33, OUT-34, OUT-39 and OUT-40, GOVERNANCE-HISTORY.md's plan-work list).
//
// It holds the rules files themselves: the one route into them (CLAUDE.md's import), rule IDs that are never
// reused or lost, links that resolve, and the owner's pick behind every rule. It reads only text, so it runs in
// well under a second, and it uses nothing but Node's own modules, so the push guard can run the PUSHED commit's
// copy of this file straight out of git (tools/hooks/pre-push).
//
//   node tools/check-governance.mjs                  the working tree, compared with origin/main
//   node tools/check-governance.mjs --rev <commit>   that commit's files instead (what the push guard runs)
//   node tools/check-governance.mjs --base <ref>     compare rule IDs with <ref> instead of origin/main (OUT-33)
//   node tools/check-governance.mjs --warn-only      report everything, never fail (the deploy workflow, OUT-31)
//   node tools/check-governance.mjs --plans          also print every plan's status line as a table (OUT-32)
//   node tools/check-governance.mjs --self-test      prove each blocking check fails on broken samples (OUT-40)
//
// WHERE IT BLOCKS (OUT-31): on this computer (npm run governance) and inside the push guard, which refuses a push
// whose commit fails it. In the deploy workflow it only warns: a deploy never stops over a rules file.
//
// BLOCKING vs WARNING. The checks the accepted proposals say "fail" block: the import line (OUT-26), links through
// the old public address (OUT-26), IDs unique and never reused (OUT-27), replaced-by / replaces pairs (OUT-27),
// links that resolve with exact case (OUT-27), the owner's pick behind a new rule (OUT-28), and no rule ID lost or
// renumbered against main (OUT-33). Everything else warns, and every check added later starts as a warning
// (OUT-31) until the owner promotes it. Each blocking check has broken samples in tools/governance-samples.mjs.
//
// ⚖ RULING, 24 Nov 2026, owner's picker "Warn only" (AGAINST the recommendation, which was to fail): CLAUDE.md over
// 12 KB or GOVERNANCE.md over 80 KB (the budget proposed in plan §7e) is a warning, never a refusal (OUT-26).
//
// This file is protected (GOVERNANCE INTRO-2): change it only on the owner's yes, in a commit touching nothing
// else, with a message starting "Governance:" naming the rule or proposal IDs.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

// ── What the checks read ────────────────────────────────────────────────────────────────────────────────────
export const RULE_FILES = ['GOVERNANCE.md', 'GOVERNANCE-UI.md', 'GOVERNANCE-ENG.md'];
export const HISTORY = 'GOVERNANCE-HISTORY.md';
export const GOV_FILES = [...RULE_FILES, HISTORY];
export const LINK_FILES = ['CLAUDE.md', ...GOV_FILES];          // OUT-27: HANDOFF left out on purpose (noise)
const CHAPTERS = ['PRD', 'FRZ', 'FILE', 'SEC', 'REL', 'WORK', 'UX', 'COPY', 'TEST', 'CODE'];
const CITABLE = [...CHAPTERS, 'INTRO', 'OUT'];
const SIZE_BUDGET = { 'CLAUDE.md': 12 * 1024, 'GOVERNANCE.md': 80 * 1024 };   // plan §7e; warn only (ruling above)
// The commit where the rules landed after the owner's review page (21-23 Nov 2026: 233 accepted, 3 declined;
// governance Phase 4, live 23 Nov 2026). Every rule in it was accepted there, which is its owner's pick (OUT-28).
// A rule added since must carry its own. If this commit can't be read (a shallow clone), the rules on the base
// (origin/main) stand in for it.
export const REVIEW_BASELINE = '578bd46afc7642291cb9259434683735fb4c7732';
// OUT-39: what may hold a rule. Only a real mechanism gets a date it was seen to work.
export const HELD_BY = ['check', 'gate', 'deploy check', 'push guard', 'permission prompt', 'host rule', 'reminder', 'review only'];
// OUT-32: a plan's status line.
export const PLAN_STATUS = ['planned', 'building', 'live', 'parked', 'dropped', 'replaced'];
// OUT-34: HANDOFF's live part (everything above its numbered sections). Proposed default; the owner may set it.
export const HANDOFF_LIVE_BUDGET = 150 * 1024;

// ── Reading a source: the working tree, or one commit ──────────────────────────────────────────────────────
function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'], ...opts });
}
function tryGit(args, opts) { try { return git(args, opts); } catch { return null; } }

// Many files of one commit in a single `git cat-file --batch` (the push guard should not spawn a process per file).
function readAtRev(rev, paths) {
  const out = new Map();
  if (!paths.length) return out;
  let buf;
  try {
    buf = execFileSync('git', ['cat-file', '--batch'], { input: paths.map(p => `${rev}:${p}`).join('\n') + '\n', maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] });
  } catch { return out; }
  let i = 0;
  for (const p of paths) {
    const nl = buf.indexOf(10, i);
    const header = buf.subarray(i, nl).toString();
    i = nl + 1;
    if (/ missing$/.test(header)) continue;
    const size = Number(header.split(' ')[2]);
    out.set(p, buf.subarray(i, i + size).toString('utf8'));
    i += size + 1;
  }
  return out;
}

export function loadSource({ rev = null, base = 'origin/main' } = {}) {
  const list = rev
    ? (tryGit(['ls-tree', '-r', '--name-only', '-z', rev]) || '').split('\0').filter(Boolean)
    : (tryGit(['ls-files', '-z', '--cached', '--others', '--exclude-standard']) || '').split('\0').filter(Boolean);
  const plans = list.filter(p => /^[A-Z0-9-]+-PLAN\.md$/.test(p));
  const wanted = [...LINK_FILES, 'HANDOFF.md', ...plans];
  let files;
  if (rev) files = readAtRev(rev, wanted);
  else { files = new Map(); for (const p of wanted) if (existsSync(p)) files.set(p, readFileSync(p, 'utf8')); }

  const sha = r => r && tryGit(['rev-parse', '--verify', '--quiet', `${r}^{commit}`])?.trim();
  const baseSha = sha(base);
  const baseFiles = baseSha ? readAtRev(baseSha, GOV_FILES) : null;
  const reviewSha = sha(REVIEW_BASELINE);
  const reviewFiles = reviewSha ? readAtRev(reviewSha, GOV_FILES) : null;

  // "per FILE-4" citations in code and docs, through git grep (fast, and it reads the commit itself under --rev).
  // No \b: Apple's git takes POSIX ERE, where \b silently matches nothing (24 Nov 2026: it found 0 of 4).
  const grepArgs = ['grep', '-n', '-I', '-E', `(^|[^A-Za-z])per (${CITABLE.join('|')})-[0-9]+`];
  if (rev) grepArgs.push(rev);
  grepArgs.push('--', '.', ':!node_modules', ':!dist', ':!releases', ':!handoff', ':!package-lock.json');
  const grepOut = tryGit(grepArgs) || '';
  const citations = grepOut.split('\n').filter(Boolean).map(l => {
    if (rev && l.startsWith(rev + ':')) l = l.slice(rev.length + 1);
    const m = /^([^:]+):(\d+):(.*)$/.exec(l);
    return m ? { file: m[1], line: Number(m[2]), text: m[3] } : null;
  }).filter(Boolean);

  const url = tryGit(['remote', 'get-url', 'origin'])?.trim() || '';
  const gh = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url);
  return {
    label: rev ? `commit ${rev.slice(0, 8)}` : 'the working tree',
    files, list: new Set(list), plans,
    base: baseFiles && baseFiles.size ? { ref: base, sha: baseSha, files: baseFiles } : null,
    review: reviewFiles && reviewFiles.size ? { sha: reviewSha, files: reviewFiles } : null,
    citations,
    repo: gh ? { owner: gh[1], name: gh[2] } : null,
  };
}

// ── Parsing the rules files ────────────────────────────────────────────────────────────────────────────────
const HEADING = /^### (~~)?([A-Z]+-\d+) · (.*)$/;
const cleanTitle = t => t.replace(/~~/g, '').replace(/\s*\((declined|withdrawn)\)\s*$/i, '').replace(/\s*⚖\s*$/, '').trim();

export function parseRules(text, file) {
  const lines = text.split('\n');
  const rules = [];
  let cur = null;
  lines.forEach((line, i) => {
    const m = HEADING.exec(line);
    if (m) {
      cur = { id: m[2], title: cleanTitle(m[3]), struck: !!m[1], declined: /\(declined\)\s*$/i.test(m[3]), file, line: i + 1, body: [] };
      rules.push(cur);
      return;
    }
    if (/^#{1,3} /.test(line) || /^<a id=/.test(line)) { cur = null; return; }
    if (cur) cur.body.push(line);
  });
  for (const r of rules) r.body = r.body.join('\n');
  return rules;
}

// Every ID a set of governance files knows: rule and history headings, the intro's (INTRO-n), the OUT-n proposals.
export function knownIds(files) {
  const ids = new Map();
  const add = (id, title, where) => { if (!ids.has(id)) ids.set(id, { title, where }); };
  for (const f of GOV_FILES) {
    const t = files.get(f);
    if (!t) continue;
    for (const r of parseRules(t, f)) add(r.id, r.title, `${f}:${r.line}`);
    for (const m of t.matchAll(/\b((?:INTRO|OUT)-\d+)\b/g)) add(m[1], null, f);
  }
  return ids;
}

function blankCode(text) {
  // Fenced blocks and inline code spans are not links: blank them, keeping every newline so line numbers hold.
  return text
    .replace(/^```[\s\S]*?^```/gm, s => s.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, s => ' '.repeat(s.length));
}
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

export function githubSlug(heading) {
  return heading.trim().toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

// ── The checks ─────────────────────────────────────────────────────────────────────────────────────────────
export function runChecks(src) {
  const out = [];
  const fail = (check, msg) => out.push({ level: 'fail', check, msg });
  const warn = (check, msg) => out.push({ level: 'warn', check, msg });
  const F = src.files;
  const claude = F.get('CLAUDE.md');

  // OUT-26 · the route into the rules
  if (claude == null) fail('OUT-26 import', 'CLAUDE.md is missing, so no session loads the rules');
  else {
    const n = claude.split('\n').filter(l => l.trim() === '@GOVERNANCE.md').length;
    if (n !== 1) fail('OUT-26 import', `CLAUDE.md has the line "@GOVERNANCE.md" ${n} times; it must be there exactly once`);
    claude.split('\n').forEach((l, i) => {
      if (l.includes('⛔') && !/\b[A-Z]{2,5}-\d+\b/.test(l)) warn('OUT-26 ⛔ line', `CLAUDE.md:${i + 1}: a ⛔ line names no rule ID (CLAUDE.md holds no rules of its own, OUT-19)`);
    });
  }
  for (const [f, max] of Object.entries(SIZE_BUDGET)) {
    const t = F.get(f);
    if (t == null) continue;
    const size = Buffer.byteLength(t);
    if (size > max) warn('OUT-26 size', `${f} is ${(size / 1024).toFixed(1)} KB, over its ${max / 1024} KB budget (warn only, owner's picker 24 Nov 2026)`);
  }
  for (const p of src.list) {
    if (p === 'CLAUDE.md' || p.startsWith('.claude/worktrees/') || p.startsWith('node_modules/')) continue;
    if (/(^|\/)(CLAUDE|AGENTS)\.md$/.test(p)) warn('OUT-26 second CLAUDE.md', `${p}: a second CLAUDE.md or AGENTS.md; the rules have one route in`);
  }
  if (src.repo) {
    const o = src.repo.owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), r = src.repo.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const oldAddr = new RegExp(`https?://(?:www\\.)?(?:github\\.com/${o}/${r}(?![\\w.-])|raw\\.githubusercontent\\.com/${o}/${r}(?![\\w.-])|${o}\\.github\\.io/${r}(?![\\w.-]))`, 'i');
    for (const f of LINK_FILES) {
      const t = F.get(f);
      if (t == null) continue;
      const plain = blankCode(t);
      for (const m of plain.matchAll(/\]\(([^)\s]+)[^)]*\)|<(https?:[^>\s]+)>|(https?:\/\/[^\s)>\]]+)/g)) {
        const target = m[1] || m[2] || m[3];
        if (oldAddr.test(target)) fail('OUT-26 old address', `${f}:${lineOf(t, m.index)}: links into the repo through its old public address (${target}); link the file relatively`);
      }
    }
  } else warn('OUT-26 old address', 'no GitHub origin remote to read the old public address from: links not checked for it');

  // OUT-27 · IDs unique, retired IDs never reused, replaced-by / replaces pairs, links with exact case
  const live = [], hist = [];
  for (const f of RULE_FILES) if (F.has(f)) live.push(...parseRules(F.get(f), f));
  if (F.has(HISTORY)) hist.push(...parseRules(F.get(HISTORY), HISTORY));
  for (const f of GOV_FILES) if (!F.has(f)) fail('OUT-27 ids', `${f} is missing`);
  const seen = new Map();
  for (const r of live) {
    if (seen.has(r.id)) fail('OUT-27 ids', `${r.file}:${r.line}: ${r.id} is also a rule at ${seen.get(r.id)}; an ID is used once, ever`);
    else seen.set(r.id, `${r.file}:${r.line}`);
  }
  const hseen = new Map();
  for (const r of hist) {
    if (hseen.has(r.id)) fail('OUT-27 ids', `${r.file}:${r.line}: ${r.id} has a second history entry (first at ${hseen.get(r.id)})`);
    else hseen.set(r.id, `${r.file}:${r.line}`);
  }
  const retired = new Map(hist.filter(r => r.struck || r.declined).map(r => [r.id, r]));
  for (const r of live) {
    if (r.struck) continue;
    if (retired.has(r.id)) fail('OUT-27 ids', `${r.file}:${r.line}: ${r.id} was ${retired.get(r.id).declined ? 'declined' : 'withdrawn'} (${HISTORY}:${retired.get(r.id).line}); a retired ID is never reused`);
  }
  for (const r of live) if (!hseen.has(r.id)) warn('history entry', `${r.file}:${r.line}: ${r.id} has no entry in ${HISTORY}`);
  for (const r of hist) if (!seen.has(r.id) && !r.struck && !r.declined) warn('history entry', `${HISTORY}:${r.line}: ${r.id} has history but no rule (strike it through if it was withdrawn)`);
  // The intro's own IDs (INTRO-1 ...) are written "(INTRO-n)" after each paragraph's bold lead.
  const gov = F.get('GOVERNANCE.md') || '';
  const intro = gov.split(/^## Contents/m)[0];
  const introSeen = new Map();
  for (const m of intro.matchAll(/\((INTRO-\d+)\)/g)) {
    const ln = lineOf(intro, m.index);
    if (introSeen.has(m[1])) warn('intro ids', `GOVERNANCE.md:${ln}: ${m[1]} also labels the paragraph at line ${introSeen.get(m[1])}`);
    else introSeen.set(m[1], ln);
  }
  // replaced by / superseded by X  ↔  replaces Y, both ways, wherever a rule's text or history says so
  const byId = new Map();
  for (const r of [...live, ...hist]) byId.set(r.id, (byId.get(r.id) || '') + '\n' + r.body);
  const idList = '([A-Z]{2,5}-\\d+)';
  for (const [id, body] of byId) {
    for (const m of body.matchAll(new RegExp(`(?:replaced|superseded) by ${idList}`, 'gi'))) {
      const other = m[1];
      if (!byId.has(other)) fail('OUT-27 replaced', `${id} says "${m[0]}", but there is no rule ${other}`);
      else if (!new RegExp(`replaces ${id}\\b`, 'i').test(byId.get(other))) fail('OUT-27 replaced', `${id} says "${m[0]}", but ${other} never says "replaces ${id}"`);
    }
    for (const m of body.matchAll(new RegExp(`\\breplaces ${idList}`, 'gi'))) {
      const other = m[1];
      if (!byId.has(other)) fail('OUT-27 replaced', `${id} says "${m[0]}", but there is no rule ${other}`);
      else if (!new RegExp(`(?:replaced|superseded) by ${id}\\b`, 'i').test(byId.get(other))) fail('OUT-27 replaced', `${id} says "${m[0]}", but ${other} never says "replaced by ${id}"`);
    }
  }
  // Links resolve, with exact capitalisation (macOS would forgive the wrong case; the code host does not).
  const dirs = new Set();
  for (const p of src.list) { const parts = p.split('/'); for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/')); }
  const anchorsOf = new Map();
  const anchors = f => {
    if (!anchorsOf.has(f)) {
      const t = F.get(f) || '';
      const set = new Set([...t.matchAll(/<a id="([^"]+)"/g)].map(m => m[1]));
      for (const m of t.matchAll(/^#{1,6} (.+)$/gm)) set.add(githubSlug(m[1]));
      anchorsOf.set(f, set);
    }
    return anchorsOf.get(f);
  };
  for (const f of LINK_FILES) {
    const t = F.get(f);
    if (t == null) continue;
    const plain = blankCode(t);
    for (const m of plain.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const raw = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;          // https:, mailto: ...
      const [pathPart, anchor] = raw.split('#');
      const ln = lineOf(t, m.index);
      let target = f;
      if (pathPart) {
        const segs = (f.includes('/') ? f.split('/').slice(0, -1) : []);
        for (const s of decodeURI(pathPart).split('/')) {
          if (s === '' || s === '.') continue;
          if (s === '..') segs.pop(); else segs.push(s);
        }
        target = segs.join('/');
        if (!src.list.has(target) && !dirs.has(target)) {
          const lower = target.toLowerCase();
          const near = [...src.list, ...dirs].find(p => p.toLowerCase() === lower);
          fail('OUT-27 links', `${f}:${ln}: link "${raw}" resolves to nothing${near ? ` (the file is "${near}": the case differs)` : ''}`);
          continue;
        }
      }
      if (anchor && F.has(target) && !anchors(target).has(anchor)) warn('anchors', `${f}:${ln}: link "${raw}": no anchor "#${anchor}" in ${target}`);
    }
  }

  // OUT-28 · only the owner's pick puts a rule In force. A rule accepted on the review page is in REVIEW_BASELINE;
  // any other must carry the owner's words with a date, a ruling with its date and source, or say *Proposed*.
  const reviewed = src.review ? knownIds(src.review.files) : src.base ? knownIds(src.base.files) : null;
  if (!src.review) warn('OUT-28 owner', src.base
    ? `the review-page commit ${REVIEW_BASELINE.slice(0, 8)} can't be read here; rules on ${src.base.ref} stand in for it`
    : 'neither the review-page commit nor a base can be read here: no rule\'s pick was checked');
  for (const r of live) {
    if (r.struck) continue;
    if (!/\*Why:\*/.test(r.body)) warn('why', `${r.file}:${r.line}: ${r.id} has no *Why:*`);
    if (!reviewed || reviewed.has(r.id)) continue;
    const owner = /\*Owner:\*\s*["“][^"”]+["”]\s*\((\d{4}-\d{2}-\d{2})\)/.test(r.body);
    const ruled = /\*Ruled:\*\s*\d{4}-\d{2}-\d{2},\s*(picker|review page|chat)\b/i.test(r.body);
    const proposed = /\*Proposed\*/.test(r.body);
    if (!owner && !ruled && !proposed) fail('OUT-28 owner', `${r.file}:${r.line}: ${r.id} is new since the review page but carries no owner's pick: add *Owner:* "their words" (YYYY-MM-DD), or *Ruled:* YYYY-MM-DD, picker|chat|review page: "the pick", or mark it *Proposed*`);
  }

  // OUT-33 · against the rules on main: no rule ID lost, none renumbered (struck rules stay)
  if (!src.base) warn('OUT-33 compare', 'no base to compare with (origin/main unreadable): no comparison made');
  else {
    const now = knownIds(F);
    const was = knownIds(src.base.files);
    const nowByTitle = new Map();
    for (const [id, v] of now) if (v.title) nowByTitle.set(v.title, id);
    for (const [id, v] of was) {
      if (!now.has(id)) fail('OUT-33 compare', `${id}${v.title ? ` (“${v.title}”)` : ''} is on ${src.base.ref} but gone here: a rule is struck through, never deleted (WORK-16)`);
      else if (v.title && nowByTitle.has(v.title) && nowByTitle.get(v.title) !== id && now.get(id).title !== v.title) fail('OUT-33 compare', `“${v.title}” was ${id} on ${src.base.ref} and is ${nowByTitle.get(v.title)} here: IDs are never renumbered`);
    }
    // A rule that was in a rules file stays in one, struck through if withdrawn ("struck rules must stay").
    const baseLive = new Map(), baseHist = new Map();
    for (const f of RULE_FILES) if (src.base.files.has(f)) for (const r of parseRules(src.base.files.get(f), f)) baseLive.set(r.id, r);
    for (const [id, r] of baseLive) if (now.has(id) && !seen.has(id)) fail('OUT-33 compare', `${id} (“${r.title}”) was a rule in ${r.file} on ${src.base.ref} and is no longer in any rules file: strike it through there instead of deleting it (WORK-16)`);
    // A changed rule keeps its ID and its old wording moves to its history: warn when the text moved and the history didn't.
    if (src.base.files.has(HISTORY)) for (const r of parseRules(src.base.files.get(HISTORY), HISTORY)) baseHist.set(r.id, r.body);
    const histNow = new Map(hist.map(r => [r.id, r.body]));
    for (const r of live) {
      const b = baseLive.get(r.id);
      if (b && b.body.split('\n')[0] !== r.body.split('\n')[0] && baseHist.get(r.id) === histNow.get(r.id)) warn('history entry', `${r.file}:${r.line}: ${r.id}'s wording changed since ${src.base.ref} but its history didn't (move the old wording there)`);
    }
  }

  // OUT-39 · "Held by" in the fixed vocabulary, written after a rule's Why as
  //   *Held by:* <mechanism> (<what holds it>)[ + <mechanism> (<what>)], seen YYYY-MM-DD
  // Only a real mechanism gets the date it was seen to work; a rule with no *Held by* is held by review only.
  for (const r of live) {
    for (const m of r.body.matchAll(/\*Held by:\*\s*([^·\n<]+)/g)) {
      const raw = m[1].trim();
      const dated = /,\s*seen \d{4}-\d{2}-\d{2}$/.test(raw);
      const mechs = raw.replace(/,\s*seen \d{4}-\d{2}-\d{2}$/, '').replace(/\([^)]*\)/g, '').split('+').map(x => x.trim().toLowerCase()).filter(Boolean);
      for (const part of mechs) if (!HELD_BY.includes(part)) warn('OUT-39 held by', `${r.file}:${r.line}: ${r.id} is held by "${part}", which is not one of: ${HELD_BY.join(', ')}`);
      if (!dated && mechs.some(x => x !== 'review only')) warn('OUT-39 held by', `${r.file}:${r.line}: ${r.id} names a mechanism but not the date it was seen to work (", seen YYYY-MM-DD")`);
    }
  }

  // The title index in GOVERNANCE.md matches the companions' headings (new: warns)
  const index = new Map([...gov.matchAll(/^- ([A-Z]+-\d+) · (.+)$/gm)].map(m => [m[1], cleanTitle(m[2])]));
  for (const r of live) {
    if (r.file === 'GOVERNANCE.md' || r.struck) continue;
    if (!index.has(r.id)) warn('title index', `${r.id} (${r.file}) is missing from GOVERNANCE.md's list of titles`);
    else if (index.get(r.id) !== r.title) warn('title index', `${r.id}'s title in GOVERNANCE.md ("${index.get(r.id)}") differs from ${r.file} ("${r.title}")`);
  }
  for (const id of index.keys()) if (!seen.has(id)) warn('title index', `GOVERNANCE.md lists ${id}, which is not a rule in either companion`);

  // Plan Phase 5 · every "per XXX-N" cited in code or docs names a real rule (new: warns)
  const all = knownIds(F);
  for (const c of src.citations) {
    for (const m of c.text.matchAll(new RegExp(`\\bper ((?:${CITABLE.join('|')})-\\d+(?:(?:, | and | or |/)(?:${CITABLE.join('|')})-\\d+)*)`, 'g'))) {
      for (const id of m[1].split(/, | and | or |\//)) {
        if (!all.has(id)) warn('citations', `${c.file}:${c.line}: cites ${id}, which is no rule`);
        else if (retired.has(id)) warn('citations', `${c.file}:${c.line}: cites ${id}, which was declined`);
      }
    }
  }

  // OUT-32 · a status line under every plan's title
  for (const p of src.plans) {
    const st = planStatus(F.get(p) || '');
    if (!st) warn('OUT-32 plan status', `${p}: no **Status:** line under its title (${PLAN_STATUS.join(', ')})`);
    else if (!st.word) warn('OUT-32 plan status', `${p}: unknown status "${st.raw}" (use ${PLAN_STATUS.join(', ')})`);
  }

  // OUT-34 · HANDOFF's live part stays small
  const ho = F.get('HANDOFF.md');
  if (ho != null) {
    const livePart = ho.split(/^## 0\./m)[0];
    const size = Buffer.byteLength(livePart);
    if (size > HANDOFF_LIVE_BUDGET) warn('OUT-34 handoff', `HANDOFF.md's live part is ${(size / 1024).toFixed(0)} KB, over ${HANDOFF_LIVE_BUDGET / 1024} KB: move finished entries to handoff/YYYY-MM.md`);
    const since = /START HERE[^\n]*?\(since v[\d.]+, (\d{1,2} \w{3} \d{4})\)/.exec(livePart);
    const sinceDate = since && Date.parse(since[1] + ' UTC');
    if (sinceDate) {
      for (const m of livePart.matchAll(/^### \S+ (\d{1,2})(?:[–-]\d{1,2})? (\w{3}) (\d{4})/gm)) {
        const d = Date.parse(`${m[1]} ${m[2]} ${m[3]} UTC`);
        if (d && d < sinceDate) warn('OUT-34 handoff', `HANDOFF.md:${lineOf(livePart, m.index)}: an entry from ${m[1]} ${m[2]} ${m[3]} sits in START HERE, which starts ${since[1]}: archive it`);
      }
    }
  }
  return out;
}

export function planStatus(text) {
  const head = text.split('\n').slice(0, 8).join('\n');
  const m = /^\*\*Status:\*\*\s*(.+)$/m.exec(head);
  if (!m) return null;
  const raw = m[1].trim();
  const word = PLAN_STATUS.find(w => raw.toLowerCase().startsWith(w)) || null;
  return { raw, word };
}

// ── Running it ─────────────────────────────────────────────────────────────────────────────────────────────
function report(src, findings, { warnOnly, quiet }) {
  const fails = findings.filter(f => f.level === 'fail');
  const warns = findings.filter(f => f.level === 'warn');
  const lines = [`governance check: ${src.label}, ${src.base ? `compared with ${src.base.ref} (${src.base.sha.slice(0, 8)})` : 'no comparison made'}`];
  for (const f of fails) lines.push(`  FAIL  [${f.check}] ${f.msg}`);
  // --quiet (the push guard): failures in full, warnings only as a count, so a refusal's reason isn't buried.
  if (!quiet) for (const f of warns) lines.push(`  warn  [${f.check}] ${f.msg}`);
  else if (warns.length) lines.push(`  (${warns.length} warning${warns.length > 1 ? 's' : ''}: run npm run governance to see them)`);
  lines.push(fails.length
    ? `=== GOVERNANCE CHECK FAILED: ${fails.length} blocking problem${fails.length > 1 ? 's' : ''}, ${warns.length} warning${warns.length === 1 ? '' : 's'}${warnOnly ? ' (warn-only run: not stopping)' : ''} ===`
    : `=== GOVERNANCE CHECK PASSED: ${warns.length} warning${warns.length === 1 ? '' : 's'} ===`);
  console.log(lines.join('\n'));
  return fails.length;
}

function printPlans(src) {
  const rows = src.plans.map(p => {
    const st = planStatus(src.files.get(p) || '');
    return [p, st ? st.raw : '(none)'];
  });
  const w = Math.max(...rows.map(r => r[0].length), 4);
  console.log(`\n${'PLAN'.padEnd(w)}  STATUS`);
  for (const [p, s] of rows) console.log(`${p.padEnd(w)}  ${s}`);
  console.log('');
}

async function main(argv) {
  const arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  if (argv.includes('--self-test')) {
    const { selfTest } = await import(new URL('./governance-samples.mjs', import.meta.url));
    process.exitCode = selfTest({ loadSource, runChecks }) ? 0 : 1;
    return;
  }
  const rev = arg('--rev') || null;
  if (rev && !tryGit(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`])) {
    console.log(`governance check: "${rev}" is not a commit here`);
    process.exitCode = 2;
    return;
  }
  const src = loadSource({ rev, base: arg('--base') || 'origin/main' });
  if (argv.includes('--plans')) printPlans(src);
  const warnOnly = argv.includes('--warn-only');
  const failed = report(src, runChecks(src), { warnOnly, quiet: argv.includes('--quiet') });
  // exitCode, never process.exit(): on macOS a write to a pipe is asynchronous, and exiting at once cut the report
  // short (seen 24 Nov 2026), which would hide why the push guard refused a push.
  process.exitCode = failed && !warnOnly ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-governance.mjs')) {
  main(process.argv.slice(2)).catch(e => { console.log(`governance check could not run: ${e.stack || e}`); process.exitCode = 2; });
}
