// Proves the header TEMPLATE RESOLVER's rules (HEADER-PRESETS-PLAN.md §3.1, §3.2 and gate item 3),
// by exercising the REAL resolveHeaderTemplate -- its source text is sliced verbatim out of
// src/legacy/app.js and evaluated, so this test cannot drift from the implementation the way a
// hand-transcription would. Same technique as prove-col-permutation.mjs.
//
// WHY A NODE TEST AND NOT A BROWSER LEG
//   resolveHeaderTemplate is PURE: no DOM, no module state, everything arrives in `ctx`. That is a
//   deliberate property (see its comment) and it is what makes exhaustive case coverage cheap here
//   rather than expensive in headless Chrome. The browser legs cover what this cannot: that the
//   resolved text actually reaches the screen, the workbook and the PDF.
//
// THE RULES BEING PROVED, each of which exists to keep an already-saved file rendering as it did
//   1. An UNKNOWN token renders as typed, braces included. This is what makes turning existing
//      hand-typed manual text into templates safe -- text that happens to contain braces is
//      untouched unless it names a real token.
//   2. Resolution is ONE PASS. A token's value is never re-parsed, so a show titled "{today}"
//      prints the words {today} and not the date. ⭐ The load-bearing one: get it wrong and a
//      user's literal text silently becomes live data.
//   3. Whitespace is preserved exactly as typed.
//   4. A failed [group] collapses to nothing -- its literal text and the spaces inside the brackets
//      with it -- and does not touch text outside the brackets.
//   5. {{ }} [[ ]] are literal braces and brackets.
//
// Run:  node tests/harness/prove-header-template.mjs
// Exit: 0 = every rule holds, 1 = a rule is violated (do not ship the resolver)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'src', 'legacy', 'app.js');
const source = readFileSync(SRC, 'utf8');

// ---- Slice, verbatim -----------------------------------------------------------------------------
// Anchored on declarations and on final statements, so an edit to a function BODY is picked up
// automatically while an edit to its SHAPE fails loudly here instead of silently testing a stale
// copy.
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

// parseDateUTC, plus the year guards it reads -- sliced rather than stubbed, because {date:...}
// depends on its exact rejection behaviour (it returns null, never an Invalid Date).
const dateBody = slice(
  'const MIN_YEAR = 1970, MAX_YEAR = 2100;',
  'return Number.isFinite(out.getTime()) ? out : null;',
  '\n  }',
  'parseDateUTC');
const parseDateUTC = new Function(`${dateBody}; return parseDateUTC;`)();

// The whole header-template block: hdrDate, HDR_MONTHS, fmtHeaderDate, buildHeaderCtx,
// lookupHeaderToken, resolveHeaderTemplate and its scanner hdrScan. buildHeaderCtx is carried along
// because it sits inside the region; it is never CALLED here (it reads the DOM), so its free
// references cost nothing.
const tplBody = slice(
  'function hdrDate(d, local){',
  'return { out, i, closed: false };',
  '\n  }',
  'the header-template block');
const { resolveHeaderTemplate, lookupHeaderToken, fmtHeaderDate, hdrDate } =
  new Function('parseDateUTC',
    `${tplBody}; return { resolveHeaderTemplate, lookupHeaderToken, fmtHeaderDate, hdrDate };`)(parseDateUTC);

