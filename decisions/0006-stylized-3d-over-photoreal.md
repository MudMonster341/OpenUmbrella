---
status: accepted
date: 2026-11-12
authored_by: agent
derived_from: ["hardware survey 2026-11-12: Intel integrated graphics", "ADR 0002", "GOAL.md"]
supersedes: null
superseded_by: null
---

# 0006 — Stylized 3D, not photoreal

## Context

[GOAL.md](../GOAL.md) asks for "good 3D graphics" in a film about Claude travelling to Paris. Two
constraints decide how that is interpreted, and they are not negotiable in the short term:

- **No GPU.** Intel integrated graphics only. Blender Cycles is impractical; Eevee is slow; Three.js
  in headless Chrome is fine for stylized geometry but will not carry heavy global illumination.
- **No paid generation** ([ADR 0002](0002-zero-key-local-first-default.md)). Photoreal imagery via
  Veo, Kling or FLUX is off the table, and local generative video models need VRAM we do not have.

There is also a craft argument independent of hardware: photoreal CG at amateur scale reliably
lands in the uncanny valley, while a committed stylized look reads as a deliberate choice. A
low-poly miniature-diorama Paris is both achievable here and a stronger aesthetic.

## Options considered

1. **Stylized 3D — low-poly / miniature diorama, Three.js in HyperFrames** — renders on this
   hardware, has a coherent look, and keeps the continuous-camera requirement feasible.
2. **Photoreal 3D via Blender with CC0 assets** — possible in principle, but render times on an
   iGPU make the iteration loop in [GOAL.md](../GOAL.md) impractical, and near-photoreal at this
   budget looks worse than committed stylization.
3. **Generated imagery animated as 2.5D parallax** — fastest route to a "rich" look, but requires
   paid generation, and image-based parallax is exactly the "animate stills and call it video"
   pattern the quality bar exists to prevent.

## Decision

**Build a stylized 3D world — low-poly, miniature-diorama Paris — rendered with Three.js through
HyperFrames**, with a single continuous camera path. Visual richness comes from lighting, depth,
material contrast and camera movement, not from polygon count or texture realism.

The character is the open question and is deliberately left to a cheap prototype: either a simple
low-poly figure carried by silhouette and motion, or a 2D character composited into the 3D scene.
Facial detail is not the plan; readable body language is.

## Consequences

- **Easy:** renders within a workable iteration loop on this machine; a consistent look that scales
  across a series; no dependency on generation of any kind.
- **Hard / given up:** no photorealism, ever, under this ADR; expressive character acting is the
  hardest remaining problem and may still force a compromise; "stylized" is only an excuse if the
  craft is there — a sloppy low-poly scene is just sloppy.
- **Tripwire:** a GPU, or a decision to fund generation for a specific film, makes this worth
  revisiting with a superseding ADR.

## Links

- Related: [ADR 0002](0002-zero-key-local-first-default.md)
- Target: [GOAL.md](../GOAL.md)
