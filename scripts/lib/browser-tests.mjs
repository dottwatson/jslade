/**
 * Shared browser test server and suite runner (Playwright).
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const packageRoot = path.resolve(__dirname, '../..')

/** Suites that exercise dist/jslade.js (used for source-mapped coverage). */
export const BROWSER_SUITES = [
    { name: 'DOM patch', path: '/tests/patch.html' },
    { name: 'Integration', path: '/tests/browser/integration.html' },
    { name: 'Scoped CSS', path: '/tests/browser/scoped-css.html' },
]

/** Full suite list including min-bundle smoke test. */
export const ALL_BROWSER_SUITES = [
    ...BROWSER_SUITES,
    { name: 'Min bundle', path: '/tests/browser/bundle-min.html' },
]

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
}

function safePath(root, urlPath) {
    const decoded = decodeURIComponent(urlPath.split('?')[0])
    const rel = decoded.replace(/^\/+/, '') || 'index.html'
    const abs = path.resolve(root, rel)
    if (!abs.startsWith(root + path.sep) && abs !== root) return null
    return abs
}

export function createStaticServer(root = packageRoot) {
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

export function listen(server) {
    return new Promise((resolve, reject) => {
        server.listen(0, '127.0.0.1', () => resolve(server.address().port))
        server.on('error', reject)
    })
}

export async function runSuite(page, baseUrl, suite) {
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

    return { results, lines }
}

export function logSuiteResult(suite, { results, lines }) {
    console.log(`\n[browser] ${suite.name} (${suite.path})`)
    for (const line of lines) {
        console.log(`${line.ok ? '  ✓' : '  ✗'} ${line.text}`)
    }
    console.log(`  → ${results.passed} passed, ${results.failed} failed`)
}
