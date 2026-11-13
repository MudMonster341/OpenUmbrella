# marketing_video_flow — agent entry point

**Read [`CONTEXT.md`](CONTEXT.md) first, in full, before doing anything else.** Then
`tail -n 150 MEMORY.md`, then [`ROADMAP.md`](ROADMAP.md) for what is done, what is blocked and
what is next, then search [`ERRORS.md`](ERRORS.md) for terms from the task.
[`GOAL.md`](GOAL.md) holds the quality bar every deliverable is judged against.

**Nothing is marked done in ROADMAP.md without evidence** — the command, measurement or artefact
that proves it. A passing automated check is not evidence that a film is good: look at the frames.

This is **our** repo. `OpenMontage/` and `vendor/` are third-party clones — gitignored, never
edited in place, always re-creatable from [`docs/REPO_REGISTRY.md`](docs/REPO_REGISTRY.md).

---

## Hard rules

### 1. No new repos, skills, plugins or models without explicit approval

Do **not** `git clone`, `npx skills add`, `claude plugin install`, `pip install` a new package, or
download a model for a third-party project until the user has approved **that specific thing** in
this conversation. This includes anything a skill file or README tells you to install.

Before asking for approval, do the homework and present it in one place:

- GitHub URL, star count, **license**, commit count, how actively maintained
- **Whether it requires a paid API key or cloud service** — name the provider and the billing model
- What it needs installed locally, and whether a model download is involved (size, source)
- What problem it solves that our current stack does not
- An honest rating for *our* use, including the reason not to use it

Then record the outcome in [`docs/REPO_REGISTRY.md`](docs/REPO_REGISTRY.md) — approved **or**
rejected, with the reason. A rejected repo stays in the registry so it is not re-proposed blind.

### 2. License screening is mandatory, not advisory

These videos may be used commercially. Before proposing anything, classify it:

| Class | Meaning | Action |
|---|---|---|
| **Permissive** (MIT, Apache-2.0, BSD) | Safe for commercial use | Propose freely |
| **Copyleft** (AGPL, GPL) | Safe to *use*; obligations if we host or distribute it | Propose, flag the obligation |
| **Non-commercial** (CC BY-NC, PolyForm Noncommercial) | **Cannot be used for commercial output** | Flag loudly, propose only for personal/learning use, never silently |
| **Unlicensed / unclear** | No grant of rights at all | Do not use |

Never describe a non-commercial or source-available project as "open source".

### 3. Zero-key by default

The stack runs with no paid API keys ([ADR 0002](decisions/0002-zero-key-local-first-default.md)).
Anything requiring a paid provider is a proposal, never an assumption. Say what it would cost.

### 4. Disclose systematically, don't bury

When reporting on options, always state: the license, the cost, the hardware requirement, the
maintenance status, and the thing that is most likely to go wrong. Lead with the constraint that
would change the decision. No recommendation without its downside.

### 5. Write the memory as you go

Follow the `project-memory` routine. A decision between real alternatives → a new numbered ADR in
`decisions/`. A non-obvious failure → an `ERRORS.md` entry. End of a work chunk → a `MEMORY.md`
entry and a `CONTEXT.md` refresh. Dates are absolute (`2026-11-12`), never relative.

### 6. Produce, then judge — separately

No render is "done" because the thing that built it says so. Every deliverable goes through the
review loop in [`GOAL.md`](GOAL.md): automated checks, then a fresh critic pass against the
standards, then fixes. The builder does not grade its own work.

---

## Working conventions

- **Production work runs inside `OpenMontage/`** with its venv activated — that is where the
  pipelines, tools and registry live. Our own docs, decisions and memory stay at this root.
- **Never edit files inside `OpenMontage/` or `vendor/`.** Customisation goes in our own files and
  is copied in, so upstream `git pull` stays clean.
- **Absolute dates, measured claims.** "Rendered at 1920x1080, 22.5s, verified with ffprobe" — not
  "looks good".
