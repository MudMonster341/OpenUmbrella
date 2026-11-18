/* bench_frame.mjs — what one frame costs to draw, measured in HyperFrames' own headless Chrome with its own WebGL flags (SwiftShader,
   the CPU rasteriser the render uses), without the ~95 s start-up of a ship.py span. Written 2026-11-18 for ROADMAP D25 (the rebuilt
   rooftop's wide shots cost about 1.9 s a frame; the other sets about 0.2 s).
     node bench_frame.mjs --page part2.html --t 36.6,37.0 --frames 5                 -> ms per frame at each time, baseline
     node bench_frame.mjs --page part2.html --t 36.6 --toggle ao,bump,additive ...    -> the baseline, then each toggle on its own
   Toggles (each applied alone, then undone by reloading the page):
     ao        the GTAO pass off             bloom     the bloom pass off          shadows   the shadow maps off
     bump      every bump map removed         maps      every colour/rough/bump map removed
     additive  every additive-blended mesh, sprite and point hidden (street glow, halos, moon halo)
     clouds    the two cloud planes hidden    transp    every transparent object hidden
     tar128    every 512 px texture shrunk to 128 px          half      the composer at half resolution (per-pixel vs per-draw)
     dpr       (none: the composer is already at pixel ratio 1)
   Timing: one warm-up frame (shader compiles) is dropped; each frame is renderAt(T) then a 1-pixel readPixels, which waits for the
   rasteriser. It times the drawing only, not HyperFrames' screenshot and encode, so it ranks costs; it does not predict wall time.
   Needs the page to expose window.__lab.{scene, renderer, look.composer} (part2.html does since 2026-11-18). Needs the network for
   three.js, as the render does. Nothing is installed: puppeteer-core comes from the hyperframes@0.9.39 npx cache. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PAGE = arg("--page", "part2.html"), TIMES = arg("--t", "36.6").split(",").map(Number), FRAMES = +arg("--frames", "5");
const TOGGLES = ["base", ...(arg("--toggle", "") ? arg("--toggle", "").split(",") : [])];

function findPuppeteer() {
  const npx = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData/Local"), "npm-cache/_npx");
  for (const d of fs.readdirSync(npx)) {
    const hf = path.join(npx, d, "node_modules/hyperframes/package.json");
    if (fs.existsSync(hf) && JSON.parse(fs.readFileSync(hf, "utf8")).version === "0.9.39" && fs.existsSync(path.join(npx, d, "node_modules/puppeteer-core")))
      return createRequire(hf).resolve("puppeteer-core");
  }
  throw new Error("no hyperframes@0.9.39 with puppeteer-core in the npx cache: run any `npx --yes hyperframes@0.9.39 ...` once");
}
function findChrome() {
  const base = path.join(os.homedir(), ".cache/hyperframes/chrome/chrome-headless-shell");
  for (const v of fs.readdirSync(base).sort().reverse()) { const exe = path.join(base, v, "chrome-headless-shell-win64/chrome-headless-shell.exe"); if (fs.existsSync(exe)) return exe; }
  throw new Error("no HyperFrames headless Chrome under " + base);
}
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".glb": "model/gltf-binary", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer((q, r) => {
  const f = path.join(HERE, decodeURIComponent(new URL(q.url, "http://x").pathname));
  if (!f.startsWith(HERE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const port = server.address().port;
const puppeteer = (await import(pathToFileURL(findPuppeteer()).href)).default;
/* the flags of hyperframes 0.9.39's captureBrowserArgs (dist/capture-*.js), WebGL on; --gpu: its hardware mode on Windows (getBrowserGpuArgs: ANGLE on D3D11), what a full render uses when its probe finds the GPU */
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--disable-dev-shm-usage", "--enable-webgl", "--ignore-gpu-blocklist", ...(args.includes("--gpu") ? ["--use-gl=angle", "--use-angle=d3d11", "--enable-gpu-rasterization"] : ["--use-gl=angle", "--use-angle=swiftshader"]), "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--window-size=1080,1920"] });

