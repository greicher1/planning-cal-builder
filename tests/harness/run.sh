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
rm -f "$HERE/$T.html" "$HERE/$T.json" "$HERE/$T.xlsx" "$HERE/$T.pdf" "$HERE/$T.sptcal"

# A unique user-data-dir per test, or two runs share a profile and a stale one poisons the next.
rm -rf "/tmp/tc-$T"
"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --user-data-dir="/tmp/tc-$T" --window-size=1600,1200 \
  --virtual-time-budget=$((SECS * 1000)) \
  --dump-dom "http://localhost:$PORT$PAGE?test=$T" > "$HERE/$T.html" 2>/dev/null &
CPID=$!
for i in $(seq 1 $SECS); do sleep 1; kill -0 $CPID 2>/dev/null || break; done
kill -9 $CPID 2>/dev/null
pkill -9 -f "user-data-dir=/tmp/tc-$T" 2>/dev/null
sleep 1

node "$HERE/parse.js" "$HERE/$T.html" "$HERE/$T"
RC=$?
kill $SPID 2>/dev/null
exit $RC
