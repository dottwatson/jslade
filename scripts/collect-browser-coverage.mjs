/**
 * Run browser suites under Playwright JS coverage and write lcov mapped to src/jslade/.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import v8toIstanbul from 'v8-to-istanbul'
import libCoverage from 'istanbul-lib-coverage'
import libReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'
import {
    BROWSER_SUITES,
    createStaticServer,
    listen,
    packageRoot,
    runSuite,
} from './lib/browser-tests.mjs'

const distFile = path.join(packageRoot, 'dist', 'jslade.js')
const sourceMapFile = path.join(packageRoot, 'dist', 'jslade.js.map')
const reportDir = path.join(packageRoot, 'coverage', 'browser')

export async function collectBrowserCoverage() {
    if (!fs.existsSync(distFile)) {
        throw new Error('Missing dist/jslade.js — run npm run build:bundle with COVERAGE=1 first')
    }
    if (!fs.existsSync(sourceMapFile)) {
        throw new Error('Missing dist/jslade.js.map — rebuild with COVERAGE=1 for source-mapped browser coverage')
    }

    const server = createStaticServer()
    const port = await listen(server)
    const baseUrl = `http://127.0.0.1:${port}`

    let browser
    try {
        browser = await chromium.launch({ headless: true })
        const page = await browser.newPage()
        page.on('pageerror', (err) => {
            console.error('[coverage] page error:', err.message)
        })

        await page.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousScripts: false })

        for (const suite of BROWSER_SUITES) {
            const result = await runSuite(page, baseUrl, suite)
            if (result.results.failed > 0) {
                throw new Error(`Browser suite failed during coverage: ${suite.path}`)
            }
        }

        const v8Coverage = await page.coverage.stopJSCoverage()
        const jsladeEntries = v8Coverage.filter((entry) => entry.url.includes('/dist/jslade.js'))
        if (!jsladeEntries.length) {
            throw new Error('No V8 coverage collected for dist/jslade.js')
        }

        const coverageMap = libCoverage.createCoverageMap({})
        for (const entry of jsladeEntries) {
            const converter = v8toIstanbul(distFile, 0, {
                source: fs.readFileSync(distFile, 'utf8'),
            })
            await converter.load()
            converter.applyCoverage(entry.functions)
            coverageMap.merge(converter.toIstanbul())
        }

        fs.mkdirSync(reportDir, { recursive: true })
        const context = libReport.createContext({
            dir: reportDir,
            coverageMap,
            defaultSummarizer: 'nested',
        })
        reports.create('lcovonly', {}).execute(context)

        return path.join(reportDir, 'lcov.info')
    } finally {
        if (browser) await browser.close()
        server.close()
    }
}
