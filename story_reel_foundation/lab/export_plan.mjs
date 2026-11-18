/* export_plan.mjs — the film's plan as JSON, for tools/autoreview (which cannot read direction.js itself).
   node story_reel_foundation/lab/export_plan.mjs > plan.json                                  # Part 1: direction.js + timing.js
   node story_reel_foundation/lab/export_plan.mjs direction_p2.js timing_p2.js > plan.json     # a later part (2026-11-18, ROADMAP D19)
   The shots, captions, lines, the hit and the silence: what the picture and the sound are SUPPOSED to do.
   A part with no single hit (Part 2) exports impact and prehit as null; the reviewer then skips the hit's checks and says so. */
const [dirFile = "direction.js", timFile = "timing.js"] = process.argv.slice(2);
const { DIRECTION: D } = await import(new URL("./" + dirFile, import.meta.url));
const { TIMING: T } = await import(new URL("./" + timFile, import.meta.url));

/* cont: the shot starts on the exact camera the last one ended on (a continuation, e.g. the end card blurring in over the same view):
   a planned boundary with no cut in the picture, by design (the v5 end card, 2026-11-17) */
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const shots = D.shots.map((s, i) => ({ i: i + 1, t0: +s.t0.toFixed(3), t1: +Math.min(s.t1, T.end).toFixed(3), kind: s.kind, faceKey: !!s.faceKey, fast: !!s.fast,
  cont: i > 0 && s.kind !== "phone" && D.shots[i - 1].kind !== "phone" && !!s.from && same(s.from, D.shots[i - 1].to) }));   /* fast: a shot the director marked as a fast event (judder limit raised, with the reason) */
console.log(JSON.stringify({
  direction: dirFile, end: T.end, impact: T.impact ?? null, prehit: T.prehit ?? null, lines: T.lines, captions: T.captions, shots,
  hitstop: D.effects?.hitstop ?? [], inserts: { clocks: (D.inserts?.clocks ?? []).map((c) => [c.t0, c.t1]) },
}, null, 1));
