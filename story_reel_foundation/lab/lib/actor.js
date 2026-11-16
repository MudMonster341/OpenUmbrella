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
export const EXPRESSIONS = {
  /* lid: 1 open .. 0 shut; brow: [lift, tilt] (tilt > 0 = inner ends up: worry); pupil: size */
  neutral:   { lidL: 0.95, lidR: 0.95, browL: [0, 0],         browR: [0, 0],         pupil: 1.0,  mouth: "line" },
  deadpan:   { lidL: 0.6,  lidR: 0.6,  browL: [-0.008, -0.05], browR: [-0.008, -0.05], pupil: 1.0,  mouth: "flat" },
  skeptical: { lidL: 0.62, lidR: 1.0,  browL: [-0.012, -0.18], browR: [0.02, 0.24],   pupil: 1.0,  mouth: "smirk" },
  shock:     { lidL: 1.0,  lidR: 1.0,  browL: [0.016, 0.16],  browR: [0.016, 0.16],  pupil: 0.7,  mouth: "o" },
  scared:    { lidL: 1.0,  lidR: 1.0,  browL: [0.012, 0.6],   browR: [0.012, 0.6],    pupil: 0.75, mouth: "wobble" },
  happy:     { lidL: 0.7,  lidR: 0.7,  browL: [0.018, 0],     browR: [0.018, 0],     pupil: 1.0,  mouth: "smile" },
  worried:   { lidL: 0.9,  lidR: 0.9,  browL: [0.014, 0.5],   browR: [0.014, 0.5],   pupil: 0.9,  mouth: "frown" },
};

