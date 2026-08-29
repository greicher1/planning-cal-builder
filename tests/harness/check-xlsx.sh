#!/bin/zsh
# Validate an exported .xlsx the way EXCEL would reject it, not the way a parser would.
#
#   ./check-xlsx.sh <file.xlsx>
#
# Excel's "We found a problem with some content..." dialog looks like corruption and is almost
# never corruption. In this project it has been, in order of likelihood:
#   - a header/footer string over 255 characters IN TOTAL (not per &L/&C/&R section). Measured
#     UNESCAPED -- &amp; is five characters standing for one.
#   - overlapping merged ranges
#   - a column width over 255
#   - a style index >= cellXfs count
# So those are what this checks, after XML well-formedness.
set -u
F="${1:?usage: check-xlsx.sh <file.xlsx>}"
F="$(cd "$(dirname "$F")" && pwd)/$(basename "$F")"
D=$(mktemp -d)
cd "$D" && unzip -q "$F" || { echo "UNZIP FAIL"; exit 1; }
bad=0
for f in $(find . -name "*.xml"); do xmllint --noout "$f" 2>/dev/null || { echo "XML FAIL $f"; bad=1; }; done
python3 - "$D" <<'PY'
import sys, os, re
from xml.etree import ElementTree as ET
d = sys.argv[1]
ns = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
r = ET.parse(os.path.join(d, 'xl', 'worksheets', 'sheet1.xml')).getroot()

hf = r.find(ns + 'headerFooter')
if hf is not None:
    for c in hf:
        s = c.text or ''
        print('  headerFooter', c.tag.replace(ns, ''), 'len', len(s),
              'OK' if len(s) <= 255 else '*** OVER 255 -- Excel will refuse this file ***')
else:
    print('  headerFooter: none')

merges = [m.get('ref') for m in r.iter(ns + 'mergeCell')]
def box(ref):
    a, b = ref.split(':')
    def rc(s):
        m = re.match(r'([A-Z]+)(\d+)', s); col = 0
        for ch in m.group(1): col = col * 26 + ord(ch) - 64
        return col, int(m.group(2))
    c1, r1 = rc(a); c2, r2 = rc(b)
    return (min(c1, c2), min(r1, r2), max(c1, c2), max(r1, r2))
bs = [box(m) for m in merges]
ov = sum(1 for i in range(len(bs)) for j in range(i + 1, len(bs))
         if bs[i][0] <= bs[j][2] and bs[j][0] <= bs[i][2]
         and bs[i][1] <= bs[j][3] and bs[j][1] <= bs[i][3])
print('  merges', len(merges), '| overlapping', ov, 'OK' if ov == 0 else '*** OVERLAP ***')

ws = [float(c.get('width')) for c in r.iter(ns + 'col') if c.get('width')]
print('  cols with width', len(ws), '| max', max(ws) if ws else 0,
      'OK' if all(w <= 255 for w in ws) else '*** WIDTH > 255 ***')

sr = ET.parse(os.path.join(d, 'xl', 'styles.xml')).getroot()
n = int(sr.find(ns + 'cellXfs').get('count'))
mx = max([int(c.get('s')) for c in r.iter(ns + 'c') if c.get('s')] or [0])
print('  cellXfs', n, '| max style id used', mx, 'OK' if mx < n else '*** STYLE ID OUT OF RANGE ***')

ps = r.find(ns + 'pageSetup')
print('  orientation', ps.get('orientation') if ps is not None else '?')
wr = ET.parse(os.path.join(d, 'xl', 'workbook.xml')).getroot()
for e in wr.iter(ns + 'definedName'):
    print('  definedName', e.get('name'), e.text)
PY
rm -rf "$D"
exit $bad
