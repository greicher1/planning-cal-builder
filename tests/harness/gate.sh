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
#  10. the MONTH PDF: its printed document is byte-identical and it prints one sheet per month,
#      on nine calendars (monthprint + monthcmp.py; added 22 Sep 2026 on four, now nine). Numbered to match
#      UI-CONVENTIONS §10, whose items 6-9 are not automated here. Since step 5 of MONTH-PDF-WRITER-PLAN.md this is
#      the PRINT path, the rollback, reached by its localhost-only switch.
#  13. the WRITTEN month PDF (what Export PDF writes since step 5) is byte-identical to its baseline, on seventeen
#      calendars (monthexport + monthbase.py; added 5 Oct 2026). Items 11 and 12 (the audit-fix legs, the CSP) are
#      blocks of their own below, not numbered here.
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
# Namespaced by HARNESS_PORT exactly as run.sh namespaces its Chrome profile (29 Sep 2026): two
# sessions gating at once used to unzip into the SAME two directories and diff each other's
# workbooks. The default port keeps the old paths.
GTAG=""; [[ "${HARNESS_PORT:-8231}" != 8231 ]] && GTAG="$HARNESS_PORT"
XA="/tmp/gate${GTAG}-xa"; XB="/tmp/gate${GTAG}-xb"
rm -rf "$XA" "$XB"; mkdir -p "$XA" "$XB"
(cd $XA && unzip -qo "$HERE/base.xlsx") 2>/dev/null
(cd $XB && unzip -qo "$BASE/base.xlsx") 2>/dev/null
rm -f $XA/docProps/core.xml $XB/docProps/core.xml
# The header's left line carries todayStr in the same dotted form -- normalise that token only.
for f in $XA/xl/worksheets/sheet1.xml; do [ -f "$f" ] && sed -i '' "s/$TODAY/DATESTAMP/g" "$f"; done
for f in $XB/xl/worksheets/sheet1.xml; do [ -f "$f" ] && sed -i '' "s/$BASEDATE/DATESTAMP/g" "$f"; done
if diff -rq $XA $XB >/dev/null 2>&1; then ok "Excel parts identical (core.xml timestamp + header date excluded)"
else bad "Excel parts differ: $(diff -rq $XA $XB | head -3)"; fi

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

# ---- monthprint (gate 10): the MONTH PDF -- the one output of four that had no gate coverage -----
# ⭐ ADDED 22 Sep 2026. Six frozen edits that move or could move the month PDF had shipped with only
# hand A/Bs behind them. The month PDF has no writer -- exportMonthPdf fills #print-root and calls
# window.print() -- so the leg captures that document at the print call and ALSO has Chrome print it
# for real (HARNESS_PRINT_PDF=1), because a CSS-only edit changes the printout without changing the
# document. monthcmp.py compares both against tests/baselines/2026-09-22-monthprint/: the document
# byte for byte (today stamp normalised in the page, from the clock the app read), and one printed
# sheet per month. Its README records the controls it was proven to FAIL on, not only pass.
#
# Four calendars. `reference` is T.buildFixture(); the other three are restored through ?state= and
# were, until this leg, loaded by nothing in the gate at all:
#   dayoverrides    all four override kinds, snap-off start, a named hiatus
#   mvheader        the month header in Template mode, all four slots
#   mvheaderlegacy  a Manual header saved before templates existed -- braces must print literally
#   blocks          block shooting ON: the step-4 block tag (BLOCKS-PLAN §5), a frozen edit
#   blocksoff       ⭐ the SAME calendar switched to Episodes, dormant blocks and all -- BLOCKS-PLAN §5
#                   condition 3 ("no change at all with Blocks off"). It was held to the REFERENCE baseline
#                   until 20 Oct 2026 (late), when an episode's bar began reading its NAME: this fixture,
#                   saved by an older build, reads "Episode N" and reference (typed in fresh) "Shoot Ep. N".
#                   So it has its own baseline now, and the block after this loop still holds it to
#                   reference's, byte for byte, once both names are read as the episode
#   dayoverrides-onhalf  ⭐ ADDED 29 Sep 2026 (batch-3 step 0): 'onhalf' marks -- a weekend or holiday
#                   worked as a half day -- which bdfec60's frozen renderMonthView edit draws. A NEW
#                   case, not a re-cut; cut before 3.6 edits the same function
#   month-lanecap   ⭐ ADDED 29 Sep 2026 (after 3.6, owner's go-ahead): 25 notes on one day, past the old
#                   60-lane cap (L-16) -- and its August is in SCALE mode, the first case that exercises
#                   exportMonthPdf's shrink-to-fit branch at all
#   hiatus-blanklabel  ⭐ ADDED 29 Sep 2026: a deliberately emptied all-phase hiatus label prints blank (N-1)
#   mvnotes         ⭐ ADDED 20 Oct 2026 (MONTH-NOTES-PLAN.md): an edge month that prints because it holds notes and a
#                   custom holiday, No fill / tint / grey day notes, a note on a hiatus day, one-day custom pills that wrap
#   halfdays        ⭐ ADDED 15 Oct 2026: episodes of 4.5 days (one of 5), so Production's bars split per episode
#                   and STACKED on each switch day ("Stacked bars, always"). ⭐ Since 16 Oct 2026
#                   (HALF-SQUARE-BARS-PLAN.md) the two meet half way through the square in ONE lane
# The per-case PDF is kept as monthprint-<case>.pdf (gitignored) so a human can open what was gated.
# Each spec is <label>:<fixture, or - for T.buildFixture()>:<baseline case>.
MPBASE="$HERE/../baselines/2026-09-22-monthprint"
for MPSPEC in reference:-:reference dayoverrides:dayoverrides:dayoverrides mvheader:mvheader:mvheader \
              mvheaderlegacy:mvheaderlegacy:mvheaderlegacy blocks:blocks:blocks blocksoff:blocksoff:blocksoff \
              dayoverrides-onhalf:dayoverrides-onhalf:dayoverrides-onhalf \
              month-lanecap:month-lanecap:month-lanecap hiatus-blanklabel:hiatus-blanklabel:hiatus-blanklabel \
              halfdays:halfdays:halfdays mvnotes:mvnotes:mvnotes; do
  MPCASE="${MPSPEC%%:*}"; MPREST="${MPSPEC#*:}"; MPSTATE="${MPREST%%:*}"; MPBCASE="${MPREST#*:}"
  [[ $MPSTATE == - ]] && MPSTATE=""
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$MPSTATE" HARNESS_PRINT_PDF=1 "$HERE/run.sh" monthprint 60 >/dev/null 2>&1
  cp -f "$HERE/monthprint.print.pdf" "$HERE/monthprint-$MPCASE.pdf" 2>/dev/null
  cp -f "$HERE/monthprint.json" "$HERE/monthprint-$MPCASE.json" 2>/dev/null
  MPLABEL="$MPCASE"; [[ $MPBCASE != $MPCASE ]] && MPLABEL="$MPCASE (vs the $MPBCASE baseline)"
  python3 "$HERE/monthcmp.py" gate "$HERE/monthprint.json" "$HERE/monthprint.print.pdf" "$MPBASE" "$MPBCASE" "$MPLABEL" || FAIL=1
done
# ⭐ BLOCKS-PLAN §5 condition 3, kept when blocksoff took its own baseline (20 Oct 2026): Blocks switched off prints
# exactly the reference calendar, once each document's episode names ("Episode N" in this older file, "Shoot Ep. N" in
# reference, typed in fresh) are read as the episode, and the dotted date stamp as a stamp.
python3 - "$HERE/monthprint-blocksoff.json" "$MPBASE/reference.html" <<'PYBO' || FAIL=1
import json,re,sys
try: new=json.load(open(sys.argv[1]))['printHtml']; ref=open(sys.argv[2]).read()
except Exception as e:
    print('  FAIL  monthprint blocksoff vs reference: could not read: '+str(e)); sys.exit(1)
norm=lambda s: re.sub(r'\b\d{1,2}\.\d{1,2}\.\d{2}\b','STAMP',re.sub(r'(?:Shoot Ep\.|Episode) (\d+)',r'EP\1',s))
ok=norm(new)==norm(ref) and len(re.findall(r'Episode \d+',new))>0
print(('  PASS  ' if ok else '  FAIL  ')+'monthprint blocksoff: ⭐ identical to reference\'s baseline once episode names are read as the episode (Blocks off changes nothing)')
sys.exit(0 if ok else 1)
PYBO

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
chk(a.get('aboveWidened') and a.get('confirmSilent'),
    f"move: magnitude-1 collateral applied, and NO message after the swap (owner, 21 Oct 2026) -- {str(a.get('confirmText'))[:80]!r}")
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
chk(a.get('chipSilent'),
    f"mid: 12 collateral weeks allowed, and NO message after the swap (owner, 21 Oct 2026) -- {str(a.get('chipText'))[:80]!r}")
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

# ---- stintbtn: the "Swap Column" hover button and the mode inference, through the real user path --------
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
chk(a.get('btnText')=='Swap Column' and a.get('btnPhase')=='prodPrep/2026', f"btn: the button says Swap Column for the hovered block ({a.get('btnText')}, {a.get('btnPhase')})")
chk(a.get('btnOnFirstWeek') and a.get('btnInsideCell'), "btn: anchored to the block's FIRST week, inside the cell")
chk(a.get('btnSurvivedTravel'), "btn: survives the pointer travelling across the block toward it")
chk(a.get('btnFollowsPhase') and a.get('btnGoneOffPhase'), "btn: re-anchors on another phase, gone off the phases")
chk(a.get('outlines')==1, f"btn: the whole block is drawn as ONE outline ({a.get('outlines')})")
chk(a.get('modeSaysBlock') and a.get('knobSaysBlock'), f"btn: the knob states the BLOCK mode and the partner before commit; the chip is only the hint -- {str(a.get('modeText'))[:90]}")
chk(a.get('noLeftKnob'), "btn: no knob offered where there is no partner")
chk(a.get('wholeBlockMoved') and a.get('noCellWidened'), "btn: all six weeks moved and NOT ONE changed width")
chk(a.get('knobFollowed'), "btn: the affordance followed the move")
chk(a.get('reverseRestoredExactly'), "btn: swapping back deleted the entry and restored the natural layout exactly")
chk(a.get('partialSaysWeek') and a.get('partialOutlines')==2, f"btn: a partial selection resolves to the per-week mode and the knob says so, drawn as two outlines across the gap (E3) -- {str(a.get('partialText'))[:90]}")
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
chk(a.get('flashSilentA'), f"multi: NO message after the group swap (owner, 21 Oct 2026) -- {str(a.get('flashA'))[:90]!r}")
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
# ⭐ The first defect this feature produced in real use (2 Sep 2026), reproduced on a SYNTHETIC
# calendar (regenerated 29 Sep 2026), and it was a FALSE REFUSAL. applyStintSwaps validated each stored
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
# ⭐ The counter-example to the plan's founding premise, found in real use (2 Sep 2026) and reproduced
# on a SYNTHETIC calendar (regenerated 29 Sep 2026). A block swap reflows nothing when the block has
# TWO phase columns; with THREE it can, because moving a block changes WHICH column is beside it and
# the new one may be free for its whole run where the old one was not. Here Writer's Rm (31 wks in
# 2027, slot 0, held narrow by Pre Prep in slot 1) lands at slot 1 after the swap, where slot 2 is
# empty for its entire run -- Prod Prep starts after it ends -- so it widens to two columns for 28 weeks.
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
    f"reshape: three phase columns, Writer's Rm held to one for all 31 weeks {a.get('before')}")
chk(a.get('noWordsBefore'),
    f"reshape: no chip says anything about the swap before commit (owner, 21 Oct 2026) -- {str(a.get('chipText'))[:110]!r}")
chk(a.get('amberMatchesCount'), f"reshape: one amber rectangle per affected week before commit ({a.get('amberRects')}/28)")
chk(a.get('swapped') and a.get('widened'), f"reshape: the swap lands and the widening is real {a.get('after')}")
chk(a.get('flashSilent'), f"reshape: NO message after the swap (owner, 21 Oct 2026) -- {str(a.get('flash'))[:110]!r}")
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
# HEADER-PRESETS-PLAN.md Step 2. Carries BOTH §7 item 5 and item 5b in one leg -- written when every
# leg cost its full timeout in wall-clock whether it needed it or not. (No longer true since run.sh
# went poll-and-kill, 22 Sep 2026: a leg now costs what its work costs. The one-leg shape stays.)
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
    f"hdrtemplate: ...and double-clicking a header line opens the EDITOR at that line, so the affordance is not dead (cursor={a.get('tplCursor')!r})")
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
chk(a.get('savedBothSections'),
    "hdrpreset: ⭐ ruling 1 -- one preset carries BOTH sections, so a shared look reaches both outputs")
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
# ⚠️ v2 since 21 Sep 2026 (owner ruling 1): one file, two optional sections. A DELIBERATE format
# change -- see MONTH-HEADER-PLAN.md §6 and README's changelog, not a test relaxed to go green.
# prove-header-preset.mjs covers the v1 -> v2 migration exhaustively; this leg proves the real
# export/import path carries it.
chk(a.get('fileKind')=='spt-header-preset' and a.get('fileVersion')==2,
    f"hdrfile: the file declares its kind and version ({a.get('fileKind')!r} v{a.get('fileVersion')})")
chk(a.get('fileHasTemplates'),
    "hdrfile: ⭐ the FILE carries templates, not values -- or every recipient gets this calendar's data baked in")
chk(a.get('fileMonthHasTemplates'),
    "hdrfile: ⭐ ...and so does the MONTH section -- both outputs travel as templates, never as values")
chk(a.get('junkMigratedToSheet'),
    "hdrfile: ⭐ a V1 preset file migrates into the `sheet` section and leaves `month` absent")
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
chk(a.get('fillsPageWidth') and a.get('fillsPageHeight'),
    f"onecol: ⭐ the single column FILLS the page -- {(a.get('fillOn') or {}).get('pctW')}% of the printable width and {(a.get('fillOn') or {}).get('pctH')}% of its height (it was 62% wide before the columns were stretched)")
chk(a.get('headerSpansMatch'),
    f"onecol: ⭐ the printed header spans the same width in BOTH layouts -- {a.get('hdrWidthOff')}pt off vs {a.get('hdrWidthOn')}pt on (it collapsed to 338pt when this shipped)")
chk(a.get('xlsxHeaderIdentical'),
    "onecol: ⭐ the WORKBOOK's page header is byte-identical either way -- &L/&C/&R are page-relative and the layout must not reach them")
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

# ---- colreuse: "Reuse empty columns" (COLUMN-REUSE-PLAN.md, owner rulings 20 Oct 2026) ----------
# A phase takes over the column of one that has just finished. One box in Settings, the grid's own
# drag to fix a pick, and a row note only when something was moved by hand.
#
# ⭐ NO FROZEN EDIT. Only computeSchedule's column assignment changes, and only with the box ticked;
# frozen computeBlockLayout derives fewer columns from `col` as data. The byte-compare above, on
# calendars that never tick it, is the inertness proof. This leg proves the rules, on a SYNTHETIC
# calendar (2030-2032) with one phase per rule of the plan's §3.
# Two runs: LIVE builds it through the DOM; RESTORE opens tests/fixtures/colreuse.sptcal, cut from
# LIVE's own snapshot.
for CRSTATE in "" colreuse; do
  rm -f "$HERE/colreuse.json"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$CRSTATE" "$HERE/run.sh" colreuse 240 >/dev/null 2>&1
  python3 - "$HERE/colreuse.json" "colreuse (${CRSTATE:-live})" <<'PYCR' || FAIL=1
