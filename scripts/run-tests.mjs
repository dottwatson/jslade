/**
 * Run browser DOM tests in tests/patch.html via Playwright.
 * Requires: npm run build (dist/jslade.js must exist).
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const distFile = path.join(packageRoot, 'dist', 'jslade.js')

if (!fs.existsSync(distFile)) {
    console.error('[test] Missing dist/jslade.js — run npm run build first')
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

const server = createStaticServer(packageRoot)
const port = await listen(server)
const url = `http://127.0.0.1:${port}/tests/patch.html`

let browser
try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    page.on('pageerror', (err) => {
        console.error('[test] page error:', err.message)
    })

    await page.goto(url, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__results != null, null, { timeout: 30000 })

    const results = await page.evaluate(() => window.__results)
    const lines = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#out li')).map((li) => ({
            ok: li.classList.contains('ok'),
            text: li.textContent,
        }))
    )

    for (const line of lines) {
        console.log(`${line.ok ? '  ✓' : '  ✗'} ${line.text}`)
    }

    console.log('')
    console.log(`[test] ${results.passed} passed, ${results.failed} failed`)

    if (results.failed > 0) process.exit(1)
} finally {
    if (browser) await browser.close()
    server.close()
}
