# Grid

**id:** `grid` · **register:** flat 2D · **status:** draft, unrendered
**fps:** 24 — durations are musical note values; at 120 BPM every subdivision is a whole frame at 24, and falls between frames at 30 (found on reel-01) · **frame:** 1080×1920 · **render cost:** ~3 s per second of film, measured on `films/reel-01-agent-loop`

## 1. Essence
A calm printed page that explains one thing with bars, numbers and a single red mark.

## 2. Use it for / do not use it for
- **For:** The Doubling, comparisons, "X is bigger than Y", anything whose picture is a quantity.
- **Not for:** stories about a person. There are no characters and it cannot show a feeling.

## 3. Palette
| Role | Hex ⚠ |
|---|---|
| Paper | `#EFEAE0` |
| Ink | `#141414` |
| Signal | `#E63A12` |
| Ghost (unspoken words, rules, ticks) | `#B9B3A6` |

**Rule:** paper and ink carry everything. Signal appears on **one element at a time** and always
means the same thing in a film — "the thing that is changing". Never decorative.

## 4. Type
- Headline: a neutral grotesque, bold, tight tracking (Inter Tight — OFL). 72–96 px.
- Labels: a monospace in small caps, wide tracking (JetBrains Mono — OFL). 20–24 px.
- Numbers: the headline family, tabular figures, up to 220 px.
- Flush left. Never centred, never justified. **≤ 9 words on screen** outside captions.

## 5. Layout
12-column grid, 64 px margins ⚠. Question or claim pinned top-left. Working area in the middle
60%. Captions on a fixed baseline in the lower third, above the bottom 20% safe band.

## 6. Scene vocabulary
| Scene | Shows | Parameters |
|---|---|---|
| `claim` | One sentence, large | text |
| `bars` | 2–4 labelled horizontal bars growing to value | items[{label, value}], unit |
| `counter` | One number ticking to a target | from, to, label |
| `ruler` | A scale with a marker travelling along it | min, max, at, label |
| `disc` | A circle whose size or orbit is the quantity | radius, ring |
| `versus` | Two values and a `>` / `<` / `=` between them | a, b, relation |
| `stack` | Unit squares accumulating on the grid | count, per_row |
| `ask` | The closing question, two options flush left | question, a, b |

## 7. Motion
- Things **snap or wipe**; they do not fade, bounce or overshoot.
- Bars and counters move with one ease-out curve; duration scales with distance travelled.
- A cut is a hard cut on a beat. No crossfades.
- **Every element has an explicit exit time.** On reel-01, text placed by start time alone was
  still on screen 15 seconds later.
- Holds are allowed and are part of the look — but never longer than one spoken line.

## 8. Captions
**Karaoke fill.** The full sentence sits on the caption baseline in Ghost; each word turns Ink as
it is spoken. The script's emphasis word turns Signal instead. Two lines maximum.

## 9. People and places
None.

## 10. Sound
Bed: sparse, dry, steady pulse. Effects: a soft tick per counter step, a low thud when a bar
lands, one clean tone on the emphasis word. For narrated story formats the bed stays level under
the voice — the dynamic drops this look traditionally uses belong to un-narrated design reels.

## 11. Never
Gradients · shadows · glow · rounded cards · icons or emoji · more than one signal element ·
centred text · fades · springs · a third typeface · text in the corners · a number without its unit.

## 12. Self-check
- Is exactly one thing red?
- Can the frame be understood with the sound off?
- Does everything sit on a column line?
- **Motion check:** whole-frame freeze detection cannot see a small element moving on a still
  page (found on reel-01). Verify by asserting over the timeline that no gap between visual
  events exceeds one spoken line.

## 13. Sample script
> "What if one grain of rice doubled every day? Day ten: a handful. Day thirty: more than the
> world grows in a year."

## 14. Provenance
The International Typographic Style — a mid-century design tradition, nobody's property. Informed
by our own reel-01 and by looking at one public preview frame set. **Written by us**; this
document does not derive from lemo-opuscar's `swiss-motion` text, which is CC BY-NC and was the
basis of reel-01 itself. Fonts: OFL.
