/* street.js — the high street at dusk after rain, rebuilt to the roof's bar (M2, 2026-11-18). Set-local: the shop fronts stand on
   z -2.7, the pavement runs z -2.7..2.3 (they walk along z 0.2..1.1), the kerb at z 2.3, the road beyond. Shots look toward -z from the
   road (z 4.5) and along +x from the pavement (his face).
   Layers: wet slabs that mirror the lamps; kerb, gutter, the road with its lines; shop units with pilasters, fascia signs, lit windows
   with things inside, doors, stall risers and awnings; upper floors with real recessed windows, some lit; lamps with halos, a bench,
   bins, a post box, a bus shelter, planters, bunting; parked cars; the street receding to a clock tower; a dusk sky. Life, a pure
   function of T: traffic both ways with lights, the bunting and the awning valances in the wind, a sign that flickers, windows going on
   and off, people walking far down the street, birds crossing the sky. Story-free (shop words are generic). */
import * as THREE from "three";
import { surf, rbox, facade } from "./matkit.js";
import { M, EM, add, noAO, tube, rng, tree, gradSky, skyEnv, bake, canvasTex, signTex, glow, building } from "./setkit.js";

const NAMES = ["BAKERY", "BOOKS", "CAFE", "FLORIST", "PHARMACY", "HARDWARE", "BARBER", "DELI", "SHOES", "OPTICIAN", "NEWS", "TAILOR", "BUTCHER", "GIFTS"];

