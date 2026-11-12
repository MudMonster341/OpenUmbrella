# paris-proto — the first real render

**What this is:** a technical prototype, not the film. Its job is to close the loop — prove that
[`engine/onecam`](../../engine/onecam/) can drive a real Three.js scene through HyperFrames to an
MP4 that [`tools/filmcheck`](../../tools/filmcheck/) will pass.

**What it is not:** the 30–40s film described in [GOAL.md](../../GOAL.md). This runs **14.94s** on
five beats, has no narration, no music and no captions, because VoiceStudio is not installed yet.
Gate 1 needs more beats before the real film.

```bash
npm run check                              # lint + runtime + layout + motion + contrast
npx hyperframes snapshot --at 1,7.5,11,14  # look before rendering
npm run render
python ../../tools/filmcheck/filmcheck.py .hyperframes/.../paris-proto.mp4 \
    --expect-vertical --allow-cuts 0 --no-audio-checks
```

`lib/onecam.js` is a **copy**. The source of truth is `engine/onecam/onecam.js`; re-sync with
`node sync.mjs`. The beats are inlined in `index.html` because the Three adapter forbids fetching
at seek time — keep them in step with `engine/onecam/paris.beats.json` by hand until that is
automated.

---

## Iteration log — what each pass caught

The point of recording this: every defect below passed the previous gate. None would have been
caught by reading the code, and the automated check passed while the film was still unwatchable.

**Pass 1 — the check passed, the film was broken.**
`npm run check` reported 0 lint, 0 runtime, 0 motion errors. Then the Gate 2 stills showed the
camera flying **inside buildings** from 9s onward: the payoff shot was a flat tan wall. The beat
positions had been written against an imagined scene, and beats 4 and 5 landed inside the far-bank
block rows. *A passing check does not show how it looks.*

**Pass 2 — fix the corridor, not the beats.**
Rather than nudging camera positions until they happened to miss geometry, the scene now **clears
the camera corridor by construction** (`corridorClear()`): nothing inside the avenue, the river
band, or a 9-unit plaza around the tower. Beats can move freely inside that volume without ever
colliding. Framing was still bottom-heavy — a 9:16 frame aimed level fills its lower third with
empty ground.

**Pass 3 — framing and silhouette.**
Raised every `lookAt` above the camera height so the frame carries sky and skyline instead of
pavement. Moved Claude onto the quay so he is present at the payoff, not only in the opening.
Re-framed the tower from across the river: viewed from its base it read as a brown cone.

**Pass 4 — the tower, and a tree.**
The tower was four sticks under a fat cone — an obelisk, not a landmark. Rebuilt the silhouette:
wide splayed base, an arch band, a lattice narrowing in two stages, small spire. Also excluded
trees from the camera corridor, after one filled the entire river beat.

**Two contrast failures** were caught by the check itself and fixed properly rather than by
recolouring: white title text over a golden-hour sky measured 2.89:1 against a 3:1 requirement, so
a scrim now fades in **with** the title rather than darkening the whole film.

---

## The M1 saga — the most useful thing that happened

The first render passed every design-time guarantee and **failed filmcheck at 48% motionless.**
Five measured passes to get it to zero. Each one was wrong in a different, instructive way:

| Measured | Cause |
|---|---|
| **48%** | `verify.mjs` asserted "the camera moves"; filmcheck measures "the image changes". The oscillation moved the camera **3.46e-4 world units per frame — sub-pixel once projected.** The guarantee had been written in the wrong units |
| **51%** | Added a 0.22 u/s hold drift. Still not enough: flat-shaded low-poly surfaces and a smooth sky gradient mean a ~1px shift changes almost no pixels, because only edges differ and edges are a small fraction of the frame |
| **M4 broke** | Raised the drift to 1.2 u/s — and the next travel started from the beat's *authored* position, undoing the drift in one frame. A 2.148-unit jump: a cut. Travels now start from the previous beat's **exit** position |
| **4%** | One interval left, where a travel's ease-out met a hold. A pure dolly toward a distant subject barely changes the image, so the drift gained a lateral component for parallax |
| **6%** | Parallax alone did not close it: easing curves arrive at **zero velocity**, so handing off from travel to drift at a single instant leaves a motionless shoulder on both sides |
| **0%** ✅ | The drift now **leads the arrival** by 0.45s, overlapping the two velocity sources instead of handing off at a point |

The lesson worth keeping: **a guarantee proved in the maths is not a guarantee in the render.**
`verify.mjs` now measures motionless *intervals* against the same 0.4s limit filmcheck uses, in
the same units, instead of counting frames against an arbitrary epsilon. Asserting something
subtly different from what the real gate measures is exactly how the first version passed while
the film was dead on screen.

One thing deliberately **not** done: adding animated grain so every frame differs. It would have
passed filmcheck immediately, without the film moving at all. That is gaming our own metric.

---

## Known defects — not fixed in this prototype

| | Defect | Fix |
|---|---|---|
| 1 | **Runtime is 14.94s against a 30–40s target.** | More beats, not longer holds. A Gate 1 decision |
| 2 | **~7.5s is a weak transit frame** — Claude's head clips the bottom edge as the camera passes the quay | Raise the beat-3 to beat-4 path, or move Claude along the quay |
| 3 | **No audio at all.** The check reports `audio_none` | Blocked on VoiceStudio ([ADR 0004](../../decisions/0004-voicestudio-as-narration-engine.md)) |
| 4 | Character acting is a bob and an arm raise — body language, no real performance | The open question in [ADR 0006](../../decisions/0006-stylized-3d-over-photoreal.md) |
| 5 | Beats are duplicated between `index.html` and `paris.beats.json` | A build step, once the shape settles |
| 6 | **`data-duration` is 14.94s but the corrected beats plan to 13.68s.** The last 1.26s is the final beat held past its hold time. The camera still drifts, so no standard fails — but the declared duration and the rig disagree | Derive `data-duration` from `cam.plan().duration` instead of hard-coding it. Exactly the class of drift defect 5 invites |

Defect 1 and 3 mean this prototype **cannot pass the full GOAL.md bar** — and should not be
reported as if it did. It is measured with `--no-audio-checks` for that reason.
