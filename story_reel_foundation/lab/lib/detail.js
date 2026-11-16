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
