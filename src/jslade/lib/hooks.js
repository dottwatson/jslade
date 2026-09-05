export const hooks = { message: [], subscribe: [], render: [], instance: [], directive: [] }

export function emitHook(type, payload) {
    const list = hooks[type]
    if (!list) return
    for (let i = 0; i < list.length; i++) {
        try {
            list[i](payload)
        } catch (e) {
            /* hook errors must not break the engine */
        }
    }
}
