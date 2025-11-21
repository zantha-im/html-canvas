---
description: Initialize new conversations with goal establishment and approval gating
auto_execution_mode: 3
---

# Hello AI - A New Chat Conversation Initialization

⛔ **CRITICAL: This workflow has mandatory sequential steps. Do not skip or reorder steps.**

## Purpose
This workflow establishes conversation goals, loads critical context files and sets approval gates.

**IMPORTANT: All steps must be completed sequentially. Do not skip steps.**

---

## Step 1: Load Critical Context (REQUIRED)

Execute the following workflow to load all essential context, guides, and database schema:

/run context-critical

**⚠️ Wait for Step 1 to complete before proceeding to Step 2.**

---

## Step 2: Pre-Flight Check (REQUIRED)

Before establishing conversation goals, verify the following:

- ✅ Have you loaded all context-critical steps (including schema query)?
- ✅ Do you have the schema index output available?
- ✅ Have you reviewed the core engineering guides?
- ✅ Have you loaded task-specific guides (API or UI)?

If you answered "no" to any of these, go back and complete `/run context-critical` fully.

**⚠️ Do not proceed to Step 3 until all items above are verified.**

---

## Step 3: Establish Conversation Goal (REQUIRED)

**AI ACTION REQUIRED**: 

Based on the loaded context, establish the goal of this conversation:

1. **Summarize the current project state** - What has been completed, what's in progress, what's next
2. **Identify the user's intent** - Ask clarifying questions if the request is ambiguous
3. **Confirm understanding** - State back what you understand the goal to be
4. **Set expectations** - Explain what you will do and any constraints or dependencies

### Example Goal Statement
```
Goal: Implement Neon Auth integration with Stack Auth SDK
- Scope: Create auth pages (login, OTP, callback), implement middleware, test OTP flow
- Constraints: Must follow fail-fast error handling patterns from engineering guides
- Dependencies: Database schema already loaded; auth configuration needed from user
- Approval: Seeking user approval before making code changes
```

**⚠️ Do not proceed with implementation until user approves this goal statement.**

---

## Workflow Completion Checklist

Before proceeding with actual work, verify:
- ✅ All commands in `context-critical` Step 1 have been executed
- ✅ All guide workflows (core, API, UI) have completed
- ✅ Database schema has been loaded via `schema-query.js --index`
- ✅ You have reviewed the loaded guides and schema information
- ✅ Conversation goal has been established and confirmed with user

Only after all items are checked should you proceed with implementation.

---

## Troubleshooting

If you skipped a step or are uncertain about context, start over with `/hello-ai`

---

## ⚠️ Windows Command Syntax Reminder

**All commands must use Windows syntax**: `cmd /c` prefix, backslashes (`\`) for paths, quote paths with spaces.