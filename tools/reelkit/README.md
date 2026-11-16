# reelkit — pull a reference reel apart

Ours. Stdlib only, plus yt-dlp (in this tool's own venv) and FFmpeg.

Sibling of [`tools/filmcheck`](../filmcheck/): **filmcheck judges our renders against
[GOAL.md](../../GOAL.md); reelkit reads someone else's video and reports how it is built.**

```bash
python tools/reelkit/reelkit.py ingest <url> [--slug NAME] [--note "..."]
python tools/reelkit/reelkit.py analyse <file.mp4> [--slug NAME]
```

Output goes to `research/reels/<slug>/`, which is **gitignored on purpose** — the video is
someone else's copyrighted work. We study structure and never ship their frames, script,
timings or assets. CLAUDE.md rule 2.

## What it produces

| File | What it is |
|---|---|
| `source.mp4`, `source.meta.json` | The video and its platform metadata (uploader, counts, caption) |
| `specs.json` | Resolution, fps, duration, codecs, bitrate, vertical flag |
| `shots.json` | **The shot list** — every scene change with start, end and duration |
| `energy.json` | Per-second mean luma and frame-to-frame difference — the edit's rhythm |
| `hook/` | The first 3 seconds, every 0.25s. Short-form is decided here, so it gets its own dense strip |
| `shots/` | One frame per shot |
| `timeline/` | Ten evenly spaced frames, so a long reel is still skimmable |
| `REVIEW.md` | Template with the measured numbers filled in and the read left blank |

## Why a shot list is the point

"How long should a shot be" stops being taste the moment you have a hundred measured reels.
`shots.json` is the pacing evidence; `energy.json` is the rhythm. Neither tells you whether
the reel is good — that read goes in `REVIEW.md`, by **looking at the frames**, which is the
only method that has ever caught a framing defect on this project.

reelkit deliberately does not grade anything. Producing and judging stay separate
(CLAUDE.md rule 7).

## Setup

```bash
python -m venv tools/reelkit/.venv
tools/reelkit/.venv/Scripts/python.exe -m pip install yt-dlp
```

Verified 2026-11-13: yt-dlp 2026.10.26, venv at `tools/reelkit/.venv`.

## Known limits — read before trusting a failure

- **`instagram:user` is marked CURRENTLY BROKEN by yt-dlp itself.** You cannot enumerate an
  account's reels. Direct reel URLs (`instagram.com/reel/<shortcode>/`) use the healthy
  `Instagram` extractor and are the supported path.
- Private or login-walled posts will not download at all.
- Extractors break whenever a platform changes. A failure usually means "the platform moved",
  not "the URL is wrong".
- Downloading from Instagram is against their terms of service, whatever tool is used.
- **It reports the FILE, never an exit code** (ERR-0004) and finds a winget FFmpeg that a stale
  PATH hides (ERR-0003).
