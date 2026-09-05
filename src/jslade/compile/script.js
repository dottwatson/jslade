import { INSTANCE_RESERVED_NAMES, LIFECYCLE_HOOKS } from '../lib/constants.js'
import { _devLog } from '../lib/dev-log.js'
import { evaluateObjectLiteral, extractBalancedBraceBlock, extractHookFunction } from '../lib/js-scan.js'
import { formatModuleError } from '../lib/instance-registry.js'
import { parseStatementList, parseParams } from '../ast/parse-expr.js'
import { findBlockEnd } from '../lib/js-scan.js'

const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/

function indexInScript(scriptSource, fragment) {
    if (!fragment) return 0
    const idx = scriptSource.indexOf(fragment)
    return idx === -1 ? 0 : idx
}

export function parseTemplateScript(scriptSource, templateName, sourceLines) {
    const useBindings = {}
    const propDefaults = {}
    let useObjectBody = null
    let propsObjectBody = null
    let remainingSource = scriptSource

    for (const declarationName of ['use', 'props']) {
        const block = extractBalancedBraceBlock(remainingSource, declarationName)
        if (!block) continue

        if (declarationName === 'use') useObjectBody = block.objectBody
        else propsObjectBody = block.objectBody

        try {
            const parsedValues = evaluateObjectLiteral(block.objectBody)
            if (declarationName === 'use') Object.assign(useBindings, parsedValues)
            else Object.assign(propDefaults, parsedValues)
        } catch (error) {
            const idx = indexInScript(scriptSource, block.sourceBlock) + block.sourceBlock.indexOf('{') + 1
            const msg = templateName
                ? formatModuleError(
                      templateName,
                      'script',
                      scriptSource,
                      idx,
                      `${declarationName}(): ${error.message}`,
                      sourceLines
                  )
                : `[Jslade] ${declarationName}() parse error: ${error.message}`
            _devLog.warn(msg)
        }

        remainingSource = remainingSource.replace(block.sourceBlock, '')
    }

    const hooks = { mount: null, updated: null, unmount: null }
    const hooksAst = { mount: null, updated: null, unmount: null }

    for (const declaredName of LIFECYCLE_HOOKS) {
        const block = extractHookFunction(remainingSource, declaredName)
        if (!block) continue

        try {
            if (!hooksAst[declaredName]) {
                hooksAst[declaredName] = parseStatementList(block.body)
                hooks[declaredName] = hooksAst[declaredName]
            }
        } catch (error) {
            const idx = indexInScript(scriptSource, block.sourceBlock)
            const msg = templateName
                ? formatModuleError(
                      templateName,
                      'script',
                      scriptSource,
                      idx,
                      `${declaredName}(): ${error.message}`,
                      sourceLines
                  )
                : `[Jslade] ${declaredName}() parse error: ${error.message}`
            _devLog.warn(msg)
        }
        remainingSource = remainingSource.replace(block.sourceBlock, '')
    }

    const methodsAst = {}
    remainingSource = remainingSource.trim()
    if (remainingSource) {
        const methodsOffset = scriptSource.length - remainingSource.length
        const functionPattern = /\bfunction\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/g
        let fnMatch
        while ((fnMatch = functionPattern.exec(remainingSource)) !== null) {
            const name = fnMatch[1]
            const braceStart = fnMatch.index + fnMatch[0].length - 1
            const closeIndex = findBlockEnd(remainingSource, braceStart)
            if (closeIndex === -1) continue
            const paramsSource = fnMatch[0].slice(fnMatch[0].indexOf('(') + 1, fnMatch[0].lastIndexOf(')'))
            try {
                const params = parseParams(paramsSource)
                const body = parseStatementList(remainingSource.slice(braceStart + 1, closeIndex))
                methodsAst[name] = { type: 'Function', name, params, body }
            } catch (error) {
                const msg = templateName
                    ? formatModuleError(
                          templateName,
                          'script',
                          scriptSource,
                          methodsOffset + fnMatch.index,
                          `${name}(): ${error.message}`,
                          sourceLines
                      )
                    : `[Jslade] ${name}() parse error: ${error.message}`
                _devLog.warn(msg)
            }
        }
    }

    warnOnUnusableNames(templateName, propDefaults, methodsAst)

    return {
        useBindings,
        useObjectBody,
        propsObjectBody,
        propDefaults,
        methods: methodsAst,
        methodsAst,
        hooks,
        hooksAst,
    }
}

function warnOnUnusableNames(templateName, propDefaults, methodsAst) {
    const label = templateName ? `"${templateName}": ` : ''

    for (const propName of Object.keys(propDefaults)) {
        if (!IDENTIFIER_PATTERN.test(propName)) {
            _devLog.warn(
                `[Jslade] ${label}prop "${propName}" is not a valid identifier — reachable only as this.state[${JSON.stringify(propName)}].`
            )
        } else if (INSTANCE_RESERVED_NAMES.includes(propName)) {
            _devLog.warn(
                `[Jslade] ${label}prop "${propName}" collides with the instance API — this.${propName} returns the instance member, read it as this.state.${propName}.`
            )
        }
    }

    for (const methodName of Object.keys(methodsAst)) {
        if (INSTANCE_RESERVED_NAMES.includes(methodName)) {
            _devLog.warn(`[Jslade] ${label}method "${methodName}" collides with the instance API.`)
        }
    }
}
