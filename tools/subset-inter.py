#!/usr/bin/env python3
"""Static Inter for the month PDF: instanced from the app's OWN Inter, subset to WinAnsi, embedded.

Sibling of tools/subset-font.py (Carlito) and tools/fetch-inter.py (the screen's Inter). It writes the
four <script id="font-inter-NNN" type="text/plain"> blocks in src/index.html, and nothing else.

WHY THIS EXISTS (MONTH-PDF-WRITER-PLAN.md §2.4, owner ruling 1(a), 30 Sep 2026). The direct month-PDF
writer sets its text in Inter, so the PDF keeps the month view's look. But the app's Inter is ONE
VARIABLE WOFF2 (src/styles/inter.css: Inter 4.001, wght 100-900, Brotli with transformed glyf/loca),
and none of it can go into a PDF as it stands:
  - PDF has no variable fonts. /FontFile2 takes one static TrueType program per face;
  - a page cannot read font bytes back from the browser, so it cannot instance the face it renders;
  - DecompressionStream has no Brotli, so the page cannot even unpack the WOFF2.
So the four weights the month view uses -- 400 the subtitle; 500 notes and the Production tag; 600
pills, bands and day numbers; 700 the title, the date, the month bar and the weekday row -- are made
HERE, at build time, and stored the way Carlito is: zlib-compressed TrueType as base64. A zlib stream
IS a PDF /FlateDecode stream, so the writer embeds the stored bytes without recompressing them, as
pdfSerialize() already does for Carlito.

⛔ THE SOURCE IS THE APP'S OWN INTER AND NOTHING ELSE. The Inter 3.019 statics installed in
~/Library/Fonts are a DIFFERENT font -- unitsPerEm 2816 against 2048, widths up to 4% apart -- under
the same names. Built from them, the PDF would disagree with the screen it exists to copy. This tool
reads src/styles/inter.css and refuses any source that is not Inter 4.001, 2048 units per em, with a
wght axis spanning 400-700.

NAMES. Every weight gets a DISTINCT, SUBSET-TAGGED PostScript name, e.g. "ABCDEF+InterPDF-Medium":
  - DISTINCT from every Inter a machine may have installed ("Inter-Medium"). A PDF viewer that cannot
    use an embedded program substitutes an installed font by name, and viewers commonly strip the
    subset tag first: a base name of "Inter-Medium" would find the installed 3.019 and quietly hide
    an embedding bug on the very machine used for checking. "InterPDF-Medium" finds nothing, so the
    bug shows;
  - SUBSET-TAGGED as PDF 32000-1 §9.6.4 describes (six capital letters and a '+'), and written into
    the font's OWN name table, because the frozen ttfRead() takes /BaseFont and /FontName straight
    from nameID 6. The month writer therefore gets a tagged name from the frozen code, with no
    second copy to drift from it;
  - the tag is a hash of this tool's format, the source font, the weight and the codepoint set, so
    it is reproducible, and it changes by itself whenever the subset does.
The family is renamed "Inter PDF" to match. Inter's licence names no Reserved Font Name (its nameID 0
is the bare copyright line), so the rename is a courtesy, not an obligation. nameID 13, the licence
description, is ADDED: the source carries only the licence URL, and the programs travel inside
every exported PDF.

WHAT IS KEPT. The WinAnsi codepoints the source covers -- 208 of 218. Google's latin subset, which
is what the app embeds, has no soft hyphen, Š š Ÿ Ž ž, ƒ, †, ‡ or ‰, so those cannot come from the
app's Inter at all; the writer's printable-characters check must test the font's own coverage
(plan §3.4). Also kept: the .notdef glyph WITH its outline, so a missing glyph prints as a box rather
than as nothing, and every component a composite glyph references. Dropped: GSUB, GPOS and GDEF (a
PDF draws glyphs, it does not shape them, and the plan's writer is unkerned), STAT, and the glyph
names (post format 3), since a viewer maps WinAnsi codes through the (3,1) cmap. There is no hinting
to keep: Google's file has none.

DETERMINISM. The programs depend only on the source font and this file. head.modified is kept from
the source rather than stamped with today, so two runs on the same inputs give the same bytes.
zlib's own version can change the COMPRESSED bytes, so --check compares the decompressed programs.

Usage (needs fonttools and brotli, which nothing in the repo depends on: use a throwaway venv):
    python3 -m venv /tmp/fontvenv && /tmp/fontvenv/bin/pip install fonttools brotli
    /tmp/fontvenv/bin/python tools/subset-inter.py            # rewrite the four blocks
    /tmp/fontvenv/bin/python tools/subset-inter.py --check    # change nothing; exit 1 if they'd change
    /tmp/fontvenv/bin/python tools/subset-inter.py --out DIR  # also write the four .ttf files to DIR
Then: npm run build && npm run check (which re-verifies the blocks), and the `interfonts` harness leg
(every glyph's advance against the browser's own unkerned width).
⛔ Re-run it whenever tools/fetch-inter.py changes the screen's Inter. `npm run check` fails until
you do, because each block records the SHA-256 of the WOFF2 it was made from.

First built 1 Oct 2026 with fontTools 4.60.2 and brotli 1.2.0 on Python 3.9.6.
"""
import argparse, base64, hashlib, io, pathlib, re, sys, zlib

