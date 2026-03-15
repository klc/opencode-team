---
description: Urgent production fix. Creates a hotfix branch, debugger triages root cause, senior developer fixes, fast-tracks review.
subtask: true
---

Load the project-stack skill and git-workflow skill.

A production hotfix is required:

"$ARGUMENTS"

1. Create hotfix branch: `git checkout -b hotfix/<short-description>`
2. Invoke @debugger to confirm root cause — wait for findings before proceeding
3. Delegate fix to @senior-backend (or invoke @frontend-lead if UI issue) — wait for completion
4. Invoke @code-reviewer with the changed files — wait for verdict
5. When reviewer approves, report to user and wait for explicit merge confirmation

Do not merge or deploy without explicit user confirmation.
