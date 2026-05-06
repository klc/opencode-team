---
description: Evaluate a technology choice or architectural decision. Architect may invoke researcher, then writes or summarizes the decision.
agent: architect
subtask: true
---

Load the `project-stack` skill before starting.

A technology decision needs to be evaluated:

"$ARGUMENTS"

Your job:

1. If the decision requires external technology comparison, invoke @researcher first with the options and project constraints
2. Evaluate each option against the constraints and runtime characteristics defined in the project-stack skill
3. Produce a comparison report with a clear recommendation
4. If this is a durable architecture decision, write or update an ADR and invoke @librarian to record the decision

Do not implement anything. This command is for evaluation and decision capture only.
