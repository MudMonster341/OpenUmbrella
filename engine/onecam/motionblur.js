/**
 * ShutterBlur — accumulation motion blur for seek-rendered Three.js films.
 *
 * In-house. Closes onecam gap C1 (ROADMAP): the rig guarantees the camera is
 * never still, but a 30fps render of a continuously moving camera over
 * hard-edged low-poly geometry still judders, because every frame is a
 * zero-duration sample of a moving world. A real shutter is open for a
 * finite time; this reproduces that.
 *
 * WHY ACCUMULATION AND NOT A POST EFFECT
 *
 * The cheap options were both rejected:
 *
 *   - A velocity-buffer blur needs a per-object velocity pass and reprojection,
 *     and it smears a single sample rather than integrating real ones. It gets
 *     silhouettes and disocclusion wrong exactly where this film lives — a
 *     close camera moving past near objects.
 *   - An afterimage/feedback pass is a TRAILING smear of previous output. It
 *     is not motion blur, it drags frame content backwards in time, and it
 *     would make filmcheck's M1 pass without the film moving at all. Gaming
 *     our own metric is worse than failing it (MEMORY.md, 2026-11-13).
 *
 * Accumulation renders the scene several times across the open shutter and
 * averages. It is N times the cost and it is correct: camera motion, object
 * motion and even the lamp flicker blur together, because every sub-sample
 * re-poses the whole scene from `time`.
 *
 * DETERMINISM
 *
 * Sub-sample offsets are fixed and centred on the frame time. No jitter, no
 * random sampling, no frame history — so the same inputs always give the same
 * frames, which the HyperFrames contract requires and which makes a render
 * reproducible from committed source (GOAL.md X4).
 *
 * HALF FLOAT
 *
 * Both targets are HalfFloat. Accumulating several exposures of an HDR scene
 * in 8 bits bands visibly in the shadow falloff and clips the practical long
 * before the tone mapper gets a chance to roll it off. The average is handed
 * to the post chain still linear, so bloom and tone mapping see the blurred
 * image instead of blurring an already-bloomed one.
 *
 * USAGE
 *
 *   const blur = new ShutterBlur(renderer, { width: W, height: H,
 *                                            samples: 4, shutter: 1 / 120 });
 *   composer.addPass(new TexturePass(blur.texture));   // instead of RenderPass
 *   // per frame:
 *   blur.accumulate(scene, camera, poseAt, time);      // poseAt(t) poses everything
 *   composer.render();
 *
 * `shutter` is the open time in SECONDS, not a fraction of a frame, because a
 * composition cannot see the frame rate the renderer was invoked with. A
 * 180-degree shutter is 1 / (2 * fps).
 */

import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

export class ShutterBlur {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {object} opts { width, height, samples, shutter }
   */
  constructor(renderer, { width, height, samples = 1, shutter = 1 / 60 } = {}) {
    this.renderer = renderer;
    this.samples = Math.max(1, Math.min(16, Math.round(samples) || 1));
    this.shutter = Math.max(0, shutter);

    const opts = { type: THREE.HalfFloatType, depthBuffer: true };
    this._sample = new THREE.WebGLRenderTarget(width, height, opts);
    this._accum = new THREE.WebGLRenderTarget(width, height, opts);
    this._sample.texture.colorSpace = THREE.NoColorSpace;
    this._accum.texture.colorSpace = THREE.NoColorSpace;

    this._mat = new THREE.MeshBasicMaterial({
      map: this._sample.texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this._quad = new FullScreenQuad(this._mat);
  }

  /** The averaged frame. Feed this to a TexturePass. */
  get texture() {
    return this._accum.texture;
  }

  /** True when blur is off and the cost is a single scene render. */
  get enabled() {
    return this.samples > 1 && this.shutter > 0;
  }

  /**
   * Render one output frame into the accumulation target.
   *
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {(t:number)=>void} poseAt  poses the ENTIRE scene for a time, camera included
   * @param {number} time              the frame's time, in seconds
   */
  accumulate(scene, camera, poseAt, time) {
    const r = this.renderer;

    r.setRenderTarget(this._accum);
    r.clear();
    r.setRenderTarget(null);

    if (!this.enabled) {
      poseAt(time);
      r.setRenderTarget(this._accum);
      r.render(scene, camera);
      r.setRenderTarget(null);
      return;
    }

    /* Samples straddle the frame time rather than trailing it. Easing curves
       arrive at a beat with zero velocity, so a trailing shutter would bias
       every hold backwards and soften the arrival that the beat exists for. */
    const prevAutoClear = r.autoClear;
    this._mat.opacity = 1 / this.samples;

    for (let s = 0; s < this.samples; s++) {
      const offset = ((s + 0.5) / this.samples - 0.5) * this.shutter;
      poseAt(Math.max(0, time + offset));

      r.setRenderTarget(this._sample);
      r.clear();
      r.render(scene, camera);

      r.setRenderTarget(this._accum);
      r.autoClear = false;
      this._quad.render(r);
      r.autoClear = prevAutoClear;
      r.setRenderTarget(null);
    }
  }

  dispose() {
    this._sample.dispose();
    this._accum.dispose();
    this._mat.dispose();
    this._quad.dispose();
  }
}

export default ShutterBlur;
