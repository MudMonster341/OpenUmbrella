/* mograph.js — the motion-graphics inserts, built in HTML/CSS/SVG on top of the 3D (HyperFrames only,
   the user's choice 2026-11-15): the PHONE (the text from ME, buzzing on a bedside table) and the CLOCK
   (the shelter clock, no numerals, the minute hand reaching the hour). Pure functions of screen time T. */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const back2 = (x) => { x = clamp01(x); const c = 1.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };   /* a softer overshoot for card entries (V7 judder) */
const back = (x) => { x = clamp01(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

/* the sender's contact photo: small and unremarkable */
const ME_SVG = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#e9e3d8"/><circle cx="50" cy="56" r="30" fill="#d6a37f"/>
<path d="M20 50c0-24 14-34 30-34s30 10 30 34c-6-10-14-16-30-16S26 40 20 50z" fill="#2b2420"/><path d="M58 18c6 2 12 8 14 16l-8-4z" fill="#a9a9a9"/>
<circle cx="40" cy="56" r="3.4" fill="#1a1412"/><circle cx="60" cy="56" r="3.4" fill="#1a1412"/><path d="M42 70q8 3 16 0" stroke="#3a1d1a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

export function makeInserts(root) {
  const wrap = document.createElement("div"); wrap.id = "inserts"; wrap.className = "ov"; root.appendChild(wrap);
  wrap.innerHTML = `
  <div id="room"><div id="lampglow"></div><div id="bok1" class="bok"></div><div id="bok2" class="bok"></div><div id="bok3" class="bok"></div><div id="table"></div></div>
  <div id="phoneWrap"><div id="phShadow"></div><div id="phRig">
    <svg id="phHandBack" viewBox="0 0 660 1280"><path d="M300 1150C200 1250 120 1450 170 1800L560 1800C700 1650 800 1350 810 1050L810 560C810 520 780 500 740 520L640 560Z" fill="#c58a63" stroke="#17171c" stroke-width="6" stroke-linejoin="round"/><path d="M170 1800C120 1450 200 1250 300 1150C260 1350 300 1600 400 1800Z" fill="#a2694a" opacity="0.55"/><ellipse cx="720" cy="1180" rx="70" ry="150" fill="#dba57f" opacity="0.45"/><path d="M330 1285C300 1400 300 1500 330 1620" stroke="#a2694a" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.7"/><rect x="620" y="558" width="190" height="104" rx="52" fill="#c58a63" stroke="#17171c" stroke-width="6"/><path d="M740 574q10 36 0 72" stroke="#a2694a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M640 570H728" stroke="#dba57f" stroke-width="8" stroke-linecap="round"/><rect x="620" y="684" width="208" height="108" rx="54" fill="#c58a63" stroke="#17171c" stroke-width="6"/><path d="M751 700q10 38 0 76" stroke="#a2694a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M640 696H736" stroke="#dba57f" stroke-width="8" stroke-linecap="round"/><rect x="620" y="813" width="196" height="106" rx="53" fill="#c58a63" stroke="#17171c" stroke-width="6"/><path d="M744 829q10 37 0 74" stroke="#a2694a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M640 825H730" stroke="#dba57f" stroke-width="8" stroke-linecap="round"/><rect x="620" y="940" width="158" height="92" rx="46" fill="#c58a63" stroke="#17171c" stroke-width="6"/><path d="M721 956q10 30 0 60" stroke="#a2694a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M640 952H713" stroke="#dba57f" stroke-width="8" stroke-linecap="round"/></svg>
    <div id="phone">
    <div id="notch"></div>
    <div id="phLock"><div id="phLockTime"></div>
      <div id="phBanner"><div id="phRipple"></div><div id="phBPhoto">${ME_SVG}</div><div id="phBText"><b id="phBName">ME</b><span id="phBPrev"></span></div></div></div>
    <div id="phChat"><div id="phHeader"><div id="phPhoto">${ME_SVG}</div><b id="phName">ME</b></div>
      <div id="phThread">${[0,1,2,3,4,5].map((i) => `<div class="phB" data-i="${i}"><span class="phT"></span><span class="phDots"><i></i><i></i><i></i></span></div>`).join("")}</div>
      <div id="phHome"></div></div>
    <div id="buzzL" class="buzz"></div><div id="buzzR" class="buzz"></div>
    </div>
    <svg id="phThumb" viewBox="0 0 660 1280"><defs><filter id="phBl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter></defs><ellipse cx="610" cy="624" rx="52" ry="52" fill="#000" opacity="0.28" filter="url(#phBl)"/><rect x="584" y="561" width="92" height="98" rx="49" fill="#dba57f" stroke="#17171c" stroke-width="6"/><path d="M660 572q10 38 0 76" stroke="#a2694a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M600 574H640" stroke="#f0cdb2" stroke-width="7" stroke-linecap="round" opacity="0.8"/><ellipse cx="610" cy="752" rx="52" ry="54" fill="#000" opacity="0.28" filter="url(#phBl)"/><rect x="584" y="687" width="92" height="102" rx="51" fill="#dba57f" stroke="#17171c" stroke-width="6"/><path d="M660 698q10 40 0 80" stroke="#a2694a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M600 700H640" stroke="#f0cdb2" stroke-width="7" stroke-linecap="round" opacity="0.8"/><ellipse cx="610" cy="880" rx="52" ry="53" fill="#000" opacity="0.28" filter="url(#phBl)"/><rect x="584" y="816" width="92" height="100" rx="50" fill="#dba57f" stroke="#17171c" stroke-width="6"/><path d="M660 827q10 39 0 78" stroke="#a2694a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M600 829H640" stroke="#f0cdb2" stroke-width="7" stroke-linecap="round" opacity="0.8"/><ellipse cx="610" cy="1000" rx="52" ry="46" fill="#000" opacity="0.28" filter="url(#phBl)"/><rect x="584" y="943" width="92" height="86" rx="43" fill="#dba57f" stroke="#17171c" stroke-width="6"/><path d="M660 954q10 32 0 64" stroke="#a2694a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M600 956H640" stroke="#f0cdb2" stroke-width="7" stroke-linecap="round" opacity="0.8"/><ellipse cx="96" cy="1100" rx="50" ry="90" fill="#000" opacity="0.3" filter="url(#phBl)"/><path d="M-70 1440C-110 1250-70 1100 10 1020C50 985 110 1000 104 1050C98 1100 56 1150 52 1230C50 1300 70 1380 90 1440Z" fill="#c58a63" stroke="#17171c" stroke-width="6" stroke-linejoin="round"/><path d="M-70 1440C-110 1250-70 1100 10 1020C-30 1120-30 1300 0 1440Z" fill="#a2694a" opacity="0.5"/><ellipse cx="62" cy="1038" rx="26" ry="20" transform="rotate(-35 62 1038)" fill="#efcfb6" stroke="#a2694a" stroke-width="3"/><path d="M-10 1190q40 12 66 -6" stroke="#a2694a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M60 1080C72 1120 58 1160 50 1200" stroke="#dba57f" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.7"/></svg>
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
  return { ...more, wrap, room: q("#room"), phoneWrap: q("#phoneWrap"), phone: q("#phRig"), lockTime: q("#phLockTime"), lock: q("#phLock"), banner: q("#phBanner"), ripple: q("#phRipple"), prev: q("#phBPrev"), chat: q("#phChat"), bubble: q(".phB"), bubs: [...wrap.querySelectorAll(".phB")], buzzL: q("#buzzL"), buzzR: q("#buzzR"),
           clockWrap: q("#clockWrap"), minH: q("#minH"), hourH: q("#hourH"), secH: q("#secH"), shadow: q("#phShadow") };
}

/* phone: { t0, t1, notifyAt?, openAt?, lockTime?, preview?, buzz?: [times], bubble: { t, text } OR bubbles: [{ t, text, side?: "them"|"me", typing?, until? }] (max 6, last 3 shown), push: [s0, s1], bg? }
   1) the lock screen (the clock, only if lockTime is given); at notifyAt a banner (the sender's photo, "ME", a one-line preview) slides in and the phone buzzes;
   2) at openAt (default notifyAt + 0.7) the banner is tapped and grows into the chat thread. Default notifyAt = the first bubble's time - 1.0.
   The phone is hand-held over the blurred street (bg "blur"): a sway, a hand, a drop shadow; every buzz shakes it. */
export function applyPhone(o, T, P) {
  const on = P && T >= P.t0 && T < P.t1;
  o.room.style.opacity = on && P.bg !== "blur" ? 1 : 0; o.phoneWrap.style.opacity = on ? 1 : 0;   /* bg blur: the street behind, not a bedroom */
  if (!on) return;
  const list = P.bubbles || [P.bubble];
  const nAt = P.notifyAt ?? Math.max(P.t0 + 0.08, list[0].t - 1.0), oAt = P.openAt ?? nAt + 0.7;
  const u = (T - P.t0) / (P.t1 - P.t0), s = P.push[0] + (P.push[1] - P.push[0]) * easeInOut(u);
  let bx = 0, by = 0, br = 0, buzzAmt = 0;
  const buzzes = [...(P.buzz || (P.bubbles || []).filter((b) => b.side !== "me").map((b) => b.t)), nAt, nAt + 0.42];
  for (const b of buzzes) { const d = T - b; if (d >= 0 && d < 0.5) { const a = (1 - d / 0.5); buzzAmt = Math.max(buzzAmt, a); bx += Math.sin(d * 210) * 13 * a; by += Math.cos(d * 170) * 6 * a; br += Math.sin(d * 150 + 1) * 2.2 * a; } }
  const swayX = Math.sin(T * 1.3) * 9, swayY = Math.sin(T * 0.9 + 1) * 11, swayR = Math.sin(T * 1.1 + 2) * 1.3;   /* held in a hand: it is never perfectly still (filmcheck M1, 2026-11-16) */
  o.phone.style.transform = `translate(${bx + swayX}px, ${by + swayY}px) rotateX(18deg) rotateZ(${-6 + br + swayR}deg) scale(${s})`;
  o.shadow.style.transform = `translate(${bx * 0.6 + 40}px, ${60 + by * 0.6}px) rotateX(18deg) rotateZ(-6deg) scale(${s * 0.97})`;
  o.buzzL.style.opacity = o.buzzR.style.opacity = buzzAmt.toFixed(3);
  /* the lock screen and the banner */
  o.lockTime.textContent = P.lockTime || ""; o.lockTime.style.display = P.lockTime ? "block" : "none";
  const ent = T - nAt, slide = ent >= 0 ? back(ent / 0.5) : 0, k = clamp01((T - oAt) / 0.4), e = easeInOut(k);
  const press = T >= oAt - 0.18 && T < oAt ? easeOut((T - oAt + 0.18) / 0.18) : T >= oAt ? 1 - easeOut((T - oAt) / 0.12) : 0;
  const prevText = P.preview || list[0].text;
  if (o.prev.textContent !== prevText) { o.prev.textContent = prevText; o.prev.style.fontSize = "30px"; const w = o.prev.scrollWidth; if (w > 372) o.prev.style.fontSize = Math.floor(30 * 372 / w) + "px"; }
  o.banner.style.opacity = ent >= 0 ? clamp01(1 - (k - 0.5) / 0.3) : 0;
  o.banner.style.transform = `translateY(${(1 - slide) * -520}px) scale(${1 - 0.04 * press})`;
  const rp = clamp01((T - oAt + 0.18) / 0.43);
  o.ripple.style.opacity = T >= oAt - 0.18 && T < oAt + 0.25 ? (0.6 * (1 - rp)).toFixed(3) : 0;
  o.ripple.style.transform = `translate(-50%, -50%) scale(${0.3 + 1.6 * rp})`;
  o.lock.style.opacity = (1 - clamp01((k - 0.55) / 0.45)).toFixed(3); o.lock.style.transform = `scale(${1 + 0.05 * e})`;
  /* the chat grows out of the banner's rectangle */
  const ci = (x) => (x * (1 - e)).toFixed(2);
  o.chat.style.clipPath = `inset(${ci(420)}px ${ci(22)}px ${ci(640)}px ${ci(22)}px round ${ci(40)}px)`;
  o.chat.style.opacity = clamp01(k / 0.5).toFixed(3);                           /* the card cross-fades over the banner; its content comes in while it grows: no empty card */
  const cc = clamp01((k - 0.2) / 0.5).toFixed(3); for (const ch of o.chat.children) ch.style.opacity = cc;
  /* the thread */
  const startT = (b) => Math.max(b.t - (b.typing || 0), oAt + 0.25);
  o.bubs.forEach((el, i) => {
    const b = list[i];
    const later = b ? list.filter((c, j) => j > i && T >= startT(c)).length : 0;
    const vis = !!b && T >= startT(b) && later < 3 && (b.until == null || T < b.until);
    el.style.display = vis ? "inline-block" : "none";
    if (!vis) return;
    const me = b.side === "me", typing = b.typing || 0, typingNow = typing > 0 && T < b.t;
    el.classList.toggle("me", me);
    const t0 = typingNow ? b.t - typing : Math.max(b.t, oAt + 0.25), bt = T - t0;
    el.querySelector(".phT").style.display = typingNow ? "none" : "inline";
    const dots = el.querySelector(".phDots"); dots.style.display = typingNow ? "inline-flex" : "none";
    if (typingNow) [...dots.children].forEach((d, k2) => { d.style.transform = `translateY(${-Math.abs(Math.sin(T * 7 - k2 * 0.8)) * 14}px)`; d.style.opacity = 0.45 + 0.55 * Math.abs(Math.sin(T * 7 - k2 * 0.8)); });
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
#notch { z-index: 6; }
#phRig { position: absolute; left: -330px; top: -640px; width: 660px; height: 1280px; transform-origin: 50% 60%; }
#phLock { position: absolute; inset: 0; background: radial-gradient(circle at 20% 12%, rgba(255,190,140,0.75), rgba(255,190,140,0) 46%), radial-gradient(circle at 85% 70%, rgba(110,150,255,0.55), rgba(110,150,255,0) 50%), linear-gradient(170deg, #3a3f78 0%, #7a4f8e 52%, #d9775f 100%); }
#phLockTime { position: absolute; left: 0; right: 0; top: 150px; text-align: center; font-size: 150px; line-height: 1; color: #fff; font-weight: 700; text-shadow: 0 6px 24px rgba(0,0,0,0.28); }
#phBanner { position: absolute; left: 22px; top: 420px; width: 572px; height: 176px; display: flex; align-items: center; gap: 22px; padding: 0 26px; background: rgba(255,255,255,0.92); border: 4px solid #17171c; border-radius: 40px; box-shadow: 0 20px 44px rgba(0,0,0,0.38); opacity: 0; overflow: hidden; }
#phBPhoto { flex: none; width: 104px; height: 104px; border-radius: 50%; overflow: hidden; border: 4px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.25); } #phBPhoto svg { width: 100%; height: 100%; display: block; }
#phBText { display: flex; flex-direction: column; gap: 6px; min-width: 0; } #phBName { font-size: 36px; line-height: 1; color: #17171c; font-weight: 800; }
#phBPrev { font-size: 30px; line-height: 1.1; color: #3a3a46; font-weight: 600; white-space: nowrap; }
#phRipple { position: absolute; left: 76%; top: 50%; width: 120px; height: 120px; border-radius: 50%; background: rgba(23,23,28,0.35); opacity: 0; }
#phChat { position: absolute; inset: 0; background: linear-gradient(180deg, #fbf8f2 0%, #efe8dc 100%); opacity: 0; }
#phHeader { position: absolute; left: 0; right: 0; top: 0; height: 270px; background: rgba(255,255,255,0.75); border-bottom: 3px solid #e0d9cb; border-radius: 0 0 44px 44px; box-shadow: 0 10px 26px rgba(60,40,20,0.14); display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 10px; padding-bottom: 24px; }
#phPhoto { width: 120px; height: 120px; border-radius: 50%; overflow: hidden; border: 5px solid #fff; box-shadow: 0 6px 16px rgba(0,0,0,0.25); } #phPhoto svg { width: 100%; height: 100%; display: block; }
#phName { font-size: 38px; line-height: 1; color: #17171c; font-weight: 800; }
#phHome { position: absolute; left: 50%; bottom: 22px; width: 200px; height: 8px; margin-left: -100px; border-radius: 4px; background: rgba(23,23,28,0.35); }
#phHandBack, #phThumb { position: absolute; left: 0; top: 0; width: 660px; height: 1280px; overflow: visible; pointer-events: none; }
#phThread { position: absolute; left: 36px; right: 36px; top: 310px; display: flex; flex-direction: column; gap: 22px; }
.phB { display: none; align-self: flex-start; max-width: 480px; padding: 26px 34px; background: #fff; border: 4px solid #17171c; border-radius: 40px 40px 40px 10px; font-size: 50px; font-weight: 700; color: #17171c; line-height: 1.12; box-shadow: 0 10px 22px rgba(60,40,20,0.2); }
.phB.me { align-self: flex-end; background: #17171c; color: #fff; border-radius: 40px 40px 10px 40px; }
.phDots { display: none; gap: 14px; align-items: center; height: 50px; padding: 0 6px; } .phDots i { width: 20px; height: 20px; border-radius: 50%; background: #9a9486; display: block; } .phB.me .phDots i { background: #fff; }
.mgI { position: absolute; inset: 0; opacity: 0; overflow: hidden; }
.mgBg { position: absolute; inset: 0; background-size: 100% 100%, 110px 110px; backdrop-filter: blur(10px); }
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
  bgStyle(o.nmBg, T, "rgba(20,30,60,0.42)", "rgba(120,160,255,0.25)", "rgba(255,255,255,0.10)");
  const u = clamp01((T - N.raceAt) / (N.landAt - N.raceAt)), e = (1 - Math.pow(1 - u, 4)) * (u < 0.15 ? (u / 0.15) ** 2 * (3 - 2 * u / 0.15) : 1), v = N.from + (N.to - N.from) * e;
  const em = (n) => fmt(n).split("").reduce((w, c) => w + (c === "," ? 0.3 : 0.6), 0), w0 = em(N.from), w1 = em(N.to), lz = T - N.landAt;
  o.nmDigits.style.minWidth = (w0 + (w1 - w0) * easeInOut(lz / 0.3)) + "em"; o.nmDigits.style.justifyContent = "flex-end";   /* digits are right-aligned in a box that starts as wide as the first number, so a digit dropping off moves nothing; the box narrows after the landing */
  o.nmDigits.innerHTML = fmt(v).split("").map((c) => `<b class="${c === "," ? "c" : ""}">${c}</b>`).join("");
  o.nmDigits.style.color = `rgb(${Math.round(23 + (216 - 23) * e)},${Math.round(23 + (54 - 23) * e)},${Math.round(28 + (58 - 28) * e)})`;
  const landed = T - N.landAt, k = landed >= 0 ? back(landed / 0.3) : 0, pop = landed >= 0 && landed < 0.3 ? 1 + 0.08 * Math.sin(Math.PI * landed / 0.3) : 1;   /* a swell and back, not a one-frame pop */
  const shake = landed >= 0 ? Math.sin(landed * 60) * 9 * Math.exp(-landed * 9) : (u > 0 && u < 1 ? Math.sin(T * 70) * 3 * (1 - u) : 0);
  const en = back((T - N.t0) / 0.3), drift = 1 + 0.025 * Math.sin((T - N.t0) * 1.6);
  o.nmCard.style.transform = `translateX(${shake}px) scale(${(0.7 + 0.3 * en) * pop * drift}) rotate(${Math.sin(T * 1.2) * 0.7}deg)`;
  o.nmIcon.style.display = "inline-block"; o.nmIcon.style.transform = `rotate(${Math.sin(T * 2.2) * 6 + (1 - e) * u * 180}deg)`;
  o.nmPill.textContent = "−" + fmt(N.from - N.to);
  o.nmPill.style.opacity = clamp01(landed / 0.15);
  o.nmPill.style.transform = `translateX(-50%) scale(${0.4 + 0.6 * k}) rotate(${(1 - k) * -10 + Math.sin(T * 2) * 1.2}deg)`;
}

/* me: { t0, t1, damage: [d0, d1] (0..1, eased across t0..t1), cycle?: seconds per event (0.7), costs?: [4 strings] }
   the four event thumbnails slide and pulse in turn behind the portrait card, each with a cost chip. */
export function applyMe(o, T, M) {
  const on = M && T >= M.t0 && T < M.t1; o.me.style.opacity = on ? 1 : 0; if (!on) return;
  bgStyle(o.meBg, T, "rgba(40,24,64,0.26)", "rgba(255,150,120,0.22)", "rgba(255,255,255,0.08)");
  const u = clamp01((T - M.t0) / (M.t1 - M.t0)), d = M.damage[0] + (M.damage[1] - M.damage[0]) * easeInOut(u);
  o.marks.forEach((g) => { const th = +g.dataset.th, a = clamp01((d - th) / 0.07); g.style.opacity = a; g.style.transformBox = "fill-box"; g.style.transformOrigin = "center"; g.style.transform = a > 0 && a < 1 ? `scale(${1 + 0.15 * (1 - a)})` : "none"; });
  const en = back2((T - M.t0) / 0.5), flo = Math.sin((T - M.t0) * 1.5);
  o.meCard.style.transform = `translateY(${(1 - en) * 60 + flo * 10}px) rotate(${Math.sin((T - M.t0) * 1.1) * 1.4 - 1}deg) scale(${(0.9 + 0.1 * en) * (1 + 0.012 * flo)})`;
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
  bgStyle(o.caBg, T, "rgba(30,90,76,0.40)", "rgba(255,240,170,0.25)", "rgba(255,255,255,0.09)");
  const en = C.flip ? 1 : back2((T - C.t0) / 0.5), dd = C.drawDur || 0.5, at = C.drawAt ?? C.t0 + 0.6, dr = easeInOut((T - at) / dd);
  const fl = C.flip ? Math.sin(Math.PI * clamp01((T - C.t0) / 0.3)) : 0;                      /* a flip: the leaf dips and returns over 0.3 s (the card does not re-enter) */
  o.caPath.setAttribute("stroke-dasharray", "1 1"); o.caPath.setAttribute("stroke-dashoffset", (1 - dr).toFixed(4));
  const sway = Math.sin((T - (C.phase0 ?? C.t0)) * 1.3), pulse = T > at + dd ? 1 + 0.025 * Math.sin((T - at - dd) * 7) : 1;
  o.caWrap.style.transform = `translateY(${(1 - en) * 70 + sway * 8}px) rotate(${sway * 1.1}deg) scale(${(0.85 + 0.15 * en) * (1 + 0.015 * Math.sin((T - (C.phase0 ?? C.t0)) * 1.7))}, ${(0.85 + 0.15 * en) * (1 + 0.015 * Math.sin((T - (C.phase0 ?? C.t0)) * 1.7)) * (1 - 0.3 * fl)})`;
  o.caWord.style.transform = `scale(${pulse})`;
}

/* end card: { t0, t1 } "PART 2" slams in, the line settles under it, an arrow bobs. Always moving. */
export function applyEndCard(o, T, E) {
  const on = E && T >= E.t0 && T < E.t1; o.en.style.opacity = on ? 1 : 0; if (!on) return;
  const dt = T - E.t0;
  bgStyle(o.enBg, T, "rgba(16,16,22,0.5)", "rgba(255,216,74,0.18)", "rgba(255,255,255,0.07)");
  o.enRays.style.backgroundImage = "conic-gradient(from " + (dt * 14) + "deg at 50% 46%, rgba(255,216,74,0.16) 0 10deg, rgba(0,0,0,0) 10deg 30deg)"; o.enRays.style.backgroundSize = "auto"; o.enRays.style.backgroundPosition = "0 0";
  const k = back(dt / 0.34), slam = dt < 0.34 ? 1 : 1 + 0.03 * Math.sin((dt - 0.34) * 2.4);
  o.enCard.style.transform = `scale(${(2.4 - 1.4 * k) * slam}) rotate(${(1 - k) * -9 + Math.sin(dt * 1.4) * 1.2}deg)`; o.enCard.style.opacity = clamp01(dt / 0.06);
  const s = back((dt - 0.5) / 0.4);
  o.enSub.style.transform = `translateX(-50%) translateY(${(1 - s) * 90 + Math.sin(dt * 2) * 4}px)`; o.enSub.style.opacity = clamp01((dt - 0.5) / 0.1);
  o.enArr.style.transform = `translateY(${Math.abs(Math.sin(dt * 4)) * 26}px)`; o.enArr.style.opacity = clamp01((dt - 0.9) / 0.2);
}
