---
description: Assign a single well-defined task directly. Skips product-owner and project-manager — goes straight to the right lead and developer, then QA and review.
subtask: true
---

Load the project-stack skill and git-workflow skill.

A direct task has been assigned:

"$ARGUMENTS"

1. Determine scope: backend, frontend, or both
2. Delegate to @senior-backend or @junior-backend (backend), or invoke @frontend-lead (frontend)
3. Wait for implementation + commits
4. Invoke @tester for the changed files and wait
5. When tester passes → invoke @code-reviewer and wait
6. When reviewer approves → report done to user
