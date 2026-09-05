import { _devLog } from '../lib/dev-log.js'
import { emitHook } from '../lib/hooks.js'
import { escapeHtml } from '../lib/html-utils.js'
import { CHILD_ID, CHILD_KEY, Component } from './component.js'
import { createRenderQueue } from './render-queue.js'

/**
 * Instance tree: inline @component HTML, markers, promotion, reactive re-render.
 * @param {object} api — the Jslade public object (compiledComponents, send, …)
 */
export function createLifecycle(api) {
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
        return { map: new Map(), counts: new Map(), ownerStack: [0] }
    }

    /** A template referenced by @component may still be waiting for its lazy compile. */
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

    /**
     * `site` is the offset of the `@component` token in the markup, so repeated renders of
     * the same call produce the same key. Inside a loop the occurrence counter keeps them
     * apart; pass `key` in the props to tie identity to the data instead of the position.
     */
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
            if (childKey !== null) return 'c\u0000' + childKey
            const listKey = element.getAttribute('key')
            return listKey === null ? null : 'k\u0000' + listKey
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
                _devLog.error(`[Jslade] renderTo("${selector}", "${templateName}"): no element matches the selector`)
                return null
            }
        }
        const ownsContainer = !container
        container = container || document.createElement('div')

        const registry = new Map()
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
