---
description: Investigate and fix a bug — debugger finds root cause, lead coordinates fix, tester verifies
agent: debugger
subtask: false
---

A bug has been reported:

"$ARGUMENTS"

**Step 0 — Memory check**
Before investigating, use the `memory_search` tool:

```
memory_search({ query: "[extract component name or symptom keywords from the bug description]" })
```

If a similar bug was fixed before, pass that record to the debugger — the root cause may be the same or related.

Follow this process:

1. Load the `project-stack` skill to understand the stack and runtime constraints
2. Investigate the root cause — read logs, trace the code path, check for runtime-specific issues (e.g. long-lived process state, SSR mismatches). Use any prior bug records from Step 0 as additional leads.
3. Produce a debug report with root cause and fix recommendation
4. Call @backend-lead or @frontend-lead (whichever is appropriate) with your findings via Task tool
5. The lead will delegate the fix to the right developer
6. After the fix, the lead will trigger @tester for regression tests
7. Then @code-reviewer before merge

Do not stop after the debug report — call the appropriate lead.
