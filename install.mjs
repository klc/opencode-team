#!/usr/bin/env node
// OpenCode Agent Team — Setup Script v1.8.0
// Node.js 18+, no external dependencies

import { createInterface } from 'readline'
import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const c = {
  bold: '\x1b[1m', dim: '\x1b[2m', cyan: '\x1b[0;36m',
  green: '\x1b[0;32m', yellow: '\x1b[1;33m', red: '\x1b[0;31m', reset: '\x1b[0m',
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

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (prompt, defaultVal = '') => new Promise(resolve => {
  const hint = defaultVal ? ` ${dim(`[${defaultVal}]`)}` : ''
  rl.question(`  ${bold(prompt)}${hint}: `, answer => resolve(answer.trim() || defaultVal))
})
const close = () => rl.close()

function checkOpencode() {
  const result = spawnSync('opencode', ['--version'], { encoding: 'utf8' })
  if (result.error) {
    err('opencode is not installed or not in PATH.')
    console.log('\n  Install from: https://opencode.ai\n')
    process.exit(1)
  }
  ok(`opencode found: ${(result.stdout || result.stderr || '').trim()}`)
}

function fetchModels() {
  step('Fetching available models from OpenCode...')
  const result = spawnSync('opencode', ['models'], { encoding: 'utf8' })
  if (result.error || !result.stdout?.trim()) {
    warn('Could not fetch models — you can set them manually later in opencode.json.')
    return []
  }
  const models = result.stdout.trim().split('\n').filter(Boolean)
  ok(`Found ${models.length} models.`)
  return models
}

async function selectModel(role, recommendation, models) {
  console.log(`\n  ${bold(role)}\n  ${dim('Recommended: ' + recommendation)}`)
  if (models.length === 0) return await ask('Enter model (provider/model-name)', recommendation)
  console.log(`\n  ${dim('Available models:')}`)
  models.forEach((m, i) => console.log(`    ${dim(`${String(i+1).padStart(3)})`)} ${m}`))
  console.log(`\n  ${dim('Enter a number, or type a model name directly (Enter = recommendation)')}`)
  const input = await ask('Choice', '')
  if (!input) return recommendation
  const num = parseInt(input, 10)
  if (!isNaN(num) && num >= 1 && num <= models.length) return models[num - 1]
  return input
}

function copyDir(src, dest, skipFiles = []) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (skipFiles.includes(entry.name)) continue
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) copyDir(srcPath, destPath, skipFiles)
    else copyFileSync(srcPath, destPath)
  }
}

function updateAgentModel(filePath, model) {
  let content = readFileSync(filePath, 'utf8')
  content = content.replace(/^model:.*$/m, `model: ${model}`)
  writeFileSync(filePath, content)
}

// ── GitHub Actions ────────────────────────────────────────────
function setupGithubActions(projectRoot) {
  const sourceDir = join(__dirname, '.github', 'workflows')
  if (!existsSync(sourceDir)) { warn('GitHub workflow source files not found — skipping'); return 0 }
  const destDir = join(projectRoot, '.github', 'workflows')
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
  const files = readdirSync(sourceDir).filter(f => f.startsWith('opencode'))
  let copied = 0
  for (const file of files) {
    const dest = join(destDir, file)
    if (!existsSync(dest)) { copyFileSync(join(sourceDir, file), dest); copied++ }
    else warn(`  ${file} already exists — skipping`)
  }
  return copied
}

// ── Kanban directory setup ────────────────────────────────────
function setupKanbanDir(projectRoot) {
  const kanbanDir = join(projectRoot, '.kanban')
  const triggersDir = join(kanbanDir, 'triggers')
  const processedDir = join(kanbanDir, 'triggers', 'processed')

  if (!existsSync(kanbanDir)) {
    mkdirSync(kanbanDir, { recursive: true })
    mkdirSync(triggersDir, { recursive: true })
    mkdirSync(processedDir, { recursive: true })

    // Empty index
    writeFileSync(join(kanbanDir, 'index.json'), JSON.stringify({
      lastId: 0,
      tasks: {},
      updatedAt: new Date().toISOString()
    }, null, 2))

    return true
  }
  return false
}

