#!/usr/bin/env node
// OpenCode Agent Team — Setup Script
// Node.js 18+, no external dependencies

import { createInterface } from 'readline'
import { execSync, spawnSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { homedir, platform } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── ANSI colors ─────────────────────────────────────────────
const c = {
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[0;36m',
  green:  '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  red:    '\x1b[0;31m',
  reset:  '\x1b[0m',
}
const bold   = s => `${c.bold}${s}${c.reset}`
const dim    = s => `${c.dim}${s}${c.reset}`
const cyan   = s => `${c.cyan}${s}${c.reset}`
const green  = s => `${c.green}${s}${c.reset}`
const yellow = s => `${c.yellow}${s}${c.reset}`
const red    = s => `${c.red}${s}${c.reset}`

const ok   = msg => console.log(`  ${green('✓')} ${msg}`)
const warn = msg => console.log(`  ${yellow('⚠')}  ${msg}`)
const err  = msg => console.log(`  ${red('✗')} ${msg}`)
const step = msg => console.log(`\n${bold(cyan('▶ ' + msg))}`)

// ── Readline helper ─────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (prompt, defaultVal = '') => new Promise(resolve => {
  const hint = defaultVal ? ` ${dim(`[${defaultVal}]`)}` : ''
  rl.question(`  ${bold(prompt)}${hint}: `, answer => {
    resolve(answer.trim() || defaultVal)
  })
})
const close = () => rl.close()

// ── Check opencode ──────────────────────────────────────────
function checkOpencode() {
  const result = spawnSync('opencode', ['--version'], { encoding: 'utf8' })
  if (result.error) {
    err('opencode is not installed or not in PATH.')
    console.log('\n  Install from: https://opencode.ai\n')
    process.exit(1)
  }
  ok(`opencode found: ${(result.stdout || result.stderr || '').trim()}`)
}

// ── Fetch models ────────────────────────────────────────────
function fetchModels() {
  step('Fetching available models from OpenCode...')
  const result = spawnSync('opencode', ['models'], { encoding: 'utf8' })
  if (result.error || !result.stdout?.trim()) {
    warn('Could not fetch models (no providers configured yet, or opencode not reachable).')
    warn('You can set models manually later in opencode.json.')
    return []
  }
  const models = result.stdout.trim().split('\n').filter(Boolean)
  ok(`Found ${models.length} models across your configured providers.`)
  return models
}

// ── Model selection ─────────────────────────────────────────
async function selectModel(role, recommendation, models) {
  console.log('')
  console.log(`  ${bold(role)}`)
  console.log(`  ${dim('Recommended: ' + recommendation)}`)

  if (models.length === 0) {
    return await ask('Enter model (provider/model-name)', recommendation)
  }

  console.log(`\n  ${dim('Available models:')}`)
  models.forEach((m, i) => {
    console.log(`    ${dim(`${String(i + 1).padStart(3)})`)} ${m}`)
  })
  console.log('')
  console.log(`  ${dim('Enter a number, or type a model name directly (Enter = recommendation)')}`)

  const input = await ask('Choice', '')
  if (!input) return recommendation
  const num = parseInt(input, 10)
  if (!isNaN(num) && num >= 1 && num <= models.length) return models[num - 1]
  return input
}

// ── Copy directory recursively (skip listed filenames) ──────
function copyDir(src, dest, skipFiles = []) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (skipFiles.includes(entry.name)) continue
    const srcPath  = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, skipFiles)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

// ── Update model in agent markdown frontmatter ──────────────
function updateAgentModel(filePath, model) {
  let content = readFileSync(filePath, 'utf8')
  content = content.replace(/^model:.*$/m, `model: ${model}`)
  writeFileSync(filePath, content)
}

