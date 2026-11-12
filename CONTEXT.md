# marketing_video_flow — context

**Last updated:** 2026-11-12 · **Repo:** local only, no remote yet · **Local:** `C:\Users\Mustafa\Desktop\Mustafa\Projects\marketing_video_flow`

## What this is

A local, agent-driven video production system for making short films about using Claude and AI
agents well. It assembles free and open-source parts — OpenMontage as the pipeline spine,
HyperFrames and Remotion as render runtimes, local TTS for narration — into one governed workflow
where an agent plans, builds, reviews and renders, and a human approves at the creative gates.

It is not a video app. It is a set of instructions, standards and vendored tools that an AI coding
agent drives. The intelligence is the agent plus the written standards; the code is tools and
persistence.

## Why it exists

Agent-made video is easy to produce and almost always looks it — templated motion, text-heavy
slides, no rhythm, no sound design. The gap is not rendering capability, it is **taste enforced as
process**: a quality bar, a motion grammar, and a critic that judges the actual render rather than
the intent. This project exists to close that gap and make the result repeatable, so a second film
starts from the first film's standards instead of from zero.

## Current state

**Phase 1 — setup complete and verified (2026-11-12).**

- OpenMontage cloned to `OpenMontage/` (gitignored vendor clone). Python venv, all dependencies,
  Remotion (199 packages, esbuild postinstall approved), HyperFrames CLI 0.9.39, FFmpeg 9.0.2,
  Piper TTS with the `en_US-lessac-medium` voice.
- All three composition runtimes report live: `{"ffmpeg": true, "remotion": true, "hyperframes": true}`.
- Render chain proven end to end: three zero-key demos rendered, verified with ffprobe
  (1920x1080, h264+aac, 22–25s each, $0).
- No API keys configured, by design.

**What is not done:** no original film yet. The demos are stock prop dumps and their motion quality
is below the bar ([GOAL.md](GOAL.md)). Narration engine is being upgraded from Piper to VoiceStudio
([ADR 0004](decisions/0004-voicestudio-as-narration-engine.md)) — **not yet installed**. No motion-design
skill layer installed yet; candidates are rated in [docs/REPO_REGISTRY.md](docs/REPO_REGISTRY.md)
and all await approval.

**Next:** the first real deliverable — see [GOAL.md](GOAL.md) and [PLANS.md](PLANS.md).

## How to run it

```powershell
cd OpenMontage
.\.venv\Scripts\Activate.ps1
```

```powershell
python -c "from tools.tool_registry import registry; import json; registry.discover(); print(json.dumps(registry.provider_menu_summary()['composition_runtimes'], indent=2))"
```

```powershell
python render_demo.py --list
```

```powershell
python -m backlot open
```

Activating the venv is not optional: Piper is only detected when `.venv\Scripts` is on PATH, and
without it narration silently has no provider.

## Where things live

| Path | What it is |
|---|---|
| `CONTEXT.md`, `GOAL.md`, `PLANS.md`, `MEMORY.md`, `ERRORS.md`, `decisions/` | Our written memory — the system |
| `docs/` | Walkthrough, motion-quality research, the third-party repo registry |
| `scripts/` | `checkpoint.ps1` / `checkpoint.sh` — commit and push the memory files |
| `OpenMontage/` | Vendored clone of the production pipeline. **Gitignored. Never edited.** |
| `vendor/` | Future third-party clones, one directory each. **Gitignored.** |
| `OpenMontage/projects/<id>/` | Per-production workspace: artifacts, assets, renders |

## Constraints

- **No GPU.** Intel integrated graphics only. Rules out local video-generation models (WAN,
  Hunyuan, CogVideo, LTX) and makes heavy 3D rendering slow. Drives
  [ADR 0006](decisions/0006-stylized-3d-over-photoreal.md).
- **No paid API keys.** Zero-key operation is the default, not a limitation to route around
  ([ADR 0002](decisions/0002-zero-key-local-first-default.md)).
- **Commercial use is possible**, so non-commercial-licensed components are disqualified for
  output we may publish. See the license table in [CLAUDE.md](CLAUDE.md).
- **Node 24.18.1** is below the `^24.22.1` that Remotion asks for. It renders, but it is the first
  thing to change if the renderer misbehaves.
- **Nothing is installed without explicit approval** ([ADR 0003](decisions/0003-approval-gate-for-third-party-code.md)).

## Memory

- [GOAL.md](GOAL.md) — the target film, the quality standards, and the review loop
- [PLANS.md](PLANS.md) — phased roadmap and what is active now
- [MEMORY.md](MEMORY.md) — dated log of what happened and why
- [ERRORS.md](ERRORS.md) — failures hit and how they were resolved
- [decisions/](decisions/) — numbered architecture decision records
- [docs/REPO_REGISTRY.md](docs/REPO_REGISTRY.md) — every third-party component considered, with
  license, cost and verdict
