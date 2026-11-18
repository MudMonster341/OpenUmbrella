---
name: story-reel
description: Turn a story the user wrote into a finished story reel in this repo — bible, script, critic gate, narration, build, frame gate, mix, render, final gate. Use when the user gives a story, a "what if", or asks to make/continue an episode or a Part N.
---

# story-reel — one story, start to finish

The user writes the story; we animate it ([ADR 0013](../../../decisions/0013-story-reels-are-the-product.md)).
This is the order of work. **Stages 4 onward are designed but not yet proven end to end** — the
first run through this skill is also its test. Report where it breaks.

## Before starting

Read `CONTEXT.md`, the tail of `MEMORY.md`, `ROADMAP.md` Phase 7, and search `ERRORS.md`.
Then read the template: `market_research_and_intelligence/story/STORY_TEMPLATE.md`.

## The stages

| # | Stage | Output | Gate |
|---|---|---|---|
| 1 | **Intake** | `films/<slug>/STORY.md` §1–2 from the user's words | Format and style chosen by the user, not assigned |
| 2 | **Bible + episode plan** | STORY.md §3–4 | All episodes outlined before one is scripted |
| 3 | **Script** | STORY.md §5–6, five hooks then one; **the script as data in `films/<slug>/<part>_script.json`** (one format for every part) | **`python tools/scriptcheck/scriptcheck.py <file>` must PASS** (text, structure, the virality hook checklist, the ledger, audio once voiced, the publish filter); then the **`script-critic` agent**, then **the user reads it** |
| 4 | **Voice** | one WAV per line in `audio/` | Every line measured for duration |
| 5 | **Timings** | `words.json` | `tools/reelkit/.venv/Scripts/python.exe tools/reelkit/align.py <audio_dir> --check` (system python has no faster-whisper; found 2026-11-18) (offline; approved 2026-11-14) |
| 6 | **Build** | `index.html` from the style document | `npx hyperframes snapshot` at every line |
| 7 | **Frames** | snapshots | `node check_direction.mjs` + `check_bus.mjs` (bare, never piped), **`film-critic` agent**, then **the user looks** |
| 8 | **Sound** | `sound/synth.py` + `music.py`, then `sound/master.py` | −14 LUFS, LRA ≤ 5, master **Linear**, measured |
| 9 | **Render** | `python tools/ship/ship.py films/<slug> vN`: the gates, the 60 fps render (outside the lab), the mux, the auto-review, the failure frames, the contact sheet, `<name>_ig.mp4` (Instagram, checked by `tools/ship/ig_check.py`) and `<name>_phone.mp4` | its summary; then LOOK at the failure tile and the contact sheet. One span: `--start S --end E --fps 30` |
| 10 | **Final** | STORY.md §7 | **`auto-review` skill (must pass)** + `filmcheck` + **`film-critic`** + **the user watches with sound** |

## Rules that are not negotiable

- **Every line needs a picture that is not its own words, written down before anything is built.**
  Fill STORY_TEMPLATE's "On screen — in words, not the text of the line" column for every line, then
  **cover the line column and read the sheet.** If the story does not survive, the beat sheet is not
  finished. reel-02 v1 skipped this column and 19 of its 26 shots became the line again in a smaller
  font — `GOAL.md` T3's definition of a slide deck. The rule already existed; the gate did not.
- **The writer does not judge the script and the builder does not judge the film.** Use the agents.
- **Stop at stage 3 until the user approves the script.** Nothing is voiced before that.
- **Voice before picture.** Narration is the clock; picture is timed to measured audio, never the reverse.
- **A line that is too long is shortened and re-voiced.** Never speed up audio.
- Maximum two fix rounds per gate, then stop and report.
- Every film README lists the styles and assets used with their licences.

## Known state — check before promising anything

- **Narration works** (VoiceStudio, verified 2026-11-13):
  `voicestudio.exe speak --voice <id> --language English -o <file.wav> "<line>"`
  at `C:\Users\Mustafa\AppData\Local\Programs\VoiceStudio\resources\cli\`. Use `--seed` for
  repeatability and `--instruct` for direction. **It is ~15× slower than real time on this CPU** —
  tell the user the wait up front and run long batches in the background.
- **The voice model is non-commercial** (OmniVoice weights, CC-BY-NC).
- **Do not use the user's cloned voice** unless they ask for it by name.
- **Word timings exist, offline.** `speak` returns none, so run `tools/reelkit/.venv/Scripts/python.exe tools/reelkit/align.py <audio_dir> --check` (system python has no faster-whisper; found 2026-11-18)
  (faster-whisper, MIT, using the model VoiceStudio already placed on disk; approved 2026-11-14). It keeps the
  *script's* words and borrows the *measured* times, because Whisper normalises numerals. **Read what `--check` flags.**
  Do not fake word timing by dividing a line evenly and calling it synced. *(Corrected 2026-11-15: this section
  used to say no aligner existed.)*
- **`filmcheck` is still tuned for the 3D film**: it fails cuts and expects 30–40 s. For a story
  reel pass `--allow-cuts` and `--target-duration` to suit, and treat M1 as not applicable for
  flat styles (ADR 0012, ADR 0013 §5).
- No music or effects library has been approved. Each pack is its own approval. The sound is procedural and ours (ADR 0015).
- **Every user note on a film goes into `tools/autoreview/FEEDBACK.md` the same day** (the `auto-review` skill).

## When finished, or when stopping

Fill STORY.md §7 with evidence, including the "not checked" row. Then the `project-memory`
routine: MEMORY.md entry, ROADMAP row with evidence, ERRORS.md for anything non-obvious.
