/* look.js — the render look: tone mapping, a three-light rig with soft shadows, image-based fill,
   atmospheric depth, ambient occlusion, bloom, and a final grade (vignette, grain, split-tone).
   Written 2026-11-15 after the user's note: "the lighting is very important, make sure it is never flat".
   Everything here is three.js core or three/examples (MIT). Nothing is downloaded: the environment
   light is RoomEnvironment, generated in code. Every value is read from direction.js `look`.
   Deterministic: the grain is seeded by the film's clock, so any frame renders on its own. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { HAZE } from "./detail.js";

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1080, 1920) },
    uVignette: { value: 0.35 }, uGrain: { value: 0.035 },
    uShadowTint: { value: new THREE.Vector3(0.0, 0.01, 0.035) },   /* lift shadows toward blue-teal */
    uHighTint: { value: new THREE.Vector3(0.03, 0.012, -0.01) },    /* push highlights warm */
    uContrast: { value: 1.06 }, uSat: { value: 1.08 },
    uGhost: { value: 0 },                                           /* the ghost: grey world, only pure red survives (the outline) */
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uContrast, uSat, uGhost; uniform vec2 uRes;
    uniform vec3 uShadowTint, uHighTint; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      c += uShadowTint * smoothstep(0.0, 0.12, l) * (1.0 - smoothstep(0.12, 0.55, l)) + uHighTint * smoothstep(0.45, 1.0, l);   /* split-tone; true blacks stay black (V13) */
      c = mix(vec3(l), c, uSat);
      float red = step(0.75, c.r) * step(c.g, 0.3) * step(c.b, 0.3);
      float lg = pow(clamp(l, 0.0, 1.0), 1.1) * 0.94;                                                 /* the ghost: desaturated and moody, a toe that keeps the darks dark and no lift (V13: it read as a white glow) */
      c = mix(c, mix(vec3(lg), c, red), uGhost);
      c = (c - 0.5) * uContrast + 0.5;
      vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
      c *= 1.0 - uVignette * smoothstep(0.25, 0.85, length(q) * 1.25);                              /* vignette */
      c += (h(vUv * uRes + fract(uTime * 7.13) * 91.7) - 0.5) * uGrain;                                /* grain, seeded by time */
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};


/* depth of field + focus: a gather blur whose circle of confusion comes from the scene depth (the beauty pass keeps a depth texture),
   with the focus taken from the depth at the middle of the frame, so whoever is in the centre stays sharp and the street behind
   them, and anything close to the lens at the edge, goes soft. Deterministic: a pure function of the frame.
   Options in direction.js look.dof (all optional): { enabled = true, aperture = 15, maxPx = 8, focusMax = 14 } */
