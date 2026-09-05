/**
 * Jslade Debug — UI layer (DOM construction).
 *
 * Costruisce e aggiorna la barra di debug. Non conosce l'engine: riceve dati
 * dal core (jslade-debug.js) ed emette intent dell'utente tramite callback.
 * Gli stili vivono in assets/css/jslade-debug.css.
 */

const TAB_DEFS = [
    { key: 'components', label: 'Components' },
    { key: 'wirebus', label: 'WireBus' },
    { key: 'perf', label: 'Performance' },
    { key: 'templates', label: 'Templates' },
    { key: 'directives', label: 'Directives' },
]

function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function createDebugUI(handlers) {
    // ── helpers DOM ────────────────────────────────────────────────────────
    function el(tag, props) {
        const node = document.createElement(tag)
        if (!props) return node
        if (props.className) node.className = props.className
        if (props.id) node.id = props.id
        if (props.text != null) node.textContent = props.text
        if (props.html != null) node.innerHTML = props.html
        if (props.hidden) node.hidden = true
        if (props.type) node.type = props.type
        if (props.dataset) Object.assign(node.dataset, props.dataset)
        if (props.children)
            props.children.forEach((c) => {
                if (c != null) node.appendChild(c)
            })
        return node
    }

    function clearNode(node) {
        while (node.firstChild) node.removeChild(node.firstChild)
    }

    // ── struttura barra ────────────────────────────────────────────────────
    const bar = el('div', { id: 'jslade-debug-bar' })
    const resize = el('div', { id: 'jslade-debug-resize' })
    const handle = el('div', { id: 'jslade-debug-handle' })
    const title = el('span', { text: '🛠 Jslade Debug' })
    const stats = el('span', { id: 'jslade-debug-stats' })
    const toggle = el('span', { id: 'jslade-debug-toggle', text: '▼' })
    const panel = el('div', { id: 'jslade-debug-panel' })
    const tabs = el('div', { className: 'jslade-debug-tabs' })
    const tabPanels = {}

    handle.appendChild(title)
    handle.appendChild(stats)
    handle.appendChild(toggle)

    TAB_DEFS.forEach((def, i) => {
        tabs.appendChild(
            el('button', {
                className: 'jslade-debug-tab' + (i === 0 ? ' active' : ''),
                dataset: { tab: def.key },
                text: def.label,
                type: 'button',
            })
        )
        tabPanels[def.key] = el('div', {
            className: 'jslade-debug-tab-panel',
            id: 'jslade-debug-' + def.key,
            hidden: i !== 0,
        })
    })

    panel.appendChild(tabs)
    TAB_DEFS.forEach((def) => panel.appendChild(tabPanels[def.key]))
    bar.appendChild(resize)
    bar.appendChild(handle)
    bar.appendChild(panel)
    document.body.appendChild(bar)

    // ── stat nodes (aggiornamento incrementale) ────────────────────────────
    const statNodes = {
        instances: el('span', { className: 'stat', html: '📦 <span class="num">0</span> instances' }),
        messages: el('span', { className: 'stat', html: '📡 <span class="num">0</span> msgs' }),
        memory: null,
    }
    clearNode(stats)
    stats.appendChild(statNodes.instances)
    stats.appendChild(statNodes.messages)

    // ── event wiring verso il core ─────────────────────────────────────────
    toggle.addEventListener('click', (e) => {
        e.stopPropagation()
        handlers.onToggle()
    })
    tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.jslade-debug-tab')
        if (tab) {
            e.stopPropagation()
            handlers.onTabSelect(tab.dataset.tab)
        }
    })
    tabPanels.components.addEventListener('click', (e) => forwardAction(e, handlers.onComponentAction))
    tabPanels.wirebus.addEventListener('click', (e) => forwardAction(e, handlers.onWirebusAction))
    tabPanels.templates.addEventListener('click', (e) => forwardAction(e, handlers.onTemplateAction))

    function forwardAction(e, fn) {
        const actionEl = e.target.closest('[data-action]')
        if (!actionEl) return
        e.stopPropagation()
        fn(actionEl.dataset, actionEl)
    }

    // resize drag
    resize.addEventListener('mousedown', (e) => {
        e.preventDefault()
        handlers.onResizeStart(e.clientY)
        document.addEventListener('mousemove', onDrag)
        document.addEventListener('mouseup', onDragEnd)
    })
    function onDrag(e) {
        handlers.onResizeDrag(e.clientY)
    }
    function onDragEnd() {
        document.removeEventListener('mousemove', onDrag)
        document.removeEventListener('mouseup', onDragEnd)
        handlers.onResizeEnd()
    }

    // ── API pubblica della UI ──────────────────────────────────────────────
    return {
        bar,
        handle,
        toggle,
        panel,
        resize,
        tabPanels,

        setOpen(open) {
            bar.classList.toggle('open', open)
            toggle.textContent = open ? '▲' : '▼'
        },
        setActiveTab(name) {
            tabs.querySelectorAll('.jslade-debug-tab').forEach((t) =>
                t.classList.toggle('active', t.dataset.tab === name)
            )
            TAB_DEFS.forEach((def) => {
                tabPanels[def.key].hidden = def.key !== name
            })
        },
        setHeight(vh) {
            bar.style.setProperty('--jslade-debug-height', vh + 'vh')
        },
        setVisible(visible) {
            bar.style.display = visible ? 'block' : 'none'
        },
        height() {
            return bar.offsetHeight
        },

        setStats({ instances, messages }) {
            statNodes.instances.querySelector('.num').textContent = String(instances)
            statNodes.messages.querySelector('.num').textContent = String(messages)
            if (performance.memory) {
                if (!statNodes.memory) {
                    statNodes.memory = el('span', { className: 'stat', html: '💾 <span class="num">0 MB</span>' })
                    stats.appendChild(statNodes.memory)
                }
                statNodes.memory.querySelector('.num').textContent =
                    Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB'
            }
        },

        renderEmpty(panelKey, message) {
            clearNode(tabPanels[panelKey])
            tabPanels[panelKey].appendChild(el('div', { className: 'jslade-debug-empty', text: message }))
        },
        setPanelHtml(panelKey, html) {
            tabPanels[panelKey].innerHTML = html
        },
        getStateEditor(id) {
            return tabPanels.components.querySelector('.jslade-debug-state-edit[data-id="' + id + '"]')
        },
    }
}

export { esc }
