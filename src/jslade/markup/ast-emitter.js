import { formatModuleError } from '../lib/instance-registry.js'
import { parseExpression, parseForHeader, parseStatementList } from '../ast/parse-expr.js'

/** Builds a Template AST instead of JS source lines. */
export function createAstEmitter(errorContext) {
    const body = []
    const sourceMap = []
    const openBlockStack = []
    let blockFrameStack = []
    let _rawMode = false
    let _lastMarkupIndex = 0

    function markupError(index, message) {
        if (errorContext && errorContext.templateName) {
            throw new Error(
                formatModuleError(
                    errorContext.templateName,
                    'markup',
                    errorContext.markup ?? '',
                    index == null ? _lastMarkupIndex : index,
                    message,
                    errorContext.sourceLines
                )
            )
        }
        throw new Error(message)
    }

    function recordIndex(markupIndex) {
        if (markupIndex != null) {
            _lastMarkupIndex = markupIndex
            sourceMap.push({ markupIndex, nodeIndex: body.length })
        }
    }

    function currentTarget() {
        if (blockFrameStack.length) return blockFrameStack[blockFrameStack.length - 1].target
        return body
    }

    function closeFrame(markupIndex) {
        const frame = blockFrameStack.pop()
        if (!frame) {
            markupError(markupIndex, 'Unclosed block')
        }
        // An if-chain keeps its first node in `root`: @endname closes it like any other block.
        currentTarget().push(frame.kind === 'if-chain' ? frame.root : frame.node)
        return frame
    }

    return {
        get _rawMode() {
            return _rawMode
        },
        set _rawMode(v) {
            _rawMode = v
        },

        pushNode(node, markupIndex) {
            recordIndex(markupIndex)
            currentTarget().push(node)
        },

        emitLine(codeLine, markupIndex) {
            markupError(markupIndex, 'Legacy ctx.emit() is not supported in AST mode')
        },

        increaseIndent() {},
        decreaseIndent() {},
        pushOpenBlock(blockName) {
            openBlockStack.push(blockName)
        },
        popOpenBlock(blockName) {
            if (!openBlockStack.length) {
                markupError(_lastMarkupIndex, `Unexpected @${blockName}`)
            }
            const lastBlock = openBlockStack.pop()
            if (lastBlock !== blockName) {
                markupError(_lastMarkupIndex, `Expected @end${lastBlock}, found @${blockName}`)
            }
        },

        beginIf(testExpr, markupIndex) {
            recordIndex(markupIndex)
            const node = { type: 'If', test: testExpr, consequent: [], alternate: null }
            blockFrameStack.push({ kind: 'if-chain', root: node, current: node, target: node.consequent })
        },

        elseIf(testExpr, markupIndex) {
            recordIndex(markupIndex)
            const frame = blockFrameStack[blockFrameStack.length - 1]
            if (!frame || frame.kind !== 'if-chain') {
                markupError(markupIndex, 'Unexpected @elseif')
            }
            const node = { type: 'If', test: testExpr, consequent: [], alternate: null }
            frame.current.alternate = node
            frame.current = node
            frame.target = node.consequent
        },

        beginElse(markupIndex) {
            recordIndex(markupIndex)
            const frame = blockFrameStack[blockFrameStack.length - 1]
            if (!frame || frame.kind !== 'if-chain') {
                markupError(markupIndex, 'Unexpected @else')
            }
            const altBody = []
            frame.current.alternate = altBody
            frame.target = altBody
        },

        endIf(markupIndex) {
            recordIndex(markupIndex)
            const frame = blockFrameStack.pop()
            if (!frame || frame.kind !== 'if-chain') {
                markupError(markupIndex, 'Unexpected @endif')
            }
            currentTarget().push(frame.root)
        },

        beginForEach(arrayExpr, itemVar, markupIndex) {
            recordIndex(markupIndex)
            const node = { type: 'ForEach', array: arrayExpr, itemVar, body: [] }
            blockFrameStack.push({ kind: 'foreach', node, target: node.body })
        },

        beginFor(headerAst, markupIndex) {
            recordIndex(markupIndex)
            const node = {
                type: 'For',
                init: headerAst.init,
                test: headerAst.test,
                update: headerAst.update,
                body: [],
            }
            blockFrameStack.push({ kind: 'for', node, target: node.body })
        },

        beginForIn(targetExpr, keyVar, markupIndex) {
            recordIndex(markupIndex)
            const node = { type: 'ForIn', target: targetExpr, keyVar, body: [] }
            blockFrameStack.push({ kind: 'forin', node, target: node.body })
        },

        beginJsBlock(markupIndex) {
            recordIndex(markupIndex)
            const node = { type: 'JsBlock', body: [] }
            blockFrameStack.push({ kind: 'js', node, target: node.body })
        },

        endBlock(markupIndex) {
            recordIndex(markupIndex)
            closeFrame(markupIndex)
        },

        appendToOpen(node, markupIndex) {
            if (markupIndex != null) recordIndex(markupIndex)
            currentTarget().push(node)
        },

        toTemplateAst() {
            if (blockFrameStack.length) {
                markupError(_lastMarkupIndex, 'Unclosed block directive')
            }
            if (openBlockStack.length) {
                markupError(_lastMarkupIndex, `Unclosed directive(s): ${openBlockStack.map((n) => '@' + n).join(', ')}`)
            }
            return { type: 'Template', body, sourceMap }
        },
    }
}

