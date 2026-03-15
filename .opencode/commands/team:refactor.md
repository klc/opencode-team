---
description: Refactor existing code without changing behavior. Improves structure, readability, or performance. Runs tests before and after to confirm no regression.
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

If the request also adds new behavior, stop and tell the user to use `/new-feature` instead.

## Execution

1. Determine scope — backend or frontend:
   - Backend → delegate to @senior-backend
   - Frontend → invoke @frontend-lead with this request
   - Both → split and delegate in parallel

2. Before touching anything, the developer must:
   - Run the full test suite and record the baseline result
   - List the files that will be changed and why

3. The developer implements the refactor then:
   - Runs the full test suite again — results must be identical to baseline
   - Commits: `git commit -m "refactor(<scope>): <what was improved>"`
   - Reports back with before/after file list and test results

4. Invoke @code-reviewer with:
   - The changed files
   - The stated refactor goal
   - Confirmation that tests pass before and after

No new features. No behavior changes. Tests must pass at every step.
