// Broken samples for the governance checker (OUT-40): each blocking check in tools/check-governance.mjs gets two or
// three deliberately broken copies of the real rules files, and must fail on every one. A few "fine" samples sit
// beside them, so a check that fails on anything is caught too.
//
//   node tools/check-governance.mjs --self-test
//
// The samples are edits applied in memory to the working tree's files; nothing on disk changes. Each edit names the
// exact text it changes, so a sample whose anchor has gone (the rules moved on) is reported as broken rather than
// passing quietly. Part of the checker, so protected with it (GOVERNANCE INTRO-2).

import { GOV_FILES } from './check-governance.mjs';

const NEW_RULE = (id, provenance) =>
  `### ${id} · A rule a session added\nSome instruction.\n<br>*Why:* A reason. · ${provenance}\n\n`;

function edit(files, file, from, to) {
  const t = files.get(file);
  if (t == null || !t.includes(from)) throw new Error(`anchor not found in ${file}: ${JSON.stringify(from.slice(0, 60))}`);
  files.set(file, t.replace(from, to));
}
const addRule = (files, text) => edit(files, 'GOVERNANCE.md', '<a id="elsewhere"></a>', text + '<a id="elsewhere"></a>');
const dropRule = (files, file, id) => {
  const t = files.get(file);
  const re = new RegExp(`^### ${id} · [\\s\\S]*?(?=^### |^## |^<a id=)`, 'm');
  if (!re.test(t)) throw new Error(`${id} not found in ${file}`);
  files.set(file, t.replace(re, ''));
};

