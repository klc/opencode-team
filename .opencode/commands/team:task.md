---
description: Assign a single well-defined task directly. Skips product-owner and project-manager — goes straight to the right lead and developer, then QA and review.
agent: backend-lead
subtask: true
---

Load the project-stack skill and git-workflow skill.

A direct task has been assigned:

"$ARGUMENTS"

## When to Use This Command

Use `/task` when:
- The scope is fully defined and unambiguous
- It is a single contained unit of work
- You don't need planning, story writing, or sprint tracking
- Examples: "add a created_by field to the orders table", "extract the email sending logic into a dedicated service", "add pagination to the users API endpoint"

## Execution

1. Read the task description carefully
2. Determine scope:
   - Backend work → assess complexity, delegate to @senior-backend or @junior-backend
   - Frontend work → invoke @frontend-lead with the task
   - Both → split and delegate in parallel to both leads

3. Use this delegation format:

```
@senior-backend / @junior-backend

Task: [title derived from the request]
Description: [what needs to be done — be specific]
Acceptance criteria:
  - [ ] [criterion]
Constraints: [files NOT to touch, patterns to follow]
Files likely involved: [if known]
```

4. When the developer completes:
   - Review the completion report
   - If satisfactory: invoke @code-reviewer for the changed files
   - If not: send back with specific feedback

5. When review passes: report done to the user with a summary of what was built and committed.

No todo list needed for single tasks unless the work spans more than one developer.