import json,sys
path, label = sys.argv[1:3]
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+label+': '+m)
    if not c: bad=1
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])); sys.exit(1)
if a.get('mode') == 'live':
    chk(a.get('boxExists') and a.get('boxStartsOff') and a.get('boxSkippedBySweep'),
        'the box exists, starts off, and sits inside .prefs-card so collectFieldValues() cannot sweep it')
    chk(a.get('offSnapHasNoKeys') and a.get('offNoNotes'),
        'OFF saves no colReuse/colFollow key and shows no row note: a calendar that never ticks it is unchanged')
    oc=a.get('onCols') or {}
    chk(a.get('fewerColumns'), f"ON: 2030 drops from {a.get('offCols2030')} columns to {oc.get('2030')} (2031: {oc.get('2031')}, 2032: {oc.get('2032')})")
    chk(a.get('handoff'), 'a phase starting the week another ends takes its column, even with a phase to its right still running')
    chk(a.get('chainTie'), 'a tie goes to the phase "Start after" names: Production follows Prep, not Build')
    chk(a.get('lowestFree'), 'no handoff: the lowest free column')
    chk(a.get('newColumn'), 'nothing free: a new column')
    chk(a.get('prodLeft2031'), "Production's column is leftmost when two columns start a year together (ruled Q2)")
    chk(a.get('customTieLeftmost'), 'a custom phase with a tie takes the leftmost (ruled Q1)')
    chk(a.get('acrossHiatus'), 'a handoff counts across an all-phase hiatus (ruled Q5)')
    chk(a.get('onNoNotes'), 'ON with nothing moved by hand: still no row note')
    chk(a.get('widthsCleared2030') and a.get('widthsKept2032'),
        'hand-dragged widths are cleared in the year whose columns changed and kept in the year that did not (ruled Q7)')
    chk(a.get('undoBoxOff') and a.get('undoLayout') and a.get('undoWidthsBack') and a.get('redoBack'),
        'the box is ONE undo step: undo restores the box, the columns and the widths; redo puts them back')
    chk(a.get('selectedMix') and a.get('moved'),
        f"dragging a block into the free column beside it moves the phase there (column {a.get('mixSlotBefore')} -> {a.get('mixSlotAfter')})")
    chk(a.get('noteSaysMoved') and a.get('onlyOneNote'), f"...and only that phase's row gets a note: {(a.get('noteMoved') or {}).get('text')!r}")
    chk(a.get('snapHasKeys') and a.get('notInFieldIds'), 'it saves as colReuse + colFollow, and the box is not also a swept field id')
    chk(a.get('xlsxAgrees'), f"Excel puts each phase in the column the screen does {a.get('xlsxCols')}")
    chk(a.get('pdfExported'), 'the waterfall PDF exports')
    chk(a.get('staleSaysWhy') and a.get('staleBackToAuto') and a.get('reapplies'),
        f"a move that can't apply falls back to automatic and says why ({(a.get('noteStale') or {}).get('text')!r}), then applies again once it fits")
    chk(a.get('resetExists') and a.get('resetBack') and a.get('undoReset'), "the note's Reset clears the move, as one undo step")
else:
    chk(a.get('boxOn') and a.get('restoredRules'), 'a saved calendar opens with the box ticked and the same columns')
    chk(a.get('restoredMove') and a.get('noteRestored'), 'the hand move and its note survive save and load')
    chk(a.get('newClears'), 'New clears the box and the hand moves')
chk(not a.get('errors'), f"0 console errors {a.get('errors')}")
sys.exit(bad)
PYCR
done

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

# ---- blocks: block shooting (BLOCKS-PLAN.md steps 1-3) on a REAL saved Blocks calendar ----------
# tests/fixtures/blocks.sptcal was minted in the app: 5 blocks x 18 days, Block 3 overridden to 13,
# episode 205 dragged into Block 2. ⭐ The three properties the plan stands or falls on:
#   labels-not-dates  a hand move changes NO date -- the whole grid signature and the meta line
#   round trip        Blocks -> Episodes -> Blocks restores the dates AND the hand arrangement
#   uncond. restore   a pre-Blocks file loaded AFTER this one opens in Episodes mode. Proven to
#                     fail without applyStateSnapshot()'s default: the old calendar then scheduled
#                     IN BLOCKS MODE from the previous file's blocks -- 90 days, wrap 11/10/26,
#                     instead of 80 days, 10/27/26. Loaded through the real picker path.
HARNESS_PAGE="$PAGE" HARNESS_STATE=blocks "$HERE/run.sh" blocks 120 >/dev/null 2>&1
python3 - "$HERE/blocks.json" <<'PY' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  blocks produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  blocks threw: '+str(a['EX'])); sys.exit(1)
SAVED=['Block 1(18):201,202','Block 2(18):203,204,205','Block 3(13):206','Block 4(18):207,208','Block 5(18):209,210']
BLOCKS_META='85 shoot days → 18 wk · 6/29/26 → 10/27/26'
EP_META='80 shoot days → 17 wk · 6/29/26 → 10/20/26'
chk(a.get('mode')=='blocks' and a.get('restoredRows')==SAVED and a.get('restoredMeta')==BLOCKS_META,
    f"blocks: restores in Blocks mode with its hand arrangement and per-block override ({a.get('restoredMeta')})")
# The readout is a stat card since 22 Sep 2026 (owner: "restyle ... using mantine"): its badge
# reads "5 blocks" where the old caption read "from 5 blocks".
chk('5 blocks' in (a.get('readout') or '') and '85' in (a.get('readout') or '')
    and '18-Week Production Span / 5 Shooting Blocks' in (a.get('hdr') or ''),
    "blocks: the readout's badge names blocks, and the header reads '... / 5 Shooting Blocks' (ruling 6)")
chk(a.get('perEpHidden') and a.get('blockFieldsShown'), "blocks: Show card shows the block fields and hides Days per Episode")
chk(a.get('idsInPanel')==[] and a.get('formHasBlockIds'),
    f"blocks: no id inside the block panel {a.get('idsInPanel')}; show-mode/num-blocks/days-per-block are in fields.byId")
chk(a.get('moveGridSame') and a.get('moveMetaSame') and (a.get('afterMove') or [''])[0]=='Block 1(18):201,202,206',
    "blocks: ⭐ LABELS, NOT DATES -- moving 206 into Block 1 left the whole grid and the wrap untouched")
chk(a.get('undoExact'), "blocks: the move is ONE undo step, reverting exactly the arrangement")
# The block list is the SAME grip rows Episodes mode uses (owner, 22 Sep 2026) -- a drop on a row
# joins that row's block, before/after it in the shooting order.
chk(a.get('gripsInBlocks')==10 and (a.get('rowDrop') or ['',''])[:2]==['Block 1(18):204,201,202','Block 2(18):203,205']
    and a.get('rowDropGridSame') and a.get('rowDropMetaSame') and a.get('rowDropUndoExact'),
    f"blocks: ⋮⋮ rows: 204 dropped before 201 joins Block 1 there, no date moves, one undo -- {(a.get('rowDrop') or [])[:2]}")
chk(a.get('epMeta')==EP_META and '8-Day Shooting Schedule' in (a.get('epHdr') or '')
    and a.get('epRowsShown')==10 and a.get('epBlockRows')==0,
    f"blocks: Episodes mode schedules from the episode list, byte-identical header ({a.get('epMeta')})")
chk(a.get('roundTrip'), f"blocks: ⭐ ROUND TRIP -- back to Blocks restores the dates and the hand arrangement ({a.get('backMeta')})")
chk(a.get('mvEpisodePills')==0 and (a.get('mvProductionPills') or 0)>0 and (a.get('mvBlockPills') or 0)>0,
    f"blocks: month view draws Production's own pills, one bar per block (15 Oct 2026), no episode pills -- {a.get('mvProductionPills')} / {a.get('mvBlockPills')} / {a.get('mvEpisodePills')}")
chk(a.get('loadGuardAnswered') and a.get('oldMode')=='episodes' and a.get('oldNumBlocks')=='' and a.get('oldDaysPerBlock')==''
    and '10/27/26' in (a.get('oldMeta') or '') and (a.get('oldMeta') or '').startswith('80 shoot days')
    and a.get('oldBlockRows')==0 and a.get('oldEpisodeRows')==10,
    f"blocks: ⭐ a pre-Blocks .sptcal loaded AFTERWARDS through the picker opens in Episodes mode ({a.get('oldMode')}, {a.get('oldMeta')})")
# Step 4 -- the frozen block tag, a span INSIDE Production's pill (owner, 22 Sep 2026). ⛔ BLOCKS-PLAN
# §5.1: measured, not assumed. The pill is nowrap + ellipsis on purpose (a wrap would grow the row),
# so a clipped pill is lost text, and "fits" is checked on screen, at the printed width, and on the
# widest case the model allows -- a block shorter than a week, so one row names three -- which also
# produces a ONE-DAY pill piece, where ruling 7 says no tag at all.
tp, t3, ts = a.get('tagPrint') or {}, a.get('tagPrint3') or {}, a.get('tagScreen') or {}
chk((tp.get('n') or 0) > 0 and not tp.get('clipped') and not ts.get('clipped'),
    f"blocks: ⭐ the block tag prints in Production's pill and is never clipped ({tp.get('n')} tags, headroom >= {tp.get('minSlack')}px)")
chk(len(a.get('threeBlockWeek') or [])>=1 and not t3.get('clipped'),
    f"blocks: a row touching THREE blocks draws all three bars and their tags still fit ({(a.get('threeBlockWeek') or ['none'])[0]!r}, headroom {t3.get('minSlack')}px)")
chk((t3.get('oneDayPieces') or 0) >= 1 and t3.get('oneDayTagged') == 0 and tp.get('oneDayTagged') == 0,
    f"blocks: a ONE-DAY pill piece carries no tag (ruling 7) -- {t3.get('oneDayPieces')} such piece(s), {t3.get('oneDayTagged')} tagged")
chk(not a.get('errors'), f"blocks: 0 console errors {a.get('errors')}")
chk(not (a.get('clipped') or {}).get('h'), f"blocks: 0 horizontally clipped cells {(a.get('clipped') or {}).get('h')}")
sys.exit(bad)
PY

# ---- shootorder: Episodes mode's SHOOTING ORDER + the month-view Preferences (rulings 8-10) -------
# tests/fixtures/shootorder.sptcal was minted in the app: the reference calendar with 205 dragged to
# the front of the shooting order and 201 to fifth. It carries NO preference keys.
HARNESS_PAGE="$PAGE" HARNESS_STATE=shootorder "$HERE/run.sh" shootorder 120 >/dev/null 2>&1
python3 - "$HERE/shootorder.json" <<'PYS' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  shootorder produced no result: '+str(e)); sys.exit(1)
if 'EX' in a:
    print('  FAIL  shootorder threw: '+str(a['EX'])); sys.exit(1)
META='80 shoot days \u2192 17 wk \u00b7 6/29/26 \u2192 10/20/26'
chk(a.get('mode')=='episodes' and a.get('restoredOrder')==['205','202','203','204','201','206','207','208','209','210']
    and a.get('restoredMeta')==META,
    f"shootorder: restores its hand shooting order, on the SAME dates as natural order ({a.get('restoredMeta')})")
jp=a.get('julyPills') or []
# ⭐ "Stacked bars, always" (owner, 15 Oct 2026) replaced ruling 8's one bar per week: one bar per episode,
# in SHOOTING order, its Production Week as the grey text. 7/10 is 202's first day, a one-day piece (ruling 7).
chk(a.get('episodePills')==0 and jp[:3]==[['Ep. 205','Production Week 1'],['Ep. 205','Production Week 2'],['Ep. 202','']],
    f"shootorder: ⭐ one bar per episode in SHOOTING order, the week as grey text {jp[:3]}")
chk(a.get('undoDisabledBefore') is True and a.get('undoDisabledAfterPref') is True and a.get('undoDisabledAfterBoth') is True,
    "shootorder: a Preferences switch pushes NO undo step (Undo stays disabled through off and on)")
# ⚠️ REVISED 15 Oct 2026 (owner's picker, MONTH-PILL-LABEL-PLAN): a "Show" switch edits the grey text ONLY. With no
# label chosen an Episodes calendar's bar NAMES the episode and its grey text is the week, so Show Episodes off has
# nothing to take away. It used to drop the grey text of ruling 8's week pills. The pilllabel leg holds what the
# switch does where the episodes ARE grey text (Week mode).
chk(a.get('prefIdsInFields')==[] and jp and a.get('pillsEpsOff')==jp and a.get('pillsEpsBackOn')==jp,
    "shootorder: 'Show Episodes' off changes nothing while the bar names the episode, and no pref- id is in fields.byId")
# ⚠️ REVISED 16 Oct 2026 (MONTH-PILL-LABEL-PLAN step 3): the month box now opens on the "Label Production by" control,
# and its Show rows are contextual (plan 5.2). On this Episodes calendar, with no label chosen, the bar names the
# episode: only Show Production Week is offered. pilllabel C3 holds the full table on eight calendars.
chk(a.get('rowsInMonth')=={'onecol':False,'label':True,'week':True,'blocks':False,'eps':False} and a.get('rowsInSheet')=={'onecol':True,'label':False,'week':False,'blocks':False,'eps':False},
    f"shootorder: Preferences rows follow the view and the label -- month {a.get('rowsInMonth')}, waterfall {a.get('rowsInSheet')}")
chk((a.get('afterBefore') or [''])[0]=='210' and a.get('afterAfter')==['210','205','202','204','201','203','206','207','208','209'],
    "shootorder: dragging a grip drops BEFORE (upper half) and AFTER (lower half) a row")
chk(a.get('dragMetaSame') and a.get('dragGridSame'),
    "shootorder: ⭐ LABELS, NOT DATES -- re-sequencing the shoot left the wrap and the whole grid untouched")
chk(a.get('oneUndoExact'), "shootorder: each move is ONE undo step")
chk(not a.get('errors'), f"shootorder: 0 console errors {a.get('errors')}")
sys.exit(bad)
PYS

# ---- pilllabel: Production's month bars labelled by Week, Episode or Block (MONTH-PILL-LABEL-PLAN.md step 2) -------
# ⭐ ADDED 15 Oct 2026, rebuilt on half-days. No control exists yet (step 3), so each label is opened the way a saved
# calendar delivers it: the fixture's own JSON with `mvProdLabel` set or removed, through the real Load path. Every
# label is held to the same file with no key (not chosen, which follows Schedule by and is what gates 10 and 13 hold):
# labelled by Week, ONE BAR PER WEEK (owner's picker) exactly over base's days with ruling 8's grey text; labelled by
# Episode on a Blocks calendar, base's own bars (Q6, text only) with the plan's text. Also: the default label, 'block'
# on an Episodes calendar (Q11), a no-key file after a labelled one and a bad value are byte-identical to no key; the
# Show switches edit grey text only (Q9); Save writes the key back, and never writes one nobody chose (Q10). The
# sanitizer's warning for the bad value is the one console line allowed.
# ⭐ STEP 3 (16 Oct 2026): the same leg then drives the REAL control, Preferences > "Label Production by", by
# clicking its segments: C (what it shows on open; plan 5.2's Show rows), B (Block disabled on an Episodes
# calendar, its tooltip, Q11's guard), S (the Show switches: no undo step, never in the file) and M (each label
# picked: the file-with-that-key's month view byte for byte, dirty, ONE undo step, Redo, Save, the Load round trip,
# and Schedule by's own label clearing the key). Virtual budget 1500 (was 900), for the extra loads.
for PLSTATE in blocks blocksoff dayoverrides dayoverrides-onhalf shootorder month-dense60 carry-rich halfdays; do
  rm -f "$HERE/pilllabel.json"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$PLSTATE" "$HERE/run.sh" pilllabel 1500 >/dev/null 2>&1
  python3 - "$HERE/pilllabel.json" "$PLSTATE" <<'PYPL' || FAIL=1
