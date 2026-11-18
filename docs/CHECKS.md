# Checks: what exists, what runs it, and when

*Written 2026-11-18. Every check is deterministic: same inputs, same verdict. Each one names the user's note or the error behind it,
in its source file. A pass means no KNOWN fault is present. It never means the film is good.*

## When they run

| Moment | Command (who runs it) | What it runs | Blocks? |
|---|---|---|---|
| Writing or changing a script | `python tools/scriptcheck/scriptcheck.py films/<slug>/<part>_script.json` (the agent, after every edit; `--all` for every part) | scriptcheck: every family below | FAIL = exit 1 |
| Before the script-critic and before voicing | the same, then the `script-critic` agent | — | the critic's verdict |
| A second opinion on a script (optional, never a gate) | `python tools/freellm/script_opinion.py films/<slug>/<part>_script.json --context-file <series-so-far.txt>` (2026-11-19) | two free keyless models (ovh, llm7) read the lines and pictures: hook score, plot holes, twist score, a safety read; written to `films/<slug>/review/<part>_opinions.md` | no: an extra opinion. The prompt leaves the machine, so only with the user's yes for that story |
| Every render | `python tools/ship/ship.py films/<slug> vN --name <part> --script films/<slug>/<part>_script.json` | 0 scriptcheck · 1 guards (G1-G11, including both self-tests) and the lab gates · 2 render · 3 mux · 4 autoreview · 5 contact sheet · 6 Instagram file + `ig_check.py` · 7 phone copy | yes, at each step |
| Every commit | the git `pre-commit` hook (automatic) | the story-word filter on files that will be published | yes |
| Every publish | `python tools/publish/publish_code.py` (the only way to push) | guards, then the strip/freeze/story/media/size scan, then a check of the remote | yes |
| Any time | `python tools/guards/check_guards.py` | G4 runs `tools/autoreview/selftest.py` and `tools/scriptcheck/selftest.py`: every check proven on a planted fault | yes |

## The families

**scriptcheck** (`tools/scriptcheck/scriptcheck.py`, one JSON format for every part; the format is in its docstring):

- **T text**: words per line, words on screen, a picture per line, the style's scenes.
- **S structure**: jobs in order; **S5 the length target is a FAIL**.
- **V hook**: the virality checklist, **V4b** the first-3-s event, V5 the claim lands at 1.2-1.6 s.
- **H hook craft**, from the hook study:
  - H1 who, act, end and contrast in the first 25 words;
  - H2 the order they come in;
  - H3 an open question at every line, the last one left open;
  - H4 two questions by ~8 s.
- **P pacing**:
  - P1 a budget per section;
  - P2 no 8 s stretch with nothing new;
  - P3 hook sentences ≤ 7 words, any sentence ≤ 12, a varied rhythm.
- **R repeats**:
  - R1 nothing from the `no_repeat` list;
  - R2 a `show_once` event shown once;
  - R3 every earlier part's `events` are on this part's list.
- **C characters**:
  - C1 named and defined on their introduction line;
  - C2 a cast spec per character (height relative to the lead, age, look; a younger sibling is shorter).
- **G goal**: G1 in the first 30%, its target on screen.
- **K complexity**: K1 at most 4 numbers in the first 15 s; K2 at most 4 characters.
- **L ledger**: the days arithmetic and custom asserts.
- **A audio**, once voiced:
  - A1 pauses ≤ 0.5 s;
  - A2 the delivery text matches the script;
  - A3 emotion (warns);
  - **A4 voice speed within 8% of the previous part**.
- **M publish filter**: every name is a story marker.

**autoreview** (`tools/autoreview/autoreview.py`, run by ship.py on the render):

- **V picture**: frame rate, size, black frames, cuts, judder, freezes, exposure, backgrounds.
- **H hook motion** (warns).
- **P pacing** (warns, provisional): P1 shot length, P2 motion per second, P3 the first 5 s.
- **A sound**: loudness, the hit, the music under the voice.
- **S voice**: gaps, breath, the ASR match.
- **E emotion** (`emotion.py`, warns, provisional): pitch, loudness and rate per line against each line's mood.

**Lab gates** (`story_reel_foundation/lab/check_*.mjs`, run by ship.py): direction, on-screen word counts, the crash shot.

**D3** (`story_reel_foundation/lab/check_words_p2.mjs`, 2026-11-19, run by the auto-review for `direction_p2.js`): GOAL T1 for a later part, every 0.02 s: caption + days meter (number, '/ 2,000', chip) + phone bubbles + the two cards + the big number + the end card. Proven on the v3 direction file: it reports the 9 and 8 words the film-critic counted by hand; v5's file passes at 7/7. It counts what the direction file declares, not pixels.

## Not automated, said plainly

These stay with the user and the critics:
- whether the story makes sense;
- whether a twist lands;
- acting and faces;
- whether a prop reads at phone size;
- taste.

The provisional limits (autoreview P and E) rest on two reference reels and prosody rules of thumb, so they warn rather than block.

**Adding a check:** every note from the user becomes a row in `tools/autoreview/FEEDBACK.md` the same day, and a check if it can be measured. Each new check also gets a planted-fault test in the matching `selftest.py`.
