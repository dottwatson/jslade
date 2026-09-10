/**
 * Lazy JS/CSS loader. Same URL + type shares one Promise for the whole page.
 * Unmount does not remove injected tags — other instances may still need them.
 */

import { _devLog } from './dev-log.js'

const TYPES = { script: true, module: true, style: true }

function defaultImportModule(url) {
    // Variable import() is left intact by esbuild; the comment keeps webpack/vite from rewriting it.
    return import(/* webpackIgnore: true */ /* @vite-ignore */ url)
}

function resolveSrc(src, win) {
    const trimmed = String(src).trim()
    if (!trimmed) return trimmed
    try {
        const base = win && win.location && win.location.href
        if (base) return new URL(trimmed, base).href
    } catch (e) {
        /* keep trimmed */
    }
    return trimmed
}

function resourceError(message) {
    return new Error('[Jslade.loadResources] ' + message)
}

function applyAttrs(el, attrs) {
    if (!attrs || typeof attrs !== 'object') return
    const keys = Object.keys(attrs)
    for (let i = 0; i < keys.length; i++) {
        const name = keys[i]
        const value = attrs[name]
        if (value === false || value == null) {
            if (name in el) el[name] = false
            continue
        }
        if (value === true) {
            el.setAttribute(name, '')
            if (name in el && typeof el[name] === 'boolean') el[name] = true
            continue
        }
        el.setAttribute(name, String(value))
        if (name === 'crossOrigin' || name === 'crossorigin') el.crossOrigin = String(value)
    }
}

function normalizeList(input) {
    if (input == null) throw resourceError('expected an entry or an array of entries')
    const list = Array.isArray(input) ? input : [input]
    const out = []
    for (let i = 0; i < list.length; i++) {
        const entry = list[i]
        if (!entry || typeof entry !== 'object') {
            throw resourceError('entry[' + i + '] must be an object')
        }
        if (!TYPES[entry.type]) {
            throw resourceError('entry[' + i + '] has invalid type ' + JSON.stringify(entry.type))
        }
        if (entry.src == null || String(entry.src).trim() === '') {
            throw resourceError('entry[' + i + '] is missing src')
        }
        const normalized = {
            type: entry.type,
            src: String(entry.src).trim(),
        }
        if (entry.global != null && String(entry.global) !== '') {
            normalized.global = String(entry.global)
        }
        if (typeof entry.test === 'function') normalized.test = entry.test
        if (entry.attrs && typeof entry.attrs === 'object') normalized.attrs = entry.attrs
        if (typeof entry.timeout === 'number' && entry.timeout > 0) normalized.timeout = entry.timeout
        out.push(normalized)
    }
    return out
}

function attrOrProp(el, name) {
    const raw = typeof el.getAttribute === 'function' ? el.getAttribute(name) : null
    const prop = el[name]
    return { raw, prop: prop == null ? '' : String(prop) }
}

function urlsMatch(raw, prop, src, resolved) {
    if (raw === src || raw === resolved) return true
    if (prop && (prop === src || prop === resolved)) return true
    return false
}

function findExisting(doc, type, src, resolved) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return null
    if (type === 'style') {
        const links = doc.querySelectorAll('link')
        for (let i = 0; i < links.length; i++) {
            const el = links[i]
            const rel = (typeof el.getAttribute === 'function' ? el.getAttribute('rel') : el.rel) || ''
            if (String(rel).toLowerCase() !== 'stylesheet') continue
            const href = attrOrProp(el, 'href')
            if (urlsMatch(href.raw, href.prop, src, resolved)) return el
        }
        return null
    }
    const scripts = doc.querySelectorAll('script')
    for (let i = 0; i < scripts.length; i++) {
        const el = scripts[i]
        const scriptType = (typeof el.getAttribute === 'function' ? el.getAttribute('type') : el.type) || ''
        const isModule = String(scriptType).toLowerCase() === 'module'
        if (type === 'module' && !isModule) continue
        if (type === 'script' && isModule) continue
        const srcAttr = attrOrProp(el, 'src')
        if (urlsMatch(srcAttr.raw, srcAttr.prop, src, resolved)) return el
    }
    return null
}

function removeNode(el) {
    if (!el) return
    if (el.parentNode && typeof el.parentNode.removeChild === 'function') {
        el.parentNode.removeChild(el)
        return
    }
    if (typeof el.remove === 'function') el.remove()
}

function waitForElement(el, type, alreadyInDom) {
    if (type === 'style' && el.sheet) return Promise.resolve()
    const ready = el.readyState
    if (ready === 'complete' || ready === 'loaded') return Promise.resolve()

    return new Promise(function (resolve, reject) {
        let settled = false
        function done(err) {
            if (settled) return
            settled = true
            if (err) reject(err)
            else resolve()
        }
        if (typeof el.addEventListener === 'function') {
            el.addEventListener('load', function () {
                done()
            })
            el.addEventListener('error', function () {
                done(resourceError('failed to load ' + (el.src || el.href || '')))
            })
        }
        if (type === 'style' && el.sheet) {
            done()
            return
        }
        if (ready === 'complete' || ready === 'loaded') {
            done()
            return
        }
        // A tag we did not insert has usually already fired `load`.
        if (alreadyInDom && (type === 'script' || type === 'module')) {
            queueMicrotask(function () {
                if (!settled) done()
            })
        }
    })
}

