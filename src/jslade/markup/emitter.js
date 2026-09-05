/** Builds the body of the compiled render `Function` line by line. */
import { formatModuleError } from '../lib/instance-registry.js'

export function createCodeEmitter(errorContext) {
    const outputLines = ['var _ = []']
    const sourceMap = []
    let indentLevel = 0
    const openBlockStack = []
    const indentCache = ['']
    let _rawMode = false
    let _lastMarkupIndex = 0

    function getIndent() {
        if (indentLevel < indentCache.length) return indentCache[indentLevel]
        const indent = '    '.repeat(indentLevel)
        indentCache[indentLevel] = indent
        return indent
    }

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

    return {
        emitLine(codeLine, markupIndex) {
            if (markupIndex != null) {
                _lastMarkupIndex = markupIndex
                sourceMap.push({ genLine: outputLines.length, markupIndex })
            }
            outputLines.push(getIndent() + codeLine)
        },
        increaseIndent() {
            indentLevel++
        },
        decreaseIndent() {
            indentLevel--
        },
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
        get _rawMode() {
            return _rawMode
        },
        set _rawMode(v) {
            _rawMode = v
        },
        toFunctionBody() {
            if (openBlockStack.length) {
                markupError(_lastMarkupIndex, `Unclosed directive(s): ${openBlockStack.map((n) => '@' + n).join(', ')}`)
            }
            outputLines.push('return _.join("")')
            return { body: outputLines.join('\n'), sourceMap }
        },
    }
}
