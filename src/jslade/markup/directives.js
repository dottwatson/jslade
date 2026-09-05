import { parseForeachExpression, parseForInExpression, readBalancedParentheses } from '../lib/html-utils.js'
import { createAstDirectiveContext } from './ast-emitter.js'
import { parseExpression, parseForHeader, parseStatementList } from '../ast/parse-expr.js'
import { EVENT_ATTRIBUTE_PREFIX } from '../lib/constants.js'

/** Handler source lives inside a double-quoted HTML attribute. */
function escapeAttributeValue(expression) {
    return expression.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function parseHandlerBody(expr, ctx) {
    try {
        return [{ type: 'ExprStmt', expr: ctx.parseExpr(expr) }]
    } catch (_) {
        return parseStatementList(expr)
    }
}

function parseComponentArgs(expr, ctx) {
    const argsSource = expr.trim()
    const comma = findTopLevelComma(argsSource)
    if (comma === -1) {
        return { nameExpr: ctx.parseExpr(argsSource), propsExpr: { type: 'Object', props: [] } }
    }
    const nameExpr = ctx.parseExpr(argsSource.slice(0, comma).trim())
    const propsExpr = ctx.parseExpr(argsSource.slice(comma + 1).trim())
    return { nameExpr, propsExpr }
}

function findTopLevelComma(source) {
    let depth = 0
    let quote = null
    for (let i = 0; i < source.length; i++) {
        const ch = source[i]
        if (quote) {
            if (ch === '\\') {
                i++
                continue
            }
            if (ch === quote) quote = null
            continue
        }
        if (ch === '"' || ch === "'") {
            quote = ch
            continue
        }
        if (ch === '(' || ch === '[' || ch === '{') depth++
        else if (ch === ')' || ch === ']' || ch === '}') depth--
        else if (ch === ',' && depth === 0) return i
    }
    return -1
}

export function createDirectiveRegistry() {
    const handlersByName = new Map()
    let registryApi = null

    function registerDirective(directiveName, handlerOrOpts, fn) {
        let opts, handlerFn

        if (typeof handlerOrOpts === 'function') {
            opts = {}
            handlerFn = handlerOrOpts
        } else {
            opts = handlerOrOpts
            handlerFn = fn
        }

        const normalizedHandler = {
            ...opts,
            handlerFn,
            astHandlerFn: null,
            block: opts.block === true,
        }

        handlersByName.set(directiveName, normalizedHandler)

        if (normalizedHandler.block) {
            const endName = 'end' + directiveName
            if (!handlersByName.has(endName)) {
                handlersByName.set(endName, {
                    _isEndDirective: true,
                    _endForDirective: directiveName,
                    handlerFn: function () {},
                    astHandlerFn: function () {},
                })
            }
        }

        return registryApi
    }

    function compileDirectiveAst(directiveToken, emitter, errorContext, tokenStart, eventHandlers) {
        const handler = handlersByName.get(directiveToken.name)
        if (!handler) return false

        if (handler._isEndDirective) {
            const baseName = handler._endForDirective
            emitter.popOpenBlock(baseName)
            if (handler._customClose) {
                handler._customClose()
            } else if (baseName === 'if') {
                emitter.endIf(tokenStart)
            } else {
                emitter.endBlock(tokenStart)
            }
            return true
        }

        const ctx = createAstDirectiveContext(directiveToken, emitter, errorContext, tokenStart)

        if (handler._isElse) {
            if (directiveToken.expression) {
                emitter.elseIf(ctx.parseExpr(directiveToken.expression), tokenStart)
            } else {
                emitter.beginElse(tokenStart)
            }
            return true
        }

        if (handler.astHandlerFn) {
            handler.astHandlerFn(ctx, emitter, tokenStart, eventHandlers)
        } else {
            handler.handlerFn(ctx, emitter, tokenStart, eventHandlers)
        }

        if (handler.block) {
            emitter.pushOpenBlock(directiveToken.name)
            if (ctx._block) {
                const endName = 'end' + directiveToken.name
                const endHandler = handlersByName.get(endName)
                if (endHandler) endHandler._customClose = ctx._block.close
                ctx._block.open()
            }
        }

        return true
    }

    function registerBuiltinDirectives() {
        registerDirective('if', { block: true }, function (ctx) {
            ctx.emit(`if (${ctx.expr}) {`)
        })
        handlersByName.get('if').astHandlerFn = function (ctx, emitter, tokenStart) {
            emitter.beginIf(ctx.parseExpr(ctx.expr), tokenStart)
        }

        registerDirective('elseif', function (ctx) {
            ctx.emit(`} else if (${ctx.expr}) {`)
        })
        handlersByName.get('elseif').astHandlerFn = function (ctx, emitter, tokenStart) {
            emitter.elseIf(ctx.parseExpr(ctx.expr), tokenStart)
        }

        handlersByName.set('else', { _isElse: true, handlerFn: function () {}, astHandlerFn: function () {} })

        registerDirective('foreach', { block: true }, function (ctx) {
            try {
                const { arrayExpression, itemVariable } = parseForeachExpression(ctx.expr)
                ctx.loop(arrayExpression, itemVariable)
            } catch (error) {
                ctx.raise(error.message)
            }
        })
        handlersByName.get('foreach').astHandlerFn = function (ctx, emitter, tokenStart) {
            try {
                const { arrayExpression, itemVariable } = parseForeachExpression(ctx.expr)
                emitter.beginForEach(ctx.parseExpr(arrayExpression), itemVariable, tokenStart)
            } catch (error) {
                ctx.raise(error.message)
            }
        }

        registerDirective('for', { block: true }, function (ctx) {
            ctx.emit(`for (${ctx.expr}) {`)
        })
        handlersByName.get('for').astHandlerFn = function (ctx, emitter, tokenStart) {
            try {
                emitter.beginFor(parseForHeader(ctx.expr), tokenStart)
            } catch (error) {
                ctx.raise(`Invalid @for header: ${error.message}`)
            }
        }

        registerDirective('forIn', { block: true }, function (ctx) {
            try {
                const { targetExpression, keyVariable } = parseForInExpression(ctx.expr)
                ctx.emit(`for (var ${keyVariable} in ${targetExpression}) {`)
            } catch (error) {
                ctx.raise(error.message)
            }
        })
        handlersByName.get('forIn').astHandlerFn = function (ctx, emitter, tokenStart) {
            try {
                const { targetExpression, keyVariable } = parseForInExpression(ctx.expr)
                emitter.beginForIn(ctx.parseExpr(targetExpression), keyVariable, tokenStart)
            } catch (error) {
                ctx.raise(error.message)
            }
        }

        registerDirective('component', function (ctx) {
            ctx.emit(`_.push(Jslade._emitChild(${ctx.tokenStart}, ${ctx.expr}))`)
        })
        handlersByName.get('component').astHandlerFn = function (ctx, emitter, tokenStart) {
            const args = parseComponentArgs(ctx.expr, ctx)
            emitter.appendToOpen({
                type: 'Component',
                site: tokenStart,
                nameExpr: args.nameExpr,
                propsExpr: args.propsExpr,
            })
        }

        registerDirective('dump', function (ctx) {
            const expr = ctx.expr || 'undefined'
            ctx.emit(`(function(){ console.log('[Jslade @dump]', ${expr}) }).call(__self)`)
        })
        handlersByName.get('dump').astHandlerFn = function (ctx, emitter) {
            const expr = ctx.expr ? ctx.parseExpr(ctx.expr) : { type: 'Literal', value: undefined }
            emitter.appendToOpen({
                type: 'JsBlock',
                body: [
                    {
                        type: 'ExprStmt',
                        expr: {
                            type: 'Call',
                            callee: {
                                type: 'Member',
                                object: { type: 'Ident', name: 'console' },
                                property: 'log',
                                computed: false,
                            },
                            args: [{ type: 'Literal', value: '[Jslade @dump]' }, expr],
                        },
                    },
                ],
            })
        }

        registerDirective('js', { block: true }, function (ctx) {
            ctx.raw()
        })
        handlersByName.get('js').astHandlerFn = function (ctx) {
            ctx.raw()
        }

        const EVENT_DIRECTIVES = ['click', 'input', 'change', 'submit', 'keydown', 'focus', 'blur']
        for (const eventName of EVENT_DIRECTIVES) {
            registerDirective(eventName, function (ctx) {
                const handler = escapeAttributeValue(ctx.expr)
                const attribute = ` on${eventName}="Jslade.event(event,this,function(e){Jslade.__runMarkup(this,${ctx.tokenStart},function(e){${handler}},e)})"`
                ctx.emit(`_.push(${JSON.stringify(attribute)})`)
            })
            handlersByName.get(eventName).astHandlerFn = function (ctx, emitter, tokenStart, eventHandlers) {
                // The id is the slot in this template's handler list — the registry is shared, the list is not.
                const handlerId = eventHandlers.length
                eventHandlers.push({
                    id: handlerId,
                    type: eventName,
                    markupIndex: tokenStart,
                    body: parseHandlerBody(ctx.expr, ctx),
                })
                const attribute = ` ${EVENT_ATTRIBUTE_PREFIX}${eventName}="${handlerId}"`
                emitter.appendToOpen({ type: 'PushHtml', html: attribute })
            }
        }
    }

    registerBuiltinDirectives()

    registryApi = {
        register: registerDirective,
        compile: function () {
            return false
        },
        compileAst(directiveToken, emitter, errorContext, tokenStart, eventHandlers) {
            return compileDirectiveAst(directiveToken, emitter, errorContext, tokenStart, eventHandlers)
        },
        has: (directiveName) => handlersByName.has(directiveName),
        _handlers: handlersByName,
    }

    return registryApi
}

export { parseExpression }
