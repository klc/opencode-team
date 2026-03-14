---
description: Plan a sprint — take a list of user stories and produce a full sprint plan with task breakdown assigned to leads
agent: project-manager
subtask: false
---

Plan a sprint for the following user stories or requirements:

"$ARGUMENTS"

Steps:
1. Break each story into concrete backend and frontend tasks
2. Estimate story points for each task
3. Produce a sprint plan table (ID, title, lead, points, dependencies)
4. Call @backend-lead with all backend tasks via Task tool
5. Call @frontend-lead with all frontend tasks via Task tool
6. Include @tester in the plan for QA capacity
7. Flag risks and dependencies

Load `project-stack` skill for technology context.
Do not stop after producing the plan — call the leads.
