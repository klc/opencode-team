# OpenCode Agent Team

A production-ready multi-agent software development team for [OpenCode](https://opencode.ai). Drop it into any project and get a full team — product owner, project manager, tech leads, developers, QA, code reviewer, designer, security auditor, performance analyst, and librarian — all coordinated through a **Kanban-driven automated pipeline** with strict delegation, parallel execution, git integration, GitHub Actions, and persistent team memory.

---

## How It Works

```
/team:new-feature "User profile photo upload"
        ↓
KAN-001 created (backlog) → @product-owner auto-triggered
        ↓
product-owner writes story → KAN-001 → planning → @project-manager auto-triggered
        ↓
project-manager creates KAN-002 (backend) + KAN-003 (frontend)
        ↓
KAN-002 in-progress → @backend-lead auto-triggered  ┐ parallel
KAN-003 in-progress → @frontend-lead auto-triggered ┘
        ↓
lead delegates to developer → developer commits
        ↓
lead → KAN-00X → review → @code-reviewer auto-triggered
        ↓
PASS → KAN-00X → testing → @tester auto-triggered
FAIL → KAN-00X → reopened → developer auto-routed back
        ↓
PASS → KAN-00X → done ✅
FAIL → KAN-00X → reopened → developer auto-routed back
```

Every phase is mandatory. Every status change triggers the next agent automatically. Agents never need to manually invoke each other — the Kanban system handles routing.

---

## Agents (17)

| Agent | Role | Mode |
|---|---|---|
| `product-owner` | Clarifies scope, writes user stories, creates Kanban tasks | primary |
| `project-manager` | Creates branches, splits into subtasks, coordinates leads via Kanban | primary |
| `architect` | Technical decisions, ADR writing, infrastructure design | primary |
| `backend-lead` | Delegates backend tasks, moves Kanban to review when done | primary |
| `frontend-lead` | Delegates frontend tasks, moves Kanban to review when done | primary |
| `designer` | Establishes visual design system, writes `project-design` skill | primary |
| `senior-backend` 🔒 | Complex backend features, integrations, performance | subagent |
| `junior-backend` 🔒 | CRUD, bug fixes, test writing | subagent |
| `senior-frontend` 🔒 | Complex components, state management, SSR | subagent |
| `junior-frontend` 🔒 | Simple UI, styling fixes, component tests | subagent |
| `tester` 🔒 | Runs tests, verifies acceptance criteria, moves Kanban to done or reopened | subagent |
| `code-reviewer` 🔒 | Reviews code, moves Kanban to testing or reopened | subagent |
| `debugger` 🔒 | Root cause analysis, can create Kanban bug tasks | subagent |
| `researcher` | Technology research, library comparison, spike reports | subagent |
| `security-auditor` 🔒 | OWASP Top 10, invoked alongside code-reviewer for security-sensitive scopes | subagent |
| `performance-analyst` 🔒 | N+1 queries, missing indexes, bundle size | subagent |
| `librarian` 🔒 | Team memory manager — enriches records with Kanban history | subagent |

---

## Commands (21)

### Setup

| Command | Use when |
|---|---|
| `/team:init` | **Start here.** Scans the project, auto-detects the stack, writes `project-stack` skill. |
| `/team:designer <brief>` | Define the project's visual design system. |

### Feature development

| Command | Use when |
|---|---|
| `/team:brainstorm <idea>` | Explore an idea first. product-owner + architect discuss with you. Say "develop" to kick off the full pipeline. |
| `/team:new-feature <description>` | Full Kanban-driven pipeline — creates KAN task, auto-triggers agents end-to-end |
| `/team:task <description>` | Single well-defined task — skips planning, goes directly to the right lead |
| `/team:quick-fix <description>` | 1–3 file correction, no new logic |
| `/team:tweak <description>` | Single file / single function change |

### Kanban board

| Command | Use when |
|---|---|
| `/team:kanban board` | See all active tasks grouped by status |
| `/team:kanban status KAN-001` | Full details of a specific task including history |
| `/team:kanban watch` | Check for stalled tasks and pending triggers |
| `/team:kanban new-feature <description>` | Alias for `/team:new-feature` |

### Bug handling

| Command | Use when |
|---|---|
| `/team:bugfix <description>` | Debugger finds root cause, lead coordinates fix, tester verifies |
| `/team:hotfix <description>` | Production is broken — hotfix branch, fast-track review |

### Code quality & analysis

| Command | Use when |
|---|---|
| `/team:audit [scope]` | Full project audit — security, performance, code quality in parallel |
| `/team:refactor <description>` | Improve code structure without changing behavior |
| `/team:add-test <description>` | Add tests to code that lacks coverage |
| `/team:review <file or area>` | Manually trigger a code review |

### Research & decisions

| Command | Use when |
|---|---|
| `/team:research <topic>` | Technology research — comparison report with recommendation |
| `/team:tech-decision <question>` | Architectural decision — researcher investigates, architect writes ADR |

### Planning & tracking

| Command | Use when |
|---|---|
| `/team:sprint <stories>` | Plan a sprint — surfaces Kanban board + debt backlog, breaks down tasks |
| `/team:standup` | Daily status — reads Kanban board, git log, and high-priority debt |

### Memory

| Command | Use when |
|---|---|
| `/team:remember <description>` | Manually save something to team memory |
| `/team:recall <topic>` | Search team memory — uses `memory-search` tool |
| `/team:resolve-debt <title>` | Pick up and resolve a specific debt item |

### Maintenance

| Command | Use when |
|---|---|
| `/team:update-docs <description>` | Update README, API docs, architecture docs, or inline comments |

---

## Kanban System (v1.8.0)

### How It Works

The Kanban system consists of three layers:

**1. File-based storage (`.kanban/`)**
Tasks live as JSON files. Every status change is recorded in the task history. The `index.json` provides a fast summary view.

**2. Custom tools** — agents call these to read/write tasks
- `kanban_create_task` — create a new tracked task
- `kanban_update_task` — update status, notes, assignee (this is what triggers the next agent)
- `kanban_get_task` — read full task details + history
- `kanban_list_tasks` — board view with filters
- `kanban_watch` — stall detection report

**3. kanban-trigger plugin** — the automation backbone
- Watches `.kanban/triggers/` every 5 seconds
- When a trigger file appears (written by `kanban_update_task`), reads the assigned agent and calls `session.prompt()` to notify them
- Runs a watchdog every 2 minutes that alerts on tasks stalled >30 minutes

### Status Flow

```
backlog → planning → in-progress → review → testing → done
                                      ↑          ↑
                                   reopened ←────┘ (on failure)
```

| Status | Auto-triggered agent |
|---|---|
| `backlog` | @product-owner |
| `planning` | @project-manager |
| `in-progress` | @backend-lead (backend scope) / @frontend-lead (frontend scope) |
| `review` | @code-reviewer |
| `testing` | @tester |
| `done` | — (notification only) |
| `reopened` | Last developer who worked on the task |

### Parallel Execution

Features with `scope: "both"` are split by project-manager into two subtasks:
- `KAN-00X — Backend` → @backend-lead (triggered immediately)
- `KAN-00Y — Frontend` → @frontend-lead (triggered immediately, in parallel)

Both teams work independently. Each moves through review → testing → done on its own timeline. No conflict, no blocking.

### File Structure

```
.kanban/
├── index.json              ← Task summary index (fast lookups)
├── KAN-001.json            ← Full task data with history
├── KAN-002.json
├── trigger.log             ← Plugin activity log
└── triggers/
    ├── KAN-001-1234.json   ← Pending trigger (plugin picks this up)
    └── processed/          ← Processed triggers (audit trail)
```

---

## Custom Tools (v1.8.0)

Nine TypeScript tools in `.opencode/tools/`:

| Tool | Used by | What it does |
|---|---|---|
| `kanban_create_task` | All agents, commands | Create tracked tasks with auto-assignment |
| `kanban_update_task` | All agents | Update status — triggers next agent automatically |
| `kanban_get_task` | All agents | Read full task context + history |
| `kanban_list_tasks` | All agents, `/team:kanban` | Board view with filters |
| `kanban_watch` | Watchdog, `/team:kanban watch` | Stall detection |
| `memory_search` | All agents, `/team:recall` | Semantic search over `.memory/` |
| `complexity_score` | code-reviewer, `/team:audit` | Cyclomatic complexity analysis |
| `debt_summary` | project-manager, sprint/standup | Prioritized debt backlog |
| `stack_detect` | architect, `/team:init` | Auto-detects project stack |

---

## Security (v1.7.0+)

### permission.task — Delegation chain at API level

Every agent has an explicit allowlist. Chain-skipping is impossible:
- `junior-backend` → `"task": {"*": "deny"}` — cannot spawn subagents
- `product-owner` → can only call project-manager, architect, librarian
- `backend-lead` → can only call its developers, reviewers, testers, librarian

### Bash permissions per tier

| Tier | Who | Rules |
|---|---|---|
| `lead` | backend-lead, frontend-lead | All allowed; `git push` requires approval |
| `senior` | senior devs, tester | All allowed; push/rebase/reset/rm-rf require approval; sudo denied |
| `junior` | junior devs | Only safe ops (status/diff/add/commit/grep/find/cat/ls); push/rebase/reset/rm-rf denied |
| `readonly` | code-reviewer, debugger, auditors, librarian | Read allowed; push and sudo denied |

---

## GitHub Actions (v1.7.0+)

Four workflows in `.github/workflows/`:

| Workflow | Trigger | What happens |
|---|---|---|
| `opencode.yml` | `/oc` comment on issue/PR | OpenCode executes the request |
| `opencode-pr-review.yml` | PR opened/synchronized | Automatic code review |
| `opencode-security-audit.yml` | Every Monday 09:00 UTC | Full OWASP Top 10 scan |
| `opencode-issue-triage.yml` | New issue opened | Classifies and labels the issue |

**Setup:** Add `ANTHROPIC_API_KEY` to GitHub → Settings → Secrets → Actions.

---

## Team Memory (v1.6.0+)

```
.memory/
├── index.md          ← master index
├── decisions/        ← architectural decisions and ADRs
├── features/         ← completed feature summaries (enriched with Kanban history)
├── bugs/             ← root cause analyses and fixes
├── research/         ← technology research reports
└── debt/             ← technical debt backlog
```

Since v1.8.0, memory records are enriched with Kanban task history — how many times a task was reopened, which agents worked on it, and what notes were left by reviewers and testers.

---

## Installation

Node.js 18+ required.

```bash
node install.mjs
# or
npm run install-team
```

The script will:
1. Ask: **project** (`.opencode/`) or **global** (`~/.config/opencode/`)
2. Fetch available models via `opencode models`
3. Assign a **strong model** and a **fast model** across the team
4. Optionally customize models per agent
5. Ask whether to set up GitHub Actions
6. Copy all agent, command, skill, tool, and plugin files
7. Generate or merge `opencode.json` with permission.task + bash permissions
8. Create `AGENTS.md` for project rules
9. Create `.kanban/` directory with empty index

## Updating

```bash
node update.mjs
# or
npm run update-team

# Preview without writing:
node update.mjs --dry-run
```

The update script:
- Reads your model assignments before overwriting
- Restores them after copying new files
- Checks for missing GitHub Actions workflows
- Checks and migrates Kanban directory structure
- Never overwrites `.kanban/` task data

---

## Folder Structure

```
.opencode/
├── opencode.json              ← providers, model assignments, permissions, delegation chain
├── agents/                    ← 17 agent prompt files (all Kanban-integrated)
├── commands/                  ← 21 command files
├── plugins/
│   └── kanban-trigger.ts      ← Kanban automation backbone
├── skills/
│   ├── workflow/SKILL.md
│   ├── git-workflow/SKILL.md
│   ├── coding-standards/SKILL.md
│   └── project-stack-template/SKILL.md
└── tools/
    ├── _kanban-core.ts        ← Shared Kanban types and helpers
    ├── kanban-create.ts
    ├── kanban-update.ts
    ├── kanban-get.ts
    ├── kanban-list.ts
    ├── kanban-watch.ts
    ├── memory-search.ts
    ├── complexity-score.ts
    ├── debt-summary.ts
    └── stack-detect.ts

.github/
└── workflows/
    ├── opencode.yml
    ├── opencode-pr-review.yml
    ├── opencode-security-audit.yml
    └── opencode-issue-triage.yml

.kanban/                       ← Kanban board (commit to git)
├── index.json
├── KAN-001.json
├── trigger.log
└── triggers/
    └── processed/

.memory/                       ← Team memory (commit to git)
├── index.md
├── decisions/
├── features/
├── bugs/
├── research/
└── debt/

examples/
└── laravel-octane-inertia/
    └── project-stack/SKILL.md
```

---

## Configuration

See `.opencode/opencode.json`. Key additions in v1.8.0 — agent descriptions now reference Kanban:

```json
"product-owner": {
  "description": "Invoke for new features or requirement changes. Clarifies scope, writes user stories, creates Kanban tasks, delegates to project-manager. Never writes code."
}
```

The Kanban plugin is loaded automatically from `.opencode/plugins/kanban-trigger.ts` at startup.

---

## Contributing

PRs welcome. If you've built a `project-stack` skill for a different stack (Next.js, NestJS, Django, Rails, Go, etc.), add it under `examples/` and open a PR.

When modifying agent prompts, keep these invariants:
- Delegation chain must remain strict — no step can be skipped
- `permission.task` must match prompt rules
- Agents must call `kanban_update_task` when their phase is done — never just report in text
- Review must run before QA
- Parallel execution: backend + frontend run in parallel, each team is sequential internally
