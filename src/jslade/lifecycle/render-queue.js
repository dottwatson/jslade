/** Microtask batch for reactive re-renders — one flush per tick. */
export function createRenderQueue() {
    const queue = []
    let scheduled = false

    function flush() {
        scheduled = false
        const batch = queue.splice(0, queue.length)
        for (let i = 0; i < batch.length; i++) {
            const component = batch[i]
            component._renderScheduled = false
            if (!component._unmounted) component.rerender()
        }
    }

    function enqueue(component) {
        if (component._renderScheduled) return
        component._renderScheduled = true
        queue.push(component)
        if (scheduled) return
        scheduled = true
        queueMicrotask(flush)
    }

    return { enqueue }
}
