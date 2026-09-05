import { tokenize, decodeStringLiteral } from './tokenize.js'

const UNARY = new Set(['!', '~', '+', '-', 'typeof', 'void', 'delete'])
const PREC = {
    '||': 1,
    '??': 1,
    '&&': 2,
    '|': 3,
    '^': 4,
    '&': 5,
    '==': 6,
    '!=': 6,
    '===': 6,
    '!==': 6,
    '<': 7,
    '>': 7,
    '<=': 7,
    '>=': 7,
    in: 7,
    instanceof: 7,
    '<<': 8,
    '>>': 8,
    '>>>': 8,
    '+': 9,
    '-': 9,
    '*': 10,
    '/': 10,
    '%': 10,
    '**': 11,
}

class Parser {
    constructor(source) {
        this.source = source
        this.tokens = tokenize(source)
        this.pos = 0
    }

    peek(offset = 0) {
        return this.tokens[this.pos + offset] || { type: 'eof', value: '' }
    }

    advance() {
        return this.tokens[this.pos++]
    }

    at(type, value) {
        const t = this.peek()
        if (type && t.type !== type) {
            if (value === ':' && t.type === 'op' && t.value === ':') return true
            return false
        }
        if (value !== undefined && t.value !== value) return false
        return true
    }

    expect(type, value) {
        if (this.at(type, value)) return this.advance()
        const t = this.peek()
        throw new Error(`Unexpected token ${t.value || t.type} at ${t.start}`)
    }

    expectOptionalSemicolon() {
        if (this.at('punc', ';')) this.advance()
    }

    /** Reserved words are valid property and object keys: `map.delete`, `{ class: 'x' }`. */
    expectPropertyName() {
        if (this.at('kw')) return this.advance().value
        return this.expect('name').value
    }

    /** A line break ends the statement, so `return` on its own line takes no argument. */
    newlineBeforeNext() {
        const previous = this.tokens[this.pos - 1]
        if (!previous) return false
        return this.source.slice(previous.end, this.peek().start).indexOf('\n') !== -1
    }

    parseExpression() {
        return this.parseAssignment()
    }

    parseAssignment() {
        const arrow = this.tryParseArrow()
        if (arrow) return arrow

        let left = this.parseConditional()
        if (
            this.at('op', '=') ||
            this.at('op', '+=') ||
            this.at('op', '-=') ||
            this.at('op', '*=') ||
            this.at('op', '/=') ||
            this.at('op', '%=')
        ) {
            const op = this.advance().value
            const right = this.parseAssignment()
            // `[a, b] = pair` parses as an array literal first, so reinterpret it as a pattern.
            if (op === '=' && (left.type === 'Array' || left.type === 'Object')) {
                left = expressionToPattern(left)
            }
            return { type: 'Assign', op, left, right }
        }
        return left
    }

    /** Params and a parenthesized expression start alike, so try the param list and back off. */
    tryParseArrow() {
        const t = this.peek()
        if (t.type === 'name' && this.peek(1).type === 'op' && this.peek(1).value === '=>') {
            const param = this.advance().value
            this.advance()
            return this.parseArrowFunction([{ type: 'Ident', name: param }])
        }
        if (!(t.type === 'punc' && t.value === '(')) return null

        const checkpoint = this.pos
        try {
            const params = this.parseParamList()
            if (this.at('op', '=>')) {
                this.advance()
                return this.parseArrowFunction(params)
            }
        } catch (_) {
            /* not a parameter list */
        }
        this.pos = checkpoint
        return null
    }

    parseConditional() {
        let node = this.parseBinary(0)
        if (this.at('punc', '?') || (this.at('op', '?') && this.peek(1).value !== '?')) {
            this.advance()
            const consequent = this.parseExpression()
            this.expect('punc', ':')
            const alternate = this.parseConditional()
            return { type: 'Cond', test: node, consequent, alternate }
        }
        return node
    }

    parseBinary(minPrec) {
        let left = this.parseUnary()
        while (true) {
            const t = this.peek()
            let op = null
            if (t.type === 'op' && PREC[t.value] != null) op = t.value
            if (t.type === 'kw' && (t.value === 'in' || t.value === 'instanceof')) op = t.value
            if (!op || PREC[op] < minPrec) break
            this.advance()
            const right = this.parseBinary(PREC[op] + 1)
            left = { type: 'Binary', op, left, right }
        }
        return left
    }

