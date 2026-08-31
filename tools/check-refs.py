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
    # ** Three more shapes were found still stale on 29 Aug 2026, AFTER the table fix above. **
    # ** PROJECT-CONTEXT section 4 carried a five-row `| Helper | Line | Purpose |` table whose
    # ** every number was ~2,000 lines wrong (`parseDateUTC` said 1474; it is at 3407), and
    # ** section 8 carried `parseCalendarText(text)` (7352) and `showLegacyNotice`,\n8226 -- both
    # ** stale by the same +32 as section 2b. All three slipped past because of PUNCTUATION:
    # **   `sym` | 1474   -- the separator is a pipe, and the old class was [ ,] only
    # **   `sym()` (7352) -- parenthesised WITHOUT the tilde the old pattern required
    # **   `sym`,\n8226   -- the number wrapped onto the next line
    # ** So: the separator class now includes the pipe, the tilde is optional, and each line is
    # ** scanned joined to the one after it (a match is reported once, against the line the
    # ** SYMBOL is on). The pipe form is the false-positive risk -- plenty of legitimate tables
    # ** pair a symbol with a 3-digit constant -- so it additionally requires the number to be
    # ** the WHOLE cell and to fall inside index.html's actual line range.
    src_max = len(SRC) + 200
    prose_hits, seen = [], set()

    def hit(md, i, frag, why=''):
        key = (md, i, frag)
        if key in seen:
            return
        seen.add(key)
        prose_hits.append('%s:%d  %s%s' % (md, i, frag, why))

    # All the prose docs, not just the original four: MANTINE-SEAM.md and STAGE-8.md both
    # cite the frozen surface heavily and are exactly where a line number would creep back.
    for md in ('PROJECT-CONTEXT.md', 'CLAUDE.md', 'HANDOFF.md', 'SPTCAL-ENCRYPTION.md',
               'MANTINE-SEAM.md', 'MANTINE-MIGRATION.md', 'STAGE-8.md',
               'UI-CONVENTIONS.md'):
        text = (ROOT / md).read_text(encoding='utf-8')
        body = text.split('## 14.')[0] if md == 'PROJECT-CONTEXT.md' else text
        lines = body.split('\n')
        line_cols = set()
        for i, line in enumerate(lines, 1):
            nxt = lines[i] if i < len(lines) else ''
            joined = line + ' ' + nxt
            cut = len(line)          # a match must START on this line, so it is reported once
            for m in re.finditer(r'`[A-Za-z_][A-Za-z0-9_()]*`[^\n]{0,20}?\(~?\d{3,5}\)', joined):
                if m.start() < cut:
                    hit(md, i, m.group(0))
            for m in re.finditer(r'index\.html:\d+', line):
                hit(md, i, m.group(0), '  (link a symbol, not a line)')
            # "at line 2309" / "(line 2240)" -- the BARE English form, with no backticked symbol
            # anywhere near it. Added 31 Aug 2026 after a documentation audit found two of these
            # sitting in PROJECT-CONTEXT prose while this script reported CLEAN: every pattern above
            # requires a `symbol` adjacent to the number, and "ExcelJS from a CDN `<script>` tag
            # (line 2240)" has none that match -- `<script>` is not a symbol shape. Both numbers
            # were also WRONG by the time they were found, which is the whole reason for the rule.
            for m in re.finditer(r'\blines?\s+~?\d{3,5}\b', line, re.I):
                hit(md, i, m.group(0), '  (name the symbol; numbers live in section 14)')
            # `symbol` 1234  /  `symbol`, 1234  -- the shape section 2b was using.
            for m in re.finditer(r'`[A-Za-z_][A-Za-z0-9_()]*`[ ,]{1,3}\d{3,5}\b', joined):
                if m.start() < cut:
                    hit(md, i, m.group(0), '  (name the symbol only; numbers live in section 14)')
            # `symbol` | 1474 |  -- the shape section 4's date-helper table was using.
            #
            # This one needs a narrower trigger than the others, because plenty of legitimate
            # tables pair a symbol with a small number: `MAX_WEEKS` | 600, `EXCEL_MDW` | 7,
            # `HF_MAX` | 255. Crying wolf on those is how someone stops running the script, which
            # is worse than the hole. So it fires on either of two specific signals:
            #   (a) the table declares a "Line" / "Lines" column in its header -- exact, and what
            #       section 4 actually did; or
            #   (b) the number is a WHOLE cell and >= 1000, i.e. it looks like an index.html line
            #       rather than a constant. Real constants in these docs are all 3 digits or fewer.
            if line.lstrip().startswith('|') and re.match(r'^\s*\|[\s:|-]+\|?\s*$', nxt):
                cells = [c.strip().lower() for c in line.strip().strip('|').split('|')]
                # 'line' only, never 'lines': a plural header is a line-COUNT column
                #   (MANTINE-MIGRATION's scope table), which is not a reference at all.
                line_cols = {j for j, c in enumerate(cells) if c == 'line'}
            elif not line.lstrip().startswith('|'):
                line_cols = set()
            if line.lstrip().startswith('|') and line_cols:
                cells = [c.strip() for c in line.strip().strip('|').split('|')]
                for j in line_cols:
                    if j < len(cells) and re.fullmatch(r'\d{2,5}', cells[j]):
                        hit(md, i, '| %s |' % cells[j],
                            '  (a "Line" column: numbers live in section 14)')
            for m in re.finditer(r'`[A-Za-z_][A-Za-z0-9_()]*`\s*\|\s*(\d{4,5})\s*(?=\||$)', line):
                if 1000 <= int(m.group(1)) <= src_max:
                    hit(md, i, m.group(0), '  (looks like a line number: they live in section 14)')
    for h in prose_hits:
        print('  PROSE LINE NUMBER (should name the symbol only): %s' % h)

    bad = len(stale) + len(unknown) + len(prose_hits)
    print('\nsection 14 map: %d symbols checked, %d stale, %d not found' % (checked, len(stale), len(unknown)))
    print('prose line numbers: %d (must be 0)' % len(prose_hits))
    print('RESULT: %s' % ('CLEAN' if bad == 0 else 'STALE -- regenerate section 14'))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main())
