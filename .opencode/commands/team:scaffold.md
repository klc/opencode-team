---
description: Scaffold a new project from scratch. Gathers project goals and tech stack, optionally asks @architect for stack recommendations, then either runs the installation automatically or prepares a step-by-step Markdown guide.
agent: architect
subtask: false
---

Load the `workflow` skill.

A new project needs to be scaffolded.

"$ARGUMENTS"

---

## Phase 1 — Project Information

Ask the user the following questions in a single message — not one by one:

```
To get started, I need a few details:

1. **What are you building?**
   (A short description — e.g. "e-commerce site", "SaaS dashboard", "REST API service")

2. **Do you have a tech stack in mind?**
   - Yes → which technologies?
   - No → would you like a recommendation?

3. **What should the project folder be named?**
   (Type "." to use the current folder)
```

Wait for the user's response before continuing.

---

## Phase 2 — Tech Stack

### If the user already knows their stack:

Note the stack and proceed to **Phase 3**.

### If the user wants a recommendation:

Invoke @architect:

```
@architect

The user wants to build a new project and is asking for a tech stack recommendation.

Project description: "[user's description]"

Please:
1. Suggest 2-3 stack alternatives suited to the project goals
2. Briefly outline the strengths and trade-offs of each
3. State your own recommendation clearly and explain why

Do not scaffold or write any code — research and recommend only.
```

Present @architect's response to the user and ask for confirmation:

```
@architect suggested the following options:

[architect's suggestions]

Which stack would you like to go with?
Or let me know if you have something different in mind.
```

Wait for the user's confirmation, then proceed to **Phase 3**.

---

## Phase 3 — Installation Preference

Once the stack is confirmed, ask the user:

```
Stack confirmed: [selected technologies]

How would you like to proceed with the installation?

**A) Automatic installation** — I'll run the commands on your behalf
   (Requires an internet connection and the necessary tools to be installed)

**B) Installation guide** — I'll prepare a step-by-step Markdown guide
   that you can follow at your own pace
```

Wait for the user's response.

---

## Phase 4A — Automatic Installation

If the user chose **A**:

### 4A.1 — Pre-flight check

Verify that the required tools are installed:

```bash
# Run checks appropriate for the selected stack, for example:
php --version 2>/dev/null || echo "PHP not found"
composer --version 2>/dev/null || echo "Composer not found"
node --version 2>/dev/null || echo "Node not found"
npm --version 2>/dev/null || echo "npm not found"
docker --version 2>/dev/null || echo "Docker not found"
```

If anything is missing, inform the user and explain how to install it. Do not proceed until all prerequisites are met.

### 4A.2 — Run the installation

Execute the installation commands for the selected stack in order. Briefly explain what each step does before running it.

Example for Laravel + Sail + Octane (Swoole) + Inertia + Vue + TypeScript + Tailwind:

```bash
# 1. Create Laravel project
composer create-project laravel/laravel [project-name]
cd [project-name]

# 2. Install Sail
composer require laravel/sail --dev
php artisan sail:install

# 3. Install Octane with Swoole
composer require laravel/octane
php artisan octane:install --server=swoole

# 4. Install Inertia + Vue
composer require inertiajs/inertia-laravel
npm install @inertiajs/vue3 vue @vitejs/plugin-vue

# 5. Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 6. Install TypeScript
npm install -D typescript vue-tsc @types/node

# 7. Install all dependencies
npm install
```

If an error occurs, stop immediately, show the user the error output, and ask how to proceed.

### 4A.3 — Post-installation

Once installation completes successfully, proceed to **Phase 5**.

---

## Phase 4B — Installation Guide

If the user chose **B**:

Prepare a comprehensive Markdown guide for the selected stack and save it as `SETUP.md`:

```markdown
# [Project Name] — Setup Guide

## Prerequisites

[Required tools and minimum versions for the selected stack]

## Step 1 — [First step title]

\`\`\`bash
[commands]
\`\`\`

> **Note:** [Any important detail to watch out for]

## Step 2 — ...

[Same format for each step]

## Running the Project

[Commands to start the development environment]

## Troubleshooting

[Common errors and how to resolve them]
```

After saving the guide, tell the user:

```
SETUP.md is ready. Follow the steps at your own pace.

Once the installation is complete, run /team:init in this folder —
it will automatically generate the project-stack skill and set up
the rest of the team configuration.
```

**The scaffold task is complete at this point.** Do not proceed to Phase 5.

---

## Phase 5 — Project Configuration (Automatic Installation Only)

After a successful automatic installation:

### 5.1 — Generate the project-stack skill

Run the `stack_detect` tool:

```
stack_detect({ verbose: true })
```

Then read the installed files and write `.opencode/skills/project-stack/SKILL.md`.

**CRITICAL: The file MUST start with valid YAML frontmatter.**

```markdown
---
name: project-stack
description: Project stack reference — framework, test commands, folder structure, runtime constraints, naming conventions. Load before writing any code.
---

# Project Stack — [Project Name]

[Fill in based on stack_detect output and actual installed files]
```

### 5.2 — Set up base files

```bash
# AGENTS.md
cat > AGENTS.md << 'EOF'
# Project Rules

## Language
<!-- Set your preferred language for agent responses here -->

## Commands
<!-- Specify how to run commands in this project -->

## Code Style
<!-- Any project-specific code style rules -->

## Workflow
<!-- Any custom workflow preferences -->

## Other Rules
<!-- Add any other project-specific rules here -->
EOF

# Kanban directory
mkdir -p .kanban/triggers/processed

# Memory directories
mkdir -p .memory/decisions .memory/features .memory/bugs .memory/research .memory/debt

# Memory index
TODAY=$(date +%Y-%m-%d)
cat > .memory/index.md << EOF
# Memory Index

_Last updated: ${TODAY}_

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
EOF
```

### 5.3 — Check .gitignore

```bash
cat .gitignore 2>/dev/null || echo "not found"
```

If `.kanban` or `.memory` appears in `.gitignore`, warn the user — these directories should be tracked in git so the team's task history and memory are preserved across sessions.

### 5.4 — Verify memory structure

```bash
# Confirm all directories were created
ls -la .memory/
ls -la .kanban/
cat .memory/index.md
```

If any directory is missing, recreate it before continuing.

### 5.5 — Initial git commit (optional)

Ask the user:

```
Installation complete. Would you like me to create the initial git commit?
(chore: initial project scaffold)
```

If confirmed:

```bash
git init
git add .
git commit -m "chore: initial project scaffold"
```

---

## Completion Report

```
✅ Project scaffold complete!

Project: [project name]
Stack:   [technologies]

Files created:
  ✓ .opencode/skills/project-stack/SKILL.md
  ✓ AGENTS.md
  ✓ .kanban/
  ✓ .memory/
    ├── index.md
    ├── decisions/
    ├── features/
    ├── bugs/
    ├── research/
    └── debt/

Next steps:
  1. Edit AGENTS.md — add your project-specific rules
  2. Run /team:new-feature to start your first feature
```
