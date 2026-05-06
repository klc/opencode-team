import { tool } from "@opencode-ai/plugin";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

/**
 * debt-summary — reads all debt records from .memory/debt/ and returns
 * a prioritized backlog grouped by priority and status.
 *
 * Used by project-manager during sprint planning and standup.
 *
 * Usage:
 *   debt_summary({})
 *   debt_summary({ status: "open", owner: "@backend-lead" })
 *   debt_summary({ priority: "high" })
 */
export default tool({
  description:
    "Return a prioritized technical debt backlog from .memory/debt/. " +
    "Groups debt items by priority (high/medium/low) and filters by status or owner. " +
    "Used during sprint planning and standups to surface actionable debt. " +
    "Returns effort estimates, owners, risk summaries, and acceptance criteria.",
  args: {
    status: tool.schema
      .enum(["open", "in-progress", "resolved", "all"])
      .optional()
      .describe("Filter by debt status. Defaults to showing open and in-progress items."),
    priority: tool.schema
      .enum(["high", "medium", "low", "all"])
      .optional()
      .describe("Filter by priority level. Defaults to 'all'."),
    owner: tool.schema
      .string()
      .optional()
      .describe(
        "Filter by owner agent, e.g. '@backend-lead' or '@frontend-lead'. Defaults to all owners."
      ),
  },

  async execute(args, context) {
    const debtDir = join(context.worktree, ".memory", "debt");

    if (!existsSync(debtDir)) {
      return "No .memory/debt/ directory found. No technical debt has been recorded yet.";
    }

    const files = readdirSync(debtDir).filter((f) => f.endsWith(".md"));

    if (files.length === 0) {
      return "✅ No technical debt records found. The debt backlog is clean.";
    }

    // Parse each debt file
    interface DebtRecord {
      file: string;
      title: string;
      priority: string;
      status: string;
      owner: string;
      effort: string;
      relatedFeature: string;
      summary: string;
      risk: string;
      acceptanceCriteria: string[];
      date: string;
    }

    const records: DebtRecord[] = [];

    for (const file of files) {
      const filePath = join(debtDir, file);
      let content: string;
      try {
        content = readFileSync(filePath, "utf8");
      } catch {
        continue;
      }

      const extract = (pattern: RegExp, fallback = "unknown") => {
        const m = content.match(pattern);
        return m ? m[1].trim() : fallback;
      };

      const title = extract(/^#\s+(.+)$/m, file.replace(".md", ""));
      const priority = extract(/\*\*Priority:\*\*\s*(.+)/i, "unknown").toLowerCase();
      const status = extract(/\*\*Status:\*\*\s*(.+)/i, "unknown").toLowerCase();
      const owner = extract(/\*\*Owner:\*\*\s*(.+)/i, "unknown");
      const effort = extract(/\*\*Effort:\*\*\s*(.+)/i, "?");
      const relatedFeature = extract(/\*\*Related feature:\*\*\s*(.+)/i, "");
      const date = extract(/\*\*Date:\*\*\s*(.+)/i, "");

      // Extract summary section
      const summaryMatch = content.match(/##\s+Summary\s*\n([\s\S]*?)(?=\n##|\n---|$)/);
      const summary = summaryMatch ? summaryMatch[1].trim() : "";

      // Extract risk
      const riskMatch = content.match(/###\s+Risk\s*\n([\s\S]*?)(?=\n###|\n##|\n---|$)/);
      const risk = riskMatch ? riskMatch[1].trim().slice(0, 200) : "";

      // Extract acceptance criteria
      const criteriaMatches = content.match(/- \[ \] (.+)/g) ?? [];
      const acceptanceCriteria = criteriaMatches.map((c) =>
        c.replace(/- \[ \] /, "").trim()
      );

      records.push({
        file,
        title,
        priority,
        status,
        owner,
        effort,
        relatedFeature,
        summary,
        risk,
        acceptanceCriteria,
        date,
      });
    }

    // Apply filters
    const statusFilter = args.status ?? "open-and-in-progress";
    const priorityFilter = args.priority ?? "all";
    const ownerFilter = args.owner?.toLowerCase() ?? "all";

    const filtered = records.filter((r) => {
      if (statusFilter === "open-and-in-progress") {
        if (r.status !== "open" && r.status !== "in-progress") return false;
      } else if (statusFilter !== "all") {
        if (r.status !== statusFilter) return false;
      }

      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;

      if (ownerFilter !== "all" && !r.owner.toLowerCase().includes(ownerFilter.replace("@", "")))
        return false;

      return true;
    });

    if (filtered.length === 0) {
      return `No debt records match the given filters (status: ${statusFilter}, priority: ${priorityFilter}, owner: ${args.owner ?? "all"}).`;
    }

    // Group by priority
    const high = filtered.filter((r) => r.priority === "high");
    const medium = filtered.filter((r) => r.priority === "medium");
    const low = filtered.filter((r) => r.priority === "low");
    const unknown = filtered.filter((r) => !["high", "medium", "low"].includes(r.priority));

    const formatRecord = (r: DebtRecord): string[] => {
      const lines: string[] = [];
      const statusIcon = r.status === "in-progress" ? "⟳" : r.status === "resolved" ? "✅" : "○";
      lines.push(`### ${statusIcon} ${r.title}`);
      lines.push(`**File:** .memory/debt/${r.file}`);
      lines.push(`**Owner:** ${r.owner} | **Effort:** ${r.effort} | **Status:** ${r.status}`);
      if (r.relatedFeature) lines.push(`**Related feature:** ${r.relatedFeature}`);
      if (r.date) lines.push(`**Recorded:** ${r.date}`);
      if (r.summary) {
        lines.push(``);
        lines.push(r.summary);
      }
      if (r.risk) {
        lines.push(``);
        lines.push(`**Risk:** ${r.risk}`);
      }
      if (r.acceptanceCriteria.length > 0) {
        lines.push(``);
        lines.push(`**Done when:**`);
        for (const c of r.acceptanceCriteria) {
          lines.push(`- [ ] ${c}`);
        }
      }
      return lines;
    };

    const output: string[] = [
      `# Technical Debt Backlog`,
      ``,
      `**Total matching:** ${filtered.length} | **High:** ${high.length} | **Medium:** ${medium.length} | **Low:** ${low.length}`,
      `**Filters:** status=${statusFilter}, priority=${priorityFilter}, owner=${args.owner ?? "all"}`,
      ``,
    ];

    if (high.length > 0) {
      output.push(`## 🔴 High Priority (${high.length})`);
      output.push(``);
      for (const r of high) {
        output.push(...formatRecord(r));
        output.push(``);
      }
    }

    if (medium.length > 0) {
      output.push(`## 🟡 Medium Priority (${medium.length})`);
      output.push(``);
      for (const r of medium) {
        output.push(...formatRecord(r));
        output.push(``);
      }
    }

    if (low.length > 0) {
      output.push(`## 🟢 Low Priority (${low.length})`);
      output.push(``);
      for (const r of low) {
        output.push(...formatRecord(r));
        output.push(``);
      }
    }

    if (unknown.length > 0) {
      output.push(`## ❓ Unknown Priority (${unknown.length})`);
      output.push(``);
      for (const r of unknown) {
        output.push(...formatRecord(r));
        output.push(``);
      }
    }

    // Sprint planning suggestion
    const smallEffort = filtered.filter((r) => r.effort?.trim() === "S" && r.status === "open");
    if (smallEffort.length > 0) {
      output.push(`---`);
      output.push(`## ⚡ Quick Wins (Effort: S, Status: open)`);
      output.push(``);
      output.push(`These ${smallEffort.length} item(s) can be resolved in < 2 hours each:`);
      for (const r of smallEffort) {
        output.push(`- **${r.title}** | owner: ${r.owner} | priority: ${r.priority}`);
      }
    }

    return output.join("\n");
  },
});