    parseUnary() {
        const t = this.peek()
        if ((t.type === 'op' && UNARY.has(t.value)) || (t.type === 'kw' && UNARY.has(t.value))) {
            const op = this.advance().value
            return { type: 'Unary', op, arg: this.parseUnary() }
        }
        return this.parsePostfix()
    }

    parsePostfix() {
        let node = this.parsePrimary()
        let optional = false
        while (true) {
            if (this.at('op', '?.')) {
                this.advance()
                optional = true
                if (this.at('punc', '(')) {
                    this.advance()
                    const args = this.parseArgumentList()
                    this.expect('punc', ')')
                    node = { type: 'Call', callee: node, args, optional: true }
                } else if (this.at('punc', '[')) {
                    this.advance()
                    const property = this.parseExpression()
                    this.expect('punc', ']')
                    node = { type: 'Member', object: node, property, computed: true, optional: true }
                } else {
                    node = {
                        type: 'Member',
                        object: node,
                        property: this.expectPropertyName(),
                        computed: false,
                        optional: true,
                    }
                }
                continue
            }
            if (this.at('punc', '.')) {
                this.advance()
                node = { type: 'Member', object: node, property: this.expectPropertyName(), computed: false }
                continue
            }
            if (this.at('punc', '[')) {
                this.advance()
                const property = this.parseExpression()
                this.expect('punc', ']')
                node = { type: 'Member', object: node, property, computed: true }
                continue
            }
            if (this.at('punc', '(')) {
                this.advance()
                const args = this.parseArgumentList()
                this.expect('punc', ')')
                node = { type: 'Call', callee: node, args }
                continue
            }
            if (this.at('op', '++') || this.at('op', '--')) {
                const op = this.advance().value
                node = { type: 'Update', op, arg: node, prefix: false }
                continue
            }
            break
        }
        // A nullish link short-circuits the whole chain, so the chain needs an outer boundary.
        return optional ? { type: 'Chain', expr: node } : node
    }

    parsePrimary() {
        const t = this.peek()

        if (t.type === 'op' && (t.value === '++' || t.value === '--')) {
            const op = this.advance().value
            return { type: 'Update', op, arg: this.parseUnary(), prefix: true }
        }

        if (t.type === 'num') {
            this.advance()
            return { type: 'Literal', value: Number(t.value) }
        }
        if (t.type === 'str') {
            this.advance()
            return { type: 'Literal', value: decodeStringLiteral(t.value) }
        }
        if (t.type === 'tpl') {
            this.advance()
            return { type: 'Template', raw: t.value }
        }
        if (t.type === 're') {
            this.advance()
            const body = t.value.slice(1, t.value.lastIndexOf('/'))
            const flags = t.value.slice(t.value.lastIndexOf('/') + 1)
            return { type: 'Literal', value: new RegExp(body, flags) }
        }
        if (t.type === 'kw') {
            if (t.value === 'true' || t.value === 'false') {
                this.advance()
                return { type: 'Literal', value: t.value === 'true' }
            }
            if (t.value === 'null') {
                this.advance()
                return { type: 'Literal', value: null }
            }
            if (t.value === 'undefined') {
                this.advance()
                return { type: 'Literal', value: undefined }
            }
            if (t.value === 'this') {
                this.advance()
                return { type: 'This' }
            }
            if (t.value === 'function') {
                return this.parseFunctionExpr(false)
            }
            if (t.value === 'new') {
                this.advance()
                const callee = this.parsePrimary()
                this.expect('punc', '(')
                const args = this.parseArgumentList()
                this.expect('punc', ')')
                return { type: 'New', callee, args }
            }
        }
        if (t.type === 'name') {
            this.advance()
            return { type: 'Ident', name: t.value }
        }
        if (t.type === 'punc' && t.value === '(') {
            this.advance()
            const inner = this.parseExpression()
            this.expect('punc', ')')
            return inner
        }
        if (t.type === 'punc' && t.value === '[') {
            this.advance()
            const elements = []
            while (!this.at('punc', ']')) {
                if (this.at('punc', ',')) {
                    this.advance()
                    continue
                }
                if (this.at('op', '...')) {
                    this.advance()
                    elements.push({ type: 'Spread', arg: this.parseAssignment() })
                    continue
                }
                elements.push(this.parseExpression())
            }
            this.expect('punc', ']')
            return { type: 'Array', elements }
        }
        if (t.type === 'punc' && t.value === '{') {
            return this.parseObject()
        }

        throw new Error(`Unexpected token ${t.value || t.type} at ${t.start}`)
    }

