/* sets2.js — the seven NEW sets of a later part (2026-11-18), at BLOCK-OUT level for the draft: a kitchen at night, a cemetery in
   rain, a supermarket aisle, a high street at dusk, a building site with scaffold, a rooftop at night, a front doorway.
   Nothing here comes from world.js or sets.js (Part 1's street and shop: scriptcheck R1). Each set is a group at its own origin
   (given by the direction file), and only the set of the current shot is visible. Everything is a pure function of time T.
   Story-free on purpose: names and lines live in the direction file. */
import * as THREE from "three";
import { buildRoof } from "./roof.js";

const M = (c, r = 0.8, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...e });
const EM = (c, k = 1) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: k, roughness: 0.6 });
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function box(g, w, h, d, mat, x, y, z, ry = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; }
function cyl(g, rt, rb, h, mat, x, y, z, seg = 14) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); g.add(m); return m; }
function ball(g, r, mat, x, y, z) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat); m.position.set(x, y, z); g.add(m); return m; }
function light(g, c, i, d, x, y, z) { const l = new THREE.PointLight(c, i, d, 1.6); l.position.set(x, y, z); g.add(l); return l; }
function plane(g, w, h, mat, x, y, z, rx = 0, ry = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); g.add(m); return m; }
function gradTex(stops) { const c = document.createElement("canvas"); c.width = 4; c.height = 256; const x = c.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); x.fillStyle = gr; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function sky(g, stops, z = -45, w = 160, h = 60) { const m = plane(g, w, h, new THREE.MeshBasicMaterial({ map: gradTex(stops), fog: false }), 0, h / 2 - 6, z); m.userData.noAO = true; m.userData.noShadow = true; return m; }
function windowsTex(lit, base) { const c = document.createElement("canvas"); c.width = 128; c.height = 256; const x = c.getContext("2d"); x.fillStyle = base; x.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) { x.fillStyle = rnd() < lit ? `hsl(${22 + rnd() * 10},75%,${52 + rnd() * 12}%)` : "#1a1c24"; x.fillRect(10 + i * 29, 10 + j * 30, 18, 20); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

/* a portrait of a young woman with long dark hair and a teal scarf (no text): the photo on the easel and on the shelf */
export function portraitTexture(grey = false) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 320; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, "#f1d9b5"); g.addColorStop(1, "#c79a74"); x.fillStyle = g; x.fillRect(0, 0, 256, 320);
  x.fillStyle = "#3a2418"; x.beginPath(); x.ellipse(128, 150, 92, 120, 0, 0, Math.PI * 2); x.fill();                 /* hair */
  x.fillStyle = "#d9a07a"; x.beginPath(); x.ellipse(128, 140, 60, 74, 0, 0, Math.PI * 2); x.fill();                  /* face */
  x.fillStyle = "#3a2418"; x.beginPath(); x.ellipse(128, 84, 64, 34, 0, Math.PI, 0); x.fill();                        /* fringe */
  x.fillStyle = "#1a1412"; [100, 156].forEach((ex) => { x.beginPath(); x.ellipse(ex, 140, 7, 9, 0, 0, Math.PI * 2); x.fill(); });
  x.strokeStyle = "#7a2f2a"; x.lineWidth = 5; x.lineCap = "round"; x.beginPath(); x.arc(128, 168, 22, 0.25 * Math.PI, 0.75 * Math.PI); x.stroke();   /* a smile */
  x.fillStyle = "#e7f0ee"; x.fillRect(40, 236, 176, 90);                                                               /* a white top */
  x.fillStyle = "#1fb5a8"; x.beginPath(); x.moveTo(52, 222); x.quadraticCurveTo(128, 262, 204, 222); x.lineTo(196, 252); x.quadraticCurveTo(128, 286, 60, 252); x.fill();   /* teal scarf */
  x.fillRect(150, 248, 26, 70);
  if (grey) { const d = x.getImageData(0, 0, 256, 320); for (let i = 0; i < d.data.length; i += 4) { const v = 0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2]; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; } x.putImageData(d, 0, 0); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function framed(g, w, h, x, y, z, ry = 0) {
  const tex = portraitTexture(), mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.5 });
  const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; g.add(grp);
  box(grp, w + 0.08, h + 0.08, 0.03, M(0x2b2420, 0.5), 0, 0, -0.016);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.z = 0.001; grp.add(p);
  return { grp, mat };
}