function drawMouth(ctx, kind) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#3a1d1a"; ctx.fillStyle = "#4a1f1c"; ctx.lineWidth = 16;
  ctx.beginPath();
  if (kind === "line") { ctx.moveTo(W * 0.3, H * 0.5); ctx.quadraticCurveTo(W * 0.5, H * 0.56, W * 0.7, H * 0.5); ctx.stroke(); }
  else if (kind === "flat") { ctx.moveTo(W * 0.32, H * 0.52); ctx.lineTo(W * 0.68, H * 0.5); ctx.stroke(); }
  else if (kind === "smirk") { ctx.moveTo(W * 0.32, H * 0.55); ctx.quadraticCurveTo(W * 0.55, H * 0.55, W * 0.72, H * 0.4); ctx.stroke(); }
  else if (kind === "smile") {
    ctx.moveTo(W * 0.26, H * 0.38); ctx.quadraticCurveTo(W * 0.5, H * 0.86, W * 0.74, H * 0.38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f4f1ea"; ctx.beginPath(); ctx.moveTo(W * 0.3, H * 0.41); ctx.quadraticCurveTo(W * 0.5, H * 0.52, W * 0.7, H * 0.41); ctx.lineTo(W * 0.68, H * 0.47); ctx.quadraticCurveTo(W * 0.5, H * 0.56, W * 0.32, H * 0.47); ctx.fill();
  } else if (kind === "o") { ctx.ellipse(W * 0.5, H * 0.52, W * 0.11, H * 0.24, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (kind === "wobble") { ctx.moveTo(W * 0.28, H * 0.55); for (let i = 1; i <= 8; i++) ctx.lineTo(W * (0.28 + i * 0.055), H * (0.55 + (i % 2 ? -0.07 : 0.07))); ctx.stroke(); }
  else if (kind === "frown") { ctx.moveTo(W * 0.32, H * 0.6); ctx.quadraticCurveTo(W * 0.5, H * 0.42, W * 0.68, H * 0.6); ctx.stroke(); }
}

function makeHead(look) {
  const H = new THREE.Group();
  const std = (hex, rough = 0.6) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
  const skin = std(look.skin, 0.8), hair = std(look.hair, 0.8);
  const R = 0.15;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), skin); skull.scale.set(1, 1.06, 0.98); H.add(skull);
  /* (no separate jaw sphere: where it crossed the skull it drew a jagged seam across the chin, round 2) */
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 14), std(new THREE.Color(look.skin).multiplyScalar(0.94), 0.5)); nose.position.set(0, -0.012, R * 0.97); nose.scale.set(1, 0.9, 0.85); H.add(nose);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), skin); ear.position.set(s * R * 0.98, -0.006, 0); ear.scale.set(0.45, 1, 0.8); H.add(ear); }
  /* hair: a cap over the top and back, a fringe with a little lift, and two side tufts */
  const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 40, 24, 0, Math.PI * 2, 0, 1.25), hair); cap.position.set(0, 0.012, -0.01); cap.rotation.x = -0.32; cap.scale.set(1.02, 1.08, 1.04); H.add(cap);
  for (const [x, y, z, s] of [[-0.06, 0.118, 0.085, 0.05], [0.0, 0.132, 0.09, 0.055], [0.065, 0.118, 0.08, 0.048]]) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), hair); t.position.set(x, y, z); t.scale.set(1.2, 0.7, 1); H.add(t);
  }
  /* eyes */
  const white = new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.3 });
  const irisM = new THREE.MeshBasicMaterial({ color: 0x5a3a22 }), inkM = new THREE.MeshBasicMaterial({ color: 0x0e0a08 }), shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ER = 0.033;
  const eyes = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.05, 0.02, R * 0.76); H.add(g);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(ER, 28, 20), white); g.add(ball);
    const pupil = new THREE.Group(); g.add(pupil);                       /* rotates about the eye centre, so the discs stay on the surface */
    /* iris, pupil and highlight are CAPS on the eyeball, not flat discs: a flat 17.5 mm disc's rim stood 5.4 mm proud of the ball and
       cut through the half-closed lid (the user, night v4: "his eye animation is broken" while he reads the phone) */
    const cap = (r, d) => new THREE.SphereGeometry(ER + d, 32, 6, 0, Math.PI * 2, 0, Math.asin(r / (ER + d))).rotateX(Math.PI / 2);
    const iris = new THREE.Mesh(cap(0.0175, 0.0012), irisM); pupil.add(iris);
    const p = new THREE.Mesh(cap(0.0105, 0.0019), inkM); pupil.add(p);
    const sh = new THREE.Mesh(cap(0.0045, 0.0025), shine); sh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.006, 0.007, ER).normalize()); pupil.add(sh);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(ER + 0.0045, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin); g.add(lid);   /* clears every cap */
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.052, 4, 10), hair); brow.rotation.z = Math.PI / 2; H.add(brow);
    return { g, pupil, p, iris, lid, brow, s };
  });
  /* mouth: drawn to a texture on a patch that follows the face's curve */
  const mc = document.createElement("canvas"); mc.width = 256; mc.height = 160;
  const mtex = new THREE.CanvasTexture(mc); mtex.colorSpace = THREE.SRGBColorSpace;
  const mouthGeo = new THREE.SphereGeometry(R * 0.985, 24, 12, Math.PI * 0.5 - 0.42, 0.84, Math.PI * 0.5 + 0.18, 0.42);
  const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshStandardMaterial({ map: mtex, transparent: true, roughness: 0.6, depthWrite: false }));
  mouth.position.set(0, 0.0, 0.006); H.add(mouth);     /* phi = pi/2 already faces +z: pass 1 rotated it to the side of the head */
  let mouthKind = "";
  const setMouth = (k) => { if (k === mouthKind) return; mouthKind = k; drawMouth(mc.getContext("2d"), k); mtex.needsUpdate = true; };

  function set(e, blink, look) {
    eyes.forEach((E) => {
      const open = blink ? 0 : (E.s < 0 ? e.lidL : e.lidR);
      E.lid.rotation.x = 1.45 - open * 2.45;                       /* 1 open (lid rolled back) .. 0 shut (lid over the front) */
      E.pupil.rotation.set(-(look?.[1] ?? 0) * 0.45, (look?.[0] ?? 0) * 0.55, 0);
      E.p.scale.set(e.pupil, e.pupil, 1); const ks = 0.85 + 0.15 * e.pupil; E.iris.scale.set(ks, ks, 1);   /* scaled across the ball only, so a cap never sinks into it */
      const [lift, tilt] = E.s < 0 ? e.browL : e.browR;
      const bx = E.s * 0.052, by = 0.072 + lift;
      E.brow.position.set(bx, by, Math.sqrt(Math.max(0, R * R - bx * bx - by * by)) * 0.98 + 0.006);   /* on the skull's surface at that height: never under the fringe, never floating */
      E.brow.rotation.set(0, 0, Math.PI / 2 - E.s * tilt);
    });
    setMouth(e.mouth);
  }
  return { group: H, set, skull };
}

