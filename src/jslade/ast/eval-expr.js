import { parseExpression } from './parse-expr.js'

/** Marks a nullish optional link so the rest of the chain is skipped up to its `Chain` boundary. */
const SHORT_CIRCUIT = Symbol('jslade.optionalChain')

export function evalExpression(node, scope) {
    if (!node) return undefined

    switch (node.type) {
        case 'Literal':
            return node.value
        case 'This':
            return scope.thisVal ?? scope.self
        case 'Ident':
            return resolveIdent(node.name, scope)
        case 'Chain': {
            const value = evalExpression(node.expr, scope)
            return value === SHORT_CIRCUIT ? undefined : value
        }
        case 'Member': {
            const object = evalExpression(node.object, scope)
            if (object === SHORT_CIRCUIT) return SHORT_CIRCUIT
            if (node.optional && object == null) return SHORT_CIRCUIT
            const property = node.computed ? evalExpression(node.property, scope) : node.property
            const isThis = node.object.type === 'This' || object === scope.thisVal || object === scope.self
            if (isThis && typeof property === 'string' && scope.methodsAst?.[property] && scope.callMethod) {
                return (...args) => scope.callMethod(property, args)
            }
            if (object == null) return undefined
            return object[property]
        }
        case 'Call': {
            const calleeNode = node.callee
            let callThis = scope.thisVal ?? scope.self
            let callee

            if (calleeNode.type === 'Member') {
                const object = evalExpression(calleeNode.object, scope)
                if (object === SHORT_CIRCUIT) return SHORT_CIRCUIT
                if (calleeNode.optional && object == null) return SHORT_CIRCUIT
                const property = calleeNode.computed ? evalExpression(calleeNode.property, scope) : calleeNode.property
                const isThis = calleeNode.object.type === 'This' || object === scope.thisVal || object === scope.self

                if (object == null) {
                    callee = undefined
                } else {
                    callThis = object
                    callee = object[property]
                }

                if (
                    typeof callee !== 'function' &&
                    isThis &&
                    typeof property === 'string' &&
                    scope.methodsAst?.[property] &&
                    scope.callMethod
                ) {
                    callee = (...args) => scope.callMethod(property, args)
                    callThis = scope.thisVal ?? scope.self
                }
            } else {
                callee = evalExpression(calleeNode, scope)
                if (callee === SHORT_CIRCUIT) return SHORT_CIRCUIT
                // Natives such as setTimeout reject any receiver other than the global object.
                if (
                    calleeNode.type === 'Ident' &&
                    typeof globalThis !== 'undefined' &&
                    callee === globalThis[calleeNode.name]
                ) {
                    callThis = globalThis
                }
            }

            if (node.optional && callee == null) return SHORT_CIRCUIT

            const args = evalArguments(node.args, scope)
            if (typeof callee !== 'function') {
                const label =
                    calleeNode.type === 'Ident'
                        ? calleeNode.name
                        : calleeNode.type === 'Member' && !calleeNode.computed
                          ? describeMember(calleeNode)
                          : 'value'
                throw new TypeError(`${label} is not a function`)
            }
            return callee.apply(callThis, args)
        }
        case 'New': {
            const Ctor = evalExpression(node.callee, scope)
            return new Ctor(...evalArguments(node.args, scope))
        }
        case 'Unary': {
            const arg = evalExpression(node.arg, scope)
            switch (node.op) {
                case '!':
                    return !arg
                case '~':
                    return ~arg
                case '+':
                    return +arg
                case '-':
                    return -arg
                case 'typeof':
                    return typeof arg
                case 'void':
                    return void arg
                case 'delete': {
                    const target = node.arg.type === 'Chain' ? node.arg.expr : node.arg
                    if (target.type === 'Ident') {
                        const env = scope.vars
                        if (env && Object.prototype.hasOwnProperty.call(env, target.name)) {
                            delete env[target.name]
                            return true
                        }
                    }
                    if (target.type === 'Member') {
                        const object = evalExpression(target.object, scope)
                        if (object == null) return true
                        const property = target.computed ? evalExpression(target.property, scope) : target.property
                        return delete object[property]
                    }
                    return true
                }
                default:
                    return arg
            }
        }
        case 'Binary': {
            const left = evalExpression(node.left, scope)
            if (node.op === '&&') return left && evalExpression(node.right, scope)
            if (node.op === '||') return left || evalExpression(node.right, scope)
            if (node.op === '??') return left ?? evalExpression(node.right, scope)
            const right = evalExpression(node.right, scope)
            switch (node.op) {
                case '+':
                    return left + right
                case '-':
                    return left - right
                case '*':
                    return left * right
                case '/':
                    return left / right
                case '%':
                    return left % right
                case '**':
                    return left ** right
                case '==':
                    return left == right
                case '!=':
                    return left != right
                case '===':
                    return left === right
                case '!==':
                    return left !== right
                case '<':
                    return left < right
                case '>':
                    return left > right
                case '<=':
                    return left <= right
                case '>=':
                    return left >= right
                case 'in':
                    return right != null && left in right
                case 'instanceof':
                    return right != null && left instanceof right
                case '|':
                    return left | right
                case '^':
                    return left ^ right
                case '&':
                    return left & right
                case '<<':
                    return left << right
                case '>>':
                    return left >> right
                case '>>>':
                    return left >>> right
                default:
                    return undefined
            }
        }
        case 'Cond': {
            return evalExpression(node.test, scope)
                ? evalExpression(node.consequent, scope)
                : evalExpression(node.alternate, scope)
        }
        case 'Assign': {
            if (node.op && node.op !== '=') {
                const value = applyCompound(
                    node.op,
                    evalExpression(node.left, scope),
                    evalExpression(node.right, scope)
                )
                assignTarget(node.left, value, scope)
                return value
            }
            const value = evalExpression(node.right, scope)
            if (node.left.type === 'ObjectPattern' || node.left.type === 'ArrayPattern') {
                bindPattern(node.left, value, scope, (name, bound) =>
                    assignTarget({ type: 'Ident', name }, bound, scope)
                )
                return value
            }
            assignTarget(node.left, value, scope)
            return value
        }
        case 'Update': {
            const current = evalExpression(node.arg, scope)
            const delta = node.op === '++' ? 1 : -1
            const updated = current + delta
            assignTarget(node.arg, updated, scope)
            return node.prefix ? updated : current
        }
        case 'Array': {
            const out = []
            for (const element of node.elements) {
                if (element == null) {
                    out.push(undefined)
                } else if (element.type === 'Spread') {
                    out.push(...iterableToArray(evalExpression(element.arg, scope)))
                } else {
                    out.push(evalExpression(element, scope))
                }
            }
            return out
        }
        case 'Object': {
            const out = {}
            for (const prop of node.props) {
                if (prop.spread) {
                    Object.assign(out, evalExpression(prop.value, scope))
                    continue
                }
                const key = prop.computed ? evalExpression(prop.key, scope) : prop.key
                out[key] = evalExpression(prop.value, scope)
            }
            return out
        }
        case 'Template':
            return evalTemplateLiteral(node.raw, scope)
        case 'Function':
        case 'Arrow':
            return createFunction(node, scope)
        default:
            return undefined
    }
}

