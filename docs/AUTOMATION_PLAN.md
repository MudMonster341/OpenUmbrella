# Automation plan: one-shot scripts, fewer tokens — PAUSED 2026-11-18

**Status: paused by the user (2026-11-18): "STOP and wait for now, lets make the reel first and render it, then we can do this,
just plan and then we can see".** The context had also passed 200k. This file records what is done, what is planned, and the
order to resume in. Nothing below is approved beyond what is marked done.

## Done (commit e0baf08, 2026-11-18)

New scriptcheck checks, from the script history's lessons that can be measured. Each was proven on a planted fault in
`tools/scriptcheck/selftest.py`, which now runs **41/41**.

| Id | Rule | Source |
|---|---|---|
| N1 | The ending has two answers, each on its own line in the dilemma section. Each line says its half and states its cost | STORY P2.19, P2.8 #3 |
| N2 | The end card names both answers | STORY P2.20 #7: the card named one answer and tilted the vote |
| R4 | The hook device and the ending's shape differ from every earlier part's. A repeat the user chose goes in `allow_repeat` with a reason, and then only warns | STORY P2.5 #18, P2.20 #14 |
| L5 | This part's days ledger starts where the previous part's ended | STORY 7b B1: arithmetic broke at a seam |
| L6 | No price is below the previous part's highest | Rule 4 as the viewer heard it: "each costs more" |
| S6 | The length estimate uses a measured pace: within 8% of the previous part's words per timeline second | STORY 7c/7e: the template's 2.5 w/s was wrong |
| T6 | No regional or jargon words in spoken lines (`allow_words` escape) | ERR-0011 |
| T7 | No "last time" or similar phrases that tell a cold viewer they missed something | STORY P2.15 #4 |
| K3 | Every clock time shown or said is on the part's declared `clock` | The user, 2026-11-16: "all should be documented" |
| A5 | A script's declared timing file speaks its words | ERR-0023, ERR-0024 |

- **`"schema": 2`** makes the new keys required, so a missing key FAILs. Older scripts only get warnings, so approved Part 1 and Part 2 are not re-gated.
  - **Part 2 still PASSES** (0 fail, 6 warn), so `ship.py`'s scriptcheck step is unchanged for the build in progress.
  - **Part 1 still FAILS V4b, H1 and H3.** Those rules were written after Part 1 was posted; this is not new.
- **Guard G12** checks that every `lab/timing*.js` matches exactly one part's script, word for word. ERR-0023 and ERR-0024 now name it.
  - G5 was the guards' one FAIL before this work. It now passes, apart from the old ERR-0015 "pending" warning. `check_guards.py`: GUARDS PASS.
- **A slip of mine, flagged:** a Python heredoc turned the `\b` in G5's new regex into a raw backspace character. I found it by reading the bytes and fixed it.
  - **Open question:** G8, the control-character guard, should have caught this. I did not test whether it would. Test it before relying on G8.
- **G5 limitation:** check ids are shared across tools (`A5` exists in both autoreview and scriptcheck). G5 only proves an id exists somewhere, not in the right tool.

## Planned, not started

1. **`docs/SCRIPT_PLAYBOOK.md`**: every user note and edge case as a numbered rule. Each rule gets its source and either the check id above or the word "judgement". It also gets a pre-flight checklist and a fill-in order.
   - Story-specific examples go to a private file (`market_research_and_intelligence/story/`, already in `private_paths.txt`).
   - The sources are read: STORY 7-7i and P2.1-P2.20, MEMORY 2026-11-14..18, FEEDBACK.md, ERRORS, the drafts, the template and the skill.
   - The key lesson, from P2.18: simplify the plot, don't patch it, after each critic round.
2. **`docs/SYSTEM_MAP.md`**: Mermaid diagrams of story → script → checks → voice → timing → sound → lab → ship → review → post.
   - It will cover every file and every check id, derived from the code. The ids are already collected: autoreview V1-V13, C1, P1-P3, H1-H5, A1-A9, S1-S4, D1-D2, E0-E3; guards G1-G12; ig_check; the lab gates; the hooks.
   - Then link it from CLAUDE.md and docs/CHECKS.md, and publish a private Artifact page.
3. **The rest of this audit**, step by step: what is one command, what the agent still does by hand, and the ranked candidates. The ones seen so far:
   - a `story_ledger` export that writes the STORY.md tables from the JSON, which `--md` half does;
   - autoreview D1/D2 for later parts (ROADMAP D19);
   - a render-side V4b;
   - a stage-gate runner (scriptcheck → critic → voice → align → timing → G12) as one command.
4. **Housekeeping found:**
   - `STORY_TEMPLATE.md` still says 2.5 w/s, 60-130 s and a 0-4 s hook. All are superseded.
   - FEEDBACK.md's last row says `check_cast.mjs` is not built. It is, since commit b16b5a7.
   - `docs/CHECKS.md` does not list the new ids or G12.

**Resume order, after the reel is rendered:** 4 (the stale docs) → 1 → 2 → 3.
