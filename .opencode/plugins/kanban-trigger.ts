import type { Plugin } from "@opencode-ai/plugin";
import {
  existsSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  mkdirSync,
  appendFileSync,
  statSync,
} from "fs";
import { join } from "path";

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

const TRIGGER_CHECK_INTERVAL_MS = 5_000;   // Check triggers every 5 seconds
const WATCHDOG_INTERVAL_MS = 2 * 60_000;   // Check for stalled tasks every 2 minutes
const STALL_THRESHOLD_MINUTES = 30;         // 30 minutes of inactivity = stalled
const MAX_REOPEN_COUNT = 3;                 // Escalate after this many reopens
const MAX_LOG_SIZE = 100_000;               // Rotate log when it exceeds 100KB
const MAX_LOG_LINES = 500;                  // Keep last 500 lines after rotation

// Agent → OpenCode agent ID mapping
// These must match the agent keys in opencode.json
const AGENT_MAP: Record<string, string> = {
  "product-owner": "product-owner",
  "project-manager": "project-manager",
  "architect": "architect",
  "backend-lead": "backend-lead",
  "frontend-lead": "frontend-lead",
  "senior-backend": "senior-backend",
  "junior-backend": "junior-backend",
  "senior-frontend": "senior-frontend",
  "junior-frontend": "junior-frontend",
  "code-reviewer": "code-reviewer",
  "tester": "tester",
  "debugger": "debugger",
  "researcher": "researcher",
  "designer": "designer",
  "security-auditor": "security-auditor",
  "performance-analyst": "performance-analyst",
  "librarian": "librarian",
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface TriggerPayload {
  taskId: string;
  status: string;
  assignedTo: string;
  previousStatus: string | null;
  createdAt: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────────────────────────

export const KanbanTriggerPlugin: Plugin = async ({
  client,
  worktree,
  $,
}) => {
  const kanbanDir = join(worktree, ".kanban");
  const triggerDir = join(kanbanDir, "triggers");
  const processedDir = join(kanbanDir, "triggers", "processed");
  const logPath = join(kanbanDir, "trigger.log");

  // ── Helpers ──────────────────────────────────────────────

  function log(level: "info" | "warn" | "error", message: string): void {
    const entry = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}\n`;
    try {
      // Append to log file
      appendFileSync(logPath, entry);
      // Periodic rotation: if file > 100KB, keep last 500 lines
      const stats = statSync(logPath);
      if (stats.size > MAX_LOG_SIZE) {
        const content = readFileSync(logPath, "utf8");
        const lines = content.split("\n");
        writeFileSync(logPath, lines.slice(-MAX_LOG_LINES).join("\n"));
      }
    } catch {
      // Silently continue if log write fails
    }

    client.app.log({
      body: {
        service: "kanban-trigger",
        level,
        message,
      },
    });
  }

  function ensureDirs(): void {
    if (!existsSync(kanbanDir)) return; // Kanban isn't set up, skip
    if (!existsSync(triggerDir)) mkdirSync(triggerDir, { recursive: true });
    if (!existsSync(processedDir)) mkdirSync(processedDir, { recursive: true });
  }

  // ── Trigger processing ──────────────────────────────────

  async function processTrigger(
    triggerFile: string,
    sessionId: string
  ): Promise<void> {
    const triggerPath = join(triggerDir, triggerFile);

    let payload: TriggerPayload;
    try {
      payload = JSON.parse(readFileSync(triggerPath, "utf8"));
    } catch (err) {
      log("error", `Failed to parse trigger file ${triggerFile}: ${err}`);
      return;
    }

    const agentId = AGENT_MAP[payload.assignedTo];
    if (!agentId) {
      log(
        "warn",
        `Unknown agent '${payload.assignedTo}' for task ${payload.taskId}. Moving trigger to processed.`
      );
      archiveTrigger(triggerPath, triggerFile, "unknown-agent");
      return;
    }

    log(
      "info",
      `Processing trigger: ${payload.taskId} → status=${payload.status} → @${payload.assignedTo}`
    );

    // No agent trigger needed for done status
    if (payload.status === "done") {
      log("info", `Task ${payload.taskId} is done. No agent trigger needed.`);
      archiveTrigger(triggerPath, triggerFile, "done");

      // Send notification to user
      try {
        await client.session.prompt({
          path: { id: sessionId },
          body: {
            noReply: true,
            parts: [
              {
                type: "text",
                text: `\n✅ **Kanban: Task Completed**\n\nTask **${payload.taskId}** has been marked as **done**.\n`,
              },
            ],
          },
        });
      } catch {
        // Continue if notification fails
      }
      return;
    }

    // Parallel rule: backend-lead and frontend-lead can be triggered simultaneously
    // Internal ordering: a task won't get a new task for the same agent until done
    // This is already enforced by kanban_update_task's status control

    try {
      // Trigger the agent - inject message into session via session.prompt
      // The @mention in the message text routes to the correct agent
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [
            {
              type: "text",
              text: buildAgentPrompt(payload, agentId),
            },
          ],
        },
      });

      log(
        "info",
        `Trigger sent to @${agentId} for task ${payload.taskId}`
      );
      archiveTrigger(triggerPath, triggerFile, "sent");
    } catch (err) {
      log(
        "error",
        `Failed to trigger @${agentId} for ${payload.taskId}: ${err}`
      );
      // Archive the failed trigger — prevents spam and repeated retries
      archiveTrigger(triggerPath, triggerFile, "failed");
    }
  }

  function buildAgentPrompt(payload: TriggerPayload, agentId: string): string {
    return [
      `@${agentId}`,
      ``,
      payload.message,
      ``,
      `---`,
      `*This task was automatically assigned by the Kanban system.*`,
      `*When you complete your part, call \`kanban_update_task\` to update the status.*`,
    ].join("\n");
  }

  function archiveTrigger(
    triggerPath: string,
    triggerFile: string,
    reason: string
  ): void {
    try {
      const dest = join(processedDir, `${reason}-${triggerFile}`);
      const content = readFileSync(triggerPath, "utf8");
      writeFileSync(dest, content);
      unlinkSync(triggerPath);
    } catch (err) {
      log("warn", `Failed to archive trigger ${triggerFile}: ${err}`);
    }
  }

  // ── Watchdog: stalled task detection ──────────────────────

  async function runWatchdog(sessionId: string): Promise<void> {
    if (!existsSync(kanbanDir)) return;

    const indexPath = join(kanbanDir, "index.json");
    if (!existsSync(indexPath)) return;

    let index: { tasks: Record<string, any> };
    try {
      index = JSON.parse(readFileSync(indexPath, "utf8"));
    } catch {
      return;
    }

    const now = Date.now();
    const threshold = STALL_THRESHOLD_MINUTES * 60 * 1000;
    const stalledTasks: Array<{ id: string; status: string; assignedTo: string; title: string; stalledMinutes: number }> = [];

    for (const summary of Object.values(index.tasks)) {
      if (!["in-progress", "review", "testing", "planning"].includes(summary.status)) {
        continue;
      }

      const taskPath = join(kanbanDir, `${summary.id}.json`);
      if (!existsSync(taskPath)) continue;

      let task: any;
      try {
        task = JSON.parse(readFileSync(taskPath, "utf8"));
      } catch {
        continue;
      }

      const lastUpdate = new Date(task.updatedAt).getTime();
      const stalledMs = now - lastUpdate;

      if (stalledMs > threshold) {
        stalledTasks.push({
          id: task.id,
          status: task.status,
          assignedTo: task.assignedTo,
          title: task.title,
          stalledMinutes: Math.round(stalledMs / 60000),
        });
      }
    }

    if (stalledTasks.length === 0) return;

    log("warn", `Watchdog found ${stalledTasks.length} stalled task(s)`);

    // Send nudge for stalled tasks
    const nudgeLines = [
      `⚠️ **Kanban Watchdog Alert**`,
      ``,
      `The following tasks appear to be stalled (no updates for >${STALL_THRESHOLD_MINUTES} minutes):`,
      ``,
    ];

    stalledTasks.forEach((t) => {
      nudgeLines.push(
        `- **${t.id}** [${t.status}] @${t.assignedTo} — ${t.title} *(stalled ${t.stalledMinutes}m)*`
      );
    });

    nudgeLines.push(
      ``,
      `**Action required:** If you are working on one of these tasks, please call \`kanban_update_task\` to update the status or add a progress note. If the task is blocked, update it with a note explaining the blocker.`
    );

    try {
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          noReply: true,
          parts: [{ type: "text", text: nudgeLines.join("\n") }],
        },
      });
    } catch {
      // Continue silently if nudge fails
    }

    // Write a watchdog retry trigger for each stalled task
    // This re-alerts the assigned agent so it can resume the task
    ensureDirs();
    for (const t of stalledTasks) {
      const retryFile = `watchdog-retry-${t.id}-${Date.now()}.json`;
      const retryPath = join(triggerDir, retryFile);
      // Skip if a retry trigger for this task already exists in the queue
      if (existsSync(retryPath)) continue;
      const existingRetries = existsSync(triggerDir)
        ? readdirSync(triggerDir).filter((f) => f.startsWith(`watchdog-retry-${t.id}`))
        : [];
      if (existingRetries.length > 0) continue;

      const retryPayload = {
        taskId: t.id,
        status: t.status,
        assignedTo: t.assignedTo,
        previousStatus: t.status,
        createdAt: new Date().toISOString(),
        message: `[WATCHDOG RETRY] Task **${t.id}** (${t.title}) has not been updated for ${t.stalledMinutes} minutes.\n\nPlease call \`kanban_update_task\` to update the status or add a progress note. If the task is blocked, explain the reason.`,
      };
      try {
        writeFileSync(retryPath, JSON.stringify(retryPayload, null, 2));
        log("info", `Watchdog retry trigger created for ${t.id}`);
      } catch (err) {
        log("warn", `Failed to write watchdog retry trigger for ${t.id}: ${err}`);
      }
    }
  }

  // ── Session ID tracking ──────────────────────────────────

  let currentSessionId: string | null = null;
  let triggerInterval: ReturnType<typeof setInterval> | null = null;
  let watchdogInterval: ReturnType<typeof setInterval> | null = null;
  // Mutex: prevents race condition between interval polling and session.idle handler
  let isProcessingTrigger = false;

  // ─────────────────────────────────────────────────────────
  // Event handlers
  // ─────────────────────────────────────────────────────────

  return {
    // Start polling when session is created
    event: async ({ event }) => {
      // Session created
      if (event.type === "session.created") {
        currentSessionId = event.properties.id;
        ensureDirs();

        log(
          "info",
          `Kanban trigger plugin initialized for session ${currentSessionId}`
        );

        // Start trigger polling
        if (!triggerInterval) {
          triggerInterval = setInterval(async () => {
            // Race condition guard: skip if another trigger is already being processed
            if (isProcessingTrigger) return;
            try {
              if (!currentSessionId || !existsSync(triggerDir)) return;

              const files = readdirSync(triggerDir).filter((f) =>
                f.endsWith(".json")
              );

              if (files.length === 0) return;

              // Start from oldest trigger (FIFO)
              files.sort();
              const nextFile = files[0];

              isProcessingTrigger = true;
              await processTrigger(nextFile, currentSessionId);
            } catch (err) {
              log("error", `Trigger polling error: ${err}`);
            } finally {
              isProcessingTrigger = false;
            }
          }, TRIGGER_CHECK_INTERVAL_MS);
        }

        // Start watchdog
        if (!watchdogInterval) {
          watchdogInterval = setInterval(async () => {
            try {
              if (!currentSessionId) return;
              await runWatchdog(currentSessionId);
            } catch (err) {
              log("error", `Watchdog error: ${err}`);
            }
          }, WATCHDOG_INTERVAL_MS);
        }
      }

      // Clean up when session is deleted
      if (event.type === "session.deleted") {
        if (triggerInterval) {
          clearInterval(triggerInterval);
          triggerInterval = null;
        }
        if (watchdogInterval) {
          clearInterval(watchdogInterval);
          watchdogInterval = null;
        }
        currentSessionId = null;
        log("info", "Kanban trigger plugin cleaned up");
      }

      // Process pending triggers when session is idle
      if (event.type === "session.idle" && currentSessionId) {
        // Race condition guard: skip if the interval is already processing a trigger
        if (isProcessingTrigger) return;
        if (!existsSync(triggerDir)) return;

        const files = readdirSync(triggerDir).filter((f) =>
          f.endsWith(".json")
        );

        if (files.length > 0) {
          log(
            "info",
            `Session idle — processing next pending trigger (${files.length} in queue)`
          );
          // Process only ONE trigger — not all of them.
          // The interval will handle the remaining triggers in subsequent cycles.
          // Processing all triggers in a loop here causes session deadlock.
          try {
            isProcessingTrigger = true;
            await processTrigger(files.sort()[0], currentSessionId);
          } catch (err) {
            log("error", `Idle trigger processing error: ${err}`);
          } finally {
            isProcessingTrigger = false;
          }
        }
      }
    },

    // Watch todo updates for integration with existing todo system
    "todo.updated": async ({ event }) => {
      // Sync existing opencode todos with kanban
      // If todo.status === "completed", update matching kanban task
      // This is optional — kanban works independently
    },
  };
};

export default KanbanTriggerPlugin;
