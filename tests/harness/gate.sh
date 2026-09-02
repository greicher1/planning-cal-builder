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
# ⚠️ Retried once. renderRecents() sits behind an IndexedDB round trip and on a fresh profile it
# fails to resolve within 20s roughly one run in three, while the app is completely healthy. That
# stall is an environment fact, not a regression -- see the README.
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

say ""
if [[ $FAIL == 0 ]]; then say "=== GATE PASSED ==="; else say "=== GATE FAILED ==="; fi
exit $FAIL
