import { evalExpression, bindPattern } from './eval-expr.js'

/** Declarations and loop variables land in the flat `vars` bag. */
function declarePattern(pattern, value, scope) {
    bindPattern(pattern, value, scope, (name, bound) => {
        scope.vars[name] = bound
    })
}

export function evalStatementList(stmts, scope) {
    let result = undefined
    for (let i = 0; i < stmts.length; i++) {
        const stmt = stmts[i]
        if (Array.isArray(stmt)) {
            result = evalStatementList(stmt, scope)
            continue
        }
        result = evalStatement(stmt, scope)
        if (scope._break || scope._continue || scope._returned) break
    }
    return scope._returned ? scope._return : result
}

export function evalStatement(stmt, scope) {
    if (!stmt) return undefined
    if (Array.isArray(stmt)) return evalStatementList(stmt, scope)

    switch (stmt.type) {
        case 'Block':
            return evalStatementList(stmt.body, scope)
        case 'Var': {
            if (!scope.vars) scope.vars = Object.create(null)
            for (const decl of stmt.decls) {
                declarePattern(decl.target, decl.init ? evalExpression(decl.init, scope) : undefined, scope)
            }
            return undefined
        }
        case 'ExprStmt':
            return evalExpression(stmt.expr, scope)
        case 'If': {
            const branch = evalExpression(stmt.test, scope) ? stmt.consequent : stmt.alternate
            if (!branch) return undefined
            return evalStatementList(Array.isArray(branch) ? branch : [branch], scope)
        }
        case 'For': {
            if (stmt.init) evalStatement(stmt.init, scope)
            while (stmt.test == null || evalExpression(stmt.test, scope)) {
                evalStatementList(Array.isArray(stmt.body) ? stmt.body : [stmt.body], scope)
                if (scope._break) {
                    scope._break = false
                    break
                }
                if (scope._continue) scope._continue = false
                if (scope._returned) break
                if (stmt.update) evalExpression(stmt.update, scope)
            }
            return undefined
        }
        case 'ForIn': {
            const object = evalExpression(stmt.right, scope)
            if (object == null) return undefined
            if (!scope.vars) scope.vars = Object.create(null)
            for (const key in object) {
                if (!Object.prototype.hasOwnProperty.call(object, key)) continue
                declarePattern(stmt.left.target, key, scope)
                evalStatementList(Array.isArray(stmt.body) ? stmt.body : [stmt.body], scope)
                if (scope._break) {
                    scope._break = false
                    break
                }
                if (scope._continue) scope._continue = false
                if (scope._returned) break
            }
            return undefined
        }
        case 'ForOf': {
            const iterable = evalExpression(stmt.right, scope)
            if (iterable == null) return undefined
            if (!scope.vars) scope.vars = Object.create(null)
            for (const item of iterable) {
                declarePattern(stmt.left.target, item, scope)
                evalStatementList(Array.isArray(stmt.body) ? stmt.body : [stmt.body], scope)
                if (scope._break) {
                    scope._break = false
                    break
                }
                if (scope._continue) scope._continue = false
                if (scope._returned) break
            }
            return undefined
        }
        case 'While': {
            while (evalExpression(stmt.test, scope)) {
                evalStatementList(Array.isArray(stmt.body) ? stmt.body : [stmt.body], scope)
                if (scope._break) {
                    scope._break = false
                    break
                }
                if (scope._continue) scope._continue = false
                if (scope._returned) break
            }
            return undefined
        }
        case 'Return': {
            scope._returned = true
            scope._return = stmt.arg ? evalExpression(stmt.arg, scope) : undefined
            return scope._return
        }
        case 'Break':
            scope._break = true
            return undefined
        case 'Continue':
            scope._continue = true
            return undefined
        case 'FunctionDecl':
            if (!scope.vars) scope.vars = Object.create(null)
            scope.vars[stmt.fn.name] = evalExpression(stmt.fn, scope)
            return undefined
        case 'Throw':
            throw evalExpression(stmt.arg, scope)
        case 'Try':
            return evalTry(stmt, scope)
        default:
            return undefined
    }
}

function evalTry(stmt, scope) {
    let pending = null

    try {
        evalStatementList(stmt.block, scope)
    } catch (error) {
        if (!stmt.handler) {
            pending = { error }
        } else {
            try {
                runCatchClause(stmt, error, scope)
            } catch (handlerError) {
                pending = { error: handlerError }
            }
        }
    }

    if (stmt.finalizer) {
        // `finally` runs even while a return/break is pending, and can override it.
        const saved = {
            _break: scope._break,
            _continue: scope._continue,
            _returned: scope._returned,
            _return: scope._return,
        }
        scope._break = false
        scope._continue = false
        scope._returned = false
        evalStatementList(stmt.finalizer, scope)
        if (scope._returned) {
            pending = null
        } else {
            Object.assign(scope, saved)
        }
    }

    if (pending) throw pending.error
    return undefined
}

/** The scope chain is flat, so the catch bindings are restored once the clause is done. */
function runCatchClause(stmt, error, scope) {
    if (stmt.param == null) {
        evalStatementList(stmt.handler, scope)
        return
    }
    if (!scope.vars) scope.vars = Object.create(null)
    const shadowed = []
    bindPattern(stmt.param, error, scope, (name, value) => {
        shadowed.push([name, Object.prototype.hasOwnProperty.call(scope.vars, name), scope.vars[name]])
        scope.vars[name] = value
    })
    try {
        evalStatementList(stmt.handler, scope)
    } finally {
        for (const [name, hadPrevious, previous] of shadowed) {
            if (hadPrevious) scope.vars[name] = previous
            else delete scope.vars[name]
        }
    }
}

export function runMethodAst(body, scope) {
    const localScope = {
        ...scope,
        vars: Object.create(scope.vars || null),
        _break: false,
        _continue: false,
        _returned: false,
        _return: undefined,
    }
    const result = evalStatementList(body, localScope)
    return localScope._returned ? localScope._return : result
}

export function runHookAst(body, scope) {
    const localScope = {
        ...scope,
        vars: Object.create(scope.vars || null),
        _break: false,
        _continue: false,
        _returned: false,
        _return: undefined,
    }
    evalStatementList(body, localScope)
}
