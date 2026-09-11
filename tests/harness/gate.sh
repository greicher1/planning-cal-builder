#!/bin/zsh
# gate.sh -- the acceptance gate, in one command.
#
#   ./gate.sh                 # gate the Vite build at /dist/index.html (the normal case)
#   ./gate.sh /index.html     # gate the deployed single-file app instead
#
# UI-CONVENTIONS.md §10 lists eight gates that every Mantine stage must pass. This runs the ones
# that are automatable and diffs them against tests/baselines/2026-08-29-stage-7/:
#
#   1. horizontally clipped cells stay 0        (the padding trap, which has landed twice)
#   2. the waterfall PDF diffs clean            (byte-compare)
#   3. the Excel opens without a corrupt alert  (check-xlsx.sh) AND its parts are unchanged
#   4. a real v1.0.0 saved calendar restores identically
#   5. fields.byId's key SET is unchanged       (the save-format contract -- gate 5)
#
# ⚠️ Gate 7 (computed styles inside #table-wrap -- fence.js) is NOT run here, and never was: an
# earlier revision of this comment listed it, which read as coverage that did not exist. There is
# no committed fence baseline. Run it by hand around any CSS-touching change:
#   ./run.sh fence 40                                      (against /index.html)
#   HARNESS_PAGE=/dist/index.html ./run.sh fence 40        (against the build)
# and diff the two fence.json's yourself -- the frozen /waterfall/* entries must be identical.
#
# ✅ THE DATE-PINNING FALSE-FAIL IS FIXED (round 7). The baseline embeds the date it was cut
# (2026-08-29) and both artefacts carry todayStr, so gates 2 and 3 used to report FALSE failures on
# every later day against untouched code -- documented, and therefore ignored, which made the two
# comparisons that actually prove the frozen writers have not moved permanently useless. Both now
# compare with ONLY that one token normalised: pdfcmp.py substitutes the dotted M.D.YY stamp in
# each file's content streams and byte-compares the rest, and the workbook's sheet1.xml gets the
# same single substitution. Calendar CONTENT renders dates with slashes, so real printed dates are
# still compared strictly. A FAIL here is now a real FAIL -- treat it as one.
#
# ⚠️ On (3): comparing the .xlsx BYTES is wrong and will report a false failure. ExcelJS stamps
# dcterms:created / dcterms:modified into docProps/core.xml, so two exports of an identical
# workbook taken minutes apart differ -- observed as a 1-byte length change, which reads exactly
# like a real regression. Compare the unzipped parts with core.xml excluded.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
BASE="$HERE/../baselines/2026-08-29-stage-7"
PAGE="${1:-/dist/index.html}"

# ⛔ THE BUILD IS NOT REBUILT BY THIS SCRIPT, AND A STALE ONE PASSES SILENTLY.
# gate.sh serves dist/index.html; `npm run build` is a separate step nobody is reminded to run. Edit
# src/legacy/app.js, run the gate, and it gates YESTERDAY'S BUILD and says GATE PASSED -- the worst
# possible failure mode, because the green is the thing you were trying to earn. Same family as the
# run.sh/gate.sh default-page trap in CLAUDE.md: the harness tests a different program than you think.
# Refuse rather than warn: a warning scrolls past 200 lines of PASS.
if [[ "$PAGE" == "/dist/index.html" ]]; then
  REPO="$(cd "$HERE/../.." && pwd)"
  DIST="$REPO/dist/index.html"
  if [[ ! -f "$DIST" ]]; then
    print -r -- "gate.sh: dist/index.html does not exist. Run: npm run build" >&2
    exit 2
  fi
  # -nt is a zsh builtin and needs no `find`; check every source the build inlines.
  for SRCF in "$REPO"/src/**/*.(js|jsx|css|html)(N) "$REPO"/vite.config.js(N) "$REPO"/package.json(N); do
    [[ -f "$SRCF" ]] || continue
    if [[ "$SRCF" -nt "$DIST" ]]; then
      print -r -- "gate.sh: dist/index.html is OLDER than ${SRCF#$REPO/} -- you would be gating a stale build." >&2
      print -r -- "         Run: npm run build" >&2
      exit 2
    fi
  done
fi
FAIL=0
say() { print -r -- "$@" }
ok()  { say "  PASS  $1" }
bad() { say "  FAIL  $1"; FAIL=1 }

say "=== gate: $PAGE ==="

# ---- base: grid geometry, clipping, both exports ---------------------------------------------
HARNESS_PAGE="$PAGE" "$HERE/run.sh" base 45 >/dev/null 2>&1
if [[ ! -f "$HERE/base.json" ]]; then bad "base test produced no result"; else
python3 - "$HERE/base.json" "$BASE/base.json" <<'PY' || FAIL=1
import json,sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2])); bad=0
def chk(cond,msg):
    global bad
    print(('  PASS  ' if cond else '  FAIL  ')+msg)
    if not cond: bad=1
chk(a.get('hClipCount')==0, f"horizontally clipped cells = {a.get('hClipCount')} (must be 0)")
for k in ['gridWidthPt','rows','vClipCount','holidaysTurnedOn']:
    chk(a.get(k)==b.get(k), f"{k} = {a.get(k)} (baseline {b.get(k)})")
for k in ['sig','headers','cols','noteCells','hClip','vClip']:
    chk(a.get(k)==b.get(k), f"{k} identical to baseline")
errs=(a.get('health') or {}).get('errors') or []
chk(not errs, f"no console errors/warnings ({len(errs)} found){': '+str(errs[:3]) if errs else ''}")
sys.exit(bad)
PY
fi

# ---- the waterfall PDF, byte for byte ---------------------------------------------------------
# TODAY / BASEDATE are the only tokens allowed to differ -- see pdfcmp.py's header.
TODAY="$(date +%-m.%-d.%y)"; BASEDATE="8.29.26"
if cmp -s "$HERE/base.pdf" "$BASE/base.pdf"; then ok "waterfall PDF byte-identical to baseline"
elif PDFOUT="$(python3 "$HERE/pdfcmp.py" "$HERE/base.pdf" "$BASE/base.pdf" --today "$TODAY" --base "$BASEDATE" 2>&1)"; then
  ok "waterfall PDF identical to baseline (header date stamp $BASEDATE -> $TODAY)"
else bad "waterfall PDF differs beyond the date stamp: $(print -r -- "$PDFOUT" | head -4)"; fi

# ---- the workbook: valid, and unchanged apart from its timestamp -------------------------------
if "$HERE/check-xlsx.sh" "$HERE/base.xlsx" >/dev/null 2>&1; then ok "Excel passes check-xlsx.sh"
else bad "Excel fails check-xlsx.sh"; fi
rm -rf /tmp/gate-xa /tmp/gate-xb; mkdir -p /tmp/gate-xa /tmp/gate-xb
(cd /tmp/gate-xa && unzip -qo "$HERE/base.xlsx") 2>/dev/null
(cd /tmp/gate-xb && unzip -qo "$BASE/base.xlsx") 2>/dev/null
rm -f /tmp/gate-xa/docProps/core.xml /tmp/gate-xb/docProps/core.xml
# The header's left line carries todayStr in the same dotted form -- normalise that token only.
for f in /tmp/gate-xa/xl/worksheets/sheet1.xml; do [ -f "$f" ] && sed -i '' "s/$TODAY/DATESTAMP/g" "$f"; done
for f in /tmp/gate-xb/xl/worksheets/sheet1.xml; do [ -f "$f" ] && sed -i '' "s/$BASEDATE/DATESTAMP/g" "$f"; done
if diff -rq /tmp/gate-xa /tmp/gate-xb >/dev/null 2>&1; then ok "Excel parts identical (core.xml timestamp + header date excluded)"
else bad "Excel parts differ: $(diff -rq /tmp/gate-xa /tmp/gate-xb | head -3)"; fi

# ---- restore: a real pre-.sptcal calendar still opens ------------------------------------------
# ⭐ THIS LEG RUNS AGAIN AS OF 8 Sep 2026, and gate 5 with it. It had been failing 100% of the time,
# not one run in three: appReady() waited for renderRecents() to reveal the file menu, and
# indexedDB.open() NEVER settles in headless Chrome under --virtual-time-budget (t/fsprobe.js
# measures it, identically on the untouched deployed page). The stall is real and unfixed -- but it
# never blocked the Open path itself, only the probe that waited on it: #file-menu is keepMounted,
# so the Open... item is in the DOM and clickable while the wrap is still display:none, and the
# engine's delegated listener is bound to #file-menu. appReady() now waits on engine-generated
# sidebar markup instead, which needs no IndexedDB.
# ⚠️ The retry below is kept. The stall it was written for is gone, but a retry costs 60s only when
# something has already failed, and this is the only test of the real Open path there is.
for attempt in 1 2; do
  HARNESS_PAGE="$PAGE" "$HERE/run.sh" restore 60 >/dev/null 2>&1
  python3 -c "import json,sys; d=json.load(open('$HERE/restore.json')); sys.exit(1 if 'EX' in d else 0)" 2>/dev/null && break
  [[ $attempt == 2 ]] && say "  note  restore retried once (IndexedDB stall)"
done
python3 - "$HERE/restore.json" "$BASE/restore.json" <<'PY' || FAIL=1
import json,sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2])); bad=0
def chk(cond,msg):
    global bad
    print(('  PASS  ' if cond else '  FAIL  ')+msg)
    if not cond: bad=1
if 'EX' in a:
    print('  FAIL  restore threw: '+str(a['EX'])); sys.exit(1)
