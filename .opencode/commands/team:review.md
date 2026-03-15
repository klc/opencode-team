---
description: Full code review — quality, security, runtime constraints, and test coverage
agent: code-reviewer
subtask: true
---

Review the current changes in this repository.

## Setup

1. Load the `coding-standards` skill
2. Load the `project-stack` skill — pay special attention to the Critical Runtime Constraints section

## Scope

Run `git diff origin/main...HEAD` (or `origin/master...HEAD`) to see all changes.

## Review Checklist

- [ ] Naming and structure conventions followed (see project-stack skill)
- [ ] No business logic in controllers or route handlers
- [ ] All errors handled explicitly — no silent failures
- [ ] Input validation on all external data
- [ ] No debug artifacts (console.log, var_dump, dd, print_r)
- [ ] Tests written for new code (≥ 80% coverage on new logic)
- [ ] All Critical Runtime Constraints from project-stack skill respected
- [ ] No secrets or hardcoded credentials in code
- [ ] Commit messages follow conventional format

## Report Format

Produce a structured review report with:
- 🔴 Blockers (must fix before merge)
- 🟡 Required changes (must fix)
- 🟢 Suggestions (optional)

**Verdict:** ✅ Approved | 🔄 Changes Required | 🔴 Blocked