import json,sys
bad=0
def chk(c,m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ')+m)
    if not c: bad=1
st=sys.argv[2]; L='pilllabel ('+st+')'
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  '+L+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+L+' threw: '+str(a['EX'])[:200]); sys.exit(1)
blk = a.get('scheduleBy') == 'blocks'
chk(a.get('bars',0) > 0 and a.get('fixtureHasKey') is False, f"{L}: {a.get('bars')} Production bars in {a.get('months')} months, Schedule by {a.get('scheduleBy')}, the fixture carries no key")
chk(a.get('W0') is True, f"{L}: W0 the label Schedule by gives ('{'block' if blk else 'episode'}') is byte-identical to no key {a.get('W0')}")
if not blk: chk(a.get('W1') is True, f"{L}: W1 'block' on an Episodes calendar follows Schedule by -- byte-identical to no key {a.get('W1')}")
chk(a.get('W2') is True, f"{L}: W2 a no-key file opened after a 'week' file is byte-identical to no key (restored unconditionally) {a.get('W2')}")
chk(a.get('W3') is True, f"{L}: W3 an unknown value opens as no key {a.get('W3')}")
wk = a.get('week') or {}
chk(wk.get('bars',0) > 0 and wk.get('notRuns') == [] and wk.get('wrong') == [] and wk.get('oneDayTagged') == [],
    f"{L}: WK labelled by Week, ONE BAR PER WEEK: each row's bars are exactly base's runs of days (no stacking), 'Production Week K', ruling 8's grey text, none on a one-day bar ({wk.get('bars')} bars) {wk.get('notRuns') or ''} {wk.get('wrong') or ''}")
if wk.get('unknownWeek'): print(f"  INFO  {L}: Week: {wk['unknownWeek']} bar(s) in a row with no week to compare against (text checked by pattern)")
if blk:
    ep = a.get('episode') or {}
    chk(a.get('G') is True, f"{L}: G labelled by Episode draws the SAME bars as no key -- month, row, columns, lane {a.get('G')}")
    chk(ep.get('bars') == a.get('bars') and ep.get('wrong') == [] and ep.get('slash') == [] and ep.get('oneDayTagged') == [],
        f"{L}: T labelled by Episode: every bar's text and grey text is the plan's table, no ' / ', no grey on a one-day bar {ep.get('wrong') or ''}")
    if ep.get('fallback'): print(f"  INFO  {L}: Episode: read as Week (a block with no episodes): {ep['fallback'][:3]}")
chk(a.get('X1') is True and a.get('X1back') is True,
    f"{L}: X1 the unit's own Show switch ({'Blocks' if blk else 'Episodes'}) off changes NOTHING while the bar names it -- ruling Q9 {a.get('X1')}")
X2 = a.get('X2') or {}
chk(X2 and all(v.get('bars') is True and v.get('text') is True for v in X2.values()),
    f"{L}: X2 in Week mode each Show switch drops only its item from each list in the grey text, and no bar moves {X2}")
chk(a.get('K0') == {'has': True, 'value': 'week'}, f"{L}: K0 Save writes mvProdLabel back {a.get('K0')}")
chk(a.get('K1') == {'has': False}, f"{L}: K1 Save of a file nobody labelled writes NO key {a.get('K1')}")
# ---- step 3: the real control, Preferences > "Label Production by" (16 Oct 2026) ----
dflt = 'block' if blk else 'episode'
C = a.get('C') or {}
CK = ['none', 'week', 'episode', 'block']
chk(all(C.get(k, {}).get('ids') == 'mv-prod-label-week,mv-prod-label-episode,mv-prod-label-block' for k in CK),
    f"{L}: C0 the control's three radios carry STABLE ids on every open (its explicit name), so nothing re-rolls per load")
shown = {k: C.get(k, {}).get('got') for k in CK}
chk(shown == {'none': dflt, 'week': 'week', 'episode': 'episode', 'block': dflt},
    f"{L}: C1 on open the control shows the label the bars are drawn in -- no key = Schedule by ({dflt}), 'block' on an Episodes calendar = Episode (Q7, Q10, Q11) {shown}")
chk(all(C.get(k, {}).get('blockDisabled') is (not blk) for k in CK),
    f"{L}: C2 Block is {'enabled on a Blocks' if blk else 'DISABLED on an Episodes'} calendar")
chk(all(C.get(k, {}).get('rowsOk') is True for k in CK),
    f"{L}: C3 the Show rows are plan 5.2's table for each label -- {[(k, C.get(k, {}).get('rows')) for k in CK]}")
B = a.get('B') or {}
if blk:
    chk(B.get('tooltipRef') is False, f"{L}: B an enabled Block carries no tooltip")
else:
    chk(B.get('afterBlockClick') == 'episode' and B.get('undoOffAfterBlockClick') is True,
        f"{L}: B1 a click on the disabled Block changes nothing -- no pick, no undo step {B}")
    chk(B.get('describedBefore') is None and bool(B.get('describedAfter')),
        f"{L}: B2 hovering the disabled Block opens its reason tooltip (aria-describedby {B.get('describedBefore')} -> {B.get('describedAfter')})")
    chk(B.get('undoOffAfterEpisodeClick') is True and B.get('savedKey') == 'block',
        f"{L}: B3 Q11's guard: Episode clicked where a stored 'block' already shows as Episode is not a pick -- no undo step, Save keeps 'block' {B.get('savedKey')}")
S = a.get('S') or {}
chk(S.get('undoBefore') is True and S.get('undoAfterOff') is True and S.get('undoAfterOn') is True and S.get('statusAfterOff') == S.get('statusBefore'),
    f"{L}: S1 the three Show switches, each off then on, push NO undo step and leave the calendar clean {S.get('statusBefore')!r} -> {S.get('statusAfterOff')!r}")
chk(S.get('allOff') == [False, False, False] and S.get('stored') == [False, False, False] and S.get('storedAfterOn') == [],
    f"{L}: S2 they are per user: stored in localStorage while off (absent = on), gone again when on {S.get('stored')} {S.get('storedAfterOn')}")
SF = S.get('file') or {}
chk(SF.get('n', 0) > 0 and SF.get('bad') == [] and SF.get('top') == [],
    f"{L}: S3 saved with all three off, the file carries none of them -- no mvWeek/mvBlocks/mvEpisodes key, no pref-/mv-prod-label id in fields.byId ({SF.get('n')} ids) {SF}")
M = a.get('M') or {}
chk(sorted(M.keys()) == (['episode', 'week'] if blk else ['week']),
    f"{L}: M the control can pick {sorted(M.keys())} away from the default ({dflt})")
for m, R in sorted(M.items()):
    chk(R.get('view') is True and R.get('rows') is True,
        f"{L}: M {m}: picked by the control, the month view is byte-identical to the file opened with mvProdLabel '{m}', and the rows follow {R.get('view')}")
    sa, sb = R.get('statusAfter') or '', R.get('statusBefore') or ''
    chk(sa != sb and ('Unsaved' in sa or 'Autosave' in sa),
        f"{L}: M {m}: the pick dirties the calendar {sb!r} -> {sa!r}")
    chk(R.get('undoBefore') is True and R.get('undoAfter') is False and R.get('undoView') is True and R.get('undoEmpty') is True,
        f"{L}: M {m}: ONE undo step -- one Undo restores no key's month view and empties the stack")
    chk(R.get('redoReady') is True and R.get('redoView') is True,
        f"{L}: M {m}: Redo re-applies it, byte-identical")
    RF = R.get('savedFields') or {}
    chk(R.get('savedKey') == m and RF.get('bad') == [] and RF.get('top') == [] and RF.get('n') == SF.get('n'),
        f"{L}: M {m}: Save writes mvProdLabel '{R.get('savedKey')}', and fields.byId is unchanged ({RF.get('n')} ids, none of the control's)")
    chk(R.get('reopened') == m and R.get('reopenView') is True,
        f"{L}: M {m}: Save -> Load round trip: the control shows '{R.get('reopened')}' and the month view is the same")
    chk(R.get('defaultView') is True and R.get('defaultSavedHasKey') is False,
        f"{L}: M {m}: picking Schedule by's own label ({dflt}) draws no key's view and Save writes NO key (Q10)")
errs = [e for e in (a.get('errors') or []) if 'were not in a form the app writes' not in e]
chk(not errs, f"{L}: 0 console errors beyond the bad value's warning {errs}")
sys.exit(bad)
PYPL
done

# ---- the audit-fix legs (FIX-PLAN batches 1, 2 + 3): one generic block -----------------------------
# ⛔ ADDED 29 Sep 2026. FIX-PLAN §1 says a leg that guards the save format, an export or a date is
# wired into this gate -- and batch 1's six legs never were: "full gate 376/0" at the v1.3.0 cut did
# not include one of them. Each of these legs judges itself and reports either {cases:[{id,pass}]}
# (every case must be pass === true) or a top-level {pass}. Their err lists are NOT checked here: the
# hostile and loadfail legs log expected warnings by design and assert on them themselves.
# Each spec is <leg>:<fixture, or - for none>:<virtual budget>. conflict needs 2400 virtual seconds:
# three autosave ticks at 10 minutes each, fast-forwarded while the page is idle. loadfail needs 1500
# since batch 5 (30 Sep 2026): its AS/AR cases wait out two autosave ticks.
# halfworked is not an audit fix: it guards the 'onhalf' day override (29 Sep 2026) -- a date (the
# wrap) and the month view's marks -- which is exactly the kind of leg FIX-PLAN §1 says belongs here.
# Since 15 Oct 2026 the 'half'/'onhalf' marks are WITHDRAWN as choices (a half day is an episode's .5,
# the halfdays leg), so it loads dayoverrides-onhalf and guards the saved marks: honoured, shown,
# moved with the calendar, clearable, and never offered again.
# pwagate + pwagatelogic guard the install gate (PWA-ONLY-PLAN.md, 30 Sep 2026): the hosted link's
# browser tab shows only the gate and never starts the engine, with the owner's approved wording.
# First in the list on purpose: the batch-4 session appends at the END, so the two never conflict.
# interfonts guards the month PDF's four static Inter programs (MONTH-PDF-WRITER-PLAN.md §8 step 1,
# 1 Oct 2026): read by the frozen ttf* functions, every glyph's advance within half a font unit of
# the browser's own unkerned width at its weight. Second line on purpose, for the same reason.
# monthlayout guards the writer's layout model (§8 step 2, 1 Oct 2026), beside interfonts. With no
# fixture it reads tier 1, the eight gate-10 print documents that cover the nine calendars, from the
# monthprint baselines; colswap-simpost-refuse adds the one kind of bar tier 1 never prints,
# Simultaneous Post (mutant M11 is green on tier 1 and red there). It judges the model against this
# leg's own reading of the print document, the lanes against a re-pack at the document's own spans,
# and every note's line breaks against Chrome's own breaker on the same font program.
# filekeys guards the file actions' keyboard shortcuts (owner, 1 Oct 2026): ⌘N New, ⇧⌘S Save As and
# ⇧⌘E Export click their buttons, on the platform's command key only, and never while a dialog is open.
# dlgkeys guards ⌘S, ⌘Z and ⇧⌘Z under the app's dialogs (19 Oct 2026): none of them may act while a question
# (or the template header editor) is up. Before, ⌘Z under "Remove hiatus?" made Remove do nothing, under "Remove
# phase?" it left a ghost row, and ⌘S under the Region's "Continue?" on a file changed on disk dropped the Region
# change. It loads its own linked file through the fake picker, so it takes no state. In-field undo stays (X1, X2).
# undokeys guards ⌘Z / ⇧⌘Z after every kind of edit (owner, 22 Oct 2026): right after a checkbox, a Settings switch
# or a typed date (none has an undo of its own, so the keys used to do nothing), and after a grid drag that left the
# cursor in a sidebar text box (the keys used to go to the box). And a view switch is not an undo step. A text box
# you are typing in still keeps ⌘Z (X1, X2), and the saved file still records its view (X3).
# launchopen guards double-click-to-open (1 Oct 2026): a .sptcal the OS hands the installed app
# through launchQueue loads exactly as Load... does -- the unsaved-work question, recents, write-back.
# halfdays guards half days (owner, 15 Oct 2026): an episode's or block's day count may end in .5, and the
# switch day carries both units' bars in the month view. It cut tests/fixtures/halfdays.sptcal. Since 16 Oct 2026
# (HALF-SQUARE-BARS-PLAN.md, a frozen edit the owner approved by picker) the two bars share ONE lane and meet half way
# through the day's square; they used to stack.
# halfmarks (16 Oct 2026, same plan) puts a saved ½ mark inside such a bar: dayoverrides-onhalf with Episode 201 at 4.5,
# so the switch days land ON marked days. It measures where every shade lands (the frozen halfSlices re-fit) and cut
# tests/fixtures/halfmarks.sptcal, on which monthlayout (P1: the writer reads each slice back to its marked day; L0:
# the writer's half-aware lane packing) and monthwriter (hm, below) then run. monthlayout on halfdays holds the writer's
# packing to the print document's one-lane switch days.
# mvmenu guards the month view's day menu (MONTH-CONTEXT-MENU-PLAN.md, 19 Oct 2026): a right-click on a day, its
# guards and close rules, and its items, each one undo step, on halfdays.sptcal. Every right-click is hit-tested
# (dispatched on elementFromPoint). It grows with each plan step. Since step 4 (ruling L1) also the LEFT-click on a
# day's number, which retired the Full day/Off popover: the shoot-day section, the toggle that keeps
# double-click-to-clear working, and where it opens under the number; and Remove <phase>… on a custom phase's bar.
# halfdays (D5) and halfworked read that section's data-ov rows where they read the popover's.
# wfmenu guards the waterfall's right-click menu (WATERFALL-CONTEXT-MENU-PLAN.md, rulings R1-R7, 22-23 Oct 2026), the
# same engine as mvmenu's, on halfdays.sptcal. LEAN BY RULING (owner, 23 Oct 2026: no Swap column, no Add note), so
# every cell kind's EXACT item list is asserted: a phase week (Start / End <phase> this week, a greyed pair when
# refused; Add 1-week phase here; Add hiatus), a Notes cell (Cut / Copy / Paste / Clear, Back to automatic text), a
# band (Remove hiatus…), a date or empty cell, a highlight of several; an item that cannot act is left out (R6), Size
# only after a hand resize. Each item one undo step; Show this day / week in the month view banks none and rings the
# day. Cut keeps the note when the clipboard refuses. Red on the pre-change build. mvmenu G3 now expects it too.
# mvnotes guards bundle A of the 20 Oct 2026 gap list (MONTH-NOTES-PLAN.md, the owner's rulings by picker): the day-note
# editor's palette, No fill and remembered colour (P), one month each side and the custom holidays drawn there (E),
# notes on every hiatus day (H), Paste notes… (V) and one-day custom pills that wrap (W). LIVE builds the synthetic
# calendar through the UI and mints tests/fixtures/mvnotes.sptcal; the second run holds that file to the same facts.
# labelsetup guards bundle B of 20 Oct 2026 (LABELS-SETUP-PLAN.md), 40 cases on halfdays and the fixtures it opens through
# the real Load path: "Ep." only before numbers (E), Blocks without an episode count and the old-file rule on a REAL v1.5.0
# Save (B, tests/fixtures/blocks-noeps-v1.5.0.sptcal), the weekend just before the first shoot day ('lead', L), the month
# header's sizes 10-12 and the fixed-date token (H), France (F), and a hiatus band's Colour… and Number weeks (C). Twenty
# mutants of the build each turn their own cases red; on v1.5.0 only the controls pass.
# phiatusnum (owner ruling 8, 20 Oct 2026) is a phase hiatus's "Number weeks": every output's band text (the
# waterfall, Excel, the waterfall PDF, the month view and the WRITTEN month PDF, both PDFs read in the page), the
# box's hit-test and id hygiene, one undo step, the save key, a byte-identical file after untick, Load and the M-5
# trap, New, Shift All and a band retyped in the grid (kept as typed, the owner's ruling).
# mvhdroff (owner, 23 Oct 2026) is the month view's Header: Off: the menu row, the header collapsed on screen with the
# waterfall's untouched, the PRINT rollback's weeks gaining the same height on every page (the frozen fit measures
# from .mv-header's top, which a display:none header would not have), the written month PDF with no header lines and
# its month bar higher, one undo step, Off over Manual, Save/Load, the M-5 trap, a junk value, and the template editor.
# autonotekinds (owner ruling 9, 20 Oct 2026) is the Automatic notes card: a kind switched off leaves the waterfall,
# Excel, the waterfall PDF, the month view and the written month PDF (with a positive control, A0b, because that
# writer wraps a note into short runs), a user's own and edited notes stay exactly as typed, one undo step, the save
# key with the id set and userNotes unchanged, a byte-identical file once every kind is back on, Shift All, Load and
# the M-5 trap, and New.
# phasecolors (owner ruling 5, 20 Oct 2026) is the five colours appended to PHASE_COLOR_OPTIONS: the picker's 14 in
# order (the old nine first: the array's order is save format), each new colour in the waterfall (black text), Excel's
# fills, both PDFs' fill operators and the month view's bars and inks, both index stores through Save and Load, and a
# new custom phase's default colour still cycling through the first nine only.
# calrange guards the calendar range (owner ruling 3, 20 Oct 2026): the Show tab's start/end dates replace the
# waterfall's full-year padding. On a synthetic calendar, every expectation derived from the same calendar with the
# range blank: the rows kept (and their labels), the strip naming the phases cut, Excel's Date columns, the waterfall
# PDF's text, the month view identical month by month, Single Column Mode, the shift tools, bad dates, Save/Load
# with the M-5 trap, the shareable copy and New.
# hdrrow guards the waterfall's header text and dates (owner rulings 2, 4 and 10, 20 Oct 2026; HEADER-ROW-PLAN.md):
# Header: Off, the 1/6/2025 date format and custom column headings -- each inert by default (its I cases), each
# driven through its real control and read back from the screen, the workbook and the waterfall PDF, each one undo
# step, saved, loaded and immune to the M-5 trap. Red on the pre-change build; eight mutants, each red. Its own
# line, mid-list, so sessions appending at the end never conflict with it. Since 20 Oct 2026 it also drives the
# heading editor's Split / ← Merge / Merge → buttons and the `headerRowSplits` key (cases S1-S5). Since 22 Oct 2026
# (HEADINGS-EDITABLE-PLAN.md, frozen edits H1-H3) there is no switch: every heading opens the editor by
# double-click, an untouched calendar keeps the original path's markup, and a Reset of the last typed heading puts
# the original path's workbook row 1 and PDF content stream back byte for byte (H9). Red on the hide-notes build.
# settingswin guards the Settings window (owner ruling 12, 20 Oct 2026), which took over the sidebar's old Settings
# tab: every moved id is in it once, on its tab; fields.byId gets #union-place and the two custom-holiday fields in
# their old order and nothing else from it; each moved calendar setting saves, resets on New and restores on Load;
# opening it is no undo step; a re-render never puts a Mantine Switch's stale state over the engine's (W9); it covers
# the sidebar and moves neither the preview nor the grid box; and an old file's sidebarTab 'settings' opens on Show.
# phasefold guards the caret on every phase card (owner, 20 Oct 2026): a hit-tested click folds a card to its colour
# bar and name line, the name still editable; the fold is session UI (the calendar is not marked changed, the grid is
# unchanged, a Save is byte-identical); Production's episode list folds too; undo and redo rebuild a folded custom row
# folded; a new phase on an undone phase's key opens unfolded; Show in Phases card unfolds; Load and New unfold all.
# Its own line, mid-list, so sessions appending at the end never conflict with it.
# papersize guards the paper the waterfall PDF and the workbook are laid out for (owner, 21 Oct 2026; PAPER-SIZE-PLAN.md,
# rulings R1-R4): the Paper select in Settings ▸ Preferences ▸ Waterfall, inert on Letter (no key, a Letter page box,
# Excel paper 1), Legal and Tabloid read back from the PDF's page box and Excel's paper number (5, 3), the PDF and the
# workbook turning the same way on one to four year blocks, side boxes, Header: Off and Single Column (which follows
# the paper, R3), Save/Load with the M-5 trap, one undo step, New. pdfdialog guards the Export PDF dialog (§5a,
# rulings D1-D3), driven by hand: it is the one leg that takes the dialog over from t/lib.js, which answers it at its
# defaults in every other leg -- so every PDF this gate compares went through it. Own lines, mid-list.
# regionmirror guards the Production Region's second select (owner, 21 Oct 2026), under Version in Show info: the
# id-less select.region-mirror, right after #show-version, offering #union-place's exact options; a pick there goes
# through #union-place's own change handler (no dialog with nothing to misplace; with a note, the "Continue?" question,
# both selects holding the old Region while it asks, Cancel and Continue), fields.byId gains no key, and undo and Load
# write both. Two mutants, each red: no write-back (M3/M5/M6/M8), the copy bypassing the question (M6/M7). Own line.
for AFSPEC in pwagate:-:120 pwagatelogic:-:120 settingswin:-:240 \
              interfonts:-:60 monthlayout:-:150 monthlayout:colswap-simpost-refuse:150 \
              loadcarry:-:90 hiatusblank:hiatus-blank:90 hostile:xss-mixed:240 sharecopy2:-:90 loadfail:-:1500 \
              snapoff:snapoff-sheet:60 snapoff:snapoff-onecol:60 snapoff:snapoff-friday:60 \
              rowheight:shift-stores:90 yearblock:-:90 caps:-:120 overrides:dayoverrides:150 \
              autonote:v1.3.0-saved:150 snaptools:dayoverrides:150 holidays2031:-:150 \
              monthnotes:monthnotes:150 conflict:-:2400 backupslots:-:120 \
              halfworked:dayoverrides-onhalf:150 monthlanes:month-lanecap:150 hiatuslabel:-:150 \
              notewrap:-:150 hdrcut:hdr-cut:150 xlsxlimits:-:150 xlsxdates:-:150 \
              legacyparse:-:900 hdroverrides:-:150 badyear:-:120 spanhint:-:150 \
              wholenum:-:150 regionlock:-:150 nofsa:-:150 exportrefused:-:150 \
              regioncaveat:-:120 simpostlabel:-:120 prodspan:-:150 winansi:-:150 \
              numclamp:v1.4.0-saved:150 cmdprint:v1.4.0-saved:150 \
              noresetall:-:120 hdrcontrols:carry-rich:170 noswapbtns:colswap-gesture:60 \
              hdrrow:-:400 \
              regionmirror:-:150 \
              papersize:-:500 \
              pdfdialog:-:500 \
              phasefold:-:300 \
              filekeys:v1.4.2-saved:150 dlgkeys:-:240 undokeys:-:240 \
              launchopen:-:240 halfdays:-:150 halfmarks:dayoverrides-onhalf:150 \
              monthlayout:halfdays:150 monthlayout:halfmarks:150 \
              mvmenu:halfdays:150 wfmenu:halfdays:400 \
              mvnotes:-:600 mvnotes:mvnotes:600 labelsetup:halfdays:600 \
              phiatusnum:-:300 autonotekinds:-:300 phasecolors:-:300 calrange:-:300 \
              mvhdroff:-:400; do
  AFLEG="${AFSPEC%%:*}"; AFREST="${AFSPEC#*:}"; AFSTATE="${AFREST%%:*}"; AFSECS="${AFREST#*:}"
  [[ $AFSTATE == - ]] && AFSTATE=""
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$AFSTATE" "$HERE/run.sh" "$AFLEG" "$AFSECS" >/dev/null 2>&1
  python3 - "$HERE/$AFLEG.json" "$AFLEG${AFSTATE:+ ($AFSTATE)}" <<'PYAF' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
cases = a.get('cases')
if isinstance(cases, list) and cases:
    bad = [c for c in cases if c.get('pass') is not True]
    for c in cases:
        print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
    sys.exit(1 if bad else 0)
if a.get('pass') is True:
    print('  PASS  '+label+': pass'); sys.exit(0)
print('  FAIL  '+label+': '+json.dumps(a)[:300]); sys.exit(1)
PYAF
done

# ---- mvnotes' WRITTEN month PDF: the one-day custom pills wrap in the file users get (MONTH-NOTES-PLAN.md §6) ---------
# ⭐ ADDED 20 Oct 2026. The leg's last run (the minted fixture) hands back the written PDF, mvnotes.month.pdf. Its text,
# by pdftotext, must carry each wrapping pill's label as TWO lines, the writer's own breaks, and the Friday piece cut
# with "…" at the end of its second line. `monthemit` cannot see this: it compares only weeks the writer lays out as the
# print document does, and a pill that stops wrapping changes its week's lanes. Mutant m11 (the writer never wraps) is
# green there and red here.
python3 - "$HERE/mvnotes.month.pdf" <<'PYMN' || FAIL=1
import subprocess, sys
bad = 0
def chk(c, m):
    global bad
    print(('  PASS  ' if c else '  FAIL  ') + m)
    if not c: bad = 1
try: txt = subprocess.run(['pdftotext', '-layout', sys.argv[1], '-'], capture_output=True, text=True, check=True).stdout
except Exception as e:
    print('  FAIL  mvnotes month PDF: unreadable: ' + str(e)); sys.exit(1)
L = [l.strip() for l in txt.split('\n')]
def follows(a, b): return any(L[i].startswith(a) and i + 1 < len(L) and L[i + 1].startswith(b) for i in range(len(L)))
chk(follows('Network Table Read and', 'Studio Notes Session'),
    'mvnotes month PDF: the one-day phase\'s name wraps to two lines ("Network Table Read and" / "Studio Notes Session")')
chk(sum(1 for l in L if l == 'Camera Tests With Th\u2026') == 2 and sum(1 for l in L if l.startswith('Costume and Hair') and l == 'Costume and Hair') == 2,
    'mvnotes month PDF: the Friday piece wraps and is cut with "\u2026" at the end of its second line, on both pages that show 5/1/26')
chk(any(l.startswith('Costume and Hair Camera Tests With The Director Week 2') for l in L),
    'mvnotes month PDF: the same phase\'s full-week piece stays one line')
sys.exit(bad)
PYMN

# ---- monthemit (MONTH-PDF-WRITER-PLAN.md §8 step 3): the month-PDF writer's emitter + serializer --------
# ⭐ ADDED 1 Oct 2026. The leg slices the writer out of src/legacy/app.js (owner ruling: "slice it, no hook"
# extends to the emitter), lays every print document out in Chrome with the app's print rules, hands the emitter
# Chrome's own week heights (owner ruling: "Chrome's, measured"), and holds every box, baseline, colour and font
# it draws to Chrome's, and every byte it writes to what the file must be (16 cases; 24 mutants, each red). Tier 1
# is the eight gate-10 print documents plus six header/ellipsis variants made from reference's first page.
#   run a  as everything else runs;
#   run b  under TZ=Pacific/Kiritimati (UTC+14) in a 1280 x 900 window: ⛔ every file must be BYTE-IDENTICAL to
#          run a's, and the leg must report that the zone and the window really changed (a control that changed
#          nothing would pass vacuously);
# then poppler reads every file of run a: pdfinfo and pdftotext with an empty stderr, the page count, 792 x 612,
# and pdffonts finding only embedded TrueType. colswap-simpost-refuse adds Simultaneous Post and the one tier-2
# week whose lanes print squeezed (mutant E9, lanes always at their limit, is green on tier 1 and red there), run
# in both time zones and required byte-identical too. The today stamp is pinned inside the leg (owner ruling), so
# no comparison here needs pdfcmp.py's date exemption.
MEA="/tmp/gate${GTAG}-mea"; MEB="/tmp/gate${GTAG}-meb"
rm -rf "$MEA" "$MEB"; mkdir -p "$MEA" "$MEB"
# mvnotes (20 Oct 2026, MONTH-NOTES-PLAN.md) adds No fill notes (listed, never painted) and one-day custom pills that wrap.
for MESPEC in "a::-" "b:Pacific/Kiritimati:1280,900" "sa:-:-:colswap-simpost-refuse" "sb:Pacific/Kiritimati:-:colswap-simpost-refuse" \
              "na:-:-:mvnotes"; do
  MERUN="${MESPEC%%:*}"; MEREST="${MESPEC#*:}"; METZ="${MEREST%%:*}"; MEREST="${MEREST#*:}"
  MEWIN="${MEREST%%:*}"; MESTATE=""; [[ "$MEREST" == *:* ]] && MESTATE="${MEREST#*:}"
  [[ $METZ == - ]] && METZ=""; [[ $MEWIN == - ]] && MEWIN=""
  rm -f "$HERE/monthemit.json"
  ( [[ -n $METZ ]] && export TZ="$METZ"; [[ -n $MEWIN ]] && export HARNESS_WINDOW="$MEWIN"
    HARNESS_PAGE="$PAGE" HARNESS_STATE="$MESTATE" "$HERE/run.sh" monthemit 240 >/dev/null 2>&1 )
  python3 - "$HERE/monthemit.json" "monthemit (${MESTATE:-tier 1}${METZ:+, $METZ}${MEWIN:+, $MEWIN})" "$METZ" "$MEWIN" <<'PYME' || FAIL=1
import json,sys
path, label, tz, win = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
info = a.get('info') or {}
bad = not cases or not all(c.get('pass') is True for c in cases)
if tz:
    z = (info.get('tz') or {}).get('zone')
    print(('  PASS  ' if z == tz else '  FAIL  ')+label+': the leg ran in '+str(z)); bad = bad or z != tz
if win:
    w = (info.get('window') or [None])[0]
    print(('  PASS  ' if str(w) == win.split(',')[0] else '  FAIL  ')+label+': the window was '+str(w)+' wide'); bad = bad or str(w) != win.split(',')[0]
sys.exit(1 if bad else 0)
PYME
  case $MERUN in a|sa) cp "$HERE"/monthemit.*.pdf "$MEA"/ 2>/dev/null ;; b|sb) cp "$HERE"/monthemit.*.pdf "$MEB"/ 2>/dev/null ;; esac
