/**
 * Jslade public entry — consumed by the bundle script → assets/js/jslade.js
 */
export {
    Jslade,
    escapeHtml,
    createDirectiveRegistry,
    compileMarkupSource,
    parseDirectiveToken,
    readBalancedParentheses,
    parseForeachExpression,
} from './engine.js'
