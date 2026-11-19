/* aisle.js — the supermarket aisle, rebuilt to the roof's bar (M2, 2026-11-18). Set-local: the aisle runs along z (floor x -2.5..2.5),
   gondolas at x ±1.6..1.9 from z -8 to 5, the spill at (0.25, -1.9), the cross aisle and the freezers at the far end (z -10..-14).
   Layers: polished tiles that mirror the light strips; gondolas with uprights, price rails, kick plates and stock of three kinds (cartons,
   cans, bottles) with gaps where it has sold; ceiling tiles, continuous light lines, a hanging aisle sign, promotion danglers; an end-cap
   display and a parked trolley; the cross aisle, the freezer wall glowing cold, a far wall with a clock. Life, a pure function of T:
   the danglers turn on their threads, the aisle sign swings a little, one light line flickers far off, freezer glass glints, a trolley
   crosses the far aisle, the clock's second hand. Story-free (the sign words are generic). */
import * as THREE from "three";
import { surf, rbox } from "./matkit.js";
import { M, EM, add, noAO, tube, rng, skyEnv, bake, canvasTex, signTex } from "./setkit.js";

export function buildAisle(g, dyn) {
  const rnd = rng(313), D = {};
  /* ---- floor, ceiling ---- */
  rbox(g, 5.2, 0.2, 30, surf("tile", { rep: [1.1, 6.3], size: 512, tint: 0xd8d4cc, rough: 0.55 }), 0, -0.1, -3, { r: 0.01 });
  for (const s of [-1, 1]) rbox(g, 6, 0.2, 30, surf("tile", { rep: [1.3, 6.3], tint: 0xc8c4bc, rough: 0.6 }), s * 5.6, -0.1, -3, { r: 0.01 });
  add(g, new THREE.PlaneGeometry(16, 30), surf("tile", { rep: [4, 7.5], tint: 0xb8b8b4, bump: 0.3 }), 0, 3.3, -3).rotation.x = Math.PI / 2;
  for (const x of [-0.9, 0.9]) { rbox(g, 0.12, 0.05, 26, EM(0xfffaf0, 2.4), x, 3.26, -2, { r: 0.02 }); rbox(g, 0.18, 0.04, 26, M(0xd0d0d0, 0.4, { metalness: 0.5 }), x, 3.29, -2, { r: 0.01 }); }
  D.flick = rbox(g, 0.12, 0.05, 6, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, emissive: 0xfffaf0, emissiveIntensity: 2.4 }), 0, 3.26, -12.5, { r: 0.02 }); D.flick.userData.keep = true;   /* far cross-aisle line: it flickers */
  tube(g, [-2.4, 3.1, -16], [-2.4, 3.1, 10], 0.03, M(0xb02a2a, 0.5), 8); for (let z = -14; z < 10; z += 3) add(g, new THREE.CylinderGeometry(0.02, 0.035, 0.06, 8), M(0xc0c0c0, 0.3, { metalness: 0.8 }), -2.4, 3.05, z);
  add(g, new THREE.SphereGeometry(0.09, 16, 8, 0, 6.29, 0, 1.6), M(0x16161a, 0.1, { metalness: 0.4 }), 0.6, 3.27, 1.2).rotation.x = Math.PI;   /* a CCTV dome */
  /* ---- the gondolas: back panel, uprights, shelves with price rails, kick plate ---- */
  const steel = M(0xd9dcdf, 0.45, { metalness: 0.4 }), dark = M(0x121416, 0.6, { metalness: 0.2 });   /* kick plates near black: the aisle had no true blacks (V13) */
  const rail = canvasTex(512, 32, (x, w, h) => { x.fillStyle = "#f4f4f0"; x.fillRect(0, 0, w, h); for (let i = 0; i < 18; i++) { const px = 8 + i * 28 + (i % 3) * 3; x.fillStyle = i % 5 === 0 ? "#f5c400" : "#ffffff"; x.fillRect(px, 5, 20, 22); x.fillStyle = "#222"; x.fillRect(px + 3, 12, 12, 3); x.fillRect(px + 3, 18, 8, 3); } });
  rail.wrapS = THREE.RepeatWrapping; rail.repeat.set(6, 1); const railM = new THREE.MeshStandardMaterial({ map: rail, roughness: 0.5 });
  const peg = canvasTex(64, 64, (x) => { x.fillStyle = "#e8e8e4"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#9a9a96"; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(8 + i * 16, 8 + j * 16, 2.2, 0, 6.3); x.fill(); } });
  peg.wrapS = peg.wrapT = THREE.RepeatWrapping; peg.repeat.set(26, 4); const pegM = new THREE.MeshStandardMaterial({ map: peg, roughness: 0.7 });
  const SH = [0.14, 0.6, 1.06, 1.52, 1.98];
  for (const s of [-1, 1]) {
    rbox(g, 0.06, 2.2, 13.2, pegM, s * 1.9, 1.1, -1.5, { r: 0.01 }); rbox(g, 0.5, 0.14, 13.2, dark, s * 1.66, 0.07, -1.5, { r: 0.01 });
    for (let z = -8; z <= 5.01; z += 1.3) rbox(g, 0.06, 2.24, 0.05, steel, s * 1.86, 1.12, z, { r: 0.01 });
    for (const y of SH) { rbox(g, 0.5, 0.025, 13.2, steel, s * 1.66, y, -1.5, { r: 0.008 }); const r = add(g, new THREE.PlaneGeometry(13.2, 0.04), railM, s * 1.405, y - 0.005, -1.5); r.rotation.y = s * -Math.PI / 2; }
    rbox(g, 0.52, 0.04, 13.2, steel, s * 1.66, 2.22, -1.5, { r: 0.01 });
  }
  /* ---- stock: cartons, cans, bottles (instanced, coloured per item; a printed band on each) ---- */
  { const lab = canvasTex(64, 64, (x) => { x.fillStyle = "#cfcfcf"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#ffffff"; x.fillRect(0, 20, 64, 22); x.fillStyle = "#3a3a3a"; x.fillRect(10, 26, 30, 10); x.fillStyle = "#8a8a8a"; x.fillRect(0, 54, 64, 10); });
    const mat = new THREE.MeshStandardMaterial({ map: lab, roughness: 0.55 }), canM = new THREE.MeshStandardMaterial({ map: lab, roughness: 0.3, metalness: 0.5 }), botM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, transparent: true, opacity: 0.88 });
    const carton = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, 1400), can = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 14), canM, 1400), bot = new THREE.InstancedMesh(bottleGeo(), botM, 700);
    const pal = [0xd8363a, 0x2f7fd8, 0xf5c400, 0x2fbf5a, 0xff7a1a, 0xf2f0ea, 0x7b4fc4, 0x1fb5a8, 0xc8643c, 0x3a3f7a];
    const m4 = new THREE.Matrix4(), col = new THREE.Color(); let a = 0, b = 0, c = 0;
    for (const s of [-1, 1]) SH.slice(0, 4).forEach((y, si) => {
      const kind = (si + (s > 0 ? 1 : 0)) % 3; let z = -7.85;
      while (z < 4.85) { const run = 0.5 + rnd() * 1.4, hue = pal[Math.floor(rnd() * pal.length)], gap = rnd() < 0.12;   /* a facing of one product, sometimes sold through */
        if (kind === 0) { const w = 0.13 + rnd() * 0.08, h = 0.2 + rnd() * 0.2, dep = 0.22 + rnd() * 0.12;
          for (let zz = z; zz < Math.min(z + run, 4.85); zz += w + 0.012) { if (gap && zz > z + run * 0.4) break; for (let r = 0; r < 2; r++) { m4.makeScale(dep * 0.48, h, w).setPosition(s * (1.47 + r * dep * 0.5), y + 0.013 + h / 2, zz + w / 2); carton.setMatrixAt(a, m4); carton.setColorAt(a, col.setHex(hue)); a++; } } }
        else if (kind === 1) { const d = 0.075 + rnd() * 0.03, h = 0.11 + rnd() * 0.06;
          for (let zz = z; zz < Math.min(z + run, 4.85); zz += d + 0.006) { if (gap && zz > z + run * 0.5) break; for (let r = 0; r < 3; r++) { m4.makeScale(d, h, d).setPosition(s * (1.47 + r * d * 1.05), y + 0.013 + h / 2, zz + d / 2); can.setMatrixAt(b, m4); can.setColorAt(b, col.setHex(hue)); b++; }
            if (rnd() < 0.5) { m4.makeScale(d, h, d).setPosition(s * 1.5, y + 0.013 + h * 1.5, zz + d / 2); can.setMatrixAt(b, m4); can.setColorAt(b, col.setHex(hue)); b++; } } }
        else { const d = 0.08 + rnd() * 0.02, h = 0.26 + rnd() * 0.1, tint = [0x2f7a3a, 0x9a5a2a, 0xe8f0f0, 0x3a6ab8, 0xd8363a][Math.floor(rnd() * 5)];
          for (let zz = z; zz < Math.min(z + run, 4.85); zz += d + 0.01) { if (gap && zz > z + run * 0.4) break; for (let r = 0; r < 2; r++) { m4.makeScale(d, h, d).setPosition(s * (1.48 + r * 0.1), y + 0.013, zz + d / 2); bot.setMatrixAt(c, m4); bot.setColorAt(c, col.setHex(tint)); c++; } } }
        z += run + 0.04; if (a > 1390 || b > 1390 || c > 690) break; }
    });
    carton.count = Math.min(a, 1400); can.count = Math.min(b, 1400); bot.count = Math.min(c, 700); for (const im of [carton, can, bot]) g.add(im);
  }
  /* ---- hanging aisle sign, promotion danglers ---- */
  { const sg = new THREE.Group(); sg.position.set(0, 3.25, -4.5); sg.userData.keep = true; g.add(sg); D.asign = sg;
    for (const x of [-0.8, 0.8]) tube(sg, [x, 0, 0], [x, -0.55, 0], 0.004, M(0x888888, 0.4), 4);
    const t = signTex("7   HOUSEHOLD", { w: 1024, h: 160, bg: "#1d4f9a", fg: "#ffffff", font: "bold 92px Arial, sans-serif" });
    const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 });
    rbox(sg, 2.0, 0.32, 0.04, M(0x1d4f9a, 0.5), 0, -0.72, 0, { r: 0.01 }); for (const s of [-1, 1]) { const f = add(sg, new THREE.PlaneGeometry(1.96, 0.3), face, 0, -0.72, s * 0.021); f.rotation.y = s > 0 ? 0 : Math.PI; }
    D.dang = []; const dt = signTex("SALE", { w: 256, h: 256, bg: "#d8363a", fg: "#ffffff", font: "bold 96px Arial, sans-serif" }), dm = new THREE.MeshStandardMaterial({ map: dt, roughness: 0.6, side: THREE.DoubleSide });
    for (const [x, z] of [[-1.2, -1.0], [1.25, -2.7], [-1.25, -6.2], [1.2, 2.4]]) { const d = new THREE.Group(); d.position.set(x, 2.95, z); d.userData.keep = true; g.add(d); tube(d, [0, 0, 0], [0, 0.32, 0], 0.002, M(0xdddddd, 0.4), 3); add(d, new THREE.PlaneGeometry(0.3, 0.3), dm, 0, -0.15, 0); D.dang.push({ d, ph: rnd() * 6 }); }
  }
  /* ---- the end-cap display and a trolley left mid-aisle ---- */
  { const card = surf("wood", { rep: [0.5, 0.5], tint: 0xc8a070, bump: 0.4 });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4 - i; j++) rbox(g, 0.42, 0.3, 0.34, card, -0.75 + j * 0.44 + i * 0.22, 0.15 + i * 0.3, 5.6, { r: 0.01 });
    const tr = new THREE.Group(); tr.position.set(-1.0, 0, -6.3); tr.rotation.y = 0.15; g.add(tr); const wire = M(0xb8bcc0, 0.3, { metalness: 0.8 }), red = M(0xc0282a, 0.5);
    for (const [ax, az] of [[-0.25, -0.4], [0.25, -0.4], [-0.25, 0.4], [0.25, 0.4]]) { add(tr, new THREE.CylinderGeometry(0.05, 0.05, 0.03, 14), dark, ax, 0.05, az).rotation.z = Math.PI / 2; tube(tr, [ax, 0.08, az], [ax * 1.1, 0.42, az * 1.05], 0.008, wire, 5); }
    for (const y of [0.45, 0.62, 0.8, 0.95]) for (const [a, b] of [[[-0.28, y, -0.45], [0.28, y, -0.45]], [[-0.28, y, 0.45], [0.28, y, 0.45]], [[-0.28, y, -0.45], [-0.28, y, 0.45]], [[0.28, y, -0.45], [0.28, y, 0.45]]]) tube(tr, a, b, 0.005, wire, 4);
    tube(tr, [-0.3, 1.05, 0.5], [0.3, 1.05, 0.5], 0.016, red, 8); rbox(tr, 0.12, 0.16, 0.2, M(0x2fbf5a, 0.6), 0.05, 0.53, 0.1, { r: 0.01 }); rbox(tr, 0.2, 0.08, 0.14, M(0xf5c400, 0.6), -0.1, 0.5, -0.15, { r: 0.01 }); }
  /* ---- the far end: cross aisle, the freezer wall, a clock ---- */
  { rbox(g, 16, 3.3, 0.2, surf("tile", { rep: [6, 1.3], tint: 0xd8d8d0, bump: 0.4 }), 0, 1.65, -14.2, { r: 0.01 });
    const glass = M(0xc8e8ff, 0.05, { metalness: 0.2, emissive: 0x9ad0ff, emissiveIntensity: 0.55 });
    for (let i = 0; i < 6; i++) { const x = -3.75 + i * 1.5; rbox(g, 1.44, 2.1, 0.7, M(0xe8eaec, 0.4), x, 1.05, -13.7, { r: 0.02 }); rbox(g, 1.3, 1.8, 0.02, glass, x, 1.15, -13.34, { r: 0.01 }); rbox(g, 0.03, 0.5, 0.04, steel, x + 0.55, 1.1, -13.31, { r: 0.01 }); }
    D.glint = add(g, new THREE.PlaneGeometry(0.25, 2.0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 1.15, -13.32); noAO(D.glint); D.glint.userData.keep = true;
    rbox(g, 6.2, 0.5, 0.06, EM(0x2f7fd8, 0.9), 0, 2.55, -13.9, { r: 0.02 }); const ft = signTex("FROZEN", { w: 512, h: 96, bg: "#2f7fd8", fg: "#ffffff", font: "bold 64px Arial, sans-serif" }); add(g, new THREE.PlaneGeometry(2.4, 0.42), new THREE.MeshBasicMaterial({ map: ft }), 0, 2.55, -13.86);
    const ck = new THREE.Group(); ck.position.set(2.6, 2.6, -14.08); g.add(ck); add(ck, new THREE.CylinderGeometry(0.22, 0.22, 0.04, 28), M(0xf4f4f0, 0.5), 0, 0, 0).rotation.x = Math.PI / 2; add(ck, new THREE.TorusGeometry(0.22, 0.018, 8, 28), dark, 0, 0, 0.02);
    const hand = new THREE.Group(); hand.position.z = 0.03; hand.userData.keep = true; ck.add(hand); add(hand, new THREE.BoxGeometry(0.006, 0.19, 0.004), M(0xd8363a, 0.5), 0, 0.085, 0); D.hand = hand;
    for (const s of [-1, 1]) rbox(g, 3.0, 2.0, 1.0, M(0xc8ccd0, 0.5, { metalness: 0.3 }), s * 4.5, 1.0, -10.5, { r: 0.03 });
    /* a trolley pushed across the far aisle (no person: its wheels and the basket) */
    const ct = new THREE.Group(); ct.userData.keep = true; g.add(ct); D.cross = ct; const wire = M(0xb8bcc0, 0.3, { metalness: 0.8 });
    for (const y of [0.45, 0.7, 0.95]) rbox(ct, 0.9, 0.02, 0.55, wire, 0, y, 0, { r: 0.005 }); for (const [ax, az] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) { tube(ct, [ax, 0.06, az], [ax, 0.95, az], 0.008, wire, 4); add(ct, new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), dark, ax, 0.05, az).rotation.x = Math.PI / 2; }
  }
  /* ---- the spill: milk-pale puddle that mirrors, glass shards of a green bottle ---- */
  { const sp = add(g, new THREE.CircleGeometry(0.62, 40), M(0xb4c4d0, 0.02, { metalness: 0.35, transparent: true, opacity: 0.8 }), 0.25, 0.004, -1.9); sp.rotation.x = -Math.PI / 2; sp.scale.set(1.3, 1, 1);
    for (let i = 0; i < 5; i++) { const r = 0.12 + rnd() * 0.12, a = rnd() * 6.28, d = add(g, new THREE.CircleGeometry(r, 18), sp.material, 0.25 + Math.cos(a) * 0.75, 0.0042, -1.9 + Math.sin(a) * 0.5); d.rotation.x = -Math.PI / 2; }
    const glassM = M(0x2f7a3a, 0.1, { transparent: true, opacity: 0.85, metalness: 0.1 });
    for (let i = 0; i < 9; i++) { const s = add(g, new THREE.TetrahedronGeometry(0.02 + rnd() * 0.025), glassM, 0.05 + rnd() * 0.5, 0.012, -2.15 + rnd() * 0.5); s.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); s.scale.y = 0.35; }
    const neck = add(g, new THREE.CylinderGeometry(0.018, 0.03, 0.12, 12), glassM, 0.42, 0.03, -1.7); neck.rotation.set(0, 0.5, 1.5); }
  /* ---- the yellow wet-floor sign (moved by sets2's update) and the carried boxes ---- */
  { const sign = new THREE.Group(); g.add(sign); sign.userData.keep = true; const yel = M(0xf5c400, 0.45), ink = M(0x17171c, 0.6);
    const fig = signTex("!", { w: 128, h: 256, bg: "#f5c400", fg: "#17171c", font: "bold 200px Arial, sans-serif" }), figM = new THREE.MeshStandardMaterial({ map: fig, roughness: 0.45 });
    for (const s of [-1, 1]) { const p = new THREE.Group(); p.rotation.x = s * 0.24; sign.add(p); rbox(p, 0.32, 0.62, 0.015, yel, 0, 0.31, s * 0.01, { r: 0.006 }); const f = add(p, new THREE.PlaneGeometry(0.22, 0.36), figM, 0, 0.36, s * 0.019); f.rotation.y = s > 0 ? 0 : Math.PI; rbox(p, 0.34, 0.03, 0.02, ink, 0, 0.6, s * 0.01, { r: 0.006 }); }
    dyn.sign = sign;
    const card = M(0xc89c64, 0.95);   /* plain board (the wood paint read as dark chests) */
    dyn.boxes = [0, 1, 2, 3].map(() => { const b = new THREE.Group(); b.userData.keep = true; g.add(b); rbox(b, 0.46, 0.3, 0.36, card, 0, 0, 0, { r: 0.012 }); rbox(b, 0.47, 0.03, 0.08, M(0xd9c79a, 0.6), 0, 0.15, 0, { r: 0.005 }); return b; });
  }
  for (const z of [-7, -1.5, 4]) { const l = new THREE.PointLight(0xfff6ea, 7, 11, 1.6); l.position.set(0, 2.9, z); g.add(l); }
  { const l = new THREE.PointLight(0x9ad0ff, 3, 6, 1.6); l.position.set(0, 1.4, -12.6); g.add(l); }
  bake(g);

  function update(T) {
    D.asign.rotation.x = 0.03 * Math.sin(T * 0.9); D.asign.rotation.z = 0.01 * Math.sin(T * 0.6 + 1);
    for (const { d, ph } of D.dang) d.rotation.y = 0.9 * Math.sin(T * 0.7 + ph) + 0.3 * Math.sin(T * 1.9 + 2 * ph);
    const f = (T * 7.3) % 5.2; D.flick.material.emissiveIntensity = f < 0.12 || (f > 0.3 && f < 0.36) || (f > 2.8 && f < 2.84) ? 0.25 : 2.4;
    D.glint.position.x = -4.5 + ((T * 1.1) % 9); D.glint.material.opacity = 0.18 + 0.08 * Math.sin(T * 2);
    const u = ((T + 3) % 9) / 9; D.cross.position.set(-8 + 16 * u, 0, -11.6); D.cross.visible = u > 0.05 && u < 0.95;
    D.hand.rotation.z = -Math.floor(T) * Math.PI / 30;
  }
  function env(renderer) { return skyEnv(renderer, [[0, "#ffffff"], [0.3, "#e8e8e4"], [0.55, "#c8c8c4"], [1, "#8a8a86"]], [[0xffffff, 5, 0, 30, 0], [0x9ad0ff, 6, 0, 0, -40]]); }
  return { update, env };
}

/* a bottle: body, shoulder, neck, cap, origin at its base */
function bottleGeo() {
  const pts = [[0, 0], [0.5, 0], [0.5, 0.6], [0.42, 0.72], [0.2, 0.82], [0.2, 0.96], [0.24, 0.97], [0.24, 1.0], [0, 1.0]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 14);
}
