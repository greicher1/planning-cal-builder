#!/bin/zsh
# Run one harness test end to end.
#
#   ./run.sh <test-name> [seconds]        e.g.  ./run.sh base 45
#
# Starts the server, runs headless Chrome against index.html?test=<name>, kills Chrome, parses the
# result, stops the server and deletes Chrome's profile. Output lands beside this script as
# <test-name>.json (plus .xlsx/.pdf when the test captured an export).
#
# ** Chrome is backgrounded and hard-killed on purpose. ** `--dump-dom` writes the DOM to stdout
# ** and then does not always exit: observed 29 Aug 2026 with the file already on disk, Chrome
# ** still alive, and the next command in the shell chain never running -- which looks exactly
# ** like the test hanging. Poll, kill, then parse. Never put the parse after Chrome in the same
# ** foreground chain.
#
# [seconds] is the VIRTUAL time budget, not a wall-clock limit -- see the wait loop below. The
# wall-clock cap is 3x that plus 30 s and exists only to bound a genuine hang.
#
# HARNESS_PRINT_PDF=1 also has Chrome PRINT the page (print media, the @page rules, Chrome's own
# page breaking) to <test-name>.print.pdf at the same moment it dumps the DOM. That is the real
# print pipeline a user's "Save as PDF" goes through, so it is how the monthprint leg counts the
# sheets the month PDF actually comes out as -- the one thing a DOM capture cannot see.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
T="${1:?usage: run.sh <test-name> [seconds]}"
SECS="${2:-45}"
PORT="${HARNESS_PORT:-8231}"
# ⛔ PARALLEL SESSIONS (29 Sep 2026). Other sessions run this harness from .claude/worktrees/* on
# the same machine, and nothing locks it. The server below is keyed by PORT, but the Chrome profile
# was keyed by TEST NAME alone -- /tmp/tc-<test> -- and the cleanup pkills by that path, so two
# sessions running the same leg deleted and killed each other's Chrome whatever port each used. A
# NON-DEFAULT port now namespaces the profile as /tmp/tc<port>-<test>, which the default session's
# pattern ("user-data-dir=/tmp/tc-<test>") cannot match. The default port keeps the old path, so a
# lone session runs exactly as before. gate.sh namespaces its Excel diff directories the same way.
TMPTAG=""; [[ "$PORT" != 8231 ]] && TMPTAG="$PORT"
PROFILE="/tmp/tc${TMPTAG}-$T"
# Which page to test. Defaults to the deployed single-file app at the repo root; set
#   HARNESS_PAGE=/dist/index.html
# to run the same test against the Vite build instead. The server always serves the REPO ROOT, so
# tests/fixtures/... stays reachable from either page -- t/restore.js fetches it by absolute path.
PAGE="${HARNESS_PAGE:-/index.html}"
# Optional starting state: HARNESS_STATE=<name> substitutes tests/fixtures/<name>.sptcal into the
# page's own <script id="saved-state"> block (see srv.js), so a test can begin from an arbitrary
# saved calendar WITHOUT a debug hook in the app and without IndexedDB -- which is what makes it
# usable in headless Chrome, where the file-handle restore path stalls.
STATE_Q=""
[[ -n "${HARNESS_STATE:-}" ]] && STATE_Q="&state=${HARNESS_STATE}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

[[ -x "$CHROME" ]] || { echo "no Chrome at: $CHROME (set CHROME=...)"; exit 1; }
[[ -f "$HERE/t/$T.js" ]] || { echo "no such test: $HERE/t/$T.js"; exit 1; }

