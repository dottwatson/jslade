import { getComponentMeta } from './component-meta.js'
import { runBefore, runAfter } from './events.js'

/**
 * @param {object} api
 * @param {string} name
 * @param {string} via
 * @param {object} [extra]
 * @param {{ awaitAsync?: boolean }} options
 */
async function finishRequest(api, name, payload, options) {
    const allowed = await runBefore('component:request', payload, options)
    if (allowed === false) {
        await runAfter('component:request', { ...payload, found: false, blocked: true }, options)
        return false
    }

    if (api.compiledComponents[name]) {
        await runAfter('component:request', { ...payload, found: true }, options)
        return true
    }

    const def = api._sourceComponents[name]
    if (def) {
        const compiled = await compileWithEvents(api, name, def, options)
        const found = !!compiled
        await runAfter('component:request', { ...payload, found }, options)
        return found
    }

    await runAfter('component:request', { ...payload, found: false }, options)
    return false
}

/**
 * @param {object} api
 * @param {string} name
 * @param {string} via
 * @param {object} [extra]
 */
export function requestComponentSync(api, name, via, extra) {
    const meta = getComponentMeta(api, name)
    const payload = { name, via, ...meta, ...(extra || {}) }
    const options = { awaitAsync: false }

    const allowed = runBefore('component:request', payload, options)
    if (allowed === false) {
        runAfter('component:request', { ...payload, found: false, blocked: true }, options)
        return false
    }

    if (api.compiledComponents[name]) {
        runAfter('component:request', { ...payload, found: true }, options)
        return true
    }

    const def = api._sourceComponents[name]
    if (def) {
        const compiled = compileWithEventsSync(api, name, def)
        const found = !!compiled
        runAfter('component:request', { ...payload, found }, options)
        return found
    }

    runAfter('component:request', { ...payload, found: false }, options)
    return false
}

/** @param {object} api @param {string} name @param {string} via @param {object} [extra] */
export function requestComponent(api, name, via, extra) {
    const meta = getComponentMeta(api, name)
    const payload = { name, via, ...meta, ...(extra || {}) }
    return finishRequest(api, name, payload, { awaitAsync: true })
}

/**
 * @param {object} api
 * @param {string} name
 * @param {object} def
 */
export function compileWithEventsSync(api, name, def) {
    const options = { awaitAsync: false }
    const meta = getComponentMeta(api, name)
    const payload = {
        name,
        origin: def.origin || meta.origin || null,
        sourceFile: def.sourceFile || meta.sourceFile || null,
    }

    const allowed = runBefore('compile', payload, options)
    if (allowed === false) return null

    const started = typeof performance !== 'undefined' && performance.now ? performance.now() : 0
    api.compile(name, def)
    const compiled = api.compiledComponents[name] || null

    if (compiled) {
        const ended = typeof performance !== 'undefined' && performance.now ? performance.now() : 0
        runAfter(
            'compile',
            {
                ...payload,
                ms: Math.round((ended - started) * 100) / 100,
            },
            options
        )
    }

    return compiled
}

/**
 * @param {object} api
 * @param {string} name
 * @param {object} def
 * @param {{ awaitAsync?: boolean }} options
 */
export async function compileWithEvents(api, name, def, options) {
    const meta = getComponentMeta(api, name)
    const payload = {
        name,
        origin: def.origin || meta.origin || null,
        sourceFile: def.sourceFile || meta.sourceFile || null,
    }

    const allowed = await runBefore('compile', payload, options)
    if (allowed === false) return null

    const started = typeof performance !== 'undefined' && performance.now ? performance.now() : 0
    api.compile(name, def)
    const compiled = api.compiledComponents[name] || null

    if (compiled) {
        const ended = typeof performance !== 'undefined' && performance.now ? performance.now() : 0
        await runAfter(
            'compile',
            {
                ...payload,
                ms: Math.round((ended - started) * 100) / 100,
            },
            options
        )
    }

    return compiled
}

/** @param {object} payload */
export function emitMountBeforeSync(payload) {
    return runBefore('mount', payload, { awaitAsync: false })
}

/** @param {object} payload */
export function emitMountAfterSync(payload) {
    runAfter('mount', payload, { awaitAsync: false })
}

/** @param {object} payload */
export async function emitMountBefore(payload) {
    return runBefore('mount', payload, { awaitAsync: true })
}

/** @param {object} payload */
export async function emitMountAfter(payload) {
    await runAfter('mount', payload, { awaitAsync: true })
}

/** @param {object} payload */
export function emitUnmountBeforeSync(payload) {
    return runBefore('unmount', payload, { awaitAsync: false })
}

/** @param {object} payload */
export function emitUnmountAfterSync(payload) {
    runAfter('unmount', payload, { awaitAsync: false })
}
