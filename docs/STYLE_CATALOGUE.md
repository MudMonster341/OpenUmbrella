# Style catalogue — every lemo-opuscar style, with its own words

**Built 2026-11-13** by reading `external_tools/motion/lemo-opuscar/styles/*/STYLE.md`. Each
essence line is **quoted from that style's own spec**, so this file stays true when upstream changes.
Regenerate rather than hand-edit.

**99 styles have a `STYLE.md`.** The project advertises 101; the difference is `_template/` and the
styles index. Flagging it rather than repeating the headline number.

> ### Licence — applies to every row
> The style specs are **CC BY-NC 4.0** (`REUSE.toml` maps `**.md`); lemo-opuscar's *code* is MIT.
> **Any film built to one of these styles is non-commercial and requires attribution** to
> lemomo-ai/lemo-opuscar. [ADR 0011](../decisions/0011-use-lemo-opuscar-styles-non-commercially.md).
> This is **not** "open source" and must never be described that way. Every film README lists the
> styles it used; an empty list means commercially clean.

## What this file does and does not tell you

It tells you, accurately, **what each style is**, in its author's words.

It does **not** rank them for our use. I tried twice to score all 99 automatically — once by hand-listing
which ones need assets, once by keyword-scanning the specs — and **both produced results I could not
defend** (the second put swiss-motion, our own house style, outside its own category). Rating a style
for a 20–40s vertical reel on an iGPU means reading its `STYLE.md` and `DEMO.md`, which is a real task
per style, not a guess. So the only rated entries below are ones that have actually been read.

The **asset signal** column is a heuristic, shown as raw evidence, not a verdict: how many times the
spec uses footage/photography words and hand-made-artwork words. High numbers mean *go and read it
before planning a reel* — the style probably needs material we do not have (no stock footage, no
illustrator, no GPU).

## Read so far

| Style | Verdict | Why |
|---|---|---|
| **`swiss-motion`** | **In use — house style** | [ADR 0012](../decisions/0012-swiss-motion-as-the-house-style.md). A system plus one exception, a written method for adapting any topic, flat 2D so it renders in ~60s, text-forward so hooks and CTAs are native, and a grammar precise enough to gate. First reel: `films/reel-01-agent-loop` |

Everything else below is **unread**. To adopt one: read its two specs, write an ADR superseding 0012,
and record the verdict here.

## To change the house style

