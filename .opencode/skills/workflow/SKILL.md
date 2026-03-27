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
    (includes: story context, memory context, shared file map)
    ↓
leads check for shared files, then delegate to developers (parallel instances as needed)
    (includes: task description, acceptance criteria, story context, memory context)
    ↓
developers implement + commit + mark todo completed + report to lead
```

### Phase 2 — Review

Triggered by leads when ALL their parallel developers report complete.

```
backend-lead  → @code-reviewer (one per independent scope, in parallel)
frontend-lead → @code-reviewer (one per independent scope, in parallel)
    ↓
If scope is security-sensitive → lead also spawns @security-auditor in parallel
    ↓
Each reviewer reports verdict to their lead
    ↓
If BLOCKED or CHANGES REQUIRED → lead reassigns fix to developer → re-triggers reviewer for that scope only
    ↓
When ALL reviewers (and security-auditor if spawned) approve → lead moves to QA
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

- **Independent tasks → always parallel.**
- **Dependent tasks → sequential.**
- **Unlimited instances.** Leads may spawn as many developer, tester, or reviewer instances as needed.
- **Same scope, sequential.** A single scope must not have two agents working on it simultaneously.
- **Shared files → always sequential.** See Shared File Protocol below.

---

## Context Chain Protocol

**The user story context and memory context must travel the full chain — every agent that receives a delegation must pass them forward.**

Context degrades at each handoff when agents only receive the immediate task without understanding why it exists. This causes reviewers and testers to miss intent, and developers to make the wrong trade-offs.

### What counts as context

- **Story context:** the user story title, the "so that" value statement, and the acceptance criteria summary
- **Memory context:** any relevant records retrieved from @librarian at the start of the feature (prior decisions, similar features, known bugs in this area)
- **Architectural context:** any decisions made by @architect that constrain this task

### Rules

1. **project-manager** includes story context and memory context in every lead delegation message.
2. **Leads** include story context, memory context, and any architectural constraints in every developer delegation message.
3. **Leads** include story context in every reviewer and tester delegation — so they understand what the feature is trying to achieve, not just what files changed.
4. **Developers** do not need to pass context forward — they report to their lead, not to other agents.
5. Context should be brief — a 2–3 sentence summary, not a copy-paste of the full story.

### Context field format (add to every delegation message)

```
Story context: [US-ID] — [one sentence: what the user wants and why]
Memory context: [relevant prior records, or "none"]
Architectural constraints: [decisions that limit implementation options, or "none"]
```

---

## Shared File Protocol

**Before delegating parallel tasks**, leads must identify shared files — files that multiple tasks will touch.

### What counts as a shared file

- Type definition files: `types.ts`, `types.d.ts`, `interfaces.ts`
- Constant and config files: `constants.ts`, `config.ts`, `enums.ts`
- Database migrations and schema files
- Global state stores shared across features
- Route definition files
- i18n / translation files
- Shared utility files imported by more than one task

### Rules

1. **Identify shared files before starting.** Scan all task file lists for overlap.
2. **One developer per shared file at a time.** If T01 and T02 both touch `types.ts`, T01 must complete and commit before T02 starts.
3. **Pull before editing a shared file.** Run `git pull` first.
4. **Declare shared file ownership in the delegation message** (see template below).
5. **If an unexpected conflict occurs:** Stop immediately, do not attempt to resolve. Report to lead:
```
⚠️ Conflict detected in [filename]
Conflicting tasks: T0X and T0Y
Please resolve sequencing before I continue.
```

---

## Partial Completion Protocol

A partial completion occurs when some tasks in a feature succeed and others fail — leaving the branch in a mixed state.

### How to detect partial completion

A lead is in a partial completion state when:
- One or more developers have committed and marked their tasks `completed`
- One or more other tasks have failed (developer failure, review blocked, QA fail after multiple retries)
- The feature cannot proceed to the next phase with the failed tasks outstanding

### Lead responsibilities

**Step 1 — Assess what was committed**

```bash
git log --oneline feature/<slug>
git diff main...feature/<slug> --name-only
```

Determine: which tasks produced commits? Which did not?

**Step 2 — Classify the failure**

| Failure type | Action |
|---|---|
| Developer could not complete (steps limit, unclear requirements) | Re-delegate with clarified instructions |
| Review permanently blocked (architectural problem) | Escalate to user — do not proceed |
| QA fail after 2+ retries | Escalate to user — do not proceed |
| Dependency on another failing task | Resolve the dependency first |

**Step 3 — Escalate to user when blocked**

When a task cannot be resolved without user input, report the partial state clearly:

