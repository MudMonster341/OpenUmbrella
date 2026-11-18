/* roof.js — the rooftop at night, rebuilt to the look-dev bar (2026-11-18) after the user's notes on draft v4: "really basic and not 3D",
   "choppy", "no life in the background", "the bolt is covered by a pot". Set-local coordinates: the deck top is y = 0, the railing runs
   along z = -3, the drop is beyond z = -3.3 and the city lies toward -z (every roof shot looks that way, through the railing).
   Layers, near to far: the deck and its things; a lower neighbouring roof (y -6); near towers (z -25..-45); a mid city in fog; a far skyline
   with its own haze; a viaduct with traffic; the sky (gradient, stars, moon, drifting cloud). Light: moonlight from behind the city (the key,
   set in direction_p2's SETLOOK), warm string lights overhead, a lantern on the crate, the stair door's spill. Life, all a pure function of
   T: the string lights sway, bulbs breathe, steam rises, a fan turns, windows go on and off, beacons pulse, traffic flows, a plane crosses.
   Everything is three.js core/addons and matkit.js; nothing is downloaded. Story-free: no names, no lines. */
import * as THREE from "three";
import { surf, rbox, soft, facade, fbm } from "./matkit.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

let seed = 101; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const MC = new Map(), FAC = new Map();   /* shared materials: what shares a material can be merged into one draw (bake below) */
const M = (c, r = 0.8, e = {}) => { const k = c + "|" + r + "|" + JSON.stringify(e); if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, ...e })); return MC.get(k); };
const B = (c, e = {}) => new THREE.MeshBasicMaterial({ color: c, ...e });
const add = (g, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
const tube = (g, a, b, r, mat, seg = 10) => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat);
  m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(m); return m; };
const noAO = (o) => { o.userData.noAO = true; o.userData.noShadow = true; return o; };

/* a building: facade on its four sides (each face its own repeat), a parapet, and optionally rooftop things */
function building(g, { x, z, w, d, top, bottom = -40, seed: s, lit = 0.35, wall = "#1f2538", tint = 0xffffff, fog = true, glow = 0.9, roofStuff = false }) {
  const h = top - bottom, floors = Math.max(2, Math.round(h / 3.2)), bays = Math.max(2, Math.round(w / 3)), lq = Math.round(lit * 10) / 10;
  const fk = [s % 6, wall, tint, fog, glow, lq].join("|");
  if (!FAC.has(fk)) { const f = facade(s % 6 + 1, { lit: lq, wall }); FAC.set(fk, new THREE.MeshStandardMaterial({ color: tint, map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffffff, emissiveIntensity: glow, roughness: 0.9, fog })); }
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * bays / 6, uv.getY(i) * floors / 12);   /* the repeat in the UVs, so buildings share materials */
  const m = add(g, geo, FAC.get(fk), x, bottom + h / 2, z);
  const cap = add(g, new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3), M(0x2a2f40, 0.9, { fog }), x, top + 0.25, z);
  if (roofStuff) {
    const k = rnd(); if (k < 0.5) { add(g, new THREE.CylinderGeometry(1.1, 1.1, 2.2, 14), M(0x4a3a2e, 0.9, { fog }), x - w * 0.2, top + 2.1, z); add(g, new THREE.ConeGeometry(1.2, 0.7, 14), M(0x3a2e26, 0.9, { fog }), x - w * 0.2, top + 3.55, z);
      for (const sx of [-0.7, 0.7]) add(g, new THREE.BoxGeometry(0.12, 1.0, 0.12), M(0x2a2a30, 0.7, { fog }), x - w * 0.2 + sx, top + 0.5, z); }
    add(g, new THREE.BoxGeometry(1.6, 0.9, 1.2), M(0x6a6e78, 0.6, { fog }), x + w * 0.25, top + 0.95, z + d * 0.2);
    add(g, new THREE.CylinderGeometry(0.04, 0.04, 4 + 4 * rnd(), 5), M(0x2a2a30, 0.6, { fog }), x + w * 0.35, top + 2.5, z - d * 0.3);
  }
  return m;
}

/* merge every static mesh under root into one mesh per material (and per shadow/AO flags); subtrees marked keep stay live */
function bake(root) {
  root.updateMatrixWorld(true); const inv = root.matrixWorld.clone().invert(), groups = new Map(), drop = [];
  const walk = (o) => { if (o.userData.keep) return; for (const c of [...o.children]) walk(c);
    if (o === root || !o.isMesh || o.isInstancedMesh) return;
    const u = o.userData, k = o.material.uuid + "|" + !!u.noAO + !!u.noShadow + !!u.noReceive + "|" + o.renderOrder;
    if (!groups.has(k)) groups.set(k, { mat: o.material, ud: { noAO: u.noAO, noShadow: u.noShadow, noReceive: u.noReceive }, ro: o.renderOrder, geos: [] });
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const nm of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(nm)) geo.deleteAttribute(nm);
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); groups.get(k).geos.push(geo); drop.push(o); };
  walk(root); for (const o of drop) o.parent.remove(o);
  for (const { mat, ud, ro, geos } of groups.values()) { const m = new THREE.Mesh(mergeGeometries(geos), mat); Object.assign(m.userData, ud); m.renderOrder = ro; root.add(m); }
  return { meshes: drop.length, draws: groups.size };
}

