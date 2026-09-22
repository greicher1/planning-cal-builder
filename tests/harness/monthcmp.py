#!/usr/bin/env python3
"""monthcmp.py -- the MONTH PDF's gate: a monthprint capture against a baseline capture.

    python3 monthcmp.py cut  <monthprint.json> <monthprint.print.pdf> <dir> <case>
    python3 monthcmp.py gate <monthprint.json> <monthprint.print.pdf> <dir> <case>
    python3 monthcmp.py ab   <dirA> <caseA> <dirB> <caseB>

`cut` writes <dir>/<case>.json + <case>.html from a fresh run -- a BASELINE, so do it deliberately
and record why in that directory's README; gate.sh never cuts. `gate` compares a fresh run against
<dir>/<case>.* and exits 1 on any failure. `ab` compares two saved captures and is the tool for a
frozen edit that is SUPPOSED to move the month PDF (BLOCKS-PLAN.md §5): cut the before into a
scratch dir, make the change, cut the after, and read the fit table it prints -- which weeks grew,
by how much, and whether any month changed mode or sheet count.

WHAT IS COMPARED, and why each one:

  the document   #print-root's innerHTML at the moment exportMonthPdf calls window.print(), with
                 ONLY the page's own today stamp normalised (monthprint.js does it, from the same
                 clock the app read). The month PDF has no writer; the print stylesheet prints this
                 element and nothing else, so an identical document IS an identical PDF -- given
                 the same CSS. Compared as a string, byte for byte.
  the sheets     Chrome PRINTS that document (run.sh HARNESS_PRINT_PDF=1) and the sheets in the
                 PDF are counted. Every month must print as exactly one sheet, and the count and
                 the page box must match the baseline. This is the half the document cannot
                 carry: page breaking, and any CSS-only edit to a frozen .mv-* rule.
  the stamp      how many today-stamps were normalised. A normalisation that silently matched
                 nothing would otherwise pass today and fail every day after.

⭐ THE FIT TABLE IS THE PAGINATION RECORD. exportMonthPdf fits each month to one sheet in one of two
modes -- `fill` (rows flex-grow into the page from their measured content height) or `scale` (the
content is taller than the page, so each row gets its natural height and the whole month is
scaleY'd down) -- and writes the result onto the page as inline styles before it prints. So each
month's mode, scale and per-week row heights are read back OUT of the captured HTML here, and a
failure reports them per month. A month that tipped from `fill` into `scale` is the thing
BLOCKS-PLAN §5 is afraid of, and this is where it would show.

Structure vs style: on a mismatch the report says whether the STRUCTURE (every element's tag, every
attribute except `style`, every text run) is identical -- the HANDOFF's "hash the structure and leave
the styles out" measurement -- which separates "a row got taller" from "an element appeared".
"""
import difflib, hashlib, json, os, re, sys
from html.parser import HTMLParser


