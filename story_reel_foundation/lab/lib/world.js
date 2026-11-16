/* world.js — the street, and everything in it that is alive.
   Every moving thing is a pure function of time (tw = world time in seconds), so a frame can
   be rendered on its own. The director (index.html) owns the clock and may warp it (hit-stop, ghost
   previews); the world just answers "what does the street look like at tw?". */
import * as THREE from "three";
import { monoCubic } from "./curve.js";
import { mat, rbox, makePerson, pose } from "./people.js";
import { asphalt, paving, facade, shelter as buildShelter } from "./detail.js";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rngOf = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const basic = (hex, opacity = 1) => new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity });

export function buildWorld(scene, cfg) {
  const G = new THREE.Group(); scene.add(G);
  const live = [];                                   /* every ambient loop registers one function(tw) */
  const P = cfg.palette;

  /* ---- sky: a vertical gradient drawn behind everything, plus a sun ---- */
  const sc = document.createElement("canvas"); sc.width = 4; sc.height = 256;
  const sx = sc.getContext("2d"); const grad = sx.createLinearGradient(0, 0, 0, 256);
  cfg.sky.forEach(([stop, col]) => grad.addColorStop(stop, col));
  sx.fillStyle = grad; sx.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(sc); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
  const sun = new THREE.Mesh(new THREE.CircleGeometry(5.5, 40), basic(P.sun)); sun.position.set(-26, 15, -80); G.add(sun);
  if (cfg.night) {   /* the moon (smaller, higher) and a field of stars */
    sun.scale.setScalar(0.45); sun.position.set(22, 30, -85);
    const R0 = rngOf(99), sp = [];
    for (let i = 0; i < 420; i++) sp.push((R0() - 0.5) * 220, 14 + R0() * 60, -95 - R0() * 10);
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    G.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.85, fog: false })));
  }
  const halo = new THREE.Mesh(new THREE.RingGeometry(5.5, 11, 40), basic(P.sun, 0.22)); halo.position.copy(sun.position); G.add(halo);
  live.push((tw) => halo.scale.setScalar(1 + Math.sin(tw * 0.9) * 0.03));

  /* ---- ground, road, kerb, pavement, crosswalk ---- */
  const flat = (w, d, hex, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(hex)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); G.add(m); return m; };
  flat(140, 140, P.grass, 0, -0.01, 0);
  const road = flat(140, 6.2, P.road, 0, 0, 2.1); road.material = new THREE.MeshStandardMaterial({ map: asphalt([24, 1.06]), roughness: 0.93 });
  const pave = flat(140, 3.6, P.pavement, 0, 0.004, -2.4); pave.material = new THREE.MeshStandardMaterial({ map: paving([58, 1.5]), roughness: 0.88 });
  const pave2 = flat(140, 2.4, P.pavement, 0, 0.004, 6.4); pave2.material = new THREE.MeshStandardMaterial({ map: paving([58, 1]), roughness: 0.88 });   /* the far pavement, where the lead ends up */
  const kerb2 = rbox(140, 0.2, 0.34, P.kerb, 0.03); kerb2.position.set(0, 0.1, 5.2); G.add(kerb2);
  for (let i = -20; i < 20; i++) flat(1.4, 0.14, P.lane, i * 3.2, 0.012, 2.1);                 /* dashed lane line */
  for (let i = 0; i < 7; i++) flat(0.5, 5.4, P.lane, 4.2 + i * 0.85, 0.013, 2.1);               /* crosswalk */
  const kerb = rbox(140, 0.2, 0.34, P.kerb, 0.03); kerb.position.set(0, 0.1, -0.78); G.add(kerb);

  /* ---- buildings with windows that blink and flicker ---- */
  const windows = [];
  const building = (x, w, h, d, hex) => {
    const b = rbox(w, h, d, new THREE.Color(hex).multiplyScalar(P.nightDim ?? 1).getHex(), 0.08); b.position.set(x, h / 2, -9); G.add(b);   /* at night the walls are dim: light comes from windows, shops, lamps */
    const before = windows.length;
    facade(G, x, w, h, d, hex, P, Math.round(x * 7 + 101), windows);       /* depth: frames, sills, cornice, shopfront, awning */
    for (let i = before; i < windows.length; i++) {
      const id = windows[i].id, r0 = hash(id + 3.3);
      windows[i].kind = r0 < cfg.windows.blinkShare ? "blink" : r0 < cfg.windows.blinkShare + cfg.windows.flickerShare ? "flicker" : (hash(id + 9.1) < (cfg.windows.onShare ?? 0.55) ? "on" : "off");
    }
    return b;
  };
  [[-14, 5.5, 6, 3, P.bld[0]], [-9, 6, 6.5, 3, P.bld[1]], [-2, 5, 8.5, 3, P.bld[2]], [5, 6.5, 5.5, 3, P.bld[3]], [12, 5, 7.5, 3, P.bld[4]], [18, 6, 6, 3, P.bld[0]]].forEach((a) => building(...a));
  {   /* the far side: the same builder, then turned to face the road (they are built at z -9 and mirrored to z +13) */
    const n0 = G.children.length;
    [[-16, 6, 7, 3, P.bld[2]], [-9.5, 5.5, 6, 3, P.bld[4]], [-3, 6.5, 9, 3, P.bld[1]], [3.5, 5.5, 6.5, 3, P.bld[0]], [10, 6.5, 8, 3, P.bld[3]], [17, 5.5, 6.5, 3, P.bld[2]]].forEach((a) => building(...a));
    const far = new THREE.Group(); G.children.slice(n0).forEach((ch) => far.add(ch)); far.rotation.y = Math.PI; far.position.z = 4; G.add(far);
    const plaza = flat(140, 4.0, P.pavement, 0, 0.003, 9.6); plaza.material = pave2.material;
  }
  live.push((tw) => windows.forEach((w) => {
    let on = w.kind === "on";
    if (w.kind === "blink") on = hash(Math.floor(tw * cfg.windows.blinkRate) + w.id * 7.7) > 0.5;
    if (w.kind === "flicker") on = hash(Math.floor(tw * 18) + w.id) > 0.3;
    w.m.material.color.setHex(on ? P.windowOn : P.windowOff);
  }));

  /* ---- a cafe sign: an icon, not words, so it adds nothing to the on-screen word count ---- */
  const sign = new THREE.Group(); sign.position.set(-9, 3.6, -7.35); G.add(sign);
  sign.add(rbox(1.5, 1.1, 0.14, 0x3a2a22, 0.05));
  const cupMat = basic(P.signOn); const cupM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.06), cupMat); cupM.position.set(-0.08, 0, 0.1); sign.add(cupM);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 16), cupMat); handle.position.set(0.3, 0, 0.1); sign.add(handle);
  live.push((tw) => { const on = (tw % cfg.sign.period) < cfg.sign.period * 0.68; cupMat.color.setHex(on ? P.signOn : P.signOff); });

  /* ---- street lamp that flickers, traffic light that cycles ---- */
  const lampLights = [];
  const lampPost = (x, z, dir, shadow) => {   /* dir: +1 the arm reaches toward +z (over the road from the near side), -1 toward -z */
    const g = new THREE.Group(); g.position.set(x, 0, z); G.add(g);
    const pole = rbox(0.14, 4.6, 0.14, 0x3c434f, 0.04); pole.position.y = 2.3; g.add(pole);
    const arm = rbox(0.1, 0.1, 1.1, 0x3c434f, 0.03); arm.position.set(0, 4.5, dir * 0.5); g.add(arm);
    const head = rbox(0.42, 0.14, 0.32, 0x2c3139, 0.04); head.position.set(0, 4.42, dir * 1.0); g.add(head);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.26), basic(cfg.night ? 0xfff0c8 : 0xd8d8d0)); lens.position.set(0, 4.34, dir * 1.0); g.add(lens);
    if (!cfg.night) return;
    const s = new THREE.SpotLight(0xffd8a0, cfg.lamps?.intensity ?? 60, 18, 0.8, 0.75, 1.6);
    s.position.set(x, 4.3, z + dir * 1.0); s.target.position.set(x, 0, z + dir * 1.6); G.add(s, s.target);
    if (shadow) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; s.shadow.radius = 3; }
    lampLights.push(s);
  };
  for (const [x, z, d, sh] of (cfg.night ? [[-4.6, -0.9, 1, true], [6.5, -0.9, 1, false], [-12, -0.9, 1, false], [4.2, 5.6, -1, false], [11, 5.6, -1, false]] : [])) lampPost(x, z, d, sh);
  const lamp = new THREE.Group(); lamp.position.set(-5, 0, -1.5); if (!cfg.night) G.add(lamp);
  const pole = rbox(0.16, 4.6, 0.16, 0x4a5262, 0.04); pole.position.y = 2.3; lamp.add(pole);
  const arm = rbox(1.1, 0.12, 0.12, 0x4a5262, 0.03); arm.position.set(0.5, 4.5, 0); lamp.add(arm);
  const bulbMat = basic(P.lampOn); const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.3), bulbMat); bulb.position.set(1.0, 4.4, 0); lamp.add(bulb);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), basic(P.lampOn, 0.2)); glow.position.set(1.0, 4.0, 0.2); lamp.add(glow);
  live.push((tw) => {
    const ph = tw % cfg.lamp.cycle, out = ph > cfg.lamp.cycle - 0.45 && hash(Math.floor(tw * 22)) > 0.38;
    bulbMat.color.setHex(out ? P.lampOff : P.lampOn); glow.material.opacity = out ? 0.02 : 0.2;
  });
  const tl = new THREE.Group(); tl.position.set(7.6, 0, -1.2); G.add(tl);
  const tpole = rbox(0.14, 3.2, 0.14, 0x4a5262, 0.04); tpole.position.y = 1.6; tl.add(tpole);
  const housing = rbox(0.5, 1.3, 0.3, 0x23262d, 0.06); housing.position.set(0, 3.4, 0.05); tl.add(housing);
  const lights = [0xe2433f, 0xf2c230, 0x3cc16a].map((c, i) => { const m = basic(c); const d = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), m); d.position.set(0, 3.8 - i * 0.4, 0.22); tl.add(d); return m; });
  live.push((tw) => {
    const ph = tw % cfg.traffic.cycle, a = cfg.traffic.red / cfg.traffic.cycle, b = (cfg.traffic.red + cfg.traffic.green) / cfg.traffic.cycle, u = ph / cfg.traffic.cycle;
    const on = u < a ? 0 : u < b ? 2 : 1;
    [0xe2433f, 0xf2c230, 0x3cc16a].forEach((c, i) => lights[i].color.setHex(i === on ? c : 0x2c2f36));
  });

  /* ---- trees that sway, a vent that steams, motes that drift ---- */
  const trees = [];
  [[-6.5, -5.2], [3, -5.8], [9, -5], [-12, -5.5], [14, -5.6]].forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); G.add(g);
    const tr = rbox(0.35, 1.5, 0.35, 0x8a5a36); tr.position.y = 0.75; g.add(tr);
    const fo = rbox(1.7, 1.5, 1.7, P.tree, 0.32); fo.position.y = 2.15; g.add(fo);
    const fo2 = rbox(1.1, 1.0, 1.1, P.tree2, 0.25); fo2.position.set(0.3, 3.0, 0.1); g.add(fo2);
    trees.push({ fo, fo2, i });
  });
  live.push((tw) => trees.forEach(({ fo, fo2, i }) => { fo.rotation.z = Math.sin(tw * 1.1 + i) * 0.045; fo2.rotation.z = Math.sin(tw * 1.5 + i * 2) * 0.07; fo2.position.x = 0.3 + Math.sin(tw * 1.5 + i) * 0.05; }));
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 20), mat(0x33373f)); vent.position.set(40, 0.03, -2.9); G.add(vent);
  const puffs = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), basic(0xffffff, 0.5)); G.add(m); return m; });
  live.push((tw) => puffs.forEach((m, i) => {
    const u = (tw * cfg.steam.rate + i / puffs.length) % 1;
    m.position.set(40 + Math.sin(tw * 0.8 + i) * 0.2 + u * 0.5, 0.2 + u * 3.0, -2.9); m.scale.setScalar(0.12 + u * 0.45); m.material.opacity = 0.5 * (1 - u);
  }));
  const R = rngOf(77);
  const motes = Array.from({ length: cfg.motes.count }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), basic(0xfffbe6, 0.7)); G.add(m); return { m, x0: (R() - 0.5) * 24, y0: R() * 4, z: -3 + R() * 9, s: 0.1 + R() * 0.2, i }; });
  live.push((tw) => motes.forEach(({ m, x0, y0, z, s, i }) => { m.position.set(x0 + Math.sin(tw * 0.35 + i) * 1.4 + tw * cfg.motes.drift, 0.4 + (y0 + tw * s) % 4, z); m.rotation.set(tw + i, tw * 0.7, 0); }));

  /* ---- clouds drift, birds cross ---- */
  const clouds = Array.from({ length: 6 }, (_, i) => {
    const g = new THREE.Group(); g.position.set(0, 15 + (i % 3) * 3, -60 - (i % 2) * 8); G.add(g);
    [[0, 0, 3.2, 1.4], [2.4, -0.2, 2.4, 1.1], [-2.3, -0.3, 2.2, 1.0], [0.6, 0.8, 1.8, 1.0]].forEach(([x, y, w, h]) => { const c = rbox(w, h, 1.6, 0xffffff, 0.5); c.position.set(x, y, 0); g.add(c); });
    return { g, x0: -70 + i * 26, sp: cfg.clouds.speed * (0.7 + (i % 3) * 0.25) };
  });
  live.push((tw) => clouds.forEach(({ g, x0, sp }) => { g.position.x = ((x0 + tw * sp + 70) % 140) - 70; }));
  const birds = Array.from({ length: cfg.birds.count }, (_, i) => {
    const g = new THREE.Group(); G.add(g);
    g.add(rbox(0.34, 0.14, 0.2, 0x2a2d36, 0.04));
    const wl = new THREE.Group(), wr = new THREE.Group(); g.add(wl, wr);
    [[wl, -1], [wr, 1]].forEach(([w, s]) => { const m = rbox(0.44, 0.04, 0.18, 0x2a2d36, 0.02); m.position.x = s * 0.22; w.add(m); w.position.x = s * 0.1; });
    return { g, wl, wr, i };
  });
  live.push((tw) => birds.forEach(({ g, wl, wr, i }) => {
    g.position.set(-30 + ((tw * cfg.birds.speed + i * 11) % 70), 10.5 + Math.sin(tw * 0.8 + i) * 0.9 + i * 0.6, -22 - i * 3);
    const f = Math.sin(tw * 13 + i * 2) * 0.75; wl.rotation.z = f; wr.rotation.z = -f;
  }));

  /* ---- passers-by: the street has people who are not the story ---- */
  const walkers = cfg.walkers.map((w, i) => {
    const p = makePerson({ skin: w.skin, hair: w.hair, top: w.top, bottom: w.bottom, bun: w.bun }); p.scale.setScalar(w.scale || 1); G.add(p);
    return { p, w, i };
  });
  live.push((tw) => walkers.forEach(({ p, w, i }) => {
    const span = 34, x = ((w.x0 + tw * w.speed * w.dir + 17) % span + span) % span - 17;
    p.visible = !(w.hide || []).some(([a, b]) => tw >= a && tw < b);
    p.position.set(x, 0, w.z); p.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    pose(p, { t: tw, seed: 3 + i * 5, state: "walk", speed: 5.6 * w.speed, expr: "neutral" });
  }));

  /* ---- the bus stop: a shelter that can burst, a bus that arrives ---- */
  const SH_X = 0.2, SH_Z = -2.2, parts = [];
  const part = (w, h, d, hex, x, y, z) => { const m = rbox(w, h, d, hex, 0.04); m.position.set(SH_X + x, y, SH_Z + z); G.add(m); parts.push({ m, home: m.position.clone(), size: Math.max(w, h, d) }); return m; };
  const partM = (m, x, y, z) => {
    m.position.set(SH_X + x, y, SH_Z + z); G.add(m);
    const bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3());
    parts.push({ m, home: m.position.clone(), size: Math.max(sz.x, sz.y, sz.z) }); return m;
  };
  buildShelter(partM, { x: SH_X, z: SH_Z }, P);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 0.08), basic(0xfff0b0)); strip.position.set(SH_X, 2.27, SH_Z + 0.45); G.add(strip);
  const shelterLight = new THREE.PointLight(0xe6f2ff, cfg.night ? 5 : 0, 5.5, 1.6); shelterLight.position.set(SH_X, 2.05, SH_Z); G.add(shelterLight);
  live.push((tw) => { const on = hash(Math.floor(tw * cfg.shelter.stripRate)) > 0.3, alive = tw < cfg.impactT; strip.material.color.setHex(on && alive ? 0xfff0b0 : 0x5a5440); shelterLight.intensity = cfg.night && alive ? (on ? 1.8 : 1.3) : 0; });
  let noFrag = false;
  const R2 = rngOf(1313), frag = [];
  for (let i = 0; i < 28; i++) {
    const sz = 0.16 + R2() * 0.22, f = rbox(sz, sz, sz, [0xa9d7f5, 0x3a8fd9, 0x59647a, 0xffffff][i % 4], 0.03); f.visible = false; G.add(f);
    frag.push({ m: f, sz, p0: new THREE.Vector3(SH_X + (R2() - 0.5) * 2.6, 0.6 + R2() * 2.0, SH_Z + (R2() - 0.5) * 1.2), v: new THREE.Vector3((R2() - 0.2) * 5, 2.2 + R2() * 4, -1 - R2() * 4), w: new THREE.Vector3(R2() * 9, R2() * 9, R2() * 9) });
  }
  const pieceV = parts.map((_, i) => new THREE.Vector3(((i % 3) - 1) * 1.4 + 1.3, 1.6 + (i % 4) * 0.7, -1.4 - (i % 3) * 1.1));
  const pieceW = parts.map((_, i) => new THREE.Vector3(1.5 + i * 0.7, 1.1 + i * 0.4, 0.9 + i * 0.5));
  const bus = new THREE.Group(); G.add(bus); bus.scale.setScalar(0.95);
  const bb = rbox(6.2, 2.1, 2.5, P.bus, 0.18); bb.position.y = 1.55; bus.add(bb);
  const br = rbox(6.0, 0.16, 2.4, 0xf0f0f0, 0.06); br.position.y = 2.67; bus.add(br);
  for (let i = 0; i < 4; i++) { const w = rbox(1.05, 0.8, 2.56, 0x2a3a58, 0.08); if (cfg.night) { w.material.emissive.setHex(0xb8d4c8); w.material.emissiveIntensity = 0.55; } w.position.set(-2.1 + i * 1.4, 1.95, 0); bus.add(w); }
  const board = rbox(0.1, 0.55, 1.7, 0x14161c, 0.03); board.position.set(3.12, 2.2, 0); bus.add(board);
  const front = rbox(0.1, 1.0, 2.2, 0xcfd5de, 0.04); front.position.set(3.1, 1.05, 0); bus.add(front);
  const headL = []; for (const sz of [-0.8, 0.8]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.4), basic(0xfff3c0)); h.position.set(3.16, 0.7, sz); bus.add(h); headL.push(h); }
  for (const [x, z] of [[-1.9, 1.2], [1.9, 1.2], [-1.9, -1.2], [1.9, -1.2]]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.34, 28), mat(0x1d1f26, 0.9)); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.5, z); bus.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 20), mat(0xc9ced6, 0.35)); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.5, z); bus.add(hub);
  }
  const bumper = rbox(0.22, 0.28, 2.4, 0x2a2d33, 0.06); bumper.position.set(3.12, 0.42, 0); bus.add(bumper);
  for (const s of [-1, 1]) { const mir = rbox(0.1, 0.3, 0.12, 0x1d1f26, 0.03); mir.position.set(3.05, 2.0, s * 1.38); bus.add(mir); }
  for (const x of [1.6, 1.0]) { const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.02), mat(0x7a1f1f)); seam.position.set(x, 1.3, 1.26); bus.add(seam); }
  const ac = rbox(1.6, 0.26, 1.4, 0xdedede, 0.08); ac.position.set(-0.8, 2.86, 0); bus.add(ac);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.14, 2.53), mat(0xf2efe6)); stripe.position.set(0, 0.95, 0); bus.add(stripe);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 48), new THREE.MeshBasicMaterial({ color: 0xece6d6, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(SH_X, 0.03, SH_Z); G.add(ring);
  if (cfg.night) for (const sz of [-0.8, 0.8]) {
    const hl = new THREE.SpotLight(0xfff2d0, 80, 30, 0.45, 0.5, 1.4); hl.position.set(3.2, 0.7, sz); hl.target.position.set(12, 0, sz * 1.5); bus.add(hl, hl.target);
  }
  const IMP_LOCAL = cfg.busImpactLocal ?? 2.55;
  const K = cfg.busKeys ?? [[0, -15, 1.0, 0, 0], [1.8, -4.5, 1.0, 0.05, 0], [2.25, -2.6, 1.0, 0.18, 0.12], [2.55, -0.9, 0.75, 0.35, 0.1], [3.0, 0.4, -1.0, 0.42, 0.05], [60, 0.5, -1.1, 0.42, 0]];   /* its front corner reaches the shelter's roof edge AT the impact, then pushes through */     /* the bus ends AT the shelter, not through it */
  const KPRE = K.filter((k) => k[0] <= IMP_LOCAL + 1e-6);
  const busPose = (t) => {
    if (t <= IMP_LOCAL) { const [x, z, yaw, y] = monoCubic(KPRE, t); return { x, z, yaw, y }; }   /* smooth speed up to the hit (it moved in jerks between straight segments: the user, night v4) */
    let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], u = clamp01((t - a[0]) / (b[0] - a[0])), s = (i < 2 || t < IMP_LOCAL) ? u : u * u * (3 - 2 * u);
    const l = (x, y) => x + (y - x) * s; return { x: l(a[1], b[1]), z: l(a[2], b[2]), yaw: l(a[3], b[3]), y: l(a[4], b[4]) };
  };
  live.push((tw) => {
    const dt = tw - cfg.impactT, hit = dt >= 0, bp = busPose(tw - cfg.impactT + IMP_LOCAL);
    bus.position.set(bp.x, bp.y, bp.z); bus.rotation.y = bp.yaw;
    headL.forEach((h) => h.material.color.setHex(hash(Math.floor(tw * 9)) > 0.1 ? 0xfff3c0 : 0xb8a870));
    parts.forEach((p, i) => {
      if (!hit) { p.m.position.copy(p.home); p.m.rotation.set(0, 0, 0); return; }
      const v = pieceV[i];
      p.m.position.set(p.home.x + v.x * dt, Math.max(p.size * 0.1, p.home.y + v.y * dt - 4.9 * dt * dt), p.home.z + v.z * dt);
      p.m.rotation.set(pieceW[i].x * dt, pieceW[i].y * dt, pieceW[i].z * dt);
    });
    frag.forEach((f) => { f.m.visible = hit && !noFrag; if (!hit) return; f.m.position.set(f.p0.x + f.v.x * dt, Math.max(f.sz * 0.5, f.p0.y + f.v.y * dt - 4.9 * dt * dt), f.p0.z + f.v.z * dt); f.m.rotation.set(f.w.x * dt, f.w.y * dt, f.w.z * dt); });
    const ru = clamp01(dt / 0.9); ring.material.opacity = 0;   /* removed: it read as a debug marker (critic, night v2 and v3) */ ring.scale.setScalar(hit ? 0.3 + ru * 4.2 : 0.3);
  });

  return {
    group: G, bus, SH: { x: SH_X, z: SH_Z },
    busFront: (tw) => { const bp = busPose(tw - cfg.impactT + IMP_LOCAL); return new THREE.Vector3(bp.x + Math.cos(bp.yaw) * 2.95 + Math.sin(bp.yaw) * 1.19, 1.4, bp.z - Math.sin(bp.yaw) * 2.95 + Math.cos(bp.yaw) * -1.19); },   /* the front corner nearest the shelter */
    update: (tw, opt = {}) => { noFrag = !!opt.noFrag; live.forEach((f) => f(tw)); },   /* noFrag: the ghost shows the hit without the shatter cubes burying him */
  };
}
