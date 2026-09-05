import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createDirectiveRegistry } from '../../src/jslade/markup/directives.js'
import { compileMarkupToAst } from '../../src/jslade/markup/ast-compiler.js'
import { renderTemplateAst } from '../../src/jslade/ast/render-template.js'
import { escapeHtml } from '../../src/jslade/lib/html-utils.js'
import { EVENT_ATTRIBUTE_PREFIX } from '../../src/jslade/lib/constants.js'

function renderMarkup(markup, scopeVars = {}) {
    const registry = createDirectiveRegistry()
    const ast = compileMarkupToAst(markup, registry, { templateName: 'test/tpl' })
    return renderTemplateAst(ast, {
        vars: scopeVars,
        locals: Object.create(null),
        escapeHtml,
        emitChild: () => '',
    })
}

describe('markup compile + render', () => {
    it('interpolates escaped output', () => {
        const html = renderMarkup('<p>{{ label }}</p>', { label: '<b>x</b>' })
        assert.equal(html, '<p>&lt;b&gt;x&lt;/b&gt;</p>')
    })

    it('renders raw output with {!! !!}', () => {
        const html = renderMarkup('<p>{!! html !!}</p>', { html: '<em>ok</em>' })
        assert.equal(html, '<p><em>ok</em></p>')
    })

    it('handles @if / @else', () => {
        const tpl = '@if(show)<yes>@else<no>@endif'
        assert.equal(renderMarkup(tpl, { show: true }), '<yes>')
        assert.equal(renderMarkup(tpl, { show: false }), '<no>')
    })

    it('handles @foreach with $loop metadata', () => {
        const tpl = '@foreach(items as item){{ item }}-{{ $loop.index }}@endforeach'
        const html = renderMarkup(tpl, { items: ['a', 'b'] })
        assert.equal(html, 'a-0b-1')
    })

    it('compiles @click to data-jsd-on attribute in HTML output path', () => {
        const registry = createDirectiveRegistry()
        const markup = '<button @click(this.save())>Go</button>'
        const ast = compileMarkupToAst(markup, registry, { templateName: 'test/click' })
        assert.ok(ast.eventHandlers.length > 0)
        assert.equal(ast.eventHandlers[0].type, 'click')
        const html = renderTemplateAst(ast, {
            vars: {},
            locals: Object.create(null),
            escapeHtml,
            emitChild: () => '',
        })
        assert.match(html, new RegExp(`${EVENT_ATTRIBUTE_PREFIX}click=`))
    })

    it('preserves literal @@ in text', () => {
        const html = renderMarkup('<p>@@click</p>')
        assert.equal(html, '<p>@click</p>')
    })
})
