#!/usr/bin/env python3
"""usage_audit.py: where does our Claude usage go? Reads this project's local Claude Code transcripts and counts it.

    python tools/audit/usage_audit.py                 # every session of this project, main sessions and subagents
    python tools/audit/usage_audit.py --since 2026-11-16 --top 30

The user, 2026-11-17: "i want to see repeated tasks, analyze and then fix them so its all extremely organized and streamlined".
Deterministic, standard library only, reads files on this machine and sends nothing anywhere. Prints only command SHAPES
(the program and the script it runs), never arguments, so no story text reaches the report.

Measures, per tool-call shape: how often it ran, and how much text it fed back into the context (chars / 4 ~ tokens).
Per session: the API usage the transcript records (input, cache read, cache write, output tokens), de-duplicated by message id.
"""
from __future__ import annotations

import argparse, collections, json, re, sys
from pathlib import Path

PROJ = Path.home() / ".claude" / "projects" / "C--Users-Mustafa-Desktop-Mustafa-Projects-marketing-video-flow"
SCRIPT = re.compile(r"[\w./\\-]+\.(?:py|mjs|js|sh|ps1)\b")


def shape(name: str, inp: dict) -> str:
    """a call's shape: the tool, and for a shell the programs and scripts it ran (arguments dropped)"""
    if name in ("Bash", "PowerShell"):
        cmd = inp.get("command", "")
        cmd = re.sub(r"<<'?(\w+)'?.*?\n\1\b", "<<HEREDOC", cmd, flags=re.S)                         # a heredoc's body is data, not the command
        parts = []
        for seg in re.split(r"&&|\|\||;|\||\n", cmd):
            w = seg.strip().split()
            if not w or w[0] in ("cd", "echo", "export", "set", "mkdir", "D=", "for", "do", "done", "fi", "then", "if"): continue
            w = [x for x in w if "=" not in x or x.startswith("-")] or w
            prog = Path(w[0].strip("\"'")).name
            if prog in ("python", "python.exe", "node", "npx", "bash", "sh"):
                s = SCRIPT.search(seg); sub = Path(s.group(0)).name if s else (w[1] if len(w) > 1 else "")
                if prog == "npx": sub = next((x.split("@")[0] + " " + (w[i + 1] if i + 1 < len(w) else "") for i, x in enumerate(w) if x.startswith("hyperframes")), sub)
                prog = f"{prog} {sub}".strip()
            elif prog == "git" and len(w) > 1: prog = f"git {w[1]}"
            parts.append(prog)
        seen = list(dict.fromkeys(parts))
        return f"{name}: " + " + ".join(seen[:4]) if seen else f"{name}: (other)"
    if name == "Read":
        p = inp.get("file_path", "")
        ext = Path(p).suffix.lower()
        return "Read: image" if ext in (".png", ".jpg", ".jpeg", ".webp") else f"Read: {ext or '(none)'}"
    if name == "Agent": return f"Agent: {inp.get('subagent_type', 'general')}"
    if name in ("Edit", "Write", "Grep", "Glob"): return name
    return name.split("__")[-1] if name.startswith("mcp__") else name


