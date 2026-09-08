import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createDirectiveRegistry } from '../../src/jslade/markup/directives.js'
import { compileMarkupToAst } from '../../src/jslade/markup/ast-compiler.js'
import { renderTemplateAst } from '../../src/jslade/ast/render-template.js'
import { escapeHtml } from '../../src/jslade/lib/html-utils.js'
import { EVENT_ATTRIBUTE_PREFIX, EVENT_DIRECTIVES } from '../../src/jslade/lib/constants.js'

describe('event directives', () => {
    for (const eventName of EVENT_DIRECTIVES) {
        it(`registers @${eventName}`, () => {
            const registry = createDirectiveRegistry()
            assert.ok(registry.has(eventName))
        })
    }

    it('compiles representative handlers to data-jsd-on attributes', () => {
        const registry = createDirectiveRegistry()
        const samples = [
            'click',
            'dragover',
            'touchstart',
            'pointermove',
            'keyup',
            'compositionend',
            'focusin',
        ]

        for (const eventName of samples) {
            const markup = `<button @${eventName}(this.onEvent(event))></button>`
            const ast = compileMarkupToAst(markup, registry, { templateName: `test/${eventName}` })
            assert.equal(ast.eventHandlers.length, 1)
            assert.equal(ast.eventHandlers[0].type, eventName)
            const html = renderTemplateAst(ast, {
                vars: {},
                locals: Object.create(null),
                escapeHtml,
                emitChild: () => '',
            })
            assert.match(html, new RegExp(`${EVENT_ATTRIBUTE_PREFIX}${eventName}="0"`))
        }
    })
})
