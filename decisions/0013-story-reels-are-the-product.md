# 0013 — Story reels are the product; the UI-driven engine is how we build them

**Date:** 2026-11-13
**Status:** Proposed — the direction is the user's and is settled; the *engine choice* in §3 is
the part awaiting a built prototype.
**Amends:** [0012](0012-swiss-motion-as-the-house-style.md). Does not supersede it — see §4.

## Context

The user's direction, stated 2026-11-13: *"the goal is story sort of content, not marketing content
like you made above. I want to animate stories I make up."* They supplied two reference reels and
asked for an analysis engine so this can be repeated as market research.

`films/reel-01-agent-loop` is a marketing reel — one idea, 20 seconds, a CTA. It is not the product.

Both references were measured with `tools/reelkit`. Full numbers and reads in
[docs/STORY_REEL_FINDINGS.md](../docs/STORY_REEL_FINDINGS.md).

## 1. What the references proved

| | `@zaylento` (Roblox) | `@what_if_animator` (2D cartoon) |
|---|---|---|
| Runtime | 125.3s | 78.8s |
| Shots / median | 65 / **1.73s** | 44 / **1.60s** |
| Loudness | −14.2 LUFS, LRA **4.3** | −14.1 LUFS, LRA **2.1** |
| Silence gaps >0.35s | **0, in 125s** | 8 |
| Ending | "Part 1", forced choice | "Part 2", A/B choice |

## 2. Four of our standards are wrong for this product

1. **Duration.** GOAL.md and REEL_STRUCTURE.md assume 30–40s. Stories run **79–125s**.
2. **Cuts.** `engine/onecam` makes a cut *unrepresentable* and `filmcheck` M4 fails any scene
   change. Story reels cut every ~1.6s. **onecam is not wrong, it is the wrong product** — it
   belongs to the cinematic 3D film. We have no editing grammar at all, and need one.
3. **Audio dynamics.** We adopted swiss-motion's sound spec — hard stops, near-silent bars, drop
   the drums. The references are the opposite: a flat compressed wall, never a pause.
4. **The ending.** Our CTA section assumes an ask. These end on a **dilemma with two defensible
   answers**, which is what produced 4,545 comments on one reel.

## 3. The decision: build the UI-driven story engine

**The two references are not equally reproducible, and the difference is assets.**

The Roblox look is **out of reach**. Its 65 shots are 65 dressed locations — a filmed game world.
Roblox Studio is the asset library. We have none, and hand-authoring that in Three.js is a season
of work. Recording this plainly so it is not re-proposed.

The cartoon look is **within reach, because most of its screen time is interface**: a persistent
HUD with a clock and a **helmet battery counting 31% → 8%** as a live ticking stake; a standing
hook banner with a Part badge; thermal-camera feeds, rule cards and status pills **as shots**; a
poll card and a terminal A/B choice card. All of that is *code drawing a panel from a value* —
exactly the discipline `films/reel-01-agent-loop` already demonstrates.

**So: a story-reel engine whose primitives are UI, not animation.** A depleting resource in the
corner costs nothing to render and does more for tension than character animation we cannot afford.
Characters stay flat 2D in a handful of poses, and **scale carries the acting** — an extreme
close-up filling the frame, which is also the fix for the character-scale failure that sank Paris.

Rejected: cloning the Roblox look (no asset library); full character animation (no illustrator, no
GPU); continuing with marketing-shaped reels (not what the user wants).

## 4. What happens to swiss-motion and ADR 0012

ADR 0012 stays **Proposed** and is **not** adopted as the house style for story reels. The user's
verdict on reel-01 was that they want *"a more animated style"*, which is a fair read of a grammar
that is static between snaps by design.

What survives from it, and should be carried into the story engine:

- the **grid discipline** and typographic rigour — the reference HUDs are grid-built too
- **one signal colour**
- **tempo that divides the frame rate** (the 24fps finding); the references are 30fps
- **entrances as wipes and clip-reveals, never fades**

What does not survive: snap-and-hold as the whole motion vocabulary, and the dynamic sound spec.

`films/reel-01-agent-loop` is kept as a worked example of code-drawn 2D, not as the house style.

## 5. filmcheck needs splitting by product

One gate cannot serve both. Required changes, none built:

| Standard | Cinematic 3D film | Story reel |
|---|---|---|
| M4 cuts | 0 — a cut is a failure | **~1.6s median expected** — *absence* of cuts is the failure |
| X2 duration | 30–40s | **60–130s** |
| M1 dead frames | 0.4s, and it works | Whole-frame detection already proven blind to small motion ([ADR 0012](0012-swiss-motion-as-the-house-style.md)) — needs the event-gap check instead |
| A1 loudness | −14 LUFS | −14 LUFS **and LRA < 5** — flatness is a requirement, not a defect |

## 6. Consequences

- A new product line in `films/`, with its own structure doc; REEL_STRUCTURE.md is retained for
  marketing reels and must not be applied to stories.
- **Narration and captions become the critical path, not a nice-to-have.** Captions are the primary
  graphic element in both references. This makes the VoiceStudio blocker the single most expensive
  open item in the project.
- `tools/reelkit` is validated as the research instrument — both reels analysed unauthenticated,
  first try, ~2 minutes each.
- **Account-level analysis is not possible** (`instagram:user` broken upstream; Agent-Reach needs a
  login). Research proceeds per-reel from pasted URLs.
