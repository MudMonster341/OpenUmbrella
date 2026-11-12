# ERRORS

Append-only. Non-obvious failures only — where the symptom did not point at the cause, or where
the fix would not be rediscovered quickly. Newest at the bottom.

---

## ERR-0001 — Piper installed but the registry reports `tts: 0/19` (2026-11-12)

**Symptom:** `pip show piper-tts` reports version 1.8.0 installed, but OpenMontage's capability
preflight lists `tts: 0/19` and `piper_tts` appears under `unavailable` with
`"dependencies": ["cmd:piper"]`. No error is raised anywhere — a production would simply have had
no narration provider.

**Context:** Windows 11, OpenMontage venv at `OpenMontage/.venv`, running
`registry.provider_menu_summary()` through `.venv/Scripts/python.exe` **without activating the
venv**.

**Root cause:** The tool contract declares a dependency on the `piper` **command**, not the Python
package. `piper.exe` is installed into `.venv\Scripts\`, which is only on PATH when the venv is
activated. Invoking the venv's interpreter by path does not put `Scripts` on PATH, so the registry
probe correctly found no `piper` command.

**Fix:** Activate the venv (`.\.venv\Scripts\Activate.ps1`) before any production run or capability
check. Confirmed: with `Scripts` on PATH the registry reports `available: ['piper_tts']`.
Separately, a voice model must be downloaded — `python -m piper.download_voices --download-dir
~/.piper/models en_US-lessac-medium` — or the tool is present but mute.

**Recognise it next time:** A tool declares `cmd:<name>` rather than a package. Package installed ≠
command on PATH. Any `0/N` capability count where the package is definitely installed is this class
of problem.

---

## ERR-0002 — npm 11 silently skips esbuild's postinstall, leaving Remotion's bundler without a binary (2026-11-12)

**Symptom:** `npm install` in `remotion-composer/` completes successfully, but ends with
`npm warn allow-scripts 1 package has install scripts not yet covered by allowScripts:
esbuild@0.28.1 (postinstall: node install.js)`. Install reports success; nothing fails yet.

**Context:** Node v24.18.1, npm 11.16.0, fresh `npm install` of OpenMontage's Remotion composer.

**Root cause:** npm 11's allow-scripts policy blocks lifecycle scripts for packages not explicitly
approved. esbuild's postinstall is what places the platform-specific `esbuild.exe`. Remotion uses
esbuild to bundle compositions, so the failure would only have surfaced at render time, far from
its cause.

**Fix:** `npm approve-scripts esbuild` then `npm rebuild esbuild`. Verified `node_modules/@esbuild/*/esbuild.exe`
exists afterwards. A render then completed successfully.

**Recognise it next time:** An `npm warn allow-scripts` line is not cosmetic. Any package whose
postinstall fetches or links a native binary (esbuild, sharp, puppeteer, better-sqlite3) is broken
until approved, and the breakage appears later and elsewhere.

---

## ERR-0003 — winget-installed FFmpeg invisible to already-running shells (2026-11-12)

**Symptom:** `winget install Gyan.FFmpeg` reports "Successfully installed" and
"Path environment variable modified", but `ffmpeg -version` in the session's shells returns
`no ffmpeg in (...)`, and the modified PATH is absent from those shells.

**Context:** Windows 11, FFmpeg installed mid-session while the Claude Code app and its shells were
already running.

**Root cause:** winget writes to the **user** PATH in the registry. Processes inherit their
environment at launch, so every shell started before the install — including ones the app spawns,
since they inherit the app's environment — keeps the old PATH. The install is correct; the
environment is stale.

**Fix:** Restart the terminal/app for a permanent fix. Within a live session, prepend the directory
explicitly: `export PATH="$PATH:/c/Users/Mustafa/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin"`.

**Recognise it next time:** A tool installs successfully but is "not found" only in long-running
processes. Confirm by checking the user PATH in the registry
(`[Environment]::GetEnvironmentVariable("Path","User")`) — if the entry is there, it is a stale
environment, not a failed install.

---

## ERR-0004 — HyperFrames render fails on missing FFprobe but exits 0 (2026-11-12)

**Symptom:** `npm run render` in a HyperFrames project produces no MP4 and prints
`FFprobe is required to probe media assets. It ships with FFmpeg but was not found on PATH.` —
but the process **exits with code 0**, so a background job or CI step reports success. The only
evidence of failure is the absent output file.

**Context:** Windows 11, `films/paris-proto`, hyperframes 0.9.39, FFmpeg installed via winget but
not visible to the shell (see [ERR-0003](#err-0003)). `npm run check` and `snapshot` had both
succeeded moments earlier, because neither needs FFprobe.

**Root cause:** Two things compounding. The stale-PATH problem of ERR-0003, plus a tool that
treats a missing hard dependency as a soft failure. Earlier commands passing made it look like the
environment was fine — the dependency is only reached at encode time.

**Fix:** Prepend the FFmpeg bin directory to PATH for the render command, or restart the terminal
so the user PATH applies. Durably: a terminal restart fixes ERR-0003 and this with it.

**Recognise it next time:** A build or render step that "succeeds" instantly and produces no
artifact. **Check for the output file, never the exit code** — our own `filmcheck` takes a path
and fails loudly if it is absent, which is the behaviour to copy. Note that `check` and `snapshot`
passing does not prove the render chain is healthy; they exercise different dependencies.
