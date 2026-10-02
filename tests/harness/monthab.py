#!/usr/bin/env python3
"""monthab -- the month PDF's A/B (MONTH-PDF-WRITER-PLAN.md §5.2, step 4): the WRITER's PDF against CHROME'S PRINT of
the same print documents, page by page. The monthwriter leg makes both in one run (one build, one date, one window,
one set of preferences) and records which page of Chrome's print is which month of which writer file.

    python3 monthab.py <monthwriter.json> <monthwriter.print.pdf> [--label NAME] [--sheets DIR] [--no-pixels]

Gated (exit 1 on any failure), printed as the gate prints:
  P0  poppler reads every file clean: pdfinfo and pdftotext with an empty stderr; the writer's fonts are embedded
      TrueType (pdffonts)
  P1  pages: each writer file has one page per month, and Chrome's print one sheet per month of every document
  P2  every page is 792 x 612 pt (Letter landscape)
  P3  every page carries its month's label, in both files
  P4  every page's text is the same: the same whitespace-separated tokens, as a multiset (pdftotext). ⚠️ STRICT. The
      plan expected to normalise Chrome's automatic hyphenation and the two files' different "…" cut points; not one
      page of tier 1 or tier 2 needed either, so neither is applied. A calendar that does will show its tokens here.
  P5  the grid's lines: every black rectangle either file paints -- the frame, the month bar's and weekday row's
      borders, every week's top line, every day's left line -- read from both files' own vector coordinates, must pair
      one for one, each edge within 1.5 CSS px, in every month whose weeks all keep today's fit. ⚠️ Not 1 px, as first
      proposed: Chrome's REAL print snaps its page box to whole pixels (30 px margins; the frame's foot lands at 753
      px, so the box it lays out is about 755 px tall, not the 755.528 of 8 mm) and every border to a whole pixel,
      while the writer draws the exact 8 mm geometry. Measured on tier 1 and tier 2 (200 such months), the lines sit
      up to 1.108 px apart, and 13 months reach it. The exact geometry is held far tighter by the monthwriter leg
      (A1: rows to 0.02 px; A3: boxes to 0.03 px), against Chrome's layout of the same box. Months the writer lays out
      differently by design -- a week holding a note the print path measured at another width, a blank band printed
      full height (owner ruling 5), a shrunk month -- are reported, not judged.
Reported, never gated: the PIXELS. Both files are rendered by poppler (pdftoppm, 96 dpi, on white). A pixel differs
when no pixel within 1 px of it in the other image is within 24 grey levels on every channel; the count and share are
printed per page, and --sheets writes, per document, a contact sheet of print | writer | difference for every month
(and the full-size triptych of every month that differs by design), for the owner. Never across renderers: poppler and
Quartz disagree on 3% of the pixels of the same page. --no-pixels skips it (gate.sh does: it gates nothing, and it is
most of the judge's time, about 45 s for tier 1's 124 pages).
"""
import json, os, re, shutil, subprocess, sys, tempfile, zlib
from collections import Counter

PX_PER_PT = 4.0 / 3.0          # CSS px per point: the page is 1056 x 816 px
LINE_TOL = 1.5                 # CSS px, P5 (measured worst 1.108: see the docstring)
GREY_TOL = 24                  # levels, the pixel report


def run(args):
    r = subprocess.run(args, capture_output=True)
    return r.stdout, r.stderr.decode('utf-8', 'replace').strip()


# ---- a PDF's objects and page content, enough for both files (no xref needed) ------------------------------------
def pdf_objects(b):
    objs = {}
    for m in re.finditer(rb'(?:^|\n)(\d+) 0 obj\s*', b):
        start = m.end()
        objs[int(m.group(1))] = (start, b.find(b'endobj', start))
    return objs


def pdf_stream(b, objs, n):
    start, end = objs[n]
    seg = b[start:end]
    si = seg.find(b'stream')
    d = seg[:si]
    m = re.search(rb'/Length (\d+)( 0 R)?', d)
    ln = int(m.group(1))
    if m.group(2):
        s2, e2 = objs[ln]
        ln = int(b[s2:e2].strip())
    p = start + si + len(b'stream')
    p += 2 if b[p:p + 2] == b'\r\n' else (1 if b[p:p + 1] == b'\n' else 0)
    data = b[p:p + ln]
    return zlib.decompress(data) if b'/FlateDecode' in d else data


