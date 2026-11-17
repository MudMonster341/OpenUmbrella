#!/usr/bin/env python3
"""autoreview — the deterministic auto-reviewer for a story reel. Same inputs, same verdict, every time.

    tools/reelkit/.venv/Scripts/python.exe tools/autoreview/autoreview.py films/<slug> \
        --video films/<slug>/renders/<file>.mp4 [--no-asr]

It measures the render, the sound stems and the voice files against the PLAN (shots, words, the hit; exported by
story_reel_foundation/lab/export_plan.mjs) and against every rule we have learned. Each check names its source: a note
from the user or an ERRORS.md entry. Add a check whenever the user flags something measurable (FEEDBACK.md, the
auto-review skill). It writes <film>/review/AUTOREVIEW.md and autoreview.json and exits 1 if any blocker fails.

It does NOT judge whether the film is good: faces, acting, story and taste stay with the user and the film-critic.
A pass here means "none of the known faults are present", nothing more.

Needs: ffmpeg, node, numpy; faster-whisper and the local model only for the voice check (skipped with --no-asr).
"""
from __future__ import annotations

import argparse, difflib, json, os, re, subprocess, sys, wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
LAB = ROOT / "story_reel_foundation" / "lab"
RESULTS: list[dict] = []


def check(cid, name, ok, value, limit, source, blocker=True):
    RESULTS.append({"id": cid, "name": name, "pass": bool(ok), "value": value, "limit": limit, "source": source, "blocker": blocker})


def sh(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


# ------------------------------------------------------------------------------------------------ loading
def probe(path):
    r = json.loads(sh(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate,duration,sample_rate",
                       "-show_entries", "format=duration", "-of", "json", str(path)]).stdout)
    v = next(s for s in r["streams"] if s["codec_type"] == "video"); a = next((s for s in r["streams"] if s["codec_type"] == "audio"), None)
    n, d = map(int, v["r_frame_rate"].split("/"))
    return {"w": v["width"], "h": v["height"], "fps": n / d, "vdur": float(v.get("duration") or r["format"]["duration"]),
            "adur": float(a["duration"]) if a and a.get("duration") else None}


def frames(path, w, h):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={w}:{h}:flags=area,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def read_wav(path):
    with wave.open(str(path)) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    return (x.reshape(-1, ch).mean(1) if ch > 1 else x), sr


def db(x):
    return 20 * np.log10(max(float(x), 1e-9))


# ------------------------------------------------------------------------------------------------ measures (each one has a self-test: selftest.py)
def audio_of(video):
    """the sound inside the video file itself, mono 48 kHz. Never today's stems: they may belong to another render."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768, 48000


def loudest_time(x, sr):
    """the centre of the loudest 200 ms (short-term RMS), not the highest peak: a limiter flattens every click to one ceiling"""
    w, hop = int(0.2 * sr), int(0.05 * sr)
    st = np.array([np.sqrt((x[i:i + w] ** 2).mean()) for i in range(0, max(1, len(x) - w), hop)])
    return float(st.argmax() * 0.05 + 0.1)


def stems_match(stem_path, seconds):
    """a stem belongs to this render only if it exists and has the render's length"""
    return Path(stem_path).exists() and abs(read_wav(stem_path)[0].size / 48000 - seconds) < 0.05


def speech_gaps(plan, audio_dir, floor_db=-45.0):
    """every stretch with no voice, from 0 to the end of the film: each line's own WAV placed at its planned time, 20 ms
    frames above floor_db count as voice. Deterministic: measured from the voice files and the plan, not from the mix."""
    hop = 0.01; n = int(plan["end"] / hop) + 1; on = np.zeros(n, bool)
    for l in plan["lines"]:
        x, sr = read_wav(Path(audio_dir) / f"{l['id']}.wav"); w = int(0.02 * sr); k = len(x) // w
        if k == 0: continue
        lvl = 20 * np.log10(np.sqrt((x[:k * w].reshape(k, w) ** 2).mean(1)) + 1e-9)
        for j in np.nonzero(lvl > floor_db)[0]:
            a = int((l["t"] + j * 0.02) / hop); on[a:a + 2] = True
    gaps, i = [], 0
    while i < n:
        if not on[i]:
            j = i
            while j < n and not on[j]: j += 1
            gaps.append((round(i * hop, 2), round(j * hop, 2))); i = j
        else:
            i += 1
    return gaps