function applyCompound(op, left, right) {
    switch (op) {
        case '+=':
            return left + right
        case '-=':
            return left - right
        case '*=':
            return left * right
        case '/=':
            return left / right
        case '%=':
            return left % right
        default:
            return right
    }
}

/** Spreading a nullish or non-iterable value yields nothing instead of throwing. */
function iterableToArray(value) {
    if (value == null) return []
    if (Array.isArray(value)) return value
    if (typeof value === 'string' || typeof value[Symbol.iterator] === 'function') return Array.from(value)
    return []
}

function evalArguments(nodes, scope) {
    const args = []
    for (const node of nodes) {
        if (node && node.type === 'Spread') {
            args.push(...iterableToArray(evalExpression(node.arg, scope)))
            continue
        }
        args.push(evalExpression(node, scope))
    }
    return args
}

/**
 * Walks a binding pattern and hands every resolved name to `define`.
 * Nullish sources yield undefined bindings rather than throwing, matching the
 * engine's lenient member access.
 */
export function bindPattern(pattern, value, scope, define) {
    if (!pattern) return

    switch (pattern.type) {
        case 'Ident':
            define(pattern.name, value)
            return
        case 'Default':
            bindPattern(
                pattern.target,
                value === undefined ? evalExpression(pattern.fallback, scope) : value,
                scope,
                define
            )
            return
        case 'ObjectPattern': {
            const source = value == null ? {} : value
            const taken = []
            for (const prop of pattern.props) {
                const key = prop.computed ? evalExpression(prop.key, scope) : prop.key
                taken.push(String(key))
                bindPattern(prop.value, source[key], scope, define)
            }
            if (pattern.rest) {
                const rest = {}
                for (const key of Object.keys(source)) {
                    if (!taken.includes(key)) rest[key] = source[key]
                }
                bindPattern(pattern.rest, rest, scope, define)
            }
            return
        }
        case 'ArrayPattern': {
            const items = iterableToArray(value)
            for (let i = 0; i < pattern.elements.length; i++) {
                bindPattern(pattern.elements[i], items[i], scope, define)
            }
            if (pattern.rest) bindPattern(pattern.rest, items.slice(pattern.elements.length), scope, define)
            return
        }
        case 'Member':
            assignTarget(pattern, value, scope)
            return
        default:
            return
    }
}

