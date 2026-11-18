#!/usr/bin/env python3
"""ship.py: one command from the lab to a reviewed film. Replaces ~12 hand-run steps per version (usage audit, 2026-11-17).

    python tools/ship/ship.py films/<slug> v6                  # gates, render 60 fps, mux, review, contact sheet, phone copy
    python tools/ship/ship.py films/<slug> v6 --no-render      # re-mux and re-review an existing silent render
    python tools/ship/ship.py films/<slug> try1 --start 36.5 --end 41 --fps 30    # a quick span: gates, render, frames (no mux/review)

Prints a short summary only; every long log goes to films/<slug>/renders/logs/. The steps, in order, each stopping on failure:
  1. guards (check_guards.py, including G9: the master matches the timeline) and the lab gates (direction, bus, crash shot, smoke)
  2. render the lab to films/<slug>/renders/lab_silent/<name>_silent.mp4 (OUTSIDE the lab: ERR-0022)
  3. mux with films/<slug>/sound/out/master.wav (-c:v copy, AAC 192k, never -shortest) to films/<slug>/renders/<name>.mp4
  4. the auto-reviewer (quiet), then one tile of frames at every failure's time: films/<slug>/review/<name>_failures.png
  5. a contact sheet, one frame from the middle of each shot: story_reel_foundation/evidence/<name>_contact.png
  6. the Instagram file (compact, Meta's Reels spec, checked by ig_check.py): films/<slug>/renders/<name>_ig.mp4  <- the one to post
  7. a phone copy under 30 MB (540x960, for SendUserFile): films/<slug>/renders/<name>_phone.mp4
A pass here is not a good film: look at the contact sheet and the failures tile (CLAUDE.md rule 7).
"""
from __future__ import annotations

import argparse, json, re, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAB = ROOT / "story_reel_foundation" / "lab"
EVID = ROOT / "story_reel_foundation" / "evidence"
PY_REVIEW = ROOT / "tools" / "reelkit" / ".venv" / "Scripts" / "python.exe"
HF = ["npx", "--yes", "hyperframes@0.9.39"]


def run(cmd, cwd=ROOT, log=None, shell=False):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=shell)
    if log: log.write_text(r.stdout + "\n" + r.stderr, encoding="utf-8")
    return r


def step(name, ok, detail=""):
    print(f"{'ok  ' if ok else 'FAIL'}  {name}" + (f": {detail}" if detail else ""))
    if not ok: sys.exit(1)


