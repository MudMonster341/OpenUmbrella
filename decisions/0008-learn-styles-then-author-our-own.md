---
status: accepted
date: 2026-11-12
authored_by: human
derived_from: ["user instruction 2026-11-12: keep lemo-opuscar on the side to learn styles from, then author our own"]
supersedes: null
superseded_by: null
---

# 0008 — Study restricted style libraries, author our own style

## Context

`lemomo-ai/lemo-opuscar` (15.2k ⭐) contains 99 film styles, each a style prompt plus a demo film,
all produced in code with no video model. It is the most useful reference material found so far for
what code-driven film styles can look like.

Its licensing is split per file: **code MIT, but the style prompts — the valuable part — are
CC BY-NC 4.0**, and the demo films are CC BY 4.0. The prompts therefore cannot be used in, or
adapted into, commercial output.

Studying a work is not the same as copying it. Reading a film and learning what makes it work is
how every craft is learned; reproducing its text or adapting its prompts is what the license
governs.

## Options considered

1. **Study it, author our own style from what we learn** — slower, and produces a style that is
   actually ours and unencumbered.
2. **Use the prompts directly, non-commercially** — fastest, and quietly makes every film
   non-commercial. Precisely the trap recorded in [ADR 0003](0003-approval-gate-for-third-party-code.md).
3. **Ignore it entirely** — safest, and throws away the best available reference on what this
   medium can do.

## Decision

**Keep it as reference only, and author our own style vocabulary from what we learn.**

Rules that make the boundary concrete:

- Read it to understand *technique* — how motion carries meaning, how a style holds together across
  shots, what pacing a style implies.
- **Do not copy prompt text, and do not paraphrase a prompt into our files.** Our style definitions
  are written from our own decisions about our own films.
- Record what we learned as our own principles in the house style, with attribution of the
  *inspiration* where it is honest to do so.
- If it is ever cloned locally, it goes in `vendor/` — gitignored, never imported, never shipped.

## Consequences

- **Easy:** we get the education without the license. Our style is ours, usable commercially,
  and tuned to our subject rather than to someone else's demo reel.
- **Hard / given up:** no shortcut. 99 ready-made styles sit on the other side of a line we have
  chosen not to cross, and building a style that is genuinely good takes real iterations.
- **Tripwire:** if a film is explicitly personal and non-commercial, direct use becomes legitimate
  — but it must be a deliberate, recorded choice for that film, not a default that spreads.

## Links

- Registry entry: [docs/REPO_REGISTRY.md](../docs/REPO_REGISTRY.md)
- Related: [ADR 0003](0003-approval-gate-for-third-party-code.md), [ADR 0009](0009-in-house-before-adoption.md)
