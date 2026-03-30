---
description: Scan the current project and automatically generate the project-stack skill. Detects stack, structure, conventions, and constraints — then asks targeted questions for anything it can't determine from the files alone.
agent: architect
subtask: false
---

Load the coding-standards skill and git-workflow skill.

You are going to generate the `project-stack` skill for this project by scanning the codebase. This skill is what makes the entire agent team project-aware — without it, no agent knows how to test, build, commit, or structure code correctly.

## Phase 0 — Check for Existing Skill

Before scanning, check if a `project-stack` skill already exists:

```bash
test -f .opencode/skills/project-stack/SKILL.md && echo "exists" || echo "missing"
```

**If it exists**, ask the user:

```
A project-stack skill already exists. What would you like to do?

A) Update it — re-scan the project and overwrite with fresh content
B) Keep it — skip skill generation and go straight to AGENTS.md setup
C) Review it — show me the current skill content first
```

Wait for the user's response before continuing.
- If **A**: proceed with Phase 1 as normal, overwrite the existing file
- If **B**: skip to Phase 6 (AGENTS.md)
- If **C**: show the current file content, then ask A or B again

---

## Phase 1 — Automated Discovery

**First, use the `stack_detect` tool** for a fast structured scan:

```
stack_detect({ verbose: true })
```

This returns detected backend/frontend frameworks, databases, test commands, build commands, and runtime constraints in one call.

Then run these targeted bash commands for additional details the tool cannot detect:

```bash
# Folder structure — 3 levels deep
find . -type d \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/vendor/*' \
  -not -path '*/__pycache__/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  | sort | head -80

# Existing tests — understand what's already there
find . -type f -name '*.test.*' -o -name '*.spec.*' -o -name '*Test.php' -o -name 'test_*.py' \
  | grep -v node_modules | grep -v vendor | head -20

# Environment variables — names only, no values
cat .env.example 2>/dev/null || cat .env.sample 2>/dev/null || true

# CI/CD workflows
ls .github/workflows/ 2>/dev/null || true

# Git history
git log --oneline -10 2>/dev/null || true
```

## Phase 2 — Gap Analysis

Review the `stack_detect` output. The tool lists gaps it could not detect. Focus manual questions only on those gaps.

## Phase 3 — Ask the User

Ask only about things not covered by the tool. Maximum 5 questions. Format:

```
I've scanned the project using automated detection.
I need a few clarifications for the gaps it identified:

**Q1: [specific question]**
What was detected: [what the tool found]
What I need to know: [the gap]
```

## Phase 4 — Write the Skill

Create the file:

```
.opencode/skills/project-stack/SKILL.md
```

**CRITICAL: The file MUST start with YAML frontmatter.**

```markdown
---
name: project-stack
description: Project stack reference — framework, test commands, folder structure, runtime constraints, naming conventions. Load before writing any code.
---

# Project Stack — [Project Name]

## Stack Overview

**Backend:**
- Language & version: [detected]
- Framework: [detected + version]
- Runtime: [detected — note if long-lived process]
- API style: [detected]

**Frontend:**
- Language: [detected]
- Framework: [detected + version]
- Meta-framework: [detected or "none"]
- Styling: [detected]
- Build tool: [detected]
- SSR: [yes/no — constraints if yes]

**Databases:**
- Primary: [detected]
- Cache/Queue: [detected or "none"]
- ORM: [detected]

**Testing:**
- Backend: [detected framework + command]
- Frontend: [detected framework + command]

**Infrastructure:**
- [detected from docker-compose, Dockerfile, CI]

---

## Test Commands

[exact commands]

---

## Build & Dev Commands

[exact commands]

---

## Project Structure

[actual folder tree from the scan, annotated]

---

## Critical Runtime Constraints

[from stack_detect output + manual Q&A]

---

## Architecture Patterns

[inferred from actual code structure + confirmed in Q&A]

---

## Naming Conventions

[inferred from actual files]

---

## Environment Variables

[from .env.example — names only]

---

## External Services & Packages

[from dependency files + Q&A]
```

**Immediately after writing the skill file**, verify the frontmatter:

```bash
head -5 .opencode/skills/project-stack/SKILL.md
```

The output must start with `---`. If it does not, rewrite the file with the correct frontmatter.

Then check if Vibe Kanban MCP is configured:

```bash
grep -q "vibe_kanban" .opencode/opencode.json 2>/dev/null && echo "configured" || echo "not_configured"
```

**If configured**, ask the user for their Vibe Kanban project ID and append the Vibe Kanban section to the skill file (see original team:init for full Vibe Kanban section template).

---

## Phase 5 — opencode.json Check

```bash
grep -c "my-provider" .opencode/opencode.json 2>/dev/null || echo "0"
```

If the result is greater than 0, warn the user that placeholder values still exist.

---

## Phase 5c — Initialize Memory

```bash
mkdir -p .memory/decisions .memory/features .memory/bugs .memory/research .memory/debt
```

Check if `index.md` exists:

```bash
test -f .memory/index.md && echo "exists" || echo "missing"
```

If missing, create `.memory/index.md`:

```markdown
# Memory Index

_Last updated: [today's date]_

## decisions
_No records yet._

## features
_No records yet._

## bugs
_No records yet._

## research
_No records yet._

## debt
_No records yet._
```

Check `.gitignore` — `.memory/` should NOT be ignored:

```bash
grep -q "\.memory" .gitignore 2>/dev/null && echo "ignored" || echo "ok"
```

---

## Phase 6 — Create AGENTS.md

```bash
test -f AGENTS.md && echo "exists" || echo "missing"
```

If missing, create `AGENTS.md` with the standard template. If it already exists, leave it untouched.

Check if `opencode.json` already has an `instructions` field. If not, add `"instructions": ["AGENTS.md"]`.

---

## Phase 7 — Confirm

```
✅ Initialization complete

Created:
  .opencode/skills/project-stack/SKILL.md
  AGENTS.md (open this file and add your project rules)

Stack detection:
  Backend:  [summary from stack_detect]
  Frontend: [summary]
  Database: [summary]
  Test:     [command]
  Build:    [command]

Vibe Kanban: [configured | not configured]

Assumed (please verify):
  - [anything inferred but not confirmed]

Next:
  1. Open AGENTS.md and fill in your project rules
  2. Start with /team:new-feature or /team:task
```