// ---- A fixed ctx, so every expectation below is a constant ---------------------------------------
// UTC dates deliberately: the resolver's local/UTC flag is tested separately, and pinning these to
// UTC is what makes the expected strings identical on every machine.
const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const ctx = { tokens: {
  title: 'Test Show',
  season: 'S2',
  titleSeason: 'Test Show S2',
  version: 'v3',
  episodes: '10',
  shootDaysPerEp: '8',
  shootDays: '80',
  today: hdrDate(utc(2026, 9, 2), false),
  'writersRoom.open': hdrDate(utc(2026, 1, 5), false),
  'writersRoom.close': hdrDate(utc(2026, 3, 27), false),
  'writersRoom.weeks': '12',
  'writersRoom.name': "Writer's Rm",
  'writersRoom.line': "Writer's Room Opens: 1.5.26",
  'production.open': hdrDate(utc(2026, 6, 29), false),
  'production.wrap': hdrDate(utc(2026, 10, 20), false),
  'production.close': hdrDate(utc(2026, 10, 20), false),
  'production.summary': '17-Week Production Span / 8-Day Shooting Schedule',
  'production.dates': 'Principal Photography 6.29.26 / Wrap: 10.20.26',
  // Deliberately empty, to drive the [group] rules. A real ctx produces these whenever the field or
  // the segment behind a token has nothing to say.
  'post.open': '',
  emptyThing: '',
} };

// ---- Harness -------------------------------------------------------------------------------------
let failed = 0, ran = 0;
function eq(input, expected, why) {
  ran++;
  const got = resolveHeaderTemplate(input, ctx);
  const ok = got === expected;
  if (!ok) {
    failed++;
    console.log(`  FAIL  ${why}`);
    console.log(`        input    ${JSON.stringify(input)}`);
    console.log(`        expected ${JSON.stringify(expected)}`);
    console.log(`        got      ${JSON.stringify(got)}`);
  } else {
    console.log(`  ok    ${why}`);
  }
}
function group(name) { console.log(`\n${name}`); }

// ---- §3.1 rule 1: an unknown token renders as typed ----------------------------------------------
group('unknown tokens render as typed -- the rule that makes existing manual text safe');
eq('{unknown}', '{unknown}', '{unknown} is left exactly as written');
eq('{}', '{}', 'an empty token name is not a token');
eq('{ }', '{ }', 'whitespace is not a token name');
eq('Draft {unknown} v2', 'Draft {unknown} v2', 'unknown tokens do not disturb the text around them');
eq('{Title}', '{Title}', 'token names are case-sensitive -- {Title} is not {title}');
eq('{title.nope}', '{title.nope}', 'a real prefix with an unreal suffix is still unknown');
eq('{writersRoom.opens}', '{writersRoom.opens}', 'a near-miss on a phase token is unknown, not empty');

// ---- §3.1 rule 2: ONE PASS -- the load-bearing rule ----------------------------------------------
group('resolution is ONE PASS -- a token value is never re-parsed');
const braceCtx = { tokens: { title: '{today}', today: hdrDate(utc(2026, 9, 2), false), other: '[x]' } };
const oneShot = (input, expected, why) => {
  ran++;
  const got = resolveHeaderTemplate(input, braceCtx);
  if (got !== expected) {
    failed++;
    console.log(`  FAIL  ${why}`);
    console.log(`        input    ${JSON.stringify(input)}`);
    console.log(`        expected ${JSON.stringify(expected)}`);
    console.log(`        got      ${JSON.stringify(got)}`);
  } else console.log(`  ok    ${why}`);
};
oneShot('{title}', '{today}', '⭐ a show titled "{today}" prints the WORDS {today}, not the date');
oneShot('[{title}]', '{today}', '⭐ and the same inside a group, where two passes would re-read it');
oneShot('{other}', '[x]', 'a value containing brackets is not read as a group');
oneShot('[{other}]', '[x]', 'nor when it comes out of a group');

// ---- §3.1 rule 5: escapes ------------------------------------------------------------------------
group('escapes: {{ }} [[ ]] are literal');
eq('{{draft}}', '{draft}', '{{draft}} renders the literal {draft}');
eq('{{title}}', '{title}', 'an escaped REAL token name still renders literally');
eq('[[a]]', '[a]', '[[a]] renders the literal [a]');
eq('{{{title}}}', '{Test Show}', 'escape, token, escape -- the middle one resolves');
eq('{{}}', '{}', 'an escaped empty pair');

