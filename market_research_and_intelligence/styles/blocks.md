# Blocks

**id:** `blocks` · **register:** 3D · **status:** draft, unrendered
**fps:** 30 for drafts — cuts every ~1.7 s hide judder, and 60 doubles an already slow render · **frame:** 1080×1920 · **render cost:** ⚠ not measured for this look. Our own 3D film takes ~2m40s per 35 s at 30 fps; expect similar or worse, with no GPU

## 1. Essence
A toy-box world of box-shaped people with drawn-on faces, having a very strange day.

## 2. Use it for / do not use it for
- **For:** The Rule ("every time I sneeze, I teleport"), any story about one person and a
  consequence. This is the look of the user's reference reel.
- **Not for:** data, anything that needs fine hands, anything subtle.

## 3. Palette
Bright, flat, daylight. ⚠ Starting values:

| Role | Hex |
|---|---|
| Sky | `#8EC5F5` |
| Ground / grass | `#6FBF5A` |
| Interior wall | `#F1E3C4` |
| Skin tones | a set of 5, as data in the cast record |
| Clothing | saturated primaries, one dominant colour per character |

**Rule:** each character owns one colour for the whole series. The lead's colour appears nowhere
else in a scene.

## 4. Type
Only captions and signs. Signs in the world are short, bold, and legible — a real word, or none.

## 5. Layout
The lead's face sits in the **upper-middle third**; captions occupy the lower-middle third and
must never cover a face. Camera at chest height, slightly above eye line for comedy.

## 6. Scene vocabulary
| Scene | Shows | Parameters |
|---|---|---|
| `meet` | Medium shot, lead facing camera in their home set | character, set, expression |
| `close` | Face fills the frame — the reaction shot | character, expression |
| `two` | Two characters facing each other | a, b, set |
| `wide` | The whole set, lead small in it | set, character, action |
| `effect` | The rule firing — pop, launch, vanish, spin | character, effect |
| `crowd` | Many simple figures reacting | set, count, expression |
| `insert` | One object, large | prop |
| `choice` | Lead between two doors or two objects | a, b |

## 7. Motion
- **Cuts, constantly.** Median shot ~1.7 s, measured on the reference reel. This look is an edit,
  not a camera move — the opposite of our continuous-camera films.
- Inside a shot the camera always drifts a little: slow push-in or sideways creep.
- Characters move in **poses**, not smooth acting: snap to a pose, hold with a small bob, snap to
  the next. Arms swing from the shoulder as rigid blocks.
- The rule's effect is fast and big — a few frames — then a hold on the reaction.

## 8. Captions
**Punch.** One word at a time, centred, caps, heavy rounded sans (Poppins ExtraBold — OFL),
white with a thick dark outline, ~130 px ⚠. Swapped on the spoken word, with a small scale pop.

## 9. People and places
**Characters** — built from primitives, stored as data:
`{skin, hair_shape, hair_colour, top_colour, top_pattern, bottom_colour, accessory}`.
Head is a rounded box, larger than realistic. Torso, arms and legs are boxes.

**Faces are drawn, not modelled** — a small 2D texture generated from parameters and placed on
the head. An expression is a row in a table:

| Expression | Brows | Eyes | Mouth |
|---|---|---|---|
| neutral | flat | dots | short line |
| happy | raised | closed arcs | open smile |
| shock | high | wide rings | small "o" |
| annoyed | angled in | half-lidded | flat, off-centre |
| sleepy / yawn | low | closed arcs | tall oval |
| smug | one raised | one winking | curved to one side |
| scared | tilted up | wide, small pupils | wavy line |

Changing expression is swapping the texture on a word. This is how the look acts without a rig —
and it is the direct fix for the "two flat discs on a sphere" face problem on our zombie film.

**Hands:** a box mitten. Enough to hold, point and wave.

**Sets** — parametric boxes: `home_exterior`, `bedroom`, `classroom`, `shop_aisle`, `cinema`,
`street`, `office`. Each is a floor, 2–3 walls, and 5–10 props built from primitives.

## 10. Sound
Bed: light, bouncy, constant — a flat wall under wall-to-wall narration. Effects: a pop or boing
on the rule firing, whooshes on only the biggest cuts, one comic sting per episode at most.

## 11. Never
Any real game's or toy's characters, logos, textures or proportions copied — this is a generic
blocky look, not a recreation of a specific product · realistic skin or faces · smooth
motion-captured acting · dark moody lighting · a caption over a face · a shot held longer than
one line · an empty set (dress it or go closer).

## 12. Self-check
- At phone size, can you read the face's expression in half a second?
- Is the lead bigger than a third of the frame height in every non-wide shot?
- Is anything floating, intersecting, or lit through a wall? (All three have happened on our 3D film.)
- Measure exposure, do not eyeball it — three lighting judgements made by eye here were later
  measured wrong.
- **Motion check:** whole-frame freeze detection works for this look.

## 13. Sample script
> "Meet Sam. Every time Sam says no… he bounces. Today, his boss asked him to work Saturday."

## 14. Provenance
The generic low-poly "blocky avatar" register, common across many games and toys. Informed by the
user's reference reel and public preview frames. **Written by us.** No asset packs are assumed;
everything above is buildable from primitives. Font: OFL.
