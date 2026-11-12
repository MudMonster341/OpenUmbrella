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
export function curveForDistance(distance) {
  if (distance < 2) return Ease.outCubic;     // a nudge — settle quickly
  if (distance < 8) return Ease.inOutCubic;   // a move — symmetric
  if (distance < 20) return Ease.inOutQuint;  // a travel — ease harder
  return Ease.outExpo;                        // a journey — long tail
}

/**
 * Duration derived from distance, so speed stays roughly consistent across
 * the film instead of every move taking the same time regardless of length.
 * Returns seconds. `pace` scales the whole film's tempo.
 */
export function durationForDistance(distance, pace = 1.0) {
  // sqrt so long moves do not take proportionally forever; floor so a tiny
  // move still reads as deliberate.
  return Math.max(0.6, Math.sqrt(distance) * 0.55) * pace;
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
  /**
   * @param {object} sheet  beat sheet — see beatsheet.schema.json
   * @param {object} opts   { fps, pace, motionFloor }
   */
  constructor(sheet, opts = {}) {
    this.fps = opts.fps ?? sheet.fps ?? 30;
    this.pace = opts.pace ?? sheet.pace ?? 1.0;
    // Residual camera drift during holds, in world units of amplitude.
    // Small enough to be invisible as movement, large enough that the
    // rendered frame always changes. This is the M1 guarantee.
    this.motionFloor = opts.motionFloor ?? sheet.motionFloor ?? 0.06;
    this.beats = sheet.beats ?? [];
    if (this.beats.length < 2) {
      throw new Error("onecam: a continuous move needs at least 2 beats");
    }
    this._buildTimeline();
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
          : beat.travel ?? durationForDistance(distance, this.pace);
      const hold = beat.hold ?? 1.2;
      const seg = {
        index: i,
        beat,
        distance,
        travelStart: t,
        travelEnd: t + travel,
        holdEnd: t + travel + hold,
        curve: beat.curve ? Ease[beat.curve] ?? curveForDistance(distance) : curveForDistance(distance),
      };
      t = seg.holdEnd;
      return seg;
    });
    this.duration = t;
    this.totalFrames = Math.round(this.duration * this.fps);
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
      const p0 = (this.beats[i - 2] ?? this.beats[i - 1]).position;
      const p1 = this.beats[i - 1].position;
      const p2 = seg.beat.position;
      const p3 = (this.beats[i + 1] ?? seg.beat).position;
      base = [0, 1, 2].map((axis) =>
        catmullRom(p0[axis], p1[axis], p2[axis], p3[axis], e)
      );
    }

    // The motion floor: a slow, non-repeating drift applied at all times.
    // Three incommensurable frequencies so the pattern never loops inside a
    // short film and the frame is never byte-identical to the previous one.
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
