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

---

## 2026-11-13 — Installed the toolchain; diagnosed the real quality gap

**Did:**
- Installed VoiceStudio 0.5.8 (read the installer first; it verifies SHA256 against published sums).
  It ships a full CLI — `speak`, `voices`, `models`, `dub` — so it is pipeline-usable. **Blocked on
  one GUI step:** first-run setup and model choice, deliberately not automated because it means a
  multi-gigabyte download.
- Cloned onetake, lemo-opuscar and ClaudeAnimationBase into `vendor/`, and wrote
  [docs/REPO_PLAYBOOK.md](docs/REPO_PLAYBOOK.md) covering what each is for and the licence
  boundary on each.
- Wrote [docs/ANIMATION_STANDARD.md](docs/ANIMATION_STANDARD.md) — the craft layer GOAL.md assumes
  and does not contain.
- Drafted [films/zombie-p1/BRIEF.md](films/zombie-p1/BRIEF.md): Part 1, one room, two characters,
  rationing food, with the reads written out.

**Why:** The Paris film passes every automated gate and still looks amateur, which means the gates
measure the wrong half. Reading what the reference repos actually do made the gap specific rather
than vague: no shadows, no tone mapping, no env map, no post-processing, 30fps with no motion blur,
and flat untextured surfaces. The remaining perceived choppiness at 0% motionless is almost
certainly 30fps judder on a continuously moving camera with hard-edged geometry.

The biggest single failure is not the renderer though — it is that the character is a 40-pixel
capsule in every shot. The character-animation reference puts it plainly: tiny characters are for
wide establishing shots only, never for a whole film. Ours was 100% establishing shot, so the
emotional arc in the brief never reached the screen at all.

That is why the zombie film is set in one room. Two characters, close camera, one practical light:
it fixes character scale by construction, makes real shadows cheap, and low-key lighting hides the
lack of surface detail that Paris daylight exposed.

**Decisions:** [ADR 0010](decisions/0010-install-reference-repos-with-a-boundary.md) — the repos
are installed as reference and local tooling; their non-commercial text and code stay out of
published work. ADRs 0007 and 0008 still stand.

**Failures:** none new.

**Next:** Build zombie-p1 with the upgraded render recipe. Prototype the character two ways — 3D
low-poly vs 2D composited — and choose by looking, not by theory. Narration stays blocked until
VoiceStudio setup is completed by hand.

---

## 2026-11-13 — zombie-p1 built; onecam made scale-aware. SESSION CUT BY USAGE LIMIT

**Did:**
- Built `films/zombie-p1`: one room, two characters with faces, a practical lamp, shadows,
  NeutralToneMapping, bloom. Rendered 1080x1920, 35.3s, 13.7 MB, 2m38s.
- Made onecam **scale-aware** — three separate bugs, all the same class (absolute world units in a
  rig used at wildly different scales):
  1. easing/duration thresholds were absolute, so every room-sized move read as "a nudge" and one
     curve was used throughout (M2 fail);
  2. `verify.mjs`'s still-frame epsilon was ~12x too strict for a metre-scale interior;
  3. **drift rate must be per beat**, scaled by that beat's own subject distance — one global rate
     cannot serve a 1.2m close-up and a 3.4m wide. The shelf beat held a motionless frame for 5.2s
     while the near beats passed.
- Paris re-verified after every change: no regression.

**Why:** The Paris film looked basic because the gates measure pixels changing, not quality.
zombie-p1 applies the craft standard: real shadows, tone mapping, a single practical, character
scale, and faces. Staging took five measured passes — the camera flew through furniture, the lamp
sat on the camera-to-subject axis and blew the frame out with bloom, and the close-up was pointed
at the BACK of Claude's head.

**Failures:** none new in ERRORS.md; the staging failures are logged in the film's README pattern.

**STATE AT CUT-OFF — read this first next session:**
- `engine/onecam` passes verify on both films with per-beat drift. **The zombie render on disk
  PREDATES that fix** and still fails filmcheck M1 (8 intervals, worst 1.5s, all in the far beats).
  **Re-render zombie-p1 and re-run filmcheck — that is step one.**
