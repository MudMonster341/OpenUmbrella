# STATUS — at a glance

**Generated:** 2026-11-13 08:25 · Refreshed hourly by the `project-status-update` scheduled task.
Full detail: [ROADMAP.md](ROADMAP.md) · [CONTEXT.md](CONTEXT.md) · [MEMORY.md](MEMORY.md)

## Right now

| | |
|---|---|
| **Working on** | Zombie Part 1 — gate still failing on one beat |
| **Blocked on you** | VoiceStudio setup (1 GUI pass) · Instagram login in Chrome |
| **Last result** | Render verified: **11% motionless, worst 0.93s** (was 2.03s). All of it in the shelf beat |
| **Next** | Re-stage the shelf beat, then motion blur + 60fps on onecam |

## Accomplished

| Thing | State | Proof |
|---|---|---|
| Toolchain installed | ✅ | 3 runtimes live, 3 demos rendered |
| `filmcheck` quality gate | ✅ | Measured demo at **79% motionless** |
| `onecam` camera rig | ✅ | 4/4 guarantees, both films |
| Paris film | ✅ | 1080×1920, 0 cuts, **0% motionless** |
| Memory + ADRs (10) | ✅ | Committed, pushed |
| Animation standard | ✅ | 6 missing techniques named |
| VoiceStudio installed | ✅ | 0.5.8, checksum verified |
| 3 reference repos | ✅ | Vendored, licence boundary written |
| Zombie Part 1 | 🔬 | Built + renders; **gate not passed yet** |
| flashloop teardown | ⬜ | Brief written, deferred to its own chat |

## Goals

| # | Goal | Status |
|---|---|---|
| 1 | Films that look market-grade, not generated | 🚧 ongoing |
| 2 | Zombie Pt 1 passes every gate | 🔬 close |
| 3 | Narration + captions working | ⛔ VoiceStudio setup |
| 4 | House style frozen and reusable | ⬜ |
| 5 | Reverse-engineering as a standing capability | ⬜ |

## Folder structure

| Path | What |
|---|---|
| `STATUS/CONTEXT/GOAL/ROADMAP/MEMORY/ERRORS.md` | The written memory |
| `decisions/` | 10 numbered ADRs |
| `docs/` | Animation standard, repo playbook, registry, walkthrough |
| `engine/onecam/` | **Ours** — continuous-camera rig + verifier |
| `tools/filmcheck/` | **Ours** — quality gate |
| `films/paris-proto/` | ✅ passing |
| `films/zombie-p1/` | 🔬 current film |
| `research/flashloop/` | Brief only (gitignored) |
| `external_tools/editing/` | OpenMontage + its venv |
| `external_tools/motion/` | hyperframes · lemo-opuscar · ClaudeAnimationBase · onetake |
| `external_tools/art_style/` | empty — references go here |
| `external_tools/voice/` | empty — VoiceStudio is an installed app |

## Known problems

| Problem | Severity |
|---|---|
| Zombie render not yet gate-passing | High |
| No audio on any film | High |
| Faces crude in close-up | Medium |
| Shelf beat is the weakest shot | Medium |
| **No motion blur** — main cause of remaining judder | **High** |
| 30fps only; onetake does 4K60 | High |
| 6 tech-debt items logged in ROADMAP | Low |
| 7.7 GB RAM — ~2m40s per draft | Low |
