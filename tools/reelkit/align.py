#!/usr/bin/env python3
"""align — word-level timings for narration WAVs, offline.

    python tools/reelkit/align.py <audio_dir> [--out words.json] [--model PATH]

Writes `words.json`:  { "B01": [ {"w": "At", "s": 0.00, "e": 0.18}, ... ], ... }

Why this exists: `voicestudio speak` returns no word timings, and
`voicestudio dictation` exposes only models/readiness/preferences — there is no
transcribe-a-file command. Without this, captions can only be timed per line,
and word-level sync is the measured reference style's single most
characteristic move (docs/STORY_REEL_FINDINGS.md §4).

**It downloads nothing.** It points `faster-whisper` at the
`faster-whisper-large-v3-turbo-ct2` snapshot that VoiceStudio already placed in
its HF cache (MIT, 1.5 GB, on disk). If that snapshot is missing the script
says so and stops rather than quietly pulling 1.5 GB.

Honest limits, stated because they affect what you can claim:
  * large-v3-turbo on CPU is slow — expect roughly real-time or worse.
  * Forced alignment on synthetic speech mis-splits words sometimes, and
    Whisper normalises numerals ("7:12" may come back as "seven twelve").
    `--check` reports any line whose transcript drifts from the script so a
    human can look, rather than letting a wrong caption ship.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys

CACHE = os.path.expandvars(r"%LOCALAPPDATA%\OmniVoice\hf_cache")
MODEL_REPO = "models--deepdml--faster-whisper-large-v3-turbo-ct2"


def find_model(explicit: str | None) -> str:
    if explicit:
        if not os.path.isdir(explicit):
            sys.exit(f"align: no model directory at {explicit}")
        return explicit
    root = os.path.join(CACHE, MODEL_REPO, "snapshots")
    if not os.path.isdir(root):
        sys.exit(
            "align: the local Whisper snapshot is not where it was expected:\n"
            f"  {root}\n"
            "Nothing was downloaded. Pass --model <dir> if it moved."
        )
    snaps = [os.path.join(root, d) for d in os.listdir(root)]
    snaps = [d for d in snaps if os.path.isfile(os.path.join(d, "model.bin"))]
    if not snaps:
        sys.exit(f"align: no model.bin under {root}. Nothing downloaded.")
    return snaps[0]


def ffmpeg() -> str:
    """ERR-0003: a winget FFmpeg is invisible to shells started before it."""
    found = shutil.which("ffmpeg")
    if found:
        return found
    cand = os.path.join(
        os.environ.get("LOCALAPPDATA", ""),
        "Microsoft/WinGet/Packages",
        "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
        "ffmpeg-9.0.2-full_build/bin/ffmpeg.exe")
    if os.path.isfile(cand):
        return cand
    sys.exit("align: ffmpeg not found. See ERRORS.md ERR-0003.")


def load_audio(path: str):
    """Decode to 16 kHz mono float32 ourselves.

    faster-whisper 1.2.1 would otherwise call av.open(..., metadata_errors=...),
    which `av` 19 removed - the install fails with a TypeError deep inside the
    library. Decoding here sidesteps that whole dependency path, and ffmpeg is
    already a hard requirement of this repo.
    """
    import numpy as np
    raw = subprocess.run(
        [ffmpeg(), "-nostdin", "-loglevel", "error", "-i", path,
         "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
        capture_output=True).stdout
    if not raw:
        sys.exit(f"align: ffmpeg decoded nothing from {path}")
    return np.frombuffer(raw, dtype="<f4").copy()


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()


def letters(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def reconcile(script_line: str, heard: list[dict]) -> list[dict]:
    """Script words, Whisper timings, matched by letter stream.

    Whisper's TEXT cannot be trusted for captions - it normalises numerals, so
    "6:02" comes back as "6" + ".02,". Its TIMES are excellent. So we keep the
    script's words (which are what was actually spoken and what the viewer must
    read) and borrow the measured timing, walking both letter streams together
    so a split or merged token does not shift everything after it.

    This is real measured timing reconciled to correct text. It is NOT a line
    duration divided evenly between words, which would be faking sync.
    """
    if not heard:
        return []
    spans = []           # (letter_index_start, letter_index_end, s, e)
    pos = 0
    for h in heard:
        n = len(letters(h["w"]))
        if n:
            spans.append((pos, pos + n, h["s"], h["e"]))
            pos += n
    if not spans:
        return []
    total = pos

    def time_at(idx: float) -> float:
        idx = max(0.0, min(float(total), idx))
        for a, b, st, en in spans:
            if idx <= b:
                frac = 0.0 if b == a else (idx - a) / (b - a)
                return st + (en - st) * max(0.0, min(1.0, frac))
        return spans[-1][3]

    out, cur = [], 0
    for w in script_line.split():
        n = len(letters(w))
        if n == 0:
            continue
        out.append({"w": w, "s": round(time_at(cur), 3),
                    "e": round(time_at(cur + n), 3)})
        cur += n
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio_dir")
    ap.add_argument("--out", default=None)
    ap.add_argument("--model", default=None)
    ap.add_argument("--script", default=None,
                    help="script.json — enables the drift check")
    args = ap.parse_args()

    audio_dir = os.path.abspath(args.audio_dir).replace("\\", "/")
    out_path = args.out or os.path.join(os.path.dirname(audio_dir), "words.json")

    wavs = sorted(f for f in os.listdir(audio_dir) if f.lower().endswith(".wav"))
    wavs = [f for f in wavs if re.match(r"^[A-Z]\d{2}\.wav$", f)]
    if not wavs:
        sys.exit(f"align: no line WAVs (e.g. B01.wav) in {audio_dir}")

    model_dir = find_model(args.model)
    print(f"align: model {model_dir}")
    print(f"align: {len(wavs)} file(s)")

    from faster_whisper import WhisperModel          # imported late: slow
    model = WhisperModel(model_dir, device="cpu", compute_type="int8")

    script = {}
    if args.script and os.path.isfile(args.script):
        with open(args.script, encoding="utf-8") as f:
            script = {l["id"]: l["t"] for l in json.load(f)["lines"]}

    words, drift = {}, []
    for name in wavs:
        lid = os.path.splitext(name)[0]
        segs, _ = model.transcribe(
            load_audio(os.path.join(audio_dir, name)),
            word_timestamps=True, language="en", vad_filter=False,
        )
        ws = []
        for seg in segs:
            for w in (seg.words or []):
                ws.append({"w": w.word.strip(), "s": round(w.start, 3),
                           "e": round(w.end, 3)})
        said = " ".join(w["w"] for w in ws)
        words[lid] = reconcile(script[lid], ws) if lid in script else ws
        print(f"  {lid}  {len(ws):3d} words  {said[:58]}")
        if lid in script and norm(said) != norm(script[lid]):
            drift.append((lid, script[lid], said))

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(words, f, indent=2, ensure_ascii=False)
    print(f"align: wrote {out_path}")

    if drift:
        print("\nalign: TRANSCRIPT DRIFT — a human should look at these.", file=sys.stderr)
        print("Whisper normalises numerals, so this is often harmless, but a "
              "caption built from a drifted transcript would be WRONG.\n", file=sys.stderr)
        for lid, want, got in drift:
            print(f"  {lid}\n    script: {want}\n    heard : {got}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
