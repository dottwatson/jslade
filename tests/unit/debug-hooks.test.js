import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { hooks } from '../../src/jslade/lib/hooks.js'
import { createWireBus, createWireHandle } from '../../src/jslade/lib/wire.js'
import { createLoadResources } from '../../src/jslade/lib/load-resources.js'

function resetHooks() {
    for (const key of Object.keys(hooks)) hooks[key].length = 0
}

describe('debug engine hooks', () => {
    beforeEach(resetHooks)

    it('message hook includes local flag for localWire bus', () => {
        const localBus = createWireBus({ local: true })
        const received = []
        hooks.message.push((payload) => received.push(payload))
        localBus.send('ping', { ok: true })
        assert.equal(received.length, 1)
        assert.equal(received[0].channel, 'ping')
        assert.equal(received[0].local, true)
    })

    it('subscribe hook includes caller instance', () => {
        const bus = createWireBus()
        const caller = { id: 7, template: 'demo/x', _trackWire() {} }
        const handle = createWireHandle(bus, 'theme', caller)
        const received = []
        hooks.subscribe.push((payload) => received.push(payload))
        handle.receive(() => {})
        assert.equal(received.length, 1)
        assert.equal(received[0].channel, 'theme')
        assert.equal(received[0].instance, caller)
    })

    it('resource hook fires on loadResources cache hit', async () => {
        const harness = createLoadResources({
            document: {
                head: { appendChild() {} },
                querySelectorAll() {
                    return []
                },
            },
            window: { location: { href: 'https://example.test/' } },
        })

        const entry = { type: 'script', src: '/a.js' }
        const resolved = 'https://example.test/a.js'
        const cacheKey = entry.type + '\0' + resolved
        harness.cache.set(cacheKey, Promise.resolve({ type: 'script', src: resolved }))

        const received = []
        hooks.resource.push((payload) => received.push(payload))

        await harness.loadResources(entry)

        assert.equal(received.length, 1)
        assert.equal(received[0].status, 'cache')
        assert.equal(received[0].type, 'script')
    })
})
