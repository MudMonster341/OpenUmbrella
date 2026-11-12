// COPY - do not edit. Source of truth: engine/onecam/onecam.js
// Re-sync: node sync.mjs
/**
 * onecam — continuous-camera rig for Three.js compositions.
 *
 * In-house. The idea (one unbroken camera move, each beat growing out of the
 * previous one) is a filmmaking technique, not licensed IP; none of this code
 * is derived from any third-party implementation. See ADR 0007.
 *
 * What it guarantees, by construction rather than by review:
 *
 *   M1  The frame is never motionless. The camera carries a residual drift
 *       (`motionFloor`) even while "holding" on a beat, so no freezedetect
 *       interval can ever form from a static camera.
 *   M2  Easing is per move and derived from distance, not one global default.
 *   M3  Beats overlap: a beat's content reacts to the camera arriving, with
 *       lead/lag offsets, instead of entering on a uniform metronome.
 *   M4  There are no cuts. Position and look-at are continuous functions of
 *       time, sampled from one spline. A cut is not expressible in this API.
 *
 * Usage:
 *   const cam = new OneCam(beatsheet, { fps: 30 });
 *   // per frame:
 *   cam.apply(threeCamera, frameIndex);
 *   const b = cam.beatAt(frameIndex);   // { index, local, phase, progress }
 */

/* ---------------------------------------------------------------- easing  */

/**
 * Easing is chosen per move from how far the camera travels, because a long
 * move and a short move that share a curve are exactly what reads as
 * mechanical. Short hops settle fast; long travels need a gentler shoulder.
 */
export const Ease = {
  // Standard cubic/quint curves, written out rather than imported so the rig
  // has no dependencies at all.
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  // A gentle S with a longer tail — for the longest travels, where an
  // abrupt settle would feel like the camera hit a wall.
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  linear: (t) => t,
};

/**
 * Pick a curve from distance travelled, in world units.
 * Thresholds are deliberately explicit so they can be tuned per film and
 * recorded, rather than being hidden inside a "feel" constant.
 */
export function curveForDistance(distance, scale = 20) {
  const d = distance / (scale / 20); // normalise to the reference scale
  if (d < 2) return Ease.outCubic;     // a nudge — settle quickly
  if (d < 8) return Ease.inOutCubic;   // a move — symmetric
  if (d < 20) return Ease.inOutQuint;  // a travel — ease harder
  return Ease.outExpo;                 // a journey — long tail
}

/**
 * Duration derived from distance, so speed stays roughly consistent across
 * the film instead of every move taking the same time regardless of length.
 * Returns seconds. `pace` scales the whole film's tempo.
 */
export function durationForDistance(distance, pace = 1.0, scale = 20) {
  // sqrt so long moves do not take proportionally forever; floor so a tiny
  // move still reads as deliberate. Normalised to the reference scale, or a
  // metre-scale interior would cross its whole room in the floor duration.
  const d = distance / (scale / 20);
  return Math.max(0.6, Math.sqrt(d) * 0.55) * pace;
}

/* ------------------------------------------------------------------ math  */

const lerp = (a, b, t) => a + (b - a) * t;

