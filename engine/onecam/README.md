# onecam — continuous-camera rig

In-house. One unbroken camera move; each beat grows out of the one before it. The technique is
borrowed openly (it is a filmmaking idea, not licensed IP); **none of the code is derived from any
third-party implementation** — see [ADR 0007](../../decisions/0007-build-continuous-camera-in-house.md).

## Why a rig instead of hand-keyed animation

Hand-keyed camera moves fail the quality bar in two predictable ways: they stop between moves
(dead frames, standard M1) and every move shares one default curve (mechanical, standard M2). A rig
can make both failures *unrepresentable* rather than merely reviewable.

| Standard | How the rig guarantees it |
|---|---|
| **M1** no dead frames | A `motionFloor` drift is applied at all times, on three incommensurable frequencies, so the camera keeps moving even while holding on a beat. The frame is never identical to the previous one — so `freezedetect` cannot fire from a static camera |
| **M2** varied easing | The curve is chosen **from the distance travelled** (`curveForDistance`): a nudge settles fast, a journey gets a long tail. Duration is also distance-derived, so speed stays consistent instead of every move taking the same time |
| **M3** overlap, not stagger | `beatAt()` reports `phase` (`travel` / `hold`), so content keys off the camera *arriving* rather than a fixed clock. `OneCam.stagger()` spaces elements geometrically — widening gaps read as reaction, uniform gaps read as a queue |
| **M4** no cuts | Position, look-at and FOV are continuous functions of time sampled from one Catmull-Rom spline. **A cut is not expressible in this API** |

Two further details that matter more than they look:

- **The spline passes through every waypoint.** Whatever framing was approved at Gate 2 is exactly
  what renders — the path curves *through* each beat rather than approximating it.
- **The gaze leads the move.** Look-at interpolates ~15% ahead of position, because a real operator
  looks where they are going before they finish arriving.

## Usage

```js
import { OneCam } from "./onecam.js";

const cam = new OneCam(beatsheet, { fps: 30 });

// once, before rendering — the numbers Gate 1 needs
console.log(cam.plan());

// per frame
cam.apply(threeCamera, frameIndex);
const { phase, local, index } = cam.beatAt(frameIndex);
```

Content animation should read `phase` and `local` rather than absolute time, so re-timing a beat
re-times its content automatically instead of desynchronising it.

## Verifying

```bash
node engine/onecam/verify.mjs engine/onecam/paris.beats.json
```

Walks every frame and asserts the guarantees numerically: no still frames, no positional jump large
enough to read as a cut, more than one easing curve in use, continuous gaze. It prints the beat
plan with per-beat travel and hold times, which is the Gate 1 artefact.

This is a *design-time* check. The independent check on the finished file is
[`tools/filmcheck`](../../tools/filmcheck/), which measures the actual MP4 and knows nothing about
the rig that produced it. Both have to pass — one proves the intent, the other proves the result.

## Beat sheet

See [`beatsheet.schema.json`](beatsheet.schema.json) and the working draft
[`paris.beats.json`](paris.beats.json). Minimum two beats. `travel` and `hold` are optional: omit
`travel` and it is derived from distance, which is the recommended default.

## Scale awareness

**Everything spatial in this rig scales with the scene**, derived from `scale` — the median
camera-to-subject distance across the beats, or an explicit `scale` in the sheet. Authors write
beats; they do not retune the rig for a room versus a city.

This was the rig's biggest design flaw and it took two films to find. Apparent motion goes as
*linear motion ÷ distance to subject*, so a world-unit constant that is right at 20 m is wrong by
more than an order of magnitude at 1.5 m. Three separate symptoms, one cause:

| Symptom | Where it bit |
|---|---|
| Every room-scale move classified as "a nudge", so one easing curve was used for the whole film | `curveForDistance` thresholds were absolute → now normalised to `scale` |
| A metre-scale interior failed the still-frame check that a city passed | `verify.mjs` epsilon was absolute → now `4e-3 × scale/20` |
| A 1.2 m close-up and a 3.4 m wide cannot share one drift rate — the far beat held a motionless frame for 5.2 s while the near beats passed | drift is now **per beat**, scaled by that beat's own subject distance |

`DRIFT_LEAD` stays in seconds, because time does not scale with the room.

## Known gaps

- **No motion blur.** Continuous camera moves benefit from it; currently out of scope, and it is
  the likeliest remaining cause of perceived judder at 30fps.
- **Beats are duplicated** between each film's `index.html` and its `*.beats.json`, kept in step by
  hand. The Three adapter forbids fetching at seek time, so this needs a build step.
- **`_driftDir` alternates its lateral side by beat index**, which is arbitrary. It should probably
  follow the composition — drift away from the subject's eyeline, not left-right-left.
