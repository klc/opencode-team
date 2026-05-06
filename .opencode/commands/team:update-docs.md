---
description: Update project documentation — README, API docs, architecture diagrams, or inline code comments. Project-manager routes implementation docs to leads and architecture docs to architect.
agent: project-manager
subtask: true
---

Load the project-stack skill and git-workflow skill.

Documentation needs to be updated for:

"$ARGUMENTS"

## Execution

1. Determine what type of documentation is needed:
   - **README / setup guide** → call @backend-lead or @frontend-lead, whichever owns the documented area
   - **API documentation** (OpenAPI / Swagger / type definitions) → call @backend-lead and state that a senior backend developer is appropriate
   - **Architecture documentation / ADR** → invoke @architect
   - **Inline code comments** → call the owning lead and ask them to delegate to the appropriate developer
   - **Frontend component docs / Storybook** → invoke @frontend-lead

2. The lead/developer must:
   - Read the current documentation (if any) for the target area
   - Read the actual code to ensure documentation is accurate
   - Write the documentation
   - Commit: `git commit -m "docs(<scope>): <what was documented>"`
   - Report back with a summary of what was added or changed

3. **Code review requirement:**
   - Documentation-only changes (README, comments, guides): no review required
   - API contract changes (OpenAPI, Swagger, type definitions): **the owning lead must invoke @code-reviewer** with the changed files before considering the task complete. The reviewer checks that the documented contract matches the actual implementation.
