# Character animation and facial expression options (researched 2026-11-19, NOT yet decided)

**Why:** the user, 2026-11-19: the characters "are too choppy, the whole character design needs to improve, different motions, better
animated", and "expressions and emotions of the people". Researched by a `market-researcher` agent (Haiku) the same day. **Not spot-checked
by the main session. Nothing installed or downloaded** (rule 1). Our renderer: three.js, every frame a pure function of T, so motion must be
baked to clips offline, never simulated live.

| Option | Licence (code / assets or weights) | Account or key | Hardware | Main risk |
|---|---|---|---|---|
| Quaternius Universal Animation Library 1-2 | CC0 assets | none | none | stylised, generic; check any bundled third-party mocap |
| Mixamo | commercial use in rendered video allowed, raw redistribution banned (a 2022 community post, **not Adobe's own terms**) | Adobe account | none | read the current Adobe terms first |
| VRM 1.0 / VRoid avatars | per-model licence fields | none | none | expression presets (happy, angry, sad, relaxed, surprised, visemes, blink, lookAt); **many models forbid commercial use** |
| NVIDIA Audio2Face-3D | SDK MIT; models "NVIDIA Open Model" | possibly NGC/HF login | GPU, VRAM not stated | audio-driven faces; output format and ARKit mapping unverified |
| Rhubarb Lip Sync | MIT (secondary sources) | none | CPU | mouth shapes A-H/X only, we write the morph mapping |
| NVIDIA Kimodo (text-to-motion) | Apache-2.0 code; mostly NVIDIA Open Model weights, one R&D checkpoint | none | ~17 GB VRAM (<3 GB with the encoder on CPU) | SMPL-X/SOMA skeletons need retargeting |
| NVIDIA ARDY | Apache-2.0; NVIDIA Open Model | HF token + gated Llama 3 8B | ~14 GB VRAM | exports .npz only |
| HY-Motion 1.0 (Tencent) | **licence unresolved** | — | 24-26 GB VRAM | blocked until the LICENSE is read |
| MDM, MoMask, MotionGPT | MIT code | — | GPU | **trained on HumanML3D/AMASS: non-commercial data. Do not use for our output** |
| wav2arkit | **no licence shown** | — | CPU ONNX | blocked |
| Meta OVR Lipsync | unclear; end-of-life | — | — | Unity-only, poor fit |
| Ready Player Me | **shut down 2026-01-31** | — | — | gone |

**The researcher's top 5:** Quaternius (CC0) for body clips; Mixamo for range (terms to check); VRM 1.0 expression presets for faces
(per-model licence); Audio2Face-3D for audio-driven faces (GPU); Rhubarb for lip sync (mouth only). three.js side: `AnimationMixer`
crossfades between clips and morph-target tracks through the same mixer; both fit "a pure function of T" if every clip is sampled at T.
**The gap in our checks:** autoreview P2 measures motion per second, not choppiness; a per-joint snap/jerk check is the missing gate.
