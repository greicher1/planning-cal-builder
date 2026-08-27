#!/usr/bin/env python3
"""
Build-time TrueType subsetter for the Planning Calendar Builder.

Strategy: keep glyph IDs STABLE and blank out the glyphs we don't need, rather than
renumbering. That means:
  - composite glyphs keep working without rewriting their component references
  - cmap can be copied verbatim
  - loca keeps numGlyphs+1 entries (cheap: it re-compresses to nothing)
It costs a few KB over a renumbering subsetter and removes the entire class of bugs
where a composite glyph points at a glyph that moved.

Dropped outright: kern, GPOS, GSUB, GDEF, DSIG -- none are used for a text grid, and
together they are ~36% of the file. Hinting (fpgm/prep/cvt) is KEPT so the retained
glyphs' instructions still resolve.
"""
import struct, sys, base64

# Everything WinAnsiEncoding can address: printable ASCII plus Latin-1 plus the
# smart-punctuation band at 0x80-0x9F that PDF's WinAnsi maps to real codepoints.
WINANSI_HI = {
    0x80:0x20AC,0x82:0x201A,0x83:0x0192,0x84:0x201E,0x85:0x2026,0x86:0x2020,0x87:0x2021,
    0x88:0x02C6,0x89:0x2030,0x8A:0x0160,0x8B:0x2039,0x8C:0x0152,0x8E:0x017D,0x91:0x2018,
    0x92:0x2019,0x93:0x201C,0x94:0x201D,0x95:0x2022,0x96:0x2013,0x97:0x2014,0x98:0x02DC,
    0x99:0x2122,0x9A:0x0161,0x9B:0x203A,0x9C:0x0153,0x9E:0x017E,0x9F:0x0178,
}
def wanted_codepoints():
    cps = set(range(0x20, 0x7F))
    cps |= set(range(0xA0, 0x100))
    cps |= set(WINANSI_HI.values())
    return cps

DROP = {'kern','GPOS','GSUB','GDEF','DSIG'}

