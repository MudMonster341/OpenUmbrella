/* fx.js — the text that shows up, and the screen effects, matched to the world's look.
   One visual language: rounded boxes, one ink colour, the same corner radius, a signal colour for emphasis.
   Everything is a pure function of the SCREEN time T. */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const active = (arr, T) => arr.find((c) => T >= c.t && T < c.t + c.dur);

export function makeOverlay(root) {
  const mk = (id, cls = "") => { const d = document.createElement("div"); d.id = id; d.className = "ov " + cls; root.appendChild(d); return d; };
  const stamp = mk("stamp"); stamp.innerHTML = '<svg viewBox="0 0 40 56" width="46" height="64"><path d="M6 4h28M6 52h28M10 4c0 14 8 16 10 24-2 8-10 10-10 24M30 4c0 14-8 16-10 24 2 8 10 10 10 24" fill="none" stroke="#17171c" stroke-width="5" stroke-linecap="round"/><path d="M13 44h14c-2-6-5-8-7-9-2 1-5 3-7 9z" fill="#17171c"/></svg><span id="stampNum"></span><span id="stampDelta" data-layout-allow-overflow></span>';
  return { stamp, num: stamp.querySelector("#stampNum"), delta: stamp.querySelector("#stampDelta"), bubble: mk("bubble"), caption: mk("caption"), banner: mk("banner"), flash: mk("flash"), ghostv: mk("ghostv") };
}

export function applyOverlay(o, T, text, ghostAmt) {
  /* number stamp: the latest value whose time has passed, plus a short-lived red delta */
  const st = [...text.stamp].reverse().find((s) => T >= s.t);
  o.stamp.style.opacity = st ? 1 : 0;
  if (st) {
    o.num.textContent = st.value;
    const dt = T - st.t;
    o.delta.textContent = st.delta && dt < 1.0 ? st.delta : "";
    o.delta.style.opacity = st.delta ? 1 - clamp01((dt - 0.6) / 0.4) : 0;
    const pop = st.delta ? 1 + 0.25 * (1 - easeOut(dt / 0.18)) : 1;
    o.num.style.transform = `scale(${pop})`;
  }
  /* caption: Punch. one word, centred, a small scale pop on the spoken word */
  const c = active(text.captions, T);
  o.caption.style.opacity = c ? 1 : 0;
  if (c) {
    o.caption.textContent = c.word; o.caption.style.fontSize = "";
    const wpx = o.caption.scrollWidth, fit = Math.min(1, 960 / wpx);   /* a long word shrinks to fit (TWENTY-THREE ran off both edges) */
    if (fit < 1) o.caption.style.fontSize = Math.floor(140 * fit) + "px";
    o.caption.classList.toggle("hot", !!c.hot);
    const k = easeOut((T - c.t) / 0.12), popMax = Math.min(0.24, 1040 / (wpx * fit) - 1);   /* the pop never pushes a word past the frame (it did at 60 fps: autoreview V6) */
    o.caption.style.transform = `translate(-50%, -50%) scale(${1 + Math.max(0, popMax) * (1 - k)})`;
  }
  /* bubble: the text message, same rounded-box language as the world */
  const b = active(text.bubbles, T);
  o.bubble.style.opacity = b ? 1 : 0;
  if (b) { o.bubble.textContent = b.text; o.bubble.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * easeOut((T - b.t) / 0.14)})`; }
  const n = active(text.banner, T);
  o.banner.style.opacity = n ? 1 : 0; if (n) o.banner.textContent = n.text;
  o.ghostv.style.opacity = ghostAmt;
}

export function flashAlpha(fx, T) {
  return fx.flash.reduce((a, f) => (T >= f.at ? Math.max(a, f.alpha * clamp01(1 - (T - f.at) / f.dur)) : a), 0);
}
export function shakeOffset(fx, T) {
  let x = 0, y = 0;
  for (const s of fx.shake) if (T >= s.at) { const d = T - s.at, a = s.amp * Math.exp(-s.decay * d); x += a * Math.sin(d * 55); y += a * Math.cos(d * 47); }
  return [x, y];
}
/* world time: a hit-stop freezes the world for its duration, then the world carries on from where it froze */
export function worldTime(fx, T) {
  let tw = T;
  for (const h of fx.hitstop) { if (T >= h.at + h.dur) tw -= h.dur; else if (T > h.at) tw = h.at; }
  return tw;
}
