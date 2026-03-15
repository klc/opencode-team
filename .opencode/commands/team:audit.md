---
description: Full project audit — security vulnerabilities, performance bottlenecks, code quality, and technical debt. Produces a prioritized report with actionable fixes.
subtask: true
---

Load the project-stack skill and coding-standards skill.

Run a comprehensive audit of this project.

"$ARGUMENTS"

## Audit Scope

If arguments are provided, focus the audit on that area. Otherwise, audit the full codebase.

## Execution

Run all three audits in parallel — they are independent:

**Task 1 → @security-auditor**
```
Audit the codebase for security vulnerabilities.
Focus on: authentication, authorization, injection, sensitive data handling, OWASP Top 10.
Scope: [arguments or "full codebase"]
Return your findings report to me when complete.
```

**Task 2 → @performance-analyst**
```
Analyze the codebase for performance bottlenecks.
Focus on: N+1 queries, missing indexes, bundle size, slow endpoints, cache opportunities.
Scope: [arguments or "full codebase"]
Return your findings report to me when complete.
```

**Task 3 → @code-reviewer**
```
Review the codebase for code quality and technical debt.
Focus on: coding standards violations, missing tests, complexity hotspots, dead code, duplication.
Scope: [arguments or "full codebase"]
Do NOT review for security or performance — those are covered separately.
Return your findings report to me when complete.
```

Wait for all three to complete, then produce a unified audit report:

---

## Unified Audit Report Format

```markdown
# Project Audit Report
**Date:** [date]
**Scope:** [full codebase or specific area]

---

## 🔴 Critical — Fix Immediately
[Findings from any category that are Critical severity — list with source agent]

## 🟠 High Priority
[High severity findings from all three audits]

## 🟡 Medium Priority
[Medium severity findings]

## 🟢 Backlog
[Low severity findings and quick wins]

---

## Security Summary
[2–3 sentences from security-auditor report]
Full report: [paste security-auditor report here]

## Performance Summary
[2–3 sentences from performance-analyst report]
Full report: [paste performance-analyst report here]

## Code Quality Summary
[2–3 sentences from code-reviewer report]
Full report: [paste code-reviewer report here]

---

## Recommended Fix Order
1. [Most critical finding] — estimated effort: [S/M/L]
2. [Second most critical] — estimated effort: [S/M/L]
3. ...
```

Present the unified report to the user and ask if they want to proceed with fixes for any of the findings.
