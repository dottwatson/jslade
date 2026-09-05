#!/usr/bin/env node
/**
 * Bundle src/jslade → dist/jslade.js (UMD).
 *
 * One distributed file, three ways to load it:
 *   <script src="jslade.js">      → window.Jslade (the engine sets it itself)
 *   require('jslade')             → { Jslade, escapeHtml, ... }
 *   import from a bundler          → resolved through the CommonJS tail
 *
 * Native ESM consumers import src/jslade/index.js, which is plain ESM already.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import * as esbuild from 'esbuild'
import prettier from 'prettier'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const srcDir = join(root, 'src', 'jslade')
const outDir = join(root, 'dist')
const outFile = join(outDir, 'jslade.js')
const prettierOptions = await prettier.resolveConfig(join(root, '.prettierrc.json'))

const banner = {
    js: [
        '/**',
        ' * Jslade — Client-side Component Engine',
        ' * Source: src/jslade/ — rebuild: npm run build',
        ' */',
    ].join('\n'),
}

const footer = {
    js: [
        '',
        '// UMD tail. The engine already assigns globalThis.Jslade for <script src>;',
        '// this only adds the named exports for CommonJS and AMD loaders.',
        'if (typeof module === "object" && module.exports) module.exports = __jsladeModule',
        'else if (typeof define === "function" && define.amd) define(function () { return __jsladeModule })',
    ].join('\n'),
}

await esbuild.build({
    entryPoints: [join(srcDir, 'index.js')],
    outfile: outFile,
    bundle: true,
    format: 'iife',
    globalName: '__jsladeModule',
    platform: 'browser',
    sourcemap: process.env.COVERAGE === '1' ? 'linked' : false,
    banner,
    footer,
})

const formatted = await prettier.format(readFileSync(outFile, 'utf8'), { ...prettierOptions, filepath: outFile })
writeFileSync(outFile, formatted, 'utf8')

console.log(`[build-bundle] UMD → ${outFile}`)