// ── Build agent config block ──────────────────────────────────
function buildAgentBlock(agentModels) {
  const descriptions = {
    'product-owner':       'Invoke for new features or requirement changes. Clarifies scope, writes user stories, creates Kanban tasks, delegates to project-manager. Never writes code.',
    'project-manager':     'Invoke after product-owner delivers a story. Creates Kanban subtasks, creates branch, assigns to leads via Kanban. Never writes code.',
    'architect':           'Invoke before major structural decisions. Writes ADRs. Never writes production code.',
    'backend-lead':        'Invoke when backend Kanban tasks arrive. Delegates to developers. Updates Kanban to review when done.',
    'frontend-lead':       'Invoke when frontend Kanban tasks arrive. Delegates to developers. Updates Kanban to review when done.',
    'senior-backend':      'Invoke for complex backend tasks: new architecture, integrations, performance-critical code.',
    'senior-frontend':     'Invoke for complex frontend tasks: new pages, state management, SSR-sensitive code.',
    'junior-backend':      'Invoke for simple backend tasks: CRUD, adding fields, unit tests, isolated bug fixes.',
    'junior-frontend':     'Invoke for simple frontend tasks: styling, small presentational components, component tests.',
    'tester':              'Invoke after review passes (via Kanban). Writes and runs tests. Updates Kanban to done or reopened.',
    'code-reviewer':       'Invoke before QA (via Kanban). Reviews code quality. Updates Kanban to testing or reopened.',
    'debugger':            'Invoke when root cause of a bug is unclear. Analysis only. Can create Kanban bug tasks.',
    'researcher':          'Invoke to evaluate a technology or pattern. Produces comparison report.',
    'designer':            'Invoke to establish or update the project visual design system. Creates the project-design skill.',
    'security-auditor':    'Invoke for security audits — OWASP Top 10, auth flaws. Invoked alongside code-reviewer for security-sensitive scopes.',
    'performance-analyst': 'Invoke to identify performance bottlenecks.',
    'librarian':           'Team memory manager. Writes and retrieves structured records from .memory/. Enriches records with Kanban history.',
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
    'tester': 60, 'code-reviewer': 40, 'debugger': 60, 'researcher': 40,
    'designer': 60, 'security-auditor': 60, 'performance-analyst': 60, 'librarian': 40,
  }

  const taskPermMap = {
    'product-owner':       { '*': 'deny', 'project-manager': 'allow', 'architect': 'allow', 'librarian': 'allow' },
    'project-manager':     { '*': 'deny', 'backend-lead': 'allow', 'frontend-lead': 'allow', 'architect': 'allow', 'librarian': 'allow' },
    'architect':           { '*': 'deny', 'researcher': 'allow', 'librarian': 'allow' },
    'backend-lead':        { '*': 'deny', 'senior-backend': 'allow', 'junior-backend': 'allow', 'code-reviewer': 'allow', 'tester': 'allow', 'security-auditor': 'allow', 'performance-analyst': 'allow', 'debugger': 'allow', 'researcher': 'allow', 'librarian': 'allow' },
    'frontend-lead':       { '*': 'deny', 'senior-frontend': 'allow', 'junior-frontend': 'allow', 'code-reviewer': 'allow', 'tester': 'allow', 'security-auditor': 'allow', 'performance-analyst': 'allow', 'debugger': 'allow', 'researcher': 'allow', 'librarian': 'allow', 'designer': 'allow' },
    'senior-backend':      { '*': 'deny', 'librarian': 'allow' },
    'senior-frontend':     { '*': 'deny', 'librarian': 'allow' },
    'junior-backend':      { '*': 'deny' },
    'junior-frontend':     { '*': 'deny' },
    'tester':              { '*': 'deny' },
    'code-reviewer':       { '*': 'deny', 'librarian': 'allow' },
    'debugger':            { '*': 'deny', 'librarian': 'allow' },
    'researcher':          { '*': 'deny', 'librarian': 'allow' },
    'designer':            { '*': 'deny', 'librarian': 'allow' },
    'security-auditor':    { '*': 'deny' },
    'performance-analyst': { '*': 'deny' },
    'librarian':           { '*': 'deny' },
  }

  const bashPerms = {
    lead:     { '*': 'allow', 'git push': 'ask', 'git push *': 'ask' },
    senior:   { '*': 'allow', 'git push': 'ask', 'git push *': 'ask', 'git rebase *': 'ask', 'git reset --hard *': 'ask', 'rm -rf *': 'ask', 'sudo *': 'deny' },
    junior:   { '*': 'ask', 'git status': 'allow', 'git diff *': 'allow', 'git log *': 'allow', 'git add *': 'allow', 'git commit *': 'allow', 'grep *': 'allow', 'find *': 'allow', 'cat *': 'allow', 'ls *': 'allow', 'npm run *': 'allow', 'git push': 'deny', 'git push *': 'deny', 'git rebase *': 'deny', 'git reset *': 'deny', 'rm -rf *': 'deny', 'sudo *': 'deny' },
    readonly: { '*': 'allow', 'git push': 'deny', 'git push *': 'deny', 'sudo *': 'deny' },
  }

  const bashTierMap = {
    'project-manager': 'lead', 'backend-lead': 'lead', 'frontend-lead': 'lead', 'designer': 'lead',
    'senior-backend': 'senior', 'senior-frontend': 'senior', 'tester': 'senior',
    'junior-backend': 'junior', 'junior-frontend': 'junior',
    'code-reviewer': 'readonly', 'debugger': 'readonly', 'security-auditor': 'readonly',
    'performance-analyst': 'readonly', 'librarian': 'readonly',
  }

  const todoAgents = new Set(['project-manager', 'backend-lead', 'frontend-lead', 'senior-backend', 'senior-frontend', 'junior-backend', 'junior-frontend', 'tester', 'code-reviewer'])
  const hiddenAgents = new Set(['senior-backend', 'senior-frontend', 'junior-backend', 'junior-frontend', 'tester', 'code-reviewer', 'debugger', 'security-auditor', 'performance-analyst', 'librarian'])
  const editAllowAgents = new Set(['senior-backend', 'senior-frontend', 'junior-backend', 'junior-frontend', 'tester'])

  const block = {}
  for (const name of Object.keys(descriptions)) {
    const agent = {
      description: descriptions[name],
      model: agentModels[name],
      mode: modeMap[name],
      steps: stepsMap[name],
    }

    const tools = {}
    if (todoAgents.has(name)) { tools.todowrite = true; tools.todoread = true }
    if (Object.keys(tools).length > 0) agent.tools = tools

    const permission = {}
    const bashTier = bashTierMap[name]
    if (bashTier) permission.bash = bashPerms[bashTier]
    if (editAllowAgents.has(name)) permission.edit = 'allow'
    if (taskPermMap[name]) permission.task = taskPermMap[name]
    if (Object.keys(permission).length > 0) agent.permission = permission

    if (hiddenAgents.has(name)) agent.hidden = true
    block[name] = agent
  }
  return block
}