for k in ['rows','cells','gridWidthPt','bytes']:
    chk(a.get(k)==b.get(k), f"restore {k} = {a.get(k)} (baseline {b.get(k)})")
chk(a.get('hClip')==0, f"restore horizontally clipped = {a.get('hClip')} (must be 0)")
chk(a.get('sig')==b.get('sig'), "restored grid signature identical")
# Gate 5: the SAVE FORMAT contract. fields.byId is keyed by DOM element id, so the key SET is the
# thing that must not move -- not merely that the values resolve. formSignature() reports it.
# ⚠️ IT DID NOT, until 8 Sep 2026, and this comment asserted that it did. formSignature() was a raw
# input[id]/select[id]/textarea[id] sweep with none of collectFieldValues()'s exclusions, so it
# reported a SUPERSET: the eight transient tool-* ids, and pref-gridlines -- a per-user PREFERENCE
# that must never enter a saved file and would have shown up here as a format change. It now carries
# the same two .closest() skips the engine has, and its 55 keys were checked against a real
# .sptcal's fields.byId in both directions. See the baseline's README for the re-cut.
fa, fb = a.get('form'), b.get('form')
chk(fa==fb, f"fields.byId key set identical ({len(fa or [])} ids)")
# form is a DICT ({id: value}), so equality above is keys AND values. The detail print below used
# to be guarded by isinstance(..., list) and therefore never fired -- a failure printed no ids at
# all, which under pressure invites misattributing which ids moved.
if fa!=fb and isinstance(fa,dict) and isinstance(fb,dict):
    print('        lost:   ', sorted(set(fb)-set(fa))[:12])
    print('        gained: ', sorted(set(fa)-set(fb))[:12])
    print('        changed:', sorted(k for k in set(fa)&set(fb) if fa[k]!=fb[k])[:12])
sys.exit(bad)
PY

# ---- colswap: the grid COLUMN-ORDER reconciler, end to end through a real restore path ----------
# Driven by HARNESS_STATE, which substitutes a fixture into the page's own <script id="saved-state">
# block -- the shareable-copy path, so this leg needs no debug hook and, deliberately, no IndexedDB
# (that is what makes it reliable here while the `restore` leg above is not).
# It proves the PLUMBING: the store survives restore, swapPairsForWeek honours a mutual pair, the
# swapped weeks transpose, the unswapped weeks keep their position, every cell is still present
# exactly once, and the colgroup key set -- which hand-dragged colWidths are stored against -- does
# not move. The invariance THEOREM is proved separately and far more strongly by
# `node tests/harness/prove-col-permutation.mjs`, which fuzzes the real computeBlockLayout source.
HARNESS_PAGE="$PAGE" HARNESS_STATE=colswap-2col "$HERE/run.sh" colswap 45 >/dev/null 2>&1
python3 - "$HERE/colswap.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  colswap produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  colswap threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('swappedWeeks')==4 and not a.get('swapFailures'),
    f"colswap: 4 overlap weeks transposed (failures: {a.get('swapFailures')})")