// ---- §3.1 rule 4: conditional groups -------------------------------------------------------------
group('conditional groups');
eq('[a {emptyThing} b]', '', 'one empty token collapses the whole group, literals included');
eq('[a {title}]c', 'a Test Showc', 'a satisfied group renders, and does not touch text outside it');
eq('[{episodes} Episodes]', '10 Episodes', 'the DEFAULT_HEADER_TEMPLATE form for r3');
eq('[{post.open} something]', '', 'an empty phase date collapses its group');
eq('A[ / {emptyThing}]', 'A', 'the tight form the palette inserts loses nothing but the group');
eq('A [ / {emptyThing}]', 'A ', 'the loose form keeps the space OUTSIDE the brackets -- as documented');
eq('[{title}] and [{emptyThing}]', 'Test Show and ', 'groups are independent of each other');
eq('[{title} {version}]', 'Test Show v3', 'two non-empty tokens in one group');
eq('[{title} {emptyThing}]', '', 'all it takes is one empty token');
eq('[]', '', 'an empty group renders nothing');
eq('[no tokens here]', 'no tokens here', 'a group with no tokens is vacuously satisfied');
eq('[a {unknown} b]', 'a {unknown} b',
   'an UNKNOWN token inside a group is literal text and does NOT gate the group');

// ---- §3.1 rule 3: whitespace ---------------------------------------------------------------------
group('whitespace is preserved exactly as typed');
eq('  {title}  ', '  Test Show  ', 'leading and trailing spaces survive -- focusout does the trimming');
eq('{title}   {version}', 'Test Show   v3', 'interior runs of spaces are not collapsed');
eq('[{title}  {version}]', 'Test Show  v3', 'nor inside a group');

// ---- §3.2: the tokens, and the date formats ------------------------------------------------------
group('§3.2 tokens');
eq('{title}', 'Test Show', '{title}');
eq('{season}', 'S2', '{season}');
eq('{titleSeason}', 'Test Show S2', '{titleSeason} -- verbatim c1');
eq('{version}', 'v3', '{version}');
eq('{episodes}', '10', '{episodes}');
eq('{shootDaysPerEp}', '8', '{shootDaysPerEp}');
eq('{shootDays}', '80', '{shootDays}');
eq('{writersRoom.name}', "Writer's Rm", '{<phase>.name} -- the renamed label');
eq('{writersRoom.weeks}', '12', '{<phase>.weeks}');
eq('{production.summary}', '17-Week Production Span / 8-Day Shooting Schedule', '{production.summary} -- verbatim r1');
eq('{production.dates}', 'Principal Photography 6.29.26 / Wrap: 10.20.26', '{production.dates} -- verbatim r2');
eq('{writersRoom.line}', "Writer's Room Opens: 1.5.26", '{writersRoom.line} -- verbatim c3');
eq('{post.open}', '', 'a token with nothing to say resolves to the empty string');

group('date formats');
eq('{today}', '9.2.26', 'dot is the default -- the header\'s own form');
eq('{today:dot}', '9.2.26', ':dot is explicit');
eq('{today:slash}', '9/2/26', ':slash -- the grid\'s fmtShort');
eq('{today:long}', 'September 2, 2026', ':long');
eq('{today:iso}', '2026-09-02', ':iso, zero-padded');
eq('{writersRoom.open:iso}', '2026-01-05', ':iso on a phase date');
eq('{writersRoom.open:long}', 'January 5, 2026', ':long on a phase date');
eq('{production.wrap:slash}', '10/20/26', ':slash on the wrap date');
eq('{today:nonsense}', '9.2.26', 'an unrecognised format falls back to dot rather than failing');
eq('{title:long}', 'Test Show', 'a format argument on a non-date token is ignored');

