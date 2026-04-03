import type { Plugin } from "@opencode-ai/plugin";
import {
  existsSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { join } from "path";

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

const TRIGGER_CHECK_INTERVAL_MS = 5_000;   // 5 saniyede bir trigger kontrol
const WATCHDOG_INTERVAL_MS = 2 * 60_000;   // 2 dakikada bir stall kontrol
const STALL_THRESHOLD_MINUTES = 30;         // 30 dakika hareketsizlik = stall
const MAX_REOPEN_COUNT = 3;                 // Bu kadar reopen'dan sonra eskalasyon

// Agent → OpenCode agent ID mapping
// Bunlar opencode.json'daki agent key'leri ile eşleşmeli
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
      const existing = existsSync(logPath)
        ? readFileSync(logPath, "utf8")
        : "";
      // Son 1000 satırı tut
      const lines = existing.split("\n");
      const trimmed = lines.slice(-999).join("\n");
      writeFileSync(logPath, trimmed + entry);
    } catch {
      // Log yazılamazsa sessizce devam et
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
    if (!existsSync(kanbanDir)) return; // Kanban kurulmamış, skip
    if (!existsSync(triggerDir)) mkdirSync(triggerDir, { recursive: true });
    if (!existsSync(processedDir)) mkdirSync(processedDir, { recursive: true });
  }

  // ── Trigger işleme ──────────────────────────────────────

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

    // Done status'unda agent tetikleme
    if (payload.status === "done") {
      log("info", `Task ${payload.taskId} is done. No agent trigger needed.`);
      archiveTrigger(triggerPath, triggerFile, "done");

      // Kullanıcıya bildirim ekle
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
        // Bildirim gönderilemezse devam et
      }
      return;
    }

    // Paralel kural: backend-lead ve frontend-lead aynı anda tetiklenebilir
    // Kendi içinde sıralı: bir task done olmadan aynı agent'a yeni task gelmiyor
    // Bu zaten kanban_update_task'ın status kontrolüyle sağlanıyor

    try {
      // Agent'ı tetikle - session.prompt ile mesajı session'a inject et
      // noReply: false → agent gerçekten yanıt verecek
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          // agent parametresi: hangi agent yanıtlasın
          // NOT: Bu OpenCode SDK'sında destekleniyorsa kullan
          // Desteklenmiyorsa mesaj içinde @mention yeterli
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
      // Başarısız trigger'ı sil - watchdog tekrar dener
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

  // ── Watchdog: stalled task tespiti ──────────────────────

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

    // Stalled task'lar için nudge gönder
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
      // Nudge gönderilemezse sessizce devam et
    }
  }

  // ── Session ID tespiti ───────────────────────────────────

  let currentSessionId: string | null = null;
  let triggerInterval: ReturnType<typeof setInterval> | null = null;
  let watchdogInterval: ReturnType<typeof setInterval> | null = null;

  // ─────────────────────────────────────────────────────────
  // Event handlers
  // ─────────────────────────────────────────────────────────

  return {
    // Session oluşturulduğunda polling başlat
    event: async ({ event }) => {
      // Session oluşturuldu
      if (event.type === "session.created") {
        currentSessionId = event.properties.id;
        ensureDirs();

        log(
          "info",
          `Kanban trigger plugin initialized for session ${currentSessionId}`
        );

        // Trigger polling başlat
        if (!triggerInterval) {
          triggerInterval = setInterval(async () => {
            try {
              if (!currentSessionId || !existsSync(triggerDir)) return;

              const files = readdirSync(triggerDir).filter((f) =>
                f.endsWith(".json")
              );

              if (files.length === 0) return;

              // En eski trigger'dan başla (FIFO)
              files.sort();
              const nextFile = files[0];

              await processTrigger(nextFile, currentSessionId);
            } catch (err) {
              log("error", `Trigger polling error: ${err}`);
            }
          }, TRIGGER_CHECK_INTERVAL_MS);
        }

        // Watchdog başlat
        if (!watchdogInterval) {
          watchdogInterval = setInterval(async () => {
            if (!currentSessionId) return;
            await runWatchdog(currentSessionId);
          }, WATCHDOG_INTERVAL_MS);
        }
      }

      // Session silindiğinde temizle
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

      // Session idle olduğunda bekleyen trigger'ları işle
      if (event.type === "session.idle" && currentSessionId) {
        if (!existsSync(triggerDir)) return;

        const files = readdirSync(triggerDir).filter((f) =>
          f.endsWith(".json")
        );

        if (files.length > 0) {
          log(
            "info",
            `Session idle — processing ${files.length} pending trigger(s)`
          );
          // Sırayla işle (paralel backend+frontend için iki ayrı trigger olur)
          for (const file of files.sort()) {
            await processTrigger(file, currentSessionId);
            // Paralel trigger'larda kısa bekleme (deadlock önleme)
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      }
    },

    // Todo güncellemesini de izle (mevcut todo sistemi ile entegrasyon)
    "todo.updated": async ({ event }) => {
      // Mevcut opencode todo'ları ile kanban'ı senkronize et
      // todo.status === "completed" ise kanban'da eşleşen task'ı güncelle
      // Bu opsiyonel — kanban kendi başına da çalışır
    },
  };
};

export default KanbanTriggerPlugin;
