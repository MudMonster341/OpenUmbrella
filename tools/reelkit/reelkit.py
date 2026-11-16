#!/usr/bin/env python3
"""reelkit — pull a reference reel apart so we can learn its structure.

In-house, stdlib only. External needs: yt-dlp (this tool's own venv) and FFmpeg.
Sibling of tools/filmcheck: filmcheck judges OUR renders against GOAL.md, reelkit
reads SOMEONE ELSE'S video and reports how it is built.

    python tools/reelkit/reelkit.py ingest <url> [--slug NAME] [--note "..."]
    python tools/reelkit/reelkit.py analyse <file.mp4> [--slug NAME]

Everything lands in research/reels/<slug>/, which is GITIGNORED on purpose:
the video is someone else's copyrighted work. We study structure and never ship
their frames, their script or their timings. See CLAUDE.md rule 2.

What it measures, and why each one earns its place:

  shots       scene-change detection -> a shot list with durations. This is the
              pacing data. "How long is a shot in a good reel" stops being a
              guess the moment you have the numbers.
  hook        the first 3 seconds, sampled every 0.25s. Short-form lives or dies
              here, so it gets its own dense strip rather than one frame.
  energy      per-second mean luma and frame-to-frame difference. The shape of
              this curve is the edit's rhythm.
  specs       ffprobe: resolution, fps, duration, codecs, bitrate.

It deliberately does NOT try to judge the reel. A number is evidence; the read
is yours, and it goes in REVIEW.md.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REELS = ROOT / "research" / "reels"
VENV_PY = Path(__file__).resolve().parent / ".venv" / "Scripts" / "python.exe"
if not VENV_PY.exists():  # posix layout
    VENV_PY = Path(__file__).resolve().parent / ".venv" / "bin" / "python"

# ERR-0003: a winget FFmpeg is invisible to shells started before the install.
WINGET_FFMPEG = (
    Path(os.environ.get("LOCALAPPDATA", ""))
    / "Microsoft/WinGet/Packages"
    / "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    / "ffmpeg-9.0.2-full_build/bin"
)


def tool(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    candidate = WINGET_FFMPEG / f"{name}.exe"
    if candidate.exists():
        return str(candidate)
    sys.exit(f"reelkit: {name} not found on PATH. See ERRORS.md ERR-0003.")


def run(cmd: list[str], timeout: int = 900) -> str:
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                       encoding="utf-8", errors="replace")
    return (p.stdout or "") + (p.stderr or "")


def slugify(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return (s or "reel")[:60]


# --------------------------------------------------------------- download

def download(url: str, dest: Path) -> tuple[Path, dict]:
    """Fetch the video and its metadata. Returns (file, info)."""
    if not VENV_PY.exists():
        sys.exit(f"reelkit: venv python missing at {VENV_PY}\n"
                 f"  python -m venv tools/reelkit/.venv && "
                 f"tools/reelkit/.venv/Scripts/python.exe -m pip install yt-dlp")
    dest.mkdir(parents=True, exist_ok=True)
    info_path = dest / "source.info.json"
    out = run([
        str(VENV_PY), "-m", "yt_dlp",
        "-f", "mp4/bestvideo[ext=mp4]+bestaudio/best",
        "--merge-output-format", "mp4",
        "--write-info-json",
        "--no-warnings",
        "-o", str(dest / "source.%(ext)s"),
        url,
    ])

    # ERR-0004 discipline: trust the FILE, never the exit code.
    videos = sorted(
        [p for p in dest.iterdir() if p.suffix.lower() in {".mp4", ".mkv", ".webm", ".mov"}],
        key=lambda p: p.stat().st_size, reverse=True,
    )
    if not videos:
        print(out[-2500:], file=sys.stderr)
        sys.exit("\nreelkit: no video file was produced. The log above is the reason.\n"
                 "Common causes: the post is private or login-walled, or the extractor\n"
                 "broke after a platform change (yt-dlp marks instagram:user BROKEN).")

    info = {}
    for cand in (info_path, dest / "source.info.json"):
        if cand.exists():
            info = json.loads(cand.read_text(encoding="utf-8"))
            break
    return videos[0], info


# --------------------------------------------------------------- measure

def specs(video: Path) -> dict:
    ffprobe = tool("ffprobe")
    out = run([ffprobe, "-v", "error", "-show_streams", "-show_format",
               "-of", "json", str(video)])
    d = json.loads(out)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), {})
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    num, _, den = (v.get("r_frame_rate") or "0/1").partition("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 0.0
    return {
        "width": v.get("width"), "height": v.get("height"),
        "fps": round(fps, 3),
        "duration_s": round(float(d["format"].get("duration", 0)), 2),
        "video_codec": v.get("codec_name"),
        "audio_codec": a.get("codec_name") if a else None,
        "has_audio": a is not None,
        "bitrate_kbps": round(int(d["format"].get("bit_rate", 0)) / 1000) or None,
        "vertical": bool(v.get("height") and v.get("width")
                         and v["height"] > v["width"]),
    }


def shots(video: Path, threshold: float = 0.25) -> list[dict]:
    """Scene-change detection -> the shot list. This is the pacing evidence."""
    ffmpeg = tool("ffmpeg")
    out = run([ffmpeg, "-i", str(video), "-vf",
               f"select='gt(scene,{threshold})',metadata=print", "-f", "null", "-"])
    cuts = [round(float(m.group(1)), 3)
            for m in re.finditer(r"pts_time:([\d.]+)", out)]
    dur = specs(video)["duration_s"]
    bounds = [0.0] + cuts + [dur]
    shot_list = []
    for i in range(len(bounds) - 1):
        start, end = bounds[i], bounds[i + 1]
        if end - start < 0.08:      # ignore detector chatter
            continue
        shot_list.append({"index": len(shot_list) + 1, "start": round(start, 2),
                          "end": round(end, 2), "duration": round(end - start, 2)})
    return shot_list


def energy(video: Path) -> list[dict]:
    """Per-second mean luma and frame-to-frame difference — the edit's rhythm.

    ERR-0007: this used ffprobe's lavfi `movie=` source, where ':' is an option
    separator, so a Windows drive letter made it fail and return [] for every
    reel ever ingested — silently. Escaping the colon is not enough because the
    filtergraph parser unescapes twice. So we do not use `movie=` at all: the
    file goes in as a normal `-i` input, where no escaping grammar applies.
    """
    ff = tool("ffmpeg")
    out = run([ff, "-nostdin", "-hide_banner", "-i", str(video),
               "-vf", "signalstats,metadata=print:file=-",
               "-f", "null", "-"])
    vals = [float(m.group(1))
            for m in re.finditer(r"lavfi\.signalstats\.YAVG=([\d.]+)", out)]
    if not vals:
        print("reelkit: WARNING - energy curve is EMPTY. See ERRORS.md ERR-0007.",
              file=sys.stderr)
        return []
    fps = specs(video)["fps"] or 30.0
    step = max(1, int(round(fps)))
    rows = []
    for i in range(0, len(vals), step):
        chunk = vals[i:i + step]
        delta = [abs(chunk[j] - chunk[j - 1]) for j in range(1, len(chunk))]
        rows.append({
            "t": round(i / fps, 1),
            "luma": round(sum(chunk) / len(chunk), 2),
            "motion": round(sum(delta) / len(delta), 3) if delta else 0.0,
        })
    return rows


def audio(video: Path) -> dict:
    """Loudness, loudness range and silence gaps.

    Added 2026-11-14 after the `reel-analyst` agent - which is read-only by
    design - reported it could not produce these, and that the LUFS/LRA figures
    in docs/STORY_REEL_FINDINGS.md were measured by hand and never wired in.
    A critic that cannot measure must be handed measurements.
    """
    ff = tool("ffmpeg")
    out = run([ff, "-nostdin", "-hide_banner", "-i", str(video),
               "-af", "ebur128=peak=true", "-f", "null", "-"])
    # ebur128 prints a progress line every frame, each containing "I: ... LUFS".
    # re.search() would return the FIRST (always -70.0 at t=0). The real figures
    # are in the "Integrated loudness:" summary block at the very end.
    tail = out[out.rfind("Integrated loudness:"):] if "Integrated loudness:" in out else out[-3000:]

    def grab(pat, cast=float):
        m = re.search(pat, tail)
        return cast(m.group(1)) if m else None
    res = {
        "lufs":  grab(r"I:\s*(-?[\d.]+)\s*LUFS"),
        "lra":   grab(r"LRA:\s*(-?[\d.]+)\s*LU"),
        "peak":  grab(r"Peak:\s*(-?[\d.]+)\s*dBFS"),
        "threshold": grab(r"Threshold:\s*(-?[\d.]+)\s*LUFS"),
    }
    sil = run([ff, "-nostdin", "-hide_banner", "-i", str(video),
               "-af", "silencedetect=n=-50dB:d=0.3", "-f", "null", "-"])
    starts = [float(m.group(1)) for m in re.finditer(r"silence_start:\s*(-?[\d.]+)", sil)]
    durs   = [float(m.group(1)) for m in re.finditer(r"silence_duration:\s*([\d.]+)", sil)]
    res["silence_gaps"] = len(starts)
    res["silence_total_s"] = round(sum(durs), 2) if durs else 0.0
    res["longest_gap_s"] = round(max(durs), 2) if durs else 0.0
    res["has_audio"] = res["lufs"] is not None
    return res


# --------------------------------------------------------------- frames

def grab(video: Path, at: float, out: Path, width: int = 360) -> bool:
    ffmpeg = tool("ffmpeg")
    out.parent.mkdir(parents=True, exist_ok=True)
    run([ffmpeg, "-nostdin", "-loglevel", "error", "-ss", f"{at:.3f}",
         "-i", str(video), "-frames:v", "1",
         "-vf", f"scale={width}:-1", "-y", str(out)])
    return out.exists()


def frames(video: Path, dest: Path, shot_list: list[dict], dur: float) -> dict:
    """Hook strip (dense), one frame per shot, and a coarse timeline strip."""
    made = {"hook": [], "shots": [], "timeline": []}

    # The hook: first 3s every 0.25s. Short-form is decided here.
    t = 0.0
    while t < min(3.0, dur):
        p = dest / "hook" / f"{int(t*1000):05d}ms.png"
        if grab(video, t, p):
            made["hook"].append(str(p.relative_to(dest)))
        t += 0.25

    # One frame per shot, a third of the way in (past the transition).
    for s in shot_list:
        at = s["start"] + min(0.35, s["duration"] / 3)
        p = dest / "shots" / f"shot{s['index']:02d}_{s['start']:.2f}s.png"
        if grab(video, at, p):
            made["shots"].append(str(p.relative_to(dest)))

    # Coarse strip so a long reel is still skimmable.
    for i in range(10):
        at = dur * i / 10
        p = dest / "timeline" / f"{i:02d}_{at:.1f}s.png"
        if grab(video, at, p):
            made["timeline"].append(str(p.relative_to(dest)))
    return made


# --------------------------------------------------------------- report

REVIEW = """# {slug} — reference teardown