- Not done: audio (VoiceStudio setup still incomplete), 60fps final, the shelf beat is the weakest
  frame, the close-up's face is crude.
- A subagent researching flashloop.ai was still running at cut-off; if it finished it wrote
  `research/flashloop/FINDINGS.md`. Check whether that file exists.

---

## 2026-11-13 — Drift override removed; flashloop deferred; a browser tab was left playing

**Did:**
- Found why the zombie re-render still failed: I had pinned `holdDrift: 0.07` when the room was a
  cramped 5m box and the camera kept hitting furniture. After the room was rebuilt twice as large
  with the camera on an arc outside the props, that constant was far too small — the shelf beat sat
  motionless for 2.03s. Override removed; the rate now derives from scene scale and then per beat.
  `verify.mjs` passes 4/4 across 1065 frames. Re-render was still running at hand-off.
- Wrote `ROADMAP.md`: every goal and task with the evidence that verified it, plus standing
  blockers and who can clear each. Nothing is ✅ without named evidence.
- Wrote `research/flashloop/BRIEF.md` and **stopped** the research agent — that work moves to its
  own chat.

**Why the drift lesson matters beyond this film:** a hand-pinned constant that was correct for one
version of a scene silently became wrong for the next. That is precisely the failure the
scale-aware rig exists to prevent, and I had opted out of it by hand. Prefer the derived value;
if an override is genuinely needed, tie it to something that changes when the scene changes.

**A real operational mistake, worth remembering:** the user asked whether audio was playing on
their machine. I checked processes, saw only my headless-Chrome render and ffmpeg, and told them
no source of mine was plausible. That was wrong. The research subagent had been driving the
**in-app browser**, and a tab was still open on `assets.flashloop.app` with the pane hidden — a
media domain, invisible to the user, fully capable of playing audio. Closed it.
**Lesson: when asked whether something of ours is doing X, enumerate what our *subagents* are
doing too, not just our own processes. A hidden browser pane is still our process.**

**Next:** verify the re-render with filmcheck before marking the zombie row done. Narration still
blocked on VoiceStudio setup.

---

## 2026-11-13 — Restructured into external_tools/; lemo-opuscar adopted

**Did:**
- All external clones moved under `external_tools/`, segregated by role: `editing/` (OpenMontage),
  `motion/` (hyperframes, lemo-opuscar, ClaudeAnimationBase, onetake), `art_style/` (empty, for
  references the user will supply), `voice/` (empty — VoiceStudio is an installed app).
- **Cloned the HyperFrames source**, which had never been fetched — we only ever used its npm CLI,
  so 210 registry blocks and 239 components had been sitting unexamined.
- Rebuilt the OpenMontage venv, which the move broke. All three runtimes verified live again.
- Retired `PLANS.md` into `ROADMAP.md` and pinned every vendor commit in the registry.

**Why:** the user's framing is right and worth keeping: *outside code supplies capability and
reference; the work is ours.* The flat `vendor/` gave no signal about what each repo was for, and
category folders make the licence boundary visible at a glance rather than buried in a doc.

**Decisions:** [ADR 0011](decisions/0011-use-lemo-opuscar-styles-non-commercially.md) supersedes
0008 — the films are non-commercial, so lemo-opuscar's 101 styles are usable directly. Two
obligations recorded rather than remembered: attribution is required, and the output inherits the
restriction, so each film lists the external styles it used. A film with an empty list is
commercially clean.

**Failures:** the HyperFrames checkout is **partial** — Windows' 260-character path limit defeats a
deep monorepo under a long base path. `git -c core.longpaths=true restore --source=HEAD <path>`
recovered the parts that matter. Worth knowing before cloning any other large monorepo here.

**Next:** re-stage the shelf beat — still the gate failure and the weakest shot. VoiceStudio
runtime was installing at hand-off; verify with `voicestudio models list`.