export const SAMPLES = [
  // OUT-26 · the import line, exactly once
  { expect: 'OUT-26 import', name: 'the import line removed', mutate: f => edit(f, 'CLAUDE.md', '\n@GOVERNANCE.md\n', '\n') },
  { expect: 'OUT-26 import', name: 'the import line twice', mutate: f => edit(f, 'CLAUDE.md', '\n@GOVERNANCE.md\n', '\n@GOVERNANCE.md\n\n@GOVERNANCE.md\n') },
  { expect: 'OUT-26 import', name: 'the import inside a sentence (not its own line, so it never loads)', mutate: f => edit(f, 'CLAUDE.md', '\n@GOVERNANCE.md\n', '\nThe rules: @GOVERNANCE.md\n') },
  // OUT-26 · no link into the repo through its old public address
  { expect: 'OUT-26 old address', name: 'a github.com blob link in CLAUDE.md', mutate: (f, c) => edit(f, 'CLAUDE.md', '\n@GOVERNANCE.md\n', `\n@GOVERNANCE.md\n\nSee [the rules](https://github.com/${c.owner}/${c.name}/blob/main/GOVERNANCE.md).\n`) },
  { expect: 'OUT-26 old address', name: 'an autolink to the old Pages address in GOVERNANCE.md', mutate: (f, c) => edit(f, 'GOVERNANCE.md', '<a id="elsewhere"></a>', `The app: <https://${c.owner}.github.io/${c.name}/>\n\n<a id="elsewhere"></a>`) },
  { expect: 'OUT-26 old address', name: 'a bare raw.githubusercontent URL in GOVERNANCE-ENG.md', mutate: (f, c) => edit(f, 'GOVERNANCE-ENG.md', '<a id="code"></a>', `Raw copy: https://raw.githubusercontent.com/${c.owner}/${c.name}/main/HANDOFF.md\n\n<a id="code"></a>`) },
  { expect: null, name: 'fine: the old address quoted in code, not linked', mutate: (f, c) => edit(f, 'GOVERNANCE.md', '<a id="elsewhere"></a>', `It was \`https://${c.owner}.github.io/${c.name}/\`.\n\n<a id="elsewhere"></a>`) },
  // OUT-27 · IDs unique, a retired ID never reused
  { expect: 'OUT-27 ids', name: 'UX-3 written a second time in GOVERNANCE-ENG.md', mutate: f => edit(f, 'GOVERNANCE-ENG.md', '<a id="code"></a>', NEW_RULE('UX-3', '*Ruled:* 2026-11-25, picker: "Yes"') + '<a id="code"></a>') },
  { expect: 'OUT-27 ids', name: 'the declined CODE-5 reused for a new rule', mutate: f => edit(f, 'GOVERNANCE-ENG.md', '<a id="code"></a>\n## CODE: Engineering habits\n', '<a id="code"></a>\n## CODE: Engineering habits\n\n' + NEW_RULE('CODE-5', '*Ruled:* 2026-11-25, picker: "Yes"')) },
  { expect: 'OUT-27 ids', name: 'PRD-1 given a second history entry', mutate: f => edit(f, 'GOVERNANCE-HISTORY.md', '### PRD-2 ·', '### PRD-1 · Again\nDates: 2026-11-25\n\n### PRD-2 ·') },
  // OUT-27 · every "replaced by" has its "replaces", both ways
  { expect: 'OUT-27 replaced', name: 'REL-6 replaced by a rule that does not exist', mutate: f => edit(f, 'GOVERNANCE.md', '### REL-6 · A full gate before any push that changes behaviour, output or files ⚖\n', '### REL-6 · A full gate before any push that changes behaviour, output or files ⚖\nReplaced by REL-99.\n') },
  { expect: 'OUT-27 replaced', name: 'PRD-1 superseded by PRD-2, which never says it replaces PRD-1', mutate: f => edit(f, 'GOVERNANCE.md', '### PRD-1 · Easy for anyone, as easy as Outlook or Excel\n', '### PRD-1 · Easy for anyone, as easy as Outlook or Excel\nSuperseded by PRD-2 (2026-11-25).\n') },
  { expect: 'OUT-27 replaced', name: 'PRD-3 replaces PRD-2, which never says it was replaced', mutate: f => edit(f, 'GOVERNANCE.md', '### PRD-3 · Studio speed: change, export and send in minutes\n', '### PRD-3 · Studio speed: change, export and send in minutes\nReplaces PRD-2.\n') },
  { expect: null, name: 'fine: a matched pair (PRD-11 replaced by PRD-1, which replaces PRD-11)', mutate: f => { edit(f, 'GOVERNANCE.md', '### PRD-11 · Avoid visual clutter at all costs: simplify rather than explain\n', '### PRD-11 · Avoid visual clutter at all costs: simplify rather than explain\nReplaced by PRD-1.\n'); edit(f, 'GOVERNANCE.md', '### PRD-1 · Easy for anyone, as easy as Outlook or Excel\n', '### PRD-1 · Easy for anyone, as easy as Outlook or Excel\nReplaces PRD-11.\n'); } },
  // OUT-27 · links resolve, with exact capitalisation
  { expect: 'OUT-27 links', name: 'CLAUDE.md links handoff.md (the file is HANDOFF.md)', mutate: f => edit(f, 'CLAUDE.md', '\n@GOVERNANCE.md\n', '\n@GOVERNANCE.md\n\nStatus: [handoff](handoff.md).\n') },
  { expect: 'OUT-27 links', name: 'GOVERNANCE.md links GOVERNANCE-ui.md#ux', mutate: f => edit(f, 'GOVERNANCE.md', '(GOVERNANCE-UI.md#ux)', '(GOVERNANCE-ui.md#ux)') },
  { expect: 'OUT-27 links', name: 'a link to a plan that does not exist', mutate: f => edit(f, 'GOVERNANCE.md', '<a id="elsewhere"></a>', 'See [the plan](NO-SUCH-THING-PLAN.md).\n\n<a id="elsewhere"></a>') },
  { expect: null, name: 'fine: a link to a folder and one with ../ that lands inside the repo', mutate: f => edit(f, 'GOVERNANCE.md', '<a id="elsewhere"></a>', 'See [the archive](handoff/) and [the tools](tools/../tools/check-governance.mjs).\n\n<a id="elsewhere"></a>') },
  // OUT-28 · a rule new since the review page carries the owner's pick
  { expect: 'OUT-28 owner', name: 'a new rule marked only *Derived*', mutate: f => addRule(f, NEW_RULE('WORK-28', '*Derived*')) },
  { expect: 'OUT-28 owner', name: 'a new rule with the owner\'s words but no date', mutate: f => addRule(f, NEW_RULE('WORK-28', '*Owner:* "do it"')) },
  { expect: 'OUT-28 owner', name: 'a new rule "ruled" with no source', mutate: f => addRule(f, NEW_RULE('WORK-28', '*Ruled:* 2026-11-25, as recommended')) },
  { expect: null, name: 'fine: a new rule ruled by picker with its date', mutate: f => addRule(f, NEW_RULE('WORK-28', '*Ruled:* 2026-11-25, picker: "Yes"')) },
  { expect: null, name: 'fine: a new rule marked *Proposed*', mutate: f => addRule(f, NEW_RULE('WORK-28', '*Proposed*')) },
  // OUT-33 · against main: no rule ID lost, none renumbered
  { expect: 'OUT-33 compare', name: 'FRZ-18 deleted from the rules (its history kept)', mutate: f => dropRule(f, 'GOVERNANCE.md', 'FRZ-18') },
  { expect: 'OUT-33 compare', name: 'FRZ-18 deleted from the rules and its history', mutate: f => { dropRule(f, 'GOVERNANCE.md', 'FRZ-18'); dropRule(f, 'GOVERNANCE-HISTORY.md', 'FRZ-18'); } },
  { expect: 'OUT-33 compare', name: 'FRZ-18 renumbered FRZ-19', mutate: f => { edit(f, 'GOVERNANCE.md', '### FRZ-18 ·', '### FRZ-19 ·'); edit(f, 'GOVERNANCE-HISTORY.md', '### FRZ-18 ·', '### FRZ-19 ·'); } },
  { expect: null, name: 'fine: FRZ-18 withdrawn by striking it through', mutate: f => edit(f, 'GOVERNANCE.md', '### FRZ-18 · Editing aids never reach an export\n', '### ~~FRZ-18 · Editing aids never reach an export~~ (withdrawn)\n') },
];

