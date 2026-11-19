# reel-01 — "an agent is a loop, not a chatbot"

The first reel in the series, and the reference implementation of the house style.

**Styles used:** `swiss-motion` (lemo-opuscar / LemoLab, **CC BY-NC 4.0**).
**This film is non-commercial and carries an attribution obligation.** It is not commercially
clean. [ADR 0011](../../decisions/0011-use-lemo-opuscar-styles-non-commercially.md),
[ADR 0012](../../decisions/0012-swiss-motion-as-the-house-style.md).

## What it is

| | |
|---|---|
| Format | 1080×1920, 24 fps, 20.0s |
| Tempo | 120 BPM — 1/4 = 12f, 1/8 = 6f, 1/16 = 3f, all whole frames |
| Grid | 6 columns, 72px margins, 24px gutters, 24px baseline |
| Colour | page `#eae9e5`, ink `#111111`, greys, **one** signal `#ff5a00` |
| Type | Archivo (OFL), one family |
| Audio | **None.** Blocked on VoiceStudio |
| Render | ~60s |

**One idea:** a chatbot finishes; an agent returns. The difference is one arrow.
**The system:** a row is one turn of the machine.
**The exception:** the return arrow — the only saturated thing, the only unsnapped move, and the
subject of the film.

## Structure

Per [`docs/REEL_STRUCTURE.md`](../../docs/REEL_STRUCTURE.md).

| Section | Time | On screen |
|---|---|---|
| Hook | 0–3s | "most “agents” are just chatbots." — a claim the film then cuts |
| Knife cut | 3–3.4s | The claim is deleted, not faded |
| Turn | 4–5.5s | "the difference is one arrow." |
| Meat | 6–15.75s | "two shapes." → ONE TURN (prompt → reply → stop) vs A LOOP (plan/act/observe) |
| The exception | 12–15.75s | The orange circuit draws, then a pulse runs it once per bar — it keeps going |
| Landing | 16–18s | "a loop, not a reply." giant, flush left |
| CTA | 18–20s | "build the loop." |

## Take record

Newest last. **`renders/` is gitignored** — the files are local.

| Take | Change | Measured |
|---|---|---|
| `11-28-20` | First render, 23s | M1 @0.4s: 12 intervals, 76%. Worst **5.29s** — a real dead patch between the bars landing and the loop starting |
| `13-02-49` | Timeline tightened 23s → 20s | Worst idle 5.29s → **2.92s**. 12 intervals → 1 |
| `13-05-05` | Loop now *loops*: path draws in one bar, then a pulse runs the circuit | 2.92s → **2.04s** |
| `13-06-41` | Loop starts half a bar earlier, path at full weight | **Regressed to 2.83s** — I had made the path the same weight *and* colour as the pulse, so the pulse drew invisibly on top of itself |
| `13-08-21` | Path 8px, pulse 22px — visibly different weights | **2.38s**, and the pulse confirmed visible in snapshots at 13.4s and 13.9s |

**Final state, stated honestly:**

| Check | Result |
|---|---|
| X1 format | ✅ 1080×1920 @ 24fps h264 |
| X2 duration | ✅ 20.00s, on target |
| X3 black frames | ✅ 0 |
| M4 continuous | ✅ 0 scene changes |
| **M1 dead frames** | **Not applicable — instrument mismatch.** Not a pass |
| A1 / A5 audio | Skipped — the film is silent |

M1 reports 72% motionless at the default 0.4s and a 2.4s interval at 2.0s. Both numbers span
seconds in which the orange pulse is demonstrably moving. `filmcheck` measures **whole-frame**
change and cannot see a small element on a large still page. The reason, and the fix that is not
yet built, are in [ADR 0012](../../decisions/0012-swiss-motion-as-the-house-style.md).

**So this reel has not passed a complete gate, and must not be described as if it had.**

## What is wrong with it — by looking, which is the only method that has worked

1. **Silent.** The style's grammar is beat-locked and there is no music, so every snap lands on a
   beat nobody can hear. This is the biggest single gap.
2. **Hook is a claim, not an image.** "most agents are just chatbots" is text doing the work.
   swiss-motion's strongest hook device is the exception itself — the grid snapping in with one
   element already off it. Worth trying in reel-02.
3. **A lot of empty page.** Defensible in this style, and still the frames read emptier than the
   reference demos.
4. **The CTA is weak.** "build the loop." is not an ask, it is a slogan. REEL_STRUCTURE says the
   CTA must be the natural next step of the idea.
5. **No captions**, which the series needs for muted viewing. Blocked with narration.

## Reproduce

```bash
cd films/reel-01-agent-loop
npx --yes hyperframes@0.9.39 snapshot --at "2.8,9,13.9,18"
npx --yes hyperframes@0.9.39 render
```

```bash
python tools/filmcheck/filmcheck.py films/reel-01-agent-loop/renders/<file>.mp4 --expect-vertical --allow-cuts 0 --target-duration 20 --no-audio-checks
```

Comma-separate `--at`; repeating the flag keeps only the last value.
