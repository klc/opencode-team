---
name: graphify
description: Knowledge graph protocol. Use graphify CLI commands to understand codebase structure before reading raw files. Reduces token cost by 60-70% per task.
---

# Graphify — Knowledge Graph Protocol

## When to Use

**Before any implementation task**, check the knowledge graph instead of reading raw files:

1. **Understand architecture** → `graphify query "how is authentication structured?"`
2. **Find module relationships** → `graphify path "UserStore" "AuthController"`
3. **Understand a concept** → `graphify explain "CanvasGraph"`
4. **Read the overview** → `cat graphify-out/GRAPH_REPORT.md`

## Decision Rule

```
Need to understand code structure?
  → FIRST: graphify query / explain / path     (cheap, ~100 tokens)
  → THEN:  read only the specific file(s) it points to (targeted)
  → NEVER: read all files in a directory upfront
```

## Available Commands

### Query — answer a natural-language question
```bash
graphify query "how does the kanban task lifecycle work?" --budget 1500
graphify query "which components use the design system tokens?"
graphify query "what are the entry points for the plugin system?"
```

### Path — shortest dependency path between two nodes
```bash
graphify path "KanbanTask" "resolveAgent"
graphify path "frontend-lead" "kanban-update"
```

### Explain — plain-language description of a node and its neighbors
```bash
graphify explain "KanbanIndex"
graphify explain "workflow"
```

### Update — refresh graph after code changes (no API cost)
```bash
graphify update .
```

## Reading the Graph Report

`graphify-out/GRAPH_REPORT.md` contains:
- **God nodes** — the most connected concepts (highest leverage to read first)
- **Community structure** — which modules cluster together
- **Surprising connections** — non-obvious cross-module dependencies
- **Suggested questions** — ready-to-run query templates

Always read this file first if it exists. It costs ~150 tokens and replaces reading dozens of source files.

## What Graphify Does NOT Cover

Graphify only knows about **code and documentation structure**. It does NOT know about:

- Task assignments, statuses, deadlines → use `kanban_get_task()` / `kanban_list_tasks()`
- Past decisions, bug fixes, feature history → use `memory_search()`
- Project configuration (models, agent permissions) → use `project-stack` skill

## After You Modify Code

After committing or saving changes, keep the graph current:

```bash
graphify update .
```

This is AST-only — no API cost, runs in seconds.

## Graph Not Yet Built?

If `graphify-out/graph.json` does not exist yet, type `/graphify` in the chat to trigger the full graph build. The first build requires LLM API calls and takes a few minutes. Subsequent `graphify update .` runs are instant.
