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
# ⚠️ The baseline embeds the date it was cut (2026-08-29): the Excel header's left line and the
# waterfall PDF's header both carry todayStr, so gates 2 and 3 report FALSE failures on any later
# date against untouched code. Re-cut the baseline on a known-good build before trusting a FAIL
# there on a later day.
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
if cmp -s "$HERE/base.pdf" "$BASE/base.pdf"; then ok "waterfall PDF byte-identical to baseline"
else bad "waterfall PDF differs from baseline (run: node pdf-info.js base.pdf base.txt)"; fi

# ---- the workbook: valid, and unchanged apart from its timestamp -------------------------------
if "$HERE/check-xlsx.sh" "$HERE/base.xlsx" >/dev/null 2>&1; then ok "Excel passes check-xlsx.sh"
else bad "Excel fails check-xlsx.sh"; fi
rm -rf /tmp/gate-xa /tmp/gate-xb; mkdir -p /tmp/gate-xa /tmp/gate-xb
(cd /tmp/gate-xa && unzip -qo "$HERE/base.xlsx") 2>/dev/null
(cd /tmp/gate-xb && unzip -qo "$BASE/base.xlsx") 2>/dev/null
rm -f /tmp/gate-xa/docProps/core.xml /tmp/gate-xb/docProps/core.xml
if diff -rq /tmp/gate-xa /tmp/gate-xb >/dev/null 2>&1; then ok "Excel parts identical (core.xml timestamp excluded)"
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

say ""
if [[ $FAIL == 0 ]]; then say "=== GATE PASSED ==="; else say "=== GATE FAILED ==="; fi
exit $FAIL
