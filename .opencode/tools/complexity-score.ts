import { tool } from "@opencode-ai/plugin";
import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { join, extname, relative } from "path";

/**
 * complexity-score — estimates cyclomatic complexity of source files.
 *
 * Works by counting branching keywords (if, else, for, while, switch, case,
 * catch, &&, ||, ternary). Not a perfect AST analysis but good enough to
 * surface hotspots without any build tool dependencies.
 *
 * Usage by agents:
 *   complexity_score({ path: "app/Services/OrderService.php" })
 *   complexity_score({ path: "app/Services/", threshold: 15 })
 */
export default tool({
  description:
    "Estimate cyclomatic complexity of a source file or directory. " +
    "Returns a complexity score per function/method and highlights hotspots above the threshold. " +
    "Useful for code-reviewer and performance-analyst to identify overly complex code. " +
    "Supports PHP, TypeScript, JavaScript, Python, Go, Ruby.",
  args: {
    path: tool.schema
      .string()
      .describe(
        "Path to a file or directory to analyze, relative to the project root"
      ),
    threshold: tool.schema
      .number()
      .optional()
      .describe(
        "Complexity score above which a function is flagged as a hotspot. Defaults to 10 (per coding-standards skill)."
      ),
    top: tool.schema
      .number()
      .optional()
      .describe(
        "For directory scans, return only the top N most complex files. Defaults to 10."
      ),
  },

  async execute(args, context) {
    const threshold = args.threshold ?? 10;
    const top = args.top ?? 10;
    const targetPath = join(context.worktree, args.path);

    if (!existsSync(targetPath)) {
      return `Path not found: ${args.path}`;
    }

    const stat = statSync(targetPath);

    if (stat.isFile()) {
      return analyzeFile(targetPath, args.path, threshold);
    }

    // Directory scan
    const files = collectSourceFiles(targetPath);
    if (files.length === 0) {
      return `No supported source files found in: ${args.path}`;
    }

    interface FileResult {
      relPath: string;
      maxComplexity: number;
      hotspots: number;
      report: string;
    }

    const results: FileResult[] = [];
    for (const file of files) {
      const relPath = relative(context.worktree, file);
      const analysis = analyzeFileRaw(file, threshold);
      if (analysis.functions.length > 0) {
        const maxComplexity = Math.max(...analysis.functions.map((f) => f.score));
        const hotspots = analysis.functions.filter((f) => f.score >= threshold).length;
        results.push({ relPath, maxComplexity, hotspots, report: "" });
      }
    }

    results.sort((a, b) => b.maxComplexity - a.maxComplexity);
    const topFiles = results.slice(0, top);

    const lines: string[] = [
      `# Complexity Analysis: ${args.path}`,
      ``,
      `**Files scanned:** ${files.length}`,
      `**Hotspot threshold:** ${threshold}`,
      `**Files with hotspots:** ${results.filter((r) => r.hotspots > 0).length}`,
      ``,
      `## Top ${topFiles.length} Most Complex Files`,
      ``,
      `| File | Max complexity | Hotspots |`,
      `|------|---------------|----------|`,
    ];

    for (const r of topFiles) {
      const flag = r.maxComplexity >= threshold ? " 🔴" : r.maxComplexity >= threshold * 0.7 ? " 🟡" : "";
      lines.push(`| ${r.relPath} | ${r.maxComplexity}${flag} | ${r.hotspots} |`);
    }

    if (results.filter((r) => r.hotspots > 0).length === 0) {
      lines.push(``, `✅ No functions exceed the complexity threshold of ${threshold}.`);
    } else {
      lines.push(
        ``,
        `## Recommendations`,
        ``,
        `Functions with complexity ≥ ${threshold} should be refactored via \`/team:refactor\`.`,
        `Run with a specific file path to see detailed per-function breakdown.`
      );
    }

    return lines.join("\n");
  },
});

// ── Helpers ──────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx",
  ".php", ".py", ".go", ".rb",
]);

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const SKIP_DIRS = new Set(["node_modules", "vendor", ".git", "dist", "build", ".opencode", "coverage"]);

  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(d, entry.name));
      } else if (SUPPORTED_EXTENSIONS.has(extname(entry.name))) {
        results.push(join(d, entry.name));
      }
    }
  }
  walk(dir);
  return results;
}

interface FunctionAnalysis {
  name: string;
  line: number;
  score: number;
}

interface FileAnalysis {
  functions: FunctionAnalysis[];
  fileScore: number;
}

