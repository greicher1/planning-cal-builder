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
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist', 'index.html');
const NUL = String.fromCharCode(0);

// The ONE external request the product is allowed to make. Everything else -- fonts, icons, the
// PWA manifest, the Carlito subset -- is inlined, and must stay inlined: the file is opened from
// file:// and run offline at least as often as it is served.
const ALLOWED_EXTERNAL = ['cdn.jsdelivr.net/npm/exceljs'];
// Outbound LINKS -- an <a href> the user can click, which is a navigation and fetches nothing. They
// are allowed only inside an <a> tag, so the same URL anywhere else (a src=, a fetch) still fails.
// The install gate's OTHER BROWSER screen: "Don't have Chrome? Get it free." (PWA-ONLY-PLAN.md).
const ALLOWED_LINKS = ['www.google.com/chrome/'];

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

const inAnchor = (i) => /^<a\s/i.test(src.slice(src.lastIndexOf('<', i), i));
const externals = [...src.matchAll(/(?:src|href)\s*=\s*["'](https?:\/\/|\/\/)([^"']+)["']/gi)]
  .filter((m) => !ALLOWED_EXTERNAL.some((a) => m[2].startsWith(a)))
  .filter((m) => !(inAnchor(m.index) && /^href/i.test(m[0]) && ALLOWED_LINKS.some((a) => m[2] === a)))
  .map((m) => m[2]);
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
// Audit N-5: the check above never looked at the ENGINE's copy, which is the one the update
// check actually compares against -- so a cut that bumped version.json alone passed here and
// shipped a phantom update. The minifier renames APP_VERSION, so the constant is read from the
// SOURCE, and the build is then required to carry that exact string literal.
const engineSrc = fs.readFileSync(path.join(ROOT, 'src', 'legacy', 'app.js'), 'latin1');
const engineVersion = (engineSrc.match(/\bconst APP_VERSION\s*=\s*'([^']+)'/) || [])[1];
check(
  "engine APP_VERSION matches version.json",
  engineVersion === marker.version,
  `APP_VERSION=${engineVersion} version.json=${marker.version}`
);
const litRe = (v) => new RegExp('[`\'"]' + v.replace(/\./g, '\\.') + '[`\'"]');
check(
  'build carries the engine APP_VERSION',
  !!engineVersion && litRe(engineVersion).test(src),
  engineVersion ? `literal ${engineVersion} in dist` : 'APP_VERSION not found in src/legacy/app.js'
);

// --- 6. The install gate (PWA-ONLY-PLAN.md) -----------------------------------------------
// The hosted link runs the app only in the installed app window; a browser tab gets the gate.
// A regression in either direction is serious and silent: a gate that stops matching shows every
// browser tab the app again, and a manifest whose identity moves makes Chrome treat every existing
// install as some other app -- and then no installed user is ever recognised.
const PAGES_URL = 'https://greicher1.github.io/planning-cal-builder/';
const manHref = (src.match(/<link rel="manifest" href="data:application\/manifest\+json,([^"]+)"/) || [])[1];
let man = null;
try { man = JSON.parse(decodeURIComponent(manHref || '')); } catch (e) { /* reported below */ }
check('manifest decodes', !!man);
if (man) {
  // The installed identity is COMPUTED (no id key): start_url "." against the page. Changing any of
  // these is a different app to Chrome. The README records what a changed name risks.
  check('manifest identity unchanged (no id; name, start_url, scope, display)',
    !('id' in man) && man.name === 'SPTCal' && man.short_name === 'SPTCal' && man.start_url === '.' &&
    man.scope === '.' && man.display === 'standalone',
    `id=${'id' in man ? man.id : '(none)'} name=${man.name} start_url=${man.start_url} scope=${man.scope}`);
  const ra = Array.isArray(man.related_applications) ? man.related_applications : [];
  check('manifest lists the app itself in related_applications (installed-app detection)',
    ra.length === 1 && ra[0].platform === 'webapp' && ra[0].id === PAGES_URL, JSON.stringify(ra));
  // true would make Chrome send people to a store instead of offering the install.
  check('manifest does not prefer related applications', man.prefer_related_applications !== true);
  check('manifest launch_handler is focus-existing',
    !!man.launch_handler && man.launch_handler.client_mode === 'focus-existing', JSON.stringify(man.launch_handler));
}
// The decision has to run before <body> is parsed, so it must be a CLASSIC script in <head>, ahead
// of the module (which is deferred, and ~1 MB of it may still be parsing when the install prompt
// fires). Found by position, not by name: the gate script is the one holding GATE_HOSTS.
const headEnd = src.indexOf('</head>');
const gateAt = src.indexOf('var GATE_HOSTS');
const moduleAt = src.indexOf('<script type="module"');
check('gate script is in <head>, before the module',
  gateAt > 0 && gateAt < headEnd && (moduleAt < 0 || gateAt < moduleAt),
  `gate@${gateAt} module@${moduleAt} </head>@${headEnd}`);
