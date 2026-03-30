---
description: Search team memory for relevant records. Pass a topic, question, or keyword. For debt queries use "open debt", "high priority debt", or "debt [area]".
agent: librarian
subtask: true
---

Retrieve relevant memory records for:

"$ARGUMENTS"

First use the `memory_search` tool to find relevant records:
```
memory_search({ query: "[the arguments]", limit: 10 })
```

If the query is about technical debt, also use the `debt_summary` tool:
```
debt_summary({ status: "all" })
```

Return all relevant records with their full content.

If the query is about technical debt (e.g. "open debt", "debt backlog", "high priority debt", "debt [area]"), return the formatted debt backlog report grouped by priority and status — include priority, owner, effort, and risk for each item.

If nothing is found, say so clearly.
