---
description: Full code review — quality, security, runtime constraints, SSR safety if applicable, and test coverage
agent: code-reviewer
subtask: true
---

Review the current changes in this repository.

Scope:
- Run `git diff origin/develop...HEAD` to see all changes
- Load `coding-standards` skill before reviewing
- Load `octane-patterns` skill for any backend changes
- Load `inertia-patterns` skill for any frontend changes

Review checklist:
- [ ] Naming and structure conventions followed
- [ ] No business logic in controllers
- [ ] No N+1 queries
- [ ] Octane: no static state, no singleton mutation
- [ ] SSR: no browser APIs outside onMounted
- [ ] Forms use useForm() not raw fetch/axios
- [ ] Tests written for new code
- [ ] No debug artifacts (dd, dump, console.log)
- [ ] Commit messages follow conventional format

Produce a structured review report with 🔴 Blockers, 🟡 Required, 🟢 Suggestions.
Verdict: ✅ Approved | 🔄 Changes Required | 🔴 Blocked
