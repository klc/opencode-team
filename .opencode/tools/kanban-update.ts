import { tool } from "@opencode-ai/plugin";
import {
  loadTask, saveTask, updateIndex, resolveAgent, writeTrigger, formatTaskCard,
  type TaskStatus, type TeamScope,
} from "./_kanban-core.js";

export default tool({
  description:
    "Update a Kanban task's status, notes, or assignee. " +
    "When status changes, the next agent is automatically triggered. " +
    "MANDATORY: Always call this when you finish your part — never just report completion in text. " +
    "Status flow: backlog → planning → in-progress → review → testing → done. " +
    "Failure path: review/testing → reopened → in-progress → review → ...",
  args: {
    id: tool.schema.string().describe("Task ID (e.g. KAN-001)"),
    status: tool.schema
      .enum(["backlog", "planning", "in-progress", "review", "testing", "done", "reopened"])
      .optional()
      .describe("New status. Triggers the appropriate next agent automatically."),
    assignTo: tool.schema.string().optional().describe("Override auto-assigned agent"),
    storyContext: tool.schema.string().optional().describe("Set/update the user story context"),
    acceptanceCriteria: tool.schema.array(tool.schema.string()).optional().describe("Set/replace acceptance criteria"),
    reviewNotes: tool.schema.string().optional().describe("Code reviewer notes. Required when setting status to 'reopened' after review failure."),
    testNotes: tool.schema.string().optional().describe("Tester notes. Required when setting status to 'done' or 'reopened' after testing."),
    reopenReason: tool.schema.string().optional().describe("Why is this task being reopened? What must be fixed?"),
    note: tool.schema.string().optional().describe("General note for the history log"),
    agentName: tool.schema.string().optional().describe("Name of the agent making this update (for history)"),
  },

  async execute(args, context) {
    const task = loadTask(context.worktree, args.id);
    if (!task) {
      return `❌ Task not found: ${args.id}. Use kanban_list_tasks to see available tasks.`;
    }

    const previousStatus = task.status;
    const agentName = args.agentName || "unknown";

    // Apply field updates
    if (args.status) task.status = args.status as TaskStatus;
    if (args.storyContext) task.storyContext = args.storyContext;
    if (args.acceptanceCriteria) task.acceptanceCriteria = args.acceptanceCriteria;
    if (args.reviewNotes) task.reviewNotes = args.reviewNotes;
    if (args.testNotes) task.testNotes = args.testNotes;
    if (args.reopenReason) task.reopenReason = args.reopenReason;

    // Reopen sayacı
    if (args.status === "reopened") task.reopenCount += 1;

    // Done timestamp
    if (args.status === "done") task.completedAt = new Date().toISOString();

    // Agent atama
    if (args.assignTo) {
      task.assignedTo = args.assignTo;
    } else if (args.status && args.status !== previousStatus) {
      let reopenTarget: string | undefined;
      if (args.status === "reopened") {
        // History'den son in-progress agent'ını bul
        const lastDev = task.history
          .filter((h) => h.toStatus === "in-progress")
          .pop();
        reopenTarget = lastDev?.agent;
      }
      task.assignedTo = resolveAgent(
        args.status as TaskStatus,
        task.scope as TeamScope,
        task.assignedTo,
        reopenTarget
      );
    }

    // History
    task.history.push({
      timestamp: new Date().toISOString(),
      fromStatus: previousStatus,
      toStatus: task.status,
      agent: agentName,
      note: args.note || args.reviewNotes || args.testNotes || args.reopenReason,
    });

    saveTask(context.worktree, task);
    updateIndex(context.worktree, task);

    // Status değiştiyse trigger yaz
    if (args.status && args.status !== previousStatus) {
      writeTrigger(context.worktree, task, previousStatus);
    }

    const statusChanged = args.status && args.status !== previousStatus;
    const lines = [
      `✅ **Task updated: ${task.id}**`,
      ``,
      formatTaskCard(task),
    ];

    if (statusChanged) {
      lines.push(
        ``,
        `🔄 **${previousStatus} → ${task.status}**`,
        `📡 **Trigger queued** → @${task.assignedTo} will be automatically notified.`
      );
    }

    return lines.join("\n");
  },
});
