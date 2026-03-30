---
description: Pick up and resolve a specific technical debt item. Pass the debt title or filename. Routes to the appropriate lead and updates the debt record when done.
subtask: true
---

Load the `project-stack` skill and `workflow` skill.

A technical debt item needs to be resolved:

"$ARGUMENTS"

## Step 1 — Retrieve the debt record

Use the `memory_search` tool:
```
memory_search({ query: "[debt title or keywords from the argument]", category: "debt" })
```

Read the full debt record — pay attention to: location, issue description, acceptance criteria, owner, and effort.

## Step 2 — Mark as in-progress

Invoke @librarian to update the status:
```
ACTION: write
TYPE: debt
TITLE: [exact debt title]
CONTENT:
  Status: in-progress
  Started: [today's date]
```

## Step 3 — Delegate to the appropriate lead

Based on the `Owner` field in the debt record:

- `@backend-lead` → delegate as a backend task with the debt's acceptance criteria
- `@frontend-lead` → delegate as a frontend task with the debt's acceptance criteria
- `@architect` → invoke @architect directly with the debt context

Pass the full debt record context in the delegation.

Wait for implementation + review + QA to complete (follow the normal team:task flow).

## Step 4 — Close the debt record

When all acceptance criteria are met, invoke @librarian to mark the debt as resolved:
```
ACTION: write
TYPE: debt
TITLE: [exact debt title]
CONTENT:
  Status: resolved
  Resolved: [today's date]
  How it was resolved: [brief description of what was done]
```

Report to the user:
```
✅ Debt resolved: [title]
Files changed: [list]
Acceptance criteria met: [list]
Memory updated: .memory/debt/[filename].md → status: resolved
```
