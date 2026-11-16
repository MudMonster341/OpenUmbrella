/* smoke.js — smoke rising from the crumpled bus front after the impact.
   Every particle is a pure function of (age since impact, index): no state, no Math.random, any frame in any order.
   Continuous emission (born evenly), alpha smoothstep in and out, size grows smoothly, slow curl-like drift.
   (The `three` import below is the only dependency; check_smoke.mjs strips it.) particleState() has no three.js / browser dependency so check_smoke.mjs can test it. */

import * as THREE from "three";

export const N_PARTICLES = 150;
export const LIFE = 6.5;                     /* seconds each particle lives; respawns with a new random seed, at alpha 0 */

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* age = tw - impactT (seconds). Returns bus-local position (x,y,z), size (world units), alpha 0..1, u (0..1 life), rot, tint (0..1). */
export function particleState(i, age) {
  const off = (i / N_PARTICLES) * LIFE;      /* even spacing of births: a steady stream, no waves */
  const a = age - off;
  if (a < 0) return { x: 0, y: 0, z: 0, size: 1, alpha: 0, u: 0, rot: 0, tint: 0 };
  const k = Math.floor(a / LIFE), t = a - k * LIFE, u = t / LIFE;
  const h = (n) => hash(i * 17.3 + k * 91.7 + n);
  /* emission point on the crumpled front-left corner / engine area, bus-local */
  const sx = 2.9 + h(1) * 0.6, sy = 1.0 + h(2) * 0.6, sz = -0.4 - h(3) * 0.9;
  /* slow turbulent drift: low-frequency sines of time and index, amplitude grows with age (a curl-like wander) */
  const ph = h(4) * 6.28, ph2 = h(5) * 6.28;
  const dx = (Math.sin(t * 0.55 + ph) + 0.5 * Math.sin(t * 1.15 + ph2 + i)) * 0.35 * t * 0.5;
  const dz = (Math.cos(t * 0.45 + ph2) + 0.5 * Math.sin(t * 0.95 + ph + i * 0.7)) * 0.3 * t * 0.5;
  const rise = 0.3 + 4.6 * (1 - Math.pow(1 - u, 1.6));          /* decelerating rise */
  const x = sx - 0.55 * t + dx;                                 /* the wind carries it toward -x */
  const y = sy + rise;
  const z = sz + (h(6) - 0.5) * 0.8 * u + dz;
  const s0 = 1.3 + h(7) * 0.5, s1 = 4.6 + h(8) * 1.6;
  const size = s0 + (s1 - s0) * (1 - (1 - u) * (1 - u));        /* continuous growth, finite slope at 0 */
  const alpha = (0.5 + 0.25 * h(9)) * smooth(0, 0.22, u) * (1 - smooth(0.38, 1, u));
  return { x, y, z, size, alpha, u, rot: h(10) * 6.28 + t * 0.08, tint: h(11) };
}

function puffTexture() {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d");
  const blob = (cx, cy, r, rgb, a) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.5, `rgba(${rgb},${a * 0.55})`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.fill();
  };
  /* darker, wider underlay gives the soft dark edge; lighter overlapping blobs give the billowing core */
  blob(128, 128, 126, "120,122,130", 0.55);
  [[98, 104, 70], [158, 100, 66], [124, 160, 72], [92, 150, 56], [164, 150, 58], [128, 124, 60]].forEach(([cx, cy, r]) => blob(cx, cy, r, "226,228,232", 0.6));
  [[112, 116, 36], [146, 134, 34]].forEach(([cx, cy, r]) => blob(cx, cy, r, "246,247,250", 0.5));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* returns update(tw) */
export function buildSmoke(G, bus, cfg) {
  const tex = puffTexture(), night = !!cfg.night, parts = [];
  for (let i = 0; i < N_PARTICLES; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true, fog: true }));
    s.castShadow = false; s.receiveShadow = false; s.visible = false; s.renderOrder = 5; G.add(s); parts.push(s);
  }
  const p3 = new THREE.Vector3(), col = new THREE.Color(), cWarm = new THREE.Color(0xffd9a0);
  const cLight = new THREE.Color(night ? 0xd0d5de : 0xe0e2e6), cDark = new THREE.Color(night ? 0x8e939e : 0xb4b7bd);

  return (tw) => {
    const age = tw - cfg.impactT;
    if (age < 0) { parts.forEach((s) => { s.visible = false; }); return; }
    bus.updateMatrixWorld(true);
    parts.forEach((s, i) => {
      const st = particleState(i, age);
      if (st.alpha <= 0.001) { s.visible = false; return; }
      p3.set(st.x, st.y, st.z); bus.localToWorld(p3);
      /* bus-local y is up for a level bus; the rise is added in world space so smoke does not tilt with the bus */
      s.position.copy(p3); s.scale.set(st.size, st.size, 1);
      s.material.rotation = st.rot;
      col.copy(cLight).lerp(cDark, 0.15 + 0.5 * st.tint * smooth(0.1, 0.9, st.u));
      if (night) col.lerp(cWarm, 0.25 * (1 - smooth(0, 0.4, st.u)));   /* headlight glow catches the base of the plume */
      s.material.color.copy(col); s.material.opacity = st.alpha; s.visible = true;
    });
  };
}
