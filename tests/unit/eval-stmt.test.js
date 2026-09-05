import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseStatementList } from '../../src/jslade/ast/parse-expr.js'
import { evalStatementList } from '../../src/jslade/ast/eval-stmt.js'

function run(source, vars = {}) {
    const body = parseStatementList(source)
    const scope = {
        vars,
        locals: Object.create(null),
        _break: false,
        _continue: false,
        _returned: false,
        _return: undefined,
    }
    return evalStatementList(body, scope)
}

describe('evalStatementList runtime', () => {
    it('runs for loops with break and continue', () => {
        const vars = { n: 0, sum: 0 }
        run(
            `for (var i = 0; i < 10; i++) {
                if (i === 3) continue
                if (i === 7) break
                sum = sum + i
            }
            n = i`,
            vars
        )
        assert.equal(vars.sum, 0 + 1 + 2 + 4 + 5 + 6)
        assert.equal(vars.n, 7)
    })

    it('runs while loops', () => {
        const vars = { count: 0 }
        run(
            `var n = 0
            while (n < 5) {
                count = count + 1
                n = n + 1
            }`,
            vars
        )
        assert.equal(vars.count, 5)
    })

    it('runs for…in over object keys', () => {
        const vars = { keys: [], bag: { a: 1, b: 2 } }
        run(
            `for (var k in bag) {
                keys.push(k)
            }`,
            vars
        )
        assert.deepEqual(vars.keys.sort(), ['a', 'b'])
    })

    it('runs for…of over arrays', () => {
        const vars = { total: 0, items: [2, 3, 4] }
        run(
            `for (var x of items) {
                total = total + x
            }`,
            vars
        )
        assert.equal(vars.total, 9)
    })

    it('runs try/catch/finally', () => {
        const vars = { err: '', flag: false }
        run(
            `try {
                throw 'bad'
            } catch (e) {
                err = e
            } finally {
                flag = true
            }`,
            vars
        )
        assert.equal(vars.err, 'bad')
        assert.equal(vars.flag, true)
    })

    it('restores catch parameter bindings after the clause', () => {
        const vars = { e: 'outer', seen: '' }
        run(
            `try {
                throw 'inner'
            } catch (e) {
                seen = e
            }`,
            vars
        )
        assert.equal(vars.seen, 'inner')
        assert.equal(vars.e, 'outer')
    })

    it('returns early from functions via return', () => {
        const vars = {}
        const value = run(
            `function pick() {
                if (true) return 42
                return 0
            }
            pick()`,
            vars
        )
        assert.equal(value, 42)
    })

    it('throws from throw statements', () => {
        assert.throws(
            () =>
                run(`throw 'fail'`, {}),
            (err) => err === 'fail'
        )
    })

    it('runs if/else branches', () => {
        const vars = { mode: 'b', out: '' }
        run(
            `if (mode === 'a') {
                out = 'A'
            } else {
                out = 'B'
            }`,
            vars
        )
        assert.equal(vars.out, 'B')
    })
})
