/**
 * Mount pipeline: scan for definitions, compile on demand, mount <jslade> placeholders.
 */
import { _devLog } from '../lib/dev-log.js'
import { COMPONENT_DEF_TAG } from '../lib/constants.js'
import { parseObjectLiteral } from '../ast/parse-expr.js'
import { evalExpression } from '../ast/eval-expr.js'

const MOUNT_TAG = 'jslade'
const STYLE_ID = 'jslade-mount-style'

const hasDom = () => typeof document !== 'undefined'

function readProps(element) {
    const raw = element.getAttribute('props')
    if (!raw || !raw.trim()) return {}

    try {
        return JSON.parse(raw)
    } catch (_) {
        try {
            const trimmed = raw.trim()
            const node = trimmed.startsWith('{') ? parseObjectLiteral(trimmed) : parseObjectLiteral(`{${trimmed}}`)
            return evalExpression(node, { vars: Object.create(null) }) || {}
        } catch (error) {
            _devLog.error(
                `[Jslade] <${MOUNT_TAG} name="${element.getAttribute('name')}"> invalid props: ${error.message}`
            )
            return {}
        }
    }
}

function injectMountStyle() {
    if (!hasDom() || document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `${MOUNT_TAG}{display:contents}`
    document.head.appendChild(style)
}

export function createAutostart(Jslade) {
    function indexSourceComponent(name, def) {
        const normalized = String(name)
            .replace(/\\/g, '/')
            .replace(/^\/+|\/+$/g, '')
        if (!normalized) return false
        if (Jslade.compiledComponents[normalized] || Jslade._sourceComponents[normalized]) return false
        Jslade._sourceComponents[normalized] = def
        return true
    }

    function importTemplates(templates, options) {
        const imported = []
        if (!templates || typeof templates !== 'object') return imported

        const sources = (options && options.sources) || {}

        for (const name of Object.keys(templates)) {
            const normalized = String(name)
                .replace(/\\/g, '/')
                .replace(/^\/+|\/+$/g, '')
            if (!normalized) continue
            if (Jslade.compiledComponents[normalized] || Jslade._sourceComponents[normalized]) continue

            const value = templates[name]
            let def = null

            if (typeof value === 'string') {
                def = Jslade._extractTemplateDefFromSource(value)
                if (def) def.rawText = value.trim()
            } else if (value && typeof value === 'object') {
                def = { ...value }
            }
            if (!def) continue

            const sourceFile = sources[normalized] ?? sources[name]
            if (sourceFile) {
                def.sourceFile = sourceFile
                def.sourceLines = { ...(def.sourceLines || {}), sourceFile }
            }

            if (indexSourceComponent(normalized, def)) imported.push(normalized)
        }

        return imported
    }

    function loadDefinitions() {
        if (hasDom()) Jslade.scanDOM()
    }

    function ensureCompiled(name) {
        if (Jslade.compiledComponents[name]) return true
        const def = Jslade._sourceComponents[name]
        if (def) {
            Jslade.compile(name, def)
            if (Jslade.compiledComponents[name]) {
                delete Jslade._sourceComponents[name]
                removeDomTemplate(name)
                return true
            }
        }
        return false
    }

    function removeDomTemplate(name) {
        if (!hasDom()) return
        const el = document.querySelector(`${COMPONENT_DEF_TAG}[name="${name}"]`)
        if (el) el.remove()
    }

    function mountPlaceholders(root) {
        if (!hasDom()) return []

        const scope = root || document
        const mounted = []

        for (const element of scope.querySelectorAll(`${MOUNT_TAG}[name]`)) {
            if (element.component) continue

            const name = element.getAttribute('name')
            if (!ensureCompiled(name)) {
                _devLog.warn(`[Jslade] <${MOUNT_TAG} name="${name}"> skipped: component not loaded yet.`)
                continue
            }

            const instance = Jslade.renderTo(element, name, readProps(element))
            if (instance) mounted.push(instance)
        }

        return mounted
    }

    function start(options) {
        const opts = options || {}
        if (opts.dev === true) Jslade.dev = true
        if (opts.showChannels) Jslade.wireDebug = true

        loadDefinitions()

        if (opts.mount === false) return []
        injectMountStyle()
        return mountPlaceholders(opts.root)
    }

    return { start, mountPlaceholders, ensureCompiled, importTemplates }
}