try:
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools.varLib.models import normalizeLocation, piecewiseLinearMap
    from fontTools.varLib.varStore import VarStoreInstancer
    from fontTools.misc.fixedTools import floatToFixedToFloat
    from fontTools import subset
    import fontTools
    import brotli  # noqa: F401 -- fontTools needs it to read WOFF2, and reports its absence obliquely
except ImportError as e:
    sys.exit('subset-inter.py needs fonttools and brotli (pip install fonttools brotli, in a throwaway '
             'venv -- see the docstring): %s' % e)

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = ROOT / 'src' / 'styles' / 'inter.css'
HTML = ROOT / 'src' / 'index.html'

# The month view's four weights (plan §2.4), with the style word each static is named by.
WEIGHTS = [(400, 'Regular'), (500, 'Medium'), (600, 'SemiBold'), (700, 'Bold')]
FAMILY = 'Inter PDF'       # nameID 1 / 16
PS_FAMILY = 'InterPDF'     # the family part of the PostScript name
# Part of every subset tag's hash. Change it only to re-tag every weight on purpose.
FORMAT = 'subset-inter/1'
OFL_DESCRIPTION = ('This Font Software is licensed under the SIL Open Font License, Version 1.1. '
                   'This license is available with a FAQ at: https://openfontlicense.org')

# Everything WinAnsiEncoding can address -- the same set tools/subset-font.py keeps for Carlito and the
# engine's PDF_WINANSI_HI maps: printable ASCII, Latin-1, and the 0x80-0x9F smart-punctuation band.
WINANSI_HI = {
    0x80:0x20AC,0x82:0x201A,0x83:0x0192,0x84:0x201E,0x85:0x2026,0x86:0x2020,0x87:0x2021,
    0x88:0x02C6,0x89:0x2030,0x8A:0x0160,0x8B:0x2039,0x8C:0x0152,0x8E:0x017D,0x91:0x2018,
    0x92:0x2019,0x93:0x201C,0x94:0x201D,0x95:0x2022,0x96:0x2013,0x97:0x2014,0x98:0x02DC,
    0x99:0x2122,0x9A:0x0161,0x9B:0x203A,0x9C:0x0153,0x9E:0x017E,0x9F:0x0178,
}
def winansi_codepoints():
    return set(range(0x20, 0x7F)) | set(range(0xA0, 0x100)) | set(WINANSI_HI.values())

