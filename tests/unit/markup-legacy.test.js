import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { compileMarkupSource } from '../../src/jslade/markup/compiler.js'
import { createDirectiveRegistry } from '../../src/jslade/markup/directives.js'
import { escapeHtml } from '../../src/jslade/lib/html-utils.js'

function renderLegacy(markup, vars = {}) {
    const registry = createDirectiveRegistry()
    const result = compileMarkupSource(markup, registry, {
        templateName: 'legacy/run',
        markup,
    })
    const keys = Object.keys(vars)
    const fn = new Function('escapeHtml', 'Jslade', '__self', ...keys, result.body)
    return fn(escapeHtml, {}, { state: vars }, ...Object.values(vars))
}

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

    it('renders @if / @else via handlerFn string emit path', () => {
        const tpl = '@if(show)<yes>@else<no>@endif'
        assert.equal(renderLegacy(tpl, { show: true }), '<yes>')
        assert.equal(renderLegacy(tpl, { show: false }), '<no>')
    })

    it('renders @foreach with $loop metadata', () => {
        const tpl = '@foreach(items as item){{ item }}-{{ $loop.index }}@endforeach'
        assert.equal(renderLegacy(tpl, { items: ['a', 'b'] }), 'a-0b-1')
    })

    it('supports inline custom directives on the legacy path', () => {
        const registry = createDirectiveRegistry()
        registry.register('badge', function (ctx) {
            return ctx.inline`<span class="badge">${ctx.expr}</span>`
        })

        const result = compileMarkupSource('@badge(label)', registry, {
            templateName: 'legacy/badge',
            markup: '@badge(label)',
        })
        const fn = new Function('escapeHtml', 'Jslade', '__self', 'label', result.body)
        const html = fn(escapeHtml, {}, { state: { label: 'ok' } }, 'ok')
        assert.match(html, /<span class="badge">ok<\/span>/)
    })
})
