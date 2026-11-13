# ROADMAP — goals, tasks, and what counts as done

**Last updated:** 2026-11-13

The rule that makes this file worth keeping: **nothing is marked ✅ without evidence.** Every done
row names the command, measurement or artefact that proves it. "It looks finished" is not evidence,
and a passing automated check is not evidence that a film is good — four framing passes on Paris
and five on the zombie film were all caught by *looking at frames*, none by the checker.

| Status | Meaning |
|---|---|
| ✅ | Done **and verified**, with the evidence named |
| 🔬 | Built, awaiting verification |
| 🚧 | In progress |
| ⬜ | Not started |
| ⛔ | Blocked — the blocker is named |

---

## Phase 1 — Foundation ✅

| | Task | Evidence |
|---|---|---|
| ✅ | OpenMontage cloned and set up | `provider_menu_summary()` → all three runtimes `true` |
| ✅ | FFmpeg, venv, Remotion, HyperFrames, Piper installed | Three zero-key demos rendered, ffprobe-verified 1920×1080 h264+aac |
| ✅ | Project memory system | `CONTEXT/GOAL/PLANS/MEMORY/ERRORS` + 10 ADRs, committed |
| ✅ | Third-party repo registry with licence screening | `docs/REPO_REGISTRY.md`; two non-commercial repos identified before use |

## Phase 2 — In-house tooling ✅

| | Task | Evidence |
|---|---|---|
| ✅ | `tools/filmcheck` quality gate | Measured the demo defect: `focusflow-pitch` **79% motionless** |
| ✅ | `engine/onecam` continuous camera | `verify.mjs` → 4/4 guarantees across every frame |
| ✅ | Paris proto renders and passes | 1080×1920, 14.9s, **0 cuts, 0% motionless** |
| ✅ | onecam made scale-aware | Both beat sheets pass after the change; Paris re-verified, no regression |

## Phase 3 — Toolchain and craft ✅ / ⛔

| | Task | Evidence / blocker |
|---|---|---|
| ✅ | VoiceStudio installed | 0.5.8, checksum verified; CLI present with `speak`/`voices`/`models` |
| ⛔ | VoiceStudio usable | **`voicestudio models list` still reports "has not finished setup".** Needs the first-run GUI pass and a model chosen. Blocks all narration |
| ✅ | onetake, lemo-opuscar, ClaudeAnimationBase vendored | `vendor/`, gitignored, boundary in ADR 0010 |
| ✅ | Animation standard written | `docs/ANIMATION_STANDARD.md` — six missing render techniques named |
| ✅ | Repo playbook | `docs/REPO_PLAYBOOK.md` — per-repo use and licence class |

## Phase 4 — Zombie Part 1 🚧

| | Task | Evidence / next |
|---|---|---|
| ✅ | Brief with written reads | `films/zombie-p1/BRIEF.md`, six reads |
| ✅ | Room, lighting, characters built | Shadows, NeutralToneMapping, bloom, practical lamp, faces |
| ✅ | Staging corrected | Five passes: furniture collisions, lamp on the lens axis, close-up on the back of the head |
| 🔬 | **Render passes filmcheck** | The committed render **predates** the per-beat drift fix and failed M1 (8 intervals, worst 1.5s). Re-render running — **verify before claiming done** |
| ⬜ | 60fps final | Draft is 30fps. Render cost ~2m40s at 30fps, so budget ~6min |
| ⬜ | Narration + captions | ⛔ on VoiceStudio setup |
| ⬜ | Sound design | Room tone, SFX on the can moves, back-timed to the final frame |
| ⬜ | Shelf beat reshot | Weakest frame — cans read small, shelf mostly empty planks |
| ⬜ | Face quality pass | Eyes added, but crude in close-up. The close-up is READ 5, the whole film |

## Phase 5 — Research and reference ⬜

| | Task | Evidence / next |
|---|---|---|
| ⬜ | flashloop.ai teardown | **Deferred to its own chat, deliberately.** Brief written: `research/flashloop/BRIEF.md`. No findings exist — the one carried-forward fact is that their "Faceless Studio" is described as **"drawn in code"**, and settling what that means is the priority. Do not assume anything else from the stopped attempt |
| ⬜ | Instagram reference board | Needs Instagram login in Chrome. I can read frames, not audio |
| ⬜ | Reverse-engineer method, generalised | Make the flashloop teardown a repeatable workflow for any reference product |

## Phase 6 — House style and the series ⬜

| | Task |
|---|---|
| ⬜ | Freeze style tokens from whatever survives the zombie film |
| ⬜ | Reusable room/character kit so film #2 starts from film #1's taste |
| ⬜ | Zombie Part 2 |
| ⬜ | "An agent is a loop, not a chatbot" |

---

## Standing blockers

| Blocker | Impact | Who can clear it |
|---|---|---|
| VoiceStudio setup incomplete | No narration, no captions on any film | **User** — one pass through the app, choose a model |
| Instagram not logged in | Cannot read reference reels | **User** — sign in to Chrome |
| 7.7 GB RAM, integrated GPU | ~2m40s per 30fps draft; 60fps ≈ 6min | Hardware |
| No paid API keys (by choice, ADR 0002) | No generated imagery or motion | Deliberate |

## How to resume cold

1. `CONTEXT.md` → `tail -n 150 MEMORY.md` → this file.
2. Re-render zombie-p1 and run `tools/filmcheck` before trusting any 🔬 row.
3. Look at the frames. `npx hyperframes snapshot --at ...`. A passing check is not a look.
