/* world.js — the street, and everything in it that is alive.
   Every moving thing is a pure function of time (tw = world time in seconds), so a frame can
   be rendered on its own. The director (index.html) owns the clock and may warp it (hit-stop, ghost
   previews); the world just answers "what does the street look like at tw?". */
import * as THREE from "three";
import { monoCubic } from "./curve.js";
import { buildSmoke } from "./smoke.js";
import { mat, rbox, makePerson, pose } from "./people.js";
import { asphalt, paving, facade, shelter as buildShelter, HAZE, deco, hash1, mixHex, wind, softBlink, tvFlicker, halo as glare, pool, shaft, glowTex, smokeTex, skylineRing, liteFacade } from "./detail.js";

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
  /* a world-space sky dome (the old background was glued to the screen): zenith -> horizon haze, a warm city glow low on the horizon.
     It follows the camera, so it never parallaxes; the far skyline rings below stand against it. */
  const stops = cfg.sky.map(([, c]) => new THREE.Color(c));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(280, 40, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { cTop: { value: stops[0] }, cMid: { value: stops[Math.min(1, stops.length - 1)] }, cLow: { value: stops[Math.min(2, stops.length - 1)] }, haze: { value: new THREE.Color(HAZE) }, glowC: { value: new THREE.Color(cfg.night ? 0xff8a5a : 0xffe0b0) }, night: { value: cfg.night ? 1 : 0 } },
    vertexShader: "varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 cTop, cMid, cLow, haze, glowC; uniform float night; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y; vec3 c = mix(cLow, cMid, smoothstep(0.0, 0.35, h)); c = mix(c, cTop, smoothstep(0.3, 0.95, h));
        float band = exp(-pow(max(h, 0.0) / 0.18, 2.0)), az = atan(d.x, d.z);
        float city = 0.6 + 0.3 * sin(az * 2.0 + 0.8) + 0.2 * sin(az * 5.0 + 2.0);
        c = mix(c, haze, band * 0.85); c += glowC * band * city * 0.20 * (0.6 + 0.4 * night);
        c = mix(c, haze * 0.75, 1.0 - smoothstep(-0.3, 0.0, h)); gl_FragColor = vec4(c, 1.0); }`,
  }));
  dome.renderOrder = -10; dome.frustumCulled = false; dome.onBeforeRender = (r, sc_, cam) => { dome.position.copy(cam.position); }; G.add(deco(dome));
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
  flat(900, 900, P.grass, 0, -0.04, 0);                                                    /* ground and road run on to the horizon: the street continues, it does not end in a green square */
  flat(900, 140, P.grass, 0, -0.01, 0);
  flat(900, 6.2, P.road, 0, -0.002, 2.1); flat(900, 3.6, P.pavement, 0, 0.002, -2.4); flat(900, 2.4, P.pavement, 0, 0.002, 6.4); flat(900, 4.0, P.pavement, 0, 0.001, 9.6);
  const road = flat(140, 6.2, P.road, 0, 0, 2.1); road.material = new THREE.MeshStandardMaterial({ map: asphalt([24, 1.06]), roughness: 0.93 });
  const pave = flat(140, 3.6, P.pavement, 0, 0.004, -2.4); pave.material = new THREE.MeshStandardMaterial({ map: paving([58, 1.5]), roughness: 0.88 });
  const pave2 = flat(140, 2.4, P.pavement, 0, 0.004, 6.4); pave2.material = new THREE.MeshStandardMaterial({ map: paving([58, 1]), roughness: 0.88 });   /* the far pavement, where the lead ends up */
  const kerb2 = rbox(140, 0.2, 0.34, P.kerb, 0.03); kerb2.position.set(0, 0.1, 5.2); G.add(kerb2);
  for (let i = -20; i < 20; i++) flat(1.4, 0.14, P.lane, i * 3.2, 0.012, 2.1);                 /* dashed lane line */
  for (let i = 0; i < 7; i++) flat(0.5, 5.4, P.lane, 4.2 + i * 0.85, 0.013, 2.1);               /* crosswalk */
  const kerb = rbox(140, 0.2, 0.34, P.kerb, 0.03); kerb.position.set(0, 0.1, -0.78); G.add(kerb);

  /* ---- buildings with windows that blink and flicker ---- */
  const windows = [];
  const WINCOL = [0xffc977, 0xffd9a0, 0xffb866, 0xffe2b0, 0xcfe4ff, 0xb8d4ff, 0xffdca8, 0xffa85a];
  const building = (x, w, h, d, hex) => {
    const b = rbox(w, h, d, new THREE.Color(hex).multiplyScalar(P.nightDim ?? 1).getHex(), 0.08); b.position.set(x, h / 2, -9); G.add(b);   /* at night the walls are dim: light comes from windows, shops, lamps */
    const before = windows.length;
    facade(G, x, w, h, d, hex, P, Math.round(x * 7 + 101), windows);       /* depth: frames, sills, cornice, shopfront, awning */
    for (let i = before; i < windows.length; i++) {
      const id = windows[i].id, r0 = hash(id + 3.3);
      windows[i].kind = r0 < cfg.windows.blinkShare ? "blink" : r0 < cfg.windows.blinkShare + cfg.windows.flickerShare ? "flicker" : (hash(id + 9.1) < (cfg.windows.onShare ?? 0.55) ? "on" : "off");
      windows[i].col = WINCOL[Math.floor(hash(id + 5.5) * WINCOL.length)];                 /* warm, cool and amber lights, not one yellow */
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
  const cOff = new THREE.Color(P.windowOff), cOn = new THREE.Color(), cTv = new THREE.Color(0x4a78ff), cTv2 = new THREE.Color(0xcfe0ff);
  live.push((tw) => windows.forEach((w) => {                                              /* every change eases over >= 0.35 s: a stepped window in a still shot reads as stop motion (ERR-0020) */
    let k = w.kind === "on" ? 1 : 0;
    if (w.kind === "blink") k = softBlink(tw, w.id, cfg.windows.blinkRate, 0.4);
    if (w.kind === "flicker") { const f = tvFlicker(tw, w.id); cOn.copy(cTv).lerp(cTv2, f); k = 0.55 + 0.45 * f; } else cOn.setHex(w.col ?? P.windowOn);
    w.m.material.color.copy(cOff).lerp(cOn, k);
  }));
  /* a few lit windows have someone moving behind them: a dark shape crossing the pane, slowly */
  const movers = [];
  windows.forEach((w) => { if (w.kind === "on" && hash(w.id * 3.3 + 1.1) < 0.1) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.46), basic(0x0b0d16)); m.position.copy(w.m.position); m.position.z += 0.003; w.m.parent.add(deco(m)); movers.push({ m, x0: w.m.position.x, id: w.id }); } });
  live.push((tw) => movers.forEach(({ m, x0, id }) => { const ph = tw * 0.22 + id; m.position.x = x0 + Math.sin(ph) * 0.2; m.scale.y = 0.92 + 0.08 * Math.sin(tw * 1.9 + id); m.visible = Math.sin(ph * 0.5 + 1.3) > -0.7; }));

  /* ---- a cafe sign: an icon, not words, so it adds nothing to the on-screen word count ---- */
  const sign = new THREE.Group(); sign.position.set(-9, 3.6, -7.35); G.add(sign);
  sign.add(rbox(1.5, 1.1, 0.14, 0x3a2a22, 0.05));
  const cupMat = basic(P.signOn); const cupM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.06), cupMat); cupM.position.set(-0.08, 0, 0.1); sign.add(cupM);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 16), cupMat); handle.position.set(0.3, 0, 0.1); sign.add(handle);
  const signGlow = glare(G, -9, 3.6, -7.0, 5.2, P.signOn, 0.55, 1.6), cOnS = new THREE.Color(P.signOn).multiplyScalar(1.7), cOffS = new THREE.Color(P.signOff);
  live.push((tw) => {                                                                       /* a slow blink: it fades over 0.3 s, never a one-frame switch */
    const per = cfg.sign.period, ph = tw % per, k = ph < per * 0.68 ? Math.min(1, ph / 0.3) : 1 - Math.min(1, (ph - per * 0.68) / 0.3);
    cupMat.color.copy(cOffS).lerp(cOnS, k); signGlow.material.opacity = 0.12 + 0.5 * k;
  });

  /* ---- street lamp that flickers, traffic light that cycles ---- */
  const lampLights = [], lampFx = [], moths = [];
  const hidable = [];                                /* the far-side lamp the one-take crash camera sits beside: its pole is hidden during the take (cfg.hideLamp), its light stays */
  const lampPost = (x, z, dir, shadow) => {   /* dir: +1 the arm reaches toward +z (over the road from the near side), -1 toward -z */
    const g = new THREE.Group(); g.position.set(x, 0, z); G.add(g); if (x === 4.2 && z === 5.6) hidable.push(g);
    const pole = rbox(0.14, 4.6, 0.14, 0x3c434f, 0.04); pole.position.y = 2.3; g.add(pole);
    const arm = rbox(0.1, 0.1, 1.1, 0x3c434f, 0.03); arm.position.set(0, 4.5, dir * 0.5); g.add(arm);
    const head = rbox(0.42, 0.14, 0.32, 0x2c3139, 0.04); head.position.set(0, 4.42, dir * 1.0); g.add(head);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.26), basic(cfg.night ? 0xfff0c8 : 0xd8d8d0)); lens.position.set(0, 4.34, dir * 1.0); g.add(lens);
    if (!cfg.night) return;
    const s = new THREE.SpotLight(0xffd8a0, cfg.lamps?.intensity ?? 60, 18, 0.8, 0.75, 1.6);
    s.position.set(x, 4.3, z + dir * 1.0); s.target.position.set(x, 0, z + dir * 1.6); G.add(s, s.target);
    if (shadow) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; s.shadow.radius = 3; }
    lampLights.push(s);
    /* the lamp's practical light made visible: a glare at the lens, a faint cone of lit air, a pool on the ground, moths round the head */
    const gl = glare(g, 0, 4.34, dir * 1.0, 3.4, 0xffd9a0, 0.85, 2.4), cone = shaft(g, 0, 4.3, dir * 1.0, 0.3, 2.3, 0xffd9a0, 0.075, 4.3);
    const po = x === 4.2 && z === 5.6 ? 0.1 : 0.24, pl = pool(G, x, z + dir * 1.6, 3.4, 2.8, 0xffc27a, po);   /* the lamp the crash camera sits beside gets a weaker pool: the lens is right above it */
    lampFx.push({ s, gl, cone, pl, po, base: s.intensity, k: lampFx.length });
    for (let m = 0; m < 3; m++) { const mt = glare(g, 0, 4.2, dir * 1.0, 0.1, 0xfff3c0, 0.9, 1.5); moths.push({ s: mt, gx: g, i: lampFx.length * 3 + m, dir }); }
  };
  for (const [x, z, d, sh] of (cfg.night ? [[-4.6, -0.9, 1, true], [6.5, -0.9, 1, false], [-12, -0.9, 1, false], [4.2, 5.6, -1, false], [11, 5.6, -1, false]] : [])) lampPost(x, z, d, sh);
  live.push((tw) => {
    lampFx.forEach(({ s, gl, cone, pl, po, base, k }) => {                                   /* one lamp has a bad moment every 9 s: it dips and returns over half a second */
      const ph = (tw + k * 3.1) % 9, dip = k === 0 && ph > 8.2 && ph < 8.7 ? 0.5 * Math.sin(Math.PI * (ph - 8.2) / 0.5) : 0, f = 1 - dip;
      s.intensity = base * f; gl.material.opacity = 0.85 * f; cone.material.opacity = 0.075 * f; pl.material.opacity = po * f;
    });
    moths.forEach(({ s, i, dir }) => {
      const r = 0.28 + 0.2 * hash(i + 2.2), a = tw * (2.2 + hash(i) * 1.8) + i * 2.1;
      s.position.set(Math.sin(a) * r + Math.sin(tw * 1.3 + i) * 0.12, 4.2 + Math.sin(tw * 2.1 + i * 1.7) * 0.2, dir * 1.0 + Math.cos(a * 0.9) * r);
      s.material.opacity = 0.55 + 0.4 * Math.sin(tw * 7.3 + i);                         /* wing flutter, smooth */
    });
  });
  live.push((tw) => { const h = !!cfg.hideLamp && tw >= cfg.hideLamp[0] && tw <= cfg.hideLamp[1]; hidable.forEach((g) => { g.visible = !h; }); });
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

  const smokeUpdate = buildSmoke(G, bus, cfg);
  live.push((tw) => smokeUpdate(tw));   /* registered after the bus pose update so it follows the bus */

  /* ---- the squirrel: darts off the near pavement across the bus's lane (cfg.squirrel); the driver's reason to swerve ---- */
  if (cfg.squirrel) {
    const Q = cfg.squirrel, sq = new THREE.Group(); sq.visible = false; sq.scale.setScalar(Q.scale ?? 1); G.add(sq);   /* Q.scale: stylised up so it reads from the camera at 10 m */
    const fur = mat(0x8a6a4c, 0.9), furD = mat(0x5e4630, 0.9), belly = mat(0xd9c9ae, 0.9), dark = new THREE.MeshBasicMaterial({ color: 0x0b0b0d });
    const hop = new THREE.Group(); sq.add(hop);                                    /* the whole body hops inside this; the shadow-casting parts hang off it */
    const part2 = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; hop.add(o); return o; };
    const sphere = new THREE.SphereGeometry(1, 14, 10);
    part2(sphere, fur, 0, 0.13, 0, 0.09, 0.085, 0.16);                             /* body, long axis along +z (the way it runs) */
    part2(sphere, belly, 0, 0.1, 0.03, 0.075, 0.06, 0.12);
    const head = new THREE.Group(); head.position.set(0, 0.2, 0.16); hop.add(head);
    const hp = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; head.add(o); return o; };
    hp(sphere, fur, 0, 0, 0, 0.065, 0.06, 0.075); hp(sphere, belly, 0, -0.025, 0.05, 0.035, 0.03, 0.04);   /* head and muzzle */
    hp(sphere, dark, 0, -0.012, 0.092, 0.012, 0.012, 0.012);                                               /* nose */
    for (const s of [-1, 1]) { hp(sphere, furD, s * 0.04, 0.065, -0.015, 0.02, 0.035, 0.014); hp(sphere, dark, s * 0.045, 0.015, 0.045, 0.011, 0.014, 0.011); }   /* ears, eyes */
    const legs = [-1, 1].map((s) => [0.07, -0.1].map((z) => part2(sphere, furD, s * 0.05, 0.05, z, 0.025, 0.05, 0.04)));
    const tail = new THREE.Group(); tail.position.set(0, 0.17, -0.14); hop.add(tail);   /* a big curled bush: three puffs rising and curling forward over the back */
    [[0, 0.03, -0.07, 0.06, 0.07, 0.09], [0, 0.14, -0.1, 0.065, 0.1, 0.075], [0, 0.26, -0.06, 0.06, 0.08, 0.07], [0, 0.3, 0.03, 0.045, 0.05, 0.06]].forEach(([x, y, z, a, b, c], i) => { const o = new THREE.Mesh(sphere, i % 2 ? furD : fur); o.position.set(x, y, z); o.scale.set(a, b, c); o.castShadow = true; tail.add(o); });
    const gallop = Math.PI * 2 * 3.2;                                              /* ~3 bounds a second */
    live.push((tw) => {
      /* Q.keys [[t, z], ...]: run out, freeze, run back (the user, 2026-11-17: right before the swerve, from the far side); else z0 -> z1 */
      const KQ = Q.keys ?? [[Q.t0, Q.z0], [Q.t1, Q.z1]];
      let kq = 0; while (kq < KQ.length - 2 && tw > KQ[kq + 1][0]) kq++;
      const [ta, za] = KQ[kq], [tb, zb] = KQ[kq + 1], uq = clamp01((tw - ta) / (tb - ta)), sq_ = uq * uq * (3 - 2 * uq);
      const u = clamp01((tw - KQ[0][0]) / (KQ[KQ.length - 1][0] - KQ[0][0]));
      sq.visible = tw >= KQ[0][0] - 0.01 && tw <= KQ[KQ.length - 1][0] + 0.4;
      if (!sq.visible) return;
      const z = za + (zb - za) * sq_, run = Math.abs(zb - za) > 0.05 && tw >= ta && tw <= tb, ph = (tw - KQ[0][0]) * gallop / (2 * Math.PI) * Math.PI;
      sq.position.set(Q.x, 0, z); sq.rotation.y = zb < za ? Math.PI : 0;          /* faces the way it runs */
      hop.position.y = run ? Math.abs(Math.sin(ph)) * 0.16 : 0; hop.rotation.x = run ? Math.cos(ph) * 0.18 : 0;   /* the hop: nose up as it leaves the ground */
      tail.rotation.z = Math.sin(tw * 9) * 0.22; tail.rotation.x = run ? -0.15 + Math.sin(ph) * 0.1 : 0.1;
      legs.forEach((pair, k) => pair.forEach((l, j) => { l.rotation.x = run ? Math.sin(ph + (j ? 1.4 : 0)) * 0.9 : 0; }));
      head.rotation.x = run ? -Math.cos(ph) * 0.15 : 0;
    });
  }

  /* ===================================================================================================================
     2026-11-17: DEPTH, LIGHT, LIFE (the user: "extreme depth in each and every frame ... lighting at all points ... life everywhere").
     Layers, near to far: foreground dressing at the edges of the frame -> the street and its lamps -> the long building rows
     (lived-in, lit windows) -> a second row of blocks -> two rings of skyline in haze -> the sky and its city glow.
     Every mover below is a pure function of tw. ================================================================ */
  const NIGHT = !!cfg.night, L = cfg.life ?? {};
  const decoAll = (o) => { o.traverse((q) => { q.userData.noShadow = true; }); return o; };

  /* ---- 1. the building rows, continued along the whole street (the shop and the stairs stand in their own gaps) ---- */
  const liteRows = [];
  const lite = (x, w, h, hex, face, seed, shop = true) => liteRows.push(liteFacade(G, { x, w, h, hex, P, seed, zFront: face > 0 ? -7.5 : 11.5, face, shop }));
  const nearRow = [[-19.7, 6, 7.5], [-26, 6.5, 9], [-32.5, 6, 6.5], [-39, 7, 8.5], [-46, 6, 7], [-52.5, 6.5, 10], [-59, 6, 6.5], [-65.5, 7, 8], [35.6, 7, 7.5], [42.4, 6.5, 9.5], [49, 6, 6.5], [55.4, 6.5, 8], [62, 6, 11], [68.5, 7, 7], [22.4, 2.2, 6]];
  nearRow.forEach(([x, w, h], i) => lite(x, w, h, P.bld[(i * 2 + 1) % 5], 1, 300 + i * 17, i % 4 !== 0));
  const farRow = [[-22.4, 6, 8], [-28.8, 6.5, 6.5], [-35.5, 6, 9.5], [-42, 7, 7], [-48.8, 6, 8.5], [-55.2, 6.5, 6.5], [-62, 6, 10], [-68.8, 7, 7.5], [23.2, 6, 7], [29.6, 6.5, 8.5], [36.2, 6, 6.5], [42.6, 7, 9], [49.4, 6, 7.5], [56, 6.5, 6], [62.6, 6, 10.5], [69.2, 7, 7]];
  farRow.forEach(([x, w, h], i) => lite(x, w, h, P.bld[(i * 3 + 2) % 5], -1, 500 + i * 19, i % 3 !== 1));
  live.push((tw) => liteRows.forEach((r, ri) => {
    if (r.awning) { const q = wind(tw, r.awning.k); r.awning.aw.rotation.x = 0.28 + 0.03 * Math.sin(tw * 1.3 + r.awning.k) * q; r.awning.fr.rotation.x = 0.1 * Math.sin(tw * 1.7 + r.awning.k * 2) * q; }
    r.tv.forEach(({ m, id }) => { const f = tvFlicker(tw, id); m.color.copy(cTv).lerp(cTv2, f).multiplyScalar(0.55 + 0.45 * f); });
    r.mov.forEach(({ m, x0, id }) => { const ph = tw * 0.2 + id; m.position.x = x0 + Math.sin(ph) * 0.18; m.visible = Math.sin(ph * 0.5 + 1.3) > -0.6; });
  }));

  /* ---- 2. the far city: two walls of blocks behind the rows, two rings of skyline in haze (the road leaves through gaps in the rings) ---- */
  const roadGaps = [[0, 0.014], [0.986, 1], [0.486, 0.514]];
  [[-24, 0.3, 9, 20], [30, 0.3, 9, 20], [-46, 0.5, 12, 30], [52, 0.52, 12, 30]].forEach(([z, haze, minH, maxH], i) => {
    const wd = 190, Wpx = 4096, ppm = Wpx / wd;
    const m = skylineRing(G, { R: 1, H: 34, seed: 71 + i * 9, haze, lit: 0.26, minH, maxH, minW: 6, maxW: 15, flat: { width: wd, z }, glowBoost: 0.8 });
    m.position.z = z;
  });
  skylineRing(G, { R: 120, H: 44, seed: 21, haze: 0.7, lit: 0.3, minH: 18, maxH: 42, minW: 9, maxW: 24, gaps: roadGaps, glowBoost: 0.9 });
  skylineRing(G, { R: 175, H: 70, seed: 33, haze: 0.88, lit: 0.34, minH: 26, maxH: 66, minW: 12, maxW: 30, gaps: roadGaps, glowBoost: 1.0 });
  /* layers of ground mist between the rows: each step back is lighter and bluer */
  { const mc = document.createElement("canvas"); mc.width = 4; mc.height = 128; const mg = mc.getContext("2d"), gr = mg.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0.9)"); mg.fillStyle = gr; mg.fillRect(0, 0, 4, 128);
    const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace;
    [[-14, 0.3], [17, 0.3], [-35, 0.34], [40, 0.34]].forEach(([z, op]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(190, 9), new THREE.MeshBasicMaterial({ map: mt, color: HAZE, transparent: true, opacity: op, depthWrite: false, fog: false })); m.position.set(0, 4.5, z); if (z > 0) m.rotation.y = Math.PI; G.add(deco(m)); }); }
  if (NIGHT) { for (const sx of [-1, 1]) glare(G, sx * 150, 3.5, 2.2, 70, 0xffa060, 0.45, 1.2).material.fog = false; }   /* where the street leaves the city: a warm glow at both ends */

  /* ---- 3. light that belongs to things: pools, glare, cones ---- */
  if (NIGHT) {
    /* a lamp for the car and the cycle lane, on the far side (the pole is out of frame in the door shots) */
    lampPost(-27.5, 5.6, -1, false);
    /* the street lamps that recede: poles and bright heads to the end of sight, each with a glare that blooms and a puddle of light */
    const farPole = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 4.6, 0.14), new THREE.MeshStandardMaterial({ color: 0x3c434f, roughness: 0.6 }), 40), farHead = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.14, 0.32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c8).multiplyScalar(2.4) }), 40), m4 = new THREE.Matrix4();
    let n = 0;
    for (const sg of [-1, 1]) for (let k = 0; k < 10; k++) for (const side of [0, 1]) {
      const x = sg * (20 + k * 14 + side * 7); if (side === 0 && x > -50 && x < -20) continue;                          /* not through the stairs block */
      if (x > 20 && x < 44 && side === 0) continue;
      const z = side ? 5.6 : -0.9; m4.makeTranslation(x, 2.3, z); farPole.setMatrixAt(n, m4); m4.makeTranslation(x, 4.42, z + (side ? -1 : 1)); farHead.setMatrixAt(n, m4); n++;
      glare(G, x, 4.34, z + (side ? -1 : 1), 3.6 + k * 0.5, 0xffd9a0, 0.85, 2.2); if (k < 5) pool(G, x, z + (side ? -1.6 : 1.6), 3.4, 2.8, 0xffc27a, 0.2);
    }
    farPole.count = farHead.count = n; farPole.instanceMatrix.needsUpdate = farHead.instanceMatrix.needsUpdate = true; G.add(deco(farPole), deco(farHead));
    /* the traffic lights down the road and the shop-window glow along the near pavement */
    for (const x of [-34, -60, 46, 78]) { const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 5.6, 8), new THREE.MeshStandardMaterial({ color: 0x3c434f, roughness: 0.6 })); tp.position.set(x, 2.8, -1.6); G.add(deco(tp)); const th = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.25), new THREE.MeshStandardMaterial({ color: 0x1d2027 })); th.position.set(x, 5.5, -1.5); G.add(deco(th)); for (const [i, c] of [0xe2433f, 0xf2c230, 0x3cc16a].entries()) glare(G, x, 5.8 - i * 0.3, -1.4, 1.1, c, i === 0 ? 0.9 : 0.15, 2.6); }
    for (const [x, c] of [[-16, 0xffb870], [-26, 0xffb870], [-37, 0x9fc8ff], [-48, 0xffb870], [34, 0xffb870], [47, 0x9fc8ff], [60, 0xffb870]]) pool(G, x, -2.6, 3.2, 1.9, c, 0.18);
    /* the bus stop: the shelter's tube spills on the pavement; a pool at the stop */
    pool(G, SH_X, SH_Z + 0.3, 2.6, 1.7, 0xdfeaff, 0.2);
  }

  /* ---- 4. cables, poles, flags: overhead lines that run away down the street (depth), and flags that move ---- */
  {
    const poleX = [-18.5, 14.5, 40, -48, -64, 58, 76, -80], woodM = new THREE.MeshStandardMaterial({ color: 0x4a443c, roughness: 0.9 }), cabM = new THREE.MeshBasicMaterial({ color: 0x0b0d14 });
    poleX.forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 6.4, 8), woodM); p.position.set(x, 3.2, -3.2); G.add(p); const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.3), woodM); bar.position.set(x, 5.9, -3.2); G.add(bar); });
    const sorted = [...poleX].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) for (const [dz, y] of [[-0.55, 5.9], [0.55, 5.9], [0, 5.4]]) {
      const a = new THREE.Vector3(sorted[i], y, -3.2 + dz), b = new THREE.Vector3(sorted[i + 1], y, -3.2 + dz), mid = a.clone().lerp(b, 0.5); mid.y -= 0.35 + Math.abs(b.x - a.x) * 0.012;
      const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, b]), 14, 0.014, 3), cabM); G.add(deco(t));
    }
    /* flags on two lamp posts, rippling in the breeze (vertex ripple, no step) */
    const flags = [[6.5, -0.9, 0xd8363a], [-12, -0.9, 0x2f8fd9], [11, 5.6, 0xf2c230]].map(([x, z, col], i) => {
      const geo = new THREE.PlaneGeometry(0.9, 0.55, 10, 1), m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(0.75), roughness: 0.8, side: THREE.DoubleSide }));
      m.position.set(x + 0.07 + 0.45, 3.55, z); G.add(m); return { m, geo, p0: geo.attributes.position.array.slice(), i, x };
    });
    live.push((tw) => flags.forEach(({ m, geo, p0, i }) => {
      const pos = geo.attributes.position, q = wind(tw, i * 1.9);
      for (let v = 0; v < pos.count; v++) { const u = (p0[v * 3] + 0.45) / 0.9; pos.setZ(v, Math.sin(u * 6 - tw * (3.2 + q) + i) * 0.12 * u * q); }
      pos.needsUpdate = true;
    }));
  }

  /* ---- 5. people and traffic away from the story: they cross the film once, so nothing pops in view ---- */
  const AMB = L.walkers ?? [
    { x0: -52, z: 10.8, dir: 1, speed: 1.4, top: 0x8a5fb0, bottom: 0x2e3340, skin: 0xe0ac82, hair: 0x2b2420, scale: 1.0, bun: true },
    { x0: 30, z: 9.3, dir: -1, speed: 1.2, top: 0xc9532e, bottom: 0x3a3f4d, skin: 0xc58a63, hair: 0x1b1b1f, scale: 1.05 },
    { x0: 48, z: 7.0, dir: -1, speed: 1.0, top: 0x3f8fa8, bottom: 0x4a4038, skin: 0xf0c8a0, hair: 0x8a6a3a, scale: 0.95, bun: true },
    { x0: -64, z: -3.7, dir: 1, speed: 1.6, top: 0x5a7a3a, bottom: 0x2a2a30, skin: 0xd9a07a, hair: 0x3a2418, scale: 1.0 },
    { x0: 62, z: -3.2, dir: -1, speed: 1.3, top: 0xe6c030, bottom: 0x35445e, skin: 0xb9805a, hair: 0x1b1b1f, scale: 1.0 },
  ];
  const amb = AMB.map((w, i) => { const p = makePerson(w); p.scale.setScalar(w.scale || 1); decoAll(p); G.add(p); return { p, w, i }; });
  live.push((tw) => amb.forEach(({ p, w, i }) => {
    p.position.set(w.x0 + tw * w.speed * w.dir, 0, w.z); p.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    pose(p, { t: tw, seed: 11 + i * 7, state: "walk", speed: 4.6 * w.speed, expr: "neutral" });
  }));
  { /* a cyclist on the road, riding east once through the film, with a headlight and a red rear lamp */
    const bike = new THREE.Group(); G.add(bike);
    const tyre = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.9 }), frameM = new THREE.MeshStandardMaterial({ color: 0xc8362f, roughness: 0.5, metalness: 0.4 });
    const wheels = [-0.52, 0.52].map((x) => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 8, 20), tyre); w.position.set(x, 0.36, 0); bike.add(w); return w; });
    const bar = (len, x, y, rz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 0.04), frameM); m.position.set(x, y, 0); m.rotation.z = rz; bike.add(m); };
    bar(0.95, 0, 0.62, 0); bar(0.7, -0.15, 0.5, 0.9); bar(0.55, 0.28, 0.47, -1.0);
    const rider = makePerson({ skin: 0xd9a07a, hair: 0x2b2420, top: 0x1fb5a8, bottom: 0x2a2a30 }); rider.scale.setScalar(0.86); rider.rotation.y = Math.PI / 2; rider.position.set(-0.12, 0.2, 0); bike.add(rider); decoAll(bike);
    const head = glare(bike, 0.95, 0.85, 0, 1.0, 0xfff3d0, 0.95, 2.4), tail = glare(bike, -0.9, 0.7, 0, 0.5, 0xff3030, 0.9, 2.0);
    live.push((tw) => {
      const x = (L.cyclistX0 ?? -128) + tw * 6.0; bike.position.set(x, 0, 1.9); bike.visible = x > -170 && x < 175;
      wheels.forEach((w) => { w.rotation.z = -tw * 18; });
      const u = rider.userData, ph = tw * 7.5; pose(rider, { t: tw, seed: 3, state: "idle", expr: "neutral" });
      u.legL.rotation.x = -1.0 + Math.sin(ph) * 0.5; u.legR.rotation.x = -1.0 - Math.sin(ph) * 0.5; u.armL.rotation.x = -1.15; u.armR.rotation.x = -1.15; u.armL.rotation.z = 0.12; u.armR.rotation.z = -0.12;
      u.body.rotation.x = 0.2;
    });
  }
  if (NIGHT) { /* distant traffic, only beyond 60 m so it never crosses the story; each car fades in and out over 15 m at the ends of its run */
    const cars = [];
    for (let k = 0; k < 8; k++) {
      const east = k % 2 === 0, side = (k >> 1) % 2 === 0 ? -1 : 1, g = new THREE.Group(); G.add(g);
      const bodyM = new THREE.MeshStandardMaterial({ color: [0x7a2f2f, 0x2f4f7a, 0x6a6a72, 0x2f6a4f][k % 4], roughness: 0.5, transparent: true });
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.7, 1.75), bodyM); b1.position.y = 0.55; g.add(b1); const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 1.6), bodyM); b2.position.set(-0.2, 1.1, 0); g.add(b2);
      const hl = [-0.62, 0.62].map((z) => glare(g, 2.05, 0.62, z, 1.7, 0xfff3d0, 1, 2.8)), tl = [-0.62, 0.62].map((z) => glare(g, -2.05, 0.7, z, 0.8, 0xff2a2a, 0.9, 2.2));
      const beam = pool(g, 6.5, 0, 5.5, 1.5, 0xfff0c8, 0.0, 0.03);
      decoAll(g); g.rotation.y = east ? 0 : Math.PI; g.userData = { east, side, k, hl, tl, bodyM, beam };
      cars.push(g);
    }
    live.push((tw) => cars.forEach((g) => {
      const { east, side, k, hl, tl, bodyM, beam } = g.userData, sp = 8 + (k % 3) * 1.6, u = (tw * sp + k * 23) % 110;
      const x0 = side < 0 ? -170 : 60, x = east ? x0 + u : x0 + 110 - u, fade = Math.min(1, u / 15, (110 - u) / 15);
      g.position.set(x, 0, east ? 0.9 : 3.5); bodyM.opacity = fade; g.visible = fade > 0.01;
      hl.forEach((h) => { h.material.opacity = fade; }); tl.forEach((h) => { h.material.opacity = 0.9 * fade; }); beam.material.opacity = 0.32 * fade;
    }));
  }

  /* ---- 6. the sky and the ground: bats crossing, leaves drifting, steam rising ---- */
  const bats = Array.from({ length: L.bats ?? 6 }, (_, i) => {
    const g = new THREE.Group(); G.add(g); const dk = basic(0x07080e);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.22), dk));
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ color: 0x07080e, side: THREE.DoubleSide })), wr = wl.clone();
    const pl = new THREE.Group(), pr = new THREE.Group(); pl.add(wl); pr.add(wr); wl.position.x = -0.21; wr.position.x = 0.21; g.add(pl, pr); decoAll(g);
    return { g, pl, pr, i, t0: [4.5, 9.5, 14.5, 20, 27.5, 36, 42][i % 7], dir: i % 2 ? -1 : 1, z: i % 3 === 0 ? 33 : -34 + (i % 4) * 2, y: 10.5 + (i % 3) * 2.6 };
  });
  live.push((tw) => bats.forEach(({ g, pl, pr, i, t0, dir, z, y }) => {
    const x = (tw - t0) * 6.5 * dir; g.visible = Math.abs(x) < 70;
    g.position.set(x, y + Math.sin(tw * 0.9 + i) * 1.2 + Math.sin(tw * 3.1 + i * 2) * 0.35, z); g.rotation.y = dir > 0 ? 0 : Math.PI;
    const f = Math.sin(tw * 11 + i) * 0.85; pl.rotation.z = f; pr.rotation.z = -f;
  }));
  const LEAFC = [0x8a6a2a, 0xa07a30, 0x6a8a3a, 0xc8c4b4, 0x7a5a2a];
  const leaves = Array.from({ length: L.leaves ?? 22 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.09), new THREE.MeshStandardMaterial({ color: LEAFC[i % 5], roughness: 0.9, side: THREE.DoubleSide })); G.add(decoAll(m)); return { m, i, x0: -34 + i * 3.4 + hash(i) * 2, z: i % 3 === 0 ? 4.4 : i % 3 === 1 ? -3.9 : 2.8 + hash(i + 3) * 2 }; });
  live.push((tw) => leaves.forEach(({ m, i, x0, z }) => {
    const q = wind(tw, i), lift = Math.max(0, Math.sin(tw * 1.1 + i * 2.1)) ** 3;
    m.position.set(x0 - tw * 0.45 - 0.7 * Math.sin(tw * 0.43 + i), 0.03 + lift * 0.3 * q, z + Math.sin(tw * 0.8 + i) * 0.4);
    m.rotation.set(-Math.PI / 2 + lift * 1.5 * Math.sin(tw * 4 + i), tw * (0.8 + lift * 4) + i, 0);
  }));
  const vents = (L.vents ?? [[-9.2, 3.4], [13.4, -1.7], [-38, 5.4]]).map(([x, z], vi) => {
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.5 })); cover.position.set(x, 0.02, z); G.add(decoAll(cover));
    const puffs = Array.from({ length: 9 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex(), color: 0xa8b6d8, transparent: true, depthWrite: false, opacity: 0.2 })); sp.material.fog = true; G.add(deco(sp)); return sp; });
    return { x, z, puffs, vi };
  });
  live.push((tw) => vents.forEach(({ x, z, puffs, vi }) => puffs.forEach((sp, i) => {
    const u = (tw * 0.22 + i / puffs.length + vi * 0.31) % 1, q = wind(tw, vi);
    sp.position.set(x + u * 1.6 * q + Math.sin(tw * 0.7 + i) * 0.15, 0.15 + u * 3.4, z + Math.sin(tw * 0.5 + i * 2) * 0.15); sp.scale.setScalar(0.5 + u * 2.0); sp.material.opacity = 0.26 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.6);
  })));

  /* ---- 7. foreground dressing: things near the lens at the edge of the frame, out of focus, so every shot has a front, a middle and a back ---- */
  const dark = (hex, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m });
  const prop = {
    bollard: (x, z) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.85, 12), dark(0x3a3f4a, 0.5, 0.4)); b.position.y = 0.425; const band = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0b0).multiplyScalar(1.6) })); band.position.y = 0.72; g.add(b, band); g.position.set(x, 0, z); return g; },
    bin: (x, z) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.23, 0.85, 16), dark(0x3d6b4f, 0.6)); b.position.y = 0.425; const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16), dark(0x2b2f36, 0.5)); lid.position.y = 0.88; g.add(b, lid); g.position.set(x, 0, z); return g; },
    planter: (x, z, k = 0) => { const g = new THREE.Group(); const box = rbox(0.9, 0.5, 0.45, 0x4a4036, 0.05); box.position.y = 0.25; g.add(box); for (let i = 0; i < 5; i++) { const l = rbox(0.36 + (i % 2) * 0.1, 0.34, 0.3, i % 2 ? 0x2d6a33 : 0x3a7d3f, 0.12); l.position.set((i - 2) * 0.18, 0.62 + (i % 3) * 0.1, (i % 2 - 0.5) * 0.1); l.rotation.z = (i - 2) * 0.1; g.add(l); } g.position.set(x, 0, z); g.userData.leafs = g.children.slice(1); g.userData.k = k; return g; },
    signpost: (x, z) => { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 10), dark(0x59606c, 0.4, 0.6)); p.position.y = 1.25; const d = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.4, emissive: 0x2f6fd6, emissiveIntensity: 0.25 })); d.rotation.x = Math.PI / 2; d.position.set(0, 2.2, 0.04); g.add(p, d); g.position.set(x, 0, z); return g; },
    bikeRack: (x, z, yaw = 0) => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.022, 6, 14, Math.PI), dark(0x8a8f99, 0.4, 0.7)); hoop.position.set(i * 0.5 - 0.75, 0.3, 0); g.add(hoop); } g.position.set(x, 0, z); g.rotation.y = yaw; return g; },
  };
  const dress = [prop.bollard(-3.3, 8.8), prop.bin(-2.5, 8.8), prop.planter(2.9, 8.7, 3), prop.bikeRack(-9, 8.9), prop.bin(-5.6, 8.9), prop.bollard(-27.4, 5.9), prop.bollard(-26.2, 5.9), prop.signpost(-30.4, 5.9), prop.planter(-21.6, 5.8, 4), prop.bin(-16, -2.6), prop.planter(-15, -3.1, 5), prop.bin(18, -2.7), prop.bollard(20, -0.55), prop.bollard(22, -0.55)];
  dress.forEach((o) => { decoAll(o); G.add(o); });
  live.push((tw) => dress.forEach((o) => { if (o.userData.leafs) o.userData.leafs.forEach((l, i) => { l.rotation.z = (i - 2) * 0.1 + Math.sin(tw * 1.4 + i + o.userData.k) * 0.06 * wind(tw, o.userData.k); }); }));

  return {
    group: G, bus, SH: { x: SH_X, z: SH_Z },
    busFront: (tw) => { const bp = busPose(tw - cfg.impactT + IMP_LOCAL); return new THREE.Vector3(bp.x + Math.cos(bp.yaw) * 2.95 + Math.sin(bp.yaw) * 1.19, 1.4, bp.z - Math.sin(bp.yaw) * 2.95 + Math.cos(bp.yaw) * -1.19); },   /* the front corner nearest the shelter */
    update: (tw, opt = {}) => { noFrag = !!opt.noFrag; live.forEach((f) => f(tw)); },   /* noFrag: the ghost shows the hit without the shatter cubes burying him */
  };
}
