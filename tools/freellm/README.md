# freellm — one prompt to a free LLM, with fallback

**Ours.** Python standard library only — nothing to install. Built and tested 2026-11-14.

Sends one prompt to a free LLM endpoint. If a provider is rate-limited, down, or returns an empty
answer, it moves to the next one in the chain. It is for **text work that does not need Claude**
and for **carrying on when a Claude session is out of usage**.

It is **not** an automatic takeover. A Claude Code session that hits its limit stops; this is a
command you (or a script) run instead. It answers one prompt — it cannot read files, edit code or
use tools the way an agent session does.

## Use

```bash
python tools/freellm/freellm.py "Give me five hook lines for a story about a clock that runs backwards."
```

```bash
python tools/freellm/freellm.py --file films/my-story/script.txt --system "You are a harsh script critic. List problems, numbered."
```

```bash
python tools/freellm/freellm.py --list
```

| Flag | Meaning |
|---|---|
| `--file PATH` | Read the prompt from a file. Stdin also works: `type notes.txt \| python tools/freellm/freellm.py` |
| `--system TEXT` | System message |
| `--provider a,b` | Try only these, in this order |
| `--model ID` | Override the model (needs exactly one `--provider`) |
| `--max-tokens N` | Default 1500 |
| `--allow-logging` | Also use providers that may log or train on prompts — **off by default** |

The answer goes to **stdout**; which provider answered and every failure go to **stderr**.
Exit code `0` = answered, `1` = every provider failed, `2` = bad usage.

## The chain

Tried top to bottom. A provider is skipped if it needs a key you have not set, or if it may log
prompts and `--allow-logging` was not given.

| Name | Model | Key | May log prompts | Limit (the list's claim) |
|---|---|---|---|---|
| `ovh` | Mistral-Small-3.2-24B | none | not flagged | 2 requests/minute per model |
| `llm7` | mistral-Nemo-Instruct-2407 | none | not flagged | undocumented for anonymous use |
| `groq` | openai/gpt-oss-120b | `GROQ_API_KEY` | not flagged | 30/minute, 1,000/day |
| `kilo` | kilo-auto/free | none | **yes** | 200/hour |
| `openrouter` | openrouter/free | `OPENROUTER_API_KEY` | **yes** | 50/day |
| `gemini` | gemini-2.5-flash | `GEMINI_API_KEY` | **yes** | not published |

"Not flagged" means the source list does not warn about logging. **It is not a privacy
guarantee** — nobody here has read those providers' terms.

## Adding a key

Keys are optional; the two keyless providers work today. To add one:

1. Create the key yourself on the provider's site (the agent never signs up or handles keys).
2. Copy `.env.example` at the repo root to `.env` and paste the key after the `=`.
3. `python tools/freellm/freellm.py --list` should now show `key set` for it.

`.env` is gitignored. Never put a key in a prompt, a doc or a commit.

## What was tested — 2026-11-14, all with harmless prompts

| Case | Result |
|---|---|
| Default chain | ✅ answered by `ovh` |
| `llm7` alone, keyless | ✅ answered in ~2 s |
| `kilo` alone, keyless, `--allow-logging` | ✅ answered in ~2 s |
| **Failover** — three quick calls to exceed OVH's limit | ✅ third call got HTTP 429 from `ovh` and was answered by `llm7` |
| **Empty answer** — reasoning model with too few tokens | ✅ detected as a failure, exit 1 |
| Stdin + `--system` | ✅ |
| Provider with no key set | ✅ skipped with a clear message, exit 1 |

## Known limits — read before relying on it

- **`groq`, `openrouter` and `gemini` are untested** — no keys exist. Their rows are written from
  the list, not from a working call. The Gemini base URL in particular is unverified.
- **One slow call:** the very first default call took **65.9 s**; the next ones took about 1 s.
  Cause not established. Expect an occasional long wait.
- **Quality is unjudged.** Only one-line replies were tested. Whether these models are good enough
  to draft or critique a script has not been checked.
- **Free limits are small.** Two keyless providers at a few requests a minute is enough for an
  occasional second opinion, not for bulk work.
- **Model ids and limits go stale.** They were copied on 2026-11-13 from
  `external_tools/research/awesome-free-llm-apis/data.json`. When a provider starts failing,
  `git pull` that clone, read its `data.json`, and update the `PROVIDERS` table in `freellm.py`.
- **No streaming, no images, no tool use, no conversation memory** — one prompt in, one answer out.
- **Privacy:** an unpublished story sent to any of these leaves the machine. The logging-flagged
  ones are off by default for that reason.
- Reasoning models can spend the whole token budget thinking and return nothing; the script
  treats that as a failure and moves on. Raise `--max-tokens` if you pick one on purpose.
