import { _devLog } from '../lib/dev-log.js'
import {
    buildModuleSourceText,
    createInstanceMethodContext,
    formatModuleError,
    formatRuntimeError,
} from '../lib/instance-registry.js'
import { escapeHtml, scopeStylesheet } from '../lib/html-utils.js'
import { compileMarkupToAst } from '../markup/ast-compiler.js'
import { renderTemplateAst } from '../ast/render-template.js'
import { runMethodAst, runHookAst } from '../ast/eval-stmt.js'
import { bindParams } from '../ast/eval-expr.js'
import { parseTemplateScript } from './script.js'
import { evaluateObjectLiteral } from '../lib/js-scan.js'

const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/

export function compileTemplateDef(templateName, def, directiveRegistry, api) {
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
        templateAst = compileMarkupToAst(markup, directiveRegistry, errorContext)
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
            } catch (_) {
                /* fall through */
            }
        }
        return templateScript.propDefaults
    }

    function resolveUseBindings() {
        if (templateScript.useObjectBody) {
            try {
                return evaluateObjectLiteral(templateScript.useObjectBody)
            } catch (_) {
                /* fall through */
            }
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
        const boundMethods = Object.create(null)
        for (const methodName of Object.keys(methodsAst)) {
            boundMethods[methodName] = (...args) => callMethod(methodName, args, methodCtx, mergedProps)
        }

        if (!instance) {
            for (const methodName of Object.keys(methodsAst)) {
                self[methodName] = boundMethods[methodName]
            }
        }

        methodCtx = instance ? createInstanceMethodContext(instance) : createInstanceMethodContext(self)

        const vars = Object.create(null)
        for (const propName of Object.keys(mergedProps)) {
            if (IDENTIFIER_PATTERN.test(propName)) vars[propName] = mergedProps[propName]
        }
        for (const bindingName of Object.keys(useBindings)) {
            if (IDENTIFIER_PATTERN.test(bindingName)) vars[bindingName] = useBindings[bindingName]
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
            event: typeof Event !== 'undefined' ? undefined : undefined,
        }
    }

    function callMethod(methodName, args, methodCtx, mergedProps) {
        const fn = templateScript.methodsAst[methodName]
        if (!fn) return undefined
        const locals = Object.create(null)
        const scope = {
            self: methodCtx,
            thisVal: methodCtx,
            props: mergedProps,
            vars: Object.create(null),
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
            vars: Object.create(null),
            locals: Object.create(null),
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
            vars: Object.create(null),
            locals: Object.create(null),
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
