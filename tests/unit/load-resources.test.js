import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createLoadResources } from '../../src/jslade/lib/load-resources.js'
import { Jslade } from '../../src/jslade/index.js'

function fire(el, type) {
    const list = (el._on && el._on[type]) || []
    for (let i = 0; i < list.length; i++) list[i]()
}

function createHarness(options) {
    const opts = options || {}
    const inserted = []
    const win = opts.window || Object.create(null)
    if (!win.location) win.location = { href: 'https://example.test/page' }

    function createEl(tag) {
        const el = {
            tagName: String(tag).toUpperCase(),
            _attrs: {},
            _on: { load: [], error: [] },
            async: false,
            sheet: null,
            parentNode: null,
            readyState: '',
            setAttribute(name, value) {
                this._attrs[name] = String(value)
                if (name === 'src') this.src = String(value)
                if (name === 'href') this.href = String(value)
                if (name === 'rel') this.rel = String(value)
                if (name === 'type') this.type = String(value)
            },
            getAttribute(name) {
                return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null
            },
            addEventListener(type, fn) {
                ;(this._on[type] || (this._on[type] = [])).push(fn)
            },
            remove() {
                const index = inserted.indexOf(this)
                if (index !== -1) inserted.splice(index, 1)
                this.parentNode = null
            },
        }
        return el
    }

    const head = {
        appendChild(el) {
            inserted.push(el)
            el.parentNode = head
            if (typeof opts.onInsert === 'function') opts.onInsert(el, inserted)
            return el
        },
        removeChild(el) {
            const index = inserted.indexOf(el)
            if (index !== -1) inserted.splice(index, 1)
            el.parentNode = null
            return el
        },
    }

    const doc = {
        head,
        createElement: createEl,
        querySelector() {
            return null
        },
        querySelectorAll(selector) {
            const sel = String(selector)
            if (sel.indexOf('link') === 0) return inserted.filter((el) => el.tagName === 'LINK')
            if (sel.indexOf('script') === 0) return inserted.filter((el) => el.tagName === 'SCRIPT')
            return []
        },
    }

    return { document: doc, window: win, inserted, fire }
}

describe('Jslade.loadResources', () => {
    it('is on the public API', () => {
        assert.equal(typeof Jslade.loadResources, 'function')
    })
})

