#!/usr/bin/env python3
"""emotion.py — does the narration carry emotion? Pitch, loudness and speed per line, measured from the WAVs, against each
line's mood. Deterministic, numpy only, no model.

    python tools/autoreview/emotion.py <audio_dir> <delivery.json> [--json]

Built 2026-11-18. The user: "maybe the audio needs to better convey emotion ... see what we can automate". It measures the three
things a listener hears as feeling, per line (the line's own WAV, <id>.wav):
  pitch   median f0 (Hz) and the line's pitch movement, p10 to p90, in semitones (autocorrelation pitch tracker)
  loud    active level: the mean dBFS of the frames that carry voice
  rate    words per second of speech (the line's words / the time its level is above the floor)
and turns them into one 'energy' number per line relative to the whole narration: +1 is clearly hotter than the narrator's own
median line, -1 clearly cooler.

Each line's target comes from delivery.json: an explicit "energy": "high" | "mid" | "low", or, failing that, keywords in its
"mood" text (HIGH_WORDS / LOW_WORDS below). The checks (E = emotion):
  E1 the narration is not monotone across lines (spread of pitch, loudness and rate; 2 of the 3 must vary)
  E2 lines move in pitch inside themselves (median p10-p90 range)
  E3 the mood is heard: high lines measure hotter than mid lines, mid hotter than low, and few lines contradict their mood

Honest limits: thresholds are PROVISIONAL, set from speech-prosody rules of thumb (a monotone read moves < 3 semitones inside a
line; expressive narration varies ~1-2 semitones and ~2 dB between lines), not from our audience. OmniVoice's only levers are
speed, gain and punctuation (delivery.json _about), so E3 is a target for those levers, not a judgement of acting. A pass does
not mean the voice is moving; the user's ear decides that.
"""
from __future__ import annotations

import json, re, sys, wave
from pathlib import Path

import numpy as np

HIGH_WORDS = ("surpris", "shock", "panic", "urgent", "punch", "fast", "angry", "alarm", "hit", "scream", "excit", "climax", "rich",
              "triumph", "gut", "reveal", "race", "rising", "loud", "hook", "afraid", "fear", "desperate")
LOW_WORDS = ("quiet", "flat", "cold", "numb", "dead", "whisper", "sheepish", "dry", "sad", "grief", "calm", "slow", "soft", "tired",
             "hollow", "small", "still", "guilt", "shame", "resign", "low")
LIMITS = {"pitch_spread_st": 1.0, "loud_spread_db": 1.5, "rate_cv": 0.06, "line_range_st": 4.0, "contradict_share": 0.30}


def read_wav(path):
    with wave.open(str(path)) as w:
        sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(w.getnframes())
    x = np.frombuffer(raw, np.int16 if sw == 2 else np.int32).astype(np.float64) / (32768 if sw == 2 else 2 ** 31)
    return (x.reshape(-1, ch).mean(1) if ch > 1 else x), sr


def track(x, sr, fmin=70.0, fmax=400.0, floor_db=-40.0):
    """per 10 ms frame: f0 in Hz (nan when unvoiced) and level in dBFS. Normalised autocorrelation, parabolic peak."""
    n, hop = int(0.04 * sr), int(0.01 * sr)
    if len(x) < n + hop: return np.array([]), np.array([])
    idx = np.arange(0, len(x) - n, hop)
    fr = np.stack([x[i:i + n] for i in idx]); fr = fr - fr.mean(1, keepdims=True)
    lvl = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    F = np.fft.rfft(fr * np.hanning(n), 2 * n, axis=1); r = np.fft.irfft(np.abs(F) ** 2, axis=1)[:, :n]
    r = r / (r[:, :1] + 1e-12)
    lo, hi = int(sr / fmax), min(n - 2, int(sr / fmin))
    seg = r[:, lo:hi]; best = seg.max(1, keepdims=True)
    # octave errors: take the SHORTEST lag whose peak is within 10% of the best, not the best itself (a period of 2T scores ~T's)
    loc = (seg[:, 1:-1] > seg[:, :-2]) & (seg[:, 1:-1] >= seg[:, 2:]) & (seg[:, 1:-1] >= 0.9 * best)
    k = np.where(loc.any(1), loc.argmax(1) + 1, seg.argmax(1)) + lo; peak = r[np.arange(len(k)), k]
    a, b, c = r[np.arange(len(k)), k - 1], peak, r[np.arange(len(k)), k + 1]
    off = 0.5 * (a - c) / np.where(np.abs(a - 2 * b + c) < 1e-12, 1e-12, a - 2 * b + c)
    f0 = sr / (k + np.clip(off, -1, 1))
    f0[(peak < 0.45) | (lvl < floor_db)] = np.nan
    return f0, lvl


def measure(path, n_words, floor_db=-40.0):
    x, sr = read_wav(path)
    f0, lvl = track(x, sr, floor_db=floor_db)
    v = f0[~np.isnan(f0)] if len(f0) else np.array([])
    if len(v) >= 5: v = v[np.abs(np.log2(v / np.median(v))) < 0.8]          # drop leftover octave jumps (> ~10 st from the median)
    active = lvl > floor_db if len(lvl) else np.array([], bool)
    speech_s = float(active.sum()) * 0.01
    st = 12 * np.log2(v / np.median(v)) if len(v) >= 5 else np.array([0.0])
    return {"f0_hz": round(float(np.median(v)), 1) if len(v) >= 5 else None,
            "range_st": round(float(np.percentile(st, 90) - np.percentile(st, 10)), 2),
            "loud_db": round(float(lvl[active].mean()), 2) if active.any() else None,
            "rate_wps": round(n_words / speech_s, 2) if speech_s > 0.2 else None, "speech_s": round(speech_s, 2), "words": n_words}


