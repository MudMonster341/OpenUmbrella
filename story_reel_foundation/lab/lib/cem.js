/* cem.js — the cemetery in rain, by day, rebuilt to the roof's bar (M2, 2026-11-18). Set-local: the easel with the photo stands at
   (0, 0, -1.6); the mourners stand around it (x -1.5..1.8, z -1.2..2.6); the funeral shots look toward -z from z 1..7.
   Layers, near to far: wet lawn with tufts that move in the wind, a gravel path with puddles; the funeral (a canopy, the casket on its
   stand with a spray of flowers, wreaths, the easel); rows of weathered headstones of several kinds; yews and oaks; a stone boundary wall;
   a chapel with a spire; hills fading into rain mist; an overcast sky. Life, all a pure function of T: rain, ripples on every puddle,
   the grass and the trees in the wind, the canopy's valance flapping, a crow on a headstone, mist drifting. Story-free. */
import * as THREE from "three";
import { surf, rbox } from "./matkit.js";
import { M, add, noAO, tube, rng, tree, gradSky, skyEnv, bake, canvasTex } from "./setkit.js";

export function buildCem(g, dyn, { framed }) {
  const rnd = rng(707), D = {};
  /* ---- ground: lawn, the path, puddles ---- */
  rbox(g, 90, 0.2, 90, surf("grass", { rep: [26, 26], size: 512 }), 0, -0.1, -10, { r: 0.02 });
  const gravel = surf("concrete", { rep: [1.2, 26], tint: 0x9a948a, bump: 1.6 });
  rbox(g, 1.5, 0.06, 46, gravel, -3.2, 0.0, -8, { r: 0.02 });
  for (const s of [-1, 1]) rbox(g, 0.08, 0.1, 46, M(0x6e6a62, 0.8), -3.2 + s * 0.78, 0.03, -8, { r: 0.02 });
  const pudM = M(0x2a3036, 0.04, { metalness: 0.2 }), puds = [[-3.1, 3.2, 0.5], [-3.35, -2.0, 0.38], [-2.95, -6.5, 0.45], [2.6, 3.8, 0.55], [-1.6, 4.6, 0.35], [3.4, -0.8, 0.4]];
  for (const [x, z, r] of puds) { const p = add(g, new THREE.CircleGeometry(r, 28), pudM, x, 0.035, z); p.rotation.x = -Math.PI / 2; p.scale.set(1.5, 1, 1); }
  /* grass tufts near the camera: crossed blades, instanced; they sway (update) */
  { const blade = new THREE.ConeGeometry(0.007, 1, 3); blade.translate(0, 0.5, 0); const parts = [];
    for (let i = 0; i < 5; i++) { const b = blade.clone(); b.rotateZ((i - 2) * 0.18); b.rotateY(i * 1.3); b.scale(1, 0.7 + 0.3 * (i % 3) / 2, 1); parts.push(b); }
    const tuft = parts.reduce((a, b) => (a ? mergeTwo(a, b) : b), null);
    const N = 6500, im = new THREE.InstancedMesh(tuft, M(0xffffff, 0.7, { side: THREE.DoubleSide }), N); im.userData.keep = true; im.userData.noAO = true;
    const P = []; let k = 0;
    while (k < N) { const x = (rnd() - 0.5) * 16, z = -6 + rnd() * 15; if (Math.abs(x + 3.2) < 0.85) continue; if (Math.hypot(x, z + 1.6) < 0.5) continue;
      P.push([x, z, 0.05 + 0.08 * rnd(), rnd() * 6.28]); im.setColorAt(k, new THREE.Color().setHSL(0.23 + 0.05 * rnd(), 0.4, 0.15 + 0.1 * rnd())); k++; }
    g.add(im); D.tufts = { im, P };
  }
  /* ---- the funeral: canopy, casket, wreaths, the easel with her photo ---- */
  { const cz = -3.1, pole = M(0x8a8e94, 0.4, { metalness: 0.7 }), canvas = M(0x2f4a3a, 0.85, { side: THREE.DoubleSide });
    for (const [px, pz] of [[-1.6, cz - 1.3], [1.6, cz - 1.3], [-1.6, cz + 1.3], [1.6, cz + 1.3]]) add(g, new THREE.CylinderGeometry(0.025, 0.025, 2.45, 8), pole, px, 1.22, pz);
    const roofG = new THREE.ConeGeometry(2.35, 0.55, 4, 1, true); roofG.rotateY(Math.PI / 4); add(g, roofG, canvas, 0, 2.72, cz);
    const val = new THREE.Group(); val.userData.keep = true; g.add(val); D.valance = [];
    for (const [x, z, ry, w] of [[0, cz + 1.3, 0, 3.2], [0, cz - 1.3, 0, 3.2], [-1.6, cz, Math.PI / 2, 2.6], [1.6, cz, Math.PI / 2, 2.6]]) {
      const geo = new THREE.PlaneGeometry(w, 0.28, 24, 1), m = add(val, geo, canvas, x, 2.32, z); m.rotation.y = ry; D.valance.push({ m, base: Float32Array.from(geo.attributes.position.array), ph: x + z }); }
    /* the casket on its stand, a green skirt, a spray of white and red flowers */
    rbox(g, 2.3, 0.62, 0.95, M(0x2f4a30, 0.95), 0, 0.31, cz, { r: 0.02 });
    const wood = surf("wood", { rep: [1.2, 0.6], tint: 0x6a3a26, rough: 0.35 }); rbox(g, 2.05, 0.5, 0.68, wood, 0, 0.87, cz, { r: 0.06 }); rbox(g, 2.1, 0.08, 0.72, wood, 0, 1.13, cz, { r: 0.04 });
    const brass = M(0xc9a24a, 0.3, { metalness: 0.9 }); for (const x of [-0.7, 0, 0.7]) for (const s of [-1, 1]) tube(g, [x - 0.15, 0.82, cz + s * 0.36], [x + 0.15, 0.82, cz + s * 0.36], 0.014, brass, 6);
    const fl = [M(0xf4f1ea, 0.7), M(0xb8202a, 0.6), M(0xe9d7e0, 0.7)], leafM = M(0x2c4a26, 0.8);
    for (let i = 0; i < 46; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()), x = Math.cos(a) * r * 0.5, z = Math.sin(a) * r * 0.2; add(g, new THREE.IcosahedronGeometry(0.045 + 0.025 * rnd(), 1), i % 5 ? fl[i % 3] : leafM, x, 1.2 + 0.08 * (1 - r) + 0.02 * rnd(), cz + z); }
    /* two wreaths on wire stands */
    for (const [x, z] of [[-1.25, cz + 1.0], [1.25, cz + 1.0]]) { for (const s of [-1, 1]) tube(g, [x + s * 0.2, 0, z + 0.1], [x, 1.2, z], 0.008, pole, 5);
      const w = add(g, new THREE.TorusGeometry(0.3, 0.07, 10, 28), leafM, x, 1.05, z); w.rotation.x = -0.15;
      for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28; add(g, new THREE.IcosahedronGeometry(0.045, 1), fl[i % 3], x + Math.cos(a) * 0.3, 1.05 + Math.sin(a) * 0.3, z + 0.05); } }
  }
  const ea = new THREE.Group(); ea.position.set(0, 0, -1.6); g.add(ea); const ew = surf("wood", { rep: [0.3, 1.6], tint: 0x8a5a36 });
  for (const [x, rz] of [[-0.28, -0.12], [0.28, 0.12]]) rbox(ea, 0.045, 1.62, 0.045, ew, x, 0.78, 0.05, { r: 0.01, rz });
  rbox(ea, 0.045, 1.5, 0.045, ew, 0, 0.72, -0.25, { r: 0.01, rx: -0.25 }); rbox(ea, 0.72, 0.045, 0.11, ew, 0, 0.98, 0.07, { r: 0.01 });
  const ph = framed(ea, 0.55, 0.7, 0, 1.38, 0.08); ph.grp.rotation.x = -0.12; dyn.photoMat = ph.mat;
  for (let i = 0; i < 9; i++) add(ea, new THREE.IcosahedronGeometry(0.05, 1), M([0xf2f2f2, 0xb8202a, 0xf5c400, 0xe9d7e0][i % 4], 0.6), -0.36 + i * 0.09, 0.05, 0.32 + (i % 2) * 0.08);
  /* ---- headstones: slabs with rounded tops, crosses, kerbed graves, an obelisk; weathered, some leaning, lichen low down ---- */
  { const stones = [surf("concrete", { rep: [0.6, 0.9], tint: 0x9a9c9e, rough: 0.9 }), surf("concrete", { rep: [0.6, 0.9], tint: 0x7c7e80, rough: 0.85 }), surf("concrete", { rep: [0.6, 0.9], tint: 0x5c5e62, rough: 0.45 }), surf("concrete", { rep: [0.6, 0.9], tint: 0xa8a294, rough: 0.95 })];
    const ink = M(0x2a2a2c, 0.9), moss = M(0x4a5a2a, 1), TOP = new THREE.CylinderGeometry(0.31, 0.31, 0.14, 20, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);   /* a half disc, flat side down */
    for (let r = 0; r < 7; r++) for (let i = 0; i < 12; i++) {
      const x = -13 + i * 2.3 + (rnd() - 0.5) * 0.7, z = -5.2 - r * 2.9 + (rnd() - 0.5) * 0.6; if (Math.abs(x + 3.2) < 1.2) continue; if (Math.abs(x) < 2.2 && z > -5.6) continue;
      const kind = rnd(), mat = stones[Math.floor(rnd() * 4)], s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.set((rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.07); g.add(s);
      if (kind < 0.5) { const h = 0.65 + rnd() * 0.45; rbox(s, 0.62, h, 0.14, mat, 0, h / 2, 0, { r: 0.025 }); add(s, TOP, mat, 0, h, 0);
        for (let l = 0; l < 3; l++) rbox(s, 0.36 - l * 0.08, 0.018, 0.004, ink, 0, h * (0.78 - l * 0.13), 0.071, { r: 0.004 }); rbox(s, 0.66, 0.08, 0.2, moss, 0, 0.03, 0, { r: 0.02 }); }
      else if (kind < 0.72) { rbox(s, 0.12, 1.1, 0.12, mat, 0, 0.55, 0, { r: 0.02 }); rbox(s, 0.5, 0.12, 0.12, mat, 0, 0.82, 0, { r: 0.02 }); rbox(s, 0.42, 0.18, 0.32, mat, 0, 0.09, 0, { r: 0.02 }); }
      else if (kind < 0.92) { rbox(s, 0.7, 0.5, 0.12, mat, 0, 0.25, -0.75, { r: 0.02 }); for (const sx of [-1, 1]) rbox(s, 0.08, 0.12, 1.6, mat, sx * 0.35, 0.06, 0, { r: 0.02 }); rbox(s, 0.62, 0.06, 1.5, M(0x8e8a80, 0.95), 0, 0.03, 0, { r: 0.01 });
        if (rnd() < 0.5) add(s, new THREE.IcosahedronGeometry(0.06, 1), M([0xb8202a, 0xf5c400, 0xe9d7e0][Math.floor(rnd() * 3)], 0.6), 0.1, 0.1, -0.5); }
      else { rbox(s, 0.42, 0.3, 0.42, mat, 0, 0.15, 0, { r: 0.02 }); const ob = add(s, new THREE.CylinderGeometry(0.06, 0.15, 1.7, 4), mat, 0, 1.15, 0); ob.rotation.y = Math.PI / 4; }
    }
  }
  /* ---- trees: two near yews, oaks behind, a far row ---- */
  { const bark = surf("wood", { rep: [0.5, 2], tint: 0x3a2c22 }), yew = M(0x1e3620, 0.95), yew2 = M(0x2a4428, 0.95), oak = M(0x34502c, 0.95), oak2 = M(0x42602e, 0.95);
    D.trees = [tree(g, -6.5, -3.5, { h: 4.4, r: 1.5, rnd, bark, leaf: yew, leaf2: yew2 }), tree(g, 6.8, -6.5, { h: 5.2, r: 2.0, rnd, bark, leaf: oak, leaf2: oak2 }),
      tree(g, -10, -14, { h: 6, r: 2.4, rnd, bark, leaf: oak, leaf2: oak2 }), tree(g, 11, -18, { h: 6.5, r: 2.6, rnd, bark, leaf: yew, leaf2: oak2 })];
    for (let i = 0; i < 10; i++) D.trees.push(tree(g, -24 + i * 5 + rnd() * 2, -30 - rnd() * 5, { h: 6 + rnd() * 3, r: 2.2 + rnd(), rnd, bark, leaf: oak, leaf2: yew }));
  }
  /* ---- the boundary wall, the chapel, hills in the mist ---- */
  { const wall = surf("brick", { rep: [30, 1], tint: 0x8a8278 }); rbox(g, 70, 1.3, 0.45, wall, 0, 0.65, -27, { r: 0.03 }); rbox(g, 70, 0.12, 0.6, M(0x7a766e, 0.9), 0, 1.36, -27, { r: 0.03 });
    const cs = surf("brick", { rep: [4, 3], tint: 0x9a9286 }), ch = new THREE.Group(); ch.position.set(-15, 0, -36); g.add(ch);
    rbox(ch, 7, 5, 4, cs, 0, 2.5, 0, { r: 0.05 }); const rf = add(ch, new THREE.CylinderGeometry(0.01, 3.1, 2.4, 4, 1), M(0x3a3a40, 0.8), 0, 6.2, 0); rf.scale.set(1.15, 1, 0.66); rf.rotation.y = Math.PI / 4;
    rbox(ch, 2, 8, 2, cs, 3.5, 4, 0.5, { r: 0.04 }); add(ch, new THREE.ConeGeometry(1.4, 4.5, 4), M(0x3a3a40, 0.8), 3.5, 10.2, 0.5).rotation.y = Math.PI / 4;
    for (const wx of [-2, 0, 2]) rbox(ch, 0.6, 1.6, 0.05, M(0x30343c, 0.2, { metalness: 0.5 }), wx, 2.6, 2.01, { r: 0.02 });
    for (const [x, z, s, c] of [[-30, -60, 22, 0x6a7a6e], [10, -70, 30, 0x74827a], [40, -55, 18, 0x6a786e]]) { const h = add(g, new THREE.SphereGeometry(s, 24, 12), M(c, 1), x, -s * 0.78, z); h.scale.set(1.6, 1, 1); }
  }
  gradSky(g, [[0, "#8e98a4"], [0.6, "#b4bcc4"], [1, "#c8ced4"]], { z: -90, w: 300, h: 120 });
  /* mist banks drifting low between the rows (soft cards, live) */
  { const mt = canvasTex(256, 64, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(220,226,232,0.55)"); gr.addColorStop(1, "rgba(220,226,232,0)"); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
    D.mist = []; for (let i = 0; i < 7; i++) { const m = add(g, new THREE.PlaneGeometry(14, 3.2), new THREE.MeshBasicMaterial({ map: mt, transparent: true, depthWrite: false, opacity: 0.6 }), 0, 0.9, -9 - i * 3.2); noAO(m); m.userData.keep = true; D.mist.push({ m, x0: (rnd() - 0.5) * 20, v: 0.15 + 0.2 * rnd() }); } }
  /* a crow on a headstone, hopping and pecking */
  { const c = new THREE.Group(); c.position.set(3.1, 0, -5.4); c.userData.keep = true; g.add(c); const bk = M(0x16161a, 0.5);
    add(c, new THREE.CylinderGeometry(0.31, 0.31, 0.16, 16), M(0x8a8c8e, 0.9), 0, 0.85, 0).rotation.x = Math.PI / 2;
    const body = new THREE.Group(); body.position.y = 1.16; c.add(body); const b = add(body, new THREE.SphereGeometry(0.075, 12, 8), bk, 0, 0, 0); b.scale.set(1, 0.8, 1.6);
    add(body, new THREE.SphereGeometry(0.045, 10, 8), bk, 0, 0.05, 0.1); const beak = add(body, new THREE.ConeGeometry(0.014, 0.06, 6), M(0x2a2a2e, 0.4), 0, 0.045, 0.165); beak.rotation.x = Math.PI / 2;
    const tail = add(body, new THREE.BoxGeometry(0.06, 0.01, 0.12), bk, 0, 0.01, -0.13); tail.rotation.x = 0.3; D.crow = body; }
  /* ---- rain: long streaks near, a curtain behind; ripples on each puddle ---- */
  { const n = 1400, pos = new Float32Array(n * 6), base = []; for (let i = 0; i < n; i++) base.push([(rnd() - 0.5) * 18, rnd() * 7, -12 + rnd() * 19]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xe4eaf2, transparent: true, opacity: 0.42 })); noAO(rain); rain.userData.keep = true; rain.frustumCulled = false; g.add(rain);
    dyn.rain = { geo, pos, base };
    const ring = new THREE.RingGeometry(0.8, 1, 24); ring.rotateX(-Math.PI / 2); const R = 8 * puds.length, rim = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({ color: 0xc8d2dc, transparent: true, opacity: 0.35, depthWrite: false }), R);
    rim.userData.keep = true; noAO(rim); g.add(rim); D.rip = { rim, P: [] }; puds.forEach(([x, z, r]) => { for (let i = 0; i < 8; i++) D.rip.P.push([x + (rnd() - 0.5) * r * 2, z + (rnd() - 0.5) * r * 1.2, rnd(), 0.6 + 0.4 * rnd()]); });
  }
  { const l = new THREE.PointLight(0xdfe6f0, 3, 9, 1.6); l.position.set(0, 2.4, 0.4); g.add(l); }   /* under the canopy, soft */
  bake(g);

  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pv = new THREE.Vector3();
  function update(T) {
    const wind = (t, s) => 0.6 * Math.sin(t * 0.9 + s) + 0.4 * Math.sin(t * 2.1 + 1.7 * s);
    const R = dyn.rain; for (let i = 0; i < R.base.length; i++) { const [x, y0, z] = R.base[i], y = ((y0 - T * 9) % 7 + 7) % 7; R.pos.set([x, y, z, x + 0.05, y + 0.34, z], i * 6); } R.geo.attributes.position.needsUpdate = true;
    { const { im, P } = D.tufts; for (let i = 0; i < P.length; i++) { const [x, z, h, r] = P[i]; e.set(0.18 * wind(T, x * 0.4 + z * 0.3), r, 0.1 * wind(T * 1.3, z)); q.setFromEuler(e); mtx.compose(pv.set(x, 0, z), q, sc.set(1, h, 1)); im.setMatrixAt(i, mtx); } im.instanceMatrix.needsUpdate = true; }
    for (const tr of D.trees) { tr.crown.rotation.z = 0.025 * wind(T * 0.7, tr.ph); tr.crown.rotation.x = 0.015 * wind(T * 0.6, tr.ph + 2); }
    for (const v of D.valance) { const p = v.m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = v.base[i * 3], y = v.base[i * 3 + 1]; p.setZ(i, (0.14 - y) * 0.25 * (0.6 * Math.sin(T * 3.1 + x * 2.2 + v.ph) + 0.4 * Math.sin(T * 5.3 + x * 4.1))); } p.needsUpdate = true; }
    for (const m of D.mist) m.m.position.x = ((m.x0 + T * m.v + 20) % 40) - 20;
    { const { rim, P } = D.rip; for (let i = 0; i < P.length; i++) { const [x, z, ph, per] = P[i], u = ((T / per + ph) % 1); mtx.compose(pv.set(x, 0.04, z), q.identity(), sc.setScalar(0.01 + 0.13 * u * (u < 0.92 ? 1 : 0))); rim.setMatrixAt(i, mtx); } rim.instanceMatrix.needsUpdate = true; }
    { const c = T % 3.4, hop = c > 2.2 && c < 2.6 ? Math.sin((c - 2.2) / 0.4 * Math.PI) * 0.06 : 0, peck = c > 0.8 && c < 1.3 ? Math.sin((c - 0.8) / 0.5 * Math.PI * 2) ** 2 * 0.5 : 0;
      D.crow.position.y = 1.16 + hop; D.crow.rotation.set(peck, 0.6 * Math.sin(Math.floor(T / 3.4) * 2.1), 0); }
  }
  function env(renderer) { return skyEnv(renderer, [[0, "#c4cad2"], [0.5, "#aab2ba"], [0.56, "#5a6a54"], [1, "#2a3326"]], [[0xffffff, 9, 0, 40, 10]]); }
  return { update, env };
}

/* merge two geometries (tuft blades) */
function mergeTwo(a, b) {
  const A = a.index ? a.toNonIndexed() : a, Bn = b.index ? b.toNonIndexed() : b, out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) { const x = A.attributes[k], y = Bn.attributes[k]; const arr = new Float32Array(x.array.length + y.array.length); arr.set(x.array); arr.set(y.array, x.array.length); out.setAttribute(k, new THREE.BufferAttribute(arr, x.itemSize)); }
  return out;
}
