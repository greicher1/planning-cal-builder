#!/usr/bin/env python3
"""Verify every code line-number reference in the docs against index.html.

Why this exists: the docs carried ~107 hand-maintained line numbers scattered through
prose. Twice in one day a single commit to index.html invalidated nearly all of them
(the second time, 104 of 107), because any insertion shifts everything below it. A wrong
line number is worse than none -- it reads as precision and sends you to the wrong
function.

The fix has two halves:
  1. Prose names SYMBOLS only. grep finds them; they cannot go stale.
  2. Line numbers live in exactly ONE place -- PROJECT-CONTEXT.md section 14 -- and this
     script checks them.

Run after any change to index.html:   python3 tools/check-refs.py
Exit code 0 = clean, 1 = stale (prints what moved).
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC  = (ROOT / 'index.html').read_text(encoding='utf-8').split('\n')

def find(pattern):
    rx = re.compile(pattern)
    for i, line in enumerate(SRC, 1):
        if rx.search(line):
            return i
    return None

def sym(name):
    """Locate a symbol by the usual declaration forms."""
    for pat in (r'^\s*(?:async\s+)?function\s+%s\b' % re.escape(name),
                r'^\s*const\s+%s\b' % re.escape(name),
                r'^\s*let\s+%s\b' % re.escape(name),
                r'\bconst\s+%s\b' % re.escape(name),
                r'\b%s\s*=' % re.escape(name)):
        n = find(pat)
        if n:
            return n
    return None

def main():
    doc = (ROOT / 'PROJECT-CONTEXT.md').read_text(encoding='utf-8')
    try:
        table = doc[doc.index('## 14.'):]
    except ValueError:
        print('FAIL: PROJECT-CONTEXT.md has no section 14 line-number map'); return 1

    stale, checked, unknown = [], 0, []
    for row in table.split('\n'):
        if not row.startswith('|'):
            continue
        names = re.findall(r'`([A-Za-z_][A-Za-z0-9_]*)`', row)
        nums  = [int(n) for n in re.findall(r'\b(\d{2,5})\b', row)]
        if not names or not nums:
            continue
        for name in names:
            actual = sym(name)
            if actual is None:
                unknown.append(name); continue
            checked += 1
            if actual not in nums:
                stale.append((name, nums, actual))

    for name, nums, actual in stale:
        print('  STALE  %-30s map says %-18s actual %d' % (name, nums, actual))
    if unknown:
        print('  NOT FOUND in index.html: %s' % ', '.join(sorted(set(unknown))))

    # Prose must not carry line numbers -- that is the invariant this whole script protects.
    #
    # ** Table rows used to be skipped entirely, and that hole was real. ** HANDOFF section 2b
    # ** kept its references in a table -- `exportExcel` 6121-6122, `buildWaterfallPdf` 9484-9485
    # ** -- so the scan never looked at them, and they sat stale by exactly +32 lines while this
    # ** script printed RESULT: CLEAN. That is precisely the failure the script exists to prevent,
    # ** just moved inside a table. Found 29 Aug 2026.
    #
    # Tables are now scanned like any other line, for all three shapes a reference takes. The only
    # exclusion left is section 14 itself, which is the one place numbers are allowed to live and
    # is checked above instead. The bare-number pattern deliberately requires the number to follow
    # a BACKTICKED SYMBOL within a couple of characters: prose is full of legitimate numbers
    # (byte counts, the 255-character header cap, 7.4336 px, years) and a looser rule would cry
    # wolf until someone stopped running the script, which is worse than the hole it closes.
    prose_hits = []
    for md in ('PROJECT-CONTEXT.md', 'CLAUDE.md', 'HANDOFF.md', 'SPTCAL-ENCRYPTION.md'):
        text = (ROOT / md).read_text(encoding='utf-8')
        body = text.split('## 14.')[0] if md == 'PROJECT-CONTEXT.md' else text
        for i, line in enumerate(body.split('\n'), 1):
            for m in re.finditer(r'`[A-Za-z_][A-Za-z0-9_()]*`[^\n]{0,20}?\(~\d{3,5}\)', line):
                prose_hits.append('%s:%d  %s' % (md, i, m.group(0)))
            for m in re.finditer(r'index\.html:\d+', line):
                prose_hits.append('%s:%d  %s  (link a symbol, not a line)' % (md, i, m.group(0)))
            # `symbol` 1234   /   `symbol` 1234-1235   -- the shape section 2b was using.
            for m in re.finditer(r'`[A-Za-z_][A-Za-z0-9_]*`[ ,]{1,3}\d{3,5}\b', line):
                prose_hits.append('%s:%d  %s  (name the symbol only; numbers live in section 14)'
                                  % (md, i, m.group(0)))
    for h in prose_hits:
        print('  PROSE LINE NUMBER (should name the symbol only): %s' % h)

    bad = len(stale) + len(unknown) + len(prose_hits)
    print('\nsection 14 map: %d symbols checked, %d stale, %d not found' % (checked, len(stale), len(unknown)))
    print('prose line numbers: %d (must be 0)' % len(prose_hits))
    print('RESULT: %s' % ('CLEAN' if bad == 0 else 'STALE -- regenerate section 14'))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main())
