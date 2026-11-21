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
#   2. the waterfall PDF diffs clean            (byte-compare; the writer's bytes, before the SPTCal mark)
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
# ⭐ THE SPTCal MARK (owner, 2 Nov 2026; markPdf in src/legacy/app.js). Every PDF the app SAVES is the writer's bytes
# and then one appended update: the properties (Creator "SPTCal", Producer "SPTCal <version>") and an unpainted
# "Made with SPTCal <version>" on every page. Gates 2 and 13 run pdfmark.py on each saved file first: it checks the
# update piece by piece and hands back the writer's bytes, which are what those gates have always compared, so no
# baseline was re-cut for it. The pdfmark leg (its own block) holds the mark itself, in the app and in poppler.
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
# The version the SPTCal mark must name (markPdf): the build's own APP_VERSION, read from its source.
MARKVER="$(sed -n "s/^  const APP_VERSION = '\(.*\)';$/\1/p" "$HERE/../../src/legacy/app.js" | head -1)"

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
# ⛔ ON THE LEGACY LAYOUT PATH (LAYOUT-BUILD-PLAN.md §3.2, owner sign-off 5 Nov 2026). The reference calendar is a
# NEW calendar, and a new calendar carries the layout stamp (`colReuse`) since 2 Nov 2026; under the layout rules
# its Localization widens the week Post ends (rule 13), which is by design and would move gates 2 and 3. These two
# gates exist to prove the FROZEN WRITERS have not moved, so the leg exports the calendar on the legacy path through
# the localhost-only `?layout=legacy` hook (layoutStamped() false): the placement and the widths every unstamped
# file gets, byte for byte. The stamped path is proven by the layoutrules legs below.
HARNESS_PAGE="$PAGE" HARNESS_QUERY="layout=legacy" "$HERE/run.sh" base 45 >/dev/null 2>&1
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
# The saved file carries the SPTCal mark after the writer's bytes: pdfmark.py checks it and writes the writer's bytes to
# base.writer.pdf, which is what is compared. A file without a mark is compared whole, and fails twice.
TODAY="$(date +%-m.%-d.%y)"; BASEDATE="8.29.26"
if MARKOUT="$(python3 "$HERE/pdfmark.py" check "$HERE/base.pdf" --version "$MARKVER" --out "$HERE/base.writer.pdf" 2>&1)"; then
  ok "waterfall PDF carries the SPTCal mark (${MARKOUT#pdfmark: })"
else bad "waterfall PDF's SPTCal mark: ${MARKOUT#pdfmark: }"; cp -f "$HERE/base.pdf" "$HERE/base.writer.pdf"; fi
if cmp -s "$HERE/base.writer.pdf" "$BASE/base.pdf"; then ok "waterfall PDF byte-identical to baseline"
elif PDFOUT="$(python3 "$HERE/pdfcmp.py" "$HERE/base.writer.pdf" "$BASE/base.pdf" --today "$TODAY" --base "$BASEDATE" 2>&1)"; then
  ok "waterfall PDF identical to baseline (header date stamp $BASEDATE -> $TODAY)"
else bad "waterfall PDF differs beyond the date stamp: $(print -r -- "$PDFOUT" | head -4)"; fi

# ---- the waterfall PDF: no hairline between touching fills (frozen edit SM1, owner sign-off 4 Nov 2026) ----------
# pdfseams.py on the same writer bytes: S1 every pair of touching cells carries its strip and nothing else is one, S2
# Quartz (Preview's renderer) shows no light line on any shared edge at 1x / 1.37x / 2x, S3 the same PDF with its strips
# taken out DOES show one (else S2 proves nothing). The renderer is compiled once, and again when its source changes.
SEAMBIN="$HERE/.pdfseams-render"
if [[ ! -x "$SEAMBIN" || "$HERE/pdfseams-render.swift" -nt "$SEAMBIN" ]]; then
  swiftc -O "$HERE/pdfseams-render.swift" -o "$SEAMBIN" >/dev/null 2>&1 || rm -f "$SEAMBIN"
fi
if [[ ! -x "$SEAMBIN" ]]; then bad "pdfseams: pdfseams-render.swift did not compile (swiftc)"
elif SEAMOUT="$(python3 "$HERE/pdfseams.py" "$HERE/base.writer.pdf" --render "$SEAMBIN" 2>&1)"; then
  ok "waterfall PDF: no seam between touching fills ($SEAMOUT)"
else bad "waterfall PDF seams: $SEAMOUT"; fi

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


# ---- hover-hiatus partial gate (10 Nov 2026): the stamped layout legs, the pointer legs, the band legs ----
for AFSPEC in layoutrules:layout-r3:240 layoutrules:layout-r6:300 layoutrules:layout-r9:240 layoutrules:layout-r7:240 \
              layoutrules:layout-r13:240 layoutrules:layout-r17:240 layoutrules:layout-r20:240 layoutrules:layout-r20b:240 layoutrules:layout-r21:240 layoutrules:layout-r13b:240 layoutrules:layout-r3b:240 layoutrules:layout-r2g:240 layoutrules:layout-r2h:300 layoutrules:layout-r22:240 layoutrules:layout-r22b:240 layoutrules:layout-r22c:240 \
              layoutrules:layout-r23:300 layoutrules:layout-r23b:300 layoutrules:layout-r21b:240 layoutrules:layout-r3c:240 \
              phasefill:fill-intent:400 colsreset:fill-intent:300 fillspace:layout-r13:300 swapholds:swap-holds:400 \
              stickycols:sticky-cols:400 centrepullback:layout-r13:240 hoverexpand:hover-expand:300 hoverhiatus:hover-hiatus:400 \
              phiatusnum:-:300; do
  AFLEG="${AFSPEC%%:*}"; AFREST="${AFSPEC#*:}"; AFSTATE="${AFREST%%:*}"; AFSECS="${AFREST#*:}"
  [[ $AFSTATE == - ]] && AFSTATE=""
  rm -f "${HERE:?}/${AFLEG:?}.json"
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
node "$HERE/hiatusripple.mjs" --page "$PAGE" --port 8467 >/dev/null 2>&1
python3 - "$HERE/hiatusripple.json" "hiatusripple (hiatusripple)" <<'PYHR' || FAIL=1
import json,sys
path, label = sys.argv[1], sys.argv[2]
try: a=json.load(open(path))
except Exception as e:
    print('  FAIL  '+label+' produced no result: '+str(e)); sys.exit(1)
cases = a.get('cases') or []
for c in cases:
    print(('  PASS  ' if c.get('pass') is True else '  FAIL  ')+label+' '+str(c.get('id'))+': '+str(c.get('title',''))[:110])
sys.exit(0 if cases and all(c.get('pass') is True for c in cases) else 1)
PYHR
say "=== partial gate done: FAIL=$FAIL ==="
