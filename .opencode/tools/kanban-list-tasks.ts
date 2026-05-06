import { tool } from "@opencode-ai/plugin";
import { loadIndex, type TaskStatus } from "./_kanban-core.js";

export default tool({
  description:
    "List tasks on the Kanban board grouped by status. " +
    "Filter by status, assigned agent, or scope. " +
    "Use for standup reports, sprint planning, or finding your assigned tasks.",
  args: {
    status: tool.schema
      .enum(["backlog", "planning", "in-progress", "review", "testing", "done", "reopened", "all"])
      .optional()
      .describe("Filter by status. Defaults to all active tasks (excludes done)."),
    assignedTo: tool.schema.string().optional().describe("Filter by assigned agent"),
    scope: tool.schema.enum(["backend", "frontend", "both", "none", "all"]).optional().describe("Filter by team scope"),
    includeSubtasks: tool.schema.boolean().optional().describe("Include subtasks. Default: true."),
  },

  async execute(args, context) {
    const index = loadIndex(context.worktree);
    const allTasks = Object.values(index.tasks);

    if (allTasks.length === 0) {
      return "📋 No tasks found. Use kanban_create_task to create the first task.";
    }

    const activeStatuses: TaskStatus[] = ["backlog", "planning", "in-progress", "review", "testing", "reopened"];

    let filtered = allTasks.filter((t) => {
      if (args.status === "all") return true;
      if (!args.status) return activeStatuses.includes(t.status as TaskStatus);
      return t.status === args.status;
    });

    if (args.assignedTo) filtered = filtered.filter((t) => t.assignedTo === args.assignedTo);
    if (args.scope && args.scope !== "all") filtered = filtered.filter((t) => t.scope === args.scope);
    if (args.includeSubtasks === false) filtered = filtered.filter((t) => !t.parentId);

    if (filtered.length === 0) return "📋 No tasks match the given filters.";

    const statusOrder: TaskStatus[] = ["reopened", "in-progress", "review", "testing", "planning", "backlog", "done"];
    const icon: Record<string, string> = {
      backlog: "📋", planning: "📝", "in-progress": "⚙️",
      review: "👁️", testing: "🧪", done: "✅", reopened: "🔄",
    };

    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((t) => { groups[t.status] = groups[t.status] || []; groups[t.status].push(t); });

    const lines = [`📋 **Kanban Board** — ${filtered.length} active task(s)`, ``];

    statusOrder.forEach((status) => {
      const group = groups[status];
      if (!group?.length) return;
      lines.push(`### ${icon[status]} ${status.toUpperCase()} (${group.length})`);
      group.forEach((t) => {
        const indent = t.parentId ? "  ↳ " : "";
        lines.push(`${indent}**${t.id}** | @${t.assignedTo} | ${t.scope} | ${t.title}`);
      });
      lines.push(``);
    });

    return lines.join("\n");
  },
});
