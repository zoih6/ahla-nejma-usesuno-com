#!/usr/bin/env bash
# push.sh — publish the project into the GitHub repository.
# Usage:  bash scripts/push.sh "commit message"
set -euo pipefail

MSG="${1:-update: motion-graphics build}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${REPO:-/tmp/ilaf-repo}"      # outside the workspace: disposable clone, never part of the snapshot
TOKEN_FILE="${TOKEN_FILE:-/home/user/.secrets/gh_token}"
GH="${GH:-zoih6/ahla-nejma-usesuno-com}"
DEST="$REPO/motion"

[ -f "$TOKEN_FILE" ] || { echo "!! no token at $TOKEN_FILE"; exit 1; }
TOKEN="$(cat "$TOKEN_FILE")"

# the working clone is disposable: everything lives on GitHub, so re-clone if missing
if [ ! -d "$REPO/.git" ]; then
  echo ">> cloning fresh working copy"
  rm -rf "$REPO"
  git clone -q "https://oauth2:${TOKEN}@github.com/${GH}.git" "$REPO"
fi

echo ">> syncing $ROOT  ->  $DEST"
mkdir -p "$DEST"

rsync -a --delete \
  --exclude 'node_modules/' \
  --exclude 'frames/' \
  --exclude 'analysis/_*.log' \
  --exclude 'analysis/win_*.json' \
  --exclude 'output/' \
  --exclude 'assets/audio_master.mp3' \
  --exclude '.git/' \
  --exclude '__pycache__/' \
  --exclude '.DS_Store' \
  "$ROOT/" "$DEST/"

# the renders are the deliverable — copied separately so --delete never eats them
mkdir -p "$DEST/output"
for f in "$ROOT"/output/*.mp4 "$ROOT"/output/*.jpg; do
  [ -e "$f" ] && cp -v "$f" "$DEST/output/"
done

cd "$REPO"
git config user.name  "motion-engine"
git config user.email "motion-engine@local"

git add -A
if git diff --cached --quiet; then
  echo ">> nothing to commit"
else
  git commit -q -m "$MSG"
  # This repository's default branch is master, NOT main. Pushing to main
  # silently created a second branch and the work looked absent for 43
  # minutes. Push to every branch the remote actually has.
  BRANCHES="$(git ls-remote --heads origin | sed 's|.*refs/heads/||' | tr '\n' ' ')"
  [ -z "$BRANCHES" ] && BRANCHES="master"
  echo ">> remote branches: $BRANCHES"
  for BR in $BRANCHES; do
    if git push -q "https://oauth2:${TOKEN}@github.com/${GH}.git" "HEAD:${BR}"; then
      echo ">> pushed $BR : $MSG"
    else
      echo "!! FAILED to push $BR"
    fi
  done
fi

# prove it landed where a visitor will actually see it
echo ">> verifying"
DEF=$(curl -s "https://api.github.com/repos/${GH}" | grep -o '"default_branch":"[^"]*"' | cut -d'"' -f4)
echo ">> default branch on GitHub: ${DEF}"
curl -s "https://api.github.com/repos/${GH}/contents/?ref=${DEF}&_=$(date +%s)" \
  | grep -o '"name": *"[^"]*"' | sed 's/"name": *//' | tr -d '"' | sed 's/^/     /'
echo ">> done"
