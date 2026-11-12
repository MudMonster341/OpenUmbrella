#!/usr/bin/env python3
"""filmcheck — measure a render against the quality bar in GOAL.md.

In-house, stdlib-only, FFmpeg as the only external dependency. Nothing here is
copied from or derived from a third-party project; the ideas (continuity
checking, frozen-frame detection, loudness targets) are standard practice.

Usage:
    python filmcheck.py <video.mp4> [options]

Options:
    --target-duration SECONDS   Expected runtime (default: no duration check)
    --duration-tolerance SEC    Allowed deviation (default: 3.0)
    --allow-cuts N              Permitted scene changes (default: 0 — continuous camera)
    --expect-vertical           Require 1080x1920 (default: accept 1920x1080 or 1080x1920)
    --lufs TARGET               Integrated loudness target (default: -14.0)
    --lufs-tolerance DB         Allowed deviation (default: 1.0)
    --freeze-threshold SEC      Longest permitted motionless interval (default: 0.4)
    --no-audio-checks           Skip audio standards (for silent motion passes, Gate 3)
    --json PATH                 Write the full report as JSON
    --quiet                     Only print the verdict line

Exit codes:
    0  all blockers passed
    1  one or more blockers failed
    2  could not run (missing file, missing ffmpeg)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# --- Standard IDs map to the table in GOAL.md -------------------------------
# M1 no dead frames | M4 continuous camera | T4 captions (manual)
# A1 loudness | A5 silence | X1 format | X2 duration | X3 black frames

WINGET_FFMPEG = (
    Path(os.environ.get("LOCALAPPDATA", ""))
    / "Microsoft/WinGet/Packages"
    / "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    / "ffmpeg-9.0.2-full_build/bin"
)


def find_binary(name: str) -> str | None:
    """Locate ffmpeg/ffprobe, tolerating a stale PATH (see ERR-0003)."""
    found = shutil.which(name)
    if found:
        return found
    candidate = WINGET_FFMPEG / f"{name}.exe"
    if candidate.is_file():
        return str(candidate)
    env_dir = os.environ.get("FFMPEG_DIR")
    if env_dir:
        candidate = Path(env_dir) / f"{name}.exe"
        if candidate.is_file():
            return str(candidate)
        candidate = Path(env_dir) / name
        if candidate.is_file():
            return str(candidate)
    return None


def run(cmd: list[str]) -> str:
    """Run a command, returning stdout+stderr. FFmpeg reports filters on stderr."""
    proc = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    return (proc.stdout or "") + (proc.stderr or "")


def timecode(seconds: float) -> str:
    return f"{int(seconds // 60)}:{seconds % 60:05.2f}"


class Report:
    """Collects results. A failed blocker means the render is not shown."""

    def __init__(self) -> None:
        self.rows: list[dict] = []

    def add(
        self,
        std: str,
        name: str,
        passed: bool | None,
        measured: str,
        expected: str,
        blocker: bool = True,
        detail: list[str] | None = None,
    ) -> None:
        self.rows.append(
            {
                "standard": std,
                "name": name,
                "status": "SKIP" if passed is None else ("PASS" if passed else "FAIL"),
                "measured": measured,
                "expected": expected,
                "severity": "blocker" if blocker else "warning",
                "detail": detail or [],
            }
        )

    @property
    def failed_blockers(self) -> list[dict]:
        return [r for r in self.rows if r["status"] == "FAIL" and r["severity"] == "blocker"]

    @property
    def failed_warnings(self) -> list[dict]:
        return [r for r in self.rows if r["status"] == "FAIL" and r["severity"] == "warning"]


# --- Probes -----------------------------------------------------------------


def probe_format(ffprobe: str, path: Path) -> dict:
    out = run(
        [
            ffprobe, "-v", "error", "-print_format", "json",
            "-show_format", "-show_streams", str(path),
        ]
    )
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return {}


def detect_freezes(ffmpeg: str, path: Path, min_duration: float) -> list[tuple[float, float]]:
    """Intervals where the picture does not change. noise=0.003 is a tight
    threshold: real motion graphics always move more than this."""
    out = run(
        [ffmpeg, "-i", str(path), "-vf",
         f"freezedetect=noise=0.003:duration={min_duration}", "-f", "null", "-"]
    )
    freezes: list[tuple[float, float]] = []
    start: float | None = None
    for line in out.splitlines():
        m = re.search(r"freeze_start:\s*([\d.]+)", line)
        if m:
            start = float(m.group(1))
            continue
        m = re.search(r"freeze_end:\s*([\d.]+)", line)
        if m and start is not None:
            freezes.append((start, float(m.group(1))))
            start = None
    return freezes


def detect_cuts(ffmpeg: str, path: Path, threshold: float = 0.3) -> list[float]:
    """Scene changes. For a continuous-camera film this must be empty."""
    out = run(
        [ffmpeg, "-i", str(path), "-filter:v",
         f"select='gt(scene,{threshold})',showinfo", "-f", "null", "-"]
    )
    return [
        float(m.group(1))
        for m in re.finditer(r"pts_time:([\d.]+)", out)
    ]


def detect_black(ffmpeg: str, path: Path) -> list[float]:
    out = run(
        [ffmpeg, "-i", str(path), "-vf", "blackdetect=d=0.1:pic_th=0.98", "-f", "null", "-"]
    )
    return [float(m.group(1)) for m in re.finditer(r"black_start:([\d.]+)", out)]


def measure_loudness(ffmpeg: str, path: Path) -> dict | None:
    out = run([ffmpeg, "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"])
    tail = out[-4000:]
    result = {}
    for key, pattern in (
        ("integrated", r"I:\s*(-?[\d.]+)\s*LUFS"),
        ("range", r"LRA:\s*(-?[\d.]+)\s*LU"),
        ("true_peak", r"Peak:\s*(-?[\d.inf]+)\s*dBFS"),
    ):
        m = None
        for m in re.finditer(pattern, tail):
            pass  # keep the last (summary) occurrence
        if m:
            try:
                result[key] = float(m.group(1))
            except ValueError:
                pass
    return result or None


def detect_silence(ffmpeg: str, path: Path, min_duration: float = 1.5) -> list[tuple[float, float]]:
    out = run(
        [ffmpeg, "-i", str(path), "-af",
         f"silencedetect=noise=-50dB:d={min_duration}", "-f", "null", "-"]
    )
    silences: list[tuple[float, float]] = []
    start: float | None = None
    for line in out.splitlines():
        m = re.search(r"silence_start:\s*(-?[\d.]+)", line)
        if m:
            start = max(0.0, float(m.group(1)))
            continue
        m = re.search(r"silence_end:\s*([\d.]+)", line)
        if m and start is not None:
            silences.append((start, float(m.group(1))))
            start = None
    return silences


# --- Main -------------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(description="Measure a render against GOAL.md")
    ap.add_argument("video")
    ap.add_argument("--target-duration", type=float)
    ap.add_argument("--duration-tolerance", type=float, default=3.0)
    ap.add_argument("--allow-cuts", type=int, default=0)
    ap.add_argument("--expect-vertical", action="store_true")
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--lufs-tolerance", type=float, default=1.0)
    ap.add_argument("--freeze-threshold", type=float, default=0.4)
    ap.add_argument("--no-audio-checks", action="store_true")
    ap.add_argument("--json")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    path = Path(args.video)
    if not path.is_file():
        print(f"filmcheck: no such file: {path}", file=sys.stderr)
        return 2

    ffmpeg, ffprobe = find_binary("ffmpeg"), find_binary("ffprobe")
    if not ffmpeg or not ffprobe:
        print(
            "filmcheck: ffmpeg/ffprobe not found. Restart the terminal after installing,\n"
            "           or set FFMPEG_DIR to the folder containing them (see ERRORS.md ERR-0003).",
            file=sys.stderr,
        )
        return 2

    rep = Report()
    meta = probe_format(ffprobe, path)
    streams = meta.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)

    if not video:
        print("filmcheck: no video stream found", file=sys.stderr)
        return 2

    duration = float(meta.get("format", {}).get("duration", 0.0))
    width, height = int(video.get("width", 0)), int(video.get("height", 0))
    fps_raw = video.get("r_frame_rate", "0/1")
    try:
        num, den = fps_raw.split("/")
        fps = float(num) / float(den) if float(den) else 0.0
    except (ValueError, ZeroDivisionError):
        fps = 0.0

    # --- X1 format
    if args.expect_vertical:
        ok_res = (width, height) == (1080, 1920)
        expected_res = "1080x1920"
    else:
        ok_res = (width, height) in {(1920, 1080), (1080, 1920), (3840, 2160), (1080, 1080)}
        expected_res = "a standard delivery size"
    fps_ok = abs(fps - round(fps)) < 0.01 and fps >= 24
    rep.add(
        "X1", "Format and frame rate",
        ok_res and fps_ok and video.get("codec_name") == "h264",
        f"{width}x{height} @ {fps:.2f}fps, {video.get('codec_name')}",
        f"{expected_res}, locked fps >= 24, h264",
    )

    # --- X2 duration
    if args.target_duration:
        delta = abs(duration - args.target_duration)
        rep.add(
            "X2", "Duration on target", delta <= args.duration_tolerance,
            f"{duration:.2f}s (off by {delta:.2f}s)",
            f"{args.target_duration}s +/- {args.duration_tolerance}s",
        )
    else:
        rep.add("X2", "Duration on target", None, f"{duration:.2f}s", "no target given")

    # --- X3 black frames
    blacks = detect_black(ffmpeg, path)
    rep.add(
        "X3", "No black frames", not blacks,
        f"{len(blacks)} black interval(s)", "none",
        detail=[f"black at {timecode(t)}" for t in blacks[:10]],
    )

    # --- M1 dead frames
    freezes = detect_freezes(ffmpeg, path, args.freeze_threshold)
    dead_time = sum(e - s for s, e in freezes)
    dead_pct = (dead_time / duration * 100) if duration else 0.0
    rep.add(
        "M1", "No dead frames", not freezes,
        f"{len(freezes)} interval(s), {dead_time:.1f}s motionless = {dead_pct:.0f}% of runtime",
        f"no interval >= {args.freeze_threshold}s",
        detail=[
            f"{timecode(s)} -> {timecode(e)} ({e - s:.2f}s motionless)"
            for s, e in freezes[:12]
        ],
    )

    # --- M4 continuous camera
    cuts = detect_cuts(ffmpeg, path)
    rep.add(
        "M4", "Continuous camera", len(cuts) <= args.allow_cuts,
        f"{len(cuts)} scene change(s)",
        f"<= {args.allow_cuts}",
        detail=[f"cut at {timecode(t)}" for t in cuts[:15]],
    )

    # --- Audio
    if args.no_audio_checks:
        rep.add("A1", "Loudness", None, "skipped (silent pass)", f"{args.lufs} LUFS")
        rep.add("A5", "No dead air", None, "skipped (silent pass)", "no silence > 1.5s")
    elif not audio:
        rep.add("A1", "Loudness", False, "no audio stream", f"{args.lufs} LUFS")
        rep.add("A5", "No dead air", False, "no audio stream", "no silence > 1.5s")
    else:
        loud = measure_loudness(ffmpeg, path)
        if loud and "integrated" in loud:
            delta = abs(loud["integrated"] - args.lufs)
            peak = loud.get("true_peak")
            peak_ok = peak is None or peak <= -1.0
            rep.add(
                "A1", "Loudness", delta <= args.lufs_tolerance and peak_ok,
                f"{loud['integrated']:.1f} LUFS, peak {peak if peak is not None else 'n/a'} dBFS",
                f"{args.lufs} +/- {args.lufs_tolerance} LUFS, peak <= -1 dBTP",
            )
        else:
            rep.add("A1", "Loudness", False, "could not measure", f"{args.lufs} LUFS")

        silences = detect_silence(ffmpeg, path)
        rep.add(
            "A5", "No dead air", not silences,
            f"{len(silences)} silent gap(s) > 1.5s", "none",
            detail=[f"{timecode(s)} -> {timecode(e)}" for s, e in silences[:10]],
        )

    # --- Output
    verdict = "PASS" if not rep.failed_blockers else "FAIL"
    if not args.quiet:
        print(f"\nfilmcheck - {path.name}")
        print("=" * 72)
        for r in rep.rows:
            mark = {"PASS": "  ok  ", "FAIL": " FAIL ", "SKIP": " skip "}[r["status"]]
            flag = "" if r["severity"] == "blocker" else "  (warning)"
            print(f"[{mark}] {r['standard']:<3} {r['name']:<24} {r['measured']}{flag}")
            if r["status"] == "FAIL":
                print(f"           expected: {r['expected']}")
                for d in r["detail"]:
                    print(f"             - {d}")
        print("=" * 72)

    blockers = len(rep.failed_blockers)
    print(
        f"{verdict}: {blockers} blocker(s) failed, "
        f"{len(rep.failed_warnings)} warning(s) - {path.name}"
    )

    if args.json:
        Path(args.json).write_text(
            json.dumps(
                {
                    "file": str(path),
                    "verdict": verdict,
                    "duration": duration,
                    "resolution": f"{width}x{height}",
                    "fps": fps,
                    "checks": rep.rows,
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    return 0 if verdict == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
