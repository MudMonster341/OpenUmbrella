/* site.js — the building site at dusk, rebuilt to the roof's bar (M2, 2026-11-18). Set-local: the scaffold stands in front of a
   concrete frame, standards at x -4..4 (every 1.6) on z -2.1 and -1.1, lifts at y 2.0 / 4.2 / 6.2; the loose board is hinged at
   (-0.78, 4.25, -1.6) (dyn.plank, rocked by sets2's update); the worker stands on the second lift; they walk along z 1.0 below.
   Shots look up from the ground (z 2.2..2.6).
   Layers: churned mud with ruts and puddles; the scaffold (galvanised tubes, couplers, braces, boards, toe boards, guard rails, a
   ladder, netting at the ends); the frame (slabs, columns, rebar, half-built blockwork, a polythene sheet); a mixer, a barrow, sand,
   blocks on a pallet, a skip, hoardings; a work light on a tripod; a site cabin; a tower crane; the city beyond; a dusk sky. Life, a
   pure function of T: the mixer turns, the crane slews and its hook swings, the warning lamp blinks, the polythene and the netting
   move in the wind, the work light buzzes, birds. Story-free. */
import * as THREE from "three";
import { surf, rbox } from "./matkit.js";
import { M, EM, add, noAO, tube, rng, gradSky, skyEnv, bake, canvasTex, glow, building } from "./setkit.js";

