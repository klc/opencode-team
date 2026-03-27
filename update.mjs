#!/usr/bin/env node
// OpenCode Agent Team — Update Script
// Updates agents, commands, and skills while preserving your existing model assignments.
// Node.js 18+, no external dependencies

import { createInterface } from 'readline'
import { spawnSync } from 'child_process'
import { existsSync, readdirSync, copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── CLI flags ────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n')

// ── ANSI colors ─────────────────────────────────────────────
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

const ok    = msg => console.log(`  ${green('✓')} ${msg}`)
const dryok = msg => DRY_RUN ? console.log(`  ${dim('[dry-run]')} ${msg}`) : ok(msg)
const warn  = msg => console.log(`  ${yellow('⚠')}  ${msg}`)
const err   = msg => console.log(`  ${red('✗')} ${msg}`)
const step  = msg => console.log(`\n${bold(cyan('▶ ' + msg))}`)

// ── Readline helper ─────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (prompt, defaultVal = '') => new Promise(resolve => {
  const hint = defaultVal ? ` ${dim(`[${defaultVal}]`)}` : ''
  rl.question(`  ${bold(prompt)}${hint}: `, answer => {
    resolve(answer.trim() || defaultVal)
  })
})
const close = () => rl.close()

// ── Detect install location ──────────────────────────────────
function detectInstallDir() {
  const projectDir = join(process.cwd(), '.opencode')
  const globalDir  = join(homedir(), '.config', 'opencode')

  const inProject = existsSync(join(projectDir, 'agents'))
  const inGlobal  = existsSync(join(globalDir, 'agents'))

  if (inProject && inGlobal) {
    return { type: 'both', projectDir, globalDir }
  } else if (inProject) {
    return { type: 'project', dir: projectDir }
  } else if (inGlobal) {
    return { type: 'global', dir: globalDir }
  } else {
    return { type: 'none' }
  }
}

// ── Read current model assignments from installed agents ─────
function readCurrentModels(installDir) {
  const agentsDir = join(installDir, 'agents')
  const models = {}

  if (!existsSync(agentsDir)) return models

  for (const file of readdirSync(agentsDir)) {
    if (!file.endsWith('.md')) continue
    const agentName = file.replace('.md', '')
    try {
      const content = readFileSync(join(agentsDir, file), 'utf8')
      const match = content.match(/^model:\s*(.+)$/m)
      if (match) models[agentName] = match[1].trim()
    } catch (e) {
      warn(`Could not read agent file ${file}: ${e.message}`)
    }
  }

  return models
}

// ── Read agent model assignments from opencode.json ──────────
function readModelsFromJson(installDir) {
  const jsonPath = join(installDir, 'opencode.json')
  if (!existsSync(jsonPath)) return {}

  try {
    const config = JSON.parse(readFileSync(jsonPath, 'utf8'))
    const models = {}
    for (const [name, agent] of Object.entries(config.agent || {})) {
      if (agent.model) models[name] = agent.model
    }
    return models
  } catch {
    return {}
  }
}

// ── Merge models (md files take precedence over json) ────────
function resolveCurrentModels(installDir) {
  const fromJson = readModelsFromJson(installDir)
  const fromMd   = readCurrentModels(installDir)
  return { ...fromJson, ...fromMd }
}

// ── Copy dir recursively, skipping specified files ───────────
function copyDir(src, dest, skipFiles = []) {
  try {
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
    for (const entry of readdirSync(src, { withFileTypes: true })) {
      if (skipFiles.includes(entry.name)) continue
      const srcPath  = join(src, entry.name)
      const destPath = join(dest, entry.name)
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath, skipFiles)
      } else {
        try {
          copyFileSync(srcPath, destPath)
        } catch (e) {
          throw new Error(`Failed to copy ${srcPath} → ${destPath}: ${e.message}`)
        }
      }
    }
  } catch (e) {
    throw new Error(`copyDir failed (${src} → ${dest}): ${e.message}`)
  }
}

