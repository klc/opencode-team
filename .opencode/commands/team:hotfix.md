---
description: Urgent production fix. Project-manager creates a hotfix branch and routes the incident to the appropriate lead for triage, fix, review, and verification.
agent: project-manager
subtask: true
---

Load the project-stack skill and git-workflow skill.

A production hotfix is required:

"$ARGUMENTS"

**Step 0 — Memory check**
Use the `memory_search` tool immediately — do not skip even in urgent situations:

```
memory_search({ query: "[extract component or symptom keywords]" })
```

A prior bug record may point directly to the root cause and save significant time.

1. Create hotfix branch: `git checkout -b hotfix/<short-description>`
2. Create a Kanban bug task with the correct scope:
   - backend incident → `scope: "backend"`, then call @backend-lead
   - frontend incident → `scope: "frontend"`, then call @frontend-lead
   - full-stack incident → create backend and frontend subtasks, then call both leads in parallel
3. Pass symptoms, production impact, reproduction evidence, and memory records to the lead(s)
4. The lead may invoke @debugger if root cause is unclear
5. The lead owns the fast-track cycle: fix delegation → code review/security checks as needed → verification
6. When the lead reports approved and verified, report to the user and wait for explicit merge/deploy confirmation

Do not merge or deploy without explicit user confirmation.
