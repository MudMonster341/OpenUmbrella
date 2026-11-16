# Market research and intelligence — how AI-coded video products work, and the system we would build

**Researched and written 2026-11-13.** Research only. **Nothing was installed, cloned, downloaded
or built**, and no account was created anywhere.

> Moved here from `research/` on 2026-11-13 at the user's direction. This folder is **not**
> gitignored, so these documents can be committed. Third-party downloads (reference reels) stay in
> the gitignored `research/reels/`.

**Coming from another session? Start with [HANDOFF.md](HANDOFF.md)** — one page of what was produced, what is proven, and what conflicts with existing decisions.

## Read in this order

| # | File | Answers |
|---|---|---|
| — | [flashloop/FINDINGS.md](flashloop/FINDINGS.md) | What flashloop is and how Faceless Studio appears to work |
| 01 | [01-landscape.md](01-landscape.md) | Who else does this — 4 commercial products, ~30 open-source repos, with licences |
| 02 | [02-system-architecture.md](02-system-architecture.md) | The whole pipeline, diagrams, artefact contract, logical cases, state machine |
| 03 | [03-style-and-format-system.md](03-style-and-format-system.md) | How one system serves many styles; assets and how to make them |
| 04 | [04-research-and-story-engine.md](04-research-and-story-engine.md) | Automatic content analysis, hooks, and story generation |
| 05 | [05-audio.md](05-audio.md) | Voice, captions, music, SFX, mix |
| 06 | [06-gap-analysis-and-build-plan.md](06-gap-analysis-and-build-plan.md) | What we have, what is missing, the plan, the decisions needed |
| — | [styles/](styles/README.md) | **Style documents**: the template and three drafts (grid, console, blocks) |
| — | [story/STORY_TEMPLATE.md](story/STORY_TEMPLATE.md) | **The story template** — one story from the user's words to an approved script |
| — | [story/FORMATS.md](story/FORMATS.md) | The three story formats |

> **Direction check.** [ADR 0013](../decisions/0013-story-reels-are-the-product.md) says the user
> writes the story and we animate it. Files 02 and 04 were drafted assuming the system also
> *generates* stories from a premise. Read them as: the story engine **structures and checks** the
> user's story; generating one from a bare premise is an optional extra, not the product.
> ADR 0013 also chose a UI-driven engine and recorded the blocky 3D look as out of reach;
> `styles/blocks.md` and the flashloop findings challenge that. **Not decided — the user's call.**

## The seven findings

1. **Flashloop's Faceless Studio is code-rendered, not diffusion video.** Concluded from frames of
   five of their public previews: pixel-exact type, a running timecode, procedural 3D. It is the
   architecture this project already uses. *Inferred with high confidence; not stated by them.*
2. **Their product is an MCP connector, not an app.** The website builds a prompt; the work runs
   inside the user's own Claude. **Where the frames are actually rendered is unknown.**
3. **A template is format × look.** Their library is three story engines ("a rule", "a doubling",
   "a satire") crossed with ~27 visual styles. Separating those two is the key to "one system,
   many styles".
4. **A style is a written document plus scene templates.** True of all four commercial products
   examined. Nobody ships their own renderer; three use HyperFrames or plain Chrome + FFmpeg.
5. **The market is silent.** Three of four commercial kits produce no narration and no music.
   Sound is the unoccupied ground — and the thing this project has not built either.
6. **Nobody sells research.** No product analyses a niche on demand. Our `reelkit` already does
   the measured half of that.
7. **The fix for sync is one timeline, voice first.** Render narration, measure the word timings,
   and let that clock drive picture, captions, music and effects.

## What was not done, and what is uncertain

- **Flashloop's MCP server was not connected or probed.** Its tools, prompts, style format and
  render location are unknown. One free sign-up by the user would settle all four.
- **Only 8-second previews were seen**, never a full 60-second episode, and **the audio was not
  listened to**.
- **Their style count is unreconciled**: the site says 70, the gallery lists about 80 cards, my
  scroll captured 47 distinct previews.
- **Pricing cells were partly blank** in the page text; only legible figures are reported.
- **No competitor kit was opened.** Their anatomy is described from their own marketing pages.
  `reelstyles/reelstyles-free` is MIT and public and would be the specimen to read — not cloned,
  pending approval.
- **Open-source repos were assessed from metadata and descriptions**, not by reading or running
  their code. Star counts are a popularity signal, not a quality one.
- **Three speaking-rate and line-length budgets in file 04 are assumptions**, marked as such.
- **Every design in files 02–06 is a proposal.** None of it has been built or tested.

## Corrections this research makes to existing project files

| File | What it said | What the research found |
|---|---|---|
| `flashloop/BRIEF.md`, `ROADMAP.md` Phase 5 | Flashloop's Faceless Studio "is described as 'drawn in code'" | That phrase is not on their site. It belongs to an unrelated, unlicensed repo. The conclusion survives on frame evidence instead |
| `docs/STORY_REEL_FINDINGS.md` | The Roblox-style look is "out of reach" | Flashloop ships it from a prompt, so it is a kit problem — large, but not out of reach |
| `docs/REPO_REGISTRY.md` | `remotion-dev/skills` licence "—" | GitHub reports **no licence** |
| `docs/REPO_REGISTRY.md` | Piper "stays as the draft fallback" | Upstream `rhasspy/piper` is **archived** |

## Problems hit while researching

- The `gh` CLI is not installed on this machine; GitHub data came from the public REST API with
  `curl` instead. Unauthenticated, so limited to 60 requests an hour.
- Three repo lookups returned redirects (renamed or moved) and were not followed:
  `AIDC-AI/Pixelle-Video`, `redotvideo/revideo`, `calesthio/OpenMontage`.
- A vendor survey headlined "50+ pipelines reviewed" names 22. Its conclusions are used with that
  caveat stated.
- Web-search summaries of flashloop from aggregator sites were unreliable and are not relied on.
