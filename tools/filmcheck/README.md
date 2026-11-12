# filmcheck — measure a render against the quality bar

In-house, stdlib-only, FFmpeg as the only external dependency. It implements the standards table in
[GOAL.md](../../GOAL.md) so that "is this good enough" has a numeric answer with timecodes.

```bash
python tools/filmcheck/filmcheck.py <video.mp4> [options]
```

| Option | Purpose |
|---|---|
| `--target-duration S` | Check runtime against the brief (X2) |
| `--allow-cuts N` | Permitted scene changes; **0** for a continuous-camera film (M4) |
| `--expect-vertical` | Require 1080×1920 (X1) |
| `--lufs T` | Integrated loudness target, default −14 (A1) |
| `--freeze-threshold S` | Longest permitted motionless interval, default 0.4s (M1) |
| `--no-audio-checks` | For the Gate 3 silent motion pass |
| `--json PATH` | Machine-readable report for the gate record |

Exit code is 0 only when every **blocker** passes, so it drops into a loop or a hook unchanged.

## What it measures

| Standard | Method |
|---|---|
| M1 no dead frames | FFmpeg `freezedetect`, reported as count, total motionless seconds, and **percentage of runtime** |
| M4 continuous camera | FFmpeg scene-change detection; any detection is a cut |
| X1 format | `ffprobe` — resolution, locked frame rate, codecs |
| X2 duration | `ffprobe` against the target and tolerance |
| X3 black frames | FFmpeg `blackdetect` |
| A1 loudness | FFmpeg `ebur128` — integrated LUFS and true peak |
| A5 dead air | FFmpeg `silencedetect` |

Not automatable, still Blockers, still checked by a human at the gate: **T1–T4** (word count on
screen, one idea per beat, text not carrying the content, caption placement) and **C1–C4** (colour
discipline, emotional arc readable silent, the first two seconds, nothing that reads as a default).

## Why it exists

The first run, on the three stock demo renders, is the justification:

```
[ FAIL ] M1  No dead frames   11 interval(s), 17.9s motionless = 79% of runtime
[  ok  ] M4  Continuous camera  0 scene change(s)
[ FAIL ] A1  Loudness          -70.0 LUFS, peak -inf dBFS
[ FAIL ] A5  No dead air       1 silent gap(s) > 1.5s  (0:00.00 -> 0:22.55)
```

`focusflow-pitch.mp4` holds a motionless frame for **79% of its runtime** — elements pop in, then
nothing moves for two to three seconds at a time. That is not jitter, it is stop-motion, and it is
the precise, measurable form of "the demos look choppy". The audio track is present but empty.

It also catches its own environment problem: FFmpeg is located even when PATH is stale, because
that failure already cost us once ([ERR-0003](../../ERRORS.md)).

## Relationship to other checks

Three layers, deliberately independent:

1. **`engine/onecam/verify.mjs`** — design time. Proves the camera path's guarantees before
   anything renders.
2. **HyperFrames `check` / `measure` / `audio`** — authoring time, inside the composition.
3. **filmcheck** — on the finished file, knowing nothing about how it was made.

A render has to pass all three. The last one is the only one that cannot be fooled by the intent of
the thing that produced it.
