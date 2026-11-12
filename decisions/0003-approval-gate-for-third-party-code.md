---
status: accepted
date: 2026-11-12
authored_by: human
derived_from: ["user instruction 2026-11-12: \"dont install any new skills, repos without approval\"", "license audit of the five reel repos"]
supersedes: null
superseded_by: null
---

# 0003 — No third-party code enters without explicit per-item approval

## Context

The project's method is assembling free and open-source parts, which makes dependency intake the
main source of risk. Three concrete findings on 2026-11-12 made this a rule rather than a habit:

- **Licenses are not what they look like.** Of the five repos from the reference reel, two are
  restricted: `onetake` is PolyForm Noncommercial 1.0.0 (commercial use forbidden without a $79
  license) and `lemo-opuscar` ships its style prompts — the valuable part — under CC BY-NC 4.0.
  Both are routinely described as "open source" in the places they are shared.
- **"Free" repos can require paid services.** `gbro-collage-broll` is MIT-licensed but needs a
  `GEMINI_API_KEY` billed per use, which contradicts [ADR 0002](0002-zero-key-local-first-default.md).
- **Grades are not audits.** The main community catalog's SAFE/CAUTION badges grade the README and
  install steps, not the code, and are issued by a hub the catalog's own maintainer runs.

These repos are also young — commit counts of 3, 7, 15, 21 — and agent skills are instructions that
can direct an agent to run code.

## Options considered

1. **Per-item approval with a written dossier** — slowest intake, but every dependency's license,
   cost and risk is known and recorded.
2. **Allowlist by license** (auto-accept MIT/Apache) — faster, but misses paid-API requirements,
   mixed per-file licensing, and abandoned or hostile code entirely.
3. **Install freely, audit later** — fastest to a result, and the normal way these stacks rot.

## Decision

**Nothing third-party is installed until the user approves that specific item**, after being shown
a dossier: URL, stars, license, maintenance, paid-service requirements, local dependencies, what it
solves that the current stack does not, and an honest rating including the reason against it.

Every outcome — approved **and rejected** — is recorded in
[docs/REPO_REGISTRY.md](../docs/REPO_REGISTRY.md), so rejected options are not re-proposed blind
and the reasoning survives the conversation that produced it.

## Consequences

- **Easy:** no surprise costs, no license contamination of commercial output, no silent supply of
  instructions to the agent, and a defensible record of what is in the stack and why.
- **Hard / given up:** real friction. Every good idea waits for a round trip, and the agent cannot
  follow a README's install instructions on its own authority even when they are obviously correct.
  That cost is accepted deliberately.
- **Tripwire:** if intake friction starts blocking real work, consider a narrow pre-approved class
  (e.g. permissive-licensed, no network, no paid service, read-only) — but never relax the license
  screen.

## Links

- Registry: [docs/REPO_REGISTRY.md](../docs/REPO_REGISTRY.md)
- Related: [ADR 0002](0002-zero-key-local-first-default.md)
