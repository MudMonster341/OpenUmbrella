# OpenMontage — Walkthrough for marketing_video_flow

Local notes, written 2026-11-12, after cloning `OpenMontageInc/OpenMontage` into
`C:\Users\Mustafa\Desktop\Mustafa\Projects\marketing_video_flow\OpenMontage`.
Upstream docs are `README.md`, `AGENT_GUIDE.md`, `PROJECT_CONTEXT.md`, `PROMPT_GALLERY.md`, `docs/PROVIDERS.md`.
This file is an orientation layer on top of them: what the thing is, what it can do, what it needs on *this* machine,
and four concrete marketing cases to try.

> **Paths in this document are relative to `OpenMontage/`**, not to the project root. This file lives at the root
> under `docs/` because it is ours, not upstream's — see [ADR 0005](../decisions/0005-project-root-owns-the-system.md).
> Run every command below from inside `OpenMontage/` with its venv activated.

---

## 1. The one thing to understand first

**OpenMontage is not an app you run. It is a set of instructions for an AI coding agent, plus ~100 Python tools the
agent calls.** There is no `openmontage render video.mp4` command, no UI to click through, no orchestrator process.

```
You, in Claude Code, inside this repo folder:
  "Make a 45s product teaser for X"
        |
        v
  Agent reads pipeline_defs/<pipeline>.yaml              <- stage list, tools, gates
  Agent reads skills/pipelines/<p>/<stage>-director.md   <- HOW to do each stage
  Agent calls Python tools (tools/**)                    <- image gen, TTS, music, ffmpeg, Remotion...
  Agent self-reviews (skills/meta/reviewer.md)
  Agent writes a checkpoint JSON + pauses for your approval
        |
        v
  projects/<project-id>/renders/final.mp4
```

Consequences worth internalising:

- **Output quality tracks the agent's discipline**, not just the API keys. The repo is mostly *writing* — 700+ markdown
  skill files and YAML manifests that steer the agent.
- **It must be driven from a session whose working directory is this repo** (`.../marketing_video_flow/OpenMontage`),
  because the agent is expected to read `AGENT_GUIDE.md` and run `python -c "from tools.tool_registry import ..."`
  relative to the repo root. `CLAUDE.md` in the repo root bootstraps that.
- Works with Claude Code / Cursor / Copilot / Windsurf / Codex — each has a pointer file in the root.
- License is **AGPLv3** — fine for making marketing videos for yourself or clients; relevant only if you ever ship a
  hosted service built on it.

### The pipeline state machine

Every pipeline is the same seven-ish stages, with human approval gates on the creative ones:

```
idea -> research -> proposal -> script -> scene_plan -> assets -> edit -> compose -> publish
                      ^gate      ^gate      ^gate        ^gate                        ^gate
```

Each stage emits a **canonical artifact** validated against a JSON schema in `schemas/artifacts/`:
`brief`, `research_brief`, `script`, `scene_plan`, `asset_manifest`, `edit_decisions`, `render_report`, `publish_log`.
That is what makes a run resumable, auditable, and re-runnable with one scene changed instead of starting over.

### Where output lands

```
projects/<project-id>/
├── artifacts/        # JSON per stage — the audit trail
├── assets/           # images/ video/ audio/ music/ subtitles.srt
└── renders/final.mp4 # the deliverable
```

`projects/` is gitignored. Everything in it is regenerable from the artifacts.

### Backlot — the live board (this is the nice part)

`python -m backlot open <project-id>` opens a local web board that reads the project files as they are written:
stages lighting up, the script as a screenplay page, a **scene-by-scene contact sheet with per-asset cost and quality
scores that acts as a real approval gate before the render**, and a scrubbable replay of the whole run afterwards. The
agent is supposed to open it automatically when a production starts. Try it dry first:

```bash
python scripts/backlot_simulate_run.py
```

---

## 2. What this machine has, and what is missing

**Setup was completed and verified on 2026-11-12. Current state:**

