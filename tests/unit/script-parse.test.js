import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseTemplateScript } from '../../src/jslade/compile/script.js'

describe('parseTemplateScript', () => {
    it('extracts props defaults', () => {
        const result = parseTemplateScript(
            'props({ title: "Hello", count: 0 })\nfunction inc() { this.count++ }',
            'demo/x'
        )
        assert.equal(result.propDefaults.title, 'Hello')
        assert.equal(result.propDefaults.count, 0)
    })

    it('extracts use() bindings', () => {
        const result = parseTemplateScript('use({ fmt: window.fmt })', 'demo/x')
        assert.ok(result.useObjectBody.includes('fmt'))
    })

    it('registers function methods', () => {
        const result = parseTemplateScript(
            'props({ n: 0 })\nfunction bump() { this.n++ }',
            'demo/x'
        )
        assert.ok(result.methodsAst.bump)
    })

    it('registers lifecycle hooks', () => {
        const result = parseTemplateScript(
            'mount(function() {})\nupdated(function() {})\nunmount(function() {})',
            'demo/x'
        )
        assert.ok(result.hooksAst.mount)
        assert.ok(result.hooksAst.updated)
        assert.ok(result.hooksAst.unmount)
    })
})
