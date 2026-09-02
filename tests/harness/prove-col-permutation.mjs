// Proves the load-bearing invariance theorem behind the grid COLUMN SWAP feature
// (GRID-DIRECT-MANIPULATION-PLAN.md section 2.3 and 6.1), by fuzzing the REAL
// computeBlockLayout -- its source text is sliced verbatim out of src/legacy/app.js and evaluated,
// so this test cannot drift from the implementation the way a hand-transcription would.
//
// THE THEOREM
//   computeBlockLayout's `firstAppear` ordering -- and therefore blockSlotMaps, its size
//   (phaseSlots) and the 'y<year>:s<slot>' colgroup key identity that hand-dragged colWidths are
//   stored against -- is invariant under any WITHIN-WEEK permutation of cell.col.
//
// WHY IT MATTERS
//   The swap feature is implemented as a within-week transposition of two cells' `col` values. If
//   the theorem holds, slot identity is invariant BY CONSTRUCTION rather than by luck, which is
//   what makes it impossible for a swap to silently re-label a user's hand-dragged column width
//   onto a different column. If it ever fails, the whole design is wrong and must be rethought
//   before any further code ships -- which is why this runs as a test rather than living in prose.
//
// THE KNOWN EXCEPTION, asserted here rather than hoped for
//   blockSimSlot derives from `slotMap.get(<production's col>)`, so moving Production DOES move the
//   Simultaneous Post lane and can change blockMaxConcurrent. That is not a bug in the theorem --
//   it is why the plan refuses Production<->anything swaps in any block containing a SimPost week,
//   and why the runtime gate (G2) must run on every update() rather than only at gesture time (a
//   swap accepted while SimPost is OFF becomes an mc-changing swap the moment it is switched ON).
//   This script measures that exception separately: SimPost-free schedules must show ZERO drift in
//   mc/simSlot, and Production-involving swaps in SimPost blocks are reported, not asserted away.
//
// Run:  node tests/harness/prove-col-permutation.mjs [trials]
// Exit: 0 = theorem holds, 1 = violated (do not ship the swap feature)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'src', 'legacy', 'app.js');

// ---- Slice computeBlockLayout out of the real engine, verbatim -----------------------------------
// Anchored on the declaration and on its own return statement, so an edit to the function body is
// picked up automatically while an edit to its SHAPE fails loudly here instead of silently testing
// a stale copy.
const source = readFileSync(SRC, 'utf8');
const START = 'function computeBlockLayout(schedule, yearBlocks){';
const END = 'return { blockSlotMaps, blockMaxConcurrent, blockOccupancy, blockSimSlot };';
const from = source.indexOf(START);
const to = source.indexOf(END, from);
if (from < 0 || to < 0) {
  console.error('FAIL: could not locate computeBlockLayout in src/legacy/app.js.');
  console.error('Its declaration or return statement changed. Re-anchor this test before trusting it.');
  process.exit(1);
}
const body = source.slice(from, to + END.length) + '\n}';
// ⚠️ ONE non-builtin reference, injected here rather than sliced in: `stintOrderFor`, the non-frozen
// helper the authorised slot-order hook calls (owner sign-off E0, 1 Sep 2026 -- see
// COLUMN-ORDER-PLAN.md). The stub returns null, which is exactly what the real one returns when no
// stint swap is stored -- so the sliced function behaves here as it does on an ordinary calendar, and
// this file keeps testing the AUTOMATIC layout under column permutations, which is its whole subject.
// ⛔ Do not make the stub return an order. The theorem being fuzzed is about the DERIVED order being
// invariant under a within-week col permutation; pinning it would test something else and pass
// vacuously. A stint swap's own invariants are covered by tests/harness/t/stintswap.js instead.
// If a future edit adds another non-builtin reference, add it here the same way -- update the slice,
// never the theorem.
const stintOrderFor = () => null;
const computeBlockLayout = new Function('stintOrderFor',
  `${body}; return computeBlockLayout;`)(stintOrderFor);

// ---- And slice blockColOrder, the ONE duplicated frozen rule in the stint-swap feature -----------
// applyStintSwaps has to capture a block's column order BEFORE it exchanges anything, and it does so
// with its own first-appearance walk rather than by calling computeBlockLayout -- because
// computeSchedule runs up to 300 times in productionStartEndingBy's backward search and paying a full
// layout pass each time is not affordable. That duplication is the feature's one drift risk: if the
// two walks ever disagree, a stint swap pins the WRONG order and lands the phase in the wrong column.
// So fuzz them against each other on the same generated schedules. This is the check app.js's comment
// on blockColOrder promises.
const CO_START = 'function blockColOrder(weeks, b){';
const CO_END = '  }\n\n  // Resolve gridStintSwaps';
const coFrom = source.indexOf(CO_START);
const coTo = source.indexOf(CO_END, coFrom);
if (coFrom < 0 || coTo < 0) {
  console.error('FAIL: could not locate blockColOrder in src/legacy/app.js.');
  console.error('Re-anchor this test before trusting it.');
  process.exit(1);
}
const coBody = source.slice(coFrom, coTo) + '  }';
const blockColOrder = new Function(`${coBody}; return blockColOrder;`)();

