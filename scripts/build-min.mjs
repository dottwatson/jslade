#!/usr/bin/env node
/**
 * Bundle src/jslade, then minify it. Produces exactly two distributed files:
 * dist/jslade.js and dist/jslade.min.js.
 *
 * Usage:  npm run build
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const bundle = spawnSync(process.execPath, [join(root, 'scripts', 'build-bundle.mjs')], { stdio: 'inherit' })
if (bundle.status !== 0) process.exit(bundle.status ?? 1)

/**
 * A stale or mangled bundle must never ship silently. These are object property names,
 * which terser preserves; matching on `name(` would break as soon as it compacts a method.
 */
const required = [
    'start',
    'bootstrap',
    'mountAll',
    'renderTo',
    'scanDOM',
    'compiledComponents',
    'directive',
    'sendState',
]

const srcPath = join(root, 'dist', 'jslade.js')
const outPath = join(root, 'dist', 'jslade.min.js')
const source = readFileSync(srcPath, 'utf8')

const result = spawnSync('npx', ['--yes', 'terser', srcPath, '--compress', '--mangle', '--comments', 'false'], {
    encoding: 'utf8',
    shell: true,
})

if (result.status !== 0) {
    console.error(result.stderr)
    process.exit(1)
}

const minified = result.stdout.trim() + '\n'

for (const symbol of required) {
    if (!minified.includes(symbol)) {
        console.error(`Build aborted: jslade.min.js is missing "${symbol}".`)
        process.exit(1)
    }
}

writeFileSync(outPath, minified, 'utf8')

const kb = (bytes) => (bytes / 1024).toFixed(1) + ' KB'
console.log(`jslade.js      ${kb(source.length)}`)
console.log(`jslade.min.js  ${kb(minified.length)}  (-${((1 - minified.length / source.length) * 100).toFixed(1)}%)`)
