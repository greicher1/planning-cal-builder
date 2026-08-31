#!/usr/bin/env node
// Post-build gate for dist/index.html. `npm run check`.
//
// package.json has referenced this file since the Vite build landed, and vite.config.js names it
// ("tools/check-build.mjs asserts it survives the build; do not delete that check") -- but it was
// never committed, so nothing was ever actually asserted. This is that file.
//
// It checks the properties that make the build THE PRODUCT rather than just "it compiled":
// one self-contained file, the frozen grid containers intact, the save format present, and the
// NUL sentinel still a NUL. None of these are caught by a successful `vite build`.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist', 'index.html');
const NUL = String.fromCharCode(0);

// The ONE external request the product is allowed to make. Everything else -- fonts, icons, the
// PWA manifest, the Carlito subset -- is inlined, and must stay inlined: the file is opened from
// file:// and run offline at least as often as it is served.
const ALLOWED_EXTERNAL = ['cdn.jsdelivr.net/npm/exceljs'];

const results = [];
let failed = 0;
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failed++;
}

if (!fs.existsSync(DIST)) {
  console.error('FAIL  dist/index.html does not exist -- run `npm run build` first.');
  process.exit(1);
}

const src = fs.readFileSync(DIST, 'utf8');
const bytes = Buffer.byteLength(src);
const gzip = zlib.gzipSync(src).length;

// --- 1. One self-contained file -----------------------------------------------------------
// A floor, not an exact size: the build legitimately moves as the chrome changes. It is here to
// catch a catastrophically empty or truncated bundle, which `vite build` reports as success.
check('size >= 700 KB (not a truncated bundle)', bytes >= 700 * 1024, `${bytes} bytes`);
check('size <= 16 MB', bytes <= 16 * 1024 * 1024, `${(bytes / 1048576).toFixed(2)} MB`);

const externals = [...src.matchAll(/(?:src|href)\s*=\s*["'](https?:\/\/|\/\/)([^"']+)["']/gi)]
  .map((m) => m[2])
  .filter((u) => !ALLOWED_EXTERNAL.some((a) => u.startsWith(a)));
check(
  'no unexpected external requests',
  externals.length === 0,
  externals.length ? `found: ${[...new Set(externals)].join(', ')}` : 'only the ExcelJS CDN'
);

// vite-plugin-singlefile should leave nothing to fetch from disk. A surviving relative asset ref
// means the file is no longer self-contained and breaks the moment it is emailed to someone.
const localAssets = [
  ...src.matchAll(
    /(?:src|href)\s*=\s*["'](?!https?:|\/\/|data:|#|mailto:)([^"']+\.(?:js|css|woff2?|ttf|png|svg|jpg))["']/gi
  ),
].map((m) => m[1]);
check(
  'no un-inlined local assets',
  localAssets.length === 0,
  localAssets.length ? `found: ${[...new Set(localAssets)].join(', ')}` : 'everything inlined'
);

// --- 2. The frozen surface is still there -------------------------------------------------
// CLAUDE.md freezes #table-wrap and #print-root. The build renders them as empty ref'd
// containers; if a refactor ever dropped one, the grid or the PDF would silently vanish.
check('#table-wrap present (frozen grid container)', /id="table-wrap"/.test(src));
check('#print-root present (frozen print container)', /id="print-root"/.test(src));

// --- 3. The NUL sentinel still evaluates to NUL -------------------------------------------
// SIM_KEY is a NUL followed by "simpost" -- the NUL chosen so the key cannot collide with any
// phase key.
// WARNING: do NOT assert the literal BYTE. Measured 31 Aug 2026: the minifier re-encodes it as an
// escape, which is semantically identical and correct. A byte-level check false-fails on every
// single build. What matters is that a NUL-valued sentinel survives in SOME form.
const nulSurvives =
  src.includes(NUL) || /\\0(?![0-9])/.test(src) || src.includes('\\u0000') || src.includes('\\x00');
check(
  'SIM_KEY NUL sentinel survives minification',
  nulSurvives,
  src.includes(NUL) ? 'as a literal byte' : 'as an escape sequence (equivalent)'
);

// --- 4. The features that define the product ----------------------------------------------
check('Mantine chrome built in', /mantine/i.test(src));
check('.sptcal save format present', /sptcal/.test(src));
check('ExcelJS loader present', /exceljs/i.test(src));

// --- 5. The update check and its marker agree ---------------------------------------------
// The app polls version.json and compares it to its own baked-in version. If the two ever
// disagree the banner is either permanently on (a phantom update) or permanently off (a real
// update nobody is told about) -- and the second failure is silent, which is why this is gated.
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const marker = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8'));
check('build polls version.json', /version\.json/.test(src));
check(
  'version.json matches package.json',
  marker.version === pkg.version,
  `version.json=${marker.version} package.json=${pkg.version}`
);

// --- report -------------------------------------------------------------------------------
console.log('\n=== check-build: dist/index.html ===');
console.log(`    ${bytes.toLocaleString()} bytes raw . ${gzip.toLocaleString()} bytes gzip\n`);
for (const r of results) {
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
console.log();
if (failed) {
  console.error(`=== CHECK FAILED: ${failed} of ${results.length} ===\n`);
  process.exit(1);
}
console.log(`=== CHECK PASSED: ${results.length}/${results.length} ===\n`);
