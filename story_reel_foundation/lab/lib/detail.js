/* detail.js — surface and structure detail for the street, all procedural (no image files).
   Added 2026-11-15 after the user's notes: "the pavement has lines and more texture, the road has more
   texture ... more depth to the buildings, the way the bus stop is structured".
   Every texture is drawn once into a canvas from a fixed seed, so frames are reproducible. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const rng = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const std = (hex, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, ...extra });
export const rb = (w, h, d, mat, r = 0.03) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.2, h / 2.2, d / 2.2)), mat);

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8; if (repeat) t.repeat.set(...repeat); return t;
}

/* asphalt: speckled aggregate, darker tar patches, a few hairline cracks */
export function asphalt(repeat) {
  return canvasTex(1024, 1024, (g, W, H) => {
    const R = rng(4242);
    g.fillStyle = "#6f737b"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26000; i++) { const v = 90 + R() * 60; g.fillStyle = `rgba(${v},${v + 2},${v + 6},${0.25 + R() * 0.35})`; g.fillRect(R() * W, R() * H, 1 + R() * 2.2, 1 + R() * 2.2); }
    for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(80,83,90,${0.12 + R() * 0.1})`; g.beginPath(); g.ellipse(R() * W, R() * H, 30 + R() * 60, 14 + R() * 26, R() * 3, 0, Math.PI * 2); g.fill(); }   /* faint repairs, not holes */
    g.strokeStyle = "rgba(40,42,48,0.55)"; g.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) { let x = R() * W, y = R() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (R() - 0.5) * 60; y += (R() - 0.3) * 40; g.lineTo(x, y); } g.stroke(); }
  }, repeat);
}

/* paving slabs: a grid of slightly varied stones with grout lines, a worn edge here and there */
export function paving(repeat) {
  return canvasTex(1024, 1024, (g, W, H) => {
    const R = rng(808), n = 4, s = W / n;
    g.fillStyle = "#9c9a92"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 196 + R() * 26; g.fillStyle = `rgb(${v},${v - 2},${v - 8})`; g.fillRect(i * s + 4, j * s + 4, s - 8, s - 8);
      for (let k = 0; k < 900; k++) { const q = v - 30 + R() * 50; g.fillStyle = `rgba(${q},${q},${q - 6},0.35)`; g.fillRect(i * s + 4 + R() * (s - 8), j * s + 4 + R() * (s - 8), 1.5, 1.5); }
      if (R() < 0.3) { g.fillStyle = "rgba(120,118,110,0.25)"; g.beginPath(); g.ellipse(i * s + R() * s, j * s + R() * s, 30 + R() * 40, 18 + R() * 20, R() * 3, 0, Math.PI * 2); g.fill(); }
    }
  }, repeat);
}

/* a facade: the wall stays the world's box, and the depth is added in front of it: recessed windows with
   frames and sills, a cornice, a ground-floor shopfront with an awning, a door, a drainpipe */
export function facade(G, x, w, h, d, hex, P, seed, windows) {
  const R = rng(seed), z0 = -9 + d / 2;
  const dim = P.nightDim ?? 1, wall = std(new THREE.Color(hex).multiplyScalar(dim).getHex(), 0.92), trim = std(new THREE.Color(hex).multiplyScalar(0.82 * dim).getHex(), 0.8), frameM = std(new THREE.Color(0xf3f1ea).multiplyScalar(Math.max(dim, 0.45)).getHex(), 0.6);
  const cornice = rb(w + 0.3, 0.32, 0.5, trim, 0.05); cornice.position.set(x, h - 0.1, z0 + 0.1); G.add(cornice);
  const band = rb(w + 0.1, 0.18, 0.22, trim, 0.04); band.position.set(x, 2.7, z0 + 0.05); G.add(band);
  const cols = Math.max(2, Math.floor(w / 1.4)), rows = Math.max(1, Math.floor((h - 3.4) / 1.5));
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const wx = x - w / 2 + (c + 0.5) * (w / cols), wy = 3.5 + r * ((h - 3.9) / Math.max(1, rows));
    const frame = rb(0.86, 1.06, 0.1, frameM, 0.02); frame.position.set(wx, wy, z0 + 0.03); G.add(frame);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.86), new THREE.MeshBasicMaterial({ color: P.windowOff })); pane.position.set(wx, wy, z0 + 0.085); G.add(pane);   /* in FRONT of the frame box (it sat inside it from day one: no window ever showed) */
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.86, 0.03), frameM); bar.position.set(wx, wy, z0 + 0.1); G.add(bar);
    const sill = rb(0.98, 0.07, 0.2, trim, 0.02); sill.position.set(wx, wy - 0.56, z0 + 0.1); G.add(sill);
    windows.push({ m: pane, id: windows.length, r0: R() });
  }
  /* shopfront: a dark glass band with a frame, a door, an awning with stripes, all icon, no lettering */
  const shopM = new THREE.MeshStandardMaterial({ color: 0x2f3a44, roughness: 0.15, metalness: 0.1, emissive: P.shopGlow ?? 0x000000, emissiveIntensity: P.shopGlow ? 0.85 : 0 });   /* at night the shops are lit from inside */
  const glass = rb(w * 0.78, 1.7, 0.08, shopM, 0.02); glass.position.set(x, 1.15, z0 + 0.02); G.add(glass);
  const door = rb(0.9, 2.0, 0.12, std(new THREE.Color(hex).multiplyScalar(0.55).getHex(), 0.7), 0.03); door.position.set(x + w * 0.3, 1.0, z0 + 0.06); G.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), std(0xd8c27a, 0.3, { metalness: 0.6 })); knob.position.set(x + w * 0.3 - 0.3, 1.0, z0 + 0.14); G.add(knob);
  const stripeTex = canvasTex(256, 64, (g, W, H) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f2efe6" : (["#2f8f6a", "#2f5f9f", "#8a4fae", "#c9a52a"][seed % 4]); g.fillRect(i * W / 8, 0, W / 8, H); } });
  const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.06, 1.0), new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.9 }));
  awning.position.set(x, 2.35, z0 + 0.5); awning.rotation.x = 0.28; G.add(awning);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 10), std(0x5b636e, 0.5)); pipe.position.set(x + w / 2 - 0.15, h / 2, z0 + 0.1); G.add(pipe);
  if (R() < 0.7) { const ac = rb(0.6, 0.42, 0.36, std(0xd9dcd8, 0.6), 0.03); ac.position.set(x - w * 0.25, 3.0 + rows * 0.6, z0 + 0.2); G.add(ac); }
}

/* the bus shelter, built like one: steel frame, back and side glass in frames, a roof with a fascia,
   a lit advert panel (a pattern, no words), a slatted bench at seat height, a clock on a post, a bin.
   Every part is registered with `part` so the burst can throw it. */
export function shelter(part, SH, P) {
  const steel = std(0x4f5866, 0.45, { metalness: 0.35 }), dark = std(0x2b3038, 0.5, { metalness: 0.3 });
  const glassM = new THREE.MeshStandardMaterial({ color: P.nightDim ? 0x5a6f80 : 0xc8e4f4, roughness: 0.05, metalness: 0, transparent: true, opacity: P.nightDim ? 0.14 : 0.32 });   /* at night the lit glass read as a pale wall behind him */
  const W = 3.2, D = 1.5, Hh = 2.35, zb = -0.62, zf = 0.62;
  for (const [x, z] of [[-W / 2, zb], [W / 2, zb], [-W / 2, zf], [W / 2, zf]]) part(rb(0.1, Hh, 0.1, steel, 0.02), x, Hh / 2, z);
  part(rb(W + 0.3, 0.12, D + 0.3, std(0x3a8fd9, 0.55), 0.04), 0, Hh + 0.04, 0);                  /* roof */
  part(rb(W + 0.34, 0.2, 0.08, std(0x2d6fae, 0.5), 0.03), 0, Hh - 0.02, zf + 0.18);               /* fascia */
  part(rb(W, 0.06, 0.06, steel, 0.02), 0, 0.12, zb);                                               /* kick rail */
  part(new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 1.85, 0.03), glassM), 0, 1.15, zb);         /* back glass */
  part(rb(W, 0.05, 0.06, steel, 0.02), 0, 2.1, zb); part(rb(W, 0.05, 0.06, steel, 0.02), 0, 0.22, zb);
  part(new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.85, D - 0.25), glassM), -W / 2, 1.15, -0.05); /* side glass */
  /* advert panel: lit from inside, a soft gradient with a shape, no lettering */
  const ad = document.createElement("canvas"); ad.width = 256; ad.height = 512; const g = ad.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#ffd6e8"); gr.addColorStop(1, "#9fd1ff"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(128, 210, 70, 0, Math.PI * 2); g.fill(); g.fillStyle = "#7a5cc9"; g.fillRect(58, 330, 140, 22); g.fillRect(78, 368, 100, 16);
  const adTex = new THREE.CanvasTexture(ad); adTex.colorSpace = THREE.SRGBColorSpace;
  part(rb(0.95, 1.75, 0.12, steel, 0.03), W / 2 - 0.55, 1.2, zb - 0.02);   /* steel, not black (a black slab read as a hole) */
  part(new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.6), new THREE.MeshBasicMaterial({ map: adTex })), W / 2 - 0.55, 1.2, zb + 0.05);
  part(new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.6), new THREE.MeshBasicMaterial({ map: adTex })), W / 2 - 0.55, 1.2, zb - 0.09).rotation.y = Math.PI;   /* the advert shows on both sides */
  /* bench: seat top at 0.45 m (the sitting clip's pelvis rests at ~0.54 m), slats, two legs */
  for (let i = 0; i < 3; i++) part(rb(2.0, 0.035, 0.1, std(0x9a6a3f, 0.7), 0.012), -0.35, 0.43, -0.2 - i * 0.11);   /* in front of the back glass */
  for (const x of [-1.2, 0.5]) part(rb(0.06, 0.42, 0.3, steel, 0.015), x, 0.21, -0.31);
  /* clock on a post at the kerb end: a face with ticks, no numerals (the insert shows it big) */
  const cl = document.createElement("canvas"); cl.width = 256; cl.height = 256; const c = cl.getContext("2d");
  c.fillStyle = "#fbfaf5"; c.beginPath(); c.arc(128, 128, 120, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#20242b"; c.lineWidth = 10; c.stroke();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.lineWidth = i % 3 ? 5 : 10; c.beginPath(); c.moveTo(128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); c.lineTo(128 + Math.sin(a) * 112, 128 - Math.cos(a) * 112); c.stroke(); }
  const clTex = new THREE.CanvasTexture(cl); clTex.colorSpace = THREE.SRGBColorSpace;
  part(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.6, 12), steel), -W / 2 - 0.45, 1.3, zf);
  part(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 32), dark), -W / 2 - 0.45, 2.5, zf).rotation.x = Math.PI / 2;
  part(new THREE.Mesh(new THREE.CircleGeometry(0.21, 32), new THREE.MeshBasicMaterial({ map: clTex })), -W / 2 - 0.45, 2.5, zf + 0.045);
  /* bin */
  part(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.75, 18), std(0x3d6b4f, 0.6)), -W / 2 - 0.95, 0.375, zf - 0.1);   /* west end: out of the east camera line */
}

/* ===================================================================================================================
   2026-11-17 world pass: depth, light and life. The user: "extreme depth in each and every frame ... lighting at all
   points ... life everywhere". Everything below is a pure function of time or built once from a fixed seed.
   Glow, pools, shafts, skyline rings and sprites are flagged `noAO` (look.js hides them from the ambient-occlusion pass,
   where a translucent quad would read as a solid wall) and `noShadow`. */
export const HAZE = 0x2e3a68;                          /* the horizon colour: fog, the sky's horizon band and the far skyline all meet here */
const _c = {};
export const deco = (o) => { o.userData.noAO = true; o.userData.noShadow = true; return o; };
export const hash1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const mixHex = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
/* a smooth, deterministic breeze, 0..~1.6 gusts; every flag, leaf and awning reads it (no step below 0.4 s) */
export const wind = (t, k = 0) => 0.55 + 0.35 * Math.sin(t * 0.43 + k) + 0.25 * Math.sin(t * 1.07 + k * 1.7) + 0.12 * Math.sin(t * 2.3 + k * 2.9);
/* eased on/off from a hash: no single-frame steps (ERR-0020). rate = changes per second, ease = seconds of fade */
export function softBlink(t, id, rate, ease = 0.35, p = 0.5) {
  const f = t * rate, i = Math.floor(f), u = (f - i) / Math.max(1e-3, ease * rate), s = Math.min(1, u), e = s * s * (3 - 2 * s);
  const a = hash1(i - 1 + id * 7.7) > p ? 1 : 0, b = hash1(i + id * 7.7) > p ? 1 : 0;
  return a + (b - a) * e;
}
/* a smooth flicker for a TV: slow sums of sines, never faster than ~1.5 Hz */
export const tvFlicker = (t, id) => 0.5 + 0.28 * Math.sin(t * 2.1 + id) + 0.14 * Math.sin(t * 4.7 + id * 2.3) + 0.08 * Math.sin(t * 9.1 + id * 4.1);

function radial(stops, size = 128) {
  const c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d");
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([s, a]) => gr.addColorStop(s, `rgba(255,255,255,${a})`)); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const glowTex = () => _c.glow || (_c.glow = radial([[0, 1], [0.16, 0.6], [0.45, 0.16], [1, 0]]));
export const poolTex = () => _c.pool || (_c.pool = radial([[0, 0.95], [0.35, 0.6], [0.7, 0.18], [1, 0]]));
export const smokeTex = () => _c.smoke || (_c.smoke = radial([[0, 0.5], [0.5, 0.28], [1, 0]]));
export function shaftTex() {
  if (_c.shaft) return _c.shaft;
  const c = document.createElement("canvas"); c.width = 8; c.height = 128; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");   /* canvas top = the cone's top (v = 1) */
  g.fillStyle = gr; g.fillRect(0, 0, 8, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (_c.shaft = t);
}
/* a camera-facing glow: bloom picks it up. `boost` > 1 pushes it above the bloom threshold */
export function halo(parent, x, y, z, size, hex, op = 0.8, boost = 1) {
  const m = new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(hex).multiplyScalar(boost), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: op, fog: false });
  const s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.set(size, size, 1); parent.add(s); return deco(s);
}
/* a pool of light on the ground (additive decal, lifted a hair above the road so it never z-fights) */
export function pool(parent, x, z, rx, rz, hex, op = 0.5, y = 0.02) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: poolTex(), color: hex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: op, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.scale.set(rx * 2, rz * 2, 1); parent.add(m); return deco(m);
}
/* a cone of light from (x, yTop, z) down to the ground: the glow of a lamp in damp night air */
export function shaft(parent, x, yTop, z, rTop, rBot, hex, op = 0.12, h = yTop) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 24, 1, true), new THREE.MeshBasicMaterial({ map: shaftTex(), color: hex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: op }));
  m.position.set(x, yTop - h / 2, z); parent.add(m); return deco(m);
}

/* ---- the far city: a ring of silhouettes with lit windows, painted into one canvas per layer. Nearer layers are darker and
   crisper; farther layers dissolve into the horizon colour (atmospheric perspective, baked: the layers ignore the scene's fog). ---- */
export function skylineRing(parent, o) {
  const { R, H, seed, haze, lit = 0.28, minH, maxH, minW = 6, maxW = 16, gaps = [], glowBoost = 1 } = o;
  const Wpx = 4096, ppm = Wpx / (o.flat ? o.flat.width : 2 * Math.PI * R), Hpx = Math.min(1024, Math.ceil(H * ppm));
  const rnd = rng(seed), c = document.createElement("canvas"); c.width = Wpx; c.height = Hpx; const g = c.getContext("2d");
  const body = mixHex(0x12182e, HAZE, haze), edge = mixHex(0x2a3458, HAZE, haze * 0.9);
  const css = (col, k = 1) => `rgb(${Math.min(255, Math.round(col.r * 255 * k))},${Math.min(255, Math.round(col.g * 255 * k))},${Math.min(255, Math.round(col.b * 255 * k))})`;
  const wcols = ["#ffc977", "#ffd9a0", "#ffb866", "#ffe2b0", "#cfe4ff", "#a8c8ff", "#ffdca8", "#7fa6ff"];
  let x = 0;
  while (x < Wpx) {
    const w = Math.round((minW + rnd() * (maxW - minW)) * ppm), h = Math.round((minH + Math.pow(rnd(), 1.5) * (maxH - minH)) * ppm), gap = Math.round(rnd() * 1.4 * ppm);
    const blocked = gaps.some(([a, b]) => x + w > a * Wpx && x < b * Wpx);
    if (!blocked) {
      const y0 = Hpx - h; g.fillStyle = css(body); g.fillRect(x, y0, w, h);
      g.fillStyle = css(edge); g.fillRect(x, y0, w, Math.max(1, Math.round(0.35 * ppm))); g.fillRect(x, y0, Math.max(1, Math.round(0.3 * ppm)), h);   /* a lit roof edge and a lit side */
      const r2 = rnd();
      if (r2 < 0.25) { g.fillStyle = css(body); g.fillRect(x + w * 0.4, y0 - 2.5 * ppm, 0.3 * ppm, 2.5 * ppm); g.fillStyle = "#ff4a4a"; g.fillRect(x + w * 0.4 - 0.5, y0 - 2.5 * ppm, Math.max(2, 0.4 * ppm), Math.max(2, 0.4 * ppm)); }   /* an aerial with a red lamp */
      else if (r2 < 0.45) { g.fillStyle = css(body); g.fillRect(x + w * 0.2, y0 - 1.6 * ppm, w * 0.35, 1.6 * ppm); }
      const cw = 1.25 * ppm, ch = 1.15 * ppm;
      for (let wy = y0 + 1.1 * ppm; wy + ch < Hpx - 0.5 * ppm; wy += ch) for (let wx = x + 0.7 * ppm; wx + cw < x + w - 0.3 * ppm; wx += cw) {
        if (rnd() > lit) continue;
        const col = mixHex(wcols[Math.floor(rnd() * wcols.length)], HAZE, haze * 0.75);
        g.fillStyle = css(col, (0.75 + rnd() * 0.4) * glowBoost); g.fillRect(wx, wy, cw * 0.55, ch * 0.5);
      }
    }
    x += w + gap;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: t, side: o.flat ? THREE.FrontSide : THREE.BackSide, alphaTest: 0.5, fog: false });
  const m = new THREE.Mesh(o.flat ? new THREE.PlaneGeometry(o.flat.width, Hpx / ppm) : new THREE.CylinderGeometry(R, R, Hpx / ppm, 128, 1, true, Math.PI / 2, Math.PI * 2), mat);
  if (o.flat && o.flat.z > 0) m.rotation.y = Math.PI;
  m.position.y = Hpx / ppm / 2; parent.add(m); return deco(m);
}

/* ---- a cheap but lived-in building: one box with a painted facade (a lit-window texture + an emissive twin), a cornice, roof clutter,
   an awning that moves in the wind, and TV / moving-silhouette overlays. Used for the long rows away from the bus stop. ---- */
const WIN = ["#ffc977", "#ffd9a0", "#ffb866", "#ffe2b0", "#cfe4ff", "#b8d4ff", "#ffdca8", "#ffa85a"];
export function liteFacade(G, o) {
  const { x, w, h, d = 3, hex, P, seed, zFront, face = 1, shop = true } = o;
  const R = rng(seed), dim = P.nightDim ?? 1, out = { tv: [], mov: [], awning: null, g: null };
  const g = new THREE.Group(); g.position.set(x, 0, zFront - face * (d / 2)); g.rotation.y = face > 0 ? 0 : Math.PI; G.add(g); out.g = g;
  const PX = 40, cw = Math.round(w * PX), chh = Math.round(h * PX);
  const alb = document.createElement("canvas"), emi = document.createElement("canvas"); alb.width = emi.width = cw; alb.height = emi.height = chh;
  const a = alb.getContext("2d"), e = emi.getContext("2d");
  const wall = mixHex(hex, 0x000000, 1 - Math.min(1, dim * 1.2)); a.fillStyle = `rgb(${wall.r * 255 | 0},${wall.g * 255 | 0},${wall.b * 255 | 0})`; a.fillRect(0, 0, cw, chh);
  for (let i = 0; i < 1400; i++) { const v = (R() - 0.5) * 22; const k = v > 0 ? 255 : 0; a.fillStyle = `rgba(${k},${k},${k},${Math.abs(v) / 120})`; a.fillRect(R() * cw, R() * chh, 1 + R() * 2, 1 + R() * 3); }   /* plaster grain */
  e.fillStyle = "#000"; e.fillRect(0, 0, cw, chh);
  const cols = Math.max(2, Math.floor(w / 1.4)), rows = Math.max(1, Math.floor((h - 3.4) / 1.5)), tvs = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const wx = (c + 0.5) * (cw / cols), wy = chh - (3.5 + r * ((h - 3.9) / Math.max(1, rows))) * PX, ww = 0.66 * PX, wh = 0.86 * PX;
    a.fillStyle = "#e9e6dd"; a.fillRect(wx - ww / 2 - 4, wy - wh / 2 - 4, ww + 8, wh + 8);      /* the frame */
    let col = "#1a2238", lit = false;
    if (R() < (P.windowOnShare ?? 0.62)) { col = WIN[Math.floor(R() * WIN.length)]; lit = true; }
    a.fillStyle = col; a.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
    if (lit) {
      e.fillStyle = col; e.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
      const kind = R();
      if (kind < 0.3) {
        const cc = ["#c85a4a", "#5a7ac8", "#c8a24a", "#6aa87a"][Math.floor(R() * 4)], k1 = 0.28 + R() * 0.12;
        for (const ee of [e, a]) { ee.fillStyle = cc; ee.globalAlpha = ee === e ? 0.55 : 1; ee.fillRect(wx - ww / 2, wy - wh / 2, ww * k1, wh); ee.fillRect(wx + ww / 2 - ww * 0.3, wy - wh / 2, ww * 0.3, wh); ee.globalAlpha = 1; }   /* curtains */
      } else if (kind < 0.5) {
        const k2 = 0.25 + R() * 0.25;
        for (const ee of [e, a]) { ee.fillStyle = ee === e ? "rgba(0,0,0,0.5)" : "#2a2e3a"; ee.fillRect(wx - ww / 2, wy - wh / 2, ww, wh * k2); }   /* a blind half down */
      }
      if (R() < 0.14) tvs.push({ x: (wx - cw / 2) / PX, y: (chh - wy) / PX });
    }
    a.fillStyle = "#222836"; a.fillRect(wx - 1, wy - wh / 2, 2, wh);                                    /* the mullion */
  }
  a.fillStyle = "#2f3a44"; a.fillRect(cw * 0.1, chh - 2.4 * PX, cw * 0.8, 1.9 * PX);                   /* the ground floor: a lit shopfront, a door */
  if (shop) { const gl = mixHex(P.shopGlow ?? 0x8a5a26, 0xffb870, 0.4); e.fillStyle = `rgb(${gl.r * 255 | 0},${gl.g * 255 | 0},${gl.b * 255 | 0})`; e.fillRect(cw * 0.1 + 6, chh - 2.4 * PX + 6, cw * 0.58 - 12, 1.9 * PX - 12); a.fillStyle = "#1a1c22"; a.fillRect(cw * 0.7, chh - 2.4 * PX, cw * 0.16, 2.2 * PX); }
  const tA = new THREE.CanvasTexture(alb), tE = new THREE.CanvasTexture(emi); tA.colorSpace = tE.colorSpace = THREE.SRGBColorSpace; tA.anisotropy = tE.anisotropy = 4;
  const front = new THREE.MeshStandardMaterial({ map: tA, emissiveMap: tE, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.9 });
  const sideM = std(wall.getHex(), 0.92), body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideM, sideM, sideM, sideM, front, sideM]); body.position.set(0, h / 2, 0); g.add(body);
  const trim = std(mixHex(hex, 0x000000, 1 - Math.min(1, dim * 0.95)).getHex(), 0.8);
  const cor = rb(w + 0.3, 0.34, 0.55, trim, 0.05); cor.position.set(0, h - 0.1, d / 2 + 0.1); g.add(cor);
  const band = rb(w + 0.1, 0.2, 0.25, trim, 0.04); band.position.set(0, 2.7, d / 2 + 0.05); g.add(band);
  for (let i = 0, n = 1 + Math.floor(R() * 3); i < n; i++) { const bx = rb(0.5 + R() * 0.9, 0.4 + R() * 0.7, 0.5 + R() * 0.6, std(0x30354a, 0.8), 0.04); bx.position.set((R() - 0.5) * (w - 1.4), h + 0.3, (R() - 0.5) * (d - 0.8)); g.add(bx); }   /* roof clutter */
  if (shop) {
    const tex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 64; const q = c.getContext("2d"); const cc = ["#2f8f6a", "#2f5f9f", "#8a4fae", "#c9a52a"][seed % 4]; for (let i = 0; i < 8; i++) { q.fillStyle = i % 2 ? "#f2efe6" : cc; q.fillRect(i * 32, 0, 32, 64); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const aw = new THREE.Group(); aw.position.set(-w * 0.1, 2.5, d / 2 + 0.05); g.add(aw);
    const pan = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.05, 1.0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12 })); pan.position.set(0, 0, 0.5); aw.add(pan);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.22, 0.03), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); fr.position.set(0, -0.1, 1.0); aw.add(fr);   /* the valance: it sways */
    out.awning = { aw, fr, k: seed * 0.37 };
    aw.rotation.x = 0.28;
  }
  tvs.slice(0, 2).forEach((p, i) => {
    const m = new THREE.MeshBasicMaterial({ color: 0x6f9bff }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), m);
    pl.position.set(p.x, p.y - 0.12, d / 2 + 0.02); g.add(pl); out.tv.push({ m, id: seed + i * 13 }); deco(pl);
  });
  const mv = tvs.length > 2 ? tvs[2] : null;
  if (mv) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.5), new THREE.MeshBasicMaterial({ color: 0x0a0c14 })); pl.position.set(mv.x, mv.y, d / 2 + 0.02); g.add(pl); out.mov.push({ m: pl, x0: mv.x, id: seed }); deco(pl); }
  g.traverse((q) => { if (q.isMesh) q.userData.noShadow = true; });
  return out;
}