class _Doc(HTMLParser):
    """One line per start tag / text run, plus the fit table, in a single pass."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.full, self.struct, self.fit = [], [], []
        self._want_label = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = (a.get('class') or '').split()
        rest = ' '.join('%s=%r' % (k, v) for k, v in sorted(attrs) if k not in ('class', 'style'))
        head = tag + ''.join('.' + c for c in cls) + (' ' + rest if rest else '')
        self.struct.append(head)
        self.full.append(head + (' {%s}' % a['style'] if a.get('style') else ''))
        st = _style(a.get('style') or '')
        if 'print-page' in cls:
            self.fit.append({'month': '?', 'mode': 'fill', 'scale': 1.0, 'rows': []})
        elif not self.fit:
            return
        elif 'mv-monthyear' in cls:
            self._want_label = True
        elif 'mv-body' in cls:
            m = re.search(r'scaleY\(([\d.]+)\)', st.get('transform', ''))
            if m:
                self.fit[-1]['mode'], self.fit[-1]['scale'] = 'scale', float(m.group(1))
        elif 'mv-week' in cls:
            # ⚠️ Chrome SERIALISES the three longhands exportMonthPdf sets (flexGrow, flexShrink,
            # flexBasis) as the `flex:` SHORTHAND -- `flex: 57 0 57px` -- so reading `flex-basis`
            # finds nothing. The first cut of this parser did exactly that: every row read `?`, both
            # sides matched, and a deliberate +4 px on every row reported an EMPTY fit table.
            if st.get('height'):
                self.fit[-1]['rows'].append('h' + _px(st['height']))
            else:
                grow, basis = st.get('flex-grow', '?'), st.get('flex-basis', '?')
                parts = st.get('flex', '').split()
                if len(parts) == 3:
                    grow, basis = parts[0], parts[2]
                self.fit[-1]['rows'].append(_px(basis) + '/g' + grow)

    def handle_data(self, data):
        t = ' '.join(data.split())
        if not t:
            return
        self.struct.append('"%s"' % t)
        self.full.append('"%s"' % t)
        if self._want_label and self.fit:
            self.fit[-1]['month'], self._want_label = t, False


def _style(s):
    out = {}
    for part in s.split(';'):
        if ':' in part:
            k, v = part.split(':', 1)
            out[k.strip().lower()] = v.strip()
    return out


def _px(v):
    return v[:-2] if v.endswith('px') else v


def parse_doc(html):
    d = _Doc()
    d.feed(html)
    d.close()
    return d


def pdf_sheets(path):
    """(sheets, [distinct page boxes]) of a Chrome-printed PDF, or (None, []) if it is missing."""
    try:
        b = open(path, 'rb').read()
    except OSError:
        return None, []
    # Page OBJECTS, not the /Count of the tree root: Chrome writes intermediate /Pages nodes (16
    # sheets came back as /Count 8, 8, 16), so a naive /Count read gives the wrong number.
    n = len(re.findall(rb'/Type\s*/Page(?![s\w])', b))
    boxes = sorted(set(x.decode() for x in re.findall(rb'/MediaBox\s*\[[^\]]*\]', b)))
    return n, boxes


def capture(run_json, run_pdf):
    """A comparable record + document from one monthprint run. Raises on an unusable run."""
    r = json.load(open(run_json))
    if 'EX' in r:
        raise ValueError('monthprint threw: %s  errors: %s' % (r['EX'], r.get('errors')))
    html = r.get('printHtml')
    if not r.get('captured') or not html:
        raise ValueError('monthprint captured no document (printCalls=%s)' % r.get('printCalls'))
    d = parse_doc(html)
    sheets, boxes = pdf_sheets(run_pdf)
    rec = {
        'pages': r.get('pages'),
        'sheets': sheets,
        'mediaBoxes': boxes,
        'stampHits': r.get('stampHits'),
        'bytes': len(html),
        'elements': sum(1 for x in d.struct if not x.startswith('"')),
        'structSha1': hashlib.sha1('\n'.join(d.struct).encode()).hexdigest(),
        'docSha1': hashlib.sha1(html.encode()).hexdigest(),
        'fit': d.fit,
        # Not compared against the baseline -- they describe THIS run's health.
        'run': {k: r.get(k) for k in ('fromState', 'printCalls', 'cleanedUp', 'classCleared',
                                       'stamps', 'errors', 'leftInPrintState')},
    }
    return rec, html


def load(dirpath, case):
    rec = json.load(open(os.path.join(dirpath, case + '.json')))
    html = open(os.path.join(dirpath, case + '.html'), encoding='utf-8').read()
    return rec, html


def save(dirpath, case, rec, html):
    os.makedirs(dirpath, exist_ok=True)
    with open(os.path.join(dirpath, case + '.json'), 'w') as f:
        json.dump(rec, f, indent=1)
        f.write('\n')
    # newline='' so the document is written byte for byte; it is compared as a string.
    with open(os.path.join(dirpath, case + '.html'), 'w', encoding='utf-8', newline='') as f:
        f.write(html)


def compare(label, cur, cur_html, base, base_html, check_run=True):
    bad = 0

    def chk(ok, msg):
        nonlocal bad
        print(('  PASS  ' if ok else '  FAIL  ') + msg)
        if not ok:
            bad = 1

    if check_run:
        run = cur.get('run') or {}
        chk(run.get('printCalls') == 1 and run.get('cleanedUp') and run.get('classCleared'),
            f"{label}: one print call, and afterprint cleaned #print-root and the body class up "
            f"(calls={run.get('printCalls')}, cleaned={run.get('cleanedUp')}, class={run.get('classCleared')})")
        errs = run.get('errors') or []
        chk(not errs, f"{label}: 0 console errors/warnings{': ' + str(errs[:3]) if errs else ''}")

    same = cur_html == base_html
    chk(same, f"{label}: the printed month document is identical to baseline "
              f"({cur['pages']} months, {cur['elements']} elements, {cur['bytes']:,} bytes)")
    if not same:
        a, b = parse_doc(base_html), parse_doc(cur_html)
        if a.struct == b.struct:
            print(f"        structure IDENTICAL ({cur['elements']} elements) -- only inline styles differ")
        else:
            print(f"        structure DIFFERS: {base['elements']} -> {cur['elements']} elements")
        for i in range(max(len(base['fit']), len(cur['fit']))):
            fb = base['fit'][i] if i < len(base['fit']) else None
            fa = cur['fit'][i] if i < len(cur['fit']) else None
            if fa != fb:
                print(f"        fit p{i + 1}: {_fitstr(fb)}")
                print(f"             -> {_fitstr(fa)}")
        diff = list(difflib.unified_diff(a.full, b.full, 'baseline', 'current', n=1, lineterm=''))
        for line in diff[2:16]:
            print('        ' + line[:200])
        if len(diff) > 16:
            print(f"        ... {len(diff) - 16} more diff lines")

    s, p = cur.get('sheets'), cur.get('pages')
    chk(s is not None and s == p,
        f"{label}: every month prints as exactly one sheet ({p} months -> {s} sheets in Chrome's PDF)")
    chk(s == base.get('sheets') and cur.get('mediaBoxes') == base.get('mediaBoxes'),
        f"{label}: sheet count and page box match baseline "
        f"({s} vs {base.get('sheets')}; {cur.get('mediaBoxes')})")
    chk(cur.get('stampHits') == base.get('stampHits'),
        f"{label}: today stamp normalised {cur.get('stampHits')}x (baseline {base.get('stampHits')}x)")
    return bad


def _fitstr(f):
    if f is None:
        return '(no such month)'
    sc = '' if f['mode'] == 'fill' else ' scaleY(%s)' % f['scale']
    return '%s  %s%s  rows %s' % (f['month'], f['mode'], sc, ' '.join(f['rows']))


def main(argv):
    if len(argv) >= 5 and argv[0] in ('cut', 'gate'):
        mode, run_json, run_pdf, dirpath, case = argv[:5]
        try:
            rec, html = capture(run_json, run_pdf)
        except (OSError, ValueError) as e:
            print(f"  FAIL  monthprint {case}: produced no usable result: {e}")
            return 1
        if mode == 'cut':
            save(dirpath, case, rec, html)
            print(f"cut {case}: {rec['pages']} months, {rec['sheets']} sheets, "
                  f"{rec['elements']} elements, stamp x{rec['stampHits']} -> {dirpath}")
            return 0
        try:
            base, base_html = load(dirpath, case)
        except OSError as e:
            print(f"  FAIL  monthprint {case}: no baseline: {e}")
            return 1
        return compare('monthprint ' + case, rec, html, base, base_html)
    if len(argv) >= 5 and argv[0] == 'ab':
        a, a_html = load(argv[1], argv[2])
        b, b_html = load(argv[3], argv[4])
        # B is "current", A is "baseline" -- read the report as A -> B.
        return compare(f"{argv[2]} -> {argv[4]}", b, b_html, a, a_html, check_run=False)
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
