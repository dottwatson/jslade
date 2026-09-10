/** Which component is running a hook, method, or event handler. */
let currentInstance = null

export function getCurrentInstance() {
    return currentInstance
}

export function runWithCurrentInstance(instance, fn) {
    const previous = currentInstance
    currentInstance = instance
    try {
        return fn()
    } finally {
        currentInstance = previous
    }
}
