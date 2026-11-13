# flashloop.ai teardown — brief for the next session

**Status: NOT STARTED.** Deliberately deferred on 2026-11-13 so it runs in its own chat with a
clean context instead of competing with the zombie film build.

A first attempt was launched and stopped almost immediately by a usage limit. It produced **one
finding worth carrying forward**, and nothing else:

> flashloop's **"Faceless Studio" is described as "drawn in code"**.

That single line is why this research matters to us. If "drawn in code" means what it means in our
stack — a page rendered frame by frame through a headless browser — then a funded product has
independently arrived at the architecture we are building, and their feature set becomes a
roadmap. If it instead means templated compositing over generative video, it tells us the opposite:
that the code-drawn route is a niche and we should know what we are trading away. **Settling that
distinction is the single most valuable output of this research.**

No `FINDINGS.md` was written. Do not assume any other conclusion from the earlier attempt.

---

## Scope

Public material only: their own site, docs, pricing, blog, changelog, public demos, plus press and
reviews found by search. **No logins, no private API probing, no bypassing protections.** This is
ordinary competitive research on published material. Where something is not published, write
"not publicly documented" rather than inferring a plausible answer.

Mark every claim as **stated** (they say it) or **inferred** (we deduce it). The two must not blur.

## Deliverable

`research/flashloop/FINDINGS.md`, structured as:

1. **What it is** — product, audience, two or three sentences.
2. **The user-facing workflow** — concretely, sign-up to finished output.
3. **Features, enumerated** — one line each; mark paid-tier only.
4. **The output** — formats, resolutions, aspect ratios, durations, audio, captions, music.
5. **How it appears to work under the hood** — ⭐ *the priority.* Generative video models,
   templates, code-driven rendering, stock, avatars? Any providers or technologies they credit.
   Resolve the "drawn in code" question explicitly.
6. **Pricing and limits** — tiers, credits, quotas, watermarks.
7. **What they do well** — the three to five things worth studying.
8. **What we could take from it** — split honestly into (a) advantages that come from paid cloud
   models we have chosen not to use, and (b) craft, workflow and UX ideas we *can* adopt in a
   local, zero-key, Three.js-through-headless-Chrome pipeline.
9. **Gaps and open questions.**

A short honest report beats a long speculative one. If the site is thin or inaccessible, say so.

## Why this is worth doing

Our quality problem has never been the renderer. It is craft and workflow — what a user is asked
for, how a film is structured, what the defaults are. A product that ships this daily has solved
workflow problems we have not met yet. We want their *questions* as much as their answers.

## Afterwards

Generalise it: if the teardown works, turn the method into a repeatable workflow for any reference
product, and record it under `docs/`. That was the user's stated intent — "reverse engineer
anything" as a standing capability, not a one-off.

## Related

- [ROADMAP.md](../../ROADMAP.md) — Phase 5
- [docs/ANIMATION_STANDARD.md](../../docs/ANIMATION_STANDARD.md) — the craft gaps this should inform
- [docs/REPO_PLAYBOOK.md](../../docs/REPO_PLAYBOOK.md) — what we already have, so the report can
  say what is genuinely new rather than restating our own stack back to us
