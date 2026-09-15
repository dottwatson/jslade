/**
 * One-time migration: split legacy flat docs into the book folder layout.
 * Run from package/: node scripts/migrate-docs.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docsDir = path.join(__dirname, '..', 'docs')

function read(name) {
    return fs.readFileSync(path.join(docsDir, name), 'utf8')
}

function write(rel, body) {
    const dest = path.join(docsDir, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, body)
    console.log('wrote', rel)
}

function extractSections(markdown, headingPrefix) {
    const re = new RegExp(`^${headingPrefix} .+$`, 'gm')
    const indices = []
    let m
    while ((m = re.exec(markdown)) !== null) indices.push(m.index)
    if (!indices.length) return {}
    const out = {}
    for (let i = 0; i < indices.length; i++) {
        const chunk = markdown.slice(indices[i], indices[i + 1])
        const title = chunk.match(new RegExp(`^${headingPrefix} (.+)$`, 'm'))[1].trim()
        out[title] = chunk.trim() + '\n'
    }
    return out
}

function stripFirstHeading(section, level) {
    return section.replace(new RegExp(`^#{${level}} .+\\n`), '').trimStart()
}

function relLink(fromFile, toFile, anchor) {
    const fromDir = path.dirname(fromFile)
    let rel = path.relative(fromDir, toFile).replace(/\\/g, '/')
    if (!rel.startsWith('.')) rel = './' + rel
    return anchor ? `${rel}${anchor}` : rel
}

const components = read('components.md')
const compH2 = extractSections(components, '##')

write(
    '01-mental-model/02-jsd-anatomy.md',
    `# The .jsd file\n\n${stripFirstHeading(compH2['File structure'] || '', 2)}\n`
)

const scriptParts = ['The script block', 'Reactive state']
    .filter((t) => compH2[t])
    .map((t) => stripFirstHeading(compH2[t], 2))
    .join('\n\n')
write('03-component/07-script-block.md', `# Script block\n\n${scriptParts}\n`)

write(
    '03-component/08-template-language.md',
    `# Template language\n\n${stripFirstHeading(compH2['Template syntax'] || '', 2)}\n`
)
write(
    '03-component/09-event-directives.md',
    `# Event directives\n\n${stripFirstHeading(compH2['Event directives'] || '', 2)}\n`
)
write(
    '03-component/10-scoped-css.md',
    `# Scoped CSS\n\n${stripFirstHeading(compH2['Scoped CSS'] || '', 2)}\n`
)
write(
    '03-component/11-javascript-subset.md',
    `# JavaScript subset\n\n${stripFirstHeading(compH2['JavaScript subset'] || '', 2)}\n`
)

const treeParts = ['Reference component: showcase board', 'Child components']
    .filter((t) => compH2[t])
    .map((t) => stripFirstHeading(compH2[t], 2))
    .join('\n\n')
write('04-composition/12-component-tree.md', `# Component tree\n\n${treeParts}\n`)

write(
    '04-composition/13-wire-localwire.md',
    `# Wire and localWire\n\n${stripFirstHeading(compH2['Wire — communication between components'] || '', 2)}\n`
)

const instanceParts = ['`render()` vs live instances', 'Instance API']
    .filter((t) => compH2[t])
    .map((t) => stripFirstHeading(compH2[t], 2))
    .join('\n\n')
write('04-composition/14-instance-api.md', `# Instance API\n\n${instanceParts}\n`)

write(
    '05-integration/15-registering-components.md',
    read('registering-components.md').replace(
        '[load-resources.md](./load-resources.md)',
        '[17-load-resources.md](../05-integration/17-load-resources.md)'
    )
)

write(
    '05-integration/17-load-resources.md',
    read('load-resources.md')
        .replace('[components.md](./components.md#external-libraries-loadresources)', '[07-script-block.md](../03-component/07-script-block.md)')
        .replace('[components.md](./components.md)', '[07-script-block.md](../03-component/07-script-block.md)')
)
write('06-extending/19-custom-directives.md', read('custom-directives.md'))
write('contributing/build.md', read('build.md'))

const gs = read('getting-started.md')
const gsH2 = extractSections(gs, '##')

write(
    '01-mental-model/03-boot-sequence.md',
    `# Boot sequence\n\n${[
        stripFirstHeading(gsH2['Boot sequence explained'] || '', 2),
        stripFirstHeading(gsH2['Loading the engine'] || '', 2),
        stripFirstHeading(gsH2['The `<jslade>` placeholder'] || '', 2),
        stripFirstHeading(gsH2['`Jslade.start()` options'] || '', 2),
        stripFirstHeading(gsH2['Verifying the setup'] || '', 2),
        stripFirstHeading(gsH2['One-shot HTML vs live components'] || '', 2),
    ].join('\n\n')}\n`
)

write(
    '02-first-hour/06-cart-tutorial.md',
    `# Tutorial: cart line item\n\n${[
        stripFirstHeading(gsH2['What you need before you start'] || '', 2),
        stripFirstHeading(gsH2['Complete example: a cart line item'] || '', 2),
    ].join('\n\n')}\n`
)

write(
    '08-troubleshooting/29-local-development.md',
    `# Local development\n\n${stripFirstHeading(gsH2['Local development'] || '', 2)}\n`
)

const pitfalls = compH2['Pitfalls and how to avoid them']
    ? stripFirstHeading(compH2['Pitfalls and how to avoid them'], 2)
    : ''
const mistakes = gsH2['Common first-time mistakes']
    ? stripFirstHeading(gsH2['Common first-time mistakes'], 2)
    : ''
write(
    '08-troubleshooting/28-common-errors-faq.md',
    `# Common errors and FAQ\n\n## Pitfalls\n\n${pitfalls}\n\n## First-time mistakes\n\n${mistakes}\n`
)

const debug = read('debug-readme.md')
const debugH2 = extractSections(debug, '##')

write(
    '07-debug-bar/20-why-the-debug-bar.md',
    `# Why the debug bar\n\n${debug.split('\n---\n')[0].replace(/^# .+\n\n?/, '').trim()}\n\n## Limitations\n\n${stripFirstHeading(debugH2['Limitations'] || '', 2)}\n`
)

write(
    '07-debug-bar/21-setup-and-workflow.md',
    `# Setup and workflow\n\n${[
        stripFirstHeading(debugH2['Quick start'] || '', 2),
        stripFirstHeading(debugH2['Layout'] || '', 2),
        stripFirstHeading(debugH2['Keyboard Shortcuts'] || '', 2),
        stripFirstHeading(debugH2['Persistence (localStorage)'] || '', 2),
    ].join('\n\n')}\n`
)

write(
    '07-debug-bar/22-components-tab.md',
    `# Components tab\n\n${stripFirstHeading(debugH2['Tabs Reference'] || '', 2).split('### 2. WireBus')[0].replace('### 1. Components\n\n', '')}\n`
)

const wirebusSection = (debugH2['Tabs Reference'] || '').match(
    /### 2\. WireBus[\s\S]*?(?=### 3\. Resources)/
)
write(
    '07-debug-bar/23-wirebus-tab.md',
    `# WireBus tab\n\n${wirebusSection ? wirebusSection[0].replace('### 2. WireBus\n\n', '').trim() : ''}\n`
)

const resPerf = (debugH2['Tabs Reference'] || '').match(
    /### 3\. Resources[\s\S]*?(?=## Keyboard Shortcuts)/
)
write(
    '07-debug-bar/24-resources-and-performance.md',
    `# Resources and Performance tabs\n\n${resPerf ? resPerf[0].replace(/^### 3\. Resources\n\n/, '').trim() : ''}\n`
)

const tmplDir = (debugH2['Tabs Reference'] || '').match(/### 5\. Templates[\s\S]*?(?=---)/)
write(
    '07-debug-bar/25-templates-and-directives.md',
    `# Templates and Directives tabs\n\n${[
        tmplDir ? tmplDir[0].replace('### 5. Templates\n\n', '').trim() : '',
        (debugH2['Tabs Reference'] || '').match(/### 6\. Directives[\s\S]*/)?.[0]?.replace('### 6. Directives\n\n', '').trim() || '',
    ].join('\n\n')}\n`
)

write(
    '07-debug-bar/26-programmatic-api.md',
    `# Programmatic API\n\n${stripFirstHeading(debugH2['Programmatic API'] || '', 2)}\n`
)

