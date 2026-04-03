// .opencode/tools/_kanban-core.ts
// Shared helpers for all kanban tools.
// This file is NOT a tool itself — it exports utility functions only.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "fs";
import { join } from "path";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type TaskStatus =
  | "backlog"
  | "planning"
  | "in-progress"
  | "review"
  | "testing"
  | "done"
  | "reopened";

export type TaskType = "feature" | "bug" | "task" | "debt";
export type TeamScope = "backend" | "frontend" | "both" | "none";

export interface KanbanTask {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  status: TaskStatus;
  scope: TeamScope;
  assignedTo: string;
  parentId?: string;
  childIds?: string[];
  storyContext?: string;
  acceptanceCriteria?: string[];
  reviewNotes?: string;
  testNotes?: string;
  reopenReason?: string;
  reopenCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  history: TaskHistoryEntry[];
}

export interface TaskHistoryEntry {
  timestamp: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  agent: string;
  note?: string;
}

export interface KanbanIndex {
  lastId: number;                          // kept for backward compatibility
  prefixCounters: Record<string, number>;  // { FTR: 3, BUG: 1, TSK: 0, DBT: 0 }
  childCounters: Record<string, number>;   // { "FTR-001": 2 } — tracks subtask count per parent
  tasks: Record<string, TaskSummary>;
  updatedAt: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  assignedTo: string;
  scope: TeamScope;
  type: TaskType;
  parentId?: string;
}

// ─────────────────────────────────────────────────────────────
// File helpers
// ─────────────────────────────────────────────────────────────

export function getKanbanDir(worktree: string): string {
  return join(worktree, ".kanban");
}

