---
name: workflow
description: Full team delegation chain, execution phases, parallelization rules, shared file protocol, error recovery, partial completion, context chain, todo board, Vibe Kanban, memory protocol, and agent invocation templates.
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
- `@security-auditor` — deep security review, spawned by leads when security-sensitive scope is detected
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

> **Note:** The delegation chain is enforced both by these prompt rules AND by `permission.task`
> in `opencode.json`. Each agent can only invoke agents explicitly listed in its task permissions.
> Junior developers have `"task": {"*": "deny"}` — they cannot spawn any subagents at all.
> This prevents chain-skipping even if an agent's prompt were to instruct otherwise.

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
lead → @code-reviewer (one per independent scope, in parallel)
    ↓
If scope is security-sensitive → lead also spawns @security-auditor in parallel
    ↓
If BLOCKED or CHANGES REQUIRED → lead reassigns fix to developer → re-triggers reviewer
    ↓
When ALL reviewers (and security-auditor if spawned) approve → lead moves to QA
```

### Phase 3 — QA

```
lead → @tester (one per independent scope, in parallel)
    ↓
If FAIL → lead reassigns fix to developer → re-triggers tester for that scope only
    ↓
When ALL testers PASS → feature is complete
```

### Phase 4 — Memory

```
project-manager → @librarian
    Write: feature summary, what was built, key decisions made during implementation
```

> **Why review before test?** Reviewers can block architectural changes that would make tests obsolete. Running tests on code that gets rejected wastes time.

---

## Parallelization Rules

- **Independent tasks → always parallel.**
- **Dependent tasks → sequential.**
- **Unlimited instances.** Leads may spawn as many developer, tester, or reviewer instances as needed.
- **Shared files → always sequential.**

---

## Context Chain Protocol

Story context and memory context must travel the full chain.

### Context field format (add to every delegation message)

```
Story context: [US-ID] — [one sentence: what the user wants and why]
Memory context: [relevant prior records, or "none"]
Architectural constraints: [decisions that limit implementation options, or "none"]
```

---

## Shared File Protocol

Before delegating parallel tasks, leads must identify shared files — files that multiple tasks will touch.

### Rules

1. **Identify shared files before starting.** Scan all task file lists for overlap.
2. **One developer per shared file at a time.**
3. **Pull before editing a shared file.** Run `git pull` first.
4. **If an unexpected conflict occurs:** Stop immediately, do not attempt to resolve. Report to lead.

---

## Partial Completion Protocol

When some tasks succeed and others fail, leads must:

1. Run `git log --oneline feature/<slug>` to assess what was committed
2. Classify the failure (developer failure / review blocked / QA fail)
3. Escalate to user with a clear partial state report:

```
⚠️ Partial completion — [feature name]

✅ Completed (committed):
  - T01: [title] — [short hash]

❌ Blocked:
  - T02: [title] — [reason]

Options:
  A) Retry T02 with adjusted instructions
  B) Drop T02 from this feature
  C) Abandon the entire feature

What would you like to do?
```

---

## Security-Sensitive Scope Detection

Spawn @security-auditor in parallel with @code-reviewer when scope involves:

| Area | Examples |
|---|---|
| Authentication / authorization | Login, logout, token handling, password reset, role checks |
| Payment / financial | Checkout, billing, refunds |
| Personal data | User profile, PII storage, GDPR flows |
| File uploads | Any endpoint accepting user-uploaded files |
| External API integration | Third-party webhooks, OAuth callbacks |
| Admin / privileged actions | Admin panels, bulk operations, data export |
| Cryptography | Hashing, encryption, key management |

---

## Error Recovery Protocol

**For a developer failure:**
1. Check git log — determine what was actually committed
2. Re-delegate with explicit instructions:
   ```
   RETRY — Task [T0X] did not complete successfully.
   Last known state: [what was committed / what was not]
   Continue from: [specific point]
   Do NOT re-do: [list of already-completed sub-steps]
   ```
3. If the same task fails twice → escalate to the user (Partial Completion Protocol)

**Steps limit prevention** — Leads should split large scopes proactively:
- More than 5 independent files → split into two reviewer invocations
- More than 3 acceptance criteria → split into two tester invocations

---

## Todo List Protocol

| Agent | Action | Status transition |
|---|---|---|
| project-manager | Creates all tasks | → `pending` |
| project-manager | Hands task to a lead | → `in-progress` |
| developer | Implementation complete | → `completed` |
| tester | QA PASS | qa task → `completed` |
| code-reviewer | APPROVED | review task → `completed` |

---

## Vibe Kanban Protocol

**Only active when the `project-stack` skill contains a `## Vibe Kanban` section.**