group('{date:...} -- the token that takes its value as an argument');
eq('{date:2026-10-05}', '10.5.26', '{date:YYYY-MM-DD}');
eq('{date:2026-10-05:long}', 'October 5, 2026', 'with a second format argument');
eq('{date:2026-10-05:iso}', '2026-10-05', 'iso round-trips');
eq('{date:}', '', 'no date is an empty value, not an error');
eq('{date:garbage}', '', 'an unparseable date is empty');
eq('{date:1200-01-01}', '', 'a year outside MIN_YEAR..MAX_YEAR is refused by parseDateUTC');
eq('[{date:garbage} x]', '', 'and an empty date collapses its group');

// ---- The fast path must not change anything ------------------------------------------------------
group('the no-token fast path');
eq('Planning Calendar', 'Planning Calendar', 'plain text is returned unchanged');
eq('', '', 'the empty string');
eq('Q3 & Q4 (final)', 'Q3 & Q4 (final)', 'punctuation that is not a brace is untouched');

// ---- Local vs UTC, the trap that lands dates a day out -------------------------------------------
group('local vs UTC formatting');
{
  ran++;
  // A Date built from LOCAL components must format back to those components under the local flag,
  // whatever the machine's zone. Asserting it this way keeps the test deterministic; asserting a
  // specific offset would only pass in one timezone.
  const localDate = new Date(2026, 8, 2, 13, 30);         // 2 Sep 2026, local
  const got = fmtHeaderDate(hdrDate(localDate, true), 'iso');
  const ok = got === '2026-09-02';
  if (!ok) { failed++; console.log(`  FAIL  a local date formats to its own local components (got ${got})`); }
  else console.log('  ok    a local date formats to its own local components');
}
{
  ran++;
  // And the UTC flag must read UTC getters. 1 Jan 2026 00:00 UTC is still 2025 in every negative
  // offset, so this is exactly where the wrong getters show up.
  const got = fmtHeaderDate(hdrDate(new Date(Date.UTC(2026, 0, 1)), false), 'iso');
  const ok = got === '2026-01-01';
  if (!ok) { failed++; console.log(`  FAIL  a UTC date at midnight formats as UTC, not shifted (got ${got})`); }
  else console.log('  ok    a UTC date at midnight formats as UTC, not shifted');
}

// ---- lookupHeaderToken's contract, directly -------------------------------------------------------
group("lookupHeaderToken's three-way answer");
{
  const cases = [
    ['title', 'Test Show', 'a known, non-empty token returns its value'],
    ['post.open', '', 'a known but empty token returns the empty string'],
    ['nope', undefined, '⭐ an UNKNOWN token returns undefined -- which is how the caller knows to leave it as typed'],
  ];
  for (const [name, expected, why] of cases) {
    ran++;
    const got = lookupHeaderToken(name, ctx);
    if (got !== expected) {
      failed++;
      console.log(`  FAIL  ${why} (got ${JSON.stringify(got)})`);
    } else console.log(`  ok    ${why}`);
  }
  ran++;
  const noCtx = lookupHeaderToken('title', null);
  if (noCtx !== undefined) { failed++; console.log('  FAIL  no ctx means every token is unknown'); }
  else console.log('  ok    no ctx means every token is unknown, so a template renders as typed');
}

// ---- A realistic full line ------------------------------------------------------------------------
group('a whole header line, as a user would write it');
eq('Principal Photography {production.open} / Wrap: {production.close}',
   'Principal Photography 6.29.26 / Wrap: 10.20.26',
   'the r2 line, hand-written from parts');
eq('{titleSeason}[ — {version}]', 'Test Show S2 — v3', 'a version suffix that disappears when unset');
eq("[{writersRoom.name} {writersRoom.open:slash}–{writersRoom.close:slash}]",
   "Writer's Rm 1/5/26–3/27/26",
   'a phase range with an en dash');

console.log(`\n${ran - failed}/${ran} checks passed`);
if (failed) {
  console.log('RESULT: VIOLATED — do not ship the resolver');
  process.exit(1);
}
console.log('RESULT: every §3.1 rule and every §3.2 token holds');
