import { tool } from "@opencode-ai/plugin";
import { loadTask, formatTaskCard } from "./_kanban-core.js";

export default tool({
  description:
    "Get full details of a specific Kanban task including description, acceptance criteria, notes, and status history. " +
    "Always call this first when you receive a Kanban task assignment.",
  args: {
    id: tool.schema.string().describe("Task ID (e.g. KAN-001)"),
    includeHistory: tool.schema.boolean().optional().describe("Include full status history. Default: false."),
  },

  async execute(args, context) {
    const task = loadTask(context.worktree, args.id);
    if (!task) return `❌ Task not found: ${args.id}`;

    const lines = [formatTaskCard(task)];

    if (args.includeHistory && task.history.length > 0) {
      lines.push(``, `**History:**`);
      task.history.forEach((h) => {
        const from = h.fromStatus ? `${h.fromStatus} →` : "created →";
        lines.push(
          `  ${new Date(h.timestamp).toISOString().replace("T", " ").slice(0, 19)} UTC | ${from} **${h.toStatus}** by @${h.agent}${h.note ? ` — ${h.note}` : ""}`
        );
      });
    }

    return lines.join("\n");
  },
});
