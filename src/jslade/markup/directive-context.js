import { formatModuleError } from '../lib/instance-registry.js'

/** Helpers exposed to custom directive handlers (`ctx.emit`, `ctx.loop`, …). */
export function createDirectiveContext(token, emitter, errorContext, tokenStart) {
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

        emit(code) {
            emitter.emitLine(code, tokenStart)
        },

        inline(strings, ...values) {
            return escapeDirective(strings, ...values)
        },

        wrap(openHtml, closeHtml) {
            ctx._block = {
                open: () => {
                    emitter.emitLine(`_.push(${JSON.stringify(openHtml)})`, tokenStart)
                },
                close: () => {
                    emitter.emitLine(`_.push(${JSON.stringify(closeHtml)})`, tokenStart)
                },
            }
        },

        when(condition) {
            ctx._block = {
                open: () => {
                    emitter.emitLine(`if (${condition}) {`, tokenStart)
                    emitter.increaseIndent()
                },
                close: () => {
                    emitter.decreaseIndent()
                    emitter.emitLine('}', tokenStart)
                },
            }
        },

        loop(arrayExpr, itemVar) {
            emitter._loopDepth = emitter._loopDepth || 0
            const d = emitter._loopDepth++
            const vi = `_i${d}`,
                va = `_a${d}`,
                vl = `_l${d}`
            ctx._block = {
                open: () => {
                    emitter.emitLine(
                        `for (var ${vi} = 0, ${va} = ${arrayExpr}, ${vl} = ${va}.length; ${vi} < ${vl}; ${vi}++) {`,
                        tokenStart
                    )
                    emitter.emitLine(`  var ${itemVar} = ${va}[${vi}]`, tokenStart)
                    emitter.emitLine(
                        `  var $loop = { index: ${vi}, first: ${vi} === 0, last: ${vi} === ${vl} - 1, count: ${vl} }`,
                        tokenStart
                    )
                    emitter.increaseIndent()
                },
                close: () => {
                    emitter._loopDepth--
                    emitter.decreaseIndent()
                    emitter.emitLine('}', tokenStart)
                },
            }
        },

        raw() {
            emitter._rawMode = true
            ctx._block = {
                open: () => {
                    emitter.emitLine(';(function(){', tokenStart)
                    emitter.increaseIndent()
                },
                close: () => {},
            }
        },

        _block: null,
    }

    function escapeDirective(strings, ...values) {
        const parts = []
        for (let i = 0; i < strings.length; i++) {
            parts.push(strings[i])
            if (i < values.length) {
                parts.push(`'+escapeHtml(${values[i]})+'`)
            }
        }
        emitter.emitLine(`_.push('${parts.join('')}')`, tokenStart)
    }

    ctx.inline.raw = function (strings, ...values) {
        const parts = []
        for (let i = 0; i < strings.length; i++) {
            parts.push(strings[i])
            if (i < values.length) {
                parts.push(`'+String(${values[i]})+'`)
            }
        }
        emitter.emitLine(`_.push('${parts.join('')}')`, tokenStart)
    }

    return ctx
}
