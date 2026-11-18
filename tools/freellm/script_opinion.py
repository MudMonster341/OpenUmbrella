"""script_opinion.py - a second opinion on a story-reel script from free LLMs, in one command (2026-11-19).

    python tools/freellm/script_opinion.py films/<slug>/<part>_script.json [--context "series so far..."] [--providers ovh,llm7]

Builds one editor's prompt from the script JSON (every spoken line with its picture), sends it to each provider in turn through
freellm.py (keyless, no-logging providers only unless --allow-logging), and writes every answer to
films/<slug>/review/<part>_opinions.md with the provider, the model and the date.

It is an EXTRA opinion, never a gate (CLAUDE.md: script-critic judges). The prompt leaves the machine: the user must have agreed to send
this story (the user did for reel-03 Part 3 on 2026-11-19: "check it through multiple checks, are free llm apis"). Standard library only.
"""
import argparse, datetime, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASK = """Answer in under 350 words, plainly:
1. Rate the hook (the first line) out of 10 for stopping a scroll, and give 3 stronger first lines (max 7 words each).
2. Does the story make sense on a first watch? Name every plot hole a commenter would point out.
3. Is the twist surprising or predictable? Rate it out of 10.
4. Does the ending work? Does anything read as gore, suicide or self-harm (a problem on these platforms)?
5. The one concrete change that would improve it most."""


def build(path, context):
    d = json.load(open(path, encoding="utf-8"))
    out = ["You are a sharp short-form story editor (Instagram Reels, TikTok). Below is one episode of an animated story series."]
    if context: out.append("SERIES SO FAR: " + context)
    out.append("SCRIPT (each line is spoken; the picture is in brackets):")
    out += [f'{x["id"]}: "{x["say"]}"  [{x.get("picture", "")}]' for x in d["lines"]]
    out.append(ASK)
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("script"); ap.add_argument("--context", default=""); ap.add_argument("--context-file")
    ap.add_argument("--providers", default="ovh,llm7"); ap.add_argument("--allow-logging", action="store_true"); a = ap.parse_args()
    ctx = open(a.context_file, encoding="utf-8").read().strip() if a.context_file else a.context
    prompt = build(a.script, ctx)
    part = os.path.basename(a.script).replace("_script.json", "")
    rev = os.path.join(os.path.dirname(os.path.abspath(a.script)), "review"); os.makedirs(rev, exist_ok=True)
    tmp = os.path.join(rev, f".{part}_opinion_prompt.txt"); open(tmp, "w", encoding="utf-8").write(prompt)
    md = [f"# Free-LLM opinions on `{os.path.basename(a.script)}` ({datetime.date.today().isoformat()})", "",
          "An extra opinion, never a gate. Each answer is one model's read of the text alone (it cannot see the pictures).", ""]
    ok = 0
    for p in a.providers.split(","):
        cmd = [sys.executable, os.path.join(HERE, "freellm.py"), "--file", tmp, "--provider", p.strip(), "--max-tokens", "700"] + (["--allow-logging"] if a.allow_logging else [])
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=240)
        head = (r.stderr.strip().splitlines() or [""])[-1]
        md += [f"## {p.strip()}", "", f"_{head}_" if head else "", "", r.stdout.strip() or f"(no answer, exit {r.returncode})", ""]
        ok += bool(r.stdout.strip())
        print(f"{p.strip()}: {'answered' if r.stdout.strip() else 'FAILED'} {head}")
    dest = os.path.join(rev, f"{part}_opinions.md"); open(dest, "w", encoding="utf-8").write("\n".join(md)); os.remove(tmp)
    print(f"{ok} answers -> {dest}"); sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
