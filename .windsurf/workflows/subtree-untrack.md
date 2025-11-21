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

## Step 2: Update .gitignore
Add `.windsurf/` to your `.gitignore` file if it's not already there. You can do this manually or run:
```bash
cmd /c echo .windsurf/ >> .gitignore
```

## Step 3: Verify Changes
// turbo
```bash
cmd /c git status
```

You should see:
- `.gitignore` as modified
- `.windsurf/` no longer listed as tracked files

## Step 4: Stage and Commit
// turbo
```bash
cmd /c git add .gitignore
```

// turbo
```bash
cmd /c git commit -m "Remove .windsurf from tracking and add to gitignore"
```

## Step 5: Final Verification
// turbo
```bash
cmd /c git status
```

The `.windsurf/` directory should not appear in the output, confirming it's now ignored.

---

**Note:** If `.windsurf` was never committed to git, simply ensure `.gitignore` contains `.windsurf/` and you're done.
