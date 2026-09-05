const ELEMENT_NODE = 1

/**
 * Patches a live DOM subtree towards a freshly rendered one instead of replacing it.
 *
 * Siblings are matched by key when they have one (`key="…"` in markup, or the
 * child-component marker) and by position otherwise, so nodes that survive a
 * re-render keep their identity: focus, selection, scroll and live component
 * instances all stay where they were.
 *
 * `opts` supplies the parts the patcher cannot know about:
 *   keyOf(element)        → identity string, or null for position matching
 *   keep(liveEl, newEl)   → true to adopt the live node untouched (component boundary)
 *   discard(node)         → called before a node leaves the document
 */

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

/**
 * Live values the serialized markup does not carry. Read before the attributes are
 * synced: only a change in what the template *declares* may overwrite what the user typed.
 */
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
        if (from.getAttribute(attribute.name) !== attribute.value) from.setAttribute(attribute.name, attribute.value)
    }
    const current = from.attributes
    for (let i = current.length - 1; i >= 0; i--) {
        const name = current[i].name
        if (!to.hasAttribute(name)) from.removeAttribute(name)
    }
}

/** Returns the node now living at `from`'s position — `from` itself, or its replacement. */
export function morphNode(from, to, opts) {
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

export function morphChildren(from, to, opts) {
    let keyed = null
    for (let node = from.firstChild; node; node = node.nextSibling) {
        const key = keyOf(node, opts)
        if (key !== null) (keyed || (keyed = new Map())).set(key, node)
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
            // Unkeyed nodes match by position; keyed ones are reachable by key alone.
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