# The opening tag carries the source hash, so the whole tag is rewritten, never patched.
BLOCK_RE = r'<script id="font-inter-%d" type="text/plain"[^>]*>[\s\S]*?</script>'
LINE = 120   # base64 line length, matching the Carlito blocks


def source_woff2():
    m = re.search(r"url\(data:font/woff2;base64,([A-Za-z0-9+/=]+)\)", CSS.read_text())
    if not m:
        sys.exit('no woff2 data: URI in %s -- has tools/fetch-inter.py changed its shape?' % CSS)
    return base64.b64decode(m.group(1))


def check_source(f):
    """Refuse anything that is not the app's Inter 4.001 -- above all, the installed 3.019."""
    bad = []
    upm = f['head'].unitsPerEm
    if upm != 2048:
        bad.append('unitsPerEm %d, not 2048%s' % (upm, ' (2816 is Inter 3.x: the installed copies)' if upm == 2816 else ''))
    if (f['name'].getDebugName(1) or '') != 'Inter':
        bad.append('family %r, not Inter' % f['name'].getDebugName(1))
    if not (f['name'].getDebugName(5) or '').startswith('Version 4.001'):
        bad.append('version %r, not 4.001' % f['name'].getDebugName(5))
    axes = {a.axisTag: (a.minValue, a.maxValue) for a in f['fvar'].axes} if 'fvar' in f else {}
    if 'wght' not in axes or axes['wght'][0] > 400 or axes['wght'][1] < 700:
        bad.append('no wght axis spanning 400-700 (axes: %r)' % axes)
    if 'glyf' not in f:
        bad.append('no glyf table: /FontFile2 needs TrueType outlines')
    if bad:
        sys.exit('refusing to build from this font:\n  ' + '\n  '.join(bad))


def subset_tag(src_sha, weight, cps):
    key = '%s|%s|%d|%s' % (FORMAT, src_sha, weight, ','.join('%04X' % c for c in sorted(cps)))
    return ''.join(chr(65 + b % 26) for b in hashlib.sha256(key.encode()).digest()[:6])


def hvar_advances(var, weight):
    """Each glyph's advance at `weight`, from HVAR: a path INDEPENDENT of the instancer's.

    The instancer takes a static's advances from gvar's phantom points and then drops HVAR. HVAR is
    what a text engine reads instead, and this models the browser: with it, every glyph kept agrees
    with Chrome 154's own canvas measurement to 0.00012 units (measured 1 Oct 2026, all four weights).

    ⚠️ The location is QUANTIZED to F2Dot14 before AND after avar, as OpenType stores normalized
    coordinates and as an engine computes them. Unquantized, this put the '"' at 700 at 1129.5016
    units where Chrome measures 1129.4929 -- the instancer's 1129 then looked like a rounding error
    when it is in fact the browser's own value, rounded. The static's integer advance can never
    EQUAL a fractional variable advance; within half a unit of it is the best a TrueType program
    can do, and it is what verify() requires."""
    q = lambda v: floatToFixedToFloat(v, 14)
    axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in var['fvar'].axes}
    loc = {k: q(v) for k, v in normalizeLocation({'wght': weight}, axes).items()}
    if 'avar' in var:
        loc = {k: q(piecewiseLinearMap(v, var['avar'].segments[k])) for k, v in loc.items()}
    hvar = var['HVAR'].table
    inst = VarStoreInstancer(hvar.VarStore, var['fvar'].axes, loc)
    out = {}
    for gid, g in enumerate(var.getGlyphOrder()):
        idx = hvar.AdvWidthMap.mapping[g] if hvar.AdvWidthMap else gid
        out[g] = var['hmtx'][g][0] + inst[idx]
    return out


