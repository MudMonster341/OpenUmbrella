---
status: accepted
date: 2026-11-13
authored_by: human
derived_from: ["user instruction 2026-11-13: \"lemo-opuscar, make it so that that is also used, we can use it since this is not commercial\""]
supersedes: 0008
superseded_by: null
---

# 0011 — Use lemo-opuscar's styles directly; these films are non-commercial

## Context

[ADR 0008](0008-learn-styles-then-author-our-own.md) held lemo-opuscar at arm's length — study the
technique, never copy the prompt text — because its 101 style definitions are CC BY-NC 4.0 and we
had assumed the films might be commercial.

The user has now settled that premise: **these films are not commercial.** With that, the
restriction that drove 0008 does not apply, and holding the best available style library at arm's
length is cost with no benefit.

## Options considered

1. **Use the styles directly** under the non-commercial licence. Immediate access to 101 worked
   styles, each with a demo film. Binds the output to non-commercial use.
2. **Keep 0008's arm's-length rule.** Keeps every future door open, and throws away the single
   best reference we have over a restriction that does not currently bite.
3. **Use them only as a learning ladder** — adopt directly now, re-author in our own words later
   if anything ever needs to go commercial. Same benefit now, with the exit written down.

## Decision

**Adopt option 3: use lemo-opuscar's styles directly, and write the exit down.**

Direct use is permitted from today. In exchange, two obligations are recorded here rather than
remembered:

1. **CC BY-NC 4.0 requires attribution.** Any film built on one of their styles credits
   lemo-opuscar. This is not optional and is cheap to honour.
2. **The output inherits the restriction.** A film built on their styles cannot be used
   commercially — no client work, no ads, no sponsored content, no selling it. If that changes,
   the affected films must be rebuilt from styles we authored, not retro-licensed.

So that the second obligation is actionable rather than a vague worry, **every film records in its
README which external styles it used**, and `docs/REPO_PLAYBOOK.md` carries the running list. A
film with an empty list is commercially clean; a film with entries is not.

## Consequences

- **Easy:** 101 worked styles, with demo films, usable now. This directly attacks the quality gap
  that prompted all of it — our weakness is taste and craft, and this is a library of both.
- **Hard / given up:** commercial use of anything built this way, until rebuilt. The temptation
  will be to reach for their styles by default and never develop our own, which would make the
  restriction permanent by habit rather than by choice.
- **Tripwire:** the moment any film is wanted commercially — or we start selling the system
  itself — this needs revisiting, and the per-film style list is what makes that survivable.

`onetake` is **not** covered by this ADR. PolyForm Noncommercial is a different licence on a
different repo, and we rebuilt that capability ourselves anyway
([ADR 0007](0007-build-continuous-camera-in-house.md)).

## Links

- Supersedes: [ADR 0008](0008-learn-styles-then-author-our-own.md)
- Related: [ADR 0010](0010-install-reference-repos-with-a-boundary.md), [ADR 0012](0012-external-tools-layout.md)
- Playbook: [docs/REPO_PLAYBOOK.md](../docs/REPO_PLAYBOOK.md)
