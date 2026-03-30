---
name: git-workflow
description: Conventional commit format, branch strategy, and commit checklist. Load this before committing or creating branches.
---

# Git Workflow Skill

## Commit Convention

This project uses Conventional Commits. Every task completion and every fix requires a commit.

### Format

```
<type>(<scope>): <description> [<task-id>]

[optional body]
```

**Types:**
- `feat` — new feature or functionality
- `fix` — bug fix, including QA-returned fixes
- `refactor` — code change with no behavior change
- `test` — adding or updating tests
- `chore` — build, config, dependency changes
- `docs` — documentation only

**Scope:** area of the codebase (e.g. `auth`, `chat`, `payments`, `dashboard`)

**Task ID:** always append the todo task ID in brackets, e.g. `[T03]`

### Examples

```
feat(auth): add JWT refresh token endpoint [T01]
fix(chat): prevent duplicate message delivery on reconnect [T02]
test(auth): add unit tests for token refresh logic [T04]
```

### Breaking Changes

If your change breaks backwards compatibility:
- Add `!` after the commit type: `feat(api)!: rename user endpoint`
- Add a `BREAKING CHANGE:` footer:

```
feat(api)!: rename /users to /accounts [T05]

BREAKING CHANGE: The /users endpoint has been renamed to /accounts.
Update all API clients to use the new path.
Migration: search-replace /api/users → /api/accounts
```

Report the breaking change explicitly to your lead in the completion report.

---

## When to Commit

### After completing a task (developer)

Stage only the files you created or modified for this task:

```bash
git add <specific files>
git commit -m "feat(<scope>): <what you built> [<task-id>]"
```

Never use `git add .` — stage only task-relevant files.

### After fixing a QA failure

```bash
git add <fixed files>
git commit -m "fix(<scope>): <what you fixed> [<task-id>]"
```

---

## Commit Checklist (run before every commit)

```bash
# 1. Run the project's test command for affected areas
#    (see project-stack skill for the exact command)

# 2. Verify staged files look correct
git diff --staged --name-only

# 3. Commit
git commit -m "<type>(<scope>): <description> [<task-id>]"
```

---

## Branch Strategy

- **project-manager** creates the feature branch when a story starts:
  ```bash
  git checkout -b feature/<story-slug>
  ```
- All developers commit to this branch — no sub-branches
- Do not push unless the user explicitly asks
- Do not squash or amend commits — preserve full history

---

## What NOT to Do

- Do not commit dependency lock files changes unless you explicitly added/removed a package
- Do not commit generated or compiled output (`dist/`, `vendor/`, `node_modules/`, `build/`)
- Do not commit `.env` or any file containing secrets
- Do not commit if tests are failing
- Do not commit unrelated files alongside a task