1. Pick a candidate from the table and read `STYLE.md` **and** `DEMO.md` in full.
2. Check the two things that are invisible from the name and bit us on swiss-motion:
   **what frame rate its tempo divides into** (24 fps was forced by 120 BPM eighths), and
   **whether its grammar is holds or continuous motion** (holds break `filmcheck`'s M1 — see ADR 0012).
3. Write the ADR, superseding 0012. Record the verdict in the table above.
4. `films/reel-01-agent-loop/index.html` is the reference implementation; the grammar lives in the
   code, so a new style is a new engine, not a config flag. Budget it as such.

---

## All 99

`footage` and `hand` are raw keyword counts from each spec — evidence to act on, not a score.

| Style | Its own one-line essence | footage | hand |
|---|---|---|---|
| `archive-lighttable` | Real archive objects (glass negatives, slides, letters, telegrams, clippings, drawings) lie on a cool, backlit light table. A loupe comes down on one  | 31 | 1 |
| `art-deco` | Black lacquer, engraved gold line and airbrushed geometry: a 1930s poster that moves. Every composition has a centre axis, transitions open or close a | 0 | 1 |
| `ascii-crt` | Everything on screen is a real character on a monospace grid, lit by the phosphor of an old monochrome CRT. | 4 | 0 |
| `assembly-line-diagram` | A process explained as a factory cut open in elevation: a silhouette (a body, a machine, a building, a city) is sliced like a doll's house into rooms  | 0 | 1 |
| `backrooms` | Camcorder tapes recovered from empty, endless, fluorescent-lit spaces. Rules instead of monsters. | 3 | 0 |
| `bauhaus-shapes` | An explainer told only with circles, squares, triangles, arcs and straight lines, set in opaque colour on a light, matte paper. Every shape is a quant | 0 | 0 |
| `blueprint` | Engineering drawings that come alive on a sheet of cyanotype paper: white technical line work on Prussian blue, drawn in drafting order, with annotati | 0 | 1 |
| `brick-toy` | Stop-motion toy-brick films shot like macro photography on a real desk: a world built from interlocking plastic bricks with round studs, animated a po | 1 | 0 |
| `briefing-board` | One real whiteboard wall, filmed: window light on enamel, ghosts of erased marker, frame and tray. Cut-out photographs of real things land on it with  | 9 | 0 |
| `caption-news` | Social-video news that reads with the sound off. Real footage, photos and the source document are the ground; huge captions are the lead actor, slamme | 25 | 0 |
| `cel-anime-80s` | Hand-painted cel animation from the golden age of Japanese OVAs, re-created in code: flat two-tone cels over airbrushed backgrounds, backlit neon, lim | 0 | 12 |
| `chalkboard` | A real classroom blackboard on which chalk writes itself, stroke by stroke in true stroke order, with no hand, no chalk stick and no eraser in sight.  | 0 | 4 |
| `circuit-board` | The subject is drawn as a printed circuit board seen from straight above: the world is copper under green solder mask, routes are traces, places are p | 0 | 0 |
| `city-symphony` | A city film cut like a piece of minimalist music: time-lapse turns traffic, crowds and clouds into rivers of light, the cuts get denser with the score | 24 | 0 |
| `colored-pencil` | A real 3D cutaway world (ground, soil horizons, stones, buried structures, living things) redrawn every frame as a colored-pencil plate on toothed pap | 0 | 30 |
| `comic-history` | Countries are paper puppets joined with brass split pins, standing on a map printed on paper; whoever takes a piece of land cuts a scrap of paper and  | 0 | 1 |
| `countdown` | An edit style, not a look. Real footage of one event with a known zero (a launch, a verdict, a final whistle, polls closing), shown in real time: scre | 11 | 0 |
| `crayon-book` | A picture-book page drawn live in wax crayon on toothy paper, with a watercolour wash that reveals what the crayon was hiding. | 0 | 27 |
| `crayon-world` | A whole world built in 3D and redrawn in wax crayon, by a child's hand, twelve times a second, while a camera moves through it: real depth and paralla | 0 | 18 |
| `dark-documentary` | The world is black until a scan passes. A plane of light sweeps across terrain, machines and rooms; what it has touched lights up, then settles into e | 41 | 0 |
| `dark-keynote` | A software launch film where the interface itself is the star: near-black gradient, hairline grid, soft light, one brand accent, and UI that moves wit | 1 | 0 |
| `data-physical` | Real statistics built as real objects: every unit is a countable piece of material (a plate, a block, a coin, a bar) stacked to exact scale on a craft | 0 | 0 |
| `dataviz` | A chart that tells a story: real data, drawn mark by mark on cream paper by a red–blue pencil, with handwritten notes pinned to the numbers. The chart | 0 | 14 |
| `desktop-flythrough` | App screens and tools lie on a sunlit desk as printed paper cards; small pixel characters, popped up into voxel toys, carry the work from card to card | 1 | 0 |
| `double-exposure` | A silhouette is a window. A dark animal shape from the first exposure holds a second photograph, the place that animal carries with it, while the worl | 25 | 2 |
| `engraving` | An intaglio plate that engraves itself: a burin cuts swelling lines into copper, a proof is pulled, and the figure builds up — outline, hatching, cros | 0 | 7 |
| `firefly-pointillism` | Thousands of soft, breathing points of light on black make up the people, animals, grass, moon, rain and words. The points are never created or destro | 0 | 1 |
| `flat-space-explainer` | Solid flat shapes on a deep night-blue ground, each with one shade step and hard-edged ring "glows", drawn to true scale inside each frame, guided by  | 0 | 0 |
| `flow-field` | An invisible field — wind, current, traffic, any flow — made visible as thousands of thin ink streamlines engraved on warm paper, with darker strokes  | 0 | 1 |
| `game-show` | A rhythm-game variety show in flat vector: toy-like mascots with thick ink outlines on candy-coloured stripes and sunbursts, every hit landing on a fi | 1 | 2 |
| `gilded-illumination` | The whole frame is one gilded miniature painting, and the story happens inside it: flat mineral pigments inside firm ink outlines, white-lead highligh | 0 | 16 |
| `glass-product` | Launch-film product rendering in transparent and frosted glass: a dark-field studio, strip-light sweeps, dispersion, caustics, light travelling inside | 2 | 0 |
| `halftone-dossier` | A retro print case file: cream archive paper, overprinted halftone dots in a few flat inks, huge heavy headlines with misregistered shadows, rubber st | 0 | 2 |
| `hardcore-info` | A real-sized object, modelled in 3D and traced live into a black-line technical drawing on warm white paper: it turns, comes apart, is cut open and is | 0 | 0 |
| `hd-2d` | Hand-made pixel sprites standing like paper cut-outs inside a lit, fogged, fully 3D diorama, shot from a high three-quarter angle through a tilt-shift | 1 | 1 |
| `hologram-hud` | An object is scanned into a glowing wireframe. Target boxes lock onto its parts; each opens in a local exploded view, a leader pulls out, and its numb | 12 | 0 |
| `impasto` | Thick oil paint laid with a palette knife: big, flat, sharp-edged planes of colour, raked by light so every ridge of paint shows. Clarity first: value | 1 | 11 |
| `ink-wash` | Xieyi ink painting on rice paper, animated: blank paper is space, one brushstroke is a mountain, a wave, a gesture or a cut. | 0 | 18 |
| `instruction-manual` | The film is a printed assembly manual: one sheet of off-white paper, black line art in true isometric (45°), flat white parts, faceless people at real | 1 | 2 |
| `ipad-sketch` | The whole frame is a cream drawing canvas on a tablet, seen while someone draws and explains: grainy pencil lines go down first, flat colour blocks co | 0 | 18 |
| `iso-infographic` | A system diagram comes alive: an isometric diorama of flat three-tone blocks, thin ink labels and Isotype numbers, where things open up to show their  | 0 | 0 |
| `isometric-picture-book` | A calm explainer of an everyday rule, set in one real place drawn in true isometric with flat colour: small faceless people seen from behind do the th | 0 | 11 |
| `kino-montage` | Real archive footage, photographs and documents, printed as one ink-and-paper poster with a single red, and cut on a machine beat. Diagonal bands carr | 31 | 1 |
| `lidar-survey` | Real airborne laser points of a real place, floating in the dark as a measured cloud; a scan line or a cutting plane passes through them and the point | 16 | 0 |
| `living-screencast` | A product walkthrough that looks like a real screen recording, where a low-resolution mascot lives inside a high-resolution interface and acts out wha | 1 | 2 |
| `lowpoly-island` | A tiny faceted world seen through an orthographic isometric lens: everything is a geometric block, and everything that appears arrives with a bounce a | 2 | 0 |
| `manga-panels` | A black-and-white Japanese manga page that moves: G-pen ink, screentone dots, one spot colour, panels that open on the beat, sound effects slammed in  | 2 | 3 |
| `map-explainer` | Real elevation and real imagery built into a three-dimensional map with the vertical exaggerated, lit by one warm, low sun; a sea coloured by its real | 0 | 0 |
| `marker-paper` | A pad of matte white paper and one bullet-tip permanent marker in black, with a red and a blue marker for meaning only: blue is what we know, red is w | 2 | 0 |
| `memphis-diorama` | A place built as a tabletop model: on warm white paper an organic, grainy frame grows open, and inside it a small world in flat Memphis colours, ink o | 1 | 1 |
| `microgame` | A rapid-fire party-game film: one command word, a few seconds, one action. Every microgame is drawn in a completely different art style, and the film  | 1 | 9 |
| `microscope` | Real, licence-clean microscopy of a real specimen, seen as it is, and one continuous change of scale that carries the viewer from the glass slide in t | 15 | 0 |
| `midcentury-toon` | 1950s flat colour and limited animation for "follow along" films: colour printed a few pixels off its broken ink line, bodies that hold still while ha | 0 | 2 |
| `neon-tubes` | Real neon signs on a rainy night street: bent glass tubes filled with gas on painted boards, striking with a flicker, lighting the wet walls and doubl | 0 | 7 |
| `news-package` | A television newsroom's on-air package, built entirely in code: a sting that becomes the channel bug, a rundown of today's stories that opens and clos | 6 | 1 |
| `newsreel` | A sound newsreel of the late 1920s, cut from real archive material: a searchlight-and-globe ident with a brass fanfare, a newspaper that spins into th | 13 | 7 |
| `one-bit-dither` | A real 3D world shown with exactly two inks: every grey becomes a pattern of dots that is fixed to the surfaces, outlines come from depth and normal b | 14 | 2 |
| `one-line` | A single ink line that never leaves the paper. Everything on screen is that one line being drawn; scenes don't cut, they morph. | 0 | 4 |
| `oscilloscope-math` | Mathematics drawn by an electron beam on a phosphor screen: thin glowing green lines on near-black, a dotted graticule, monospace readouts and TeX for | 0 | 0 |
| `paper-lantern` | A layered paper-cut shadow box (纸雕灯) lit from behind: 6–9 sheets of cut card stacked in a shallow box, a warm light glowing through the paper, windows | 0 | 1 |
| `paper-popup` | A pop-up book on a real desk becomes a stage: flat cut-paper actors with white borders perform in front of paper sets that spring up from the page, un | 1 | 2 |
| `papercut-red` | Chinese window-flower paper-cuts brought to life: jointed red cut-outs on paper grounds, where the cut *is* the drawing and the holes are where the li | 0 | 0 |
| `pen-plotter` | A pen plotter on a desk draws the subject one stroke at a time: real pens, real ink on paper, real machine motion. Maps, charts and lettering appear a | 0 | 0 |
| `pictogram-motion` | A beat-locked film built from three things only: a **square-grid "core graphic"** of circles, half-discs and tiny patterned cells whose rows slide pas | 0 | 0 |
| `pip-simulation` | A crowd of small flocked characters, the Pips, runs a real simulation on a warm paper lab board: evolution, games, epidemics, queues, markets. The rul | 0 | 0 |
| `pixel-rpg` | A short film that looks, sounds and *behaves* like a mid-90s console role-playing game: 320×180 pixels, a limited indexed palette, text boxes that typ | 3 | 0 |
| `pop-art` | Sixties screen-print and pop-art poster language used to tell something: Ben-Day dots fixed to the paper, heavy black key lines, flat red, yellow and  | 2 | 0 |
| `precise-mechanism` | A real mechanism built in 3D and coloured like an anatomy plate: a pale ground, one flat colour per subsystem, the part being explained in a single ac | 0 | 0 |
| `printed-long-take` | A three-dimensional world rendered as a scratchboard print, ink and paper with one red, crossed by one unbroken camera move. Depth, weather and light  | 2 | 4 |
| `risograph` | Animation that looks printed, frame by frame, on a stencil duplicator: two or three translucent spot inks overprinted on warm paper, halftone dots, in | 0 | 1 |
| `rubber-hose` | Black-and-white hand-inked cartoons where every object is alive and swings to a hot jazz band. | 0 | 5 |
| `satellite-briefing` | Real satellite imagery of a real place, graded down to an analyst's grey, with thin white measurement lines drawn on the ground: a lock-on reticle, ou | 10 | 0 |
| `scifi-toon` | Adult-animation sci-fi sitcom: thick boiling outlines, flat colour, a duo whose reactions don't match, a glowing portal, and one palette per world. | 0 | 1 |
| `scratch-film` | Direct animation: every picture looks scratched through black emulsion with a needle and tinted with transparent dye, redrawn by hand fifteen times a  | 0 | 6 |
| `security-xray` | The film is seen through a baggage-screening console: objects are never shown, only their dual-energy X-ray image, where every material has its colour | 12 | 0 |
| `shadow-puppet` | Chinese shadow theatre: translucent dyed-hide puppets, carved like lace, pressed against a cotton screen and lit from behind by oil lamps. | 0 | 0 |
| `silent-film` | An engraved-illustration silent film projected in a picture house: ink line and silver wash, a 4:3 print that flickers and weaves between velvet curta | 5 | 2 |
| `silhouette-rhythm` | Pure black silhouettes against a saturated sunset, changing pose on every beat; on the key beat everything freezes and only the sky keeps moving. The  | 1 | 0 |
| `silkscreen-poster` | Opaque, hard-edged flat inks pulled one colour at a time through a screen: 4–6 inks per poster, stepped colour bands instead of gradients, thin paper- | 0 | 2 |
| `sketchnote` | One page of visual notes on dot-grid paper, drawn while you watch: a black fineliner writes and draws, a grey marker gives volume and shadow, one yell | 0 | 2 |
| `spreadsheet` | A whole film inside one spreadsheet window. Cells are the pixels, conditional formatting paints the pictures, the formula bar speaks the lines, and th | 0 | 5 |
| `spy-titles` | A cut-paper, four-ink opening title sequence for a film that never existed: silhouettes move through sets built out of the credits themselves, every b | 0 | 1 |
| `stained-glass` | A medieval stained-glass window seen from inside a dark stone hall, alive only where the sun touches it: light is the clock, the camera and the story. | 0 | 2 |
| `stick-explainer` | Plain stick people on warm paper, one accent colour, and a logic you can watch: people stand on a "system line", react to each other, and hold hands.  | 0 | 0 |
| **`swiss-motion`** | International Typographic Style in motion: a modular grid, one typeface, one signal colour, and movement as exact as a printing press. | 0 | 0 |
| `teardown` | A real product, built from its own engineering files (CAD, PCB layout, bill of materials), lit like a studio packshot and taken apart in front of the  | 1 | 1 |
| `telestrator` | The TV football analysis segment: play the clip at full speed, rewind, freeze it, and draw on the broadcast picture — rings under players' feet, marke | 14 | 2 |
| `text-flash-cuts` | Avant-garde TV anime in the manner of the early-2000s "text frame" school: full-screen heavy Mincho title cards cut in for two to nine frames, archite | 0 | 1 |
| `thermal-camera` | The film is seen through a radiometric thermal camera: a low-resolution, slightly noisy picture in an iron palette where brightness means temperature, | 13 | 0 |
| `tilt-shift` | A real-looking place photographed from high above with a tilted lens and a time-lapse camera, so the whole world reads as a tabletop model. | 2 | 1 |
| `transit-map` | A metro schematic printed on a physical sheet: lines held to eight directions, white stops, black-outlined interchange capsules, water as a flat blue  | 0 | 1 |
| `ukiyoe` | Edo-period woodblock prints brought to life: flat colour blocks, carved ink lines, bokashi skies, paper you can feel, and a camera that moves over the | 0 | 3 |
| `urban-sketch` | A sketchbook page drawn on location: fine sepia fineliner lines that wobble, overshoot and never quite close, with loose transparent watercolour dropp | 0 | 13 |
| `vintage-collage` | A magazine collage made on a paper table: public-domain engravings, stamps, old photographs and printed ephemera are cut out with a white paper margin | 6 | 15 |
| `visual-investigation` | A cold investigation desk: footage, photographs, documents, sound and maps from one real event, laid out on one shared clock so they check each other. | 24 | 2 |
| `watercolor` | A hand-painted journal page that paints itself: translucent brush strokes with dry-brush flying white on warm cotton paper, hand-written notes beside  | 0 | 36 |
| `white-model` | A pure white massing model of a real place stands on a plinth in a dark room, and a projector paints data onto it as light: one layer at a time, falli | 3 | 1 |
| `whiteboard` | An explainer drawn live on one glossy dry-erase board: single-line handwriting that is actually *written* stroke by stroke, floating markers with no h | 0 | 3 |
| `woodcut` | A relief print that carves itself: every frame is a black wood block, and light only exists where a knife has cut it away. One colour at most, and onl | 2 | 6 |
