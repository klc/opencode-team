---
description: Scan the current project and automatically generate the project-stack skill. Detects stack, structure, conventions, and constraints — then asks targeted questions for anything it can't determine from the files alone.
agent: architect
subtask: false
---

Load the coding-standards skill and git-workflow skill.

You are going to generate the `project-stack` skill for this project by scanning the codebase. This skill is what makes the entire agent team project-aware — without it, no agent knows how to test, build, commit, or structure code correctly.

## Phase 1 — Automated Discovery

Run these commands to gather raw data. Do not skip any — even empty results are useful.

```bash
# Project root overview
ls -la

# Dependency files — detect language, framework, packages
cat package.json 2>/dev/null || true
cat composer.json 2>/dev/null || true
cat pyproject.toml 2>/dev/null || true
cat Gemfile 2>/dev/null || true
cat go.mod 2>/dev/null || true
cat Cargo.toml 2>/dev/null || true
cat pom.xml 2>/dev/null || true

# Lock files — get exact versions
cat package-lock.json 2>/dev/null | head -30 || true
cat yarn.lock 2>/dev/null | head -10 || true
cat composer.lock 2>/dev/null | head -30 || true

# Config files — detect build tools, test runners, linters
ls *.config.* *.json *.yaml *.yml *.toml 2>/dev/null || true
cat vite.config.* 2>/dev/null || true
cat webpack.config.* 2>/dev/null || true
cat jest.config.* 2>/dev/null || true
cat vitest.config.* 2>/dev/null || true
cat phpunit.xml 2>/dev/null || true
cat pytest.ini 2>/dev/null || true
cat .eslintrc* 2>/dev/null || true
cat tsconfig.json 2>/dev/null || true

# Docker / infra
cat docker-compose.yml 2>/dev/null || true
cat docker-compose.yaml 2>/dev/null || true
cat Dockerfile 2>/dev/null || true

# CI/CD
ls .github/workflows/ 2>/dev/null || true
cat .github/workflows/*.yml 2>/dev/null | head -60 || true
ls .gitlab-ci.yml 2>/dev/null || true

# Environment variables — names only, no values
cat .env.example 2>/dev/null || cat .env.sample 2>/dev/null || true

# Folder structure — 3 levels deep, exclude noise
find . -type d \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/vendor/*' \
  -not -path '*/__pycache__/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/.next/*' \
  -not -path '*/coverage/*' \
  | sort | head -80

# Existing tests — understand what's already there
find . -type f -name '*.test.*' -o -name '*.spec.*' -o -name '*Test.php' -o -name 'test_*.py' \
  | grep -v node_modules | grep -v vendor | head -20

# Scripts defined in package.json
cat package.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); [print(k,':',v) for k,v in d.get('scripts',{}).items()]" 2>/dev/null || true

# Git history — understand the project's pace and contributors
git log --oneline -10 2>/dev/null || true
git branch -a 2>/dev/null | head -10 || true
```

## Phase 2 — Gap Analysis

After reviewing the scan results, identify what you could NOT determine automatically. Common gaps:

- **Runtime constraints** — e.g. is this a long-lived process (Octane, Node cluster)? Are workers shared?
- **Architecture pattern** — which layer handles business logic? Actions, Services, Use Cases, or fat controllers?
- **External services** — payment providers, email, storage, push notifications
- **SSR** — is it enabled? Which pages? Any known SSR-unsafe patterns already discovered?
- **Database relationships** — multi-tenant? soft deletes? UUID vs integer PKs?
- **Deployment target** — serverless, containers, bare metal — affects what "production build" means

## Phase 3 — Ask the User

Ask only about things you genuinely could not determine from the files. Be specific. Maximum 5 questions. Format:

```
I've scanned the project and can detect most of the stack automatically.
I need a few clarifications before I can write the skill accurately.

**Q1: [specific question]**
What I found: [what the scan showed]
What I need to know: [the gap]

**Q2: [specific question]**
...

If any of these don't apply to your project, just say "skip" for that one.
```

