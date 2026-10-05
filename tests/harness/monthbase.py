#!/usr/bin/env python3
"""monthbase -- the month PDF's BYTE BASELINES (MONTH-PDF-WRITER-PLAN.md §5.3 and §8 step 6; UI-CONVENTIONS §10 item 13, gate.sh's gate 13).

    python3 monthbase.py check NEW.pdf BASELINE.pdf [--label NAME]     gate.sh: exact bytes, and a diagnosis if not
    python3 monthbase.py sheets OLD.pdf NEW.pdf OUTDIR [--name NAME]   a re-cut's evidence: old | new | difference
    python3 monthbase.py table DIR                                     the README's table of a baseline directory

THE RULE (owner rulings, 2 Oct 2026, picker). The gate passes ONLY on identical bytes. The files are deterministic: the
monthexport leg pins the page's clock (local noon, 22 Sep 2026), the writer reads no window, and it writes no /Info, no
/ID and fixed font programs, so the same build writes the same bytes in any window and time zone (gate.sh proves both
for the reference calendar on every run).

⚠️ ONE THING OUTSIDE THE APP CAN MOVE THEM: CHROME'S OWN DEFLATE. Every page's content goes through CompressionStream
(the frozen pdfDeflate), which is Chromium's zlib, and a Chrome update can compress the same content to different bytes.
(The four font programs cannot move: they travel pre-compressed inside the build.) So when the bytes differ, `check`
says WHICH of two things happened, and fails either way:
  - "ONLY CHROME'S COMPRESSOR CHANGED": every object is identical once its streams are inflated. The owner's exception
    applies: re-cut with this output recorded in the baselines' README, and tell the owner. No contact sheets, because
    nothing a reader can see has moved.
  - "THE CONTENT MOVED": it names each part that differs, by ROLE (page 3 = "March 2026", its content; font F500's
    widths; the page tree), with the first differing line and the text runs added and removed. Never re-cut on this
    without the owner's sign-off on `sheets`' contact sheets (the owner's ruling; UI-CONVENTIONS §10 item 13).

The diagnosis reads the writer's own layout (mvlSerialize: numbered objects in a fixed order, one-line dictionaries,
`/Length` exact) and nothing more general. A file it cannot parse is reported as such, and still fails.

`sheets` renders both files with poppler (pdftoppm, 96 dpi, on white; never compare across renderers) and writes, per
calendar, a contact sheet of old | new | difference for every page, plus the full-size triptych of each page that
differs. Red marks EVERY pixel that differs, with no tolerance. ⚠️ Not monthab.py's rule (no match within 1 px and 24
grey levels): that one is for the print against the writer, two different rasterisations; here both files are the
writer's, through one renderer, and its 1 px allowance hid a row moved by exactly one pixel (measured: 0 pixels
reported for it). The drawing helpers are monthab.py's, imported, not copied.
"""
import difflib, hashlib, os, re, shutil, sys, tempfile, zlib
from collections import Counter

MONTHS = ('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
          'November', 'December')
MONTH_LABEL = re.compile(r'\(((?:%s) \d{4})\) Tj' % '|'.join(MONTHS))
TJ = re.compile(r'\(((?:\\.|[^\\)])*)\) Tj')


# ---- the writer's file, parsed by its own layout ------------------------------------------------------------------
def parse(b):
    """{'head', 'objs': {n: (dict, stream-or-None)}, 'trailer'} for a file mvlSerialize wrote. Raises on anything else."""
    nl = b.find(b'\n', b.find(b'\n') + 1)                   # '%PDF-1.4\n' and the binary comment line
    if not b.startswith(b'%PDF-') or nl < 0:
        raise ValueError('no PDF header')
    head, at, objs = b[:nl + 1], nl + 1, {}
    while not b.startswith(b'xref\n', at):
        m = re.compile(rb'(\d+) 0 obj\n').match(b, at)
        if not m:
            raise ValueError('expected an object or the xref at byte %d' % at)
        n, at = int(m.group(1)), m.end()
        e = b.find(b'\n', at)
        d = b[at:e]
        at = e + 1
        stream = None
        if b.startswith(b'stream\n', at):
            L = re.search(rb'/Length (\d+)[ >]', d)
            if not L:
                raise ValueError('object %d has a stream and no /Length' % n)
            s = at + len(b'stream\n')
            stream = b[s:s + int(L.group(1))]
            at = s + int(L.group(1))
            if not b.startswith(b'\nendstream\n', at):
                raise ValueError('object %d: its stream does not end where /Length says' % n)
            at += len(b'\nendstream\n')
        if not b.startswith(b'endobj\n', at):
            raise ValueError('object %d has no endobj' % n)
        at += len(b'endobj\n')
        if n in objs:
            raise ValueError('object %d appears twice' % n)
        objs[n] = (d, stream)
    t = b.find(b'trailer\n', at)
    if t < 0:
        raise ValueError('no trailer')
    trailer = re.sub(rb'startxref\n\d+\n', b'startxref\n#\n', b[t:])   # the xref's offset is derived, not content
    return {'head': head, 'objs': objs, 'trailer': trailer, 'xref': b[at:t].count(b' n \n')}


