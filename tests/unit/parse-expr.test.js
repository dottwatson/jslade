import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseExpression, parseStatementList } from '../../src/jslade/ast/parse-expr.js'
import { evalExpression } from '../../src/jslade/ast/eval-expr.js'

function rejectsStatement(source) {
    assert.throws(() => parseStatementList(source), { message: /.+/ })
}

function rejectsExpression(source) {
    assert.throws(() => parseExpression(source), { message: /.+/ })
}

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

    it('respects operator precedence via evaluation', () => {
        const ast = parseExpression('1 + 2 * 3')
        const value = evalExpression(ast, { vars: {}, locals: Object.create(null) })
        assert.equal(value, 7)
    })

    it('parses logical and nullish mixing', () => {
        assert.doesNotThrow(() => parseExpression('a && b || c'))
        assert.doesNotThrow(() => parseExpression('a ?? b ?? c'))
    })

    it('parses spread in calls and array destructuring assignment', () => {
        assert.doesNotThrow(() => parseExpression('fn(1, ...rest)'))
        assert.doesNotThrow(() => parseExpression('[a, ...rest] = arr'))
    })

    it('parses typeof, instanceof, and in', () => {
        assert.doesNotThrow(() => parseExpression('typeof x === "string"'))
        assert.doesNotThrow(() => parseExpression('a instanceof Array'))
        assert.doesNotThrow(() => parseExpression('key in obj'))
    })

    it('parses compound assignment +=', () => {
        const ast = parseExpression('count += 1')
        assert.equal(ast.type, 'Assign')
        assert.equal(ast.op, '+=')
    })

    it('rejects malformed incomplete expressions', () => {
        rejectsExpression('(unclosed')
        rejectsExpression('1 +')
        rejectsExpression('foo(bar')
        rejectsExpression('')
    })
})

describe('parseStatementList', () => {
    it('rejects async/await', () => {
        rejectsStatement('async function x() {}')
    })

    it('rejects class keyword', () => {
        rejectsStatement('class Foo {}')
    })

    it('rejects switch', () => {
        rejectsStatement('switch (x) { case 1: break; }')
    })

    it('rejects generators', () => {
        rejectsStatement('function* gen() {}')
    })

    it('rejects logical assignment ??=', () => {
        rejectsStatement('a ??= b')
    })

    it('rejects do…while', () => {
        rejectsStatement('do { x } while (y)')
    })

    it('parses nested destructuring with defaults and rest', () => {
        const stmts = parseStatementList('let { a, b: { c = 1, ...inner }, ...top } = obj')
        assert.equal(stmts.length, 1)
        assert.equal(stmts[0].type, 'Var')
    })

    it('parses try/catch/finally', () => {
        const stmts = parseStatementList('try { x() } catch (e) { log(e) } finally { done() }')
        assert.equal(stmts.length, 1)
        assert.equal(stmts[0].type, 'Try')
        assert.ok(stmts[0].handler)
        assert.ok(stmts[0].finalizer)
    })

    it('requires catch or finally after try', () => {
        rejectsStatement('try { x() }')
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

    it('evaluates compound assignment +=', () => {
        const ast = parseExpression('count += 3')
        const vars = { count: 2 }
        const value = evalExpression(ast, { vars, locals: Object.create(null) })
        assert.equal(value, 5)
        assert.equal(vars.count, 5)
    })
})
