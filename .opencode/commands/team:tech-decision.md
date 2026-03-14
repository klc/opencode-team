---
description: Evaluate a technology choice or architectural decision. Pass the question or options to compare.
agent: researcher
subtask: true
---

Load the project-stack skill before starting.

A technology decision needs to be evaluated:

"$ARGUMENTS"

Context: This project runs Laravel 12 + Octane/Swoole on the backend and Vue 3 + Inertia SSR on the frontend. Any new package or pattern must be compatible with Octane's persistent process model (no static state, coroutine-safe).

Your job:
1. Research the options thoroughly
2. Evaluate each against the Octane/Swoole compatibility requirement specifically
3. Produce a comparison report with a clear recommendation
4. Invoke @architect with your findings — they will write the ADR and communicate the decision to the team

Do not implement anything. Research and hand off to @architect.
