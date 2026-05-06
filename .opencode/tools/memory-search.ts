import { tool } from "@opencode-ai/plugin";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

/**
 * memory-search — semantic search over the team's .memory/ directory.
 *
 * Agents call this instead of manually catting every file.
 * Returns the most relevant memory records for a given query.
 *
 * Usage by agents:
 *   memory_search({ query: "authentication JWT", limit: 5 })
 *   memory_search({ query: "debt backend", category: "debt", limit: 10 })
 */
export default tool({
  description:
    "Search the team memory in .memory/ for records relevant to a query. " +
    "Returns matching records with their full content. Use before starting any significant work to find prior decisions, bugs, or research. " +
    "Optional: filter by category (decisions, features, bugs, research, debt).",
  args: {
    query: tool.schema
      .string()
      .describe("Search terms — keywords, topic, component name, or symptom"),
    category: tool.schema
      .enum(["decisions", "features", "bugs", "research", "debt", "all"])
      .optional()
      .describe("Filter to a specific memory category. Defaults to 'all'."),
    limit: tool.schema
      .number()
      .optional()
      .describe("Maximum number of records to return. Defaults to 5."),
  },

  async execute(args, context) {
    const memoryRoot = join(context.worktree, ".memory");

    if (!existsSync(memoryRoot)) {
      return "No .memory/ directory found. Memory has not been initialized yet. Run /team:init to set it up.";
    }

    const category = args.category ?? "all";
    const limit = args.limit ?? 5;
    const queryTerms = args.query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1); // keep 2+ char terms (e.g. "api", "db", "ui")

    if (queryTerms.length === 0) {
      return "Query is too short. Provide at least one keyword with more than 2 characters.";
    }

    // Determine which categories to search
    const categories =
      category === "all"
        ? ["decisions", "features", "bugs", "research", "debt"]
        : [category];

    interface MemoryMatch {
      file: string;
      category: string;
      score: number;
      content: string;
      title: string;
    }

    const matches: MemoryMatch[] = [];

    for (const cat of categories) {
      const catDir = join(memoryRoot, cat);
      if (!existsSync(catDir)) continue;

      const files = readdirSync(catDir).filter((f) => f.endsWith(".md"));

      for (const file of files) {
        const filePath = join(catDir, file);
        let content: string;
        try {
          content = readFileSync(filePath, "utf8");
        } catch {
          continue;
        }

        const contentLower = content.toLowerCase();

        // Score: count how many query terms appear in the file
        // Weight title/summary matches higher than body matches
        let score = 0;
        const lines = contentLower.split("\n");
        const titleLine = lines.find((l) => l.startsWith("# ")) ?? "";
        const summarySection = lines
          .slice(0, 20)
          .join(" "); // First 20 lines = header area

        for (const term of queryTerms) {
          // Title match = 3 points
          if (titleLine.includes(term)) score += 3;
          // Summary/header match = 2 points
          else if (summarySection.includes(term)) score += 2;
          // Body match = 1 point
          else if (contentLower.includes(term)) score += 1;
        }

        if (score > 0) {
          // Extract title from first heading
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : file.replace(".md", "");

          matches.push({ file, category: cat, score, content, title });
        }
      }
    }

    if (matches.length === 0) {
      return `No memory records found matching: "${args.query}"${category !== "all" ? ` in category: ${category}` : ""}.\n\nNo prior context for this topic.`;
    }

    // Sort by score descending, take top N
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, limit);

    // Format output
    const lines: string[] = [
      `📚 Memory search results for: "${args.query}"`,
      `Found ${matches.length} matching record(s), showing top ${topMatches.length}:`,
      "",
    ];

    for (const match of topMatches) {
      lines.push(`---`);
      lines.push(`## ${match.title}`);
      lines.push(`**File:** .memory/${match.category}/${match.file}`);
      lines.push(`**Category:** ${match.category}`);
      lines.push(`**Relevance score:** ${match.score}`);
      lines.push("");

      // Extract and show the Summary section if present
      const summaryMatch = match.content.match(
        /##\s+Summary\s*\n([\s\S]*?)(?=\n##|\n---|\z)/
      );
      if (summaryMatch) {
        lines.push("**Summary:**");
        lines.push(summaryMatch[1].trim());
      } else {
        // Fall back to first 300 chars of content after the title
        const preview = match.content
          .replace(/^#[^\n]+\n/, "")
          .replace(/^\*\*[^\n]+\n/gm, "")
          .trim()
          .slice(0, 300);
        lines.push(preview + (match.content.length > 300 ? "..." : ""));
      }

      // For debt records, also extract priority/status/owner
      if (match.category === "debt") {
        const priorityMatch = match.content.match(/\*\*Priority:\*\*\s*(.+)/);
        const statusMatch = match.content.match(/\*\*Status:\*\*\s*(.+)/);
        const ownerMatch = match.content.match(/\*\*Owner:\*\*\s*(.+)/);
        const effortMatch = match.content.match(/\*\*Effort:\*\*\s*(.+)/);
        if (priorityMatch || statusMatch) {
          lines.push("");
          if (priorityMatch) lines.push(`**Priority:** ${priorityMatch[1].trim()}`);
          if (statusMatch) lines.push(`**Status:** ${statusMatch[1].trim()}`);
          if (ownerMatch) lines.push(`**Owner:** ${ownerMatch[1].trim()}`);
          if (effortMatch) lines.push(`**Effort:** ${effortMatch[1].trim()}`);
        }
      }

      lines.push("");
    }

    if (matches.length > limit) {
      lines.push(
        `*(${matches.length - limit} more records not shown — narrow your query or increase limit)*`
      );
    }

    return lines.join("\n");
  },
});
