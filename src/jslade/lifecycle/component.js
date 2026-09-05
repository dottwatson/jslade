import { EVENT_ATTRIBUTE_PREFIX, MAX_CONSECUTIVE_RENDERS } from '../lib/constants.js'
import { _devLog } from '../lib/dev-log.js'
import { emitHook } from '../lib/hooks.js'
import {
    attachScriptMethodsToInstance,
    formatRuntimeError,
    trackLiveInstance,
    untrackLiveInstance,
} from '../lib/instance-registry.js'
import { extractHookFunction } from '../lib/js-scan.js'
import { createReactiveState } from '../lib/reactive.js'
import { WireBus } from '../lib/wire.js'
import { morphChildren, morphNode } from './morph.js'
import { getUpdatingInstance, runWithUpdatingInstance } from './render-state.js'

/** Render-scoped: links a rendered root back to its entry in the current render tree. */
export const CHILD_ID = 'data-jsd-id'
/** Stable across renders: what lets a child instance survive its parent re-rendering. */
export const CHILD_KEY = 'data-jsd-key'

export function clonePropDefaults(value) {
    if (value === null || typeof value !== 'object') return value
    if (value instanceof Date) return new Date(value.getTime())
    if (Array.isArray(value)) {
        const out = new Array(value.length)
        for (let i = 0; i < value.length; i++) out[i] = clonePropDefaults(value[i])
        return out
    }
    const out = {}
    for (const key of Object.keys(value)) out[key] = clonePropDefaults(value[key])
    return out
}

export function parseFragment(html) {
    const holder = document.createElement('template')
    holder.innerHTML = html
    return holder.content
}

export function captureFocusSnapshot(scope) {
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

export function restoreFocusSnapshot(scope, snapshot) {
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
    } catch (e) {
        /* not focusable */
    }
    if (snapshot.selectionStart !== null && typeof node.setSelectionRange === 'function') {
        try {
            node.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd)
        } catch (e) {
            /* non-text */
        }
    }
    scope.scrollTop = snapshot.scrollTop
    scope.scrollLeft = snapshot.scrollLeft
}

/**
 * Runtime instance for one mounted template. Internal engine type — not part of the public API.
 */
export class Component {
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
                    `[Jslade] "${this.template}": render loop stopped after ${MAX_CONSECUTIVE_RENDERS} passes — updated() is writing to state.`
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

        // The id is read at dispatch time: a morphed element may now stand for another markup site.
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
        Component.mountCreated(
            Component.adoptChildren(scope, tree, this, this._registry, this._createComponent, this._mergeComponentProps)
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
            Component.adoptMarkedElement(node, tree, owner, registry, createComponent, mergeComponentProps, created)
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
            if (entry) Component.applyIncomingProps(live, entry.props)
            return
        }
        if (!entry) {
            Component.adoptChildren(element, tree, owner, registry, createComponent, mergeComponentProps, created)
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
        Component.adoptChildren(element, tree, child, registry, createComponent, mergeComponentProps, created)
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
