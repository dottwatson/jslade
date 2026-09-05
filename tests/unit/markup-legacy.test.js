import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { compileMarkupSource } from '../../src/jslade/markup/compiler.js'
import { createDirectiveRegistry } from '../../src/jslade/markup/directives.js'

describe('compileMarkupSource (legacy string emitter)', () => {
    it('compiles escaped interpolation to a render function body', () => {
        const registry = createDirectiveRegistry()
        const result = compileMarkupSource('<p>{{ label }}</p>', registry, {
            templateName: 'legacy/interp',
            markup: '<p>{{ label }}</p>',
        })

        assert.ok(result.body.includes('escapeHtml'))
        assert.ok(result.body.includes('label'))
        assert.ok(result.body.includes('return _.join'))
    })

    it('compiles raw output and literal text chunks', () => {
        const registry = createDirectiveRegistry()
        const result = compileMarkupSource('Hi {!! html !!}', registry, {
            templateName: 'legacy/raw',
        })

        assert.ok(result.body.includes('Hi'))
        assert.ok(result.body.includes('html'))
    })

    it('reports unknown directives with template context', () => {
        const registry = createDirectiveRegistry()
        assert.throws(() => {
            compileMarkupSource('@unknown<x>@endunknown', registry, {
                templateName: 'legacy/bad',
                markup: '@unknown<x>@endunknown',
            })
        }, /Unknown directive @unknown/)
    })
})