def pdf_pages(b):
    """Each page's content (all its streams joined), in page order, through the page tree."""
    objs = pdf_objects(b)
    body = lambda n: b[objs[n][0]:objs[n][1]]
    root = int(re.search(rb'/Root (\d+) 0 R', b).group(1))
    pages_ref = int(re.search(rb'/Pages (\d+) 0 R', body(root)).group(1))
    out = []

    def walk(n):
        d = body(n)
        if re.search(rb'/Type\s*/Pages\b', d):
            kids = re.search(rb'/Kids\s*\[([^\]]*)\]', d).group(1)
            for k in re.findall(rb'(\d+) 0 R', kids):
                walk(int(k))
        else:
            cm = re.search(rb'/Contents\s*(\[[^\]]*\]|\d+ 0 R)', d)
            refs = [int(x) for x in re.findall(rb'(\d+) 0 R', cm.group(1))]
            out.append(b'\n'.join(pdf_stream(b, objs, r) for r in refs))
    walk(pages_ref)
    return out


TOKEN = re.compile(rb'\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>|\[|\]|<<|>>|/[^\s/\[\]()<>{}%]*|[^\s/\[\]()<>{}%]+')


def black_rects(content):
    """Every filled rectangle painted pure black, in CSS px on the paper (origin top-left, y down). A tiny interpreter:
    q/Q/cm for the transform, rg for the fill colour, re for the path, f/f*/F to fill it, n to drop it. Text and
    XObjects are skipped; a filled path of anything other than rectangles is skipped too (no black one exists)."""
    ctm, stack, fill, path, ops, out = [1, 0, 0, 1, 0, 0], [], (0, 0, 0), [], [], []
    in_text = False
    for tok in TOKEN.findall(content):
        if tok == b'BT':
            in_text = True; ops = []; continue
        if tok == b'ET':
            in_text = False; ops = []; continue
        if in_text:
            continue
        if re.match(rb'^[-+]?(\d+\.?\d*|\.\d+)$', tok):
            ops.append(float(tok)); continue
        if tok[:1] in (b'/', b'(', b'<', b'[', b']'):
            ops.append(tok); continue
        op = tok
        if op == b'q':
            stack.append((list(ctm), fill))
        elif op == b'Q':
            ctm, fill = stack.pop()
        elif op == b'cm':
            a, b_, c, d, e, f = ops[-6:]
            A, B, C, D, E, F = ctm
            ctm = [a * A + b_ * C, a * B + b_ * D, c * A + d * C, c * B + d * D, e * A + f * C + E, e * B + f * D + F]
        elif op == b'rg':
            fill = tuple(ops[-3:])
        elif op == b're':
            path.append(tuple(ops[-4:]))
        elif op in (b'm', b'l', b'c', b'v', b'y', b'h'):
            path.append(None)
        elif op in (b'f', b'f*', b'F'):
            if fill == (0, 0, 0) and path and all(p is not None for p in path):
                for (x, y, w, h) in path:
                    pts = [(x, y), (x + w, y), (x, y + h), (x + w, y + h)]
                    dev = [(ctm[0] * px + ctm[2] * py + ctm[4], ctm[1] * px + ctm[3] * py + ctm[5]) for px, py in pts]
                    xs, ys = [p[0] for p in dev], [p[1] for p in dev]
                    # points (y up) to paper px (y down)
                    out.append((min(xs) * PX_PER_PT, (612 - max(ys)) * PX_PER_PT,
                                (max(xs) - min(xs)) * PX_PER_PT, (max(ys) - min(ys)) * PX_PER_PT))
            path = []
        elif op == b'n':
            path = []
        ops = []
    return out


def pair_lines(mine, theirs, tol):
    """Pair each black rectangle of `mine` with one of `theirs`, every edge within tol. Returns (worst, unpaired)."""
    left = list(theirs)
    worst, unpaired = 0.0, []
    for r in sorted(mine, key=lambda r: (r[1], r[0])):
        best, bi = None, -1
        for i, t in enumerate(left):
            d = max(abs(r[0] - t[0]), abs(r[1] - t[1]), abs(r[0] + r[2] - t[0] - t[2]), abs(r[1] + r[3] - t[1] - t[3]))
            if best is None or d < best:
                best, bi = d, i
        if best is None or best > tol:
            unpaired.append(('writer', r, best))
        else:
            worst = max(worst, best)
            left.pop(bi)
    unpaired += [('print', t, None) for t in left]
    return worst, unpaired


