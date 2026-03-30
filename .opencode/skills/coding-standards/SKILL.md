---
name: coding-standards
description: Universal code quality rules, Definition of Done, review severity levels, and documentation standards. Load this before reviewing or writing any code.
---

# Coding Standards Skill

> This file contains universal standards that apply regardless of language or framework.
> Project-specific conventions (naming, folder structure, test commands) are in the
> `project-stack` skill. Load both.

---

## Universal Code Quality Rules

### Every function / method must

- Do one thing and name itself after that thing
- Have a cyclomatic complexity below 10
- Handle its errors explicitly — no silent failures
- Never log sensitive data (passwords, tokens, PII)

### Every pull request must

- [ ] Have unit tests for all new logic
- [ ] Have all existing tests passing
- [ ] Have no hardcoded secrets or environment-specific values
- [ ] Have input validation on all external data (HTTP requests, file uploads, queue messages)
- [ ] Have structured logging for key operations
- [ ] Have all external calls wrapped with timeout and error handling

---

## Security Baseline

Apply these regardless of stack:

- Validate and sanitize all user input before use
- Use parameterized queries — never string-concatenate SQL
- Never expose internal error details to API consumers
- Apply rate limiting to all public-facing endpoints
- Enforce authentication before authorization checks
- Never store plaintext secrets — use environment variables or a secrets manager
- Apply principle of least privilege to all roles and service accounts

---

## Definition of Done

A task is **Done** when all of the following are true:

- [ ] Code is implemented and matches the acceptance criteria
- [ ] Unit tests written and passing (≥ 80% coverage on new code)
- [ ] Integration tests passing (where applicable)
- [ ] No linting errors
- [ ] All project-stack runtime constraints respected
- [ ] Code committed with the correct conventional commit format
- [ ] Todo task marked `completed`
- [ ] Completion report sent to lead

---

## Code Review Standards

Reviewers classify findings into three levels:

| Level | Meaning | Blocks merge? |
|---|---|---|
| 🔴 Blocker | Security issue, data loss risk, broken core logic, missing auth | Yes |
| 🟡 Required | Standards violation, missing test, performance issue with easy fix | Yes |
| 🟢 Suggestion | Style preference, optional improvement, future consideration | No |

A PR is approved only when there are zero 🔴 Blockers and zero 🟡 Required items.

---

## Documentation Rules

- Write inline comments for **why**, not **what** — the code already says what
- Document non-obvious decisions at the function or module level
- Keep API documentation (OpenAPI / README / type definitions) in sync with implementation
- Record significant architecture decisions as ADRs (work with @architect)