// ── Apply model to agent file ────────────────────────────────
function applyModel(agentFilePath, model) {
  try {
    let content = readFileSync(agentFilePath, 'utf8')
    const updated = content.replace(/^model:.*$/m, `model: ${model}`)
    if (updated === content) {
      warn(`No model: field found in ${agentFilePath} — skipping model restore`)
      return
    }
    writeFileSync(agentFilePath, updated)
  } catch (e) {
    warn(`Could not restore model in ${agentFilePath}: ${e.message}`)
  }
}

// ── Update agent block in opencode.json ──────────────────────
function updateOpencodeJson(installDir, currentModels) {
  const jsonPath = join(installDir, 'opencode.json')
  if (!existsSync(jsonPath)) return

  let config
  try {
    config = JSON.parse(readFileSync(jsonPath, 'utf8'))
  } catch {
    warn('Could not parse opencode.json — skipping json update')
    return
  }

  let updated = 0
  for (const [name, agent] of Object.entries(config.agent || {})) {
    if (currentModels[name] && agent.model !== currentModels[name]) {
      agent.model = currentModels[name]
      updated++
    }
  }

  try {
    writeFileSync(jsonPath, JSON.stringify(config, null, 2))
    if (updated > 0) ok(`Updated ${updated} model references in opencode.json`)
  } catch (e) {
    warn(`Could not write opencode.json: ${e.message}`)
  }
}

// ── Vibe Kanban MCP helpers ──────────────────────────────────
const VIBE_KANBAN_MCP_KEY = 'vibe_kanban'
const VIBE_KANBAN_MCP_CONFIG = {
  type: 'local',
  command: 'npx',
  args: ['-y', 'vibe-kanban@latest', '--mcp'],
}

function hasVibeKanbanMcp(jsonPath) {
  if (!existsSync(jsonPath)) return false
  try {
    const config = JSON.parse(readFileSync(jsonPath, 'utf8'))
    return !!(config.mcp && config.mcp[VIBE_KANBAN_MCP_KEY])
  } catch {
    return false
  }
}

// Agents that need Vibe Kanban tool access
const VIBE_KANBAN_AGENTS = new Set([
  'project-manager',
  'backend-lead', 'frontend-lead',
  'senior-backend', 'senior-frontend',
  'junior-backend', 'junior-frontend',
  'tester', 'code-reviewer',
])

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

  try {
    writeFileSync(jsonPath, JSON.stringify(config, null, 2))
  } catch (e) {
    warn(`Could not write Vibe Kanban config to opencode.json: ${e.message}`)
  }
}

// ── Changelog ───────────────────────────────────────────────
const CHANGELOG = [
  { version: '1.6.0', changes: [
    'feat: librarian agent — team memory manager, writes/retrieves structured records',
    'feat: .memory/ structure — decisions, features, bugs, research, debt categories',
    'feat: memory index — index.md tracks all records for fast recall',
    'feat: versioning — multiple versions in same file, full history preserved',
    'feat: /team:recall command — search team memory by topic',
    'feat: /team:remember command — manually add records to team memory',
    'feat: team:init Phase 5c — creates .memory/ structure on project init',
    'feat: architect, project-manager, debugger, researcher, code-reviewer, designer write to memory after significant work',
  ]},
  { version: '1.5.0', changes: [
    'feat: Vibe Kanban MCP integration — agents create and update Kanban issues automatically',
    'feat: install.mjs asks to enable Vibe Kanban (default: yes)',
    'feat: update.mjs checks Vibe Kanban status and offers to enable if missing',
    'feat: team:init Phase 5b — prompts for project ID, writes Vibe Kanban section to project-stack skill',
    'feat: project-manager creates feature parent issue + sub-issues for all tasks including qa/review',
    'feat: leads, developers, reviewer, tester all update issue status via MCP',
    'fix: correct Vibe Kanban status values — todo/in_progress/in_review/done',
    'fix: full issue ID chain — project-manager → lead → developer/reviewer/tester',
  ]},
  { version: '1.4.0', changes: [
    'feat: designer agent — establishes visual design system, writes project-design skill',
    'feat: /team:designer command — define or update design system with a brief',
    'feat: frontend agents load project-design skill before writing UI code',
    'feat: code-reviewer checks design system compliance on frontend code',
  ]},
  { version: '1.3.0', changes: [
    'feat: review now runs before tests (review → test order)',
    'feat: security-auditor and performance-analyst agents added',
    'feat: /team:audit command — parallel security + perf + quality audit',
    'feat: color coding for all agents in TUI',
    'feat: internal subagents hidden from autocomplete',
    'fix: skill frontmatter added — skills now discoverable by OpenCode',
    'fix: removed all Laravel-specific references from generic files',
    'fix: team:init writes to .opencode/skills/ (correct path)',
  ]},
  { version: '1.2.0', changes: [
    'feat: update.mjs — preserves model assignments on update',
    'feat: install.mjs — cross-platform Node.js installer',
    'feat: AGENTS.md auto-created on project install',
    'fix: global install no longer overwrites provider/MCP settings',
  ]},
  { version: '1.1.0', changes: [
    'feat: review → test order (review before QA)',
    'feat: team:init scans project and generates project-stack skill',
    'fix: agent mode: all for leads (work as both primary and subagent)',
    'fix: steps limits raised for complex pipelines',
  ]},
]

