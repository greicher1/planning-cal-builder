// What a headless Chrome leaves on disk, removed on every way out of a CDP script.
//
//   import { NO_BUNDLE_CLONE, removeProfileOnExit } from './chrome-profile.mjs';
//   removeProfileOnExit(PROFILE);                       // once, as soon as PROFILE is known
//   spawn(CHROME, ['--headless=new', NO_BUNDLE_CLONE, `--user-data-dir=${PROFILE}`, ...]);
//
// ⛔ WHY (21 Oct 2026). run.sh and the CDP scripts (cspproof, hiatusdrag, phaseedge, pilldrag,
// printpaper, rtleg) all left their profile in /tmp (about 8 MB each), so one full gate.sh left
// about 110 and 2,010 had piled up (15.5 GB) with 1.4 GB of disk free. run.sh does the same cleanup
// in zsh (its EXIT trap); this is the node copy, so keep the two alike. Two smaller leaks go with
// the profile:
//   - the directory Chrome makes in $TMPDIR for its SingletonSocket. The profile holds only a
//     symlink to it, so deleting the profile alone orphans it (19,679 had piled up).
//   - a clone of the whole Chrome.app that Chrome on macOS makes in $TMPDIR/../X at launch and
//     deletes only on a clean exit. The harness hard-kills Chrome, so every launch left one (456
//     on 21 Oct, 1,430 on 19 Oct). NO_BUNDLE_CLONE stops it being made: measured, a launch without
//     it leaves one and a launch with it none. Chrome elsewhere ignores an unknown feature name.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const NO_BUNDLE_CLONE = '--disable-features=MacAppCodeSignClone';

// A synchronous sleep, because process.on('exit') cannot await.
const pause = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Kill every process of this profile, wait until none is left to write into it, then delete the
// socket directory and the profile. The pattern ends at the argument, as run.sh's does, so one
// script's cleanup can never match another profile whose name merely starts the same.
export function removeProfile(profile) {
  const re = `user-data-dir=${profile}( |$)`;
  try { execFileSync('pkill', ['-9', '-f', re]); } catch (e) { /* none running */ }
  for (let i = 0; i < 20; i++) {
    try { execFileSync('pgrep', ['-f', re], { stdio: 'ignore' }); } catch (e) { break; }  // exit 1: none left
    pause(250);
  }
  let sock = '';
  try { sock = fs.readlinkSync(path.join(profile, 'SingletonSocket')); } catch (e) { /* never started */ }
  // Chrome made that directory for the socket (and a SingletonCookie symlink beside it); delete it
  // only while it holds nothing else.
  if (sock) {
    const dir = path.dirname(sock);
    let held = [];
    try { held = fs.readdirSync(dir); } catch (e) { /* already gone */ }
    if (held.length && held.every(n => n === 'SingletonSocket' || n === 'SingletonCookie')) fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.rmSync(profile, { recursive: true, force: true });
}

// Every way out: the scripts' own process.exit (their finally block and their deadline timer), an
// uncaught throw, and a signal. Without the signal handlers a Ctrl-C or a killed gate.sh ended node
// with no 'exit' event at all, and left Chrome running as well as its profile.
export function removeProfileOnExit(profile) {
  process.on('exit', () => { try { removeProfile(profile); } catch (e) { /* best effort on the way out */ } });
  for (const [sig, n] of [['SIGHUP', 1], ['SIGINT', 2], ['SIGTERM', 15]]) process.on(sig, () => process.exit(128 + n));
}
