import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    Jslade,
    escapeHtml,
    createDirectiveRegistry,
    compileMarkupSource,
    parseDirectiveToken,
    parseForeachExpression,
    readBalancedParentheses,
} from '../../src/jslade/index.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('public API exports', () => {
    it('exports Jslade object with core methods', () => {
        assert.equal(typeof Jslade.import, 'function')
        assert.equal(typeof Jslade.start, 'function')
        assert.equal(typeof Jslade.bootstrap, 'function')
        assert.equal(typeof Jslade.render, 'function')
        assert.equal(typeof Jslade.renderTo, 'function')
        assert.equal(typeof Jslade.compile, 'function')
        assert.equal(typeof Jslade.directive, 'function')
        assert.equal(typeof Jslade.send, 'function')
        assert.equal(typeof Jslade.sendState, 'function')
        assert.equal(typeof Jslade.receive, 'function')
    })

    it('exports compile helpers', () => {
        assert.equal(typeof escapeHtml, 'function')
        assert.equal(typeof createDirectiveRegistry, 'function')
        assert.equal(typeof compileMarkupSource, 'function')
        assert.equal(typeof parseDirectiveToken, 'function')
        assert.equal(typeof parseForeachExpression, 'function')
        assert.equal(typeof readBalancedParentheses, 'function')
    })
})

describe('dist bundle guard symbols', () => {
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

    it('jslade.min.js contains required public symbols', () => {
        const min = readFileSync(path.join(packageRoot, 'dist', 'jslade.min.js'), 'utf8')
        for (const symbol of required) {
            assert.ok(min.includes(symbol), `missing symbol "${symbol}" in jslade.min.js`)
        }
    })
})
