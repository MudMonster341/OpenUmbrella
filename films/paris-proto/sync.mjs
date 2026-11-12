// Re-copy onecam from the engine source of truth.
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("../../engine/onecam/onecam.js", "utf8");
writeFileSync("lib/onecam.js", "// COPY - do not edit. Source of truth: engine/onecam/onecam.js
// Re-sync: node sync.mjs
" + src);
console.log("onecam synced");
