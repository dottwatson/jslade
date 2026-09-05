/** Live instances grouped by template name until remove()/unmount(). */
const _liveInstancesByTemplate = Object.create(null)

export function trackLiveInstance(instance) {
    const name = instance.name
    if (!_liveInstancesByTemplate[name]) _liveInstancesByTemplate[name] = []
    _liveInstancesByTemplate[name].push(instance)
}

export function untrackLiveInstance(instance) {
    const list = _liveInstancesByTemplate[instance.name]
    if (!list) return
    const index = list.indexOf(instance)
    if (index !== -1) list.splice(index, 1)
}

export function snapshotLiveInstancesByTemplate() {
    const out = Object.create(null)
    for (const name of Object.keys(_liveInstancesByTemplate)) {
        out[name] = _liveInstancesByTemplate[name].slice()
    }
    return out
}

export function buildModuleSourceText(def) {
    if (!def) return ''
    const parts = []
    if (def.script) parts.push(`<script>\n${def.script}\n</script>`)
    if (def.scopedStyles) {
        const tag = def.scopeTargets ? 'style scoped' : 'style'
        parts.push(`<${tag}>\n${def.scopedStyles}\n</${tag.split(' ')[0]}>`)
    }
    parts.push(`<template>\n${def.markup || ''}\n</template>`)
    return parts.join('\n\n')
}

export function computeSourceLineColumn(source, index) {
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

/**
 * @param {object|null|undefined} sourceLines — { scriptLine1?, markupLine1?, sourceFile? }
 */
export function formatModuleError(templateName, section, sourceText, index, message, sourceLines) {
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
        out += `\n    ${where.line} | ${lineText}`
    }
    return out
}

/** Map a 1-based line inside generated markup function body back to markup source index. */
export function mapGeneratedMarkupLine(sourceMap, generatedLine) {
    if (!sourceMap || !sourceMap.length) return null
    let best = sourceMap[0]
    for (let i = 0; i < sourceMap.length; i++) {
        if (sourceMap[i].genLine <= generatedLine) best = sourceMap[i]
        else break
    }
    return best.markupIndex
}

/** Parse `(line:col)` from Function / SyntaxError messages when present. */
export function parseGeneratedLineFromError(message) {
    if (!message) return null
    const paren = message.match(/\((\d+):(\d+)\)\s*$/)
    if (paren) return Number(paren[1])
    const anon = message.match(/<anonymous>:(\d+):(\d+)/)
    if (anon) return Number(anon[1])
    return null
}

/** Walk stack frames until a generated render-function line is found. */
export function parseGeneratedLineFromStack(stack) {
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

/**
 * Map a runtime Error back to dev script/markup source when possible.
 * @param {object} compiled — compiled template (rawSource, _markupSourceMap, _preambleLineCount)
 * @param {Error} error
 * @param {{ section?: string, index?: number }} fallback
 */
export function resolveRuntimeErrorLocation(compiled, error, fallback = {}) {
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

export function formatRuntimeError(templateName, compiled, error, fallback = {}) {
    const loc = resolveRuntimeErrorLocation(compiled, error, fallback)
    const label = `${loc.section} (runtime)`
    const detail = fallback.detail || error?.message || 'Unknown error'
    return formatModuleError(templateName, label, loc.sourceText, loc.index, detail, loc.sourceLines)
}

export function createInstanceMethodContext(instance) {
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

export function attachScriptMethodsToInstance(instance) {
    const ctx = instance._ctx || (instance._ctx = createInstanceMethodContext(instance))
    const compiled = instance._compiled
    if (!compiled?.methodsAst) return
    for (const methodName of Object.keys(compiled.methodsAst)) {
        instance[methodName] = function (...args) {
            return compiled.callMethod(methodName, args, ctx)
        }
    }
}
