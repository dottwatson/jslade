/**
 * Run unit tests (Node) then browser tests (Playwright).
 */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const unitFiles = readdirSync(path.join(root, 'tests/unit'))
    .filter((name) => name.endsWith('.test.js'))
    .map((name) => path.join('tests/unit', name))

function run(label, cmd, args) {
    console.log(`\n=== ${label} ===\n`)
    const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, shell: false })
    if (result.status !== 0) process.exit(result.status ?? 1)
}

run('Unit tests', process.execPath, ['--test', ...unitFiles])
run('Browser tests', process.execPath, [path.join('scripts', 'run-browser-tests.mjs')])

console.log('\n[test] all suites passed\n')
