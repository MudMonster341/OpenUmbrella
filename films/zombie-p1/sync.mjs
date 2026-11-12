// Re-copy onecam from the engine source of truth.
// Run from this directory: node sync.mjs
import { readFileSync, writeFileSync } from "node:fs";

const HEADER = [
  "// COPY - do not edit. Source of truth: engine/onecam/onecam.js",
  "// Re-sync: node sync.mjs",
  "",
].join("\n");

const src = readFileSync("../../engine/onecam/onecam.js", "utf8");
writeFileSync("lib/onecam.js", HEADER + src);
console.log(`onecam synced (${src.length} bytes)`);