function analyzeFileRaw(filePath: string, threshold: number): FileAnalysis {
  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    return { functions: [], fileScore: 0 };
  }

  const ext = extname(filePath);
  const lines = source.split("\n");

  // Regex patterns for function/method definitions per language
  const funcPatterns: Record<string, RegExp> = {
    ".ts":  /(?:function\s+(\w+)|(?:async\s+)?(\w+)\s*[=:]\s*(?:async\s+)?\(|(?:public|private|protected|static|async)\s+(?:async\s+)?(\w+)\s*\()/,
    ".tsx": /(?:function\s+(\w+)|(?:async\s+)?(\w+)\s*[=:]\s*(?:async\s+)?\(|(?:public|private|protected|static|async)\s+(?:async\s+)?(\w+)\s*\()/,
    ".js":  /(?:function\s+(\w+)|(?:async\s+)?(\w+)\s*[=:]\s*(?:async\s+)?\()/,
    ".jsx": /(?:function\s+(\w+)|(?:async\s+)?(\w+)\s*[=:]\s*(?:async\s+)?\()/,
    ".php": /(?:function\s+(\w+)|public\s+(?:static\s+)?function\s+(\w+)|private\s+(?:static\s+)?function\s+(\w+)|protected\s+(?:static\s+)?function\s+(\w+))/,
    ".py":  /def\s+(\w+)\s*\(/,
    ".go":  /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/,
    ".rb":  /def\s+(\w+)/,
  };

  const funcPattern = funcPatterns[ext] ?? funcPatterns[".js"];

  // Branching keywords that increase complexity
  const branchKeywords = [
    /\bif\b/, /\belse\b/, /\belif\b/, /\belse\s+if\b/,
    /\bfor\b/, /\bforeach\b/, /\bwhile\b/, /\bdo\b/,
    /\bswitch\b/, /\bcase\b/, /\bcatch\b/, /\bexcept\b/,
    /\?\?/, /\?\s*:/, /&&/, /\|\|/,
  ];

  const functions: FunctionAnalysis[] = [];
  let currentFunc: { name: string; line: number; score: number } | null = null;
  let braceDepth = 0;
  let funcBraceStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function start
    const funcMatch = line.match(funcPattern);
    if (funcMatch && !currentFunc) {
      const name = funcMatch[1] ?? funcMatch[2] ?? funcMatch[3] ?? "anonymous";
      currentFunc = { name, line: i + 1, score: 1 }; // Base complexity = 1
      funcBraceStart = braceDepth;
    }

    if (currentFunc) {
      // Count branching keywords
      for (const kw of branchKeywords) {
        const matches = line.match(new RegExp(kw.source, "g"));
        if (matches) currentFunc.score += matches.length;
      }

      // Track brace depth to know when function ends (JS/TS/PHP/Go/Java style)
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") {
          braceDepth--;
          if (braceDepth <= funcBraceStart && currentFunc) {
            functions.push({ ...currentFunc });
            currentFunc = null;
          }
        }
      }

      // Python / Ruby: detect next def as end of previous
      if ((ext === ".py" || ext === ".rb") && i > 0) {
        const nextLine = lines[i + 1] ?? "";
        if (nextLine.match(funcPattern)) {
          if (currentFunc) {
            functions.push({ ...currentFunc });
            currentFunc = null;
          }
        }
      }
    } else {
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth = Math.max(0, braceDepth - 1);
      }
    }
  }

  // Flush last function
  if (currentFunc) functions.push(currentFunc);

  const fileScore = functions.length > 0 ? Math.max(...functions.map((f) => f.score)) : 0;
  return { functions, fileScore };
}

function analyzeFile(filePath: string, displayPath: string, threshold: number): string {
  const analysis = analyzeFileRaw(filePath, threshold);

  if (analysis.functions.length === 0) {
    return `No functions detected in: ${displayPath}\n\nFile may use a pattern not recognized by this tool, or may be empty.`;
  }

  analysis.functions.sort((a, b) => b.score - a.score);

  const hotspots = analysis.functions.filter((f) => f.score >= threshold);
  const warnings = analysis.functions.filter((f) => f.score >= threshold * 0.7 && f.score < threshold);

  const lines: string[] = [
    `# Complexity Analysis: ${displayPath}`,
    ``,
    `**Functions analyzed:** ${analysis.functions.length}`,
    `**Hotspot threshold:** ${threshold}`,
    `**Hotspots (≥${threshold}):** ${hotspots.length}`,
    `**Warnings (≥${Math.round(threshold * 0.7)}):** ${warnings.length}`,
    ``,
    `## Function Breakdown`,
    ``,
    `| Function | Line | Complexity | Status |`,
    `|----------|------|-----------|--------|`,
  ];

  for (const fn of analysis.functions) {
    let status = "✅ OK";
    if (fn.score >= threshold) status = "🔴 Hotspot — refactor";
    else if (fn.score >= threshold * 0.7) status = "🟡 Warning";
    lines.push(`| \`${fn.name}\` | ${fn.line} | ${fn.score} | ${status} |`);
  }

  if (hotspots.length > 0) {
    lines.push(
      ``,
      `## Recommendation`,
      ``,
      `**${hotspots.length} function(s) exceed the complexity threshold of ${threshold}.**`,
      ``,
      `These should be refactored. Use \`/team:refactor\` with the specific function names above.`,
      `Each hotspot function should be broken into smaller, single-responsibility functions.`
    );
  } else if (warnings.length > 0) {
    lines.push(
      ``,
      `## Note`,
      ``,
      `No hotspots found, but ${warnings.length} function(s) are approaching the threshold.`,
      `Consider simplifying them proactively.`
    );
  } else {
    lines.push(``, `✅ All functions are within acceptable complexity limits.`);
  }

  return lines.join("\n");
}
