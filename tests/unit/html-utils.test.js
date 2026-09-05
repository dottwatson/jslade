import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    escapeHtml,
    scopeStylesheet,
    readBalancedParentheses,
    parseDirectiveToken,
    parseForeachExpression,
    isEscapedAtSign,
    advancePastBladeComment,
} from '../../src/jslade/lib/html-utils.js'

describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
        assert.equal(escapeHtml('<b>"\'&</b>'), '&lt;b&gt;&quot;&#39;&amp;&lt;/b&gt;')
    })

    it('returns empty string for null/undefined', () => {
        assert.equal(escapeHtml(null), '')
        assert.equal(escapeHtml(undefined), '')
    })
})

describe('scopeStylesheet', () => {
    it('prefixes selectors with scope attribute', () => {
        const css = '.row { color: red; }'
        const scoped = scopeStylesheet(css, 'tpl-demo')
        assert.match(scoped, /\[style-scoped="tpl-demo"\] \.row/)
        assert.match(scoped, /\[style-scoped="tpl-demo"\]\.row/)
    })
})

describe('readBalancedParentheses', () => {
    it('extracts nested expression', () => {
        const src = 'fn(a, (b, c))'
        const open = src.indexOf('(')
        const result = readBalancedParentheses(src, open)
        assert.equal(result.innerExpression, 'a, (b, c)')
    })
})

describe('parseDirectiveToken', () => {
    it('parses @click(this.foo())', () => {
        const token = parseDirectiveToken('@click(this.foo())', 0)
        assert.equal(token.name, 'click')
        assert.equal(token.expression, 'this.foo()')
    })

    it('parses block directive @foreach(items as item)', () => {
        const token = parseDirectiveToken('@foreach(items as item)', 0)
        assert.equal(token.name, 'foreach')
        assert.equal(token.expression, 'items as item')
    })
})

describe('parseForeachExpression', () => {
    it('splits array and item variable', () => {
        assert.deepEqual(parseForeachExpression('items as item'), {
            arrayExpression: 'items',
            itemVariable: 'item',
        })
    })
})

describe('literal @ escaping', () => {
    it('detects @@ as escaped at-sign', () => {
        assert.equal(isEscapedAtSign('@@if', 1), true)
        assert.equal(isEscapedAtSign('@if', 0), false)
    })
})

describe('blade comments', () => {
    it('skips {{-- comment --}}', () => {
        const src = 'a{{-- hidden --}}b'
        const end = advancePastBladeComment(src, 1, true)
        assert.equal(src.slice(end), 'b')
    })
})
