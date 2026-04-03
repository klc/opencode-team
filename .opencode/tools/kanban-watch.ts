import { tool } from "@opencode-ai/plugin";
import { loadIndex, loadTask, getKanbanDir } from "./_kanban-core.js";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

export default tool({
  description:
    "Check for stalled tasks and pending triggers on the Kanban board. " +
    "A task is stalled if it has been in-progress, review, or testing for longer than the threshold without any update. " +
    "Also reports how many triggers are waiting to be processed by the plugin.",
  args: {
    stallThresholdMinutes: tool.schema
      .number()
      .optional()
      .describe("Minutes without update before a task is considered stalled. Default: 30."),
  },

  async execute(args, context) {
    const worktree = context.worktree;
    const index = loadIndex(worktree);
    const threshold = (args.stallThresholdMinutes || 30) * 60 * 1000;
    const now = Date.now();

    const stalledTasks = [];
    const pendingTriggers: string[] = [];

    // Stalled task detection
    for (const summary of Object.values(index.tasks)) {
      if (!["in-progress", "review", "testing", "planning"].includes(summary.status)) continue;
      const task = loadTask(worktree, summary.id);
      if (!task) continue;
      const stalledMs = now - new Date(task.updatedAt).getTime();
      if (stalledMs > threshold) {
        stalledTasks.push({
          ...task,
          stalledMinutes: Math.round(stalledMs / 60000),
        });
      }
    }

    // Pending triggers - only count files matching the trigger naming pattern
    const triggerDir = join(getKanbanDir(worktree), "triggers");
    if (existsSync(triggerDir)) {
      pendingTriggers.push(
        ...readdirSync(triggerDir).filter((f) =>
          // Match trigger files: FTR-001-1712345678.json or FTR-001-001-1712345678.json (subtasks)
          f.endsWith(".json") && /^[A-Z]+-\d+(-\d+)?-\d{10,}\.json$/.test(f)
        )
      );
    }

    if (stalledTasks.length === 0 && pendingTriggers.length === 0) {
      return "✅ No stalled tasks or pending triggers. Everything is moving.";
    }

    const lines = [`🔍 **Kanban Watchdog Report**`, ``];

    if (stalledTasks.length > 0) {
      lines.push(`### ⚠️ Stalled Tasks (>${args.stallThresholdMinutes || 30} minutes without update)`);
      stalledTasks.forEach((t) => {
        lines.push(`- **${t.id}** [${t.status}] @${t.assignedTo} — ${t.title} *(stalled ${t.stalledMinutes}m)*`);
      });
      lines.push(
        ``,
        `**Action:** Call \`kanban_update_task\` to update the status or add a progress note.`
      );
      lines.push(``);
    }

    if (pendingTriggers.length > 0) {
      lines.push(`### 📡 Pending Triggers (${pendingTriggers.length})`);
      lines.push(`These will be processed when the session becomes idle.`);
      pendingTriggers.forEach((f) => lines.push(`- ${f.replace(/-\d+\.json$/, "")}`));
    }

    return lines.join("\n");
  },
});
