# Development Notes

This file documents the design decisions, rationale, and technical discoveries made during the development of this project. It serves as institutional memory for anyone maintaining or extending the team configuration.

---

## Origin

This project was built iteratively through a design session. The initial goal was a multi-agent software development team for a specific Laravel 12 + Octane/Swoole + Inertia SSR project. Over multiple iterations it was generalized into a reusable template applicable to any project.

---

## Key Design Decisions

### 1. Strict Delegation Chain — No Skipping Steps

**Decision:** product-owner → project-manager → leads → developers. Every step is mandatory.

**Why:** Early drafts allowed product-owner to assign directly to developers, and project-manager to bypass leads. This caused two problems:
- Developers received tasks without complexity assessment, so everything went to the same developer regardless of seniority
- The QA and review phases had no coordinator — they got triggered inconsistently or not at all

**Rule enforced:** product-owner never talks to developers. project-manager never talks to developers. Leads are the only ones who assess complexity and assign work.

---

### 2. Leads Own QA and Review — Tester Does Not Trigger Reviewer

**Decision:** Tester reports PASS/FAIL back to the lead. Lead triggers reviewer only after ALL parallel testers pass.

**Why:** An earlier design had tester directly invoke code-reviewer on pass. This broke when multiple parallel testers were running — individual testers would trigger individual reviewers before all scopes finished testing. The result was reviewers approving partial feature states.

**Rule enforced:** Tester → lead (PASS report). Lead → reviewer (when all testers done). Reviewer → lead (verdict). Lead coordinates everything.

---

### 3. Parallel Execution at Every Phase

**Decision:** Leads can spawn unlimited parallel instances of developers, testers, and reviewers.

**Why:** Independent tasks (e.g. "backend API" and "frontend form") have no dependency on each other. Running them sequentially wastes time. The same logic applies to QA — testing the API and testing the frontend component can happen simultaneously.

**How it works:**
- Independent tasks → parallel
- Dependent tasks → sequential (e.g. migration must run before seeder)
- Each parallel scope reports back to its lead independently
- Lead waits for ALL parallel agents to finish before moving to next phase

---

### 4. todowrite / todoread Must Be Explicitly Enabled for Subagents

**Discovery:** OpenCode disables `todowrite` and `todoread` for subagents by default. They must be explicitly set to `true` in the agent's `tools` block in `opencode.json`.

**Impact:** Without this, developer agents could not update the todo board. The lead would never know a task was complete. The fix is in `opencode.json` for every agent that needs todo access.

---

### 5. Git Commit at Every Task Completion — Not at Feature End

**Decision:** Every developer commits when their individual task is complete, not when the whole feature is done.

**Why:** Without per-task commits, the git history becomes a single large commit per feature. This makes bisecting, reverting, and reviewing harder. Task IDs in commit messages (`[T03]`) link the git history to the todo board.

**Commit types:**
- `feat:` — implementation complete
- `fix:` — QA or review failure resolved

**Rule:** Developer commits → marks todo `completed` → reports to lead. Lead does NOT accept a completion report without a commit.

---

### 6. Fix Commits Keep Tasks `in-progress`

**Decision:** When a QA failure is fixed, the task stays `in-progress` in the todo board until the tester re-confirms.

**Why:** Marking a task `completed` before the tester re-runs would give a false signal that the feature is ready. The task only becomes `completed` when the tester passes it.

---

### 7. Critical Decision Protocol — Four Agents Ask the User

**Decision:** Four agents (product-owner, architect, backend-lead, frontend-lead) stop and ask the user before proceeding on certain decision types.

**Why:** Some decisions have consequences that cascade through the entire implementation. If architect chooses the wrong real-time transport (e.g. SSE for a bidirectional chat feature), every developer writes the wrong code. Better to surface this before a single line is written.

**Format rule:** Never a bare question. Always:
1. Why this decision matters
2. Options with trade-offs specific to this project's stack
3. A recommendation
4. A simple A/B/C or "proceed" response expected

