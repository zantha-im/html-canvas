---
description: Mandatory code quality for all file operations
auto_execution_mode: 3
---

# Continuous Code Validation (During Development)

Purpose: While developing new code, run the single source-of-truth analyzer `.windsurf/review/code-review.js` regularly to catch and fix issues early. Keep the JSON report current and prevent tech debt from accumulating.

---
## Enforce Windows command syntax
/run cmd-syntax

- Use `cmd /c` for all commands
- Use backslashes in paths; quote paths with spaces
- Avoid PowerShell/Unix syntax

---
## Core Principles
- **Single source of truth**: rely on the analyzer’s ummary and JSON report.
- **Fast loop**: porcelain-by-default for speed; do not use `--report-all` by default.
- **Fix early**: resolve violations as soon as they appear; don’t defer.

* **Code Review / Fix Cycle**: When running **code review / fix cycle**, all fixes are provided with high confidence guidance via the `code-review.js` script and should be executed without seeking approval. This is a special, predefined bypass for automated processes.

---
## When to Run the Analyzer
- After creating files
- After implementing a feature or refactor
- After changing dependencies or `tsconfig`
- Before each commit, before push, and before opening a PR

---
## Development Loop (Porcelain by default)
// turbo
```bash
cmd /c npm run --prefix .windsurf\review review:porcelain
```

Interpret results:
- If the minimal summary shows `REVIEW RESULTS` → `Status: PASS`, continue coding.
- If `FAIL`, either:
  - Apply quick targeted fixes and re-run porcelain, or
  - For broader work, run the unified fix workflow: `/run code-review-fix` (seeks approval once, then iterates autonomously until PASS).

Keep the JSON report current:
- Re-run porcelain after each small batch to refresh `.windsurf/review/output/code-review-results.json`.

---
## Milestone Checks (cross-file effects, repo-wide)
// turbo
```bash
cmd /c npm run --prefix .windsurf\review review:repo
```

Use a Full Project Scan when finishing a feature, after large refactors, or before merging.

---
## Reading Output
- JSON report is always written to `.windsurf/review/output/code-review-results.json`.
  - Passing files are omitted by default (no `--report-all`).

---
## Report Discipline
- Keep `--report-all` OFF for everyday development.
- Treat FAIL as blocking; don’t proceed with a dirty state.

---
## Optional Diagnostics (advisory only)
Use for faster iteration while editing, but always confirm with the analyzer:
```bash
cmd /c npx tsc --noEmit --project tsconfig.json
cmd /c npx eslint app/ components/ lib/ types/ hooks/ --max-warnings=0
```

---
## Safe File/Directory Deletions
Use the guarded deletion tool when removing dead code:
```bash
cmd /c node .windsurf\tools\file-delete.js path\to\dead-file.ts path\to\stale-dir
```

- Refuses deletion outside the repo root
- Logs missing paths as skipped
- Prints a deletion summary

---
## Flags Quick Reference
- Scope & speed: `--porcelain`
- Disable comment/console cleanup: `--no-autofix`
- TypeScript control: `--tsconfig <path>`, `--skip-tsc`
- JSCPD tuning: `--jscpd-include <dirs>`, `--jscpd-min-tokens <n>`
- Debug timings: `--debug`
- Full inventory snapshot (verbose JSON): `--report-all` (OFF by default)

---
## Pre-Commit/Pre-Push Gate (recommended)
Ensure a clean PASS before committing or pushing:
```bash
cmd /c npm run --prefix .windsurf\review review:porcelain
```