export function selfTest({ loadSource, runChecks }) {
  const clean = loadSource({});
  const repo = clean.repo || { owner: 'example-owner', name: 'example-repo' };
  // Compare with the clean files themselves, so OUT-33 sees exactly the sample's change, whatever main holds today.
  const base = { ref: 'the unbroken files', sha: 'selftest', files: new Map([...clean.files].filter(([p]) => GOV_FILES.includes(p))) };
  const blockingOf = src => runChecks(src).filter(f => f.level === 'fail');
  let pass = 0, failed = 0;
  const ok = m => { pass++; console.log(`  PASS  ${m}`); };
  const bad = m => { failed++; console.log(`  FAIL  ${m}`); };

  const start = blockingOf({ ...clean, repo, base });
  start.length ? bad(`the unbroken files already fail: ${start.map(f => f.msg).join(' | ')}`) : ok('the unbroken files pass every blocking check');
  for (const s of SAMPLES) {
    const files = new Map(clean.files);
    try { s.mutate(files, repo); } catch (e) { bad(`${s.name}: sample could not be applied (${e.message})`); continue; }
    const fails = blockingOf({ ...clean, repo, base, files });
    if (s.expect === null) fails.length ? bad(`${s.name}: should pass, but ${fails.map(f => `[${f.check}] ${f.msg}`).join(' | ')}`) : ok(s.name);
    else if (fails.some(f => f.check === s.expect)) ok(`[${s.expect}] ${s.name}`);
    else bad(`[${s.expect}] ${s.name}: not caught${fails.length ? ` (only ${fails.map(f => f.check).join(', ')})` : ''}`);
  }
  console.log(`\ngovernance checker self-test: ${pass} passed, ${failed} failed`);
  return failed === 0;
}
