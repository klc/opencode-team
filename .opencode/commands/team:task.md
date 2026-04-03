---
description: Assign a single well-defined task directly. Skips product-owner and project-manager — goes straight to the right lead and developer, then review and QA.
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
  scope: "both",
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

1. Determine scope: backend, frontend, or both
2. Delegate to @senior-backend or @junior-backend (backend), or invoke @frontend-lead (frontend)
3. Wait for implementation + commits
4. Invoke @code-reviewer for the changed files and wait
5. When reviewer approves → invoke @tester and wait
6. When tester passes → update Kanban task status to "done" and report done to user

```
kanban_update_task({
  id: "[KAN-XXX]",
  status: "done",
  agentName: "project-manager"
})
```
