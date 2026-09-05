import { MAX_COMPILE_ITERATIONS } from '../lib/constants.js'
import { formatModuleError } from '../lib/instance-registry.js'
import {
    advancePastBladeComment,
    findNextMarkupToken,
    isBladeCommentAt,
    isEscapedAtSign,
    parseDirectiveToken,
} from '../lib/html-utils.js'
import { createCodeEmitter } from './emitter.js'

export function compileMarkupSource(markup, directiveRegistry, errorContext) {
    const emitter = createCodeEmitter(errorContext)
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
            const endIdx = markup.indexOf('@endjs', cursor)
            if (endIdx === -1) {
                markupError(cursor, 'Unclosed @js block (missing @endjs)')
            }
            const rawCode = markup.slice(cursor, endIdx).trim()
            if (rawCode) emitter.emitLine(rawCode, cursor)
            cursor = endIdx + 7
            emitter._rawMode = false
            emitter.popOpenBlock('js')
            emitter.decreaseIndent()
            emitter.emitLine('}).call(__self)', endIdx)
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
            if (!directiveRegistry.compile(directiveToken, emitter, errorContext, tokenStart)) {
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
            emitter.emitLine(`_.push(String(${markup.slice(cursor + 3, rawEnd).trim()}))`, cursor)
            cursor = rawEnd + 3
            continue
        }

        if (markup[cursor] === '{' && markup[cursor + 1] === '{') {
            const escapedEnd = markup.indexOf('}}', cursor + 2)
            if (escapedEnd === -1) {
                markupError(cursor, 'Unclosed {{ expression (missing }})')
            }
            emitter.emitLine(`_.push(escapeHtml(${markup.slice(cursor + 2, escapedEnd).trim()}))`, cursor)
            cursor = escapedEnd + 2
            continue
        }

        const chunkStart = cursor
        const nextTokenPosition = findNextMarkupToken(markup, cursor)
        const literalChunk = markup.slice(cursor, nextTokenPosition)
        cursor = nextTokenPosition

        // Indentation around directives is noise, but a gap on a single line is real text:
        // `{{ first }} {{ last }}` must not collapse into one word.
        const isIndentation = !literalChunk.trim() && literalChunk.includes('\n')
        if (literalChunk && !isIndentation) {
            emitter.emitLine(`_.push(${JSON.stringify(literalChunk)})`, chunkStart)
        }
    }

    return emitter.toFunctionBody()
}
