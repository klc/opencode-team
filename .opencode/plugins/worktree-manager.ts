import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

type WorktreeStatus = "created" | "running" | "reviewing" | "testing" | "integrated" | "cleanup" | "failed";
type WorktreePurpose = "implementation" | "review" | "security" | "seo" | "testing" | "fix" | "other";

interface WorktreeSession {
  id: string;
  agent: string;
  purpose: WorktreePurpose;
  createdAt: string;
}

interface WorktreeState {
  name: string;
  directory: string;
  branch: string;
  baseBranch: string;
  status: WorktreeStatus;
  sessions: WorktreeSession[];
  integratedCommits?: string[];
  lastError?: string;
}

interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  storyContext?: string;
  acceptanceCriteria?: string[];
  worktree?: WorktreeState;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "task";
}

function taskPath(worktree: string, taskId: string): string {
  return join(worktree, ".kanban", `${taskId}.json`);
}

function loadTask(worktree: string, taskId: string): KanbanTask {
  const path = taskPath(worktree, taskId);
  if (!existsSync(path)) throw new Error(`Task not found: ${taskId}`);
  return JSON.parse(readFileSync(path, "utf8")) as KanbanTask;
}

function saveTask(worktree: string, task: KanbanTask): void {
  writeFileSync(taskPath(worktree, task.id), JSON.stringify({ ...task, updatedAt: new Date().toISOString() }, null, 2));
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function currentBranch(cwd: string): string {
  return git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

async function unwrap<T>(result: Promise<{ data?: T; error?: unknown }>, label: string): Promise<T> {
  const response = await result;
  if (response.error) {
    throw new Error(`${label} failed: ${JSON.stringify(response.error)}`);
  }
  if (!response.data) throw new Error(`${label} failed: no data returned`);
  return response.data;
}

function textPart(text: string) {
  return [{ type: "text" as const, text }];
}

export const WorktreeManagerPlugin: Plugin = async ({ client, serverUrl }) => {
  async function apiRequest<T>(method: string, pathname: string, query: Record<string, string | undefined>, body?: unknown): Promise<T> {
    const url = new URL(pathname, serverUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`${method} ${pathname} failed (${response.status}): ${text}`);
    }
    return await response.json() as T;
  }

  async function createSession(directory: string, parentID: string, title: string, agent: string, prompt: string): Promise<string> {
    const session = await unwrap<any>(
      client.session.create({
        query: { directory },
        body: { parentID, title },
      }),
      "session.create"
    );

    await unwrap<any>(
      client.session.promptAsync({
        path: { id: session.id },
        query: { directory },
        body: {
          agent,
          parts: textPart(prompt),
        },
      }),
      "session.promptAsync"
    );

    return session.id;
  }

  return {
    tool: {
      worktree_start_task: tool({
        description:
          "Create an isolated OpenCode worktree for a developer task, create the task branch, start the developer agent session, and record worktree metadata on the Kanban task.",
        args: {
          taskId: tool.schema.string().describe("Kanban task ID, e.g. FTR-001-001"),
          agent: tool.schema.enum(["senior-backend", "junior-backend", "senior-frontend", "junior-frontend"]).describe("Developer agent to start in the isolated worktree"),
          baseBranch: tool.schema.string().optional().describe("Feature branch to branch from. Defaults to the current branch."),
          branch: tool.schema.string().optional().describe("Task branch name. Defaults to task/<task-id>-<slug>."),
          prompt: tool.schema.string().describe("Full developer task prompt, including story context, acceptance criteria, constraints, and reporting requirements."),
        },
        async execute(args, context) {
          try {
            const task = loadTask(context.worktree, args.taskId);
            const baseBranch = args.baseBranch || currentBranch(context.worktree);
            const slug = slugify(task.title || args.taskId);
            const branch = args.branch || `task/${args.taskId.toLowerCase()}-${slug}`;
            const name = `oc-${args.taskId.toLowerCase()}-${slug}`.slice(0, 64);
            const startCommand = `git checkout -B ${JSON.stringify(branch)} ${JSON.stringify(baseBranch)}`;

            const created = await apiRequest<any>("POST", "/experimental/worktree", { directory: context.directory }, { name, startCommand });

            const directory = created.directory || created.path;
            if (!directory) throw new Error("worktree.create did not return a directory");

            const developerPrompt = [
              args.prompt,
              "",
              "WORKTREE ISOLATION RULES:",
              `- Work only in this task worktree: ${directory}`,
              `- Commit only to task branch: ${branch}`,
              `- Base feature branch: ${baseBranch}`,
              "- Do not push.",
              "- Do not update Kanban status directly.",
              "- Completion report must include worktree directory, branch, commit hashes, modified files, and verification output.",
            ].join("\n");

            const sessionId = await createSession(directory, context.sessionID, `${args.taskId} ${args.agent}`, args.agent, developerPrompt);

            task.worktree = {
              name,
              directory,
              branch,
              baseBranch,
              status: "running",
              sessions: [{ id: sessionId, agent: args.agent, purpose: "implementation", createdAt: new Date().toISOString() }],
            };
            saveTask(context.worktree, task);

            return [
              `✅ Worktree task started for ${args.taskId}`,
              `Worktree: ${name}`,
              `Directory: ${directory}`,
              `Branch: ${branch}`,
              `Base branch: ${baseBranch}`,
              `Developer session: ${sessionId}`,
            ].join("\n");
          } catch (error) {
            return `❌ worktree_start_task failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      worktree_start_agent: tool({
        description:
          "Start a reviewer, auditor, tester, or fix developer session inside an existing task worktree and record the child session on the Kanban task.",
        args: {
          taskId: tool.schema.string().describe("Kanban task ID"),
          agent: tool.schema.enum(["senior-backend", "junior-backend", "senior-frontend", "junior-frontend", "code-reviewer", "tester", "security-auditor", "seo-auditor"]).describe("Agent to start in the existing task worktree"),
          purpose: tool.schema.enum(["review", "security", "seo", "testing", "fix", "other"]).describe("Why this agent is being started"),
          prompt: tool.schema.string().describe("Full prompt for the agent"),
        },
        async execute(args, context) {
          try {
            const task = loadTask(context.worktree, args.taskId);
            if (!task.worktree) throw new Error(`Task ${args.taskId} has no worktree metadata. Start with worktree_start_task first.`);

            const prompt = [
              args.prompt,
              "",
              "WORKTREE CONTEXT:",
              `- Directory: ${task.worktree.directory}`,
              `- Task branch: ${task.worktree.branch}`,
              `- Base feature branch: ${task.worktree.baseBranch}`,
              "- Use this existing task worktree only.",
              args.purpose === "review"
                ? `- Review diff with: git diff ${task.worktree.baseBranch}...HEAD`
                : "",
              args.purpose === "testing"
                ? "- Verify acceptance criteria in this task worktree and report results to the lead."
                : "",
            ].filter(Boolean).join("\n");

            const sessionId = await createSession(task.worktree.directory, context.sessionID, `${args.taskId} ${args.agent} ${args.purpose}`, args.agent, prompt);
            task.worktree.sessions.push({ id: sessionId, agent: args.agent, purpose: args.purpose as WorktreePurpose, createdAt: new Date().toISOString() });
            if (args.purpose === "review" || args.purpose === "security" || args.purpose === "seo") task.worktree.status = "reviewing";
            if (args.purpose === "testing") task.worktree.status = "testing";
            if (args.purpose === "fix") task.worktree.status = "running";
            saveTask(context.worktree, task);

            return [
              `✅ Worktree agent started for ${args.taskId}`,
              `Agent: ${args.agent}`,
              `Purpose: ${args.purpose}`,
              `Directory: ${task.worktree.directory}`,
              `Session: ${sessionId}`,
            ].join("\n");
          } catch (error) {
            return `❌ worktree_start_agent failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      worktree_collect_report: tool({
        description:
          "Collect the latest messages from all child sessions recorded on a task worktree and summarize which sessions have reportable output.",
        args: {
          taskId: tool.schema.string().describe("Kanban task ID"),
          limit: tool.schema.number().optional().describe("Messages to fetch per child session. Defaults to 20."),
        },
        async execute(args, context) {
          try {
            const task = loadTask(context.worktree, args.taskId);
            if (!task.worktree) throw new Error(`Task ${args.taskId} has no worktree metadata.`);
            const limit = args.limit || 20;
            const reports: string[] = [];

            for (const session of task.worktree.sessions) {
              const messages = await unwrap<any>(
                client.session.messages({
                  path: { id: session.id },
                  query: {
                    directory: task.worktree.directory,
                    limit,
                  },
                }),
                `session.messages ${session.id}`
              );
              const items = Array.isArray(messages) ? messages : messages.messages || [];
              const text = JSON.stringify(items)
                .replace(/\\n/g, "\n")
                .slice(-4000);
              reports.push([
                `## ${session.agent} (${session.purpose})`,
                `Session: ${session.id}`,
                text || "No messages returned yet.",
              ].join("\n"));
            }

            return [
              `✅ Worktree report collected for ${args.taskId}`,
              `Directory: ${task.worktree.directory}`,
              `Branch: ${task.worktree.branch}`,
              "",
              reports.join("\n\n---\n\n") || "No child sessions recorded yet.",
            ].join("\n");
          } catch (error) {
            return `❌ worktree_collect_report failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      worktree_integrate_task: tool({
        description:
          "Cherry-pick approved task-branch commits from an isolated task worktree onto its base feature branch, recording integrated commits on the Kanban task.",
        args: {
          taskId: tool.schema.string().describe("Kanban task ID"),
          commits: tool.schema.array(tool.schema.string()).optional().describe("Specific commit hashes to cherry-pick. Defaults to all commits in baseBranch..taskBranch."),
          runCommand: tool.schema.string().optional().describe("Optional post-integration verification command for the lead to run manually after cherry-pick. This tool records the command but does not execute arbitrary shell."),
        },
        async execute(args, context) {
          try {
            const task = loadTask(context.worktree, args.taskId);
            if (!task.worktree) throw new Error(`Task ${args.taskId} has no worktree metadata.`);
            const expectedBase = task.worktree.baseBranch;
            const activeBranch = currentBranch(context.worktree);
            if (activeBranch !== expectedBase) {
              throw new Error(`Lead must run integration from ${expectedBase}; current branch is ${activeBranch}`);
            }

            const commits = args.commits?.length
              ? args.commits
              : git(context.worktree, ["rev-list", "--reverse", `${expectedBase}..${task.worktree.branch}`]).split("\n").filter(Boolean);

            if (commits.length === 0) throw new Error(`No commits to integrate from ${task.worktree.branch}`);

            const integrated: string[] = [];
            for (const commit of commits) {
              try {
                git(context.worktree, ["cherry-pick", commit]);
                integrated.push(commit);
              } catch (error) {
                try { git(context.worktree, ["cherry-pick", "--abort"]); } catch { }
                task.worktree.status = "failed";
                task.worktree.lastError = `Cherry-pick failed at ${commit}: ${error instanceof Error ? error.message : String(error)}`;
                saveTask(context.worktree, task);
                return [
                  `❌ Integration failed for ${args.taskId}`,
                  `Failed commit: ${commit}`,
                  `Conflict policy: lead must not resolve silently. Reopen/block the task and send it back to the developer with this failure.`,
                ].join("\n");
              }
            }

            task.worktree.status = "integrated";
            task.worktree.integratedCommits = [...(task.worktree.integratedCommits || []), ...integrated];
            saveTask(context.worktree, task);

            return [
              `✅ Integrated ${args.taskId}`,
              `Cherry-picked commits: ${integrated.join(", ")}`,
              args.runCommand ? `Post-integration verification to run: ${args.runCommand}` : "Post-integration verification: run the affected project test/build command before marking done.",
            ].join("\n");
          } catch (error) {
            return `❌ worktree_integrate_task failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      worktree_cleanup_task: tool({
        description:
          "Remove an integrated task worktree through the OpenCode worktree API and mark the Kanban task worktree metadata as cleanup.",
        args: {
          taskId: tool.schema.string().describe("Kanban task ID"),
          force: tool.schema.boolean().optional().describe("Allow cleanup even if the worktree is not marked integrated."),
        },
        async execute(args, context) {
          try {
            const task = loadTask(context.worktree, args.taskId);
            if (!task.worktree) throw new Error(`Task ${args.taskId} has no worktree metadata.`);
            if (task.worktree.status !== "integrated" && !args.force) {
              throw new Error(`Refusing cleanup while worktree status is ${task.worktree.status}. Pass force only after explicit lead decision.`);
            }

            await apiRequest<any>("DELETE", "/experimental/worktree", { directory: context.directory }, { directory: task.worktree.directory });

            task.worktree.status = "cleanup";
            saveTask(context.worktree, task);

            return [
              `✅ Cleaned up worktree for ${args.taskId}`,
              `Directory removed: ${task.worktree.directory}`,
              `Branch removed by OpenCode worktree API: ${task.worktree.branch}`,
            ].join("\n");
          } catch (error) {
            return `❌ worktree_cleanup_task failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),
    },

    event: async ({ event }) => {
      const anyEvent = event as any;
      if (anyEvent.type === "worktree.failed") {
        client.app.log({
          body: {
            service: "worktree-manager",
            level: "error",
            message: anyEvent.properties?.message || "Worktree creation failed",
          },
        });
      }
    },
  };
};

export default WorktreeManagerPlugin;