export function buildSets2(scene, ORIGIN) {
  const G = {}, dyn = {};
  for (const k of Object.keys(ORIGIN)) { const g = new THREE.Group(); g.position.set(...ORIGIN[k]); g.visible = false; scene.add(g); G[k] = g; }

  /* ---- the kitchen, at night: a table, the phone buzzing face up, its light pulsing on the ceiling ---- */
  { const g = G.kitchen;
    box(g, 6, 0.1, 6, M(0x6b4a33, 0.7), 0, -0.05, 0); box(g, 6, 2.7, 0.1, M(0xc9bda2), 0, 1.35, -2.5); box(g, 0.1, 2.7, 6, M(0xbfb39a), -2.5, 1.35, 0);
    box(g, 6, 0.08, 6, M(0xbfb6a0), 0, 2.64, 0);
    box(g, 3.4, 0.9, 0.6, M(0x3d5a6b, 0.6), 0.6, 0.45, -2.15); box(g, 3.5, 0.05, 0.64, M(0xd9d4c8, 0.4), 0.6, 0.92, -2.15);
    box(g, 3.4, 0.7, 0.35, M(0x3d5a6b, 0.6), 0.6, 1.95, -2.3); box(g, 0.8, 1.9, 0.7, M(0xe6e6e3, 0.35), -1.95, 0.95, -2.05);
    { const tc = [0x1fb5a8, 0xf2f0ea, 0xf5c400, 0xc8643c, 0x2f7fd8, 0xd8363a]; for (let i = 0; i < 18; i++) for (let j = 0; j < 4; j++) box(g, 0.17, 0.17, 0.01, M(tc[(i * 3 + j * 5) % 6], 0.4), -1.1 + i * 0.19, 1.04 + j * 0.19, -2.44); }
    cyl(g, 0.09, 0.1, 0.2, M(0xd8363a, 0.3), -0.6, 1.05, -2.15); for (const px of [1.6, 2.1]) { cyl(g, 0.08, 0.06, 0.14, M(0xc8643c), px, 1.0, -2.15); ball(g, 0.12, M(0x2fbf5a, 1), px, 1.16, -2.15); }
    box(g, 1.1, 0.9, 0.04, EM(0x1d2d55, 0.55), 1.4, 1.6, -2.44); box(g, 1.2, 0.06, 0.08, M(0xeeeeee), 1.4, 2.06, -2.42); box(g, 1.2, 0.06, 0.08, M(0xeeeeee), 1.4, 1.14, -2.42);
    box(g, 1.4, 0.05, 0.8, M(0x5a3c26, 0.55), 0, 0.75, 0); for (const [lx, lz] of [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]]) box(g, 0.05, 0.75, 0.05, M(0x5a3c26), lx, 0.375, lz);
    for (const [cx, cz, r] of [[-0.95, 0.1, 1.57], [0.3, -0.75, 0]]) { const c = new THREE.Group(); c.position.set(cx, 0, cz); c.rotation.y = r; g.add(c); box(c, 0.42, 0.05, 0.42, M(0x7a5236), 0, 0.46, 0); box(c, 0.42, 0.5, 0.05, M(0x7a5236), 0, 0.72, -0.2); }
    cyl(g, 0.045, 0.04, 0.1, M(0xd8363a, 0.5), -0.35, 0.83, 0.12); box(g, 0.34, 0.006, 0.26, M(0x2f7fd8, 0.8), -0.2, 0.778, -0.18); box(g, 0.28, 0.01, 0.2, M(0xe9e4da, 0.9), 0.4, 0.78, 0.2); for (let i = 0; i < 6; i++) ball(g, 0.035, M([0xd8363a, 0xf5c400, 0x2fbf5a][i % 3], 0.6), 0.45 + (i % 3) * 0.06, 0.8, -0.2 - (i > 2) * 0.06); cyl(g, 0.12, 0.12, 0.02, M(0xf0ece4, 0.4), 0.45, 0.785, -0.15);
    const ph = new THREE.Group(); ph.position.set(0.08, 0.782, 0.05); ph.rotation.y = 0.35; g.add(ph);
    box(ph, 0.078, 0.009, 0.158, M(0x17171c, 0.3), 0, 0, 0); const scr = box(ph, 0.07, 0.002, 0.148, EM(0xbfe4ff, 1.4), 0, 0.0055, 0);
    dyn.phone = ph; dyn.phoneScreen = scr; dyn.phoneLight = light(g, 0xa8dcff, 2.5, 4, 0.08, 0.95, 0.05);
    const cg = plane(g, 1.6, 1.6, new THREE.MeshBasicMaterial({ color: 0xa8dcff, transparent: true, opacity: 0.3, depthWrite: false }), 0.08, 2.59, 0.05, Math.PI / 2); cg.userData.noAO = true; dyn.ceilGlow = cg;
    ball(g, 0.12, EM(0xffc27a, 1.2), -0.25, 2.1, 0); cyl(g, 0.005, 0.005, 0.5, M(0x222222), -0.25, 2.38, 0);
    light(g, 0xffc27a, 2.2, 7, -0.25, 2.0, 0); light(g, 0x6f86c9, 2, 6, 1.4, 1.6, -1.6);
  }

  /* ---- the cemetery, in rain, by day: rows of headstones, trees, an easel with her photo, rain ---- */
  { const g = G.cem;
    box(g, 70, 0.1, 70, M(0x3f5a34, 0.95), 0, -0.05, 0); box(g, 1.4, 0.03, 40, M(0x7d776d, 0.9), -3.2, 0.0, -5);
    for (let r = 0; r < 6; r++) for (let i = 0; i < 11; i++) {
      const x = -12 + i * 2.3 + (rnd() - 0.5) * 0.6, z = -5 - r * 3 + (rnd() - 0.5) * 0.6; if (Math.abs(x + 3.2) < 1.1) continue;
      const h = 0.7 + rnd() * 0.45, st = box(g, 0.6, h, 0.15, M(0x8c8f93 - Math.floor(rnd() * 3) * 0x080808, 0.85), x, h / 2, z, (rnd() - 0.5) * 0.15);
      if (rnd() < 0.25) { box(g, 0.12, 0.5, 0.12, M(0x9a9ca0), x, h + 0.2, z); box(g, 0.4, 0.1, 0.12, M(0x9a9ca0), x, h + 0.28, z); } st.rotation.z = (rnd() - 0.5) * 0.06;
    }
    for (let i = 0; i < 9; i++) { const x = -18 + i * 4.5 + rnd() * 2, z = -24 - rnd() * 6; cyl(g, 0.18, 0.25, 3, M(0x3b2c22), x, 1.5, z); ball(g, 1.8 + rnd(), M(0x2f4a2c, 1), x, 3.8 + rnd(), z); }
    const ea = new THREE.Group(); ea.position.set(0, 0, -1.6); g.add(ea);
    for (const [x, rz] of [[-0.28, -0.12], [0.28, 0.12]]) { const l = box(ea, 0.04, 1.6, 0.04, M(0x5a3c26), x, 0.78, 0.05); l.rotation.z = rz; }
    const bl = box(ea, 0.04, 1.5, 0.04, M(0x5a3c26), 0, 0.72, -0.25); bl.rotation.x = -0.25;
    box(ea, 0.7, 0.04, 0.1, M(0x5a3c26), 0, 0.98, 0.07);
    const ph = framed(ea, 0.55, 0.7, 0, 1.38, 0.08); ph.grp.rotation.x = -0.12; dyn.photoMat = ph.mat;
    for (let i = 0; i < 7; i++) ball(ea, 0.06, M([0xf2f2f2, 0xd8363a, 0xf5c400, 0xffffff][i % 4], 0.6), -0.3 + i * 0.1, 0.06, 0.35 + (i % 2) * 0.08);
    sky(g, [[0, "#9aa4ae"], [1, "#c3c9cf"]], -40);
    const n = 900, pos = new Float32Array(n * 6), base = []; for (let i = 0; i < n; i++) base.push([(rnd() - 0.5) * 16, rnd() * 7, -10 + rnd() * 16]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xdde4ee, transparent: true, opacity: 0.5 })); rain.userData.noAO = true; rain.frustumCulled = false; g.add(rain);
    dyn.rain = { geo, pos, base };
    light(g, 0xdfe6f0, 3, 8, 0, 2.6, 0.5);
  }

  /* ---- the supermarket aisle: shelves of products, ceiling strips, the spill, the yellow sign, boxes, tills at the far end ---- */
  { const g = G.aisle;
    box(g, 5, 0.1, 30, M(0x8a8a86, 0.35), 0, -0.05, -3); for (const s of [-1, 1]) box(g, 0.6, 0.12, 13, M(0x1e2228, 0.6), s * 1.6, 0.06, -1.5); for (let z = -15; z < 12; z += 0.6) box(g, 5, 0.003, 0.02, M(0x6a6a66), 0, 0.001, z); box(g, 5, 0.1, 30, M(0x8a8a88, 0.9), 0, 3.25, -3);
    const prod = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0xffffff, 0.6), 900); let k = 0; const m4 = new THREE.Matrix4(), col = new THREE.Color();
    const pal = [0xd8363a, 0x2f7fd8, 0xf5c400, 0x2fbf5a, 0xff7a1a, 0xf2f0ea, 0x7b4fc4, 0x1fb5a8];
    for (const s of [-1, 1]) {
      box(g, 0.55, 2.0, 13, M(0x4a525c, 0.5, { metalness: 0.3 }), s * 1.78, 1.0, -1.5);
      for (const y of [0.12, 0.58, 1.04, 1.5]) { box(g, 0.6, 0.03, 13, M(0xb8c0c8, 0.4), s * 1.6, y, -1.5);
        for (let z = -7.8; z < 4.8 && k < 900; z += 0.22 + rnd() * 0.06) { const w = 0.16 + rnd() * 0.06, h = 0.18 + rnd() * 0.18;
          m4.makeScale(0.3, h, w).setPosition(s * 1.55, y + 0.015 + h / 2, z); prod.setMatrixAt(k, m4); prod.setColorAt(k, col.setHex(pal[Math.floor(rnd() * pal.length)])); k++; } }
    }
    prod.count = k; g.add(prod);
    box(g, 5, 2.4, 0.2, M(0x6a6058), 0, 1.2, -13.5); box(g, 3, 0.5, 0.05, EM(0xd8363a, 0.9), 0, 2.6, -13.38);
    for (const x of [-5, 5]) box(g, 3, 2.0, 4, M(0x8c96a0, 0.5), x, 1.0, -11);
    for (let z = -12; z <= 6; z += 3) box(g, 0.25, 0.04, 2.2, EM(0xffffff, 2.2), 0, 3.18, z);
    for (const z of [-7, -1.5, 4]) light(g, 0xfff6ea, 7, 11, 0, 2.9, z);
    for (const x of [-1.2, 1.2]) { box(g, 1.0, 0.95, 0.7, M(0x3a3f4d, 0.6), x, 0.475, 7); box(g, 0.3, 0.25, 0.04, EM(0x2fbf5a, 0.8), x, 1.2, 7); }
    const sp = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), M(0x9db4c8, 0.05, { metalness: 0.4, transparent: true, opacity: 0.75 })); sp.rotation.x = -Math.PI / 2; sp.position.set(0.25, 0.004, -1.9); sp.scale.set(1.3, 1, 1); g.add(sp);
    for (let i = 0; i < 4; i++) { const s = cyl(g, 0.02, 0.03, 0.08, M(0x2f7a3a, 0.2, { transparent: true, opacity: 0.85 }), 0.1 + rnd() * 0.4, 0.03, -2.1 + rnd() * 0.4); s.rotation.z = 1.4; s.rotation.y = rnd() * 3; }
    const sign = new THREE.Group(); g.add(sign); const yel = M(0xf5c400, 0.5);
    for (const s of [-1, 1]) { const p = new THREE.Group(); p.rotation.x = s * 0.24; sign.add(p); box(p, 0.32, 0.62, 0.015, yel, 0, 0.31, s * 0.01); box(p, 0.06, 0.2, 0.017, M(0x17171c), 0, 0.38, s * 0.012); box(p, 0.06, 0.05, 0.017, M(0x17171c), 0, 0.22, s * 0.012); }
    dyn.sign = sign;
    dyn.boxes = [0, 1, 2, 3].map(() => { const b = new THREE.Group(); g.add(b); box(b, 0.46, 0.3, 0.36, M(0xb98a55, 0.9), 0, 0, 0); box(b, 0.47, 0.04, 0.08, M(0xd9c79a, 0.6), 0, 0.15, 0); return b; });
  }

  /* ---- the high street at dusk: shop fronts, lit windows, lamps, a dusk sky ---- */
  { const g = G.street;
    box(g, 80, 0.1, 5, M(0x8a8580, 0.9), 0, -0.05, -0.2); box(g, 80, 0.12, 0.25, M(0xa29d96), 0, 0.01, 2.3); box(g, 80, 0.1, 12, M(0x2f3034, 0.8), 0, -0.08, 8.4);
    for (let x = -36; x < 36; x += 3) box(g, 1.4, 0.01, 0.12, M(0xe9e4da, 0.6), x, -0.02, 6);
    let x = -34; const tones = [0x8f5a46, 0xb07a5a, 0x6f7a86, 0xc9b28f, 0x7a4a3e, 0x9aa38a];
    while (x < 34) { const w = 4 + rnd() * 3, h = 6 + rnd() * 9, c = tones[Math.floor(rnd() * tones.length)];
      const b = box(g, w, h, 3, M(c, 0.85), x + w / 2, h / 2, -4.2); const wt = windowsTex(0.45, "#00000000");
      plane(g, w * 0.92, h - 3.2, new THREE.MeshStandardMaterial({ map: wt, emissiveMap: wt, emissive: 0xffffff, emissiveIntensity: 0.9, transparent: true, roughness: 0.6 }), x + w / 2, 3.2 + (h - 3.2) / 2, -2.69);
      box(g, w * 0.86, 2.0, 0.06, EM([0xffd7a0, 0xbfe4ff, 0xffb3c0, 0xfff0d0][Math.floor(rnd() * 4)], 0.7 + rnd() * 0.5), x + w / 2, 1.25, -2.66);
      const aw = box(g, w * 0.9, 0.08, 0.9, M([0xd8363a, 0x2f7fd8, 0x2fbf5a, 0xf5c400][Math.floor(rnd() * 4)], 0.7), x + w / 2, 2.55, -2.25); aw.rotation.x = 0.25; void b;
      x += w + 0.15; }
    for (let lx = -24; lx <= 24; lx += 8) { cyl(g, 0.05, 0.07, 4.2, M(0x2b2f38, 0.5), lx, 2.1, 1.9); ball(g, 0.16, EM(0xffb46a, 2), lx, 4.25, 1.9); if (Math.abs(lx) <= 8) light(g, 0xffb46a, 6, 10, lx, 4.0, 1.6); }
    for (let lx = -20; lx <= 20; lx += 5.5) cyl(g, 0.08, 0.08, 0.8, M(0x2b2f38), lx + 2, 0.4, 2.0);
    sky(g, [[0, "#3a2c5a"], [0.55, "#b8607a"], [1, "#f0a46a"]], -40);
    light(g, 0xffd0a0, 3, 12, 0, 3, 4);
  }

  /* ---- the building site at dusk: a concrete frame, scaffold with planks, a work light, a crane far off ---- */
  { const g = G.site;
    box(g, 50, 0.1, 50, M(0x6b5a45, 1), 0, -0.05, 0);
    for (const y of [0, 3, 6]) box(g, 10, 0.25, 5, M(0x9a9690, 0.9), 0, y + 0.12, -4.8);
    for (let cx = -4.5; cx <= 4.5; cx += 3) for (const cz of [-2.6, -7]) box(g, 0.3, 6.2, 0.3, M(0x9a9690, 0.9), cx, 3.1, cz);
    box(g, 10, 6.4, 0.2, M(0x847a70, 0.95), 0, 3.2, -7.2);
    const pole = M(0x9aa2ab, 0.4, { metalness: 0.6 });
    for (let px = -4; px <= 4; px += 1.6) for (const pz of [-2.1, -1.1]) cyl(g, 0.03, 0.03, 7, pole, px, 3.5, pz, 8);
    for (const y of [2.0, 4.2, 6.2]) for (const pz of [-2.1, -1.1]) { const r = cyl(g, 0.025, 0.025, 8.2, pole, 0, y, pz, 8); r.rotation.z = Math.PI / 2; }
    for (const y of [2.0, 4.2]) for (let bx = -3.2; bx <= 3.2; bx += 1.6) if (!(y === 4.2 && Math.abs(bx - 0.0) < 0.1)) box(g, 1.55, 0.05, 0.95, M(0xa77c4f, 0.9), bx, y + 0.05, -1.6);
    const piv = new THREE.Group(); piv.position.set(-0.78, 4.25, -1.6); g.add(piv); box(piv, 1.55, 0.05, 0.95, M(0xb98a55, 0.9), 0.775, 0, 0); dyn.plank = piv;   /* the board that gives way, hinged at its far end */
    box(g, 0.5, 0.35, 0.3, M(0x2b2f38), -3.5, 2.6, -1.6); ball(g, 0.12, EM(0xfff0d0, 3), -3.5, 2.6, -1.42); light(g, 0xfff0d0, 9, 14, -3.4, 2.8, 0.2);
    for (const [hx, hz] of [[-6, 0], [6, 0]]) box(g, 0.08, 2, 8, M(0xd9d4c8, 0.8), hx, 1, hz);
    box(g, 0.4, 30, 0.4, M(0x2a2a30), 18, 15, -30); box(g, 22, 0.4, 0.4, M(0x2a2a30), 12, 29, -30);
    sky(g, [[0, "#2c2a4a"], [0.6, "#a0607a"], [1, "#e89a6a"]], -42);
    light(g, 0xffc89a, 2.5, 12, 1.5, 1.5, 2.5);
  }

  /* ---- the rooftop at night: rebuilt to the look-dev bar in roof.js (2026-11-18) ---- */
  const roof = buildRoof(G.roof);

  /* ---- the front doorway at night: a house front, the door opening inward, a warm hall, a shelf with her framed photo ---- */
  { const g = G.door;
    box(g, 12, 0.1, 10, M(0x4a4640, 0.9), 0, -0.05, 2); box(g, 1.6, 0.16, 0.7, M(0x8a8580), 0, 0.08, 0.0);
    const brick = M(0xa86b4f, 0.9); box(g, 2.5, 3.2, 0.25, brick, -1.8, 1.6, -0.6); box(g, 2.5, 3.2, 0.25, brick, 1.8, 1.6, -0.6); box(g, 1.1, 1.1, 0.25, brick, 0, 2.65, -0.6);
    box(g, 12, 3.2, 0.25, M(0x6a4a3e, 0.9), 0, 1.6, -0.65).position.x = 0; box(g, 1.2, 0.08, 0.3, M(0xf2f0ea), 0, 2.12, -0.5);
    for (const s of [-1, 1]) box(g, 0.08, 2.1, 0.3, M(0xf2f0ea), s * 0.56, 1.05, -0.5);
    const hinge = new THREE.Group(); hinge.position.set(-0.52, 0, -0.62); g.add(hinge); box(hinge, 1.02, 2.06, 0.05, M(0x2e5d4f, 0.5), 0.51, 1.03, 0); ball(hinge, 0.03, M(0xd9b35a, 0.3, { metalness: 0.8 }), 0.92, 1.0, 0.04); dyn.door = hinge;
    box(g, 3, 0.05, 4, M(0x8b5e3c, 0.6), 0, 0.0, -2.7); box(g, 3, 3, 0.1, M(0xe8cfa8), 0, 1.5, -4.7); box(g, 0.1, 3, 4, M(0xe0c49c), -1.5, 1.5, -2.7); box(g, 0.1, 3, 4, M(0xe0c49c), 1.5, 1.5, -2.7);
    box(g, 0.9, 0.04, 0.25, M(0x5a3c26), -0.45, 1.3, -2.45); const ph = framed(g, 0.24, 0.3, -0.45, 1.5, -2.42); void ph;
    box(g, 0.6, 1.2, 0.3, M(0x7a5236), 0.9, 0.6, -4.5);
    light(g, 0xffc890, 6, 7, 0, 2.3, -2.6); ball(g, 0.1, EM(0xffd29a, 2), 0.95, 2.3, -0.42); light(g, 0xffd29a, 3, 5, 0.95, 2.2, -0.1);
    for (const px of [-1.2, 1.2]) { cyl(g, 0.18, 0.14, 0.35, M(0x7a4a3e), px, 0.18, -0.2); ball(g, 0.25, M(0x2f6a34, 1), px, 0.55, -0.2); }
    sky(g, [[0, "#0d1530"], [1, "#2a3456"]], -30);
    light(g, 0x9fb6ff, 1.5, 10, 2, 3, 4);
  }

  return {
    G, dyn,
    envs(renderer) { return { roof: roof.env(renderer) }; },   /* per-set image-based light (others keep the default) */
    show(k) { for (const n of Object.keys(G)) G[n].visible = n === k; },
    update(T, cue) {
      /* the phone on the table buzzes on its cues and its light pulses on the ceiling */
      const bz = (cue.buzz || []).reduce((a, b) => { const d = T - b; return d >= 0 && d < 0.6 ? Math.max(a, 1 - d / 0.6) : a; }, 0);
      dyn.phone.position.x = 0.08 + Math.sin(T * 70) * 0.004 * bz; dyn.phone.rotation.y = 0.35 + Math.sin(T * 53) * 0.04 * bz;
      const pulse = 0.55 + 0.45 * Math.sin(T * 9) * Math.sin(T * 9);
      dyn.phoneLight.intensity = 0.35 + 0.6 * pulse; dyn.ceilGlow.material.opacity = 0.1 + 0.25 * pulse; dyn.phoneScreen.material.emissiveIntensity = 1.0 + 0.8 * pulse;
      /* rain: each drop falls 8 m/s and wraps */
      const R = dyn.rain; for (let i = 0; i < R.base.length; i++) { const [x, y0, z] = R.base[i], y = ((y0 - T * 8) % 7 + 7) % 7;
        R.pos.set([x, y, z, x + 0.04, y + 0.28, z], i * 6); } R.geo.attributes.position.needsUpdate = true;
      /* her photo lights up (card one) */
      dyn.photoMat.emissiveIntensity = cue.photoLit && T >= cue.photoLit[0] && T < cue.photoLit[1] ? 0.12 + 0.55 * Math.min(1, (T - cue.photoLit[0]) / 0.5) : 0.12;
      /* the yellow sign: at the spill, then lifted, folded and laid flat against the shelf */
      const s = cue.sign, u = Math.min(1, Math.max(0, (T - s[0]) / (s[1] - s[0]))), e = u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
      dyn.sign.position.set(0.55 + (1.28 - 0.55) * e, 0.0 + Math.sin(Math.PI * e) * 0.6 + 0.02 * e, -1.45 + (-0.2 + 1.45) * e);
      dyn.sign.rotation.set(-Math.PI / 2 * e, 0.4 * e, 0); dyn.sign.children.forEach((p, i) => { p.rotation.x = (i ? 1 : -1) * 0.24 * (1 - e); });
      /* the plank tips at its cue */
      const wob = T >= cue.plank && T < cue.fall2 ? Math.sin((T - cue.plank) * 18) * 0.05 * Math.min(1, (T - cue.plank) / 0.2) : 0;
      const pk = Math.min(1, Math.max(0, (T - cue.fall2 + 0.1) / 0.4)); dyn.plank.rotation.z = wob - 0.85 * pk * pk;   /* it rocks on "plank", gives as he steps */
      /* the door opens (the roof's life is in roof.js) */
      if (G.roof.visible) roof.update(T, cue);
      const dr = Math.min(1, Math.max(0, (T - cue.door) / 0.7)); dyn.door.rotation.y = -1.35 * (1 - (1 - dr) ** 3);
    },
  };
}
