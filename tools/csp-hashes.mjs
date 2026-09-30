// The Content-Security-Policy's script hashes, computed from the BUILT file (audit L-4, FIX-PLAN 4.1).
//
// src/index.html carries the CSP <meta> with the placeholder '__CSP_SCRIPT_HASHES__' in script-src.
// A hash has to be of the FINAL text of each inline script -- after vite-plugin-singlefile has inlined
// the 840 KB bundle -- so this runs at closeBundle, reads dist/index.html back, hashes every inline
// script the browser would EXECUTE, and writes the list in place of the placeholder. Nothing is typed
// by hand, so a hash cannot go stale; tools/check-build.mjs re-derives the list with its OWN parser and
// fails the build if the two disagree.
//
// ⛔ WHICH SCRIPTS: every inline <script> with no src whose type is a JavaScript type or `module`.
// The install gate's classic script (PWA-ONLY-PLAN.md) and the app's module are the two today.
// #saved-state (application/json) and the Carlito blocks (text/plain) are DATA: the browser never
// executes them, so CSP never checks them -- which is also why a shareable copy, whose saved-state
// holds the sender's calendar, still matches the policy it carries.
//
// ⚠️ The dev server (`npm run dev`) serves Vite's own client and /main.jsx, which no hash can cover,
// so there the meta is removed. The policy is a property of the BUILT product.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const CSP_PLACEHOLDER = "'__CSP_SCRIPT_HASHES__'"
const CSP_META = /<meta http-equiv="Content-Security-Policy"[^>]*>\s*/i
// The types a browser executes as script (the HTML spec's JavaScript MIME type essence list, plus
// `module`); an absent or empty type is classic JavaScript.
const JS_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript', 'application/ecmascript',
  'application/x-ecmascript', 'application/x-javascript', 'text/ecmascript', 'text/javascript1.0',
  'text/javascript1.1', 'text/javascript1.2', 'text/javascript1.3', 'text/javascript1.4', 'text/javascript1.5',
  'text/jscript', 'text/livescript', 'text/x-ecmascript', 'text/x-javascript'])

// The inline scripts the browser will execute, as the exact text it hashes. A sequential scan in
// document order, the way the HTML tokenizer walks the file: a comment is skipped whole (the build
// keeps them, and one says "the old inline <script> did"), a <style> body is raw text, and a
// script ends at the first `</script` -- true unless its body contains `<!--` (the parser's "script
// data escaped" states), which throws rather than risk a wrong boundary.
export function executableInlineScripts(html) {
  const out = []
  const lower = html.toLowerCase()
  let i = 0
  for (;;) {
    const c = lower.indexOf('<!--', i), sc = lower.indexOf('<script', i), st = lower.indexOf('<style', i)
    const next = [c, sc, st].filter(n => n >= 0).sort((a, b) => a - b)[0]
    if (next === undefined) break
    if (next === c) { const e = lower.indexOf('-->', c + 4); if (e < 0) break; i = e + 3; continue }
    const tagEnd = lower.indexOf('>', next)
    if (tagEnd < 0) break
    if (next === st) { const e = lower.indexOf('</style', tagEnd); if (e < 0) break; i = e + 7; continue }
    const attrs = html.slice(next + 7, tagEnd)
    if (!/^[\s>/]/.test(html.charAt(next + 7) || '>')) { i = next + 7; continue }   // e.g. <scripts>
    const end = lower.indexOf('</script', tagEnd + 1)
    if (end < 0) break
    const body = html.slice(tagEnd + 1, end)
    i = end + 8
    if (/\ssrc\s*=/i.test(' ' + attrs)) continue
    const t = attrs.match(/\stype\s*=\s*["']?([^"'\s>]*)/i)
    const type = t ? t[1].trim().toLowerCase() : ''
    if (!JS_TYPES.has(type)) continue
    if (body.indexOf('<!--') >= 0) throw new Error('csp-hashes: an inline script contains "<!--", so its end cannot be found by a simple scan')
    out.push(body)
  }
  return out
}

export function scriptHash(text) {
  return "'sha256-" + crypto.createHash('sha256').update(text, 'utf8').digest('base64') + "'"
}

export function cspHashes() {
  let outFile = null
  return [
    {
      name: 'sptcal-csp-dev',
      apply: 'serve',
      transformIndexHtml(html) { return html.replace(CSP_META, '') },
    },
    {
      name: 'sptcal-csp-build',
      apply: 'build',
      enforce: 'post',
      configResolved(config) { outFile = path.resolve(config.root, config.build.outDir, 'index.html') },
      closeBundle() {
        const html = fs.readFileSync(outFile, 'utf8')
        if (html.indexOf(CSP_PLACEHOLDER) < 0) throw new Error('csp-hashes: the CSP placeholder is missing from dist/index.html')
        if (/\r/.test(html)) throw new Error('csp-hashes: dist/index.html contains a CR, and the browser hashes LF-normalised text')
        const hashes = executableInlineScripts(html).map(scriptHash)
        if (!hashes.length) throw new Error('csp-hashes: no executable inline script found -- refusing to write an empty script-src')
        fs.writeFileSync(outFile, html.replace(CSP_PLACEHOLDER, () => hashes.join(' ')))
      },
    },
  ]
}
