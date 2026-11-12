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

---

## 2026-11-12 — Built filmcheck and onecam in house; measured the demo problem

**Did:**
- Built `tools/filmcheck` — a stdlib + FFmpeg quality gate implementing the GOAL.md standards.
  Run on the three demo renders it turned "feels choppy" into a defect: `focusflow-pitch.mp4` is
  **motionless for 79% of its runtime** (11 intervals, 17.9s of 22.5s), audio present but empty
  at -70 LUFS. The other two measure the same way.
- Built `engine/onecam` — the continuous-camera rig, taking onetake's technique and rejecting its
  non-commercial license. `verify.mjs` proves all four guarantees across 448 frames of the draft
  Paris beat sheet.
- Declined three third-party repos and recorded why: onetake (rebuilt), lemo-opuscar (reference
  only), gbro-collage-broll (rejected — paid Gemini, breaks the zero-key rule).
- Added the GitHub remote `MudMonster341/OpenUmbrella` and pushed.

**Why:** The diagnosis that the demos were "prop dumps with no judge" needed to become a number
before anything else was worth doing — 79% motionless is not a matter of taste, and it told us the
failure is stop-motion pacing, not jitter. Building rather than adopting followed from the license
audit: the two capabilities we needed most were a day's work and are better for being ours, because
they encode our bar rather than someone else's.

The design of onecam is the part worth remembering: it makes the failures *unrepresentable* instead
of detectable. A cut cannot be expressed in the API, and a permanent camera drift means a dead-frame
interval cannot form from a static camera. Checking after the fact is strictly weaker than making
the defect impossible to author.

**Decisions:** [ADR 0007](decisions/0007-build-continuous-camera-in-house.md),
[ADR 0008](decisions/0008-learn-styles-then-author-our-own.md),
[ADR 0009](decisions/0009-in-house-before-adoption.md)

**Failures:** none new. filmcheck was written to survive [ERR-0003](ERRORS.md) — it locates FFmpeg
itself when PATH is stale.

**Next:** Close the loop — drive onecam through a real Three.js scene, render, and run filmcheck on
the result. Until that passes, the rig is verified mathematics, not film. The Paris beat sheet also
plans to 14.9s against a 30-40s target and needs more beats.

---

## 2026-11-13 — Closed the render loop: onecam drives a real film

**Did:**
- Built `films/paris-proto`: a stylized low-poly Paris in Three.js, vertical 1080x1920, camera
  driven entirely by onecam through the HyperFrames three adapter. Renders in ~41s.
- Drove it to **0% motionless, 0 cuts**, passing every filmcheck blocker measurable without audio.
- Fixed onecam's M1 guarantee, which was wrong in a way no amount of code review would have found.
- Recorded [ERR-0004](ERRORS.md): HyperFrames renders nothing but exits 0 when FFprobe is off PATH.

**Why:** The first render passed every design-time guarantee and measured **48% motionless**.
`verify.mjs` asserted "the camera moves"; filmcheck measures "the image changes". The oscillation
moved the camera 3.46e-4 world units per frame, which is sub-pixel once projected — the guarantee
had been written in the wrong units. Five more measured passes found: flat-shaded surfaces need
several pixels of motion before anything differs; raising the drift broke continuity because
travels started from the authored beat position rather than where the drift had left the camera;
a pure dolly toward a distant subject barely changes the image, so the drift needed lateral
parallax; and easing curves arrive at zero velocity, so the drift has to **lead** the arrival
rather than hand off at a point.

The durable lesson: a guarantee proved in the maths is not a guarantee in the render, and a
design-time check must assert exactly what the real gate measures, in the same units. `verify.mjs`
now measures motionless intervals against the same 0.4s limit filmcheck uses.

Also worth remembering what was refused: adding animated grain would have passed filmcheck
immediately without the film moving at all. Gaming our own metric is worse than failing it.

**Decisions:** none new — this executed [ADR 0007](decisions/0007-build-continuous-camera-in-house.md).

**Failures:** [ERR-0004](ERRORS.md). Also four framing passes before any render: the automated
check passed while the camera was flying inside buildings and the payoff shot was a flat wall.
A passing check does not show how it looks.

**Next:** The prototype is 14.9s against a 30-40s target and silent. Extend the beat sheet, then
install VoiceStudio for narration and captions. Neither is started.
