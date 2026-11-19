/* actor.js — real characters: a smooth skinned body with professional animation, dressed and given an
   expressive face by us. Written 2026-11-15 after the user's note: "too blocky ... standing, sitting and
   running need proper animations, the expressions more expressive".

   BODY: the mannequin and 43 animations from Quaternius' Universal Animation Library (CC0, the free
   Standard tier; registry section 11c). The mannequin is dressed in code: every vertex is coloured by the
   bone that moves it most (hoodie, jeans, shoes, skin) and the clothes are given thickness by pushing those
   vertices out along their normals. No texture or model of ours is needed.
   FACE: ours. 3D eyes that look, upper lids that blink and half-close, brows that lift and tilt, a mouth
   drawn to a texture. Expressions are numbers that blend, so a face never snaps (ANIMATION_GUIDE: faces act).
   Everything is a pure function of time: the clips are SAMPLED at a time, never played. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;

export async function loadRig(url) {
  return new GLTFLoader().loadAsync(url);
}

/* which part of the outfit a bone belongs to */
function region(bone) {
  if (/^(Head|neck_01)$/.test(bone)) return "skin";
  if (/^(hand|index|middle|pinky|ring|thumb)/.test(bone)) return "skin";
  if (/^(spine|clavicle|upperarm|lowerarm)/.test(bone)) return "top";
  if (/^pelvis$/.test(bone)) return "hip";
  if (/^(thigh|calf)/.test(bone)) return "bottom";
  if (/^(foot|ball)/.test(bone)) return "shoe";
  return "top";
}

/* ------------------------------------------------------------------ the face */
/* v2, 2026-11-17 (the user: "refine the face, the expressions, the eyebrows even better").
   Each brow is [lift, tilt, arch, kink]: lift = whole brow up/down; tilt > 0 = inner end up (worry), < 0 = inner end down (anger,
   resolve); arch = how much the middle rises (a curved brow); kink = extra lift of the inner third (the sad / pleading brow).
   cheek = the lower lids rise (a smile, a squint, wet eyes).  lid: 1 open .. 0 shut.  mouth: a drawn shape, cross-faded on a blend. */
export const EXPRESSIONS = {
  neutral:   { lidL: 0.95, lidR: 0.95, browL: [0, 0, 0.004, 0],          browR: [0, 0, 0.004, 0],          pupil: 1.0,  cheek: 0,    mouth: "line" },
  deadpan:   { lidL: 0.6,  lidR: 0.6,  browL: [-0.008, -0.05, 0.002, 0], browR: [-0.008, -0.05, 0.002, 0], pupil: 1.0,  cheek: 0.08, mouth: "flat" },
  skeptical: { lidL: 0.8,  lidR: 0.92, browL: [-0.006, -0.1, 0, 0],      browR: [0.016, 0.14, 0.008, 0],    pupil: 1.0,  cheek: 0.12, mouth: "smirk" },   /* softened: at lid 0.62 and a 0.26 brow tilt it read as an injured eye (the user, 2026-11-17) */
  shock:     { lidL: 1.0,  lidR: 1.0,  browL: [0.028, 0.1, 0.012, 0],    browR: [0.028, 0.1, 0.012, 0],    pupil: 0.68, cheek: 0,    mouth: "o" },
  scared:    { lidL: 1.0,  lidR: 1.0,  browL: [0.018, 0.62, 0.004, 0.01], browR: [0.018, 0.62, 0.004, 0.01], pupil: 0.72, cheek: 0.16, mouth: "wobble" },
  happy:     { lidL: 0.72, lidR: 0.72, browL: [0.018, -0.03, 0.01, 0],   browR: [0.018, -0.03, 0.01, 0],   pupil: 1.0,  cheek: 0.6,  mouth: "smile" },
  worried:   { lidL: 0.9,  lidR: 0.9,  browL: [0.014, 0.5, 0.002, 0.012], browR: [0.014, 0.5, 0.002, 0.012], pupil: 0.9,  cheek: 0.1,  mouth: "frown" },
  sad:       { lidL: 0.7,  lidR: 0.7,  browL: [0.004, 0.7, 0, 0.018],    browR: [0.004, 0.7, 0, 0.018],    pupil: 1.06, cheek: 0.32, mouth: "sad" },
  resolve:   { lidL: 0.8,  lidR: 0.8,  browL: [-0.014, -0.2, 0, -0.004], browR: [-0.014, -0.2, 0, -0.004], pupil: 0.95, cheek: 0.14, mouth: "resolve" },
};

/* mouth shapes, drawn to a canvas; two kinds are cross-faded while an expression blends. st = { ink, lip, fem } */
function mouthShape(ctx, kind, st, alpha) {
  const W = ctx.canvas.width, H = ctx.canvas.height, fem = st.fem;
  ctx.globalAlpha = alpha; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.fillStyle = "#4a1f1c";
  /* a closed mouth: a stroked curve; hers gets a lip band under the dark line */
  const stroke = (x0, y0, cx, cy, x1, y1, wd) => {
    const path = () => { ctx.beginPath(); ctx.moveTo(W * x0, H * y0); ctx.quadraticCurveTo(W * cx, H * cy, W * x1, H * y1); };
    if (fem) { ctx.strokeStyle = st.lip; ctx.lineWidth = wd * 2.3; path(); ctx.stroke(); }
    ctx.strokeStyle = st.ink; ctx.lineWidth = fem ? wd * 0.5 : wd; path(); ctx.stroke();
  };
  /* an open mouth: filled dark, teeth clipped inside it, her lip colour round the edge */
  const open = (pathFn, teeth) => {
    ctx.beginPath(); pathFn(); ctx.fill();
    if (teeth) { ctx.save(); ctx.beginPath(); pathFn(); ctx.clip(); ctx.fillStyle = "#f4f1ea"; ctx.fillRect(0, H * teeth[0], W, H * (teeth[1] - teeth[0])); ctx.restore(); }
    ctx.strokeStyle = fem ? st.lip : st.ink; ctx.lineWidth = fem ? 15 : 8; ctx.beginPath(); pathFn(); ctx.closePath(); ctx.stroke();
  };
  if (kind === "line") stroke(0.3, 0.5, 0.5, 0.57, 0.7, 0.5, 15);
  else if (kind === "flat") stroke(0.32, 0.52, 0.5, 0.51, 0.68, 0.5, 15);
  else if (kind === "smirk") stroke(0.32, 0.55, 0.55, 0.56, 0.72, 0.4, 15);
  else if (kind === "smile") open(() => { ctx.moveTo(W * 0.26, H * 0.38); ctx.quadraticCurveTo(W * 0.5, H * 0.88, W * 0.74, H * 0.38); ctx.quadraticCurveTo(W * 0.5, H * 0.46, W * 0.26, H * 0.38); }, [0.38, 0.5]);
  else if (kind === "o") open(() => ctx.ellipse(W * 0.5, H * 0.53, W * 0.105, H * 0.25, 0, 0, Math.PI * 2), null);
  else if (kind === "wobble") open(() => { ctx.moveTo(W * 0.27, H * 0.52); ctx.quadraticCurveTo(W * 0.5, H * 0.3, W * 0.73, H * 0.52); ctx.quadraticCurveTo(W * 0.5, H * 0.84, W * 0.27, H * 0.52); }, [0.36, 0.5]);   /* a drawn-back, trembling grimace with the top teeth showing */
  else if (kind === "frown") stroke(0.32, 0.6, 0.5, 0.42, 0.68, 0.6, 15);
  else if (kind === "sad") { stroke(0.35, 0.63, 0.5, 0.4, 0.65, 0.63, 14); if (!fem) { ctx.strokeStyle = st.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(W * 0.44, H * 0.74); ctx.quadraticCurveTo(W * 0.5, H * 0.78, W * 0.56, H * 0.74); ctx.stroke(); } }   /* a downturned mouth and a pushed-up chin */
  else if (kind === "resolve") { stroke(0.32, 0.5, 0.5, 0.46, 0.68, 0.5, 19); ctx.strokeStyle = st.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(W * 0.32, H * 0.5); ctx.lineTo(W * 0.315, H * 0.57); ctx.moveTo(W * 0.68, H * 0.5); ctx.lineTo(W * 0.685, H * 0.57); ctx.stroke(); }   /* pressed firm, corners set */
  ctx.globalAlpha = 1;
}
function drawMouth(ctx, A, B, k, st) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!B || A === B || k <= 0.001) mouthShape(ctx, A, st, 1);
  else if (k >= 0.999) mouthShape(ctx, B, st, 1);
  else { mouthShape(ctx, A, st, 1 - k); mouthShape(ctx, B, st, k); }
}

