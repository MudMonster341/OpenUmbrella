---
name: market-research
description: How market and competitor research is done in this project — delegated to cheap Haiku agents, filed in market_research_and_intelligence/. Use when the user asks to research a product, competitor, repo, tool, trend or reference reel, or to "see how X works".
---

# market-research — delegate it, file it, keep it small

**Standing instruction from the user (2026-11-13): do not do market research directly in the main
session. Use Haiku agents.** The main session frames the question, reads the reports, and decides
what they mean. Fixing and building what we already have comes before new research.

## Which agent

| Need | Agent | Notes |
|---|---|---|
| A product, competitor, repo, tool, licence, price | **`market-researcher`** (Haiku) | One bounded question per agent. Several in parallel is fine |
| A reference reel already ingested by reelkit | **`reel-analyst`** (Haiku) | One reel per agent |
| Downloading and measuring a reel | Main session: `python tools/reelkit/reelkit.py ingest <url>` | Needs a **direct reel URL** — accounts cannot be enumerated |

## How to brief an agent

Give it: the exact question, the URLs if known, what would change a decision, and the word limit.
A vague brief returns a vague report. Ask for facts in a table, not an essay.

## What the main session still does itself

- **Check before relaying.** An agent's report is a report, not proof. Spot-check any claim a
  decision rests on — licences especially.
- **Write the conclusion.** Agents do not write files in `market_research_and_intelligence/`.
- **Anything needing a login, a sign-up, a download or an install** — never delegated, and never
  done without the user's explicit yes for that specific thing.

## Where it goes

| Kind | Location | In git? |
|---|---|---|
| Our findings and designs | `market_research_and_intelligence/` | Yes |
| A product teardown | `market_research_and_intelligence/<product>/FINDINGS.md` | Yes |
| Any repo or tool considered | a row in `docs/REPO_REGISTRY.md` — approved **or** rejected | Yes |
| Third-party video, frames, downloads | `research/` | **No — gitignored, never shipped** |

## Rules for every finding

- Tag claims **stated / observed / inferred**. "Not publicly documented" beats a plausible guess.
- Lead with the constraint that changes the decision: licence, cost, hardware, maintenance.
- Never call a non-commercial or source-available project open source.
- Say what was *not* checked.
- If a finding contradicts one of our own documents, correct the document, dated, and say so in
  MEMORY.md.