// ---- A tiny deterministic RNG, so a failure is reproducible from its seed ------------------------
let seed = 0x2545f491;
const rnd = () => {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >>> 17;
  seed ^= seed << 5;  seed >>>= 0;
  return seed / 0x100000000;
};
const ri = (n) => Math.floor(rnd() * n);

// ---- Schedule generator -------------------------------------------------------------------------
// Mirrors the shapes computeBlockLayout actually reads: weeks[].cells[] carrying {type, key, col},
// weeks[].simPost, and an all-phase hiatus week whose single cell has type 'hiatus' and NO col.
const PHASES = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization', 'custom1'];

function makeSchedule() {
  const nWeeks = 8 + ri(45);
  const nPhases = 1 + ri(4);
  // Give each phase a contiguous run and a column, the way segCol does -- including column REUSE,
  // which is what makes firstAppear ordering non-monotonic in col and is the case a naive
  // "slots are sorted by col" assumption gets wrong.
  const segs = [];
  for (let p = 0; p < nPhases; p++) {
    const start = ri(nWeeks - 1);
    segs.push({
      key: PHASES[p % PHASES.length],
      col: ri(Math.max(1, nPhases)),
      start,
      end: Math.min(nWeeks, start + 1 + ri(12)),
    });
  }
  const simOn = rnd() < 0.35;
  const weeks = [];
  for (let i = 0; i < nWeeks; i++) {
    // ~8% all-phase hiatus weeks: one cell, type 'hiatus', no col. These mark no occupancy and are
    // skipped by the SimPost conflict scan, so they must not perturb anything.
    if (rnd() < 0.08) { weeks.push({ cells: [{ type: 'hiatus' }], simPost: false }); continue; }
    const cells = [];
    const usedCols = new Set();
    for (const s of segs) {
      if (i < s.start || i >= s.end) continue;
      if (usedCols.has(s.col)) continue;      // one occupant per column per week, as segCol guarantees
      usedCols.add(s.col);
      // A phase's own hiatus weeks carry the SAME key and col as its working weeks.
      cells.push({ type: rnd() < 0.12 ? 'phaseHiatus' : 'phase', key: s.key, col: s.col });
    }
    const prodHere = cells.some((c) => c.key === 'production');
    weeks.push({ cells, simPost: simOn && prodHere && rnd() < 0.6 });
  }
  return { weeks };
}

// One year block per 52 weeks, matching how the app blocks the calendar.
function blocksFor(schedule) {
  const out = [];
  for (let i = 0; i < schedule.weeks.length; i += 52) {
    out.push({ year: 2026 + out.length, startIdx: i, count: Math.min(52, schedule.weeks.length - i) });
  }
  return out;
}

// ---- The permutation under test -----------------------------------------------------------------
// A WITHIN-WEEK transposition: pick two cells in the same week and exchange their `col` VALUES.
// This is exactly what the swap feature does, and it is the only shape the theorem claims to cover.
// Returns the set of phase keys it touched, so Production involvement can be reported.
function transposeSomeWeeks(schedule) {
  const touched = new Set();
  let didAny = false;
  for (const wk of schedule.weeks) {
    const cs = wk.cells.filter((c) => c.col !== undefined);
    if (cs.length < 2) continue;
    if (rnd() < 0.5) continue;                      // partial coverage: only SOME weeks swap
    const i = ri(cs.length);
    let j = ri(cs.length);
    if (i === j) j = (j + 1) % cs.length;
    const t = cs[i].col; cs[i].col = cs[j].col; cs[j].col = t;
    touched.add(cs[i].key); touched.add(cs[j].key);
    didAny = true;
  }
  return didAny ? touched : null;
}

const slotSig = (m) => [...m.entries()].sort((a, b) => a[0] - b[0]).map(([c, s]) => `${c}>${s}`).join(',');