/* a tube along a path, with an elliptical cross-section per point: brows and the ponytail */
function makeTube(nS, nR, mat) {
  const pos = new Float32Array(((nS + 1) * nR + 2) * 3), idx = [], cs = [], sn = [];
  for (let j = 0; j < nR; j++) { cs.push(Math.cos((j / nR) * Math.PI * 2)); sn.push(Math.sin((j / nR) * Math.PI * 2)); }
  for (let i = 0; i < nS; i++) for (let j = 0; j < nR; j++) { const a = i * nR + j, b = i * nR + ((j + 1) % nR), c = (i + 1) * nR + j, d = (i + 1) * nR + ((j + 1) % nR); idx.push(a, c, b, b, c, d); }
  const c0 = (nS + 1) * nR, c1 = c0 + 1;
  for (let j = 0; j < nR; j++) { const b = (j + 1) % nR; idx.push(c0, b, j, c1, nS * nR + j, nS * nR + b); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.castShadow = false;
  return {
    mesh,
    ring(i, P, e1, e2, r1, r2) {
      for (let j = 0; j < nR; j++) { const o = (i * nR + j) * 3; pos[o] = P.x + e1.x * r1 * cs[j] + e2.x * r2 * sn[j]; pos[o + 1] = P.y + e1.y * r1 * cs[j] + e2.y * r2 * sn[j]; pos[o + 2] = P.z + e1.z * r1 * cs[j] + e2.z * r2 * sn[j]; }
      if (i === 0) { pos[c0 * 3] = P.x; pos[c0 * 3 + 1] = P.y; pos[c0 * 3 + 2] = P.z; }
      if (i === nS) { pos[c1 * 3] = P.x; pos[c1 * 3 + 1] = P.y; pos[c1 * 3 + 2] = P.z; }
    },
    done() { geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); },
  };
}

/* deterministic pseudo-noise (a pure function of its argument: no Math.random) */
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/* the eyes never sit perfectly still: every ~0.9 s they flick a few degrees to a new nearby point (a saccade, 0.1 s), and drift between */
function saccade(t, seed) {
  const rate = 1.1, x = t * rate + seed * 0.37, k = Math.floor(x), f = x - k, u = smooth(f / 0.1);
  const at = (n) => [(hash(n + seed * 3.1) - 0.5) * 0.11, (hash(n * 1.7 + seed + 9.3) - 0.5) * 0.07];
  const a = at(k - 1), b = at(k);
  return [lerp(a[0], b[0], u) + Math.sin(t * 0.9 + seed) * 0.012, lerp(a[1], b[1], u) + Math.sin(t * 1.3 + seed * 2) * 0.008];
}

