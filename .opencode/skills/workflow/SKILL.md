---
name: workflow
description: Full team delegation chain, execution phases, parallelization rules, todo board protocol, and agent invocation templates.
---

# Workflow Skill

## Team Hierarchy

```
product-owner
    └─ project-manager
            ├─ backend-lead
            │       ├─ senior-backend (parallel, unlimited instances)
            │       └─ junior-backend (parallel, unlimited instances)
            └─ frontend-lead
                    ├─ senior-frontend (parallel, unlimited instances)
                    └─ junior-frontend (parallel, unlimited instances)
```

**Support agents** (invoked by leads or project-manager as needed):
- `@tester` — QA, spawned by leads after all implementation is complete
- `@code-reviewer` — code review, spawned by leads after all tests pass
- `@architect` — architecture decisions, invoked before implementation starts
- `@debugger` — production incidents and hard-to-reproduce bugs
- `@researcher` — technology evaluation, spike investigations

---

## Strict Delegation Chain

Every step in the chain is mandatory. Steps cannot be skipped.

```
product-owner     → project-manager   (never directly to leads or developers)
project-manager   → backend-lead      (never directly to developers)
project-manager   → frontend-lead     (never directly to developers)
backend-lead      → senior-backend    (complex / moderate tasks)
backend-lead      → junior-backend    (simple tasks)
frontend-lead     → senior-frontend   (complex / moderate tasks)
frontend-lead     → junior-frontend   (simple tasks)
```

**product-owner** never writes code and never assigns to anyone except project-manager.
**project-manager** never writes code and never assigns to anyone except leads.
**leads** assess complexity and delegate — they only implement if an architectural decision must happen inline during coding.

---

## Execution Phases

Phases are strictly sequential. Never invoke an agent from a later phase while an earlier phase is still running.

### Phase 1 — Planning & Implementation

```
product-owner clarifies scope
    ↓
architect resolves critical technical decisions (if any)
    ↓
product-owner writes user story
    ↓
project-manager creates feature branch + breaks story into tasks + updates todo list
    ↓
project-manager assigns to backend-lead and frontend-lead in parallel
    ↓
leads delegate to developers (parallel instances as needed)
    ↓
developers implement + commit + mark todo completed + report to lead
```

### Phase 2 — Review

Triggered by leads when ALL their parallel developers report complete.

```
backend-lead  → @code-reviewer (one per independent scope, in parallel)
frontend-lead → @code-reviewer (one per independent scope, in parallel)
    ↓
Each reviewer reports verdict to their lead (never directly to developer)
    ↓
If BLOCKED or CHANGES REQUIRED → lead reassigns fix to developer → developer fixes + commits → lead re-triggers reviewer for that scope only
    ↓
When ALL reviewers approve → lead moves to QA
```

### Phase 3 — QA

Triggered by leads when ALL their reviewers approve.

```
backend-lead  → @tester (one per independent scope, in parallel)
frontend-lead → @tester (one per independent scope, in parallel)
    ↓
Each tester reports PASS or FAIL to their lead (never directly to reviewer)
    ↓
If FAIL → lead reassigns fix to developer → developer fixes + commits → lead re-triggers tester for that scope only
    ↓
When ALL testers PASS → feature is complete
```

> **Why review before test?** Reviewers can block architectural or structural changes that would make tests obsolete. Running tests first on code that gets rejected wastes time and creates conflicting fix commits.

---

## Parallelization Rules

- **Independent tasks → always parallel.** If two tasks don't share files and don't depend on each other's output, invoke both simultaneously.
- **Dependent tasks → sequential.** If task B requires task A's output (e.g. a migration before a seeder), call A first, wait, then call B.
- **Unlimited instances.** Leads may spawn as many developer, tester, or reviewer instances as needed.
- **Same scope, sequential.** A single scope must not have two agents working on it simultaneously.

---

## Todo List Protocol

| Agent | Action | Status transition |
|---|---|---|
| project-manager | Creates all tasks when breaking story | → `pending` |
| project-manager | Hands task to a lead | → `in-progress` |
| developer | Implementation complete + committed | → `completed` |
| tester | QA FAIL | implementation task stays `in-progress` |
| tester | QA PASS | qa task → `completed` |
| code-reviewer | BLOCKED / CHANGES | review task stays `in-progress` |
| code-reviewer | APPROVED | review task → `completed` |
| developer (fix) | Fix complete + committed | stays `in-progress` until tester re-confirms |

---

## Critical Decision Protocol

These agents must stop and ask the user when they encounter decisions with long-term consequences:

| Agent | Asks about |
|---|---|
| product-owner | Ambiguous scope, who the users are, edge cases that change the whole design |
| architect | Protocol/transport choice, infra topology, storage strategy, third-party selection |
| backend-lead | Package selection trade-offs, DB design choices, queue vs sync |
| frontend-lead | State management approach, SSR trade-offs, new UI library adoption |

**Rules:**
1. Never ask a bare question — always bring a researched recommendation
2. Show options with trade-offs specific to this project's stack
3. Make it easy to approve: "My recommendation is X — shall I proceed?"
4. Maximum 3 questions per check-in
5. Do not proceed until the user responds

---

## Agent Invocation Templates

### project-manager → backend-lead

```
@backend-lead

Story: US-[ID] — [story title]
Branch: feature/[slug]

Tasks assigned to backend:
  T01: [title] — [description] — Acceptance: [criteria]
  T02: [title] — [description] — Acceptance: [criteria]

Dependencies: T02 depends on T01 / none
```

### project-manager → frontend-lead

```
@frontend-lead

Story: US-[ID] — [story title]
Branch: feature/[slug]

Tasks assigned to frontend:
  T03: [title] — [description] — Acceptance: [criteria]

API contract expected from backend: [endpoints / data shape if relevant]
Dependencies: wait for backend T01 before starting T03 / none
```

### backend-lead / frontend-lead → developer

```
@senior-backend / @junior-backend / @senior-frontend / @junior-frontend

Task: [T0X] — [title]
Description: [what needs to be done, be specific]
Acceptance criteria:
  - [ ] [criterion]
Constraints: [files NOT to touch, decisions already made]
Files likely involved: [list if known]
Depends on: [task title or "none"]
```

### lead → tester

```
@tester

Scope: [Backend / Frontend] — [area name]
Feature: [feature name]
Branch: feature/[slug]
What was built: [summary]
Files to test: [list]
Test command: [project-specific test command]
Acceptance criteria:
  - [ ] [criterion]
```

### lead → code-reviewer

```
@code-reviewer

Scope: [Backend / Frontend] — [area name]
Feature: [feature name]
All tests passing: yes
Files to review: [list]
Special attention: [security-sensitive? complex logic? new pattern?]
```
