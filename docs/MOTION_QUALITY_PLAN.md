# Motion Quality Plan — getting from "choppy demo" to films worth shipping

Written 2026-11-12, after reviewing the zero-key demos and researching the Claude-Code motion-design repo
ecosystem. Companion to [`WALKTHROUGH.md`](WALKTHROUGH.md).

**Goal:** short videos about using Claude well — agent workflows, "me and Claude talking", what an agent actually is.
Vertical or horizontal, both fine. The bar is *very good*, not *adequate*.

---

## 1. Why the demos looked choppy — the honest diagnosis

The three demos are not a fair sample of the ceiling, but the complaint is correct, and the causes are specific:

1. **They are prop dumps, not films.** `render_demo.py` feeds static JSON (`remotion-composer/public/demo-props/*.json`)
   into generic React components. Nobody designed a shot. There is no narrative spine, no beat, no sound.
2. **Text density is built into the component set.** TextCard, StatCard, CalloutBox, ComparisonCard — the demo props
   lean on typography because that is what those components are. A real film shows one idea per beat and lets motion
   carry meaning.
3. **Generic spring defaults.** Remotion's springs are fine, but every element entering with the same default spring
   at the same time reads as mechanical. Good motion uses *different* curves per move, timing derived from distance,
   and reaction/overlap rather than uniform stagger.
4. **No beat, no sound design.** Nothing is cut to music, nothing lands on a transient. Silence makes any motion feel
   unmotivated, and mistimed motion feels choppy even at a locked 30fps.
5. **Nothing judged the result.** OpenMontage's post-render review checks for black frames, audio levels, subtitle
   presence and delivery-promise violations. It does **not** assess whether the motion is any good. No quality bar
   was applied because none exists in the stock repo.

**So the fix is not a better renderer.** We already have three working renderers. The fix is a *motion-design
instruction layer* plus a *critic loop that judges the actual render* — exactly the gap the repos below fill.

---

## 2. What I could and could not confirm about the reel

The reel (`instagram.com/reel/De2dMErAprH/`, @george.automates, posted ~2026-10-23) says:

> "Making videos with Claude is easy. Making them look THIS good is another story. Comment VIDEO for the links"
> — hashtags `#claudecode #aivideo #aiediting #motiondesign`

**The repo list is DM-gated.** It is not in the caption, the comments, or the profile bio (which points to an
unrelated affiliate link). I could not retrieve the creator's specific list, and I have not guessed at it.

What I did find is the same genre, fully enumerated: a widely-shared list of **20 repos that turn Claude Code into a
motion-design studio**, plus a 489-entry catalog of agent video skills. Those are below, filtered to what is actually
useful for our content.

---

## 3. The shortlist

Ordered by how directly each one attacks "choppy, too much text, weak editing". Star counts are as listed on GitHub
on 2026-11-12.

### Tier 1 — install these first