def caption_edge_pixels(video, t, W=36):
    """white or yellow caption pixels in the outer W px of the caption band, at full resolution. The caption's dark outline and
    shadow sit ~25 px wide, so a word that stays inside the frame shows no white there; a word running off it does."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1", "-vf", "crop=1080:340:0:1280",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    if len(raw) != 1080 * 340 * 3: return 0
    img = np.frombuffer(raw, np.uint8).reshape(340, 1080, 3).astype(int); e = np.concatenate([img[:, :W], img[:, -W:]], 1)
    return int(((e.min(2) > 225) | ((e[..., 0] > 225) & (e[..., 1] > 190) & (e[..., 2] < 110))).sum())


def frame_rgb(video, t, w=108, h=192):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1", "-vf", f"scale={w}:{h}:flags=area",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(np.float32) if len(raw) == w * h * 3 else None


def background_stats(img):
    """detail and colour variety in the frame's BORDER (side strips above and below the caption band), where the setting shows
    around any insert. A plain colour or a flat gradient has almost no detail and very few colours (the user, 2026-11-16: 'no
    background should be only a plain color'). Calibrated: plain-background previews <= 8 colours, world frames >= 14."""
    h, w, _ = img.shape; m = np.zeros((h, w), bool); cols = np.r_[0:int(0.18 * w), int(0.82 * w):w]
    for a, b in ((0.10, 0.62), (0.86, 0.98)): m[int(a * h):int(b * h), cols] = True
    lum = img.mean(2); g = np.abs(np.diff(lum, axis=0))[:, :-1] + np.abs(np.diff(lum, axis=1))[:-1, :]
    detail = float(g[m[:-1, :-1]].mean())
    q = (img[m] // 32).astype(int); counts = np.bincount(q[:, 0] * 64 + q[:, 1] * 8 + q[:, 2], minlength=512)
    return detail, int((counts > 0.01 * m.sum()).sum())


def background_ok(detail, colours):
    return colours >= 11 and detail >= 4.0


def picture_jumps(small, fps):
    """times of sudden picture changes, with the caption band and the badge masked (a new word is not a jump)"""
    n = len(small); t = np.arange(n) / fps
    pm = np.ones(small.shape[1:], bool); pm[:12, :] = False; pm[60:84, :] = False
    dm = np.r_[0, np.abs(np.diff(small, axis=0))[:, pm].mean(1)]
    locm = np.array([np.median(dm[max(1, i - 6):i + 7]) for i in range(n)])
    jumps = []
    for i in range(1, n):
        if dm[i] > max(6.0, 5 * locm[i]) and (not jumps or t[i] - jumps[-1] > 3 / fps): jumps.append(float(t[i]))
    return jumps


# ------------------------------------------------------------------------------------------------ picture
def global_shift(a, b, win):
    """phase correlation: the whole-frame shift between two frames, in pixels of this resolution"""
    A = np.fft.fft2((a - a.mean()) * win); B = np.fft.fft2((b - b.mean()) * win)
    R = A * np.conj(B); R /= np.abs(R) + 1e-9
    r = np.abs(np.fft.ifft2(R)); y, x = np.unravel_index(r.argmax(), r.shape)
    if y > r.shape[0] // 2: y -= r.shape[0]
    if x > r.shape[1] // 2: x -= r.shape[1]
    return float(np.hypot(x, y)), float(r.max())


def picture(plan, video, info):
    fps = info["fps"]
    small = frames(video, 54, 96)                     # grain averages out at this size
    mid = frames(video, 108, 192)
    n = len(small); t = np.arange(n) / fps
    luma = mid.mean((1, 2))
    d = np.r_[0, np.abs(np.diff(small, axis=0)).mean((1, 2))]
    win = np.outer(np.hanning(192), np.hanning(108)).astype(np.float32)
    shift = np.zeros(n); conf = np.zeros(n)
    for i in range(1, n):
        shift[i], conf[i] = global_shift(mid[i - 1], mid[i], win)
    shift_full = shift * (1080 / 108)                   # in pixels of the 1080-wide frame

    check("V1", "Frame rate", fps >= 50, f"{fps:.2f} fps", ">= 50",
          "the user 2026-11-16: 'it feels stop motion at points, maybe we need higher fps'")
    check("V2", "Size", (info["w"], info["h"]) == (1080, 1920), f"{info['w']}x{info['h']}", "1080x1920", "GOAL.md")
    check("V3", "Length matches the plan", abs(info["vdur"] - plan["end"]) <= 2 / fps + 0.02, f"{info['vdur']:.3f} s vs plan {plan['end']:.3f} s",
          "within 2 frames", "voice before picture: the picture is timed to measured audio")
    dark = [round(float(x), 2) for x in t[luma < 20]]
    check("V4", "No black frames", not dark, f"darkest {luma.min():.1f} at {t[luma.argmin()]:.2f} s" + (f"; {len(dark)} under 20 from {dark[0]} s" if dark else ""),
          "mean luma >= 20 on every frame", "ERR-0014 (NaN normals blacked out 1.0-1.4 s)")

    # cuts: where the plan says, and nowhere else
    bounds = [s["t0"] for s in plan["shots"][1:] if not s.get("cont")]
    conts = [s["t0"] for s in plan["shots"][1:] if s.get("cont")]   # same camera on both sides: no cut to find, by design
    hs = [(h["at"], h["at"] + h["dur"]) for h in plan.get("hitstop", [])]
    near_hit = lambda x: abs(x - plan["impact"]) < 0.4
    loc = np.array([np.median(d[max(1, i - 6):i + 7]) for i in range(n)])
    cut_idx = [i for i in range(1, n) if d[i] > max(6.0, 5 * loc[i])]
    cuts = []
    for i in cut_idx:
        if not cuts or t[i] - cuts[-1] > 3 / fps: cuts.append(float(t[i]))
    missing = [b for b in bounds if not any(abs(c - b) <= 2.5 / fps for c in cuts)]
    jumps = picture_jumps(small, fps)
    extra = [round(c, 3) for c in jumps if not any(abs(c - b) <= 3 / fps for b in bounds) and not near_hit(c)]
    check("V5", "Every planned cut is in the film", not missing, f"{len(bounds) - len(missing)}/{len(bounds)} found" + (f"; missing at {missing}" if missing else "") + (f"; {len(conts)} continuous by design at {conts}" if conts else ""),
          "each shot boundary within 2.5 frames (a shot that starts on the previous shot's end camera is a continuation, not a cut)", "reel-builder skill: cut ON the word; direction.js keys shots to words")
    edge_bad = []
    for c in plan["captions"]:                                                   # a caption must never touch the frame edge
        i = int(round(c["t"] * fps)) + 1
        if i >= n or i < 2: continue
        hits = max(caption_edge_pixels(video, c["t"] + k / fps) for k in (1, 2))   # the pop scales a word up for its first frames
        if hits >= 50: edge_bad.append(f"{c['word']} {c['t']:.2f} s ({hits} text pixels in the outer 36 px)")
    check("C1", "Captions stay inside the frame", not edge_bad, "; ".join(edge_bad[:5]) or "none touch the edge", "< 50 caption-coloured (white/yellow) pixels in the outer 36 px of the caption band, 1-2 frames after onset, full resolution",
          "TWENTY-THREE ran off the frame in v5 (3715 px; legit captions 0). CORRECTION 2026-11-17: ACCORDING did NOT overflow (~40 px inside); the first version misread it and also fired on cuts")
    check("V6", "No unplanned jumps", not extra, f"{len(extra)} unplanned" + (f" at {extra[:6]}" if extra else ""), "0 in the picture (captions masked; the hit's flash excepted)",
          "the user 2026-11-16: 'it feels stop motion at points'")

    # judder: how far the picture moves between frames, per shot
    per_shot, judder, freeze_vo, stutter = [], [], [], []
    for s in plan["shots"]:
        i0, i1 = int(np.ceil(s["t0"] * fps)) + 2, int(np.floor(s["t1"] * fps)) - 2
        if i1 - i0 < 6: continue
        seg = shift_full[i0:i1][conf[i0:i1] > 0.08]
        p95 = float(np.percentile(seg, 95)) if len(seg) else 0.0
        mean_lum = float(luma[i0:i1].mean())
        per_shot.append({"shot": s["i"], "t0": s["t0"], "kind": s["kind"], "px_per_frame_p95": round(p95, 1), "px_per_s_p95": round(p95 * fps, 0),
                         "luma": round(mean_lum, 1), "motion": round(float(np.median(d[i0:i1])), 2)})
        lim = 30 if s.get("fast") else 18                                       # a shot marked fast in direction.js: the user wanted the crash faster
        if p95 > lim and not (s["t0"] <= plan["impact"] < s["t1"]): judder.append(f"shot {s['i']} ({s['t0']:.2f} s): {p95:.0f} px/frame (limit {lim})")
        dd = d[i0:i1]; mov = np.median(dd)
        if mov > 0.6 and s["kind"] == "world":                                   # inserts: a ticking hand reads as held frames
            held = int(((dd < 0.25 * np.array([np.median(dd[max(0, k - 3):k + 4]) for k in range(len(dd))])) ).sum())
            if held > max(1, 0.02 * len(dd)): stutter.append(f"shot {s['i']}: {held} held frames")
    check("V7", "No judder (big jumps between frames)", not judder, "; ".join(judder) or f"worst {max(p['px_per_frame_p95'] for p in per_shot):.0f} px/frame",
          "<= 18 px/frame (1080 wide), 95th pct per shot; <= 30 for shots marked fast; the hit exempt",
          "the user 2026-11-16: 'feels stop motion ... those frames should flow faster'; night v4 measured 5x the frame change in the jog and the hit")
    check("V8", "Even cadence (no held or repeated frames)", not stutter, "; ".join(stutter) or "none", "<= 2% of a moving shot",
          "reel-builder skill: motion is progressive; the user: 'stop motion'")

    # frozen picture while the narrator talks
    for l in plan["lines"]:
        for a in np.arange(l["t"], l["end"] - 0.5, 0.25):
            if any(h0 - 0.1 <= a <= h1 + 0.1 for h0, h1 in hs): continue
            i0, i1 = int(a * fps), int((a + 0.5) * fps)
            if d[i0 + 1:i1].max() < 0.12: freeze_vo.append(round(float(a), 2))
    check("V9", "Nothing freezes while the voice talks", not freeze_vo, f"{len(freeze_vo)} frozen half-seconds" + (f" from {freeze_vo[:5]}" if freeze_vo else ""),
          "no 0.5 s window under 0.12 mean change during a line", "reel-builder skill: 'no frozen beats while the VO talks'; filmcheck M1")

    # the hook: the virality skill's checklist, the parts that carry over to a story reel. WARNINGS, not blockers: its evidence is
    # 262 posts of one account selling AI tools (Ootto / @jayantcreates.ai), not story reels. Captions and the badge are masked
    # so a changing word is not mistaken for something happening.
    VIR = "virality skill (Ootto): hook checklist; evidence from AI-tool marketing reels, not yet validated on story reels"
    mask = np.ones(small.shape[1:], bool); mask[:12, :] = False; mask[60:84, :] = False
    md = np.r_[0, [float(np.abs(small[i] - small[i - 1])[mask].mean()) for i in range(1, min(n, int(3 * fps) + 1))]]
    check("H1", "Frame 0 is already moving", md[1:7].mean() >= 1.0, f"{md[1:7].mean():.2f} change/frame in the first 0.1 s", ">= 1.0 (provisional)", VIR + " #1", blocker=False)
    i05, i3 = int(0.5 * fps), min(n - 1, int(3.0 * fps))
    card = float(np.abs(small[i05] - small[i3])[mask].mean())
    check("H2", "Not a static card (0.5 s and 3 s look different)", card >= 8, f"{card:.1f}", ">= 8 (caption band masked)", VIR + " loser pattern 2", blocker=False)
    ev = float(md[1:].max()); ev_t = (int(md[1:].argmax()) + 1) / fps
    check("H3", "Something extraordinary happens before 3 s", ev >= 25, f"biggest change {ev:.1f} at {ev_t:.2f} s (a cut here is 50-77)", ">= 25 (a cut, a flash, a slam)", VIR + " #4", blocker=False)
    first = plan["lines"][0]["t"]
    check("H4", "The first word is spoken within 0.5 s", first <= 0.5, f"{first:.2f} s", "<= 0.5 s", VIR + " #6", blocker=False)
    hot = [c for c in plan["captions"] if c.get("hot") and c["t"] < 3.0]
    check("H5", "The claim lands around 1.2-1.6 s, emphasised", any(0.9 <= c["t"] <= 1.7 for c in hot), ", ".join(f"{c['word']} {c['t']:.2f} s" for c in hot) or "no emphasised word before 3 s", "an emphasised word at 0.9-1.7 s", VIR + " #5", blocker=False)

    washed = []                                                                 # V13: night shots keep real blacks (the haze lifted them, v4)
    for s in plan["shots"]:
        if s["kind"] != "world": continue
        p5 = []
        for u in (0.25, 0.5, 0.75):
            img = frame_rgb(video, s["t0"] + u * (s["t1"] - s["t0"]))
            if img is None: continue
            L = img.mean(2); m = np.ones(L.shape, bool); m[120:165, :] = False      # the caption band excluded
            p5.append(float(np.percentile(L[m], 5)))
        if len(p5) >= 2 and sorted(p5)[len(p5) // 2] > 35: washed.append(f"shot {s['i']} ({s['t0']:.2f} s): blacks at {sorted(p5)[len(p5) // 2]:.0f}")
    check("V13", "No washed-out shots (blacks stay dark)", not washed, "; ".join(washed[:6]) or "every world shot keeps real blacks",
          "darkest 5% of the picture <= 35 (median of 3 samples per world shot)",
          "the user 2026-11-17: 'lighting at all points ... depth'; v4's haze lifted blacks to 68-74 in the shop and the vision (v3: 5 shots over, v4: 5)")
    plain = []
    for s in plan["shots"]:
        samples = []
        for u in (0.25, 0.5, 0.75):
            img = frame_rgb(video, s["t0"] + u * (s["t1"] - s["t0"]))
            if img is not None: samples.append(background_stats(img))
        if samples:
            d = sorted(x[0] for x in samples)[len(samples) // 2]; c = sorted(x[1] for x in samples)[len(samples) // 2]
            if not background_ok(d, c): plain.append(f"shot {s['i']} ({s['kind']}, {s['t0']:.2f} s): {c} colours, detail {d:.1f}")
    check("V11", "Every shot has a real background (never a plain colour)", not plain, "; ".join(plain[:6]) or "every shot's border shows the world",
          ">= 11 colours and detail >= 4 in the frame border (median of 3 samples per shot)",
          "the user 2026-11-16: 'no background should be only a plain color ... the background should be directed first'")
    # V12 life: what moves in the background beyond the camera's own move (the user, 2026-11-17: "add some sort of life everywhere").
    # Each pair of frames 0.25 s apart is aligned by its global shift, then the frame border's residual change is measured.
    lifeless = []
    bmask = np.zeros(mid.shape[1:], bool); bmask[19:119, :20] = True; bmask[19:119, -20:] = True; bmask[165:188, :] = True
    for s in plan["shots"]:
        if s["kind"] != "world" or s["t1"] - s["t0"] < 1.0: continue
        res_ = []
        for a in np.arange(s["t0"] + 0.1, s["t1"] - 0.35, 0.25):
            i0, i1 = int(a * fps), int((a + 0.25) * fps)
            if i1 >= n: break
            A, Bf = mid[i0], mid[i1]
            F = np.fft.fft2(A - A.mean()) * np.conj(np.fft.fft2(Bf - Bf.mean())); F /= np.abs(F) + 1e-9
            r = np.abs(np.fft.ifft2(F)); dy, dx = np.unravel_index(r.argmax(), r.shape)
            Bs = np.roll(np.roll(Bf, dy, 0), dx, 1)
            res_.append(float(np.abs(A - Bs)[bmask].mean()))
        if res_ and np.median(res_) < 1.5: lifeless.append(f"shot {s['i']} ({s['t0']:.2f} s): residual {np.median(res_):.2f}")
    check("V12", "Life in the background (beyond the camera's move)", not lifeless, "; ".join(lifeless[:6]) or "every world shot has independent motion",
          "median residual >= 1.5 in the frame border (PROVISIONAL threshold, calibrating on v3 vs v4)",
          "the user 2026-11-17: 'add some sort of life if possible everywhere'", blocker=False)
    bad = [f"shot {p['shot']} {p['luma']}" for p in per_shot if not 40 <= p["luma"] <= 175]
    check("V10", "Every shot exposed (night allowed)", not bad, "; ".join(bad) or f"{min(p['luma'] for p in per_shot)}-{max(p['luma'] for p in per_shot)}",
          "mean luma 40-175 per shot", "GOAL.md exposure; 'never flat lighting' (the user 2026-11-14)", blocker=False)
    return per_shot, cuts


# ------------------------------------------------------------------------------------------------ sound
def sound(plan, film, video, info):
    out = film / "sound" / "out"
    r = sh(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    tail = r[r.rfind("Summary"):]
    g = lambda k: float(re.search(k + r":\s*(-?[\d.]+)", tail).group(1))
    I, LRA, TP = g("I"), g("LRA"), g("Peak")
    check("A1", "Loudness", abs(I + 14) <= 1, f"{I} LUFS", "-14 +/- 1", "GOAL.md")
    check("A2", "Loudness range", LRA <= 5, f"{LRA} LU", "<= 5", "GOAL.md")
    check("A3", "Peak", TP <= -1.0, f"{TP} dBFS", "<= -1.0", "GOAL.md")
    m = json.loads((out / "master.json").read_text()) if (out / "master.json").exists() else {}
    check("A4", "Master gain is linear (no pumping)", m.get("mode") == "Linear", m.get("mode", "no master.json"), "Linear",
          "ERR-0017: loudnorm silently went dynamic; the user: 'choppy with noise'")
    if info["adur"] is not None:
        check("A5", "Picture and sound the same length", abs(info["vdur"] - info["adur"]) <= 1 / info["fps"] + 0.02,
              f"video {info['vdur']:.3f} s, audio {info['adur']:.3f} s", "within a frame", "MEMORY: never -shortest, check both")
    x, sr = audio_of(video)                                                       # the sound IN the video under review, not today's files
    p0, p1 = plan["prehit"]
    sil = x[int((p0 + 0.15) * sr):int(p1 * sr)]
    sil_db = db(np.sqrt((sil ** 2).mean())) if len(sil) else 0
    crash_db = db(np.abs(x[int(p1 * sr):int((p1 + 0.5) * sr)]).max())
    check("A6", "The silence before the hit is quiet", sil_db <= -35, f"{sil_db:.1f} dBFS (night v2 was -59)", "<= -35 dBFS",
          "the user 2026-11-15: a silence before the hit; night v5 thump filled it (-14.6)")
    check("A7", "The hit jumps out of the silence", crash_db - sil_db >= 25, f"+{crash_db - sil_db:.0f} dB", ">= +25 dB", "ADR 0015")
    loud_t = loudest_time(x, sr)
    check("A8", "The loudest moment is the hit", abs(loud_t - plan["impact"]) <= 0.6, f"loudest at {loud_t:.2f} s (hit {plan['impact']:.2f})", "within 0.6 s of the hit",
          "ERR-0017: the clock tock was louder than the crash")
    stems_fresh = stems_match(out / "narration.wav", len(x) / sr)
    if not stems_fresh:
        check("A9", "The music sits under the voice", False, "the stems in sound/out do not belong to this video", "stems of this render", "a check must measure the thing it reports on", blocker=False)
    elif (out / "bed.wav").exists():
        nar, _ = read_wav(out / "narration.wav"); bed, _ = read_wav(out / "bed.wav")
        w5 = int(0.05 * sr); k = len(nar) // w5                                       # where a word is sounding (50 ms RMS > -40 dBFS), not whole line spans
        talk = np.repeat(np.sqrt((nar[:k * w5].reshape(k, w5) ** 2).mean(1)) > 0.01, w5); talk = np.r_[talk, np.zeros(len(nar) - len(talk), bool)]
        n_db = db(np.sqrt((nar[talk] ** 2).mean())); b_db = db(np.sqrt((bed[talk[:len(bed)]] ** 2).mean()))
        check("A9", "The music sits under the voice", n_db - b_db >= 10, f"voice {n_db:.1f}, music {b_db:.1f} dBFS ({n_db - b_db:.1f} dB under)", ">= 10 dB under, while words sound",
              "GOAL A2 ducking; the user: voice 'sharper and clearer'")


def voice(plan, film, asr):
    """every voiced file is speech, not breath; and (with ASR) says the script's words"""
    audio = film / "voice" / "audio"
    ids = [l["id"] for l in plan["lines"]]
    breath = []
    for f in sorted(audio.glob("L*.wav")):
        if f.stem.split("_")[0] not in ids: continue
        x, sr = read_wav(f); win = 1024; n = len(x) // win
        if n < 2: continue
        fr = x[:n * win].reshape(n, win) * np.hanning(win); S = np.abs(np.fft.rfft(fr, axis=1)) + 1e-9
        flat = np.exp(np.log(S).mean(1)) / S.mean(1); lvl = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
        loud = lvl > -35
        voiced = float((flat[loud] < 0.35).mean()) if loud.any() else 0.0
        if voiced < 0.3: breath.append(f"{f.name} ({voiced:.0%} voiced)")
    gaps = speech_gaps(plan, audio)
    long_gaps = [f"{a:.2f}-{b:.2f} s ({b - a:.2f})" for a, b in gaps if b - a > 0.5]
    check("S4", "No gap without a word longer than 0.5 s, start to end", not long_gaps,
          f"{len(long_gaps)} gaps over 0.5 s" + (f": {', '.join(long_gaps[:5])}" if long_gaps else f"; longest {max((b - a for a, b in gaps), default=0):.2f} s"),
          "every silence <= 0.5 s, including before the first word and after the last",
          "the user 2026-11-16: 'we shouldn't have more than half a second gap where there is no word said ... the gaps give the user a way to scroll'")
    check("S1", "Every voice take is speech, not breath", not breath, "; ".join(breath) or "all voiced", ">= 30% of loud frames voiced",
          "ERR-0017: L06 'And...' was 1.1 s of breath for four versions")
    with wave.open(str(film / "sound" / "out" / "voice_clean" / f"{ids[0]}.wav")) as w:
        check("S2", "The voice is mixed at 48 kHz from a real resampler", w.getframerate() == 48000, f"{w.getframerate()} Hz", "48000",
              "ERR-0017: linear resampling mirrored hiss above 12 kHz", blocker=True)
    if not asr:
        check("S3", "The voice says the script's words", True, "skipped (--no-asr)", ">= 0.85 word match per line", "ERR-0011", blocker=False); return
    os.environ["HF_HUB_OFFLINE"] = "1"                       # ERR-0016: never download a model from here
    sys.path.insert(0, str(ROOT / "tools" / "reelkit")); import align  # noqa: E402
    from faster_whisper import WhisperModel
    model = WhisperModel(align.find_model(None), device="cpu", compute_type="int8")
    script = {l["id"]: [c["word"] for c in plan["captions"] if c["line"] == l["id"]] for l in plan["lines"]}
    low = []
    for lid in ids:
        segs, _ = model.transcribe(align.load_audio(str(audio / f"{lid}.wav")), language="en", beam_size=5, vad_filter=False, temperature=0.0)
        heard = words_of(" ".join(s.text for s in segs)); want = words_of(" ".join(script[lid]))
        ratio = difflib.SequenceMatcher(a=want, b=heard, autojunk=False).ratio()
        if ratio < 0.85: low.append(f"{lid} {ratio:.2f} (heard: {' '.join(heard)[:60]})")
    check("S3", "The voice says the script's words", not low, "; ".join(low) or f"all {len(ids)} lines >= 0.85", ">= 0.85 word match per line",
          "ERR-0011 (lines nobody could understand); ERR-0017")


NUM = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = {2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety"}


def spell(v):
    """412 -> four hundred and twelve (the script's British style); up to 9999. It stopped at 59 and failed L13 ('412'), 2026-11-17."""
    if v < 20: return [NUM[v]]
    if v < 100: return [TENS[v // 10]] + ([NUM[v % 10]] if v % 10 else [])
    if v < 1000: return [NUM[v // 100], "hundred"] + (["and"] + spell(v % 100) if v % 100 else [])
    if v < 10000: return spell(v // 1000) + ["thousand"] + ((["and"] if v % 1000 < 100 else []) + spell(v % 1000) if v % 1000 else [])
    return [str(v)]


def words_of(s):
    s = s.lower().replace("curb", "kerb").replace("-", " ")
    out = []
    for tok in re.findall(r"[a-z']+|\d+", s):
        if tok.isdigit():
            out += spell(int(tok))                                  # Whisper writes numbers as digits; the script spells them
        else:
            out.append(tok)
    return out


# ------------------------------------------------------------------------------------------------ the plan's own rules
def plan_gates():
    for name, cmd in (("D1", ["node", "check_direction.mjs"]), ("D2", ["node", "check_bus.mjs"])):
        if not (LAB / cmd[1]).exists(): continue
        r = sh(cmd, cwd=LAB)
        last = (r.stdout.strip().splitlines() or ["(no output)"])[-1]
        check(name, {"D1": "Direction rules (words on screen, shots, colours, captions)", "D2": "Bus path (wheel on the kerb, clear of the shelter, accelerating)"}[name],
              r.returncode == 0, last, "exit 0", {"D1": "check_direction.mjs; ERR-0012, ERR-0013", "D2": "check_bus.mjs; the user 2026-11-16: 'took too long'; ERR-0008"}[name])


# ------------------------------------------------------------------------------------------------ report
def beat_table(plan):
    """the reel-builder skill's build table, generated from the plan: one row per shot"""
    rows = []
    for s in plan["shots"]:
        ws = [c["word"] for c in plan["captions"] if s["t0"] <= c["t"] < s["t1"]]
        rows.append(f"| {s['i']} | {s['t0']:.2f}-{s['t1']:.2f} | {s['t1'] - s['t0']:.2f} | {s['kind']} | {' '.join(ws).lower() or '-'} |")
    return "| # | Time | Secs | Shot | Spoken over it |\n|---|---|---|---|---|\n" + "\n".join(rows)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("film"); ap.add_argument("--video", required=True); ap.add_argument("--no-asr", action="store_true")
    ap.add_argument("--quiet", action="store_true", help="print only failures and warnings (the full table is in AUTOREVIEW.md)")
    a = ap.parse_args()
    film, video = (ROOT / a.film).resolve() if not Path(a.film).is_absolute() else Path(a.film), Path(a.video).resolve()
    plan = json.loads(sh(["node", "export_plan.mjs"], cwd=LAB).stdout)
    info = probe(video)
    plan_gates()
    per_shot, cuts = picture(plan, video, info)
    sound(plan, film, video, info)
    voice(plan, film, not a.no_asr)

    fails = [r for r in RESULTS if not r["pass"] and r["blocker"]]
    warns = [r for r in RESULTS if not r["pass"] and not r["blocker"]]
    verdict = "PASS" if not fails else "FAIL"
    rv = film / "review"; rv.mkdir(exist_ok=True)
    (rv / "autoreview.json").write_text(json.dumps({"video": video.name, "verdict": verdict, "checks": RESULTS, "shots": per_shot, "cuts": cuts}, indent=1), encoding="utf-8")
    lines = [f"# Auto-review — {video.name}", "",
             f"**{verdict}**: {len(RESULTS) - len(fails) - len(warns)} passed, {len(fails)} blocking failures, {len(warns)} warnings. "
             "Generated by `tools/autoreview/autoreview.py`; deterministic. A pass means none of the KNOWN faults are present; "
             "it says nothing about whether the film is good (that is the user's and the film-critic's call).", "",
             "| | ID | Check | Measured | Limit | Why this check exists |", "|---|---|---|---|---|---|"]
    for r in RESULTS:
        mark = "✅" if r["pass"] else ("❌" if r["blocker"] else "⚠️")
        lines.append(f"| {mark} | {r['id']} | {r['name']} | {r['value']} | {r['limit']} | {r['source']} |")
    lines += ["", "## Per shot", "", "| Shot | Starts | Kind | Move, px/frame (p95) | px/s | Mean luma | Change |", "|---|---|---|---|---|---|---|"]
    lines += [f"| {p['shot']} | {p['t0']:.2f} | {p['kind']} | {p['px_per_frame_p95']} | {p['px_per_s_p95']:.0f} | {p['luma']} | {p['motion']} |" for p in per_shot]
    lines += ["", "## Beat table (reel-builder format, from the plan)", "", beat_table(plan), ""]
    (rv / "AUTOREVIEW.md").write_text("\n".join(lines), encoding="utf-8")
    for r in RESULTS:
        if a.quiet and r["pass"]: continue
        print(f"{'PASS' if r['pass'] else ('FAIL' if r['blocker'] else 'WARN')}  {r['id']:4s} {r['name']}: {r['value']}")
    print(f"{verdict} -> {rv / 'AUTOREVIEW.md'}")
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