/* runs in the page */
function applyToggle(name) {
  const { scene, renderer, look } = window.__lab, passes = look.composer.passes, hide = (pred) => { let n = 0; scene.traverse((o) => { if ((o.isMesh || o.isSprite || o.isPoints) && pred(o)) { o.visible = false; o.userData.benchHidden = true; n++; } }); return n; };
  const mats = new Set(); scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => mats.add(m)); });
  const out = (n) => `${name}: ${n} changed`;
  switch (name) {
    case "base": return "baseline";
    case "ao": { const p = passes.find((p) => p.constructor.name === "GTAOPass" || p.gtaoMaterial); if (!p) return "ao: no GTAO pass"; p.enabled = false; return out(1); }
    case "bloom": { const p = passes.find((p) => p.constructor.name === "UnrealBloomPass" || p.highPassUniforms); if (!p) return "bloom: none"; p.enabled = false; return out(1); }
    case "shadows": { renderer.shadowMap.enabled = false; mats.forEach((m) => { m.needsUpdate = true; }); return out(mats.size); }
    case "bump": { let n = 0; mats.forEach((m) => { if (m.bumpMap) { m.bumpMap = null; m.needsUpdate = true; n++; } }); return out(n); }
    case "maps": { let n = 0; mats.forEach((m) => { for (const k of ["map", "bumpMap", "roughnessMap", "metalnessMap", "normalMap"]) if (m[k] && m.isMeshStandardMaterial) { m[k] = null; m.needsUpdate = true; n++; } }); return out(n); }
    case "additive": return out(hide((o) => o.material && o.material.blending === 2));
    case "clouds": return out(hide((o) => o.isMesh && o.material && o.material.transparent && !o.material.depthWrite && o.material.blending !== 2 && o.geometry.parameters && o.geometry.parameters.width >= 400));
    case "transp": return out(hide((o) => o.material && o.material.transparent));
    case "tar128": { let n = 0; const seen = new Set(); mats.forEach((m) => { for (const k of ["map", "bumpMap", "roughnessMap"]) { const t = m[k]; if (!t || seen.has(t) || !t.image || t.image.width < 512) continue; seen.add(t);
        const c = document.createElement("canvas"); c.width = c.height = 128; c.getContext("2d").drawImage(t.image, 0, 0, 128, 128); t.image = c; t.needsUpdate = true; n++; } }); return out(n); }
    case "half": { look.composer.setSize(540, 960); return out(1); }
    default: return `${name}: unknown toggle`;
  }
}
async function timeFrames(T, frames) {
  const { renderAt, renderer } = window.__lab, gl = renderer.getContext(), px = new Uint8Array(4);
  const one = () => { const t0 = performance.now(); renderAt(T); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return performance.now() - t0; };
  one();   /* warm-up: shader compiles after a toggle */
  const ms = []; for (let i = 0; i < frames; i++) ms.push(one());
  renderer.info.autoReset = false; renderer.info.reset(); one(); const info = { ...renderer.info.render }; renderer.info.autoReset = true;   /* every pass of the frame, not only the last */
  ms.sort((a, b) => a - b);
  return { median: ms[Math.floor(ms.length / 2)], min: ms[0], calls: info.calls, tris: info.triangles, programs: renderer.info.programs?.length ?? 0 };
}

