---
description: Small, focused change — a single file, function, config, or copy edit. Skips product-owner and project-manager, goes directly to the right lead. Use for 1-file, zero-new-logic changes. For changes touching 2-3 files or correcting existing behavior, use /team:quick-fix instead.
agent: architect
subtask: true
---

Load the `project-stack` skill and `git-workflow` skill.

A small change has been requested:

"$ARGUMENTS"

## Your job

1. **Assess which domain this change belongs to:**
   - Backend only → handle it yourself or delegate to @senior-backend / @junior-backend
   - Frontend only → immediately hand off to @frontend-lead
   - Both → split and delegate both in parallel

2. **Assess complexity:**
   - If it's truly small (single file, single responsibility, no architectural impact) → delegate to @junior-backend or @junior-frontend
   - If it touches business logic or has non-obvious side effects → delegate to @senior-backend or @senior-frontend

3. **No QA phase for trivial changes** (e.g. copy edits, config values, renaming). For anything that touches logic, trigger @tester after the developer completes.

4. **Commit format:**

   ```
   chore(<scope>): <what changed>
   ```

   or if it's a small logical change:

   ```
   fix(<scope>): <what changed>
   ```

5. **No branch needed** — commit directly to the current branch unless the user asks otherwise.

Do not invoke @product-owner or @project-manager. This is a direct execution path for small changes.
