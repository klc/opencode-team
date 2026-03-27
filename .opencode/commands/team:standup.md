---
description: Generate a daily standup report. Shows what was completed, what is in progress, what is blocked, what is planned next, and open technical debt.
agent: project-manager
subtask: false
---

Load the workflow skill.

Generate a standup report for the current state of the project.

## Execution

1. Call `todoread` to get the current state of the todo list

2. Check git log for commits since yesterday:
   ```bash
   git log --oneline --since="24 hours ago"
   ```

3. Invoke @librarian to surface high-priority open debt:
   ```
   ACTION: recall
   QUERY: open debt
   ```
   Include only **high priority** items with status `open` or `in-progress` in the standup report.

4. Produce the standup report:

```
## Standup — [today's date]

### ✅ Done (last 24h)
- [task ID + title] — [brief description of what was completed]

### ⟳ In Progress
- [task ID + title] — [current status]

### 🚫 Blocked
- [task ID + title] — [what is blocking it and what needs to happen to unblock]

### 📋 Up Next
- [task ID + title] — [what starts next based on current priorities]

### 🔴 Open High-Priority Debt
- [debt title] | owner: @[lead] | effort: [S/M/L]
  Risk: [one sentence from the debt record]
- [or "None" if no high-priority open debt]

### ⚠️ Risks
- [any risks that have emerged or changed]
```

If the todo list is empty or no git commits exist yet, report that no work has been tracked yet and suggest starting with `/team:new-feature` or `/team:task`.

Keep the report concise — one line per item unless a blocker or debt item needs explanation.
