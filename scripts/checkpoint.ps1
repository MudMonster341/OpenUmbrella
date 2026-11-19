<#
.SYNOPSIS
  End-of-work-chunk commit and push. Windows PowerShell 5.1 compatible.

.DESCRIPTION
  Part of the `project-memory` discipline. Run this AFTER you have:
    1. appended a dated entry to MEMORY.md
    2. added any new ADRs under decisions/
    3. appended any new ERRORS.md entries
    4. refreshed CONTEXT.md if the current state changed

  This script does step 5: stage, commit with a conventional-commit message, push.

  It FAILS LOUDLY (non-zero exit + explicit message) when it cannot push — no remote, no
  upstream, detached HEAD, missing credentials, rejected push. The local commit is made first,
  so a failed push never loses work.

  It NEVER uses --force or --no-verify. If a hook rejects the commit, fix the hook's complaint.

  Exit codes: 0 ok · 1 usage/not a repo · 2 MEMORY.md check failed · 3 cannot push
              4 commit failed · 5 push failed

.PARAMETER Summary
  The commit subject. Describe the work chunk, not the files.

.PARAMETER Type
  Conventional-commit type. Default: chore.

.PARAMETER Scope
  Conventional-commit scope. Default: checkpoint.

.PARAMETER DocsOnly
  Stage only CONTEXT.md, MEMORY.md, ERRORS.md and decisions/.

.PARAMETER DryRun
  Show what would happen; change nothing.

.PARAMETER SkipMemoryCheck
  Skip the MEMORY.md discipline check. Use only when genuinely warranted.

.EXAMPLE
  .\scripts\checkpoint.ps1 "wire up the DuckDB ledger"

.EXAMPLE
  .\scripts\checkpoint.ps1 -Type feat -Scope eval "add paired bootstrap CI"
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]] $Summary,

    [string] $Type = 'chore',
    [string] $Scope = 'checkpoint',
    [switch] $DocsOnly,
    [switch] $DryRun,
    [switch] $SkipMemoryCheck
)

function Stop-Checkpoint {
    param([string] $Message, [int] $Code = 1)
    Write-Host ''
    Write-Host '=== CHECKPOINT FAILED ===' -ForegroundColor Red
    Write-Host $Message -ForegroundColor Red
    Write-Host ''
    exit $Code
}

$summaryText = ''
if ($Summary) { $summaryText = ($Summary -join ' ').Trim() }
if (-not $summaryText) {
    Stop-Checkpoint @'
No summary given.

  Usage: .\scripts\checkpoint.ps1 "summary of this work chunk"

  The summary becomes the commit subject. Describe the chunk, not the files.
'@ 1
}

# --- repo -------------------------------------------------------------------
$null = git rev-parse --is-inside-work-tree
if ($LASTEXITCODE -ne 0) {
    Stop-Checkpoint @'
Not inside a git repository.

  Run this from within the project. If the project is not a git repo yet, initialise it and
  add a remote first - a checkpoint that cannot be pushed is not a checkpoint.
'@ 1
}

$root = (git rev-parse --show-toplevel).Trim()
Set-Location -LiteralPath $root

$null = git rev-parse --verify --quiet HEAD
$hasHead = ($LASTEXITCODE -eq 0)

# --- MEMORY.md discipline check --------------------------------------------
if (-not $SkipMemoryCheck) {
    $today = Get-Date -Format 'yyyy-MM-dd'
    $memoryPath = Join-Path $root 'MEMORY.md'

    if (-not (Test-Path -LiteralPath $memoryPath)) {
        Stop-Checkpoint "MEMORY.md not found at $root.

  This project has not been bootstrapped for project-memory. Create CONTEXT.md, MEMORY.md,
  ERRORS.md and decisions/ first, or re-run with -SkipMemoryCheck." 2
    }

    $hasTodayEntry = Select-String -LiteralPath $memoryPath -Pattern "^## $today" -Quiet
    if (-not $hasTodayEntry) {
        Stop-Checkpoint "MEMORY.md has no entry dated $today.

  A checkpoint without a memory entry is just a commit. Append an entry beginning:

      ## $today - <short title of this work chunk>

  Then re-run. To checkpoint anyway, re-run with -SkipMemoryCheck." 2
    }

    if ($hasHead) {
        # --porcelain, not `git diff HEAD`: an untracked MEMORY.md does not appear in a diff.
        $memoryStatus = @(git status --porcelain -- MEMORY.md | Where-Object { $_ })
        if ($memoryStatus.Count -eq 0) {
            Stop-Checkpoint @'
MEMORY.md is unchanged since the last commit.

  Today's entry was already committed; this work chunk has no entry of its own. Append a new
  dated entry for it, or re-run with -SkipMemoryCheck.
'@ 2
        }
    }
}