function catmullRom(p0, p1, p2, p3, t) {
  // Centripetal-ish Catmull-Rom. Passes through every waypoint, which matters:
  // a beat's framing must be exactly what was approved at Gate 2.
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    ((2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function vecDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/* -------------------------------------------------------------- the rig  */

export class OneCam {
  /** Seconds before a beat's arrival that the hold drift begins ramping in. */
  static DRIFT_LEAD = 0.45;

  /**
   * The world scale the default constants were calibrated at — the typical
   * camera-to-subject distance of the Paris film, in its world units.
   *
   * Everything spatial in this rig scales with the scene. Apparent motion
   * goes as linear-motion / distance-to-subject, so the same world-unit step
   * that is invisible at 20 units is obvious at 1.5. Hard-coding the
   * constants made a metre-scale interior fail both M1 and M2 on its first
   * plan: every room distance registered as "a nudge" so one easing curve was
   * used throughout, and the still-frame threshold was ~12x too strict.
   */
  static REF_SCALE = 20;

  /**
   * @param {object} sheet  beat sheet — see beatsheet.schema.json
   * @param {object} opts   { fps, pace, motionFloor }
   */
  constructor(sheet, opts = {}) {
    this.fps = opts.fps ?? sheet.fps ?? 30;
    this.pace = opts.pace ?? sheet.pace ?? 1.0;
    // Residual oscillation, in world units of amplitude. On its own this is
    // NOT enough for M1 — see holdDrift.
    this.motionFloor = opts.motionFloor ?? sheet.motionFloor ?? null;
    // Hold drift, in world units per second, along the view direction.
    //
    // Calibrated against a real render, not guessed. The first version relied
    // only on the oscillation above, which moves the camera ~3.5e-4 world
    // units per frame at 30fps — mathematically non-zero, and SUB-PIXEL once
    // projected. filmcheck measured the render as 48% motionless while
    // verify.mjs reported every frame moving. The guarantee had been written
    // in the wrong units: "the camera moves" is not "the image changes".
    //
    // A slow continuous push along the view direction fixes it properly, and
    // is better film-making than a vibration: a camera that keeps easing
    // forward reads as alive, one that oscillates in place reads as noise.
    //
    // 0.22 u/s was still not enough, and the second measurement explained why:
    // flat-shaded low-poly surfaces and a smooth sky gradient mean a ~1px
    // shift changes almost no pixels — only edges differ, and edges are a
    // small fraction of the frame. The motion has to be visible, not merely
    // non-zero. 1.2 u/s is ~3-4px per frame at this scale: about 2.6 units of
    // push across a 2.2s hold, which reads as a deliberate slow push-in.
    //
    // The alternative — adding animated grain so every frame differs — would
    // make filmcheck pass without the film moving. That is gaming our own
    // metric, so it is not done.
    this.holdDrift = opts.holdDrift ?? sheet.holdDrift ?? null;
    this.beats = sheet.beats ?? [];
    if (this.beats.length < 2) {
      throw new Error("onecam: a continuous move needs at least 2 beats");
    }

    /* Scene scale: the median camera-to-subject distance. Every spatial
       default below is derived from it, so an author does not have to retune
       the rig for a room versus a city — they just author the beats. */
    this.scale = opts.scale ?? sheet.scale ?? this._computeScale();
    const k = this.scale / OneCam.REF_SCALE;
    if (this.motionFloor === undefined || this.motionFloor === null) this.motionFloor = 0.06 * k;
    if (this.holdDrift === undefined || this.holdDrift === null) this.holdDrift = 1.2 * k;

    this._buildTimeline();
  }

  /** Median camera-to-subject distance across the beats. */
  _computeScale() {
    const d = this.beats
      .map((b) => {
        const l = b.lookAt ?? [0, 0, 0];
        return Math.hypot(l[0] - b.position[0], l[1] - b.position[1], l[2] - b.position[2]);
      })
      .sort((a, b) => a - b);
    return d[Math.floor(d.length / 2)] || OneCam.REF_SCALE;
  }

  _buildTimeline() {
    // Each beat has a travel segment (moving to it) and a hold (sitting on it
    // while its content plays). Travel time is computed from distance unless
    // the beat pins it explicitly.
    let t = 0;
    this.segments = this.beats.map((beat, i) => {
      const prev = this.beats[i - 1];
      const distance = prev ? vecDistance(prev.position, beat.position) : 0;
      const travel =
        i === 0
          ? 0
          : beat.travel ?? durationForDistance(distance, this.pace, this.scale);
      const hold = beat.hold ?? 1.2;
      const seg = {
        index: i,
        beat,
        distance,
        travelStart: t,
        travelEnd: t + travel,
        holdEnd: t + travel + hold,
        curve: beat.curve
          ? Ease[beat.curve] ?? curveForDistance(distance, this.scale)
          : curveForDistance(distance, this.scale),
      };
      /* Where the camera actually ENDS this beat, after its hold drift.
         The next travel must start from here, not from the beat's authored
         position, or the drift is undone in one frame — which is a cut.
         (Measured: a 2.148-unit jump, caught by verify.mjs's M4.) */
      /* The drift leads the arrival: easing curves reach the beat at zero
         velocity, so handing off from travel to drift at a single instant
         leaves a motionless shoulder either side of it. Measured twice, at
         0.40s and 0.50s — just over the 0.4s limit. Overlapping the two
         velocity sources removes the shoulder. */
      seg.lead = Math.min(OneCam.DRIFT_LEAD, travel);

      /* Drift rate is PER BEAT, scaled by that beat's own subject distance.
         A single global rate cannot serve both a 1.2m close-up and a 3.4m
         wide: the rate that is right up close is invisible far away.
         Measured on zombie-p1 — the near beats passed while the shelf beat,
         3.4m out, held a motionless frame for 5.2 seconds. */
      const look = beat.lookAt ?? [0, 0, 0];
      const subject = Math.hypot(
        look[0] - beat.position[0], look[1] - beat.position[1], look[2] - beat.position[2]
      ) || this.scale;
      seg.driftRate = this.holdDrift * (subject / this.scale);

      const dir = this._driftDir(beat, i);
      const push = seg.driftRate * (hold + seg.lead);
      seg.exit = [
        beat.position[0] + dir[0] * push,
        beat.position[1] + dir[1] * push,
        beat.position[2] + dir[2] * push,
      ];

      t = seg.holdEnd;
      return seg;
    });
    this.duration = t;
    this.totalFrames = Math.round(this.duration * this.fps);
  }

  /**
   * Direction of the hold drift for a beat: mostly a push along the view
   * axis, partly a lateral slide.
   *
   * A pure dolly toward a distant subject barely changes the image — things
   * grow very slowly — which is why a 1.2 u/s push still left a 0.53s
   * motionless interval where a travel's ease-out met a hold. The lateral
   * component creates parallax, where near and far move at different rates,
   * and that is what actually reads as a living frame. The side alternates
   * per beat so the film does not crab steadily in one direction.
   */
  _driftDir(beat, index) {
    const look = beat.lookAt ?? [0, 0, 0];
    let vx = look[0] - beat.position[0];
    let vy = look[1] - beat.position[1];
    let vz = look[2] - beat.position[2];
    const vlen = Math.hypot(vx, vy, vz) || 1;
    vx /= vlen; vy /= vlen; vz /= vlen;

    // right = view x worldUp, with up = (0,1,0), giving a horizontal slide
    const rx = vz, rz = -vx;
    const rlen = Math.hypot(rx, rz) || 1;
    const side = index % 2 === 0 ? 1 : -1;

    const fx = 0.6 * vx + 0.45 * side * (rx / rlen);
    const fy = 0.6 * vy;
    const fz = 0.6 * vz + 0.45 * side * (rz / rlen);
    const flen = Math.hypot(fx, fy, fz) || 1;
    return [fx / flen, fy / flen, fz / flen];
  }

  /** Seconds for a frame index. */
  timeAt(frame) {
    return frame / this.fps;
  }

  /**
   * Which beat is on screen, and how far through it we are.
   * `phase` is "travel" or "hold" — content animation keys off this so it can
   * react to the camera arriving (M3) rather than firing on a fixed clock.
   */
  beatAt(frame) {
    const t = this.timeAt(frame);
    for (const seg of this.segments) {
      if (t <= seg.holdEnd || seg === this.segments[this.segments.length - 1]) {
        const inTravel = t < seg.travelEnd;
        const span = inTravel
          ? seg.travelEnd - seg.travelStart
          : seg.holdEnd - seg.travelEnd;
        const local = span > 0 ? (t - (inTravel ? seg.travelStart : seg.travelEnd)) / span : 1;
        return {
          index: seg.index,
          beat: seg.beat,
          phase: inTravel ? "travel" : "hold",
          local: Math.min(1, Math.max(0, local)),
          progress: t / this.duration,
        };
      }
    }
    return null;
  }

  /**
   * Offset in seconds for a content element on the current beat, so elements
   * overlap instead of marching in step (M3). `order` is the element's index
   * within the beat; `reactsTo` lets one element lag another deliberately.
   */
  static stagger(order, { base = 0.08, growth = 1.35, jitter = 0 } = {}) {
    // Geometric rather than linear: the gaps widen, which reads as reaction
    // rather than as a queue.
    const g = base * (Math.pow(growth, order) - 1) / (growth - 1);
    return g + (jitter ? (Math.sin(order * 12.9898) * 43758.5453 % 1) * jitter : 0);
  }

  /** Camera position at a frame, as [x, y, z]. */
  positionAt(frame) {
    const t = this.timeAt(frame);
    const seg = this.segments.find((s) => t <= s.holdEnd) ?? this.segments[this.segments.length - 1];
    const i = seg.index;

    let base;
    if (i === 0 || t >= seg.travelEnd) {
      base = [...seg.beat.position];
    } else {
      const span = seg.travelEnd - seg.travelStart;
      const raw = span > 0 ? (t - seg.travelStart) / span : 1;
      const e = seg.curve(Math.min(1, Math.max(0, raw)));
      // Spline through neighbouring beats so the path curves through each
      // waypoint instead of making straight-line dashes between them.
      /* p1 is the previous beat's EXIT, so the move continues from where the
         hold drift left the camera. */
      const p0 = (this.segments[i - 2] ?? this.segments[i - 1]).exit;
      const p1 = this.segments[i - 1].exit;
      const p2 = seg.beat.position;
      const p3 = (this.beats[i + 1] ?? seg.beat).position;
      base = [0, 1, 2].map((axis) =>
        catmullRom(p0[axis], p1[axis], p2[axis], p3[axis], e)
      );
    }

    // Hold drift: while sitting on a beat, keep pushing slowly along the view
    // direction. This is what actually satisfies M1 in a rendered frame.
    const driftFrom = seg.travelEnd - (seg.lead ?? 0);
    if (t >= driftFrom) {
      const held = t - driftFrom;
      const dir = this._driftDir(seg.beat, seg.index);
      const push = (seg.driftRate ?? this.holdDrift) * held;
      base = [base[0] + dir[0] * push, base[1] + dir[1] * push, base[2] + dir[2] * push];
    }

    // Oscillation on three incommensurable frequencies, so the drift never
    // settles into a loop. Texture on top of the push, not a substitute.
    const d = this.motionFloor;
    return [
      base[0] + Math.sin(t * 0.37) * d,
      base[1] + Math.sin(t * 0.23 + 1.7) * d * 0.8,
      base[2] + Math.cos(t * 0.31 + 0.4) * d * 0.6,
    ];
  }

  /** Look-at target at a frame — interpolated, so the gaze never snaps. */
  lookAtAt(frame) {
    const t = this.timeAt(frame);
    const seg = this.segments.find((s) => t <= s.holdEnd) ?? this.segments[this.segments.length - 1];
    const i = seg.index;
    const target = seg.beat.lookAt ?? [0, 0, 0];
    if (i === 0 || t >= seg.travelEnd) return [...target];

    const prevTarget = this.beats[i - 1].lookAt ?? [0, 0, 0];
    const span = seg.travelEnd - seg.travelStart;
    const raw = span > 0 ? (t - seg.travelStart) / span : 1;
    // Gaze leads the move slightly — the camera looks where it is going
    // before it finishes arriving, which is what a real operator does.
    const e = seg.curve(Math.min(1, Math.max(0, raw * 1.15)));
    return [0, 1, 2].map((axis) => lerp(prevTarget[axis], target[axis], e));
  }

  /** Field of view at a frame, if beats specify one. */
  fovAt(frame) {
    const t = this.timeAt(frame);
    const seg = this.segments.find((s) => t <= s.holdEnd) ?? this.segments[this.segments.length - 1];
    const i = seg.index;
    const fov = seg.beat.fov ?? 50;
    if (i === 0 || t >= seg.travelEnd) return fov;
    const prevFov = this.beats[i - 1].fov ?? 50;
    const span = seg.travelEnd - seg.travelStart;
    const raw = span > 0 ? (t - seg.travelStart) / span : 1;
    return lerp(prevFov, fov, seg.curve(Math.min(1, Math.max(0, raw))));
  }

  /** Drive a THREE.PerspectiveCamera for this frame. */
  apply(camera, frame) {
    const p = this.positionAt(frame);
    const l = this.lookAtAt(frame);
    camera.position.set(p[0], p[1], p[2]);
    camera.lookAt(l[0], l[1], l[2]);
    const fov = this.fovAt(frame);
    if (Math.abs(camera.fov - fov) > 1e-4) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    return { position: p, lookAt: l, fov };
  }

  /**
   * Authoring-time report: the numbers Gate 1 needs before anything renders.
   */
  plan() {
    return {
      duration: Number(this.duration.toFixed(2)),
      frames: this.totalFrames,
      fps: this.fps,
      beats: this.segments.map((s) => ({
        index: s.index,
        name: s.beat.name ?? `beat ${s.index}`,
        distance: Number(s.distance.toFixed(2)),
        travel: Number((s.travelEnd - s.travelStart).toFixed(2)),
        hold: Number((s.holdEnd - s.travelEnd).toFixed(2)),
        starts: Number(s.travelStart.toFixed(2)),
      })),
    };
  }
}

export default OneCam;
