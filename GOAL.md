# GOAL — the standard everything is judged against

**Set:** 2026-11-12 · Owner: Mustafa · Executed by: the agent

---

## 1. North star — the film we are making

**"Claude in Paris"** — a vertical short in which Claude, as a character, travels the world and
arrives in Paris, delighted and excited to be there.

| Spec | Value |
|---|---|
| Format | 9:16 vertical, 1080×1920 |
| Duration | 30–40s (hard ceiling 45s) |
| Frame rate | 30fps locked (60fps only if the whole chain holds it) |
| Visual language | Stylized 3D — low-poly / miniature-diorama Paris. **Not photoreal** ([ADR 0006](decisions/0006-stylized-3d-over-photoreal.md)) |
| Camera | **One continuous move. Zero hard cuts.** The shot travels; it never jumps |
| Character | Claude as an expressive figure with a clear emotional arc: anticipation → arrival → delight |
| Audio | Local TTS narration + music bed + SFX accents |
| Captions | Word-level synced, burned in |
| Cost | $0. No paid providers |

**The story must be a story.** A beginning, a middle and an end; a character who wants something
and gets it. A camera gliding past landmarks with narration over it is a screensaver, not a film.

This is deliberately ambitious. It forces every weak part of the stack into the open at once:
3D, character acting, continuous camera, narration, captions, sound, and pacing.

---

## 2. The quality bar — measurable, not vibes

A render that fails any **Blocker** is not shown. Warnings are logged and argued, not ignored.

### Motion (Blocker)

| # | Standard | How it is checked |
|---|---|---|
| M1 | **No dead frames.** No interval ≥ 400ms where nothing on screen changes | Frame-diff scan across the render |
| M2 | **Varied easing.** Elements moving together do not share one default curve. Curve per move, timing derived from distance | Review of the composition source |
| M3 | **Overlap, not stagger.** Motion reacts to prior motion; nothing enters on a uniform metronome | Critic pass on the render |
| M4 | **Continuous camera.** Zero hard cuts in this film | Scene-change detection must find none |
| M5 | **Motivated motion.** Every move has a cause — a beat, a sound, a narrative reason | Critic pass |

### Typography and density (Blocker)

| # | Standard |
|---|---|
| T1 | **≤ 7 words on screen at any instant**, captions included |
| T2 | **One idea per beat.** No beat carries two claims |
| T3 | Text supports the image; it never *is* the content. If removing all text destroys the film, the film is a slide deck |
| T4 | Captions ≤ 3 words per card, word-level synced, never covering the subject's face or the focal object |

### Audio (Blocker)

| # | Standard |
|---|---|
| A1 | Integrated loudness **−14 LUFS ±1** (social delivery standard), true peak ≤ −1 dBTP |
| A2 | Music ducked **≈9 dB** under narration; music is never the loudest thing under a voice |
| A3 | **≥ 3 SFX accents** landing on actual motion events, not sprinkled |
| A4 | Music ends **on** the final frame — back-timed, not faded out arbitrarily |
| A5 | No silence > 1.5s unless it is a deliberate, held beat |

### Technical (Blocker)

| # | Standard |
|---|---|
| X1 | 1080×1920, locked frame rate, h264 + aac, no dropped or duplicated frames |
| X2 | Duration within ±3s of target |
| X3 | No black frames, no broken overlays, verified by sampling ≥ 4 positions |
| X4 | Renders reproducibly from committed source — no hand-edited intermediate files |

### Craft (Warning — argued, not auto-failed)

| # | Standard |
|---|---|
| C1 | One accent colour, defined in a token set; perceptual (OKLCH) interpolation for gradients |
| C2 | Emotional arc readable **with the sound off** |
| C3 | First 2 seconds establish place and tone — no logo-first openings |
| C4 | Nothing on screen that a motion designer would call a default (stock spring, centred fade-in, generic drop shadow) |

---

## 3. The loop — build, then judge, separately

**The builder never grades its own work.** A fresh critic pass examines the *actual render*, not
the plan, not the intent, and not the source code.

```
Gate 0  BRIEF        one paragraph + the emotional arc              → human approves
Gate 1  BEAT SHEET   every beat: seconds, what moves, what is said  → human approves
Gate 2  STILLS       key frames as images, contact sheet            → human approves   ← cheapest place to kill a bad look
Gate 3  SILENT CUT   full motion, no audio                          → automated checks + critic → fix list
Gate 4  FULL MIX     narration, music, SFX, captions                → automated checks + critic → fix list
Gate 5  SHIP         standards table filled in with measured values  → human approves
```

**Rules of the loop:**

1. Gates 3 and 4 run automated checks **first** (frame-diff, scene-change, loudness, ffprobe),
   because a machine finds dead frames and loudness errors faster and more honestly than an eye.
2. Then a critic pass, which must produce a **numbered fix list with timecodes** — "the title at
   0:04 lands on nothing" — never "feels a bit flat".
3. **Maximum 2 fix rounds per gate.** A third round means the problem is in the gate above; go back
   to the beat sheet rather than polishing a broken structure.
4. Every gate records its measured values. "Passed" without numbers is not passed.
5. Failures that cost real time get an [ERRORS.md](ERRORS.md) entry while the cause is still known.

---

## 4. Known risks on this goal — stated up front

| Risk | Severity | Reality |
|---|---|---|
| **Expressive 3D character** | **High** | A rigged, acting 3D character is genuinely hard without a GPU, an artist, or a paid generative model. Most likely compromise: a stylized 2D character composited into the 3D scene, or a simple low-poly figure carried by motion and silhouette rather than facial detail |
| **No GPU** | High | Three.js in headless Chrome is fine for stylized 3D; Blender Eevee will be slow. Budget render time in tens of minutes, not seconds |
| **Continuous camera + story** | Medium | Harder than cutting. It is also the single thing that will make this look authored rather than generated — worth the cost |
| **Narration quality** | Medium | Piper is serviceable but flat for a character who is *excited*. Drives [ADR 0004](decisions/0004-voicestudio-as-narration-engine.md) |
| **Scope** | Medium | 40 seconds of continuous stylized 3D is a lot for a first original film. If it stalls, the fallback is the same story at a smaller scale — fewer landmarks, tighter arc — not a lower quality bar |

---

## 5. Beyond the first film

The Paris film is a **capability test**, not the point. The point is the series: short films about
using Claude and agents well. Once it passes Gate 5, the reusable parts — style tokens, camera
rig, character, caption treatment, audio chain — are frozen into a house style so film #2 starts
from film #1's taste instead of from zero.

Planned subjects, in [ROADMAP.md](ROADMAP.md) Phase 6: what an agent loop actually is, working with Claude on
real work, and what happens when you type a prompt.