write(
    '07-debug-bar/27-architecture-and-customization.md',
    `# Architecture and customization\n\n${[
        stripFirstHeading(debugH2['Architecture'] || '', 2),
        stripFirstHeading(debugH2['CSS Custom Properties'] || '', 2),
        stripFirstHeading(debugH2['File Sizes'] || '', 2),
        stripFirstHeading(debugH2['Styling Isolation'] || '', 2),
    ].join('\n\n')}\n`
)

const legacy = [
    'getting-started.md',
    'components.md',
    'registering-components.md',
    'load-resources.md',
    'custom-directives.md',
    'debug-readme.md',
    'build.md',
]
for (const name of legacy) {
    const p = path.join(docsDir, name)
    if (fs.existsSync(p)) {
        fs.unlinkSync(p)
        console.log('removed legacy', name)
    }
}

write(
    'appendices/G-debug-bar-quick-reference.md',
    `# Debug bar quick reference\n\nCondensed reference. Full guide: [20-why-the-debug-bar.md](../07-debug-bar/20-why-the-debug-bar.md).\n\n${[
        stripFirstHeading(debugH2['Keyboard Shortcuts'] || '', 2),
        '## Tabs\n\n- **Components** — instance tree, state edit, highlight, destroy\n- **WireBus** — `send` traffic on `wire` / `localWire`\n- **Resources** — `loadResources` events\n- **Performance** — render timings, memory (Chrome)\n- **Templates** — compiled source\n- **Directives** — built-in + custom registry',
        stripFirstHeading(debugH2['Programmatic API'] || '', 2),
    ].join('\n\n')}\n`
)
