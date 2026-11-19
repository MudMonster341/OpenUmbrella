#!/usr/bin/env bash
# checkpoint.sh — end-of-work-chunk commit and push.
#
# Part of the `project-memory` discipline. Run this AFTER you have:
#   1. appended a dated entry to MEMORY.md
#   2. added any new ADRs under decisions/
#   3. appended any new ERRORS.md entries
#   4. refreshed CONTEXT.md if the current state changed
#
# This script does step 5: stage, commit with a conventional-commit message, push.
#
# It FAILS LOUDLY (non-zero exit + explicit message) when it cannot push — no remote, no
# upstream, detached HEAD, missing credentials, rejected push. The local commit is made first,
# so a failed push never loses work.
#
# It NEVER uses --force or --no-verify. If a hook rejects the commit, fix the hook's complaint.
#
# Usage:
#   scripts/checkpoint.sh "summary of this work chunk"
#   scripts/checkpoint.sh -t feat -s eval "add paired bootstrap"
#
# Options:
#   -t TYPE   conventional-commit type (default: chore)
#   -s SCOPE  conventional-commit scope (default: checkpoint)
#   -d        docs-only: stage only CONTEXT.md, MEMORY.md, ERRORS.md, decisions/
#   -n        dry run: show what would happen, change nothing
#   -M        skip the MEMORY.md discipline check (use only when genuinely warranted)
#   -h        this help
#
# Exit codes: 0 ok · 1 usage/not a repo · 2 MEMORY.md check failed · 3 cannot push
#             4 commit failed · 5 push failed

set -euo pipefail

TYPE="chore"
SCOPE="checkpoint"
DOCS_ONLY=0
DRY_RUN=0
SKIP_MEMORY_CHECK=0

die() { printf '\n=== CHECKPOINT FAILED ===\n%s\n\n' "$1" >&2; exit "${2:-1}"; }
say() { printf '%s\n' "$1"; }

usage() { sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while getopts ":t:s:dnMh" opt; do
  case "$opt" in
    t) TYPE="$OPTARG" ;;
    s) SCOPE="$OPTARG" ;;
    d) DOCS_ONLY=1 ;;
    n) DRY_RUN=1 ;;
    M) SKIP_MEMORY_CHECK=1 ;;
    h) usage 0 ;;
    :) die "option -$OPTARG needs a value" 1 ;;
    \?) die "unknown option -$OPTARG (try -h)" 1 ;;
  esac
done
shift $((OPTIND - 1))

SUMMARY="${*:-}"
[ -n "$SUMMARY" ] || die "No summary given.

  Usage: scripts/checkpoint.sh \"summary of this work chunk\"

  The summary becomes the commit subject. Describe the chunk, not the files." 1

# --- repo -------------------------------------------------------------------
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || die "Not inside a git repository.

  Run this from within the project. If the project is not a git repo yet, initialise it and
  add a remote first — a checkpoint that cannot be pushed is not a checkpoint." 1

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

HAS_HEAD=0
git rev-parse --verify --quiet HEAD >/dev/null && HAS_HEAD=1

# --- MEMORY.md discipline check --------------------------------------------
if [ "$SKIP_MEMORY_CHECK" -eq 0 ]; then
  TODAY="$(date +%F)"
  [ -f MEMORY.md ] || die "MEMORY.md not found at $ROOT.

  This project has not been bootstrapped for project-memory. Create CONTEXT.md, MEMORY.md,
  ERRORS.md and decisions/ first, or re-run with -M to skip this check." 2

  grep -q "^## ${TODAY}" MEMORY.md || die "MEMORY.md has no entry dated ${TODAY}.

  A checkpoint without a memory entry is just a commit. Append an entry beginning:

      ## ${TODAY} — <short title of this work chunk>

  Then re-run. To checkpoint anyway, re-run with -M." 2

  # --porcelain, not `git diff HEAD`: an untracked MEMORY.md does not appear in a diff.
  if [ "$HAS_HEAD" -eq 1 ] && [ -z "$(git status --porcelain -- MEMORY.md)" ]; then
    die "MEMORY.md is unchanged since the last commit.

  Today's entry was already committed; this work chunk has no entry of its own. Append a new
  dated entry for it, or re-run with -M." 2
  fi
fi

# --- what to stage ----------------------------------------------------------
if [ "$DOCS_ONLY" -eq 1 ]; then
  PATHSPEC=(-- CONTEXT.md MEMORY.md ERRORS.md decisions)
else
  PATHSPEC=(-- .)
fi

# --- push target, checked BEFORE committing so the failure is predictable ----
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
PUSH_BLOCKER=""
REMOTE=""
UPSTREAM=""

if [ "$BRANCH" = "HEAD" ]; then
  PUSH_BLOCKER="HEAD is detached — there is no branch to push.
  Check out a branch (git switch -c <name>) and re-run."
elif [ -z "$(git remote)" ]; then
  PUSH_BLOCKER="This repository has no git remote.
  Add one, then re-run:

      git remote add origin https://github.com/<user>/<repo>.git"
else
  UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" 2>/dev/null || true)"
  if [ -n "$UPSTREAM" ]; then
    REMOTE="${UPSTREAM%%/*}"
  elif git remote | grep -qx origin; then
    REMOTE="origin"
  else
    REMOTE="$(git remote | head -n 1)"
  fi
fi

# --- stage ------------------------------------------------------------------
if [ "$DRY_RUN" -eq 1 ]; then
  say "[dry run] would stage:"
  git status --short "${PATHSPEC[@]}"
  say "[dry run] would commit: ${TYPE}(${SCOPE}): ${SUMMARY}"
  say "[dry run] would push to: ${REMOTE:-<none>} ${BRANCH}"
  [ -n "$PUSH_BLOCKER" ] && say "[dry run] push would FAIL: ${PUSH_BLOCKER}"
  exit 0
fi

git add -A "${PATHSPEC[@]}"

# --- commit -----------------------------------------------------------------
SUBJECT="${TYPE}(${SCOPE}): ${SUMMARY}"
[ "${#SUBJECT}" -le 72 ] || say "warning: commit subject is ${#SUBJECT} chars (>72). Consider a shorter summary."

if git diff --cached --quiet; then
  if [ "$HAS_HEAD" -eq 0 ]; then
    die "Nothing staged and no commits yet — there is nothing to checkpoint." 1
  fi
  say "Nothing staged; skipping commit."
else
  # No --no-verify: hooks are part of the project's quality gate.
  git commit -m "$SUBJECT" || die "git commit failed.

  Nothing has been pushed. If a pre-commit hook rejected this, fix what it reported and re-run.
  Do not bypass hooks with --no-verify." 4
  say "Committed: $SUBJECT"
fi

# --- push -------------------------------------------------------------------
# NEVER `git push` this branch: the GitHub repo is public and local commits hold our stories (scripts, narration, plot).
# Code goes out only through tools/publish/publish_code.py, which strips every story path, scans for story words and media,
# pushes a separate public branch (origin/code-only) and verifies the remote. (The user, 2026-11-16: "push code, keep story local".)
python tools/publish/publish_code.py
rc=$?
case $rc in
  0) say "Checkpoint complete: committed locally; code published to origin/code-only." ;;
  1) die "Committed locally, but the publish checks BLOCKED the push (story words, media or a large file in the code tree).
  Read the list above, add the path to tools/publish/private_paths.txt or remove the words, commit, and re-run." 6 ;;
  *) die "Committed locally, but the push failed. Your work is safe in the local commit. See the error above." 5 ;;
esac
