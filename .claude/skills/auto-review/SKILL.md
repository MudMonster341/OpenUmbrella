---
name: auto-review
description: Run the deterministic auto-reviewer on a story-reel render, and grow it from every piece of user feedback. Use before showing the user any render, at every frame and final gate, and whenever the user gives a note on a film ("choppy", "too slow", "the voice is noisy", "the eye is broken").
---

# auto-review — our quality gate that learns

`tools/autoreview/autoreview.py` is the pipeline the user asked for on 2026-11-16: *"make the checks deterministic … a pipeline
which we will call our auto reviewer … we keep updating and improving and adding onto this, so that we learn from our mistakes."*

Same inputs, same verdict. It measures the render, its sound stems and the voice takes against the plan
(`story_reel_foundation/lab/export_plan.mjs`) and against every rule we have learned. Each check names its source: a user note
or an `ERRORS.md` entry.

## 1. Run it on every render, before anyone else sees it

**Normally through `python tools/ship/ship.py films/<slug> vN`**, which runs it quietly after the render and mux, tiles the frames at every failure's time
(`review/<name>_failures.png`), and makes the contact sheet and the Instagram file. Run it by hand only to re-review:

```bash
tools/reelkit/.venv/Scripts/python.exe tools/autoreview/autoreview.py films/<slug> --video films/<slug>/renders/<file>.mp4
```

- It writes `films/<slug>/review/AUTOREVIEW.md` and `autoreview.json`, and exits 1 on any blocking failure.
- `--no-asr` skips the Whisper word check. That is fine while iterating, but **never on a render you report.**
- Run it **after** the mux. It measures the sound inside the video, and refuses stems that belong to another render.
- **A failure is a finding, not noise.** On its first run it found four real faults: gestures snapping on and off (ERR-0018),
  a caption past the frame edge, judder in the jog, and music too loud under the voice.
- **A pass is not "good".** It means none of the known faults are present. Faces, acting, story and taste are still judged by the
  `film-critic` agent and by the user. Say so in every report.

## 2. Every user note goes into the ledger, the same day

`tools/autoreview/FEEDBACK.md` gets one row per note: the date, the user's words, what kind of fault it is, which check guards it,
and its status.

- **Measurable:** add a check in `autoreview.py`. Give it an ID (V picture, A sound, S voice, D plan rules), a limit, and a
  `source` that quotes the note.
  - The check must **fail the version the user complained about** and **pass the fix**. Run it on both and record the numbers.
  - A check that would have passed the bad version is not a check.
- **Not measurable yet:** mark it "judged by eye/ear". Under "Not measurable yet", write what a measurement would need. Those are
  the next checks to build.
- **Never loosen a limit to make a render pass.** If a limit is wrong, say why in the commit message, and keep the old failing case
  failing. A shot can be exempted only by the director's marking in `direction.js` (e.g. `fast: true`), never inside the checker.

## 3. Close the loop

- A fault the reviewer finds → fix the cause, add an `ERRORS.md` entry if it was non-obvious, re-render, run the reviewer again.
- Commit the reviewer and the fix together. Code and docs only: renders, audio and reel stills stay out of git (`.gitignore`).
- In the report to the user, give the verdict line, every failure, and what the reviewer cannot judge.

## Where the checks come from (keep this list current)

- **The user's notes:** see `FEEDBACK.md`.
- **The reel-builder skill's verify-before-ship rules:** motion progressive, nothing frozen under the voice, cut on the word,
  readable emphasis text.
- **GOAL.md:** format, loudness, exposure.
- **ERRORS.md:** ERR-0008, 0012, 0014, 0015, 0017, 0018.
