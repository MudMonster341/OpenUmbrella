/* sets.js — the places away from the bus stop: the shop where the lead works (with the sign that falls), a parked car whose
   door opens into the cycle lane, and the underpass stairs. Same rules as world.js: every moving thing is a pure
   function of world time tw, so any frame can be rendered alone. No images: canvas textures only.

   buildSets(parent, cfg, P) -> { group, update(tw), anchors, meshCount }
   cfg.night       bool, as world.js
   cfg.sets        { shopX = 28, carX = -24, stairsX = -30,
                     signFall: { t0 },   the sign drops t0 .. t0 + 0.7 s (absent = it never falls)
                     carDoor:  { t0 } }  the driver door opens 0.35 s from t0, then bounces on its stop (absent = stays shut)
   anchors (THREE.Vector3, world): shopWindow, shopInside, shopCounter, shopDoor, signBracket, signLand, carDoor, carDriver,
                                   stairsTop, stairsMid, stairsBottom, stairsLight

   The ground in world.js is flat, so the stairs cannot go below it: the underpass sits on a raised block ("the top" is
   y = 3.0, the bottom is y = 0) with a roofed passage at the bottom. From the stairs the difference cannot be seen. */
import * as THREE from "three";
import { rb, paving } from "./detail.js";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rng = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const std = (hex, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, ...extra });
const glow = (hex) => new THREE.MeshBasicMaterial({ color: hex });
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (repeat) t.repeat.set(...repeat); return t;
}

