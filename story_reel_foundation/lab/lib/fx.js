/* fx.js — the text that shows up, and the screen effects, matched to the world's look.
   One visual language: rounded boxes, one ink colour, the same corner radius, a signal colour for emphasis.
   Everything is a pure function of the SCREEN time T. */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const active = (arr, T) => arr.find((c) => T >= c.t && T < c.t + c.dur);

export function makeOverlay(root) {
  const mk = (id, cls = "") => { const d = document.createElement("div"); d.id = id; d.className = "ov " + cls; root.appendChild(d); return d; };
  const stamp = mk("stamp"); stamp.innerHTML = '<svg id="stampIcon" viewBox="0 0 40 56" width="40" height="56"><path d="M6 4h28M6 52h28M10 4c0 14 8 16 10 24-2 8-10 10-10 24M30 4c0 14-8 16-10 24 2 8 10 10 10 24" fill="none" stroke="#17171c" stroke-width="5" stroke-linecap="round"/><path d="M13 44h14c-2-6-5-8-7-9-2 1-5 3-7 9z" fill="#e8892b"/></svg><div id="stampMain"><span id="stampNum"></span><span id="stampLabel">DAYS LEFT</span></div><i id="stampSep"></i><div id="stampClockBox"><span id="stampClock"></span></div><span id="stampDelta" data-layout-allow-overflow></span>';
  return { stamp, num: stamp.querySelector("#stampNum"), icon: stamp.querySelector("#stampIcon"), label: stamp.querySelector("#stampLabel"), sep: stamp.querySelector("#stampSep"), clockBox: stamp.querySelector("#stampClockBox"), clockEl: stamp.querySelector("#stampClock"), delta: stamp.querySelector("#stampDelta"), bubble: mk("bubble"), caption: mk("caption"), banner: mk("banner"), flash: mk("flash"), ghostv: mk("ghostv") };
}

export function applyOverlay(o, T, text, ghostAmt) {
  /* number badge: hourglass + the number + a "DAYS LEFT" label + the story clock on the right (text.clock: [[t, "8:14 PM"], ...], hidden if absent).
     A soft glow breathes amber; when the number drops it flashes red, the number turns red, the hourglass flips, and the glow settles back. */
  const st = [...text.stamp].reverse().find((s) => T >= s.t);
  o.stamp.style.opacity = st ? 1 : 0;
  if (st) {
    o.num.textContent = st.value;
    o.label.textContent = text.stampLabel || "DAYS LEFT";
    const dt = T - st.t, drops = text.stamp.filter((s) => s.delta && T >= s.t);
    o.delta.textContent = st.delta && dt < 1.0 ? st.delta : "";
    o.delta.style.opacity = st.delta ? 1 - clamp01((dt - 0.6) / 0.4) : 0;
    const hit = st.delta ? Math.exp(-dt * 2.2) : 0, pop = st.delta ? 1 + 0.25 * (1 - easeOut(dt / 0.18)) : 1;
    o.num.style.transform = `scale(${pop})`;
    o.num.style.color = st.delta && dt < 1.6 ? "#d8363a" : "#17171c";
    const breathe = 0.5 + 0.5 * Math.sin(T * 3.2), tone = Math.min(1, hit * 1.3 + (drops.length ? 0.35 : 0));
    const rr = Math.round(255 + (216 - 255) * tone), gg = Math.round(166 + (54 - 166) * tone), bb = Math.round(48 + (58 - 48) * tone);
    const gA = 0.4 + 0.2 * breathe + 0.45 * hit, gR = 22 + 8 * breathe + 36 * hit;
    o.stamp.style.boxShadow = `0 0 ${gR}px ${4 + 10 * hit}px rgba(${rr},${gg},${bb},${gA.toFixed(3)}), 0 10px 22px rgba(0,0,0,0.32)`;
    o.stamp.style.borderColor = "#17171c";
    o.stamp.style.transform = `scale(${1 + 0.05 * hit * Math.sin(dt * 22)})`;
    const flip = (drops.length - (st.delta ? 1 : 0)) * 180 + (st.delta ? 180 * easeOut(dt / 0.55) : 0);
    o.icon.style.transform = `rotate(${flip}deg)`;
    const ck = text.clock ? [...text.clock].reverse().find((c) => T >= c[0]) : null;
    o.clockBox.style.display = o.sep.style.display = ck ? "block" : "none";
    if (ck) o.clockEl.textContent = ck[1];
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
