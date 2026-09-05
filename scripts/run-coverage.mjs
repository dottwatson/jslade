/**
 * Unified coverage: unit (c8) + browser (Playwright V8 → src via source maps).
 * Writes coverage/lcov.info and badges/coverage.json for the README shield.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, rmSync, existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { mergeCoverageReportFiles } from 'lcov-result-merger'
import { collectBrowserCoverage } from './collect-browser-coverage.mjs'
import { lineCoveragePercent, printCoverageSummary, writeCoverageBadge } from './lib/coverage-summary.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const unitFiles = readdirSync(path.join(root, 'tests/unit'))
    .filter((name) => name.endsWith('.test.js'))
    .map((name) => path.join('tests/unit', name))

const c8Bin = path.join(root, 'node_modules', 'c8', 'bin', 'c8.js')
const unitReportDir = path.join(root, 'coverage', 'unit')
const mergedLcov = path.join(root, 'coverage', 'lcov.info')

function run(label, cmd, args, env = process.env) {
    console.log(`\n=== ${label} ===\n`)
    const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, shell: false, env })
    if (result.status !== 0) process.exit(result.status ?? 1)
}

function buildForCoverage() {
    run('Build bundle (source maps)', process.execPath, [path.join('scripts', 'build-bundle.mjs')], {
        ...process.env,
        COVERAGE: '1',
    })
}

function runUnitCoverage() {
    rmSync(unitReportDir, { recursive: true, force: true })
    run('Unit coverage (c8)', process.execPath, [
        c8Bin,
        '--clean=true',
        '--report-dir=coverage/unit',
        '--reporter=lcov',
        '--include=src/jslade/**/*.js',
        process.execPath,
        '--test',
        ...unitFiles,
    ])
}

async function mergeReports(browserLcov) {
    const unitLcov = path.join(unitReportDir, 'lcov.info')
    if (!existsSync(unitLcov)) {
        throw new Error(`Missing unit lcov at ${unitLcov}`)
    }
    if (!existsSync(browserLcov)) {
        throw new Error(`Missing browser lcov at ${browserLcov}`)
    }

    mkdirSync(path.join(root, 'coverage'), { recursive: true })
    const tempFile = await mergeCoverageReportFiles([unitLcov, browserLcov])
    copyFileSync(tempFile, mergedLcov)
    // Normalize Windows backslashes so shields + merges stay stable cross-platform.
    const normalized = readFileSync(mergedLcov, 'utf8').replace(/SF:([^\n]+)/g, (_, file) => {
        return `SF:${file.replace(/\\/g, '/')}`
    })
    writeFileSync(mergedLcov, normalized)
}

async function main() {
    buildForCoverage()
    runUnitCoverage()

    console.log('\n=== Browser coverage (Playwright) ===\n')
    const browserLcov = await collectBrowserCoverage()

    await mergeReports(browserLcov)

    const percent = printCoverageSummary(mergedLcov, 'unified (unit + browser)')
    writeCoverageBadge(root, lineCoveragePercent(mergedLcov))
    console.log(`[coverage] badge → badges/coverage.json (${percent}%)\n`)
}

main().catch((error) => {
    console.error('[coverage]', error.message)
    process.exit(1)
})