| Repo | Stars | License | Why it matters here |
|---|---|---|---|
| **[echris6/motion-video-kit](https://github.com/echris6/motion-video-kit)** | 1.4k | MIT | The single best answer to our complaint. Ships a **"Gauntlet" critic loop** (builder ≠ judge; fresh critics review the *actual render*, item-by-item, with a ledger), a **motion grammar** of 6 rules + 16 reusable mechanisms *with pacing numbers*, a **quality bar with measurable checks** — including a `frozen-time` script that literally detects dead/static frames — plus sound-design guidance (`audio.md`: music matched to audience, back-timing a track so it lands on the end card, SFX on small moves, mix targets) and ffmpeg loudness tooling. Targets HTML/GSAP + Three.js, renders best through **HyperFrames — which we already have installed**. |
| **[iart-ai/motion-design-skills](https://github.com/iart-ai/motion-design-skills)** | 227 | MIT | 9 installable skills, one command: `npx skills add iart-ai/motion-design-skills`. The relevant ones: **animation-principles** (timing, easing, the 12 principles), **motion-art-direction** (pacing, hierarchy, and *restraint* — the direct fix for "too much text"), **beat-sync-editing** (rhythm, transitions, retiming, speed ramps), **color-motion** (perceptual OKLCH interpolation, grading), **remotion-video**. Engine-agnostic, so it improves both our runtimes. |

These two are complementary: `motion-design-skills` teaches the craft, `motion-video-kit` enforces it and checks the
output.

### Tier 2 — evaluate next

| Repo | Stars | What it adds |
|---|---|---|
| [feitangyuan/onetake](https://github.com/feitangyuan/onetake) | 4.1k | Continuity "measured by an oracle". Ranked #2 in the catalog's own end-to-end test, and fast. |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | 6.9k | Remotion's **official** agent skills. We already have Remotion; this is the lowest-risk quality bump on that path. |
| [Tejashmakwana/motionmaxxing](https://github.com/Tejashmakwana/motionmaxxing) | 1.6k | Explicitly aimed at turning "AI slop videos" into something that "looks made by a motion designer". |
| [iart-ai/motion-skills](https://github.com/iart-ai/motion-skills) | 1.4k | 56 skills — kinetic typography, data-viz, explainers. Tested as having "a look of its own" (good: not generic). |
| [krisyangdev/motionboard](https://github.com/krisyangdev/motionboard) | 64 | Shot language extracted from Apple and Linear launch films — 38 recipes. Reference-driven, which is how we should work. |
| [AbubakrChan/product-launch-motion](https://github.com/AbubakrChan/product-launch-motion) | 453 | Springs, a cursor-driven camera, beat sync, and "one shape that never cuts" — continuity technique. |
| [charlie947/motion-graphics-skills](https://github.com/charlie947/motion-graphics-skills) | 654 | 13 skills for launch-grade motion graphics. "Every frame is code." |
| [hughminhphan/motion-kit](https://github.com/hughminhphan/motion-kit) | 35 | Small, but the only entry describing easing directly: "curves per move, timing from distance, reactions not staggers." That one sentence is most of what our demos got wrong. |

### Tier 3 — specific to *our* subject matter (agents, Claude, workflows)

| Repo | Stars | Why |
|---|---|---|
| [vincentsch/explainroo](https://github.com/vincentsch/explainroo) | 1.2k | Explainer videos with a canvas renderer, **Kokoro voice and Whisper word-level timing** — i.e. better narration + caption sync than Piper, still local and free. Fastest in the catalog's test (2.0 min for a 15s brief). |
| [cclank/lanshu-animated-architecture-diagram](https://github.com/cclank/lanshu-animated-architecture-diagram) | 1.0k | Hand-drawn **animated architecture diagrams** — close to ideal for showing what an agent loop actually does. |
| [ythx-101/live-panel-skill](https://github.com/ythx-101/live-panel-skill) | 854 | JSON-driven animated architecture diagrams. Same use case, different look. |
| [lazypay/Archscribe](https://github.com/lazypay/Archscribe) | 379 | Dark-background animated **process** diagrams (.excalidraw/PNG/GIF). Fits a tool→agent→result narrative. |
| [GODGOD126/opus-5-5-86-styles-in-motion](https://github.com/GODGOD126/opus-5-5-86-styles-in-motion) | 71 | 86 code-driven explainer styles with a 20s preview before full render — a fast way to find a house style. |
| [diffusionstudio/lottie](https://github.com/diffusionstudio/lottie) | 5.7k | Production Lottie from Claude Code. Useful for reusable branded elements (logo stings, transitions, UI accents). |

Also relevant and already in our stack: OpenMontage's `screen-demo` pipeline for terminal/IDE capture, and its
vendored HyperFrames skills under `.agents/skills/hyperframes*/`.

---

## 4. Caveats — read before installing anything

- **The reel's actual list is unconfirmed.** Everything above comes from the broader ecosystem, not from that video.
- **The catalog's own numbers don't add up.** [zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)
  describes itself as "180 repos" in its About line while its section headers sum to 489. Treat its figures loosely.
- **Its "security grades" are self-administered** by a hub the same maintainer runs, and they grade the README and
  install steps — **not the code**. A SAFE badge is not an audit.
- **OpenMontage itself is graded CAUTION in that catalog.** Worth knowing, given we just installed it. The grade
  appears to concern README/install steps rather than a specific finding, but it is not nothing.
- **These are young, low-commit repos** (motion-video-kit: 7 commits; motion-design-skills: 22). They are skill
  files that instruct an agent, which means they can tell the agent to run code. Read the `SKILL.md` before
  installing, and prefer project-scoped `.claude/skills/` over the global `~/.claude/skills/` so the blast radius
  stays inside this project.
- **Skills are instructions, not magic.** They raise the floor by teaching craft and enforcing review. They do not
  replace deciding what the video is actually about.

---

## 5. Recommended approach

1. **Install Tier 1 into this project** (`.claude/skills/`), not globally.
2. **Pick one target film** and make it properly, rather than regenerating demos: a 30–45s vertical piece on one idea
   about working with Claude — for example "an agent is a loop, not a chatbot."
3. **Author the composition in HyperFrames (HTML/GSAP)** rather than feeding props to stock components. That is where
   the motion-design skills have leverage, and it is what the kit's grammar is written for.
4. **Run the Gauntlet critic loop on the render**, fix what it flags, re-render. The builder does not get to be the
   judge.
5. **Add sound.** Even a single music bed with cuts landing on transients will do more for perceived quality than any
   amount of extra animation.
6. **Freeze what works** into `styles/custom/<brand>.yaml` plus a reusable HyperFrames workspace, so film #2 starts
   from film #1's taste instead of from zero.

### Content shape worth testing first

| Idea | Form | Why it suits this stack |
|---|---|---|
| "An agent is a loop, not a chatbot" | 9:16, 30s, animated diagram | Architecture-diagram skills + kinetic type; no footage needed |
| "Me and Claude building X" | 16:9, 60s, screen capture + motion overlays | `screen-demo` pipeline + motion graphics on top; real and specific |
| "The 5 things I stopped doing manually" | 9:16, 25s, kinetic typography | Pure HyperFrames/GSAP; fastest to iterate on pacing |
| "What actually happens when you type a prompt" | 16:9, 45s, process animation | Archscribe / live-panel style; genuinely explanatory |
