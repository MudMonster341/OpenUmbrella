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
    <div id="phThread">${[0,1,2,3,4,5].map((i) => `<div class="phB" data-i="${i}"><span class="phT"></span><span class="phDots"><i></i><i></i><i></i></span></div>`).join("")}</div>
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
  const more = makeMore(wrap);
  return { ...more, wrap, room: q("#room"), phoneWrap: q("#phoneWrap"), phone: q("#phone"), num: q("#phNum"), bubble: q(".phB"), bubs: [...wrap.querySelectorAll(".phB")], buzzL: q("#buzzL"), buzzR: q("#buzzR"),
           clockWrap: q("#clockWrap"), minH: q("#minH"), hourH: q("#hourH"), secH: q("#secH"), shadow: q("#phShadow") };
}

/* phone: { t0, t1, stamp, push: [s0, s1], bg?, buzz?: [times] (default: one per incoming bubble),
     bubble: { t, text }  OR  bubbles: [{ t, text, side?: "them"|"me", typing?: seconds of dots before t (me), until?: time to remove }] (max 6, last 3 shown) } */
export function applyPhone(o, T, P) {
  const on = P && T >= P.t0 && T < P.t1;
  o.room.style.opacity = on && P.bg !== "blur" ? 1 : 0; o.phoneWrap.style.opacity = on ? 1 : 0;   /* bg blur: the street behind, not a bedroom */
  if (!on) return;
  const u = (T - P.t0) / (P.t1 - P.t0), s = P.push[0] + (P.push[1] - P.push[0]) * easeInOut(u);
  let bx = 0, br = 0, buzzAmt = 0;
  const buzzes = P.buzz || (P.bubbles || []).filter((b) => b.side !== "me").map((b) => b.t);
  for (const b of buzzes) { const d = T - b; if (d >= 0 && d < 0.55) { const a = (1 - d / 0.55); buzzAmt = Math.max(buzzAmt, a); bx += Math.sin(d * 190) * 7 * a; br += Math.sin(d * 150 + 1) * 1.2 * a; } }
  const swayX = Math.sin(T * 1.3) * 7, swayY = Math.sin(T * 0.9 + 1) * 9, swayR = Math.sin(T * 1.1 + 2) * 1.1;   /* held in a hand: it is never perfectly still (filmcheck M1, 2026-11-16) */
  o.phone.style.transform = `translate(${bx + swayX}px, ${swayY}px) rotateX(26deg) rotateZ(${-8 + br + swayR}deg) scale(${s})`;
  o.shadow.style.transform = `translateX(${bx * 0.6}px) rotateX(26deg) rotateZ(-8deg) scale(${s})`;
  o.buzzL.style.opacity = o.buzzR.style.opacity = buzzAmt.toFixed(3);
  const k = easeOut((T - P.t0) / 0.16);
  o.num.textContent = P.stamp; o.num.style.transform = `scale(${1 + 0.35 * (1 - k)})`;       /* slammed in already at its value */
  const list = P.bubbles || [P.bubble];
  const started = list.map((b) => T >= b.t - (b.typing || 0));
  o.bubs.forEach((el, i) => {
    const b = list[i];
    const later = b ? list.filter((c, j) => j > i && T >= c.t - (c.typing || 0)).length : 0;
    const vis = !!b && started[i] && later < 3 && (b.until == null || T < b.until);
    el.style.display = vis ? "inline-block" : "none";
    if (!vis) return;
    const me = b.side === "me", typing = b.typing || 0, typingNow = typing > 0 && T < b.t;
    el.classList.toggle("me", me);
    const t0 = typingNow ? b.t - typing : b.t, bt = T - t0;
    el.querySelector(".phT").style.display = typingNow ? "none" : "inline";
    const dots = el.querySelector(".phDots"); dots.style.display = typingNow ? "inline-flex" : "none";
    if (typingNow) [...dots.children].forEach((d, k) => { d.style.transform = `translateY(${-Math.abs(Math.sin(T * 7 - k * 0.8)) * 14}px)`; d.style.opacity = 0.45 + 0.55 * Math.abs(Math.sin(T * 7 - k * 0.8)); });
    else el.querySelector(".phT").textContent = b.text;
    const pop = typingNow ? back(bt / 0.25) : back(bt / 0.35);
    el.style.transformOrigin = me ? "100% 100%" : "0 100%";
    el.style.transform = `translateY(${(1 - pop) * 40}px) scale(${0.8 + 0.2 * pop})`;
    el.style.opacity = clamp01(bt / 0.08);
  });
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

/* ------------------------------------------------------------------------------------------------
   The newer inserts (2026-11-16): the text run, the racing number, ME's photo with the replay band,
   the calendar, the end card. Their CSS is injected here, so index.html needs nothing for them. */
const CSS = `
#phThread { display: flex; flex-direction: column; gap: 22px; }
.phB { display: none; align-self: flex-start; max-width: 520px; padding: 28px 38px; background: #fff; border: 5px solid #17171c; border-radius: 44px 44px 44px 10px; font-size: 56px; font-weight: 700; color: #17171c; line-height: 1.12; }
.phB.me { align-self: flex-end; background: #17171c; color: #fff; border-radius: 44px 44px 10px 44px; }
.phDots { display: none; gap: 14px; align-items: center; height: 56px; padding: 0 6px; } .phDots i { width: 22px; height: 22px; border-radius: 50%; background: #fff; display: block; }
.mgI { position: absolute; inset: 0; opacity: 0; overflow: hidden; }
.mgBg { position: absolute; inset: 0; background-size: 100% 100%, 110px 110px; }
.mgBox { position: absolute; background: #fff; border: 8px solid #17171c; border-radius: 56px; box-shadow: 0 30px 60px rgba(0,0,0,0.35); }
#nmCard { left: 90px; top: 640px; width: 900px; height: 480px; display: flex; align-items: center; justify-content: center; gap: 24px; }
#nmDigits { display: flex; align-items: center; font-size: 240px; line-height: 1; color: #17171c; font-weight: 800; }
#nmDigits b { display: inline-block; width: 0.6em; text-align: center; font-weight: 800; } #nmDigits b.c { width: 0.3em; }
#nmPill { position: absolute; left: 50%; top: 1190px; font-size: 130px; line-height: 1; color: #fff; background: #d8363a; border: 8px solid #17171c; border-radius: 44px; padding: 14px 44px; opacity: 0; white-space: nowrap; }
#meCard { left: 190px; top: 560px; width: 700px; height: 940px; overflow: hidden; border-radius: 64px; background: #e9e3d8; }
#meCard svg { width: 100%; height: 100%; display: block; }
#meBand { position: absolute; left: 0; top: 400px; width: 1080px; height: 260px; }
.meT { position: absolute; top: 0; width: 205px; height: 205px; border: 7px solid #17171c; border-radius: 36px; background: #fff; }
.meT svg { width: 100%; height: 100%; display: block; border-radius: 29px; }
.meC { position: absolute; left: -10px; top: -14px; font-size: 54px; line-height: 1; color: #fff; background: #d8363a; border: 5px solid #17171c; border-radius: 22px; padding: 4px 14px; }
#caWrap { left: 130px; top: 480px; width: 820px; height: 960px; }
#caHead { position: absolute; left: -8px; top: -8px; right: -8px; height: 170px; background: #d8363a; border-radius: 56px 56px 0 0; border: 8px solid #17171c; }
#caHead i { position: absolute; top: -42px; width: 40px; height: 90px; border-radius: 20px; background: #17171c; }
#caWord { position: absolute; left: 0; right: 0; top: 250px; text-align: center; font-size: 150px; line-height: 1; color: #17171c; letter-spacing: 3px; font-weight: 800; }
#caGrid { position: absolute; left: 50px; right: 50px; top: 560px; bottom: 50px; display: grid; grid-template-columns: repeat(7, 1fr); grid-template-rows: repeat(4, 1fr); gap: 12px; }
#caGrid i { border: 4px solid #d2cdc2; border-radius: 16px; display: block; } #caGrid i.on { background: #ffd84a; border-color: #17171c; }
#caCircle { position: absolute; left: 0; top: 190px; width: 800px; height: 260px; overflow: visible; }
#enCard { left: 90px; top: 640px; width: 900px; padding: 20px 0; text-align: center; background: #ffd84a; font-size: 215px; line-height: 1.1; color: #17171c; letter-spacing: 2px; font-weight: 800; }
#enSub { position: absolute; left: 50%; top: 1130px; padding: 18px 44px; background: #fff; border: 7px solid #17171c; border-radius: 999px; font-size: 56px; font-weight: 700; color: #17171c; white-space: nowrap; }
#enArr { position: absolute; left: 490px; top: 1330px; width: 100px; height: 100px; }
`;
const HOURGLASS = `<svg viewBox="0 0 40 56" width="120" height="168"><path d="M6 4h28M6 52h28M10 4c0 14 8 16 10 24-2 8-10 10-10 24M30 4c0 14-8 16-10 24 2 8 10 10 10 24" fill="none" stroke="#17171c" stroke-width="4.5" stroke-linecap="round"/><path d="M13 44h14c-2-6-5-8-7-9-2 1-5 3-7 9z" fill="#17171c"/></svg>`;

/* ME's photo, big: the contact-photo drawing (older, a grey streak) on a taller canvas, plus marks that arrive with "damage" 0-1 */
const ME_BIG = `<svg viewBox="0 0 100 134"><rect width="100" height="134" fill="#e9e3d8"/>
<path d="M4 134C6 108 28 100 50 100s44 8 46 34z" fill="#5d6b7a"/><rect x="42" y="92" width="16" height="18" fill="#c58f6d"/>
<g transform="translate(0 16)"><circle cx="50" cy="56" r="30" fill="#d6a37f"/>
<path d="M20 50c0-24 14-34 30-34s30 10 30 34c-6-10-14-16-30-16S26 40 20 50z" fill="#2b2420"/>
<path d="M52 18c12 1 22 9 26 22-8-8-18-12-32-12z" fill="#b9b9b9"/><path d="M60 17c8 2 14 7 18 14l-9-3z" fill="#e4e4e4"/>
<path d="M36 41q6-2 12 0M54 41q6-2 12 0M38 36q12-3 24 0" stroke="#b07f5e" stroke-width="1.3" fill="none" stroke-linecap="round"/>
<path d="M34 60q6 4 12 0M54 60q6 4 12 0" stroke="#a37455" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<path d="M36 52q4-3 8 0M56 52q4-3 8 0" stroke="#2b2420" stroke-width="1.8" fill="none"/>
<circle cx="40" cy="56" r="3.6" fill="#1a1412"/><circle cx="60" cy="56" r="3.6" fill="#1a1412"/>
<path d="M32 62q-2 10 4 16M68 62q2 10-4 16" stroke="#8d6246" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<path d="M44 76q6 3.5 12 0" stroke="#3a1d1a" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>
<g transform="translate(0 16)" id="meMarks">
<g data-th="0.08"><ellipse cx="68" cy="66" rx="9" ry="7" fill="#7b4a8a" opacity="0.7"/><ellipse cx="68" cy="66" rx="12" ry="9.5" fill="none" stroke="#9aa04a" stroke-width="2" opacity="0.5"/></g>
<g data-th="0.2"><path d="M26 58l8 14M30 56l8 15M34 55l7 12" stroke="#a02d2a" stroke-width="1.6" stroke-linecap="round" fill="none"/></g>
<g data-th="0.34"><g transform="rotate(-18 50 30)"><rect x="38" y="24" width="24" height="9" rx="2" fill="#f2c9a0" stroke="#c79a72" stroke-width="1"/><path d="M50 24v9" stroke="#d9ac80" stroke-width="1"/></g></g>
<g data-th="0.48"><ellipse cx="40" cy="57" rx="8.5" ry="7" fill="#4a2a5a" opacity="0.65"/></g>
<g data-th="0.62"><path d="M52 75l8-1" stroke="#a02d2a" stroke-width="2.4" stroke-linecap="round"/><path d="M58 76c1 4 3 5 0 8-2-3-2-5 0-8z" fill="#c4262b"/></g>
<g data-th="0.76"><g transform="rotate(10 50 80)"><rect x="40" y="82" width="22" height="8" rx="2" fill="#f2c9a0" stroke="#c79a72" stroke-width="1"/><path d="M51 82v8" stroke="#d9ac80" stroke-width="1"/></g></g>
<g data-th="0.9"><path d="M22 36c8-14 26-20 44-14l4 8c-18-6-34-2-44 10z" fill="#f4f1ea" stroke="#c9c3b6" stroke-width="1.2"/><circle cx="58" cy="26" r="3.4" fill="#c4262b"/></g>
</g></svg>`;

/* four dodged events, flat: bus into a shelter, the Boss and a box of belongings, a shop sign falling, a car door opening */
const EV = [
`<svg viewBox="0 0 200 200"><rect width="200" height="200" fill="#bfe3ff"/><rect y="150" width="200" height="50" fill="#6b7280"/>
<path d="M118 68h74v8h-74z" fill="#17171c"/><path d="M124 76v74M186 76v74" stroke="#17171c" stroke-width="6"/><rect x="128" y="80" width="54" height="40" fill="#e6f5ff" opacity="0.7"/><path d="M140 84l12 18-8 14M168 84l-10 20" stroke="#fff" stroke-width="3" fill="none"/>
<rect x="6" y="88" width="104" height="58" rx="10" fill="#d8363a" stroke="#17171c" stroke-width="5"/><g fill="#e6f5ff" stroke="#17171c" stroke-width="3"><rect x="14" y="96" width="22" height="20" rx="4"/><rect x="42" y="96" width="22" height="20" rx="4"/><rect x="70" y="96" width="22" height="20" rx="4"/></g>
<circle cx="32" cy="148" r="14" fill="#17171c"/><circle cx="86" cy="148" r="14" fill="#17171c"/><path d="M112 112l18-14 4 16 18-8-8 18 16 6-20 4 6 16-16-10-6 14-6-14z" fill="#ffd84a" stroke="#17171c" stroke-width="3" stroke-linejoin="round"/></svg>`,
`<svg viewBox="0 0 200 200"><rect width="200" height="200" fill="#f6e3b4"/><rect y="162" width="200" height="38" fill="#c9a96a"/>
<circle cx="52" cy="58" r="20" fill="#d6a37f" stroke="#17171c" stroke-width="5"/><path d="M32 54c2-14 14-20 22-18 8 0 16 6 18 18-8-6-24-8-40 0z" fill="#2b2420"/><path d="M26 164l6-72q22-14 40 0l6 72z" fill="#3b4a66" stroke="#17171c" stroke-width="5" stroke-linejoin="round"/>
<path d="M70 104l46-22" stroke="#3b4a66" stroke-width="16" stroke-linecap="round"/><path d="M118 80l12-6" stroke="#d6a37f" stroke-width="10" stroke-linecap="round"/><path d="M134 72l16-6" stroke="#17171c" stroke-width="4" stroke-linecap="round"/>
<path d="M112 118h76l-8 44h-60z" fill="#b7895a" stroke="#17171c" stroke-width="5" stroke-linejoin="round"/><path d="M132 118c-4-18 2-26 10-30 2 10 0 20-4 30z" fill="#5da56a" stroke="#17171c" stroke-width="3"/><rect x="156" y="100" width="22" height="22" rx="4" fill="#fff" stroke="#17171c" stroke-width="4"/></svg>`,
`<svg viewBox="0 0 200 200"><rect width="200" height="200" fill="#cfe9d5"/><rect width="200" height="82" fill="#e8a07a"/><path d="M0 82h200" stroke="#17171c" stroke-width="6"/><path d="M0 40h200M0 20h200M0 60h200" stroke="#d98c64" stroke-width="3"/>
<path d="M14 24v40M14 24h40" stroke="#17171c" stroke-width="7" stroke-linecap="round" fill="none"/><g transform="rotate(32 60 100)"><rect x="34" y="86" width="104" height="46" rx="8" fill="#ffd84a" stroke="#17171c" stroke-width="5"/><path d="M52 98v22M72 98v22M92 98v22M112 98v22" stroke="#17171c" stroke-width="4"/></g>
<path d="M150 30v28M168 24v32M186 34v22" stroke="#17171c" stroke-width="4" stroke-linecap="round" opacity="0.5"/><rect y="172" width="200" height="28" fill="#9aa39c"/><circle cx="162" cy="140" r="12" fill="#d6a37f" stroke="#17171c" stroke-width="4"/><path d="M150 174l4-22q8-5 16 0l4 22z" fill="#3b4a66" stroke="#17171c" stroke-width="4" stroke-linejoin="round"/></svg>`,
`<svg viewBox="0 0 200 200"><rect width="200" height="200" fill="#e9e1ff"/><rect y="96" width="200" height="104" fill="#5b6070"/><path d="M0 170h200" stroke="#fff" stroke-width="5" stroke-dasharray="24 16"/><path d="M0 96h200" stroke="#17171c" stroke-width="5"/>
<path d="M12 90q4-26 30-30h46q22 4 30 30z" fill="#4aa3d8" stroke="#17171c" stroke-width="5" stroke-linejoin="round"/><rect x="4" y="86" width="132" height="40" rx="12" fill="#4aa3d8" stroke="#17171c" stroke-width="5"/><circle cx="36" cy="128" r="14" fill="#17171c"/><circle cx="108" cy="128" r="14" fill="#17171c"/>
<path d="M60 112l50-4 24 62-52 8z" fill="#8fd0f2" stroke="#17171c" stroke-width="5" stroke-linejoin="round"/><path d="M142 100q14 14 12 34" stroke="#17171c" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="2 9"/>
<circle cx="168" cy="172" r="15" fill="none" stroke="#17171c" stroke-width="5"/><path d="M168 172l10-24 14 2" stroke="#17171c" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="178" cy="136" r="9" fill="#d6a37f" stroke="#17171c" stroke-width="4"/></svg>`];

const mk = (parent, id, cls, html) => { const d = document.createElement("div"); if (id) d.id = id; d.className = cls; if (html) d.innerHTML = html; parent.appendChild(d); return d; };
const bgStyle = (el, T, c1, c2, dot) => { el.style.backgroundColor = c1; el.style.backgroundImage = `radial-gradient(circle at 30% 20%, ${c2}, rgba(0,0,0,0) 70%), radial-gradient(circle, ${dot} 5px, rgba(0,0,0,0) 6px)`; el.style.backgroundPosition = `0 0, ${(T * 26) % 110}px ${(T * 17) % 110}px`; };

function makeMore(wrap) {
  const st = document.createElement("style"); st.textContent = CSS; wrap.appendChild(st);
  /* the number */
  const nm = mk(wrap, "nmI", "mgI"); const nmBg = mk(nm, "", "mgBg");
  const nmCard = mk(nm, "nmCard", "mgBox", `<span id="nmIcon">${HOURGLASS}</span><div id="nmDigits"></div>`);
  const nmPill = mk(nm, "nmPill", "ov");
  /* ME's photo + the replay band */
  const me = mk(wrap, "meI", "mgI"); const meBg = mk(me, "", "mgBg");
  const band = mk(me, "meBand", ""); const thumbs = EV.map((svg) => { const t = mk(band, "", "meT", svg); const c = mk(t, "", "meC ov"); return { t, c }; });
  const meCard = mk(me, "meCard", "mgBox", ME_BIG);
  const marks = [...meCard.querySelectorAll("#meMarks > g")];
  /* the calendar */
  const ca = mk(wrap, "caI", "mgI"); const caBg = mk(ca, "", "mgBg");
  const caWrap = mk(ca, "caWrap", "mgBox", `<div id="caHead"><i style="left:150px"></i><i style="left:630px"></i></div><div id="caWord">FRIDAY</div>
    <div id="caGrid">${Array.from({ length: 28 }, (_, i) => `<i${i === 18 ? ' class="on"' : ""}></i>`).join("")}</div>
    <svg id="caCircle" viewBox="0 0 800 260"><path id="caPath" pathLength="1" d="M120 150C90 60 300 14 430 22C640 30 770 84 745 150C720 232 480 252 330 246C180 240 60 196 78 108C90 56 170 34 250 26" fill="none" stroke="#d8363a" stroke-width="14" stroke-linecap="round"/></svg>`);
  /* the end card */
  const en = mk(wrap, "enI", "mgI"); const enBg = mk(en, "", "mgBg"); const enRays = mk(en, "", "mgBg");
  const enCard = mk(en, "enCard", "mgBox ov", "PART 2"); const enSub = mk(en, "enSub", "ov", "see what happens next");
  const enArr = mk(en, "enArr", "", `<svg viewBox="0 0 100 100"><path d="M18 36l32 32 32-32" fill="none" stroke="#ffd84a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  return { nm, nmBg, nmCard, nmIcon: nm.querySelector("#nmIcon"), nmDigits: nm.querySelector("#nmDigits"), nmPill,
           me, meBg, band, thumbs, meCard, marks, ca, caBg, caWrap, caPath: ca.querySelector("#caPath"), caWord: ca.querySelector("#caWord"),
           en, enBg, enRays, enCard, enSub, enArr };
}

const fmt = (n) => Math.round(n).toLocaleString("en-US");

/* number: { t0, t1, from, to, raceAt, landAt } the value races from -> to between raceAt and landAt (decelerating),
   then a red "-N" pill (N = from - to) lands. Digits are fixed-width, so they never jitter. */
export function applyNumber(o, T, N) {
  const on = N && T >= N.t0 && T < N.t1; o.nm.style.opacity = on ? 1 : 0; if (!on) return;
  bgStyle(o.nmBg, T, "#1d2a44", "rgba(120,160,255,0.35)", "rgba(255,255,255,0.10)");
  const u = clamp01((T - N.raceAt) / (N.landAt - N.raceAt)), e = 1 - Math.pow(1 - u, 4), v = N.from + (N.to - N.from) * e;
  o.nmDigits.innerHTML = fmt(v).split("").map((c) => `<b class="${c === "," ? "c" : ""}">${c}</b>`).join("");
  o.nmDigits.style.color = `rgb(${Math.round(23 + (216 - 23) * e)},${Math.round(23 + (54 - 23) * e)},${Math.round(28 + (58 - 28) * e)})`;
  const landed = T - N.landAt, k = landed >= 0 ? back(landed / 0.3) : 0, pop = landed >= 0 && landed < 0.3 ? 1 + 0.08 * (1 - easeOut(landed / 0.3)) : 1;
  const shake = landed >= 0 ? Math.sin(landed * 60) * 9 * Math.exp(-landed * 9) : (u > 0 && u < 1 ? Math.sin(T * 70) * 3 * (1 - u) : 0);
  const en = back((T - N.t0) / 0.3), drift = 1 + 0.025 * Math.sin((T - N.t0) * 1.6);
  o.nmCard.style.transform = `translateX(${shake}px) scale(${(0.7 + 0.3 * en) * pop * drift}) rotate(${Math.sin(T * 1.2) * 0.7}deg)`;
  o.nmIcon.style.display = "inline-block"; o.nmIcon.style.transform = `rotate(${Math.sin(T * 2.2) * 6 + (1 - e) * u * 180}deg)`;
  o.nmPill.textContent = "−" + fmt(N.from - N.to);
  o.nmPill.style.opacity = landed >= 0 ? 1 : 0;
  o.nmPill.style.transform = `translateX(-50%) scale(${0.4 + 0.6 * k}) rotate(${(1 - k) * -10 + Math.sin(T * 2) * 1.2}deg)`;
}

/* me: { t0, t1, damage: [d0, d1] (0..1, eased across t0..t1), cycle?: seconds per event (0.7), costs?: [4 strings] }
   the four event thumbnails slide and pulse in turn behind the portrait card, each with a cost chip. */
export function applyMe(o, T, M) {
  const on = M && T >= M.t0 && T < M.t1; o.me.style.opacity = on ? 1 : 0; if (!on) return;
  bgStyle(o.meBg, T, "#3a2a52", "rgba(255,150,120,0.30)", "rgba(255,255,255,0.08)");
  const u = clamp01((T - M.t0) / (M.t1 - M.t0)), d = M.damage[0] + (M.damage[1] - M.damage[0]) * easeInOut(u);
  o.marks.forEach((g) => { const th = +g.dataset.th, a = clamp01((d - th) / 0.07); g.style.opacity = a; g.style.transformBox = "fill-box"; g.style.transformOrigin = "center"; g.style.transform = a > 0 && a < 1 ? `scale(${1 + 0.15 * (1 - a)})` : "none"; });
  const en = back((T - M.t0) / 0.35), flo = Math.sin((T - M.t0) * 1.5);
  o.meCard.style.transform = `translateY(${(1 - en) * 120 + flo * 10}px) rotate(${Math.sin((T - M.t0) * 1.1) * 1.4 - 1}deg) scale(${(0.9 + 0.1 * en) * (1 + 0.012 * flo)})`;
  const cyc = M.cycle || 0.7, p = (T - M.t0) / cyc, act = Math.floor(p) % 4, fr = p - Math.floor(p), costs = M.costs || ["−1", "−38", "−95", "−120"];
  o.band.style.transform = `translateX(${Math.sin(p * 1.2) * 10}px)`;
  o.thumbs.forEach((th, i) => {
    const pulse = i === act ? easeInOut(fr / 0.25) * (1 - easeInOut((fr - 0.7) / 0.3)) : 0, bob = Math.sin((T - M.t0) * 2 + i * 1.7) * 6, ent = back((T - M.t0 - 0.12 * i) / 0.4);
    th.t.style.left = (152 + i * 220) + "px";
    th.t.style.transform = `translateY(${bob - pulse * 26 + (1 - ent) * -140}px) scale(${(0.92 + 0.2 * pulse) * (0.7 + 0.3 * ent)}) rotate(${(i - 1.5) * 1.5 + pulse * (i % 2 ? 2 : -2)}deg)`;
    th.t.style.filter = `brightness(${0.78 + 0.22 * pulse})`; th.t.style.zIndex = i === act ? 2 : 1;
    th.c.textContent = costs[i]; th.c.style.transform = `scale(${1 + 0.25 * pulse})`;
  });
}

/* calendar: { t0, t1, drawAt?: time the red circle starts to draw (t0 + 0.6), drawDur?: 0.5 } */
export function applyCalendar(o, T, C) {
  const on = C && T >= C.t0 && T < C.t1; o.ca.style.opacity = on ? 1 : 0; if (!on) return;
  bgStyle(o.caBg, T, "#2f7d6b", "rgba(255,240,170,0.35)", "rgba(255,255,255,0.09)");
  const en = back((T - C.t0) / 0.35), dd = C.drawDur || 0.5, at = C.drawAt ?? C.t0 + 0.6, dr = easeInOut((T - at) / dd);
  o.caPath.setAttribute("stroke-dasharray", "1 1"); o.caPath.setAttribute("stroke-dashoffset", (1 - dr).toFixed(4));
  const sway = Math.sin((T - C.t0) * 1.3), pulse = T > at + dd ? 1 + 0.025 * Math.sin((T - at - dd) * 7) : 1;
  o.caWrap.style.transform = `translateY(${(1 - en) * 160 + sway * 8}px) rotate(${sway * 1.1}deg) scale(${(0.85 + 0.15 * en) * (1 + 0.015 * Math.sin((T - C.t0) * 1.7))})`;
  o.caWord.style.transform = `scale(${pulse})`;
}

/* end card: { t0, t1 } "PART 2" slams in, the line settles under it, an arrow bobs. Always moving. */
export function applyEndCard(o, T, E) {
  const on = E && T >= E.t0 && T < E.t1; o.en.style.opacity = on ? 1 : 0; if (!on) return;
  const dt = T - E.t0;
  bgStyle(o.enBg, T, "#17171c", "rgba(255,216,74,0.18)", "rgba(255,255,255,0.07)");
  o.enRays.style.backgroundImage = "conic-gradient(from " + (dt * 14) + "deg at 50% 46%, rgba(255,216,74,0.16) 0 10deg, rgba(0,0,0,0) 10deg 30deg)"; o.enRays.style.backgroundSize = "auto"; o.enRays.style.backgroundPosition = "0 0";
  const k = back(dt / 0.34), slam = dt < 0.34 ? 1 : 1 + 0.03 * Math.sin((dt - 0.34) * 2.4);
  o.enCard.style.transform = `scale(${(2.4 - 1.4 * k) * slam}) rotate(${(1 - k) * -9 + Math.sin(dt * 1.4) * 1.2}deg)`; o.enCard.style.opacity = clamp01(dt / 0.06);
  const s = back((dt - 0.5) / 0.4);
  o.enSub.style.transform = `translateX(-50%) translateY(${(1 - s) * 90 + Math.sin(dt * 2) * 4}px)`; o.enSub.style.opacity = clamp01((dt - 0.5) / 0.1);
  o.enArr.style.transform = `translateY(${Math.abs(Math.sin(dt * 4)) * 26}px)`; o.enArr.style.opacity = clamp01((dt - 0.9) / 0.2);
}