**Trigger example:** User says `/team:new-feature live chat`. product-owner asks about scope (1-to-1 vs group?). Architect asks about transport (WebSocket vs SSE). Both ask before any story is written.

---

### 8. Stack Knowledge Lives in a Skill, Not in Agent Prompts

**Decision:** All project-specific knowledge (test commands, folder structure, runtime constraints, naming conventions) lives in `.agents/skills/project-stack/SKILL.md`. Agent prompts reference this skill but contain no stack-specific content themselves.

**Why:** The original design embedded Laravel/Octane/Inertia knowledge directly into agent prompts. This made the team unusable for any other project. By moving all stack knowledge to a skill file:
- Agents are completely generic
- A new project only needs a new `project-stack/SKILL.md`
- The `team:init` command generates this file automatically

**Consequence:** Every agent starts by loading `project-stack` via the skill tool. If this skill doesn't exist, agents will still work but won't know the project's test commands, runtime constraints, or folder structure.

---

### 9. project-stack Consolidates All Stack Skills

**Discovery during Laravel design:** Three separate skills were created — `project-stack`, `octane-patterns`, `inertia-patterns`. This was redundant because agents had to load three skills at startup.

**Decision:** Consolidated into one `project-stack/SKILL.md` that contains everything: stack overview, test commands, runtime constraints (Octane rules), SSR rules (Inertia), architecture patterns, naming conventions.