// ---- Run ----------------------------------------------------------------------------------------
const TRIALS = Number(process.argv[2] || 20000);
let ran = 0;
let slotViolations = 0, sizeViolations = 0;
let orderDrift = 0;                                // blockColOrder vs computeBlockLayout: MUST be 0
let mcDriftNoSim = 0, simDriftNoSim = 0;          // MUST be zero
let mcDriftProdSim = 0;                            // the documented, designed-for exception
const examples = [];

for (let t = 0; t < TRIALS; t++) {
  const schedule = makeSchedule();
  const blocks = blocksFor(schedule);
  const before = computeBlockLayout(schedule, blocks);
  const beforeSig = before.blockSlotMaps.map(slotSig);
  // The duplicated-rule check, run on the UN-permuted schedule -- i.e. exactly the state
  // applyStintSwaps captures the order in, before it exchanges anything. The order implied by
  // blockSlotMaps is its columns read out in slot sequence; blockColOrder must reproduce that list.
  for (let bi = 0; bi < blocks.length; bi++) {
    const derived = [...before.blockSlotMaps[bi].entries()]
      .sort((a, b) => a[1] - b[1]).map((e) => e[0]).join(',');
    const mine = blockColOrder(schedule.weeks, blocks[bi]).join(',');
    if (derived !== mine) {
      orderDrift++;
      if (examples.length < 3) examples.push({ kind: 'blockColOrder', bi, frozen: derived, mine });
    }
  }
  const beforeMc = [...before.blockMaxConcurrent];
  const beforeSim = [...before.blockSimSlot];
  const anySim = schedule.weeks.some((w) => w.simPost);

  const touched = transposeSomeWeeks(schedule);
  if (!touched) continue;                          // nothing to compare
  ran++;

  const after = computeBlockLayout(schedule, blocks);
  const afterSig = after.blockSlotMaps.map(slotSig);

  for (let bi = 0; bi < blocks.length; bi++) {
    if (afterSig[bi] !== beforeSig[bi]) {
      slotViolations++;
      if (examples.length < 3) examples.push({ kind: 'slotMap', bi, before: beforeSig[bi], after: afterSig[bi] });
    }
    if (after.blockSlotMaps[bi].size !== before.blockSlotMaps[bi].size) sizeViolations++;

    const mcMoved = after.blockMaxConcurrent[bi] !== beforeMc[bi];
    const simMoved = after.blockSimSlot[bi] !== beforeSim[bi];
    if (mcMoved || simMoved) {
      // Production moving is the ONE documented way mc/simSlot may legitimately move.
      if (anySim && touched.has('production')) { if (mcMoved) mcDriftProdSim++; }
      else {
        if (mcMoved) mcDriftNoSim++;
        if (simMoved) simDriftNoSim++;
        if (examples.length < 6) examples.push({
          kind: 'mc/simSlot', bi, anySim, touched: [...touched],
          mc: `${beforeMc[bi]} -> ${after.blockMaxConcurrent[bi]}`,
          sim: `${beforeSim[bi]} -> ${after.blockSimSlot[bi]}`,
        });
      }
    }
  }
}

console.log(`computeBlockLayout invariance under within-week col transposition`);
console.log(`  trials with a real permutation : ${ran} (of ${TRIALS} generated)`);
console.log(`  blockColOrder vs frozen walk   : ${orderDrift}   (must be 0)`);
console.log(`  blockSlotMaps changed          : ${slotViolations}   (must be 0)`);
console.log(`  slotMap.size changed           : ${sizeViolations}   (must be 0)`);
console.log(`  mc changed, no SimPost/Prod    : ${mcDriftNoSim}   (must be 0)`);
console.log(`  simSlot changed, no SimPost/Prod: ${simDriftNoSim}   (must be 0)`);
console.log(`  mc changed via Production+SimPost: ${mcDriftProdSim}   (EXPECTED -- this is why the`);
console.log(`      plan refuses Production swaps in a SimPost block, and why gate check G2 runs on`);
console.log(`      every update() and not only at gesture time)`);

const failed = slotViolations || sizeViolations || mcDriftNoSim || simDriftNoSim || orderDrift;
if (failed) {
  console.error('\nTHEOREM VIOLATED. Do not ship the column-swap feature.');
  if (orderDrift) console.error('blockColOrder has DRIFTED from computeBlockLayout\'s own first-appearance');
  if (orderDrift) console.error('walk. A stint swap would pin the wrong order and move a phase to the wrong column.');
  console.error('Slot identity is what protects hand-dragged colWidths from being re-labelled onto');
  console.error('a different column, so a violation here is silent corruption of saved user work.');
  console.error(examples.map((e) => '  ' + JSON.stringify(e)).join('\n'));
  process.exit(1);
}
console.log('\nRESULT: THEOREM HOLDS.');
