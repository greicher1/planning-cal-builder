// Inlines the built script and stylesheet into ../phase-cards.html, one self-contained file.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const out = process.argv[2]
if (!out) { console.error('usage: node assemble.mjs <vite outDir>'); process.exit(1) }
const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(out, 'phase-cards.css'), 'utf8')
const js = readFileSync(join(out, 'phase-cards.js'), 'utf8').replace(/<\/script/gi, '<\\/script')
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Phases card mockups</title>
<style>html,body{margin:0}${css}</style></head>
<body><div id="root"></div><script>${js}</script></body></html>
`
writeFileSync(join(here, '..', 'phase-cards.html'), html)
console.log('wrote mockups/phase-cards.html', html.length, 'bytes')
