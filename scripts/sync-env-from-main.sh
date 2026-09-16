#!/bin/sh
# Copy local env files from the main worktree into the current worktree.
# Only copies files that exist in main and are MISSING here (never overwrites).
# Safe to run repeatedly.
#
# Usage:
#   sh scripts/sync-env-from-main.sh [worktree-path]
#   npm run setup:env
#
# With no args, syncs into the current worktree. Pass a worktree path to
# sync into a freshly created worktree (e.g. right after `git worktree add`):
#   sh scripts/sync-env-from-main.sh ../TaleGrove-my-feature
#
# Normally you don't call this directly for new worktrees: run
# `sh scripts/setup.sh` once per clone to install the post-checkout hook
# (see scripts/githooks/post-checkout), which then copies .env.local
# automatically on every `git worktree add`. This script is what the hook calls.
#
# Files synced (if present in main, missing here):
#   .env.local .env .env.development .env.development.local
#
# .env.local is the primary file (real local secrets); the rest are synced
# for convenience. Existing files are never overwritten.
#
# Note: .env* is gitignored, so `git worktree add` never carries it over.
# This script fills that gap. It is also called automatically by the
# post-checkout hook (see scripts/githooks/post-checkout).

set -eu

# Destination worktree: explicit path (fresh `git worktree add`) or current one.
DEST="${1:-}"
if [ -n "$DEST" ]; then
  # Normalize trailing slash (keep leading drive letters intact).
  case "$DEST" in
    */) DEST="$(printf '%s' "$DEST" | sed 's:/*$::')" ;;
  esac
  if [ ! -d "$DEST" ]; then
    echo "sync-env: destination worktree not found: $DEST" >&2
    exit 1
  fi
  # Resolve to an absolute path without requiring realpath/readlink -f.
  if [ -d "$DEST/.git" ] || [ -f "$DEST/.git" ]; then
    if ! TOPLEVEL="$(cd "$DEST" && pwd -P 2>/dev/null)"; then
      TOPLEVEL="$(cd "$DEST" && pwd)"
    fi
  else
    TOPLEVEL="$DEST"
  fi
else
  # Resolve current worktree top-level
  TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

# Resolve main worktree: first entry of `git worktree list` is always main.
# Probe from the destination when possible so this works right after
# `git worktree add <path>` regardless of the caller's CWD.
MAIN=""
if git -C "$TOPLEVEL" worktree list --porcelain >/dev/null 2>&1; then
  MAIN="$(git -C "$TOPLEVEL" worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p' | head -n 1)"
fi
if [ -z "${MAIN:-}" ]; then
  # Fallback: parent of the common .git dir.
  # e.g. common=/path/to/repo/.git -> main=/path/to/repo
  COMMON="$(git rev-parse --git-common-dir 2>/dev/null || echo ".git")"
  case "$COMMON" in
    /*|?:/*|?:\\*|\\\\*) ;;
    *) COMMON="$TOPLEVEL/$COMMON" ;;
  esac
  MAIN="$(dirname "$COMMON")"
fi

# Canonicalize both paths to git's own format so the main-worktree
# comparison works across shells (Git Bash pwd vs. `worktree list` paths).
CANONICAL="$(git -C "$TOPLEVEL" rev-parse --show-toplevel 2>/dev/null || printf '%s' "$TOPLEVEL")"
TOPLEVEL="$CANONICAL"
case "$MAIN" in
  */) MAIN="$(printf '%s' "$MAIN" | sed 's:/*$::')" ;;
esac

# If we ARE in the main worktree, there is nothing to copy from.
if [ "$TOPLEVEL" = "$MAIN" ]; then
  echo "sync-env: already in main worktree ($TOPLEVEL), nothing to copy."
  exit 0
fi

copied=0
skipped=0
for f in .env.local .env .env.development .env.development.local; do
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