    parseObject() {
        this.expect('punc', '{')
        const props = []
        if (!this.at('punc', '}')) {
            while (true) {
                if (this.at('op', '...')) {
                    this.advance()
                    props.push({ spread: true, value: this.parseAssignment() })
                    if (!this.at('punc', ',')) break
                    this.advance()
                    if (this.at('punc', '}')) break
                    continue
                }
                let key
                let computed = false
                if (this.at('punc', '[')) {
                    this.advance()
                    key = this.parseExpression()
                    this.expect('punc', ']')
                    computed = true
                } else if (this.at('str') || this.at('num')) {
                    const tok = this.advance()
                    key = tok.type === 'num' ? Number(tok.value) : decodeStringLiteral(tok.value)
                } else {
                    key = this.expectPropertyName()
                }
                let value = null
                if (this.at('punc', ':') || this.at('op', ':')) {
                    this.advance()
                    value = this.parseExpression()
                } else if (this.at('punc', '(')) {
                    value = this.parseFunctionExpr(true, key)
                } else {
                    value = { type: 'Ident', name: key }
                }
                props.push({ key, value, computed })
                if (!this.at('punc', ',')) break
                this.advance()
                if (this.at('punc', '}')) break
            }
        }
        this.expect('punc', '}')
        return { type: 'Object', props }
    }

    parseArgumentList() {
        const args = []
        if (this.at('punc', ')')) return args
        do {
            if (this.at('op', '...')) {
                this.advance()
                args.push({ type: 'Spread', arg: this.parseAssignment() })
            } else {
                args.push(this.parseExpression())
            }
        } while (this.at('punc', ',') && this.advance())
        return args
    }

    parseParamList() {
        this.expect('punc', '(')
        const params = []
        if (!this.at('punc', ')')) {
            do {
                if (this.at('op', '...')) {
                    this.advance()
                    params.push({ type: 'Rest', target: this.parseBindingTarget() })
                    break
                }
                params.push(this.parseBindingElement())
            } while (this.at('punc', ',') && this.advance())
        }
        this.expect('punc', ')')
        return params
    }

    /** A binding target plus its optional `= default`. */
    parseBindingElement() {
        const target = this.parseBindingTarget()
        if (!this.at('op', '=')) return target
        this.advance()
        return { type: 'Default', target, fallback: this.parseAssignment() }
    }

    parseBindingTarget() {
        if (this.at('punc', '{')) return this.parseObjectPattern()
        if (this.at('punc', '[')) return this.parseArrayPattern()
        return { type: 'Ident', name: this.expect('name').value }
    }

    parseObjectPattern() {
        this.expect('punc', '{')
        const props = []
        let rest = null
        while (!this.at('punc', '}')) {
            if (this.at('op', '...')) {
                this.advance()
                rest = this.parseBindingTarget()
                break
            }
            let key
            let computed = false
            if (this.at('punc', '[')) {
                this.advance()
                key = this.parseExpression()
                this.expect('punc', ']')
                computed = true
            } else if (this.at('str') || this.at('num')) {
                const tok = this.advance()
                key = tok.type === 'num' ? Number(tok.value) : decodeStringLiteral(tok.value)
            } else {
                key = this.expectPropertyName()
            }
            let value
            if (this.at('punc', ':') || this.at('op', ':')) {
                this.advance()
                value = this.parseBindingElement()
            } else if (this.at('op', '=')) {
                this.advance()
                value = { type: 'Default', target: { type: 'Ident', name: key }, fallback: this.parseAssignment() }
            } else {
                value = { type: 'Ident', name: key }
            }
            props.push({ key, computed, value })
            if (!this.at('punc', ',')) break
            this.advance()
        }
        this.expect('punc', '}')
        return { type: 'ObjectPattern', props, rest }
    }

    parseArrayPattern() {
        this.expect('punc', '[')
        const elements = []
        let rest = null
        while (!this.at('punc', ']')) {
            if (this.at('punc', ',')) {
                this.advance()
                elements.push(null)
                continue
            }
            if (this.at('op', '...')) {
                this.advance()
                rest = this.parseBindingTarget()
                break
            }
            elements.push(this.parseBindingElement())
            if (!this.at('punc', ',')) break
            this.advance()
        }
        this.expect('punc', ']')
        return { type: 'ArrayPattern', elements, rest }
    }

