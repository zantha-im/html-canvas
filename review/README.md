# Review Subtree

Self-contained code review tooling located in `.windsurf/review/`. All dependencies and configs are local to this folder for subtree portability.

## Highlights
- Type-aware ESLint with local config: `.eslintrc.review.cjs`
- Inlined TypeScript configs: `tsconfig.eslint.json`, `tsconfig.review.json` (no root extends)
- Repo-wide analyzers: ESLint, TSC, Knip, JSCPD
- Analyzer writes report to: `.windsurf/review/output/code-review-results.json`
- Policy: ESLint warnings are treated as failures (`--max-warnings=0`)

## Quick start
For first-time setup, see repo `README.md` → Quick start:
- Run workflow: `/subtree-pull` (Bootstrap), then `/subtree-npm`.

## Running (Windows cmd)
From repo root (preferred, using `--prefix`):
```cmd
cmd /c npm --prefix .windsurf\review run review:porcelain  // Changed TS/TSX files only (git porcelain)
cmd /c npm --prefix .windsurf\review run review:repo       // Full project scan under app/, components/, lib/, hooks/, types/, pages/
cmd /c npm --prefix .windsurf\review run review:debug      // Full scan with debug output and report-all
cmd /c npm --prefix .windsurf\review run tsc               // TypeScript diagnostics only (noEmit)
cmd /c npm --prefix .windsurf\review run lint:repo         // ESLint only, repo-wide
```

From inside `.windsurf/review/` (alternative):
```cmd
cmd /c npm run review:porcelain
cmd /c npm run review:repo
cmd /c npm run review:debug
cmd /c npm run tsc
cmd /c npm run lint:repo
```

## ESLint (project configuration only)

The review tool now uses your repository's ESLint configuration exclusively. This mirrors CI/Netlify behavior and prevents configuration drift.

- Invocation: ESLint is executed in batch across analyzed files using your project config resolution (no forced `--config`).
- Ignores: Your `.eslintignore` and normal ignore resolution are honored (we do not pass `--no-ignore`).
- Scope: TypeScript focus via `--ext .ts,.tsx`.
- Cache: `.windsurf/review/output/.tmp/eslint/project.cache`.

Missing project ESLint config

- If no project ESLint config is found (e.g., no `.eslintrc.*`, `eslint.config.*`, or `eslintConfig` in `package.json`), linting is skipped:
  - A stdout message is printed: `Project ESLint config not found; ESLint step skipped.`
  - The JSON report includes a repo warning with the same text.
  - The review run does not fail solely due to missing ESLint configuration.

Failure handling

- If ESLint batch execution fails (non-zero exit outside normal lint errors) or the JSON is unparsable, the review fails and reports the ESLint error. There is no per-file fallback.

### Troubleshooting
- **Error: `npm error Missing script: "review:repo"`**
  - Cause: running from repo root without `--prefix`.
  - Fix: either run within `.windsurf\review\`, or from root with:
    ```cmd
    cmd /c npm --prefix .windsurf\review run review:porcelain
    ```
  
- **Dependencies missing**
  - From repo root:
    ```cmd
    cmd /c npm --prefix .windsurf\review ci
    ```
  - Or run workflow: `/subtree-npm`

## Report output and schema

- The analyzer always writes a JSON report to: `.windsurf/review/output/code-review-results.json`.
- On violations, the report contains per-file issues and a minimal execution plan.
- On pass, `results` is an empty array and no execution plan is included.

### `results[].issues[]` (single source-of-truth checklist)

Each file in `results` includes a `relPath` and a list of `issues`. This list is the canonical, line-level checklist of everything to fix. An issue typically includes:

- `source` (e.g. `eslint`, `console`, `ts-heuristics`, `tsc`, `fallback`, `size`, `duplicates`)
- `type` (rule ID/category, e.g. `missing-return-type`, or ESLint rule)
- `line`, `column`
- `message`
- `guidance` (what to do)
- Optional ESLint fields where available: `rule`, `endLine`, `endColumn`, `fixable`

Consumers (including fixer agents) should use `results[].issues` as the only checklist to apply code changes. No other section duplicates these details.

### `executionPlan` (minimal orchestration)

When violations exist, a minimal `executionPlan` is included to guide process, not content:

- `primaryInstruction`: Explicit permission to complete all tasks without seeking further approval; use `results[].issues` as the single checklist; treat the plan as one authorized unit; finish with a repo‑wide rerun to verify no regressions.
- `strategy`: Short summary of the order of operations.
- `steps`: Exactly two global steps
  1. Apply all fixes for `results[].issues` across all files.
  2. Re-run a repo-wide review (Windows hint included):
     `cmd /c node .windsurf\review\code-review.js`

Notes:

- The execution plan no longer repeats per-file/per-category details to avoid any risk of “duplicate” or “stale” interpretations. It provides orchestration only.
- The console output remains a high-level summary; the JSON is the authoritative data payload.
 - `--debug` is available for verbose runs but is not required for a repo-wide run.

### Example (trimmed)

```json
{
  "summary": { "status": "fail" },
  "results": [
    {
      "relPath": "src\\components\\_tests\\bad.ts",
      "issues": [
        { "source": "console", "type": "error", "line": 5, "message": "console.error('fail-fast violation');", "guidance": "Replace console.error with thrown error" },
        { "source": "ts-heuristics", "type": "missing-return-type", "line": 3, "message": "Add explicit return type for demo", "guidance": "Add explicit return types to exported/public functions and callbacks." }
      ]
    }
  ],
  "executionPlan": {
    "primaryInstruction": "Complete all tasks without seeking further approval...",
    "strategy": "Fix all results[].issues then run repo-wide review.",
    "steps": [
      { "level": "global", "category": "fix", "summary": "Apply all fixes for results[].issues" },
      { "level": "global", "category": "review", "summary": "Re-run repo-wide review", "commandHintWindows": "cmd /c node .windsurf\\review\\code-review.js" }
    ]
  }
}
```

## ESLint cache
ESLint caching is enabled for both batch and per-file runs to speed up repeat analyses.

- Cache location: `.windsurf/review/.eslintcache`
- VCS: the cache file is ignored by `.windsurf/review/.gitignore`
- Effect: unchanged files are skipped by ESLint on subsequent runs

Clear the cache if needed:

```cmd
cmd /c del .windsurf\review\.eslintcache
```

## Performance tips
- **Concurrency**
  - Default is 8. Increase if your machine has spare CPU; decrease on CI/shared runners to reduce contention.
  - You can override explicitly via flag: `--concurrency <n>`.
- **When to clear the ESLint cache**
  - After changing ESLint/TypeScript config, parser options, plugin versions, or when results appear stale.
  - After large refactors or file moves if caching seems to miss updates.
- **Warm vs cold runs**
  - First run after a clean checkout or config change is a cold run; subsequent runs benefit from the cache.

## Notes
- Tools resolve plugins/binaries relative to this folder; no global installs required.
- ESLint uses `tsconfig.eslint.json` for type-aware rules; TSC uses `tsconfig.review.json`.
- The analyzer exits non-zero if any violations are found (including warnings).