function makeHead(look, clock) {
  const FEM = look.build === "female";
  const style = look.hairStyle ?? "short";
  const H = new THREE.Group();
  const std = (hex, rough = 0.6) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
  const skin = std(look.skin, 0.8), hair = std(look.hair, 0.8);
  const hairDS = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.72, metalness: 0, side: THREE.DoubleSide });
  const browHex = new THREE.Color(look.brow ?? look.hair).lerp(new THREE.Color(look.skin), FEM ? 0.22 : 0.08).multiplyScalar(FEM ? 0.95 : 0.8);
  const browM = new THREE.MeshStandardMaterial({ color: browHex, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  const R = 0.15, SEED = (look.skin % 97) + 1;
  const YOUNG = !FEM && look.age != null && look.age < 23;   /* 2026-11-18: Part 2's younger brother, 19 */
  /* the skull, then the lower face reshaped: a narrower jaw and chin (hers more so) and a touch of cheek fullness */
  const skullGeo = new THREE.SphereGeometry(R, 48, 32);
  {
    const jaw = FEM ? 0.24 : YOUNG ? 0.15 : 0.08, chin = FEM ? 0.05 : YOUNG ? 0.015 : 0.03, cheek = FEM ? 0.04 : YOUNG ? 0.03 : 0.0, p = skullGeo.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const y = p.getY(v), t = clamp01((-y / (R * 1.06) - 0.05) / 0.9);
      const k = 1 - jaw * Math.pow(t, 1.3) + cheek * Math.sin(Math.PI * clamp01(t * 1.7));
      p.setX(v, p.getX(v) * k); p.setZ(v, p.getZ(v) * (1 - 0.05 * t * t)); p.setY(v, y * (1 + chin * t * t));
    }
    p.needsUpdate = true;
  }
  const skull = new THREE.Mesh(skullGeo, skin); skull.scale.set(1, 1.06, 0.98); H.add(skull);
  /* (no separate jaw sphere: where it crossed the skull it drew a jagged seam across the chin, round 2) */
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 14), std(new THREE.Color(look.skin).multiplyScalar(0.94), 0.5)); nose.position.set(0, -0.012, R * 0.97); nose.scale.set(FEM ? 0.82 : YOUNG ? 0.9 : 1, FEM ? 0.8 : YOUNG ? 0.84 : 0.9, FEM ? 0.75 : YOUNG ? 0.8 : 0.85); H.add(nose);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), skin); ear.position.set(s * R * 0.98 * (FEM ? 0.93 : 1), -0.006, 0); ear.scale.set(0.45, 1, 0.8); H.add(ear); }

  /* ---- hair ---- */
  const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 40, 24, 0, Math.PI * 2, 0, FEM ? 1.34 : 1.25), hair); cap.position.set(0, 0.012, -0.01); cap.rotation.x = -0.32; cap.scale.set(1.02, 1.08, 1.04); H.add(cap);
  if (!FEM) {
    for (const [x, y, z, s] of [[-0.06, 0.124, 0.083, 0.05], [0.0, 0.138, 0.088, 0.055], [0.065, 0.124, 0.078, 0.048]]) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), hair); t.position.set(x, y, z); t.scale.set(1.2, 0.7, 1); H.add(t);
    }
  } else {
    /* a side-swept fringe: two flattened lobes meeting above the left brow, and tendrils framing the face */
    for (const [x, y, z, rz, sx] of [[-0.058, 0.132, 0.082, 0.34, 1.5], [0.054, 0.134, 0.08, -0.26, 1.35], [0.0, 0.15, 0.078, 0.05, 1.2]]) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.046, 18, 12), hair); t.position.set(x, y, z); t.scale.set(sx, 0.62, 0.9); t.rotation.z = rz; H.add(t);
    }
    for (const s of [-1, 1]) { const td = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.1, 4, 10), hair); td.position.set(s * 0.126, -0.018, 0.058); td.rotation.set(0.12, 0, s * 0.1); H.add(td); }
  }
  let hairMove = null;
  /* v3 (2026-11-17): the hair lags the head. lagA = the head's frame at t-0.06, lagB at t-0.12, each as a matrix in the hair's own frame (set by
     perform(), a pure function of time: the pose is sampled again at the two earlier times, nothing is stored between frames). A point of hair with
     weight w follows the head's recent past instead of the head: roots stay (w 0), tips trail (w near 1). */
  const lagA = new THREE.Matrix4(), lagB = new THREE.Matrix4(), _lp = new THREE.Vector3(), _la = new THREE.Vector3(), _lb = new THREE.Vector3();
  const lagPoint = (o, w) => { if (w <= 0) return; _la.copy(o).applyMatrix4(lagA); _lb.copy(o).applyMatrix4(lagB); o.x += w * 0.4 * (_la.x - o.x + _lb.x - o.x); o.y += w * 0.4 * (_la.y - o.y + _lb.y - o.y); o.z += w * 0.4 * (_la.z - o.z + _lb.z - o.z); };
  if (FEM && (style === "long")) {
    /* a mass of hair over the back and sides: a closed rounded solid (a thick curtain whose side edges and tips round off to nothing), colour-streaked,
       with a scalloped hem of separate locks, swaying with time and trailing the head */
    const U = 30, V = 22, NQ = 2 * U, pos = new Float32Array(NQ * (V + 1) * 3), col = new Float32Array(NQ * (V + 1) * 3), idx = [];
    const base = new THREE.Color(look.hair);
    const sOf = (q) => (q <= U ? q / U * 2 - 1 : 1 - (q - U) / U * 2);   /* around the section: out along the outer face, back along the inner */
    for (let vi = 0; vi <= V; vi++) for (let q = 0; q < NQ; q++) {
      const v = vi / V, s = sOf(q), o = (vi * NQ + q) * 3, outer = q <= U ? 1 : 0.55;
      const streak = 0.84 + 0.2 * Math.sin(s * 17 + v * 2.2) * 0.5 + 0.12 * hash(Math.round((s + 1) * 12) * 3.7) + 0.16 * Math.exp(-Math.pow((v - 0.3) / 0.12, 2)) - 0.1 * (1 - v) * (1 - v);
      const k = streak * (outer === 1 ? 1 : 0.8);
      col[o] = base.r * k; col[o + 1] = base.g * k; col[o + 2] = base.b * k;
    }
    for (let vi = 0; vi < V; vi++) for (let q = 0; q < NQ; q++) { const a = vi * NQ + q, b = vi * NQ + ((q + 1) % NQ), c = a + NQ, d = b + NQ; idx.push(a, c, b, b, c, d); }
    /* close the top ring with a fan (it is tucked inside the cap) and the bottom */
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
    const shell = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, side: THREE.DoubleSide })); shell.frustumCulled = false; H.add(shell);
    hairMove = (T) => {
      for (let vi = 0; vi <= V; vi++) {
        const v = vi / V, w = v * v;
        const tuck = 0.84 + 0.16 * smooth(v / 0.22);   /* the top edge sits inside the cap, so no rim shows */
        const rx = (0.172 - 0.012 * v) * tuck, rz = (0.17 - 0.045 * v) * tuck, zc = -0.012 - 0.06 * v, phm = 2.3 - 0.35 * v, y0 = 0.095 - 0.43 * v;   /* long: it drapes over the shoulders at the sides and down the back */
        const sx = w * 0.018 * (0.7 * Math.sin(1.9 * T + v * 1.3) + 0.3 * Math.sin(3.7 * T + v * 2.1)), sz = w * 0.012 * (0.7 * Math.sin(1.5 * T + 1.0 + v * 1.6) + 0.3 * Math.sin(3.1 * T + v));
        for (let q = 0; q < NQ; q++) {
          const s = sOf(q), ph = s * phm, o = (vi * NQ + q) * 3;
          /* thickness: full across the middle, rounding to nothing at the side edges (s = +-1) and toward the tips (v = 1); locks of different length make a scalloped hem */
          const lock = 0.5 + 0.5 * Math.cos((s + 1) * 6.28 * 1.5), len = 1 - 0.07 * lock;
          const ve = Math.min(1, v / len), rnd = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), 5)), 0.5) * Math.sqrt(Math.max(0, 1 - Math.pow(ve, 4))) * smooth(v / 0.12 + 0.35);
          const th = q <= U ? 0.05 * rnd * (0.9 + 0.1 * Math.sin(s * 9 + 1)) : 0;
          const nxv = Math.sin(ph) / rx, nzv = -Math.cos(ph) / rz, nl = Math.hypot(nxv, nzv) || 1;
          const yy = 0.095 - 0.43 * ve * len + 0.004 * Math.sin(ph * 3 + T * 0.8) * w;
          _lp.set(rx * Math.sin(ph) + sx + (nxv / nl) * th, yy + 0.0 * y0, zc - rz * Math.cos(ph) + sz + (nzv / nl) * th);
          lagPoint(_lp, 0.95 * Math.pow(v, 1.15));
          pos[o] = _lp.x; pos[o + 1] = _lp.y; pos[o + 2] = _lp.z;
        }
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals();
    };
  } else if (FEM && style === "ponytail") {
    const tail = makeTube(14, 10, new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.7, metalness: 0, side: THREE.DoubleSide })); H.add(tail.mesh);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 20), std(look.tie ?? 0xe0607e, 0.6)); tie.position.set(0, 0.09, -0.152); tie.rotation.x = 1.15; H.add(tie);
    const P = new THREE.Vector3(), Pn = new THREE.Vector3(), T3 = new THREE.Vector3(), e1 = new THREE.Vector3(1, 0, 0), e2 = new THREE.Vector3(), pt = (v, T, out) => {
      const w = v * v;
      return out.set(0.022 * w * Math.sin(1.7 * T + v * 1.4) + 0.012 * v * Math.sin(3.3 * T), 0.092 - 0.3 * v, -0.152 - 0.075 * Math.sin(Math.PI * Math.min(1, v * 0.9)) - 0.018 * v + 0.014 * w * Math.sin(1.3 * T + 0.8));
    };
    hairMove = (T) => {
      for (let i = 0; i <= 14; i++) {
        const v = i / 14; pt(v, T, P); pt(Math.min(1, v + 0.04), T, Pn); pt(Math.max(0, v - 0.04), T, T3); T3.subVectors(Pn, T3).normalize(); e2.crossVectors(T3, e1).normalize();
        const r = 0.034 * (1 - 0.72 * Math.pow(v, 1.4)) + 0.006 + 0.007 * Math.sin(Math.PI * v);
        lagPoint(P, 0.95 * Math.pow(v, 1.1));
        tail.ring(i, P, e1, e2, r, r * 0.85);
      }
      tail.done();
    };
  } else if (FEM && style === "bun") {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.058, 24, 16), hair); bun.position.set(0, 0.158, -0.088); bun.scale.set(1, 0.86, 1); H.add(bun);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.0085, 8, 24), std(look.tie ?? 0xe0607e, 0.6)); tie.position.set(0, 0.125, -0.092); tie.rotation.x = 1.25; H.add(tie);
  }

  /* ---- eyes ---- */
  const white = new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.3 });
  const irisM = new THREE.MeshBasicMaterial({ color: look.eye ?? 0x5a3a22 }), inkM = new THREE.MeshBasicMaterial({ color: 0x0e0a08 }), shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lashM = new THREE.MeshBasicMaterial({ color: FEM ? 0x120a08 : new THREE.Color(look.skin).multiplyScalar(0.42) });
  const ER = 0.033, ES = FEM ? 1.08 : YOUNG ? 1.05 : 1;
  const eyes = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.05, 0.02, R * 0.76); g.scale.setScalar(ES); H.add(g);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(ER, 28, 20), white); g.add(ball);
    const pupil = new THREE.Group(); g.add(pupil);                       /* rotates about the eye centre, so the discs stay on the surface */
    /* iris, pupil and highlight are CAPS on the eyeball, not flat discs: a flat 17.5 mm disc's rim stood 5.4 mm proud of the ball and
       cut through the half-closed lid (the user, night v4: "his eye animation is broken" while he reads the phone) */
    const capG = (r, d) => new THREE.SphereGeometry(ER + d, 32, 6, 0, Math.PI * 2, 0, Math.asin(r / (ER + d))).rotateX(Math.PI / 2);
    const iris = new THREE.Mesh(capG(FEM ? 0.0185 : 0.0175, 0.0012), irisM); pupil.add(iris);
    const p = new THREE.Mesh(capG(0.0105, 0.0019), inkM); pupil.add(p);
    const sh = new THREE.Mesh(capG(0.0045, 0.0025), shine); sh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.006, 0.007, ER).normalize()); pupil.add(sh);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(ER + 0.0045, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin); g.add(lid);   /* clears every cap */
    /* the lid's free edge: a dark line (his), long lashes with an outer flick (hers); they ride the lid, on the ring at the same radius */
    const arc = FEM ? 2.5 : 2.2, tube = FEM ? 0.0022 : 0.0011;
    const edge = new THREE.Mesh(new THREE.TorusGeometry(ER + 0.0048, tube, 6, 24, arc).rotateX(Math.PI / 2).rotateY(arc / 2 - Math.PI / 2), lashM); lid.add(edge);
    if (FEM) {
      /* v3: five thick, curved, tapered lash strokes along the lid edge, fanning out and curling up at the outer corner (a = 0 is the middle of the lid;
         larger = toward the outer corner). Each is a small tube along a curve, its rings shrunk toward the tip. */
      const up = new THREE.Vector3(0, 1, 0);
      for (const [a, len] of [[1.18, 0.0155], [0.84, 0.0165], [0.5, 0.0155], [0.18, 0.0135], [-0.14, 0.011]]) {
        const dx = Math.sin(a * s), dz = Math.cos(a), dir = new THREE.Vector3(dx * 1.1, 0.0, dz).normalize(), b0 = dir.clone().multiplyScalar(ER + 0.0048);
        const side = new THREE.Vector3(dz, 0, -dx * s).normalize().multiplyScalar(s * 0.2 * Math.max(0, a));
        const p1 = b0.clone().addScaledVector(dir, len * 0.5).addScaledVector(up, len * 0.1), p2 = b0.clone().addScaledVector(dir, len * 0.95).addScaledVector(up, len * 0.5).addScaledVector(side, len * 0.4);
        const curve = new THREE.QuadraticBezierCurve3(b0, p1, p2), segs = 6, rs = 6, geo = new THREE.TubeGeometry(curve, segs, 0.0026, rs, false), pa = geo.attributes.position;
        for (let i = 0; i <= segs; i++) { const c = curve.getPointAt(i / segs), tp = 1 - 0.8 * Math.pow(i / segs, 1.2); for (let j = 0; j <= rs; j++) { const vi = i * (rs + 1) + j; pa.setXYZ(vi, c.x + (pa.getX(vi) - c.x) * tp, c.y + (pa.getY(vi) - c.y) * tp, c.z + (pa.getZ(vi) - c.z) * tp); } }
        geo.computeVertexNormals(); lid.add(new THREE.Mesh(geo, lashM));
      }
    }
    const low = new THREE.Mesh(new THREE.SphereGeometry(ER + 0.0045, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin); low.scale.y = -1; g.add(low);   /* the lower lid: it rises for a smile, a squint, wet eyes */
    const brow = makeTube(8, 8, browM); H.add(brow.mesh);
    return { g, pupil, p, iris, lid, low, brow, s };
  });
  /* ---- the brows: a curved, tapered tube following the skull, rebuilt from [lift, tilt, arch, kink] ---- */
  const BX = 0.052, BY = FEM ? 0.077 : 0.072, BL = FEM ? 0.054 : 0.066, TH0 = FEM ? 0.0078 : 0.0098, TAP = FEM ? 0.68 : 0.5;
  const _P = Array.from({ length: 9 }, () => new THREE.Vector3()), _n = new THREE.Vector3(), _t = new THREE.Vector3(), _e1 = new THREE.Vector3();
  function browUpdate(E, b) {
    const tilt = b[1], c = Math.cos(tilt), sn = Math.sin(tilt);
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, a = (u - 0.5) * BL, yb = b[2] * (1 - (2 * u - 1) * (2 * u - 1)) + b[3] * smooth((0.4 - u) / 0.4);
      const X = E.s * (BX + a * c + yb * sn), Y = BY + b[0] - a * sn + yb * c;
      const q = Math.max(0.0001, 1 - (X / R) * (X / R) - (Y / (1.06 * R)) * (Y / (1.06 * R)));
      _P[i].set(X, Y, 0.98 * R * Math.sqrt(q) + 0.0035);
    }
    for (let i = 0; i <= 8; i++) {
      const P = _P[i], u = i / 8;
      _n.set(P.x / (R * R), P.y / (1.06 * 1.06 * R * R), (P.z - 0.0035) / (0.98 * 0.98 * R * R)).normalize();
      _t.subVectors(_P[Math.min(8, i + 1)], _P[Math.max(0, i - 1)]).normalize();
      _e1.crossVectors(_n, _t); if (_e1.lengthSq() < 1e-8) _e1.set(0, 1, 0); _e1.normalize();
      const th = Math.max(0.0018, TH0 * (1 - TAP * Math.pow(u, 1.15)) * (0.78 + 0.22 * Math.sin(Math.PI * u)));
      E.brow.ring(i, P, _e1, _n, th, th * 0.62);
    }
    E.brow.done();
  }
  /* blush, hers: a soft flat disc on each cheek, brighter with the cheek lift */
  const blush = FEM ? [-1, 1].map((s) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 10), new THREE.MeshBasicMaterial({ color: 0xe0707a, transparent: true, opacity: 0.2, depthWrite: false })); m.scale.set(1.1, 0.8, 0.14);
    const x = s * 0.074, y = -0.034, z = 0.98 * R * Math.sqrt(Math.max(0.01, 1 - (x / R) * (x / R) - (y / (1.06 * R)) * (y / (1.06 * R)))) + 0.001;
    m.position.set(x, y, z); m.lookAt(x * 3, y, z * 3); H.add(m); return m;
  }) : [];
  /* ---- the mouth: drawn to a texture on a patch that follows the face's curve ---- */
  const mc = document.createElement("canvas"); mc.width = 256; mc.height = 160;
  const mtex = new THREE.CanvasTexture(mc); mtex.colorSpace = THREE.SRGBColorSpace;
  const mouthGeo = new THREE.SphereGeometry(R * 0.985, 24, 12, Math.PI * 0.5 - 0.42, 0.84, Math.PI * 0.5 + 0.18, 0.42);
  const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshStandardMaterial({ map: mtex, transparent: true, roughness: 0.6, depthWrite: false }));
  mouth.position.set(0, 0.0, 0.006); if (FEM) mouth.scale.set(0.92, 1, 1); H.add(mouth);     /* phi = pi/2 already faces +z: pass 1 rotated it to the side of the head */
  const mst = { ink: FEM ? "#5a2328" : "#3a1d1a", lip: look.lip ? "#" + new THREE.Color(look.lip).getHexString() : "#b8505f", fem: FEM };
  let mouthKey = "";
  const setMouth = (A, B, k) => { const key = A + "|" + B + "|" + Math.round(k * 16); if (key === mouthKey) return; mouthKey = key; drawMouth(mc.getContext("2d"), A, B, k, mst); mtex.needsUpdate = true; };

  function set(e, blink, gaze, T) {
    T = T ?? clock.t;
    const sc = saccade(T, SEED), gx0 = gaze?.[0] ?? 0, gy0 = gaze?.[1] ?? 0, calm = 1 - 0.5 * Math.min(1, Math.hypot(gx0, gy0));
    const gx = gx0 + sc[0] * calm, gy = gy0 + sc[1] * calm;
    eyes.forEach((E) => {
      const open = blink ? 0 : (E.s < 0 ? e.lidL : e.lidR);
      /* the upper lid follows the eye: it lifts as he looks up and drops as he looks down, a little more than the eye itself */
      const follow = blink ? 0 : -0.3 * gy * (0.4 + 0.6 * open);
      E.lid.rotation.x = 1.45 - open * 2.45 + follow;                       /* 1 open (lid rolled back) .. 0 shut (lid over the front) */
      E.low.rotation.x = 1.05 - (blink ? 0.45 : (e.cheek ?? 0) * 0.5) + Math.max(0, -gy) * 0.1;   /* the lower lid rises with the cheek */
      E.pupil.rotation.set(-gy * 0.45, gx * 0.55, 0);
      E.p.scale.set(e.pupil, e.pupil, 1); const ks = 0.85 + 0.15 * e.pupil; E.iris.scale.set(ks, ks, 1);   /* scaled across the ball only, so a cap never sinks into it */
      browUpdate(E, E.s < 0 ? e.browL : e.browR);
    });
    blush.forEach((m) => (m.material.opacity = 0.16 + 0.22 * (e.cheek ?? 0)));
    setMouth(e.mouth, e.mouthB ?? e.mouth, e.mouthK ?? 0);
    if (hairMove) hairMove(T);
  }
  return { group: H, set, skull, lagA, lagB, lagged: !!hairMove };
}