    parseFunctionExpr(alreadyConsumedKeyword, name = null) {
        if (!alreadyConsumedKeyword) this.expect('kw', 'function')
        if (!name && this.at('name')) name = this.advance().value
        const params = this.parseParamList()
        const body = this.parseBlock()
        return { type: 'Function', name, params, body }
    }

    parseArrowFunction(params) {
        let body
        let exprBody = false
        if (this.at('punc', '{')) {
            body = this.parseBlock()
        } else {
            exprBody = true
            body = this.parseExpression()
        }
        return { type: 'Arrow', params, body, exprBody }
    }

    parseBlock() {
        this.expect('punc', '{')
        const body = this.parseStatementListInner()
        this.expect('punc', '}')
        return body
    }

    parseStatementList() {
        return this.parseStatementListInner()
    }

    parseStatementListInner() {
        const stmts = []
        while (!this.at('punc', '}') && !this.at('eof')) {
            stmts.push(this.parseStatement())
        }
        return stmts
    }

    parseStatement() {
        const t = this.peek()

        if (t.type === 'kw' && t.value === 'function') {
            this.advance()
            let name = null
            if (this.at('name')) name = this.advance().value
            const params = this.parseParamList()
            const body = this.parseBlock()
            return { type: 'FunctionDecl', fn: { type: 'Function', name, params, body } }
        }

        if (t.type === 'kw' && (t.value === 'var' || t.value === 'let' || t.value === 'const')) {
            return this.parseVarDeclaration(true)
        }

        if (t.type === 'kw' && t.value === 'if') {
            this.advance()
            this.expect('punc', '(')
            const test = this.parseExpression()
            this.expect('punc', ')')
            const consequent = this.at('punc', '{') ? this.parseBlock() : [this.parseStatement()]
            let alternate = null
            if (this.at('kw', 'else')) {
                this.advance()
                alternate = this.at('punc', '{') ? this.parseBlock() : [this.parseStatement()]
            }
            return { type: 'If', test, consequent, alternate }
        }

        if (t.type === 'kw' && t.value === 'for') {
            return this.parseForStatement()
        }

        if (t.type === 'kw' && t.value === 'while') {
            this.advance()
            this.expect('punc', '(')
            const test = this.parseExpression()
            this.expect('punc', ')')
            const body = this.at('punc', '{') ? this.parseBlock() : [this.parseStatement()]
            return { type: 'While', test, body }
        }

        if (t.type === 'kw' && t.value === 'return') {
            this.advance()
            let arg = null
            if (!this.at('punc', ';') && !this.at('punc', '}') && !this.at('eof') && !this.newlineBeforeNext()) {
                arg = this.parseExpression()
            }
            this.expectOptionalSemicolon()
            return { type: 'Return', arg }
        }

        if (t.type === 'kw' && t.value === 'break') {
            this.advance()
            this.expectOptionalSemicolon()
            return { type: 'Break' }
        }

        if (t.type === 'kw' && t.value === 'continue') {
            this.advance()
            this.expectOptionalSemicolon()
            return { type: 'Continue' }
        }

        if (t.type === 'kw' && t.value === 'throw') {
            this.advance()
            const arg = this.parseExpression()
            this.expectOptionalSemicolon()
            return { type: 'Throw', arg }
        }

        if (t.type === 'kw' && t.value === 'try') {
            return this.parseTryStatement()
        }

        if (this.at('punc', '{')) {
            return { type: 'Block', body: this.parseBlock() }
        }

        const expr = this.parseExpression()
        this.expectOptionalSemicolon()
        return { type: 'ExprStmt', expr }
    }

    parseTryStatement() {
        this.advance()
        const block = this.parseBlock()
        let param = null
        let handler = null
        let finalizer = null

        if (this.at('kw', 'catch')) {
            this.advance()
            if (this.at('punc', '(')) {
                this.advance()
                param = this.parseBindingTarget()
                this.expect('punc', ')')
            }
            handler = this.parseBlock()
        }
        if (this.at('kw', 'finally')) {
            this.advance()
            finalizer = this.parseBlock()
        }
        if (!handler && !finalizer) {
            throw new Error('Missing catch or finally after try')
        }
        return { type: 'Try', block, param, handler, finalizer }
    }

