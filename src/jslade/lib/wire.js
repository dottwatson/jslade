import { emitHook } from './hooks.js'
import { getCurrentInstance } from './current-instance.js'

let wireDebugEnabled = false

export function getWireDebug() {
    return wireDebugEnabled
}

export function setWireDebug(value) {
    wireDebugEnabled = value === true
}

export function createWireBus(options = {}) {
    const local = options.local === true

    const bus = {
        _channels: {},
        _last: {},

        _publish(channel, value) {
            this._last[channel] = value
            if (wireDebugEnabled) {
                console.log(
                    '%c[Wire] %c' + channel + ' %c→',
                    'color:#888',
                    'font-weight:bold;color:#0d6efd',
                    'color:#888',
                    value
                )
            }
            emitHook('message', { channel, value, local, time: Date.now() })
            const subs = this._channels[channel]
            if (!subs) return
            subs.slice().forEach(function (fn) {
                fn(value)
            })
        },

        send(channel, value) {
            this._publish(channel, value)
        },

        get(channel, fallback) {
            if (channel in this._last) return this._last[channel]
            return fallback
        },

        forget(channel) {
            delete this._last[channel]
        },

        subscribe(channel, fn) {
            if (wireDebugEnabled) {
                console.log(
                    '%c[Wire] %csubscribe %c' + channel,
                    'color:#888',
                    'color:#198754',
                    'font-weight:bold;color:#0d6efd'
                )
            }
            ;(this._channels[channel] = this._channels[channel] || []).push(fn)
            emitHook('subscribe', { channel, local, time: Date.now() })

            if (channel in this._last) fn(this._last[channel])

            const channels = this._channels
            return function unsubscribe() {
                const subs = channels[channel]
                if (!subs) return
                const index = subs.indexOf(fn)
                if (index !== -1) subs.splice(index, 1)
                if (subs.length === 0) delete channels[channel]
            }
        },

        clear() {
            this._channels = {}
            this._last = {}
        },
    }

    return bus
}

export function createWireHandle(bus, channel, caller) {
    const name = String(channel)
    return {
        send(value) {
            bus.send(name, value)
        },
        get(fallback) {
            return bus.get(name, fallback)
        },
        clear() {
            bus.forget(name)
        },
        receive(fn) {
            const off = bus.subscribe(name, fn)
            if (caller && typeof caller._trackWire === 'function') caller._trackWire(off)
            return off
        },
    }
}

/** Public square — one bus for the whole page. */
export const publicWireBus = createWireBus()

/** @deprecated Internal alias used by the debugger debug flag. */
export const WireBus = publicWireBus

export function openPublicWire(channel, host) {
    const caller = getCurrentInstance() || host || null
    return createWireHandle(publicWireBus, channel, caller)
}