def inflate(d, s):
    """A stream's content: inflated when its dictionary says /FlateDecode, else as written."""
    if s is not None and b'/FlateDecode' in d:
        try:
            return zlib.decompress(s)
        except Exception:
            return s
    return s


def canon_dict(d, s):
    """A dictionary with what derives from compression set aside: /Length of a Flate stream (its compressed size)."""
    if s is not None and b'/FlateDecode' in d:
        d = re.sub(rb'/Length \d+([ >])', rb'/Length #\1', d)
    return d


def roles(p):
    """{role: object number}, read from the file's own catalog, page tree and resources, so the two files' parts
    are paired by WHAT they are (a page, a font) and not by number: one more font renumbers every page."""
    objs, out, labels = p['objs'], {}, []
    out['catalog'] = 1
    root = re.search(rb'/Pages (\d+) 0 R', objs[1][0])
    out['page tree'] = int(root.group(1)) if root else 2
    kids = [int(k) for k in re.findall(rb'(\d+) 0 R', (re.search(rb'/Kids \[([^\]]*)\]', objs[out['page tree']][0]) or
                                                     re.match(rb'()', b'')).group(1))]
    res = None
    for i, k in enumerate(kids):
        d = objs[k][0]
        c = re.search(rb'/Contents (\d+) 0 R', d)
        r = re.search(rb'/Resources (\d+) 0 R', d)
        res = res or (int(r.group(1)) if r else None)
        label = None
        if c:
            txt = (inflate(*objs[int(c.group(1))]) or b'').decode('latin-1')
            m = MONTH_LABEL.search(txt)
            label = m.group(1) if m else None
        name = 'page %d%s' % (i + 1, ' (%s)' % label if label else '')
        labels.append(label)
        out[name] = k
        if c:
            out[name + ', its content'] = int(c.group(1))
    if res:
        out['resources'] = res
        for tag, n in re.findall(rb'/(\w+) (\d+) 0 R', objs[res][0]):
            tag, n = tag.decode(), int(n)
            out['font %s' % tag] = n
            fd = re.search(rb'/FontDescriptor (\d+) 0 R', objs[n][0]) if n in objs else None
            if fd:
                out['font %s, its descriptor' % tag] = int(fd.group(1))
                ff = re.search(rb'/FontFile2 (\d+) 0 R', objs[int(fd.group(1))][0]) if int(fd.group(1)) in objs else None
                if ff:
                    out['font %s, its program' % tag] = int(ff.group(1))
    return out, labels


def deref(d):
    """Object numbers in a dictionary, set aside for the ROLE comparison only (they are compared as layout, below)."""
    return re.sub(rb'\d+ 0 R', b'# 0 R', d)


