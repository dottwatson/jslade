/**
 * Copy package/docs/*.md into a cloned GitHub wiki repo and write Home.md.
 * Source of truth: docs/ in the main repository.
 *
 * Usage: node scripts/sync-wiki.mjs <path-to-wiki-clone>
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const docsDir = path.join(packageRoot, 'docs')

const PAGES = [
    {
        src: 'getting-started.md',
        wiki: 'Getting-started.md',
        link: 'Getting-started',
        blurb: 'Quick start, first component',
    },
    {
        src: 'components.md',
        wiki: 'Components.md',
        link: 'Components',
        blurb: 'Lifecycle, state, parent/child tree',
    },
    {
        src: 'registering-components.md',
        wiki: 'Registering-components.md',
        link: 'Registering-components',
        blurb: 'Loading from backend, fetch, scanDOM',
    },
    {
        src: 'custom-directives.md',
        wiki: 'Custom-directives.md',
        link: 'Custom-directives',
        blurb: 'Register your own template directives',
    },
    {
        src: 'build.md',
        wiki: 'Build.md',
        link: 'Build',
        blurb: 'Building the package (contributors)',
    },
    {
        src: 'debug-readme.md',
        wiki: 'Debug-bar.md',
        link: 'Debug-bar',
        blurb: 'Development debug bar',
    },
]

const wikiDir = process.argv[2]

if (!wikiDir) {
    console.error('Usage: node scripts/sync-wiki.mjs <path-to-wiki-clone>')
    process.exit(1)
}

const wikiRoot = path.resolve(wikiDir)
if (!fs.existsSync(wikiRoot)) {
    console.error(`Wiki directory not found: ${wikiRoot}`)
    process.exit(1)
}

for (const page of PAGES) {
    const srcPath = path.join(docsDir, page.src)
    if (!fs.existsSync(srcPath)) {
        console.error(`Missing doc: ${srcPath}`)
        process.exit(1)
    }
    const body = fs.readFileSync(srcPath, 'utf8')
    fs.writeFileSync(path.join(wikiRoot, page.wiki), body)
    console.log(`${page.src} → ${page.wiki}`)
}

const homeLines = [
    '# Jslade',
    '',
    'Client-side component engine with Blade-like templates, reactive `state`, and scoped CSS.',
    '',
    'These wiki pages are **synced automatically** from [`docs/`](https://github.com/dottwatson/jslade/tree/main/docs) in the main repository — edit there, not here.',
    '',
    '## Guides',
    '',
]

for (const page of PAGES) {
    homeLines.push(`- [[${page.link}]] — ${page.blurb}`)
}

homeLines.push(
    '',
    '## Links',
    '',
    '- [Repository](https://github.com/dottwatson/jslade)',
    '- [npm package](https://www.npmjs.com/package/jslade)',
    ''
)

fs.writeFileSync(path.join(wikiRoot, 'Home.md'), homeLines.join('\n'))
console.log('Home.md written')
