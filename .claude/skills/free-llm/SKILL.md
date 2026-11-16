---
name: free-llm
description: Use a free LLM instead of Claude for cheap text work in this repo — a second opinion on a script, bulk hook or title drafts, classifying analysed reels — via tools/freellm. Use when the user says "use the free llm", "free api", "second opinion", wants to save Claude usage, or asks what to do when a session runs out.
---

# free-llm — cheap text work through tools/freellm

`tools/freellm/freellm.py` sends one prompt to a free LLM endpoint and falls over to the next
provider on failure. Standard library only. Full detail: `tools/freellm/README.md`.

```bash
python tools/freellm/freellm.py --file <prompt file> --system "<role>"
```

The answer is on stdout; the provider that answered and any failures are on stderr. Exit 0 means
an answer was printed.

## When to use it

- A **second opinion** from a different model on a script, a hook list, a title.
- **Bulk, low-stakes drafting**: twenty hook variants, alternative endings, caption rewordings.
- **Simple classification** of text already extracted — never of frames; it cannot see images.

## When not to

- Anything needing files, tools, images or this repo's context — it gets one prompt and nothing else.
- **A gate.** The `script-critic` and `film-critic` agents are the judges. A free model's opinion is
  an extra input, never a pass.
- Bulk work: the keyless providers allow only a few requests a minute.

## Rules

1. **Privacy first.** The prompt leaves the machine. Before sending an unpublished story, tell the
   user which provider it goes to. Providers that may log or train on prompts are off unless
   `--allow-logging` is passed — pass it only when the user has agreed.
2. **Never create accounts or handle API keys.** Keys are the user's, in `.env`. If a keyed
   provider is wanted, point the user to `.env.example`.
3. **Report which provider answered** and treat the output as a draft: check any fact or number
   in it before it is used.
4. **Write long prompts to a file** in the scratchpad and use `--file`; do not fight shell quoting.
5. If providers start failing with errors other than rate limits, the model ids have probably
   gone stale: `git pull` in `external_tools/research/awesome-free-llm-apis`, read its `data.json`,
   update the `PROVIDERS` table in `freellm.py`, and note it in `MEMORY.md`.

## What is and is not proven (2026-11-14)

Working: `ovh`, `llm7`, `kilo` (all keyless), failover on a rate limit, empty-answer detection.
**Untested:** `groq`, `openrouter`, `gemini` — no keys exist yet. **Unjudged:** whether any of
these models is good enough for script work; only one-line replies were tested.

It does **not** take over automatically when a Claude session runs out. It is a command to run.
