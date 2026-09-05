export function isBladeCommentAt(source, position) {
    return (
        source[position] === '{' &&
        source[position + 1] === '{' &&
        source[position + 2] === '-' &&
        source[position + 3] === '-'
    )
}

export function advancePastBladeComment(source, position, alreadyVerified) {
    if (!alreadyVerified && !isBladeCommentAt(source, position)) return position
    const commentEnd = source.indexOf('--}}', position + 4)
    return commentEnd === -1 ? source.length : commentEnd + 4
}

const ESCAPE_HTML_CHARS = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}

export function escapeHtml(value) {
    if (value == null) return ''
    const text = typeof value === 'string' ? value : String(value)
    let result = ''
    let lastIndex = 0
    for (let index = 0; index < text.length; index++) {
        const escaped = ESCAPE_HTML_CHARS[text[index]]
        if (escaped) {
            result += text.slice(lastIndex, index) + escaped
            lastIndex = index + 1
        }
    }
    return lastIndex === 0 ? text : result + text.slice(lastIndex)
}

export function scopeStylesheet(cssText, scopeId) {
    const scopeAttr = `[style-scoped="${scopeId}"]`
    return cssText.replace(/([^\r\n,{}]+)(?=\s*\{)/g, (selectorPart) => {
        const trimmed = selectorPart.trim()
        if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith(':')) return selectorPart
        return selectorPart
            .split(',')
            .map((part) => {
                const sel = part.trim()
                const descendant = `${scopeAttr} ${sel}`
                if (/^[.#\[]/.test(sel)) {
                    return `${descendant}, ${scopeAttr}${sel}`
                }
                return descendant
            })
            .join(',')
    })
}

export function readBalancedParentheses(source, openPosition) {
    if (source[openPosition] !== '(') return null
    let depth = 0
    for (let index = openPosition; index < source.length; index++) {
        if (source[index] === '(') depth++
        else if (source[index] === ')') {
            depth--
            if (depth === 0) {
                return {
                    endPosition: index + 1,
                    innerExpression: source.slice(openPosition + 1, index),
                }
            }
        }
    }
    return null
}

export function isEscapedAtSign(source, position) {
    return position > 0 && source[position - 1] === '@'
}

export function findNextMarkupToken(source, startPosition) {
    const sourceLength = source.length
    for (let index = startPosition; index < sourceLength; index++) {
        const char = source[index]
        if (char === '@' && !isEscapedAtSign(source, index)) return index
        if (char !== '{') continue

        const nextChar = source[index + 1]
        if (nextChar === '{') {
            if (source[index + 2] === '-' && source[index + 3] === '-') return index
            return index
        }
        if (nextChar === '!' && source[index + 2] === '!') return index
    }
    return sourceLength
}

function isDirectiveNameStart(char) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_'
}

function isDirectiveNamePart(char) {
    return isDirectiveNameStart(char) || (char >= '0' && char <= '9')
}

/** @returns {{ name: string, expression: string, nextPosition: number } | null} */
export function parseDirectiveToken(source, startPosition) {
    if (source[startPosition] !== '@') return null

    let index = startPosition + 1
    if (index >= source.length || !isDirectiveNameStart(source[index])) return null

    const nameStart = index
    index++
    while (index < source.length && isDirectiveNamePart(source[index])) index++

    const directiveName = source.slice(nameStart, index)
    let nextPosition = index
    let expression = ''

    while (nextPosition < source.length && /\s/.test(source[nextPosition])) nextPosition++

    if (source[nextPosition] === '(') {
        const balanced = readBalancedParentheses(source, nextPosition)
        if (balanced) {
            expression = balanced.innerExpression
            nextPosition = balanced.endPosition
        }
    }

    return { name: directiveName, expression, nextPosition }
}

export function parseForeachExpression(expression) {
    const asMatch = expression.match(/\s+as\s+/)
    if (!asMatch || asMatch.index === undefined) {
        throw new Error(`Invalid @foreach expression: ${expression}`)
    }

    const arrayExpression = expression.slice(0, asMatch.index).trim()
    let itemVariable = expression.slice(asMatch.index + asMatch[0].length).trim()
    const arrowIndex = itemVariable.lastIndexOf('=>')
    if (arrowIndex !== -1) itemVariable = itemVariable.slice(arrowIndex + 2).trim()

    return { arrayExpression, itemVariable }
}

export function parseForInExpression(expression) {
    const commaIdx = expression.lastIndexOf(',')
    if (commaIdx === -1) {
        throw new Error(`Invalid @forIn expression: ${expression}. Expected: target, keyName`)
    }
    const targetExpression = expression.slice(0, commaIdx).trim()
    const keyVariable = expression.slice(commaIdx + 1).trim()
    if (!targetExpression || !keyVariable) {
        throw new Error(`Invalid @forIn expression: ${expression}. Expected: target, keyName`)
    }
    return { targetExpression, keyVariable }
}
