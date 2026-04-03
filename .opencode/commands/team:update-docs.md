---
description: Update project documentation — README, API docs, architecture diagrams, or inline code comments. Pass the area or file to document.
agent: architect
subtask: true
---

Load the project-stack skill and git-workflow skill.

Documentation needs to be updated for:

"$ARGUMENTS"

## Execution

1. Determine what type of documentation is needed:
   - **README / setup guide** → delegate to @junior-backend or @junior-frontend (whichever is more relevant)
   - **API documentation** (OpenAPI / Swagger / type definitions) → delegate to @senior-backend
   - **Architecture documentation / ADR** → invoke @architect
   - **Inline code comments** → delegate to the developer who owns that part of the codebase
   - **Frontend component docs / Storybook** → invoke @frontend-lead

2. The developer must:
   - Read the current documentation (if any) for the target area
   - Read the actual code to ensure documentation is accurate
   - Write the documentation
   - Commit: `git commit -m "docs(<scope>): <what was documented>"`
   - Report back with a summary of what was added or changed

3. **Code review requirement:**
   - Documentation-only changes (README, comments, guides): no review required
   - API contract changes (OpenAPI, Swagger, type definitions): **always** invoke @code-reviewer with the changed files before considering the task complete. The reviewer checks that the documented contract matches the actual implementation.