**Ingested:** {today} · **Source:** {url}
**Note:** {note}

> Third-party material. `research/` is gitignored and this never leaves the machine.
> We study **structure**, never reuse their story, shots, script, timings or assets.
> CLAUDE.md rule 2.

## Specs

| | |
|---|---|
| Resolution | {w}x{h} {orient} |
| Duration | {dur}s |
| Frame rate | {fps} |
| Audio | {audio} |

## Measured structure

- **{nshots} shots**, median {median}s, shortest {shortest}s, longest {longest}s.
- Shot list: `shots.json`. Energy curve: `energy.json`.
- Frames: `hook/` (every 0.25s for the first 3s), `shots/` (one per shot), `timeline/`.

## The read — fill this in by LOOKING, not from the numbers

### Hook (0–3s)
*What makes someone not scroll? Name the device: pattern interrupt, open loop,
value promise, visual shock, text question. What is on screen in frame 1?*

### Meat
*What is the one idea? How is it segmented? What does each beat add?
Where does the energy dip, and does it earn the dip?*

### Call to action
*What is asked, when, and how hard? Is it earned by what came before?*

### Motion grammar
*Easing, entrance style, text treatment, how much is on screen at once,
what the camera does, whether cuts land on the audio.*

### What we steal (structure) and what we must not (expression)
*Be explicit. The first list is allowed; the second is the licence boundary.*