// ── Merge agent block into existing opencode.json ───────────
function writeOpencodeJson(destPath, agentBlock, isProject) {
  let config = {}

  if (existsSync(destPath)) {
    try {
      config = JSON.parse(readFileSync(destPath, 'utf8'))
    } catch {
      warn('Could not parse existing opencode.json — creating a new one.')
      config = {}
    }
    config.agent = agentBlock
    ok('Merged agent block into existing opencode.json (provider/MCP settings preserved)')
  } else {
    config = { '$schema': 'https://opencode.ai/config.json', agent: agentBlock }
    if (isProject) config.instructions = ['AGENTS.md']
    ok('Created opencode.json')
  }

  if (isProject && !config.instructions) {
    config.instructions = ['AGENTS.md']
  }

  writeFileSync(destPath, JSON.stringify(config, null, 2))
}

// ── Vibe Kanban MCP helpers ──────────────────────────────────
const VIBE_KANBAN_MCP_KEY = 'vibe_kanban'
const VIBE_KANBAN_MCP_CONFIG = {
  type: 'local',
  command: [
      "npx",
      "-y",
      "vibe-kanban@latest",
      "--mcp"
  ],
  enabled: true
}

// Agents that need Vibe Kanban tool access
const VIBE_KANBAN_AGENTS = new Set([
  'project-manager',
  'backend-lead', 'frontend-lead',
  'senior-backend', 'senior-frontend',
  'junior-backend', 'junior-frontend',
  'tester', 'code-reviewer',
])

function hasVibeKanbanMcp(jsonPath) {
  if (!existsSync(jsonPath)) return false
  try {
    const config = JSON.parse(readFileSync(jsonPath, 'utf8'))
    return !!(config.mcp && config.mcp[VIBE_KANBAN_MCP_KEY])
  } catch {
    return false
  }
}

function addVibeKanbanMcp(jsonPath) {
  let config = {}
  if (existsSync(jsonPath)) {
    try { config = JSON.parse(readFileSync(jsonPath, 'utf8')) } catch { config = {} }
  }
  // Add MCP server definition
  if (!config.mcp) config.mcp = {}
  config.mcp[VIBE_KANBAN_MCP_KEY] = VIBE_KANBAN_MCP_CONFIG

  // Add vibe_kanban: true to each relevant agent's tools block
  for (const agentName of VIBE_KANBAN_AGENTS) {
    if (config.agent?.[agentName]) {
      if (!config.agent[agentName].tools) config.agent[agentName].tools = {}
      config.agent[agentName].tools.vibe_kanban = true
    }
  }

  writeFileSync(jsonPath, JSON.stringify(config, null, 2))
}

