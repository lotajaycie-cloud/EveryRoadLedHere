#!/bin/bash
# Publish straight to the live site.
#   ./publish.sh "fixed the gallery spacing"
# Commits everything and pushes to main. Vercel redeploys within a minute.

set -e
cd "$(dirname "$0")"

MSG="${1:-Update wedding site}"

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing has changed — nothing to publish."
  exit 0
fi

echo "==> Changes to publish:"
git --no-pager status --short | sed 's/^/    /'
echo

git add -A
git commit -m "$MSG"
git push

echo
echo "Pushed. Vercel is redeploying — give it about a minute."
git remote get-url origin 2>/dev/null | sed 's|^|Repo: |'