## Verdict for our series

*One paragraph: does this pattern fit our topic, and what would we do differently?*
"""


def write_report(dest: Path, url: str, note: str, sp: dict,
                 shot_list: list[dict], made: dict) -> None:
    durs = sorted(s["duration"] for s in shot_list) or [0.0]
    median = durs[len(durs) // 2]
    (dest / "REVIEW.md").write_text(REVIEW.format(
        slug=dest.name, today=date.today().isoformat(), url=url or "(local file)",
        note=note or "—",
        w=sp["width"], h=sp["height"],
        orient="(vertical)" if sp["vertical"] else "(horizontal)",
        dur=sp["duration_s"], fps=sp["fps"],
        audio=sp["audio_codec"] or "NONE",
        nshots=len(shot_list), median=median,
        shortest=min(durs), longest=max(durs),
    ), encoding="utf-8")


def report(dest: Path, url: str, note: str, video: Path) -> None:
    sp = specs(video)
    shot_list = shots(video)
    en = energy(video)
    au = audio(video)
    made = frames(video, dest, shot_list, sp["duration_s"])

    (dest / "specs.json").write_text(json.dumps(sp, indent=2), encoding="utf-8")
    (dest / "shots.json").write_text(json.dumps(shot_list, indent=2), encoding="utf-8")
    (dest / "energy.json").write_text(json.dumps(en, indent=2), encoding="utf-8")
    (dest / "audio.json").write_text(json.dumps(au, indent=2), encoding="utf-8")
    write_report(dest, url, note, sp, shot_list, made)

    durs = sorted(s["duration"] for s in shot_list) or [0.0]
    print(f"\nreelkit -> {dest}")
    print(f"  {sp['width']}x{sp['height']} @ {sp['fps']}fps, {sp['duration_s']}s, "
          f"audio={sp['audio_codec'] or 'NONE'}")
    print(f"  {len(shot_list)} shots | median {durs[len(durs)//2]}s | "
          f"shortest {min(durs)}s | longest {max(durs)}s")
    print(f"  frames: {len(made['hook'])} hook, {len(made['shots'])} shot, "
          f"{len(made['timeline'])} timeline")
    if au.get("has_audio"):
        print(f"  audio: {au['lufs']} LUFS | LRA {au['lra']} | "
              f"{au['silence_gaps']} silence gaps, longest {au['longest_gap_s']}s")
    else:
        print("  audio: NONE detected")
    if not en:
        print("  energy: EMPTY - see ERRORS.md ERR-0007")
    print(f"  next: look at {dest / 'hook'} and fill in {dest / 'REVIEW.md'}")


# --------------------------------------------------------------- cli

def main() -> None:
    ap = argparse.ArgumentParser(description="Pull a reference reel apart.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    i = sub.add_parser("ingest", help="download a reel and analyse it")
    i.add_argument("url")
    i.add_argument("--slug", default=None)
    i.add_argument("--note", default="")

    a = sub.add_parser("analyse", help="analyse a video already on disk")
    a.add_argument("path")
    a.add_argument("--slug", default=None)
    a.add_argument("--note", default="")

    args = ap.parse_args()

    if args.cmd == "ingest":
        slug = args.slug or slugify(re.sub(r"https?://(www\.)?", "", args.url))
        dest = REELS / slug
        video, info = download(args.url, dest)
        if info:
            (dest / "source.meta.json").write_text(json.dumps({
                k: info.get(k) for k in
                ("title", "description", "uploader", "channel", "duration",
                 "view_count", "like_count", "comment_count", "upload_date",
                 "webpage_url", "extractor")
            }, indent=2, ensure_ascii=False), encoding="utf-8")
        report(dest, args.url, args.note, video)
    else:
        src = Path(args.path).resolve()
        if not src.exists():
            sys.exit(f"reelkit: no such file: {src}")
        slug = args.slug or slugify(src.stem)
        dest = REELS / slug
        dest.mkdir(parents=True, exist_ok=True)
        report(dest, "", args.note, src)


if __name__ == "__main__":
    main()