describe('loadResources', () => {
    let importCalls

    beforeEach(() => {
        importCalls = []
    })

    function makeLoader(harness, extra) {
        const extras = extra || {}
        return createLoadResources({
            document: harness.document,
            window: harness.window,
            importModule:
                extras.importModule ||
                function (url) {
                    importCalls.push(url)
                    return Promise.resolve({ url, default: true })
                },
            cache: extras.cache,
        })
    }

    it('dedups parallel calls with the same src — one network insert', async () => {
        const harness = createHarness()
        const loader = makeLoader(harness)
        const entry = { type: 'script', src: '/lib.js', global: 'Lib' }

        const first = loader.loadResources(entry)
        const second = loader.loadResources([entry])
        await Promise.resolve()
        assert.equal(harness.inserted.length, 1)

        harness.window.Lib = { v: 1 }
        fire(harness.inserted[0], 'load')

        const [a, b] = await Promise.all([first, second])
        assert.equal(harness.inserted.length, 1)
        assert.equal(a.global.Lib, harness.window.Lib)
        assert.equal(b.global.Lib, harness.window.Lib)
    })

    it('skips the network when test() returns true', async () => {
        const harness = createHarness()
        const loader = makeLoader(harness)
        harness.window.Ready = { ok: true }

        const result = await loader.loadResources({
            type: 'script',
            src: '/already.js',
            global: 'Ready',
            test: () => true,
        })

        assert.equal(harness.inserted.length, 0)
        assert.equal(result.global.Ready, harness.window.Ready)
    })

    it('loads styles before scripts when listed in that order', async () => {
        const order = []
        const harness = createHarness({
            onInsert(el) {
                order.push(el.tagName)
                queueMicrotask(() => {
                    if (el.tagName === 'LINK') el.sheet = {}
                    if (el.tagName === 'SCRIPT') harness.window.Lib = {}
                    fire(el, 'load')
                })
            },
        })
        const loader = makeLoader(harness)

        await loader.loadResources([
            { type: 'style', src: '/a.css' },
            { type: 'script', src: '/a.js', global: 'Lib' },
        ])

        assert.deepEqual(order, ['LINK', 'SCRIPT'])
    })

    it('rejects when global is missing after a script load', async () => {
        const harness = createHarness({
            onInsert(el) {
                queueMicrotask(() => fire(el, 'load'))
            },
        })
        const loader = makeLoader(harness)

        await assert.rejects(
            () => loader.loadResources({ type: 'script', src: '/chart.js', global: 'Chart' }),
            /window\.Chart is not available/
        )
        assert.equal(harness.inserted.length, 1)
    })

    it('clears the cache on failure so a later call retries', async () => {
        let attempts = 0
        const harness = createHarness({
            onInsert(el) {
                queueMicrotask(() => {
                    attempts += 1
                    if (attempts === 1) {
                        fire(el, 'error')
                        return
                    }
                    harness.window.Lib = { retry: true }
                    fire(el, 'load')
                })
            },
        })
        const loader = makeLoader(harness)
        const entry = { type: 'script', src: '/flaky.js', global: 'Lib' }

        await assert.rejects(() => loader.loadResources(entry), /failed to load/)
        assert.equal(harness.inserted.length, 0)

        const result = await loader.loadResources(entry)
        assert.equal(attempts, 2)
        assert.equal(harness.inserted.length, 1)
        assert.equal(result.global.Lib.retry, true)
    })

    it('loads type module via dynamic import and returns the namespace', async () => {
        const ns = { hello: 'world' }
        const harness = createHarness()
        const loader = makeLoader(harness, {
            importModule(url) {
                importCalls.push(url)
                return Promise.resolve(ns)
            },
        })

        const result = await loader.loadResources({ type: 'module', src: '/widgets/map.js' })

        assert.equal(harness.inserted.length, 0)
        assert.equal(importCalls.length, 1)
        assert.equal(importCalls[0], 'https://example.test/widgets/map.js')
        assert.equal(result.entries[0].module, ns)
        assert.deepEqual(result.global, {})
    })

    it('accepts a single object and wraps it as an array result', async () => {
        const live = createHarness({
            onInsert(el) {
                queueMicrotask(() => {
                    el.sheet = {}
                    fire(el, 'load')
                })
            },
        })
        const loader = makeLoader(live)
        const result = await loader.loadResources({ type: 'style', src: '/x.css' })
        assert.equal(result.entries.length, 1)
        assert.equal(result.entries[0].type, 'style')
        assert.equal(result.entries[0].src, '/x.css')
    })

    it('does not insert a duplicate when a matching tag is already in the DOM', async () => {
        const harness = createHarness()
        harness.window.Lib = { fromDom: true }
        const existing = harness.document.createElement('script')
        existing.setAttribute('src', '/lib.js')
        existing.src = 'https://example.test/lib.js'
        harness.inserted.push(existing)

        const loader = makeLoader(harness)
        await loader.loadResources({ type: 'script', src: '/lib.js', global: 'Lib' })
        assert.equal(harness.inserted.length, 1)
        assert.equal(harness.inserted[0], existing)
    })

    it('rejects invalid entries without touching the DOM', async () => {
        const harness = createHarness()
        const loader = makeLoader(harness)
        await assert.rejects(() => loader.loadResources({ type: 'font', src: '/x.woff' }), /invalid type/)
        await assert.rejects(() => loader.loadResources({ type: 'script' }), /missing src/)
        assert.equal(harness.inserted.length, 0)
    })
})
