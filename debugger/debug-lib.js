/** Pure helpers shared by jslade-debug.js and unit tests. */

export const DEBUG_MAX_LOG = 200

export function capBuffer(list, item, max = DEBUG_MAX_LOG) {
    list.push(item)
    while (list.length > max) list.shift()
    return list
}

export function persistStorageKey(pathname) {
    return 'jslade_debug_' + String(pathname || '/').replace(/[^a-zA-Z0-9]/g, '_')
}

export function loadPersistedState(raw, defaults) {
    const base = defaults || {}
    if (!raw) return { ...base }
    try {
        const s = JSON.parse(raw)
        const out = { ...base }
        if (typeof s.isOpen === 'boolean') out.isOpen = s.isOpen
        if (s.activeTab) out.activeTab = s.activeTab
        if (s.expandedChannels && typeof s.expandedChannels === 'object') {
            out.expandedChannels = { ...s.expandedChannels }
        }
        if (typeof s.panelHeight === 'number' && s.panelHeight >= 15 && s.panelHeight <= 80) {
            out.panelHeight = s.panelHeight
        }
        return out
    } catch (e) {
        return { ...base }
    }
}

export function serializePersistedState(uiState) {
    return {
        isOpen: uiState.isOpen,
        activeTab: uiState.activeTab,
        expandedChannels: uiState.expandedChannels,
        panelHeight: uiState.panelHeight,
    }
}

export function wireScopeLabel(local) {
    return local ? 'localWire' : 'wire'
}

export function groupByChannel(log) {
    const groups = {}
    for (let i = 0; i < log.length; i++) {
        const e = log[i]
        ;(groups[e.channel] = groups[e.channel] || []).push(e)
    }
    return groups
}

export function subscribersForChannel(subscribeLog, channel) {
    const out = []
    const seen = new Set()
    for (let i = 0; i < subscribeLog.length; i++) {
        const s = subscribeLog[i]
        if (s.channel !== channel) continue
        const key = (s.instanceId != null ? s.instanceId : 'anon') + ':' + (s.local ? 'L' : 'P')
        if (seen.has(key)) continue
        seen.add(key)
        out.push(s)
    }
    return out
}
