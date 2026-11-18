/* door.js — the front doorway at night, rebuilt to the roof's bar (M2, 2026-11-18), with the user's note on draft v4: "the brother
   comes out from nowhere; the inside of the house doesn't look filled at all". Set-local: the house front is the plane z -0.6, the door
   hangs on a hinge at (-0.52, 0, -0.62) and opens inward (dyn.door, swung by sets2's update); the hall runs back to z -4.7 between
   x -1.5 and 1.5; they stand outside at z ~1.6; the shots look at the door from z 1..3.4.
   Outside: a brick front with a stone step, a panelled door with glass, a fanlight, a porch lantern, a bay window with curtains, the
   upper windows, the eaves and gutter, the neighbours either side, a garden wall and hedge, a path, a night sky with stars.
   Inside, so the hall reads as lived in: boards and a runner, skirting, papered walls, a staircase with a banister going up, coats on
   hooks, a radiator, a mirror, pictures, a pendant lamp, a partition with a shelf and her photo, and a lit kitchen doorway at the back.
   Life, a pure function of T: moths round the porch lantern, the hedge in the wind, a curtain stirring, a neighbour's window on and off,
   a car's lights sweeping past at the end of the road. Story-free. */
import * as THREE from "three";
import { surf, rbox } from "./matkit.js";
import { M, EM, add, noAO, tube, rng, gradSky, skyEnv, bake, canvasTex, glow, blob } from "./setkit.js";

