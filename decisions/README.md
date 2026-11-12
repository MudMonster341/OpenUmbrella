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

## Why a directory and not one `DECISIONS.md`

A single growing file cannot be append-only in practice — every edit touches the whole file, merge
conflicts land on top of each other, and nothing can be linked to by number. Numbered files make
each decision addressable, independently supersedable, and cheap to read in isolation.
