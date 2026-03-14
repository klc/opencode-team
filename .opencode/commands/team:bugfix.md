---
description: Investigate and fix a bug — debugger finds root cause, lead coordinates fix, tester verifies
agent: debugger
subtask: false
---

A bug has been reported:

"$ARGUMENTS"

Follow this process:
1. Investigate the root cause — read logs, trace the code path, check Octane state leaks if backend
2. Produce a debug report with root cause and fix recommendation
3. Call @backend-lead or @frontend-lead (whichever is appropriate) with your findings via Task tool
4. The lead will delegate the fix to the right developer
5. After the fix, call @tester to run regression tests
6. Call @code-reviewer before merge

Load the `octane-patterns` skill if the bug might be Swoole/Octane-related.
Do not stop after the debug report — call the appropriate lead.
