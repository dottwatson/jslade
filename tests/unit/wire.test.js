import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createWireBus, createWireHandle, publicWireBus } from '../../src/jslade/lib/wire.js'

function trackedCaller() {
    const caller = {
        offs: [],
        _trackWire(off) {
            this.offs.push(off)
        },
    }
    return caller
}

describe('WireBus', () => {
    it('delivers send to subscribers', () => {
        const bus = createWireBus()
        const received = []
        bus.subscribe('ping', (value) => received.push(value))
        bus.send('ping', { ok: true })
        assert.deepEqual(received, [{ ok: true }])
    })

    it('stores the last send for get()', () => {
        const bus = createWireBus()
        assert.equal(bus.get('theme'), undefined)
        bus.send('theme', 'dark')
        assert.equal(bus.get('theme'), 'dark')
        bus.send('theme', 'light')
        assert.equal(bus.get('theme'), 'light')
    })

    it('get fallback is used only when the channel was never sent or was cleared', () => {
        const bus = createWireBus()
        assert.equal(bus.get('theme', 'dark'), 'dark')
        bus.send('theme', 'light')
        assert.equal(bus.get('theme', 'dark'), 'light')
        bus.send('theme', null)
        assert.equal(bus.get('theme', 'dark'), null)
        bus.forget('theme')
        assert.equal(bus.get('theme', 'dark'), 'dark')
    })

    it('never sent and unknown name are the same empty', () => {
        const bus = createWireBus()
        assert.equal(bus.get('no-such-channel'), undefined)
        assert.equal(bus.get('no-such-channel', 0), 0)
    })

    it('replays last send to a late subscriber, not the empty channel', () => {
        const bus = createWireBus()
        const before = []
        bus.subscribe('theme', (v) => before.push(v))
        assert.deepEqual(before, [])
        bus.send('theme', 'dark')
        const late = []
        bus.subscribe('theme', (v) => late.push(v))
        assert.deepEqual(late, ['dark'])
    })

    it('forget clears the last value and does not notify', () => {
        const bus = createWireBus()
        const received = []
        bus.subscribe('theme', (v) => received.push(v))
        bus.send('theme', 'dark')
        received.length = 0
        bus.forget('theme')
        assert.deepEqual(received, [])
        assert.equal(bus.get('theme'), undefined)
        const late = []
        bus.subscribe('theme', (v) => late.push(v))
        assert.deepEqual(late, [])
    })

    it('unsubscribe stops delivery but keeps the last value', () => {
        const bus = createWireBus()
        const received = []
        const off = bus.subscribe('off', (v) => received.push(v))
        bus.send('off', 1)
        off()
        bus.send('off', 2)
        assert.deepEqual(received, [1])
        assert.equal(bus.get('off'), 2)
    })

    it('clear drops the whole bus', () => {
        const bus = createWireBus()
        const received = []
        bus.send('theme', 'dark')
        bus.subscribe('theme', (v) => received.push(v))
        bus.clear()
        assert.equal(bus.get('theme'), undefined)
        received.length = 0
        bus.send('theme', 'x')
        assert.deepEqual(received, [])
        assert.equal(bus.get('theme'), 'x')
    })
})

describe('wire handles', () => {
    it('createWireHandle send/receive/get/clear', () => {
        const bus = createWireBus()
        const owner = trackedCaller()
        const handle = createWireHandle(bus, 'n', owner)
        const seen = []
        handle.receive((v) => seen.push(v))
        handle.send(1)
        assert.deepEqual(seen, [1])
        assert.equal(handle.get(), 1)
        assert.equal(handle.get(0), 1)
        handle.clear()
        assert.equal(handle.get(0), 0)
        assert.equal(owner.offs.length, 1)
        owner.offs[0]()
        seen.length = 0
        handle.send(2)
        assert.deepEqual(seen, [])
        assert.equal(handle.get(), 2)
    })

    it('two buses with the same name do not mix', () => {
        const parentA = createWireBus({ local: true })
        const parentB = createWireBus({ local: true })
        const fromA = []
        const fromB = []
        parentA.subscribe('ping', (v) => fromA.push(v))
        parentB.subscribe('ping', (v) => fromB.push(v))
        parentA.send('ping', 'a')
        assert.deepEqual(fromA, ['a'])
        assert.deepEqual(fromB, [])
    })
})

describe('publicWireBus isolation from unit names', () => {
    it('still delivers on the shared public bus', () => {
        const received = []
        const off = publicWireBus.subscribe('unit/public-ping', (v) => received.push(v))
        publicWireBus.send('unit/public-ping', true)
        assert.deepEqual(received, [true])
        off()
    })
})