def first_diff(a, b, width=90):
    """'line L of N: <old> -> <new>' for the first line two texts differ on, and how many lines differ in all. A long line
    is shown around its first differing character, so a one-line dictionary does not print two identical prefixes."""
    la, lb = a.split('\n'), b.split('\n')
    sm = difflib.SequenceMatcher(None, la, lb, autojunk=False)
    ops = [o for o in sm.get_opcodes() if o[0] != 'equal']
    if not ops:
        return 'identical'
    tag, i1, i2, j1, j2 = ops[0]
    changed = sum(max(i2_ - i1_, j2_ - j1_) for _, i1_, i2_, j1_, j2_ in ops)
    old = la[i1] if i1 < i2 else '(nothing)'
    new = lb[j1] if j1 < j2 else '(nothing)'
    if max(len(old), len(new)) > width and i1 < i2 and j1 < j2:
        c = next((k for k in range(min(len(old), len(new))) if old[k] != new[k]), min(len(old), len(new)))
        f = max(0, c - width // 3)
        old = ('…' if f else '') + old[f:f + width] + ('…' if f + width < len(old) else '')
        new = ('…' if f else '') + new[f:f + width] + ('…' if f + width < len(new) else '')
    return 'line %d of %d: `%s` -> `%s` (%d line%s)' % (i1 + 1, len(la), old, new, changed, ' differs' if changed == 1 else 's differ')


def text_runs(txt):
    return Counter(m.group(1) for m in TJ.finditer(txt))


def diagnose(nb, bb):
    """(kind, lines): kind is 'compressor', 'content' or 'unparsed'."""
    try:
        pn, pb = parse(nb), parse(bb)
        rn, ln = roles(pn)
        rb_, lb = roles(pb)
    except Exception as e:
        return 'unparsed', ['the files do not both parse as the writer\'s layout (%s)' % e]
    # 1. Inflated and with /Length and the xref offset set aside, is every object identical, number for number?
    same = (pn['head'] == pb['head'] and pn['trailer'] == pb['trailer'] and set(pn['objs']) == set(pb['objs']) and
            all(canon_dict(*pn['objs'][n]) == canon_dict(*pb['objs'][n]) and inflate(*pn['objs'][n]) == inflate(*pb['objs'][n])
                for n in pb['objs']))
    if same:
        moved = [n for n in pb['objs'] if pn['objs'][n][1] != pb['objs'][n][1]]
        names = {v: k for k, v in rb_.items()}
        return 'compressor', ['every object is identical once its streams are inflated; %d stream%s compressed to other bytes: %s'
                              % (len(moved), '' if len(moved) == 1 else 's', ', '.join(names.get(n, 'object %d' % n) for n in moved[:6]) +
                                 (' …' if len(moved) > 6 else ''))]
    # 2. The content moved. Name each part by role.
    out = []
    if pn['head'] != pb['head']:
        out.append('the file header differs: %r -> %r' % (pb['head'], pn['head']))
    if lb != ln:
        gone, came = list((Counter(lb) - Counter(ln)).elements()), list((Counter(ln) - Counter(lb)).elements())
        out.append('pages: %d -> %d; months removed %s, added %s' % (len(lb), len(ln), gone, came) if gone or came
                   else 'the pages\' months are in another order: %s -> %s' % (lb, ln))
    fb = sorted(k for k in rb_ if re.fullmatch(r'font \w+', k))
    fn = sorted(k for k in rn if re.fullmatch(r'font \w+', k))
    if fb != fn:
        out.append('fonts embedded: %s -> %s' % (', '.join(f[5:] for f in fb), ', '.join(f[5:] for f in fn)))
    if sorted(pb['objs']) != sorted(pn['objs']) or rb_ != rn:
        out.append('the object layout differs (%d -> %d objects); parts are paired by role below' % (len(pb['objs']), len(pn['objs'])))
    for role in list(rb_) + [r for r in rn if r not in rb_]:
        if role not in rb_ or role not in rn:
            out.append('%s: %s' % (role, 'only in the new file' if role in rn else 'only in the baseline'))
            continue
        db, sb = pb['objs'][rb_[role]]
        dn, sn = pn['objs'][rn[role]]
        if deref(canon_dict(db, sb)) != deref(canon_dict(dn, sn)):
            if role.startswith('font ') and b'/Widths' in db:
                wb = re.search(rb'/Widths \[([^\]]*)\]', db).group(1).split()
                wn = (re.search(rb'/Widths \[([^\]]*)\]', dn) or re.match(rb'()', b'')).group(1).split()
                d = [(32 + i, x.decode(), y.decode()) for i, (x, y) in enumerate(zip(wb, wn)) if x != y]
                out.append('%s: its dictionary differs%s' % (role, ('; /Widths at %d of %d codes, first %r'
                                                                    % (len(d), len(wb), d[0])) if d else ''))
            else:
                out.append('%s: its dictionary differs: %s' % (role, first_diff(db.decode('latin-1'), dn.decode('latin-1'))))
        ib, in_ = inflate(db, sb), inflate(dn, sn)
        if ib != in_:
            if role.endswith('its program'):
                out.append('%s: the font program differs (%d -> %d bytes inflated)' % (role, len(ib or b''), len(in_ or b'')))
                continue
            tb, tn = (ib or b'').decode('latin-1'), (in_ or b'').decode('latin-1')
            line = '%s: %s' % (role, first_diff(tb, tn))
            rb2, rn2 = text_runs(tb), text_runs(tn)
            gone, came = list((rb2 - rn2).elements()), list((rn2 - rb2).elements())
            if gone or came:
                line += '; text runs removed %s, added %s' % (gone[:4] + (['…'] if len(gone) > 4 else []),
                                                             came[:4] + (['…'] if len(came) > 4 else []))
            out.append(line)
    if pn['trailer'] != pb['trailer']:
        out.append('the trailer differs: %r -> %r' % (pb['trailer'], pn['trailer']))
    return 'content', out or ['the bytes differ, and no part of the file could be named (report this as a monthbase.py bug)']


def check(new, base, label):
    if not os.path.exists(base):
        print('  FAIL  %s: no baseline at %s' % (label, base)); return 1
    if not os.path.exists(new):
        print('  FAIL  %s: the run wrote no file (%s)' % (label, new)); return 1
    nb, bb = open(new, 'rb').read(), open(base, 'rb').read()
    if nb == bb:
        print('  PASS  %s: byte-identical to its baseline (%d bytes, sha256 %s…)' % (label, len(nb), hashlib.sha256(nb).hexdigest()[:16]))
        return 0
    kind, lines = diagnose(nb, bb)
    head = {'compressor': 'ONLY CHROME\'S COMPRESSOR CHANGED, the content is identical. Re-cut under the compressor-only '
                          'exception (tests/baselines/*-monthwriter/README.md, "Re-cutting"), and tell the owner',
            'content': 'THE CONTENT MOVED. Not re-cut without the owner\'s sign-off on `monthbase.py sheets`',
            'unparsed': 'the bytes differ'}[kind]
    print('  FAIL  %s: differs from its baseline (%d -> %d bytes): %s' % (label, len(bb), len(nb), head))
    for ln in lines[:14]:
        print('          ' + ln)
    if len(lines) > 14:
        print('          … and %d more' % (len(lines) - 14))
    return 1


# ---- a re-cut's evidence: old | new | difference ------------------------------------------------------------------
def sheets(old, new, outdir, name):
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        print('numpy and Pillow are needed for the contact sheets'); return 1
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from monthab import render, heat, triptych, contact
    po, pn = parse(open(old, 'rb').read()), parse(open(new, 'rb').read())
    lo, ln = roles(po)[1], roles(pn)[1]
    tmp = tempfile.mkdtemp(prefix='monthbase-')
    try:
        n = min(len(lo), len(ln))
        if len(lo) != len(ln):
            print('INFO  %s: %d pages -> %d; the first %d are compared' % (name, len(lo), len(ln), n))
        a_png, b_png = render(old, 1, n, tmp, 'old'), render(new, 1, n, tmp, 'new')
        rows = []
        os.makedirs(outdir, exist_ok=True)
        for i in range(n):
            a = np.asarray(Image.open(a_png[i]).convert('RGB')).astype(np.int16)
            b = np.asarray(Image.open(b_png[i]).convert('RGB')).astype(np.int16)
            if a.shape != b.shape:
                print('INFO  %s page %d: the page sizes differ, %s -> %s' % (name, i + 1, a.shape, b.shape)); continue
            differs = (a != b).any(axis=2)
            label = ln[i] or lo[i] or 'page %d' % (i + 1)
            print('INFO  %s page %d (%s): %d pixels differ (%.2f%%)' % (name, i + 1, label, int(differs.sum()), 100 * differs.mean()))
            rows.append((None, a.astype(np.uint8), b.astype(np.uint8), heat(a, b, differs, np)))
            if differs.any():
                triptych(a.astype(np.uint8), b.astype(np.uint8), rows[-1][3],
                         os.path.join(outdir, '%s-%s.png' % (name, label.replace(' ', '-'))), Image, np)
        if rows:
            contact(rows, os.path.join(outdir, name + '.png'), Image, np)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return 0


def table(d):
    print('| case | pages | bytes | sha256 |')
    print('|---|---|---|---|')
    for f in sorted(x for x in os.listdir(d) if x.endswith('.pdf')):
        b = open(os.path.join(d, f), 'rb').read()
        print('| `%s` | %d | %s | `%s…` |' % (f[:-4], len(roles(parse(b))[1]), format(len(b), ','), hashlib.sha256(b).hexdigest()[:16]))
    return 0


def main(argv):
    args = argv[1:]
    opt = lambda k, dflt: args[args.index(k) + 1] if k in args else dflt
    pos = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--'))]
    if pos[:1] == ['check'] and len(pos) == 3:
        return check(pos[1], pos[2], opt('--label', os.path.basename(pos[2])[:-4]))
    if pos[:1] == ['sheets'] and len(pos) == 4:
        return sheets(pos[1], pos[2], pos[3], opt('--name', os.path.basename(pos[1])[:-4]))
    if pos[:1] == ['table'] and len(pos) == 2:
        return table(pos[1])
    print(__doc__.split('\n\n')[1]); return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv))
