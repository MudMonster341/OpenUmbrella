#!/bin/sh
# install_hooks.sh — copy our git hooks into .git/hooks (they are not versioned there)
cp scripts/hooks/pre-push .git/hooks/pre-push && chmod +x .git/hooks/pre-push && echo "installed: pre-push (only code-only may be pushed)"
cp scripts/hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit && echo "installed: pre-commit (no story words in published files)"