| Requirement | Status on this box |
|---|---|
| Python | ✅ 3.12.10, venv at `.venv/` with all `requirements.txt` deps installed |
| Node.js | ⚠️ v24.18.1 — renders fine, but npm warns `EBADENGINE` (Remotion wants `^22.23.4 \|\| ^24.22.1 \|\| ^26.12.1`). Switch Node if anything gets flaky |
| **FFmpeg** | ✅ 9.0.2 (Gyan full build, via winget) — see the PATH caveat below |
| Remotion | ✅ 199 packages installed in `remotion-composer/`, esbuild postinstall approved, **render verified** |
| HyperFrames | ✅ CLI 0.9.39 cached via npx |
| Piper TTS (free narration) | ✅ 1.8.0 + `en_US-lessac-medium` voice model in `~/.piper/models/` |
| `.env` | ✅ created from `.env.example`, **no keys — deliberately** |
| GPU | ❌ Intel integrated only → **no local video generation** (WAN/Hunyuan/CogVideo/LTX need NVIDIA-class VRAM) |
| `make` | ❌ not present (normal on Windows) — use the manual commands below |

All three composition runtimes report live: `{"ffmpeg": true, "remotion": true, "hyperframes": true}`.

Capability counts from the registry with zero keys: `video_post 9/10`, `character_animation 6/6`,
`audio_processing 2/2`, `subtitle 2/2`, `screen_capture 2/2`, `analysis 7/14`, `tts 1/19` (Piper),
`enhancement 2/7`, and `0` configured for `image_generation` (0/31), `video_generation` (0/35),
`music_generation` (0/8). That is the honest zero-key envelope: **composition, narration, subtitles, editing and
character animation are all live; generated imagery and generated motion are not.**

### ⚠️ Two PATH caveats that will bite

