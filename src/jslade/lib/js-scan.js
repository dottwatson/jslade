import { parseObjectLiteral } from '../ast/parse-expr.js'
import { evalExpression } from '../ast/eval-expr.js'
import { _devLog } from './dev-log.js'

const JS_SCAN_CODE = 0
const JS_SCAN_SQUOTE = 1
const JS_SCAN_DQUOTE = 2
const JS_SCAN_TEMPLATE = 3
const JS_SCAN_LINE_COMMENT = 4
const JS_SCAN_BLOCK_COMMENT = 5
const JS_SCAN_REGEX = 6

function jsScanCanOpenRegex(lastToken) {
    return (
        lastToken === '' ||
        /[({[=,;:!&|?+\-*~^<>%@]/.test(lastToken) ||
        [
            'return',
            'typeof',
            'instanceof',
            'in',
            'of',
            'new',
            'delete',
            'void',
            'case',
            'do',
            'else',
            'yield',
            'await',
        ].includes(lastToken)
    )
}

export function scanJsCode(source, fromIndex, onChar) {
    let state = JS_SCAN_CODE
    let index = fromIndex
    let lastToken = ''
    const length = source.length

    while (index < length) {
        const char = source[index]
        const next = source[index + 1]

        switch (state) {
            case JS_SCAN_CODE:
                if (/\s/.test(char)) break
                if (char === "'") state = JS_SCAN_SQUOTE
                else if (char === '"') state = JS_SCAN_DQUOTE
                else if (char === '`') state = JS_SCAN_TEMPLATE
                else if (char === '/' && next === '/') {
                    state = JS_SCAN_LINE_COMMENT
                    index++
                } else if (char === '/' && next === '*') {
                    state = JS_SCAN_BLOCK_COMMENT
                    index++
                } else if (char === '/' && next !== '/' && next !== '*' && jsScanCanOpenRegex(lastToken)) {
                    state = JS_SCAN_REGEX
                } else {
                    const stop = onChar(index, char)
                    if (typeof stop === 'number') return stop
                    if (/[A-Za-z0-9_$]/.test(char)) {
                        lastToken = /[A-Za-z0-9_$]/.test(lastToken.slice(-1)) ? lastToken + char : char
                    } else {
                        lastToken = char
                    }
                }
                break
            case JS_SCAN_SQUOTE:
                if (char === '\\') index++
                else if (char === "'") state = JS_SCAN_CODE
                break
            case JS_SCAN_DQUOTE:
                if (char === '\\') index++
                else if (char === '"') state = JS_SCAN_CODE
                break
            case JS_SCAN_TEMPLATE:
                if (char === '\\') index++
                else if (char === '`') state = JS_SCAN_CODE
                break
            case JS_SCAN_REGEX:
                if (char === '\\') index++
                else if (char === '[') {
                    index++
                    while (index < length && source[index] !== ']') {
                        if (source[index] === '\\') index++
                        index++
                    }
                } else if (char === '/') {
                    state = JS_SCAN_CODE
                    lastToken = '/regex/'
                }
                break
            case JS_SCAN_LINE_COMMENT:
                if (char === '\n' || char === '\r') state = JS_SCAN_CODE
                break
            case JS_SCAN_BLOCK_COMMENT:
                if (char === '*' && next === '/') {
                    state = JS_SCAN_CODE
                    index++
                }
                break
        }
        index++
    }
    return index
}

/** Locate `name(` as its own call, not as the tail of another identifier (`refuse(` must not match `use(`). */
function findCall(source, functionName) {
    const match = new RegExp(`(^|[^\\w$.])(${functionName}\\s*\\()`).exec(source)
    if (!match) return null
    const callIndex = match.index + match[1].length
    return { callIndex, parenIndex: callIndex + match[2].length - 1 }
}

/** Index of the `}` closing the block opened at `braceStart`, or -1. */
function findBlockEnd(source, braceStart) {
    let depth = 0
    let closeIndex = -1
    scanJsCode(source, braceStart, (index, char) => {
        if (char === '{') depth++
        else if (char === '}') {
            depth--
            if (depth === 0) {
                closeIndex = index
                return index
            }
        }
    })
    return closeIndex
}

/** End of the whole call, including the closing `)` when present, so it can be cut from the script. */
function findCallEnd(source, closeIndex) {
    let index = closeIndex + 1
    while (index < source.length && /\s/.test(source[index])) index++
    return source[index] === ')' ? index + 1 : closeIndex + 1
}

export function extractBalancedBraceBlock(source, functionName) {
    const call = findCall(source, functionName)
    if (!call) return null

    let braceStart = call.parenIndex + 1
    while (braceStart < source.length && /\s/.test(source[braceStart])) braceStart++
    if (source[braceStart] !== '{') return null

    const closeIndex = findBlockEnd(source, braceStart)
    if (closeIndex === -1) return null

    return {
        objectBody: source.slice(braceStart + 1, closeIndex),
        sourceBlock: source.slice(call.callIndex, findCallEnd(source, closeIndex)),
    }
}

function evaluateObjectLiteral(objectBody) {
    const node = parseObjectLiteral(`{${objectBody}}`)
    const globalScope =
        typeof globalThis !== 'undefined'
            ? { window: globalThis.window ?? globalThis, globalThis }
            : { window: {}, globalThis: {} }
    return evalExpression(node, { vars: Object.create(null), ...globalScope })
}

/** Body of a lifecycle hook. Accepts both `name(() => { … })` and `name(function () { … })`. */
export function extractHookFunction(source, hookName) {
    const call = findCall(source, hookName)
    if (!call) return null

    let braceStart = -1
    scanJsCode(source, call.parenIndex, (index, char) => {
        if (char === '{') {
            braceStart = index
            return index
        }
    })
    if (braceStart === -1) {
        _devLog.warn(`[Jslade] ${hookName}() needs a function body: ${hookName}(() => { ... })`)
        return null
    }

    const closeIndex = findBlockEnd(source, braceStart)
    if (closeIndex === -1) return null

    return {
        body: source.slice(braceStart + 1, closeIndex),
        sourceBlock: source.slice(call.callIndex, findCallEnd(source, closeIndex)),
    }
}

export { evaluateObjectLiteral, findBlockEnd }
