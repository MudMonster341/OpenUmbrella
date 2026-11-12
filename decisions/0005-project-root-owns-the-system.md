---
status: accepted
date: 2026-11-12
authored_by: agent
derived_from: ["user instruction 2026-11-12: \"I want this to be a proper system... so we can scale and build more interdependent systems\""]
supersedes: null
superseded_by: null
---

# 0005 — The project root owns the system; third-party repos are disposable vendor clones

## Context

The method is combining several third-party repos. The first two documents written in this project
(the walkthrough and the motion-quality research) were created *inside* the OpenMontage clone,
which is a checkout of someone else's repository — they would have been tangled with upstream
history and lost on a fresh clone.

With more repos coming, the question is where "our" work lives.

## Options considered

1. **Project root owns everything; third-party repos are gitignored vendor clones** — clean
   separation, upstream stays pristine, our work is versioned independently. Costs an indirection:
   production commands run inside `OpenMontage/`, not at the root.
2. **Work inside the OpenMontage clone** — fewer paths to think about, but our files mix with
   upstream's, `git pull` conflicts become routine, and a second vendored repo has nowhere to go.
3. **Git submodules** — precise version pinning, but submodules are a persistent source of
   confusion and these dependencies are young and fast-moving; pinning is not actually wanted yet.

## Decision

**The project root is the system.** It holds the memory files, decisions, docs and scripts, and is
its own git repository. `OpenMontage/` and `vendor/*` are gitignored clones that are **never
edited** — they are re-creatable from [docs/REPO_REGISTRY.md](../docs/REPO_REGISTRY.md), which
records the URL and purpose of each.

Customisation goes in our own files and is copied into the vendor tree when a tool requires it,
so upstream updates stay a clean `git pull`.

## Consequences

- **Easy:** upstream repos update without conflict; our standards and memory version independently;
  adding a third or fourth repo is a known shape, not a new argument; the whole system can be
  reconstructed from this repository plus the registry.
- **Hard / given up:** two-level paths, and production commands must run from inside the vendor
  clone with its venv activated — a step that is easy to forget (see
  [ERR-0001](../ERRORS.md)). Vendored code is unversioned here, so a breaking upstream change can
  arrive silently; the registry mitigates this only if it is kept current.
- **Tripwire:** if an upstream break ever costs a real debugging session, switch to pinned commits
  (recorded in the registry) or submodules.

## Links

- Related: [ADR 0001](0001-openmontage-as-production-spine.md), [ADR 0003](0003-approval-gate-for-third-party-code.md)