// ── Build agent config block ─────────────────────────────────
function buildAgentBlock(agentModels, includeVibeKanban = false) {
  const descriptions = {
    'product-owner':   'Invoke for new features or requirement changes. Clarifies scope, writes user stories, delegates to project-manager. Never writes code.',
    'project-manager': 'Invoke after product-owner delivers a story. Creates branch, breaks story into tasks, assigns to leads, maintains todo board. Never writes code.',
    'architect':       'Invoke before major structural decisions. Writes ADRs. Never writes production code.',
    'backend-lead':    'Invoke when backend tasks arrive from project-manager. Delegates to developers. Triggers review then QA.',
    'frontend-lead':   'Invoke when frontend tasks arrive from project-manager. Delegates to developers. Triggers review then QA.',
    'senior-backend':  'Invoke for complex backend tasks: new architecture, integrations, performance-critical code.',
    'senior-frontend': 'Invoke for complex frontend tasks: new pages, state management, SSR-sensitive code.',
    'junior-backend':  'Invoke for simple backend tasks: CRUD, adding fields, unit tests, isolated bug fixes.',
    'junior-frontend': 'Invoke for simple frontend tasks: styling, small presentational components, component tests.',
    'tester':          'Invoke after review passes. Writes and runs tests, reports bugs. Spawned in parallel per scope by leads.',
    'code-reviewer':   'Invoke before QA. Reviews code quality, security, and standards. Never modifies code.',
    'debugger':        'Invoke when root cause of a bug is unclear. Reads logs and stack traces. Analysis only.',
    'researcher':        'Invoke to evaluate a technology or pattern. Produces comparison report with recommendation.',
    'designer':          'Invoke to establish or update the project visual design system. Creates the project-design skill that all frontend developers follow.',
    'security-auditor':  'Invoke for security audits — OWASP Top 10, auth flaws, injection vulnerabilities. More thorough than code-reviewer.',
    'performance-analyst': 'Invoke to identify performance bottlenecks — N+1 queries, missing indexes, bundle size, cache opportunities.',
    'librarian':       'Team memory manager. Writes and retrieves structured records from .memory/ — decisions, features, bugs, research, debt.',
  }

  const modeMap = {
    'product-owner': 'all', 'project-manager': 'all', 'architect': 'all',
    'backend-lead': 'all', 'frontend-lead': 'all', 'designer': 'all',
    'senior-backend': 'subagent', 'senior-frontend': 'subagent',
    'junior-backend': 'subagent', 'junior-frontend': 'subagent',
    'tester': 'subagent', 'code-reviewer': 'subagent',
    'debugger': 'subagent', 'researcher': 'subagent',
    'security-auditor': 'subagent', 'performance-analyst': 'subagent', 'librarian': 'subagent',
  }

  const stepsMap = {
    'product-owner': 80, 'project-manager': 80, 'architect': 60,
    'backend-lead': 100, 'frontend-lead': 100,
    'senior-backend': 80, 'senior-frontend': 80,
    'junior-backend': 40, 'junior-frontend': 40,
    'tester': 60, 'code-reviewer': 40,
    'debugger': 60, 'researcher': 40,
    'designer': 60, 'security-auditor': 60, 'performance-analyst': 60, 'librarian': 40,
  }

  const permissionMap = {
    'senior-backend':  { bash: 'allow', edit: 'allow' },
    'senior-frontend': { bash: 'allow', edit: 'allow' },
    'junior-backend':  { bash: 'ask',   edit: 'allow' },
    'junior-frontend': { bash: 'ask',   edit: 'allow' },
    'tester':          { bash: 'allow', edit: 'allow' },
  }

  const todoAgents = new Set([
    'project-manager', 'backend-lead', 'frontend-lead',
    'senior-backend', 'senior-frontend',
    'junior-backend', 'junior-frontend',
    'tester', 'code-reviewer',
  ])

  const hiddenAgents = new Set([
    'senior-backend', 'senior-frontend', 'junior-backend', 'junior-frontend',
    'tester', 'code-reviewer', 'debugger', 'security-auditor', 'performance-analyst', 'librarian',
  ])

  const block = {}
  for (const name of Object.keys(descriptions)) {
    const agent = {
      description: descriptions[name],
      model: agentModels[name],
      mode: modeMap[name],
      steps: stepsMap[name],
    }

    const tools = {}
    if (todoAgents.has(name)) {
      tools.todowrite = true
      tools.todoread  = true
    }
    // Grant vibe_kanban tool access if Vibe Kanban is enabled
    if (includeVibeKanban && VIBE_KANBAN_AGENTS.has(name)) {
      tools.vibe_kanban = true
    }
    if (Object.keys(tools).length > 0) agent.tools = tools

    if (permissionMap[name]) agent.permission = permissionMap[name]
    if (hiddenAgents.has(name)) agent.hidden = true

    block[name] = agent
  }
  return block
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('')
  console.log(bold(cyan('╔══════════════════════════════════════════╗')))
  console.log(bold(cyan('║     OpenCode Agent Team — Setup          ║')))
  console.log(bold(cyan('╚══════════════════════════════════════════╝')))
  console.log('')

  checkOpencode()

  // ── Step 1: Installation type ────────────────────────────
  step('Where do you want to install the agent team?')
  console.log('')
  console.log(`  ${bold('1) Project')} — installs into .opencode/ in the current directory`)
  console.log(`     ${dim('Use this for a specific project. The team will only be active here.')}`)
  console.log('')
  console.log(`  ${bold('2) Global')}  — installs into ~/.config/opencode/`)
  console.log(`     ${dim('Use this to have the team available in every project.')}`)
  console.log('')

  const installChoice = await ask('Choice [1/2]', '1')
  const isGlobal = installChoice === '2'

  let projectRoot = process.cwd()
  if (!isGlobal) {
    console.log('')
    console.log(`  ${dim('Enter the full path to your project directory.')}`)
    console.log(`  ${dim('Press Enter to use the current directory:')} ${dim(process.cwd())}`)
    const inputPath = await ask('Project path', process.cwd())
    projectRoot = inputPath.startsWith('~')
      ? join(homedir(), inputPath.slice(1))
      : inputPath
    if (!existsSync(projectRoot)) {
      err(`Directory not found: ${projectRoot}`)
      close()
      process.exit(1)
    }
  }

  const installDir = isGlobal
    ? join(homedir(), '.config', 'opencode')
    : join(projectRoot, '.opencode')
  const installType = isGlobal ? 'global' : 'project'

  ok(`Installing as: ${bold(installType)} → ${installDir}`)

  // ── Step 2: Fetch models ──────────────────────────────────
  const models = fetchModels()

  // ── Step 3: Model assignments ─────────────────────────────
  step('Model assignments')
  console.log('')
  console.log(`  The team uses two tiers of models:`)
  console.log(`  ${bold('Strong')} — leads, architect, senior devs, debugger ${dim('(high-stakes decisions)')}`)
  console.log(`  ${bold('Fast')}   — junior devs, tester, reviewer, researcher ${dim('(high-volume work)')}`)
  console.log('')

  const strongModel = await selectModel('Strong model', 'anthropic/claude-opus-4-5', models)
  console.log('')
  const fastModel   = await selectModel('Fast model',   'anthropic/claude-sonnet-4-5', models)

  const agentModels = {
    'product-owner':   strongModel,
    'project-manager': strongModel,
    'architect':       strongModel,
    'backend-lead':    strongModel,
    'frontend-lead':   fastModel,
    'senior-backend':  strongModel,
    'senior-frontend': fastModel,
    'junior-backend':  fastModel,
    'junior-frontend': fastModel,
    'tester':          fastModel,
    'code-reviewer':   fastModel,
    'debugger':          strongModel,
    'researcher':        fastModel,
    'designer':          strongModel,
    'security-auditor':  strongModel,
    'performance-analyst': strongModel,
    'librarian':          fastModel,
  }

  // ── Step 4: Optional per-agent customization ──────────────
  console.log('')
  const customizeInput = await ask('Customize individual agent models? [y/N]', 'n')
  if (customizeInput.toLowerCase() === 'y') {
    step('Individual agent models')
    console.log(`  ${dim('Press Enter to accept the default shown in brackets.')}`)
    for (const agent of Object.keys(agentModels)) {
      agentModels[agent] = await selectModel(agent, agentModels[agent], models)
    }
  }

  // ── Step 5: Vibe Kanban integration ──────────────────────
  step('Vibe Kanban integration (recommended)')
  console.log('')
  console.log(`  Vibe Kanban gives the agent team a visual Kanban board.`)
  console.log(`  Agents create and update issues automatically as they work.`)
  console.log('')
  console.log(`  ${dim('Learn more: https://vibekanban.com')}`)
  console.log('')

  const vibeInput = await ask('Enable Vibe Kanban integration? [Y/n]', 'y')
  const useVibeKanban = vibeInput.toLowerCase() !== 'n'

  if (!useVibeKanban) {
    warn('Vibe Kanban skipped — you can add it later by running the install script again')
  }

  // ── Step 6: Install files ─────────────────────────────────
  step('Installing files...')

  const sourceDir = join(__dirname, '.opencode')
  if (!existsSync(sourceDir)) {
    err(`Source directory not found: ${sourceDir}`)
    console.log('  Make sure you run this script from the opencode-agent-team directory.')
    close()
    process.exit(1)
  }

  copyDir(sourceDir, installDir, ['opencode.json'])
  ok(`Copied agent, command, and skill files to ${installDir}`)

  // ── Step 7: Apply model assignments to agent files ────────
  step('Applying model assignments...')
  const agentsDir = join(installDir, 'agents')
  for (const [agentName, model] of Object.entries(agentModels)) {
    const filePath = join(agentsDir, `${agentName}.md`)
    if (existsSync(filePath)) updateAgentModel(filePath, model)
  }
  ok('Model assignments written to agent files')

  // ── Step 8: Write opencode.json ───────────────────────────
  step('Generating opencode.json...')
  const agentBlock = buildAgentBlock(agentModels, useVibeKanban)
  const jsonPath   = join(installDir, 'opencode.json')
  writeOpencodeJson(jsonPath, agentBlock, !isGlobal)

  // Add Vibe Kanban MCP server definition (tools already in agentBlock)
  if (useVibeKanban) {
    let config = JSON.parse(readFileSync(jsonPath, 'utf8'))
    if (!config.mcp) config.mcp = {}
    config.mcp[VIBE_KANBAN_MCP_KEY] = VIBE_KANBAN_MCP_CONFIG
    writeFileSync(jsonPath, JSON.stringify(config, null, 2))
    ok('Vibe Kanban MCP server and agent tool permissions configured')
  }

  // ── Step 9: Project extras (AGENTS.md) ───────────────────
  if (!isGlobal) {
    step('Project-specific setup...')
    const agentsMd = join(projectRoot, 'AGENTS.md')
    if (!existsSync(agentsMd)) {
      writeFileSync(agentsMd, `# Project Rules

## Language
<!-- Set your preferred language for agent responses here -->

## Commands
<!-- Specify how to run commands in this project -->

## Code Style
<!-- Any project-specific code style rules beyond what's in the stack skill -->

## Workflow
<!-- Any custom workflow preferences -->

## Other Rules
<!-- Add any other project-specific rules here -->
`)
      ok('Created AGENTS.md (edit this to add your project rules)')
    } else {
      ok('AGENTS.md already exists — skipping')
    }
  }

  // ── Done ──────────────────────────────────────────────────
  console.log('')
  console.log(bold(green('╔══════════════════════════════════════════╗')))
  console.log(bold(green('║     Installation complete! 🎉            ║')))
  console.log(bold(green('╚══════════════════════════════════════════╝')))
  console.log('')
  console.log(`  Installed to: ${bold(installDir)}`)
  console.log('')
  console.log(`  ${bold('Model assignments:')}`)
  for (const [agent, model] of Object.entries(agentModels)) {
    console.log(`    ${agent.padEnd(20)} ${dim(model)}`)
  }
  console.log('')
  if (useVibeKanban) {
    console.log(`  ${bold('Vibe Kanban:')} ${green('✓')} MCP server + agent tool permissions configured`)
    console.log(`  ${dim('Open Vibe Kanban, create a project, then run /team:init')}`)
  } else {
    console.log(`  ${bold('Vibe Kanban:')} ${dim('Not enabled — re-run install script to add later')}`)
  }
  console.log('')
  console.log(`  ${bold('Next steps:')}`)
  if (!isGlobal) {
    console.log(`  1. ${cyan('Edit AGENTS.md')} — add your project rules`)
    if (useVibeKanban) {
      console.log(`  2. ${cyan('Open Vibe Kanban')} — create a project and note your project ID`)
      console.log(`  3. ${cyan('Run /team:init')} — generates project-stack skill and sets Kanban project ID`)
      console.log(`  4. ${cyan('/team:new-feature <description>')} — start building`)
    } else {
      console.log(`  2. ${cyan('Run /team:init')} — generates the project-stack skill`)
      console.log(`  3. ${cyan('/team:new-feature <description>')} — start building`)
    }
  } else {
    console.log(`  1. In each project: ${cyan('run /team:init')} to generate the project-stack skill`)
    console.log(`  2. ${cyan('/team:new-feature <description>')} — start building`)
  }
  console.log('')

  close()
}

main().catch(e => {
  console.error(red('Installation failed:'), e.message)
  close()
  process.exit(1)
})
