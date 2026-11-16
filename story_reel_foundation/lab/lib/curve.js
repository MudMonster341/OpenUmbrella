/* curve.js — a smooth path through keys: monotone cubic (Fritsch–Carlson), one channel at a time.
   Why: the bus moved in straight lines between keys, so its speed jumped at every key and it moved in jerks (the user, night v4:
   "it feels stop motion at points"). A monotone cubic has continuous speed and never overshoots a key, so a vehicle keyed to stop
   short of the shelter cannot swing into it early. Used by world.js and by check_bus.mjs (the same code, so the check is the truth). */

/* keys: [[t, v0, v1, ...], ...] ascending in t. Returns the channel values at time t (clamped at both ends). */
export function monoCubic(keys, t) {
  const n = keys.length, ch = keys[0].length - 1;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
  const out = [];
  for (let c = 1; c <= ch; c++) {
    const m = tangents(keys, c);
    const t0 = keys[i][0], t1 = keys[i + 1][0], h = t1 - t0, s = (t - t0) / h;
    const p0 = keys[i][c], p1 = keys[i + 1][c];
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
    out.push(h00 * p0 + h10 * h * m[i] + h01 * p1 + h11 * h * m[i + 1]);
  }
  return out;
}

const cache = new WeakMap();
function tangents(keys, c) {
  let per = cache.get(keys); if (!per) { per = {}; cache.set(keys, per); }
  if (per[c]) return per[c];
  const n = keys.length, d = [], m = new Array(n).fill(0);
  for (let k = 0; k < n - 1; k++) d.push((keys[k + 1][c] - keys[k][c]) / (keys[k + 1][0] - keys[k][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];                                   /* the ends keep their segment's speed: the bus ARRIVES at speed */
  for (let k = 1; k < n - 1; k++) m[k] = d[k - 1] * d[k] <= 0 ? 0 : (d[k - 1] + d[k]) / 2;
  for (let k = 0; k < n - 1; k++) {                                   /* Fritsch–Carlson: limit the tangents so nothing overshoots */
    if (d[k] === 0) { m[k] = 0; m[k + 1] = 0; continue; }
    const a = m[k] / d[k], b = m[k + 1] / d[k], r = a * a + b * b;
    if (r > 9) { const tau = 3 / Math.sqrt(r); m[k] = tau * a * d[k]; m[k + 1] = tau * b * d[k]; }
  }
  return (per[c] = m);
}
