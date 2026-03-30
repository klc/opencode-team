---
description: Plan a sprint — take a list of user stories and produce a full sprint plan with task breakdown assigned to leads. Surfaces open technical debt for inclusion.
agent: project-manager
subtask: false
---

Plan a sprint for the following user stories or requirements:

"$ARGUMENTS"

Load the `project-stack` skill and `workflow` skill before starting.

## Step 0 — Debt backlog review

Before breaking down any stories, use the `debt_summary` tool to surface open technical debt:
```
debt_summary({ status: "open", priority: "high" })
```

From the returned debt backlog:
- List all **high priority** open debt items to the user
- Ask whether any should be included in this sprint alongside the new stories
- If the user confirms debt items to include, add them as explicit tasks in the sprint plan

Wait for the user's response before proceeding to Step 1.

## Step 1 — Story breakdown

For each user story or requirement:
1. Break it into concrete backend and frontend tasks
2. Estimate story points for each task (1, 2, 3, 5, 8)
3. Identify dependencies between tasks

## Step 2 — Sprint plan

Produce a sprint plan table:

```markdown
## Sprint [N] Plan

**Goal:** [One clear sentence covering all stories]

### New feature tasks
| ID  | Title                   | Lead              | Points | Depends on |
|-----|-------------------------|-------------------|--------|------------|
| T01 | [description]           | @backend-lead     | 3      | —          |

### Debt tasks (if any confirmed by user)
| ID  | Title                   | Lead              | Points | Effort |
|-----|-------------------------|-------------------|--------|--------|
| D01 | [debt title]            | @backend-lead     | 2      | M      |

**Total points:** [N]

### Risks
| Risk          | Likelihood | Impact | Mitigation |
|---------------|------------|--------|------------|
```

## Step 3 — Execute

Do not stop after producing the plan — call the leads:
1. Call @backend-lead with all backend tasks (new + debt) via Task tool
2. Call @frontend-lead with all frontend tasks (new + debt) via Task tool

## Step 4 — Update debt status

After delegating any debt tasks to leads, invoke @librarian to mark those debt items as in-progress.