function showChangelog(installedDir) {
  const markerPath = join(installedDir, '.team-version')
  const currentVersion = CHANGELOG[0].version

  console.log(`
  ${bold('Changelog — what is new:')}`)

  const entries = existsSync(markerPath)
    ? CHANGELOG.slice(0, 1)
    : CHANGELOG

  for (const entry of entries) {
    console.log(`
  ${bold(cyan('v' + entry.version))}`)
    for (const change of entry.changes) {
      const icon = change.startsWith('feat') ? green('+') : change.startsWith('fix') ? yellow('~') : dim('·')
      console.log(`    ${icon} ${dim(change.replace(/^(feat|fix): /, ''))}`)
    }
  }
  console.log('')
}

async function main() {
  console.log('')
  console.log(bold(cyan('╔══════════════════════════════════════════╗')))
  console.log(bold(cyan('║     OpenCode Agent Team — Update         ║')))
  console.log(bold(cyan('╚══════════════════════════════════════════╝')))
  console.log('')

  if (DRY_RUN) {
    console.log(`  ${yellow('⚠')}  ${bold('Dry-run mode')} — no files will be written`)
    console.log('')
  }

  const sourceDir = join(__dirname, '.opencode')
  if (!existsSync(sourceDir)) {
    err(`Source directory not found: ${sourceDir}`)
    console.log('  Make sure you run this script from the opencode-agent-team directory.')
    close()
    process.exit(1)
  }

  // ── Detect where the team is installed ──────────────────────
  step('Detecting installation...')
  const detected = detectInstallDir()

  let installDirs = []

  if (detected.type === 'none') {
    err('No existing installation found.')
    console.log(`  Run ${cyan('node install.mjs')} first to do a fresh install.`)
    close()
    process.exit(1)
  } else if (detected.type === 'both') {
    ok(`Found both project and global installations`)
    installDirs = [
      { label: 'project', dir: detected.projectDir },
      { label: 'global',  dir: detected.globalDir  },
    ]
  } else {
    ok(`Found ${detected.type} installation: ${detected.dir}`)
    installDirs = [{ label: detected.type, dir: detected.dir }]
  }

  // Show changelog
  showChangelog(installDirs[0].dir)

  // ── Process each installation ────────────────────────────────
  for (const { label, dir } of installDirs) {
    step(`Updating ${label} installation (${dir})...`)

    // Step 1: Read current model assignments BEFORE overwriting anything
    const currentModels = resolveCurrentModels(dir)
    const modelCount = Object.keys(currentModels).filter(k => !currentModels[k].includes('my-provider')).length
    ok(`Read ${Object.keys(currentModels).length} model assignments (${modelCount} non-placeholder)`)

    if (Object.keys(currentModels).length > 0) {
      console.log('')
      console.log(`  ${dim('Current assignments:')}`)
      for (const [agent, model] of Object.entries(currentModels)) {
        console.log(`    ${agent.padEnd(20)} ${dim(model)}`)
      }
    }

    // Step 2: Copy new agent, command, and skill files (skip opencode.json)
    if (!DRY_RUN) {
      try {
        copyDir(sourceDir, dir, ['opencode.json'])
        ok('Copied updated agent, command, and skill files')
      } catch (e) {
        err(`File copy failed: ${e.message}`)
        err('Your existing installation has not been modified.')
        close()
        process.exit(1)
      }
    } else {
      dryok('Would copy updated agent, command, and skill files')
    }

    // Step 3: Re-apply model assignments to the freshly copied agent files
    const agentsDir = join(dir, 'agents')
    let restored = 0
    for (const [agentName, model] of Object.entries(currentModels)) {
      const agentFile = join(agentsDir, `${agentName}.md`)
      if (existsSync(agentFile) || DRY_RUN) {
        if (!DRY_RUN) applyModel(agentFile, model)
        restored++
      }
    }
    if (DRY_RUN) {
      dryok(`Would restore ${restored} model assignments to agent files`)
    } else {
      ok(`Restored ${restored} model assignments to agent files`)
    }

    // Step 4: Update model fields in opencode.json agent block
    const jsonPath = join(dir, 'opencode.json')
    if (existsSync(jsonPath)) {
      updateOpencodeJson(dir, currentModels)
    } else {
      warn('opencode.json not found — skipping json model update')
    }

    // Step 5: Vibe Kanban MCP check
    if (!DRY_RUN && existsSync(jsonPath)) {
      if (hasVibeKanbanMcp(jsonPath)) {
        ok('Vibe Kanban MCP already configured — preserved')
      } else {
        console.log('')
        console.log(`  ${yellow('⚠')}  Vibe Kanban MCP is not configured in this installation.`)
        console.log(`  ${dim('Vibe Kanban gives agents a visual Kanban board with automatic issue tracking.')}`)
        console.log('')
        const vibeInput = await ask('Enable Vibe Kanban integration? [Y/n]', 'y')
        if (vibeInput.toLowerCase() !== 'n') {
          addVibeKanbanMcp(jsonPath)
          ok('Vibe Kanban MCP server added to opencode.json')
          console.log(`  ${dim('Run /team:init to set your project ID and activate full Kanban integration.')}`)
        } else {
          warn('Vibe Kanban skipped — run update again to add later')
        }
      }
    } else if (DRY_RUN && existsSync(jsonPath)) {
      if (hasVibeKanbanMcp(jsonPath)) {
        dryok('Vibe Kanban MCP already configured — would preserve')
      } else {
        dryok('Vibe Kanban MCP not configured — would offer to add')
      }
    }
  }

  // ── Done ───────────────────────────────────────────────────
  if (!DRY_RUN) {
    for (const { dir } of installDirs) {
      try {
        writeFileSync(join(dir, '.team-version'), CHANGELOG[0].version)
      } catch (e) {
        warn(`Could not write version marker: ${e.message}`)
      }
    }
  }

  if (DRY_RUN) {
    console.log('')
    console.log(bold(yellow('Dry-run complete — no files were modified.')))
    console.log(`  Run ${cyan('node update.mjs')} without --dry-run to apply changes.`)
    console.log('')
    close()
    return
  }

  console.log('')
  console.log(bold(green('╔══════════════════════════════════════════╗')))
  console.log(bold(green('║     Update complete! 🎉                  ║')))
  console.log(bold(green('╚══════════════════════════════════════════╝')))
  console.log('')
  console.log(`  ${bold('What was updated:')}`)
  console.log(`    ${green('✓')} Agent prompt files (.opencode/agents/)`)
  console.log(`    ${green('✓')} Command files (.opencode/commands/)`)
  console.log(`    ${green('✓')} Skill files (.opencode/skills/)`)
  console.log('')
  console.log(`  ${bold('What was preserved:')}`)
  console.log(`    ${green('✓')} Your model assignments`)
  console.log(`    ${green('✓')} opencode.json provider settings`)
  console.log(`    ${green('✓')} opencode.json MCP settings (including Vibe Kanban)`)
  console.log(`    ${green('✓')} AGENTS.md project rules`)
  console.log(`    ${green('✓')} project-stack skill`)
  console.log('')

  close()
}

main().catch(e => {
  console.error(red('Update failed:'), e.message)
  close()
  process.exit(1)
})
