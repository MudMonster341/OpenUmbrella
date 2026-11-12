# PLANS — roadmap and what is active

**Last updated:** 2026-11-12. Rewritten in place as phases complete; history lives in
[MEMORY.md](MEMORY.md).

---

## Active now — Phase 2: narration + motion craft

**Blocked on approvals.** Nothing is installed until each item is approved individually
([ADR 0003](decisions/0003-approval-gate-for-third-party-code.md)).

| # | Step | Status |
|---|---|---|
| 2.1 | Install VoiceStudio as the narration engine, verify a local render, compare against Piper on the same line | **Awaiting approval of the install method** |
| 2.2 | Decide the motion-design skill layer from the rated candidates in [docs/REPO_REGISTRY.md](docs/REPO_REGISTRY.md) | Awaiting approval |
| 2.3 | Build the house style token set (palette, type scale, motion curves) as `styles/custom/` | Not started |
| 2.4 | Write the automated checks the loop needs: frame-diff dead-frame scan, scene-change count, loudness measurement | Not started |

Step 2.4 matters more than it looks: without it, Gates 3 and 4 in [GOAL.md](GOAL.md) are opinion.

---

## Phase 3 — "Claude in Paris" (the north star)

Full brief and standards in [GOAL.md](GOAL.md). Executed through the six gates defined there.

| # | Step |
|---|---|
| 3.1 | Brief + emotional arc (Gate 0) |
| 3.2 | Beat sheet with per-beat seconds, motion and narration (Gate 1) |
| 3.3 | Character decision: stylized 3D figure vs 2D character composited into a 3D scene — prototype both cheaply before committing |
| 3.4 | Stylized Paris scene: low-poly diorama, one continuous camera path (Gate 2 stills) |
| 3.5 | Silent motion pass + automated checks + critic (Gate 3) |
| 3.6 | Narration, music, SFX, captions (Gate 4) |
| 3.7 | Measured standards table, human approval, ship (Gate 5) |

**Fallback if 3.4 stalls:** same story, smaller world — fewer landmarks, tighter arc, shorter
runtime. The quality bar does not move; the scope does.

---

## Phase 4 — freeze the house style

Extract from the Paris film whatever survived contact with the quality bar: colour tokens, type
scale, motion curves, camera rig, caption treatment, audio chain. Freeze as a reusable playbook
plus a workspace template so the next film starts from taste rather than from zero.

---

## Phase 5 — the series

Short films about using Claude and agents well. Candidates, roughly in order of how much they
teach us:

| Film | Form | Why it is worth making |
|---|---|---|
| "An agent is a loop, not a chatbot" | 9:16, 30s, animated diagram | The single most misunderstood idea; diagram animation is a different muscle from character work |
| "Me and Claude building something real" | 16:9, 60s, screen capture + motion overlay | Grounded and specific; exercises the `screen-demo` pipeline |
| "What actually happens when you type a prompt" | 16:9, 45s, process animation | Genuinely explanatory, reuses the diagram craft from film #1 |
| "The things I stopped doing manually" | 9:16, 25s, kinetic typography | Fastest to iterate; good for tuning pacing without 3D cost |

---

## Completed

### Phase 1 — foundation (2026-11-12) ✅

OpenMontage cloned and fully set up; FFmpeg, Remotion, HyperFrames, Piper and the Python
environment installed and verified; all three composition runtimes live; render chain proven with
three zero-key demos verified by ffprobe; project memory system established at the repo root.

Details: [MEMORY.md](MEMORY.md) · Setup reference: [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md)
