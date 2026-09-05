/**
 * Jslade Debug — core.
 *
 * Consuma gli hook nativi dell'engine (Jslade._hooks) invece di fare
 * monkey-patching: più robusto, più veloce, allineato per costruzione.
 *
 * Caricamento (modulo):
 *   <link rel="stylesheet" href="assets/jslade-debugger/jslade-debug.css">
 *   <script src="assets/js/jslade.min.js"></script>
 *   <script type="module">
 *     import { attachDebug } from './assets/jslade-debugger/jslade-debug.js'
 *     Jslade.import({ ... })
 *     Jslade.start({ dev: true })
 *     attachDebug(Jslade)
 *   </script>
 */

import { createDebugUI, esc } from './jslade-debug.ui.js'

const MAX_LOG = 200

// Proprietà DOM non interessanti per il pannello "this"
const DOM_PROPS = new Set([
    'title',
    'lang',
    'translate',
    'dir',
    'hidden',
    'accessKey',
    'draggable',
    'spellcheck',
    'style',
    'classList',
    'className',
    'id',
    'slot',
    'part',
    'attributes',
    'shadowRoot',
    'children',
    'childNodes',
    'firstChild',
    'lastChild',
    'nextSibling',
    'previousSibling',
    'parentNode',
    'parentElement',
    'offsetParent',
    'innerHTML',
    'outerHTML',
    'innerText',
    'outerText',
    'textContent',
    'tagName',
    'nodeName',
    'nodeType',
    'nodeValue',
    'dataset',
    'isConnected',
    'ownerDocument',
    'value',
])

