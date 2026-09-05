import { emitHook } from './hooks.js'

export const WireBus = {
    _channels: {},
    _stateChannels: new Set(),
    _last: {},
    _debug: false,

    _publish(channel, value, isState) {
        if (isState) this._last[channel] = value
        if (this._debug) {
            console.log(
                '%c[WireBus] %c' + channel + ' %c→',
                'color:#888',
                'font-weight:bold;color:#0d6efd',
                'color:#888',
                value
            )
        }
        emitHook('message', { channel, value, isState, time: Date.now() })
        const subs = this._channels[channel]
        if (!subs) return
        subs.slice().forEach(function (fn) {
            fn(value)
        })
    },

    publish(channel, value) {
        this._publish(channel, value, this._stateChannels.has(channel))
    },

    publishState(channel, value) {
        this._stateChannels.add(channel)
        this._publish(channel, value, true)
    },

    subscribe(channel, fn) {
        if (this._debug) {
            console.log(
                '%c[WireBus] %csubscribe %c' + channel,
                'color:#888',
                'color:#198754',
                'font-weight:bold;color:#0d6efd'
            )
        }
        ;(this._channels[channel] = this._channels[channel] || []).push(fn)
        emitHook('subscribe', { channel, time: Date.now() })

        if (this._stateChannels.has(channel) && channel in this._last) {
            fn(this._last[channel])
        }

        const bus = this
        return function unsubscribe() {
            const subs = bus._channels[channel]
            if (!subs) return
            const index = subs.indexOf(fn)
            if (index !== -1) subs.splice(index, 1)
            if (subs.length === 0 && !bus._stateChannels.has(channel)) {
                delete bus._channels[channel]
                delete bus._last[channel]
            }
        }
    },
}