const DofShader = {
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1080, 1920) }, uNear: { value: 0.05 }, uFar: { value: 300 }, uAperture: { value: 15 }, uMaxPx: { value: 8 }, uFocusMax: { value: 14 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear, uFar, uAperture, uMaxPx, uFocusMax; varying vec2 vUv;
    float lin(vec2 uv){ float d = texture2D(tDepth, uv).x; return (uNear * uFar) / (uFar - d * (uFar - uNear)); }
    float coc(float z, float f){ return min(uMaxPx, uAperture * abs(1.0 / f - 1.0 / max(z, 0.05))); }
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      float f = 0.0;
      f += min(lin(vec2(0.5, 0.5)), uFocusMax) * 2.0;
      f += min(lin(vec2(0.46, 0.5)), uFocusMax); f += min(lin(vec2(0.54, 0.5)), uFocusMax);
      f += min(lin(vec2(0.5, 0.46)), uFocusMax); f += min(lin(vec2(0.5, 0.54)), uFocusMax);
      f = max(0.6, f / 6.0);
      float zc = lin(vUv), cc = coc(zc, f);
      if (cc < 0.6) { gl_FragColor = base; return; }
      vec3 acc = base.rgb; float wsum = 1.0;
      for (int i = 0; i < 20; i++) {
        float fi = float(i) + 0.5, a = fi * 2.39996, r = sqrt(fi / 20.0) * cc;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r / uRes;
        float zs = lin(uv), cs = coc(zs, f);
        float w = clamp(cs - r + 1.0, 0.0, 1.0);
        acc += texture2D(tDiffuse, uv).rgb * w; wsum += w;
      }
      gl_FragColor = vec4(acc / wsum, 1.0);
    }`,
};

export function setupLook(renderer, scene, camera, L, W, H) {
  renderer.toneMapping = THREE[L.toneMapping] ?? THREE.NeutralToneMapping;
  renderer.toneMappingExposure = L.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* image-based fill, generated in code (no HDR file) — gives every surface a soft, directional sky response */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = L.env.intensity;

  /* atmospheric depth: far things fade toward the horizon colour */
  /* 2026-11-17: the haze is the horizon colour (lighter and bluer than the old near-black), so each receding row of buildings and lamps
     steps toward it: atmospheric perspective. direction.js look.fog may set hazeColor, nearK, farK. */
  scene.fog = new THREE.Fog(L.fog.hazeColor ?? HAZE, L.fog.near * (L.fog.nearK ?? 0.75), L.fog.far * (L.fog.farK ?? 1.5));

  /* the rig: a warm low key (morning sun) with soft shadows, a cool sky fill, a rim from behind */
  const key = new THREE.DirectionalLight(L.key.color, L.key.intensity);
  key.position.set(...L.key.pos); key.castShadow = true;
  key.shadow.mapSize.set(L.key.shadowMap, L.key.shadowMap);
  const e = L.key.shadowExtent; Object.assign(key.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 120 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = L.key.softness;
  key.target.position.set(...L.key.target); scene.add(key, key.target);
  const fill = new THREE.HemisphereLight(L.fill.sky, L.fill.ground, L.fill.intensity); scene.add(fill);
  const rim = new THREE.DirectionalLight(L.rim.color, L.rim.intensity); rim.position.set(...L.rim.pos); scene.add(rim);
  /* a warm kick from the lamps behind the action: the cool rim on one side, a sodium-orange edge on the other (look.kick, optional) */
  const kickL = L.kick ?? { color: 0xffa766, intensity: 0.55, pos: [-9, 4, -11] };
  if (kickL.intensity > 0) { const kick = new THREE.DirectionalLight(kickL.color, kickL.intensity); kick.position.set(...kickL.pos); scene.add(kick); }

  /* every lit mesh casts and receives; unlit ones (sky, glow, UI) do not */
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const lit = o.material && !o.material.isMeshBasicMaterial;
    o.castShadow = lit && !o.userData.noShadow; o.receiveShadow = lit && !o.userData.noReceive;   /* noReceive: far scenery skips the shadow lookup (2026-11-18, render cost) */
  });

  const dofL = L.dof ?? {}, useDof = dofL.enabled !== false;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: true, depthTexture: useDof ? new THREE.DepthTexture(W, H) : null });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  if (useDof) {
    const dof = new ShaderPass(DofShader), baseRender = dof.render.bind(dof);
    dof.uniforms.uRes.value.set(W, H); dof.uniforms.uAperture.value = dofL.aperture ?? 15; dof.uniforms.uMaxPx.value = dofL.maxPx ?? 8; dof.uniforms.uFocusMax.value = dofL.focusMax ?? 14;
    dof.render = (r, wb, rb, dt, m) => { dof.uniforms.tDepth.value = rb.depthTexture; dof.uniforms.uNear.value = camera.near; dof.uniforms.uFar.value = camera.far; baseRender(r, wb, rb, dt, m); };
    composer.addPass(dof);
  }
  let ao = null;
  if (L.ao.enabled) {
    ao = new GTAOPass(scene, camera, W, H);
    ao.blendIntensity = L.ao.intensity;
    ao.updateGtaoMaterial({ radius: L.ao.radius, distanceExponent: 1, thickness: 1, scale: 1, samples: 16 });
    /* glow sprites, light pools, shafts and the far skyline are translucent: in the normal pass they would read as solid walls */
    const hidden = []; scene.traverse((o) => { if (o.userData.noAO) hidden.push(o); });
    const aoRender = ao.render.bind(ao);
    ao.render = (...a) => { const was = hidden.map((o) => o.visible); hidden.forEach((o) => { o.visible = false; }); aoRender(...a); hidden.forEach((o, i) => { o.visible = was[i]; }); };
    composer.addPass(ao);
  }
  let bloom = null;
  if (L.bloom.strength > 0) { bloom = new UnrealBloomPass(new THREE.Vector2(W, H), L.bloom.strength, L.bloom.radius, L.bloom.threshold); composer.addPass(bloom); }
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uVignette.value = L.grade.vignette; grade.uniforms.uGrain.value = L.grade.grain;
  grade.uniforms.uContrast.value = L.grade.contrast; grade.uniforms.uSat.value = L.grade.saturation;
  composer.addPass(grade);

  return {
    key, composer,   /* composer: bench_frame.mjs toggles its passes (2026-11-18) */
    render(T, ghost = 0) { grade.uniforms.uTime.value = T; grade.uniforms.uGhost.value = ghost; if (bloom) bloom.strength = L.bloom.strength * (1 - 0.7 * ghost); composer.render(); },   /* the ghost keeps a little bloom only */
  };
}