function withTimeout(promise, ms, src) {
    if (!ms) return promise
    let timer
    const timeout = new Promise(function (_, reject) {
        timer = setTimeout(function () {
            reject(resourceError('timed out after ' + ms + 'ms: ' + src))
        }, ms)
    })
    return Promise.race([promise, timeout]).then(
        function (value) {
            clearTimeout(timer)
            return value
        },
        function (err) {
            clearTimeout(timer)
            throw err
        }
    )
}

function readGlobal(win, name) {
    if (!win || name == null) return undefined
    return win[name]
}

function assertGlobal(win, entry, src) {
    if (!entry.global) return
    if (readGlobal(win, entry.global) == null) {
        throw resourceError('window.' + entry.global + ' is not available after loading ' + src)
    }
}

function resultOf(entry, moduleNs) {
    const result = { type: entry.type, src: entry.src }
    if (entry.global) result.global = entry.global
    if (entry.type === 'module') result.module = moduleNs
    return result
}

function logDev(kind, type, src) {
    if (!_devLog.enabled) return
    console.log('[Jslade.loadResources] ' + kind + ' ' + type + ' ' + src)
}

/**
 * @param {object} [options]
 * @param {Document} [options.document]
 * @param {Window} [options.window]
 * @param {function(string): Promise<*>} [options.importModule]
 * @param {Map} [options.cache]
 */
export function createLoadResources(options) {
    const opts = options || {}
    const cache = opts.cache || new Map()
    const importModule = opts.importModule || defaultImportModule

    function getDocument() {
        if (opts.document) return opts.document
        return typeof document !== 'undefined' ? document : null
    }

    function getWindow() {
        if (opts.window) return opts.window
        if (typeof window !== 'undefined') return window
        return typeof globalThis !== 'undefined' ? globalThis : null
    }

    function targetParent(doc) {
        return doc.head || doc.documentElement || doc.body || null
    }

    function insertAndWait(doc, entry, resolved) {
        const type = entry.type
        let el

        if (type === 'style') {
            el = doc.createElement('link')
            el.rel = 'stylesheet'
            el.href = resolved
            applyAttrs(el, entry.attrs)
        } else {
            el = doc.createElement('script')
            el.src = resolved
            el.async = true
            applyAttrs(el, entry.attrs)
        }

        const parent = targetParent(doc)
        if (!parent || typeof parent.appendChild !== 'function') {
            return Promise.reject(resourceError('document.head is not available'))
        }
        parent.appendChild(el)

        return waitForElement(el, type === 'style' ? 'style' : 'script', false).catch(function (err) {
            removeNode(el)
            throw err
        })
    }

    function loadFromNetwork(entry, resolved) {
        if (entry.type === 'module') {
            return Promise.resolve()
                .then(function () {
                    return importModule(resolved)
                })
                .then(function (ns) {
                    return resultOf(entry, ns)
                })
        }

        const doc = getDocument()
        if (!doc) return Promise.reject(resourceError('document is not available'))

        const existing = findExisting(doc, entry.type, entry.src, resolved)
        if (existing) {
            logDev('dom hit', entry.type, resolved)
            return waitForElement(existing, entry.type, true).then(function () {
                return resultOf(entry)
            })
        }

        logDev('network', entry.type, resolved)
        return insertAndWait(doc, entry, resolved).then(function () {
            return resultOf(entry)
        })
    }

    function loadOne(entry) {
        const win = getWindow()
        const resolved = resolveSrc(entry.src, win)
        const cacheKey = entry.type + '\0' + resolved

        if (typeof entry.test === 'function' && entry.test()) {
            logDev('test skip', entry.type, resolved)
            try {
                assertGlobal(win, entry, entry.src)
            } catch (err) {
                return Promise.reject(err)
            }
            const skipped = resultOf(entry)
            if (!cache.has(cacheKey)) cache.set(cacheKey, Promise.resolve(skipped))
            return Promise.resolve(skipped)
        }

        if (cache.has(cacheKey)) {
            logDev('cache hit', entry.type, resolved)
            return cache.get(cacheKey).then(function (cached) {
                assertGlobal(win, entry, entry.src)
                return cached.type ? cached : resultOf(entry, cached && cached.module)
            })
        }

        const pending = withTimeout(loadFromNetwork(entry, resolved), entry.timeout, entry.src)
            .then(function (loaded) {
                assertGlobal(win, entry, entry.src)
                return loaded
            })
            .catch(function (err) {
                cache.delete(cacheKey)
                throw err
            })

        cache.set(cacheKey, pending)
        return pending
    }

    function loadResources(input) {
        let list
        try {
            list = normalizeList(input)
        } catch (err) {
            return Promise.reject(err)
        }

        const entries = []
        const globalMap = {}

        return list
            .reduce(function (prev, entry) {
                return prev.then(function () {
                    return loadOne(entry).then(function (item) {
                        entries.push(item)
                        if (item.global) globalMap[item.global] = readGlobal(getWindow(), item.global)
                    })
                })
            }, Promise.resolve())
            .then(function () {
                return { entries: entries, global: globalMap }
            })
    }

    return {
        loadResources,
        reset: function () {
            cache.clear()
        },
        cache,
    }
}

const defaultLoader = createLoadResources()

export function loadResources(entries) {
    return defaultLoader.loadResources(entries)
}

export function resetLoadResourcesCache() {
    defaultLoader.reset()
}
