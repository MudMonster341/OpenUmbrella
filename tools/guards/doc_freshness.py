#!/usr/bin/env python3
"""doc_freshness.py — are the memory docs behind the work? Prints a reminder only when they are; silent otherwise.

Run by the project hooks on SessionStart and UserPromptSubmit (.claude/settings.json), so the reminder lands in the
agent's context at intervals. The user, 2026-11-16: "update our docs, make sure they aren't stale, add in a hook that
reminds to update at specific intervals". Deterministic: it reads git history only. Standard library only.

A doc is stale when 6 or more commits have landed since it last changed, or 4 hours have passed with new commits since.
"""
import subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ["MEMORY.md", "CONTEXT.md", "ROADMAP.md"]
MAX_COMMITS, MAX_HOURS = 6, 4


def git(*a):
    r = subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""


def main():
    stale = []
    for d in DOCS:
        last = git("log", "-1", "--format=%H %ct", "--", d)
        if not last: continue
        sha, ts = last.split()
        behind = int(git("rev-list", "--count", f"{sha}..HEAD") or 0)
        hours = (time.time() - int(ts)) / 3600
        if behind >= MAX_COMMITS or (behind > 0 and hours >= MAX_HOURS):
            stale.append(f"{d} ({behind} commits, {hours:.1f} h behind)")
    if stale:
        print("DOCS ARE STALE - update before more work piles up (project-memory routine; CLAUDE.md rule 6): "
              + "; ".join(stale) + ". Add a dated MEMORY.md entry, refresh CONTEXT.md 'Where it stands', and ROADMAP rows with evidence.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
