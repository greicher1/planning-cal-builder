#!/bin/zsh
# monthmapmeasure.sh -- MONTH-RAIL-PLAN.md step 1: the monthmapmeasure leg on EVERY fixture, as one table.
#
#   ./monthmapmeasure.sh                 against the build (/dist/index.html); build it first
#
# Each calendar is its own run.sh call (HARNESS_STATE), so one that will not load cannot stop the rest. A fixture
# whose name ?state= refuses (srv.js takes [A-Za-z0-9_.-] only) is skipped and listed. Results, all gitignored:
# monthmapmeasure--<fixture>.json per calendar, and the table in monthmapmeasure-table.txt.
# ⚠️ Port 8641 by default, so the Chrome profile is namespaced away from a gate another session may be running
# (run.sh's PARALLEL SESSIONS note).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export HARNESS_PAGE="${HARNESS_PAGE:-/dist/index.html}"
export HARNESS_PORT="${HARNESS_PORT:-8641}"
cd "$HERE"
rm -f monthmapmeasure--*.json
for f in "$ROOT"/tests/fixtures/*.sptcal; do
  n="$(basename "$f" .sptcal)"
  if [[ ! "$n" =~ '^[A-Za-z0-9_.-]+$' ]]; then echo "skipped (name ?state= refuses): $n"; continue; fi
  rm -f monthmapmeasure.json
  HARNESS_STATE="$n" ./run.sh monthmapmeasure 120 >/dev/null 2>&1
  if [[ -f monthmapmeasure.json ]]; then mv monthmapmeasure.json "monthmapmeasure--$n.json"
  else print -r -- "{\"info\":{\"fixture\":\"$n\",\"status\":\"no result\"},\"cases\":[]}" > "monthmapmeasure--$n.json"; fi
  echo "measured: $n"
done
python3 -I - "$HERE" <<'PY' | tee monthmapmeasure-table.txt
import json, glob, os, sys
rows = []
for p in sorted(glob.glob(os.path.join(sys.argv[1], 'monthmapmeasure--*.json'))):
    d = json.load(open(p))
    i = d.get('info', {})
    fails = [c['id'] for c in d.get('cases', []) if not c.get('pass')]
    r = i.get('rows') or {}
    rows.append(dict(f=i.get('fixture') or os.path.basename(p)[17:-5], st=i.get('status', '?'), m=i.get('months'),
                     ph=i.get('phases'), need=r.get('needed'), named=r.get('named'), thin=r.get('thin'),
                     busy=i.get('busiest', ''), fails=fails + (['EX: ' + d['EX']] if d.get('EX') else []),
                     bands=i.get('bands') or []))
done = [x for x in rows if x['st'] == 'measured']
print('| Fixture | Months | Phases | Rows needed | Named | Thin | Busiest day | Leg |')
print('|---|---|---|---|---|---|---|---|')
for x in sorted(done, key=lambda x: (-(x['need'] or 0), -(x['m'] or 0), x['f'])):
    print(f"| {x['f']} | {x['m']} | {x['ph']} | {x['need']} | {x['named']} | {x['thin']} | {x['busy']} | {'ok' if not x['fails'] else ', '.join(x['fails'])} |")
print()
dist = {}
for x in done: dist[x['need']] = dist.get(x['need'], 0) + 1
print('Rows needed:', ', '.join(f"{k} row{'s' if k != 1 else ''}: {v}" for k, v in sorted(dist.items(), key=lambda kv: kv[0] or 0)))
print('Most months:', max((x['m'] or 0) for x in done) if done else 0)
over = [x for x in done if (x['need'] or 0) > 3]
for x in over:
    print(f"Past 3 rows, {x['f']}:", '; '.join(f"{b['name']} ({b['start']} to {b['end']})" for b in x['bands'] if b['row'] >= 3))
print('Not measured:', ', '.join(f"{x['f']} ({x['st']}{': ' + ', '.join(x['fails']) if x['fails'] else ''})" for x in rows if x['st'] != 'measured') or 'none')
print('Leg failures:', ', '.join(f"{x['f']}: {', '.join(x['fails'])}" for x in done if x['fails']) or 'none')
PY