/* blend two expressions; the mouth changes at the midpoint */
export function mixExpr(a, b, u) {
  const A = EXPRESSIONS[a] || EXPRESSIONS.neutral, B = EXPRESSIONS[b] || EXPRESSIONS.neutral, k = smooth(u);
  return {
    lidL: lerp(A.lidL, B.lidL, k), lidR: lerp(A.lidR, B.lidR, k), pupil: lerp(A.pupil, B.pupil, k),
    browL: [lerp(A.browL[0], B.browL[0], k), lerp(A.browL[1], B.browL[1], k)],
    browR: [lerp(A.browR[0], B.browR[0], k), lerp(A.browR[1], B.browR[1], k)],
    mouth: k < 0.5 ? A.mouth : B.mouth,
  };
}

/* ------------------------------------------------------------------ an actor */
export function makeActor(gltf, look) {
  const model = SkeletonUtils.clone(gltf.scene);
  const root = new THREE.Group(); root.add(model);
  const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const C = { top: new THREE.Color(look.top), bottom: new THREE.Color(look.bottom), shoe: new THREE.Color(look.shoe ?? 0xf2f0ea), skin: new THREE.Color(look.skin) };
  const PUSH = { top: 0.02, bottom: 0.016, shoe: 0.016, skin: 0 };   /* one thickness for cloth, so the joints do not split */
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
  const SLIM = { spine_01: 0.9, spine_02: 0.82, spine_03: 0.78, clavicle_l: 0.84, clavicle_r: 0.84, upperarm_l: 0.74, upperarm_r: 0.74, lowerarm_l: 0.84, lowerarm_r: 0.84, Head: 0.55, neck_01: 0.6 };   /* Head: the mannequin's own face is tucked inside ours (round 2: its chin showed as a jagged line) */
  {
    const o = skinned[0], sk = o.skeleton, bm = o.bindMatrix, bmi = o.bindMatrixInverse;
    const bpos = sk.bones.map((b, i) => new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert()));
    const seg = {};
    sk.bones.forEach((b, i) => {
      if (!(b.name in SLIM)) return;
      const ch = b.children.find((c) => c.isBone && sk.bones.includes(c));
      seg[i] = [bpos[i], ch ? bpos[sk.bones.indexOf(ch)] : bpos[i].clone().add(new THREE.Vector3(0, 0.1, 0)), SLIM[b.name]];
    });
    const domBone = new Int32Array(P.length / 3).fill(-1);
    skinned.forEach((m, mi) => {
      const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
      for (let v = 0; v < refs[mi].length; v++) {
        let best = 0, bi = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > best) { best = w; bi = si.getComponent(v, k); } }
        domBone[refs[mi][v]] = bi;
      }
    });
    const V = new THREE.Vector3(), Q = new THREE.Vector3(), AB = new THREE.Vector3();
    for (let c = 0; c < domBone.length; c++) {
      const sg = seg[domBone[c]]; if (!sg) continue;
      V.set(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]).applyMatrix4(bm);
      AB.subVectors(sg[1], sg[0]); const u = Math.min(1, Math.max(0, V.clone().sub(sg[0]).dot(AB) / AB.lengthSq()));
      Q.copy(sg[0]).addScaledVector(AB, u);
      V.sub(Q).multiplyScalar(sg[2]).add(Q).applyMatrix4(bmi);
      P[c * 3] = V.x; P[c * 3 + 1] = V.y; P[c * 3 + 2] = V.z;
    }
    const handIdx = { l: sk.bones.findIndex((b) => b.name === "hand_l"), r: sk.bones.findIndex((b) => b.name === "hand_r") };
    for (let c = 0; c < domBone.length; c++) {
      const m = /^(index|middle|ring|pinky|thumb)_\d+(?:_leaf)?_(l|r)$/.exec(sk.bones[domBone[c]]?.name || "");
      if (!m) continue;
      const H = bpos[handIdx[m[2]]].clone().applyMatrix4(new THREE.Matrix4());   /* the hand bone, in bind space */
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
  for (let it = 0; it < 40; it++) for (const f of [0.5, -0.53]) {   /* 40 passes (was 24): the elbow step and the chest ridges go */
    const Q = Pf.slice();
    for (let v = 0; v < nb.length; v++) {
      if (!cloth[v] || nb[v].size === 0) continue;
      let sx = 0, sy = 0, sz = 0; for (const u of nb[v]) { sx += Pf[u * 3]; sy += Pf[u * 3 + 1]; sz += Pf[u * 3 + 2]; }
      const k = nb[v].size;
      Q[v * 3] = Pf[v * 3] + f * (sx / k - Pf[v * 3]); Q[v * 3 + 1] = Pf[v * 3 + 1] + f * (sy / k - Pf[v * 3 + 1]); Q[v * 3 + 2] = Pf[v * 3 + 2] + f * (sz / k - Pf[v * 3 + 2]);
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
  const head = makeHead(look);
  const hb = wp("Head");
  head.group.position.set(hb.x, hb.y + 0.105, hb.z + 0.018);
  root.add(head.group); bones.Head.attach(head.group);
  /* the hood, gathered behind the neck, and two drawstrings */
  const top = new THREE.MeshStandardMaterial({ color: look.top, roughness: 0.85 });
  const n = wp("neck_01"), s3 = wp("spine_03");
  const skinM = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.8 });
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, Math.max(0.08, hb.y - n.y + 0.05), 24), skinM);
  nk.position.set((n.x + hb.x) / 2, (n.y + hb.y) / 2, (n.z + hb.z) / 2 + 0.005); root.add(nk); bones.neck_01.attach(nk);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.045, 18, 44), top);
  collar.position.set(n.x, n.y - 0.035, n.z + 0.005); collar.rotation.x = Math.PI / 2 - 0.12; root.add(collar); bones.spine_03.attach(collar);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), top); hood.scale.set(0.135, 0.075, 0.075);   /* the hood, folded down behind the neck */
  hood.position.set(n.x, n.y - 0.035, n.z - 0.075); hood.rotation.set(0.25, 0, 0 + 0 * Math.PI); root.add(hood); bones.spine_03.attach(hood);
  const s1 = wp("spine_01");
  for (const s of ["l", "r"]) {
    const Hh = wp("hand_" + s), Mm = wp("middle_02_" + s), Tt = wp("thumb_02_" + s);
    const along = Mm.clone().sub(Hh).normalize(), side0 = Tt.clone().sub(Hh), side = side0.sub(along.clone().multiplyScalar(side0.dot(along))).normalize();
    const normal = new THREE.Vector3().crossVectors(side, along).normalize();
    const basis = new THREE.Matrix4().makeBasis(side, along, normal), q = new THREE.Quaternion().setFromRotationMatrix(basis);
    const mit = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), skinM); mit.scale.set(0.047, 0.078, 0.034);
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

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);

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

  return {
    root, bones, cup, phone, head,
    /* gestures layered on top of the clip: { kind: "phone" | "itch", t0, t1 } (world time), eased in and out over 0.25 s */
    gesture(T, list) {
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
      for (const a of Object.values(actions)) { a.enabled = false; a.setEffectiveWeight(0); }
      let i = -1; for (let k = 0; k < track.length; k++) if (T >= track[k].t) i = k;
      if (i < 0) i = 0;
      const cur = track[i], prev = i > 0 ? track[i - 1] : null;
      const w = prev ? smooth((T - cur.t) / (cur.fade ?? 0.35)) : 1;
      sampleClip(prev, T, 1 - w); sampleClip(cur, T, w);
      mixer.update(0);
    },
    face(e, blink, look) { head.set(e, blink, look); },
    outline(on) { outlines.forEach((m) => (m.visible = on)); headOutline.visible = on; },
  };
}

/* deterministic blinks, with a double blink now and then */
export function blinkAt(t, seed = 0) {
  const period = 3.3 + (seed % 5) * 0.21, ph = (t + seed * 0.53) % period;
  if (ph < 0.12) return true;
  return Math.floor((t + seed * 0.53) / period) % 3 === 2 && ph > 0.22 && ph < 0.32;
}
