# Console

**id:** `console` · **register:** UI · **status:** draft, unrendered
**fps:** 30 — clocks and readouts tick continuously, so smooth sub-second motion matters · **frame:** 1080×1920 · **render cost:** not measured; expected close to Grid

## 1. Essence
A mission-control screen watching the premise happen, with a clock that never stops.

## 2. Use it for / do not use it for
- **For:** The What-If at world scale ("what if north became south"), countdowns, anything with a
  resource running out. The stake is always visible as a number.
- **Not for:** warmth, comedy, or anything intimate.

## 3. Palette
| Role | Hex ⚠ |
|---|---|
| Background | `#0B0F10` |
| Panel | `#12181A` |
| Line / frame | `#2A3336` |
| Text | `#E6ECEC` |
| Dim text | `#7C8A8D` |
| Alert | `#E5383B` |

**Rule:** the screen is monochrome until something goes wrong. Alert marks **status changes
only** — a value leaving its normal range. If everything is red, nothing is.

## 4. Type
- Readouts: a light, wide grotesque for big values (Inter — OFL), 64–140 px.
- Labels and status pills: monospace caps, 16–20 px (JetBrains Mono — OFL).
- Every panel has a header row: `ID · NAME` left, status pill right.

## 5. Layout
A 2×2 panel block in the upper 45% of the frame. Below it, a wide "subject" area for one diagram.
Captions under that, above the bottom safe band. Panels have 1 px frames and 12 px gutters ⚠.

## 6. Scene vocabulary
| Scene | Shows | Parameters |
|---|---|---|
| `clock` | Mission timer `T+ 00:00:00.00` running | start, rate |
| `readout` | One large value with unit and status | value, unit, status |
| `map` | World outline with marked points | points[], highlight |
| `gauge` | Dial or compass turning to a value | from, to, label |
| `feed` | A framed "camera" view of a simple diagram | subject, overlay_text |
| `log` | Lines of status text arriving one by one | lines[] |
| `meter` | A bar depleting — battery, air, time | from, to, label |
| `choice` | Two option panels, A and B | question, a, b |

Several panels are on screen at once; the timeline says which one is *active*. Only the active
panel changes dramatically — the others keep ticking quietly.

## 7. Motion
- **Nothing is ever fully still**: the clock runs, a cursor blinks, a scanline drifts. This is
  the look's built-in answer to dead frames — and it must be real motion, not a smear.
- Values **count** to their target; they never jump, except on an alert, where they snap.
- Status pill changes are instant, with a single-frame flash.
- Scene changes are a panel swap, not a full-screen cut — the 2×2 block persists all film.

## 8. Captions
**Phrase + highlight.** One line, centred under the panels, sentence case, Text colour. The
emphasis word takes Alert colour only if it names the thing going wrong; otherwise bold.

## 9. People and places
No characters. People, if needed, are outline pictograms inside a `feed` panel.

## 10. Sound
Bed: low drone with a slow pulse. Effects: UI ticks on counting values, a two-tone alert on a
status change, a soft relay click on a panel swap. The stake meter may raise the pulse rate as it
falls.

## 11. Never
Neon glow · glitch effects · fake code scrolling · more than one alert at once · illegible
"greeble" text — every label must say something true about the story · lens flares · 3D tilt.

## 12. Self-check
- Does every label mean something? Delete any that is decoration.
- Is the stake readable at phone size in under a second?
- Is the clock value consistent with the story time in the narration?
- **Motion check:** whole-frame freeze detection will pass trivially because of the clock — so it
  proves nothing here. Verify instead that the *active* panel has an event at least once per
  spoken line.

## 13. Sample script
> "What if the Earth's magnetic field flipped tonight? Compasses point south. In four minutes,
> every migrating bird is lost."

## 14. Provenance
Generic control-room and HUD conventions. Informed by one public preview frame and by the
diegetic-screen finding in `docs/STORY_REEL_FINDINGS.md`. **Written by us.** Fonts: OFL.
