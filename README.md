# .windsurf Subtree

Portable developer tooling and documentation shared across Windsurf projects. The `.windsurf/` folder is managed as a Git subtree pointing to an independent repository so that improvements can be pushed from one project and pulled into others without coupling main project history.

What this contains:
- `.windsurf/review/`: review tooling (ESLint, TypeScript, Knip, JSCPD, unified analyzer)
- `.windsurf/workflows/`: common workflows and runbooks
- `.windsurf/guides/`: guides and reference docs
- `.windsurf/tools/`: utility scripts

Policy and intent:
- Treat `.windsurf/` as a portable, shared subtree. Make improvements here, publish them upstream to the subtree repo, and consume them in other projects via subtree pulls.
- Keep your main project history independent by using `--squash` when adding/pulling.

Repository source (upstream of this subtree):
- Remote name: `windsurf_subtree`
- Remote URL: `https://github.com/zantha-im/.windsurf.git`

## Quick start

- New project (no `.windsurf/` yet):
  - Bootstrap manually (commands in Section 1 below)
  - After bootstrap, workflows become available; you can run `/subtree-npm` to install local npm deps

- Existing project (already has `.windsurf/`):
  - Run workflow: `/subtree-pull` (Update existing installation)

## 1) Getting started in a new project (no workflows yet)

Manual bootstrap:
```cmd
cmd /c git remote add windsurf_subtree https://github.com/zantha-im/.windsurf.git
cmd /c git fetch windsurf_subtree
cmd /c git subtree add --prefix=.windsurf windsurf_subtree main --squash
cmd /c npm --prefix .windsurf\review ci
```

Quick verification:
```cmd
cmd /c node .windsurf\tools\schema-query.js --help
```

After bootstrap:
- Workflows are now available under `.windsurf/workflows/`.
- You can run `/subtree-npm` if you didn’t already run the npm install step above.

## 2) Everyday use with workflows

Once the project contains `.windsurf/workflows/`, use these:

- Subtree push (publish your local `.windsurf/` improvements upstream)
  - See: `.windsurf/workflows/subtree-push.md`
  - Summary:
    - Splits `.windsurf/` into a branch and pushes it to the subtree repo

- Subtree pull (bring down latest upstream improvements into this project)
  - See: `.windsurf/workflows/subtree-pull.md`
  - Supports both Bootstrap (first-time) and Update (existing installation)

Notes and troubleshooting:
- Conflicts, if any, will be limited to files under `.windsurf/`. Resolve, then `cmd /c git add -A` and `cmd /c git commit`.
- To keep repos independent, always use `--squash` for `subtree add/pull`.
- If the upstream main branch is protected, push your split to a feature branch (e.g., `project-<name>`) in the subtree repo and open a PR there.