def main(argv):
    args = argv[1:]
    label = 'monthwriter A/B'
    sheets = None
    if '--label' in args:
        i = args.index('--label'); label = args[i + 1]; del args[i:i + 2]
    if '--sheets' in args:
        i = args.index('--sheets'); sheets = args[i + 1]; del args[i:i + 2]
    pixels = '--no-pixels' not in args
    if not pixels:
        args.remove('--no-pixels')
    leg_json, print_pdf = args[0], args[1]
    here = os.path.dirname(os.path.abspath(leg_json))
    bad = 0

    def chk(cond, msg):
        nonlocal bad
        print(('  PASS  ' if cond else '  FAIL  ') + label + ' ' + msg)
        bad += 0 if cond else 1

    missing = [t for t in ('pdfinfo', 'pdftotext', 'pdffonts', 'pdftoppm') if not shutil.which(t)]
    if missing:
        chk(False, 'P0: poppler is not installed (' + ', '.join(missing) + '): brew install poppler')
        return 1
    leg = json.load(open(leg_json))
    ab = (leg.get('info') or {}).get('ab')
    if not ab:
        chk(False, 'P0: the leg left no A/B record (did it run to the end?)')
        return 1
    docs = ab['docs']
    files = [os.path.join(here, d['file']) for d in docs]

    # ---- P0 ----
    p0 = []
    for f in files + [print_pdf]:
        out, err = run(['pdfinfo', f])
        if err:
            p0.append(os.path.basename(f) + ' pdfinfo: ' + err[:80])
        out, err = run(['pdftotext', f, '-'])
        if err:
            p0.append(os.path.basename(f) + ' pdftotext: ' + err[:80])
    for f in files:
        out, err = run(['pdffonts', f])
        rows = [l for l in out.decode().splitlines()[2:] if l.strip()]
        if err or not rows or not all(' TrueType ' in l and re.search(r'WinAnsi\s+yes\s+yes', l) for l in rows):
            p0.append(os.path.basename(f) + ' pdffonts: ' + (err or 'not all embedded TrueType'))
    chk(not p0, 'P0: poppler reads all %d writer files and the print clean, and the writer embeds only TrueType%s'
        % (len(files), (': ' + '; '.join(p0[:3])) if p0 else ''))

    # ---- P1 / P2 ----
    def pages_and_sizes(f):
        out, _ = run(['pdfinfo', '-f', '1', '-l', '999', f])
        t = out.decode()
        n = int(re.search(r'^Pages:\s+(\d+)', t, re.M).group(1))
        sizes = set(re.findall(r'^Page\s+\d+ size:\s+([\d.]+ x [\d.]+)', t, re.M))
        return n, sizes
    p1, sizes = [], set()
    for d, f in zip(docs, files):
        n, s = pages_and_sizes(f)
        sizes |= s
        if n != len(d['months']):
            p1.append('%s: %d pages for %d months' % (d['name'], n, len(d['months'])))
    pn, ps = pages_and_sizes(print_pdf)
    sizes |= ps
    if pn != ab['printPages']:
        p1.append('the print: %d sheets for %d months' % (pn, ab['printPages']))
    chk(not p1, 'P1: one writer page per month (%d), and Chrome printed one sheet per month (%d)%s'
        % (sum(len(d['months']) for d in docs), pn, (': ' + '; '.join(p1[:3])) if p1 else ''))
    chk(sizes == {'792 x 612'}, 'P2: every page is 792 x 612 pt (%s)' % ', '.join(sorted(sizes)))
    if p1:
        return 1

    # ---- P3 / P4 / P5, page by page ----
    print_pages = pdf_pages(open(print_pdf, 'rb').read())
    p3, p4, p5, worst5, judged5, reported = [], [], [], 0.0, 0, []
    for d, f in zip(docs, files):
        wpages = pdf_pages(open(f, 'rb').read())
        for i, m in enumerate(d['months']):
            cp = d['firstPrintPage'] + i
            wt = run(['pdftotext', '-f', str(i + 1), '-l', str(i + 1), f, '-'])[0].decode('utf-8', 'replace')
            ct = run(['pdftotext', '-f', str(cp), '-l', str(cp), print_pdf, '-'])[0].decode('utf-8', 'replace')
            where = d['name'] + ' / ' + m['label']
            if m['label'] not in wt or m['label'] not in ct:
                p3.append(where)
            tw, tc = Counter(wt.split()), Counter(ct.split())
            if tw != tc:
                p4.append('%s: writer-only %s, print-only %s' % (where, list((tw - tc).elements())[:6], list((tc - tw).elements())[:6]))
            mine, theirs = black_rects(wpages[i]), black_rects(print_pages[cp - 1])
            worst, unpaired = pair_lines(mine, theirs, LINE_TOL)
            by_design = m['mode'] != 'fill' or not m['kept'] or m.get('blankBands')
            if by_design:
                why = 'shrunk to %.4f' % m['scale'] if m['mode'] != 'fill' else ('weeks laid out anew: ' + ', '.join(m['changed'])
                                                                                 if not m['kept'] else 'blank band full height')
                reported.append((where, why, len(unpaired), worst))
            else:
                judged5 += 1
                worst5 = max(worst5, worst)
                if unpaired:
                    p5.append('%s: %d unpaired (%s)' % (where, len(unpaired), unpaired[0]))
    chk(not p3, 'P3: every page of both files carries its month label%s' % ((': ' + ', '.join(p3[:3])) if p3 else ''))
    chk(not p4, 'P4: every page\'s text is the same tokens in both files (%d pages)%s'
        % (sum(len(d['months']) for d in docs), (': ' + '; '.join(p4[:3])) if p4 else ''))
    chk(not p5 and judged5 > 0,
        'P5: the grid\'s lines pair one for one within %g CSS px in the %d months that keep today\'s fit (worst %.3f px)%s'
        % (LINE_TOL, judged5, worst5, (': ' + '; '.join(p5[:3])) if p5 else ''))
    for where, why, n, worst in reported:
        print('  INFO  %s P5 reported, not judged: %s (%s; %d lines unpaired at %g px)' % (label, where, why, n, LINE_TOL))

    # ---- the pixels: a report, and the contact sheets ----
    if pixels:
        pixel_report(docs, files, print_pdf, label, sheets)
    return 1 if bad else 0


