#!/usr/bin/env python3
"""context_size.py: warn when this session's context is so large that every step costs a fortune. Silent otherwise.

Run by the UserPromptSubmit hook (.claude/settings.json): the hook passes JSON on stdin with the session's transcript_path;
this reads the last recorded API usage from the end of that file. Standard library only; never blocks (always exits 0).

Why (usage audit, 2026-11-17, tools/audit/usage_audit.py): every tool call re-reads the whole context. One session made 862 calls
at a mean of 514k tokens each = 443M tokens, half of the project's usage to date; the five longest sessions were 85%. The same
step in a fresh 40k session costs ~12x less. So: finish the step, write HANDOFF, start a new session.
"""
import json, sys
from pathlib import Path

WARN_AT, LOUD_AT = 200_000, 400_000


def last_context(path: Path) -> int:
    with path.open("rb") as f:
        f.seek(0, 2); size = f.tell(); f.seek(max(0, size - 400_000))
        tail = f.read().decode("utf-8", errors="replace").splitlines()
    for line in reversed(tail):
        try: o = json.loads(line)
        except ValueError: continue
        u = (o.get("message") or {}).get("usage") if isinstance(o.get("message"), dict) else None
        if o.get("type") == "assistant" and u:
            return sum(u.get(k) or 0 for k in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
    return 0


def main():
    try:
        data = json.loads(sys.stdin.read() or "{}")
        p = Path(data.get("transcript_path", ""))
        n = last_context(p) if p.is_file() else 0
    except Exception:
        return 0
    if n >= LOUD_AT:
        print(f"CONTEXT IS {n // 1000}k TOKENS: every tool call now re-reads ~{n // 1000}k (usage audit 2026-11-17). Finish the current step, "
              "update films/<slug>/HANDOFF.md, commit, and tell the user to continue in a NEW session. Batch remaining work into one script call.")
    elif n >= WARN_AT:
        print(f"Context is {n // 1000}k tokens (each call re-reads it). Prefer one script over many small calls; at a milestone, hand off to a new session.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
