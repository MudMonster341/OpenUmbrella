/* check_words_p2.mjs — GOAL T1 (at most 7 words on screen at any instant, strictly) for a later part's direction file, BEFORE rendering
   (2026-11-19). check_direction.mjs reads Part 1's direction.js only, so Part 2 had no automated count: the film-critic counted 9 words
   on card two and 8 on the friend's phone by hand (p2_m2_v3). This samples every 0.02 s and adds up what is on screen: the caption, the
   days meter (its number, '/ 2,000' once the goal is shown, its chip), the phone's bubbles (the header is a photo only, P2.20 #2), the
   two cards, the big number and the end card.
   Run: node check_words_p2.mjs [direction_p2.js] [films/<slug>/part2_script.json]   Exit 1 on any instant over the limit. */
import fs from "node:fs";
const dirFile = process.argv[2] || "./direction_p2.js";
const { DIRECTION: D } = await import(new URL(dirFile, import.meta.url));
const films = new URL("../../films/", import.meta.url), scriptPath = process.argv[3] || new URL(fs.readdirSync(films).find((f) => fs.existsSync(new URL(f + "/part2_script.json", films))) + "/part2_script.json", films);   /* the part's script; autoreview passes it */
const S = JSON.parse(fs.readFileSync(scriptPath, "utf8"));
const MAX = S.limits?.screen_words ?? 7;
const words = (s) => String(s ?? "").split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const endText = (S.lines.find((l) => l.job === "end card")?.screen || []).join(" ");
const dur = Math.max(...D.shots.map((s) => s.t1 ?? 0), D.captions.at(-1).t + 2);
const shotAt = (T) => D.shots.find((s) => T >= s.t0 && T < s.t1) || D.shots.at(-1);
const parts = (T) => {
  const s = shotAt(T), p = {};
  const cap = D.captions.filter((c) => T >= c.t && T < c.t + c.dur); if (cap.length) p.caption = cap.reduce((n, c) => n + words(c.word), 0);
  const Mt = D.meter, hidden = Mt.hide.some(([a, b]) => T >= a && T < b) || s.insert === "big";
  if (!hidden) { const st = [...Mt.steps].reverse().find((x) => T >= x[0]); if (st) { p.meter = 1 + (T >= Mt.goalAt ? 1 : 0); if (st[2] && T - st[0] < 1.3) p.meter += 1; } }
  if (s.kind === "phone" && s.phone) { const bs = s.phone.bubbles || (s.phone.bubble ? [s.phone.bubble] : []); const n = bs.filter((b) => T >= b.t).reduce((k, b) => k + words(b.text), 0); if (n) p.bubbles = n; }
  const C = D.cards; if (C) { let n = 0; if (T >= C.a.t0 && T < C.t1 + 0.2) n += words(C.a.title) + words(C.a.sub); if (T >= C.b.t0 && T < C.t1 + 0.2) n += words(C.b.title) + words(C.b.sub); if (n) p.cards = n; }
  if (s.insert === "big" && D.big) p.big = 1 + (T >= D.big.chipAt ? 1 : 0);
  if (s.insert === "end") p.end = words(endText);
  return p;
};
let worst = 0, worstT = 0, worstP = {}, over = [];
for (let T = 0; T < dur; T += 0.02) {
  const p = parts(T), n = Object.values(p).reduce((a, b) => a + b, 0);
  if (n > worst) { worst = n; worstT = T; worstP = p; }
  if (n > MAX) { const last = over.at(-1); if (last && T - last.t1 < 0.05) { last.t1 = T; last.n = Math.max(last.n, n); } else over.push({ t0: T, t1: T, n, p }); }
}
for (const o of over) console.log(`FAIL  T1 ${o.n} words on screen ${o.t0.toFixed(2)}-${o.t1.toFixed(2)} s: ${JSON.stringify(o.p)}`);
console.log(`${over.length ? "FAIL" : "PASS"}  T1 worst ${worst}/${MAX} at ${worstT.toFixed(2)} s ${JSON.stringify(worstP)}`);
process.exit(over.length ? 1 : 0);
