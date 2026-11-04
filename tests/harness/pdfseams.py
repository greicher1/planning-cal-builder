#!/usr/bin/env python3
# pdfseams.py -- no hairline between touching fills in the waterfall PDF (frozen edit SM1 in buildWaterfallPdf, owner
# sign-off 4 Nov 2026; HANDOFF, "A HAIRLINE BETWEEN ROWS IN THE WATERFALL PDF").
#
# The writer paints every cell as its own `re f`, edge to edge. A viewer that anti-aliases paints the pixel on a shared
# edge twice with partial coverage, and the white page leaks through: a light line between a phase's weeks. SM1 paints,
# right after each fill, a strip of its colour across the edge it shares with a fill painted later (below it, or to its
# right), 1 pt each side, over the two cells' common span; the later fill covers the strip's far half.
#
#   pdfseams.py WRITER.pdf --render BIN
#
# WRITER.pdf is the writer's own bytes (gate 2's base.writer.pdf: pdfmark.py has taken the SPTCal mark off).
# BIN is pdfseams-render (pdfseams-render.swift, compiled by gate.sh).
#   S1  structure: every pair of touching cells carries exactly its strip, and nothing else is a strip.
#   S2  pixels: through Quartz at 1x, 1.37x and 2x, no shared edge is VISIBLE_AT/255 or more lighter than both fills.
#   S3  positive control: the same PDF with its strips taken out DOES show a light line at 1x, or S2 proves nothing.
# Exit 0 with a one-line summary; exit 1 naming the first thing wrong.
import os, re, subprocess, sys, tempfile, zlib

VISIBLE_AT = 8          # /255 lighter than the lighter of the two fills: the eye starts to see a line here
SEAL_PT = 1.0           # SM1's SEAL_PT
TOL = 0.003             # pdfNum rounds every coordinate to 0.001 pt, and an edge is a sum of two of them
SCALES = (1, 1.37, 2)

def fail(msg):
    print(msg); sys.exit(1)

def read_pdf(path):
    b = open(path, 'rb').read()
    m = re.search(rb'4 0 obj\n<< /Length (\d+) /Filter /FlateDecode >>\nstream\n', b)
    if not m: fail('not a waterfall PDF from the writer (no content stream at object 4)')
    n = int(m.group(1))
    return b, m, n, zlib.decompress(b[m.end():m.end() + n]).decode('latin-1').split('\n')

FILL = re.compile(r'^([\d.]+) ([\d.]+) ([\d.]+) rg ([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+) re f$')
CLIP = re.compile(r'^q ([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+) re W n$')

def classify(ops):
    """Cells are fills whose own clip follows them (after their strips); strips are the fills in between."""
    cells, i = [], 0
    while i < len(ops):
        m = FILL.match(ops[i])
        if not m: i += 1; continue
        j, strips = i + 1, []
        while j < len(ops) and FILL.match(ops[j]): strips.append(j); j += 1
        c = CLIP.match(ops[j]) if j < len(ops) else None
        if c and c.groups() == m.groups()[3:]:
            v = [float(x) for x in m.groups()]
            cells.append(dict(i=i, rgb=tuple(v[:3]), x=v[3], y=v[4], w=v[5], h=v[6],
                              strips=[dict(i=k, **dict(zip(('r', 'g', 'b', 'x', 'y', 'w', 'h'),
                                                            [float(x) for x in FILL.match(ops[k]).groups()])))
                                      for k in strips]))
        i = j if c else i + 1
    return cells

def touching(cells):
    """(P, R, kind, expected strip box) for every earlier cell P that shares an edge with a later cell R."""
    out = []
    for a, P in enumerate(cells):
        for R in cells[a + 1:]:
            if abs(P['y'] - (R['y'] + R['h'])) < TOL:                       # P directly above R (PDF y runs up)
                x0, x1 = max(P['x'], R['x']), min(P['x'] + P['w'], R['x'] + R['w'])
                if x1 - x0 > 0.01:
                    e = P['y']
                    out.append((P, R, 'row', (x0, e - min(SEAL_PT, R['h']), x1 - x0,
                                              min(SEAL_PT, R['h']) + min(SEAL_PT, P['h']))))
            if abs(P['x'] + P['w'] - R['x']) < TOL:                         # P directly left of R
                y0, y1 = max(P['y'], R['y']), min(P['y'] + P['h'], R['y'] + R['h'])
                if y1 - y0 > 0.01:
                    e = R['x']
                    out.append((P, R, 'col', (e - min(SEAL_PT, P['w']), y0, min(SEAL_PT, P['w']) + min(SEAL_PT, R['w']),
                                              y1 - y0)))
    return out

def s1(cells, pairs):
    used = set()
    for P, R, kind, box in pairs:
        hit = [s for s in P['strips'] if (s['r'], s['g'], s['b']) == P['rgb']
               and all(abs(a - b) < TOL for a, b in zip((s['x'], s['y'], s['w'], s['h']), box))]
        if not hit:
            fail('S1 no strip across the %s edge between the fills at (%.2f, %.2f) and (%.2f, %.2f)'
                 % (kind, P['x'], P['y'], R['x'], R['y']))
        used.add(hit[0]['i'])
    extra = [s for c in cells for s in c['strips'] if s['i'] not in used]
    if extra:
        s = extra[0]
        fail('S1 %d strip(s) belong to no shared edge, first at (%.2f, %.2f) %.2f x %.2f'
             % (len(extra), s['x'], s['y'], s['w'], s['h']))