class Font:
    def __init__(self, path):
        self.d = open(path,'rb').read()
        n = struct.unpack('>H', self.d[4:6])[0]
        self.tabs = {}
        for i in range(n):
            o = 12 + i*16
            tag = self.d[o:o+4].decode('latin1')
            csum, off, ln = struct.unpack('>III', self.d[o+4:o+16])
            self.tabs[tag] = (off, ln)
        self.numGlyphs = struct.unpack('>H', self.tbl('maxp')[4:6])[0]
        head = self.tbl('head')
        self.indexToLocFormat = struct.unpack('>h', head[50:52])[0]
        self.unitsPerEm = struct.unpack('>H', head[18:20])[0]
        self.numHMetrics = struct.unpack('>H', self.tbl('hhea')[34:36])[0]
        self._loca = self._read_loca()

    def tbl(self, tag):
        off, ln = self.tabs[tag]
        return self.d[off:off+ln]

    def _read_loca(self):
        raw = self.tbl('loca')
        if self.indexToLocFormat == 0:
            vals = struct.unpack('>%dH' % (len(raw)//2), raw[:(len(raw)//2)*2])
            return [v*2 for v in vals]
        return list(struct.unpack('>%dI' % (len(raw)//4), raw[:(len(raw)//4)*4]))

    def glyph_bytes(self, gid):
        g = self.tbl('glyf')
        return g[self._loca[gid]:self._loca[gid+1]]

    def cmap_lookup_all(self):
        """unicode -> gid, from the best Unicode subtable."""
        raw = self.tbl('cmap')
        n = struct.unpack('>H', raw[2:4])[0]
        best, best_score = None, -1
        for i in range(n):
            r = 4 + i*8
            plat, enc, off = struct.unpack('>HHI', raw[r:r+8])
            score = 3 if (plat,enc)==(3,1) else 2 if (plat,enc)==(3,10) else 1 if plat==0 else 0
            if score > best_score: best, best_score = off, score
        fmt = struct.unpack('>H', raw[best:best+2])[0]
        out = {}
        if fmt == 4:
            segX2 = struct.unpack('>H', raw[best+6:best+8])[0]
            seg = segX2//2
            ends   = best+14
            starts = ends+segX2+2
            deltas = starts+segX2
            ranges = deltas+segX2
            for s in range(seg):
                e = struct.unpack('>H', raw[ends+s*2:ends+s*2+2])[0]
                st= struct.unpack('>H', raw[starts+s*2:starts+s*2+2])[0]
                dl= struct.unpack('>h', raw[deltas+s*2:deltas+s*2+2])[0]
                ro= struct.unpack('>H', raw[ranges+s*2:ranges+s*2+2])[0]
                if st > e: continue
                for c in range(st, min(e, 0xFFFF)+1):
                    if ro == 0:
                        g = (c + dl) & 0xFFFF
                    else:
                        idx = ranges+s*2+ro+(c-st)*2
                        if idx+2 > len(raw): continue
                        g = struct.unpack('>H', raw[idx:idx+2])[0]
                        if g: g = (g + dl) & 0xFFFF
                    if g: out[c] = g
        elif fmt == 12:
            ng = struct.unpack('>I', raw[best+12:best+16])[0]
            for gi in range(ng):
                r = best+16+gi*12
                s,e,sg = struct.unpack('>III', raw[r:r+12])
                for c in range(s, e+1):
                    out[c] = sg + (c-s)
        else:
            raise SystemExit('unsupported cmap format %d' % fmt)
        return out

    def composite_components(self, gid):
        g = self.glyph_bytes(gid)
        if len(g) < 10: return []
        nc = struct.unpack('>h', g[:2])[0]
        if nc != -1: return []
        out, p = [], 10
        while True:
            if p+4 > len(g): break
            flags, gi = struct.unpack('>HH', g[p:p+4]); p += 4
            out.append(gi)
            p += 4 if (flags & 1) else 2            # ARG_1_AND_2_ARE_WORDS
            if flags & 8:      p += 2               # WE_HAVE_A_SCALE
            elif flags & 0x40: p += 4               # X_AND_Y_SCALE
            elif flags & 0x80: p += 8               # TWO_BY_TWO
            if not (flags & 0x20): break            # MORE_COMPONENTS
        return out


def checksum(b):
    b = b + b'\0' * ((4 - len(b) % 4) % 4)
    s = 0
    for i in range(0, len(b), 4):
        s = (s + struct.unpack('>I', b[i:i+4])[0]) & 0xFFFFFFFF
    return s


def subset(path, out_path):
    fo = Font(path)
    cmap = fo.cmap_lookup_all()
    want = wanted_codepoints()

    keep = {0}                                        # .notdef always
    missing = []
    for cp in sorted(want):
        g = cmap.get(cp)
        if g is None: missing.append(cp)
        else: keep.add(g)
    # composite glyphs reference other glyphs -- pull those in transitively
    stack = list(keep)
    while stack:
        g = stack.pop()
        for c in fo.composite_components(g):
            if c not in keep:
                keep.add(c); stack.append(c)

    # --- glyf + loca, glyph ids unchanged ---
    glyf = bytearray()
    loca = []
    for gid in range(fo.numGlyphs):
        loca.append(len(glyf))
        if gid in keep:
            gb = fo.glyph_bytes(gid)
            glyf += gb
            while len(glyf) % 4: glyf += b'\0'         # keep offsets 4-aligned
    loca.append(len(glyf))

    short_ok = all(v % 2 == 0 for v in loca) and loca[-1] // 2 < 0x10000
    if short_ok:
        loca_b = b''.join(struct.pack('>H', v//2) for v in loca)
        idxfmt = 0
    else:
        loca_b = b''.join(struct.pack('>I', v) for v in loca)
        idxfmt = 1

    # --- hmtx: only need metrics up to the highest kept gid; the last advance
    #     legally repeats for every glyph after it, and those are all blank.
    maxkeep = max(keep)
    nhm = min(fo.numHMetrics, maxkeep + 1)
    hm_raw = fo.tbl('hmtx')
    hmtx = bytearray()
    for i in range(nhm):
        if i < fo.numHMetrics:
            hmtx += hm_raw[i*4:i*4+4]
        else:
            hmtx += b'\0\0\0\0'
    # hmtx is numberOfHMetrics longHorMetric records FOLLOWED BY
    # leftSideBearing[numGlyphs - numberOfHMetrics]. Omitting that trailing array makes the
    # table short and the whole font is rejected outright ("Invalid font data in ArrayBuffer"),
    # with nothing to say which table was at fault. Every glyph past nhm is blank here, so zero
    # is the correct lsb for all of them.
    hmtx += b'\0\0' * (fo.numGlyphs - nhm)
    hhea = bytearray(fo.tbl('hhea'))
    struct.pack_into('>H', hhea, 34, nhm)

    head = bytearray(fo.tbl('head'))
    struct.pack_into('>I', head, 8, 0)                 # checkSumAdjustment -> 0
    struct.pack_into('>h', head, 50, idxfmt)

    tables = {}
    for tag,(off,ln) in fo.tabs.items():
        if tag in DROP: continue
        tables[tag] = fo.d[off:off+ln]
    tables['glyf'] = bytes(glyf)
    tables['loca'] = loca_b
    tables['hmtx'] = bytes(hmtx)
    tables['hhea'] = bytes(hhea)
    tables['head'] = bytes(head)

    order = sorted(tables)
    n = len(order)
    # searchRange etc. per the spec, though no rasteriser actually depends on them
    ent = 1
    while ent*2 <= n: ent *= 2
    sr = ent*16
    out = bytearray(struct.pack('>IHHHH', 0x00010000, n, sr, ent.bit_length()-1, n*16 - sr))
    offset = 12 + n*16
    dir_entries = []
    body = bytearray()
    for tag in order:
        b = tables[tag]
        dir_entries.append((tag, checksum(b), offset, len(b)))
        body += b
        pad = (4 - len(b) % 4) % 4
        body += b'\0'*pad
        offset += len(b) + pad
    for tag, cs, off, ln in dir_entries:
        out += tag.encode('latin1') + struct.pack('>III', cs, off, ln)
    out += body

    open(out_path,'wb').write(out)
    return {
        'in_bytes': len(fo.d), 'out_bytes': len(out),
        'numGlyphs': fo.numGlyphs, 'kept': len(keep), 'missing_cps': missing,
        'loca_fmt': 'short' if idxfmt==0 else 'long', 'numHMetrics': nhm,
        'tables': {t: len(tables[t]) for t in order},
    }

if __name__ == '__main__':
    import json, zlib
    total_in = total_out = total_b64 = 0
    for src, dst in [(sys.argv[1], sys.argv[2]), (sys.argv[3], sys.argv[4])]:
        r = subset(src, dst)
        raw = open(dst,'rb').read()
        b64 = base64.b64encode(raw)
        fl  = zlib.compress(raw, 9)
        print('=== %s' % src.split('/')[-1])
        print('   %d -> %d bytes  (%.1f%% of original)' % (r['in_bytes'], r['out_bytes'], r['out_bytes']/r['in_bytes']*100))
        print('   glyphs kept %d of %d   loca %s   numHMetrics %d' % (r['kept'], r['numGlyphs'], r['loca_fmt'], r['numHMetrics']))
        print('   base64 %d bytes   flate %d bytes' % (len(b64), len(fl)))
        if r['missing_cps']:
            print('   codepoints with no glyph: %s' % ' '.join('U+%04X'%c for c in r['missing_cps'][:20]))
        big = sorted(((v,k) for k,v in r['tables'].items()), reverse=True)[:8]
        print('   biggest tables: ' + ', '.join('%s %d'%(k,v) for v,k in big))
        total_in += r['in_bytes']; total_out += r['out_bytes']; total_b64 += len(b64)
    print()
    print('TOTAL  raw %d -> %d bytes   base64 %d bytes (%.0f KB)' % (total_in, total_out, total_b64, total_b64/1024))
