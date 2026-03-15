---
description: Define or update the project's visual design system. Creates a project-design skill that all frontend developers load before writing UI code.
agent: designer
subtask: true
---

Load the project-stack skill first to understand the frontend framework and styling system.

Design brief:

"$ARGUMENTS"

Your job:

1. If any external design skills are mentioned in the brief (e.g. `ui-ux-pro-max`, `mobile-design`), load them via the skill tool before starting
2. Scan the existing codebase for established patterns — look for config files, theme files, existing components
3. Define the full design system based on the brief
4. Write it to `.opencode/skills/project-design/SKILL.md`
5. Report the key design decisions to the user

The output must be concrete enough that any frontend developer can implement a new component without asking design questions.

If no design brief is provided, ask the user:
- What is the product's personality? (minimal, bold, playful, professional, etc.)
- Who are the users? (developers, consumers, enterprise, etc.)
- Any references or inspirations?
- Light mode only, dark mode only, or both?

Then proceed without waiting for further input — make bold decisions based on the answers.