    parseForStatement() {
        this.advance()
        this.expect('punc', '(')

        const checkpoint = this.pos
        if (this.at('kw', 'var') || this.at('kw', 'let') || this.at('kw', 'const')) {
            const kind = this.advance().value
            let target = null
            try {
                target = this.parseBindingTarget()
            } catch (_) {
                target = null
            }
            if (target && (this.at('kw', 'in') || this.at('kw', 'of'))) {
                const type = this.advance().value === 'in' ? 'ForIn' : 'ForOf'
                const right = this.parseExpression()
                this.expect('punc', ')')
                const body = this.at('punc', '{') ? this.parseBlock() : [this.parseStatement()]
                return { type, left: { kind, target }, right, body }
            }
            this.pos = checkpoint
        }

        let init = null
        if (!this.at('punc', ';')) {
            if (this.at('kw', 'var') || this.at('kw', 'let') || this.at('kw', 'const')) {
                init = this.parseVarDeclaration(false)
            } else {
                init = { type: 'ExprStmt', expr: this.parseExpression() }
            }
        }
        this.expect('punc', ';')
        let test = null
        if (!this.at('punc', ';')) test = this.parseExpression()
        this.expect('punc', ';')
        let update = null
        if (!this.at('punc', ')')) update = this.parseExpression()
        this.expect('punc', ')')
        const body = this.at('punc', '{') ? this.parseBlock() : [this.parseStatement()]
        return { type: 'For', init, test, update, body }
    }

    parseVarDeclaration(consumeSemicolon) {
        const kind = this.advance().value
        const decls = []
        do {
            const target = this.parseBindingTarget()
            let init = null
            if (this.at('op', '=')) {
                this.advance()
                init = this.parseExpression()
            }
            decls.push({ target, init })
        } while (this.at('punc', ',') && this.advance())
        if (consumeSemicolon) this.expectOptionalSemicolon()
        return { type: 'Var', kind, decls }
    }

    parseForHeader() {
        let init = null
        if (!this.at('punc', ';')) {
            init = { type: 'ExprStmt', expr: this.parseExpression() }
        }
        this.expect('punc', ';')
        let test = null
        if (!this.at('punc', ';')) test = this.parseExpression()
        this.expect('punc', ';')
        let update = null
        if (!this.at('eof')) update = this.parseExpression()
        return { type: 'For', init, test, update, body: [] }
    }
}

/**
 * `[a, b] = pair` and `({ a } = obj)` are indistinguishable from literals until the `=`
 * is seen, so the already-parsed literal is rewritten into a pattern after the fact.
 */
function expressionToPattern(node) {
    if (!node) return node
    if (node.type === 'Array') {
        const elements = []
        let rest = null
        for (const element of node.elements) {
            if (element && element.type === 'Spread') {
                rest = expressionToPattern(element.arg)
                continue
            }
            elements.push(element ? expressionToPattern(element) : null)
        }
        return { type: 'ArrayPattern', elements, rest }
    }
    if (node.type === 'Object') {
        const props = []
        let rest = null
        for (const prop of node.props) {
            if (prop.spread) {
                rest = expressionToPattern(prop.value)
                continue
            }
            props.push({ key: prop.key, computed: prop.computed, value: expressionToPattern(prop.value) })
        }
        return { type: 'ObjectPattern', props, rest }
    }
    if (node.type === 'Assign' && node.op === '=') {
        return { type: 'Default', target: expressionToPattern(node.left), fallback: node.right }
    }
    return node
}

export function parseExpression(source) {
    return new Parser(String(source).trim()).parseExpression()
}

/** Parses a bare parameter list (no surrounding parentheses) into binding patterns. */
export function parseParams(source) {
    return new Parser(`(${String(source).trim()})`).parseParamList()
}

export function parseObjectLiteral(source) {
    const src = String(source).trim()
    const wrapped = src.startsWith('{') ? src : `{${src}}`
    return new Parser(wrapped).parseExpression()
}

export function parseStatementList(source) {
    return new Parser(String(source).trim()).parseStatementList()
}

export function parseForHeader(source) {
    return new Parser(String(source).trim()).parseForHeader()
}

export { Parser }