/* --pick u,v;u,v  (0..1 from the top-left): what the camera sees at those points at the first --t, nearest first. For "what is that glow?" */
function pick(T, pts) {
  const { renderAt, scene, camera, THREE } = window.__lab; renderAt(T);
  const rc = new THREE.Raycaster(); rc.params.Points.threshold = 0.05;
  return pts.map(([u, v]) => { rc.setFromCamera(new THREE.Vector2(u * 2 - 1, 1 - v * 2), camera);
    return [u, v, rc.intersectObjects(scene.children, true).filter((h) => h.object.visible).slice(0, 4).map((h) => { const m = [].concat(h.object.material)[0] || {};
      const chain = []; for (let o = h.object; o; o = o.parent) chain.push(o.name || o.type); const gp = h.object.geometry?.parameters;
      return `${h.object.geometry?.type} ${gp ? JSON.stringify(gp).slice(0, 80) : ""} [${chain.slice(0, 5).join("<")}] pos ${h.object.position.toArray().map((x) => x.toFixed(2))} ${h.distance.toFixed(2)} m ${h.object.type} ${m.type} col #${m.color ? m.color.getHexString() : "-"}${m.emissive ? " em #" + m.emissive.getHexString() + "x" + m.emissiveIntensity : ""}${m.map ? " map" + m.map.image?.width : ""}${m.transparent ? " transp" : ""}${m.blending === 2 ? " ADD" : ""} at ${h.point.toArray().map((x) => x.toFixed(2)).join(",")}`; })]; });
}
/* --still out_prefix: a PNG of the page at each --t (the canvas plus its HTML overlays), for a quick look without a span render */
if (args.includes("--still")) {
  const pre = arg("--still");
  try { const page = await browser.newPage(); await page.setViewport({ width: 1080, height: 1920 });
    page.on("pageerror", (e) => console.log("  page error: " + String(e).slice(0, 300)));
    await page.goto(`http://127.0.0.1:${port}/${PAGE}`);
    await page.waitForFunction("window.__lab && window.__lab.scene && window.__hf && window.__hf.buildReady", { timeout: 180000 });
    await page.evaluate("Promise.all(Object.values(window.__hf.buildReady))");
    for (const T of TIMES) { await page.evaluate((T) => { window.__lab.renderAt(T); window.__lab.renderAt(T); }, T); const out = `${pre}_${T.toFixed(2)}.png`; await page.screenshot({ path: out }); console.log("still " + out); }
  } finally { await browser.close(); server.close(); }
  process.exit(0);
}
if (args.includes("--pick")) {
  const pts = arg("--pick").split(";").map((s) => s.split(",").map(Number));
  try { const page = await browser.newPage(); await page.setViewport({ width: 1080, height: 1920 });
    await page.goto(`http://127.0.0.1:${port}/${PAGE}`);
    await page.waitForFunction("window.__lab && window.__lab.scene && window.__hf && window.__hf.buildReady", { timeout: 180000 });
    await page.evaluate("Promise.all(Object.values(window.__hf.buildReady))");
    for (const [u, v, hits] of await page.evaluate(pick, TIMES[0], pts)) { console.log(`(${u}, ${v}):`); hits.forEach((h) => console.log("   " + h)); }
  } finally { await browser.close(); server.close(); }
  process.exit(0);
}

const rows = [];
try {
  for (const tg of TOGGLES) {
    const page = await browser.newPage(); await page.setViewport({ width: 1080, height: 1920 });
    page.on("pageerror", (e) => console.log("  page error: " + String(e).slice(0, 200)));
    await page.goto(`http://127.0.0.1:${port}/${PAGE}`);
    await page.waitForFunction("window.__lab && window.__lab.scene && window.__hf && window.__hf.buildReady", { timeout: 180000 });
    await page.evaluate("Promise.all(Object.values(window.__hf.buildReady))");
    await page.evaluate((T) => window.__lab.renderAt(T), TIMES[0]);   /* set up the set's look before toggling */
    const what = await page.evaluate(applyToggle, tg);
    for (const T of TIMES) { const r = await page.evaluate(timeFrames, T, FRAMES); rows.push({ tg, T, ...r });
      console.log(`${tg.padEnd(9)} T=${T.toFixed(2).padStart(6)}  median ${r.median.toFixed(0).padStart(5)} ms  min ${r.min.toFixed(0).padStart(5)} ms  draws ${String(r.calls).padStart(4)}  tris ${String(r.tris).padStart(8)}  (${what})`); }
    await page.close();
  }
} finally { await browser.close(); server.close(); }
