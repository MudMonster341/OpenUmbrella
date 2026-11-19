# Handoff — what the research session produced, for the main session

**Written 2026-11-14.** A side session ran alongside the main film-building session on
2026-11-13 and 2026-11-14. This page is everything it produced, in one place, with what is proven
and what is not. **Read this first; follow the links only for what you need.**

---

## 1. What exists now

| Thing | Where | State |
|---|---|---|
| Flashloop teardown | [flashloop/FINDINGS.md](flashloop/FINDINGS.md) | Public pages only. Their MCP connector was **not** examined |
| Market landscape | [01-landscape.md](01-landscape.md) | 4 commercial products, ~30 repos, from metadata — no code read |
| Whole-system design | [02-system-architecture.md](02-system-architecture.md) | **Proposal.** Nothing built from it |
| Style × format system, assets | [03-style-and-format-system.md](03-style-and-format-system.md) | Proposal |
| Research + story engine | [04-research-and-story-engine.md](04-research-and-story-engine.md) | Proposal |
| Audio design + VoiceStudio measurements | [05-audio.md](05-audio.md) | Design is a proposal; §2a is **measured** |
| Gap analysis and plan | [06-gap-analysis-and-build-plan.md](06-gap-analysis-and-build-plan.md) | Proposal |
| Style documents | [styles/](styles/README.md) | Template + `grid`, `console`, `blocks`. **Drafts, never rendered** |
| Story template | [story/STORY_TEMPLATE.md](story/STORY_TEMPLATE.md), [story/FORMATS.md](story/FORMATS.md) | Draft |
| Project skills | `.claude/skills/` — `story-reel`, `style-doc`, `market-research`, `free-llm` | `story-reel` has since been edited by the main session |
| Project agents | `.claude/agents/` — `market-researcher`, `reel-analyst` (Haiku), `script-critic`, `film-critic` | Check with the main session whether they have been used |
| Free LLM tool | `tools/freellm/` | **Built and tested** — see §4 |
| Free LLM provider list | `external_tools/research/awesome-free-llm-apis/` | Third-party clone, CC0 |

## 2. The findings worth carrying

1. **Flashloop's Faceless Studio is code-rendered** — concluded from frames of five public
   previews, not stated by them. It runs as an MCP connector inside Claude. Where the render
   happens is unknown.
2. **Their template is format × look** — three story engines (a rule, a doubling, a satire)
   crossed with ~27 visual styles. Keep those two things separate.
3. **A style is a written document plus scene templates.** True of all four commercial products.
4. **The market's kits are mostly silent, and none does research.** Sound and research are open.
5. **One timeline, voice first.** Narration's measured timings should be the clock for picture,
   captions, music and effects.

## 3. Measured facts about narration (2026-11-13)

- VoiceStudio `speak` works from the CLI: 24 kHz mono WAV.
- **About 15× slower than real time** on this CPU (54 s and 47 s for ~3 s of speech; two samples).
- **No word timings** from `speak`. Word-synced captions need an aligner that is not installed.
- Default model `k2-fsa/OmniVoice`: weights flagged **CC-BY-NC — non-commercial**.
- Upstream Piper is **archived**.

## 4. The free LLM tool

```bash
python tools/freellm/freellm.py "<prompt>"
```

One prompt to a free LLM, falling over to the next provider on failure. Standard library only.
Use the `free-llm` skill; full detail in `tools/freellm/README.md`.

| Proven 2026-11-14 | Not proven |
|---|---|
| Keyless answers from OVHcloud, LLM7.io, Kilo Code | Groq, OpenRouter, Gemini — no keys exist |
| Failover on a real HTTP 429 | Quality on real script work — only one-line replies tested |
| Empty-answer detection (reasoning model spent all tokens) | Any provider's privacy terms — none were read |

**It is a command to run, not an automatic takeover**, and it is never a gate — the critic agents
judge. Prompts leave the machine; logging-flagged providers are off unless `--allow-logging`.

## 5. Where this session's work conflicts with yours — unresolved

| Conflict | Detail | Whose call |
|---|---|---|
| **Who writes the story** | Files 02 and 04 assume the system *generates* stories. ADR 0013 says the user writes them. Read those files as "structure and check the user's story" | Already settled by ADR 0013 |
| **The blocky 3D look** | ADR 0013 §3 records it as out of reach. `styles/blocks.md` re-proposes it because flashloop ships it from a prompt. A note was added to `docs/STORY_REEL_FINDINGS.md` | **User** |
| **No style for the chosen engine** | ADR 0013 chose a UI-driven engine (HUD, hook banner, flat 2D cast). None of the three style drafts is that. `console` is nearest | Main session to write |
| **The story-reel skill** | Written before reel-02 existed; the main session has since corrected it from real experience. **Trust the current file, not this session's assumptions** | Main session |

## 6. Corrections this session made to older files

- The "drawn in code" quote attributed to flashloop was wrong — it belongs to an unrelated,
  unlicensed repo. Fixed in the brief and ROADMAP.
- VoiceStudio's 9/10 registry rating was given without checking its model licence.
- `remotion-dev/skills` has no licence.
- `vendor/` and bare `OpenMontage/` paths replaced with `external_tools/...` in the live docs.
  Old ADRs were left as written.
- `STATUS.md` was eight hours stale and was rewritten by hand; the hourly task that should
  maintain it does not appear to run.

## 7. Open items that need the user

1. Connect flashloop's MCP once, to see what a style looks like on the wire. Optional.
2. Approve a word-timing aligner, or find a transcription route in VoiceStudio's local API.
3. Keep or reopen "the blocky look is out of reach".
4. Create free keys for Groq / OpenRouter / Gemini if more capacity is wanted — optional.

## 8. Standing instructions the user gave this session

- **Do not do market research in the main session — use Haiku agents** (`market-research` skill).
- **Fixing what exists comes before new research.**
- Both are in CLAUDE.md as rule 8.
