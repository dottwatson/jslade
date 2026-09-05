import { MAX_COMPILE_ITERATIONS } from '../lib/constants.js'
import { formatModuleError } from '../lib/instance-registry.js'
import {
    advancePastBladeComment,
    findNextMarkupToken,
    isBladeCommentAt,
    isEscapedAtSign,
    parseDirectiveToken,
} from '../lib/html-utils.js'
import { createAstEmitter } from './ast-emitter.js'
import { parseExpression, parseStatementList } from '../ast/parse-expr.js'

export function compileMarkupToAst(markup, directiveRegistry, errorContext) {
    const emitter = createAstEmitter(errorContext)
    const eventHandlers = []
    let cursor = 0
    let iterationCount = 0

    function markupError(index, message) {
        if (errorContext && errorContext.templateName) {
            throw new Error(
                formatModuleError(
                    errorContext.templateName,
                    'markup',
                    errorContext.markup ?? markup,
                    index,
                    message,
                    errorContext.sourceLines
                )
            )
        }
        throw new Error(message)
    }

    while (cursor < markup.length) {
        if (++iterationCount > MAX_COMPILE_ITERATIONS) {
            markupError(cursor, `Compile loop guard at position ${cursor}`)
        }

        if (emitter._rawMode) {
            const END_JS = '@endjs'
            const endIdx = markup.indexOf(END_JS, cursor)
            if (endIdx === -1) {
                markupError(cursor, 'Unclosed @js block (missing @endjs)')
            }
            const rawCode = markup.slice(cursor, endIdx).trim()
            if (rawCode) {
                try {
                    // The open frame is already a JsBlock: its body is a statement list, not nodes.
                    for (const statement of parseStatementList(rawCode)) {
                        emitter.appendToOpen(statement)
                    }
                } catch (error) {
                    markupError(cursor, `@js block: ${error.message}`)
                }
            }
            cursor = endIdx + END_JS.length
            emitter._rawMode = false
            emitter.popOpenBlock('js')
            emitter.endBlock(endIdx)
            continue
        }

        if (isBladeCommentAt(markup, cursor)) {
            cursor = advancePastBladeComment(markup, cursor, true)
            continue
        }

        if (markup[cursor] === '@' && !isEscapedAtSign(markup, cursor)) {
            const tokenStart = cursor
            const directiveToken = parseDirectiveToken(markup, cursor)
            if (!directiveToken) {
                cursor++
                continue
            }

            cursor = directiveToken.nextPosition
            if (!directiveRegistry.compileAst(directiveToken, emitter, errorContext, tokenStart, eventHandlers)) {
                if (errorContext && errorContext.templateName) {
                    markupError(tokenStart, `Unknown directive @${directiveToken.name}`)
                }
            }
            continue
        }

        if (markup[cursor] === '{' && markup[cursor + 1] === '!' && markup[cursor + 2] === '!') {
            const rawEnd = markup.indexOf('!!}', cursor + 3)
            if (rawEnd === -1) {
                markupError(cursor, 'Unclosed {!! raw output (missing !!})')
            }
            const exprSource = markup.slice(cursor + 3, rawEnd).trim()
            try {
                emitter.appendToOpen({ type: 'Raw', expr: parseExpression(exprSource) }, cursor)
            } catch (error) {
                markupError(cursor, `Invalid raw expression: ${error.message}`)
            }
            cursor = rawEnd + 3
            continue
        }

        if (markup[cursor] === '{' && markup[cursor + 1] === '{') {
            const escapedEnd = markup.indexOf('}}', cursor + 2)
            if (escapedEnd === -1) {
                markupError(cursor, 'Unclosed {{ expression (missing }})')
            }
            const exprSource = markup.slice(cursor + 2, escapedEnd).trim()
            try {
                emitter.appendToOpen({ type: 'Interpolate', expr: parseExpression(exprSource), escape: true }, cursor)
            } catch (error) {
                markupError(cursor, `Invalid expression: ${error.message}`)
            }
            cursor = escapedEnd + 2
            continue
        }

        const chunkStart = cursor
        const nextTokenPosition = findNextMarkupToken(markup, cursor)
        const literalChunk = markup.slice(cursor, nextTokenPosition)
        cursor = nextTokenPosition

        const isIndentation = !literalChunk.trim() && literalChunk.includes('\n')
        if (literalChunk && !isIndentation) {
            emitter.appendToOpen({ type: 'Text', value: literalChunk }, chunkStart)
        }
    }

    const ast = emitter.toTemplateAst()
    ast.eventHandlers = eventHandlers
    return ast
}
