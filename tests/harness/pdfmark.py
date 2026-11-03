#!/usr/bin/env python3
# pdfmark.py -- the SPTCal mark on a saved PDF (markPdf in src/legacy/app.js, owner 2 Nov 2026).
#
# A PDF the app saves is the WRITER'S bytes, untouched, then one appended incremental update: an /Info dictionary
# (Creator "SPTCal", Producer "SPTCal <version>") and every page redefined as itself with
# /Contents [q, <its own stream>, Q + "Made with SPTCal <version>" in text render mode 3]. This checks that update
# piece by piece and hands back the writer's bytes, so the byte gates (2: the waterfall PDF, 13: the written month
# PDF) keep comparing exactly what they always compared.
#
#   pdfmark.py check FILE --version V [--out WRITER.pdf]
#       exit 0 and (with --out) write the writer's bytes; exit 1 naming the first thing wrong.
#   pdfmark.py strip FILE --version V
#       the same, writing the writer's bytes back over FILE (gate 13's copies, which monthbase.py then reads).
#
# ⛔ Read by the update's own trailer, never by searching the binary: /Prev is the writer's cross-reference table, and
# the first %%EOF after it is where the writer stopped. The writer's streams are deflated, so a search for "%%EOF" or
# "obj" anywhere before that could land inside one.
import re, sys

def fail(msg):
    print('pdfmark: ' + msg, file=sys.stderr); sys.exit(1)

def xref_at(s, at):
    m = re.compile(r'xref\s+([\s\S]*?)trailer\s*<<([\s\S]*?)>>\s*startxref\s+(\d+)\s+%%EOF\n').match(s, at)
    if not m: fail('no cross-reference table at %d' % at)
    tok, offs, i = m.group(1).split(), {}, 0
    while i < len(tok):
        first, count = int(tok[i]), int(tok[i + 1]); i += 2
        for k in range(count):
            if tok[i + 2] == 'n': offs[first + k] = int(tok[i])
            i += 3
    return offs, m.group(2).strip(), m.end()

def dict_at(s, n, at):
    h = re.compile(r'%d 0 obj\s*<<' % n).match(s, at)
    if not h: fail('object %d is not at %d' % (n, at))
    i, depth = h.end() - 2, 0
    while i < len(s) - 1:
        two = s[i:i + 2]
        if two == '<<': depth += 1; i += 2; continue
        if two == '>>':
            depth -= 1; i += 2
            if not depth: return s[h.end() - 2:i], i
            continue
        i += 1
    fail('object %d never closes' % n)

def stream_at(s, n, at):
    d, end = dict_at(s, n, at)
    m = re.fullmatch(r'<< /Length (\d+) >>', d)
    if not m: fail('object %d is not a plain stream: %s' % (n, d))
    if s[end:end + 8] != '\nstream\n': fail('object %d has no stream' % n)
    body = s[end + 8:end + 8 + int(m.group(1))]
    if s[end + 8 + len(body):end + 8 + len(body) + 18] != '\nendstream\nendobj\n': fail('object %d is not framed' % n)
    return body

