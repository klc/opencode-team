import { tool } from "@opencode-ai/plugin";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

/**
 * stack-detect — scans the project root and returns a structured summary
 * of the detected tech stack without requiring bash commands.
 *
 * Used by /team:init (architect agent) to auto-populate the project-stack skill.
 * Much faster than running multiple bash commands sequentially.
 *
 * Usage:
 *   stack_detect({})
 *   stack_detect({ verbose: true })
 */
export default tool({
  description:
    "Auto-detect the project's tech stack by scanning dependency files and configuration. " +
    "Returns detected backend language/framework, frontend framework, databases, test tools, " +
    "build commands, and runtime constraints. " +
    "Used by the architect agent during /team:init to generate the project-stack skill faster.",
  args: {
    verbose: tool.schema
      .boolean()
      .optional()
      .describe(
        "If true, include raw detected values and confidence levels. Defaults to false."
      ),
  },

  async execute(args, context) {
    const root = context.worktree;
    const verbose = args.verbose ?? false;

    const read = (path: string): string | null => {
      const full = join(root, path);
      if (!existsSync(full)) return null;
      try {
        return readFileSync(full, "utf8");
      } catch {
        return null;
      }
    };

    const readJson = (path: string): Record<string, unknown> | null => {
      const content = read(path);
      if (!content) return null;
      try {
        return JSON.parse(content);
      } catch {
        return null;
      }
    };

    const ls = (path: string): string[] => {
      const full = join(root, path);
      if (!existsSync(full)) return [];
      try {
        return readdirSync(full);
      } catch {
        return [];
      }
    };

    // ── Collect raw file data ──────────────────────────────
    const packageJson = readJson("package.json") as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
      name?: string;
    } | null;

    const composerJson = readJson("composer.json") as {
      require?: Record<string, string>;
      "require-dev"?: Record<string, string>;
      scripts?: Record<string, string>;
    } | null;

    const pyprojectToml = read("pyproject.toml");
    const requirementsTxt = read("requirements.txt");
    const goMod = read("go.mod");
    const cargoToml = read("Cargo.toml");
    const gemfile = read("Gemfile");
    const envExample = read(".env.example") ?? read(".env.sample") ?? read(".env");
    const dockerCompose = read("docker-compose.yml") ?? read("docker-compose.yaml");
    const tsconfig = read("tsconfig.json");
    const viteConfig = read("vite.config.ts") ?? read("vite.config.js");
    const rootFiles = ls(".");

    const allDeps = {
      ...((packageJson?.dependencies as Record<string, string>) ?? {}),
      ...((packageJson?.devDependencies as Record<string, string>) ?? {}),
    };
    const composerDeps = {
      ...((composerJson?.require as Record<string, string>) ?? {}),
      ...((composerJson?.["require-dev"] as Record<string, string>) ?? {}),
    };
    const scripts: Record<string, string> = (packageJson?.scripts as Record<string, string>) ?? {};

    // ── Detection logic ────────────────────────────────────
    interface Detection {
      value: string;
      confidence: "high" | "medium" | "low";
      source: string;
    }

    const detect = (
      value: string,
      confidence: "high" | "medium" | "low",
      source: string
    ): Detection => ({ value, confidence, source });

    // Backend language
    let backend: Detection | null = null;
    let backendFramework: Detection | null = null;

    if (composerJson) {
      backend = detect("PHP", "high", "composer.json");
      if (composerDeps["laravel/framework"]) {
        const version = composerDeps["laravel/framework"].replace(/[^0-9.]/g, "").split(".")[0];
        backendFramework = detect(`Laravel ${version}`, "high", "composer.json");
      } else if (composerDeps["symfony/symfony"] || composerDeps["symfony/framework-bundle"]) {
        backendFramework = detect("Symfony", "high", "composer.json");
      } else if (composerDeps["slim/slim"]) {
        backendFramework = detect("Slim", "high", "composer.json");
      }
    } else if (goMod) {
      backend = detect("Go", "high", "go.mod");
      if (goMod.includes("github.com/gin-gonic/gin")) backendFramework = detect("Gin", "high", "go.mod");
      else if (goMod.includes("github.com/labstack/echo")) backendFramework = detect("Echo", "high", "go.mod");
      else if (goMod.includes("github.com/gofiber/fiber")) backendFramework = detect("Fiber", "high", "go.mod");
    } else if (pyprojectToml || requirementsTxt) {
      backend = detect("Python", "high", pyprojectToml ? "pyproject.toml" : "requirements.txt");
      const deps = pyprojectToml ?? requirementsTxt ?? "";
      if (deps.includes("django")) backendFramework = detect("Django", "high", "deps");
      else if (deps.includes("fastapi")) backendFramework = detect("FastAPI", "high", "deps");
      else if (deps.includes("flask")) backendFramework = detect("Flask", "high", "deps");
    } else if (gemfile) {
      backend = detect("Ruby", "high", "Gemfile");
      if (gemfile.includes("rails")) backendFramework = detect("Rails", "high", "Gemfile");
    } else if (allDeps["express"] || allDeps["fastify"] || allDeps["@nestjs/core"]) {
      backend = detect("Node.js", "high", "package.json");
      if (allDeps["@nestjs/core"]) backendFramework = detect("NestJS", "high", "package.json");
      else if (allDeps["fastify"]) backendFramework = detect("Fastify", "high", "package.json");
      else if (allDeps["express"]) backendFramework = detect("Express", "high", "package.json");
    } else if (cargoToml) {
      backend = detect("Rust", "high", "Cargo.toml");
    }

    // Runtime
    let runtime: Detection | null = null;
    if (composerDeps["laravel/octane"]) {
      const driver = dockerCompose?.includes("swoole") ? "Swoole" : "RoadRunner";
      runtime = detect(`Laravel Octane (${driver}) — persistent workers, no FPM lifecycle`, "high", "composer.json + docker");
    } else if (goMod || cargoToml) {
      runtime = detect("Long-lived process — static state persists between requests", "medium", "language");
    }

    // Frontend framework
    let frontendFramework: Detection | null = null;
    let metaFramework: Detection | null = null;
    let styling: Detection | null = null;
    let buildTool: Detection | null = null;
    let ssr: Detection | null = null;

    if (allDeps["vue"] || allDeps["@vue/core"]) {
      const version = (allDeps["vue"] ?? "").replace(/[^0-9]/g, "")[0] ?? "3";
      frontendFramework = detect(`Vue ${version}`, "high", "package.json");
      if (allDeps["@inertiajs/vue3"] || allDeps["@inertiajs/vue"]) {
        metaFramework = detect("Inertia.js", "high", "package.json");
        ssr = detect("Enabled (Inertia SSR) — browser APIs unavailable during SSR render", "high", "package.json");
      } else if (allDeps["nuxt"]) {
        metaFramework = detect("Nuxt", "high", "package.json");
        ssr = detect("Enabled (Nuxt SSR)", "high", "package.json");
      }
    } else if (allDeps["react"] || allDeps["react-dom"]) {
      frontendFramework = detect("React", "high", "package.json");
      if (allDeps["next"]) {
        metaFramework = detect("Next.js", "high", "package.json");
        ssr = detect("Enabled (Next.js) — use getServerSideProps / server components carefully", "high", "package.json");
      } else if (allDeps["@inertiajs/react"]) {
        metaFramework = detect("Inertia.js", "high", "package.json");
        ssr = detect("Enabled (Inertia SSR) — browser APIs unavailable during SSR render", "high", "package.json");
      }
    } else if (allDeps["svelte"] || allDeps["@sveltejs/kit"]) {
      frontendFramework = detect("Svelte", "high", "package.json");
      if (allDeps["@sveltejs/kit"]) {
        metaFramework = detect("SvelteKit", "high", "package.json");
        ssr = detect("Enabled (SvelteKit)", "high", "package.json");
      }
    }

    if (allDeps["tailwindcss"]) {
      const v = (allDeps["tailwindcss"] ?? "").replace(/[^0-9]/g, "")[0] ?? "3";
      styling = detect(`Tailwind CSS v${v}`, "high", "package.json");
    } else if (allDeps["@emotion/react"] || allDeps["styled-components"]) {
      styling = detect("CSS-in-JS", "high", "package.json");
    } else if (allDeps["sass"] || allDeps["scss"]) {
      styling = detect("SCSS/Sass", "high", "package.json");
    }

    if (viteConfig) {
      buildTool = detect("Vite", "high", "vite.config.*");
    } else if (allDeps["webpack"]) {
      buildTool = detect("Webpack", "high", "package.json");
    } else if (allDeps["turbopack"] || allDeps["next"]) {
      buildTool = detect("Turbopack / Next.js", "medium", "package.json");
    }

    // Databases
    const databases: string[] = [];
    const allDepStr = Object.keys(allDeps).join(" ") + Object.keys(composerDeps).join(" ");
    const envStr = envExample ?? "";

    if (allDepStr.includes("mysql") || envStr.match(/mysql|DB_CONNECTION.*mysql/i)) databases.push("MySQL");
    if (allDepStr.includes("postgres") || envStr.match(/postgres|pgsql/i)) databases.push("PostgreSQL");
    if (allDepStr.includes("mongodb") || allDepStr.includes("mongoose")) databases.push("MongoDB");
    if (allDepStr.includes("sqlite") || envStr.includes("sqlite")) databases.push("SQLite");
    if (allDepStr.includes("redis") || envStr.includes("REDIS")) databases.push("Redis (cache/queue)");
    if (allDepStr.includes("clickhouse") || envStr.includes("CLICKHOUSE")) databases.push("ClickHouse (analytics)");
    if (allDepStr.includes("elasticsearch")) databases.push("Elasticsearch");

    // Test frameworks
    const testFrameworks: string[] = [];
    const testCommands: string[] = [];

    if (composerDeps["pestphp/pest"] || composerDeps["phpunit/phpunit"]) {
      testFrameworks.push(composerDeps["pestphp/pest"] ? "Pest PHP" : "PHPUnit");
      testCommands.push("php artisan test");
    }
    if (allDeps["vitest"]) {
      testFrameworks.push("Vitest");
      testCommands.push(scripts["test"] ?? "npm run test");
    }
    if (allDeps["jest"] || allDeps["@jest/core"]) {
      testFrameworks.push("Jest");
      testCommands.push(scripts["test"] ?? "npm test");
    }
    if (allDeps["@playwright/test"] || allDeps["playwright"]) {
      testFrameworks.push("Playwright (E2E)");
      testCommands.push("npx playwright test");
    }
    if (pyprojectToml?.includes("pytest") || requirementsTxt?.includes("pytest")) {
      testFrameworks.push("pytest");
      testCommands.push("pytest");
    }

    // Dev commands
    const devCommands: string[] = [];
    if (scripts["dev"]) devCommands.push(`npm run dev`);
    if (scripts["start"]) devCommands.push(`npm start`);
    if (composerDeps["laravel/octane"]) devCommands.push("php artisan octane:start --watch");
    if (composerDeps["laravel/framework"]) devCommands.push("php artisan serve");

    const buildCommands: string[] = [];
    if (scripts["build"]) buildCommands.push(`npm run build`);

    // Docker
    const hasDocker = existsSync(join(root, "docker-compose.yml")) || existsSync(join(root, "docker-compose.yaml"));
    const hasDockerfile = existsSync(join(root, "Dockerfile"));

    // CI/CD
    const githubWorkflows = ls(".github/workflows");
    const hasGithubActions = githubWorkflows.length > 0;
    const hasGitlabCI = existsSync(join(root, ".gitlab-ci.yml"));

    // ── Format output ──────────────────────────────────────
    const lines: string[] = [
      `# Stack Detection Report`,
      ``,
      `> Generated by stack-detect tool — use this to populate the project-stack skill.`,
      ``,
    ];

    lines.push(`## Backend`);
    lines.push(`- **Language:** ${backend?.value ?? "Not detected"}`);
    if (backendFramework) lines.push(`- **Framework:** ${backendFramework.value}`);
    if (runtime) lines.push(`- **Runtime:** ${runtime.value}`);
    lines.push(``);

    if (frontendFramework) {
      lines.push(`## Frontend`);
      lines.push(`- **Framework:** ${frontendFramework.value}`);
      if (metaFramework) lines.push(`- **Meta-framework:** ${metaFramework.value}`);
      if (styling) lines.push(`- **Styling:** ${styling.value}`);
      if (buildTool) lines.push(`- **Build tool:** ${buildTool.value}`);
      if (ssr) lines.push(`- **SSR:** ${ssr.value}`);
      if (tsconfig) lines.push(`- **TypeScript:** Yes`);
      lines.push(``);
    }

    if (databases.length > 0) {
      lines.push(`## Databases`);
      for (const db of databases) lines.push(`- ${db}`);
      lines.push(``);
    }

    if (testFrameworks.length > 0) {
      lines.push(`## Testing`);
      lines.push(`- **Frameworks:** ${testFrameworks.join(", ")}`);
      lines.push(`- **Test commands:**`);
      for (const cmd of testCommands) lines.push(`  - \`${cmd}\``);
      lines.push(``);
    }

    if (devCommands.length > 0 || buildCommands.length > 0) {
      lines.push(`## Dev & Build Commands`);
      if (devCommands.length > 0) {
        lines.push(`- **Dev server:**`);
        for (const cmd of devCommands) lines.push(`  - \`${cmd}\``);
      }
      if (buildCommands.length > 0) {
        lines.push(`- **Build:**`);
        for (const cmd of buildCommands) lines.push(`  - \`${cmd}\``);
      }
      lines.push(``);
    }

    lines.push(`## Infrastructure`);
    lines.push(`- **Docker:** ${hasDocker ? "Yes (docker-compose)" : hasDockerfile ? "Yes (Dockerfile only)" : "Not detected"}`);
    lines.push(`- **CI/CD:** ${hasGithubActions ? `GitHub Actions (${githubWorkflows.length} workflows)` : hasGitlabCI ? "GitLab CI" : "Not detected"}`);
    lines.push(``);

    // Runtime constraints
    const constraints: string[] = [];
    if (runtime?.value.includes("Octane")) {
      constraints.push("Never use `static` properties to store request-scoped data — workers are persistent");
      constraints.push("Never mutate singleton state — use `app()->scoped()` for request-scoped bindings");
      constraints.push("Always close file handles and custom DB connections in `finally` blocks");
      constraints.push("ClickHouse client: use a fresh instance per request or verified pool");
    }
    if (ssr?.value.includes("Inertia") || ssr?.value.includes("Next") || ssr?.value.includes("Nuxt")) {
      constraints.push("SSR: never access `window`, `document`, or `localStorage` at component setup — defer to `onMounted()`");
      constraints.push("SSR: use `useSSRContext()` or framework-specific server helpers for server-side data");
    }

    if (constraints.length > 0) {
      lines.push(`## Detected Runtime Constraints`);
      lines.push(`> These must be added to the project-stack skill Critical Runtime Constraints section.`);
      lines.push(``);
      for (const c of constraints) lines.push(`- ${c}`);
      lines.push(``);
    }

    // Gaps — things that need manual input
    const gaps: string[] = [];
    if (!backend) gaps.push("Backend language (no composer.json, go.mod, package.json backend deps, pyproject.toml, or Gemfile detected)");
    if (!backendFramework && backend) gaps.push("Backend framework (language detected but no recognized framework found)");
    if (!frontendFramework && packageJson) gaps.push("Frontend framework (package.json found but no recognized UI framework)");
    if (databases.length === 0) gaps.push("Database (check .env.example or docker-compose for DB config)");
    if (testFrameworks.length === 0) gaps.push("Test framework and test commands");

    if (gaps.length > 0) {
      lines.push(`## ⚠️ Gaps — Manual Input Required`);
      lines.push(`These could not be detected automatically:`);
      lines.push(``);
      for (const g of gaps) lines.push(`- ${g}`);
      lines.push(``);
    }

    if (verbose) {
      lines.push(`---`);
      lines.push(`## Raw Detection Details`);
      lines.push(``);
      const detections = { backend, backendFramework, runtime, frontendFramework, metaFramework, styling, buildTool, ssr };
      for (const [key, val] of Object.entries(detections)) {
        if (val) lines.push(`- **${key}:** ${val.value} (confidence: ${val.confidence}, source: ${val.source})`);
      }
    }

    return lines.join("\n");
  },
});
