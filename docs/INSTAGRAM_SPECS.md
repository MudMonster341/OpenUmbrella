# Instagram Reels: the file we upload (checked 2026-11-17)

Enforced by `tools/ship/ig_check.py` (the `SPEC` table there; change both together). Made by `tools/ship/ship.py` as
`films/<slug>/renders/<name>_ig.mp4`. Looked up by the Haiku `market-researcher`; quotes are from Meta's pages as fetched.

| Item | Meta says | Our check |
|---|---|---|
| File size | "File size: 300MB maximum" (API reference) | ≤ 300 MB, and our **compact budget: ≤ 60 MB a minute** (~8 Mbit/s) |
| Duration | Reference: "15 mins maximum, 3 seconds minimum". Reels guide: "3 to 90 seconds" | 3-90 s (the stricter) |
| Container | "MOV or MP4" | MP4/MOV |
| Video | "HEVC or H264, progressive scan, closed GOP, 4:2:0"; guide: "Closed GOP (2-5 seconds)" | H.264/HEVC, yuv420p, progressive; we encode a closed 2 s GOP |
| Frame rate | Reference "23-60 FPS"; guide "24 to 60", "Fixed frame rate" | 24-60 |
| Size | "Maximum columns: 1920"; guide "1080 x 1920 (recommended)" | 9:16, long side ≤ 1920 |
| Video bitrate | "VBR, 25Mbps maximum" | ≤ 25 Mbit/s (we cap at 8) |
| Audio | "AAC, 48khz sample rate maximum", "1 or 2 channels", "Audio bitrate: 128kbps" | AAC, 48 kHz, ≤ 2 channels, ≤ 128 kbit/s |
| moov atom | "moov atom at the front of the file" | checked by reading the atoms |

Sources: developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media ("Reels
specifications") and developers.facebook.com/documentation/video-api/guides/reels-publishing. The Instagram Help Center page
held no specs. **Not verified:** the in-app limits (search snippets mention 20-minute in-app reels from late 2025; not read).
The two Meta pages disagree on duration and minimum frame rate; we use the stricter of each. Re-check if an upload is refused.
