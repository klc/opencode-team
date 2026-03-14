---
description: Generate a daily standup report. Shows what was completed, what is in progress, what is blocked, and what is planned next.
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
3. Produce the standup report in this format:

```
## Standup — [today's date]

### ✅ Done (last 24h)
- [task ID + title] — [brief description of what was completed]

### ⟳ In Progress
- [task ID + title] — [current status, who is working on it]

### 🚫 Blocked
- [task ID + title] — [what is blocking it and what needs to happen to unblock]

### 📋 Up Next
- [task ID + title] — [what starts next based on current priorities]

### ⚠️ Risks
- [any risks that have emerged or changed since last standup]
```

If the todo list is empty or no git commits exist yet, report that no work has been tracked yet and suggest starting with `/new-feature` or `/task`.

Keep the report concise — one line per item unless a blocker needs explanation.
