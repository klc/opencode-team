---
description: Assign a single well-defined task directly. Skips product-owner and project-manager — goes straight to the right lead and developer, then review and QA.
subtask: true
---

Load the project-stack skill and git-workflow skill.

A direct task has been assigned:

"$ARGUMENTS"

**Step 0 — Memory check**
Invoke @librarian before starting:
```
ACTION: recall
QUERY: [extract 2–3 keywords from the task description]
```
If relevant prior decisions, bugs, or research records exist, pass them to the developer as context.

1. Determine scope: backend, frontend, or both
2. Delegate to @senior-backend or @junior-backend (backend), or invoke @frontend-lead (frontend)
3. Wait for implementation + commits
4. Invoke @code-reviewer for the changed files and wait
5. When reviewer approves → invoke @tester and wait
6. When tester passes → report done to user
