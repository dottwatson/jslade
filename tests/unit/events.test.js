import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { before, after, once, off, resetEvents } from '../../src/jslade/lib/events.js'
import { requestComponentSync } from '../../src/jslade/lib/component-pipeline.js'
import { hasComponent } from '../../src/jslade/lib/component-meta.js'

const SAMPLE = `<noembed name="demo/x">
<script></script>
<template><div>x</div></template>
</noembed>`

function createApi() {
    return {
        compiledComponents: {},
        _sourceComponents: {},
        compile(name, def) {
            this.compiledComponents[name] = { name, origin: def.origin || null, rawSource: def }
            delete this._sourceComponents[name]
        },
    }
}

describe('engine events', () => {
    beforeEach(() => resetEvents())

    it('before return false stops the phase', () => {
        before('compile', () => false)
        after('compile', () => assert.fail('after should not run'))

        const api = createApi()
        api._sourceComponents['demo/x'] = { origin: 'import' }
        assert.equal(requestComponentSync(api, 'demo/x', 'renderTo'), false)
        assert.equal(api.compiledComponents['demo/x'], undefined)
    })

    it('once runs a single after listener', () => {
        let count = 0
        once('mount', () => {
            count++
        })

        const api = createApi()
        api.compiledComponents['demo/x'] = { name: 'demo/x' }
        requestComponentSync(api, 'demo/x', 'render')
        requestComponentSync(api, 'demo/x', 'render')

        assert.equal(count, 0)
    })

    it('off removes listeners', () => {
        let hits = 0
        const fn = () => {
            hits++
        }
        before('component:request', fn)
        off('component:request', fn)

        const api = createApi()
        requestComponentSync(api, 'missing/y', 'child')
        assert.equal(hits, 0)
    })

    it('hasComponent covers registered and compiled names', () => {
        const api = createApi()
        assert.equal(hasComponent(api, 'demo/x'), false)
        api._sourceComponents['demo/x'] = { origin: 'import' }
        assert.equal(hasComponent(api, 'demo/x'), true)
        api.compile('demo/x', api._sourceComponents['demo/x'])
        assert.equal(hasComponent(api, 'demo/x'), true)
        assert.equal(hasComponent(api, '\\demo\\x\\'), true)
    })

    it('component:request reports origin from registered source', () => {
        let payload = null
        before('component:request', (ctx) => {
            payload = ctx
        })

        const api = createApi()
        api._sourceComponents['demo/x'] = { origin: 'import', sourceFile: 'components/demo/x.jsd' }
        requestComponentSync(api, 'demo/x', 'child')

        assert.equal(payload.state, 'registered')
        assert.equal(payload.origin, 'import')
        assert.equal(payload.sourceFile, 'components/demo/x.jsd')
        assert.equal(payload.via, 'child')
    })
})
