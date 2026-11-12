# Zombie Apocalypse — Part 1: "The Ration"

**Gate 0 brief.** Status: awaiting approval. Nothing built yet.

---

## The story

A human (you) and Claude are locked inside one room. Outside is wrong. Inside, there is a shelf,
and on the shelf is less food than two people need. They divide it anyway.

Part 1 of a series. It ends on a promise, not a resolution.

## Why this setting, deliberately

The Paris film failed on character scale: Claude was a 40-pixel capsule in a 40-unit city, so the
"happy and excited" in the brief never reached the screen ([ANIMATION_STANDARD §2](../../docs/ANIMATION_STANDARD.md)).

**One room fixes that by construction.** Two characters, close camera, a handful of objects. Fewer
things to model means every one can be good. A single practical light source means real shadows and
real mood instead of flat daylight. And a confined space is the right shape for a continuous camera
— the move becomes a prowl around a room rather than a flight over a city.

It is also the correct genre instinct: apocalypse horror is about what you *cannot* see.

## Specification

| | |
|---|---|
| Format | 9:16, 1080×1920 |
| Duration | 30–40s |
| Frame rate | **60fps final** (30fps drafts) — [ANIMATION_STANDARD §1 R5](../../docs/ANIMATION_STANDARD.md) |
| Camera | One continuous move, zero cuts (`engine/onecam`) |
| Look | Low-key. One practical light. Deep shadow, desaturated except the lamp and Claude's orange |
| Audio | Narration (VoiceStudio), sparse. Room tone, not a music bed |
| Captions | Word-level, burned in |
| Cost | $0 |

## The reads — what the viewer must understand, in order

Per [ANIMATION_STANDARD §3](../../docs/ANIMATION_STANDARD.md). Each read gets time to be found,
understood, and to register. Shot length follows from the reads, not the other way round.

| # | Read | How it is shown | Approx |
|---|---|---|---|
| 1 | **Something has gone wrong outside** | Light through a boarded window. A shape passes it. We never see it clearly | 0–5s |
| 2 | **Two people are in here** | The camera finds them: the human, then Claude. Both still, both listening | 5–11s |
| 3 | **There is almost no food** | The shelf. The camera holds on it long enough to count — and it is countable. That is the point | 11–17s |
| 4 | **They are dividing it** | Hands. Cans moved into two small piles. One pile is slightly larger, and it is not Claude's | 17–26s |
| 5 | **Claude notices, and says nothing** | A look between them. The read is the *reaction*, not the act | 26–32s |
| 6 | **It is not over** | A sound outside. Both heads turn. Cut to black on the turn, not after it | 32–36s |

Read 5 is the film. Reads 1–4 exist to earn it. If 5 does not land, the rest was decoration.

## Narration — sparse

Five lines, not a voiceover carrying the plot. The image carries the plot; the voice carries what
the image cannot.

> 1. "Day nine."
> 2. "We stopped counting the ones outside."
> 3. "Six cans. Two of us."
> 4. *(no line — the division plays silent)*
> 5. "He gave me the bigger pile."
> 6. "He didn't mention it."

Note read 4 is deliberately unnarrated. The silence is the point, and it is also
[ANIMATION_STANDARD §5](../../docs/ANIMATION_STANDARD.md): show it, don't say it.

## The two characters

This is the part that has to improve most, and the part most likely to fail.

- **Scale:** at least two shots where a character fills a third of the frame. Non-negotiable.
- **Readable in silhouette** against the lamp. The whole look is backlit; if the pose does not read
  as a black shape, it does not read.
- **Acting, not idling:** anticipation → action → hold. Expressions never snap.
- **Distinct silhouettes** so the two are never confused in the dark — different height, different
  posture, different stillness.
- **Claude is orange** (#d97757) and is the only warm thing in the frame besides the lamp. That is
  the whole colour story.

**Open question, to settle with a cheap prototype before committing:** stylized low-poly 3D
characters, or 2D characters composited into the 3D room (the `ClaudeAnimationBase` approach, MIT
so we may use it directly). Backlit silhouette work may make 2D the stronger and far cheaper
option. Prototype both, pick with eyes, not with theory.

## Render recipe — the upgrades, applied here first

Everything in [ANIMATION_STANDARD §1](../../docs/ANIMATION_STANDARD.md), in priority order:

1. 60fps final + motion blur on the camera move
2. Shadow-casting key from the practical lamp, 4096 map, shadow camera sized to the shot
3. `NeutralToneMapping` with exposure — mandatory for low-key work, which is all highlight rolloff
4. `EffectComposer`: bloom ~0.4 on the lamp, Bokeh on the close shots
5. Env map for subtle fill and reflections in the dark
6. Per-instance variation on the cans and clutter, grain at the encode

Low-key lighting is the most forgiving look available to us: shadow hides the lack of detail that
the Paris daylight exposed. That is a real advantage of this story, not a dodge.

## Risks

| Risk | Severity | Note |
|---|---|---|
| Character quality | **High** | Still the hardest problem. Prototype before committing |
| 60fps + post-processing on 7.7 GB RAM and integrated graphics | **High** | Render time will be minutes. Draft at 30fps, final at 60. Measure early |
| Low-key render on an iGPU | Medium | Shadows and bloom cost. May need to cap shadow map at 2048 |
| 30–40s with six reads | Medium | Honest check: six reads may not fit in 36s. If so, cut read 1 or 2 — never compress read 5 |

## Gates

Standard six from [GOAL.md](../../GOAL.md). Gate 2 stills are mandatory before any full render:
four framing passes on the Paris film were all caught by looking at frames, none by the automated
check.
