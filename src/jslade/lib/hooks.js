import { runAfter } from './events.js'

export const hooks = { message: [], subscribe: [], render: [], instance: [], directive: [], resource: [] }

const LEGACY_AFTER = {
    message: 'wire:send',
    subscribe: 'wire:subscribe',
    resource: 'resource:load',
    directive: 'directive:register',
}

export function emitHook(type, payload) {
    const list = hooks[type]
    if (list) {
        for (let i = 0; i < list.length; i++) {
            try {
                list[i](payload)
            } catch (e) {
                /* hook errors must not break the engine */
            }
        }
    }

    const eventName = LEGACY_AFTER[type]
    if (eventName) runAfter(eventName, payload)
}
