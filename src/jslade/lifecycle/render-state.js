/** Tracks which instance is inside updated() — used by the render-loop guard. */
let updatingInstance = null

export function getUpdatingInstance() {
    return updatingInstance
}

export function runWithUpdatingInstance(instance, fn) {
    const previous = updatingInstance
    updatingInstance = instance
    try {
        return fn()
    } finally {
        updatingInstance = previous
    }
}
