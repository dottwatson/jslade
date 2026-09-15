/** @param {string} name */
export function normalizeComponentName(name) {
    return String(name)
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '')
}

/** @param {object} api @param {string} name */
export function getComponentMeta(api, name) {
    const key = normalizeComponentName(name)
    if (!key) {
        return { state: 'missing', origin: null, sourceFile: null }
    }

    const compiled = api.compiledComponents[key]
    if (compiled) {
        return {
            state: 'compiled',
            origin: compiled.origin || compiled.rawSource?.origin || null,
            sourceFile: compiled.rawSource?.sourceFile || null,
        }
    }

    const def = api._sourceComponents[key]
    if (def) {
        return {
            state: 'registered',
            origin: def.origin || null,
            sourceFile: def.sourceFile || null,
        }
    }

    return {
        state: 'missing',
        origin: null,
        sourceFile: null,
    }
}

/** Registered (import / scanDOM) or already compiled. */
export function hasComponent(api, name) {
    return getComponentMeta(api, name).state !== 'missing'
}

/** @param {object} def @param {string} origin */
export function tagComponentOrigin(def, origin) {
    if (!def || def.origin) return def
    def.origin = origin
    return def
}
