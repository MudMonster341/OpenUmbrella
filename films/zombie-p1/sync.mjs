// Re-copy the engine modules from their source of truth.
// Run from this directory: node sync.mjs
//
// D6 in ROADMAP.md: these are hand-synced copies and that is tech debt. They
// exist because a HyperFrames composition resolves imports relative to itself
// and cannot reach outside the project directory. Until the D4/D6 build step
// exists, this script is the sync.
import { readFileSync, writeFileSync } from "node:fs";

const FILES = ["onecam.js", "motionblur.js"];

for (const name of FILES) {
  const header = [
    `// COPY - do not edit. Source of truth: engine/onecam/${name}`,
    "// Re-sync: node sync.mjs",
    "",
  ].join("\n");
  const src = readFileSync(`../../engine/onecam/${name}`, "utf8");
  writeFileSync(`lib/${name}`, header + src);
  console.log(`${name} synced (${src.length} bytes)`);
}
