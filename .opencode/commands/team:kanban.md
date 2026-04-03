---
description: Kanban board management. Subcommands: new-feature, status, board, watch, sprint
agent: project-manager
subtask: false
---

Kanban command executed.

Argument: "$ARGUMENTS"

## Process Commands

Determine the action to perform based on the argument:

### `new-feature <description>`
Create a new feature request:
1. Call the `kanban_create_task` tool:
   - type: "feature"
   - scope: "both" (to be split after the product-owner clarifies)
   - status: "backlog"
   - extract title and description from the argument
2. When the task is created, the kanban-trigger plugin automatically triggers the @product-owner
3. Inform the user of the task ID and that the process has started

### `board` or no argument
Show the current board status:
1. Call the `kanban_list_tasks` tool (all active tasks)
2. Present the grouped board view

### `status <KAN-XXX>`
Show the details of a specific task:
1. Call the `kanban_get_task` tool (includeHistory: true)
2. Present all details

### `watch`
Check for stalled tasks and pending triggers:
1. Call the `kanban_watch` tool
2. Present the report

### `sprint`
Sprint-based view:
1. Fetch in-progress and review tasks using `kanban_list_tasks`
2. Group by scope (backend / frontend)
3. Show the assignee and status for each task

---

Parse the argument and execute the appropriate command from above.
If the argument is unrecognized, show the board view.