export function buildStreet(g, dyn) {
  const rnd = rng(919), D = { win: [], walkers: [], cars: [], bunt: [], val: [] };
  /* ---- ground ---- */
  rbox(g, 90, 0.12, 5, surf("tile", { rep: [18.7, 1.04], size: 512, tint: 0x8e8a84, rough: 1.4 }), 0, -0.06, -0.2, { r: 0.01 });
  rbox(g, 90, 0.16, 0.3, surf("concrete", { rep: [30, 0.2], tint: 0xa8a49c }), 0, -0.04, 2.45, { r: 0.03 });
  rbox(g, 90, 0.1, 0.35, M(0x262626, 0.2), 0, -0.12, 2.78, { r: 0.01 });
  rbox(g, 90, 0.1, 13, surf("asphalt", { rep: [22, 3.2], size: 512 }), 0, -0.13, 9.4, { r: 0.01 });
  for (const z of [3.05, 3.17]) rbox(g, 90, 0.004, 0.1, M(0xe8c440, 0.6), 0, -0.077, z, { r: 0.002 });
  for (let x = -44; x < 44; x += 4) rbox(g, 2.0, 0.004, 0.14, M(0xe9e4da, 0.6), x, -0.077, 8.4, { r: 0.002 });
  for (let x = -40; x < 40; x += 9) rbox(g, 0.45, 0.01, 0.3, M(0x1a1a1c, 0.4, { metalness: 0.6 }), x, -0.075, 2.8, { r: 0.004 });   /* drains */
  /* ---- shop units ---- */
  const brick = [surf("brick", { rep: [2, 3], tint: 0xb07a5a }), surf("brick", { rep: [2, 3], tint: 0x8f5a46 }), surf("brick", { rep: [2, 3], tint: 0xc9a88a })];
  const render = [M(0xd8ccb4, 0.85), M(0x9aa8a0, 0.85), M(0xc8b49a, 0.85), M(0x7a8a98, 0.85)];
  const frameM = [M(0x1e2a26, 0.4), M(0x3a1e1e, 0.4), M(0x1e2436, 0.4), M(0xe8e4da, 0.5)], glass = M(0x0e1418, 0.04, { metalness: 0.6, transparent: true, opacity: 0.22 });
  const stone = M(0xd8d2c4, 0.8), sill = M(0xe0dacc, 0.7), inner = [0xffd7a0, 0xbfe4ff, 0xffc8a8, 0xfff0d0];
  let x = -40, n = 0;
  while (x < 40) {
    const w = 4.2 + rnd() * 2.6, cx = x + w / 2, h = 7 + rnd() * 6, floors = h > 10 ? 3 : 2, wall = rnd() < 0.6 ? brick[n % 3] : render[n % 4], fr = frameM[n % 4];
    rbox(g, w, h, 3, wall, cx, h / 2, -4.2, { r: 0.02 });
    rbox(g, w + 0.06, 0.3, 3.12, stone, cx, h + 0.15, -4.2, { r: 0.03 });                                   /* the parapet cap */
    for (const s of [-1, 1]) rbox(g, 0.32, 3.4, 0.18, stone, cx + s * (w / 2 - 0.16), 1.7, -2.62, { r: 0.02 });   /* pilasters */
    const st = signTex(NAMES[n % NAMES.length], { w: 1024, h: 160, bg: ["#1e3a2e", "#3a1e22", "#1e2a4a", "#2a2420", "#f2efe6"][n % 5], fg: n % 5 === 4 ? "#2a2420" : "#f3e6c4", font: "bold 96px Georgia, serif" });
    rbox(g, w - 0.5, 0.55, 0.12, fr, cx, 3.05, -2.6, { r: 0.02 }); add(g, new THREE.PlaneGeometry(w - 0.7, 0.45), new THREE.MeshStandardMaterial({ map: st, roughness: 0.5, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.18 }), cx, 3.05, -2.535);
    /* the window: frame, glass, an interior that glows, shelves and goods inside for parallax; a door at one side */
    const ww = w - 1.9, wx = cx - 0.45, dx = cx + w / 2 - 0.85, ic = inner[n % 4];
    rbox(g, ww, 0.5, 0.2, surf("tile", { rep: [ww / 2, 0.25], tint: 0x6a4a3a }), wx, 0.25, -2.62, { r: 0.01 });
    for (const [a, b] of [[[wx - ww / 2, 0.5, -2.6], [wx + ww / 2, 0.5, -2.6]], [[wx - ww / 2, 2.6, -2.6], [wx + ww / 2, 2.6, -2.6]]]) tube(g, a, b, 0.04, fr, 6);
    for (let i = 0; i <= 2; i++) rbox(g, 0.07, 2.12, 0.08, fr, wx - ww / 2 + (ww * i) / 2, 1.55, -2.6, { r: 0.01 });
    add(g, new THREE.PlaneGeometry(ww, 2.1), glass, wx, 1.55, -2.58);
    add(g, new THREE.PlaneGeometry(ww, 2.2), EM(ic, 1.3 + 0.5 * rnd()), wx, 1.55, -3.6);
    for (const y of [0.9, 1.5]) rbox(g, ww * 0.8, 0.04, 0.35, M(0x5a4030, 0.6), wx, y, -3.35, { r: 0.01 });
    for (let i = 0; i < 9; i++) { const k = rnd(); rbox(g, 0.12 + 0.15 * k, 0.15 + 0.2 * rnd(), 0.15, M([0xd8363a, 0x2f7fd8, 0xf5c400, 0x2fbf5a, 0xf2f0ea, 0x7b4fc4][Math.floor(rnd() * 6)], 0.6), wx - ww * 0.38 + (i % 5) * ww * 0.19, (i < 5 ? 0.92 : 1.52) + 0.1, -3.32, { r: 0.01 }); }
    rbox(g, 0.95, 2.3, 0.08, fr, dx, 1.15, -2.66, { r: 0.02 }); add(g, new THREE.PlaneGeometry(0.6, 1.2), EM(ic, 0.45), dx, 1.5, -2.615); add(g, new THREE.SphereGeometry(0.03, 10, 8), M(0xd9b35a, 0.3, { metalness: 0.9 }), dx - 0.36, 1.1, -2.6);
    /* the awning: striped canvas, a valance that moves */
    if (rnd() < 0.7) { const cols = [["#d8363a", "#f2efe6"], ["#1e5a3a", "#f2efe6"], ["#1e3a6a", "#e8e0c8"], ["#e8a020", "#f2efe6"]][Math.floor(rnd() * 4)];
      const at = canvasTex(256, 32, (c, W, H) => { for (let i = 0; i < 8; i++) { c.fillStyle = cols[i % 2]; c.fillRect(i * W / 8, 0, W / 8, H); } }); at.wrapS = THREE.RepeatWrapping; at.repeat.set(w / 2.2, 1);
      const am = new THREE.MeshStandardMaterial({ map: at, roughness: 0.85, side: THREE.DoubleSide }); const aw = add(g, new THREE.PlaneGeometry(w - 0.6, 1.2), am, cx, 2.5, -2.15); aw.rotation.x = -Math.PI / 2 + 0.42;
      const vg = new THREE.PlaneGeometry(w - 0.6, 0.22, 20, 1), vm = add(g, vg, am, cx, 2.15, -1.6); vm.userData.keep = true; D.val.push({ m: vm, base: Float32Array.from(vg.attributes.position.array), ph: cx }); }
    /* upper floors: recessed windows, sills, lintels; some lit */
    for (let f = 0; f < floors - 1; f++) { const y = 4.6 + f * 2.9, nw = Math.max(2, Math.round(w / 1.8));
      for (let i = 0; i < nw; i++) { const px = cx - w / 2 + (w * (i + 0.5)) / nw;
        rbox(g, 0.95, 1.5, 0.1, M(0x161a20, 0.5), px, y, -2.66, { r: 0.01 }); rbox(g, 1.1, 0.08, 0.2, sill, px, y - 0.8, -2.62, { r: 0.01 }); rbox(g, 1.1, 0.14, 0.12, sill, px, y + 0.82, -2.66, { r: 0.01 });
        const lit = rnd() < 0.45, wm = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, emissive: lit ? [0xffc98a, 0xffe0b0, 0xbfd4ff][Math.floor(rnd() * 3)] : 0x000000, emissiveIntensity: 0.8 });
        const pane = add(g, new THREE.PlaneGeometry(0.82, 1.36), wm, px, y, -2.6); pane.userData.keep = true; rbox(g, 0.04, 1.36, 0.05, fr, px, y, -2.59, { r: 0.005 });
        if (lit && rnd() < 0.5) { const cu = add(g, new THREE.PlaneGeometry(0.3, 1.3), M(0x8a3a2a, 0.9), px - 0.27, y, -2.598); void cu; }
        D.win.push({ m: wm, lit, ph: rnd() * 40, k: wm.emissive.clone() }); } }
    x += w + 0.05; n++;
  }
  /* the street beyond: far blocks both ways, a clock tower at the end */
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) building(g, { x: s * (50 + i * 9), z: -6 - rnd() * 4, w: 8, d: 6, top: 9 + rnd() * 8, bottom: -0.5, seed: 30 + i, lit: 0.45, wall: "#4a3a3a", glow: 0.8 });
  { const ct = new THREE.Group(); ct.position.set(78, 0, 6); g.add(ct); const ts = surf("brick", { rep: [2, 8], tint: 0xa88a6a });
    rbox(ct, 4, 22, 4, ts, 0, 11, 0, { r: 0.05 }); add(ct, new THREE.ConeGeometry(3.2, 6, 4), M(0x3a3a44, 0.7), 0, 25, 0).rotation.y = Math.PI / 4;
    const face = add(ct, new THREE.CylinderGeometry(1.2, 1.2, 0.1, 28), EM(0xfff0d0, 0.9), -2.06, 18, 0); face.rotation.z = Math.PI / 2; }
  /* ---- street furniture ---- */
  const iron = M(0x22262e, 0.45, { metalness: 0.6 });
  for (let lx = -36; lx <= 36; lx += 9) { if (lx > -3 && lx < 11) continue;
    tube(g, [lx, 0, 1.95], [lx, 4.3, 1.95], 0.06, iron, 10); tube(g, [lx, 4.3, 1.95], [lx, 4.45, 1.5], 0.035, iron, 8);
    add(g, new THREE.CylinderGeometry(0.16, 0.24, 0.32, 8), M(0x2a2e36, 0.4, { metalness: 0.5 }), lx, 4.45, 1.45); add(g, new THREE.CylinderGeometry(0.17, 0.17, 0.18, 8), EM(0xffc47a, 2.2), lx, 4.22, 1.45);
    glow(g, 0xffb46a, 1.6, lx, 4.2, 1.45, 0.5); if (Math.abs(lx) <= 18) { const l = new THREE.PointLight(0xffb46a, 7, 11, 1.6); l.position.set(lx, 4.0, 1.4); g.add(l); } }
  for (let bx = -30; bx <= 30; bx += 5.5) if (bx + 2 < -3 || bx + 2 > 11) { tube(g, [bx + 2, 0, 2.05], [bx + 2, 0.85, 2.05], 0.07, iron, 10); add(g, new THREE.SphereGeometry(0.075, 10, 8), iron, bx + 2, 0.86, 2.05); }
  { const bench = new THREE.Group(); bench.position.set(-4.6, 0, 1.6); g.add(bench); const wd = surf("wood", { rep: [1, 0.3], tint: 0x8a5a36 });
    for (let i = 0; i < 4; i++) rbox(bench, 1.8, 0.04, 0.09, wd, 0, 0.45, -0.18 + i * 0.11, { r: 0.01 }); for (let i = 0; i < 3; i++) rbox(bench, 1.8, 0.09, 0.03, wd, 0, 0.6 + i * 0.12, -0.26, { r: 0.01, rx: 0.12 });
    for (const s of [-0.8, 0.8]) rbox(bench, 0.05, 0.45, 0.5, iron, s, 0.22, -0.05, { r: 0.01 }); }
  { const pb = new THREE.Group(); pb.position.set(-8.5, 0, 1.7); g.add(pb); const red = M(0xc81e1e, 0.35); add(pb, new THREE.CylinderGeometry(0.26, 0.28, 1.25, 20), red, 0, 0.62, 0); add(pb, new THREE.SphereGeometry(0.29, 20, 10, 0, 6.29, 0, 1.6), red, 0, 1.25, 0); rbox(pb, 0.3, 0.04, 0.05, M(0x111111, 0.5), 0, 1.0, 0.27, { r: 0.01 }); }
  for (const bx of [-13, 9.5]) { add(g, new THREE.CylinderGeometry(0.24, 0.22, 0.85, 16), M(0x1e3a2a, 0.5), bx, 0.42, 1.9); add(g, new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), M(0x1e3a2a, 0.4), bx, 0.87, 1.9); }
  { const bs = new THREE.Group(); bs.position.set(-19, 0, 1.4); g.add(bs); const gl = M(0xa8c8d8, 0.05, { transparent: true, opacity: 0.25, metalness: 0.3 });
    for (const s of [-1, 1]) tube(bs, [s * 1.4, 0, 0.5], [s * 1.4, 2.4, 0.5], 0.04, iron, 8); rbox(bs, 3.0, 0.08, 1.4, iron, 0, 2.44, 0, { r: 0.02 }); add(bs, new THREE.PlaneGeometry(2.8, 2.2), gl, 0, 1.25, -0.5);
    const ad = add(bs, new THREE.PlaneGeometry(1.1, 1.8), EM(0xe8f0ff, 1.0), 1.38, 1.3, 0); ad.rotation.y = -Math.PI / 2; }
  { const bark = surf("wood", { rep: [0.5, 2], tint: 0x3a2c22 }), lf = M(0x2c4a2a, 0.9), lf2 = M(0x3a5a30, 0.9); D.trees = [];
    for (const tx of [-24, -1.8 - 9, 15, 27]) { rbox(g, 1.1, 0.5, 1.1, stone, tx, 0.25, 1.0, { r: 0.03 }); D.trees.push(tree(g, tx, 1.0, { h: 3.6, r: 1.0, rnd, bark, leaf: lf, leaf2: lf2 })); } }
  /* parked cars on the far side of the kerb, clear of the camera's path (x 2.6..7 in the road) */
  const paint = [0x8a1e22, 0x1e3a6a, 0xd8d8d0, 0x2a2a2e, 0x4a6a5a, 0x9a8a6a];
  for (const [cx, ry] of [[-26, 0], [-20.5, 0], [-12.5, 0], [12.5, Math.PI], [18, Math.PI], [24, 0]]) car(g, cx, 3.45, ry, paint[Math.floor(rnd() * paint.length)], iron);
  /* moving traffic: lanes at z 6.4 (toward -x) and z 10.4 (toward +x) */
  for (let i = 0; i < 6; i++) { const c = car(g, 0, 0, 0, paint[i % paint.length], iron, true); D.cars.push({ c, lane: i % 2, off: i * 23 + rnd() * 8, v: 7 + rnd() * 3 }); }
  /* bunting along the shop fronts, sagging between the lamps; each flag flutters */
  { const fm = [0xd8363a, 0xf5c400, 0x2f7fd8, 0x2fbf5a, 0xf2f0ea].map((c) => M(c, 0.8, { side: THREE.DoubleSide })), fg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.12, 0, 0), new THREE.Vector3(0.12, 0, 0), new THREE.Vector3(0, -0.28, 0)]); fg.computeVertexNormals();
    for (let a = -36; a < 36; a += 9) { const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([a + 9 * u, 4.55 - 0.7 * Math.sin(Math.PI * u), 1.5 - 1.2 * Math.sin(Math.PI * u)]); }
      for (let i = 0; i < 24; i++) tube(g, pts[i], pts[i + 1], 0.006, iron, 3);
      for (let i = 1; i < 24; i += 1) { const f = add(g, fg, fm[(((i + a) % 5) + 5) % 5], ...pts[i]); f.userData.keep = true; D.bunt.push({ f, ph: a * 0.3 + i * 0.7 }); } } }
  /* people far down the street, both ways */
  { const coat = [0x2a2a30, 0x5a3a2a, 0x2a3a5a, 0x6a2a2a, 0x3a4a3a]; for (let i = 0; i < 10; i++) { const p = new THREE.Group(); p.userData.keep = true; g.add(p);
      const c = M(coat[i % 5], 0.8); add(p, new THREE.CapsuleGeometry(0.2, 0.75, 4, 10), c, 0, 0.95, 0); add(p, new THREE.SphereGeometry(0.13, 12, 8), M(0xc89070, 0.7), 0, 1.6, 0); for (const s of [-1, 1]) add(p, new THREE.CapsuleGeometry(0.07, 0.5, 3, 6), M(0x1e1e22, 0.8), s * 0.09, 0.3, 0);
      D.walkers.push({ p, dir: i % 2 ? 1 : -1, z: -1.5 + rnd() * 3.2, off: rnd() * 60, v: 1.0 + 0.4 * rnd() }); } }
  /* birds over the roofs */
  { const bg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.25, 0.05, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.25, 0.05, 0)]); D.birds = [];
    for (let i = 0; i < 9; i++) { const b = new THREE.Line(bg, new THREE.LineBasicMaterial({ color: 0x2a2030 })); b.userData.keep = true; noAO(b); g.add(b); D.birds.push({ b, k: i }); } }
  gradSky(g, [[0, "#2c2450"], [0.45, "#7a4a78"], [0.75, "#d8806a"], [1, "#f0b080"]], { z: -60, w: 300, h: 100, y0: -5 });
  { const l = new THREE.PointLight(0xffd0a0, 3, 12, 1.6); l.position.set(0, 3, 4); g.add(l); }
  D.flick = D.win.length ? D.win[3] : null;
  bake(g);

  function update(T) {
    for (const v of D.val) { const p = v.m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = v.base[i * 3], y = v.base[i * 3 + 1]; p.setZ(i, (0.11 - y) * 0.35 * Math.sin(T * 2.6 + x * 1.4 + v.ph)); } p.needsUpdate = true; }
    for (const b of D.bunt) { b.f.rotation.x = 0.5 * Math.sin(T * 3.4 + b.ph) + 0.25 * Math.sin(T * 7.1 + 2 * b.ph); b.f.rotation.y = 0.3 * Math.sin(T * 2.3 + b.ph); }
    for (const w of D.win) { if (!w.lit) continue; const on = Math.sin(T * 0.21 + w.ph) > -0.85; w.m.emissive.copy(w.k).multiplyScalar(on ? 1 : 0.05); }
    for (const c of D.cars) { const dir = c.lane ? 1 : -1, x = (((T * c.v * dir + c.off) % 120) + 120) % 120 - 60; c.c.position.set(x, 0, c.lane ? 10.4 : 6.4); c.c.rotation.y = c.lane ? 0 : Math.PI; }
    for (const w of D.walkers) { const x = (((T * w.v * w.dir + w.off) % 60) + 60) % 60; w.p.position.set(w.dir > 0 ? 8 + x * 0.8 : 56 - x * 0.8, Math.abs(Math.sin(T * 5 * w.v + w.off)) * 0.03, w.z); w.p.position.x *= 1; w.p.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    for (const { b, k } of D.birds) { const u = ((T * 0.06 + k * 0.012) % 1); b.position.set(-60 + 120 * u + (k % 3) * 1.2, 16 + (k % 4) * 0.9 + Math.sin(T * 0.7 + k) * 0.5, -30 + (k % 5) * 1.5); b.scale.set(1, 1 + 1.6 * Math.sin(T * 9 + k), 1); }
    for (const tr of D.trees) tr.crown.rotation.z = 0.02 * Math.sin(T * 0.8 + tr.ph);
  }
  function env(renderer) { return skyEnv(renderer, [[0, "#3a2c5a"], [0.45, "#b8607a"], [0.55, "#f0a46a"], [0.6, "#3a2a28"], [1, "#141214"]], [[0xffc080, 3, 10, 4, 6], [0xffc080, 3, -10, 4, 6]]); }
  return { update, env };
}

