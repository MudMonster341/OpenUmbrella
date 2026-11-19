/* setkit.js — shared helpers for the sets rebuilt to the roof's bar in M2 (2026-11-18): cached materials, glows, canvas labels,
   a generated sky for image-based light, seeded randomness. roof.js keeps its own copies (it was the look-dev); bake and building
   are re-exported from it. Story-free: no names, no lines. */
import * as THREE from "three";
import { soft } from "./matkit.js";
export { bake, building } from "./roof.js";

const MC = new Map();
/* a cached standard material: plain options only (numbers, booleans) so the key is stable */
export const M = (c, r = 0.8, e = {}) => { const k = c + "|" + r + "|" + JSON.stringify(e); if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, ...e })); return MC.get(k); };
export const B = (c, e = {}) => new THREE.MeshBasicMaterial({ color: c, ...e });
export const EM = (c, k = 1, e = {}) => M(0x111111, 0.6, { emissive: c, emissiveIntensity: k, ...e });
export const add = (g, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
export const noAO = (o) => { o.userData.noAO = true; o.userData.noShadow = true; return o; };
export const tube = (g, a, b, r, mat, seg = 10) => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat);
  m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(m); return m; };
export function rng(s) { let seed = s; return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
export const sat = (x) => Math.min(1, Math.max(0, x));

/* a soft additive glow (a lamp's halo); kept live so it is never merged */
export function glow(g, color, size, x, y, z, op = 0.7) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.position.set(x, y, z); s.scale.setScalar(size); noAO(s); s.userData.keep = true; g.add(s); return s;
}
/* a canvas texture drawn by fn(ctx, w, h) */
export function canvasTex(w, h, fn, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/* a shop sign or a label: text on a board (generic words only) */
export function signTex(text, { w = 512, h = 128, bg = "#1e2a3a", fg = "#f3ead8", font = "bold 78px Georgia, serif", rim = null } = {}) {
  return canvasTex(w, h, (x) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); if (rim) { x.strokeStyle = rim; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16); }
    x.fillStyle = fg; x.font = font; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, w / 2, h / 2 + 4); });
}
/* a vertical gradient sky on a far plane (no fog) */
export function gradSky(g, stops, { z = -70, w = 260, h = 110, y0 = -12 } = {}) {
  const t = canvasTex(4, 256, (x) => { const gr = x.createLinearGradient(0, 0, 0, 256); stops.forEach(([o, c]) => gr.addColorStop(o, c)); x.fillStyle = gr; x.fillRect(0, 0, 4, 256); });
  const m = add(g, new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, fog: false }), 0, y0 + h / 2, z); noAO(m); return m;
}
/* image-based light from a generated sky: stops top to bottom, plus [hex, size, x, y, z] bright blobs (a lamp, a window, the sun) */
export function skyEnv(renderer, stops, blobs = []) {
  const es = new THREE.Scene(), t = canvasTex(4, 128, (x) => { const gr = x.createLinearGradient(0, 0, 0, 128); stops.forEach(([o, c]) => gr.addColorStop(o, c)); x.fillStyle = gr; x.fillRect(0, 0, 4, 128); });
  es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide })));
  for (const [c, s, x, y, z] of blobs) { const b = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8), new THREE.MeshBasicMaterial({ color: c })); b.position.set(x, y, z); es.add(b); }
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(es, 0.03).texture; pm.dispose(); return tex;
}
/* a lumpy foliage blob: an icosphere with its vertices pushed in and out (seeded) */
export function blob(r, rnd, detail = 2) {
  const geo = new THREE.IcosahedronGeometry(r, detail), p = geo.attributes.position, v = new THREE.Vector3();
  const k = [rnd() * 9, rnd() * 9, rnd() * 9];
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.16 * Math.sin(v.x * 3.1 / r + k[0]) * Math.sin(v.y * 2.7 / r + k[1]) + 0.1 * Math.sin(v.z * 4.3 / r + k[2]); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y * 0.85, v.z); }
  geo.computeVertexNormals(); return geo;
}
/* a tree: tapered trunk, two limbs, a crown of blobs in a live group (it sways) */
export function tree(g, x, z, { h = 4, r = 1.6, rnd, bark, leaf, leaf2 }) {
  const t = new THREE.Group(); t.position.set(x, 0, z); g.add(t);
  add(t, new THREE.CylinderGeometry(0.12 * h / 4, 0.22 * h / 4, h * 0.62, 9), bark, 0, h * 0.31, 0);
  const crown = new THREE.Group(); crown.position.y = h * 0.62; crown.userData.keep = true; t.add(crown);
  for (let i = 0; i < 2; i++) { const a = rnd() * 6.28; tube(crown, [0, -h * 0.12, 0], [Math.cos(a) * r * 0.55, h * 0.12, Math.sin(a) * r * 0.55], 0.05 * h / 4, bark, 6); }
  const n = 6 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + rnd(), d = r * (0.25 + 0.5 * rnd()); add(crown, blob(r * (0.45 + 0.3 * rnd()), rnd), i % 3 ? leaf : leaf2, Math.cos(a) * d, h * (0.05 + 0.25 * rnd()), Math.sin(a) * d); }
  add(crown, blob(r * 0.7, rnd), leaf, 0, h * 0.32, 0);
  return { t, crown, ph: rnd() * 6.28 };
}
