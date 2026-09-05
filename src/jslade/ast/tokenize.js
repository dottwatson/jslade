const KEYWORDS = new Set([
    'true',
    'false',
    'null',
    'undefined',
    'this',
    'typeof',
    'void',
    'new',
    'in',
    'instanceof',
    'delete',
    'if',
    'else',
    'for',
    'while',
    'return',
    'var',
    'let',
    'const',
    'function',
    'break',
    'continue',
    'of',
    'do',
    'case',
    'switch',
    'try',
    'catch',
    'finally',
    'throw',
    'await',
    'yield',
    'class',
    'extends',
    'super',
    'async',
])

function isIdentStart(ch) {
    return /[A-Za-z_$]/.test(ch)
}

function isIdentPart(ch) {
    return /[\w$]/.test(ch)
}

function canOpenRegex(lastToken) {
    return (
        !lastToken ||
        lastToken === '(' ||
        lastToken === '[' ||
        lastToken === '{' ||
        lastToken === ',' ||
        lastToken === ';' ||
        lastToken === ':' ||
        lastToken === '=' ||
        /^(return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/.test(lastToken)
    )
}

/** Tokenize a JS fragment. Returns tokens with { type, value, start, end }. */
export function tokenize(source, startIndex = 0, endIndex = source.length) {
    const tokens = []
    let i = startIndex
    let lastToken = ''

    while (i < endIndex) {
        const ch = source[i]
        const next = source[i + 1]

        if (/\s/.test(ch)) {
            i++
            continue
        }

        const tokenStart = i

        if (ch === '/' && next === '/') {
            i += 2
            while (i < endIndex && source[i] !== '\n') i++
            continue
        }
        if (ch === '/' && next === '*') {
            i += 2
            while (i < endIndex - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++
            i += 2
            continue
        }

        if (ch === '/' && next !== '/' && next !== '*' && canOpenRegex(lastToken)) {
            i++
            while (i < endIndex) {
                if (source[i] === '\\') {
                    i += 2
                    continue
                }
                if (source[i] === '/') {
                    i++
                    while (i < endIndex && /[gimsuy]/.test(source[i])) i++
                    break
                }
                if (source[i] === '[') {
                    i++
                    while (i < endIndex && source[i] !== ']') {
                        if (source[i] === '\\') i++
                        i++
                    }
                }
                i++
            }
            tokens.push({ type: 're', value: source.slice(tokenStart, i), start: tokenStart, end: i })
            lastToken = 're'
            continue
        }

        if (ch === '"' || ch === "'") {
            const quote = ch
            i++
            while (i < endIndex) {
                if (source[i] === '\\') {
                    i += 2
                    continue
                }
                if (source[i] === quote) {
                    i++
                    break
                }
                i++
            }
            tokens.push({ type: 'str', value: source.slice(tokenStart, i), start: tokenStart, end: i })
            lastToken = 'str'
            continue
        }

        if (ch === '`') {
            i++
            while (i < endIndex) {
                if (source[i] === '\\') {
                    i += 2
                    continue
                }
                if (source[i] === '$' && source[i + 1] === '{') {
                    i += 2
                    let depth = 1
                    while (i < endIndex && depth > 0) {
                        if (source[i] === '{') depth++
                        else if (source[i] === '}') depth--
                        i++
                    }
                    continue
                }
                if (source[i] === '`') {
                    i++
                    break
                }
                i++
            }
            tokens.push({ type: 'tpl', value: source.slice(tokenStart, i), start: tokenStart, end: i })
            lastToken = 'tpl'
            continue
        }

        if (isIdentStart(ch)) {
            i++
            while (i < endIndex && isIdentPart(source[i])) i++
            const word = source.slice(tokenStart, i)
            if (KEYWORDS.has(word)) {
                tokens.push({ type: 'kw', value: word, start: tokenStart, end: i })
                lastToken = word
            } else {
                tokens.push({ type: 'name', value: word, start: tokenStart, end: i })
                lastToken = 'name'
            }
            continue
        }

        if ((ch >= '0' && ch <= '9') || (ch === '.' && next >= '0' && next <= '9')) {
            i++
            while (i < endIndex && /[\d._xXa-fA-F]/.test(source[i])) i++
            tokens.push({ type: 'num', value: source.slice(tokenStart, i), start: tokenStart, end: i })
            lastToken = 'num'
            continue
        }

        const three = source.slice(i, i + 3)
        const two = source.slice(i, i + 2)
        const ops3 = ['===', '!==', '>>>', '<<=', '>>=', '...']
        const ops2 = [
            '==',
            '!=',
            '<=',
            '>=',
            '&&',
            '||',
            '??',
            '=>',
            '+=',
            '-=',
            '*=',
            '/=',
            '%=',
            '++',
            '--',
            '<<',
            '>>',
            '**',
        ]
        if (ops3.includes(three)) {
            tokens.push({ type: 'op', value: three, start: tokenStart, end: i + 3 })
            lastToken = three
            i += 3
            continue
        }
        // `a ? .5 : b` is a ternary, not optional chaining.
        if (two === '?.' && !/\d/.test(source[i + 2] || '')) {
            tokens.push({ type: 'op', value: '?.', start: tokenStart, end: i + 2 })
            lastToken = '?.'
            i += 2
            continue
        }
        if (ops2.includes(two)) {
            tokens.push({ type: 'op', value: two, start: tokenStart, end: i + 2 })
            lastToken = two
            i += 2
            continue
        }

        tokens.push({
            type: /[=<>!+\-*/%&|^~?:]/.test(ch) ? 'op' : 'punc',
            value: ch,
            start: tokenStart,
            end: i + 1,
        })
        lastToken = ch
        i++
    }

    tokens.push({ type: 'eof', value: '', start: endIndex, end: endIndex })
    return tokens
}

/** Decode '...' or "..." without eval. */
export function decodeStringLiteral(tokenValue) {
    const quote = tokenValue[0]
    if (quote !== '"' && quote !== "'") return tokenValue
    let out = ''
    for (let i = 1; i < tokenValue.length - 1; i++) {
        const ch = tokenValue[i]
        if (ch !== '\\') {
            out += ch
            continue
        }
        const esc = tokenValue[++i]
        switch (esc) {
            case 'n':
                out += '\n'
                break
            case 'r':
                out += '\r'
                break
            case 't':
                out += '\t'
                break
            case 'b':
                out += '\b'
                break
            case 'f':
                out += '\f'
                break
            case 'v':
                out += '\v'
                break
            case '0':
                out += '\0'
                break
            case 'x': {
                out += String.fromCharCode(parseInt(tokenValue.slice(i + 1, i + 3), 16))
                i += 2
                break
            }
            case 'u': {
                if (tokenValue[i + 1] === '{') {
                    const end = tokenValue.indexOf('}', i + 2)
                    out += String.fromCodePoint(parseInt(tokenValue.slice(i + 2, end), 16))
                    i = end
                } else {
                    out += String.fromCharCode(parseInt(tokenValue.slice(i + 1, i + 5), 16))
                    i += 4
                }
                break
            }
            default:
                out += esc
        }
    }
    return out
}
