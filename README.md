# OpenCode Agent Team

A production-ready multi-agent software development team for [OpenCode](https://opencode.ai). Drop it into any project and get a full team — product owner, project manager, tech leads, developers, QA, code reviewer, SEO/GEO auditor, designer, security auditor, performance analyst, and librarian — all coordinated through a **Kanban-driven automated pipeline** with strict delegation, lead-owned delivery cycles, git integration, GitHub Actions, and persistent team memory.

---

## How It Works

```
/team:new-feature "User profile photo upload"
        ↓
KAN-001 created (backlog) → @product-owner writes story
        ↓
KAN-001 → planning → @project-manager creates subtasks + branch
        ↓
KAN-002 (backend) → @backend-lead    ┐ parallel
KAN-003 (frontend) → @frontend-lead  ┘
        ↓
Lead delegates to developer
        ↓
Developer implements (TDD: RED→GREEN→REFACTOR)
Developer reports back to Lead with test output evidence
        ↓
Lead calls @code-reviewer
[If Pages/ or Layouts/ changed] Lead also calls @seo-auditor (parallel)
        ↓
ALL APPROVED → Lead calls @tester
CHANGES REQUIRED → Lead re-delegates to developer → back to review
        ↓
ALL PASS → Lead marks done → reports to @project-manager
ANY FAIL → Lead re-delegates to developer → back to review → back to test
```

**The lead owns the entire cycle.** Developers, reviewers, testers, and the SEO auditor all report back to the lead. The lead is the single coordinator — it calls the next agent, updates Kanban, and decides what happens next.

---

## Agents (18)

| Agent | Role | Mode |
|---|---|---|
| `product-owner` | Clarifies scope, writes user stories, creates Kanban tasks | primary |
| `project-manager` | Creates branches, splits into subtasks, coordinates leads via Kanban | primary |
| `architect` | Technical decisions, ADR writing, infrastructure design | primary |
| `backend-lead` | Owns full backend delivery cycle: delegate → review → test → done | primary |
| `frontend-lead` | Owns full frontend delivery cycle: delegate → review → SEO audit → test → done | primary |
| `designer` | Establishes visual design system, writes `project-design` skill | primary |
| `senior-backend` 🔒 | Complex backend features; reports to backend-lead | subagent |
| `junior-backend` 🔒 | CRUD, bug fixes, test writing; reports to backend-lead | subagent |
| `senior-frontend` 🔒 | Complex components, state management, SSR; reports to frontend-lead | subagent |
| `junior-frontend` 🔒 | Simple UI, styling fixes; reports to frontend-lead | subagent |
| `tester` 🔒 | Runs tests, verifies acceptance criteria, reports findings to lead | subagent |
| `code-reviewer` 🔒 | Reviews code, reports findings to lead | subagent |
| `seo-auditor` 🔒 | **NEW** Technical SEO, GEO/AEO readiness, E-E-A-T, AI crawler access, SSR meta rendering; reports findings to frontend-lead | subagent |
| `debugger` 🔒 | Root cause analysis using systematic 4-phase process | subagent |
| `researcher` | Technology research, library comparison, spike reports | subagent |
| `security-auditor` 🔒 | OWASP Top 10, invoked alongside code-reviewer for security-sensitive scopes | subagent |
| `performance-analyst` 🔒 | N+1 queries, missing indexes, bundle size | subagent |
| `librarian` 🔒 | Team memory manager — enriches records with Kanban history | subagent |

---

## Lead-Owned Delivery Cycle (v2.0.0)

The lead is the single coordinator for every task it owns. The full frontend cycle (including SEO):

```
PHASE 1 — Delegate to developer
  Lead → developer (Task tool)
  Developer: TDD cycle (RED→GREEN→REFACTOR) → commit → report to lead

PHASE 2 — Lead reviews report
  If incomplete → send back to developer immediately
  If complete → proceed

PHASE 3a — SEO Scope Detection (frontend only)
  Lead runs: git diff origin/main...HEAD --name-only | grep -E "(Pages/|Layouts/)"
  Pages/ or Layouts/ changed → call @code-reviewer AND @seo-auditor in parallel
  Only Components/ changed → call @code-reviewer only (no SEO audit)

PHASE 3 — Code Review + SEO Audit (parallel when applicable)
  Lead → @code-reviewer (Task tool)
  Lead → @seo-auditor  (Task tool, parallel — Pages/Layouts only)

  code-reviewer: reads every changed line → reports APPROVED or CHANGES REQUIRED to lead
  seo-auditor:   checks Technical SEO + GEO Readiness Score (0-100) → reports to lead

PHASE 4 — After Reviews
  BOTH APPROVED → proceed to PHASE 5
  code-reviewer CHANGES REQUIRED → Lead reopens → re-delegates to developer
  seo-auditor   CHANGES REQUIRED → Lead reopens → re-delegates to developer
  Loop: dev → review + SEO → until both approve

PHASE 5 — Testing
  Lead updates Kanban to "testing"
  Lead → @tester (Task tool)
  Tester runs full suite → verifies each acceptance criterion → reports to lead

PHASE 6 — After Testing
  ALL PASS → Lead updates Kanban to "done" → reports to project-manager
  ANY FAIL → Lead reopens → re-delegates to developer → back to PHASE 3
```

**Key principles:**
- `code-reviewer`, `seo-auditor`, and `tester` never touch Kanban — they report to the lead
- SEO audit runs in parallel with code review (never blocks or delays it)
- SEO audit only triggers when Pages/ or Layouts/ files change — not for every frontend task

---

## SEO/GEO Auditor — What It Checks

### Section 1 — Technical SEO (9 Categories)

| Category | What's Checked |
|---|---|
| Meta & Head | title (50-60 chars), description (150-160 chars), canonical, Open Graph, Twitter Card, robots |
| Semantic HTML | single h1, heading hierarchy, semantic elements, alt attributes, href on anchors |
| Structured Data | JSON-LD format, page-appropriate schema, **no deprecated schemas** (FAQPage⚠️, HowTo❌, SpecialAnnouncement❌) |
| SSR / JS Rendering | meta tags in server-rendered HTML, no window/document at setup level (Inertia SSR critical) |
| Core Web Vitals | LCP eager loading, **INP < 200ms** (FID removed Sept 2024), CLS image dimensions |
| AI Crawler Access | robots.txt allows GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, CCBot, Bytespider, cohere-ai |
| Security Headers | HTTPS, CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| llms.txt | File presence and structure at `/llms.txt` |
| IndexNow | Protocol support for Bing/Yandex/Naver faster indexing |

### Section 2 — GEO Readiness Score (0-100)

| Dimension | Weight | What's Checked |
|---|---|---|
| Citability | 25% | 134-167 word self-contained answer blocks, direct answer in first 40-60 words, sourced statistics |
| Structural Readability | 20% | Question-based H2/H3 headings, 2-4 sentence paragraphs, comparison tables, semantic lists |
| Multi-modal Content | 15% | Text+image pairing, video/infographic presence, interactive elements |
| Authority & E-E-A-T | 20% | Author bylines+credentials, publication dates, primary source citations, first-hand experience signals (Sept 2025 Guidelines) |
| Technical Accessibility | 20% | AI crawler permissions, llms.txt, SSR correctness for AI crawlers |

**Severity levels:**

| Level | Examples | Blocks merge? |
|---|---|---|
| 🔴 Critical | noindex wrong, canonical broken, h1 missing, meta absent, AI crawlers fully blocked, SSR meta not rendering | Yes |
| 🟠 High | OG missing, JSON-LD absent, INP issues, img alt missing, deprecated schema used, AI crawler partially blocked | Yes |
| 🟡 Medium | llms.txt absent, citability blocks suboptimal, author info missing, security headers incomplete | No |
| 🟢 Suggestion | Multi-modal content opportunity, VideoObject schema, IndexNow protocol, entity markup | No |

**Approval condition:** Zero 🔴 Critical and zero 🟠 High findings.

---

## `/team:seo-audit` Command

Manual SEO/GEO audit for existing pages or a live site:

```bash
# Audit recent changes (Pages/ and Layouts/ in last commit)
/team:seo-audit

# Audit a specific file or directory
/team:seo-audit resources/js/Pages/Home.vue

# Audit live site (source code + live URL comparison)
/team:seo-audit https://example.com

# Audit specific page live
/team:seo-audit https://example.com/about
```

When a URL is provided, the auditor compares source code findings with the rendered live HTML — detecting SSR mismatches where meta tags exist in code but don't appear in the live page.

---

## Skills Library (v2.0.0)

### Core Methodology Skills

| Skill | Used by | Purpose |
|---|---|---|
| `test-driven-development` | All developers | RED-GREEN-REFACTOR Iron Law. Writing code before tests → delete and restart. |
| `systematic-debugging` | debugger, tester | 4-phase root cause process. No fixes without completing Phase 1. |
| `verification-before-completion` | All developers, tester, reviewer | Run the command, read the output, then report. "Should work" is not verification. |
| `receiving-code-review` | All developers | Verify before implementing, ask before assuming, one item at a time. |

### Workflow Skills

| Skill | Used by | Purpose |
|---|---|---|
| `workflow` | leads, project-manager | Delegation chain, parallelization, context chain, memory protocol |
| `coding-standards` | all agents | Quality rules, Definition of Done, review severity levels |
| `git-workflow` | all developers | Commit format, branch strategy, breaking changes |
| `project-stack` | all agents | Project-specific tech stack, commands, constraints |
| `project-stack-template` | architect | Template for creating the project-stack skill |

---

## Commands (22)

### Setup

| Command | Use when |
|---|---|
| `/team:init` | **Start here.** Scans the project, auto-detects the stack, writes `project-stack` skill. |
| `/team:designer <brief>` | Define the project's visual design system. |

### Feature development

| Command | Use when |
|---|---|
| `/team:brainstorm <idea>` | Explore an idea first. product-owner + architect discuss with you. Say "develop" to kick off the full pipeline. |
| `/team:new-feature <description>` | Full Kanban-driven pipeline — creates KAN task, triggers full delivery cycle end-to-end |
| `/team:task <description>` | Single well-defined task — skips planning, goes directly to the right lead |
| `/team:quick-fix <description>` | 1–3 file correction, no new logic |
| `/team:tweak <description>` | Single file / single function change |

### Kanban board

| Command | Use when |
|---|---|
| `/team:kanban board` | See all active tasks grouped by status |
| `npm run kanban-board` | Launch the local web-based Kanban Board GUI |
| `/team:kanban status KAN-001` | Full details of a specific task including history |
| `/team:kanban watch` | Check for stalled tasks |
| `/team:kanban new-feature <description>` | Alias for `/team:new-feature` |

### Bug handling

| Command | Use when |
|---|---|
| `/team:bugfix <description>` | Debugger finds root cause (4-phase systematic process), lead coordinates fix |
| `/team:hotfix <description>` | Production is broken — hotfix branch, fast-track review |

### Code quality & analysis

| Command | Use when |
|---|---|
| `/team:audit [scope]` | Full project audit — security, performance, code quality in parallel |
| `/team:seo-audit [url or path]` | **NEW** SEO/GEO audit — technical SEO (9 categories) + GEO readiness score (0-100). Supports live URL comparison. |
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
| `/team:recall <topic>` | Search team memory |
| `/team:resolve-debt <title>` | Pick up and resolve a specific debt item |

### Maintenance

| Command | Use when |
|---|---|
| `/team:update-docs <description>` | Update README, API docs, architecture docs, or inline comments |

---

## Kanban System

### Status Flow

```
backlog → planning → in-progress → review → testing → done
                                      ↑          ↑
                                   reopened ←────┘ (on failure)
```

| Status | Who sets it |
|---|---|
| `backlog` | product-owner (on task creation) |
| `planning` | product-owner (after story is written) |
| `in-progress` | project-manager or lead (when work starts) |
| `review` | lead (after developer reports completion) |
| `testing` | lead (after code-reviewer AND seo-auditor both report APPROVED) |
| `done` | lead (after tester reports ALL PASS) |
| `reopened` | lead (after reviewer, seo-auditor, or tester reports failure) |

### Custom Tools

| Tool | Used by | What it does |
|---|---|---|
| `kanban_create_task` | product-owner, project-manager, debugger | Create tracked tasks |
| `kanban_update_task` | leads, project-manager | Update status and notes |
| `kanban_get_task` | all agents | Read full task context + history |
| `kanban_list_tasks` | all agents | Board view with filters |
| `kanban_watch` | `/team:kanban watch` | Stall detection |
| `memory_search` | all agents | Semantic search over `.memory/` |
| `complexity_score` | code-reviewer, `/team:audit` | Cyclomatic complexity analysis |
| `debt_summary` | project-manager, sprint/standup | Prioritized debt backlog |
| `stack_detect` | architect, `/team:init` | Auto-detects project stack |

### File Structure

```
.kanban/
├── index.json          ← Task summary index
├── KAN-001.json        ← Full task data with history
├── trigger.log         ← Plugin activity log
└── triggers/
    └── processed/      ← Processed triggers (audit trail)
```

---

## Security

### permission.task — Delegation chain at API level

| Agent | Can invoke |
|---|---|
| `product-owner` | project-manager, architect, librarian |
| `project-manager` | backend-lead, frontend-lead, architect, librarian |
| `backend-lead` | senior-backend, junior-backend, code-reviewer, tester, security-auditor, performance-analyst, debugger, researcher, librarian |
| `frontend-lead` | senior-frontend, junior-frontend, code-reviewer, tester, security-auditor, **seo-auditor**, performance-analyst, debugger, researcher, librarian, designer |
| `senior/junior devs` | librarian only (or none for juniors) |
| `code-reviewer` | librarian |
| `seo-auditor` | none |
| `tester` | none |

### Bash permissions per tier

| Tier | Who | Rules |
|---|---|---|
| `lead` | backend-lead, frontend-lead | All allowed; `git push` requires approval |
| `senior` | senior devs, tester | All allowed; push/rebase/reset/rm-rf require approval; sudo denied |
| `junior` | junior devs | Only safe ops; push/rebase/reset/rm-rf denied |
| `readonly` | code-reviewer, debugger, **seo-auditor**, auditors, librarian | Read + webfetch allowed; push and sudo denied |

---

## GitHub Actions

| Workflow | Trigger | What happens |
|---|---|---|
| `opencode.yml` | `/oc` comment on issue/PR | OpenCode executes the request |
| `opencode-pr-review.yml` | PR opened/synchronized | Automatic code review |
| `opencode-security-audit.yml` | Every Monday 09:00 UTC | Full OWASP Top 10 scan |
| `opencode-issue-triage.yml` | New issue opened | Classifies and labels the issue |

**Setup:** Add `ANTHROPIC_API_KEY` to GitHub → Settings → Secrets → Actions.

---

## Team Memory

```
.memory/
├── index.md          ← master index
├── decisions/        ← architectural decisions and ADRs
├── features/         ← completed feature summaries
├── bugs/             ← root cause analyses and fixes
├── research/         ← technology research reports
└── debt/             ← technical debt backlog
```

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

The update script preserves your model assignments, `opencode.json` provider settings, `.kanban/` task data, and `project-stack` skill.

---

## Folder Structure

```
.opencode/
├── opencode.json
├── agents/                    ← 18 agent prompt files
├── commands/                  ← 22 command files
├── plugins/
│   └── kanban-trigger.ts
├── skills/
│   ├── test-driven-development/SKILL.md
│   ├── systematic-debugging/SKILL.md
│   ├── verification-before-completion/SKILL.md
│   ├── receiving-code-review/SKILL.md
│   ├── workflow/SKILL.md
│   ├── git-workflow/SKILL.md
│   ├── coding-standards/SKILL.md
│   └── project-stack-template/SKILL.md
└── tools/
    ├── _kanban-core.ts
    ├── kanban-create.ts
    ├── kanban-update.ts
    ├── kanban-get.ts
    ├── kanban-list.ts
    ├── kanban-watch.ts
    ├── memory-search.ts
    ├── complexity-score.ts
    ├── debt-summary.ts
    └── stack-detect.ts

kanban-board/                  ← Visual Kanban Board App
.kanban/                       ← Kanban board state (commit to git)
.memory/                       ← Team memory (commit to git)
examples/
└── laravel-octane-inertia/
    └── project-stack/SKILL.md
```

---

## Contributing

PRs welcome. If you've built a `project-stack` skill for a different stack (Next.js, NestJS, Django, Rails, Go, etc.), add it under `examples/` and open a PR.

When modifying agent prompts, keep these invariants:
- Delegation chain must remain strict — no step can be skipped
- `permission.task` must match prompt rules
- **Leads own the full delivery cycle** — reviewers, seo-auditor, and testers report to the lead, never to Kanban directly
- Developers always report back to their lead — never to Kanban or to the reviewer
- SEO audit runs in **parallel** with code review — never sequentially (no added latency)
- SEO audit only triggers for **Pages/ and Layouts/ changes** — not every frontend commit
- Review must run before QA
- Parallel execution: backend + frontend run in parallel, each team is sequential internally