def frames(video: Path, times, out: Path, width=270, cols=None):
    """one frame per time, tiled into one PNG (the order of the times, left to right, top to bottom)"""
    tmp = out.parent / (out.stem + "_tmp"); tmp.mkdir(parents=True, exist_ok=True)
    for i, t in enumerate(times):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, t):.3f}", "-i", str(video), "-frames:v", "1", "-vf", f"scale={width}:-2",
                        str(tmp / f"f_{i:03d}.png")], check=True)
    n = len(times); cols = cols or min(n, 12); rows = -(-n // cols)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp / "f_%03d.png"), "-vf", f"tile={cols}x{rows}", "-frames:v", "1", str(out)], check=True)
    for f in tmp.glob("*.png"): f.unlink()
    tmp.rmdir()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("film"); ap.add_argument("version")
    ap.add_argument("--name", default="part1_base", help="file prefix (default part1_base)")
    ap.add_argument("--fps", type=int, default=60); ap.add_argument("--start", type=float); ap.add_argument("--end", type=float)
    ap.add_argument("--no-render", action="store_true"); ap.add_argument("--skip-gates", action="store_true")
    ap.add_argument("--script", help="the part's films/<slug>/<part>_script.json: must pass scriptcheck before the render")
    ap.add_argument("--composition", default="index.html", help="the lab composition to render (default index.html = Part 1; part2.html = Part 2)")
    ap.add_argument("--master", help="the mixed master to mux (default <film>/<sound-dir>/out/master.wav)")
    ap.add_argument("--draft", action="store_true", help="a cheap draft below 50 fps (the user's choice): autoreview --draft")
    a = ap.parse_args()
    # a later part's plan, voice and sound follow its composition's number: part2.html -> direction_p2.js, timing_p2.js, voice_p2, sound_p2 (ROADMAP D19)
    m_ = re.match(r"part(\d+)\.html$", a.composition); suf = f"_p{m_.group(1)}" if m_ else ""
    direction, timing, voice_dir, sound_dir = f"direction{suf}.js", f"timing{suf}.js", f"voice{suf}", f"sound{suf}"
    film = (ROOT / a.film).resolve(); name = f"{a.name}_{a.version}"
    rd = film / "renders"; silent = rd / "lab_silent" / f"{name}_silent.mp4"; final = rd / f"{name}.mp4"; logs = rd / "logs"
    for d in (silent.parent, logs, film / "review", EVID): d.mkdir(parents=True, exist_ok=True)
    span = a.start is not None or a.end is not None

    # 0. the script gate (2026-11-18): the part's script must pass scriptcheck before anything is rendered
    if not a.skip_gates:
        if a.script:
            s = run([sys.executable, "tools/scriptcheck/scriptcheck.py", a.script], log=logs / f"{name}_scriptcheck.log")
            step("scriptcheck", s.returncode == 0, (s.stdout.strip().splitlines() or ["(no output)"])[-1])
        else:
            print("  WARN scriptcheck: no --script given; the part's script was not checked")

    # 1. guards and lab gates, quiet
    if not a.skip_gates:
        g = run([sys.executable, "tools/guards/check_guards.py"], log=logs / f"{name}_guards.log")
        step("guards", g.returncode == 0, "; ".join(l for l in g.stdout.splitlines() if l.startswith(("FAIL", "WARN"))) or "all pass")
        # each composition has its own lab gates (2026-11-18): Part 1's are about its bus and its crash shot; every later part runs
        # check_cast.mjs against its script's cast spec (heights by role, measured in the browser)
        gates = [["check_direction.mjs"], ["check_bus.mjs"], ["check_crash_shot.mjs"], ["check_smoke.mjs"]] if a.composition == "index.html" else []
        if a.composition != "index.html":   # the probe builds cast_p2.js; Part 1's actors are built in index.html, not measured yet
            if not a.script: step("check_cast.mjs", False, "a later part needs --script (the cast spec)")
            gates.append(["check_cast.mjs", "--script", str((ROOT / a.script).resolve())])
        for g_ in gates:
            chk = g_[0]
            r = run(["node", *g_], cwd=LAB, log=logs / f"{name}_{chk}.log")
            step(chk, r.returncode == 0, r.stdout.strip().splitlines()[-1] if r.returncode == 0 else r.stdout.strip()[-400:])

    # 2. render
    if not a.no_render:
        cmd = HF + ["render", "--fps", str(a.fps), "-o", str(silent)] + (["-c", a.composition] if a.composition != "index.html" else [])
        if a.start is not None: cmd += ["--start", str(a.start)]
        if a.end is not None: cmd += ["--end", str(a.end)]
        t0 = time.time(); r = run(" ".join(f'"{c}"' if " " in c else c for c in cmd), cwd=LAB, log=logs / f"{name}_render.log", shell=True)
        step("render", r.returncode == 0 and silent.exists(), f"{time.time() - t0:.0f} s -> {silent.relative_to(ROOT).as_posix()}" if r.returncode == 0
             else "see " + (logs / f"{name}_render.log").relative_to(ROOT).as_posix())
    else:
        step("render (reused)", silent.exists(), silent.relative_to(ROOT).as_posix())

    if span:   # a quick span: frames to look at, nothing else
        dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(silent)]).stdout or 0)
        out = film / "review" / f"{name}_span.png"; frames(silent, [dur * (i + 0.5) / 8 for i in range(8)], out, cols=8)
        step("span frames", True, out.relative_to(ROOT).as_posix()); return 0

    # 3. mux with the current master (G9 has checked it matches the timeline)
    master = Path(a.master).resolve() if a.master else film / sound_dir / "out" / "master.wav"
    step("master exists", master.exists(), master.relative_to(ROOT).as_posix() if master.is_relative_to(ROOT) else str(master))
    r = run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(master), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(final)])
    pr = run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate,duration", "-of", "csv=p=0", str(final)]).stdout.split()
    step("mux", r.returncode == 0, " | ".join(pr))

    # 4. the auto-reviewer, quiet; a tile of every failure's moments
    r = run([str(PY_REVIEW), "tools/autoreview/autoreview.py", a.film, "--video", str(final), "--quiet", "--direction", direction, "--timing", timing,
             "--voice-dir", voice_dir, "--sound-dir", sound_dir] + (["--draft"] if a.draft else []), log=logs / f"{name}_review.log")
    print(r.stdout.strip())
    rep = json.loads((film / "review" / "autoreview.json").read_text(encoding="utf-8"))
    times = []
    for c in rep["checks"]:
        if c["pass"]: continue
        times += [float(x) for x in re.findall(r"(\d+\.\d+)(?= s\b|\]|,)", str(c["value"])) if float(x) < 600][:6]
    if times:
        out = film / "review" / f"{name}_failures.png"; frames(final, sorted(set(times)), out); print(f"      failure frames, in time order: {out.relative_to(ROOT).as_posix()} at {sorted(set(times))}")

    # 5. contact sheet: the middle of every shot
    mids = [(s["t0"] + (rep["shots"][i + 1]["t0"] if i + 1 < len(rep["shots"]) else s["t0"] + 1.0)) / 2 for i, s in enumerate(rep["shots"])]
    cs = EVID / f"{name}_contact.png"; frames(final, mids, cs, width=180)
    print(f"ok    contact sheet ({len(mids)} shots): {cs.relative_to(ROOT).as_posix()}")

    # 6. the Instagram file: compact, Meta's Reels spec (docs/INSTAGRAM_SPECS.md), checked by ig_check.py. Encoded from the silent
    #    render + master.wav (one lossy step, not two). 112k AAC: ffmpeg's 128k lands at ~136 kbit/s, over Meta's 128 (2026-11-17)
    ig = rd / f"{name}_ig.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(master), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium",
         "-crf", "20", "-maxrate", "8M", "-bufsize", "16M", "-profile:v", "high", "-level:v", "4.2", "-pix_fmt", "yuv420p", "-g", str(2 * a.fps),
         "-x264-params", "open-gop=0", "-c:a", "aac", "-b:a", "112k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", str(ig)])
    r = run([sys.executable, str(ROOT / "tools" / "ship" / "ig_check.py"), str(ig)]); r_ig_ok = r.returncode == 0
    print(("ok    " if r.returncode == 0 else "FAIL  ") + r.stdout.strip().replace("\n", "\n      ") + f" -> {ig.relative_to(ROOT).as_posix()}")

    # 7. a phone copy under 30 MB (SendUserFile's limit; the Instagram file is ~33 MB)
    ph = rd / f"{name}_phone.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", str(final), "-vf", "scale=540:960", "-c:v", "libx264", "-crf", "26", "-preset", "medium", "-c:a", "aac", "-b:a", "128k", str(ph)])
    print(f"ok    phone copy {ph.stat().st_size / 1e6:.1f} MB: {ph.relative_to(ROOT).as_posix()}")
    print(f"VERDICT {rep['verdict']}, Instagram {'PASS' if r_ig_ok else 'FAIL'} ({name}); now LOOK at the contact sheet and the failure frames")
    return 0 if rep["verdict"] == "PASS" and r_ig_ok else 1


if __name__ == "__main__":
    sys.exit(main())
