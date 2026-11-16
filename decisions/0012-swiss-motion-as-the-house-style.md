# 0012 — swiss-motion is the house style for the reel series

**Date:** 2026-11-13
**Status:** **Proposed** — the user asked to see the style rendered before committing.
A sample reel is built first; this becomes Accepted only after they have looked at it.
**Supersedes:** nothing. Builds on [0008](0008-learn-styles-then-author-our-own.md) and
[0011](0011-use-lemo-opuscar-styles-non-commercially.md).

## Context

The 3D films (paris-proto, zombie-p1) each cost days and one render takes minutes. They taught us
the craft standard, but they are the wrong shape for a series: every new topic needs a new world
built. The user's direction is explicit — pick **one** style, make videos only in it, look at each
one, improve, and keep every take so the improvement is traceable.

The user confirmed on 2026-11-13 that **these videos are non-commercial**, which keeps
lemo-opuscar's 101 styles in scope under ADR 0011.

## Decision

**`swiss-motion` is the house style.** All reels in the series are authored to its grammar.

Chosen after reading `STYLE.md` and `DEMO.md` in full, not by the name:

- It is explicitly **"a system plus one exception"** and ships a written method for adapting *any*
  topic to it (§11 Variation space). That is a series, not a one-off.
- It is **2D canvas on a grid**. No shadows, no shadow maps, no tone mapping, no 3D. On a 7.7 GB
  machine with integrated graphics this renders in seconds where zombie-p1 takes 2m40s. Fast
  iteration is the entire point of the make-look-improve loop.
- It is **text-forward**, so hooks and calls to action are native to the form rather than bolted on.
- Its grammar is **measurable**: two easing curves only, durations as note values, entrances as
  wipes never fades, one signal colour. That turns taste into something a gate can check, which is
  the project's long-running problem (GOAL.md's standards are mostly unmeasurable today).
- It directly answers GOAL.md's "nothing that reads as a default".

Rejected alternatives: `text-flash-cuts` (more reel-native but reads cheaper), `precise-mechanism`
and `teardown` (excellent for "how an agent works", too narrow for every topic), `dark-keynote`
(closest to the default tech look we are trying to escape).

**The honest risk:** the style punishes imprecision. A sloppy swiss-motion frame looks broken, not
merely mediocre, because the whole premise is exactness. And its grammar is beat-locked to music we
do not have while narration is blocked on VoiceStudio.

## Two technical consequences, found before building

### 1. 30 fps is wrong for this style. We use 24 fps

Durations in swiss-motion are note values at the film's tempo. At 120 BPM:

| Note | Seconds | @24 fps | @30 fps | @60 fps |
|---|---|---|---|---|
| 1/4 | 0.5 | 12 ✅ | 15 ✅ | 30 ✅ |
| 1/8 | 0.25 | 6 ✅ | **7.5 ❌** | 15 ✅ |
| 1/16 | 0.125 | 3 ✅ | **3.75 ❌** | 7.5 ❌ |

At 30 fps the eighths and sixteenths land between frames. §9 names that exact pitfall: "onsets that
fall between frames flicker". **24 fps is what the style prescribes and the only rate where every
subdivision is a whole frame.** It also renders fastest. Reels play 24 fps without complaint.

This is the opposite of the 3D films, where [C2](../ROADMAP.md) wants 60 fps finals to kill judder.
There is no judder here: nothing moves between snaps by design.

### 2. filmcheck's M1 gate is wrong for this style, and we must not quietly loosen it

`filmcheck` fails any motionless interval ≥ 0.4 s. **swiss-motion holds are the grammar** — elements
snap into place and stay. A 0.5 s hold is a correct frame in this style and an M1 failure in our gate.

The gate was built for continuous-camera 3D film and is being applied outside its domain.

MEMORY records the standing rule here: adding animated grain would have passed filmcheck instantly
without the film moving at all, and **gaming our own metric is worse than failing it.** So:

