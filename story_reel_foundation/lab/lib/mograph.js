/* mograph.js — the motion-graphics inserts, built in HTML/CSS/SVG on top of the 3D (HyperFrames only,
   the user's choice 2026-11-15): the PHONE (the text from ME, buzzing on a bedside table) and the CLOCK
   (the shelter clock, no numerals, the minute hand reaching the hour). Pure functions of screen time T. */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const back = (x) => { x = clamp01(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

/* the sender's contact photo: small and unremarkable */
const ME_SVG = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#e9e3d8"/><circle cx="50" cy="56" r="30" fill="#d6a37f"/>
<path d="M20 50c0-24 14-34 30-34s30 10 30 34c-6-10-14-16-30-16S26 40 20 50z" fill="#2b2420"/><path d="M58 18c6 2 12 8 14 16l-8-4z" fill="#a9a9a9"/>
<circle cx="40" cy="56" r="3.4" fill="#1a1412"/><circle cx="60" cy="56" r="3.4" fill="#1a1412"/><path d="M42 70q8 3 16 0" stroke="#3a1d1a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

export function makeInserts(root) {
  const wrap = document.createElement("div"); wrap.id = "inserts"; wrap.className = "ov"; root.appendChild(wrap);
  wrap.innerHTML = `
  <div id="room"><div id="lampglow"></div><div id="bok1" class="bok"></div><div id="bok2" class="bok"></div><div id="bok3" class="bok"></div><div id="table"></div></div>
  <div id="phoneWrap"><div id="phShadow"></div><div id="phone">
    <div id="notch"></div>
    <div id="phHeader"><div id="phPhoto">${ME_SVG}</div><div id="phStamp"><svg viewBox="0 0 40 56" width="34" height="46"><path d="M6 4h28M6 52h28M10 4c0 14 8 16 10 24-2 8-10 10-10 24M30 4c0 14-8 16-10 24 2 8 10 10 10 24" fill="none" stroke="#17171c" stroke-width="5" stroke-linecap="round"/><path d="M13 44h14c-2-6-5-8-7-9-2 1-5 3-7 9z" fill="#17171c"/></svg><span id="phNum"></span></div></div>
    <div id="phThread"><div id="phBubble"></div></div>
    <div id="buzzL" class="buzz"></div><div id="buzzR" class="buzz"></div>
  </div></div>
  <div id="clockWrap"><svg id="clock" viewBox="0 0 400 400">
    <defs><radialGradient id="cg" cx="45%" cy="40%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9e6dc"/></radialGradient></defs>
    <circle cx="200" cy="200" r="186" fill="#2b3038"/><circle cx="200" cy="200" r="168" fill="url(#cg)"/>
    <g id="ticks"></g>
    <line id="hourH" x1="200" y1="200" x2="200" y2="112" stroke="#20242b" stroke-width="14" stroke-linecap="round"/>
    <line id="minH" x1="200" y1="214" x2="200" y2="58" stroke="#20242b" stroke-width="9" stroke-linecap="round"/>
    <line id="secH" x1="200" y1="226" x2="200" y2="52" stroke="#d8363a" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="200" cy="200" r="11" fill="#d8363a"/><circle cx="200" cy="200" r="4" fill="#20242b"/>
    <path d="M70 120 A150 150 0 0 1 150 56" stroke="#ffffff" stroke-opacity="0.55" stroke-width="10" fill="none" stroke-linecap="round"/>
  </svg></div>`;
  const ticks = wrap.querySelector("#ticks");
  for (let i = 0; i < 60; i++) {
    const a = i * Math.PI / 30, big = i % 5 === 0, r0 = big ? 138 : 150;
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", 200 + Math.sin(a) * r0); l.setAttribute("y1", 200 - Math.cos(a) * r0);
    l.setAttribute("x2", 200 + Math.sin(a) * 160); l.setAttribute("y2", 200 - Math.cos(a) * 160);
    l.setAttribute("stroke", "#20242b"); l.setAttribute("stroke-width", big ? 7 : 2.5); l.setAttribute("stroke-linecap", "round");
    ticks.appendChild(l);
  }
  const q = (s) => wrap.querySelector(s);
  return { wrap, room: q("#room"), phoneWrap: q("#phoneWrap"), phone: q("#phone"), num: q("#phNum"), bubble: q("#phBubble"), buzzL: q("#buzzL"), buzzR: q("#buzzR"),
           clockWrap: q("#clockWrap"), minH: q("#minH"), hourH: q("#hourH"), secH: q("#secH"), shadow: q("#phShadow") };
}

/* phone: { t0, t1, stamp, buzz: [times], bubble: { t, text }, push: [s0, s1] } */
export function applyPhone(o, T, P) {
  const on = P && T >= P.t0 && T < P.t1;
  o.room.style.opacity = on && P.bg !== "blur" ? 1 : 0; o.phoneWrap.style.opacity = on ? 1 : 0;   /* bg blur: the street behind, not a bedroom */
  if (!on) return;
  const u = (T - P.t0) / (P.t1 - P.t0), s = P.push[0] + (P.push[1] - P.push[0]) * easeInOut(u);
  let bx = 0, br = 0, buzzAmt = 0;
  for (const b of P.buzz) { const d = T - b; if (d >= 0 && d < 0.55) { const a = (1 - d / 0.55); buzzAmt = Math.max(buzzAmt, a); bx += Math.sin(d * 190) * 7 * a; br += Math.sin(d * 150 + 1) * 1.2 * a; } }
  const swayX = Math.sin(T * 1.3) * 7, swayY = Math.sin(T * 0.9 + 1) * 9, swayR = Math.sin(T * 1.1 + 2) * 1.1;   /* held in a hand: it is never perfectly still (filmcheck M1, 2026-11-16) */
  o.phone.style.transform = `translate(${bx + swayX}px, ${swayY}px) rotateX(26deg) rotateZ(${-8 + br + swayR}deg) scale(${s})`;
  o.shadow.style.transform = `translateX(${bx * 0.6}px) rotateX(26deg) rotateZ(-8deg) scale(${s})`;
  o.buzzL.style.opacity = o.buzzR.style.opacity = buzzAmt.toFixed(3);
  const k = easeOut((T - P.t0) / 0.16);
  o.num.textContent = P.stamp; o.num.style.transform = `scale(${1 + 0.35 * (1 - k)})`;       /* slammed in already at its value */
  const bt = T - P.bubble.t; o.bubble.textContent = P.bubble.text;
  o.bubble.style.opacity = bt >= 0 ? 1 : 0; o.bubble.style.transform = `translateY(${(1 - back(bt / 0.35)) * 40}px) scale(${0.8 + 0.2 * back(bt / 0.35)})`;
}

/* clock: { t0, t1, from: minutes past, to: minutes past, tickAt, zoom: [s0, s1] } (hours fixed at 8) */
export function applyClock(o, T, C) {
  const on = C && T >= C.t0 && T < C.t1;
  o.clockWrap.style.opacity = on ? 1 : 0;
  if (!on) return;
  const u = (T - C.t0) / (C.t1 - C.t0), s = C.zoom[0] + (C.zoom[1] - C.zoom[0]) * easeInOut(u);
  const tick = T >= C.tickAt ? back((T - C.tickAt) / 0.22) : 0;               /* the minute hand snaps with an overshoot */
  const mins = C.from + (C.to - C.from) * tick, ma = mins * 6, ha = (8 + mins / 60) * 30;
  const secs = ((T - C.t0) + C.secFrom) % 60;                                  /* real seconds: the hand reaches 12 on the tick */
  o.minH.setAttribute("transform", `rotate(${ma} 200 200)`); o.hourH.setAttribute("transform", `rotate(${ha} 200 200)`);
  o.secH.setAttribute("transform", `rotate(${secs * 6} 200 200)`);
  const jolt = T >= C.tickAt ? Math.sin((T - C.tickAt) * 40) * 6 * Math.exp(-(T - C.tickAt) * 7) : 0;
  o.clockWrap.style.transform = `translate(-50%, -50%) scale(${s}) rotate(${jolt * 0.2}deg)`;
}