export function buildDoor(g, dyn, { framed }) {
  const rnd = rng(1201), D = {};
  const brick = surf("brick", { rep: [4, 2.6], tint: 0xa86b4f }), stone = M(0xd0c8b8, 0.75), white = M(0xf2efe6, 0.5), trim = M(0x1e3a32, 0.45);
  /* ---- ground: pavement, path, garden, step ---- */
  rbox(g, 24, 0.12, 12, surf("tile", { rep: [5, 2.5], tint: 0x6a6660, rough: 1.3 }), 0, -0.06, 4.2, { r: 0.01 });
  rbox(g, 1.6, 0.03, 3.0, surf("tile", { rep: [0.7, 1.3], tint: 0x8a7a6a }), 0, 0.015, 1.0, { r: 0.01 });
  for (const s of [-1, 1]) rbox(g, 4.6, 0.04, 3.0, surf("grass", { rep: [2, 1.3] }), s * 3.2, 0.02, 1.0, { r: 0.01 });
  rbox(g, 1.6, 0.16, 0.7, stone, 0, 0.08, 0.0, { r: 0.02 }); rbox(g, 0.9, 0.02, 0.5, M(0x5a3a26, 0.95), 0, 0.17, -0.1, { r: 0.01 });   /* step, doormat */
  /* garden wall and hedge with a gap for the path */
  for (const s of [-1, 1]) { rbox(g, 4.4, 0.55, 0.25, brick, s * 3.0, 0.28, 2.7, { r: 0.02 }); rbox(g, 4.5, 0.06, 0.32, stone, s * 3.0, 0.58, 2.7, { r: 0.02 }); }
  D.hedge = []; for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const h = new THREE.Group(); h.position.set(s * (1.3 + i * 0.6), 0.85, 2.45); h.userData.keep = true; g.add(h); add(h, blob(0.42, rnd), M(i % 2 ? 0x2a4a28 : 0x325a2e, 0.95), 0, 0, 0); D.hedge.push({ h, ph: i + s }); }
  /* ---- the front: brick, door surround, fanlight, bay window, upper windows, eaves ---- */
  rbox(g, 2.5, 6.2, 0.25, brick, -1.8, 3.1, -0.6, { r: 0.01 }); rbox(g, 2.5, 6.2, 0.25, brick, 1.8, 3.1, -0.6, { r: 0.01 }); rbox(g, 1.1, 3.7, 0.25, brick, 0, 4.35, -0.6, { r: 0.01 });
  rbox(g, 12.4, 0.18, 0.5, white, 0, 6.25, -0.45, { r: 0.02 }); tube(g, [-6, 6.12, -0.18], [6, 6.12, -0.18], 0.06, M(0x1a1a1e, 0.4), 10);
  { const rf = add(g, new THREE.BoxGeometry(12.6, 0.1, 3.2), M(0x3a3236, 0.8), 0, 7.0, -1.6); rf.rotation.x = 0.5; }
  for (const s of [-1, 1]) rbox(g, 0.1, 2.3, 0.3, white, s * 0.6, 1.15, -0.5, { r: 0.01 }); rbox(g, 1.3, 0.1, 0.3, white, 0, 2.17, -0.5, { r: 0.01 });
  { const fl = add(g, new THREE.CircleGeometry(0.5, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc890, emissiveIntensity: 1.3 }), 0, 2.22, -0.55); void fl;
    for (let i = 1; i < 5; i++) { const a = (i / 5) * Math.PI; tube(g, [0, 2.22, -0.54], [Math.cos(a) * 0.5, 2.22 + Math.sin(a) * 0.5, -0.54], 0.012, white, 4); } add(g, new THREE.TorusGeometry(0.5, 0.04, 6, 24, Math.PI), white, 0, 2.22, -0.53); }
  rbox(g, 1.5, 0.12, 0.3, stone, 0, 2.86, -0.46, { r: 0.02 });
  /* the door: panels, glass, letterbox, knocker, knob (a live group on the hinge) */
  { const h = new THREE.Group(); h.position.set(-0.52, 0, -0.62); h.userData.keep = true; g.add(h); const dm = M(0x1e4a3e, 0.35), br = M(0xc9a24a, 0.25, { metalness: 0.9 });
    rbox(h, 1.02, 2.06, 0.05, dm, 0.51, 1.03, 0, { r: 0.01 });
    for (const [px, py, pw, ph] of [[0.27, 0.45, 0.32, 0.6], [0.75, 0.45, 0.32, 0.6]]) for (const s of [-1, 1]) rbox(h, pw, ph, 0.02, dm, px, py, s * 0.03, { r: 0.015 });
    for (const px of [0.27, 0.75]) for (const s of [-1, 1]) add(h, new THREE.PlaneGeometry(0.3, 0.62), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc890, emissiveIntensity: 0.9, roughness: 0.6 }), px, 1.45, s * 0.027).rotation.y = s > 0 ? 0 : Math.PI;
    rbox(h, 0.3, 0.06, 0.02, br, 0.51, 0.98, 0.032, { r: 0.01 }); add(h, new THREE.TorusGeometry(0.06, 0.012, 8, 16), br, 0.51, 1.88, 0.04); add(h, new THREE.SphereGeometry(0.035, 12, 8), br, 0.92, 1.0, 0.045); add(h, new THREE.SphereGeometry(0.035, 12, 8), br, 0.92, 1.0, -0.045);
    dyn.door = h; }
  /* porch lantern, moths */
  { add(g, new THREE.BoxGeometry(0.06, 0.06, 0.14), M(0x1a1a1e, 0.5), 0.95, 2.3, -0.42); const lt = add(g, new THREE.CylinderGeometry(0.09, 0.07, 0.24, 6), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffd29a, emissiveIntensity: 2.2 }), 0.95, 2.22, -0.32); void lt;
    add(g, new THREE.ConeGeometry(0.12, 0.08, 6), M(0x1a1a1e, 0.5), 0.95, 2.38, -0.32); glow(g, 0xffd29a, 0.9, 0.95, 2.22, -0.3, 0.55);
    const l = new THREE.PointLight(0xffd29a, 3, 5, 1.6); l.position.set(0.95, 2.2, -0.1); g.add(l);
    D.moths = []; for (let i = 0; i < 5; i++) { const m = add(g, new THREE.PlaneGeometry(0.025, 0.018), new THREE.MeshBasicMaterial({ color: 0xe8dcc0, side: THREE.DoubleSide }), 0, -9, 0); m.userData.keep = true; noAO(m); D.moths.push({ m, ph: rnd() * 6, r: 0.12 + 0.1 * rnd(), w: 3 + 3 * rnd() }); } }
  /* bay window, left: three lights, curtains, warm room */
  { const bx = -2.0, frame = white, room = M(0x111111, 0.6, { emissive: 0xffb870, emissiveIntensity: 0.9 });
    rbox(g, 2.2, 0.5, 0.6, stone, bx, 0.45, -0.25, { r: 0.02 }); rbox(g, 2.3, 0.12, 0.7, stone, bx, 0.75, -0.25, { r: 0.02 }); rbox(g, 2.3, 0.15, 0.7, white, bx, 2.35, -0.25, { r: 0.02 });
    for (const [x, ry] of [[bx - 0.9, 0.6], [bx, 0], [bx + 0.9, -0.6]]) { const w = new THREE.Group(); w.position.set(x, 1.55, ry ? -0.4 : 0.03); w.rotation.y = ry; g.add(w);
      add(w, new THREE.PlaneGeometry(0.7, 1.4), room, 0, 0, -0.08); rbox(w, 0.06, 1.5, 0.06, frame, -0.38, 0, 0, { r: 0.01 }); rbox(w, 0.06, 1.5, 0.06, frame, 0.38, 0, 0, { r: 0.01 }); rbox(w, 0.8, 0.05, 0.06, frame, 0, 0.3, 0, { r: 0.01 });
      add(w, new THREE.PlaneGeometry(0.7, 1.4), M(0x0a0e14, 0.05, { metalness: 0.5, transparent: true, opacity: 0.3 }), 0, 0, 0.01); }
    D.curt = []; for (const s of [-1, 1]) { const cg = new THREE.PlaneGeometry(0.4, 1.45, 6, 8), c = add(g, cg, M(0x8a2a2a, 0.9, { side: THREE.DoubleSide }), bx + s * 0.42, 1.55, -0.12); c.userData.keep = true; D.curt.push({ c, base: Float32Array.from(cg.attributes.position.array), s }); } }
  /* upper windows, the right-hand front window */
  for (const [x, y, lit] of [[-2.0, 4.4, true], [0, 4.4, false], [2.0, 4.4, true], [2.0, 1.55, true]]) {
    rbox(g, 1.1, 1.4, 0.08, M(0x101418, 0.4), x, y, -0.46, { r: 0.01 }); add(g, new THREE.PlaneGeometry(0.9, 1.2), lit ? M(0x111111, 0.6, { emissive: x > 0 ? 0xbfd4ff : 0xffd08a, emissiveIntensity: 0.7 }) : M(0x0a0e14, 0.1, { metalness: 0.5 }), x, y, -0.415);
    for (const s of [-1, 1]) rbox(g, 0.06, 1.3, 0.06, white, x + s * 0.48, y, -0.4, { r: 0.01 }); rbox(g, 1.0, 0.05, 0.06, white, x, y + 0.1, -0.4, { r: 0.01 }); rbox(g, 1.2, 0.08, 0.22, stone, x, y - 0.74, -0.36, { r: 0.01 }); }
  /* the neighbours: the terrace continues either side */
  for (const s of [-1, 1]) { rbox(g, 6, 6.2, 0.25, surf("brick", { rep: [4, 2.6], tint: s > 0 ? 0x8a5a44 : 0x9a7058 }), s * 6.05, 3.1, -0.62, { r: 0.01 });
    for (const [dx, y] of [[-1.5, 1.55], [1.5, 1.55], [-1.5, 4.4], [1.5, 4.4]]) { const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: rnd() < 0.5 ? 0xffc890 : 0x000000, emissiveIntensity: 0.6, roughness: 0.4 }); add(g, new THREE.PlaneGeometry(1.0, 1.25), m, s * 6.05 + dx, y, -0.48); if (s > 0 && dx > 0 && y > 2) D.nwin = m; } }
  /* ---- inside: the hall ---- */
  { const floor = surf("wood", { rep: [1.5, 2], tint: 0x8b5e3c, rough: 0.5 }); rbox(g, 3, 0.05, 4.1, floor, 0, 0.0, -2.7, { r: 0.005 }); rbox(g, 0.75, 0.012, 3.6, M(0x7a2a2a, 0.95), -0.05, 0.03, -2.6, { r: 0.004 });
    const pap = canvasTex(64, 64, (x) => { x.fillStyle = "#e6d2ae"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#d8bf96"; for (let i = 0; i < 64; i += 16) x.fillRect(i, 0, 6, 64); }); pap.wrapS = pap.wrapT = THREE.RepeatWrapping; pap.repeat.set(10, 4);
    const wall = new THREE.MeshStandardMaterial({ map: pap, roughness: 0.85 });
    rbox(g, 3, 3, 0.1, wall, 0, 1.5, -4.75, { r: 0.005 }); for (const s of [-1, 1]) rbox(g, 0.1, 3, 4.2, wall, s * 1.55, 1.5, -2.7, { r: 0.005 }); add(g, new THREE.PlaneGeometry(3.1, 4.2), M(0xf2ede2, 0.9), 0, 2.98, -2.7).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) rbox(g, 0.03, 0.14, 4.1, white, s * 1.49, 0.07, -2.7, { r: 0.005 });
    /* the partition with the shelf and her photo (the shelf stood on nothing in draft v4) */
    rbox(g, 1.6, 3, 0.1, wall, -0.7, 1.5, -2.62, { r: 0.005 }); rbox(g, 1.6, 0.14, 0.03, white, -0.7, 0.07, -2.56, { r: 0.004 });
    rbox(g, 0.9, 0.04, 0.25, M(0x5a3c26, 0.6), -0.45, 1.3, -2.45, { r: 0.005 }); for (const s of [-0.38, 0.38]) rbox(g, 0.03, 0.12, 0.2, M(0x5a3c26, 0.6), -0.45 + s, 1.24, -2.47, { r: 0.004 });
    framed(g, 0.24, 0.3, -0.45, 1.5, -2.42); add(g, new THREE.CylinderGeometry(0.04, 0.05, 0.14, 12), M(0xe8e4da, 0.3), -0.78, 1.39, -2.45); for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.03, 8, 6), M(0xf4f0e8, 0.7), -0.78 + (i - 1) * 0.03, 1.5 + 0.02 * i, -2.45);
    /* the stairs going up on the right, a banister and spindles */
    const tread = surf("wood", { rep: [0.6, 0.3], tint: 0x6a4428 }); for (let i = 0; i < 12; i++) { rbox(g, 1.0, 0.04, 0.28, tread, 0.95, 0.2 + i * 0.2, -1.6 - i * 0.25, { r: 0.006 }); rbox(g, 1.0, 0.2, 0.02, white, 0.95, 0.1 + i * 0.2, -1.47 - i * 0.25, { r: 0.004 }); }
    tube(g, [0.42, 1.1, -1.5], [0.42, 3.4, -4.4], 0.035, M(0x4a2a18, 0.4), 8); tube(g, [0.42, 0, -1.5], [0.42, 1.15, -1.5], 0.05, M(0x4a2a18, 0.4), 8);
    for (let i = 0; i < 11; i++) tube(g, [0.42, 0.22 + i * 0.2, -1.65 - i * 0.25], [0.42, 1.18 + i * 0.2, -1.65 - i * 0.25], 0.012, white, 5);
    /* coats on hooks, the radiator, a mirror, pictures, the pendant */
    rbox(g, 0.7, 0.06, 0.04, M(0x5a3c26, 0.6), -1.48, 1.75, -1.2, { r: 0.005, ry: Math.PI / 2 });
    for (const [z, c] of [[-0.95, 0x2a3a5a], [-1.2, 0x6a4a2a], [-1.45, 0x3a3a3a]]) { const coat = add(g, new THREE.CapsuleGeometry(0.13, 0.55, 4, 10), M(c, 0.9), -1.38, 1.3, z); coat.scale.set(0.6, 1, 1); }
    rbox(g, 0.08, 0.6, 0.9, M(0xf0f0ec, 0.4), -1.46, 0.45, -3.6, { r: 0.02 }); for (let i = 0; i < 8; i++) rbox(g, 0.1, 0.55, 0.04, M(0xe8e8e4, 0.4), -1.44, 0.45, -3.95 + i * 0.1, { r: 0.01 });
    rbox(g, 0.04, 0.7, 0.5, M(0x8a6a3a, 0.4), 1.48, 1.6, -0.95, { r: 0.01 }); add(g, new THREE.PlaneGeometry(0.42, 0.62), M(0xb8c8d0, 0.02, { metalness: 0.95 }), 1.455, 1.6, -0.95).rotation.y = -Math.PI / 2;
    for (const [z, y, c] of [[-3.3, 1.7, 0x3a6a8a], [-3.9, 1.85, 0xb06a3a]]) { rbox(g, 0.03, 0.4, 0.32, M(0x2a2420, 0.5), -1.48, y, z, { r: 0.005 }); add(g, new THREE.PlaneGeometry(0.26, 0.34), M(c, 0.8), -1.462, y, z).rotation.y = Math.PI / 2; }
    tube(g, [0, 2.98, -2.0], [0, 2.6, -2.0], 0.006, M(0x222222, 0.5), 4); add(g, new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffd8a0, emissiveIntensity: 2 }), 0, 2.5, -2.0);
    /* the kitchen doorway at the back, glowing */
    rbox(g, 0.9, 2.05, 0.02, EM(0xffe0b0, 0.8), 0.5, 1.03, -4.69, { r: 0.005 }); for (const s of [-1, 1]) rbox(g, 0.06, 2.1, 0.06, white, 0.5 + s * 0.48, 1.05, -4.68, { r: 0.005 });
    { const l = new THREE.PointLight(0xffc890, 6, 7, 1.6); l.position.set(0, 2.3, -2.4); g.add(l); const k = new THREE.PointLight(0xffe0b0, 2.5, 4, 1.6); k.position.set(0.5, 1.5, -4.2); g.add(k); } }
  /* ---- the night: sky with stars, the road behind, a car's lights sweeping past ---- */
  gradSky(g, [[0, "#070c1e"], [0.6, "#121a36"], [1, "#2a3456"]], { z: -40, w: 200, h: 80, y0: -5 });
  { const n = 220, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (rnd() - 0.5) * 160; p[i * 3 + 1] = 9 + rnd() * 30; p[i * 3 + 2] = -38; } const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const st = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, sizeAttenuation: false, fog: false })); noAO(st); g.add(st); }
  D.sweep = new THREE.SpotLight(0xfff0d0, 0, 30, 0.35, 0.6, 1.4); D.sweep.position.set(0, 0.7, 9); D.sweep.target.position.set(0, 1, -1); g.add(D.sweep, D.sweep.target);
  { const l = new THREE.PointLight(0x9fb6ff, 1.5, 10, 1.6); l.position.set(2, 3, 4); g.add(l); }
  bake(g);

  function update(T) {
    for (const m of D.moths) { const a = T * m.w + m.ph; m.m.position.set(0.95 + Math.cos(a) * m.r, 2.22 + Math.sin(a * 1.7) * 0.08 + Math.sin(T * 2 + m.ph) * 0.05, -0.2 + Math.sin(a) * m.r * 0.6); m.m.rotation.set(a, a * 0.7, 0); m.m.scale.x = 0.4 + 0.6 * Math.abs(Math.sin(T * 40 + m.ph)); }
    for (const h of D.hedge) { h.h.rotation.z = 0.03 * Math.sin(T * 1.1 + h.ph); h.h.rotation.x = 0.02 * Math.sin(T * 0.8 + h.ph * 2); }
    for (const c of D.curt) { const p = c.c.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = c.base[i * 3], y = c.base[i * 3 + 1]; p.setZ(i, 0.03 * Math.sin(x * 22 + c.s) + (0.72 - y) * 0.03 * Math.sin(T * 0.9 + c.s)); } p.needsUpdate = true; }
    if (D.nwin) D.nwin.emissive.setHex(Math.sin(T * 0.15 + 1) > 0.2 ? 0xffc890 : 0x000000);
    const u = (T % 11) / 1.6; D.sweep.intensity = u < 1 ? 14 * Math.sin(Math.PI * u) : 0; D.sweep.position.x = -14 + 28 * Math.min(1, u);
  }
  function env(renderer) { return skyEnv(renderer, [[0, "#0d1530"], [0.5, "#2a3456"], [0.56, "#3a2a22"], [1, "#0e0c0a"]], [[0xffc890, 2, 0, 1.5, -3], [0xffd29a, 1, 1, 2, 1]]); }
  return { update, env };
}
