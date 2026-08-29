// Pull the <pre id="R"> payload out of a --dump-dom capture and split off any base64 files.
//
//   node parse.js <dump.html> <out-base>
//
// Writes <out-base>.json, plus <out-base>.xlsx / .pdf / .sptcal for any base64 field of that name,
// and prints the JSON (minus the base64) so a run is legible in the terminal.
//
// The DOM comes back HTML-escaped, so the payload has to be unescaped before it will parse --
// &amp; is five characters standing for one, which has produced at least one wrong measurement in
// this project's history (an Excel header measured 320 against a 255 limit; the real string was 237).
const fs = require('fs'), path = require('path');
const src = process.argv[2], outBase = process.argv[3];
const s = fs.readFileSync(src, 'utf8');
const m = s.match(/<pre id="R">([\s\S]*?)<\/pre>/);
if (!m) { console.log('NO RESULT BLOCK -- the page never reached the injected script'); process.exit(1); }
const t = m[1]
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
if (t.trim() === 'pending') { console.log('STILL PENDING -- the test did not finish; raise the seconds'); process.exit(1); }
let o;
try { o = JSON.parse(t); } catch (e) { console.log('PARSE FAIL:', t.slice(0, 800)); process.exit(1); }
for (const k of Object.keys(o)) {
  if (/^(xlsx|pdf|sptcal)$/.test(k) && typeof o[k] === 'string') {
    fs.writeFileSync(outBase + '.' + k, Buffer.from(o[k], 'base64'));
    o[k] = '<written to ' + path.basename(outBase + '.' + k) + '>';
  }
}
fs.writeFileSync(outBase + '.json', JSON.stringify(o, null, 1));
console.log(JSON.stringify(o, null, 1).slice(0, 4000));