Do not ask about things the scan already answered clearly.

## Phase 4 — Write the Skill

Once you have all the information, create the file:

```
.agents/skills/project-stack/SKILL.md
```

Use this structure — fill every section with real values, no placeholders:

```markdown
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
- Analytics: [detected or "none"]
- ORM: [detected]

**Testing:**
- Backend: [detected framework + command]
- Frontend: [detected framework + command]

**Infrastructure:**
- [detected from docker-compose, Dockerfile, CI]

---

## Test Commands

[exact commands from scripts or config files]

---

## Build & Dev Commands

[exact commands from scripts]

---

## Project Structure

[actual folder tree from the scan, annotated]

---

## Critical Runtime Constraints

[only real constraints — leave blank if none apply]

---

## Architecture Patterns

[inferred from actual code structure + confirmed in Q&A]

---

## Naming Conventions

[inferred from actual files — check 5+ real examples before writing a rule]

---

## Environment Variables

[from .env.example — names only]

---

## External Services & Packages

[from dependency files + Q&A]
```

## Phase 5 — opencode.json Check

Before writing the skill, check if `opencode.json` has been configured:

```bash
grep -c "my-provider" .opencode/opencode.json 2>/dev/null || echo "0"
```

If the result is greater than 0, the file still has placeholder values. Warn the user:

```
⚠️  opencode.json still contains placeholder values ("my-provider", "my-strong-model").
The team won't work until you replace these with your actual provider and model names.

Edit .opencode/opencode.json and:
  1. Replace "my-provider" with your provider's key (e.g. "openai", "anthropic")
  2. Replace "my-strong-model" with a capable model (used by leads, architect, senior devs)
  3. Replace "my-fast-model" with a faster/cheaper model (used by juniors, reviewer, tester)
  4. Set the correct API endpoint and env var name under "provider"

See: https://opencode.ai/docs/providers
```

Then continue writing the project-stack skill regardless — the warning is informational only.

---

## Phase 6 — Create AGENTS.md

Check if an `AGENTS.md` already exists in the project root:

```bash
test -f AGENTS.md && echo "exists" || echo "missing"
```

**If it does not exist**, create it:

```bash
cat > AGENTS.md << 'EOF'
# Project Rules

## Language
<!-- Set your preferred language for agent responses here -->
<!-- Example: Always respond to me in Turkish. Keep code, comments, and docs in English. -->

## Commands
<!-- Specify how to run commands in this project -->
<!-- Example: Always run php and npm commands inside Docker:
  - php → docker compose exec app php ...
  - npm → docker compose exec node npm ... -->

## Code Style
<!-- Any project-specific code style rules beyond what's in the stack skill -->

## Workflow
<!-- Any custom workflow preferences -->
<!-- Example: Always ask before creating new database migrations -->

## Other Rules
<!-- Add any other project-specific rules here -->
EOF
```

**If it already exists**, leave it untouched.

Then check if `opencode.json` already has an `instructions` field. If it does not, add it:

```bash
grep -q '"instructions"' .opencode/opencode.json && echo "exists" || echo "missing"
```

If missing, use the edit tool to add `"instructions": ["AGENTS.md"]` to `.opencode/opencode.json` — place it after the `"$schema"` line.

---

## Phase 7 — Confirm

After all files are written, output a summary:

```
✅ Initialization complete

Created:
  .agents/skills/project-stack/SKILL.md
  AGENTS.md (open this file and add your project rules)

Updated:
  .opencode/opencode.json → added "instructions": ["AGENTS.md"]

Detected stack:
  Backend:  [summary]
  Frontend: [summary]
  Database: [summary]
  Test:     [command]
  Build:    [command]

Assumed (please verify):
  - [anything inferred but not confirmed]

Skipped (could not determine):
  - [anything left blank and why]

⚠️  [only if opencode.json still has placeholder values]
opencode.json still has placeholder provider values — edit it before running the team.

Next:
  1. Open AGENTS.md and fill in your project rules (language, docker commands, etc.)
  2. Start with /team:new-feature or /team:task
```
