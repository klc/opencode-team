---
description: Start a new feature end-to-end. Triggers product-owner to clarify scope, architect for critical technical decisions, then flows through the full team chain.
agent: product-owner
subtask: true
---

Load the workflow skill and project-stack skill.

A new feature has been requested:

"$ARGUMENTS"

Execute the full pipeline in sequence. Do not stop between steps unless user input is required.

**Step 1 — Scope clarification**
If the request is ambiguous, ask the user using the Critical Decision Protocol format (max 2–3 questions with your own assumptions). If clear, skip to Step 2.

**Step 2 — Architecture decisions**
Invoke @architect with the feature description and any confirmed scope decisions.
Wait for architect to return before continuing.

**Step 3 — Write user story**
Write a complete user story with acceptance criteria reflecting all confirmed decisions.

**Step 4 — Hand off to project-manager**
Invoke @project-manager with the user story and wait for it to complete.
project-manager will: create branch → break tasks → invoke leads → wait for leads → leads wait for developers → developers wait for testers → testers wait for reviewers.

When project-manager returns, report the completed feature to the user.
