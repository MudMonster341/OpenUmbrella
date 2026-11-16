/* people.js — box people with drawn faces, and the poses that make them act.
   Part of the story-reel foundation. Pure functions of time: no state is carried
   between frames, so any frame can be rendered on its own (HyperFrames seeks, it does not play). */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* PBR so the key, rim and environment light read on every surface (was Lambert, which read flat) */
export const mat = (hex, rough = 0.78) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
export const rbox = (w, h, d, hex, r = 0.04) =>
  new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.2, h / 2.2, d / 2.2)), mat(hex));

const INK = "#17171c";

/* ---------- faces: an expression is a texture swap, a blink is a second swap ---------- */
export function drawFace(ctx, expr, blink = false) {
  ctx.clearRect(0, 0, 512, 480);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = INK; ctx.fillStyle = INK;
  const brow = (x1, y1, x2, y2) => { ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const dot = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  const shut = (x, y) => { ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.lineTo(x + 26, y); ctx.stroke(); };
  const ring = (x, y, r, pr, px = 0, py = 0) => {
    if (blink) { shut(x, y); return; }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.lineWidth = 10; ctx.stroke(); ctx.fillStyle = INK; dot(x + px, y + py, pr);
  };
  const L = 150, R = 362;
  if (expr === "neutral") {
    brow(100, 130, 200, 130); brow(312, 130, 412, 130);
    if (blink) { shut(L, 215); shut(R, 215); } else { dot(L, 215, 21); dot(R, 215, 21); }
    ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(215, 345); ctx.lineTo(297, 345); ctx.stroke();
  } else if (expr === "shock") {
    brow(100, 88, 200, 68); brow(312, 68, 412, 88);
    ring(L, 205, 46, 11); ring(R, 205, 46, 11);
    ctx.beginPath(); ctx.ellipse(256, 362, 26, 36, 0, 0, 7); ctx.fill();
  } else if (expr === "scared") {
    brow(100, 144, 205, 98); brow(307, 98, 412, 144);
    ring(L, 212, 38, 8, -6, -9); ring(R, 212, 38, 8, -6, -9);
    ctx.lineWidth = 14; ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const x = 190 + i * 6.6, y = 352 + Math.sin(i * 0.95) * 11; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  } else if (expr === "deadpan") {
    brow(100, 150, 200, 136); brow(312, 136, 412, 150);
    if (blink) { shut(L, 214); shut(R, 214); }
    else {
      ctx.beginPath(); ctx.arc(L, 214, 24, 0, Math.PI); ctx.fill(); ctx.beginPath(); ctx.arc(R, 214, 24, 0, Math.PI); ctx.fill();
      ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(L - 26, 214); ctx.lineTo(L + 26, 214); ctx.moveTo(R - 26, 214); ctx.lineTo(R + 26, 214); ctx.stroke();
    }
    ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(206, 350); ctx.lineTo(300, 346); ctx.stroke();
  } else if (expr === "happy") {
    brow(100, 112, 200, 100); brow(312, 100, 412, 112);
    ctx.lineWidth = 15;
    ctx.beginPath(); ctx.arc(L, 235, 28, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(R, 235, 28, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(176, 320); ctx.quadraticCurveTo(256, 430, 336, 320); ctx.closePath(); ctx.fill();
  }
}

/* ---------- a person: boxes, a big head, hip- and shoulder-pivoted limbs ---------- */
export function makePerson(o) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const torso = rbox(0.66, 0.74, 0.36, o.top, 0.06); torso.position.y = 1.0; body.add(torso);
  const mkLeg = (sx) => {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.17, 0.72, 0);
    const l = rbox(0.28, 0.72, 0.3, o.bottom, 0.05); l.position.y = -0.36; pivot.add(l); body.add(pivot); return pivot;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);
  const mkArm = (sx) => {
    const a = new THREE.Group(); a.position.set(sx * 0.45, 1.3, 0);
    const m = rbox(0.22, 0.62, 0.22, o.top, 0.05); m.position.y = -0.27; a.add(m);
    const h = rbox(0.22, 0.2, 0.22, o.skin, 0.06); h.position.y = -0.66; a.add(h);
    body.add(a); return a;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  const cup = rbox(0.14, 0.2, 0.14, 0xf5f0e6, 0.03); cup.position.set(0, -0.78, 0.1); cup.visible = false; armR.add(cup);
  const head = new THREE.Group(); head.position.y = 1.78; body.add(head);
  head.add(rbox(0.8, 0.76, 0.72, o.skin, 0.15));
  const hair = rbox(0.84, 0.26, 0.76, o.hair, 0.09); hair.position.y = 0.37; head.add(hair);
  if (o.bun) { const bun = rbox(0.28, 0.28, 0.28, o.hair, 0.1); bun.position.set(0, 0.62, -0.1); head.add(bun); }
  const fc = document.createElement("canvas"); fc.width = 512; fc.height = 480;
  const tex = new THREE.CanvasTexture(fc); tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.64), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  face.position.set(0, -0.04, 0.362); head.add(face);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: 0x1a2a10, transparent: true, opacity: 0.22 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; g.add(blob);
  g.userData = { body, torso, legL, legR, armL, armR, head, cup, fc, tex, key: "" };
  return g;
}
export function setFace(p, expr, blink) {
  const key = expr + (blink ? "!" : "");
  if (p.userData.key === key) return;
  drawFace(p.userData.fc.getContext("2d"), expr, blink);
  p.userData.tex.needsUpdate = true; p.userData.key = key;
}

/* ---------- deterministic blink: a short close every ~3 s, occasionally a double ---------- */
export function blinking(t, seed = 0) {
  const period = 3.1 + (seed % 7) * 0.13, ph = (t + seed * 0.37) % period;
  if (ph < 0.11) return true;
  if (Math.floor((t + seed * 0.37) / period) % 4 === 3 && ph > 0.24 && ph < 0.35) return true; /* every 4th blink is a double */
  return false;
}

/* ---------- pose: one function turns a state into limb angles ---------- */
export function pose(p, s) {
  /* s: { t, seed, state: "idle"|"walk", speed, look, startle, cup, expr } */
  const u = p.userData, t = s.t, seed = s.seed || 0;
  const breathe = Math.sin(t * 2.1 + seed) * 0.012;
  u.torso.scale.y = 1 + breathe;
  const walking = s.state === "walk";
  const ph = t * (s.speed || 7.2) + seed;
  const st = s.startle || 0;                                            /* 0..1, snaps on, eases off */
  u.body.position.y = walking ? Math.abs(Math.sin(ph)) * 0.07 : 0;
  u.body.scale.set(1 + 0.07 * st, 1 - 0.09 * st, 1 + 0.07 * st);       /* squash on the startle */
  u.head.position.y = 1.78 + breathe * 0.9;
  u.head.rotation.y = (s.look || 0) + (walking ? 0 : Math.sin(t * 0.7 + seed) * 0.06);
  u.head.rotation.x = walking ? 0.04 : Math.sin(t * 0.9 + seed) * 0.02;
  u.legL.rotation.x = walking ? Math.sin(ph) * 0.75 : 0;
  u.legR.rotation.x = walking ? -Math.sin(ph) * 0.75 : 0;
  u.armL.rotation.x = walking ? -Math.sin(ph) * 0.65 : Math.sin(t * 1.3 + seed) * 0.04;
  u.armR.rotation.x = walking ? Math.sin(ph) * 0.65 : Math.sin(t * 1.3 + seed + 1) * 0.04;
  u.armL.rotation.z = 0.1 - st * 1.15;
  u.armR.rotation.z = -0.1 + st * 1.15;
  if (s.cup) { u.armR.rotation.x = -1.15 + Math.sin(t * 1.1 + seed) * 0.03; u.armR.rotation.z = -0.12; }
  u.cup.visible = !!s.cup;
  setFace(p, s.expr || "neutral", blinking(t, seed));
}
