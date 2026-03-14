---
description: Small, contained fix that doesn't need the full team chain. Typos, config values, copy changes, single-line corrections. Skips product-owner, project-manager, and QA — goes directly to the right developer.
agent: backend-lead
subtask: true
---

Load the project-stack skill and git-workflow skill.

A small fix has been requested:

"$ARGUMENTS"

## Rules for This Command

This command is for changes that meet ALL of these criteria:
- Touches 1–3 files maximum
- No new logic — only corrections to existing behavior
- No schema changes
- No new dependencies
- Takes less than 30 minutes to implement

If the fix does not meet ALL criteria above, stop and tell the user to use `/new-feature` or `/bugfix` instead.

## Execution

1. Determine whether the fix is backend or frontend:
   - Backend fix → delegate to @senior-backend or @junior-backend (your call based on complexity)
   - Frontend fix → immediately invoke @frontend-lead with this same request

2. The developer must:
   - Implement the fix
   - Run the relevant tests from the project-stack skill
   - Commit: `git commit -m "fix(<scope>): <what was fixed>"`
   - Report back with modified files and test results

3. Once the developer confirms the fix:
   - Invoke @code-reviewer with the changed files
   - If approved: done
   - If changes required: delegate the fix back to the developer, re-review

Do NOT create a todo list for quick fixes. Do NOT invoke @tester for quick fixes unless the reviewer specifically flags a test gap.
