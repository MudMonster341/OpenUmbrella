# Repo playbook — what each installed component is for, and how we use it

**Installed 2026-11-13.** Ratings, stars and licences: [REPO_REGISTRY.md](REPO_REGISTRY.md).
Craft standard they feed into: [ANIMATION_STANDARD.md](ANIMATION_STANDARD.md).

**The licence boundary, stated once:** `onetake` is PolyForm Noncommercial and `lemo-opuscar`'s
style prompts are CC BY-NC 4.0. They are installed as **reference and local tooling**. Their text,
prompts and code do not go into anything we publish commercially
([ADR 0010](../decisions/0010-install-reference-repos-with-a-boundary.md)). Techniques are free;
implementations are not.

---

## The stack, by job

| Job | Tool | Where |
|---|---|---|
| Pipeline, stages, artifacts, approval gates | **OpenMontage** | `OpenMontage/` |
| Render HTML/CSS/GSAP/Three.js → MP4 | **HyperFrames** | `npx hyperframes` |
| Continuous camera, beat sheets | **onecam** (ours) | `engine/onecam/` |
| Quality gate on the finished file | **filmcheck** (ours) | `tools/filmcheck/` |
| Narration, voice design, dubbing | **VoiceStudio** | installed app + CLI |
| Reference: 3D lighting, continuity, rhythm | **onetake** | `vendor/onetake/` |
| Reference: 101 film styles, audio pipeline | **lemo-opuscar** | `vendor/lemo-opuscar/` |
| Reference: character acting, timing, "alive" | **ClaudeAnimationBase** | `vendor/ClaudeAnimationBase/` |

---

## VoiceStudio — narration

**Installed:** 0.5.8, `C:\Users\Mustafa\AppData\Local\Programs\VoiceStudio`. AGPL-3.0. Local, free.
Checksum verified against the published SHA256SUMS at install.

**It has a full CLI**, which is what makes it pipeline-usable:

```
C:\Users\Mustafa\AppData\Local\Programs\VoiceStudio\resources\cli\voicestudio.exe
```

| Command | Use |
|---|---|
| `speak` | Text → speech with a saved voice. **The main one for narration** |
| `voices` | Create, change, share saved voices — our cast lives here |
| `gallery` | Presets and community voices |
| `models` | Download models, manage licences and memory |
| `engines` | Speech, transcription and translation engines |
| `audiobook` | Plan/render long-form; useful for multi-line scripts |
| `audio` | Clean, normalize, convert |
| `dub` / `batch` | Dub a finished film into other languages |
| `status` | Whether the backend is running |

Add `--json` to anything for machine-readable output, and `--url` to drive a backend elsewhere.

> **⚠️ One manual step remains.** `voicestudio models list` returns *"VoiceStudio has not finished
> setup. Open VoiceStudio, complete setup, then run this command again."* First-run setup and model
> selection are GUI steps. Deliberately not automated: choosing a model means a multi-gigabyte
> download, and that is the user's call, not something to do silently.
>
> **To unblock narration:** open VoiceStudio once, finish setup, pick an English voice model. The
> CLI works from then on and gets wired into the pipeline.

**Our usage pattern, once it is set up:** one WAV per script line (not one long file), so lines can
be re-timed individually against the beat sheet; compress the voice, then balance by RMS to roughly
10 dB above the music; two-pass loudnorm to −14 LUFS at the mux. Numbers spelled out in the TTS
text and written as digits in the subtitles.

Piper stays installed as the draft fallback.

---

## onetake — reference for 3D look and continuity

`vendor/onetake/` · PolyForm Noncommercial · **reference only, never shipped**

| File | What we take from it |
|---|---|
| `references/3d.md` | The 3D render recipe: key light following the look point, shadow camera sized to camera distance, 4096 map, `NeutralToneMapping`, bloom ~0.4, Bokeh on macro shots, fog in the background colour. Also the measured cost of software vs hardware WebGL (652 ms vs 168 ms a frame) |
| `references/rhythm.md` | Pacing and beat placement |
| `references/composition.md` | Framing |
| `references/motion-library.md` | Motion vocabulary |
| `lib/motion.js` | **Read for ideas, never imported.** Our curves are in `engine/onecam/onecam.js` |
| `scripts/verify_promo.py` | Their continuity check. Ours is `tools/filmcheck` |