check("gate's GATE_HOSTS names the Pages host", /var GATE_HOSTS = \['greicher1\.github\.io'\]/.test(src));
check('gate page markup present and hidden by default', /<div id="app-gate" hidden>/.test(src));
// main.jsx's early return: the bundle must still ask for the attribute, or a gated tab boots the
// engine underneath the gate (backup slot, autosave, beforeunload) while showing nothing of it.
const gateAttrUses = (src.match(/data-app-gate/g) || []).length;
check('the bundle checks data-app-gate before starting the app',
  // Any quote: the minifier rewrites the string literal as a template literal (`data-app-gate`).
  /hasAttribute\([`"']data-app-gate[`"']\)/.test(src), `${gateAttrUses} mentions`);
// UI-CONVENTIONS §10 gate 9: collectFieldValues() sweeps every id'd field into saved calendars.
const gateMarkup = (src.match(/<div id="app-gate" hidden>([\s\S]*?)\n<\/div>/) || [])[1] || '';
check('no form field and no id on any control inside #app-gate',
  gateMarkup.length > 0 && !/<(input|select|textarea)\b/i.test(gateMarkup) &&
  !/<(button|a)\b[^>]*\sid=/i.test(gateMarkup),
  gateMarkup.length ? `${gateMarkup.length} chars scanned` : 'gate markup not found');
check('no inline event-handler attribute inside #app-gate (CSP, FIX-PLAN 4.1)',
  gateMarkup.length > 0 && !/\son[a-z]+\s*=/i.test(gateMarkup));

// --- 7. The Content-Security-Policy (audit L-4, FIX-PLAN 4.1) -----------------------------
// tools/csp-hashes.mjs writes script-src's hashes from the built text at closeBundle. This section
// re-derives them with its OWN scan -- one left-to-right regex whose alternation consumes a comment
// or a <style> body before any `<script` inside it can match, i.e. the HTML tokenizer's order -- so
// a bug in either copy fails the build instead of shipping a policy that blocks the app (every
// script refused: a blank page) or allows a script nobody reviewed.
const cspMeta = (src.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/) || [])[1] || '';
check('CSP meta is the first thing in <head>, straight after the charset',
  /<head>\s*<meta charset="UTF-8">\s*<meta http-equiv="Content-Security-Policy" content="[^"]*">/.test(src));
check('the referrer meta (no-referrer) follows the CSP meta',
  /<meta http-equiv="Content-Security-Policy" content="[^"]*">\s*<meta name="referrer" content="no-referrer">/.test(src));
check('no CSP placeholder left in the build', cspMeta.length > 0 && cspMeta.indexOf('__CSP_SCRIPT_HASHES__') < 0);
const cspDirs = {};
cspMeta.split(';').map(d => d.trim()).filter(Boolean).forEach(d => { const [k, ...v] = d.split(/\s+/); cspDirs[k] = v; });
const JS_TYPE = /^(|module|text\/javascript|application\/javascript|application\/ecmascript|text\/ecmascript)$/i;
const tokenRe = /<!--[\s\S]*?-->|<style\b[\s\S]*?<\/style|<script\b([^>]*)>([\s\S]*?)<\/script/gi;
const inlineHashes = [], scriptBodies = [];
let tm, scriptWithComment = 0;
while ((tm = tokenRe.exec(src))) {
  if (tm[1] === undefined) continue;                               // a comment or a style body
  if (/\ssrc\s*=/i.test(' ' + tm[1])) continue;
  const type = ((tm[1].match(/\stype\s*=\s*["']?([^"'\s>]*)/i) || [])[1] || '').trim();
  if (!JS_TYPE.test(type)) continue;
  scriptBodies.push(tm[2]);
  if (tm[2].indexOf('<!--') >= 0) scriptWithComment++;
  inlineHashes.push("'sha256-" + crypto.createHash('sha256').update(tm[2], 'utf8').digest('base64') + "'");
}
const policyHashes = (cspDirs['script-src'] || []).filter(v => /^'sha256-/.test(v));
check('script-src hashes EXACTLY the executable inline scripts (none missing, none stale)',
  inlineHashes.length > 0 && inlineHashes.length === policyHashes.length && inlineHashes.every(h => policyHashes.includes(h)),
  `${inlineHashes.length} inline scripts, ${policyHashes.length} hashes`);
check('no executable inline script contains "<!--" (it would move the parser\'s end of the script)',
  scriptWithComment === 0);
const scriptSrc = cspDirs['script-src'] || [];
check("script-src allows no 'unsafe-inline', no 'unsafe-eval', no wildcard, and no host but ExcelJS",
  scriptSrc.length > 0 && !scriptSrc.some(v => /unsafe|\*|^https?:$|^data:|^blob:/.test(v)) &&
  scriptSrc.filter(v => /^https:/.test(v)).join(' ') === 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  scriptSrc.filter(v => !/^'sha256-/.test(v)).join(' '));
const want = { 'default-src': "'none'", 'object-src': "'none'", 'base-uri': "'none'", 'form-action': "'none'",
               'manifest-src': 'data:', 'font-src': 'data:', 'connect-src': "'self'" };
const missing = Object.keys(want).filter(k => !(cspDirs[k] || []).includes(want[k]));
if (!(cspDirs['img-src'] || []).includes('data:')) missing.push('img-src data:');
check("the policy's directives: default/object/base-uri/form-action 'none', manifest/font/img data:, connect 'self'",
  missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : '');
check('the ExcelJS tag is deferred, and keeps its integrity hash and crossorigin',
  /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/exceljs@4\.4\.0\/dist\/exceljs\.min\.js"\s+integrity="sha384-[^"]+"\s+crossorigin="anonymous"\s+defer><\/script>/.test(src));
// Markup only: script bodies and comments hold "onclick" and "javascript:" as ordinary strings.
let markup = src;
scriptBodies.forEach(b => { markup = markup.split(b).join(''); });
markup = markup.replace(/<!--[\s\S]*?-->/g, '');
check('no inline on*= handler and no javascript: URL anywhere in the markup (neither can run under the CSP)',
  !/<[a-z][^>]*\son[a-z]+\s*=/i.test(markup) && !/(?:href|src|action)\s*=\s*["']?\s*javascript:/i.test(markup));

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
