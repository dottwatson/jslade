/**
 * Jslade — public API and module re-exports.
 *
 *   lib/          dev-log, html-utils, js-scan, hooks, wire, reactive, instance-registry
 *   markup/       emitter, directive-context, directives, compiler
 *   compile/      script parser, template compile
 *   lifecycle/    instances, re-render, renderTo
 *
 * Build: npm run build  |  Demo: http://jslade-package.test/index.html  |  Tests: npm test
 */

import { compileTemplateDef } from './compile/template.js'
import { createDirectiveRegistry } from './markup/directives.js'
import { compileMarkupSource } from './markup/compiler.js'
import { createLifecycle } from './lifecycle/lifecycle.js'
import { createAutostart } from './lifecycle/autostart.js'
import { _devLog } from './lib/dev-log.js'
import { emitHook, hooks as _hooks } from './lib/hooks.js'
import { WireBus } from './lib/wire.js'
import { snapshotLiveInstancesByTemplate, formatRuntimeError } from './lib/instance-registry.js'
import { escapeHtml, parseDirectiveToken, parseForeachExpression, readBalancedParentheses } from './lib/html-utils.js'
import { COMPONENT_DEF_TAG } from './lib/constants.js'

const directiveRegistry = createDirectiveRegistry()

const Jslade = {
    compiledComponents: {},
    _sourceComponents: {},
    _hooks,
}

const lifecycle = createLifecycle(Jslade)
const autostart = createAutostart(Jslade)

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

export {
    Jslade,
    escapeHtml,
    createDirectiveRegistry,
    compileMarkupSource,
    parseDirectiveToken,
    readBalancedParentheses,
    parseForeachExpression,
}
