# 01 — The landscape: who makes agent-coded video, and how

**Researched 2026-11-13.** GitHub figures were read from the public GitHub API on that date.
Product claims come from each vendor's own pages; treat them as marketing until tested.

---

## The one-paragraph picture

There are now two completely different industries both called "AI video". One **rents diffusion
models** (Kling, Veo, Sora, Seedance) and sells credits. The other has **a coding agent write an
animation as a program** and renders it deterministically with a headless browser and FFmpeg. The
second kind costs nothing per render, produces perfect text, and is the only kind that runs on a
machine with no GPU and no API keys — ours. Within about a month (October–November 2026) at least
four commercial products appeared selling *style kits* for the second kind. That is the market the
user is pointing at.

---

## A. Commercial products in the code-rendered niche

| Product | What you get | Render | Audio | Price | Licence on output |
|---|---|---|---|---|---|
| **flashloop Faceless Studio** | ~70 templates driven through an MCP connector inside Claude | Unknown location; frames are code-drawn | Voiceover is an MCP capability; details undocumented | $0 Starter lists MCP; $59 / $129 per month above | Not read |
| **ReelStyles** (reelstyles.com) | **126 style kits** as a Claude Code plugin: `SKILL.md`, `STYLES.md`, scene templates, render steps, a self-check rubric, characters, motion rules, format recipes | **HyperFrames**, on your machine | "A free voice that runs on your computer, or ElevenLabs"; music is bring-your-own | $0 for 7 styles (MIT repo); **$49→$79 once** for all | You own the films; may not redistribute the kits |
| **AI Creator Library — Faceless Shorts** | **38 "What if" templates**, each a Claude skill zip, also served over MCP | One HTML file drawing every frame → Chrome → FFmpeg, 1080×1920 | **Silent.** "Add a voice-over or music in your editor" | $8.71–$29 / month, or lifetime | Not stated on the page |
| **shwetacreates — 46 animation styles** | A free PDF of 46 copy-paste prompts with `[PLACEHOLDERS]` | **Remotion**, 5 s, 1080×1920 @30 | None | Free | None stated |

Full flashloop teardown: [flashloop/FINDINGS.md](flashloop/FINDINGS.md).

### What these four tell us, read together

1. **A "style" is a written document, not code.** In all four it is a prompt or skill file that
   tells the agent the look, the motion rules and the "never" list. ReelStyles adds scene
   templates and a rubric; nobody ships a rendering engine of their own.
2. **Three of four are silent or bring-your-own-audio.** Narration, word-timed captions, music and
   mix — the half of a short that makes it watchable — is the part the market has *not* packaged.
   The Faceless Shorts product says so outright. **This is the gap worth building into.**
3. **Nobody sells research.** ReelStyles' "format recipes" come from "our study of 476 channels"
   and are delivered as static text. None of them analyse *your* niche or *this week's* outliers.
   The user asked for exactly that. It is unbuilt everywhere.
4. **ReelStyles publishes honest numbers**, and they are the best planning figures available:
   render at "about 1 to 3 seconds per second of film" on 4 cores; a 10 s Short takes a median
   **3.8 min** end to end over 29 runs and a 30 s film **14 min** over 67 runs, on Claude Code with
   Sonnet. A 60 s episode is therefore a 20–30 minute agent job, not a button press.
5. **Their style names overlap heavily** — Swiss Grid / Swiss Motion / Swiss Timer, Voxel, Low-poly,
   Risograph, Blueprint, Globe Arcs, Paper cut-out, Phosphor terminal appear in three or four of
   the four lists. Styles are converging on a shared vocabulary; a style name is not a moat. The
   format, the research and the audio are.

### Adjacent, not competitors

Generic faceless-video SaaS (AutoShorts, Crayo, Revid, InVideo and similar) assemble stock or
generated clips under a TTS voice. They were not examined in depth: their method needs paid
models or stock libraries and is the "previous generation" shape described below.

---

## B. Open-source systems

Stars and last push from the GitHub API, **2026-11-13**. "Fit" is fitness for *this* project —
zero-key, no GPU, possibly commercial — not general quality.

### B1. Agent-skill systems — the agent is the orchestrator (our camp)