export function buildSets(parent, cfg, P = cfg.palette) {
  const G = new THREE.Group(); parent.add(G);
  const live = [];
  const night = !!cfg.night, S = cfg.sets || {};
  const dim = night ? (P?.nightDim ?? 0.38) : 1;
  const anchors = {};
  const add = (g, m, x, y, z, shadow = true) => { m.position.set(x, y, z); if (shadow) { m.castShadow = true; m.receiveShadow = true; } g.add(m); return m; };
  const box = (g, w, h, d, mat, x, y, z, r = 0.03, shadow = true) => add(g, rb(w, h, d, mat, r), x, y, z, shadow);

  /* ================= 1. THE SHOP ================= */
  const SX = S.shopX ?? 28, ZF = -5.0;                       /* front face of the shop at z = ZF; depth 4 m back to -9 */
  const shop = new THREE.Group(); G.add(shop);
  const wallHex = 0xb9786a;
  const wallM = std(new THREE.Color(wallHex).multiplyScalar(Math.max(dim, 0.6)).getHex(), 0.9);
  const trimM = std(new THREE.Color(0xe9e2d2).multiplyScalar(Math.max(dim, 0.5)).getHex(), 0.7);
  const woodM = std(0x8a5a36, 0.6), darkM = std(0x2b3038, 0.5, { metalness: 0.3 });
  const inWall = std(0xe6d5b8, 0.95);                        /* the inside is lit from within, so it keeps its colour at night */

  /* a pavement strip in front, so the shop does not stand on the grass (world.js pavement ends at z = -4.2) */
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(15, 0.85), new THREE.MeshStandardMaterial({ map: paving([6, 0.4]), roughness: 0.88 })); m.rotation.x = -Math.PI / 2; m.position.set(SX, 0.006, -4.6); m.receiveShadow = true; shop.add(m); }

  /* shell: front wall with a window and a door, side walls, back wall, ceiling, a floor storey above */
  const fz = ZF - 0.12;
  box(shop, 0.6, 3.6, 0.24, wallM, SX - 3.2, 1.8, fz, 0.02);                           /* left pillar */
  box(shop, 4.4, 0.8, 0.24, wallM, SX - 0.7, 0.4, fz, 0.02);                           /* stall riser under the window */
  box(shop, 0.4, 3.6, 0.24, wallM, SX + 1.7, 1.8, fz, 0.02);                           /* pillar between window and door */
  box(shop, 0.6, 3.6, 0.24, wallM, SX + 3.2, 1.8, fz, 0.02);                           /* right pillar */
  box(shop, 7.0, 1.2, 0.24, wallM, SX, 3.0, fz, 0.02);                                 /* lintel (y 2.4 .. 3.6) */
  box(shop, 4.5, 0.08, 0.34, trimM, SX - 0.7, 0.84, ZF + 0.08, 0.02);                  /* sill */
  box(shop, 7.4, 0.16, 0.5, trimM, SX, 3.62, ZF + 0.02, 0.03);                         /* cornice over the ground floor */
  box(shop, 0.2, 3.6, 4.0, wallM, SX - 3.5, 1.8, -7.0, 0.02);                          /* left wall */
  box(shop, 0.2, 3.6, 4.0, wallM, SX + 3.5, 1.8, -7.0, 0.02);                          /* right wall */
  box(shop, 7.0, 3.6, 0.2, inWall, SX, 1.8, -8.9, 0.02);                               /* back wall (inside colour) */
  box(shop, 7.0, 0.2, 4.0, std(0x8c8478, 0.9), SX, 3.5, -7.0, 0.02);                   /* ceiling slab */
  box(shop, 7.2, 2.5, 4.2, wallM, SX, 4.95, -7.0, 0.05);                               /* the flat above */
  box(shop, 7.4, 0.2, 4.4, trimM, SX, 6.3, -7.0, 0.04);                                /* parapet cap */
  for (const dx of [-1.8, 1.8]) {                                                        /* two lit windows upstairs */
    box(shop, 1.1, 1.3, 0.1, trimM, SX + dx, 5.0, ZF + 0.14, 0.02);
    add(shop, new THREE.Mesh(new THREE.PlaneGeometry(0.88, 1.08), glow(night ? 0x5a4a38 : 0x2a3550)), SX + dx, 5.0, ZF + 0.2, false);
  }
  /* inside side faces, so the room does not look hollow */
  add(shop, new THREE.Mesh(new THREE.PlaneGeometry(4.0, 3.4), inWall), SX - 3.39, 1.7, -7.0, false).rotation.y = Math.PI / 2;
  add(shop, new THREE.Mesh(new THREE.PlaneGeometry(4.0, 3.4), inWall), SX + 3.39, 1.7, -7.0, false).rotation.y = -Math.PI / 2;
  const floorTex = canvasTex(256, 256, (g, W, H) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#cfc6b4" : "#8c8a84"; g.fillRect(i * W / 4, j * H / 4, W / 4, H / 4); } }, [3, 2]);
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.8), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35 })); f.rotation.x = -Math.PI / 2; f.position.set(SX, 0.03, -7.05); f.receiveShadow = true; shop.add(f); }

  /* the window: glass you can see through, a mullion, a painted band, a lit display of boxes on the sill */
  const glassM = new THREE.MeshStandardMaterial({ color: 0xbcd6e4, roughness: 0.05, transparent: true, opacity: 0.1, depthWrite: false });
  add(shop, new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.6), glassM), SX - 0.7, 1.6, ZF - 0.02, false);
  box(shop, 0.05, 1.6, 0.06, darkM, SX - 0.7, 1.6, ZF - 0.02, 0.01);
  box(shop, 4.5, 0.06, 0.08, darkM, SX - 0.7, 2.42, ZF - 0.03, 0.01);
  /* the door: a leaf with a glass panel and a handle */
  box(shop, 0.96, 2.4, 0.08, std(new THREE.Color(wallHex).multiplyScalar(0.45 * Math.max(dim, 0.6)).getHex(), 0.6), SX + 2.4, 1.2, ZF - 0.03, 0.02);
  add(shop, new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0xb89a6a, emissive: 0xffd08a, emissiveIntensity: night ? 0.55 : 0.2, roughness: 0.2 })), SX + 2.4, 1.5, ZF + 0.02, false);
  box(shop, 0.05, 0.3, 0.07, std(0xd8c27a, 0.3, { metalness: 0.6 }), SX + 2.05, 1.0, ZF + 0.07, 0.01);
  box(shop, 1.3, 0.04, 0.9, std(0x55504a, 0.9), SX + 2.4, 0.03, ZF + 0.5, 0.01, false);    /* a doormat */

  /* inside: counter, till, back shelves, side shelves, a chiller, an island rack, ceiling lights */
  const counter = new THREE.Group(); shop.add(counter);
  box(counter, 3.6, 1.0, 0.7, woodM, SX - 1.2, 0.5, -7.0, 0.03);
  box(counter, 3.8, 0.06, 0.82, std(0xd9d2c4, 0.4), SX - 1.2, 1.03, -7.0, 0.02);
  box(counter, 0.5, 0.26, 0.4, std(0x3a4350, 0.5), SX - 2.2, 1.19, -7.0, 0.04);          /* till */
  box(counter, 0.36, 0.3, 0.05, glow(0x9fe8c8), SX - 2.2, 1.45, -7.08, 0.01, false);       /* its little screen */
  box(counter, 0.3, 0.3, 0.3, std(0xdcecf4, 0.2, { transparent: true, opacity: 0.6 }), SX - 0.2, 1.21, -7.0, 0.05, false);   /* a jar of sweets */
  box(counter, 0.5, 0.18, 0.36, std(0xd6b88a, 0.9), SX - 1.2, 1.15, -6.9, 0.04);          /* a paper bag */
  const prodColors = [0xe2433f, 0x3a8fd9, 0xf2c230, 0x3cc16a, 0xf5f0e6, 0x8a4fae, 0xff8a3a];
  const prodGeo = new THREE.BoxGeometry(1, 1, 1);
  const products = (list) => {                                                              /* one InstancedMesh for all the packets */
    const im = new THREE.InstancedMesh(prodGeo, std(0xffffff, 0.7), list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    list.forEach((p, i) => { m4.compose(V(p.x, p.y, p.z), q, V(p.w, p.h, p.d)); im.setMatrixAt(i, m4); im.setColorAt(i, new THREE.Color(p.c)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.castShadow = true; shop.add(im); return im;
  };
  const R = rng(515), list = [];
  const shelfUnit = (cx, cz, len, yaw, tiers) => {                                           /* boards + uprights now, packets into `list` */
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = yaw; shop.add(g);
    for (const s of [-1, 1]) box(g, 0.06, 2.5, 0.42, woodM, s * len / 2, 1.25, 0, 0.01);
    tiers.forEach((y) => {
      box(g, len, 0.05, 0.42, woodM, 0, y, 0, 0.01);
      const n = Math.floor(len / 0.22), c0 = Math.floor(R() * 7);
      for (let i = 0; i < n; i++) {
        const w = 0.14 + R() * 0.06, h = 0.2 + R() * 0.12, d = 0.14 + R() * 0.1, c = prodColors[(c0 + Math.floor(i / 3)) % 7];
        const lp = V(-len / 2 + 0.16 + i * (len - 0.32) / Math.max(1, n - 1), y + 0.025 + h / 2, 0);
        lp.applyAxisAngle(V(0, 1, 0), yaw); list.push({ x: cx + lp.x, y: lp.y, z: cz + lp.z, w, h, d, c });
      }
    });
    return g;
  };
  shelfUnit(SX, -8.68, 6.0, 0, [0.5, 1.1, 1.7, 2.3]);                                       /* back wall */
  shelfUnit(SX - 3.25, -7.6, 2.4, Math.PI / 2, [0.5, 1.1, 1.7]);                            /* left wall */
  shelfUnit(SX + 2.2, -6.6, 1.4, 0, [0.4, 0.9]);                                            /* island rack */
  products(list);
  box(shop, 1.0, 1.3, 0.6, std(0xdfe6ea, 0.4), SX + 3.0, 0.65, -8.45, 0.05);                /* chiller */
  box(shop, 0.86, 1.0, 0.04, std(0x9fd8ee, 0.2, { emissive: 0x7fc8e8, emissiveIntensity: night ? 0.7 : 0.25 }), SX + 3.0, 0.7, -8.14, 0.01, false);
  for (const dx of [-1.6, 1.4]) box(shop, 1.5, 0.05, 0.3, glow(0xfff2d0), SX + dx, 3.38, -7.0, 0.01, false);   /* ceiling tubes */
  const inLights = [[-1.6, 2.9, -6.8, night ? 16 : 9], [1.6, 2.9, -7.4, night ? 12 : 7]].map(([dx, y, z, I]) => {
    const l = new THREE.PointLight(0xffe0b0, I, 8.5, 1.4); l.position.set(SX + dx, y, z); shop.add(l); return l;
  });
  /* a lit shape on the window glass from outside is the room itself; the wall glow near the door spills on the pavement */
  const spill = new THREE.PointLight(0xffd8a0, night ? 6 : 0, 5, 1.6); spill.position.set(SX - 0.7, 1.7, ZF + 0.8); shop.add(spill);
  live.push((tw) => { const f = 1 + (hash(Math.floor(tw * 6) + 4) - 0.5) * 0.04; inLights.forEach((l, i) => { l.intensity = (night ? [16, 12][i] : [9, 7][i]) * f; }); });

  /* ---- the sign over the door: a board hung from a bracket by two chains; separate group so it can fall ---- */
  const sgx = SX + 2.4, bracketY = 3.5, bz = ZF + 0.62;
  box(shop, 1.5, 0.08, 0.08, darkM, sgx, bracketY, bz, 0.02);                              /* the bracket rail */
  for (const dx of [-0.7, 0.7]) box(shop, 0.06, 0.06, 0.6, darkM, sgx + dx, bracketY, ZF + 0.3, 0.01);   /* two stubs back to the wall */
  const signTex = canvasTex(256, 128, (g, W, H) => {                                         /* an icon, not words: a basket and a loaf on a yellow board */
    g.fillStyle = "#f2c230"; g.fillRect(0, 0, W, H); g.strokeStyle = "#c8362f"; g.lineWidth = 10; g.strokeRect(7, 7, W - 14, H - 14);
    g.fillStyle = "#c8362f"; g.beginPath(); g.moveTo(70, 58); g.lineTo(186, 58); g.lineTo(168, 104); g.lineTo(88, 104); g.closePath(); g.fill();
    g.strokeStyle = "#c8362f"; g.lineWidth = 9; g.beginPath(); g.arc(128, 58, 38, Math.PI, 0); g.stroke();
    g.fillStyle = "#f6e7c1"; for (let i = 0; i < 4; i++) g.fillRect(96 + i * 22, 68, 9, 26);
  });
  const sign = new THREE.Group(); sign.name = "theSignThatFalls"; G.add(sign);
  const SW = 1.4, SH = 0.64, SY = 2.9;
  const board = box(sign, SW, SH, 0.1, std(0xf2c230, 0.6), 0, 0, 0, 0.03);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(SW - 0.06, SH - 0.06), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: night ? 0.35 : 0 })); face.position.z = 0.056; sign.add(face);
  const chainR = box(G, 0.04, 0.34, 0.04, darkM, sgx + 0.62, SY + SH / 2 + 0.17, bz, 0.01), chainL = box(G, 0.04, 0.34, 0.04, darkM, sgx - 0.62, SY + SH / 2 + 0.17, bz, 0.01);
  const sigX0 = sgx, sigZ0 = bz, T0 = S.signFall?.t0 ?? Infinity;
  const LAND = V(sgx + 0.35, 0, ZF + 1.0);                                                    /* where the lead would have stood */
  const shards = Array.from({ length: 9 }, (_, i) => {
    const R2 = rng(900 + i), sz = 0.07 + R2() * 0.12, m = rb(sz * (1 + R2()), sz * 0.6, sz, std([0xf2c230, 0xc8362f, 0x2b3038, 0xf6e7c1][i % 4], 0.7), 0.01); m.castShadow = true; m.visible = false; G.add(m);
    return { m, sz, v: V((R2() - 0.5) * 3.2, 1.6 + R2() * 2.4, (R2() - 0.2) * 2.6), w: V(R2() * 14, R2() * 14, R2() * 14) };
  });
  const qHang = new THREE.Quaternion(), qSwing = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.5)), qLand = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.1, 0.5, 0.3, "YXZ")), qTmp = new THREE.Quaternion();
  const TF = 0.12, TL = 0.46, FALLH = SY - 0.07, GG = 2 * FALLH / ((TL - TF) ** 2);          /* swing 0..0.12, free fall to 0.46, bounce 0.46..0.70 */
  const lead = 0.5;                                                                          /* rest: it ends at LAND, lying face up */
  live.push((tw) => {
    const d = tw - T0, pre = d < 0;
    shards.forEach((s) => { s.m.visible = d >= TL; });
    chainL.rotation.z = pre ? 0 : Math.sin(Math.min(d, 2) * 11) * 0.35 * Math.exp(-d * 3) * clamp01(d / 0.1);
    chainR.visible = pre || d < TF;
    if (pre) {                                                                              /* hangs, with a small sway */
      sign.position.set(sigX0, SY, sigZ0); sign.quaternion.copy(qHang.setFromEuler(new THREE.Euler(0, 0, Math.sin(tw * 1.3) * 0.012)));
    } else if (d < TF) {                                                                    /* the right chain gives: the board swings down about its left end */
      const u = d / TF, e = u * u, a = -0.5 * e;
      sign.quaternion.setFromEuler(new THREE.Euler(0, 0, a)); sign.position.set(sigX0, SY, sigZ0);
    } else if (d < TL) {                                                                    /* free fall with a tumble onto its face */
      const u = (d - TF) / (TL - TF), g = 0.5 * GG * (d - TF) ** 2, e = u * u * (3 - 2 * u);
      sign.position.set(sigX0 + (LAND.x - sigX0) * u, SY - g, sigZ0 + (LAND.z - sigZ0) * u * u);
      sign.quaternion.copy(qSwing).slerp(qLand, e);
    } else {                                                                                /* lands, bounces twice, settles */
      const e = d - TL, g = 38, v0 = 4.6;
      let y = 0, rest = 0.07;
      const t1 = 2 * v0 / g;
      if (e < t1) y = v0 * e - 0.5 * g * e * e; else { const e2 = e - t1, v1 = v0 * 0.35, t2 = 2 * v1 / g; if (e2 < t2) y = v1 * e2 - 0.5 * g * e2 * e2; }
      sign.position.set(LAND.x, rest + y, LAND.z);
      const wob = Math.exp(-e * 6) * Math.sin(e * 40) * 0.12;
      sign.quaternion.copy(qLand).multiply(qTmp.setFromEuler(new THREE.Euler(wob, 0, wob * 0.6)));
    }
    shards.forEach((s) => {                                                                 /* pieces burst from the impact */
      if (d < TL) return; const e = d - TL;
      s.m.position.set(LAND.x + s.v.x * e, Math.max(s.sz * 0.3, 0.1 + s.v.y * e - 19 * e * e), LAND.z + s.v.z * e);
      s.m.rotation.set(s.w.x * e, s.w.y * e, s.w.z * e);
      if (s.m.position.y <= s.sz * 0.3 + 1e-6) s.m.rotation.set(0.1, s.w.y * 0.05, 0);
    });
  });
  anchors.shopWindow = V(SX - 0.7, 1.6, ZF); anchors.shopInside = V(SX - 0.7, 1.4, -7.0); anchors.shopCounter = V(SX - 1.2, 1.05, -7.0);
  anchors.shopDoor = V(sgx, 1.1, ZF); anchors.signBracket = V(sgx, bracketY, bz); anchors.signLand = LAND.clone(); anchors.signLand.y = 0.07;

  /* ================= 3. THE PARKED CAR ================= */
  const CX = S.carX ?? -24, car = new THREE.Group(); car.position.set(CX, 0, 0.15); car.rotation.y = Math.PI; G.add(car);   /* faces -x; local x is forward, the driver side is local -z = world +z, the road side */
  const carBody = std(0x3b6fb0, 0.45, { metalness: 0.25 }), glassC = std(0x1a2330, 0.1, { metalness: 0.2 });
  box(car, 4.2, 0.62, 1.8, carBody, 0, 0.62, 0, 0.12);
  box(car, 2.3, 0.62, 1.6, carBody, -0.25, 1.2, 0, 0.16);
  box(car, 2.1, 0.46, 1.64, glassC, -0.25, 1.22, 0, 0.1, false);                            /* the glasshouse */
  box(car, 0.06, 0.42, 1.2, carBody, 0.78, 1.22, 0, 0.01);                                  /* pillars: B-pillar */
  for (const [x, z] of [[1.3, 0.85], [-1.3, 0.85], [1.3, -0.85], [-1.3, -0.85]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 20), std(0x15171b, 0.9)); w.rotation.x = Math.PI / 2; add(car, w, x, 0.36, z);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.28, 14), std(0xc9ced6, 0.35)); hub.rotation.x = Math.PI / 2; add(car, hub, x, 0.36, z, false);
  }
  for (const z of [-0.6, 0.6]) { add(car, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.3), glow(0xfff3c0)), 2.12, 0.72, z, false); add(car, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.3), glow(night ? 0xff3a2a : 0xb02a22)), -2.12, 0.72, z, false); }
  box(car, 0.14, 0.22, 1.7, darkM, -2.14, 0.4, 0, 0.03); box(car, 0.14, 0.22, 1.7, darkM, 2.14, 0.4, 0, 0.03);
  box(car, 0.5, 0.04, 1.2, std(0x1a1d22, 0.6), 2.0, 0.94, 0, 0.01, false);                  /* the bonnet seam */
  add(car, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.06), std(0xdddddd, 0.5)), 0.2, 0.85, 0.91, false);   /* a handle on the far (kerb) side */
  /* the dark opening and the driver's seat, which show when the door is open */
  const opening = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.66, 0.04), std(0x14171c, 0.9)); opening.position.set(0.25, 0.95, -0.9); car.add(opening);
  const seat = rb(0.5, 0.5, 0.45, std(0x2a2d33, 0.8), 0.06); seat.position.set(-0.05, 0.95, -0.45); car.add(seat);
  const driver = new THREE.Group(); driver.position.set(-0.05, 0.88, -0.45); car.add(driver);
  driver.add(rb(0.42, 0.5, 0.3, std(0xb5483a, 0.8), 0.06)); const hd = rb(0.36, 0.34, 0.34, std(0xd9a07a, 0.8), 0.08); hd.position.y = 0.38; driver.add(hd);
  /* the door: hinged at its FRONT edge (local x = +0.7); built so that its panel sits flush on the body when shut */
  const hinge = new THREE.Group(); hinge.position.set(0.7, 0.95, -0.915); car.add(hinge);
  const doorPanel = rb(1.2, 0.66, 0.06, carBody, 0.03); doorPanel.position.set(-0.6, 0, 0); doorPanel.castShadow = true; hinge.add(doorPanel);
  const doorWin = rb(1.0, 0.38, 0.05, std(0x4a6078, 0.1, { metalness: 0.2 }), 0.02); doorWin.position.set(-0.6, 0.5, 0); hinge.add(doorWin);
  const mirror = rb(0.1, 0.14, 0.2, carBody, 0.03); mirror.position.set(-0.05, 0.4, -0.1); hinge.add(mirror);
  const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), std(0xdddddd, 0.5)); doorHandle.position.set(-1.0, 0.18, -0.05); hinge.add(doorHandle);
  const DT = S.carDoor?.t0 ?? Infinity, OPEN = 1.15;
  live.push((tw) => {
    const d = tw - DT; let a = 0;
    if (d > 0) {
      if (d < 0.35) { const u = d / 0.35; a = 1 - (1 - u) ** 2.2; }                           /* swings open fast, ends against its stop */
      else { const e = d - 0.35; a = 1 - 0.2 * Math.exp(-3.2 * e) * Math.abs(Math.sin(Math.PI * e / 0.16)); }   /* bounces on the stop, settles */
    }
    hinge.rotation.y = -a * OPEN;      /* the driver side is local -z (world +z, the road side); a negative turn about y swings the rear edge out */
  });
  /* the cycle lane that the door opens into: green paint on the road */
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(18, 1.15), std(0x2f7a55, 0.9)); m.rotation.x = -Math.PI / 2; m.position.set(CX, 0.009, 1.75); m.receiveShadow = true; G.add(m);
    for (let i = -4; i <= 4; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.12), std(0xe8e4d8, 0.8)); b.rotation.x = -Math.PI / 2; b.position.set(CX + i * 2, 0.011, 1.75); G.add(b); } }
  anchors.carDoor = V(CX + 0.0, 0.95, 1.6); anchors.carDriver = V(CX + 0.05, 1.5, 0.6);

  /* ================= 4. THE UNDERPASS STAIRS =================
     Runs along x, descending toward +x. top landing at x < ST0 (y = TOP), 11 treads, then a roofed passage at y = 0. */
  const UX = S.stairsX ?? -30, ZC = -2.6, WID = 2.4, TOP = 3.0, NST = 12, RISE = TOP / NST, RUN = 0.3, ST0 = UX - 4.0, WALLH = 3.7;
  const under = new THREE.Group(); G.add(under);
  const concrete = canvasTex(512, 512, (g, W, H) => {
    const r = rng(77); g.fillStyle = "#7d7f82"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { const v = 100 + r() * 60; g.fillStyle = `rgba(${v},${v},${v + 4},0.3)`; g.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3); }
    g.strokeStyle = "rgba(40,42,46,0.5)"; g.lineWidth = 3; for (let x = 0; x <= W; x += W / 2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = H / 3; y < H; y += H / 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let i = 0; i < 6; i++) { const x = r() * W; const gr = g.createLinearGradient(x, 0, x, H * (0.3 + r() * 0.5)); gr.addColorStop(0, "rgba(30,34,36,0.4)"); gr.addColorStop(1, "rgba(30,34,36,0)"); g.fillStyle = gr; g.fillRect(x, 0, 6 + r() * 14, H); }   /* water stains running down */
    g.fillStyle = "rgba(45,115,96,0.55)"; g.fillRect(0, H * 0.62, W, H * 0.38); g.strokeStyle = "rgba(220,225,220,0.3)"; g.lineWidth = 2;   /* a tiled dado */
    for (let x = 0; x <= W; x += 32) { g.beginPath(); g.moveTo(x, H * 0.62); g.lineTo(x, H); g.stroke(); } for (let y = H * 0.62; y <= H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  }, [3, 1]);
  const wallU = new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.85 });
  const stepM = std(0x8f9194, 0.75);
  const rough = canvasTex(256, 256, (g, W, H) => { const r = rng(5); g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, W, H); for (let i = 0; i < 7; i++) { g.fillStyle = `rgba(20,20,20,${0.6 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * W, r() * H, 30 + r() * 60, 12 + r() * 30, r() * 3, 0, 7); g.fill(); } }, [6, 1]);
  const wetM = new THREE.MeshStandardMaterial({ color: 0x5c6066, roughness: 1, roughnessMap: rough, metalness: 0.35 });   /* the dark patches are glossy: puddles */
  const xB = ST0 + NST * RUN;                                                             /* x where the last riser meets the floor */
  const xEnd = xB + 7.0;
  box(under, 8, TOP, WID + 3.6, std(0x9a9a94, 0.9), ST0 - 4.0, TOP / 2, ZC, 0.03);       /* the raised block the top landing sits on */
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(8, WID + 3.6), new THREE.MeshStandardMaterial({ map: paving([3, 1.4]), roughness: 0.88 })); m.rotation.x = -Math.PI / 2; m.position.set(ST0 - 4.0, TOP + 0.006, ZC); m.receiveShadow = true; under.add(m); }
  for (let i = 0; i < NST - 1; i++) box(under, RUN, TOP - (i + 1) * RISE, WID, stepM, ST0 + RUN * (i + 0.5), (TOP - (i + 1) * RISE) / 2, ZC, 0.01);   /* 11 treads; the 12th riser is the floor */
  const nose = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.03, WID - 0.1), std(0xe0c05a, 0.6), NST - 1), m4 = new THREE.Matrix4();
  for (let i = 0; i < NST - 1; i++) { m4.makeTranslation(ST0 + RUN * (i + 1) - 0.06, TOP - (i + 1) * RISE + 0.012, ZC); nose.setMatrixAt(i, m4); }
  under.add(nose);
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(xEnd - xB + 0.01, WID), wetM); f.rotation.x = -Math.PI / 2; f.position.set((xB + xEnd) / 2, 0.012, ZC); f.receiveShadow = true; under.add(f); }
  for (const s of [-1, 1]) {                                                              /* walls: long boxes, textured */
    const w = new THREE.Mesh(new THREE.BoxGeometry(xEnd - ST0 + 1.0, WALLH, 0.3), wallU); w.position.set((ST0 - 1.0 + xEnd) / 2, WALLH / 2, ZC + s * (WID / 2 + 0.15)); w.castShadow = w.receiveShadow = true; under.add(w);
  }
  box(under, xEnd - xB + 0.8, 0.3, WID + 0.6, std(0x44474b, 0.9), (xB - 0.8 + xEnd) / 2 + 0.4, 2.75, ZC, 0.02);           /* the roof of the passage (y 2.6 .. 2.9) */
  { const e = new THREE.Mesh(new THREE.PlaneGeometry(WID, 2.6), glow(night ? 0x8fa6a8 : 0xd8e8f0)); e.rotation.y = -Math.PI / 2; e.position.set(xEnd - 0.05, 1.3, ZC); under.add(e); }   /* the daylight at the far end, a lit square */
  /* handrails both sides: a sloped rail on posts, level at the ends */
  const railM = std(0xb8bcc4, 0.35, { metalness: 0.7 }), x1 = ST0, x2 = xB, dyR = TOP, len = Math.hypot(x2 - x1, dyR), ang = Math.atan2(-dyR, x2 - x1);
  for (const s of [-1, 1]) {
    const z = ZC + s * (WID / 2 - 0.1);
    const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 10), railM); r1.position.set((x1 + x2) / 2, TOP / 2 + 0.95, z); r1.rotation.z = Math.PI / 2 + ang; r1.castShadow = true; under.add(r1);
    const r2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 10), railM); r2.rotation.z = Math.PI / 2; r2.position.set(x1 - 0.8, TOP + 0.95, z); under.add(r2);
    const r3 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 10), railM); r3.rotation.z = Math.PI / 2; r3.position.set(x2 + 0.8, 0.95, z); under.add(r3);
    for (let i = 0; i <= 3; i++) { const k = i / 3, px = x1 + (x2 - x1) * k, py = TOP * (1 - k); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), railM); p.position.set(px, py + 0.475, z); under.add(p); }
  }
  /* the strip light on the passage roof (flickers), a steadier one over the stairs, both emissive tubes */
  const tubeM = new THREE.MeshBasicMaterial({ color: 0xdff0ff }), tube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.14), tubeM); tube.position.set(xB + 2.0, 2.58, ZC); under.add(tube);
  box(under, 1.5, 0.05, 0.2, darkM, xB + 2.0, 2.62, ZC, 0.01, false);
  const tube2M = new THREE.MeshBasicMaterial({ color: 0xcfe0ee }), tube2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.14), tube2M); tube2.position.set(xB + 5.5, 2.58, ZC); under.add(tube2);
  const stripLight = new THREE.PointLight(0xd8eaff, night ? 6 : 3, 9, 1.4); stripLight.position.set(xB + 2.0, 2.0, ZC); under.add(stripLight);
  const stairLight = new THREE.PointLight(0xffe6b8, night ? 6 : 0, 6.5, 1.6); stairLight.position.set(ST0 + 1.0, TOP + 0.9, ZC); under.add(stairLight);   /* a lamp on the landing, throwing its light down the steps */
  const post = rb(0.14, 3.6, 0.14, darkM, 0.03); post.position.set(ST0 - 0.4, TOP + 1.8, ZC - WID / 2 - 0.1); under.add(post);
  const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.26), glow(0xfff0c8)); lampHead.position.set(ST0 - 0.1, TOP + 3.5, ZC - WID / 2 - 0.1); under.add(lampHead);
  live.push((tw) => {                                                                     /* the tube flickers: mostly on, with bad moments */
    const bad = Math.sin(tw * 0.7) > 0.55, on = bad ? hash(Math.floor(tw * 20)) > 0.45 : hash(Math.floor(tw * 18) + 5) > 0.06;
    tubeM.color.setHex(on ? 0xdff0ff : 0x2a3036); stripLight.intensity = on ? (night ? 6 : 3) : (night ? 1 : 0.5);
    tube2M.color.setHex(hash(Math.floor(tw * 7) + 9) > 0.04 ? 0xcfe0ee : 0x2a3036);
  });
  anchors.stairsTop = V(ST0 - 0.4, TOP, ZC); anchors.stairsMid = V(ST0 + NST * RUN / 2, TOP / 2, ZC); anchors.stairsBottom = V(xB + 0.6, 0, ZC); anchors.stairsLight = V(xB + 2.0, 2.58, ZC);

  /* ---- counts, then the shadows: only meshes that already cast keep it (the shop and block do; small props do not) ---- */
  let meshCount = 0; G.traverse((o) => { if (o.isMesh) meshCount += 1; });
  return { group: G, anchors, meshCount, update: (tw) => live.forEach((f) => f(tw)) };
}
