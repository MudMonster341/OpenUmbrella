---
status: accepted
date: 2026-11-12
authored_by: human
derived_from: ["user instruction 2026-11-12: \"we dont need api keys no, you are there\"", "measured capability envelope"]
supersedes: null
superseded_by: null
---

# 0002 — Zero paid API keys is the default operating mode

## Context

OpenMontage supports 60+ providers across image generation, video generation, TTS and music, nearly
all of them paid. The user's instruction was explicit: no API keys — the agent itself is the
intelligence layer.

This is viable because the LLM orchestration is the Claude Code session, which needs no key of its
own. Measured envelope with zero keys on 2026-11-12: `video_post 9/10`, `character_animation 6/6`,
`audio_processing 2/2`, `subtitle 2/2`, `screen_capture 2/2`, `analysis 7/14`, `tts 1/19`, and
**`0/31` image generation, `0/35` video generation, `0/8` music generation**.

The hardware reinforces it: Intel integrated graphics only, so local generative video models (WAN,
Hunyuan, CogVideo, LTX) are also out. Generated motion is therefore unavailable at any price we are
willing to pay.

## Options considered

1. **Zero keys, local-first** — composition, narration, subtitles, editing and character animation
   all work. Generated imagery and generated motion do not.
2. **One gateway key (`FAL_KEY`, ~$0.15–$1.50 per video)** — unlocks FLUX images and Veo/Kling
   video. Cheap per film, but makes every production depend on a metered external service and
   invites reaching for generation instead of craft.
3. **Full provider set** — maximum capability, recurring cost, and a strong pull toward
   "prompt it and hope" over authored work.

## Decision

**Operate with zero paid API keys.** Everything is built from code-driven composition, local TTS,
open archives and free stock. A paid provider is a per-case proposal with a stated cost, never an
assumption.

The constraint is also useful: it forces authored motion design, which is what the quality bar in
[GOAL.md](../GOAL.md) actually rewards. Generated clips would not have passed those standards
anyway without the same amount of direction.

## Consequences

- **Easy:** zero marginal cost per film, full reproducibility, no vendor dependency, no rate
  limits, nothing leaves the machine.
- **Hard / given up:** no photoreal imagery, no generated motion, no premium cloud voices. Every
  visual must be constructed, which is slower and demands real craft. This directly drives
  [ADR 0006](0006-stylized-3d-over-photoreal.md).
- **Tripwire:** if a specific film is impossible without generation *and* worth the money, propose
  a scoped key with a spend cap for that production — do not quietly add keys to the default stack.

## Links

- Related: [ADR 0006](0006-stylized-3d-over-photoreal.md), [ADR 0004](0004-voicestudio-as-narration-engine.md)
