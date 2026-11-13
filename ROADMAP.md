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
| ✅ | Project memory system | `CONTEXT/GOAL/ROADMAP/MEMORY/ERRORS` + 10 ADRs, committed |
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
| ⬜ | flashloop.ai teardown | **Deferred to its own chat, deliberately.** Brief at `research/flashloop/BRIEF.md` — **local only, `research/` is gitignored**, so it is not in a fresh clone. No findings exist. The one carried-forward fact: their "Faceless Studio" is described as **"drawn in code"**; settling what that means is the priority. Assume nothing else from the stopped attempt |
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

## Tech debt and known issues — flagged, not buried

Logged 2026-11-13. None of these are blocking today; all of them will cost time if forgotten.

| # | Issue | Why it matters | Fix |
|---|---|---|---|
| D1 | **Moving `external_tools/editing/OpenMontage` breaks its venv** | A Python venv bakes absolute paths into its scripts. Already cost one rebuild | Rebuild after any move: `rm -rf .venv && python -m venv .venv && pip install -r requirements.txt && pip install piper-tts`. Or script it |
| D2 | **HyperFrames checkout is partial** | Windows' 260-char path limit beat the bulk checkout. `packages/studio`, `cli`, `producer` are incomplete. Harmless now — we run it via `npx` — but a trap if we ever read those | `git -c core.longpaths=true restore --source=HEAD <path>`. Same caution before cloning any large monorepo here |
| D3 | **Films must list the external styles they use** | ADR 0011: lemo-opuscar styles make a film non-commercial. Without the list, nobody can tell which films are clean | A "Styles used" section in every film README. Empty list = commercially clean |
| D4 | **Beats are duplicated** between each film's `index.html` and its `*.beats.json`, synced by hand | They will drift, and the drift will be silent | A build step that inlines the JSON at render time |
| D5 | **`scripts/checkpoint.*` is dead code** | Never used; I commit manually with fuller messages | Delete it, or start using it |
| D6 | **`films/*/lib/onecam.js` is a copy** of `engine/onecam/onecam.js` | Re-synced by hand via `node sync.mjs`; easy to forget | Fold into the D4 build step |

## onecam — improve it against onetake

We have their source as reference ([ADR 0007](decisions/0007-build-continuous-camera-in-house.md)
stands: read it, never copy it). Our rig has the better foundation — a cut is unrepresentable
rather than merely detected — but it is the less finished tool.

| # | Gap | Priority | Note |
|---|---|---|---|
| C1 | **No motion blur** | **High** | Almost certainly the main cause of the judder that survives a 0% motionless score. The single biggest perceived-quality win available |
| C2 | **30fps only** | High | onetake drafts at 1080p30 and finals at 4K60. We should at least do 60fps finals |
| C3 | No reference deconstruction | Medium | Their workflow for rebuilding a look from a reference video |
| C4 | `_driftDir` alternates sides by beat index | Low | Arbitrary. Should follow composition — drift off the subject's eyeline |

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
