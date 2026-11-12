---
status: accepted
date: 2026-11-12
authored_by: agent
derived_from: ["OpenMontage AGENT_GUIDE.md", "OpenMontage PROJECT_CONTEXT.md", "measured capability envelope 2026-11-12"]
supersedes: null
superseded_by: null
---

# 0001 — OpenMontage is the production spine

## Context

The project needs a repeatable way to go from an idea to a finished video, not a pile of scripts.
The user supplied `OpenMontageInc/OpenMontage` and asked whether it was usable. Recorded
retroactively, on the day the setup was completed and verified.

What it actually provides: 12 pipeline manifests, ~100 registered tools, staged artifacts validated
against JSON schemas, human approval gates, a scored provider selector, budget governance, a
pre-compose validation gate, a post-render self-review, and a live board (Backlot). What it does
not provide is any judgement about whether the motion is good.

## Options considered

1. **OpenMontage as the spine** — large surface area and a CAUTION grade in one third-party
   catalog, but the staged-artifact model, approval gates and provider abstraction are exactly the
   governance this project would otherwise have to build.
2. **Build directly on a render runtime (Remotion or HyperFrames) with our own thin scripts** —
   simpler and fully understood, but means re-implementing project workspaces, artifacts,
   checkpoints, provider selection and review from scratch.
3. **A motion-design skill kit alone** (e.g. a HyperFrames-based skill) — fastest to a good-looking
   single video, but no pipeline, no resumability, no audit trail, and nothing to scale into a
   series.

## Decision

**Use OpenMontage as the production spine**, driven by the agent, with our own standards layered on
top. The staged artifact model (`brief → script → scene_plan → asset_manifest → edit_decisions →
render_report`) is what makes a production resumable and reviewable, and it is the natural place to
attach the quality gates in [GOAL.md](../GOAL.md).

## Consequences

- **Easy:** resumable productions, per-stage approval, provider swapping without rewrites, a live
  board, and a workspace convention that every tool already honours.
- **Hard / given up:** a large dependency we did not write and do not fully control; its own
  post-render review checks technical validity only, so motion quality still needs our own layer;
  and its AGPLv3 license matters if this ever becomes a hosted service.
- **Tripwire:** if we find ourselves routinely bypassing the pipeline to get work done, or if the
  artifact model fights the authored-composition workflow the quality bar demands, revisit and
  consider option 2.

## Links

- Related: [ADR 0002](0002-zero-key-local-first-default.md), [ADR 0005](0005-project-root-owns-the-system.md)
- Setup reference: [docs/WALKTHROUGH.md](../docs/WALKTHROUGH.md)