def check(path, version):
    raw = open(path, 'rb').read(); s = raw.decode('latin1')
    tail = re.search(r'startxref\s+(\d+)\s+%%EOF\n$', s[-64:])
    if not tail: fail('the file does not end in startxref / %%EOF')
    uoffs, utr, _ = xref_at(s, int(tail.group(1)))
    prev = re.search(r'/Prev (\d+)', utr)
    if not prev: fail('no SPTCal mark: the last trailer has no /Prev (%s)' % utr)
    prev = int(prev.group(1))
    end = s.find('%%EOF\n', prev)
    if end < 0: fail('no %%EOF after /Prev')
    end += 6
    woffs, wtr, wend = xref_at(s, prev)
    if wend != end: fail('the writer\'s table does not end at its own %%EOF')
    if not re.search(r'startxref\s+%d\s+%%%%EOF\n$' % prev, s[:end]): fail('the writer\'s startxref is not /Prev')
    if any(k in wtr for k in ('/Info', '/Prev', '/Encrypt')): fail('the writer\'s trailer is not a fresh one: ' + wtr)
    wsize = int(re.search(r'/Size (\d+)', wtr).group(1))
    root = re.search(r'/Root \d+ 0 R', wtr).group(0)
    # The trailer the update must carry: every key of the writer's but /Size, then /Info and /Prev.
    info = re.search(r'/Info (\d+) 0 R', utr)
    if not info: fail('the update has no /Info')
    info = int(info.group(1))
    usize = int(re.search(r'/Size (\d+)', utr).group(1))
    want_tr = '/Size %d %s /Info %d 0 R /Prev %d' % (usize, re.sub(r'/Size \d+\s*', '', wtr).strip(), info, prev)
    if utr != want_tr: fail('the update\'s trailer is %r, not %r' % (utr, want_tr))
    if any(o < end for o in uoffs.values()): fail('the update points back into the writer\'s bytes')
    # The writer's pages, by its own page tree.
    cat, _ = dict_at(s, int(root.split()[1]), woffs[int(root.split()[1])])
    pn = int(re.search(r'/Pages (\d+) 0 R', cat).group(1))
    tree, _ = dict_at(s, pn, woffs[pn])
    kids = [int(k) for k in re.findall(r'(\d+) 0 R', re.search(r'/Kids \[([^\]]*)\]', tree).group(1))]
    text = 'Made with SPTCal ' + version
    seen = {info}
    for n in kids:
        old, _ = dict_at(s, n, woffs[n])
        if n not in uoffs: fail('page %d is not redefined by the update' % n)
        new, _ = dict_at(s, n, uoffs[n])
        c = re.search(r'/Contents \[(\d+) 0 R (\d+) 0 R (\d+) 0 R\]', new)
        own = re.search(r'/Contents (\d+) 0 R', old)
        if not c or not own or int(c.group(2)) != int(own.group(1)):
            fail('page %d\'s contents are not [q, its own stream, the mark]: %s' % (n, new))
        if new.replace(c.group(0), own.group(0)) != old: fail('page %d changed beyond its /Contents' % n)
        res = re.search(r'/Resources (\d+) 0 R', old)
        rd = dict_at(s, int(res.group(1)), woffs[int(res.group(1))])[0] if res else old
        font = re.search(r'/Font\s*<<\s*/([^\s/<>\[\]()]+)\s+\d+\s+0\s+R', rd).group(1)
        pre, post = int(c.group(1)), int(c.group(3))
        if stream_at(s, pre, uoffs[pre]) != 'q\n': fail('page %d\'s first stream is not "q"' % n)
        want = '\nQ\nq BT /%s 2 Tf 3 Tr 2 2 Td (%s) Tj ET Q\n' % (font, text)
        got = stream_at(s, post, uoffs[post])
        if got != want: fail('page %d\'s mark is %r, not %r' % (n, got, want))
        seen |= {n, pre, post}
    if set(uoffs) != seen: fail('the update holds objects that are not the mark: %s' % sorted(set(uoffs) - seen))
    if usize != max(wsize, max(seen) + 1): fail('the update\'s /Size is %d' % usize)
    idict, _ = dict_at(s, info, uoffs[info])
    if idict != '<< /Creator (SPTCal) /Producer (SPTCal %s) >>' % version: fail('the properties are %r' % idict)
    return raw[:end], len(kids), len(raw) - end

if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) < 4 or a[0] not in ('check', 'strip') or a[2] != '--version': fail('usage: pdfmark.py check|strip FILE --version V [--out F]')
    writer, pages, extra = check(a[1], a[3])
    out = a[1] if a[0] == 'strip' else (a[5] if len(a) >= 6 and a[4] == '--out' else None)
    if out: open(out, 'wb').write(writer)
    print('pdfmark: %s -- %d page%s marked, %d bytes after the writer\'s' % (a[1].split('/')[-1], pages, '' if pages == 1 else 's', extra))