done
python3 - "$MEA" "$MEB" <<'PYMF' || FAIL=1
import os, re, subprocess, sys, shutil
a, b = sys.argv[1], sys.argv[2]
bad = 0
def chk(cond, msg):
    global bad
    print(('  PASS  ' if cond else '  FAIL  ') + msg); bad += 0 if cond else 1
tools = [t for t in ('pdfinfo', 'pdftotext', 'pdffonts') if not shutil.which(t)]
if tools:
    chk(False, 'monthemit files: poppler is not installed (' + ', '.join(tools) + '): brew install poppler'); sys.exit(1)
fa, fb = sorted(os.listdir(a)), sorted(os.listdir(b))
chk(len(fa) == 15 and fa == fb, 'monthemit files: the same %d files from both time zones (tier 1 + variants + colswap-simpost-refuse)' % len(fa))
for n in fa:
    pa = os.path.join(a, n)
    same = os.path.exists(os.path.join(b, n)) and open(pa, 'rb').read() == open(os.path.join(b, n), 'rb').read()
    info = subprocess.run(['pdfinfo', pa], capture_output=True, text=True)
    text = subprocess.run(['pdftotext', pa, '-'], capture_output=True, text=True)
    fonts = subprocess.run(['pdffonts', pa], capture_output=True, text=True)
    pages = int((re.search(r'^Pages:\s+(\d+)', info.stdout, re.M) or [0, 0])[1])
    size = (re.search(r'^Page size:\s+(.*)$', info.stdout, re.M) or [0, ''])[1]
    rows = [l for l in fonts.stdout.splitlines()[2:] if l.strip()]
    fontsOk = bool(rows) and all(' TrueType ' in l and re.search(r'WinAnsi\s+yes\s+yes', l) for l in rows)
    chk(same and not info.stderr.strip() and not text.stderr.strip() and not fonts.stderr.strip() and pages > 0
        and size.startswith('792 x 612') and fontsOk,
        'monthemit %s: byte-identical in UTC+14%s, %d page%s at %s, poppler reads it clean, %d embedded TrueType fonts'
        % (n.replace('monthemit.', '').replace('.pdf', ''), '' if same else ' -- NOT', pages, '' if pages == 1 else 's', size.split(' pts')[0], len(rows)))
