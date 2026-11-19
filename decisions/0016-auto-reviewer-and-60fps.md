# 0016 — A deterministic auto-reviewer gates every render, and finals render at 60 fps

**Date:** 2026-11-16
**Status:** **Accepted**: both were asked for by the user, in their words below.
**Relates to:** CLAUDE.md rule 7 (produce, then judge), [0015](0015-part1-direction-choices.md), `tools/filmcheck`, ERR-0014 to ERR-0018.

## Context

On night v4 the user found, by watching, faults that every check had passed: broken eyes, a "choppy" body, noise in the voice,
a slow crash, and "stop motion" at points. The user then asked for two things:

> *"all the checks we do, make them deterministic, I want to have these checks in a pipeline which we will call our auto
> reviewer, our reels and everything passes and we keep updating and also improving and adding onto this, so that we learn
> from our mistakes"*

> *"it feels stop motion at points, maybe we need higher fps"*

## Decisions

| Question | Options | Chosen | Cost / consequence |
|---|---|---|---|
| How a render is judged before anyone sees it | (a) the film-critic agent only; (b) filmcheck plus the critic; (c) a deterministic reviewer that measures against the plan and every learned rule, then the critic | **(c)**: `tools/autoreview/autoreview.py` plus the `auto-review` skill | About 70 s a run (Whisper is most of it; `--no-asr` takes about 15 s). Its limits are ours to keep honest: a check must fail the bad version and pass the fix. **It does not judge taste**: faces, acting and story stay with the critic and the user |
| Where the rules come from | (a) a fixed list; (b) a ledger that grows from every user note | **(b)** `tools/autoreview/FEEDBACK.md`: one row per note, the same day | Notes that cannot be measured yet are listed as "judged by eye", with what a measurement would need |
| Frame rate | (a) 30 fps; (b) 60 fps; (c) 30 fps with motion blur | **(b) 60 fps** for anything shown to the user | Render time doubles: 211 s became 400 s for 28 s of film. Files double: about 100 MB to about 200 MB at CRF 16. 60 fps alone did not fix judder: the jog shot still moved 20 px/frame and needed a calmer camera |

## Consequences

- filmcheck stays: the reviewer calls its measures and adds its own (V picture, A sound, S voice, D plan rules).
- A shot may be exempted from the judder limit only by the director marking it `fast: true` in `direction.js`, with the reason.
  The checker itself has no exemptions.
- Its first run found four faults on a render about to be sent. ERR-0018, gestures snapping on and off since the first version,
  is the most important.
