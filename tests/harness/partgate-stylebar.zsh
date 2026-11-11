#!/bin/zsh
# The style bar's move into the toolbar row (10 Nov 2026): the legs that see the toolbar, the bar or the grid fit,
# one at a time on this worktree's own port, against the build. Writes partgate-stylebar.log.
cd "${0:A:h}"
export HARNESS_PORT=8422 HARNESS_PAGE=/dist/index.html
LOG=partgate-stylebar${1:+-$1}.log; : > $LOG
run(){ # leg state secs
  local leg=$1 st=$2 secs=$3
  rm -f $leg.json
  HARNESS_STATE="${st/#-/}" ./run.sh $leg $secs >/dev/null 2>&1
  python3 - $leg.json "$leg${st:#-:+ ($st)}" >> $LOG <<'PY'
import json,sys
p,l=sys.argv[1],sys.argv[2]
try: a=json.load(open(p))
except Exception as e: print('  FAIL  '+l+' produced no result: '+str(e)); sys.exit()
if a.get('EX'): print('  FAIL  '+l+' threw: '+str(a['EX'])[:200])
cs=a.get('cases') or a.get('checks') or []
if cs:
  bad=[c for c in cs if not (c.get('pass') is True or c.get('ok') is True)]
  print(('  PASS  ' if not bad else '  FAIL  ')+l+': %d/%d'%(len(cs)-len(bad),len(cs)))
  for c in bad: print('        - '+str(c.get('id',''))+' '+str(c.get('title') or c.get('what'))[:160])
else:
  print(('  PASS  ' if a.get('pass') is True else '  FAIL  ')+l+': '+('pass' if a.get('pass') is True else json.dumps(a)[:300]))
PY
}
if [[ "$1" == merged ]]; then
  run stylebarplace fill-intent 300
  run lastedited lastedited 400
  run hdrcontrols carry-rich 170
  run sharecopy2 - 180
  run monthmap mvnotes 180
  run textstyle carry-rich 400
  run calzoom mvnotes 300
  echo DONE >> $LOG; exit 0
fi
if [[ "$1" == rerun ]]; then
  run stylebarplace fill-intent 300
  run hdrcontrols carry-rich 170
  run sharecopy2 - 90
  run monthmap mvnotes 180
  run monthmap colreuse 180
  run monthmap offweek 180
  run mvnotesize mvnotes 900
  run textstyle carry-rich 400
  run calzoom mvnotes 300
  echo DONE >> $LOG; exit 0
fi
run stylebarplace fill-intent 300
run textstyle carry-rich 400
run hdrcontrols carry-rich 170
run monthmap mvnotes 180
run monthmap colreuse 180
run monthmap offweek 180
run calzoom mvnotes 300
run sharecopy2 - 90
run fillspace layout-r13 300
run mvtextstyle - 900
run mvtextstyle mvtextstyle 400
run sideboxes sideboxes 900
run mvnotesize mvnotes 900
run mvnotesize month-dense60 900
# Gate 7 by hand (gate.sh's header): the fence's computed styles inside #table-wrap, the live build against this one.
rm -f fence.json; HARNESS_PAGE=/tests/harness/old-stylebar.html ./run.sh fence 40 >/dev/null 2>&1; cp -f fence.json fence-old-stylebar.json
rm -f fence.json; ./run.sh fence 40 >/dev/null 2>&1; cp -f fence.json fence-new-stylebar.json
echo DONE >> $LOG
