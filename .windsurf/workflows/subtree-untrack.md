---
description: Remove .windsurf directory from git tracking while preserving local files
---

## Windows Command Syntax Reminder
**All commands must use `cmd /c` prefix with Windows-style syntax:**
- Use backslashes (`\`) for paths, not forward slashes
- Quote paths containing spaces
- Example: `cmd /c git rm -r --cached .windsurf`

## Step 1: Remove .windsurf from Git Tracking
// turbo
```bash
cmd /c git rm -r --cached .windsurf
```

This removes the directory from git's index without deleting the actual files on disk.

## Step 2: Verify Changes
// turbo
```bash
cmd /c git status
```

You should see:
- `.windsurf/` no longer listed as tracked files

## Step 3: Stage and Commit
// turbo
```bash
cmd /c git commit -m "Remove .windsurf from tracking"
```

## Step 4: Final Verification
// turbo
```bash
cmd /c git status
```

The `.windsurf/` directory should not appear in the output, confirming it's now ignored.

---

**Note:** If `.windsurf` was never committed to git, this workflow is not needed.
