# MEMORY

Append-only, dated log of what happened and why. Newest at the bottom. Read with
`tail -n 150 MEMORY.md`.

---

## 2026-11-12 — Foundation: OpenMontage cloned, set up and verified

**Did:**
- Cloned `OpenMontageInc/OpenMontage` and read its agent contract, pipeline manifests and tool
  registry to understand what it actually is: an instruction-driven system where the AI agent is
  the orchestrator and Python only provides tools and persistence.
- Installed the full local stack on Windows: FFmpeg 9.0.2 (winget), Python venv with all
  requirements, Remotion (199 packages), HyperFrames CLI 0.9.39, Piper TTS 1.8.0 plus the
  `en_US-lessac-medium` voice model.
- Verified all three composition runtimes report live, and rendered three zero-key demos,
  confirmed with ffprobe at 1920×1080 h264+aac.
- Wrote the setup walkthrough, now at [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md).

**Why:** The goal needs a proven render chain before any creative work, and the capability envelope
needed to be measured rather than assumed — the registry reports `0` configured providers for image
generation, video generation and music with no keys, which is the real boundary the creative plan
has to respect.

**Decisions:** [ADR 0001](decisions/0001-openmontage-as-production-spine.md),
[ADR 0002](decisions/0002-zero-key-local-first-default.md)

**Failures:** [ERR-0001](ERRORS.md), [ERR-0002](ERRORS.md), [ERR-0003](ERRORS.md) — all three were
silent failures that would have surfaced much later, during a render.

**Next:** Raise motion quality. The demos render correctly but their motion is below the bar.

---

## 2026-11-12 — Motion-quality research and the project memory system

**Did:**
- Diagnosed why the demo renders look choppy: they are static JSON prop dumps through generic
  components, with uniform spring defaults, no beat, no sound, and nothing judging the output.
  The renderer is not the problem.
- Researched the Claude-Code motion-design ecosystem and rated the five repos from the reference
  reel plus VoiceStudio. Recorded every one, approved or not, in
  [docs/REPO_REGISTRY.md](docs/REPO_REGISTRY.md) with license, cost and verdict.
- Established this project root as the system: memory files, decisions, docs and scripts here;
  third-party code vendored and gitignored.
- Set the north star and the measurable quality bar in [GOAL.md](GOAL.md): "Claude in Paris",
  vertical, stylized 3D, continuous camera, with pass/fail standards and a six-gate review loop.

**Why:** Two things forced the structure. First, license screening turned out to be load-bearing —
two of the five reel repos are non-commercial-restricted, which is invisible unless someone checks
every time, so it became a written rule rather than a habit. Second, quality cannot be enforced by
intention: the gap between the demos and the goal is a *process* gap, so the bar had to become
measurable and the critic had to be separated from the builder.

**Decisions:** [ADR 0003](decisions/0003-approval-gate-for-third-party-code.md),
[ADR 0004](decisions/0004-voicestudio-as-narration-engine.md),
[ADR 0005](decisions/0005-project-root-owns-the-system.md),
[ADR 0006](decisions/0006-stylized-3d-over-photoreal.md)

**Failures:** none this chunk.

**Next:** Get approval on the VoiceStudio install method and the motion-design skill layer, then
build the automated checks (dead-frame scan, scene-change count, loudness) that Gates 3 and 4
depend on. Without those the quality bar is just an opinion.
