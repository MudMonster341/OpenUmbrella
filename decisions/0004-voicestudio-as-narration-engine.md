---
status: accepted
date: 2026-11-12
authored_by: human
derived_from: ["user instruction 2026-11-12: use debpalash/voicestudio for voiceovers", "repo audit 2026-11-12"]
supersedes: null
superseded_by: null
---

# 0004 — VoiceStudio replaces Piper as the narration engine

## Context

Narration is currently Piper TTS 1.8.0 with the `en_US-lessac-medium` voice: free, offline,
intelligible — and flat. [GOAL.md](../GOAL.md) calls for a character who is *excited*, and a
monotone read would fail that on its own.

The user proposed `debpalash/voicestudio` (GitHub resolves to `debpalash/VoiceStudio`). Audited
2026-11-12: **109k stars, 12.1k forks, AGPL-3.0, 7,754 commits.** Self-described as a fully local
ElevenLabs alternative; default engine is OmniVoice (`k2-fsa/OmniVoice`), with voice cloning from a
reference recording, voice design from a text description, dubbing and transcription across a
claimed 646 languages. Runs on CPU ("fully usable on the CPU, just slower"), with CUDA, Metal and
Vulkan acceleration where available. Models download on first use, and the app asks before
downloading. There is a desktop app, a local API on `127.0.0.1:3900`, a `cli/` directory and MCP
integration.

Unverified from the README and to be confirmed on install: audio output format, and whether it
emits word-level timestamps or SRT — the latter matters because captions are a Blocker-class
standard.

## Options considered

1. **Keep Piper** — already installed, tiny, offline, zero risk. Delivery is flat and the voice
   cannot be directed; fails the emotional arc requirement.
2. **VoiceStudio** — local, free, actively developed at scale, with voice design and cloning. Costs
   a heavier install (Electron app plus Python backend) and a model download.
3. **A paid cloud voice (ElevenLabs, Google)** — best quality per unit effort, but contradicts
   [ADR 0002](0002-zero-key-local-first-default.md) and introduces per-film cost.

## Decision

**Adopt VoiceStudio as the narration engine**, keeping Piper installed as the fallback for drafts
and for any case where VoiceStudio is unavailable. It satisfies the zero-key rule while giving a
directable voice, which is the specific thing Piper cannot provide.

**Installation is not covered by this decision.** The vendor's one-liner
(`irm https://voicestudio.sh/install.ps1 | iex`) executes a remote script, so the install method
needs its own explicit approval under [ADR 0003](0003-approval-gate-for-third-party-code.md).
Alternatives: Docker (`ghcr.io/debpalash/voicestudio:stable`) or a build from source.

## Consequences

- **Easy:** expressive, directable narration at zero marginal cost; a consistent voice identity
  across a series via voice cloning or design; a local API that can be scripted into the pipeline.
- **Hard / given up:** a much larger dependency than Piper, with a model download and an Electron
  desktop surface; CPU-only synthesis will be slow on this machine; **AGPL-3.0** carries source
  obligations if we ever expose it as a network service — fine for producing videos, a real
  constraint if the system is ever hosted for others.
- **Tripwire:** if it cannot produce word-level timings for captions, or CPU synthesis is too slow
  to iterate, re-evaluate — possibly Kokoro, which `onetake` and `lemo-opuscar` both use locally.

## Links

- Related: [ADR 0002](0002-zero-key-local-first-default.md), [ADR 0003](0003-approval-gate-for-third-party-code.md)
- Registry entry: [docs/REPO_REGISTRY.md](../docs/REPO_REGISTRY.md)
