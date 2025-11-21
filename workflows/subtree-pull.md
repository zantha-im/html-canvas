---
description: Pull the latest .windsurf subtree from the shared subtree repository
auto_execution_mode: 3
---

Prerequisites:
- Remote `windsurf_subtree` points to `https://github.com/zantha-im/.windsurf.git`.
- Start from a clean working tree. Exception: if the only change is `.windsurf/review/package-lock.json` from a prior install, proceed without prompting; this file can be safely overwritten by the pull. If there are other changes, stop and exit without proposing stash/commit workflows.

Execution rules:
- All steps marked `// turbo` must auto-run exactly as written. Do not insert additional checks (e.g., `git status`) or approval prompts.
- Non-interactive mode: do not narrate or justify steps; run commands and summarize results briefly at the end.
- Run steps exactly in the order listed; do not insert, remove, or reorder any steps.
- Do not propose alternatives like stash/commit/abort; either proceed (meets prerequisites) or stop (does not meet prerequisites).
- Do not run any pre-flight checks (including `git status`) beyond the commands specified.
- Do not gate on lockfile changes produced by step 4; treat them as expected and non-blocking.
- `npm install` in step 4 is explicitly approved and may download dependencies; do not prompt for confirmation and do not warn about funding/vulnerability summaries.
- Do not run `npm audit`, `npm audit fix`, or any npm tasks other than the specified `npm install` in step 4.

Steps:
1) Ensure the subtree remote exists (no-op if already present)
// turbo
cmd /c git remote get-url windsurf_subtree || git remote add windsurf_subtree https://github.com/zantha-im/.windsurf.git

2) Fetch the subtree remote
// turbo
cmd /c git fetch windsurf_subtree

3) Pull updates into `.windsurf/` using subtree with squash
// turbo
cmd /c git subtree pull --prefix=.windsurf windsurf_subtree main --squash

4) If the subtree's review dependencies changed, reinstall them (Windows)
// turbo
cmd /c (git diff --name-only HEAD~1 HEAD | findstr /I /C:.windsurf/review/package.json >nul) && npm install --prefix .windsurf\review || echo no-review-deps-change

Notes:
- `--squash` keeps the main repo history clean while updating only `.windsurf/` files.
- If merge conflicts occur, they will be confined to files under `.windsurf/`. Resolve and commit as usual. Do not attempt to stash around the pull.
- `npm install` in step 4 may update `.windsurf/review/package-lock.json`. Ignore this change; do not prompt and do not commit solely for it. Future subtree pulls can safely overwrite it.
- The subtree pull creates a merge commit; pushing is at the user's discretion and is outside this workflow.
- If you need to pull from a non-main branch, replace `main` with the desired branch.