export function attachDebug(J) {
    if (!J || J._debugActive) return J && J.debug
    J._debugActive = true

    // ── Stato ────────────────────────────────────────────────────────────
    const instances = [] // entry { _id, template, container, state, instance }
    const instanceMap = new Map() // _id → entry
    const channelLog = [] // { channel, payload, time }
    const subscriptions = new Map() // _id → Set<channel>
    const renderTimes = [] // { name, ms }
    const directives = [] // { name, type }

    const uiState = {
        isOpen: false,
        activeTab: 'components',
        expandedChannels: {},
        expandedTree: {},
        expandedInfo: {},
        panelHeight: 45,
        _dragY: 0,
        _dragH: 45,
    }

    // ── Persistenza ──────────────────────────────────────────────────────
    const STORAGE_KEY = 'jslade_debug_' + location.pathname.replace(/[^a-zA-Z0-9]/g, '_')
    function saveState() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    isOpen: uiState.isOpen,
                    activeTab: uiState.activeTab,
                    expandedChannels: uiState.expandedChannels,
                    panelHeight: uiState.panelHeight,
                })
            )
        } catch (e) {
            /* ignore */
        }
    }
    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return
            const s = JSON.parse(raw)
            if (typeof s.isOpen === 'boolean') uiState.isOpen = s.isOpen
            if (s.activeTab) uiState.activeTab = s.activeTab
            if (s.expandedChannels) uiState.expandedChannels = s.expandedChannels
            if (typeof s.panelHeight === 'number' && s.panelHeight >= 15 && s.panelHeight <= 80) {
                uiState.panelHeight = s.panelHeight
            }
        } catch (e) {
            /* ignore */
        }
    }

    // ── Tracciamento istanze ─────────────────────────────────────────────
    function trackInstance(instance) {
        if (!instance || instance._unmounted || instanceMap.has(instance._id)) return
        const entry = {
            _id: instance._id,
            template: instance.template,
            container: instance.container,
            state: instance.state,
            instance,
        }
        instanceMap.set(instance._id, entry)
        instances.push(entry)
        scheduleRefresh()
    }
    function untrackInstance(instance) {
        if (!instance) return
        const entry = instanceMap.get(instance._id)
        if (entry) {
            const i = instances.indexOf(entry)
            if (i !== -1) instances.splice(i, 1)
        }
        instanceMap.delete(instance._id)
        subscriptions.delete(instance._id)
        delete uiState.expandedTree[instance._id]
        delete uiState.expandedInfo[instance._id]
        scheduleRefresh()
    }
    function trackTree(root) {
        if (!root) return
        trackInstance(root)
        ;(root.children || []).forEach(trackTree)
    }

    // ── Refresh (batched, setTimeout per compatibilità tab in background) ──
    let _pendingRefresh = false
    function scheduleRefresh() {
        if (_pendingRefresh) return
        _pendingRefresh = true
        setTimeout(() => {
            _pendingRefresh = false
            ui.setStats({ instances: instances.length, messages: channelLog.length })
            if (uiState.isOpen) renderActiveTab()
        }, 16)
    }

    // ── Registrazione hook nativi ────────────────────────────────────────
    function on(type, fn) {
        ;(J._hooks[type] = J._hooks[type] || []).push(fn)
    }

    on('message', ({ channel, value, time }) => {
        channelLog.push({ channel, payload: value, time })
        if (channelLog.length > MAX_LOG) channelLog.shift()
        scheduleRefresh()
    })
    on('render', ({ name, ms, instance }) => {
        renderTimes.push({ name, ms })
        if (renderTimes.length > MAX_LOG) renderTimes.shift()
        trackTree(instance)
        scheduleRefresh()
    })
    on('instance', ({ action, instance }) => {
        if (action === 'create') trackInstance(instance)
        else if (action === 'unmount') untrackInstance(instance)
    })
    on('directive', ({ name, type }) => {
        if (!directives.some((d) => d.name === name)) directives.push({ name, type })
    })

    // Direttive builtin (registrate internamente, non passano dagli hook)
    ;['if', 'elseif', 'else', 'foreach', 'for', 'component', 'endif', 'endforeach', 'endfor'].forEach((name) =>
        directives.push({ name, type: 'builtin' })
    )

    // ── UI ───────────────────────────────────────────────────────────────
    const ui = createDebugUI({
        onToggle() {
            uiState.isOpen = !uiState.isOpen
            ui.setOpen(uiState.isOpen)
            saveState()
            syncBodyLayout()
            if (uiState.isOpen) renderActiveTab()
        },
        onTabSelect(name) {
            uiState.activeTab = name
            ui.setActiveTab(name)
            saveState()
            renderActiveTab()
        },
        onResizeStart(y) {
            uiState._dragY = y
            uiState._dragH = uiState.panelHeight
        },
        onResizeDrag(y) {
            const delta = uiState._dragY - y
            uiState.panelHeight = Math.min(
                80,
                Math.max(15, Math.round(uiState._dragH + (delta / window.innerHeight) * 100))
            )
            ui.setHeight(uiState.panelHeight)
            syncBodyLayout()
        },
        onResizeEnd() {
            saveState()
            syncBodyLayout()
        },
        onComponentAction(dataset) {
            handleComponentAction(dataset)
        },
        onWirebusAction(dataset, el) {
            handleWirebusAction(dataset, el)
        },
        onTemplateAction(dataset, el) {
            handleToggle(dataset, el)
        },
    })

    loadState()
    ui.setHeight(uiState.panelHeight)
    if (uiState.isOpen) ui.setOpen(true)
    ui.setActiveTab(uiState.activeTab)
    syncBodyLayout()
    window.addEventListener('resize', syncBodyLayout)

    function syncBodyLayout() {
        if (!document.body || ui.bar.style.display === 'none') {
            if (document.body) {
                document.body.classList.remove('jslade-debug-active')
                document.body.style.paddingBottom = ''
            }
            return
        }
        document.body.classList.add('jslade-debug-active')
        requestAnimationFrame(() => {
            document.body.style.paddingBottom = ui.height() + 'px'
        })
    }

    // ── Azioni ───────────────────────────────────────────────────────────
    function handleComponentAction({ action, id }) {
        const numericId = Number(id)
        const entry = instanceMap.get(numericId)
        if (action === 'toggle-tree') {
            uiState.expandedTree[numericId] = !uiState.expandedTree[numericId]
            renderComponents()
        } else if (action === 'toggle-info') {
            uiState.expandedInfo[numericId] = !uiState.expandedInfo[numericId]
            renderComponents()
        } else if (action === 'highlight') {
            highlightEntry(entry)
        } else if (action === 'apply-state') {
            applyState(entry)
        } else if (action === 'destroy' && entry && entry.instance) {
            entry.instance.unmount()
        }
    }
    function handleWirebusAction(dataset, el) {
        if (dataset.action === 'highlight-instance') {
            highlightEntry(instanceMap.get(Number(dataset.id)))
        } else handleToggle(dataset, el)
    }
    function handleToggle(dataset, headerEl) {
        const body = headerEl.nextElementSibling
        const tgl = headerEl.querySelector('.jslade-debug-toggle')
        if (!body || !tgl) return
        const isOpen = !body.hidden
        body.hidden = isOpen
        tgl.textContent = isOpen ? '▶' : '▼'
        tgl.classList.toggle('collapsed', isOpen)
        if (dataset.channel) {
            uiState.expandedChannels[dataset.channel] = !isOpen
            saveState()
        }
    }
    function applyState(entry) {
        if (!entry) return
        const ta = ui.getStateEditor(entry._id)
        try {
            const parsed = JSON.parse(ta.value)
            const newState = parsed.state != null ? parsed.state : parsed
            for (const key of Object.keys(newState)) {
                if (key.charAt(0) !== '_') entry.state[key] = newState[key]
            }
        } catch (err) {
            alert('Invalid JSON: ' + err.message)
        }
    }
    function highlightEntry(entry) {
        if (!entry) return
        const el = (entry.instance && entry.instance.container) || entry.container
        if (!el || !el.isConnected) return
        el.classList.add('jslade-debug-is-highlighted')
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => el.classList.remove('jslade-debug-is-highlighted'), 2000)
    }

    // ── Render pannelli ──────────────────────────────────────────────────
    function renderActiveTab() {
        if (uiState.activeTab === 'components') renderComponents()
        else if (uiState.activeTab === 'wirebus') renderWirebus()
        else if (uiState.activeTab === 'perf') renderPerf()
        else if (uiState.activeTab === 'templates') renderTemplates()
        else if (uiState.activeTab === 'directives') renderDirectives()
    }

    function getRoots() {
        const roots = instances.filter((e) => e.instance && !e.instance.parent)
        return (roots.length ? roots : instances).slice().sort((a, b) => a._id - b._id)
    }

    function renderComponents() {
        if (instances.length === 0) {
            ui.renderEmpty('components', 'No components mounted yet.')
            return
        }
        ui.setPanelHtml(
            'components',
            getRoots()
                .map((e) => renderInstanceNode(e, 0))
                .join('')
        )
    }

    function renderInstanceNode(entry, depth) {
        if (!entry) return ''
        const instance = entry.instance
        const tag = entry.container.tagName ? entry.container.tagName.toLowerCase() : 'div'
        const domId = entry.container.id || ''
        const id = entry._id
        const children = (instance && instance.children) || []
        const hasChildren = children.length > 0
        const childrenOpen = !!uiState.expandedTree[id]
        const infoOpen = !!uiState.expandedInfo[id]
        const indent = depth * 14

        let html =
            `<div class="jslade-debug-tree-node" data-id="${id}">` +
            `<div class="jslade-debug-instance-header" style="padding-left:${indent}px">` +
            `<span class="jslade-debug-tree-leading">` +
            (hasChildren
                ? `<button type="button" class="jslade-debug-btn jslade-debug-btn--icon" data-action="toggle-tree" data-id="${id}">${childrenOpen ? '▼' : '▶'}</button>`
                : `<span class="jslade-debug-tree-toggle-spacer"></span>`) +
            `</span>` +
            `<span class="jslade-debug-instance-label" data-action="highlight" data-id="${id}">` +
            `<span class="name">${esc(entry.template)}</span> ` +
            `<span class="val">#${id} &lt;${tag}${domId ? '#' + esc(domId) : ''}&gt;</span>` +
            `</span>` +
            `<span class="jslade-debug-instance-actions">` +
            `<button type="button" class="jslade-debug-btn jslade-debug-btn--info${infoOpen ? ' is-active' : ''}" data-action="toggle-info" data-id="${id}">ℹ</button>` +
            `<button type="button" class="jslade-debug-btn jslade-debug-btn--danger" data-action="destroy" data-id="${id}">✕</button>` +
            `</span>` +
            `</div>` +
            renderInfoPanel(entry)

        if (hasChildren && childrenOpen) {
            html += '<div class="jslade-debug-tree-children">'
            children.forEach((c) => {
                html += renderInstanceNode(instanceMap.get(c._id), depth + 1)
            })
            html += '</div>'
        }
        return html + '</div>'
    }

    function renderInfoPanel(entry) {
        const id = entry._id
        const open = !!uiState.expandedInfo[id]
        return (
            `<div class="jslade-debug-info-panel" data-id="${id}"${open ? '' : ' hidden'}>` +
            `<div class="jslade-debug-cols">` +
            col('Source', resolveTemplateRawText(entry.template)) +
            col('this', buildThisJson(entry)) +
            `<div class="jslade-debug-col"><div class="jslade-debug-col-label">State</div>` +
            `<textarea class="jslade-debug-json jslade-debug-state-edit" data-id="${id}">${esc(buildStateJson(entry))}</textarea>` +
            `<button type="button" class="jslade-debug-apply" data-action="apply-state" data-id="${id}">Apply</button>` +
            `</div>` +
            `</div></div>`
        )
    }
    function col(label, json) {
        return (
            `<div class="jslade-debug-col"><div class="jslade-debug-col-label">${label}</div>` +
            `<textarea class="jslade-debug-json" readonly>${esc(json)}</textarea></div>`
        )
    }

    function rebuildTemplateRaw(name, parts) {
        const chunks = []
        if (parts.script) chunks.push('<script>\n' + parts.script + '\n</script>')
        if (parts.scopedStyles) {
            const tag = parts.scopeTargets ? 'style scoped' : 'style'
            chunks.push('<' + tag + '>\n' + parts.scopedStyles + '\n</style>')
        }
        if (parts.markup !== undefined) chunks.push('<template>\n' + parts.markup + '\n</template>')
        return '<noembed name="' + name + '">\n' + chunks.join('\n\n') + '\n</noembed>'
    }

    function resolveTemplateRawText(name) {
        const compiled = J.compiledComponents && J.compiledComponents[name]
        const raw = compiled && compiled.rawSource
        if (raw && raw.rawText) return raw.rawText
        if (raw && raw.text) return rebuildTemplateRaw(name, raw)
        const legacy = typeof window !== 'undefined' && window.__jsladeComponents && window.__jsladeComponents[name]
        if (legacy) {
            if (typeof legacy === 'string') return legacy
            return rebuildTemplateRaw(name, legacy)
        }
        return '// template not found: ' + name
    }

    function buildFullDefinitionText(name) {
        return resolveTemplateRawText(name)
    }
    function snapshotState(state) {
        try {
            return JSON.parse(JSON.stringify(state))
        } catch (err) {
            return { _error: 'Could not serialize state: ' + err.message }
        }
    }
    function buildStateJson(entry) {
        return JSON.stringify(
            {
                _id: entry._id,
                template: entry.template,
                _hostMode: entry.instance && entry.instance._hostMode,
                parent:
                    entry.instance && entry.instance.parent
                        ? entry.instance.parent.template + ' #' + entry.instance.parent._id
                        : null,
                children: entry.instance ? entry.instance.children.map((c) => c.template + ' #' + c._id) : [],
                state: snapshotState(entry.state),
            },
            null,
            2
        )
    }
    function buildThisJson(entry) {
        const obj = {}
        const instance = entry.instance
        if (instance) {
            obj._id = instance._id
            obj.template = instance.template
            obj._hostMode = instance._hostMode
            if (typeof instance.find === 'function') obj.find = '[function]'
            if (typeof instance.findAll === 'function') obj.findAll = '[function]'
            if (typeof instance.unmount === 'function') obj.unmount = '[function]'
        }
        Object.keys(entry.container).forEach((k) => {
            if (DOM_PROPS.has(k)) return
            const val = entry.container[k]
            if (typeof val === 'function') obj[k] = '[function]'
            else if (val instanceof Node) obj[k] = '[DOM node]'
            else {
                try {
                    obj[k] = JSON.parse(JSON.stringify(val))
                } catch (e) {
                    obj[k] = '[' + typeof val + ']'
                }
            }
        })
        return JSON.stringify(obj, null, 2)
    }

    function renderWirebus() {
        if (channelLog.length === 0) {
            ui.renderEmpty('wirebus', 'No messages yet.')
            return
        }
        const groups = {}
        channelLog.forEach((e) => {
            ;(groups[e.channel] = groups[e.channel] || []).push(e)
        })
        const html = Object.keys(groups)
            .sort()
            .map((ch) => {
                const msgs = groups[ch]
                const open = !!uiState.expandedChannels[ch]
                const recent = msgs
                    .slice(-20)
                    .reverse()
                    .map((e) => {
                        const time = new Date(e.time).toLocaleTimeString()
                        let payload
                        if (e.payload == null) payload = '(no payload)'
                        else if (typeof e.payload === 'string') payload = e.payload
                        else {
                            try {
                                payload = JSON.stringify(e.payload)
                            } catch {
                                payload = String(e.payload)
                            }
                        }
                        return (
                            `<div class="jslade-debug-wirebus-msg"><div class="jslade-debug-wirebus-row1">` +
                            `<span style="color:#888;font-size:9px">${esc(time)}</span> ` +
                            `<span class="val">${esc(payload.slice(0, 100))}</span></div></div>`
                        )
                    })
                    .join('')
                return (
                    `<div class="jslade-debug-channel">` +
                    `<div class="jslade-debug-channel-header" data-action="toggle-channel" data-channel="${esc(ch)}">` +
                    `<span class="jslade-debug-toggle${open ? '' : ' collapsed'}">${open ? '▼' : '▶'}</span>` +
                    `<span class="name">${esc(ch)}</span> <span class="val">${msgs.length} msgs</span>` +
                    `</div>` +
                    `<div class="jslade-debug-channel-body"${open ? '' : ' hidden'}>${recent}</div></div>`
                )
            })
            .join('')
        ui.setPanelHtml('wirebus', html)
    }

    function renderPerf() {
        if (renderTimes.length === 0) {
            ui.renderEmpty('perf', 'No renders yet.')
            return
        }
        const total = renderTimes.reduce((s, r) => s + r.ms, 0)
        const mem = performance.memory
            ? `<div class="jslade-debug-row"><span class="name">Memory</span> <span class="val">` +
              `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB used</span></div>`
            : ''
        ui.setPanelHtml(
            'perf',
            `<div class="jslade-debug-row"><span class="name">Total renders</span> <span class="highlight">${renderTimes.length}</span> — cumulative <span class="highlight">${total.toFixed(2)} ms</span></div>` +
                `<div class="jslade-debug-row"><span class="name">Active instances</span> <span class="highlight">${instances.length}</span></div>` +
                `<div class="jslade-debug-row"><span class="name">Channel messages</span> <span class="highlight">${channelLog.length}</span></div>` +
                mem
        )
    }

    function renderTemplates() {
        const names = J.list ? J.list() : Object.keys(J.compiledComponents || {})
        if (names.length === 0) {
            ui.renderEmpty('templates', 'No templates compiled.')
            return
        }
        ui.setPanelHtml(
            'templates',
            names
                .map(
                    (name) =>
                        `<div class="jslade-debug-template">` +
                        `<div class="jslade-debug-template-header" data-action="toggle-template">` +
                        `<span class="jslade-debug-toggle collapsed">▶</span><span class="name">📄 ${esc(name)}</span></div>` +
                        `<div class="jslade-debug-template-body" hidden>` +
                        `<textarea class="jslade-debug-json jslade-debug-source" readonly>${esc(buildFullDefinitionText(name))}</textarea></div>` +
                        `</div>`
                )
                .join('')
        )
    }

    function renderDirectives() {
        if (directives.length === 0) {
            ui.renderEmpty('directives', 'No directives detected.')
            return
        }
        const badge = (t) =>
            `<span class="jslade-debug-badge jslade-debug-badge--${t}">${t === 'builtin' ? 'built-in' : t}</span>`
        ui.setPanelHtml(
            'directives',
            directives
                .map(
                    (d) =>
                        `<div class="jslade-debug-row">${badge(d.type)}<span class="name">@${esc(d.name)}</span></div>`
                )
                .join('')
        )
    }

    // ── API pubblica ─────────────────────────────────────────────────────
    J.debug = {
        instances: () => instances,
        messages: () => channelLog,
        timings: () => renderTimes,
        show() {
            uiState.isOpen = true
            ui.setOpen(true)
            saveState()
            syncBodyLayout()
            renderActiveTab()
        },
        hide() {
            uiState.isOpen = false
            ui.setOpen(false)
            saveState()
            syncBodyLayout()
        },
        enable() {
            ui.setVisible(true)
            syncBodyLayout()
        },
        disable() {
            ui.setVisible(false)
            syncBodyLayout()
        },
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === '\\') {
            e.preventDefault()
            uiState.isOpen ? J.debug.hide() : J.debug.show()
        }
    })

    if (typeof J.instances === 'function') {
        const byTemplate = J.instances()
        for (const name of Object.keys(byTemplate)) {
            for (const inst of byTemplate[name]) trackTree(inst)
        }
    }

    ui.setStats({ instances: instances.length, messages: channelLog.length })
    return J.debug
}

// Auto-boot se Jslade è già globale (script classico dopo il modulo engine).
if (typeof window !== 'undefined' && window.Jslade && !window.Jslade._debugActive) {
    attachDebug(window.Jslade)
}
