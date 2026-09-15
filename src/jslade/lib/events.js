/**
 * Public engine events — Jslade.before / after / once / off.
 * before: return false (===) to stop the pipeline.
 */

/** @type {Record<string, { before: Function[], after: Function[] }>} */
const registry = Object.create(null)

/** @type {WeakMap<Function, Function>} */
const onceWrappers = new WeakMap()

function bucket(event) {
    if (!registry[event]) registry[event] = { before: [], after: [] }
    return registry[event]
}

/** @param {string} event @param {'before'|'after'} phase @param {Function} fn */
function addListener(event, phase, fn) {
    bucket(event)[phase].push(fn)
}

/** @param {string} event @param {'before'|'after'} phase @param {Function} fn */
function removeListener(event, phase, fn) {
    const store = registry[event]
    if (!store) return
    const list = store[phase]
    const index = list.indexOf(fn)
    if (index !== -1) list.splice(index, 1)
    const wrapped = onceWrappers.get(fn)
    if (wrapped) {
        const wrappedIndex = list.indexOf(wrapped)
        if (wrappedIndex !== -1) list.splice(wrappedIndex, 1)
    }
}

/**
 * @param {'before'|'after'} phase
 * @param {string} event
 * @param {object} payload
 * @param {{ awaitAsync?: boolean }} [options]
 * @returns {boolean | Promise<boolean>}
 */
export function runPhase(phase, event, payload, options) {
    const list = registry[event]?.[phase]
    if (!list || !list.length) return phase === 'before'

    if (options && options.awaitAsync) return runPhaseAsync(phase, list, payload)

    for (let i = 0; i < list.length; i++) {
        try {
            const result = list[i](payload)
            if (result && typeof result.then === 'function') {
                throw new Error(
                    `[Jslade] Async ${phase}("${event}") requires startAsync() or renderToAsync() — sync start() cannot await hooks.`
                )
            }
            if (phase === 'before' && result === false) return false
        } catch (error) {
            if (error && error.message && error.message.includes('requires startAsync')) throw error
            /* listener errors must not break the engine */
        }
    }
    return true
}

/** @param {'before'|'after'} phase @param {Function[]} list @param {object} payload */
async function runPhaseAsync(phase, list, payload) {
    for (let i = 0; i < list.length; i++) {
        try {
            const result = list[i](payload)
            const value = result && typeof result.then === 'function' ? await result : result
            if (phase === 'before' && value === false) return false
        } catch (_) {
            /* listener errors must not break the engine */
        }
    }
    return true
}

/** @param {string} event @param {object} payload */
export function runBefore(event, payload, options) {
    return runPhase('before', event, payload, options)
}

/** @param {string} event @param {object} payload */
export function runAfter(event, payload, options) {
    return runPhase('after', event, payload, options)
}

/** @param {Function} fn */
export function before(event, fn) {
    addListener(event, 'before', fn)
    return fn
}

/** @param {Function} fn */
export function after(event, fn) {
    addListener(event, 'after', fn)
    return fn
}

/** One-shot listener on the after phase. */
export function once(event, fn) {
    const wrapped = function (payload) {
        removeListener(event, 'after', fn)
        return fn(payload)
    }
    onceWrappers.set(fn, wrapped)
    addListener(event, 'after', wrapped)
    return fn
}

/** @param {Function} fn */
export function off(event, fn) {
    removeListener(event, 'before', fn)
    removeListener(event, 'after', fn)
}

/** @param {string} [event] — omit to clear all */
export function resetEvents(event) {
    if (event) {
        delete registry[event]
        return
    }
    for (const key of Object.keys(registry)) delete registry[key]
}
