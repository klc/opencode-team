---
description: Assign a single well-defined task. Project-manager routes it to the right lead, then the lead owns implementation, review, and QA.
agent: project-manager
subtask: true
---

Load the project-stack skill and git-workflow skill.

A direct task has been assigned:

"$ARGUMENTS"

## Step 0 — Create Kanban Task

Before starting, create a Kanban task to track this work:

```
kanban_create_task({
  title: "[extract short title from the task description]",
  description: "$ARGUMENTS",
  type: "task",
  scope: "[backend | frontend | both]",
  initialStatus: "in-progress",
  agentName: "project-manager"
})
```

Note the task ID (e.g. KAN-XXX). Reference it in all subsequent steps.

## Step 1 — Memory check
Use the `memory_search` tool before starting:

```
memory_search({ query: "[extract 2–3 keywords from the task description]" })
```

If relevant prior decisions, bugs, or research records exist, pass them to the developer as context.

1. Determine scope before creating the task: backend, frontend, or both
2. If scope is `backend`, create the task with `scope: "backend"` and call @backend-lead
3. If scope is `frontend`, create the task with `scope: "frontend"` and call @frontend-lead
4. If scope is `both`, create two subtasks instead:
   - Backend subtask: `scope: "backend"`, `initialStatus: "in-progress"`, then call @backend-lead
   - Frontend subtask: `scope: "frontend"`, `initialStatus: "in-progress"`, then call @frontend-lead
5. Pass story context, acceptance criteria, and memory context to each lead
6. The lead owns developer delegation, code review, security/SEO checks when needed, QA, and status updates
7. When all lead-owned tasks are done, report done to the user

Do not call developers, code-reviewer, or tester directly from this command. Project-manager may only hand off to leads; leads own the full delivery cycle.