export function buildSite(g, dyn) {
  const rnd = rng(523), D = {};
  /* ---- ground ---- */
  rbox(g, 70, 0.2, 60, surf("mud", { rep: [14, 12], size: 512 }), 0, -0.1, -4, { r: 0.02 });
  for (const [x, z, r] of [[-1.8, 2.2, 0.6], [2.6, 0.4, 0.45], [-3.6, -0.3, 0.5], [4.2, 2.8, 0.7]]) { const p = add(g, new THREE.CircleGeometry(r, 28), M(0x2a2a2a, 0.05, { metalness: 0.3 }), x, 0.006, z); p.rotation.x = -Math.PI / 2; p.scale.set(1.6, 1, 1); }
  /* ---- the frame: three slabs, columns, rebar, blockwork, polythene ---- */
  const conc = surf("concrete", { rep: [5, 2.5], tint: 0xa8a49c }), col = surf("concrete", { rep: [0.3, 3], tint: 0x9c988e }), steel = M(0x5a3a2a, 0.7, { metalness: 0.4 });
  for (const y of [0, 3, 6]) { rbox(g, 10.4, 0.25, 5, conc, 0, y + 0.12, -4.8, { r: 0.02 }); if (y) rbox(g, 10.6, 0.3, 0.04, surf("wood", { rep: [6, 0.3], tint: 0x9a7a50 }), 0, y + 0.12, -2.28, { r: 0.005 }); }
  for (let cx = -4.5; cx <= 4.51; cx += 3) for (const cz of [-2.6, -7]) { rbox(g, 0.3, 6.2, 0.3, col, cx, 3.1, cz, { r: 0.01 }); for (const [a, b] of [[-0.08, -0.08], [0.08, -0.08], [-0.08, 0.08], [0.08, 0.08]]) tube(g, [cx + a, 6.2, cz + b], [cx + a * 1.4, 7.0 + 0.1 * rnd(), cz + b * 1.4], 0.012, steel, 5); }
  rbox(g, 10.4, 6.4, 0.2, surf("brick", { rep: [5, 5], tint: 0x9a968e }), 0, 3.2, -7.2, { r: 0.02 });
  { const blk = surf("brick", { rep: [1.6, 1.4], tint: 0xb8b4aa }); rbox(g, 2.9, 1.8, 0.2, blk, -3.0, 4.15, -3.4, { r: 0.01 }); rbox(g, 1.6, 1.1, 0.2, blk, 1.6, 3.8, -3.4, { r: 0.01 }); for (let i = 0; i < 6; i++) rbox(g, 0.44, 0.21, 0.2, blk, 2.5 + (i % 3) * 0.45, 3.35 + Math.floor(i / 3) * 0.22, -3.0 - 0.3 * (i % 2), { r: 0.01 }); }
  { const pg = new THREE.PlaneGeometry(3.6, 2.6, 16, 10), pm = new THREE.MeshStandardMaterial({ color: 0xdfe8ee, roughness: 0.35, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const poly = add(g, pg, pm, -2.9, 1.55, -2.75); poly.userData.keep = true; noAO(poly); D.poly = { m: poly, base: Float32Array.from(pg.attributes.position.array) }; }
  for (let i = 0; i < 5; i++) rbox(g, 2.44, 0.02, 1.22, surf("wood", { rep: [1, 0.6], tint: 0xc8a070 }), 3.4, 3.27 + i * 0.022, -4.4, { r: 0.004 });
  /* ---- the scaffold ---- */
  const galv = M(0x9aa2ab, 0.35, { metalness: 0.75 }), cpl = M(0x6a7076, 0.4, { metalness: 0.7 }), board = surf("wood", { rep: [1.2, 0.5], tint: 0xb08a5a }), toe = surf("wood", { rep: [3, 0.2], tint: 0x9a7448 });
  for (let px = -4; px <= 4.01; px += 1.6) for (const pz of [-2.1, -1.1]) { tube(g, [px, 0, pz], [px, 7.6, pz], 0.024, galv, 8); rbox(g, 0.15, 0.01, 0.15, cpl, px, 0.005, pz, { r: 0.003 }); rbox(g, 0.22, 0.04, 0.14, surf("wood", { rep: [0.2, 0.2] }), px, 0.02, pz, { r: 0.005 }); }
  for (const y of [2.0, 4.2, 6.2]) { for (const pz of [-2.1, -1.1]) tube(g, [-4.2, y, pz], [4.2, y, pz], 0.024, galv, 8);
    for (let px = -4; px <= 4.01; px += 1.6) { tube(g, [px, y + 0.03, -2.25], [px, y + 0.03, -0.95], 0.022, galv, 8); for (const pz of [-2.1, -1.1]) rbox(g, 0.08, 0.09, 0.08, cpl, px, y, pz, { r: 0.01 }); }
    tube(g, [-4.2, y + 1.0, -1.1], [4.2, y + 1.0, -1.1], 0.022, galv, 8); tube(g, [-4.2, y + 0.5, -1.1], [4.2, y + 0.5, -1.1], 0.022, galv, 8);
    if (y < 6) rbox(g, 8.2, 0.15, 0.03, toe, 0, y + 0.13, -1.06, { r: 0.004 }); }
  for (let bx = -3.2; bx <= 3.21; bx += 1.6) for (const y of [2.0, 4.2]) if (!(y === 4.2 && Math.abs(bx) < 0.1)) for (let k = 0; k < 4; k++) rbox(g, 1.56, 0.04, 0.22, board, bx, y + 0.07, -1.95 + k * 0.23, { r: 0.006 });
  for (const [a, b] of [[[-4, 0.1, -1.1], [-0.8, 4.2, -1.1]], [[0.8, 0.1, -1.1], [4, 4.2, -1.1]], [[-2.4, 4.2, -1.1], [0.8, 7.4, -1.1]]]) tube(g, a, b, 0.022, galv, 8);
  { const lx = 3.2, lz = -1.55; for (const s of [-0.22, 0.22]) tube(g, [lx + s, 0, lz + 0.15], [lx + s, 3.1, lz - 0.05], 0.025, M(0xb08a5a, 0.8), 6); for (let i = 1; i < 11; i++) tube(g, [lx - 0.22, i * 0.28, lz + 0.15 - i * 0.018], [lx + 0.22, i * 0.28, lz + 0.15 - i * 0.018], 0.016, M(0xb08a5a, 0.8), 6); }
  { const pv = new THREE.Group(); pv.position.set(-0.78, 4.25, -1.6); pv.userData.keep = true; g.add(pv);
    const pb = surf("wood", { rep: [1.2, 0.5], tint: 0xc89a62 }); for (let k = 0; k < 4; k++) rbox(pv, 1.55, 0.04, 0.22, pb, 0.775, 0, -0.35 + k * 0.23, { r: 0.006 }); dyn.plank = pv; }   /* the board that gives way, hinged at its far end */
  { const nt = canvasTex(64, 64, (x) => { x.strokeStyle = "rgba(40,110,170,0.85)"; x.lineWidth = 2; for (let i = 0; i <= 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); } });
    nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(4, 22); D.net = [];
    for (const s of [-1, 1]) { const ng = new THREE.PlaneGeometry(1.2, 7.4, 6, 20), m = add(g, ng, new THREE.MeshStandardMaterial({ map: nt, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9, alphaTest: 0.05 }), s * 4.15, 3.75, -1.6); m.rotation.y = Math.PI / 2; m.userData.keep = true; noAO(m); D.net.push({ m, base: Float32Array.from(ng.attributes.position.array), s }); } }
  /* festoon lamps strung along the guard rails (a site at dusk is lit by its own lamps; the first stills read as murk) */
  D.bulbs = []; { const bm = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffd8a0, emissiveIntensity: 2.6 });
    for (const y of [2.0, 4.2]) { const pts = []; for (let i = 0; i <= 32; i++) { const u = i / 32, x = -4 + 8 * u; pts.push([x, y + 1.0 - 0.18 * Math.abs(Math.sin(Math.PI * 4 * u)), -0.98]); }
      for (let i = 0; i < 32; i++) tube(g, pts[i], pts[i + 1], 0.004, M(0x1a1a1a, 0.6), 3);
      for (let i = 2; i < 32; i += 4) { add(g, new THREE.SphereGeometry(0.045, 10, 8), bm, pts[i][0], pts[i][1] - 0.06, pts[i][2]); D.bulbs.push(glow(g, 0xffc88a, 0.5, pts[i][0], pts[i][1] - 0.06, pts[i][2] + 0.02, 0.55)); }
      for (const x of [-2.4, 2.4]) { const l = new THREE.PointLight(0xffc88a, 3.5, 6, 1.6); l.position.set(x, y + 0.8, -0.6); g.add(l); } } }
  { const fl = new THREE.SpotLight(0xe8f0ff, 30, 22, 0.55, 0.6, 1.2); fl.position.set(5.5, 0.6, 4.5); fl.target.position.set(0, 4, -2.5); g.add(fl, fl.target); }   /* a floodlight on the ground lifting the scaffold */
  /* ---- props on the ground ---- */
  { const mx = new THREE.Group(); mx.position.set(-4.9, 0, 0.6); mx.rotation.y = 0.5; g.add(mx); const orange = M(0xe8721a, 0.45), dk = M(0x2a2a2e, 0.6);
    rbox(mx, 1.2, 0.12, 0.7, dk, 0, 0.45, 0, { r: 0.02 }); for (const s of [-1, 1]) { const w = add(mx, new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16), dk, -0.3, 0.22, s * 0.38); w.rotation.x = Math.PI / 2; }
    const drum = new THREE.Group(); drum.position.set(0.15, 0.95, 0); drum.rotation.z = -0.55; drum.userData.keep = true; mx.add(drum);
    add(drum, new THREE.CylinderGeometry(0.28, 0.42, 0.55, 18), orange, 0, 0, 0); add(drum, new THREE.CylinderGeometry(0.42, 0.3, 0.3, 18), orange, 0, -0.42, 0); add(drum, new THREE.CylinderGeometry(0.2, 0.28, 0.12, 18, 1, true), dk, 0, 0.33, 0);
    for (let i = 0; i < 6; i++) { const f = add(drum, new THREE.BoxGeometry(0.03, 0.5, 0.06), M(0xc05a14, 0.5), Math.cos(i) * 0.36, -0.05, Math.sin(i) * 0.36); f.rotation.y = -i; } D.drum = drum; }
  { const wb = new THREE.Group(); wb.position.set(2.0, 0, 1.9); wb.rotation.y = -0.7; g.add(wb); const grn = M(0x2a6a3a, 0.4, { metalness: 0.3 });
    const tray = add(wb, new THREE.CylinderGeometry(0.42, 0.3, 0.3, 4, 1, true), grn, 0, 0.55, 0); tray.rotation.y = Math.PI / 4; tray.scale.set(1.3, 1, 0.9); rbox(wb, 0.6, 0.05, 0.45, M(0x6a6a64, 0.95), 0, 0.62, 0, { r: 0.02 });
    const wh = add(wb, new THREE.TorusGeometry(0.15, 0.05, 8, 16), M(0x1a1a1a, 0.8), 0.62, 0.2, 0); for (const s of [-1, 1]) tube(wb, [0.6, 0.2, 0], [-0.8, 0.6, s * 0.25], 0.018, galv, 6); void wh; }
  { const sand = add(g, new THREE.ConeGeometry(1.1, 0.75, 22), surf("concrete", { rep: [2, 2], tint: 0xc8a878 }), 4.6, 0.37, -0.2); sand.scale.set(1, 1, 0.8);
    const pal = surf("wood", { rep: [0.8, 0.4], tint: 0x9a7a50 }), blk = M(0xb4b0a6, 0.95); rbox(g, 1.2, 0.14, 1.0, pal, -2.2, 0.07, -0.25, { r: 0.01 });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) rbox(g, 0.44, 0.21, 0.21, blk, -2.55 + j * 0.45 + (k % 2) * 0.1, 0.25 + i * 0.22, -0.48 + k * 0.42, { r: 0.008 }); }
  { const sk = new THREE.Group(); sk.position.set(7.5, 0, -2.5); g.add(sk); const yel = M(0xe8b020, 0.5, { metalness: 0.3 });
    rbox(sk, 3.6, 1.5, 1.9, yel, 0, 0.75, 0, { r: 0.04 }); rbox(sk, 3.4, 0.1, 1.7, M(0x3a3430, 0.95), 0, 1.4, 0, { r: 0.02 }); for (let i = 0; i < 8; i++) rbox(sk, 0.5 + rnd(), 0.08, 0.2, M([0x9a7a50, 0x8a8a86, 0x5a5a5e][i % 3], 0.9), -1.2 + rnd() * 2.4, 1.5 + rnd() * 0.25, -0.6 + rnd() * 1.2, { r: 0.01, ry: rnd() * 3, rz: (rnd() - 0.5) * 0.6 }); }
  { const ho = surf("wood", { rep: [3, 1], tint: 0xd8d0b8 }); for (const hx of [-6.2, 6.2]) rbox(g, 0.06, 2.2, 9, ho, hx, 1.1, 1.0, { r: 0.01 }); }
  /* the work light on its tripod (the set's key practical) */
  { const tp = new THREE.Group(); tp.position.set(-3.5, 0, -0.4); g.add(tp); for (let i = 0; i < 3; i++) { const a = i * 2.1; tube(tp, [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5], [0, 1.6, 0], 0.015, M(0xe8b020, 0.5), 6); }
    tube(tp, [0, 1.6, 0], [0, 2.5, 0], 0.02, M(0x2a2a2e, 0.5), 6); rbox(tp, 0.5, 0.35, 0.25, M(0x2b2f38, 0.5, { metalness: 0.4 }), 0, 2.6, 0.05, { r: 0.03 }); D.lamp = add(tp, new THREE.PlaneGeometry(0.42, 0.27), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff0d0, emissiveIntensity: 3 }), 0, 2.6, 0.181); D.lamp.userData.keep = true;
    D.halo = glow(tp, 0xfff0d0, 2.2, 0, 2.6, 0.3, 0.6); D.key = new THREE.PointLight(0xfff0d0, 9, 14, 1.6); D.key.position.set(0.1, 2.8, 0.6); tp.add(D.key); }
  /* the site cabin with a lit window */
  { const cb = new THREE.Group(); cb.position.set(-9.5, 0, -4); g.add(cb); rbox(cb, 4.5, 2.6, 2.4, M(0x2a5a8a, 0.6), 0, 1.4, 0, { r: 0.04 }); for (const s of [-1.2, 1.2]) rbox(cb, 0.3, 0.12, 2.5, M(0x2a2a2e, 0.7), s, 0.06, 0, { r: 0.01 });
    rbox(cb, 1.2, 0.8, 0.05, EM(0xffd08a, 1.2), 0.8, 1.7, 1.21, { r: 0.01 }); const l = new THREE.PointLight(0xffd08a, 2, 5, 1.6); l.position.set(0.8, 1.7, 1.8); cb.add(l); }
  /* ---- the tower crane ---- */
  { const cr = new THREE.Group(); cr.position.set(14, 0, -26); g.add(cr); const yel = M(0xe8b020, 0.5, { metalness: 0.3 });
    const lat = canvasTex(64, 64, (x) => { x.strokeStyle = "#e8b020"; x.lineWidth = 6; x.strokeRect(3, 3, 58, 58); x.beginPath(); x.moveTo(3, 3); x.lineTo(61, 61); x.stroke(); }); lat.wrapS = lat.wrapT = THREE.RepeatWrapping;
    const towerM = new THREE.MeshStandardMaterial({ map: lat, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6 }); lat.repeat.set(1, 18);
    for (let i = 0; i < 4; i++) { const f = add(cr, new THREE.PlaneGeometry(1.6, 30), towerM, 0, 15, 0); f.rotation.y = i * Math.PI / 2; f.translateZ(0.8); }
    const jib = new THREE.Group(); jib.position.y = 30.5; jib.userData.keep = true; cr.add(jib); const jm = towerM.clone(); jm.map = lat.clone(); jm.map.repeat.set(24, 1); jm.map.needsUpdate = true;
    for (const z of [-0.5, 0.5]) add(jib, new THREE.PlaneGeometry(40, 1.2), jm, 10, 0, z); rbox(jib, 6, 1.4, 1.6, M(0x5a5a5e, 0.7), -10, -0.3, 0, { r: 0.05 }); rbox(jib, 2.2, 2.0, 2.0, yel, 0.5, -1.5, 0, { r: 0.05 });
    D.lampR = add(jib, new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a }), 29, 0.8, 0); D.lampG = glow(jib, 0xff2a1a, 3, 29, 0.8, 0, 0.8);
    const trol = new THREE.Group(); trol.position.set(18, -0.7, 0); jib.add(trol); D.hook = new THREE.Group(); trol.add(D.hook); tube(D.hook, [0, 0, 0], [0, -12, 0], 0.03, M(0x1a1a1a, 0.5), 4); rbox(D.hook, 0.6, 0.6, 0.6, yel, 0, -12.3, 0, { r: 0.05 }); D.jib = jib; }
  /* the city beyond, lit windows coming on */
  for (let i = 0; i < 12; i++) building(g, { x: -40 + i * 7.5 + rnd() * 2, z: -40 - rnd() * 15, w: 6 + rnd() * 4, d: 6, top: 8 + rnd() * 18, bottom: -1, seed: 60 + i, lit: 0.35, wall: "#3a3040", glow: 0.75 });
  gradSky(g, [[0, "#2c2a4a"], [0.5, "#7a4a6a"], [0.8, "#d8806a"], [1, "#f0a070"]], { z: -75, w: 300, h: 110, y0: -5 });
  { const bgeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.3, 0.06, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.3, 0.06, 0)]); D.birds = [];
    for (let i = 0; i < 7; i++) { const b = new THREE.Line(bgeo, new THREE.LineBasicMaterial({ color: 0x241c28 })); b.userData.keep = true; noAO(b); g.add(b); D.birds.push({ b, k: i }); } }
  { const l = new THREE.PointLight(0xffc89a, 2.5, 12, 1.6); l.position.set(1.5, 1.5, 2.5); g.add(l); }
  bake(g);

  function update(T) {
    D.drum.rotation.y = T * 2.4;
    D.jib.rotation.y = 0.5 + 0.12 * Math.sin(T * 0.08); D.hook.rotation.z = 0.04 * Math.sin(T * 0.9); D.hook.rotation.x = 0.03 * Math.sin(T * 0.7 + 1);
    const bl = (T % 1.5) < 0.5; D.lampR.material.color.setHex(bl ? 0xff2a1a : 0x3a0a08); D.lampG.material.opacity = bl ? 0.8 : 0.05;
    { const p = D.poly.m.geometry.attributes.position, b = D.poly.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1], hang = (1.3 - y) / 2.6; p.setZ(i, hang * hang * 0.35 * (0.6 * Math.sin(T * 2.1 + x * 1.7) + 0.4 * Math.sin(T * 3.7 + x * 3.1 + y))); } p.needsUpdate = true; }
    for (const n of D.net) { const p = n.m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = n.base[i * 3], y = n.base[i * 3 + 1]; p.setZ(i, 0.06 * Math.sin(T * 1.6 + y * 0.9 + n.s) * (0.6 + x)); } p.needsUpdate = true; }
    const hum = 0.92 + 0.08 * Math.sin(T * 100) * Math.sin(T * 13); D.lamp.material.emissiveIntensity = 3 * hum; D.key.intensity = 9 * hum;
    D.bulbs.forEach((b, i) => { b.material.opacity = 0.45 + 0.12 * Math.sin(T * 1.3 + i * 1.7); });
    for (const { b, k } of D.birds) { const u = ((T * 0.05 + k * 0.015) % 1); b.position.set(-50 + 100 * u + (k % 3) * 1.4, 18 + (k % 4) * 1.1 + Math.sin(T * 0.6 + k) * 0.6, -35 + (k % 5) * 2); b.scale.set(1, 1 + 1.6 * Math.sin(T * 8 + k), 1); }
  }
  function env(renderer) { return skyEnv(renderer, [[0, "#2c2a4a"], [0.45, "#a0607a"], [0.55, "#e89a6a"], [0.6, "#3a2a22"], [1, "#16120e"]], [[0xfff0d0, 2.5, -6, 3, 4]]); }
  return { update, env };
}
