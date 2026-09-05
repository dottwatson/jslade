export function createReactiveState(initialData, onStateChange) {
    const proxyCache = new WeakMap()
    /** Proxies already emitted by wrap() — must not be wrapped again (array in-place updates). */
    const reactiveProxies = new WeakSet()

    function wrap(obj) {
        if (obj === null || typeof obj !== 'object') return obj
        if (proxyCache.has(obj)) return proxyCache.get(obj)
        if (reactiveProxies.has(obj)) return obj

        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if (obj[i] !== null && typeof obj[i] === 'object') {
                    obj[i] = wrap(obj[i])
                }
            }
            return obj
        }

        const proxy = new Proxy(obj, {
            get(target, propertyKey, receiver) {
                const value = Reflect.get(target, propertyKey, receiver)
                return wrap(value)
            },
            set(target, propertyKey, propertyValue) {
                const wrapped = wrap(propertyValue)
                if (Reflect.get(target, propertyKey) === wrapped) return true
                const ok = Reflect.set(target, propertyKey, wrapped)
                if (ok) onStateChange?.(initialData)
                return ok
            },
            deleteProperty(target, propertyKey) {
                const ok = Reflect.deleteProperty(target, propertyKey)
                if (ok) onStateChange?.(initialData)
                return ok
            },
        })

        proxyCache.set(obj, proxy)
        reactiveProxies.add(proxy)
        return proxy
    }

    return wrap(initialData)
}