```
⚠️ Partial completion — [feature name]

✅ Completed tasks (committed to feature/[slug]):
  - T01: [title] — committed [short hash]
  - T02: [title] — committed [short hash]

❌ Blocked tasks (not committed):
  - T03: [title] — [reason for failure]
  - T04: [title] — [waiting on T03]

The committed work is safe on the branch. The blocked tasks have not modified any files.

Options:
  A) Retry T03 with adjusted instructions — describe what should change
  B) Drop T03 and T04 from this feature — they can be handled in a follow-up task
  C) Abandon the entire feature — I will list the commits to revert

What would you like to do?
```

**Step 4 — If user chooses to revert**

List the commits to revert in reverse order. Do not revert automatically — wait for explicit user confirmation:

```
To revert the completed work, run these commands in order:
  git revert <hash-T02> --no-commit
  git revert <hash-T01> --no-commit
  git commit -m "revert: remove partial [feature name] implementation"

Shall I proceed?
```

### What NOT to do in a partial completion

- Do not merge the branch with partial work
- Do not continue to the review phase with incomplete tasks
- Do not silently skip failed tasks and report the feature as done
- Do not revert commits without explicit user confirmation

---

## Security-Sensitive Scope Detection

Leads must assess whether a scope is security-sensitive **before** spawning reviewers.

### Triggers — spawn @security-auditor in parallel with @code-reviewer

| Area | Examples |
|---|---|
| Authentication / authorization | Login, logout, token handling, password reset, role checks, middleware guards |
| Payment / financial | Checkout, billing, refunds, subscription management |
| Personal data | User profile, PII storage or display, GDPR-related flows |
| File uploads | Any endpoint accepting user-uploaded files |
| External API integration | Third-party webhooks, OAuth callbacks, API key handling |
| Admin / privileged actions | Admin panels, bulk operations, data export |
| Cryptography | Hashing, encryption, key management |

### How to spawn security-auditor alongside code-reviewer

```
Parallel review tasks:

Task A → @code-reviewer
  Scope: [area] | Files: [list] | Special attention: [notes]
  Story context: [summary]

Task B → @security-auditor
  Scope: [area] | Files: [list]
  Focus: [most relevant OWASP categories for this scope]
  Story context: [summary]
```

Wait for BOTH. A security-auditor BLOCKED verdict is treated identically to a code-reviewer BLOCKED.

---

## Error Recovery Protocol

### Detecting failure

A lead should treat a subagent as failed if:
- No completion report is received
- The report is missing required fields
- The report mentions hitting a steps limit or being unable to continue
- Committed files are missing or the commit was not made

### Recovery steps

**For a developer failure:**
1. Check git log — determine what was actually committed
2. If partially committed: note exactly which files were modified, do NOT build on partial work
3. Re-delegate with explicit instructions:
   ```
   RETRY — Task [T0X] did not complete successfully.
   Last known state: [what was committed / what was not]
   Continue from: [specific point]
   Do NOT re-do: [list of already-completed sub-steps]
   ```
4. If the same task fails twice → escalate to the user (see Partial Completion Protocol)

**For a reviewer or tester failure:**
1. Re-invoke with the same scope — these agents are stateless, a clean retry is safe
2. If it fails twice → reduce the scope (split into smaller chunks) and retry

### Steps limit prevention

Leads should split large scopes proactively:
- More than 5 independent files → split into two reviewer invocations
- More than 3 acceptance criteria → split into two tester invocations
- A developer task estimated at more than 4–5 hours of real work → split before delegating

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

### Issue ID passing

project-manager includes ALL four IDs in every lead delegation message:

```
Kanban feature issue ID: <uuid>
Kanban task issue IDs:   T01=<uuid>, T02=<uuid>
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

**Always active.**

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
Task sequencing: [wait for backend T01 / all parallel]

Kanban feature issue ID: <uuid>
Kanban task issue IDs:   T03=<uuid>
Kanban review issue ID:  <uuid>
Kanban qa issue ID:      <uuid>
```

### backend-lead / frontend-lead → developer

```
@senior-backend / @junior-backend / @senior-frontend / @junior-frontend

Task: [T0X] — [title]
Story context: [one sentence — what the user wants and why]
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
Story context: [one sentence — what this feature is trying to achieve]
Security-sensitive: [yes / no]
Files to review: [list]
Special attention: [security-sensitive? complex logic? new pattern?]

Kanban review issue ID:  <uuid>
Kanban feature issue ID: <uuid>
```

### lead → security-auditor (when security-sensitive)

```
@security-auditor

Scope: [Backend / Frontend] — [area name]
Feature: [feature name]
Story context: [one sentence]
Files to audit: [list]
Focus areas: [auth? payment? file upload? data exposure?]

Report back to me (not to the developer) with your findings.
```

### lead → tester

```
@tester

Scope: [Backend / Frontend] — [area name]
Feature: [feature name]
Story context: [one sentence — what this feature is trying to achieve]
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
