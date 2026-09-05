/**
 * Run unit tests under c8 coverage (cross-platform file list).
 */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const unitFiles = readdirSync(path.join(root, 'tests/unit'))
    .filter((name) => name.endsWith('.test.js'))
    .map((name) => path.join('tests/unit', name))

const c8Bin = path.join(root, 'node_modules', 'c8', 'bin', 'c8.js')
const args = [
    c8Bin,
    '--reporter=text',
    '--reporter=lcov',
    '--include=src/jslade/**/*.js',
    process.execPath,
    '--test',
    ...unitFiles,
]

const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: root, shell: false })
process.exit(result.status ?? 1)