/** Binds a parameter list (patterns, defaults, trailing rest) into `target`. */
export function bindParams(params, args, scope, target) {
    if (!params) return
    const define = (name, value) => {
        target[name] = value
    }
    for (let i = 0; i < params.length; i++) {
        const param = params[i]
        if (param && param.type === 'Rest') {
            bindPattern(param.target, args.slice(i), scope, define)
            return
        }
        bindPattern(param, args[i], scope, define)
    }
}

function resolveIdent(name, scope) {
    if (name === 'undefined') return undefined
    if (scope.vars && Object.prototype.hasOwnProperty.call(scope.vars, name)) {
        return scope.vars[name]
    }
    if (scope.methods && typeof scope.methods[name] === 'function') {
        return scope.methods[name].bind(scope.thisVal ?? scope.self)
    }
    if (scope.methodsAst && scope.methodsAst[name]) {
        return (...args) => scope.callMethod(name, args)
    }
    // `locals` is a prototype chain of null-rooted bags, so `in` walks enclosing scopes safely.
    if (scope.locals && name in scope.locals) {
        return scope.locals[name]
    }
    if (scope.use && Object.prototype.hasOwnProperty.call(scope.use, name)) {
        return scope.use[name]
    }
    if (scope.props && Object.prototype.hasOwnProperty.call(scope.props, name)) {
        return scope.props[name]
    }
    if (name === 'Jslade' && scope.Jslade) return scope.Jslade
    if (name === 'window' && scope.window) return scope.window
    if (name === 'globalThis' && scope.globalThis) return scope.globalThis
    if (name === '_' && scope.buffer) return scope.buffer
    if (name === 'event' && scope.event) return scope.event
    if (name === 'send' && scope.send) return scope.send
    if (name === 'receive' && scope.receive) return scope.receive
    // Built-ins and page globals (Number, Math, console, window…) resolve as they would in plain JS.
    if (typeof globalThis !== 'undefined' && name in globalThis) return globalThis[name]
    return undefined
}

function assignTarget(node, value, scope) {
    if (node.type === 'Ident') {
        if (scope.props && Object.prototype.hasOwnProperty.call(scope.props, node.name)) {
            scope.props[node.name] = value
            return
        }
        if (!scope.vars) scope.vars = Object.create(null)
        scope.vars[node.name] = value
        return
    }
    if (node.type === 'Member') {
        const object = evalExpression(node.object, scope)
        const property = node.computed ? evalExpression(node.property, scope) : node.property
        object[property] = value
    }
}

function evalTemplateLiteral(raw, scope) {
    let out = ''
    let i = 1
    while (i < raw.length - 1) {
        const ch = raw[i]
        if (ch === '\\') {
            out += raw[i + 1]
            i += 2
            continue
        }
        if (ch === '$' && raw[i + 1] === '{') {
            let j = i + 2
            let depth = 1
            while (j < raw.length && depth > 0) {
                if (raw[j] === '{') depth++
                else if (raw[j] === '}') depth--
                j++
            }
            const inner = raw.slice(i + 2, j - 1)
            out += String(evalExpression(parseExpression(inner), scope))
            i = j
            continue
        }
        out += ch
        i++
    }
    return out
}

function createFunction(node, scope) {
    const fn = function (...args) {
        // Chaining onto the enclosing locals keeps outer parameters visible to nested closures.
        const locals = Object.create(scope.locals || null)
        const childScope = forkScope(scope, locals)
        childScope.thisVal = scope.thisVal ?? scope.self
        bindParams(node.params, args, childScope, locals)
        if (node.exprBody) {
            return evalExpression(node.body, childScope)
        }
        return evalStatementList(Array.isArray(node.body) ? node.body : [node.body], childScope)
    }
    return fn
}

function forkScope(scope, locals) {
    return {
        self: scope.self,
        thisVal: scope.thisVal,
        props: scope.props,
        vars: scope.vars,
        locals,
        methods: scope.methods,
        methodsAst: scope.methodsAst,
        callMethod: scope.callMethod,
        use: scope.use,
        Jslade: scope.Jslade,
        send: scope.send,
        receive: scope.receive,
        event: scope.event,
        escapeHtml: scope.escapeHtml,
        emitChild: scope.emitChild,
    }
}

export function evalObjectLiteral(node) {
    return evalExpression(node, { vars: Object.create(null) })
}

import { evalStatementList } from './eval-stmt.js'

function describeMember(node) {
    if (node.object.type === 'This') return 'this.' + node.property
    if (node.object.type === 'Ident') return node.object.name + '.' + node.property
    return 'value'
}
