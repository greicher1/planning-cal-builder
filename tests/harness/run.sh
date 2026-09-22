#!/bin/zsh
# Run one harness test end to end.
#
#   ./run.sh <test-name> [seconds]        e.g.  ./run.sh base 45
#
# Starts the server, runs headless Chrome against index.html?test=<name>, kills Chrome, parses the
# result, stops the server. Output lands beside this script as <test-name>.json (plus .xlsx/.pdf
# when the test captured an export).
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

# A stale server on this port silently serves the OLD index.html and the run looks like a
# regression that isn't one. Always clear it first.
pkill -f "srv.js $PORT " 2>/dev/null
sleep 0.5
node "$HERE/srv.js" "$PORT" "$ROOT" "$HERE/t" > /dev/null 2>&1 &
SPID=$!
sleep 1.5
curl -sf -o /dev/null "http://localhost:$PORT$PAGE" || { echo "server did not start on $PORT"; kill $SPID 2>/dev/null; exit 1; }

# Clear this test's previous output BEFORE running. Otherwise a run that dies without writing a
# result leaves the last run's <name>.json sitting there, and reading it looks like a pass.
OUT="$HERE/$T.html"
PDF_OUT="$HERE/$T.print.pdf"
rm -f "$OUT" "$HERE/$T.json" "$HERE/$T.xlsx" "$HERE/$T.pdf" "$HERE/$T.sptcal" "$PDF_OUT"
PDF_FLAGS=()
[[ -n "${HARNESS_PRINT_PDF:-}" ]] && PDF_FLAGS=(--no-pdf-header-footer "--print-to-pdf=$PDF_OUT")

# A unique user-data-dir per test, or two runs share a profile and a stale one poisons the next.
rm -rf "/tmp/tc-$T"
"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --user-data-dir="/tmp/tc-$T" --window-size=1600,1200 \
  --virtual-time-budget=$((SECS * 1000)) "${PDF_FLAGS[@]}" \
  --dump-dom "http://localhost:$PORT$PAGE?test=$T$STATE_Q" > "$OUT" 2>/dev/null &
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
pkill -9 -f "user-data-dir=/tmp/tc-$T" 2>/dev/null
# stderr, so stdout stays exactly parse.js's output.
if [[ $WHY == cap ]]; then
  print -u2 -r -- "run.sh: $T: no complete dump after ${CAP}s wall-clock -- Chrome killed (virtual budget ${SECS}s)"
else
  printf 'run.sh: %s: %s after %.1fs wall-clock (virtual budget %ss)\n' "$T" "$WHY" $(( SECONDS - T0 )) "$SECS" >&2
fi
sleep 1

node "$HERE/parse.js" "$HERE/$T.html" "$HERE/$T"
RC=$?
kill $SPID 2>/dev/null
exit $RC
