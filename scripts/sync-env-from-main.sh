#!/bin/sh
# Copy local env files from the main worktree into the current worktree.
# Only copies files that exist in main and are MISSING here (never overwrites).
# Safe to run repeatedly.
#
# Usage:
#   sh scripts/sync-env-from-main.sh
#
# Files synced (if present in main, missing here):
#   .env .env.local .env.development .env.development.local
#
# Note: .env* is gitignored, so `git worktree add` never carries it over.
# This script fills that gap. It is also called automatically by the
# post-checkout hook (see scripts/githooks/post-checkout).

set -eu

# Resolve current worktree top-level
TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Resolve main worktree: parent of the common .git dir.
# e.g. common=/path/to/repo/.git -> main=/path/to/repo
COMMON="$(git rev-parse --git-common-dir 2>/dev/null || echo ".git")"
case "$COMMON" in
  /*) ;;
  *) COMMON="$TOPLEVEL/$COMMON" ;;
esac
MAIN="$(dirname "$COMMON")"

# If we ARE in the main worktree, there is nothing to copy from.
if [ "$TOPLEVEL" = "$MAIN" ]; then
  echo "sync-env: already in main worktree ($TOPLEVEL), nothing to copy."
  exit 0
fi

copied=0
skipped=0
for f in .env .env.local .env.development .env.development.local; do
  if [ -f "$MAIN/$f" ] && [ ! -e "$TOPLEVEL/$f" ]; then
    cp "$MAIN/$f" "$TOPLEVEL/$f"
    echo "sync-env: copied $f from $MAIN"
    copied=$((copied + 1))
  elif [ -e "$TOPLEVEL/$f" ]; then
    skipped=$((skipped + 1))
  fi
done

if [ "$copied" -eq 0 ]; then
  if [ "$skipped" -gt 0 ]; then
    echo "sync-env: already up to date ($skipped file(s) present, nothing copied)."
  else
    echo "sync-env: no env files found in main worktree ($MAIN). Nothing to copy."
    echo "sync-env: place your real values in $MAIN/.env.local, then re-run this script."
  fi
fi
