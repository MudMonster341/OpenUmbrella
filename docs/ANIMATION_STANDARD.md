# Animation standard — why the Paris film looks basic, and what fixes it

Written 2026-11-13 after reviewing the Paris prototype against what the installed reference repos
actually do. This is the craft layer that [GOAL.md](../GOAL.md) assumes and does not contain.

**The uncomfortable finding:** `filmcheck` scored the Paris render **0% motionless, 0 cuts — a
pass** — and it still looks amateur. The metric is necessary and nowhere near sufficient. It
measures whether pixels change. It cannot measure whether the image is *beautiful*, whether the
character is *acting*, or whether the timing lets a viewer *understand* anything.

So this document is the other half: the things that make 3D read as made rather than generated.

---

## 1. The render is flat — six missing techniques

Every one of these is in the Paris film's `index.html` as a default, and defaults are what make
generated work look generated.

| # | What we have | What it needs | Why it matters |
|---|---|---|---|
| R1 | **No shadows at all** (`castShadow` never set) | A key light that follows the look point, a shadow camera sized to the camera's distance, a 4096 map | Without contact shadows every object looks pasted on, floating. This is the single biggest "it looks fake" cue |
| R2 | **No tone mapping** (linear output) | `NeutralToneMapping` or ACES, with exposure | Linear output crushes highlights and washes midtones. Tone mapping is most of what people read as "cinematic colour" |
| R3 | **No environment map** — one hemisphere + one directional light | An equirect HDR used for reflections and ambient | Flat shading on every surface. Materials have nothing to reflect, so metalness and roughness do nothing |
| R4 | **No post-processing** | `EffectComposer`: bloom ~0.4, Bokeh/DoF on close shots | No bloom means no light bleed, no glow, no sense of real exposure. No DoF means everything is equally sharp, which reads as a video game from 2005 |
| R5 | **30fps, no motion blur** | 60fps for finals; motion blur on fast moves | **This is the remaining "choppy".** A continuously moving camera at 30fps with hard-edged geometry and zero blur judders. 0% motionless and still choppy is exactly this |
| R6 | **Flat untextured surfaces, one material per type** | Per-instance colour variation, subtle roughness variation, grain added at the ffmpeg stage | Large flat areas of identical colour are what make it look like a blockout. Variation reads as detail |

**On grain:** added in the encode, not drawn in the page — drawing it per frame makes every frame
incompressible and slow. And to be explicit, since we already refused this once: grain is for the
*look*. It must never be the thing that gets a render past the motionless check.

## 2. The character is the biggest single failure

Claude is a capsule and a sphere, roughly 1.5 units tall in a 40-unit-wide world, and in most
shots occupies perhaps 2% of the frame.

The rule from the character-animation reference, which is worth taking literally: **in a medium
shot the character should be large — tens of units on a scale where the character itself is about
10 wide. Tiny characters are for wide establishing shots only, and never for a whole film.**

Our film is 100% wide establishing shot. Nobody can read an emotion on a 40-pixel capsule, so the
"happy and excited" in the brief never arrives on screen at all.

What a character needs to carry a film:

- **Scale.** At least one shot where the character fills a third of the frame.
- **A face that acts.** Expressions change through anticipation → squint → take → overshoot, never
  by snapping between two states. A snap reads as a bug.
- **Idle motion per emotion.** Not one generic bob: excitement idles differently from fear.
- **Silhouette.** The pose should be readable as a black shape. If it is not, no amount of
  rendering saves it.
- **Reaction, not just action.** Cause, then reaction, in sequence — never simultaneously. The
  reaction is usually the part that lands.

## 3. Timing — the failure mode of generated animation

The sharpest observation in any of the references, and it describes our film exactly:

> everything moves at one brisk speed, events pile on top of each other, and moments are over
> before anyone understands them

Our camera moves at a near-constant rate for 15 seconds. There is no rhythm because there is no
contrast.

**Write the reads.** For every shot, list in order what the viewer must understand. Each item is a
*read*, and each needs time to find, time to understand, and a beat to register before the next
begins. Then:

- **One read at a time.** Two things at once means the viewer sees one of them.
- **Fast actions, slow meanings.** A move can be quick if it is anticipated; what it *means* needs
  held time. Rush what does not matter, spend time on what does. That contrast *is* rhythm.
- **Lead the eye** before an important read — a look, a camera move, something lighting up — and
  give the eye time to arrive.
- **The reads set the shot length**, not the other way round. Including the last shot: its final
  read needs time to land before the film ends.

## 4. Everything on one pulse

One BPM drives every idle, bounce, camera accent and cut, so the film shares a heartbeat even
before music exists. Visual hits land on beats; a cue check compares each visual hit against the
beat it should land on, and the target is 0 ms.

This is also how the audio gets added later without a re-time: one timeline is the single source of
truth for picture, score, foley and subtitles.

## 5. Show it, don't write it

Our Paris film ends on a title card that says "Claude in Paris" over a shot of Claude in Paris. The
card is telling the viewer what they can already see.

The rule: no captions, no labels, no signs that restate the story. If the character is lost, show
them turning the map upside down — do not show a sign reading "lost". Reactions are painted marks
and body language, not letters. Burned-in narration captions are a separate, legitimate thing; a
decorative title that repeats the image is not.

## 6. Transitions at every seam

Never start on a hard frame and never simply stop. That applies to a continuous-camera film too:
the opening needs a way in and the ending needs a way out, even without cuts.

---

## The upgrade list, in order of visible return

1. **60fps + motion blur** — fixes the perceived choppiness that survived `filmcheck`
2. **Shadows + tone mapping** — the two biggest "is this real" levers, cheap to add
3. **Character scale and acting** — the difference between a diorama and a story
4. **Timing with written reads** — the difference between footage and a film
5. **Env map + bloom + DoF** — polish, meaningful only once 1–4 are done
6. **Per-instance variation + encode grain** — the last 10%

Measured cost warning: headless Chromium draws WebGL on SwiftShader (software) unless the GPU is
explicitly enabled, and the difference measured in the reference work was **652 ms versus 168 ms
per frame**. Our renders report `hardware gpu`, so we are on the fast path — but 60fps at 1080×1920
with post-processing on a 7.7 GB machine with integrated graphics will still be slow. Budget
minutes per draft, not seconds, and render drafts at 30fps.

---

## Where this came from

Studied from the reference repos in `vendor/`, expressed here as our own standard — see
[ADR 0008](../decisions/0008-learn-styles-then-author-our-own.md). No prompt text or source was
copied. The 3D lighting and performance findings come from onetake's 3D reference; the character,
timing and "alive" principles from ClaudeAnimationBase's animation guide; the one-timeline and
loudness pipeline from lemo-opuscar's technique document. Each is credited in
[REPO_PLAYBOOK.md](REPO_PLAYBOOK.md) with its licence.
