# OpenCode Agent Team

A production-ready multi-agent software development team for [OpenCode](https://opencode.ai). Drop it into any project and get a full team — product owner, project manager, tech leads, developers, QA, code reviewer, designer, security auditor, performance analyst, and librarian — all coordinated through a strict delegation chain with parallel execution, git integration, Vibe Kanban, GitHub Actions, and a live todo board.

---

## How It Works

```
/team:new-feature <description>
        ↓
product-owner — clarifies scope, writes user story
        ↓
architect — resolves critical technical decisions
        ↓
project-manager — creates branch, breaks into tasks, updates todo board
        ↓
backend-lead + frontend-lead (parallel)
        ↓
senior/junior developers (parallel per task)
        ↓
code-reviewer (+ security-auditor if security-sensitive)
        ↓
tester
        ↓
librarian — records feature to team memory
```

Every phase is mandatory. Every commit follows conventional format. Every agent has bounded tool permissions — junior developers cannot push, leads cannot skip review.

---

## Agents (17)

| Agent | Role | Mode |
|---|---|---|
| `product-owner` | Clarifies scope, writes user stories, facilitates brainstorm sessions | primary |
| `project-manager` | Creates branches, breaks stories into tasks, coordinates leads | primary |
| `architect` | Technical decisions, ADR writing, infrastructure design | primary |
| `backend-lead` | Delegates backend tasks, owns review → QA for backend | primary |
| `frontend-lead` | Delegates frontend tasks, owns review → QA for frontend | primary |
| `designer` | Establishes visual design system, writes `project-design` skill | primary |
| `senior-backend` 🔒 | Complex backend features, integrations, performance | subagent |
| `junior-backend` 🔒 | CRUD, bug fixes, test writing | subagent |
| `senior-frontend` 🔒 | Complex components, state management, SSR | subagent |
| `junior-frontend` 🔒 | Simple UI, styling fixes, component tests | subagent |
| `tester` 🔒 | QA per scope — spawned in parallel by leads after review passes | subagent |
| `code-reviewer` 🔒 | Review per scope — spawned in parallel by leads before QA | subagent |
| `debugger` 🔒 | Root cause analysis for bugs and production incidents | subagent |
| `researcher` | Technology research, library comparison, spike reports | subagent |
| `security-auditor` 🔒 | OWASP Top 10, auth flaws, injection vulnerabilities | subagent |
| `performance-analyst` 🔒 | N+1 queries, missing indexes, bundle size, cache opportunities | subagent |
| `librarian` 🔒 | Team memory manager — decisions, features, bugs, research, debt | subagent |

---

## Commands (21)

### Setup
| Command | Use when |
|---|---|
| `/team:init` | **Start here.** Scans the project (using `stack-detect` tool), auto-detects the stack, and writes the `project-stack` skill. |
| `/team:designer <brief>` | Define the project's visual design system. |

### Feature development
| Command | Use when |
|---|---|
| `/team:brainstorm <idea>` | Explore an idea first. product-owner + architect discuss with you. Say "develop" to kick off the full pipeline. |
| `/team:new-feature <description>` | Full pipeline — scope → architect → implementation → review → QA |
| `/team:task <description>` | Single well-defined task — skips planning, goes directly to the right developer |
| `/team:quick-fix <description>` | 1–3 file correction, no new logic |
| `/team:tweak <description>` | Single file / single function change |

### Bug handling
| Command | Use when |
|---|---|
| `/team:bugfix <description>` | Debugger finds root cause, lead coordinates fix, tester verifies |
| `/team:hotfix <description>` | Production is broken — hotfix branch, debugger triage, fast-track review |

### Code quality & analysis
| Command | Use when |
|---|---|
| `/team:audit [scope]` | Full project audit — security, performance, and code quality in parallel |
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
| `/team:sprint <stories>` | Plan a sprint — surfaces debt backlog, breaks down tasks |
| `/team:standup` | Daily status — reads todo board, git log, and high-priority debt |

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

## Custom Tools (v1.7.0)

Four TypeScript tools in `.opencode/tools/` extend what agents can do:

| Tool | Used by | What it does |
|---|---|---|
| `memory_search` | All agents, team:recall | Semantic search over `.memory/` — finds relevant past decisions, bugs, and research |
| `complexity_score` | code-reviewer, performance-analyst, team:audit | Cyclomatic complexity per function/file — flags hotspots above threshold |
| `debt_summary` | project-manager, team:sprint, team:standup | Prioritized debt backlog from `.memory/debt/` grouped by priority and owner |
| `stack_detect` | architect, team:init | Auto-detects backend/frontend framework, databases, test commands, and runtime constraints |

Tools are placed in `.opencode/tools/` and are automatically available to all agents as native tool calls — no MCP server required.

---

## Security (v1.7.0)

### permission.task — Delegation chain at API level

Every agent has an explicit allowlist of agents it can invoke via the Task tool. Chain-skipping is impossible even if a rogue prompt tried to instruct it:

- `junior-backend` → `"task": {"*": "deny"}` — cannot spawn any subagents
- `product-owner` → can only call project-manager, architect, librarian
- `backend-lead` → can only call its developers, reviewers, testers, and librarian

### Granular bash permissions per tier

| Tier | Who | Rules |
|---|---|---|
| `lead` | backend-lead, frontend-lead | All commands allowed; `git push` requires approval |
| `senior` | senior devs, tester | All allowed; push/rebase/reset/rm-rf require approval; sudo denied |
| `junior` | junior devs | Only safe ops allowed (status/diff/add/commit/grep/find/cat/ls); push/rebase/reset/rm-rf denied |
| `readonly` | code-reviewer, debugger, auditors, librarian | Read commands allowed; push and sudo denied |

---

## GitHub Actions (v1.7.0)

Four workflows in `.github/workflows/`:

| Workflow | Trigger | What happens |
|---|---|---|
| `opencode.yml` | `/oc` or `/opencode` comment on issue/PR | OpenCode reads the thread and executes the request (fix, explain, implement) |
| `opencode-pr-review.yml` | PR opened, synchronized, or reopened | Automatic code review against coding-standards and project-stack constraints |
| `opencode-security-audit.yml` | Every Monday 09:00 UTC (or manual dispatch) | Full OWASP Top 10 scan — opens issues for Critical/High findings |
| `opencode-issue-triage.yml` | New issue opened | Classifies, labels, and comments on the issue (bot/spam-filtered) |

**Setup:** Add `ANTHROPIC_API_KEY` to GitHub → Settings → Secrets → Actions.

The install script asks whether to set these up. The update script detects and offers to install any missing workflows.

---

## Team Memory

The team accumulates knowledge in `.memory/` (committed to git):

```
.memory/
├── index.md          ← master index of all records
├── decisions/        ← architectural decisions and ADRs
├── features/         ← completed feature summaries
├── bugs/             ← root cause analyses and fixes
├── research/         ← technology research reports
└── debt/             ← technical debt backlog
```

Agents write to memory automatically after significant work. The `memory_search` tool lets any agent recall relevant history before starting new work.

---

## Installation

Node.js 18+ required.

```bash
node install.mjs
# or
npm run install-team
```

The script will:
1. Ask: **project** (`.opencode/` in current dir) or **global** (`~/.config/opencode/`)
2. Fetch available models via `opencode models`
3. Assign a **strong model** and a **fast model** across the team
4. Optionally customize models per individual agent
5. Ask whether to enable Vibe Kanban integration
6. Ask whether to set up GitHub Actions workflows
7. Copy all agent, command, skill, and tool files
8. Generate or merge `opencode.json` with permission.task + bash permissions
9. Create `AGENTS.md` for project installs

## Updating

```bash
node update.mjs
# or
npm run update-team

# Preview without writing:
node update.mjs --dry-run
```

The update script reads your current model assignments before overwriting anything and restores them after copying new files. It also checks for missing GitHub Actions workflows and offers to install them.

---

## Folder Structure

```
.opencode/
├── opencode.json              ← providers, model assignments, tool permissions, delegation chain
├── agents/                    ← 17 agent prompt files
├── commands/                  ← 21 command files
├── skills/
│   ├── workflow/SKILL.md      ← delegation chain, invocation templates
│   ├── git-workflow/SKILL.md  ← conventional commits, branch strategy
│   ├── coding-standards/SKILL.md ← quality rules, DoD, review severity
│   └── project-stack-template/SKILL.md ← template for /team:init
└── tools/
    ├── memory-search.ts       ← semantic search over .memory/
    ├── complexity-score.ts    ← cyclomatic complexity analysis
    ├── debt-summary.ts        ← prioritized debt backlog
    └── stack-detect.ts        ← auto-detects project stack

.github/
└── workflows/
    ├── opencode.yml
    ├── opencode-pr-review.yml
    ├── opencode-security-audit.yml
    └── opencode-issue-triage.yml

.memory/                       ← team memory (commit to git)
├── index.md
├── decisions/
├── features/
├── bugs/
├── research/
└── debt/

examples/
└── laravel-octane-inertia/
    └── project-stack/SKILL.md ← ready-made for Laravel 12 + Octane + Inertia SSR
```

---

## Configuration

See `.opencode/opencode.json`. Key additions in v1.7.0:

```json
"junior-backend": {
  "permission": {
    "bash": {
      "*": "ask",
      "git status": "allow",
      "git add *": "allow",
      "git commit *": "allow",
      "git push": "deny",
      "rm -rf *": "deny",
      "sudo *": "deny"
    },
    "task": { "*": "deny" }
  }
}
```

---

## Contributing

PRs welcome. If you've built a `project-stack` skill for a different stack (Next.js, NestJS, Django, Rails, Go, etc.), add it under `examples/` and open a PR.

When modifying agent prompts, keep these invariants:
- Delegation chain must remain strict — no step can be skipped
- `permission.task` in `opencode.json` must match the prompt rules
- Review must run before QA
- Todo board and git commit steps must remain mandatory for developers
- Parallel execution rules must remain — independent tasks always run in parallel