# ⛔ NOTHING STAYS BEHIND (21 Oct 2026). Every run used to leave its profile in /tmp (about 8 MB),
# so one full gate.sh left about 110 of them and 2,010 had piled up (15.5 GB) when the disk was down
# to 1.4 GB free. Two smaller leaks rode along: the directory Chrome makes in $TMPDIR for its
# SingletonSocket (the profile holds only a symlink to it; 19,679 had piled up), and a clone of the
# whole Chrome.app bundle that Chrome on macOS makes in $TMPDIR/../X at launch and deletes only on a
# clean exit, which a hard-killed Chrome never has (456 then, 1,430 on 19 Oct). The feature switch
# below stops the clone being made: measured, a launch without it leaves one and a launch with it
# none. So the profile and the socket directory go on EVERY exit: a pass, a FAIL, the wall-clock
# cap, Ctrl-C or a killed gate.sh. Only a SIGKILL of this script escapes, and the next run of the
# same leg clears that profile before it starts, as it always has.
# The pattern ends at the argument, so leg colswap never matches leg colswapgate's Chrome.
PROFILE_RE="user-data-dir=$PROFILE( |\$)"
CPID=""; SPID=""
cleanup() {
  [[ -n $CPID ]] && kill -9 $CPID 2>/dev/null
  pkill -9 -f "$PROFILE_RE" 2>/dev/null
  # Wait for every Chrome process of this profile to be gone, so none can write into it mid-delete.
  local i sock; local -a held rest
  for i in {1..20}; do pgrep -f "$PROFILE_RE" >/dev/null || break; sleep 0.25; done
  sock=$(readlink "$PROFILE/SingletonSocket" 2>/dev/null)
  # Chrome made that directory for the socket (and a SingletonCookie symlink beside it); delete it
  # only while it holds nothing else. (DN): dotfiles too, and no match is no error.
  if [[ -n $sock ]]; then
    held=( "${sock:h}"/*(DN:t) ); rest=( ${held:#Singleton(Socket|Cookie)} )
    (( ${#held} && ! ${#rest} )) && rm -rf -- "${sock:h}"
  fi
  rm -rf -- "$PROFILE"
  [[ -n $SPID ]] && kill $SPID 2>/dev/null
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

# A stale server on this port silently serves the OLD index.html and the run looks like a
# regression that isn't one. Always clear it first.
pkill -f "srv.js $PORT " 2>/dev/null
sleep 0.5
node "$HERE/srv.js" "$PORT" "$ROOT" "$HERE/t" > /dev/null 2>&1 &
SPID=$!
sleep 1.5
curl -sf -o /dev/null "http://localhost:$PORT$PAGE" || { echo "server did not start on $PORT"; exit 1; }

# Clear this test's previous output BEFORE running. Otherwise a run that dies without writing a
# result leaves the last run's <name>.json sitting there, and reading it looks like a pass.
OUT="$HERE/$T.html"
PDF_OUT="$HERE/$T.print.pdf"
rm -f "$OUT" "$HERE/$T.json" "$HERE/$T.xlsx" "$HERE/$T.pdf" "$HERE/$T.sptcal" "$PDF_OUT"
# ...and a leg's per-document PDFs (parse.js's `pdfs` map: <test>.<name>.pdf), for the same reason. (N) is zsh's
# null glob: no match is no error.
rm -f -- "$HERE/$T".*.pdf(N)
PDF_FLAGS=()
[[ -n "${HARNESS_PRINT_PDF:-}" ]] && PDF_FLAGS=(--no-pdf-header-footer "--print-to-pdf=$PDF_OUT")

# A unique user-data-dir per test, or two runs share a profile and a stale one poisons the next.
rm -rf "$PROFILE"
# HARNESS_WINDOW=<w>,<h> changes the window (default 1600,1200): monthemit's determinism control runs the same
# leg at another size and requires the same bytes. HARNESS_QUERY=<k=v&...> is appended to the page's query, for a
# leg that reads its own parameters (monthemit's `src=`, which the step-3 mutant runs use).
"$CHROME" --headless=new --disable-gpu --no-sandbox --disable-features=MacAppCodeSignClone \
  --user-data-dir="$PROFILE" --window-size="${HARNESS_WINDOW:-1600,1200}" \
  --virtual-time-budget=$((SECS * 1000)) "${PDF_FLAGS[@]}" \
  --dump-dom "http://localhost:$PORT$PAGE?test=$T$STATE_Q${HARNESS_QUERY:+&$HARNESS_QUERY}" > "$OUT" 2>/dev/null &
CPID=$!

# ⛔ POLL-AND-KILL, NOT A WALL-CLOCK TIMER (22 Sep 2026). This loop used to be
#     for i in $(seq 1 $SECS); do sleep 1; kill -0 $CPID || break; done; kill -9 $CPID
# which treated the VIRTUAL time budget as a WALL-CLOCK deadline. They are different clocks:
# Chrome fast-forwards virtual time through idle stretches but pays real time for real work, so on
# a loaded machine -- 28 legs back to back, a system that had just slept -- the budget runs out
# LATER than $SECS real seconds, and the old loop killed Chrome before it had written a byte. The
# leg then reported "produced no result" on a 0-byte dump, which reads as a PRODUCT failure. Three
# different legs (rowmigrate, hdrtemplate, stintreshape) did exactly that in one session, each
# passing standalone. And because Chrome does not exit after --dump-dom, the same loop made every
# leg wait out its full budget even when the dump had landed in a few seconds.
#
# So wait for the THING, not for a duration: the dump is done when the file ends in </html> and
# its size has held still across two polls -- the same shape that took tools/make-icon.py from a
# 120 s timeout to 2.1 s. ⚠️ The </html> test is what matters: the app bundle itself contains
# '</html>' string literals, so a size check alone could stop on a mid-write pause, and a tail
# check alone could stop on a chunk boundary inside a script. Both together cannot.
typeset -F SECONDS
CAP=$(( SECS * 3 + 30 )); T0=$SECONDS; WHY="cap"
last=-1; steady=0; plast=-1; psteady=0
while (( SECONDS - T0 < CAP )); do
  sleep 0.5
  kill -0 $CPID 2>/dev/null || { WHY="exited"; break; }
  size=$(stat -f %z "$OUT" 2>/dev/null || print -- -1)
  if (( size > 0 && size == last )) && [[ "$(tail -c 32 "$OUT")" == *'</html>' ]]; then
    (( steady++ ))
  else
    steady=0
  fi
  last=$size
  if (( ${#PDF_FLAGS} )); then
    psize=$(stat -f %z "$PDF_OUT" 2>/dev/null || print -- -1)
    if (( psize > 0 && psize == plast )) && [[ "$(tail -c 32 "$PDF_OUT")" == *'%%EOF'* ]]; then
      (( psteady++ ))
    else
      psteady=0
    fi
    plast=$psize
  fi
  if (( steady >= 2 )) && { (( ! ${#PDF_FLAGS} )) || (( psteady >= 2 )); }; then WHY="dumped"; break; fi
done
kill -9 $CPID 2>/dev/null
pkill -9 -f "$PROFILE_RE" 2>/dev/null
# stderr, so stdout stays exactly parse.js's output.
if [[ $WHY == cap ]]; then
  print -u2 -r -- "run.sh: $T: no complete dump after ${CAP}s wall-clock -- Chrome killed (virtual budget ${SECS}s)"
else
  printf 'run.sh: %s: %s after %.1fs wall-clock (virtual budget %ss)\n' "$T" "$WHY" $(( SECONDS - T0 )) "$SECS" >&2
fi
sleep 1

node "$HERE/parse.js" "$HERE/$T.html" "$HERE/$T"
RC=$?
exit $RC   # cleanup (the EXIT trap) stops the server and deletes the profile
