/* sets2.js — the seven NEW sets of a later part (2026-11-18), at BLOCK-OUT level for the draft: a kitchen at night, a cemetery in
   rain, a supermarket aisle, a high street at dusk, a building site with scaffold, a rooftop at night, a front doorway.
   Nothing here comes from world.js or sets.js (Part 1's street and shop: scriptcheck R1). Each set is a group at its own origin
   (given by the direction file), and only the set of the current shot is visible. Everything is a pure function of time T.
   Story-free on purpose: names and lines live in the direction file. */
import * as THREE from "three";
import { buildRoof } from "./roof.js";
import { buildKitchen } from "./kitchen.js";
import { buildDoor } from "./door.js";
import { buildSite } from "./site.js";
import { buildStreet } from "./street.js";
import { buildAisle } from "./aisle.js";
import { buildCem } from "./cem.js";

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

  /* ---- kitchen: rebuilt to the roof's bar in kitchen.js (M2, 2026-11-18) ---- */
  const kitchenSet = buildKitchen(G.kitchen, dyn, { framed });

  /* ---- cem: rebuilt to the roof's bar in cem.js (M2, 2026-11-18) ---- */
  const cemSet = buildCem(G.cem, dyn, { framed });

  /* ---- aisle: rebuilt to the roof's bar in aisle.js (M2, 2026-11-18) ---- */
  const aisleSet = buildAisle(G.aisle, dyn, { framed });

  /* ---- street: rebuilt to the roof's bar in street.js (M2, 2026-11-18) ---- */
  const streetSet = buildStreet(G.street, dyn, { framed });

  /* ---- site: rebuilt to the roof's bar in site.js (M2, 2026-11-18) ---- */
  const siteSet = buildSite(G.site, dyn, { framed });

  /* ---- the rooftop at night: rebuilt to the look-dev bar in roof.js (2026-11-18) ---- */
  const roof = buildRoof(G.roof);

  /* ---- door: rebuilt to the roof's bar in door.js (M2, 2026-11-18) ---- */
  const doorSet = buildDoor(G.door, dyn, { framed });

  return {
    G, dyn,
    envs(renderer) { return { aisle: aisleSet.env(renderer), cem: cemSet.env(renderer), street: streetSet.env(renderer), site: siteSet.env(renderer), door: doorSet.env(renderer), kitchen: kitchenSet.env(renderer), roof: roof.env(renderer) }; },   /* per-set image-based light (others keep the default) */
    show(k) { for (const n of Object.keys(G)) G[n].visible = n === k; },
    update(T, cue) {
      /* the phone on the table buzzes on its cues and its light pulses on the ceiling */
      const bz = (cue.buzz || []).reduce((a, b) => { const d = T - b; return d >= 0 && d < 0.6 ? Math.max(a, 1 - d / 0.6) : a; }, 0);
      dyn.phone.position.x = 0.08 + Math.sin(T * 70) * 0.004 * bz; dyn.phone.rotation.y = 0.35 + Math.sin(T * 53) * 0.04 * bz;
      const pulse = 0.55 + 0.45 * Math.sin(T * 9) * Math.sin(T * 9);
      dyn.phoneLight.intensity = 0.35 + 0.6 * pulse; dyn.ceilGlow.material.opacity = 0.1 + 0.25 * pulse; dyn.phoneScreen.material.emissiveIntensity = 1.0 + 0.8 * pulse;
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
      if (G.kitchen.visible) kitchenSet.update(T, cue);
      if (G.door.visible) doorSet.update(T, cue);
      if (G.site.visible) siteSet.update(T, cue);
      if (G.street.visible) streetSet.update(T, cue);
      if (G.aisle.visible) aisleSet.update(T, cue);
      if (G.cem.visible) cemSet.update(T, cue);
      const dr = Math.min(1, Math.max(0, (T - cue.door) / 0.7)); dyn.door.rotation.y = -1.35 * (1 - (1 - dr) ** 3);
    },
  };
}
