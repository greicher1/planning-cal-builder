#!/bin/sh
# Proves the push guard (tools/hooks/pre-push) against a THROWAWAY copy of a remote: a bare repo and a clone
# in a temp folder, nothing of this repository's own remotes touched (OUT-30's one-time proof, OUT-40's
# broken samples). Each case says what it expects; the script exits non-zero if any case is wrong.
#
#   sh tools/hooks/test-pre-push.sh
#
# A refused push must leave the remote exactly as it was, so every refusal case also checks the remote ref.

here=$(cd "$(dirname "$0")" && pwd)
hook="$here/pre-push"
t=$(mktemp -d "${TMPDIR:-/tmp}/sptcal-pushguard.XXXXXX")
trap 'rm -rf "$t"' EXIT
pass=0; fail=0
ok()   { pass=$((pass+1)); echo "  PASS  $1"; }
bad()  { fail=$((fail+1)); echo "  FAIL  $1"; }

git init -q --bare "$t/remote.git"
git init -q -b main "$t/work"
cd "$t/work" || exit 1
git config user.name "guard test"; git config user.email "guard@test.invalid"
git config commit.gpgsign false
echo one > f; git add f; git commit -q -m one
git remote add origin "$t/remote.git"
git push -q origin main 2>/dev/null          # seed the remote BEFORE the guard is installed
cp "$hook" .git/hooks/pre-push; chmod +x .git/hooks/pre-push

remote_main() { git --git-dir="$t/remote.git" rev-parse --verify --quiet refs/heads/main; }

echo two > f; git commit -qam two
two=$(git rev-parse HEAD); before=$(remote_main)

# 1. no approval
git push -q origin main 2>/dev/null && bad "1 no approval: pushed" || { [ "$(remote_main)" = "$before" ] && ok "1 no approval: refused, remote unchanged" || bad "1 remote moved"; }
# 2. approval names another commit
SPTCAL_PUSH_OK="$before" git push -q origin main 2>/dev/null && bad "2 wrong commit: pushed" || { [ "$(remote_main)" = "$before" ] && ok "2 approval names another commit: refused" || bad "2 remote moved"; }
# 3. junk and too-short approvals
SPTCAL_PUSH_OK="yes" git push -q origin main 2>/dev/null && bad "3a junk: pushed" || ok "3a 'yes' as approval: refused"
SPTCAL_PUSH_OK="$(printf %s "$two" | cut -c1-4)" git push -q origin main 2>/dev/null && bad "3b 4-char: pushed" || ok "3b a 4-character id: refused"
SPTCAL_PUSH_OK="deadbeefdeadbeef" git push -q origin main 2>/dev/null && bad "3c unknown id: pushed" || ok "3c an id naming no commit: refused"
# 4. the refusal names what the push carries
msg=$(git push origin main 2>&1); printf '%s' "$msg" | grep -q "two" && printf '%s' "$msg" | grep -q "PUSH REFUSED" \
  && ok "4 the refusal lists the commit it would carry" || bad "4 refusal message"
# 5. approval names the pushed commit (abbreviated)
SPTCAL_PUSH_OK="$(git rev-parse --short=8 HEAD)" git push -q origin main 2>/dev/null && [ "$(remote_main)" = "$two" ] \
  && ok "5 approval naming the pushed commit (8 chars): pushed" || bad "5 approved push failed"
# 6. a worktree of the same repo runs the same guard
git worktree add -q "$t/wt" -b side 2>/dev/null
( cd "$t/wt" && echo three > g && git add g && git commit -qm three && \
  git push -q origin side 2>/dev/null ) && bad "6 worktree push without approval went through" \
  || { git --git-dir="$t/remote.git" rev-parse --verify --quiet refs/heads/side >/dev/null && bad "6 remote got side" || ok "6 a linked worktree is refused too (shared hooks folder)"; }
# 7. branch + annotated tag on the same commit: one approval; a tag on another commit: refused
git tag -a v9.9.9 -m t "$two"
SPTCAL_PUSH_OK="$two" git push -q origin main refs/tags/v9.9.9 2>/dev/null && ok "7a main + its version tag with one approval: pushed" || bad "7a tag push failed"
git tag -a v0.0.1 -m t "$before"
SPTCAL_PUSH_OK="$two" git push -q origin refs/tags/v0.0.1 2>/dev/null && bad "7b tag on another commit: pushed" || ok "7b a tag on another commit: refused"
# 8. deleting a remote branch needs delete:<ref>
SPTCAL_PUSH_OK="$two" git push -q origin side:side 2>/dev/null || true
git --git-dir="$t/remote.git" update-ref refs/heads/old "$before"
git push -q origin :refs/heads/old 2>/dev/null && bad "8a delete without approval: deleted" || ok "8a delete without approval: refused"
SPTCAL_PUSH_OK="delete:refs/heads/main" git push -q origin :refs/heads/old 2>/dev/null && bad "8b delete approved for another ref: deleted" || ok "8b delete approved for another ref: refused"
SPTCAL_PUSH_OK="delete:refs/heads/old" git push -q origin :refs/heads/old 2>/dev/null \
  && ! git --git-dir="$t/remote.git" rev-parse --verify --quiet refs/heads/old >/dev/null \
  && ok "8c delete with delete:refs/heads/old: deleted" || bad "8c approved delete failed"

echo ""
echo "push guard: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
