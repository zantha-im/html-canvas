---
description: Essential context refresh for AI conversations
auto_execution_mode: 3
---

# Critical Context Refresh

⛔ **CRITICAL: This workflow has mandatory sequential steps. Do not skip or reorder steps.**

This workflow loads the most critical constraints and patterns that AIs regularly forget, plus ways of working and current schema information.

**IMPORTANT: All steps must be completed sequentially. Do not skip steps.**

---

## Step 1: Load Windows Command Syntax (REQUIRED - FIRST)

⚠️ **ALL COMMANDS MUST USE WINDOWS SYNTAX**

/run context-cmd

This establishes the command syntax rules BEFORE any other context. All subsequent commands must follow these rules.

**⚠️ Wait for Step 1 to complete before proceeding to Step 2.**

---

## Step 2: Understand Your Core Tools (REQUIRED)

Run the following commands to understand available tools:

### 2a. Schema Query Tool
```bash
cmd /c node .windsurf\tools\schema-query.js --help
```

### 2b. File Delete Tool
```bash
cmd /c node .windsurf\tools\file-delete.js --help
```

### 2c. Code Review Tool
```bash
cmd /c npm run --prefix .windsurf\review review:repo -- --help
```

**⚠️ All three commands above must complete before proceeding to Step 3.**

---

## Step 3: Load Core Engineering Guides (REQUIRED)

These short guides are always relevant and should be loaded for any task.

/run load-core-guides

**⚠️ Wait for Step 3 to complete before proceeding to Step 4.**

---

## Step 4: Load Task-Specific Guides (REQUIRED)

Load both guides to ensure comprehensive context:

- **For API/server/auth/networking tasks:**
  /run load-api-guides

- **For UI/React/components/hooks tasks:**
  /run load-ui-guides

**Note:** If uncertain which guides apply, load both. Having extra context is better than missing critical patterns.

**⚠️ Wait for Step 4 to complete before proceeding to Step 5.**

---

## Step 5: Load Current Database Schema (REQUIRED)

Run this command to inspect the current database schema:

```bash
cmd /c node .windsurf\tools\schema-query.js --index
```

This provides the schema index. Use this to query specific tables as needed:

```bash
cmd /c node .windsurf\tools\schema-query.js --table <table_name>
```

**⚠️ All steps above must complete before this workflow is considered finished.**

---

# Reference: Important Conventions

## Git Commit Messages (Required Convention)
- Use no-spaces commit messages to avoid shell/quoting issues.
- Example: `git commit -m docs_update_ui_guidelines` (good)
- Avoid: `git commit -m "docs: update ui guidelines"` (spaces not allowed by convention)

## Schema Query Examples

Once you have the schema index, use these commands to explore:

```bash
# View specific table
cmd /c node .windsurf\tools\schema-query.js --table products

# View tables matching pattern
cmd /c node .windsurf\tools\schema-query.js --pattern stock_*

# Execute custom SQL
cmd /c node .windsurf\tools\schema-query.js --sql "SELECT COUNT(*) FROM products"

# Execute SQL from file with pagination
cmd /c node .windsurf\tools\schema-query.js --sql-file path/to/query.sql --page 1 --page-size 10
```

---

## Troubleshooting

If you skipped a step or are uncertain about context, start over with `/hello-ai`