**Rule going forward:** One skill per project. If a stack has many constraints (e.g. Octane's long-lived process rules), those constraints go in the `Critical Runtime Constraints` section of `project-stack`, not in a separate skill.

---

### 10. Provider Names — `zai` vs `zai-coding-plan`

**Discovery:** The Z.AI provider key in `opencode.json` must be `zai-coding-plan`, not `zai`. Using the wrong key causes agents to fail silently when OpenCode can't resolve the model reference.

**Correct config:**
```json
"zai-coding-plan": {
  "npm": "@ai-sdk/anthropic",
  "api": "https://api.z.ai/api/coding/paas/v4",
  "env": ["ZAI_API_KEY"]
}
```

---

### 11. opencode.json Comments Cause Parse Failures in Some Contexts

**Discovery:** The initial `opencode.json` template was written with JS-style `//` comments (JSONC format). OpenCode itself supports JSONC, but Python's `json` module does not. When scripts tried to parse the file to add agents programmatically, they failed.

**Decision:** The template ships as valid JSON (no comments). Explanations live in the README instead.

---

### 12. Command Prefix `team:` Avoids Collision

**Decision:** All commands are prefixed with `team:` (e.g. `team:new-feature`, `team:hotfix`).

**Why:** OpenCode users often have multiple command sets in a project. A command named `new-feature` could collide with commands from other tools or personal configs. The `team:` prefix namespaces all commands from this system.

---

### 13. `team:init` Generates the Project Stack Skill Automatically

**Design:** `team:init` is a 5-phase command:
1. Scans the project (dependency files, config, folder structure, CI, `.env.example`)
2. Identifies gaps that can't be auto-detected (runtime type, architecture pattern, external services)
3. Asks the user targeted questions — max 5, always with assumed answers
4. Writes `.agents/skills/project-stack/SKILL.md`
5. Confirms what was detected, assumed, and skipped

**Why auto-detection matters:** A developer setting up the team on a new project shouldn't need to manually document the stack. The information already exists in `package.json`, `composer.json`, `docker-compose.yml`, test configs, and folder structure. `team:init` reads all of these first, then asks only for what it couldn't determine.

**opencode.json check:** `team:init` also checks whether `opencode.json` still contains placeholder values (`my-provider`) and warns the user before writing the skill.

---

### 14. Bad Directory Bug from Brace Expansion

**Discovery:** Running `mkdir -p /path/{agents,commands,skills}` in bash created a literal directory named `{agents,commands,skills` instead of three separate directories. This was because the shell was `/bin/sh` (dash), not bash, and dash does not support brace expansion.

**Impact:** The zip file contained corrupted directory entries. The fix was to create directories one at a time and always build the zip fresh (`rm` the old zip before `zip -r`), never use `zip` in update mode on a previously-corrupted archive.

**Prevention:** Always `rm` the zip before re-creating it. Never use `zip -r` in update mode (`-u`) — it preserves old entries.

---

### 15. Generic Team Has 13 Agents, Not 6

**Discovery:** During generalization, 7 agents were accidentally omitted: `architect`, `tester`, `code-reviewer`, `debugger`, `researcher`, `senior-frontend`, `junior-frontend`. The generic zip shipped with only 6 agents for several iterations.

**Root cause:** The initial generic agent files were written manually and the full list wasn't verified against the original.

**Prevention:** Always run `ls agents/ | wc -l` and verify count is 13 before packaging.

---

## Model Assignment Rationale

Models are assigned based on the [OpenCode Arena](https://opencode.ai/arena) benchmark rankings at the time of design.

| Tier | Used for | Rationale |
|---|---|---|
| Strong model | architect, leads, senior devs, debugger, project-manager | High-stakes decisions and complex implementation |
| Fast model | junior devs, tester, reviewer, researcher, frontend-lead | High-volume, lower-stakes work; cost efficiency |
| Vision-capable | product-owner, tester, researcher | Reading wireframes, screenshots, diagrams |

**Cost principle:** Junior agents and reviewer handle the most invocations. Assigning a fast/cheap model there significantly reduces cost without sacrificing quality on the tasks they handle.

### 16. `team:init` Oluşturduğu Dosyalar: Skill + AGENTS.md

**Decision:** `team:init` iki şey üretiyor — `.agents/skills/project-stack/SKILL.md` ve proje kökünde `AGENTS.md`.

**Why:** Stack skill teknik bilgiyi (test komutları, runtime kısıtları) taşır. Ama dil tercihi ("Türkçe cevap ver") veya ortam kuralları ("komutları Docker'da çalıştır") gibi kişisel/operasyonel kurallar stack skill'e ait değil. Bunlar `AGENTS.md`'ye girer.

`AGENTS.md` OpenCode'un native rule mekanizması — tüm agent'lar otomatik okur, `opencode.json`'a `"instructions": ["AGENTS.md"]` eklenerek aktif edilir.

`team:init` AGENTS.md'yi boş değil, doldurulabilir placeholder bölümlerle oluşturur (Language, Commands, Code Style, Workflow, Other Rules). Kullanıcı sadece ilgili bölümleri doldurur.

**Eğer AGENTS.md zaten varsa:** `team:init` dokunmaz.



### No `AGENTS.md` in generic version
The original Laravel project had an `AGENTS.md` file as a team overview. This was omitted from the generic version because the README serves the same purpose and keeping two sources of truth is error-prone.

### No sprint.md in generic commands (initially)
`team:sprint` was added late. The initial generic commands focused on per-feature and per-task workflows. Sprint planning was added when it became clear that multi-story coordination was a common need.

### No auto-push to git
Developers commit but do not push. The user decides when to push. This was a deliberate choice — automated pushes to a shared branch could cause conflicts and are outside the team's scope.

---

## Iterative Changes Summary

| Session | Change |
|---|---|
| Initial | Created full Laravel team: 13 agents, opencode.json, commands |
| +todo | Enabled todowrite/todoread per agent; added status protocol |
| +parallel QA/review | Leads spawn parallel testers and reviewers per scope |
| +critical decisions | 4 agents ask user before proceeding on key decision types |
| +git commits | Per-task commits mandatory; fix commits on QA/review failures |
| +generalization | Stack knowledge moved to project-stack skill; agents made generic |
| +commands | Added team:init, team:quick-fix, team:task, team:hotfix, team:refactor, team:add-test, team:standup, team:update-docs |
| +team: prefix | All commands renamed with team: prefix to avoid collision |
| +opencode.json docs | README section added; full template with all 13 agents |
| +missing agents | Fixed: generic zip was missing 7 agents |
