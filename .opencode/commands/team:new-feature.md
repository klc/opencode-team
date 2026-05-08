---
description: Start a new feature end-to-end via the Kanban system. Project-manager clarifies scope, writes story context, creates a tracked task, then routes to the appropriate lead(s).
agent: project-manager
subtask: false
---

Load the workflow skill and project-stack skill.

A new feature has been requested:

"$ARGUMENTS"

## Step 0 — Memory Check

Use the `memory_search` tool:
```
memory_search({ query: "[2–3 keywords from feature]" })
```

## Step 1 — Scope Clarification

If the request is ambiguous, ask the user using the Critical Decision Protocol (max 2–3 questions).

## Step 2 — Architecture Decisions

Invoke @architect if needed. Pass the feature context. Architecture input should resolve technical decisions only; project-manager owns the story context and routing.

## Step 3 — Write Story Context & Create Kanban Task

Write a concise story context and concrete acceptance criteria. Then create the Kanban task:

```
kanban_create_task({
  title: "[extract short title from the feature description]",
  description: "$ARGUMENTS",
  type: "feature",
  scope: "both",
  storyContext: "[one sentence: what the user wants and why]",
  acceptanceCriteria: ["[criterion 1]", "[criterion 2]", ...],
  initialStatus: "planning",
  agentName: "project-manager"
})
```

Note the task ID returned (e.g. KAN-001). All subsequent steps must reference this ID.

## Step 4 — Plan and Hand Off

Continue with the normal project-manager planning flow:

1. Create the feature integration branch.
2. Split `scope: "both"` work into backend and frontend subtasks, or move a single-scope task to `in-progress`.
3. Use the Task tool to call the appropriate lead(s).

For `scope: "both"`, call both leads in parallel:

```
@backend-lead — Backend subtask [KAN-YYY] is ready for implementation.

Title: [backend task title]
Story context: [context]
Acceptance criteria:
  - [backend criterion 1]
Parent task: [KAN-XXX]

Please assess complexity and delegate to the appropriate developer.
```

```
@frontend-lead — Frontend subtask [KAN-ZZZ] is ready for implementation.

Title: [frontend task title]
Story context: [context]
Acceptance criteria:
  - [frontend criterion 1]
Parent task: [KAN-XXX]

Please assess complexity and delegate to the appropriate developer.
```

For `scope: "backend"` or `scope: "frontend"`, move the existing task to `in-progress` and call only the matching lead.

Report to the user that the feature is planned and routed to the lead-owned delivery cycle.