project-manager includes ALL IDs in every lead delegation message:

```
Kanban feature issue ID: <uuid>
Kanban task issue IDs:   T01=<uuid>, T02=<uuid>
Kanban review issue ID:  <uuid>
Kanban qa issue ID:      <uuid>
```

| Agent | When | Call |
|---|---|---|
| lead | assigns task | `update_issue(task_issue_id, status: "in_progress")` |
| developer | done | `update_issue(task_issue_id, status: "done")` |
| code-reviewer | approved | `update_issue(review_issue_id, status: "done")` |
| code-reviewer | blocked | `update_issue(review_issue_id, status: "in_review")` |
| tester | PASS | `update_issue(qa_issue_id, status: "done")` |
| tester | FAIL | `update_issue(qa_issue_id, status: "in_review")` |
| lead | all done | `update_issue(feature_issue_id, status: "done")` |

Valid status strings: `"todo"` · `"in_progress"` · `"in_review"` · `"done"`

---

## Memory Protocol

| Agent | Invokes @librarian when |
|---|---|
| project-manager | All leads report complete |
| architect | After writing an ADR or resolving a critical decision |
| backend-lead | After a bug fix or significant architectural change |
| frontend-lead | After a bug fix or significant architectural change |
| debugger | After completing a root cause analysis |
| researcher | After completing a research report |
| code-reviewer | When deferring a Required finding (technical debt) |
| designer | After establishing or significantly updating the design system |

---

## Critical Decision Protocol

| Agent | Asks about |
|---|---|
| product-owner | Ambiguous scope, user types, edge cases |
| architect | Protocol/transport choice, infra topology, storage strategy |
| backend-lead | Package selection, DB design, queue vs sync |
| frontend-lead | State management, SSR trade-offs, new UI library |

**Rules:**
1. Never ask a bare question — always bring a researched recommendation
2. Show options with trade-offs specific to this project's stack
3. Make it easy to approve: "My recommendation is X — shall I proceed?"
4. Maximum 3 questions per check-in

---

## Agent Invocation Templates

### project-manager → backend-lead

```
@backend-lead

Story: US-[ID] — [story title]
Branch: feature/[slug]
Story context: [one sentence — what the user wants and why]
Memory context: [relevant prior records, or "none"]
Architectural constraints: [decisions that limit options, or "none"]

Tasks assigned to backend:
  T01: [title] — [description] — Acceptance: [criteria]
  T02: [title] — [description] — Acceptance: [criteria]

Shared files: [list files touched by more than one task, or "none"]
Task sequencing: [T02 depends on T01 / all parallel]

Kanban feature issue ID: <uuid>
Kanban task issue IDs:   T01=<uuid>, T02=<uuid>
Kanban review issue ID:  <uuid>
Kanban qa issue ID:      <uuid>
```

### project-manager → frontend-lead

```
@frontend-lead

Story: US-[ID] — [story title]
Branch: feature/[slug]
Story context: [one sentence — what the user wants and why]
Memory context: [relevant prior records, or "none"]
Architectural constraints: [decisions that limit options, or "none"]

Tasks assigned to frontend:
  T03: [title] — [description] — Acceptance: [criteria]

Shared files: [list or "none"]
API contract expected from backend: [endpoints / data shape if relevant]

Kanban feature issue ID: <uuid>
Kanban task issue IDs:   T03=<uuid>
Kanban review issue ID:  <uuid>
Kanban qa issue ID:      <uuid>
```

### lead → developer

```
@senior-backend / @junior-backend / @senior-frontend / @junior-frontend

Task: [T0X] — [title]
Story context: [one sentence]
Memory context: [relevant prior records, or "none"]
Architectural constraints: [decisions that limit options, or "none"]

Description: [what needs to be done]
Acceptance criteria:
  - [ ] [criterion]
Constraints: [files NOT to touch, decisions already made]
Files likely involved: [list if known]
Shared files in this task: [list with sequencing note, or "none"]
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
Story context: [one sentence]
Security-sensitive: [yes / no]
Files to review: [list]
Special attention: [notes]

Kanban review issue ID:  <uuid>
Kanban feature issue ID: <uuid>
```

### lead → tester

```
@tester

Scope: [Backend / Frontend] — [area name]
Feature: [feature name]
Story context: [one sentence]
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