sys.exit(1 if bad else 0)
PYMF

# ---- monthwriter (MONTH-PDF-WRITER-PLAN.md §8 step 4): the month-PDF writer's FIT, and the A/B against the print path
# ⭐ ADDED 1 Oct 2026. The leg slices the writer -- model, emitter and fit -- out of src/legacy/app.js, fits every month of
# each print document from the model alone (no DOM: owner ruling 3; the owner's step-4 rulings for a dense month: weeks
# only, lines stay, no floor, re-wrap; an emptied band full height), and holds the fit to three oracles: the print path's
# own fit table, the print path's measurement re-run exactly as exportMonthPdf runs it, and Chrome's layout of the
# writer's own decisions, box for box, a shrunk month restyled at its factor (12 cases; 19 mutants, each red). It then
# leaves the documents in print state, so HARNESS_PRINT_PDF=1 has Chrome print them, and monthab.py judges the writer's
# files against that real print page by page (P0-P5; 4 mutants, each red). Its pixel report and contact sheets are for
# the owner and gate nothing, so they are skipped here: python3 monthab.py ... --sheets <dir> makes them.
#   t1    tier 1: the eight gate-10 documents (124 months; month-lanecap's August shrinks to 30/64);
#   t1z   tier 1 under TZ=Pacific/Kiritimati (UTC+14): ⛔ every writer file byte-identical to t1's;
#   ms/md monthscale and month-dense60, each with an August that shrinks; nw/sr notewrap and stintswap-reshape, weeks
#         the print path measured at another width than it prints; sp colswap-simpost-refuse, Simultaneous Post. Fresh;
#   win   notewrap again, in a 1280 x 800 window: ⛔ its writer file byte-identical to nw's, while the print DOCUMENT
#         must differ -- the print path's note spans follow the window, the writer's do not, and a control that changed
#         nothing would pass vacuously.
#   mv    mvnotes (20 Oct 2026, MONTH-NOTES-PLAN.md): a printed edge month, No fill notes, one-day custom pills that wrap.
#   hd/hm halfdays and halfmarks: switch days whose two Production bars meet half way through the square (16 Oct 2026,
#         HALF-SQUARE-BARS-PLAN.md), the second with saved ½ marks inside those bars. A3 holds every inset box to Chrome.
MWA="/tmp/gate${GTAG}-mwa"; rm -rf "$MWA"; mkdir -p "$MWA"
for MWSPEC in "t1:-:-:-" "t1z:Pacific/Kiritimati:-:-" "ms:-:-:monthscale" "md:-:-:month-dense60" "nw:-:-:notewrap" \
              "sr:-:-:stintswap-reshape" "sp:-:-:colswap-simpost-refuse" "win:-:1280,800:notewrap" "hd:-:-:halfdays" \
              "hm:-:-:halfmarks" "mv:-:-:mvnotes"; do
  MWRUN="${MWSPEC%%:*}"; MWREST="${MWSPEC#*:}"; MWTZ="${MWREST%%:*}"; MWREST="${MWREST#*:}"
  MWWIN="${MWREST%%:*}"; MWSTATE="${MWREST#*:}"
  [[ $MWTZ == - ]] && MWTZ=""; [[ $MWWIN == - ]] && MWWIN=""; [[ $MWSTATE == - ]] && MWSTATE=""
  rm -f "$HERE/monthwriter.json"
  ( [[ -n $MWTZ ]] && export TZ="$MWTZ"; [[ -n $MWWIN ]] && export HARNESS_WINDOW="$MWWIN"
    HARNESS_PAGE="$PAGE" HARNESS_STATE="$MWSTATE" HARNESS_PRINT_PDF=1 "$HERE/run.sh" monthwriter 300 >/dev/null 2>&1 )
  MWLABEL="monthwriter (${MWSTATE:-tier 1}${MWTZ:+, $MWTZ}${MWWIN:+, $MWWIN})"
  python3 - "$HERE/monthwriter.json" "$MWLABEL" "$MWTZ" "$MWWIN" <<'PYMW' || FAIL=1
import json,sys
path, label, tz, win = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
info = a.get('info') or {}
bad = not cases or not all(c.get('pass') is True for c in cases)
if tz:
    z = (info.get('tz') or {}).get('zone')
    print(('  PASS  ' if z == tz else '  FAIL  ')+label+': the leg ran in '+str(z)); bad = bad or z != tz
if win:
    w = (info.get('window') or [None])[0]
    print(('  PASS  ' if str(w) == win.split(',')[0] else '  FAIL  ')+label+': the window was '+str(w)+' wide'); bad = bad or str(w) != win.split(',')[0]
sys.exit(1 if bad else 0)
PYMW
  mkdir -p "$MWA/$MWRUN"; cp "$HERE"/monthwriter.*.pdf "$HERE/monthwriter.json" "$MWA/$MWRUN"/ 2>/dev/null
  python3 "$HERE/monthab.py" "$HERE/monthwriter.json" "$HERE/monthwriter.print.pdf" --label "$MWLABEL" --no-pixels \
    > "$MWA/$MWRUN.judge" 2>&1
  MWRC=$?
  grep -v '^  INFO' "$MWA/$MWRUN.judge"
  (( MWRC == 0 )) || FAIL=1
done
python3 - "$MWA" <<'PYMWC' || FAIL=1
import json, os, sys
root = sys.argv[1]
bad = 0
def chk(cond, msg):
    global bad
    print(('  PASS  ' if cond else '  FAIL  ') + msg); bad += 0 if cond else 1
def files(run):
    d = os.path.join(root, run)
    return {n: open(os.path.join(d, n), 'rb').read() for n in sorted(os.listdir(d)) if n.endswith('.pdf') and n != 'monthwriter.print.pdf'}
a, z = files('t1'), files('t1z')
chk(len(a) == 8 and sorted(a) == sorted(z), 'monthwriter files: the same %d tier-1 files from both time zones' % len(a))
for n in a:
    chk(n in z and a[n] == z[n], 'monthwriter %s: byte-identical in UTC+14' % n.replace('monthwriter.', '').replace('.pdf', ''))
nw, wn = files('nw'), files('win')
docs = [json.load(open(os.path.join(root, r, 'monthwriter.json'))).get('info', {}).get('docHash') for r in ('nw', 'win')]
same = 'monthwriter.notewrap.pdf' in nw and nw.get('monthwriter.notewrap.pdf') == wn.get('monthwriter.notewrap.pdf')
chk(same and docs[0] and docs[1] and docs[0] != docs[1],
    'monthwriter (notewrap): the writer\'s file byte-identical from a 1600 and a 1280 px window, while the print document differs (%s vs %s)'
    % (docs[0], docs[1]))
sys.exit(1 if bad else 0)
PYMWC

# ---- monthexport (MONTH-PDF-WRITER-PLAN.md §8 step 5): the month view's Export PDF, end to end in the BUILT app -----
# ⭐ ADDED 2 Oct 2026. Since step 5 the month view's Export PDF is the direct writer (ruling 4(a)), and the build carries
# it, minified. The leg drives the real export with the clock pinned (local noon, 22 Sep 2026) and a stood-in Save
# dialog: the file through the Save dialog, ⭐ BYTE-IDENTICAL to what the sliced SOURCE writes for the same calendar
# (the step-3 obligation); a failed build offering the print path; a cancelled dialog; a lapsed activation; the soft
# hyphen dropped; unprintable characters named first; and, after a reload with the File System Access API deleted
# before boot, the same bytes as a download (9 cases; 13 mutants, each red: 11 on the build, 2 on the source).
#   r / b / ms / sp / sr   the reference calendar, then blocks, monthscale (a shrunk August), colswap-simpost-refuse
#                          and stintswap-reshape (25 months), each fresh;
#   rz / rw                the reference again under TZ=Pacific/Kiritimati and in a 1280 x 800 window: ⛔ its file
#                          BYTE-IDENTICAL to r's (the clock is pinned, and the writer reads no window);
#   rt                     the reference on the REAL clock (rtleg.mjs, ?realtime=1), which adds T0: the Save dialog
#                          opens within 2 s of the click, well inside the 5 s a click's activation lasts.
#   do / mh / ml / bo / oh / lc / hb / d6 / mn / so / nw / cr
#                          ⭐ ADDED 5 Oct 2026 (step 6): the rest of tier 1 and tier 2, so that every calendar gate 13
#                          baselines is exported by the built app and held to the slice (X2) in the same run. About
#                          7 s each. Their files feed gate 13, below.
MXA="/tmp/gate${GTAG}-mxa"; rm -rf "$MXA"; mkdir -p "$MXA"
for MXSPEC in "r:-:-:-" "rz:Pacific/Kiritimati:-:-" "rw:-:1280,800:-" "b:-:-:blocks" "ms:-:-:monthscale" \
              "sp:-:-:colswap-simpost-refuse" "sr:-:-:stintswap-reshape" \
              "do:-:-:dayoverrides" "mh:-:-:mvheader" "ml:-:-:mvheaderlegacy" "bo:-:-:blocksoff" "oh:-:-:dayoverrides-onhalf" \
              "lc:-:-:month-lanecap" "hb:-:-:hiatus-blanklabel" "d6:-:-:month-dense60" "mn:-:-:monthnotes" "so:-:-:shootorder" \
              "nw:-:-:notewrap" "cr:-:-:carry-rich" "hd:-:-:halfdays" "nn:-:-:mvnotes"; do
  MXRUN="${MXSPEC%%:*}"; MXREST="${MXSPEC#*:}"; MXTZ="${MXREST%%:*}"; MXREST="${MXREST#*:}"
  MXWIN="${MXREST%%:*}"; MXSTATE="${MXREST#*:}"
  [[ $MXTZ == - ]] && MXTZ=""; [[ $MXWIN == - ]] && MXWIN=""; [[ $MXSTATE == - ]] && MXSTATE=""
  rm -f "$HERE/monthexport.json" "$HERE/monthexport.built.pdf"   # a run that writes nothing must not inherit the last one's file
  ( [[ -n $MXTZ ]] && export TZ="$MXTZ"; [[ -n $MXWIN ]] && export HARNESS_WINDOW="$MXWIN"
    HARNESS_PAGE="$PAGE" HARNESS_STATE="$MXSTATE" "$HERE/run.sh" monthexport 300 >/dev/null 2>&1 )
  cp "$HERE/monthexport.built.pdf" "$MXA/$MXRUN.pdf" 2>/dev/null
  python3 - "$HERE/monthexport.json" "monthexport (${MXSTATE:-reference}${MXTZ:+, $MXTZ}${MXWIN:+, $MXWIN})" "$MXTZ" "$MXWIN" <<'PYMX' || FAIL=1
import json,sys
path, label, tz, win = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
info = a.get('info') or {}
bad = len(cases) < 9 or not all(c.get('pass') is True for c in cases)
if tz:
    z = (info.get('tz') or {}).get('zone')
    print(('  PASS  ' if z == tz else '  FAIL  ')+label+': the leg ran in '+str(z)); bad = bad or z != tz
if win:
    w = (info.get('window') or [None])[0]
    print(('  PASS  ' if str(w) == win.split(',')[0] else '  FAIL  ')+label+': the window was '+str(w)+' wide'); bad = bad or str(w) != win.split(',')[0]
sys.exit(1 if bad else 0)
PYMX
done
rm -f "$HERE/monthexport.json"
HARNESS_PAGE="$PAGE" node "$HERE/rtleg.mjs" --leg monthexport --secs 120 --query realtime=1 >/dev/null 2>&1
python3 - "$HERE/monthexport.json" "monthexport (reference, real time)" <<'PYMXT' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
t0 = [c for c in cases if c.get('id') == 'T0']
print(('  PASS  ' if t0 else '  FAIL  ')+label+': T0 ran (the build timed on the real clock: '+str(((a.get('info') or {}).get('phase1') or {}).get('buildMs'))+' ms)')
sys.exit(0 if cases and t0 and all(c.get('pass') is True for c in cases) else 1)
PYMXT
python3 - "$MXA" <<'PYMXC' || FAIL=1
import os, sys
root = sys.argv[1]
def read(n):
    p = os.path.join(root, n + '.pdf')
    return open(p, 'rb').read() if os.path.exists(p) else None
r = read('r'); bad = 0
for n, what in (('rz', 'UTC+14'), ('rw', 'a 1280 px window')):
    x = read(n); ok = r is not None and x == r
    print(('  PASS  ' if ok else '  FAIL  ') + 'monthexport (reference): the built app\'s file is byte-identical in ' + what); bad += 0 if ok else 1
sys.exit(1 if bad else 0)
PYMXC

# ---- gate 13 (MONTH-PDF-WRITER-PLAN.md §8 step 6): the WRITTEN month PDF against its BYTE BASELINES --------------------
# ⭐ ADDED 5 Oct 2026, cut after the owner signed off a real Export in Preview on 2 Oct (UI-CONVENTIONS §10 item 13). Gate 10 holds
# the PRINT path (the rollback, by its localhost switch); this holds what users get since step 5. Every file monthexport
# wrote above is compared, BYTE FOR BYTE, with tests/baselines/2026-10-05-monthwriter/<case>.pdf by monthbase.py. On a
# mismatch it says which of two things happened, and fails either way:
#   "ONLY CHROME'S COMPRESSOR CHANGED"  every object identical once inflated: a Chrome update re-compressed the pages.
#                                       Re-cut with that output in the baselines' README, and tell the owner.
#   "THE CONTENT MOVED"                 each part that differs, named (page and month, font, page tree). Never re-cut
#                                       without the owner's sign-off on `monthbase.py sheets`' contact sheets.
# rz and rw (UTC+14, a 1280 px window) have no baseline of their own: they are held to reference's. blocksoff (Blocks
# switched to Episodes) has its own since 20 Oct 2026 (its older file reads "Episode N", reference "Shoot Ep. N"); the
# block after this loop still holds its text to reference's once both names are read as the episode.
MWBASE="$HERE/../baselines/2026-10-05-monthwriter"
for MWSPEC in "r:reference:reference" "rz:reference:reference, UTC+14" "rw:reference:reference, a 1280 px window" \
              "b:blocks:blocks" "bo:blocksoff:blocksoff" "ms:monthscale:monthscale" \
              "sp:colswap-simpost-refuse:colswap-simpost-refuse" "sr:stintswap-reshape:stintswap-reshape" \
              "do:dayoverrides:dayoverrides" "mh:mvheader:mvheader" "ml:mvheaderlegacy:mvheaderlegacy" \
              "oh:dayoverrides-onhalf:dayoverrides-onhalf" "lc:month-lanecap:month-lanecap" \
              "hb:hiatus-blanklabel:hiatus-blanklabel" "d6:month-dense60:month-dense60" "mn:monthnotes:monthnotes" \
              "so:shootorder:shootorder" "nw:notewrap:notewrap" "cr:carry-rich:carry-rich" "hd:halfdays:halfdays" \
              "nn:mvnotes:mvnotes"; do
  MWRUN="${MWSPEC%%:*}"; MWREST="${MWSPEC#*:}"; MWCASE="${MWREST%%:*}"; MWLABEL="${MWREST#*:}"
  python3 "$HERE/monthbase.py" check "$MXA/$MWRUN.pdf" "$MWBASE/$MWCASE.pdf" --label "gate 13 month PDF ($MWLABEL)" || FAIL=1
done
# ⭐ The written PDF's half of the same condition: blocksoff's text is reference's, page by page, once both names are read
# as the episode. (Bytes cannot match: "Episode 201" and "Shoot Ep. 201" set different glyphs and widths.)
python3 - "$MXA/bo.pdf" "$MWBASE/reference.pdf" <<'PYBO13' || FAIL=1
import re,subprocess,sys
try: a,b=[subprocess.run(['pdftotext','-raw',f,'-'],capture_output=True,text=True,check=True).stdout for f in sys.argv[1:3]]
except Exception as e:
    print('  FAIL  gate 13 blocksoff vs reference: could not read: '+str(e)); sys.exit(1)
