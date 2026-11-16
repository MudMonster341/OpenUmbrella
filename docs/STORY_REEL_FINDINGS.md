# Story reels — what two successful ones actually do

**Measured 2026-11-13** with `tools/reelkit` on two reels the user supplied as references.
The videos and their frames are in `research/reels/` — **gitignored, third-party, never shipped.**
This file holds only our derived conclusions, which are ours to keep.

| Reference | Account | Runtime | Shots | Median shot | Loudness | Engagement |
|---|---|---|---|---|---|---|
| Roblox-style, "two pills" | `@zaylento` | **125.3s** | **65** | **1.73s** | −14.2 LUFS, LRA 4.3 | 357k likes, 4.5k comments |
| 2D cartoon horror, "one look" | `@what_if_animator` | **78.8s** | **44** | **1.60s** | −14.1 LUFS, LRA 2.1 | 40k likes, 1k comments |

Both 720×1280 @ 30fps. Both titled "**Part 1**" / "**Part 2**". Both end on a **binary choice put to
the viewer**.

---

## Five findings that contradict how this project has been building

### 1. Story reels are long. 79–125 seconds, not 20–40

[GOAL.md](../GOAL.md) and [REEL_STRUCTURE.md](REEL_STRUCTURE.md) are both written around 30–40s.
That budget is for *marketing* content. A story needs setup, escalation and a cliffhanger, and
these run two to four times longer. **Our duration targets are wrong for this product.**

### 2. They cut constantly. Median shot 1.6–1.7s

`engine/onecam` exists to make a cut **unrepresentable**, and `filmcheck` M4 fails any render with
a scene change. For story reels that is exactly backwards: a 125s reel has **65 cuts**.

The continuous-camera rig is not wrong — it is **the wrong product**. It belongs to the cinematic
3D film. A story reel is an edit, and we have no editing grammar at all.

### 3. The audio is a flat compressed wall, not a mix with dynamics

Both land at **−14 LUFS**, which confirms GOAL.md's A1 target. But the **loudness range is 4.3 and
2.1 LU** — extremely compressed — and the Roblox reel has **zero silence gaps over 0.35s in 125
seconds**. Narration is wall-to-wall.

This directly contradicts the swiss-motion sound spec we adopted, which calls for dropping the
drums, near-silent bars and hard stops. Those are *film* dynamics. Short-form story audio is a
constant-energy bed so it survives phone speakers at any volume.

### 4. Captions are the primary graphic element, and there are two schools

- **Word-at-a-time** (Roblox): one word, centred lower-third, bold, heavy black outline, swapping
  on the spoken syllable.
- **Phrase with one highlighted word** (cartoon): all-caps line, bottom-centre, with the single key
  word in a signal colour — `SIX of them`, `just CALLED them`.

Either way the caption is **not an accessibility afterthought**. It is the thing the eye reads
first in nearly every frame. **This is blocked for us**: word-level timing needs narration, and
narration is blocked on VoiceStudio setup.

### 5. The engagement engine is a dilemma, not a CTA

Neither reel asks for a follow. Both pose a **forced binary choice** — "two pills", "A: open up /
B: stay locked in" — and the comments are people arguing their answer. 4,545 comments on the first.

Our [REEL_STRUCTURE.md](REEL_STRUCTURE.md) CTA section is built around an ask. For story content the
ending is **a question with two defensible answers**, and the "Part N" badge promises resolution later.

---

## The production insight that decides what we can build

**The two references are not equally reproducible by us, and the difference is assets.**

**The Roblox reel is out of reach.** Its 65 shots are 65 different fully-dressed locations — a city
street, sky islands, an auditorium, a luxury district, a bedroom. That is a **game world being
filmed**. Roblox Studio supplies the library; their work is camera, voice and captions. We have no
asset library, and hand-authoring 65 dressed locations in Three.js is a season of work, not a reel.

**The cartoon reel is within reach, because most of it is interface.** Its screen time is dominated
by **UI generated from data**:

- a persistent HUD — a clock, and a **helmet battery counting 31% → 8%** as a live ticking stake
- a **standing hook banner** with a `PART 2` badge, locked over the opening while the story runs
- **diegetic screens as shots** — thermal camera feeds with heat-signature counts, temperature
  readouts, rule cards, status pills
- a **poll card** mid-film and a **terminal A/B choice card**

All of that is **code drawing a panel from a value**, which is precisely what we are already good
at — `films/reel-01-agent-loop` is 20 seconds of exactly that discipline. The hand-drawn part is a
small cast of flat 2D characters in a handful of poses, and the acting is carried by **scale** (an
extreme close-up filling the frame), not by animation.

**Conclusion: build the UI-driven story engine, not the game-world look.** A depleting resource in
the corner is cheaper to render than any character animation and does more for tension than either.

---

> **Challenged 2026-11-13 — not yet decided.** flashloop's Faceless Studio ships exactly this
> blocky look from a prompt (`market_research_and_intelligence/flashloop/FINDINGS.md` §5, §8),
> which suggests it is a **parametric kit** problem — box characters with drawn faces and a handful
> of set builders — rather than 65 hand-dressed locations. It is still large, slow to render with
> no GPU, and unproven here. ADR 0013 §3 recorded "out of reach … so it is not re-proposed"; this
> note is the evidence for reopening that, and **the decision stays the user's.**

## What is blocked, honestly

| Need | Status |
|---|---|
| Narration | ✅ **Unblocked 2026-11-13** — VoiceStudio verified; ~15× slower than real time on this CPU |
| Word-level caption timing | ⛔ `speak` returns no timings; needs a forced aligner (an install, needs approval) |
| **Account-level analysis** | ⛔ **Cannot be done.** `yt-dlp` marks `instagram:user` BROKEN; Agent-Reach's Instagram channel needs a login (Chrome cookie copy, unapproved). **Per-reel analysis works perfectly** — paste individual reel URLs |
| Character art | No illustrator, no GPU. Flat 2D with few poses is the only affordable register |

## Method note

`reelkit` handled both reels unauthenticated and first try: download → shot list → energy curve →
hook strip → frames. **Instagram download is confirmed working**, which was the open question.
The analysis that produced this file is repeatable in about two minutes per reel.
