import { evalExpression } from './eval-expr.js'
import { evalStatementList } from './eval-stmt.js'

export function renderTemplateAst(ast, scope) {
    const buf = []
    renderNodes(ast.body, scope, buf)
    return buf.join('')
}

function renderNodes(nodes, scope, buf) {
    for (let i = 0; i < nodes.length; i++) {
        renderNode(nodes[i], scope, buf)
    }
}

function renderNode(node, scope, buf) {
    switch (node.type) {
        case 'Text':
            buf.push(node.value)
            break
        case 'Interpolate': {
            const value = evalExpression(node.expr, scope)
            buf.push(node.escape ? scope.escapeHtml(String(value ?? '')) : String(value ?? ''))
            break
        }
        case 'Raw': {
            const value = evalExpression(node.expr, scope)
            buf.push(String(value ?? ''))
            break
        }
        case 'If': {
            if (evalExpression(node.test, scope)) {
                renderNodes(node.consequent, scope, buf)
            } else if (node.alternate) {
                if (Array.isArray(node.alternate)) renderNodes(node.alternate, scope, buf)
                else if (node.alternate.type === 'If') renderNode(node.alternate, scope, buf)
                else renderNodes(node.alternate, scope, buf)
            }
            break
        }
        case 'ForEach':
            renderForEach(node, scope, buf)
            break
        case 'For':
            renderFor(node, scope, buf)
            break
        case 'ForIn':
            renderForIn(node, scope, buf)
            break
        case 'JsBlock': {
            const jsScope = forkScope(scope, {})
            if (node.exposeBuffer) jsScope.buffer = buf
            evalStatementList(node.body, jsScope)
            break
        }
        case 'Component': {
            const name = node.nameExpr ? evalExpression(node.nameExpr, scope) : node.name
            const props = node.propsExpr ? evalExpression(node.propsExpr, scope) : {}
            buf.push(String(scope.emitChild(node.site, name, props)))
            break
        }
        case 'PushHtml':
            buf.push(node.html)
            break
        default:
            break
    }
}

function renderForEach(node, scope, buf) {
    const array = evalExpression(node.array, scope)
    if (array == null) return
    const length = array.length
    for (let index = 0; index < length; index++) {
        const loopScope = forkScope(scope, {
            [node.itemVar]: array[index],
            $loop: {
                index,
                first: index === 0,
                last: index === length - 1,
                count: length,
            },
        })
        renderNodes(node.body, loopScope, buf)
    }
}

function renderFor(node, scope, buf) {
    const loopScope = forkScope(scope, {})
    if (node.init) evalStatementList(Array.isArray(node.init) ? node.init : [node.init], loopScope)
    while (node.test == null || evalExpression(node.test, loopScope)) {
        renderNodes(node.body, loopScope, buf)
        if (node.update) evalExpression(node.update, loopScope)
    }
}

function renderForIn(node, scope, buf) {
    const object = evalExpression(node.target, scope)
    if (object == null) return
    for (const key in object) {
        if (!Object.prototype.hasOwnProperty.call(object, key)) continue
        const loopScope = forkScope(scope, { [node.keyVar]: key })
        renderNodes(node.body, loopScope, buf)
    }
}

function forkScope(scope, locals) {
    return {
        self: scope.self,
        thisVal: scope.thisVal,
        props: scope.props,
        vars: scope.vars,
        locals: { ...(scope.locals || {}), ...locals },
        methods: scope.methods,
        methodsAst: scope.methodsAst,
        callMethod: scope.callMethod,
        use: scope.use,
        Jslade: scope.Jslade,
        escapeHtml: scope.escapeHtml,
        emitChild: scope.emitChild,
        event: scope.event,
        buffer: scope.buffer,
    }
}
