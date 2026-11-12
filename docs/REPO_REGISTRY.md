# Repo registry — every third-party component considered

**Last verified:** 2026-11-12 (star counts read directly from each GitHub page on that date).

Governed by [ADR 0003](../decisions/0003-approval-gate-for-third-party-code.md): nothing is
installed without explicit per-item approval, and **rejections are recorded too**, so a rejected
option is never re-proposed blind.

**Rating** is fitness *for this project* — the zero-key, no-GPU, possibly-commercial context of
[GOAL.md](../GOAL.md) — not general quality. A great repo can rate low here.

---

## License key

| Symbol | Meaning |
|---|---|
| 🟢 | Permissive (MIT, Apache-2.0) — safe for commercial output |
| 🟡 | Copyleft (AGPL/GPL) — safe to use; obligations only if we host or distribute it |
| 🔴 | **Non-commercial or source-available** — cannot be used for commercial output as licensed |

---

## 1. In use

| Repo | Stars | License | Cost | Rating | Notes |
|---|---|---|---|---|---|
| [OpenMontageInc/OpenMontage](https://github.com/OpenMontageInc/OpenMontage) | — | 🟡 AGPLv3 | $0 | **9/10** | The production spine. [ADR 0001](../decisions/0001-openmontage-as-production-spine.md). Graded CAUTION by one community catalog (README/install-step grade, not a code audit) |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | **83.3k** (7.7k forks, 7,083 commits) | 🟢 Apache-2.0 | $0 local | **9/10** | HTML/CSS/GSAP → deterministic MP4 via headless Chrome + FFmpeg. ~450 blocks, Three.js/Lottie/Anime.js adapters, CLI, Studio. **Already installed** (CLI 0.9.39) as an OpenMontage runtime. Pro tier adds HeyGen models — not needed, not used. The right home for the Paris film's 3D |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | — | ⚠️ source-available | $0 under 3 people | **7/10** | React composition engine, installed via OpenMontage. **Not open source**; commercial use needs a company license above the free tier. Fine now, worth watching |

---

## 2. Rated from the reference reel — 2026-11-12

The five the user identified, in rating order.

### 🥇 hyperframes — see "In use" above. **9/10**

The strongest of the five and already in the stack. Nothing to approve.

### 🥈 [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) — **6/10** ⚠️ license-split

**15.2k ⭐** · 1.9k forks · 141 commits · 🔴/🟢 **mixed per file** — code MIT, **docs and style
prompts CC BY-NC 4.0**, demo films CC BY 4.0 · $0

99 film styles, each a style prompt plus a demo film, "made entirely in code by Claude Opus 5.5,
with no video model" — canvas/WebGL rendered frame by frame, with TTS narration (Kokoro, local),
music from free sample libraries, and mixing. Needs Node 20+, FFmpeg 7+, Python 3.11+. Three of the
99 styles need an image generator; the other 96 do not. Budget 30–60 minutes and significant tokens
per film.

**Why it rates 6 and not 9:** the **style prompts are the product, and they are CC BY-NC 4.0**.
Technically outstanding and perfectly legitimate for personal or learning use — but if these videos
are ever commercial, the valuable half of this repo cannot be used. That restriction is not
mentioned anywhere it gets shared.

**Verdict: pending approval — personal/non-commercial use only.**

### 🥉 [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) — **6/10**

**2.9k ⭐** · 285 forks · 15 commits · 🟢 MIT · $0, fully local

A starter kit for animating a hand-painted cartoon character ("Clawd") with p5.js + p5.brush: 31
acted emotions, multiple views, a model-facing animation guide, contact-sheet review, output to
`out/video.mp4`. Needs Node, Chrome, FFmpeg. No API key.

**The interesting one for our goal** — it is the only candidate that directly addresses *an
expressive Claude character with an emotional arc*, which [GOAL.md](../GOAL.md) identifies as the
highest risk. Two problems: it is **2D hand-painted, not 3D**, and watercolour fills render in
"seconds per frame" without a GPU — which we do not have.

**Verdict: pending approval — strong candidate for the character prototype in Phase 3.3, possibly
as a 2D character composited into the 3D scene.**

### 4. [feitangyuan/onetake](https://github.com/feitangyuan/onetake) — **5/10** 🔴 non-commercial

**4.1k ⭐** · 283 forks · 21 commits · 🔴 **PolyForm Noncommercial 1.0.0** · $0 non-commercial,
**$79 one-time for commercial use**

One continuous camera move, each beat growing out of the previous one; rendered HTML composition
with motion blur and an automated continuity check (`scripts/verify_promo.py`). Local-only
dependencies: Playwright/Chromium, numpy, scipy, Pillow, FFmpeg, Node; optional narration via
Kokoro TTS + faster-whisper. Drafts 1080p30, finals 4K60.

**Technique-wise this is exactly our "no cuts" requirement**, and `verify_promo.py` is precisely
the kind of automated continuity check Gate 3 needs. But PolyForm Noncommercial is **not an open
source license** and forbids commercial use as granted.

**Important:** the *technique* — one continuous camera, beats growing out of each other — is an
idea, not licensed IP. We can build that ourselves regardless.

**Verdict: pending approval, non-commercial only — or $79 if these films go commercial. Adopt the
technique independently either way.**

### 5. [pyang5166/gbro-collage-broll](https://github.com/pyang5166/gbro-collage-broll) — **3/10** ❌

**1.9k ⭐** · 169 forks · **3 commits** · 🟢 MIT · **requires a paid `GEMINI_API_KEY`, billed per
use**

Turns a ~5s voiceover line into a halftone paper-collage B-roll clip via a three-gate approval
flow. Default output 9:16, 5s, 720×1280, 24fps, silent.

**Recommend rejecting.** It violates [ADR 0002](../decisions/0002-zero-key-local-first-default.md)
(paid Gemini video generation per clip), its Gate 2 still-frame step leans on Codex's built-in
`image_gen` with no stated Claude Code path, output is 720p in a 1080p pipeline, and it is 3
commits old. The paper-collage look is also a different aesthetic from the stylized 3D in
[ADR 0006](../decisions/0006-stylized-3d-over-photoreal.md).

**Verdict: not recommended.** Awaiting the user's call; recorded here so it is not re-proposed.

---

## 3. Narration

| Repo | Stars | License | Cost | Rating |
|---|---|---|---|---|
| [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio) | **109k** (12.1k forks, 7,754 commits) | 🟡 AGPL-3.0 | $0 local | **9/10** |

User-proposed, URL given as `debpalash/voicestudio` — GitHub resolves it to `debpalash/VoiceStudio`,
same repo. A fully local ElevenLabs alternative: voice cloning from a reference recording, voice
design from a text description, dubbing, transcription, 646 claimed languages. Default engine
OmniVoice (`k2-fsa/OmniVoice`); also CosyVoice, and faster-whisper/whisper.cpp for ASR. Desktop app
plus a local API on `127.0.0.1:3900`, a `cli/` directory and MCP integration. Runs on CPU, "just
slower"; CUDA/Metal/Vulkan where available. Models download on first use, with a prompt first.

**Decided: adopt** — [ADR 0004](../decisions/0004-voicestudio-as-narration-engine.md). Piper stays
as the draft fallback.

**Two things to settle on install:** (1) whether it emits **word-level timestamps or SRT**, which
captions depend on as a Blocker standard; (2) the install method — the vendor one-liner
`irm https://voicestudio.sh/install.ps1 | iex` executes a remote script and needs its own approval.
Docker (`ghcr.io/debpalash/voicestudio:stable`) and a source build are the alternatives.

**AGPL-3.0** is fine for producing videos. It only bites if the system is ever exposed as a network
service to others.

---

## 4. Motion-design craft — researched 2026-11-12, all pending approval

Full reasoning in [MOTION_QUALITY_PLAN.md](MOTION_QUALITY_PLAN.md). These target the diagnosed
cause of the choppy demos: no motion grammar, no pacing discipline, and nothing judging the render.

| Repo | Stars | License | Cost | Rating | What it adds |
|---|---|---|---|---|---|
| [echris6/motion-video-kit](https://github.com/echris6/motion-video-kit) | 1.4k | 🟢 MIT | $0 | **8/10** | Critic loop (builder ≠ judge), motion grammar with pacing numbers, measurable quality bar incl. a frozen-frame detector, sound-design guidance. Closest match to our Gate 3/4 needs. 7 commits |
| [iart-ai/motion-design-skills](https://github.com/iart-ai/motion-design-skills) | 227 | 🟢 MIT | $0 | **7/10** | Easing/timing principles, art direction and restraint, beat-sync editing, OKLCH colour. Engine-agnostic. 22 commits |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | 6.9k | — | $0 | **6/10** | Official Remotion agent skills; lowest-risk quality bump on the Remotion path |
| [vincentsch/explainroo](https://github.com/vincentsch/explainroo) | 1.2k | — | $0 | **6/10** | Canvas explainer renderer with Kokoro voice and **Whisper word-level timing** — relevant to the caption standard |
| [hughminhphan/motion-kit](https://github.com/hughminhphan/motion-kit) | 35 | — | $0 | **5/10** | Tiny, but the clearest statement of the easing rule we violated: "curves per move, timing from distance, reactions not staggers" |

Also noted, not yet rated in detail: `feitangyuan/onetake` (above), `Tejashmakwana/motionmaxxing`,
`krisyangdev/motionboard`, `cclank/lanshu-animated-architecture-diagram`,
`ythx-101/live-panel-skill`, `lazypay/Archscribe`, `diffusionstudio/lottie`.

---

## 5. Catalogs used for discovery — reference only, not installed

| Source | Note |
|---|---|
| [zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills) | ~489 entries by section (its own About line says 180 — the figures contradict each other). SAFE/CAUTION badges grade **the README and install steps, not the code**, and are issued by a hub the same maintainer runs. Useful for discovery, not for assurance |
| LinkedIn "20 repos" post | Where the 20-repo list was enumerated. Same genre as the reference reel |

---

## Re-creating the vendor tree

Vendor clones are gitignored. To rebuild:

```bash
git clone https://github.com/OpenMontageInc/OpenMontage.git OpenMontage
```

Then follow [WALKTHROUGH.md](WALKTHROUGH.md) §2 for setup. Nothing else is installed yet.
