#!/usr/bin/env node

import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(__dirname, '..')

const usage = `OpenCode Agent Team

Usage:
  opencode-team              Run the interactive installer
  opencode-team install      Run the interactive installer
  opencode-team update       Update an existing installation
  opencode-team help         Show this help

GitHub npx:
  npx github:<owner>/<repo>
  npx github:<owner>/<repo> opencode-team
  npx --package github:<owner>/<repo> opencode-team
`

function runScript(scriptName, args = []) {
  const result = spawnSync(process.execPath, [join(packageRoot, scriptName), ...args], {
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(`Failed to run ${scriptName}: ${result.error.message}`)
    process.exit(1)
  }

  process.exit(result.status ?? 0)
}

const args = process.argv.slice(2)

// `npx github:<owner>/<repo> opencode-team` can pass the binary name as an
// argument to the package binary. Treat it as a harmless prefix.
if (args[0] === 'opencode-team') args.shift()

const command = args.shift()

switch (command) {
  case undefined:
  case 'install':
    runScript('install.mjs', args)
    break
  case 'update':
    runScript('update.mjs', args)
    break
  case 'help':
  case '--help':
  case '-h':
    console.log(usage)
    break
  default:
    console.error(`Unknown command: ${command}\n`)
    console.error(usage)
    process.exit(1)
}
