import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { WireBus } from '../../src/jslade/lib/wire.js'

describe('WireBus', () => {
    it('delivers publish to subscribers', () => {
        const received = []
        WireBus.subscribe('test/ping', (value) => received.push(value))
        WireBus.publish('test/ping', { ok: true })
        assert.deepEqual(received, [{ ok: true }])
    })

    it('replays sendState to new subscribers', () => {
        WireBus.publishState('test/theme', 'dark')
        const values = []
        WireBus.subscribe('test/theme', (v) => values.push(v))
        assert.deepEqual(values, ['dark'])
    })

    it('unsubscribe stops delivery', () => {
        const received = []
        const off = WireBus.subscribe('test/off', (v) => received.push(v))
        off()
        WireBus.publish('test/off', 1)
        assert.deepEqual(received, [])
    })
})
