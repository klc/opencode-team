---
description: Urgent production fix. Creates a hotfix branch, delegates to senior developer, fast-tracks review. Use when something is broken in production and cannot wait for the normal feature cycle.
agent: backend-lead
subtask: false
---

Load the project-stack skill and git-workflow skill.

A production hotfix is required:

"$ARGUMENTS"

## This Is a Hotfix

A hotfix means production is affected. Speed matters — but not at the expense of correctness. Every step below is mandatory.

## Execution

### Step 1 — Branch

Create a hotfix branch immediately:
```bash
git checkout -b hotfix/<short-description>
```

### Step 2 — Triage

Invoke @debugger to confirm root cause before any fix is written:

```
@debugger

HOTFIX — production issue
Description: [the issue as described]
Priority: Critical
Goal: confirm root cause and identify the minimal fix needed
Do NOT implement the fix — just identify it
```

Wait for @debugger to report root cause before proceeding.

### Step 3 — Fix

Determine scope:
- Backend → delegate to @senior-backend (hotfixes always go to senior)
- Frontend → invoke @frontend-lead immediately with the same urgency
- Both → split and run in parallel

The developer must:
- Implement the minimal fix — no cleanup, no refactoring alongside it
- Run the full test suite
- Commit: `git commit -m "fix(<scope>): <what was fixed> — hotfix"`
- Report back immediately

### Step 4 — Fast Review

Invoke @code-reviewer with:
- The changed files
- The confirmed root cause from @debugger
- The note: "This is a production hotfix — prioritize correctness and safety over style"

If the reviewer blocks: fix and re-review. Do not skip review even for hotfixes.

### Step 5 — Report to User

When review passes, report to the user:

```
🔥 Hotfix Ready — [short description]

Branch: hotfix/[name]
Root cause: [from debugger]
Fix: [what was changed]
Files: [list]
Tests: [passing / total]
Review: ✅ Approved

Ready to merge and deploy. Confirm when you want to proceed.
```

Do not merge or deploy without explicit user confirmation.
