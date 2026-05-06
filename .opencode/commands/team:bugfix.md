---
description: Investigate and fix a bug — project-manager creates a tracked bug task and routes it to the appropriate lead; the lead may invoke debugger, reviewer, and tester.
agent: project-manager
subtask: false
---

A bug has been reported:

"$ARGUMENTS"

## Step 0 — Create Kanban Task

Before investigating, create a Kanban task to track this bug:

```
kanban_create_task({
  title: "[extract short title from the bug description]",
  description: "$ARGUMENTS",
  type: "bug",
  scope: "[backend | frontend | both]",
  initialStatus: "in-progress",
  agentName: "project-manager"
})
```

Note the task ID (e.g. KAN-XXX). Reference it in all subsequent steps.

## Step 1 — Memory check
Before investigating, use the `memory_search` tool:

```
memory_search({ query: "[extract component name or symptom keywords from the bug description]" })
```

If a similar bug was fixed before, pass that record to the debugger — the root cause may be the same or related.

Follow this process:

1. Load the `project-stack` skill to understand the stack and runtime constraints
2. Determine whether the bug belongs to backend, frontend, or both before creating/assigning tasks
3. If scope is `backend`, call @backend-lead with the bug task, symptoms, evidence, and memory context
4. If scope is `frontend`, call @frontend-lead with the bug task, symptoms, evidence, and memory context
5. If scope is `both`, create separate backend and frontend subtasks and call both leads in parallel
6. The lead may invoke @debugger first when root cause is unclear, then delegate the fix to the right developer
7. The lead runs the normal cycle: implementation → code review/security/SEO checks as needed → QA
8. When all lead-owned tasks are done, close the parent task if one exists:

```
kanban_update_task({
  id: "[KAN-XXX]",
  status: "done",
  agentName: "project-manager"
})
```

Do not call @debugger directly from project-manager. Leads have permission to invoke @debugger and own the fix loop.
