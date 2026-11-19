/* check_cast.mjs — every actor's standing height against the cast spec, measured, not assumed (the user, 2026-11-18: a younger sibling
   must be shorter; the rig once could only scale whole bodies, which shrank the head and read as a child).
     node check_cast.mjs --script <part>_script.json                  -> PASS / FAIL per cast member, exit 1 on any fail
     node check_cast.mjs --script <part>_script.json --plant sib:1.0  -> the planted fault: the brother built at the lead's height (must FAIL)
   How: a local static server over this folder; cast_probe.html opened in HyperFrames' own headless Chrome (puppeteer-core from the
   hyperframes@0.9.39 npx cache: nothing is installed); each actor built with lib/actor.js makeActor() from cast_p2.js, posed standing,
   measured feet to head top on the skinned vertices. Rule: |height / lead's height - spec| <= 0.02, the spec from the part's script
   JSON (`cast.<name>.height_vs_lead`). A cast member in the spec but not built in the scene (e.g. the friend, seen only in photos) is
   reported, not failed. Needs the network for three.js (as the render does). */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), TOL = 0.02;
const args = process.argv.slice(2), plant = args.includes("--plant") ? args[args.indexOf("--plant") + 1] : null;
if (!args.includes("--script")) { console.log("FAIL check_cast: give --script films/<slug>/<part>_script.json (the cast spec)"); process.exit(1); }
const scriptPath = args[args.indexOf("--script") + 1];
const spec = JSON.parse(fs.readFileSync(scriptPath, "utf8")).cast;

function findPuppeteer() {
  const npx = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData/Local"), "npm-cache/_npx");
  for (const d of fs.readdirSync(npx)) {
    const hf = path.join(npx, d, "node_modules/hyperframes/package.json");
    if (fs.existsSync(hf) && JSON.parse(fs.readFileSync(hf, "utf8")).version === "0.9.39" && fs.existsSync(path.join(npx, d, "node_modules/puppeteer-core")))
      return createRequire(path.join(npx, d, "node_modules/hyperframes/package.json")).resolve("puppeteer-core");
  }
  throw new Error("no hyperframes@0.9.39 with puppeteer-core in the npx cache: run any `npx --yes hyperframes@0.9.39 ...` once");
}
function findChrome() {
  const base = path.join(os.homedir(), ".cache/hyperframes/chrome/chrome-headless-shell");
  for (const v of fs.readdirSync(base).sort().reverse()) { const exe = path.join(base, v, "chrome-headless-shell-win64/chrome-headless-shell.exe"); if (fs.existsSync(exe)) return exe; }
  throw new Error("no HyperFrames headless Chrome under " + base);
}
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".glb": "model/gltf-binary", ".json": "application/json" };
const server = http.createServer((q, r) => {
  const f = path.join(HERE, decodeURIComponent(new URL(q.url, "http://x").pathname));
  if (!f.startsWith(HERE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const port = server.address().port;
const puppeteer = (await import(pathToFileURL(findPuppeteer()).href)).default;
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--no-sandbox"] });
let res;
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/cast_probe.html${plant ? "?plant=" + plant : ""}`);
  await page.waitForFunction("window.__cast", { timeout: 120000 });
  res = await page.evaluate("window.__cast");
} finally { await browser.close(); server.close(); }
if (res.error) { console.log("FAIL check_cast: the probe page threw: " + res.error.slice(0, 400)); process.exit(1); }
const lead = Object.values(res).find((a) => a.role === "lead");
const fails = [], rows = [];
for (const [name, s] of Object.entries(spec)) {
  const a = Object.values(res).find((x) => x.role === s.role);
  if (!a) { rows.push(`  ${name}: not built in the scene (spec ${s.height_vs_lead}); not measured`); continue; }
  const r = a.height_m / lead.height_m, ok = Math.abs(r - s.height_vs_lead) <= TOL;
  rows.push(`  ${ok ? "ok  " : "FAIL"} ${name}: ${a.height_m.toFixed(3)} m standing, ${r.toFixed(3)} of the lead, spec ${s.height_vs_lead} (look.height ${a.look_height})`);
  if (!ok) fails.push(name);
}
console.log(rows.join("\n"));
console.log(fails.length ? `FAIL check_cast${plant ? " (planted: " + plant + ")" : ""}: ${fails.join(", ")} off the spec by more than ${TOL}` : `PASS check_cast: ${rows.filter((r) => r.includes("ok")).length} measured, all within ${TOL} of the spec`);
process.exit(fails.length ? 1 : 0);
