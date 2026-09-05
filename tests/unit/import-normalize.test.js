import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createAutostart } from '../../src/jslade/lifecycle/autostart.js'

function createMockJslade() {
    return {
        compiledComponents: {},
        _sourceComponents: {},
        _extractTemplateDefFromSource(source) {
            const match = source.match(/<noembed\s+name="([^"]+)"/)
            if (!match) return null
            return {
                script: '',
                markup: '<p>ok</p>',
                scopedStyles: '',
                scopeTargets: false,
            }
        },
        compile(name, def) {
            this.compiledComponents[name] = { ...def, name }
        },
        renderTo() {
            return null
        },
        scanDOM() {},
        dev: false,
        wireDebug: false,
    }
}

describe('importTemplates normalization', () => {
    it('normalizes slashes in import keys', () => {
        const Jslade = createMockJslade()
        const { importTemplates } = createAutostart(Jslade)
        const raw = '<noembed name="cart/item"><template><p></p></template></noembed>'

        const added = importTemplates({ '/cart\\item/': raw })
        assert.deepEqual(added, ['cart/item'])
        assert.ok(Jslade._sourceComponents['cart/item'])
    })

    it('is idempotent — first registration wins', () => {
        const Jslade = createMockJslade()
        const { importTemplates } = createAutostart(Jslade)
        const a = '<noembed name="a"><template><p>a</p></template></noembed>'
        const b = '<noembed name="a"><template><p>b</p></template></noembed>'

        importTemplates({ a: a })
        const second = importTemplates({ a: b })
        assert.deepEqual(second, [])
    })
})
