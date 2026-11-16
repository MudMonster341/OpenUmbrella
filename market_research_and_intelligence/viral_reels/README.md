# Viral reels to learn from

The user sends popular reels (high views and likes) to study: the script, the hook, the structure and why each one works. The
user (2026-11-16): *"maintain a list of them ... later on, after our [Part 1] is done, we can use the /reel-analyzer ... and then
we go ahead. This way we can learn."*

- **`REELS.csv` is the sheet.** It has one row per reel. Tracking parameters are stripped from the URL. `status` is `queued`,
  `analysed` or `skipped`.
- **Not analysed yet, by the user's choice.** Analysis starts after Part 1 is finished, with the `reel-analyzer` skill (and
  `tools/reelkit` to ingest).
  - One file per reel: `analyses/R001.md`.
  - Each analysis ends with what we take from it as a rule or a check (the `auto-review` loop), and what we would never copy.
- **Their footage, frames and transcripts are third-party material.** They go under `research/`, which is gitignored and never
  committed or shipped. Only our notes live here.
- **Learn the structure, write our own** (CLAUDE.md: never copy a competitor's style or text).
