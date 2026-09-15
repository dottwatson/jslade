import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    capBuffer,
    DEBUG_MAX_LOG,
    groupByChannel,
    loadPersistedState,
    persistStorageKey,
    serializePersistedState,
    subscribersForChannel,
    wireScopeLabel,
} from '../../debugger/debug-lib.js'

describe('debug-lib', () => {
    it('capBuffer evicts oldest entries at max', () => {
        const list = []
        for (let i = 0; i < DEBUG_MAX_LOG + 5; i++) capBuffer(list, i)
        assert.equal(list.length, DEBUG_MAX_LOG)
        assert.equal(list[0], 5)
        assert.equal(list[list.length - 1], DEBUG_MAX_LOG + 4)
    })

    it('persistStorageKey sanitizes pathname', () => {
        assert.equal(persistStorageKey('/foo/bar.html'), 'jslade_debug__foo_bar_html')
    })

    it('loadPersistedState merges valid JSON and clamps height', () => {
        const raw = JSON.stringify({
            isOpen: true,
            activeTab: 'wirebus',
            expandedChannels: { ping: true },
            panelHeight: 99,
        })
        const out = loadPersistedState(raw, { isOpen: false, activeTab: 'components', panelHeight: 45 })
        assert.equal(out.isOpen, true)
        assert.equal(out.activeTab, 'wirebus')
        assert.deepEqual(out.expandedChannels, { ping: true })
        assert.equal(out.panelHeight, 45)
    })

    it('loadPersistedState returns defaults on invalid JSON', () => {
        const out = loadPersistedState('{bad', { isOpen: false, activeTab: 'components' })
        assert.equal(out.isOpen, false)
        assert.equal(out.activeTab, 'components')
    })

    it('serializePersistedState picks persisted fields only', () => {
        const out = serializePersistedState({
            isOpen: true,
            activeTab: 'resources',
            expandedChannels: { a: 1 },
            panelHeight: 30,
            _dragY: 10,
        })
        assert.deepEqual(out, {
            isOpen: true,
            activeTab: 'resources',
            expandedChannels: { a: 1 },
            panelHeight: 30,
        })
    })

    it('wireScopeLabel distinguishes public and local bus', () => {
        assert.equal(wireScopeLabel(false), 'wire')
        assert.equal(wireScopeLabel(true), 'localWire')
    })

    it('groupByChannel groups message log', () => {
        const groups = groupByChannel([
            { channel: 'b', payload: 1 },
            { channel: 'a', payload: 2 },
            { channel: 'b', payload: 3 },
        ])
        assert.deepEqual(Object.keys(groups).sort(), ['a', 'b'])
        assert.equal(groups.b.length, 2)
    })

    it('subscribersForChannel dedupes by instance and scope', () => {
        const subs = subscribersForChannel(
            [
                { channel: 'theme', local: false, instanceId: 1, template: 'a' },
                { channel: 'theme', local: false, instanceId: 1, template: 'a' },
                { channel: 'theme', local: true, instanceId: 1, template: 'a' },
                { channel: 'theme', local: false, instanceId: 2, template: 'b' },
            ],
            'theme'
        )
        assert.equal(subs.length, 3)
    })
})
