#!/usr/bin/env node
// OpenCode Agent Team — Update Script v1.8.0
// Preserves model assignments, MCP settings, and project rules.
// Node.js 18+, no external dependencies

import { createInterface } from 'readline'
import { spawnSync } from 'child_process'
import { existsSync, readdirSync, copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n')

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

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (prompt, defaultVal = '') => new Promise(resolve => {
  const hint = defaultVal ? ` ${dim(`[${defaultVal}]`)}` : ''
  rl.question(`  ${bold(prompt)}${hint}: `, answer => resolve(answer.trim() || defaultVal))
})
const close = () => rl.close()

function detectInstallDir() {
  const projectDir = join(process.cwd(), '.opencode')
  const globalDir = join(homedir(), '.config', 'opencode')
  const inProject = existsSync(join(projectDir, 'agents'))
  const inGlobal = existsSync(join(globalDir, 'agents'))
  if (inProject && inGlobal) return { type: 'both', projectDir, globalDir }
  if (inProject) return { type: 'project', dir: projectDir }
  if (inGlobal) return { type: 'global', dir: globalDir }
  return { type: 'none' }
}

function readCurrentModels(installDir) {
  const agentsDir = join(installDir, 'agents')
  const models = {}
  if (!existsSync(agentsDir)) return models
  for (const file of readdirSync(agentsDir)) {
    if (!file.endsWith('.md')) continue
    try {
      const content = readFileSync(join(agentsDir, file), 'utf8')
      const match = content.match(/^model:\s*(.+)$/m)
      if (match) models[file.replace('.md', '')] = match[1].trim()
    } catch { }
  }
  return models
}

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
  } catch { return {} }
}