export function buildRoof(g) {
  const dyn = {};

  /* ======== the deck ======== */
  const tar = surf("tar", { rep: [6, 4.5], size: 512 });
  rbox(g, 12.4, 0.3, 8.6, tar, 0, -0.15, 0.95, { r: 0.04 });
  const coping = surf("concrete", { rep: [8, 0.3], tint: 0xb8b4ac });
  const brickS = surf("brick", { rep: [3, 0.6], tint: 0xc0a090 });
  /* the edge: a low upstand with a concrete coping, and the building's own face dropping 30 m to the street */
  rbox(g, 12.4, 0.28, 0.28, brickS, 0, 0.14, -3.22); rbox(g, 12.6, 0.07, 0.38, coping, 0, 0.31, -3.22, { r: 0.02 });
  for (const sx of [-1, 1]) { rbox(g, 0.3, 0.95, 8.6, surf("brick", { rep: [4.5, 0.9], tint: 0xc0a090 }), sx * 6.15, 0.47, 0.95); rbox(g, 0.42, 0.07, 8.8, surf("concrete", { rep: [6, 0.3], tint: 0xb8b4ac }), sx * 6.15, 0.98, 0.95, { r: 0.02 }); }
  { const f = facade(7, { cols: 8, rows: 18, lit: 0.4, wall: "#3a2a26" }); f.map.repeat.set(1.6, 1.6); f.emissiveMap.repeat.set(1.6, 1.6);
    const face = add(g, new THREE.PlaneGeometry(12.4, 30), new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.9 }), 0, -15.05, -3.36); face.rotation.y = Math.PI; }

  /* ======== the railing: square posts on plates, two rails; the one LOOSE bolt sits on the post at x -1.2, clear of everything ======== */
  const steel = surf("paint", { rep: [1, 4], metal: 0.55, tint: 0x9aa3ad });
  const railX = []; for (let px = -4.8; px <= 4.81; px += 1.2) railX.push(+px.toFixed(2));
  /* the bolts (2026-11-18, the insert re-built: "the bolt reads as a pale cylinder"): every base plate has four hex bolts on washers, so the
     loose one reads by comparison. A bolt is a hex head (flat-shaded, so each face catches the light as it turns) with a chamfered top and a
     flange, on a washer; three sit tight on their washers. The loose one stands about 8 mm proud on its bare, ridged thread and backs out
     on the word BOLT (update). Sizes are an M10's, a little enlarged to read at phone size. */
  const PLATE = 0.014, WASH_H = 0.003, HEX_H = 0.0065, SEAT = PLATE + WASH_H + 0.0012 + HEX_H / 2, LIFT = 0.008;
  const zinc = M(0xd4d9de, 0.3, { metalness: 0.85, flatShading: true }), zincDull = M(0x8a9098, 0.45, { metalness: 0.8, flatShading: true }), washM = M(0xbfc5cc, 0.32, { metalness: 0.85 });
  const threadM = M(0xb8a88e, 0.35, { metalness: 0.8 });
  const washerGeo = new THREE.LatheGeometry([[0.0072, 0], [0.0195, 0], [0.0202, 0.0008], [0.0202, 0.0022], [0.0195, WASH_H], [0.0072, WASH_H]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
  const threadGeo = new THREE.LatheGeometry(Array.from({ length: 19 }, (_, i) => new THREE.Vector2(i % 2 ? 0.0060 : 0.0074, 0.0012 * i)), 16);   /* ridges every 1.2 mm */
  function hexBolt(parent, mat) {
    const h = new THREE.Group(); parent.add(h);
    add(h, new THREE.CylinderGeometry(0.0125, 0.0125, HEX_H, 6), mat, 0, 0, 0);
    add(h, new THREE.CylinderGeometry(0.0104, 0.0125, 0.0016, 6), mat, 0, HEX_H / 2 + 0.0008, 0);   /* the chamfer */
    add(h, new THREE.CylinderGeometry(0.0138, 0.0138, 0.0012, 24), mat, 0, -HEX_H / 2 - 0.0006, 0);  /* the flange */
    add(h, new THREE.CylinderGeometry(0.0062, 0.0062, 0.0006, 16), mat, 0, HEX_H / 2 + 0.0019, 0);   /* the stub end of the thread */
    return h;
  }
  for (const px of railX) {
    rbox(g, 0.055, 1.08, 0.055, steel, px, 0.54, -3.0, { r: 0.008 });
    rbox(g, 0.17, 0.014, 0.17, surf("paint", { rep: [1, 1], metal: 0.5, tint: 0x8a9098 }), px, 0.007, -3.0, { r: 0.004 });
    for (const [bx, bz] of [[-0.055, -0.055], [0.055, -0.055], [-0.055, 0.055], [0.055, 0.055]]) {
      const loose = px === -1.2 && bx > 0 && bz > 0, x = px + bx, z = -3.0 + bz;
      add(g, washerGeo, washM, x, PLATE, z);
      if (!loose) { const b = hexBolt(g, px === -1.2 ? zinc : zincDull); b.position.set(x, SEAT, z); b.rotation.y = (x * 37.1 + z * 11.3) % 1.047; continue; }   /* the loose bolt's post gets the clean zinc too, for the comparison in the insert */
      const b = hexBolt(g, zinc); b.position.set(x, SEAT + LIFT, z); b.userData.keep = true; dyn.bolt = b; dyn.boltSeat = SEAT; dyn.boltLift = LIFT;
      add(g, threadGeo, threadM, x, PLATE + WASH_H, z).userData.keep = true;   /* bare thread shows under the raised head */
      /* a ring of clean metal on the washer where the head used to sit (the rest of the plate is dull): the tell that it has moved */
      const ring = add(g, new THREE.RingGeometry(0.0078, 0.0132, 28), M(0xeef2f6, 0.15, { metalness: 0.95 }), x, PLATE + WASH_H + 0.0002, z); ring.rotation.x = -Math.PI / 2; ring.userData.keep = true;
    }
  }
  for (const y of [1.08, 0.56]) rbox(g, 9.75, 0.05, 0.05, steel, 0, y, -3.0, { r: 0.012 });
  /* a rust bloom on the post with the loose bolt: the eye goes there in the wide shot too */
  { const rust = add(g, new THREE.PlaneGeometry(0.044, 0.07), new THREE.MeshStandardMaterial({ color: 0x4a2a1c, roughness: 0.95, alphaMap: soft(), transparent: true, opacity: 0.5, depthWrite: false }), -1.2, 0.045, -2.971); rust.userData.noAO = true; rust.userData.keep = true; }   /* inside the 55 mm face, soft-edged (it was 70 mm, solid, and read as a board in the insert; then a 16 cm oval read as a sticker) */

  /* ======== the stair bulkhead (behind and right): brick, a door ajar with warm light, a caged lamp, a vent with steam, a fan ======== */
  { const bx = 4.2, bz = 2.5;
    rbox(g, 2.1, 2.5, 2.1, surf("brick", { rep: [1.6, 1.9], tint: 0xb89080 }), bx, 1.25, bz, { r: 0.03 }); rbox(g, 2.3, 0.12, 2.3, coping, bx, 2.55, bz);
    add(g, new THREE.PlaneGeometry(0.85, 1.95), B(0xb88050), bx - 0.1, 0.98, bz - 1.056).userData.noShadow = true;   /* the lit stairwell through the open door */
    const door = rbox(g, 0.85, 1.95, 0.05, surf("paint", { rep: [1, 2], tint: 0x5a7a6a }), bx - 0.1 - 0.42, 0.98, bz - 1.06 - 0.42, { ry: -1.2 }); door.position.x += 0.0;
    const cage = add(g, new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd8a0, emissiveIntensity: 3 }), bx - 0.1, 2.15, bz - 1.13);
    const lampL = new THREE.PointLight(0xffc890, 2.2, 6, 1.6); lampL.position.copy(cage.position); g.add(lampL);
    const spill = new THREE.SpotLight(0xffb070, 3.5, 9, 0.62, 0.7, 1.4); spill.position.set(bx - 0.1, 1.5, bz - 0.7); spill.target.position.set(bx - 2.2, 0, bz - 3.5); spill.castShadow = false;   /* its shadow pass cost more than it showed (render cost, 2026-11-18) */
    spill.shadow.mapSize.set(512, 512); spill.shadow.bias = -0.0006; g.add(spill, spill.target);
    rbox(g, 1.0, 0.65, 0.85, M(0x8a9098, 0.45, { metalness: 0.4 }), bx - 0.4, 2.95, bz + 0.3, { r: 0.04 });   /* the AC unit on top */
    const fan = new THREE.Group(); fan.position.set(bx - 0.4, 3.29, bz + 0.3); g.add(fan); for (let i = 0; i < 5; i++) { const bl = rbox(fan, 0.34, 0.012, 0.09, M(0x2a2e34, 0.5), 0.17, 0, 0, { r: 0.004 }); bl.geometry.translate(0, 0, 0); const p = new THREE.Group(); p.rotation.y = (i / 5) * Math.PI * 2; p.add(bl); fan.add(p); }
    dyn.fan = fan; fan.userData.keep = true;
    tube(g, [bx + 0.6, 2.6, bz - 0.5], [bx + 0.6, 3.7, bz - 0.5], 0.09, M(0x9aa0a8, 0.4, { metalness: 0.7 }));
    dyn.steamAt = [[bx + 0.6, 3.75, bz - 0.5], [-3.4, 0.95, 1.6]];
    tube(g, [-3.4, 0, 1.6], [-3.4, 0.85, 1.6], 0.12, M(0x9aa0a8, 0.4, { metalness: 0.7 })); add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.08, 14), M(0x9aa0a8, 0.4, { metalness: 0.7 }), -3.4, 0.9, 1.6);
    /* a mast with a red light */
    tube(g, [bx + 0.5, 2.6, bz + 0.6], [bx + 0.5, 6.2, bz + 0.6], 0.03, M(0x4a4e56, 0.5, { metalness: 0.6 }));
    dyn.mastLamp = add(g, new THREE.SphereGeometry(0.06, 10, 8), B(0xff2a1a), bx + 0.5, 6.25, bz + 0.6); noAO(dyn.mastLamp); dyn.mastLamp.userData.keep = true;
  }

  /* ======== where they sit: two folding chairs, a crate with two bottles and a lantern, a blanket, planters (none near the bolt) ======== */
  const woodM = (rep = [1, 1], tint = 0xffffff) => surf("wood", { rep, tint });
  for (const [cx, cz, r, tint] of [[1.2, -1.0, -0.4, 0xd8b890], [-1.0, -0.6, 0.5, 0xc0a080]]) { const c = new THREE.Group(); c.position.set(cx, 0, cz); c.rotation.y = r; g.add(c);
    for (let i = 0; i < 4; i++) rbox(c, 0.46, 0.025, 0.09, woodM([1, 0.2], tint), 0, 0.45, -0.16 + i * 0.105, { r: 0.008 });
    for (let i = 0; i < 3; i++) rbox(c, 0.46, 0.09, 0.025, woodM([1, 0.2], tint), 0, 0.62 + i * 0.12, -0.22, { r: 0.008, rx: -0.12 });
    for (const s of [-1, 1]) { tube(c, [s * 0.21, 0, 0.2], [s * 0.21, 0.92, -0.26], 0.012, M(0x30343a, 0.4, { metalness: 0.7 })); tube(c, [s * 0.21, 0, -0.22], [s * 0.21, 0.44, 0.16], 0.012, M(0x30343a, 0.4, { metalness: 0.7 })); } }
  /* a blanket over the left chair: a soft slab in mustard and brick (not the sibling's teal) */
  { const bl = rbox(g, 0.5, 0.02, 0.7, M(0xb8862e, 0.95), -1.0, 0.5, -0.55, { r: 0.01, ry: 0.5, rx: 0.08 }); bl.position.y = 0.48; rbox(g, 0.5, 0.022, 0.08, M(0x8a3a2a, 0.95), -1.0 + 0.1, 0.49, -0.34, { r: 0.008, ry: 0.5 }); }
  rbox(g, 0.52, 0.42, 0.4, woodM([1, 1]), 0.1, 0.21, -0.75, { r: 0.015 });
  add(g, new THREE.CylinderGeometry(0.032, 0.036, 0.2, 14), M(0x1fb5a8, 0.12, { transparent: true, opacity: 0.85 }), -0.02, 0.52, -0.78);
  add(g, new THREE.CylinderGeometry(0.032, 0.036, 0.2, 14), M(0xff7a1a, 0.12, { transparent: true, opacity: 0.85 }), 0.2, 0.52, -0.66);
  { const lx = 0.18, lz = -0.86; add(g, new THREE.CylinderGeometry(0.055, 0.06, 0.03, 12), M(0x2a2a2e, 0.4, { metalness: 0.7 }), lx, 0.435, lz);
    add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.13, 12, 1, true), M(0xfff0d0, 0.1, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), lx, 0.515, lz);
    dyn.flame = add(g, new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffa040, emissiveIntensity: 4 }), lx, 0.5, lz);
    add(g, new THREE.ConeGeometry(0.06, 0.05, 12), M(0x2a2a2e, 0.4, { metalness: 0.7 }), lx, 0.605, lz);
    dyn.flame.userData.keep = true;
    /* a small fill on the loose bolt, motivated by the lantern beside it, so the insert reads */
    dyn.lantern = new THREE.PointLight(0xffa860, 1.4, 3.2, 1.5); dyn.lantern.position.set(lx, 0.55, lz); g.add(dyn.lantern); }
  const leafM = [0x2f7a3a, 0x3f9a46, 0x24602e, 0x58a84a].map((c) => M(c, 0.85));
  function planter(px, pz, w, d, ry = 0) {
    const p = new THREE.Group(); p.position.set(px, 0, pz); p.rotation.y = ry; g.add(p);
    rbox(p, w, 0.4, d, woodM([w, 0.4], 0xb08a68), 0, 0.2, 0, { r: 0.02 });
    const n = Math.round(w * 9); for (let i = 0; i < n; i++) { const r = 0.09 + 0.09 * rnd(); add(p, new THREE.IcosahedronGeometry(r, 1), leafM[i % 4], (rnd() - 0.5) * (w - 0.15), 0.42 + 0.25 * rnd() * (r / 0.18), (rnd() - 0.5) * (d - 0.1)); }
    for (let i = 0; i < n / 3; i++) add(p, new THREE.SphereGeometry(0.025, 8, 6), M([0xd8363a, 0xf2a0c0, 0xf0e8d8][i % 3], 0.6), (rnd() - 0.5) * (w - 0.2), 0.58 + 0.12 * rnd(), (rnd() - 0.5) * (d - 0.15));
  }
  planter(2.6, -2.6, 1.4, 0.45); planter(-3.4, -2.6, 1.2, 0.45); planter(5.5, -0.4, 0.45, 2.0); planter(5.5, 2.2, 0.45, 1.0, 0.0);
  /* a tall potted tree in the back-left corner, out of every close shot, to give the wide its silhouette */
  { rbox(g, 0.55, 0.55, 0.55, surf("concrete", { rep: [1, 1], tint: 0x8a8680 }), -5.2, 0.28, 2.6, { r: 0.04 }); tube(g, [-5.2, 0.5, 2.6], [-5.15, 2.0, 2.55], 0.04, M(0x5a3e2a, 0.9));
    for (let i = 0; i < 16; i++) add(g, new THREE.IcosahedronGeometry(0.22 + 0.12 * rnd(), 1), leafM[i % 4], -5.2 + (rnd() - 0.5) * 0.9, 2.0 + rnd() * 0.8, 2.6 + (rnd() - 0.5) * 0.9); }

  /* ======== the string lights: three strands, poles at the railing corners; bulbs breathe and the strands sway in the wind ======== */
  const poleM = woodM([0.3, 2], 0x9a7a5a);
  for (const px of [-5.3, 5.3]) rbox(g, 0.09, 2.7, 0.09, poleM, px, 1.35, -2.75, { r: 0.015 });
  const strands = [ { a: [-5.3, 2.62, -2.75], b: [5.3, 2.62, -2.75], n: 22, sag: 0.42 }, { a: [-5.3, 2.62, -2.75], b: [3.2, 2.45, 1.4], n: 20, sag: 0.55 }, { a: [5.3, 2.62, -2.75], b: [3.2, 2.45, 1.4], n: 9, sag: 0.3 } ];
  /* the bulbs in one instanced draw, their halos in one points draw (they were 94 draws) */
  const NB = strands.reduce((a, s) => a + s.n - 1, 0), bulbI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 10, 8), B(0xffffff), NB); bulbI.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < NB; i++) bulbI.setColorAt(i, new THREE.Color(1, 1, 1)); g.add(bulbI); bulbI.userData.noShadow = true;
  const haloG = new THREE.BufferGeometry(); haloG.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(NB * 3), 3));
  const halos = new THREE.Points(haloG, new THREE.PointsMaterial({ map: soft(), color: 0xffa050, size: 0.26, sizeAttenuation: true, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(halos); noAO(halos);
  dyn.bulbI = bulbI; dyn.halos = halos; let bi = 0;
  dyn.strands = strands.map((s, si) => {
    const bulbs = []; for (let i = 1; i < s.n; i++) bulbs.push({ idx: bi++, u: i / s.n, k: i });
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(41 * 3), 3)); const wire = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x141414 })); g.add(wire); noAO(wire);
    return { ...s, si, bulbs, wire };
  });
  for (const p of [[-1.4, 2.2, -2.6], [1.2, 2.15, -1.2]]) { const l = new THREE.PointLight(0xffb870, 2.6, 7.5, 1.5); l.position.set(...p); g.add(l); }

  /* ======== steam ======== */
  const steamMat = new THREE.SpriteMaterial({ map: soft(), color: 0xc8cde0, transparent: true, opacity: 0, depthWrite: false });
  dyn.steam = []; for (const [i, at] of dyn.steamAt.entries()) for (let k = 0; k < 10; k++) { const s = new THREE.Sprite(steamMat.clone()); g.add(s); noAO(s); dyn.steam.push({ s, at, ph: k / 10 + 0.07 * i }); }

  const nCity = g.children.length;
  /* ======== the neighbouring lower roof (y -6), in front of the city: its own tank, skylight, a lit bar of windows, its own small lights ======== */
  { const nx = -2.5, nz = -14, top = -6;
    building(g, { x: nx, z: nz, w: 16, d: 12, top, bottom: -40, seed: 3, lit: 0.45, wall: "#3a2c2a" });
    rbox(g, 16, 0.2, 12, surf("tar", { rep: [5, 4] }), nx, top + 0.1, nz, { r: 0.02 });
    add(g, new THREE.CylinderGeometry(1.0, 1.0, 2.0, 16), surf("wood", { rep: [3, 1], tint: 0x9a7050 }), nx - 4.5, top + 2.6, nz + 1.5); add(g, new THREE.ConeGeometry(1.1, 0.7, 16), M(0x4a3a30, 0.8), nx - 4.5, top + 3.95, nz + 1.5);
    for (const [sx, sz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) add(g, new THREE.BoxGeometry(0.1, 1.6, 0.1), M(0x2a2a30, 0.6), nx - 4.5 + sx, top + 0.8, nz + 1.5 + sz);
    const sky = add(g, new THREE.BoxGeometry(3, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x2a3a58, emissiveIntensity: 0.9 }), nx + 3, top + 0.45, nz + 2); sky.userData.noShadow = true;
    for (let i = 0; i < 3; i++) rbox(g, 1.2, 0.8, 1.0, M(0x7a808a, 0.5, { metalness: 0.4 }), nx + 5.5, top + 0.6, nz - 3 + i * 1.6, { r: 0.05 });
    /* their own string of lights, smaller and colder, far away */
    for (let i = 0; i < 14; i++) { const u = i / 13, p = [nx - 6 + 12 * u, top + 2.2 - Math.sin(Math.PI * u) * 0.5, nz + 4.5]; add(g, new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: [0xff9a50, 0x9ad0ff, 0xff7a8a][i % 3], emissiveIntensity: 3 }), ...p); }
  }

  /* ======== the city: near towers, the mid city in the fog, a far skyline in its own haze, beacons, a viaduct with traffic ======== */
  const near = [[-16, -46, 10, 10, -2], [-3, -58, 9, 9, 6], [9, -44, 8, 10, -5], [19, -55, 12, 10, 3], [30, -40, 9, 8, -8], [-28, -42, 9, 9, -6], [4, -78, 12, 10, 16], [-14, -80, 9, 9, 4]];   /* we are on a tall roof: the near towers stand lower, the skyline rises behind */
  dyn.beacons = [];
  near.forEach(([x, z, w, d, top], i) => { building(g, { x, z, w, d, top, seed: 20 + i, lit: 0.3 + 0.15 * rnd(), wall: ["#232a3e", "#2c2636", "#262c34"][i % 3], roofStuff: true, glow: 0.85 });
    if (top > 10) { const b = add(g, new THREE.SphereGeometry(0.35, 10, 8), B(0xff3020), x, top + 1.0, z); noAO(b); dyn.beacons.push({ m: b, ph: i * 0.37 }); b.userData.keep = true; } });
  /* a rooftop sign on a near tower: a plain lit panel (no letters: C1 reads letter-like shapes as captions) */
  { const sg = add(g, new THREE.BoxGeometry(6, 2, 0.3), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x1fd0c0, emissiveIntensity: 1.6 }), 4, 16 + 2.2, -72.8); noAO(sg); dyn.sign = sg; sg.userData.keep = true; }
  for (let i = 0; i < 34; i++) { const x = -110 + i * 6.6 + rnd() * 3, z = -95 - rnd() * 45, w = 5 + rnd() * 7, top = -14 + rnd() * 26;
    building(g, { x, z, w, d: 6 + rnd() * 6, top, seed: 60 + i, lit: 0.28, wall: "#1d2236", glow: 0.75, roofStuff: rnd() < 0.3 }); }
  const farHaze = new THREE.Color(0x3a3a68);
  for (let i = 0; i < 46; i++) { const x = -200 + i * 9 + rnd() * 5, z = -170 - rnd() * 60, w = 6 + rnd() * 9, top = 0 + rnd() * 55 * (0.4 + 0.6 * Math.sin(Math.PI * (i / 46)));
    const m = building(g, { x, z, w, d: 8, top, bottom: -60, seed: 120 + i, lit: 0.18, wall: "#2a2c52", tint: farHaze.getHex(), fog: false, glow: 0.45 }); noAO(m);
    if (top > 40) { const b = add(g, new THREE.SphereGeometry(0.7, 8, 6), B(0xff4030, { fog: false }), x, top + 1.5, z); noAO(b); dyn.beacons.push({ m: b, ph: i * 0.23 }); b.userData.keep = true; } }
  /* the glow of the streets between the layers: warm at the bottom, fading up */
  { const c = document.createElement("canvas"); c.width = 4; c.height = 128; const x = c.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, "rgba(255,140,70,0)"); gr.addColorStop(0.65, "rgba(255,130,70,0.18)"); gr.addColorStop(1, "rgba(255,150,80,0.42)"); x.fillStyle = gr; x.fillRect(0, 0, 4, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    for (const [z, y, w, h] of [[-60, -14, 300, 40], [-140, -6, 500, 60]]) { const p = add(g, new THREE.PlaneGeometry(w, h), B(0xffffff, { map: t, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }), 0, y, z); noAO(p); } }
  /* the viaduct: a band of deck lights at y -8, z -105, and two streams of traffic (white one way, red the other) */
  { add(g, new THREE.BoxGeometry(400, 0.8, 4), M(0x1a1c28, 0.9), 0, -9, -105); for (let i = 0; i < 40; i++) { const l = add(g, new THREE.SphereGeometry(0.3, 6, 4), B(0xffb060), -200 + i * 10, -7.6, -103); noAO(l); }
    const N = 70, geo = new THREE.SphereGeometry(0.28, 6, 4), car = new THREE.InstancedMesh(geo, B(0xffffff), N); car.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < N; i++) car.setColorAt(i, new THREE.Color(i % 2 ? 0xff3a2a : 0xfff2d8)); g.add(car); noAO(car); dyn.cars = { car, N, off: Array.from({ length: N }, () => rnd()) }; }
  /* windows going on and off on the near towers (a few at a time), and two TV-blue windows that flicker */
  { const info = [];
    near.forEach(([x, z, w, d, top], bi) => { for (let k = 0; k < 11; k++) { const fx = x + (Math.floor(rnd() * Math.max(2, Math.round(w / 3))) + 0.5) * (w / Math.max(2, Math.round(w / 3))) - w / 2, fy = -30 + Math.floor(rnd() * ((top + 30) / 3.2)) * 3.2 + 1.6; info.push({ p: [fx, Math.min(fy, top - 1), z + d / 2 + 0.06], per: 5 + 14 * rnd(), ph: rnd(), duty: 0.35 + 0.4 * rnd(), tv: info.length % 37 === 5 }); } });
    /* sized to the windows placed: it was a fixed 90 for 88 windows, and the 2 unplaced instances stood at the roof's origin in white (the
       "white glow bottom-left" of the wide, 2026-11-18; three.js fills unset instance colours with 1) */
    const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.75, 0.95), B(0xffffff), info.length);
    const mtx = new THREE.Matrix4(); info.forEach((w, i) => { mtx.makeTranslation(...w.p); inst.setMatrixAt(i, mtx); inst.setColorAt(i, new THREE.Color(0)); }); g.add(inst); noAO(inst); dyn.win = { inst, info }; }

  /* ======== the sky: a gradient dome, stars, a moon with a halo, slow cloud ======== */
  { const c = document.createElement("canvas"); c.width = 4; c.height = 256; const x = c.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "#060a1c"); gr.addColorStop(0.42, "#141c3e"); gr.addColorStop(0.5, "#2a2a58"); gr.addColorStop(0.56, "#5a3a62"); gr.addColorStop(0.62, "#7a4a5a"); gr.addColorStop(1, "#2a1e2a"); x.fillStyle = gr; x.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const dome = add(g, new THREE.SphereGeometry(330, 32, 16), B(0xffffff, { map: t, side: THREE.BackSide, fog: false, depthWrite: false }), 0, -30, 0); noAO(dome); dome.renderOrder = -10;
    const sp = []; for (let i = 0; i < 500; i++) { const a = rnd() * Math.PI * 2, e = 0.12 + rnd() * 1.2; sp.push(300 * Math.cos(e) * Math.sin(a), 300 * Math.sin(e) - 30, -Math.abs(300 * Math.cos(e) * Math.cos(a))); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })); g.add(stars); noAO(stars);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: 0xfff4e0, fog: false })); moon.scale.setScalar(16); moon.position.set(-70, 95, -260); g.add(moon); noAO(moon);
    add(g, new THREE.CircleGeometry(4.2, 32), B(0xfff6e8, { fog: false }), -70, 95, -259);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: 0x8aa0ff, fog: false, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(70); halo.position.set(-70, 95, -262); g.add(halo); noAO(halo);
    /* cloud: a seamless noise alpha, drifting slowly left to right */
    const cc = document.createElement("canvas"); cc.width = 256; cc.height = 128; const cx = cc.getContext("2d"), id = cx.createImageData(256, 128);
    for (let y = 0; y < 128; y++) for (let xx = 0; xx < 256; xx++) { const n = fbm(xx / 256, y / 128, 3, 5, 51), a = Math.max(0, n - 0.48) * 2.6 * Math.sin(Math.PI * y / 128); const i = (y * 256 + xx) * 4; id.data[i] = 150; id.data[i + 1] = 140; id.data[i + 2] = 190; id.data[i + 3] = 255 * Math.min(1, a); }
    cx.putImageData(id, 0, 0); const ct = new THREE.CanvasTexture(cc); ct.colorSpace = THREE.SRGBColorSpace; ct.wrapS = THREE.RepeatWrapping;
    dyn.clouds = [[60, -230, 420, 90, 0.5], [95, -250, 520, 110, 0.35]].map(([y, z, w, h, o]) => { const t2 = ct.clone(); t2.needsUpdate = true; const m = add(g, new THREE.PlaneGeometry(w, h), B(0xffffff, { map: t2, transparent: true, opacity: o, fog: false, depthWrite: false }), 0, y, z); noAO(m); return t2; });
    /* a plane crossing high up, a white strobe and a red beacon */
    const pl = new THREE.Group(); g.add(pl); dyn.plane = pl; pl.userData.keep = true; pl.add(add(new THREE.Group(), new THREE.SphereGeometry(0.6, 6, 4), B(0xffffff, { fog: false }), 0, 0, 0)); dyn.planeW = pl.children[0];
    dyn.planeR = add(pl, new THREE.SphereGeometry(0.5, 6, 4), B(0xff3020, { fog: false }), 2.4, 0, 0); noAO(dyn.planeW); noAO(dyn.planeR);
  }

  /* ======== bake: every static mesh merged into one per material. The city, the neighbour roof and the sky neither cast nor
     receive shadows (look.js reads noShadow / noReceive). The first roof render took 4.1 s a frame against the draft's 0.21. ======== */
  const basic = new Map(), toBasic = (m) => { if (!m.isMeshStandardMaterial) return m; if (!basic.has(m.uuid)) {
      const e = m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0 && !m.map, c = e ? m.emissive.clone().multiplyScalar(m.emissiveIntensity) : m.color.clone().multiplyScalar(m.map ? 0.6 + 0.45 * m.emissiveIntensity : 0.32);
      basic.set(m.uuid, new THREE.MeshBasicMaterial({ color: c, map: m.map, fog: m.fog, transparent: m.transparent, opacity: m.opacity, side: m.side })); } return basic.get(m.uuid); };
  g.children.slice(nCity).forEach((o) => o.traverse((c) => { c.userData.noShadow = true; c.userData.noReceive = true; if (c.isMesh && !c.userData.keep && !(c.parent && c.parent.userData.keep)) c.material = toBasic(c.material); }));
  dyn.baked = bake(g);

  /* ======== life ======== */
  function update(T, cue = {}) {
    /* the loose bolt: it sits 8 mm proud and shivers in the wind; on the word BOLT (cue.bolt) it backs out another sixth of a turn and
       1.5 mm, in two small jerks, the way a vibrating nut walks. Pure function of T. */
    { const tb = cue.bolt ?? 1e9, step = (u) => Math.min(1, Math.max(0, u)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, u)));
      const k = 0.55 * step((T - tb + 0.05) / 0.12) + 0.45 * step((T - tb - 0.45) / 0.12), shiver = 0.0004 * Math.sin(T * 41) * Math.sin(T * 3.3);
      dyn.bolt.rotation.y = 0.35 + 0.025 * Math.sin(T * 2.1) - k * Math.PI / 3;
      dyn.bolt.position.y = dyn.boltSeat + dyn.boltLift + 0.0015 * k + shiver; }
    /* string lights: the wind sways each strand; bulbs breathe out of phase */
    const mtx = new THREE.Matrix4(), col = new THREE.Color();
    const wind = (t, s) => 0.6 * Math.sin(t * 0.83 + s) + 0.4 * Math.sin(t * 1.71 + 2 * s);
    for (const S of dyn.strands) {
      const A = new THREE.Vector3(...S.a), Bv = new THREE.Vector3(...S.b), dir = Bv.clone().sub(A), perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      const at = (u) => { const p = A.clone().addScaledVector(dir, u), sg = Math.sin(Math.PI * u); p.y -= S.sag * sg * (1 + 0.05 * wind(T, S.si)); p.addScaledVector(perp, 0.07 * sg * wind(T * 1.1, S.si + u * 1.3)); return p; };
      const pos = S.wire.geometry.attributes.position; for (let i = 0; i <= 40; i++) { const p = at(i / 40); pos.setXYZ(i, p.x, p.y, p.z); } pos.needsUpdate = true;
      for (const b of S.bulbs) { const p = at(b.u); p.y -= 0.05; mtx.makeTranslation(p.x, p.y, p.z); dyn.bulbI.setMatrixAt(b.idx, mtx); dyn.halos.geometry.attributes.position.setXYZ(b.idx, p.x, p.y, p.z);
        const k = 2.3 + 0.5 * Math.sin(T * 1.9 + b.k * 1.7 + S.si), hue = [[1, 0.72, 0.4], [1, 0.66, 0.34], [1, 0.8, 0.52]][b.k % 3]; col.setRGB(hue[0] * k, hue[1] * k, hue[2] * k); dyn.bulbI.setColorAt(b.idx, col); }
    }
    dyn.bulbI.instanceMatrix.needsUpdate = true; dyn.bulbI.instanceColor.needsUpdate = true; dyn.halos.geometry.attributes.position.needsUpdate = true;
    /* the lantern flame */
    const fl = 1 + 0.12 * Math.sin(T * 11.3) + 0.08 * Math.sin(T * 17.9 + 1.2) + 0.05 * Math.sin(T * 5.1); dyn.lantern.intensity = 1.4 * fl; dyn.flame.scale.set(1, 1.2 * fl, 1);
    dyn.fan.rotation.y = T * 2.6;
    for (const p of dyn.steam) { const u = (T * 0.32 + p.ph) % 1, [x, y, z] = p.at; p.s.position.set(x + 0.35 * u * u + 0.04 * Math.sin(T * 2 + p.ph * 9), y + 1.3 * u, z - 0.12 * u); p.s.scale.setScalar(0.18 + 0.75 * u); p.s.material.opacity = 0.22 * Math.sin(Math.PI * u) ** 1.5; }
    for (const b of dyn.beacons) { const k = 0.5 + 0.5 * Math.cos(2 * Math.PI * (T * 0.5 + b.ph)); b.m.material.color.setRGB(0.25 + 0.75 * k ** 3, 0.06 + 0.1 * k ** 3, 0.04); }
    { const k = 0.5 + 0.5 * Math.cos(2 * Math.PI * T * 0.6); dyn.mastLamp.material.color.setRGB(0.3 + 0.7 * k ** 2, 0.05, 0.03); }
    dyn.sign.material.emissiveIntensity = 1.5 + 0.12 * Math.sin(T * 0.7);
    /* traffic on the viaduct: two lanes, constant speed, wrapping */
    { const { car, N, off } = dyn.cars, m = new THREE.Matrix4(); for (let i = 0; i < N; i++) { const dirn = i % 2 ? -1 : 1, x = ((off[i] * 400 + dirn * T * 13 + 200) % 400 + 400) % 400 - 200; m.makeTranslation(x, -8.1, -105 + (i % 2 ? -0.9 : 0.9)); car.setMatrixAt(i, m); } car.instanceMatrix.needsUpdate = true; }
    /* windows on and off; a TV flicker */
    { const { inst, info } = dyn.win, c = new THREE.Color(); info.forEach((w, i) => { const on = ((T / w.per + w.ph) % 1) < w.duty;
      if (w.tv) { const f = 0.55 + 0.25 * Math.sin(T * 7.1 + i) + 0.2 * Math.sin(T * 12.7 + 2 * i); c.setRGB(0.35 * f, 0.5 * f, 0.9 * f); } else if (on) c.setRGB(0.85, 0.48, 0.24); else c.setRGB(0, 0, 0);
      inst.setColorAt(i, c); }); inst.instanceColor.needsUpdate = true; }
    dyn.clouds.forEach((t, i) => { t.offset.x = T * (0.0016 + 0.0008 * i); });
    { const u = ((T + 8) / 70) % 1; dyn.plane.position.set(-160 + 320 * u, 70 + 6 * u, -200); dyn.planeW.material.color.setScalar(((T * 1.0) % 1) < 0.08 ? 1 : 0.05); dyn.planeR.material.color.setRGB(0.3 + 0.7 * (0.5 + 0.5 * Math.cos(T * 4)), 0.05, 0.03); }
  }

  /* the image-based light for this set: a night sky over a city, generated here, so the railing and the bottles reflect city light */
  function env(renderer) {
    const es = new THREE.Scene(), c = document.createElement("canvas"); c.width = 4; c.height = 128; const x = c.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, "#0a1230"); gr.addColorStop(0.45, "#26305e"); gr.addColorStop(0.55, "#7a5068"); gr.addColorStop(0.7, "#3a2a30"); gr.addColorStop(1, "#0e0c10"); x.fillStyle = gr; x.fillRect(0, 0, 4, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide })));
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r = 40, p = new THREE.Mesh(new THREE.PlaneGeometry(2 + 3 * rnd(), 1 + 4 * rnd()), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.07 + 0.05 * rnd(), 0.8, 0.45 + 0.2 * rnd()), side: THREE.DoubleSide }));
      p.position.set(r * Math.sin(a), -2 + 6 * rnd(), r * Math.cos(a)); p.lookAt(0, 0, 0); es.add(p); }
    const warm = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb060 })); warm.position.set(0, 6, 6); es.add(warm);   /* the string lights above */
    const pm = new THREE.PMREMGenerator(renderer); const tex = pm.fromScene(es, 0.03).texture; pm.dispose(); return tex;
  }

  return { dyn, update, env };
}
