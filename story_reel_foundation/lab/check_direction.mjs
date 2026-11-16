/* check_direction.mjs — verify direction.js against the rules BEFORE rendering.
   Same lesson as the film: a number you assert is not a number you measured (ERR-0005, ERR-0008).
   Updated 2026-11-16 for scene 1 (actors, inserts, measured timing).   Run: node check_direction.mjs */
import { DIRECTION as D } from "./direction.js";
import { TIMING } from "./timing.js";

const MAX_WORDS = 7;                                   /* GOAL T1, strict: all on-screen text at any instant */
const words = (s) => String(s).split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const at = (T, a) => a.filter((x) => T >= x.t && T < x.t + x.dur);
let fail = 0; const bad = (m) => { fail++; console.log("FAIL  " + m); };
const shotAt = (T) => D.shots.find((s) => T >= s.t0 && T < s.t1);

/* 1. words on screen, sampled every 0.02 s: caption + (phone header and bubble, or corner stamp and delta) + banner */
let worst = 0, worstT = 0;
for (let T = 0; T < D.duration; T += 0.02) {
  const t = D.text, s = shotAt(T);
  let n = at(T, t.captions).length;
  if (s && s.kind === "phone") {
    n += 1;                                                         /* the number in the phone header */
    if (T >= D.inserts.phone.bubble.t) n += words(D.inserts.phone.bubble.text);
  } else {
    const st = [...t.stamp].reverse().find((x) => T >= x.t);
    if (st) { n += 1; if (st.delta && T - st.t < 1.0) n += 1; }
  }
  at(T, t.banner).forEach((b) => (n += words(b.text)));
  if (n > worst) { worst = n; worstT = T; }
}
console.log(`words on screen: worst ${worst} at ${worstT.toFixed(2)} s (limit ${MAX_WORDS})`);
if (worst > MAX_WORDS) bad(`more than ${MAX_WORDS} words on screen at ${worstT.toFixed(2)} s`);

/* 2. captions one at a time, and inside the scene */
const caps = [...D.text.captions].sort((a, b) => a.t - b.t);
caps.slice(1).forEach((c, i) => { if (c.t < caps[i].t + caps[i].dur - 1e-9) bad(`captions overlap: "${caps[i].word}" and "${c.word}"`); });
if (caps.length && caps[caps.length - 1].t + caps[caps.length - 1].dur > D.duration) bad("a caption runs past the end");

/* 3. shots cover the scene with no gap or overlap */
const shots = [...D.shots].sort((a, b) => a.t0 - b.t0);
if (shots[0].t0 !== 0) bad("first shot does not start at 0");
shots.slice(1).forEach((s, i) => { if (Math.abs(s.t0 - shots[i].t1) > 1e-9) bad(`gap or overlap between shots ${i} and ${i + 1}`); });
if (Math.abs(shots[shots.length - 1].t1 - D.duration) > 1e-9) bad("last shot does not end at the duration");

/* 4. the cast tracks are ascending */
const asc = (arr, name) => arr.slice(1).forEach((k, i) => { if (k.t <= arr[i].t) bad(`${name} not ascending at ${i + 1}`); });
asc(D.cast.lead.path, "lead.path"); asc(D.cast.lead.anim, "lead.anim"); asc(D.cast.lead.face, "lead.face");

/* 5. picture is timed to audio: the hit lands on the measured word, the voice ends before the scene does */
if (Math.abs(TIMING.impact - D.world.impactT) > 1e-9) bad(`the impact (${D.world.impactT}) is not the measured one (${TIMING.impact})`);
const voiced = (T) => TIMING.captions.some((c) => T >= c.t && T < c.t + c.dur);
if (voiced(D.world.impactT)) bad(`a word is spoken over the impact at ${D.world.impactT}: the hit should land in the silence`);
const lastLine = TIMING.lines[TIMING.lines.length - 1];
if (lastLine.end > D.duration) bad("the last line runs past the end of the scene");
D.effects.hitstop.forEach((h) => { if (Math.abs(h.at - D.world.impactT) > 1e-9) bad(`hit-stop at ${h.at} is not on the impact`); });
D.effects.ghost.forEach((g) => { if (g.at + g.dur > D.duration) bad("ghost runs past the end"); if (g.showTime < D.world.impactT - 0.05) bad("ghost shows a moment well before the impact (it would show nothing)");   /* up to 0.05 s before contact is allowed (2026-11-16): the bus is touching and the shatter has not buried him yet */ });
D.inserts.clocks.forEach((c) => { const sh = shotAt((c.t0 + c.t1) / 2); if (!sh || sh.kind !== "clock") bad(`clock insert ${c.t0} has no clock shot`); });

/* 6. orange is the lead's alone */
const isOrange = (h) => { const r = (h >> 16) & 255, g = (h >> 8) & 255, b = h & 255; return r > 220 && g > 90 && g < 160 && b < 70; };
const nums = (o) => Object.values(o).flatMap((v) => (Array.isArray(v) ? v : [v])).filter((v) => typeof v === "number");
nums(D.world.palette).forEach((h) => { if (isOrange(h)) bad(`world colour #${h.toString(16)} is orange`); });
D.extras.forEach((e, i) => nums(e.look).forEach((h) => { if (isOrange(h)) bad(`extra ${i} wears orange`); }));

console.log(fail ? `\n${fail} violation(s)` : "direction OK");
process.exit(fail ? 1 : 0);
