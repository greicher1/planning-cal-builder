#!/usr/bin/env python3
"""Regenerate src/styles/inter.css — Inter, embedded as one base64 variable woff2.

Why this exists (and why the font is not simply <link>ed from Google any more): the tool is
emailed around and run from file://, and offline it fell back to a system face — which matters
because mvNoteLineCount() MEASURES text against Inter and its result sets month-view row heights
that exportMonthPdf prints. A font that may or may not arrive is a font that may or may not
repaginate someone's PDF.

Sibling of tools/subset-font.py, which does the same job for Carlito. ⚠️ Do not confuse the two:
Carlito feeds the frozen WIDTH MODEL for the grid and the Excel/PDF writers; Inter is chrome only.

Usage:  python3 tools/fetch-inter.py
Then:   npm run build, and re-run the metric check in HANDOFF (the four canvas widths).
"""
import base64, pathlib, re, sys, urllib.request

# The variable file: one download covering 400-700, ~48 KB, against ~150 KB for four statics.
CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap'
# A modern UA is required or Google serves ttf/eot instead of woff2.
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'styles' / 'inter.css'


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    data = urllib.request.urlopen(req, timeout=30).read()
    return data if binary else data.decode()


def main():
    css = fetch(CSS_URL)
    # LATIN ONLY. The UI copy is English and every symbol drawn (em dash, middot, check, caret,
    # multiplication sign) is inside the latin range or comes from theme.fontFamily's emoji tail.
    block = re.search(r'/\* latin \*/\s*(@font-face \{.*?\})', css, re.S)
    if not block:
        sys.exit('latin @font-face block not found — Google changed the response shape')
    url = re.search(r'url\((https://[^)]+)\)', block.group(1)).group(1)
    urange = re.search(r'unicode-range: ([^;]+);', block.group(1)).group(1).strip()
    woff2 = fetch(url, binary=True)
    print('woff2 bytes: %d  ->  base64 %d' % (len(woff2), len(base64.b64encode(woff2))))

    header = OUT.read_text().split('@font-face')[0] if OUT.exists() else ''
    if not header:
        sys.exit('refusing to write without the existing explanatory header — restore it first')
    OUT.write_text(header + """@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(data:font/woff2;base64,%s) format('woff2');
  unicode-range: %s;
}
""" % (base64.b64encode(woff2).decode(), urange))
    print('wrote', OUT)


if __name__ == '__main__':
    main()