def render(binary, pdf, scale, tmp):
    raw = os.path.join(tmp, 'page.raw')
    r = subprocess.run([binary, pdf, str(scale), raw], capture_output=True)
    if r.returncode != 0 or not os.path.exists(raw):
        fail('could not render %s at %sx (%s)' % (pdf, scale, r.stderr.decode(errors='replace').strip()[:120]))
    d = open(raw, 'rb').read(); os.remove(raw)
    nl = d.index(b'\n'); W, H = map(int, d[:nl].split())
    return W, H, d[nl + 1:]

def worst_seam(img, scale, pairs, same_only=False):
    """How much lighter than both fills the shared edge renders, per pair. A seam runs the whole edge, so take the
    LEAST light of five samples along it: a glyph near the edge can lighten one sample, never all five."""
    W, H, px = img
    def at(xd, yd_up):
        j = H - 1 - yd_up
        if not (0 <= xd < W and 0 <= j < H): return (0, 0, 0)
        o = (j * W + xd) * 4
        return px[o], px[o + 1], px[o + 2]
    out = []
    for P, R, kind, _ in pairs:
        if same_only and P['rgb'] != R['rgb']: continue
        ref = [max(round(a * 255), round(b * 255)) for a, b in zip(P['rgb'], R['rgb'])]
        light = lambda p: max(c - r for c, r in zip(p, ref))
        if kind == 'row':
            x0, x1 = max(P['x'], R['x']) + 1.5, min(P['x'] + P['w'], R['x'] + R['w']) - 1.5
            e = P['y'] * scale
            along = [x0 + (x1 - x0) * k / 4 for k in range(5)] if x1 > x0 else [(x0 + x1) / 2]
            vals = [max(light(at(int(x * scale), yd)) for yd in range(int(e) - 2, int(e) + 3)) for x in along]
        else:
            y0, y1 = max(P['y'], R['y']) + 1.5, min(P['y'] + P['h'], R['y'] + R['h']) - 1.5
            e = R['x'] * scale
            along = [y0 + (y1 - y0) * k / 4 for k in range(5)] if y1 > y0 else [(y0 + y1) / 2]
            vals = [max(light(at(xd, int(y * scale))) for xd in range(int(e) - 2, int(e) + 3)) for y in along]
        out.append(min(vals))
    return out

def without_strips(b, m, n, ops, cells, path):
    drop = {s['i'] for c in cells for s in c['strips']}
    body = zlib.compress('\n'.join(o for k, o in enumerate(ops) if k not in drop).encode('latin-1'))
    head = b[:m.start()]
    obj4 = ('4 0 obj\n<< /Length %d /Filter /FlateDecode >>\nstream\n' % len(body)).encode() + body
    xi = b.rindex(b'\nxref\n') + 1
    rest = b[m.end() + n:xi]
    delta = len(head) + len(obj4) - (m.end() + n)
    lines = []
    for line in b[xi:].decode('latin-1').split('\n'):
        k = re.match(r'^(\d{10}) 00000 n $', line)
        if k:
            off = int(k.group(1)); line = '%010d 00000 n ' % (off + delta if off > m.start() else off)
        lines.append(line)
    tail = re.sub(r'startxref\n\d+', 'startxref\n%d' % (len(head) + len(obj4) + len(rest)), '\n'.join(lines))
    open(path, 'wb').write(head + obj4 + rest + tail.encode('latin-1'))

def main():
    args = sys.argv[1:]
    if len(args) != 3 or args[1] != '--render': fail('usage: pdfseams.py WRITER.pdf --render BIN')
    pdf, binary = args[0], args[2]
    b, m, n, ops = read_pdf(pdf)
    cells = classify(ops)
    pairs = touching(cells)
    if not pairs: fail('no two fills touch: this calendar cannot test SM1')
    s1(cells, pairs)
    with tempfile.TemporaryDirectory() as tmp:
        for sc in SCALES:
            seams = worst_seam(render(binary, pdf, sc, tmp), sc, pairs)
            bad = [v for v in seams if v >= VISIBLE_AT]
            if bad: fail('S2 at %sx, %d of %d shared edges show a light line (worst %d/255)' % (sc, len(bad), len(seams), max(bad)))
        bare = os.path.join(tmp, 'nostrips.pdf')
        without_strips(b, m, n, ops, cells, bare)
        ctl = worst_seam(render(binary, bare, 1, tmp), 1, pairs, same_only=True)
        seen = sum(1 for v in ctl if v >= VISIBLE_AT)
        if not seen: fail('S3 positive control: with its strips taken out, no seam shows either, so S2 proves nothing')
    nstrips = sum(len(c['strips']) for c in cells)
    print('%d cells, %d shared edges, %d strips; 0 light lines at %s; %d show with the strips removed'
          % (len(cells), len(pairs), nstrips, ' / '.join('%sx' % s for s in SCALES), seen))

main()
