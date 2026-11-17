/* check_crash_shot.mjs — the one-take crash shot, projected through the real (eased) camera every 0.05 s. Computed, not eyeballed (ERR-0008, ERR-0012).
   node check_crash_shot.mjs   -> the per-0.05 s table of what is outside the frame, and exit 1 if a rule fails.
   Rules (portrait 1080x1920, horizontal half-angle = atan(tan(vfov/2) * 9/16)), each point inside the frame with MARGIN to spare:
     squirrel (ground to 0.35 m x its scale)  while it runs, t0..t1
     bus front corners               from "suddenly" to the impact
     shelter's front roof-edge corners from 1 s before the impact to 1 s after
   The camera maths is index.html's shotAt() (ease + lerp), minus the 0.012 m hand-held drift (covered by MARGIN). */
import { DIRECTION as D } from "./direction.js";
import { TIMING as T } from "./timing.js";
import { monoCubic } from "./lib/curve.js";

export const ASPECT = 1080 / 1920, MARGIN = 0.04;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (s, r) => { const e = s.ease || "inOut"; return e === "out" ? 1 - (1 - r) ** 3 : e === "in" ? r ** 3 : r < 0.5 ? 4 * r ** 3 : 1 - (-2 * r + 2) ** 3 / 2; };   /* = index.html */
const IMP = T.impact, LOC = D.world.busImpactLocal, K = D.world.busKeys, SQ = D.world.squirrel, S = 0.95;
const pre = K.filter((k) => k[0] <= LOC + 1e-6);
const tSud = T.captions.find((c) => c.line === "L06" && c.word === "SUDDENLY").t;
const worldT = (T_) => { let tw = T_; for (const h of D.effects.hitstop) { if (T_ >= h.at + h.dur) tw -= h.dur; else if (T_ > h.at) tw = h.at; } return tw; };
const busPose = (tw) => { const [x, z, yaw, y] = monoCubic(pre, Math.min(tw, IMP) - IMP + LOC); return { x, z, yaw, y }; };   /* only the approach matters: until the hit */
const bw = (p, lx, ly, lz) => [p.x + S * (lx * Math.cos(p.yaw) + lz * Math.sin(p.yaw)), p.y + S * ly, p.z + S * (-lx * Math.sin(p.yaw) + lz * Math.cos(p.yaw))];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function camAt(shot, T_) {
  const u = ease(shot, clamp01((T_ - shot.t0) / (shot.t1 - shot.t0))), l = (a, b) => a.map((v, i) => v + (b[i] - v) * u);
  const f0 = shot.from.fov ?? shot.fov, f1 = shot.to.fov ?? shot.fov;
  return { pos: l(shot.from.pos, shot.to.pos), look: l(shot.from.look, shot.to.look), fov: f0 + (f1 - f0) * u };
}
export function project(cam, p) {   /* -> { x, y } in NDC (-1..1), or null behind the camera */
  const f = norm(sub(cam.look, cam.pos)), r = norm(cross(f, [0, 1, 0])), up = cross(r, f), d = sub(p, cam.pos), z = dot(d, f);
  if (z < 0.1) return null;
  const th = Math.tan((cam.fov * Math.PI / 180) / 2);
  return { x: dot(d, r) / z / (th * ASPECT), y: dot(d, up) / z / th, z };
}
export function evaluate(shot, log = false) {
  const fail = [], KQ = SQ.keys ?? [[SQ.t0, SQ.z0], [SQ.t1, SQ.z1]];
  const sqZ = (tw) => { let k = 0; while (k < KQ.length - 2 && tw > KQ[k + 1][0]) k++; const [ta, za] = KQ[k], [tb, zb] = KQ[k + 1], u = clamp01((tw - ta) / (tb - ta)); return za + (zb - za) * u * u * (3 - 2 * u); };
  const tIt = T.captions.find((c) => c.line === "L06" && c.word === "RUNS").t;   /* the swerve starts here (direction.js T_IT) */
  /* the user, 2026-11-17: the squirrel came too early and from the wrong side. It must come from the FAR side (z > 4), appear at most
     1 s before the swerve, and be in the bus's lane (z -0.2..2.2) when the swerve starts */
  if (!(KQ[0][1] > 4)) fail.push(`the squirrel starts at z ${KQ[0][1]}, not on the far side (z > 4)`);
  if (KQ[0][0] < tIt - 1.0) fail.push(`the squirrel appears ${(tIt - KQ[0][0]).toFixed(2)} s before the swerve (at most 1.0)`);
  { const zz = sqZ(tIt); if (zz < -0.2 || zz > 2.2) fail.push(`at the swerve the squirrel is at z ${zz.toFixed(2)}, not in the bus's lane`); }
  const worst = { squirrel: 0, bus: 0, shelter: 0 };
  const t0 = Math.max(shot.t0, tSud - 1e-6);
  for (let T_ = shot.t0; T_ < shot.t1 - 1e-6; T_ += 0.05) {
    const tw = worldT(T_), cam = camAt(shot, T_), pts = [];
    if (tw >= KQ[0][0] && tw <= KQ[KQ.length - 1][0]) { const z = sqZ(tw); pts.push(["squirrel", [SQ.x, 0.05, z]], ["squirrel", [SQ.x, 0.35 * (SQ.scale ?? 1), z]]); }
    if (T_ >= Math.max(tSud, IMP - 3.0) - 1e-6 && T_ <= IMP + 1e-6) {   /* the last 3 s (~18 m) before the hit: at a steady 6 m/s the bus comes from far away (v9, 2026-11-17) */ const p = busPose(tw); for (const lz of [-1.25, 1.25]) for (const ly of [0.3, 2.2]) pts.push(["bus", bw(p, 3.1, ly, lz)]); }
    if (T_ >= IMP - 1 && T_ <= IMP + 1) for (const x of [-1.55, 1.95]) pts.push(["shelter", [x, 2.4, -1.3]]);
    for (const [what, p] of pts) {
      const q = project(cam, p), out = q ? Math.max(Math.abs(q.x), Math.abs(q.y)) - (1 - MARGIN) : 9;
      if (out > worst[what]) worst[what] = out;
      if (out > 0) { fail.push(`${what} leaves the frame at ${T_.toFixed(2)} s (${q ? `ndc ${q.x.toFixed(2)}, ${q.y.toFixed(2)}` : "behind the camera"}) at world (${p.map((v) => v.toFixed(1)).join(", ")})`); }
    }
    if (log) console.log(`${T_.toFixed(2)}  ${pts.map(([w, p]) => { const q = project(cam, p); return q ? `${w[0]}:${q.x.toFixed(2)},${q.y.toFixed(2)}` : `${w[0]}:--`; }).join("  ")}`);
  }
  return { fail, worst };
}
const shot = D.shots.find((s) => Math.abs(s.t0 - tSud) < 1e-6);
if (process.argv[1]?.endsWith("check_crash_shot.mjs")) {
  if (!shot) { console.log("FAIL\n  no shot starts at \"suddenly\""); process.exit(1); }
  const cuts = D.shots.filter((s) => s.t0 >= tSud - 1e-6 && s.t0 < T.lines.find((l) => l.id === "L07").t - 1e-6);
  const r = evaluate(shot, true);
  if (cuts.length !== 1) r.fail.push(`${cuts.length} shots between "suddenly" and L07: the crash must be one take`);
  if (shot.t1 < T.lines.find((l) => l.id === "L07").t - 1e-6) r.fail.push("the take ends before L07: the crash must be one uncut take");   /* it may run longer (v9: through "right where I was sitting") */
  console.log(`one take ${shot.t0.toFixed(2)}-${shot.t1.toFixed(2)} s; worst overshoot past the safe frame (ndc): squirrel ${r.worst.squirrel.toFixed(2)}, bus ${r.worst.bus.toFixed(2)}, shelter ${r.worst.shelter.toFixed(2)}`);
  console.log(r.fail.length ? "FAIL\n  " + [...new Set(r.fail.map((f) => f.replace(/ at [\d.]+ s.*/, "")))].join("\n  ") + "\n  first: " + r.fail[0] : "PASS");
  process.exit(r.fail.length ? 1 : 0);
}
