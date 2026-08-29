// Read back a waterfall PDF this app wrote, so two exports can be compared.
//
//   node pdf-info.js <file.pdf> [texts-out.txt]
//
// The app writes PDF bytes directly (no print dialog): Flate-compressed content stream, TrueType
// subset, xref. This finds the MediaBox, inflates the one stream that carries text operators, and
// reports what was drawn -- text-op count, rect count, the drawn extent of the grid, and every
// string in order. Diffing the strings file between two exports is the cheapest real answer to
// "did the PDF change".
//
// ** Do not measure these PDFs by rasterising them. ** Both the app's PDF and the reference have
// ** TRANSPARENT backgrounds, and a rasteriser that composites onto black renders every black
// ** glyph invisible -- "the whole page is black" has been the measurement, not the PDF, before
// ** now. Note too that `sips` renders a CropBox where other tools render the MediaBox.
const fs = require('fs'), zlib = require('zlib');
const buf = fs.readFileSync(process.argv[2]);
const s = buf.toString('latin1');
const mb = s.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);

let content = null;
const re = /stream\r?\n/g; let m;
while ((m = re.exec(s))) {
  const start = m.index + m[0].length;
  const end = s.indexOf('endstream', start);
  if (end < 0) continue;
  try {
    const out = zlib.inflateSync(buf.subarray(start, end)).toString('latin1');
    if (/\bTf\b/.test(out) && /\bTj\b/.test(out)) { content = out; break; }
  } catch (e) { /* font streams and the like: not the content stream */ }
}

const o = { file: process.argv[2].split('/').pop(), bytes: buf.length,
            mediaBox: mb ? [+mb[3], +mb[4]] : null };
if (content) {
  const texts = [...content.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(x => x[1]);
  const tms   = [...content.matchAll(/1 0 0 1 ([\d.-]+) ([\d.-]+) Tm/g)].map(x => [+x[1], +x[2]]);
  const res   = [...content.matchAll(/([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re/g)].map(x => x.slice(1).map(Number));
  o.textOps = texts.length; o.rectOps = res.length; o.contentLen = content.length;
  // Skip the full-page white rect the writer paints first (see buildWaterfallPdf's comment on why
  // it exists at all); what is left is the grid.
  const body = res.filter(r => !(r[2] === o.mediaBox[0] && r[3] === o.mediaBox[1]));
  if (body.length) {
    o.gridLeft  = Math.min(...body.map(r => r[0]));
    o.gridRight = Math.max(...body.map(r => r[0] + r[2]));
    o.gridDrawnW = Math.round((o.gridRight - o.gridLeft) * 100) / 100;
    o.gridTop    = Math.max(...body.map(r => r[1] + r[3]));
    o.gridBottom = Math.min(...body.map(r => r[1]));
    o.gridDrawnH = Math.round((o.gridTop - o.gridBottom) * 100) / 100;
  }
  o.textXmin = tms.length ? Math.min(...tms.map(t => t[0])) : null;
  o.textXmax = tms.length ? Math.max(...tms.map(t => t[0])) : null;
  o.sampleTexts = texts.slice(0, 6);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], texts.join('\n'));
}
console.log(JSON.stringify(o, null, 1));
