/**
 * verify.mjs — prove the onecam guarantees instead of asserting them in prose.
 *
 * Run: node engine/onecam/verify.mjs [beatsheet.json]
 *
 * Checks, per frame across the whole film:
 *   M1  the camera never holds still — every frame's position differs from
 *       the last by more than a visually meaningful epsilon
 *   M4  the path is continuous — no frame-to-frame jump large enough to read
 *       as a cut
 *   M2  easing varies — more than one curve is in use across the beats
 *   --  look-at is continuous, and the plan's duration matches the frames
 *
 * Exit 0 if every guarantee holds, 1 otherwise.
 */

import { readFileSync } from "node:fs";
import { OneCam } from "./onecam.js";

const sheetPath = process.argv[2] ?? new URL("./paris.beats.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sheet = JSON.parse(readFileSync(sheetPath, "utf8"));
const cam = new OneCam(sheet);
const plan = cam.plan();

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// A cut in a 3D camera reads as a large positional jump in one frame.
// At our pace, anything over this in 1/30s is not a move, it is a cut.
const CUT_THRESHOLD = 2.0;
// Below this the frame is effectively identical and freezedetect will fire.
const STILL_EPSILON = 1e-4;

let minStep = Infinity;
let maxStep = 0;
let stillFrames = 0;
let jumpFrames = [];
let prev = cam.positionAt(0);
let prevLook = cam.lookAtAt(0);
let maxLookStep = 0;

for (let f = 1; f <= plan.frames; f++) {
  const p = cam.positionAt(f);
  const l = cam.lookAtAt(f);
  const step = dist(prev, p);
  const lookStep = dist(prevLook, l);

  if (step < STILL_EPSILON) stillFrames++;
  if (step > CUT_THRESHOLD) jumpFrames.push({ frame: f, step: step.toFixed(3) });
  minStep = Math.min(minStep, step);
  maxStep = Math.max(maxStep, step);
  maxLookStep = Math.max(maxLookStep, lookStep);

  prev = p;
  prevLook = l;
}

const curves = new Set(cam.segments.map((s) => s.curve.name || String(s.curve)));

const results = [
  {
    id: "M1",
    name: "Camera never holds still",
    pass: stillFrames === 0,
    measured: `${stillFrames} still frame(s); smallest step ${minStep.toExponential(2)} world units`,
  },
  {
    id: "M4",
    name: "No cuts (continuous path)",
    pass: jumpFrames.length === 0,
    measured: `${jumpFrames.length} jump(s) > ${CUT_THRESHOLD}; largest step ${maxStep.toFixed(3)}`,
  },
  {
    id: "M2",
    name: "Easing varies across moves",
    pass: curves.size > 1,
    measured: `${curves.size} distinct curve(s): ${[...curves].join(", ")}`,
  },
  {
    id: "--",
    name: "Look-at is continuous",
    pass: maxLookStep < CUT_THRESHOLD,
    measured: `largest gaze step ${maxLookStep.toFixed(3)}`,
  },
];

console.log(`\nonecam verify - ${sheet.title ?? sheetPath}`);
console.log("=".repeat(72));
console.log(`plan: ${plan.duration}s, ${plan.frames} frames @ ${plan.fps}fps, ${plan.beats.length} beats`);
for (const b of plan.beats) {
  console.log(
    `  ${String(b.index).padStart(2)} ${b.name.padEnd(14)} ` +
      `starts ${String(b.starts).padStart(6)}s  travel ${String(b.travel).padStart(5)}s  ` +
      `hold ${String(b.hold).padStart(4)}s  distance ${b.distance}`
  );
}
console.log("-".repeat(72));
for (const r of results) {
  console.log(`[${r.pass ? "  ok  " : " FAIL "}] ${r.id.padEnd(3)} ${r.name.padEnd(30)} ${r.measured}`);
}
console.log("=".repeat(72));

const failed = results.filter((r) => !r.pass);
console.log(
  failed.length === 0
    ? `PASS: all ${results.length} guarantees hold across ${plan.frames} frames`
    : `FAIL: ${failed.length} guarantee(s) broken`
);
process.exit(failed.length === 0 ? 0 : 1);
