# Reel structure — hook, meat, call to action

**Written 2026-11-13.** The shape every reel in the series is authored to, sitting on top of the
swiss-motion grammar ([ADR 0012](../decisions/0012-swiss-motion-as-the-house-style.md)).

[GOAL.md](../GOAL.md) says what good looks like. [ANIMATION_STANDARD.md](ANIMATION_STANDARD.md)
says how it should move. This says **what order the ideas arrive in**, which is the thing short-form
punishes hardest and the thing neither of the other two covers.

> Sources are named where a claim is not ours. Two were read on 2026-11-13 via the new research
> path: Meta for Business, "The Science of the Hook" (their own Reels guidance), and r/Smallyoutubechannels
> on hook-or-die retention. Treat creator-forum claims as folk knowledge that matches the platform
> guidance, not as measurement. **We have measured none of this ourselves yet** — that is what
> `tools/reelkit` and the take log are for.

---

## The shape

| Section | Budget (of a 30–40s reel) | Job |
|---|---|---|
| **Hook** | 0–3s | Buy the next five seconds. Nothing else. |
| **Turn** | 3–6s | Name the real subject and make a promise. |
| **Meat** | 6–28s | Deliver the one idea, in beats that each add something. |
| **Landing** | 28–34s | The idea, restated as a thing they now believe. |
| **CTA** | 34–38s | One ask, earned. |

**One reel, one idea.** If you cannot say it in a sentence, it is two reels.

---

## Hook — 0 to 3 seconds

The platform guidance and the creator folklore agree on the mechanism: retention in the first
seconds drives distribution, so the hook is not the introduction, it is the whole negotiation.

**Rules:**

1. **Frame 1 is already the content.** No logo, no title card, no "hey guys". The first frame of a
   swiss-motion reel is a composition mid-statement.
2. **Pick one device and commit:**
   - *Value promise* — "Your agent is slower than it needs to be. Here's the fix."
   - *Statement of intent* — "Three rules. One of them is wrong."
   - *Question / invitation* — "Why does your agent forget?"
   - *Pattern interrupt* — the grid builds, then one element is already off it.
   - *Open loop* — show the ending state first, unexplained.
3. **Readable silent.** Most views start muted. The hook must land as text and composition alone.
4. **Under 9 words on screen.** GOAL.md T1 already caps word count; the hook is where it matters most.

**In swiss-motion specifically,** the strongest hook device is the style's own: **the exception**.
The grid snaps into place in the first half-second, and one element is visibly not obeying it. The
viewer's eye goes to the thing that is wrong, which is exactly the attention we need — and it sets
up the whole film, because the exception is the subject.

**Anti-patterns:** a slow build to a reveal; a title; the signal colour withheld; anything that
needs sound.

---

## Turn — 3 to 6 seconds

The hook bought attention on a promise. The turn says what the promise is about. One line, flush
left, large. This is where the topic is named.

---

## Meat — 6 to 28 seconds

**Segment into beats, one idea per beat**, each beat a rule applied to one artifact. This is
literally swiss-motion's "programme" native move: rules applied one by one, then the same programme
generating many outputs.

- **3 to 5 beats.** Fewer feels thin, more cannot breathe in 22 seconds.
- **Each beat adds, never restates.** If a beat can be cut without loss, cut it.
- **Energy is allowed to dip** — but only once, and only just before the landing. A dip is how the
  landing gets its lift. Measure it: `reelkit`'s `energy.json` makes the curve visible.
- **The hardest beat goes at the peak**, not first. swiss-motion's own guidance: put the strongest
  native power (the grid *meaning* something) at the peak.

---

## Landing — 28 to 34 seconds

Restate the one idea, now as something the viewer believes rather than something being claimed.
In this style that is usually **extreme scale contrast**: the idea as a giant element, flush left,
with the tiny technical notes that earned it still in the corner.

---

## CTA — 34 to 38 seconds

**One ask.** Not three. The most common failure is stacking "follow, comment, share, link in bio",
which converts worse than any one of them alone.

- It must be **earned by the meat**. A reel that taught nothing has not bought the right to ask.
- It should be **the natural next step of the idea**, not a generic growth ask.
- In swiss-motion: the CTA is a composition, not a bar slapped on the end — a single word or short
  phrase flush left in the corner, which §11 names as a legitimate ending.
- **The exception can deliver it.** If one element has broken the grid all film, having it leave the
  frame on the CTA is an ending the style explicitly offers.

---

## The per-reel brief

Every reel starts as a filled copy of this, before any code:

```markdown
# <reel name>

**One idea:** <one sentence. If you need two, it is two reels.>
**Signal colour:** <one, chosen for the topic>
**The system:** <what the grid means here>
**The exception:** <the one element that breaks it, and why that is the subject>

| Section | Time | On screen | Words |
|---|---|---|---|
| Hook | 0–3s | | |
| Turn | 3–6s | | |
| Beat 1 | | | |
| Beat 2 | | | |
| Beat 3 | | | |
| Landing | | | |
| CTA | | | |

**Styles used:** swiss-motion (lemo-opuscar, CC BY-NC 4.0) — non-commercial, attribution required.
```

---

## How this gets better

This document is a **hypothesis**, not a finding. The loop that corrects it:

1. `tools/reelkit ingest <url>` on reels that work → shot lists, energy curves, hook strips.
2. Fill the `REVIEW.md` by **looking**, naming the hook device and the beat structure.
3. When ten reviews agree on something this document contradicts, change this document and say so
   in MEMORY with the date.

Nothing here should survive on authority. It survives on measurement or it gets rewritten.
