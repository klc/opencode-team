---
description: Small, contained fix. Project-manager routes to the appropriate lead; the lead decides whether developer, review, or QA is needed.
agent: project-manager
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
   - Backend fix → call @backend-lead
   - Frontend fix → call @frontend-lead
   - Both → create backend and frontend subtasks, then call both leads in parallel

2. In the Task call, instruct the lead to:
   - Implement the fix
   - Run the relevant tests (see project-stack skill for the command)
   - Commit: `git commit -m "fix(<scope>): <what was fixed>"`
   - Return a completion report

3. The lead decides whether to delegate to a senior or junior developer
4. The lead invokes @code-reviewer for changed files unless the change is documentation/copy-only and clearly no-review
5. If approved: report done to user
6. If changes are required: the lead sends back to developer and re-reviews

Do NOT create a todo list for quick fixes.
Do NOT invoke @tester directly from project-manager. If QA is needed, the lead invokes @tester.