| Repo | Stars | Licence | Last push | What it is | Fit |
|---|---|---|---|---|---|
| OpenMontage (ours, installed) | 56k per a Sept survey | 🟡 AGPL-3.0 | — | 13 pipeline definitions, tool registry, 20 TTS adapters, a video analyzer | **In use** |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) (installed) | 83.3k per our registry | 🟢 Apache-2.0 | — | HTML → deterministic MP4. Ships skills we have not used yet: `reverse-any-video`, `style-sampling`, `captions-overlay`, `motion-doctrine`, `seam-craft`, `media-use` | **In use — under-used** |
| [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) | 19,097 | 🟢 Apache-2.0 | 2026-11-11 | Product promos on Remotion: 124 shot recipe cards, 150 motion previews, beat sync | Good reference for a **shot-recipe library**; Remotion-bound |
| [browser-use/video-use](https://github.com/browser-use/video-use) | 30,979 | 🟢 MIT | 2026-10-08 | Agent *edits* existing footage: cut fillers, grade, caption | Different job; reference for edit grammar |
| [zenstory-ai/drama-skills](https://github.com/zenstory-ai/drama-skills) | 4,185 | 🟢 MIT | 2026-11-10 | Short-drama skill chain: novel→script, character sheets, storyboard, prompts, **independent review step** | Reference for the **story chain**; visuals assume paid models |
| [Agents365-ai/video-podcast-maker](https://github.com/Agents365-ai/video-podcast-maker) | 1,721 | 🟢 MIT | 2026-10-01 | Topic → narrated 4K explainer; Remotion; edge/azure TTS; manifest-based asset engine | Reference for the **asset manifest** idea |
| [echris6/motion-video-kit](https://github.com/echris6/motion-video-kit) | 1,392 | 🟢 MIT | 2026-10-14 | Independent critic loop, motion grammar from 28 launch films | Already rated 8/10 in our registry |
| [vincentsch/explainroo](https://github.com/vincentsch/explainroo) | 1,270 | 🟢 MIT | 2026-11-10 | Canvas explainers with **Kokoro voice + Whisper word timing** | **Closest working example of our missing audio half** |
| [reelstyles/reelstyles-free](https://github.com/reelstyles/reelstyles-free) | 3 | 🟢 MIT | 2026-11-13 | The 7 free ReelStyles kits | **Best available specimen of a commercial style-kit's anatomy** |
| [cybiqon-ai/faceless-video-studio](https://github.com/cybiqon-ai/faceless-video-studio) | 2 | 🟢 MIT | 2026-11-13 | Daily explainer: finds a developer problem, scripts, voices (offline voice clone), renders on HyperFrames, "40 pass/fail gates against AI slop" | Tiny and unproven, but it is **the whole loop in one repo** on our exact stack |
| [Zman2087/faceless-studio](https://github.com/Zman2087/faceless-studio) | 0 | ❌ **No licence** | 2026-10-25 | Scheduled agents + Remotion, stick figures "drawn in code" | **Do not use** — unlicensed. Named only because the earlier brief confused it with flashloop |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | 6,932 | ❌ **No licence file** | 2026-11-11 | Official Remotion agent skills | Our registry rates it 6/10 with licence "—". The API confirms there is none. Read, do not copy |

### B2. One-stop platforms — a fixed program is the orchestrator

| Repo | Stars | Licence | Last push | What it is | Fit |
|---|---|---|---|---|---|
| [harry0703/MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | 143,126 | 🟢 MIT | 2026-11-13 | Topic → script → **stock footage** → TTS → subtitles → music | The reference *pipeline shape*. Its look (stock clips) is not ours |
| [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app) | 21,658 | 🟢 MIT | 2026-11-05 | Novel → script → storyboard → **character and scene asset management** → video | Reference for a **series bible / asset store**. Generation needs paid models |
| [HKUDS/ViMax](https://github.com/HKUDS/ViMax) | 12,914 | 🟢 MIT | 2026-09-30 | Director / screenwriter / producer agents | Reference for **role separation** |
| [linyqh/NarratoAI](https://github.com/linyqh/NarratoAI) | 11,811 | 🟢 MIT | 2026-10-24 | Commentary over existing video | Different job |
| [RayVentura/ShortGPT](https://github.com/RayVentura/ShortGPT) | 8,167 | 🟢 MIT | **2025-02-10** | Early shorts-automation framework | **Stale — 21 months without a push** |
| [gyoridavid/short-video-maker](https://github.com/gyoridavid/short-video-maker) | 1,491 | 🟢 MIT | **2025-06-21** | Shorts over MCP + REST: Kokoro, Whisper captions, Pexels, Remotion | Stale, but a clean small example of **an MCP-fronted pipeline** |

### B3. Render engines

| Engine | Stars | Licence | Authoring | Verdict |
|---|---|---|---|---|
| HyperFrames | 83.3k | 🟢 Apache-2.0 | HTML / CSS / JS, any library | **Keep as the one runtime.** Three of four commercial kits chose it or plain Chrome+FFmpeg |
| Remotion | — | ⚠️ source-available | React | Works, installed. Company licence above 3 people. Do not build the system on it |
| [ManimCommunity/manim](https://github.com/ManimCommunity/manim) | 42,461 | 🟢 MIT | Python | Only for maths-explainer looks; a second runtime to maintain |
| [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | 19,794 | 🟢 MIT | TypeScript generators | Elegant, but last push 2026-07-02 and another runtime |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | 118,279 | 🟢 MIT | — | Already our 3D layer inside HyperFrames |

### B4. Voice and timing

| Repo | Stars | Licence | Last push | Role | Note |
|---|---|---|---|---|---|
| VoiceStudio (installed, ⛔ blocked) | 109k | 🟡 AGPL-3.0 | — | Narration, cloning | Still waiting on the first-run GUI pass |
| [hexgrad/kokoro](https://github.com/hexgrad/kokoro) | 10,094 | 🟢 Apache-2.0 | **2025-08-06** | 82M-parameter TTS, CPU-capable | Model is stable rather than abandoned, but the repo has not moved in 15 months |
| [remsky/Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) | 5,676 | 🟢 Apache-2.0 | 2026-11-13 | Kokoro behind an OpenAI-compatible API, **with a captioned-speech endpoint that returns word timestamps** | Would give narration *and* caption timing in one call. English only for timestamps |
| [m-bain/whisperX](https://github.com/m-bain/whisperX) | 25,242 | 🟢 BSD-2-Clause | 2026-11-12 | Forced alignment → word timestamps for any audio | Engine-independent caption timing |
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | 26,715 | 🟢 MIT | 2026-11-12 | Fast CPU transcription | For transcribing *reference* reels |
| [resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox) | 27,787 | 🟢 MIT | 2026-11-04 | Expressive TTS with cloning | Likely too slow without a GPU — untested |
| [rhasspy/piper](https://github.com/rhasspy/piper) (installed) | 11,326 | 🟢 MIT | 2025-08-26 | Our draft fallback voice | ⚠️ **Archived upstream.** It works today; it will not be fixed tomorrow |

---

## C. Three architectures, and which one wins for us

| | **Stock assembler** (MoneyPrinterTurbo) | **Model orchestrator** (Toonflow, ViMax, flashloop's other studios) | **Agent-coded** (HyperFrames kits, flashloop Faceless, us) |
|---|---|---|---|
| Picture comes from | Stock-footage search | Paid image / video models | A program the agent writes |
| Cost per finished minute | ~$0 | Dollars to tens of dollars (one vendor's unsourced estimate) | $0 render; agent tokens |
| Needs GPU or keys | No | Yes | **No** |
| Text on screen | Fine (overlaid) | Often garbled | **Perfect** |
| Consistency across episodes | None | The hard unsolved problem | **Free — same code, same cast** |
| Ceiling | Generic | Photoreal | Stylised only |
| Typical failure | Looks like everyone else's | Cost blow-ups from retries; "by shot 40 nobody remembers shot 7" | Templated motion, dead frames, no sound |

We are in the third column by constraint and it is also the right column for series content,
because **consistency is free there**. Its failure mode is the one this project was founded on
(see CONTEXT.md "Why it exists"), and we already own the countermeasures: `filmcheck`, `onecam`,
the critic loop.

One vendor survey of this ecosystem (pixo.video, 2026-09-04) is worth one caveat and one idea. The
caveat: it is headlined "50+ pipelines reviewed" and names **22**; Pixo sells a competing product
and cites its own earlier posts as evidence. The idea, which holds regardless of who said it: the
three camps are converging because **skills lack state and review, platforms lack fine control,
canvases lack pipeline depth**. A system that has all three — written skills, persistent state,
and an independent review gate — is the target shape. We have the first and the third. The state
layer is what [02-system-architecture.md](02-system-architecture.md) adds.

---

## Sources

- flashloop: https://www.flashloop.ai/ , /faceless-studio , /remix-studio , /mcp , /pricing
- https://reelstyles.com/ (+ /pricing, /free, /faq, /animation-styles, /terms)
- https://aicreatorlibrary.com/ai-faceless-shorts/
- https://shwetacreates.substack.com/p/46-ai-animation-styles-you-can-build
- https://pixo.video/blog/open-source-ai-video-pipelines
- GitHub REST API, `repos/<owner>/<repo>`, read 2026-11-13
