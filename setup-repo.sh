#!/bin/bash
# Copies the wedding site out of Claude's session folder into a permanent home
# and checks it is a healthy git repo. Run once. Safe to re-run.

set -u

SRC="/Users/jayciesorianolota/Library/Application Support/Claude/local-agent-mode-sessions/82529ac9-54bb-4254-ad7f-234c0a8228bd/641b170c-9f5e-4c27-ad8d-84b096bee92e/local_1d639973-5431-4736-afe0-2933e13ad8f1/outputs/jcmj-wedding-site"
DEST="$HOME/Documents/wedding"

echo "==> Checking the source folder"
if [ ! -d "$SRC" ]; then
  echo "    NOT FOUND. The Claude session folder has been cleared."
  echo "    Ask Claude for a fresh jcmj-wedding-site.zip instead."
  exit 1
fi
echo "    found"

echo "==> Copying to $DEST"
mkdir -p "$DEST"
if [ -d "$DEST/jcmj-wedding-site" ]; then
  echo "    Destination already exists — leaving it alone so nothing is lost."
  echo "    Delete it yourself first if you want a clean copy."
else
  cp -R "$SRC" "$DEST/"
  echo "    copied"
fi

cd "$DEST/jcmj-wedding-site" || { echo "    Could not enter the folder."; exit 1; }

echo "==> Verifying the git history came across"
if [ ! -d .git ]; then
  echo "    No .git folder — the history did not copy."
  exit 1
fi
COUNT=$(git rev-list --count HEAD 2>/dev/null || echo 0)
echo "    $COUNT commit(s):"
git --no-pager log --oneline | sed 's/^/      /'

echo "==> Checking for a stray git repo in your home folder"
if [ -d "$HOME/.git" ]; then
  echo "    WARNING: $HOME/.git exists."
  echo "    A previous 'gh repo create' in the wrong folder likely made it."
  echo "    It is only git metadata — your files are untouched — but it will"
  echo "    keep confusing git commands. Remove it with:"
  echo "        rm -rf \"$HOME/.git\""
else
  echo "    none, good"
fi

echo
echo "============================================================"
echo " Ready. Your project now lives at:"
echo "   $DEST/jcmj-wedding-site"
echo
echo " The remote is already set to:"
echo "   git@github.com:lotajaycie-cloud/EveryRoadLedHere.git"
echo
echo " Next, run:"
echo
echo "   cd ~/Documents/wedding/jcmj-wedding-site"
echo "   git push -u origin main"
echo
echo " If SSH complains about permissions, switch to HTTPS instead:"
echo
echo "   git remote set-url origin https://github.com/lotajaycie-cloud/EveryRoadLedHere.git"
echo "   git push -u origin main"
echo "============================================================"
