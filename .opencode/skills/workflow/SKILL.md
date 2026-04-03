---
name: workflow
description: Full team delegation chain, execution phases, parallelization rules, shared file protocol, error recovery, partial completion, context chain, todo board, memory protocol, and agent invocation templates.
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

## Heartbeat Protocol

Every sub-agent (developer, tester, reviewer) **MUST** write a Kanban progress note at least every 15 steps.

**Rule:** If you have taken 15 steps since your last Kanban update, stop and write one before continuing:

```
kanban_update_task({
  id: "[KAN-XXX]",
  note: "In progress — [what I just did, what remains]",
  agentName: "[your-agent-name]"
})
```

**Why:** If you go silent, the lead agent cannot detect whether you are working or stuck. A heartbeat note is proof of life.

**Minimum heartbeat events** (regardless of step count):
- After completing each acceptance criterion
- Before starting a long-running bash command
- After a bash command that takes more than a few seconds

---

## Bash Timeout Rule

Any bash command that may run indefinitely **MUST** be wrapped with `timeout`:

```bash
# Pattern
timeout <seconds> <command> || { echo "TIMEOUT: <command>"; exit 1; }

# Examples
timeout 120 npm install || { echo "TIMEOUT: npm install"; exit 1; }
timeout 60 npx tsc --noEmit || { echo "TIMEOUT: tsc"; exit 1; }
timeout 180 npm run build || { echo "TIMEOUT: build"; exit 1; }
timeout 30 git clone <url> || { echo "TIMEOUT: git clone"; exit 1; }
```

**Commands that always require a timeout:**
- `npm install` / `yarn install` / `bun install` → 120s
- `npm run build` / `npm run test` → 180s
- `npx ...` → 60s
- `git clone` → 30s
- Any network request via curl/wget → 30s

**On timeout:** Stop immediately, report `TIMEOUT: <command>` to the lead agent, do not retry silently.

---

## Stuck Detection Protocol

**For lead agents (backend-lead, frontend-lead):**

A sub-agent is considered **stuck** if any of the following are true:

| Signal | Meaning |
|---|---|
| No Kanban note within 15 steps of delegation | Agent not making progress |
| Same Kanban note written twice in a row | Agent looping |
| Agent reports completion but criteria unmet | Silent failure |
| Bash timeout error received | Command hung |
| No response after steps limit is reached | Steps exhausted without report |

**When stuck is detected, leads MUST:**

1. Check the last Kanban note and git log:
   ```bash
   git log --oneline HEAD~5..HEAD
   ```

2. Re-delegate immediately using RETRY format:
   ```
   RETRY — [T0X] appears stuck or incomplete.
   Last known state: [last Kanban note / last git commit]
   Continue from: [specific step to resume]
   Do NOT re-do: [list of already-completed steps]
   Bash timeout required on: [any long commands]
   ```

3. If the same task fails twice after RETRY → apply **Partial Completion Protocol** and escalate to user.

**Self-check rule for all agents:**
> Before completing your turn, ask yourself: "Did I update Kanban with my final status?" If not, do it now.

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

## Memory Protocol

| Agent | Invokes @librarian when |
|---|---|
| project-manager | After breaking down a feature into tasks (to create the feature plan in memory) |
| project-manager | All leads report complete |
| architect | After writing an ADR or resolving a critical decision |
| backend-lead | After a bug fix or significant architectural change |
| backend-lead | Whenever a task is marked completed by a developer (or after QA/Review passes) |
| frontend-lead | After a bug fix or significant architectural change |
| frontend-lead | Whenever a task is marked completed by a developer (or after QA/Review passes) |
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
```

### lead → code-reviewer

```
@code-reviewer

Scope: [Backend / Frontend] — [area name]
Feature: [feature name]
Story context: [one sentence]
Security-sensitive: [yes / no]
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
```

### project-manager → librarian (after feature planning)

```
@librarian

ACTION: plan-feature
TITLE: [feature name]
CONTENT:
  Story: [US-ID and title]
  Branch: feature/[slug]
  Tasks planned:
    - [ ] [Task ID]: [Task Title]
    - [ ] [Task ID]: [Task Title]
```

### lead → librarian (after task complete)

```
@librarian

ACTION: update-task
TITLE: [feature name]
CONTENT:
  Tasks completed:
    - [x] [Task ID]: [Task Title]
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