norm=lambda s: re.sub(r'(?:Shoot Ep\.|Episode) (\d+)',r'EP\1',s)
ok=norm(a)==norm(b) and 'Episode ' in a
print(('  PASS  ' if ok else '  FAIL  ')+'gate 13 month PDF (blocksoff): ⭐ its text is reference\'s once episode names are read as the episode')
sys.exit(0 if ok else 1)
PYBO13

# ---- real-time legs (rtleg.mjs): the ones run.sh's virtual clock cannot run -----------------------
# ⭐ ADDED 30 Sep 2026 (batch 4). Same t/<leg>.js, same #R result, same judge as the AFSPEC loop
# above -- only the driver differs: rtleg.mjs runs the page on the REAL clock over CDP, because under
# --virtual-time-budget a service worker's register() never settles (swscope, FIX-PLAN 4.2 /
# SUPPLY-3: the boot clean-up unregisters only workers under the app's own path).
for RTSPEC in swscope:-:90; do
  RTLEG="${RTSPEC%%:*}"; RTREST="${RTSPEC#*:}"; RTSTATE="${RTREST%%:*}"; RTSECS="${RTREST#*:}"
  [[ $RTSTATE == - ]] && RTSTATE=""
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$RTSTATE" node "$HERE/rtleg.mjs" --leg "$RTLEG" --secs "$RTSECS" >/dev/null 2>&1
  python3 - "$HERE/$RTLEG.json" "$RTLEG (real time)" <<'PYRT' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if cases and all(c.get('pass') is True for c in cases) else 1)
PYRT
done

# ---- printpaper (audit L-3, FIX-PLAN 3.5): the month PDF's PAPER is pinned to Letter -------------
# ⭐ ADDED 29 Sep 2026 (batch 3). The month fit is computed in JS for Letter, and the print CSS used
# to say only @page{size:landscape}, leaving the paper to the dialog -- A4 by default outside the US
# and Canada, where the last week of a shrink-to-fit month was cut off. run.sh cannot choose a
# paper, so this is a Node script driving Chrome over CDP (Page.printToPDF): it prints the
# monthprint leg's document at Letter and at A4-with-CSS-size-preferred (what Save as PDF does),
# and passes only if the A4 request produces the SAME Letter pages, stream for stream. Red on the
# build before the pin (A4 box 841.92 x 595.92, 345 vs 344 streams). It uses HARNESS_PORT, and a
# non-default port namespaces its profile as run.sh does.
node "$HERE/printpaper.mjs" --page "$PAGE" --state monthscale >/dev/null 2>&1
python3 - "$HERE/printpaper.json" "printpaper (monthscale)" <<'PYPP' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if cases and all(c.get('pass') is True for c in cases) else 1)
PYPP

# ---- pilldrag (batch 5, MONTH-9): a month pill dragged out and back keeps its Snap to Mon ----------
# ⭐ ADDED 30 Sep 2026. A Node script, like printpaper: the case needs ONE gesture that goes out a day
# and comes back, and only CDP's trusted Input.dispatchMouseEvent produces that (the pane's drag goes
# point to point; dispatchEvent skips hit-testing). Red before the fix on D1 (back at the origin,
# Snap to Mon stayed off, with no undo step) and D4 (through a Tuesday onto the next Monday). D3
# guards the 18 Sep ruling: dropped on a Tuesday, snap comes off and one Ctrl+Z restores both.
# ⭐ 15 Oct 2026: E0-E13 hold Production's handles (MONTH-VIEW-PLAN.md §6.7): the shoot's two ends,
# every episode/block end and every week's edges, each pressed where elementsFromPoint has the handle
# topmost. E5 and E13 load blocks.sptcal, and E14 halfdays.sptcal (a half switch day's two bars, 15 Oct 2026), so the label names all three.
# ⛔ 19 Oct 2026: an episode's end grip REMOVES days and never pushes (owner, replacing ruling 9b). E9, E10,
# E13 and E14 were rewritten from the push and E15 is new (days taken back, then one from the next episode);
# all five ran red on the old build before this landed. The same day each episode's START got its own grip
# (`head`, the mirror; owner: "Were also missing the drag handle at the beginning of episodes/blocks/
# weeks"): E8 and E14 count it, E16-E18 drive it. All nine changed cases are red on the old build.
# ⭐ 19 Oct 2026: E19-E21 and D5 load autonote-grips.sptcal. An EDITED auto-note ("Start Principal Photography
# 6/29/26" + a line of the user's) follows the start grip, the wrap grip and a body-drag, as the shift tools'
# R5 rewrite does (owner: "it doesnt move the comment with it"). All four were red on the build before the fix.
# E22 and E23 hold two owner-approved frozen lines in notesForWaterfallDate (same day): a line dated the 1st-9th is
# drawn on its own day, not its week's Monday, and a line dated outside its note's week is drawn on the Monday (or
# its pinned day) instead of on no day at all. Both were red on the build before those lines.
node "$HERE/pilldrag.mjs" --page "$PAGE" >/dev/null 2>&1
python3 - "$HERE/pilldrag.json" "pilldrag (v1.4.0-saved, blocks, halfdays, autonote-grips)" <<'PYPD' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if cases and all(c.get('pass') is True for c in cases) else 1)
PYPD

# ---- phaseedge: the start and end handles on every phase with a Length select ----------------------
# ⭐ ADDED 16 Oct 2026 (MONTH-VIEW-PLAN.md §6.7, owner rulings 7 and 8; CUSTOM-PHASE-UNITS-PLAN.md step
# 6). pilldrag's sibling, for the same reason a Node script: trusted CDP input, each press where
# elementsFromPoint has the handle topmost. Every edge x unit on customunits.sptcal (custom Weeks,
# Days, Dates; built-in Weeks) and builtindates.sptcal (built-in Dates): the held end never moves, a
# Dates start is written directly (F5 -- setPhaseStart would carry the end), a Weeks edge switches the
# phase to Dates with ONE undo (F7, F8), the old-build fallback is inside that step (F7's Redo), days
# land only on drawn days (F1, F2, F4), floors (F6), out and back and Escape bank nothing (F9, F10), and
# print media hides the handles (F12). Run red on three mutants before it was wired in. F13 (19 Oct 2026,
# autonote-grips.sptcal): an edited "Writer's Room Opens" follows the start grip; red before the fix.
# ⭐ 19 Oct 2026, G0-G8 (PREP-GRIP-PLAN.md): the prep START grip on episodeprep.sptcal and its Blocks twin. The grip finds
# its prep by the ORDER of the row's prep pills (two can start on the same day: Prep 303/304 from Mon 3/1/27), writes
# that unit's own prep length, floors at one working day, and out-and-back or Escape banks nothing. Four mutants were
# each red before it was wired in: choosing the pill by date (G0, G1), writing the default (G1-G7), writing the number
# back at the start (G3, G6), and no floor (G5).
node "$HERE/phaseedge.mjs" --page "$PAGE" >/dev/null 2>&1
python3 - "$HERE/phaseedge.json" "phaseedge (customunits, builtindates, autonote-grips, episodeprep)" <<'PYPE' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if cases and all(c.get('pass') is True for c in cases) else 1)
PYPE

# ---- mvorder: drag bars and notes up and down in the month view, and the moving copy ---------------------
# ⭐ ADDED 21 Oct 2026 (MONTH-ORDER-PLAN.md, owner rulings R1-R4). pilldrag's sibling, for the same reason a Node
# script: trusted CDP input, the reorder grip pressed where elementsFromPoint has it topmost. On mvorder.sptcal (and
# mvorder-notes, mvorder-hostile): a phase's grip reorders it in every week (O2) with ONE undo (O3); Save writes
# mvPhaseOrder (O4); ⭐ the WRITTEN month PDF stacks the bars in that order (O5, text y read out of the PDF); Back to
# date order (O6); out-and-back and Escape bank nothing (O7, O8). Notes: on top of the bars (N1), among the day's notes
# (N2), a waterfall line on top (N3), and its place follows the line when Production moves (N4); a click still edits
# (N5); editing keeps a note on top (N6); Escape (N7). A hostile file's values are ignored and no prototype is touched
# (H1). The moving copy on a body drag (G1). Run on a mutant without frozen edits E1 and E2: O2, O3, O5, O7, O8, N1,
# N3, N4 and N6 red. ⛔ Gates 10 and 13 are what prove the two edits INERT on every calendar without an order.
# ⭐ GREW 23 Oct 2026 (MONTH-ORDER-PLAN.md §9, frozen edits E3 + E4, owner-approved by picker), on mvdrag.sptcal: an
# untouched note stays under its bar when a note goes on top (M1) or a phase is reordered (M2) -- the owner's two bugs;
# a note between two phases, on screen, in the save and in the WRITTEN month PDF (M3); a note to another day with its
# date rewritten (M4), a waterfall line into another week's waterfall note (M5), an auto-note moved a day (M6); a
# holiday stays (M7); out and back (M8) and a drop off the grid (M10) bank nothing; no anchor on an untouched calendar
# (M9). On the 23 Oct live build (d2ac914e) M1-M6 and M8 are red.
node "$HERE/mvorder.mjs" --page "$PAGE" >/dev/null 2>&1
python3 - "$HERE/mvorder.json" "mvorder (mvorder, mvorder-notes, mvorder-hostile, mvdrag)" <<'PYMO' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if cases and all(c.get('pass') is True for c in cases) else 1)
PYMO

# ---- hiatusdrag: move a hiatus, or change its first or last week, in the month view -----------------
# ⭐ ADDED 19 Oct 2026 (HIATUS-DRAG-PLAN.md, owner rulings 1-4). phaseedge's sibling, for the same
# reason a Node script: trusted CDP input, and a hiatus band is click-through, so every press is made
# where elementsFromPoint has the body-level layer or grip topmost (H0). On hiatusdrag.sptcal: a
# week at a time by ROW (a Sunday drop is that row's week, H4); a locked hiatus offers nothing (H0);
# an all-phase drag asks Keep or Undo, Ctrl+Z is held under the question, and Undo banks nothing (H1,
# H2); a phase's own hiatus never asks (H9) and cannot leave its phase (H10); no overlap (H5); the
# band's typed label and colour travel and are copied onto added weeks (H1, H6, H7); the half day
# stays on its date (H6); floors (H8); Escape (H11); print media (H12). Run red on three mutants
# before it was wired in. ⚠️ The crash-backup half of the hold cannot be seen here (IndexedDB never
# settles in headless Chrome); it was proved in the app pane.
node "$HERE/hiatusdrag.mjs" --page "$PAGE" >/dev/null 2>&1
python3 - "$HERE/hiatusdrag.json" "hiatusdrag (hiatusdrag)" <<'PYHD' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if cases and all(c.get('pass') is True for c in cases) else 1)
PYHD

# ---- cspproof (4.1, audit L-4): the app runs under its Content-Security-Policy, ZERO violations ----
# ⭐ ADDED 30 Sep 2026. A Node script, because srv.js strips the policy on ?test= pages (it injects
# unhashed legs), so no t/ leg can see it. This loads the page WITHOUT ?test=, installs a
# securitypolicyviolation recorder in every frame through CDP before any page script runs, and
# drives every path that loads, fetches, writes or prints: Excel, both PDFs, the month view, Save
# and Load through stood-in pickers, the update check, a shareable copy (built, then booted framed
# AND as its own file:// document), and the install gate's screens. V0 is the verdict; P0 is a
# positive control run last -- an unhashed inline script must be refused AND heard -- so a zero
# means nothing was blocked, not that nothing was listening.
node "$HERE/cspproof.mjs" --page "$PAGE" >/dev/null 2>&1
python3 - "$HERE/cspproof.json" "cspproof (v1.4.0-saved)" <<'PYCS' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if cases and all(c.get('pass') is True for c in cases) else 1)
PYCS

# ---- customunits: a custom phase's length in Weeks, Days or Dates (CUSTOM-PHASE-UNITS-PLAN.md) -----
# Two runs. LIVE builds the synthetic calendar through the UI and asserts what a user sees while
# editing (which boxes each unit shows, the select hit-testable, a unit switch that moves nothing and
# is one undo step, end-before-start, whole days, a weekend start). RESTORE loads
# tests/fixtures/customunits.sptcal, minted from that LIVE run's real Save, and asserts it comes
# back day for day: units, boxes, hint lines, waterfall rows, month pills, and the {key.close}
# header tokens (the bug §9 fixed: a mid-week end used to name the Sunday before). RESTORE then runs
# every MOVER on it (plan §8): Shift All, Anchor To, Rebuild From both ways and the month drag must
# move a Dates phase's start AND end, and one undo must put every date back.
# ⚠️ The JSON is removed first: run.sh does not, and a leg that fails to load would otherwise be
# judged on the previous run's result.
for CUSTATE in "" customunits; do
  rm -f "$HERE/customunits.json"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$CUSTATE" "$HERE/run.sh" customunits 120 >/dev/null 2>&1
  python3 - "$HERE/customunits.json" "customunits (${CUSTATE:-live})" <<'PYCU' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+label+': '+str(c.get('what')))
errs = (a.get('health') or {}).get('errors') or []
print(('  PASS  ' if not errs else '  FAIL  ')+label+f': 0 console errors {errs[:2]}')
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYCU
done

# ---- builtindates: Dates mode on the five built-in phases (CUSTOM-PHASE-UNITS-PLAN.md §7a, step 6) -----
# LIVE builds the synthetic calendar through the UI and asserts the rows (Weeks/Dates only, Production
# without), "Start after previous phase" moving both ends, and the trap these STATIC rows carry: an
# OLDER calendar loaded after one in Dates mode, and New, must both put every built-in back in Weeks
# (audit M-5's shape). RESTORE loads tests/fixtures/builtindates.sptcal, minted from LIVE's real Save,
# and runs every mover on the built-in Dates phases with one undo after each.
for BDSTATE in "" builtindates; do
  rm -f "$HERE/builtindates.json"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$BDSTATE" "$HERE/run.sh" builtindates 150 >/dev/null 2>&1
  python3 - "$HERE/builtindates.json" "builtindates (${BDSTATE:-live})" <<'PYBD' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+label+': '+str(c.get('what')))
errs = (a.get('health') or {}).get('errors') or []
print(('  PASS  ' if not errs else '  FAIL  ')+label+f': 0 console errors {errs[:2]}')
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYBD
done

# ---- phasenum: a custom phase's "Number weeks" (PHASE-NUMBERING-PLAN.md, owner rulings 19 Oct 2026) -----
# Two runs. LIVE builds the synthetic calendar through the UI and asserts the automatic flips as they
# happen: By -> Days / Dates unticks the box, the day menu's "Add 1-day phase here" unticks it and its
# 1-week item does not, the box shows in every unit and is hit-testable, and the built-ins have none (R2).
# It mints tests/fixtures/phasenumbering.sptcal from its real Save. RESTORE holds every output's TEXT to a
# hand trace: the waterfall rows, the month pills, the day menu's header, the workbook's cells, and the text
# runs of the waterfall PDF and the WRITTEN month PDF (read here, from the files the leg hands back). Then:
# unticking is one undo step, By -> Dates unticks and one undo restores unit and box, back to Weeks ticks it
# (Q2), Days <-> Dates keeps the user's tick, the month edge drag's Weeks -> Dates switch leaves the box alone
# (Q3), and the M-5 shape: customunits.sptcal (no wknum- ids) loaded after it opens with every box ticked.
for PNSTATE in "" phasenumbering; do
  rm -f "$HERE/phasenum.json" "$HERE/phasenum.pdf" "$HERE/phasenum.month.pdf"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$PNSTATE" "$HERE/run.sh" phasenum 300 >/dev/null 2>&1
  python3 - "$HERE/phasenum.json" "phasenum (${PNSTATE:-live})" "$PNSTATE" "$HERE/phasenum.pdf" "$HERE/phasenum.month.pdf" <<'PYPN' || FAIL=1
