# Usage audit: where our Claude usage goes, and what we changed (2026-11-17)

The user, 2026-11-17: *"i want to see repeated tasks, analyze and then fix them so its all extremely organized and streamlined,
of course all the repetitive tasks everything to be automated"*, and *"spend the absolute least number of tokens and make sure
the output is the same"*.

Measured with `python tools/audit/usage_audit.py` (ours, standard library, reads the local transcripts, prints command shapes
only). Re-run it after any big stretch of work and compare.

## What the numbers say (159 transcripts, 2026-11-12 to 2026-11-17)

| Measure | Value |
|---|---|
| Cache reads (the whole context, re-read on every API call) | **891M tokens** |
| Cache writes | 24.8M |
| Output (everything Claude wrote) | 4.1M |
| API calls | 2,934, mean context **304k tokens per call** |
| The single largest session | 862 calls, mean **514k** per call, peak 965k: **443M tokens, half of all usage** |
| The five largest sessions | **85%** of all cache reads |
| Subagents (42 runs) | 11% |
| Images read | 426 (each stays in the context for every later call) |
| Most-read files | CONTEXT.md 66 times, ROADMAP.md 59 |

**The cost is not the work, it is the context the work is done in.** Output is 0.5% of the tokens. A tool call late in a long
session re-reads ~500k tokens; the same call in a fresh session re-reads ~40k. Every small step (a `ls`, a status line, a check
that prints 200 lines) multiplies by the context size.

## The cases, rated by tokens saved, and what was done

| # | Repeated cost | Rating | Fix | State |
|---|---|---|---|---|
| 1 | **Long sessions.** One session ran 862 calls at ~514k each | 5 | `tools/guards/context_size.py`, a UserPromptSubmit hook: at 200k it advises batching; at 400k it says to hand off to a new session through `films/<slug>/HANDOFF.md`. CLAUDE.md "Working conventions" now says one milestone per session | **done**, pipe-tested both ways |
| 2 | **Hand-run ship chain.** Render, mux, probe, review, frames, contact sheet: ~12 calls per version, and the stale-master mistake (v4) came from doing it by hand | 5 | `tools/ship/ship.py films/<slug> vN`: gates, render outside the lab, mux, quiet review, a tile of every failure's frames, contact sheet, Instagram file, phone copy. One call, a ~15-line summary | **done**, run on v5 |
| 3 | **Checks that print everything.** check_bus 200 lines, check_crash_shot ~130, the reviewer 35, `hyperframes check` 100 warnings | 4 | Quiet by default (`--verbose` for the tables); `autoreview.py --quiet` prints failures only; ship.py writes full logs to `renders/logs/` | **done** |
| 4 | **Re-rendering 14 min for a one-shot fix**, and old renders bundled into each render (ERR-0022, 1.4 GB) | 4 | Renders go outside the lab (G11); `ship.py ... --start S --end E --fps 30` renders a span and tiles 8 frames | **done**; span mode not yet timed (a test was stopped) |
| 5 | **Pulling frames by hand for every failed check** | 3 | ship.py tiles the frames at every time a failing check names (`review/<name>_failures.png`) | **done** |
| 6 | **Story words caught only at publish** (blocked twice on 2026-11-17, each a fix-commit-retry round) | 3 | `scripts/hooks/pre-commit` runs `publish_code.py --check-staged` | **done**, proven on a planted name |
| 7 | **Start-of-session reading.** CONTEXT.md + ROADMAP.md ≈ 41k characters, read 125 times; MEMORY.md is 100k characters | 3 | Not done. Proposal: one short `STATUS.md` (≤ 60 lines) as the only start file; archive ROADMAP's finished phases | **open** |
| 8 | **Images.** 426 reads, often full-size sheets | 2 | ship.py's contact sheet is 180 px a shot; read the failure tile first, the full sheet only to judge | partly |
| 9 | **Status chatter and plan updates** (240 plan updates, "the user hasn't heard from you" turns) | 2 | Nothing to automate; fewer, longer steps (case 2) cut them | habit |
| 10 | **Web research in the main session** (WebFetch 164k, WebSearch 51k) | 2 | Already the rule: Haiku `market-researcher` (the Instagram specs on 2026-11-17 cost the main session one report) | in place |

## Instagram (the user, 2026-11-17: "i need it compact because otherwise it won't be able to upload on instagram")

Our 60 fps master is ~107 MB for 48.7 s (17.6 Mbit/s, AAC 192k, moov at the end). It **fails** Meta's Reels spec on audio bitrate
and the moov position, and our compact budget. ship.py now also writes `<name>_ig.mp4` (H.264 high 4.2, CRF 20 capped at 8 Mbit/s,
closed 2 s GOP, yuv420p, AAC 112k 48 kHz stereo, faststart): **33.1 MB, 17/17 checks** by `tools/ship/ig_check.py`, mean SSIM
0.988 against the render (worst frame 0.950). Specs and sources: [INSTAGRAM_SPECS.md](INSTAGRAM_SPECS.md).

Known: ffmpeg's AAC at `-b:a 128k` measured 136 kbit/s, over Meta's 128, so we encode at 112k.
