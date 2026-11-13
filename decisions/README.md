# Decisions

Numbered, immutable architecture decision records. One decision per file. Numbers are allocated in
order and **never reused or renumbered** — links point at numbers.

An accepted ADR receives exactly one kind of later edit: flipping `status` to
`superseded by NNNN`. To change a decision, write a new ADR that supersedes the old one.

Template: [0000-template.md](0000-template.md) — never numbered as a real decision.

| # | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-openmontage-as-production-spine.md) | OpenMontage is the production spine | accepted | 2026-11-12 |
| [0002](0002-zero-key-local-first-default.md) | Zero paid API keys is the default operating mode | accepted | 2026-11-12 |
| [0003](0003-approval-gate-for-third-party-code.md) | No third-party code enters without explicit per-item approval | accepted | 2026-11-12 |
| [0004](0004-voicestudio-as-narration-engine.md) | VoiceStudio replaces Piper as the narration engine | accepted | 2026-11-12 |
| [0005](0005-project-root-owns-the-system.md) | The project root owns the system; third-party repos are disposable vendor clones | accepted | 2026-11-12 |
| [0006](0006-stylized-3d-over-photoreal.md) | Stylized 3D, not photoreal | accepted | 2026-11-12 |
| [0007](0007-build-continuous-camera-in-house.md) | Build the continuous-camera rig in house | accepted | 2026-11-12 |
| [0008](0008-learn-styles-then-author-our-own.md) | Study restricted style libraries, author our own style | **superseded by 0011** | 2026-11-12 |
| [0009](0009-in-house-before-adoption.md) | Build in house first; adopt only what is clearly better and unencumbered | accepted | 2026-11-12 |
| [0010](0010-install-reference-repos-with-a-boundary.md) | Install the reference repos locally, with a stated non-commercial boundary | accepted | 2026-11-13 |
| [0011](0011-use-lemo-opuscar-styles-non-commercially.md) | Use lemo-opuscar styles directly; these films are non-commercial | accepted | 2026-11-13 |

## Why a directory and not one `DECISIONS.md`

A single growing file cannot be append-only in practice — every edit touches the whole file, merge
conflicts land on top of each other, and nothing can be linked to by number. Numbered files make
each decision addressable, independently supersedable, and cheap to read in isolation.
