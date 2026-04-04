import type { Plugin } from "@opencode-ai/plugin";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

// ─────────────────────────────────────────────────────────────
// Kanban Plugin
//
// Previously: polling-based trigger system (setInterval + file watcher)
// Now: no-op lifecycle plugin — agents call the next agent directly
//      via the Task tool after updating Kanban status.
//
// This plugin now only:
//   1. Ensures the .kanban/ directory exists on session start
//   2. Logs session lifecycle events for observability
// ─────────────────────────────────────────────────────────────

export const KanbanPlugin: Plugin = async ({ client, worktree }) => {
  const kanbanDir = join(worktree, ".kanban");

  function log(level: "info" | "warn" | "error", message: string): void {
    client.app.log({
      body: {
        service: "kanban",
        level,
        message,
      },
    });
  }

  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        if (!existsSync(kanbanDir)) {
          mkdirSync(kanbanDir, { recursive: true });
        }
        log("info", `Kanban plugin ready — session ${event.properties.id}`);
      }

      if (event.type === "session.deleted") {
        log("info", "Kanban plugin — session closed");
      }
    },
  };
};

export default KanbanPlugin;
