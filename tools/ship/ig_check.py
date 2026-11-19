#!/usr/bin/env python3
"""ig_check.py: will this file upload to Instagram as a Reel, and is it compact? Deterministic, ffprobe only.

    python tools/ship/ig_check.py films/<slug>/renders/<name>_ig.mp4

The user, 2026-11-17: "add in checks for the final size as well, i need it compact because otherwise it won't be able to upload
on instagram". Our 60 fps masters are ~107 MB for 48 s (17.6 Mbit/s, AAC 192k); the Instagram file is made by ship.py.

The limits below are Meta's published Reels specifications as recorded in docs/INSTAGRAM_SPECS.md (with sources and the date
checked). COMPACT is our own budget, stricter than Meta's: a file small enough to upload quickly on a phone connection.
Exit 0 = every check passes; 1 = a check fails (each line says which and why).
"""
from __future__ import annotations

import json, subprocess, sys
from pathlib import Path

SPEC = {                                    # Meta's limits (docs/INSTAGRAM_SPECS.md); change both together
    "max_mb": 300, "min_s": 3.0, "max_s": 90.0, "fps": (24, 60),   # the stricter of Meta's two pages (15 min / 23 fps vs 90 s / 24 fps)
    "max_w": 1920, "aspect": 9 / 16,
    "vcodec": ("h264", "hevc"), "pix_fmt": ("yuv420p",), "max_video_mbps": 25.0,
    "acodec": ("aac",), "max_audio_kbps": 128, "sample_rates": (48000,), "max_channels": 2,
}
COMPACT_MB_PER_MIN = 60                     # ours: ~8 Mbit/s all in; a 48 s reel lands under ~48 MB


def probe(p: Path) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(p)], capture_output=True, text=True)
    if r.returncode: sys.exit(f"ffprobe failed on {p}: {r.stderr.strip()}")
    return json.loads(r.stdout)


def moov_first(p: Path) -> bool:
    """the moov atom before mdat (-movflags +faststart): the file can start playing and processing before it is all read"""
    with p.open("rb") as f:
        pos = 0
        while True:
            f.seek(pos); h = f.read(16)
            if len(h) < 8: return False
            size = int.from_bytes(h[:4], "big"); typ = h[4:8]
            if size == 1: size = int.from_bytes(h[8:16], "big")
            if typ == b"moov": return True
            if typ == b"mdat" or size < 8: return False
            pos += size


def check(p: Path) -> list[tuple[bool, str]]:
    d = probe(p); fmt = d["format"]; vs = [s for s in d["streams"] if s["codec_type"] == "video"]; au = [s for s in d["streams"] if s["codec_type"] == "audio"]
    out = []
    ok = lambda c, m: out.append((bool(c), m))
    mb = p.stat().st_size / 1e6; dur = float(fmt["duration"])
    ok(mb <= SPEC["max_mb"], f"file {mb:.1f} MB (Meta limit {SPEC['max_mb']} MB)")
    ok(mb <= COMPACT_MB_PER_MIN * dur / 60 + 1, f"compact: {mb:.1f} MB for {dur:.1f} s (our budget {COMPACT_MB_PER_MIN * dur / 60 + 1:.1f} MB = {COMPACT_MB_PER_MIN} MB a minute)")
    ok(SPEC["min_s"] <= dur <= SPEC["max_s"], f"duration {dur:.2f} s ({SPEC['min_s']:.0f}-{SPEC['max_s']:.0f} s)")
    ok(fmt["format_name"].startswith("mov,mp4"), f"container {fmt['format_name']} (MP4/MOV)")
    ok(moov_first(p), "moov atom first (faststart)")
    ok(len(vs) == 1, f"{len(vs)} video stream(s)")
    if vs:
        v = vs[0]; num, den = (int(x) for x in v["avg_frame_rate"].split("/")); fps = num / den if den else 0
        ok(v["codec_name"] in SPEC["vcodec"], f"video codec {v['codec_name']} (H.264 or HEVC)")
        ok(v.get("pix_fmt") in SPEC["pix_fmt"], f"pixel format {v.get('pix_fmt')} (4:2:0)")
        ok(v.get("field_order", "progressive") in ("progressive", "unknown"), f"scan {v.get('field_order', 'progressive')} (progressive)")
        ok(SPEC["fps"][0] <= fps <= SPEC["fps"][1], f"frame rate {fps:.2f} ({SPEC['fps'][0]}-{SPEC['fps'][1]})")
        ok(max(v["width"], v["height"]) <= SPEC["max_w"] and abs(v["width"] / v["height"] - SPEC["aspect"]) < 0.01,
           f"size {v['width']}x{v['height']} (9:16, at most {SPEC['max_w']} on the long side)")
        vbr = int(v.get("bit_rate") or 0) / 1e6
        ok(0 < vbr <= SPEC["max_video_mbps"], f"video bitrate {vbr:.1f} Mbit/s (Meta limit {SPEC['max_video_mbps']:.0f})")
    ok(len(au) == 1, f"{len(au)} audio stream(s) (one: a reel with no sound is not ours)")
    if au:
        s = au[0]; abr = int(s.get("bit_rate") or 0) / 1000
        ok(s["codec_name"] in SPEC["acodec"], f"audio codec {s['codec_name']} (AAC)")
        ok(int(s["sample_rate"]) in SPEC["sample_rates"], f"audio {s['sample_rate']} Hz (48 kHz)")
        ok(int(s["channels"]) <= SPEC["max_channels"], f"audio {s['channels']} channel(s) (at most 2)")
        ok(0 < abr <= SPEC["max_audio_kbps"], f"audio bitrate {abr:.0f} kbit/s (at most {SPEC['max_audio_kbps']})")
    return out


def main():
    if len(sys.argv) != 2: sys.exit(__doc__)
    res = check(Path(sys.argv[1]))
    for good, m in res:
        if not good: print(f"FAIL  {m}")
    bad = sum(not g for g, _ in res)
    print(f"IG {'PASS' if not bad else 'FAIL'}: {len(res) - bad}/{len(res)} checks" + ("" if bad else f"; {res[0][1]}"))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