def target(line):
    if line.get("energy") in ("high", "mid", "low"): return line["energy"]
    m = str(line.get("mood", "")).lower()
    s = sum(w in m for w in HIGH_WORDS) - sum(w in m for w in LOW_WORDS)
    return "high" if s > 0 else "low" if s < 0 else "mid"


def text_of(line):
    segs = line.get("segments") or [line]
    return " ".join(s.get("text", "") for s in segs)


def analyse(rows):
    """rows: [{id, target, f0_hz, range_st, loud_db, rate_wps}] -> (checks, rows with 'energy'). Pure: the selftest feeds it."""
    ok = [r for r in rows if r["f0_hz"] and r["loud_db"] is not None and r["rate_wps"]]
    out = []
    if len(ok) < 3:
        return [{"id": "E0", "name": "Enough voiced lines to judge emotion", "pass": False, "value": f"{len(ok)} measurable", "limit": ">= 3"}], rows
    p = np.array([12 * np.log2(r["f0_hz"]) for r in ok]); L = np.array([r["loud_db"] for r in ok]); R = np.array([r["rate_wps"] for r in ok])
    pm, lm, rm = np.median(p), np.median(L), np.median(R)
    for r, pi, li, ri in zip(ok, p, L, R):
        r["energy"] = round(float((pi - pm) / 1.5 + (li - lm) / 2.0 + (ri / rm - 1) / 0.08) / 3, 2)
    sp, sl, cv = float(p.std()), float(L.std()), float(R.std() / R.mean())
    varied = sum([sp >= LIMITS["pitch_spread_st"], sl >= LIMITS["loud_spread_db"], cv >= LIMITS["rate_cv"]])
    out.append({"id": "E1", "name": "The narration is not monotone across lines", "pass": varied >= 2,
                "value": f"pitch spread {sp:.2f} st, loudness spread {sl:.2f} dB, rate CV {cv:.3f} ({varied}/3 vary)",
                "limit": f">= {LIMITS['pitch_spread_st']} st, >= {LIMITS['loud_spread_db']} dB, >= {LIMITS['rate_cv']}; 2 of 3"})
    rng = float(np.median([r["range_st"] for r in ok]))
    flat = [r["id"] for r in ok if r["range_st"] < LIMITS["line_range_st"] * 0.6]
    out.append({"id": "E2", "name": "Lines move in pitch inside themselves", "pass": rng >= LIMITS["line_range_st"],
                "value": f"median p10-p90 {rng:.1f} st" + (f"; flattest: {', '.join(flat[:6])}" if flat else ""),
                "limit": f">= {LIMITS['line_range_st']} st (a monotone read is < 3)"})
    g = {k: [r["energy"] for r in ok if r["target"] == k] for k in ("high", "mid", "low")}
    mean = {k: float(np.mean(v)) if v else None for k, v in g.items()}
    present = [k for k in ("high", "mid", "low") if mean[k] is not None]
    ordered = all(mean[a] > mean[b] for a, b in zip(present, present[1:]))
    contra = [r["id"] for r in ok if (r["target"] == "high" and r["energy"] < 0) or (r["target"] == "low" and r["energy"] > 0)]
    tagged = [r for r in ok if r["target"] != "mid"]
    share = len(contra) / max(1, len(tagged))
    out.append({"id": "E3", "name": "Each line's mood is heard (high > mid > low)",
                "pass": len(present) >= 2 and ordered and share <= LIMITS["contradict_share"],
                "value": ", ".join(f"{k} {mean[k]:+.2f} (n={len(g[k])})" for k in present) + f"; contradicting: {', '.join(contra) or 'none'}"
                         + ("" if len(present) >= 2 else "; only one mood class tagged (add 'energy' to delivery.json)"),
                "limit": f"ordered high > mid > low; <= {LIMITS['contradict_share']:.0%} of tagged lines contradict"})
    return out, rows


def run(audio_dir, delivery):
    dd = json.loads(Path(delivery).read_text(encoding="utf-8"))
    lines = dd.get("lines", dd); lines = lines if isinstance(lines, list) else list(lines.values())
    rows = []
    for ln in lines:
        f = Path(audio_dir) / f"{ln['id']}.wav"
        if not f.exists(): continue
        n = len([t for t in text_of(ln).split() if re.search(r"[A-Za-z0-9]", t)])
        rows.append({"id": ln["id"], "target": target(ln), **measure(f, n)})
    return analyse(rows)


def main():
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(a) != 2: print(__doc__); return 2
    checks, rows = run(a[0], a[1])
    if "--json" in sys.argv: print(json.dumps({"checks": checks, "lines": rows}, indent=1)); return 0
    for r in rows:
        print(f"  {r['id']:4s} {r['target']:4s} f0 {r['f0_hz']} Hz  range {r['range_st']} st  loud {r['loud_db']} dB  rate {r['rate_wps']} w/s  energy {r.get('energy')}")
    for c in checks: print(f"{'PASS' if c['pass'] else 'WARN'}  {c['id']} {c['name']}: {c['value']}  [{c['limit']}]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
