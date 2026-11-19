/* kitchen.js — the kitchen at night, rebuilt to the roof's bar (M2, 2026-11-18; it opens the film, so it is the hook frame).
   Set-local: the table stands at the origin (top y 0.775), the phone lies on it at (0.08, 0.782, 0.05) and buzzes (dyn.phone, moved by
   sets2's update with its screen and light); the counter runs along the back wall z -2.5; the shots look at the table from (1, 1.5, 1.5).
   Layers: boards, the table with a cloth runner, a mug that steams, a plate, the chairs; the counter (cabinets, worktop, tiled
   splashback, a sink with a dripping tap, a kettle, a knife block, jars); wall cabinets; the fridge with notes and magnets; a window
   over the sink onto rain and lit flats across the road; a wall clock; a pendant lamp. Life, a pure function of T: steam from the mug,
   the tap dripping, rain running down the window, the clock's second hand, the pendant turning a little, a window across the road
   going on and off. Story-free. */
import * as THREE from "three";
import { surf, rbox, soft } from "./matkit.js";
import { M, EM, add, noAO, tube, rng, skyEnv, bake, canvasTex, glow, building } from "./setkit.js";

export function buildKitchen(g, dyn) {
  const rnd = rng(42), D = {};
  const floor = surf("wood", { rep: [3, 6], tint: 0x7a5236, rough: 0.6 }), cab = M(0x3d5a6b, 0.55), handle = M(0xc8ccd0, 0.3, { metalness: 0.8 });
  rbox(g, 6, 0.1, 6, floor, 0, -0.05, 0, { r: 0.01 });
  const pap = canvasTex(64, 64, (x) => { x.fillStyle = "#cfc3a8"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#c4b79a"; for (let i = 0; i < 64; i += 8) x.fillRect(0, i, 64, 2); }); pap.wrapS = pap.wrapT = THREE.RepeatWrapping; pap.repeat.set(8, 4);
  const wall = new THREE.MeshStandardMaterial({ map: pap, roughness: 0.9 });
  /* back wall with a window opening over the sink (x 0.9..2.1, y 1.25..2.25) */
  rbox(g, 3.4, 2.7, 0.1, wall, -0.8, 1.35, -2.55, { r: 0.005 }); rbox(g, 0.9, 2.7, 0.1, wall, 2.55, 1.35, -2.55, { r: 0.005 }); rbox(g, 1.2, 1.25, 0.1, wall, 1.5, 0.62, -2.55, { r: 0.005 }); rbox(g, 1.2, 0.45, 0.1, wall, 1.5, 2.48, -2.55, { r: 0.005 });
  rbox(g, 0.1, 2.7, 6, wall, -2.5, 1.35, 0, { r: 0.005 }); add(g, new THREE.PlaneGeometry(6, 6), M(0xe8e2d4, 0.9), 0, 2.69, 0).rotation.x = Math.PI / 2;
  /* the counter: cabinets with handles, a kick plate, the worktop, a tiled splashback */
  rbox(g, 4.4, 0.1, 0.58, M(0x1e2a30, 0.6), 0.4, 0.05, -2.2, { r: 0.005 });
  for (let i = 0; i < 7; i++) { const x = -1.6 + i * 0.6; rbox(g, 0.58, 0.76, 0.04, cab, x, 0.5, -1.92, { r: 0.012 }); rbox(g, 0.18, 0.02, 0.025, handle, x, 0.82, -1.89, { r: 0.008 }); }
  rbox(g, 4.4, 0.85, 0.56, cab, 0.4, 0.48, -2.22, { r: 0.01 }); rbox(g, 4.46, 0.05, 0.64, surf("concrete", { rep: [3, 0.4], tint: 0xe0dcd4, rough: 0.35 }), 0.4, 0.93, -2.2, { r: 0.012 });
  { const pal = ["#1fb5a8", "#f2f0ea", "#e8b020", "#c8643c", "#2f7fd8", "#d8363a", "#7a9a5a"], tt = canvasTex(1024, 64, (x) => { for (let i = 0; i < 64; i++) for (let j = 0; j < 4; j++) { x.fillStyle = "#d8d2c4"; x.fillRect(i * 16, j * 16, 16, 16); x.fillStyle = pal[(i * 3 + j * 5 + (i * j) % 4) % pal.length]; x.fillRect(i * 16 + 1, j * 16 + 1, 14, 14); } });
    rbox(g, 4.4, 0.32, 0.02, new THREE.MeshStandardMaterial({ map: tt, roughness: 0.25 }), 0.4, 1.12, -2.49, { r: 0.004 }); }   /* mixed glazed tiles (V11: the border read as 6-8 colours) */
  /* the sink and the tap (it drips) */
  rbox(g, 0.7, 0.04, 0.45, M(0xb8bcc0, 0.2, { metalness: 0.9 }), 1.5, 0.952, -2.2, { r: 0.02 }); rbox(g, 0.6, 0.02, 0.36, M(0x6a6e74, 0.15, { metalness: 0.9 }), 1.5, 0.94, -2.2, { r: 0.01 });
  tube(g, [1.5, 0.95, -2.42], [1.5, 1.22, -2.42], 0.016, handle, 10); tube(g, [1.5, 1.22, -2.42], [1.5, 1.22, -2.26], 0.014, handle, 10); tube(g, [1.5, 1.22, -2.26], [1.5, 1.16, -2.26], 0.012, handle, 10);
  D.drop = add(g, new THREE.SphereGeometry(0.008, 8, 6), M(0xcfe0ff, 0.05, { metalness: 0.3 }), 1.5, 1.15, -2.26); D.drop.userData.keep = true;
  /* the window: frame, sill, the street across, rain running down */
  { rbox(g, 1.24, 0.06, 0.2, M(0xf0ece4, 0.5), 1.5, 1.24, -2.45, { r: 0.01 }); for (const x of [0.9, 1.5, 2.1]) rbox(g, 0.05, 1.0, 0.06, M(0xf0ece4, 0.5), x, 1.75, -2.52, { r: 0.005 }); rbox(g, 1.24, 0.05, 0.06, M(0xf0ece4, 0.5), 1.5, 2.25, -2.52, { r: 0.005 });
    for (let i = 0; i < 5; i++) building(g, { x: -2 + i * 3, z: -14 - rnd() * 3, w: 2.6, d: 3, top: 3 + rnd() * 6, bottom: -6, seed: 80 + i, lit: 0.5, wall: "#262a3a", glow: 0.9 });
    const sky = add(g, new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ color: 0x141a30, fog: false }), 0, 4, -20); noAO(sky);
    const rt = canvasTex(128, 256, (x, w, h) => { x.clearRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const px = rnd() * w, py = rnd() * h, r = 1 + rnd() * 2.5; x.fillStyle = `rgba(220,230,255,${0.25 + 0.4 * rnd()})`; x.beginPath(); x.ellipse(px, py, r, r * 1.4, 0, 0, 6.3); x.fill(); if (rnd() < 0.3) { x.fillRect(px - 0.6, py, 1.2, 20 + rnd() * 40); } } });
    rt.wrapT = THREE.RepeatWrapping; const rm = add(g, new THREE.PlaneGeometry(1.2, 1.0), new THREE.MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false }), 1.5, 1.75, -2.53); rm.userData.keep = true; noAO(rm); D.rainTex = rt;
    add(g, new THREE.PlaneGeometry(1.2, 1.0), M(0x0a0e16, 0.02, { metalness: 0.6, transparent: true, opacity: 0.25 }), 1.5, 1.75, -2.54); }
  /* on the worktop: a kettle, a knife block, jars, a bowl of fruit, a plant on the sill */
  { const kt = new THREE.Group(); kt.position.set(-0.4, 0.955, -2.25); g.add(kt); add(kt, new THREE.CylinderGeometry(0.09, 0.11, 0.22, 20), M(0xd8363a, 0.3, { metalness: 0.4 }), 0, 0.11, 0); add(kt, new THREE.TorusGeometry(0.07, 0.015, 8, 16, Math.PI), M(0x1a1a1a, 0.5), 0, 0.2, -0.02).rotation.y = Math.PI / 2;
    rbox(g, 0.14, 0.24, 0.12, surf("wood", { rep: [0.3, 0.3], tint: 0x8a6040 }), -1.0, 1.07, -2.32, { r: 0.015, rx: -0.2 }); for (let i = 0; i < 4; i++) tube(g, [-1.04 + i * 0.025, 1.18, -2.34], [-1.04 + i * 0.025, 1.26, -2.37], 0.008, M(0x1a1a1a, 0.4), 5);
    for (let i = 0; i < 3; i++) { add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.14 + 0.03 * i, 14), M(0xe8f0ee, 0.1, { transparent: true, opacity: 0.6 }), -1.45 + i * 0.13, 1.03 + 0.015 * i, -2.35); add(g, new THREE.CylinderGeometry(0.052, 0.052, 0.02, 14), M([0xb08a5a, 0x2a2a2a, 0xd8d0c0][i], 0.6), -1.45 + i * 0.13, 1.11 + 0.03 * i, -2.35); }
    add(g, new THREE.SphereGeometry(0.14, 18, 8, 0, 6.29, 1.6, 1.5), M(0xe8e4da, 0.4, { side: THREE.DoubleSide }), 0.4, 1.09, -2.15); for (let i = 0; i < 5; i++) add(g, new THREE.SphereGeometry(0.04, 12, 8), M([0xf5c400, 0xd8363a, 0x2fbf5a][i % 3], 0.5), 0.36 + (i % 3) * 0.04, 1.0 + 0.02 * (i > 2), -2.16 + (i % 2) * 0.04);
    add(g, new THREE.CylinderGeometry(0.06, 0.05, 0.1, 12), M(0xc8643c, 0.8), 1.95, 1.32, -2.45); for (let i = 0; i < 7; i++) { const l = add(g, new THREE.SphereGeometry(0.04, 8, 6), M(0x2f7a3a, 0.8), 1.95 + (rnd() - 0.5) * 0.12, 1.42 + rnd() * 0.08, -2.45 + (rnd() - 0.5) * 0.08); l.scale.set(1, 0.4, 1.6); } }
  /* wall cabinets with a light strip under them */
  for (let i = 0; i < 2; i++) { const x = -1.3 + i * 0.75; rbox(g, 0.72, 0.7, 0.34, cab, x, 1.95, -2.32, { r: 0.01 }); rbox(g, 0.02, 0.16, 0.025, handle, x + 0.28, 1.72, -2.14, { r: 0.008 }); }
  rbox(g, 0.6, 0.7, 0.34, cab, 2.75, 1.95, -2.32, { r: 0.01 }); rbox(g, 1.5, 0.012, 0.04, EM(0xfff0d8, 1.5), -0.95, 1.595, -2.22, { r: 0.004 });
  /* the fridge with notes */
  { rbox(g, 0.8, 1.9, 0.7, M(0xe6e6e3, 0.3, { metalness: 0.2 }), -1.95, 0.95, -2.05, { r: 0.03 }); rbox(g, 0.03, 0.4, 0.03, handle, -1.62, 1.35, -1.69, { r: 0.01 }); rbox(g, 0.03, 0.3, 0.03, handle, -1.62, 0.6, -1.69, { r: 0.01 }); rbox(g, 0.78, 0.01, 0.01, M(0x9a9a98, 0.5), -1.95, 1.05, -1.695, { r: 0.002 });
    for (let i = 0; i < 6; i++) { const n = add(g, new THREE.PlaneGeometry(0.12 + 0.05 * rnd(), 0.1 + 0.06 * rnd()), M([0xfff4a0, 0xf2f0ea, 0xa8d8f0, 0xf0b8c8][i % 4], 0.9), -2.15 + (i % 3) * 0.17, 1.25 + Math.floor(i / 3) * 0.2 + rnd() * 0.04, -1.694); n.rotation.z = (rnd() - 0.5) * 0.2; add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10), M([0xd8363a, 0x2f7fd8, 0xf5c400][i % 3], 0.5), n.position.x, n.position.y + 0.04, -1.688).rotation.x = Math.PI / 2; } }
  /* the table, a runner, the mug that steams, a plate, the chairs */
  { const tw = surf("wood", { rep: [1, 0.6], tint: 0x6a4428, rough: 0.55 }); rbox(g, 1.4, 0.05, 0.8, tw, 0, 0.75, 0, { r: 0.012 }); for (const [lx, lz] of [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]]) rbox(g, 0.05, 0.73, 0.05, tw, lx, 0.365, lz, { r: 0.008 });
    rbox(g, 1.42, 0.004, 0.3, new THREE.MeshStandardMaterial({ map: canvasTex(256, 32, (x) => { ["#b8302a", "#e8c070", "#2a4a6a", "#f2ede2"].forEach((c, i) => { x.fillStyle = c; for (let k = i; k < 16; k += 4) x.fillRect(k * 16, 0, 16, 32); }); }), roughness: 0.95 }), 0, 0.777, -0.2, { r: 0.002 });   /* a striped runner */
    add(g, new THREE.CylinderGeometry(0.045, 0.04, 0.1, 16), M(0xd8363a, 0.4), -0.35, 0.83, 0.12); add(g, new THREE.TorusGeometry(0.028, 0.008, 6, 12), M(0xd8363a, 0.4), -0.3, 0.83, 0.12).rotation.y = 0.3;
    add(g, new THREE.CylinderGeometry(0.039, 0.039, 0.004, 16), M(0x3a2010, 0.15), -0.35, 0.875, 0.12);
    add(g, new THREE.CylinderGeometry(0.12, 0.1, 0.02, 24), M(0xf0ece4, 0.3), 0.45, 0.787, -0.15); add(g, new THREE.CylinderGeometry(0.08, 0.08, 0.004, 20), M(0xc8a070, 0.7), 0.45, 0.8, -0.15);
    rbox(g, 0.18, 0.003, 0.24, M(0xf4f0e6, 0.9), -0.15, 0.778, 0.22, { r: 0.002, ry: 0.4 }); tube(g, [-0.2, 0.781, 0.2], [-0.05, 0.781, 0.26], 0.004, M(0x1a3a8a, 0.4), 5);
    const cw = surf("wood", { rep: [0.4, 0.4], tint: 0x7a5236 }); for (const [cx, cz, r] of [[-0.95, 0.1, 1.57], [0.3, -0.75, 0]]) { const c = new THREE.Group(); c.position.set(cx, 0, cz); c.rotation.y = r; g.add(c); rbox(c, 0.42, 0.05, 0.42, cw, 0, 0.46, 0, { r: 0.01 }); rbox(c, 0.42, 0.5, 0.04, cw, 0, 0.75, -0.2, { r: 0.01 }); for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) rbox(c, 0.035, 0.45, 0.035, cw, a, 0.22, b, { r: 0.006 }); }
    const sm = new THREE.SpriteMaterial({ map: soft(), color: 0xdfe4ea, transparent: true, opacity: 0, depthWrite: false }); D.steam = []; for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(sm.clone()); s.userData.keep = true; noAO(s); g.add(s); D.steam.push({ s, ph: i / 6 }); } }
  /* the phone (sets2 buzzes it) */
  { const ph = new THREE.Group(); ph.position.set(0.08, 0.782, 0.05); ph.rotation.y = 0.35; ph.userData.keep = true; g.add(ph);
    rbox(ph, 0.078, 0.009, 0.158, M(0x17171c, 0.3), 0, 0, 0, { r: 0.004 }); const scr = add(ph, new THREE.BoxGeometry(0.07, 0.002, 0.148), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xbfe4ff, emissiveIntensity: 1.4, roughness: 0.6 }), 0, 0.0055, 0);
    dyn.phone = ph; dyn.phoneScreen = scr; const pl = new THREE.PointLight(0xa8dcff, 2.5, 4, 1.6); pl.position.set(0.08, 0.95, 0.05); g.add(pl); dyn.phoneLight = pl;
    const cg = add(g, new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: soft(), color: 0xa8dcff, transparent: true, opacity: 0.3, depthWrite: false }), 0.08, 2.68, 0.05); cg.rotation.x = Math.PI / 2; noAO(cg); cg.userData.keep = true; dyn.ceilGlow = cg; }
  /* the clock, the pendant lamp, a calendar */
  { const ck = new THREE.Group(); ck.position.set(-2.44, 2.05, -0.8); ck.rotation.y = Math.PI / 2; g.add(ck); add(ck, new THREE.CylinderGeometry(0.16, 0.16, 0.03, 28), M(0xf4f4f0, 0.5), 0, 0, 0).rotation.x = Math.PI / 2; add(ck, new THREE.TorusGeometry(0.16, 0.014, 8, 28), M(0x2a2a2e, 0.5), 0, 0, 0.015);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; rbox(ck, 0.006, 0.02, 0.004, M(0x2a2a2e, 0.5), Math.sin(a) * 0.13, Math.cos(a) * 0.13, 0.018, { r: 0.001, rz: -a }); }
    rbox(ck, 0.008, 0.08, 0.004, M(0x1a1a1a, 0.5), 0.03, 0.03, 0.02, { r: 0.002, rz: -0.8 }); const sh = new THREE.Group(); sh.position.z = 0.024; sh.userData.keep = true; ck.add(sh); add(sh, new THREE.BoxGeometry(0.004, 0.13, 0.002), M(0xd8363a, 0.5), 0, 0.05, 0); D.sec = sh;
    const pd = new THREE.Group(); pd.position.set(-0.25, 2.69, 0); pd.userData.keep = true; g.add(pd); tube(pd, [0, 0, 0], [0, -0.55, 0], 0.004, M(0x222222, 0.5), 4); add(pd, new THREE.ConeGeometry(0.2, 0.18, 24, 1, true), M(0x2a4a3a, 0.5, { side: THREE.DoubleSide }), 0, -0.6, 0); add(pd, new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc27a, emissiveIntensity: 2.4 }), 0, -0.66, 0); D.pend = pd;
    const cal = add(g, new THREE.PlaneGeometry(0.3, 0.42), new THREE.MeshStandardMaterial({ map: canvasTex(64, 96, (x) => { x.fillStyle = "#f4f0e6"; x.fillRect(0, 0, 64, 96); x.fillStyle = "#3a6a8a"; x.fillRect(0, 0, 64, 40); x.fillStyle = "#8a8a8a"; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) x.fillRect(6 + i * 11, 48 + j * 11, 8, 8); }), roughness: 0.9 }), -2.44, 1.55, 0.6); cal.rotation.y = Math.PI / 2; }
  { const l = new THREE.PointLight(0xffc27a, 2.2, 7, 1.6); l.position.set(-0.25, 1.95, 0); g.add(l); const w = new THREE.PointLight(0x6f86c9, 2, 6, 1.6); w.position.set(1.4, 1.6, -1.6); g.add(w); }
  bake(g);

  function update(T) {
    for (const st of D.steam) { const u = (T * 0.45 + st.ph) % 1; st.s.position.set(-0.35 + 0.03 * Math.sin(T * 2 + st.ph * 9), 0.9 + 0.35 * u, 0.12 + 0.02 * Math.cos(T * 1.7 + st.ph * 7)); st.s.scale.setScalar(0.04 + 0.12 * u); st.s.material.opacity = 0.28 * Math.sin(Math.PI * u); }
    const d = T % 1.7, f = d > 1.4 ? (d - 1.4) / 0.3 : 0; D.drop.position.y = 1.15 - 0.2 * f * f; D.drop.scale.setScalar(d < 1.4 ? 0.4 + 0.6 * d / 1.4 : 1);
    D.rainTex.offset.y = -T * 0.12;
    D.sec.rotation.z = -Math.floor(T) * Math.PI / 30;
    D.pend.rotation.z = 0.02 * Math.sin(T * 0.7); D.pend.rotation.y = 0.2 * Math.sin(T * 0.3);
  }
  function env(renderer) { return skyEnv(renderer, [[0, "#2a2620"], [0.5, "#4a3a2a"], [1, "#14100c"]], [[0xffc27a, 2, -0.5, 6, 0], [0x6f86c9, 3, 4, 3, -12]]); }
  return { update, env };
}