import json,sys,re,zlib
from collections import Counter
path, label, state, wfpdf, mvpdf = sys.argv[1:6]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
ok = a.get('pass') is True and bool(a.get('checks'))
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+label+': '+str(c.get('what')))
errs = (a.get('health') or {}).get('errors') or []
print(('  PASS  ' if not errs else '  FAIL  ')+label+f': 0 console errors {errs[:2]}')
if state:
    # Every Flate stream's "(text) Tj" runs: both writers set a line of text as one literal string.
    TJ = re.compile(rb'\(((?:\\.|[^\\)])*)\) Tj')
    NAMES = ('Pre Prep', 'Table Read', 'Scout', 'Stage Lock', 'Rigging', 'Fitting', 'Camera Test')
    def runs(p):
        b = open(p, 'rb').read(); out = []
        for m in re.finditer(rb'stream\r?\n', b):
            s = m.end(); e = b.find(b'endstream', s)
            try: d = zlib.decompress(b[s:e])
            except Exception: continue
            out += [re.sub(rb'\\(.)', rb'\1', x.group(1)).decode('latin-1') for x in TJ.finditer(d)]
        return Counter(r for r in out if r.startswith(NAMES))
    WANT = {
      'waterfall PDF': (wfpdf, {'Pre Prep Wk 1': 1, 'Pre Prep Wk 2': 1, 'Pre Prep Wk 3': 1, 'Stage Lock': 2, 'Rigging wk 1': 1,
                                'Rigging wk 2': 1, 'Table Read': 1, 'Scout': 2, 'Fitting': 1, 'Camera Test wk 1': 1}),
      # Camera Test's one week runs Mon 3/29 - Fri 4/2, so it is drawn on the March page AND the April page.
      'written month PDF': (mvpdf, {'Pre Prep Week 1': 1, 'Pre Prep Week 2': 1, 'Pre Prep Week 3': 1, 'Stage Lock': 2,
                                    'Rigging Week 1': 1, 'Rigging Week 2': 1, 'Table Read': 1, 'Scout': 2, 'Fitting': 1,
                                    'Camera Test Week 1': 2}),
    }
    for what, (p, want) in WANT.items():
        try: got = runs(p)
        except Exception as e: got = 'unreadable: ' + str(e)
        good = got == Counter(want)
        ok = ok and good
        print(('  PASS  ' if good else '  FAIL  ')+label+': '+what+' text runs: the unnumbered phases bare, the numbered keep their week'
              + ('' if good else ' -- got '+str(dict(got) if isinstance(got, Counter) else got)[:300]))
sys.exit(0 if ok else 1)
PYPN
done

# ---- episodeprep: per-episode prep, derived from the shoot, month view only (EPISODE-PREP-PLAN.md §11) -----
# Three runs. LIVE builds the synthetic calendar through the UI (a blank default draws nothing; the two
# ids in fields.byId and none in the list; the row hidden in the waterfall; the drop warning; the list in
# shooting order; hit-testable controls; one undo per edit; "Whole days only"; overrides and 0; no Show
# Info; the colour picker) and mints tests/fixtures/episodeprep.sptcal and its Blocks twin from its real
# Saves. RESTORE holds every prep run to a hand trace of plan §5 (a union holiday inside two preps, a
# locked hiatus between two episodes, a shuffled shooting order, two overlaps, one of them two preps from
# the same Monday in separate lanes with their own names), then Shift All, a first prep's own month, a
# shooting-order drag, undo, rename, Save/Load, the colour, and ⛔ the M-5 trap (the same calendar with
# no prep keys, loaded after it, opens with NO prep, and with the Pause prep switch unticked). BLOCKS does prep per
# block (P4). LIVE also checks the "Pause prep on days marked Off" box (20 Oct 2026): in the Prep row, unticked,
# NO id (so fields.byId cannot move), hit-testable, one undo step, and absent from the minted file.
# ⭐ "MONTH VIEW ONLY" IS PROVEN HERE, not asserted: RESTORE exports the workbook and the waterfall PDF
# with prep ON and again with it OFF, and every Excel part (bar core.xml's timestamp) and the PDF must be
# byte-identical, while every non-prep bar of the month view is identical too.
for EPSTATE in "" episodeprep episodeprep-blocks; do
  rm -f "$HERE/episodeprep.json"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$EPSTATE" "$HERE/run.sh" episodeprep 400 >/dev/null 2>&1
  python3 - "$HERE/episodeprep.json" "episodeprep (${EPSTATE:-live})" <<'PYEP' || FAIL=1
import json,sys,base64,io,zipfile
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
bad = 0
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+label+': '+str(c.get('what')))
errs = (a.get('health') or {}).get('errors') or []
print(('  PASS  ' if not errs else '  FAIL  ')+label+f': 0 console errors {errs[:2]}')
if a.get('run') == 'restore':
    def parts(b):
        z = zipfile.ZipFile(io.BytesIO(base64.b64decode(b)))
        return {n: z.read(n) for n in z.namelist()}
    try:
        xa, xb = parts(a['xlsxOn']), parts(a['xlsxOff'])
        diff = [n for n in sorted(set(xa) | set(xb)) if n != 'docProps/core.xml' and xa.get(n) != xb.get(n)]
        ok = not diff and len(xa) > 5 and b'Production' in xa.get('xl/sharedStrings.xml', b'')
        print(('  PASS  ' if ok else '  FAIL  ')+label+f': ⭐ the workbook is byte-identical with prep on and off ({len(xa)} parts, core.xml excluded){" -- differ: "+str(diff[:4]) if diff else ""}')
        bad = bad or not ok
        pa, pb = base64.b64decode(a['pdfOn']), base64.b64decode(a['pdfOff'])
        ok = pa == pb and len(pa) > 10000
        print(('  PASS  ' if ok else '  FAIL  ')+label+f': ⭐ the waterfall PDF is byte-identical with prep on and off ({len(pa)} vs {len(pb)} bytes)')
        bad = bad or not ok
    except Exception as e:
        print('  FAIL  '+label+': the on/off exports could not be compared: '+str(e)); bad = 1
sys.exit(0 if a.get('pass') is True and a.get('checks') and not bad else 1)
PYEP
done

# ---- offweek: a Production week with no shoot days reads and counts as a Production hiatus (OFF-WEEK-PLAN.md) --
# Two runs. LIVE builds the synthetic calendar through the UI, marks every day off (and one Saturday worked)
# through the month view's day popover, hit-tested, and mints tests/fixtures/offweek.sptcal from its real Save.
# RESTORE holds the waterfall to the hand trace in the leg's header (two off weeks banded, one of them Labor
# Day plus four offs; a Saturday-worked week and the Q3 leading week still numbered; the own hiatus and the
# all-phase hiatus as they were), the header span and the {production.weeks} token, the workbook read back
# with ExcelJS, the month band (Mon-Fri, no bar, the hatching kept), Full day + one undo, a rename seen in both
# views through Save/Load, Shift All, a calendar with no off week loaded after it, and (R11-R14) prep with a 5-day
# default and the Prep row's "Pause prep on days marked Off" switch (owner, 20 Oct 2026; EPISODE-PREP-PLAN §15):
# ticked, prep skips the in-shoot Off days and Production's own hiatus; unticked, the default and a file with no
# key, it runs through them; one undo step; saved as prepPauseOff and restored unconditionally; New unticks it. Here, the waterfall PDF's
# own text (pdftotext): three Production Hiatus cells and wk 1 to wk 10 once each.
# ⛔ Gates 10 and 13 are the other half of this proof: no fixture they read holds an off week, so the frozen
# month-band edit (OFF-WEEK-PLAN §3.5, Q7) must leave every one of their files byte-identical.
for OWSTATE in "" offweek; do
  rm -f "$HERE/offweek.json" "$HERE/offweek.pdf"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$OWSTATE" "$HERE/run.sh" offweek 600 >/dev/null 2>&1
  python3 - "$HERE/offweek.json" "$HERE/offweek.pdf" "offweek (${OWSTATE:-live})" <<'PYOW' || FAIL=1
import json,sys,re,subprocess,os
path, pdf, label = sys.argv[1], sys.argv[2], sys.argv[3]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
bad = 0
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+label+': '+str(c.get('what')))
errs = (a.get('health') or {}).get('errors') or []
print(('  PASS  ' if not errs else '  FAIL  ')+label+f': 0 console errors {errs[:2]}')
if a.get('run') == 'restore':
    try:
        txt = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True, check=True).stdout
        wks = sorted(int(n) for n in re.findall(r'Production wk (\d+)', txt))
        hi = len(re.findall(r'Production Hiatus', txt))
        ok = wks == list(range(1, 11)) and hi == 3
        print(('  PASS  ' if ok else '  FAIL  ')+label+f': the waterfall PDF reads Production wk 1 to wk 10 once each and three Production Hiatus cells (got wk {wks}, {hi} bands)')
        bad = bad or not ok
    except Exception as e:
        print('  FAIL  '+label+': the waterfall PDF could not be read: '+str(e)); bad = 1
sys.exit(0 if a.get('pass') is True and a.get('checks') and not bad else 1)
PYOW
done

# ---- weeknum: the month view numbers weeks as the waterfall does (OFF-WEEK-PLAN.md step B, ruling Q5) ---------
# N0 on each calendar: every month-view bar whose label carries "Week N", in every month and for every phase
# but prep, names the waterfall's own number for that phase and week (prodWeekLabel reads seg.weekNo, which
# the week loop records; it used to count calendar weeks, and disagreed after every hiatus). N1 guards against
# a page that drew nothing. dayoverrides adds the fixed cases (Production Week 3 after Summer Break, Post Week 8
# after the winter hiatus, a hiatus-free phase unchanged, the day menu's header); offweek adds two off weeks.
for WNSTATE in dayoverrides offweek carry-rich customunits blocks halfdays episodeprep; do
  rm -f "$HERE/weeknum.json"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$WNSTATE" "$HERE/run.sh" weeknum 900 >/dev/null 2>&1
  python3 - "$HERE/weeknum.json" "weeknum ($WNSTATE)" <<'PYWN' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+label+': '+str(c.get('what'))[:170])
if a.get('mismatch'): print('        mismatches: '+str(a['mismatch'][:4]))
errs = (a.get('health') or {}).get('errors') or []
print(('  PASS  ' if not errs else '  FAIL  ')+label+f': 0 console errors {errs[:2]}')
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYWN
done

# ---- sideboxes: boxes beside the waterfall (SIDE-BOXES-PLAN.md, owner ruling 7, 20 Oct 2026) ------------
# A colour key and a text box on screen beside the grid (never inside #table-wrap), in the workbook (frozen
# edits E1-E3: the grid moves two columns right for a left box) and in the waterfall PDF (E4-E6: the fit,
# the header band and the orientation taken over grid + boxes). The leg reads both exports back, drives every
# gesture through the hit stack, holds #table-wrap's month-view width to the pixel (it repaginates the month
# PDF), and proves that deleting the last box gives back the very same PDF content and no `sideBoxes` key.
# Since 21 Oct 2026 (group R) a box sits on any row: drawn level with the grid's row, at any zoom, scrolling
# with the grid; dragged to row 10 it is on row 11 of the workbook and beside row 11's date in the PDF.
# ⭐ The other half of "inert without boxes" is gates 2 and 3 above: every existing calendar's waterfall PDF
# and Excel parts stay byte-identical to the baseline.
rm -f "$HERE/sideboxes.json"
HARNESS_PAGE="$PAGE" HARNESS_STATE=sideboxes "$HERE/run.sh" sideboxes 900 >/dev/null 2>&1
python3 - "$HERE/sideboxes.json" <<'PYSB' || FAIL=1
import json,sys
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  sideboxes produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  sideboxes threw: '+str(a['EX'])[:200])
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+'sideboxes: '+str(c.get('what'))[:170])
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYSB

# ---- sbnoexport: "Hide from Exports" on a side box (owner, 21 Oct 2026) -----------------------------------------
# A box hidden from exports stays on screen and leaves both writers. No frozen line changed: the writers' own
# sideBoxLayoutSafe(schedule) call now means the PRINTED layout, and the screen asks for SIDE_SCREEN. The leg
# reads the workbook and the PDF back with one box hidden, proves every box hidden gives the no-box PDF content
# and grid, and holds the file shape (noExport only ever `true`). ⚠️ It is also the check that a NEW screen-side
# caller of sideBoxLayoutSafe passes SIDE_SCREEN: miss it and a hidden box vanishes from the screen (H1, N1).
rm -f "$HERE/sbnoexport.json"
HARNESS_PAGE="$PAGE" HARNESS_STATE=sideboxes "$HERE/run.sh" sbnoexport 900 >/dev/null 2>&1
python3 - "$HERE/sbnoexport.json" <<'PYSN' || FAIL=1
import json,sys
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  sbnoexport produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  sbnoexport threw: '+str(a['EX'])[:200])
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+'sbnoexport: '+str(c.get('what'))[:170])
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYSN

# ---- notescols: hide a year's Notes column (HIDE-NOTES-PLAN.md, owner's option B, 22 Oct 2026) ---------------
# The frozen edits W1-W2, R1-R5, X1, E1-E3, P1-P3 (signed off 22 Oct 2026) are inert with nothing hidden, which
# every byte-compared gate above proves; this leg proves them with columns hidden. On colreuse (three blocks, two
# with notes, an all-phase hiatus in 2031): the heading editor's Hide column by double-click, the strip (one cell per row, never a
# rowspan, its resize handle hidden, the dot), the grid's right edge, 0 clipped; the workbook's columns HIDDEN with
# width and notes kept, the right rule and the hiatus band's merge at the last phase column; the PDF's headings
# and notes; the print fallback (localhost route sptcal.wfPdfTest) with no strip; a typed heading (the typed path)
# and Single Column Mode; the file key (absent when empty, Load, hostile values, New). Red on the pre-change build.
# Since 22 Oct 2026 (HEADINGS-EDITABLE-PLAN.md) the separate Notes panel is retired: the A group drives the heading
# editor on an untouched Notes heading, and its old C group (Custom Column Headings switched on) is A6-A9.
rm -f "$HERE/notescols.json"
HARNESS_PAGE="$PAGE" HARNESS_STATE=colreuse "$HERE/run.sh" notescols 1200 >/dev/null 2>&1
python3 - "$HERE/notescols.json" <<'PYNC' || FAIL=1
import json,sys
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  notescols produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  notescols threw: '+str(a['EX'])[:200])
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+'notescols: '+str(c.get('what'))[:170])
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYNC

# ---- calzoom: the calendar zoom, bottom right in both views (owner, 20 Oct 2026) ------------------------------
# CSS `zoom` on #table-wrap, one value per view, a per-machine preference. 100% writes nothing at all (no style,
# no class), which is why every byte-compared gate above is untouched by it. The leg holds the control's place
# beside the help button, the grid fit at four zooms, the frozen resize handles on their rows while zoomed and at
# 100% (shown at every zoom since 22 Oct 2026; leg zoomresize below drags them), the selection and swap overlays on their cells, the month view as a pure magnification
# (columns and note lanes unchanged), and that a zoom never dirties the file, adds an undo step or travels in a copy.
rm -f "$HERE/calzoom.json"
HARNESS_PAGE="$PAGE" HARNESS_STATE=mvnotes "$HERE/run.sh" calzoom 300 >/dev/null 2>&1
python3 - "$HERE/calzoom.json" <<'PYCZ' || FAIL=1
import json,sys
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  calzoom produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  calzoom threw: '+str(a['EX'])[:200])
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+'calzoom: '+str(c.get('what'))[:170])
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYCZ

