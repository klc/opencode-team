---
description: Small, focused change — a single file, function, config, or copy edit. Project-manager routes it to the right lead. Use for 1-file, zero-new-logic changes. For changes touching 2-3 files or correcting existing behavior, use /team:quick-fix instead.
agent: project-manager
subtask: true
---

Load the `project-stack` skill and `git-workflow` skill.

A small change has been requested:

"$ARGUMENTS"

## Your job

1. **Assess which domain this change belongs to:**
   - Backend only → call @backend-lead
   - Frontend only → call @frontend-lead
   - Both → split into backend and frontend subtasks, then call both leads in parallel

2. **Assess complexity:**
   - If it's truly small (single file, single responsibility, no architectural impact) → tell the lead it is suitable for a junior developer
   - If it touches business logic or has non-obvious side effects → tell the lead it should go to a senior developer

3. **No QA phase for trivial changes** (e.g. copy edits, config values, renaming). For anything that touches logic, tell the lead to invoke @tester after review.

4. **Commit format:**

   ```
   chore(<scope>): <what changed>
   ```

   or if it's a small logical change:

   ```
   fix(<scope>): <what changed>
   ```

5. **No branch needed** — commit directly to the current branch unless the user asks otherwise.

Do not invoke @product-owner. Project-manager routes only to leads; leads own developer delegation, review, and optional QA.
