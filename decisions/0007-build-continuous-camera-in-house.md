---
status: accepted
date: 2026-11-12
authored_by: human
derived_from: ["user instruction 2026-11-12: \"take the idea and lets build this ourselves and improve it\"", "license audit of feitangyuan/onetake"]
supersedes: null
superseded_by: null
---

# 0007 — Build the continuous-camera rig in house

## Context

[GOAL.md](../GOAL.md) requires one unbroken camera move with no cuts (standard M4).
`feitangyuan/onetake` (4.1k ⭐) implements exactly this and ships a continuity checker, but it is
licensed **PolyForm Noncommercial 1.0.0** — commercial use forbidden without a $79 license — so it
cannot sit under output we may publish.

The technique itself is a filmmaking idea in the public domain: a continuous take, with each beat
growing out of the previous one. Ideas are not licensed; implementations are.

## Options considered

1. **Build our own rig** — costs engineering time, and we own it, can match it exactly to our
   quality bar, and can improve on the idea.
2. **Use onetake non-commercially** — free and immediate, but puts a license tripwire under every
   film and makes commercial use a later migration rather than a choice.
3. **Buy the $79 commercial license** — cheapest in effort, legitimate, but it is someone else's
   abstraction, the quality standards are theirs not ours, and it is 21 commits old.

## Decision

**Build `engine/onecam` ourselves**, taking the technique and improving on it. Written from
scratch; no third-party code read or copied.

The improvement is the point: rather than checking continuity after the fact, the rig makes the
failures **unrepresentable**. Position, look-at and FOV are continuous functions of one spline, so
a cut cannot be expressed in the API. A permanent `motionFloor` drift means the camera never holds
still, so a dead-frame interval cannot form from a static camera. Easing and duration are derived
from distance travelled, so uniform mechanical motion is not the default — it is not even easy.

Design-time guarantees are proven numerically by `verify.mjs` across every frame; the finished file
is then measured independently by [`tools/filmcheck`](../tools/filmcheck/), which knows nothing
about the rig.

## Consequences

- **Easy:** no license constraint on any output; the rig encodes our standards directly; beat
  sheets become reviewable data for Gate 1 before anything is modelled.
- **Hard / given up:** we maintain it. onetake's motion blur, 4K60 path and reference-analysis
  tooling do not come free, and our rig has not yet driven a real render — the guarantees are
  verified in the maths, not yet in an MP4.
- **Tripwire:** if a film needs camera behaviour the rig cannot express (handheld, rack focus,
  multi-camera), extend it deliberately rather than reaching for a cut.

## Links

- Implementation: [engine/onecam/](../engine/onecam/)
- Related: [ADR 0009](0009-in-house-before-adoption.md), [ADR 0006](0006-stylized-3d-over-photoreal.md)