def result_size(block) -> tuple[int, int]:
    """(chars of text, images) a tool result put into the context"""
    c = block.get("content")
    if isinstance(c, str): return len(c), 0
    chars = imgs = 0
    for x in c or []:
        if x.get("type") == "text": chars += len(x.get("text", ""))
        elif x.get("type") == "image": imgs += 1
    return chars, imgs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", default="")
    ap.add_argument("--top", type=int, default=25)
    a = ap.parse_args()
    files = sorted(PROJ.glob("*.jsonl")) + sorted(PROJ.glob("*/subagents/*.jsonl"))
    calls = collections.Counter(); out_chars = collections.Counter(); imgs = collections.Counter(); reads = collections.Counter()
    usage = collections.Counter(); per_day = collections.defaultdict(collections.Counter); sessions = 0; per_sess = []
    for f in files:
        pending, seen_msg, used = {}, set(), False
        n_api, peak, sread = 0, 0, 0
        for line in f.open(encoding="utf-8", errors="replace"):
            try: o = json.loads(line)
            except ValueError: continue
            ts = o.get("timestamp", "")
            if a.since and ts and ts[:10] < a.since: continue
            m = o.get("message")
            if not isinstance(m, dict): continue
            if o.get("type") == "assistant":
                mid = m.get("id")
                if mid and mid not in seen_msg and m.get("usage"):
                    seen_msg.add(mid); used = True; u = m["usage"]; n_api += 1; sread += u.get("cache_read_input_tokens") or 0
                    peak = max(peak, (u.get("input_tokens") or 0) + (u.get("cache_read_input_tokens") or 0) + (u.get("cache_creation_input_tokens") or 0))
                    for k in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens", "output_tokens"):
                        v = m["usage"].get(k) or 0; usage[k] += v; per_day[ts[:10]][k] += v
                for b in m.get("content") or []:
                    if isinstance(b, dict) and b.get("type") == "tool_use":
                        sh = shape(b.get("name", "?"), b.get("input") or {}); calls[sh] += 1; pending[b.get("id")] = sh
                        if b.get("name") == "Read": reads[Path((b.get("input") or {}).get("file_path", "")).name] += 1
            elif o.get("type") == "user" and isinstance(m.get("content"), list):
                for b in m["content"]:
                    if isinstance(b, dict) and b.get("type") == "tool_result" and b.get("tool_use_id") in pending:
                        ch, im = result_size(b); sh = pending.pop(b["tool_use_id"]); out_chars[sh] += ch; imgs[sh] += im
        sessions += used
        if n_api: per_sess.append((sread, n_api, peak, "subagent" if "subagents" in f.parts else "main"))
    tot_out = sum(out_chars.values())
    print(f"# Usage audit ({len(files)} transcripts, {sessions} with usage{', since ' + a.since if a.since else ''})\n")
    print("API tokens recorded: " + ", ".join(f"{k.replace('_input_tokens', '').replace('_tokens', '')} {v / 1e6:.1f}M" for k, v in usage.items()))
    print(f"Tool output fed back into the context: {tot_out / 4 / 1e6:.2f}M tokens (chars/4), {sum(imgs.values())} images\n")
    print("## By tool output (what fills the context)\n\n| Calls | ~k tokens back | Images | Shape |\n|---|---|---|---|")
    for sh, ch in out_chars.most_common(a.top): print(f"| {calls[sh]} | {ch / 4000:.0f} | {imgs[sh]} | `{sh}` |")
    print("\n## By how often it ran (repeated chores)\n\n| Calls | ~k tokens back | Shape |\n|---|---|---|")
    for sh, n in calls.most_common(a.top): print(f"| {n} | {out_chars[sh] / 4000:.0f} | `{sh}` |")
    print("\n## Files read most often\n\n| Reads | File |\n|---|---|")
    for fn, n in reads.most_common(15):
        fn = re.sub(r"reel-\d\d-[\w-]+", "<film>", fn)
        print(f"| {n} | `{fn}` |")
    per_sess.sort(reverse=True); n_all = sum(x[1] for x in per_sess); cr = max(1, usage["cache_read_input_tokens"])
    print(f"\n## Sessions by cache read (every API call re-reads the whole context)\n\n{n_all} API calls in all; mean context per call {cr / max(1, n_all) / 1000:.0f}k tokens.\n")
    print("| Cache read (M) | API calls | Peak context (k) | Mean per call (k) | Kind |\n|---|---|---|---|---|")
    for sr, n, pk, kind in per_sess[:12]: print(f"| {sr / 1e6:.1f} | {n} | {pk / 1000:.0f} | {sr / n / 1000:.0f} | {kind} |")
    print(f"\nThe 5 largest sessions: {100 * sum(x[0] for x in per_sess[:5]) / cr:.0f}% of all cache reads. "
          f"Subagents: {100 * sum(x[0] for x in per_sess if x[3] == 'subagent') / cr:.0f}% ({sum(1 for x in per_sess if x[3] == 'subagent')} runs).")
    print("\n## Per day (millions of tokens)\n\n| Day | Input | Cache read | Cache write | Output |\n|---|---|---|---|---|")
    for d in sorted(per_day):
        u = per_day[d]; print(f"| {d} | {u['input_tokens'] / 1e6:.2f} | {u['cache_read_input_tokens'] / 1e6:.1f} | {u['cache_creation_input_tokens'] / 1e6:.2f} | {u['output_tokens'] / 1e6:.2f} |")
    return 0


if __name__ == "__main__":
    sys.exit(main())
