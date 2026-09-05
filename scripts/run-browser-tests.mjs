/**
 * Run all browser test pages via Playwright.
 * Each page must set window.__results = { passed, failed }.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const distFile = path.join(packageRoot, 'dist', 'jslade.js')

const BROWSER_SUITES = [
    { name: 'DOM patch', path: '/tests/patch.html' },
    { name: 'Integration', path: '/tests/browser/integration.html' },
    { name: 'Scoped CSS', path: '/tests/browser/scoped-css.html' },
    { name: 'Min bundle', path: '/tests/browser/bundle-min.html' },
]

if (!fs.existsSync(distFile)) {
    console.error('[browser] Missing dist/jslade.js — run npm run build first')
    process.exit(1)
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
}

function safePath(root, urlPath) {
    const decoded = decodeURIComponent(urlPath.split('?')[0])
    const rel = decoded.replace(/^\/+/, '') || 'index.html'
    const abs = path.resolve(root, rel)
    if (!abs.startsWith(root + path.sep) && abs !== root) return null
    return abs
}

function createStaticServer(root) {
    return http.createServer((req, res) => {
        const abs = safePath(root, req.url || '/')
        if (!abs || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
            res.writeHead(404)
            res.end('Not found')
            return
        }
        const ext = path.extname(abs)
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
        fs.createReadStream(abs).pipe(res)
    })
}

function listen(server) {
    return new Promise((resolve, reject) => {
        server.listen(0, '127.0.0.1', () => resolve(server.address().port))
        server.on('error', reject)
    })
}

async function runSuite(page, baseUrl, suite) {
    const url = baseUrl + suite.path
    await page.goto(url, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__results != null, null, { timeout: 30000 })

    const results = await page.evaluate(() => window.__results)
    const lines = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#out li')).map((li) => ({
            ok: li.classList.contains('ok'),
            text: li.textContent,
        }))
    )

    console.log(`\n[browser] ${suite.name} (${suite.path})`)
    for (const line of lines) {
        console.log(`${line.ok ? '  ✓' : '  ✗'} ${line.text}`)
    }
    console.log(`  → ${results.passed} passed, ${results.failed} failed`)

    return results
}

const server = createStaticServer(packageRoot)
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

    for (const suite of BROWSER_SUITES) {
        const results = await runSuite(page, baseUrl, suite)
        totalPassed += results.passed
        totalFailed += results.failed
    }

    console.log(`\n[browser] total: ${totalPassed} passed, ${totalFailed} failed`)

    if (totalFailed > 0) process.exit(1)
} finally {
    if (browser) await browser.close()
    server.close()
}
