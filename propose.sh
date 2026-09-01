#!/bin/bash
# Propose a change on its own branch and open a pull request.
#   ./propose.sh "gallery-spacing" "Tighten the gallery spacing"
#
# Why bother: Vercel builds a PREVIEW URL for every pull request — a live copy
# of the change at its own address. You check it on your phone, and the site
# your guests see stays untouched until you merge.

set -e
cd "$(dirname "$0")"

BRANCH="${1:-}"
MSG="${2:-Update wedding site}"

if [ -z "$BRANCH" ]; then
  echo "Usage: ./propose.sh <branch-name> \"commit message\""
  echo "   eg: ./propose.sh gallery-spacing \"Tighten the gallery spacing\""
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing has changed — nothing to propose."
  exit 0
fi

echo "==> Changes to propose:"
git --no-pager status --short | sed 's/^/    /'
echo

git checkout -b "$BRANCH"
git add -A
git commit -m "$MSG"
git push -u origin "$BRANCH"

if command -v gh >/dev/null 2>&1; then
  gh pr create --fill --base main
  echo
  echo "Pull request opened. Vercel will post a preview link on it shortly."
  echo "Happy with it?  gh pr merge --squash --delete-branch"
else
  echo
  echo "Branch pushed. Open the PR here:"
  git remote get-url origin | sed 's|\.git$||' | sed "s|\$|/compare/$BRANCH?expand=1|"
fi

echo
echo "To get back to the main line afterwards:  git checkout main && git pull"