function writeOpencodeJson(destPath, agentBlock, isProject) {
  let config = {}
  if (existsSync(destPath)) {
    try { config = JSON.parse(readFileSync(destPath, 'utf8')) } catch { config = {} }
    config.agent = agentBlock
    ok('Merged agent block into existing opencode.json (provider/MCP settings preserved)')
  } else {
    config = { '$schema': 'https://opencode.ai/config.json', agent: agentBlock }
    if (isProject) config.instructions = ['AGENTS.md']
    ok('Created opencode.json')
  }
  if (isProject && !config.instructions) config.instructions = ['AGENTS.md']
  writeFileSync(destPath, JSON.stringify(config, null, 2))
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('')
  console.log(bold(cyan('╔══════════════════════════════════════════╗')))
  console.log(bold(cyan('║     OpenCode Agent Team — Setup v1.8.0  ║')))
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
    console.log(`  ${dim('Press Enter to use the current directory:')} ${dim(process.cwd())}`)
    const inputPath = await ask('Project path', process.cwd())
    projectRoot = inputPath.startsWith('~') ? join(homedir(), inputPath.slice(1)) : inputPath
    if (!existsSync(projectRoot)) { err(`Directory not found: ${projectRoot}`); close(); process.exit(1) }
  }

  const installDir = isGlobal ? join(homedir(), '.config', 'opencode') : join(projectRoot, '.opencode')
  ok(`Installing as: ${bold(isGlobal ? 'global' : 'project')} → ${installDir}`)

  // ── Step 2: Fetch models ──────────────────────────────────
  const models = fetchModels()

  // ── Step 3: Model assignments ─────────────────────────────
  step('Model assignments')
  console.log('')
  console.log(`  ${bold('Strong')} — leads, architect, senior devs, debugger ${dim('(high-stakes decisions)')}`)
  console.log(`  ${bold('Fast')}   — junior devs, tester, reviewer, researcher ${dim('(high-volume work)')}`)
  console.log('')

  const strongModel = await selectModel('Strong model', 'anthropic/claude-opus-4-5', models)
  console.log('')
  const fastModel = await selectModel('Fast model', 'anthropic/claude-sonnet-4-5', models)

  const agentModels = {
    'product-owner': strongModel, 'project-manager': strongModel, 'architect': strongModel,
    'backend-lead': strongModel, 'frontend-lead': fastModel,
    'senior-backend': strongModel, 'senior-frontend': fastModel,
    'junior-backend': fastModel, 'junior-frontend': fastModel,
    'tester': fastModel, 'code-reviewer': fastModel,
    'debugger': strongModel, 'researcher': fastModel, 'designer': strongModel,
    'security-auditor': strongModel, 'performance-analyst': strongModel, 'librarian': fastModel,
  }

  console.log('')
  const customizeInput = await ask('Customize individual agent models? [y/N]', 'n')
  if (customizeInput.toLowerCase() === 'y') {
    step('Individual agent models')
    for (const agent of Object.keys(agentModels)) {
      agentModels[agent] = await selectModel(agent, agentModels[agent], models)
    }
  }

  // ── Step 4: GitHub Actions ────────────────────────────────
  let useGithubActions = false
  if (!isGlobal) {
    step('GitHub Actions integration (optional)')
    console.log('')
    console.log(`  Adds 4 OpenCode workflows to .github/workflows/`)
    console.log(`  ${dim('Requires: ANTHROPIC_API_KEY secret in GitHub repo Settings → Secrets → Actions')}`)
    console.log('')
    const ghInput = await ask('Set up GitHub Actions workflows? [Y/n]', 'y')
    useGithubActions = ghInput.toLowerCase() !== 'n'
  }

  // ── Step 5: Install files ─────────────────────────────────
  step('Installing files...')
  const sourceDir = join(__dirname, '.opencode')
  if (!existsSync(sourceDir)) {
    err(`Source directory not found: ${sourceDir}`)
    console.log('  Make sure you run this script from the opencode-agent-team directory.')
    close(); process.exit(1)
  }

  copyDir(sourceDir, installDir, ['opencode.json'])
  ok(`Copied agent, command, skill, tool, and plugin files to ${installDir}`)

  // Apply model assignments
  const agentsDir = join(installDir, 'agents')
  for (const [name, model] of Object.entries(agentModels)) {
    const fp = join(agentsDir, `${name}.md`)
    if (existsSync(fp)) updateAgentModel(fp, model)
  }
  ok('Model assignments written to agent files')

  // Write opencode.json
  step('Generating opencode.json...')
  const agentBlock = buildAgentBlock(agentModels)
  const jsonPath = join(installDir, 'opencode.json')
  writeOpencodeJson(jsonPath, agentBlock, !isGlobal)

  ok('permission.task delegation chain enforced in opencode.json')
  ok('Granular bash permissions applied per agent tier')

  // GitHub Actions
  if (useGithubActions) {
    step('Setting up GitHub Actions...')
    const count = setupGithubActions(projectRoot)
    if (count > 0) {
      ok(`${count} workflow file(s) copied to .github/workflows/`)
      warn('Add ANTHROPIC_API_KEY to GitHub → Settings → Secrets → Actions')
    }
  }

  // Project extras
  if (!isGlobal) {
    step('Project-specific setup...')

    // AGENTS.md
    const agentsMd = join(projectRoot, 'AGENTS.md')
    if (!existsSync(agentsMd)) {
      writeFileSync(agentsMd, `# Project Rules

## Language
<!-- Set your preferred language for agent responses here -->

## Commands
<!-- Specify how to run commands in this project -->

## Code Style
<!-- Any project-specific code style rules -->

## Workflow
<!-- Any custom workflow preferences -->

## Other Rules
<!-- Add any other project-specific rules here -->
`)
      ok('Created AGENTS.md (edit this to add your project rules)')
    } else {
      ok('AGENTS.md already exists — skipping')
    }

    // Kanban directory
    step('Setting up Kanban system...')
    const kanbanCreated = setupKanbanDir(projectRoot)
    if (kanbanCreated) {
      ok('Created .kanban/ directory with empty index')
      ok('Kanban trigger plugin will auto-start with the next OpenCode session')
    } else {
      ok('.kanban/ directory already exists — skipping')
    }

    // .gitignore — .kanban should NOT be ignored (it's project state)
    const gitignorePath = join(projectRoot, '.gitignore')
    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, 'utf8')
      if (gitignore.includes('.kanban')) {
        warn('.gitignore contains .kanban — remove it to track Kanban state in git')
      } else {
        ok('.kanban/ is not in .gitignore — Kanban state will be tracked in git ✓')
      }
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

  if (useGithubActions) {
    console.log(`  ${bold('GitHub Actions:')} ${green('✓')} 4 workflows installed`)
    console.log(`  ${dim('Add ANTHROPIC_API_KEY to GitHub → Settings → Secrets → Actions')}`)
  }
  console.log(`  ${bold('Security:')} ${green('✓')} permission.task + granular bash permissions active`)
  console.log(`  ${bold('Custom Tools:')} ${green('✓')} memory-search, complexity-score, debt-summary, stack-detect`)
  console.log(`  ${bold('Kanban Tools:')} ${green('✓')} kanban-create, kanban-update, kanban-get, kanban-list, kanban-watch`)
  console.log(`  ${bold('Kanban Plugin:')} ${green('✓')} kanban-trigger (auto agent triggering on status change)`)
  console.log('')
  console.log(`  ${bold('Next steps:')}`)
  if (!isGlobal) {
    console.log(`  1. ${cyan('Edit AGENTS.md')} — add your project rules`)
    console.log(`  2. ${cyan('Run /team:init')} — generates project-stack skill`)
    console.log(`  3. ${cyan('/team:new-feature <description>')} — start building (fully automated via Kanban)`)
    console.log('')
    console.log(`  ${bold('Kanban commands:')}`)
    console.log(`    ${cyan('/team:kanban board')}         — see all active tasks`)
    console.log(`    ${cyan('/team:kanban status KAN-001')} — see task details`)
    console.log(`    ${cyan('/team:kanban watch')}          — check for stalled tasks`)
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