export function createAstDirectiveContext(token, emitter, errorContext, tokenStart) {
    const ctx = {
        expr: token.expression,
        tokenStart,

        raise(message) {
            if (errorContext && errorContext.templateName) {
                throw new Error(
                    formatModuleError(
                        errorContext.templateName,
                        'markup',
                        errorContext.markup ?? '',
                        tokenStart,
                        message,
                        errorContext.sourceLines
                    )
                )
            }
            throw new Error(message)
        },

        /**
         * Legacy escape hatch: the emitted code is parsed, not concatenated, so it must be a
         * complete statement list. `_` is the output buffer, as in the generated code it replaced.
         */
        emit(code) {
            let body
            try {
                body = parseStatementList(code)
            } catch (error) {
                ctx.raise(`ctx.emit() needs complete statements: ${error.message}`)
            }
            emitter.appendToOpen({ type: 'JsBlock', body, exposeBuffer: true }, tokenStart)
        },

        parseExpr(source) {
            try {
                return parseExpression(source)
            } catch (error) {
                ctx.raise(`Invalid expression: ${error.message}`)
            }
        },

        inline(strings, ...values) {
            return escapeDirective(strings, ...values)
        },

        wrap(openHtml, closeHtml) {
            ctx._block = {
                open: () => {
                    emitter.appendToOpen({ type: 'PushHtml', html: openHtml })
                },
                close: () => {
                    emitter.appendToOpen({ type: 'PushHtml', html: closeHtml })
                },
            }
        },

        when(condition) {
            const testExpr = ctx.parseExpr(condition)
            ctx._block = {
                open: () => {
                    emitter.beginIf(testExpr, tokenStart)
                },
                close: () => {
                    emitter.endIf(tokenStart)
                },
            }
        },

        loop(arrayExpr, itemVar) {
            ctx._block = {
                open: () => {
                    emitter.beginForEach(ctx.parseExpr(arrayExpr), itemVar, tokenStart)
                },
                close: () => {
                    emitter.endBlock(tokenStart)
                },
            }
        },

        raw() {
            emitter._rawMode = true
            ctx._block = {
                open: () => {
                    emitter.beginJsBlock(tokenStart)
                },
                close: () => {},
            }
        },

        _block: null,
    }

    /** Each `${…}` is an expression to evaluate at render time, not text to splice into the HTML. */
    function emitInterleaved(strings, values, escape) {
        for (let i = 0; i < strings.length; i++) {
            if (strings[i]) emitter.appendToOpen({ type: 'PushHtml', html: strings[i] })
            if (i < values.length) {
                const expr = ctx.parseExpr(String(values[i]))
                emitter.appendToOpen(escape ? { type: 'Interpolate', expr, escape: true } : { type: 'Raw', expr })
            }
        }
    }

    function escapeDirective(strings, ...values) {
        emitInterleaved(strings, values, true)
    }

    ctx.inline.raw = function (strings, ...values) {
        emitInterleaved(strings, values, false)
    }

    return ctx
}

export { parseForHeader, parseStatementList }
