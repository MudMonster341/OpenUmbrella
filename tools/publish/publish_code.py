#!/usr/bin/env python3
"""publish_code.py — push our CODE to GitHub and keep every story on this machine.

    python tools/publish/publish_code.py --dry-run     # show what would be published, scan it, change nothing
    python tools/publish/publish_code.py               # build the public snapshot, scan it, push it, verify the remote

Why (2026-11-16): the GitHub repo is PUBLIC. The user: "push code, keep story local", "make sure we don't upload our reels".
Local commits hold scripts, narration text and plot. They never leave: this script builds a separate public history.

How:
- It takes the committed tree of HEAD (uncommitted work is never published).
- It removes every path listed in `private_paths.txt`: the films, the story docs, the direction, the timings.
- Files listed in `frozen_paths.txt` mix story with project notes (MEMORY, CONTEXT, …). They keep their last PUBLIC version, so
  they never update on GitHub and never leak.
- **Hard checks.** Any one stops the push:
  - every file is scanned for the story words in `story_markers.txt`;
  - media files (video, audio, images under evidence/) are blocked;
  - no file may be over 5 MB.
- It commits the snapshot onto the public branch (`code-only` on origin) with the source commit's id. It pushes without `--force`,
  then reads the remote back to confirm it holds exactly what was pushed.

Exit codes: 0 published or nothing to publish · 1 a check failed (nothing pushed) · 2 git or push error.
"""
from __future__ import annotations

import argparse, os, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
BRANCH = "code-only"
REMOTE = "origin"
MEDIA = re.compile(r"\.(mp4|mov|webm|wav|mp3|m4a|aac|flac|ogg|glb|gltf|blend|psd)$", re.I)
MAX_BYTES = 5 * 1024 * 1024


def git(*args, env=None, check=True, inp=None):
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, env=env, input=inp, encoding="utf-8", errors="replace")
    if check and r.returncode:
        sys.exit(f"git {' '.join(args)} failed:\n{r.stderr.strip()}")
    return r.stdout.strip()


def lines(name):
    return [l.strip() for l in (HERE / name).read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--check-staged", action="store_true", help="pre-commit: scan the staged public files for story words; push nothing")
    a = ap.parse_args()
    private, frozen, markers = lines("private_paths.txt"), lines("frozen_paths.txt"), lines("story_markers.txt")
    if a.check_staged:                                     # caught at commit, not at publish (it blocked publishing twice on 2026-11-17)
        under = lambda f, ps: any(f == q.rstrip("/") or f.startswith(q.rstrip("/") + "/") for q in ps)
        staged = [f for f in git("diff", "--cached", "--name-only", "--diff-filter=ACMR").splitlines() if f and not under(f, private + frozen)]
        if not staged: return 0
        pat = "|".join(f"(?:{m})" for m in markers)
        hits = git("grep", "--cached", "-I", "-n", "-i", "-P", pat, "--", *staged, check=False)
        if hits:
            print("pre-commit: story words in files that will be PUBLISHED (name roles, not characters; or add the path to private_paths.txt):")
            for h in hits.splitlines()[:20]: print("  " + h[:160])
            return 1
        return 0
    g = subprocess.run([sys.executable, str(ROOT / "tools" / "guards" / "check_guards.py")], cwd=ROOT, capture_output=True, text=True)
    print(g.stdout.strip())
    if g.returncode:                                       # a guard failed: an unapproved model, a missing hook, a broken reviewer
        print("BLOCKED by the guards: nothing pushed"); sys.exit(1)
    git("fetch", "-q", REMOTE)
    has_public = git("rev-parse", "--verify", "-q", f"{REMOTE}/{BRANCH}", check=False)
    parent = has_public or git("rev-parse", f"{REMOTE}/main")
    src = git("rev-parse", "HEAD")
    if git("status", "--porcelain", "--untracked-files=no"):
        print("note: uncommitted changes exist; only COMMITTED work is published")

    env = dict(os.environ, GIT_INDEX_FILE=str(Path(tempfile.gettempdir()) / "publish_code.index"))
    git("read-tree", src, env=env)
    for p in private:
        git("rm", "-r", "--cached", "-q", "--ignore-unmatch", "--", p, env=env)
    for p in frozen:                                       # back to the last public version, or out if it was never public
        git("rm", "-r", "--cached", "-q", "--ignore-unmatch", "--", p, env=env)
        entry = git("ls-tree", parent, "--", p)
        if entry:
            mode, _, rest = entry.partition(" "); typ, _, rest = rest.partition(" "); sha, _, path = rest.partition("\t")
            git("update-index", "--add", "--cacheinfo", f"{mode},{sha},{path}", env=env)
    tree = git("write-tree", env=env)

    # ---- hard checks on the exact tree that would be pushed
    files = git("ls-tree", "-r", "-l", tree).splitlines()
    fails = []
    for f in files:
        meta, path = f.split("\t", 1); size = meta.split()[-1]
        if MEDIA.search(path) or re.search(r"(^|/)(evidence|frames[^/]*|renders|snaps[^/]*)/", path, re.I):   # frames of our films are reels too
            fails.append(f"media file: {path}")
        if size != "-" and int(size) > MAX_BYTES:
            fails.append(f"over 5 MB: {path} ({int(size) // 1024} KB)")
    pat = "|".join(f"(?:{m})" for m in markers)
    hits = git("grep", "-I", "-n", "-i", "-P", pat, tree, check=False)
    for h in hits.splitlines():
        fails.append("story words: " + h.split(":", 1)[1][:150])
    changed = git("diff", "--name-status", parent, tree)
    print(f"source {src[:9]} -> public tree {tree[:9]} on {REMOTE}/{BRANCH} (parent {parent[:9]}); {len(files)} files")
    print("changes against the public branch:\n" + ("\n".join("  " + c for c in changed.splitlines()) or "  none"))
    if fails:
        print(f"\nBLOCKED: {len(fails)} problem(s); nothing pushed")
        for f in fails[:40]: print("  " + f)
        sys.exit(1)
    print("checks: no story words, no media, nothing over 5 MB")
    if git("rev-parse", f"{parent}^{{tree}}") == tree:
        print("nothing new to publish"); return 0
    if a.dry_run:
        print("dry run: nothing committed or pushed"); return 0

    subjects = git("log", "--format=- %s", f"{parent}..{src}", check=False) if has_public else git("log", "--format=- %s", "-15", src)
    msg = (f"publish: code from {src[:9]}\n\nCode only. Stories, scripts, narration text and reels stay local "
           f"(tools/publish/publish_code.py).\n\nSource commits:\n{subjects[:3000]}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n")
    commit = git("commit-tree", tree, "-p", parent, inp=msg)
    git("update-ref", f"refs/heads/{BRANCH}", commit)
    r = subprocess.run(["git", "push", REMOTE, f"{commit}:refs/heads/{BRANCH}"], cwd=ROOT, capture_output=True, text=True)
    if r.returncode:
        print(f"push failed (nothing forced):\n{r.stderr.strip()}"); sys.exit(2)
    remote = git("ls-remote", REMOTE, f"refs/heads/{BRANCH}").split("\t")[0]
    if remote != commit:
        print(f"push reported success but the remote holds {remote[:9]}, not {commit[:9]}"); sys.exit(2)
    print(f"pushed {commit[:9]} to {REMOTE}/{BRANCH}; the remote confirms it")
    return 0


if __name__ == "__main__":
    sys.exit(main())
