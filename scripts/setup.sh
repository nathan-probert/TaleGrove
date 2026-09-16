#!/bin/sh
# Project setup: install git hooks, sync .env.local from the main worktree,
# and install dependencies.
#
# Run once per clone, and re-run inside any fresh worktree if .env.local
# is missing:
#   sh scripts/setup.sh
#   npm run setup
#
# What it does:
#   1. Installs scripts/githooks/post-checkout into the repo's shared hooks
#      dir, so every future `git worktree add` automatically copies
#      .env.local (never overwrites) from the main worktree.
#   2. Copies .env.local (plus other .env* files if missing) from the main
#      worktree into this one via scripts/sync-env-from-main.sh.
#   3. Runs `npm install` (skip with --skip-install) so the worktree is ready.
#
# Safe to run repeatedly. Never overwrites existing .env* files.

set -eu

SKIP_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=1 ;;
    -h|--help)
      echo "Usage: sh scripts/setup.sh [--skip-install]"
      exit 0
      ;;
    *)
      echo "setup: unknown option: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

# Always operate from the repo/worktree root (this script lives in scripts/).
cd "$(dirname "$0")/.."

# 1. Install the post-checkout hook into the shared hooks dir so it applies
#    to all current and future worktrees of this repo.
HOOK_SRC="scripts/githooks/post-checkout"
HOOK_DEST="$(git rev-parse --git-path hooks 2>/dev/null || echo ".git/hooks")/post-checkout"
if [ -f "$HOOK_SRC" ]; then
  mkdir -p "$(dirname "$HOOK_DEST")"
  if [ ! -f "$HOOK_DEST" ] || ! cmp -s "$HOOK_SRC" "$HOOK_DEST"; then
    cp "$HOOK_SRC" "$HOOK_DEST"
    chmod +x "$HOOK_DEST" 2>/dev/null || true
    echo "setup: installed post-checkout hook -> $HOOK_DEST"
    echo "setup: new worktrees will now auto-copy .env.local on 'git worktree add'."
  else
    echo "setup: post-checkout hook already installed."
  fi
else
  echo "setup: warning: hook source not found: $HOOK_SRC" >&2
fi

# 2. Sync .env.local from the main worktree (no-op when already in main or
#    when files already exist here).
if [ -f "scripts/sync-env-from-main.sh" ]; then
  sh scripts/sync-env-from-main.sh || true
fi

# 3. Install dependencies.
if [ "$SKIP_INSTALL" -eq 1 ]; then
  echo "setup: skipping npm install (--skip-install)."
else
  if command -v npm >/dev/null 2>&1; then
    echo "setup: running npm install..."
    npm install
  else
    echo "setup: warning: npm not found, skipping dependency install." >&2
  fi
fi

echo "setup: done."
