---
description: Start a new feature end-to-end. Triggers product-owner to clarify scope, architect for critical technical decisions, then flows through the full team chain.
agent: product-owner
subtask: true
---

Load the workflow skill, then load the project-stack skill.

A new feature has been requested:

"$ARGUMENTS"

Follow these steps in order:

**Step 1 — Scope clarification (your job)**
If the request is ambiguous in ways that would significantly change the user story, ask the user 2–3 targeted questions using the Critical Decision Protocol format. Come with your own assumptions so they can just say "proceed" if you're right.

If the request is clear enough, skip directly to Step 2.

**Step 2 — Architecture check**
Before writing the user story, invoke @architect with:
- The feature description
- Any scope decisions already confirmed
- The instruction: "Identify any critical technical decisions this feature requires and ask the user before we proceed."

Wait for @architect to complete its decision round with the user before continuing.

**Step 3 — User story**
Once scope and architecture are clear, write a complete user story with acceptance criteria that reflects the confirmed decisions.

**Step 4 — Hand off**
Immediately invoke @project-manager with the completed story.
