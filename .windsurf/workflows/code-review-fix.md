---
description: Unified code review + fix loop (seek approval once, then iterate to PASS)
auto_execution_mode: 3
---

## Unified Code Review + Fix Loop

Purpose: Run the single source-of-truth analyzer `.windsurf/review/code-review.js` and iterate fixes until a clean PASS. This workflow seeks approval once, then explicitly suspends the approval cycle while the fix-and-review loop runs to completion.

---
## 🚦 Start: Enforce Windows command syntax
/run cmd-syntax

- All commands must start with `cmd /c`
- Use backslashes in paths, quote paths with spaces
- Do not use PowerShell/Unix syntax

---
## 1) Approval Gate (one-time)
- I will propose the initial fix strategy based on the analyzer output (categories, ordering, batching).
- Upon your “proceed” approval, I will explicitly suspend the MANDATORY METHODOLOGY (Analyze → Report → Seek Approval → Execute) during the loop, and iterate autonomously until PASS is achieved.

---
## 2) Initial Analysis (Porcelain by default)
- Porcelain analyzes changed TS/TSX files across `app/`, `components/`, `lib/`, `hooks/`, `types/`.
- Autofix is ON by default (comment/console cleanup). Use `--no-autofix` to disable.

// turbo
```bash
cmd /c npm run --prefix .windsurf\review review:porcelain
```

- The tool prints a minimal summary and writes JSON to `.windsurf/review/output/code-review-results.json`.
- Do not use `--report-all` by default (keeps JSON focused on failing files).
- If summary shows PASS, stop here. Otherwise continue to Fix Loop.

To view the JSON report:
```bash
view_line_range .windsurf/review/output/code-review-results.json
```

---
## 3) Fix and Review Loop (methodology suspended after approval)
Principles:
- Use the analyzer’s JSON and stdout summary as the single source of truth.
- Work in small, logical batches (by category or small file sets).
- After each batch, re-run porcelain analysis to keep the report current.

Typical categories (driven by report content):
- TypeScript (compiler + analyzer)
- ESLint
- Knip (unresolved imports, unused files/exports/types/members)
- Duplicates (JSCPD)
- File size budgets
- Fallback data anti-patterns

Safe file/dir deletions when required (guarded to repo root):
```bash
cmd /c node .windsurf\tools\file-delete.js path\to\dead-file.ts path\to\stale-dir
```

Validate after each small batch (keep JSON current):
// turbo
```bash
cmd /c npm run --prefix .windsurf\review review:porcelain
```

Optional diagnostics while editing (advisory only; always confirm with the analyzer):
```bash
cmd /c npx tsc --noEmit --project tsconfig.json
cmd /c npx eslint app/ components/ lib/ types/ hooks/ --max-warnings=0
```

---
## 4) Final Validation & Completion
- Require a clean PASS in the minimal summary and an empty `results` array in the JSON (since `--report-all` is off).

// turbo
```bash
cmd /c npm run --prefix .windsurf\review review:repo
```

Completion checklist:
- REVIEW RESULTS shows `Status: ✅PASS`
- JSON `summary.status` is `pass` and `results` is empty
- Repo-wide checks all pass (Knip, JSCPD, TSC)
- No unintended changes pending in Git