def render(pdf, first, last, outdir, tag):
    subprocess.run(['pdftoppm', '-r', '96', '-png', '-f', str(first), '-l', str(last), pdf, os.path.join(outdir, tag)],
                   check=True, capture_output=True)
    names = sorted(n for n in os.listdir(outdir) if n.startswith(tag + '-') and n.endswith('.png'))
    return [os.path.join(outdir, n) for n in names]


def pixel_report(docs, files, print_pdf, label, sheets):
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        print('  INFO  %s pixels: numpy and Pillow are needed for the pixel report; skipped' % label)
        return
    tmp = tempfile.mkdtemp(prefix='monthab-')
    try:
        for d, f in zip(docs, files):
            n = len(d['months'])
            wp = render(f, 1, n, tmp, d['name'] + '-w')
            cp = render(print_pdf, d['firstPrintPage'], d['firstPrintPage'] + n - 1, tmp, d['name'] + '-c')
            rows = []
            for i, m in enumerate(d['months']):
                a = np.asarray(Image.open(cp[i]).convert('RGB')).astype(np.int16)
                b = np.asarray(Image.open(wp[i]).convert('RGB')).astype(np.int16)
                diff_ab, diff_ba = far(a, b, np), far(b, a, np)
                differs = diff_ab | diff_ba
                share = differs.mean()
                print('  INFO  %s pixels %s / %s: %d differ (%.2f%%), %s' % (label, d['name'], m['label'], int(differs.sum()), 100 * share,
                      'by design: ' + (('shrunk %.4f' % m['scale']) if m['mode'] != 'fill' else ', '.join(m['changed']) or 'blank band')
                      if (m['mode'] != 'fill' or not m['kept'] or m.get('blankBands')) else 'keeps today\'s fit'))
                rows.append((m, a.astype(np.uint8), b.astype(np.uint8), heat(a, b, differs, np)))
            if sheets:
                os.makedirs(sheets, exist_ok=True)
                contact(rows, os.path.join(sheets, d['name'] + '.png'), Image, np)
                for m, a, b, h in rows:
                    if m['mode'] != 'fill' or not m['kept'] or m.get('blankBands'):
                        triptych(a, b, h, os.path.join(sheets, '%s-%s.png' % (d['name'], m['label'].replace(' ', '-'))), Image, np)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def far(a, b, np):
    """Pixels of `a` with no pixel within 1 px of them in `b` within GREY_TOL on every channel."""
    h, w, _ = a.shape
    ok = np.zeros((h, w), dtype=bool)
    pad = np.pad(b, ((1, 1), (1, 1), (0, 0)), mode='edge')
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            ok |= (np.abs(a - pad[dy:dy + h, dx:dx + w]) <= GREY_TOL).all(axis=2)
    return ~ok


def heat(a, b, differs, np):
    """The print, faded, with every differing pixel in red."""
    base = (255 - (255 - a.astype(np.int16)) * 0.25).astype(np.uint8)
    out = base.copy()
    out[differs] = (220, 30, 30)
    return out


def triptych(a, b, h, path, Image, np):
    gap = np.full((a.shape[0], 12, 3), 255, dtype=np.uint8)
    Image.fromarray(np.concatenate([a, gap, b, gap, h], axis=1)).save(path, optimize=True)


def contact(rows, path, Image, np, scale=0.34):
    thumbs = []
    for m, a, b, h in rows:
        trip = np.concatenate([a, np.full((a.shape[0], 16, 3), 255, np.uint8), b, np.full((a.shape[0], 16, 3), 255, np.uint8), h], axis=1)
        im = Image.fromarray(trip)
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        thumbs.append(np.asarray(im))
    w = max(t.shape[1] for t in thumbs)
    sep = np.full((10, w, 3), 255, np.uint8)
    Image.fromarray(np.concatenate([x for t in thumbs for x in (t, sep)], axis=0)).save(path, optimize=True)


if __name__ == '__main__':
    sys.exit(main(sys.argv))