/* a hatchback: body, cabin with glass, wheels, lights (with live halos when it moves) */
function car(g, x, z, ry, color, iron, moving = false) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; if (moving) c.userData.keep = true; g.add(c);
  const body = M(color, 0.25, { metalness: 0.6 }), gl = M(0x141a22, 0.05, { metalness: 0.7 });
  rbox(c, 3.9, 0.7, 1.7, body, 0, 0.62, 0, { r: 0.14 }); rbox(c, 2.2, 0.58, 1.52, gl, -0.2, 1.22, 0, { r: 0.16 }); rbox(c, 2.0, 0.06, 1.4, body, -0.2, 1.52, 0, { r: 0.03 });
  for (const [wx, wz] of [[-1.25, -0.82], [1.25, -0.82], [-1.25, 0.82], [1.25, 0.82]]) { const w = add(c, new THREE.CylinderGeometry(0.33, 0.33, 0.24, 18), M(0x141416, 0.8), wx, 0.33, wz); w.rotation.x = Math.PI / 2; const h = add(c, new THREE.CylinderGeometry(0.2, 0.2, 0.25, 14), iron, wx, 0.33, wz); h.rotation.x = Math.PI / 2; }
  for (const s of [-1, 1]) { rbox(c, 0.06, 0.14, 0.32, EM(0xfff4e0, moving ? 2.5 : 0.2), 1.95, 0.72, s * 0.58, { r: 0.02 }); rbox(c, 0.06, 0.14, 0.3, EM(0xd81e1e, moving ? 2 : 0.3), -1.95, 0.75, s * 0.6, { r: 0.02 });
    if (moving) { glow(c, 0xfff0d0, 1.0, 2.2, 0.72, s * 0.58, 0.6); glow(c, 0xff3020, 0.6, -2.1, 0.75, s * 0.6, 0.5); } }
  return c;
}
