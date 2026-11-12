---
status: accepted
date: 2026-11-12
authored_by: human
derived_from: ["user instruction 2026-11-12: \"we make our own better version of it in house\"", "filmcheck and onecam built 2026-11-12"]
supersedes: null
superseded_by: null
---

# 0009 — Build in house first; adopt only what is clearly better and unencumbered

## Context

The intake audit ([ADR 0003](0003-approval-gate-for-third-party-code.md)) found that the most
attractive components in this ecosystem are also the most encumbered: non-commercial licenses,
required paid APIs, three-commit repos, and self-issued safety grades. Meanwhile two of the
capabilities we needed most turned out to be **a day's work to build and better for being ours**:

- `tools/filmcheck` — the quality gate. Built on FFmpeg filters and the standard library, it
  encodes *our* bar from [GOAL.md](../GOAL.md) rather than someone else's. First run on the
  existing demo renders measured **79% of runtime motionless** on `focusflow-pitch` — the number
  that turned "feels choppy" into a defect with timecodes.
- `engine/onecam` — the continuous-camera rig ([ADR 0007](0007-build-continuous-camera-in-house.md)).

A third, `gbro-collage-broll`, is being declined outright: MIT, but it requires a paid Gemini key
billed per clip and outputs 720p into a 1080p pipeline. If that capability is ever wanted, it is
ours to build.

## Options considered

1. **In-house first** — slower to the first result, and produces tools that match our standards
   exactly, carry no license risk, and can be improved when the bar moves.
2. **Adopt-first, build only the gaps** — fastest to a result, and the usual path to a stack nobody
   understands, pinned to the weakest license in the set.
3. **Hybrid with no stated rule** — what happens by default, and it drifts to option 2 under time
   pressure, which is exactly when the license screen is skipped.

## Decision

**Build in house by default.** A third-party component is adopted only when it is clearly better
than what we would build *and* permissively licensed *and* free of paid dependencies *and*
maintained. Techniques are taken freely; implementations are not.

Note what this is not: it is not a rule against dependencies. Three large ones are already in the
stack — OpenMontage, HyperFrames and FFmpeg — because each is load-bearing, permissive enough, and
would be absurd to rebuild. The rule is about the long tail of small skill repos, where the cost of
building is low and the cost of an encumbered dependency is permanent.

## Consequences

- **Easy:** every piece is understood, matched to the quality bar, unencumbered, and improvable.
  Our tools also become reusable across the whole series rather than per-film.
- **Hard / given up:** real engineering time, and we forgo genuinely good work — onetake's motion
  blur, lemo-opuscar's 99 styles, motion-video-kit's critic prompts. We will rediscover things
  those projects already solved.
- **Tripwire:** if in-house building starts crowding out actually making films, the balance is
  wrong. The tools exist to serve [GOAL.md](../GOAL.md), not to become the project.

## Links

- Implementations: [tools/filmcheck/](../tools/filmcheck/), [engine/onecam/](../engine/onecam/)
- Related: [ADR 0003](0003-approval-gate-for-third-party-code.md), [ADR 0007](0007-build-continuous-camera-in-house.md), [ADR 0008](0008-learn-styles-then-author-our-own.md)
