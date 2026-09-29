#!/usr/bin/env python3
"""Diff generated dates against the HOLIDAYS object already in src/legacy/app.js.
Every difference must be explained. Silent drift is the failure mode this prevents.

Run it from the directory gen_holidays.py wrote holidays.json into:
    python3 tools/gen_holidays.py && python3 tools/validate_holidays.py
It compares every year the generator produced (holidays.json's meta.years), region by region.
(Fixed 29 Sep 2026: it pointed at another machine's checkout and only looked at 2026-2029.)"""

import json, os, re, sys

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "legacy", "app.js")

src = open(APP, encoding="utf-8", errors="replace").read()
start = src.index("const HOLIDAYS = {")
depth, i = 0, start + len("const HOLIDAYS = ")
while True:
    if src[i] == "{": depth += 1
    elif src[i] == "}":
        depth -= 1
        if depth == 0: break
    i += 1
block = src[start:i + 1]

existing = {}
for m in re.finditer(r"'([A-Z][A-Z-]*)':\s*\[(.*?)\n\s*\],", block, re.S):
    key, body = m.group(1), m.group(2)
    # Names are single-quoted with \' escapes ('New Year\'s Day'); a lazy (.*?) stopped at the
    # escaped quote, so every such name read as "New Year\" and the diff reported them all.
    rows = re.findall(r"date:'(\d{4}-\d{2}-\d{2})',\s*name:\s*'((?:[^'\\]|\\.)*)'", body)
    existing[key] = {(d, n.replace("\\'", "'")) for d, n in rows}

gen = json.load(open("holidays.json"))
y0, y1 = gen["meta"]["years"]
years = {str(y) for y in range(y0, y1 + 1)}

MAP = {k: k for k in gen["regions"]}      # the app keys its regions exactly as the generator does

clean = True
for old_key, new_key in MAP.items():
    if old_key not in existing:
        print(f"!! {old_key} not found in app.js"); clean = False; continue
    have = {(d, n) for d, n in existing[old_key] if d[:4] in years}
    want = {(h["date"], h["name"]) for h in gen["regions"][new_key]["holidays"]
            if h["date"][:4] in years}

    only_app = sorted(have - want)
    only_gen = sorted(want - have)
    if not only_app and not only_gen:
        print(f"✓  {old_key:7s} → {new_key:7s}  identical ({len(have)} rows, {y0}-{y1})")
        continue

    clean = False
    print(f"\n✗  {old_key:7s} → {new_key:7s}  {len(only_app)} only in app, {len(only_gen)} only in generated")
    for d, n in only_app[:14]: print(f"     app only : {d}  {n}")
    if len(only_app) > 14: print(f"     ... and {len(only_app)-14} more")
    for d, n in only_gen[:14]: print(f"     gen only : {d}  {n}")
    if len(only_gen) > 14: print(f"     ... and {len(only_gen)-14} more")

print("\nCLEAN" if clean else "\nDIFFERENCES FOUND — each must be explained below, not accepted silently")
sys.exit(0)
