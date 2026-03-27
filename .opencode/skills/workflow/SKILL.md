---
name: workflow
description: Full team delegation chain, execution phases, parallelization rules, todo board protocol, Vibe Kanban issue tracking, memory protocol, and agent invocation templates.
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
- `@tester` — QA, spawned by leads after all reviews pass
- `@code-reviewer` — code review, spawned by leads before QA
- `@architect` — architecture decisions, invoked before implementation starts
- `@debugger` — production incidents and hard-to-reproduce bugs
- `@researcher` — technology evaluation, spike investigations
- `@librarian` — team memory, invoked after significant work completes

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

---

## Execution Phases

Phases are strictly sequential.

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
Each reviewer reports verdict to their lead
    ↓
If BLOCKED or CHANGES REQUIRED → lead reassigns fix to developer → re-triggers reviewer for that scope only
    ↓
When ALL reviewers approve → lead moves to QA
```

### Phase 3 — QA

Triggered by leads when ALL their reviewers approve.

```
backend-lead  → @tester (one per independent scope, in parallel)
frontend-lead → @tester (one per independent scope, in parallel)
    ↓
Each tester reports PASS or FAIL to their lead
    ↓
If FAIL → lead reassigns fix to developer → re-triggers tester for that scope only
    ↓
When ALL testers PASS → feature is complete
```

### Phase 4 — Memory

Triggered by project-manager when ALL leads report their scopes complete.

```
project-manager → @librarian
    Write: feature summary, what was built, key decisions made during implementation
```

> **Why review before test?** Reviewers can block architectural or structural changes that would make tests obsolete. Running tests first on code that gets rejected wastes time and creates conflicting fix commits.

---

## Parallelization Rules

- **Independent tasks → always parallel.** If two tasks don't share files and don't depend on each other's output, invoke both simultaneously.
- **Dependent tasks → sequential.** If task B requires task A's output, call A first, wait, then call B.
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

## Vibe Kanban Protocol

**Only active when the `project-stack` skill contains a `## Vibe Kanban` section.**
If that section is absent, skip all Vibe Kanban steps and use todowrite/todoread only.

### Issue creation (project-manager)

project-manager creates all issues at story start — one parent feature issue and one sub-issue per task (including `[review]` and `[qa]` tasks). All start with status `"todo"`.

### Issue ID passing

project-manager includes ALL four IDs in every lead delegation message:

```
Kanban feature issue ID: <uuid>
Kanban task issue ID:    <uuid>
Kanban review issue ID:  <uuid>
Kanban qa issue ID:      <uuid>
```

Leads pass the full set to developers, reviewers, and testers unchanged.

### Status update rules

| Agent | When | Call |
|---|---|---|
| lead | assigns task to developer | `update_issue(task_issue_id, status: "in_progress")` |
| developer | implementation done | `update_issue(task_issue_id, status: "done")` |
| lead | triggers review | `update_issue(review_issue_id, status: "in_progress")` |
| code-reviewer | approved | `update_issue(review_issue_id, status: "done")` |
| code-reviewer | blocked / changes | `update_issue(review_issue_id, status: "in_review")` |
| lead | triggers QA | `update_issue(qa_issue_id, status: "in_progress")` |
| tester | PASS | `update_issue(qa_issue_id, status: "done")` |
| tester | FAIL | `update_issue(qa_issue_id, status: "in_review")` |
| lead | all tasks done | `update_issue(feature_issue_id, status: "done")` |

Valid status strings: `"todo"` · `"in_progress"` · `"in_review"` · `"done"`

---

## Memory Protocol

**Always active.** @librarian is invoked after significant work — not for every small step.

### Who invokes @librarian and when

| Agent | Invokes @librarian when |
|---|---|
| project-manager | All leads report complete — feature is done |
| architect | After writing an ADR or resolving a critical decision |
| backend-lead | After a bug fix or significant architectural change in their scope |
| frontend-lead | After a bug fix or significant architectural change in their scope |
| debugger | After completing a root cause analysis |
| researcher | After completing a research report |
| code-reviewer | When deferring a Required finding (technical debt) |
| designer | After establishing or significantly updating the design system |

Developers (senior/junior) do NOT invoke @librarian directly — their leads handle memory for the scope.

### What to record

```
project-manager → TYPE: feature
  TITLE: [feature name]
  CONTENT: what was built, branch, tasks completed, key implementation decisions

architect → TYPE: decision
  TITLE: [decision title]
  CONTENT: options considered, what was decided, rationale, consequences

backend-lead / frontend-lead → TYPE: bug (when fixing)
  TITLE: [bug description]
  CONTENT: root cause, fix applied, prevention

debugger → TYPE: bug
  TITLE: [short bug description]
  CONTENT: symptoms, root cause, fix, prevention

researcher → TYPE: research
  TITLE: [research topic]
  CONTENT: question, recommendation, options, sources

code-reviewer → TYPE: debt (deferred Required findings only)
  TITLE: [debt description]
  CONTENT: location, issue, why deferred, estimated effort, risk

designer → TYPE: decision
  TITLE: design-system-[version or date]
  CONTENT: direction, primary color, typography, key decisions, what was rejected
```

### Before starting significant work

architect and researcher should check memory first:

```
ACTION: recall
QUERY: [topic]
```

---

## Critical Decision Protocol

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

Kanban feature issue ID: <uuid>
Kanban task issue IDs:   T01=<uuid>, T02=<uuid>
Kanban review issue ID:  <uuid>
Kanban qa issue ID:      <uuid>

Dependencies: T02 depends on T01 / none
```

### project-manager → frontend-lead

```
@frontend-lead

Story: US-[ID] — [story title]
Branch: feature/[slug]

Tasks assigned to frontend:
  T03: [title] — [description] — Acceptance: [criteria]

Kanban feature issue ID: <uuid>
Kanban task issue IDs:   T03=<uuid>
Kanban review issue ID:  <uuid>
Kanban qa issue ID:      <uuid>

API contract expected from backend: [endpoints / data shape if relevant]
Dependencies: wait for backend T01 before starting T03 / none
```

### backend-lead / frontend-lead → developer

```
@senior-backend / @junior-backend / @senior-frontend / @junior-frontend

Task: [T0X] — [title]
Description: [what needs to be done]
Acceptance criteria:
  - [ ] [criterion]
Constraints: [files NOT to touch, decisions already made]
Files likely involved: [list if known]
Depends on: [task title or "none"]

Kanban task issue ID:    <uuid>
Kanban review issue ID:  <uuid>
Kanban qa issue ID:      <uuid>
Kanban feature issue ID: <uuid>
```

### lead → code-reviewer

```
@code-reviewer

Scope: [Backend / Frontend] — [area name]
Feature: [feature name]
Files to review: [list]
Special attention: [security-sensitive? complex logic? new pattern?]

Kanban review issue ID:  <uuid>
Kanban feature issue ID: <uuid>
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

Kanban qa issue ID:      <uuid>
Kanban feature issue ID: <uuid>
```

### project-manager → librarian (after feature complete)

```
@librarian

ACTION: write
TYPE: feature
TITLE: [feature name]
CONTENT:
  Story: [US-ID and title]
  What was built: [summary of implementation]
  Branch: feature/[slug]
  Tasks completed: [T01, T02, ...]
  Key decisions made during implementation: [if any]
  Known limitations: [if any]
```
