/**
 * Run all browser test pages via Playwright.
 * Each page must set window.__results = { passed, failed }.
 */
import { chromium } from 'playwright'
import {
    ALL_BROWSER_SUITES,
    createStaticServer,
    listen,
    logSuiteResult,
    packageRoot,
    runSuite,
} from './lib/browser-tests.mjs'
import fs from 'node:fs'
import path from 'node:path'

const distFile = path.join(packageRoot, 'dist', 'jslade.js')

if (!fs.existsSync(distFile)) {
    console.error('[browser] Missing dist/jslade.js — run npm run build first')
    process.exit(1)
}

const server = createStaticServer()
const port = await listen(server)
const baseUrl = `http://127.0.0.1:${port}`

let totalPassed = 0
let totalFailed = 0
let browser

try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    page.on('pageerror', (err) => {
        console.error('[browser] page error:', err.message)
    })

    for (const suite of ALL_BROWSER_SUITES) {
        const result = await runSuite(page, baseUrl, suite)
        logSuiteResult(suite, result)
        totalPassed += result.results.passed
        totalFailed += result.results.failed
    }

    console.log(`\n[browser] total: ${totalPassed} passed, ${totalFailed} failed`)

    if (totalFailed > 0) process.exit(1)
} finally {
    if (browser) await browser.close()
    server.close()
}