export function ensureKanbanDir(worktree: string): string {
  const dir = getKanbanDir(worktree);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function getIndexPath(worktree: string): string {
  return join(getKanbanDir(worktree), "index.json");
}

export function getTaskPath(worktree: string, id: string): string {
  return join(getKanbanDir(worktree), `${id}.json`);
}

export function loadIndex(worktree: string): KanbanIndex {
  const path = getIndexPath(worktree);
  const empty: KanbanIndex = {
    lastId: 0,
    prefixCounters: {},
    childCounters: {},
    tasks: {},
    updatedAt: new Date().toISOString(),
  };
  if (!existsSync(path)) return empty;
  try {
    const data = JSON.parse(readFileSync(path, "utf8")) as KanbanIndex;
    // Backward compat: older indexes may not have these fields
    if (!data.prefixCounters) data.prefixCounters = {};
    if (!data.childCounters) data.childCounters = {};
    return data;
  } catch {
    return empty;
  }
}

export function saveIndex(worktree: string, index: KanbanIndex): void {
  index.updatedAt = new Date().toISOString();
  writeFileSync(getIndexPath(worktree), JSON.stringify(index, null, 2));
}

export function loadTask(worktree: string, id: string): KanbanTask | null {
  const path = getTaskPath(worktree, id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function saveTask(worktree: string, task: KanbanTask): void {
  task.updatedAt = new Date().toISOString();
  writeFileSync(getTaskPath(worktree, task.id), JSON.stringify(task, null, 2));
}

export function updateIndex(worktree: string, task: KanbanTask): void {
  const index = loadIndex(worktree);
  index.tasks[task.id] = {
    id: task.id,
    title: task.title,
    status: task.status,
    assignedTo: task.assignedTo,
    scope: task.scope,
    type: task.type,
    parentId: task.parentId,
  };
  saveIndex(worktree, index);
}

// Maps TaskType to its 3-letter ID prefix
const TYPE_PREFIX: Record<TaskType, string> = {
  feature: "FTR",
  bug:     "BUG",
  task:    "TSK",
  debt:    "DBT",
};

/**
 * Generate a unique task ID.
 * - Top-level tasks: FTR-001, BUG-001, TSK-001, DBT-001
 * - Subtasks:        FTR-001-001, FTR-001-002 (derived from parentId)
 */
export function nextId(worktree: string, type: TaskType, parentId?: string): string {
  const index = loadIndex(worktree);

  let id: string;

  if (parentId) {
    // Subtask: increment the child counter for this parent
    const current = index.childCounters[parentId] ?? 0;
    const next = current + 1;
    index.childCounters[parentId] = next;
    id = `${parentId}-${String(next).padStart(3, "0")}`;
  } else {
    // Top-level task: increment the per-prefix counter
    const prefix = TYPE_PREFIX[type] ?? "TSK";
    const current = index.prefixCounters[prefix] ?? 0;
    const next = current + 1;
    index.prefixCounters[prefix] = next;
    id = `${prefix}-${String(next).padStart(3, "0")}`;
  }

  saveIndex(worktree, index);
  return id;
}

// ─────────────────────────────────────────────────────────────
// Business logic
// ─────────────────────────────────────────────────────────────

export function resolveAgent(
  status: TaskStatus,
  scope: TeamScope,
  currentAssignee: string,
  reopenTarget?: string
): string {
  switch (status) {
    case "backlog":    return "product-owner";
    case "planning":   return "project-manager";
    case "in-progress":
      if (scope === "backend") return "backend-lead";
      if (scope === "frontend") return "frontend-lead";
      if (scope === "both") return "backend-lead";
      return currentAssignee;
    case "review":   return "code-reviewer";
    case "testing":  return "tester";
    case "done":     return currentAssignee;
    case "reopened": return reopenTarget || currentAssignee;
    default:         return currentAssignee;
  }
}

export function writeTrigger(
  worktree: string,
  task: KanbanTask,
  previousStatus: TaskStatus | null
): void {
  const triggerDir = join(getKanbanDir(worktree), "triggers");
  if (!existsSync(triggerDir)) mkdirSync(triggerDir, { recursive: true });

  const payload = {
    taskId: task.id,
    status: task.status,
    assignedTo: task.assignedTo,
    previousStatus,
    createdAt: new Date().toISOString(),
    message: buildTriggerMessage(task, previousStatus),
  };

  writeFileSync(
    join(triggerDir, `${task.id}-${Date.now()}.json`),
    JSON.stringify(payload, null, 2)
  );
}

export function buildTriggerMessage(task: KanbanTask, previousStatus: TaskStatus | null): string {
  const card = formatTaskCard(task);
  const instructions = buildStatusInstructions(task);
  return [
    `📋 **Kanban Task Assignment**`,
    ``,
    card,
    ``,
    instructions,
    task.reopenCount > 2
      ? `\n⚠️ **Warning:** This task has been reopened ${task.reopenCount} times. Consider escalating to @architect.`
      : "",
  ].filter(Boolean).join("\n");
}

function buildStatusInstructions(task: KanbanTask): string {
  switch (task.status) {
    case "backlog":
      return `**Your action:** You are @product-owner. Clarify this feature, write a user story with acceptance criteria, then call \`kanban_update_task\` to set status to 'planning' with storyContext and acceptanceCriteria.`;
    case "planning":
      return `**Your action:** You are @project-manager. Read the story context. Create a feature branch. For 'both' scope: create two subtasks (backend + frontend) with \`kanban_create_task\` using initialStatus: 'in-progress'. For single scope: update this task to 'in-progress' and delegate to the appropriate lead.`;
    case "in-progress":
      if (task.scope === "backend") return `**Your action:** You are @backend-lead. Assess complexity, delegate to the right developer. When implementation is done, call \`kanban_update_task\` to set status to 'review'.`;
      if (task.scope === "frontend") return `**Your action:** You are @frontend-lead. Assess complexity, delegate to the right developer. When implementation is done, call \`kanban_update_task\` to set status to 'review'.`;
      return `**Your action:** Implement this task. When done, call \`kanban_update_task\` to set status to 'review'.`;
    case "review":
      return `**Your action:** You are @code-reviewer. Review the implementation. Check git diff. If APPROVED: call \`kanban_update_task\` status='testing'. If CHANGES NEEDED: status='reopened' with reviewNotes explaining what must be fixed.`;
    case "testing":
      return `**Your action:** You are @tester. Run the test suite. Verify all acceptance criteria. If ALL PASS: call \`kanban_update_task\` status='done' with testNotes. If FAIL: status='reopened' with testNotes explaining what failed.`;
    case "reopened":
      return `**Your action:** Task was reopened. Reason: ${task.reopenReason || "See review/test notes above"}. Fix the issues, commit, then call \`kanban_update_task\` to set status back to 'review'.`;
    case "done":
      return `**Task is complete.** No action needed.`;
    default:
      return "";
  }
}

export function formatTaskCard(task: KanbanTask): string {
  const icon: Record<string, string> = {
    backlog: "📋", planning: "📝", "in-progress": "⚙️",
    review: "👁️", testing: "🧪", done: "✅", reopened: "🔄",
  };

  const lines = [
    `${icon[task.status] || "•"} **${task.id}** — ${task.title}`,
    `**Status:** ${task.status} | **Assigned:** @${task.assignedTo} | **Scope:** ${task.scope} | **Type:** ${task.type}`,
  ];

  if (task.description) lines.push(`**Description:** ${task.description}`);
  if (task.storyContext) lines.push(`**Story context:** ${task.storyContext}`);
  if (task.acceptanceCriteria?.length) {
    lines.push(`**Acceptance criteria:**`);
    task.acceptanceCriteria.forEach((c) => lines.push(`  - [ ] ${c}`));
  }
  if (task.reviewNotes) lines.push(`**Review notes:** ${task.reviewNotes}`);
  if (task.testNotes) lines.push(`**Test notes:** ${task.testNotes}`);
  if (task.reopenReason) lines.push(`**Reopen reason:** ${task.reopenReason} (reopened ${task.reopenCount}x)`);
  if (task.childIds?.length) lines.push(`**Subtasks:** ${task.childIds.join(", ")}`);
  if (task.parentId) lines.push(`**Parent task:** ${task.parentId}`);

  return lines.join("\n");
}