- **Allowed:** a continuously moving element that is genuinely part of the design and carries
  information — the style's own vocabulary offers a playhead sweep and a bar counter (§4 caption
  rows, §6 camera grammar). A beat counter that tells you where you are in the film is layout, not
  a cheat.
- **Not allowed:** decorative jitter, grain, or a hidden moving pixel added to clear the gate.
- **Also legitimate:** running filmcheck with `--freeze-threshold` raised for this style, *stated
  explicitly in the take record* so nobody later mistakes a loosened gate for a passing one.

Until a swiss-motion reel is measured, we do not know which of these we need. **The first reel is
rendered and checked at the default 0.4 s so the number is real**, and the decision is taken with
evidence rather than in advance.

### MEASURED 2026-11-13 — and the prediction above was wrong

`films/reel-01-agent-loop` was rendered and checked. **M1 at the default 0.4 s: 12 intervals,
72% of runtime motionless.** On a render that is correct and looks right.

**I predicted a continuously moving playhead would answer M1. It does not, and that claim was
wrong.** The playhead moves ~1.7 px per frame in a 1080×1920 frame. FFmpeg's `freezedetect`
measures **mean change across the whole frame**, so an element occupying well under 1% of the
picture stays below its noise floor however fast it moves. The same applies to the loop pulse that
replaced it: 22 px wide, travelling 35 px per frame, plainly visible in a snapshot, and still
invisible to the detector.

Raising the threshold does not fix this. At `--freeze-threshold 2.0` the reel still reports a
2.4 s "motionless" interval **spanning the exact seconds the orange pulse is running**. The number
is not measuring what it claims to measure.

**Conclusion: M1 as implemented is not applicable to this style.** Not "loosened" — inapplicable.
It is a whole-frame pixel gate being asked about a composition where the subject is a small,
deliberate element on a large still page. Reporting a swiss-motion reel as "M1 pass" at any
threshold would be a false claim either way.

What the gate still earned: run at 2.0 s **as a diagnostic, not a gate**, it found a genuine 5.29 s
dead patch between the agent bars landing and the loop starting. That was a real pacing defect and
was fixed (the reel went 23 s → 20 s, worst authored idle 3.5 s → 0.5 s). A broken instrument can
still point at a real problem; it just cannot certify the result.

**The real fix, not yet built:** an event-gap check over the *beat sheet* rather than the pixels —
"no authored event gap longer than one bar" — in the shape of `engine/onecam/verify.mjs`, which
asserts at design time in the same units the thing is authored in. Until it exists, a swiss-motion
reel's take record states `M1: not applicable (instrument mismatch)` with this ADR as the reason,
and the pacing is judged by **looking**.

## Adaptation: vertical

The style specifies a 1920×1080 landscape frame, 12 columns, 96 px margins, 24 px gutters. Reels are
1080×1920. Our adaptation, to be revised once we have looked at renders:

| | Style (landscape) | Ours (vertical) |
|---|---|---|
| Frame | 1920×1080 | 1080×1920 |
| Columns | 12 | **6** — §9 warns thin columns read as a chart, and 12 columns in 1080 px is 78 px each |
| Side margin | 96 | **72** |
| Gutter | 24 | **24** |
| Baseline | 24 | **24** |

The "spread" (left page = the rule, right page = the artifact) becomes **upper and lower registers**
in a vertical frame: the rule above, the artifact below.

## Obligations carried from ADR 0011

- Attribution to lemo-opuscar (LemoLab) is required.
- Output is **non-commercial**. Every film README lists the external styles it used; an empty list
  means commercially clean. These reels will not have an empty list.
- Never copy the demo's story, shots, props or timings — §Variation space is explicit that our
  treatment must be far from theirs. We take the **grammar**, not the film.

## Consequences

- A new `films/` project per reel, sharing one house engine rather than each building a world.
- `tools/filmcheck` needs a style-aware mode, or an honest documented override. Open.
- The 3D pipeline (`engine/onecam`, zombie-p1) is not retired — it is a different product with a
  different grammar. Nothing here changes it.