We already built the continuous camera ourselves
([ADR 0007](../decisions/0007-build-continuous-camera-in-house.md)); that stands. This repo is now
a craft reference for everything *around* the camera.

---

## lemo-opuscar — reference for style and the audio pipeline

`vendor/lemo-opuscar/` · code MIT, **docs and style prompts CC BY-NC 4.0** · reference only

101 styles in `styles/`, each a `STYLE.md` plus a demo film, all made in code with no video model.

| File | What we take from it |
|---|---|
| `TECHNIQUE.md` | The pipeline shape: one timeline drives picture, score, foley and subtitles; `render(t)` as a pure deterministic function; grain added at the ffmpeg stage, not per frame; two-pass loudnorm −14 LUFS; a cue check comparing visual hits to music beats, target 0 ms |
| `DIRECTOR.md` | How a film is directed start to finish |
| `styles/*/STYLE.md` | **Browse to learn what a style *is*.** Do not copy the text |
| `core/audio/` | Sampler and scoring approach — the idea of writing an original score from the cue map rather than dropping a stock track |

The single most useful line in it, and one our Paris film breaks: *animate on twos where the style
wants it, but keep the camera and light smooth every frame — a stepped camera reads as lag.*

**Our styles are authored by us** ([ADR 0008](../decisions/0008-learn-styles-then-author-our-own.md)).
Browsing this to understand what good looks like is the point; lifting a prompt is not.

---

## ClaudeAnimationBase — reference for character and timing

`vendor/ClaudeAnimationBase/` · MIT · permissive, so it *may* be used directly

The craft here is the best of the three, and it is MIT, so unlike the other two we are free to use
it as well as learn from it.

| File | What we take from it |
|---|---|
| `ANIMATION_GUIDE.md` | The rules: nothing is ever still; faces act and never snap; the character is **big**; write the reads; one read at a time; fast actions, slow meanings; cause then reaction; everything on a beat; a transition at every seam; show it, don't write it |
| `src/` | p5.brush painting engine, the Clawd character, 31 acted emotions |
| `docs/emotions.jpg`, `docs/views.jpg` | Model sheets |
| `render.mjs` | Their headless-Chrome frame renderer |

**Note the tension:** this engine is deliberately **flat 2D, never 3D** — depth from overlap, scale
and colour, never projection. Our films are 3D. So we take its *principles* (which are
medium-independent) and its character thinking, not its renderer. If we ever want a hand-painted
2D film, this is the tool, and its licence allows it.

---

## How they fit together on a film

```
brief ──► beat sheet (engine/onecam/*.beats.json)      ← ANIMATION_STANDARD §3: write the reads
          │
          ├─ node engine/onecam/verify.mjs             design-time guarantees
          │
          ▼
       composition (films/<name>/index.html)
          │  Three.js scene + onecam camera
          │  ANIMATION_STANDARD §1 render settings
          │
          ├─ npx hyperframes check                     lint, runtime, layout, motion, contrast
          ├─ npx hyperframes snapshot --at ...          LOOK AT THE FRAMES. A passing check is not a look
          │
          ▼
       narration (voicestudio speak, one WAV per line)
          │
          ▼
       npx hyperframes render                          MP4
          │
          ▼
       python tools/filmcheck/filmcheck.py             the independent gate
          │
          └─► fix the numbered failures, re-render, max 2 rounds per gate
```

The gates are in [GOAL.md](../GOAL.md). The craft standard they cannot measure is in
[ANIMATION_STANDARD.md](ANIMATION_STANDARD.md), and a human looks at the frames at Gate 2 —
that is not optional, and four passes on the Paris film proved why.
