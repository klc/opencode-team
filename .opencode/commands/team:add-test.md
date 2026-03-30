---
description: Add tests to existing code that lacks coverage. Specify a file, class, or feature area. No production code changes.
subtask: true
---

Load the project-stack skill and coding-standards skill.

Tests need to be added for:

"$ARGUMENTS"

## Rules for This Command

- Write tests only — do NOT modify production code
- If you discover a bug while writing tests, report it to the user and stop — do not fix it yourself
- If the code is untestable as-is (too tightly coupled, no dependency injection), report the issue and suggest a refactor via `/team:refactor` before adding tests

## Execution

1. Load the project-stack skill to find the test commands and project structure
2. Identify the area to test: file, class, function, or feature described in the request
3. Assess what test types are needed:
   - **Unit tests** — isolated logic, no external dependencies
   - **Integration tests** — service boundaries, DB interactions
   - **E2E tests** — full user journey (only if explicitly requested)
4. Write the tests following the patterns already in use in the codebase
5. Run the full test suite — new tests must pass, existing tests must still pass
6. Commit: `git commit -m "test(<scope>): add tests for <what was tested>"`
7. Report back:

```
✅ Tests added: [count]
📁 Test files: [list]
🧪 Coverage improvement: [before → after if measurable]
⚠️ Gaps noted: [anything that couldn't be tested and why]
```