1. **FFmpeg is on the user PATH but not inside already-open shells.** winget added
   `C:\Users\Mustafa\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin`
   to the user PATH; any shell started before that install (including this Claude Code session's shells) still cannot
   see it. **Restart the terminal / app** and it resolves permanently.
2. **Piper is only detected when the venv is activated.** The registry probes for a `piper` command on PATH, and
   `piper.exe` lives in `.venv\Scripts\`. Without activation, `tts` shows 0/19 and narration silently has no provider.

So: **always activate the venv before a production run.**

```powershell
.\.venv\Scripts\Activate.ps1
```

### Setup, Windows, step by step (what was run)

```powershell
winget install Gyan.FFmpeg
```

Close and reopen the terminal afterwards so `ffmpeg` lands on PATH, then:

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1; python -m pip install "pip>=26.2.2"; python -m pip install -r requirements.txt
```

```powershell
cd remotion-composer; npm install; cd ..
```

```powershell
python -m pip install piper-tts; npx --yes hyperframes --version; Copy-Item .env.example .env
```

Notes:
- If `npm install` dies with `ERR_INVALID_ARG_TYPE`, run `npx --yes npm install` instead (documented Windows quirk).
- `piper-tts` is the free offline narrator. If its install fails, narration needs a cloud TTS key.
- Consider matching Node to the pinned 22.23.4 (nvm-windows / fnm) if Remotion misbehaves — 24.x is newer than the
  repo's tested line.

### Verify it

```powershell
python -c "from tools.tool_registry import registry; import json; registry.discover(); print(json.dumps(registry.provider_menu_summary(), indent=2))"
```

That prints the **capability envelope**: which composition runtimes are live (`ffmpeg` / `remotion` / `hyperframes`),
how many providers are configured per capability, and `setup_offers[]` — unavailable tools that are a one-env-var fix.
It is the agent's mandatory preflight, and the fastest way for you to see what you actually have.

Then render the zero-key demos (no keys, no cost, minutes) to prove the render chain works end to end:

```powershell
python render_demo.py --list
```

```powershell
python render_demo.py
```

Three pre-built Remotion compositions: `world-in-numbers` (KPI grids, bar/pie/line charts), `code-to-screen`
(developer education), `focusflow-pitch` (startup pitch deck with traction metrics and a testimonial). The last one is
effectively a marketing template already.

Python-side confidence check, no keys needed: `python -m pytest tests/contracts`.

---

## 3. What you can actually make

### Pipelines (pick first; everything else follows)

| Pipeline | Produces | Marketing relevance |
|---|---|---|
| `animation` | Motion graphics, kinetic typography | ⭐ **best zero-key marketing path** — product promos, launch reels, social |
| `cinematic` | Trailer / teaser / mood edit | ⭐ brand films, launch teasers (wants a video or image model) |
| `animated-explainer` | Researched explainer: script + visuals + narration + music | ⭐ "what our product does", category education |
| `screen-demo` | Polished screen recordings | ⭐ SaaS product demos, feature walkthroughs |
| `documentary-montage` | Thematic montage cut from a CLIP-indexed corpus of Archive.org / NASA / Wikimedia / Pexels | ⭐ brand mood pieces using **real footage, no paid gen API** |
| `clip-factory` | Batch of ranked shorts from one long source | repurposing a webinar or long ad into Reels |
| `podcast-repurpose` | Podcast → video highlights | audiograms, founder-podcast clips |
| `avatar-spokesperson` | Avatar presenter | announcements, internal comms (needs HeyGen/Kling) |
| `localization-dub` | Subtitle + dub + translate an existing video | one ad → ten markets |
| `talking-head` | Footage-led speaker video | founder-to-camera cuts |
| `hybrid` | Your footage + generated support visuals | most "real" client work |
| `character-animation` | Local SVG-rigged cartoon acting | mascot content, zero-key |

Production-grade: `animated-explainer`, `animation`, `cinematic`, `screen-demo`, `hybrid`, `avatar-spokesperson`.
Beta (expect rough edges): `talking-head`, `clip-factory`, `podcast-repurpose`, `documentary-montage`,
`localization-dub`, `character-animation`.

### The two composition runtimes (you get asked to choose)

| Runtime | Tech | Pick it for |
|---|---|---|
| **Remotion** | React, `remotion-composer/` | data-driven explainers, charts, stat reveals, Ken-Burns image scenes, TikTok-style word-level captions |
| **HyperFrames** | HTML/CSS/GSAP via `npx hyperframes` | kinetic typography, product promos, launch reels, **website → video**, registry blocks (charts, grain, shader transitions) |

Both are free and local. The agent must present both and lock the choice as `render_runtime` in `edit_decisions`;
silently swapping runtimes counts as a governance violation. Decision matrix: `skills/core/hyperframes.md`.

### Style playbooks

`styles/*.yaml` — `clean-professional` (corporate/SaaS), `flat-motion-graphics` (social/TikTok),
`minimalist-diagram` (technical), `premium-minimalist`, `anime-ghibli`. They control typography, palette, motion,
audio profile and quality rules. **This is where brand consistency lives** — copy one into `styles/custom/` with brand
fonts and colors, and every production inherits it.

### Platform profiles

YouTube 16:9 / 4K / Shorts 9:16, Instagram Reels and Feed 1:1, TikTok, LinkedIn, Cinematic 21:9. Set per render.

### Keys, in order of value for marketing work

**Decision for this project: no API keys.** Tier 0 below is the operating mode — the LLM intelligence is the Claude
Code agent itself (no LLM key needed), narration is Piper, media comes from open archives, and composition is local.
The table is here for when a specific ceiling gets hit, not as a shopping list.

| Tier | Keys | Unlocks | Typical cost |
|---|---|---|---|
| 0 | none | Piper narration, Archive.org/NASA/Wikimedia media, Remotion + HyperFrames + FFmpeg, subtitles | $0 |
| 1 | `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `UNSPLASH_ACCESS_KEY` (free to obtain) | much better stock footage and images | $0 |
| 2 | `FAL_KEY` | FLUX images plus Veo / Kling / MiniMax video through one gateway | ~$0.15–$1.50 per video |
| 3 | `ELEVENLABS_API_KEY` or `GOOGLE_API_KEY` | premium or branded narration voice (Google also gives Imagen + 700+ voices) | cents |
| 4 | `SUNO_API_KEY` | custom scored music instead of royalty-free library | a few $ per track |

Full matrix with pricing and free tiers: `docs/PROVIDERS.md`. Everything is optional; the scored selector ranks
whatever is configured across 7 dimensions (task fit, quality, control, reliability, cost, latency, continuity) and
logs why it picked what it picked.

Budget governance is built in: estimate → reserve → reconcile, default **$10 total cap**, per-action approval above
**$0.50**, modes `observe` / `warn` / `cap` in `config.yaml`.

---

## 4. Four marketing cases to try, in order

### Case A — zero-key, prove the chain: product launch reel

Pipeline `animation`, runtime **HyperFrames**, playbook `flat-motion-graphics`.

> "Make a 20-second product launch video for &lt;product&gt;. Big kinetic typography, three feature callouts, our accent
> color, and a final CTA card. Use the HyperFrames runtime, 9:16 for Reels."

3–5 minutes, $0. The fastest honest signal that the toolchain is healthy on this machine.

### Case B — zero-key, highest real-world leverage: website → video ad

> "Here's our landing page: &lt;url&gt;. Make a 15-second Instagram ad. Use HyperFrames and pick up the site's real colors
> and typography."

The `website-to-hyperframes` workflow captures the site, extracts colors and typography into a `DESIGN.md`,
storyboards 3–4 beats, generates narration, builds GSAP timelines, lints, validates, renders. 8–12 minutes, $0
(≈$0.05 with premium TTS). For agency-style work this is the one to industrialise: one URL in, a set of platform
variants out.

### Case C — one key (`FAL_KEY`), the money shot: product teaser with generated visuals

> "Make a 45-second product launch teaser for &lt;product&gt;. Modern and minimal, AI-generated product shots, stat reveals,
> punchy closing. 16:9 for LinkedIn plus a 9:16 cut for Reels."

12–18 minutes, ~$0.60. Variant worth testing: supply **your own approved hero stills** and let image-to-video pin them
as first and last frame, so the model invents motion without losing product identity — how the repo's own "Products
Come to Life" demo was made. Craft skill: `skills/creative/commercial-product-video.md`.

### Case D — zero-key, brand mood film from real footage: documentary montage

> "Make a 60-second brand film about &lt;theme&gt;. Use real footage only, no narration, music yes, elegiac tone. Prefer
> Pexels and Archive.org."

Builds a CLIP-searchable corpus from free archives, retrieves actual motion clips, cuts a timeline. This is the
feature that separates it from "animate three stills and call it video". Beta pipeline — budget iteration time.

**Then**: `localization-dub` on whichever case lands, to turn one asset into several markets, and `clip-factory` if
there is a long video lying around.

---

## 5. How a real run goes (so you know what to expect)

1. You state the brief in chat. The agent runs preflight and reports what is configured.
2. It proposes **2–3 differentiated concepts** with an honest tool path, runtime choice and cost estimate — before
   spending anything. You approve one. ← gate
3. Research: 15–25 live web searches (YouTube, Reddit, HN, news, academic), cited in a research brief.
4. Script, with voice direction. ← gate
5. Scene plan: shot by shot, each scene mapped to a tool and a cost. ← gate
6. Asset generation: images, clips, narration, music land under `projects/<id>/assets/`, and the Backlot contact sheet
   holds for sign-off with per-asset cost and quality scores. ← gate
7. Pre-compose validation: blocks the render if the delivery promise is violated (a "motion-led" brief that ended up
   80% stills), slideshow risk is critical, or the renderer family is missing.
8. Render (Remotion / HyperFrames / FFmpeg).
9. Post-render self-review: ffprobe, frames sampled at 4 positions for black frames and broken overlays, audio levels
   for silence and clipping, subtitle presence, promise verification. **If review fails, you are not shown the video.**
10. Every provider choice, style choice, voice, music pick and fallback is in the decision log with alternatives and
    confidence scores.

You can also **start from a reference video** instead of a blank prompt: paste a YouTube / Short / Reel / TikTok /
local clip and it analyses transcript, pacing, scenes, keyframes and style, then returns 2–3 differentiated concepts
saying what it keeps, what it changes and what it will cost. For marketing work this is usually the better entry
point — "like this competitor ad, but for us". Internally that routes to `skills/meta/video-reference-analyst.md`
(analyse the reference, then propose differentiated concepts) rather than plain prompt-guessing. A vague opener
("make me a video") instead routes to `skills/meta/onboarding.md`, which runs discovery and offers starter prompts
matched to whatever keys you have — so "what can I even do with my current setup?" is a legitimate first message.

---

## 6. Gotchas for this setup

- **Activate the venv first, every time** — otherwise Piper disappears and narration has no provider (see §2).
- **Restart the terminal** once so FFmpeg is on PATH without a manual prepend.
- **No GPU** → ignore `make install-gpu`, `VIDEO_GEN_LOCAL_*`, and WAN/Hunyuan/CogVideo/LTX-local. Motion comes either
  from a cloud API or from real stock footage.
- **No `make`** → use the manual commands in §2; `make demo` becomes `python render_demo.py`.
- **Node 24.18.1 vs the pinned 22.23.4** — if Remotion or HyperFrames misbehaves, switch Node before debugging deeper.
- **Beta pipelines are beta.** `documentary-montage` and `clip-factory` are the ones to budget iteration time for.
- **Zero keys ≈ stills plus motion graphics**, unless you go the documentary-montage route. Do not expect generated
  motion for free.
- Keep the agent on the rails: production goes through a pipeline manifest plus stage director skills ("Rule Zero" in
  `AGENT_GUIDE.md`). Ad-hoc "just ffmpeg something together" sidesteps every quality gate.
- `.env` holds secrets and is gitignored — keep it that way.
- This walkthrough and any brand playbook we add live inside a checkout of someone else's repo. If customisation gets
  serious, keep brand assets and playbooks in the parent `marketing_video_flow/` folder and copy them in, so upstream
  `git pull` stays clean.

---

## 7. Next steps

Setup is done and the render chain is proven (`projects/demos/renders/focusflow-pitch.mp4`, 1920x1080 h264+aac,
22.5s, $0). What remains:

1. Restart the terminal so FFmpeg resolves without a PATH prepend.
2. `python scripts/backlot_simulate_run.py` → see the Backlot board before a real run depends on it.
3. Run **Case A** (zero-key HyperFrames launch reel) end to end, approval gates included. First real production.
4. Then **Case B** (landing page → social ad) — the one with actual leverage for marketing work.
5. Once a look works, freeze it into `styles/custom/<brand>.yaml` so it is repeatable across every production.
6. Only if the zero-key ceiling becomes the limit: add free stock keys (Pexels/Pixabay/Unsplash, $0) for better
   footage, and consider `FAL_KEY` for generated imagery and motion.

### Starting a production

```powershell
.\.venv\Scripts\Activate.ps1
```

Then, in a Claude Code session whose working directory is this repo, state the brief in plain language. The agent
reads `AGENT_GUIDE.md`, picks a pipeline, runs preflight, and comes back with concepts and a cost estimate before
anything is generated. Example opener:

> "Make a 20-second product launch reel for &lt;product&gt;, HyperFrames runtime, 9:16 for Reels, no paid providers."

---

## 8. Key files, for reference

| File | Why you would open it |
|---|---|
| `AGENT_GUIDE.md` | The agent contract: preflight, pipeline selection, gates, what not to do. 50KB, the real spec |
| `PROJECT_CONTEXT.md` | Architecture and conventions in two pages |
| `PROMPT_GALLERY.md` | Tested prompts with expected cost and time |
| `docs/PROVIDERS.md` | Every provider: setup, pricing, free tiers |
| `docs/ARCHITECTURE.md` | Technical deep dive |
| `pipeline_defs/*.yaml` | What each pipeline does, stage by stage |
| `skills/pipelines/<p>/*-director.md` | How the agent is taught to run each stage |
| `skills/creative/commercial-product-video.md` | Product and marketing video craft |
| `skills/core/hyperframes.md` | Remotion vs HyperFrames decision matrix |
| `styles/*.yaml` | Brand look: typography, palette, motion, audio |
| `config.yaml` | Budget caps, approval thresholds, global config |
| `.env.example` | Every supported key, grouped, with where to get it |