def set_names(f, weight, style, tag, src_names):
    ps = '%s+%s-%s' % (tag, PS_FAMILY, style)
    ribbi = style in ('Regular', 'Bold')
    version = src_names[5]
    recs = {
        0: src_names[0],                                   # the copyright notice, verbatim
        1: FAMILY if ribbi else '%s %s' % (FAMILY, style),
        2: style if ribbi else 'Regular',
        3: '%s;%s' % (version.split(';')[0].replace('Version ', ''), ps),
        4: '%s %s' % (FAMILY, style),
        5: version,
        6: ps,
        13: OFL_DESCRIPTION,
        14: src_names[14],
    }
    if not ribbi:
        recs[16], recs[17] = FAMILY, style
    f['name'].names = []
    for nid in sorted(recs):
        f['name'].setName(recs[nid], nid, 3, 1, 0x409)
    return ps


def set_style_bits(f, weight):
    os2 = f['OS/2']
    os2.usWeightClass = weight
    # ITALIC (0), BOLD (5) and REGULAR (6) cleared; USE_TYPO_METRICS (7) and the rest kept. 400, 500
    # and 600 each head a family of their own whose style is "Regular"; 700 is Bold.
    sel = os2.fsSelection & ~((1 << 0) | (1 << 5) | (1 << 6))
    os2.fsSelection = sel | (1 << 5 if weight == 700 else 1 << 6)
    f['head'].macStyle = (f['head'].macStyle & ~0x3) | (1 if weight == 700 else 0)


def build(src, weight, style, cps, tag):
    f = TTFont(io.BytesIO(src), recalcTimestamp=False)
    src_names = {r.nameID: r.toUnicode() for r in f['name'].names
                 if (r.platformID, r.platEncID, r.langID) == (3, 1, 0x409)}
    instancer.instantiateVariableFont(f, {'wght': weight}, inplace=True, static=True)
    o = subset.Options()
    o.drop_tables += ['GSUB', 'GPOS', 'GDEF', 'STAT']
    o.layout_features = []
    o.name_IDs = ['*']
    o.name_languages = ['*']
    o.notdef_outline = True
    o.glyph_names = False
    o.recalc_bounds = True
    o.recalc_average_width = True
    o.recalc_max_context = True
    o.recalc_timestamp = False
    s = subset.Subsetter(o)
    s.populate(unicodes=cps)
    s.subset(f)
    ps = set_names(f, weight, style, tag, src_names)
    set_style_bits(f, weight)
    f.flavor = None          # a plain sfnt, not the WOFF2 it was read from
    out = io.BytesIO()
    f.save(out)
    return out.getvalue(), ps


def verify(ttf, weight, cps, ps, var, hvar_adv):
    """Read the program back and prove what the PDF writer will rely on."""
    g = TTFont(io.BytesIO(ttf))
    left = [t for t in ('fvar', 'gvar', 'HVAR', 'MVAR', 'avar', 'cvar', 'STAT', 'GSUB', 'GPOS', 'GDEF') if t in g]
    assert not left, 'still variable or still shaped: %r' % left
    assert g.sfntVersion == '\x00\x01\x00\x00', 'not TrueType-flavoured: %r' % g.sfntVersion
    assert g['head'].unitsPerEm == 2048
    assert g['name'].getDebugName(6) == ps
    cmap = g.getBestCmap()
    assert set(cmap) == cps, 'cmap holds %d codepoints, expected %d' % (len(cmap), len(cps))
    assert any(t.platformID == 3 and t.platEncID == 1 for t in g['cmap'].tables), 'no (3,1) cmap'
    varmap = var.getBestCmap()
    worst = 0.0
    for cp in cps:
        a = g['hmtx'][cmap[cp]][0]
        worst = max(worst, abs(a - hvar_adv[varmap[cp]]))
    # The instancer rounds to whole units; HVAR's interpolation is fractional. Within half a unit
    # is "the same advance" -- the integer nearest the browser's.
    assert worst <= 0.5, 'gvar and HVAR disagree by %.4f units at %d' % (worst, weight)
    return {'glyphs': len(g.getGlyphOrder()), 'tables': sorted(t for t in g.keys() if t != 'GlyphOrder'),
            'hvar_worst': worst}


