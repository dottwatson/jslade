import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseExpression, parseStatementList } from '../../src/jslade/ast/parse-expr.js'
import { evalExpression } from '../../src/jslade/ast/eval-expr.js'

describe('parseExpression', () => {
    it('parses optional chaining', () => {
        assert.doesNotThrow(() => parseExpression('a?.b?.c'))
    })

    it('parses ternary and nullish coalescing', () => {
        const ast = parseExpression('a ? b : c ?? d')
        assert.ok(ast)
    })

    it('parses destructuring assignment', () => {
        const stmts = parseStatementList('let { a, b } = obj')
        assert.equal(stmts.length, 1)
    })

    it('rejects async/await', () => {
        assert.throws(() => parseStatementList('async function x() {}'))
    })

    it('rejects class keyword', () => {
        assert.throws(() => parseStatementList('class Foo {}'))
    })

    it('rejects switch', () => {
        assert.throws(() => parseStatementList('switch (x) { case 1: break; }'))
    })
})

describe('evalExpression', () => {
    it('evaluates arithmetic and member access', () => {
        const ast = parseExpression('(2 + 3) * items.length')
        const value = evalExpression(ast, {
            vars: { items: [1, 2, 3] },
            locals: Object.create(null),
        })
        assert.equal(value, 15)
    })

    it('short-circuits optional chaining', () => {
        const ast = parseExpression('obj?.missing?.n')
        const value = evalExpression(ast, { vars: { obj: null }, locals: Object.create(null) })
        assert.equal(value, undefined)
    })
})
