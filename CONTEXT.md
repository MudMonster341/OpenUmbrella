# marketing_video_flow — context

**Last updated:** 2026-11-12 · **Repo:** https://github.com/MudMonster341/OpenUmbrella · **Local:** `C:\Users\Mustafa\Desktop\Mustafa\Projects\marketing_video_flow`

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

**Phase 2 — in-house tooling, partly built (2026-11-12).**

- **`tools/filmcheck`** works: measures any MP4 against the GOAL.md standards with FFmpeg and the
  standard library. First run quantified the demo problem — `focusflow-pitch.mp4` is **motionless
  for 79% of its runtime** (11 intervals, 17.9s of 22.5s), with an empty audio track at −70 LUFS.
- **`engine/onecam`** works at design time: the continuous-camera rig
  ([ADR 0007](decisions/0007-build-continuous-camera-in-house.md)). `verify.mjs` proves all four
  guarantees across every frame of the draft Paris beat sheet — no still frames, no cuts, three
  distinct easing curves, continuous gaze.

**Phase 2 — the loop is closed (2026-11-13).**

`films/paris-proto` is the first original render: 1080×1920, 14.9s, stylized low-poly Paris in
Three.js, driven by onecam through HyperFrames. **One continuous camera move, zero cuts, 0%
motionless**, and it passes every filmcheck blocker measurable without audio. Renders in ~41s.

Getting there took four framing passes and six measured M1 passes — the render found defects every
design-time check had missed, which is the whole point of having both. The log is in
[films/paris-proto/README.md](films/paris-proto/README.md).

**What is not done:** the prototype is **14.9s against a 30–40s target** and has **no audio at
all** — so it does not pass the full GOAL.md bar and must not be described as if it does. It needs
more beats before Gate 1. VoiceStudio is decided
([ADR 0004](decisions/0004-voicestudio-as-narration-engine.md)) but **not installed** — the install
method is awaiting approval. No third-party motion-design skills installed; all rated and pending
in [docs/REPO_REGISTRY.md](docs/REPO_REGISTRY.md).

**Next:** drive onecam through a real Three.js render and close the loop with filmcheck on the

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
| `STATUS/CONTEXT/GOAL/ROADMAP/MEMORY/ERRORS.md`, `decisions/` | Our written memory — the system |
| `engine/onecam/` | **Ours.** Continuous-camera rig, beat-sheet schema, design-time verifier |
| `tools/filmcheck/` | **Ours.** Quality gate — measures a finished MP4 against GOAL.md |
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

- [ROADMAP.md](ROADMAP.md) — **every goal and task, with the evidence that verified it, and the standing blockers**
- [GOAL.md](GOAL.md) — the target film, the quality standards, and the review loop
- [docs/ANIMATION_STANDARD.md](docs/ANIMATION_STANDARD.md) — the craft layer the gates cannot measure
- [docs/REPO_PLAYBOOK.md](docs/REPO_PLAYBOOK.md) — what each installed component is for
- [decisions/](decisions/) — numbered architecture decision records
- [MEMORY.md](MEMORY.md) — dated log of what happened and why
- [ERRORS.md](ERRORS.md) — failures hit and how they were resolved
- [decisions/](decisions/) — numbered architecture decision records
- [docs/REPO_REGISTRY.md](docs/REPO_REGISTRY.md) — every third-party component considered, with
  license, cost and verdict
