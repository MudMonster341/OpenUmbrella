#!/usr/bin/env python3
"""check_guards.py — deterministic guards against mistakes we have already made once. Standard library only.

    python tools/guards/check_guards.py          # exit 1 if any guard fails; warnings print but do not fail

The user, 2026-11-16: "add in hardcoded deterministic checks to check for these, we cannot make the mistakes again and again".

G1  No code of ours loads a model by NAME or downloads one (ERR-0016: WhisperModel("small") pulled 464 MB nobody approved).
    Models load only from a local path found by a helper such as tools/reelkit/align.find_model().
G2  Every model in the caches on this machine is on tools/guards/approved_models.txt (unknown = FAIL, pending = WARN).
G3  No working branch can reach GitHub: the pre-push hook is installed and refuses everything but code-only (rule 10).
G4  The auto-reviewer's self-tests pass (tools/autoreview/selftest.py): its checks measure what they claim to (ERR-0017's
    sibling: the first reviewer measured today's stems instead of the video, and peaks instead of loudness).

Runs before every publish (tools/publish/publish_code.py) and can run any time.
"""
from __future__ import annotations

import os, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SKIP = re.compile(r"(^|[\\/])(external_tools|node_modules|\.venv|research|\.git|__pycache__)([\\/]|$)")
# model loading by name, or a download, in Python or JS
LOAD_BY_NAME = [
    (r"WhisperModel\(\s*[\"'](tiny|base|small|medium|large|distil)[^\"']*[\"']", "WhisperModel with a model NAME (downloads it)"),
    (r"\.from_pretrained\(\s*[\"'][\w.-]+/[\w.-]+[\"']", "from_pretrained with a hub id (downloads it)"),
    (r"\b(hf_hub_download|snapshot_download)\s*\(", "a Hugging Face download call"),
    (r"torch\.hub\.load\(", "torch.hub.load (downloads)"),
    (r"(urlretrieve|requests\.get|fetch)\([^)]*\.(bin|onnx|pt|pth|safetensors|ckpt|gguf)\b", "a direct model-file download"),
    (r"\bpipeline\(\s*[\"'][\w-]+[\"']\s*\)", "a transformers pipeline with no local model (downloads one)"),
]
results = []


def res(gid, ok, msg, warn=False):
    results.append((gid, "PASS" if ok else ("WARN" if warn else "FAIL"), msg))


def g1():
    hits = []
    for p in ROOT.rglob("*"):
        if p.suffix not in (".py", ".js", ".mjs", ".ts", ".html") or SKIP.search(str(p.relative_to(ROOT))) or p == Path(__file__):
            continue
        try: text = p.read_text(encoding="utf-8", errors="replace")
        except OSError: continue
        for pat, why in LOAD_BY_NAME:
            for m in re.finditer(pat, text):
                line = text.count("\n", 0, m.start()) + 1
                hits.append(f"{p.relative_to(ROOT)}:{line}: {why}")
    res("G1", not hits, "; ".join(hits[:6]) or "no code loads a model by name or downloads one")


def g2():
    approved = {}
    for l in (HERE / "approved_models.txt").read_text(encoding="utf-8").splitlines():
        if l.strip() and not l.startswith("#"):
            name, status, *_ = [x.strip() for x in l.split("|")]
            approved[name] = status
    caches = [Path(os.path.expanduser("~/.cache/huggingface/hub")), Path(os.path.expandvars(r"%LOCALAPPDATA%\OmniVoice\hf_cache"))]
    unknown, pending = [], []
    for c in caches:
        if not c.is_dir(): continue
        for d in c.iterdir():
            if not d.name.startswith("models--"): continue
            st = approved.get(d.name)
            if st is None: unknown.append(f"{d.name} in {c}")
            elif st == "pending": pending.append(d.name)
    if unknown: res("G2", False, "NOT APPROVED: " + "; ".join(unknown))
    elif pending: res("G2", False, "awaiting the user's decision: " + "; ".join(pending), warn=True)
    else: res("G2", True, "every cached model is approved")


def g3():
    hook = ROOT / ".git" / "hooks" / "pre-push"
    ok = hook.is_file() and "refs/heads/code-only" in hook.read_text(encoding="utf-8", errors="replace")
    res("G3", ok, "pre-push hook installed (only code-only reaches GitHub)" if ok else "pre-push hook MISSING: run sh scripts/install_hooks.sh")


def g4():
    py = ROOT / "tools" / "reelkit" / ".venv" / "Scripts" / "python.exe"
    st = ROOT / "tools" / "autoreview" / "selftest.py"
    if not st.exists(): res("G4", False, "tools/autoreview/selftest.py is missing"); return
    r = subprocess.run([str(py if py.exists() else sys.executable), str(st)], cwd=ROOT, capture_output=True, text=True)
    last = (r.stdout.strip().splitlines() or ["(no output)"])[-1]
    res("G4", r.returncode == 0, last if r.returncode == 0 else r.stdout.strip()[-600:] + r.stderr.strip()[-300:])


def main():
    g1(); g2(); g3(); g4()
    for gid, st, msg in results:
        print(f"{st}  {gid}  {msg}")
    fails = [r for r in results if r[1] == "FAIL"]
    print("GUARDS " + ("PASS" if not fails else f"FAIL ({len(fails)})"))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
