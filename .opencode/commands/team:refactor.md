---
description: Refactor existing code without changing behavior. Project-manager routes to the owning lead, who runs implementation, review, and verification.
agent: project-manager
subtask: true
---

Load the project-stack skill, coding-standards skill, and git-workflow skill.

A refactor has been requested:

"$ARGUMENTS"

## What Is a Refactor

A refactor changes **how** code works internally without changing **what** it does externally. Valid refactor goals:

- Extract repeated logic into a shared function or class
- Rename for clarity
- Reduce cyclomatic complexity
- Remove dead code
- Split a large class or function into focused units
- Improve test coverage of existing behavior

If the request also adds new behavior, stop and tell the user to use `/team:new-feature` instead.

## Execution

1. Use the `complexity_score` tool on the target file/directory first to get a baseline
2. Determine scope — backend or frontend:
   - Backend → call @backend-lead and state that a senior backend developer is appropriate
   - Frontend → call @frontend-lead and state that a senior frontend developer is appropriate
   - Both → split into backend and frontend subtasks, then call both leads in parallel

3. Before touching anything, the lead/developer must:
   - Run the full test suite and record the baseline result
   - List the files that will be changed and why

4. The lead/developer implements the refactor then:
   - Runs the full test suite again — results must be identical to baseline
   - Commits: `git commit -m "refactor(<scope>): <what was improved>"`
   - Reports back with before/after file list and test results

5. The owning lead invokes @code-reviewer with:
   - The changed files
   - The stated refactor goal
   - Confirmation that tests pass before and after

No new features. No behavior changes. Tests must pass at every step.
