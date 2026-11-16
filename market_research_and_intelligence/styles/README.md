# Style documents

**Started 2026-11-13.** Each file here is a **style written as a document an agent can build
from** — the same kind of thing flashloop, ReelStyles and the others ship, authored by us.

| File | Look | Status |
|---|---|---|
| [_TEMPLATE.md](_TEMPLATE.md) | The blank every style fills in | — |
| [grid.md](grid.md) | Flat editorial page: type, bars, one signal colour | **Draft, unrendered** |
| [console.md](console.md) | Dark instrument panel: clocks, readouts, feeds | **Draft, unrendered** |
| [blocks.md](blocks.md) | Low-poly 3D, box people with drawn faces | **Draft, unrendered** |

> **`blocks` conflicts with a recorded decision.** ADR 0013 §3 chose a UI-driven engine with a
> small flat-2D cast and recorded the blocky 3D look as out of reach. `blocks.md` is written
> anyway because flashloop ships that look from a prompt — but it is a proposal to reopen the
> decision, not a decision. `console` is the nearest of the three to the engine ADR 0013 chose.
> A style for that engine proper (HUD + hook banner + flat 2D cast) **has not been written yet.**

## How these were written, and what that means

- **From frames, in our own words.** Each draft comes from looking at public preview frames
  (flashloop's `swiss-grid`, `ops-console`, `block-story`), our two measured reference reels, and
  our own `films/reel-01-agent-loop`. No competitor's prompt text was read, so none is copied.
- **None has been rendered.** A style document is a hypothesis until a film is built from it and
  someone looks at the frames. Expect each to change on first contact with a render.
- **Numbers marked ⚠ are starting guesses**, not measurements.

## The "debug the flashloop prompt, then edit it" loop

Once flashloop's connector is attached, whatever it sends to Claude for a style becomes readable.
The loop is then:

1. **Read** what their style instruction contains — its sections, what it specifies, what it leaves out.
2. **Compare** it section by section against `_TEMPLATE.md` and note what they cover that we do not.
3. **Improve our template and our styles** from what we learn.
4. **Edit ours**, render, look, repeat.

One boundary: their style text is their copyrighted writing. We learn its *structure and ideas*
and write ours fresh; we do not paste theirs in and modify it. In practice this costs nothing —
a style we wrote is one we can also change freely and use anywhere.