chk(a.get('unswappedPositionsOk'), "colswap: unswapped weeks kept their phase and slot")
# Collateral is EXPECTED here and is reported, not failed: applying the swap ends prodPrep's slot-0
# run early, so the two weeks above it newly auto-span. Owner ruling D2 caps that at magnitude 1.
chk(a.get('collateralWithinCap'), f"colswap: collateral within the magnitude-1 cap {a.get('collateral')}")
chk(a.get('cellCountsOk'), f"colswap: no cell dropped or duplicated {a.get('cellCounts')}")
chk(a.get('colKeysOk'), f"colswap: colgroup key set unmoved ({a.get('colKeys')})")
chk(a.get('phaseColsEqualWidth'), "colswap: phase columns still share one width")
chk(not a.get('errors'), f"colswap: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"colswap: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- colswapgate: the gate REFUSES a swap it must refuse, and says so ---------------------------
# The leg above proves a legal swap applies; this proves the half that protects the calendar. The
# fixture stores a Production<->Post swap with Simultaneous Post on, which would re-flow weeks the
# user never selected -- so it must be declined, the store must survive (suppressed, not deleted),
# and the refusal must be VISIBLE with a reason.
HARNESS_PAGE="$PAGE" HARNESS_STATE=colswap-simpost-refuse "$HERE/run.sh" colswapgate 45 >/dev/null 2>&1
python3 - "$HERE/colswapgate.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  colswapgate produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  colswapgate threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('refused'), f"gate: the unsafe swap was refused {a.get('overlapWeeks')}")
chk(a.get('noticeShown') and a.get('noticeNamesReason'),
    f"gate: refusal is visible and gives a reason -- {str(a.get('noticeText'))[:90]}")
# Suppressed, never deleted: a temporary schedule change must not destroy the user's column order.
chk(a.get('storeIntact'), f"gate: store intact after refusal ({a.get('storeKeyCount')} keys)")
chk(not a.get('errors'), f"gate: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"gate: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- colswapmove: the column-order GESTURE, from a fixture with no stored order at all -----------
# The two legs above both START from a store that already exists, so neither exercises the layer
# that decides WHAT would move: the run walk, the whole-run restriction (owner ruling D7) and the
# trial-and-gate verdict. This one meta-clicks ONE cell at real coordinates, waits for the knob (the
# observable proof the verdict came back ok), presses the toolbar button, and requires the WHOLE
# four-week run to move in one step. It then moves it back, which is the only way to prove the
# reverse DELETES the pair rather than storing an identity -- if the entries survived as no-ops the
# reconciler would bring the swap back on the next recompute.
HARNESS_PAGE="$PAGE" HARNESS_STATE=colswap-gesture "$HERE/run.sh" colswapmove 45 >/dev/null 2>&1
python3 - "$HERE/colswapmove.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  colswapmove produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  colswapmove threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('naturalOrder') and a.get('aboveNarrowBefore'),
    f"move: pre-state is the natural start order {a.get('before')}")
chk(a.get('labelNamesBoth') and a.get('labelNamesRun'),
    f"move: the knob names both phases and the whole run -- {a.get('knobLabel')}")
chk(a.get('noRightKnob'), "move: no knob offered where there is no partner")
chk(a.get('rightNoOp') and a.get('chipExplains'),
    f"move: the unavailable direction moves nothing and says why -- {str(a.get('chipText'))[:80]}")
chk(a.get('wholeRunMoved'), f"move: one gesture moved the whole 4-week run {a.get('movedWeeks')}/4")
chk(a.get('aboveKeptSlot'), "move: unselected weeks kept their phase and slot")
chk(a.get('aboveWidened') and a.get('confirmReportsCollateral'),
    f"move: magnitude-1 collateral applied AND reported -- {str(a.get('confirmText'))[:80]}")
chk(a.get('knobFollowed'), "move: the affordance followed the move")
chk(a.get('reverseRestoredExactly'), f"move: moving back deleted the pair {a.get('afterReverse')}")
chk(not a.get('errors'), f"move: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"move: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- colswapmid: a swap where NEITHER phase's whole run is inside the overlap -------------------
# The ordinary shape of two phases that merely overlap -- each sticks out beyond the other -- which
# Phase 1 (D7) refused outright, and which a count-based collateral rule then refused a second time.
# Both restrictions were lifted 1 Sep 2026 on the owner's instruction. The fixture is deliberately
# the case a count rule rejects: 6 weeks move and 12 weeks widen, every one by exactly ONE column,
# which is what D2 sanctioned. If this leg starts failing with "it would re-flow", someone has
# reinstated the count rule; if it fails with "whole run", someone has re-enabled SWAP_WHOLE_RUN_ONLY.
HARNESS_PAGE="$PAGE" HARNESS_STATE=colswap-midoverlap "$HERE/run.sh" colswapmid 45 >/dev/null 2>&1
python3 - "$HERE/colswapmid.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  colswapmid produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  colswapmid threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('neitherSideWhole'),
    f"mid: neither phase's run is confined to the overlap ({a.get('wrWeeks')} and {a.get('ppWeeks')} weeks, 6 shared)")
chk(a.get('naturalOrder') and a.get('tailsNarrowBefore'),
    "mid: pre-state is natural order, and both tails are held to one column")
chk(a.get('labelNamesOverlap'), f"mid: the run is the shared stretch -- {a.get('knobLabel')}")
chk(a.get('wholeOverlapMoved'), f"mid: one gesture moved all 6 shared weeks ({a.get('movedWeeks')}/6)")
chk(a.get('wrTailWidened') and a.get('ppTailWidened'),
    "mid: both 6-week tails kept their slot and widened by exactly one column")
chk(a.get('chipReportsTwelve'),
    f"mid: 12 collateral weeks allowed AND reported -- {str(a.get('chipText'))[:80]}")
chk(not a.get('errors'), f"mid: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"mid: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- colswapstale: a STALE cell-width override must not block a swap, and must not be reported ----
# Owner bug report 1 Sep 2026: "it's saying to clear the hand-set width but the column was not hand
# set." Both halves were true. frozen applyCellSpanOverrides deliberately KEEPS an override the
# schedule has moved under, so a claim written while a week still had a free column beside it lives on
# invisibly once another phase moves in -- and BOTH features read the store rather than its effect.
# The fixture carries two claims on overlap weeks where the phase has no room at all.
HARNESS_PAGE="$PAGE" HARNESS_STATE=colswap-stalespan "$HERE/run.sh" colswapstale 45 >/dev/null 2>&1
python3 - "$HERE/colswapstale.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  colswapstale produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  colswapstale threw: '+str(a['EX'])); sys.exit(1)
# If the fixture ever stops being inert this leg silently stops testing anything, so assert it first.
chk(a.get('fixtureHasClaims'), f"stale: the fixture really carries the claims {a.get('storedClaims')}")
chk(a.get('claimsAreInert'), f"stale: every claimed cell still renders one column wide {a.get('claimedCells')}")
chk(a.get('knobOffered') and a.get('noWidthComplaint'),
    "stale: the swap is offered, with no 'hand-set width' complaint")
chk(a.get('selChipHonest'), f"stale: no phantom 'pull back' offer -- {a.get('selChipText')}")
chk(a.get('swapApplied'), f"stale: the swap applied over the claims ({a.get('movedWeeks')}/4 weeks)")
# Refusing was wrong; deleting or mirroring would be worse. cellSpans is persisted and the fill has
# to come back if the schedule moves back, so nothing may have written to the store.
chk(a.get('claimedStillInert'), "stale: the claims survived untouched")
chk(not a.get('errors'), f"stale: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"stale: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- stintswap: a STINT swap moves only the two stints named, even on shared columns -------------
# Load-bearing claim of COLUMN-ORDER-PLAN.md section 2.1. A stint = a phase's weeks in ONE year block
# (the UI calls it a block). The fixture shares BOTH columns -- slot 0 is Writer's Rm then
# Localization, slot 1 is Pre Prep then Post -- and swaps Writer's Rm <-> Pre Prep only.
# ⛔ The assertion that matters is that Localization and Post DO NOT MOVE. An earlier draft of the
# plan recommended exchanging whole COLUMNS, which would have moved them; the owner rejected that and
# was right. If this leg starts failing on bystanders, someone has gone back to a column permutation.
HARNESS_PAGE="$PAGE" HARNESS_STATE=stintswap-shared "$HERE/run.sh" stintswap 45 >/dev/null 2>&1
python3 - "$HERE/stintswap.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  stintswap produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  stintswap threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('swappedPair'), f"stint: the two named stints traded places {a.get('slots')}")
chk(a.get('bystandersUnmoved'), "stint: the stints sharing those columns did NOT move")
chk(a.get('noReflow'), f"stint: nothing changed shape {a.get('spans')}")
chk(a.get('mcUnchanged'), f"stint: the year still needs two phase columns ({a.get('colKeys')})")
chk(a.get('weekCountsOk'), f"stint: no cell lost or duplicated {a.get('weeks')}")
chk(not a.get('errors'), f"stint: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"stint: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- stintnoreflow: the whole reason the feature exists ------------------------------------------
# Same fixture as `colswapmove`, where the PER-WEEK swap widens 11/2 and 11/9 from one column to two.
# A stint swap must reflow nothing: it moves the phase's ENTIRE run in the block, so the run is never
# split and frozen freeForRun never grants the widen. The solo weeks travel WITH the block and stay
# one column wide -- which is also the "narrow band on the right" layout an earlier session wrongly
# told the owner was unreachable.
HARNESS_PAGE="$PAGE" HARNESS_STATE=stintswap-noreflow "$HERE/run.sh" stintnoreflow 45 >/dev/null 2>&1
python3 - "$HERE/stintnoreflow.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  stintnoreflow produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  stintnoreflow threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('swapped'), f"noreflow: the four shared weeks traded places {a.get('overlap')}")
chk(a.get('soloMovedAndNarrow'),
    f"noreflow: solo weeks travelled with the block and stayed narrow {a.get('solo')}")
chk(a.get('everyPhaseCellOneWide'), "noreflow: not one cell in the grid changed shape")
chk(a.get('mcUnchanged'), f"noreflow: column count unchanged ({a.get('colKeys')})")
chk(not a.get('errors'), f"noreflow: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"noreflow: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- stintcollide: a stint pair that would LOSE A CELL must be refused, not half-applied ---------
# The column beside a long stint can host SEVERAL short stints inside its run -- segCol's minCol only
# requires being right of phases still RUNNING, so a phase holding column 0 for 20 weeks keeps minCol
# at 1 while Post and Localization take turns in column 1. Exchange with only one of them and your
# stint lands in a column the other still holds: two cells claim one column in the same week, frozen
# bySlot[] keeps one, and the other's weeks vanish from the grid AND both exports.
# MEASURED with the guard disabled: a 20-week phase rendered 16 weeks, silently, no error.
HARNESS_PAGE="$PAGE" HARNESS_STATE=stintswap-collide "$HERE/run.sh" stintcollide 45 >/dev/null 2>&1
python3 - "$HERE/stintcollide.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  stintcollide produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  stintcollide threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('noCellLost'), f"collide: not one week lost {a.get('weekCounts')}")
chk(a.get('refusedNotApplied'), f"collide: refused outright, natural order stands {a.get('slots')}")
chk(a.get('colKeysOk'), f"collide: two phase columns still ({a.get('colKeys')})")
chk(not a.get('errors'), f"collide: 0 console errors {a.get('errors')}")
sys.exit(bad)
PY

# ---- stintgroup: E1 complete -- a stint swap against a column with SEVERAL stints exchanges with ALL ----
# Same schedule as stintcollide, store naming the whole group (Writer's Rm <-> Post AND Localization).
# The reconciler reads the `with` relation as a graph: one connected component over two columns is one
# exchange. Expected: Writer's Rm at slot 1 for all 20 weeks, both short stints at slot 0, every cell
# present, nothing wider. stintcollide keeps proving that naming only ONE of them is still refused.
HARNESS_PAGE="$PAGE" HARNESS_STATE=stintswap-group "$HERE/run.sh" stintgroup 45 >/dev/null 2>&1
python3 - "$HERE/stintgroup.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  stintgroup produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  stintgroup threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('noCellLost'), f"group: not one week lost {a.get('weekCounts')}")
chk(a.get('groupApplied'), f"group: the whole group traded columns {a.get('slots')}")
chk(a.get('noReflow'), f"group: nothing changed shape {a.get('spans')}")
chk(a.get('colKeysOk'), f"group: two phase columns still ({a.get('colKeys')})")
chk(not a.get('errors'), f"group: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"group: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- stintoneside: a hand-edited ONE-SIDED stint entry yields no reorder, never a wrong one -------------
# COLUMN-ORDER-PLAN.md section 6 item 6. `2026|writersRoom -> prePrep` with nothing pointing back: the
# named stint has no entry of its own, so the block gets NO order at all -- natural start order stands.
HARNESS_PAGE="$PAGE" HARNESS_STATE=stintswap-onesided "$HERE/run.sh" stintoneside 45 >/dev/null 2>&1
python3 - "$HERE/stintoneside.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  stintoneside produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  stintoneside threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('naturalOrder'), f"oneside: natural order stands {a.get('slots')}")
chk(a.get('noCellLost'), f"oneside: every cell present {a.get('weeks')}")
chk(a.get('colKeysOk'), f"oneside: two phase columns still ({a.get('colKeys')})")
chk(not a.get('errors'), f"oneside: 0 console errors {a.get('errors')}")
sys.exit(bad)
PY

# ---- stintbtn: the "Swap Block" hover button and the mode inference, through the real user path --------
# COLUMN-ORDER-PLAN.md sections 2.2 and 6 item 5, on the owner's screenshot shape with NO order stored.
# Hover a middle week -> the button appears on the block's FIRST week, survives travel across the
# block, re-anchors on another phase, disappears off the phases. Click -> every cell selected as ONE
# outline (E3), the chip states the BLOCK mode and the partner BEFORE commit, the toolbar moves all six
# weeks and NOT ONE changes width (contrast colswapmove, where the per-week swap widens two). Then a
# partial selection resolves back to the per-week mode and the chip says so. A one-column block gets
# no button at all.
HARNESS_PAGE="$PAGE" HARNESS_STATE=colswap-gesture "$HERE/run.sh" stintbtn 60 >/dev/null 2>&1
python3 - "$HERE/stintbtn.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  stintbtn produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  stintbtn threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('naturalNarrow'), "btn: pre-state is the natural order, Prod Prep held to one column")
chk(a.get('btnText')=='Swap Block' and a.get('btnPhase')=='prodPrep/2026', f"btn: the button says Swap Block for the hovered block ({a.get('btnText')}, {a.get('btnPhase')})")
chk(a.get('btnOnFirstWeek') and a.get('btnInsideCell'), "btn: anchored to the block's FIRST week, inside the cell")
chk(a.get('btnSurvivedTravel'), "btn: survives the pointer travelling across the block toward it")
chk(a.get('btnFollowsPhase') and a.get('btnGoneOffPhase'), "btn: re-anchors on another phase, gone off the phases")
chk(a.get('outlines')==1, f"btn: the whole block is drawn as ONE outline ({a.get('outlines')})")
chk(a.get('modeSaysBlock') and a.get('knobSaysBlock'), f"btn: the chip states the BLOCK mode and the partner before commit -- {str(a.get('modeText'))[:90]}")
chk(a.get('noLeftKnob'), "btn: no knob offered where there is no partner")
chk(a.get('wholeBlockMoved') and a.get('noCellWidened'), "btn: all six weeks moved and NOT ONE changed width")
chk(a.get('knobFollowed'), "btn: the affordance followed the move")
chk(a.get('reverseRestoredExactly'), "btn: swapping back deleted the entry and restored the natural layout exactly")
chk(a.get('partialSaysWeek') and a.get('partialOutlines')==2, f"btn: a partial selection resolves to the per-week mode and says so, drawn as two outlines across the gap (E3) -- {str(a.get('partialText'))[:90]}")
chk(a.get('noBtnSingleColumn'), "btn: no button on a block with one phase column")
chk(not a.get('errors'), f"btn: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"btn: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- stintmulti: E1 through the gesture -- several blocks in the neighbouring column, all named, all moved
# The stintcollide schedule with NO order stored. From the long side: the knob and the chip name BOTH
# Post and Localization before commit, the toolbar moves all three, the confirmation names them, and
# swapping back restores the natural layout exactly. From the short side (Post): the chip says
# Localization moves with it, and the result is the same.
HARNESS_PAGE="$PAGE" HARNESS_STATE=stintswap-multi "$HERE/run.sh" stintmulti 60 >/dev/null 2>&1
python3 - "$HERE/stintmulti.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  stintmulti produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  stintmulti threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('naturalOrder'), "multi: pre-state is the natural order, every cell one column wide")
chk(a.get('namesBothA'), f"multi: from the long side, BOTH partners named before commit -- {str(a.get('knobA'))[:90]}")
chk(a.get('groupMovedA'), f"multi: all three blocks traded, nothing lost, nothing wider {a.get('afterA')}")
chk(a.get('flashNamesAllA'), f"multi: the confirmation names every block that moved -- {str(a.get('flashA'))[:90]}")
chk(a.get('reversedA'), "multi: swapping back restored the natural layout exactly")
chk(a.get('namesCompanionB') and a.get('noRightKnobB'), f"multi: from the short side, the companion is named -- {str(a.get('knobB'))[:90]}")
chk(a.get('groupMovedB') and a.get('reversedB'), "multi: the same swap from the short side lands and reverses exactly")
chk(a.get('colKeysOk'), f"multi: two phase columns throughout ({a.get('colKeys')})")
chk(not a.get('errors'), f"multi: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"multi: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- stintexport: the block swap reaches the workbook and the waterfall PDF, with no width change ------
# COLUMN-ORDER-PLAN.md section 6 item 7, by READING THE FILES BACK: the workbook via ExcelJS, the PDF by
# inflating its content stream and pairing every text with its position. The 2/16 row must read
# `Pre Prep | Writer's Rm` in all three, and every screen column width must appear in the PDF at the
# page's fit scale.
HARNESS_PAGE="$PAGE" HARNESS_STATE=stintswap-shared "$HERE/run.sh" stintexport 60 >/dev/null 2>&1
python3 - "$HERE/stintexport.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  stintexport produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  stintexport threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('screenSwapped') and a.get('phaseColsEqual'), f"export: the screen shows the swap, phase columns equal ({a.get('gridWidthPt')} pt)")
chk(a.get('xlsxSwapped') and a.get('xlsxPhaseColsEqual'), f"export: the workbook reads the same order, equal widths {a.get('xlsxRow')}")
chk(a.get('pdfHasContent') and a.get('pdfSwapped'), f"export: the PDF reads the same order {a.get('pdfRow')}")
chk(a.get('pdfWidthMatchesScreen'), f"export: every column width appears in the PDF at scale {a.get('pdfScale')} -- {a.get('pdfColumnsAtScale')}")
chk(not a.get('errors'), f"export: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"export: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- stintchain: a second block swap in a year that already carries one -------------------------
# ⭐ THE OWNER'S OWN CALENDAR (2 Sep 2026), schedule intact, titles genericised -- the first defect
# this feature produced in real use, and it was a FALSE REFUSAL. applyStintSwaps validated each stored
# group over the NATURAL, un-exchanged position of every phase outside it, so in a year that already
# held Post <-> Pre Prep, a Writer's Rm <-> Production swap looked like a collision with a Post that
# the first swap had already moved out of the way. The whole set is now validated together first.
# If this leg fails with "same column in the same week", the isolation test has been reinstated.
HARNESS_PAGE="$PAGE" HARNESS_STATE=stintswap-chained "$HERE/run.sh" stintchain 75 >/dev/null 2>&1
python3 - "$HERE/stintchain.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  stintchain produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  stintchain threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('storedSwapApplied') and a.get('naturalRest'),
    f"chain: the stored Post/Pre Prep swap restored and applied {a.get('before')}")
chk(a.get('offered') and a.get('noCollideMessage'),
    f"chain: the second swap is OFFERED, not refused -- {str(a.get('mode'))[:90]}")
chk(a.get('landed'), f"chain: it lands -- Writer's Rm and Production trade columns {a.get('after')}")
chk(a.get('bystandersUnmoved'), "chain: the pair already swapped in that year did not move")
chk(a.get('nothingLost') and a.get('nothingReshaped'), "chain: no cell lost, nothing changed shape")
chk(a.get('reversedExactly'), f"chain: reversing restores the year exactly {a.get('afterReverse')}")
chk(not a.get('errors'), f"chain: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"chain: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- stintreshape: a block swap CAN reshape, and it must say so in words before the commit ------
# ⭐ THE OWNER'S SECOND CALENDAR, schedule intact, titles genericised -- the counter-example to the
# plan's founding premise. A block swap reflows nothing when the block has TWO phase columns; with
# THREE it can, because moving a block changes WHICH column is beside it and the new one may be free
# for its whole run where the old one was not. Here Writer's Rm (37 wks, slot 0, held narrow by Pre
# Prep in slot 1) lands at slot 1 after the swap, where slot 2 is empty for its entire run -- Prod
# Prep starts after it ends -- so it widens to two columns for 34 weeks.
# Owner ruling 2 Sep 2026: keep offering the swap, warn harder. So this leg asserts the WARNING, not
# the absence of the widening: the phase named, the new width named, the extent named, an amber chip
# and one amber rectangle per affected week, all BEFORE anything is committed.
HARNESS_PAGE="$PAGE" HARNESS_STATE=stintswap-reshape "$HERE/run.sh" stintreshape 75 >/dev/null 2>&1
python3 - "$HERE/stintreshape.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  stintreshape produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  stintreshape threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('threeColumns') and a.get('narrowBefore'),
    f"reshape: three phase columns, Writer's Rm held to one for all 37 weeks {a.get('before')}")
chk(a.get('warnNamesIt'),
    f"reshape: the warning NAMES the phase, the new width and the extent -- {str(a.get('chipText'))[:110]}")
chk(a.get('warnIsAmber'), f"reshape: the chip is the amber warning, not the neutral one ({a.get('chipClass')})")
chk(a.get('amberMatchesCount'), f"reshape: one amber rectangle per affected week before commit ({a.get('amberRects')}/34)")
chk(a.get('swapped') and a.get('widened'), f"reshape: the swap lands and the widening is real {a.get('after')}")
chk(a.get('flashNamesIt'), f"reshape: the confirmation says the same thing -- {str(a.get('flash'))[:110]}")
chk(a.get('nothingLost'), "reshape: reshaping is not cell loss -- every week of both blocks survives")
chk(a.get('reversedExactly'), f"reshape: reversing restores the year exactly {a.get('afterReverse')}")
chk(not a.get('errors'), f"reshape: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"reshape: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- prefs: the user-preference store, and the rule that a preference never reaches a file -----
# First use of localStorage in this app (the crash backup and file handles are IndexedDB), so this
# leg also fixes the SHAPE every later preference will copy: one key, flat JSON, a version field.
# ⭐ The assertion that matters most is `neverTravels`: collectFieldValues() sweeps every id'd input
# in the document, so without the .prefs-card exclusion the control is baked into every saved
# calendar AND adds a phantom undo step per change. It is proved against a real exported copy.
# ⛔ IT IS AN EXPORT SETTING, NOT A VIEW SETTING (owner, 3 Sep 2026: "these gridline settings are
# about the pdf export, thats where it matters, not in the live app view"). So the leg measures the
# PDF by reading the file back, and asserts the live editor is UNCHANGED in both states -- that
# assertion is the regression guard for the ruling. `inertAtBoot` is the other half of the
# byte-identical PDF/Excel compare above: with nothing stored, nothing anywhere changes.
HARNESS_PAGE="$PAGE" "$HERE/run.sh" prefs 120 >/dev/null 2>&1
python3 - "$HERE/prefs.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  prefs produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  prefs threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('inertAtBoot'), f"prefs: inert with nothing stored -- no preference, no interior rules in the PDF ({a.get('pdfNoneInterior')})")
chk(a.get('controlFound') and a.get('insideExcludedCard'),
    "prefs: the control exists and sits inside .prefs-card (the collectFieldValues exclusion)")
chk(a.get('optionValues')=='none,solid,dashed', f"prefs: exactly three options, None the default ({a.get('optionValues')})")
chk(a.get('reachesPdf'), f"prefs: choosing Dashed puts interior rules INTO THE PDF ({a.get('pdfNoneInterior')} -> {a.get('pdfDashedInterior')})")
chk(a.get('reallyDashed'),
    f"prefs: they are really DASHED, and the dash state is reset after every stroke ({a.get('dashOps')} set / {a.get('dashResets')} reset)")
chk(a.get('hasVerticals'), f"prefs: the PDF now draws interior COLUMN rules, which it never did ({a.get('dashedVerticals')} found)")
chk(a.get('solidDistinct'),
    f"prefs: Solid is its own look -- #D4D4D4 and no dash operator ({a.get('pdfSolidInterior')} rules, {a.get('pdfSolidDashOps')} dashes)")
chk(a.get('persisted'), f"prefs: it reached localStorage with a version field {a.get('storedAfter')}")
chk(a.get('neverTravels'),
    f"prefs: ⭐ the preference is ABSENT from a real saved copy (key={a.get('snapHasPrefKey')}, id={a.get('snapHasControlId')}, {a.get('fieldIdCount')} field ids)")
chk(a.get('editorUntouched') and a.get('noBodyClass'),
    f"prefs: ⭐ the LIVE EDITOR is unchanged by the setting -- owner ruling ({a.get('cellAfter')})")
chk(a.get('resetClean'), f"prefs: choosing None removes the key rather than storing it {a.get('storedAfterReset')}")
chk(not a.get('errors'), f"prefs: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"prefs: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- wrapdate: both ends of the header's Principal Photography line are REAL SHOOT DAYS --------
# The line reads "Principal Photography <first shoot day> / Wrap: <last shoot day>". It used to print
# the ENTERED Monday against a computed last shoot day -- one end a calendar guess, the other
# measured -- so whenever that Monday was a union holiday or fell inside a hiatus the header
# contradicted the grid beside it. Measured before the fix: Production entered as 12/21/26, inside
# the default winter hiatus, claimed 12/21 while the grid showed it starting 1/4/27.
# ⚠️ The scenarios read the holiday list and the hiatus rows FROM THE APP, not from a hardcoded list.
# The first version of this probe hardcoded them, got both wrong (it ignored the four DEFAULT_HIATUSES
# and counted Veterans Day, which is US-NY only) and reported the app's CORRECT wrap as a bug.
HARNESS_PAGE="$PAGE" "$HERE/run.sh" wrapdate 120 >/dev/null 2>&1
python3 - "$HERE/wrapdate.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  wrapdate produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  wrapdate threw: '+str(a['EX'])); sys.exit(1)
cases=a.get('cases') or []
chk(len(cases)==5, f"wrap: all five scenarios ran ({len(cases)})")
chk(a.get('allWrapOk'), "wrap: the Wrap date matches an independent day-walk in every scenario")
chk(a.get('allStartOk'), "wrap: the Principal Photography date is the FIRST REAL SHOOT DAY in every scenario")
chk(a.get('hiatusStartCase')=='2027-01-04',
    f"wrap: a start inside the default winter hiatus reports 1/4/27, not the entered 12/21 ({a.get('hiatusStartCase')})")
chk(a.get('holidayStartCase')=='2027-06-01',
    f"wrap: a start on Memorial Day reports 6/1/27, not the holiday itself ({a.get('holidayStartCase')})")
for c in cases:
    if not (c.get('WRAP_OK') and c.get('START_OK')):
        print('        '+c['name']+': '+str(c.get('header'))+'  (first real shoot day '+str(c.get('firstRealShootDay'))+')')
chk(not a.get('errors'), f"wrap: 0 console errors {a.get('errors')}")
sys.exit(bad)
PY

# ---- hdrversion: a version number typed into Show Info reaches the header's bottom-left slot -----
# Owner request, 1 Sep 2026 -- "a version number (lowercase 'v' then a number you input) ... in the
# very bottom left side text box of the header". HEADER-PRESETS-PLAN.md Step 1.
# ⭐ THE ASSERTION THAT MATTERS MOST IS `inert*`, all three of them. The l2 slot was '' before this
# feature, and every calendar ever saved has no version -- so an EMPTY field has to produce exactly
# what it produced before, or the byte-identical PDF/Excel compare above goes red on files nobody
# has touched. versionLabel() returning a bare "v" for an empty field is the way that happens, which
# is why "v" alone and "   " are both asserted to come out empty.
# The other half is that it arrives in all THREE consumers. Screen, Excel and PDF read one source
# (headerLine), so a leg that checked only the screen would not notice the exports disagreeing.
HARNESS_PAGE="$PAGE" "$HERE/run.sh" hdrversion 140 >/dev/null 2>&1
python3 - "$HERE/hdrversion.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  hdrversion produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  hdrversion threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('fieldFound') and a.get('fieldTag')=='INPUT:text',
    f"hdrversion: #show-version is a text input, not a number one -- owner H1 ({a.get('fieldTag')})")
chk(a.get('insideShowInfo') and not a.get('insidePrefsCard'),
    "hdrversion: it sits in Show info and NOT in .prefs-card -- a version is calendar data and must be swept into the file")
chk(a.get('inertScreen'), f"hdrversion: ⭐ empty -> the l2 line is hidden on screen ({a.get('beforeL2')})")
chk(a.get('inertExcel'), f"hdrversion: ⭐ empty -> the workbook's &L is the bare date ({a.get('beforeExcelL')!r})")
chk(a.get('inertPdf'), f"hdrversion: ⭐ empty -> nothing under the date in the PDF's left column ({a.get('beforePdfLeftCol')})")
chk(a.get('bareVInert') and a.get('blankInert'),
    "hdrversion: ⭐ a bare 'v' and a field of spaces are BOTH still no version, not a version called v")
chk(a.get('screenShowsVersion'), f"hdrversion: typing 3 shows v3 on screen, and the slot becomes visible ({a.get('afterL2',{}).get('text')!r})")
chk(a.get('caseNormalised'), f"hdrversion: typing V3 also reads v3 -- one leading v/V stripped ({a.get('upperVText')!r})")
chk(a.get('excelHasVersion'), f"hdrversion: the workbook's &L is <date> then v3 ({a.get('afterExcelL')!r})")
chk(a.get('excelNoFormatCodes'),
    f"hdrversion: no per-line format codes appear -- nothing was formatted ({a.get('excelFontCodes')} font code)")
chk(a.get('pdfTwoLeftLines'),
    f"hdrversion: the PDF's left column gained exactly one line, under the date -- {a.get('beforePdfLeftCol')} -> {a.get('afterPdfLeftCol')}")
chk(a.get('captured') and a.get('snapVersion')=='3',
    f"hdrversion: ⭐ the value is in a REAL saved calendar's fields.byId ({a.get('snapVersion')!r}, {a.get('fieldIdCount')} field ids)")
chk(a.get('roundTrips'),
    f"hdrversion: it survives captureSnapshot -> JSON -> applyStateSnapshot, driven through undo/redo ({a.get('afterUndoField')!r} -> {a.get('afterRedoField')!r})")
chk(a.get('clearedScreen') and a.get('clearedExcel'),
    f"hdrversion: ⭐ clearing the field hides the line again and restores the bare &L ({a.get('clearedExcelL')!r})")
chk(a.get('notInCompleteness'),
    "hdrversion: it is NOT part of Show Info's completeness test -- a version must never gate Production")
chk(not a.get('errors'), f"hdrversion: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"hdrversion: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- hdrverload: the same version RESTORED from a file, and absent from one saved before it -------
# Run TWICE, against two real fixtures, because the two directions are different rules:
#   * hdrversion.sptcal   carries "show-version":"3" -> the field and the header must come back;
#   * colswap-2col.sptcal was written before the field existed -> the field must be EMPTY and the
#     slot hidden.
#   * hdrmanualbraces.sptcal is saved in MANUAL with {today}/{version}/{episodes} sitting in two
#     header lines -> every stored line must render VERBATIM, braces and all. ⭐ That is decision
#     H4 proved against a real file rather than by construction: no calendar written before the
#     template engine carries headerTemplates, so the flag restores false and headerLine() never
#     calls the resolver. It is the assertion that says the whole feature is safe for calendars
#     already in the wild.
#   * hdrtemplated.sptcal is the MIRROR of it: the same kind of braces, saved in TEMPLATE mode with
#     headerTemplates:true -> every stored token must RESOLVE on restore, and no known token may
#     survive in a rendered line. The two fixtures together are the whole of decision H3: same text,
#     opposite outcome, decided by one flag that no pre-existing file carries. applyStateSnapshot() replays the SNAPSHOT's keys, so without the guard above its
#     step 3 a field the snapshot never mentions keeps the PREVIOUSLY OPEN calendar's value -- open a
#     calendar with version 3, then open a pre-Step-1 file, and the second show's header prints v3.
#     That is CLAUDE.md's "a missing key falls back to a default, never to whatever is in memory".
# ⚠️ Both go through the INLINE ?state= path, which is the same applyStateSnapshot the picker uses.
# The two-files-in-sequence case needs the picker, which stalls on IndexedDB here -- see the
# `restore` leg above, which fails for exactly that reason. Not proved by this harness; said out loud.
for HVFIX in hdrversion colswap-2col hdrmanualbraces hdrtemplated; do
HARNESS_PAGE="$PAGE" HARNESS_STATE="$HVFIX" "$HERE/run.sh" hdrverload 90 >/dev/null 2>&1
python3 - "$HERE/hdrverload.json" "$HVFIX" <<'PY' || FAIL=1
import json,sys
bad=0; fix=sys.argv[2]
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print(f'  FAIL  hdrverload[{fix}] produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print(f'  FAIL  hdrverload[{fix}] threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('stateApplied'), f"hdrverload[{fix}]: the fixture reached the page ({a.get('stateBytes')} bytes, {a.get('fixtureFieldIds')} field ids)")
chk(a.get('fieldRestored'),
    f"hdrverload[{fix}]: the field matches the fixture -- key {'present' if a.get('fixtureHasKey') else 'ABSENT'}, value {a.get('fieldValue')!r}")
chk(a.get('headerMatches'), f"hdrverload[{fix}]: l2 reads {a.get('l2Text')!r}, which is what {a.get('fixtureVersion')!r} should render")
chk(a.get('visibilityMatches'),
    f"hdrverload[{fix}]: the slot is {'visible' if a.get('l2Visible') else 'hidden'}, which is right for that value")
chk(a.get('excelMatches'), f"hdrverload[{fix}]: the workbook's &L came back as {a.get('excelL')!r}")
chk(not a.get('errors'), f"hdrverload[{fix}]: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"hdrverload[{fix}]: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY
done

# ---- hdrtemplate: the template engine and the THREE header modes --------------------------------
# HEADER-PRESETS-PLAN.md Step 2. Carries BOTH §7 item 5 and item 5b in one leg -- every leg costs its
# full timeout in wall-clock whether it needs it or not, and the assertions are what matter.
# ⭐ FOUR ASSERTIONS ARE THE EXPENSIVE ONES TO GET WRONG:
#   h3b*Inert    -- the mode button's label/title is the ONE authorised frozen edit in this plan, and
#                   the sign-off is conditional on it being byte-identical while the flag is false.
#   storesRaw    -- headerManual holds TEMPLATES, the consumers get TEXT. Backwards, and either a
#                   preset stamps one calendar's values onto every other one, or the user's first
#                   click into a line destroys the token.
#   ctxLeaked    -- computeHeaderDefaults() hangs the token context on its return value, and that
#                   value is assigned straight to headerManual in two places. It is defined
#                   NON-ENUMERABLE so JSON.stringify/Object.assign/spread cannot see it; this asserts
#                   the consequence rather than trusting the flag.
#   manualPrintsBraces -- Manual never resolves. Decision H4.
HARNESS_PAGE="$PAGE" "$HERE/run.sh" hdrtemplate 170 >/dev/null 2>&1
python3 - "$HERE/hdrtemplate.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  hdrtemplate produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  hdrtemplate threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('h3bAutoInert'),
    f"hdrtemplate: ⭐ H3b inert in Auto -- the button is byte-identical to before the frozen edit ({a.get('autoLabel')!r})")
chk(a.get('h3bManualInert'),
    f"hdrtemplate: ⭐ H3b inert in Manual -- likewise ({a.get('manualLabel')!r})")
chk(a.get('tplIsTemplate'), f"hdrtemplate: the third mode reads 'Header: Template' ({a.get('tplLabel')!r})")
chk(a.get('tplLockedHere'),
    f"hdrtemplate: ⭐ Template mode is READ-ONLY on the calendar and the styling bar is gone -- owner, 10 Sep (contenteditable={a.get('tplEditableAttr')!r}, toolbar gone={a.get('tplToolbarGone')}, spacer={a.get('tplSpacerInstead')})")
chk(a.get('clickOpensEditor') and a.get('clickSelectsThatLine'),
    f"hdrtemplate: ...and clicking a header line opens the EDITOR at that line, so the affordance is not dead (cursor={a.get('tplCursor')!r})")
chk(a.get('resolvesOnScreen'), f"hdrtemplate: tokens resolve on screen ({a.get('c4Resolved')!r})")
chk(a.get('unknownSurvives'), f"hdrtemplate: an unknown token and an escape survive as typed ({a.get('c2Resolved')!r})")
chk(a.get('groupsWork'),
    f"hdrtemplate: an unsatisfiable [group] collapses, a satisfied one renders ({a.get('emptyGroup')!r} / {a.get('fullGroup')!r})")
chk(a.get('noCompoundDrift'),
    f"hdrtemplate: ⭐ the compound tokens still equal the hand-coded auto lines -- the drift guard {a.get('compoundVsAuto')}")
chk(a.get('peekWorks'),
    f"hdrtemplate: the mode menu's Template row leads to the tokens BEFORE you commit -- {a.get('peekLabel')!r}, {a.get('peekTokens')} of them")
chk(a.get('focusShowsRaw'), f"hdrtemplate: ⭐ focusing a line shows the RAW template, so an edit cannot destroy the token ({a.get('rawOnFocus')!r})")
chk(a.get('blurRestoresResolved'), f"hdrtemplate: blurring puts the resolved text back ({a.get('afterBlur')!r})")
chk(a.get('excelHasNoUnresolved') and a.get('excelCarriesResolved'),
    f"hdrtemplate: the workbook carries resolved text and no unresolved token {a.get('excelUnresolved')}")
chk(a.get('pdfDrewResolved') and a.get('pdfHasNoUnresolved'),
    f"hdrtemplate: the PDF drew resolved text and no unresolved token {a.get('pdfUnresolved')}")
chk(a.get('storesRaw'), f"hdrtemplate: ⭐ a real saved calendar stores the RAW template, not the value ({a.get('snapRawC4')!r})")
chk(a.get('flagTravels'), f"hdrtemplate: headerTemplates travels in the file (mode={a.get('snapHeaderMode')!r}, flag={a.get('snapHeaderTemplates')})")
chk(not a.get('ctxLeaked'), "hdrtemplate: ⭐ __ctx is NOT in the save format -- the non-enumerable carriage holds")
chk(not a.get('popInCopy'), f"hdrtemplate: no stray mode popover baked into a shareable copy ({a.get('popElementsInCopy')} elements)")
chk(a.get('warnsBeforeBaking'), f"hdrtemplate: Template -> Manual warns BEFORE it bakes -- {a.get('bakeWarning')!r}")
chk(a.get('bakeFroze') and a.get('noSwapInManual'),
    f"hdrtemplate: the bake froze the values and the tokens are gone ({a.get('bakedC4')!r})")
chk(a.get('manualPrintsBraces'), f"hdrtemplate: ⭐ MANUAL NEVER RESOLVES -- decision H4 ({a.get('manualBraces')!r})")
chk(a.get('autoEmptiedStore'), "hdrtemplate: -> Auto discards headerManual, as 'Header: Auto' always has")
chk(a.get('oneUndoStep'), f"hdrtemplate: each transition is ONE undo step ({a.get('afterAuto')!r} -> undo -> {a.get('afterUndo')!r})")
chk(not a.get('errors'), f"hdrtemplate: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"hdrtemplate: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- hdrpreset: the preset library, and the two rules that keep data where it belongs ------------
# HEADER-PRESETS-PLAN.md Step 4, gate item 6.
# ⭐ storesTemplates  -- decision H8. A preset holds the nine TEMPLATES, never their resolved values.
#                       Save a header whose l2 says "v3" and that preset stamps v3 onto every
#                       calendar it is ever applied to. Also why Save-as is DISABLED in Manual.
# ⭐ neverInSnapshot  -- a preset is a PREFERENCE: sptcal.prefs, per user and per machine, never
#                       captureSnapshot(). The exact mirror of the version field, which IS calendar
#                       data and must travel. Getting either backwards fails silently.
HARNESS_PAGE="$PAGE" "$HERE/run.sh" hdrpreset 150 >/dev/null 2>&1
python3 - "$HERE/hdrpreset.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  hdrpreset produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  hdrpreset threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('blockFound') and a.get('insidePrefsCard'),
    "hdrpreset: the block exists and sits inside .prefs-card")
chk(a.get('noIdsInBlock'), f"hdrpreset: ⛔ not one id on any preset control {a.get('idsInBlock')}")
chk(a.get('primaryMatchesTab') and a.get('secondaryStaysPlain'),
    f"hdrpreset: ⭐ all {a.get('primaryCount')} primary buttons wear the ACTIVE TAB's ground ({a.get('activeTabBg')}), and Import stays plain ({a.get('importBg')})")
chk(a.get('defaultFirst') and a.get('defaultNotEditable'),
    f"hdrpreset: Default ships built in, first, and read-only {a.get('optionsAtBoot')}")
chk(a.get('storeEmptyAtBoot'), "hdrpreset: nothing is stored until the user saves something")
chk(a.get('manualSaveDisabled') and a.get('manualExplains'),
    f"hdrpreset: ⭐ H8 -- Save-as is refused in Manual, and says why ({a.get('manualHint')!r})")
chk(a.get('templateSaveEnabled'), "hdrpreset: ...and offered in Template")
chk(a.get('storesTemplates'),
    f"hdrpreset: ⭐ H8 -- the preset stores TEMPLATES, not values (l2={((a.get('savedLines') or {}).get('l2'))!r})")
chk(a.get('idGenerated'), f"hdrpreset: ids are generated, never the name ({a.get('savedId')!r})")
chk(a.get('listGrew') and a.get('twoSaved'), "hdrpreset: saving adds to the list")
chk(a.get('applySwitchedMode') and a.get('applyResolved'),
    f"hdrpreset: applying switches to Template and the lines resolve ({a.get('afterApplyLabel')!r})")
chk(a.get('applyIsOneUndoStep'), f"hdrpreset: applying is ONE undo step ({a.get('afterUndoLabel')!r})")
chk(a.get('neverInSnapshot'),
    f"hdrpreset: ⭐ a preset NEVER travels in a calendar (key={a.get('snapHasPresetKey')}, name={a.get('snapHasPresetName')}, {a.get('fieldIdCount')} field ids)")
chk(a.get('appliedHeaderTravels'),
    "hdrpreset: ...but the APPLIED header does -- that is how a .sptcal renders elsewhere")
chk(a.get('renameWorked'), f"hdrpreset: rename keeps the id, so nothing is orphaned ({a.get('renamedTo')!r})")
chk(a.get('deleteClean'),
    f"hdrpreset: deleting the last preset REMOVES the key, and Default survives {a.get('prefsAfterDelete')}")
chk(not a.get('errors'), f"hdrpreset: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"hdrpreset: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- hdrfile: presets as .spthdr files, and the validation between a stranger's file and us ------
# HEADER-PRESETS-PLAN.md Step 5, gate item 7.
# ⛔ A preset file NEVER goes through parseCalendarText(). That function is the one reader of
# CALENDAR files and is contract; teaching it a third shape would risk every saved calendar's
# restore path to serve a preference file. The preset has its own small, strict reader.
HARNESS_PAGE="$PAGE" "$HERE/run.sh" hdrfile 150 >/dev/null 2>&1
python3 - "$HERE/hdrfile.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  hdrfile produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  hdrfile threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('pickerCalled') and a.get('suggestedLooksRight'),
    f"hdrfile: Export opens the real picker with a sensible name ({a.get('suggestedName')!r}, {a.get('pickerTypeDesc')!r})")
chk(a.get('fileKind')=='spt-header-preset' and a.get('fileVersion')==1,
    f"hdrfile: the file declares its kind and version ({a.get('fileKind')!r} v{a.get('fileVersion')})")
chk(a.get('fileHasTemplates'),
    "hdrfile: ⭐ the FILE carries templates, not values -- or every recipient gets this calendar's data baked in")
chk(a.get('roundTrip'), "hdrfile: export -> import returns the same nine lines")
chk(a.get('freshId'), "hdrfile: ⭐ an imported preset gets a FRESH id, so an import cannot overwrite an existing preset")
chk(a.get('refusesJunk'), f"hdrfile: a file without `kind` is refused ENTIRELY ({a.get('countAfterJunk')} presets, unchanged)")
chk(a.get('refusesGarbage'), "hdrfile: ...and so is something that is not JSON at all")
chk(a.get('dropsUnknown'),
    f"hdrfile: ⭐ unknown line ids and format keys are DROPPED, not stored {a.get('junkLines')} {a.get('junkFormat')}")
chk(a.get('importedIsUsable'),
    f"hdrfile: an imported preset applies like any other ({a.get('appliedLabel')!r}, l2={a.get('appliedL2')!r})")
chk(a.get('stillNeverTravels'), "hdrfile: and it still never reaches a saved calendar")
chk(not a.get('errors'), f"hdrfile: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"hdrfile: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- hdrexcel: the 255-character Excel header cap, and the estimate that warns about it -----------
# HEADER-PRESETS-PLAN.md Step 6, gate item 8.
# Excel rejects a header over 255 characters IN TOTAL, codes included, and fails UNGRACEFULLY: the
# workbook writes and validates as XML, then Excel calls it corrupt on open. exportExcel's trimmer
# drops trailing lines to stay under, so nothing breaks and the user silently loses lines.
# ⚠️ estimateExcelHeaderLength() is a SECOND COPY of that frozen arithmetic and can drift, which is
# what this leg is really for: the claim is not "the estimate is exact" but "a header the estimate
# calls near the limit still produces a workbook check-xlsx.sh accepts, and the trimmer drops the
# lines it is supposed to, in the order it is supposed to".
HARNESS_PAGE="$PAGE" "$HERE/run.sh" hdrexcel 150 >/dev/null 2>&1
python3 - "$HERE/hdrexcel.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  hdrexcel produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  hdrexcel threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('meterShowsNumber') and a.get('autoUnderLimit'),
    f"hdrexcel: the meter reads sanely on an ordinary header ({a.get('meterAtAuto')!r})")
chk(a.get('estimatorSaysOver') and a.get('meterWarns'),
    f"hdrexcel: an overlong header is called out before export ({a.get('overTotal')} of 255)")
chk(a.get('oddHeaderUnderCap'),
    f"hdrexcel: ⭐ the workbook's header is inside Excel's cap ({a.get('oddHeaderLen')} <= 255)")
chk(a.get('trimOrderIntact'),
    f"hdrexcel: ⭐ the trimmer drops the RIGHT lines in the RIGHT order {a.get('sectionLines')} -- right-hand detail first, every section keeps its lead line")
chk(a.get('estimateAgreesDirectionally'),
    "hdrexcel: the estimate saw the problem the real assembly had (it exceeds; the real header was trimmed)")
chk(not a.get('errors'), f"hdrexcel: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"hdrexcel: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY
# ⭐ And the real file, through the checker that rejects a workbook the way EXCEL does rather than
# the way a parser does. This is the assertion the whole leg exists for.
if [[ -f "$HERE/hdrexcel.xlsx" ]]; then
  if "$HERE/check-xlsx.sh" "$HERE/hdrexcel.xlsx" >/dev/null 2>&1; then
    ok "hdrexcel: ⭐ the overlong-header workbook still opens -- check-xlsx.sh accepts it"
  else
    bad "hdrexcel: the overlong-header workbook is REJECTED by check-xlsx.sh"
  fi
else
  bad "hdrexcel produced no workbook to check"
fi

# ---- hdreditor: the header template EDITOR, and the third left slot ------------------------------
# HEADER-PRESETS-PLAN.md Step 6. Owner, 9 Sep 2026: a separate pop-up for BUILDING a header, with a
# live view at the top, the same styling controls the manual header has, and three slots per column.
#
# ⛔ THE THIRD LEFT SLOT IS THREE FROZEN EDITS -- renderSpreadsheetView's left column, exportExcel's
# lIds, buildWaterfallPdf's hLeftArr. The sign-off rests on exactly the guarantee l2 and c4 were
# given on 31 Aug: the slot is EMPTY by default, hidden on screen by
# .hdr-line.hdr-slot.hdr-empty:not(.hdr-editable), dropped from the workbook by withCodes() and from
# the PDF by .filter(x=>x.t) -- so every calendar ever saved renders byte-for-byte as it did. THE
# OTHER HALF OF THAT PROOF IS THE PDF/EXCEL BYTE-COMPARE ABOVE, not this leg. This leg proves the
# slot is there and inert; that one proves nothing moved.
#
# The rest of it is the panel, and two of its assertions are worth more than the others:
#   * noIds -- the panel is BODY-LEVEL, so it is outside .prefs-card and collectFieldValues()'s class
#     exclusion does not reach it. It holds ten text inputs, two colour inputs, a select and a
#     checkbox. ONE id on any of them and it is baked into every saved calendar with an undo step
#     per keystroke -- the same hazard hdrpreset guards for the preset block.
#   * notASecondRenderer -- the canvas is asserted by reading the result off the REAL header behind
#     the modal. A live preview that draws its own text is a second renderer, and a second renderer
#     drifts; if these two ever disagree the panel is lying about what prints.
HARNESS_PAGE="$PAGE" "$HERE/run.sh" hdreditor 170 >/dev/null 2>&1
python3 - "$HERE/hdreditor.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  hdreditor produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  hdreditor threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('l3Inert'),
    f"hdreditor: ⭐ l3 is on the calendar and HIDDEN while empty -- the frozen edits are inert (present={a.get('l3OnCalendar')})")
chk(a.get('editorOpened') and a.get('opensFromAuto'),
    f"hdreditor: it opens from AUTO and switches to Template on the way in ({a.get('modeBeforeOpen')!r} -> {a.get('modeAfterOpen')!r})")
chk(a.get('threePerColumn'),
    f"hdreditor: three slots per column, left to right {a.get('canvasSlots')}")
chk(a.get('noIds'),
    f"hdreditor: ⛔ not ONE id anywhere in the panel {a.get('idsInPanel')} -- it is body-level, so .prefs-card does not cover it")
chk(not a.get('c4OfferedWhenUnused'),
    "hdreditor: c4 is NOT offered on a calendar that does not use it")
chk(a.get('barWoke') and a.get('barNamesRight'),
    f"hdreditor: the styling bar wakes on the selected line and names it ({a.get('barNamesLine')!r})")
chk(a.get('stylingReachesHeader'),
    f"hdreditor: ⭐ styling in the panel IS the header's styling -- one store, one renderer ({a.get('canvasStyle')!r} == {a.get('realStyle')!r})")
chk(a.get('showsRaw'),
    f"hdreditor: focusing a line on the canvas shows the RAW template ({a.get('rawOnFocus')!r})")
chk(a.get('notASecondRenderer'),
    f"hdreditor: ⭐ an edit made in the panel resolves IDENTICALLY on the real header ({a.get('canvasAfterEdit')!r} == {a.get('realAfterEdit')!r})")
chk(a.get('placeholdersAreEditorOnly'),
    f"hdreditor: ⭐ a token with no data draws a dashed placeholder in the EDITOR ONLY ({a.get('placeholderShown')!r}; the header prints {a.get('realL3WhilePlaceheld')!r})")
chk(a.get('focusDoesNotRestyle'),
    f"hdreditor: ⭐ clicking into a line does NOT restyle it -- owner-reported 9 Sep ({a.get('typeBeforeFocus')!r})")
chk(a.get('railFullyReadable'),
    f"hdreditor: ⭐ no live value in the Insert rail is truncated at {a.get('railWidth')}px -- owner-reported 9 Sep {a.get('railClipped')}")
chk(a.get('footCollapsesWhenSilent'),
    f"hdreditor: the stage note says NOTHING and takes no space when there is nothing to explain ({a.get('footHeightWhenSilent')}px)")
chk(a.get('noLiveHeaderLabel') and a.get('noDottedBoxSentence'),
    "hdreditor: the two labels the owner cut on 9 Sep stay cut")
chk(a.get('grammarLeadsWithExample') and a.get('grammarDropsBraceEscape'),
    f"hdreditor: the bracket rule leads with a worked example ({a.get('grammarText')!r})")
chk(a.get('railShared'),
    f"hdreditor: the Insert rail is the shared token list, with live previews ({a.get('railTokens')} tokens, {a.get('railLive')} live)")
chk(a.get('railHasPhases') and a.get('railHasSnippets'),
    "hdreditor: ⭐ the rail offers every phase under its CURRENT name, and the bracket snippets (ported from hdrtemplate, 10 Sep)")
chk(a.get('railInsertAppends') and a.get('railInsertResolves'),
    f"hdreditor: ⭐ clicking a rail token APPENDS to the selected line and resolves ({a.get('beforeInsert')!r} -> {a.get('afterInsert')!r} -> {a.get('afterInsertCanvas')!r})")
chk(a.get('budgetReads') and a.get('budgetWarnsWhenOver'),
    f"hdreditor: the Excel budget reads and warns when it is blown ({a.get('budgetText')!r})")
chk(a.get('defaultFitsExcel'),
    f"hdreditor: ⚠️ the DEFAULT template on a full calendar fits Excel's cap -- {a.get('budgetAtRest')!r}")
chk(a.get('c4KeptNotDropped'),
    f"hdreditor: ⭐ c4 is KEPT AND HIDDEN, not dropped -- a calendar already using it still sees it, marked {a.get('c4Label')!r} ({a.get('c4Value')!r})")
chk(a.get('doneCloses') and a.get('escapeCloses') and a.get('headerSurvives'),
    "hdreditor: Done and Escape both close it, and the header it built survives")
chk(not a.get('errors'), f"hdreditor: 0 console errors {a.get('errors')}")
hv=a.get('clipped') or {}
chk(not hv.get('h'), f"hdreditor: 0 horizontally clipped cells {hv.get('h')}")
sys.exit(bad)
PY

# ---- onecol: one continuous column, instead of a block per calendar year ------------------------
# Owner, 10 Sep 2026, with a reference calendar running 10/5/26 -> 10/4/27 down a single column.
#
# ⛔ ONE FLAG, TWO CHANGES, AND THE MEASUREMENT IS WHY. computeYearBlocks stops splitting per year
# AND computeSchedule stops padding out to whole calendar years. Measured on a 52-week run that
# straddles a year end: merging the blocks ALONE gives 104 rows x 4 cols, and because both writers
# fit the entire grid to ONE page (fitToWidth:1/fitToHeight:1, and the PDF's own fit()) that halves
# the print scale -- 0.81 -> 0.41. Dropping the padding too gives 53 x 4 at 0.80, the same size as
# today. Shipping the obvious half alone would have made calendars worse, quietly.
#
# ⭐ NO EDIT INSIDE ANY RENDERER OR WRITER. computeBlockLayout, sheetColumnWidths, sheetRowCount,
# exportExcel and buildWaterfallPdf all take yearBlocks as DATA, so changing what produces it
# changes all four outputs -- the "change the DECLARATION, not the call sites" pattern.
#
# ⚠️ DEFAULT OFF, and the byte-compare above is what proves it: with the flag off every calendar
# ever saved renders exactly as before. This leg asserts the shape round-trips and that toggling
# back is identical to never having toggled.
HARNESS_PAGE="$PAGE" "$HERE/run.sh" onecol 170 >/dev/null 2>&1
python3 - "$HERE/onecol.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  onecol produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  onecol threw: '+str(a['EX'])); sys.exit(1)
off=a.get('off') or {}; on=a.get('on') or {}
chk(a.get('btnExists') and a.get('btnStartsOff') and a.get('btnSkippedBySweep'),
    f"onecol: the toggle exists, starts off, and sits inside .prefs-card so collectFieldValues() cannot sweep it into a saved file (it is an {a.get('btnTag')}, which IS swept anywhere else)")
chk(a.get('offIsBlocked') and a.get('offStartsAtYearTop'),
    f"onecol: OFF is today -- a block per year, padded to 1 Jan ({off.get('rows')} rows x {off.get('cols')} cols, from {off.get('first')!r})")
chk(a.get('oneBlock'),
    f"onecol: ⭐ ON gives ONE year header, not one per year {a.get('onYearHeaders')}")
chk(a.get('startsAtWork'),
    f"onecol: ⭐ ...and the whole-year padding is gone -- it starts on the first WORKING week ({on.get('first')!r} -> {on.get('lastDate')!r})")
chk(a.get('bothHalves'),
    f"onecol: ⭐ BOTH halves, so the row count stays sane -- {off.get('rows')}x{off.get('cols')} -> {on.get('rows')}x{on.get('cols')} (blocks-only would be ~104 rows and half the print scale)")
chk(a.get('keysStayNumeric'),
    f"onecol: ⛔ column keys stay y<digits>:s<n>, or installGridResizers' regex dies silently {a.get('onCkeys')}")
chk(a.get('snapHasKey') and a.get('notInFieldIds'),
    "onecol: ⭐ it travels in a REAL saved calendar, as a snapshot key and NOT also as a swept field id")
chk(a.get('swapWorksInOneCol'),
    f"onecol: ⭐ column swapping works WITH the setting on -- the button names the BLOCK year {a.get('swapBtnYear')!r}, not the week's ({a.get('swapBefore')!r} -> {a.get('swapAfter')!r}, persists={a.get('swapPersists')})")
chk(a.get('rowHeightFollowsWeek'),
    f"onecol: ⭐ a dragged row height follows its WEEK across the toggle, not its row number ({a.get('offHeight')}px on row {a.get('sizeWeekRowOff')} -> row {a.get('sizeWeekRowOn')})")
chk(a.get('widthsArePerLayout') and a.get('widthRoundTripLossless'),
    f"onecol: ⭐ each layout keeps its OWN column widths, and a round trip is lossless (off s0={(a.get('offWidths') or {}).get('y2026:s0')}, on s0={(a.get('onWidths') or {}).get('y2026:s0')})")
chk(a.get('offIsInert'),
    "onecol: ⭐ toggling back is byte-identical to never having toggled -- same rows, cols, keys, headers and width")
chk(a.get('oneUndoStep'),
    f"onecol: it is ONE undo step, not two ({a.get('beforeUndo')} rows -> undo -> {a.get('afterUndo')})")
chk(not a.get('errors'), f"onecol: 0 console errors {a.get('errors')}")
chk(on.get('clippedH')==0 and off.get('clippedH')==0,
    f"onecol: 0 horizontally clipped cells in either layout (off={off.get('clippedH')}, on={on.get('clippedH')})")
sys.exit(bad)
PY

# ---- rowmigrate: a REAL pre-10-Sep calendar's dragged row height still lands on its week --------
# ⛔ THE FORWARD-COMPATIBILITY HALF of moving rowHeights from row-index keys to week keys, and the
# risky half: every calendar anyone has ever dragged a row in stores `rowHeights: {"<index>": px}`.
# Without the migration in syncRowHeights() those files open with every dragged row silently back
# to its default height, and nothing says so. The fixture is a genuine minted save with the three
# keys that build could not have written stripped out.
HARNESS_PAGE="$PAGE" HARNESS_STATE=rowheightlegacy "$HERE/run.sh" rowmigrate 130 >/dev/null 2>&1
python3 - "$HERE/rowmigrate.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  rowmigrate produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  rowmigrate threw: '+str(a['EX'])); sys.exit(1)
chk(a.get('migratedToRightWeek') and a.get('onlyThatWeekIsTall'),
    f"rowmigrate: ⭐ the legacy row-index key resolved to the RIGHT week and only that one {a.get('tallRows')} {a.get('restored')}")
chk(a.get('btnStartsOff'),
    "rowmigrate: a file saved before one-column mode existed opens with it OFF")
chk(a.get('movedRow') and a.get('heightFollowedWeek') and a.get('stillOnlyOneTall'),
    f"rowmigrate: ⭐ ...and the height follows its WEEK into the other layout ({a.get('afterToggle')})")
chk(not a.get('errors'), f"rowmigrate: 0 console errors {a.get('errors')}")
sys.exit(bad)
PY

# ---- the Node provers: the pure functions, fuzzed against their own source -----------------------
# ⚠️ NEITHER OF THESE WAS EVER RUN BY THIS SCRIPT. prove-col-permutation.mjs has existed since the
# column-swap work and was mentioned in a comment above as something to run BY HAND -- so the
# invariance theorem the whole swap feature rests on was unguarded in CI in practice. They are Node,
# they take under a second each, and they slice their subject verbatim out of src/legacy/app.js, so
# a shape change fails loudly rather than testing a stale copy. Run them.
for PROVER in prove-header-template prove-col-permutation; do
  if [[ ! -f "$HERE/$PROVER.mjs" ]]; then bad "prover $PROVER.mjs is missing"; continue; fi
  if POUT="$(node "$HERE/$PROVER.mjs" 2>&1)"; then
    # Pull the verdict LINES, not a fixed offset from the end: the two provers do not print the
    # same shape (one ends on a count then a RESULT, the other on a RESULT alone), and `tail -2 |
    # head -1` picked a blank line for the second one.
    ok "$PROVER: $(print -r -- "$POUT" | grep -E 'checks passed|^RESULT' | tr '\n' ' ')"
  else
    bad "$PROVER FAILED: $(print -r -- "$POUT" | tail -6 | tr '\n' ' ')"
  fi
done

say ""
if [[ $FAIL == 0 ]]; then say "=== GATE PASSED ==="; else say "=== GATE FAILED ==="; fi
exit $FAIL
