---
description: Start a new feature end-to-end via the Kanban system. Creates a tracked task, then product-owner explicitly hands off to project-manager.
agent: product-owner
subtask: false
---

Load the workflow skill and project-stack skill.

A new feature has been requested:

"$ARGUMENTS"

## Step 0 — Create Kanban Task

Before anything else, create a Kanban task to track this feature:

```
kanban_create_task({
  title: "[extract short title from the feature description]",
  description: "$ARGUMENTS",
  type: "feature",
  scope: "both",
  initialStatus: "backlog",
  agentName: "product-owner"
})
```

Note the task ID returned (e.g. KAN-001). All subsequent steps must reference this ID.

## Step 1 — Memory Check

Use the `memory_search` tool:
```
memory_search({ query: "[2–3 keywords from feature]" })
```

## Step 2 — Scope Clarification

If the request is ambiguous, ask the user using the Critical Decision Protocol (max 2–3 questions).

## Step 3 — Architecture Decisions

Invoke @architect if needed. Pass the Kanban task ID for tracking.

## Step 4 — Write User Story & Update Task

Write the user story. Then update the Kanban task with the story context:

```
kanban_update_task({
  id: "[KAN-XXX]",
  status: "planning",
  storyContext: "[one sentence: what the user wants and why]",
  acceptanceCriteria: ["[criterion 1]", "[criterion 2]", ...],
  agentName: "product-owner"
})
```

This only updates Kanban. It does not trigger the next agent automatically.

## Step 5 — Hand off

Use the Task tool to call @project-manager with the task context:

```
@project-manager — Task [KAN-XXX] is ready for planning.

Title: [task title]
Story: [one-sentence story context]
Scope: [backend | frontend | both]
Acceptance criteria:
  - [criterion 1]
  - [criterion 2]

Please create the feature branch, plan subtasks, and delegate to the appropriate lead(s).
```

Report to the user that the feature is now in planning.
