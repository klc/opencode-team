import { tool } from "@opencode-ai/plugin";
import {
  loadTask, saveTask, updateIndex, resolveAgent, formatTaskCard,
  type TaskStatus, type TeamScope,
} from "./_kanban-core.js";

// ─────────────────────────────────────────────────────────────
// Self-call handoff instruction builder
// Returns the MANDATORY next action the calling agent must take.
// ─────────────────────────────────────────────────────────────
function buildHandoffInstruction(
  status: TaskStatus,
  scope: string,
  assignedTo: string
): string {
  switch (status) {
    case "planning":
      return `🔔 **MANDATORY NEXT ACTION:** Use the **Task tool** to call **@project-manager**.\nPass the task ID and full context so it can plan the sprint and create subtasks.`;
    case "in-progress":
      if (scope === "backend")
        return `🔔 **MANDATORY NEXT ACTION:** Use the **Task tool** to call **@backend-lead**.\nPass the task ID and full context so it can assess complexity and delegate to the right developer.`;
      if (scope === "frontend")
        return `🔔 **MANDATORY NEXT ACTION:** Use the **Task tool** to call **@frontend-lead**.\nPass the task ID and full context so it can assess complexity and delegate to the right developer.`;
      if (scope === "both")
        return `🔔 **MANDATORY NEXT ACTION:** Use the **Task tool** to call **BOTH @backend-lead AND @frontend-lead** (one call each).\nPass the task ID and context to each so they can work in parallel.`;
      return `🔔 **MANDATORY NEXT ACTION:** Use the **Task tool** to notify **@${assignedTo}** with the task context.`;
    case "review":
      return `🔔 **MANDATORY NEXT ACTION:** Use the **Task tool** to call **@code-reviewer**.\nPass the task ID, acceptance criteria, and any implementation notes.`;
    case "testing":
      return `🔔 **MANDATORY NEXT ACTION:** Use the **Task tool** to call **@tester**.\nPass the task ID and acceptance criteria so it can verify each one.`;
    case "done":
      return `🔔 **MANDATORY NEXT ACTION:** Use the **Task tool** to notify **@project-manager** that this task is complete.\nInclude the task ID and a brief summary of what was delivered.`;
    case "reopened": {
      const lead = scope === "frontend" ? "frontend-lead" : "backend-lead";
      return `🔔 **MANDATORY NEXT ACTION:** Use the **Task tool** to notify **@${lead}** with the failure details.\nInclude the task ID, reviewNotes or testNotes, and what must be fixed.`;
    }
    default:
      return "";
  }
}

export default tool({
  description:
    "Update a Kanban task's status, notes, or assignee. " +
    "MANDATORY: Always call this when you finish your part — never just report completion in text. " +
    "After calling this tool, you MUST use the Task tool to call the next agent as indicated in the response. " +
    "Status flow: backlog → planning → in-progress → review → testing → done. " +
    "Failure path: review/testing → reopened → in-progress → review → ...",
  args: {
    id: tool.schema.string().describe("Task ID (e.g. FTR-001)"),
    status: tool.schema
      .enum(["backlog", "planning", "in-progress", "review", "testing", "done", "reopened"])
      .optional()
      .describe("New status. After updating, you MUST call the next agent via the Task tool."),
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

    // Reopen counter
    if (args.status === "reopened") task.reopenCount += 1;

    // Done timestamp
    if (args.status === "done") task.completedAt = new Date().toISOString();

    // Agent assignment
    if (args.assignTo) {
      task.assignedTo = args.assignTo;
    } else if (args.status && args.status !== previousStatus) {
      let reopenTarget: string | undefined;
      if (args.status === "reopened") {
        const devRoles = ["senior-backend", "junior-backend", "senior-frontend", "junior-frontend", "backend-lead", "frontend-lead"];
        if (devRoles.includes(task.assignedTo)) {
          reopenTarget = task.assignedTo;
        } else {
          const lastDevEntry = [...task.history]
            .reverse()
            .find((h) => h.toStatus === "in-progress" && devRoles.includes(h.agent));
          reopenTarget = lastDevEntry?.agent;
        }
      }
      task.assignedTo = resolveAgent(
        args.status as TaskStatus,
        task.scope as TeamScope,
        task.assignedTo,
        reopenTarget
      );
    }

    // History entry
    task.history.push({
      timestamp: new Date().toISOString(),
      fromStatus: previousStatus,
      toStatus: task.status,
      agent: agentName,
      note: args.note || args.reviewNotes || args.testNotes || args.reopenReason,
    });

    saveTask(context.worktree, task);
    updateIndex(context.worktree, task);

    const statusChanged = args.status && args.status !== previousStatus;
    const lines = [
      `✅ **Task updated: ${task.id}**`,
      ``,
      formatTaskCard(task),
    ];

    if (statusChanged) {
      const handoff = buildHandoffInstruction(task.status, task.scope, task.assignedTo);
      lines.push(
        ``,
        `🔄 **${previousStatus} → ${task.status}**`,
        ``,
        handoff,
      );
    }

    return lines.join("\n");
  },
});
