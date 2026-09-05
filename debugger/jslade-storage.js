/**
 * Jslade Storage — Tiny localStorage wrapper for Jslade.
 *
 * Features:
 *   - Auto-prefixed keys (jslade_*)
 *   - TTL (time-to-live) support
 *   - JSON serialization
 *   - In-memory fallback if localStorage unavailable
 *   - Cross-tab sync via storage event
 *   - Zero dependencies, ~1 KB
 *
 * Usage:
 *   JsladeStorage.set('debug_open', true)
 *   JsladeStorage.set('cache', data, 60000)  // expires in 1 min
 *   var val = JsladeStorage.get('debug_open', false)
 *   JsladeStorage.onChange('debug_open', fn)
 */

;(function () {
    var PREFIX = 'jslade_'
    var memoryStore = {} // fallback if localStorage throws

    function isAvailable() {
        try {
            var key = PREFIX + '__test'
            localStorage.setItem(key, '1')
            localStorage.removeItem(key)
            return true
        } catch (e) {
            return false
        }
    }

    function rawGet(key) {
        try {
            return localStorage.getItem(PREFIX + key)
        } catch (e) {
            return null
        }
    }

    function rawSet(key, val) {
        try {
            localStorage.setItem(PREFIX + key, val)
        } catch (e) {
            memoryStore[key] = val
        }
    }

    function rawRemove(key) {
        try {
            localStorage.removeItem(PREFIX + key)
        } catch (e) {
            delete memoryStore[key]
        }
    }

    var _available = isAvailable()

    window.JsladeStorage = {
        /** Set a value. Optional TTL in milliseconds. */
        set: function (key, value, ttlMs) {
            var wrapper = {
                v: value,
                t: ttlMs ? Date.now() + ttlMs : 0,
            }
            var serialized = JSON.stringify(wrapper)
            if (_available) {
                rawSet(key, serialized)
            } else {
                memoryStore[key] = wrapper
            }
        },

        /** Get a value. Returns defaultValue if not found or expired. */
        get: function (key, defaultValue) {
            var wrapper = null
            if (_available) {
                var raw = rawGet(key)
                if (raw) {
                    try {
                        wrapper = JSON.parse(raw)
                    } catch (e) {
                        return defaultValue
                    }
                }
            } else {
                wrapper = memoryStore[key]
            }

            if (!wrapper) return defaultValue

            // Check TTL expiration
            if (wrapper.t && wrapper.t < Date.now()) {
                this.remove(key)
                return defaultValue
            }

            return wrapper.v !== undefined ? wrapper.v : defaultValue
        },

        /** Check if a key exists and is not expired. */
        has: function (key) {
            return this.get(key, '__missing__') !== '__missing__'
        },

        /** Remove a key. */
        remove: function (key) {
            if (_available) {
                rawRemove(key)
            } else {
                delete memoryStore[key]
            }
        },

        /** Clear all Jslade keys, optionally filtered by prefix. */
        clear: function (subPrefix) {
            var filter = subPrefix || ''
            if (_available) {
                var keys = this.keys()
                for (var i = 0; i < keys.length; i++) {
                    if (!filter || keys[i].indexOf(filter) === 0) {
                        rawRemove(keys[i])
                    }
                }
            } else {
                memoryStore = {}
            }
        },

        /** Return all Jslade keys stored. */
        keys: function () {
            var result = []
            if (_available) {
                for (var i = 0; i < localStorage.length; i++) {
                    var k = localStorage.key(i)
                    if (k && k.indexOf(PREFIX) === 0) {
                        result.push(k.slice(PREFIX.length))
                    }
                }
            } else {
                result = Object.keys(memoryStore)
            }
            return result
        },

        /**
         * Listen for cross-tab changes to a specific key.
         * Callback receives { key, newValue, oldValue }.
         * Returns an unsubscribe function.
         */
        onChange: function (key, callback) {
            function handler(e) {
                if (!e.key) return
                var fullKey = PREFIX + key
                if (e.key === fullKey) {
                    var oldVal = null
                    var newVal = null
                    try {
                        oldVal = e.oldValue ? JSON.parse(e.oldValue).v : null
                    } catch (ex) {}
                    try {
                        newVal = e.newValue ? JSON.parse(e.newValue).v : null
                    } catch (ex) {}
                    callback({ key: key, newValue: newVal, oldValue: oldVal })
                }
            }
            window.addEventListener('storage', handler)
            return function () {
                window.removeEventListener('storage', handler)
            }
        },
    }
})()