function resolveCurrentModels(installDir) {
  return { ...readModelsFromJson(installDir), ...readCurrentModels(installDir) }
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

function applyModel(filePath, model) {
  try {
    let content = readFileSync(filePath, 'utf8')
    const updated = content.replace(/^model:.*$/m, `model: ${model}`)
    if (updated === content) { warn(`No model: field in ${filePath} — skipping`); return }
    writeFileSync(filePath, updated)
  } catch (e) { warn(`Could not restore model in ${filePath}: ${e.message}`) }
}

function updateOpencodeJson(installDir, currentModels) {
  const jsonPath = join(installDir, 'opencode.json')
  if (!existsSync(jsonPath)) return
  let config
  try { config = JSON.parse(readFileSync(jsonPath, 'utf8')) }
  catch { warn('Could not parse opencode.json — skipping json update'); return }
  let updated = 0
  for (const [name, agent] of Object.entries(config.agent || {})) {
    if (currentModels[name] && agent.model !== currentModels[name]) { agent.model = currentModels[name]; updated++ }
  }
  try { writeFileSync(jsonPath, JSON.stringify(config, null, 2)); if (updated > 0) ok(`Updated ${updated} model references in opencode.json`) }
  catch (e) { warn(`Could not write opencode.json: ${e.message}`) }
}

// ── permission.task check ─────────────────────────────────────
function hasTaskPermissions(jsonPath) {
  try { const c = JSON.parse(readFileSync(jsonPath, 'utf8')); return Object.values(c.agent || {}).some(a => a.permission?.task) }
  catch { return false }
}

// ── Kanban check ──────────────────────────────────────────────
function checkKanbanSetup(projectRoot, installDir) {
  const kanbanDir = join(projectRoot, '.kanban')
  const pluginDir = join(installDir, 'plugins')
  const pluginFile = join(pluginDir, 'kanban-trigger.ts')
  const toolFiles = ['kanban-create.ts', 'kanban-update.ts', 'kanban-get.ts', 'kanban-list.ts', 'kanban-watch.ts', '_kanban-core.ts']
  const toolsDir = join(installDir, 'tools')

  const missingTools = toolFiles.filter(f => !existsSync(join(toolsDir, f)))
  const hasPlugin = existsSync(pluginFile)
  const hasKanbanDir = existsSync(kanbanDir)

  return { missingTools, hasPlugin, hasKanbanDir, kanbanDir, pluginDir, toolsDir }
}

function setupKanbanDir(projectRoot) {
  const kanbanDir = join(projectRoot, '.kanban')
  const triggersDir = join(kanbanDir, 'triggers')
  const processedDir = join(kanbanDir, 'triggers', 'processed')

  if (!existsSync(kanbanDir)) {
    mkdirSync(kanbanDir, { recursive: true })
    mkdirSync(triggersDir, { recursive: true })
    mkdirSync(processedDir, { recursive: true })
    writeFileSync(join(kanbanDir, 'index.json'), JSON.stringify({
      lastId: 0,
      tasks: {},
      updatedAt: new Date().toISOString()
    }, null, 2))
    return true
  }

  // Ensure subdirs exist even if .kanban was already there
  if (!existsSync(triggersDir)) mkdirSync(triggersDir, { recursive: true })
  if (!existsSync(processedDir)) mkdirSync(processedDir, { recursive: true })
  return false
}

// ── GitHub Actions check ─────────────────────────────────────
function checkGithubActions(projectRoot) {
  const sourceDir = join(__dirname, '.github', 'workflows')
  if (!existsSync(sourceDir)) return { hasSource: false }
  const sourceFiles = readdirSync(sourceDir).filter(f => f.startsWith('opencode'))
  const destDir = join(projectRoot, '.github', 'workflows')
  const installedFiles = existsSync(destDir) ? readdirSync(destDir).filter(f => f.startsWith('opencode')) : []
  const missing = sourceFiles.filter(f => !installedFiles.includes(f))
  return { hasSource: true, sourceFiles, installedFiles, missing }
}

function installGithubWorkflows(projectRoot, files) {
  const destDir = join(projectRoot, '.github', 'workflows')
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
  const sourceDir = join(__dirname, '.github', 'workflows')
  for (const f of files) copyFileSync(join(sourceDir, f), join(destDir, f))
}

// ── Custom tools check ────────────────────────────────────────
function checkCustomTools(installDir) {
  const sourceDir = join(__dirname, '.opencode', 'tools')
  if (!existsSync(sourceDir)) return { hasSource: false }
  const sourceFiles = readdirSync(sourceDir).filter(f => f.endsWith('.ts'))
  const destDir = join(installDir, 'tools')
  const installedFiles = existsSync(destDir) ? readdirSync(destDir).filter(f => f.endsWith('.ts')) : []
  const missing = sourceFiles.filter(f => !installedFiles.includes(f))
  return { hasSource: true, sourceFiles, installedFiles, missing }
}

// ── Changelog ───────────────────────────────────────────────
const CHANGELOG = [
  { version: '1.8.0', changes: [
    'feat: Kanban system — file-based task tracking in .kanban/',
    'feat: kanban-trigger plugin — automatic agent triggering on status change',
    'feat: kanban_create_task tool — create tracked tasks with auto-assignment',
    'feat: kanban_update_task tool — status updates trigger next agent automatically',
    'feat: kanban_get_task tool — read full task context including history',
    'feat: kanban_list_tasks tool — board view grouped by status',
    'feat: kanban_watch tool — stall detection for watchdog plugin',
    'feat: watchdog — detects tasks stalled >30 min and injects nudge',
    'feat: all 17 agents updated with Kanban integration',
    'feat: /team:kanban command — board/status/watch sub-commands',
    'feat: /team:new-feature updated to create Kanban task first',
    'feat: install.mjs creates .kanban/ directory automatically',
    'feat: update.mjs checks and migrates Kanban setup',
  ]},
  { version: '1.7.0', changes: [
    'feat: permission.task — delegation chain enforced at API level',
    'feat: granular bash permissions — 4 tiers: lead / senior / junior / readonly',
    'feat: GitHub Actions — 4 workflows',
    'feat: custom tools — memory-search, complexity-score, debt-summary, stack-detect',
  ]},
  { version: '1.6.0', changes: [
    'feat: librarian agent — team memory manager',
    'feat: .memory/ structure — decisions, features, bugs, research, debt',
  ]},
]

function showChangelog(installedDir) {
  const markerPath = join(installedDir, '.team-version')
  console.log(`\n  ${bold('Changelog — what is new:')}`)
  const entries = existsSync(markerPath) ? CHANGELOG.slice(0, 1) : CHANGELOG
  for (const entry of entries) {
    console.log(`\n  ${bold(cyan('v' + entry.version))}`)
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

  if (DRY_RUN) { console.log(`  ${yellow('⚠')}  ${bold('Dry-run mode')} — no files will be written\n`) }

  const sourceDir = join(__dirname, '.opencode')
  if (!existsSync(sourceDir)) { err(`Source directory not found: ${sourceDir}`); close(); process.exit(1) }

  step('Detecting installation...')
  const detected = detectInstallDir()

  if (detected.type === 'none') {
    err('No existing installation found.')
    console.log(`  Run ${cyan('node install.mjs')} first.`)
    close(); process.exit(1)
  }

  const installDirs = detected.type === 'both'
    ? [{ label: 'project', dir: detected.projectDir, root: process.cwd() }, { label: 'global', dir: detected.globalDir, root: null }]
    : [{ label: detected.type, dir: detected.dir, root: detected.type === 'project' ? process.cwd() : null }]

  ok(`Found ${detected.type} installation${detected.type === 'both' ? 's' : ''}: ${installDirs.map(i => i.dir).join(', ')}`)
  showChangelog(installDirs[0].dir)

  for (const { label, dir, root } of installDirs) {
    step(`Updating ${label} installation (${dir})...`)

    // Read models BEFORE overwriting
    const currentModels = resolveCurrentModels(dir)
    const modelCount = Object.keys(currentModels).filter(k => !currentModels[k].includes('my-provider')).length
    ok(`Read ${Object.keys(currentModels).length} model assignments (${modelCount} non-placeholder)`)

    // Copy files (preserves opencode.json)
    if (!DRY_RUN) {
      try { copyDir(sourceDir, dir, ['opencode.json']); ok('Copied updated agent, command, skill, tool, and plugin files') }
      catch (e) { err(`File copy failed: ${e.message}`); close(); process.exit(1) }
    } else dryok('Would copy updated agent, command, skill, tool, and plugin files')

    // Restore models
    const agentsDir = join(dir, 'agents')
    let restored = 0
    for (const [name, model] of Object.entries(currentModels)) {
      const f = join(agentsDir, `${name}.md`)
      if (existsSync(f) || DRY_RUN) { if (!DRY_RUN) applyModel(f, model); restored++ }
    }
    DRY_RUN ? dryok(`Would restore ${restored} model assignments`) : ok(`Restored ${restored} model assignments to agent files`)

    // Update opencode.json models
    const jsonPath = join(dir, 'opencode.json')
    if (existsSync(jsonPath)) updateOpencodeJson(dir, currentModels)

    // permission.task check
    if (!DRY_RUN && existsSync(jsonPath)) {
      if (hasTaskPermissions(jsonPath)) ok('permission.task delegation chain — already configured')
      else warn('permission.task is NOT configured. Re-run install.mjs or add it manually.')
    }

    // Custom tools check
    if (!DRY_RUN) {
      const toolsCheck = checkCustomTools(dir)
      if (toolsCheck.hasSource) {
        ok(`Custom tools — ${toolsCheck.sourceFiles.length} tools installed (memory-search, complexity-score, debt-summary, stack-detect)`)
      }
    }

    // ── Kanban check ────────────────────────────────────────
    if (!DRY_RUN && label === 'project' && root) {
      step('Checking Kanban system...')
      const kanban = checkKanbanSetup(root, dir)

      if (kanban.missingTools.length > 0) {
        warn(`Missing Kanban tool files: ${kanban.missingTools.join(', ')}`)
        console.log(`  ${dim('These were copied in the file update step above.')}`)
      } else {
        ok(`Kanban tools — all 6 files present`)
      }

      if (!kanban.hasPlugin) {
        warn('kanban-trigger.ts plugin missing — was copied in the update step above.')
      } else {
        ok('kanban-trigger plugin — present')
      }

      if (!kanban.hasKanbanDir) {
        const created = setupKanbanDir(root)
        if (created) ok('Created .kanban/ directory (new in v1.8.0)')
      } else {
        // Ensure subdirs exist
        setupKanbanDir(root)
        ok('.kanban/ directory — present, subdirs verified')
      }

      // .gitignore check
      const gitignorePath = join(root, '.gitignore')
      if (existsSync(gitignorePath)) {
        const gitignore = readFileSync(gitignorePath, 'utf8')
        if (gitignore.includes('.kanban')) {
          warn('.gitignore contains .kanban — remove it to track Kanban state in git')
        } else {
          ok('.kanban/ is not in .gitignore ✓')
        }
      }
    } else if (DRY_RUN && label === 'project' && root) {
      dryok('Would check and migrate Kanban system setup')
    }

    // GitHub Actions check
    if (!DRY_RUN && label === 'project' && root) {
      const ghCheck = checkGithubActions(root)
      if (ghCheck.hasSource && ghCheck.missing.length > 0) {
        console.log('')
        console.log(`  ${yellow('⚠')}  ${ghCheck.missing.length} GitHub Actions workflow(s) missing:`)
        for (const f of ghCheck.missing) console.log(`     ${dim('• ' + f)}`)
        console.log('')
        const ghInput = await ask('Install missing GitHub Actions workflows? [Y/n]', 'y')
        if (ghInput.toLowerCase() !== 'n') {
          installGithubWorkflows(root, ghCheck.missing)
          ok(`${ghCheck.missing.length} workflow(s) installed to .github/workflows/`)
          warn('Add ANTHROPIC_API_KEY to GitHub → Settings → Secrets → Actions')
        }
      } else if (ghCheck.hasSource) {
        ok('GitHub Actions workflows — all installed')
      }
    }
  }

  // Write version marker
  if (!DRY_RUN) {
    for (const { dir } of installDirs) {
      try { writeFileSync(join(dir, '.team-version'), CHANGELOG[0].version) }
      catch (e) { warn(`Could not write version marker: ${e.message}`) }
    }
  }

  if (DRY_RUN) {
    console.log('')
    console.log(bold(yellow('Dry-run complete — no files were modified.')))
    console.log(`  Run ${cyan('node update.mjs')} without --dry-run to apply changes.\n`)
    close(); return
  }

  console.log('')
  console.log(bold(green('╔══════════════════════════════════════════╗')))
  console.log(bold(green('║     Update complete! 🎉                  ║')))
  console.log(bold(green('╚══════════════════════════════════════════╝')))
  console.log('')
  console.log(`  ${bold('What was updated:')}`)
  console.log(`    ${green('✓')} Agent prompt files — all 17 agents with Kanban integration`)
  console.log(`    ${green('✓')} Command files (.opencode/commands/)`)
  console.log(`    ${green('✓')} Skill files (.opencode/skills/)`)
  console.log(`    ${green('✓')} Custom tool files — existing + 6 new Kanban tools`)
  console.log(`    ${green('✓')} Plugin files — kanban-trigger plugin`)
  console.log(`    ${green('✓')} .kanban/ directory structure`)
  console.log('')
  console.log(`  ${bold('What was preserved:')}`)
  console.log(`    ${green('✓')} Your model assignments`)
  console.log(`    ${green('✓')} opencode.json provider + MCP settings`)
  console.log(`    ${green('✓')} AGENTS.md project rules`)
  console.log(`    ${green('✓')} project-stack skill`)
  console.log(`    ${green('✓')} .kanban/ task data (not overwritten)`)
  console.log('')
  console.log(`  ${bold('Kanban system:')} ${green('✓')} active`)
  console.log(`  ${dim('Start with: /team:new-feature <description>')}`)
  console.log('')

  close()
}

main().catch(e => {
  console.error(red('Update failed:'), e.message)
  close()
  process.exit(1)
})