def block_text(weight, src_sha, z):
    b64 = base64.b64encode(z).decode()
    lines = '\n'.join(b64[i:i + LINE] for i in range(0, len(b64), LINE))
    return ('<script id="font-inter-%d" type="text/plain" data-source-sha256="%s">\n%s\n</script>'
            % (weight, src_sha, lines))


def current_program(html, weight):
    m = re.search(BLOCK_RE % weight, html)
    if not m:
        return None, None
    body = re.sub(r'<script[^>]*>|</script>', '', m.group(0))
    raw = re.sub(r'\s+', '', body)
    return m, (zlib.decompress(base64.b64decode(raw)) if raw else b'')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--check', action='store_true', help='change nothing; exit 1 if the blocks would change')
    ap.add_argument('--out', help='also write the four .ttf programs to this directory')
    args = ap.parse_args()

    src = source_woff2()
    src_sha = hashlib.sha256(src).hexdigest()
    var = TTFont(io.BytesIO(src), recalcTimestamp=False)
    check_source(var)
    srcmap = var.getBestCmap()
    want = winansi_codepoints()
    cps = {c for c in want if c in srcmap}
    missing = sorted(want - cps)
    print('source  %s  %d bytes  sha256 %s' % (CSS.relative_to(ROOT), len(src), src_sha))
    print('        %s, %s; fontTools %s' % (var['name'].getDebugName(4), var['name'].getDebugName(5), fontTools.version))
    print('WinAnsi %d of %d codepoints in the source; missing: %s' % (len(cps), len(want),
          ' '.join('U+%04X' % c for c in missing) or 'none'))

    html = HTML.read_text()
    new_html, changed, tot_b64, tot_old = html, [], 0, 0
    tags = set()
    for weight, style in WEIGHTS:
        tag = subset_tag(src_sha, weight, cps)
        tags.add(tag)
        ttf, ps = build(src, weight, style, cps, tag)
        info = verify(ttf, weight, cps, ps, var, hvar_advances(var, weight))
        z = zlib.compress(ttf, 9)
        block = block_text(weight, src_sha, z)
        m, old = current_program(new_html, weight)
        if m is None:
            sys.exit('no <script id="font-inter-%d" type="text/plain"> block in %s -- add the four empty '
                     'blocks (and their comment) beside the Carlito ones first' % (weight, HTML.relative_to(ROOT)))
        same = (old == ttf) and ('data-source-sha256="%s"' % src_sha) in m.group(0)
        if not same:
            changed.append(weight)
        tot_old += len(m.group(0))
        tot_b64 += len(block)
        new_html = new_html[:m.start()] + block + new_html[m.end():]
        if args.out:
            d = pathlib.Path(args.out)
            d.mkdir(parents=True, exist_ok=True)
            (d / ('%s.ttf' % ps.split('+')[1])).write_bytes(ttf)
        print('  %d  %-24s  %3d glyphs  ttf %6d  zlib %6d  block %6d  hvar-vs-gvar %.3f  sha256 %s  %s'
              % (weight, ps, info['glyphs'], len(ttf), len(z), len(block), info['hvar_worst'],
                 hashlib.sha256(ttf).hexdigest()[:16], 'unchanged' if same else 'CHANGED'))
    assert len(tags) == len(WEIGHTS), 'two weights share a subset tag: %r' % tags
    print('blocks  %d bytes in src/index.html (was %d, %+d)' % (tot_b64, tot_old, tot_b64 - tot_old))

    if args.check:
        if changed:
            print('CHECK FAILED: weight(s) %s would change -- re-run without --check' % changed)
            sys.exit(1)
        print('CHECK PASSED: the four blocks are exactly what this tool builds from the current inter.css')
        return
    if new_html != html:
        HTML.write_text(new_html)
        print('wrote', HTML.relative_to(ROOT))
    else:
        print('src/index.html already up to date')


if __name__ == '__main__':
    main()
