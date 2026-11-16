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
      c += uShadowTint * (1.0 - smoothstep(0.0, 0.55, l)) + uHighTint * smoothstep(0.45, 1.0, l);   /* split-tone */
      c = mix(vec3(l), c, uSat);
      float red = step(0.75, c.r) * step(c.g, 0.3) * step(c.b, 0.3);
      c = mix(c, mix(vec3(l * 1.08 + 0.04), c, red), uGhost);
      c = (c - 0.5) * uContrast + 0.5;
      vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
      c *= 1.0 - uVignette * smoothstep(0.25, 0.85, length(q) * 1.25);                              /* vignette */
      c += (h(vUv * uRes + fract(uTime * 7.13) * 91.7) - 0.5) * uGrain;                                /* grain, seeded by time */
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
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
  scene.fog = new THREE.Fog(L.fog.color, L.fog.near, L.fog.far);

  /* the rig: a warm low key (morning sun) with soft shadows, a cool sky fill, a rim from behind */
  const key = new THREE.DirectionalLight(L.key.color, L.key.intensity);
  key.position.set(...L.key.pos); key.castShadow = true;
  key.shadow.mapSize.set(L.key.shadowMap, L.key.shadowMap);
  const e = L.key.shadowExtent; Object.assign(key.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 120 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = L.key.softness;
  key.target.position.set(...L.key.target); scene.add(key, key.target);
  const fill = new THREE.HemisphereLight(L.fill.sky, L.fill.ground, L.fill.intensity); scene.add(fill);
  const rim = new THREE.DirectionalLight(L.rim.color, L.rim.intensity); rim.position.set(...L.rim.pos); scene.add(rim);

  /* every lit mesh casts and receives; unlit ones (sky, glow, UI) do not */
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const lit = o.material && !o.material.isMeshBasicMaterial;
    o.castShadow = lit && !o.userData.noShadow; o.receiveShadow = lit;
  });

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  let ao = null;
  if (L.ao.enabled) {
    ao = new GTAOPass(scene, camera, W, H);
    ao.blendIntensity = L.ao.intensity;
    ao.updateGtaoMaterial({ radius: L.ao.radius, distanceExponent: 1, thickness: 1, scale: 1, samples: 16 });
    composer.addPass(ao);
  }
  if (L.bloom.strength > 0) composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), L.bloom.strength, L.bloom.radius, L.bloom.threshold));
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uVignette.value = L.grade.vignette; grade.uniforms.uGrain.value = L.grade.grain;
  grade.uniforms.uContrast.value = L.grade.contrast; grade.uniforms.uSat.value = L.grade.saturation;
  composer.addPass(grade);

  return {
    key,
    render(T, ghost = 0) { grade.uniforms.uTime.value = T; grade.uniforms.uGhost.value = ghost; composer.render(); },
  };
}