# ---- zoomresize: the waterfall's resize handles at every zoom (owner, 22 Oct 2026) ------------------------------
# Frozen edits Z1-Z6 (owner sign-off by picker) divide installGridResizers' and the drags' screen measurements by
# the zoom, 1 at 100%. At 100%, 50%, 150% and 200% the leg checks every row, column and cell-edge handle on its
# place, then drags a column, a row and a cell edge the same distance in the grid's px and compares what each saves
# with the 100% drag (a column exactly, a row within 1 px, the cell edge exactly one column), undoing each. Red on
# the build before the edits (the 50% drags saved 194 not 203 px, 20 not 36 px, and moved no cell edge).
rm -f "$HERE/zoomresize.json"
HARNESS_PAGE="$PAGE" "$HERE/run.sh" zoomresize 200 >/dev/null 2>&1
python3 - "$HERE/zoomresize.json" <<'PYZR' || FAIL=1
import json,sys
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  zoomresize produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  zoomresize threw: '+str(a['EX'])[:200])
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+'zoomresize: '+str(c.get('what'))[:170])
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYZR

# ---- hdrfit: the waterfall's header ends with the calendar (owner, 21 Oct 2026, "At every zoom") ----------------
# The title block and the Manual-mode format strip are capped at the grid's own width (--wf-grid-w on .preview-panel),
# floored at what their lines need on one line. colreuse is an Auto header over a grid a little wider than the
# harness window at 100%; hdrmanualbraces a Manual header (the strip up) over a narrower one. The leg holds where the
# header ends at six zooms, that its height never changes, a live column resize, the month view, the print copy (which
# cannot see the cap) and a shareable copy (which carries none). Chrome only: nothing a writer reads.
for HFSTATE in colreuse hdrmanualbraces; do
  rm -f "$HERE/hdrfit.json"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$HFSTATE" "$HERE/run.sh" hdrfit 300 >/dev/null 2>&1
  python3 - "$HERE/hdrfit.json" "$HFSTATE" <<'PYHF' || FAIL=1
import json,sys
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  hdrfit ('+sys.argv[2]+') produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  hdrfit ('+sys.argv[2]+') threw: '+str(a['EX'])[:200])
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+'hdrfit ('+sys.argv[2]+'): '+str(c.get('what'))[:170])
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYHF
done
# ---- textstyle: the text style bar (TEXT-STYLE-BAR-PLAN.md; owner rulings D1-D5 + F1-F4, 21 Oct 2026) -----------
# One bar under the toolbar styles any waterfall text: Excel's highlight over the grid (click, sweep, Cmd/Shift-click,
# Cmd+A), header lines in any mode or view, side-box lines. Sizes 6-12 in the grid (D1), so no row may grow and nothing
# new may be cut. The leg holds the bar's place and empty state, every kind styled on screen, in the workbook (read back
# by ExcelJS) and in the PDF (bold program, slant, colour), one undo step per press, the save key (absent when nothing
# is styled, no new fields.byId id), restore-unconditionally, and D5: a click opens nothing, double-click / Enter /
# typing open a note (typing ADDS at the end). The byte gates above are the proof that an unstyled calendar is untouched.
rm -f "$HERE/textstyle.json"
HARNESS_PAGE="$PAGE" HARNESS_STATE=carry-rich "$HERE/run.sh" textstyle 400 >/dev/null 2>&1
python3 - "$HERE/textstyle.json" <<'PYTS' || FAIL=1
import json,sys
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  textstyle produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  textstyle threw: '+str(a['EX'])[:200])
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+'textstyle: '+str(c.get('what'))[:170])
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYTS

# ---- wfkeys + wfkeysreal: Excel's editing keys in the waterfall (WATERFALL-KEYS-PLAN.md; rulings Q1-Q4, 22 Oct 2026) ----
# The arrow keys, Tab and Delete on the text style bar's highlight; copy / cut / paste notes; dragging notes to another
# week. wfkeys (t/ leg, dispatched events, wfkeys.sptcal) holds the moves (blank gaps stepped over, empty Notes cells
# and bands as stops, the column kept across a band, Shift's rectangle, the edges, scrolling below the sticky heading),
# Delete (Q1: Notes cells only, an automatic note as the explicit clear), copy / paste (Q2 the look travels, Q3
# replace, Excel's quoting, the hiatus rows stepped over, past the end refused and said, hostile clipboard data held
# to a saved file's rules), the drag (Q4 ask before replacing; Escape; refusals), one undo step per gesture, and no new
# id or snapshot key. Red on the pre-change build (52 of 84) and on four mutants. wfkeysreal (Node, trusted CDP input)
# holds the chain a user's keys go through: ⌘C / ⌘X / ⌘V as Chrome's own Copy / Cut / Paste commands, SPTCal's data
# surviving Chrome's clipboard across a reload, real arrows, Delete and a real mouse drag. 0 of 6 on the pre-change build.
rm -f "$HERE/wfkeys.json"
HARNESS_PAGE="$PAGE" HARNESS_STATE=wfkeys "$HERE/run.sh" wfkeys 400 >/dev/null 2>&1
python3 - "$HERE/wfkeys.json" <<'PYWK' || FAIL=1
import json,sys
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  wfkeys produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  wfkeys threw: '+str(a['EX'])[:200])
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+'wfkeys: '+str(c.get('what'))[:170])
sys.exit(0 if a.get('pass') is True and a.get('checks') else 1)
PYWK
node "$HERE/wfkeysreal.mjs" --page "$PAGE" >/dev/null 2>&1
python3 - "$HERE/wfkeysreal.json" "wfkeysreal (wfkeys)" <<'PYWR' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if len(cases) >= 6 and all(c.get('pass') is True for c in cases) else 1)
PYWR

# ---- epnames: an episode's default name is its month-bar text ("Shoot Ep. 101"; owner, 20 Oct 2026) -------------
# Replaced barprefix (v1.6.0's separate prefix and the day menu's Prefix…, retired the same evening). A new calendar
# names its episodes "Shoot Ep. N" and a bar reads its episode's name as typed; an old file keeps "Episode N" (read off
# the names it stores, re-derived on every Load); prep pills and episode lists keep the number; a switch day's one-day
# half bar keeps "Ep. N"; a v1.6.0 file's own prefix still draws as it did until its episode is renamed. halfdays
# carries the N-cases and writes the month PDF, whose text is read here; blocks carries the B-cases.
for ENSTATE in halfdays blocks; do
  rm -f "$HERE/epnames.json" "$HERE/epnames.pdf"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$ENSTATE" "$HERE/run.sh" epnames 300 >/dev/null 2>&1
  python3 - "$HERE/epnames.json" "$HERE/epnames.pdf" "epnames ($ENSTATE)" "$ENSTATE" <<'PYEN' || FAIL=1
import json,sys,os,subprocess
path, pdf, label, st = sys.argv[1:5]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
bad = not cases or any(c.get('pass') is not True for c in cases)
if st == 'halfdays':
    try:
        txt = subprocess.run(['pdftotext', '-raw', pdf, '-'], capture_output=True, text=True, check=True).stdout
        ok = 'Shoot Ep. 201' in txt and 'Pilot' in txt and 'Shoot Ep. 202' not in txt and 'Episode' not in txt
        print(('  PASS  ' if ok else '  FAIL  ')+label+': the written month PDF reads "Shoot Ep. 201" and "Pilot", and neither "Shoot Ep. 202" nor "Episode"')
        bad = bad or not ok
    except Exception as e:
        print('  FAIL  '+label+': the month PDF could not be read: '+str(e)); bad = True
sys.exit(1 if bad else 0)
PYEN
done

# ---- shootdays: "Number Production Days", "Day N" on every shoot day in the month view (19 Oct 2026) -------------
# Off by default; calendar data (captureSnapshot's mvNumberShootDays, an ABSENT key when off); shown whatever labels the
# bars. Its frozen edit (renderMonthView's data-shoot-day attribute, legacy.css's ::after) was approved with a gate:
# gates 10 and 13, byte-identical with it off, are one half; this block is the other.
#   shootdays leg   on offweek (the hand trace), dayoverrides-onhalf (half days) and blocks (all three labels): the
#                   switch, every square against the day menu's "Shoot day N", only the attribute moving (every month
#                   byte-identical with it taken out, every week as tall), the ::after on the date's baseline, one undo
#                   step, Save/Load, restore unconditionally, off written as NO key, and the month PDF the app writes.
#                   Here, that PDF's text (pdftotext -raw), page by page, against the numbers the screen showed.
#   monthemit       on shootdays and shootdays-onhalf (minted by the leg): every "Day N" the writer draws, held to
#                   Chrome's own print layout of the same pages (D0's start/end/baseline, K0's font and ink, X3, X4),
#                   and at least one judged. Their files are NOT the 15 the time-zone check counts.
#   monthwriter     on shootdays-onhalf, and monthab.py on its file against Chrome's real print (P0-P5). ⚠️ NOT on
#                   shootdays: offweek fails P5 the same way WITH THE SETTING OFF (cell-sized "lines" unpaired in its
#                   off weeks, August and September 2027), so that is offweek's, found 19 Oct 2026 and not yet traced.
#   monthexport     on shootdays: the BUILT app's month PDF is byte-identical to the sliced source's (X2).
for SDSTATE in offweek dayoverrides-onhalf blocks; do
  rm -f "$HERE/shootdays.json" "$HERE/shootdays.pdf"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$SDSTATE" "$HERE/run.sh" shootdays 900 >/dev/null 2>&1
  python3 - "$HERE/shootdays.json" "$HERE/shootdays.pdf" "shootdays ($SDSTATE)" <<'PYSD' || FAIL=1
import json,sys,re,subprocess
path, pdf, label = sys.argv[1], sys.argv[2], sys.argv[3]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
bad = 0
# The checks first, even from a run that threw: a mutant that breaks restore shows its own named case (A9a) and THEN
# the timeout it causes further on, which says far more than the timeout alone.
for c in a.get('checks') or []:
    print(('  PASS  ' if c.get('ok') else '  FAIL  ')+label+': '+str(c.get('what')))
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
errs = (a.get('health') or {}).get('errors') or []
print(('  PASS  ' if not errs else '  FAIL  ')+label+f': 0 console errors {errs[:2]}')
# The written month PDF: each page reads its month's numbers, in order, as the screen showed them. "Labor Day 9/6/27"
# is a holiday's name, not a number: (?!/) keeps "Day 9/..." out.
try:
    exp = a.get('pdfExpect') or []
    got, wrong = [], []
    for i, m in enumerate(exp):
        txt = subprocess.run(['pdftotext', '-raw', '-f', str(i + 1), '-l', str(i + 1), pdf, '-'], capture_output=True, text=True, check=True).stdout
        days = [int(n) for n in re.findall(r'\bDay (\d+)\b(?!/)', txt)]
        got.append(len(days))
        if days != m.get('days'): wrong.append(m.get('title') + ': ' + str(days[:8]) + ' vs ' + str((m.get('days') or [])[:8]))
    ok = bool(exp) and not wrong and sum(got) > 0
    print(('  PASS  ' if ok else '  FAIL  ')+label+f': the written month PDF reads every month\'s "Day N" in order, as on screen ({sum(got)} on {len(exp)} pages){(" -- " + "; ".join(wrong[:3])) if wrong else ""}')
    bad = bad or not ok
except Exception as e:
    print('  FAIL  '+label+': the month PDF could not be read: '+str(e)); bad = 1
sys.exit(0 if a.get('pass') is True and a.get('checks') and not bad else 1)
PYSD
done
for SDSTATE in shootdays shootdays-onhalf; do
  rm -f "$HERE/monthemit.json"
  HARNESS_PAGE="$PAGE" HARNESS_STATE="$SDSTATE" "$HERE/run.sh" monthemit 240 >/dev/null 2>&1
  python3 - "$HERE/monthemit.json" "monthemit ($SDSTATE)" <<'PYSDE' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
info = a.get('info') or {}
n = (info.get('totals') or {}).get('shootDays') or 0
print(('  PASS  ' if n > 0 else '  FAIL  ')+label+f': D0 judged {n} "Day N" against Chrome (Chrome kerns them up to {(info.get("kerning") or {}).get("shootDay")} px narrower)')
sys.exit(0 if cases and all(c.get('pass') is True for c in cases) and n > 0 else 1)
PYSDE
done
rm -f "$HERE/monthwriter.json"; rm -f -- "$HERE"/monthwriter.*.pdf(N)
HARNESS_PAGE="$PAGE" HARNESS_STATE=shootdays-onhalf HARNESS_PRINT_PDF=1 "$HERE/run.sh" monthwriter 300 >/dev/null 2>&1
python3 - "$HERE/monthwriter.json" "monthwriter (shootdays-onhalf)" <<'PYSDW' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if cases and all(c.get('pass') is True for c in cases) else 1)
PYSDW
python3 "$HERE/monthab.py" "$HERE/monthwriter.json" "$HERE/monthwriter.print.pdf" --label "monthwriter (shootdays-onhalf)" --no-pixels || FAIL=1
rm -f "$HERE/monthexport.json"
HARNESS_PAGE="$PAGE" HARNESS_STATE=shootdays "$HERE/run.sh" monthexport 300 >/dev/null 2>&1
python3 - "$HERE/monthexport.json" "monthexport (shootdays)" <<'PYSDX' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
if a.get('EX'):
    print('  FAIL  '+label+' threw: '+str(a['EX'])[:200]); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if len(cases) >= 9 and all(c.get('pass') is True for c in cases) else 1)
PYSDX

# ---- scenarios: several calendars in one file (SCENARIOS-PLAN.md; owner rulings 22-23 Oct 2026) ---------------
# The tabs under the calendar, driven as a user does: "+", a typed name, edits in each copy, switching in both views,
# per-tab undo, Ctrl+Page Up/Down, Save (version 2 with the current tab at the top level), Load, Compare on a fresh
# load (the parked tabs probed, the calendar on screen unchanged), the chips, both exports, the scenario in the export
# names, Delete / Keep only (back to a plain version-1 file), and five damaged or too-new files refused whole.
# ⭐ The other half of "a one-scenario calendar is unchanged" is every gate above: no byte baseline moves.
rm -f "$HERE/scenarios.json"
HARNESS_PAGE="$PAGE" "$HERE/run.sh" scenarios 400 >/dev/null 2>&1
python3 - "$HERE/scenarios.json" <<'PYSC' || FAIL=1
import json,sys
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  scenarios produced no result: '+str(e)); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+'scenarios '+str(c.get('id'))+': '+str(c.get('title',''))[:120])
errs = (a.get('health') or {}).get('errors') or []
if errs: print('  FAIL  scenarios: page errors '+str(errs)[:200])
sys.exit(0 if len(cases) >= 18 and all(c.get('pass') is True for c in cases) and not errs else 1)
PYSC
# ---- scenariocompat: OLDER builds meet a scenarios file (SCENARIOS-PLAN.md §3.2) ------------------------------------
# v1.8.0 must refuse tests/fixtures/scenarios-3.sptcal whole ("saved by a newer version") and keep its calendar;
# v1.2.0, which has no version check, must open the tab that was on screen (8 episodes), never a blank calendar.
for CPAGE in /releases/v1.8.0.html /releases/v1.2.0.html; do
  rm -f "$HERE/scenariocompat.json"
  HARNESS_PAGE="$CPAGE" "$HERE/run.sh" scenariocompat 120 >/dev/null 2>&1
  python3 - "$HERE/scenariocompat.json" "$CPAGE" <<'PYCC' || FAIL=1
import json,sys
page = sys.argv[2]
try: a=json.load(open(sys.argv[1]))
except Exception as e:
    print('  FAIL  scenariocompat '+page+' produced no result: '+str(e)); sys.exit(1)
m, af, bf = a.get('modal') or '', a.get('after') or {}, a.get('before') or {}
if 'v1.8.0' in page:
    ok = 'newer version' in m and af.get('title') == bf.get('title')
    what = 'v1.8.0 refuses a scenarios file whole and keeps its calendar'
else:
    ok = af.get('title') == 'Half Days Test' and af.get('episodes') == '8' and not m
    what = 'v1.2.0 opens the scenario that was on screen, not a blank calendar'
print(('  PASS  ' if ok else '  FAIL  ')+'scenariocompat: '+what+('' if ok else '  '+json.dumps({'modal': m[:80], 'after': af})))
sys.exit(0 if ok and not a.get('EX') else 1)
PYCC
done

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
