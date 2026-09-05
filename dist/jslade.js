/**
 * Jslade — Client-side Component Engine
 * Source: src/jslade/ — rebuild: npm run build
 */
var __jsladeModule = (() => {
    var __defProp = Object.defineProperty
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor
    var __getOwnPropNames = Object.getOwnPropertyNames
    var __hasOwnProp = Object.prototype.hasOwnProperty
    var __export = (target, all) => {
        for (var name in all) __defProp(target, name, { get: all[name], enumerable: true })
    }
    var __copyProps = (to, from, except, desc) => {
        if ((from && typeof from === 'object') || typeof from === 'function') {
            for (let key of __getOwnPropNames(from))
                if (!__hasOwnProp.call(to, key) && key !== except)
                    __defProp(to, key, {
                        get: () => from[key],
                        enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
                    })
        }
        return to
    }
    var __toCommonJS = (mod) => __copyProps(__defProp({}, '__esModule', { value: true }), mod)

    // src/jslade/index.js
    var index_exports = {}
    __export(index_exports, {
        Jslade: () => Jslade,
        compileMarkupSource: () => compileMarkupSource,
        createDirectiveRegistry: () => createDirectiveRegistry,
        escapeHtml: () => escapeHtml,
        parseDirectiveToken: () => parseDirectiveToken,
        parseForeachExpression: () => parseForeachExpression,
        readBalancedParentheses: () => readBalancedParentheses,
    })

    // src/jslade/lib/dev-log.js
    var _devLog = {
        enabled: false,
        warn(...args) {
            if (this.enabled) console.warn(...args)
        },
        error(...args) {
            console.error(...args)
        },
    }

    // src/jslade/lib/instance-registry.js
    var _liveInstancesByTemplate = /* @__PURE__ */ Object.create(null)
    function trackLiveInstance(instance) {
        const name = instance.name
        if (!_liveInstancesByTemplate[name]) _liveInstancesByTemplate[name] = []
        _liveInstancesByTemplate[name].push(instance)
    }
    function untrackLiveInstance(instance) {
        const list = _liveInstancesByTemplate[instance.name]
        if (!list) return
        const index = list.indexOf(instance)
        if (index !== -1) list.splice(index, 1)
    }
    function snapshotLiveInstancesByTemplate() {
        const out = /* @__PURE__ */ Object.create(null)
        for (const name of Object.keys(_liveInstancesByTemplate)) {
            out[name] = _liveInstancesByTemplate[name].slice()
        }
        return out
    }
    function buildModuleSourceText(def) {
        if (!def) return ''
        const parts = []
        if (def.script)
            parts.push(`<script>
${def.script}
<\/script>`)
        if (def.scopedStyles) {
            const tag = def.scopeTargets ? 'style scoped' : 'style'
            parts.push(`<${tag}>
${def.scopedStyles}
</${tag.split(' ')[0]}>`)
        }
        parts.push(`<template>
${def.markup || ''}
</template>`)
        return parts.join('\n\n')
    }
    function computeSourceLineColumn(source, index) {
        const safeIndex = Math.max(0, Math.min(index == null ? 0 : index, source.length))
        const before = source.slice(0, safeIndex)
        const line = before.split('\n').length
        const lastNl = before.lastIndexOf('\n')
        const column = safeIndex - (lastNl === -1 ? 0 : lastNl + 1) + 1
        return { line, column }
    }
    function sourceLineText(sourceText, line) {
        if (!sourceText) return ''
        const lines = sourceText.split('\n')
        return lines[line - 1] ?? ''
    }
    function formatModuleError(templateName, section, sourceText, index, message, sourceLines) {
        const where = sourceText ? computeSourceLineColumn(sourceText, index) : null
        const lineText = where ? sourceLineText(sourceText, where.line) : ''
        let loc = where ? ` in ${section} at line ${where.line}, column ${where.column}` : ` in ${section}`
        if (where && sourceLines) {
            const fileKey = section.startsWith('script')
                ? 'scriptLine1'
                : section.startsWith('markup')
                  ? 'markupLine1'
                  : null
            if (fileKey && sourceLines[fileKey] != null) {
                const fileLine = sourceLines[fileKey] + where.line - 1
                loc += ` (file line ${fileLine}`
                if (sourceLines.sourceFile) loc += ` in ${sourceLines.sourceFile}`
                loc += ')'
            }
        }
        let out = `[Jslade] "${templateName}"${loc}: ${message}`
        if (lineText) {
            out += `
    ${where.line} | ${lineText}`
        }
        return out
    }
    function mapGeneratedMarkupLine(sourceMap, generatedLine) {
        if (!sourceMap || !sourceMap.length) return null
        let best = sourceMap[0]
        for (let i = 0; i < sourceMap.length; i++) {
            if (sourceMap[i].genLine <= generatedLine) best = sourceMap[i]
            else break
        }
        return best.markupIndex
    }
    function parseGeneratedLineFromError(message) {
        if (!message) return null
        const paren = message.match(/\((\d+):(\d+)\)\s*$/)
        if (paren) return Number(paren[1])
        const anon = message.match(/<anonymous>:(\d+):(\d+)/)
        if (anon) return Number(anon[1])
        return null
    }
    function parseGeneratedLineFromStack(stack) {
        if (!stack) return null
        for (const line of stack.split('\n')) {
            const parsed = parseGeneratedLineFromError(line)
            if (parsed != null) return parsed
        }
        return null
    }
    function parseMethodNameFromStack(stack) {
        if (!stack) return null
        const match = stack.match(/at ([A-Za-z_$][\w$]*) \(/)
        return match ? match[1] : null
    }
    function indexOfScriptMethod(script, methodName) {
        if (!script || !methodName) return null
        const patterns = [`function ${methodName}`, `${methodName}(`]
        for (const pattern of patterns) {
            const idx = script.indexOf(pattern)
            if (idx !== -1) return idx
        }
        return null
    }
    function resolveRuntimeErrorLocation(compiled, error, fallback = {}) {
        const raw = compiled?.rawSource || {}
        const sourceLines = raw.sourceLines || null
        let section = fallback.section || 'markup'
        let sourceText = section.startsWith('script') ? raw.script || '' : raw.markup || ''
        let index = fallback.index ?? 0
        const generatedLine = parseGeneratedLineFromError(error?.message) || parseGeneratedLineFromStack(error?.stack)
        if (generatedLine != null && compiled?._preambleLineCount != null) {
            if (generatedLine > compiled._preambleLineCount) {
                section = 'markup'
                sourceText = raw.markup || ''
                const markupBodyLine = generatedLine - compiled._preambleLineCount
                const mapped = mapGeneratedMarkupLine(compiled._markupSourceMap, markupBodyLine)
                if (mapped != null) index = mapped
            } else if (raw.script) {
                section = 'script'
                sourceText = raw.script
                const methodName = parseMethodNameFromStack(error?.stack)
                const methodIndex = indexOfScriptMethod(raw.script, methodName)
                index = methodIndex != null ? methodIndex : 0
            }
        } else if (section.startsWith('script') && raw.script && error?.stack) {
            const methodName = parseMethodNameFromStack(error.stack)
            const methodIndex = indexOfScriptMethod(raw.script, methodName)
            if (methodIndex != null) index = methodIndex
        }
        return { section, sourceText, index, sourceLines }
    }
    function formatRuntimeError(templateName, compiled, error, fallback = {}) {
        const loc = resolveRuntimeErrorLocation(compiled, error, fallback)
        const label = `${loc.section} (runtime)`
        const detail = fallback.detail || error?.message || 'Unknown error'
        return formatModuleError(templateName, label, loc.sourceText, loc.index, detail, loc.sourceLines)
    }
    function createInstanceMethodContext(instance) {
        return new Proxy(instance, {
            get(target, propertyKey) {
                if (propertyKey in target && propertyKey !== 'state') {
                    return target[propertyKey]
                }
                const state = target.state
                if (state && typeof propertyKey === 'string' && propertyKey in state) {
                    return state[propertyKey]
                }
                return target[propertyKey]
            },
            // `this.count` reads from state, so `this.count = 1` must write there too — otherwise the
            // assignment lands on the instance and silently skips the re-render.
            set(target, propertyKey, value) {
                const state = target.state
                if (state && typeof propertyKey === 'string' && propertyKey in state) {
                    state[propertyKey] = value
                    return true
                }
                target[propertyKey] = value
                return true
            },
        })
    }
    function attachScriptMethodsToInstance(instance) {
        const ctx = instance._ctx || (instance._ctx = createInstanceMethodContext(instance))
        const compiled = instance._compiled
        if (!compiled?.methodsAst) return
        for (const methodName of Object.keys(compiled.methodsAst)) {
            instance[methodName] = function (...args) {
                return compiled.callMethod(methodName, args, ctx)
            }
        }
    }

    // src/jslade/lib/html-utils.js
    function isBladeCommentAt(source, position) {
        return (
            source[position] === '{' &&
            source[position + 1] === '{' &&
            source[position + 2] === '-' &&
            source[position + 3] === '-'
        )
    }
    function advancePastBladeComment(source, position, alreadyVerified) {
        if (!alreadyVerified && !isBladeCommentAt(source, position)) return position
        const commentEnd = source.indexOf('--}}', position + 4)
        return commentEnd === -1 ? source.length : commentEnd + 4
    }
    var ESCAPE_HTML_CHARS = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }
    function escapeHtml(value) {
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
    function scopeStylesheet(cssText, scopeId) {
        return cssText.replace(/([^\r\n,{}]+)(?=\s*\{)/g, (selectorPart) => {
            const trimmed = selectorPart.trim()
            if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith(':')) return selectorPart
            return selectorPart
                .split(',')
                .map((part) => `[style-scoped="${scopeId}"] ${part.trim()}`)
                .join(',')
        })
    }
    function readBalancedParentheses(source, openPosition) {
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
    function isEscapedAtSign(source, position) {
        return position > 0 && source[position - 1] === '@'
    }
    function findNextMarkupToken(source, startPosition) {
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
    function parseDirectiveToken(source, startPosition) {
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
    function parseForeachExpression(expression) {
        const asMatch = expression.match(/\s+as\s+/)
        if (!asMatch || asMatch.index === void 0) {
            throw new Error(`Invalid @foreach expression: ${expression}`)
        }
        const arrayExpression = expression.slice(0, asMatch.index).trim()
        let itemVariable = expression.slice(asMatch.index + asMatch[0].length).trim()
        const arrowIndex = itemVariable.lastIndexOf('=>')
        if (arrowIndex !== -1) itemVariable = itemVariable.slice(arrowIndex + 2).trim()
        return { arrayExpression, itemVariable }
    }
    function parseForInExpression(expression) {
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

    // src/jslade/lib/constants.js
    var COMPONENT_DEF_TAG = 'noembed'
    var MAX_COMPILE_ITERATIONS = 5e4
    var MAX_CONSECUTIVE_RENDERS = 50
    var LIFECYCLE_HOOKS = ['mount', 'updated', 'unmount']
    var EVENT_ATTRIBUTE_PREFIX = 'data-jsd-on-'
    var INSTANCE_RESERVED_NAMES = [
        'id',
        'name',
        'template',
        'container',
        'parent',
        'children',
        'childrens',
        'state',
        'initialized',
        'source',
        'find',
        'findAll',
        'closest',
        'remove',
        'unmount',
        'renderTo',
    ]

    // src/jslade/ast/tokenize.js
    var KEYWORDS = /* @__PURE__ */ new Set([
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
    function tokenize(source, startIndex = 0, endIndex = source.length) {
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
    function decodeStringLiteral(tokenValue) {
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
                    out += '	'
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

    // src/jslade/ast/parse-expr.js
    var UNARY = /* @__PURE__ */ new Set(['!', '~', '+', '-', 'typeof', 'void', 'delete'])
    var PREC = {
        '||': 1,
        '??': 1,
        '&&': 2,
        '|': 3,
        '^': 4,
        '&': 5,
        '==': 6,
        '!=': 6,
        '===': 6,
        '!==': 6,
        '<': 7,
        '>': 7,
        '<=': 7,
        '>=': 7,
        in: 7,
        instanceof: 7,
        '<<': 8,
        '>>': 8,
        '>>>': 8,
        '+': 9,
        '-': 9,
        '*': 10,
        '/': 10,
        '%': 10,
        '**': 11,
    }
    var Parser = class {
        constructor(source) {
            this.source = source
            this.tokens = tokenize(source)
            this.pos = 0
        }
        peek(offset = 0) {
            return this.tokens[this.pos + offset] || { type: 'eof', value: '' }
        }
        advance() {
            return this.tokens[this.pos++]
        }
        at(type, value) {
            const t = this.peek()
            if (type && t.type !== type) {
                if (value === ':' && t.type === 'op' && t.value === ':') return true
                return false
            }
            if (value !== void 0 && t.value !== value) return false
            return true
        }
        expect(type, value) {
            if (this.at(type, value)) return this.advance()
            const t = this.peek()
            throw new Error(`Unexpected token ${t.value || t.type} at ${t.start}`)
        }
        expectOptionalSemicolon() {
            if (this.at('punc', ';')) this.advance()
        }
        /** Reserved words are valid property and object keys: `map.delete`, `{ class: 'x' }`. */
        expectPropertyName() {
            if (this.at('kw')) return this.advance().value
            return this.expect('name').value
        }
        /** A line break ends the statement, so `return` on its own line takes no argument. */
        newlineBeforeNext() {
            const previous = this.tokens[this.pos - 1]
            if (!previous) return false
            return this.source.slice(previous.end, this.peek().start).indexOf('\n') !== -1
        }
        parseExpression() {
            return this.parseAssignment()
        }
        parseAssignment() {
            const arrow = this.tryParseArrow()
            if (arrow) return arrow
            let left = this.parseConditional()
            if (
                this.at('op', '=') ||
                this.at('op', '+=') ||
                this.at('op', '-=') ||
                this.at('op', '*=') ||
                this.at('op', '/=') ||
                this.at('op', '%=')
            ) {
                const op = this.advance().value
                const right = this.parseAssignment()
                if (op === '=' && (left.type === 'Array' || left.type === 'Object')) {
                    left = expressionToPattern(left)
                }
                return { type: 'Assign', op, left, right }
            }
            return left
        }
        /** Params and a parenthesized expression start alike, so try the param list and back off. */
        tryParseArrow() {
            const t = this.peek()
            if (t.type === 'name' && this.peek(1).type === 'op' && this.peek(1).value === '=>') {
                const param = this.advance().value
                this.advance()
                return this.parseArrowFunction([{ type: 'Ident', name: param }])
            }
            if (!(t.type === 'punc' && t.value === '(')) return null
            const checkpoint = this.pos
            try {
                const params = this.parseParamList()
                if (this.at('op', '=>')) {
                    this.advance()
                    return this.parseArrowFunction(params)
                }
            } catch (_) {}
            this.pos = checkpoint
            return null
        }
        parseConditional() {
            let node = this.parseBinary(0)
            if (this.at('punc', '?') || (this.at('op', '?') && this.peek(1).value !== '?')) {
                this.advance()
                const consequent = this.parseExpression()
                this.expect('punc', ':')
                const alternate = this.parseConditional()
                return { type: 'Cond', test: node, consequent, alternate }
            }
            return node
        }
        parseBinary(minPrec) {
            let left = this.parseUnary()
            while (true) {
                const t = this.peek()
                let op = null
                if (t.type === 'op' && PREC[t.value] != null) op = t.value
                if (t.type === 'kw' && (t.value === 'in' || t.value === 'instanceof')) op = t.value
                if (!op || PREC[op] < minPrec) break
                this.advance()
                const right = this.parseBinary(PREC[op] + 1)
                left = { type: 'Binary', op, left, right }
            }
            return left
        }
        parseUnary() {
            const t = this.peek()
            if ((t.type === 'op' && UNARY.has(t.value)) || (t.type === 'kw' && UNARY.has(t.value))) {
                const op = this.advance().value
                return { type: 'Unary', op, arg: this.parseUnary() }
            }
            return this.parsePostfix()
        }
        parsePostfix() {
            let node = this.parsePrimary()
            let optional = false
            while (true) {
                if (this.at('op', '?.')) {
                    this.advance()
                    optional = true
                    if (this.at('punc', '(')) {
                        this.advance()
                        const args = this.parseArgumentList()
                        this.expect('punc', ')')
                        node = { type: 'Call', callee: node, args, optional: true }
                    } else if (this.at('punc', '[')) {
                        this.advance()
                        const property = this.parseExpression()
                        this.expect('punc', ']')
                        node = { type: 'Member', object: node, property, computed: true, optional: true }
                    } else {
                        node = {
                            type: 'Member',
                            object: node,
                            property: this.expectPropertyName(),
                            computed: false,
                            optional: true,
                        }
                    }
                    continue
                }
                if (this.at('punc', '.')) {
                    this.advance()
                    node = { type: 'Member', object: node, property: this.expectPropertyName(), computed: false }
                    continue
                }
                if (this.at('punc', '[')) {
                    this.advance()
                    const property = this.parseExpression()
                    this.expect('punc', ']')
                    node = { type: 'Member', object: node, property, computed: true }
                    continue
                }
                if (this.at('punc', '(')) {
                    this.advance()
                    const args = this.parseArgumentList()
                    this.expect('punc', ')')
                    node = { type: 'Call', callee: node, args }
                    continue
                }
                if (this.at('op', '++') || this.at('op', '--')) {
                    const op = this.advance().value
                    node = { type: 'Update', op, arg: node, prefix: false }
                    continue
                }
                break
            }
            return optional ? { type: 'Chain', expr: node } : node
        }
        parsePrimary() {
            const t = this.peek()
            if (t.type === 'op' && (t.value === '++' || t.value === '--')) {
                const op = this.advance().value
                return { type: 'Update', op, arg: this.parseUnary(), prefix: true }
            }
            if (t.type === 'num') {
                this.advance()
                return { type: 'Literal', value: Number(t.value) }
            }
            if (t.type === 'str') {
                this.advance()
                return { type: 'Literal', value: decodeStringLiteral(t.value) }
            }
            if (t.type === 'tpl') {
                this.advance()
                return { type: 'Template', raw: t.value }
            }
            if (t.type === 're') {
                this.advance()
                const body = t.value.slice(1, t.value.lastIndexOf('/'))
                const flags = t.value.slice(t.value.lastIndexOf('/') + 1)
                return { type: 'Literal', value: new RegExp(body, flags) }
            }
            if (t.type === 'kw') {
                if (t.value === 'true' || t.value === 'false') {
                    this.advance()
                    return { type: 'Literal', value: t.value === 'true' }
                }
                if (t.value === 'null') {
                    this.advance()
                    return { type: 'Literal', value: null }
                }
                if (t.value === 'undefined') {
                    this.advance()
                    return { type: 'Literal', value: void 0 }
                }
                if (t.value === 'this') {
                    this.advance()
                    return { type: 'This' }
                }
                if (t.value === 'function') {
                    return this.parseFunctionExpr(false)
                }
                if (t.value === 'new') {
                    this.advance()
                    const callee = this.parsePrimary()
                    this.expect('punc', '(')
                    const args = this.parseArgumentList()
                    this.expect('punc', ')')
                    return { type: 'New', callee, args }
                }
            }
            if (t.type === 'name') {
                this.advance()
                return { type: 'Ident', name: t.value }
            }
            if (t.type === 'punc' && t.value === '(') {
                this.advance()
                const inner = this.parseExpression()
                this.expect('punc', ')')
                return inner
            }
            if (t.type === 'punc' && t.value === '[') {
                this.advance()
                const elements = []
                while (!this.at('punc', ']')) {
                    if (this.at('punc', ',')) {
                        this.advance()
                        continue
                    }
                    if (this.at('op', '...')) {
                        this.advance()
                        elements.push({ type: 'Spread', arg: this.parseAssignment() })
                        continue
                    }
                    elements.push(this.parseExpression())
                }
                this.expect('punc', ']')
                return { type: 'Array', elements }
            }
            if (t.type === 'punc' && t.value === '{') {
                return this.parseObject()
            }
            throw new Error(`Unexpected token ${t.value || t.type} at ${t.start}`)
        }
        parseObject() {
            this.expect('punc', '{')
            const props = []
            if (!this.at('punc', '}')) {
                while (true) {
                    if (this.at('op', '...')) {
                        this.advance()
                        props.push({ spread: true, value: this.parseAssignment() })
                        if (!this.at('punc', ',')) break
                        this.advance()
                        if (this.at('punc', '}')) break
                        continue
                    }
                    let key
                    let computed = false
                    if (this.at('punc', '[')) {
                        this.advance()
                        key = this.parseExpression()
                        this.expect('punc', ']')
                        computed = true
                    } else if (this.at('str') || this.at('num')) {
                        const tok = this.advance()
                        key = tok.type === 'num' ? Number(tok.value) : decodeStringLiteral(tok.value)
                    } else {
                        key = this.expectPropertyName()
                    }
                    let value = null
                    if (this.at('punc', ':') || this.at('op', ':')) {
                        this.advance()
                        value = this.parseExpression()
                    } else if (this.at('punc', '(')) {
                        value = this.parseFunctionExpr(true, key)
                    } else {
                        value = { type: 'Ident', name: key }
                    }
                    props.push({ key, value, computed })
                    if (!this.at('punc', ',')) break
                    this.advance()
                    if (this.at('punc', '}')) break
                }
            }
            this.expect('punc', '}')
            return { type: 'Object', props }
        }
        parseArgumentList() {
            const args = []
            if (this.at('punc', ')')) return args
            do {
                if (this.at('op', '...')) {
                    this.advance()
                    args.push({ type: 'Spread', arg: this.parseAssignment() })
                } else {
                    args.push(this.parseExpression())
                }
            } while (this.at('punc', ',') && this.advance())
            return args
        }
        parseParamList() {
            this.expect('punc', '(')
            const params = []
            if (!this.at('punc', ')')) {
                do {
                    if (this.at('op', '...')) {
                        this.advance()
                        params.push({ type: 'Rest', target: this.parseBindingTarget() })
                        break
                    }
                    params.push(this.parseBindingElement())
                } while (this.at('punc', ',') && this.advance())
            }
            this.expect('punc', ')')
            return params
        }
        /** A binding target plus its optional `= default`. */
        parseBindingElement() {
            const target = this.parseBindingTarget()
            if (!this.at('op', '=')) return target
            this.advance()
            return { type: 'Default', target, fallback: this.parseAssignment() }
        }
        parseBindingTarget() {
            if (this.at('punc', '{')) return this.parseObjectPattern()
            if (this.at('punc', '[')) return this.parseArrayPattern()
            return { type: 'Ident', name: this.expect('name').value }
        }
        parseObjectPattern() {
            this.expect('punc', '{')
            const props = []
            let rest = null
            while (!this.at('punc', '}')) {
                if (this.at('op', '...')) {
                    this.advance()
                    rest = this.parseBindingTarget()
                    break
                }
                let key
                let computed = false
                if (this.at('punc', '[')) {
                    this.advance()
                    key = this.parseExpression()
                    this.expect('punc', ']')
                    computed = true
                } else if (this.at('str') || this.at('num')) {
                    const tok = this.advance()
                    key = tok.type === 'num' ? Number(tok.value) : decodeStringLiteral(tok.value)
                } else {
                    key = this.expectPropertyName()
                }
                let value
                if (this.at('punc', ':') || this.at('op', ':')) {
                    this.advance()
                    value = this.parseBindingElement()
                } else if (this.at('op', '=')) {
                    this.advance()
                    value = { type: 'Default', target: { type: 'Ident', name: key }, fallback: this.parseAssignment() }
                } else {
                    value = { type: 'Ident', name: key }
                }
                props.push({ key, computed, value })
                if (!this.at('punc', ',')) break
                this.advance()
            }
            this.expect('punc', '}')
            return { type: 'ObjectPattern', props, rest }
        }
        parseArrayPattern() {
            this.expect('punc', '[')
            const elements = []
            let rest = null
            while (!this.at('punc', ']')) {
                if (this.at('punc', ',')) {
                    this.advance()
                    elements.push(null)
                    continue
                }
                if (this.at('op', '...')) {
                    this.advance()
                    rest = this.parseBindingTarget()
                    break
                }
                elements.push(this.parseBindingElement())
                if (!this.at('punc', ',')) break
                this.advance()
            }
            this.expect('punc', ']')
            return { type: 'ArrayPattern', elements, rest }
        }
        parseFunctionExpr(alreadyConsumedKeyword, name = null) {
            if (!alreadyConsumedKeyword) this.expect('kw', 'function')
            if (!name && this.at('name')) name = this.advance().value
            const params = this.parseParamList()
            const body = this.parseBlock()
            return { type: 'Function', name, params, body }
        }
        parseArrowFunction(params) {
            let body
            let exprBody = false
            if (this.at('punc', '{')) {
                body = this.parseBlock()
            } else {
                exprBody = true
                body = this.parseExpression()
            }
            return { type: 'Arrow', params, body, exprBody }
        }
        parseBlock() {
            this.expect('punc', '{')
            const body = this.parseStatementListInner()
            this.expect('punc', '}')
            return body
        }
        parseStatementList() {
            return this.parseStatementListInner()
        }
        parseStatementListInner() {
            const stmts = []
            while (!this.at('punc', '}') && !this.at('eof')) {
                stmts.push(this.parseStatement())
            }
            return stmts
        }
        parseStatement() {
            const t = this.peek()
            if (t.type === 'kw' && t.value === 'function') {
                this.advance()
                let name = null
                if (this.at('name')) name = this.advance().value
                const params = this.parseParamList()
                const body = this.parseBlock()
                return { type: 'FunctionDecl', fn: { type: 'Function', name, params, body } }
            }
            if (t.type === 'kw' && (t.value === 'var' || t.value === 'let' || t.value === 'const')) {
                return this.parseVarDeclaration(true)
            }
            if (t.type === 'kw' && t.value === 'if') {
                this.advance()
                this.expect('punc', '(')
                const test = this.parseExpression()
                this.expect('punc', ')')
                const consequent = this.at('punc', '{') ? this.parseBlock() : [this.parseStatement()]
                let alternate = null
                if (this.at('kw', 'else')) {
                    this.advance()
                    alternate = this.at('punc', '{') ? this.parseBlock() : [this.parseStatement()]
                }
                return { type: 'If', test, consequent, alternate }
            }
            if (t.type === 'kw' && t.value === 'for') {
                return this.parseForStatement()
            }
            if (t.type === 'kw' && t.value === 'while') {
                this.advance()
                this.expect('punc', '(')
                const test = this.parseExpression()
                this.expect('punc', ')')
                const body = this.at('punc', '{') ? this.parseBlock() : [this.parseStatement()]
                return { type: 'While', test, body }
            }
            if (t.type === 'kw' && t.value === 'return') {
                this.advance()
                let arg = null
                if (!this.at('punc', ';') && !this.at('punc', '}') && !this.at('eof') && !this.newlineBeforeNext()) {
                    arg = this.parseExpression()
                }
                this.expectOptionalSemicolon()
                return { type: 'Return', arg }
            }
            if (t.type === 'kw' && t.value === 'break') {
                this.advance()
                this.expectOptionalSemicolon()
                return { type: 'Break' }
            }
            if (t.type === 'kw' && t.value === 'continue') {
                this.advance()
                this.expectOptionalSemicolon()
                return { type: 'Continue' }
            }
            if (t.type === 'kw' && t.value === 'throw') {
                this.advance()
                const arg = this.parseExpression()
                this.expectOptionalSemicolon()
                return { type: 'Throw', arg }
            }
            if (t.type === 'kw' && t.value === 'try') {
                return this.parseTryStatement()
            }
            if (this.at('punc', '{')) {
                return { type: 'Block', body: this.parseBlock() }
            }
            const expr = this.parseExpression()
            this.expectOptionalSemicolon()
            return { type: 'ExprStmt', expr }
        }
        parseTryStatement() {
            this.advance()
            const block = this.parseBlock()
            let param = null
            let handler = null
            let finalizer = null
            if (this.at('kw', 'catch')) {
                this.advance()
                if (this.at('punc', '(')) {
                    this.advance()
                    param = this.parseBindingTarget()
                    this.expect('punc', ')')
                }
                handler = this.parseBlock()
            }
            if (this.at('kw', 'finally')) {
                this.advance()
                finalizer = this.parseBlock()
            }
            if (!handler && !finalizer) {
                throw new Error('Missing catch or finally after try')
            }
            return { type: 'Try', block, param, handler, finalizer }
        }
        parseForStatement() {
            this.advance()
            this.expect('punc', '(')
            const checkpoint = this.pos
            if (this.at('kw', 'var') || this.at('kw', 'let') || this.at('kw', 'const')) {
                const kind = this.advance().value
                let target = null
                try {
                    target = this.parseBindingTarget()
                } catch (_) {
                    target = null
                }
                if (target && (this.at('kw', 'in') || this.at('kw', 'of'))) {
                    const type = this.advance().value === 'in' ? 'ForIn' : 'ForOf'
                    const right = this.parseExpression()
                    this.expect('punc', ')')
                    const body2 = this.at('punc', '{') ? this.parseBlock() : [this.parseStatement()]
                    return { type, left: { kind, target }, right, body: body2 }
                }
                this.pos = checkpoint
            }
            let init = null
            if (!this.at('punc', ';')) {
                if (this.at('kw', 'var') || this.at('kw', 'let') || this.at('kw', 'const')) {
                    init = this.parseVarDeclaration(false)
                } else {
                    init = { type: 'ExprStmt', expr: this.parseExpression() }
                }
            }
            this.expect('punc', ';')
            let test = null
            if (!this.at('punc', ';')) test = this.parseExpression()
            this.expect('punc', ';')
            let update = null
            if (!this.at('punc', ')')) update = this.parseExpression()
            this.expect('punc', ')')
            const body = this.at('punc', '{') ? this.parseBlock() : [this.parseStatement()]
            return { type: 'For', init, test, update, body }
        }
        parseVarDeclaration(consumeSemicolon) {
            const kind = this.advance().value
            const decls = []
            do {
                const target = this.parseBindingTarget()
                let init = null
                if (this.at('op', '=')) {
                    this.advance()
                    init = this.parseExpression()
                }
                decls.push({ target, init })
            } while (this.at('punc', ',') && this.advance())
            if (consumeSemicolon) this.expectOptionalSemicolon()
            return { type: 'Var', kind, decls }
        }
        parseForHeader() {
            let init = null
            if (!this.at('punc', ';')) {
                init = { type: 'ExprStmt', expr: this.parseExpression() }
            }
            this.expect('punc', ';')
            let test = null
            if (!this.at('punc', ';')) test = this.parseExpression()
            this.expect('punc', ';')
            let update = null
            if (!this.at('eof')) update = this.parseExpression()
            return { type: 'For', init, test, update, body: [] }
        }
    }
    function expressionToPattern(node) {
        if (!node) return node
        if (node.type === 'Array') {
            const elements = []
            let rest = null
            for (const element of node.elements) {
                if (element && element.type === 'Spread') {
                    rest = expressionToPattern(element.arg)
                    continue
                }
                elements.push(element ? expressionToPattern(element) : null)
            }
            return { type: 'ArrayPattern', elements, rest }
        }
        if (node.type === 'Object') {
            const props = []
            let rest = null
            for (const prop of node.props) {
                if (prop.spread) {
                    rest = expressionToPattern(prop.value)
                    continue
                }
                props.push({ key: prop.key, computed: prop.computed, value: expressionToPattern(prop.value) })
            }
            return { type: 'ObjectPattern', props, rest }
        }
        if (node.type === 'Assign' && node.op === '=') {
            return { type: 'Default', target: expressionToPattern(node.left), fallback: node.right }
        }
        return node
    }
    function parseExpression(source) {
        return new Parser(String(source).trim()).parseExpression()
    }
    function parseParams(source) {
        return new Parser(`(${String(source).trim()})`).parseParamList()
    }
    function parseObjectLiteral(source) {
        const src = String(source).trim()
        const wrapped = src.startsWith('{') ? src : `{${src}}`
        return new Parser(wrapped).parseExpression()
    }
    function parseStatementList(source) {
        return new Parser(String(source).trim()).parseStatementList()
    }
    function parseForHeader(source) {
        return new Parser(String(source).trim()).parseForHeader()
    }

    // src/jslade/markup/ast-emitter.js
    function createAstEmitter(errorContext) {
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
                    markupError(
                        _lastMarkupIndex,
                        `Unclosed directive(s): ${openBlockStack.map((n) => '@' + n).join(', ')}`
                    )
                }
                return { type: 'Template', body, sourceMap }
            },
        }
    }
    function createAstDirectiveContext(token, emitter, errorContext, tokenStart) {
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

    // src/jslade/markup/ast-compiler.js
    function compileMarkupToAst(markup, directiveRegistry2, errorContext) {
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
                if (!directiveRegistry2.compileAst(directiveToken, emitter, errorContext, tokenStart, eventHandlers)) {
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
                    emitter.appendToOpen(
                        { type: 'Interpolate', expr: parseExpression(exprSource), escape: true },
                        cursor
                    )
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

    // src/jslade/ast/eval-stmt.js
    function declarePattern(pattern, value, scope) {
        bindPattern(pattern, value, scope, (name, bound) => {
            scope.vars[name] = bound
        })
    }
    function evalStatementList(stmts, scope) {
        let result = void 0
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
    function evalStatement(stmt, scope) {
        if (!stmt) return void 0
        if (Array.isArray(stmt)) return evalStatementList(stmt, scope)
        switch (stmt.type) {
            case 'Block':
                return evalStatementList(stmt.body, scope)
            case 'Var': {
                if (!scope.vars) scope.vars = /* @__PURE__ */ Object.create(null)
                for (const decl of stmt.decls) {
                    declarePattern(decl.target, decl.init ? evalExpression(decl.init, scope) : void 0, scope)
                }
                return void 0
            }
            case 'ExprStmt':
                return evalExpression(stmt.expr, scope)
            case 'If': {
                const branch = evalExpression(stmt.test, scope) ? stmt.consequent : stmt.alternate
                if (!branch) return void 0
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
                return void 0
            }
            case 'ForIn': {
                const object = evalExpression(stmt.right, scope)
                if (object == null) return void 0
                if (!scope.vars) scope.vars = /* @__PURE__ */ Object.create(null)
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
                return void 0
            }
            case 'ForOf': {
                const iterable = evalExpression(stmt.right, scope)
                if (iterable == null) return void 0
                if (!scope.vars) scope.vars = /* @__PURE__ */ Object.create(null)
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
                return void 0
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
                return void 0
            }
            case 'Return': {
                scope._returned = true
                scope._return = stmt.arg ? evalExpression(stmt.arg, scope) : void 0
                return scope._return
            }
            case 'Break':
                scope._break = true
                return void 0
            case 'Continue':
                scope._continue = true
                return void 0
            case 'FunctionDecl':
                if (!scope.vars) scope.vars = /* @__PURE__ */ Object.create(null)
                scope.vars[stmt.fn.name] = evalExpression(stmt.fn, scope)
                return void 0
            case 'Throw':
                throw evalExpression(stmt.arg, scope)
            case 'Try':
                return evalTry(stmt, scope)
            default:
                return void 0
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
        return void 0
    }
    function runCatchClause(stmt, error, scope) {
        if (stmt.param == null) {
            evalStatementList(stmt.handler, scope)
            return
        }
        if (!scope.vars) scope.vars = /* @__PURE__ */ Object.create(null)
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
    function runMethodAst(body, scope) {
        const localScope = {
            ...scope,
            vars: Object.create(scope.vars || null),
            _break: false,
            _continue: false,
            _returned: false,
            _return: void 0,
        }
        const result = evalStatementList(body, localScope)
        return localScope._returned ? localScope._return : result
    }
    function runHookAst(body, scope) {
        const localScope = {
            ...scope,
            vars: Object.create(scope.vars || null),
            _break: false,
            _continue: false,
            _returned: false,
            _return: void 0,
        }
        evalStatementList(body, localScope)
    }

    // src/jslade/ast/eval-expr.js
    var SHORT_CIRCUIT = Symbol('jslade.optionalChain')
    function evalExpression(node, scope) {
        if (!node) return void 0
        switch (node.type) {
            case 'Literal':
                return node.value
            case 'This':
                return scope.thisVal ?? scope.self
            case 'Ident':
                return resolveIdent(node.name, scope)
            case 'Chain': {
                const value = evalExpression(node.expr, scope)
                return value === SHORT_CIRCUIT ? void 0 : value
            }
            case 'Member': {
                const object = evalExpression(node.object, scope)
                if (object === SHORT_CIRCUIT) return SHORT_CIRCUIT
                if (node.optional && object == null) return SHORT_CIRCUIT
                const property = node.computed ? evalExpression(node.property, scope) : node.property
                const isThis = node.object.type === 'This' || object === scope.thisVal || object === scope.self
                if (isThis && typeof property === 'string' && scope.methodsAst?.[property] && scope.callMethod) {
                    return (...args) => scope.callMethod(property, args)
                }
                if (object == null) return void 0
                return object[property]
            }
            case 'Call': {
                const calleeNode = node.callee
                let callThis = scope.thisVal ?? scope.self
                let callee
                if (calleeNode.type === 'Member') {
                    const object = evalExpression(calleeNode.object, scope)
                    if (object === SHORT_CIRCUIT) return SHORT_CIRCUIT
                    if (calleeNode.optional && object == null) return SHORT_CIRCUIT
                    const property = calleeNode.computed
                        ? evalExpression(calleeNode.property, scope)
                        : calleeNode.property
                    const isThis =
                        calleeNode.object.type === 'This' || object === scope.thisVal || object === scope.self
                    if (object == null) {
                        callee = void 0
                    } else {
                        callThis = object
                        callee = object[property]
                    }
                    if (
                        typeof callee !== 'function' &&
                        isThis &&
                        typeof property === 'string' &&
                        scope.methodsAst?.[property] &&
                        scope.callMethod
                    ) {
                        callee = (...args2) => scope.callMethod(property, args2)
                        callThis = scope.thisVal ?? scope.self
                    }
                } else {
                    callee = evalExpression(calleeNode, scope)
                    if (callee === SHORT_CIRCUIT) return SHORT_CIRCUIT
                    if (
                        calleeNode.type === 'Ident' &&
                        typeof globalThis !== 'undefined' &&
                        callee === globalThis[calleeNode.name]
                    ) {
                        callThis = globalThis
                    }
                }
                if (node.optional && callee == null) return SHORT_CIRCUIT
                const args = evalArguments(node.args, scope)
                if (typeof callee !== 'function') {
                    const label =
                        calleeNode.type === 'Ident'
                            ? calleeNode.name
                            : calleeNode.type === 'Member' && !calleeNode.computed
                              ? describeMember(calleeNode)
                              : 'value'
                    throw new TypeError(`${label} is not a function`)
                }
                return callee.apply(callThis, args)
            }
            case 'New': {
                const Ctor = evalExpression(node.callee, scope)
                return new Ctor(...evalArguments(node.args, scope))
            }
            case 'Unary': {
                const arg = evalExpression(node.arg, scope)
                switch (node.op) {
                    case '!':
                        return !arg
                    case '~':
                        return ~arg
                    case '+':
                        return +arg
                    case '-':
                        return -arg
                    case 'typeof':
                        return typeof arg
                    case 'void':
                        return void arg
                    case 'delete': {
                        const target = node.arg.type === 'Chain' ? node.arg.expr : node.arg
                        if (target.type === 'Ident') {
                            const env = scope.vars
                            if (env && Object.prototype.hasOwnProperty.call(env, target.name)) {
                                delete env[target.name]
                                return true
                            }
                        }
                        if (target.type === 'Member') {
                            const object = evalExpression(target.object, scope)
                            if (object == null) return true
                            const property = target.computed ? evalExpression(target.property, scope) : target.property
                            return delete object[property]
                        }
                        return true
                    }
                    default:
                        return arg
                }
            }
            case 'Binary': {
                const left = evalExpression(node.left, scope)
                if (node.op === '&&') return left && evalExpression(node.right, scope)
                if (node.op === '||') return left || evalExpression(node.right, scope)
                if (node.op === '??') return left ?? evalExpression(node.right, scope)
                const right = evalExpression(node.right, scope)
                switch (node.op) {
                    case '+':
                        return left + right
                    case '-':
                        return left - right
                    case '*':
                        return left * right
                    case '/':
                        return left / right
                    case '%':
                        return left % right
                    case '**':
                        return left ** right
                    case '==':
                        return left == right
                    case '!=':
                        return left != right
                    case '===':
                        return left === right
                    case '!==':
                        return left !== right
                    case '<':
                        return left < right
                    case '>':
                        return left > right
                    case '<=':
                        return left <= right
                    case '>=':
                        return left >= right
                    case 'in':
                        return right != null && left in right
                    case 'instanceof':
                        return right != null && left instanceof right
                    case '|':
                        return left | right
                    case '^':
                        return left ^ right
                    case '&':
                        return left & right
                    case '<<':
                        return left << right
                    case '>>':
                        return left >> right
                    case '>>>':
                        return left >>> right
                    default:
                        return void 0
                }
            }
            case 'Cond': {
                return evalExpression(node.test, scope)
                    ? evalExpression(node.consequent, scope)
                    : evalExpression(node.alternate, scope)
            }
            case 'Assign': {
                if (node.op && node.op !== '=') {
                    const value2 = applyCompound(
                        node.op,
                        evalExpression(node.left, scope),
                        evalExpression(node.right, scope)
                    )
                    assignTarget(node.left, value2, scope)
                    return value2
                }
                const value = evalExpression(node.right, scope)
                if (node.left.type === 'ObjectPattern' || node.left.type === 'ArrayPattern') {
                    bindPattern(node.left, value, scope, (name, bound) =>
                        assignTarget({ type: 'Ident', name }, bound, scope)
                    )
                    return value
                }
                assignTarget(node.left, value, scope)
                return value
            }
            case 'Update': {
                const current = evalExpression(node.arg, scope)
                const delta = node.op === '++' ? 1 : -1
                const updated = current + delta
                assignTarget(node.arg, updated, scope)
                return node.prefix ? updated : current
            }
            case 'Array': {
                const out = []
                for (const element of node.elements) {
                    if (element == null) {
                        out.push(void 0)
                    } else if (element.type === 'Spread') {
                        out.push(...iterableToArray(evalExpression(element.arg, scope)))
                    } else {
                        out.push(evalExpression(element, scope))
                    }
                }
                return out
            }
            case 'Object': {
                const out = {}
                for (const prop of node.props) {
                    if (prop.spread) {
                        Object.assign(out, evalExpression(prop.value, scope))
                        continue
                    }
                    const key = prop.computed ? evalExpression(prop.key, scope) : prop.key
                    out[key] = evalExpression(prop.value, scope)
                }
                return out
            }
            case 'Template':
                return evalTemplateLiteral(node.raw, scope)
            case 'Function':
            case 'Arrow':
                return createFunction(node, scope)
            default:
                return void 0
        }
    }
    function applyCompound(op, left, right) {
        switch (op) {
            case '+=':
                return left + right
            case '-=':
                return left - right
            case '*=':
                return left * right
            case '/=':
                return left / right
            case '%=':
                return left % right
            default:
                return right
        }
    }
    function iterableToArray(value) {
        if (value == null) return []
        if (Array.isArray(value)) return value
        if (typeof value === 'string' || typeof value[Symbol.iterator] === 'function') return Array.from(value)
        return []
    }
    function evalArguments(nodes, scope) {
        const args = []
        for (const node of nodes) {
            if (node && node.type === 'Spread') {
                args.push(...iterableToArray(evalExpression(node.arg, scope)))
                continue
            }
            args.push(evalExpression(node, scope))
        }
        return args
    }
    function bindPattern(pattern, value, scope, define) {
        if (!pattern) return
        switch (pattern.type) {
            case 'Ident':
                define(pattern.name, value)
                return
            case 'Default':
                bindPattern(
                    pattern.target,
                    value === void 0 ? evalExpression(pattern.fallback, scope) : value,
                    scope,
                    define
                )
                return
            case 'ObjectPattern': {
                const source = value == null ? {} : value
                const taken = []
                for (const prop of pattern.props) {
                    const key = prop.computed ? evalExpression(prop.key, scope) : prop.key
                    taken.push(String(key))
                    bindPattern(prop.value, source[key], scope, define)
                }
                if (pattern.rest) {
                    const rest = {}
                    for (const key of Object.keys(source)) {
                        if (!taken.includes(key)) rest[key] = source[key]
                    }
                    bindPattern(pattern.rest, rest, scope, define)
                }
                return
            }
            case 'ArrayPattern': {
                const items = iterableToArray(value)
                for (let i = 0; i < pattern.elements.length; i++) {
                    bindPattern(pattern.elements[i], items[i], scope, define)
                }
                if (pattern.rest) bindPattern(pattern.rest, items.slice(pattern.elements.length), scope, define)
                return
            }
            case 'Member':
                assignTarget(pattern, value, scope)
                return
            default:
                return
        }
    }
    function bindParams(params, args, scope, target) {
        if (!params) return
        const define = (name, value) => {
            target[name] = value
        }
        for (let i = 0; i < params.length; i++) {
            const param = params[i]
            if (param && param.type === 'Rest') {
                bindPattern(param.target, args.slice(i), scope, define)
                return
            }
            bindPattern(param, args[i], scope, define)
        }
    }
    function resolveIdent(name, scope) {
        if (name === 'undefined') return void 0
        if (scope.vars && Object.prototype.hasOwnProperty.call(scope.vars, name)) {
            return scope.vars[name]
        }
        if (scope.methods && typeof scope.methods[name] === 'function') {
            return scope.methods[name].bind(scope.thisVal ?? scope.self)
        }
        if (scope.methodsAst && scope.methodsAst[name]) {
            return (...args) => scope.callMethod(name, args)
        }
        if (scope.locals && name in scope.locals) {
            return scope.locals[name]
        }
        if (scope.use && Object.prototype.hasOwnProperty.call(scope.use, name)) {
            return scope.use[name]
        }
        if (scope.props && Object.prototype.hasOwnProperty.call(scope.props, name)) {
            return scope.props[name]
        }
        if (name === 'Jslade' && scope.Jslade) return scope.Jslade
        if (name === 'window' && scope.window) return scope.window
        if (name === 'globalThis' && scope.globalThis) return scope.globalThis
        if (name === '_' && scope.buffer) return scope.buffer
        if (name === 'event' && scope.event) return scope.event
        if (name === 'send' && scope.send) return scope.send
        if (name === 'receive' && scope.receive) return scope.receive
        if (typeof globalThis !== 'undefined' && name in globalThis) return globalThis[name]
        return void 0
    }
    function assignTarget(node, value, scope) {
        if (node.type === 'Ident') {
            if (scope.props && Object.prototype.hasOwnProperty.call(scope.props, node.name)) {
                scope.props[node.name] = value
                return
            }
            if (!scope.vars) scope.vars = /* @__PURE__ */ Object.create(null)
            scope.vars[node.name] = value
            return
        }
        if (node.type === 'Member') {
            const object = evalExpression(node.object, scope)
            const property = node.computed ? evalExpression(node.property, scope) : node.property
            object[property] = value
        }
    }
    function evalTemplateLiteral(raw, scope) {
        let out = ''
        let i = 1
        while (i < raw.length - 1) {
            const ch = raw[i]
            if (ch === '\\') {
                out += raw[i + 1]
                i += 2
                continue
            }
            if (ch === '$' && raw[i + 1] === '{') {
                let j = i + 2
                let depth = 1
                while (j < raw.length && depth > 0) {
                    if (raw[j] === '{') depth++
                    else if (raw[j] === '}') depth--
                    j++
                }
                const inner = raw.slice(i + 2, j - 1)
                out += String(evalExpression(parseExpression(inner), scope))
                i = j
                continue
            }
            out += ch
            i++
        }
        return out
    }
    function createFunction(node, scope) {
        const fn = function (...args) {
            const locals = Object.create(scope.locals || null)
            const childScope = forkScope(scope, locals)
            childScope.thisVal = scope.thisVal ?? scope.self
            bindParams(node.params, args, childScope, locals)
            if (node.exprBody) {
                return evalExpression(node.body, childScope)
            }
            return evalStatementList(Array.isArray(node.body) ? node.body : [node.body], childScope)
        }
        return fn
    }
    function forkScope(scope, locals) {
        return {
            self: scope.self,
            thisVal: scope.thisVal,
            props: scope.props,
            vars: scope.vars,
            locals,
            methods: scope.methods,
            methodsAst: scope.methodsAst,
            callMethod: scope.callMethod,
            use: scope.use,
            Jslade: scope.Jslade,
            send: scope.send,
            receive: scope.receive,
            event: scope.event,
            escapeHtml: scope.escapeHtml,
            emitChild: scope.emitChild,
        }
    }
    function describeMember(node) {
        if (node.object.type === 'This') return 'this.' + node.property
        if (node.object.type === 'Ident') return node.object.name + '.' + node.property
        return 'value'
    }

    // src/jslade/ast/render-template.js
    function renderTemplateAst(ast, scope) {
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
                const jsScope = forkScope2(scope, {})
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
            const loopScope = forkScope2(scope, {
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
        const loopScope = forkScope2(scope, {})
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
            const loopScope = forkScope2(scope, { [node.keyVar]: key })
            renderNodes(node.body, loopScope, buf)
        }
    }
    function forkScope2(scope, locals) {
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

    // src/jslade/lib/js-scan.js
    var JS_SCAN_CODE = 0
    var JS_SCAN_SQUOTE = 1
    var JS_SCAN_DQUOTE = 2
    var JS_SCAN_TEMPLATE = 3
    var JS_SCAN_LINE_COMMENT = 4
    var JS_SCAN_BLOCK_COMMENT = 5
    var JS_SCAN_REGEX = 6
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
    function scanJsCode(source, fromIndex, onChar) {
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
    function findCall(source, functionName) {
        const match = new RegExp(`(^|[^\\w$.])(${functionName}\\s*\\()`).exec(source)
        if (!match) return null
        const callIndex = match.index + match[1].length
        return { callIndex, parenIndex: callIndex + match[2].length - 1 }
    }
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
    function findCallEnd(source, closeIndex) {
        let index = closeIndex + 1
        while (index < source.length && /\s/.test(source[index])) index++
        return source[index] === ')' ? index + 1 : closeIndex + 1
    }
    function extractBalancedBraceBlock(source, functionName) {
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
        return evalExpression(node, { vars: /* @__PURE__ */ Object.create(null), ...globalScope })
    }
    function extractHookFunction(source, hookName) {
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

    // src/jslade/compile/script.js
    var IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/
    function indexInScript(scriptSource, fragment) {
        if (!fragment) return 0
        const idx = scriptSource.indexOf(fragment)
        return idx === -1 ? 0 : idx
    }
    function parseTemplateScript(scriptSource, templateName, sourceLines) {
        const useBindings = {}
        const propDefaults = {}
        let useObjectBody = null
        let propsObjectBody = null
        let remainingSource = scriptSource
        for (const declarationName of ['use', 'props']) {
            const block = extractBalancedBraceBlock(remainingSource, declarationName)
            if (!block) continue
            if (declarationName === 'use') useObjectBody = block.objectBody
            else propsObjectBody = block.objectBody
            try {
                const parsedValues = evaluateObjectLiteral(block.objectBody)
                if (declarationName === 'use') Object.assign(useBindings, parsedValues)
                else Object.assign(propDefaults, parsedValues)
            } catch (error) {
                const idx = indexInScript(scriptSource, block.sourceBlock) + block.sourceBlock.indexOf('{') + 1
                const msg = templateName
                    ? formatModuleError(
                          templateName,
                          'script',
                          scriptSource,
                          idx,
                          `${declarationName}(): ${error.message}`,
                          sourceLines
                      )
                    : `[Jslade] ${declarationName}() parse error: ${error.message}`
                _devLog.warn(msg)
            }
            remainingSource = remainingSource.replace(block.sourceBlock, '')
        }
        const hooks2 = { mount: null, updated: null, unmount: null }
        const hooksAst = { mount: null, updated: null, unmount: null }
        for (const declaredName of LIFECYCLE_HOOKS) {
            const block = extractHookFunction(remainingSource, declaredName)
            if (!block) continue
            try {
                if (!hooksAst[declaredName]) {
                    hooksAst[declaredName] = parseStatementList(block.body)
                    hooks2[declaredName] = hooksAst[declaredName]
                }
            } catch (error) {
                const idx = indexInScript(scriptSource, block.sourceBlock)
                const msg = templateName
                    ? formatModuleError(
                          templateName,
                          'script',
                          scriptSource,
                          idx,
                          `${declaredName}(): ${error.message}`,
                          sourceLines
                      )
                    : `[Jslade] ${declaredName}() parse error: ${error.message}`
                _devLog.warn(msg)
            }
            remainingSource = remainingSource.replace(block.sourceBlock, '')
        }
        const methodsAst = {}
        remainingSource = remainingSource.trim()
        if (remainingSource) {
            const methodsOffset = scriptSource.length - remainingSource.length
            const functionPattern = /\bfunction\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/g
            let fnMatch
            while ((fnMatch = functionPattern.exec(remainingSource)) !== null) {
                const name = fnMatch[1]
                const braceStart = fnMatch.index + fnMatch[0].length - 1
                const closeIndex = findBlockEnd(remainingSource, braceStart)
                if (closeIndex === -1) continue
                const paramsSource = fnMatch[0].slice(fnMatch[0].indexOf('(') + 1, fnMatch[0].lastIndexOf(')'))
                try {
                    const params = parseParams(paramsSource)
                    const body = parseStatementList(remainingSource.slice(braceStart + 1, closeIndex))
                    methodsAst[name] = { type: 'Function', name, params, body }
                } catch (error) {
                    const msg = templateName
                        ? formatModuleError(
                              templateName,
                              'script',
                              scriptSource,
                              methodsOffset + fnMatch.index,
                              `${name}(): ${error.message}`,
                              sourceLines
                          )
                        : `[Jslade] ${name}() parse error: ${error.message}`
                    _devLog.warn(msg)
                }
            }
        }
        warnOnUnusableNames(templateName, propDefaults, methodsAst)
        return {
            useBindings,
            useObjectBody,
            propsObjectBody,
            propDefaults,
            methods: methodsAst,
            methodsAst,
            hooks: hooks2,
            hooksAst,
        }
    }
    function warnOnUnusableNames(templateName, propDefaults, methodsAst) {
        const label = templateName ? `"${templateName}": ` : ''
        for (const propName of Object.keys(propDefaults)) {
            if (!IDENTIFIER_PATTERN.test(propName)) {
                _devLog.warn(
                    `[Jslade] ${label}prop "${propName}" is not a valid identifier \u2014 reachable only as this.state[${JSON.stringify(propName)}].`
                )
            } else if (INSTANCE_RESERVED_NAMES.includes(propName)) {
                _devLog.warn(
                    `[Jslade] ${label}prop "${propName}" collides with the instance API \u2014 this.${propName} returns the instance member, read it as this.state.${propName}.`
                )
            }
        }
        for (const methodName of Object.keys(methodsAst)) {
            if (INSTANCE_RESERVED_NAMES.includes(methodName)) {
                _devLog.warn(`[Jslade] ${label}method "${methodName}" collides with the instance API.`)
            }
        }
    }

    // src/jslade/compile/template.js
    var IDENTIFIER_PATTERN2 = /^[A-Za-z_$][\w$]*$/
    function compileTemplateDef(templateName, def, directiveRegistry2, api) {
        if (!def) return null
        const { script: scriptSource = '', scopedStyles = '', markup = '', scopeTargets = false } = def
        const sourceLines = def.sourceLines || null
        const errorContext = { templateName, markup, sourceLines }
        const rawSource = {
            script: scriptSource,
            markup,
            scopedStyles,
            scopeTargets,
            rawText: def.rawText || null,
            text: def.rawText || buildModuleSourceText({ script: scriptSource, markup, scopedStyles, scopeTargets }),
            sourceLines,
            sourceFile: def.sourceFile || null,
        }
        const templateScript = scriptSource
            ? parseTemplateScript(scriptSource, templateName, sourceLines)
            : {
                  useBindings: {},
                  useObjectBody: null,
                  propsObjectBody: null,
                  propDefaults: {},
                  methods: {},
                  methodsAst: {},
                  hooks: { mount: null, updated: null, unmount: null },
                  hooksAst: { mount: null, updated: null, unmount: null },
              }
        let templateAst
        try {
            templateAst = compileMarkupToAst(markup, directiveRegistry2, errorContext)
        } catch (error) {
            _devLog.error(error.message)
            return null
        }
        const scopeId = 'tpl-' + templateName.replace(/[/.]/g, '-')
        if (scopedStyles && scopeTargets && typeof document !== 'undefined') {
            const styleElement = document.createElement('style')
            styleElement.setAttribute('data-template-scope', templateName)
            styleElement.textContent = scopeStylesheet(scopedStyles, scopeId)
            document.head.appendChild(styleElement)
        }
        function wrapRenderedHtml(htmlOutput) {
            if (!scopeTargets) return htmlOutput
            return htmlOutput.replace(/(\s)style-scoped(?!\s*=)(\s|>)/g, `$1style-scoped="${scopeId}"$2`)
        }
        function resolvePropDefaults() {
            if (templateScript.propsObjectBody) {
                try {
                    return evaluateObjectLiteral(templateScript.propsObjectBody)
                } catch (_) {}
            }
            return templateScript.propDefaults
        }
        function resolveUseBindings() {
            if (templateScript.useObjectBody) {
                try {
                    return evaluateObjectLiteral(templateScript.useObjectBody)
                } catch (_) {}
            }
            return templateScript.useBindings
        }
        function buildRenderScope(renderData, instance) {
            const mergedProps = instance?.state ?? { ...resolvePropDefaults(), ...(renderData || {}) }
            const useBindings = resolveUseBindings()
            const self = instance || {
                state: mergedProps,
                name: templateName,
                template: templateName,
                children: [],
                parent: null,
            }
            let methodCtx = null
            const methodsAst = templateScript.methodsAst
            const boundMethods = /* @__PURE__ */ Object.create(null)
            for (const methodName of Object.keys(methodsAst)) {
                boundMethods[methodName] = (...args) => callMethod(methodName, args, methodCtx, mergedProps)
            }
            if (!instance) {
                for (const methodName of Object.keys(methodsAst)) {
                    self[methodName] = boundMethods[methodName]
                }
            }
            methodCtx = instance ? createInstanceMethodContext(instance) : createInstanceMethodContext(self)
            const vars = /* @__PURE__ */ Object.create(null)
            for (const propName of Object.keys(mergedProps)) {
                if (IDENTIFIER_PATTERN2.test(propName)) vars[propName] = mergedProps[propName]
            }
            for (const bindingName of Object.keys(useBindings)) {
                if (IDENTIFIER_PATTERN2.test(bindingName)) vars[bindingName] = useBindings[bindingName]
            }
            return {
                self,
                thisVal: methodCtx,
                props: mergedProps,
                vars,
                locals: vars,
                methods: boundMethods,
                methodsAst,
                callMethod: (name, args) => callMethod(name, args, methodCtx, mergedProps),
                use: useBindings,
                Jslade: api,
                escapeHtml,
                emitChild(site, name, props) {
                    return api._emitChild(site, name, props)
                },
                event: typeof Event !== 'undefined' ? void 0 : void 0,
            }
        }
        function callMethod(methodName, args, methodCtx, mergedProps) {
            const fn = templateScript.methodsAst[methodName]
            if (!fn) return void 0
            const locals = /* @__PURE__ */ Object.create(null)
            const scope = {
                self: methodCtx,
                thisVal: methodCtx,
                props: mergedProps,
                vars: /* @__PURE__ */ Object.create(null),
                locals,
                methodsAst: templateScript.methodsAst,
                use: resolveUseBindings(),
                Jslade: api,
                callMethod: (name, methodArgs) => callMethod(name, methodArgs, methodCtx, mergedProps),
            }
            bindParams(fn.params, args, scope, locals)
            return runMethodAst(fn.body, scope)
        }
        const compiledMeta = {
            name: templateName,
            scopeId,
            propDefaults: resolvePropDefaults(),
            propsObjectBody: templateScript.propsObjectBody,
            useObjectBody: templateScript.useObjectBody,
            resolvePropDefaults,
            resolveUseBindings,
            methods: templateScript.methodsAst,
            methodsAst: templateScript.methodsAst,
            hooks: templateScript.hooksAst,
            hooksAst: templateScript.hooksAst,
            templateAst,
            eventHandlers: templateAst.eventHandlers || [],
            eventTypes: [...new Set((templateAst.eventHandlers || []).map((handler) => handler.type))],
            rawSource,
            _markupSourceMap: templateAst.sourceMap,
        }
        compiledMeta.render = function render(renderData = {}, instance = null) {
            const scope = buildRenderScope(renderData, instance)
            try {
                const htmlOutput = renderTemplateAst(templateAst, scope)
                return wrapRenderedHtml(htmlOutput)
            } catch (error) {
                const msg = formatRuntimeError(templateName, compiledMeta, error)
                _devLog.error(msg, error)
                throw error
            }
        }
        compiledMeta.callMethod = function callMethodOnInstance(methodName, args, instance) {
            const methodCtx = createInstanceMethodContext(instance)
            return callMethod(methodName, args, methodCtx, instance.state)
        }
        compiledMeta.runHook = function runHook(hookName, instance, send, receive) {
            const body = templateScript.hooksAst[hookName]
            if (!body) return
            const methodCtx = createInstanceMethodContext(instance)
            runHookAst(body, {
                self: instance,
                thisVal: methodCtx,
                props: instance.state,
                vars: /* @__PURE__ */ Object.create(null),
                locals: /* @__PURE__ */ Object.create(null),
                methodsAst: templateScript.methodsAst,
                use: resolveUseBindings(),
                Jslade: api,
                send,
                receive,
                callMethod: (name, args) => callMethod(name, args, methodCtx, instance.state),
            })
        }
        compiledMeta.runEventHandler = function runEventHandler(handlerId, instance, nativeEvent) {
            const handler = compiledMeta.eventHandlers[handlerId]
            if (!handler) return
            const methodCtx = createInstanceMethodContext(instance)
            const scope = {
                self: instance,
                thisVal: methodCtx,
                props: instance.state,
                vars: /* @__PURE__ */ Object.create(null),
                locals: /* @__PURE__ */ Object.create(null),
                methodsAst: templateScript.methodsAst,
                use: resolveUseBindings(),
                Jslade: api,
                event: nativeEvent,
                callMethod: (name, args) => callMethod(name, args, methodCtx, instance.state),
            }
            runHookAst(handler.body, scope)
        }
        return compiledMeta
    }

    // src/jslade/markup/directives.js
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
    function createDirectiveRegistry() {
        const handlersByName = /* @__PURE__ */ new Map()
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
                const expr = ctx.expr ? ctx.parseExpr(ctx.expr) : { type: 'Literal', value: void 0 }
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

    // src/jslade/markup/emitter.js
    function createCodeEmitter(errorContext) {
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
                    markupError(
                        _lastMarkupIndex,
                        `Unclosed directive(s): ${openBlockStack.map((n) => '@' + n).join(', ')}`
                    )
                }
                outputLines.push('return _.join("")')
                return { body: outputLines.join('\n'), sourceMap }
            },
        }
    }

    // src/jslade/markup/compiler.js
    function compileMarkupSource(markup, directiveRegistry2, errorContext) {
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
                if (!directiveRegistry2.compile(directiveToken, emitter, errorContext, tokenStart)) {
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
            const isIndentation = !literalChunk.trim() && literalChunk.includes('\n')
            if (literalChunk && !isIndentation) {
                emitter.emitLine(`_.push(${JSON.stringify(literalChunk)})`, chunkStart)
            }
        }
        return emitter.toFunctionBody()
    }

    // src/jslade/lib/hooks.js
    var hooks = { message: [], subscribe: [], render: [], instance: [], directive: [] }
    function emitHook(type, payload) {
        const list = hooks[type]
        if (!list) return
        for (let i = 0; i < list.length; i++) {
            try {
                list[i](payload)
            } catch (e) {}
        }
    }

    // src/jslade/lib/reactive.js
    function createReactiveState(initialData, onStateChange) {
        const proxyCache = /* @__PURE__ */ new WeakMap()
        const reactiveProxies = /* @__PURE__ */ new WeakSet()
        function wrap(obj) {
            if (obj === null || typeof obj !== 'object') return obj
            if (proxyCache.has(obj)) return proxyCache.get(obj)
            if (reactiveProxies.has(obj)) return obj
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    if (obj[i] !== null && typeof obj[i] === 'object') {
                        obj[i] = wrap(obj[i])
                    }
                }
                return obj
            }
            const proxy = new Proxy(obj, {
                get(target, propertyKey, receiver) {
                    const value = Reflect.get(target, propertyKey, receiver)
                    return wrap(value)
                },
                set(target, propertyKey, propertyValue) {
                    const wrapped = wrap(propertyValue)
                    if (Reflect.get(target, propertyKey) === wrapped) return true
                    const ok = Reflect.set(target, propertyKey, wrapped)
                    if (ok) onStateChange?.(initialData)
                    return ok
                },
                deleteProperty(target, propertyKey) {
                    const ok = Reflect.deleteProperty(target, propertyKey)
                    if (ok) onStateChange?.(initialData)
                    return ok
                },
            })
            proxyCache.set(obj, proxy)
            reactiveProxies.add(proxy)
            return proxy
        }
        return wrap(initialData)
    }

    // src/jslade/lib/wire.js
    var WireBus = {
        _channels: {},
        _stateChannels: /* @__PURE__ */ new Set(),
        _last: {},
        _debug: false,
        _publish(channel, value, isState) {
            if (isState) this._last[channel] = value
            if (this._debug) {
                console.log(
                    '%c[WireBus] %c' + channel + ' %c\u2192',
                    'color:#888',
                    'font-weight:bold;color:#0d6efd',
                    'color:#888',
                    value
                )
            }
            emitHook('message', { channel, value, isState, time: Date.now() })
            const subs = this._channels[channel]
            if (!subs) return
            subs.slice().forEach(function (fn) {
                fn(value)
            })
        },
        publish(channel, value) {
            this._publish(channel, value, this._stateChannels.has(channel))
        },
        publishState(channel, value) {
            this._stateChannels.add(channel)
            this._publish(channel, value, true)
        },
        subscribe(channel, fn) {
            if (this._debug) {
                console.log(
                    '%c[WireBus] %csubscribe %c' + channel,
                    'color:#888',
                    'color:#198754',
                    'font-weight:bold;color:#0d6efd'
                )
            }
            ;(this._channels[channel] = this._channels[channel] || []).push(fn)
            emitHook('subscribe', { channel, time: Date.now() })
            if (this._stateChannels.has(channel) && channel in this._last) {
                fn(this._last[channel])
            }
            const bus = this
            return function unsubscribe() {
                const subs = bus._channels[channel]
                if (!subs) return
                const index = subs.indexOf(fn)
                if (index !== -1) subs.splice(index, 1)
                if (subs.length === 0 && !bus._stateChannels.has(channel)) {
                    delete bus._channels[channel]
                    delete bus._last[channel]
                }
            }
        },
    }

    // src/jslade/lifecycle/morph.js
    var ELEMENT_NODE = 1
    function keyOf(node, opts) {
        return node.nodeType === ELEMENT_NODE ? opts.keyOf(node) : null
    }
    function isCompatible(a, b) {
        if (a.nodeType !== b.nodeType) return false
        return a.nodeType !== ELEMENT_NODE || a.tagName === b.tagName
    }
    function drop(node, opts) {
        opts.discard(node)
        if (node.parentNode) node.parentNode.removeChild(node)
    }
    function readDeclaredValue(element) {
        switch (element.tagName) {
            case 'INPUT':
                return { value: element.getAttribute('value'), checked: element.hasAttribute('checked') }
            case 'TEXTAREA':
                return { value: element.textContent }
            case 'OPTION':
                return { selected: element.hasAttribute('selected') }
            default:
                return null
        }
    }
    function applyDeclaredValue(element, before, source) {
        if (!before) return
        const after = readDeclaredValue(source)
        if ('checked' in before && before.checked !== after.checked) element.checked = after.checked
        if ('selected' in before && before.selected !== after.selected) element.selected = after.selected
        if ('value' in before && before.value !== after.value && after.value !== null) element.value = after.value
    }
    function syncAttributes(from, to) {
        const incoming = to.attributes
        for (let i = 0; i < incoming.length; i++) {
            const attribute = incoming[i]
            if (from.getAttribute(attribute.name) !== attribute.value)
                from.setAttribute(attribute.name, attribute.value)
        }
        const current = from.attributes
        for (let i = current.length - 1; i >= 0; i--) {
            const name = current[i].name
            if (!to.hasAttribute(name)) from.removeAttribute(name)
        }
    }
    function morphNode(from, to, opts) {
        if (!isCompatible(from, to)) {
            from.parentNode.insertBefore(to, from)
            drop(from, opts)
            return to
        }
        if (from.nodeType !== ELEMENT_NODE) {
            if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue
            return from
        }
        const declared = readDeclaredValue(from)
        syncAttributes(from, to)
        morphChildren(from, to, opts)
        applyDeclaredValue(from, declared, to)
        return from
    }
    function morphChildren(from, to, opts) {
        let keyed = null
        for (let node = from.firstChild; node; node = node.nextSibling) {
            const key = keyOf(node, opts)
            if (key !== null) (keyed || (keyed = /* @__PURE__ */ new Map())).set(key, node)
        }
        let cursor = from.firstChild
        let pending = to.firstChild
        while (pending) {
            const incoming = pending
            pending = pending.nextSibling
            const key = keyOf(incoming, opts)
            let live = null
            if (key !== null) {
                if (keyed && keyed.has(key)) {
                    live = keyed.get(key)
                    keyed.delete(key)
                }
            } else {
                while (cursor && keyOf(cursor, opts) === null && !isCompatible(cursor, incoming)) {
                    const stale = cursor
                    cursor = cursor.nextSibling
                    drop(stale, opts)
                }
                let candidate = cursor
                while (candidate && keyOf(candidate, opts) !== null) candidate = candidate.nextSibling
                if (candidate && isCompatible(candidate, incoming)) live = candidate
            }
            if (!live) {
                from.insertBefore(incoming, cursor)
                continue
            }
            if (live === cursor) cursor = cursor.nextSibling
            else from.insertBefore(live, cursor)
            if (!opts.keep(live, incoming)) morphNode(live, incoming, opts)
        }
        while (cursor) {
            const stale = cursor
            cursor = cursor.nextSibling
            drop(stale, opts)
        }
    }

    // src/jslade/lifecycle/render-state.js
    var updatingInstance = null
    function getUpdatingInstance() {
        return updatingInstance
    }
    function runWithUpdatingInstance(instance, fn) {
        const previous = updatingInstance
        updatingInstance = instance
        try {
            return fn()
        } finally {
            updatingInstance = previous
        }
    }

    // src/jslade/lifecycle/component.js
    var CHILD_ID = 'data-jsd-id'
    var CHILD_KEY = 'data-jsd-key'
    function clonePropDefaults(value) {
        if (value === null || typeof value !== 'object') return value
        if (value instanceof Date) return new Date(value.getTime())
        if (Array.isArray(value)) {
            const out2 = new Array(value.length)
            for (let i = 0; i < value.length; i++) out2[i] = clonePropDefaults(value[i])
            return out2
        }
        const out = {}
        for (const key of Object.keys(value)) out[key] = clonePropDefaults(value[key])
        return out
    }
    function parseFragment(html) {
        const holder = document.createElement('template')
        holder.innerHTML = html
        return holder.content
    }
    function captureFocusSnapshot(scope) {
        const active = document.activeElement
        if (!active || !scope.contains(active)) return null
        const path = []
        let node = active
        while (node && node !== scope) {
            const parent = node.parentNode
            if (!parent) break
            path.unshift(Array.prototype.indexOf.call(parent.children, node))
            node = parent
        }
        return {
            node: active,
            path,
            tag: active.tagName,
            selectionStart: typeof active.selectionStart === 'number' ? active.selectionStart : null,
            selectionEnd: typeof active.selectionEnd === 'number' ? active.selectionEnd : null,
            scrollTop: scope.scrollTop,
            scrollLeft: scope.scrollLeft,
        }
    }
    function restoreFocusSnapshot(scope, snapshot) {
        if (!snapshot) return
        if (snapshot.node.isConnected && document.activeElement === snapshot.node) return
        let node = scope
        for (let i = 0; i < snapshot.path.length; i++) {
            if (!node || !node.children) return
            node = node.children[snapshot.path[i]]
        }
        if (!node || node.tagName !== snapshot.tag) return
        try {
            node.focus({ preventScroll: true })
        } catch (e) {}
        if (snapshot.selectionStart !== null && typeof node.setSelectionRange === 'function') {
            try {
                node.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd)
            } catch (e) {}
        }
        scope.scrollTop = snapshot.scrollTop
        scope.scrollLeft = snapshot.scrollLeft
    }
    var Component = class _Component {
        /**
         * @param {object} options
         * @param {object} options.api — Jslade singleton
         * @param {function} options.renderComponentTree
         * @param {object} options.morphOptions
         * @param {function} options.mergeComponentProps
         * @param {function} options.createComponent
         * @param {object} options.renderQueue
         */
        constructor(options) {
            const compiled = options.api.compiledComponents[options.name]
            this.id = options.id
            this._id = options.id
            this.name = options.name
            this.template = options.name
            this.container = options.container
            this.parent = options.parent || null
            this.children = []
            this.state = null
            this.initialized = false
            this.source = compiled && compiled.rawSource ? compiled.rawSource : null
            this._api = options.api
            this._compiled = compiled
            this._hostMode = options.hostMode
            this._registry = options.registry
            this._key = options.key || null
            this._ownsContainer = options.ownsContainer === true
            this._unmounted = false
            this._renderScheduled = false
            this._renderComponentTree = options.renderComponentTree
            this._morphOptions = options.morphOptions
            this._mergeComponentProps = options.mergeComponentProps
            this._createComponent = options.createComponent
            this._renderQueue = options.renderQueue
            this.state = createReactiveState(clonePropDefaults(options.initialState || {}), () => {
                this.scheduleRender()
            })
            options.registry.set(this.id, this)
            trackLiveInstance(this)
            emitHook('instance', { action: 'create', instance: this })
        }
        get childrens() {
            return this.children
        }
        find(selector) {
            return this.container.querySelector(selector)
        }
        findAll(selector) {
            return this.container.querySelectorAll(selector)
        }
        closest(selector) {
            return this.container.closest(selector)
        }
        remove() {
            this.unmount()
        }
        unmount() {
            if (this._unmounted) return
            this._unmounted = true
            emitHook('instance', { action: 'unmount', instance: this })
            for (let i = this.children.length - 1; i >= 0; i--) this.children[i].unmount()
            this.children.length = 0
            this._runHook('unmount')
            this._releaseWireSubscriptions()
            untrackLiveInstance(this)
            this._registry.delete(this.id)
            if (this._hostMode === 'inner') {
                if (this._ownsContainer) this.container.remove()
                else this.container.innerHTML = ''
            } else if (this.container.parentNode) {
                this.container.remove()
            }
            const siblings = this.parent && this.parent.children
            if (siblings) {
                const index = siblings.indexOf(this)
                if (index !== -1) siblings.splice(index, 1)
            }
        }
        renderTo(target) {
            if (typeof target === 'string') {
                target = document.querySelector(target)
            }
            if (!target || this._unmounted) return this
            target.appendChild(this.container)
            this._ownsContainer = false
            return this
        }
        /** Scope for a future AST evaluator — props, methods, self. */
        createScope() {
            return {
                self: this,
                props: this.state,
                methods: this._compiled?.methods,
                use: this._compiled?.useBindings,
                Jslade: this._api,
            }
        }
        scheduleRender() {
            if (this._unmounted) return
            if (getUpdatingInstance() !== this) {
                this._renderChain = 0
            } else if (!this._renderScheduled) {
                this._renderChain = (this._renderChain || 0) + 1
                if (this._renderChain > MAX_CONSECUTIVE_RENDERS) {
                    _devLog.error(
                        `[Jslade] "${this.template}": render loop stopped after ${MAX_CONSECUTIVE_RENDERS} passes \u2014 updated() is writing to state.`
                    )
                    return
                }
            }
            this._renderQueue.enqueue(this)
        }
        /** Runs at most once: a failed mount must not retry on every later render. */
        mount() {
            if (this.initialized) return
            this.initialized = true
            this._runHook('mount')
        }
        /** Called after every successful re-render patch. */
        updated() {
            if (this._unmounted) return
            runWithUpdatingInstance(this, () => {
                this._runHook('updated')
            })
        }
        bindToDom() {
            this.container.component = this
            attachScriptMethodsToInstance(this)
            this.bindEventHandlers()
        }
        /**
         * One real listener per marked element, so propagation, stopPropagation() and non-bubbling
         * events (focus, blur) behave exactly as the browser defines them.
         */
        bindEventHandlers() {
            const eventTypes = this._compiled?.eventTypes
            if (!eventTypes || !eventTypes.length) return
            for (const eventType of eventTypes) {
                const attribute = EVENT_ATTRIBUTE_PREFIX + eventType
                const marked = this.container.querySelectorAll('[' + attribute + ']')
                if (this.container.hasAttribute?.(attribute)) this.listenOn(this.container, eventType, attribute)
                for (let i = 0; i < marked.length; i++) {
                    if (this.ownsElement(marked[i])) this.listenOn(marked[i], eventType, attribute)
                }
            }
        }
        /** Child roots carry CHILD_ID: their markers belong to the child template, not to this one. */
        ownsElement(element) {
            if (element === this.container) return true
            for (let node = element; node && node !== this.container; node = node.parentElement) {
                if (node.hasAttribute(CHILD_ID)) return false
            }
            return true
        }
        listenOn(element, eventType, attribute) {
            const bound = element._jsladeBound || (element._jsladeBound = {})
            if (bound[eventType]) return
            bound[eventType] = true
            element.addEventListener(eventType, (event) => {
                this._api.__runHandler(this, Number(element.getAttribute(attribute)), event)
            })
        }
        rerender() {
            if (this._unmounted) return
            const focusSnapshot = captureFocusSnapshot(this.container)
            const { html, tree } = this._renderComponentTree(this.template, this.state, this)
            if (this._hostMode === 'inner') {
                morphChildren(this.container, parseFragment(html), this._morphOptions)
            } else {
                const element = parseFragment(html).firstElementChild
                if (!element) {
                    _devLog.warn(`[Jslade] Component "${this.template}" produced no root element`)
                    return
                }
                element.setAttribute(CHILD_ID, String(this.id))
                if (this._key) element.setAttribute(CHILD_KEY, this._key)
                if (element.tagName === this.container.tagName) {
                    morphNode(this.container, element, this._morphOptions)
                } else {
                    for (let i = this.children.length - 1; i >= 0; i--) this.children[i].unmount()
                    this.container.replaceWith(element)
                    this.container = element
                }
            }
            const scope = this.container
            this.children.length = 0
            _Component.mountCreated(
                _Component.adoptChildren(
                    scope,
                    tree,
                    this,
                    this._registry,
                    this._createComponent,
                    this._mergeComponentProps
                )
            )
            this.bindToDom()
            this.updated()
            restoreFocusSnapshot(scope, focusSnapshot)
        }
        /**
         * Walks patched DOM and rebuilds owner.children in document order.
         * Survivors keep their instance; new markers spawn child Components.
         */
        static adoptChildren(scope, tree, owner, registry, createComponent, mergeComponentProps, created) {
            created = created || []
            for (let node = scope.firstElementChild; node; node = node.nextElementSibling) {
                _Component.adoptMarkedElement(
                    node,
                    tree,
                    owner,
                    registry,
                    createComponent,
                    mergeComponentProps,
                    created
                )
            }
            return created
        }
        static adoptMarkedElement(element, tree, owner, registry, createComponent, mergeComponentProps, created) {
            const rawId = element.getAttribute(CHILD_ID)
            const entry = rawId === null ? null : tree.map.get(Number(rawId))
            const live = element.component
            if (live && !live._unmounted) {
                live.parent = owner
                owner.children.push(live)
                if (entry) _Component.applyIncomingProps(live, entry.props)
                return
            }
            if (!entry) {
                _Component.adoptChildren(element, tree, owner, registry, createComponent, mergeComponentProps, created)
                return
            }
            const child = createComponent({
                id: entry.id,
                name: entry.name,
                container: element,
                hostMode: 'outer',
                parent: owner,
                key: entry.key,
                initialState: mergeComponentProps(entry.name, entry.props),
                registry,
            })
            owner.children.push(child)
            created.push(child)
            _Component.adoptChildren(element, tree, child, registry, createComponent, mergeComponentProps, created)
        }
        /** Only props the parent passed — defaults must not overwrite child state from mount(). */
        static applyIncomingProps(instance, props) {
            if (!props) return
            for (const name of Object.keys(props)) instance.state[name] = props[name]
        }
        /** Deepest child first so a parent's mount() sees an initialised subtree. */
        static mountCreated(created) {
            for (let i = created.length - 1; i >= 0; i--) {
                created[i].bindToDom()
                created[i].mount()
            }
        }
        _releaseWireSubscriptions() {
            if (!this._wireUnsubs) return
            this._wireUnsubs.forEach(function (off) {
                off()
            })
            this._wireUnsubs.length = 0
        }
        _formatHookError(hookName, error) {
            const compiled = this._compiled
            const scriptText = compiled && compiled.rawSource ? compiled.rawSource.script : ''
            if (!scriptText) return `[Jslade] ${hookName}() error in "${this.name}": ${error.message}`
            const block = extractHookFunction(scriptText, hookName)
            return formatRuntimeError(this.name, compiled, error, {
                section: 'script',
                index: block ? Math.max(0, scriptText.indexOf(block.sourceBlock)) : 0,
                detail: `${hookName}(): ${error.message}`,
            })
        }
        _runHook(hookName) {
            const compiled = this._compiled
            if (!compiled?.runHook) return
            const instance = this
            const receive = function (channel, fn) {
                const off = WireBus.subscribe(channel, fn)
                ;(instance._wireUnsubs = instance._wireUnsubs || []).push(off)
                return off
            }
            try {
                compiled.runHook(hookName, instance, instance._api.send, receive)
            } catch (error) {
                _devLog.error(this._formatHookError(hookName, error), error)
            }
        }
    }

    // src/jslade/lifecycle/render-queue.js
    function createRenderQueue() {
        const queue = []
        let scheduled = false
        function flush() {
            scheduled = false
            const batch = queue.splice(0, queue.length)
            for (let i = 0; i < batch.length; i++) {
                const component = batch[i]
                component._renderScheduled = false
                if (!component._unmounted) component.rerender()
            }
        }
        function enqueue(component) {
            if (component._renderScheduled) return
            component._renderScheduled = true
            queue.push(component)
            if (scheduled) return
            scheduled = true
            queueMicrotask(flush)
        }
        return { enqueue }
    }

    // src/jslade/lifecycle/lifecycle.js
    function createLifecycle(api) {
        let _instanceSeq = 0
        const _renderTreeStack = []
        const renderQueue = createRenderQueue()
        function injectChildMarker(html, id, key) {
            const marker = ` ${CHILD_ID}="${id}" ${CHILD_KEY}="${escapeHtml(key)}"`
            return html.replace(/<([a-zA-Z][\w-]*)/, function (match) {
                return match + marker
            })
        }
        function stripChildMarkers(html) {
            return html.replace(new RegExp(`\\s${CHILD_ID}="\\d+"|\\s${CHILD_KEY}="[^"]*"`, 'g'), '')
        }
        function createRenderTree() {
            return { map: /* @__PURE__ */ new Map(), counts: /* @__PURE__ */ new Map(), ownerStack: [0] }
        }
        function getCompiled(templateName) {
            api._ensureCompiled?.(templateName)
            return api.compiledComponents[templateName]
        }
        function mergeComponentProps(templateName, props) {
            const compiled = getCompiled(templateName)
            const defaults = compiled?.resolvePropDefaults?.() ?? compiled?.propDefaults ?? {}
            return { ...defaults, ...(props || {}) }
        }
        function renderComponentTree(templateName, renderData, instance) {
            const compiled = getCompiled(templateName)
            if (!compiled) {
                _devLog.warn('[Jslade] Template not found:', templateName)
                return { html: '', tree: createRenderTree() }
            }
            const tree = createRenderTree()
            _renderTreeStack.push(tree)
            try {
                return { html: compiled.render(renderData, instance), tree }
            } finally {
                _renderTreeStack.pop()
            }
        }
        function emitChild(site, name, props) {
            const tree = _renderTreeStack[_renderTreeStack.length - 1]
            const compiled = getCompiled(name)
            if (!tree || !compiled) {
                if (!compiled) _devLog.warn('[Jslade] @component: unknown template', name)
                return ''
            }
            const counter = tree.ownerStack[tree.ownerStack.length - 1] + '|' + site
            const seen = tree.counts.get(counter) || 0
            tree.counts.set(counter, seen + 1)
            const local = props && props.key != null ? String(props.key) : '#' + seen
            const key = `${name}|${site}|${local}`
            const id = ++_instanceSeq
            tree.map.set(id, { id, key, name, props: props || {} })
            tree.ownerStack.push(id)
            try {
                return injectChildMarker(compiled.render(mergeComponentProps(name, props || {})), id, key)
            } finally {
                tree.ownerStack.pop()
            }
        }
        function unmountInstancesIn(node) {
            if (node.nodeType !== 1) return
            const own = node.component
            if (own && !own._unmounted) {
                own.unmount()
                return
            }
            const nested = node.querySelectorAll(`[${CHILD_ID}]`)
            for (let i = 0; i < nested.length; i++) {
                const instance = nested[i].component
                if (instance && !instance._unmounted) instance.unmount()
            }
        }
        const morphOptions = {
            keyOf(element) {
                const childKey = element.getAttribute(CHILD_KEY)
                if (childKey !== null) return 'c\0' + childKey
                const listKey = element.getAttribute('key')
                return listKey === null ? null : 'k\0' + listKey
            },
            keep(live, incoming) {
                const child = live.component
                if (!child || child._unmounted) return false
                const id = incoming.getAttribute(CHILD_ID)
                if (id === null) return false
                live.setAttribute(CHILD_ID, id)
                return true
            },
            discard: unmountInstancesIn,
        }
        function createComponent(options) {
            return new Component({
                ...options,
                api,
                renderComponentTree,
                morphOptions,
                mergeComponentProps,
                createComponent,
                renderQueue,
            })
        }
        function renderTo(container, templateName, renderData, parentRef) {
            if (!getCompiled(templateName)) {
                _devLog.warn(`[Jslade] Component "${templateName}" not compiled`)
                return null
            }
            const renderStart = typeof performance !== 'undefined' && performance.now ? performance.now() : 0
            if (typeof container === 'string') {
                const selector = container
                container = document.querySelector(selector)
                if (!container) {
                    _devLog.error(
                        `[Jslade] renderTo("${selector}", "${templateName}"): no element matches the selector`
                    )
                    return null
                }
            }
            const ownsContainer = !container
            container = container || document.createElement('div')
            const registry = /* @__PURE__ */ new Map()
            const initialData = mergeComponentProps(templateName, renderData)
            const root = createComponent({
                id: ++_instanceSeq,
                name: templateName,
                container,
                hostMode: 'inner',
                parent: parentRef || null,
                initialState: initialData,
                registry,
                ownsContainer,
            })
            root.bindToDom()
            const { html, tree } = renderComponentTree(templateName, root.state, root)
            container.innerHTML = html
            root.bindEventHandlers()
            Component.mountCreated(
                Component.adoptChildren(container, tree, root, registry, createComponent, mergeComponentProps)
            )
            root.mount()
            const renderEnd = typeof performance !== 'undefined' && performance.now ? performance.now() : 0
            emitHook('render', {
                name: templateName,
                ms: Math.round((renderEnd - renderStart) * 100) / 100,
                instance: root,
            })
            return root
        }
        return {
            stripChildMarkers,
            renderComponentTree,
            emitChild,
            renderTo,
        }
    }

    // src/jslade/lifecycle/autostart.js
    var MOUNT_TAG = 'jslade'
    var STYLE_ID = 'jslade-mount-style'
    var hasDom = () => typeof document !== 'undefined'
    function readProps(element) {
        const raw = element.getAttribute('props')
        if (!raw || !raw.trim()) return {}
        try {
            return JSON.parse(raw)
        } catch (_) {
            try {
                const trimmed = raw.trim()
                const node = trimmed.startsWith('{') ? parseObjectLiteral(trimmed) : parseObjectLiteral(`{${trimmed}}`)
                return evalExpression(node, { vars: /* @__PURE__ */ Object.create(null) }) || {}
            } catch (error) {
                _devLog.error(
                    `[Jslade] <${MOUNT_TAG} name="${element.getAttribute('name')}"> invalid props: ${error.message}`
                )
                return {}
            }
        }
    }
    function injectMountStyle() {
        if (!hasDom() || document.getElementById(STYLE_ID)) return
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = `${MOUNT_TAG}{display:contents}`
        document.head.appendChild(style)
    }
    function createAutostart(Jslade2) {
        function indexSourceComponent(name, def) {
            const normalized = String(name)
                .replace(/\\/g, '/')
                .replace(/^\/+|\/+$/g, '')
            if (!normalized) return false
            if (Jslade2.compiledComponents[normalized] || Jslade2._sourceComponents[normalized]) return false
            Jslade2._sourceComponents[normalized] = def
            return true
        }
        function importTemplates(templates, options) {
            const imported = []
            if (!templates || typeof templates !== 'object') return imported
            const sources = (options && options.sources) || {}
            for (const name of Object.keys(templates)) {
                const normalized = String(name)
                    .replace(/\\/g, '/')
                    .replace(/^\/+|\/+$/g, '')
                if (!normalized) continue
                if (Jslade2.compiledComponents[normalized] || Jslade2._sourceComponents[normalized]) continue
                const value = templates[name]
                let def = null
                if (typeof value === 'string') {
                    def = Jslade2._extractTemplateDefFromSource(value)
                    if (def) def.rawText = value.trim()
                } else if (value && typeof value === 'object') {
                    def = { ...value }
                }
                if (!def) continue
                const sourceFile = sources[normalized] ?? sources[name]
                if (sourceFile) {
                    def.sourceFile = sourceFile
                    def.sourceLines = { ...(def.sourceLines || {}), sourceFile }
                }
                if (indexSourceComponent(normalized, def)) imported.push(normalized)
            }
            return imported
        }
        function loadDefinitions() {
            if (hasDom()) Jslade2.scanDOM()
        }
        function ensureCompiled(name) {
            if (Jslade2.compiledComponents[name]) return true
            const def = Jslade2._sourceComponents[name]
            if (def) {
                Jslade2.compile(name, def)
                if (Jslade2.compiledComponents[name]) {
                    delete Jslade2._sourceComponents[name]
                    removeDomTemplate(name)
                    return true
                }
            }
            return false
        }
        function removeDomTemplate(name) {
            if (!hasDom()) return
            const el = document.querySelector(`${COMPONENT_DEF_TAG}[name="${name}"]`)
            if (el) el.remove()
        }
        function mountPlaceholders(root) {
            if (!hasDom()) return []
            const scope = root || document
            const mounted = []
            for (const element of scope.querySelectorAll(`${MOUNT_TAG}[name]`)) {
                if (element.component) continue
                const name = element.getAttribute('name')
                if (!ensureCompiled(name)) {
                    _devLog.warn(`[Jslade] <${MOUNT_TAG} name="${name}"> skipped: component not loaded yet.`)
                    continue
                }
                const instance = Jslade2.renderTo(element, name, readProps(element))
                if (instance) mounted.push(instance)
            }
            return mounted
        }
        function start(options) {
            const opts = options || {}
            if (opts.dev === true) Jslade2.dev = true
            if (opts.showChannels) Jslade2.wireDebug = true
            loadDefinitions()
            if (opts.mount === false) return []
            injectMountStyle()
            return mountPlaceholders(opts.root)
        }
        return { start, mountPlaceholders, ensureCompiled, importTemplates }
    }

    // src/jslade/engine.js
    var directiveRegistry = createDirectiveRegistry()
    var Jslade = {
        compiledComponents: {},
        _sourceComponents: {},
        _hooks: hooks,
    }
    var lifecycle = createLifecycle(Jslade)
    var autostart = createAutostart(Jslade)
    Object.assign(Jslade, {
        directive(directiveName, handlerOrOpts, fn) {
            directiveRegistry.register(directiveName, handlerOrOpts, fn)
            const isBlock = handlerOrOpts && typeof handlerOrOpts === 'object' && handlerOrOpts.block === true
            emitHook('directive', { name: directiveName, type: isBlock ? 'block' : 'inline' })
            return this
        },
        if(name, predicateFn) {
            const handlers = directiveRegistry._handlers
            const fnKey = '__iffn_' + name
            emitHook('directive', { name, type: 'if' })
            Jslade._ifPredicates = Jslade._ifPredicates || {}
            Jslade._ifPredicates[fnKey] = predicateFn
            Jslade.directive(name, { block: true }, function (ctx) {
                const args = ctx.expr ? ctx.expr : ''
                ctx.emit(`if (Jslade._ifPredicates['${fnKey}'](${args})) {`)
            })
            const predicateCall = (ctx) => ({
                type: 'Call',
                callee: {
                    type: 'Member',
                    object: {
                        type: 'Member',
                        object: { type: 'Ident', name: 'Jslade' },
                        property: '_ifPredicates',
                        computed: false,
                    },
                    property: { type: 'Literal', value: fnKey },
                    computed: true,
                },
                args: ctx.expr ? [ctx.parseExpr(ctx.expr)] : [],
            })
            const ifHandler = handlers.get(name)
            if (ifHandler) {
                ifHandler.astHandlerFn = function (ctx, emitter, tokenStart) {
                    emitter.beginIf(predicateCall(ctx), tokenStart)
                }
            }
            Jslade.directive('else' + name, function (ctx) {
                if (ctx.expr) {
                    ctx.emit(`} else if (Jslade._ifPredicates['${fnKey}'](${ctx.expr})) {`)
                } else {
                    ctx.emit('} else {')
                }
            })
            const elseHandler = handlers.get('else' + name)
            if (elseHandler) {
                elseHandler.astHandlerFn = function (ctx, emitter, tokenStart) {
                    if (ctx.expr) emitter.elseIf(predicateCall(ctx), tokenStart)
                    else emitter.beginElse(tokenStart)
                }
            }
            handlers.set('end' + name, {
                _isEndDirective: true,
                _endForDirective: name,
                handlerFn: function () {},
            })
            return this
        },
        /**
         * Mount entry point (like Vue's `.mount()`): scans for in-page templates, then mounts
         * every `<jslade name="...">` placeholder. Call explicitly after `import()` or when
         * injecting markup over AJAX. Idempotent — safe to call again.
         */
        start(opts) {
            return autostart.start(opts)
        },
        /** Mounts `<jslade>` placeholders without reloading definitions. */
        mountAll(root) {
            return autostart.mountPlaceholders(root)
        },
        /** Former name of `start()`, kept for existing pages. */
        bootstrap(opts) {
            return autostart.start(opts)
        },
        get dev() {
            return _devLog.enabled
        },
        set dev(value) {
            _devLog.enabled = value === true
        },
        get wireDebug() {
            return WireBus._debug === true
        },
        set wireDebug(value) {
            WireBus._debug = value === true
        },
        compile(name, def) {
            if (!def) def = this._sourceComponents[name]
            if (!def) return
            const compiledTemplate = compileTemplateDef(name, def, directiveRegistry, Jslade)
            if (compiledTemplate) {
                this.compiledComponents[name] = compiledTemplate
                delete this._sourceComponents[name]
            }
        },
        /**
         * Register component sources for lazy compile. Values are raw component source strings
         * or pre-parsed definition objects. Idempotent — skips names already imported or compiled.
         *
         * @param {Record<string, string|object>} templates
         * @param {{ sources?: Record<string, string> }} [options] — optional path hints for error messages
         * @returns {string[]} names newly registered
         */
        import(templates, options) {
            return autostart.importTemplates(templates, options)
        },
        render(templateName, renderData) {
            return lifecycle.stripChildMarkers(lifecycle.renderComponentTree(templateName, renderData ?? {}).html)
        },
        renderTo(container, templateName, renderData, parentRef) {
            return lifecycle.renderTo(container, templateName, renderData, parentRef)
        },
        list() {
            return Object.keys(this.compiledComponents)
        },
        instances() {
            return snapshotLiveInstancesByTemplate()
        },
        /** Compiles a template still held as source, so @component can resolve it mid-render. */
        _ensureCompiled(name) {
            return autostart.ensureCompiled(name)
        },
        /** `site` identifies the @component call in the markup; older bundles call this without it. */
        _emitChild(site, name, props) {
            if (typeof site === 'string') return lifecycle.emitChild(0, site, name)
            return lifecycle.emitChild(site, name, props)
        },
        scanDOM() {
            const self = this
            document.querySelectorAll(`${COMPONENT_DEF_TAG}[name]`).forEach(function (el) {
                const name = el.getAttribute('name')
                if (name && !self.compiledComponents[name] && !self._sourceComponents[name]) {
                    const def = self._extractTemplateDefFromSource(el.outerHTML)
                    if (def) {
                        def.rawText = el.outerHTML
                        self._sourceComponents[name] = def
                    }
                }
            })
        },
        _extractTemplateDefFromSource(sourceText) {
            const raw = sourceText.trim()
            if (/<template\b[^>]*\bname\s*=/i.test(raw)) {
                _devLog.warn('[Jslade] Legacy <template name="..."> format is no longer supported.')
                return null
            }
            let content = raw
            const outerMatch = content.match(/^<noembed\b[^>]*>([\s\S]*)<\/noembed>\s*$/i)
            if (outerMatch) content = outerMatch[1].trim()
            const scriptMatch = content.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)
            if (scriptMatch) content = content.replace(scriptMatch[0], '')
            const scopedStyleMatch = content.match(/<style\b[^>]*\bscoped\b[^>]*>([\s\S]*?)<\/style>/i)
            const styleMatch = scopedStyleMatch || content.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)
            const hasScopedStyleTag = !!scopedStyleMatch
            if (styleMatch) content = content.replace(styleMatch[0], '')
            if (/<template\b[^>]*\bname\s*=/i.test(content)) {
                _devLog.warn('[Jslade] Markup <template> must not carry a name attribute.')
                return null
            }
            const markupMatch = content.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i)
            if (!markupMatch) {
                _devLog.warn('[Jslade] Missing markup <template> block in component source.')
                return null
            }
            const markup = markupMatch[1].trim()
            content = content.replace(markupMatch[0], '')
            if (/<\/?template\b/i.test(markup)) {
                _devLog.warn('[Jslade] Nested <template> tags are not allowed inside the markup block.')
                return null
            }
            if (content.trim() !== '') {
                _devLog.warn('[Jslade] Unexpected content outside <script>, <style>, and <template>.')
                return null
            }
            return {
                script: scriptMatch ? scriptMatch[1].trim() : '',
                scopedStyles: styleMatch ? styleMatch[1].trim() : '',
                markup,
                scopeTargets: hasScopedStyleTag && markup.indexOf('style-scoped') !== -1,
            }
        },
        _extractTemplateDef(element) {
            const scriptEl = element.querySelector('script')
            const scopedStyleEl = element.querySelector('style[scoped]')
            const styleEl = scopedStyleEl || element.querySelector('style')
            const markupEl = element.querySelector('template')
            const isScoped = !!scopedStyleEl
            if (!markupEl) return null
            if (markupEl.getAttribute('name')) return null
            if (markupEl.content.querySelector('template')) return null
            const script = scriptEl ? scriptEl.textContent.trim() : ''
            const scopedStyles = styleEl ? styleEl.textContent.trim() : ''
            const markup = Array.from(markupEl.content.childNodes)
                .map(function (n) {
                    return n.nodeType === 3 ? n.textContent : n.outerHTML || ''
                })
                .join('')
                .trim()
            return {
                script,
                scopedStyles,
                markup,
                scopeTargets: isScoped && markup.indexOf('style-scoped') !== -1,
            }
        },
        _compileTemplate(name, fragment) {
            const def = this._extractTemplateDef(fragment)
            this.compile(name, def)
            const scopedStyles = def.scopedStyles
            const isScoped = def.scopeTargets
            if (!isScoped && scopedStyles && typeof document !== 'undefined') {
                const styleTag = document.createElement('style')
                styleTag.setAttribute('data-template', name)
                styleTag.textContent = scopedStyles
                document.head.appendChild(styleTag)
            }
        },
        send(channel, data) {
            WireBus.publish(channel, data)
        },
        sendState(channel, data) {
            WireBus.publishState(channel, data)
        },
        receive(channel, fn) {
            return WireBus.subscribe(channel, fn)
        },
        event(nativeEvent, element, callback) {
            let node = element
            while (node) {
                if (node.component && node.component.state) {
                    callback.call(node.component, nativeEvent)
                    return
                }
                node = node.parentElement
            }
        },
        __runHandler(instance, handlerId, nativeEvent) {
            const compiled = instance?._compiled || this.compiledComponents[instance?.name]
            if (!compiled?.runEventHandler) return
            try {
                compiled.runEventHandler(handlerId, instance, nativeEvent)
            } catch (error) {
                const handler = compiled.eventHandlers?.[handlerId]
                const msg = compiled
                    ? formatRuntimeError(compiled.name, compiled, error, {
                          section: 'markup',
                          index: handler?.markupIndex ?? 0,
                          detail: `Event handler: ${error.message}`,
                      })
                    : `[Jslade] Event handler error: ${error.message}`
                _devLog.error(msg, error)
            }
        },
        __runMarkup(instance, markupIndex, fn, nativeEvent) {
            const compiled = instance?._compiled || this.compiledComponents[instance?.name]
            try {
                fn.call(instance, nativeEvent)
            } catch (error) {
                if (compiled) {
                    const msg = formatRuntimeError(compiled.name, compiled, error, {
                        section: 'markup',
                        index: markupIndex,
                        detail: `Event handler: ${error.message}`,
                    })
                    _devLog.error(msg, error)
                } else {
                    _devLog.error(`[Jslade] Event handler error: ${error.message}`, error)
                }
                throw error
            }
        },
    })
    if (typeof globalThis !== 'undefined') {
        globalThis.Jslade = Jslade
    }
    return __toCommonJS(index_exports)
})()

// UMD tail. The engine already assigns globalThis.Jslade for <script src>;
// this only adds the named exports for CommonJS and AMD loaders.
if (typeof module === 'object' && module.exports) module.exports = __jsladeModule
else if (typeof define === 'function' && define.amd)
    define(function () {
        return __jsladeModule
    })
