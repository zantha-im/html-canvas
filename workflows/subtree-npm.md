---
description: Install npm libraries for .windsurf/review (Windows cmd)
auto_execution_mode: 3
---

This workflow installs the review tooling dependencies located under `.windsurf/review/` using lockfile-accurate installs. It assumes a Git-bootstrapped `.windsurf/` subtree exists.

1) Preconditions
- Ensure `.windsurf/review/` exists and contains `package.json` (and preferably `package-lock.json`).
- Node and npm must be available on PATH.

2) Validate directory structure
- Verify file presence:
  - `.windsurf/review/package.json`
  - `.windsurf/review/package-lock.json` (recommended)

// turbo
3) Install dependencies (preferred: lockfile-accurate)
- Run from the project root with CWD set to `.windsurf/review/`:
  - CWD: `.windsurf\review\`
  - Command:
    ```cmd
    cmd /c npm ci
    ```

4) Alternative install from project root using prefix
- Command:
  ```cmd
  cmd /c npm ci --prefix .windsurf\review
  ```
- Note: The CWD method in step 3 is the most reliable. Use `--prefix` only if needed.

5) Fallback when lockfile is missing
- If `package-lock.json` is absent, use:
  ```cmd
  cmd /c npm install
  ```
  - CWD: `.windsurf\review\`

6) Verify installation
- Confirm Node and npm versions:
  ```cmd
  cmd /c node -v
  cmd /c npm -v
  ```
- Optional sanity check (ensures subtree tools run):
  ```cmd
  cmd /c node .windsurf\tools\schema-query.js --help
  ```

7) Notes
- Use Windows cmd quoting rules. Prefer no-spaces commit messages if committing changes later.
- If you encounter permission or cache issues, try a clean install:
  ```cmd
  cmd /c npm ci --no-audit --no-fund
  ```