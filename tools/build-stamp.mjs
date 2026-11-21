// THE BUILD STAMP: a fingerprint of the built app, so the update bar shows on EVERY release that changes it.
//
// Owner, 19 Nov 2026: *"Whenever theres a new update to the app, lets add the blue update bar to the top as we've done
// previously."* The bar compared version numbers only, and most pushes go live as "Unreleased" without a version cut,
// so users were never told about them. A version cut is still the only thing that changes APP_VERSION; this adds a
// second signal that needs no one to remember anything.
//
// What it does, at closeBundle (after the CSP plugin has written its hashes):
//   1. reads dist/index.html, which carries <meta name="sptcal-build" content="dev"> from src/index.html;
//   2. hashes the WHOLE file as it stands (placeholder included), so the stamp is a pure function of the built app:
//      a push that changes only docs, tests or HANDOFF builds the same bytes, the same stamp, and shows no bar;
//   3. writes the first 12 hex digits into that meta, and dist/version.json = {version, build}.
// The engine's update check (app.js, bottom) reads the meta as "this copy" and version.json as "the live one".
//
// ⛔ A META, never a script: the CSP hashes every inline script, and a stamp written into one after hashing would
// break the policy. ⛔ dist/version.json is written HERE now; deploy.yml no longer copies the root version.json over it
// (that would drop `build`). The rollback writes its own {version} only, and an old release carries no meta, so a
// rollback is compared by version alone, as before. `npm run check` holds the meta and the file to each other.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const PLACEHOLDER = '<meta name="sptcal-build" content="dev">'

export function buildStamp({ version }) {
  let outDir = null
  return {
    name: 'sptcal-build-stamp',
    apply: 'build',
    enforce: 'post',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir) },
    closeBundle() {
      const file = path.join(outDir, 'index.html')
      const html = fs.readFileSync(file, 'utf8')
      const at = html.indexOf(PLACEHOLDER)
      if (at < 0) throw new Error('build-stamp: <meta name="sptcal-build" content="dev"> is missing from dist/index.html')
      if (html.indexOf(PLACEHOLDER, at + 1) >= 0) throw new Error('build-stamp: the build-stamp meta appears twice')
      const stamp = crypto.createHash('sha256').update(html, 'utf8').digest('hex').slice(0, 12)
      fs.writeFileSync(file, html.replace(PLACEHOLDER, () => '<meta name="sptcal-build" content="' + stamp + '">'))
      fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify({ version, build: stamp }) + '\n')
    },
  }
}
