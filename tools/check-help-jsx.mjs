// check-help-jsx.mjs -- parses Help's article files (or the ones named) as JSX, without building, and checks that each
// file's id is in toc.js and that every picture it imports exists. Fast; no browser. Exit 1 on any problem.
//   node tools/check-help-jsx.mjs                 # every article
//   node tools/check-help-jsx.mjs move shift      # just these
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformWithOxc } from 'vite'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(ROOT, 'src', 'help', 'articles')
const toc = fs.readFileSync(path.join(ROOT, 'src', 'help', 'toc.js'), 'utf8')
const ids = new Set([...toc.matchAll(/\{ id: '([a-z0-9-]+)'/g)].map(m => m[1]))
const only = process.argv.slice(2)
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.jsx') && (!only.length || only.includes(f.slice(0, -4))))
let bad = 0
for (const f of files) {
  const id = f.slice(0, -4), src = fs.readFileSync(path.join(DIR, f), 'utf8'), errs = []
  try { await transformWithOxc(src, f, { lang: 'jsx' }) } catch (e) { errs.push('does not parse: ' + String(e.message).split('\n').slice(0, 4).join(' ')) }
  if (!ids.has(id)) errs.push('not in toc.js')
  for (const m of src.matchAll(/from '\.\.\/shots\/([^']+)'/g)) if (!fs.existsSync(path.join(ROOT, 'src', 'help', 'shots', m[1]))) errs.push('no picture ' + m[1])
  for (const m of src.matchAll(/(?:<To id|ids=\{\[)[^>]*/g)) for (const r of m[0].matchAll(/'([a-z0-9-]+)'|"([a-z0-9-]+)"/g)) { const rid = r[1] || r[2]; if (!ids.has(rid)) errs.push('links to unknown article ' + rid) }
  if (errs.length) { bad++; console.log(`${f}: ${errs.join('; ')}`) }
}
console.log(bad ? `check-help-jsx: ${bad} of ${files.length} files have problems` : `check-help-jsx: ${files.length} files OK`)
process.exit(bad ? 1 : 0)
