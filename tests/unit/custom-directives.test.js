import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Jslade } from '../../src/jslade/engine.js'

function compileAndRender(name, def, data = {}) {
    Jslade.compile(name, def)
    return Jslade.render(name, data)
}

const emptyDef = { scopedStyles: '', scopeTargets: false }

describe('inline custom directives', () => {
    it('@badge(expr) renders evaluated expression inside a span', () => {
        Jslade.directive('badge', function (ctx) {
            return ctx.inline`<span class="badge">${ctx.expr}</span>`
        })

        const html = compileAndRender('unit/badge', {
            ...emptyDef,
            script: 'props({ label: "active" })',
            markup: '<p>Status: @badge(label)</p>',
        })

        assert.match(html, /Status: <span class="badge">active<\/span>/)
    })

    it('@badge escapes HTML in output', () => {
        const html = compileAndRender('unit/badge-xss', {
            ...emptyDef,
            script: 'props({ label: "<b>x</b>" })',
            markup: '@badge(label)',
        })

        assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/)
    })
})

describe('Jslade.if() conditional directives', () => {
    it('includes block body when predicate is truthy', () => {
        Jslade.if('yes', function () {
            return true
        })

        const html = compileAndRender('unit/yes', {
            ...emptyDef,
            script: '',
            markup: '@yes<em>inside</em>@endyes',
        })

        assert.match(html, /<em>inside<\/em>/)
    })

    it('omits block body when predicate is falsy', () => {
        Jslade.if('no', function () {
            return false
        })

        const html = compileAndRender('unit/no', {
            ...emptyDef,
            script: '',
            markup: '@no<em>hidden</em>@endno',
        })

        assert.doesNotMatch(html, /hidden/)
    })

    it('@elseadmin(expr) passes expression to the same predicate', () => {
        Jslade.if('admin', function (value) {
            return value === 'editor'
        })

        const html = compileAndRender('unit/admin', {
            ...emptyDef,
            script: '',
            markup: "@admin<admin>@elseadmin('editor')<editor>@endadmin",
        })

        assert.match(html, /editor/)
        assert.doesNotMatch(html, /admin/)
    })
})

describe('block custom directives', () => {
    it('@panel wraps inner markup with ctx.wrap', () => {
        Jslade.directive('panel', { block: true }, function (ctx) {
            ctx.wrap('<div class="panel">', '</div>')
        })

        const html = compileAndRender('unit/panel', {
            ...emptyDef,
            script: '',
            markup: '@panel<h2>Title</h2>@endpanel',
        })

        assert.match(html, /<div class="panel"><h2>Title<\/h2><\/div>/)
    })

    it('@panel(expr) can emit dynamic opening markup via ctx.inline', () => {
        Jslade.directive('titled', { block: true }, function (ctx) {
            if (ctx.expr) {
                ctx.inline`<section class="titled"><h3>${ctx.expr}</h3>`
                ctx.wrap('', '</section>')
            } else {
                ctx.wrap('<section class="titled">', '</section>')
            }
        })

        const html = compileAndRender('unit/titled', {
            ...emptyDef,
            script: 'props({ heading: "Hello" })',
            markup: '@titled(heading)<p>body</p>@endtitled',
        })

        assert.match(html, /<section class="titled"><h3>Hello<\/h3><p>body<\/p><\/section>/)
    })
})
