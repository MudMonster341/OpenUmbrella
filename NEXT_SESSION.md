# Next session — paste everything below into a fresh session

---

Continue the AI video project at:
`C:\Users\Mustafa\Desktop\Mustafa\Projects\marketing_video_flow`

**Read these first, in order, before doing anything:**

1. `CLAUDE.md` — the hard rules. Rule 4 (flag every problem, never let one pass silently) outranks
   looking competent.
2. `AGENT_GUIDE.md` — the contract: cold start, the three products, the traps that have cost time.
3. `CONTEXT.md` — orientation. Its top section states the current direction.
4. `decisions/0013-story-reels-are-the-product.md` — **the direction. Read in full.**
5. `docs/STORY_REEL_FINDINGS.md` — the measured evidence behind it.
6. `ROADMAP.md` — Phase 7 is the live one. Tech debt D1–D6, standing blockers.
7. `tail -n 250 MEMORY.md`
8. `ERRORS.md` — ERR-0001 to ERR-0005. All five will bite again.

State in one line what you learned, then start.

---

## Where things stand

**The product is story reels.** The user writes a story; we animate it. 60–130 seconds, serialised
as "Part N", ending on a binary choice put to the viewer. This is **not** marketing content —
`films/reel-01-agent-loop` is a 20s marketing reel kept only as a worked example of code-drawn 2D.

Two reference reels were measured on 2026-11-13 with `tools/reelkit`, and they **contradict four
standards this project was built on.** Do not re-derive these; they are measured:

| | @zaylento (Roblox) | @what_if_animator (2D cartoon) |
|---|---|---|
| Runtime | 125.3s | 78.8s |
| Shots / median | 65 / **1.73s** | 44 / **1.60s** |
| Loudness | −14.2 LUFS, LRA **4.3** | −14.1 LUFS, LRA **2.1** |
| Silence gaps >0.35s | **0, in 125 seconds** | 8 |

1. **Duration** — `GOAL.md` and `docs/REEL_STRUCTURE.md` assume 30–40s. Stories run 79–125s.
2. **Cuts** — `engine/onecam` makes a cut *unrepresentable* and `filmcheck` M4 fails any scene
   change. Stories cut every ~1.6s. **onecam is not wrong, it is the wrong product.** We have no
   editing grammar at all and need one.
3. **Audio** — a flat compressed wall at −14 LUFS that never pauses. Not the dynamic sound spec
   (hard stops, near-silent bars) we adopted from swiss-motion.
4. **The ending** — a dilemma with two defensible answers, not a call to action. That is what
   produced 4,545 comments on the first reel.

**The engine decision is already made** (ADR 0013 §3): build the **UI-driven** story engine, not
the filmed-game-world look. The Roblox reel's 65 shots are 65 dressed locations with Roblox Studio
as the asset library — we have none and cannot afford to hand-author that. The cartoon reel is
reproducible because most of its screen time is **interface generated from data**: a clock, a
**helmet battery counting 31% → 8% as a live ticking stake**, thermal-camera feeds, rule cards, a
poll card, an A/B choice card. That is code drawing a panel from a value, which
`films/reel-01-agent-loop/index.html` already demonstrates.

Characters stay flat 2D in a handful of poses. **Scale carries the acting** — an extreme close-up
filling the frame — which is also the fix for the character-scale failure that sank `paris-proto`.

---

## Priority order

### 1. Unblock narration and captions — this is now the critical path

Captions are **the primary graphic element** in both references, not an accessibility afterthought.
Nothing else in the product works without them.

- Check `voicestudio models list`. If it still reports "has not finished setup", **that is a
  user-only GUI step** — say so plainly and do not try to automate it. It has been the top blocker
  since 2026-11-12.
- If it works: wire narration with `speak --instruct` for direction and `--seed` for determinism,
  one WAV per line.
- Then word-level timing by forced alignment, and build **both** caption schools so they can be
  compared by looking:
  - **word-at-a-time**, centred lower-third, bold, heavy black outline (the Roblox school);
  - **phrase, all-caps, with one key word in the signal colour** (the cartoon school).

### 2. Build the UI-driven story engine

A new project under `films/`. Primitives, all drawn from data:

