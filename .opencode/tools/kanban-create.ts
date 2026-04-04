import { tool } from "@opencode-ai/plugin";
import {
  ensureKanbanDir, nextId, resolveAgent, saveTask, updateIndex,
  loadTask, formatTaskCard,
  type TaskStatus, type TaskType, type TeamScope, type KanbanTask,
} from "./_kanban-core.js";

export default tool({
  description:
    "Create a new task on the Kanban board. The task is automatically assigned to the appropriate agent based on status and scope. " +
    "After creation, you MUST use the Task tool to notify the assigned agent. " +
    "Use this for new features (scope: 'both'), bug reports, or direct tasks. " +
    "project-manager uses this to create subtasks (scope: 'backend' or 'frontend') with initialStatus: 'in-progress'.",
  args: {
    title: tool.schema.string().describe("Short, descriptive title for the task"),
    description: tool.schema.string().describe("Full description of what needs to be done"),
    type: tool.schema.enum(["feature", "bug", "task", "debt"]).describe("Task type"),
    scope: tool.schema
      .enum(["backend", "frontend", "both", "none"])
      .describe("Which team owns this task. Use 'both' for full-stack features — project-manager will split into subtasks."),
    parentId: tool.schema.string().optional().describe("Parent task ID if this is a subtask (e.g. FTR-001). The new task will receive an ID like FTR-001-001."),
    storyContext: tool.schema.string().optional().describe("One-sentence user story context: what the user wants and why"),
    acceptanceCriteria: tool.schema.array(tool.schema.string()).optional().describe("List of concrete, testable acceptance criteria"),
    initialStatus: tool.schema
      .enum(["backlog", "planning", "in-progress"])
      .optional()
      .describe("Override starting status. Defaults to 'backlog'. Use 'in-progress' when project-manager creates subtasks."),
    assignTo: tool.schema.string().optional().describe("Override auto-assigned agent"),
    agentName: tool.schema.string().optional().describe("Name of the agent creating this task (for history tracking)"),
  },

  async execute(args, context) {
    const worktree = context.worktree;
    ensureKanbanDir(worktree);

    const id = nextId(worktree, args.type as TaskType, args.parentId);
    const status: TaskStatus = (args.initialStatus as TaskStatus) || "backlog";
    const assignedTo = args.assignTo || resolveAgent(status, args.scope as TeamScope, "product-owner");

    const now = new Date().toISOString();
    const task: KanbanTask = {
      id,
      type: args.type as TaskType,
      title: args.title,
      description: args.description,
      status,
      scope: args.scope as TeamScope,
      assignedTo,
      parentId: args.parentId,
      childIds: [],
      storyContext: args.storyContext,
      acceptanceCriteria: args.acceptanceCriteria || [],
      reopenCount: 0,
      createdAt: now,
      updatedAt: now,
      history: [{
        timestamp: now,
        fromStatus: null,
        toStatus: status,
        agent: args.agentName || "system",
        note: "Task created",
      }],
    };

    saveTask(worktree, task);
    updateIndex(worktree, task);

    // Add to parent's childIds list
    if (args.parentId) {
      const parent = loadTask(worktree, args.parentId);
      if (parent) {
        parent.childIds = parent.childIds || [];
        parent.childIds.push(id);
        saveTask(worktree, parent);
        updateIndex(worktree, parent);
      }
    }

    return [
      `✅ **Task created: ${id}**`,
      ``,
      formatTaskCard(task),
      ``,
      `🔔 **MANDATORY NEXT ACTION:** Use the **Task tool** to call **@${assignedTo}** with the task ID and context.`,
    ].join("\n");
  },
});
