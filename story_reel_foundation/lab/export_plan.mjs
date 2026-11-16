/* export_plan.mjs — the film's plan as JSON, for tools/autoreview (which cannot read direction.js itself).
   node story_reel_foundation/lab/export_plan.mjs > plan.json
   The shots, captions, lines, the hit and the silence: what the picture and the sound are SUPPOSED to do. */
import { DIRECTION as D } from "./direction.js";
import { TIMING as T } from "./timing.js";

const shots = D.shots.map((s, i) => ({ i: i + 1, t0: +s.t0.toFixed(3), t1: +Math.min(s.t1, T.end).toFixed(3), kind: s.kind, faceKey: !!s.faceKey, fast: !!s.fast }));   /* fast: a shot the director marked as a fast event (judder limit raised, with the reason) */
console.log(JSON.stringify({
  end: T.end, impact: T.impact, prehit: T.prehit, lines: T.lines, captions: T.captions, shots,
  hitstop: D.effects?.hitstop ?? [], inserts: { clocks: (D.inserts?.clocks ?? []).map((c) => [c.t0, c.t1]) },
}, null, 1));