- a **persistent HUD** — clock, and a **depleting resource** that is the tension carrier;
- a **standing hook banner** with a `PART N` badge, locked over the opening while the story runs;
- **diegetic screens as shots** — camera feeds, gauges, readouts, rule cards, status pills;
- a **poll card** mid-film and a **terminal A/B choice card**;
- a small flat-2D cast, few poses, used big in frame.

Carry forward from ADR 0012 (swiss-motion): grid discipline, one signal colour, **tempo must divide
the frame rate**, entrances as wipes/clip-reveals never fades. The references are 30fps. Do **not**
carry forward snap-and-hold as the whole motion vocabulary — the user explicitly asked for a more
animated style — or the dynamic sound spec.

### 3. Give us an editing grammar

We have none. `engine/onecam` forbids cuts by construction. A story reel is an edit: ~1.6s median
shot, shot types that alternate (character / interface / wide), and cuts that land with narration.
This is new work, not a tweak to onecam. **Leave onecam alone — it belongs to the 3D films.**

### 4. Split `filmcheck` by product

One gate cannot serve all three. ADR 0013 §5 has the table. Required:

| Standard | 3D film | Story reel |
|---|---|---|
| M4 cuts | 0 | ~1.6s median expected; **absence of cuts is the failure** |
| X2 duration | 30–40s | 60–130s |
| M1 dead frames | 0.4s, works | **Whole-frame detection is proven blind to small motion** (ADR 0012) — build the event-gap check over the beat sheet instead |
| A1 loudness | −14 LUFS | −14 LUFS **and LRA < 5** — flatness is a requirement, not a defect |

### 5. Keep the research loop running

`python tools/reelkit/reelkit.py ingest <direct reel URL>` — proven working on Instagram,
unauthenticated, ~2 minutes per reel. Fill the generated `REVIEW.md` **by looking at the frames**.

When ten teardowns agree on something `docs/REEL_STRUCTURE.md` or `docs/STORY_REEL_FINDINGS.md`
contradicts, change the document and say so in `MEMORY.md` with the date.

---

## Hard constraints — do not rediscover these

- **Account-level analysis is impossible.** `yt-dlp` marks `instagram:user` **BROKEN** upstream and
  Agent-Reach's Instagram channel needs a Chrome-cookie login the user has not approved. **Per-reel
  from pasted URLs works perfectly.** Ask for reel links, never an account.
- **X/Twitter needs a login** (Chrome cookie copy) — unapproved. **Reddit, GitHub, YouTube, V2EX
  and web all work with no login**: `agent-reach reddit search "..."`.
- Agent Reach runs its browser on **port 9333**. Port 9222 is the user's own Chrome — do not kill it.
- **Windows FFmpeg has no glob support.** Build contact sheets from the source video with
  `fps=` + `tile=`, not from a frame directory.
- `npx hyperframes snapshot --at "2.5,9,17"` — **comma-separated**. Repeating `--at` silently keeps
  only the last value.
- **Judge a render by the FILE, never the exit code** (ERR-0004). And never pipe `filmcheck` through
  `tail` — it replaces the exit code with `tail`'s.
- Activate the venv for OpenMontage work: `cd external_tools/editing/OpenMontage && .\.venv\Scripts\Activate.ps1`.
  `tools/reelkit` has its own venv on purpose (tech debt D1).
- **Never edit anything in `external_tools/`.** `research/` is gitignored and holds
  third-party video — never commit it, never ship their frames.
- **Licence:** any film built to a lemo-opuscar style is **non-commercial** and needs attribution
  (ADR 0011). Every film README lists the styles it used; an empty list means commercially clean.

## Working rules

- **Nothing is done without named evidence.** A film that has not passed its gate is not done.
- **Always look at rendered frames** before claiming a shot works. Every framing defect in this
  project's history was caught by looking, never by a checker.
- **No new repos, skills or models without explicit approval.** Screen the licence first and record
  the outcome — approved or rejected — in `docs/REPO_REGISTRY.md`.
- **Flag every error, partial success and workaround**, including ones already fixed.
- Write memory as you go: a real decision → a numbered ADR; a non-obvious failure → `ERRORS.md`;
  end of a chunk → `MEMORY.md` and a `CONTEXT.md` refresh. **Absolute dates.**

## One thing to ask the user early

**The story.** The product is "the user writes a story, we animate it" and there is no story yet.
Ask for one — or offer to draft one to their brief — before building an engine with nothing to run
through it. A first story should be short enough to finish: one location, two characters, a
depleting resource, and a binary choice at the end.
