---
status: accepted
date: 2026-11-13
authored_by: human
derived_from: ["user instruction 2026-11-13: install voice studio first, install all the repos i gave you"]
supersedes: null
superseded_by: null
---

# 0010 — Install the reference repos locally, with a stated non-commercial boundary

## Context

[ADR 0007](0007-build-continuous-camera-in-house.md) declined `onetake` as a dependency and
[ADR 0008](0008-learn-styles-then-author-our-own.md) kept `lemo-opuscar` as reference only, both on
licence grounds. The user has now instructed that all of them be installed and used together, with
their usage documented.

That instruction does not change the licences, and it does not need to. There is a real difference
between **having a repo on disk to learn from and run locally** and **shipping its code or text in
commercial output**. The first is ordinary study; the second is what the licences govern.

The quality gap that prompted this is real and measured: the Paris prototype passes every automated
gate and still looks amateur. The craft knowledge in these repos — 3D lighting recipes, character
acting rules, timing discipline, the one-timeline audio pipeline — is the fastest route to closing
it, and none of that knowledge is encumbered. Ideas are not licensed.

## Options considered

1. **Install all three, with a written boundary** — full access to the craft, at the cost of
   needing the boundary to be remembered every time something is reused.
2. **Keep refusing the non-commercial ones** — safest, and discards the best available references
   over a restriction that does not apply to studying them. Also directly against instruction.
3. **Install and use them freely** — fastest, and quietly makes every film we produce
   non-commercial, which is the exact trap [ADR 0003](0003-approval-gate-for-third-party-code.md)
   exists to prevent.

## Decision

**Install all three into `vendor/`** (gitignored), plus VoiceStudio as an application, and treat
them by licence class:

| Repo | Licence | What we may do |
|---|---|---|
| `ClaudeAnimationBase` | MIT | Use directly, code included |
| `onetake` | PolyForm Noncommercial | **Read and run locally. No code or text in published work** |
| `lemo-opuscar` | code MIT, prompts CC BY-NC | **Read and run locally. No prompt text copied or paraphrased into our files** |
| VoiceStudio | AGPL-3.0 | Use freely to produce audio. Obligations only if we ever host it as a service |

Everything learned is re-expressed in our own words in
[ANIMATION_STANDARD.md](../docs/ANIMATION_STANDARD.md), with the source credited in
[REPO_PLAYBOOK.md](../docs/REPO_PLAYBOOK.md).

ADRs 0007 and 0008 are **not superseded**: we still built our own camera rig, and we still author
our own styles. What changed is that the references now sit on disk instead of being read through
a browser.

## Consequences

- **Easy:** the craft knowledge that closes the quality gap is now local, searchable and runnable;
  a single playbook says what each is for; VoiceStudio gives directable narration at zero cost.
- **Hard / given up:** the boundary is a rule a person has to keep, and rules like that fail
  quietly. The risk is a prompt or a snippet drifting from `vendor/` into a film nobody re-checks.
  Mitigations: `vendor/` is gitignored so nothing from it can be committed by accident, and the
  playbook states the boundary at the top rather than in a footnote.
- **Tripwire:** if we ever find vendored text inside `films/` or `engine/`, this ADR has failed and
  the boundary needs enforcement rather than discipline — a pre-commit check, or dropping the
  non-commercial repos entirely.

## Links

- Playbook: [docs/REPO_PLAYBOOK.md](../docs/REPO_PLAYBOOK.md)
- Craft standard: [docs/ANIMATION_STANDARD.md](../docs/ANIMATION_STANDARD.md)
- Related: [ADR 0003](0003-approval-gate-for-third-party-code.md), [ADR 0007](0007-build-continuous-camera-in-house.md), [ADR 0008](0008-learn-styles-then-author-our-own.md)
