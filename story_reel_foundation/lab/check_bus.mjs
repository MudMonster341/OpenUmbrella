/* check_bus.mjs — where the bus really is, frame by frame, from "suddenly" to the hit. Computed, not eyeballed (ERR-0008, ERR-0012).
   node check_bus.mjs            -> a table every 2 frames at 60 fps, and the rules below (exit 1 if one fails)
   Rules: the near front wheel reaches the kerb (z <= -0.61) between the word "kerb" and the start of the silence (+0.1 s);
          the bus's front near corner stays out of the shelter roof's footprint until the impact;
          the bus never slows down after "suddenly" (a crash speeds up). */
import { DIRECTION as D } from "./direction.js";
import { TIMING as T } from "./timing.js";
import { monoCubic } from "./lib/curve.js";

const W = (l, w) => T.captions.find((c) => c.line === l && c.word === w).t;
const K = D.world.busKeys, LOC = D.world.busImpactLocal, IMP = T.impact, S = 0.95;
const pre = K.filter((k) => k[0] <= LOC + 1e-6);
const pose = (t) => { const [x, z, yaw, y] = monoCubic(pre, t - IMP + LOC); return { x, z, yaw, y }; };
const world = (p, lx, lz) => ({ x: p.x + S * (lx * Math.cos(p.yaw) + lz * Math.sin(p.yaw)), z: p.z + S * (-lx * Math.sin(p.yaw) + lz * Math.cos(p.yaw)) });
const ROOF = { x0: 0.2 - 1.75, x1: 0.2 + 1.75, zEdge: -1.3 };
const tS = W("L06", "SUDDENLY"), tK = W("L06", "KERB");

let fail = [], prevX = null, prevV = 0, wheelOn = null;
console.log("  t      x      speed  wheelZ  cornerX cornerZ  y     ", `(suddenly ${tS}, kerb ${tK}, impact ${IMP})`);
for (let f = Math.floor(tS * 60) - 30; f <= Math.round(IMP * 60); f++) {
  const t = f / 60, p = pose(t), wh = world(p, 1.9, -1.2 - 0.17), co = world(p, 3.21, -1.25);
  const v = prevX === null ? 0 : (p.x - prevX) * 60;
  if (wheelOn === null && wh.z <= -0.61) wheelOn = t;
  if (t < IMP - 1e-6 && co.z < ROOF.zEdge && co.x > ROOF.x0 && co.x < ROOF.x1) fail.push(`corner inside the shelter roof at ${t.toFixed(3)} s`);
  if (t > tS + 0.05 && t < IMP - 1 / 60 && v < prevV - 0.6) fail.push(`the bus slows at ${t.toFixed(3)} s (${prevV.toFixed(2)} -> ${v.toFixed(2)} m/s)`);
  if (f % 2 === 0) console.log(`${t.toFixed(3)}  ${p.x.toFixed(2).padStart(6)}  ${v.toFixed(2).padStart(5)}  ${wh.z.toFixed(2).padStart(6)}  ${co.x.toFixed(2).padStart(6)}  ${co.z.toFixed(2).padStart(6)}  ${p.y.toFixed(2)}`);
  prevX = p.x; if (t > tS) prevV = v;
}
if (wheelOn === null || wheelOn < tK - 0.1 || wheelOn > T.prehit[0] + 0.1) fail.push(`the wheel reaches the kerb at ${wheelOn?.toFixed(3)} s, not at "kerb" (${tK})`);
const pi = pose(IMP), ci = world(pi, 3.21, -1.25);
if (!(ci.z <= ROOF.zEdge + 0.15 && ci.x > ROOF.x0 && ci.x < ROOF.x1)) fail.push(`at the impact the corner (${ci.x.toFixed(2)}, ${ci.z.toFixed(2)}) is not at the roof edge`);
console.log(`wheel on the kerb at ${wheelOn?.toFixed(3)} s; corner at impact (${ci.x.toFixed(2)}, ${ci.z.toFixed(2)})`);
console.log(fail.length ? "FAIL\n  " + [...new Set(fail)].slice(0, 12).join("\n  ") : "PASS");
process.exit(fail.length ? 1 : 0);
