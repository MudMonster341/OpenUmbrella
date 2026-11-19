/* check_smoke.mjs — proves the smoke is not choppy. Pure math, no three.js, no browser.
   Run: node check_smoke.mjs   (add --break to inject a hard cutoff and confirm the check fails) */
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("./lib/smoke.js", import.meta.url), "utf8").replace(/^import .*three.*$/m, "const THREE = {};");
const brk = process.argv.includes("--break");
const mod = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
const { particleState, N_PARTICLES } = mod;
const ps = brk ? (i, a) => { const s = particleState(i, a); return (s.u > 0.6 ? { ...s, alpha: s.alpha > 0 ? 0.3 : 0 } : s); } : particleState;
const FPS = 60, T = 6, MAXA = 0.06, MAXS = 0.06, EDGE = 0.02;
let fail = 0; const bad = (m) => { if (fail++ < 15) console.log("FAIL  " + m); };
if (N_PARTICLES > 160) bad("count " + N_PARTICLES + " > 160");
let worstA = 0, worstS = 0, peak = 0;
for (let i = 0; i < N_PARTICLES; i++) {
  let prev = ps(i, 0);
  for (let f = 1; f <= T * FPS; f++) {
    const cur = ps(i, f / FPS);
    const da = Math.abs(cur.alpha - prev.alpha); worstA = Math.max(worstA, da); peak = Math.max(peak, cur.alpha);
    if (da > MAXA) bad(`particle ${i} frame ${f}: alpha step ${da.toFixed(3)}`);
    if (prev.alpha > 0 && cur.alpha > 0) {
      const ds = Math.abs(cur.size - prev.size) / prev.size; worstS = Math.max(worstS, ds);
      if (ds > MAXS) bad(`particle ${i} frame ${f}: size step ${(ds * 100).toFixed(1)}%`);
    }
    if (prev.alpha <= EDGE && cur.alpha > EDGE && da > EDGE) bad(`particle ${i} frame ${f}: appears at alpha ${cur.alpha.toFixed(3)}`);
    if (prev.alpha > EDGE && cur.alpha <= 0 && prev.alpha > EDGE) bad(`particle ${i} frame ${f}: vanishes from alpha ${prev.alpha.toFixed(3)}`);
    prev = cur;
  }
}
/* determinism */
const a1 = JSON.stringify(ps(7, 3.3)), a2 = JSON.stringify(ps(7, 3.3)); if (a1 !== a2) bad("not deterministic");
console.log(`particles ${N_PARTICLES}, worst alpha step ${worstA.toFixed(4)} (max ${MAXA}), worst size step ${(worstS * 100).toFixed(2)}% (max ${MAXS * 100}%), peak alpha ${peak.toFixed(2)}`);
console.log(fail ? `${fail} FAIL` : "PASS");
process.exit(fail ? 1 : 0);
