#!/bin/sh
# Installs, or checks, SPTCal's push guard (tools/hooks/pre-push) in the shared hooks folder inside .git,
# which every worktree of this repository uses (OUT-30). Protected (GOVERNANCE INTRO-2): installing it
# changes how every push works, the owner's own included, so it is installed only on the owner's yes.
#
#   sh tools/hooks/install-hooks.sh           install (or update) the guard
#   sh tools/hooks/install-hooks.sh --check   say whether the installed copy matches this source
#                                             (exit 0 matches, 1 differs, 2 not installed)
#
# A tracked .githooks folder with core.hooksPath would NOT do: every existing worktree checks out its own
# branch's copy, so worktrees on older branches would silently run none. One copy in .git reaches all.

set -e
here=$(cd "$(dirname "$0")" && pwd)
src="$here/pre-push"
common=$(git rev-parse --git-common-dir)
case "$common" in /*) ;; *) common="$(pwd)/$common" ;; esac
dest="$common/hooks/pre-push"

if [ -n "$(git config --get core.hooksPath || true)" ]; then
  echo "core.hooksPath is set ($(git config --get core.hooksPath)): git would not run $dest. Unset it first (owner's call)." >&2
  exit 3
fi

if [ "${1:-}" = "--check" ]; then
  if [ ! -f "$dest" ]; then echo "push guard: NOT INSTALLED ($dest)"; exit 2; fi
  if cmp -s "$src" "$dest" && [ -x "$dest" ]; then echo "push guard: installed and current"; exit 0; fi
  echo "push guard: installed copy DIFFERS from tools/hooks/pre-push (or is not executable): re-run the installer"
  exit 1
fi

mkdir -p "$common/hooks"
if [ -f "$dest" ] && ! cmp -s "$src" "$dest"; then
  cp "$dest" "$dest.before-sptcal-guard.$(date +%Y%m%d%H%M%S)"
fi
cp "$src" "$dest"
chmod +x "$dest"
echo "push guard installed: $dest"
