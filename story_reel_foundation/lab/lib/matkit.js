/* matkit.js — surfaces made in code (2026-11-18, Part 2 look-dev). Every texture is painted on a canvas from seeded, tileable value
   noise, so nothing is downloaded and every frame is deterministic. Each surface gives a colour map, a bump map and a roughness map, so
   light catches grain, mortar and wear instead of sliding off a flat colour (the user's note on draft v4: "not 3D").
   Also: rounded boxes (bevelled edges read as solid objects; a sharp box reads as a block-out) and a soft sprite for glows and steam.
   Story-free on purpose. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* ---- seeded, tileable value noise ---- */
function hash(x, y, s) { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, per, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = (a) => ((a % per) + per) % per, a = hash(w(xi), w(yi), s), b = hash(w(xi + 1), w(yi), s), c = hash(w(xi), w(yi + 1), s), d = hash(w(xi + 1), w(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/* fbm over the unit square, seamless: x, y in [0,1) */
export function fbm(x, y, base = 4, oct = 4, s = 1) { let f = 0, amp = 0.5, n = 0; for (let o = 0; o < oct; o++) { const p = base << o; f += amp * vnoise(x * p, y * p, p, s + o * 13); n += amp; amp *= 0.5; } return f / n; }

const cache = new Map();
/* paint(u, v, px, py) -> [r, g, b, bump, rough] in 0..1 ; one canvas each for colour, bump and roughness */
function surface(key, size, paint) {
  if (cache.has(key)) return cache.get(key);
  const mk = () => { const c = document.createElement("canvas"); c.width = c.height = size; return c; };
  const cc = mk(), bc = mk(), rc = mk(), cx = cc.getContext("2d"), bx = bc.getContext("2d"), rx = rc.getContext("2d");
  const ci = cx.createImageData(size, size), bi = bx.createImageData(size, size), ri = rx.createImageData(size, size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const [r, g, b, bump, rough] = paint(px / size, py / size, px, py), i = (py * size + px) * 4;
    ci.data[i] = 255 * r; ci.data[i + 1] = 255 * g; ci.data[i + 2] = 255 * b; ci.data[i + 3] = 255;
    bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = 255 * bump; bi.data[i + 3] = 255;
    ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = 255 * rough; ri.data[i + 3] = 255;
  }
  cx.putImageData(ci, 0, 0); bx.putImageData(bi, 0, 0); rx.putImageData(ri, 0, 0);
  const t = (c, srgb) => { const x = new THREE.CanvasTexture(c); x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 4; if (srgb) x.colorSpace = THREE.SRGBColorSpace; return x; };
  const out = { map: t(cc, true), bumpMap: t(bc, false), roughnessMap: t(rc, false) }; cache.set(key, out); return out;
}
const mix = (a, b, t) => a + (b - a) * t, sat = (x) => Math.min(1, Math.max(0, x)), sm = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

/* ---- the surfaces ---- */
const PAINT = {
  /* roofing felt with gravel, stains, and puddles left by the rain (low roughness: they catch the string lights) */
  tar: (u, v) => {
    const n = fbm(u, v, 6, 5, 3), st = fbm(u, v, 2, 3, 9), gr = hash(Math.floor(u * 300), Math.floor(v * 300), 5), pud = sm(0.6, 0.66, fbm(u, v, 2, 4, 21));
    const g = gr > 0.86 ? 0.16 * (gr - 0.86) / 0.14 : 0, base = 0.13 + 0.08 * n - 0.05 * st + g;
    const c = [base * 0.95, base * 0.93, base * 1.0].map((x) => x * (1 - 0.35 * pud));
    return [...c, 0.5 + 0.35 * (n - 0.5) + g * 2 - 0.3 * pud, mix(0.92 - 0.1 * n, 0.12, pud)];
  },
  /* brick, running bond: per-brick tint, chipped edges, recessed mortar */
  brick: (u, v) => {
    const rows = 16, cols = 8, ry = v * rows, row = Math.floor(ry), rx = u * cols + (row % 2 ? 0.5 : 0), col = Math.floor(rx);
    const fx = rx - col, fy = ry - row, edge = Math.min(fx, 1 - fx) * 2.2, edgeY = Math.min(fy, 1 - fy), m = 0.06 + 0.03 * fbm(u, v, 8, 2, 4);
    const mortar = edge < m * 2.2 * 0.5 || edgeY < m ? 1 : 0, tint = hash(col % cols, row, 2), n = fbm(u, v, 8, 4, 7);
    const b = hex(0x8a4a36).map((x, i) => x * (0.78 + 0.35 * tint + 0.25 * (n - 0.5)) * (i === 2 ? 0.95 : 1));
    if (mortar) return [0.42 + 0.1 * n, 0.4 + 0.1 * n, 0.37 + 0.1 * n, 0.15, 0.95];
    return [...b, 0.65 + 0.3 * (n - 0.5) - 0.2 * sm(0.7, 0.9, fbm(u, v, 16, 2, 8)), 0.8 + 0.1 * n];
  },
  /* cast concrete: cloudy, pitted, a little streaking under the coping */
  concrete: (u, v) => {
    const n = fbm(u, v, 4, 5, 11), p = hash(Math.floor(u * 220), Math.floor(v * 220), 3) > 0.97 ? 1 : 0, streak = fbm(u * 0.2, v, 2, 3, 17) * sm(0.5, 0.0, v);
    const g = 0.55 + 0.16 * (n - 0.5) - 0.1 * streak - 0.12 * p; return [g, g * 0.99, g * 0.96, 0.5 + 0.4 * (n - 0.5) - 0.4 * p, 0.85];
  },
  /* painted steel: satin paint with flecks of rust where it is worn (rougher, browner) */
  paint: (u, v) => {
    const n = fbm(u, v, 8, 4, 31), rust = sm(0.72, 0.8, fbm(u, v, 6, 4, 33));
    const c = [0.2, 0.22, 0.25].map((x, i) => mix(x * (0.9 + 0.2 * n), [0.42, 0.2, 0.1][i], rust));
    return [...c, 0.55 + 0.2 * n + 0.2 * rust, mix(0.38, 0.9, rust)];
  },
  /* weathered planks: grain along u, a dark seam between boards */
  wood: (u, v) => {
    const boards = 5, b = Math.floor(v * boards), fy = v * boards - b, seam = fy < 0.05 || fy > 0.95 ? 1 : 0, t = hash(b, 1, 6);
    const grain = fbm(u * 0.15 + t, v * 3, 4, 4, 41 + b), ring = 0.5 + 0.5 * Math.sin((grain * 18 + v * 40) * 1.0);
    const c = hex(0x8b6a48).map((x) => x * (0.75 + 0.3 * t + 0.18 * ring) * (1 - 0.5 * seam));
    return [...c, seam ? 0.1 : 0.5 + 0.25 * ring, 0.75 + 0.15 * grain];
  },
  /* ceramic tiles with grout */
  tile: (u, v) => {
    const n = 8, fx = (u * n) % 1, fy = (v * n) % 1, grout = fx < 0.05 || fy < 0.05 ? 1 : 0, t = hash(Math.floor(u * n), Math.floor(v * n), 8);
    if (grout) return [0.55, 0.53, 0.5, 0.2, 0.9];
    const g = 0.82 + 0.1 * t; return [g, g * 0.98, g * 0.94, 0.8, 0.18 + 0.1 * fbm(u, v, 8, 2, 5)];
  },
};

/* a standard material from a surface: `tint` multiplies the colour map, `rep` is [u, v] repeats; bumpScale per surface */
const BUMP = { tar: 2.2, brick: 3.0, concrete: 1.6, paint: 0.8, wood: 2.0, tile: 1.2 };
export function surf(kind, { tint = 0xffffff, rep = [1, 1], size = 256, metal = 0, rough = 1, bump = 1, emissive, emissiveMap, emissiveIntensity } = {}) {
  const s = surface(kind + size, size, PAINT[kind]);
  const clone = (t) => { const c = t.clone(); c.repeat.set(rep[0], rep[1]); c.needsUpdate = true; return c; };
  const m = new THREE.MeshStandardMaterial({ color: tint, map: clone(s.map), bumpMap: clone(s.bumpMap), bumpScale: BUMP[kind] * bump, roughnessMap: clone(s.roughnessMap), roughness: rough, metalness: metal });
  if (emissive !== undefined) { m.emissive = new THREE.Color(emissive); m.emissiveMap = emissiveMap ?? null; m.emissiveIntensity = emissiveIntensity ?? 1; }
  return m;
}

/* a bevelled box, its texture repeated by its size (`tile` metres per repeat) */
export function rbox(g, w, h, d, mat, x, y, z, { r = 0.03, ry = 0, rx = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01)), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
}

/* a soft round sprite: glows, steam, bulbs' halos */
let softTex = null;
export function soft() {
  if (softTex) return softTex; const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); softTex = new THREE.CanvasTexture(c); softTex.colorSpace = THREE.SRGBColorSpace; return softTex;
}

/* a city facade: rows of windows, each lit warm, cool or dark, some with a blind half down; returns map + emissive map */
export function facade(seed, { cols = 6, rows = 12, lit = 0.35, wall = "#20263a", size = 256 } = {}) {
  const c = document.createElement("canvas"), e = document.createElement("canvas"); c.width = e.width = size; c.height = e.height = size * 2;
  const x = c.getContext("2d"), y = e.getContext("2d"); x.fillStyle = wall; x.fillRect(0, 0, size, size * 2); y.fillStyle = "#000"; y.fillRect(0, 0, size, size * 2);
  const cw = size / cols, ch = (size * 2) / rows;
  for (let j = 0; j < rows; j++) { x.fillStyle = "rgba(0,0,0,0.25)"; x.fillRect(0, j * ch + ch * 0.86, size, ch * 0.08);   /* a sill line per floor */
    for (let i = 0; i < cols; i++) {
      const h = hash(i, j, seed), k = hash(i, j, seed + 5), on = h < lit, wx = i * cw + cw * 0.2, wy = j * ch + ch * 0.2, ww = cw * 0.6, wh = ch * 0.6;
      const col = !on ? "#151a26" : k < 0.65 ? `hsl(${30 + 12 * k},${70 + 15 * k}%,${55 + 15 * hash(i, j, seed + 9)}%)` : k < 0.85 ? `hsl(${200 + 20 * k},45%,${58 + 10 * k}%)` : `hsl(${45},20%,80%)`;
      x.fillStyle = col; x.fillRect(wx, wy, ww, wh); if (on) { y.fillStyle = col; y.fillRect(wx, wy, ww, wh); }
      if (on && hash(i, j, seed + 13) < 0.35) { const bl = wh * (0.3 + 0.5 * hash(i, j, seed + 17)); x.fillStyle = "rgba(20,16,14,0.55)"; x.fillRect(wx, wy, ww, bl); y.fillStyle = "rgba(0,0,0,0.6)"; y.fillRect(wx, wy, ww, bl); }
      x.fillStyle = "rgba(255,255,255,0.06)"; x.fillRect(wx - 2, wy - 2, ww + 4, 2);   /* the lintel catches a little light */
    } }
  const t = (cv) => { const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return tx; };
  return { map: t(c), emissiveMap: t(e) };
}