/* blend two expressions; the mouth shapes cross-fade */
export function mixExpr(a, b, u) {
  const A = EXPRESSIONS[a] || EXPRESSIONS.neutral, B = EXPRESSIONS[b] || EXPRESSIONS.neutral, k = smooth(u);
  const brow = (x, y) => [0, 1, 2, 3].map((i) => lerp(x[i] ?? 0, y[i] ?? 0, k));
  return {
    lidL: lerp(A.lidL, B.lidL, k), lidR: lerp(A.lidR, B.lidR, k), pupil: lerp(A.pupil, B.pupil, k), cheek: lerp(A.cheek ?? 0, B.cheek ?? 0, k),
    browL: brow(A.browL, B.browL), browR: brow(A.browR, B.browR),
    mouth: A.mouth, mouthB: B.mouth, mouthK: k,
  };
}

/* ------------------------------------------------------------------ an actor */
export function makeActor(gltf, look) {
  /* look: { skin, hair, top, bottom, shoe, build: "male" (default) | "female", hairStyle: "short" (default) | "long" | "ponytail" | "bun",
             lip, eye, brow, tie, hood,
             height, age, shoulderIn, scarf }.  The second character is the same rig with build "female".
     2026-11-18 (Part 2's younger brother, the cast spec in the part's script JSON; check_cast.mjs measures it):
       height     standing height relative to the default male rig (the lead = 1). Legs, torso and arms scale; the head keeps its size
                  (a uniformly scaled adult shrinks the head and reads as a child). Solved by measuring the rest pose, not by formula.
       age        a number; under 23 gives a younger face: a softer jaw, fuller cheeks, slightly larger eyes, a smaller nose. The male
                  rig has no stubble at any age (none is modelled), so "no stubble" holds by default.
       shoulderIn how far each shoulder moves in, m (male 0.014, female 0.034): a slighter frame. */
  const FEM = look.build === "female";
  const model = SkeletonUtils.clone(gltf.scene);
  const root = new THREE.Group(); root.add(model);
  if (FEM) root.scale.setScalar(0.95);   /* a little shorter */
  const clock = { t: 0 };                /* the time of the last perform(): the face's saccades and her hair sway are pure functions of it */
  const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const C = { top: new THREE.Color(look.top), bottom: new THREE.Color(look.bottom), shoe: new THREE.Color(look.shoe ?? 0xf2f0ea), skin: new THREE.Color(look.skin) };
  const PUSH = { top: FEM ? 0.015 : 0.018, bottom: FEM ? 0.013 : 0.016, shoe: 0.016, skin: 0 };   /* one thickness for cloth, so the joints do not split */
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, metalness: 0, side: THREE.DoubleSide });   /* both sides: no see-through at cuffs, collar, joints */
  const skinned = [];
  model.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
  /* weld every vertex of every primitive by position, so smoothing treats the body as one surface */
  const key = (x, y, z) => Math.round(x * 2000) + "," + Math.round(y * 2000) + "," + Math.round(z * 2000);
  const canon = new Map(), P = [], REG = [], refs = [];
  skinned.forEach((o, mi) => {
    const g = o.geometry = o.geometry.clone();
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, pos = g.attributes.position;
    refs[mi] = new Int32Array(pos.count);
    for (let v = 0; v < pos.count; v++) {
      let best = 0, bi = 0;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > best) { best = w; bi = si.getComponent(v, k); } }
      let r = region(o.skeleton.bones[bi].name); const y = pos.getY(v);
      if (r === "hip") r = y > 0.98 ? "top" : "bottom";
      if (r === "bottom" && y < 0.11) r = "shoe";
      const kk = key(pos.getX(v), y, pos.getZ(v));
      let c = canon.get(kk);
      if (c === undefined) { c = P.length / 3; canon.set(kk, c); P.push(pos.getX(v), y, pos.getZ(v)); REG.push(r); }
      else if (r === "skin") REG[c] = "skin";
      refs[mi][v] = c;
    }
  });
  /* slim him (critic round 1: "a bodybuilder"): pull torso and arm vertices toward their bone's line, in the bind pose */
  const SLIM = FEM
    ? { spine_01: 0.8, spine_02: 0.74, spine_03: 0.74, clavicle_l: 0.78, clavicle_r: 0.78, upperarm_l: 0.68, upperarm_r: 0.68, lowerarm_l: 0.56, lowerarm_r: 0.56, Head: 0.55, neck_01: 0.5 }
    : { spine_01: 0.88, spine_02: 0.8, spine_03: 0.76, clavicle_l: 0.78, clavicle_r: 0.78, upperarm_l: 0.7, upperarm_r: 0.7, lowerarm_l: 0.6, lowerarm_r: 0.6, Head: 0.55, neck_01: 0.6 };   /* Head: the mannequin's own face is tucked inside ours (round 2: its chin showed as a jagged line). v2 (2026-11-17): the shoulders and arms slimmer again, against the "muscle suit" */
  {
    const o = skinned[0], sk = o.skeleton, bm = o.bindMatrix, bmi = o.bindMatrixInverse;
    const bpos = sk.bones.map((b, i) => new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert()));
    const seg = {};
    sk.bones.forEach((b, i) => {
      if (!(b.name in SLIM)) return;
      const ch = b.children.find((c) => c.isBone && sk.bones.includes(c));
      seg[i] = [bpos[i], ch ? bpos[sk.bones.indexOf(ch)] : bpos[i].clone().add(new THREE.Vector3(0, 0.1, 0)), SLIM[b.name]];
    });
    const domBone = new Int32Array(P.length / 3).fill(-1), infl = new Array(P.length / 3);
    skinned.forEach((m, mi) => {
      const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
      for (let v = 0; v < refs[mi].length; v++) {
        let best = 0, bi = 0; const list = [];
        for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > 0) list.push([si.getComponent(v, k), w]); if (w > best) { best = w; bi = si.getComponent(v, k); } }
        domBone[refs[mi][v]] = bi; infl[refs[mi][v]] = list;
      }
    });
    const V = new THREE.Vector3(), Q = new THREE.Vector3(), AB = new THREE.Vector3(), V0 = new THREE.Vector3(), ACC = new THREE.Vector3();
    /* v2: the pull toward the bone line is blended over every bone that moves the vertex (by its skin weight), so the pull is continuous across a joint:
       the old per-vertex dominant bone left a step at the elbow where the forearm's vertices were pulled toward a different line than the upper arm's */
    for (let c = 0; c < domBone.length; c++) {
      if (!infl[c].some(([bi]) => seg[bi])) continue;
      V0.set(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]).applyMatrix4(bm); ACC.set(0, 0, 0); let tw = 0;
      for (const [bi, w] of infl[c]) {
        const sg = seg[bi]; tw += w;
        if (!sg) { ACC.addScaledVector(V0, w); continue; }
        AB.subVectors(sg[1], sg[0]); const u = Math.min(1, Math.max(0, V.copy(V0).sub(sg[0]).dot(AB) / AB.lengthSq()));
        Q.copy(sg[0]).addScaledVector(AB, u); V.copy(V0).sub(Q).multiplyScalar(sg[2]).add(Q); ACC.addScaledVector(V, w);
      }
      V.copy(ACC).multiplyScalar(1 / tw).applyMatrix4(bmi);
      P[c * 3] = V.x; P[c * 3 + 1] = V.y; P[c * 3 + 2] = V.z;
    }
    if (FEM) {   /* her shape: a narrower waist, wider hips (about the body's midline, in the bind pose) */
      for (let c = 0; c < domBone.length; c++) {
        const nm = sk.bones[domBone[c]]?.name; if (nm !== "pelvis" && nm !== "spine_01" && nm !== "spine_02") continue;
        V.set(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]).applyMatrix4(bm);
        if (nm === "pelvis") { V.x *= 1.16; V.z -= 0.0; } else if (nm === "spine_01") V.x *= 0.93; else V.x *= 0.97;
        V.applyMatrix4(bmi); P[c * 3] = V.x; P[c * 3 + 1] = V.y; P[c * 3 + 2] = V.z;
      }
    }
    const handIdx = { l: sk.bones.findIndex((b) => b.name === "hand_l"), r: sk.bones.findIndex((b) => b.name === "hand_r") };
    for (let c = 0; c < domBone.length; c++) {
      const m = /^(?:(?:index|middle|ring|pinky|thumb)_\d+(?:_leaf)?_|hand_)(l|r)$/.exec(sk.bones[domBone[c]]?.name || "");
      if (!m) continue;
      const H = bpos[handIdx[m[1]]].clone().applyMatrix4(new THREE.Matrix4());   /* the hand bone, in bind space */
      V.set(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]).applyMatrix4(bm).sub(H).multiplyScalar(0.03).add(H).applyMatrix4(bmi);   /* folded almost to a point: at 0.12 they left wire-like slivers (critic, night v3); at 0.0 the triangles had no area, their normals were NaN and bloom spread it over the whole frame (black frames at 1.0-1.4 s) */
      P[c * 3] = V.x; P[c * 3 + 1] = V.y; P[c * 3 + 2] = V.z;
    }
  }
  const nb = Array.from({ length: P.length / 3 }, () => new Set());
  const tri = (fn) => skinned.forEach((o, mi) => {
    const idx = o.geometry.index, R = refs[mi], n = idx ? idx.count : R.length;
    for (let i = 0; i < n; i += 3) fn(R[idx ? idx.getX(i) : i], R[idx ? idx.getX(i + 1) : i + 1], R[idx ? idx.getX(i + 2) : i + 2]);
  });
  tri((a, b, c) => { nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); });
  /* v3 (2026-11-17, "still blocky"): the shoulder and elbow zones, as weights 0..1 by distance to the joint in the bind pose. The skin weights
     there are diffused over the surface (so a bend is spread over a longer stretch: no ridge on the inside of the elbow, no pinch at the shoulder),
     and the cloth there gets many more smoothing passes (below). */
  const ZS = new Float64Array(nb.length), ZE = new Float64Array(nb.length);
  {
    const sk = skinned[0].skeleton, bm = skinned[0].bindMatrix, Vz = new THREE.Vector3();
    const bp = (nm) => { const i = sk.bones.findIndex((b) => b.name === nm); return new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert()); };
    const shj = ["l", "r"].map((x) => bp("upperarm_" + x)), elj = ["l", "r"].map((x) => bp("lowerarm_" + x));
    const fall = (d, r0, r1) => 1 - smooth((d - r0) / (r1 - r0));
    for (let c = 0; c < nb.length; c++) {
      Vz.set(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]).applyMatrix4(bm);
      for (const j of shj) ZS[c] = Math.max(ZS[c], fall(Vz.distanceTo(j), 0.07, 0.21));
      for (const j of elj) ZE[c] = Math.max(ZE[c], fall(Vz.distanceTo(j), 0.05, 0.15));
    }
    const wm = new Array(nb.length);
    skinned.forEach((m, mi) => { const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight; for (let v = 0; v < refs[mi].length; v++) { const c = refs[mi][v]; if (wm[c]) continue; const mp = new Map(); for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > 0) mp.set(si.getComponent(v, k), w); } wm[c] = mp; } });
    const zz = (c) => Math.max(0.5 * ZS[c], ZE[c]);
    let cur = wm;
    for (let it = 0; it < 10; it++) {
      const nx = cur.slice();
      for (let c = 0; c < nb.length; c++) {
        const z = zz(c); if (z < 0.02 || !nb[c].size) continue;
        const a = 0.6 * z, mp = new Map();
        for (const [b, w] of cur[c]) mp.set(b, w * (1 - a));
        for (const u of nb[c]) for (const [b, w] of cur[u]) mp.set(b, (mp.get(b) ?? 0) + (a * w) / nb[c].size);
        nx[c] = mp;
      }
      cur = nx;
    }
    skinned.forEach((m, mi) => {
      const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
      for (let v = 0; v < refs[mi].length; v++) {
        const c = refs[mi][v]; if (zz(c) < 0.02) continue;
        const top = [...cur[c]].sort((x, y) => y[1] - x[1]).slice(0, 4), tw = top.reduce((q, e) => q + e[1], 0) || 1;
        for (let k = 0; k < 4; k++) { si.setComponent(v, k, top[k] ? top[k][0] : 0); sw.setComponent(v, k, top[k] ? top[k][1] / tw : 0); }
      }
      si.needsUpdate = sw.needsUpdate = true;
    });
  }
  {   /* the hem: a smoothed "topness" field, thresholded, so the boundary between hoodie and jeans is a clean line */
    let tp = Float64Array.from(REG.map((r) => (r === "top" ? 1 : r === "bottom" ? 0 : -1)));
    for (let it = 0; it < 5; it++) {
      const t2 = tp.slice();
      for (let v = 0; v < nb.length; v++) { if (tp[v] < 0) continue; let s = tp[v], k = 1; for (const u of nb[v]) if (tp[u] >= 0) { s += tp[u]; k++; } t2[v] = s / k; }
      tp = t2;
    }
    for (let v = 0; v < nb.length; v++) if (tp[v] >= 0) REG[v] = tp[v] >= 0.5 ? "top" : "bottom";
  }
  /* Taubin smoothing on cloth only: removes the mannequin's muscles without shrinking him */
  const cloth = REG.map((r) => r === "top" || r === "bottom");
  let Pf = Float64Array.from(P);
  for (let it = 0; it < 64; it++) for (const f of [0.5, -0.53]) {   /* 64 passes (24, then 40): the elbow step and the chest ridges go; v2 for the shoulder-to-arm blend */
    const Q = Pf.slice();
    for (let v = 0; v < nb.length; v++) {
      if (!cloth[v] || nb[v].size === 0) continue;
      let sx = 0, sy = 0, sz = 0; for (const u of nb[v]) { sx += Pf[u * 3]; sy += Pf[u * 3 + 1]; sz += Pf[u * 3 + 2]; }
      const k = nb[v].size;
      Q[v * 3] = Pf[v * 3] + f * (sx / k - Pf[v * 3]); Q[v * 3 + 1] = Pf[v * 3 + 1] + f * (sy / k - Pf[v * 3 + 1]); Q[v * 3 + 2] = Pf[v * 3 + 2] + f * (sz / k - Pf[v * 3 + 2]);
    }
    Pf = Q;
  }
  /* v2: the shoulder and upper arm get extra passes, so the deltoid bump (the "muscle suit") flows into the arm */
  {
    const sh = new Uint8Array(nb.length), sk0 = skinned[0].skeleton;
    skinned.forEach((m, mi) => { const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight; for (let v = 0; v < refs[mi].length; v++) { let best = 0, bi = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > best) { best = w; bi = si.getComponent(v, k); } } if (/^(clavicle|upperarm|lowerarm)/.test(sk0.bones[bi].name)) sh[refs[mi][v]] = 1; } });
    for (let it = 0; it < 40; it++) for (const f of [0.5, -0.53]) {
      const Q = Pf.slice();
      for (let v = 0; v < nb.length; v++) {
        if (!sh[v] || !cloth[v] || nb[v].size === 0) continue;
        let sx = 0, sy = 0, sz = 0; for (const u of nb[v]) { sx += Pf[u * 3]; sy += Pf[u * 3 + 1]; sz += Pf[u * 3 + 2]; }
        const k = nb[v].size; Q[v * 3] = Pf[v * 3] + f * (sx / k - Pf[v * 3]); Q[v * 3 + 1] = Pf[v * 3 + 1] + f * (sy / k - Pf[v * 3 + 1]); Q[v * 3 + 2] = Pf[v * 3 + 2] + f * (sz / k - Pf[v * 3 + 2]);
      }
      Pf = Q;
    }
  }
  /* v3: the deltoid: arm-side cloth near the shoulder is drawn toward the upper-arm line (the bump is where the mannequin's shoulder muscle is) */
  {
    const sk = skinned[0].skeleton, bm = skinned[0].bindMatrix, bmi = skinned[0].bindMatrixInverse, Vq = new THREE.Vector3(), Ab = new THREE.Vector3(), Qq = new THREE.Vector3();
    const bp = (nm) => { const i = sk.bones.findIndex((b) => b.name === nm); return new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert()); };
    const lines = ["l", "r"].map((x) => [bp("upperarm_" + x), bp("lowerarm_" + x)]);
    for (let c = 0; c < nb.length; c++) {
      if (ZS[c] < 0.05 || !cloth[c]) continue;
      Vq.set(Pf[c * 3], Pf[c * 3 + 1], Pf[c * 3 + 2]).applyMatrix4(bm);
      for (const [a0, a1] of lines) {
        Ab.subVectors(a1, a0); const u = Vq.clone().sub(a0).dot(Ab) / Ab.lengthSq(); if (u < 0.02) continue;
        Qq.copy(a0).addScaledVector(Ab, Math.min(1, u)); const d = Vq.distanceTo(Qq); if (d > 0.11) continue;
        const k = 0.75 * ZS[c] * (1 - smooth((d - 0.05) / 0.06)); Vq.lerp(Qq, k);
      }
      Vq.applyMatrix4(bmi); Pf[c * 3] = Vq.x; Pf[c * 3 + 1] = Vq.y; Pf[c * 3 + 2] = Vq.z;
    }
  }
  /* v3: the shoulder and elbow zones again, weighted by zone, then a small deflate on the shoulder (the deltoid bump) */
  for (let it = 0; it < 110; it++) for (const f of [0.5, -0.53]) {
    const Q = Pf.slice();
    for (let v = 0; v < nb.length; v++) {
      const z = Math.max(ZS[v], ZE[v]); if (z < 0.02 || !cloth[v] || nb[v].size === 0) continue;
      let sx = 0, sy = 0, sz = 0; for (const u of nb[v]) { sx += Pf[u * 3]; sy += Pf[u * 3 + 1]; sz += Pf[u * 3 + 2]; }
      const k = nb[v].size, ff = f * z; Q[v * 3] = Pf[v * 3] + ff * (sx / k - Pf[v * 3]); Q[v * 3 + 1] = Pf[v * 3 + 1] + ff * (sy / k - Pf[v * 3 + 1]); Q[v * 3 + 2] = Pf[v * 3 + 2] + ff * (sz / k - Pf[v * 3 + 2]);
    }
    Pf = Q;
  }
  for (let it = 0; it < 12; it++) {
    const Q = Pf.slice();
    for (let v = 0; v < nb.length; v++) {
      const z = ZS[v] * ZS[v]; if (z < 0.02 || !cloth[v] || nb[v].size === 0) continue;
      let sx = 0, sy = 0, sz = 0; for (const u of nb[v]) { sx += Pf[u * 3]; sy += Pf[u * 3 + 1]; sz += Pf[u * 3 + 2]; }
      const k = nb[v].size, ff = 0.35 * z; Q[v * 3] = Pf[v * 3] + ff * (sx / k - Pf[v * 3]); Q[v * 3 + 1] = Pf[v * 3 + 1] + ff * (sy / k - Pf[v * 3 + 1]); Q[v * 3 + 2] = Pf[v * 3 + 2] + ff * (sz / k - Pf[v * 3 + 2]);
    }
    Pf = Q;
  }
  /* the thickness field: start from each region's push, then relax it over the surface so cuffs and the collar taper, not step */
  let Dp = Float64Array.from(REG.map((r) => PUSH[r] ?? 0));
  for (let it = 0; it < 6; it++) {
    const D2 = Dp.slice();
    for (let v = 0; v < nb.length; v++) { if (!nb[v].size) continue; let s = Dp[v]; for (const u of nb[v]) s += Dp[u]; D2[v] = s / (nb[v].size + 1); }
    Dp = D2;
  }
  /* smooth normals on the welded surface, then give the cloth its thickness */
  const N = new Float64Array(Pf.length), A = new THREE.Vector3(), B = new THREE.Vector3(), Cv = new THREE.Vector3();
  tri((a, b, c) => {
    A.set(Pf[a * 3], Pf[a * 3 + 1], Pf[a * 3 + 2]); B.set(Pf[b * 3], Pf[b * 3 + 1], Pf[b * 3 + 2]); Cv.set(Pf[c * 3], Pf[c * 3 + 1], Pf[c * 3 + 2]);
    const fn = B.sub(A).cross(Cv.sub(A));
    for (const v of [a, b, c]) { N[v * 3] += fn.x; N[v * 3 + 1] += fn.y; N[v * 3 + 2] += fn.z; }
  });
  skinned.forEach((o, mi) => {
    const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal, R = refs[mi];
    const col = new Float32Array(pos.count * 3), n = new THREE.Vector3();
    for (let v = 0; v < pos.count; v++) {
      const c = R[v], r = REG[c], d = Dp[c];
      n.set(N[c * 3], N[c * 3 + 1], N[c * 3 + 2]).normalize();
      pos.setXYZ(v, Pf[c * 3] + n.x * d, Pf[c * 3 + 1] + n.y * d, Pf[c * 3 + 2] + n.z * d);
      nor.setXYZ(v, n.x, n.y, n.z);
      const cc = C[r]; col.set([cc.r, cc.g, cc.b], v * 3);
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    o.material = bodyMat; o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true;
  });

  /* place the head and props in the rest pose, then hand them to their bones (attach keeps the world transform) */
  model.updateMatrixWorld(true);
  const wp = (b) => bones[b].getWorldPosition(new THREE.Vector3());
  const head = makeHead(look, clock);
  if (FEM) head.group.scale.setScalar(0.95);
  const hb = wp("Head");
  head.group.position.set(hb.x, hb.y + 0.105, hb.z + 0.018);
  root.add(head.group); bones.Head.attach(head.group);
  /* the hood, gathered behind the neck, and two drawstrings */
  const top = new THREE.MeshStandardMaterial({ color: look.top, roughness: 0.85 });
  const n = wp("neck_01"), s3 = wp("spine_03");
  const skinM = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.8 });
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(FEM ? 0.043 : 0.052, FEM ? 0.05 : 0.06, Math.max(0.08, hb.y - n.y + 0.05), 24), skinM);
  nk.position.set((n.x + hb.x) / 2, (n.y + hb.y) / 2, (n.z + hb.z) / 2 + 0.005); root.add(nk); bones.neck_01.attach(nk);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(FEM ? 0.072 : 0.084, FEM ? 0.03 : 0.045, 18, 44), top);
  collar.position.set(n.x, n.y - (FEM ? 0.05 : 0.035), n.z + 0.005); collar.rotation.x = Math.PI / 2 - 0.12; root.add(collar); bones.spine_03.attach(collar);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), top); hood.scale.set(0.135, 0.075, 0.075);   /* the hood, folded down behind the neck */
  hood.position.set(n.x, n.y - 0.035, n.z - 0.075); hood.rotation.set(0.25, 0, 0 + 0 * Math.PI); root.add(hood); bones.spine_03.attach(hood); hood.visible = look.hood ?? !FEM;   /* her long hair falls where the hood would gather */
  /* look.scarf (2026-11-18): a knitted scarf round the neck, one end hanging down the chest, in the given colour */
  if (look.scarf != null) {
    const sm = new THREE.MeshStandardMaterial({ color: look.scarf, roughness: 0.95 });
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.034, 14, 36), sm); wrap.position.set(n.x, n.y - 0.005, n.z + 0.008); wrap.rotation.x = Math.PI / 2 - 0.1; root.add(wrap); bones.neck_01.attach(wrap);
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.24, 0.03), sm); end.position.set(n.x + 0.045, n.y - 0.14, n.z + 0.085); end.rotation.z = 0.08; root.add(end); bones.spine_03.attach(end);
  }
  const s1 = wp("spine_01");
  for (const s of ["l", "r"]) {
    const Hh = wp("hand_" + s), Mm = wp("middle_02_" + s), Tt = wp("thumb_02_" + s);
    const along = Mm.clone().sub(Hh).normalize(), side0 = Tt.clone().sub(Hh), side = side0.sub(along.clone().multiplyScalar(side0.dot(along))).normalize();
    const normal = new THREE.Vector3().crossVectors(side, along).normalize();
    const basis = new THREE.Matrix4().makeBasis(side, along, normal), q = new THREE.Quaternion().setFromRotationMatrix(basis);
    const mit = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), skinM); mit.scale.set(FEM ? 0.042 : 0.047, FEM ? 0.07 : 0.078, FEM ? 0.03 : 0.034);
    mit.quaternion.copy(q); mit.position.copy(Hh).addScaledVector(along, 0.06); root.add(mit); bones["hand_" + s].attach(mit);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, 0.03, 4, 10), skinM);
    th.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Tt.clone().sub(Hh).normalize()); th.position.copy(Hh).lerp(Tt, 0.75); root.add(th); bones["hand_" + s].attach(th);
  }
  /* a coffee cup that can live in the right hand */
  const cup = new THREE.Group();
  const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.034, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0xf3eee4, roughness: 0.5 }));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.018, 20), new THREE.MeshStandardMaterial({ color: 0x3b2a22, roughness: 0.6 })); lid.position.y = 0.068;
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.0425, 0.0385, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0xb7895a, roughness: 0.9 }));
  cup.add(cupBody, lid, sleeve);
  root.add(cup); cup.visible = false;
  /* a phone for the left hand: dark body, a lit screen facing the face */
  const phone = new THREE.Group();
  const pb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.165, 0.011), new THREE.MeshStandardMaterial({ color: 0xc3cad3, roughness: 0.25, metalness: 0.5 }));
  const ps = new THREE.Mesh(new THREE.PlaneGeometry(0.072, 0.152), new THREE.MeshBasicMaterial({ color: 0xdfe8f5 })); ps.position.z = 0.0058;
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 16), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.2 })); cam.rotation.x = Math.PI / 2; cam.position.set(-0.022, 0.06, -0.008);
  const screenGlow = new THREE.PointLight(0xc9dcff, 0.06, 0.4, 2); screenGlow.position.z = 0.05; phone.add(pb, ps, cam, screenGlow); root.add(phone); phone.visible = false;   /* the screen lights his face */

  /* the ghost's red outline: the same skinned body, inside out, pushed out along its normals */
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a, side: THREE.BackSide, toneMapped: false });
  outlineMat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += normalize(normal) * 0.02;"); };   /* pushed out in the rest pose, then skinned */
  const outlines = skinned.map((o) => { const m = new THREE.SkinnedMesh(o.geometry, outlineMat); m.bind(o.skeleton, o.bindMatrix); m.frustumCulled = false; m.visible = false; m.userData.noShadow = true; o.parent.add(m); return m; });
  const headOutline = new THREE.Mesh(new THREE.SphereGeometry(0.15 * 1.22, 24, 18), outlineMat); headOutline.visible = false; headOutline.userData.noShadow = true; head.group.add(headOutline);

  /* body shape through the skeleton: every clip carries a constant position track for each bone, so a bone moved in the rest pose is put
     back every frame. To narrow the shoulders and widen her hips, the shift is added into the clips' tracks (once, in our own copies). Model-space
     shifts become each bone's parent-frame offset, so the whole arm or leg moves as a unit in every pose. */
  const shifts = {};
  {
    const sk = skinned[0].skeleton, bindQ = (name) => { const i = sk.bones.findIndex((b) => b.name === name); return i < 0 ? null : new THREE.Quaternion().setFromRotationMatrix(sk.boneInverses[i].clone().invert()); };
    const sh = (name, d) => { const b = sk.bones.find((x) => x.name === name); const pq = b && b.parent && bindQ(b.parent.name); const q = pq ? pq.invert() : new THREE.Quaternion(); shifts[name] = d.clone().applyQuaternion(q); };
    const sho = look.shoulderIn ?? (FEM ? 0.034 : 0.014), hip = FEM ? 0.016 : 0;
    for (const side of ["l", "r"]) {
      const sg = bones["upperarm_" + side].getWorldPosition(new THREE.Vector3()).x > 0 ? 1 : -1;      /* which side of the midline this bone is on */
      sh("upperarm_" + side, new THREE.Vector3(-sg * sho, -0.004, 0));
      if (hip) sh("thigh_" + side, new THREE.Vector3(bones["thigh_" + side].getWorldPosition(new THREE.Vector3()).x > 0 ? hip : -hip, 0, 0));
    }
  }
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip0 of gltf.animations) {
    const clip = clip0.clone();
    for (const tr of clip.tracks) { const m = /^(.+)\.position$/.exec(tr.name), d = m && shifts[m[1]]; if (d) for (let i = 0; i < tr.values.length; i += 3) { tr.values[i] += d.x; tr.values[i + 1] += d.y; tr.values[i + 2] += d.z; } }
    actions[clip0.name] = mixer.clipAction(clip);
  }

  function sampleClip(seg, T, w) {
    if (!seg || w <= 0) return;
    const a = actions[seg.clip]; if (!a) throw new Error("no clip " + seg.clip);
    const d = a.getClip().duration;
    let lt = (T - seg.t) * (seg.rate ?? 1) + (seg.from ?? 0);
    lt = seg.loop === false ? Math.min(Math.max(lt, 0), d - 1e-4) : ((lt % d) + d) % d;
    a.enabled = true; a.paused = false; a.play(); a.time = lt; a.setEffectiveWeight(w);
  }

  /* two-bone reach for an arm: the hand goes to a world-space target, the elbow toward a pole, blended by w.
     Works whatever the bones' local axes are: every rotation is computed in world space, then made local. */
  const _q = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _wq = new THREE.Quaternion(), ID = new THREE.Quaternion();
  const turn = (bone, from, to, w) => {
    _q.setFromUnitVectors(from.normalize(), to.normalize());
    if (w < 1) _q.copy(_qw.slerpQuaternions(ID, _q, w));   /* NOT _q.slerpQuaternions(ID, _q, w): it copies ID into _q first, so every partial weight was no turn at all and each gesture snapped on in one frame (27-55 cm jumps; autoreview V6, 2026-11-16) */
    bone.parent.getWorldQuaternion(_pq); bone.getWorldQuaternion(_wq);
    bone.quaternion.copy(_pq.invert().multiply(_q.multiply(_wq))); bone.updateMatrixWorld(true);
  };
  function reach(side, target, pole, w) {
    if (w <= 0) return;
    const up = bones["upperarm_" + side], lo = bones["lowerarm_" + side], ha = bones["hand_" + side];
    root.updateMatrixWorld(true);
    const S = up.getWorldPosition(new THREE.Vector3()), E = lo.getWorldPosition(new THREE.Vector3()), Hh = ha.getWorldPosition(new THREE.Vector3());
    const a = S.distanceTo(E), b = E.distanceTo(Hh), T = target.clone();
    let d = S.distanceTo(T); if (d > (a + b) * 0.995) { T.sub(S).setLength((a + b) * 0.995).add(S); d = (a + b) * 0.995; }
    const dir = T.clone().sub(S).normalize(), ang = Math.acos(Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))));
    const pd = pole.clone().sub(S); pd.sub(dir.clone().multiplyScalar(pd.dot(dir))).normalize();
    const Ep = S.clone().addScaledVector(dir, Math.cos(ang) * a).addScaledVector(pd, Math.sin(ang) * a);
    turn(up, E.clone().sub(S), Ep.clone().sub(S), w);
    const E2 = lo.getWorldPosition(new THREE.Vector3()), H2 = ha.getWorldPosition(new THREE.Vector3());
    turn(lo, H2.clone().sub(E2), T.clone().sub(E2), w);
  }
  /* body-relative points, in world space: forward is where he faces */
  function frame() {
    root.updateMatrixWorld(true);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();   /* his right (facing +z, his right is -x) */
    return { fwd, right, chest: bones.spine_03.getWorldPosition(new THREE.Vector3()), neck: bones.neck_01.getWorldPosition(new THREE.Vector3()), head: bones.Head.getWorldPosition(new THREE.Vector3()) };
  }
  const toLocal = (v) => root.worldToLocal(v.clone());

  /* look.height (2026-11-18): the body scales by r, the head is counter-scaled so its world size is unchanged. The standing height is
     measured (head top, rest pose) for two values of r and solved by the secant method: the head's offset from its bone scales with the
     body, so no closed form is exact. The target is look.height x the default male rig's height, measured the same way. */
  if (look.height != null && look.height !== 1) {
    const top = () => { root.updateMatrixWorld(true); skinned.forEach((o) => o.skeleton.update()); return new THREE.Box3().setFromObject(head.group).max.y - new THREE.Box3().setFromObject(model, true).min.y; };
    const setR = (r) => { const r0 = root.scale.x / base; root.scale.setScalar(base * r); head.group.scale.multiplyScalar(r0 / r); };
    const base = root.scale.x, ref = top() / (FEM ? 0.95 : 1), want = look.height * ref;   /* ref: the default (unscaled) rig's height */
    let ra = 1, ha = top(), rb = look.height, hb;
    for (let k = 0; k < 4; k++) { setR(rb); hb = top(); if (Math.abs(hb - want) < 1e-4) break; const rn = rb + (want - hb) * (rb - ra) / (hb - ha); ra = rb; ha = hb; rb = rn; }
  }
  /* standing(): the actor's height as posed now, feet to head top, in metres. Skinned vertices, not the cached bind-pose box (three caches
     a skinned mesh's box from the bind pose). check_cast.mjs calls it after perform() */
  const standing = () => { root.updateMatrixWorld(true); skinned.forEach((o) => o.skeleton.update()); const b = new THREE.Box3().setFromObject(model, true); b.union(new THREE.Box3().setFromObject(head.group)); return b.max.y - b.min.y; };

  return {
    root, bones, cup, phone, head, standing,
    /* gestures layered on top of the clip: { kind: "phone" | "itch", t0, t1 } (world time), eased in and out over 0.25 s */
    gesture(T, list) {
      clock.t = T;
      for (const gk of list || []) {
        const w = smooth((T - gk.t0) / 0.35) * smooth((gk.t1 - T) / 0.35);   /* 0.35 s eases (0.25 moved the hand up to 9 cm a frame) */
        if (w <= 0) continue;
        const F = frame();
        if (gk.kind === "phone") {           /* left hand holds the phone up in front of the chest, elbow down and out */
          const tgt = F.chest.clone().addScaledVector(F.fwd, 0.3).addScaledVector(F.right, -0.06).add(new THREE.Vector3(0, 0.02, 0));
          reach("l", tgt, F.chest.clone().addScaledVector(F.right, -0.5).add(new THREE.Vector3(0, -0.6, 0)), w);
        } else if (gk.kind === "hold") {     /* seated: the right hand holds the cup in front of him at lap height (not on his knee) */
          const tgt = F.chest.clone().addScaledVector(F.fwd, 0.34).addScaledVector(F.right, 0.08).add(new THREE.Vector3(0, -0.14, 0));   /* belly height, in front: it read as a hand on the knee at -0.3 */
          reach("r", tgt, F.chest.clone().addScaledVector(F.right, 0.6).add(new THREE.Vector3(0, -0.7, 0)), w);
        } else if (gk.kind === "lap") {      /* left hand rests on top of his thigh, not sunk into his knee */
          const tgt = F.chest.clone().addScaledVector(F.fwd, 0.26).addScaledVector(F.right, -0.13).add(new THREE.Vector3(0, -0.24, 0));
          reach("l", tgt, F.chest.clone().addScaledVector(F.right, -0.6).add(new THREE.Vector3(0, -0.5, 0)), w);
        } else if (gk.kind === "sip") {      /* right hand brings the cup to his mouth, elbow down and out */
          const tgt = F.head.clone().addScaledVector(F.fwd, 0.25).addScaledVector(F.right, 0.04).add(new THREE.Vector3(0, -0.11, 0));   /* the cup stops in front of his mouth (it went through his face) */
          reach("r", tgt, F.chest.clone().addScaledVector(F.right, 0.55).add(new THREE.Vector3(0, -0.6, 0)), w);
        } else if (gk.kind === "itch") {     /* left hand scratches the back of his neck: the running gag */
          const sc = Math.sin(T * 2 * Math.PI * 7) * 0.025;
          const tgt = F.neck.clone().addScaledVector(F.fwd, -0.09).addScaledVector(F.right, -0.04 + sc).add(new THREE.Vector3(0, 0.03, 0));
          reach("l", tgt, F.neck.clone().addScaledVector(F.right, -0.6).add(new THREE.Vector3(0, 0.35, 0)).addScaledVector(F.fwd, 0.2), w);
        }
      }
    },
    /* props follow the hands every frame: the cup upright in the right hand, the phone in the left facing his face */
    props(cupOn, phoneOn) {
      root.updateMatrixWorld(true);
      cup.visible = cupOn; phone.visible = phoneOn;
      if (cupOn) {
        const h = bones.hand_r.getWorldPosition(new THREE.Vector3()), m = bones.middle_01_r.getWorldPosition(new THREE.Vector3()), th = bones.thumb_01_r.getWorldPosition(new THREE.Vector3());
        const c = h.clone().lerp(m, 0.75).lerp(th, 0.25); c.y -= 0.01;
        cup.position.copy(toLocal(c)); cup.quaternion.copy(root.getWorldQuaternion(new THREE.Quaternion()).invert());   /* upright in the world */
      }
      if (phoneOn) {
        const h = bones.hand_l.getWorldPosition(new THREE.Vector3()), m = bones.middle_02_l.getWorldPosition(new THREE.Vector3());
        const c = h.clone().lerp(m, 0.6), head = bones.Head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0));
        phone.position.copy(toLocal(c)); phone.lookAt(head);
      }
    },
    /* track: [{ t, clip, rate, loop, from, fade }] sorted by t. The newest segment fades in over `fade` seconds. */
    perform(T, track) {
      clock.t = T;
      const pose = (t) => {
        for (const a of Object.values(actions)) { a.enabled = false; a.setEffectiveWeight(0); }
        let i = -1; for (let k = 0; k < track.length; k++) if (t >= track[k].t) i = k;
        if (i < 0) i = 0;
        const cur = track[i], prev = i > 0 ? track[i - 1] : null;
        const w = prev ? smooth((t - cur.t) / (cur.fade ?? 0.35)) : 1;
        sampleClip(prev, t, 1 - w); sampleClip(cur, t, w);
        mixer.update(0);
      };
      if (head.lagged) {
        /* v3: the head's frame at T-0.12 and T-0.06 relative to now, in the hair's own frame: the hair trails the head (a damped follow, pure in T) */
        const Ms = [0.12, 0.06, 0].map((d) => { pose(T - d); bones.Head.updateWorldMatrix(true, false); return bones.Head.matrixWorld.clone(); });
        const F = head.group.matrix, Fi = F.clone().invert(), Mi = Ms[2].clone().invert();
        head.lagB.copy(Fi).multiply(Mi).multiply(Ms[0]).multiply(F);
        head.lagA.copy(Fi).multiply(Mi).multiply(Ms[1]).multiply(F);
      } else pose(T);
    },
    face(e, blink, look, T) { head.set(e, blink, look, T); },
    outline(on) { outlines.forEach((m) => (m.visible = on)); headOutline.visible = on; },
  };
}

/* deterministic blinks, with a double blink now and then */
export function blinkAt(t, seed = 0) {
  const period = 3.3 + (seed % 5) * 0.21, ph = (t + seed * 0.53) % period;
  if (ph < 0.12) return true;
  return Math.floor((t + seed * 0.53) / period) % 3 === 2 && ph > 0.22 && ph < 0.32;
}
