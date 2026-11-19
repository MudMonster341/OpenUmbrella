# Narration voice options (researched 2026-11-19, NOT yet decided)

**Why:** the user, 2026-11-19: the voice-over "is really bad right now, the model gives very monotonic voice, we want sharp good voice,
don't hold back, find all options". Researched by a `market-researcher` agent (Haiku) the same day; GitHub stars and push dates are from the
GitHub API on 2026-11-19. **Not spot-checked by the main session yet. Nothing installed, nothing downloaded** (CLAUDE.md rule 1: each one
needs its own approval and a REPO_REGISTRY entry).

**The constraint that decides it:** the licence of the model WEIGHTS, which most open repos do not state on their pages.

## Local, open weights

| Option | Code | Weights | Stars / last push | Emotion control | Main risk |
|---|---|---|---|---|---|
| Kokoro 82M | Apache-2.0 | **Apache-2.0 (stated)** | 10.2k / 2025-08 | none (voice, speed) | the only clean zero-key option, and likely monotonic too |
| Chatterbox (Resemble) | MIT | not stated | 27.9k / 2026-11 | `exaggeration` knob; tags on Turbo/Nano | page says "retired research" (Aug 2026), conflicting with the push date |
| Orpheus-TTS | Apache-2.0 | not stated | 6.4k / 2025-12 | inline tags `<laugh>` `<sigh>` `<gasp>` | GPU / vLLM expected |
| Dia 1.6B | Apache-2.0 | not stated | 19.4k / 2025-11 | nonverbal tags; audio conditioning | ~4.4 GB VRAM, CUDA |
| Zonos | Apache-2.0 | not stated | 7.2k / 2025-03 | happy/angry/sad/fear controls | 6 GB VRAM minimum |
| IndexTTS2 / 2.5 | **custom bilibili licence** | not separate | 25.2k / 2026-09 | richest: 8-value emotion vector, emotion reference audio | licence must be read before any commercial use |
| Sesame CSM 1B | Apache-2.0 | gated, not stated | 14.8k / 2025-05 | none | CUDA |
| Fish Speech / OpenAudio | **custom community licence** | **research licence** | 33.8k / 2026-11 | tags `[whisper]` `[angry]` | **not commercial-clear** |
| Higgs Audio | Apache-2.0 | v2 not stated; **v3 non-commercial** | 8.4k / 2026-06 | v3 prosody control | v3 out |
| XTTS-v2 (Coqui) | MPL-2.0 | **CPML, non-commercial** (from memory, not re-verified) | 46.3k / **2024-08, stale** | reference audio | out |
| F5-TTS | MIT | **CC-BY-NC** | 15.6k / 2026-11 | — | **out: non-commercial** |
| VibeVoice (Microsoft) | MIT | not stated | 57.3k / 2026-10 | — | TTS code removed from the repo 2025-09 |

Not checked: StyleTTS2, Parler-TTS, OpenVoice, MegaTTS3.

## Hosted (paid keys: proposals, never assumed; ADR 0002)

| Option | Price | Expressive control | Timestamps | Risk |
|---|---|---|---|---|
| ElevenLabs v3 | $0.08 / 1K chars (verified pricing page): ~$0.07 per narrated minute | audio tags, the strongest | character-level (`convert-with-timestamps`) | paid; output's commercial terms on the free plan not stated |
| OpenAI gpt-4o-mini-tts | ~$0.015 / min (third-party estimate) | `instructions` (tone, emotion) | none | **its own page shows a shutdown banner dated 2027-01-06** |
| Cartesia Sonic 3 | ~$0.037 / 1K chars (unverified) | `emotion` parameter | word-level | unverified price |
| Fish Audio API | $15 / M bytes (search snippet) | tags | — | no commercial statement found |
| Hume Octave | — | — | — | a snippet claims TTS ends 2026-11-13; **unconfirmed**, do not build on it |

## The researcher's ranking (commercial, zero-key preferred, expressive)

1. ElevenLabs v3 (paid, ~$0.07/min) 2. OpenAI gpt-4o-mini-tts (cheap; shuts down 2027-01-06; no timestamps, our `align.py` covers that)
3. Chatterbox (only open option with an emotion knob; weights licence unstated) 4. Kokoro (clean licence, CPU-light, flat)
5. Orpheus (tags; weights licence unstated). **Next step: read the weights licences of Chatterbox, Orpheus, Dia and Zonos on Hugging Face,
then a blind A/B on one Part 3 line.**
