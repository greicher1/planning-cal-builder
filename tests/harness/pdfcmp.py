#!/usr/bin/env python3
"""Compare two waterfall PDFs, ignoring ONLY the today-stamp they both draw in the header.

WHY THIS EXISTS. The waterfall PDF and the Excel header both embed `todayStr`, so a byte-compare
against a date-pinned baseline FAILS on any later day against completely untouched code. gate.sh
carried that as a documented caveat for two rounds — which is worse than it sounds: a permanently
red gate is a gate nobody reads, and it was hiding the one comparison that actually proves the
frozen PDF writer has not moved. This narrows the exemption to the single token that legitimately
changes, and byte-compares everything else.

WHAT IT DOES NOT DO: it does not normalise dates generally. Only the two literal strings passed as
--today and --base are replaced, each in its own file, and only in the dotted M.D.YY form the
header uses. Calendar CONTENT renders dates with slashes (1/5/26), so schedule data is untouched
and a real change to a printed date still fails the compare. The one dotted date in the content —
"Writer's Room Opens: 1.5.26" — is a different string and stays compared.

Usage:  pdfcmp.py NEW.pdf BASELINE.pdf --today 8.31.26 --base 8.29.26
Exit 0 if identical after that substitution; 1 otherwise, printing where they diverge.
"""
import re, sys, zlib, pathlib, argparse


def streams(buf):
    """Every Flate stream in the file, decompressed — page content AND the embedded font.

    ⚠️ DECOMPRESSIBLE ONES ONLY, deliberately. A first version also compared whatever sat between
    a stray "stream" match and the end of the file, which caught the XREF TABLE — whose byte
    offsets shift mechanically whenever any object's length changes, so the date stamp alone made
    it differ and the comparison reported a false positive. Excluding it hides nothing: the xref
    is derived from the objects, and every object's CONTENT is compared strictly below."""
    out = []
    for m in re.finditer(rb'stream\r?\n', buf):
        s = m.end()
        e = buf.find(b'endstream', s)
        if e < 0:
            continue
        try:
            out.append(zlib.decompress(buf[s:e]))
        except Exception:
            continue                      # not a Flate object stream — not content
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('new'); ap.add_argument('baseline')
    ap.add_argument('--today', required=True); ap.add_argument('--base', required=True)
    a = ap.parse_args()

    na = streams(pathlib.Path(a.new).read_bytes())
    nb = streams(pathlib.Path(a.baseline).read_bytes())
    if len(na) != len(nb):
        print('stream COUNT differs: %d vs %d' % (len(na), len(nb))); return 1

    tok = b'(DATE)'
    bad = 0
    for i, (x, y) in enumerate(zip(na, nb)):
        x = x.replace(('(%s)' % a.today).encode(), tok)
        y = y.replace(('(%s)' % a.base).encode(), tok)
        if x == y:
            continue
        bad += 1
        j = 0
        while j < min(len(x), len(y)) and x[j] == y[j]:
            j += 1
        print('stream %d differs at byte %d' % (i, j))
        print('  new     : %s' % x[max(0, j-70):j+70])
        print('  baseline: %s' % y[max(0, j-70):j+70])
    if bad:
        print('%d of %d streams differ beyond the date stamp' % (bad, len(na)))
        return 1
    print('identical apart from the header date stamp (%d streams compared)' % len(na))
    return 0


if __name__ == '__main__':
    sys.exit(main())
