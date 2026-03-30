---
description: Small, contained fix that doesn't need the full team chain. Typos, config values, copy changes, single-line corrections. Goes directly to the right developer, then review.
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

If the fix does not meet ALL criteria above, stop and tell the user to use `/team:new-feature` or `/team:bugfix` instead.

## Execution

1. Determine scope and delegate using the Task tool:
   - Backend fix → Task: @senior-backend or @junior-backend
   - Frontend fix → Task: @senior-frontend or @junior-frontend
   - Both → Task both in parallel

2. In the Task call, instruct the developer to:
   - Implement the fix
   - Run the relevant tests (see project-stack skill for the command)
   - Commit: `git commit -m "fix(<scope>): <what was fixed>"`
   - Return a completion report

3. When the developer reports done → Task: @code-reviewer with the changed files
4. If approved: report done to user
5. If changes required: send back to developer, re-review

Do NOT create a todo list for quick fixes.
Do NOT invoke @tester unless the reviewer specifically flags a test gap.
