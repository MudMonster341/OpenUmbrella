# zombie-p1 — "The Ration"

Part 1 of the zombie series. Brief and the six reads: [BRIEF.md](BRIEF.md).

## Styles used

**None.** No lemo-opuscar style, no third-party style pack, no vendored visual asset is used in
this film. Every mesh, material and light is authored in [index.html](index.html).

Per [ADR 0011](../../decisions/0011-use-lemo-opuscar-styles-non-commercially.md) and ROADMAP D3,
an empty list means **this film is commercially clean**. If any external style is added later it
must be named here, with its licence, before the next render.

## Status

| | |
|---|---|
| Passes filmcheck | **Yes**, 2026-11-13 — `renders/zombie-p1_2026-11-13_11-02-29.mp4` |
| Format | 1080×1920, 30fps, h264, 35.23s, 14.9 MB |
| Audio | **None.** Blocked on VoiceStudio setup |
| Gate reached | 3 (silent cut). Gates 4 and 5 need audio |

```bash
python tools/filmcheck/filmcheck.py films/zombie-p1/renders/zombie-p1_2026-11-13_11-02-29.mp4 --expect-vertical --allow-cuts 0 --target-duration 35 --no-audio-checks
```

`X1 ok · X2 ok 35.23s · X3 ok 0 black · M1 ok 0% motionless · M4 ok 0 cuts · exit 0`

## Render

```bash
npm run check          # lint + runtime + layout + motion
node sync.mjs          # re-copy engine/onecam/*.js into lib/ (ROADMAP D6)
npm run render         # 30fps draft, motion blur off, ~3 min
```

```bash
npx hyperframes render --fps 60 --variables '{"mbSamples":4,"mbShutter":0.00833}' -o renders/final60.mp4
```

`mbShutter` is the shutter open time **in seconds**, not a frame fraction, because the composition
cannot see the `--fps` the CLI was given. A 180° shutter is `1 / (2 * fps)`.

**Judge a render by whether the output file exists, never by the exit code** —
[ERR-0004](../../ERRORS.md) ships a render that writes nothing and exits 0.

## Staging log — every defect here was found by looking at frames

The automated gate found none of these. It cannot: all of them are framing and exposure.

| # | Defect | Fix |
|---|---|---|
| 1–5 | Camera flew through furniture; the practical sat on the camera-to-subject axis and bloomed the frame out; the READ 5 close-up pointed at the back of Claude's head | Camera moved onto an arc outside the props; lamp moved off-axis; base facing changed −2.0 → −1.45 |
| 6 | **Shelf beat 97.9% black** — both filmcheck failures (M1 *and* X3) were this one beat, looking into the corner 3.65 m from the only light | Shelf **moved**, not lit harder: a free-standing unit 1.8 m out. See below |
| 7 | **Lamp had never run at its stated intensity** | [ERR-0005](../../ERRORS.md). `lamp.intensity = 9.5 * fl` in the per-frame function overrode `LAMP_CD = 34` every frame since the first commit |
| 8 | Whole film mis-exposed once the lamp ran correctly — table a flat white sheet, no label detail | Lamp **hung** at y=1.55. At 0.17 m above the table it was a 170:1 range in one scene; now ~8:1 |
| 9 | Shelf planks read **blue** in a warm one-practical room | Moon shadow camera was ±3 in a room spanning ±4.2, so x=3.6 fell outside the frustum and three.js returned "lit" — cold light through a solid wall |
| 10 | **READ 4 contained no people.** Framing covered x −0.33..0.63 with the figures at ∓0.78, so the can slid across an empty table by itself | Re-framed onto the receiving side: the human's arm holds frame left |
| 11 | **READ 5 was the back of Claude's head** — the beat the brief calls "the film" | Head yawed −0.5 rad on top of −1.45 base facing, 25° past the human. Yaw now stops at the human; the pitch lift carries the glance |
| 12 | Claude **washed to a white mask** in close-up | Albedo 0xe08a63 → 0x8a4a33. #d97757 is what he must *look* like on screen, not his raw reflectance 1 m from the key |

### Why the shelf beat is a free-standing unit now

Four things were wrong and **none of them was the light level**:

1. **Distance.** Irradiance is `I/r²`. A corner 3.65 m from the practical gets ~1/18th the light
   of the table. Scaling the lamp scales both together — it cannot change that ratio.
2. **Scale.** Cans 3.5 m out at fov 42 were ~63 px wide. READ 3 is *"it is countable"*; 63 px is a
   texture, not a count. Now ~160 px.
3. **Emptiness needs a container.** Three cans on a 1.7 m plank reads as "we can't see the food".
   A small, visibly part-empty unit reads as "there is almost no food" — which is the read.
4. **No parallax.** Shelf and back wall were both ~3.5 m out, so the camera's lateral drift moved
   them by the same amount and the frame did not change. That was the other half of M1.

### Exposure, measured

Tuned by measurement, not by eye — three lighting judgements made by eye in this project were
later measured wrong. Snapshot every beat, push each PNG through `ffmpeg -vf format=gray`, report
mean luma and percent-under-threshold.

| | Before | After |
|---|---|---|
| YAVG spread across the film | 5.37× | **2.24×** |
| Clipped pixels | present on the hands beat | **0.0% on every frame** |
| Shelf-beat pixels under 10% luma | 97.9% | **66.8%** (blackdetect fires at 98%) |

## Known defects — the gate does not measure these

- **Claude's face is two flat dark discs on a sphere.** No brow, no mouth, no expression. READ 5
  is the whole film and the reaction does not land. This is the single biggest remaining problem.
- **The figures have no hands.** READ 4 is about dividing food and the arms end in a stump.
- **No audio.** No narration, no room tone, no SFX. Blocked on VoiceStudio setup.
- The 60fps motion-blur final's render cost is not yet measured (ROADMAP D8).
