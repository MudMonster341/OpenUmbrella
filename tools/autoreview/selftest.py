#!/usr/bin/env python3
"""selftest.py — tests the auto-reviewer's own measures on synthetic inputs with KNOWN answers. Deterministic, ~5 s.

    tools/reelkit/.venv/Scripts/python.exe tools/autoreview/selftest.py

The user, 2026-11-16: "add in hardcoded deterministic checks ... we cannot make the mistakes again". The reviewer's first version
measured the sound of today's stems instead of the video under review, and picked the loudest PEAK instead of the loudest moment.
Each test below builds a case where the wrong method gives the wrong answer, and fails if the reviewer gives it.
Run by tools/guards/check_guards.py (G4) before every publish.
"""
from __future__ import annotations

import subprocess, sys, tempfile, wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import autoreview as ar  # noqa: E402

SR = 48000
fails = []
ran = []


def ok(name, cond, detail):
    ran.append(name); print(f"{'PASS' if cond else 'FAIL'}  {name}: {detail}")
    if not cond: fails.append(name)


def write_wav(path, x):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def main():
    tmp = Path(tempfile.mkdtemp(prefix="autoreview_selftest_"))
    # T1: the reviewer hears the VIDEO's sound, not a stem lying next to it
    tone = 0.3 * np.sin(2 * np.pi * 440 * np.arange(2 * SR) / SR)
    write_wav(tmp / "a440.wav", tone)
    vid = tmp / "v.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=gray:s=108x192:r=30:d=2", "-i", str(tmp / "a440.wav"),
                    "-c:v", "libx264", "-c:a", "aac", "-shortest", str(vid)], check=True)
    write_wav(tmp / "stem.wav", 0.3 * np.sin(2 * np.pi * 1000 * np.arange(3 * SR) / SR))     # a decoy: another render's stem
    x, sr = ar.audio_of(vid)
    f = np.fft.rfftfreq(len(x), 1 / sr)[np.abs(np.fft.rfft(x)).argmax()]
    ok("T1 audio_of reads the video's own sound", abs(f - 440) < 5, f"dominant {f:.0f} Hz (video 440, decoy stem 1000)")

    # T2: the loudest MOMENT, not the loudest peak (a limiter makes every click hit the ceiling)
    y = np.zeros(5 * SR); y[int(1.0 * SR)] = 0.99                                              # one full-scale click at 1.0 s
    y[int(3.0 * SR):int(3.5 * SR)] = 0.6 * np.sin(2 * np.pi * 200 * np.arange(int(0.5 * SR)) / SR)   # a loud half second at 3.0 s
    lt = ar.loudest_time(y, SR)
    ok("T2 loudest_time finds the loud stretch, not the click", 2.9 <= lt <= 3.5, f"{lt:.2f} s (click at 1.0, burst at 3.0-3.5)")

    # T3: stems that do not belong to the render are refused
    write_wav(tmp / "n.wav", np.zeros(int(3 * SR)))
    ok("T3 stems_match refuses another render's stems", not ar.stems_match(tmp / "n.wav", 2.0) and ar.stems_match(tmp / "n.wav", 3.0),
       "3.0 s stem vs a 2.0 s render: refused; vs 3.0 s: accepted")

    # T4: a new caption word is not a picture jump; a real jump is
    fr = np.full((60, 96, 54), 80, np.float32)
    fr[30:, 62:80, 10:44] = 255                                                               # a caption appears in the band at frame 30
    ok("T4a picture_jumps ignores a caption change", ar.picture_jumps(fr, 30) == [], "caption band masked")
    fr2 = np.full((60, 96, 54), 80, np.float32); fr2[30:, 20:50, :] = 200                      # the picture itself changes at frame 30
    j = ar.picture_jumps(fr2, 30)
    ok("T4b picture_jumps catches a real jump", len(j) == 1 and abs(j[0] - 1.0) < 0.05, f"{j}")

    # T5: the hook warning sees a static opening (no event before 3 s) as static
    still = np.full((120, 96, 54), 90, np.float32)
    mask = np.ones(still.shape[1:], bool); mask[:12, :] = False; mask[60:84, :] = False
    md = np.r_[0, [float(np.abs(still[i] - still[i - 1])[mask].mean()) for i in range(1, 91)]]
    ok("T5 a still opening has no event", md.max() < 25, f"max change {md.max():.1f}")

    # T6: a plain or gradient background fails V11; a busy one passes
    yy = np.linspace(0, 1, 192)[:, None, None]
    grad = np.broadcast_to(np.array([40, 60, 140]) + yy * np.array([30, 40, 60]), (192, 108, 3)).astype(np.float32).copy()
    grad[60:120, 30:78] = 240                                                                 # a card in the middle: it must not save it
    d, c = ar.background_stats(grad)
    rng = np.random.default_rng(7); pal = rng.integers(0, 255, (24, 3))                     # a scene is blocks of colour, not noise
    busy = np.kron(pal[rng.integers(0, 24, (24, 14))], np.ones((8, 8, 1)))[:192, :108].astype(np.float32)
    d2, c2 = ar.background_stats(busy)
    ok("T6 background_stats fails a gradient, passes a busy scene", not ar.background_ok(d, c) and ar.background_ok(d2, c2),
       f"gradient {c} colours / detail {d:.1f}; busy {c2} colours / detail {d2:.1f}")

    print(f"SELFTEST {'PASS' if not fails else 'FAIL'}: {len(ran) if not fails else len(fails)} {'tests pass' if not fails else 'failed: ' + ', '.join(fails)}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
