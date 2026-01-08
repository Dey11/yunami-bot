#!/bin/bash
set -e

# Loop until cherry-pick is done
while [ -f .git/CHERRY_PICK_HEAD ]; do
  echo "Processing cherry-pick..."
  
  # Attempt to checkout 'theirs' for modified files
  git checkout --theirs . 2>/dev/null || true
  
  # Handle "deleted by them" files - explicitly remove them to accept deletion
  # (These specific files were identified in the error logs)
  git rm bot/src/engine/outcome-engine.ts bot/src/engine/prologue-evaluator.ts bot/src/engine/vote-status.ts 2>/dev/null || true
  
  # Stage everything
  git add .
  
  # Commit/Continue
  # If continue fails (empty?), skip
  git cherry-pick --continue --no-edit || git cherry-pick --skip
  
  sleep 1
done

echo "Cherry-pick complete."

# Restore stash
if git stash list | grep -q "WIP Fixes"; then
  echo "Restoring stash..."
  git stash pop || echo "Stash pop had conflicts - please resolve manually."
fi