# --- what to stage ----------------------------------------------------------
if ($DocsOnly) {
    $pathspec = @('--', 'CONTEXT.md', 'MEMORY.md', 'ERRORS.md', 'decisions')
} else {
    $pathspec = @('--', '.')
}

# --- push target, checked BEFORE committing so the failure is predictable ----
$branch = (git symbolic-ref --quiet --short HEAD)
$detached = ($LASTEXITCODE -ne 0)
if ($branch) { $branch = $branch.Trim() }

$pushBlocker = ''
$remote = ''
$upstream = ''

$remotes = @(git remote | Where-Object { $_ })

if ($detached -or -not $branch) {
    $pushBlocker = "HEAD is detached - there is no branch to push.`n  Check out a branch (git switch -c <name>) and re-run."
    $branch = 'HEAD'
} elseif ($remotes.Count -eq 0) {
    $pushBlocker = @'
This repository has no git remote.
  Add one, then re-run:

      git remote add origin https://github.com/<user>/<repo>.git
'@
} else {
    # for-each-ref never writes to stderr and is empty when there is no upstream
    $upstream = (git for-each-ref --format='%(upstream:short)' "refs/heads/$branch")
    if ($upstream) { $upstream = $upstream.Trim() }

    if ($upstream) {
        $remote = $upstream.Split('/')[0]
    } elseif ($remotes -contains 'origin') {
        $remote = 'origin'
    } else {
        $remote = $remotes[0]
    }
}

# --- dry run ----------------------------------------------------------------
$subject = "$Type($Scope): $summaryText"

if ($DryRun) {
    Write-Host '[dry run] would stage:'
    git status --short @pathspec
    Write-Host "[dry run] would commit: $subject"
    $remoteLabel = '<none>'
    if ($remote) { $remoteLabel = $remote }
    Write-Host "[dry run] would push to: $remoteLabel $branch"
    if ($pushBlocker) { Write-Host "[dry run] push would FAIL: $pushBlocker" -ForegroundColor Yellow }
    exit 0
}

# --- stage ------------------------------------------------------------------
git add -A @pathspec
if ($LASTEXITCODE -ne 0) { Stop-Checkpoint 'git add failed; nothing was committed.' 1 }

# --- commit -----------------------------------------------------------------
if ($subject.Length -gt 72) {
    Write-Host "warning: commit subject is $($subject.Length) chars (>72). Consider a shorter summary." -ForegroundColor Yellow
}

$null = git diff --cached --quiet
$nothingStaged = ($LASTEXITCODE -eq 0)

if ($nothingStaged) {
    if (-not $hasHead) { Stop-Checkpoint 'Nothing staged and no commits yet - there is nothing to checkpoint.' 1 }
    Write-Host 'Nothing staged; skipping commit.'
} else {
    # No --no-verify: hooks are part of the project's quality gate.
    git commit -m $subject
    if ($LASTEXITCODE -ne 0) {
        Stop-Checkpoint @'
git commit failed.

  Nothing has been pushed. If a pre-commit hook rejected this, fix what it reported and re-run.
  Do not bypass hooks with --no-verify.
'@ 4
    }
    Write-Host "Committed: $subject" -ForegroundColor Green
}

# --- push -------------------------------------------------------------------
# NEVER `git push` this branch: the GitHub repo is public and local commits hold our stories (scripts, narration, plot).
# Code goes out only through tools/publish/publish_code.py, which strips every story path, scans for story words and media,
# pushes a separate public branch (origin/code-only) and verifies the remote. (The user, 2026-11-16: "push code, keep story local".)
python tools/publish/publish_code.py
$rc = $LASTEXITCODE
if ($rc -eq 0) { Write-Host "Checkpoint complete: committed locally; code published to origin/code-only." -ForegroundColor Green; exit 0 }
if ($rc -eq 1) { Stop-Checkpoint "Committed locally, but the publish checks BLOCKED the push (story words, media or a large file in the code tree).
  Read the list above, add the path to tools/publish/private_paths.txt or remove the words, commit, and re-run." 6 }
Stop-Checkpoint "Committed locally, but the push failed. Your work is safe in the local commit. See the error above." 5
